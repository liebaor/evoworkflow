import {Command, Flags} from '@oclif/core'

import {failCommand, jsonFlag, rootFlag} from '../core/cli.js'
import {buildWorkingContext, formatWorkingContext, writeWorkingContext} from '../repository/working-context.js'

export default class Context extends Command {
  public static override description = 'Build read-only task context, or explicitly write it as current Change work material / 构建只读任务上下文，或显式写入当前 Change 工作材料'
  public static override flags = {
    change: Flags.string({description: 'Active Change id; defaults to state.yml / 活动 Change id，默认读取 state.yml'}),
    json: jsonFlag,
    root: rootFlag,
    write: Flags.boolean({description: 'Write only .evo/work/active/<change-id>/context.md / 只写入当前 Change 的 context.md'}),
  }

  public async run(): Promise<void> {
    try {
      const {flags} = await this.parse(Context)
      const context = await buildWorkingContext(flags.root, flags.change)
      let writtenPath: string | null = null
      if (flags.write) {
        if (!context.change) throw new Error('--write requires an active Change. / --write 需要活动 Change。')
        writtenPath = await writeWorkingContext(flags.root, context.change.id, context)
      }
      if (flags.json) this.log(JSON.stringify(writtenPath ? {...context, writtenPath} : context, null, 2))
      else this.log(`${formatWorkingContext(context)}${writtenPath ? `\n\nWritten / 已写入：${writtenPath}` : '\n\nRead only / 只读：没有写入文件。'}`)
    } catch (error) {
      failCommand(this, error)
    }
  }
}
