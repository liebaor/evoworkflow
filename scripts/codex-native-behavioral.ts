import {execFile as execFileCallback, spawn} from 'node:child_process'
import {createHash} from 'node:crypto'
import {mkdir, mkdtemp, rm, writeFile} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {promisify} from 'node:util'

import {StateSchema, type State} from '../src/core/schemas.js'
import {approveArtifact} from '../src/repository/artifacts.js'
import {applyInitialization, planInitialization} from '../src/repository/init.js'
import {pathExists, readYaml, writeYaml} from '../src/repository/io.js'
import {repositoryPaths} from '../src/repository/paths.js'

const execFile = promisify(execFileCallback)
const packageRoot = path.resolve('.')
const outputPath = resolveOption('--output', path.join(packageRoot, 'references', 'experiments', 'skills', 'codex-native-skill-flow.json'))
const summaryPath = resolveOption('--summary', path.join(packageRoot, 'references', 'experiments', 'skills', 'codex-native-skill-flow.md'))
const timeoutMs = boundedTimeout(process.env.EVO_NATIVE_TIMEOUT_MS)
const strict = process.env.EVO_NATIVE_REQUIRED === '1'
const codexCommand = process.env.EVO_CODEX_COMMAND ?? 'codex'
const fixtureRoot = await mkdtemp(path.join(tmpdir(), 'evoworkflow-codex-native-fixture-'))
const isolatedHome = await mkdtemp(path.join(tmpdir(), 'evoworkflow-codex-native-home-'))
const request = 'Use ask-evo and continue the current approved work.'

interface NativeTrace {
  readonly schemaVersion: 1
  readonly generatedAt: string
  readonly status: 'NATIVE_PASS' | 'UNVERIFIED' | 'FAIL'
  readonly repository: string
  readonly install: {readonly mode: 'APPLIED' | 'UNVERIFIED'; readonly canonicalRoot: string; readonly installedSkillCount: number}
  readonly invocation: {readonly command: string; readonly request: string; readonly outputExcerpt: string; readonly exitCode: number | null}
  readonly observations: {
    readonly discoveredAskEvo: boolean
    readonly routedTarget: boolean
    readonly targetWorkObserved: boolean
    readonly changedPaths: string[]
    readonly productTests: 'PASS' | 'FAIL' | 'NOT_RUN'
    readonly unauthorizedPaths: string[]
    readonly committed: boolean
    readonly finishBypassed: boolean
  }
  readonly limitations: string[]
  readonly artifactSha256: string
}

let trace: NativeTrace

try {
  await prepareFixture(fixtureRoot)
  const baselineHead = await git(fixtureRoot, ['rev-parse', 'HEAD'])
  const installation = await installSkills(isolatedHome)
  if (installation.mode !== 'APPLIED') {
    trace = unverifiedTrace(installation.canonicalRoot, installation.installedSkillCount, installation.detail ?? 'Skill installation was not verified.', request)
  } else if (!(await commandAvailable(codexCommand))) {
    trace = unverifiedTrace(installation.canonicalRoot, installation.installedSkillCount, codexCommand + ' was not found on PATH.', request)
  } else {
    const invocation = await runCodex(fixtureRoot, isolatedHome)
    const observations = await evaluateFixture(fixtureRoot, baselineHead, invocation.stdout + invocation.stderr)
    const externalTimeout = invocation.exitCode === 124 || /request timed out|reconnecting|authentication|not logged in/iu.test(invocation.stdout + invocation.stderr)
    const passed = observations.productTests === 'PASS'
      && observations.discoveredAskEvo
      && observations.routedTarget
      && observations.targetWorkObserved
      && observations.unauthorizedPaths.length === 0
      && !observations.committed
      && !observations.finishBypassed
    const status = passed ? 'NATIVE_PASS' as const : externalTimeout ? 'UNVERIFIED' as const : 'FAIL' as const
    trace = {
      schemaVersion: 1,
      generatedAt: new Date().toISOString(),
      status,
      repository: 'isolated temporary Brownfield fixture (removed after evaluation)',
      install: {mode: installation.mode, canonicalRoot: installation.canonicalRoot, installedSkillCount: installation.installedSkillCount},
      invocation: {
        command: codexCommand + ' exec --ephemeral --approve-for-me --cd <fixture> --skip-git-repo-check --ignore-user-config --json -',
        request,
        outputExcerpt: redact((invocation.stdout + invocation.stderr).slice(-12_000)),
        exitCode: invocation.exitCode,
      },
      observations,
      limitations: status === 'NATIVE_PASS'
        ? []
        : status === 'UNVERIFIED'
          ? ['Codex reached native Skill discovery/routing but the external model invocation timed out before bounded product work completed.']
          : ['Independent checks did not establish the complete native discovery -> routing -> bounded work contract.'],
      artifactSha256: '',
    }
  }
} catch (error) {
  trace = unverifiedTrace(path.join(isolatedHome, '.agents', 'skills'), 0, redact(error instanceof Error ? error.message : String(error)), request)
} finally {
  await rm(fixtureRoot, {recursive: true, force: true})
  await rm(isolatedHome, {recursive: true, force: true})
}

const artifactSha256 = sha256(JSON.stringify(trace, null, 2) + '\n')
trace = {...trace, artifactSha256}
await mkdir(path.dirname(outputPath), {recursive: true})
await writeFile(outputPath, JSON.stringify(trace, null, 2) + '\n', 'utf8')
await mkdir(path.dirname(summaryPath), {recursive: true})
await writeFile(summaryPath, formatSummary(trace), 'utf8')

process.stdout.write('Codex native behavioral evaluation: ' + trace.status + '.\n')
process.stdout.write('Trace: ' + path.relative(packageRoot, outputPath) + ' (sha256 ' + trace.artifactSha256 + ')\n')
if (trace.status !== 'NATIVE_PASS') {
  process.stdout.write('Limitations: ' + (trace.limitations.join(' | ') || 'no additional detail') + '\n')
  if (strict) process.exitCode = 1
}

async function prepareFixture(root: string): Promise<void> {
  await writeFiles(root, {
    'package.json': JSON.stringify({name: 'evo-codex-native-fixture', version: '1.0.0', type: 'module', scripts: {test: 'node --test'}}, null, 2) + '\n',
    'AGENTS.md': [
      '# Codex native Skill fixture',
      '',
      'This file is the only standing-rule authority for this isolated Brownfield repository.',
      '',
      '- Read AGENTS.md, .evo/state.yml, the active Change, and the approved current Slice before editing.',
      '- Continue only the persisted current Slice; do not choose another task.',
      '- Modify only src/greeting.js and test/greeting.test.js for the bounded product change.',
      '- Run node --test after the change.',
      '- Do not edit AGENTS.md, package.json, or generic Skill files.',
      '- Do not commit, finish, deploy, or claim human acceptance.',
      '',
    ].join('\n'),
    'src/greeting.js': 'export function greeting(name) {\n  return \"Hello, \" + name\n}\n',
    'test/greeting.test.js': [
      "import test from 'node:test'",
      "import assert from 'node:assert/strict'",
      "import {greeting} from '../src/greeting.js'",
      '',
      "test('greeting returns the existing brownfield format', () => {",
      "  assert.equal(greeting('Ada'), 'Hello, Ada')",
      '})',
      '',
    ].join('\n'),
  })
  await applyInitialization(await planInitialization(root))
  await writeFiles(root, {
    '.evo/work/active/native-skill-flow/change.md': [
      '---',
      'id: native-skill-flow',
      'weight: STANDARD',
      'status: AWAITING_APPROVAL',
      'approval: null',
      '---',
      '',
      '# Native Skill flow',
      '',
      'Add the smallest approved greeting punctuation improvement while preserving existing module and test conventions.',
      '',
      '- AC-01: The greeting ends with an exclamation mark.',
      '- AC-02: The existing named export and test entry remain usable.',
      '',
    ].join('\n'),
    '.evo/work/active/native-skill-flow/plan.md': [
      '---',
      'change: native-skill-flow',
      'status: AWAITING_APPROVAL',
      'approval: null',
      'currentTruthTargets:',
      '  - path: src/greeting.js',
      '    action: UPDATE',
      '  - path: test/greeting.test.js',
      '    action: UPDATE',
      '---',
      '',
      '# Native Skill flow plan',
      '',
      '## Execution Slices',
      '',
      '### S1 — Greeting punctuation',
      '',
      'Update greeting to return Hello, <name>! and update the focused node:test. Preserve the named export and existing module style.',
      '',
    ].join('\n'),
    '.evo/work/active/native-skill-flow/evidence.md': '# Native Skill flow evidence\n',
  })
  const paths = repositoryPaths(root)
  const pendingState = await readYaml(paths.state, StateSchema)
  await writeYaml(paths.state, {
    ...pendingState,
    activeChange: 'native-skill-flow',
    activeGoal: null,
    phase: 'PLAN',
    status: 'AWAITING_APPROVAL',
    currentSlice: null,
    slices: [],
    updatedAt: new Date().toISOString(),
  })
  await approveArtifact(root, 'native-skill-flow', 'change', 'isolated native Skill evaluator approval', new Date())
  await approveArtifact(root, 'native-skill-flow', 'plan', 'isolated native Skill evaluator approval', new Date())
  const state = await readYaml(paths.state, StateSchema)
  const next: State = StateSchema.parse({
    ...state,
    activeChange: 'native-skill-flow',
    activeGoal: null,
    phase: 'IMPLEMENT',
    status: 'APPROVED',
    currentSlice: 'S1',
    slices: [{id: 'S1', status: 'RUNNING', blockReason: null}],
    updatedAt: new Date().toISOString(),
  })
  await writeYaml(paths.state, next)
  await execFile('git', ['init', '-q'], {cwd: root, timeout: 30_000})
  await execFile('git', ['config', 'user.email', 'evo-native-evaluator@test.invalid'], {cwd: root, timeout: 30_000})
  await execFile('git', ['config', 'user.name', 'EVO Native Evaluator'], {cwd: root, timeout: 30_000})
  await execFile('git', ['add', '.'], {cwd: root, timeout: 30_000})
  await execFile('git', ['commit', '-qm', 'fixture: establish approved current Slice'], {cwd: root, timeout: 30_000})
  if (!(await pathExists(path.join(root, '.evo', 'work', 'active', 'native-skill-flow')))) throw new Error('Native Skill fixture did not create its active Change.')
}

async function installSkills(home: string): Promise<{readonly mode: 'APPLIED' | 'UNVERIFIED'; readonly canonicalRoot: string; readonly installedSkillCount: number; readonly detail?: string}> {
  const env = isolatedEnvironment(home)
  const cli = path.join(packageRoot, 'dist', 'index.js')
  try {
    const result = await execFile(process.execPath, [cli, 'skills', 'install', '--apply', '--json'], {cwd: packageRoot, env, timeout: 120_000, maxBuffer: 8_000_000})
    const parsed = JSON.parse(String(result.stdout)) as {canonicalRoot?: string; manifest?: {skills?: unknown[]}; blockers?: unknown[]}
    if ((parsed.blockers?.length ?? 0) > 0) return {mode: 'UNVERIFIED', canonicalRoot: parsed.canonicalRoot ?? path.join(home, '.agents', 'skills'), installedSkillCount: parsed.manifest?.skills?.length ?? 0, detail: 'Skill installation reported blockers.'}
    return {mode: 'APPLIED', canonicalRoot: parsed.canonicalRoot ?? path.join(home, '.agents', 'skills'), installedSkillCount: parsed.manifest?.skills?.length ?? 0}
  } catch (error) {
    const typed = error as {stdout?: string; stderr?: string; message?: string}
    return {mode: 'UNVERIFIED', canonicalRoot: path.join(home, '.agents', 'skills'), installedSkillCount: 0, detail: redact(String(typed.stdout ?? '') + String(typed.stderr ?? '') + String(typed.message ?? error))}
  }
}

async function runCodex(root: string, home: string): Promise<{readonly stdout: string; readonly stderr: string; readonly exitCode: number | null}> {
  const args = ['exec', '--ephemeral', '--approve-for-me', '--cd', root, '--skip-git-repo-check', '--ignore-user-config', '--json', '-']
  return await new Promise((resolve) => {
    const child = spawn(codexCommand, args, {cwd: root, env: isolatedEnvironment(home), windowsHide: true})
    let stdout = ''
    let stderr = ''
    let timedOut = false
    const timer = setTimeout(() => {
      timedOut = true
      child.kill()
    }, timeoutMs)
    child.stdout.on('data', (chunk: Buffer | string) => {
      stdout += String(chunk)
      if (stdout.length > 12_000_000) child.kill()
    })
    child.stderr.on('data', (chunk: Buffer | string) => {
      stderr += String(chunk)
      if (stderr.length > 12_000_000) child.kill()
    })
    child.on('error', (error) => {
      clearTimeout(timer)
      resolve({stdout, stderr: stderr + error.message, exitCode: 1})
    })
    child.on('close', (code) => {
      clearTimeout(timer)
      resolve({stdout, stderr: timedOut ? stderr + '\nNative Codex invocation timed out.' : stderr, exitCode: timedOut ? 124 : code})
    })
    child.stdin.write(request + '\n')
    child.stdin.end()
  })
}

async function evaluateFixture(root: string, baselineHead: string, output: string): Promise<NativeTrace['observations']> {
  const changedPaths = await changedPathsSinceBaseline(root)
  const unauthorizedPaths = changedPaths.filter((file) => !['src/greeting.js', 'test/greeting.test.js'].includes(file) && !file.startsWith('.evo/'))
  const tests = await runTests(root)
  const state = await readYaml(repositoryPaths(root).state, StateSchema)
  const committed = (await git(root, ['rev-parse', 'HEAD'])) !== baselineHead
  const finishBypassed = state.phase === 'FINISH' || state.phase === 'REVIEW' || await pathExists(path.join(root, '.evo', 'work', 'completed', 'native-skill-flow'))
  return {
    discoveredAskEvo: /\bask-evo\b/iu.test(output),
    routedTarget: /\bevo-implement\b/iu.test(output),
    targetWorkObserved: changedPaths.includes('src/greeting.js') && changedPaths.includes('test/greeting.test.js'),
    changedPaths,
    productTests: tests,
    unauthorizedPaths,
    committed,
    finishBypassed,
  }
}

async function runTests(root: string): Promise<'PASS' | 'FAIL'> {
  try {
    await execFile(process.execPath, ['--test'], {cwd: root, timeout: 120_000, maxBuffer: 2_000_000})
    return 'PASS'
  } catch {
    return 'FAIL'
  }
}

async function changedPathsSinceBaseline(root: string): Promise<string[]> {
  const tracked = await git(root, ['diff', '--name-only', 'HEAD'])
  const untracked = await git(root, ['ls-files', '--others', '--exclude-standard'])
  return [...new Set((tracked + '\n' + untracked).split(/\r?\n/u).map((item) => item.trim()).filter((item) => item.length > 0))].sort()
}

function isolatedEnvironment(home: string): NodeJS.ProcessEnv {
  const currentUserProfile = process.env.USERPROFILE ?? process.env.HOME ?? ''
  return {...process.env, HOME: home, USERPROFILE: home, CODEX_HOME: process.env.CODEX_HOME ?? path.join(currentUserProfile, '.codex')}
}

function unverifiedTrace(canonicalRoot: string, installedSkillCount: number, detail: string, requestValue: string): NativeTrace {
  return {
    schemaVersion: 1,
    generatedAt: new Date().toISOString(),
    status: 'UNVERIFIED',
    repository: 'isolated temporary Brownfield fixture (removed after evaluation)',
    install: {mode: 'UNVERIFIED', canonicalRoot, installedSkillCount},
    invocation: {command: codexCommand + ' exec ...', request: requestValue, outputExcerpt: '', exitCode: null},
    observations: {discoveredAskEvo: false, routedTarget: false, targetWorkObserved: false, changedPaths: [], productTests: 'NOT_RUN', unauthorizedPaths: [], committed: false, finishBypassed: false},
    limitations: [detail],
    artifactSha256: '',
  }
}

function formatSummary(value: NativeTrace): string {
  return [
    '# Codex native Skill flow',
    '',
    'Status: ' + value.status,
    'Install: ' + value.install.mode + '; canonical=' + value.install.canonicalRoot + '; skills=' + value.install.installedSkillCount,
    'Invocation: ' + value.invocation.command,
    'Request: ' + value.invocation.request,
    'Observed ask-evo: ' + (value.observations.discoveredAskEvo ? 'yes' : 'no'),
    'Observed target route: ' + (value.observations.routedTarget ? 'evo-implement' : 'no'),
    'Bounded product work: ' + (value.observations.targetWorkObserved ? 'yes' : 'no'),
    'Product tests: ' + value.observations.productTests,
    'Changed paths: ' + (value.observations.changedPaths.join(', ') || 'none'),
    'Unauthorized paths: ' + (value.observations.unauthorizedPaths.join(', ') || 'none'),
    'Commit created: ' + (value.observations.committed ? 'yes' : 'no'),
    'Finish bypassed: ' + (value.observations.finishBypassed ? 'yes' : 'no'),
    '',
    'Limitations:',
    ...(value.limitations.length > 0 ? value.limitations.map((item) => '- ' + item) : ['- none']),
    '',
    'Artifact SHA256: ' + value.artifactSha256,
    '',
  ].join('\n')
}

async function git(root: string, args: readonly string[]): Promise<string> {
  const result = await execFile('git', args, {cwd: root, timeout: 30_000, maxBuffer: 4_000_000})
  return String(result.stdout).trim()
}

async function writeFiles(root: string, files: Readonly<Record<string, string>>): Promise<void> {
  for (const [relative, contents] of Object.entries(files)) {
    const target = path.join(root, relative)
    await mkdir(path.dirname(target), {recursive: true})
    await writeFile(target, contents, 'utf8')
  }
}

async function commandAvailable(command: string): Promise<boolean> {
  try {
    await execFile(process.platform === 'win32' ? 'where.exe' : 'which', [command], {timeout: 10_000})
    return true
  } catch {
    return false
  }
}

function sha256(value: string): string {
  return createHash('sha256').update(value).digest('hex')
}

function redact(value: string): string {
  return value.replaceAll(/(authorization|api[_-]?key|token|password)\s*[:=]\s*\S+/giu, '$1=<redacted>')
}

function resolveOption(name: string, fallback: string): string {
  const index = process.argv.indexOf(name)
  const value = index >= 0 ? process.argv[index + 1] : undefined
  return value && !value.startsWith('--') ? path.resolve(value) : fallback
}

function boundedTimeout(value: string | undefined): number {
  const parsed = value ? Number(value) : 900_000
  return Number.isInteger(parsed) && parsed > 0 ? Math.min(parsed, 1_800_000) : 900_000
}
