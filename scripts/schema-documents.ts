import {toJSONSchema} from 'zod'

import {
  ChangeMetadataSchema,
  ChangeSetSchema,
  CandidateAdmissionSchema,
  CompletionSchema,
  ConfigSchema,
  DecisionMetadataSchema,
  EvidenceDocumentSchema,
  EvidenceRecordSchema,
  AcceptanceTraceDocumentSchema,
  AgentCompatibilityReportSchema,
  AgentSetupReportSchema,
  CrossAgentContinuityTraceSchema,
  FreshnessDocumentSchema,
  GateReportSchema,
  GoalSchema,
  LinkedArtifactMetadataSchema,
  ProjectGateDefinitionSchema,
  ResolvedConstraintsDocumentSchema,
  ReviewMetadataSchema,
  SkillManifestSchema,
  StateSchema,
} from '../src/core/schemas.js'

const definitions = [
  ['config.schema.json', 'https://evoworkflow.dev/schema/config-v2.json', 'evoworkflow Config v2', ConfigSchema],
  ['state.schema.json', 'https://evoworkflow.dev/schema/state-v2.json', 'evoworkflow State v2', StateSchema],
  ['goal.schema.json', 'https://evoworkflow.dev/schema/goal-v1.json', 'evoworkflow Goal v1', GoalSchema],
  ['change-metadata.schema.json', 'https://evoworkflow.dev/schema/change-metadata-v1.json', 'evoworkflow Change Metadata v1', ChangeMetadataSchema],
  ['linked-artifact-metadata.schema.json', 'https://evoworkflow.dev/schema/linked-artifact-metadata-v1.json', 'evoworkflow Linked Artifact Metadata v1', LinkedArtifactMetadataSchema],
  ['decision-metadata.schema.json', 'https://evoworkflow.dev/schema/decision-metadata-v1.json', 'evoworkflow Decision Metadata v1', DecisionMetadataSchema],
  ['review-metadata.schema.json', 'https://evoworkflow.dev/schema/review-metadata-v1.json', 'evoworkflow Review Metadata v1', ReviewMetadataSchema],
  ['evidence-record.schema.json', 'https://evoworkflow.dev/schema/evidence-record-v2.json', 'evoworkflow Evidence Record v2', EvidenceRecordSchema],
  ['evidence-document.schema.json', 'https://evoworkflow.dev/schema/evidence-document-v2.json', 'evoworkflow Evidence Document v2', EvidenceDocumentSchema],
  ['freshness.schema.json', 'https://evoworkflow.dev/schema/freshness-v1.json', 'evoworkflow Freshness v1', FreshnessDocumentSchema],
  ['resolved-constraints.schema.json', 'https://evoworkflow.dev/schema/resolved-constraints-v1.json', 'evoworkflow Resolved Constraints v1', ResolvedConstraintsDocumentSchema],
  ['acceptance-trace.schema.json', 'https://evoworkflow.dev/schema/acceptance-trace-v1.json', 'evoworkflow Acceptance Trace v1', AcceptanceTraceDocumentSchema],
  ['gate-report.schema.json', 'https://evoworkflow.dev/schema/gate-report-v1.json', 'evoworkflow Gate Report v1', GateReportSchema],
  ['project-gate-definition.schema.json', 'https://evoworkflow.dev/schema/project-gate-definition-v1.json', 'evoworkflow Project Gate Definition v1', ProjectGateDefinitionSchema],
  ['candidate-admission.schema.json', 'https://evoworkflow.dev/schema/candidate-admission-v1.json', 'evoworkflow Candidate Admission v1', CandidateAdmissionSchema],
  ['completion.schema.json', 'https://evoworkflow.dev/schema/completion-v1.json', 'evoworkflow Completion v1', CompletionSchema],
  ['change-set.schema.json', 'https://evoworkflow.dev/schema/change-set-v1.json', 'evoworkflow Change Set v1', ChangeSetSchema],
  ['skill-manifest.schema.json', 'https://evoworkflow.dev/schema/skill-manifest-v1.json', 'evoworkflow Skill Manifest v1', SkillManifestSchema],
  ['agent-compatibility.schema.json', 'https://evoworkflow.dev/schema/agent-compatibility-v1.json', 'evoworkflow Agent Compatibility v1', AgentCompatibilityReportSchema],
  ['agent-setup.schema.json', 'https://evoworkflow.dev/schema/agent-setup-v1.json', 'evoworkflow Agent Setup v1', AgentSetupReportSchema],
  ['cross-agent-continuity.schema.json', 'https://evoworkflow.dev/schema/cross-agent-continuity-v1.json', 'evoworkflow Cross-Agent Continuity v1', CrossAgentContinuityTraceSchema],
] as const

/** Projects Zod machine-state authorities into deterministic JSON Schema documents. */
export function schemaDocuments(): ReadonlyArray<{readonly filename: string; readonly source: string}> {
  return definitions.map(([filename, id, title, schema]) => {
    const generated = toJSONSchema(schema, {target: 'draft-2020-12'})
    const document = {$schema: 'https://json-schema.org/draft/2020-12/schema', $id: id, title, ...generated}
    return {filename, source: `${JSON.stringify(document, null, 2)}\n`}
  })
}
