import {createHash} from 'node:crypto'
import {readFile, writeFile} from 'node:fs/promises'
import path from 'node:path'
import {afterEach, describe, expect, it} from 'vitest'

import {checkChangeSet} from '../src/repository/change-sets.js'
import {writeYaml} from '../src/repository/io.js'
import {repositoryPaths} from '../src/repository/paths.js'
import {cleanupTemporaryRepositories, initializeRepository, temporaryRepository} from './helpers.js'

afterEach(cleanupTemporaryRepositories)

describe('multi-repository Change Set', () => {
  it('aggregates child completion records and contract hashes', async () => {
    const root = await temporaryRepository('changeset-root')
    const child = await temporaryRepository('changeset-child')
    await initializeRepository(root)
    await initializeRepository(child)
    await writeFile(path.join(child, 'contract.md'), 'stable contract\n', 'utf8')
    await writeYaml(path.join(child, '.evo/work/completed/child-change/completion.yml'), {
      schemaVersion: 1,
      change: 'child-change',
      workflowStatus: 'COMPLETED',
      finishedAt: '2026-01-01T00:00:00.000Z',
      baselineCommit: null,
      finishedTreeFingerprint: 'a'.repeat(64),
      sourceStatus: 'COMMIT_NOT_REQUIRED',
      commit: null,
      currentTruth: {required: [], verified: []},
    })
    const contract = await readFile(path.join(child, 'contract.md'))
    await writeYaml(path.join(repositoryPaths(root).changeSets, 'full-flow.yml'), {
      schemaVersion: 1,
      id: 'full-flow',
      members: [{repositoryId: 'backend', pathHint: child, change: 'child-change', required: true}],
      contracts: [{id: 'api-contract', authority: 'backend', path: path.join(child, 'contract.md'), sha256: createHash('sha256').update(contract).digest('hex')}],
    })
    const report = await checkChangeSet(root, 'full-flow')
    expect(report.valid).toBe(true)
    expect(report.items.every((item) => item.status === 'APPLY')).toBe(true)
  })

  it('blocks a Change Set when a contract hash drifts', async () => {
    const root = await temporaryRepository('changeset-drift')
    await initializeRepository(root)
    await writeFile(path.join(root, 'contract.md'), 'changed\n', 'utf8')
    await writeYaml(path.join(repositoryPaths(root).completedWork, 'root-change', 'completion.yml'), {
      schemaVersion: 1,
      change: 'root-change',
      workflowStatus: 'COMPLETED',
      finishedAt: '2026-01-01T00:00:00.000Z',
      baselineCommit: null,
      finishedTreeFingerprint: 'a'.repeat(64),
      sourceStatus: 'COMMIT_NOT_REQUIRED',
      commit: null,
      currentTruth: {required: [], verified: []},
    })
    await writeYaml(path.join(repositoryPaths(root).changeSets, 'drift.yml'), {
      schemaVersion: 1,
      id: 'drift',
      members: [{repositoryId: 'root', pathHint: root, change: 'root-change', required: true}],
      contracts: [{id: 'contract', authority: 'root', path: 'contract.md', sha256: 'b'.repeat(64)}],
    })
    const raw = await readFile(path.join(repositoryPaths(root).changeSets, 'drift.yml'), 'utf8')
    expect(raw).toContain('drift')
    const report = await checkChangeSet(root, 'drift')
    expect(report.valid).toBe(false)
    expect(report.items).toContainEqual(expect.objectContaining({id: 'contract', status: 'CONFLICT'}))
  })
})
