import {afterEach, describe, expect, it} from 'vitest'
import {execFile as execFileCallback} from 'node:child_process'
import {promisify} from 'node:util'
import path from 'node:path'

import {bindCompletionCommit, checkCurrentTruth, createCompletionRecord, readCompletion} from '../src/repository/completion.js'
import {repositoryPaths} from '../src/repository/paths.js'
import {cleanupTemporaryRepositories, initializeRepository, temporaryRepository, writeRepositoryFiles} from './helpers.js'

afterEach(cleanupTemporaryRepositories)

const execFile = promisify(execFileCallback)

describe('completion handoff', () => {
  it('requires declared current-truth paths and records uncommitted source state', async () => {
    const root = await temporaryRepository('completion')
    await initializeRepository(root)
    await execFile('git', ['init', '-q'], {cwd: root})
    await execFile('git', ['config', 'user.email', 'evo@test.invalid'], {cwd: root})
    await execFile('git', ['config', 'user.name', 'EVO Test'], {cwd: root})
    await execFile('git', ['add', '.'], {cwd: root})
    await execFile('git', ['commit', '-qm', 'baseline'], {cwd: root})
    const paths = repositoryPaths(root)
    const completed = path.join(paths.completedWork, 'completed-change')
    await writeRepositoryFiles(root, {
      '.evo/work/completed/completed-change/change.md': '---\nid: completed-change\nweight: SMALL\nstatus: APPROVED\napproval: null\n---\n\n# Change\n',
      '.evo/work/completed/completed-change/plan.md': '---\nchange: completed-change\nstatus: APPROVED\napproval: null\ncurrentTruthTargets:\n  - path: docs/current.md\n    action: CREATE\n---\n\n# Plan\n',
      'docs/current.md': '# Current truth\n',
    })
    const truth = await checkCurrentTruth(root, 'completed-change', true)
    expect(truth).toEqual(expect.objectContaining({missing: [], verified: ['docs/current.md']}))
    const completion = await createCompletionRecord(root, 'completed-change', new Date('2026-01-02T00:00:00.000Z'))
    expect(completion.sourceStatus).toBe('READY_TO_COMMIT')
    expect(completion.commit).toBeNull()
    expect(await readCompletion(root, 'completed-change')).toEqual(completion)
    expect(await import('node:fs/promises').then(({access}) => access(path.join(completed, 'completion.yml')))).toBeUndefined()
    const bound = await bindCompletionCommit(root, 'completed-change')
    expect(bound.sourceStatus).toBe('COMMITTED')
    expect(bound.commit).toMatch(/^[a-f0-9]{40}$/u)
  })

  it('reports a missing current-truth target before Finish', async () => {
    const root = await temporaryRepository('completion-missing-truth')
    await initializeRepository(root)
    const paths = repositoryPaths(root)
    await writeRepositoryFiles(root, {
      '.evo/work/active/current-change/change.md': '---\nid: current-change\nweight: SMALL\nstatus: APPROVED\napproval: null\n---\n\n# Change\n',
      '.evo/work/active/current-change/plan.md': '---\nchange: current-change\nstatus: APPROVED\napproval: null\ncurrentTruthTargets:\n  - path: src/missing.ts\n    action: CREATE\n---\n\n# Plan\n',
    })
    const truth = await checkCurrentTruth(root, 'current-change')
    expect(truth.missing).toEqual(['src/missing.ts'])
    expect(paths.activeWork).toContain('.evo/work/active')
  })
})
