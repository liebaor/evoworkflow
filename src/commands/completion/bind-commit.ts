import {Args, Command, Flags} from '@oclif/core'

import {failCommand, jsonFlag, rootFlag} from '../../core/cli.js'
import {bindCompletionCommit} from '../../repository/completion.js'

export default class CompletionBindCommit extends Command {
  public static override args = {change: Args.string({required: true})}
  public static override description = 'Bind an existing Git commit to a completed Change without creating a commit / 将已有 Git 提交绑定到已完成 Change，但不自动提交'
  public static override flags = {
    commit: Flags.string({description: 'Full commit SHA; defaults to current HEAD / 完整提交 SHA，默认当前 HEAD'}),
    json: jsonFlag,
    root: rootFlag,
  }

  public async run(): Promise<void> {
    try {
      const {args, flags} = await this.parse(CompletionBindCommit)
      const completion = await bindCompletionCommit(flags.root, args.change, flags.commit)
      this.log(flags.json ? JSON.stringify(completion, null, 2) : `Bound ${completion.commit} to ${completion.change}; source status is ${completion.sourceStatus}.`)
    } catch (error) {
      failCommand(this, error)
    }
  }
}
