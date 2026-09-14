import {spawn} from 'node:child_process'
import path from 'node:path'

import type {AgentAdapter} from '../agents/adapter.js'
import type {AgentRunRequest} from '../agents/adapter.js'
import {approvalFingerprint} from './fingerprint.js'
import {EvoError} from './errors.js'
import {
  DEFAULT_STOP_CONDITIONS,
  type AgentAdapterConfig,
  type AgentRunResult,
  type Config,
  type Goal,
  type GoalAttempt,
  type GoalSlice,
  type State,
  type VerificationCommand,
  type VerificationRun,
} from './schemas.js'

const MAX_VERIFICATION_CAPTURE = 2_000_000
const TERMINATION_GRACE_MS = 500

export interface GoalPersistence {
  saveGoal(goal: Goal): Promise<void>
  saveState(state: State): Promise<void>
}

export interface GoalExecutionOptions {
  readonly adapter: AgentAdapter
  readonly adapterConfig: AgentAdapterConfig
  readonly config: Config
  readonly contextFingerprint: string
  readonly state: State
  readonly persistence: GoalPersistence
  /** Prepares a fresh context and deterministic preflight for each Slice attempt. */
  readonly beforeSlice?: (goal: Goal, slice: GoalSlice, attempt: number) => Promise<GoalSlicePreparation>
  /** Runs independent post-execution gates after focused verification. */
  readonly afterSlice?: (goal: Goal, slice: GoalSlice, attempt: GoalAttempt, agent: AgentRunResult, verification: readonly VerificationRun[]) => Promise<GoalSlicePostflight>
}

export interface GoalSlicePreparation {
  readonly status: 'READY' | 'BLOCKED'
  readonly summary?: string
  readonly stopCondition?: Goal['stopConditions'][number]
  readonly invocationId?: string
  readonly workingContext?: AgentRunRequest['workingContext']
  readonly constraints?: AgentRunRequest['constraints']
  readonly preflight?: AgentRunRequest['preflight']
  readonly workingContextFingerprint?: string | null
  readonly constraintsFingerprint?: string | null
}

export interface GoalSlicePostflight {
  readonly status: 'PASS' | 'RETRY' | 'BLOCKED'
  readonly summary?: string
  readonly stopCondition?: Goal['stopConditions'][number]
  readonly postflight?: AgentRunRequest['preflight']
}

/** Validates and records explicit human approval for immutable Goal intent. */
export function approveGoal(goal: Goal, adapterConfig: AgentAdapterConfig, contextFingerprint: string, now = new Date()): Goal {
  validateGoalIntent(goal)
  const approved: Goal = structuredClone(goal)
  approved.status = 'APPROVED'
  approved.updatedAt = now.toISOString()
  approved.approval = {
    approvedAt: now.toISOString(),
    approvedBy: 'human',
    fingerprint: approvalFingerprint(approved, adapterConfig),
    contextFingerprint,
  }
  return approved
}

/** Ensures a Goal is explicit, verifiable, acyclic, and free of scaffold placeholders. */
export function validateGoalIntent(goal: Goal): void {
  for (const mandatory of DEFAULT_STOP_CONDITIONS) {
    if (!goal.stopConditions.includes(mandatory)) throw new EvoError(`Goal is missing mandatory stop condition ${mandatory}.`)
  }
  const ids = new Set<string>()
  for (const slice of goal.slices) {
    if (ids.has(slice.id)) throw new EvoError(`Duplicate Slice id: ${slice.id}`)
    ids.add(slice.id)
    if (slice.acceptance.length === 0) throw new EvoError(`Slice ${slice.id} has no acceptance criteria.`)
    if (slice.verify.length === 0) throw new EvoError(`Slice ${slice.id} has no approved verification command.`)
    const prose = [slice.objective, ...slice.acceptance].join('\n')
    if (/\b(?:TODO|TBD|NEEDS_INFO)\b/iu.test(prose)) throw new EvoError(`Slice ${slice.id} still contains unresolved placeholders.`)
  }
  for (const slice of goal.slices) {
    for (const dependency of slice.dependsOn) {
      if (!ids.has(dependency)) throw new EvoError(`Slice ${slice.id} depends on unknown Slice ${dependency}.`)
      if (dependency === slice.id) throw new EvoError(`Slice ${slice.id} cannot depend on itself.`)
    }
  }
  detectCycle(goal.slices)
}

/** Runs eligible Slices sequentially and stops at review readiness or a persisted blocker. */
export async function executeGoal(goal: Goal, options: GoalExecutionOptions): Promise<Goal> {
  const current: Goal = structuredClone(goal)
  requireApprovedGoal(current, options.adapterConfig, options.contextFingerprint)
  current.status = 'RUNNING'
  const state: State = {...options.state, activeGoal: current.id, phase: 'IMPLEMENT', status: 'APPROVED'}
  await persistCheckpoint(current, state, null, options.persistence)

  while (true) {
    const eligible = current.slices.find((slice) => slice.status === 'PENDING' && dependenciesPassed(slice, current.slices))
    if (!eligible) break
    await executeSlice(current, eligible, state, options)
  }

  if (current.slices.every((slice) => slice.status === 'PASS')) {
    current.status = 'READY_FOR_REVIEW'
    state.phase = 'VERIFY'
    state.status = 'AWAITING_APPROVAL'
  } else {
    current.status = 'BLOCKED'
    state.phase = 'IMPLEMENT'
    state.status = 'BLOCKED'
  }
  const blocked = current.slices.find((slice) => slice.status === 'BLOCKED')?.id ?? null
  await persistCheckpoint(current, state, blocked, options.persistence)
  return current
}

function requireApprovedGoal(goal: Goal, adapterConfig: AgentAdapterConfig, contextFingerprint: string): void {
  if (goal.status !== 'APPROVED') throw new EvoError(`Goal ${goal.id} must be APPROVED before execution.`)
  if (!goal.approval) throw new EvoError(`Goal ${goal.id} has no approval record.`)
  const expected = approvalFingerprint(goal, adapterConfig)
  if (goal.approval.fingerprint !== expected) throw new EvoError(`Goal ${goal.id} changed after approval and must be approved again.`)
  if (goal.approval.contextFingerprint !== contextFingerprint) {
    throw new EvoError(`Active Change ${goal.changeId} changed after Goal approval and must be approved again.`)
  }
}

async function executeSlice(goal: Goal, slice: GoalSlice, state: State, options: GoalExecutionOptions): Promise<void> {
  const attemptsInEpoch = (): number => slice.attempts.filter((attempt) => attempt.epoch === goal.runEpoch).length
  while (attemptsInEpoch() < goal.maxAttempts) {
    if (goal.failureBudget !== undefined && goal.failuresUsed >= goal.failureBudget) {
      slice.status = 'BLOCKED'
      slice.stopCondition = 'FAILURE_BUDGET_EXHAUSTED'
      slice.blockReason = `Goal failure budget ${goal.failureBudget} has been exhausted.`
      await persistCheckpoint(goal, state, slice.id, options.persistence)
      return
    }
    slice.status = 'RUNNING'
    slice.blockReason = null
    slice.stopCondition = null
    await persistCheckpoint(goal, state, slice.id, options.persistence)
    const startedAt = new Date().toISOString()
    let preparation: GoalSlicePreparation = {status: 'READY'}
    try {
      if (options.beforeSlice) preparation = await options.beforeSlice(goal, slice, attemptsInEpoch() + 1)
    } catch (error) {
      preparation = {
        status: 'BLOCKED',
        summary: error instanceof Error ? error.message : String(error),
        stopCondition: 'TRANSIENT_FAILURE',
      }
    }
    let agent: AgentRunResult
    if (preparation.status === 'BLOCKED') {
      agent = {
        status: 'BLOCKED',
        summary: preparation.summary ?? 'Slice preflight was blocked.',
        changedFiles: [],
        evidence: [],
        stopCondition: preparation.stopCondition ?? 'HARD_GATE_FAILURE',
      }
    } else {
      try {
        agent = await options.adapter.run({
          repository: goal.repository,
          goal,
          slice,
          attempt: attemptsInEpoch() + 1,
          ...(preparation.workingContext === undefined ? {} : {workingContext: preparation.workingContext}),
          ...(preparation.constraints === undefined ? {} : {constraints: preparation.constraints}),
          ...(preparation.preflight === undefined ? {} : {preflight: preparation.preflight}),
          ...(preparation.invocationId === undefined ? {} : {invocationId: preparation.invocationId}),
        })
      } catch (error) {
        agent = {
          status: 'BLOCKED',
          summary: error instanceof Error ? error.message : String(error),
          changedFiles: [],
          evidence: [],
          stopCondition: 'TRANSIENT_FAILURE',
        }
      }
    }

    const verification = agent.status === 'COMPLETED'
      ? await runVerificationCommands(goal.repository, slice.verify)
      : []
    const attempt: GoalAttempt = {
      number: slice.attempts.length + 1,
      epoch: goal.runEpoch,
      startedAt,
      endedAt: new Date().toISOString(),
      agent,
      verification,
      ...(preparation.invocationId === undefined ? {} : {invocationId: preparation.invocationId}),
      ...(preparation.workingContextFingerprint === undefined ? {} : {workingContextFingerprint: preparation.workingContextFingerprint}),
      ...(preparation.constraintsFingerprint === undefined ? {} : {constraintsFingerprint: preparation.constraintsFingerprint}),
      ...(preparation.preflight === undefined ? {} : {preflight: [...preparation.preflight]}),
    }
    let postflight: GoalSlicePostflight
    try {
      postflight = options.afterSlice ? await options.afterSlice(goal, slice, attempt, agent, verification) : {status: 'PASS' as const}
    } catch (error) {
      postflight = {
        status: 'BLOCKED',
        summary: `Postflight evaluation failed: ${error instanceof Error ? error.message : String(error)}`,
        stopCondition: 'HARD_GATE_FAILURE',
      }
    }
    if (postflight.postflight) attempt.postflight = [...postflight.postflight]
    slice.attempts.push(attempt)
    if (agent.status !== 'COMPLETED' || verification.some((run) => run.status !== 'PASS') || postflight.status !== 'PASS') goal.failuresUsed += 1

    if (agent.status === 'BLOCKED' && agent.stopCondition !== 'TRANSIENT_FAILURE') {
      slice.status = 'BLOCKED'
      slice.blockReason = agent.summary
      slice.stopCondition = agent.stopCondition
      await persistCheckpoint(goal, state, slice.id, options.persistence)
      return
    }
    if (postflight.status === 'BLOCKED') {
      slice.status = 'BLOCKED'
      slice.blockReason = postflight.summary ?? 'Post-execution gate blocked the Slice.'
      slice.stopCondition = postflight.stopCondition ?? 'HARD_GATE_FAILURE'
      await persistCheckpoint(goal, state, slice.id, options.persistence)
      return
    }
    if (agent.status === 'COMPLETED' && verification.length > 0 && verification.every((run) => run.status === 'PASS')) {
      if (postflight.status === 'RETRY') {
        slice.status = 'PENDING'
        await persistCheckpoint(goal, state, null, options.persistence)
        continue
      }
      slice.status = 'PASS'
      await persistCheckpoint(goal, state, null, options.persistence)
      return
    }
    if (attemptsInEpoch() >= goal.maxAttempts) {
      slice.status = 'BLOCKED'
      slice.stopCondition = 'REPEATED_FAILURE'
      slice.blockReason = summarizeFailure(agent, verification)
      await persistCheckpoint(goal, state, slice.id, options.persistence)
      return
    }
    slice.status = 'PENDING'
    await persistCheckpoint(goal, state, null, options.persistence)
  }
}

async function persistCheckpoint(goal: Goal, state: State, currentSlice: string | null, persistence: GoalPersistence): Promise<void> {
  const timestamp = new Date().toISOString()
  goal.updatedAt = timestamp
  state.updatedAt = timestamp
  state.currentSlice = currentSlice
  state.slices = goal.slices.map((slice) => ({id: slice.id, status: slice.status, blockReason: slice.blockReason}))
  await persistence.saveGoal(goal)
  await persistence.saveState(state)
}

async function runVerificationCommands(repository: string, commands: readonly VerificationCommand[]): Promise<VerificationRun[]> {
  const results: VerificationRun[] = []
  for (const command of commands) results.push(await runVerification(repository, command))
  return results
}

async function runVerification(repository: string, verification: VerificationCommand): Promise<VerificationRun> {
  const startedAt = new Date().toISOString()
  const result = await spawnWithTimeout(verification.command, verification.args, repository, verification.timeoutMs)
  return {
    label: verification.label,
    command: verification.command,
    args: verification.args,
    status: result.exitCode === 0 ? 'PASS' : 'FAIL',
    exitCode: result.exitCode,
    output: redactAndBound(result.output),
    startedAt,
    endedAt: new Date().toISOString(),
  }
}

async function spawnWithTimeout(command: string, args: readonly string[], cwd: string, timeoutMs: number): Promise<{exitCode: number | null; output: string}> {
  return new Promise((resolve) => {
    const child = spawn(command, [...args], {cwd: path.resolve(cwd), env: process.env, shell: false, stdio: ['ignore', 'pipe', 'pipe']})
    let output = ''
    let timedOut = false
    let settled = false
    let hardKill: NodeJS.Timeout | null = null
    const append = (chunk: Buffer | string): void => {
      const combined = output + String(chunk)
      output = combined.length <= MAX_VERIFICATION_CAPTURE
        ? combined
        : combined.slice(combined.length - MAX_VERIFICATION_CAPTURE)
    }
    const finish = (exitCode: number | null, message?: string): void => {
      if (settled) return
      settled = true
      clearTimeout(timeout)
      if (hardKill) clearTimeout(hardKill)
      const suffix = message ? `${output.length > 0 ? '\n' : ''}${message}` : ''
      resolve({exitCode, output: `${output}${suffix}`})
    }
    child.stdout.on('data', append)
    child.stderr.on('data', append)
    const timeout = setTimeout(() => {
      timedOut = true
      child.kill('SIGTERM')
      hardKill = setTimeout(() => child.kill('SIGKILL'), TERMINATION_GRACE_MS)
    }, timeoutMs)
    child.once('error', (error) => {
      finish(null, error.message)
    })
    child.once('close', (exitCode) => {
      finish(exitCode, timedOut ? `Verification timed out after ${timeoutMs} ms.` : undefined)
    })
  })
}

function dependenciesPassed(slice: GoalSlice, slices: readonly GoalSlice[]): boolean {
  return slice.dependsOn.every((dependency) => slices.find((candidate) => candidate.id === dependency)?.status === 'PASS')
}

function detectCycle(slices: readonly GoalSlice[]): void {
  const byId = new Map(slices.map((slice) => [slice.id, slice]))
  const visiting = new Set<string>()
  const visited = new Set<string>()
  const visit = (id: string): void => {
    if (visiting.has(id)) throw new EvoError(`Goal Slice dependencies contain a cycle at ${id}.`)
    if (visited.has(id)) return
    visiting.add(id)
    for (const dependency of byId.get(id)?.dependsOn ?? []) visit(dependency)
    visiting.delete(id)
    visited.add(id)
  }
  for (const slice of slices) visit(slice.id)
}

function summarizeFailure(agent: AgentRunResult, verification: readonly VerificationRun[]): string {
  if (agent.status === 'BLOCKED') return agent.summary
  const failed = verification.filter((run) => run.status !== 'PASS').map((run) => run.label)
  return failed.length > 0 ? `Verification failed repeatedly: ${failed.join(', ')}` : 'Slice failed without passing verification.'
}

function redactAndBound(value: string): string {
  const redacted = value
    .replace(/((?:api[_-]?key|token|secret|password)\s*[=:]\s*)[^\s]+/giu, '$1[REDACTED]')
    .trim()
  const maximum = 8000
  return redacted.length <= maximum ? redacted : `${redacted.slice(-maximum)}\n[output truncated]`
}
