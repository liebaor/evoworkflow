import {describe, expect, it} from 'vitest'

import {ProcessAgentAdapter} from '../src/agents/process-adapter.js'
import {createTestGoal, testAdapterConfig} from './helpers.js'

describe('ProcessAgentAdapter', () => {
  it('parses a structured result after ordinary adapter output', async () => {
    const goal = createTestGoal(process.cwd())
    const script = [
      'let input="";',
      'process.stdin.on("data", chunk => input += chunk);',
      'process.stdin.on("end", () => {',
      'if (!input.includes("Execute exactly one approved")) process.exit(3);',
      'console.log("agent progress");',
      'console.log(JSON.stringify({status:"COMPLETED",summary:"ok",changedFiles:[],evidence:[],stopCondition:null}));',
      '});',
    ].join('')
    const adapter = new ProcessAgentAdapter({...testAdapterConfig(), args: ['-e', script]})

    const result = await adapter.run({repository: process.cwd(), goal, slice: goal.slices[0]!, attempt: 1})

    expect(result.status).toBe('COMPLETED')
    expect(result.summary).toBe('ok')
  })

  it('parses Claude JSON envelopes', async () => {
    const goal = createTestGoal(process.cwd())
    const inner = JSON.stringify({status: 'BLOCKED', summary: 'need decision', changedFiles: [], evidence: [], stopCondition: 'REQUIREMENT_AMBIGUITY'})
    const script = `process.stdout.write(JSON.stringify({result:${JSON.stringify(inner)}}))`
    const adapter = new ProcessAgentAdapter({kind: 'claude', command: process.execPath, args: ['-e', script], timeoutMs: 10_000})

    const result = await adapter.run({repository: process.cwd(), goal, slice: goal.slices[0]!, attempt: 1})

    expect(result.status).toBe('BLOCKED')
    expect(result.stopCondition).toBe('REQUIREMENT_AMBIGUITY')
  })

  it('hard-stops an adapter that ignores the graceful timeout signal', async () => {
    const goal = createTestGoal(process.cwd())
    const script = 'process.on("SIGTERM",()=>{}); setInterval(()=>{},1000)'
    const adapter = new ProcessAgentAdapter({kind: 'process', command: process.execPath, args: ['-e', script], timeoutMs: 25})
    const startedAt = Date.now()

    await expect(adapter.run({repository: process.cwd(), goal, slice: goal.slices[0]!, attempt: 1})).rejects.toThrow('exceeded 25 ms')
    expect(Date.now() - startedAt).toBeLessThan(2000)
  })
})
