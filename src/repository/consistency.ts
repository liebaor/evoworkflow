import {readFile} from 'node:fs/promises'
import path from 'node:path'

import {scanRepository, type DiscoveryReport} from './scanner.js'

export type ConsistencyFindingCode = 'CONSISTENCY_DRIFT' | 'PARALLEL_MECHANISM' | 'NAMING_DRIFT' | 'BLAST_RADIUS_EXPANDED' | 'PREMATURE_ABSTRACTION'
export type ConsistencySeverity = 'info' | 'warning'

export interface ConsistencyObservation {
  readonly category: 'response' | 'permission' | 'pagination' | 'logging' | 'export' | 'architecture' | 'testing'
  readonly mechanism: string
  readonly evidence: readonly string[]
}

export interface ConsistencyFinding {
  readonly code: ConsistencyFindingCode
  readonly severity: ConsistencySeverity
  readonly detail: string
  readonly evidence: readonly string[]
  readonly recommendation: string
}

export interface ConsistencyAnalysisInput {
  readonly changedPaths?: readonly string[]
  readonly expectedAreas?: readonly string[]
  readonly proposedText?: string
  readonly proposedNames?: readonly string[]
  readonly humanApprovedConventionChange?: boolean
}

export interface ConsistencyReport {
  readonly root: string
  readonly observations: readonly ConsistencyObservation[]
  readonly findings: readonly ConsistencyFinding[]
  readonly expectedAreas: readonly string[]
  readonly actualAreas: readonly string[]
  readonly referenceImplementations: readonly string[]
}

interface MechanismPattern {
  readonly category: ConsistencyObservation['category']
  readonly mechanism: string
  readonly pattern: RegExp
  readonly capability: string | null
}

const mechanismPatterns: readonly MechanismPattern[] = [
  {category: 'response', mechanism: 'AjaxResult', pattern: /\bAjaxResult\b/u, capability: 'standard response'},
  {category: 'response', mechanism: 'ApiResponse', pattern: /\bApiResponse\b/u, capability: 'standard response'},
  {category: 'response', mechanism: 'Result<T>', pattern: /\bResult\s*<[^>]+>/u, capability: null},
  {category: 'permission', mechanism: '@PreAuthorize', pattern: /@PreAuthorize\s*\(/u, capability: 'authorization'},
  {category: 'permission', mechanism: 'DataScope', pattern: /\bDataScope\b/u, capability: 'data permission'},
  {category: 'pagination', mechanism: 'startPage', pattern: /\bstartPage\s*\(/u, capability: 'pagination'},
  {category: 'logging', mechanism: '@Log', pattern: /@Log\s*\(/u, capability: 'audit logging'},
  {category: 'export', mechanism: 'ExcelUtil', pattern: /\bExcelUtil\b/u, capability: 'export'},
]

/** Compares proposed Change signals with actual repository mechanisms without making architectural decisions. */
export async function analyzeRepositoryConsistency(root: string, input: ConsistencyAnalysisInput = {}): Promise<ConsistencyReport> {
  const resolvedRoot = path.resolve(root)
  const report = await scanRepository(resolvedRoot)
  const sourceEntries = await readEvidenceSources(resolvedRoot, report, input.changedPaths ?? [])
  const observations = collectObservations(sourceEntries)
  const proposedText = input.proposedText ?? ''
  const findings: ConsistencyFinding[] = []
  const approved = input.humanApprovedConventionChange === true

  const responseMechanisms = observations.filter((item) => item.category === 'response').map((item) => item.mechanism)
  if (!approved && responseMechanisms.includes('AjaxResult') && /\b(?:ApiResponse|Result\s*<)/u.test(proposedText) && !/\bAjaxResult\b/u.test(proposedText)) {
    findings.push({
      code: 'CONSISTENCY_DRIFT',
      severity: 'warning',
      detail: 'CONSISTENCY DRIFT: 现有响应机制包含 AjaxResult，但提议文本引入了另一种响应类型。',
      evidence: evidenceFor(observations, 'response'),
      recommendation: '先复用现有响应机制；若确需改变，建立并批准新的 Decision 和迁移范围。',
    })
  }

  const permissionMechanisms = observations.filter((item) => item.category === 'permission').map((item) => item.mechanism)
  if (!approved && permissionMechanisms.length > 0 && /(?:PermissionMiddleware|AuthMiddleware|new\s+.*(?:permission|authorization)|权限中间件|新建权限)/iu.test(proposedText) && !permissionMechanisms.some((item) => proposedText.includes(item))) {
    findings.push({
      code: 'PARALLEL_MECHANISM',
      severity: 'warning',
      detail: 'PARALLEL MECHANISM: 现有权限机制之外出现新的权限 Middleware 候选。',
      evidence: evidenceFor(observations, 'permission'),
      recommendation: '复用现有权限/数据权限机制，或先取得明确的架构 Decision。',
    })
  }

  const namingFinding = namingDrift(report, input.proposedNames ?? [], sourceEntries)
  if (namingFinding) findings.push(namingFinding)

  const actualAreas = actualChangeAreas(input.changedPaths ?? [])
  const expectedAreas = normalizeAreas(input.expectedAreas ?? [])
  const expanded = actualAreas.filter((area) => !expectedAreas.includes(area) && !['docs', 'tests', 'config'].includes(area))
  if (expectedAreas.length > 0 && expanded.length > 0) {
    findings.push({
      code: 'BLAST_RADIUS_EXPANDED',
      severity: 'warning',
      detail: `BLAST RADIUS EXPANDED: 计划区域为 ${expectedAreas.join(', ')}，实际路径还涉及 ${expanded.join(', ')}。`,
      evidence: input.changedPaths ?? [],
      recommendation: '解释额外模块的必要性；无法解释时收敛 Change 范围或重新规划。',
    })
  }

  return {
    root: resolvedRoot,
    observations,
    findings: findings.sort((left, right) => left.code.localeCompare(right.code)),
    expectedAreas,
    actualAreas,
    referenceImplementations: report.references.slice(0, 10),
  }
}

/** Formats consistency findings for a model or human review without asserting they are defects. */
export function formatConsistencyReport(report: ConsistencyReport): string {
  return [
    '# Consistency analysis / 一致性分析',
    '',
    `Repository / 仓库：${report.root}`,
    '',
    '## Observations / 已观察机制',
    ...report.observations.map((item) => `- ${item.category}: ${item.mechanism} — ${item.evidence.map((evidence) => `\`${evidence}\``).join(', ')}`),
    ...(report.observations.length === 0 ? ['- none / 无'] : []),
    '',
    '## Findings / 候选问题',
    ...report.findings.map((item) => `- ${item.severity.toUpperCase()} ${item.code}: ${item.detail} Evidence: ${item.evidence.map((evidence) => `\`${evidence}\``).join(', ')}`),
    ...(report.findings.length === 0 ? ['- none / 无'] : []),
    '',
    `Expected areas / 计划区域：${report.expectedAreas.join(', ') || 'none / 无'}`,
    `Actual areas / 实际区域：${report.actualAreas.join(', ') || 'none / 无'}`,
    `References / 参考实现：${report.referenceImplementations.map((item) => `\`${item}\``).join(', ') || 'none / 无'}`,
  ].join('\n')
}

async function readEvidenceSources(root: string, report: DiscoveryReport, changedPaths: readonly string[]): Promise<ReadonlyMap<string, string>> {
  const changed = new Set(changedPaths.map((item) => normalizeRelative(root, item)))
  const paths = [...new Set([
    ...report.references,
    ...report.capabilities.flatMap((item) => item.evidence),
  ])].filter((item) => isSafeRelativePath(root, item) && !changed.has(normalizeRelative(root, item))).slice(0, 80)
  const entries = await Promise.all(paths.map(async (relativePath): Promise<readonly [string, string] | null> => {
    try {
      return [relativePath, await readFile(path.join(root, relativePath), 'utf8')] as const
    } catch {
      return null
    }
  }))
  return new Map(entries.filter((item): item is readonly [string, string] => item !== null))
}

function normalizeRelative(root: string, target: string): string {
  return path.relative(path.resolve(root), path.resolve(root, target)).split(path.sep).join('/')
}

function collectObservations(entries: ReadonlyMap<string, string>): ConsistencyObservation[] {
  return mechanismPatterns.flatMap((mechanism) => {
    const evidence = [...entries.entries()].filter(([, source]) => mechanism.pattern.test(source)).map(([file]) => file).sort().slice(0, 5)
    return evidence.length > 0 ? [{category: mechanism.category, mechanism: mechanism.mechanism, evidence}] : []
  })
}

function evidenceFor(observations: readonly ConsistencyObservation[], category: ConsistencyObservation['category']): string[] {
  return observations.filter((item) => item.category === category).flatMap((item) => item.evidence).slice(0, 8)
}

function namingDrift(
  report: DiscoveryReport,
  proposedNames: readonly string[],
  entries: ReadonlyMap<string, string>,
): ConsistencyFinding | null {
  if (proposedNames.length === 0) return null
  const existingNames = [...new Set([...report.references, ...entries.keys()].map((item) => path.basename(item)))]
  const suffixes = ['Controller', 'Router', 'Handler', 'Service', 'Mapper']
  const counts = new Map<string, number>()
  for (const name of existingNames) {
    const suffix = suffixes.find((candidate) => name.replace(/\.[^.]+$/u, '').endsWith(candidate))
    if (suffix) counts.set(suffix, (counts.get(suffix) ?? 0) + 1)
  }
  const dominant = [...counts.entries()].sort((left, right) => right[1] - left[1] || left[0].localeCompare(right[0]))[0]?.[0]
  if (!dominant) return null
  const drifted = proposedNames.filter((name) => suffixes.some((suffix) => name.endsWith(suffix)) && !name.endsWith(dominant))
  if (drifted.length === 0) return null
  return {
    code: 'NAMING_DRIFT',
    severity: 'warning',
    detail: `NAMING DRIFT: 现有代表性实现主要使用 ${dominant}，提议名称 ${drifted.join(', ')} 使用了不同后缀。`,
    evidence: existingNames.filter((name) => name.endsWith(dominant)).slice(0, 5),
    recommendation: '采用现有命名；若命名变化有明确理由，应在 Change/Decision 中说明。',
  }
}

function actualChangeAreas(paths: readonly string[]): string[] {
  return [...new Set(paths.map((item) => {
    const segments = item.replace(/^\.\//u, '').split('/').filter(Boolean)
    if (segments[0] === 'src' && segments[1]) return segments[1]
    return segments[0] ?? ''
  }).filter(Boolean))].sort()
}

function normalizeAreas(areas: readonly string[]): string[] {
  return [...new Set(areas.map((area) => area.replace(/^\.\//u, '').split('/').filter(Boolean)[0] ?? '').filter(Boolean))].sort()
}

function isSafeRelativePath(root: string, target: string): boolean {
  const resolved = path.resolve(root, target)
  const relativeTarget = path.relative(root, resolved)
  return !relativeTarget.startsWith('..') && !path.isAbsolute(relativeTarget)
}
