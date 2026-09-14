import {execFile as execFileCallback} from 'node:child_process'
import {promisify} from 'node:util'
import {afterEach, describe, expect, it} from 'vitest'

import {createDeliveryCommit, prepareDeliveryCheckpoint} from '../src/repository/delivery.js'
import {cleanupTemporaryRepositories, createActiveChange, initializeRepository, temporaryRepository, writeRepositoryFiles} from './helpers.js'

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
})
