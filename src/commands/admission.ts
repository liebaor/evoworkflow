import {Args, Command, Flags} from '@oclif/core'

import {failCommand, jsonFlag, rootFlag} from '../core/cli.js'
import {candidateAdmission, formatAdmission} from '../validation/gates.js'

export default class Admission extends Command {
  public static override args = {change: Args.string({description: 'Change id; defaults to the active Change / Change id，默认活动 Change'})}
  public static override description = 'Run deterministic Candidate Admission before Review / 在 Review 前运行确定性候选准入检查'
  public static override flags = {
    allowLegacy: Flags.boolean({description: 'Report legacy evidence as a warning / 将旧版 Evidence 作为警告处理'}),
    deferAcceptance: Flags.string({aliases: ['defer-acceptance'], description: 'Acceptance id completed after Review Admission; repeatable and explicit / 在 Review Admission 后完成的验收项，可重复且必须明确指定', multiple: true}),
    json: jsonFlag,
    root: rootFlag,
    write: Flags.boolean({description: 'Persist gate, trace, and admission reports / 持久化门禁、追踪和准入报告'}),
  }

  public async run(): Promise<void> {
    try {
      const {args, flags} = await this.parse(Admission)
      const admission = await candidateAdmission(flags.root, args.change, {
        allowLegacyEvidence: flags.allowLegacy,
        ...(flags.deferAcceptance === undefined ? {} : {deferredAcceptance: flags.deferAcceptance}),
        persist: flags.write,
      })
      this.log(flags.json ? JSON.stringify(admission, null, 2) : formatAdmission(admission))
      if (admission.status !== 'REVIEW_ADMITTED') this.exit(1)
    } catch (error) {
      failCommand(this, error)
    }
  }
}
