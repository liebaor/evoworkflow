import {appendFile, writeFile} from 'node:fs/promises'
import path from 'node:path'
import {afterEach, describe, expect, it} from 'vitest'

import {checkConvergence, finishChange} from '../src/core/convergence.js'
import {getStatusSummary} from '../src/core/navigation.js'
import {approveArtifact} from '../src/repository/artifacts.js'
import {writeTextAtomic, writeYaml} from '../src/repository/io.js'
import {repositoryPaths} from '../src/repository/paths.js'
import {validateProject} from '../src/validation/project.js'
import {cleanupTemporaryRepositories, createActiveChange, initializeRepository, readState, temporaryRepository, writeRepositoryFiles} from './helpers.js'

afterEach(cleanupTemporaryRepositories)

describe('workflow evidence scenarios', () => {
  it('traverses a Standard Change through explicit phase checkpoints and Finish', async () => {
    const root = await temporaryRepository('standard-lifecycle')
    await initializeRepository(root)
    const changeId = 'standard-lifecycle'
    const paths = repositoryPaths(root)
    await writeRepositoryFiles(root, {
      [`.evo/work/active/${changeId}/change.md`]: `---\nid: ${changeId}\nweight: STANDARD\nstatus: AWAITING_APPROVAL\napproval: null\n---\n\n# Standard feature\n\nDeliver one observable behavior.\n`,
      [`.evo/work/active/${changeId}/plan.md`]: `---\nchange: ${changeId}\nstatus: AWAITING_APPROVAL\napproval: null\n---\n\n# Plan\n\n### S1 — Standard behavior\n\n- Objective: Deliver the approved behavior.\n- Acceptance: The behavior is observable.\n- Verification: Focused test.\n`,
      [`.evo/work/active/${changeId}/evidence.md`]: '# Evidence\n\n| Acceptance | Status | Evidence | Scope |\n|---|---|---|---|\n| AC-01 | PASS | Focused test passed | local |\n',
    })
    const initial = await readState(root)
    await writeYaml(paths.state, {
      ...initial,
      activeChange: changeId,
      phase: 'GRILL',
      status: 'AWAITING_APPROVAL',
      updatedAt: new Date().toISOString(),
    })

    const observed: string[] = []
    const observe = async (phase: string, status: string): Promise<void> => {
      const summary = await getStatusSummary(root)
      expect(summary.state).toEqual(expect.objectContaining({phase, status, activeChange: changeId}))
      observed.push(`${phase}/${status}`)
    }

    await observe('GRILL', 'AWAITING_APPROVAL')
    await approveArtifact(root, changeId, 'change', 'standard-lifecycle-human')
    await observe('GRILL', 'APPROVED')

    let state = await readState(root)
    await writeYaml(paths.state, {...state, phase: 'PLAN', status: 'AWAITING_APPROVAL', updatedAt: new Date().toISOString()})
    await observe('PLAN', 'AWAITING_APPROVAL')
    await approveArtifact(root, changeId, 'plan', 'standard-lifecycle-human')
    await observe('PLAN', 'APPROVED')

    state = await readState(root)
    await writeYaml(paths.state, {
      ...state,
      phase: 'IMPLEMENT',
      status: 'APPROVED',
      currentSlice: 'S1',
      slices: [{id: 'S1', status: 'RUNNING', blockReason: null}],
      updatedAt: new Date().toISOString(),
    })
    await observe('IMPLEMENT', 'APPROVED')

    state = await readState(root)
    await writeYaml(paths.state, {
      ...state,
      phase: 'VERIFY',
      status: 'AWAITING_APPROVAL',
      currentSlice: null,
      slices: [{id: 'S1', status: 'PASS', blockReason: null}],
      updatedAt: new Date().toISOString(),
    })
    await observe('VERIFY', 'AWAITING_APPROVAL')

    await writeFile(
      path.join(paths.activeWork, changeId, 'review.md'),
      `---\nchange: ${changeId}\nstatus: DRAFT\nhumanAcceptance: false\nopenFindings: 0\ndocsConverged: false\n---\n\n# Review\n\nThe review is pending.\n`,
      'utf8',
    )
    state = await readState(root)
    await writeYaml(paths.state, {...state, phase: 'REVIEW', status: 'AWAITING_APPROVAL', updatedAt: new Date().toISOString()})
    await observe('REVIEW', 'AWAITING_APPROVAL')

    await writeTextAtomic(
      path.join(paths.activeWork, changeId, 'review.md'),
      `---\nchange: ${changeId}\nstatus: APPROVED\nhumanAcceptance: true\nopenFindings: 0\ndocsConverged: true\n---\n\n# Review\n\nThe human accepted the reviewed result.\n`,
    )
    state = await readState(root)
    await writeYaml(paths.state, {...state, phase: 'FINISH', status: 'APPROVED', updatedAt: new Date().toISOString()})
    await observe('FINISH', 'APPROVED')

    expect(observed).toEqual([
      'GRILL/AWAITING_APPROVAL',
      'GRILL/APPROVED',
      'PLAN/AWAITING_APPROVAL',
      'PLAN/APPROVED',
      'IMPLEMENT/APPROVED',
      'VERIFY/AWAITING_APPROVAL',
      'REVIEW/AWAITING_APPROVAL',
      'FINISH/APPROVED',
    ])
    expect((await validateProject(root)).valid).toBe(true)
    expect((await checkConvergence(root)).ready).toBe(true)

    await finishChange(root, changeId, new Date('2026-01-02T00:00:00.000Z'))

    expect(await readState(root)).toEqual(expect.objectContaining({phase: 'IDLE', status: 'COMPLETED', activeChange: null}))
  })

  it('records a requirement Delta and makes changed approved intent stale', async () => {
    const root = await temporaryRepository('requirement-delta')
    await initializeRepository(root)
    const changeRoot = await createActiveChange(root)
    const delta = `# Requirement Delta / 需求变更\n\n## Old / 旧内容\nThe list is read-only.\n\n## New / 新内容\nThe list supports one explicit filter.\n\n## Retain / 保留\nAuthentication and pagination remain unchanged.\n\n## Modify / 修改\nThe acceptance criterion adds filtered results.\n\n## Remove / 移除\nNo existing acceptance is removed.\n\n## Add / 新增\nAC-02 covers the filter behavior.\n\n## Impact / 影响\n- Acceptance: update AC-02.\n- Decisions: none.\n- Plan and Slices: re-approve S1.\n- Code and tests: add focused coverage.\n- Documentation: update the user guide.\n- Data, API, and compatibility: no breaking change.\n`
    await writeFile(path.join(changeRoot, 'delta.md'), delta, 'utf8')

    expect(delta).toContain('## Old / 旧内容')
    expect(delta).toContain('## New / 新内容')
    expect(delta).toContain('## Retain / 保留')
    expect(delta).toContain('## Modify / 修改')
    expect(delta).toContain('## Remove / 移除')
    expect(delta).toContain('## Add / 新增')
    expect((await validateProject(root)).valid).toBe(true)

    await appendFile(path.join(changeRoot, 'change.md'), '\n## New acceptance\n\nThe filter is now part of the requested behavior.\n', 'utf8')

    const report = await validateProject(root)
    expect(report.valid).toBe(false)
    expect(report.issues).toContainEqual(expect.objectContaining({
      code: 'STALE_ARTIFACT_APPROVAL',
      path: '.evo/work/active/change-one/change.md',
    }))
    expect((await checkConvergence(root)).ready).toBe(false)
  })

  it('rejects an incomplete optional Delta or Bug document', async () => {
    const root = await temporaryRepository('incomplete-workflow-document')
    await initializeRepository(root)
    const changeRoot = await createActiveChange(root)
    await writeFile(path.join(changeRoot, 'delta.md'), '# Requirement Delta\n\n## Old\nOnly one section.\n', 'utf8')
    await writeFile(path.join(changeRoot, 'bug.md'), '# Bug\n\n## Root cause\nOnly one section.\n', 'utf8')

    const report = await validateProject(root)

    expect(report.valid).toBe(false)
    expect(report.issues.filter((item) => item.code === 'INCOMPLETE_CHANGE_WORKFLOW_DOCUMENT')).toHaveLength(2)
  })

  it('records a reproducible bug failure and a passing regression check', async () => {
    const root = await temporaryRepository('bug-regression')
    await initializeRepository(root)
    const changeRoot = await createActiveChange(root)
    const fixture = path.join(root, 'bug-fixture.mjs')
    await writeFile(fixture, `const expected = 'visible'\nconst actual = 'hidden'\nif (actual !== expected) {\n  console.error(\`expected=\${expected} actual=\${actual}\`)\n  process.exitCode = 1\n}\n`, 'utf8')
    const failing = await runNode(fixture)
    expect(failing.exitCode).toBe(1)

    await writeFile(fixture, `const expected = 'visible'\nconst actual = 'visible'\nif (actual !== expected) {\n  console.error(\`expected=\${expected} actual=\${actual}\`)\n  process.exitCode = 1\n}\n`, 'utf8')
    const regression = await runNode(fixture)
    expect(regression.exitCode).toBe(0)

    const bug = `# Bug investigation / 缺陷调查\n\n## Observed behavior / 观察到的行为\nThe item was hidden.\n\n## Reproduction and failing evidence / 复现与失败证据\n- Command: \`${process.execPath} ${path.basename(fixture)}\`\n- Exit code: ${String(failing.exitCode)}\n- Output: \`${failing.output.trim()}\`\n\n## Expected behavior / 预期行为\nThe item is visible.\n\n## Root cause / 根因\nThe fixture assigned the wrong visibility value.\n\n## Existing rule or mechanism to reuse / 应复用的现有规则或机制\nUse the existing visibility assertion.\n\n## Fix boundary / 修复边界\nChange only the visibility assignment and its regression test.\n\n## Regression evidence / 回归证据\n- Command: \`${process.execPath} ${path.basename(fixture)}\`\n- Exit code: ${String(regression.exitCode)}\n- Output: no failure output.\n\n## Real-entry-path status / 真实入口状态\n- \`UNVERIFIED\`\n\n## Knowledge promotion / 知识沉淀\nNo new durable rule is required.\n`
    await writeFile(path.join(changeRoot, 'bug.md'), bug, 'utf8')

    for (const heading of [
      '## Reproduction and failing evidence / 复现与失败证据',
      '## Root cause / 根因',
      '## Regression evidence / 回归证据',
      '## Real-entry-path status / 真实入口状态',
    ]) expect(bug).toContain(heading)
    expect(bug).toContain('`UNVERIFIED`')
  })
})

async function runNode(script: string): Promise<{readonly exitCode: number | null; readonly output: string}> {
  const {spawn} = await import('node:child_process')
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [script], {cwd: path.dirname(script), shell: false, stdio: ['ignore', 'pipe', 'pipe']})
    let output = ''
    child.stdout.on('data', (chunk: Buffer | string) => { output += String(chunk) })
    child.stderr.on('data', (chunk: Buffer | string) => { output += String(chunk) })
    child.once('error', reject)
    child.once('close', (exitCode) => resolve({exitCode, output}))
  })
}
