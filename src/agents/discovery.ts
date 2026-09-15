import {execFile as execFileCallback} from 'node:child_process'
import {readdir, stat} from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import {promisify} from 'node:util'

import {AgentClientObservationSchema, type AgentClient, type AgentClientObservation} from '../core/schemas.js'

const execFile = promisify(execFileCallback)

const clientCommands: Readonly<Record<AgentClient, string>> = {
  codex: 'codex',
  'claude-code': 'claude',
  opencode: 'opencode',
}

export interface AgentDiscoveryOptions {
  readonly homeDirectory?: string
  readonly locateExecutable?: (command: string) => Promise<boolean>
  readonly readVersion?: (command: string) => Promise<string | null>
}

/** Discovers installed clients and repository/user Skill roots without persisting observations. */
export async function discoverAgentClients(root: string, options: AgentDiscoveryOptions = {}): Promise<AgentClientObservation[]> {
  const resolvedRoot = path.resolve(root)
  const homeDirectory = path.resolve(options.homeDirectory ?? os.homedir())
  const clients: AgentClient[] = ['codex', 'claude-code', 'opencode']
  const observations = await Promise.all(clients.map(async (client) => {
    const command = clientCommands[client]
    const found = await (options.locateExecutable ?? locateExecutable)(command)
    const version = found ? await (options.readVersion ?? readVersion)(command) : null
    const instructionSources = await discoverInstructionSources(resolvedRoot, client)
    const skillSources = await discoverSkillSources(resolvedRoot, homeDirectory, client)
    return AgentClientObservationSchema.parse({
      client,
      executable: found ? 'FOUND' : 'MISSING',
      version,
      instructionSources,
      skillSources,
    })
  }))
  return observations
}

/** Maps the stable client id to the executable name used for runtime discovery. */
export function executableForClient(client: AgentClient): string {
  return clientCommands[client]
}

async function discoverInstructionSources(root: string, client: AgentClient): Promise<string[]> {
  const names = client === 'claude-code' ? ['AGENTS.md', 'CLAUDE.md'] : client === 'codex' ? ['AGENTS.md', 'CODEX.md'] : ['AGENTS.md', 'OPENCODE.md']
  const paths = await existingPaths(root, names.map((name) => path.join(root, name)))
  return paths.map((target) => displayPath(root, target, os.homedir()))
}

async function discoverSkillSources(root: string, homeDirectory: string, client: AgentClient): Promise<string[]> {
  // These are Harness contracts, not a generic "any skills directory" scan.
  // EVO's authoring source (`<package>/skills`) is intentionally excluded.
  const userCandidates = client === 'codex'
    ? [path.join(homeDirectory, '.agents', 'skills')]
    : client === 'claude-code'
      ? [path.join(homeDirectory, '.claude', 'skills')]
      : [path.join(homeDirectory, '.config', 'opencode', 'skills'), path.join(homeDirectory, '.claude', 'skills'), path.join(homeDirectory, '.agents', 'skills')]
  const projectCandidates = client === 'codex'
    ? [path.join(root, '.agents', 'skills')]
    : client === 'claude-code'
      ? [path.join(root, '.claude', 'skills')]
      : [path.join(root, '.opencode', 'skills'), path.join(root, '.claude', 'skills'), path.join(root, '.agents', 'skills')]
  const candidates = [...projectCandidates, ...userCandidates]
  const existing = await existingDirectories(candidates)
  return [...new Set(existing.map((target) => displayPath(root, target, homeDirectory)))]
}

async function existingPaths(root: string, candidates: readonly string[]): Promise<string[]> {
  const result: string[] = []
  for (const target of candidates) if (await isFile(target)) result.push(target)
  return result.map((target) => path.resolve(root, target))
}

async function existingDirectories(candidates: readonly string[]): Promise<string[]> {
  const result: string[] = []
  for (const target of candidates) if (await isDirectory(target)) result.push(path.resolve(target))
  return result
}

async function isFile(target: string): Promise<boolean> {
  try {
    return (await stat(target)).isFile()
  } catch {
    return false
  }
}

async function isDirectory(target: string): Promise<boolean> {
  try {
    return (await stat(target)).isDirectory()
  } catch {
    return false
  }
}

async function locateExecutable(command: string): Promise<boolean> {
  try {
    await execFile(process.platform === 'win32' ? 'where' : 'which', [command], {timeout: 10_000, maxBuffer: 100_000})
    return true
  } catch {
    return false
  }
}

async function readVersion(command: string): Promise<string | null> {
  try {
    const result = await execFile(command, ['--version'], {timeout: 10_000, maxBuffer: 100_000})
    return result.stdout.split(/\r?\n/u).map((line) => line.trim()).find((line) => line.length > 0) ?? null
  } catch {
    return null
  }
}

function displayPath(root: string, target: string, homeDirectory: string): string {
  const resolvedRoot = path.resolve(root)
  const resolvedTarget = path.resolve(target)
  const relative = path.relative(resolvedRoot, resolvedTarget)
  if (relative && !relative.startsWith('..') && !path.isAbsolute(relative)) return relative.split(path.sep).join('/')
  const relativeHome = path.relative(path.resolve(homeDirectory), resolvedTarget)
  if (!relativeHome.startsWith('..') && !path.isAbsolute(relativeHome)) return `~/${relativeHome.split(path.sep).join('/')}`
  return resolvedTarget
}

/** Returns the Skill ids visible from one discovered source root. */
export async function skillIdsInSource(source: string): Promise<string[]> {
  if (!(await isDirectory(source))) return []
  const entries = await readdir(source, {withFileTypes: true})
  const candidates = entries.filter((entry) => entry.isDirectory() && /^[a-z0-9][a-z0-9-]*$/u.test(entry.name))
  const directSkills: string[] = []
  for (const entry of candidates) if (await isFile(path.join(source, entry.name, 'SKILL.md'))) directSkills.push(entry.name)
  return directSkills.sort()
}
