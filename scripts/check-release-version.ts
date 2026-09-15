import {readFile} from 'node:fs/promises'
import path from 'node:path'
import {pathToFileURL} from 'node:url'

export interface PackageReleaseMetadata {
  readonly version: string
  readonly private: boolean
}

export function parseReleaseTag(tag: string): string {
  const match = /^v(\d+\.\d+\.\d+)$/u.exec(tag.trim())
  if (!match?.[1]) throw new Error(`RELEASE_VERSION_MISMATCH: expected tag vX.Y.Z, received ${tag || '<missing>'}.`)
  return match[1]
}

export function validateReleaseVersion(tag: string, packageMetadata: PackageReleaseMetadata): string {
  const tagVersion = parseReleaseTag(tag)
  if (tagVersion !== packageMetadata.version) {
    throw new Error(`RELEASE_VERSION_MISMATCH: tag ${tag} resolves to ${tagVersion}, package.json declares ${packageMetadata.version}.`)
  }
  if (!packageMetadata.private) throw new Error('RELEASE_PACKAGE_PUBLIC: package.json must keep private: true for GitHub Release distribution.')
  return tagVersion
}

export async function readPackageReleaseMetadata(root = path.resolve('.')): Promise<PackageReleaseMetadata> {
  const packageJson = JSON.parse(await readFile(path.join(root, 'package.json'), 'utf8')) as {version?: unknown; private?: unknown}
  if (typeof packageJson.version !== 'string') throw new Error('RELEASE_VERSION_MISMATCH: package.json has no string version.')
  return {version: packageJson.version, private: packageJson.private === true}
}

function releaseTagFromEnvironment(): string {
  const flagIndex = process.argv.indexOf('--tag')
  const flagValue = flagIndex >= 0 ? process.argv[flagIndex + 1] : undefined
  const ref = process.env.GITHUB_REF_NAME ?? process.env.RELEASE_TAG ?? process.env.GITHUB_REF
  return flagValue ?? (ref?.replace(/^refs\/tags\//u, '') ?? '')
}

async function main(): Promise<void> {
  const tag = releaseTagFromEnvironment()
  const metadata = await readPackageReleaseMetadata()
  const version = validateReleaseVersion(tag, metadata)
  process.stdout.write(`PASS E401: release tag ${tag} matches package.json version ${version}.\n`)
}

const invokedScript = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : null
if (invokedScript === import.meta.url) {
  await main().catch((error: unknown) => {
    process.stderr.write(`FAIL E401: ${error instanceof Error ? error.message : String(error)}\n`)
    process.exitCode = 1
  })
}
