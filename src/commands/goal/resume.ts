import {Args, Command, Flags} from '@oclif/core'

import {failCommand, jsonFlag, rootFlag} from '../../core/cli.js'
import {runStoredGoal} from '../../repository/goal-execution.js'
import {formatGoal, resumeGoal} from '../../repository/goals.js'

export default class GoalResume extends Command {
  public static override args = {id: Args.string({required: true})}
  public static override description = 'Record a human resume reason and continue a BLOCKED or interrupted RUNNING Goal in a new bounded attempt epoch / 记录人工恢复原因，并在新的有边界尝试 epoch 中继续 BLOCKED 或中断的 RUNNING Goal'
  public static override flags = {
    json: jsonFlag,
    reason: Flags.string({description: 'Why the blocker is resolved or safe to retry / 为什么阻塞已解决或可以安全重试', required: true}),
    root: rootFlag,
  }

  public async run(): Promise<void> {
    try {
      const {args, flags} = await this.parse(GoalResume)
      await resumeGoal(flags.root, args.id, flags.reason)
      const goal = await runStoredGoal(flags.root, args.id)
      this.log(flags.json ? JSON.stringify(goal, null, 2) : formatGoal(goal))
    } catch (error) {
      failCommand(this, error)
    }
  }
}
