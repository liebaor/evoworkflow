import {afterEach, describe, expect, it} from 'vitest'
import path from 'node:path'

import {runStoredGoal} from '../src/repository/goal-execution.js'
import {approveActiveGoal, createGoal} from '../src/repository/goals.js'
import {admitProjectGate} from '../src/validation/gates.js'
import {ProjectGateDefinitionSchema} from '../src/core/schemas.js'
import {pathExists, writeYaml} from '../src/repository/io.js'
import {repositoryPaths} from '../src/repository/paths.js'
import {cleanupTemporaryRepositories, createActiveChange, initializeRepository, readConfig, readState, temporaryRepository, writeRepositoryFiles} from './helpers.js'

afterEach(cleanupTemporaryRepositories)

describe('bounded Goal orchestration', () => {
  it('refreshes context, persists constraints, records pre/post gates, and ends READY_FOR_REVIEW', async () => {
    const root = await temporaryRepository('goal-orchestration')
    await initializeRepository(root)
    await createActiveChange(root)
    await writeRepositoryFiles(root, {
      'package.json': '{"name":"bounded-fixture","version":"1.0.0","engines":{"node":">=22"},"scripts":{"test":"vitest","dev":"node app.js"}}\n',
      'docs/architecture.md': '# Architecture\n',
      '.github/workflows/ci.yml': 'name: ci\n',
    })
    await configureDeterministicAdapter(root)
    await createGoal(root, 'bounded', {
      title: 'Bounded execution',
      changeId: 'change-one',
      adapter: 'test',
      slices: [{
        id: 'S1',
        objective: 'Run one bounded Slice',
        acceptance: ['The Slice is observable'],
        dependsOn: [],
        verify: [{label: 'focused verification', command: process.execPath, args: ['-e', 'process.exit(0)'], timeoutMs: 10_000}],
      }],
    })
    await approveActiveGoal(root, 'bounded')

    const goal = await runStoredGoal(root, 'bounded')
    const attempt = goal.slices[0]?.attempts[0]
    expect(goal.status).toBe('READY_FOR_REVIEW')
    expect(attempt?.invocationId).toContain('bounded/S1')
    expect(attempt?.workingContextFingerprint).toMatch(/^[a-f0-9]{64}$/u)
    expect(attempt?.constraintsFingerprint).toMatch(/^[a-f0-9]{64}$/u)
    expect(attempt?.preflight?.every((gate) => gate.status === 'PASS')).toBe(true)
    expect(attempt?.postflight).toBeDefined()
    expect(await pathExists(path.join(repositoryPaths(root).activeWork, 'change-one', 'constraints.yml'))).toBe(true)
    expect((await readState(root)).phase).toBe('VERIFY')
    expect((await readState(root)).status).toBe('AWAITING_APPROVAL')
  })

  it('stops before worker invocation when a new Decision creates a HARD conflict', async () => {
    const root = await temporaryRepository('goal-preflight-stop')
    await initializeRepository(root)
    await createActiveChange(root)
    await writeRepositoryFiles(root, {
      'package.json': '{"name":"bounded-fixture","version":"1.0.0","engines":{"node":">=22"},"scripts":{"test":"vitest","dev":"node app.js"}}\n',
      'docs/architecture.md': '# Architecture\n',
      '.github/workflows/ci.yml': 'name: ci\n',
    })
    await configureDeterministicAdapter(root)
    await createGoal(root, 'blocked-by-gate', {
      title: 'Stop on conflict',
      changeId: 'change-one',
      adapter: 'test',
      slices: [{
        id: 'S1',
        objective: 'Do not cross a conflicting boundary',
        acceptance: ['The conflict is not ignored'],
        dependsOn: [],
        verify: [{label: 'focused verification', command: process.execPath, args: ['-e', 'process.exit(0)'], timeoutMs: 10_000}],
      }],
    })
    await approveActiveGoal(root, 'blocked-by-gate')
    await writeRepositoryFiles(root, {
      '.evo/decisions/current/d-pagination-a.md': '---\nid: d-pagination-a\nchange: change-one\nstatus: current\nsupersedes: null\nsupersededBy: null\n---\n\n## Decision\n\nUse cursor pagination.\n',
      '.evo/decisions/current/d-pagination-b.md': '---\nid: d-pagination-b\nchange: change-one\nstatus: current\nsupersedes: null\nsupersededBy: null\n---\n\n## Decision\n\nUse offset pagination.\n',
    })

    const goal = await runStoredGoal(root, 'blocked-by-gate')
    const attempt = goal.slices[0]?.attempts[0]
    expect(goal.status).toBe('BLOCKED')
    expect(attempt?.agent.status).toBe('BLOCKED')
    expect(attempt?.agent.stopCondition).toBe('CONSTRAINT_CONFLICT')
    expect(attempt?.agent.summary).toContain('conflict')
  })

  it('blocks a completed worker when a promoted HARD project gate fails in postflight', async () => {
    const root = await temporaryRepository('goal-project-gate')
    await initializeRepository(root)
    await createActiveChange(root)
    await writeRepositoryFiles(root, {
      'package.json': '{"name":"bounded-fixture","version":"1.0.0","engines":{"node":">=22"},"scripts":{"test":"vitest","dev":"node app.js"}}\n',
      'pom.xml': '<project><properties><java.version>17</java.version></properties></project>\n',
      'docs/architecture.md': '# Architecture\n',
      '.github/workflows/ci.yml': 'name: ci\n',
      'src/controllers/UserController.java': 'class UserController { AjaxResult list() { return AjaxResult.success(); } }\n',
      'src/controllers/InventoryController.java': 'class InventoryController { ApiResponse list() { return ApiResponse.success(); } }\n',
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
    await configureDeterministicAdapter(root, ['src/controllers/InventoryController.java'])
    await createGoal(root, 'postflight-gate', {
      title: 'Postflight project gate',
      changeId: 'change-one',
      adapter: 'test',
      slices: [{
        id: 'S1',
        objective: 'Run one bounded Slice',
        acceptance: ['The Slice is observable'],
        dependsOn: [],
        verify: [{label: 'focused verification', command: process.execPath, args: ['-e', 'process.exit(0)'], timeoutMs: 10_000}],
      }],
    })
    await approveActiveGoal(root, 'postflight-gate')

    const goal = await runStoredGoal(root, 'postflight-gate')
    const attempt = goal.slices[0]?.attempts[0]
    expect(goal.status).toBe('BLOCKED')
    expect(attempt?.agent.status).toBe('COMPLETED')
    expect(attempt?.postflight?.find((gate) => gate.id === 'G-pg-response')).toEqual(expect.objectContaining({status: 'FAIL', enforcement: 'HARD'}))
    expect(attempt?.agent.stopCondition).toBeNull()
    expect(goal.slices[0]?.stopCondition).toBe('HARD_GATE_FAILURE')
  })
})

async function configureDeterministicAdapter(root: string, changedFiles: readonly string[] = []): Promise<void> {
  const config = await readConfig(root)
  const serializedChangedFiles = JSON.stringify([...changedFiles])
  await writeYaml(repositoryPaths(root).config, {
    ...config,
    goal: {...config.goal, defaultAdapter: 'test'},
    agents: {
      ...config.agents,
      adapters: {
        ...config.agents.adapters,
        test: {
          kind: 'process',
          command: process.execPath,
          args: ['-e', `console.log(JSON.stringify({status:"COMPLETED",summary:"deterministic worker completed",changedFiles:${serializedChangedFiles},evidence:[]}))`],
          timeoutMs: 10_000,
        },
      },
    },
  })
}
