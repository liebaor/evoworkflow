import {Args, Command} from '@oclif/core'

import {failCommand, jsonFlag, rootFlag} from '../../core/cli.js'
import {checkChangeSet, formatChangeSetReport} from '../../repository/change-sets.js'

export default class ChangeSetCheck extends Command {
  public static override args = {id: Args.string({required: true})}
  public static override description = 'Check a multi-repository Change Set and its contract hashes / 检查多仓库 Change Set 及契约哈希'
  public static override flags = {json: jsonFlag, root: rootFlag}

  public async run(): Promise<void> {
    try {
      const {args, flags} = await this.parse(ChangeSetCheck)
      const report = await checkChangeSet(flags.root, args.id)
      this.log(flags.json ? JSON.stringify(report, null, 2) : formatChangeSetReport(report))
      if (!report.valid) this.exit(1)
    } catch (error) {
      failCommand(this, error)
    }
  }
}
