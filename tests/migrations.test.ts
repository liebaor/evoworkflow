import {afterEach, describe, expect, it} from 'vitest'
import path from 'node:path'

import {applyMigration, planMigration} from '../src/repository/migrations.js'
import {readYaml, writeYaml, pathExists} from '../src/repository/io.js'
import {ConfigSchema, StateSchema} from '../src/core/schemas.js'
import {repositoryPaths} from '../src/repository/paths.js'
import {cleanupTemporaryRepositories, initializeRepository, temporaryRepository, writeRepositoryFiles} from './helpers.js'

afterEach(cleanupTemporaryRepositories)

describe('protocol migration', () => {
  it('previews and applies v1 config/state plus legacy evidence without deleting Markdown', async () => {
    const root = await temporaryRepository('migration')
    await initializeRepository(root)
    const paths = repositoryPaths(root)
    await writeRepositoryFiles(root, {
      '.evo/work/active/legacy-change/change.md': '---\nid: legacy-change\nweight: STANDARD\nstatus: DRAFT\napproval: null\n---\n\n# Change\n\n- AC-01: Legacy behavior\n',
      '.evo/work/active/legacy-change/evidence.md': '# Evidence\n\n| Acceptance | Status | Evidence | Scope |\n|---|---|---|---|\n| AC-01 | PASS | Old test | local |\n',
    })
    const config = await readYaml(paths.config, ConfigSchema)
    const state = await readYaml(paths.state, StateSchema)
    await writeYaml(paths.config, {...config, schemaVersion: 1})
    await writeYaml(paths.state, {...state, schemaVersion: 1, activeChange: 'legacy-change', phase: 'VERIFY', status: 'APPROVED'})
    const plan = await planMigration(root)
    expect(plan.actions.map((item) => item.kind)).toEqual(expect.arrayContaining(['CONFIG', 'STATE', 'EVIDENCE']))
    const result = await applyMigration(plan, new Date('2026-01-03T00:00:00.000Z'))
    expect(result.receipt).toContain('.evo/migrations/')
    expect((await readYaml(paths.config, ConfigSchema)).schemaVersion).toBe(2)
    expect((await readYaml(paths.state, StateSchema)).schemaVersion).toBe(2)
    expect(await pathExists(path.join(paths.activeWork, 'legacy-change', 'evidence.yml'))).toBe(true)
    expect(await pathExists(path.join(paths.activeWork, 'legacy-change', 'evidence', 'records', 'EV-MIGRATED-01.yml'))).toBe(true)
    expect(await pathExists(path.join(paths.activeWork, 'legacy-change', 'evidence.md'))).toBe(true)
    const secondPlan = await planMigration(root)
    expect(secondPlan.actions).toHaveLength(0)
    expect((await applyMigration(secondPlan)).applied).toBe(false)
  })
})
