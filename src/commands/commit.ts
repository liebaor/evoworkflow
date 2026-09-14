import {Args, Command, Flags} from '@oclif/core'

import {failCommand, jsonFlag, rootFlag} from '../core/cli.js'
import {
  createDeliveryCommit,
  formatDeliveryPreview,
  prepareDeliveryCheckpoint,
  type DeliveryCheckpoint,
  type DeliveryOptions,
} from '../repository/delivery.js'

const checkpoints = ['SLICE', 'STAGE', 'BUGFIX', 'FINAL_DELIVERY'] as const

export default class Commit extends Command {
  public static override args = {
    change: Args.string({description: 'Change id; defaults to the active Change / Change id，默认活动 Change'}),
  }
  public static override description = 'Preview or explicitly create a structured Git delivery checkpoint / 预览或显式创建结构化 Git 交付检查点'
  public static override flags = {
    apply: Flags.boolean({description: 'Authorize creating the Git commit after explicit path selection / 明确选择路径后授权创建 Git commit'}),
    checkpoint: Flags.string({options: checkpoints, description: 'Checkpoint type / 检查点类型'}),
    json: jsonFlag,
    path: Flags.string({description: 'Changed path to include; repeat for a safe scope / 要纳入检查点的修改路径，可重复', multiple: true}),
    push: Flags.boolean({description: 'Push the newly created commit; requires --apply and explicit external authorization / 推送新 commit，需要 --apply 和明确外部授权'}),
    remote: Flags.string({default: 'origin', description: 'Git remote for explicit push / 显式推送使用的 Git remote'}),
    root: rootFlag,
    slice: Flags.string({description: 'Owning Slice id / 所属 Slice id'}),
  }

  public async run(): Promise<void> {
    try {
      const {args, flags} = await this.parse(Commit)
      const options: DeliveryOptions = {
        ...(args.change === undefined ? {} : {changeId: args.change}),
        ...(flags.checkpoint === undefined ? {} : {checkpoint: flags.checkpoint as DeliveryCheckpoint}),
        ...(flags.path === undefined ? {} : {paths: flags.path}),
        ...(flags.slice === undefined ? {} : {sliceId: flags.slice}),
        ...(flags.apply ? {apply: true} : {}),
        ...(flags.push ? {push: true} : {}),
        ...(flags.remote === undefined ? {} : {remote: flags.remote}),
      }
      const preview = await prepareDeliveryCheckpoint(flags.root, options)
      if (flags.json) this.log(JSON.stringify(preview, null, 2))
      else this.log(formatDeliveryPreview(preview))
      if (!flags.apply) {
        if (preview.status !== 'READY') this.exit(1)
        return
      }
      if (preview.status !== 'READY') this.exit(1)
      const result = await createDeliveryCommit(flags.root, options)
      this.log(flags.json
        ? JSON.stringify(result, null, 2)
        : `Created commit ${result.commit} for ${result.preview.change}.${result.pushed ? ` Pushed to ${result.remote}.` : ' Push not requested.'}`)
    } catch (error) {
      failCommand(this, error)
    }
  }
}
