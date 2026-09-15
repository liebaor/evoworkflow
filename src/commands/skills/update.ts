import {Command, Flags} from '@oclif/core'

import {failCommand, jsonFlag, rootFlag} from '../../core/cli.js'
import {applySkillInstallation, formatSkillInstallPlan, planSkillUpdate} from '../../skills/installation.js'

export default class SkillsUpdate extends Command {
  public static override description = 'Preview or safely apply canonical EVO Skill updates / 预览或安全应用 EVO Skill 更新'
  public static override flags = {apply: Flags.boolean({description: 'Apply only receipt-backed safe updates / 只应用有安装收据支持的安全更新'}), json: jsonFlag, root: rootFlag}

  public async run(): Promise<void> {
    try {
      const {flags} = await this.parse(SkillsUpdate)
      const preview = await planSkillUpdate({projectRoot: flags.root})
      if (preview.blockers.length > 0) {
        this.log(flags.json ? JSON.stringify(preview, null, 2) : formatSkillInstallPlan(preview))
        this.exit(1)
      }
      const report = flags.apply ? await applySkillInstallation(preview) : preview
      this.log(flags.json ? JSON.stringify(report, null, 2) : formatSkillInstallPlan(report))
    } catch (error) {
      failCommand(this, error)
    }
  }
}
