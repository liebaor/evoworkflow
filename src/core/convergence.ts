import {mkdir, readFile, rename} from 'node:fs/promises'
import path from 'node:path'

import {GoalSchema, type State} from './schemas.js'
import {EvoError} from './errors.js'
import {pathExists, readYaml, writeTextAtomic, writeYaml} from '../repository/io.js'
import {inspectArtifactApproval, parseArtifactMetadata, type ApprovableArtifactKind} from '../repository/artifacts.js'
import {formatMarkdownDocument, parseMarkdownDocument} from '../repository/markdown.js'
import {listDirectory, openManagedRepository} from '../repository/managed.js'
import {repositoryPaths} from '../repository/paths.js'
import {validateProject} from '../validation/project.js'
import {reconcileEvidence} from '../repository/evidence.js'
import {checkCurrentTruth, createCompletionRecord} from '../repository/completion.js'

export type ConvergenceStatus = 'APPLY' | 'PENDING' | 'DRIFT' | 'CONFLICT' | 'UNAFFECTED'

export interface ConvergenceItem {
  readonly area: string
  readonly status: ConvergenceStatus
  readonly detail: string
}

export interface ConvergenceReport {
  readonly changeId: string
  readonly ready: boolean
  readonly items: readonly ConvergenceItem[]
}

/** Checks whether an accepted Change can be archived without weakening evidence. */
export async function checkConvergence(root: string, requestedChangeId?: string): Promise<ConvergenceReport> {
  const managed = await openManagedRepository(root)
  const changeId = requestedChangeId ?? managed.state.activeChange
  if (!changeId) throw new EvoError('No active Change is available for convergence.')
  if (managed.state.activeChange !== changeId) throw new EvoError(`Change ${changeId} is not the active Change.`)
  const paths = repositoryPaths(root)
  const changeRoot = path.join(paths.activeWork, changeId)
  const items: ConvergenceItem[] = []
  const validation = await validateProject(root)
  items.push({
    area: 'repository-protocol',
    status: validation.valid ? 'APPLY' : 'CONFLICT',
    detail: validation.valid ? 'Deterministic repository checks pass. / 确定性仓库检查通过。' : `${validation.issues.filter((item) => item.severity === 'error').length} protocol errors remain. / 还剩 ${validation.issues.filter((item) => item.severity === 'error').length} 个协议错误。`,
  })

  for (const kind of ['change', 'plan'] as const) {
    const target = path.join(changeRoot, `${kind}.md`)
    items.push(await approvedArtifact(target, `${kind}.md`, kind, changeId))
  }
  const specification = path.join(changeRoot, 'spec.md')
  if (await pathExists(specification)) items.push(await approvedArtifact(specification, 'spec.md', 'spec', changeId))
  else items.push({area: 'spec.md', status: 'UNAFFECTED', detail: 'This Change has no separate Specification artifact.'})

  const review = await reviewConvergence(path.join(changeRoot, 'review.md'))
  items.push(await evidenceConvergence(paths.root, changeId, review.acceptsLimitations))
  items.push(review.item)
  items.push(await goalConvergence(paths, managed.state))
  items.push(await decisionConvergence(paths, changeId))
  items.push(await currentTruthConvergence(paths.root, changeId))

  const ready = items.every((item) => item.status === 'APPLY' || item.status === 'UNAFFECTED')
  return {changeId, ready, items}
}

/** Applies only the deterministic archive portion after convergence is proven. */
export async function finishChange(root: string, requestedChangeId?: string, now = new Date()): Promise<ConvergenceReport> {
  const report = await checkConvergence(root, requestedChangeId)
  if (!report.ready) throw new EvoError(`Change ${report.changeId} is not ready to Finish.`)
  const managed = await openManagedRepository(root)
  const paths = repositoryPaths(root)
  const activeWork = path.join(paths.activeWork, report.changeId)
  const completedWork = path.join(paths.completedWork, report.changeId)
  if (await pathExists(completedWork)) throw new EvoError(`Completed Change already exists: ${report.changeId}`)

  const decisionsToPromote: Array<{readonly sourcePath: string; readonly destination: string; readonly document: ReturnType<typeof parseMarkdownDocument>}> = []
  for (const filename of await listDirectory(paths.workingDecisions)) {
    if (!filename.endsWith('.md')) continue
    const sourcePath = path.join(paths.workingDecisions, filename)
    const source = await readFile(sourcePath, 'utf8')
    const document = parseMarkdownDocument(source, sourcePath)
    if (document.data.change !== report.changeId) continue
    const destination = path.join(paths.currentDecisions, filename)
    if (await pathExists(destination)) throw new EvoError(`Current Decision already exists: ${filename}`)
    decisionsToPromote.push({sourcePath, destination, document})
  }

  let goalToMove: {readonly source: string; readonly destination: string} | null = null
  if (managed.state.activeGoal) {
    const source = path.join(paths.activeGoals, `${managed.state.activeGoal}.yml`)
    const goal = await readYaml(source, GoalSchema)
    if (goal.status !== 'READY_FOR_REVIEW') throw new EvoError(`Active Goal ${goal.id} is not READY_FOR_REVIEW.`)
    const destination = path.join(paths.completedGoals, `${goal.id}.yml`)
    if (await pathExists(destination)) throw new EvoError(`Completed Goal already exists: ${goal.id}`)
    goalToMove = {source, destination}
  }

  await mkdir(paths.currentDecisions, {recursive: true})
  for (const {sourcePath, destination, document} of decisionsToPromote) {
    document.data.status = 'current'
    await writeTextAtomic(sourcePath, formatMarkdownDocument(document))
    await rename(sourcePath, destination)
  }

  if (goalToMove) {
    await mkdir(paths.completedGoals, {recursive: true})
    await rename(goalToMove.source, goalToMove.destination)
  }

  await mkdir(paths.completedWork, {recursive: true})
  await rename(activeWork, completedWork)
  const timestamp = now.toISOString()
  await writeYaml(paths.state, {
    ...managed.state,
    phase: 'IDLE',
    status: 'COMPLETED',
    activeChange: null,
    activeGoal: null,
    currentSlice: null,
    slices: [],
    updatedAt: timestamp,
  } satisfies State)
  await createCompletionRecord(paths.root, report.changeId, now)
  return report
}

/** Formats the convergence classification used by humans before Finish. */
export function formatConvergenceReport(report: ConvergenceReport): string {
  return [
    `Change: ${report.changeId} / Change：${report.changeId}`,
    `Ready to Finish: ${report.ready ? 'yes' : 'no'} / 是否可以 Finish：${report.ready ? '是' : '否'}`,
    '',
    ...report.items.map((item) => `${item.status} ${item.area}: ${item.detail}`),
  ].join('\n')
}

async function approvedArtifact(
  target: string,
  label: string,
  kind: ApprovableArtifactKind,
  changeId: string,
): Promise<ConvergenceItem> {
  if (!(await pathExists(target))) return {area: label, status: 'CONFLICT', detail: 'Required artifact is missing. / 缺少必需的 Artifact。'}
  try {
    const document = parseMarkdownDocument(await readFile(target, 'utf8'), target)
    parseArtifactMetadata(document, kind, changeId)
    const approval = inspectArtifactApproval(document)
    if (approval.valid) return {area: label, status: 'APPLY', detail: `${approval.detail} / ${translateApprovalDetail(approval.detail)}`}
    return approval.code === 'UNAPPROVED'
      ? {area: label, status: 'PENDING', detail: `${approval.detail} / ${translateApprovalDetail(approval.detail)}`}
      : {area: label, status: 'CONFLICT', detail: `${approval.detail} / ${translateApprovalDetail(approval.detail)}`}
  } catch (error) {
    return {area: label, status: 'CONFLICT', detail: error instanceof Error ? error.message : String(error)}
  }
}

async function evidenceConvergence(root: string, changeId: string, allowAcceptedLimitations = false): Promise<ConvergenceItem> {
  try {
    const report = await reconcileEvidence(root, changeId)
    const hardIssues = report.issues.filter((issue) => issue.code !== 'LEGACY_EVIDENCE')
    if (hardIssues.length > 0) {
      return {area: 'evidence', status: 'CONFLICT', detail: hardIssues.map((issue) => issue.message).join(' ')}
    }
    const statuses = report.evidence.map((item) => item.status)
    if (statuses.length === 0) return {area: 'evidence', status: 'CONFLICT', detail: 'No acceptance-to-evidence entries were found. / 没有找到验收到证据的记录。'}
    if (statuses.includes('FAIL')) return {area: 'evidence', status: 'CONFLICT', detail: 'At least one acceptance criterion is FAIL. / 至少一个验收标准为 FAIL。'}
    if (report.legacy) {
      const legacyTarget = path.join(repositoryPaths(root).activeWork, changeId, 'evidence.md')
      const legacySource = await readFile(legacyTarget, 'utf8')
      const externalSection = /^##\s+(?:Unverified external or operational paths|External and operational evidence)\s*$([\s\S]*)/imu.exec(legacySource)?.[1] ?? ''
      if (/\bUNVERIFIED\b/u.test(externalSection)) {
        return allowAcceptedLimitations
          ? {area: 'evidence', status: 'APPLY', detail: 'External or operational evidence remains UNVERIFIED but is explicitly accepted as a limitation in human review. / 外部或运行环境证据仍为 UNVERIFIED，但已在人工评审中明确接受为限制。'}
          : {area: 'evidence', status: 'PENDING', detail: 'External or operational evidence remains UNVERIFIED. / 外部或运行环境证据仍为 UNVERIFIED。'}
      }
    }
    if (statuses.some((status) => status === 'NOT_RUN' || status === 'BLOCKED')) {
      if (!allowAcceptedLimitations) return {area: 'evidence', status: 'PENDING', detail: 'At least one acceptance criterion is NOT_RUN or BLOCKED. / 至少一个验收标准仍为 NOT_RUN 或 BLOCKED。'}
      return {area: 'evidence', status: 'APPLY', detail: 'Unfinished evidence is explicitly accepted as a documented limitation in human review. / 未完成证据已在人工评审中明确作为限制接受。'}
    }
    return {
      area: 'evidence',
      status: 'APPLY',
      detail: `${statuses.length} acceptance criteria record PASS evidence${report.legacy ? ' (legacy evidence.md; migrate to evidence.yml)' : ''}. / ${statuses.length} 条验收标准都有 PASS 证据${report.legacy ? '（旧版 evidence.md；应迁移到 evidence.yml）' : ''}。`,
    }
  } catch (error) {
    return {area: 'evidence', status: 'CONFLICT', detail: error instanceof Error ? error.message : String(error)}
  }
}

async function currentTruthConvergence(root: string, changeId: string): Promise<ConvergenceItem> {
  try {
    const report = await checkCurrentTruth(root, changeId)
    if (report.missing.length > 0) return {area: 'current-truth', status: 'CONFLICT', detail: `Missing current-truth paths: ${report.missing.join(', ')}`}
    return report.legacy
      ? {area: 'current-truth', status: 'APPLY', detail: 'No current-truth targets are declared; legacy Plan metadata remains compatible but is not mechanically checked. / 未声明 current-truth 目标；旧版 Plan 元数据保持兼容，但不会机械校验。'}
      : {area: 'current-truth', status: 'APPLY', detail: `Verified ${report.verified.length} current-truth target(s). / 已验证 ${report.verified.length} 个 current-truth 目标。`}
  } catch (error) {
    return {area: 'current-truth', status: 'CONFLICT', detail: error instanceof Error ? error.message : String(error)}
  }
}

interface ReviewConvergenceResult {
  readonly item: ConvergenceItem
  readonly acceptsLimitations: boolean
}

async function reviewConvergence(target: string): Promise<ReviewConvergenceResult> {
  if (!(await pathExists(target))) return {
    item: {area: 'review', status: 'PENDING', detail: 'review.md is missing. / 缺少 review.md。'},
    acceptsLimitations: false,
  }
  try {
    const document = parseMarkdownDocument(await readFile(target, 'utf8'), target)
    const accepted = document.data.status === 'APPROVED' && document.data.humanAcceptance === true
    const converged = document.data.docsConverged === true && document.data.openFindings === 0
    if (!accepted) return {
      item: {area: 'review', status: 'PENDING', detail: 'Current review lacks explicit human acceptance. / 当前评审还没有明确的人工接受。'},
      acceptsLimitations: false,
    }
    if (!converged) return {
      item: {area: 'review', status: 'CONFLICT', detail: 'Documentation convergence or finding disposition is incomplete. / 文档收敛或问题处置尚未完成。'},
      acceptsLimitations: false,
    }
    const acceptsLimitations = document.data.acceptedLimitations === true
    return {
      item: {
        area: 'review',
        status: 'APPLY',
        detail: acceptsLimitations
          ? 'Human acceptance, accepted limitations, zero open findings, and documentation convergence are recorded. / 已记录人工接受、已接受限制、零个未关闭问题和文档收敛。'
          : 'Human acceptance, zero open findings, and documentation convergence are recorded. / 已记录人工接受、零个未关闭问题和文档收敛。',
      },
      acceptsLimitations,
    }
  } catch (error) {
    return {
      item: {area: 'review', status: 'CONFLICT', detail: error instanceof Error ? error.message : String(error)},
      acceptsLimitations: false,
    }
  }
}

async function goalConvergence(paths: ReturnType<typeof repositoryPaths>, state: State): Promise<ConvergenceItem> {
  if (!state.activeGoal) return {area: 'goal', status: 'UNAFFECTED', detail: 'No Goal is associated with the active Change. / 活动 Change 没有关联 Goal。'}
  const target = path.join(paths.activeGoals, `${state.activeGoal}.yml`)
  if (!(await pathExists(target))) return {area: 'goal', status: 'CONFLICT', detail: 'State references a missing Goal. / State 引用了不存在的 Goal。'}
  const goal = await readYaml(target, GoalSchema)
  return goal.status === 'READY_FOR_REVIEW'
    ? {area: 'goal', status: 'APPLY', detail: 'All delegated Slices are ready for independent verification and review. / 所有委托 Slice 已准备好进行独立验证和评审。'}
    : {area: 'goal', status: 'PENDING', detail: `Goal status is ${goal.status}. / Goal 状态为 ${goal.status}。`}
}

async function decisionConvergence(paths: ReturnType<typeof repositoryPaths>, changeId: string): Promise<ConvergenceItem> {
  let count = 0
  for (const filename of await listDirectory(paths.workingDecisions)) {
    if (!filename.endsWith('.md')) continue
    const target = path.join(paths.workingDecisions, filename)
    const document = parseMarkdownDocument(await readFile(target, 'utf8'), target)
    if (document.data.change === changeId) count += 1
  }
  return count > 0
    ? {area: 'decisions', status: 'APPLY', detail: `${count} accepted working Decisions will become current. / ${count} 个已接受的 working Decision 将成为 current。`}
    : {area: 'decisions', status: 'UNAFFECTED', detail: 'No working Decision belongs to this Change. / 没有 working Decision 属于此 Change。'}
}

function translateApprovalDetail(detail: string): string {
  if (detail.startsWith('Artifact status is')) return 'Artifact 状态尚未批准。'
  if (detail.startsWith('Artifact was approved')) return 'Artifact 已由人工批准。'
  if (detail === 'APPROVED artifact has no approval record.') return '已批准 Artifact 缺少批准记录。'
  if (detail === 'Artifact approval metadata is invalid.') return 'Artifact 批准元数据无效。'
  if (detail === 'Artifact content changed after human approval.') return 'Artifact 在人工批准后发生了变化。'
  return '请检查 Artifact 的批准状态。'
}
