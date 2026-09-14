import {buildSkillManifest, writeSkillManifest} from '../src/repository/skill-manifest.js'

const root = process.cwd()
const manifest = await buildSkillManifest(root)
const target = await writeSkillManifest(root, manifest)
process.stdout.write(`Generated ${manifest.skills.length} canonical Skills at ${target} for EVO ${manifest.evoVersion}.\n`)
