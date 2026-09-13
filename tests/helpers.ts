import {mkdir, mkdtemp, readFile, rm, writeFile} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import path from 'node:path'

import {ConfigSchema, GoalSchema, StateSchema, type AgentAdapterConfig, type Goal, type State} from '../src/core/schemas.js'
import {applyInitialization, planInitialization} from '../src/repository/init.js'
import {approveArtifact} from '../src/repository/artifacts.js'
import {readYaml, writeYaml} from '../src/repository/io.js'
import {repositoryPaths} from '../src/repository/paths.js'

const temporaryRoots: string[] = []

export async function temporaryRepository(name: string): Promise<string> {
  const root = await mkdtemp(path.join(tmpdir(), `evoworkflow-${name}-`))
  temporaryRoots.push(root)
  return root
}

export async function cleanupTemporaryRepositories(): Promise<void> {
  await Promise.all(temporaryRoots.splice(0).map((root) => rm(root, {recursive: true, force: true})))
}

export async function writeRepositoryFiles(root: string, files: Readonly<Record<string, string>>): Promise<void> {
  for (const [relative, contents] of Object.entries(files)) {
    const target = path.join(root, relative)
    await mkdir(path.dirname(target), {recursive: true})
    await writeFile(target, contents, 'utf8')
  }
}

export async function initializeRepository(root: string): Promise<void> {
  await applyInitialization(await planInitialization(root))
}

export async function createActiveChange(root: string, id = 'change-one'): Promise<string> {
  const paths = repositoryPaths(root)
  const changeRoot = path.join(paths.activeWork, id)
  await writeRepositoryFiles(root, {
    [`.evo/work/active/${id}/change.md`]: `---\nid: ${id}\nweight: STANDARD\nstatus: AWAITING_APPROVAL\napproval: null\n---\n\n# Change\n\nApproved user outcome and AC-01.\n`,
    [`.evo/work/active/${id}/plan.md`]: `---\nchange: ${id}\nstatus: AWAITING_APPROVAL\napproval: null\n---\n\n# Plan\n\n### S1 — Approved behavior\n\nApproved vertical Slice and verification.\n`,
    [`.evo/work/active/${id}/evidence.md`]: '# Evidence\n\n| Acceptance | Status | Evidence | Scope |\n|---|---|---|---|\n| AC-01 | UNVERIFIED | Not run | focused |\n',
  })
  const state = await readYaml(paths.state, StateSchema)
  await writeYaml(paths.state, {...state, activeChange: id, phase: 'PLAN', status: 'AWAITING_APPROVAL', updatedAt: new Date().toISOString()})
  const now = new Date('2026-01-01T00:00:00.000Z')
  await approveArtifact(root, id, 'change', 'test human', now)
  await approveArtifact(root, id, 'plan', 'test human', now)
  await writeYaml(paths.state, {
    ...state,
    activeChange: id,
    phase: 'PLAN',
    status: 'APPROVED',
    currentSlice: null,
    slices: [{id: 'S1', status: 'PENDING', blockReason: null}],
    updatedAt: now.toISOString(),
  })
  return changeRoot
}

export async function readState(root: string): Promise<State> {
  return readYaml(repositoryPaths(root).state, StateSchema)
}

export async function readConfig(root: string) {
  return readYaml(repositoryPaths(root).config, ConfigSchema)
}

export function testAdapterConfig(): AgentAdapterConfig {
  return {kind: 'process', command: process.execPath, args: [], timeoutMs: 10_000}
}

export function createTestGoal(root: string, sliceCount = 1): Goal {
  const now = new Date('2026-01-01T00:00:00.000Z').toISOString()
  return GoalSchema.parse({
    schemaVersion: 1,
    id: 'nightly-feature',
    title: 'Approved feature Slices',
    changeId: 'change-one',
    repository: root,
    adapter: 'test',
    maxAttempts: 2,
    status: 'DRAFT',
    stopConditions: [
      'REQUIREMENT_AMBIGUITY',
      'ACCEPTANCE_CHANGE',
      'ARCHITECTURE_DEVIATION',
      'BREAKING_API',
      'SECURITY_DECISION',
      'DESTRUCTIVE_DATA_OPERATION',
      'UNEXPECTED_DEPENDENCY',
      'SCOPE_EXPANSION',
      'REPEATED_FAILURE',
    ],
    slices: Array.from({length: sliceCount}, (_, index) => ({
      id: `S${index + 1}`,
      objective: `Deliver behavior ${index + 1}`,
      acceptance: [`Behavior ${index + 1} is observable`],
      dependsOn: index === 0 ? [] : [`S${index}`],
      verify: [{label: `verify S${index + 1}`, command: process.execPath, args: ['-e', 'process.exit(0)'], timeoutMs: 10_000}],
      status: 'PENDING',
      attempts: [],
      blockReason: null,
      stopCondition: null,
    })),
    approval: null,
    runEpoch: 0,
    resumes: [],
    createdAt: now,
    updatedAt: now,
  })
}

export async function fileContents(target: string): Promise<string> {
  return readFile(target, 'utf8')
}
