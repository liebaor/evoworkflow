import {readFile} from 'node:fs/promises'
import path from 'node:path'

import type {AcceptanceCriterion} from '../core/schemas.js'
import {EvoError} from '../core/errors.js'
import {pathExists} from './io.js'
import {parseMarkdownDocument} from './markdown.js'
import {repositoryPaths} from './paths.js'

export interface AcceptanceSource {
  readonly path: string
  readonly criteria: readonly AcceptanceCriterion[]
  readonly legacy: boolean
}

/** Resolves the approved acceptance authority for a Change and extracts its exact criterion ids. */
export async function readAcceptanceSource(root: string, changeId: string, completed = false): Promise<AcceptanceSource> {
  if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/u.test(changeId)) throw new EvoError(`Invalid Change id: ${changeId}`)
  const paths = repositoryPaths(root)
  const changeRoot = path.join(completed ? paths.completedWork : paths.activeWork, changeId)
  const changeTarget = path.join(changeRoot, 'change.md')
  const specificationTarget = path.join(changeRoot, 'spec.md')
  const changeSource = await readFileIfPresent(changeTarget)
  const changeWeight = changeSource ? parseMarkdownDocument(changeSource, changeTarget).data.weight : undefined
  const candidates = changeWeight === 'LARGE' && await pathExists(specificationTarget)
    ? [specificationTarget, changeTarget]
    : [changeTarget]
  for (const target of candidates) {
    if (!(await pathExists(target))) continue
    const source = await readFile(target, 'utf8')
    const document = parseMarkdownDocument(source, target)
    const criteria = extractAcceptanceCriteria(document.body, relative(paths.root, target))
    if (criteria.length > 0 || path.basename(target) === 'change.md') {
      if (criteria.length === 0 && path.basename(target) === 'change.md') {
        const legacyEvidence = path.join(changeRoot, 'evidence.md')
        if (await pathExists(legacyEvidence)) {
          const evidenceSource = await readFile(legacyEvidence, 'utf8')
          const fallback = extractAcceptanceCriteria(evidenceSource, relative(paths.root, target))
          if (fallback.length > 0) return {path: relative(paths.root, target), criteria: fallback, legacy: true}
        }
      }
      return {path: relative(paths.root, target), criteria, legacy: !hasCanonicalAcceptance(document.body)}
    }
  }
  throw new EvoError(`Change ${changeId} has no change.md or spec.md acceptance authority.`)
}

async function readFileIfPresent(target: string): Promise<string | null> {
  return await pathExists(target) ? readFile(target, 'utf8') : null
}

/** Extracts criterion ids from canonical bullets, tables, and legacy prose. */
export function extractAcceptanceCriteria(source: string, sourcePath: string): AcceptanceCriterion[] {
  const found = new Map<string, AcceptanceCriterion>()
  for (const line of source.split('\n')) {
    const ids = [...line.matchAll(/\b(AC-[A-Za-z0-9][A-Za-z0-9_-]*(?:\.[A-Za-z0-9][A-Za-z0-9_-]*)*)\b/gu)]
    for (const match of ids) {
      const id = match[1]
      if (!id || found.has(id)) continue
      const title = criterionTitle(line, id)
      found.set(id, {id, title, source: sourcePath})
    }
  }
  return [...found.values()].sort((left, right) => left.id.localeCompare(right.id))
}

function hasCanonicalAcceptance(source: string): boolean {
  return source.split('\n').some((line) => /^\s*(?:[-*]\s+)?(?:\*\*)?AC-[A-Za-z0-9][A-Za-z0-9_-]*(?:\.[A-Za-z0-9][A-Za-z0-9_-]*)*(?:\*\*)?\s*:/u.test(line))
}

function criterionTitle(line: string, id: string): string {
  const after = line.slice((line.indexOf(id) ?? 0) + id.length)
    .replace(/^[\s*:_|`-]+/u, '')
    .replace(/[|`]+$/u, '')
    .trim()
  if (after.length > 0) return after
  return `Acceptance criterion ${id}`
}

function relative(root: string, target: string): string {
  return path.relative(root, target).split(path.sep).join('/')
}
