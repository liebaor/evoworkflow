import {readFile} from 'node:fs/promises'
import path from 'node:path'

import {
  CandidateAdmissionSchema,
  GateReportSchema,
  GateResultSchema,
  ProjectGateDefinitionSchema,
  type CandidateAdmission,
  type GateEnforcement,
  type GateKind,
  type GateReport,
  type GateResult,
  type ProjectGateCheck,
  type ProjectGateDefinition,
} from '../core/schemas.js'
import {EvoError} from '../core/errors.js'
import {checkCurrentTruth} from '../repository/completion.js'
import {buildAcceptanceTraceability} from '../repository/acceptance-trace.js'
import {resolveEngineeringConstraints} from '../repository/constraints.js'
import {inspectFreshness} from '../repository/freshness.js'
import {readEvidence, reconcileEvidence} from '../repository/evidence.js'
import {pathExists, readYaml, writeYaml} from '../repository/io.js'
import {listDirectory, openManagedRepository} from '../repository/managed.js'
import {parseMarkdownDocument} from '../repository/markdown.js'
import {repositoryPaths} from '../repository/paths.js'
import {analyzeRepositoryConsistency} from '../repository/consistency.js'
import {artifactPath, inspectArtifactApproval, parseArtifactMetadata} from '../repository/artifacts.js'
import {validateProject} from './project.js'

export interface GateEvaluationOptions {
  readonly now?: Date
  readonly changedPaths?: readonly string[]
  readonly expectedAreas?: readonly string[]
  readonly proposedText?: string
  readonly proposedNames?: readonly string[]
  readonly humanApprovedConventionChange?: boolean
  readonly persist?: boolean
  readonly allowLegacyEvidence?: boolean
}

export interface GatePromotionEvaluation {
  readonly eligible: boolean
  readonly missing: readonly string[]
  readonly reason: string
}

export interface CandidateAdmissionOptions extends GateEvaluationOptions {
  readonly allowLegacyEvidence?: boolean
}

const requiredPromotionFields: readonly (keyof ProjectGateDefinition)[] = [
  'authority',
  'predicate',
  'falsifyingCase',
  'negativeRegression',
  'remediation',
]

/** Evaluates deterministic protocol obligations as hard gates. */
export async function evaluateProtocolGates(root: string, requestedChangeId?: string, options: GateEvaluationOptions = {}): Promise<GateReport> {
  const managed = await openManagedRepository(root)
  const changeId = requestedChangeId ?? managed.state.activeChange
  if (!changeId) throw new EvoError('No active Change is available for protocol gates.')
  if (managed.state.activeChange !== changeId) throw new EvoError(`Change ${changeId} is not the active Change.`)
  const evaluatedAt = (options.now ?? new Date()).toISOString()
  const gates: GateResult[] = []

  const validation = await validateProject(root)
  gates.push(makeGate('G-protocol-valid', 'PROTOCOL', 'HARD', 'Repository protocol is valid', validation.valid ? 'PASS' : 'FAIL', validation.valid ? 'All deterministic repository checks pass.' : validation.issues.filter((item) => item.severity === 'error').map((item) => item.code).join(', '), evaluatedAt, ['validateProject'], 'Run deterministic repository validation.', 'Introduce a deliberate protocol violation.', 'Add or repair the owning repository artifact.', validation.issues.filter((item) => item.severity === 'error').map((item) => item.path ?? item.code)))

  gates.push(await approvalGate(root, changeId, evaluatedAt))
  gates.push(stateGate(validation.issues, evaluatedAt))
  gates.push(await decisionGate(validation.issues, evaluatedAt))

  try {
    const trace = await buildAcceptanceTraceability(root, changeId, options.now === undefined ? {} : {now: options.now})
    gates.push(makeGate('G-acceptance-coverage', 'PROTOCOL', 'HARD', 'Acceptance traceability is complete', trace.valid ? 'PASS' : 'FAIL', trace.valid ? 'Every acceptance criterion maps to implementation, verification, and evidence.' : trace.issues.map((item) => `${item.acceptance}:${item.code}`).join(', '), evaluatedAt, ['acceptance.yml', 'change.md', 'plan.md'], 'Build a complete Acceptance → Surface → Verification → Evidence mapping.', 'Remove one required mapping or current evidence record.', 'Update the owning trace or rerun evidence.', trace.issues.map((item) => item.acceptance)))
  } catch (error) {
    gates.push(makeGate('G-acceptance-coverage', 'PROTOCOL', 'HARD', 'Acceptance traceability is complete', 'NOT_RUN', error instanceof Error ? error.message : String(error), evaluatedAt, [], 'Build acceptance traceability.', 'Omit the acceptance authority.', 'Restore the acceptance authority and rebuild the trace.', []))
  }

  const evidence = await evidenceGate(root, changeId, evaluatedAt, options.allowLegacyEvidence === true)
  gates.push(evidence)
  gates.push(await constraintsGate(root, changeId, evaluatedAt))
  gates.push(await currentTruthGate(root, changeId, evaluatedAt))

  const report = GateReportSchema.parse({
    schemaVersion: 1,
    change: changeId,
    evaluatedAt,
    status: aggregateStatus(gates, 'HARD'),
    gates,
  })
  if (options.persist) await writeYaml(gateReportPath(root, changeId, 'protocol'), report)
  return report
}

/** Runs only the deterministic obligations that must hold before a worker receives a Slice. */
export async function evaluateExecutionPreflight(root: string, requestedChangeId?: string, options: GateEvaluationOptions = {}): Promise<GateResult[]> {
  const managed = await openManagedRepository(root)
  const changeId = requestedChangeId ?? managed.state.activeChange
  if (!changeId) throw new EvoError('No active Change is available for execution preflight.')
  if (managed.state.activeChange !== changeId) throw new EvoError(`Change ${changeId} is not the active Change.`)
  const evaluatedAt = (options.now ?? new Date()).toISOString()
  const validation = await validateProject(root)
  const gates = [
    await approvalGate(root, changeId, evaluatedAt),
    stateGate(validation.issues, evaluatedAt),
    decisionGate(validation.issues, evaluatedAt),
    await constraintsGate(root, changeId, evaluatedAt),
  ]
  if (!validation.valid) {
    gates.push(makeGate('G-preflight-protocol-valid', 'PROTOCOL', 'HARD', 'Repository protocol is valid for execution', 'FAIL', `Repository protocol errors prevent bounded execution: ${validation.issues.filter((item) => item.severity === 'error').map((item) => `${item.code} (${item.message})`).join('; ')}.`, evaluatedAt, validation.issues.filter((item) => item.severity === 'error').map((item) => item.path ?? item.code), 'Run deterministic repository validation before invoking the worker.', 'Leave a protocol error unresolved.', 'Repair the owning protocol artifact before running the Slice.', validation.issues.map((item) => item.path ?? item.code)))
  }
  return gates
}

/** Evaluates naming, architecture, and pattern signals as report-only project gates. */
export async function evaluateProjectGates(root: string, requestedChangeId?: string, options: GateEvaluationOptions = {}): Promise<GateReport> {
  const managed = await openManagedRepository(root)
  const changeId = requestedChangeId ?? managed.state.activeChange
  if (!changeId) throw new EvoError('No active Change is available for project gates.')
  const consistency = await analyzeRepositoryConsistency(root, {
    ...(options.changedPaths === undefined ? {} : {changedPaths: options.changedPaths}),
    ...(options.expectedAreas === undefined ? {} : {expectedAreas: options.expectedAreas}),
    proposedText: options.proposedText ?? await readChangedText(root, options.changedPaths ?? []),
    ...(options.proposedNames === undefined ? {} : {proposedNames: options.proposedNames}),
    ...(options.humanApprovedConventionChange === undefined ? {} : {humanApprovedConventionChange: options.humanApprovedConventionChange}),
  })
  const evaluatedAt = (options.now ?? new Date()).toISOString()
  const heuristicGates = consistency.findings.length === 0
    ? [makeGate('G-project-consistency', 'PROJECT', 'WARNING', 'Repository pattern consistency', 'PASS', 'No candidate consistency drift was observed.', evaluatedAt, consistency.referenceImplementations, 'Compare proposed changes with repository patterns.', 'Introduce a naming, response, permission, or blast-radius drift.', 'Review the signal and either reuse the pattern or document an approved exception.', consistency.referenceImplementations)]
    : consistency.findings.map((finding, index) => makeGate(`G-project-${finding.code.toLowerCase()}-${index + 1}`, 'PROJECT', 'WARNING', finding.code, 'WARN', finding.detail, evaluatedAt, finding.evidence, 'Evaluate the repository consistency predicate.', 'Create the deliberate pattern drift described by the finding.', finding.recommendation, finding.evidence))
  const definitions = await readProjectGateDefinitions(root)
  const gates = [...heuristicGates, ...definitions.map((definition) => evaluateProjectGate(definition, consistency.findings, evaluatedAt))]
  const hardStatus = aggregateStatus(gates, 'HARD')
  const report = GateReportSchema.parse({schemaVersion: 1, change: changeId, evaluatedAt, status: hardStatus === 'PASS' ? gates.some((gate) => gate.status === 'WARN') ? 'WARN' : 'PASS' : hardStatus, gates})
  if (options.persist) await writeYaml(gateReportPath(root, changeId, 'project'), report)
  return report
}

async function readProjectGateDefinitions(root: string): Promise<ProjectGateDefinition[]> {
  const directory = repositoryPaths(root).gates
  const filenames = (await listDirectory(directory)).filter((filename) => filename.endsWith('.yml'))
  return Promise.all(filenames.map((filename) => readYaml(path.join(directory, filename), ProjectGateDefinitionSchema)))
}

function evaluateProjectGate(definition: ProjectGateDefinition, findings: readonly {code: string; detail: string; evidence: readonly string[]}[], evaluatedAt: string): GateResult {
  const relevant = findings.filter((finding) => projectFindingMatches(definition.check, finding.code))
  const status = relevant.length === 0 ? 'PASS' : definition.enforcement === 'HARD' ? 'FAIL' : 'WARN'
  const evidence = [...new Set([definition.authority, ...relevant.flatMap((finding) => finding.evidence)])]
  const detail = relevant.length === 0
    ? `${definition.title} passed deterministic check ${definition.check}.`
    : `${definition.title} failed deterministic check ${definition.check}: ${relevant.map((finding) => finding.detail).join(' | ')}`
  return makeGate(`G-${definition.id.toLowerCase()}`, 'PROJECT', definition.enforcement, definition.title, status, detail, evaluatedAt, evidence, definition.predicate, definition.falsifyingCase, definition.remediation, [definition.authority])
}

function projectFindingMatches(check: ProjectGateCheck, code: string): boolean {
  switch (check) {
    case 'NO_CONSISTENCY_FINDINGS': return true
    case 'NO_RESPONSE_DRIFT': return code === 'CONSISTENCY_DRIFT'
    case 'NO_PERMISSION_DRIFT': return code === 'PARALLEL_MECHANISM'
    case 'NO_NAMING_DRIFT': return code === 'NAMING_DRIFT'
    case 'NO_BLAST_RADIUS_EXPANSION': return code === 'BLAST_RADIUS_EXPANDED'
  }
}

async function readChangedText(root: string, changedPaths: readonly string[]): Promise<string> {
  const sources: string[] = []
  for (const relative of [...new Set(changedPaths)].filter((item) => isSafeRelativePath(root, item)).slice(0, 40)) {
    try {
      sources.push(`// ${relative}\n${await readFile(path.resolve(root, relative), 'utf8')}`)
    } catch {
      // A deleted or binary path cannot provide source text; path-based gates still receive the path.
    }
  }
  return sources.join('\n')
}

function isSafeRelativePath(root: string, target: string): boolean {
  const resolved = path.resolve(root, target)
  const relative = path.relative(path.resolve(root), resolved)
  return relative === '' || (!relative.startsWith('..') && !path.isAbsolute(relative))
}

/** Combines hard protocol gates, traceability, freshness, and report-only project signals before Review. */
export async function candidateAdmission(root: string, requestedChangeId?: string, options: CandidateAdmissionOptions = {}): Promise<CandidateAdmission> {
  const managed = await openManagedRepository(root)
  const changeId = requestedChangeId ?? managed.state.activeChange
  if (!changeId) throw new EvoError('No active Change is available for candidate admission.')
  if (managed.state.activeChange !== changeId) throw new EvoError(`Change ${changeId} is not the active Change.`)
  const evaluatedAt = (options.now ?? new Date()).toISOString()
  const persist = options.persist === true
  await resolveEngineeringConstraints(root, changeId, options.now === undefined ? {persist} : {persist, now: options.now})
  const protocol = await evaluateProtocolGates(root, changeId, options)
  const project = await evaluateProjectGates(root, changeId, options)
  const trace = await buildAcceptanceTraceability(root, changeId, options.now === undefined ? {persist} : {persist, now: options.now})
  const freshness = await inspectFreshness(root, changeId, options.now)
  const gates = [...protocol.gates, ...project.gates]
  const reasons = [
    ...gates.filter((gate) => gate.enforcement === 'HARD' && gate.status !== 'PASS').map((gate) => `${gate.id}: ${gate.detail}`),
    ...trace.issues.map((issue) => `${issue.acceptance}: ${issue.detail}`),
    ...(freshness.status === 'CURRENT' ? [] : [`Freshness is ${freshness.status}; rebuild affected derived artifacts.`]),
  ]
  const status = reasons.length === 0 ? 'REVIEW_ADMITTED' : 'NOT_READY'
  const result = CandidateAdmissionSchema.parse({schemaVersion: 1, change: changeId, evaluatedAt, status, reasons, gates, trace: trace.document, freshness})
  if (options.persist) await writeYaml(admissionPath(root, changeId), result)
  return result
}

/** Applies the five-part promotion contract before a project signal can become a HARD gate. */
export function evaluateGatePromotion(definition: ProjectGateDefinition): GatePromotionEvaluation {
  const missing = requiredPromotionFields.filter((field) => definition[field].trim().length === 0)
  if (missing.length > 0) return {eligible: false, missing, reason: `Missing ${missing.join(', ')}.`}
  return {eligible: true, missing: [], reason: 'Authority, predicate, falsifying case, negative regression, and remediation are present.'}
}

/** Validates and persists a project gate definition only when its promotion contract is complete. */
export async function admitProjectGate(root: string, definition: ProjectGateDefinition): Promise<ProjectGateDefinition> {
  const parsed = ProjectGateDefinitionSchema.parse(definition)
  const evaluation = evaluateGatePromotion(parsed)
  if (!evaluation.eligible) throw new EvoError(`Project gate ${parsed.id} cannot be admitted: ${evaluation.reason}`)
  await writeYaml(projectGatePath(root, parsed.id), parsed)
  return parsed
}

/** Returns the report-only path for a persisted gate report. */
export function gateReportPath(root: string, changeId: string, kind: 'protocol' | 'project'): string {
  safeChange(changeId)
  return path.join(repositoryPaths(root).activeWork, changeId, `${kind}-gates.yml`)
}

/** Returns the candidate admission path. */
export function admissionPath(root: string, changeId: string): string {
  safeChange(changeId)
  return path.join(repositoryPaths(root).activeWork, changeId, 'admission.yml')
}

/** Returns the registry path for one project gate definition. */
export function projectGatePath(root: string, id: string): string {
  if (!/^PG-[A-Za-z0-9][A-Za-z0-9_-]*$/u.test(id)) throw new EvoError(`Invalid project gate id: ${id}`)
  return path.join(repositoryPaths(root).gates, `${id}.yml`)
}

/** Formats admission and gate results without hiding NOT_READY reasons. */
export function formatAdmission(admission: CandidateAdmission): string {
  return [
    `Candidate admission / 候选准入：${admission.status}`,
    ...(admission.reasons.length > 0 ? admission.reasons.map((reason) => `- ${reason}`) : ['- no blocking reason / 无阻塞原因']),
    '',
    `Freshness / 新鲜度：${admission.freshness.status}`,
    ...admission.gates.map((gate) => `${gate.status} ${gate.enforcement} ${gate.id}: ${gate.detail}`),
  ].join('\n')
}

async function approvalGate(root: string, changeId: string, evaluatedAt: string): Promise<GateResult> {
  const paths = repositoryPaths(root)
  const statuses: string[] = []
  const evidence: string[] = []
  for (const kind of ['change', 'spec', 'plan'] as const) {
    const target = artifactPath(root, changeId, kind)
    if (!(await pathExists(target))) {
      if (kind === 'spec') continue
      statuses.push(`${kind}:missing`)
      continue
    }
    const document = parseMarkdownDocument(await readFile(target, 'utf8'), target)
    parseArtifactMetadata(document, kind, changeId)
    const approval = inspectArtifactApproval(document)
    evidence.push(relative(paths.root, target))
    if (!approval.valid) statuses.push(`${kind}:${approval.code}`)
  }
  const pass = statuses.length === 0
  return makeGate('G-approval-current', 'PROTOCOL', 'HARD', 'Approval fingerprints are current', pass ? 'PASS' : 'FAIL', pass ? 'All required narrative artifacts have current approval.' : statuses.join(', '), evaluatedAt, evidence, 'Compare each artifact approval fingerprint with current content.', 'Edit or remove an approval record after approval.', 'Return the artifact to AWAITING_APPROVAL and approve its exact current content.', evidence)
}

function stateGate(issues: readonly {code: string; message: string; path: string | null}[], evaluatedAt: string): GateResult {
  const relevant = issues.filter((item) => /(?:SLICE|CURRENT_SLICE|GOAL_)/u.test(item.code))
  return makeGate('G-state-slice-current', 'PROTOCOL', 'HARD', 'Persisted Slice state is aligned', relevant.length === 0 ? 'PASS' : 'FAIL', relevant.length === 0 ? 'State and active Goal checkpoints are aligned or not yet active.' : relevant.map((item) => item.code).join(', '), evaluatedAt, relevant.map((item) => item.path ?? item.code), 'Compare active Goal checkpoints with state.yml.', 'Change a persisted currentSlice or Slice status without updating its authority.', 'Reconcile state.yml with the active Goal checkpoint.', relevant.map((item) => item.path ?? item.code))
}

function decisionGate(issues: readonly {code: string; message: string; path: string | null}[], evaluatedAt: string): GateResult {
  const relevant = issues.filter((item) => item.code.startsWith('DECISION_'))
  return makeGate('G-decision-lifecycle', 'PROTOCOL', 'HARD', 'Decision lifecycle is valid', relevant.length === 0 ? 'PASS' : 'FAIL', relevant.length === 0 ? 'Decision links and lifecycle directories are valid.' : relevant.map((item) => item.code).join(', '), evaluatedAt, relevant.map((item) => item.path ?? item.code), 'Validate Decision ids, lifecycle status, and supersession links.', 'Break a Decision link or create a supersession cycle.', 'Repair the owning Decision metadata and lifecycle link.', relevant.map((item) => item.path ?? item.code))
}

async function evidenceGate(root: string, changeId: string, evaluatedAt: string, allowLegacy: boolean): Promise<GateResult> {
  try {
    const read = await readEvidence(root, changeId)
    const reconciliation = await reconcileEvidence(root, changeId)
    const hardIssues = reconciliation.issues.filter((issue) => issue.code !== 'LEGACY_EVIDENCE')
    const statuses = reconciliation.evidence.map((item) => item.status)
    const legacyOnly = reconciliation.legacy && reconciliation.issues.every((issue) => issue.code === 'LEGACY_EVIDENCE')
    const pass = hardIssues.length === 0 && statuses.length > 0 && statuses.every((status) => status === 'PASS')
    const status = pass ? 'PASS' : legacyOnly && allowLegacy ? 'WARN' : statuses.length === 0 ? 'NOT_RUN' : 'FAIL'
    return makeGate('G-evidence-current', 'PROTOCOL', 'HARD', 'Required Evidence is current', status, pass ? 'Every acceptance item has current PASS evidence.' : reconciliation.issues.map((issue) => issue.message).join(' ') || (read.document ? 'Evidence is not complete.' : 'No Evidence document exists.'), evaluatedAt, [reconciliation.authority, read.path ?? 'evidence.yml'], 'Reconcile acceptance ids, records, statuses, and input fingerprints.', 'Delete a record, change an acceptance contract, or leave a PASS without a PASS record.', 'Rerun or record the affected Evidence and reconcile the document.', [reconciliation.authority])
  } catch (error) {
    return makeGate('G-evidence-current', 'PROTOCOL', 'HARD', 'Required Evidence is current', 'NOT_RUN', error instanceof Error ? error.message : String(error), evaluatedAt, [], 'Reconcile Evidence v2.', 'Remove the Evidence authority.', 'Restore the Evidence authority and rerun reconciliation.', [])
  }
}

async function constraintsGate(root: string, changeId: string, evaluatedAt: string): Promise<GateResult> {
  try {
    const resolution = await resolveEngineeringConstraints(root, changeId)
    const conflicts = resolution.constraints.filter((item) => item.type === 'CONFLICT')
    const unknowns = resolution.constraints.filter((item) => item.type === 'UNKNOWN')
    const status = conflicts.length > 0 ? 'BLOCKED' : unknowns.length > 0 ? 'BLOCKED' : 'PASS'
    return makeGate('G-constraints-resolved', 'PROTOCOL', 'HARD', 'Task constraints are resolved', status, status === 'PASS' ? `${resolution.constraints.length} constraints resolved with no conflict or unknown blocker.` : `${conflicts.length} conflict(s), ${unknowns.length} unknown blocker(s): ${unknowns.map((item) => item.statement).join(' | ')}`, evaluatedAt, resolution.constraints.flatMap((item) => item.evidence), 'Resolve current authority, decisions, contract, and representative patterns.', 'Introduce two incompatible HARD authority statements or leave a required unknown.', 'Record a human Decision or make the authoritative input explicit.', resolution.constraints.flatMap((item) => item.evidence))
  } catch (error) {
    return makeGate('G-constraints-resolved', 'PROTOCOL', 'HARD', 'Task constraints are resolved', 'NOT_RUN', error instanceof Error ? error.message : String(error), evaluatedAt, [], 'Resolve task-level constraints.', 'Hide or remove the active Change authority.', 'Restore the Change authority before execution.', [])
  }
}

async function currentTruthGate(root: string, changeId: string, evaluatedAt: string): Promise<GateResult> {
  try {
    const truth = await checkCurrentTruth(root, changeId)
    const status = truth.legacy ? 'WARN' : truth.missing.length === 0 ? 'PASS' : 'FAIL'
    return makeGate('G-current-truth', 'PROTOCOL', 'HARD', 'Current-truth targets are satisfied', status, truth.legacy ? 'Plan has no current-truth targets; legacy compatibility applies.' : truth.missing.length === 0 ? `Verified ${truth.verified.length} target(s).` : `Missing: ${truth.missing.join(', ')}`, evaluatedAt, truth.required.map((item) => item.path), 'Check every Plan-declared current-truth path.', 'Delete or omit a required target after implementation.', 'Create or restore the declared current-truth path, or revise the approved Plan.', truth.required.map((item) => item.path))
  } catch (error) {
    return makeGate('G-current-truth', 'PROTOCOL', 'HARD', 'Current-truth targets are satisfied', 'NOT_RUN', error instanceof Error ? error.message : String(error), evaluatedAt, [], 'Read Plan current-truth targets.', 'Remove the Plan authority.', 'Restore the Plan before admission.', [])
  }
}

function makeGate(
  id: string,
  kind: GateKind,
  enforcement: GateEnforcement,
  title: string,
  status: GateResult['status'],
  detail: string,
  evaluatedAt: string,
  evidence: readonly string[],
  predicate: string,
  falsifyingCase: string,
  remediation: string,
  authority: readonly string[],
): GateResult {
  return GateResultSchema.parse({
    id,
    kind,
    enforcement,
    status,
    title,
    detail: detail || 'No detail recorded.',
    authority: authority[0] ?? null,
    predicate,
    falsifyingCase,
    negativeRegression: `A deliberate violation of: ${falsifyingCase}`,
    remediation,
    evidence: [...new Set(evidence)].sort(),
    evaluatedAt,
  })
}

function aggregateStatus(gates: readonly GateResult[], enforcement: GateEnforcement): GateResult['status'] {
  const relevant = gates.filter((gate) => gate.enforcement === enforcement)
  if (relevant.some((gate) => gate.status === 'BLOCKED')) return 'BLOCKED'
  if (relevant.some((gate) => gate.status === 'FAIL')) return 'FAIL'
  if (relevant.some((gate) => gate.status === 'NOT_RUN')) return 'NOT_RUN'
  if (relevant.some((gate) => gate.status === 'WARN')) return 'WARN'
  return 'PASS'
}

function safeChange(changeId: string): void {
  if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/u.test(changeId)) throw new EvoError(`Invalid Change id: ${changeId}`)
}

function relative(root: string, target: string): string {
  return path.relative(path.resolve(root), path.resolve(target)).split(path.sep).join('/')
}
