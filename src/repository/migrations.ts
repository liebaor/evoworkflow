import path from 'node:path'

import {ConfigSchema, EvidenceRecordSchema, StateSchema, type EvidenceRecord} from '../core/schemas.js'
import {EvoError} from '../core/errors.js'
import {readAcceptanceSource} from './acceptance.js'
import {captureGitSnapshot} from './git-snapshot.js'
import {readEvidence, evidenceDocumentPath} from './evidence.js'
import {listDirectory, openManagedRepository} from './managed.js'
import {pathExists, readYaml, writeYaml} from './io.js'
import {repositoryPaths} from './paths.js'

export interface MigrationAction {
  readonly kind: 'CONFIG' | 'STATE' | 'EVIDENCE'
  readonly path: string
  readonly detail: string
}

export interface MigrationPlan {
  readonly root: string
  readonly targetVersion: 2
  readonly actions: readonly MigrationAction[]
}

export interface MigrationResult {
  readonly plan: MigrationPlan
  readonly applied: boolean
  readonly receipt: string | null
}

/** Produces a read-only v1-to-v2 migration plan. */
export async function planMigration(root: string): Promise<MigrationPlan> {
  const paths = repositoryPaths(root)
  const config = await readYaml(paths.config, ConfigSchema)
  const state = await readYaml(paths.state, StateSchema)
  const actions: MigrationAction[] = []
  if (config.schemaVersion === 1) actions.push({kind: 'CONFIG', path: relative(paths.root, paths.config), detail: 'Upgrade config.yml schemaVersion from 1 to 2.'})
  if (state.schemaVersion === 1) actions.push({kind: 'STATE', path: relative(paths.root, paths.state), detail: 'Upgrade state.yml schemaVersion from 1 to 2.'})
  for (const directory of [paths.activeWork, paths.completedWork]) {
    for (const changeId of await listDirectory(directory)) {
      const legacy = path.join(directory, changeId, 'evidence.md')
      const modern = path.join(directory, changeId, 'evidence.yml')
      if (await pathExists(legacy) && !(await pathExists(modern))) {
        actions.push({kind: 'EVIDENCE', path: relative(paths.root, modern), detail: 'Convert legacy evidence.md table to evidence.yml and create imported evidence records.'})
      }
    }
  }
  return {root: paths.root, targetVersion: 2, actions}
}

/** Applies only the planned protocol migration and writes a durable receipt. */
export async function applyMigration(plan: MigrationPlan, now = new Date()): Promise<MigrationResult> {
  const paths = repositoryPaths(plan.root)
  if (plan.actions.length === 0) return {plan, applied: false, receipt: null}
  const managed = await openManagedRepository(plan.root)
  if (managed.config.schemaVersion === 1) await writeYaml(paths.config, {...managed.config, schemaVersion: 2})
  if (managed.state.schemaVersion === 1) await writeYaml(paths.state, {...managed.state, schemaVersion: 2, updatedAt: now.toISOString()})
  for (const action of plan.actions.filter((item) => item.kind === 'EVIDENCE')) {
    const modernTarget = path.resolve(paths.root, action.path)
    const changeId = path.basename(path.dirname(modernTarget))
    const completed = modernTarget.includes(`${path.sep}completed${path.sep}`)
    await migrateEvidence(plan.root, changeId, completed, now)
  }
  const receipt = path.join(paths.migrations, `${receiptId(now)}.yml`)
  await writeYaml(receipt, {
    schemaVersion: 1,
    kind: 'protocol-v2',
    appliedAt: now.toISOString(),
    actions: plan.actions,
  })
  return {plan, applied: true, receipt: relative(paths.root, receipt)}
}

/** Formats migration preview and application results without hiding write targets. */
export function formatMigration(result: MigrationPlan | MigrationResult): string {
  const plan = 'plan' in result ? result.plan : result
  const lines = [
    `Repository: ${plan.root}`,
    `Target protocol: v${plan.targetVersion}`,
    `Actions: ${plan.actions.length}`,
    ...plan.actions.map((action) => `- ${action.kind}: ${action.path} — ${action.detail}`),
  ]
  if ('applied' in result) lines.push(`Applied: ${result.applied ? 'yes' : 'no'}`, `Receipt: ${result.receipt ?? 'none'}`)
  else lines.push('No files were changed. Use --apply to execute this migration.')
  return lines.join('\n')
}

async function migrateEvidence(root: string, changeId: string, completed: boolean, now: Date): Promise<void> {
  const read = await readEvidence(root, changeId, completed)
  if (!read.legacy || !read.document) return
  const authority = await readAcceptanceSource(root, changeId, completed)
  const snapshot = await captureGitSnapshot(root, now)
  const records: EvidenceRecord[] = []
  const acceptance = read.document.acceptance.map((item, index) => {
    const record = EvidenceRecordSchema.parse({
      schemaVersion: 2,
      id: `EV-MIGRATED-${String(index + 1).padStart(2, '0')}`,
      change: changeId,
      acceptance: [item.id],
      kind: 'manual',
      label: 'Imported from legacy evidence.md',
      status: item.status,
      command: null,
      exitCode: null,
      summary: `Imported legacy status ${item.status} for ${item.id}; original evidence.md remains preserved.`,
      outputHash: null,
      git: snapshot,
      artifacts: [],
      startedAt: now.toISOString(),
      endedAt: now.toISOString(),
    })
    records.push(record)
    return {...item, evidenceRefs: [record.id]}
  })
  if (authority.criteria.length === 0) throw new EvoError(`Change ${changeId} has no acceptance criteria to migrate.`)
  const base = completed ? repositoryPaths(root).completedWork : repositoryPaths(root).activeWork
  await Promise.all(records.map((record) => writeYaml(path.join(base, changeId, 'evidence', 'records', `${record.id}.yml`), record)))
  await writeYaml(evidenceDocumentPath(root, changeId, completed), {...read.document, updatedAt: now.toISOString(), acceptance})
}

function receiptId(now: Date): string {
  return `protocol-v2-${now.toISOString().replace(/\D/gu, '').slice(0, 14)}`
}

function relative(root: string, target: string): string {
  return path.relative(root, target).split(path.sep).join('/')
}
