import {describe, expect, it} from 'vitest'

import {classifyChange, detectPrematureAbstraction} from '../src/repository/classification.js'

describe('adaptive Change classification', () => {
  it('uses the short path for a clear local copy change', () => {
    const result = classifyChange({request: '把按钮“提交”改成“确认提交”'})

    expect(result.weight).toBe('SMALL')
    expect(result.process).toBe('SHORT')
    expect(result.recommendedArtifacts).toEqual(['Minimal Working Context', 'Implementation', 'Focused Verify'])
  })

  it('keeps an ordinary feature on the Standard path', () => {
    const result = classifyChange({request: '增加供应商列表和导出功能'})

    expect(result.weight).toBe('STANDARD')
    expect(result.process).toBe('STANDARD')
  })

  it('escalates cross-module public data changes to Large', () => {
    const result = classifyChange({
      request: '跨模块增加库存状态 API 和数据库迁移',
      affectedModules: 3,
      changesPublicApi: true,
      changesData: true,
    })

    expect(result.weight).toBe('LARGE')
    expect(result.reasons).toEqual(expect.arrayContaining(['公共 API 或兼容性可能变化。', '数据含义、Schema 或迁移可能变化。', '影响多个模块。']))
  })

  it('flags an abstraction stack that is disproportionate to a local request', () => {
    const finding = detectPrematureAbstraction('增加一个库存判断', 'class PolicyFactory {} class StrategyRegistry {}')

    expect(finding.detected).toBe(true)
    expect(finding.abstractions).toEqual(['PolicyFactory', 'StrategyRegistry'])
  })
})
