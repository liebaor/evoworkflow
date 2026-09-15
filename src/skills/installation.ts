import {cp, lstat, mkdir, readFile, rename, rm, writeFile} from 'node:fs/promises'
import os from 'node:os'
import path from 'node:path'
import {fileURLToPath} from 'node:url'

import type {SkillManifest} from '../core/schemas.js'
import {isNodeError, pathExists} from '../repository/io.js'
import {buildSkillManifest, hashSkillContent} from '../repository/skill-manifest.js'
import {applyClaudeLink, inspectClaudeLinks, type ClaudeLinkObservation} from './links.js'

export type SkillInstallAction = 'INSTALL' | 'SAME' | 'UPDATE_CANDIDATE' | 'CONFLICT'
export type SkillUpdateAction = 'MISSING' | 'SAME' | 'UPDATE' | 'LOCAL_MODIFICATION' | 'CONFLICT'

export interface SkillAction {
  readonly name: string
  readonly source: string
  readonly target: string
  readonly expectedHash: string
  readonly actualHash: string | null
  readonly action: SkillInstallAction
  readonly reason: string
}

export interface SkillReceipt {
  readonly schemaVersion: 1
  readonly evoVersion: string
  readonly skills: Readonly<Record<string, string>>
  readonly claude: Readonly<Record<string, {readonly mode: 'SYMLINK' | 'COPY'; readonly sha256: string}>>
}

export interface SkillInstallPlan {
  readonly schemaVersion: 1
  readonly operation: 'install' | 'update'
  readonly mode: 'PREVIEW' | 'APPLIED'
  readonly sourceRoot: string
  readonly sourceSkillsRoot: string
  readonly canonicalRoot: string
  readonly claudeRoot: string
  readonly evoVersion: string
  readonly manifest: SkillManifest
  readonly actions: readonly SkillAction[]
  readonly claude: readonly ClaudeLinkObservation[]
  readonly warnings: readonly string[]
  readonly blockers: readonly string[]
  readonly applied: readonly string[]
}

export interface SkillInstallationOptions {
  readonly sourceRoot?: string
  readonly homeDirectory?: string
  readonly projectRoot?: string
  readonly now?: Date
}

const RECEIPT_NAME = '.evo-manifest.json'

/** Returns the package/source checkout that owns the canonical `skills/` directory. */
export function defaultSkillSourceRoot(): string {
  return path.resolve(fileURLToPath(new URL('../..', import.meta.url)))
}

export function canonicalSkillRoot(homeDirectory = os.homedir()): string {
  return path.join(path.resolve(homeDirectory), '.agents', 'skills')
}

export function claudeSkillRoot(homeDirectory = os.homedir()): string {
  return path.join(path.resolve(homeDirectory), '.claude', 'skills')
}

export function skillReceiptPath(canonicalRoot: string): string {
  return path.join(path.resolve(canonicalRoot), RECEIPT_NAME)
}

/** Builds a preview without writing the canonical or adapter directories. */
export async function planSkillInstallation(options: SkillInstallationOptions = {}): Promise<SkillInstallPlan> {
  return buildPlan('install', options)
}

/** Builds an update preview; only previously managed, changed Skills are safe update candidates. */
export async function planSkillUpdate(options: SkillInstallationOptions = {}): Promise<SkillInstallPlan> {
  return buildPlan('update', options)
}

/** Applies only missing Skills, or explicit safe update candidates for the update operation. */
export async function applySkillInstallation(plan: SkillInstallPlan): Promise<SkillInstallPlan> {
  const applied: string[] = []
  for (const action of plan.actions) {
    const shouldApply = action.action === 'INSTALL' || (plan.operation === 'update' && action.action === 'UPDATE_CANDIDATE')
    if (!shouldApply) continue
    await mkdir(path.dirname(action.target), {recursive: true})
    if (action.action === 'INSTALL') {
      if (await pathExists(action.target)) continue
      await cp(path.join(plan.sourceSkillsRoot, action.name), action.target, {recursive: true, errorOnExist: true, force: false})
    } else {
      await replaceManagedSkill(path.join(plan.sourceSkillsRoot, action.name), action.target)
    }
    applied.push(action.name)
  }

  const afterCanonical = await planSkillInstallation({sourceRoot: plan.sourceRoot, homeDirectory: path.dirname(path.dirname(plan.canonicalRoot)), projectRoot: plan.sourceRoot})
  if (afterCanonical.blockers.some((item) => item.includes('canonical'))) return {...afterCanonical, mode: 'APPLIED', applied}

  const managedHashes: Record<string, string> = {}
  for (const action of afterCanonical.actions) if (action.actualHash !== null) managedHashes[action.name] = action.actualHash
  const claude = await inspectClaudeLinks(afterCanonical.manifest, afterCanonical.canonicalRoot, afterCanonical.claudeRoot, managedHashes)
  for (const item of claude) {
    if (!['MISSING'].includes(item.status)) continue
    const result = await applyClaudeLink(item)
    if (result === 'SYMLINK' || result === 'COPY') applied.push(`claude:${item.name}:${result}`)
  }

  const finalPlan = await buildPlan(plan.operation, {sourceRoot: plan.sourceRoot, homeDirectory: path.dirname(path.dirname(plan.canonicalRoot)), projectRoot: plan.sourceRoot})
  await writeReceipt(finalPlan)
  return {...finalPlan, mode: 'APPLIED', applied}
}

/** Reads the derived installation receipt; invalid receipts are ignored and reported by the caller. */
export async function readSkillReceipt(canonicalRoot: string): Promise<SkillReceipt | null> {
  try {
    const value = JSON.parse(await readFile(skillReceiptPath(canonicalRoot), 'utf8')) as Partial<SkillReceipt>
    if (value.schemaVersion !== 1 || typeof value.evoVersion !== 'string' || !value.skills || typeof value.skills !== 'object') return null
    return {schemaVersion: 1, evoVersion: value.evoVersion, skills: value.skills as Record<string, string>, claude: (value.claude ?? {}) as Record<string, {mode: 'SYMLINK' | 'COPY'; sha256: string}>}
  } catch {
    return null
  }
}

export function formatSkillInstallPlan(plan: SkillInstallPlan): string {
  return [
    `Operation: ${plan.operation.toUpperCase()} (${plan.mode})`,
    `Source: ${plan.sourceSkillsRoot}`,
    `Canonical runtime: ${plan.canonicalRoot}`,
    `Claude adapter: ${plan.claudeRoot}`,
    `EVO version: ${plan.evoVersion}`,
    '',
    'Canonical Skills:',
    ...plan.actions.map((item) => `- ${item.name}: ${item.action} — ${item.reason}`),
    '',
    'Claude links:',
    ...plan.claude.map((item) => `- ${item.name}: ${item.status}${item.mode ? ` (${item.mode})` : ''} — ${item.detail}`),
    '',
    ...(plan.warnings.length > 0 ? ['Warnings:', ...plan.warnings.map((item) => `- ${item}`), ''] : []),
    ...(plan.blockers.length > 0 ? ['Blockers:', ...plan.blockers.map((item) => `- ${item}`), ''] : []),
    ...(plan.applied.length > 0 ? [`Applied: ${plan.applied.join(', ')}`] : ['No files were written.']),
  ].join('\n')
}

async function buildPlan(operation: 'install' | 'update', options: SkillInstallationOptions): Promise<SkillInstallPlan> {
  const sourceRoot = path.resolve(options.sourceRoot ?? defaultSkillSourceRoot())
  const sourceSkillsRoot = path.join(sourceRoot, 'skills')
  const homeDirectory = path.resolve(options.homeDirectory ?? os.homedir())
  const canonicalRoot = canonicalSkillRoot(homeDirectory)
  const claudeRoot = claudeSkillRoot(homeDirectory)
  const manifest = await buildSkillManifest(sourceRoot)
  const receipt = await readSkillReceipt(canonicalRoot)
  const actions: SkillAction[] = []
  for (const skill of manifest.skills) {
    const source = path.join(sourceSkillsRoot, skill.name)
    const target = path.join(canonicalRoot, skill.name)
    const actualHash = await installedSkillHash(target)
    const details = await safeLstat(target)
    if (details === null) {
      actions.push({name: skill.name, source, target, expectedHash: skill.sha256, actualHash: null, action: 'INSTALL', reason: 'canonical Skill is missing'})
    } else if (!details.isDirectory() || details.isSymbolicLink()) {
      actions.push({name: skill.name, source, target, expectedHash: skill.sha256, actualHash, action: 'CONFLICT', reason: 'canonical target is not a managed real directory'})
    } else if (actualHash === skill.sha256) {
      actions.push({name: skill.name, source, target, expectedHash: skill.sha256, actualHash, action: 'SAME', reason: 'canonical Skill hash matches the package source'})
    } else if (receipt?.skills[skill.name] === actualHash) {
      actions.push({name: skill.name, source, target, expectedHash: skill.sha256, actualHash, action: 'UPDATE_CANDIDATE', reason: 'canonical Skill matches the previous managed receipt and can be updated safely'})
    } else {
      actions.push({name: skill.name, source, target, expectedHash: skill.sha256, actualHash, action: 'CONFLICT', reason: 'local modification detected; no silent overwrite'})
    }
  }
  const managedHashes = receipt?.skills ?? {}
  const claude = await inspectClaudeLinks(manifest, canonicalRoot, claudeRoot, managedHashes)
  const blockers = [
    ...actions.filter((item) => item.action === 'CONFLICT').map((item) => `${item.name}: ${item.reason}`),
    ...claude.filter((item) => ['WRONG_SYMLINK', 'BROKEN_SYMLINK', 'REAL_DIRECTORY_CONFLICT', 'COPY_FALLBACK_DRIFT'].includes(item.status)).map((item) => `${item.name}: ${item.detail}`),
  ]
  const warnings = receipt === null && (await pathExists(canonicalRoot)) ? ['No managed installation receipt was found; differing files are treated as user conflicts.'] : []
  return {
    schemaVersion: 1,
    operation,
    mode: 'PREVIEW',
    sourceRoot,
    sourceSkillsRoot,
    canonicalRoot,
    claudeRoot,
    evoVersion: manifest.evoVersion,
    manifest,
    actions,
    claude,
    warnings,
    blockers,
    applied: [],
  }
}

async function writeReceipt(plan: SkillInstallPlan): Promise<void> {
  const skills: Record<string, string> = {}
  for (const action of plan.actions) {
    const hash = await installedSkillHash(action.target)
    if (hash !== null) skills[action.name] = hash
  }
  const claude: Record<string, {mode: 'SYMLINK' | 'COPY'; sha256: string}> = {}
  for (const item of plan.claude) {
    if ((item.mode === 'SYMLINK' || item.mode === 'COPY') && item.actualHash !== null) claude[item.name] = {mode: item.mode, sha256: item.actualHash}
  }
  await mkdir(plan.canonicalRoot, {recursive: true})
  await writeFile(skillReceiptPath(plan.canonicalRoot), `${JSON.stringify({schemaVersion: 1, evoVersion: plan.evoVersion, skills, claude}, null, 2)}\n`, 'utf8')
}

async function installedSkillHash(target: string): Promise<string | null> {
  try {
    return hashSkillContent(await readFile(path.join(target, 'SKILL.md'), 'utf8'))
  } catch {
    return null
  }
}

async function replaceManagedSkill(source: string, target: string): Promise<void> {
  const staging = `${target}.staging-${process.pid}-${Date.now()}`
  const backup = `${target}.backup-${process.pid}-${Date.now()}`
  await cp(source, staging, {recursive: true, errorOnExist: true, force: false})
  try {
    await rename(target, backup)
    try {
      await rename(staging, target)
    } catch (error) {
      await rename(backup, target).catch(() => undefined)
      throw error
    }
    await rm(backup, {recursive: true, force: true})
  } catch (error) {
    await rm(staging, {recursive: true, force: true}).catch(() => undefined)
    throw error
  }
}

async function safeLstat(target: string): Promise<Awaited<ReturnType<typeof lstat>> | null> {
  try {
    return await lstat(target)
  } catch (error) {
    if (isNodeError(error) && error.code === 'ENOENT') return null
    throw error
  }
}
