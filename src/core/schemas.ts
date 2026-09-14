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

/** Accepts repository protocol generations that this CLI can read. */
export const RepositorySchemaVersionSchema = z.union([z.literal(1), z.literal(2)])
export type RepositorySchemaVersion = z.infer<typeof RepositorySchemaVersionSchema>

export const ChangeWeightSchema = z.enum(['SMALL', 'STANDARD', 'LARGE'])
export type ChangeWeight = z.infer<typeof ChangeWeightSchema>

export const SkillCategorySchema = z.enum(['router', 'discovery', 'planning', 'execution', 'verification', 'delivery', 'resilience', 'workflow'])
export type SkillCategory = z.infer<typeof SkillCategorySchema>

export const SkillManifestEntrySchema = z.object({
  name: z.string().regex(/^[a-z0-9][a-z0-9-]*$/),
  category: SkillCategorySchema,
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
})
export type SkillManifestEntry = z.infer<typeof SkillManifestEntrySchema>

export const SkillManifestSchema = z.object({
  schemaVersion: z.literal(1),
  evoVersion: z.string().regex(/^\d+\.\d+\.\d+(?:-[0-9A-Za-z.-]+)?$/),
  skills: z.array(SkillManifestEntrySchema),
}).superRefine((value, context) => {
  const names = new Set<string>()
  for (const [index, skill] of value.skills.entries()) {
    if (names.has(skill.name)) context.addIssue({code: 'custom', message: `Duplicate Skill name ${skill.name}.`, path: ['skills', index, 'name']})
    names.add(skill.name)
  }
})
export type SkillManifest = z.infer<typeof SkillManifestSchema>

export const AgentClientSchema = z.enum(['codex', 'claude-code', 'opencode'])
export type AgentClient = z.infer<typeof AgentClientSchema>

export const AgentExecutableStatusSchema = z.enum(['FOUND', 'MISSING'])
export type AgentExecutableStatus = z.infer<typeof AgentExecutableStatusSchema>

export const AgentClientObservationSchema = z.object({
  client: AgentClientSchema,
  executable: AgentExecutableStatusSchema,
  version: z.string().min(1).nullable(),
  instructionSources: z.array(z.string()),
  skillSources: z.array(z.string()),
})
export type AgentClientObservation = z.infer<typeof AgentClientObservationSchema>

export const AgentDiagnosticSeveritySchema = z.enum(['ERROR', 'WARNING', 'INFO'])
export type AgentDiagnosticSeverity = z.infer<typeof AgentDiagnosticSeveritySchema>

export const AgentDiagnosticSchema = z.object({
  code: z.string().regex(/^[A-Z][A-Z0-9_]+$/),
  severity: AgentDiagnosticSeveritySchema,
  client: AgentClientSchema.nullable(),
  path: z.string().nullable(),
  message: z.string().min(1),
})
export type AgentDiagnostic = z.infer<typeof AgentDiagnosticSchema>

export const SkillManifestRelationSchema = z.object({
  status: z.enum(['CURRENT', 'MISSING', 'STALE', 'INVALID']),
  expectedVersion: z.string().min(1).nullable(),
  actualVersion: z.string().min(1).nullable(),
  driftedSkills: z.array(z.string()),
})
export type SkillManifestRelation = z.infer<typeof SkillManifestRelationSchema>

export const AgentCompatibilityReportSchema = z.object({
  schemaVersion: z.literal(1),
  generatedAt: z.string().min(1),
  repository: z.string().min(1),
  canonicalInstruction: z.string().nullable(),
  clients: z.array(AgentClientObservationSchema),
  manifest: SkillManifestRelationSchema,
  duplicateSkillIds: z.array(z.string()),
  diagnostics: z.array(AgentDiagnosticSchema),
  recommendedNextAction: z.string().min(1),
})
export type AgentCompatibilityReport = z.infer<typeof AgentCompatibilityReportSchema>

export const AgentSetupActionSchema = z.enum(['CREATE_CLAUDE_BRIDGE', 'ALREADY_CONFIGURED', 'NEEDS_HUMAN_MERGE', 'BLOCKED'])
export type AgentSetupAction = z.infer<typeof AgentSetupActionSchema>

export const AgentSetupReportSchema = z.object({
  schemaVersion: z.literal(1),
  generatedAt: z.string().min(1),
  repository: z.string().min(1),
  mode: z.enum(['PREVIEW', 'APPLIED']),
  action: AgentSetupActionSchema,
  path: z.string().nullable(),
  content: z.string().nullable(),
  reason: z.string().min(1),
  installGuidance: z.string().min(1),
})
export type AgentSetupReport = z.infer<typeof AgentSetupReportSchema>

export const CrossAgentOutcomeSchema = z.enum(['PASS', 'FAIL', 'UNVERIFIED', 'NOT_RUN'])
export type CrossAgentOutcome = z.infer<typeof CrossAgentOutcomeSchema>

export const CrossAgentSessionSchema = z.object({
  id: z.enum(['A', 'B', 'C', 'D']),
  client: z.enum(['codex', 'claude-code', 'opencode', 'fresh-agent']),
  status: CrossAgentOutcomeSchema,
  invocation: z.string().min(1),
  taskPackage: z.string().min(1),
  changedPaths: z.array(z.string()),
  verification: z.array(z.string()),
  summary: z.string().min(1),
  error: z.string().nullable(),
})
export type CrossAgentSession = z.infer<typeof CrossAgentSessionSchema>

export const CrossAgentEvaluatorCheckSchema = z.object({
  id: z.string().regex(/^EVAL-[A-Z0-9][A-Z0-9-]*$/),
  category: z.string().min(1),
  status: CrossAgentOutcomeSchema,
  detail: z.string().min(1),
})
export type CrossAgentEvaluatorCheck = z.infer<typeof CrossAgentEvaluatorCheckSchema>

export const CrossAgentContinuityTraceSchema = z.object({
  schemaVersion: z.literal(1),
  generatedAt: z.string().min(1),
  repository: z.string().min(1),
  status: z.enum(['BEHAVIORAL_PASS', 'BEHAVIORAL_FAIL', 'UNVERIFIED']),
  baselineRevision: z.string().regex(/^[a-f0-9]{40}$/),
  finalRevision: z.string().regex(/^[a-f0-9]{40}$/).nullable(),
  harnessSequence: z.array(z.enum(['codex', 'claude-code', 'opencode', 'fresh-agent'])).min(4),
  invocationBoundary: z.string().min(1),
  sessions: z.array(CrossAgentSessionSchema).length(4),
  changedPaths: z.array(z.string()),
  recovery: z.object({
    status: CrossAgentOutcomeSchema,
    objective: z.string().min(1),
    nextAction: z.string().min(1),
    source: z.string().min(1),
  }),
  evaluator: z.object({
    status: CrossAgentOutcomeSchema,
    checks: z.array(CrossAgentEvaluatorCheckSchema).min(1),
    testCommand: z.string().min(1),
    testStatus: CrossAgentOutcomeSchema,
  }),
  limitations: z.array(z.string()),
  artifactSha256: z.string().regex(/^[a-f0-9]{64}$/),
})
export type CrossAgentContinuityTrace = z.infer<typeof CrossAgentContinuityTraceSchema>

export const EvidenceStatusSchema = z.enum(['PASS', 'FAIL', 'UNVERIFIED'])
export type EvidenceStatus = z.infer<typeof EvidenceStatusSchema>

/** Statuses for append-only, independently observable evidence records. */
export const EvidenceRecordStatusSchema = z.enum(['PASS', 'FAIL', 'BLOCKED', 'NOT_RUN'])
export type EvidenceRecordStatus = z.infer<typeof EvidenceRecordStatusSchema>

/** Current/derived status used by constraints, context, and evidence freshness checks. */
export const FreshnessStatusSchema = z.enum(['CURRENT', 'STALE', 'UNKNOWN', 'MISSING', 'CONFLICT'])
export type FreshnessStatus = z.infer<typeof FreshnessStatusSchema>

/** Constraint strength is intentionally separate from evidence status. */
export const ConstraintTypeSchema = z.enum(['HARD', 'SOFT', 'REFERENCE', 'UNKNOWN', 'CONFLICT'])
export type ConstraintType = z.infer<typeof ConstraintTypeSchema>

export const ConstraintSourceKindSchema = z.enum([
  'DECISION',
  'AUTHORITY',
  'CONTRACT',
  'PROJECT_MAP',
  'REPRESENTATIVE_CODE',
  'INFERENCE',
])
export type ConstraintSourceKind = z.infer<typeof ConstraintSourceKindSchema>

export const ConstraintSourceSchema = z.object({
  kind: ConstraintSourceKindSchema,
  path: z.string().min(1),
  locator: z.string().min(1).optional(),
})
export type ConstraintSource = z.infer<typeof ConstraintSourceSchema>

export const ResolvedConstraintSchema = z.object({
  id: z.string().regex(/^C-[A-Za-z0-9][A-Za-z0-9_-]*$/),
  type: ConstraintTypeSchema,
  topic: z.string().min(1),
  statement: z.string().min(1),
  source: ConstraintSourceSchema,
  scope: z.string().min(1),
  evidence: z.array(z.string().min(1)).min(1),
  fingerprint: z.string().regex(/^[a-f0-9]{64}$/),
  confidence: z.number().min(0).max(1).optional(),
})
export type ResolvedConstraint = z.infer<typeof ResolvedConstraintSchema>

export const ResolvedConstraintsDocumentSchema = z.object({
  schemaVersion: z.literal(1),
  change: z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/),
  generatedAt: z.string().min(1),
  inputFingerprint: z.string().regex(/^[a-f0-9]{64}$/),
  inputs: z.array(z.string().min(1)),
  freshness: FreshnessStatusSchema,
  constraints: z.array(ResolvedConstraintSchema),
})
export type ResolvedConstraintsDocument = z.infer<typeof ResolvedConstraintsDocumentSchema>

export const FreshnessEntrySchema = z.object({
  id: z.string().min(1),
  kind: z.string().min(1),
  status: FreshnessStatusSchema,
  fingerprint: z.string().regex(/^[a-f0-9]{64}$/).nullable(),
  inputFingerprint: z.string().regex(/^[a-f0-9]{64}$/).nullable(),
  inputs: z.array(z.string().min(1)),
  changedInputs: z.array(z.string().min(1)),
  detail: z.string().min(1),
  generatedAt: z.string().min(1),
})
export type FreshnessEntry = z.infer<typeof FreshnessEntrySchema>

export const FreshnessDocumentSchema = z.object({
  schemaVersion: z.literal(1),
  change: z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/),
  generatedAt: z.string().min(1),
  status: FreshnessStatusSchema,
  entries: z.array(FreshnessEntrySchema),
})
export type FreshnessDocument = z.infer<typeof FreshnessDocumentSchema>

export const GateKindSchema = z.enum(['PROTOCOL', 'PROJECT'])
export type GateKind = z.infer<typeof GateKindSchema>

export const GateEnforcementSchema = z.enum(['HARD', 'WARNING'])
export type GateEnforcement = z.infer<typeof GateEnforcementSchema>

export const GateResultStatusSchema = z.enum(['PASS', 'FAIL', 'BLOCKED', 'NOT_RUN', 'WARN'])
export type GateResultStatus = z.infer<typeof GateResultStatusSchema>

export const GateResultSchema = z.object({
  id: z.string().regex(/^G-[A-Za-z0-9][A-Za-z0-9_-]*$/),
  kind: GateKindSchema,
  enforcement: GateEnforcementSchema,
  status: GateResultStatusSchema,
  title: z.string().min(1),
  detail: z.string().min(1),
  authority: z.string().min(1).nullable(),
  predicate: z.string().min(1),
  falsifyingCase: z.string().min(1),
  negativeRegression: z.string().min(1),
  remediation: z.string().min(1),
  evidence: z.array(z.string().min(1)),
  evaluatedAt: z.string().min(1),
})
export type GateResult = z.infer<typeof GateResultSchema>

/** Deterministic predicates currently supported by promoted Project Gates. */
export const ProjectGateCheckSchema = z.enum([
  'NO_CONSISTENCY_FINDINGS',
  'NO_RESPONSE_DRIFT',
  'NO_PERMISSION_DRIFT',
  'NO_NAMING_DRIFT',
  'NO_BLAST_RADIUS_EXPANSION',
])
export type ProjectGateCheck = z.infer<typeof ProjectGateCheckSchema>

export const GateReportSchema = z.object({
  schemaVersion: z.literal(1),
  change: z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/),
  evaluatedAt: z.string().min(1),
  status: GateResultStatusSchema,
  gates: z.array(GateResultSchema),
})
export type GateReport = z.infer<typeof GateReportSchema>

export const AdmissionStatusSchema = z.enum(['REVIEW_ADMITTED', 'NOT_READY'])
export type AdmissionStatus = z.infer<typeof AdmissionStatusSchema>

export const AcceptanceTraceItemSchema = z.object({
  id: z.string().regex(/^AC-[A-Za-z0-9][A-Za-z0-9_-]*(?:\.[A-Za-z0-9][A-Za-z0-9_-]*)*$/),
  title: z.string().min(1),
  source: z.string().min(1),
  implementationSurface: z.array(z.string().min(1)),
  verification: z.array(z.string().min(1)),
  evidenceRefs: z.array(z.string().regex(/^EV-[A-Za-z0-9][A-Za-z0-9_-]*$/)),
  status: EvidenceRecordStatusSchema,
  freshness: FreshnessStatusSchema,
  limitations: z.array(z.string().min(1)),
})
export type AcceptanceTraceItem = z.infer<typeof AcceptanceTraceItemSchema>

export const AcceptanceTraceDocumentSchema = z.object({
  schemaVersion: z.literal(1),
  change: z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/),
  updatedAt: z.string().min(1),
  inputFingerprint: z.string().regex(/^[a-f0-9]{64}$/),
  items: z.array(AcceptanceTraceItemSchema),
})
export type AcceptanceTraceDocument = z.infer<typeof AcceptanceTraceDocumentSchema>

export const ProjectGateDefinitionSchema = z.object({
  id: z.string().regex(/^PG-[A-Za-z0-9][A-Za-z0-9_-]*$/),
  title: z.string().min(1),
  check: ProjectGateCheckSchema.default('NO_CONSISTENCY_FINDINGS'),
  authority: z.string().min(1),
  predicate: z.string().min(1),
  falsifyingCase: z.string().min(1),
  negativeRegression: z.string().min(1),
  remediation: z.string().min(1),
  enforcement: GateEnforcementSchema.default('WARNING'),
})
export type ProjectGateDefinition = z.infer<typeof ProjectGateDefinitionSchema>

export const CandidateAdmissionSchema = z.object({
  schemaVersion: z.literal(1),
  change: z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/),
  evaluatedAt: z.string().min(1),
  status: AdmissionStatusSchema,
  deferredAcceptance: z.array(z.string().regex(/^AC-[A-Za-z0-9][A-Za-z0-9_-]*(?:\.[A-Za-z0-9][A-Za-z0-9_-]*)*$/)).default([]),
  reasons: z.array(z.string().min(1)),
  gates: z.array(GateResultSchema),
  trace: AcceptanceTraceDocumentSchema,
  freshness: FreshnessDocumentSchema,
})
export type CandidateAdmission = z.infer<typeof CandidateAdmissionSchema>

/** Verification-run statuses aligned with Evidence v2; the old EvidenceStatus remains for v1 files. */
export const VerificationStatusSchema = EvidenceRecordStatusSchema

export const EvidenceKindSchema = z.enum(['unit', 'integration', 'api', 'browser', 'manual', 'external', 'build', 'other'])
export type EvidenceKind = z.infer<typeof EvidenceKindSchema>

export const CurrentTruthActionSchema = z.enum(['CREATE', 'UPDATE', 'UNAFFECTED'])

export const CurrentTruthTargetSchema = z.object({
  path: z.string().min(1),
  action: CurrentTruthActionSchema,
  reason: z.string().min(1).optional(),
})
export type CurrentTruthTarget = z.infer<typeof CurrentTruthTargetSchema>

export const AcceptanceCriterionSchema = z.object({
  id: z.string().regex(/^AC-[A-Za-z0-9][A-Za-z0-9_-]*(?:\.[A-Za-z0-9][A-Za-z0-9_-]*)*$/),
  title: z.string().min(1),
  source: z.string().min(1),
})
export type AcceptanceCriterion = z.infer<typeof AcceptanceCriterionSchema>

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
  currentTruthTargets: z.array(CurrentTruthTargetSchema).optional(),
})
export type LinkedArtifactMetadata = z.infer<typeof LinkedArtifactMetadataSchema>

export const ReviewMetadataSchema = z.object({
  change: z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/),
  status: WorkflowStatusSchema,
  humanAcceptance: z.boolean(),
  openFindings: z.number().int().nonnegative(),
  docsConverged: z.boolean(),
  deferredAcceptance: z.array(z.string().regex(/^AC-[A-Za-z0-9][A-Za-z0-9_-]*(?:\.[A-Za-z0-9][A-Za-z0-9_-]*)*$/)).default([]),
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
  schemaVersion: RepositorySchemaVersionSchema,
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
  schemaVersion: RepositorySchemaVersionSchema,
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

export const GitSnapshotSchema = z.object({
  branch: z.string().nullable(),
  head: z.string().regex(/^[a-f0-9]{40}$/).nullable(),
  treeFingerprint: z.string().regex(/^[a-f0-9]{64}$/),
  dirty: z.boolean(),
  changedPaths: z.array(z.string()),
  changedPathsFingerprint: z.string().regex(/^[a-f0-9]{64}$/),
  capturedAt: z.string().min(1),
})
export type GitSnapshot = z.infer<typeof GitSnapshotSchema>

export const EvidenceCommandSchema = z.object({
  executable: z.string().min(1),
  args: z.array(z.string()),
  cwd: z.string().min(1),
})
export type EvidenceCommand = z.infer<typeof EvidenceCommandSchema>

export const EvidenceArtifactSchema = z.object({
  path: z.string().min(1),
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
  mediaType: z.string().min(1).optional(),
})
export type EvidenceArtifact = z.infer<typeof EvidenceArtifactSchema>

export const EvidenceRecordSchema = z.object({
  schemaVersion: z.literal(2),
  id: z.string().regex(/^EV-[A-Za-z0-9][A-Za-z0-9_-]*$/),
  change: z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/),
  acceptance: z.array(z.string().regex(/^AC-[A-Za-z0-9][A-Za-z0-9_-]*(?:\.[A-Za-z0-9][A-Za-z0-9_-]*)*$/)).min(1),
  kind: EvidenceKindSchema,
  label: z.string().min(1),
  status: EvidenceRecordStatusSchema,
  command: EvidenceCommandSchema.nullable(),
  exitCode: z.number().int().nullable(),
  summary: z.string().min(1),
  outputHash: z.string().regex(/^[a-f0-9]{64}$/).nullable(),
  git: GitSnapshotSchema,
  artifacts: z.array(EvidenceArtifactSchema),
  startedAt: z.string().min(1),
  endedAt: z.string().min(1),
  inputFingerprint: z.string().regex(/^[a-f0-9]{64}$/).nullable().optional(),
  freshness: FreshnessStatusSchema.optional(),
})
export type EvidenceRecord = z.infer<typeof EvidenceRecordSchema>

export const AcceptanceEvidenceSchema = z.object({
  id: z.string().regex(/^AC-[A-Za-z0-9][A-Za-z0-9_-]*(?:\.[A-Za-z0-9][A-Za-z0-9_-]*)*$/),
  status: EvidenceRecordStatusSchema,
  evidenceRefs: z.array(z.string().regex(/^EV-[A-Za-z0-9][A-Za-z0-9_-]*$/)),
  limitations: z.array(z.string().min(1)).default([]),
})
export type AcceptanceEvidence = z.infer<typeof AcceptanceEvidenceSchema>

export const EvidenceDocumentSchema = z.object({
  schemaVersion: z.literal(2),
  change: z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/),
  updatedAt: z.string().min(1),
  acceptance: z.array(AcceptanceEvidenceSchema),
  inputFingerprint: z.string().regex(/^[a-f0-9]{64}$/).nullable().optional(),
  freshness: FreshnessStatusSchema.optional(),
})
export type EvidenceDocument = z.infer<typeof EvidenceDocumentSchema>

export const CompletionSchema = z.object({
  schemaVersion: z.literal(1),
  change: z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/),
  workflowStatus: z.literal('COMPLETED'),
  finishedAt: z.string().min(1),
  baselineCommit: z.string().regex(/^[a-f0-9]{40}$/).nullable(),
  finishedTreeFingerprint: z.string().regex(/^[a-f0-9]{64}$/),
  sourceStatus: z.enum(['READY_TO_COMMIT', 'COMMITTED', 'COMMIT_NOT_REQUIRED']),
  commit: z.string().regex(/^[a-f0-9]{40}$/).nullable(),
  currentTruth: z.object({
    required: z.array(CurrentTruthTargetSchema),
    verified: z.array(z.string().min(1)),
  }),
})
export type Completion = z.infer<typeof CompletionSchema>

export const ChangeSetMemberSchema = z.object({
  repositoryId: z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/),
  pathHint: z.string().min(1),
  change: z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/),
  required: z.boolean().default(true),
})
export const ChangeSetContractSchema = z.object({
  id: z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/),
  authority: z.string().min(1),
  path: z.string().min(1),
  sha256: z.string().regex(/^[a-f0-9]{64}$/),
})
export const ChangeSetSchema = z.object({
  schemaVersion: z.literal(1),
  id: z.string().regex(/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/),
  members: z.array(ChangeSetMemberSchema).min(1),
  contracts: z.array(ChangeSetContractSchema).default([]),
}).superRefine((value, context) => {
  const memberIds = new Set<string>()
  for (const [index, member] of value.members.entries()) {
    if (memberIds.has(member.repositoryId)) context.addIssue({code: 'custom', message: `Duplicate Change Set member ${member.repositoryId}.`, path: ['members', index, 'repositoryId']})
    memberIds.add(member.repositoryId)
  }
  const contractIds = new Set<string>()
  for (const [index, contract] of value.contracts.entries()) {
    if (contractIds.has(contract.id)) context.addIssue({code: 'custom', message: `Duplicate Change Set contract ${contract.id}.`, path: ['contracts', index, 'id']})
    contractIds.add(contract.id)
  }
})
export type ChangeSet = z.infer<typeof ChangeSetSchema>

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
  'STALE_APPROVAL',
  'CONSTRAINT_CONFLICT',
  'HARD_GATE_FAILURE',
  'FAILURE_BUDGET_EXHAUSTED',
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
  status: VerificationStatusSchema,
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
  invocationId: z.string().min(1).optional(),
  workingContextFingerprint: z.string().regex(/^[a-f0-9]{64}$/).nullable().optional(),
  constraintsFingerprint: z.string().regex(/^[a-f0-9]{64}$/).nullable().optional(),
  preflight: z.array(GateResultSchema).optional(),
  postflight: z.array(GateResultSchema).optional(),
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
  failureBudget: z.number().int().positive().optional(),
  failuresUsed: z.number().int().nonnegative().default(0),
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
  failureBudget: z.number().int().positive().optional(),
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
