import {mkdir, readFile, stat, writeFile} from 'node:fs/promises'
import path from 'node:path'
import {afterEach, describe, expect, it} from 'vitest'

import {applySkillInstallation, planSkillInstallation, planSkillUpdate, readSkillReceipt} from '../src/skills/installation.js'
import {inspectClaudeLink} from '../src/skills/links.js'
import {buildSkillManifest} from '../src/repository/skill-manifest.js'
import {cleanupTemporaryRepositories, temporaryRepository, writeRepositoryFiles} from './helpers.js'

afterEach(cleanupTemporaryRepositories)

describe('canonical EVO Skill installation', () => {
  it('previews without writing and applies an idempotent canonical install', async () => {
    const home = await temporaryRepository('skills-home')
    const preview = await planSkillInstallation({homeDirectory: home, sourceRoot: process.cwd()})

    expect(preview.actions).toHaveLength(20)
    expect(preview.actions.every((item) => item.action === 'INSTALL')).toBe(true)
    expect(preview.claude.every((item) => item.status === 'MISSING')).toBe(true)
    expect(await fileExists(path.join(home, '.agents', 'skills'))).toBe(false)
    expect(await fileExists(path.join(home, '.claude', 'skills'))).toBe(false)

    const applied = await applySkillInstallation(preview)
    expect(applied.mode).toBe('APPLIED')
    expect(applied.applied.filter((item) => !item.startsWith('claude:'))).toHaveLength(20)
    expect((await readSkillReceipt(path.join(home, '.agents', 'skills')))?.evoVersion).toBe('0.4.2')
    expect((await planSkillInstallation({homeDirectory: home, sourceRoot: process.cwd()})).actions.every((item) => item.action === 'SAME')).toBe(true)

    const repeat = await applySkillInstallation(await planSkillInstallation({homeDirectory: home, sourceRoot: process.cwd()}))
    expect(repeat.applied).toEqual([])
  })

  it('blocks a local canonical modification and never overwrites it', async () => {
    const home = await temporaryRepository('skills-conflict-home')
    await applySkillInstallation(await planSkillInstallation({homeDirectory: home, sourceRoot: process.cwd()}))
    const target = path.join(home, '.agents', 'skills', 'ask-evo', 'SKILL.md')
    const original = await readFile(target, 'utf8')
    await writeFile(target, `${original}\nLocal customization\n`, 'utf8')

    const report = await planSkillInstallation({homeDirectory: home, sourceRoot: process.cwd()})
    expect(report.actions.find((item) => item.name === 'ask-evo')?.action).toBe('CONFLICT')
    expect(report.blockers.some((item) => item.includes('local modification'))).toBe(true)
    expect(await readFile(target, 'utf8')).toContain('Local customization')
  })

  it('reports an existing Claude directory as a non-destructive conflict', async () => {
    const home = await temporaryRepository('skills-claude-conflict-home')
    await mkdir(path.join(home, '.claude', 'skills', 'ask-evo'), {recursive: true})
    await writeFile(path.join(home, '.claude', 'skills', 'ask-evo', 'SKILL.md'), 'user-owned\n', 'utf8')

    const manifest = await buildSkillManifest(process.cwd())
    const item = await inspectClaudeLink('ask-evo', path.join(home, '.agents', 'skills'), path.join(home, '.claude', 'skills'))
    expect(item.status).toBe('REAL_DIRECTORY_CONFLICT')
    expect(item.mode).toBe(null)
    expect(manifest.skills).toHaveLength(20)
  })

  it('uses the installation receipt to permit safe managed updates', async () => {
    const source = await temporaryRepository('skills-source')
    await writeRepositoryFiles(source, {
      'package.json': '{"name":"fixture","version":"0.4.1"}\n',
      'skills/evo-example/SKILL.md': fixtureSkill('v1'),
    })
    const home = await temporaryRepository('skills-update-home')
    await applySkillInstallation(await planSkillInstallation({sourceRoot: source, homeDirectory: home}))
    await writeFile(path.join(source, 'skills', 'evo-example', 'SKILL.md'), fixtureSkill('v2'), 'utf8')

    const preview = await planSkillUpdate({sourceRoot: source, homeDirectory: home})
    expect(preview.actions[0]?.action).toBe('UPDATE_CANDIDATE')
    expect(preview.blockers).toEqual([])
    await applySkillInstallation(preview)
    expect(await readFile(path.join(home, '.agents', 'skills', 'evo-example', 'SKILL.md'), 'utf8')).toContain('v2')
  })
})

async function fileExists(target: string): Promise<boolean> {
  try {
    await stat(target)
    return true
  } catch {
    return false
  }
}

function fixtureSkill(version: string): string {
  return `---\nname: evo-example\ndescription: A sufficiently descriptive canonical Skill fixture for installation tests.\n---\n\n# EVO fixture ${version}\n\n## Objective\nRun the fixture.\n\n## Required outcomes\nRecord the result.\n\n## Stop conditions\nStop on ambiguity.\n\n## Repository writes\nNone.\n`
}
