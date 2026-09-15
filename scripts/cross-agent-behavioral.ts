import {execFile as execFileCallback} from 'node:child_process'
import {mkdir, mkdtemp, readFile, rm, writeFile} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {promisify} from 'node:util'

import {
  CrossAgentContinuityTraceSchema,
  GoalSchema,
  GoalSliceSchema,
  StateSchema,
  type AgentAdapterConfig,
  type CrossAgentContinuityTrace,
  type CrossAgentOutcome,
  type CrossAgentSession,
  type Goal,
  type GoalSlice,
} from '../src/core/schemas.js'
import {ProcessAgentAdapter} from '../src/agents/process-adapter.js'
import {approveArtifact} from '../src/repository/artifacts.js'
import {buildRecoveryReport} from '../src/repository/recovery.js'
import {sha256} from '../src/repository/git-snapshot.js'
import {pathExists, readYaml, writeYaml} from '../src/repository/io.js'
import {applyInitialization, planInitialization} from '../src/repository/init.js'
import {repositoryPaths} from '../src/repository/paths.js'

const execFile = promisify(execFileCallback)
const packageRoot = path.resolve('.')
const outputPath = resolveOption('--output', path.join(packageRoot, 'references', 'experiments', 'cross-agent', 'cross-agent-continuity.json'))
const summaryPath = resolveOption('--summary', path.join(packageRoot, 'references', 'experiments', 'cross-agent', 'cross-agent-continuity.md'))
const timeoutMs = boundedTimeout(process.env.EVO_BEHAVIORAL_TIMEOUT_MS)
const strict = process.env.EVO_BEHAVIORAL_REQUIRED === '1'
const root = await mkdtemp(path.join(tmpdir(), 'evoworkflow-cross-agent-field-'))
let baselineRevision = ''
let finalRevision: string | null = null
let sessions: CrossAgentSession[] = []
let changedPaths: string[] = []
let limitations: string[] = []
let recovery: CrossAgentContinuityTrace['recovery'] = {
  status: 'NOT_RUN',
  objective: 'Recovery was not reached.',
  nextAction: 'review the behavioral trace',
  source: 'not-run',
}
let evaluator: CrossAgentContinuityTrace['evaluator'] = {
  status: 'NOT_RUN',
  checks: [{id: 'EVAL-NOT-RUN', category: 'execution', status: 'NOT_RUN', detail: 'Independent evaluator was not reached.'}],
  testCommand: 'node --test',
  testStatus: 'NOT_RUN',
}

try {
  await prepareFixture(root)
  baselineRevision = await gitRevision(root)
  const plans = sessionPlans()
  for (const plan of plans) {
    if (plan.id === 'C') await injectRegression(root)
    const session = await runSession(root, plan)
    sessions.push(session)
    if (session.status !== 'PASS') {
      limitations.push(`${plan.id}/${plan.client}: ${session.error ?? session.summary}`)
      break
    }
    await checkpointSession(root, plan)
    await advanceFixtureState(root, plan.id)
  }
  while (sessions.length < 4) {
    const plan = plans[sessions.length]
    if (!plan) throw new Error('Behavioral session plan is incomplete.')
    sessions.push(notRunSession(plan))
  }
  recovery = await evaluateRecovery(root)
  evaluator = await evaluateProduct(root, baselineRevision)
  changedPaths = await changedPathsSinceBaseline(root, baselineRevision)
  finalRevision = await gitRevision(root)
} catch (error) {
  limitations.push(redact(error instanceof Error ? error.message : String(error)))
  const plans = sessionPlans()
  while (baselineRevision && sessions.length < 4) {
    const plan = plans[sessions.length]
    if (!plan) break
    sessions.push(notRunSession(plan))
  }
} finally {
  await rm(root, {recursive: true, force: true})
}

if (!baselineRevision) throw new Error(`Behavioral fixture did not produce a baseline Git revision: ${limitations.join(' | ') || 'unknown preparation failure'}`)
const status = deriveTraceStatus(sessions, evaluator, recovery)
const traceWithoutHash = {
  schemaVersion: 1 as const,
  generatedAt: new Date().toISOString(),
  repository: 'isolated temporary Brownfield fixture (removed after evaluation)',
  status,
  baselineRevision,
  finalRevision,
  harnessSequence: ['codex', 'claude-code', 'opencode', 'fresh-agent'] as const,
  invocationBoundary: 'Each session is a new non-interactive process in the same isolated checkout; no prior chat or session id is supplied.',
  sessions,
  changedPaths,
  recovery,
  evaluator,
  limitations: [...new Set(limitations)],
  artifactSha256: '',
}
const artifactSha256 = sha256(JSON.stringify(traceWithoutHash, null, 2) + '\n')
const trace = CrossAgentContinuityTraceSchema.parse({...traceWithoutHash, artifactSha256})
await mkdir(path.dirname(outputPath), {recursive: true})
await writeFile(outputPath, `${JSON.stringify(trace, null, 2)}\n`, 'utf8')
await mkdir(path.dirname(summaryPath), {recursive: true})
await writeFile(summaryPath, formatSummary(trace), 'utf8')

process.stdout.write(`Cross-agent behavioral evaluation: ${trace.status}.\n`)
process.stdout.write(`Trace: ${path.relative(packageRoot, outputPath)} (sha256 ${trace.artifactSha256})\n`)
if (trace.status !== 'BEHAVIORAL_PASS') {
  process.stdout.write(`Limitations: ${trace.limitations.join(' | ') || 'no additional detail'}\n`)
  if (strict) process.exitCode = 1
}

async function prepareFixture(target: string): Promise<void> {
  await applyInitialization(await planInitialization(target))
  await writeFiles(target, {
    'package.json': JSON.stringify({name: 'evo-cross-agent-brownfield', version: '1.0.0', type: 'module', scripts: {test: 'node --test'}}, null, 2) + '\n',
    'AGENTS.md': [
      '# Brownfield continuity fixture',
      '',
      'This file is the only standing-rule authority for this fixture.',
      '',
      '- Read the repository and .evo state before each fresh session.',
      '- Work only in src/ and test/ for product changes.',
      '- Preserve the existing room/tenant domain vocabulary and ES module style.',
      '- Use node:test; do not add dependencies.',
      '- Do not edit AGENTS.md, .evo/, package.json, or the machine-level canonical Skill runtime.',
      '- Do not commit, merge, deploy, or claim acceptance. The harness records Git checkpoints.',
      '',
    ].join('\n'),
    'src/room-policy.js': [
      '/** Returns whether a requested record belongs to the current tenant. */',
      'export function isSameTenant(owningTenantId, requestedTenantId) {',
      '  return owningTenantId === requestedTenantId',
      '}',
      '',
    ].join('\n'),
    'src/booking-service.js': [
      "import {isSameTenant} from './room-policy.js'",
      '',
      '/** Returns existing bookings visible to the current tenant. */',
      'export function listBookingsForTenant(bookings, tenantId) {',
      '  return bookings.filter((booking) => isSameTenant(booking.tenantId, tenantId))',
      '}',
      '',
    ].join('\n'),
    'test/room-policy.test.js': [
      "import test from 'node:test'",
      "import assert from 'node:assert/strict'",
      "import {isSameTenant} from '../src/room-policy.js'",
      '',
      "test('tenant policy accepts the same tenant and rejects another tenant', () => {",
      "  assert.equal(isSameTenant('tenant-a', 'tenant-a'), true)",
      "  assert.equal(isSameTenant('tenant-a', 'tenant-b'), false)",
      '})',
      '',
    ].join('\n'),
    'test/booking-service.test.js': [
      "import test from 'node:test'",
      "import assert from 'node:assert/strict'",
      "import {listBookingsForTenant} from '../src/booking-service.js'",
      '',
      "test('booking listing stays inside the current tenant', () => {",
      "  const bookings = [{id: 'a', tenantId: 'tenant-a'}, {id: 'b', tenantId: 'tenant-b'}]",
      "  assert.deepEqual(listBookingsForTenant(bookings, 'tenant-a'), [bookings[0]])",
      '})',
      '',
    ].join('\n'),
    '.evo/work/active/cross-agent-continuity/change.md': changeDocument(),
    '.evo/work/active/cross-agent-continuity/plan.md': planDocument(),
    '.evo/work/active/cross-agent-continuity/evidence.md': '# Field evaluation evidence\n',
  })
  const changeRoot = path.join(repositoryPaths(target).activeWork, 'cross-agent-continuity')
  const now = new Date('2026-01-01T00:00:00.000Z')
  const initialState = await readYaml(repositoryPaths(target).state, StateSchema)
  await writeYaml(repositoryPaths(target).state, {
    ...initialState,
    activeChange: 'cross-agent-continuity',
    activeGoal: null,
    phase: 'PLAN',
    status: 'AWAITING_APPROVAL',
    currentSlice: null,
    slices: [],
    updatedAt: now.toISOString(),
  })
  await approveArtifact(target, 'cross-agent-continuity', 'change', 'isolated field evaluator; not product acceptance', now)
  await approveArtifact(target, 'cross-agent-continuity', 'plan', 'isolated field evaluator; not product acceptance', now)
  const state = await readYaml(repositoryPaths(target).state, StateSchema)
  await writeYaml(repositoryPaths(target).state, {
    ...state,
    activeChange: 'cross-agent-continuity',
    activeGoal: null,
    phase: 'IMPLEMENT',
    status: 'APPROVED',
    currentSlice: 'S1',
    slices: ['S1', 'S2', 'S3', 'S4'].map((id, index) => ({id, status: index === 0 ? 'RUNNING' : 'PENDING', blockReason: null})),
    updatedAt: now.toISOString(),
  })
  if (!(await pathExists(changeRoot))) throw new Error('Behavioral fixture active Change was not created.')
  await execGit(target, ['init', '-q'])
  await execGit(target, ['config', 'user.email', 'evo-field-evaluator@test.invalid'])
  await execGit(target, ['config', 'user.name', 'EVO Field Evaluator'])
  await execGit(target, ['add', '.'])
  await execGit(target, ['commit', '-qm', 'fixture: establish fixed brownfield revision'])
}

function changeDocument(): string {
  return [
    '---',
    'id: cross-agent-continuity',
    'weight: STANDARD',
    'status: AWAITING_APPROVAL',
    'approval: null',
    '---',
    '',
    '# Cross-agent booking continuity',
    '',
    'Keep the existing tenant-aware room booking language while adding small product behavior through fresh Agent sessions.',
    '',
    '- AC-01: Feature A can reserve a room.',
    '- AC-02: a requirement delta and bug regression preserve the contract.',
    '- AC-03: a fresh Agent can add a related Feature B.',
    '',
  ].join('\n')
}

function planDocument(): string {
  return [
    '---',
    'change: cross-agent-continuity',
    'status: AWAITING_APPROVAL',
    'approval: null',
    'currentTruthTargets:',
    '  - path: src/booking-service.js',
    '    action: UPDATE',
    '  - path: src/room-policy.js',
    '    action: UPDATE',
    '  - path: test/booking-service.test.js',
    '    action: UPDATE',
    '  - path: test/room-policy.test.js',
    '    action: UPDATE',
    '---',
    '',
    '# Cross-agent continuity plan',
    '',
    '## Execution Slices',
    '',
    '### S1 — Codex Feature A',
    '',
    'Implement reserveRoom.',
    '',
    '### S2 — Claude Requirement Delta',
    '',
    'Apply the maximum-duration requirement.',
    '',
    '### S3 — OpenCode Bug Regression',
    '',
    'Reproduce and fix the tenant-scope regression.',
    '',
    '### S4 — Fresh Agent Feature B',
    '',
    'Implement cancelReservation.',
    '',
  ].join('\n')
}

function sessionPlans(): readonly SessionPlan[] {
  return [
    {
      id: 'A', sliceId: 'S1', client: 'codex', taskPackage: 'Feature A: reserveRoom', objective: 'Use fresh recovery input and implement Feature A in the existing booking service.',
      acceptance: [
        'Run the read-only recovery/context commands before editing.',
        'Add named export reserveRoom({roomId, tenantId, start, end}) to src/booking-service.js.',
        'Reject empty roomId/tenantId and end <= start with clear Error messages.',
        'Return the existing domain vocabulary with status "reserved" and add node:test coverage.',
        'Only modify src/booking-service.js and test/booking-service.test.js.',
      ],
    },
    {
      id: 'B', sliceId: 'S2', client: 'claude-code', taskPackage: 'Requirement Delta: eight-hour maximum', objective: 'Recover the current repository state without prior chat and apply the requirement delta to Feature A.',
      acceptance: [
        'Run the read-only recovery command before editing.',
        'Update reserveRoom so end - start cannot exceed 8 hours; preserve existing validation and return shape.',
        'Add a focused node:test for the maximum-duration rejection.',
        'Only modify src/booking-service.js and test/booking-service.test.js.',
      ],
    },
    {
      id: 'C', sliceId: 'S3', client: 'opencode', taskPackage: 'Bug/Regression: tenant scope', objective: 'Recover the requirement-delta state, reproduce the injected tenant-scope bug, fix the root cause, and keep regression coverage.',
      acceptance: [
        'Run the read-only recovery command before editing.',
        'Run node --test to observe the failing tenant-scope regression caused by the injected policy inversion.',
        'Fix src/room-policy.js so same-tenant records are allowed and cross-tenant records are rejected.',
        'Add or preserve a regression test and finish with node --test passing.',
        'Only modify src/room-policy.js and test/room-policy.test.js.',
      ],
    },
    {
      id: 'D', sliceId: 'S4', client: 'fresh-agent', taskPackage: 'Feature B: cancelReservation', objective: 'Recover the complete booking history with no prior chat and implement a related Feature B consistently.',
      acceptance: [
        'Run the read-only recovery command before editing.',
        'Add named export cancelReservation({booking, tenantId}) to src/booking-service.js.',
        'Use the existing tenant policy; reject cross-tenant cancellation and return the existing booking vocabulary with status "cancelled".',
        'Add focused node:test coverage for same-tenant success and cross-tenant rejection.',
        'Only modify src/booking-service.js and test/booking-service.test.js.',
      ],
    },
  ]
}

interface SessionPlan {
  readonly id: 'A' | 'B' | 'C' | 'D'
  readonly sliceId: 'S1' | 'S2' | 'S3' | 'S4'
  readonly client: 'codex' | 'claude-code' | 'opencode' | 'fresh-agent'
  readonly taskPackage: string
  readonly objective: string
  readonly acceptance: readonly string[]
}

async function runSession(target: string, plan: SessionPlan): Promise<CrossAgentSession> {
  const invocation = `fresh-${plan.id.toLowerCase()}-${Date.now()}`
  const adapterClient = plan.client === 'fresh-agent' ? 'codex' : plan.client
  const available = await commandAvailable(clientCommand(adapterClient))
  if (!available) {
    return sessionResult(plan, invocation, 'UNVERIFIED', [], ['client executable not found on PATH'], 'Supported client is not installed.', null)
  }
  const goal = fieldGoal(target, plan)
  const slice = fieldSlice(plan)
  try {
    const result = await new ProcessAgentAdapter(adapterConfig(adapterClient)).run({
      repository: target,
      goal,
      slice,
      attempt: 1,
      invocationId: invocation,
    })
    const paths = await workingChangedPaths(target)
    const verification = await runProductTests(target)
    const status: CrossAgentOutcome = result.status === 'COMPLETED' && verification.status === 'PASS' && paths.length > 0 ? 'PASS' : 'FAIL'
    return sessionResult(plan, invocation, status, paths, [verification.detail], redact(result.summary), status === 'PASS' ? null : `Agent status=${result.status}; ${verification.detail}`)
  } catch (error) {
    return sessionResult(plan, invocation, 'UNVERIFIED', await workingChangedPaths(target), [], 'Client invocation did not produce a usable field result.', redact(error instanceof Error ? error.message : String(error)))
  }
}

function fieldGoal(repository: string, plan: SessionPlan): Goal {
  const now = new Date().toISOString()
  return GoalSchema.parse({
    schemaVersion: 1,
    id: 'cross-agent-field-eval',
    title: 'Cross-agent booking continuity field evaluation',
    changeId: 'cross-agent-continuity',
    repository,
    adapter: plan.client,
    maxAttempts: 1,
    status: 'APPROVED',
    stopConditions: ['REQUIREMENT_AMBIGUITY', 'ARCHITECTURE_DEVIATION', 'BREAKING_API', 'UNEXPECTED_DEPENDENCY', 'SCOPE_EXPANSION', 'REPEATED_FAILURE'],
    slices: [fieldSlice(plan)],
    approval: null,
    runEpoch: 0,
    resumes: [],
    createdAt: now,
    updatedAt: now,
  })
}

function fieldSlice(plan: SessionPlan): GoalSlice {
  return GoalSliceSchema.parse({
    id: plan.sliceId,
    objective: plan.objective,
    acceptance: plan.acceptance,
    dependsOn: [],
    verify: [{label: 'product tests', command: 'node', args: ['--test'], timeoutMs: Math.min(timeoutMs, 300_000)}],
    status: 'PENDING',
    attempts: [],
    blockReason: null,
    stopCondition: null,
  })
}

function adapterConfig(client: Exclude<SessionPlan['client'], 'fresh-agent'>): AgentAdapterConfig {
  if (client === 'codex') return {kind: 'codex', command: 'codex', args: ['exec', '--ephemeral', '--sandbox', 'workspace-write', '--cd', '{repository}', '-'], timeoutMs}
  if (client === 'claude-code') return {kind: 'claude', command: 'claude', args: ['--print', '--no-session-persistence', '--permission-mode', 'acceptEdits', '--output-format', 'json'], timeoutMs}
  return {kind: 'opencode', command: 'opencode', args: ['run', '--pure', '--model', 'opencode/mimo-v2.5-free', '--dir', '{repository}'], timeoutMs}
}

function clientCommand(client: Exclude<SessionPlan['client'], 'fresh-agent'>): string {
  return client === 'codex' ? 'codex' : client === 'claude-code' ? 'claude' : 'opencode'
}

async function injectRegression(target: string): Promise<void> {
  const policy = path.join(target, 'src', 'room-policy.js')
  const source = await readFile(policy, 'utf8')
  const inverted = source.includes('owningTenantId === requestedTenantId')
    ? source.replace('owningTenantId === requestedTenantId', 'owningTenantId !== requestedTenantId')
    : [
      '/** Injected tenant-scope regression for the field evaluation. */',
      'export function isSameTenant(owningTenantId, requestedTenantId) {',
      '  return owningTenantId !== requestedTenantId',
      '}',
      '',
    ].join('\n')
  await writeFile(policy, inverted, 'utf8')
  await execGit(target, ['add', '--', 'src/room-policy.js'])
  await execGit(target, ['commit', '-qm', 'fixture: inject tenant-scope regression'])
  const verification = await runProductTests(target)
  if (verification.status !== 'FAIL') throw new Error('Injected tenant-scope regression did not produce a failing test.')
}

async function checkpointSession(target: string, plan: SessionPlan): Promise<void> {
  await execGit(target, ['add', '--', 'src', 'test'])
  await execGit(target, ['commit', '-qm', `checkpoint: Session ${plan.id} ${plan.taskPackage}`])
}

async function advanceFixtureState(target: string, completed: SessionPlan['id']): Promise<void> {
  const paths = repositoryPaths(target)
  const state = await readYaml(paths.state, StateSchema)
  const next = {A: 'S2', B: 'S3', C: 'S4', D: null}[completed]
  const order = ['S1', 'S2', 'S3', 'S4']
  const completedId = {A: 'S1', B: 'S2', C: 'S3', D: 'S4'}[completed]
  await writeYaml(paths.state, {
    ...state,
    phase: next ? 'IMPLEMENT' : 'VERIFY',
    status: 'APPROVED',
    currentSlice: next,
    slices: order.map((id) => ({id, status: id === completedId ? 'PASS' : id === next ? 'RUNNING' : order.indexOf(id) < order.indexOf(completedId) ? 'PASS' : 'PENDING', blockReason: null})),
    updatedAt: new Date().toISOString(),
  })
  await execGit(target, ['add', '--', '.evo/state.yml'])
  await execGit(target, ['commit', '-qm', `checkpoint: handoff after Session ${completed}`])
}

async function evaluateRecovery(target: string): Promise<CrossAgentContinuityTrace['recovery']> {
  try {
    const report = await buildRecoveryReport(target)
    const status: CrossAgentOutcome = report.currentObjective && report.activeChange === 'cross-agent-continuity' && report.recommendedNextAction.length > 0 ? 'PASS' : 'FAIL'
    return {
      status,
      objective: report.currentObjective ?? 'missing objective',
      nextAction: report.recommendedNextAction,
      source: 'evo recover / buildRecoveryReport from Repository and EVO state',
    }
  } catch (error) {
    return {
      status: 'FAIL',
      objective: 'recovery failed',
      nextAction: 'inspect the durable trace',
      source: redact(error instanceof Error ? error.message : String(error)),
    }
  }
}

async function evaluateProduct(target: string, baseline: string): Promise<CrossAgentContinuityTrace['evaluator']> {
  const paths = await changedPathsSinceBaseline(target, baseline)
  const allowed = new Set([
    'src/booking-service.js',
    'src/room-policy.js',
    'test/booking-service.test.js',
    'test/room-policy.test.js',
    '.evo/state.yml',
  ])
  const outside = paths.filter((item) => !allowed.has(item) && !item.startsWith('.evo/work/active/cross-agent-continuity/'))
  const source = await readFile(path.join(target, 'src', 'booking-service.js'), 'utf8')
  const policy = await readFile(path.join(target, 'src', 'room-policy.js'), 'utf8')
  const tests = await runProductTests(target)
  const checks = [
    check('EVAL-BOUNDARY', 'changed-path boundary', outside.length === 0, outside.length === 0 ? 'All changes stay in the declared product and EVO checkpoint boundary.' : `Unexpected paths: ${outside.join(', ')}`),
    check('EVAL-FEATURE-A', 'Feature A', /export function reserveRoom\s*\(/u.test(source), 'reserveRoom is present in the booking service.'),
    check('EVAL-REQUIREMENT-DELTA', 'Requirement Delta', /8\s*\*\s*60\s*\*\s*60|MAX_RESERVATION|eight.?hour|8 hours/iu.test(source), 'The maximum-duration requirement is represented in product code.'),
    check('EVAL-BUG-REGRESSION', 'Bug regression', /owningTenantId\s*===\s*requestedTenantId/u.test(policy) && !/owningTenantId\s*!==\s*requestedTenantId/u.test(policy), 'Tenant scope uses the positive same-tenant predicate after regression repair.'),
    check('EVAL-FEATURE-B', 'Feature B', /export function cancelReservation\s*\(/u.test(source), 'cancelReservation is present in the same service boundary.'),
    check('EVAL-DOMAIN-LANGUAGE', 'domain vocabulary', ['room', 'tenant', 'reservation', 'booking'].every((word) => new RegExp(word, 'iu').test(source)), 'Room/tenant/booking vocabulary remains consistent.'),
    check('EVAL-FORBIDDEN-MECHANISMS', 'forbidden mechanism leakage', !/(?:DataScope|AjaxResult|RuoYi|SysUserController|SpringBoot)/u.test(`${source}\n${policy}`), 'No unrelated RuoYi mechanism leaked into the positive fixture.'),
  ]
  return {
    status: checks.every((item) => item.status === 'PASS') && tests.status === 'PASS' ? 'PASS' : 'FAIL',
    checks,
    testCommand: 'node --test',
    testStatus: tests.status,
  }
}

function check(id: string, category: string, passed: boolean, detail: string): CrossAgentContinuityTrace['evaluator']['checks'][number] {
  return {id, category, status: passed ? 'PASS' : 'FAIL', detail}
}

async function runProductTests(target: string): Promise<{readonly status: CrossAgentOutcome; readonly detail: string}> {
  try {
    await execFile('node', ['--test'], {cwd: target, timeout: Math.min(timeoutMs, 300_000), maxBuffer: 2_000_000})
    return {status: 'PASS', detail: 'node --test exited 0'}
  } catch (error) {
    return {status: 'FAIL', detail: redact(error instanceof Error ? error.message : String(error))}
  }
}

async function workingChangedPaths(target: string): Promise<string[]> {
  try {
    const result = await execFile('git', ['status', '--short', '--untracked-files=all'], {cwd: target, timeout: 10_000, maxBuffer: 500_000})
    return parseStatusPaths(result.stdout)
  } catch {
    return []
  }
}

async function changedPathsSinceBaseline(target: string, baseline: string): Promise<string[]> {
  const committed = await execGit(target, ['diff', '--name-only', `${baseline}..HEAD`])
  const working = await workingChangedPaths(target)
  return [...new Set([...committed.split(/\r?\n/u).filter(Boolean), ...working])].sort()
}

function parseStatusPaths(status: string): string[] {
  return [...new Set(status.split(/\r?\n/u).filter((line) => line.length > 2).map((line) => line.slice(3).trim()).filter(Boolean))].sort()
}

async function gitRevision(target: string): Promise<string> {
  return (await execGit(target, ['rev-parse', 'HEAD'])).trim()
}

async function execGit(target: string, args: readonly string[]): Promise<string> {
  const result = await execFile('git', [...args], {cwd: target, timeout: 60_000, maxBuffer: 2_000_000})
  return String(result.stdout)
}

async function commandAvailable(command: string): Promise<boolean> {
  try {
    await execFile(process.platform === 'win32' ? 'where' : 'which', [command], {timeout: 10_000, maxBuffer: 100_000})
    return true
  } catch {
    return false
  }
}

function sessionResult(plan: SessionPlan, invocation: string, status: CrossAgentOutcome, paths: string[], verification: string[], summary: string, error: string | null): CrossAgentSession {
  return {id: plan.id, client: plan.client, status, invocation, taskPackage: plan.taskPackage, changedPaths: paths, verification, summary, error}
}

function notRunSession(plan: SessionPlan, reason = 'A preceding session did not produce a verified handoff.'): CrossAgentSession {
  return sessionResult(plan, `not-run-${plan.id.toLowerCase()}`, 'NOT_RUN', [], [], reason, reason)
}

function deriveTraceStatus(values: readonly CrossAgentSession[], result: CrossAgentContinuityTrace['evaluator'], recoveryResult: CrossAgentContinuityTrace['recovery']): CrossAgentContinuityTrace['status'] {
  if (values.every((item) => item.status === 'PASS') && result.status === 'PASS' && recoveryResult.status === 'PASS') return 'BEHAVIORAL_PASS'
  if (values.some((item) => item.status === 'FAIL') || result.status === 'FAIL' || recoveryResult.status === 'FAIL') return 'BEHAVIORAL_FAIL'
  return 'UNVERIFIED'
}

function formatSummary(trace: CrossAgentContinuityTrace): string {
  return [
    '# Cross-agent continuity evaluation / 跨 Agent 连续性评估',
    '',
    `Status: ${trace.status}`,
    `Baseline revision: ${trace.baselineRevision}`,
    `Final revision: ${trace.finalRevision ?? 'not reached'}`,
    `Artifact SHA-256: ${trace.artifactSha256}`,
    '',
    '## Harness sequence',
    '',
    trace.harnessSequence.map((client, index) => `${index + 1}. ${client}`).join('\n'),
    '',
    '## Sessions',
    '',
    ...trace.sessions.map((session) => `- ${session.id}/${session.client}: ${session.status}; ${session.taskPackage}; changed=${session.changedPaths.join(', ') || 'none'}${session.error ? `; detail=${session.error}` : ''}`),
    '',
    '## Recovery',
    '',
    `- ${trace.recovery.status}: ${trace.recovery.objective}`,
    `- Next action: ${trace.recovery.nextAction}`,
    `- Source: ${trace.recovery.source}`,
    '',
    '## Independent evaluator',
    '',
    `- Overall: ${trace.evaluator.status}`,
    `- Tests: ${trace.evaluator.testStatus} (${trace.evaluator.testCommand})`,
    ...trace.evaluator.checks.map((item) => `- ${item.status} ${item.id} / ${item.category}: ${item.detail}`),
    '',
    '## Limitations',
    '',
    ...(trace.limitations.length > 0 ? trace.limitations.map((item) => `- ${item}`) : ['- none recorded']),
    '',
    'The trace is sanitized and records only independent observations; Agent self-reports are not acceptance evidence. / Trace 已脱敏，只记录独立观察；Agent 自报不是验收证据。',
    '',
  ].join('\n')
}

async function writeFiles(target: string, files: Readonly<Record<string, string>>): Promise<void> {
  for (const [relative, contents] of Object.entries(files)) {
    const destination = path.join(target, relative)
    await mkdir(path.dirname(destination), {recursive: true})
    await writeFile(destination, contents, 'utf8')
  }
}

function redact(value: string): string {
  const redacted = value
    .replace(/((?:api[_-]?key|token|secret|password)\s*[=:]\s*)[^\s]+/giu, '$1[REDACTED]')
    .replace(/\/home\/[^\s]+/gu, '[TEMP_PATH]')
  return redacted.length <= 1200 ? redacted : `${redacted.slice(-1200)} (truncated)`
}

function resolveOption(name: string, fallback: string): string {
  const index = process.argv.indexOf(name)
  const value = index >= 0 ? process.argv[index + 1] : undefined
  return value ? path.resolve(value) : fallback
}

function boundedTimeout(raw: string | undefined): number {
  const value = Number(raw ?? 900_000)
  return Number.isFinite(value) ? Math.min(Math.max(Math.trunc(value), 30_000), 3_600_000) : 900_000
}
