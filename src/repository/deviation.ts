import {execFile as execFileCallback} from 'node:child_process'
import {readFile} from 'node:fs/promises'
import path from 'node:path'
import {promisify} from 'node:util'

import {GoalSchema, type Goal} from '../core/schemas.js'
import {artifactPath, inspectArtifactApproval, parseArtifactMetadata} from './artifacts.js'
import {readEvidenceRecords} from './evidence.js'
import {pathExists, readYaml} from './io.js'
import {listDirectory, openManagedRepository} from './managed.js'
import {parseMarkdownDocument} from './markdown.js'
import {repositoryPaths} from './paths.js'

const execFile = promisify(execFileCallback)

/** A stable, report-first finding for implementation that predates current approval. */
export const IMPLEMENTATION_AHEAD_OF_APPROVAL = 'IMPLEMENTATION_AHEAD_OF_APPROVAL' as const

export type ImplementationSignalKind = 'EVIDENCE_RECORD' | 'GOAL_ATTEMPT' | 'GIT_CHECKPOINT'

export interface ImplementationSignal {
  readonly kind: ImplementationSignalKind
  readonly source: string
  readonly detail: string
  readonly paths: readonly string[]
}

export interface ImplementationAheadFinding {
  readonly code: typeof IMPLEMENTATION_AHEAD_OF_APPROVAL
  readonly changeId: string
  readonly unapprovedArtifacts: readonly string[]
  readonly signals: readonly ImplementationSignal[]
  readonly detail: string
  readonly nextAction: string
}

/**
 * Detects observable implementation activity while the active Change or Plan
 * has no current approval. This never changes state or grants authorization.
 */
export async function detectImplementationAheadOfApproval(
  root: string,
  requestedChangeId?: string,
): Promise<ImplementationAheadFinding | null> {
  const managed = await openManagedRepository(root)
  const changeId = requestedChangeId ?? managed.state.activeChange
  if (!changeId || managed.state.activeChange !== changeId) return null

  const unapprovedArtifacts = await readUnapprovedArtifacts(root, changeId)
  if (unapprovedArtifacts.length === 0) return null

  const signals = [
    ...(await evidenceSignals(root, changeId)),
    ...(await goalSignals(root, changeId)),
    ...(await checkpointSignals(root, changeId)),
  ]
  if (signals.length === 0) return null

  const signalSummary = signals.map((signal) => `${signal.kind} ${signal.source}`).join(', ')
  return {
    code: IMPLEMENTATION_AHEAD_OF_APPROVAL,
    changeId,
    unapprovedArtifacts,
    signals,
    detail: `${IMPLEMENTATION_AHEAD_OF_APPROVAL}: Change ${changeId} has implementation evidence (${signalSummary}) while ${unapprovedArtifacts.join(' and ')} has no current approval. This is historical out-of-band implementation, not retroactive authorization.`,
    nextAction: `Review the exact current Change/Plan, approve only the current content, then rebuild Freshness, Evidence, Gates, and Admission; preserve this finding in chronology.`,
  }
}

async function readUnapprovedArtifacts(root: string, changeId: string): Promise<string[]> {
  const result: string[] = []
  for (const kind of ['change', 'plan', 'spec'] as const) {
    const target = artifactPath(root, changeId, kind)
    if (!(await pathExists(target))) {
      if (kind !== 'spec') result.push(`${kind}.md (missing)`)
      continue
    }
    try {
      const document = parseMarkdownDocument(await readFile(target, 'utf8'), target)
      parseArtifactMetadata(document, kind, changeId)
      if (!inspectArtifactApproval(document).valid) result.push(`${kind}.md`)
    } catch {
      result.push(`${kind}.md (invalid)`)
    }
  }
  return result
}

async function evidenceSignals(root: string, changeId: string): Promise<ImplementationSignal[]> {
  try {
    const records = await readEvidenceRecords(root, changeId)
    return records.flatMap((record) => {
      const paths = record.git.changedPaths.filter(isImplementationPath)
      return paths.length === 0 ? [] : [{
        kind: 'EVIDENCE_RECORD' as const,
        source: record.id,
        detail: `Evidence record ${record.id} records implementation paths from its Git snapshot.`,
        paths,
      }]
    })
  } catch {
    return []
  }
}

async function goalSignals(root: string, changeId: string): Promise<ImplementationSignal[]> {
  const paths = repositoryPaths(root)
  const signals: ImplementationSignal[] = []
  for (const directory of [paths.activeGoals, paths.completedGoals]) {
    for (const filename of (await listDirectory(directory)).filter((item) => item.endsWith('.yml'))) {
      const target = path.join(directory, filename)
      let goal: Goal
      try {
        goal = await readYaml(target, GoalSchema)
      } catch {
        continue
      }
      if (goal.changeId !== changeId) continue
      for (const slice of goal.slices) {
        for (const attempt of slice.attempts) {
          const changed = attempt.agent.changedFiles.filter(isImplementationPath)
          if (changed.length === 0) continue
          signals.push({
            kind: 'GOAL_ATTEMPT',
            source: `${goal.id}/${slice.id}/attempt-${attempt.number}`,
            detail: `Goal attempt ${goal.id}/${slice.id} records implementation changedFiles.`,
            paths: changed,
          })
        }
      }
    }
  }
  return signals
}

async function checkpointSignals(root: string, changeId: string): Promise<ImplementationSignal[]> {
  try {
    const result = await execFile('git', [
      'log', '--all', '-n', '200',
      '--format=%H%x00%aI%x00%s%x00%B%x1e',
    ], {cwd: path.resolve(root), timeout: 10_000, maxBuffer: 2_000_000})
    const signals: ImplementationSignal[] = []
    for (const record of result.stdout.split('\x1e')) {
      const [hash, authoredAt, subject, body] = record.split('\x00')
      if (!hash || !authoredAt || !subject || !body) continue
      if (!body.includes(`EVO-Change: ${changeId}`)) continue
      if (!/AWAITING_APPROVAL|EVO-Phase:\s*PLAN/u.test(body)) continue
      signals.push({
        kind: 'GIT_CHECKPOINT',
        source: hash,
        detail: `Git checkpoint ${hash.slice(0, 12)} (${subject}) was recorded on ${authoredAt} with the Change in an unapproved workflow phase.`,
        paths: [],
      })
    }
    return signals
  } catch {
    return []
  }
}

function isImplementationPath(value: string): boolean {
  const normalized = value.replaceAll('\\', '/')
  return /^(?:src|app|backend|frontend|packages?|tests?|scripts|schemas)\//u.test(normalized)
    || /^(?:package\.json|pnpm-lock\.yaml|tsconfig(?:\.[^/]+)?\.json|vitest\.config\.[^/]+)$/u.test(normalized)
}
