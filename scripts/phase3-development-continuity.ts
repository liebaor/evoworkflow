import {execFile as execFileCallback} from 'node:child_process'
import {createHash} from 'node:crypto'
import {mkdtemp, mkdir, readFile, readdir, rm, writeFile} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {promisify} from 'node:util'

import {z} from 'zod'

import {ProcessAgentAdapter} from '../src/agents/process-adapter.js'
import {
  ConfigSchema,
  DEFAULT_STOP_CONDITIONS,
  GoalSchema,
  StateSchema,
  type AgentAdapterConfig,
  type AgentRunResult,
  type GoalSlice,
  type State,
  type VerificationRun,
} from '../src/core/schemas.js'
import {executeGoal} from '../src/core/goal.js'
import {changeContextFingerprint} from '../src/core/fingerprint.js'
import {approveArtifact} from '../src/repository/artifacts.js'
import {createGoal, approveActiveGoal} from '../src/repository/goals.js'
import {buildRecoveryReport} from '../src/repository/recovery.js'
import {buildWorkingContext} from '../src/repository/working-context.js'
import {resolveEngineeringConstraints} from '../src/repository/constraints.js'
import {applyInitialization, planInitialization} from '../src/repository/init.js'
import {pathExists, readYaml, writeYaml} from '../src/repository/io.js'
import {activeGoalPath, openManagedRepository} from '../src/repository/managed.js'
import {repositoryPaths} from '../src/repository/paths.js'
import {captureGitSnapshot} from '../src/repository/git-snapshot.js'
import {evaluateExecutionPreflight, evaluateProjectGates} from '../src/validation/gates.js'

const execFile = promisify(execFileCallback)
const cleanupRoots: string[] = []
const options = parseArguments(process.argv.slice(2))
const changeId = 'phase3-development-continuity'

const allowedProductPaths = [
  'ruoyi-admin/src/main/java/com/ruoyi/web/controller/system/SysNoticeController.java',
  'ruoyi-system/src/main/java/com/ruoyi/system/service/ISysNoticeService.java',
  'ruoyi-system/src/main/java/com/ruoyi/system/service/impl/SysNoticeServiceImpl.java',
  'ruoyi-system/src/main/java/com/ruoyi/system/mapper/SysNoticeMapper.java',
  'ruoyi-system/src/main/resources/mapper/system/SysNoticeMapper.xml',
  'ruoyi-ui/src/api/system/notice.js',
]

const ContinuityReportSchema = z.object({
  schemaVersion: z.literal(1),
  status: z.enum(['BEHAVIORAL_PASS', 'BEHAVIORAL_FAIL']),
  evaluator: z.literal('scripts/phase3-development-continuity.ts'),
  generatedAt: z.string().min(1),
  target: z.object({
    backendSource: z.string().min(1),
    backendRevision: z.string().regex(/^[a-f0-9]{40}$/u),
    frontendSource: z.string().min(1),
    frontendRevision: z.string().regex(/^[a-f0-9]{40}$/u),
    baseGitRevision: z.string().regex(/^[a-f0-9]{40}$/u),
    temporaryCopy: z.literal('removed after evaluation'),
  }),
  sessions: z.array(z.object({
    id: z.enum(['A', 'DELTA', 'BUG', 'C']),
    kind: z.enum(['GOAL_SLICE', 'FRESH_AGENT']),
    freshAgent: z.boolean(),
    objective: z.string().min(1),
    acceptance: z.array(z.string().min(1)),
    agent: z.object({
      status: z.enum(['COMPLETED', 'BLOCKED']),
      summary: z.string().min(1),
      changedFiles: z.array(z.string()),
      evidence: z.array(z.string()),
      stopCondition: z.string().nullable(),
    }),
    verification: z.object({
      status: z.enum(['PASS', 'FAIL', 'BLOCKED', 'NOT_RUN']),
      command: z.string().min(1),
      output: z.string().min(1),
    }),
    changedPaths: z.array(z.string()),
    expectedBoundary: z.array(z.string()),
    sourceBoundary: z.enum(['SOURCE_BOUNDARY_PASS', 'SOURCE_BOUNDARY_FAIL']),
  })),
  bugInjection: z.object({
    path: z.string().min(1),
    statusBeforeFix: z.literal('FAIL'),
    statusAfterFix: z.literal('PASS'),
    detail: z.string().min(1),
  }),
  recovery: z.object({
    cliExitCode: z.number().int(),
    status: z.string().min(1),
    currentPhase: z.string().min(1),
    currentObjective: z.string().nullable(),
    completedSlices: z.array(z.string()),
    freshSessionIndicator: z.literal(true),
  }),
  consistency: z.object({
    status: z.literal('PASS'),
    comparedFiles: z.array(z.string()),
    requiredPatterns: z.array(z.string()),
  }),
  build: z.object({
    evaluator: z.literal('PASS'),
    backend: z.enum(['PASS', 'UNVERIFIED']),
    frontend: z.enum(['PASS', 'UNVERIFIED']),
    detail: z.array(z.string().min(1)),
  }),
  sourceIntegrity: z.object({
    status: z.literal('PASS'),
    changedOutsideExpected: z.array(z.string()),
  }),
  limitations: z.array(z.string().min(1)),
})

type ContinuityReport = z.infer<typeof ContinuityReportSchema>

interface StageResult {
  readonly id: 'A' | 'DELTA' | 'BUG' | 'C'
  readonly kind: 'GOAL_SLICE' | 'FRESH_AGENT'
  readonly freshAgent: boolean
  readonly objective: string
  readonly acceptance: readonly string[]
  readonly agent: AgentRunResult
  readonly verification: VerificationResult
  readonly changedPaths: readonly string[]
  readonly expectedBoundary: readonly string[]
  readonly sourceBoundary: 'SOURCE_BOUNDARY_PASS' | 'SOURCE_BOUNDARY_FAIL'
}

interface VerificationResult {
  readonly status: 'PASS' | 'FAIL' | 'BLOCKED' | 'NOT_RUN'
  readonly command: string
  readonly output: string
}

try {
  const report = await runEvaluation()
  if (options.output) await writeJson(options.output, report)
  if (options.summary) await writeSummary(options.summary, report)
  process.stdout.write(formatOutput(report))
} catch (error) {
  process.stderr.write(`FAIL Phase 3 Development Continuity: ${error instanceof Error ? error.message : String(error)}\n`)
  process.exitCode = 1
} finally {
  await Promise.all(cleanupRoots.map((root) => rm(root, {recursive: true, force: true})))
}

async function runEvaluation(): Promise<ContinuityReport> {
  const backendSource = required(options.backendRoot, '--backend-root')
  const backendRevision = requiredRevision(options.backendRevision, '--backend-revision')
  const frontendSource = required(options.frontendRoot, '--frontend-root')
  const frontendRevision = requiredRevision(options.frontendRevision, '--frontend-revision')
  await assertRevision(backendSource, backendRevision, 'RuoYi backend')
  await assertRevision(frontendSource, frontendRevision, 'RuoYi frontend')

  const temporary = await prepareCombinedRuoYi(backendSource, backendRevision, frontendSource, frontendRevision)
  await applyInitialization(await planInitialization(temporary.root))
  await writeContinuityChange(temporary.root)
  await configureCodex(temporary.root)
  await initializeGit(temporary.root)
  const baseline = await manifestOutsideEvo(temporary.root)
  const baseGitRevision = (await git(temporary.root, ['rev-parse', 'HEAD'])).trim()
  await resolveEngineeringConstraints(temporary.root, changeId, {persist: true})
  await writeVerifier(temporary.root)

  const bugPath = 'ruoyi-admin/src/main/java/com/ruoyi/web/controller/system/SysNoticeController.java'
  let bugInjection: ContinuityReport['bugInjection'] | null = null
  const stageBefore = new Map<string, Map<string, string>>()
  const stageResults: StageResult[] = []
  const goalId = 'continuity-long-horizon'
  const slices = [featureStage(), deltaStage(), bugStage()]
  await createGoal(temporary.root, goalId, {
    title: 'Development continuity long-horizon Goal',
    changeId,
    adapter: 'codex',
    maxAttempts: 1,
    failureBudget: 3,
    slices,
  })
  const approvedGoal = await approveActiveGoal(temporary.root, goalId)
  const managed = await openManagedRepository(temporary.root)
  const adapterConfig = await configuredAdapter(temporary.root)
  const executionState = await readYaml(repositoryPaths(temporary.root).state, StateSchema)
  const contextFingerprint = await changeContextFingerprint(temporary.root, changeId)
  const execution = await executeGoal(approvedGoal, {
    adapter: new ProcessAgentAdapter(adapterConfig),
    adapterConfig,
    config: managed.config,
    contextFingerprint,
    state: executionState,
    beforeSlice: async (goal, slice, attempt) => {
      stageBefore.set(slice.id, await manifestOutsideEvo(temporary.root))
      const context = await buildWorkingContext(temporary.root, goal.changeId, {includeGit: true})
      const constraints = await resolveEngineeringConstraints(temporary.root, goal.changeId, {workingContext: context, persist: true})
      const preflight = await evaluateExecutionPreflight(temporary.root, goal.changeId)
      const failed = preflight.find((gate) => gate.enforcement === 'HARD' && gate.status !== 'PASS')
      return {
        status: failed ? 'BLOCKED' as const : 'READY' as const,
        ...(failed ? {summary: failed.detail} : {}),
        ...(failed ? {stopCondition: failed.id === 'G-approval-current' ? 'STALE_APPROVAL' as const : failed.id === 'G-constraints-resolved' ? 'CONSTRAINT_CONFLICT' as const : 'HARD_GATE_FAILURE' as const} : {}),
        invocationId: `${goal.id}/${slice.id}/${goal.runEpoch}/${attempt}`,
        workingContext: context,
        constraints: constraints.constraints,
        preflight,
        workingContextFingerprint: context.inputFingerprint,
        constraintsFingerprint: constraints.inputFingerprint,
      }
    },
    afterSlice: async (goal, slice, _attempt, agent, verification) => {
      if (slice.id === 'DELTA') {
        await injectKnownBug(temporary.root, bugPath)
        const failingBeforeFix = await runVerifier(temporary.root, 'DELTA')
        if (failingBeforeFix.status !== 'FAIL') throw new Error('The deliberate continuity regression did not fail before the Bug session.')
        bugInjection = {
          path: bugPath,
          statusBeforeFix: 'FAIL',
          statusAfterFix: 'PASS',
          detail: 'A deterministic source-boundary verifier observed the injected limit 0 regression and the Bug Agent restored the approved limit 3.',
        }
      }
      const changedPaths = [...new Set([...agent.changedFiles, ...(await captureGitSnapshot(temporary.root)).changedPaths])]
      const postflight = await evaluateProjectGates(temporary.root, goal.changeId, {changedPaths})
      const hardFailure = postflight.gates.find((gate) => gate.enforcement === 'HARD' && gate.status !== 'PASS')
      const stageBeforeManifest = stageBefore.get(slice.id)
      if (!stageBeforeManifest) throw new Error(`Missing manifest baseline for Slice ${slice.id}.`)
      const stageAfterManifest = await manifestOutsideEvo(temporary.root)
      const stagePaths = compareManifests(stageBeforeManifest, stageAfterManifest)
      const outside = stagePaths.filter((item) => !isAllowedProductPath(item))
      if (outside.length > 0) throw new Error(`Stage ${slice.id} changed paths outside the expected boundary: ${outside.join(', ')}`)
      const verificationRun = verification.at(-1)
      if (!verificationRun) throw new Error(`Slice ${slice.id} did not persist an independent verification run.`)
      stageResults.push({
        id: slice.id as 'A' | 'DELTA' | 'BUG',
        kind: 'GOAL_SLICE',
        freshAgent: true,
        objective: slice.objective,
        acceptance: slice.acceptance,
        agent,
        verification: fromVerificationRun(verificationRun),
        changedPaths: compareManifests(baseline, stageAfterManifest),
        expectedBoundary: allowedProductPaths,
        sourceBoundary: 'SOURCE_BOUNDARY_PASS',
      })
      return {
        status: hardFailure ? 'BLOCKED' as const : 'PASS' as const,
        summary: hardFailure ? `Post-execution hard project gate ${hardFailure.id} blocked ${slice.id}: ${hardFailure.detail}` : `Post-execution project gates passed for ${slice.id}.`,
        ...(hardFailure ? {stopCondition: 'HARD_GATE_FAILURE' as const} : {}),
        postflight: postflight.gates,
      }
    },
    persistence: {
      saveGoal: async (value) => writeYaml(activeGoalPath(temporary.root, goalId), value),
      saveState: async (value) => writeYaml(repositoryPaths(temporary.root).state, value),
    },
  })
  if (execution.status !== 'READY_FOR_REVIEW' || stageResults.length !== 3) throw new Error(`Long-horizon Goal did not reach READY_FOR_REVIEW: ${execution.status}; stages=${stageResults.map((item) => item.id).join(',')}; slices=${execution.slices.map((slice) => `${slice.id}:${slice.status}:${slice.stopCondition ?? 'none'}:${slice.blockReason ?? 'none'}:${slice.attempts.at(-1)?.agent.summary ?? 'no-attempt'}`).join(' | ')}.`)
  if (!bugInjection) throw new Error('The continuity regression injection was not recorded.')
  const sessions: StageResult[] = stageResults

  const recoveryCli = await runRecoverCli(temporary.root)
  const recovery = await buildRecoveryReport(temporary.root)
  if (recoveryCli.exitCode !== 0) throw new Error(`Fresh evo recover failed: ${recoveryCli.output}`)
  if (!recovery.currentObjective || recovery.completedSlices.length === 0) throw new Error('Fresh recovery did not reconstruct the active Bug objective and completed Slice.')
  await writeRecoveryNote(temporary.root, recovery)

  const beforeFollowUp = await manifestOutsideEvo(temporary.root)
  const followUp = await runFreshFollowUp(temporary.root, recovery)
  sessions.push(await finalizeStage(temporary.root, beforeFollowUp, baseline, followUp, 'C'))

  const after = await manifestOutsideEvo(temporary.root)
  const changedOutsideExpected = compareManifests(baseline, after).filter((item) => !isAllowedProductPath(item))
  if (changedOutsideExpected.length > 0) throw new Error(`Real Agent changed paths outside the approved continuity boundary: ${changedOutsideExpected.join(', ')}`)

  const consistency = await verifyCrossFeatureConsistency(temporary.root)
  const build = await verifyBuilds(temporary.root)
  const report = ContinuityReportSchema.parse(sanitize({
    schemaVersion: 1,
    status: 'BEHAVIORAL_PASS',
    evaluator: 'scripts/phase3-development-continuity.ts',
    generatedAt: new Date().toISOString(),
    target: {
      backendSource,
      backendRevision,
      frontendSource,
      frontendRevision,
      baseGitRevision,
      temporaryCopy: 'removed after evaluation',
    },
    sessions: sessions.map(toSessionReport),
    bugInjection,
    recovery: {
      cliExitCode: recoveryCli.exitCode,
      status: recovery.status,
      currentPhase: recovery.currentPhase,
      currentObjective: recovery.currentObjective,
      completedSlices: recovery.completedSlices,
      freshSessionIndicator: true,
    },
    consistency,
    build,
    sourceIntegrity: {status: 'PASS', changedOutsideExpected: []},
    limitations: [
      'The temporary copy is isolated and removed after evaluation; only this sanitized report is durable.',
      'The RuoYi application was not started and no MySQL, Redis, production credential, or browser session was used.',
      ...(build.backend === 'UNVERIFIED' ? ['Backend Maven compilation is UNVERIFIED in this host because the fixed RuoYi line requires Java 17 while this host exposes Java 11; GitHub/target CI remains the appropriate build environment.'] : []),
      ...(build.frontend === 'UNVERIFIED' ? ['Frontend production build is UNVERIFIED in this host; source-contract evaluation still ran independently.'] : []),
    ],
  }))
  return report
}

function featureStage(): GoalSlice {
  return slice('A',
    'Implement one bounded, code-changing Notice Highlights capability in the actual fixed RuoYi product. Inspect the existing SysNotice controller, service, mapper/XML, response, permission, and naming patterns first. Add a read-only backend endpoint GET /system/notice/highlights that uses @PreAuthorize("@ss.hasPermi(\'system:notice:list\')"), AjaxResult, the existing ISysNoticeService/implementation/SysNoticeMapper/XML path, status 0 (published), descending notice_id order, and an initial limit of 5. Modify only the existing SysNotice controller, service interface/implementation, mapper interface/XML files listed by the repository pattern. Do not add a database migration, dependency, frontend file, test fixture, authority document, generated file, commit, or push.',
    [
      'The fixed RuoYi backend contains the new /highlights endpoint and it uses the existing permission and AjaxResult mechanisms.',
      'The service, mapper, and XML layers expose the same named published-notice capability with status filtering and descending order.',
    ],
  )
}

function deltaStage(): GoalSlice {
  return slice('DELTA',
    'Apply the persisted Requirement Delta to the Notice Highlights capability. The approved product requirement changes the initial maximum from 5 to 3 while retaining the same endpoint, permission, AjaxResult, service/mapper/XML boundary, published status 0, and descending notice_id order. Read the existing changed code and make the smallest source change needed. Do not change any authority document, add a dependency or migration, modify frontend files, commit, or push.',
    [
      'The Notice Highlights endpoint now requests a maximum of 3 and no longer requests 5.',
      'The existing RuoYi API, permission, response, service, mapper, status, and ordering mechanisms remain intact.',
    ],
  )
}

function bugStage(): GoalSlice {
  return slice('BUG',
    'Fix the deliberate Notice Highlights regression reported by an independent verifier. The verifier currently fails because the endpoint requests limit 0 instead of the approved Requirement Delta limit 3. Reproduce the source failure, restore the limit to 3, preserve the existing RuoYi permission/response/service/mapper/XML boundary, and report the bounded regression. Do not change any authority document, add a dependency or migration, modify frontend files, commit, or push.',
    [
      'The independent verifier passes after the deliberately injected limit-0 regression is fixed back to 3.',
      'The Bug session remains within the expected SysNotice backend boundary and does not self-accept the Change.',
    ],
  )
}

function followUpStage(): GoalSlice {
  return slice('C',
    'Fresh follow-up Feature after reading the persisted recovery note and continuity reports. Without relying on prior chat, inspect the real RuoYi frontend API conventions and the persisted Feature A, Requirement Delta, and Bug results. Add exactly one frontend API function named listNoticeHighlights to ruoyi-ui/src/api/system/notice.js that calls GET /system/notice/highlights with the existing request helper. Do not modify the backend, views, dependencies, authority documents, generated files, commit, or push.',
    [
      'The actual RuoYi frontend notice API exposes listNoticeHighlights with the existing request helper, GET method, and /system/notice/highlights path.',
      'No backend or unrelated frontend source path is changed by the follow-up Feature.',
    ],
  )
}

function slice(id: 'A' | 'DELTA' | 'BUG' | 'C', objective: string, acceptance: readonly string[]): GoalSlice {
  return {
    id,
    objective,
    acceptance: [...acceptance],
    dependsOn: id === 'A' ? [] : id === 'DELTA' ? ['A'] : id === 'BUG' ? ['DELTA'] : [],
    verify: [{
      label: `independent continuity source verifier ${id}`,
      command: process.execPath,
      args: ['.evo/continuity-verifier.cjs', id],
      timeoutMs: 120_000,
    }],
    status: 'PENDING',
    attempts: [],
    blockReason: null,
    stopCondition: null,
  }
}

async function runFreshFollowUp(root: string, recovery: Awaited<ReturnType<typeof buildRecoveryReport>>): Promise<StageResult> {
  const context = await buildWorkingContext(root, changeId, {includeGit: true})
  const constraints = await resolveEngineeringConstraints(root, changeId, {workingContext: context, persist: true})
  const preflight = await evaluateExecutionPreflight(root, changeId)
  const definition = followUpStage()
  const goal = GoalSchema.parse({
    schemaVersion: 1,
    id: 'continuity-fresh-follow-up',
    title: 'Fresh Agent follow-up Feature',
    changeId,
    repository: root,
    adapter: 'codex',
    maxAttempts: 1,
    failureBudget: 1,
    failuresUsed: 0,
    status: 'APPROVED',
    stopConditions: DEFAULT_STOP_CONDITIONS,
    slices: [definition],
    approval: null,
    runEpoch: 0,
    resumes: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  })
  const adapter = new ProcessAgentAdapter(await configuredAdapter(root))
  const agent = await adapter.run({
    repository: root,
    goal,
    slice: definition,
    attempt: 1,
    invocationId: 'development-continuity/fresh-agent/C',
    workingContext: context,
    constraints: constraints.constraints,
    preflight,
  })
  if (agent.status !== 'COMPLETED') throw new Error(`Fresh follow-up Agent was ${agent.status}: ${agent.summary}`)
  const verification = await runVerifier(root, 'C')
  if (verification.status !== 'PASS') throw new Error(`Fresh follow-up verifier did not pass: ${verification.output}`)
  if (!recovery.currentObjective) throw new Error('Fresh follow-up was invoked without a recovered objective.')
  return {
    id: 'C',
    kind: 'FRESH_AGENT',
    freshAgent: true,
    objective: definition.objective,
    acceptance: definition.acceptance,
    agent,
    verification,
    changedPaths: [],
    expectedBoundary: allowedProductPaths,
    sourceBoundary: 'SOURCE_BOUNDARY_PASS',
  }
}

async function finalizeStage(root: string, before: Map<string, string>, baseline: Map<string, string>, stage: StageResult, id: StageResult['id']): Promise<StageResult> {
  const after = await manifestOutsideEvo(root)
  const stagePaths = compareManifests(before, after)
  const cumulative = compareManifests(baseline, after)
  const outside = stagePaths.filter((item) => !isAllowedProductPath(item))
  if (outside.length > 0) throw new Error(`Stage ${id} changed paths outside the expected boundary: ${outside.join(', ')}`)
  return {...stage, changedPaths: cumulative, sourceBoundary: 'SOURCE_BOUNDARY_PASS'}
}

async function verifyCrossFeatureConsistency(root: string): Promise<ContinuityReport['consistency']> {
  const files = {
    controller: 'ruoyi-admin/src/main/java/com/ruoyi/web/controller/system/SysNoticeController.java',
    service: 'ruoyi-system/src/main/java/com/ruoyi/system/service/ISysNoticeService.java',
    implementation: 'ruoyi-system/src/main/java/com/ruoyi/system/service/impl/SysNoticeServiceImpl.java',
    mapper: 'ruoyi-system/src/main/java/com/ruoyi/system/mapper/SysNoticeMapper.java',
    xml: 'ruoyi-system/src/main/resources/mapper/system/SysNoticeMapper.xml',
    frontend: 'ruoyi-ui/src/api/system/notice.js',
  } as const
  const source = new Map<string, string>()
  for (const relative of Object.values(files)) source.set(relative, await readFile(path.join(root, relative), 'utf8'))
  const requiredPatterns = [
    '@PreAuthorize',
    'AjaxResult',
    'selectPublishedNoticeList',
    'status',
    'notice_id desc',
    'listNoticeHighlights',
    '/system/notice/highlights',
  ]
  const missing = requiredPatterns.filter((token) => ![...source.values()].some((contents) => contents.includes(token)))
  if (missing.length > 0) throw new Error(`Cross-feature consistency verifier missed patterns: ${missing.join(', ')}`)
  const controller = source.get(files.controller) ?? ''
  const frontend = source.get(files.frontend) ?? ''
  if (!/@PreAuthorize\([\s\S]*system:notice:list/u.test(controller)) throw new Error('Feature A/B lost the RuoYi list permission boundary.')
  if (!/selectPublishedNoticeList\s*\(\s*3\s*\)/u.test(controller)) throw new Error('Feature Delta/Bug did not preserve the approved limit 3.')
  if (!/export function listNoticeHighlights\s*\(/u.test(frontend)) throw new Error('Fresh follow-up Feature did not use the expected frontend function name.')
  return {status: 'PASS', comparedFiles: Object.values(files), requiredPatterns}
}

async function verifyBuilds(root: string): Promise<ContinuityReport['build']> {
  const details: string[] = []
  const backend = await runCommand(root, 'mvn', ['-q', '-pl', 'ruoyi-admin', '-am', '-DskipTests', 'compile'], 900_000)
  const backendStatus = backend.exitCode === 0 ? 'PASS' : isJavaEnvironmentLimitation(backend.output) ? 'UNVERIFIED' : failBuild('RuoYi backend Maven compilation', backend.output)
  details.push(`backend: ${backendStatus}; ${firstLine(backend.output)}`)

  const frontendRoot = path.join(root, 'ruoyi-ui')
  const install = await runCommand(frontendRoot, 'pnpm', ['install', '--no-frozen-lockfile'], 900_000)
  let frontendStatus: 'PASS' | 'UNVERIFIED'
  if (install.exitCode !== 0) {
    frontendStatus = isDependencyEnvironmentLimitation(install.output) ? 'UNVERIFIED' : failBuild('RuoYi frontend dependency installation', install.output)
    details.push(`frontend install: ${frontendStatus}; ${firstLine(install.output)}`)
  } else {
    const frontend = await runCommand(frontendRoot, 'pnpm', ['run', 'build:prod'], 900_000)
    frontendStatus = frontend.exitCode === 0 ? 'PASS' : isDependencyEnvironmentLimitation(frontend.output) ? 'UNVERIFIED' : failBuild('RuoYi frontend production build', frontend.output)
    details.push(`frontend: ${frontendStatus}; ${firstLine(frontend.output)}`)
  }
  return {evaluator: 'PASS', backend: backendStatus, frontend: frontendStatus, detail: details}
}

function failBuild(label: string, output: string): never {
  throw new Error(`${label} failed outside a known environment limitation: ${lastLines(output)}`)
}

function isJavaEnvironmentLimitation(output: string): boolean {
  return /(?:release|source|target) version 17 not supported|invalid target release: 17|class file has wrong version/u.test(output)
}

function isDependencyEnvironmentLimitation(output: string): boolean {
  return /(?:ERR_PNPM_|ECONNRESET|ETIMEDOUT|ENETUNREACH|EAI_AGAIN|network|fetch failed|unable to verify the first certificate)/iu.test(output)
}

async function runVerifier(root: string, stage: 'A' | 'DELTA' | 'C'): Promise<VerificationResult> {
  const command = `${process.execPath} .evo/continuity-verifier.cjs ${stage}`
  try {
    const result = await execFile(process.execPath, ['.evo/continuity-verifier.cjs', stage], {cwd: root, timeout: 120_000, maxBuffer: 2_000_000})
    return {status: 'PASS', command, output: sanitizeText(String(result.stdout || result.stderr || 'source verifier passed'))}
  } catch (error) {
    const typed = error as {stdout?: string; stderr?: string; message?: string; code?: number}
    return {status: typeof typed.code === 'number' ? 'FAIL' : 'BLOCKED', command, output: sanitizeText(`${String(typed.stdout || '')}${String(typed.stderr || '')}${String(typed.message || '')}`)}
  }
}

function fromVerificationRun(run: VerificationRun): VerificationResult {
  return {status: run.status === 'PASS' ? 'PASS' : run.status, command: `${run.command} ${run.args.join(' ')}`, output: sanitizeText(run.output || 'verification completed')}
}

function toSessionReport(stage: StageResult): unknown {
  return {
    id: stage.id,
    kind: stage.kind,
    freshAgent: stage.freshAgent,
    objective: stage.objective,
    acceptance: stage.acceptance,
    agent: stage.agent,
    verification: stage.verification,
    changedPaths: stage.changedPaths,
    expectedBoundary: stage.expectedBoundary,
    sourceBoundary: stage.sourceBoundary,
  }
}

async function injectKnownBug(root: string, relative: string): Promise<void> {
  const target = path.join(root, relative)
  const source = await readFile(target, 'utf8')
  const match = /selectPublishedNoticeList\s*\(\s*3\s*\)/u.exec(source)
  if (!match) throw new Error('Could not locate the approved limit 3 before injecting the deterministic regression.')
  const broken = match[0].replace(/3/u, '0')
  await writeFile(target, source.replace(match[0], broken), 'utf8')
}

async function writeVerifier(root: string): Promise<void> {
  const source = `const fs = require('node:fs');
const path = require('node:path');
const root = process.cwd();
const stage = process.argv[2];
function read(file) { return fs.readFileSync(path.join(root, file), 'utf8'); }
function fail(message) { console.error(message); process.exit(1); }
const controllerPath = 'ruoyi-admin/src/main/java/com/ruoyi/web/controller/system/SysNoticeController.java';
const servicePath = 'ruoyi-system/src/main/java/com/ruoyi/system/service/ISysNoticeService.java';
const implementationPath = 'ruoyi-system/src/main/java/com/ruoyi/system/service/impl/SysNoticeServiceImpl.java';
const mapperPath = 'ruoyi-system/src/main/java/com/ruoyi/system/mapper/SysNoticeMapper.java';
const xmlPath = 'ruoyi-system/src/main/resources/mapper/system/SysNoticeMapper.xml';
const frontendPath = 'ruoyi-ui/src/api/system/notice.js';
const controller = read(controllerPath);
const service = read(servicePath);
const implementation = read(implementationPath);
const mapper = read(mapperPath);
const xml = read(xmlPath);
if (!controller.includes('@RequestMapping("/system/notice")')) fail('missing existing notice controller mapping');
if (!controller.includes('AjaxResult') || !controller.includes('@PreAuthorize') || !controller.includes('system:notice:list')) fail('missing RuoYi response or permission mechanism');
if (!/selectPublishedNoticeList\\s*\\(\\s*\\d+\\s*\\)/u.test(controller)) fail('missing published notice service call');
if (!service.includes('selectPublishedNoticeList') || !implementation.includes('selectPublishedNoticeList') || !mapper.includes('selectPublishedNoticeList')) fail('missing service/implementation/mapper continuity');
if (!xml.includes('selectPublishedNoticeList') || !/status[\\s\\S]*0/u.test(xml) || !/notice_id\\s+desc/iu.test(xml)) fail('missing published status or ordering query');
if (stage === 'A' && !/selectPublishedNoticeList\\s*\\(\\s*5\\s*\\)/u.test(controller)) fail('Feature A must begin with limit 5');
if ((stage === 'DELTA' || stage === 'C') && !/selectPublishedNoticeList\\s*\\(\\s*3\\s*\\)/u.test(controller)) fail('Requirement Delta must preserve limit 3');
if (stage === 'C') {
  const frontend = read(frontendPath);
  if (!/export function listNoticeHighlights\\s*\\(/u.test(frontend) || !frontend.includes('/system/notice/highlights') || !/method:\\s*["']get["']/u.test(frontend)) fail('missing frontend follow-up API contract');
}
console.log('independent source verifier passed ' + stage);
`
  await mkdir(path.join(root, '.evo'), {recursive: true})
  await writeFile(path.join(root, '.evo/continuity-verifier.cjs'), source, 'utf8')
}

async function writeContinuityChange(root: string): Promise<void> {
  const paths = repositoryPaths(root)
  const changeRoot = path.join(paths.activeWork, changeId)
  await mkdir(changeRoot, {recursive: true})
  await writeFiles(root, {
    [`.evo/work/active/${changeId}/change.md`]: `---\nid: ${changeId}\nweight: STANDARD\nstatus: AWAITING_APPROVAL\napproval: null\n---\n\n# Development Continuity evaluator\n\n## Rules and acceptance\n\n- AC-F2: A real code-changing Feature, Requirement Delta, Bug/Regression, fresh recovery, and follow-up Feature remain inside the fixed Brownfield boundary.\n- AC-F3: The evaluator emits a sanitized, machine-readable trace that can be bound as an Evidence artifact.\n`,
    [`.evo/work/active/${changeId}/plan.md`]: `---\nchange: ${changeId}\nstatus: AWAITING_APPROVAL\napproval: null\ncurrentTruthTargets:\n  - path: ruoyi-admin/src/main/java/com/ruoyi/web/controller/system/SysNoticeController.java\n    action: UPDATE\n  - path: ruoyi-system/src/main/java/com/ruoyi/system/service/ISysNoticeService.java\n    action: UPDATE\n  - path: ruoyi-system/src/main/java/com/ruoyi/system/service/impl/SysNoticeServiceImpl.java\n    action: UPDATE\n  - path: ruoyi-system/src/main/java/com/ruoyi/system/mapper/SysNoticeMapper.java\n    action: UPDATE\n  - path: ruoyi-system/src/main/resources/mapper/system/SysNoticeMapper.xml\n    action: UPDATE\n  - path: ruoyi-ui/src/api/system/notice.js\n    action: UPDATE\n---\n\n# Development Continuity Plan\n\n### A — Initial code-changing Feature\n\n### DELTA — Requirement Delta\n\n### BUG — Bug and Regression\n`,
    [`.evo/work/active/${changeId}/evidence.md`]: '# Evidence\n\nThis isolated evaluator is not product acceptance.\n',
  })
  const current = await readYaml(paths.state, StateSchema)
  await writeYaml(paths.state, {...current, activeChange: changeId, activeGoal: null, currentSlice: null, slices: [], phase: 'PLAN', status: 'AWAITING_APPROVAL', updatedAt: new Date().toISOString()} satisfies State)
  const now = new Date()
  await approveArtifact(root, changeId, 'change', 'phase3 continuity evaluator harness', now)
  await approveArtifact(root, changeId, 'plan', 'phase3 continuity evaluator harness', now)
}

async function configureCodex(root: string): Promise<void> {
  const paths = repositoryPaths(root)
  const config = await readYaml(paths.config, ConfigSchema)
  const adapter: AgentAdapterConfig = {
    kind: 'codex',
    command: options.agent,
    timeoutMs: options.timeoutMs,
    args: ['exec', '--ephemeral', '--sandbox', 'workspace-write', '--cd', '{repository}', '--skip-git-repo-check', '-'],
  }
  await writeYaml(paths.config, {...config, goal: {...config.goal, defaultAdapter: 'codex'}, agents: {...config.agents, adapters: {...config.agents.adapters, codex: adapter}}})
}

async function configuredAdapter(root: string): Promise<AgentAdapterConfig> {
  const config = await readYaml(repositoryPaths(root).config, ConfigSchema)
  const adapter = config.agents.adapters.codex
  if (!adapter) throw new Error('Continuity evaluator did not configure a codex adapter.')
  return adapter
}

async function prepareCombinedRuoYi(backendRoot: string, backendRevision: string, frontendRoot: string, frontendRevision: string): Promise<{readonly root: string}> {
  const parent = await mkdtemp(path.join(tmpdir(), 'evoworkflow-phase3-development-continuity-'))
  cleanupRoots.push(parent)
  const root = path.join(parent, 'checkout')
  await execFile('git', ['clone', '--no-local', '--quiet', backendRoot, root], {timeout: 120_000, maxBuffer: 2_000_000})
  await git(root, ['checkout', '--detach', backendRevision])
  const frontendArchive = path.join(parent, 'frontend.tar')
  await gitArchive(frontendRoot, frontendRevision, frontendArchive)
  await mkdir(path.join(root, 'ruoyi-ui'), {recursive: true})
  await execFile('tar', ['-xf', frontendArchive, '-C', path.join(root, 'ruoyi-ui')], {timeout: 120_000, maxBuffer: 1_000_000})
  await writeFiles(root, {
    'docs/architecture.md': '# Continuity evaluator architecture boundary\n\nThis evaluator-owned note records the fixed Brownfield architecture used for the isolated field run. It is not a RuoYi product Decision.\n',
    'docs/evaluation-runtime.xml': '<properties><mysql.version>9.7.0</mysql.version><redis.version>6.0.16</redis.version><spring-security.version>7.1.0</spring-security.version><node.version>24</node.version></properties>\n',
    '.github/workflows/phase3-evaluation.yml': 'name: phase3-evaluation\non: []\n',
  })
  const frontendPackagePath = path.join(root, 'ruoyi-ui', 'package.json')
  const frontendPackage = JSON.parse(await readFile(frontendPackagePath, 'utf8')) as {engines?: Record<string, string>}
  frontendPackage.engines = {...frontendPackage.engines, node: '>=22'}
  await writeFile(frontendPackagePath, `${JSON.stringify(frontendPackage, null, 2)}\n`, 'utf8')
  return {root}
}

async function gitArchive(sourceRoot: string, revision: string, target: string): Promise<void> {
  const repositoryRoot = (await git(sourceRoot, ['rev-parse', '--show-toplevel'])).trim()
  await execFile('git', ['archive', '--format=tar', `--output=${target}`, revision], {cwd: repositoryRoot, timeout: 120_000, maxBuffer: 1_000_000})
}

async function assertRevision(root: string, revision: string, label: string): Promise<void> {
  const actual = (await git(root, ['rev-parse', '--verify', `${revision}^{commit}`])).trim()
  if (actual !== revision) throw new Error(`${label} revision ${revision} is not the requested exact commit (${actual}).`)
}

async function initializeGit(root: string): Promise<void> {
  await execFile('git', ['config', 'user.email', 'evo-continuity@test.invalid'], {cwd: root})
  await execFile('git', ['config', 'user.name', 'EVO Continuity Evaluator'], {cwd: root})
  await execFile('git', ['add', '-A'], {cwd: root})
  await execFile('git', ['commit', '-qm', 'continuity evaluator baseline'], {cwd: root})
}

async function runRecoverCli(root: string): Promise<{readonly exitCode: number; readonly output: string}> {
  const cli = path.resolve('dist/index.js')
  if (!(await pathExists(cli))) throw new Error('dist/index.js is missing; run pnpm run build before the continuity evaluator.')
  try {
    const result = await execFile(process.execPath, [cli, 'recover', '--root', root, '--json'], {cwd: process.cwd(), timeout: 120_000, maxBuffer: 4_000_000})
    return {exitCode: 0, output: sanitizeText(String(result.stdout).slice(-20_000))}
  } catch (error) {
    const typed = error as {code?: number; stdout?: string; stderr?: string; message?: string}
    return {exitCode: typeof typed.code === 'number' ? typed.code : 1, output: sanitizeText(`${String(typed.stdout || '')}${String(typed.stderr || '')}${String(typed.message || '')}`.slice(-20_000))}
  }
}

async function writeRecoveryNote(root: string, recovery: Awaited<ReturnType<typeof buildRecoveryReport>>): Promise<void> {
  await writeFiles(root, {
    '.evo/continuity/recovery.md': [
      '# Fresh Recovery Note',
      '',
      `- Status: ${recovery.status}`,
      `- Phase: ${recovery.currentPhase}`,
      `- Objective: ${recovery.currentObjective ?? 'none'}`,
      `- Completed slices: ${recovery.completedSlices.join(', ') || 'none'}`,
      `- Next action: ${recovery.recommendedNextAction}`,
      '',
      'This note is evaluator-owned and is not an approval or acceptance record.',
      '',
    ].join('\n'),
  })
}

async function runCommand(cwd: string, executable: string, args: readonly string[], timeout: number): Promise<{readonly exitCode: number; readonly output: string}> {
  try {
    const result = await execFile(executable, [...args], {cwd, timeout, maxBuffer: 8_000_000})
    return {exitCode: 0, output: sanitizeText(`${String(result.stdout || '')}${String(result.stderr || '')}`.slice(-40_000))}
  } catch (error) {
    const typed = error as {code?: number; stdout?: string; stderr?: string; message?: string}
    return {exitCode: typeof typed.code === 'number' ? typed.code : 1, output: sanitizeText(`${String(typed.stdout || '')}${String(typed.stderr || '')}${String(typed.message || '')}`.slice(-40_000))}
  }
}

async function manifestOutsideEvo(root: string): Promise<Map<string, string>> {
  const result = new Map<string, string>()
  await visit(root, '')
  return result

  async function visit(directory: string, relativeDirectory: string): Promise<void> {
    for (const entry of await readdir(directory, {withFileTypes: true})) {
      const relative = relativeDirectory ? `${relativeDirectory}/${entry.name}` : entry.name
      if (entry.name === '.git' || entry.name === '.evo' || isGeneratedPath(relative)) continue
      const target = path.join(directory, entry.name)
      if (entry.isDirectory()) await visit(target, relative)
      else if (entry.isFile()) result.set(relative, createHash('sha256').update(await readFile(target)).digest('hex'))
    }
  }
}

function isGeneratedPath(relative: string): boolean {
  return relative.split('/').includes('node_modules') || relative.startsWith('ruoyi-ui/dist/') || relative.includes('/target/') || relative.startsWith('target/') || relative.includes('/coverage/')
}

function compareManifests(before: Map<string, string>, after: Map<string, string>): string[] {
  const paths = new Set([...before.keys(), ...after.keys()])
  return [...paths].filter((file) => before.get(file) !== after.get(file)).sort()
}

function isAllowedProductPath(relative: string): boolean {
  return allowedProductPaths.includes(relative) || relative.startsWith('ruoyi-admin/src/test/') || relative.startsWith('ruoyi-system/src/test/')
}

async function writeFiles(root: string, files: Readonly<Record<string, string>>): Promise<void> {
  for (const [relative, contents] of Object.entries(files)) {
    const target = path.join(root, relative)
    await mkdir(path.dirname(target), {recursive: true})
    await writeFile(target, contents, 'utf8')
  }
}

async function writeJson(target: string, report: ContinuityReport): Promise<void> {
  await mkdir(path.dirname(path.resolve(target)), {recursive: true})
  await writeFile(path.resolve(target), `${JSON.stringify(report, null, 2)}\n`, 'utf8')
}

async function writeSummary(target: string, report: ContinuityReport): Promise<void> {
  const summary = [
    '# Development Continuity Eval',
    '',
    `- Result: ${report.status}`,
    `- Backend revision: \`${report.target.backendRevision}\``,
    `- Frontend revision: \`${report.target.frontendRevision}\``,
    `- Recovery: ${report.recovery.status} at ${report.recovery.currentPhase}; fresh session=${report.recovery.freshSessionIndicator}`,
    `- Changed boundary: ${report.sourceIntegrity.status}`,
    `- Evaluator/source consistency: ${report.consistency.status}`,
    `- Backend build: ${report.build.backend}`,
    `- Frontend build: ${report.build.frontend}`,
    '',
    '## Sessions',
    '',
    ...report.sessions.map((session) => `- ${session.id}: Agent=${session.agent.status}; verifier=${session.verification.status}; changed paths=${session.changedPaths.join(', ') || 'none'}`),
    '',
    '## Limitations',
    '',
    ...report.limitations.map((item) => `- ${item}`),
    '',
    'Machine-readable trace: [development-continuity.json](./development-continuity.json)',
    '',
  ].join('\n')
  await mkdir(path.dirname(path.resolve(target)), {recursive: true})
  await writeFile(path.resolve(target), summary, 'utf8')
}

function formatOutput(report: ContinuityReport): string {
  return [
    `Development Continuity: ${report.status}`,
    `Sessions: ${report.sessions.map((session) => `${session.id}=${session.agent.status}/${session.verification.status}`).join(' ')}`,
    `Recovery: ${report.recovery.status}/${report.recovery.currentPhase}; fresh=${report.recovery.freshSessionIndicator}`,
    `Changed boundary: ${report.sourceIntegrity.status}`,
    `Build: backend=${report.build.backend}, frontend=${report.build.frontend}`,
    'Real code-changing Brownfield continuity evaluation completed; Finish and product acceptance remain repository workflow boundaries.',
  ].join('\n') + '\n'
}

function sanitize(value: unknown): unknown {
  if (typeof value === 'string') return sanitizeText(value)
  if (Array.isArray(value)) return value.map((item) => sanitize(item))
  if (value && typeof value === 'object') return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, sanitize(item)]))
  return value
}

function sanitizeText(value: string): string {
  return value
    .replace(/(?:password|token|secret|api[_-]?key)\s*[:=]\s*[^\s,;]+/giu, '$1=<redacted>')
    .replace(/\/tmp\/evoworkflow-[^\s)]+/gu, '<temporary-copy>')
    .replace(/\/home\/[^\s)]+\/(?:\.codex|\.config)\/[^\s)]+/gu, '<redacted-path>')
    .slice(0, 20_000)
}

function firstLine(value: string): string {
  return value.split('\n').map((line) => line.trim()).find((line) => line.length > 0)?.slice(0, 500) ?? 'no output'
}

function lastLines(value: string): string {
  return value.split('\n').slice(-8).join(' | ').slice(0, 2_000)
}

async function git(root: string, args: readonly string[]): Promise<string> {
  try {
    const result = await execFile('git', [...args], {cwd: root, timeout: 120_000, maxBuffer: 4_000_000})
    return String(result.stdout)
  } catch (error) {
    throw new Error(`git ${args[0] ?? 'command'} failed in ${root}: ${error instanceof Error ? error.message : String(error)}`)
  }
}

function required(value: string | null, option: string): string {
  if (!value) throw new Error(`${option} is required.`)
  return value
}

function requiredRevision(value: string | null, option: string): string {
  if (!value) throw new Error(`${option} is required for reproducibility.`)
  if (!/^[a-f0-9]{40}$/u.test(value)) throw new Error(`${option} must be a 40-character Git revision.`)
  return value
}

function parseArguments(args: readonly string[]): {backendRoot: string | null; backendRevision: string | null; frontendRoot: string | null; frontendRevision: string | null; agent: string; timeoutMs: number; output: string | null; summary: string | null} {
  const result = {backendRoot: null, backendRevision: null, frontendRoot: null, frontendRevision: null, agent: 'codex', timeoutMs: 900_000, output: null, summary: null} as {backendRoot: string | null; backendRevision: string | null; frontendRoot: string | null; frontendRevision: string | null; agent: string; timeoutMs: number; output: string | null; summary: string | null}
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index]
    if (!argument || argument === '--') continue
    const value = args[index + 1]
    if (!value || value.startsWith('--')) throw new Error(`Missing value for ${argument}.`)
    if (argument === '--backend-root') result.backendRoot = path.resolve(value)
    else if (argument === '--backend-revision') result.backendRevision = value
    else if (argument === '--frontend-root') result.frontendRoot = path.resolve(value)
    else if (argument === '--frontend-revision') result.frontendRevision = value
    else if (argument === '--agent') result.agent = value
    else if (argument === '--timeout-ms') {
      const timeout = Number(value)
      if (!Number.isInteger(timeout) || timeout <= 0) throw new Error('--timeout-ms must be a positive integer.')
      result.timeoutMs = timeout
    } else if (argument === '--output') result.output = path.resolve(value)
    else if (argument === '--summary') result.summary = path.resolve(value)
    else throw new Error(`Unknown argument: ${argument}`)
    index += 1
  }
  return result
}
