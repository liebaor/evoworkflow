/** An expected user-facing failure with a stable process exit code. */
export class EvoError extends Error {
  public constructor(message: string, public readonly exitCode = 2) {
    super(message)
    this.name = 'EvoError'
  }
}
