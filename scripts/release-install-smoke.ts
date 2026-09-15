import {execFile as execFileCallback} from 'node:child_process'
import {mkdtemp, mkdir, readdir, rm, writeFile} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {promisify} from 'node:util'

import {pathExists} from '../src/repository/io.js'

const execFile = promisify(execFileCallback)
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm'
const cliCommand = process.platform === 'win32' ? 'evo.cmd' : 'evo'

interface CommandResult {
  readonly stdout: string
  readonly stderr: string
}

function argumentValue(name: string): string | null {
  const index = process.argv.indexOf(name)
  return index >= 0 ? process.argv[index + 1] ?? null : null
}

async function run(command: string, args: readonly string[], cwd: string, env: NodeJS.ProcessEnv): Promise<CommandResult> {
  const result = await execFile(command, args, {
    cwd,
    env,
    timeout: 300_000,
    maxBuffer: 8_000_000,
    shell: process.platform === 'win32',
  })
  return {stdout: String(result.stdout), stderr: String(result.stderr)}
}

async function snapshotFiles(root: string): Promise<string[]> {
  const result: string[] = []
  async function visit(directory: string, relativeDirectory: string): Promise<void> {
    for (const entry of await readdir(directory, {withFileTypes: true})) {
      const relative = path.join(relativeDirectory, entry.name).split(path.sep).join('/')
      if (entry.isDirectory()) await visit(path.join(directory, entry.name), relative)
      else result.push(relative)
    }
  }
  await visit(root, '')
  return result.sort()
}

async function removeTemporaryRoot(root: string): Promise<void> {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    try {
      await rm(root, {recursive: true, force: true})
      return
    } catch (error) {
      if (attempt === 9) throw error
      await new Promise((resolve) => setTimeout(resolve, 250))
    }
  }
}

async function main(): Promise<void> {
  const artifactInput = argumentValue('--artifact') ?? process.env.RELEASE_ARTIFACT
  if (!artifactInput) throw new Error('GLOBAL_INSTALL_FAILED: pass --artifact <evoworkflow-cli-X.Y.Z.tgz>.')
  const artifact = path.resolve(artifactInput)
  if (!(await pathExists(artifact))) throw new Error(`GLOBAL_INSTALL_FAILED: artifact does not exist: ${artifact}`)

  const smokeRoot = await mkdtemp(path.join(tmpdir(), 'evoworkflow-release-install-'))
  const prefix = path.join(smokeRoot, 'global-prefix')
  const businessRoot = path.join(smokeRoot, 'business-repository')
  const isolatedHome = path.join(smokeRoot, 'home')
  const globalBin = process.platform === 'win32' ? prefix : path.join(prefix, 'bin')
  const environment: NodeJS.ProcessEnv = {
    ...process.env,
    npm_config_cache: path.join(smokeRoot, 'npm-cache'),
    HOME: isolatedHome,
    USERPROFILE: isolatedHome,
    PATH: [globalBin, process.env.PATH].filter((value): value is string => Boolean(value)).join(path.delimiter),
  }

  try {
    await mkdir(businessRoot, {recursive: true})
    await mkdir(isolatedHome, {recursive: true})
    await writeFile(path.join(businessRoot, 'README.md'), '# Release install smoke repository\n', 'utf8')
    await run(npmCommand, ['install', '--global', '--prefix', prefix, '--ignore-scripts', '--no-audit', '--no-fund', '--no-package-lock', artifact], smokeRoot, environment)

    const installedCli = path.join(prefix, 'node_modules', '@evoworkflow', 'cli', 'dist', 'index.js')
    const installedBin = path.join(globalBin, cliCommand)
    if (!(await pathExists(installedCli)) || !(await pathExists(installedBin))) throw new Error('GLOBAL_INSTALL_FAILED: npm global install did not create the installed CLI and bin entry.')

    const version = await run(cliCommand, ['--version'], businessRoot, environment)
    if (!/0\.4\.2/u.test(version.stdout)) throw new Error(`GLOBAL_INSTALL_FAILED: evo --version did not report 0.4.2: ${version.stdout.trim()}`)
    const help = await run(cliCommand, ['--help'], businessRoot, environment)
    if (!help.stdout.includes('init') || !help.stdout.includes('skills')) throw new Error('GLOBAL_INSTALL_FAILED: evo --help did not expose the expected CLI topics.')

    const beforePreview = await snapshotFiles(businessRoot)
    await run(cliCommand, ['init', '--root', businessRoot], businessRoot, environment)
    const afterPreview = await snapshotFiles(businessRoot)
    if (JSON.stringify(beforePreview) !== JSON.stringify(afterPreview)) throw new Error('GLOBAL_INSTALL_FAILED: evo init preview modified the business repository.')

    await run(cliCommand, ['init', '--root', businessRoot, '--apply'], businessRoot, environment)
    await run(cliCommand, ['check', '--root', businessRoot], businessRoot, environment)
    await run(cliCommand, ['doctor', '--root', businessRoot], businessRoot, environment)
    await run(cliCommand, ['recover', '--root', businessRoot], businessRoot, environment)

    const skillsInspect = await run(cliCommand, ['skills', 'inspect'], businessRoot, environment)
    if (!skillsInspect.stdout.includes('ask-evo')) throw new Error('GLOBAL_INSTALL_FAILED: installed CLI skills inspect did not expose the canonical Skill set.')
    await run(cliCommand, ['skills', 'install', '--apply'], businessRoot, environment)
    await run(cliCommand, ['skills', 'update'], businessRoot, environment)
    await run(cliCommand, ['skills', 'update', '--apply'], businessRoot, environment)
    const skillsDoctor = await run(cliCommand, ['skills', 'doctor'], businessRoot, environment)
    if (!skillsDoctor.stdout.includes('EVO Skill Doctor: PASS')) throw new Error(`GLOBAL_INSTALL_FAILED: installed CLI skills doctor did not pass: ${skillsDoctor.stdout.trim()}`)

    const platformEvidence = process.platform === 'win32' ? 'E405' : 'E404'
    process.stdout.write(`PASS ${platformEvidence}: global install smoke passed on ${process.platform}. / 全局安装黑盒在 ${process.platform} 通过。\n`)
    process.stdout.write('PASS E406: installed evo --version/help executed from the temporary global bin.\n')
    process.stdout.write('PASS E407: installed CLI init preview/apply/check/doctor/recover passed without source checkout.\n')
    process.stdout.write('PASS Skill Distribution: installed CLI skills inspect/install/update/doctor reused the canonical distribution.\n')
  } finally {
    await removeTemporaryRoot(smokeRoot)
  }
}

await main().catch((error: unknown) => {
  process.stderr.write(`FAIL E404/E405/E406/E407/Skill-Distribution: ${error instanceof Error ? error.message : String(error)}\n`)
  process.exitCode = 1
})
