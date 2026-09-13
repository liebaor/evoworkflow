import {execFile as execFileCallback} from 'node:child_process'
import {promisify} from 'node:util'
import {readFile, readdir} from 'node:fs/promises'
import path from 'node:path'

import type {ChangeWeight} from '../core/schemas.js'
import {EvoError} from '../core/errors.js'
import {artifactPath, parseArtifactMetadata} from './artifacts.js'
import {pathExists, writeTextAtomic} from './io.js'
import {listDirectory, openManagedRepository, readOptionalText} from './managed.js'
import {parseMarkdownDocument} from './markdown.js'
import {repositoryPaths} from './paths.js'
import {scanRepository} from './scanner.js'
import {captureGitSnapshot} from './git-snapshot.js'

const execFile = promisify(execFileCallback)

export type WorkingContextReferenceKind = 'change' | 'authority' | 'decision' | 'reference' | 'test' | 'domain' | 'bug' | 'git'
export type ReferencePriority = 'exact' | 'domain' | 'technical' | 'framework' | 'supporting'

export interface WorkingContextReference {
  readonly kind: WorkingContextReferenceKind
  readonly path: string
  readonly priority: ReferencePriority
  readonly reason: string
}

export interface WorkingContextChange {
  readonly id: string
  readonly path: string
  readonly title: string
  readonly weight: ChangeWeight
  readonly status: string
}

export interface WorkingContextGit {
  readonly available: boolean
  readonly branch: string | null
  readonly head: string | null
  readonly treeFingerprint: string | null
  readonly changedPathsFingerprint: string | null
  readonly changedPaths: readonly string[]
  readonly recentCommits: readonly string[]
}

export interface WorkingContext {
  readonly schemaVersion: 1
  readonly root: string
  readonly generatedAt: string
  readonly change: WorkingContextChange | null
  readonly references: readonly WorkingContextReference[]
  readonly git: WorkingContextGit
  readonly unknowns: readonly string[]
}

export interface BuildWorkingContextOptions {
  readonly now?: Date
  readonly maximumReferences?: number
  readonly includeGit?: boolean
}

interface CandidateFile {
  readonly path: string
  readonly source: string
}

interface AuthorityRow {
  readonly topic: string
  readonly path: string
}

/** Builds task-specific paths and reasons without copying repository documents or source bodies. */
export async function buildWorkingContext(
  root: string,
  requestedChangeId?: string,
  options: BuildWorkingContextOptions = {},
): Promise<WorkingContext> {
  const managed = await openManagedRepository(root)
  const paths = repositoryPaths(root)
  const changeId = requestedChangeId ?? managed.state.activeChange
  if (requestedChangeId && managed.state.activeChange !== requestedChangeId) {
    throw new EvoError(`Change ${requestedChangeId} is not the active Change.`)
  }

  const report = await scanRepository(root)
  const candidates = await readCandidateFiles(paths.root)
  const references: WorkingContextReference[] = []
  const add = (reference: WorkingContextReference): void => {
    const index = references.findIndex((item) => item.kind === reference.kind && item.path === reference.path)
    if (index < 0) {
      references.push(reference)
      return
    }
    const existing = references[index]
    if (!existing) return
    references[index] = {
      ...existing,
      priority: higherPriority(existing.priority, reference.priority),
      reason: existing.reason.includes(reference.reason) ? existing.reason : `${existing.reason}；${reference.reason}`,
    }
  }

  let change: WorkingContextChange | null = null
  let keywords: readonly string[] = []
  if (changeId) {
    const changeTarget = artifactPath(root, changeId, 'change')
    const source = await readOptionalText(changeTarget)
    if (!source) throw new EvoError(`Active Change ${changeId} is missing change.md.`)
    const document = parseMarkdownDocument(source, changeTarget)
    const metadata = parseArtifactMetadata(document, 'change', changeId)
    const title = firstHeading(document.body) ?? changeId
    change = {
      id: changeId,
      path: relative(paths.root, changeTarget),
      title,
      weight: 'weight' in metadata ? metadata.weight : managed.config.workflow.defaultWeight,
      status: metadata.status,
    }
    keywords = extractKeywords(`${title}\n${document.body}`)
    add({kind: 'change', path: relative(paths.root, changeTarget), priority: 'exact', reason: '当前 Change 的已批准或待批准意图。'})
    for (const kind of ['spec', 'plan', 'evidence'] as const) {
      const target = path.join(paths.activeWork, changeId, `${kind}.md`)
      if (await pathExists(target)) {
        add({kind: 'change', path: relative(paths.root, target), priority: 'exact', reason: `当前 Change 的 ${kind} 工作材料。`})
      }
    }
  }

  const project = await readOptionalText(paths.project)
  const authorityRows = project ? parseAuthorityRows(project) : report.authorities
  if (await pathExists(paths.agents)) add({kind: 'authority', path: relative(paths.root, paths.agents), priority: 'supporting', reason: '仓库级 standing rules。'})
  for (const authority of authorityRows) {
    const target = path.resolve(paths.root, authority.path)
    if (!isInside(paths.root, target) || !(await pathExists(target))) continue
    const kind: WorkingContextReferenceKind = authority.topic === 'domain-language' ? 'domain' : 'authority'
    const priority: ReferencePriority = authority.topic === 'architecture' || authority.topic === 'api-contract' ? 'domain' : 'supporting'
    add({kind, path: relative(paths.root, target), priority, reason: `项目地图中的 ${authority.topic} 主权威。`})
  }
  if (await pathExists(paths.context)) add({kind: 'domain', path: relative(paths.root, paths.context), priority: 'domain', reason: '仓库领域词汇和术语主文档。'})

  await addDecisionReferences(paths, keywords, changeId, add)

  const referenceCandidates = rankCandidates(candidates.filter((item) => !item.path.startsWith('.evo/')), keywords, new Set(report.references), ['Controller', 'Router', 'Handler', 'Service', 'Mapper'])
  for (const candidate of referenceCandidates.slice(0, 8)) {
    const priority = isExactCandidate(candidate.path, keywords) ? 'exact' : candidate.score >= 4 ? 'domain' : 'technical'
    add({kind: 'reference', path: candidate.path, priority, reason: `与当前 Change 关键词和现有入口模式匹配（得分 ${candidate.score}）。`})
  }
  for (const capability of report.capabilities) {
    const evidence = capability.evidence[0]
    if (!evidence || !isInside(paths.root, path.resolve(paths.root, evidence))) continue
    add({kind: 'reference', path: evidence, priority: 'technical', reason: `现有 ${capability.name} 能力的证据路径。`})
  }

  const testCandidates = rankCandidates(candidates.filter((item) => isTestPath(item.path)), keywords, new Set(), [])
  for (const candidate of testCandidates.slice(0, 8)) {
    add({kind: 'test', path: candidate.path, priority: 'supporting', reason: `与当前 Change 关键词匹配的测试入口（得分 ${candidate.score}）。`})
  }

  const bugCandidates = rankCandidates(candidates.filter((item) => item.path.startsWith('.evo/work/completed/')), keywords, new Set(), [])
  for (const candidate of bugCandidates.filter((item) => candidateLooksLikeBug(item.path, item.source)).slice(0, 5)) {
    add({kind: 'bug', path: candidate.path, priority: 'domain', reason: `历史 Bug 记录与当前 Change 关键词相关（得分 ${candidate.score}）。`})
  }

  const includeGit = options.includeGit !== false
  const git = includeGit ? await readGitSnapshot(paths.root, references.map((item) => item.path)) : unavailableGit()
  if (git.available) {
    add({kind: 'git', path: '.git', priority: 'supporting', reason: '当前工作树状态和最近提交用于判断历史与未提交修改。'})
  }

  const maximumReferences = options.maximumReferences ?? 40
  const sortedReferences = references
    .sort(compareReferences)
    .slice(0, maximumReferences)
  const unknowns = [...new Set([
    ...(change ? [] : ['没有活动 Change；本次上下文只能提供仓库级地图。']),
    ...(authorityRows.length === 0 ? ['项目地图没有可路由的 Authority；需要人工确认主权威。'] : []),
    ...(git.available ? [] : ['Git 状态或历史不可读取；相关历史判断保持未知。']),
    ...report.unknowns.filter((item) => /(?:test|run|architecture|version|CI)/iu.test(item)),
  ])]

  return {
    schemaVersion: 1,
    root: paths.root,
    generatedAt: (options.now ?? new Date()).toISOString(),
    change,
    references: sortedReferences,
    git,
    unknowns,
  }
}

/** Returns the only intended write target for an explicit Working Context refresh. */
export function workingContextPath(root: string, changeId: string): string {
  if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/u.test(changeId)) throw new EvoError(`Invalid Change id: ${changeId}`)
  return path.join(repositoryPaths(root).activeWork, changeId, 'context.md')
}

/** Writes a rendered Working Context only when the caller explicitly requested the refresh. */
export async function writeWorkingContext(root: string, changeId: string, context: WorkingContext): Promise<string> {
  if (context.change?.id !== changeId) throw new EvoError(`Working Context does not belong to Change ${changeId}.`)
  const target = workingContextPath(root, changeId)
  await writeTextAtomic(target, formatWorkingContext(context))
  return relative(repositoryPaths(root).root, target)
}

/** Formats paths, reasons, and evidence boundaries for human review. */
export function formatWorkingContext(context: WorkingContext): string {
  const change = context.change
  return [
    '# Working Context / 当前工作上下文',
    '',
    `Repository / 仓库：${context.root}`,
    `Change / Change：${change?.id ?? 'none'}${change ? ` — ${change.title} (${change.weight}/${change.status})` : ''}`,
    `Generated / 生成时间：${context.generatedAt}`,
    '',
    '## References / 参考路径',
    '',
    '| Kind | Priority | Path | Why relevant |',
    '|---|---|---|---|',
    ...context.references.map((item) => `| ${item.kind} | ${item.priority} | \`${item.path}\` | ${item.reason} |`),
    '',
    '## Git / Git',
    '',
    `- Available / 可用：${context.git.available ? 'yes / 是' : 'no / 否'}`,
    `- Branch / 分支：${context.git.branch ?? 'unknown / 未知'}`,
    `- HEAD / 提交：${context.git.head ?? 'unknown / 未知'}`,
    `- Tree fingerprint / 工作树指纹：${context.git.treeFingerprint ?? 'unknown / 未知'}`,
    `- Changed paths / 修改路径：${context.git.changedPaths.length > 0 ? context.git.changedPaths.map((item) => `\`${item}\``).join(', ') : 'none / 无'}`,
    `- Recent commits / 最近提交：${context.git.recentCommits.length > 0 ? context.git.recentCommits.join('；') : 'none / 无'}`,
    '',
    '## Unknowns / 未知项',
    '',
    ...(context.unknowns.length > 0 ? context.unknowns.map((item) => `- ${item}`) : ['- none / 无']),
  ].join('\n')
}

async function addDecisionReferences(
  paths: ReturnType<typeof repositoryPaths>,
  keywords: readonly string[],
  changeId: string | null,
  add: (reference: WorkingContextReference) => void,
): Promise<void> {
  for (const [directory, status] of [[paths.currentDecisions, 'current'], [paths.workingDecisions, 'working']] as const) {
    for (const filename of await listDirectory(directory)) {
      if (!filename.endsWith('.md')) continue
      const target = path.join(directory, filename)
      const source = await readOptionalText(target)
      if (!source) continue
      const document = parseMarkdownDocument(source, target)
      const decisionChange = typeof document.data.change === 'string' ? document.data.change : null
      const score = scoreText(`${filename}\n${document.body}`, keywords)
      if (status === 'working' && decisionChange !== changeId && score === 0) continue
      add({
        kind: 'decision',
        path: relative(paths.root, target),
        priority: decisionChange === changeId ? 'exact' : status === 'current' ? 'domain' : 'supporting',
        reason: decisionChange === changeId ? '当前 Change 关联的 Decision。' : `生命周期为 ${status} 且与任务词汇相关。`,
      })
    }
  }
}

async function readCandidateFiles(root: string): Promise<CandidateFile[]> {
  const completedWork = path.join(root, '.evo', 'work', 'completed')
  const [sourceFiles, completedFiles] = await Promise.all([
    collectFiles(root),
    collectFiles(completedWork, root),
  ])
  const files = [...new Set([...sourceFiles, ...completedFiles])]
  const selected = files.filter((file) => isCandidateSource(file) || isTestPath(file) || file.startsWith('.evo/work/completed/'))
  const entries = await Promise.all(selected.slice(0, 1600).map(async (file): Promise<CandidateFile | null> => {
    try {
      return {path: file, source: (await readFile(path.join(root, file), 'utf8')).slice(0, 80_000)}
    } catch {
      return null
    }
  }))
  return entries.filter((item): item is CandidateFile => item !== null)
}

async function collectFiles(root: string, relativeRoot = root): Promise<string[]> {
  const ignored = new Set(['.git', 'node_modules', 'dist', 'lib', 'build', 'target', 'coverage', '.next', '.umi', '.umi-production', '__pycache__'])
  const pending = [root]
  const files: string[] = []
  try {
    while (pending.length > 0) {
      const current = pending.pop()
      if (!current) continue
      const entries = await readdir(current, {withFileTypes: true})
      entries.sort((left, right) => left.name.localeCompare(right.name))
      for (const entry of entries) {
        if (entry.name === '.evo' && current === root) continue
        if (entry.name === '.git') continue
        const target = path.join(current, entry.name)
        if (entry.isDirectory()) {
          if (!ignored.has(entry.name)) pending.push(target)
        } else if (entry.isFile()) {
          files.push(relative(relativeRoot, target))
        }
      }
    }
  } catch (error) {
    if (error instanceof Error && 'code' in error && (error as NodeJS.ErrnoException).code === 'ENOENT') return []
    throw error
  }
  return files.sort()
}

interface RankedCandidate extends CandidateFile {
  readonly score: number
}

function rankCandidates(
  candidates: readonly CandidateFile[],
  keywords: readonly string[],
  scannerReferences: ReadonlySet<string>,
  conventionalNames: readonly string[],
): RankedCandidate[] {
  return candidates.map((candidate) => {
    let score = scoreText(`${candidate.path}\n${candidate.source}`, keywords)
    if (scannerReferences.has(candidate.path)) score += 8
    if (conventionalNames.some((name) => path.basename(candidate.path).includes(name))) score += 2
    if (candidate.path.startsWith('src/main/') || candidate.path.startsWith('app/')) score += 1
    return {...candidate, score}
  }).filter((candidate) => candidate.score > 0).sort((left, right) => right.score - left.score || left.path.localeCompare(right.path))
}

function extractKeywords(source: string): string[] {
  const expanded = source.replace(/([a-z])([A-Z])/gu, '$1 $2')
  const stopWords = new Set(['the', 'and', 'for', 'with', 'from', 'this', 'that', 'must', 'should', 'change', 'current', 'approved', 'behavior', '要求', '新增', '实现', '一个', '进行'])
  return [...new Set((expanded.toLowerCase().match(/[a-z][a-z0-9_-]{2,}|[\u4e00-\u9fff]{2,}/gu) ?? []).filter((item) => !stopWords.has(item)))].slice(0, 40)
}

function scoreText(source: string, keywords: readonly string[]): number {
  const lower = source.toLowerCase()
  return keywords.reduce((score, keyword) => score + (lower.includes(keyword) ? 1 : 0), 0)
}

function isExactCandidate(candidatePath: string, keywords: readonly string[]): boolean {
  const name = path.basename(candidatePath).toLowerCase()
  return keywords.some((keyword) => keyword.length >= 4 && name.includes(keyword))
}

function firstHeading(source: string): string | null {
  return /^#\s+(.+?)\s*$/mu.exec(source)?.[1]?.trim() ?? null
}

function parseAuthorityRows(source: string): AuthorityRow[] {
  const section = /^## Authority map\s*$([\s\S]*?)(?=^##\s|(?![\s\S]))/mu.exec(source)?.[1] ?? ''
  return [...section.matchAll(/^\|\s*([^|]+?)\s*\|\s*`([^`]+)`\s*\|/gmu)]
    .map((match) => ({topic: match[1]?.trim() ?? '', path: match[2]?.trim() ?? ''}))
    .filter((item) => item.topic !== 'Topic' && item.path.length > 0)
}

async function readGitSnapshot(root: string, relevantPaths: readonly string[]): Promise<WorkingContextGit> {
  try {
    const snapshot = await captureGitSnapshot(root)
    if (snapshot.head === null && snapshot.branch === null && snapshot.changedPaths.length === 0) return unavailableGit()
    const historyArgs = relevantPaths.length > 0
      ? ['log', '-n', '5', '--format=%h %s', '--', ...relevantPaths.slice(0, 12)]
      : ['log', '-n', '5', '--format=%h %s']
    const logResult = await execFile('git', historyArgs, {cwd: root, timeout: 5000, maxBuffer: 100_000})
    const recentCommits = String(logResult.stdout).split(/\r?\n/u).map((line) => line.trim()).filter(Boolean)
    return {available: true, branch: snapshot.branch, head: snapshot.head, treeFingerprint: snapshot.treeFingerprint, changedPathsFingerprint: snapshot.changedPathsFingerprint, changedPaths: snapshot.changedPaths, recentCommits}
  } catch {
    return unavailableGit()
  }
}

function unavailableGit(): WorkingContextGit {
  return {available: false, branch: null, head: null, treeFingerprint: null, changedPathsFingerprint: null, changedPaths: [], recentCommits: []}
}

function compareReferences(left: WorkingContextReference, right: WorkingContextReference): number {
  const kindOrder: Readonly<Record<WorkingContextReferenceKind, number>> = {change: 0, authority: 1, decision: 2, domain: 3, reference: 4, test: 5, bug: 6, git: 7}
  const priorityOrder: Readonly<Record<ReferencePriority, number>> = {exact: 0, domain: 1, technical: 2, framework: 3, supporting: 4}
  return kindOrder[left.kind] - kindOrder[right.kind] || priorityOrder[left.priority] - priorityOrder[right.priority] || left.path.localeCompare(right.path) || left.reason.localeCompare(right.reason)
}

function higherPriority(left: ReferencePriority, right: ReferencePriority): ReferencePriority {
  const order: Readonly<Record<ReferencePriority, number>> = {exact: 0, domain: 1, technical: 2, framework: 3, supporting: 4}
  return order[left] <= order[right] ? left : right
}

function candidateLooksLikeBug(candidatePath: string, source: string): boolean {
  return candidatePath.endsWith('/bug.md') || /##\s+(?:Root cause|Observed behavior|Reproduction)/iu.test(source)
}

function isCandidateSource(file: string): boolean {
  return ['.c', '.cpp', '.cs', '.go', '.java', '.js', '.jsx', '.kt', '.php', '.py', '.rb', '.rs', '.ts', '.tsx', '.vue'].includes(path.extname(file).toLowerCase())
}

function isTestPath(file: string): boolean {
  const lower = file.toLowerCase()
  return /(?:^|\/)(?:test|tests|__tests__)(?:\/|$)/u.test(lower) || /(?:\.test|\.spec)\.[^.]+$/u.test(lower)
}

function relative(root: string, target: string): string {
  return path.relative(root, target).split(path.sep).join('/')
}

function isInside(root: string, target: string): boolean {
  const relativeTarget = path.relative(root, target)
  return relativeTarget === '' || (!relativeTarget.startsWith('..') && !path.isAbsolute(relativeTarget))
}
