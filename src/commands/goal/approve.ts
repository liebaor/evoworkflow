import {Args, Command} from '@oclif/core'

import {failCommand, jsonFlag, rootFlag} from '../../core/cli.js'
import {approveActiveGoal, formatGoal} from '../../repository/goals.js'

export default class GoalApprove extends Command {
  public static override args = {id: Args.string({required: true})}
  public static override description = 'Record explicit human approval for Goal intent and current Change context / 记录 Goal 意图和当前 Change 上下文的人工批准'
  public static override flags = {json: jsonFlag, root: rootFlag}

  public async run(): Promise<void> {
    try {
      const {args, flags} = await this.parse(GoalApprove)
      const goal = await approveActiveGoal(flags.root, args.id)
      this.log(flags.json ? JSON.stringify(goal, null, 2) : formatGoal(goal))
    } catch (error) {
      failCommand(this, error)
    }
  }
}
