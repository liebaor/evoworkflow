import {Args, Command, Flags} from '@oclif/core'

import {failCommand, jsonFlag, rootFlag} from '../../core/cli.js'
import {cancelGoal, formatGoal} from '../../repository/goals.js'

export default class GoalCancel extends Command {
  public static override args = {id: Args.string({required: true})}
  public static override description = 'Cancel a checkpointed Goal while preserving its evidence / 取消有检查点的 Goal，同时保留证据'
  public static override flags = {
    json: jsonFlag,
    reason: Flags.string({description: 'Human cancellation reason / 人工取消原因', required: true}),
    root: rootFlag,
  }

  public async run(): Promise<void> {
    try {
      const {args, flags} = await this.parse(GoalCancel)
      const goal = await cancelGoal(flags.root, args.id, flags.reason)
      this.log(flags.json ? JSON.stringify(goal, null, 2) : formatGoal(goal))
    } catch (error) {
      failCommand(this, error)
    }
  }
}
