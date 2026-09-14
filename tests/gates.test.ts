import {afterEach, describe, expect, it} from 'vitest'

import {admitProjectGate, candidateAdmission, evaluateExecutionPreflight, evaluateProjectGates, evaluateGatePromotion} from '../src/validation/gates.js'
import {ProjectGateDefinitionSchema} from '../src/core/schemas.js'
import {cleanupTemporaryRepositories, createActiveChange, initializeRepository, temporaryRepository, writeRepositoryFiles} from './helpers.js'

afterEach(cleanupTemporaryRepositories)

describe('protocol and project gates', () => {
  it('keeps heuristic project signals as warnings and requires the five promotion fields', async () => {
    const root = await temporaryRepository('gates')
    await initializeRepository(root)
    await createActiveChange(root)
    await writeRepositoryFiles(root, {
      'src/controllers/InventoryController.java': 'class InventoryController { ApiResponse list() {} }\n',
      'src/controllers/UserController.java': 'class UserController { AjaxResult list() {} }\n',
    })
    const report = await evaluateProjectGates(root, 'change-one', {changedPaths: ['src/controllers/InventoryController.java']})
    expect(report.gates.every((gate) => gate.enforcement === 'WARNING')).toBe(true)

    const definition = ProjectGateDefinitionSchema.parse({
      id: 'PG-response',
      title: 'Response convention',
      authority: 'src/controllers/UserController.java',
      predicate: 'New controllers use AjaxResult.',
      falsifyingCase: 'A changed controller returns ApiResponse.',
      negativeRegression: 'The violating fixture causes the predicate to fail.',
      remediation: 'Reuse the existing response mechanism or record a Decision.',
    })
    expect(evaluateGatePromotion(definition).eligible).toBe(true)
  })

  it('does not admit an unfinished candidate and reports the hard reasons', async () => {
    const root = await temporaryRepository('admission')
    await initializeRepository(root)
    await createActiveChange(root)
    const admission = await candidateAdmission(root, 'change-one')
    expect(admission.status).toBe('NOT_READY')
    expect(admission.reasons.join('\n')).toMatch(/Evidence|Acceptance|Freshness|current-truth/u)
  })

  it('executes a promoted deterministic project gate through pass, violation, and restore', async () => {
    const root = await temporaryRepository('promoted-project-gate')
    await initializeRepository(root)
    await createActiveChange(root)
    await writeRepositoryFiles(root, {
      'src/controllers/UserController.java': 'class UserController { AjaxResult list() { return AjaxResult.success(); } }\n',
    })
    await admitProjectGate(root, ProjectGateDefinitionSchema.parse({
      id: 'PG-response',
      title: 'Response convention',
      check: 'NO_RESPONSE_DRIFT',
      authority: 'src/controllers/UserController.java',
      predicate: 'Changed controllers use AjaxResult.',
      falsifyingCase: 'A changed controller returns ApiResponse.',
      negativeRegression: 'The violating fixture causes the predicate to fail.',
      remediation: 'Reuse the existing response mechanism or record a Decision.',
      enforcement: 'HARD',
    }))

    const passing = await evaluateProjectGates(root, 'change-one', {changedPaths: ['src/controllers/UserController.java'], proposedText: 'return AjaxResult.success();'})
    expect(passing.gates.find((gate) => gate.id === 'G-pg-response')?.status).toBe('PASS')

    const failing = await evaluateProjectGates(root, 'change-one', {changedPaths: ['src/controllers/InventoryController.java'], proposedText: 'return ApiResponse.success();'})
    expect(failing.gates.find((gate) => gate.id === 'G-pg-response')).toEqual(expect.objectContaining({status: 'FAIL', enforcement: 'HARD'}))

    const restored = await evaluateProjectGates(root, 'change-one', {changedPaths: ['src/controllers/InventoryController.java'], proposedText: 'return AjaxResult.success();'})
    expect(restored.gates.find((gate) => gate.id === 'G-pg-response')?.status).toBe('PASS')
  })

  it('blocks execution preflight on conflicting authority constraints', async () => {
    const root = await temporaryRepository('gate-conflict')
    await initializeRepository(root)
    await createActiveChange(root)
    await writeRepositoryFiles(root, {
      '.evo/decisions/current/d-pagination-a.md': '---\nid: d-pagination-a\nchange: change-one\nstatus: current\nsupersedes: null\nsupersededBy: null\n---\n\n## Decision\n\nUse cursor pagination.\n',
      '.evo/decisions/current/d-pagination-b.md': '---\nid: d-pagination-b\nchange: change-one\nstatus: current\nsupersedes: null\nsupersededBy: null\n---\n\n## Decision\n\nUse offset pagination.\n',
    })
    const preflight = await evaluateExecutionPreflight(root, 'change-one')
    expect(preflight.find((gate) => gate.id === 'G-constraints-resolved')?.status).toBe('BLOCKED')
  })
})
