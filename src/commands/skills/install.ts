import {Command, Flags} from '@oclif/core'

import {failCommand, jsonFlag, rootFlag} from '../../core/cli.js'
import {applySkillInstallation, formatSkillInstallPlan, planSkillInstallation} from '../../skills/installation.js'

export default class SkillsInstall extends Command {
  public static override description = 'Preview or apply the canonical EVO Skill installation / 预览或应用 EVO canonical Skill 安装'
  public static override flags = {apply: Flags.boolean({description: 'Apply only safe missing canonical Skills and adapters / 只应用安全的缺失 Skill 和适配器'}), json: jsonFlag, root: rootFlag}

  public async run(): Promise<void> {
    try {
      const {flags} = await this.parse(SkillsInstall)
      const preview = await planSkillInstallation({projectRoot: flags.root})
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
