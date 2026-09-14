import {execFile as execFileCallback} from 'node:child_process'
import {mkdtemp, mkdir, readdir, rm, writeFile} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {promisify} from 'node:util'

import {pathExists} from '../src/repository/io.js'

const execFile = promisify(execFileCallback)
const packageRoot = path.resolve('.')
const smokeRoot = await mkdtemp(path.join(tmpdir(), 'evoworkflow-package-smoke-'))
const packDirectory = path.join(smokeRoot, 'pack')
const consumerRoot = path.join(smokeRoot, 'consumer')
const managedRoot = path.join(consumerRoot, 'managed-repository')

try {
  await mkdir(consumerRoot, {recursive: true})
  await mkdir(managedRoot, {recursive: true})
  await mkdir(packDirectory, {recursive: true})
  await execFile('pnpm', ['pack', '--pack-destination', packDirectory], {cwd: packageRoot, timeout: 120_000, maxBuffer: 2_000_000})
  const tarball = (await readdir(packDirectory)).find((name) => name.endsWith('.tgz'))
  if (!tarball) throw new Error('pnpm pack produced no .tgz artifact.')
  await execFile('npm', ['install', '--ignore-scripts', '--no-audit', '--no-fund', '--no-package-lock', path.join(packDirectory, tarball)], {cwd: consumerRoot, timeout: 180_000, maxBuffer: 4_000_000})
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
