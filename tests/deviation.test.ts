import {execFile as execFileCallback} from 'node:child_process'
import {promisify} from 'node:util'
import {mkdir, writeFile} from 'node:fs/promises'
import {afterEach, describe, expect, it} from 'vitest'

import {detectImplementationAheadOfApproval, IMPLEMENTATION_AHEAD_OF_APPROVAL} from '../src/repository/deviation.js'
import {recordEvidence} from '../src/repository/evidence.js'
import {writeYaml} from '../src/repository/io.js'
import {repositoryPaths} from '../src/repository/paths.js'
import {buildRecoveryReport, formatRecoveryReport} from '../src/repository/recovery.js'
import {cleanupTemporaryRepositories, createActiveChange, initializeRepository, readState, temporaryRepository} from './helpers.js'

const execFile = promisify(execFileCallback)

afterEach(cleanupTemporaryRepositories)

describe('implementation-ahead-of-approval finding', () => {
  it('reports implementation evidence without granting retroactive approval', async () => {
    const root = await temporaryRepository('implementation-ahead')
    await initializeRepository(root)
    await createActiveChange(root)
    await execFile('git', ['init', '-q'], {cwd: root})
    await execFile('git', ['config', 'user.email', 'evo@test.invalid'], {cwd: root})
    await execFile('git', ['config', 'user.name', 'EVO Test'], {cwd: root})
    await execFile('git', ['add', '.'], {cwd: root})
    await execFile('git', ['commit', '-qm', 'baseline'], {cwd: root})
    await mkdir(`${root}/src`, {recursive: true})
    await writeFile(`${root}/src/feature.ts`, 'export const feature = true\n', 'utf8')

    await recordEvidence({
      root,
      changeId: 'change-one',
      acceptance: ['AC-01'],
      kind: 'integration',
      label: 'implementation evidence',
      status: 'PASS',
      summary: 'A source file was changed before the current contract was approved.',
    })

    await writeFile(`${root}/.evo/work/active/change-one/change.md`, '---\nid: change-one\nweight: STANDARD\nstatus: AWAITING_APPROVAL\napproval: null\n---\n\n# Change\n\nApproved user outcome and AC-01.\n', 'utf8')
    await writeFile(`${root}/.evo/work/active/change-one/plan.md`, '---\nchange: change-one\nstatus: AWAITING_APPROVAL\napproval: null\n---\n\n# Plan\n\n### S1 — Approved behavior\n\nApproved vertical Slice and verification.\n', 'utf8')
    const state = await readState(root)
    await writeYaml(repositoryPaths(root).state, {...state, status: 'AWAITING_APPROVAL', updatedAt: new Date().toISOString()})

    const finding = await detectImplementationAheadOfApproval(root)

    expect(finding?.code).toBe(IMPLEMENTATION_AHEAD_OF_APPROVAL)
    expect(finding?.unapprovedArtifacts).toEqual(expect.arrayContaining(['change.md', 'plan.md']))
    expect(finding?.signals).toEqual(expect.arrayContaining([
      expect.objectContaining({kind: 'EVIDENCE_RECORD', paths: ['src/feature.ts']}),
    ]))
    expect(finding?.detail).toContain('not retroactive authorization')

    const recovery = await buildRecoveryReport(root)
    expect(recovery.implementationAheadOfApproval?.code).toBe(IMPLEMENTATION_AHEAD_OF_APPROVAL)
    expect(formatRecoveryReport(recovery)).toContain(IMPLEMENTATION_AHEAD_OF_APPROVAL)
  })

  it('does not report the finding when the exact artifacts are currently approved', async () => {
    const root = await temporaryRepository('implementation-approved')
    await initializeRepository(root)
    await createActiveChange(root)

    expect(await detectImplementationAheadOfApproval(root)).toBeNull()
  })
})
