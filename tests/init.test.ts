import {afterEach, describe, expect, it} from 'vitest'

import {ConfigSchema, StateSchema} from '../src/core/schemas.js'
import {applyInitialization, planInitialization} from '../src/repository/init.js'
import {readYaml} from '../src/repository/io.js'
import {repositoryPaths} from '../src/repository/paths.js'
import {validateProject} from '../src/validation/project.js'
import {cleanupTemporaryRepositories, fileContents, temporaryRepository, writeRepositoryFiles} from './helpers.js'

afterEach(cleanupTemporaryRepositories)

describe('non-destructive initialization', () => {
  it('reports before writing, preserves existing instructions, and is idempotent', async () => {
    const root = await temporaryRepository('init')
    await writeRepositoryFiles(root, {
      'AGENTS.md': '# Existing project instructions\n',
      'README.md': '# Existing project\n',
      'docs/architecture.md': '# Existing architecture\n',
      'package.json': JSON.stringify({scripts: {build: 'tsc', test: 'vitest', dev: 'vite'}, dependencies: {react: '1.0.0'}}),
      'pnpm-lock.yaml': 'lockfileVersion: 9\n',
      '.github/workflows/ci.yml': 'name: ci\n',
    })
    const paths = repositoryPaths(root)
    const before = await planInitialization(root)

    expect(before.actions.find((item) => item.path === 'AGENTS.md')?.outcome).toBe('preserve')
    await expect(fileContents(paths.config)).rejects.toThrow()

    const first = await applyInitialization(before)
    expect(first.actions.find((item) => item.path === 'AGENTS.md')?.outcome).toBe('preserved')
    expect(await fileContents(paths.agents)).toBe('# Existing project instructions\n')
    expect((await readYaml(paths.config, ConfigSchema)).workflow.autoFinish).toBe(false)
    expect((await readYaml(paths.state, StateSchema)).projectMode).toBe('BROWNFIELD')
    expect(await fileContents(paths.project)).toContain('docs/architecture.md')
    expect((await validateProject(root)).valid).toBe(true)

    const configBefore = await fileContents(paths.config)
    const second = await applyInitialization(await planInitialization(root))
    expect(second.actions.every((item) => item.outcome === 'preserved')).toBe(true)
    expect(await fileContents(paths.config)).toBe(configBefore)
  })
})
