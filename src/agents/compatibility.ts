import {readFile} from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'

import {parse} from 'yaml'

import {
  AgentCompatibilityReportSchema,
  type AgentClient,
  type AgentClientObservation,
  type AgentCompatibilityReport,
  type AgentDiagnostic,
  type SkillManifest,
  type SkillManifestRelation,
} from '../core/schemas.js'
import {discoverAgentClients, skillIdsInSource, type AgentDiscoveryOptions} from './discovery.js'
import {buildSkillManifest, readSkillManifest} from '../repository/skill-manifest.js'
import {pathExists} from '../repository/io.js'
import {listDirectory, readOptionalText} from '../repository/managed.js'
import {repositoryPaths} from '../repository/paths.js'
import {sha256} from '../repository/git-snapshot.js'

export interface CompatibilityOptions extends AgentDiscoveryOptions {
  readonly now?: Date
}

interface ObservedSkill {
  readonly id: string
  readonly source: string
  readonly hash: string | null
  readonly declaredName: string | null
  readonly invalid: boolean
}

/** Builds a deterministic, report-only compatibility view over one repository. */
export async function inspectAgentCompatibility(root: string, options: CompatibilityOptions = {}): Promise<AgentCompatibilityReport> {
  const paths = repositoryPaths(root)
  const homeDirectory = path.resolve(options.homeDirectory ?? os.homedir())
  const diagnostics: AgentDiagnostic[] = []
  const diagnosticKeys = new Set<string>()
  const addDiagnostic = (value: AgentDiagnostic): void => {
    const key = [value.code, value.client ?? '', value.path ?? '', value.message].join('\0')
    if (diagnosticKeys.has(key)) return
    diagnosticKeys.add(key)
    diagnostics.push(value)
  }

  const agentsSource = await readOptionalText(paths.agents)
  if (agentsSource === null) {
    addDiagnostic(diagnostic('AGENTS_MISSING', 'ERROR', null, null, 'Canonical AGENTS.md is missing from the repository root.'))
  }

  const clients = await discoverAgentClients(paths.root, options)
  for (const observation of clients) await inspectClient(paths.root, homeDirectory, observation, agentsSource, addDiagnostic)

  const manifest = await inspectManifest(paths.root, addDiagnostic)
  const duplicateSkillIds = await findDuplicateSkillIds(paths.root, homeDirectory, clients, addDiagnostic)
  diagnostics.sort(compareDiagnostics)
  const report = AgentCompatibilityReportSchema.parse({
    schemaVersion: 1,
    generatedAt: (options.now ?? new Date()).toISOString(),
    repository: paths.root,
    canonicalInstruction: agentsSource === null ? null : 'AGENTS.md',
    clients,
    manifest,
    duplicateSkillIds,
    diagnostics,
    recommendedNextAction: diagnostics.some((item) => item.severity === 'ERROR')
      ? 'review and resolve ERROR compatibility findings before using another Harness'
      : diagnostics.some((item) => item.severity === 'WARNING')
        ? 'review evo agents setup preview and remaining compatibility warnings'
        : 'no compatibility action is required; continue with the current repository protocol',
  })
  return report
}

/** Runs compatibility inspection plus report-only indicators of possible concurrent writers. */
export async function runAgentDoctor(root: string, options: CompatibilityOptions = {}): Promise<AgentCompatibilityReport> {
  const report = await inspectAgentCompatibility(root, options)
  const extra: AgentDiagnostic[] = []
  const paths = repositoryPaths(root)
  if (await pathExists(path.join(paths.root, '.git', 'index.lock'))) {
    extra.push(diagnostic('MULTIPLE_WRITER_DETECTED', 'WARNING', null, '.git/index.lock', 'Git index.lock exists; another Git writer may be active.'))
  }
  for (const filename of await listDirectory(path.join(paths.goals, '.locks'))) {
    if (filename.endsWith('.lock')) extra.push(diagnostic('MULTIPLE_WRITER_DETECTED', 'WARNING', null, `.evo/goals/.locks/${filename}`, 'A Goal execution lock exists; do not run another writer in this checkout.'))
  }
  const diagnostics = [...report.diagnostics, ...extra].sort(compareDiagnostics)
  return AgentCompatibilityReportSchema.parse({
    ...report,
    generatedAt: (options.now ?? new Date()).toISOString(),
    diagnostics,
    recommendedNextAction: diagnostics.some((item) => item.severity === 'ERROR')
      ? 'review and resolve ERROR compatibility findings before using another Harness'
      : diagnostics.some((item) => item.severity === 'WARNING')
        ? 'review evo agents setup preview and remaining compatibility warnings'
        : 'no compatibility action is required; continue with the current repository protocol',
  })
}

/** Formats compatibility output without hiding the distinction between errors and advisories. */
export function formatAgentCompatibilityReport(report: AgentCompatibilityReport): string {
  return [
    `Repository: ${report.repository}`,
    `Canonical instruction: ${report.canonicalInstruction ?? 'missing'}`,
    `Manifest: ${report.manifest.status} (${report.manifest.actualVersion ?? 'missing'})`,
    ...report.clients.map((client) => `${client.client}: ${client.executable}${client.version ? ` ${client.version}` : ''}; instructions=${client.instructionSources.join(', ') || 'none'}; skills=${client.skillSources.join(', ') || 'none'}`),
    `Duplicate Skill ids: ${report.duplicateSkillIds.join(', ') || 'none'}`,
    'Diagnostics:',
    ...(report.diagnostics.length > 0 ? report.diagnostics.map((item) => `${item.severity} ${item.code}${item.client ? ` [${item.client}]` : ''}: ${item.message}`) : ['none']),
    `Recommended next action: ${report.recommendedNextAction}`,
  ].join('\n')
}

async function inspectClient(
  root: string,
  homeDirectory: string,
  observation: AgentClientObservation,
  agentsSource: string | null,
  addDiagnostic: (value: AgentDiagnostic) => void,
): Promise<void> {
  if (observation.executable === 'MISSING') {
    const code = observation.client === 'claude-code' ? 'CLAUDE_NOT_FOUND' : observation.client === 'opencode' ? 'OPENCODE_NOT_FOUND' : 'CODEX_NOT_FOUND'
    addDiagnostic(diagnostic(code, 'INFO', observation.client, null, `${observation.client} executable was not found on PATH; repository compatibility remains inspectable.`))
    return
  }
  if (observation.client === 'claude-code') {
    const target = path.join(root, 'CLAUDE.md')
    const source = await readOptionalText(target)
    if (source === null) {
      addDiagnostic(diagnostic('CLAUDE_BRIDGE_MISSING', 'WARNING', observation.client, 'CLAUDE.md', 'Claude Code is installed but the thin CLAUDE.md -> @AGENTS.md bridge is missing.'))
    } else if (source.trim() !== '@AGENTS.md') {
      addDiagnostic(diagnostic('CLAUDE_IMPORT_INVALID', 'ERROR', observation.client, 'CLAUDE.md', 'CLAUDE.md must contain exactly the thin @AGENTS.md import or require human merge.'))
      if (agentsSource !== null && containsCopiedAuthority(source, agentsSource)) {
        addDiagnostic(diagnostic('CLAUDE_AUTHORITY_DUPLICATED', 'WARNING', observation.client, 'CLAUDE.md', 'CLAUDE.md appears to copy canonical AGENTS.md rules instead of importing them.'))
      }
    }
  }
  if (observation.client === 'codex') await reportDuplicateInstruction(root, 'CODEX.md', observation.client, addDiagnostic)
  if (observation.client === 'opencode') await reportDuplicateInstruction(root, 'OPENCODE.md', observation.client, addDiagnostic)
  if (!observation.instructionSources.includes('AGENTS.md')) {
    addDiagnostic(diagnostic('AGENTS_NOT_DISCOVERED', 'ERROR', observation.client, null, `${observation.client} does not discover the canonical AGENTS.md instruction source.`))
  }
  for (const source of observation.skillSources) {
    const target = resolveDiscoveredPath(root, homeDirectory, source)
  for (const skill of await inspectSkillsInSource(target, source, addDiagnostic)) {
      if (skill.invalid) continue
    }
  }
}

async function reportDuplicateInstruction(root: string, filename: string, client: AgentClient, addDiagnostic: (value: AgentDiagnostic) => void): Promise<void> {
  if (await pathExists(path.join(root, filename))) addDiagnostic(diagnostic('AGENT_AUTHORITY_DUPLICATED', 'WARNING', client, filename, `${filename} is present beside AGENTS.md and may create a second repository-rules authority.`))
}

async function inspectManifest(root: string, addDiagnostic: (value: AgentDiagnostic) => void): Promise<SkillManifestRelation> {
  let expected: SkillManifest | null = null
  try {
    expected = await buildSkillManifest(root)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    addDiagnostic(diagnostic(message.includes('missing SKILL.md') ? 'SKILL_MISSING' : 'SKILL_INVALID', 'ERROR', null, 'skills', message))
  }
  let actual: SkillManifest | null = null
  try {
    actual = await readSkillManifest(root)
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    addDiagnostic(diagnostic('SKILL_MANIFEST_MISMATCH', 'ERROR', null, 'skills/manifest.json', message))
  }
  if (actual === null) return {status: 'MISSING', expectedVersion: expected?.evoVersion ?? null, actualVersion: null, driftedSkills: []}
  if (expected === null) return {status: 'INVALID', expectedVersion: null, actualVersion: actual.evoVersion, driftedSkills: []}
  const expectedByName = new Map(expected.skills.map((skill) => [skill.name, skill.sha256]))
  const actualByName = new Map(actual.skills.map((skill) => [skill.name, skill.sha256]))
  const driftedSkills = [...new Set([...expectedByName.keys(), ...actualByName.keys()].filter((name) => expectedByName.get(name) !== actualByName.get(name)))].sort()
  if (expected.evoVersion !== actual.evoVersion || driftedSkills.length > 0) {
    addDiagnostic(diagnostic('SKILL_MANIFEST_MISMATCH', 'ERROR', null, 'skills/manifest.json', `Manifest differs from canonical source${expected.evoVersion !== actual.evoVersion ? ` in EVO version ${actual.evoVersion} -> ${expected.evoVersion}` : ''}${driftedSkills.length > 0 ? ` for ${driftedSkills.join(', ')}` : ''}.`))
    return {status: 'STALE', expectedVersion: expected.evoVersion, actualVersion: actual.evoVersion, driftedSkills}
  }
  return {status: 'CURRENT', expectedVersion: expected.evoVersion, actualVersion: actual.evoVersion, driftedSkills: []}
}

async function findDuplicateSkillIds(root: string, homeDirectory: string, clients: readonly AgentClientObservation[], addDiagnostic: (value: AgentDiagnostic) => void): Promise<string[]> {
  const result = new Set<string>()
  for (const observation of clients) {
    const byId = new Map<string, ObservedSkill[]>()
    for (const source of observation.skillSources) {
      const target = resolveDiscoveredPath(root, homeDirectory, source)
      for (const skill of await inspectSkillsInSource(target, source, addDiagnostic, observation.client)) {
        const values = byId.get(skill.id) ?? []
        values.push(skill)
        byId.set(skill.id, values)
      }
    }
    for (const [id, values] of byId) {
      if (values.length < 2) continue
      result.add(id)
      const hashes = new Set(values.map((item) => item.hash).filter((value): value is string => value !== null))
      if (hashes.size > 1) {
        addDiagnostic(diagnostic('SKILL_VERSION_DRIFT', 'ERROR', observation.client, null, `${id} resolves to incompatible Skill hashes across ${values.map((item) => item.source).join(', ')}.`))
      } else {
        addDiagnostic(diagnostic('DUPLICATE_AGENT_SKILL', 'WARNING', observation.client, null, `${id} is discoverable from multiple Skill sources: ${values.map((item) => item.source).join(', ')}.`))
      }
    }
  }
  return [...result].sort()
}

async function inspectSkillsInSource(
  sourceRoot: string,
  displaySource: string,
  addDiagnostic: (value: AgentDiagnostic) => void,
  client: AgentClient | null = null,
): Promise<ObservedSkill[]> {
  const ids = await skillIdsInSource(sourceRoot)
  const result: ObservedSkill[] = []
  for (const id of ids) {
    const target = path.join(sourceRoot, id, 'SKILL.md')
    try {
      const source = await readFile(target, 'utf8')
      const match = /^---\n([\s\S]*?)\n---\n/u.exec(source)
      if (!match) {
        addDiagnostic(diagnostic('SKILL_INVALID', 'ERROR', client, `${displaySource}/${id}/SKILL.md`, 'Skill is missing YAML frontmatter.'))
        result.push({id, source: displaySource, hash: null, declaredName: null, invalid: true})
        continue
      }
      const metadata = parse(match[1] ?? '') as {name?: unknown}
      const declaredName = typeof metadata.name === 'string' ? metadata.name : null
      if (declaredName !== id) addDiagnostic(diagnostic('SKILL_NAME_MISMATCH', 'ERROR', client, `${displaySource}/${id}/SKILL.md`, `Skill directory ${id} declares frontmatter name ${declaredName ?? 'missing'}.`))
      result.push({id, source: displaySource, hash: sha256(source), declaredName, invalid: declaredName !== id})
    } catch (error) {
      addDiagnostic(diagnostic('SKILL_INVALID', 'ERROR', client, `${displaySource}/${id}/SKILL.md`, error instanceof Error ? error.message : String(error)))
      result.push({id, source: displaySource, hash: null, declaredName: null, invalid: true})
    }
  }
  return result
}

function containsCopiedAuthority(candidate: string, canonical: string): boolean {
  if (candidate.trim() === canonical.trim()) return true
  const meaningful = canonical.split(/\r?\n/u).map((line) => line.trim()).filter((line) => line.length >= 24).slice(0, 5)
  return meaningful.length >= 2 && meaningful.filter((line) => candidate.includes(line)).length >= 2
}

function resolveDiscoveredPath(root: string, homeDirectory: string, value: string): string {
  if (value === '~') return homeDirectory
  if (value.startsWith('~/')) return path.join(homeDirectory, value.slice(2))
  return path.resolve(root, value)
}

function diagnostic(code: string, severity: AgentDiagnostic['severity'], client: AgentClient | null, target: string | null, message: string): AgentDiagnostic {
  return {code, severity, client, path: target, message}
}

function compareDiagnostics(left: AgentDiagnostic, right: AgentDiagnostic): number {
  const severity = {ERROR: 0, WARNING: 1, INFO: 2}
  return severity[left.severity] - severity[right.severity]
    || left.code.localeCompare(right.code)
    || (left.client ?? '').localeCompare(right.client ?? '')
    || (left.path ?? '').localeCompare(right.path ?? '')
    || left.message.localeCompare(right.message)
}
