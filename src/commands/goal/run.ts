import {Args, Command} from '@oclif/core'

import {failCommand, jsonFlag, rootFlag} from '../../core/cli.js'
import {runStoredGoal} from '../../repository/goal-execution.js'
import {formatGoal} from '../../repository/goals.js'

export default class GoalRun extends Command {
  public static override args = {id: Args.string({required: true})}
  public static override description = 'Execute approved Goal Slices sequentially with persisted checkpoints / 顺序执行已批准 Goal Slice，并持久化检查点'
  public static override flags = {json: jsonFlag, root: rootFlag}

  public async run(): Promise<void> {
    try {
      const {args, flags} = await this.parse(GoalRun)
      const goal = await runStoredGoal(flags.root, args.id)
      this.log(flags.json ? JSON.stringify(goal, null, 2) : formatGoal(goal))
    } catch (error) {
      failCommand(this, error)
    }
  }
}
