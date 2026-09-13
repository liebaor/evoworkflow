import {readdir, readFile} from 'node:fs/promises'
import path from 'node:path'

import type {ZodType} from 'zod'

import {ConfigSchema, GoalSchema, StateSchema, type Config, type Goal, type State} from '../core/schemas.js'
import {pathExists, readYaml} from './io.js'
import {repositoryPaths} from './paths.js'

export interface ManagedRepository {
  readonly root: string
  readonly config: Config
  readonly state: State
}

/** Opens and validates the machine state of an initialized repository. */
export async function openManagedRepository(root: string): Promise<ManagedRepository> {
  const paths = repositoryPaths(root)
  const [config, state] = await Promise.all([
    readYaml(paths.config, ConfigSchema),
    readYaml(paths.state, StateSchema),
  ])
  return {root: paths.root, config, state}
}

/** Reads one active Goal by id. */
export async function readActiveGoal(root: string, id: string): Promise<Goal> {
  const target = activeGoalPath(root, id)
  return readYaml(target, GoalSchema)
}

/** Resolves an active Goal path without accepting traversal characters. */
export function activeGoalPath(root: string, id: string): string {
  if (!/^[a-z0-9][a-z0-9-]*$/u.test(id)) throw new Error(`Invalid Goal id: ${id}`)
  return path.join(repositoryPaths(root).activeGoals, `${id}.yml`)
}

/** Returns sorted filenames in a directory, or an empty list when it is absent. */
export async function listDirectory(target: string): Promise<string[]> {
  if (!(await pathExists(target))) return []
  const entries = await readdir(target, {withFileTypes: true})
  return entries.filter((entry) => entry.isFile() || entry.isDirectory()).map((entry) => entry.name).sort()
}

/** Reads a UTF-8 file when present. */
export async function readOptionalText(target: string): Promise<string | null> {
  return await pathExists(target) ? readFile(target, 'utf8') : null
}

/** Reads an optional YAML document and validates it when present. */
export async function readOptionalYaml<T>(target: string, schema: ZodType<T>): Promise<T | null> {
  return await pathExists(target) ? readYaml(target, schema) : null
}
