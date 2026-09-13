import {Command} from '@oclif/core'

import {failCommand, jsonFlag, rootFlag} from '../core/cli.js'
import {formatDoctorReport, runDoctor} from '../validation/doctor.js'

export default class Doctor extends Command {
  public static override description = 'Report stale or inconsistent repository knowledge without applying repairs / 报告陈旧或不一致知识，但不自动修复'
  public static override flags = {json: jsonFlag, root: rootFlag}

  public async run(): Promise<void> {
    try {
      const {flags} = await this.parse(Doctor)
      const report = await runDoctor(flags.root)
      this.log(flags.json ? JSON.stringify(report, null, 2) : formatDoctorReport(report))
      if (!report.valid) this.exit(1)
    } catch (error) {
      failCommand(this, error)
    }
  }
}
