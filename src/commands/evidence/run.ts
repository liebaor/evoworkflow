import {Args, Command, Flags} from '@oclif/core'

import {failCommand, jsonFlag, rootFlag} from '../../core/cli.js'
import {openManagedRepository} from '../../repository/managed.js'
import {runEvidence} from '../../repository/evidence.js'
import type {EvidenceKind} from '../../core/schemas.js'

const evidenceKinds = ['unit', 'integration', 'api', 'browser', 'manual', 'external', 'build', 'other'] as const

export default class EvidenceRun extends Command {
  public static override args = {
    command: Args.string({description: 'Executable and arguments after -- / -- 后的可执行文件和参数', multiple: true, required: true}),
  }
  public static override description = 'Run one explicit evidence command and persist its result / 执行一个明确的证据命令并持久化结果'
  public static override flags = {
    acceptance: Flags.string({description: 'Acceptance id; repeat for multiple criteria / 验收项 id，可重复', multiple: true, required: true}),
    change: Flags.string({description: 'Change id; defaults to state.yml / Change id，默认读取 state.yml'}),
    cwd: Flags.string({description: 'Command working directory relative to repository / 相对仓库的命令工作目录'}),
    json: jsonFlag,
    kind: Flags.string({options: evidenceKinds, default: 'other', description: 'Evidence kind / 证据类型'}),
    label: Flags.string({description: 'Human-readable evidence label / 人类可读证据标签', required: true}),
    root: rootFlag,
    timeout: Flags.integer({default: 300_000, description: 'Timeout in milliseconds / 超时毫秒数'}),
  }

  public async run(): Promise<void> {
    try {
      const {args, flags} = await this.parse(EvidenceRun)
      const change = flags.change ?? (await openManagedRepository(flags.root)).state.activeChange
      if (!change) throw new Error('No active Change is available.')
      const [executable, ...commandArgs] = args.command
      if (!executable) throw new Error('An executable is required after --.')
      const record = await runEvidence({
        root: flags.root,
        changeId: change,
        acceptance: flags.acceptance,
        kind: flags.kind as EvidenceKind,
        label: flags.label,
        executable,
        args: commandArgs,
        ...(flags.cwd === undefined ? {} : {cwd: flags.cwd}),
        timeoutMs: flags.timeout,
      })
      this.log(flags.json ? JSON.stringify(record, null, 2) : format(record))
      if (record.status !== 'PASS') this.exit(1)
    } catch (error) {
      failCommand(this, error)
    }
  }
}

function format(record: Awaited<ReturnType<typeof runEvidence>>): string {
  return [`${record.status} ${record.label}`, `Record: ${record.id}`, `Acceptance: ${record.acceptance.join(', ')}`, `Summary: ${record.summary}`, `Git: ${record.git.head ?? 'unavailable'} (${record.git.treeFingerprint})`].join('\n')
}
