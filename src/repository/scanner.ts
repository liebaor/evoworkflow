import {readdir, readFile, stat} from 'node:fs/promises'
import path from 'node:path'

import type {ProjectMode} from '../core/schemas.js'
import {pathExists} from './io.js'

export interface DiscoveryEvidence {
  readonly name: string
  readonly evidence: readonly string[]
}

export type TechnologyConfidence = 'CONFIRMED' | 'INFERRED' | 'UNKNOWN'

export interface TechnologyObservation {
  readonly name: string
  readonly version: string | null
  readonly confidence: TechnologyConfidence
  readonly evidence: readonly string[]
}

export type RepositoryAreaKind = 'backend' | 'frontend' | 'shared' | 'database' | 'docs' | 'tests' | 'module' | 'config' | 'other'

export interface RepositoryArea {
  readonly path: string
  readonly kind: RepositoryAreaKind
  readonly evidence: readonly string[]
}

export interface DiscoveredCommand {
  readonly purpose: 'build' | 'run' | 'test' | 'typecheck' | 'lint' | 'check' | 'observe'
  readonly command: string
  readonly evidence: string
}

export interface AuthorityCandidate {
  readonly topic: string
  readonly path: string
}

export interface DiscoveryReport {
  readonly root: string
  readonly projectName: string
  readonly mode: ProjectMode
  readonly generatedAt: string
  readonly confidence: 'LOW' | 'MEDIUM' | 'HIGH'
  readonly filesScanned: number
  readonly truncated: boolean
  readonly languages: readonly DiscoveryEvidence[]
  readonly frameworks: readonly DiscoveryEvidence[]
  readonly technologies: readonly TechnologyObservation[]
  readonly areas: readonly RepositoryArea[]
  readonly commands: readonly DiscoveredCommand[]
  readonly authorities: readonly AuthorityCandidate[]
  readonly capabilities: readonly DiscoveryEvidence[]
  readonly references: readonly string[]
  readonly unknowns: readonly string[]
}

const ignoredDirectories = new Set([
  '.git',
  '.idea',
  '.next',
  '.mypy_cache',
  '.pytest_cache',
  '.ruff_cache',
  '.umi',
  '.umi-production',
  '.venv',
  '.vscode',
  'build',
  'coverage',
  'dist',
  'lib',
  'node_modules',
  '__pycache__',
  'target',
  'vendor',
])

const languageByExtension = new Map([
  ['.c', 'C'],
  ['.cpp', 'C++'],
  ['.cs', 'C#'],
  ['.go', 'Go'],
  ['.java', 'Java'],
  ['.js', 'JavaScript'],
  ['.jsx', 'JavaScript'],
  ['.kt', 'Kotlin'],
  ['.php', 'PHP'],
  ['.py', 'Python'],
  ['.rb', 'Ruby'],
  ['.rs', 'Rust'],
  ['.swift', 'Swift'],
  ['.ts', 'TypeScript'],
  ['.tsx', 'TypeScript'],
  ['.vue', 'Vue'],
])

interface FileInventory {
  readonly files: string[]
  readonly truncated: boolean
}

/** Inspects a repository without writing and labels observations separately from unknowns. */
export async function scanRepository(root: string, maximumFiles = 6000): Promise<DiscoveryReport> {
  const resolvedRoot = path.resolve(root)
  const rootStat = await stat(resolvedRoot)
  if (!rootStat.isDirectory()) throw new Error(`Repository root is not a directory: ${resolvedRoot}`)

  const inventory = await collectFiles(resolvedRoot, maximumFiles)
  const relativeFiles = inventory.files.map((file) => toPosix(path.relative(resolvedRoot, file)))
  const mode: ProjectMode = await pathExists(path.join(resolvedRoot, '.evo', 'config.yml'))
    ? 'EVO_MANAGED'
    : !relativeFiles.some(isEstablishedProjectFile)
      ? 'GREENFIELD'
      : 'BROWNFIELD'

  const languages = discoverLanguages(relativeFiles)
  const packageEvidence = await readPackageEvidence(resolvedRoot, relativeFiles)
  const textEvidence = await readSelectedText(resolvedRoot, relativeFiles)
  const frameworks = discoverFrameworks(relativeFiles, packageEvidence, textEvidence)
  const technologies = discoverTechnologies(relativeFiles, languages, frameworks, packageEvidence, textEvidence)
  const areas = discoverRepositoryAreas(relativeFiles)
  const commands = discoverCommands(relativeFiles, packageEvidence, frameworks)
  const authorities = discoverAuthorities(relativeFiles)
  const capabilities = discoverCapabilities(relativeFiles, textEvidence)
  const references = discoverReferences(relativeFiles, textEvidence)
  const unknowns = discoverUnknowns(mode, commands, authorities, frameworks, technologies, relativeFiles, inventory.truncated)
  const confidence = discoveryConfidence(frameworks, commands, authorities, inventory.truncated)

  return {
    root: resolvedRoot,
    projectName: path.basename(resolvedRoot),
    mode,
    generatedAt: new Date().toISOString(),
    confidence,
    filesScanned: relativeFiles.length,
    truncated: inventory.truncated,
    languages,
    frameworks,
    technologies,
    areas,
    commands,
    authorities,
    capabilities,
    references,
    unknowns,
  }
}

async function collectFiles(root: string, maximumFiles: number): Promise<FileInventory> {
  const files: string[] = []
  const pending = [root]
  let truncated = false

  while (pending.length > 0) {
    const current = pending.pop()
    if (!current) break
    const entries = await readdir(current, {withFileTypes: true})
    entries.sort((left, right) => left.name.localeCompare(right.name))
    for (const entry of entries) {
      if (entry.name === '.evo' && current === root) continue
      const target = path.join(current, entry.name)
      if (entry.isDirectory()) {
        if (!ignoredDirectories.has(entry.name)) pending.push(target)
        continue
      }
      if (!entry.isFile()) continue
      files.push(target)
      if (files.length >= maximumFiles) {
        truncated = true
        return {files, truncated}
      }
    }
  }
  return {files, truncated}
}

function discoverLanguages(files: readonly string[]): DiscoveryEvidence[] {
  const counts = new Map<string, number>()
  const examples = new Map<string, string[]>()
  for (const file of files) {
    const language = languageByExtension.get(path.extname(file).toLowerCase())
    if (!language) continue
    counts.set(language, (counts.get(language) ?? 0) + 1)
    const items = examples.get(language) ?? []
    if (items.length < 3) items.push(file)
    examples.set(language, items)
  }
  return [...counts.entries()]
    .sort(([, left], [, right]) => right - left)
    .map(([name, count]) => ({name: `${name} (${count} files)`, evidence: examples.get(name) ?? []}))
}

interface PackageEvidence {
  readonly manifests: readonly PackageManifestEvidence[]
}

interface PackageManifestEvidence {
  readonly path: string
  readonly dependencies: ReadonlySet<string>
  readonly versions: Readonly<Record<string, string>>
  readonly engines: Readonly<Record<string, string>>
  readonly scripts: Readonly<Record<string, string>>
}

async function readPackageEvidence(root: string, files: readonly string[]): Promise<PackageEvidence> {
  const packagePaths = files.filter((file) => file === 'package.json' || file.endsWith('/package.json')).slice(0, 20)
  const manifests: PackageManifestEvidence[] = []
  for (const packagePath of packagePaths) {
    try {
      const value = JSON.parse(await readFile(path.join(root, packagePath), 'utf8')) as Record<string, unknown>
      const dependencies = new Set<string>()
      const versions: Record<string, string> = {}
      const engines: Record<string, string> = {}
      const scripts: Record<string, string> = {}
      for (const field of ['dependencies', 'devDependencies', 'peerDependencies']) {
        const entries = value[field]
        if (entries && typeof entries === 'object') {
          for (const [dependency, version] of Object.entries(entries)) {
            dependencies.add(dependency)
            if (typeof version === 'string') versions[dependency] = version
          }
        }
      }
      if (value.engines && typeof value.engines === 'object') {
        for (const [name, version] of Object.entries(value.engines)) {
          if (typeof version === 'string') engines[name] = version
        }
      }
      if (value.scripts && typeof value.scripts === 'object') {
        for (const [name, command] of Object.entries(value.scripts)) {
          if (typeof command === 'string') scripts[name] = command
        }
      }
      manifests.push({path: packagePath, dependencies, versions, engines, scripts})
    } catch {
      // Malformed package metadata is reported later as an unknown instead of aborting archaeology.
    }
  }
  return {manifests}
}

async function readSelectedText(root: string, files: readonly string[]): Promise<Map<string, string>> {
  const interesting = files.filter((file) => {
    const extension = path.extname(file).toLowerCase()
    return (
      ['.gradle', '.java', '.json', '.kts', '.md', '.properties', '.py', '.sh', '.sql', '.toml', '.ts', '.tsx', '.txt', '.vue', '.xml', '.yml', '.yaml'].includes(extension) ||
      ['Dockerfile', 'Makefile', 'requirements.txt'].includes(path.basename(file))
    )
  }).slice(0, 800)
  const entries = await Promise.all(interesting.map(async (file): Promise<readonly [string, string] | null> => {
    try {
      const source = await readFile(path.join(root, file), 'utf8')
      return [file, source.slice(0, 256_000)] as const
    } catch {
      // Binary, unreadable, or transient files do not invalidate the rest of discovery.
      return null
    }
  }))
  return new Map(entries.filter((entry): entry is readonly [string, string] => entry !== null))
}

function discoverFrameworks(
  files: readonly string[],
  packages: PackageEvidence,
  contents: ReadonlyMap<string, string>,
): DiscoveryEvidence[] {
  const found = new Map<string, Set<string>>()
  const add = (name: string, evidence: string): void => {
    const values = found.get(name) ?? new Set<string>()
    values.add(evidence)
    found.set(name, values)
  }

  for (const manifest of packages.manifests) {
    if (manifest.dependencies.has('react')) add('React', manifest.path)
    if (manifest.dependencies.has('vue')) add('Vue', manifest.path)
    if (manifest.dependencies.has('@umijs/max')) add('Umi Max', manifest.path)
    if (manifest.dependencies.has('antd')) add('Ant Design', manifest.path)
    if (manifest.dependencies.has('@ant-design/pro-components')) add('Ant Design Pro', manifest.path)
    if (manifest.dependencies.has('next')) add('Next.js', manifest.path)
    if (manifest.dependencies.has('vite')) add('Vite', manifest.path)
    if (manifest.dependencies.has('@oclif/core')) add('oclif', manifest.path)
  }

  for (const file of files) {
    const lower = file.toLowerCase()
    if (lower.endsWith('pom.xml') || lower.endsWith('build.gradle') || lower.endsWith('build.gradle.kts')) {
      const source = contents.get(file) ?? ''
      if (/spring-boot/iu.test(source)) add('Spring Boot', file)
      if (/ruoyi/iu.test(source)) add('RuoYi', file)
    }
    if (['requirements.txt', 'pyproject.toml'].includes(path.basename(lower))) {
      const source = contents.get(file) ?? ''
      if (/fastapi/iu.test(source)) add('FastAPI', file)
      if (/django/iu.test(source)) add('Django', file)
      if (/flask/iu.test(source)) add('Flask', file)
    }
  }

  return [...found.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([name, evidence]) => ({name, evidence: [...evidence].slice(0, 5)}))
}

function discoverTechnologies(
  files: readonly string[],
  languages: readonly DiscoveryEvidence[],
  frameworks: readonly DiscoveryEvidence[],
  packages: PackageEvidence,
  contents: ReadonlyMap<string, string>,
): TechnologyObservation[] {
  const found = new Map<string, TechnologyObservation>()
  const add = (
    name: string,
    version: string | null,
    confidence: TechnologyConfidence,
    evidence: readonly string[],
  ): void => {
    if (evidence.length === 0) return
    const existing = found.get(name)
    if (!existing) {
      found.set(name, {name, version, confidence, evidence: [...evidence].sort().slice(0, 5)})
      return
    }
    const versions = new Set([existing.version, version].filter((item): item is string => item !== null))
    const mergedVersion = versions.size === 1 ? [...versions][0] ?? null : versions.size === 0 ? null : null
    const mergedConfidence = versions.size > 1 ? 'UNKNOWN' : strongerConfidence(existing.confidence, confidence)
    found.set(name, {
      name,
      version: mergedVersion,
      confidence: mergedConfidence,
      evidence: [...new Set([...existing.evidence, ...evidence])].sort().slice(0, 5),
    })
  }

  for (const language of languages) {
    const name = language.name.replace(/\s+\(\d+ files\)$/u, '')
    add(name, name === 'Java' ? findXmlPropertyVersion(contents, 'java.version') : null, 'CONFIRMED', language.evidence)
  }

  const pomFiles = files.filter(isMavenDescriptor)
  if (pomFiles.length > 0) add('Maven', null, 'CONFIRMED', pomFiles)
  if (packages.manifests.length > 0) {
    const manifestPaths = packages.manifests.map((item) => item.path)
    const nodeVersion = findEngineVersion(packages, 'node')
    add('Node.js', nodeVersion, nodeVersion ? 'CONFIRMED' : 'INFERRED', manifestPaths)
    if (files.includes('pnpm-lock.yaml')) add('pnpm', null, 'CONFIRMED', ['pnpm-lock.yaml'])
    if (files.includes('yarn.lock')) add('Yarn', null, 'CONFIRMED', ['yarn.lock'])
    if (files.includes('package-lock.json')) add('npm', null, 'CONFIRMED', ['package-lock.json'])
  }

  for (const framework of frameworks) {
    add(framework.name, frameworkVersion(framework.name, packages, contents), 'CONFIRMED', framework.evidence)
  }

  const signals: ReadonlyArray<{
    readonly name: string
    readonly direct: RegExp
    readonly inferred: RegExp
    readonly versionProperty: string
  }> = [
    {name: 'MySQL', direct: /(?:mysql-connector|com\.mysql|jdbc:mysql:)/iu, inferred: /(?:helperDialect\s*[:=]\s*mysql|driver-class-name\s*[:=]\s*com\.mysql)/iu, versionProperty: 'mysql.version'},
    {name: 'Redis', direct: /(?:spring-boot-starter-data-redis|spring\.redis|spring\.data\.redis)/iu, inferred: /(?:RedisTemplate|redisTemplate)/u, versionProperty: 'redis.version'},
    {name: 'MyBatis', direct: /(?:mybatis-spring-boot|org\.mybatis|mybatis:)/iu, inferred: /(?:@Mapper|SqlSessionFactory|MapperScan)/u, versionProperty: 'mybatis-spring-boot.version'},
    {name: 'Spring Security', direct: /(?:spring-boot-starter-security|org\.springframework\.security)/iu, inferred: /(?:@PreAuthorize|SecurityConfig)/u, versionProperty: 'spring-security.version'},
  ]
  for (const signal of signals) {
    const directEvidence = matchingContentFiles(contents, signal.direct)
    const inferredEvidence = matchingContentFiles(contents, signal.inferred)
    const evidence = [...new Set([...directEvidence, ...inferredEvidence])]
    if (evidence.length === 0) continue
    const version = findXmlPropertyVersion(contents, signal.versionProperty)
    add(signal.name, version, directEvidence.length > 0 || version !== null ? 'CONFIRMED' : 'INFERRED', evidence)
  }

  return [...found.values()].sort((left, right) => left.name.localeCompare(right.name))
}

function discoverRepositoryAreas(files: readonly string[]): RepositoryArea[] {
  const grouped = new Map<string, string[]>()
  for (const file of files) {
    const separator = file.indexOf('/')
    const area = separator === -1 ? '.' : file.slice(0, separator)
    const entries = grouped.get(area) ?? []
    entries.push(file)
    grouped.set(area, entries)
  }
  return [...grouped.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([area, evidence]) => ({
      path: area,
      kind: repositoryAreaKind(area, evidence),
      evidence: [...evidence].sort().slice(0, 5),
    }))
}

function repositoryAreaKind(area: string, files: readonly string[]): RepositoryAreaKind {
  const lower = area.toLowerCase()
  if (area === '.') return 'config'
  if (lower.endsWith('-admin') || ['admin', 'backend', 'server', 'api'].includes(lower)) return 'backend'
  if (lower.endsWith('-common') || lower.endsWith('-framework') || ['shared', 'common'].includes(lower)) return 'shared'
  if (lower === 'sql' || lower === 'database' || lower === 'db') return 'database'
  if (['doc', 'docs', 'documentation'].includes(lower)) return 'docs'
  if (['test', 'tests', '__tests__'].includes(lower)) return 'tests'
  if (lower === 'frontend' || lower === 'web' || lower === 'ui' || lower.includes('frontend')) return 'frontend'
  if (lower === 'src' && files.some((file) => /\.(?:vue|jsx|tsx)$/u.test(file))) return 'frontend'
  if (lower === 'src' && files.some((file) => /src\/main\/.*\.java$/u.test(file))) return 'backend'
  if (files.some((file) => path.basename(file).toLowerCase() === 'pom.xml')) return 'module'
  if (['.github', '.gitlab', 'config', 'configs', 'scripts'].includes(lower)) return 'config'
  return 'other'
}

function frameworkVersion(name: string, packages: PackageEvidence, contents: ReadonlyMap<string, string>): string | null {
  const packageNames: Readonly<Record<string, string>> = {
    React: 'react',
    Vue: 'vue',
    'Umi Max': '@umijs/max',
    'Ant Design': 'antd',
    'Ant Design Pro': '@ant-design/pro-components',
    'Next.js': 'next',
    Vite: 'vite',
    oclif: '@oclif/core',
  }
  const packageName = packageNames[name]
  if (packageName) return findPackageVersion(packages, packageName)
  if (name === 'Spring Boot') return findXmlPropertyVersion(contents, 'spring-boot.version')
  if (name === 'RuoYi') return findXmlPropertyVersion(contents, 'ruoyi.version')
  if (['FastAPI', 'Django', 'Flask'].includes(name)) return findPythonDependencyVersion(contents, name.toLowerCase())
  return null
}

function findPackageVersion(packages: PackageEvidence, name: string): string | null {
  const versions = packages.manifests
    .filter((manifest) => manifest.dependencies.has(name))
    .map((manifest) => manifest.versions[name])
    .filter((version): version is string => typeof version === 'string')
  return versions[0] ?? null
}

function findEngineVersion(packages: PackageEvidence, name: string): string | null {
  const versions = packages.manifests
    .map((manifest) => manifest.engines[name])
    .filter((version): version is string => typeof version === 'string')
  return versions[0] ?? null
}

function findXmlPropertyVersion(contents: ReadonlyMap<string, string>, property: string): string | null {
  const escaped = escapeRegExp(property)
  const pattern = new RegExp(`<${escaped}>\\s*([^<\\s]+)\\s*</${escaped}>`, 'iu')
  for (const [, source] of [...contents.entries()].sort(([left], [right]) => left.localeCompare(right))) {
    const match = pattern.exec(source)
    if (match?.[1] && !match[1].includes('${')) return match[1]
  }
  return null
}

function findPythonDependencyVersion(contents: ReadonlyMap<string, string>, dependency: string): string | null {
  const pattern = new RegExp(`^\\s*${escapeRegExp(dependency)}\\s*(?:==|~=|>=)\\s*([0-9][^\\s;,#]*)`, 'imu')
  for (const [, source] of [...contents.entries()].sort(([left], [right]) => left.localeCompare(right))) {
    const match = pattern.exec(source)
    if (match?.[1]) return match[1]
  }
  return null
}

function matchingContentFiles(
  contents: ReadonlyMap<string, string>,
  pattern: RegExp,
  sourcePredicate: (file: string) => boolean = isTechnologySource,
): string[] {
  return [...contents.entries()]
    .filter(([file]) => sourcePredicate(file))
    .filter(([, source]) => pattern.test(source))
    .map(([file]) => file)
    .sort()
    .slice(0, 5)
}

function strongerConfidence(left: TechnologyConfidence, right: TechnologyConfidence): TechnologyConfidence {
  const rank: Readonly<Record<TechnologyConfidence, number>> = {UNKNOWN: 0, INFERRED: 1, CONFIRMED: 2}
  return rank[left] >= rank[right] ? left : right
}

function escapeRegExp(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/gu, '\\$&')
}

function isTechnologySource(file: string): boolean {
  const normalized = file.toLowerCase()
  if (['doc', 'docs', 'example', 'examples', 'fixture', 'fixtures', 'test', 'tests'].some((segment) => normalized.split('/').includes(segment))) return false
  return ['.gradle', '.java', '.kts', '.properties', '.xml', '.yml', '.yaml'].includes(path.extname(normalized))
}

function discoverCommands(
  files: readonly string[],
  packages: PackageEvidence,
  frameworks: readonly DiscoveryEvidence[],
): DiscoveredCommand[] {
  const commands: DiscoveredCommand[] = []
  for (const manifest of packages.manifests) {
    const scriptNames = Object.keys(manifest.scripts).sort()
    for (const script of scriptNames) {
      const purpose = scriptPurpose(script)
      if (!purpose) continue
      commands.push({
        purpose,
        command: packageScriptCommand(files, manifest.path, script),
        evidence: `${manifest.path}#scripts.${script}`,
      })
    }
  }
  if (files.includes('mvnw')) {
    commands.push({purpose: 'build', command: './mvnw package', evidence: 'mvnw'})
    commands.push({purpose: 'test', command: './mvnw test', evidence: 'mvnw'})
    if (frameworks.some((item) => item.name === 'Spring Boot')) {
      commands.push({purpose: 'run', command: './mvnw spring-boot:run', evidence: 'mvnw + Spring Boot metadata'})
    }
  } else if (files.some((file) => file.endsWith('pom.xml'))) {
    commands.push({purpose: 'build', command: 'mvn package', evidence: 'pom.xml'})
    commands.push({purpose: 'test', command: 'mvn test', evidence: 'pom.xml'})
  }
  if (files.includes('gradlew')) commands.push({purpose: 'test', command: './gradlew test', evidence: 'gradlew'})
  if (files.includes('Makefile')) commands.push({purpose: 'build', command: 'make', evidence: 'Makefile'})
  if (files.includes('scripts/check')) commands.push({purpose: 'check', command: 'bash scripts/check', evidence: 'scripts/check'})
  for (const candidate of ['bin/run.sh', 'scripts/run.sh', 'scripts/dev.sh', 'run.sh']) {
    if (files.includes(candidate)) commands.push({purpose: 'run', command: `bash ${candidate}`, evidence: candidate})
  }
  if (files.includes('ry.sh')) {
    commands.push({purpose: 'run', command: 'bash ry.sh start', evidence: 'ry.sh'})
    commands.push({purpose: 'observe', command: 'bash ry.sh status', evidence: 'ry.sh'})
  }
  if (files.some((file) => file.endsWith('pyproject.toml')) || files.includes('requirements.txt')) {
    commands.push({purpose: 'test', command: 'python -m pytest', evidence: 'Python project metadata; confirm configured test runner'})
  }
  if (files.includes('docker-compose.yml') || files.includes('compose.yml')) {
    commands.push({purpose: 'run', command: 'docker compose up', evidence: 'Compose configuration'})
  }
  return deduplicateCommands(commands)
}

function discoverAuthorities(files: readonly string[]): AuthorityCandidate[] {
  const candidates: Array<[string, readonly string[]]> = [
    ['standing-rules', ['AGENTS.md', 'CLAUDE.md']],
    ['project-overview', ['README.md', 'README.zh-CN.md', 'README_CN.md']],
    ['architecture', ['docs/architecture.md', 'docs/ARCHITECTURE.md', 'ARCHITECTURE.md']],
    ['domain-language', ['CONTEXT.md', 'docs/domain.md', 'docs/glossary.md']],
    ['testing', ['docs/testing.md', 'CONTRIBUTING.md']],
    ['operations', ['docs/operations.md', 'docs/runbook.md', 'RUNBOOK.md']],
    ['api-contract', ['openapi.yaml', 'openapi.json', 'docs/openapi.yaml', 'contracts/openapi/openapi.yaml']],
  ]
  return candidates.flatMap(([topic, options]) => {
    const selected = options.find((option) => files.includes(option))
    return selected ? [{topic, path: selected}] : []
  })
}

function discoverCapabilities(files: readonly string[], contents: ReadonlyMap<string, string>): DiscoveryEvidence[] {
  const patterns: Array<[string, RegExp]> = [
    ['authentication', /(?:class\s+TokenService\b|SecurityFilterChain\b|def\s+authenticate\b|function\s+authenticate\b|@\w+\.(?:post|get)\([^\n]*login)/iu],
    ['authorization', /(?:@PreAuthorize\s*\(|hasPermission\s*\(|requireRole\s*\(|casbin\.(?:Enforcer|newEnforcer))/u],
    ['data permission', /(?:@DataScope\b|apply_data_scope\s*\()/u],
    ['pagination', /(?:startPage\s*\(|PageHelper\.|\.paginate\s*\()/u],
    ['standard response', /(?:class\s+ApiResponse\b|AjaxResult\.)/u],
    ['audit logging', /(?:@Log\s*\(|class\s+AuditEvent\b|recordAudit\s*\()/u],
    ['export', /(?:ExcelUtil\.|writeXlsx\s*\(|exportCsv\s*\()/u],
  ]
  const sourceEntries = [...contents.entries()].filter(([file]) => isCapabilitySource(file))
  const capabilities = patterns.flatMap(([name, pattern]) => {
    const evidence = sourceEntries
      .filter(([, source]) => pattern.test(source))
      .map(([file]) => file)
      .slice(0, 5)
    return evidence.length > 0 ? [{name, evidence}] : []
  })
  const migrationEvidence = files.filter((file) =>
    /(?:^|\/)(?:alembic\.ini|migrations\/|db\/migration\/|liquibase\/)/u.test(file),
  ).slice(0, 5)
  if (migrationEvidence.length > 0) capabilities.push({name: 'database migration', evidence: migrationEvidence})
  return capabilities
}

function discoverReferences(files: readonly string[], contents: ReadonlyMap<string, string>): string[] {
  const scored = files.filter(isRuntimeSource).map((file) => {
    let score = 0
    const base = path.basename(file)
    if (/SysUserController\.java$/u.test(base)) score += 20
    if (/(?:Controller|Router|Handler|Service)\.(?:java|kt|py|ts)$/u.test(base)) score += 8
    if (/(?:^|\/)(?:api|controllers|handlers|pages|routers|routes|services)\//u.test(file)) score += 8
    if (/^(?:goal|init|project|scanner)\.(?:java|kt|py|ts)$/u.test(base)) score += 3
    if (file.startsWith('src/main/')) score += 3
    else if (file.startsWith('src/')) score += 1
    const source = contents.get(file) ?? ''
    if (/\bexport\s+(?:async\s+)?(?:class|function|const|interface|type)\b/u.test(source)) score += 2
    if (/\bexport\s+default\b/u.test(source)) score += 2
    if (/(?:\bAPIRouter\s*\(|@\w*router\.|\bFastAPI\s*\()/u.test(source)) score += 5
    if (!/(?:scanner|detector|analy[sz]er)\.[^.]+$/iu.test(base) && /(?:@PreAuthorize|DataScope|AjaxResult|startPage\()/u.test(source)) score += 5
    return {file, score}
  })
  return scored
    .filter((item) => item.score > 0)
    .sort((left, right) => right.score - left.score || left.file.localeCompare(right.file))
    .slice(0, 10)
    .map((item) => item.file)
}

function discoverUnknowns(
  mode: ProjectMode,
  commands: readonly DiscoveredCommand[],
  authorities: readonly AuthorityCandidate[],
  frameworks: readonly DiscoveryEvidence[],
  technologies: readonly TechnologyObservation[],
  files: readonly string[],
  truncated: boolean,
): string[] {
  const unknowns: string[] = []
  if (mode === 'GREENFIELD') unknowns.push('Product requirements and foundation choice require human Decisions before bootstrap.')
  if (frameworks.length === 0 && mode !== 'GREENFIELD') unknowns.push('No framework could be confirmed from inspected metadata.')
  if (!commands.some((item) => item.purpose === 'test')) unknowns.push('No confirmed test entry path was found.')
  if (!commands.some((item) => item.purpose === 'run')) unknowns.push('No confirmed application run entry path was found.')
  if (!authorities.some((item) => item.topic === 'architecture')) unknowns.push('No explicit architecture authority document was found.')
  if (!files.some((file) => file.startsWith('.github/workflows/') || file.startsWith('.gitlab-ci'))) {
    unknowns.push('No supported CI configuration was confirmed.')
  }
  const versionBearing = new Set(['Java', 'Node.js', 'Spring Boot', 'RuoYi', 'MySQL', 'Redis', 'MyBatis', 'Spring Security', 'Vue', 'Vite', 'React', 'FastAPI', 'Django', 'Flask'])
  for (const technology of technologies) {
    if (versionBearing.has(technology.name) && technology.version === null) {
      unknowns.push(`Version for ${technology.name} was not confirmed from repository metadata.`)
    }
  }
  if (truncated) unknowns.push('Repository scan reached its file limit; findings are incomplete.')
  return unknowns
}

function isMavenDescriptor(file: string): boolean {
  return file === 'pom.xml' || file.endsWith('/pom.xml')
}

function discoveryConfidence(
  frameworks: readonly DiscoveryEvidence[],
  commands: readonly DiscoveredCommand[],
  authorities: readonly AuthorityCandidate[],
  truncated: boolean,
): 'LOW' | 'MEDIUM' | 'HIGH' {
  if (truncated) return 'LOW'
  const score = (frameworks.length > 0 ? 1 : 0) +
    (commands.some((item) => item.purpose === 'test') ? 1 : 0) +
    (commands.some((item) => item.purpose === 'run') ? 1 : 0) +
    (authorities.length > 1 ? 1 : 0)
  return score >= 4 ? 'HIGH' : score >= 2 ? 'MEDIUM' : 'LOW'
}

function deduplicateCommands(commands: readonly DiscoveredCommand[]): DiscoveredCommand[] {
  const seen = new Set<string>()
  return commands.filter((item) => {
    const key = `${item.purpose}:${item.command}`
    if (seen.has(key)) return false
    seen.add(key)
    return true
  })
}

function toPosix(value: string): string {
  return value.split(path.sep).join('/')
}

function isCapabilitySource(file: string): boolean {
  const normalized = file.toLowerCase()
  const segments = normalized.split('/')
  const topLevelNonRuntime = new Set(['doc', 'docs', 'example', 'examples', 'fixture', 'fixtures', 'skill', 'skills', 'template', 'templates', 'test', 'tests'])
  if (topLevelNonRuntime.has(segments[0] ?? '')) return false
  if (segments.some((segment) => ['__tests__', 'fixtures', 'test', 'tests'].includes(segment))) return false
  if (/(?:\.test|\.spec)\.[^.]+$/u.test(normalized)) return false
  if (/(?:scanner|detector|analy[sz]er)\.[^.]+$/u.test(normalized)) return false
  return ['.cs', '.go', '.java', '.js', '.kt', '.php', '.py', '.rb', '.rs', '.ts', '.tsx'].includes(path.extname(normalized))
}

function isRuntimeSource(file: string): boolean {
  const normalized = file.toLowerCase()
  const segments = normalized.split('/')
  const nonRuntimeRoots = new Set(['doc', 'docs', 'example', 'examples', 'fixture', 'fixtures', 'skill', 'skills', 'template', 'templates', 'test', 'tests'])
  if (nonRuntimeRoots.has(segments[0] ?? '')) return false
  if (segments.some((segment) => ['__tests__', 'fixtures', 'test', 'tests'].includes(segment))) return false
  if (segments.some((segment) => ['.umi', '.umi-production', '__generated__', 'generated'].includes(segment))) return false
  if (/(?:\.test|\.spec)\.[^.]+$/u.test(normalized)) return false
  if (path.basename(normalized) === '__init__.py') return false
  return ['.cs', '.go', '.java', '.js', '.kt', '.php', '.py', '.rb', '.rs', '.ts', '.tsx', '.vue'].includes(path.extname(normalized))
}

function isEstablishedProjectFile(file: string): boolean {
  const base = path.basename(file).toLowerCase()
  if (['cargo.toml', 'composer.json', 'go.mod', 'package.json', 'pom.xml', 'pyproject.toml', 'requirements.txt'].includes(base)) return true
  if (/(?:^|\/)(?:src|app|apps|packages|test|tests)\//u.test(file.toLowerCase())) {
    return languageByExtension.has(path.extname(file).toLowerCase())
  }
  return isRuntimeSource(file)
}

function scriptPurpose(script: string): DiscoveredCommand['purpose'] | null {
  if (/(?:^|:)watch$/u.test(script)) return null
  if (script === 'build' || script.startsWith('build:')) return 'build'
  if (script === 'test' || script.startsWith('test:')) return 'test'
  if (script === 'typecheck' || script.startsWith('typecheck:')) return 'typecheck'
  if (script === 'lint' || script.startsWith('lint:')) return 'lint'
  if (['dev', 'serve', 'start'].includes(script) || /^(?:dev|serve|start):/u.test(script)) return 'run'
  if (['check', 'verify'].includes(script) || /^(?:check|verify):/u.test(script)) return 'check'
  return null
}

function packageScriptCommand(files: readonly string[], packagePath: string, script: string): string {
  const directory = path.posix.dirname(packagePath) === '.' ? '' : path.posix.dirname(packagePath)
  const local = (filename: string): string => directory ? `${directory}/${filename}` : filename
  const hasLocalLock = ['pnpm-lock.yaml', 'yarn.lock', 'package-lock.json'].some((filename) => files.includes(local(filename)))
  const manager = files.includes(local('pnpm-lock.yaml')) || (!hasLocalLock && files.includes('pnpm-lock.yaml'))
    ? 'pnpm'
    : files.includes(local('yarn.lock')) || (!hasLocalLock && files.includes('yarn.lock'))
      ? 'yarn'
      : 'npm'
  if (!directory) {
    if (manager === 'pnpm') return `pnpm ${script}`
    if (manager === 'yarn') return `yarn ${script}`
    return `npm run ${script}`
  }
  if (manager === 'pnpm') return `pnpm --dir ${quoteCommandArgument(directory)} ${script}`
  if (manager === 'yarn') return `yarn --cwd ${quoteCommandArgument(directory)} ${script}`
  return `npm --prefix ${quoteCommandArgument(directory)} run ${script}`
}

function quoteCommandArgument(value: string): string {
  return /^[A-Za-z0-9_./-]+$/u.test(value) ? value : `'${value.replaceAll("'", "'\\''")}'`
}
