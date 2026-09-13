import {Command, Flags} from '@oclif/core'

import {failCommand, jsonFlag, rootFlag} from '../../core/cli.js'
import {openManagedRepository} from '../../repository/managed.js'
import {recordEvidence} from '../../repository/evidence.js'
import type {EvidenceKind, EvidenceRecordStatus} from '../../core/schemas.js'

const evidenceKinds = ['unit', 'integration', 'api', 'browser', 'manual', 'external', 'build', 'other'] as const
const statuses = ['PASS', 'FAIL', 'BLOCKED', 'NOT_RUN'] as const

export default class EvidenceRecord extends Command {
  public static override description = 'Record manually observed evidence with explicit status and limits / 记录人工观察到的证据、状态和限制'
  public static override flags = {
    acceptance: Flags.string({description: 'Acceptance id; repeat for multiple criteria / 验收项 id，可重复', multiple: true, required: true}),
    artifact: Flags.string({description: 'Repository artifact path; repeatable / 仓库内证据产物路径，可重复', multiple: true}),
    change: Flags.string({description: 'Change id; defaults to state.yml / Change id，默认读取 state.yml'}),
    json: jsonFlag,
    kind: Flags.string({options: evidenceKinds, default: 'manual', description: 'Evidence kind / 证据类型'}),
    label: Flags.string({description: 'Human-readable evidence label / 人类可读证据标签', required: true}),
    root: rootFlag,
    status: Flags.string({options: statuses, required: true, description: 'Observed status / 观察到的状态'}),
    summary: Flags.string({description: 'Observed result summary / 观察结果摘要', required: true}),
  }

  public async run(): Promise<void> {
    try {
      const {flags} = await this.parse(EvidenceRecord)
      const change = flags.change ?? (await openManagedRepository(flags.root)).state.activeChange
      if (!change) throw new Error('No active Change is available.')
      const record = await recordEvidence({
        root: flags.root,
        changeId: change,
        acceptance: flags.acceptance,
        kind: flags.kind as EvidenceKind,
        label: flags.label,
        status: flags.status as EvidenceRecordStatus,
        summary: flags.summary,
        ...(flags.artifact === undefined ? {} : {artifacts: flags.artifact}),
      })
      this.log(flags.json ? JSON.stringify(record, null, 2) : `${record.status} ${record.label}\nRecord: ${record.id}\nAcceptance: ${record.acceptance.join(', ')}\nSummary: ${record.summary}`)
    } catch (error) {
      failCommand(this, error)
    }
  }
}
