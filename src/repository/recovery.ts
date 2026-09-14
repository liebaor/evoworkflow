import {readFile} from 'node:fs/promises'
import path from 'node:path'

import {getStatusSummary} from '../core/navigation.js'
import {GoalSchema, type FreshnessStatus, type GateReport, type State, type WorkflowPhase, type WorkflowStatus} from '../core/schemas.js'
import {artifactPath, inspectArtifactApproval, parseArtifactMetadata} from './artifacts.js'
import {buildWorkingContext, type WorkingContext} from './working-context.js'
import {readYaml, pathExists} from './io.js'
import {openManagedRepository, readOptionalText} from './managed.js'
import {parseMarkdownDocument} from './markdown.js'
import {repositoryPaths} from './paths.js'
import {validateProject, type ValidationIssue} from '../validation/project.js'
import {readEvidence as readEvidenceDocument} from './evidence.js'
import {buildAcceptanceTraceability, inspectAcceptanceTrace, type AcceptanceTraceReport} from './acceptance-trace.js'
import {inspectConstraintsFreshness, readResolvedConstraints} from './constraints.js'
import {inspectFreshness} from './freshness.js'
import {evaluateProtocolGates} from '../validation/gates.js'
import {detectImplementationAheadOfApproval, type ImplementationAheadFinding} from './deviation.js'

export interface RecoveryEvidence {
  readonly path: string
  readonly statuses: readonly string[]
}

export interface RecoveryConstraintSummary {
  readonly persisted: boolean
  readonly status: FreshnessStatus | 'NOT_BUILT'
  readonly fingerprint: string | null
  readonly total: number
  readonly conflicts: readonly string[]
  readonly unknowns: readonly string[]
}

export interface RecoveryReport {
  readonly root: string
  readonly valid: boolean
  readonly currentObjective: string | null
  readonly currentPhase: WorkflowPhase
  readonly status: WorkflowStatus
  readonly activeChange: string | null
  readonly activeGoal: string | null
  readonly approvedArtifacts: readonly string[]
  readonly completedSlices: readonly string[]
  readonly pendingSlices: readonly string[]
  readonly blocked: readonly string[]
  readonly modifiedPaths: readonly string[]
  readonly latestEvidence: readonly RecoveryEvidence[]
  readonly constraints: RecoveryConstraintSummary
  readonly freshness: Awaited<ReturnType<typeof inspectFreshness>> | null
  readonly gates: GateReport | null
  readonly acceptanceTrace: AcceptanceTraceReport['document'] | null
  readonly checkpointChronology: readonly string[]
  readonly implementationAheadOfApproval: ImplementationAheadFinding | null
  readonly unknowns: readonly string[]
  readonly protocolIssues: readonly ValidationIssue[]
  readonly workingContext: WorkingContext
  readonly recommendedNextAction: string
}

/** Reconstructs the current human-controlled boundary from repository state without writing. */
export async function buildRecoveryReport(root: string): Promise<RecoveryReport> {
  const managed = await openManagedRepository(root)
  const paths = repositoryPaths(root)
  const validation = await validateProject(root)
  const workingContext = await buildWorkingContext(root, managed.state.activeChange ?? undefined)
  const approvedArtifacts = await readApprovedArtifacts(paths, managed.state)
  const latestEvidence = await readEvidence(paths, managed.state)
  const stateSlices = sliceSummary(managed.state)
  const blocked = [...stateSlices.blocked]
  if (managed.state.status === 'BLOCKED' || managed.state.status === 'NEEDS_INFO') blocked.push(`State status is ${managed.state.status}.`)
  for (const issue of validation.issues.filter((item) => item.severity === 'error')) blocked.push(`${issue.code}: ${issue.message}`)
  if (latestEvidence.some((item) => item.statuses.includes('FAIL'))) blocked.push('Evidence contains FAIL acceptance results.')
  if (latestEvidence.some((item) => item.statuses.some((status) => status.includes('BLOCKED')))) blocked.push('Evidence contains BLOCKED acceptance results.')
  const summary = await safeStatusSummary(root)
  const objective = await currentObjective(paths, managed.state, workingContext)
  const constraints = await readConstraintSummary(paths.root, managed.state.activeChange, workingContext)
  const freshness = managed.state.activeChange ? await safeFreshness(paths.root, managed.state.activeChange) : null
  const gates = managed.state.activeChange ? await safeProtocolGates(paths.root, managed.state.activeChange) : null
  const acceptanceTrace = managed.state.activeChange ? (await safeAcceptanceTrace(paths.root, managed.state.activeChange))?.document ?? null : null
  const implementationAheadOfApproval = managed.state.activeChange ? await safeImplementationAhead(paths.root, managed.state.activeChange) : null
  const checkpointChronology = workingContext.git.recentCommits
  if (implementationAheadOfApproval) blocked.push(implementationAheadOfApproval.detail)
  if (freshness && freshness.status !== 'CURRENT') blocked.push(`Derived artifact freshness is ${freshness.status}.`)
  if (constraints.status === 'CONFLICT') blocked.push('Resolved constraints contain an authority conflict.')
  if (constraints.unknowns.length > 0) blocked.push(`Resolved constraints contain unknown blockers: ${constraints.unknowns.join(', ')}.`)
  if (gates) {
    for (const gate of gates.gates.filter((item) => item.enforcement === 'HARD' && !['PASS'].includes(item.status))) {
      blocked.push(`Gate ${gate.id} is ${gate.status}: ${gate.detail}`)
    }
  }
  const unknowns = [...new Set([...workingContext.unknowns, ...latestEvidence.flatMap((item) => {
    if (item.statuses.includes('UNVERIFIED')) return [`${item.path} contains UNVERIFIED evidence.`]
    return item.statuses.some((status) => status.includes('NOT_RUN') || status.includes('BLOCKED')) ? [`${item.path} contains incomplete evidence.`] : []
  })])]

  return {
    root: paths.root,
    valid: validation.valid,
    currentObjective: objective,
    currentPhase: managed.state.phase,
    status: managed.state.status,
    activeChange: managed.state.activeChange,
    activeGoal: managed.state.activeGoal,
    approvedArtifacts,
    completedSlices: stateSlices.completed,
    pendingSlices: stateSlices.pending,
    blocked: [...new Set(blocked)],
    modifiedPaths: workingContext.git.changedPaths,
    latestEvidence,
    constraints,
    freshness,
    gates,
    acceptanceTrace,
    checkpointChronology,
    implementationAheadOfApproval,
    unknowns,
    protocolIssues: validation.issues,
    workingContext,
    recommendedNextAction: implementationAheadOfApproval?.nextAction ?? summary?.nextAction ?? 'evo check --root <repository>',
  }
}

/** Formats a recovery report as a compact handoff for a new Agent session. */
export function formatRecoveryReport(report: RecoveryReport): string {
  return [
    '# EVO Recovery / EVO 恢复报告',
    '',
    `Repository / 仓库：${report.root}`,
    `Objective / 当前目标：${report.currentObjective ?? 'none / 无'}`,
    `Phase / 阶段：${report.currentPhase}`,
    `Status / 状态：${report.status}`,
    `Active Change / 活动 Change：${report.activeChange ?? 'none / 无'}`,
    `Active Goal / 活动 Goal：${report.activeGoal ?? 'none / 无'}`,
    '',
    '## Completed / 已完成',
    ...(report.completedSlices.length > 0 ? report.completedSlices.map((item) => `- ${item}`) : ['- none / 无']),
    '',
    '## Pending / 待完成',
    ...(report.pendingSlices.length > 0 ? report.pendingSlices.map((item) => `- ${item}`) : ['- none / 无']),
    '',
    '## Blocked / 阻塞',
    ...(report.blocked.length > 0 ? report.blocked.map((item) => `- ${item}`) : ['- none / 无']),
    '',
    '## Approved artifacts / 已批准材料',
    ...(report.approvedArtifacts.length > 0 ? report.approvedArtifacts.map((item) => `- \`${item}\``) : ['- none / 无']),
    '',
    '## Evidence / 证据',
    ...(report.latestEvidence.length > 0 ? report.latestEvidence.map((item) => `- \`${item.path}\`: ${item.statuses.join(', ') || 'no acceptance rows / 无验收行'}`) : ['- none / 无']),
    '',
    '## Constraints / 工程约束',
    `- Status / 状态：${report.constraints.status}`,
    `- Persisted / 已持久化：${report.constraints.persisted ? 'yes / 是' : 'no / 否'}`,
    `- Fingerprint / 指纹：${report.constraints.fingerprint ?? 'none / 无'}`,
    `- Total / 总数：${report.constraints.total}`,
    ...(report.constraints.conflicts.length > 0 ? report.constraints.conflicts.map((item) => `- CONFLICT: ${item}`) : ['- conflicts: none / 无冲突']),
    ...(report.constraints.unknowns.length > 0 ? report.constraints.unknowns.map((item) => `- UNKNOWN: ${item}`) : ['- unknowns: none / 无未知']),
    '',
    '## Freshness / 新鲜度',
    ...(report.freshness ? [`- Overall / 总体：${report.freshness.status}`, ...report.freshness.entries.map((entry) => `- ${entry.status} ${entry.kind}/${entry.id}: ${entry.detail}`)] : ['- not built / 尚未构建']),
    '',
    '## Gates / 门禁',
    ...(report.gates ? report.gates.gates.map((gate) => `- ${gate.status} ${gate.enforcement} ${gate.id}: ${gate.detail}`) : ['- not run / 尚未运行']),
    '',
    '## Checkpoint chronology / 检查点历史',
    ...(report.checkpointChronology.length > 0 ? report.checkpointChronology.map((item) => `- ${item}`) : ['- none / 无']),
    '',
    '## Findings / 发现',
    ...(report.implementationAheadOfApproval
      ? [
        `- ${report.implementationAheadOfApproval.code}: ${report.implementationAheadOfApproval.detail}`,
        ...report.implementationAheadOfApproval.signals.map((signal) => `- ${signal.kind} ${signal.source}: ${signal.detail}`),
      ]
      : ['- none / 无']),
    '',
    '## Modified paths / 修改路径',
    ...(report.modifiedPaths.length > 0 ? report.modifiedPaths.map((item) => `- \`${item}\``) : ['- none / 无']),
    '',
    '## Unknowns / 未知项',
    ...(report.unknowns.length > 0 ? report.unknowns.map((item) => `- ${item}`) : ['- none / 无']),
    '',
    `Protocol / 协议：${report.valid ? 'PASS / 通过' : 'FAIL / 失败'}`,
    `Recommended next action / 建议下一步：${report.recommendedNextAction}`,
    '',
    'Recovery is read-only; the recommended action is not executed automatically. / 恢复报告只读，建议动作不会自动执行。',
  ].join('\n')
}

async function readConstraintSummary(root: string, changeId: string | null, context: WorkingContext): Promise<RecoveryConstraintSummary> {
  if (!changeId) return {persisted: false, status: 'NOT_BUILT', fingerprint: null, total: 0, conflicts: [], unknowns: []}
  const persisted = await inspectConstraintsFreshness(root, changeId)
  const document = persisted ?? await readResolvedConstraints(root, changeId)
  const values = document?.constraints ?? context.constraints ?? []
  return {
    persisted: document !== null,
    status: document?.freshness ?? context.constraintsFreshness ?? 'NOT_BUILT',
    fingerprint: document?.inputFingerprint ?? context.constraintsFingerprint ?? null,
    total: values.length,
    conflicts: values.filter((item) => item.type === 'CONFLICT').map((item) => `${item.topic}: ${item.statement}`),
    unknowns: values.filter((item) => item.type === 'UNKNOWN').map((item) => `${item.topic}: ${item.statement}`),
  }
}

async function safeFreshness(root: string, changeId: string): Promise<Awaited<ReturnType<typeof inspectFreshness>> | null> {
  try {
    return await inspectFreshness(root, changeId)
  } catch {
    return null
  }
}

async function safeProtocolGates(root: string, changeId: string): Promise<GateReport | null> {
  try {
    return await evaluateProtocolGates(root, changeId)
  } catch {
    return null
  }
}

async function safeAcceptanceTrace(root: string, changeId: string): Promise<AcceptanceTraceReport | null> {
  try {
    return await inspectAcceptanceTrace(root, changeId) ?? await buildAcceptanceTraceability(root, changeId)
  } catch {
    return null
  }
}

async function safeImplementationAhead(root: string, changeId: string): Promise<ImplementationAheadFinding | null> {
  try {
    return await detectImplementationAheadOfApproval(root, changeId)
  } catch {
    return null
  }
}

async function readApprovedArtifacts(paths: ReturnType<typeof repositoryPaths>, state: State): Promise<string[]> {
  if (!state.activeChange) return []
  const result: string[] = []
  for (const kind of ['change', 'spec', 'plan'] as const) {
    const target = artifactPath(paths.root, state.activeChange, kind)
    if (!(await pathExists(target))) continue
    try {
      const document = parseMarkdownDocument(await readFile(target, 'utf8'), target)
      parseArtifactMetadata(document, kind, state.activeChange)
      if (inspectArtifactApproval(document).valid) result.push(relative(paths.root, target))
    } catch {
      // Protocol issues are reported separately; one malformed Artifact must not hide other recovery facts.
    }
  }
  return result
}

async function readEvidence(paths: ReturnType<typeof repositoryPaths>, state: State): Promise<RecoveryEvidence[]> {
  if (!state.activeChange) return []
  const modern = await readEvidenceDocument(paths.root, state.activeChange)
  if (modern.document && !modern.legacy) {
    return [{path: modern.path ?? relative(paths.root, path.join(paths.activeWork, state.activeChange, 'evidence.yml')), statuses: modern.document.acceptance.map((item) => `${item.id}=${item.status}`)}]
  }
  const target = path.join(paths.activeWork, state.activeChange, 'evidence.md')
  const source = await readOptionalText(target)
  if (!source) return []
  const statuses = [...source.matchAll(/^\|\s*AC-[^|]+\|\s*(PASS|FAIL|UNVERIFIED)\s*\|/gmu)].map((match) => match[1] ?? '')
  return [{path: relative(paths.root, target), statuses}]
}

async function currentObjective(paths: ReturnType<typeof repositoryPaths>, state: State, context: WorkingContext): Promise<string | null> {
  if (state.activeGoal) {
    const target = path.join(paths.activeGoals, `${state.activeGoal}.yml`)
    if (await pathExists(target)) {
      try {
        const goal = await readYaml(target, GoalSchema)
        const current = goal.slices.find((slice) => slice.status === 'RUNNING' || slice.status === 'BLOCKED')
        return current ? `${goal.title} — ${current.objective}` : goal.title
      } catch {
        // The invalid Goal is reported by protocolIssues.
      }
    }
  }
  return context.change?.title ?? null
}

function sliceSummary(state: State): {readonly completed: string[]; readonly pending: string[]; readonly blocked: string[]} {
  return {
    completed: state.slices.filter((slice) => ['PASS', 'SKIPPED'].includes(slice.status)).map((slice) => `${slice.id}=${slice.status}`),
    pending: state.slices.filter((slice) => slice.status === 'PENDING' || slice.status === 'RUNNING').map((slice) => `${slice.id}=${slice.status}`),
    blocked: state.slices.filter((slice) => slice.status === 'BLOCKED').map((slice) => `${slice.id}${slice.blockReason ? `: ${slice.blockReason}` : ''}`),
  }
}

async function safeStatusSummary(root: string): Promise<{readonly nextAction: string} | null> {
  try {
    const summary = await getStatusSummary(root)
    return {nextAction: summary.nextAction}
  } catch {
    return null
  }
}

function relative(root: string, target: string): string {
  return path.relative(root, target).split(path.sep).join('/')
}
