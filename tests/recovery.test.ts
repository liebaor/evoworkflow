import {mkdir, writeFile} from 'node:fs/promises'
import path from 'node:path'
import {afterEach, describe, expect, it} from 'vitest'

import {getStatusSummary} from '../src/core/navigation.js'
import {runStoredGoal} from '../src/repository/goal-execution.js'
import {approveActiveGoal, createGoal} from '../src/repository/goals.js'
import {activeGoalPath} from '../src/repository/managed.js'
import {writeYaml} from '../src/repository/io.js'
import {repositoryPaths} from '../src/repository/paths.js'
import {runDoctor} from '../src/validation/doctor.js'
import {cleanupTemporaryRepositories, createActiveChange, initializeRepository, readState, temporaryRepository} from './helpers.js'

afterEach(cleanupTemporaryRepositories)

describe('interrupted Goal recovery', () => {
  it('uses persisted RUNNING checkpoints, reports a stale lock, and does not auto-resume', async () => {
    const root = await temporaryRepository('interrupted-goal')
    await initializeRepository(root)
    await createActiveChange(root)
    await createGoal(root, 'interrupted', {
      title: 'Recover the interrupted Slice',
      changeId: 'change-one',
      adapter: 'codex',
      slices: [{
        id: 'S1',
        objective: 'Complete the interrupted behavior',
        acceptance: ['The behavior is observable'],
        dependsOn: [],
        verify: [{label: 'check', command: process.execPath, args: ['-e', 'process.exit(0)'], timeoutMs: 10_000}],
      }],
    })
    const approved = await approveActiveGoal(root, 'interrupted')
    approved.status = 'RUNNING'
    approved.slices[0]!.status = 'RUNNING'
    await writeYaml(activeGoalPath(root, 'interrupted'), approved)

    const paths = repositoryPaths(root)
    const state = await readState(root)
    await writeYaml(paths.state, {
      ...state,
      phase: 'IMPLEMENT',
      status: 'APPROVED',
      activeGoal: 'interrupted',
      currentSlice: 'S1',
      slices: [{id: 'S1', status: 'RUNNING', blockReason: null}],
    })
    const lockDirectory = path.join(paths.goals, '.locks')
    await mkdir(lockDirectory, {recursive: true})
    await writeFile(path.join(lockDirectory, 'interrupted.lock'), '{"pid":999999999}\n', 'utf8')

    const summary = await getStatusSummary(root)
    expect(summary.goal?.status).toBe('RUNNING')
    expect(summary.nextAction).toBe('evo goal inspect interrupted')

    await expect(runStoredGoal(root, 'interrupted')).rejects.toThrow('already has an execution lock')
    const doctor = await runDoctor(root)
    expect(doctor.issues).toContainEqual(expect.objectContaining({code: 'STALE_GOAL_LOCK'}))
    expect((await readState(root)).currentSlice).toBe('S1')
  })
})
