import {Command} from '@oclif/core'

import {failCommand, jsonFlag, rootFlag} from '../core/cli.js'
import {formatValidationReport, validateProject} from '../validation/project.js'

export default class Check extends Command {
  public static override description = 'Validate deterministic evoworkflow repository invariants / 验证 evoworkflow 仓库不变量'
  public static override flags = {json: jsonFlag, root: rootFlag}

  public async run(): Promise<void> {
    try {
      const {flags} = await this.parse(Check)
      const report = await validateProject(flags.root)
      this.log(flags.json ? JSON.stringify(report, null, 2) : formatValidationReport(report))
      if (!report.valid) this.exit(1)
    } catch (error) {
      failCommand(this, error)
    }
  }
}
