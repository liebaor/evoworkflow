import {mkdtemp, mkdir, readFile, rm, writeFile} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import path from 'node:path'

import {universalSkillForRecommendation} from '../src/core/navigation.js'
import {StateSchema} from '../src/core/schemas.js'
import {inspectAgentCompatibility, runAgentDoctor} from '../src/agents/compatibility.js'
import {setupAgentCompatibility} from '../src/agents/setup.js'
import {buildRecoveryReport} from '../src/repository/recovery.js'
import {buildSkillManifest, readSkillManifest, writeSkillManifest} from '../src/repository/skill-manifest.js'
import {pathExists, readYaml, writeYaml} from '../src/repository/io.js'
import {applyInitialization, planInitialization} from '../src/repository/init.js'
import {repositoryPaths} from '../src/repository/paths.js'

const packageRoot = path.resolve('.')
const roots: string[] = []
const results: string[] = []

try {
  await evalCanonicalSkills()
  await evalManifestReproducibility()
  await evalClaudeBridge()
  await evalNoOverwrite()
  await evalDuplicateDiscovery()
  await evalMissingClientNonFatal()
  await evalSkillVersionDrift()
  await evalUniversalRouter()
  await evalRecoveryContract()
  await evalSingleWriterBoundary()
} finally {
  await Promise.all(roots.map((root) => rm(root, {recursive: true, force: true})))
}

process.stdout.write(`${results.join('\n')}\nCross-agent deterministic evaluations E401-E410 passed.\n`)

async function evalCanonicalSkills(): Promise<void> {
  const manifest = await buildSkillManifest(packageRoot)
  const actual = await readSkillManifest(packageRoot)
  ensure(JSON.stringify(actual) === JSON.stringify(manifest), 'E401 canonical manifest is not reproducible')
  ensure(manifest.skills.length === 20, `E401 expected 20 canonical Skills, found ${manifest.skills.length}`)
  for (const skill of manifest.skills) {
    const source = await readFile(path.join(packageRoot, 'skills', skill.name, 'SKILL.md'), 'utf8')
    ensure(source.includes(`name: ${skill.name}`) && source.includes('## Objective') && source.includes('## Required outcomes'), `E401 canonical Skill contract failed for ${skill.name}`)
  }
  record('E401', 'Canonical Skills have one validated source and complete manifest entries.')
}

async function evalManifestReproducibility(): Promise<void> {
  const root = await fixtureRoot('e402')
  await writeFiles(root, {
    'package.json': '{"name":"manifest-fixture","version":"0.4.0"}\n',
    'skills/evo-alpha/SKILL.md': fixtureSkill('evo-alpha'),
    'skills/evo-beta/SKILL.md': fixtureSkill('evo-beta'),
  })
  const first = await buildSkillManifest(root)
  await writeSkillManifest(root, first)
  await rm(path.join(root, 'skills', 'manifest.json'))
  const rebuilt = await buildSkillManifest(root)
  ensure(JSON.stringify(first) === JSON.stringify(rebuilt), 'E402 rebuilding the manifest changed its content')
  record('E402', 'Deleting and rebuilding a derived Skill manifest produces identical content.')
}

async function evalClaudeBridge(): Promise<void> {
  const root = await fixtureRoot('e403')
  await writeFiles(root, {'AGENTS.md': '# Canonical rules\n'})
  const before = await setupAgentCompatibility(root, {now: new Date('2026-01-01T00:00:00.000Z')})
  ensure(before.mode === 'PREVIEW' && before.action === 'CREATE_CLAUDE_BRIDGE' && !(await pathExists(path.join(root, 'CLAUDE.md'))), 'E403 setup preview wrote or misreported the bridge')
  const applied = await setupAgentCompatibility(root, {apply: true, now: new Date('2026-01-01T00:00:01.000Z')})
  ensure(applied.action === 'ALREADY_CONFIGURED' && await readFile(path.join(root, 'CLAUDE.md'), 'utf8') === '@AGENTS.md\n', 'E403 setup did not create the exact Claude bridge')
  record('E403', 'Claude bridge preview is read-only and explicit apply creates the exact thin bridge.')
}

async function evalNoOverwrite(): Promise<void> {
  const root = await fixtureRoot('e404')
  await writeFiles(root, {'AGENTS.md': '# Canonical rules\n', 'CLAUDE.md': '# User-owned instructions\n'})
  const report = await setupAgentCompatibility(root, {apply: true})
  ensure(report.action === 'NEEDS_HUMAN_MERGE' && await readFile(path.join(root, 'CLAUDE.md'), 'utf8') === '# User-owned instructions\n', 'E404 setup overwrote an existing Claude file')
  record('E404', 'Existing Claude instructions are preserved and require human merge.')
}

async function evalDuplicateDiscovery(): Promise<void> {
  const root = await fixtureRoot('e405')
  const home = path.join(root, 'home')
  await writeFiles(root, {
    'package.json': '{"name":"duplicate-fixture","version":"0.4.0"}\n',
    'AGENTS.md': '# Canonical rules\n',
    'CLAUDE.md': '@AGENTS.md\n',
    'skills/evo-example/SKILL.md': fixtureSkill('evo-example'),
    'home/.claude/skills/evo-example/SKILL.md': fixtureSkill('evo-example'),
  })
  await writeSkillManifest(root, await buildSkillManifest(root))
  const report = await inspectAgentCompatibility(root, {homeDirectory: home, locateExecutable: async () => false})
  ensure(report.duplicateSkillIds.includes('evo-example') && report.diagnostics.some((item) => item.code === 'DUPLICATE_AGENT_SKILL'), 'E405 duplicate Skill source was not detected')
  record('E405', 'Equivalent Skill sources are reported as a duplicate instead of silently merged.')
}

async function evalMissingClientNonFatal(): Promise<void> {
  const root = await fixtureRoot('e406')
  await writeFiles(root, {
    'package.json': '{"name":"missing-client-fixture","version":"0.4.0"}\n',
    'AGENTS.md': '# Canonical rules\n',
    'skills/evo-example/SKILL.md': fixtureSkill('evo-example'),
  })
  await writeSkillManifest(root, await buildSkillManifest(root))
  const report = await inspectAgentCompatibility(root, {homeDirectory: root, locateExecutable: async () => false})
  ensure(!report.diagnostics.some((item) => item.severity === 'ERROR') && report.diagnostics.filter((item) => item.code.endsWith('_NOT_FOUND')).length === 3, 'E406 missing clients became a repository compatibility error')
  record('E406', 'Missing supported clients remain INFO and do not invalidate the repository protocol.')
}

async function evalSkillVersionDrift(): Promise<void> {
  const root = await fixtureRoot('e407')
  const home = path.join(root, 'home')
  await writeFiles(root, {
    'package.json': '{"name":"drift-fixture","version":"0.4.0"}\n',
    'AGENTS.md': '# Canonical rules\n',
    'skills/evo-example/SKILL.md': fixtureSkill('evo-example'),
    'home/.codex/skills/evo-example/SKILL.md': fixtureSkill('evo-example', 'drifted implementation'),
  })
  await writeSkillManifest(root, await buildSkillManifest(root))
  const report = await inspectAgentCompatibility(root, {homeDirectory: home, locateExecutable: async (command) => command === 'codex'})
  ensure(report.diagnostics.some((item) => item.code === 'SKILL_VERSION_DRIFT' && item.severity === 'ERROR'), 'E407 Skill hash drift was not detected')
  record('E407', 'Incompatible same-id Skill hashes are reported as version drift.')
}

async function evalUniversalRouter(): Promise<void> {
  const clients = ['codex', 'claude-code', 'opencode']
  const recommendations = clients.map(() => universalSkillForRecommendation('/evo-implement S1'))
  ensure(new Set(recommendations).size === 1 && recommendations[0] === 'evo-implement', 'E408 universal router produced different next Skills')
  record('E408', 'The same repository recommendation resolves to one harness-neutral next Skill.')
}

async function evalRecoveryContract(): Promise<void> {
  const root = await fixtureRoot('e409')
  await applyInitialization(await planInitialization(root))
  const paths = repositoryPaths(root)
  await writeFiles(root, {
    '.evo/work/active/continuity-change/change.md': '---\nid: continuity-change\nweight: STANDARD\nstatus: AWAITING_APPROVAL\napproval: null\n---\n\n# Continuity Feature\n\nA fresh Harness must recover this objective.\n',
    '.evo/work/active/continuity-change/plan.md': '---\nchange: continuity-change\nstatus: AWAITING_APPROVAL\napproval: null\n---\n\n# Plan\n\n## Execution Slices\n\n### S1 — Continuity feature\n\nThe current approved Slice remains the next action.\n',
  })
  const state = await readYaml(paths.state, StateSchema)
  await writeYaml(paths.state, {...state, activeChange: 'continuity-change', phase: 'PLAN', status: 'AWAITING_APPROVAL', currentSlice: null, slices: []})
  const reports = await Promise.all(['codex', 'claude-code', 'opencode', 'fresh'].map(() => buildRecoveryReport(root)))
  const inputs = reports.map((report) => `${report.activeChange}|${report.currentPhase}|${report.status}|${report.recommendedNextAction}`)
  ensure(new Set(inputs).size === 1 && reports.every((report) => report.currentObjective === 'Continuity Feature'), 'E409 fresh Harness recovery inputs diverged')
  record('E409', 'Fresh Harnesses receive the same objective, state, and recommended next action from Repository recovery.')
}

async function evalSingleWriterBoundary(): Promise<void> {
  const root = await fixtureRoot('e410')
  await writeFiles(root, {'AGENTS.md': '# Canonical rules\n'})
  await mkdir(path.join(root, '.git'), {recursive: true})
  await writeFile(path.join(root, '.git', 'index.lock'), 'active writer fixture\n', 'utf8')
  const report = await runAgentDoctor(root, {locateExecutable: async () => false})
  ensure(report.diagnostics.some((item) => item.code === 'MULTIPLE_WRITER_DETECTED') && (await readFile(path.join(root, '.git', 'index.lock'), 'utf8')).includes('active writer'), 'E410 doctor did not preserve the single-writer warning boundary')
  const operations = await readFile(path.join(packageRoot, 'docs', 'operations.md'), 'utf8')
  ensure(operations.includes('one checkout -> one executing writer'), 'E410 operating documentation lost the single-writer rule')
  record('E410', 'Doctor and operations documentation consistently expose the one-checkout/one-writer boundary.')
}

async function fixtureRoot(name: string): Promise<string> {
  const root = await mkdtemp(path.join(tmpdir(), `evoworkflow-cross-agent-${name}-`))
  roots.push(root)
  return root
}

async function writeFiles(root: string, files: Readonly<Record<string, string>>): Promise<void> {
  for (const [relative, contents] of Object.entries(files)) {
    const target = path.join(root, relative)
    await mkdir(path.dirname(target), {recursive: true})
    await writeFile(target, contents, 'utf8')
  }
}

function fixtureSkill(name: string, detail = 'canonical fixture behavior'): string {
  return `---\nname: ${name}\ndescription: A sufficiently descriptive canonical Skill fixture for cross-agent evaluation.\n---\n\n# ${name}\n\n## Objective\nUse the repository protocol.\n\n## Required outcomes\nRecord observable evidence.\n\n## Stop conditions\nStop on ambiguity.\n\n## Repository writes\n${detail}\n`
}

function record(id: string, detail: string): void {
  results.push(`PASS ${id}: ${detail}`)
}

function ensure(condition: boolean, message: string): asserts condition {
  if (!condition) throw new Error(message)
}
