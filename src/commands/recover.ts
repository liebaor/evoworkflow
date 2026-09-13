import {Command} from '@oclif/core'

import {failCommand, jsonFlag, rootFlag} from '../core/cli.js'
import {buildRecoveryReport, formatRecoveryReport} from '../repository/recovery.js'

export default class Recover extends Command {
  public static override description = 'Reconstruct a read-only recovery handoff from repository state / 根据仓库状态生成只读恢复交接报告'
  public static override flags = {json: jsonFlag, root: rootFlag}

  public async run(): Promise<void> {
    try {
      const {flags} = await this.parse(Recover)
      const report = await buildRecoveryReport(flags.root)
      this.log(flags.json ? JSON.stringify(report, null, 2) : formatRecoveryReport(report))
      if (!report.valid) this.exit(1)
    } catch (error) {
      failCommand(this, error)
    }
  }
}
