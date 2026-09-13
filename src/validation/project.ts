import {readFile} from 'node:fs/promises'
import path from 'node:path'

import {ConfigSchema, DecisionMetadataSchema, GoalSchema, ReviewMetadataSchema, StateSchema, type DecisionMetadata, type State} from '../core/schemas.js'
import {approvalFingerprint, changeContextFingerprint} from '../core/fingerprint.js'
import {validateGoalIntent} from '../core/goal.js'
import {inspectArtifactApproval, parseArtifactMetadata, type ApprovableArtifactKind} from '../repository/artifacts.js'
import {errorMessage, pathExists, readYaml} from '../repository/io.js'
import {listDirectory, readOptionalText} from '../repository/managed.js'
import {parseMarkdownDocument} from '../repository/markdown.js'
import {repositoryPaths} from '../repository/paths.js'
import {validateGoalSlicesAgainstPlan} from '../repository/goals.js'
import {missingWorkflowDocumentSections} from '../repository/workflow-documents.js'

export type IssueSeverity = 'error' | 'warning' | 'info'

export interface ValidationIssue {
  readonly code: string
  readonly severity: IssueSeverity
  readonly message: string
  readonly path: string | null
}

export interface ValidationReport {
  readonly valid: boolean
  readonly issues: readonly ValidationIssue[]
}

/** Validates deterministic EVOworkflow repository invariants. */
export async function validateProject(root: string): Promise<ValidationReport> {
  const paths = repositoryPaths(root)
  const issues: ValidationIssue[] = []
  if (!(await pathExists(paths.evo))) {
    issues.push(issue('EVO_NOT_INITIALIZED', 'error', 'Missing .evo directory. Run evo init --apply.', '.evo'))
    return {valid: false, issues}
  }

  let config = null
  let state = null
  try {
    config = await readYaml(paths.config, ConfigSchema)
  } catch (error) {
    issues.push(issue('INVALID_CONFIG', 'error', errorMessage(error), relative(paths, paths.config)))
  }
  try {
    state = await readYaml(paths.state, StateSchema)
    issues.push(...validateStateRelationships(state, paths))
  } catch (error) {
    issues.push(issue('INVALID_STATE', 'error', errorMessage(error), relative(paths, paths.state)))
  }

  if (!(await pathExists(paths.project))) {
    issues.push(issue('MISSING_PROJECT_MAP', 'error', 'Missing .evo/project.md.', relative(paths, paths.project)))
  } else {
    const project = await readFile(paths.project, 'utf8')
    issues.push(...await validateAuthorityMap(project, paths))
  }

  if (state?.activeChange) {
    const changeRoot = path.join(paths.activeWork, state.activeChange)
    if (!(await pathExists(changeRoot))) {
      issues.push(issue('MISSING_ACTIVE_CHANGE', 'error', `State references missing active Change ${state.activeChange}.`, relative(paths, changeRoot)))
    } else {
      for (const filename of ['change.md', 'plan.md', 'evidence.md']) {
        const target = path.join(changeRoot, filename)
        if (!(await pathExists(target))) {
          issues.push(issue('INCOMPLETE_ACTIVE_CHANGE', 'error', `Active Change is missing ${filename}.`, relative(paths, target)))
        }
      }
      for (const kind of ['change', 'plan', 'spec'] as const) {
        const target = path.join(changeRoot, `${kind}.md`)
        if (await pathExists(target)) issues.push(...await validateArtifact(target, kind, state.activeChange, artifactApprovalRequired(kind, state), paths))
      }
      const review = path.join(changeRoot, 'review.md')
      if (await pathExists(review)) issues.push(...await validateReview(review, state.activeChange, paths))
      issues.push(...await validateOptionalWorkflowDocuments(changeRoot, paths))
      issues.push(...await validateSliceTracking(changeRoot, state, paths))
    }
  }

  if (state?.activeGoal) {
    const target = path.join(paths.activeGoals, `${state.activeGoal}.yml`)
    if (!(await pathExists(target))) {
      issues.push(issue('MISSING_ACTIVE_GOAL', 'error', `State references missing active Goal ${state.activeGoal}.`, relative(paths, target)))
    }
  }

  if (config && state) issues.push(...await validateGoals(paths, config.agents.adapters, state))
  issues.push(...await validateDecisionLinks(paths))

  return {valid: !issues.some((item) => item.severity === 'error'), issues: sortIssues(issues)}
}

async function validateOptionalWorkflowDocuments(changeRoot: string, paths: ReturnType<typeof repositoryPaths>): Promise<ValidationIssue[]> {
  const issues: ValidationIssue[] = []
  for (const [filename, kind] of [['delta.md', 'delta'], ['bug.md', 'bug']] as const) {
    const target = path.join(changeRoot, filename)
    if (!(await pathExists(target))) continue
    const source = await readFile(target, 'utf8')
    const missing = missingWorkflowDocumentSections(source, kind)
    if (missing.length > 0) {
      issues.push(issue('INCOMPLETE_CHANGE_WORKFLOW_DOCUMENT', 'error', `${filename} is missing required sections: ${missing.join(', ')}.`, relative(paths, target)))
    }
  }
  return issues
}

async function validateAuthorityMap(project: string, paths: ReturnType<typeof repositoryPaths>): Promise<ValidationIssue[]> {
  const issues: ValidationIssue[] = []
  const authoritySection = /^## Authority map\s*$([\s\S]*?)(?=^##\s|(?![\s\S]))/mu.exec(project)?.[1] ?? ''
  const rows = [...authoritySection.matchAll(/^\|\s*([^|]+?)\s*\|\s*`([^`]+)`\s*\|/gmu)]
    .map((match) => ({topic: match[1]?.trim() ?? '', authority: match[2]?.trim() ?? ''}))
    .filter((row) => row.topic !== 'Topic' && row.topic.length > 0)
  const byTopic = new Map<string, string[]>()
  for (const row of rows) {
    const values = byTopic.get(row.topic) ?? []
    values.push(row.authority)
    byTopic.set(row.topic, values)
    const target = path.resolve(paths.root, row.authority)
    const relativeTarget = path.relative(paths.root, target)
    if (relativeTarget.startsWith('..') || path.isAbsolute(relativeTarget)) {
      issues.push(issue('AUTHORITY_OUTSIDE_REPOSITORY', 'error', `Authority ${row.authority} escapes the repository.`, relative(paths, paths.project)))
    } else if (!(await pathExists(target))) {
      issues.push(issue('MISSING_AUTHORITY', 'error', `Primary authority does not exist: ${row.authority}.`, relative(paths, paths.project)))
    }
  }
  for (const [topic, authorities] of byTopic) {
    if (authorities.length > 1) {
      issues.push(issue('DUPLICATE_AUTHORITY', 'error', `Topic ${topic} has multiple primary authorities: ${authorities.join(', ')}.`, relative(paths, paths.project)))
    }
  }
  return issues
}

async function validateGoals(
  paths: ReturnType<typeof repositoryPaths>,
  adapters: Readonly<Record<string, {kind: 'codex' | 'claude' | 'opencode' | 'process'; command: string; args: string[]; timeoutMs: number}>>,
  state: State,
): Promise<ValidationIssue[]> {
  const issues: ValidationIssue[] = []
  for (const directory of [paths.activeGoals, paths.completedGoals]) {
    for (const filename of (await listDirectory(directory)).filter((item) => item.endsWith('.yml'))) {
      const target = path.join(directory, filename)
      try {
        const goal = await readYaml(target, GoalSchema)
        if (path.resolve(goal.repository) !== paths.root) {
          issues.push(issue('GOAL_REPOSITORY_MISMATCH', 'error', `Goal repository ${goal.repository} does not match its managed repository.`, relative(paths, target)))
        }
        if (directory === paths.activeGoals) {
          if (goal.id !== state.activeGoal) issues.push(issue('ORPHANED_ACTIVE_GOAL', 'error', `Active Goal ${goal.id} is not selected by state.yml.`, relative(paths, target)))
          if (goal.changeId !== state.activeChange) issues.push(issue('GOAL_CHANGE_MISMATCH', 'error', `Active Goal ${goal.id} belongs to Change ${goal.changeId}, not ${state.activeChange ?? 'none'}.`, relative(paths, target)))
          if (goal.status === 'CANCELLED') issues.push(issue('INVALID_ACTIVE_GOAL_STATUS', 'error', 'A CANCELLED Goal belongs under completed Goals.', relative(paths, target)))
          if (goal.id === state.activeGoal && goal.status !== 'DRAFT') {
            const projected = goal.slices.map((slice) => ({id: slice.id, status: slice.status, blockReason: slice.blockReason}))
            if (JSON.stringify(projected) !== JSON.stringify(state.slices)) {
              issues.push(issue('GOAL_SLICE_PROJECTION_DRIFT', 'error', 'state.yml Slice checkpoints do not match the active Goal authority.', relative(paths, paths.state)))
            }
            const expectedCurrent = goal.slices.find((slice) => slice.status === 'RUNNING')?.id
              ?? (goal.status === 'BLOCKED' ? goal.slices.find((slice) => slice.status === 'BLOCKED')?.id : undefined)
            if ((state.currentSlice ?? undefined) !== expectedCurrent) {
              issues.push(issue('GOAL_CURRENT_SLICE_DRIFT', 'error', 'state.yml currentSlice does not match the active Goal checkpoint.', relative(paths, paths.state)))
            }
          }
        } else if (!['CANCELLED', 'READY_FOR_REVIEW'].includes(goal.status)) {
          issues.push(issue('INVALID_COMPLETED_GOAL_STATUS', 'error', `Completed Goal has active status ${goal.status}.`, relative(paths, target)))
        }
        const adapter = adapters[goal.adapter]
        if (!adapter) {
          issues.push(issue('UNKNOWN_GOAL_ADAPTER', 'error', `Goal references unknown adapter ${goal.adapter}.`, relative(paths, target)))
          continue
        }
        const ids = new Set(goal.slices.map((slice) => slice.id))
        for (const slice of goal.slices) {
          for (const dependency of slice.dependsOn) {
            if (!ids.has(dependency)) issues.push(issue('UNKNOWN_SLICE_DEPENDENCY', 'error', `${slice.id} depends on unknown Slice ${dependency}.`, relative(paths, target)))
            if (dependency === slice.id) issues.push(issue('SELF_SLICE_DEPENDENCY', 'error', `${slice.id} depends on itself.`, relative(paths, target)))
          }
        }
        if (goal.approval && goal.approval.fingerprint !== approvalFingerprint(goal, adapter)) {
          issues.push(issue('STALE_GOAL_APPROVAL', 'error', 'Goal content or adapter configuration changed after approval.', relative(paths, target)))
        }
        if (goal.approval && directory === paths.activeGoals) {
          try {
            const contextFingerprint = await changeContextFingerprint(paths.root, goal.changeId)
            if (goal.approval.contextFingerprint !== contextFingerprint) {
              issues.push(issue('STALE_GOAL_CONTEXT', 'error', 'Active Change or Plan changed after Goal approval.', relative(paths, target)))
            }
          } catch (error) {
            issues.push(issue('INVALID_GOAL_CONTEXT', 'error', errorMessage(error), relative(paths, target)))
          }
        }
        if (!['DRAFT', 'CANCELLED'].includes(goal.status)) {
          try {
            validateGoalIntent(goal)
          } catch (error) {
            issues.push(issue('INVALID_GOAL_INTENT', 'error', errorMessage(error), relative(paths, target)))
          }
          if (directory === paths.activeGoals) {
            try {
              await validateGoalSlicesAgainstPlan(paths.root, goal.changeId, goal.slices.map((slice) => slice.id))
            } catch (error) {
              issues.push(issue('GOAL_SLICE_OUTSIDE_PLAN', 'error', errorMessage(error), relative(paths, target)))
            }
          }
        }
        if (goal.status === 'DRAFT' && goal.slices.some((slice) => slice.acceptance.length === 0 || slice.verify.length === 0)) {
          issues.push(issue('INCOMPLETE_DRAFT_GOAL', 'warning', 'DRAFT Goal still needs acceptance or verification before approval.', relative(paths, target)))
        }
        if (goal.status === 'READY_FOR_REVIEW' && goal.slices.some((slice) => slice.status !== 'PASS')) {
          issues.push(issue('INVALID_READY_GOAL', 'error', 'READY_FOR_REVIEW requires every Slice to be PASS.', relative(paths, target)))
        }
      } catch (error) {
        issues.push(issue('INVALID_GOAL', 'error', errorMessage(error), relative(paths, target)))
      }
    }
  }
  return issues
}

function validateStateRelationships(state: State, paths: ReturnType<typeof repositoryPaths>): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  if (state.activeGoal && !state.activeChange) {
    issues.push(issue('GOAL_WITHOUT_CHANGE', 'error', 'activeGoal requires an activeChange.', relative(paths, paths.state)))
  }
  if (state.phase === 'IDLE' && (state.activeChange || state.activeGoal)) {
    issues.push(issue('IDLE_WITH_ACTIVE_WORK', 'error', 'IDLE state cannot reference active work.', relative(paths, paths.state)))
  }
  if (!['IDLE', 'INIT'].includes(state.phase) && !state.activeChange) {
    issues.push(issue('PHASE_WITHOUT_CHANGE', 'error', `Phase ${state.phase} requires an active Change.`, relative(paths, paths.state)))
  }
  if (state.status === 'COMPLETED' && (state.phase !== 'IDLE' || state.activeChange || state.activeGoal)) {
    issues.push(issue('INVALID_COMPLETED_STATE', 'error', 'COMPLETED state requires IDLE with no active Change or Goal.', relative(paths, paths.state)))
  }
  if (!state.activeChange && (state.currentSlice || state.slices.length > 0)) {
    issues.push(issue('SLICE_STATE_WITHOUT_CHANGE', 'error', 'Slice checkpoints require an active Change.', relative(paths, paths.state)))
  }
  return issues
}

async function validateSliceTracking(
  changeRoot: string,
  state: State,
  paths: ReturnType<typeof repositoryPaths>,
): Promise<ValidationIssue[]> {
  const changeTarget = path.join(changeRoot, 'change.md')
  const planTarget = path.join(changeRoot, 'plan.md')
  if (!(await pathExists(changeTarget)) || !(await pathExists(planTarget))) return []
  try {
    const changeDocument = parseMarkdownDocument(await readFile(changeTarget, 'utf8'), changeTarget)
    const change = parseArtifactMetadata(changeDocument, 'change', state.activeChange ?? '')
    if (!('weight' in change) || change.weight === 'SMALL') return []
    const plan = await readFile(planTarget, 'utf8')
    const planIds = [...plan.matchAll(/^###\s+([A-Za-z0-9][A-Za-z0-9_-]*)\s+(?:—|-)\s+/gmu)].map((match) => match[1] ?? '')
    const required = (state.status === 'APPROVED' && ['PLAN', 'IMPLEMENT', 'VERIFY', 'REVIEW', 'FINISH'].includes(state.phase))
      || ['IMPLEMENT', 'VERIFY', 'REVIEW', 'FINISH'].includes(state.phase)
    if (new Set(planIds).size !== planIds.length) {
      return [issue('DUPLICATE_PLAN_SLICE', 'error', 'Plan contains duplicate Slice identifiers.', relative(paths, planTarget))]
    }
    if (!required) return []
    if (planIds.length === 0) return [issue('MISSING_PLAN_SLICE', 'error', 'Approved Standard or Large Plan has no machine-identifiable Slice headings.', relative(paths, planTarget))]
    if (state.slices.length === 0) return [issue('MISSING_SLICE_STATE', 'error', 'Approved Plan has no recoverable Slice checkpoints in state.yml.', relative(paths, paths.state))]
    const planned = new Set(planIds)
    const tracked = new Set(state.slices.map((slice) => slice.id))
    const missing = planIds.filter((id) => !tracked.has(id))
    const extra = state.slices.map((slice) => slice.id).filter((id) => !planned.has(id))
    if (missing.length > 0 || extra.length > 0) {
      return [issue(
        'SLICE_PLAN_DRIFT',
        'error',
        `Plan and state Slice ids differ${missing.length > 0 ? `; untracked: ${missing.join(', ')}` : ''}${extra.length > 0 ? `; unplanned: ${extra.join(', ')}` : ''}.`,
        relative(paths, paths.state),
      )]
    }
    return []
  } catch (error) {
    return [issue('INVALID_SLICE_TRACKING', 'error', errorMessage(error), relative(paths, paths.state))]
  }
}

async function validateDecisionLinks(paths: ReturnType<typeof repositoryPaths>): Promise<ValidationIssue[]> {
  const issues: ValidationIssue[] = []
  const all = new Map<string, string>()
  const records: Array<{readonly metadata: DecisionMetadata; readonly target: string}> = []
  const directories = [
    [paths.workingDecisions, 'working'],
    [paths.currentDecisions, 'current'],
    [paths.declinedDecisions, 'declined'],
  ] as const
  for (const [directory, expectedStatus] of directories) {
    for (const filename of (await listDirectory(directory)).filter((item) => item.endsWith('.md'))) {
      const id = path.basename(filename, '.md')
      const target = path.join(directory, filename)
      const source = await readOptionalText(target)
      if (!source) continue
      let metadata
      try {
        const document = parseMarkdownDocument(source, target)
        const parsed = DecisionMetadataSchema.safeParse(document.data)
        if (!parsed.success) throw new Error(parsed.error.issues.map((item) => `${item.path.join('.')}: ${item.message}`).join('; '))
        metadata = parsed.data
      } catch (error) {
        issues.push(issue('INVALID_DECISION_METADATA', 'error', errorMessage(error), relative(paths, target)))
        continue
      }
      if (id !== metadata.id && !id.startsWith(`${metadata.id}-`)) {
        issues.push(issue('DECISION_ID_MISMATCH', 'error', `Decision filename ${id} does not match metadata id ${metadata.id}.`, relative(paths, target)))
      }
      if (metadata.status !== expectedStatus) issues.push(issue('DECISION_STATUS_MISMATCH', 'error', `Decision directory requires status ${expectedStatus}; found ${metadata.status}.`, relative(paths, target)))
      if (all.has(metadata.id)) issues.push(issue('DUPLICATE_DECISION_ID', 'error', `Decision ${metadata.id} exists in multiple lifecycle files.`, relative(paths, target)))
      else all.set(metadata.id, target)
      records.push({metadata, target})
    }
  }
  for (const {metadata, target} of records) {
      for (const [field, linked] of [['supersedes', metadata.supersedes], ['supersededBy', metadata.supersededBy]] as const) {
        if (linked && !all.has(linked)) {
          issues.push(issue('BROKEN_DECISION_LINK', 'error', `Decision ${metadata.id} ${field} missing Decision ${linked}.`, relative(paths, target)))
        }
      }
  }
  return issues
}

async function validateArtifact(
  target: string,
  kind: ApprovableArtifactKind,
  changeId: string,
  approvalRequired: boolean,
  paths: ReturnType<typeof repositoryPaths>,
): Promise<ValidationIssue[]> {
  try {
    const source = await readOptionalText(target)
    if (!source) return []
    const document = parseMarkdownDocument(source, target)
    parseArtifactMetadata(document, kind, changeId)
    const approval = inspectArtifactApproval(document)
    if (approval.code === 'UNAPPROVED') {
      return approvalRequired
        ? [issue('UNAPPROVED_ACTIVE_ARTIFACT', 'error', `${kind}.md must be approved while workflow state is APPROVED.`, relative(paths, target))]
        : []
    }
    if (!approval.valid) {
      const code = approval.code === 'STALE_APPROVAL' ? 'STALE_ARTIFACT_APPROVAL' : 'INVALID_ARTIFACT_APPROVAL'
      return [issue(code, 'error', approval.detail, relative(paths, target))]
    }
    return []
  } catch (error) {
    return [issue('INVALID_ARTIFACT_METADATA', 'error', errorMessage(error), relative(paths, target))]
  }
}

function artifactApprovalRequired(kind: ApprovableArtifactKind, state: State): boolean {
  if (state.status === 'DRAFT') return false
  switch (state.phase) {
    case 'GRILL':
      return state.status === 'APPROVED' && kind === 'change'
    case 'SPEC':
      return kind === 'change' || (state.status === 'APPROVED' && kind === 'spec')
    case 'PLAN':
      return kind === 'change' || kind === 'spec' || (state.status === 'APPROVED' && kind === 'plan')
    case 'IMPLEMENT':
    case 'VERIFY':
    case 'REVIEW':
    case 'FINISH':
      return true
    case 'IDLE':
    case 'INIT':
      return false
  }
}

async function validateReview(target: string, changeId: string, paths: ReturnType<typeof repositoryPaths>): Promise<ValidationIssue[]> {
  try {
    const document = parseMarkdownDocument(await readFile(target, 'utf8'), target)
    const parsed = ReviewMetadataSchema.safeParse(document.data)
    if (!parsed.success) throw new Error(parsed.error.issues.map((item) => `${item.path.join('.')}: ${item.message}`).join('; '))
    if (parsed.data.change !== changeId) throw new Error(`review.md references Change ${parsed.data.change}; expected ${changeId}.`)
    if (parsed.data.humanAcceptance && parsed.data.status !== 'APPROVED') {
      return [issue('INVALID_REVIEW_ACCEPTANCE', 'error', 'Human acceptance requires review status APPROVED.', relative(paths, target))]
    }
    if (parsed.data.acceptedLimitations && !(parsed.data.status === 'APPROVED' && parsed.data.humanAcceptance)) {
      return [issue('INVALID_REVIEW_LIMITATION_ACCEPTANCE', 'error', 'Accepted limitations require review status APPROVED and human acceptance.', relative(paths, target))]
    }
    return []
  } catch (error) {
    return [issue('INVALID_REVIEW_METADATA', 'error', errorMessage(error), relative(paths, target))]
  }
}

/** Formats a validation report for terminal users. */
export function formatValidationReport(report: ValidationReport): string {
  if (report.issues.length === 0) return 'PASS: repository protocol is valid. / 通过：仓库协议有效。'
  return [
    report.valid ? 'PASS with warnings. / 通过，但有警告。' : 'FAIL: repository protocol violations found. / 失败：发现仓库协议问题。',
    ...report.issues.map((item) => `${item.severity.toUpperCase()} ${item.code}${item.path ? ` ${item.path}` : ''}: ${item.message}`),
  ].join('\n')
}

function issue(code: string, severity: IssueSeverity, message: string, target: string | null): ValidationIssue {
  return {code, severity, message, path: target}
}

function relative(paths: ReturnType<typeof repositoryPaths>, target: string): string {
  return path.relative(paths.root, target).split(path.sep).join('/')
}

function sortIssues(issues: readonly ValidationIssue[]): ValidationIssue[] {
  const order: Record<IssueSeverity, number> = {error: 0, warning: 1, info: 2}
  return [...issues].sort((left, right) => order[left.severity] - order[right.severity] || left.code.localeCompare(right.code))
}
