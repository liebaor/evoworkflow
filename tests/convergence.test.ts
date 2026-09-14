import {appendFile} from 'node:fs/promises'
import {afterEach, describe, expect, it} from 'vitest'
import path from 'node:path'

import {checkConvergence, finishChange} from '../src/core/convergence.js'
import {approveArtifact} from '../src/repository/artifacts.js'
import {pathExists, writeTextAtomic, writeYaml} from '../src/repository/io.js'
import {activeGoalPath} from '../src/repository/managed.js'
import {repositoryPaths} from '../src/repository/paths.js'
import {approveActiveGoal, createGoal} from '../src/repository/goals.js'
import {initializeEvidence, runEvidence} from '../src/repository/evidence.js'
import {cleanupTemporaryRepositories, initializeRepository, readState, temporaryRepository, writeRepositoryFiles} from './helpers.js'

afterEach(cleanupTemporaryRepositories)

describe('repository convergence', () => {
  it('reports pending evidence without moving active work', async () => {
    const root = await preparedChange(false)
    const paths = repositoryPaths(root)

    const report = await checkConvergence(root)

    expect(report.ready).toBe(false)
    expect(report.items).toContainEqual(expect.objectContaining({area: 'evidence', status: 'PENDING'}))
    expect(await pathExists(path.join(paths.activeWork, 'standard-feature'))).toBe(true)
  })

  it('keeps external UNVERIFIED evidence pending even when acceptance rows pass', async () => {
    const root = await preparedChange(true)
    const target = path.join(repositoryPaths(root).activeWork, 'standard-feature', 'evidence.md')
    await appendFile(target, '\n## Unverified external or operational paths\n\n- GitHub Actions execution: UNVERIFIED\n', 'utf8')

    const report = await checkConvergence(root)

    expect(report.ready).toBe(false)
    expect(report.items).toContainEqual(expect.objectContaining({area: 'evidence', status: 'PENDING'}))
  })

  it('allows explicitly accepted external limitations without changing them to PASS', async () => {
    const root = await preparedChange(true)
    const paths = repositoryPaths(root)
    const evidence = path.join(paths.activeWork, 'standard-feature', 'evidence.md')
    const review = path.join(paths.activeWork, 'standard-feature', 'review.md')
    await appendFile(evidence, '\n## Unverified external or operational paths\n\n- GitHub Actions execution: UNVERIFIED\n', 'utf8')

    const pending = await checkConvergence(root)
    expect(pending.ready).toBe(false)

    await writeTextAtomic(review, '---\nchange: standard-feature\nstatus: APPROVED\nhumanAcceptance: true\nopenFindings: 0\ndocsConverged: true\nacceptedLimitations: true\n---\n\n# Review\n\nThe human accepted the known external limitation.\n')

    const report = await checkConvergence(root)

    expect(report.ready).toBe(true)
    expect(report.items).toContainEqual(expect.objectContaining({area: 'evidence', status: 'APPLY', detail: expect.stringContaining('UNVERIFIED')}))
  })

  it('archives only an accepted converged Change and promotes its Decisions', async () => {
    const root = await preparedChange(true)
    const paths = repositoryPaths(root)

    const report = await finishChange(root, undefined, new Date('2026-01-02T00:00:00.000Z'))

    expect(report.ready).toBe(true)
    expect(await pathExists(path.join(paths.activeWork, 'standard-feature'))).toBe(false)
    expect(await pathExists(path.join(paths.completedWork, 'standard-feature', 'evidence.md'))).toBe(true)
    expect(await pathExists(path.join(paths.completedWork, 'standard-feature', 'completion.yml'))).toBe(true)
    expect(await pathExists(path.join(paths.workingDecisions, 'd-standard.md'))).toBe(false)
    expect(await pathExists(path.join(paths.currentDecisions, 'd-standard.md'))).toBe(true)
    const state = await readState(root)
    expect(state).toEqual(expect.objectContaining({phase: 'IDLE', status: 'COMPLETED', activeChange: null, activeGoal: null}))
  })

  it('archives a ready Goal without validating it against the moved active Plan path', async () => {
    const root = await preparedChange(true)
    const paths = repositoryPaths(root)
    const draft = await createGoal(root, 'ready-goal', {
      title: 'Ready delegated work',
      changeId: 'standard-feature',
      adapter: 'codex',
      slices: [{
        id: 'S1',
        objective: 'Deliver the accepted behavior',
        acceptance: ['The behavior is observed'],
        dependsOn: [],
        verify: [{label: 'check', command: process.execPath, args: ['-e', 'process.exit(0)'], timeoutMs: 10_000}],
      }],
    })
    const ready = await approveActiveGoal(root, 'ready-goal')
    ready.status = 'READY_FOR_REVIEW'
    ready.slices[0]!.status = 'PASS'
    await writeYaml(activeGoalPath(root, 'ready-goal'), ready)
    const state = await readState(root)
    await writeYaml(paths.state, {
      ...state,
      activeGoal: draft.id,
      phase: 'FINISH',
      status: 'APPROVED',
      currentSlice: null,
      slices: [{id: 'S1', status: 'PASS', blockReason: null}],
    })

    await expect(finishChange(root)).resolves.toEqual(expect.objectContaining({ready: true}))
    expect(await pathExists(path.join(paths.completedGoals, 'ready-goal.yml'))).toBe(true)
  })

  it('requires a converged Review before allowing explicitly deferred acceptance', async () => {
    const root = await temporaryRepository('convergence-deferred')
    await initializeRepository(root)
    const paths = repositoryPaths(root)
    await writeRepositoryFiles(root, {
      '.evo/work/active/deferred-feature/change.md': '---\nid: deferred-feature\nweight: STANDARD\nstatus: AWAITING_APPROVAL\napproval: null\n---\n\n# Change\n\n- AC-01: Implemented behavior.\n- AC-02: Independent review.\n- AC-03: Final delivery after Finish.\n',
      '.evo/work/active/deferred-feature/plan.md': '---\nchange: deferred-feature\nstatus: AWAITING_APPROVAL\napproval: null\n---\n\n# Plan\n\n### S1 — Complete behavior\n\n- AC-01: implementation; verify with the focused test.\n- AC-02: review; verify with the independent review.\n- AC-03: final delivery; verify with the delivery checkpoint.\n',
    })
    const state = await readState(root)
    await writeYaml(paths.state, {...state, activeChange: 'deferred-feature', phase: 'VERIFY', status: 'AWAITING_APPROVAL', currentSlice: null, slices: [], updatedAt: new Date().toISOString()})
    await approveArtifact(root, 'deferred-feature', 'change', 'test human')
    await approveArtifact(root, 'deferred-feature', 'plan', 'test human')
    await initializeEvidence(root, 'deferred-feature')
    await runEvidence({
      root,
      changeId: 'deferred-feature',
      acceptance: ['AC-01'],
      kind: 'unit',
      label: 'implemented behavior',
      executable: process.execPath,
      args: ['-e', 'process.exit(0)'],
    })

    await writeTextAtomic(path.join(paths.activeWork, 'deferred-feature', 'review.md'), '---\nchange: deferred-feature\nstatus: APPROVED\nhumanAcceptance: true\nopenFindings: 0\ndocsConverged: true\ndeferredAcceptance:\n  - AC-03\n---\n\n# Review\n\nThe independent review is complete.\n')
    const beforeReviewEvidence = await checkConvergence(root)
    expect(beforeReviewEvidence.ready).toBe(false)
    expect(beforeReviewEvidence.items).toContainEqual(expect.objectContaining({area: 'evidence', status: 'PENDING'}))

    await runEvidence({
      root,
      changeId: 'deferred-feature',
      acceptance: ['AC-02'],
      kind: 'manual',
      label: 'independent review',
      executable: process.execPath,
      args: ['-e', 'process.exit(0)'],
    })
    const afterReviewEvidence = await checkConvergence(root)
    expect(afterReviewEvidence.ready).toBe(true)
    expect(afterReviewEvidence.items).toContainEqual(expect.objectContaining({area: 'evidence', status: 'APPLY', detail: expect.stringContaining('post-admission')}))
  })
})

async function preparedChange(complete: boolean): Promise<string> {
  const root = await temporaryRepository('convergence')
  await initializeRepository(root)
  await writeRepositoryFiles(root, {
    '.evo/work/active/standard-feature/change.md': '---\nid: standard-feature\nweight: STANDARD\nstatus: AWAITING_APPROVAL\napproval: null\n---\n\n# Change\n\nA standard user behavior.\n',
    '.evo/work/active/standard-feature/plan.md': '---\nchange: standard-feature\nstatus: AWAITING_APPROVAL\napproval: null\n---\n\n# Plan\n\n### S1 — Complete behavior\n\nOne vertical Slice.\n',
    '.evo/work/active/standard-feature/evidence.md': `# Evidence\n\n| Acceptance | Status | Evidence | Scope |\n|---|---|---|---|\n| AC-01 | ${complete ? 'PASS' : 'UNVERIFIED'} | focused test | integration |\n`,
    '.evo/work/active/standard-feature/review.md': complete
      ? '---\nchange: standard-feature\nstatus: APPROVED\nhumanAcceptance: true\nopenFindings: 0\ndocsConverged: true\n---\n\n# Review\n\nNo actionable findings.\n'
      : '---\nchange: standard-feature\nstatus: DRAFT\nhumanAcceptance: false\nopenFindings: 0\ndocsConverged: false\n---\n\n# Review\n',
    '.evo/decisions/working/d-standard.md': '---\nid: d-standard\nchange: standard-feature\nstatus: working\nsupersedes: null\nsupersededBy: null\n---\n\n# Decision\n\nUse the existing project pattern.\n',
  })
  const paths = repositoryPaths(root)
  const state = await readState(root)
  await writeYaml(paths.state, {...state, activeChange: 'standard-feature', phase: 'FINISH', status: 'AWAITING_APPROVAL', updatedAt: new Date().toISOString()})
  const approvedAt = new Date('2026-01-01T00:00:00.000Z')
  await approveArtifact(root, 'standard-feature', 'change', 'test human', approvedAt)
  await approveArtifact(root, 'standard-feature', 'plan', 'test human', approvedAt)
  await writeYaml(paths.state, {
    ...state,
    activeChange: 'standard-feature',
    phase: 'FINISH',
    status: 'APPROVED',
    currentSlice: null,
    slices: [{id: 'S1', status: 'PASS', blockReason: null}],
    updatedAt: approvedAt.toISOString(),
  })
  return root
}
