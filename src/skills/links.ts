import {cp, lstat, mkdir, realpath, symlink} from 'node:fs/promises'
import path from 'node:path'

import type {SkillManifest} from '../core/schemas.js'
import {isNodeError} from '../repository/io.js'
import {hashSkillContent} from '../repository/skill-manifest.js'
import {readFile} from 'node:fs/promises'

export type ClaudeLinkStatus =
  | 'MISSING'
  | 'CORRECT_SYMLINK'
  | 'WRONG_SYMLINK'
  | 'BROKEN_SYMLINK'
  | 'REAL_DIRECTORY_CONFLICT'
  | 'COPY_FALLBACK_CURRENT'
  | 'COPY_FALLBACK_DRIFT'

export type LinkMode = 'SYMLINK' | 'COPY' | null

export interface ClaudeLinkObservation {
  readonly name: string
  readonly canonical: string
  readonly target: string
  readonly status: ClaudeLinkStatus
  readonly mode: LinkMode
  readonly actualHash: string | null
  readonly detail: string
}

export interface ClaudeLinkInspectionOptions {
  /** Hash recorded before the last canonical update, if this link is managed. */
  readonly managedHash?: string
}

/** Inspects Claude's native directory without deleting or changing user files. */
export async function inspectClaudeLink(
  name: string,
  canonicalRoot: string,
  claudeRoot: string,
  options: ClaudeLinkInspectionOptions = {},
): Promise<ClaudeLinkObservation> {
  const canonical = path.join(path.resolve(canonicalRoot), name)
  const target = path.join(path.resolve(claudeRoot), name)
  let details
  try {
    details = await lstat(target)
  } catch (error) {
    if (isNodeError(error) && error.code === 'ENOENT') {
      return observation(name, canonical, target, 'MISSING', null, null, 'Claude Skill link is absent.')
    }
    throw error
  }

  if (details.isSymbolicLink()) {
    let resolved: string
    try {
      resolved = await realpath(target)
    } catch {
      return observation(name, canonical, target, 'BROKEN_SYMLINK', 'SYMLINK', null, 'Claude Skill link is broken.')
    }
    const expected = await realpathIfPresent(canonical)
    if (expected !== null && samePath(resolved, expected)) {
      return observation(name, canonical, target, 'CORRECT_SYMLINK', 'SYMLINK', await skillHash(canonical), 'Claude Skill points to the canonical runtime source.')
    }
    return observation(name, canonical, target, 'WRONG_SYMLINK', 'SYMLINK', await skillHash(target), `Claude Skill points to ${resolved}, not ${canonical}.`)
  }

  if (details.isDirectory()) {
    const actualHash = await skillHash(target)
    const expectedHash = await skillHash(canonical)
    if (actualHash !== null && expectedHash !== null && actualHash === expectedHash) {
      return observation(name, canonical, target, 'COPY_FALLBACK_CURRENT', 'COPY', actualHash, 'Claude Skill is a current copy fallback.')
    }
    if (options.managedHash !== undefined && actualHash === options.managedHash) {
      return observation(name, canonical, target, 'COPY_FALLBACK_DRIFT', 'COPY', actualHash, 'Canonical Skill changed and the managed Claude copy is stale.')
    }
    return observation(name, canonical, target, 'REAL_DIRECTORY_CONFLICT', null, actualHash, 'Claude Skill is an existing real directory; it will not be overwritten.')
  }

  return observation(name, canonical, target, 'REAL_DIRECTORY_CONFLICT', null, null, 'Claude Skill target exists but is not a directory or link.')
}

/** Inspects all manifest Skills in deterministic order. */
export async function inspectClaudeLinks(
  manifest: SkillManifest,
  canonicalRoot: string,
  claudeRoot: string,
  managedHashes: Readonly<Record<string, string>> = {},
): Promise<ClaudeLinkObservation[]> {
  return Promise.all(manifest.skills.map((skill) => {
    const managedHash = managedHashes[skill.name]
    return inspectClaudeLink(skill.name, canonicalRoot, claudeRoot, managedHash === undefined ? {} : {managedHash})
  }))
}

/** Creates one safe Claude adapter entry, preferring a directory link. */
export async function applyClaudeLink(observation: ClaudeLinkObservation): Promise<'SYMLINK' | 'COPY' | 'NOOP' | 'BLOCKED'> {
  if (observation.status === 'CORRECT_SYMLINK' || observation.status === 'COPY_FALLBACK_CURRENT') return 'NOOP'
  if (observation.status !== 'MISSING') return 'BLOCKED'
  await mkdir(path.dirname(observation.target), {recursive: true})
  try {
    await symlink(observation.canonical, observation.target, process.platform === 'win32' ? 'junction' : 'dir')
    return 'SYMLINK'
  } catch (error) {
    if (!isLinkCreationError(error)) throw error
    await cp(observation.canonical, observation.target, {recursive: true, errorOnExist: true, force: false})
    return 'COPY'
  }
}

async function skillHash(target: string): Promise<string | null> {
  try {
    return hashSkillContent(await readFile(path.join(target, 'SKILL.md'), 'utf8'))
  } catch {
    return null
  }
}

async function realpathIfPresent(target: string): Promise<string | null> {
  try {
    return await realpath(target)
  } catch {
    return null
  }
}

function samePath(left: string, right: string): boolean {
  const normalize = (value: string) => process.platform === 'win32' ? value.toLowerCase() : value
  return normalize(path.resolve(left)) === normalize(path.resolve(right))
}

function isLinkCreationError(error: unknown): boolean {
  return isNodeError(error) && ['EACCES', 'EPERM', 'ENOTSUP', 'EOPNOTSUPP'].includes(error.code ?? '')
}

function observation(
  name: string,
  canonical: string,
  target: string,
  status: ClaudeLinkStatus,
  mode: LinkMode,
  actualHash: string | null,
  detail: string,
): ClaudeLinkObservation {
  return {name, canonical, target, status, mode, actualHash, detail}
}
