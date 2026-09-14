import {afterEach, describe, expect, it} from 'vitest'

import type {AgentAdapter, AgentRunRequest} from '../src/agents/adapter.js'
import {approveGoal, executeGoal} from '../src/core/goal.js'
import {changeContextFingerprint} from '../src/core/fingerprint.js'
import type {AgentRunResult, Goal, State} from '../src/core/schemas.js'
import {cleanupTemporaryRepositories, createActiveChange, createTestGoal, initializeRepository, readConfig, readState, temporaryRepository, testAdapterConfig} from './helpers.js'

afterEach(cleanupTemporaryRepositories)

class RecordingAdapter implements AgentAdapter {
  public readonly calls: string[] = []

  public constructor(private readonly result: (request: AgentRunRequest) => AgentRunResult = completed) {}

  public async run(request: AgentRunRequest): Promise<AgentRunResult> {
    this.calls.push(request.slice.id)
    return this.result(request)
  }
}

describe('bounded Goal execution', () => {
  it('executes five approved Slices sequentially and stops at READY_FOR_REVIEW', async () => {
    const root = await temporaryRepository('five-slices')
    await initializeRepository(root)
    await createActiveChange(root)
    const adapterConfig = testAdapterConfig()
    const context = await changeContextFingerprint(root, 'change-one')
    const goal = approveGoal(createTestGoal(root, 5), adapterConfig, context)
    const adapter = new RecordingAdapter()
    const persisted = persistence(goal, await readState(root))

    const result = await executeGoal(goal, {
      adapter,
      adapterConfig,
      config: await readConfig(root),
      contextFingerprint: context,
      state: await readState(root),
      persistence: persisted,
    })

    expect(adapter.calls).toEqual(['S1', 'S2', 'S3', 'S4', 'S5'])
    expect(result.status).toBe('READY_FOR_REVIEW')
    expect(result.slices.every((slice) => slice.status === 'PASS')).toBe(true)
    expect(persisted.state.phase).toBe('VERIFY')
    expect(persisted.state.status).toBe('AWAITING_APPROVAL')
    expect(persisted.state.currentSlice).toBeNull()
    expect(persisted.state.slices).toEqual([
      {id: 'S1', status: 'PASS', blockReason: null},
      {id: 'S2', status: 'PASS', blockReason: null},
      {id: 'S3', status: 'PASS', blockReason: null},
      {id: 'S4', status: 'PASS', blockReason: null},
      {id: 'S5', status: 'PASS', blockReason: null},
    ])
    expect(JSON.stringify(result)).not.toContain('DONE')
  })

  it('stops a Decision-bearing Slice while continuing an independent Slice', async () => {
    const root = await temporaryRepository('blocked-slice')
    await initializeRepository(root)
    await createActiveChange(root)
    const adapterConfig = testAdapterConfig()
    const context = await changeContextFingerprint(root, 'change-one')
    const draft = createTestGoal(root, 4)
    draft.slices[2]!.dependsOn = []
    draft.slices[3]!.dependsOn = ['S2']
    const goal = approveGoal(draft, adapterConfig, context)
    const adapter = new RecordingAdapter((request) => request.slice.id === 'S2'
      ? {status: 'BLOCKED', summary: 'A security ownership Decision is required.', changedFiles: [], evidence: [], stopCondition: 'SECURITY_DECISION'}
      : completed())
    const persisted = persistence(goal, await readState(root))

    const result = await executeGoal(goal, {
      adapter,
      adapterConfig,
      config: await readConfig(root),
      contextFingerprint: context,
      state: await readState(root),
      persistence: persisted,
    })

    expect(adapter.calls).toEqual(['S1', 'S2', 'S3'])
    expect(result.status).toBe('BLOCKED')
    expect(result.slices.map((slice) => slice.status)).toEqual(['PASS', 'BLOCKED', 'PASS', 'PENDING'])
    expect(result.slices[1]?.stopCondition).toBe('SECURITY_DECISION')
    expect(persisted.state.currentSlice).toBe('S2')
    expect(persisted.state.slices).toEqual(result.slices.map((slice) => ({id: slice.id, status: slice.status, blockReason: slice.blockReason})))
  })

  it('blocks after repeated verification failure and preserves every attempt', async () => {
    const root = await temporaryRepository('failed-verification')
    await initializeRepository(root)
    await createActiveChange(root)
    const adapterConfig = testAdapterConfig()
    const context = await changeContextFingerprint(root, 'change-one')
    const draft = createTestGoal(root)
    draft.slices[0]!.verify = [{label: 'fails', command: process.execPath, args: ['-e', 'process.exit(7)'], timeoutMs: 10_000}]
    const goal = approveGoal(draft, adapterConfig, context)
    const adapter = new RecordingAdapter()
    const persisted = persistence(goal, await readState(root))

    const result = await executeGoal(goal, {
      adapter,
      adapterConfig,
      config: await readConfig(root),
      contextFingerprint: context,
      state: await readState(root),
      persistence: persisted,
    })

    expect(result.status).toBe('BLOCKED')
    expect(result.slices[0]?.attempts).toHaveLength(2)
    expect(result.slices[0]?.attempts.every((attempt) => attempt.verification[0]?.status === 'FAIL')).toBe(true)
    expect(result.slices[0]?.stopCondition).toBe('REPEATED_FAILURE')
  })

  it('records a bounded failure when verification ignores graceful termination', async () => {
    const root = await temporaryRepository('verification-timeout')
    await initializeRepository(root)
    await createActiveChange(root)
    const adapterConfig = testAdapterConfig()
    const context = await changeContextFingerprint(root, 'change-one')
    const draft = createTestGoal(root)
    draft.maxAttempts = 1
    draft.slices[0]!.verify = [{
      label: 'hangs',
      command: process.execPath,
      args: ['-e', 'process.on("SIGTERM",()=>{}); setInterval(()=>{},1000)'],
      timeoutMs: 25,
    }]
    const goal = approveGoal(draft, adapterConfig, context)

    const result = await executeGoal(goal, {
      adapter: new RecordingAdapter(),
      adapterConfig,
      config: await readConfig(root),
      contextFingerprint: context,
      state: await readState(root),
      persistence: persistence(goal, await readState(root)),
    })

    expect(result.status).toBe('BLOCKED')
    expect(result.slices[0]?.attempts[0]?.verification[0]).toEqual(expect.objectContaining({
      status: 'FAIL',
      output: expect.stringContaining('timed out after 25 ms'),
    }))
  })

  it('rejects execution after the approved Change context changes', async () => {
    const root = await temporaryRepository('stale-approval')
    await initializeRepository(root)
    await createActiveChange(root)
    const adapterConfig = testAdapterConfig()
    const context = await changeContextFingerprint(root, 'change-one')
    const goal = approveGoal(createTestGoal(root), adapterConfig, context)
    const persisted = persistence(goal, await readState(root))

    await expect(executeGoal(goal, {
      adapter: new RecordingAdapter(),
      adapterConfig,
      config: await readConfig(root),
      contextFingerprint: '0'.repeat(64),
      state: await readState(root),
      persistence: persisted,
    })).rejects.toThrow('changed after Goal approval')
  })

  it('persists a bounded blocker when postflight evaluation itself fails', async () => {
    const root = await temporaryRepository('postflight-failure')
    await initializeRepository(root)
    await createActiveChange(root)
    const adapterConfig = testAdapterConfig()
    const context = await changeContextFingerprint(root, 'change-one')
    const goal = approveGoal(createTestGoal(root, 1), adapterConfig, context)
    const result = await executeGoal(goal, {
      adapter: new RecordingAdapter(),
      adapterConfig,
      config: await readConfig(root),
      contextFingerprint: context,
      state: await readState(root),
      afterSlice: async () => { throw new Error('project gate evaluator failed') },
      persistence: persistence(goal, await readState(root)),
    })

    expect(result.status).toBe('BLOCKED')
    expect(result.slices[0]?.attempts[0]?.agent.status).toBe('COMPLETED')
    expect(result.slices[0]?.blockReason).toContain('Postflight evaluation failed')
    expect(result.slices[0]?.stopCondition).toBe('HARD_GATE_FAILURE')
  })
})

function completed(): AgentRunResult {
  return {status: 'COMPLETED', summary: 'Implemented the approved Slice.', changedFiles: ['src/example.ts'], evidence: [], stopCondition: null}
}

function persistence(initialGoal: Goal, initialState: State) {
  return {
    goal: structuredClone(initialGoal),
    state: structuredClone(initialState),
    async saveGoal(goal: Goal): Promise<void> { this.goal = structuredClone(goal) },
    async saveState(state: State): Promise<void> { this.state = structuredClone(state) },
  }
}
