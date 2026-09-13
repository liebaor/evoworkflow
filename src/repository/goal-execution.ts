import {mkdir, open, unlink} from 'node:fs/promises'
import path from 'node:path'

import {ProcessAgentAdapter} from '../agents/process-adapter.js'
import {executeGoal} from '../core/goal.js'
import {changeContextFingerprint} from '../core/fingerprint.js'
import {EvoError} from '../core/errors.js'
import type {Goal, State} from '../core/schemas.js'
import {isNodeError, writeYaml} from './io.js'
import {activeGoalPath, openManagedRepository, readActiveGoal} from './managed.js'
import {repositoryPaths} from './paths.js'

/** Executes one persisted, approved Goal with its configured local Agent Adapter. */
export async function runStoredGoal(root: string, id: string): Promise<Goal> {
  const paths = repositoryPaths(root)
  const lockDirectory = path.join(paths.goals, '.locks')
  const lockPath = path.join(lockDirectory, `${id}.lock`)
  await mkdir(lockDirectory, {recursive: true})
  let lock
  try {
    lock = await open(lockPath, 'wx')
  } catch {
    throw new EvoError(`Goal ${id} already has an execution lock at ${lockPath}. Inspect the running process before removing a stale lock.`)
  }
  try {
    await lock.writeFile(`${JSON.stringify({pid: process.pid, startedAt: new Date().toISOString()})}\n`)
    const managed = await openManagedRepository(root)
    const goal = await readActiveGoal(root, id)
    const adapterConfig = managed.config.agents.adapters[goal.adapter]
    if (!adapterConfig) throw new EvoError(`Unknown Agent Adapter: ${goal.adapter}`)
    const contextFingerprint = await changeContextFingerprint(root, goal.changeId)
    const adapter = new ProcessAgentAdapter(adapterConfig)
    return await executeGoal(goal, {
      adapter,
      adapterConfig,
      config: managed.config,
      contextFingerprint,
      state: managed.state,
      persistence: {
        saveGoal: async (value) => writeYaml(activeGoalPath(root, id), value),
        saveState: async (value: State) => writeYaml(paths.state, value),
      },
    })
  } finally {
    await lock.close()
    await unlink(lockPath).catch((error: unknown) => {
      if (!isNodeError(error) || error.code !== 'ENOENT') throw error
      // A concurrent cleanup may remove the lock after the runner closes it.
    })
  }
}
