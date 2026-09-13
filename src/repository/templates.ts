import {readFile} from 'node:fs/promises'
import path from 'node:path'
import {fileURLToPath} from 'node:url'

const templatesRoot = fileURLToPath(new URL('../../templates/', import.meta.url))

/** Reads a package-owned template by its slash-separated relative path. */
export async function readTemplate(relativePath: string): Promise<string> {
  const target = path.resolve(templatesRoot, relativePath)
  const relative = path.relative(templatesRoot, target)
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error(`Template path escapes the package: ${relativePath}`)
  }
  return readFile(target, 'utf8')
}

/** Replaces declared template markers and rejects values that could create new markers. */
export function renderTemplate(source: string, values: Readonly<Record<string, string>>): string {
  let result = source
  for (const [name, value] of Object.entries(values)) {
    if (value.includes('{{') || value.includes('}}')) {
      throw new Error(`Template value for ${name} contains a reserved marker`)
    }
    result = result.replaceAll(`{{${name}}}`, value)
  }
  const unresolved = result.match(/\{\{[A-Z0-9_]+\}\}/gu)
  if (unresolved) throw new Error(`Unresolved template markers: ${unresolved.join(', ')}`)
  return result
}
