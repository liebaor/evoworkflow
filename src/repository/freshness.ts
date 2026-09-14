import {createHash} from 'node:crypto'
import {readdir, readFile, stat} from 'node:fs/promises'
import path from 'node:path'

import {parse} from 'yaml'

import type {FreshnessDocument, FreshnessEntry, FreshnessStatus} from '../core/schemas.js'
import {EvoError} from '../core/errors.js'
import {pathExists} from './io.js'
import {repositoryPaths} from './paths.js'

/** A path plus the reason it participates in a derived artifact fingerprint. */
export interface FreshnessInput {
  readonly path: string
  readonly reason?: string
}

/** The result of hashing a deterministic set of repository inputs. */
export interface FingerprintResult {
  readonly fingerprint: string
  readonly inputs: readonly string[]
  readonly missing: readonly string[]
}

/** Calculates a stable fingerprint over repository-relative files and records missing inputs. */
export async function fingerprintInputs(root: string, inputs: readonly (string | FreshnessInput)[]): Promise<FingerprintResult> {
  const resolvedRoot = path.resolve(root)
  const paths = [...new Set(inputs.map((input) => typeof input === 'string' ? input : input.path).map((item) => normalizeInputPath(resolvedRoot, item)))]
    .sort((left, right) => left.localeCompare(right))
  const missing: string[] = []
  const hash = createHash('sha256')
  hash.update('evo-inputs-v1\0')
  for (const relative of paths) {
    hash.update(relative)
    hash.update('\0')
    const target = path.join(resolvedRoot, relative)
    try {
      const details = await stat(target)
      if (details.isDirectory()) {
        const nested = await fingerprintDirectory(resolvedRoot, relative)
        hash.update(`directory:${nested}\0`)
      } else if (details.isFile()) {
        hash.update(await readFile(target))
        hash.update('\0')
      } else {
        hash.update(`unsupported:${details.mode}\0`)
      }
    } catch (error) {
      if (isMissing(error)) {
        missing.push(relative)
        hash.update('MISSING\0')
      } else {
        throw error
      }
    }
  }
  return {fingerprint: hash.digest('hex'), inputs: paths, missing}
}

/** Alias used by callers that want to emphasize that the result is an input fingerprint. */
export const inputFingerprint = fingerprintInputs

/** Computes a file fingerprint without treating its contents as a second authority. */
export async function fingerprintFile(root: string, target: string): Promise<string | null> {
  const relative = normalizeInputPath(path.resolve(root), target)
  try {
    const details = await stat(path.join(path.resolve(root), relative))
    if (!details.isFile()) return null
    return createHash('sha256').update(await readFile(path.join(path.resolve(root), relative))).digest('hex')
  } catch (error) {
    if (isMissing(error)) return null
    throw error
  }
}

/** Compares a stored derived-artifact fingerprint with the current inputs. */
export function compareFingerprint(stored: string | null | undefined, current: FingerprintResult): FreshnessStatus {
  if (!stored) return 'UNKNOWN'
  if (stored === current.fingerprint) return 'CURRENT'
  // Optional contract inputs (for example spec.md on a Standard Change) can
  // be absent both when the artifact was built and when it is inspected. A
  // changed hash is therefore an honest STALE signal; missing artifacts are
  // reported by the callers that can observe the artifact itself.
  return 'STALE'
}

/** Returns the files that define the current Change contract. */
export function changeContractInputs(root: string, changeId: string, completed = false): string[] {
  const paths = repositoryPaths(root)
  safeChange(changeId)
  const work = completed ? paths.completedWork : paths.activeWork
  return [
    relative(root, path.join(work, changeId, 'change.md')),
    relative(root, path.join(work, changeId, 'spec.md')),
    relative(root, path.join(work, changeId, 'plan.md')),
  ]
}

/** Returns inputs used to resolve task-level constraints. */
export function constraintInputs(root: string, changeId: string, referencePaths: readonly string[] = []): string[] {
  const paths = repositoryPaths(root)
  // Directory contents are expanded asynchronously by constraintInputPaths; this synchronous
  // helper still gives callers the stable contract paths that always participate.
  return [
    ...changeContractInputs(root, changeId),
    relative(root, paths.agents),
    relative(root, paths.project),
    ...referencePaths.map((item) => normalizeInputPath(path.resolve(root), item)),
  ]
}

/** Expands current/working Decision files and reference paths for a complete constraints hash. */
export async function constraintInputPaths(root: string, changeId: string, referencePaths: readonly string[] = []): Promise<string[]> {
  const paths = repositoryPaths(root)
  const decisionFiles = (await Promise.all([paths.currentDecisions, paths.workingDecisions].map(async (directory) => {
    try {
      return (await readdir(directory, {withFileTypes: true}))
        .filter((entry) => entry.isFile() && entry.name.endsWith('.md'))
        .map((entry) => relative(root, path.join(directory, entry.name)))
    } catch (error) {
      if (isMissing(error)) return []
      throw error
    }
  }))).flat()
  return [...new Set([
    ...constraintInputs(root, changeId, referencePaths),
    relative(root, paths.currentDecisions),
    relative(root, paths.workingDecisions),
    ...decisionFiles,
  ])].sort()
}

/** Inputs that define acceptance meaning; evidence itself is deliberately excluded. */
export function acceptanceInputs(root: string, changeId: string, completed = false): string[] {
  return changeContractInputs(root, changeId, completed)
}

/** Inputs that define an evidence record's acceptance contract. */
export function evidenceInputs(root: string, changeId: string, completed = false): string[] {
  const paths = repositoryPaths(root)
  const work = completed ? paths.completedWork : paths.activeWork
  return [...acceptanceInputs(root, changeId, completed), relative(root, path.join(work, changeId, 'constraints.yml'))]
}

/** Builds a report for all known v0.3 derived artifacts without writing anything. */
export async function inspectFreshness(root: string, changeId: string, now = new Date()): Promise<FreshnessDocument> {
  safeChange(changeId)
  const paths = repositoryPaths(root)
  const entries: FreshnessEntry[] = []
  const generatedAt = now.toISOString()

  await addDirectEntry(entries, root, 'change', 'change', path.join(paths.activeWork, changeId, 'change.md'), [relative(root, path.join(paths.activeWork, changeId, 'change.md'))], generatedAt)
  const contractInputs = changeContractInputs(root, changeId)
  await addDirectEntry(entries, root, 'plan', 'plan', path.join(paths.activeWork, changeId, 'plan.md'), contractInputs, generatedAt)
  const specTarget = path.join(paths.activeWork, changeId, 'spec.md')
  if (await pathExists(specTarget)) await addDirectEntry(entries, root, 'spec', 'spec', specTarget, [relative(root, specTarget)], generatedAt)

  const constraintsTarget = path.join(paths.activeWork, changeId, 'constraints.yml')
  const storedConstraintInputs = await readStoredInputs(constraintsTarget)
  await addDerivedEntry(entries, root, 'constraints', constraintsTarget, storedConstraintInputs ?? await constraintInputPaths(root, changeId), generatedAt)
  await addDerivedEntry(entries, root, 'acceptance', path.join(paths.activeWork, changeId, 'acceptance.yml'), acceptanceInputs(root, changeId), generatedAt)
  await addDerivedEntry(entries, root, 'evidence', path.join(paths.activeWork, changeId, 'evidence.yml'), evidenceInputs(root, changeId), generatedAt)
  const contextTarget = path.join(paths.activeWork, changeId, 'context.md')
  if (await pathExists(contextTarget)) {
    const contextSource = await readFile(contextTarget, 'utf8')
    const storedContextInputs = /^<!--\s*evo-context-inputs:\s*([^>]+?)\s*-->$/mu.exec(contextSource)?.[1]?.split('|').filter(Boolean) ?? []
    const contextInputs = storedContextInputs.length > 0 ? storedContextInputs : contractInputs
    const currentContext = await fingerprintInputs(root, contextInputs)
    const storedContextFingerprint = /^Input fingerprint \/ 输入指纹：([a-f0-9]{64})$/mu.exec(contextSource)?.[1] ?? null
    const contextStatus = compareFingerprint(storedContextFingerprint, currentContext)
    entries.push({
      id: 'context',
      kind: 'context',
      status: contextStatus,
      fingerprint: await fingerprintFile(root, contextTarget),
      inputFingerprint: storedContextFingerprint,
      inputs: [...currentContext.inputs],
      changedInputs: contextStatus === 'STALE' || contextStatus === 'MISSING' ? [...currentContext.inputs] : [...currentContext.missing],
      detail: storedContextFingerprint === null
        ? 'context.md has no embedded input fingerprint; rebuild it before relying on it as current.'
        : contextStatus === 'CURRENT'
          ? 'context.md matches its recorded inputs.'
          : 'context.md does not match its current inputs.',
      generatedAt,
    })
  }

  const status = overallFreshness(entries)
  return {schemaVersion: 1, change: changeId, generatedAt, status, entries}
}

/** Formats freshness as a compact report for CLI, recovery, and evaluator output. */
export function formatFreshness(document: FreshnessDocument): string {
  return [
    `Freshness / 新鲜度：${document.status}`,
    ...document.entries.map((entry) => `${entry.status} ${entry.kind}/${entry.id}: ${entry.detail}${entry.changedInputs.length > 0 ? ` Changed: ${entry.changedInputs.join(', ')}` : ''}`),
  ].join('\n')
}

async function addDirectEntry(
  entries: FreshnessEntry[],
  root: string,
  id: string,
  kind: string,
  target: string,
  inputs: readonly string[],
  generatedAt: string,
): Promise<void> {
  const relativeTarget = relative(root, target)
  const fingerprint = await fingerprintFile(root, relativeTarget)
  const current = await fingerprintInputs(root, inputs)
  const exists = fingerprint !== null
  entries.push({
    id,
    kind,
    status: exists ? 'CURRENT' : 'MISSING',
    fingerprint,
    inputFingerprint: current.fingerprint,
    inputs: [...current.inputs],
    changedInputs: [...current.missing],
    detail: exists ? `Authoritative file ${relativeTarget} exists.` : `Required file ${relativeTarget} is missing.`,
    generatedAt,
  })
}

async function addDerivedEntry(
  entries: FreshnessEntry[],
  root: string,
  id: string,
  target: string,
  inputs: readonly string[],
  generatedAt: string,
): Promise<void> {
  const relativeTarget = relative(root, target)
  const current = await fingerprintInputs(root, inputs)
  const stored = await readStoredInputFingerprint(target)
  const artifact = await fingerprintFile(root, relativeTarget)
  const status = artifact === null ? 'MISSING' : compareFingerprint(stored, current)
  entries.push({
    id,
    kind: 'derived',
    status,
    fingerprint: artifact,
    inputFingerprint: stored ?? null,
    inputs: [...current.inputs],
    changedInputs: status === 'STALE' || status === 'MISSING' ? [...current.inputs] : [...current.missing],
    detail: artifact === null
      ? `Derived artifact ${relativeTarget} has not been generated.`
      : status === 'CURRENT'
        ? `Derived artifact ${relativeTarget} matches its recorded inputs.`
        : `Derived artifact ${relativeTarget} does not match its current inputs.`,
    generatedAt,
  })
}

async function readStoredInputFingerprint(target: string): Promise<string | null> {
  try {
    const source = await readFile(target, 'utf8')
    const value = parse(source) as {inputFingerprint?: unknown} | null
    return typeof value?.inputFingerprint === 'string' && /^[a-f0-9]{64}$/u.test(value.inputFingerprint) ? value.inputFingerprint : null
  } catch (error) {
    if (isMissing(error)) return null
    throw error
  }
}

async function readStoredInputs(target: string): Promise<string[] | null> {
  try {
    const source = await readFile(target, 'utf8')
    const value = parse(source) as {inputs?: unknown} | null
    if (!Array.isArray(value?.inputs) || !value.inputs.every((item): item is string => typeof item === 'string' && item.length > 0)) return null
    return [...new Set(value.inputs)].sort()
  } catch (error) {
    if (isMissing(error)) return null
    throw error
  }
}

async function fingerprintDirectory(root: string, relativeDirectory: string): Promise<string> {
  const target = path.join(root, relativeDirectory)
  const entries = await readdir(target, {withFileTypes: true})
  const hash = createHash('sha256')
  for (const entry of entries.sort((left, right) => left.name.localeCompare(right.name))) {
    const child = path.join(relativeDirectory, entry.name)
    if (entry.isDirectory()) hash.update(`${child}/:${await fingerprintDirectory(root, child)}\0`)
    else if (entry.isFile()) hash.update(`${child}:${createHash('sha256').update(await readFile(path.join(root, child))).digest('hex')}\0`)
  }
  return hash.digest('hex')
}

function overallFreshness(entries: readonly FreshnessEntry[]): FreshnessStatus {
  if (entries.some((entry) => entry.status === 'CONFLICT')) return 'CONFLICT'
  if (entries.some((entry) => entry.status === 'STALE')) return 'STALE'
  if (entries.some((entry) => entry.status === 'MISSING')) return 'MISSING'
  if (entries.some((entry) => entry.status === 'UNKNOWN')) return 'UNKNOWN'
  return 'CURRENT'
}

function normalizeInputPath(root: string, value: string): string {
  const resolved = path.resolve(root, value)
  const relativeTarget = path.relative(root, resolved)
  if (relativeTarget.startsWith('..') || path.isAbsolute(relativeTarget)) throw new EvoError(`Freshness input escapes repository: ${value}`)
  return relativeTarget || '.'
}

function relative(root: string, target: string): string {
  return path.relative(path.resolve(root), path.resolve(target)).split(path.sep).join('/')
}

function safeChange(changeId: string): void {
  if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/u.test(changeId)) throw new EvoError(`Invalid Change id: ${changeId}`)
}

function isMissing(error: unknown): boolean {
  return error instanceof Error && 'code' in error && (error as NodeJS.ErrnoException).code === 'ENOENT'
}
