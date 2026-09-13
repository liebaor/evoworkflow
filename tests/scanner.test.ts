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
    expect(report.technologies).toEqual(expect.arrayContaining([
      expect.objectContaining({name: 'Java', confidence: 'CONFIRMED'}),
      expect.objectContaining({name: 'Maven', confidence: 'CONFIRMED'}),
      expect.objectContaining({name: 'RuoYi', confidence: 'CONFIRMED'}),
      expect.objectContaining({name: 'Spring Boot', confidence: 'CONFIRMED'}),
    ]))
    expect(report.areas).toEqual(expect.arrayContaining([
      expect.objectContaining({path: 'src', kind: 'backend'}),
    ]))
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

  it('records versions only from metadata and keeps indirect stack signals inferred', async () => {
    const root = await temporaryRepository('grounding')
    await writeRepositoryFiles(root, {
      'pom.xml': '<properties><java.version>17</java.version><spring-boot.version>3.2.1</spring-boot.version><ruoyi.version>3.9.2</ruoyi.version></properties><dependency><groupId>com.mysql</groupId><artifactId>mysql-connector-j</artifactId></dependency><artifactId>spring-boot-starter-security</artifactId>',
      'ry.sh': '#!/bin/sh\n',
      'ruoyi-admin/src/main/java/App.java': 'class App {}\n',
      'ruoyi-common/src/main/java/Common.java': 'class Common {}\n',
      'sql/schema.sql': 'CREATE TABLE example (id BIGINT);\n',
      'docs/architecture.md': '# Architecture\n',
      'frontend/package.json': JSON.stringify({
        engines: {node: '>=20'},
        dependencies: {vue: '3.5.0'},
        devDependencies: {vite: '6.0.0'},
      }),
      'frontend/pnpm-lock.yaml': 'lockfileVersion: 9\n',
      'frontend/src/App.vue': '<template />\n',
      'frontend/src/views/permissions.vue': '<el-tooltip content="@PreAuthorize(@ss.hasRole)" />\n',
      'config/application.yml': 'spring:\n  datasource:\n    url: jdbc:mysql://localhost/demo\n',
    })

    const report = await scanRepository(root)
    const technology = (name: string) => report.technologies.find((item) => item.name === name)

    expect(technology('Java')).toEqual(expect.objectContaining({version: '17', confidence: 'CONFIRMED'}))
    expect(technology('Spring Boot')).toEqual(expect.objectContaining({version: '3.2.1', confidence: 'CONFIRMED'}))
    expect(technology('RuoYi')).toEqual(expect.objectContaining({version: '3.9.2', confidence: 'CONFIRMED'}))
    expect(technology('MySQL')).toEqual(expect.objectContaining({version: null, confidence: 'CONFIRMED'}))
    expect(technology('Vue')).toEqual(expect.objectContaining({version: '3.5.0', confidence: 'CONFIRMED'}))
    expect(technology('Vite')).toEqual(expect.objectContaining({version: '6.0.0', confidence: 'CONFIRMED'}))
    expect(technology('Node.js')).toEqual(expect.objectContaining({version: '>=20', confidence: 'CONFIRMED'}))
    expect(technology('Spring Security')?.evidence.some((item) => item.startsWith('frontend/'))).toBe(false)
    expect(report.capabilities.map((item) => item.name)).not.toContain('authorization')
    expect(report.commands.map((item) => item.command)).toEqual(expect.arrayContaining(['mvn package', 'mvn test', 'bash ry.sh start', 'bash ry.sh status']))
    expect(report.areas).toEqual(expect.arrayContaining([
      expect.objectContaining({path: 'ruoyi-admin', kind: 'backend'}),
      expect.objectContaining({path: 'ruoyi-common', kind: 'shared'}),
      expect.objectContaining({path: 'frontend', kind: 'frontend'}),
      expect.objectContaining({path: 'sql', kind: 'database'}),
      expect.objectContaining({path: 'docs', kind: 'docs'}),
    ]))
    expect(report.unknowns).toContain('Version for MySQL was not confirmed from repository metadata.')
  })

  it('does not promote an indirect configuration hint to confirmed technology evidence', async () => {
    const root = await temporaryRepository('inferred-technology')
    await writeRepositoryFiles(root, {
      'src/main/java/App.java': 'class App {}\n',
      'config/application.yml': 'pagehelper:\n  helperDialect: mysql\n',
    })

    const report = await scanRepository(root)
    const mysql = report.technologies.find((item) => item.name === 'MySQL')

    expect(mysql).toEqual(expect.objectContaining({version: null, confidence: 'INFERRED'}))
    expect(mysql?.evidence).toEqual(['config/application.yml'])
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
