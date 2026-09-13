import {GoalSchema, type ChangeWeight, type Completion, type Goal, type State} from './schemas.js'
import {pathExists, readYaml} from '../repository/io.js'
import {listDirectory, openManagedRepository, readOptionalText} from '../repository/managed.js'
import {artifactPath, parseArtifactMetadata} from '../repository/artifacts.js'
import {parseMarkdownDocument} from '../repository/markdown.js'
import {repositoryPaths} from '../repository/paths.js'
import {validateProject} from '../validation/project.js'
import {readCompletion} from '../repository/completion.js'

export interface StatusSummary {
  readonly root: string
  readonly initialized: boolean
  readonly state: State | null
  readonly changeWeight: ChangeWeight | null
  readonly goal: Goal | null
  readonly completion: Completion | null
  readonly errors: number
  readonly warnings: number
  readonly nextAction: string
  readonly reason: string
}

/** Reconstructs current workflow state and recommends one non-executing next action. */
export async function getStatusSummary(root: string): Promise<StatusSummary> {
  const paths = repositoryPaths(root)
  if (!(await pathExists(paths.config))) {
    return {
      root: paths.root,
      initialized: false,
      state: null,
      changeWeight: null,
      goal: null,
      completion: null,
      errors: 0,
      warnings: 0,
      nextAction: 'evo init --apply',
      reason: 'The repository is not EVO-managed.',
    }
  }
  const managed = await openManagedRepository(root)
  const validation = await validateProject(root)
  let goal: Goal | null = null
  let changeWeight: ChangeWeight | null = null
  if (managed.state.activeChange) {
    const target = artifactPath(root, managed.state.activeChange, 'change')
    const source = await readOptionalText(target)
    if (source) {
      try {
        const metadata = parseArtifactMetadata(parseMarkdownDocument(source, target), 'change', managed.state.activeChange)
        if ('weight' in metadata) changeWeight = metadata.weight
      } catch {
        // The validation report owns malformed artifact diagnostics.
      }
    }
  }
  if (managed.state.activeGoal) {
    const target = `${paths.activeGoals}/${managed.state.activeGoal}.yml`
    if (await pathExists(target)) goal = await readYaml(target, GoalSchema)
  }
  const completion = managed.state.activeChange ? null : await latestCompletion(paths)
  const recommendation = recommend(managed.state, goal, validation.valid, changeWeight)
  return {
    root: paths.root,
    initialized: true,
    state: managed.state,
    changeWeight,
    goal,
    completion,
    errors: validation.issues.filter((item) => item.severity === 'error').length,
    warnings: validation.issues.filter((item) => item.severity === 'warning').length,
    ...recommendation,
  }
}

/** Formats status for humans without mutating state or entering another phase. */
export function formatStatusSummary(summary: StatusSummary): string {
  if (!summary.initialized) {
    return [`Repository: ${summary.root} / 仓库：${summary.root}`, 'evoworkflow: not initialized / evoworkflow：未初始化', `Recommended next action: ${summary.nextAction} / 推荐下一步：${summary.nextAction}`, `Reason / 原因: ${summary.reason}`].join('\n')
  }
  return [
    `Repository: ${summary.root} / 仓库：${summary.root}`,
    `Mode: ${summary.state?.projectMode ?? 'unknown'} / 模式：${summary.state?.projectMode ?? 'unknown'}`,
    `Phase: ${summary.state?.phase ?? 'unknown'} / 阶段：${summary.state?.phase ?? 'unknown'}`,
    `Status: ${summary.state?.status ?? 'unknown'} / 状态：${summary.state?.status ?? 'unknown'}`,
    `Active Change: ${summary.state?.activeChange ?? 'none'} / 活动 Change：${summary.state?.activeChange ?? 'none'}`,
    `Change weight: ${summary.changeWeight ?? 'none'} / Change 权重：${summary.changeWeight ?? 'none'}`,
    `Active Goal: ${summary.state?.activeGoal ?? 'none'}${summary.goal ? ` (${summary.goal.status})` : ''} / 活动 Goal：${summary.state?.activeGoal ?? 'none'}${summary.goal ? `（${summary.goal.status}）` : ''}`,
    `Last completion: ${summary.completion ? `${summary.completion.change} (${summary.completion.sourceStatus})` : 'none'} / 最近完成：${summary.completion ? `${summary.completion.change}（${summary.completion.sourceStatus}）` : '无'}`,
    `Current Slice: ${summary.state?.currentSlice ?? 'none'} / 当前 Slice：${summary.state?.currentSlice ?? 'none'}`,
    `Slice checkpoints: ${summary.state?.slices.length ? summary.state.slices.map((slice) => `${slice.id}=${slice.status}`).join(', ') : 'none'} / Slice 检查点：${summary.state?.slices.length ? summary.state.slices.map((slice) => `${slice.id}=${slice.status}`).join(', ') : 'none'}`,
    `Protocol issues: ${summary.errors} errors, ${summary.warnings} warnings / 协议问题：${summary.errors} 个错误，${summary.warnings} 个警告`,
    `Recommended next action: ${summary.nextAction} / 推荐下一步：${summary.nextAction}`,
    `Reason / 原因: ${summary.reason}`,
  ].join('\n')
}

async function latestCompletion(paths: ReturnType<typeof repositoryPaths>): Promise<Completion | null> {
  const values: Completion[] = []
  for (const changeId of await listDirectory(paths.completedWork)) {
    const completion = await readCompletion(paths.root, changeId)
    if (completion) values.push(completion)
  }
  values.sort((left, right) => right.finishedAt.localeCompare(left.finishedAt))
  return values[0] ?? null
}

function recommend(state: State, goal: Goal | null, valid: boolean, changeWeight: ChangeWeight | null): Pick<StatusSummary, 'nextAction' | 'reason'> {
  if (!valid) return {nextAction: 'evo check', reason: 'Repository protocol errors must be resolved before phase work continues. / 必须先修复仓库协议错误，才能继续阶段工作。'}
  if (goal) {
    if (goal.status === 'DRAFT') return {nextAction: 'review the Goal, then run evo goal approve', reason: 'Delegated Slice intent is not approved. / 委托 Slice 意图尚未批准。'}
    if (goal.status === 'APPROVED') return {nextAction: `evo goal run ${goal.id}`, reason: 'The Goal is approved and ready for bounded execution. / Goal 已批准，可以开始有边界执行。'}
    if (goal.status === 'RUNNING') return {nextAction: `evo goal inspect ${goal.id}`, reason: 'Inspect the persisted checkpoint before taking another action. / 采取下一步前先检查已持久化的检查点。'}
    if (goal.status === 'BLOCKED') return {nextAction: `evo goal inspect ${goal.id}`, reason: 'A blocker requires a human Decision or explicit resume. / 阻塞需要人工 Decision 或明确恢复。'}
    if (goal.status === 'READY_FOR_REVIEW') return {nextAction: '/evo-verify', reason: 'Execution is complete, but verification, review, and human acceptance still own completion. / 执行完成，但验证、评审和人工接受仍负责最终完成。'}
    return {nextAction: '/ask-evo', reason: 'The active Goal is cancelled; choose how to continue the Change. / 活动 Goal 已取消，请选择如何继续 Change。'}
  }
  if (state.status === 'BLOCKED' || state.status === 'NEEDS_INFO') {
    return {nextAction: '/ask-evo', reason: 'The recorded blocker or unresolved Decision needs human direction. / 已记录的阻塞或未决 Decision 需要人工指示。'}
  }
  switch (state.phase) {
    case 'IDLE': return {nextAction: '/evo-grill-with-docs', reason: 'No active Change is recorded. / 尚未记录活动 Change。'}
    case 'INIT': return {nextAction: 'review initialization report', reason: 'Initialization requires human review before project knowledge is accepted. / 初始化结果需要人工审阅后才能接受为项目知识。'}
    case 'GRILL': {
      if (state.status === 'DRAFT') return {nextAction: '/evo-grill-with-docs', reason: 'Change intent is still being clarified. / Change 意图仍在澄清。'}
      if (state.status === 'AWAITING_APPROVAL') return {nextAction: `evo approve ${state.activeChange ?? '<change-id>'} change`, reason: 'Reviewable Change intent awaits exact-content human approval. / 可审阅的 Change 意图等待人工批准精确内容。'}
      return changeWeight === 'LARGE'
        ? {nextAction: '/evo-to-spec', reason: 'The approved Large Change requires a behavioral Specification before planning. / 已批准的 Large Change 在规划前需要行为规格。'}
        : {nextAction: '/evo-plan', reason: 'Approved Change intent is ready for implementation planning. / 已批准的 Change 意图可以进入实施规划。'}
    }
    case 'SPEC': {
      if (state.status === 'DRAFT') return {nextAction: '/evo-to-spec', reason: 'The Large-Change Specification is still being developed. / Large Change 规格仍在编写。'}
      if (state.status === 'AWAITING_APPROVAL') return {nextAction: `evo approve ${state.activeChange ?? '<change-id>'} spec`, reason: 'The Specification awaits exact-content human approval. / Specification 等待人工批准精确内容。'}
      return {nextAction: '/evo-plan', reason: 'Approved behavior is ready for implementation planning. / 已批准的行为可以进入实施规划。'}
    }
    case 'PLAN': {
      if (state.status === 'DRAFT') return {nextAction: '/evo-plan', reason: 'Vertical Slices and verification are not yet reviewable. / 垂直 Slice 和验证内容还不能审阅。'}
      if (state.status === 'AWAITING_APPROVAL') return {nextAction: `evo approve ${state.activeChange ?? '<change-id>'} plan`, reason: 'The Plan awaits exact-content human approval. / Plan 等待人工批准精确内容。'}
      return implementationRecommendation(state, 'Approved scope and Slice planning are ready for bounded implementation. / 已批准范围和 Slice 计划可以开始有边界实施。')
    }
    case 'IMPLEMENT': return state.status === 'APPROVED'
      ? implementationRecommendation(state, 'Continue only the currently approved Slice. / 只能继续当前已批准的 Slice。')
      : {nextAction: '/ask-evo', reason: 'Implementation cannot continue until its recorded approval or blocker is resolved. / 解决已记录的批准问题或阻塞后，才能继续实施。'}
    case 'VERIFY': return {nextAction: '/evo-verify', reason: 'Acceptance criteria still require observed evidence. / 验收标准仍需要实际观察证据。'}
    case 'REVIEW': return state.status === 'APPROVED'
      ? {nextAction: '/evo-finish', reason: 'Human-accepted review is ready for a read-only convergence report. / 已人工接受的评审可以生成只读收敛报告。'}
      : {nextAction: '/evo-review', reason: 'Review findings and explicit human acceptance precede Finish. / Finish 前必须处理评审结果并取得人工接受。'}
    case 'FINISH': return {nextAction: '/evo-finish', reason: 'Converge repository knowledge after human acceptance. / 人工接受后再收敛仓库知识。'}
  }
}

function implementationRecommendation(state: State, defaultReason: string): Pick<StatusSummary, 'nextAction' | 'reason'> {
  if (state.currentSlice) {
    return {nextAction: `/evo-implement ${state.currentSlice}`, reason: `Slice ${state.currentSlice} is the persisted current execution boundary. / Slice ${state.currentSlice} 是持久化的当前执行边界。`}
  }
  const pending = state.slices.find((slice) => slice.status === 'PENDING')
  if (pending) {
    return {nextAction: `select ${pending.id}, then invoke /evo-implement ${pending.id}`, reason: 'Starting the next Slice is a human-controlled phase transition. / 开始下一个 Slice 是人工控制的阶段转换。'}
  }
  if (state.slices.length > 0 && state.slices.every((slice) => ['PASS', 'SKIPPED'].includes(slice.status))) {
    return {nextAction: '/evo-verify', reason: 'Every persisted Slice checkpoint is complete; acceptance evidence now owns progress. / 所有持久化 Slice 检查点已完成，接下来由验收证据推动进度。'}
  }
  return {nextAction: '/evo-plan', reason: `${defaultReason} No recoverable Slice checkpoint is recorded. / 尚未记录可恢复的 Slice 检查点。`}
}
