import {z} from 'zod'

export const ProjectModeSchema = z.enum(['GREENFIELD', 'BROWNFIELD', 'EVO_MANAGED'])
export type ProjectMode = z.infer<typeof ProjectModeSchema>

export const WorkflowPhaseSchema = z.enum([
  'IDLE',
  'INIT',
  'GRILL',
  'SPEC',
  'PLAN',
  'IMPLEMENT',
  'VERIFY',
  'REVIEW',
  'FINISH',
])
export type WorkflowPhase = z.infer<typeof WorkflowPhaseSchema>

export const WorkflowStatusSchema = z.enum([
  'DRAFT',
  'NEEDS_INFO',
  'AWAITING_APPROVAL',
  'APPROVED',
  'BLOCKED',
  'COMPLETED',
])
export type WorkflowStatus = z.infer<typeof WorkflowStatusSchema>

export const ChangeWeightSchema = z.enum(['SMALL', 'STANDARD', 'LARGE'])
export type ChangeWeight = z.infer<typeof ChangeWeightSchema>

export const EvidenceStatusSchema = z.enum(['PASS', 'FAIL', 'UNVERIFIED'])
export type EvidenceStatus = z.infer<typeof EvidenceStatusSchema>

export const ArtifactApprovalSchema = z.object({
  approvedAt: z.string().min(1),
  approvedBy: z.literal('human'),
  fingerprint: z.string().regex(/^[a-f0-9]{64}$/),
  source: z.string().min(1).optional(),
})
export type ArtifactApproval = z.infer<typeof ArtifactApprovalSchema>

export const ChangeMetadataSchema = z.object({
  id: z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/),
  weight: ChangeWeightSchema,
  status: WorkflowStatusSchema,
  approval: ArtifactApprovalSchema.nullable(),
})
export type ChangeMetadata = z.infer<typeof ChangeMetadataSchema>

export const LinkedArtifactMetadataSchema = z.object({
  change: z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/),
  status: WorkflowStatusSchema,
  approval: ArtifactApprovalSchema.nullable(),
})
export type LinkedArtifactMetadata = z.infer<typeof LinkedArtifactMetadataSchema>

export const ReviewMetadataSchema = z.object({
  change: z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/),
  status: WorkflowStatusSchema,
  humanAcceptance: z.boolean(),
  openFindings: z.number().int().nonnegative(),
  docsConverged: z.boolean(),
  acceptedLimitations: z.boolean().default(false),
})
export type ReviewMetadata = z.infer<typeof ReviewMetadataSchema>

export const DecisionMetadataSchema = z.object({
  id: z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/),
  change: z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/).nullable().optional(),
  status: z.enum(['working', 'current', 'declined']),
  supersedes: z.string().min(1).nullable(),
  supersededBy: z.string().min(1).nullable(),
})
export type DecisionMetadata = z.infer<typeof DecisionMetadataSchema>

export const AgentAdapterConfigSchema = z.object({
  kind: z.enum(['codex', 'claude', 'opencode', 'process']),
  command: z.string().min(1),
  args: z.array(z.string()),
  timeoutMs: z.number().int().positive().max(86_400_000).default(3_600_000),
})
export type AgentAdapterConfig = z.infer<typeof AgentAdapterConfigSchema>

export const ConfigSchema = z.object({
  schemaVersion: z.literal(1),
  project: z.object({
    name: z.string().min(1),
  }),
  workflow: z.object({
    defaultWeight: ChangeWeightSchema,
    requireHumanApproval: z.literal(true),
    autoCommit: z.literal(false),
    autoFinish: z.literal(false),
  }),
  knowledge: z.object({
    staleWorkDays: z.number().int().positive(),
    agentsMaxLines: z.number().int().positive(),
  }),
  goal: z.object({
    defaultAdapter: z.string().min(1),
    maxAttempts: z.number().int().min(1).max(10),
  }),
  agents: z.object({
    adapters: z.record(z.string(), AgentAdapterConfigSchema),
  }),
})
export type Config = z.infer<typeof ConfigSchema>

export const GoalSliceStatusSchema = z.enum(['PENDING', 'RUNNING', 'PASS', 'BLOCKED', 'SKIPPED'])
export type GoalSliceStatus = z.infer<typeof GoalSliceStatusSchema>

export const StateSliceSchema = z.object({
  id: z.string().regex(/^[A-Za-z0-9][A-Za-z0-9_-]*$/),
  status: GoalSliceStatusSchema,
  blockReason: z.string().min(1).nullable(),
})
export type StateSlice = z.infer<typeof StateSliceSchema>

export const StateSchema = z.object({
  schemaVersion: z.literal(1),
  projectMode: ProjectModeSchema,
  phase: WorkflowPhaseSchema,
  status: WorkflowStatusSchema,
  activeChange: z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/u).nullable(),
  activeGoal: z.string().regex(/^[a-z0-9][a-z0-9-]*$/u).nullable(),
  currentSlice: z.string().min(1).nullable().default(null),
  slices: z.array(StateSliceSchema).default([]),
  initializedAt: z.string().min(1),
  updatedAt: z.string().min(1),
}).superRefine((value, context) => {
  const ids = new Set<string>()
  for (const [index, slice] of value.slices.entries()) {
    if (ids.has(slice.id)) context.addIssue({code: 'custom', message: `Duplicate Slice id ${slice.id}.`, path: ['slices', index, 'id']})
    ids.add(slice.id)
  }
  const running = value.slices.filter((slice) => slice.status === 'RUNNING')
  if (running.length > 1) context.addIssue({code: 'custom', message: 'At most one Slice can be RUNNING.', path: ['slices']})
  if (running.length === 1 && value.currentSlice !== running[0]?.id) {
    context.addIssue({code: 'custom', message: 'A RUNNING Slice must be currentSlice.', path: ['currentSlice']})
  }
  if (value.currentSlice) {
    const current = value.slices.find((slice) => slice.id === value.currentSlice)
    if (!current) context.addIssue({code: 'custom', message: 'currentSlice must reference a persisted Slice.', path: ['currentSlice']})
    else if (!['RUNNING', 'BLOCKED'].includes(current.status)) {
      context.addIssue({code: 'custom', message: 'currentSlice must be RUNNING or BLOCKED.', path: ['currentSlice']})
    }
  }
})
export type State = z.infer<typeof StateSchema>

export const GoalStatusSchema = z.enum([
  'DRAFT',
  'APPROVED',
  'RUNNING',
  'BLOCKED',
  'READY_FOR_REVIEW',
  'CANCELLED',
])
export type GoalStatus = z.infer<typeof GoalStatusSchema>

export const StopConditionSchema = z.enum([
  'REQUIREMENT_AMBIGUITY',
  'ACCEPTANCE_CHANGE',
  'ARCHITECTURE_DEVIATION',
  'BREAKING_API',
  'SECURITY_DECISION',
  'DESTRUCTIVE_DATA_OPERATION',
  'UNEXPECTED_DEPENDENCY',
  'SCOPE_EXPANSION',
  'REPEATED_FAILURE',
  'TRANSIENT_FAILURE',
])
export type StopCondition = z.infer<typeof StopConditionSchema>

export const VerificationCommandSchema = z.object({
  command: z.string().min(1),
  args: z.array(z.string()),
  label: z.string().min(1),
  timeoutMs: z.number().int().positive().max(3_600_000).default(300_000),
})
export type VerificationCommand = z.infer<typeof VerificationCommandSchema>

export const VerificationRunSchema = z.object({
  label: z.string().min(1),
  command: z.string().min(1),
  args: z.array(z.string()),
  status: EvidenceStatusSchema,
  exitCode: z.number().int().nullable(),
  output: z.string(),
  startedAt: z.string().min(1),
  endedAt: z.string().min(1),
})
export type VerificationRun = z.infer<typeof VerificationRunSchema>

export const AgentRunResultSchema = z.object({
  status: z.enum(['COMPLETED', 'BLOCKED']),
  summary: z.string().min(1),
  changedFiles: z.array(z.string()).default([]),
  evidence: z.array(z.string()).default([]),
  stopCondition: StopConditionSchema.nullable().default(null),
}).superRefine((value, context) => {
  if (value.status === 'BLOCKED' && value.stopCondition === null) {
    context.addIssue({code: 'custom', message: 'BLOCKED agent results require a stopCondition.', path: ['stopCondition']})
  }
  if (value.status === 'COMPLETED' && value.stopCondition !== null) {
    context.addIssue({code: 'custom', message: 'COMPLETED agent results cannot include a stopCondition.', path: ['stopCondition']})
  }
})
export type AgentRunResult = z.infer<typeof AgentRunResultSchema>

export const GoalAttemptSchema = z.object({
  number: z.number().int().positive(),
  epoch: z.number().int().nonnegative(),
  startedAt: z.string().min(1),
  endedAt: z.string().min(1),
  agent: AgentRunResultSchema,
  verification: z.array(VerificationRunSchema),
})
export type GoalAttempt = z.infer<typeof GoalAttemptSchema>

export const GoalSliceSchema = z.object({
  id: z.string().regex(/^[A-Za-z0-9][A-Za-z0-9_-]*$/),
  objective: z.string().min(1),
  acceptance: z.array(z.string().min(1)),
  dependsOn: z.array(z.string()).default([]),
  verify: z.array(VerificationCommandSchema),
  status: GoalSliceStatusSchema.default('PENDING'),
  attempts: z.array(GoalAttemptSchema).default([]),
  blockReason: z.string().min(1).nullable().default(null),
  stopCondition: StopConditionSchema.nullable().default(null),
})
export type GoalSlice = z.infer<typeof GoalSliceSchema>

export const GoalApprovalSchema = z.object({
  approvedAt: z.string().min(1),
  approvedBy: z.literal('human'),
  fingerprint: z.string().regex(/^[a-f0-9]{64}$/),
  contextFingerprint: z.string().regex(/^[a-f0-9]{64}$/),
})

export const GoalSchema = z.object({
  schemaVersion: z.literal(1),
  id: z.string().regex(/^[a-z0-9][a-z0-9-]*$/),
  title: z.string().min(1),
  changeId: z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/),
  repository: z.string().min(1),
  adapter: z.string().min(1),
  maxAttempts: z.number().int().min(1).max(10),
  status: GoalStatusSchema,
  stopConditions: z.array(StopConditionSchema).min(1),
  slices: z.array(GoalSliceSchema).min(1),
  approval: GoalApprovalSchema.nullable(),
  runEpoch: z.number().int().nonnegative().default(0),
  resumes: z.array(z.object({
    at: z.string().min(1),
    reason: z.string().min(1),
  })).default([]),
  createdAt: z.string().min(1),
  updatedAt: z.string().min(1),
})
export type Goal = z.infer<typeof GoalSchema>

export const GoalDefinitionSchema = z.object({
  title: z.string().min(1),
  changeId: z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/),
  repository: z.string().min(1).optional(),
  adapter: z.string().min(1).optional(),
  maxAttempts: z.number().int().min(1).max(10).optional(),
  stopConditions: z.array(StopConditionSchema).min(1).optional(),
  slices: z.array(z.object({
    id: z.string().regex(/^[A-Za-z0-9][A-Za-z0-9_-]*$/),
    objective: z.string().min(1),
    acceptance: z.array(z.string().min(1)).default([]),
    dependsOn: z.array(z.string()).default([]),
    verify: z.array(VerificationCommandSchema).default([]),
  })).min(1),
})
export type GoalDefinition = z.infer<typeof GoalDefinitionSchema>

export const DEFAULT_STOP_CONDITIONS: StopCondition[] = [
  'REQUIREMENT_AMBIGUITY',
  'ACCEPTANCE_CHANGE',
  'ARCHITECTURE_DEVIATION',
  'BREAKING_API',
  'SECURITY_DECISION',
  'DESTRUCTIVE_DATA_OPERATION',
  'UNEXPECTED_DEPENDENCY',
  'SCOPE_EXPANSION',
  'REPEATED_FAILURE',
]
