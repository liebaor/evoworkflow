import {execFile} from 'node:child_process'
import {mkdir, mkdtemp, readFile, rm, stat, writeFile} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {fileURLToPath} from 'node:url'
import {promisify} from 'node:util'
import {parse, stringify} from 'yaml'

const execute = promisify(execFile)
const projectRoot = fileURLToPath(new URL('../', import.meta.url))
const cli = path.join(projectRoot, 'dist', 'index.js')
const repository = await mkdtemp(path.join(tmpdir(), 'evoworkflow-built-cli-'))

try {
  const preview = await run(['init', '--root', repository])
  assertIncludes(preview, 'Mode: GREENFIELD')
  await expectMissing(path.join(repository, '.evo'))

  const applied = await run(['init', '--root', repository, '--apply'])
  assertIncludes(applied, 'created: .evo/config.yml')
  await stat(path.join(repository, '.evo', 'state.yml'))

  const status = await run(['status', '--root', repository])
  assertIncludes(status, 'Recommended next action: /evo-grill-with-docs')

  const check = await run(['check', '--root', repository])
  assertIncludes(check, 'PASS: repository protocol is valid.')

  const agentPreview = await run(['agents', 'setup', '--root', repository, '--json'])
  assertIncludes(agentPreview, '"mode": "PREVIEW"')
  assertIncludes(agentPreview, '"action": "CREATE_CLAUDE_BRIDGE"')
  await expectMissing(path.join(repository, 'CLAUDE.md'))
  const agentApply = await run(['agents', 'setup', '--root', repository, '--apply', '--json'])
  assertIncludes(agentApply, '"action": "ALREADY_CONFIGURED"')
  assertIncludes(await readFile(path.join(repository, 'CLAUDE.md'), 'utf8'), '@AGENTS.md')

  await prepareFiveSliceGoal(repository)
  await run(['approve', 'smoke-change', 'change', '--root', repository, '--source', 'built CLI smoke'])
  await run(['approve', 'smoke-change', 'plan', '--root', repository, '--source', 'built CLI smoke'])
  await updateYaml(path.join(repository, '.evo', 'state.yml'), (state) => ({...state, phase: 'IMPLEMENT', status: 'APPROVED'}))
  await run(['goal', 'create', 'smoke-goal', '--root', repository, '--from', path.join(repository, 'goal-definition.yml')])
  await run(['goal', 'approve', 'smoke-goal', '--root', repository])
  const goalRun = await run(['goal', 'run', 'smoke-goal', '--root', repository])
  assertIncludes(goalRun, 'Status: READY_FOR_REVIEW')
  assertIncludes(goalRun, 'This Goal did not finish the Change.')
  const goal = JSON.parse(await run(['goal', 'inspect', 'smoke-goal', '--root', repository, '--json'])) as {status: string; slices: Array<{status: string}>}
  if (goal.status !== 'READY_FOR_REVIEW' || goal.slices.length !== 5 || goal.slices.some((slice) => slice.status !== 'PASS')) {
    throw new Error(`Unexpected persisted Goal state: ${JSON.stringify(goal)}`)
  }
  await stat(path.join(repository, '.evo', 'work', 'active', 'smoke-change'))
  await expectMissing(path.join(repository, '.evo', 'work', 'completed', 'smoke-change'))

  const recovery = await run(['recover', '--root', repository, '--json'])
  assertIncludes(recovery, '"workingContext"')
  assertIncludes(recovery, '"recommendedNextAction"')

  const migration = await run(['migrate', '--root', repository])
  assertIncludes(migration, 'Target protocol: v2')

  const evidence = await run(['evidence', 'run', '--root', repository, '--change', 'smoke-change', '--acceptance', 'AC-01', '--kind', 'build', '--label', 'built evidence', '--', process.execPath, '-e', 'process.exit(0)'])
  assertIncludes(evidence, 'PASS built evidence')
  const evidenceCheck = await run(['evidence', 'reconcile', '--root', repository, '--change', 'smoke-change'])
  assertIncludes(evidenceCheck, 'Valid: yes')

  const help = await run(['--help'])
  for (const command of ['admission', 'agents', 'approve', 'check', 'commit', 'constraints', 'context', 'doctor', 'finish', 'gate', 'init', 'migrate', 'recover', 'status', 'evidence', 'completion', 'change-set']) assertIncludes(help, command)
  const agentsHelp = await run(['agents', '--help'])
  for (const command of ['doctor', 'inspect', 'setup']) assertIncludes(agentsHelp, command)
  const goalHelp = await run(['goal', '--help'])
  for (const command of ['approve', 'cancel', 'create', 'inspect', 'resume', 'run']) assertIncludes(goalHelp, command)
} finally {
  await rm(repository, {recursive: true, force: true})
}

process.stdout.write('Built CLI smoke passed.\n')

async function run(args: readonly string[]): Promise<string> {
  const result = await execute(process.execPath, [cli, ...args], {cwd: projectRoot})
  return result.stdout
}

function assertIncludes(source: string, expected: string): void {
  const normalizedSource = source.replaceAll('\\', '/')
  const normalizedExpected = expected.replaceAll('\\', '/')
  if (!normalizedSource.includes(normalizedExpected)) throw new Error(`Expected output to include ${JSON.stringify(expected)}:\n${source}`)
}

async function expectMissing(target: string): Promise<void> {
  try {
    await readFile(target)
    throw new Error(`Expected path to be missing: ${target}`)
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
  }
}

async function prepareFiveSliceGoal(root: string): Promise<void> {
  const changeRoot = path.join(root, '.evo', 'work', 'active', 'smoke-change')
  await mkdir(changeRoot, {recursive: true})
  await writeFile(path.join(root, 'package.json'), '{"name":"smoke-repository","version":"1.0.0","engines":{"node":">=22"},"scripts":{"test":"vitest","dev":"node app.js"}}\n', 'utf8')
  await mkdir(path.join(root, 'docs'), {recursive: true})
  await writeFile(path.join(root, 'docs', 'architecture.md'), '# Architecture\n', 'utf8')
  await mkdir(path.join(root, '.github', 'workflows'), {recursive: true})
  await writeFile(path.join(root, '.github', 'workflows', 'ci.yml'), 'name: ci\n', 'utf8')
  await writeFile(path.join(root, 'pom.xml'), '<project><properties><java.version>17</java.version><spring-security.version>6.0.0</spring-security.version></properties></project>\n', 'utf8')
  await writeFile(path.join(changeRoot, 'change.md'), '---\nid: smoke-change\nweight: STANDARD\nstatus: AWAITING_APPROVAL\napproval: null\n---\n\n# Smoke Change\n\nExercise the built Goal entry path.\n', 'utf8')
  const planSlices = Array.from({length: 5}, (_, index) => `### S${index + 1} — Smoke Slice ${index + 1}\n\nPersist one bounded checkpoint.`).join('\n\n')
  await writeFile(path.join(changeRoot, 'plan.md'), `---\nchange: smoke-change\nstatus: AWAITING_APPROVAL\napproval: null\n---\n\n# Plan\n\n${planSlices}\n`, 'utf8')
  await writeFile(path.join(changeRoot, 'evidence.md'), '# Evidence\n\n| Acceptance | Status | Evidence | Scope |\n|---|---|---|---|\n| AC-01 | UNVERIFIED | Goal pending | built CLI |\n', 'utf8')
  await updateYaml(path.join(root, '.evo', 'state.yml'), (state) => ({
    ...state,
    activeChange: 'smoke-change',
    phase: 'PLAN',
    status: 'AWAITING_APPROVAL',
  }))
  const adapterScript = 'let input="";process.stdin.on("data",c=>input+=c);process.stdin.on("end",()=>{if(!input.includes("approved evoworkflow Slice"))process.exit(4);console.log(JSON.stringify({status:"COMPLETED",summary:"smoke",changedFiles:[],evidence:[],stopCondition:null}))})'
  await updateYaml(path.join(root, '.evo', 'config.yml'), (config) => ({
    ...config,
    agents: {
      ...(config.agents as Record<string, unknown>),
      adapters: {
        ...((config.agents as {adapters: Record<string, unknown>}).adapters),
        smoke: {kind: 'process', command: process.execPath, args: ['-e', adapterScript], timeoutMs: 10_000},
      },
    },
  }))
  const definition = {
    title: 'Built CLI five-Slice smoke',
    changeId: 'smoke-change',
    adapter: 'smoke',
    maxAttempts: 1,
    slices: Array.from({length: 5}, (_, index) => ({
      id: `S${index + 1}`,
      objective: `Exercise Slice ${index + 1}`,
      acceptance: [`Slice ${index + 1} reaches a persisted PASS checkpoint`],
      dependsOn: index === 0 ? [] : [`S${index}`],
      verify: [{label: `verify S${index + 1}`, command: process.execPath, args: ['-e', 'process.exit(0)'], timeoutMs: 10_000}],
    })),
  }
  await writeFile(path.join(root, 'goal-definition.yml'), stringify(definition), 'utf8')
}

async function updateYaml(target: string, update: (value: Record<string, unknown>) => Record<string, unknown>): Promise<void> {
  const value = parse(await readFile(target, 'utf8')) as Record<string, unknown>
  await writeFile(target, stringify(update(value)), 'utf8')
}
