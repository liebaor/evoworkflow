import {appendFile} from 'node:fs/promises'
import path from 'node:path'
import {afterEach, describe, expect, it} from 'vitest'

import {formatWorkingContext, buildWorkingContext, writeWorkingContext, workingContextPath} from '../src/repository/working-context.js'
import {cleanupTemporaryRepositories, createActiveChange, fileContents, initializeRepository, temporaryRepository, writeRepositoryFiles} from './helpers.js'

afterEach(cleanupTemporaryRepositories)

describe('task-specific Working Context', () => {
  it('routes paths and reasons without copying source or writing by default', async () => {
    const root = await temporaryRepository('working-context')
    await writeRepositoryFiles(root, {
      'AGENTS.md': '# Repository rules\nUse existing mechanisms.\n',
      'README.md': '# Existing project\n',
      'docs/architecture.md': '# Architecture\n',
      'CONTEXT.md': '# Domain vocabulary\nSupplier means a catalog partner.\n',
      'package.json': JSON.stringify({scripts: {test: 'vitest'}, dependencies: {react: '1.0.0'}}),
      'src/controllers/SupplierController.java': '@PreAuthorize("supplier:read") class SupplierController { AjaxResult list() { return AjaxResult.success(); } }\n',
      'src/services/SupplierService.java': 'class SupplierService { DataScope scope; }\n',
      'tests/SupplierControllerTest.java': 'class SupplierControllerTest {}\n',
    })
    await initializeRepository(root)
    const changeRoot = await createActiveChange(root)
    await appendFile(path.join(changeRoot, 'change.md'), '\n## Supplier\nAdd supplier export while retaining the existing response and permission mechanisms.\n', 'utf8')
    await writeRepositoryFiles(root, {
      '.evo/decisions/current/d-supplier.md': '---\nid: d-supplier\nchange: null\nstatus: current\nsupersedes: null\nsupersededBy: null\n---\n\n# Supplier ownership\n\nSupplier ownership is checked by the existing permission path.\n',
      '.evo/work/completed/old-change/bug.md': '# Bug\n\n## Observed behavior\nSupplier export ignored ownership.\n\n## Root cause\nThe permission path was bypassed.\n',
    })

    const context = await buildWorkingContext(root, 'change-one', {now: new Date('2026-01-03T00:00:00.000Z'), includeGit: false})
    const contextPaths = context.references.map((item) => item.path)

    expect(context.change).toEqual(expect.objectContaining({id: 'change-one', weight: 'STANDARD'}))
    expect(contextPaths).toEqual(expect.arrayContaining([
      'AGENTS.md',
      'docs/architecture.md',
      'CONTEXT.md',
      '.evo/work/active/change-one/change.md',
      '.evo/decisions/current/d-supplier.md',
      'src/controllers/SupplierController.java',
      'tests/SupplierControllerTest.java',
      '.evo/work/completed/old-change/bug.md',
    ]))
    expect(context.git.available).toBe(false)
    expect(context.unknowns).toContain('Git 状态或历史不可读取；相关历史判断保持未知。')

    const rendered = formatWorkingContext(context)
    expect(rendered).toContain('Why relevant')
    expect(rendered).toContain('src/controllers/SupplierController.java')
    expect(rendered).not.toContain('AjaxResult list()')
    await expect(fileContents(workingContextPath(root, 'change-one'))).rejects.toThrow()
  })

  it('writes only the explicit current Change context target', async () => {
    const root = await temporaryRepository('working-context-write')
    await writeRepositoryFiles(root, {
      'README.md': '# Existing project\n',
      'package.json': JSON.stringify({scripts: {test: 'vitest'}}),
      'src/InventoryService.ts': 'export function inventory() { return true }\n',
    })
    await initializeRepository(root)
    await createActiveChange(root)

    const context = await buildWorkingContext(root, 'change-one', {now: new Date('2026-01-03T00:00:00.000Z'), includeGit: false})
    const written = await writeWorkingContext(root, 'change-one', context)

    expect(written).toBe('.evo/work/active/change-one/context.md')
    expect(await fileContents(workingContextPath(root, 'change-one'))).toContain('# Working Context / 当前工作上下文')
    expect(await fileContents(path.join(root, 'README.md'))).toBe('# Existing project\n')
  })
})
