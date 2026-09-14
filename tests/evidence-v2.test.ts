import {mkdir, rename, writeFile} from 'node:fs/promises'
import path from 'node:path'
import {afterEach, describe, expect, it} from 'vitest'

import {runEvidence, reconcileEvidence} from '../src/repository/evidence.js'
import {writeYaml} from '../src/repository/io.js'
import {repositoryPaths} from '../src/repository/paths.js'
import {cleanupTemporaryRepositories, initializeRepository, readState, temporaryRepository, writeRepositoryFiles} from './helpers.js'

afterEach(cleanupTemporaryRepositories)

describe('Evidence v2', () => {
  it('records a command, output hash, Git snapshot, and exact acceptance link', async () => {
    const root = await preparedEvidenceRepository('evidence-pass')
    const record = await runEvidence({
      root,
      changeId: 'evidence-change',
      acceptance: ['AC-01'],
      kind: 'integration',
      label: 'deterministic command',
      executable: process.execPath,
      args: ['-e', 'console.log("evidence-ok")'],
      artifacts: ['evidence-fixture.txt'],
    })

    expect(record.status).toBe('PASS')
    expect(record.outputHash).toMatch(/^[a-f0-9]{64}$/u)
    expect(record.git.treeFingerprint).toMatch(/^[a-f0-9]{64}$/u)
    expect(record.artifacts[0]?.path).toMatch(/\.evo\/work\/active\/evidence-change\/evidence\/artifacts\//u)
    const report = await reconcileEvidence(root, 'evidence-change')
    expect(report.valid).toBe(true)
    expect(report.evidence).toEqual([expect.objectContaining({id: 'AC-01', status: 'PASS', evidenceRefs: [record.id]})])
  })

  it('rejects missing, duplicate, extra, and unreferenced acceptance evidence', async () => {
    const root = await preparedEvidenceRepository('evidence-drift')
    const paths = repositoryPaths(root)
    await writeYaml(path.join(paths.activeWork, 'evidence-change', 'evidence.yml'), {
      schemaVersion: 2,
      change: 'evidence-change',
      updatedAt: new Date().toISOString(),
      acceptance: [
        {id: 'AC-99', status: 'PASS', evidenceRefs: ['EV-UNKNOWN'], limitations: []},
        {id: 'AC-99', status: 'NOT_RUN', evidenceRefs: [], limitations: []},
      ],
    })
    const report = await reconcileEvidence(root, 'evidence-change')
    expect(report.valid).toBe(false)
    expect(report.issues.map((item) => item.code)).toEqual(expect.arrayContaining(['DUPLICATE_ACCEPTANCE', 'EXTRA_ACCEPTANCE', 'MISSING_ACCEPTANCE', 'UNKNOWN_RECORD']))
  })

  it('records nonzero commands as FAIL without turning them into PASS', async () => {
    const root = await preparedEvidenceRepository('evidence-fail')
    const record = await runEvidence({
      root,
      changeId: 'evidence-change',
      acceptance: ['AC-01'],
      kind: 'unit',
      label: 'expected failure',
      executable: process.execPath,
      args: ['-e', 'process.exit(3)'],
    })
    expect(record.status).toBe('FAIL')
    const report = await reconcileEvidence(root, 'evidence-change')
    expect(report.valid).toBe(true)
    expect(report.evidence[0]).toEqual(expect.objectContaining({status: 'FAIL'}))
  })

  it('rejects an evidence command working directory outside the repository', async () => {
    const root = await preparedEvidenceRepository('evidence-cwd')
    await expect(runEvidence({
      root,
      changeId: 'evidence-change',
      acceptance: ['AC-01'],
      kind: 'unit',
      label: 'outside cwd',
      executable: process.execPath,
      args: ['-e', 'process.exit(0)'],
      cwd: '..',
    })).rejects.toThrow('escapes repository')
  })

  it('keeps explicitly post-finish evidence and artifacts under completed work', async () => {
    const root = await preparedEvidenceRepository('evidence-completed')
    const paths = repositoryPaths(root)
    await mkdir(paths.completedWork, {recursive: true})
    await rename(path.join(paths.activeWork, 'evidence-change'), path.join(paths.completedWork, 'evidence-change'))

    const record = await runEvidence({
      root,
      changeId: 'evidence-change',
      acceptance: ['AC-01'],
      kind: 'manual',
      label: 'post-finish evidence',
      executable: process.execPath,
      args: ['-e', 'process.exit(0)'],
      artifacts: ['evidence-fixture.txt'],
      completed: true,
    })

    expect(record.artifacts[0]?.path).toMatch(/\.evo\/work\/completed\/evidence-change\/evidence\/artifacts\//u)
    expect(await reconcileEvidence(root, 'evidence-change', true)).toEqual(expect.objectContaining({valid: true}))
  })
})

async function preparedEvidenceRepository(name: string): Promise<string> {
  const root = await temporaryRepository(name)
  await initializeRepository(root)
  await writeRepositoryFiles(root, {
    '.evo/work/active/evidence-change/change.md': '---\nid: evidence-change\nweight: STANDARD\nstatus: DRAFT\napproval: null\n---\n\n# Evidence Change\n\n## Rules and acceptance\n\n- AC-01: The command result is observable.\n',
    '.evo/work/active/evidence-change/plan.md': '---\nchange: evidence-change\nstatus: DRAFT\napproval: null\n---\n\n# Plan\n',
    '.evo/work/active/evidence-change/evidence.md': '# Evidence\n',
  })
  const state = await readState(root)
  await writeYaml(repositoryPaths(root).state, {...state, activeChange: 'evidence-change', phase: 'VERIFY', status: 'APPROVED'})
  await writeFile(path.join(root, 'evidence-fixture.txt'), 'fixture\n', 'utf8')
  return root
}
