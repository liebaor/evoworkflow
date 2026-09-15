import {copyFile, mkdir, mkdtemp, readFile, readdir, rm, writeFile} from 'node:fs/promises'
import {createHash} from 'node:crypto'
import {execFile as execFileCallback} from 'node:child_process'
import {tmpdir} from 'node:os'
import path from 'node:path'
import {promisify} from 'node:util'
import {pathToFileURL} from 'node:url'

import {assertPackedDistribution} from './package-smoke.js'
import {readPackageReleaseMetadata} from './check-release-version.js'

const execFile = promisify(execFileCallback)
const npmCommand = process.platform === 'win32' ? 'npm.cmd' : 'npm'

export interface ReleaseArtifacts {
  readonly version: string
  readonly outputDirectory: string
  readonly versionedPath: string
  readonly stablePath: string
  readonly checksumsPath: string
  readonly sha256: string
}

export async function createReleaseArtifacts(root = path.resolve('.'), outputDirectory = path.resolve(root, process.env.RELEASE_OUTPUT_DIR ?? 'release-artifacts')): Promise<ReleaseArtifacts> {
  const metadata = await readPackageReleaseMetadata(root)
  if (!metadata.private) throw new Error('RELEASE_PACKAGE_PUBLIC: package.json must keep private: true for GitHub Release distribution.')
  const versionedName = `evoworkflow-cli-${metadata.version}.tgz`
  const stableName = 'evoworkflow-cli.tgz'
  const versionedPath = path.join(outputDirectory, versionedName)
  const stablePath = path.join(outputDirectory, stableName)
  const checksumsPath = path.join(outputDirectory, 'SHA256SUMS.txt')
  const staging = await mkdtemp(path.join(tmpdir(), 'evoworkflow-release-pack-'))
  const npmEnvironment = {...process.env, npm_config_cache: path.join(staging, 'npm-cache')}

  try {
    await mkdir(outputDirectory, {recursive: true})
    await execFile(npmCommand, ['pack', '--pack-destination', staging], {cwd: root, timeout: 180_000, maxBuffer: 4_000_000, shell: process.platform === 'win32', env: npmEnvironment})
    const packed = (await readdir(staging)).filter((entry) => entry.endsWith('.tgz'))
    if (packed.length !== 1) throw new Error(`RELEASE_ARTIFACT_INVALID: expected one npm pack output, found ${packed.length}.`)
    await copyFile(path.join(staging, packed[0]!), versionedPath)
    await copyFile(versionedPath, stablePath)
    await assertPackedDistribution(versionedPath, root)
    const sha256 = await fileSha256(versionedPath)
    const stableSha256 = await fileSha256(stablePath)
    if (sha256 !== stableSha256) throw new Error('RELEASE_ARTIFACT_INVALID: versioned and stable artifacts differ.')
    await writeFile(checksumsPath, `${sha256}  ${versionedName}\n${stableSha256}  ${stableName}\n`, 'utf8')
    return {version: metadata.version, outputDirectory, versionedPath, stablePath, checksumsPath, sha256}
  } finally {
    await rm(staging, {recursive: true, force: true})
  }
}

async function fileSha256(file: string): Promise<string> {
  return createHash('sha256').update(await readFile(file)).digest('hex')
}

function outputDirectoryFromArgs(): string {
  const index = process.argv.indexOf('--output')
  return index >= 0 && process.argv[index + 1] ? path.resolve(process.argv[index + 1]!) : path.resolve(process.env.RELEASE_OUTPUT_DIR ?? 'release-artifacts')
}

const invokedScript = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : null
if (invokedScript === import.meta.url) {
  createReleaseArtifacts(undefined, outputDirectoryFromArgs()).then((result) => {
    process.stdout.write(`PASS E402: created ${path.basename(result.versionedPath)} and ${path.basename(result.stablePath)}.\n`)
    process.stdout.write('PASS E403: SHA256SUMS.txt created with matching artifact hashes.\n')
  }).catch((error: unknown) => {
    process.stderr.write(`FAIL E402/E403: ${error instanceof Error ? error.message : String(error)}\n`)
    process.exitCode = 1
  })
}
