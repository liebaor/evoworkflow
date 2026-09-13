import {cp, mkdtemp, mkdir, rm, writeFile} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import path from 'node:path'

import {StateSchema} from '../src/core/schemas.js'
import {applyInitialization, planInitialization} from '../src/repository/init.js'
import {readYaml, writeYaml} from '../src/repository/io.js'
import {repositoryPaths} from '../src/repository/paths.js'
import {buildWorkingContext} from '../src/repository/working-context.js'
import {scanRepository, type DiscoveryReport} from '../src/repository/scanner.js'

interface EvaluationTarget {
  readonly label: string
  readonly kind: 'backend' | 'frontend'
  readonly root: string
  readonly revision: string
}

interface EvaluationOptions {
  backendRoot: string | null
  backendRevision: string | null
  frontendRoot: string | null
  frontendRevision: string | null
}

const options = parseArguments(process.argv.slice(2))
const targets: EvaluationTarget[] = [
  {
    label: 'RuoYi backend / 后端',
    kind: 'backend',
    root: requiredOption(options.backendRoot, '--backend-root'),
    revision: requiredRevision(options.backendRevision, '--backend-revision'),
  },
  {
    label: 'RuoYi Vue3 frontend / 前端',
    kind: 'frontend',
    root: requiredOption(options.frontendRoot, '--frontend-root'),
    revision: requiredRevision(options.frontendRevision, '--frontend-revision'),
  },
]

try {
  for (const target of targets) await evaluateTarget(target)
  console.log('\nPASS: Phase 2 RuoYi grounding evaluation passed. / 二期 RuoYi 落地评估通过。')
  console.log('Runtime, build, database, browser, and Agent execution remain UNVERIFIED because this evaluator is read-only. / 由于评估器只读，运行时、构建、数据库、浏览器和 Agent 执行仍为 UNVERIFIED。')
} catch (error) {
  console.error(`FAIL: ${error instanceof Error ? error.message : String(error)}`)
  process.exitCode = 1
}

async function evaluateTarget(target: EvaluationTarget): Promise<void> {
  const report = await scanRepository(target.root)
  assertReport(target, report)
  if (target.kind === 'backend') await evaluateBackendFeatureContexts(target.root)

  console.log(`\n[${target.label}]`)
  console.log(`Root / 根目录: ${report.root}`)
  console.log(`Git baseline / Git 基线: ${target.revision}`)
  console.log(`Mode / 模式: ${report.mode}; files / 文件数: ${report.filesScanned}; confidence / 置信度: ${report.confidence}`)
  console.log('Technologies / 技术:')
  for (const item of report.technologies) {
    console.log(`- ${item.name}: ${item.version ?? 'version unknown / 版本未知'} [${item.confidence}] (${item.evidence.join(', ')})`)
  }
  console.log(`Areas / 区域: ${report.areas.map((item) => `${item.path}[${item.kind}]`).join(', ')}`)
  console.log(`Capabilities / 能力: ${report.capabilities.map((item) => item.name).join(', ') || 'none confirmed'}`)
  console.log(`Commands / 入口: ${report.commands.map((item) => `${item.purpose}:${item.command}`).join(', ') || 'none confirmed'}`)
  console.log(`Unknowns / 未知: ${report.unknowns.join(' | ') || 'none recorded'}`)
}

function assertReport(target: EvaluationTarget, report: DiscoveryReport): void {
  if (report.mode !== 'BROWNFIELD') throw new Error(`${target.label} must remain BROWNFIELD, received ${report.mode}.`)
  if (report.filesScanned === 0) throw new Error(`${target.label} produced an empty inventory.`)

  if (target.kind === 'backend') {
    assertNames(report.technologies.map((item) => item.name), ['Java', 'Maven', 'MySQL', 'RuoYi', 'Spring Boot'], target.label, 'technology')
    assertNames(report.capabilities.map((item) => item.name), ['authorization', 'pagination', 'standard response', 'export'], target.label, 'capability')
    assertArea(report, 'ruoyi-admin', 'backend', target.label)
    assertArea(report, 'ruoyi-common', 'shared', target.label)
    assertArea(report, 'sql', 'database', target.label)
    assertCommands(report, ['mvn package', 'mvn test', 'bash ry.sh start', 'bash ry.sh status'], target.label)
    if (!report.references.some((item) => item.endsWith('/SysUserController.java'))) {
      throw new Error(`${target.label} did not identify SysUserController as a reference.`)
    }
    return
  }

  assertNames(report.technologies.map((item) => item.name), ['JavaScript', 'Node.js', 'Vite', 'Vue'], target.label, 'technology')
  assertArea(report, 'src', 'frontend', target.label)
  assertCommands(report, ['npm run dev', 'npm run build:prod'], target.label)
  if (!report.unknowns.includes('No confirmed test entry path was found.')) {
    throw new Error(`${target.label} must preserve the missing-test unknown.`)
  }
}

async function evaluateBackendFeatureContexts(sourceRoot: string): Promise<void> {
  const featureA = await evaluateFeatureContext(sourceRoot, 'feature-a', 'Supplier CRUD', ['SysUserController.java'], ['authorization', 'pagination', 'standard response'])
  const featureB = await evaluateFeatureContext(sourceRoot, 'feature-b', 'Inventory Alert DataScope export pagination response', ['SysUserController.java'], ['data permission', 'pagination', 'standard response', 'export'])
  console.log(`Feature A / 功能 A Context: ${featureA.join(', ')}`)
  console.log(`Feature B / 功能 B Context: ${featureB.join(', ')}`)
  console.log('Feature scenarios ran in temporary copies; the fixed input checkout was not written. / 功能场景在临时副本执行，固定输入 checkout 未写入。')
}

async function evaluateFeatureContext(
  sourceRoot: string,
  id: string,
  title: string,
  expectedReferenceNames: readonly string[],
  expectedCapabilities: readonly string[],
): Promise<string[]> {
  const temporary = await mkdtemp(path.join(tmpdir(), `evoworkflow-ruoyi-${id}-`))
  try {
    await cp(sourceRoot, temporary, {recursive: true})
    await applyInitialization(await planInitialization(temporary))
    const paths = repositoryPaths(temporary)
    const changeRoot = path.join(paths.activeWork, id)
    await mkdir(changeRoot, {recursive: true})
    await writeFile(path.join(changeRoot, 'change.md'), `---\nid: ${id}\nweight: STANDARD\nstatus: DRAFT\napproval: null\n---\n\n# ${title}\n\nUse actual repository mechanisms and reference implementations.\n`, 'utf8')
    await writeFile(path.join(changeRoot, 'plan.md'), `---\nchange: ${id}\nstatus: DRAFT\napproval: null\n---\n\n# Plan\n`, 'utf8')
    await writeFile(path.join(changeRoot, 'evidence.md'), '# Evidence\n', 'utf8')
    const state = await readYaml(paths.state, StateSchema)
    await writeYaml(paths.state, {...state, activeChange: id, phase: 'GRILL', status: 'DRAFT', updatedAt: new Date().toISOString()})
    const context = await buildWorkingContext(temporary, id, {includeGit: false})
    const matched = expectedReferenceNames.map((name) => context.references.find((item) => item.path.endsWith(name))?.path ?? null)
    if (matched.some((item) => item === null)) {
      throw new Error(`RuoYi ${id} context missed references: ${expectedReferenceNames.filter((_, index) => matched[index] === null).join(', ')}`)
    }
    const capabilityPaths = expectedCapabilities.map((capability) => context.references.find((item) => item.kind === 'reference' && item.reason.includes(`现有 ${capability} 能力`))?.path ?? null)
    if (capabilityPaths.some((item) => item === null)) {
      throw new Error(`RuoYi ${id} context missed capability evidence: ${expectedCapabilities.filter((_, index) => capabilityPaths[index] === null).join(', ')}`)
    }
    return [...matched, ...capabilityPaths].filter((item): item is string => item !== null)
  } finally {
    await rm(temporary, {recursive: true, force: true})
  }
}

function assertNames(actual: readonly string[], expected: readonly string[], label: string, category: string): void {
  const missing = expected.filter((item) => !actual.includes(item))
  if (missing.length > 0) throw new Error(`${label} is missing ${category}: ${missing.join(', ')}.`)
}

function assertArea(report: DiscoveryReport, area: string, kind: string, label: string): void {
  const match = report.areas.find((item) => item.path === area)
  if (!match || match.kind !== kind) throw new Error(`${label} area ${area} must be classified as ${kind}.`)
}

function assertCommands(report: DiscoveryReport, expected: readonly string[], label: string): void {
  const actual = new Set(report.commands.map((item) => item.command))
  const missing = expected.filter((item) => !actual.has(item))
  if (missing.length > 0) throw new Error(`${label} is missing operating paths: ${missing.join(', ')}.`)
}

function parseArguments(args: readonly string[]): EvaluationOptions {
  const options: EvaluationOptions = {
    backendRoot: null,
    backendRevision: null,
    frontendRoot: null,
    frontendRevision: null,
  }
  for (let index = 0; index < args.length; index += 1) {
    const argument = args[index]
    if (!argument) continue
    if (argument === '--') continue
    const value = args[index + 1]
    if (!value || value.startsWith('--')) throw new Error(`Missing value for ${argument}.`)
    if (argument === '--backend-root') options.backendRoot = path.resolve(value)
    else if (argument === '--backend-revision') options.backendRevision = value
    else if (argument === '--frontend-root') options.frontendRoot = path.resolve(value)
    else if (argument === '--frontend-revision') options.frontendRevision = value
    else throw new Error(`Unknown argument: ${argument}`)
    index += 1
  }
  return options
}

function requiredOption(value: string | null, flag: string): string {
  if (!value) throw new Error(`${flag} is required.`)
  return value
}

function requiredRevision(value: string | null, flag: string): string {
  if (!value) throw new Error(`${flag} is required so the evaluation is reproducible.`)
  if (!/^[a-f0-9]{40}$/u.test(value)) throw new Error(`${flag} must be a 40-character Git revision.`)
  return value
}
