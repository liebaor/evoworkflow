import {afterEach, describe, expect, it} from 'vitest'
import path from 'node:path'

import {writeTextAtomic, writeYaml} from '../src/repository/io.js'
import {repositoryPaths} from '../src/repository/paths.js'
import {validateProject} from '../src/validation/project.js'
import {cleanupTemporaryRepositories, createActiveChange, fileContents, initializeRepository, readState, temporaryRepository} from './helpers.js'

afterEach(cleanupTemporaryRepositories)

describe('repository protocol validation', () => {
  it('rejects duplicate primary authorities for one fact', async () => {
    const root = await temporaryRepository('authority')
    await initializeRepository(root)
    const paths = repositoryPaths(root)
    const project = await fileContents(paths.project)
    const duplicateRows = '| architecture | `docs/a.md` | manual |\n| architecture | `docs/b.md` | manual |\n\n'
    await writeTextAtomic(paths.project, project.replace('## Technology evidence', `${duplicateRows}## Technology evidence`))

    const report = await validateProject(root)

    expect(report.valid).toBe(false)
    expect(report.issues.map((item) => item.code)).toContain('DUPLICATE_AUTHORITY')
  })

  it('rejects machine state that points to a missing active Change', async () => {
    const root = await temporaryRepository('missing-change')
    await initializeRepository(root)
    const paths = repositoryPaths(root)
    const state = await readState(root)
    await writeYaml(paths.state, {...state, activeChange: 'missing', phase: 'IMPLEMENT', status: 'APPROVED'})

    const report = await validateProject(root)

    expect(report.valid).toBe(false)
    expect(report.issues.map((item) => item.code)).toContain('MISSING_ACTIVE_CHANGE')
  })

  it('accepts a complete active Change protocol', async () => {
    const root = await temporaryRepository('active-change')
    await initializeRepository(root)
    await createActiveChange(root)

    expect((await validateProject(root)).valid).toBe(true)
  })

  it('rejects accepted limitations without human-approved review', async () => {
    const root = await temporaryRepository('invalid-accepted-limitations')
    await initializeRepository(root)
    const changeRoot = await createActiveChange(root)
    await writeTextAtomic(path.join(changeRoot, 'review.md'), '---\nchange: change-one\nstatus: DRAFT\nhumanAcceptance: false\nopenFindings: 0\ndocsConverged: false\nacceptedLimitations: true\n---\n\n# Review\n')

    const report = await validateProject(root)

    expect(report.valid).toBe(false)
    expect(report.issues).toContainEqual(expect.objectContaining({code: 'INVALID_REVIEW_LIMITATION_ACCEPTANCE'}))
  })

  it('rejects approved Standard work with no recoverable Slice checkpoints', async () => {
    const root = await temporaryRepository('missing-slice-state')
    await initializeRepository(root)
    await createActiveChange(root)
    const paths = repositoryPaths(root)
    const state = await readState(root)
    await writeYaml(paths.state, {...state, slices: [], currentSlice: null})

    const report = await validateProject(root)

    expect(report.issues).toContainEqual(expect.objectContaining({code: 'MISSING_SLICE_STATE'}))
  })
})
