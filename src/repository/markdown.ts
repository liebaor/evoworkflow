import {parse, stringify} from 'yaml'

import {EvoError} from '../core/errors.js'

export interface MarkdownDocument {
  readonly data: Record<string, unknown>
  readonly body: string
}

/** Parses YAML frontmatter from a narrative artifact. */
export function parseMarkdownDocument(source: string, target: string): MarkdownDocument {
  const match = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/u.exec(source)
  if (!match) throw new EvoError(`Missing YAML frontmatter in ${target}.`)
  let value: unknown
  try {
    value = parse(match[1] ?? '')
  } catch (error) {
    throw new EvoError(`Invalid YAML frontmatter in ${target}: ${error instanceof Error ? error.message : String(error)}`)
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) throw new EvoError(`Frontmatter in ${target} must be a mapping.`)
  return {data: value as Record<string, unknown>, body: match[2] ?? ''}
}

/** Serializes updated frontmatter while preserving the narrative body. */
export function formatMarkdownDocument(document: MarkdownDocument): string {
  return `---\n${stringify(document.data, {lineWidth: 0}).trimEnd()}\n---\n\n${document.body.replace(/^\n+/u, '').replace(/\n+$/u, '')}\n`
}
