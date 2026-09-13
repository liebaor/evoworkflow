import {mkdtemp, rm, writeFile, mkdir} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import path from 'node:path'

import {analyzeRepositoryConsistency} from '../src/repository/consistency.js'
import {classifyChange, detectPrematureAbstraction} from '../src/repository/classification.js'
import {buildWorkingContext} from '../src/repository/working-context.js'
import {buildRecoveryReport} from '../src/repository/recovery.js'
import {formatBugInvestigation, formatRequirementDelta, recordRequirementDelta, type BugInvestigationInput, type RequirementDeltaInput} from '../src/repository/workflow-documents.js'
import {applyInitialization, planInitialization} from '../src/repository/init.js'
import {writeYaml} from '../src/repository/io.js'
import {repositoryPaths} from '../src/repository/paths.js'
import {scanRepository} from '../src/repository/scanner.js'

const deltaInput: RequirementDeltaInput = {
  old: 'stock <= threshold',
  new: 'stock < threshold',
  retain: ['Authentication'],
  modify: ['Threshold rule'],
  remove: [],
  add: ['Boundary regression'],
  impact: {
    acceptance: 'Update AC-02.',
    decisions: 'None.',
    planAndSlices: 'Replan the affected Slice.',
    codeAndTests: 'Update predicate and test.',
    documentation: 'Update rule docs.',
    dataApiCompatibility: 'No breaking change.',
  },
}

const bugInput: BugInvestigationInput = {
  observedBehavior: 'Store A saw Store B data.',
  reproductionAndFailingEvidence: 'The scoped request test failed.',
  expectedBehavior: 'Store A sees only its own data.',
  rootCause: 'DataScope was bypassed.',
  existingRuleOrMechanismToReuse: 'Reuse DataScope.',
  fixBoundary: 'Change the query path and regression test.',
  regressionEvidence: 'The same test passes after the fix.',
  realEntryPathStatus: 'UNVERIFIED',
  knowledgePromotion: 'Keep the regression test.',
}

const root = await mkdtemp(path.join(tmpdir(), 'evoworkflow-phase2-evals-'))
const results: string[] = []

try {
  await writeFiles(root, {
    'README.md': '# RuoYi-like Brownfield fixture\n',
    'src/controllers/UserController.java': '@PreAuthorize("user:read") class UserController { AjaxResult list() { return AjaxResult.success(); } }\n',
    'src/controllers/RoleController.java': '@PreAuthorize("role:read") class RoleController { AjaxResult list() { return AjaxResult.success(); } }\n',
    'src/services/UserService.java': '@DataScope class UserService {}\n',
    'tests/UserControllerTest.java': 'class UserControllerTest {}\n',
  })
  await assertEval('E001', async () => {
    const reused = await analyzeRepositoryConsistency(root, {proposedText: 'class InventoryController { AjaxResult list() {} }'})
    const drifted = await analyzeRepositoryConsistency(root, {proposedText: 'class InventoryController { ApiResponse<?> list() {} }'})
    ensure(!reused.findings.some((item) => item.code === 'CONSISTENCY_DRIFT'), 'AjaxResult reuse was flagged')
    ensure(drifted.findings.some((item) => item.code === 'CONSISTENCY_DRIFT'), 'ApiResponse drift was not detected')
  })
  await assertEval('E002', async () => {
    const report = await analyzeRepositoryConsistency(root, {proposedText: 'PermissionMiddleware permission;'})
    ensure(report.findings.some((item) => item.code === 'PARALLEL_MECHANISM'), 'parallel permission mechanism was not detected')
  })
  await assertEval('E003', async () => {
    const report = await analyzeRepositoryConsistency(root, {proposedNames: ['InventoryController']})
    const drift = await analyzeRepositoryConsistency(root, {proposedNames: ['InventoryHttpHandler']})
    ensure(!report.findings.some((item) => item.code === 'NAMING_DRIFT'), 'Controller naming was flagged')
    ensure(drift.findings.some((item) => item.code === 'NAMING_DRIFT'), 'naming drift was not detected')
  })
  await prepareManagedChange(root)
  await assertEval('E004', async () => {
    const context = await buildWorkingContext(root, 'inventory-change', {includeGit: false})
    ensure(context.references.some((item) => item.path.endsWith('UserController.java')), 'nearest Controller reference was not routed')
  })
  await assertEval('E005', async () => {
    const report = await analyzeRepositoryConsistency(root, {proposedText: '@PreAuthorize("inventory:read") class InventoryController { AjaxResult list() {} }'})
    ensure(!report.findings.some((item) => item.code === 'PARALLEL_MECHANISM' || item.code === 'CONSISTENCY_DRIFT'), 'existing mechanisms were not reused')
  })
  await assertEval('E006', async () => {
    const source = formatRequirementDelta(deltaInput)
    ensure(source.includes('stock <= threshold') && source.includes('stock < threshold'), 'OLD and NEW were not preserved')
    ensure(source.includes('## Impact / 影响'), 'Delta impact was not recorded')
    await recordRequirementDelta(root, 'inventory-change', deltaInput, new Date('2026-01-01T00:00:00.000Z'))
  })
  await assertEval('E007', async () => {
    const source = formatBugInvestigation(bugInput)
    ensure(source.includes('Reproduction and failing evidence') && source.includes('Root cause'), 'Bug reproduction or root cause was not recorded')
    ensure(source.includes('Regression evidence') && source.includes('Knowledge promotion'), 'Bug regression or learning was not recorded')
  })
  await assertEval('E008', async () => {
    const report = await buildRecoveryReport(root)
    ensure(report.activeChange === 'inventory-change', 'Recovery did not find the active Change')
    ensure(report.currentObjective?.includes('Add inventory CRUD') === true, 'Recovery did not reconstruct the objective')
    ensure(report.blocked.some((item) => item.includes('NEEDS_INFO')), 'Recovery did not preserve the human review boundary')
  })
  await assertEval('E009', async () => {
    const classification = classifyChange({request: '把按钮“提交”改成“确认提交”'})
    ensure(classification.weight === 'SMALL' && classification.process === 'SHORT', 'copy change did not use the short path')
  })
  await assertEval('E010', async () => {
    const finding = detectPrematureAbstraction('增加一个库存判断', 'class PolicyFactory {}')
    ensure(finding.detected, 'premature abstraction was not detected')
  })
  await assertEval('E012', async () => {
    const report = await analyzeRepositoryConsistency(root, {
      expectedAreas: ['inventory'],
      changedPaths: ['inventory/InventoryController.java', 'auth/AuthService.java'],
    })
    ensure(report.findings.some((item) => item.code === 'BLAST_RADIUS_EXPANDED'), 'blast-radius expansion was not reported')
  })
  await assertEval('E011', async () => {
    const crossRoot = await mkdtemp(path.join(tmpdir(), 'evoworkflow-fastapi-pro-fixture-'))
    try {
      await writeFiles(crossRoot, {
        'pyproject.toml': '[project]\nname = "orders"\ndependencies = ["fastapi==0.115.0"]\n',
        'app/main.py': 'from fastapi import FastAPI\nfrom fastapi.responses import JSONResponse\napp = FastAPI()\n',
        'app/routers/orders.py': 'from fastapi import APIRouter\nrouter = APIRouter()\n',
        'frontend/package.json': JSON.stringify({dependencies: {react: '19.0.0', antd: '5.0.0', '@ant-design/pro-components': '2.0.0'}, scripts: {dev: 'vite', build: 'vite build'}}),
        'frontend/package-lock.json': '{}\n',
        'frontend/src/pages/orders/index.tsx': 'export default function Orders() { return null }\n',
      })
      const discovery = await scanRepository(crossRoot)
      ensure(discovery.frameworks.some((item) => item.name === 'FastAPI'), 'FastAPI was not identified')
      ensure(discovery.frameworks.some((item) => item.name === 'Ant Design Pro'), 'Ant Design Pro was not identified')
      ensure(!discovery.technologies.some((item) => item.name === 'RuoYi'), 'RuoYi leaked into cross-framework technology facts')
      const consistency = await analyzeRepositoryConsistency(crossRoot, {proposedText: 'return JSONResponse({"ok": true})'})
      ensure(!consistency.observations.some((item) => item.mechanism === 'AjaxResult' || item.mechanism === '@PreAuthorize'), 'RuoYi mechanism leaked into FastAPI observations')
      ensure(consistency.findings.length === 0, 'FastAPI response was incorrectly treated as RuoYi drift')
    } finally {
      await rm(crossRoot, {recursive: true, force: true})
    }
  })
} finally {
  await rm(root, {recursive: true, force: true})
}

process.stdout.write(`${results.join('\n')}\nPhase 2 core evals passed.\n`)

async function prepareManagedChange(rootPath: string): Promise<void> {
  await applyInitialization(await planInitialization(rootPath))
  const paths = repositoryPaths(rootPath)
  const changeRoot = path.join(paths.activeWork, 'inventory-change')
  await mkdir(changeRoot, {recursive: true})
  await writeFile(path.join(changeRoot, 'change.md'), '---\nid: inventory-change\nweight: STANDARD\nstatus: DRAFT\napproval: null\n---\n\n# Add inventory CRUD\n\nFind the nearest existing controller reference.\n', 'utf8')
  await writeFile(path.join(changeRoot, 'plan.md'), '---\nchange: inventory-change\nstatus: DRAFT\napproval: null\n---\n\n# Plan\n', 'utf8')
  await writeFile(path.join(changeRoot, 'evidence.md'), '# Evidence\n', 'utf8')
  const state = {
    schemaVersion: 1,
    projectMode: 'BROWNFIELD',
    phase: 'GRILL',
    status: 'DRAFT',
    activeChange: 'inventory-change',
    activeGoal: null,
    currentSlice: null,
    slices: [],
    initializedAt: new Date('2026-01-01T00:00:00.000Z').toISOString(),
    updatedAt: new Date('2026-01-01T00:00:00.000Z').toISOString(),
  }
  await writeYaml(paths.state, state)
}

async function writeFiles(rootPath: string, files: Readonly<Record<string, string>>): Promise<void> {
  for (const [relative, source] of Object.entries(files)) {
    const target = path.join(rootPath, relative)
    await mkdir(path.dirname(target), {recursive: true})
    await writeFile(target, source, 'utf8')
  }
}

async function assertEval(id: string, action: () => Promise<void>): Promise<void> {
  try {
    await action()
    results.push(`PASS ${id}`)
  } catch (error) {
    throw new Error(`${id} failed: ${error instanceof Error ? error.message : String(error)}`)
  }
}

function ensure(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(message)
}
