import {createHash} from 'node:crypto'
import {readFile} from 'node:fs/promises'
import path from 'node:path'

import type {AgentAdapterConfig, Goal} from './schemas.js'
import {EvoError} from './errors.js'
import {pathExists} from '../repository/io.js'
import {repositoryPaths} from '../repository/paths.js'

function canonicalize(value: unknown): unknown {
  if (Array.isArray(value)) return value.map((item) => canonicalize(item))
  if (value !== null && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([key, item]) => [key, canonicalize(item)])
    return Object.fromEntries(entries)
  }
  return value
}

function sha256(value: unknown): string {
  return createHash('sha256').update(JSON.stringify(canonicalize(value))).digest('hex')
}

/** Binds a narrative artifact approval to normalized frontmatter and body content. */
export function artifactApprovalFingerprint(data: Readonly<Record<string, unknown>>, body: string): string {
  const metadata = {...data}
  delete metadata.approval
  return sha256({
    body: `${body.replace(/^\n+/u, '').replace(/\n+$/u, '')}\n`,
    metadata,
  })
}

/** Returns the approved execution intent without mutable runtime fields. */
export function goalApprovalPayload(goal: Goal, adapter: AgentAdapterConfig): unknown {
  return {
    adapter,
    goal: {
      adapter: goal.adapter,
      changeId: goal.changeId,
      id: goal.id,
      maxAttempts: goal.maxAttempts,
      failureBudget: goal.failureBudget ?? null,
      repository: goal.repository,
      slices: goal.slices.map((slice) => ({
        acceptance: slice.acceptance,
        dependsOn: slice.dependsOn,
        id: slice.id,
        objective: slice.objective,
        verify: slice.verify,
      })),
      stopConditions: goal.stopConditions,
      title: goal.title,
    },
  }
}

/** Binds human approval to Goal intent and selected adapter configuration. */
export function approvalFingerprint(goal: Goal, adapter: AgentAdapterConfig): string {
  return sha256(goalApprovalPayload(goal, adapter))
}

/** Binds approval to the active Change intent, optional Specification, and Plan. */
export async function changeContextFingerprint(root: string, changeId: string): Promise<string> {
  if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/u.test(changeId)) throw new EvoError(`Invalid Change id: ${changeId}`)
  const changeRoot = path.join(repositoryPaths(root).activeWork, changeId)
  const required = ['change.md', 'plan.md']
  const optional = ['spec.md']
  const hash = createHash('sha256')
  for (const filename of [...required, ...optional]) {
    const target = path.join(changeRoot, filename)
    if (!(await pathExists(target))) {
      if (required.includes(filename)) throw new EvoError(`Active Change ${changeId} is missing ${filename}.`)
      continue
    }
    hash.update(filename)
    hash.update('\0')
    hash.update(await readFile(target))
    hash.update('\0')
  }
  return hash.digest('hex')
}
