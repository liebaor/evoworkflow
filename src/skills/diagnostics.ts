import os from 'node:os'
import path from 'node:path'

import type {AgentClientObservation} from '../core/schemas.js'
import {discoverAgentClients, skillIdsInSource, type AgentDiscoveryOptions} from '../agents/discovery.js'
import {pathExists} from '../repository/io.js'
import {validateCodexMetadata, codexMetadataSkills, type CodexMetadataResult} from './metadata.js'
import {planSkillInstallation, readSkillReceipt, type SkillInstallationOptions} from './installation.js'
import {inspectClaudeLinks, type ClaudeLinkObservation} from './links.js'

export type SkillDiagnosticSeverity = 'ERROR' | 'WARNING' | 'INFO'

export interface SkillDiagnostic {
  readonly code: string
  readonly severity: SkillDiagnosticSeverity
  readonly client: 'codex' | 'claude-code' | 'opencode' | null
  readonly path: string | null
  readonly message: string
}

export interface SkillDoctorReport {
  readonly schemaVersion: 1
  readonly generatedAt: string
  readonly repository: string
  readonly sourceRoot: string
  readonly canonicalRoot: string
  readonly claudeRoot: string
  readonly evoVersion: string
  readonly canonical: readonly {readonly name: string; readonly action: string; readonly hash: string | null}[]
  readonly claude: readonly ClaudeLinkObservation[]
  readonly clients: readonly AgentClientObservation[]
  readonly metadata: readonly CodexMetadataResult[]
  readonly diagnostics: readonly SkillDiagnostic[]
  readonly status: 'PASS' | 'WARNING' | 'ERROR'
  readonly recommendedNextAction: string
}

export interface SkillDoctorOptions extends AgentDiscoveryOptions, SkillInstallationOptions {
  readonly now?: Date
}

/** Diagnoses the declared EVO installation contract and does not change any files. */
export async function runSkillDoctor(root: string, options: SkillDoctorOptions = {}): Promise<SkillDoctorReport> {
  const projectRoot = path.resolve(root)
  const homeDirectory = path.resolve(options.homeDirectory ?? os.homedir())
  const planOptions: SkillInstallationOptions = options.sourceRoot === undefined
    ? {homeDirectory, projectRoot}
    : {sourceRoot: options.sourceRoot, homeDirectory, projectRoot}
  const plan = await planSkillInstallation(planOptions)
  const diagnostics: SkillDiagnostic[] = []
  const add = (item: SkillDiagnostic): void => {
    if (!diagnostics.some((existing) => existing.code === item.code && existing.client === item.client && existing.path === item.path && existing.message === item.message)) diagnostics.push(item)
  }
  for (const item of plan.actions) {
    if (item.action === 'INSTALL') add({code: 'CANONICAL_SKILL_MISSING', severity: 'ERROR', client: null, path: item.target, message: `${item.name} is missing from the canonical runtime root.`})
    if (item.action === 'CONFLICT') add({code: item.reason.includes('local modification') ? 'CANONICAL_SKILL_VERSION_DRIFT' : 'CANONICAL_SKILL_INVALID', severity: 'ERROR', client: null, path: item.target, message: `${item.name}: ${item.reason}.`})
  }
  if (plan.warnings.length > 0) add({code: 'SKILL_MANIFEST_STALE', severity: 'WARNING', client: null, path: plan.canonicalRoot, message: plan.warnings.join(' ')})

  const clients = await discoverAgentClients(projectRoot, options)
  const claudeAvailable = clients.some((client) => client.client === 'claude-code' && client.executable === 'FOUND')
  for (const client of clients) {
    if (client.executable === 'MISSING') {
      add({code: `${clientCode(client.client)}_NOT_FOUND`, severity: 'INFO', client: client.client, path: null, message: `${client.client} executable was not found; installation contract remains inspectable.`})
      continue
    }
    const expectedSource = client.client === 'claude-code' ? '~/.claude/skills' : '~/.agents/skills'
    if (!client.skillSources.includes(expectedSource)) add({code: `${clientCode(client.client)}_SKILL_NOT_VISIBLE`, severity: 'ERROR', client: client.client, path: expectedSource, message: `${client.client} does not report the expected native Skill source ${expectedSource}.`})
  }

  const receipt = await readSkillReceipt(plan.canonicalRoot)
  const claude = await inspectClaudeLinks(plan.manifest, plan.canonicalRoot, plan.claudeRoot, receipt?.skills ?? {})
  for (const item of claudeAvailable ? claude : []) {
    if (item.status === 'MISSING') add({code: 'CLAUDE_SKILL_MISSING', severity: 'ERROR', client: 'claude-code', path: item.target, message: `${item.name} has no Claude adapter entry.`})
    if (item.status === 'WRONG_SYMLINK') add({code: 'CLAUDE_SKILL_WRONG_SYMLINK', severity: 'ERROR', client: 'claude-code', path: item.target, message: item.detail})
    if (item.status === 'BROKEN_SYMLINK') add({code: 'CLAUDE_SKILL_BROKEN_SYMLINK', severity: 'ERROR', client: 'claude-code', path: item.target, message: item.detail})
    if (item.status === 'REAL_DIRECTORY_CONFLICT') add({code: 'CLAUDE_SKILL_CONFLICT', severity: 'ERROR', client: 'claude-code', path: item.target, message: item.detail})
    if (item.status === 'COPY_FALLBACK_DRIFT') add({code: 'CLAUDE_SKILL_COPY_DRIFT', severity: 'ERROR', client: 'claude-code', path: item.target, message: item.detail})
  }

  const metadata = await Promise.all(codexMetadataSkills.map((skill) => validateCodexMetadata(plan.sourceRoot, skill)))
  for (const item of metadata.filter((value) => !value.valid)) add({code: 'CODEX_METADATA_INVALID', severity: 'ERROR', client: 'codex', path: item.path, message: `${item.skill}: ${item.errors.join('; ')}`})
  await reportLegacySources(projectRoot, homeDirectory, plan.manifest.skills.map((skill) => skill.name), add)

  diagnostics.sort(compareDiagnostics)
  const status = diagnostics.some((item) => item.severity === 'ERROR') ? 'ERROR' : diagnostics.some((item) => item.severity === 'WARNING') ? 'WARNING' : 'PASS'
  return {
    schemaVersion: 1,
    generatedAt: (options.now ?? new Date()).toISOString(),
    repository: projectRoot,
    sourceRoot: plan.sourceRoot,
    canonicalRoot: plan.canonicalRoot,
    claudeRoot: plan.claudeRoot,
    evoVersion: plan.evoVersion,
    canonical: plan.actions.map((item) => ({name: item.name, action: item.action, hash: item.actualHash})),
    claude,
    clients,
    metadata,
    diagnostics,
    status,
    recommendedNextAction: status === 'ERROR' ? 'run evo skills install --apply after reviewing conflicts, then rerun evo skills doctor' : status === 'WARNING' ? 'review warnings and legacy sources before using another Harness' : 'EVO Skill installation contract is healthy',
  }
}

export function formatSkillDoctorReport(report: SkillDoctorReport): string {
  return [
    `EVO Skill Doctor: ${report.status}`,
    `Canonical source: ${report.sourceRoot}`,
    `Canonical runtime: ${report.canonicalRoot}`,
    `Claude adapter: ${report.claudeRoot}`,
    `EVO version: ${report.evoVersion}`,
    '',
    'Clients:',
    ...report.clients.map((item) => `- ${item.client}: ${item.executable}${item.version ? ` ${item.version}` : ''}; skills=${item.skillSources.join(', ') || 'none'}`),
    '',
    'Diagnostics:',
    ...(report.diagnostics.length > 0 ? report.diagnostics.map((item) => `${item.severity} ${item.code}${item.client ? ` [${item.client}]` : ''}: ${item.message}`) : ['none']),
    `Recommended next action: ${report.recommendedNextAction}`,
  ].join('\n')
}

async function reportLegacySources(root: string, home: string, skillNames: readonly string[], add: (item: SkillDiagnostic) => void): Promise<void> {
  const candidates = [
    path.join(root, '.codex', 'skills'),
    path.join(root, '.opencode', 'skills'),
    path.join(home, '.codex', 'skills'),
    path.join(home, '.opencode', 'skills'),
  ]
  for (const candidate of candidates) {
    if (!(await pathExists(candidate))) continue
    const ids = await skillIdsInSource(candidate)
    if (ids.some((id) => skillNames.includes(id))) add({code: 'LEGACY_EVO_SKILL_SOURCE', severity: 'WARNING', client: null, path: candidate, message: `Historical EVO Skill source detected at ${candidate}; do not delete it automatically.`})
  }
}

function clientCode(client: AgentClientObservation['client']): string {
  return client === 'claude-code' ? 'CLAUDE' : client.toUpperCase()
}

function compareDiagnostics(left: SkillDiagnostic, right: SkillDiagnostic): number {
  const severity = {ERROR: 0, WARNING: 1, INFO: 2}
  return severity[left.severity] - severity[right.severity] || left.code.localeCompare(right.code) || (left.path ?? '').localeCompare(right.path ?? '')
}
