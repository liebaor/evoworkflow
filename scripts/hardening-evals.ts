import {createHash} from 'node:crypto'
import {execFile as execFileCallback} from 'node:child_process'
import {mkdir, mkdtemp, readFile, rm, writeFile} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {promisify} from 'node:util'

import {checkCurrentTruth, createCompletionRecord} from '../src/repository/completion.js'
import {checkChangeSet} from '../src/repository/change-sets.js'
import {runEvidence, initializeEvidence, reconcileEvidence} from '../src/repository/evidence.js'
import {buildRecoveryReport} from '../src/repository/recovery.js'
import {applyMigration, planMigration} from '../src/repository/migrations.js'
import {pathExists, readYaml, writeYaml} from '../src/repository/io.js'
import {applyInitialization, planInitialization} from '../src/repository/init.js'
import {repositoryPaths} from '../src/repository/paths.js'
import {ConfigSchema, StateSchema} from '../src/core/schemas.js'
import {runDoctor} from '../src/validation/doctor.js'

const execFile = promisify(execFileCallback)
const roots: string[] = []
const results: string[] = []

try {
  await evalMissingAcceptance()
  await evalDuplicateAndExtraAcceptance()
  await evalEvidenceTreeDrift()
  await evalCompletionHandoff()
  await evalCurrentTruth()
  await evalMigration()
  await evalChangeSet()
  await evalFreshRecovery()
} finally {
  await Promise.all(roots.map((root) => rm(root, {recursive: true, force: true})))
}

process.stdout.write(`${results.join('\n')}\nHardening evaluations E013-E020 passed.\n`)

async function evalMissingAcceptance(): Promise<void> {
  const root = await preparedRoot('e013')
  await initializeEvidence(root, 'hardening-change')
  await runEvidence({...commandInput(root), acceptance: ['AC-01']})
  const paths = repositoryPaths(root)
  await writeYaml(path.join(paths.activeWork, 'hardening-change', 'evidence.yml'), {
    schemaVersion: 2,
    change: 'hardening-change',
    updatedAt: new Date().toISOString(),
    acceptance: [{id: 'AC-01', status: 'PASS', evidenceRefs: ['EV-MISSING'], limitations: []}],
  })
  const report = await reconcileEvidence(root, 'hardening-change')
  ensure(!report.valid && report.issues.some((item) => item.code === 'MISSING_ACCEPTANCE'), 'E013 missing acceptance was not blocked')
  results.push('PASS E013')
}

async function evalDuplicateAndExtraAcceptance(): Promise<void> {
  const root = await preparedRoot('e014')
  const paths = repositoryPaths(root)
  await writeYaml(path.join(paths.activeWork, 'hardening-change', 'evidence.yml'), {
    schemaVersion: 2,
    change: 'hardening-change',
    updatedAt: new Date().toISOString(),
    acceptance: [
      {id: 'AC-99', status: 'NOT_RUN', evidenceRefs: [], limitations: []},
      {id: 'AC-99', status: 'NOT_RUN', evidenceRefs: [], limitations: []},
    ],
  })
  const report = await reconcileEvidence(root, 'hardening-change')
  ensure(!report.valid && report.issues.some((item) => item.code === 'DUPLICATE_ACCEPTANCE') && report.issues.some((item) => item.code === 'EXTRA_ACCEPTANCE'), 'E014 duplicate or extra acceptance was not blocked')
  results.push('PASS E014')
}

async function evalEvidenceTreeDrift(): Promise<void> {
  const root = await preparedRoot('e015')
  await initializeGitBaseline(root)
  await initializeEvidence(root, 'hardening-change')
  await runEvidence({...commandInput(root), acceptance: ['AC-01']})
  await writeFile(path.join(root, 'src', 'after-evidence.txt'), 'changed after evidence\n', 'utf8')
  const report = await runDoctor(root)
  ensure(report.issues.some((item) => item.code === 'EVIDENCE_TREE_STALE'), 'E015 evidence tree drift was not reported')
  results.push('PASS E015')
}

async function evalCompletionHandoff(): Promise<void> {
  const root = await preparedRoot('e016')
  await initializeGitBaseline(root)
  const paths = repositoryPaths(root)
  await mkdir(path.join(root, 'docs'), {recursive: true})
  await writeFile(path.join(root, 'docs', 'current.md'), 'current\n', 'utf8')
  await writeFile(path.join(paths.completedWork, 'hardening-change', 'plan.md'), planWithTarget('hardening-change', 'docs/current.md'), 'utf8')
  await writeFile(path.join(paths.completedWork, 'hardening-change', 'change.md'), approvedChange('hardening-change'), 'utf8')
  const completion = await createCompletionRecord(root, 'hardening-change')
  ensure(completion.sourceStatus === 'READY_TO_COMMIT', 'E016 completion did not expose uncommitted source state')
  results.push('PASS E016')
}

async function evalCurrentTruth(): Promise<void> {
  const root = await preparedRoot('e017')
  const paths = repositoryPaths(root)
  await writeFile(path.join(paths.activeWork, 'hardening-change', 'plan.md'), planWithTarget('hardening-change', 'src/not-created.ts'), 'utf8')
  const report = await checkCurrentTruth(root, 'hardening-change')
  ensure(report.missing.includes('src/not-created.ts'), 'E017 missing current truth was not reported')
  results.push('PASS E017')
}

async function evalMigration(): Promise<void> {
  const root = await preparedRoot('e018')
  const paths = repositoryPaths(root)
  const config = await readYaml(paths.config, ConfigSchema)
  const state = await readYaml(paths.state, StateSchema)
  await writeYaml(paths.config, {...config, schemaVersion: 1})
  await writeYaml(paths.state, {...state, schemaVersion: 1})
  const plan = await planMigration(root)
  await applyMigration(plan)
  ensure(await pathExists(path.join(paths.activeWork, 'hardening-change', 'evidence.yml')), 'E018 migration did not create evidence.yml')
  results.push('PASS E018')
}

async function evalChangeSet(): Promise<void> {
  const root = await preparedRoot('e019-root')
  const child = await preparedRoot('e019-child')
  const childPaths = repositoryPaths(child)
  await writeFile(path.join(child, 'contract.md'), 'stable\n', 'utf8')
  await writeYaml(path.join(childPaths.completedWork, 'hardening-change', 'completion.yml'), completionFixture('hardening-change'))
  const contract = await readFile(path.join(child, 'contract.md'))
  await writeYaml(path.join(repositoryPaths(root).changeSets, 'hardening.yml'), {
    schemaVersion: 1,
    id: 'hardening',
    members: [{repositoryId: 'child', pathHint: child, change: 'hardening-change', required: true}],
    contracts: [{id: 'contract', authority: 'child', path: path.join(child, 'contract.md'), sha256: createHash('sha256').update(contract).digest('hex')}],
  })
  const report = await checkChangeSet(root, 'hardening')
  ensure(report.valid, 'E019 Change Set did not converge')
  results.push('PASS E019')
}

async function evalFreshRecovery(): Promise<void> {
  const root = await preparedRoot('e020')
  const report = await buildRecoveryReport(root)
  ensure(report.activeChange === 'hardening-change' && report.workingContext !== null, 'E020 fresh recovery did not reconstruct active work')
  results.push('PASS E020')
}

async function preparedRoot(name: string): Promise<string> {
  const root = await mkdtemp(path.join(tmpdir(), `evoworkflow-${name}-`))
  roots.push(root)
  await applyInitialization(await planInitialization(root))
  await mkdir(path.join(root, 'src'), {recursive: true})
  await mkdir(path.join(repositoryPaths(root).activeWork, 'hardening-change'), {recursive: true})
  await mkdir(path.join(repositoryPaths(root).completedWork, 'hardening-change'), {recursive: true})
  await writeFile(path.join(root, 'src', 'placeholder.txt'), 'placeholder\n', 'utf8')
  const paths = repositoryPaths(root)
  await writeFile(path.join(paths.activeWork, 'hardening-change', 'change.md'), approvedChange('hardening-change'), 'utf8')
  await writeFile(path.join(paths.activeWork, 'hardening-change', 'plan.md'), planWithTarget('hardening-change', 'src/placeholder.txt'), 'utf8')
  await writeFile(path.join(paths.activeWork, 'hardening-change', 'evidence.md'), '# Evidence\n', 'utf8')
  const state = await readYaml(paths.state, StateSchema)
  await writeYaml(paths.state, {...state, activeChange: 'hardening-change', phase: 'VERIFY', status: 'APPROVED'})
  return root
}

async function initializeGitBaseline(root: string): Promise<void> {
  await execFile('git', ['init', '-q'], {cwd: root})
  await execFile('git', ['config', 'user.email', 'evo@test.invalid'], {cwd: root})
  await execFile('git', ['config', 'user.name', 'EVO Test'], {cwd: root})
  await execFile('git', ['add', '.'], {cwd: root})
  await execFile('git', ['commit', '-qm', 'baseline'], {cwd: root})
}

function commandInput(root: string) {
  return {root, changeId: 'hardening-change', acceptance: ['AC-01'], kind: 'unit' as const, label: 'hardening command', executable: process.execPath, args: ['-e', 'process.exit(0)']}
}

function approvedChange(id: string): string {
  return `---\nid: ${id}\nweight: STANDARD\nstatus: APPROVED\napproval: null\n---\n\n# Change\n\n- AC-01: First behavior\n- AC-02: Second behavior\n`
}

function planWithTarget(id: string, target: string): string {
  return `---\nchange: ${id}\nstatus: APPROVED\napproval: null\ncurrentTruthTargets:\n  - path: ${target}\n    action: UPDATE\n---\n\n# Plan\n`
}

function completionFixture(change: string) {
  return {schemaVersion: 1, change, workflowStatus: 'COMPLETED', finishedAt: new Date().toISOString(), baselineCommit: null, finishedTreeFingerprint: 'a'.repeat(64), sourceStatus: 'COMMIT_NOT_REQUIRED', commit: null, currentTruth: {required: [], verified: []}}
}

function ensure(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(message)
}
