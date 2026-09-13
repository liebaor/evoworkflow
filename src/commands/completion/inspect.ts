import {Args, Command} from '@oclif/core'

import {failCommand, jsonFlag, rootFlag} from '../../core/cli.js'
import {checkCurrentTruth, readCompletion} from '../../repository/completion.js'

export default class CompletionInspect extends Command {
  public static override args = {change: Args.string({required: true})}
  public static override description = 'Inspect a completed Change handoff and current-truth record / 检查已完成 Change 的交付凭证和当前事实记录'
  public static override flags = {json: jsonFlag, root: rootFlag}

  public async run(): Promise<void> {
    try {
      const {args, flags} = await this.parse(CompletionInspect)
      const completion = await readCompletion(flags.root, args.change)
      if (!completion) throw new Error(`Completion record is missing for ${args.change}.`)
      const truth = await checkCurrentTruth(flags.root, args.change, true)
      const result = {completion, currentTruth: truth}
      this.log(flags.json ? JSON.stringify(result, null, 2) : format(result))
      if (truth.missing.length > 0) this.exit(1)
    } catch (error) {
      failCommand(this, error)
    }
  }
}

function format(result: {readonly completion: NonNullable<Awaited<ReturnType<typeof readCompletion>>>; readonly currentTruth: Awaited<ReturnType<typeof checkCurrentTruth>>}): string {
  return [
    `Change: ${result.completion.change}`,
    `Finished: ${result.completion.finishedAt}`,
    `Source: ${result.completion.sourceStatus}`,
    `Commit: ${result.completion.commit ?? 'not bound'}`,
    `Current truth: ${result.currentTruth.missing.length === 0 ? 'verified' : `missing ${result.currentTruth.missing.join(', ')}`}`,
  ].join('\n')
}
