import {Command, Flags} from '@oclif/core'

import {failCommand, jsonFlag, rootFlag} from '../../core/cli.js'
import {formatAgentSetupReport, setupAgentCompatibility} from '../../agents/setup.js'

export default class AgentsSetup extends Command {
  public static override description = 'Preview or apply the safe thin cross-agent repository adapter / 预览或应用安全的薄跨 Agent 仓库适配器'
  public static override flags = {apply: Flags.boolean({description: 'Apply only the declared safe adapter operation / 只应用已声明的安全适配器操作'}), json: jsonFlag, root: rootFlag}

  public async run(): Promise<void> {
    try {
      const {flags} = await this.parse(AgentsSetup)
      const report = await setupAgentCompatibility(flags.root, {apply: flags.apply})
      this.log(flags.json ? JSON.stringify(report, null, 2) : formatAgentSetupReport(report))
      if (report.action === 'BLOCKED' || report.action === 'NEEDS_HUMAN_MERGE') this.exit(1)
    } catch (error) {
      failCommand(this, error)
    }
  }
}
