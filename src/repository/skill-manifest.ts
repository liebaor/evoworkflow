import {readFile, readdir} from 'node:fs/promises'
import path from 'node:path'

import {SkillManifestSchema, type SkillCategory, type SkillManifest} from '../core/schemas.js'
import {EvoError} from '../core/errors.js'
import {sha256} from './git-snapshot.js'
import {pathExists, writeTextAtomic} from './io.js'

/** Returns the derived manifest location; canonical Skill files remain authoritative. */
export function skillManifestPath(root: string): string {
  return path.join(path.resolve(root), 'skills', 'manifest.json')
}

/** Builds the deterministic Skill index from the repository's canonical SKILL.md files. */
export async function buildSkillManifest(root: string, evoVersion?: string): Promise<SkillManifest> {
  const resolvedRoot = path.resolve(root)
  const skillsRoot = path.join(resolvedRoot, 'skills')
  const packageSource = await readFile(path.join(resolvedRoot, 'package.json'), 'utf8')
  const packageValue = JSON.parse(packageSource) as {version?: unknown}
  const version = evoVersion ?? (typeof packageValue.version === 'string' ? packageValue.version : null)
  if (!version) throw new EvoError('package.json must declare a version before generating the Skill manifest.')
  const entries: SkillManifest['skills'][number][] = []
  for (const entry of (await readdir(skillsRoot, {withFileTypes: true})).filter((item) => item.isDirectory()).sort((left, right) => left.name.localeCompare(right.name))) {
    const target = path.join(skillsRoot, entry.name, 'SKILL.md')
    if (!(await pathExists(target))) throw new EvoError(`Canonical Skill ${entry.name} is missing SKILL.md.`)
    entries.push({name: entry.name, category: categoryForSkill(entry.name), sha256: sha256(await readFile(target))})
  }
  return SkillManifestSchema.parse({schemaVersion: 1, evoVersion: version, skills: entries})
}

/** Reads and validates the committed derived manifest. */
export async function readSkillManifest(root: string): Promise<SkillManifest> {
  const target = skillManifestPath(root)
  if (!(await pathExists(target))) throw new EvoError(`Missing derived Skill manifest: ${path.relative(path.resolve(root), target)}.`)
  let parsed: unknown
  try {
    parsed = JSON.parse(await readFile(target, 'utf8'))
  } catch (error) {
    throw new EvoError(`Invalid Skill manifest JSON: ${error instanceof Error ? error.message : String(error)}`)
  }
  return SkillManifestSchema.parse(parsed)
}

/** Writes the derived manifest in stable JSON form. */
export async function writeSkillManifest(root: string, manifest: SkillManifest): Promise<string> {
  const target = skillManifestPath(root)
  await writeTextAtomic(target, `${JSON.stringify(manifest, null, 2)}\n`)
  return path.relative(path.resolve(root), target).split(path.sep).join('/')
}

/** Assigns a stable non-authoritative category for display and diagnostics. */
export function categoryForSkill(name: string): SkillCategory {
  if (name === 'ask-evo') return 'router'
  if (name.startsWith('ask-evo-')) return 'discovery'
  if (name === 'evo-bug') return 'resilience'
  if (['evo-change', 'evo-goal', 'evo-grill-with-docs', 'evo-plan', 'evo-solution-discovery', 'evo-to-spec'].includes(name)) return 'planning'
  if (['evo-commit', 'evo-finish', 'evo-review', 'evo-verify'].includes(name)) return 'delivery'
  if (name === 'evo-implement') return 'execution'
  return 'workflow'
}
