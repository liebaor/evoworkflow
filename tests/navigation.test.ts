import {writeFile} from 'node:fs/promises'
import path from 'node:path'
import {afterEach, describe, expect, it} from 'vitest'

import {getStatusSummary, universalSkillForRecommendation} from '../src/core/navigation.js'
import {approveArtifact} from '../src/repository/artifacts.js'
import {writeYaml} from '../src/repository/io.js'
import {repositoryPaths} from '../src/repository/paths.js'
import {
  cleanupTemporaryRepositories,
  createActiveChange,
  initializeRepository,
  readState,
  temporaryRepository,
  writeRepositoryFiles,
} from './helpers.js'

afterEach(cleanupTemporaryRepositories)

describe('state-based navigation', () => {
  it('maps the same recommendation to one harness-neutral Skill', () => {
    expect(universalSkillForRecommendation('evo init --apply')).toBe('evo-init')
    expect(universalSkillForRecommendation('/evo-implement S1')).toBe('evo-implement')
    expect(universalSkillForRecommendation('/evo-verify')).toBe('evo-verify')
    expect(universalSkillForRecommendation('evo approve change-one plan')).toBe('ask-evo')
  })

  it('routes an unmanaged repository to non-destructive initialization', async () => {
    const root = await temporaryRepository('navigation-unmanaged')

    const summary = await getStatusSummary(root)

    expect(summary.nextAction).toBe('evo init --apply')
  })

  it('routes an approved Plan to implementation instead of repeated approval', async () => {
    const root = await temporaryRepository('navigation-plan')
    await initializeRepository(root)
    await createActiveChange(root)

    const summary = await getStatusSummary(root)

    expect(summary).toEqual(expect.objectContaining({changeWeight: 'STANDARD', nextAction: 'select S1, then invoke /evo-implement S1'}))
  })

  it('routes reviewable Change intent to explicit content approval', async () => {
    const root = await temporaryRepository('navigation-approval')
    await initializeRepository(root)
    const paths = repositoryPaths(root)
    await writeRepositoryFiles(root, activeDraftFiles('large-change'))
    const state = await readState(root)
    await writeYaml(paths.state, {...state, activeChange: 'large-change', phase: 'GRILL', status: 'AWAITING_APPROVAL'})

    const summary = await getStatusSummary(root)

    expect(summary).toEqual(expect.objectContaining({changeWeight: 'LARGE', nextAction: 'evo approve large-change change'}))
  })

  it('routes an approved Large Change through Specification before Plan', async () => {
    const root = await temporaryRepository('navigation-large')
    await initializeRepository(root)
    const paths = repositoryPaths(root)
    await writeRepositoryFiles(root, activeDraftFiles('large-change'))
    const state = await readState(root)
    await writeYaml(paths.state, {...state, activeChange: 'large-change', phase: 'GRILL', status: 'AWAITING_APPROVAL'})
    await approveArtifact(root, 'large-change', 'change', 'test human')
    await writeFile(
      path.join(paths.activeWork, 'large-change', 'plan.md'),
      '---\nchange: large-change\nstatus: AWAITING_APPROVAL\napproval: null\n---\n\n# Plan\n',
      'utf8',
    )
    await approveArtifact(root, 'large-change', 'plan', 'test human')
    await writeYaml(paths.state, {...state, activeChange: 'large-change', phase: 'GRILL', status: 'APPROVED'})

    const summary = await getStatusSummary(root)

    expect(summary.nextAction).toBe('/evo-to-spec')
  })

  it('recovers the exact persisted current Slice during implementation', async () => {
    const root = await temporaryRepository('navigation-current-slice')
    await initializeRepository(root)
    await createActiveChange(root)
    const paths = repositoryPaths(root)
    const state = await readState(root)
    await writeYaml(paths.state, {
      ...state,
      phase: 'IMPLEMENT',
      status: 'APPROVED',
      currentSlice: 'S1',
      slices: [{id: 'S1', status: 'RUNNING', blockReason: null}],
    })

    const summary = await getStatusSummary(root)

    expect(summary.nextAction).toBe('/evo-implement S1')
  })
})

function activeDraftFiles(id: string): Record<string, string> {
  return {
    [`.evo/work/active/${id}/change.md`]: `---\nid: ${id}\nweight: LARGE\nstatus: AWAITING_APPROVAL\napproval: null\n---\n\n# Change\n`,
    [`.evo/work/active/${id}/plan.md`]: `---\nchange: ${id}\nstatus: DRAFT\napproval: null\n---\n\n# Plan\n`,
    [`.evo/work/active/${id}/evidence.md`]: '# Evidence\n',
  }
}
