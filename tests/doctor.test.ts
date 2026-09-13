import {mkdir, writeFile} from 'node:fs/promises'
import path from 'node:path'
import {afterEach, describe, expect, it} from 'vitest'

import {pathExists, writeYaml} from '../src/repository/io.js'
import {repositoryPaths} from '../src/repository/paths.js'
import {runDoctor} from '../src/validation/doctor.js'
import {cleanupTemporaryRepositories, createActiveChange, initializeRepository, readConfig, temporaryRepository} from './helpers.js'

afterEach(cleanupTemporaryRepositories)

describe('Doctor', () => {
  it('reports knowledge risks and stale locks without applying repairs', async () => {
    const root = await temporaryRepository('doctor')
    await initializeRepository(root)
    await createActiveChange(root)
    const paths = repositoryPaths(root)
    const config = await readConfig(root)
    await writeYaml(paths.config, {...config, knowledge: {...config.knowledge, agentsMaxLines: 2}})
    await writeFile(paths.agents, '# Rules\n\n- one\n- two\n- three\n', 'utf8')
    const lockDirectory = path.join(paths.goals, '.locks')
    await mkdir(lockDirectory, {recursive: true})
    await writeFile(path.join(lockDirectory, 'stale.lock'), '{"pid":999999999}\n', 'utf8')

    const report = await runDoctor(root)
    const codes = report.issues.map((item) => item.code)

    expect(codes).toEqual(expect.arrayContaining(['AGENTS_BLOAT', 'UNVERIFIED_ACTIVE_WORK', 'STALE_GOAL_LOCK']))
    expect(await pathExists(path.join(lockDirectory, 'stale.lock'))).toBe(true)
  })
})
