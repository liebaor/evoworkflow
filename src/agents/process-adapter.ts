import {spawn} from 'node:child_process'

import {AgentRunResultSchema, type AgentAdapterConfig, type AgentRunResult} from '../core/schemas.js'
import {EvoError} from '../core/errors.js'
import type {AgentAdapter, AgentRunRequest} from './adapter.js'

const MAX_CAPTURE = 2_000_000
const TERMINATION_GRACE_MS = 500

/** Runs a configured local coding-agent CLI without invoking a shell. */
export class ProcessAgentAdapter implements AgentAdapter {
  public constructor(private readonly config: AgentAdapterConfig) {}

  public async run(request: AgentRunRequest): Promise<AgentRunResult> {
    const prompt = buildSlicePrompt(request)
    const args = this.config.args.map((argument) => replacePlaceholders(argument, request.repository, prompt))
    const includesPrompt = args.some((argument) => argument.includes(prompt))
    if (this.config.kind === 'opencode' && !includesPrompt) args.push(prompt)
    const input = this.config.kind === 'opencode' || includesPrompt ? null : prompt
    const output = await executeProcess(this.config.command, args, request.repository, input, this.config.timeoutMs)
    if (output.exitCode !== 0) {
      throw new EvoError(`Agent adapter exited with ${String(output.exitCode)}: ${concise(output.stderr || output.stdout)}`)
    }
    return parseAgentResult(output.stdout, this.config.kind)
  }
}

interface ProcessOutput {
  readonly exitCode: number | null
  readonly stdout: string
  readonly stderr: string
}

async function executeProcess(command: string, args: readonly string[], cwd: string, input: string | null, timeoutMs: number): Promise<ProcessOutput> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, [...args], {cwd, env: process.env, shell: false, stdio: ['pipe', 'pipe', 'pipe']})
    let stdout = ''
    let stderr = ''
    let hardKill: NodeJS.Timeout | null = null
    child.stdout.setEncoding('utf8')
    child.stderr.setEncoding('utf8')
    child.stdout.on('data', (chunk: string) => { stdout = appendBounded(stdout, chunk) })
    child.stderr.on('data', (chunk: string) => { stderr = appendBounded(stderr, chunk) })
    let timedOut = false
    const timeout = setTimeout(() => {
      timedOut = true
      child.kill('SIGTERM')
      hardKill = setTimeout(() => child.kill('SIGKILL'), TERMINATION_GRACE_MS)
    }, timeoutMs)
    child.once('error', (error) => {
      clearTimeout(timeout)
      if (hardKill) clearTimeout(hardKill)
      reject(error)
    })
    child.once('close', (exitCode) => {
      clearTimeout(timeout)
      if (hardKill) clearTimeout(hardKill)
      if (timedOut) reject(new EvoError(`Agent adapter exceeded ${timeoutMs} ms.`))
      else resolve({exitCode, stdout, stderr})
    })
    child.stdin.on('error', () => {
      // Early process exit is reported by the child close event; stdin adds no independent failure fact.
    })
    if (input === null) child.stdin.end()
    else child.stdin.end(input)
  })
}

function buildSlicePrompt(request: AgentRunRequest): string {
  return [
    'Execute exactly one approved evoworkflow Slice in the current repository.',
    '',
    `Goal: ${request.goal.id} — ${request.goal.title}`,
    `Slice: ${request.slice.id} — ${request.slice.objective}`,
    `Attempt: ${request.attempt} of ${request.goal.maxAttempts}`,
    `Invocation: ${request.invocationId ?? 'fresh-invocation'}`,
    '',
    'Acceptance:',
    ...request.slice.acceptance.map((item) => `- ${item}`),
    '',
    'Read AGENTS.md, .evo/project.md, .evo/state.yml, and the active Change/Plan before editing.',
    ...(request.workingContext ? [
      '',
      'Fresh Working Context references:',
      ...request.workingContext.references.map((item) => `- ${item.kind}/${item.priority}: ${item.path} — ${item.reason}`),
      ...(request.workingContext.unknowns.length > 0 ? ['Working Context unknowns:', ...request.workingContext.unknowns.map((item) => `- ${item}`)] : []),
    ] : []),
    ...(request.constraints ? [
      '',
      'Resolved Engineering Constraints:',
      ...request.constraints.map((item) => `- ${item.type} ${item.topic}: ${item.statement} [${item.source.kind}:${item.source.path}]`),
    ] : []),
    ...(request.preflight ? ['', 'Protocol preflight:', ...request.preflight.map((gate) => `- ${gate.status} ${gate.id}: ${gate.detail}`)] : []),
    'Stay inside this Slice. Do not change requirements, approve Decisions, broaden scope, commit, merge, deploy, or finish the Change.',
    `Stop and report BLOCKED for: ${request.goal.stopConditions.join(', ')}.`,
    'The runner will execute approved verification commands after you return.',
    '',
    'Return exactly one JSON object with this form:',
    '{"status":"COMPLETED|BLOCKED","summary":"...","changedFiles":["..."],"evidence":["..."],"stopCondition":null}',
    'When blocked, stopCondition must be one of the declared stop conditions.',
  ].join('\n')
}

function parseAgentResult(stdout: string, kind: AgentAdapterConfig['kind']): AgentRunResult {
  let candidate: unknown = parseJsonCandidate(stdout)
  if (kind === 'claude' && candidate && typeof candidate === 'object' && 'result' in candidate) {
    const result = (candidate as {result?: unknown}).result
    candidate = typeof result === 'string' ? parseJsonCandidate(result) : result
  }
  const parsed = AgentRunResultSchema.safeParse(candidate)
  if (!parsed.success) {
    throw new EvoError(`Agent adapter did not return the required JSON result: ${parsed.error.message}`)
  }
  return parsed.data
}

function parseJsonCandidate(output: string): unknown {
  const trimmed = output.trim()
  try {
    return JSON.parse(trimmed)
  } catch {
    const fenced = /```(?:json)?\s*([\s\S]*?)```/iu.exec(trimmed)?.[1]
    if (fenced) {
      try {
        return JSON.parse(fenced.trim())
      } catch {
        // Fall through to balanced-object extraction.
      }
    }
    const object = lastBalancedObject(trimmed)
    if (object) {
      try {
        return JSON.parse(object)
      } catch {
        // The stable error below explains the required adapter protocol.
      }
    }
  }
  throw new EvoError(`Agent adapter output is not JSON: ${concise(trimmed)}`)
}

function lastBalancedObject(value: string): string | null {
  let start = -1
  let depth = 0
  let inString = false
  let escaped = false
  let latest: string | null = null
  for (let index = 0; index < value.length; index += 1) {
    const character = value[index]
    if (inString) {
      if (character === '"' && !escaped) inString = false
      escaped = character === '\\' && !escaped
      if (character !== '\\') escaped = false
      continue
    }
    if (character === '"') {
      inString = true
      escaped = false
      continue
    }
    if (character === '{') {
      if (depth === 0) start = index
      depth += 1
    } else if (character === '}' && depth > 0) {
      depth -= 1
      if (depth === 0 && start >= 0) latest = value.slice(start, index + 1)
    }
  }
  return latest
}

function replacePlaceholders(argument: string, repository: string, prompt: string): string {
  return argument.replaceAll('{repository}', repository).replaceAll('{prompt}', prompt)
}

function appendBounded(current: string, chunk: string): string {
  const combined = current + chunk
  return combined.length <= MAX_CAPTURE ? combined : combined.slice(combined.length - MAX_CAPTURE)
}

function concise(value: string): string {
  const redacted = value
    .replace(/((?:api[_-]?key|token|secret|password)\s*[=:]\s*)[^\s]+/giu, '$1[REDACTED]')
    .trim()
  return redacted.length <= 1000 ? redacted : `${redacted.slice(-1000)} (truncated)`
}
