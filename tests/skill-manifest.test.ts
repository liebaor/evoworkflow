import {readFile} from 'node:fs/promises'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {describe, expect, it} from 'vitest'

import {buildSkillManifest, categoryForSkill, readSkillManifest} from '../src/repository/skill-manifest.js'

const root = fileURLToPath(new URL('../', import.meta.url))

describe('canonical Skill manifest', () => {
  it('matches a deterministic rebuild of the committed manifest', async () => {
    const expected = await buildSkillManifest(root)
    const actual = await readSkillManifest(root)

    expect(actual).toEqual(expected)
    expect(actual.skills.map((skill) => skill.name)).toEqual([...actual.skills].map((skill) => skill.name).sort())
    expect(actual.skills).toHaveLength(20)
  })

  it('hashes each canonical SKILL.md and keeps category assignment derived', async () => {
    const manifest = await readSkillManifest(root)
    const rebuilt = await buildSkillManifest(root)
    for (const skill of manifest.skills) {
      const source = await readFile(path.join(root, 'skills', skill.name, 'SKILL.md'))
      expect(rebuilt.skills.find((item) => item.name === skill.name)?.sha256).toBe(skill.sha256)
      expect(skill.category).toBe(categoryForSkill(skill.name))
      expect(source.length).toBeGreaterThan(0)
    }
  })
})
