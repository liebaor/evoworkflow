import {mkdir, readFile, rename} from 'node:fs/promises'
import path from 'node:path'

import {parse} from 'yaml'

import {approveGoal} from '../core/goal.js'
import {changeContextFingerprint} from '../core/fingerprint.js'
import {EvoError} from '../core/errors.js'
import {
  DEFAULT_STOP_CONDITIONS,
  GoalDefinitionSchema,
  GoalSchema,
  type Goal,
  type GoalDefinition,
  type State,
} from '../core/schemas.js'
import {pathExists, writeYaml} from './io.js'
import {artifactPath, requireApprovedChangeContext} from './artifacts.js'
import {activeGoalPath, openManagedRepository, readActiveGoal} from './managed.js'
import {repositoryPaths} from './paths.js'
import {extractPlanSliceIds} from './plan-slices.js'

/** Reads and validates a Goal definition used by `evo goal create --from`. */
export async function readGoalDefinition(target: string): Promise<GoalDefinition> {
  const source = await readFile(path.resolve(target), 'utf8')
  return GoalDefinitionSchema.parse(parse(source))
}

/** Creates a DRAFT Goal and records it as active without approving execution. */
export async function createGoal(root: string, id: string, definition: GoalDefinition, now = new Date()): Promise<Goal> {
  if (!/^[a-z0-9][a-z0-9-]*$/u.test(id)) throw new EvoError('Goal id must use lowercase letters, digits, and hyphens.')
  const managed = await openManagedRepository(root)
  const paths = repositoryPaths(root)
  const target = activeGoalPath(root, id)
  if (await pathExists(target)) throw new EvoError(`Goal already exists: ${id}`)
  if (managed.state.activeGoal) throw new EvoError(`Another Goal is active: ${managed.state.activeGoal}`)
  if (managed.state.activeChange !== definition.changeId) {
    throw new EvoError(`Goal Change ${definition.changeId} is not the active Change ${managed.state.activeChange ?? 'none'}.`)
  }
  await changeContextFingerprint(root, definition.changeId)
  const repository = path.resolve(definition.repository ?? paths.root)
  if (repository !== paths.root) throw new EvoError('v0.1 Goals must execute in the managed repository that owns them.')
  const adapter = definition.adapter ?? managed.config.goal.defaultAdapter
  if (!managed.config.agents.adapters[adapter]) throw new EvoError(`Unknown Agent Adapter: ${adapter}`)
  const timestamp = now.toISOString()
  const goal = GoalSchema.parse({
    schemaVersion: 1,
    id,
    title: definition.title,
    changeId: definition.changeId,
    repository,
    adapter,
    maxAttempts: definition.maxAttempts ?? managed.config.goal.maxAttempts,
    failureBudget: definition.failureBudget ?? (definition.maxAttempts ?? managed.config.goal.maxAttempts) * definition.slices.length,
    failuresUsed: 0,
    status: 'DRAFT',
    stopConditions: definition.stopConditions ?? DEFAULT_STOP_CONDITIONS,
    slices: definition.slices.map((slice) => ({
      ...slice,
      status: 'PENDING',
      attempts: [],
      blockReason: null,
      stopCondition: null,
    })),
    approval: null,
    runEpoch: 0,
    resumes: [],
    createdAt: timestamp,
    updatedAt: timestamp,
  })
  await writeYaml(target, goal)
  await writeYaml(paths.state, {...managed.state, activeGoal: id, updatedAt: timestamp})
  return goal
}

/** Approves a complete Goal after binding it to current Change and adapter content. */
export async function approveActiveGoal(root: string, id: string, now = new Date()): Promise<Goal> {
  const managed = await openManagedRepository(root)
  const goal = await readActiveGoal(root, id)
  if (goal.status !== 'DRAFT') throw new EvoError(`Only a DRAFT Goal can be approved; ${id} is ${goal.status}.`)
  const adapter = managed.config.agents.adapters[goal.adapter]
  if (!adapter) throw new EvoError(`Unknown Agent Adapter: ${goal.adapter}`)
  await rejectUnresolvedChangeMarkers(root, goal.changeId)
  await requireApprovedChangeContext(root, goal.changeId)
  await validateGoalSlicesAgainstPlan(root, goal.changeId, goal.slices.map((slice) => slice.id))
  const contextFingerprint = await changeContextFingerprint(root, goal.changeId)
  const approved = approveGoal(goal, adapter, contextFingerprint, now)
  await writeYaml(activeGoalPath(root, id), approved)
  await writeYaml(repositoryPaths(root).state, {
    ...managed.state,
    phase: 'IMPLEMENT',
    status: 'APPROVED',
    activeGoal: id,
    currentSlice: null,
    slices: approved.slices.map((slice) => ({id: slice.id, status: slice.status, blockReason: slice.blockReason})),
    updatedAt: now.toISOString(),
  } satisfies State)
  return approved
}

/** Rejects Goal Slices that are not named by the approved active Plan. */
export async function validateGoalSlicesAgainstPlan(root: string, changeId: string, sliceIds: readonly string[]): Promise<void> {
  const target = artifactPath(root, changeId, 'plan')
  const source = await readFile(target, 'utf8')
  const planIds = extractPlanSliceIds(source)
  if (planIds.length === 0) throw new EvoError(`Approved Plan for Change ${changeId} has no machine-identifiable Slice headings.`)
  if (new Set(planIds).size !== planIds.length) throw new EvoError(`Approved Plan for Change ${changeId} contains duplicate Slice headings.`)
  const planned = new Set(planIds)
  const outside = sliceIds.filter((id) => !planned.has(id))
  if (outside.length > 0) throw new EvoError(`Goal contains Slice ids outside the approved Plan: ${outside.join(', ')}.`)
}

/** Records an explicit human resume and opens a new bounded attempt epoch. */
export async function resumeGoal(root: string, id: string, reason: string, now = new Date()): Promise<Goal> {
  if (reason.trim().length < 3) throw new EvoError('Resume requires a concrete human reason.')
  const managed = await openManagedRepository(root)
  const goal = await readActiveGoal(root, id)
  if (goal.status !== 'BLOCKED' && goal.status !== 'RUNNING') {
    throw new EvoError(`Only a BLOCKED or interrupted RUNNING Goal can resume; ${id} is ${goal.status}.`)
  }
  const adapter = managed.config.agents.adapters[goal.adapter]
  if (!adapter || !goal.approval) throw new EvoError('Goal approval or adapter configuration is missing.')
  const contextFingerprint = await changeContextFingerprint(root, goal.changeId)
  const currentIntent = approveGoal(goal, adapter, contextFingerprint, now).approval
  if (
    currentIntent?.fingerprint !== goal.approval.fingerprint ||
    currentIntent.contextFingerprint !== goal.approval.contextFingerprint
  ) {
    throw new EvoError('Goal or active Change changed after approval; return it to DRAFT and approve again.')
  }
  const resumed: Goal = structuredClone(goal)
  resumed.runEpoch += 1
  resumed.status = 'APPROVED'
  resumed.updatedAt = now.toISOString()
  resumed.resumes.push({at: now.toISOString(), reason: reason.trim()})
  for (const slice of resumed.slices) {
    if (slice.status === 'BLOCKED' || slice.status === 'RUNNING') {
      slice.status = 'PENDING'
      slice.blockReason = null
      slice.stopCondition = null
    }
  }
  await writeYaml(activeGoalPath(root, id), resumed)
  await writeYaml(repositoryPaths(root).state, {
    ...managed.state,
    phase: 'IMPLEMENT',
    status: 'APPROVED',
    activeGoal: id,
    currentSlice: null,
    slices: resumed.slices.map((slice) => ({id: slice.id, status: slice.status, blockReason: slice.blockReason})),
    updatedAt: now.toISOString(),
  } satisfies State)
  return resumed
}

/** Cancels a Goal, preserving its evidence under completed Goals. */
export async function cancelGoal(root: string, id: string, reason: string, now = new Date()): Promise<Goal> {
  if (reason.trim().length < 3) throw new EvoError('Cancellation requires a concrete reason.')
  const managed = await openManagedRepository(root)
  const paths = repositoryPaths(root)
  const goal = await readActiveGoal(root, id)
  if (goal.status === 'RUNNING') throw new EvoError('A RUNNING Goal must reach a checkpoint before cancellation.')
  const cancelled: Goal = {
    ...goal,
    status: 'CANCELLED',
    updatedAt: now.toISOString(),
    resumes: [...goal.resumes, {at: now.toISOString(), reason: `Cancelled: ${reason.trim()}`}],
  }
  await writeYaml(activeGoalPath(root, id), cancelled)
  const completed = path.join(paths.completedGoals, `${id}.yml`)
  await mkdir(paths.completedGoals, {recursive: true})
  await rename(activeGoalPath(root, id), completed)
  await writeYaml(paths.state, {
    ...managed.state,
    activeGoal: null,
    currentSlice: null,
    slices: cancelled.slices.map((slice) => ({id: slice.id, status: slice.status, blockReason: slice.blockReason})),
    status: managed.state.activeChange ? 'BLOCKED' : 'COMPLETED',
    updatedAt: now.toISOString(),
  } satisfies State)
  return cancelled
}

/** Formats persisted Goal state and Slice checkpoints. */
export function formatGoal(goal: Goal): string {
  return [
    `Goal: ${goal.id} — ${goal.title} / Goal：${goal.id} — ${goal.title}`,
    `Status: ${goal.status} / 状态：${goal.status}`,
    `Change: ${goal.changeId} / Change：${goal.changeId}`,
    `Adapter: ${goal.adapter} / Adapter：${goal.adapter}`,
    `Approval: ${goal.approval ? `human at ${goal.approval.approvedAt}` : 'none'} / 批准：${goal.approval ? `人工于 ${goal.approval.approvedAt}` : '无'}`,
    `Attempt epoch: ${goal.runEpoch} / 尝试 epoch：${goal.runEpoch}`,
    `Failure budget: ${goal.failuresUsed}/${goal.failureBudget ?? 'unbounded'} / 失败预算：${goal.failuresUsed}/${goal.failureBudget ?? '无限'}`,
    '',
    'Slices / Slice 列表:',
    ...goal.slices.map((slice) => {
      const latest = slice.attempts.at(-1)
      const detail = slice.blockReason ?? latest?.agent.summary
      return `- ${slice.id}: ${slice.status} — ${slice.objective}${detail ? ` (${detail})` : ''}`
    }),
    '',
    goal.status === 'READY_FOR_REVIEW'
      ? 'Next: run EVO Verify and Review. This Goal did not finish the Change. / 下一步：运行 EVO Verify 和 Review。此 Goal 没有完成 Change。'
      : goal.status === 'BLOCKED'
        ? 'Next: inspect the blocker, resolve the human Decision, then explicitly resume. / 下一步：检查阻塞，解决人工 Decision，然后明确恢复。'
        : 'Next: inspect and explicitly choose the next Goal action. / 下一步：检查状态并明确选择 Goal 动作。',
  ].join('\n')
}

async function rejectUnresolvedChangeMarkers(root: string, changeId: string): Promise<void> {
  const changeRoot = path.join(repositoryPaths(root).activeWork, changeId)
  for (const filename of ['change.md', 'plan.md', 'spec.md']) {
    const target = path.join(changeRoot, filename)
    if (!(await pathExists(target))) continue
    const source = await readFile(target, 'utf8')
    if (/\b(?:TODO|TBD|NEEDS_INFO)\b/iu.test(source)) {
      throw new EvoError(`Active Change ${changeId}/${filename} contains unresolved placeholders.`)
    }
  }
}
