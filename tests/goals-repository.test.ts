import {writeFile} from 'node:fs/promises'
import path from 'node:path'
import {afterEach, describe, expect, it} from 'vitest'

import {createGoal, approveActiveGoal, resumeGoal} from '../src/repository/goals.js'
import {writeYaml} from '../src/repository/io.js'
import {activeGoalPath} from '../src/repository/managed.js'
import {repositoryPaths} from '../src/repository/paths.js'
import {validateProject} from '../src/validation/project.js'
import {cleanupTemporaryRepositories, createActiveChange, initializeRepository, readState, temporaryRepository} from './helpers.js'

afterEach(cleanupTemporaryRepositories)

describe('persisted Goal lifecycle', () => {
  it('creates a draft, records approval, and detects later Plan drift', async () => {
    const root = await temporaryRepository('goal-repository')
    await initializeRepository(root)
    const changeRoot = await createActiveChange(root)
    const goal = await createGoal(root, 'nightly', {
      title: 'Nightly approved work',
      changeId: 'change-one',
      adapter: 'codex',
      slices: [{
        id: 'S1',
        objective: 'Deliver behavior one',
        acceptance: ['Behavior one is observable'],
        dependsOn: [],
        verify: [{label: 'check', command: process.execPath, args: ['-e', 'process.exit(0)'], timeoutMs: 10_000}],
      }],
    })

    expect(goal.status).toBe('DRAFT')
    expect((await validateProject(root)).issues.map((item) => item.code)).not.toContain('STALE_GOAL_CONTEXT')
    const approved = await approveActiveGoal(root, 'nightly')
    expect(approved.status).toBe('APPROVED')
    expect(approved.approval?.approvedBy).toBe('human')

    await writeFile(path.join(changeRoot, 'plan.md'), '# materially changed plan\n', 'utf8')
    const report = await validateProject(root)
    expect(report.issues.map((item) => item.code)).toContain('STALE_GOAL_CONTEXT')
  })

  it('resumes a checkpointed blocker in a new attempt epoch with a human reason', async () => {
    const root = await temporaryRepository('goal-resume')
    await initializeRepository(root)
    await createActiveChange(root)
    await createGoal(root, 'nightly', {
      title: 'Nightly approved work',
      changeId: 'change-one',
      adapter: 'codex',
      slices: [{
        id: 'S1',
        objective: 'Deliver behavior one',
        acceptance: ['Behavior one is observable'],
        dependsOn: [],
        verify: [{label: 'check', command: process.execPath, args: ['-e', 'process.exit(0)'], timeoutMs: 10_000}],
      }],
    })
    const approved = await approveActiveGoal(root, 'nightly')
    approved.status = 'BLOCKED'
    approved.slices[0]!.status = 'BLOCKED'
    approved.slices[0]!.blockReason = 'A human Decision was required.'
    approved.slices[0]!.stopCondition = 'REQUIREMENT_AMBIGUITY'
    await writeYaml(activeGoalPath(root, 'nightly'), approved)

    const resumed = await resumeGoal(root, 'nightly', 'The human clarified the requirement.')

    expect(resumed.status).toBe('APPROVED')
    expect(resumed.runEpoch).toBe(1)
    expect(resumed.slices[0]).toEqual(expect.objectContaining({status: 'PENDING', blockReason: null, stopCondition: null}))
    expect(resumed.resumes.at(-1)?.reason).toBe('The human clarified the requirement.')
  })

  it('refuses Goal approval when the active Plan itself is not approved', async () => {
    const root = await temporaryRepository('goal-unapproved-plan')
    await initializeRepository(root)
    const changeRoot = await createActiveChange(root)
    await createGoal(root, 'nightly', {
      title: 'Bounded work',
      changeId: 'change-one',
      adapter: 'codex',
      slices: [{
        id: 'S1',
        objective: 'Deliver the approved behavior',
        acceptance: ['The behavior is observed'],
        dependsOn: [],
        verify: [{label: 'check', command: process.execPath, args: ['-e', 'process.exit(0)'], timeoutMs: 10_000}],
      }],
    })
    await writeFile(
      path.join(changeRoot, 'plan.md'),
      '---\nchange: change-one\nstatus: AWAITING_APPROVAL\napproval: null\n---\n\n# Revised Plan\n',
      'utf8',
    )

    await expect(approveActiveGoal(root, 'nightly')).rejects.toThrow('plan.md is not currently approved')
  })

  it('refuses Goal approval for a Slice outside the approved Plan', async () => {
    const root = await temporaryRepository('goal-plan-scope')
    await initializeRepository(root)
    await createActiveChange(root)
    await createGoal(root, 'nightly', {
      title: 'Out of scope work',
      changeId: 'change-one',
      adapter: 'codex',
      slices: [{
        id: 'S2',
        objective: 'Deliver an unplanned behavior',
        acceptance: ['The unplanned behavior is observed'],
        dependsOn: [],
        verify: [{label: 'check', command: process.execPath, args: ['-e', 'process.exit(0)'], timeoutMs: 10_000}],
      }],
    })

    await expect(approveActiveGoal(root, 'nightly')).rejects.toThrow('outside the approved Plan')
  })

  it('detects drift between active Goal checkpoints and the State projection', async () => {
    const root = await temporaryRepository('goal-projection')
    await initializeRepository(root)
    await createActiveChange(root)
    await createGoal(root, 'nightly', {
      title: 'Bounded work',
      changeId: 'change-one',
      adapter: 'codex',
      slices: [{
        id: 'S1',
        objective: 'Deliver the approved behavior',
        acceptance: ['The behavior is observed'],
        dependsOn: [],
        verify: [{label: 'check', command: process.execPath, args: ['-e', 'process.exit(0)'], timeoutMs: 10_000}],
      }],
    })
    await approveActiveGoal(root, 'nightly')
    const paths = repositoryPaths(root)
    const state = await readState(root)
    await writeYaml(paths.state, {...state, slices: [{id: 'S1', status: 'PASS', blockReason: null}]})

    const report = await validateProject(root)

    expect(report.issues).toContainEqual(expect.objectContaining({code: 'GOAL_SLICE_PROJECTION_DRIFT'}))
  })

  it('detects drift in the projected current Slice', async () => {
    const root = await temporaryRepository('goal-current-slice-drift')
    await initializeRepository(root)
    await createActiveChange(root)
    await createGoal(root, 'nightly', {
      title: 'Bounded work',
      changeId: 'change-one',
      adapter: 'codex',
      slices: [{
        id: 'S1',
        objective: 'Deliver the approved behavior',
        acceptance: ['The behavior is observed'],
        dependsOn: [],
        verify: [{label: 'check', command: process.execPath, args: ['-e', 'process.exit(0)'], timeoutMs: 10_000}],
      }],
    })
    const approved = await approveActiveGoal(root, 'nightly')
    approved.status = 'BLOCKED'
    approved.slices[0]!.status = 'BLOCKED'
    approved.slices[0]!.blockReason = 'A human Decision is required.'
    approved.slices[0]!.stopCondition = 'REQUIREMENT_AMBIGUITY'
    await writeYaml(activeGoalPath(root, 'nightly'), approved)
    const paths = repositoryPaths(root)
    const state = await readState(root)
    await writeYaml(paths.state, {
      ...state,
      phase: 'IMPLEMENT',
      status: 'BLOCKED',
      currentSlice: null,
      slices: [{id: 'S1', status: 'BLOCKED', blockReason: 'A human Decision is required.'}],
    })

    const report = await validateProject(root)

    expect(report.issues).toContainEqual(expect.objectContaining({code: 'GOAL_CURRENT_SLICE_DRIFT'}))
  })
})
