import {randomUUID} from 'node:crypto'
import {copyFile, mkdir, readFile, stat} from 'node:fs/promises'
import path from 'node:path'

import {
  EvidenceDocumentSchema,
  EvidenceRecordSchema,
  type AcceptanceEvidence,
  type EvidenceArtifact,
  type EvidenceDocument,
  type EvidenceKind,
  type EvidenceRecord,
  type EvidenceRecordStatus,
} from '../core/schemas.js'
import {EvoError} from '../core/errors.js'
import {runCommand} from '../process/command-runner.js'
import {readAcceptanceSource} from './acceptance.js'
import {captureGitSnapshot, sha256} from './git-snapshot.js'
import {evidenceInputs, fingerprintInputs} from './freshness.js'
import {pathExists, readYaml, writeYaml} from './io.js'
import {listDirectory, readOptionalText} from './managed.js'
import {repositoryPaths} from './paths.js'

export interface EvidenceReadResult {
  readonly document: EvidenceDocument | null
  readonly legacy: boolean
  readonly path: string | null
}

export interface EvidenceReconciliationIssue {
  readonly code: 'MISSING_ACCEPTANCE' | 'EXTRA_ACCEPTANCE' | 'DUPLICATE_ACCEPTANCE' | 'MISSING_RECORD' | 'UNKNOWN_RECORD' | 'STATUS_MISMATCH' | 'STALE_RECORD' | 'LEGACY_EVIDENCE'
  readonly message: string
}

export interface EvidenceReconciliation {
  readonly change: string
  readonly authority: string
  readonly criteria: readonly string[]
  readonly evidence: readonly AcceptanceEvidence[]
  readonly records: readonly EvidenceRecord[]
  readonly legacy: boolean
  readonly valid: boolean
  readonly issues: readonly EvidenceReconciliationIssue[]
}

export interface RunEvidenceInput {
  readonly root: string
  readonly changeId: string
  readonly acceptance: readonly string[]
  readonly kind: EvidenceKind
  readonly label: string
  readonly executable: string
  readonly args: readonly string[]
  readonly cwd?: string
  readonly timeoutMs?: number
  readonly artifacts?: readonly string[]
  readonly completed?: boolean
  readonly now?: Date
}

export interface RecordEvidenceInput {
  readonly root: string
  readonly changeId: string
  readonly acceptance: readonly string[]
  readonly kind: EvidenceKind
  readonly label: string
  readonly status: EvidenceRecordStatus
  readonly summary: string
  readonly command?: {readonly executable: string; readonly args: readonly string[]; readonly cwd: string} | null
  readonly exitCode?: number | null
  readonly output?: string | null
  readonly artifacts?: readonly string[]
  readonly completed?: boolean
  readonly now?: Date
}

/** Reads v2 evidence when present and keeps the v1 Markdown evidence readable during migration. */
export async function readEvidence(root: string, changeId: string, completed = false): Promise<EvidenceReadResult> {
  const target = evidenceDocumentPath(root, changeId, completed)
  if (await pathExists(target)) return {document: await readYaml(target, EvidenceDocumentSchema), legacy: false, path: relative(root, target)}
  const legacyTarget = path.join(completed ? repositoryPaths(root).completedWork : repositoryPaths(root).activeWork, changeId, 'evidence.md')
  const source = await readOptionalText(legacyTarget)
  if (!source) return {document: null, legacy: false, path: null}
  const criteria = await readAcceptanceSource(root, changeId, completed)
  const evidence = parseLegacyEvidence(source, criteria.criteria.map((item) => item.id))
  return {
    document: {
      schemaVersion: 2,
      change: changeId,
      updatedAt: new Date().toISOString(),
      acceptance: evidence,
    },
    legacy: true,
    path: relative(root, legacyTarget),
  }
}

/** Creates a v2 evidence document with one explicit NOT_RUN entry per approved criterion. */
export async function initializeEvidence(root: string, changeId: string, now = new Date()): Promise<EvidenceDocument> {
  const acceptance = await readAcceptanceSource(root, changeId)
  const currentInputs = await fingerprintInputs(root, evidenceInputs(root, changeId))
  const document: EvidenceDocument = {
    schemaVersion: 2,
    change: changeId,
    updatedAt: now.toISOString(),
    acceptance: acceptance.criteria.map((criterion) => ({id: criterion.id, status: 'NOT_RUN', evidenceRefs: [], limitations: []})),
    inputFingerprint: currentInputs.fingerprint,
    freshness: 'CURRENT',
  }
  await writeYaml(evidenceDocumentPath(root, changeId), document)
  return document
}

/** Runs one approved command, records its output hash and Git snapshot, and updates its acceptance links. */
export async function runEvidence(input: RunEvidenceInput): Promise<EvidenceRecord> {
  const cwd = input.cwd ? path.resolve(input.root, input.cwd) : path.resolve(input.root)
  const relativeCwd = path.relative(path.resolve(input.root), cwd)
  if (relativeCwd.startsWith('..') || path.isAbsolute(relativeCwd)) throw new EvoError(`Evidence command cwd escapes repository: ${input.cwd ?? cwd}`)
  const result = await runCommand(input.executable, input.args, {
    cwd,
    timeoutMs: input.timeoutMs ?? 300_000,
  })
  const status: EvidenceRecordStatus = result.timedOut ? 'BLOCKED' : result.exitCode === 0 ? 'PASS' : 'FAIL'
  return recordEvidence({
    root: input.root,
    changeId: input.changeId,
    acceptance: input.acceptance,
    kind: input.kind,
    label: input.label,
    status,
    summary: result.timedOut ? `Command timed out after ${input.timeoutMs ?? 300_000}ms.` : summarizeOutput(result.output, result.exitCode),
    command: {executable: input.executable, args: input.args, cwd},
    exitCode: result.exitCode,
    output: result.output,
    ...(input.artifacts === undefined ? {} : {artifacts: input.artifacts}),
    ...(input.completed === undefined ? {} : {completed: input.completed}),
    ...(input.now === undefined ? {} : {now: input.now}),
    run: result,
  })
}

/** Records manually observed evidence without pretending that it was executed locally. */
export async function recordEvidence(input: RecordEvidenceInput & {readonly run?: {readonly startedAt: string; readonly endedAt: string}}): Promise<EvidenceRecord> {
  const now = input.now ?? new Date()
  const startedAt = input.run?.startedAt ?? now.toISOString()
  const endedAt = input.run?.endedAt ?? now.toISOString()
  const git = await captureGitSnapshot(input.root, now)
  const completed = input.completed === true
  const currentInputs = await fingerprintInputs(input.root, evidenceInputs(input.root, input.changeId, completed))
  const artifacts = await resolveArtifacts(input.root, input.changeId, input.artifacts ?? [], completed)
  const record: EvidenceRecord = EvidenceRecordSchema.parse({
    schemaVersion: 2,
    id: evidenceRecordId(now),
    change: input.changeId,
    acceptance: [...new Set(input.acceptance)],
    kind: input.kind,
    label: input.label,
    status: input.status,
    command: input.command === undefined ? null : input.command,
    exitCode: input.exitCode === undefined ? null : input.exitCode,
    summary: input.summary,
    outputHash: input.output == null ? null : sha256(input.output),
    git,
    artifacts,
    startedAt,
    endedAt,
    inputFingerprint: currentInputs.fingerprint,
    freshness: 'CURRENT',
  })
  const target = evidenceRecordPath(input.root, input.changeId, record.id, completed)
  await writeYaml(target, record)
  await linkRecordToEvidence(input.root, input.changeId, record, completed)
  return record
}

/** Validates that every approved acceptance id has one coherent v2 evidence status and no unknown links. */
export async function reconcileEvidence(root: string, changeId: string, completed = false): Promise<EvidenceReconciliation> {
  const authority = await readAcceptanceSource(root, changeId, completed)
  const read = await readEvidence(root, changeId, completed)
  const records = await readEvidenceRecords(root, changeId, completed)
  const evidence = read.document?.acceptance ?? []
  const issues: EvidenceReconciliationIssue[] = []
  const criteria = authority.criteria.map((item) => item.id)
  const expected = new Set(criteria)
  const seen = new Set<string>()
  if (criteria.length === 0) issues.push({code: 'MISSING_ACCEPTANCE', message: 'No acceptance criteria were found in the approved authority.'})
  for (const item of evidence) {
    if (seen.has(item.id)) issues.push({code: 'DUPLICATE_ACCEPTANCE', message: `Acceptance ${item.id} appears more than once.`})
    seen.add(item.id)
    if (!expected.has(item.id)) issues.push({code: 'EXTRA_ACCEPTANCE', message: `Evidence references unknown acceptance ${item.id}.`})
  }
  for (const id of criteria) if (!seen.has(id)) issues.push({code: 'MISSING_ACCEPTANCE', message: `Acceptance ${id} has no evidence entry.`})
  const recordById = new Map(records.map((record) => [record.id, record]))
  const currentInputs = await fingerprintInputs(root, evidenceInputs(root, changeId, completed))
  if (read.document?.inputFingerprint && read.document.inputFingerprint !== currentInputs.fingerprint) {
    issues.push({code: 'STALE_RECORD', message: 'Evidence document input fingerprint is stale; rerun affected evidence.'})
  }
  for (const record of records) {
    if (record.change !== changeId) issues.push({code: 'UNKNOWN_RECORD', message: `Record ${record.id} belongs to ${record.change}, not ${changeId}.`})
    if (new Set(record.acceptance).size !== record.acceptance.length) issues.push({code: 'STATUS_MISMATCH', message: `Record ${record.id} declares a duplicate acceptance id.`})
    for (const id of record.acceptance) {
      if (!expected.has(id)) issues.push({code: 'UNKNOWN_RECORD', message: `Record ${record.id} references unknown acceptance ${id}.`})
    }
    if (record.inputFingerprint && record.inputFingerprint !== currentInputs.fingerprint) {
      issues.push({code: 'STALE_RECORD', message: `Evidence record ${record.id} was produced against stale Change inputs.`})
    }
  }
  for (const item of evidence) {
    const linkedRecords = item.evidenceRefs.map((ref) => recordById.get(ref)).filter((record): record is EvidenceRecord => record !== undefined)
    for (const ref of item.evidenceRefs) {
      const record = recordById.get(ref)
      if (!record) {
        issues.push({code: 'UNKNOWN_RECORD', message: `Acceptance ${item.id} references missing record ${ref}.`})
      } else if (!record.acceptance.includes(item.id)) {
        issues.push({code: 'STATUS_MISMATCH', message: `Record ${ref} does not declare acceptance ${item.id}.`})
      }
    }
    if (item.evidenceRefs.length > 0 && !linkedRecords.some((record) => record.status === item.status)) {
      issues.push({code: 'STATUS_MISMATCH', message: `Acceptance ${item.id} status ${item.status} does not match its referenced record statuses.`})
    }
    if (!read.legacy && item.status === 'PASS' && !item.evidenceRefs.some((ref) => recordById.get(ref)?.status === 'PASS')) {
      issues.push({code: 'MISSING_RECORD', message: `Acceptance ${item.id} is PASS without a PASS record.`})
    }
    if (!read.legacy && item.status === 'FAIL' && !item.evidenceRefs.some((ref) => recordById.get(ref)?.status === 'FAIL')) {
      issues.push({code: 'MISSING_RECORD', message: `Acceptance ${item.id} is FAIL without a FAIL record.`})
    }
  }
  if (read.legacy) issues.push({code: 'LEGACY_EVIDENCE', message: 'Evidence is still sourced from evidence.md; migrate to evidence.yml for v2 validation.'})
  return {
    change: changeId,
    authority: authority.path,
    criteria,
    evidence,
    records,
    legacy: read.legacy,
    valid: issues.every((issue) => issue.code === 'LEGACY_EVIDENCE'),
    issues,
  }
}

/** Lists append-only evidence records in deterministic order. */
export async function readEvidenceRecords(root: string, changeId: string, completed = false): Promise<EvidenceRecord[]> {
  const directory = evidenceRecordsPath(root, changeId, completed)
  const records: EvidenceRecord[] = []
  for (const filename of (await listDirectory(directory)).filter((item) => item.endsWith('.yml'))) {
    const record = await readYaml(path.join(directory, filename), EvidenceRecordSchema)
    if (path.basename(filename, '.yml') !== record.id) throw new EvoError(`Evidence record filename does not match its id: ${filename}`)
    records.push(record)
  }
  return records.sort((left, right) => left.id.localeCompare(right.id))
}

/** Rewrites pre-Finish evidence paths after the active Change directory is archived. */
export async function rebaseArchivedEvidence(root: string, changeId: string, now = new Date()): Promise<void> {
  const read = await readEvidence(root, changeId, true)
  if (!read.document) return

  const currentInputs = await fingerprintInputs(root, evidenceInputs(root, changeId, true))
  const document: EvidenceDocument = EvidenceDocumentSchema.parse({
    ...read.document,
    updatedAt: now.toISOString(),
    inputFingerprint: currentInputs.fingerprint,
    freshness: 'CURRENT',
  })
  await writeYaml(evidenceDocumentPath(root, changeId, true), document)

  const activePrefix = `.evo/work/active/${changeId}/`
  const completedPrefix = `.evo/work/completed/${changeId}/`
  for (const record of await readEvidenceRecords(root, changeId, true)) {
    const artifacts = await Promise.all(record.artifacts.map(async (artifact) => {
      const normalizedPath = artifact.path.replace(/\\/gu, '/')
      const rebasedPath = normalizedPath.startsWith(activePrefix)
        ? `${completedPrefix}${normalizedPath.slice(activePrefix.length)}`
        : normalizedPath
      const target = path.resolve(root, rebasedPath)
      const relativeTarget = path.relative(path.resolve(root), target)
      if (relativeTarget.startsWith('..') || path.isAbsolute(relativeTarget)) throw new EvoError(`Archived evidence artifact escapes repository: ${artifact.path}`)
      return {...artifact, path: rebasedPath, sha256: sha256(await readFile(target))}
    }))
    const rebased = EvidenceRecordSchema.parse({
      ...record,
      artifacts,
      inputFingerprint: currentInputs.fingerprint,
      freshness: 'CURRENT',
    })
    await writeYaml(evidenceRecordPath(root, changeId, rebased.id, true), rebased)
  }
}

/** Returns the machine-authoritative v2 evidence document path. */
export function evidenceDocumentPath(root: string, changeId: string, completed = false): string {
  const paths = repositoryPaths(root)
  return path.join(completed ? paths.completedWork : paths.activeWork, safeChange(changeId), 'evidence.yml')
}

/** Returns the append-only record path for one Change. */
export function evidenceRecordPath(root: string, changeId: string, id: string, completed = false): string {
  if (!/^EV-[A-Za-z0-9][A-Za-z0-9_-]*$/u.test(id)) throw new EvoError(`Invalid evidence record id: ${id}`)
  return path.join(evidenceRecordsPath(root, changeId, completed), `${id}.yml`)
}

function evidenceRecordsPath(root: string, changeId: string, completed = false): string {
  const paths = repositoryPaths(root)
  return path.join(completed ? paths.completedWork : paths.activeWork, safeChange(changeId), 'evidence', 'records')
}

async function linkRecordToEvidence(root: string, changeId: string, record: EvidenceRecord, completed = false): Promise<void> {
  const read = await readEvidence(root, changeId, completed)
  const authority = await readAcceptanceSource(root, changeId, completed)
  const existing = read.document?.acceptance ?? authority.criteria.map((criterion) => ({id: criterion.id, status: 'NOT_RUN' as const, evidenceRefs: [], limitations: []}))
  const selected = new Set(record.acceptance)
  const acceptance = existing.map((item) => selected.has(item.id)
    ? {...item, status: record.status, evidenceRefs: [...new Set([...item.evidenceRefs, record.id])]}
    : item)
  const currentInputs = await fingerprintInputs(root, evidenceInputs(root, changeId, completed))
  const document: EvidenceDocument = {
    schemaVersion: 2,
    change: changeId,
    updatedAt: new Date().toISOString(),
    acceptance,
    inputFingerprint: currentInputs.fingerprint,
    freshness: 'CURRENT',
  }
  await writeYaml(evidenceDocumentPath(root, changeId, completed), document)
}

async function resolveArtifacts(root: string, changeId: string, values: readonly string[], completed = false): Promise<EvidenceArtifact[]> {
  const result: EvidenceArtifact[] = []
  const work = completed ? repositoryPaths(root).completedWork : repositoryPaths(root).activeWork
  const artifactDirectory = path.join(work, safeChange(changeId), 'evidence', 'artifacts')
  for (const [index, value] of values.entries()) {
    const target = path.resolve(root, value)
    const relativeTarget = path.relative(root, target)
    if (relativeTarget.startsWith('..') || path.isAbsolute(relativeTarget)) throw new EvoError(`Evidence artifact escapes repository: ${value}`)
    const details = await stat(target)
    if (!details.isFile()) throw new EvoError(`Evidence artifact is not a file: ${value}`)
    if (details.size > 50_000_000) throw new EvoError(`Evidence artifact is larger than 50 MB: ${value}`)
    await mkdir(artifactDirectory, {recursive: true})
    const basename = path.basename(target).replace(/[^A-Za-z0-9._-]/gu, '_')
    const destination = path.join(artifactDirectory, `${Date.now()}-${index}-${basename}`)
    await copyFile(target, destination)
    result.push({path: relative(root, destination), sha256: sha256(await readFile(destination))})
  }
  return result
}

function parseLegacyEvidence(source: string, criteria: readonly string[]): AcceptanceEvidence[] {
  const values = new Map<string, AcceptanceEvidence>()
  for (const match of source.matchAll(/^\|\s*(AC-[^|\s]+)\s*\|\s*(PASS|FAIL|UNVERIFIED)\s*\|/gmu)) {
    const id = match[1]
    const status = match[2]
    if (!id || !status) continue
    const mapped: EvidenceRecordStatus = status === 'UNVERIFIED' ? 'NOT_RUN' : status === 'PASS' ? 'PASS' : 'FAIL'
    values.set(id, {id, status: mapped, evidenceRefs: [], limitations: []})
  }
  return criteria.map((id) => values.get(id) ?? {id, status: 'NOT_RUN', evidenceRefs: [], limitations: []})
}

function evidenceRecordId(now: Date): string {
  return `EV-${now.toISOString().replace(/\D/gu, '').slice(0, 14)}-${randomUUID().slice(0, 8)}`
}

function summarizeOutput(output: string, exitCode: number | null): string {
  const firstLine = output.split('\n').map((line) => line.trim()).find((line) => line.length > 0)
  return firstLine ? `exit=${String(exitCode)}; ${firstLine.slice(0, 500)}` : `exit=${String(exitCode)}`
}

function safeChange(changeId: string): string {
  if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/u.test(changeId)) throw new EvoError(`Invalid Change id: ${changeId}`)
  return changeId
}

function relative(root: string, target: string): string {
  return path.relative(path.resolve(root), target).split(path.sep).join('/')
}
