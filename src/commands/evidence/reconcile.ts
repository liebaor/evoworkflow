import {Command, Flags} from '@oclif/core'

import {failCommand, jsonFlag, rootFlag} from '../../core/cli.js'
import {openManagedRepository} from '../../repository/managed.js'
import {reconcileEvidence} from '../../repository/evidence.js'

export default class EvidenceReconcile extends Command {
  public static override description = 'Check the exact acceptance-to-evidence set without changing files / 检查验收到证据的精确集合，不写入文件'
  public static override flags = {
    change: Flags.string({description: 'Change id; defaults to state.yml / Change id，默认读取 state.yml'}),
    json: jsonFlag,
    root: rootFlag,
  }

  public async run(): Promise<void> {
    try {
      const {flags} = await this.parse(EvidenceReconcile)
      const change = flags.change ?? (await openManagedRepository(flags.root)).state.activeChange
      if (!change) throw new Error('No active Change is available.')
      const report = await reconcileEvidence(flags.root, change)
      this.log(flags.json ? JSON.stringify(report, null, 2) : format(report))
      if (!report.valid) this.exit(1)
    } catch (error) {
      failCommand(this, error)
    }
  }
}

function format(report: Awaited<ReturnType<typeof reconcileEvidence>>): string {
  return [
    `Change: ${report.change}`,
    `Authority: ${report.authority}`,
    `Criteria: ${report.criteria.join(', ') || 'none'}`,
    `Valid: ${report.valid ? 'yes' : 'no'}`,
    `Legacy: ${report.legacy ? 'yes' : 'no'}`,
    ...report.issues.map((issue) => `- ${issue.code}: ${issue.message}`),
  ].join('\n')
}
