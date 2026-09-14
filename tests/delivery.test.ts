import {execFile as execFileCallback} from 'node:child_process'
import {mkdir, rename} from 'node:fs/promises'
import {promisify} from 'node:util'
import {afterEach, describe, expect, it} from 'vitest'

import {createDeliveryCommit, prepareDeliveryCheckpoint} from '../src/repository/delivery.js'
import {createCompletionRecord} from '../src/repository/completion.js'
import {StateSchema} from '../src/core/schemas.js'
import {cleanupTemporaryRepositories, createActiveChange, initializeRepository, temporaryRepository, writeRepositoryFiles} from './helpers.js'
import {readYaml, writeYaml} from '../src/repository/io.js'
import {repositoryPaths} from '../src/repository/paths.js'

const execFile = promisify(execFileCallback)

afterEach(cleanupTemporaryRepositories)

describe('Git delivery chronology', () => {
  it('previews without staging and creates an explicitly scoped non-final checkpoint', async () => {
    const root = await temporaryRepository('delivery')
    await initializeRepository(root)
    await createActiveChange(root)
    await execFile('git', ['init', '-q'], {cwd: root})
    await execFile('git', ['config', 'user.email', 'evo@test.invalid'], {cwd: root})
    await execFile('git', ['config', 'user.name', 'EVO Test'], {cwd: root})
    await execFile('git', ['add', '.'], {cwd: root})
    await execFile('git', ['commit', '-qm', 'baseline'], {cwd: root})
    await writeRepositoryFiles(root, {'src/feature.ts': 'export const feature = true\n'})

    const preview = await prepareDeliveryCheckpoint(root)
    expect(preview.status).toBe('READY')
    expect(preview.includedPaths).toContain('src/feature.ts')
    expect((await execFile('git', ['diff', '--cached', '--name-only'], {cwd: root})).stdout.trim()).toBe('')

    const result = await createDeliveryCommit(root, {apply: true, paths: ['src/feature.ts'], checkpoint: 'SLICE', sliceId: 'S1'})
    expect(result.commit).toMatch(/^[a-f0-9]{40}$/u)
    const message = String((await execFile('git', ['show', '-s', '--format=%B', 'HEAD'], {cwd: root})).stdout)
    expect(message).toContain('EVO-Change: change-one')
    expect(message).toContain('EVO-Slice: S1')
    expect(message).toContain('does not complete or accept the Change')
    expect(message).not.toContain('COMPLETED state')
  })

  it('blocks a final-delivery label until evo-finish has already recorded completion', async () => {
    const root = await temporaryRepository('delivery-final')
    await initializeRepository(root)
    await createActiveChange(root)
    await execFile('git', ['init', '-q'], {cwd: root})
    await execFile('git', ['config', 'user.email', 'evo@test.invalid'], {cwd: root})
    await execFile('git', ['config', 'user.name', 'EVO Test'], {cwd: root})
    await execFile('git', ['add', '.'], {cwd: root})
    await execFile('git', ['commit', '-qm', 'baseline'], {cwd: root})
    await writeRepositoryFiles(root, {'src/feature.ts': 'export const feature = true\n'})
    const preview = await prepareDeliveryCheckpoint(root, {checkpoint: 'FINAL_DELIVERY'})
    expect(preview.status).toBe('BLOCKED')
    expect(preview.reason).toContain('COMPLETED')
  })

  it('rejects push authorization without explicit commit authorization', async () => {
    const root = await temporaryRepository('delivery-push')
    await initializeRepository(root)
    await createActiveChange(root)
    await expect(prepareDeliveryCheckpoint(root, {push: true})).rejects.toThrow('--apply')
  })

  it('blocks an explicitly selected path that is not part of the current diff', async () => {
    const root = await temporaryRepository('delivery-scope')
    await initializeRepository(root)
    await createActiveChange(root)
    await execFile('git', ['init', '-q'], {cwd: root})
    await execFile('git', ['config', 'user.email', 'evo@test.invalid'], {cwd: root})
    await execFile('git', ['config', 'user.name', 'EVO Test'], {cwd: root})
    await execFile('git', ['add', '.'], {cwd: root})
    await execFile('git', ['commit', '-qm', 'baseline'], {cwd: root})
    await writeRepositoryFiles(root, {'src/feature.ts': 'export const feature = true\n'})

    const preview = await prepareDeliveryCheckpoint(root, {paths: ['src/other.ts']})
    expect(preview.status).toBe('BLOCKED')
    expect(preview.reason).toContain('not changed')
  })

  it('does not absorb unrelated paths that were staged before the checkpoint', async () => {
    const root = await temporaryRepository('delivery-staged-scope')
    await initializeRepository(root)
    await createActiveChange(root)
    await execFile('git', ['init', '-q'], {cwd: root})
    await execFile('git', ['config', 'user.email', 'evo@test.invalid'], {cwd: root})
    await execFile('git', ['config', 'user.name', 'EVO Test'], {cwd: root})
    await execFile('git', ['add', '.'], {cwd: root})
    await execFile('git', ['commit', '-qm', 'baseline'], {cwd: root})
    await writeRepositoryFiles(root, {
      'src/feature.ts': 'export const feature = true\n',
      'docs/unrelated.md': '# Keep outside this checkpoint\n',
    })
    await execFile('git', ['add', 'docs/unrelated.md'], {cwd: root})

    await expect(createDeliveryCommit(root, {apply: true, paths: ['src/feature.ts'], checkpoint: 'SLICE', sliceId: 'S1'}))
      .rejects.toThrow('outside this checkpoint')
    expect((await execFile('git', ['log', '-1', '--format=%s'], {cwd: root})).stdout.trim()).toBe('baseline')
  })

  it('accepts an archived Change whose selected paths are represented as Git renames', async () => {
    const root = await temporaryRepository('delivery-rename')
    await initializeRepository(root)
    const paths = repositoryPaths(root)
    await writeRepositoryFiles(root, {
      '.evo/work/active/rename-change/change.md': '---\nid: rename-change\nweight: SMALL\nstatus: APPROVED\napproval: null\n---\n\n# Change\n',
      '.evo/work/active/rename-change/plan.md': '---\nchange: rename-change\nstatus: APPROVED\napproval: null\n---\n\n# Plan\n',
    })
    await execFile('git', ['init', '-q'], {cwd: root})
    await execFile('git', ['config', 'user.email', 'evo@test.invalid'], {cwd: root})
    await execFile('git', ['config', 'user.name', 'EVO Test'], {cwd: root})
    await execFile('git', ['add', '.'], {cwd: root})
    await execFile('git', ['commit', '-qm', 'baseline'], {cwd: root})
    await mkdir(paths.completedWork, {recursive: true})
    await rename(
      `${paths.activeWork}/rename-change`,
      `${paths.completedWork}/rename-change`,
    )
    const state = await readYaml(paths.state, StateSchema)
    await writeYaml(paths.state, {
      ...state,
      activeChange: null,
      activeGoal: null,
      currentSlice: null,
      phase: 'IDLE',
      status: 'COMPLETED',
      slices: [],
      updatedAt: new Date().toISOString(),
    })
    await createCompletionRecord(root, 'rename-change')

    const selected = [
      '.evo/state.yml',
      '.evo/work/active/rename-change/change.md',
      '.evo/work/active/rename-change/plan.md',
      '.evo/work/completed/rename-change/change.md',
      '.evo/work/completed/rename-change/plan.md',
      '.evo/work/completed/rename-change/completion.yml',
    ]
    const result = await createDeliveryCommit(root, {
      apply: true,
      checkpoint: 'FINAL_DELIVERY',
      changeId: 'rename-change',
      paths: selected,
    })
    expect(result.commit).toMatch(/^[a-f0-9]{40}$/u)
    expect((await execFile('git', ['status', '--short'], {cwd: root})).stdout.trim()).toBe('')
  })
})
