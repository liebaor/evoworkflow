import path from 'node:path'

import type {State} from '../core/schemas.js'
import {EvoError} from '../core/errors.js'
import {writeTextAtomic, writeYaml} from './io.js'
import {openManagedRepository} from './managed.js'
import {repositoryPaths} from './paths.js'

export type ChangeWorkflowDocumentKind = 'delta' | 'bug'

export interface RequirementDeltaInput {
  readonly old: string
  readonly new: string
  readonly retain: readonly string[]
  readonly modify: readonly string[]
  readonly remove: readonly string[]
  readonly add: readonly string[]
  readonly impact: {
    readonly acceptance: string
    readonly decisions: string
    readonly planAndSlices: string
    readonly codeAndTests: string
    readonly documentation: string
    readonly dataApiCompatibility: string
  }
}

export interface BugInvestigationInput {
  readonly observedBehavior: string
  readonly reproductionAndFailingEvidence: string
  readonly expectedBehavior: string
  readonly rootCause: string
  readonly existingRuleOrMechanismToReuse: string
  readonly fixBoundary: string
  readonly regressionEvidence: string
  readonly realEntryPathStatus: 'PASS' | 'FAIL' | 'UNVERIFIED'
  readonly knowledgePromotion: string
}

const REQUIRED_SECTIONS: Record<ChangeWorkflowDocumentKind, readonly string[]> = {
  delta: ['Old', 'New', 'Retain', 'Modify', 'Remove', 'Add', 'Impact'],
  bug: [
    'Observed behavior',
    'Reproduction and failing evidence',
    'Expected behavior',
    'Root cause',
    'Existing rule or mechanism to reuse',
    'Fix boundary',
    'Regression evidence',
    'Real-entry-path status',
    'Knowledge promotion',
  ],
}

/** Returns required Delta or Bug sections missing from a Markdown document. */
export function missingWorkflowDocumentSections(source: string, kind: ChangeWorkflowDocumentKind): string[] {
  const headings = [...source.matchAll(/^##\s+(.+?)\s*$/gmu)].map((match) => match[1]?.trim() ?? '')
  return REQUIRED_SECTIONS[kind].filter((required) => !headings.some((heading) => heading === required || heading.startsWith(`${required} /`)))
}

/** Formats a Requirement Delta without changing the approved Change, Specification, or Plan. */
export function formatRequirementDelta(input: RequirementDeltaInput): string {
  return [
    '# Requirement Delta / 需求变更',
    '',
    '## Old / 旧内容',
    input.old.trim(),
    '',
    '## New / 新内容',
    input.new.trim(),
    '',
    '## Retain / 保留',
    ...listItems(input.retain),
    '',
    '## Modify / 修改',
    ...listItems(input.modify),
    '',
    '## Remove / 移除',
    ...listItems(input.remove),
    '',
    '## Add / 新增',
    ...listItems(input.add),
    '',
    '## Impact / 影响',
    `- Acceptance / 验收：${input.impact.acceptance.trim()}`,
    `- Decisions / Decision：${input.impact.decisions.trim()}`,
    `- Plan and Slices / Plan 与 Slice：${input.impact.planAndSlices.trim()}`,
    `- Code and tests / 代码与测试：${input.impact.codeAndTests.trim()}`,
    `- Documentation / 文档：${input.impact.documentation.trim()}`,
    `- Data, API, and compatibility / 数据、API 与兼容性：${input.impact.dataApiCompatibility.trim()}`,
  ].join('\n')
}

/** Formats a Bug investigation while preserving explicit unknown real-entry evidence. */
export function formatBugInvestigation(input: BugInvestigationInput): string {
  return [
    '# Bug investigation / 缺陷调查',
    '',
    '## Observed behavior / 观察到的行为',
    input.observedBehavior.trim(),
    '',
    '## Reproduction and failing evidence / 复现与失败证据',
    input.reproductionAndFailingEvidence.trim(),
    '',
    '## Expected behavior / 预期行为',
    input.expectedBehavior.trim(),
    '',
    '## Root cause / 根因',
    input.rootCause.trim(),
    '',
    '## Existing rule or mechanism to reuse / 应复用的现有规则或机制',
    input.existingRuleOrMechanismToReuse.trim(),
    '',
    '## Fix boundary / 修复边界',
    input.fixBoundary.trim(),
    '',
    '## Regression evidence / 回归证据',
    input.regressionEvidence.trim(),
    '',
    '## Real-entry-path status / 真实入口状态',
    `- \`${input.realEntryPathStatus}\``,
    '',
    '## Knowledge promotion / 知识沉淀',
    input.knowledgePromotion.trim(),
  ].join('\n')
}

/** Records a Delta and pauses the active Change for explicit human re-review. */
export async function recordRequirementDelta(root: string, changeId: string, input: RequirementDeltaInput, now = new Date()): Promise<string> {
  const managed = await openManagedRepository(root)
  if (managed.state.activeChange !== changeId) throw new EvoError(`Change ${changeId} is not the active Change.`)
  if (managed.state.activeGoal) throw new EvoError(`Active Goal ${managed.state.activeGoal} must stop before recording a Requirement Delta.`)
  const target = path.join(repositoryPaths(root).activeWork, changeId, 'delta.md')
  await writeTextAtomic(target, formatRequirementDelta(input))
  await writeYaml(repositoryPaths(root).state, needsHumanReview(managed.state, now))
  return relative(repositoryPaths(root).root, target)
}

/** Records a Bug investigation and pauses the active Change for evidence review. */
export async function recordBugInvestigation(root: string, changeId: string, input: BugInvestigationInput, now = new Date()): Promise<string> {
  const managed = await openManagedRepository(root)
  if (managed.state.activeChange !== changeId) throw new EvoError(`Change ${changeId} is not the active Change.`)
  if (managed.state.activeGoal) throw new EvoError(`Active Goal ${managed.state.activeGoal} must stop before recording a Bug investigation.`)
  const target = path.join(repositoryPaths(root).activeWork, changeId, 'bug.md')
  await writeTextAtomic(target, formatBugInvestigation(input))
  await writeYaml(repositoryPaths(root).state, needsHumanReview(managed.state, now))
  return relative(repositoryPaths(root).root, target)
}

function listItems(items: readonly string[]): string[] {
  return items.length > 0 ? items.map((item) => `- ${item.trim()}`) : ['- none / 无']
}

function needsHumanReview(state: State, now: Date): State {
  return {...state, status: 'NEEDS_INFO', updatedAt: now.toISOString()}
}

function relative(root: string, target: string): string {
  return path.relative(root, target).split(path.sep).join('/')
}
