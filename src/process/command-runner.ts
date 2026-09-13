import {spawn} from 'node:child_process'

export interface CommandRunOptions {
  readonly cwd: string
  readonly timeoutMs: number
  readonly maxOutputBytes?: number
  readonly env?: NodeJS.ProcessEnv
}

export interface CommandRunResult {
  readonly executable: string
  readonly args: readonly string[]
  readonly cwd: string
  readonly exitCode: number | null
  readonly timedOut: boolean
  readonly output: string
  readonly startedAt: string
  readonly endedAt: string
}

/** Runs an explicitly selected executable without invoking a shell and bounds captured output. */
export async function runCommand(
  executable: string,
  args: readonly string[],
  options: CommandRunOptions,
): Promise<CommandRunResult> {
  const startedAt = new Date()
  const maxOutputBytes = options.maxOutputBytes ?? 256_000
  return new Promise((resolve, reject) => {
    const child = spawn(executable, [...args], {
      cwd: options.cwd,
      env: options.env ?? process.env,
      shell: false,
      stdio: ['ignore', 'pipe', 'pipe'],
    })
    let output = ''
    let outputBytes = 0
    let timedOut = false
    let settled = false
    const append = (chunk: Buffer | string): void => {
      if (outputBytes >= maxOutputBytes) return
      const text = String(chunk)
      const remaining = maxOutputBytes - outputBytes
      output += text.slice(0, remaining)
      outputBytes += Buffer.byteLength(text.slice(0, remaining))
    }
    child.stdout.on('data', append)
    child.stderr.on('data', append)
    const timer = setTimeout(() => {
      timedOut = true
      child.kill('SIGTERM')
      setTimeout(() => child.kill('SIGKILL'), 250).unref()
    }, options.timeoutMs)
    child.once('error', (error) => {
      clearTimeout(timer)
      if (settled) return
      settled = true
      reject(error)
    })
    child.once('close', (exitCode) => {
      clearTimeout(timer)
      if (settled) return
      settled = true
      const endedAt = new Date()
      resolve({
        executable,
        args: [...args],
        cwd: options.cwd,
        exitCode,
        timedOut,
        output: redactSecrets(output),
        startedAt: startedAt.toISOString(),
        endedAt: endedAt.toISOString(),
      })
    })
  })
}

function redactSecrets(output: string): string {
  return output.replace(/\b(password|passwd|secret|token|api[_-]?key)\s*[:=]\s*[^\s,;]+/giu, '$1=[REDACTED]')
}
