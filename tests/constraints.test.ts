import {afterEach, describe, expect, it} from 'vitest'

import {resolveConstraintCandidates, resolveEngineeringConstraints, inspectConstraintsFreshness} from '../src/repository/constraints.js'
import {cleanupTemporaryRepositories, createActiveChange, initializeRepository, temporaryRepository, writeRepositoryFiles} from './helpers.js'

afterEach(cleanupTemporaryRepositories)

describe('resolved engineering constraints', () => {
  it('preserves source priority and prevents inference from becoming HARD', () => {
    const resolved = resolveConstraintCandidates([
      {type: 'HARD', topic: 'response', statement: 'Use the approved response contract.', source: {kind: 'CONTRACT', path: 'change.md'}, scope: 'change'},
      {type: 'REFERENCE', topic: 'response', statement: 'Use the approved response contract.', source: {kind: 'REPRESENTATIVE_CODE', path: 'src/reference.ts'}, scope: 'code'},
      {type: 'HARD', topic: 'permission', statement: 'Permission should match the existing path.', source: {kind: 'INFERENCE', path: 'scanner'}, scope: 'inference'},
    ])

    expect(resolved.find((item) => item.topic === 'response')).toEqual(expect.objectContaining({type: 'HARD', source: {kind: 'CONTRACT', path: 'change.md'}}))
    expect(resolved.find((item) => item.topic === 'permission')).toEqual(expect.objectContaining({type: 'SOFT', confidence: 0.5}))
  })

  it('emits CONFLICT for incompatible HARD facts instead of choosing one', () => {
    const resolved = resolveConstraintCandidates([
      {type: 'HARD', topic: 'pagination', statement: 'Use cursor pagination.', source: {kind: 'DECISION', path: '.evo/decisions/current/d-a.md'}, scope: 'change'},
      {type: 'HARD', topic: 'pagination', statement: 'Use offset pagination.', source: {kind: 'AUTHORITY', path: 'docs/api.md'}, scope: 'change'},
    ])

    expect(resolved).toHaveLength(1)
    expect(resolved[0]).toEqual(expect.objectContaining({type: 'CONFLICT', topic: 'pagination'}))
  })

  it('rebuilds persisted constraints and detects Change freshness drift', async () => {
    const root = await temporaryRepository('constraints')
    await initializeRepository(root)
    await createActiveChange(root)
    const first = await resolveEngineeringConstraints(root, 'change-one', {persist: true})
    expect(first.document.freshness).toBe('CURRENT')
    expect(first.constraints.length).toBeGreaterThan(0)

    const current = await inspectConstraintsFreshness(root, 'change-one')
    expect(current?.freshness).toBe('CURRENT')

    await writeRepositoryFiles(root, {
      '.evo/work/active/change-one/change.md': '---\nid: change-one\nweight: STANDARD\nstatus: APPROVED\napproval: null\n---\n\n# Change\n\n- AC-01: Changed contract boundary.\n',
    })
    const stale = await inspectConstraintsFreshness(root, 'change-one')
    expect(stale?.freshness).toBe('STALE')
  })

  it('keeps independent generic contract rules separate instead of inventing a conflict', async () => {
    const root = await temporaryRepository('constraints-generic-rules')
    await initializeRepository(root)
    await createActiveChange(root)
    await writeRepositoryFiles(root, {
      '.evo/work/active/change-one/change.md': '---\nid: change-one\nweight: STANDARD\nstatus: APPROVED\napproval: null\n---\n\n# Change\n\n## Scope\n\n- Update inventory behavior.\n- Preserve the existing audit trail.\n',
    })

    const resolution = await resolveEngineeringConstraints(root, 'change-one')
    expect(resolution.constraints.filter((item) => item.type === 'CONFLICT')).toHaveLength(0)
  })
})
