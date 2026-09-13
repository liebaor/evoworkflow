import type {ChangeWeight} from '../core/schemas.js'

export interface ChangeClassificationInput {
  readonly request: string
  readonly affectedModules?: number
  readonly changedFiles?: number
  readonly changesPublicApi?: boolean
  readonly changesData?: boolean
  readonly changesSecurity?: boolean
  readonly changesArchitecture?: boolean
  readonly complexState?: boolean
  readonly multipleSessions?: boolean
}

export interface ChangeClassification {
  readonly weight: ChangeWeight
  readonly process: 'SHORT' | 'STANDARD' | 'LARGE'
  readonly reasons: readonly string[]
  readonly recommendedArtifacts: readonly string[]
  readonly escalationTriggers: readonly string[]
}

export interface PrematureAbstractionFinding {
  readonly detected: boolean
  readonly abstractions: readonly string[]
  readonly detail: string
}

const largeTextSignals = [
  /cross[- ]module/iu,
  /multiple modules/iu,
  /breaking\s+(?:api|change)/iu,
  /public\s+api/iu,
  /schema|migration|database/iu,
  /security|permission model/iu,
  /architecture|state machine/iu,
  /跨模块|多个模块|公共接口|破坏性|数据库|迁移|安全|权限模型|架构|状态机/u,
]

const smallTextSignals = [
  /copy|text|label|button|wording|style|config(?:uration)?|typo/iu,
  /文案|文字|按钮|样式|配置|拼写|单字段|阈值|判断/u,
]

/** Classifies a request into the smallest workflow that can safely contain its risk. */
export function classifyChange(input: ChangeClassificationInput): ChangeClassification {
  const request = input.request.trim()
  const reasons: string[] = []
  const large = Boolean(input.changesPublicApi || input.changesData || input.changesSecurity || input.changesArchitecture || input.complexState || input.multipleSessions || (input.affectedModules ?? 0) > 1 || largeTextSignals.some((pattern) => pattern.test(request)))
  if (input.changesPublicApi) reasons.push('公共 API 或兼容性可能变化。')
  if (input.changesData) reasons.push('数据含义、Schema 或迁移可能变化。')
  if (input.changesSecurity) reasons.push('安全或权限边界可能变化。')
  if (input.changesArchitecture) reasons.push('架构边界可能变化。')
  if (input.complexState) reasons.push('存在复杂状态或跨步骤行为。')
  if (input.multipleSessions) reasons.push('工作预计跨多个 Session。')
  if ((input.affectedModules ?? 0) > 1) reasons.push('影响多个模块。')
  if (largeTextSignals.some((pattern) => pattern.test(request)) && reasons.length === 0) reasons.push('请求文本包含跨模块、API、数据、安全或架构风险信号。')

  if (large) {
    return {
      weight: 'LARGE',
      process: 'LARGE',
      reasons: reasons.length > 0 ? reasons : ['需要完整 Specification、Plan 和垂直 Slice。'],
      recommendedArtifacts: ['Working Context', 'Change', 'Specification', 'Plan', 'Vertical Slice', 'Verify', 'Review'],
      escalationTriggers: escalationTriggers(),
    }
  }

  const small = smallTextSignals.some((pattern) => pattern.test(request)) && (input.affectedModules ?? 1) <= 1 && (input.changedFiles ?? 1) <= 3
  if (small) {
    return {
      weight: 'SMALL',
      process: 'SHORT',
      reasons: ['范围局部、风险低且行为清楚；适合最小上下文和聚焦验证。'],
      recommendedArtifacts: ['Minimal Working Context', 'Implementation', 'Focused Verify'],
      escalationTriggers: escalationTriggers(),
    }
  }

  return {
    weight: 'STANDARD',
    process: 'STANDARD',
    reasons: reasons.length > 0 ? reasons : ['普通 Feature 需要 Change、Plan、Slice、Verify 和 Review。'],
    recommendedArtifacts: ['Working Context', 'Change', 'Plan', 'Vertical Slice', 'Verify', 'Review'],
    escalationTriggers: escalationTriggers(),
  }
}

/** Detects the named over-abstraction pattern for a locally simple request. */
export function detectPrematureAbstraction(request: string, implementationText: string): PrematureAbstractionFinding {
  const classification = classifyChange({request})
  const names = [...new Set((implementationText.match(/\b(?:PolicyFactory|StrategyRegistry|Provider|Adapter|UseCase|Port)\b/gu) ?? []))]
  const detected = classification.weight === 'SMALL' && names.length > 0
  return {
    detected,
    abstractions: names,
    detail: detected ? '局部请求引入了未经批准的额外抽象；应先复用现有 Service 或局部实现。' : '未发现与当前复杂度明显不匹配的命名抽象。',
  }
}

/** Returns risk signals that require reclassification instead of silently continuing. */
export function escalationTriggers(): readonly string[] {
  return ['公共 API 变化', '数据模型或迁移变化', '安全/权限边界变化', '架构边界变化', '跨模块影响', '破坏性兼容性变化', '范围或验收变化']
}
