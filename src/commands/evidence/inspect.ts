import {Command, Flags} from '@oclif/core'

import {failCommand, jsonFlag, rootFlag} from '../../core/cli.js'
import {openManagedRepository} from '../../repository/managed.js'
import {readEvidence, readEvidenceRecords, reconcileEvidence} from '../../repository/evidence.js'

export default class EvidenceInspect extends Command {
  public static override description = 'Inspect machine evidence, append-only records, and reconciliation state / 检查机器证据、追加记录和收敛状态'
  public static override flags = {
    change: Flags.string({description: 'Change id; defaults to state.yml / Change id，默认读取 state.yml'}),
    json: jsonFlag,
    root: rootFlag,
  }

  public async run(): Promise<void> {
    try {
      const {flags} = await this.parse(EvidenceInspect)
      const change = flags.change ?? (await openManagedRepository(flags.root)).state.activeChange
      if (!change) throw new Error('No active Change is available.')
      const [evidence, records, reconciliation] = await Promise.all([
        readEvidence(flags.root, change),
        readEvidenceRecords(flags.root, change),
        reconcileEvidence(flags.root, change),
      ])
      const result = {change, evidence, records, reconciliation}
      this.log(flags.json ? JSON.stringify(result, null, 2) : format(result))
      if (!reconciliation.valid) this.exit(1)
    } catch (error) {
      failCommand(this, error)
    }
  }
}

function format(result: {readonly change: string; readonly evidence: Awaited<ReturnType<typeof readEvidence>>; readonly records: Awaited<ReturnType<typeof readEvidenceRecords>>; readonly reconciliation: Awaited<ReturnType<typeof reconcileEvidence>>}): string {
  const document = result.evidence.document
  return [
    `Change: ${result.change}`,
    `Evidence source: ${result.evidence.path ?? 'missing'}${result.evidence.legacy ? ' (legacy)' : ''}`,
    `Reconciled: ${result.reconciliation.valid ? 'yes' : 'no'}`,
    '',
    ...(document?.acceptance.map((item) => `- ${item.id}: ${item.status} [${item.evidenceRefs.join(', ') || 'no records'}]`) ?? ['- no evidence entries']),
    '',
    `Records: ${result.records.length}`,
    ...result.reconciliation.issues.map((issue) => `- ${issue.code}: ${issue.message}`),
  ].join('\n')
}
