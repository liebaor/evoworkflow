import {mkdir, readFile, rename, stat, writeFile} from 'node:fs/promises'
import path from 'node:path'

import {parse, stringify} from 'yaml'
import type {ZodType} from 'zod'

import {EvoError} from '../core/errors.js'

/** Returns true when a filesystem path exists. */
export async function pathExists(target: string): Promise<boolean> {
  try {
    await stat(target)
    return true
  } catch (error) {
    if (isNodeError(error) && error.code === 'ENOENT') return false
    throw error
  }
}

/** Reads and validates a YAML document. */
export async function readYaml<T>(target: string, schema: ZodType<T>): Promise<T> {
  let source: string
  try {
    source = await readFile(target, 'utf8')
  } catch (error) {
    if (isNodeError(error) && error.code === 'ENOENT') {
      throw new EvoError(`Missing required file: ${target}`)
    }
    throw error
  }

  let value: unknown
  try {
    value = parse(source)
  } catch (error) {
    throw new EvoError(`Invalid YAML in ${target}: ${errorMessage(error)}`)
  }

  const result = schema.safeParse(value)
  if (!result.success) {
    const details = result.error.issues
      .map((issue) => `${issue.path.join('.') || '<root>'}: ${issue.message}`)
      .join('; ')
    throw new EvoError(`Invalid data in ${target}: ${details}`)
  }
  return result.data
}

/** Writes YAML atomically so interruption cannot leave a partial state file. */
export async function writeYaml(target: string, value: unknown): Promise<void> {
  await writeTextAtomic(target, stringify(value, {lineWidth: 0}))
}

/** Writes text atomically with exactly one trailing newline. */
export async function writeTextAtomic(target: string, value: string): Promise<void> {
  await mkdir(path.dirname(target), {recursive: true})
  const normalized = `${value.replace(/\n+$/u, '')}\n`
  const temporary = `${target}.${process.pid}.${Date.now()}.tmp`
  await writeFile(temporary, normalized, 'utf8')
  await rename(temporary, target)
}

/** Creates a file only when it does not already exist. */
export async function writeTextIfMissing(target: string, value: string): Promise<'created' | 'preserved'> {
  await mkdir(path.dirname(target), {recursive: true})
  try {
    await writeFile(target, `${value.replace(/\n+$/u, '')}\n`, {encoding: 'utf8', flag: 'wx'})
    return 'created'
  } catch (error) {
    if (isNodeError(error) && error.code === 'EEXIST') return 'preserved'
    throw error
  }
}

/** Converts unknown failures to a concise user-facing message. */
export function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error)
}

/** Narrows Node filesystem and process failures by their stable code field. */
export function isNodeError(error: unknown): error is NodeJS.ErrnoException {
  return error instanceof Error && 'code' in error
}
