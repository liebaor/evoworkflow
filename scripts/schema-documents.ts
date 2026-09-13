import {toJSONSchema} from 'zod'

import {
  ChangeMetadataSchema,
  ChangeSetSchema,
  CompletionSchema,
  ConfigSchema,
  DecisionMetadataSchema,
  EvidenceDocumentSchema,
  EvidenceRecordSchema,
  GoalSchema,
  LinkedArtifactMetadataSchema,
  ReviewMetadataSchema,
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
  ['completion.schema.json', 'https://evoworkflow.dev/schema/completion-v1.json', 'evoworkflow Completion v1', CompletionSchema],
  ['change-set.schema.json', 'https://evoworkflow.dev/schema/change-set-v1.json', 'evoworkflow Change Set v1', ChangeSetSchema],
] as const

/** Projects Zod machine-state authorities into deterministic JSON Schema documents. */
export function schemaDocuments(): ReadonlyArray<{readonly filename: string; readonly source: string}> {
  return definitions.map(([filename, id, title, schema]) => {
    const generated = toJSONSchema(schema, {target: 'draft-2020-12'})
    const document = {$schema: 'https://json-schema.org/draft/2020-12/schema', $id: id, title, ...generated}
    return {filename, source: `${JSON.stringify(document, null, 2)}\n`}
  })
}
