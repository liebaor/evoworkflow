import {createHash} from 'node:crypto'
import path from 'node:path'

import type {
  ConstraintSource,
  ConstraintSourceKind,
  ConstraintType,
  ResolvedConstraint,
  ResolvedConstraintsDocument,
} from '../core/schemas.js'
import {ResolvedConstraintsDocumentSchema, ResolvedConstraintSchema} from '../core/schemas.js'
import {EvoError} from '../core/errors.js'
import {artifactPath, parseArtifactMetadata} from './artifacts.js'
import {fingerprintInputs, constraintInputPaths, compareFingerprint} from './freshness.js'
import {pathExists, readYaml, writeYaml} from './io.js'
import {listDirectory, openManagedRepository, readOptionalText} from './managed.js'
import {parseMarkdownDocument} from './markdown.js'
import {repositoryPaths} from './paths.js'
import {scanRepository} from './scanner.js'
import type {WorkingContext} from './working-context.js'

export interface ConstraintCandidate {
  readonly type: ConstraintType
  readonly topic: string
  readonly statement: string
  readonly source: ConstraintSource
  readonly scope: string
  readonly evidence?: readonly string[]
  readonly confidence?: number
}

export interface ResolveConstraintsOptions {
  readonly now?: Date
  readonly workingContext?: WorkingContext
  readonly persist?: boolean
}

export interface ConstraintResolution {
  readonly document: ResolvedConstraintsDocument
  readonly constraints: readonly ResolvedConstraint[]
  readonly inputFingerprint: string
  readonly inputs: readonly string[]
  readonly status: ResolvedConstraintsDocument['freshness']
}

const sourceRank: Record<ConstraintSourceKind, number> = {
  DECISION: 6,
  AUTHORITY: 5,
  CONTRACT: 4,
  PROJECT_MAP: 3,
  REPRESENTATIVE_CODE: 2,
  INFERENCE: 1,
}

/** Resolves candidates using the declared authority order without silently choosing conflicts. */
export function resolveConstraintCandidates(candidates: readonly ConstraintCandidate[]): ResolvedConstraint[] {
  const normalized = candidates.map(normalizeCandidate)
  const groups = new Map<string, ConstraintCandidate[]>()
  for (const candidate of normalized) {
    const key = normalizeTopic(candidate.topic)
    const values = groups.get(key) ?? []
    values.push(candidate)
    groups.set(key, values)
  }

  const resolved: ResolvedConstraint[] = []
  for (const [topic, values] of groups) {
    const unique = [...new Map(values.map((value) => [`${normalizeStatement(value.statement)}|${value.source.kind}|${value.source.path}`, value])).values()]
    const hardStatements = [...new Set(unique.filter((value) => value.type === 'HARD').map((value) => normalizeStatement(value.statement)))]
    if (hardStatements.length > 1) {
      const evidence = [...new Set(unique.flatMap((value) => [value.source.path, ...(value.evidence ?? [])]))].sort()
      resolved.push(makeConstraint({
        type: 'CONFLICT',
        topic,
        statement: `Conflicting HARD constraints: ${unique.filter((value) => value.type === 'HARD').map((value) => value.statement).join(' | ')}`,
        source: {kind: 'AUTHORITY', path: evidence[0] ?? 'unknown'},
        scope: unique.map((value) => value.scope).join('; '),
        evidence,
      }))
      continue
    }

    const byStatement = new Map<string, ConstraintCandidate[]>()
    for (const candidate of unique) {
      const key = normalizeStatement(candidate.statement)
      const same = byStatement.get(key) ?? []
      same.push(candidate)
      byStatement.set(key, same)
    }
    for (const statementCandidates of byStatement.values()) {
      const chosen = [...statementCandidates].sort(compareCandidates)[0]
      if (!chosen) continue
      const evidence = [...new Set(statementCandidates.flatMap((value) => [value.source.path, ...(value.evidence ?? [])]))].sort()
      resolved.push(makeConstraint({...chosen, evidence}))
    }
  }
  return resolved.sort((left, right) => left.topic.localeCompare(right.topic) || left.id.localeCompare(right.id))
}

/** Builds the current task's minimal, traceable, disposable engineering constraints view. */
export async function resolveEngineeringConstraints(
  root: string,
  changeId: string,
  options: ResolveConstraintsOptions = {},
): Promise<ConstraintResolution> {
  const managed = await openManagedRepository(root)
  if (managed.state.activeChange !== changeId) throw new EvoError(`Change ${changeId} is not the active Change.`)
  const paths = repositoryPaths(root)
  const context = options.workingContext
  const candidates: ConstraintCandidate[] = []

  const changeTarget = artifactPath(root, changeId, 'change')
  const changeSource = await readOptionalText(changeTarget)
  if (!changeSource) throw new EvoError(`Active Change ${changeId} is missing change.md.`)
  const changeDocument = parseMarkdownDocument(changeSource, changeTarget)
  const changeMetadata = parseArtifactMetadata(changeDocument, 'change', changeId)
  const contractType: ConstraintType = changeMetadata.status === 'APPROVED' ? 'HARD' : 'UNKNOWN'
  for (const line of contractLines(changeDocument.body)) {
    candidates.push(candidate('CONTRACT', relative(paths.root, changeTarget), contractType, contractTopic(line), line, `Change ${changeId}`, [relative(paths.root, changeTarget)]))
  }

  const agentsSource = await readOptionalText(paths.agents)
  if (agentsSource) {
    for (const line of standingRuleLines(agentsSource).slice(0, 24)) {
      // Each standing rule is an independent obligation unless a higher-level
      // authority explicitly gives it a shared topic. This avoids treating two
      // compatible rules as contradictory merely because both came from AGENTS.
      candidates.push(candidate('AUTHORITY', 'AGENTS.md', 'HARD', standingRuleTopic(line), line, 'Repository-wide standing rules', ['AGENTS.md']))
    }
  }

  const projectSource = await readOptionalText(paths.project)
  if (projectSource) {
    for (const row of parseAuthorityRows(projectSource)) {
      candidates.push(candidate('PROJECT_MAP', relative(paths.root, paths.project), 'REFERENCE', row.topic, `Use ${row.path} as the primary authority for ${row.topic}.`, `Change ${changeId}`, [relative(paths.root, paths.project), row.path]))
    }
  }

  await addDecisionCandidates(paths, changeId, context, candidates)

  const report = await scanRepository(root)
  // Use the scanner's stable top-level reference set for the derived input
  // graph. Working Context may rank more paths for a particular invocation,
  // but that ranking is disposable and must not rewrite an equivalent
  // constraints view (which would unnecessarily stale existing Evidence).
  for (const referencePath of report.references) {
    candidates.push(candidate('REPRESENTATIVE_CODE', referencePath, 'REFERENCE', topicFromPath(referencePath), `Follow the existing pattern at ${referencePath}.`, `Change ${changeId}`, [referencePath]))
  }
  for (const unknown of context?.unknowns ?? report.unknowns) {
    if (/(?:test|run|architecture|version|CI)/iu.test(unknown)) {
      candidates.push(candidate('INFERENCE', 'scanner', 'UNKNOWN', `runtime/${unknownTopic(unknown)}`, unknown, `Change ${changeId}`, ['.evo/project.md']))
    }
  }

  const referencePaths = [...new Set(candidates.flatMap((item) => item.evidence ?? []).filter((item) => item !== 'scanner'))]
  const inputs = await constraintInputPaths(root, changeId, referencePaths)
  const fingerprint = (await fingerprintInputs(root, inputs)).fingerprint
  const constraints = resolveConstraintCandidates(candidates)
  const status = constraints.some((item) => item.type === 'CONFLICT') ? 'CONFLICT' : 'CURRENT'
  const document: ResolvedConstraintsDocument = ResolvedConstraintsDocumentSchema.parse({
    schemaVersion: 1,
    change: changeId,
    generatedAt: (options.now ?? new Date()).toISOString(),
    inputFingerprint: fingerprint,
    inputs,
    freshness: status,
    constraints,
  })
  if (options.persist) {
    const target = constraintsPath(root, changeId)
    const existing = await readResolvedConstraints(root, changeId)
    const equivalent = existing?.inputFingerprint === fingerprint && JSON.stringify(existing.constraints) === JSON.stringify(document.constraints)
    if (!equivalent) await writeYaml(target, document)
  }
  return {document, constraints, inputFingerprint: fingerprint, inputs, status}
}

/** Reads the persisted derived view; absence is a normal preflight condition. */
export async function readResolvedConstraints(root: string, changeId: string): Promise<ResolvedConstraintsDocument | null> {
  const target = constraintsPath(root, changeId)
  return await pathExists(target) ? readYaml(target, ResolvedConstraintsDocumentSchema) : null
}

/** Rebuilds or inspects the persisted view's freshness without changing it. */
export async function inspectConstraintsFreshness(root: string, changeId: string, now = new Date()): Promise<ResolvedConstraintsDocument | null> {
  const stored = await readResolvedConstraints(root, changeId)
  if (!stored) return null
  const current = await fingerprintInputs(root, stored.inputs)
  const freshness = compareFingerprint(stored.inputFingerprint, current)
  return {...stored, generatedAt: now.toISOString(), freshness}
}

/** Resolves the safe path for the derived constraints artifact. */
export function constraintsPath(root: string, changeId: string): string {
  if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/u.test(changeId)) throw new EvoError(`Invalid Change id: ${changeId}`)
  return path.join(repositoryPaths(root).activeWork, changeId, 'constraints.yml')
}

/** Formats only references and statements, never a copied Authority body. */
export function formatConstraints(resolution: ConstraintResolution | ResolvedConstraintsDocument): string {
  const document = 'document' in resolution ? resolution.document : resolution
  return [
    `Constraints / 工程约束：${document.freshness}`,
    `Input fingerprint / 输入指纹：${document.inputFingerprint}`,
    ...document.constraints.map((item) => `${item.type} ${item.topic}: ${item.statement} [${item.source.kind}:${item.source.path}]`),
    ...(document.constraints.length === 0 ? ['- none / 无'] : []),
  ].join('\n')
}

function candidate(
  kind: ConstraintSourceKind,
  sourcePath: string,
  type: ConstraintType,
  topic: string,
  statement: string,
  scope: string,
  evidence: readonly string[],
): ConstraintCandidate {
  return {type, topic, statement: statement.trim(), source: {kind, path: sourcePath}, scope, evidence}
}

function normalizeCandidate(candidateValue: ConstraintCandidate): ConstraintCandidate {
  let type = candidateValue.type
  if (candidateValue.source.kind === 'REPRESENTATIVE_CODE' && type === 'HARD') type = 'REFERENCE'
  if (candidateValue.source.kind === 'INFERENCE' && type === 'HARD') type = 'SOFT'
  if (type === 'SOFT' && candidateValue.confidence === undefined) return {...candidateValue, type, confidence: 0.5}
  return {...candidateValue, type}
}

function makeConstraint(candidateValue: ConstraintCandidate): ResolvedConstraint {
  const source = candidateValue.source
  const payload = {
    type: candidateValue.type,
    topic: normalizeTopic(candidateValue.topic),
    statement: candidateValue.statement.trim(),
    source,
    scope: candidateValue.scope.trim(),
    evidence: [...new Set(candidateValue.evidence ?? [source.path])].sort(),
    ...(candidateValue.confidence === undefined ? {} : {confidence: candidateValue.confidence}),
  }
  const fingerprint = createHash('sha256').update(JSON.stringify(payload)).digest('hex')
  const id = `C-${fingerprint.slice(0, 16)}`
  return ResolvedConstraintSchema.parse({id, ...payload, fingerprint})
}

function compareCandidates(left: ConstraintCandidate, right: ConstraintCandidate): number {
  return sourceRank[right.source.kind] - sourceRank[left.source.kind]
    || right.statement.length - left.statement.length
    || left.source.path.localeCompare(right.source.path)
}

function contractLines(body: string): string[] {
  const lines = body.split('\n').map((line) => line.trim()).filter(Boolean)
  const selected: string[] = []
  let section = ''
  for (const line of lines) {
    if (line.startsWith('#')) {
      section = line.replace(/^#+\s*/u, '').toLowerCase()
      continue
    }
    if (/(?:scope|non-goal|rules|acceptance|boundary|architectural position|goal)/iu.test(section) || /\bAC-[A-Za-z0-9]/u.test(line)) {
      if (/^(?:[-*]|\d+\.)\s+/u.test(line) || /\bAC-[A-Za-z0-9]/u.test(line)) selected.push(line.replace(/^[-*]\s+/u, '').trim())
    }
  }
  return [...new Set(selected)].slice(0, 80)
}

function standingRuleLines(source: string): string[] {
  return [...new Set(source.split('\n').map((line) => line.trim()).filter((line) => {
    if (!line || line.startsWith('#')) return false
    return /^(?:[-*]|\d+\.)\s+/.test(line) || /(?:must|不得|禁止|只在|优先|保持|不能)/iu.test(line)
  }).map((line) => line.replace(/^[-*]\s+/u, '').trim()))]
}

async function addDecisionCandidates(
  paths: ReturnType<typeof repositoryPaths>,
  changeId: string,
  context: WorkingContext | undefined,
  candidates: ConstraintCandidate[],
): Promise<void> {
  for (const directory of [paths.currentDecisions, paths.workingDecisions]) {
    for (const filename of (await listDirectory(directory)).filter((item) => item.endsWith('.md'))) {
      const target = path.join(directory, filename)
      const source = await readOptionalText(target)
      if (!source) continue
      const document = parseMarkdownDocument(source, target)
      const linkedChange = typeof document.data.change === 'string' ? document.data.change : null
      const relevant = linkedChange === changeId || linkedChange === null || context?.references.some((item) => item.path === relative(paths.root, target))
      if (!relevant) continue
      const statement = decisionStatement(document.body)
      if (!statement) continue
      candidates.push(candidate('DECISION', relative(paths.root, target), 'HARD', decisionTopic(filename, statement), statement, `Decision ${filename}`, [relative(paths.root, target)]))
    }
  }
}

function decisionStatement(body: string): string | null {
  const section = /^##\s+Decision[^\n]*\n([\s\S]*?)(?=^##\s|(?![\s\S]))/imu.exec(body)?.[1]
  const source = section ?? body.split('\n').filter((line) => line.trim() && !line.startsWith('#')).slice(0, 3).join(' ')
  const statement = source.replace(/^[-*]\s+/gmu, '').replace(/\s+/gu, ' ').trim()
  return statement.length > 0 ? statement.slice(0, 500) : null
}

function parseAuthorityRows(source: string): Array<{topic: string; path: string}> {
  const section = /^## Authority map\s*$([\s\S]*?)(?=^##\s|(?![\s\S]))/mu.exec(source)?.[1] ?? ''
  return [...section.matchAll(/^\|\s*([^|]+?)\s*\|\s*`([^`]+)`\s*\|/gmu)]
    .map((match) => ({topic: match[1]?.trim() ?? '', path: match[2]?.trim() ?? ''}))
    .filter((item) => item.topic !== 'Topic' && item.path.length > 0)
}

function contractTopic(line: string): string {
    const id = /\b(AC-[A-Za-z0-9][A-Za-z0-9_-]*(?:\.[A-Za-z0-9][A-Za-z0-9_-]*)*)\b/u.exec(line)?.[1]
  if (id) return id.toLowerCase()
  const known = ['pagination', 'response', 'permission', 'data-scope', 'datascope', 'authentication', 'logging', 'api', 'database', 'dependency']
  const knownTopic = known.find((item) => line.toLowerCase().includes(item))
  if (knownTopic) return knownTopic
  const prefix = /(?:non-goal|not|禁止|不做)/iu.test(line) ? 'scope/non-goal' : 'scope'
  return `${prefix}/${createHash('sha256').update(normalizeStatement(line)).digest('hex').slice(0, 12)}`
}

function topicFromPath(value: string): string {
  return value.replace(/\\/gu, '/').split('/').pop()?.replace(/\.[^.]+$/u, '').toLowerCase() || 'reference'
}

function decisionTopic(filename: string, statement: string): string {
  const lower = statement.toLowerCase()
  const known = ['pagination', 'response', 'permission', 'data-scope', 'datascope', 'authentication', 'logging', 'api', 'database', 'dependency']
  const match = known.find((item) => lower.includes(item))
  return match ?? topicFromPath(filename)
}

function unknownTopic(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/gu, '-').slice(0, 80) || 'runtime'
}

function standingRuleTopic(value: string): string {
  return `repository-rule-${createHash('sha256').update(value).digest('hex').slice(0, 12)}`
}

function normalizeTopic(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/gu, '-')
}

function normalizeStatement(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/gu, ' ')
}

function relative(root: string, target: string): string {
  return path.relative(path.resolve(root), path.resolve(target)).split(path.sep).join('/')
}
