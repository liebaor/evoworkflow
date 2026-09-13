import {Command, Flags} from '@oclif/core'

import {failCommand, jsonFlag, rootFlag} from '../core/cli.js'
import {applyMigration, formatMigration, planMigration} from '../repository/migrations.js'

export default class Migrate extends Command {
  public static override description = 'Preview or apply the repository protocol v1-to-v2 migration / 预览或执行仓库协议 v1 到 v2 迁移'
  public static override flags = {
    apply: Flags.boolean({description: 'Apply the planned migration / 执行迁移'}),
    json: jsonFlag,
    root: rootFlag,
  }

  public async run(): Promise<void> {
    try {
      const {flags} = await this.parse(Migrate)
      const plan = await planMigration(flags.root)
      const result = flags.apply ? await applyMigration(plan) : plan
      this.log(flags.json ? JSON.stringify(result, null, 2) : formatMigration(result))
    } catch (error) {
      failCommand(this, error)
    }
  }
}
