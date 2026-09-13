import {afterEach, describe, expect, it} from 'vitest'

import {analyzeRepositoryConsistency, formatConsistencyReport} from '../src/repository/consistency.js'
import {cleanupTemporaryRepositories, temporaryRepository, writeRepositoryFiles} from './helpers.js'

afterEach(cleanupTemporaryRepositories)

describe('repository consistency signals', () => {
  it('detects response, permission, naming, and blast-radius drift', async () => {
    const root = await temporaryRepository('consistency-drift')
    await writeRepositoryFiles(root, {
      'README.md': '# Existing project\n',
      'src/controllers/UserController.java': '@PreAuthorize("user:read") class UserController { AjaxResult list() { return AjaxResult.success(); } }\n',
      'src/controllers/RoleController.java': '@PreAuthorize("role:read") class RoleController { AjaxResult list() { return AjaxResult.success(); } }\n',
      'src/services/UserService.java': '@DataScope class UserService {}\n',
    })

    const report = await analyzeRepositoryConsistency(root, {
      proposedText: 'class InventoryHttpHandler { ApiResponse<?> list() { return null; } PermissionMiddleware permission; }',
      proposedNames: ['InventoryHttpHandler'],
      expectedAreas: ['inventory'],
      changedPaths: ['inventory/InventoryHttpHandler.java', 'auth/AuthService.java', 'common/Response.java'],
    })

    expect(report.observations).toEqual(expect.arrayContaining([
      expect.objectContaining({category: 'response', mechanism: 'AjaxResult'}),
      expect.objectContaining({category: 'permission', mechanism: '@PreAuthorize'}),
    ]))
    expect(report.findings.map((item) => item.code)).toEqual(expect.arrayContaining([
      'CONSISTENCY_DRIFT',
      'PARALLEL_MECHANISM',
      'NAMING_DRIFT',
      'BLAST_RADIUS_EXPANDED',
    ]))
    expect(formatConsistencyReport(report)).toContain('BLAST RADIUS EXPANDED')
  })

  it('does not flag reuse of the observed project mechanisms', async () => {
    const root = await temporaryRepository('consistency-reuse')
    await writeRepositoryFiles(root, {
      'README.md': '# Existing project\n',
      'src/controllers/UserController.java': '@PreAuthorize("user:read") class UserController { AjaxResult list() { return AjaxResult.success(); } }\n',
      'src/controllers/RoleController.java': '@PreAuthorize("role:read") class RoleController { AjaxResult list() { return AjaxResult.success(); } }\n',
    })

    const report = await analyzeRepositoryConsistency(root, {
      proposedText: '@PreAuthorize("inventory:read") class InventoryController { AjaxResult list() { return AjaxResult.success(); } }',
      proposedNames: ['InventoryController'],
      expectedAreas: ['inventory'],
      changedPaths: ['inventory/InventoryController.java', 'tests/InventoryControllerTest.java'],
    })

    expect(report.findings).toEqual([])
  })
})
