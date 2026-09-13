import {Args, Command, Flags} from '@oclif/core'

import {failCommand, jsonFlag, rootFlag} from '../core/cli.js'
import {approveArtifact, type ApprovableArtifactKind} from '../repository/artifacts.js'

const artifactKinds = ['change', 'spec', 'plan'] as const

export default class Approve extends Command {
  public static override args = {
    change: Args.string({required: true}),
    artifact: Args.string({options: artifactKinds, required: true}),
  }
  public static override description = 'Bind explicit human approval to one active Change, Specification, or Plan / 把人工批准绑定到一个活动 Change、Specification 或 Plan'
  public static override flags = {
    json: jsonFlag,
    root: rootFlag,
    source: Flags.string({default: 'evo approve', description: 'Human-visible approval source label / 人工可见的批准来源标签'}),
  }

  public async run(): Promise<void> {
    try {
      const {args, flags} = await this.parse(Approve)
      const result = await approveArtifact(flags.root, args.change, args.artifact as ApprovableArtifactKind, flags.source)
      this.log(flags.json ? JSON.stringify(result, null, 2) : [
        `Approved ${result.kind}.md for Change ${result.changeId}.`,
        `Fingerprint: ${result.approval.fingerprint}`,
        `Path: ${result.path}`,
      ].join('\n'))
    } catch (error) {
      failCommand(this, error)
    }
  }
}
