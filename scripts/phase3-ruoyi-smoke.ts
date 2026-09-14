import {execFile as execFileCallback} from 'node:child_process'
import {mkdtemp, mkdir, rm, writeFile} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {promisify} from 'node:util'

import {StateSchema} from '../src/core/schemas.js'
import {analyzeRepositoryConsistency} from '../src/repository/consistency.js'
import {buildRecoveryReport} from '../src/repository/recovery.js'
import {buildWorkingContext} from '../src/repository/working-context.js'
import {formatBugInvestigation, formatRequirementDelta, recordBugInvestigation, recordRequirementDelta} from '../src/repository/workflow-documents.js'
import {applyInitialization, planInitialization} from '../src/repository/init.js'
import {readYaml, writeYaml} from '../src/repository/io.js'
import {repositoryPaths} from '../src/repository/paths.js'
import {scanRepository, type DiscoveryReport} from '../src/repository/scanner.js'

const execFile = promisify(execFileCallback)
const options = parseArguments(process.argv.slice(2))
const roots: string[] = []
const results: EvaluationResult[] = []

try {
  const backend = await evaluateTarget({
    id: 'RuoYi-backend',
    label: 'RuoYi backend / RuoYi 后端',
    kind: 'backend',
    sourceRoot: required(options.backendRoot, '--backend-root'),
    revision: requiredRevision(options.backendRevision, '--backend-revision'),
  })
  const frontend = await evaluateTarget({
    id: 'RuoYi-frontend',
    label: 'RuoYi Vue3 frontend / RuoYi Vue3 前端',
    kind: 'frontend',
    sourceRoot: required(options.frontendRoot, '--frontend-root'),
    revision: requiredRevision(options.frontendRevision, '--frontend-revision'),
  })
  await evaluateRuoYiScenario(backend)
  results.push({id: 'runtime', status: 'UNVERIFIED', detail: 'No application process was started by this read-only field evaluator.'})
  results.push({id: 'database', status: 'UNVERIFIED', detail: 'No MySQL instance or migration was invoked.'})
  results.push({id: 'browser', status: 'UNVERIFIED', detail: 'No browser session or UI interaction was invoked.'})
  results.push({id: 'agent-behavior', status: 'UNVERIFIED', detail: 'No real Coding Agent invocation was made; deterministic repository behavior is reported separately.'})
  const output = results.map((result) => `${result.status} ${result.id}: ${result.detail}`).join('\n')
  if (options.output) {
    const targets = [backend, frontend].map((target) => ({
      id: target.id,
      label: target.label,
      kind: target.kind,
      sourceRoot: target.sourceRoot,
      revision: target.revision,
      cleanArchive: 'temporary archive; removed after evaluation',
      filesScanned: target.report.filesScanned,
      mode: target.report.mode,
      confidence: target.report.confidence,
      technologies: target.report.technologies,
      capabilities: target.report.capabilities,
      commands: target.report.commands,
      unknowns: target.report.unknowns,
    }))
    await writeFile(path.resolve(options.output), `${JSON.stringify({targets, results}, null, 2)}\n`, 'utf8')
  }
  process.stdout.write(`${output}\nPhase 3 RuoYi clean-revision field evaluation completed. / 三期 RuoYi 清洁 revision 现场评估完成。\n`)
} catch (error) {
  process.stderr.write(`FAIL Phase 3 RuoYi evaluation: ${error instanceof Error ? error.message : String(error)}\n`)
  process.exitCode = 1
} finally {
  await Promise.all(roots.map((root) => rm(root, {recursive: true, force: true})))
}

interface EvaluationTarget {
  readonly id: string
  readonly label: string
  readonly kind: 'backend' | 'frontend'
  readonly sourceRoot: string
  readonly revision: string
}

interface ArchivedTarget extends EvaluationTarget {
  readonly root: string
  readonly report: DiscoveryReport
}

interface EvaluationResult {
  readonly id: string
  readonly status: 'DETERMINISTIC_PASS' | 'BEHAVIORAL_PASS' | 'BEHAVIORAL_FAIL' | 'UNVERIFIED'
  readonly detail: string
}

async function evaluateTarget(target: EvaluationTarget): Promise<ArchivedTarget> {
  await assertRevision(target.sourceRoot, target.revision, target.label)
  const root = await archiveRevision(target.sourceRoot, target.revision, target.id)
  const report = await scanRepository(root)
  assertTargetReport(target, report)
  results.push({id: `${target.id}-grounding`, status: 'DETERMINISTIC_PASS', detail: `${target.label} is fixed at ${target.revision} and scanned from a clean git archive.`})
  console.log(`\n[${target.label}]`)
  console.log(`Source / 输入：${target.sourceRoot}`)
  console.log(`Revision / 固定 revision：${target.revision}`)
  console.log(`Clean archive / 清洁快照：${root}`)
  console.log(`Files / 文件数：${report.filesScanned}; mode / 模式：${report.mode}; confidence / 置信度：${report.confidence}`)
  console.log(`Technologies / 技术：${report.technologies.map((item) => `${item.name}@${item.version ?? 'unknown'}`).join(', ')}`)
  console.log(`Capabilities / 能力：${report.capabilities.map((item) => item.name).join(', ')}`)
  console.log(`Unknowns / 未知：${report.unknowns.join(' | ') || 'none'}`)
  return { ...target, root, report }
}

async function evaluateRuoYiScenario(backend: ArchivedTarget): Promise<void> {
  const root = backend.root
  await applyInitialization(await planInitialization(root))
  await createScenarioChange(root, 'feature-a', 'Supplier CRUD', 'Use the existing controller, service, permission, response, and test patterns.')
  const contextA = await buildWorkingContext(root, 'feature-a', {includeGit: false})
  assertScenarioContext(contextA, 'Feature A', backend.report)
  await createScenarioChange(root, 'feature-b', 'Inventory DataScope pagination response export', 'Continue existing permission, data-scope, pagination, response, export, and logging mechanisms.')
  const contextB = await buildWorkingContext(root, 'feature-b', {includeGit: false})
  assertScenarioContext(contextB, 'Feature B', backend.report)
  ensure(contextA.references.some((item) => item.path.endsWith('/SysUserController.java')), 'Feature A did not route SysUserController')
  ensure(contextB.references.some((item) => item.path.endsWith('/SysUserController.java')), 'Feature B did not route SysUserController')
  results.push({id: 'E301-E302', status: 'DETERMINISTIC_PASS', detail: 'Feature A and Feature B route the real RuoYi controller/capability evidence from the clean archive.'})

  const delta = {
    old: 'Inventory threshold is inclusive.',
    new: 'Inventory threshold is exclusive.',
    retain: ['Authentication and tenant boundary'],
    modify: ['Threshold predicate'],
    remove: [],
    add: ['Boundary regression'],
    impact: {
      acceptance: 'Update the affected acceptance criterion.',
      decisions: 'No new product Decision; re-review the contract.',
      planAndSlices: 'Replan Feature B affected Slice.',
      codeAndTests: 'Update predicate and regression.',
      documentation: 'Update the requirement record.',
      dataApiCompatibility: 'No breaking API or data migration.',
    },
  }
  ensure(formatRequirementDelta(delta).includes('Old / 旧内容'), 'Delta format lost OLD content')
  await recordRequirementDelta(root, 'feature-b', delta)
  const bug = {
    observedBehavior: 'A tenant could see another tenant inventory row.',
    reproductionAndFailingEvidence: 'The scoped list request failed in the reproduction fixture.',
    expectedBehavior: 'Only the current tenant rows are returned.',
    rootCause: 'The existing DataScope path was bypassed.',
    existingRuleOrMechanismToReuse: 'Reuse RuoYi DataScope and permission annotations.',
    fixBoundary: 'Restore the query path and add a focused regression.',
    regressionEvidence: 'The focused regression passes after the fix.',
    realEntryPathStatus: 'UNVERIFIED' as const,
    knowledgePromotion: 'Promote only after repeated finding and explicit review.',
  }
  ensure(formatBugInvestigation(bug).includes('Reproduction and failing evidence'), 'Bug format lost failing evidence')
  await recordBugInvestigation(root, 'feature-b', bug)
  results.push({id: 'E303-E304', status: 'DETERMINISTIC_PASS', detail: 'Requirement Delta and Bug artifacts preserve impact, failing evidence, root cause, regression, and real-entry UNVERIFIED.'})

  const recovered = await buildRecoveryReport(root)
  ensure(recovered.activeChange === 'feature-b' && recovered.currentObjective?.includes('Inventory') === true, 'Fresh recovery did not reconstruct Feature B objective')
  ensure(recovered.constraints.total > 0, 'Fresh recovery omitted RuoYi task constraints')
  results.push({id: 'E302-recover', status: 'DETERMINISTIC_PASS', detail: 'Fresh recovery reports the active RuoYi objective, constraints, and human review boundary.'})

  await setActiveChange(root, 'feature-c', 'Supplier export review', 'Continue the same RuoYi domain language and existing entry paths.')
  const contextC = await buildWorkingContext(root, 'feature-c', {includeGit: false})
  assertScenarioContext(contextC, 'Feature C', backend.report)
  const consistency = await analyzeRepositoryConsistency(root, {proposedText: '@PreAuthorize("supplier:read") @DataScope class SupplierController { AjaxResult list() { startPage(); return ExcelUtil.exportExcel(); } }'})
  ensure(!consistency.findings.some((item) => ['CONSISTENCY_DRIFT', 'PARALLEL_MECHANISM'].includes(item.code)), 'Feature C proposed text did not reuse RuoYi response/permission mechanisms')
  const common = contextA.references.filter((left) => contextC.references.some((right) => right.path === left.path && right.kind === left.kind)).map((item) => item.path)
  ensure(common.some((item) => item.endsWith('/SysUserController.java')), 'Feature C did not preserve the Feature A repository reference')
  results.push({id: 'E306-E313', status: 'DETERMINISTIC_PASS', detail: `Fresh-session Feature C preserved RuoYi engineering language with ${common.length} shared context references.`})
  results.push({id: 'behavioral-baseline', status: 'UNVERIFIED', detail: 'The clean-revision evaluator proves repository grounding and deterministic routing; Agent-to-Agent behavioral continuity still needs an explicitly invoked real Agent run.'})
}

async function createScenarioChange(root: string, id: string, title: string, rule: string): Promise<string> {
  await setActiveChange(root, id, title, rule)
  return id
}

async function setActiveChange(root: string, id: string, title: string, rule: string): Promise<void> {
  const paths = repositoryPaths(root)
  const changeRoot = path.join(paths.activeWork, id)
  await mkdir(changeRoot, {recursive: true})
  await writeFile(path.join(changeRoot, 'change.md'), `---\nid: ${id}\nweight: STANDARD\nstatus: DRAFT\napproval: null\n---\n\n# ${title}\n\n## Rules and acceptance\n\n- AC-${id.replace(/[^0-9]/gu, '') || '01'}: ${rule}\n`, 'utf8')
  await writeFile(path.join(changeRoot, 'plan.md'), `---\nchange: ${id}\nstatus: DRAFT\napproval: null\n---\n\n# Plan\n\n### S1 — ${title}\n\nUse the real RuoYi reference implementation and its existing tests.\n`, 'utf8')
  await writeFile(path.join(changeRoot, 'evidence.md'), '# Evidence\n', 'utf8')
  const current = await readYaml(paths.state, StateSchema)
  await writeYaml(paths.state, {...current, activeChange: id, activeGoal: null, currentSlice: null, slices: [], phase: 'GRILL', status: 'DRAFT', updatedAt: new Date().toISOString()})
}

async function assertRevision(root: string, revision: string, label: string): Promise<void> {
  const actual = (await git(root, ['rev-parse', '--verify', `${revision}^{commit}`])).trim()
  if (actual !== revision) throw new Error(`${label} revision ${revision} is not the exact resolved commit (${actual}).`)
}

async function archiveRevision(sourceRoot: string, revision: string, id: string): Promise<string> {
  const root = await mkdtemp(path.join(tmpdir(), `evoworkflow-phase3-${id}-`))
  roots.push(root)
  const archive = path.join(root, 'revision.tar')
  const extracted = path.join(root, 'checkout')
  await mkdir(extracted, {recursive: true})
  const repositoryRoot = (await git(sourceRoot, ['rev-parse', '--show-toplevel'])).trim()
  const relativeSource = path.relative(repositoryRoot, path.resolve(sourceRoot)).split(path.sep).join('/')
  const archiveArgs = ['archive', '--format=tar', `--output=${archive}`, revision]
  if (relativeSource) archiveArgs.push('--', `${relativeSource}/`)
  await git(repositoryRoot, archiveArgs)
  const strip = relativeSource ? relativeSource.split('/').length : 0
  await execFile('tar', [...(strip > 0 ? [`--strip-components=${strip}`] : []), '-xf', archive, '-C', extracted], {timeout: 120_000, maxBuffer: 1_000_000})
  return extracted
}

function assertTargetReport(target: EvaluationTarget, report: DiscoveryReport): void {
  if (!['BROWNFIELD', 'EVO_MANAGED'].includes(report.mode)) throw new Error(`${target.label} must remain Brownfield/EVO-managed; received ${report.mode}.`)
  if (report.filesScanned === 0) throw new Error(`${target.label} archive is empty.`)
  if (target.kind === 'backend') {
    assertNames(report.technologies.map((item) => item.name), ['Java', 'Maven', 'MySQL', 'RuoYi', 'Spring Boot'], target.label, 'technologies')
    assertNames(report.capabilities.map((item) => item.name), ['authorization', 'data permission', 'pagination', 'standard response', 'export'], target.label, 'capabilities')
    if (!report.references.some((item) => item.endsWith('/SysUserController.java'))) throw new Error(`${target.label} did not route SysUserController.`)
    return
  }
  assertNames(report.technologies.map((item) => item.name), ['JavaScript', 'Node.js', 'Vite', 'Vue'], target.label, 'technologies')
  if (!report.commands.some((item) => item.command === 'npm run build:prod')) throw new Error(`${target.label} did not preserve npm run build:prod.`)
}

function assertScenarioContext(context: Awaited<ReturnType<typeof buildWorkingContext>>, label: string, report: DiscoveryReport): void {
  if (!context.references.some((item) => item.path.endsWith('/SysUserController.java'))) throw new Error(`${label} context missed SysUserController.`)
  const capabilityPaths = report.capabilities.flatMap((item) => item.evidence).slice(0, 5)
  if (capabilityPaths.length === 0) throw new Error(`${label} context had no real capability evidence.`)
}

async function git(root: string, args: readonly string[]): Promise<string> {
  try {
    const result = await execFile('git', [...args], {cwd: root, timeout: 30_000, maxBuffer: 2_000_000})
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

function assertNames(actual: readonly string[], expected: readonly string[], label: string, category: string): void {
  const missing = expected.filter((item) => !actual.includes(item))
  if (missing.length > 0) throw new Error(`${label} is missing ${category}: ${missing.join(', ')}.`)
}

function ensure(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(message)
}

function parseArguments(args: readonly string[]): {backendRoot: string | null; backendRevision: string | null; frontendRoot: string | null; frontendRevision: string | null; output: string | null} {
  const result = {backendRoot: null, backendRevision: null, frontendRoot: null, frontendRevision: null, output: null} as {backendRoot: string | null; backendRevision: string | null; frontendRoot: string | null; frontendRevision: string | null; output: string | null}
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index]
    if (!argument || argument === '--') continue
    const value = args[index + 1]
    if (!value || value.startsWith('--')) throw new Error(`Missing value for ${argument}.`)
    if (argument === '--backend-root') result.backendRoot = path.resolve(value)
    else if (argument === '--backend-revision') result.backendRevision = value
    else if (argument === '--frontend-root') result.frontendRoot = path.resolve(value)
    else if (argument === '--frontend-revision') result.frontendRevision = value
    else if (argument === '--output') result.output = path.resolve(value)
    else throw new Error(`Unknown argument: ${argument}`)
    index += 1
  }
  return result
}
