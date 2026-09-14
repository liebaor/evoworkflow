import {Args, Command, Flags} from '@oclif/core'

import {failCommand, jsonFlag, rootFlag} from '../core/cli.js'
import {resolveEngineeringConstraints, formatConstraints} from '../repository/constraints.js'
import {openManagedRepository} from '../repository/managed.js'

export default class Constraints extends Command {
  public static override args = {change: Args.string({description: 'Change id; defaults to the active Change / Change id，默认活动 Change'})}
  public static override description = 'Resolve disposable, traceable task engineering constraints / 解析可重建且可追溯的任务工程约束'
  public static override flags = {
    json: jsonFlag,
    root: rootFlag,
    write: Flags.boolean({description: 'Persist constraints.yml under the active Change / 将 constraints.yml 写入活动 Change'}),
  }

  public async run(): Promise<void> {
    try {
      const {args, flags} = await this.parse(Constraints)
      const changeId = args.change ?? (await openManagedRepository(flags.root)).state.activeChange
      if (!changeId) throw new Error('No active Change is available. / 没有活动 Change。')
      const resolution = await resolveEngineeringConstraints(flags.root, changeId, {persist: flags.write})
      this.log(flags.json ? JSON.stringify(resolution.document, null, 2) : `${formatConstraints(resolution)}\n\n${flags.write ? 'Written / 已写入 constraints.yml.' : 'Read only / 只读：没有写入文件。'}`)
    } catch (error) {
      failCommand(this, error)
    }
  }
}
