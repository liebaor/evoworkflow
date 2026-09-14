import {execFile as execFileCallback} from 'node:child_process'
import {promisify} from 'node:util'
import path from 'node:path'

import {GoalSchema, type Completion, type EvidenceRecord, type State, type WorkflowPhase} from '../core/schemas.js'
import {EvoError} from '../core/errors.js'
import {readCompletion} from './completion.js'
import {readEvidence, readEvidenceRecords} from './evidence.js'
import {pathExists, readYaml} from './io.js'
import {openManagedRepository} from './managed.js'
import {repositoryPaths} from './paths.js'
import {validateProject} from '../validation/project.js'
import {captureGitSnapshot} from './git-snapshot.js'

const execFile = promisify(execFileCallback)

export type DeliveryCheckpoint = 'SLICE' | 'STAGE' | 'BUGFIX' | 'FINAL_DELIVERY'
export type DeliveryPreviewStatus = 'READY' | 'BLOCKED' | 'NO_CHANGES'

export interface DeliveryOptions {
  readonly changeId?: string
  readonly checkpoint?: DeliveryCheckpoint
  readonly sliceId?: string
  readonly paths?: readonly string[]
  readonly apply?: boolean
  readonly push?: boolean
  readonly remote?: string
  readonly now?: Date
}

export interface DeliveryPreview {
  readonly status: DeliveryPreviewStatus
  readonly root: string
  readonly branch: string | null
  readonly change: string
  readonly checkpoint: DeliveryCheckpoint
  readonly slice: string | null
  readonly phase: WorkflowPhase
  readonly workflowStatus: State['status']
  readonly completed: boolean
  readonly includedPaths: readonly string[]
  readonly excludedPaths: readonly string[]
  readonly actualChangedPaths: readonly string[]
  readonly diffStat: string
  readonly evidence: readonly EvidenceRecord[]
  readonly limitations: readonly string[]
  readonly next: string
  readonly reason: string
  readonly message: string
}

export interface DeliveryResult {
  readonly preview: DeliveryPreview
  readonly commit: string
  readonly remote: string | null
  readonly pushed: boolean
}

/** Reads current EVO facts and renders a delivery checkpoint without staging or writing files. */
export async function prepareDeliveryCheckpoint(root: string, options: DeliveryOptions = {}): Promise<DeliveryPreview> {
  if (options.push && !options.apply) throw new EvoError('Push requires explicit commit authorization with --apply.')
  const managed = await openManagedRepository(root)
  const paths = repositoryPaths(root)
  const change = await resolveChange(paths, managed.state, options.changeId)
  const completed = managed.state.activeChange !== change
  const checkpoint = options.checkpoint ?? await inferCheckpoint(paths, managed.state, change, completed)
  const slice = options.sliceId ?? managed.state.currentSlice ?? await activeGoalSlice(paths, managed.state.activeGoal, completed ? null : change)
  const snapshot = await captureGitSnapshot(paths.root, options.now ?? new Date())
  const actualChangedPaths = [...snapshot.changedPaths]
  const explicitPaths = options.paths === undefined ? null : normalizePaths(paths.root, options.paths)
  const includedPaths = explicitPaths ?? actualChangedPaths
  const excludedPaths = actualChangedPaths.filter((item) => !includedPaths.includes(item))
  const unavailablePaths = includedPaths.filter((item) => !actualChangedPaths.includes(item))
  const validation = await validateProject(paths.root)
  const completion = completed ? await readCompletion(paths.root, change) : null
  const evidence = await safeEvidence(paths.root, change, completed)
  const limitations = collectLimitations(managed.state, validation.issues, evidence, completed, completion)
  const next = nextAction(managed.state, slice, completed)
  const diffStat = await gitText(paths.root, ['diff', '--stat', 'HEAD'])
  const conflicts = await gitConflicts(paths.root)
  const reasons: string[] = []
  if (actualChangedPaths.length === 0) reasons.push('No changed paths are available for a checkpoint.')
  if (conflicts.length > 0) reasons.push(`Unresolved Git conflicts: ${conflicts.join(', ')}`)
  if (includedPaths.length === 0 && actualChangedPaths.length > 0) reasons.push('The checkpoint has no included paths.')
  if (unavailablePaths.length > 0) reasons.push(`Selected paths are not changed in the current Git diff: ${unavailablePaths.join(', ')}.`)
  if (options.apply && options.paths === undefined) reasons.push('Creating a commit requires explicit --path selection; preview remains read-only.')
  if (options.apply && excludedPaths.length > 0 && options.paths === undefined) reasons.push('Unselected paths must be excluded explicitly before commit.')
  if (checkpoint === 'FINAL_DELIVERY' && (!completed || managed.state.status !== 'COMPLETED' || !completion)) {
    reasons.push('FINAL_DELIVERY requires an existing COMPLETED state and completion.yml from evo-finish.')
  }
  if (options.push && !snapshot.branch) reasons.push('Push requires a checked-out branch; detached HEAD is not a safe target.')
  if (options.push && !(await gitText(paths.root, ['remote', 'get-url', options.remote ?? 'origin']))) reasons.push(`Push remote is unavailable: ${options.remote ?? 'origin'}.`)
  const status: DeliveryPreviewStatus = actualChangedPaths.length === 0 ? 'NO_CHANGES' : reasons.length > 0 ? 'BLOCKED' : 'READY'
  const message = renderCommitMessage({
    root: paths.root,
    branch: snapshot.branch,
    change,
    checkpoint,
    slice,
    phase: managed.state.phase,
    workflowStatus: managed.state.status,
    completed,
    includedPaths,
    excludedPaths,
    actualChangedPaths,
    diffStat,
    evidence,
    limitations,
    next,
    reason: reasons.length > 0 ? reasons.join(' ') : 'Checkpoint is ready for the explicitly selected delivery action.',
    status,
    previewMessage: '',
  })
  return {
    status,
    root: paths.root,
    branch: snapshot.branch,
    change,
    checkpoint,
    slice,
    phase: managed.state.phase,
    workflowStatus: managed.state.status,
    completed,
    includedPaths,
    excludedPaths,
    actualChangedPaths,
    diffStat,
    evidence,
    limitations,
    next,
    reason: reasons.length > 0 ? reasons.join(' ') : 'Checkpoint is ready for the explicitly selected delivery action.',
    message,
  }
}

/** Creates a commit only after the caller explicitly authorizes apply and selects its scope. */
export async function createDeliveryCommit(root: string, options: DeliveryOptions): Promise<DeliveryResult> {
  if (!options.apply) throw new EvoError('Creating a Git commit requires explicit apply authorization.')
  const preview = await prepareDeliveryCheckpoint(root, options)
  if (preview.status !== 'READY') throw new EvoError(`Delivery checkpoint is ${preview.status}: ${preview.reason}`)
  if (preview.includedPaths.length === 0) throw new EvoError('No paths were selected for the delivery checkpoint.')
  const preStaged = await stagedPaths(pathsRoot(preview))
  const unexpectedPreStaged = preStaged.filter((item) => !preview.includedPaths.includes(item))
  if (unexpectedPreStaged.length > 0) {
    throw new EvoError(`Unrelated paths are already staged outside this checkpoint: ${unexpectedPreStaged.join(', ')}.`)
  }
  await git(pathsRoot(preview), ['add', '--', ...preview.includedPaths])
  const staged = await stagedPaths(pathsRoot(preview))
  const unexpectedStaged = staged.filter((item) => !preview.includedPaths.includes(item))
  if (unexpectedStaged.length > 0) throw new EvoError(`Unrelated paths are staged outside this checkpoint: ${unexpectedStaged.join(', ')}.`)
  const missingStaged = preview.includedPaths.filter((item) => !staged.includes(item))
  if (missingStaged.length > 0) throw new EvoError(`The selected delivery paths produced no staged diff: ${missingStaged.join(', ')}.`)
  await git(pathsRoot(preview), ['commit', '-m', preview.message])
  const commit = (await gitText(pathsRoot(preview), ['rev-parse', 'HEAD'])).trim()
  if (!/^[a-f0-9]{40}$/u.test(commit)) throw new EvoError('Git commit completed but HEAD is not a full commit id.')
  let pushed = false
  const remote = options.remote ?? 'origin'
  if (options.push) {
    if (!preview.branch) throw new EvoError('Push requires a checked-out branch.')
    await git(pathsRoot(preview), ['push', remote, preview.branch])
    pushed = true
  }
  return {preview, commit, remote: pushed ? remote : null, pushed}
}

/** Renders the structured chronology used by both preview and commit paths. */
export function renderCommitMessage(input: Omit<DeliveryPreview, 'message'> & {readonly previewMessage?: string}): string {
  const subject = subjectFor(input)
  const evidenceLines = input.evidence.length > 0
    ? input.evidence.map((record) => `- ${record.id}: ${record.status} ${record.kind} — ${record.label}`)
    : ['- none recorded / 尚未记录']
  const limitations = input.limitations.length > 0
    ? input.limitations.map((item) => `- ${item}`)
    : ['- none known / 暂无已知限制']
  const included = input.includedPaths.length > 0 ? input.includedPaths.join(', ') : 'none'
  const excluded = input.excludedPaths.length > 0 ? input.excludedPaths.join(', ') : 'none'
  const statusLine = input.completed && input.workflowStatus === 'COMPLETED'
    ? 'The Change is already recorded as COMPLETED; this commit records existing completion state.'
    : 'This is an active engineering checkpoint; it does not complete or accept the Change.'
  return [
    subject,
    '',
    'Context:',
    `- Change: ${input.change}`,
    `- Checkpoint: ${input.checkpoint}${input.slice ? ` / Slice ${input.slice}` : ''}`,
    `- Workflow: ${input.phase}/${input.workflowStatus}`,
    `- ${statusLine}`,
    '',
    'Completed:',
    `- Recorded the currently selected Git checkpoint for ${input.change}.`,
    `- Included paths: ${included}`,
    '',
    'Engineering Notes:',
    '- The Git diff is authoritative for the delivered scope.',
    `- Excluded changed paths remain outside this checkpoint: ${excluded}.`,
    '',
    'Verification:',
    `- Repository validation: ${input.status === 'READY' ? 'available for checkpoint' : input.status}.`,
    ...evidenceLines,
    ...(input.diffStat.trim() ? [`- Git diff stat: ${input.diffStat.trim().replace(/\n/gu, ' | ')}`] : []),
    '',
    'Limitations:',
    ...limitations,
    '',
    'Next:',
    `- ${input.next}`,
    '',
    `EVO-Change: ${input.change}`,
    `EVO-Slice: ${input.slice ?? 'none'}`,
    `EVO-Phase: ${input.phase}`,
    `EVO-Evidence: ${input.evidence.map((record) => record.id).join(',') || 'none'}`,
    'EVO-Decision: none',
    `EVO-Next: ${input.next}`,
  ].join('\n')
}

/** Formats a preview while keeping the no-write boundary obvious to operators. */
export function formatDeliveryPreview(preview: DeliveryPreview): string {
  return [
    `Delivery checkpoint / Git 交付检查点：${preview.status}`,
    `Change: ${preview.change}`,
    `Checkpoint: ${preview.checkpoint}${preview.slice ? ` / Slice ${preview.slice}` : ''}`,
    `Workflow: ${preview.phase}/${preview.workflowStatus}`,
    `Branch: ${preview.branch ?? 'detached or unavailable'}`,
    `Actual changed paths: ${preview.actualChangedPaths.join(', ') || 'none'}`,
    `Included paths: ${preview.includedPaths.join(', ') || 'none'}`,
    `Excluded paths: ${preview.excludedPaths.join(', ') || 'none'}`,
    `Reason: ${preview.reason}`,
    '',
    preview.message,
    '',
    'Preview is read-only. Use --apply with explicit --path values only after reviewing this checkpoint. / 预览只读；审阅后才可使用 --apply 和明确 --path。',
  ].join('\n')
}

async function resolveChange(paths: ReturnType<typeof repositoryPaths>, state: State, requested?: string): Promise<string> {
  const candidate = requested ?? state.activeChange
  if (!candidate) throw new EvoError('No active or requested Change is available for Git delivery.')
  safeChange(candidate)
  const active = path.join(paths.activeWork, candidate, 'change.md')
  const completed = path.join(paths.completedWork, candidate, 'change.md')
  if (!(await pathExists(active)) && !(await pathExists(completed))) throw new EvoError(`Change ${candidate} has no active or completed change.md.`)
  if (requested && state.activeChange !== requested && !(await pathExists(completed))) {
    throw new EvoError(`Requested Change ${requested} is not active and is not archived as completed.`)
  }
  return candidate
}

async function inferCheckpoint(paths: ReturnType<typeof repositoryPaths>, state: State, change: string, completed: boolean): Promise<DeliveryCheckpoint> {
  if (completed || state.status === 'COMPLETED') return 'FINAL_DELIVERY'
  if (await pathExists(path.join(paths.activeWork, change, 'bug.md'))) return 'BUGFIX'
  if (state.currentSlice || state.activeGoal) return 'SLICE'
  return 'STAGE'
}

async function activeGoalSlice(paths: ReturnType<typeof repositoryPaths>, goalId: string | null, change: string | null): Promise<string | null> {
  if (!goalId || !change) return null
  try {
    const goal = await readYaml(path.join(paths.activeGoals, `${goalId}.yml`), GoalSchema)
    return goal.changeId === change ? goal.slices.find((slice) => ['RUNNING', 'BLOCKED'].includes(slice.status))?.id ?? null : null
  } catch {
    return null
  }
}

function collectLimitations(
  state: State,
  issues: readonly {severity: string; code: string; message: string}[],
  evidence: readonly EvidenceRecord[],
  completed: boolean,
  completion: Completion | null,
): string[] {
  const result: string[] = []
  if (!completed) result.push(`Workflow remains ${state.phase}/${state.status}; evo-commit does not perform Acceptance or evo-finish.`)
  if (!completion && completed) result.push('No completion record was available for the requested archived Change.')
  for (const issue of issues.filter((item) => item.severity !== 'info').slice(0, 8)) result.push(`${issue.code}: ${issue.message}`)
  for (const record of evidence.filter((item) => item.status !== 'PASS').slice(0, 8)) result.push(`${record.id} remains ${record.status}; it is not converted to PASS by a commit.`)
  return [...new Set(result)]
}

function nextAction(state: State, slice: string | null, completed: boolean): string {
  if (completed || state.status === 'COMPLETED') return 'human review of the delivered chronology'
  if (state.activeGoal && slice) return `continue or inspect the current Goal Slice ${slice}`
  if (state.phase === 'PLAN' && state.status === 'AWAITING_APPROVAL') return 'approve the exact current Plan content'
  if (state.phase === 'VERIFY') return 'run independent verification and review'
  return 'inspect evo status and choose the next human-controlled action'
}

function subjectFor(input: Pick<DeliveryPreview, 'checkpoint' | 'change' | 'slice' | 'completed' | 'workflowStatus'>): string {
  if (input.checkpoint === 'BUGFIX') return `fix(evo): record ${input.slice ?? input.change} bugfix checkpoint`
  if (input.checkpoint === 'FINAL_DELIVERY' && input.completed && input.workflowStatus === 'COMPLETED') return `chore(evo): deliver completed ${input.change}`
  if (input.checkpoint === 'SLICE') return `feat(evo): record ${input.slice ?? input.change} engineering checkpoint`
  return `chore(evo): record ${input.change} engineering checkpoint`
}

function normalizePaths(root: string, values: readonly string[]): string[] {
  return [...new Set(values.map((value) => {
    const target = path.resolve(root, value)
    const relative = path.relative(root, target).split(path.sep).join('/')
    if (!relative || relative.startsWith('..') || path.isAbsolute(relative)) throw new EvoError(`Delivery path escapes repository: ${value}`)
    return relative
  }))].sort()
}

async function safeEvidence(root: string, change: string, completed: boolean): Promise<EvidenceRecord[]> {
  try {
    const read = await readEvidence(root, change, completed)
    if (read.legacy || !read.document) return []
    return await readEvidenceRecords(root, change, completed)
  } catch {
    return []
  }
}

async function gitConflicts(root: string): Promise<string[]> {
  const status = await gitText(root, ['status', '--short', '--untracked-files=all'])
  return status.split(/\r?\n/u).filter((line) => /^(?:DD|AU|UD|UA|DU|AA|UU)\s/u.test(line)).map((line) => line.slice(3).trim()).filter(Boolean)
}

async function stagedPaths(root: string): Promise<string[]> {
  return (await gitText(root, ['diff', '--cached', '--name-only']))
    .split(/\r?\n/u)
    .map((item) => item.trim())
    .filter(Boolean)
}

async function git(root: string, args: readonly string[]): Promise<string> {
  try {
    const result = await execFile('git', [...args], {cwd: root, timeout: 30_000, maxBuffer: 2_000_000})
    return String(result.stdout)
  } catch (error) {
    const detail = error instanceof Error ? error.message : String(error)
    throw new EvoError(`Git ${args[0] ?? 'command'} failed: ${detail}`)
  }
}

async function gitText(root: string, args: readonly string[]): Promise<string> {
  try {
    return await git(root, args)
  } catch {
    return ''
  }
}

function pathsRoot(preview: DeliveryPreview): string {
  return preview.root
}

function safeChange(value: string): void {
  if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/u.test(value)) throw new EvoError(`Invalid Change id: ${value}`)
}
