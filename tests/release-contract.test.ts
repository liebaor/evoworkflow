import {readFileSync} from 'node:fs'

import {describe, expect, it} from 'vitest'
import YAML from 'yaml'

import {parseReleaseTag, validateReleaseVersion} from '../scripts/check-release-version.js'

describe('GitHub Release version contract', () => {
  it('accepts an exact vX.Y.Z tag for a private package', () => {
    expect(parseReleaseTag('v0.4.2')).toBe('0.4.2')
    expect(validateReleaseVersion('v0.4.2', {version: '0.4.2', private: true})).toBe('0.4.2')
  })

  it('rejects tag/package mismatches and public packages', () => {
    expect(() => validateReleaseVersion('v0.4.3', {version: '0.4.2', private: true})).toThrow('RELEASE_VERSION_MISMATCH')
    expect(() => validateReleaseVersion('v0.4.2', {version: '0.4.2', private: false})).toThrow('RELEASE_PACKAGE_PUBLIC')
  })

  it('keeps the release workflow tag-only, gated, and artifact-based', () => {
    const source = readFileSync(new URL('../.github/workflows/release.yml', import.meta.url), 'utf8')
    expect(YAML.parseDocument(source).errors).toHaveLength(0)
    expect(source).toContain('tags:')
    expect(source).toContain('v*')
    expect(source).toContain('contents: write')
    expect(source).toContain('pnpm run check')
    expect(source).toContain('release:pack')
    expect(source).toContain('release-install-smoke.ts')
    expect(source).toContain('gh release create')
    expect(source).not.toContain('npm publish')
  })

  it('documents latest, exact-version, rollback, and post-release paths', () => {
    const readme = readFileSync(new URL('../README.md', import.meta.url), 'utf8')
    const installation = readFileSync(new URL('../docs/installation.md', import.meta.url), 'utf8')
    const distribution = readFileSync(new URL('../docs/distribution/github-release.md', import.meta.url), 'utf8')
    const testing = readFileSync(new URL('../docs/testing.md', import.meta.url), 'utf8')
    const operations = readFileSync(new URL('../docs/operations.md', import.meta.url), 'utf8')
    const latest = 'https://github.com/liebaor/evoworkflow/releases/latest/download/evoworkflow-cli.tgz'
    const exact = 'https://github.com/liebaor/evoworkflow/releases/download/v0.4.2/evoworkflow-cli-0.4.2.tgz'
    expect(readme).toContain(latest)
    expect(installation).toContain(latest)
    expect(installation).toContain(exact)
    expect(installation).toContain('npm uninstall -g @evoworkflow/cli')
    expect(distribution).toContain('SHA256SUMS.txt')
    expect(distribution).toContain('E409 Exact Release URL')
    expect(distribution).toContain('E410 Latest Release URL')
    expect(testing).toContain('E408')
    expect(testing).toContain('E409/E410')
    expect(operations).toContain('GitHub Release 安装与运维')
  })
})
