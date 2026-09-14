import {afterEach, describe, expect, it} from 'vitest'

import {buildWorkingContext, writeWorkingContext} from '../src/repository/working-context.js'
import {resolveEngineeringConstraints} from '../src/repository/constraints.js'
import {inspectFreshness} from '../src/repository/freshness.js'
import {cleanupTemporaryRepositories, createActiveChange, initializeRepository, temporaryRepository, writeRepositoryFiles} from './helpers.js'

afterEach(cleanupTemporaryRepositories)

describe('derived artifact freshness', () => {
  it('marks context and constraints stale after a contract input changes', async () => {
    const root = await temporaryRepository('freshness')
    await initializeRepository(root)
    await createActiveChange(root)
    const context = await buildWorkingContext(root, 'change-one', {includeGit: false})
    await writeWorkingContext(root, 'change-one', context)
    await resolveEngineeringConstraints(root, 'change-one', {persist: true})

    const current = await inspectFreshness(root, 'change-one')
    expect(current.entries.find((entry) => entry.id === 'context')?.status).toBe('CURRENT')
    expect(current.entries.find((entry) => entry.id === 'constraints')?.status).toBe('CURRENT')

    await writeRepositoryFiles(root, {
      '.evo/work/active/change-one/plan.md': '---\nchange: change-one\nstatus: APPROVED\napproval: null\n---\n\n# Plan\n\n### S1 — Approved behavior\n\n- AC-01: use `src/changed.ts`; verify with `pnpm test`.\n',
    })
    const stale = await inspectFreshness(root, 'change-one')
    expect(stale.entries.find((entry) => entry.id === 'context')?.status).toBe('STALE')
    expect(stale.entries.find((entry) => entry.id === 'constraints')?.status).toBe('STALE')
  })

  it('records missing derived artifacts as MISSING instead of silently treating them as current', async () => {
    const root = await temporaryRepository('freshness-missing')
    await initializeRepository(root)
    await createActiveChange(root)
    const report = await inspectFreshness(root, 'change-one')
    expect(report.entries.find((entry) => entry.id === 'acceptance')?.status).toBe('MISSING')
    expect(report.entries.find((entry) => entry.id === 'evidence')?.status).toBe('MISSING')
  })

  it('marks Context and Constraints stale when a new Decision enters the input directories', async () => {
    const root = await temporaryRepository('freshness-new-decision')
    await initializeRepository(root)
    await createActiveChange(root)
    const context = await buildWorkingContext(root, 'change-one', {includeGit: false})
    await writeWorkingContext(root, 'change-one', context)
    await resolveEngineeringConstraints(root, 'change-one', {persist: true})

    await writeRepositoryFiles(root, {
      '.evo/decisions/current/d-pagination-new.md': '---\nid: d-pagination-new\nchange: change-one\nstatus: current\nsupersedes: null\nsupersededBy: null\n---\n\n## Decision\n\nUse cursor pagination.\n',
    })

    const report = await inspectFreshness(root, 'change-one')
    expect(report.entries.find((entry) => entry.id === 'context')?.status).toBe('STALE')
    expect(report.entries.find((entry) => entry.id === 'constraints')?.status).toBe('STALE')
  })
})
