import {Command} from '@oclif/core'

import {failCommand, jsonFlag, rootFlag} from '../../core/cli.js'
import {formatAgentCompatibilityReport, runAgentDoctor} from '../../agents/compatibility.js'

export default class AgentsDoctor extends Command {
  public static override description = 'Report cross-agent compatibility errors, warnings, and availability information / 报告跨 Agent 兼容性错误、警告和可用性信息'
  public static override flags = {json: jsonFlag, root: rootFlag}

  public async run(): Promise<void> {
    try {
      const {flags} = await this.parse(AgentsDoctor)
      const report = await runAgentDoctor(flags.root)
      this.log(flags.json ? JSON.stringify(report, null, 2) : formatAgentCompatibilityReport(report))
      if (report.diagnostics.some((item) => item.severity === 'ERROR')) this.exit(1)
    } catch (error) {
      failCommand(this, error)
    }
  }
}
