import {execFile as execFileCallback} from 'node:child_process'
import {createHash} from 'node:crypto'
import {readFile, stat} from 'node:fs/promises'
import path from 'node:path'
import {promisify} from 'node:util'

import type {GitSnapshot} from '../core/schemas.js'

const execFile = promisify(execFileCallback)

/** Captures the repository state that gives an evidence record its reproducibility context. */
export async function captureGitSnapshot(root: string, now = new Date()): Promise<GitSnapshot> {
  const resolvedRoot = path.resolve(root)
  const status = await runGit(resolvedRoot, ['status', '--short', '--branch', '--untracked-files=all'])
  const head = await runGit(resolvedRoot, ['rev-parse', 'HEAD'])
  const branch = parseBranch(status)
  const changedPaths = parseChangedPaths(status)
  const treeFingerprint = await fingerprintWorkingTree(resolvedRoot, changedPaths)
  return {
    branch,
    head: parseCommit(head),
    treeFingerprint,
    dirty: changedPaths.length > 0,
    changedPaths,
    changedPathsFingerprint: sha256(changedPaths.join('\n')),
    capturedAt: now.toISOString(),
  }
}

/** Returns a deterministic hash for command output or other text evidence. */
export function sha256(value: string | Uint8Array): string {
  return createHash('sha256').update(value).digest('hex')
}

async function fingerprintWorkingTree(root: string, changedPaths: readonly string[]): Promise<string> {
  const hash = createHash('sha256')
  hash.update('evo-source-tree-v1')
  hash.update('\0')
  for (const relative of changedPaths.filter((item) => !isEvidencePath(item))) {
    hash.update(relative)
    hash.update('\0')
    const target = path.resolve(root, relative)
    if (!isInside(root, target)) {
      hash.update('outside repository')
      hash.update('\0')
      continue
    }
    try {
      const details = await stat(target)
      if (!details.isFile()) {
        hash.update(`non-file:${details.mode}`)
        hash.update('\0')
        continue
      }
      hash.update(await readFile(target))
      hash.update('\0')
    } catch {
      hash.update('missing')
      hash.update('\0')
    }
  }
  return hash.digest('hex')
}

async function runGit(root: string, args: readonly string[]): Promise<string | null> {
  try {
    const result = await execFile('git', [...args], {cwd: root, timeout: 10_000, maxBuffer: 1_000_000})
    return result.stdout.trimEnd()
  } catch {
    return null
  }
}

function parseBranch(status: string | null): string | null {
  const first = status?.split('\n')[0]
  if (!first?.startsWith('## ')) return null
  const value = first.slice(3).split('...')[0]?.trim()
  return value && value !== 'HEAD' ? value : null
}

function parseCommit(value: string | null): string | null {
  return value && /^[a-f0-9]{40}$/u.test(value.trim()) ? value.trim() : null
}

function parseChangedPaths(status: string | null): string[] {
  if (!status) return []
  const paths = new Set<string>()
  for (const line of status.split('\n')) {
    if (!line || line.startsWith('## ')) continue
    const value = line.slice(3).trim()
    if (!value) continue
    const rename = value.split(' -> ')
    for (const item of rename) {
      const normalized = item.trim().replace(/^"|"$/gu, '')
      if (normalized) paths.add(normalized)
    }
  }
  return [...paths].sort((left, right) => left.localeCompare(right))
}

function isInside(root: string, target: string): boolean {
  const relative = path.relative(root, target)
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative))
}

function isEvidencePath(relative: string): boolean {
  return /^\.evo\/work\/(?:active|completed)\/[^/]+\/evidence(?:\.md|\.yml|\/)/u.test(relative)
}
