import {Command} from '@oclif/core'

import {failCommand, jsonFlag, rootFlag} from '../../core/cli.js'
import {formatSkillInstallPlan, planSkillInstallation} from '../../skills/installation.js'

export default class SkillsInspect extends Command {
  public static override description = 'Inspect the canonical EVO Skill installation / 检查 EVO canonical Skill 安装'
  public static override flags = {json: jsonFlag, root: rootFlag}

  public async run(): Promise<void> {
    try {
      const {flags} = await this.parse(SkillsInspect)
      const report = await planSkillInstallation({projectRoot: flags.root})
      this.log(flags.json ? JSON.stringify(report, null, 2) : formatSkillInstallPlan(report))
    } catch (error) {
      failCommand(this, error)
    }
  }
}
