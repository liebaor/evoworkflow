import {Args, Command} from '@oclif/core'

import {failCommand, jsonFlag, rootFlag} from '../../core/cli.js'
import {checkChangeSet, formatChangeSetReport} from '../../repository/change-sets.js'

export default class ChangeSetStatus extends Command {
  public static override args = {id: Args.string({required: true})}
  public static override description = 'Show the current read-only status of a Change Set / 显示 Change Set 当前只读状态'
  public static override flags = {json: jsonFlag, root: rootFlag}

  public async run(): Promise<void> {
    try {
      const {args, flags} = await this.parse(ChangeSetStatus)
      const report = await checkChangeSet(flags.root, args.id)
      this.log(flags.json ? JSON.stringify(report, null, 2) : formatChangeSetReport(report))
    } catch (error) {
      failCommand(this, error)
    }
  }
}
