import {execFile as execFileCallback} from 'node:child_process'
import {mkdtemp, mkdir, readdir, rm, writeFile} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {promisify} from 'node:util'

import {pathExists} from '../src/repository/io.js'
import {buildSkillManifest} from '../src/repository/skill-manifest.js'

const execFile = promisify(execFileCallback)
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm'
const packageRoot = path.resolve('.')
const smokeRoot = await mkdtemp(path.join(tmpdir(), 'evoworkflow-package-smoke-'))
const packDirectory = path.join(smokeRoot, 'pack')
const consumerRoot = path.join(smokeRoot, 'consumer')
const managedRoot = path.join(consumerRoot, 'managed-repository')
const npmEnvironment = {...process.env, npm_config_cache: path.join(smokeRoot, 'npm-cache')}

try {
  await mkdir(consumerRoot, {recursive: true})
  await mkdir(managedRoot, {recursive: true})
  await mkdir(packDirectory, {recursive: true})
  await execFile(npmCommand, ['pack', '--pack-destination', packDirectory], {cwd: packageRoot, timeout: 120_000, maxBuffer: 2_000_000, shell: process.platform === 'win32', env: npmEnvironment})
  const tarball = (await readdir(packDirectory)).find((name) => name.endsWith('.tgz'))
  if (!tarball) throw new Error('npm pack produced no .tgz artifact.')
  await assertPackedDistribution(path.join(packDirectory, tarball))
  await execFile(npmCommand, ['install', '--ignore-scripts', '--no-audit', '--no-fund', '--no-package-lock', path.join(packDirectory, tarball)], {cwd: consumerRoot, timeout: 180_000, maxBuffer: 4_000_000, shell: process.platform === 'win32', env: npmEnvironment})
  const cli = path.join(consumerRoot, 'node_modules', '@evoworkflow', 'cli', 'dist', 'index.js')
  if (!(await pathExists(cli))) throw new Error(`Packed CLI entry is missing: ${cli}`)
  await writeFile(path.join(managedRoot, 'README.md'), '# Packed artifact smoke repository\n', 'utf8')
  await runCli(cli, ['--help'], consumerRoot)
  await runCli(cli, ['init', '--root', managedRoot, '--apply'], consumerRoot)
  await runCli(cli, ['check', '--root', managedRoot], consumerRoot)
  await runCli(cli, ['context', '--root', managedRoot], consumerRoot)
  await runCli(cli, ['recover', '--root', managedRoot], consumerRoot)
  process.stdout.write('PASS E314: packed artifact clean-install CLI smoke passed. / 打包产物清洁安装黑盒冒烟通过。\n')
} catch (error) {
  process.stderr.write(`FAIL E314: ${error instanceof Error ? error.message : String(error)}\n`)
  process.exitCode = 1
} finally {
  await rm(smokeRoot, {recursive: true, force: true})
}

async function runCli(cli: string, args: readonly string[], cwd: string): Promise<void> {
  const result = await execFile(process.execPath, [cli, ...args], {cwd, timeout: 60_000, maxBuffer: 4_000_000})
  if (!String(result.stdout).trim()) throw new Error(`CLI command produced no output: evo ${args.join(' ')}`)
}

async function assertPackedDistribution(tarball: string): Promise<void> {
  const result = await execFile('tar', ['-tzf', tarball], {timeout: 60_000, maxBuffer: 4_000_000})
  const entries = new Set(result.stdout.split(/\r?\n/u).map((entry) => entry.replace(/^package\//u, '')).filter((entry) => entry.length > 0))
  const manifest = await buildSkillManifest(packageRoot)
  const required = [
    'dist/index.js',
    'dist/commands/agents/inspect.js',
    'dist/commands/agents/setup.js',
    'dist/commands/agents/doctor.js',
    'dist/commands/skills/inspect.js',
    'dist/commands/skills/install.js',
    'dist/commands/skills/update.js',
    'dist/commands/skills/doctor.js',
    'skills/manifest.json',
    ...manifest.skills.map((skill) => `skills/${skill.name}/SKILL.md`),
    'skills/ask-evo/agents/openai.yaml',
    'skills/evo-init/agents/openai.yaml',
    'skills/evo-finish/agents/openai.yaml',
    'skills/evo-commit/agents/openai.yaml',
  ]
  const missing = required.filter((entry) => !entries.has(entry))
  if (missing.length > 0) throw new Error(`Packed artifact is missing required universal distribution entries: ${missing.join(', ')}`)
  const vendorCopies = [...entries].filter((entry) => /^(?:skills-(?:codex|claude|opencode)|(?:CODEX|OPENCODE)\.md$)/u.test(entry))
  if (vendorCopies.length > 0) throw new Error(`Packed artifact contains vendor-specific Skill/authority copies: ${vendorCopies.join(', ')}`)
  process.stdout.write(`PASS E315: packed artifact contains one canonical Skill set (${manifest.skills.length} Skills) and agent commands. / 打包产物包含一份 canonical Skill 集合和 Agent 命令。\n`)
}
