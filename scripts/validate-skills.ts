import {readdir, readFile, stat} from 'node:fs/promises'
import path from 'node:path'
import {fileURLToPath} from 'node:url'

import {parse} from 'yaml'
import {z} from 'zod'

const skillsRoot = fileURLToPath(new URL('../skills/', import.meta.url))
const expected = new Set([
  'ask-evo',
  'ask-evo-architect',
  'ask-evo-pm',
  'evo-bug',
  'evo-change',
  'evo-doctor',
  'evo-engineering',
  'evo-finish',
  'evo-goal',
  'evo-grill-with-docs',
  'evo-implement',
  'evo-init',
  'evo-plan',
  'evo-recover',
  'evo-review',
  'evo-solution-discovery',
  'evo-status',
  'evo-to-spec',
  'evo-verify',
])
const frontmatterSchema = z.object({name: z.string().min(1).max(63), description: z.string().min(20).max(500)})
const directories = (await readdir(skillsRoot, {withFileTypes: true}))
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort()
const errors: string[] = []

for (const name of expected) {
  if (!directories.includes(name)) errors.push(`Missing Skill directory: ${name}`)
}
for (const name of directories) {
  if (!expected.has(name)) errors.push(`Unexpected Skill directory: ${name}`)
  const target = path.join(skillsRoot, name, 'SKILL.md')
  try {
    const metadata = await stat(target)
    if (!metadata.isFile()) throw new Error('not a file')
    const source = await readFile(target, 'utf8')
    const match = /^---\n([\s\S]*?)\n---\n([\s\S]+)$/u.exec(source)
    if (!match) {
      errors.push(`${name}: missing YAML frontmatter`)
      continue
    }
    const frontmatter = frontmatterSchema.safeParse(parse(match[1] ?? ''))
    if (!frontmatter.success) {
      errors.push(`${name}: invalid frontmatter: ${frontmatter.error.message}`)
      continue
    }
    if (frontmatter.data.name !== name) errors.push(`${name}: frontmatter name is ${frontmatter.data.name}`)
    const body = match[2] ?? ''
    for (const heading of ['## Objective', '## Required outcomes', '## Stop conditions', '## Repository writes']) {
      if (!body.includes(heading)) errors.push(`${name}: missing ${heading}`)
    }
    if (/\{\{[^}]+\}\}|\b(?:TODO|TBD)\b/u.test(source)) errors.push(`${name}: contains an unfinished scaffold marker`)
  } catch (error) {
    errors.push(`${name}: cannot read SKILL.md: ${error instanceof Error ? error.message : String(error)}`)
  }
}

if (errors.length > 0) {
  process.stderr.write(`${errors.join('\n')}\n`)
  process.exitCode = 1
} else {
  process.stdout.write(`Validated ${directories.length} EVOworkflow Skills.\n`)
}
