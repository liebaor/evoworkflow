import {execFile as execFileCallback} from 'node:child_process'
import {createHash} from 'node:crypto'
import {mkdtemp, mkdir, readFile, readdir, rm, writeFile} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {promisify} from 'node:util'

import {ProcessAgentAdapter} from '../src/agents/process-adapter.js'
import {ConfigSchema, DEFAULT_STOP_CONDITIONS, GoalSchema, StateSchema, type AgentAdapterConfig, type AgentRunResult, type Goal, type GoalAttempt, type GoalSlice, type VerificationRun} from '../src/core/schemas.js'
import {approveArtifact} from '../src/repository/artifacts.js'
import {resolveEngineeringConstraints} from '../src/repository/constraints.js'
import {buildRecoveryReport} from '../src/repository/recovery.js'
import {buildWorkingContext} from '../src/repository/working-context.js'
import {applyInitialization, planInitialization} from '../src/repository/init.js'
import {createGoal, approveActiveGoal} from '../src/repository/goals.js'
import {runStoredGoal} from '../src/repository/goal-execution.js'
import {pathExists, readYaml, writeYaml} from '../src/repository/io.js'
import {repositoryPaths} from '../src/repository/paths.js'
import {evaluateExecutionPreflight} from '../src/validation/gates.js'

const execFile = promisify(execFileCallback)
const cleanupRoots: string[] = []
const options = parseArguments(process.argv.slice(2))
const changeId = 'phase3-behavioral'

interface SourceRequirement {
  readonly path: string
  readonly tokens: readonly string[]
}

interface VerifierSpec {
  readonly artifactTokens: readonly string[]
  readonly references: readonly string[]
  readonly sourceRequirements: readonly SourceRequirement[]
  readonly forbidden?: readonly string[]
}

interface ScenarioReport {
  readonly id: string
  readonly session: 'goal-slice' | 'fresh-agent'
  readonly objective: string
  readonly acceptance: readonly string[]
  readonly agent: AgentRunResult
  readonly verification: readonly VerificationRun[]
}

interface BehavioralReport {
  readonly schemaVersion: 1
  readonly status: 'BEHAVIORAL_PASS'
  readonly evaluator: string
  readonly target: {
    readonly backendRoot: string
    readonly backendRevision: string
    readonly frontendRoot: string
    readonly frontendRevision: string
    readonly cleanTemporaryCopy: string
  }
  readonly approvalBoundary: string
  readonly scenarios: readonly ScenarioReport[]
  readonly recovery: {
    readonly cliExitCode: number
    readonly cliOutput: string
    readonly objective: string | null
    readonly completedSlices: readonly string[]
    readonly currentPhase: string
    readonly status: string
    readonly recommendedNextAction: string
  }
  readonly sourceIntegrity: {
    readonly changedOutsideEvo: readonly string[]
    readonly status: 'PASS'
  }
  readonly limitations: readonly string[]
}

interface FastApiReport {
  readonly id: 'fastapi-positive-consistency'
  readonly repository: string
  readonly agent: AgentRunResult
  readonly verification: VerificationRun
  readonly sourceIntegrity: 'PASS' | 'FAIL'
}

interface EvaluatorOutput {
  readonly behavioral: BehavioralReport
  readonly crossFramework: FastApiReport
}

try {
  const output = await runEvaluation()
  if (options.output) await writeFile(options.output, JSON.stringify(output, null, 2) + '\n', 'utf8')
  process.stdout.write(formatOutput(output))
} catch (error) {
  process.stderr.write('FAIL Phase 3 real-Agent behavioral evaluation: ' + (error instanceof Error ? error.message : String(error)) + '\n')
  process.exitCode = 1
} finally {
  await Promise.all(cleanupRoots.map((root) => rm(root, {recursive: true, force: true})))
}

async function runEvaluation(): Promise<EvaluatorOutput> {
  const backendRoot = required(options.backendRoot, '--backend-root')
  const backendRevision = requiredRevision(options.backendRevision, '--backend-revision')
  const frontendRoot = required(options.frontendRoot, '--frontend-root')
  const frontendRevision = requiredRevision(options.frontendRevision, '--frontend-revision')
  await assertRevision(backendRoot, backendRevision, 'RuoYi backend')
  await assertRevision(frontendRoot, frontendRevision, 'RuoYi frontend')

  const combined = await prepareCombinedRuoYi(backendRoot, backendRevision, frontendRoot, frontendRevision)
  await applyInitialization(await planInitialization(combined.root))
  await seedBehavioralChange(combined.root)
  const before = await manifestOutsideEvo(combined.root)
  await configureCodex(combined.root)
  await resolveEngineeringConstraints(combined.root, changeId, {persist: true})

  const goalSlices = behavioralSlices().filter((slice) => slice.id !== 'C')
  await createGoal(combined.root, 'phase3-baseline', {
    title: 'Real RuoYi behavioral baseline',
    changeId,
    adapter: 'codex',
    maxAttempts: 1,
    failureBudget: 4,
    slices: goalSlices,
  })
  await approveActiveGoal(combined.root, 'phase3-baseline')
  const completedGoal = await runStoredGoal(combined.root, 'phase3-baseline')
  const scenarios = goalSlices.map((slice) => scenarioFromGoal(completedGoal, slice.id))

  const recoveryCli = await runRecoverCli(combined.root)
  const recovery = await buildRecoveryReport(combined.root)
  if (recoveryCli.exitCode !== 0) throw new Error('evo recover failed after the first Agent session: ' + recoveryCli.output)
  if (recovery.completedSlices.length !== 4) throw new Error('evo recover did not reconstruct A/B/DELTA/BUG: ' + recovery.completedSlices.join(', '))

  const fresh = await runFreshRuoYiFeatureC(combined.root)
  scenarios.push(fresh)
  const after = await manifestOutsideEvo(combined.root)
  const changedOutsideEvo = compareManifests(before, after)
  if (changedOutsideEvo.length > 0) throw new Error('Real Agent changed product/source paths outside .evo: ' + changedOutsideEvo.join(', '))
  if (completedGoal.status !== 'READY_FOR_REVIEW') throw new Error('Bounded real-Agent Goal did not stop at READY_FOR_REVIEW: ' + completedGoal.status)
  if (scenarios.some((scenario) => scenario.agent.status !== 'COMPLETED' || scenario.verification.some((run) => run.status !== 'PASS'))) {
    throw new Error('At least one RuoYi scenario lacked independently verified observable evidence.')
  }

  const behavioral: BehavioralReport = {
    schemaVersion: 1,
    status: 'BEHAVIORAL_PASS',
    evaluator: 'scripts/phase3-ruoyi-behavioral.ts',
    target: {
      backendRoot,
      backendRevision,
      frontendRoot,
      frontendRevision,
      cleanTemporaryCopy: 'removed after evaluation',
    },
    approvalBoundary: 'The temporary Change uses an evaluator-only harness approval. It is not product acceptance, human review, Finish, commit, or push.',
    scenarios,
    recovery: {
      cliExitCode: recoveryCli.exitCode,
      cliOutput: recoveryCli.output,
      objective: recovery.currentObjective,
      completedSlices: recovery.completedSlices,
      currentPhase: recovery.currentPhase,
      status: recovery.status,
      recommendedNextAction: recovery.recommendedNextAction,
    },
    sourceIntegrity: {changedOutsideEvo: [], status: 'PASS'},
    limitations: [
      'The Agent writes evaluator-owned .evo/behavioral reports; this baseline does not implement a RuoYi product feature.',
      'Runtime, MySQL, Redis, and browser evidence are separate from this Agent behavior result.',
      'A real Agent result is a behavioral observation, not independent human acceptance.',
    ],
  }
  const crossFramework = await runFastApiPositiveConsistency()
  return {behavioral, crossFramework}
}

async function runFreshRuoYiFeatureC(root: string): Promise<ScenarioReport> {
  const context = await buildWorkingContext(root, changeId, {includeGit: true})
  const constraints = await resolveEngineeringConstraints(root, changeId, {workingContext: context, persist: true})
  const preflight = await evaluateExecutionPreflight(root, changeId)
  const slice = behavioralSlices().find((item) => item.id === 'C')
  if (!slice) throw new Error('Fresh Feature C definition is missing.')
  const goal = syntheticGoal(root, 'fresh-feature-c', 'Fresh Session Feature C', slice)
  const agent = await new ProcessAgentAdapter(await configuredAdapter(root)).run({
    repository: root,
    goal,
    slice,
    attempt: 1,
    invocationId: 'phase3-baseline/fresh-session/C',
    workingContext: context,
    constraints: constraints.constraints,
    preflight,
  })
  const verification = await independentVerification(root, verifierFor('feature-c', {
    artifactTokens: ['## References', '## Naming', '## API', '## Response', '## Permission', '## DataScope', '## Service/Mapper', '## Logging', '## Frontend', '## Domain Vocabulary', '## Testing', 'Feature A', 'Feature B'],
    references: [
      'ruoyi-admin/src/main/java/com/ruoyi/web/controller/system/SysUserController.java',
      'ruoyi-system/src/main/java/com/ruoyi/system/service/ISysUserService.java',
      'ruoyi-system/src/main/resources/mapper/system/SysUserMapper.xml',
      'ruoyi-ui/src/api/system/user.js',
      'ruoyi-ui/src/views/system/user/index.vue',
    ],
    sourceRequirements: [
      {path: 'ruoyi-admin/src/main/java/com/ruoyi/web/controller/system/SysUserController.java', tokens: ['@PreAuthorize', 'TableDataInfo', 'startPage']},
      {path: 'ruoyi-system/src/main/java/com/ruoyi/system/service/ISysUserService.java', tokens: ['selectUserList']},
      {path: 'ruoyi-system/src/main/resources/mapper/system/SysUserMapper.xml', tokens: ['selectUserList']},
      {path: 'ruoyi-ui/src/api/system/user.js', tokens: ['/system/user/list']},
      {path: 'ruoyi-ui/src/views/system/user/index.vue', tokens: ['getList', 'el-table']},
    ],
  }))
  return {id: 'feature-c', session: 'fresh-agent', objective: slice.objective, acceptance: slice.acceptance, agent, verification: [verification]}
}

async function runFastApiPositiveConsistency(): Promise<FastApiReport> {
  const root = await mkdtemp(path.join(tmpdir(), 'evoworkflow-phase3-fastapi-agent-'))
  cleanupRoots.push(root)
  await writeFiles(root, {
    'README.md': '# Orders API\n\nA FastAPI and React/Ant Design Pro brownfield fixture.\n',
    'pyproject.toml': '[project]\nname = \"orders\"\nversion = \"1.0.0\"\ndependencies = [\"fastapi==0.115.0\", \"pydantic==2.10.0\"]\nrequires-python = \">=3.11\"\n',
    'app/main.py': 'from fastapi import FastAPI\nfrom fastapi.responses import JSONResponse\nfrom app.routers.orders import router\napp = FastAPI()\napp.include_router(router, prefix=\"/orders\")\n',
    'app/routers/orders.py': 'from fastapi import APIRouter\nfrom app.schemas import OrderRead\nfrom app.services.orders import list_orders\nrouter = APIRouter()\n@router.get(\"\", response_model=list[OrderRead])\ndef get_orders():\n    return list_orders()\n',
    'app/schemas.py': 'from pydantic import BaseModel\nclass OrderRead(BaseModel):\n    id: int\n    status: str\n',
    'app/services/orders.py': 'def list_orders():\n    return []\n',
    'tests/test_orders.py': 'def test_orders_contract():\n    assert True\n',
    'frontend/package.json': JSON.stringify({name: 'orders-ui', version: '1.0.0', dependencies: {react: '19.0.0', antd: '5.0.0', '@ant-design/pro-components': '2.0.0'}, scripts: {test: 'vitest'}}),
    'frontend/src/pages/orders/index.tsx': 'import { ProTable } from \"@ant-design/pro-components\"\nexport default function Orders() { return <ProTable rowKey=\"id\" /> }\n',
  })
  await applyInitialization(await planInitialization(root))
  await configureCodex(root)
  const before = await manifestOutsideEvo(root)
  const slice: GoalSlice = {
    id: 'FASTAPI',
    objective: 'Inspect this FastAPI and React/Ant Design Pro repository as a fresh positive-consistency scenario. Do not modify application or frontend source. Write .evo/behavioral/fastapi.md with exact headings ## References, ## Router, ## Schema, ## Service, ## Response, ## Frontend, and ## Testing; cite existing paths and explain why a new Orders capability must follow APIRouter, Pydantic, JSONResponse or response-model, service, and ProTable patterns instead of RuoYi mechanisms.',
    acceptance: ['The report cites the real FastAPI and React/Ant Design Pro source patterns.', 'The report contains no RuoYi-only mechanism and product sources remain unchanged.'],
    dependsOn: [],
    verify: [],
    status: 'PENDING',
    attempts: [],
    blockReason: null,
    stopCondition: null,
  }
  const goal = syntheticGoalFor(root, 'fastapi-positive', 'FastAPI positive consistency', slice)
  const context = await buildWorkingContext(root, undefined, {includeGit: false})
  const agent = await new ProcessAgentAdapter(await configuredAdapter(root)).run({repository: root, goal, slice, attempt: 1, invocationId: 'phase3-baseline/fastapi-positive', workingContext: context})
  const verification = await independentVerification(root, verifierFor('fastapi', {
    artifactTokens: ['## References', '## Router', '## Schema', '## Service', '## Response', '## Frontend', '## Testing', 'APIRouter', 'Pydantic', 'JSONResponse', 'ProTable'],
    references: ['app/routers/orders.py', 'app/schemas.py', 'app/services/orders.py', 'app/main.py', 'frontend/src/pages/orders/index.tsx'],
    sourceRequirements: [
      {path: 'app/routers/orders.py', tokens: ['APIRouter', 'response_model']},
      {path: 'app/schemas.py', tokens: ['BaseModel']},
      {path: 'app/services/orders.py', tokens: ['def list_orders']},
      {path: 'app/main.py', tokens: ['FastAPI', 'JSONResponse']},
      {path: 'frontend/src/pages/orders/index.tsx', tokens: ['ProTable']},
    ],
    forbidden: ['AjaxResult', '@PreAuthorize', '@DataScope', 'SysUserController', 'DataScope'],
  }))
  const after = await manifestOutsideEvo(root)
  const sourceIntegrity = compareManifests(before, after).length === 0 ? 'PASS' as const : 'FAIL' as const
  return {id: 'fastapi-positive-consistency', repository: 'temporary FastAPI + React/Ant Design Pro fixture', agent, verification, sourceIntegrity}
}

function behavioralSlices(): GoalSlice[] {
  const common = {dependsOn: [] as string[], status: 'PENDING' as const, attempts: [], blockReason: null, stopCondition: null}
  return [
    {
      ...common,
      id: 'A',
      objective: 'Field evaluation Feature A. Inspect the fixed RuoYi backend and embedded Vue frontend. Do not modify application source, dependency files, database, or authority documents. Write .evo/behavioral/feature-a.md with exact headings ## References, ## Naming, ## API, ## Response, ## Permission, ## DataScope, ## Service/Mapper, ## Logging, ## Frontend, ## Domain Vocabulary, and ## Testing; cite paths that exist in this repository and describe how a typical CRUD capability should continue the observed RuoYi pattern.',
      acceptance: ['The artifact cites the real RuoYi controller, service, mapper/XML, and frontend paths.', 'The artifact records naming, API, response, permission, data-scope, logging, frontend, domain, and testing observations.'],
      verify: [{label: 'independent Feature A evidence verifier', command: process.execPath, args: ['-e', verifierFor('feature-a', featureARequirements())], timeoutMs: 120_000}],
    },
    {
      ...common,
      id: 'B',
      dependsOn: ['A'],
      objective: 'Field evaluation Feature B. Read the persisted Feature A report and the real RuoYi repository. Do not modify application source. Write .evo/behavioral/feature-b.md with exact headings ## References, ## Naming, ## API, ## Response, ## Permission, ## DataScope, ## Pagination, ## Export, ## Service/Mapper, ## Logging, ## Frontend, ## Domain Vocabulary, and ## Testing; compare an Inventory Alert capability with the existing permission, data-scope, pagination, response, export, service/mapper, logging, and frontend API/page mechanisms.',
      acceptance: ['Feature B cites existing RuoYi permission, data-scope, pagination, response, export, service/mapper, logging, and frontend evidence.', 'Feature B explicitly reuses Feature A repository references rather than inventing a parallel mechanism.'],
      verify: [{label: 'independent Feature B evidence verifier', command: process.execPath, args: ['-e', verifierFor('feature-b', featureBRequirements())], timeoutMs: 120_000}],
    },
    {
      ...common,
      id: 'DELTA',
      dependsOn: ['B'],
      objective: 'Field evaluation Requirement Delta. Read Feature A and Feature B reports, then write .evo/behavioral/delta.md without modifying approved Change or Plan. Use exact headings ## Old, ## New, ## Retain, ## Modify, ## Remove, ## Add, and ## Impact; change the Inventory threshold from inclusive to exclusive and explicitly cover acceptance, Decisions, Plan/Slices, code/tests, documentation, and API/data compatibility.',
      acceptance: ['The Delta artifact preserves old/new, retain/modify/remove/add, and all impact dimensions.', 'The Delta artifact identifies the affected Inventory boundary without silently editing the approved product contract.'],
      verify: [{label: 'independent Requirement Delta verifier', command: process.execPath, args: ['-e', verifierFor('delta', {artifactTokens: ['## Old', '## New', '## Retain', '## Modify', '## Remove', '## Add', '## Impact', 'inclusive', 'exclusive', 'acceptance', 'Decisions', 'Plan', 'code', 'tests', 'documentation', 'compatibility'], references: ['.evo/behavioral/feature-a.md', '.evo/behavioral/feature-b.md'], sourceRequirements: []})], timeoutMs: 120_000}],
    },
    {
      ...common,
      id: 'BUG',
      dependsOn: ['DELTA'],
      objective: 'Field evaluation Bug/regression. Read the persisted RuoYi reports and write .evo/behavioral/bug.md without changing product source. Use exact headings ## Observed behavior, ## Reproduction and failing evidence, ## Expected behavior, ## Root cause, ## Existing rule or mechanism to reuse, ## Fix boundary, ## Regression evidence, ## Real-entry-path status, and ## Knowledge promotion; investigate a tenant data-scope leak, include a concrete failing reproduction, root cause, bounded fix, regression, and keep the real entry path explicitly UNVERIFIED unless independently run.',
      acceptance: ['The Bug artifact contains reproduction, failing evidence, expected behavior, root cause, fix boundary, regression, and learning fields.', 'The real-entry-path status is not claimed as PASS by model prose alone.'],
      verify: [{label: 'independent Bug evidence verifier', command: process.execPath, args: ['-e', verifierFor('bug', {artifactTokens: ['## Observed behavior', '## Reproduction and failing evidence', '## Expected behavior', '## Root cause', '## Existing rule or mechanism to reuse', '## Fix boundary', '## Regression evidence', '## Real-entry-path status', '## Knowledge promotion', 'UNVERIFIED', 'failing', 'regression'], references: ['.evo/behavioral/feature-a.md', '.evo/behavioral/feature-b.md'], sourceRequirements: []})], timeoutMs: 120_000}],
    },
    {
      ...common,
      id: 'C',
      dependsOn: ['A', 'B'],
      objective: 'Fresh-session Feature C. This is a new Agent process after the prior bounded Goal exited and evo recover --json was run. Read the persisted recovery state and .evo/behavioral/feature-a.md, .evo/behavioral/feature-b.md, .evo/behavioral/delta.md, and .evo/behavioral/bug.md. Do not modify product source. Write .evo/behavioral/feature-c.md with exact headings ## References, ## Naming, ## API, ## Response, ## Permission, ## DataScope, ## Service/Mapper, ## Logging, ## Frontend, ## Domain Vocabulary, and ## Testing; propose a new Supplier Export review path that preserves the same RuoYi engineering language and cites shared paths from Feature A and B.',
      acceptance: ['Feature C is produced by a fresh Agent process and cites the persisted A/B evidence plus real RuoYi paths.', 'Feature C preserves the existing RuoYi engineering vocabulary and does not claim product acceptance.'],
      verify: [],
    },
  ]
}

function featureARequirements(): VerifierSpec {
  return {
    artifactTokens: ['## References', '## Naming', '## API', '## Response', '## Permission', '## DataScope', '## Service/Mapper', '## Logging', '## Frontend', '## Domain Vocabulary', '## Testing'],
    references: [
      'ruoyi-admin/src/main/java/com/ruoyi/web/controller/system/SysUserController.java',
      'ruoyi-system/src/main/java/com/ruoyi/system/service/ISysUserService.java',
      'ruoyi-system/src/main/java/com/ruoyi/system/mapper/SysUserMapper.java',
      'ruoyi-system/src/main/resources/mapper/system/SysUserMapper.xml',
      'ruoyi-ui/src/api/system/user.js',
      'ruoyi-ui/src/views/system/user/index.vue',
    ],
    sourceRequirements: [
      {path: 'ruoyi-admin/src/main/java/com/ruoyi/web/controller/system/SysUserController.java', tokens: ['@PreAuthorize', 'TableDataInfo', 'startPage']},
      {path: 'ruoyi-system/src/main/java/com/ruoyi/system/service/ISysUserService.java', tokens: ['selectUserList']},
      {path: 'ruoyi-system/src/main/java/com/ruoyi/system/mapper/SysUserMapper.java', tokens: ['selectUserList']},
      {path: 'ruoyi-system/src/main/resources/mapper/system/SysUserMapper.xml', tokens: ['selectUserList']},
      {path: 'ruoyi-ui/src/api/system/user.js', tokens: ['/system/user/list']},
      {path: 'ruoyi-ui/src/views/system/user/index.vue', tokens: ['getList', 'el-table']},
    ],
  }
}

function featureBRequirements(): VerifierSpec {
  return {
    artifactTokens: ['## References', '## Naming', '## API', '## Response', '## Permission', '## DataScope', '## Pagination', '## Export', '## Service/Mapper', '## Logging', '## Frontend', '## Domain Vocabulary', '## Testing', 'Feature A'],
    references: [
      'ruoyi-admin/src/main/java/com/ruoyi/web/controller/system/SysUserController.java',
      'ruoyi-common/src/main/java/com/ruoyi/common/annotation/DataScope.java',
      'ruoyi-system/src/main/java/com/ruoyi/system/service/impl/SysUserServiceImpl.java',
      'ruoyi-system/src/main/resources/mapper/system/SysUserMapper.xml',
      'ruoyi-ui/src/api/system/user.js',
      'ruoyi-ui/src/views/system/user/index.vue',
      '.evo/behavioral/feature-a.md',
    ],
    sourceRequirements: [
      {path: 'ruoyi-admin/src/main/java/com/ruoyi/web/controller/system/SysUserController.java', tokens: ['@PreAuthorize', 'TableDataInfo', 'startPage', 'ExcelUtil']},
      {path: 'ruoyi-common/src/main/java/com/ruoyi/common/annotation/DataScope.java', tokens: ['DataScope']},
      {path: 'ruoyi-system/src/main/java/com/ruoyi/system/service/impl/SysUserServiceImpl.java', tokens: ['@DataScope', 'selectUserList']},
      {path: 'ruoyi-system/src/main/resources/mapper/system/SysUserMapper.xml', tokens: ['selectUserList']},
      {path: 'ruoyi-ui/src/api/system/user.js', tokens: ['/system/user/list']},
    ],
  }
}

function verifierFor(id: string, spec: VerifierSpec): string {
  const artifact = '.evo/behavioral/' + id + '.md'
  return [
    "const fs = require('node:fs');",
    "const path = require('node:path');",
    'const root = process.cwd();',
    'const artifact = ' + JSON.stringify(artifact) + ';',
    'const spec = ' + JSON.stringify(spec) + ';',
    'const fail = (message, code = 1) => { console.error(message); process.exit(code); };',
    'const target = path.join(root, artifact);',
    'if (!fs.existsSync(target)) fail("Missing observable artifact: " + artifact);',
    'const report = fs.readFileSync(target, "utf8");',
    'for (const token of spec.artifactTokens) if (!report.includes(token)) fail("Artifact " + artifact + " is missing required evidence: " + token);',
    'for (const reference of spec.references) { if (!report.includes(reference)) fail("Artifact " + artifact + " did not cite " + reference); if (!fs.existsSync(path.join(root, reference))) fail("Cited repository evidence is absent: " + reference); }',
    'for (const requirement of spec.sourceRequirements) { const sourcePath = path.join(root, requirement.path); if (!fs.existsSync(sourcePath)) fail("Source evidence is absent: " + requirement.path); const source = fs.readFileSync(sourcePath, "utf8"); for (const token of requirement.tokens) if (!source.includes(token)) fail("Source " + requirement.path + " is missing observed token: " + token); }',
    'for (const forbidden of spec.forbidden || []) if (report.includes(forbidden)) fail("Cross-framework artifact leaked forbidden mechanism: " + forbidden);',
    'process.stdout.write(JSON.stringify({artifact, checkedReferences: spec.references.length, checkedSources: spec.sourceRequirements.length}));',
  ].join('\n')
}

async function independentVerification(root: string, script: string): Promise<VerificationRun> {
  const startedAt = new Date().toISOString()
  let exitCode: number | null = null
  let output = ''
  try {
    const result = await execFile(process.execPath, ['-e', script], {cwd: root, timeout: 120_000, maxBuffer: 2_000_000})
    exitCode = 0
    output = (String(result.stdout) + String(result.stderr)).trim()
  } catch (error) {
    const typed = error as {code?: number; stdout?: string; stderr?: string; message?: string}
    exitCode = typeof typed.code === 'number' ? typed.code : 1
    output = (String(typed.stdout || '') + String(typed.stderr || '') + String(typed.message || '')).trim()
  }
  return {
    label: 'independent behavioral verifier',
    command: process.execPath,
    args: ['-e', '[verifier script omitted from report; deterministic source checks are encoded by the evaluator]'],
    status: exitCode === 0 ? 'PASS' : 'FAIL',
    exitCode,
    output: output.length > 8_000 ? output.slice(-8_000) + '\n[output truncated]' : output,
    startedAt,
    endedAt: new Date().toISOString(),
  }
}

function scenarioFromGoal(goal: Goal, id: string): ScenarioReport {
  const slice = goal.slices.find((candidate) => candidate.id === id)
  if (!slice) throw new Error('Completed Goal is missing Slice ' + id + '.')
  const attempt: GoalAttempt | undefined = slice.attempts.at(-1)
  if (!attempt) {
    const blockers = goal.slices.map((candidate) => candidate.id + '=' + candidate.status + (candidate.blockReason ? ': ' + candidate.blockReason : '')).join('; ')
    throw new Error('Completed Goal Slice ' + id + ' has no persisted attempt; prior Slice checkpoints: ' + blockers)
  }
  const scenarioId = id === 'A' ? 'feature-a' : id === 'B' ? 'feature-b' : id === 'DELTA' ? 'requirement-delta' : 'bug'
  return {id: scenarioId, session: 'goal-slice', objective: slice.objective, acceptance: slice.acceptance, agent: attempt.agent, verification: attempt.verification}
}

async function seedBehavioralChange(root: string): Promise<void> {
  const paths = repositoryPaths(root)
  const changeRoot = path.join(paths.activeWork, changeId)
  await mkdir(changeRoot, {recursive: true})
  await writeFile(path.join(changeRoot, 'change.md'), [
    '---',
    'id: ' + changeId,
    'weight: LARGE',
    'status: AWAITING_APPROVAL',
    'approval: null',
    '---',
    '',
    '# Engineering behavioral baseline',
    '',
    '## Acceptance',
    '',
    '- AC-A: Feature A report cites real RuoYi controller, service, mapper/XML, and frontend evidence.',
    '- AC-B: Feature B report preserves RuoYi permission, data-scope, pagination, response, export, logging, service/mapper, and frontend mechanisms.',
    '- AC-D: Requirement Delta records the changed business boundary and impact.',
    '- AC-BUG: Bug investigation records reproduction, failing evidence, root cause, fix boundary, regression, and real entry status.',
    '',
  ].join('\n'), 'utf8')
  await writeFile(path.join(changeRoot, 'plan.md'), [
    '---',
    'change: ' + changeId,
    'status: AWAITING_APPROVAL',
    'approval: null',
    '---',
    '',
    '# Plan',
    '',
    '### A — Feature A CRUD pattern baseline',
    '',
    '### B — Feature B permission and export pattern baseline',
    '',
    '### DELTA — Requirement Delta boundary',
    '',
    '### BUG — Bug and regression boundary',
    '',
  ].join('\n'), 'utf8')
  await writeFile(path.join(changeRoot, 'evidence.md'), '# Evidence\n\nThis isolated harness records behavioral artifacts separately from product acceptance.\n', 'utf8')
  const current = await readYaml(paths.state, StateSchema)
  await writeYaml(paths.state, {...current, activeChange: changeId, activeGoal: null, currentSlice: null, slices: [], phase: 'PLAN', status: 'AWAITING_APPROVAL', updatedAt: new Date().toISOString()})
  const now = new Date()
  await approveArtifact(root, changeId, 'change', 'phase3 behavioral evaluator (isolated harness approval)', now)
  await approveArtifact(root, changeId, 'plan', 'phase3 behavioral evaluator (isolated harness approval)', now)
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
  if (!adapter) throw new Error('Temporary evaluator did not configure codex adapter.')
  return adapter
}

function syntheticGoal(root: string, id: string, title: string, slice: GoalSlice): Goal {
  return syntheticGoalFor(root, id, title, slice)
}

function syntheticGoalFor(root: string, id: string, title: string, slice: GoalSlice): Goal {
  return GoalSchema.parse({
    schemaVersion: 1,
    id,
    title,
    changeId,
    repository: root,
    adapter: 'codex',
    maxAttempts: 1,
    failureBudget: 1,
    failuresUsed: 0,
    status: 'APPROVED',
    stopConditions: DEFAULT_STOP_CONDITIONS,
    slices: [slice],
    approval: null,
    runEpoch: 0,
    resumes: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  })
}

async function prepareCombinedRuoYi(backendRoot: string, backendRevision: string, frontendRoot: string, frontendRevision: string): Promise<{readonly root: string}> {
  const parent = await mkdtemp(path.join(tmpdir(), 'evoworkflow-phase3-ruoyi-agent-'))
  cleanupRoots.push(parent)
  const root = path.join(parent, 'checkout')
  await execFile('git', ['clone', '--no-local', '--quiet', backendRoot, root], {timeout: 120_000, maxBuffer: 2_000_000})
  await git(root, ['checkout', '--detach', backendRevision])
  const frontendArchive = path.join(parent, 'frontend.tar')
  await gitArchive(frontendRoot, frontendRevision, frontendArchive)
  await mkdir(path.join(root, 'ruoyi-ui'), {recursive: true})
  await execFile('tar', ['-xf', frontendArchive, '-C', path.join(root, 'ruoyi-ui')], {timeout: 120_000, maxBuffer: 1_000_000})
  await writeFiles(root, {
    'docs/architecture.md': '# Phase 3 evaluator architecture note\n\nThis file is evaluator scaffolding only. It records the fixed backend/frontend boundary for this isolated field run and is not a product Decision.\n',
    'docs/evaluation-runtime.xml': '<properties><mysql.version>9.7.0</mysql.version><redis.version>6.0.16</redis.version><spring-security.version>7.1.0</spring-security.version></properties>\n',
    '.github/workflows/phase3-evaluation.yml': 'name: phase3-evaluation\non: []\n',
  })
  const frontendPackagePath = path.join(root, 'ruoyi-ui', 'package.json')
  const frontendPackage = JSON.parse(await readFile(frontendPackagePath, 'utf8')) as {engines?: Record<string, string>}
  frontendPackage.engines = {...frontendPackage.engines, node: '>=22'}
  await writeFile(frontendPackagePath, JSON.stringify(frontendPackage, null, 2) + '\n', 'utf8')
  return {root}
}

async function gitArchive(sourceRoot: string, revision: string, target: string): Promise<void> {
  const repositoryRoot = (await git(sourceRoot, ['rev-parse', '--show-toplevel'])).trim()
  await execFile('git', ['archive', '--format=tar', '--output=' + target, revision], {cwd: repositoryRoot, timeout: 120_000, maxBuffer: 1_000_000})
}

async function assertRevision(root: string, revision: string, label: string): Promise<void> {
  const actual = (await git(root, ['rev-parse', '--verify', revision + '^{commit}'])).trim()
  if (actual !== revision) throw new Error(label + ' revision is not the requested exact commit: ' + actual)
}

async function runRecoverCli(root: string): Promise<{readonly exitCode: number; readonly output: string}> {
  const cli = path.resolve('dist/index.js')
  if (!(await pathExists(cli))) throw new Error('dist/index.js is missing; run pnpm run build before the behavioral evaluator.')
  try {
    const result = await execFile(process.execPath, [cli, 'recover', '--root', root, '--json'], {cwd: process.cwd(), timeout: 120_000, maxBuffer: 4_000_000})
    return {exitCode: 0, output: String(result.stdout).slice(-20_000)}
  } catch (error) {
    const typed = error as {code?: number; stdout?: string; stderr?: string; message?: string}
    return {exitCode: typeof typed.code === 'number' ? typed.code : 1, output: (String(typed.stdout || '') + String(typed.stderr || '') + String(typed.message || '')).slice(-20_000)}
  }
}

async function manifestOutsideEvo(root: string): Promise<Map<string, string>> {
  const result = new Map<string, string>()
  await visit(root, '')
  return result

  async function visit(directory: string, relativeDirectory: string): Promise<void> {
    for (const entry of await readdir(directory, {withFileTypes: true})) {
      if (entry.name === '.git' || entry.name === '.evo') continue
      const relative = relativeDirectory ? relativeDirectory + '/' + entry.name : entry.name
      const target = path.join(directory, entry.name)
      if (entry.isDirectory()) await visit(target, relative)
      else if (entry.isFile()) result.set(relative, createHash('sha256').update(await readFile(target)).digest('hex'))
    }
  }
}

function compareManifests(before: Map<string, string>, after: Map<string, string>): string[] {
  const paths = new Set([...before.keys(), ...after.keys()])
  return [...paths].filter((file) => before.get(file) !== after.get(file)).sort()
}

async function writeFiles(root: string, files: Readonly<Record<string, string>>): Promise<void> {
  for (const [relative, contents] of Object.entries(files)) {
    const target = path.join(root, relative)
    await mkdir(path.dirname(target), {recursive: true})
    await writeFile(target, contents, 'utf8')
  }
}

async function git(root: string, args: readonly string[]): Promise<string> {
  const result = await execFile('git', [...args], {cwd: root, timeout: 30_000, maxBuffer: 2_000_000})
  return String(result.stdout)
}

function formatOutput(output: EvaluatorOutput): string {
  return [
    'Behavioral result: ' + output.behavioral.status,
    'RuoYi scenarios: ' + output.behavioral.scenarios.map((scenario) => scenario.id + '=' + scenario.agent.status + '/' + scenario.verification.map((run) => run.status).join(',')).join(' '),
    'Recovery: ' + output.behavioral.recovery.currentPhase + '/' + output.behavioral.recovery.status + '; completed=' + output.behavioral.recovery.completedSlices.join(','),
    'Source integrity: ' + output.behavioral.sourceIntegrity.status,
    'Cross-framework result: ' + output.crossFramework.agent.status + '/' + output.crossFramework.verification.status + '; source=' + output.crossFramework.sourceIntegrity,
    'Real Agent behavioral evaluation completed; product acceptance and Finish remain human-controlled.',
  ].join('\n') + '\n'
}

function parseArguments(args: readonly string[]): {backendRoot: string | null; backendRevision: string | null; frontendRoot: string | null; frontendRevision: string | null; agent: string; timeoutMs: number; output: string | null} {
  const result = {backendRoot: null, backendRevision: null, frontendRoot: null, frontendRevision: null, agent: 'codex', timeoutMs: 900_000, output: null} as {backendRoot: string | null; backendRevision: string | null; frontendRoot: string | null; frontendRevision: string | null; agent: string; timeoutMs: number; output: string | null}
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index]
    if (!argument || argument === '--') continue
    const value = args[index + 1]
    if (!value || value.startsWith('--')) throw new Error('Missing value for ' + argument + '.')
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
    else throw new Error('Unknown argument: ' + argument)
    index += 1
  }
  return result
}

function required(value: string | null, option: string): string {
  if (!value) throw new Error(option + ' is required.')
  return value
}

function requiredRevision(value: string | null, option: string): string {
  if (!value) throw new Error(option + ' is required for reproducibility.')
  if (!/^[a-f0-9]{40}$/u.test(value)) throw new Error(option + ' must be a 40-character Git revision.')
  return value
}
