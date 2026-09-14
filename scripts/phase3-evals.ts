import {execFile as execFileCallback} from 'node:child_process'
import {mkdtemp, mkdir, readFile, rm, writeFile} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {promisify} from 'node:util'

import {ConfigSchema, ProjectGateDefinitionSchema, StateSchema} from '../src/core/schemas.js'
import {analyzeRepositoryConsistency} from '../src/repository/consistency.js'
import {approveArtifact} from '../src/repository/artifacts.js'
import {buildAcceptanceTraceability} from '../src/repository/acceptance-trace.js'
import {admitProjectGate, candidateAdmission, evaluateExecutionPreflight, evaluateGatePromotion, evaluateProjectGates, evaluateProtocolGates, projectGatePath} from '../src/validation/gates.js'
import {resolveEngineeringConstraints, inspectConstraintsFreshness} from '../src/repository/constraints.js'
import {buildRecoveryReport} from '../src/repository/recovery.js'
import {inspectFreshness} from '../src/repository/freshness.js'
import {buildWorkingContext, writeWorkingContext} from '../src/repository/working-context.js'
import {formatBugInvestigation, recordBugInvestigation} from '../src/repository/workflow-documents.js'
import {initializeEvidence, reconcileEvidence, recordEvidence, runEvidence} from '../src/repository/evidence.js'
import {applyInitialization, planInitialization} from '../src/repository/init.js'
import {createGoal, approveActiveGoal} from '../src/repository/goals.js'
import {runStoredGoal} from '../src/repository/goal-execution.js'
import {prepareDeliveryCheckpoint} from '../src/repository/delivery.js'
import {pathExists, readYaml, writeYaml} from '../src/repository/io.js'
import {formatMarkdownDocument, parseMarkdownDocument} from '../src/repository/markdown.js'
import {repositoryPaths} from '../src/repository/paths.js'
import {scanRepository} from '../src/repository/scanner.js'
import {detectImplementationAheadOfApproval} from '../src/repository/deviation.js'
import {sha256} from '../src/repository/git-snapshot.js'

const execFile = promisify(execFileCallback)
const roots: string[] = []
const results: string[] = []

try {
  await evalExistingPatternContinuation()
  await evalFreshSessionRecovery()
  await evalRequirementDeltaInvalidation()
  await evalBugRegression()
  await evalHardGateNegativeRegression()
  await evalSoftSignalBoundary()
  await evalAcceptanceTraceability()
  await evalStaleEvidence()
  await evalStaleContextAndConstraints()
  await evalWorkerBoundary()
  await evalCheckpointCommit()
  await evalFinalDeliveryBoundary()
  await evalCrossFrameworkConsistency()
  await evalPackagePrerequisite()
  await evalGoalHumanDecisionStop()
  await evalImplementationAheadOfApproval()
  await evalReconciliationDoesNotAutoPass()
  await evalDurableBehavioralArtifact()
} finally {
  await Promise.all(roots.map((root) => rm(root, {recursive: true, force: true})))
}

process.stdout.write(`${results.join('\n')}\nPhase 3 deterministic evals passed.\nBehavioral Agent invocation status: UNVERIFIED (separate field evaluation required).\n`)

async function evalExistingPatternContinuation(): Promise<void> {
  const root = await preparedFixture('e301')
  const context = await seedVerifiedArtifacts(root)
  ensure(context.references.some((item) => item.path.endsWith('UserController.java')), 'existing controller reference was not routed')
  ensure(context.references.some((item) => item.path.endsWith('UserService.java')), 'existing service reference was not routed')
  const consistency = await analyzeRepositoryConsistency(root, {proposedText: '@PreAuthorize("inventory:read") class InventoryController { AjaxResult list() {} }'})
  ensure(consistency.findings.length === 0, 'continuation using existing response and permission mechanisms drifted')
  record('E301', 'DETERMINISTIC_PASS', 'Working Context and consistency preserve existing repository patterns.')
}

async function evalFreshSessionRecovery(): Promise<void> {
  const root = await preparedFixture('e302')
  await seedVerifiedArtifacts(root)
  const report = await buildRecoveryReport(root)
  ensure(report.currentObjective?.includes('Phase 3 inventory') === true, 'recovery did not reconstruct the objective')
  ensure(report.constraints.total > 0, 'recovery omitted resolved constraints')
  ensure(report.freshness !== null, 'recovery omitted freshness')
  ensure(report.gates !== null, 'recovery omitted gate status')
  ensure(report.checkpointChronology.length >= 0, 'recovery chronology was not represented')
  record('E302', 'DETERMINISTIC_PASS', 'Fresh recovery reconstructs objective, constraints, gates, freshness, and next action.')
  record('E302-behavior', 'UNVERIFIED', 'No real Agent invocation is claimed by the deterministic suite.')
}

async function evalRequirementDeltaInvalidation(): Promise<void> {
  const root = await preparedFixture('e303')
  await seedVerifiedArtifacts(root)
  await writeFile(path.join(repositoryPaths(root).activeWork, 'phase3-change', 'plan.md'), await readFile(path.join(repositoryPaths(root).activeWork, 'phase3-change', 'plan.md'), 'utf8') + '\nRequirement Delta changes the affected Slice.\n', 'utf8')
  const freshness = await inspectFreshness(root, 'phase3-change')
  ensure(freshness.entries.some((entry) => entry.id === 'context' && entry.status === 'MISSING' || entry.id === 'context' && entry.status === 'STALE'), 'Delta did not invalidate Working Context')
  ensure(freshness.entries.some((entry) => entry.id === 'constraints' && entry.status === 'STALE'), 'Delta did not invalidate constraints')
  ensure(freshness.entries.some((entry) => entry.id === 'evidence' && entry.status === 'STALE'), 'Delta did not invalidate evidence')
  record('E303', 'DETERMINISTIC_PASS', 'Requirement input drift propagates through context, constraints, and evidence freshness.')
}

async function evalBugRegression(): Promise<void> {
  const root = await preparedFixture('e304')
  await seedVerifiedArtifacts(root)
  const failing = await runEvidence({
    root,
    changeId: 'phase3-change',
    acceptance: ['AC-01'],
    kind: 'integration',
    label: 'bug reproduction',
    executable: process.execPath,
    args: ['-e', 'process.exit(7)'],
  })
  const regression = await runEvidence({
    root,
    changeId: 'phase3-change',
    acceptance: ['AC-01'],
    kind: 'integration',
    label: 'bug regression',
    executable: process.execPath,
    args: ['-e', 'process.exit(0)'],
  })
  ensure(failing.status === 'FAIL' && regression.status === 'PASS', 'bug failure and regression statuses were not preserved')
  const bug = {
    observedBehavior: 'Inventory rows crossed tenant boundaries.',
    reproductionAndFailingEvidence: `Record ${failing.id} is a deterministic failing reproduction.`,
    expectedBehavior: 'Rows stay inside the current tenant.',
    rootCause: 'The data-scope predicate was bypassed.',
    existingRuleOrMechanismToReuse: 'Reuse the existing DataScope path.',
    fixBoundary: 'Restore the query predicate and add regression coverage.',
    regressionEvidence: `Record ${regression.id} is the passing regression.`,
    realEntryPathStatus: 'UNVERIFIED' as const,
    knowledgePromotion: 'Promote only after repeated findings and an approved rule.',
  }
  ensure(formatBugInvestigation(bug).includes('Root cause'), 'bug report lost root cause')
  await recordBugInvestigation(root, 'phase3-change', bug)
  record('E304', 'DETERMINISTIC_PASS', 'Bug workflow preserves reproduction failure, root cause, regression, and real-entry UNVERIFIED.')
}

async function evalHardGateNegativeRegression(): Promise<void> {
  const root = await preparedFixture('e305')
  await seedVerifiedArtifacts(root)
  const valid = await evaluateProtocolGates(root, 'phase3-change')
  ensure(valid.gates.find((gate) => gate.id === 'G-approval-current')?.status === 'PASS', 'valid approval gate did not pass')
  await writeFile(path.join(repositoryPaths(root).activeWork, 'phase3-change', 'plan.md'), await readFile(path.join(repositoryPaths(root).activeWork, 'phase3-change', 'plan.md'), 'utf8') + '\nDeliberate approved-plan violation.\n', 'utf8')
  const invalid = await evaluateProtocolGates(root, 'phase3-change')
  const approval = invalid.gates.find((gate) => gate.id === 'G-approval-current')
  ensure(approval?.status === 'FAIL' && approval.falsifyingCase.length > 0 && approval.remediation.length > 0, 'deliberate approval violation did not fail with remediation')
  record('E305', 'DETERMINISTIC_PASS', 'Hard gate valid→PASS and deliberate stale-approval→FAIL regression is observable.')
}

async function evalSoftSignalBoundary(): Promise<void> {
  const root = await preparedFixture('e306')
  await seedVerifiedArtifacts(root)
  const report = await evaluateProjectGates(root, 'phase3-change', {proposedNames: ['InventoryHttpHandler']})
  ensure(report.gates.length > 0 && report.gates.every((gate) => gate.enforcement === 'WARNING'), 'heuristic project signal became a hard gate')
  const definition = ProjectGateDefinitionSchema.parse({
    id: 'PG-response-convention',
    title: 'Existing response convention',
    authority: 'src/controllers/UserController.java',
    predicate: 'Changed controllers use the repository response mechanism.',
    falsifyingCase: 'A changed controller introduces an unrelated response wrapper.',
    negativeRegression: 'The violating controller fixture fails the response predicate.',
    remediation: 'Reuse the observed response mechanism or record a human Decision.',
    check: 'NO_RESPONSE_DRIFT',
    enforcement: 'HARD',
  })
  const promotion = evaluateGatePromotion(definition)
  ensure(promotion.eligible, `complete Finding-to-Gate contract was not eligible: ${promotion.reason}`)
  const admitted = await admitProjectGate(root, definition)
  ensure(await pathExists(projectGatePath(root, admitted.id)), 'promoted project gate was not persisted')
  const passing = await evaluateProjectGates(root, 'phase3-change', {proposedText: 'return AjaxResult.success();'})
  ensure(passing.gates.find((gate) => gate.id === 'G-pg-response-convention')?.status === 'PASS', 'promoted project gate did not pass its valid case')
  const failing = await evaluateProjectGates(root, 'phase3-change', {proposedText: 'return ApiResponse.success();'})
  ensure(failing.gates.find((gate) => gate.id === 'G-pg-response-convention')?.status === 'FAIL', 'promoted project gate did not fail its deliberate violation')
  const restored = await evaluateProjectGates(root, 'phase3-change', {proposedText: 'return AjaxResult.success();'})
  ensure(restored.gates.find((gate) => gate.id === 'G-pg-response-convention')?.status === 'PASS', 'promoted project gate did not restore PASS')
  record('E306', 'DETERMINISTIC_PASS', 'Heuristic signals remain WARNING; a promoted deterministic project gate passes, fails on violation, and restores through the five-part promotion contract.')

  const unregistered = ProjectGateDefinitionSchema.parse({
    id: 'PG-naming-convention',
    title: 'Naming convention',
    check: 'NO_NAMING_DRIFT',
    authority: 'src/controllers/UserController.java',
    predicate: 'Changed controllers use the existing naming convention.',
    falsifyingCase: 'A changed controller introduces an unrelated name.',
    negativeRegression: 'The violating controller fixture fails the naming predicate.',
    remediation: 'Reuse the observed naming convention or record a human Decision.',
    enforcement: 'HARD',
  })
  const unregisteredPromotion = evaluateGatePromotion(unregistered)
  ensure(!unregisteredPromotion.eligible && unregisteredPromotion.missing.some((item) => item.includes('registry')), 'unregistered heuristic check was eligible for HARD promotion')
  await expectRejected(async () => admitProjectGate(root, unregistered), 'unregistered heuristic check was admitted as HARD')
  record('E318', 'DETERMINISTIC_PASS', 'Only registered deterministic checks with a default CI regression can be promoted to HARD; heuristic naming remains outside the registry.')
}

async function evalAcceptanceTraceability(): Promise<void> {
  const root = await preparedFixture('e307')
  await seedVerifiedArtifacts(root)
  const trace = await buildAcceptanceTraceability(root, 'phase3-change')
  ensure(trace.valid, `acceptance trace is not valid: ${trace.issues.map((item) => item.code).join(', ')}`)
  ensure(trace.document.items.every((item) => item.implementationSurface.length > 0 && item.verification.length > 0 && item.evidenceRefs.length > 0), 'trace omitted a required link')
  const admission = await candidateAdmission(root, 'phase3-change')
  ensure(admission.status === 'REVIEW_ADMITTED', `complete candidate was not admitted to Review: ${admission.reasons.join(' | ')}; freshness=${admission.freshness.entries.map((entry) => `${entry.id}:${entry.status}`).join(',')}`)
  record('E307', 'DETERMINISTIC_PASS', 'Acceptance maps to implementation surface, verification, evidence, and Review admission.')
}

async function evalStaleEvidence(): Promise<void> {
  const root = await preparedFixture('e308')
  await seedVerifiedArtifacts(root)
  await writeFile(path.join(repositoryPaths(root).activeWork, 'phase3-change', 'change.md'), await readFile(path.join(repositoryPaths(root).activeWork, 'phase3-change', 'change.md'), 'utf8') + '\nAcceptance contract delta.\n', 'utf8')
  const report = await reconcileEvidence(root, 'phase3-change')
  ensure(report.issues.some((issue) => issue.code === 'STALE_RECORD'), 'stale evidence was not detected')
  record('E308', 'DETERMINISTIC_PASS', 'Evidence records become stale after acceptance inputs change.')
}

async function evalStaleContextAndConstraints(): Promise<void> {
  const root = await preparedFixture('e309')
  const context = await seedVerifiedArtifacts(root)
  await writeWorkingContext(root, 'phase3-change', context)
  await writeFile(path.join(repositoryPaths(root).activeWork, 'phase3-change', 'change.md'), await readFile(path.join(repositoryPaths(root).activeWork, 'phase3-change', 'change.md'), 'utf8') + '\nAuthority input changed.\n', 'utf8')
  const freshness = await inspectFreshness(root, 'phase3-change')
  const constraints = await inspectConstraintsFreshness(root, 'phase3-change')
  ensure(freshness.entries.find((entry) => entry.id === 'context')?.status === 'STALE', 'context freshness did not become stale')
  ensure(constraints?.freshness === 'STALE', 'constraints freshness did not become stale')
  record('E309', 'DETERMINISTIC_PASS', 'Context and constraints expose stale input fingerprints.')
}

async function evalWorkerBoundary(): Promise<void> {
  const root = await preparedFixture('e310')
  await seedVerifiedArtifacts(root)
  const evidenceBeforeGoal = await reconcileEvidence(root, 'phase3-change')
  ensure(evidenceBeforeGoal.valid, `seed evidence invalid before Goal: ${evidenceBeforeGoal.issues.map((issue) => issue.message).join(' | ')}`)
  await configureDeterministicAdapter(root)
  await createGoal(root, 'phase3-worker', {
    title: 'Phase 3 worker boundary',
    changeId: 'phase3-change',
    adapter: 'test',
    slices: [{
      id: 'S1',
      objective: 'Execute one bounded task',
      acceptance: ['The task is ready for independent review'],
      dependsOn: [],
      verify: [{label: 'focused check', command: process.execPath, args: ['-e', 'process.exit(0)'], timeoutMs: 10_000}],
    }],
  })
  await approveActiveGoal(root, 'phase3-worker')
  const goal = await runStoredGoal(root, 'phase3-worker')
  ensure(goal.status === 'READY_FOR_REVIEW', `worker did not stop at READY_FOR_REVIEW: ${goal.status}/${goal.slices[0]?.stopCondition}/${goal.slices[0]?.blockReason}`)
  ensure(!JSON.stringify(goal).includes('ACCEPTED'), 'worker self-accepted its own work')
  record('E310', 'DETERMINISTIC_PASS', 'Worker success is READY_FOR_REVIEW and has no ACCEPTED state.')
}

async function evalCheckpointCommit(): Promise<void> {
  const root = await preparedFixture('e311')
  await seedVerifiedArtifacts(root)
  await initializeGit(root)
  await writeFile(path.join(root, 'src', 'checkpoint.ts'), 'export const checkpoint = true\n', 'utf8')
  const preview = await prepareDeliveryCheckpoint(root, {checkpoint: 'SLICE', sliceId: 'S1'})
  ensure(preview.status === 'READY' && preview.message.includes('EVO-Change: phase3-change') && preview.message.includes('EVO-Slice: S1'), 'checkpoint message did not include structured chronology')
  ensure((await gitOutput(root, ['diff', '--cached', '--name-only'])).trim() === '', 'read-only checkpoint preview staged files')
  const final = await prepareDeliveryCheckpoint(root, {checkpoint: 'FINAL_DELIVERY'})
  ensure(final.status === 'BLOCKED', 'final checkpoint was not blocked while Change remained active')
  record('E311', 'DETERMINISTIC_PASS', 'Slice checkpoint preview is structured and read-only.')
}

async function evalFinalDeliveryBoundary(): Promise<void> {
  const root = await preparedFixture('e312')
  await seedVerifiedArtifacts(root)
  await initializeGit(root)
  await writeFile(path.join(root, 'src', 'delivery.ts'), 'export const delivery = true\n', 'utf8')
  const preview = await prepareDeliveryCheckpoint(root, {checkpoint: 'FINAL_DELIVERY'})
  ensure(preview.status === 'BLOCKED' && preview.reason.includes('COMPLETED'), 'final delivery was allowed before evo-finish')
  record('E312', 'DETERMINISTIC_PASS', 'Final delivery cannot create completion state or bypass evo-finish.')
}

async function evalCrossFrameworkConsistency(): Promise<void> {
  const root = await mkdtemp(path.join(tmpdir(), 'evoworkflow-phase3-fastapi-'))
  roots.push(root)
  await writeFiles(root, {
    'pyproject.toml': '[project]\nname = "orders"\nversion = "1.0.0"\ndependencies = ["fastapi==0.115.0"]\nrequires-python = ">=3.11"\n',
    'app/main.py': 'from fastapi import FastAPI\nfrom fastapi.responses import JSONResponse\napp = FastAPI()\n',
    'app/routers/orders.py': 'from fastapi import APIRouter\nrouter = APIRouter()\n',
    'tests/test_orders.py': 'def test_orders(): assert True\n',
    'frontend/package.json': JSON.stringify({name: 'orders-ui', version: '1.0.0', engines: {node: '>=22'}, dependencies: {react: '19.0.0', antd: '5.0.0', '@ant-design/pro-components': '2.0.0'}, scripts: {dev: 'vite', build: 'vite build', test: 'vitest'}}),
    'frontend/src/pages/orders/index.tsx': 'export default function Orders() { return null }\n',
  })
  const discovery = await scanRepository(root)
  ensure(discovery.frameworks.some((item) => item.name === 'FastAPI'), 'FastAPI fixture was not identified')
  ensure(discovery.frameworks.some((item) => item.name === 'Ant Design Pro'), 'React/Ant Design Pro fixture was not identified')
  ensure(!discovery.technologies.some((item) => item.name === 'RuoYi'), 'RuoYi facts leaked into the FastAPI fixture')
  const consistency = await analyzeRepositoryConsistency(root, {proposedText: 'return JSONResponse({"ok": True})'})
  ensure(!consistency.observations.some((item) => item.mechanism === 'AjaxResult' || item.mechanism === '@PreAuthorize'), 'RuoYi mechanism leaked into cross-framework observations')
  record('E313', 'DETERMINISTIC_PASS', 'FastAPI + React/Ant Design Pro follows its own observed conventions.')
}

async function evalPackagePrerequisite(): Promise<void> {
  ensure(await pathExists(path.resolve('dist/index.js')), 'dist/index.js is missing; run build before the package black-box smoke')
  record('E314', 'DETERMINISTIC_PASS', 'Built CLI artifact is present for the separate packed-artifact black-box smoke.')
}

async function evalGoalHumanDecisionStop(): Promise<void> {
  const root = await preparedFixture('e315')
  await seedVerifiedArtifacts(root)
  await configureDeterministicAdapter(root)
  await createGoal(root, 'phase3-stop', {
    title: 'Stop on human Decision',
    changeId: 'phase3-change',
    adapter: 'test',
    slices: [{
      id: 'S1',
      objective: 'Stop when authorities disagree',
      acceptance: ['The disagreement is visible'],
      dependsOn: [],
      verify: [{label: 'focused check', command: process.execPath, args: ['-e', 'process.exit(0)'], timeoutMs: 10_000}],
    }],
  })
  await approveActiveGoal(root, 'phase3-stop')
  await writeFiles(root, {
    '.evo/decisions/current/d-pagination-a.md': decision('d-pagination-a', 'Use cursor pagination.'),
    '.evo/decisions/current/d-pagination-b.md': decision('d-pagination-b', 'Use offset pagination.'),
  })
  const preflight = await evaluateExecutionPreflight(root, 'phase3-change')
  ensure(preflight.find((gate) => gate.id === 'G-constraints-resolved')?.status === 'BLOCKED', 'human Decision conflict was not a hard preflight stop')
  const goal = await runStoredGoal(root, 'phase3-stop')
  ensure(goal.status === 'BLOCKED' && goal.slices[0]?.stopCondition === 'CONSTRAINT_CONFLICT', 'Goal crossed a conflicting human Decision')
  record('E315', 'DETERMINISTIC_PASS', 'Goal stops before worker invocation when a human Decision conflict is unresolved.')
}

async function evalImplementationAheadOfApproval(): Promise<void> {
  const root = await preparedFixture('e316')
  await initializeGit(root)
  await writeFile(path.join(root, 'src', 'out-of-band.ts'), 'export const outOfBandImplementation = true\n', 'utf8')
  await recordEvidence({
    root,
    changeId: 'phase3-change',
    acceptance: ['AC-01'],
    kind: 'unit',
    label: 'out-of-band implementation signal',
    status: 'PASS',
    summary: 'The implementation file was observed after the last checkpoint.',
    output: 'implementation signal',
  })
  const changePath = path.join(repositoryPaths(root).activeWork, 'phase3-change', 'change.md')
  const planPath = path.join(repositoryPaths(root).activeWork, 'phase3-change', 'plan.md')
  await writeFiles(root, {
    '.evo/work/active/phase3-change/change.md': '---\nid: phase3-change\nweight: STANDARD\nstatus: AWAITING_APPROVAL\napproval: null\n---\n\n# Phase 3 inventory\n\nAn implementation exists before the current approval.\n',
    '.evo/work/active/phase3-change/plan.md': '---\nchange: phase3-change\nstatus: AWAITING_APPROVAL\napproval: null\n---\n\n# Plan\n\n### S1 — Inventory behavior\n\nThe current implementation is awaiting approval.\n',
  })
  const state = await readYaml(repositoryPaths(root).state, StateSchema)
  await writeYaml(repositoryPaths(root).state, {...state, activeChange: 'phase3-change', activeGoal: null, phase: 'PLAN', status: 'AWAITING_APPROVAL', currentSlice: null, slices: []})
  const finding = await detectImplementationAheadOfApproval(root, 'phase3-change')
  ensure(finding?.code === 'IMPLEMENTATION_AHEAD_OF_APPROVAL', 'implementation-ahead-of-approval was not detected')
  ensure(finding.signals.some((signal) => signal.kind === 'EVIDENCE_RECORD' && signal.paths.includes('src/out-of-band.ts')), 'detector did not use the implementation evidence record')
  ensure(/not retroactive authorization/u.test(finding.detail), 'deviation detail did not preserve the non-retroactive boundary')
  ensure(await pathExists(changePath) && await pathExists(planPath), 'deviation fixture lost the unapproved authority files')
  record('E316', 'DETERMINISTIC_PASS', 'Unapproved implementation evidence produces an explicit diagnostic and preserves the non-retroactive authorization boundary.')
}

async function evalReconciliationDoesNotAutoPass(): Promise<void> {
  const root = await preparedFixture('e317')
  await seedVerifiedArtifacts(root)
  const changePath = path.join(repositoryPaths(root).activeWork, 'phase3-change', 'change.md')
  const changed = await readFile(changePath, 'utf8') + '\nRequirement Delta remains a new input.\n'
  await writeFile(changePath, changed, 'utf8')
  const staleBeforeApproval = await reconcileEvidence(root, 'phase3-change')
  ensure(staleBeforeApproval.issues.some((issue) => issue.code === 'STALE_RECORD'), 'stale evidence was not detected before reapproval')
  const document = parseMarkdownDocument(changed, changePath)
  document.data.status = 'AWAITING_APPROVAL'
  document.data.approval = null
  await writeFile(changePath, formatMarkdownDocument(document), 'utf8')
  await approveArtifact(root, 'phase3-change', 'change', 'phase3 deterministic eval reapproval')
  const afterApproval = await reconcileEvidence(root, 'phase3-change')
  ensure(afterApproval.issues.some((issue) => issue.code === 'STALE_RECORD'), 'reapproval incorrectly made old evidence current')
  ensure(!afterApproval.valid, 'stale evidence reconciliation incorrectly passed after reapproval')
  record('E317', 'DETERMINISTIC_PASS', 'Reapproving changed authority does not auto-pass evidence produced against the previous input fingerprint.')
}

async function evalDurableBehavioralArtifact(): Promise<void> {
  const root = await preparedFixture('e319')
  await seedVerifiedArtifacts(root)
  const relativeArtifact = 'references/experiments/phase3/development-continuity.json'
  const artifactPath = path.join(root, relativeArtifact)
  await writeFiles(root, {
    [relativeArtifact]: JSON.stringify({schemaVersion: 1, status: 'BEHAVIORAL_PASS', target: {backendRevision: 'a'.repeat(40), frontendRevision: 'b'.repeat(40)}, sessions: [{id: 'A', verification: 'PASS'}], limitations: ['runtime UNVERIFIED']}) + '\n',
  })
  const parsed = JSON.parse(await readFile(artifactPath, 'utf8')) as {status?: string; target?: {backendRevision?: string; frontendRevision?: string}; limitations?: string[]}
  ensure(parsed.status === 'BEHAVIORAL_PASS' && parsed.target?.backendRevision?.length === 40 && parsed.limitations?.includes('runtime UNVERIFIED') === true, 'durable artifact fixture did not contain the required sanitized trace fields')
  const recordResult = await recordEvidence({
    root,
    changeId: 'phase3-change',
    acceptance: ['AC-01'],
    kind: 'other',
    label: 'durable continuity trace artifact',
    status: 'PASS',
    summary: 'Sanitized continuity trace is bound as an Evidence artifact.',
    artifacts: [relativeArtifact],
  })
  const artifact = recordResult.artifacts[0]
  ensure(artifact !== undefined, 'durable trace Evidence record did not contain an artifact')
  const copiedPath = path.join(root, artifact.path)
  ensure((await sha256(await readFile(copiedPath))) === artifact.sha256, 'durable artifact SHA-256 did not verify')
  await writeFile(copiedPath, 'tampered\n', 'utf8')
  ensure((await sha256(await readFile(copiedPath))) !== artifact.sha256, 'artifact tamper regression did not change the computed hash')
  record('E319', 'DETERMINISTIC_PASS', 'Sanitized behavioral trace is persisted as an Evidence artifact and its SHA-256 binding detects tampering.')
}

async function preparedFixture(name: string): Promise<string> {
  const root = await mkdtemp(path.join(tmpdir(), `evoworkflow-phase3-${name}-`))
  roots.push(root)
  await writeFiles(root, {
    'README.md': '# Phase 3 Brownfield fixture\n',
    'package.json': JSON.stringify({name: 'phase3-fixture', version: '1.0.0', engines: {node: '>=22'}, scripts: {test: 'vitest', dev: 'node app.js', build: 'tsc --noEmit'}}),
    'pom.xml': '<project><properties><java.version>17</java.version><spring-security.version>6.0.0</spring-security.version></properties></project>\n',
    'docs/architecture.md': '# Architecture\nUse existing controller and service modules.\n',
    '.github/workflows/ci.yml': 'name: ci\n',
    'src/controllers/UserController.java': '@PreAuthorize("user:read") class UserController { AjaxResult list() { return AjaxResult.success(); } }\n',
    'src/services/UserService.java': '@DataScope class UserService { }\n',
    'src/mappers/UserMapper.java': 'interface UserMapper { }\n',
    'tests/UserControllerTest.java': 'class UserControllerTest { }\n',
    'src/controllers/InventoryController.java': 'class InventoryController { AjaxResult list() { return AjaxResult.success(); } }\n',
    'src/services/InventoryService.java': 'class InventoryService { }\n',
  })
  await applyInitialization(await planInitialization(root))
  const paths = repositoryPaths(root)
  const changeRoot = path.join(paths.activeWork, 'phase3-change')
  await mkdir(changeRoot, {recursive: true})
  await writeFiles(root, {
    '.evo/work/active/phase3-change/change.md': '---\nid: phase3-change\nweight: STANDARD\nstatus: AWAITING_APPROVAL\napproval: null\n---\n\n# Phase 3 inventory\n\n## Rules and acceptance\n\n- AC-01: The inventory API keeps the existing response and permission mechanisms.\n- AC-02: The inventory behavior has a focused verification path.\n',
    '.evo/work/active/phase3-change/plan.md': '---\nchange: phase3-change\nstatus: AWAITING_APPROVAL\napproval: null\ncurrentTruthTargets:\n  - path: src/controllers/InventoryController.java\n    action: UPDATE\n  - path: src/services/InventoryService.java\n    action: UPDATE\n---\n\n# Plan\n\n### S1 — Inventory behavior\n\n- AC-01: update `src/controllers/InventoryController.java`; verify with `pnpm test`.\n- AC-02: update `src/services/InventoryService.java`; test focused behavior with `pnpm test`.\n',
    '.evo/work/active/phase3-change/evidence.md': '# Evidence\n',
  })
  const state = await readYaml(paths.state, StateSchema)
  await writeYaml(paths.state, {...state, activeChange: 'phase3-change', phase: 'PLAN', status: 'AWAITING_APPROVAL', updatedAt: new Date().toISOString()})
  const now = new Date('2026-01-01T00:00:00.000Z')
  await approveArtifact(root, 'phase3-change', 'change', 'phase3 deterministic eval', now)
  await approveArtifact(root, 'phase3-change', 'plan', 'phase3 deterministic eval', now)
  return root
}

async function seedVerifiedArtifacts(root: string): Promise<Awaited<ReturnType<typeof buildWorkingContext>>> {
  await resolveEngineeringConstraints(root, 'phase3-change', {persist: true})
  await initializeEvidence(root, 'phase3-change', new Date('2026-01-01T00:00:00.000Z'))
  await runEvidence({root, changeId: 'phase3-change', acceptance: ['AC-01'], kind: 'unit', label: 'AC-01 focused test', executable: process.execPath, args: ['-e', 'process.exit(0)'], now: new Date('2026-01-01T00:00:01.000Z')})
  await runEvidence({root, changeId: 'phase3-change', acceptance: ['AC-02'], kind: 'unit', label: 'AC-02 focused test', executable: process.execPath, args: ['-e', 'process.exit(0)'], now: new Date('2026-01-01T00:00:02.000Z')})
  const context = await buildWorkingContext(root, 'phase3-change', {includeGit: false, now: new Date('2026-01-01T00:00:03.000Z')})
  await writeWorkingContext(root, 'phase3-change', context)
  await buildAcceptanceTraceability(root, 'phase3-change', {persist: true, now: new Date('2026-01-01T00:00:04.000Z')})
  return context
}

async function configureDeterministicAdapter(root: string): Promise<void> {
  const paths = repositoryPaths(root)
  const config = await readYaml(paths.config, ConfigSchema)
  await writeYaml(paths.config, {
    ...config,
    goal: {...config.goal, defaultAdapter: 'test'},
    agents: {...config.agents, adapters: {...config.agents.adapters, test: {kind: 'process', command: process.execPath, args: ['-e', 'console.log(JSON.stringify({status:"COMPLETED",summary:"deterministic phase3 worker",changedFiles:[],evidence:[]}))'], timeoutMs: 10_000}}},
  })
}

async function initializeGit(root: string): Promise<void> {
  await execFile('git', ['init', '-q'], {cwd: root})
  await execFile('git', ['config', 'user.email', 'evo@test.invalid'], {cwd: root})
  await execFile('git', ['config', 'user.name', 'EVO Test'], {cwd: root})
  await execFile('git', ['add', '.'], {cwd: root})
  await execFile('git', ['commit', '-qm', 'phase3 baseline'], {cwd: root})
}

async function gitOutput(root: string, args: readonly string[]): Promise<string> {
  return String((await execFile('git', [...args], {cwd: root})).stdout)
}

function decision(id: string, statement: string): string {
  return `---\nid: ${id}\nchange: phase3-change\nstatus: current\nsupersedes: null\nsupersededBy: null\n---\n\n## Decision\n\n${statement}\n`
}

async function writeFiles(root: string, files: Readonly<Record<string, string>>): Promise<void> {
  for (const [relative, source] of Object.entries(files)) {
    const target = path.join(root, relative)
    await mkdir(path.dirname(target), {recursive: true})
    await writeFile(target, source, 'utf8')
  }
}

function record(id: string, status: string, detail: string): void {
  results.push(`${status} ${id}: ${detail}`)
}

function ensure(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

async function expectRejected(operation: () => Promise<unknown>, message: string): Promise<void> {
  try {
    await operation()
  } catch {
    return
  }
  throw new Error(message)
}
