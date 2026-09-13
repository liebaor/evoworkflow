import {Command} from '@oclif/core'

import {failCommand, jsonFlag, rootFlag} from '../core/cli.js'
import {formatStatusSummary, getStatusSummary} from '../core/navigation.js'

export default class Status extends Command {
  public static override description = 'Report current evoworkflow state and one recommended next action without executing it / 报告当前状态和一个下一步建议，但不执行'
  public static override flags = {json: jsonFlag, root: rootFlag}

  public async run(): Promise<void> {
    try {
      const {flags} = await this.parse(Status)
      const summary = await getStatusSummary(flags.root)
      this.log(flags.json ? JSON.stringify(summary, null, 2) : formatStatusSummary(summary))
    } catch (error) {
      failCommand(this, error)
    }
  }
}
