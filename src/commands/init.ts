import {Command, Flags} from '@oclif/core'

import {failCommand, jsonFlag, rootFlag} from '../core/cli.js'
import {applyInitialization, formatInitializationPlan, planInitialization} from '../repository/init.js'

export default class Init extends Command {
  public static override description = 'Inspect a repository and optionally apply non-destructive evoworkflow initialization / 检查仓库，并可应用不破坏文件的 evoworkflow 初始化'
  public static override flags = {
    apply: Flags.boolean({description: 'Create missing evoworkflow files after showing the discovery result / 展示发现结果后创建缺失的 evoworkflow 文件'}),
    json: jsonFlag,
    root: rootFlag,
  }

  public async run(): Promise<void> {
    try {
      const {flags} = await this.parse(Init)
      const plan = await planInitialization(flags.root)
      if (!flags.apply) {
        if (flags.json) this.log(JSON.stringify(plan, null, 2))
        else {
          this.log(formatInitializationPlan(plan))
          this.log('\nNo files were written / 未写入文件。请审阅报告后再使用 --apply。')
        }
        return
      }
      const result = await applyInitialization(plan)
      if (flags.json) this.log(JSON.stringify(result, null, 2))
      else {
        this.log(formatInitializationPlan(plan))
        this.log('\nApplied initialization / 已应用初始化:')
        for (const action of result.actions) this.log(`- ${action.outcome}: ${action.path} / ${action.outcome === 'created' ? '已创建' : '已保留'}`)
      }
    } catch (error) {
      failCommand(this, error)
    }
  }
}
