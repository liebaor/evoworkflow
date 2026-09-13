import {appendFile} from 'node:fs/promises'
import path from 'node:path'
import {afterEach, describe, expect, it} from 'vitest'

import {approveArtifact} from '../src/repository/artifacts.js'
import {writeYaml} from '../src/repository/io.js'
import {repositoryPaths} from '../src/repository/paths.js'
import {validateProject} from '../src/validation/project.js'
import {
  cleanupTemporaryRepositories,
  createActiveChange,
  initializeRepository,
  readState,
  temporaryRepository,
  writeRepositoryFiles,
} from './helpers.js'

afterEach(cleanupTemporaryRepositories)

describe('narrative artifact approval', () => {
  it('detects an approved Plan changed after human approval', async () => {
    const root = await temporaryRepository('artifact-drift')
    await initializeRepository(root)
    const changeRoot = await createActiveChange(root)

    await appendFile(path.join(changeRoot, 'plan.md'), '\nUnapproved extra scope.\n', 'utf8')
    const report = await validateProject(root)

    expect(report.valid).toBe(false)
    expect(report.issues).toContainEqual(expect.objectContaining({code: 'STALE_ARTIFACT_APPROVAL', path: '.evo/work/active/change-one/plan.md'}))
  })

  it('only approves an active artifact that reached AWAITING_APPROVAL', async () => {
    const root = await temporaryRepository('artifact-state')
    await initializeRepository(root)
    const paths = repositoryPaths(root)
    await writeRepositoryFiles(root, {
      '.evo/work/active/new-change/change.md': '---\nid: new-change\nweight: STANDARD\nstatus: DRAFT\napproval: null\n---\n\n# Draft\n',
    })
    const state = await readState(root)
    await writeYaml(paths.state, {...state, activeChange: 'new-change', phase: 'GRILL', status: 'DRAFT'})

    await expect(approveArtifact(root, 'new-change', 'change')).rejects.toThrow('must be AWAITING_APPROVAL')
  })

  it('marks the current approval as approved without changing the phase', async () => {
    const root = await temporaryRepository('artifact-approval-state')
    await initializeRepository(root)
    const paths = repositoryPaths(root)
    await writeRepositoryFiles(root, {
      '.evo/work/active/new-change/change.md': '---\nid: new-change\nweight: STANDARD\nstatus: AWAITING_APPROVAL\napproval: null\n---\n\n# Change\n',
      '.evo/work/active/new-change/plan.md': '---\nchange: new-change\nstatus: AWAITING_APPROVAL\napproval: null\n---\n\n# Plan\n\n### S1 — Bounded behavior\n',
    })
    const state = await readState(root)
    await writeYaml(paths.state, {...state, activeChange: 'new-change', phase: 'GRILL', status: 'AWAITING_APPROVAL'})

    await approveArtifact(root, 'new-change', 'change')

    expect(await readState(root)).toEqual(expect.objectContaining({phase: 'GRILL', status: 'APPROVED'}))
  })

  it('initializes missing Plan Slice checkpoints when approving a Plan', async () => {
    const root = await temporaryRepository('artifact-plan-state')
    await initializeRepository(root)
    const paths = repositoryPaths(root)
    await writeRepositoryFiles(root, {
      '.evo/work/active/new-change/change.md': '---\nid: new-change\nweight: STANDARD\nstatus: APPROVED\napproval: null\n---\n\n# Change\n',
      '.evo/work/active/new-change/plan.md': '---\nchange: new-change\nstatus: AWAITING_APPROVAL\napproval: null\n---\n\n# Plan\n\n### S1 — Bounded behavior\n\n### S2 - Follow-up behavior\n',
    })
    const state = await readState(root)
    await writeYaml(paths.state, {...state, activeChange: 'new-change', phase: 'PLAN', status: 'AWAITING_APPROVAL'})
    await approveArtifact(root, 'new-change', 'plan')

    expect((await readState(root)).slices).toEqual([
      {id: 'S1', status: 'PENDING', blockReason: null},
      {id: 'S2', status: 'PENDING', blockReason: null},
    ])
  })
})
