import {stat} from 'node:fs/promises'
import path from 'node:path'

import type {Config} from '../core/schemas.js'
import {pathExists} from '../repository/io.js'
import {listDirectory, openManagedRepository, readOptionalText} from '../repository/managed.js'
import {repositoryPaths} from '../repository/paths.js'
import {formatValidationReport, validateProject, type ValidationIssue, type ValidationReport} from './project.js'

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
  }

  const sorted = sortDiagnostics(issues)
  return {valid: !sorted.some((item) => item.severity === 'error'), issues: sorted, checkedAt: now.toISOString()}
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
