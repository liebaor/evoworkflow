import {readFile} from 'node:fs/promises'
import path from 'node:path'

import {
  AcceptanceTraceDocumentSchema,
  type AcceptanceTraceDocument,
  type AcceptanceTraceItem,
  type EvidenceRecord,
  type FreshnessStatus,
} from '../core/schemas.js'
import {EvoError} from '../core/errors.js'
import {readAcceptanceSource} from './acceptance.js'
import {artifactPath, parseArtifactMetadata} from './artifacts.js'
import {acceptanceInputs, compareFingerprint, evidenceInputs, fingerprintInputs} from './freshness.js'
import {readEvidence, readEvidenceRecords} from './evidence.js'
import {pathExists, readYaml, writeYaml} from './io.js'
import {readOptionalText} from './managed.js'
import {parseMarkdownDocument} from './markdown.js'
import {repositoryPaths} from './paths.js'

export interface AcceptanceTraceOptions {
  readonly now?: Date
  readonly persist?: boolean
}

export interface AcceptanceTraceIssue {
  readonly code: 'MISSING_SURFACE' | 'MISSING_VERIFICATION' | 'MISSING_EVIDENCE' | 'STALE_EVIDENCE' | 'UNKNOWN_STATUS'
  readonly acceptance: string
  readonly detail: string
}

export interface AcceptanceTraceReport {
  readonly document: AcceptanceTraceDocument
  readonly issues: readonly AcceptanceTraceIssue[]
  readonly valid: boolean
}

/** Reconstructs acceptance-to-surface-to-verification-to-evidence links from repository authorities. */
export async function buildAcceptanceTraceability(
  root: string,
  changeId: string,
  options: AcceptanceTraceOptions = {},
): Promise<AcceptanceTraceReport> {
  const authority = await readAcceptanceSource(root, changeId)
  const planTarget = artifactPath(root, changeId, 'plan')
  const planSource = await readOptionalText(planTarget)
  const planBody = planSource ? parseMarkdownDocument(planSource, planTarget).body : ''
  const surfaceByAcceptance = parseSurfaces(planBody)
  const verificationByAcceptance = parseVerifications(planBody)
  const evidenceRead = await readEvidence(root, changeId)
  const records = await readEvidenceRecords(root, changeId)
  const recordById = new Map(records.map((record) => [record.id, record]))
  const evidenceById = new Map((evidenceRead.document?.acceptance ?? []).map((item) => [item.id, item]))
  const declaredSurfaces = await declaredCurrentTruth(root, changeId)
  const currentInputs = await fingerprintInputs(root, acceptanceInputs(root, changeId))
  const currentEvidenceInputs = await fingerprintInputs(root, evidenceInputs(root, changeId))
  const items: AcceptanceTraceItem[] = authority.criteria.map((criterion) => {
    const evidence = evidenceById.get(criterion.id)
    const linkedRecords = (evidence?.evidenceRefs ?? []).map((id) => recordById.get(id)).filter((record): record is EvidenceRecord => record !== undefined)
    const implementationSurface = [...new Set([
      ...(surfaceByAcceptance.get(criterion.id) ?? []),
      ...(surfaceByAcceptance.has(criterion.id) ? [] : declaredSurfaces),
      ...linkedRecords.flatMap((record) => record.git.changedPaths.filter(isImplementationPath)),
    ])].sort()
    const verification = [...new Set([
      ...(verificationByAcceptance.get(criterion.id) ?? []),
      ...linkedRecords.map((record) => `${record.kind}: ${record.label}`),
      ...linkedRecords.flatMap((record) => record.command ? [`${record.command.executable} ${record.command.args.join(' ')}`] : []),
    ])].sort()
    const status = evidence?.status ?? 'NOT_RUN'
    const freshness = traceFreshness(evidence?.evidenceRefs ?? [], linkedRecords, currentEvidenceInputs.fingerprint)
    const limitations = [...new Set([
      ...(evidence?.limitations ?? []),
      ...(status === 'NOT_RUN' ? ['No independently observable evidence has been recorded.'] : []),
      ...(freshness === 'STALE' ? ['Linked evidence was produced before the current acceptance inputs.'] : []),
    ])]
    return {
      id: criterion.id,
      title: criterion.title,
      source: criterion.source,
      implementationSurface,
      verification,
      evidenceRefs: [...(evidence?.evidenceRefs ?? [])],
      status,
      freshness,
      limitations,
    }
  })
  const document = AcceptanceTraceDocumentSchema.parse({
    schemaVersion: 1,
    change: changeId,
    updatedAt: (options.now ?? new Date()).toISOString(),
    inputFingerprint: currentInputs.fingerprint,
    items,
  })
  if (options.persist) await writeYaml(acceptanceTracePath(root, changeId), document)
  const issues = traceIssues(document)
  return {document, issues, valid: issues.length === 0}
}

/** Reads a persisted derived trace without rebuilding it. */
export async function readAcceptanceTrace(root: string, changeId: string): Promise<AcceptanceTraceDocument | null> {
  const target = acceptanceTracePath(root, changeId)
  return await pathExists(target) ? readYaml(target, AcceptanceTraceDocumentSchema) : null
}

/** Reports whether a persisted trace still describes the current Change contract. */
export async function inspectAcceptanceTrace(root: string, changeId: string): Promise<AcceptanceTraceReport | null> {
  const stored = await readAcceptanceTrace(root, changeId)
  if (!stored) return null
  const current = await fingerprintInputs(root, acceptanceInputs(root, changeId))
  const freshness = compareFingerprint(stored.inputFingerprint, current)
  const document: AcceptanceTraceDocument = {...stored, items: stored.items.map((item) => ({...item, freshness: freshness === 'CURRENT' ? item.freshness : freshness}))}
  const issues = traceIssues(document)
  return {document, issues, valid: freshness === 'CURRENT' && issues.length === 0}
}

/** Returns the only intended write location for acceptance trace material. */
export function acceptanceTracePath(root: string, changeId: string): string {
  if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/u.test(changeId)) throw new EvoError(`Invalid Change id: ${changeId}`)
  return path.join(repositoryPaths(root).activeWork, changeId, 'acceptance.yml')
}

/** Formats traceability and admission deficiencies for humans and Agents. */
export function formatAcceptanceTrace(report: AcceptanceTraceReport): string {
  return [
    `Acceptance traceability / 验收追踪：${report.valid ? 'VALID / 有效' : 'NOT_READY / 未就绪'}`,
    ...report.document.items.map((item) => `${item.id} ${item.status}/${item.freshness}: surface=${item.implementationSurface.join(', ') || 'none'}; verification=${item.verification.join(', ') || 'none'}; evidence=${item.evidenceRefs.join(', ') || 'none'}`),
    ...(report.issues.length > 0 ? ['', 'Issues / 问题', ...report.issues.map((issue) => `${issue.code} ${issue.acceptance}: ${issue.detail}`)] : []),
  ].join('\n')
}

function traceIssues(document: AcceptanceTraceDocument): AcceptanceTraceIssue[] {
  const issues: AcceptanceTraceIssue[] = []
  for (const item of document.items) {
    if (item.implementationSurface.length === 0) issues.push({code: 'MISSING_SURFACE', acceptance: item.id, detail: 'No implementation surface is mapped.'})
    if (item.verification.length === 0) issues.push({code: 'MISSING_VERIFICATION', acceptance: item.id, detail: 'No verification path is mapped.'})
    if (item.status === 'PASS' && item.evidenceRefs.length === 0) issues.push({code: 'MISSING_EVIDENCE', acceptance: item.id, detail: 'PASS acceptance has no evidence reference.'})
    if (item.freshness === 'STALE') issues.push({code: 'STALE_EVIDENCE', acceptance: item.id, detail: 'Acceptance evidence is stale against current inputs.'})
    if (item.status === 'NOT_RUN' || item.status === 'BLOCKED') issues.push({code: 'UNKNOWN_STATUS', acceptance: item.id, detail: `Acceptance remains ${item.status}.`})
  }
  return issues
}

function traceFreshness(refs: readonly string[], records: readonly EvidenceRecord[], currentFingerprint: string): FreshnessStatus {
  if (refs.length === 0) return 'CURRENT'
  if (records.some((record) => record.inputFingerprint && record.inputFingerprint !== currentFingerprint)) return 'STALE'
  return records.length > 0 ? 'CURRENT' : 'UNKNOWN'
}

async function declaredCurrentTruth(root: string, changeId: string): Promise<string[]> {
  const target = artifactPath(root, changeId, 'plan')
  if (!(await pathExists(target))) return []
  const document = parseMarkdownDocument(await readFile(target, 'utf8'), target)
  const metadata = parseArtifactMetadata(document, 'plan', changeId)
  if (!('currentTruthTargets' in metadata) || !metadata.currentTruthTargets) return []
  return metadata.currentTruthTargets.map((item) => item.path)
}

function parseSurfaces(body: string): Map<string, string[]> {
  const result = new Map<string, string[]>()
  for (const line of body.split('\n')) {
    const ids = [...line.matchAll(/\b(AC-[A-Za-z0-9][A-Za-z0-9_-]*(?:\.[A-Za-z0-9][A-Za-z0-9_-]*)*)\b/gu)].map((match) => match[1]).filter((id): id is string => id !== undefined)
    if (ids.length === 0) continue
    const surfaces = [...line.matchAll(/`([^`]+)`/gu)].map((match) => match[1]).filter((value): value is string => value !== undefined && isImplementationPath(value))
    if (surfaces.length === 0) continue
    for (const id of ids) result.set(id, [...new Set([...(result.get(id) ?? []), ...surfaces])])
  }
  return result
}

function parseVerifications(body: string): Map<string, string[]> {
  const result = new Map<string, string[]>()
  for (const line of body.split('\n')) {
    const ids = [...line.matchAll(/\b(AC-[A-Za-z0-9][A-Za-z0-9_-]*(?:\.[A-Za-z0-9][A-Za-z0-9_-]*)*)\b/gu)].map((match) => match[1]).filter((id): id is string => id !== undefined)
    if (ids.length === 0 || !/(?:verify|verification|test|测试|验证|command|命令)/iu.test(line)) continue
    const value = line.replace(/^[-*]\s+/u, '').trim()
    for (const id of ids) result.set(id, [...new Set([...(result.get(id) ?? []), value])])
  }
  return result
}

function isImplementationPath(value: string): boolean {
  return /^(?:\.evo\/|src\/|app\/|frontend\/|backend\/|tests?\/|docs\/|scripts\/|packages?\/|[A-Za-z0-9_.-]+\/)/u.test(value)
}
