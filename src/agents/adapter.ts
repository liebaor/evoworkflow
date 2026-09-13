import type {AgentRunResult, Goal, GoalSlice} from '../core/schemas.js'

export interface AgentRunRequest {
  readonly repository: string
  readonly goal: Goal
  readonly slice: GoalSlice
  readonly attempt: number
}

/** Executes one approved Slice and returns a structured, non-authoritative self-report. */
export interface AgentAdapter {
  run(request: AgentRunRequest): Promise<AgentRunResult>
}
