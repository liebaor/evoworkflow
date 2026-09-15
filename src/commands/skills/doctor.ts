import {Command} from '@oclif/core'

import {failCommand, jsonFlag, rootFlag} from '../../core/cli.js'
import {formatSkillDoctorReport, runSkillDoctor} from '../../skills/diagnostics.js'

export default class SkillsDoctor extends Command {
  public static override description = 'Diagnose EVO Skill visibility, links, metadata, and drift / 诊断 EVO Skill 可见性、链接、元数据和漂移'
  public static override flags = {json: jsonFlag, root: rootFlag}

  public async run(): Promise<void> {
    try {
      const {flags} = await this.parse(SkillsDoctor)
      const report = await runSkillDoctor(flags.root)
      this.log(flags.json ? JSON.stringify(report, null, 2) : formatSkillDoctorReport(report))
      if (report.status === 'ERROR') this.exit(1)
    } catch (error) {
      failCommand(this, error)
    }
  }
}
