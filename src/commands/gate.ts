import {Args, Command, Flags} from '@oclif/core'

import {failCommand, jsonFlag, rootFlag} from '../core/cli.js'
import {evaluateProjectGates, evaluateProtocolGates} from '../validation/gates.js'

export default class Gate extends Command {
  public static override args = {change: Args.string({description: 'Change id; defaults to the active Change / Change id，默认活动 Change'})}
  public static override description = 'Evaluate protocol hard gates and report-only project gates / 评估协议硬门禁和只报告项目门禁'
  public static override flags = {
    json: jsonFlag,
    kind: Flags.string({default: 'both', options: ['protocol', 'project', 'both'], description: 'Gate layer to evaluate / 要评估的门禁层'}),
    root: rootFlag,
    write: Flags.boolean({description: 'Persist gate reports / 持久化门禁报告'}),
  }

  public async run(): Promise<void> {
    try {
      const {args, flags} = await this.parse(Gate)
      const reports = []
      if (flags.kind === 'protocol' || flags.kind === 'both') reports.push(await evaluateProtocolGates(flags.root, args.change, {persist: flags.write}))
      if (flags.kind === 'project' || flags.kind === 'both') reports.push(await evaluateProjectGates(flags.root, args.change, {persist: flags.write}))
      this.log(flags.json ? JSON.stringify(reports.length === 1 ? reports[0] : reports, null, 2) : reports.flatMap((report) => report.gates.map((gate) => `${gate.status} ${gate.enforcement} ${gate.id}: ${gate.detail}`)).join('\n'))
      if (reports.some((report) => ['FAIL', 'BLOCKED', 'NOT_RUN'].includes(report.status) && report.gates.some((gate) => gate.enforcement === 'HARD'))) this.exit(1)
    } catch (error) {
      failCommand(this, error)
    }
  }
}
