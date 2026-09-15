import {mkdir, readFile, writeFile} from 'node:fs/promises'
import path from 'node:path'
import {afterEach, describe, expect, it} from 'vitest'

import {discoverAgentClients} from '../src/agents/discovery.js'
import {inspectAgentCompatibility, runAgentDoctor} from '../src/agents/compatibility.js'
import {buildSkillManifest, writeSkillManifest} from '../src/repository/skill-manifest.js'
import {cleanupTemporaryRepositories, temporaryRepository, writeRepositoryFiles} from './helpers.js'

afterEach(cleanupTemporaryRepositories)

describe('cross-agent discovery and compatibility', () => {
  it('discovers all supported clients from runtime observations and known sources', async () => {
    const root = await temporaryRepository('agent-discovery')
    await writeRepositoryFiles(root, {
      'AGENTS.md': '# Canonical rules\n',
      'CLAUDE.md': '@AGENTS.md\n',
      '.agents/skills/evo-example/SKILL.md': skill('evo-example'),
      '.claude/skills/evo-example/SKILL.md': skill('evo-example'),
    })

    const observations = await discoverAgentClients(root, {
      homeDirectory: root,
      locateExecutable: async (command) => command !== 'opencode',
      readVersion: async (command) => `${command} 1.0.0`,
    })

    expect(observations.map((item) => [item.client, item.executable, item.version])).toEqual([
      ['codex', 'FOUND', 'codex 1.0.0'],
      ['claude-code', 'FOUND', 'claude 1.0.0'],
      ['opencode', 'MISSING', null],
    ])
    expect(observations.find((item) => item.client === 'codex')?.skillSources).toContain('.agents/skills')
    expect(observations.find((item) => item.client === 'claude-code')?.skillSources).toContain('.claude/skills')
  })

  it('reports duplicate-source and missing-client boundaries without persisting client facts', async () => {
    const root = await temporaryRepository('agent-compatibility')
    const home = path.join(root, 'home')
    await mkdir(home, {recursive: true})
    await writeRepositoryFiles(root, {
      'package.json': '{"name":"fixture","version":"0.4.0"}\n',
      'AGENTS.md': '# Canonical rules\n\n- Keep one authority.\n',
      'CLAUDE.md': '@AGENTS.md\n',
      'skills/evo-example/SKILL.md': skill('evo-example'),
      'home/.agents/skills/evo-example/SKILL.md': skill('evo-example'),
      'home/.claude/skills/evo-example/SKILL.md': skill('evo-example'),
    })
    await writeSkillManifest(root, await buildSkillManifest(root))

    const report = await inspectAgentCompatibility(root, {
      homeDirectory: home,
      locateExecutable: async () => false,
    })

    expect(report.manifest.status).toBe('CURRENT')
    expect(report.duplicateSkillIds).toEqual(['evo-example'])
    expect(report.diagnostics.filter((item) => item.code.endsWith('_NOT_FOUND')).map((item) => item.severity)).toEqual(['INFO', 'INFO', 'INFO'])
    expect(report.diagnostics.some((item) => item.code === 'CLAUDE_BRIDGE_MISSING')).toBe(false)
    expect(report.diagnostics.some((item) => item.severity === 'ERROR')).toBe(false)
  })

  it('detects an incompatible Claude bridge and copied authority when Claude is installed', async () => {
    const root = await temporaryRepository('agent-claude-conflict')
    await writeRepositoryFiles(root, {
      'package.json': '{"name":"fixture","version":"0.4.0"}\n',
      'AGENTS.md': '# Canonical rules\n\n- Keep one authority.\n- Review before side effects.\n',
      'CLAUDE.md': '# Canonical rules\n\n- Keep one authority.\n- Review before side effects.\n',
      'skills/evo-example/SKILL.md': skill('evo-example'),
    })
    await writeSkillManifest(root, await buildSkillManifest(root))

    const report = await inspectAgentCompatibility(root, {
      homeDirectory: root,
      locateExecutable: async (command) => command === 'claude',
    })

    expect(report.diagnostics).toEqual(expect.arrayContaining([
      expect.objectContaining({code: 'CLAUDE_IMPORT_INVALID', severity: 'ERROR'}),
      expect.objectContaining({code: 'CLAUDE_AUTHORITY_DUPLICATED', severity: 'WARNING'}),
    ]))
  })

  it('reports a possible second writer without changing the checkout', async () => {
    const root = await temporaryRepository('agent-doctor-writer')
    await writeRepositoryFiles(root, {'AGENTS.md': '# Canonical rules\n'})
    await mkdir(path.join(root, '.git'), {recursive: true})
    await writeFile(path.join(root, '.git', 'index.lock'), 'fixture\n', 'utf8')

    const report = await runAgentDoctor(root, {locateExecutable: async () => false})

    expect(report.diagnostics).toContainEqual(expect.objectContaining({code: 'MULTIPLE_WRITER_DETECTED', severity: 'WARNING', path: '.git/index.lock'}))
    expect(await readFile(path.join(root, '.git', 'index.lock'), 'utf8')).toBe('fixture\n')
  })
})

function skill(name: string): string {
  return `---\nname: ${name}\ndescription: A sufficiently descriptive canonical Skill fixture for compatibility tests.\n---\n\n# ${name}\n\n## Objective\nRun the fixture.\n\n## Required outcomes\nRecord the result.\n\n## Stop conditions\nStop on ambiguity.\n\n## Repository writes\nNone.\n`
}
