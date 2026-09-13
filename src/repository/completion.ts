import {execFile as execFileCallback} from 'node:child_process'
import {readFile} from 'node:fs/promises'
import path from 'node:path'
import {promisify} from 'node:util'

import {CompletionSchema, type Completion, type CurrentTruthTarget} from '../core/schemas.js'
import {EvoError} from '../core/errors.js'
import {captureGitSnapshot} from './git-snapshot.js'
import {pathExists, readYaml, writeYaml} from './io.js'
import {parseArtifactMetadata} from './artifacts.js'
import {parseMarkdownDocument} from './markdown.js'
import {repositoryPaths} from './paths.js'

const execFile = promisify(execFileCallback)

export interface CurrentTruthReport {
  readonly required: readonly CurrentTruthTarget[]
  readonly verified: readonly string[]
  readonly missing: readonly string[]
  readonly legacy: boolean
}

/** Checks whether Plan-declared current-truth paths now exist as required. */
export async function checkCurrentTruth(root: string, changeId: string, completed = false): Promise<CurrentTruthReport> {
  const paths = repositoryPaths(root)
  const safeId = safeChange(changeId)
  const directory = completed ? paths.completedWork : paths.activeWork
  const planTarget = path.join(directory, safeId, 'plan.md')
  if (!(await pathExists(planTarget))) throw new EvoError(`Change ${changeId} is missing plan.md.`)
  const document = parseMarkdownDocument(await readFile(planTarget, 'utf8'), planTarget)
  const metadata = parseArtifactMetadata(document, 'plan', changeId)
  const required = 'currentTruthTargets' in metadata && metadata.currentTruthTargets ? metadata.currentTruthTargets : []
  const verified: string[] = []
  const missing: string[] = []
  for (const target of required) {
    const resolved = path.resolve(paths.root, target.path)
    const relative = path.relative(paths.root, resolved)
    if (relative.startsWith('..') || path.isAbsolute(relative)) {
      missing.push(target.path)
      continue
    }
    if (target.action === 'UNAFFECTED' || await pathExists(resolved)) verified.push(target.path)
    else missing.push(target.path)
  }
  return {required, verified, missing, legacy: required.length === 0}
}

/** Writes the post-Finish completion record used for recovery and Git handoff. */
export async function createCompletionRecord(root: string, changeId: string, now = new Date()): Promise<Completion> {
  const paths = repositoryPaths(root)
  const safeId = safeChange(changeId)
  const completedRoot = path.join(paths.completedWork, safeId)
  if (!(await pathExists(completedRoot))) throw new EvoError(`Completed Change is missing: ${changeId}`)
  const currentTruth = await checkCurrentTruth(root, changeId, true)
  if (currentTruth.missing.length > 0) throw new EvoError(`Current truth paths are missing: ${currentTruth.missing.join(', ')}`)
  const snapshot = await captureGitSnapshot(paths.root, now)
  const completion: Completion = {
    schemaVersion: 1,
    change: changeId,
    workflowStatus: 'COMPLETED',
    finishedAt: now.toISOString(),
    baselineCommit: snapshot.head,
    finishedTreeFingerprint: snapshot.treeFingerprint,
    sourceStatus: snapshot.dirty ? 'READY_TO_COMMIT' : 'COMMIT_NOT_REQUIRED',
    commit: null,
    currentTruth: {required: [...currentTruth.required], verified: [...currentTruth.verified]},
  }
  await writeYaml(path.join(completedRoot, 'completion.yml'), completion)
  return completion
}

/** Reads a completed Change's completion record, if present. */
export async function readCompletion(root: string, changeId: string): Promise<Completion | null> {
  const target = path.join(repositoryPaths(root).completedWork, safeChange(changeId), 'completion.yml')
  return await pathExists(target) ? readYaml(target, CompletionSchema) : null
}

/** Binds a real existing Git commit to a completed Change without running Git commit itself. */
export async function bindCompletionCommit(root: string, changeId: string, commit?: string, now = new Date()): Promise<Completion> {
  const paths = repositoryPaths(root)
  const target = path.join(paths.completedWork, safeChange(changeId), 'completion.yml')
  const current = await readYaml(target, CompletionSchema)
  const snapshot = await captureGitSnapshot(paths.root, now)
  const selected = commit ?? snapshot.head
  if (!selected || !/^[a-f0-9]{40}$/u.test(selected)) throw new EvoError('A full 40-character Git commit is required, and HEAD must be available.')
  await assertCommit(paths.root, selected)
  const next: Completion = {...current, sourceStatus: 'COMMITTED', commit: selected}
  await writeYaml(target, next)
  return next
}

/** Formats current-truth verification for status and Doctor output. */
export function formatCurrentTruth(report: CurrentTruthReport): string {
  if (report.legacy) return 'No current-truth targets were declared; legacy Plan metadata remains compatible but is not mechanically checked.'
  return report.missing.length === 0
    ? `Verified ${report.verified.length} current-truth target(s).`
    : `Missing current-truth target(s): ${report.missing.join(', ')}`
}

async function assertCommit(root: string, commit: string): Promise<void> {
  try {
    await execFile('git', ['cat-file', '-e', `${commit}^{commit}`], {cwd: root, timeout: 10_000})
  } catch {
    throw new EvoError(`Git commit does not exist: ${commit}`)
  }
}

function safeChange(changeId: string): string {
  if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/u.test(changeId)) throw new EvoError(`Invalid Change id: ${changeId}`)
  return changeId
}
