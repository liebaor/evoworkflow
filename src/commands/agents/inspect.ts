import {Command} from '@oclif/core'

import {failCommand, jsonFlag, rootFlag} from '../../core/cli.js'
import {formatAgentCompatibilityReport, inspectAgentCompatibility} from '../../agents/compatibility.js'

export default class AgentsInspect extends Command {
  public static override description = 'Inspect cross-agent instruction, Skill, version, and runtime compatibility / 检查跨 Agent 指令、Skill、版本和运行时兼容性'
  public static override flags = {json: jsonFlag, root: rootFlag}

  public async run(): Promise<void> {
    try {
      const {flags} = await this.parse(AgentsInspect)
      const report = await inspectAgentCompatibility(flags.root)
      this.log(flags.json ? JSON.stringify(report, null, 2) : formatAgentCompatibilityReport(report))
    } catch (error) {
      failCommand(this, error)
    }
  }
}
