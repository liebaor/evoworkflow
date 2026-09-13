import path from 'node:path'

import type {DiscoveryReport} from './scanner.js'
import {pathExists, writeTextIfMissing} from './io.js'
import {repositoryPaths} from './paths.js'
import {scanRepository} from './scanner.js'
import {readTemplate, renderTemplate} from './templates.js'

export interface InitializationAction {
  readonly path: string
  readonly outcome: 'create' | 'preserve'
  readonly reason: string
}

export interface InitializationPlan {
  readonly report: DiscoveryReport
  readonly actions: readonly InitializationAction[]
}

export interface InitializationResult {
  readonly report: DiscoveryReport
  readonly actions: readonly AppliedInitializationAction[]
}

export interface AppliedInitializationAction {
  readonly path: string
  readonly outcome: 'created' | 'preserved'
  readonly reason: string
}

/** Produces a read-only initialization report and exact write plan. */
export async function planInitialization(root: string): Promise<InitializationPlan> {
  const report = await scanRepository(root)
  const paths = repositoryPaths(root)
  const candidates: Array<[string, string]> = [
    [paths.agents, 'Standing orders for agents; existing instructions remain authoritative. / Agent 常驻规则；已有指令仍然是权威。'],
    [paths.config, 'Deterministic EVOworkflow configuration. / 确定性的 EVOworkflow 配置。'],
    [paths.project, 'Observed project map and authority links. / 观察到的项目地图和权威链接。'],
    [paths.state, 'Machine-readable workflow state. / 机器可读的工作流状态。'],
  ]
  const actions = await Promise.all(candidates.map(async ([target, reason]) => ({
    path: path.relative(paths.root, target),
    outcome: await pathExists(target) ? 'preserve' as const : 'create' as const,
    reason,
  })))
  return {report, actions}
}

/** Applies the non-destructive initialization plan and preserves every existing file. */
export async function applyInitialization(plan: InitializationPlan): Promise<InitializationResult> {
  const {report} = plan
  const paths = repositoryPaths(report.root)
  const values = {
    PROJECT_NAME: report.projectName,
    PROJECT_MODE: report.mode,
    NOW: report.generatedAt,
    CONFIDENCE: report.confidence,
    FILES_SCANNED: String(report.filesScanned),
    AUTHORITIES: formatAuthorities(report),
    TECHNOLOGIES: formatTechnologies(report),
    COMMANDS: formatCommands(report),
    CAPABILITIES: formatEvidenceList(report.capabilities, 'No reusable capability was confirmed.'),
    REFERENCES: formatSimpleList(report.references, 'No reference implementation was confirmed.'),
    UNKNOWNS: report.unknowns.length > 0 ? report.unknowns.map((item) => `- ${formatUnknown(item)}`).join('\n') : 'No initialization unknowns were recorded. / 初始化没有记录未知项。',
  }
  const files: Array<[string, string, string]> = [
    [paths.agents, 'project/AGENTS.md', 'Standing orders for agents; existing instructions remain authoritative. / Agent 常驻规则；已有指令仍然是权威。'],
    [paths.config, 'project/.evo/config.yml', 'Deterministic EVOworkflow configuration. / 确定性的 EVOworkflow 配置。'],
    [paths.project, 'project/.evo/project.md', 'Observed project map and authority links. / 观察到的项目地图和权威链接。'],
    [paths.state, 'project/.evo/state.yml', 'Machine-readable workflow state. / 机器可读的工作流状态。'],
  ]
  const actions = []
  for (const [target, templatePath, reason] of files) {
    const template = await readTemplate(templatePath)
    const outcome = await writeTextIfMissing(target, renderTemplate(template, values))
    actions.push({path: path.relative(paths.root, target), outcome, reason})
  }
  return {report, actions}
}

/** Renders the human-readable report used by the CLI and approval review. */
export function formatInitializationPlan(plan: InitializationPlan): string {
  const {report} = plan
  const lines = [
    `Repository: ${report.root} / 仓库：${report.root}`,
    `Mode: ${report.mode} / 模式：${report.mode}`,
    `Discovery confidence: ${report.confidence} / 发现置信度：${report.confidence}`,
    `Files inspected: ${report.filesScanned}${report.truncated ? ' (scan limit reached / 已达到扫描上限)' : ''} / 已检查文件：${report.filesScanned}`,
    '',
    'Technology evidence / 技术证据:',
    ...plainEvidence(report.languages, report.frameworks),
    '',
    'Operating paths / 运行入口:',
    ...(report.commands.length > 0
      ? report.commands.map((item) => `- ${item.purpose}: ${item.command} (${item.evidence})`)
      : ['- none confirmed']),
    '',
    'Reusable capabilities / 可复用能力:',
    ...(report.capabilities.length > 0
      ? report.capabilities.map((item) => `- ${item.name}: ${item.evidence.join(', ')}`)
      : ['- none confirmed']),
    '',
    'Unknowns / 未知项:',
    ...(report.unknowns.length > 0 ? report.unknowns.map((item) => `- ${formatUnknown(item)}`) : ['- none recorded / 暂无记录']),
    '',
    'Initialization writes / 初始化写入:',
    ...plan.actions.map((action) => `- ${action.outcome}: ${action.path} — ${action.reason}`),
  ]
  return lines.join('\n')
}

function formatAuthorities(report: DiscoveryReport): string {
  if (report.authorities.length === 0) return 'No primary authority document was confirmed during initialization.'
  return [
    '| Topic | Primary authority | Basis |',
    '|---|---|---|',
    ...report.authorities.map((item) => `| ${escapeTable(item.topic)} | \`${item.path}\` | existing repository file |`),
  ].join('\n')
}

function formatTechnologies(report: DiscoveryReport): string {
  return formatEvidenceList([...report.languages, ...report.frameworks], 'No technology was confirmed.')
}

function formatCommands(report: DiscoveryReport): string {
  if (report.commands.length === 0) return 'No build, run, test, or observation entry path was confirmed.'
  return [
    '| Purpose | Command | Evidence |',
    '|---|---|---|',
    ...report.commands.map((item) => `| ${item.purpose} | \`${item.command}\` | ${escapeTable(item.evidence)} |`),
  ].join('\n')
}

function formatEvidenceList(items: readonly {readonly name: string; readonly evidence: readonly string[]}[], fallback: string): string {
  if (items.length === 0) return fallback
  return items.map((item) => `- **${item.name}:** ${item.evidence.map((value) => `\`${value}\``).join(', ')}`).join('\n')
}

function formatSimpleList(items: readonly string[], fallback: string): string {
  return items.length > 0 ? items.map((item) => `- ${item}`).join('\n') : fallback
}

function formatUnknown(value: string): string {
  const translations: Readonly<Record<string, string>> = {
    'Product requirements and foundation choice require human Decisions before bootstrap.': '产品需求和基础方案需要在初始化前由人工 Decision 确定。',
    'No framework could be confirmed from inspected metadata.': '从已检查的元数据中没有确认任何框架。',
    'No confirmed test entry path was found.': '没有找到已确认的测试入口。',
    'No confirmed application run entry path was found.': '没有找到已确认的应用运行入口。',
    'No explicit architecture authority document was found.': '没有找到明确的架构权威文档。',
    'No supported CI configuration was confirmed.': '没有确认受支持的 CI 配置。',
    'Repository scan reached its file limit; findings are incomplete.': '仓库扫描达到文件上限，发现结果不完整。',
  }
  return `${value}${translations[value] ? ` / ${translations[value]}` : ''}`
}

function plainEvidence(...groups: ReadonlyArray<readonly {readonly name: string; readonly evidence: readonly string[]}[]>): string[] {
  const items = groups.flat()
  return items.length > 0 ? items.map((item) => `- ${item.name}: ${item.evidence.join(', ')}`) : ['- none confirmed']
}

function escapeTable(value: string): string {
  return value.replaceAll('|', '\\|').replaceAll('\n', ' ')
}
