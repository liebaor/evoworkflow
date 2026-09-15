import {cp, mkdir, mkdtemp, readFile, rm, stat, writeFile} from 'node:fs/promises'
import {tmpdir} from 'node:os'
import path from 'node:path'

import {discoverAgentClients} from '../src/agents/discovery.js'
import {buildSkillManifest, hashSkillContent} from '../src/repository/skill-manifest.js'
import {applySkillInstallation, planSkillInstallation, planSkillUpdate} from '../src/skills/installation.js'
import {codexMetadataSkills, validateCodexMetadata} from '../src/skills/metadata.js'
import {inspectClaudeLink} from '../src/skills/links.js'

const root = path.resolve('.')
const temp = await mkdtemp(path.join(tmpdir(), 'evoworkflow-skill-evals-'))
const home = path.join(temp, 'home')
const source = path.join(temp, 'source')
const results: Array<{id: string; ok: boolean; detail: string}> = []

try {
  await mkdir(home, {recursive: true})
  await cp(path.join(root, 'skills'), path.join(source, 'skills'), {recursive: true})
  await cp(path.join(root, 'package.json'), path.join(source, 'package.json'))
  const manifest = await buildSkillManifest(source)
  const preview = await planSkillInstallation({sourceRoot: source, homeDirectory: home})
  results.push({id: 'E411', ok: preview.actions.length === manifest.skills.length && preview.actions.every((item) => item.action === 'INSTALL'), detail: 'clean HOME produces one canonical action per package Skill'})
  results.push({id: 'E412', ok: preview.mode === 'PREVIEW' && !(await exists(path.join(home, '.agents'))), detail: 'preview did not create runtime directories'})

  await applySkillInstallation(preview)
  const observations = await discoverAgentClients(path.join(temp, 'project'), {homeDirectory: home, locateExecutable: async () => false})
  const codex = observations.find((item) => item.client === 'codex')
  const opencode = observations.find((item) => item.client === 'opencode')
  results.push({id: 'E413', ok: codex?.skillSources.includes('~/.agents/skills') === true, detail: 'Codex contract points to canonical ~/.agents/skills'})
  results.push({id: 'E414', ok: opencode?.skillSources.includes('~/.agents/skills') === true, detail: 'OpenCode contract includes shared ~/.agents/skills'})

  const canonical = path.join(home, '.agents', 'skills')
  const claudeRoot = path.join(home, '.claude', 'skills')
  const link = await inspectClaudeLink('ask-evo', canonical, claudeRoot)
  results.push({id: 'E415', ok: ['CORRECT_SYMLINK', 'COPY_FALLBACK_CURRENT'].includes(link.status), detail: `Claude adapter status is ${link.status}`})

  const conflictHome = path.join(temp, 'conflict-home')
  await mkdir(path.join(conflictHome, '.claude', 'skills', 'ask-evo'), {recursive: true})
  await writeFile(path.join(conflictHome, '.claude', 'skills', 'ask-evo', 'SKILL.md'), 'user-owned\n', 'utf8')
  const conflict = await inspectClaudeLink('ask-evo', path.join(conflictHome, '.agents', 'skills'), path.join(conflictHome, '.claude', 'skills'))
  results.push({id: 'E416', ok: conflict.status === 'REAL_DIRECTORY_CONFLICT', detail: 'existing real Claude directory is blocked'})

  const wrongHome = path.join(temp, 'wrong-home')
  await mkdir(path.join(wrongHome, '.agents', 'skills', 'ask-evo'), {recursive: true})
  await mkdir(path.join(wrongHome, '.claude', 'skills'), {recursive: true})
  await cp(path.join(source, 'skills', 'ask-evo'), path.join(wrongHome, '.agents', 'skills', 'ask-evo'), {recursive: true})
  await cp(path.join(source, 'skills', 'evo-init'), path.join(wrongHome, '.claude', 'skills', 'ask-evo'), {recursive: true})
  const wrong = await inspectClaudeLink('ask-evo', path.join(wrongHome, '.agents', 'skills'), path.join(wrongHome, '.claude', 'skills'))
  results.push({id: 'E417', ok: wrong.status === 'REAL_DIRECTORY_CONFLICT', detail: `wrong or drifted Claude target is ${wrong.status}`})

  const copyHome = path.join(temp, 'copy-home')
  const copyCanonical = path.join(copyHome, '.agents', 'skills')
  const copyClaude = path.join(copyHome, '.claude', 'skills')
  await cp(path.join(source, 'skills', 'ask-evo'), path.join(copyCanonical, 'ask-evo'), {recursive: true})
  await cp(path.join(copyCanonical, 'ask-evo'), path.join(copyClaude, 'ask-evo'), {recursive: true})
  const oldHash = hashSkillContent(await readFile(path.join(copyClaude, 'ask-evo', 'SKILL.md'), 'utf8'))
  await writeFile(path.join(copyCanonical, 'ask-evo', 'SKILL.md'), `${await readFile(path.join(copyCanonical, 'ask-evo', 'SKILL.md'), 'utf8')}\ncanonical-update\n`, 'utf8')
  const copyDrift = await inspectClaudeLink('ask-evo', copyCanonical, copyClaude, {managedHash: oldHash})
  results.push({id: 'E418', ok: copyDrift.status === 'COPY_FALLBACK_DRIFT', detail: `managed COPY fallback drift is detected as ${copyDrift.status}`})

  const updateSource = path.join(temp, 'update-source')
  await cp(path.join(source, 'skills'), path.join(updateSource, 'skills'), {recursive: true})
  await cp(path.join(source, 'package.json'), path.join(updateSource, 'package.json'))
  await writeFile(path.join(updateSource, 'skills', 'ask-evo', 'SKILL.md'), `${await readFile(path.join(updateSource, 'skills', 'ask-evo', 'SKILL.md'), 'utf8')}\nupdate-eval\n`, 'utf8')
  const update = await planSkillUpdate({sourceRoot: updateSource, homeDirectory: home})
  results.push({id: 'E419', ok: update.actions.some((item) => item.name === 'ask-evo' && item.action === 'UPDATE_CANDIDATE'), detail: 'receipt-backed canonical update is identified without overwriting user changes'})

  const metadata = await Promise.all(codexMetadataSkills.map((skill) => validateCodexMetadata(root, skill)))
  results.push({id: 'E420', ok: metadata.every((item) => item.valid), detail: 'selected Codex native metadata validates and is package-visible'})
} catch (error) {
  for (const id of ['E411', 'E412', 'E413', 'E414', 'E415', 'E416', 'E417', 'E418', 'E419', 'E420']) results.push({id, ok: false, detail: error instanceof Error ? error.message : String(error)})
} finally {
  for (const result of results) process.stdout.write(`${result.ok ? 'PASS' : 'FAIL'} ${result.id}: ${result.detail}\n`)
  await rm(temp, {recursive: true, force: true})
}

if (results.some((result) => !result.ok)) process.exitCode = 1

async function exists(target: string): Promise<boolean> {
  try {
    await stat(target)
    return true
  } catch {
    return false
  }
}
