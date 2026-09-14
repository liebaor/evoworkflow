import type {AgentRunResult, GateResult, Goal, GoalSlice, ResolvedConstraint} from '../core/schemas.js'
import type {WorkingContext} from '../repository/working-context.js'

export interface AgentRunRequest {
  readonly repository: string
  readonly goal: Goal
  readonly slice: GoalSlice
  readonly attempt: number
  /** Fresh, path-only task context assembled immediately before this invocation. */
  readonly workingContext?: WorkingContext
  /** Resolved constraints are references and statements, not copied authority bodies. */
  readonly constraints?: readonly ResolvedConstraint[]
  readonly preflight?: readonly GateResult[]
  readonly invocationId?: string
}

/** Executes one approved Slice and returns a structured, non-authoritative self-report. */
export interface AgentAdapter {
  run(request: AgentRunRequest): Promise<AgentRunResult>
}
