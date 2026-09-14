import {afterEach, describe, expect, it} from 'vitest'

import {buildAcceptanceTraceability, inspectAcceptanceTrace} from '../src/repository/acceptance-trace.js'
import {readAcceptanceSource} from '../src/repository/acceptance.js'
import {runEvidence} from '../src/repository/evidence.js'
import {cleanupTemporaryRepositories, createActiveChange, initializeRepository, temporaryRepository, writeRepositoryFiles} from './helpers.js'

afterEach(cleanupTemporaryRepositories)

describe('acceptance traceability', () => {
  it('maps acceptance to implementation, verification, evidence, and freshness', async () => {
    const root = await temporaryRepository('acceptance-trace')
    await initializeRepository(root)
    await createActiveChange(root)
    await writeRepositoryFiles(root, {
      'src/feature.ts': 'export const feature = true\n',
      '.evo/work/active/change-one/plan.md': '---\nchange: change-one\nstatus: APPROVED\napproval: null\n---\n\n# Plan\n\n### S1 — Approved behavior\n\n- AC-01: implementation in `src/feature.ts`; verify with `pnpm test`.\n',
    })
    const record = await runEvidence({
      root,
      changeId: 'change-one',
      acceptance: ['AC-01'],
      kind: 'unit',
      label: 'feature check',
      executable: process.execPath,
      args: ['-e', 'process.exit(0)'],
    })

    const report = await buildAcceptanceTraceability(root, 'change-one', {persist: true})
    expect(report.valid).toBe(true)
    expect(report.document.items).toEqual([expect.objectContaining({
      id: 'AC-01',
      status: 'PASS',
      freshness: 'CURRENT',
      evidenceRefs: [record.id],
      implementationSurface: ['src/feature.ts'],
    })])

    await writeRepositoryFiles(root, {
      '.evo/work/active/change-one/change.md': '---\nid: change-one\nweight: STANDARD\nstatus: APPROVED\napproval: null\n---\n\n# Change\n\n- AC-01: Changed acceptance boundary.\n',
    })
    const stale = await inspectAcceptanceTrace(root, 'change-one')
    expect(stale?.valid).toBe(false)
    expect(stale?.document.items[0]?.freshness).toBe('STALE')
  })

  it('preserves dotted hierarchical acceptance ids instead of truncating them', async () => {
    const root = await temporaryRepository('acceptance-dotted-id')
    await initializeRepository(root)
    await createActiveChange(root)
    await writeRepositoryFiles(root, {
      '.evo/work/active/change-one/change.md': '---\nid: change-one\nweight: LARGE\nstatus: AWAITING_APPROVAL\napproval: null\n---\n\n# Change\n\n- AC-6.1: First criterion.\n- AC-6.10: Tenth criterion.\n',
    })

    const source = await readAcceptanceSource(root, 'change-one')
    expect(source.criteria.map((criterion) => criterion.id)).toEqual(['AC-6.1', 'AC-6.10'])
  })
})
