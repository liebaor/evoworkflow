import {Command, Flags} from '@oclif/core'

import {checkConvergence, finishChange, formatConvergenceReport} from '../core/convergence.js'
import {failCommand, jsonFlag, rootFlag} from '../core/cli.js'

export default class Finish extends Command {
  public static override description = 'Check repository convergence and optionally archive an explicitly accepted Change / 检查仓库收敛，并可归档已明确接受的 Change'
  public static override flags = {
    apply: Flags.boolean({description: 'Archive the Change only when every convergence gate passes / 只有所有收敛门禁通过才归档 Change'}),
    change: Flags.string({description: 'Active Change id; defaults to state.yml / 活动 Change id，默认读取 state.yml'}),
    json: jsonFlag,
    root: rootFlag,
  }

  public async run(): Promise<void> {
    try {
      const {flags} = await this.parse(Finish)
      const report = flags.apply
        ? await finishChange(flags.root, flags.change)
        : await checkConvergence(flags.root, flags.change)
      this.log(flags.json ? JSON.stringify(report, null, 2) : formatConvergenceReport(report))
      if (!report.ready) this.exit(1)
      if (!flags.apply) this.log('\nNo files were moved. Use --apply only after reviewing this convergence report.')
    } catch (error) {
      failCommand(this, error)
    }
  }
}
