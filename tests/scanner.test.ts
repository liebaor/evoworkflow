import {afterEach, describe, expect, it} from 'vitest'

import {scanRepository} from '../src/repository/scanner.js'
import {cleanupTemporaryRepositories, temporaryRepository, writeRepositoryFiles} from './helpers.js'

afterEach(cleanupTemporaryRepositories)

describe('repository discovery', () => {
  it('classifies an empty checkout as Greenfield without inventing a stack', async () => {
    const root = await temporaryRepository('greenfield')
    const report = await scanRepository(root)

    expect(report.mode).toBe('GREENFIELD')
    expect(report.frameworks).toEqual([])
    expect(report.commands).toEqual([])
    expect(report.unknowns).toContain('Product requirements and foundation choice require human Decisions before bootstrap.')
  })

  it('keeps a requirements-only repository in Greenfield solution discovery', async () => {
    const root = await temporaryRepository('requirements-only')
    await writeRepositoryFiles(root, {
      'README.md': '# New product\n',
      'requirements/product.md': '# Approved intent\n\nA local team task tracker.\n',
    })

    const report = await scanRepository(root)

    expect(report.mode).toBe('GREENFIELD')
    expect(report.frameworks).toEqual([])
    expect(report.unknowns[0]).toContain('foundation choice')
  })

  it('finds Brownfield RuoYi conventions, capabilities, authorities, and entry paths', async () => {
    const root = await temporaryRepository('ruoyi')
    await writeRepositoryFiles(root, {
      'AGENTS.md': '# Rules\n',
      'README.md': '# Existing system\n',
      'docs/architecture.md': '# Architecture\n',
      '.github/workflows/ci.yml': 'name: ci\n',
      'mvnw': '#!/bin/sh\n',
      'pom.xml': '<artifactId>ruoyi-admin</artifactId><artifactId>spring-boot-starter-web</artifactId>',
      'src/main/java/com/example/SysUserController.java': '@PreAuthorize("x") class SysUserController { AjaxResult list(){ startPage(); return AjaxResult.success(); } }',
      'src/main/java/com/example/InventoryService.java': '@DataScope class InventoryService { ExcelUtil export; @Log String audit; }',
      'src/test/java/com/example/InventoryServiceTest.java': 'class InventoryServiceTest {}',
    })

    const report = await scanRepository(root)

    expect(report.mode).toBe('BROWNFIELD')
    expect(report.confidence).toBe('HIGH')
    expect(report.frameworks.map((item) => item.name)).toEqual(expect.arrayContaining(['RuoYi', 'Spring Boot']))
    expect(report.commands.map((item) => item.command)).toEqual(expect.arrayContaining(['./mvnw test', './mvnw spring-boot:run']))
    expect(report.capabilities.map((item) => item.name)).toEqual(expect.arrayContaining(['authorization', 'data permission', 'pagination', 'standard response']))
    expect(report.authorities).toEqual(expect.arrayContaining([{topic: 'architecture', path: 'docs/architecture.md'}]))
    expect(report.references[0]).toBe('src/main/java/com/example/SysUserController.java')
  })

  it('does not promote fixture prose or scanner patterns to project capabilities', async () => {
    const root = await temporaryRepository('meta-tool')
    await writeRepositoryFiles(root, {
      'package.json': JSON.stringify({name: 'meta-tool'}),
      'src/scanner.ts': 'const patterns = /@PreAuthorize|DataScope|AjaxResult|startPage\\(/u',
      'tests/fixture.java': '@PreAuthorize class Fixture { DataScope value; }',
      'docs/example.md': 'Use TokenService and ExcelUtil.',
    })

    const report = await scanRepository(root)

    expect(report.frameworks.map((item) => item.name)).not.toContain('RuoYi')
    expect(report.capabilities).toEqual([])
  })

  it('uses nested package evidence and excludes generated framework output from references', async () => {
    const root = await temporaryRepository('polyglot')
    await writeRepositoryFiles(root, {
      'pyproject.toml': '[project]\nname = "service"\ndependencies = ["fastapi"]\n',
      'app/services/orders.py': 'def create_order():\n    return None\n',
      'app/services/__init__.py': '',
      'frontend/package.json': JSON.stringify({
        scripts: {build: 'umi build', dev: 'umi dev', test: 'vitest run', 'test:watch': 'vitest', typecheck: 'tsc --noEmit'},
        dependencies: {'@ant-design/pro-components': '1.0.0', '@umijs/max': '1.0.0', react: '1.0.0'},
      }),
      'frontend/package-lock.json': '{}\n',
      'frontend/src/.umi-production/core/plugin.ts': 'export const generated = true\n',
      'frontend/src/pages/orders/index.tsx': 'export default function Orders() { return null }\n',
    })

    const report = await scanRepository(root)

    expect(report.frameworks).toEqual(expect.arrayContaining([
      {name: 'Ant Design Pro', evidence: ['frontend/package.json']},
      {name: 'FastAPI', evidence: ['pyproject.toml']},
      {name: 'Umi Max', evidence: ['frontend/package.json']},
    ]))
    expect(report.commands).toEqual(expect.arrayContaining([
      expect.objectContaining({purpose: 'run', command: 'npm --prefix frontend run dev'}),
      expect.objectContaining({purpose: 'test', command: 'npm --prefix frontend run test'}),
    ]))
    expect(report.references).toContain('frontend/src/pages/orders/index.tsx')
    expect(report.references).not.toContain('app/services/__init__.py')
    expect(report.references.some((item) => item.includes('.umi-production'))).toBe(false)
    expect(report.commands.some((item) => item.command.includes('test:watch'))).toBe(false)
  })

  it('returns stable ordered evidence across repeated scans', async () => {
    const root = await temporaryRepository('deterministic')
    await writeRepositoryFiles(root, {
      'pom.xml': '<artifactId>ruoyi</artifactId><artifactId>spring-boot</artifactId>',
      'src/main/java/example/AController.java': '@PreAuthorize("a") class AController {}',
      'src/main/java/example/BController.java': '@PreAuthorize("b") class BController {}',
    })

    const first = await scanRepository(root)
    const second = await scanRepository(root)

    expect({...first, generatedAt: ''}).toEqual({...second, generatedAt: ''})
  })
})
