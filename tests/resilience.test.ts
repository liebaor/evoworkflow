import {readFile, writeFile} from 'node:fs/promises'
import path from 'node:path'
import {afterEach, describe, expect, it} from 'vitest'

import {buildRecoveryReport, formatRecoveryReport} from '../src/repository/recovery.js'
import {formatBugInvestigation, formatRequirementDelta, missingWorkflowDocumentSections, recordBugInvestigation, recordRequirementDelta, type BugInvestigationInput, type RequirementDeltaInput} from '../src/repository/workflow-documents.js'
import {repositoryPaths} from '../src/repository/paths.js'
import {validateProject} from '../src/validation/project.js'
import {cleanupTemporaryRepositories, createActiveChange, fileContents, initializeRepository, readState, temporaryRepository, writeRepositoryFiles} from './helpers.js'

afterEach(cleanupTemporaryRepositories)

const delta: RequirementDeltaInput = {
  old: 'stock <= threshold',
  new: 'stock < threshold',
  retain: ['Authentication and pagination'],
  modify: ['Inventory alert acceptance'],
  remove: ['No existing acceptance'],
  add: ['Boundary regression case'],
  impact: {
    acceptance: 'Update AC-02.',
    decisions: 'No new Decision.',
    planAndSlices: 'Re-approve the affected Slice.',
    codeAndTests: 'Update the predicate and regression test.',
    documentation: 'Update the rule documentation.',
    dataApiCompatibility: 'No breaking API or data change.',
  },
}

const bug: BugInvestigationInput = {
  observedBehavior: 'Store A could read Store B data.',
  reproductionAndFailingEvidence: 'The scoped request test failed with store=B.',
  expectedBehavior: 'Store A can read only Store A data.',
  rootCause: 'The query path bypassed the existing DataScope mechanism.',
  existingRuleOrMechanismToReuse: 'Reuse the existing DataScope annotation and interceptor.',
  fixBoundary: 'Change the query path and add one regression test.',
  regressionEvidence: 'The same request test passes after the fix.',
  realEntryPathStatus: 'UNVERIFIED',
  knowledgePromotion: 'Keep the regression test; no new durable convention is required.',
}

describe('Change resilience documents', () => {
  it('records a complete Requirement Delta and pauses the active Change', async () => {
    const root = await temporaryRepository('delta-record')
    await initializeRepository(root)
    const changeRoot = await createActiveChange(root)
    const beforeChange = await fileContents(path.join(changeRoot, 'change.md'))
    const beforePlan = await fileContents(path.join(changeRoot, 'plan.md'))

    const target = await recordRequirementDelta(root, 'change-one', delta, new Date('2026-01-04T00:00:00.000Z'))
    const source = await fileContents(path.join(root, target))

    expect(target).toBe('.evo/work/active/change-one/delta.md')
    expect(source).toContain('## Old / 旧内容')
    expect(source).toContain('## New / 新内容')
    expect(source).toContain('stock < threshold')
    expect(missingWorkflowDocumentSections(source, 'delta')).toEqual([])
    expect(await fileContents(path.join(changeRoot, 'change.md'))).toBe(beforeChange)
    expect(await fileContents(path.join(changeRoot, 'plan.md'))).toBe(beforePlan)
    expect((await readState(root)).status).toBe('NEEDS_INFO')
    expect((await validateProject(root)).valid).toBe(true)
  })

  it('records Bug investigation fields and retains an unverified real path', async () => {
    const root = await temporaryRepository('bug-record')
    await initializeRepository(root)
    await createActiveChange(root)

    const target = await recordBugInvestigation(root, 'change-one', bug, new Date('2026-01-04T00:00:00.000Z'))
    const source = await fileContents(path.join(root, target))

    expect(target).toBe('.evo/work/active/change-one/bug.md')
    expect(missingWorkflowDocumentSections(source, 'bug')).toEqual([])
    expect(source).toContain('The query path bypassed the existing DataScope mechanism.')
    expect(source).toContain('`UNVERIFIED`')
    expect(source).toContain('same request test passes')
    expect((await readState(root)).status).toBe('NEEDS_INFO')
  })

  it('rejects incomplete resilience documents', () => {
    expect(missingWorkflowDocumentSections('# Requirement Delta\n\n## Old\nvalue\n', 'delta')).toEqual(expect.arrayContaining(['New', 'Impact']))
    expect(missingWorkflowDocumentSections('# Bug\n\n## Root cause\nvalue\n', 'bug')).toEqual(expect.arrayContaining(['Observed behavior', 'Regression evidence']))
    expect(formatRequirementDelta(delta)).toContain('## Impact / 影响')
    expect(formatBugInvestigation(bug)).toContain('## Knowledge promotion / 知识沉淀')
  })
})

describe('Decision supersession validation', () => {
  it('requires reciprocal links and rejects a supersession cycle', async () => {
    const root = await temporaryRepository('decision-supersession')
    await initializeRepository(root)
    await writeRepositoryFiles(root, {
      '.evo/decisions/current/d-old.md': '---\nid: d-old\nchange: null\nstatus: current\nsupersedes: null\nsupersededBy: d-new\n---\n\n# Old\n',
      '.evo/decisions/current/d-new.md': '---\nid: d-new\nchange: null\nstatus: current\nsupersedes: d-old\nsupersededBy: null\n---\n\n# New\n',
    })

    expect((await validateProject(root)).valid).toBe(true)

    await writeFile(path.join(root, '.evo/decisions/current/d-old.md'), '---\nid: d-old\nchange: null\nstatus: current\nsupersedes: null\nsupersededBy: null\n---\n\n# Old\n', 'utf8')
    expect((await validateProject(root)).issues).toContainEqual(expect.objectContaining({code: 'INCONSISTENT_DECISION_LINK'}))

    await writeFile(path.join(root, '.evo/decisions/current/d-old.md'), '---\nid: d-old\nchange: null\nstatus: current\nsupersedes: d-new\nsupersededBy: d-new\n---\n\n# Old\n', 'utf8')
    await writeFile(path.join(root, '.evo/decisions/current/d-new.md'), '---\nid: d-new\nchange: null\nstatus: current\nsupersedes: d-old\nsupersededBy: d-old\n---\n\n# New\n', 'utf8')
    expect((await validateProject(root)).issues).toContainEqual(expect.objectContaining({code: 'DECISION_SUPERSESSION_CYCLE'}))
  })
})

describe('read-only Recovery', () => {
  it('reconstructs the current boundary without chat or writes', async () => {
    const root = await temporaryRepository('recovery-report')
    await initializeRepository(root)
    await createActiveChange(root)

    const report = await buildRecoveryReport(root)

    expect(report.valid).toBe(true)
    expect(report.currentObjective).toContain('Change')
    expect(report.currentPhase).toBe('PLAN')
    expect(report.activeChange).toBe('change-one')
    expect(report.approvedArtifacts).toEqual(expect.arrayContaining([
      '.evo/work/active/change-one/change.md',
      '.evo/work/active/change-one/plan.md',
    ]))
    expect(report.pendingSlices).toEqual(['S1=PENDING'])
    expect(report.latestEvidence).toEqual([{path: '.evo/work/active/change-one/evidence.md', statuses: ['UNVERIFIED']}])
    expect(report.unknowns).toContain('.evo/work/active/change-one/evidence.md contains UNVERIFIED evidence.')
    expect(formatRecoveryReport(report)).toContain('Recovery is read-only')
    await expect(readFile(path.join(repositoryPaths(root).activeWork, 'change-one', 'context.md'))).rejects.toThrow()
  })
})
