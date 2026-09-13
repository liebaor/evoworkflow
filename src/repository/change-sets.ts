import {createHash} from 'node:crypto'
import {readFile} from 'node:fs/promises'
import path from 'node:path'

import {ChangeSetSchema, type ChangeSet} from '../core/schemas.js'
import {EvoError} from '../core/errors.js'
import {readCompletion} from './completion.js'
import {pathExists, readYaml} from './io.js'
import {repositoryPaths} from './paths.js'

export interface ChangeSetItem {
  readonly id: string
  readonly status: 'APPLY' | 'PENDING' | 'CONFLICT'
  readonly detail: string
  readonly path: string
}

export interface ChangeSetReport {
  readonly id: string
  readonly valid: boolean
  readonly items: readonly ChangeSetItem[]
}

/** Reads one explicit multi-repository Change Set definition. */
export async function readChangeSet(root: string, id: string): Promise<ChangeSet> {
  if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/u.test(id)) throw new EvoError(`Invalid Change Set id: ${id}`)
  return readYaml(path.join(repositoryPaths(root).changeSets, `${id}.yml`), ChangeSetSchema)
}

/** Checks completed child Changes and immutable contract hashes without mutating any repository. */
export async function checkChangeSet(root: string, id: string): Promise<ChangeSetReport> {
  const definition = await readChangeSet(root, id)
  const items: ChangeSetItem[] = []
  for (const member of definition.members) {
    const childRoot = path.resolve(root, member.pathHint)
    const completion = await readCompletion(childRoot, member.change)
    if (!completion) {
      items.push({id: member.repositoryId, status: member.required ? 'CONFLICT' : 'PENDING', detail: `Missing completion record for ${member.change}.`, path: childRoot})
    } else if (completion.sourceStatus === 'READY_TO_COMMIT') {
      items.push({id: member.repositoryId, status: 'PENDING', detail: `Child Change ${member.change} is completed but not bound to a Git commit.`, path: childRoot})
    } else {
      items.push({id: member.repositoryId, status: 'APPLY', detail: `Child Change ${member.change} has a ${completion.sourceStatus} completion record.`, path: childRoot})
    }
  }
  for (const contract of definition.contracts) {
    if (!definition.members.some((member) => member.repositoryId === contract.authority)) {
      items.push({id: contract.id, status: 'CONFLICT', detail: `Contract authority ${contract.authority} is not a Change Set member.`, path: contract.path})
      continue
    }
    const target = path.resolve(root, contract.path)
    if (!(await pathExists(target))) {
      items.push({id: contract.id, status: 'CONFLICT', detail: `Contract authority is missing: ${contract.path}.`, path: contract.path})
      continue
    }
    const actual = createHash('sha256').update(await readFile(target)).digest('hex')
    items.push({id: contract.id, status: actual === contract.sha256 ? 'APPLY' : 'CONFLICT', detail: actual === contract.sha256 ? `Contract hash matches ${contract.sha256}.` : `Contract hash drifted; expected ${contract.sha256}, found ${actual}.`, path: contract.path})
  }
  return {id, valid: items.every((item) => item.status === 'APPLY'), items}
}

/** Formats a Change Set report for humans. */
export function formatChangeSetReport(report: ChangeSetReport): string {
  return [`Change Set: ${report.id}`, `Valid: ${report.valid ? 'yes' : 'no'}`, ...report.items.map((item) => `${item.status} ${item.id}: ${item.detail} (${item.path})`)].join('\n')
}
