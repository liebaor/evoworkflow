import {Command, Flags} from '@oclif/core'

import {EvoError} from './errors.js'
import {errorMessage} from '../repository/io.js'

export const rootFlag = Flags.directory({
  char: 'C',
  default: process.cwd(),
  description: 'Managed repository root / 受管理仓库根目录',
  exists: true,
})

export const jsonFlag = Flags.boolean({description: 'Print machine-readable JSON / 输出机器可读 JSON'})

/** Converts expected domain failures into concise CLI errors. */
export function failCommand(command: Command, error: unknown): never {
  command.error(errorMessage(error), {exit: error instanceof EvoError ? error.exitCode : 1})
}
