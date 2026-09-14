import {readFile} from 'node:fs/promises'
import path from 'node:path'
import {afterEach, describe, expect, it} from 'vitest'

import {setupAgentCompatibility} from '../src/agents/setup.js'
import {pathExists} from '../src/repository/io.js'
import {repositoryPaths} from '../src/repository/paths.js'
import {cleanupTemporaryRepositories, initializeRepository, readState, temporaryRepository, writeRepositoryFiles} from './helpers.js'

afterEach(cleanupTemporaryRepositories)

describe('cross-agent setup safety', () => {
  it('previews without writing and applies only the exact Claude bridge', async () => {
    const root = await temporaryRepository('agent-setup-preview')
    await initializeRepository(root)
    await writeRepositoryFiles(root, {'AGENTS.md': '# Canonical rules\n'})
    const stateBefore = await readFile(repositoryPaths(root).state, 'utf8')

    const preview = await setupAgentCompatibility(root, {now: new Date('2026-01-01T00:00:00.000Z')})

    expect(preview.mode).toBe('PREVIEW')
    expect(preview.action).toBe('CREATE_CLAUDE_BRIDGE')
    expect(await pathExists(path.join(root, 'CLAUDE.md'))).toBe(false)
    expect(await readFile(repositoryPaths(root).state, 'utf8')).toBe(stateBefore)

    const applied = await setupAgentCompatibility(root, {apply: true, now: new Date('2026-01-01T00:00:01.000Z')})

    expect(applied.action).toBe('ALREADY_CONFIGURED')
    expect(await readFile(path.join(root, 'CLAUDE.md'), 'utf8')).toBe('@AGENTS.md\n')
    expect(await readState(root)).toEqual(expect.objectContaining({activeChange: null, activeGoal: null}))
  })

  it('does not overwrite an existing incompatible user file', async () => {
    const root = await temporaryRepository('agent-setup-conflict')
    await initializeRepository(root)
    await writeRepositoryFiles(root, {'AGENTS.md': '# Canonical rules\n', 'CLAUDE.md': '# User instructions\n'})

    const report = await setupAgentCompatibility(root, {apply: true})

    expect(report.action).toBe('NEEDS_HUMAN_MERGE')
    expect(await readFile(path.join(root, 'CLAUDE.md'), 'utf8')).toBe('# User instructions\n')
  })

  it('blocks bridge creation when canonical AGENTS.md is absent', async () => {
    const root = await temporaryRepository('agent-setup-no-agents')

    const report = await setupAgentCompatibility(root, {apply: true})

    expect(report.action).toBe('BLOCKED')
    expect(await pathExists(path.join(root, 'CLAUDE.md'))).toBe(false)
  })
})
