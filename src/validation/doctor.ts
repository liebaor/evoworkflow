import {stat} from 'node:fs/promises'
import path from 'node:path'

import {GateReportSchema, ProjectGateDefinitionSchema, type Config} from '../core/schemas.js'
import {pathExists, readYaml} from '../repository/io.js'
import {listDirectory, openManagedRepository, readOptionalText} from '../repository/managed.js'
import {repositoryPaths} from '../repository/paths.js'
import {formatValidationReport, validateProject, type ValidationIssue, type ValidationReport} from './project.js'
import {checkCurrentTruth, readCompletion} from '../repository/completion.js'
import {readEvidence, readEvidenceRecords, reconcileEvidence} from '../repository/evidence.js'
import {captureGitSnapshot} from '../repository/git-snapshot.js'
import {createHash} from 'node:crypto'
import {readFile} from 'node:fs/promises'
import {inspectAcceptanceTrace, buildAcceptanceTraceability} from '../repository/acceptance-trace.js'
import {inspectConstraintsFreshness} from '../repository/constraints.js'
import {inspectFreshness} from '../repository/freshness.js'

export interface DoctorReport extends ValidationReport {
  readonly checkedAt: string
}

/** Runs read-only knowledge-gardening diagnostics after protocol validation. */
export async function runDoctor(root: string, now = new Date()): Promise<DoctorReport> {
  const validation = await validateProject(root)
  const issues = [...validation.issues]
  const paths = repositoryPaths(root)
  if (!(await pathExists(paths.evo))) return {valid: false, issues, checkedAt: now.toISOString()}

  let config: Config | null = null
  try {
    config = (await openManagedRepository(root)).config
  } catch {
    return {valid: false, issues, checkedAt: now.toISOString()}
  }

  const agents = await readOptionalText(paths.agents)
  if (agents) {
    const lines = agents.replace(/\n$/u, '').split('\n').length
    if (lines > config.knowledge.agentsMaxLines) {
      issues.push(diagnostic('AGENTS_BLOAT', 'warning', `AGENTS.md has ${lines} lines; configured maximum is ${config.knowledge.agentsMaxLines}.`, 'AGENTS.md'))
    }
  }

  await addStaleDiagnostics(issues, paths.root, paths.activeWork, config.knowledge.staleWorkDays, now, 'STALE_WORK')
  await addStaleDiagnostics(issues, paths.root, paths.workingDecisions, config.knowledge.staleWorkDays, now, 'ZOMBIE_DECISION')
  await addStaleDiagnostics(issues, paths.root, paths.activeGoals, config.knowledge.staleWorkDays, now, 'STALE_GOAL')
  await addGoalLockDiagnostics(issues, paths.root, path.join(paths.goals, '.locks'))

  const project = await readOptionalText(paths.project)
  if (project && !/^\|\s*test\s*\|/imu.test(project)) {
    issues.push(diagnostic('UNKNOWN_TEST_PATH', 'warning', 'Project map has no confirmed test command.', '.evo/project.md'))
  }
  if (project && !/^\|\s*run\s*\|/imu.test(project)) {
    issues.push(diagnostic('UNKNOWN_RUN_PATH', 'warning', 'Project map has no confirmed application run command.', '.evo/project.md'))
  }

  for (const workId of await listDirectory(paths.activeWork)) {
    const evidencePath = path.join(paths.activeWork, workId, 'evidence.md')
    const evidence = await readOptionalText(evidencePath)
    if (evidence && /\bUNVERIFIED\b/u.test(evidence)) {
      issues.push(diagnostic('UNVERIFIED_ACTIVE_WORK', 'warning', `Active Change ${workId} still records UNVERIFIED evidence.`, relative(paths.root, evidencePath)))
    }
    await addEvidenceDiagnostics(issues, paths.root, workId, false)
    await addPhase3Diagnostics(issues, paths.root, workId)
  }

  for (const workId of await listDirectory(paths.completedWork)) {
    const completion = await readCompletion(paths.root, workId)
    const target = path.join(paths.completedWork, workId, 'completion.yml')
    if (!completion) {
      issues.push(diagnostic('MISSING_COMPLETION_RECORD', 'warning', `Completed Change ${workId} has no completion.yml handoff record.`, relative(paths.root, target)))
    } else {
      if (completion.sourceStatus === 'READY_TO_COMMIT') issues.push(diagnostic('COMPLETED_CHANGE_UNCOMMITTED', 'warning', `Completed Change ${workId} is archived but its source changes are not bound to a Git commit.`, relative(paths.root, target)))
      const truth = await checkCurrentTruth(paths.root, workId, true)
      if (truth.missing.length > 0) issues.push(diagnostic('CURRENT_TRUTH_NOT_UPDATED', 'error', `Completed Change ${workId} is missing current-truth paths: ${truth.missing.join(', ')}.`, relative(paths.root, path.join(paths.completedWork, workId, 'plan.md'))))
      if (truth.legacy) issues.push(diagnostic('LEGACY_CURRENT_TRUTH_TARGETS', 'warning', `Completed Change ${workId} has no mechanically declared current-truth targets.`, relative(paths.root, path.join(paths.completedWork, workId, 'plan.md'))))
    }
  await addEvidenceDiagnostics(issues, paths.root, workId, true)
  }

  const sorted = sortDiagnostics(issues)
  return {valid: !sorted.some((item) => item.severity === 'error'), issues: sorted, checkedAt: now.toISOString()}
}

/** Adds report-first diagnostics for disposable Phase 3 derived views and gate sources. */
async function addPhase3Diagnostics(issues: ValidationIssue[], root: string, changeId: string): Promise<void> {
  const paths = repositoryPaths(root)
  try {
    const freshness = await inspectFreshness(root, changeId)
    for (const entry of freshness.entries.filter((item) => item.status !== 'CURRENT')) {
      issues.push(diagnostic(
        entry.status === 'STALE' ? 'STALE_DERIVED_ARTIFACT' : 'MISSING_DERIVED_ARTIFACT',
        'warning',
        `${entry.kind}/${entry.id} is ${entry.status}: ${entry.detail}`,
        entry.kind === 'derived' ? relative(root, path.join(paths.activeWork, changeId, `${entry.id}.yml`)) : relative(root, path.join(paths.activeWork, changeId, `${entry.id}.md`)),
      ))
    }
  } catch (error) {
    issues.push(diagnostic('INVALID_FRESHNESS_REPORT', 'error', error instanceof Error ? error.message : String(error), relative(root, path.join(paths.activeWork, changeId))))
  }

  try {
    const constraints = await inspectConstraintsFreshness(root, changeId)
    if (!constraints) {
      issues.push(diagnostic('MISSING_RESOLVED_CONSTRAINTS', 'warning', `Change ${changeId} has no persisted constraints.yml; rebuild it before bounded execution.`, relative(root, path.join(paths.activeWork, changeId, 'constraints.yml'))))
    } else {
      if (constraints.freshness === 'CONFLICT') issues.push(diagnostic('CONSTRAINT_CONFLICT', 'error', `Change ${changeId} has conflicting HARD constraints.`, relative(root, path.join(paths.activeWork, changeId, 'constraints.yml'))))
      if (constraints.freshness !== 'CURRENT') issues.push(diagnostic('STALE_RESOLVED_CONSTRAINTS', 'warning', `Change ${changeId} constraints are ${constraints.freshness}.`, relative(root, path.join(paths.activeWork, changeId, 'constraints.yml'))))
      for (const item of constraints.constraints.filter((value) => value.type === 'UNKNOWN')) issues.push(diagnostic('UNKNOWN_ENGINEERING_CONSTRAINT', 'warning', `${item.topic}: ${item.statement}`, relative(root, path.join(paths.activeWork, changeId, 'constraints.yml'))))
    }
  } catch (error) {
    issues.push(diagnostic('INVALID_RESOLVED_CONSTRAINTS', 'error', error instanceof Error ? error.message : String(error), relative(root, path.join(paths.activeWork, changeId, 'constraints.yml'))))
  }

  try {
    const trace = await inspectAcceptanceTrace(root, changeId) ?? await buildAcceptanceTraceability(root, changeId)
    for (const issue of trace.issues) {
      issues.push(diagnostic('ACCEPTANCE_TRACE_DRIFT', 'warning', `${issue.acceptance}: ${issue.detail}`, relative(root, path.join(paths.activeWork, changeId, 'acceptance.yml'))))
    }
  } catch (error) {
    issues.push(diagnostic('MISSING_ACCEPTANCE_TRACE', 'warning', error instanceof Error ? error.message : String(error), relative(root, path.join(paths.activeWork, changeId, 'acceptance.yml'))))
  }

  for (const filename of (await listDirectory(paths.gates)).filter((item) => item.endsWith('.yml'))) {
    const target = path.join(paths.gates, filename)
    try {
      const definition = await readYaml(target, ProjectGateDefinitionSchema)
      if (definition.enforcement === 'HARD' && !definition.authority.trim()) {
        issues.push(diagnostic('INVALID_GATE_SOURCE', 'error', `Hard project gate ${definition.id} has no authoritative source.`, relative(root, target)))
      }
    } catch (error) {
      issues.push(diagnostic('INVALID_GATE_SOURCE', 'error', error instanceof Error ? error.message : String(error), relative(root, target)))
    }
  }

  for (const filename of ['protocol-gates.yml', 'project-gates.yml']) {
    const target = path.join(paths.activeWork, changeId, filename)
    if (!(await pathExists(target))) continue
    try {
      await readYaml(target, GateReportSchema)
    } catch (error) {
      issues.push(diagnostic('INVALID_GATE_REPORT', 'error', error instanceof Error ? error.message : String(error), relative(root, target)))
    }
  }
}

async function addEvidenceDiagnostics(issues: ValidationIssue[], root: string, changeId: string, completed: boolean): Promise<void> {
  const paths = repositoryPaths(root)
  const base = completed ? paths.completedWork : paths.activeWork
  const evidenceTarget = path.join(base, changeId, 'evidence.yml')
  const read = await readEvidence(root, changeId, completed)
  if (!read.document) return
  if (read.legacy) {
    issues.push(diagnostic('LEGACY_PROTOCOL', 'warning', `Change ${changeId} still uses legacy evidence.md; run evo migrate --apply.`, read.path ?? relative(root, path.join(base, changeId, 'evidence.md'))))
    return
  }
  try {
    const reconciliation = await reconcileEvidence(root, changeId, completed)
    for (const issue of reconciliation.issues.filter((item) => item.code !== 'LEGACY_EVIDENCE')) {
      issues.push(diagnostic('EVIDENCE_RECONCILIATION_DRIFT', 'error', issue.message, relative(root, evidenceTarget)))
    }
    const records = await readEvidenceRecords(root, changeId, completed)
    const referenced = new Set(read.document.acceptance.flatMap((item) => item.evidenceRefs))
    for (const record of records) {
      if (!referenced.has(record.id)) issues.push(diagnostic('ORPHAN_EVIDENCE_RECORD', 'warning', `Evidence record ${record.id} is not referenced by evidence.yml.`, relative(root, path.join(base, changeId, 'evidence', 'records', `${record.id}.yml`))))
      for (const artifact of record.artifacts) {
        const artifactTarget = path.resolve(root, artifact.path)
        const artifactRelative = path.relative(root, artifactTarget)
        if (artifactRelative.startsWith('..') || path.isAbsolute(artifactRelative)) {
          issues.push(diagnostic('MISSING_EVIDENCE_ARTIFACT', 'error', `Evidence artifact escapes the repository: ${artifact.path}.`, artifact.path))
          continue
        }
        try {
          const source = await readFile(artifactTarget)
          const digest = createHash('sha256').update(source).digest('hex')
          if (digest !== artifact.sha256) issues.push(diagnostic('MISSING_EVIDENCE_ARTIFACT', 'error', `Artifact hash changed: ${artifact.path}.`, relative(root, artifactTarget)))
        } catch {
          issues.push(diagnostic('MISSING_EVIDENCE_ARTIFACT', 'error', `Evidence artifact is missing: ${artifact.path}.`, relative(root, artifactTarget)))
        }
      }
    }
    const latest = completed ? undefined : records.at(-1)
    if (latest) {
      const current = await captureGitSnapshot(root)
      if ((latest.git.head !== current.head || latest.git.treeFingerprint !== current.treeFingerprint) && !onlyEvidencePaths(current.changedPaths, changeId, completed)) {
        issues.push(diagnostic('EVIDENCE_TREE_STALE', 'warning', `Working tree changed after the latest evidence record ${latest.id}; rerun affected evidence.`, relative(root, evidenceTarget)))
      }
    }
  } catch (error) {
    issues.push(diagnostic('INVALID_EVIDENCE_RECORD', 'error', error instanceof Error ? error.message : String(error), relative(root, evidenceTarget)))
  }
}

function onlyEvidencePaths(paths: readonly string[], changeId: string, completed: boolean): boolean {
  const prefix = `.evo/work/${completed ? 'completed' : 'active'}/${changeId}/`
  return paths.length > 0 && paths.every((item) => item.startsWith(prefix) && (item === `${prefix}evidence.yml` || item.startsWith(`${prefix}evidence/`)))
}

/** Formats protocol violations and Doctor findings without applying repairs. */
export function formatDoctorReport(report: DoctorReport): string {
  const base = formatValidationReport(report)
  return `${base}\nDoctor checked: ${report.checkedAt} / Doctor 检查时间：${report.checkedAt}\nNo repairs were applied. / 未应用任何修复。`
}

async function addStaleDiagnostics(
  issues: ValidationIssue[],
  root: string,
  directory: string,
  staleDays: number,
  now: Date,
  code: string,
): Promise<void> {
  const threshold = staleDays * 24 * 60 * 60 * 1000
  for (const name of await listDirectory(directory)) {
    const target = path.join(directory, name)
    const metadata = await stat(target)
    if (now.getTime() - metadata.mtimeMs > threshold) {
      issues.push(diagnostic(code, 'warning', `${name} has not changed for more than ${staleDays} days.`, relative(root, target)))
    }
  }
}

async function addGoalLockDiagnostics(issues: ValidationIssue[], root: string, directory: string): Promise<void> {
  for (const filename of (await listDirectory(directory)).filter((item) => item.endsWith('.lock'))) {
    const target = path.join(directory, filename)
    const source = await readOptionalText(target)
    let pid: number | null = null
    try {
      const value = JSON.parse(source ?? '') as {pid?: unknown}
      if (typeof value.pid === 'number' && Number.isInteger(value.pid) && value.pid > 0) pid = value.pid
    } catch {
      issues.push(diagnostic('INVALID_GOAL_LOCK', 'warning', 'Goal lock is not valid JSON.', relative(root, target)))
      continue
    }
    if (pid === null) {
      issues.push(diagnostic('INVALID_GOAL_LOCK', 'warning', 'Goal lock has no valid process id.', relative(root, target)))
      continue
    }
    try {
      process.kill(pid, 0)
      issues.push(diagnostic('ACTIVE_GOAL_LOCK', 'info', `Goal runner process ${pid} is active.`, relative(root, target)))
    } catch {
      issues.push(diagnostic('STALE_GOAL_LOCK', 'warning', `Goal runner process ${pid} is not active; inspect before removing the lock.`, relative(root, target)))
    }
  }
}

function diagnostic(code: string, severity: 'error' | 'warning' | 'info', message: string, target: string): ValidationIssue {
  return {code, severity, message, path: target}
}

function relative(root: string, target: string): string {
  return path.relative(root, target).split(path.sep).join('/')
}

function sortDiagnostics(issues: readonly ValidationIssue[]): ValidationIssue[] {
  const order = {error: 0, warning: 1, info: 2} as const
  return [...issues].sort((left, right) => order[left.severity] - order[right.severity] || left.code.localeCompare(right.code))
}
