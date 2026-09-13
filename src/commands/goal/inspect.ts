import {Args, Command} from '@oclif/core'

import {failCommand, jsonFlag, rootFlag} from '../../core/cli.js'
import {readActiveGoal} from '../../repository/managed.js'
import {formatGoal} from '../../repository/goals.js'

export default class GoalInspect extends Command {
  public static override args = {id: Args.string({required: true})}
  public static override description = 'Inspect persisted Goal checkpoints, evidence, and blockers / 检查持久化 Goal 检查点、证据和阻塞原因'
  public static override flags = {json: jsonFlag, root: rootFlag}

  public async run(): Promise<void> {
    try {
      const {args, flags} = await this.parse(GoalInspect)
      const goal = await readActiveGoal(flags.root, args.id)
      this.log(flags.json ? JSON.stringify(goal, null, 2) : formatGoal(goal))
    } catch (error) {
      failCommand(this, error)
    }
  }
}
