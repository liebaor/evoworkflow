import {toJSONSchema} from 'zod'

import {
  ChangeMetadataSchema,
  ConfigSchema,
  DecisionMetadataSchema,
  GoalSchema,
  LinkedArtifactMetadataSchema,
  ReviewMetadataSchema,
  StateSchema,
} from '../src/core/schemas.js'

const definitions = [
  ['config.schema.json', 'https://evoworkflow.dev/schema/config-v1.json', 'EVOworkflow Config v1', ConfigSchema],
  ['state.schema.json', 'https://evoworkflow.dev/schema/state-v1.json', 'EVOworkflow State v1', StateSchema],
  ['goal.schema.json', 'https://evoworkflow.dev/schema/goal-v1.json', 'EVOworkflow Goal v1', GoalSchema],
  ['change-metadata.schema.json', 'https://evoworkflow.dev/schema/change-metadata-v1.json', 'EVOworkflow Change Metadata v1', ChangeMetadataSchema],
  ['linked-artifact-metadata.schema.json', 'https://evoworkflow.dev/schema/linked-artifact-metadata-v1.json', 'EVOworkflow Linked Artifact Metadata v1', LinkedArtifactMetadataSchema],
  ['decision-metadata.schema.json', 'https://evoworkflow.dev/schema/decision-metadata-v1.json', 'EVOworkflow Decision Metadata v1', DecisionMetadataSchema],
  ['review-metadata.schema.json', 'https://evoworkflow.dev/schema/review-metadata-v1.json', 'EVOworkflow Review Metadata v1', ReviewMetadataSchema],
] as const

/** Projects Zod machine-state authorities into deterministic JSON Schema documents. */
export function schemaDocuments(): ReadonlyArray<{readonly filename: string; readonly source: string}> {
  return definitions.map(([filename, id, title, schema]) => {
    const generated = toJSONSchema(schema, {target: 'draft-2020-12'})
    const document = {$schema: 'https://json-schema.org/draft/2020-12/schema', $id: id, title, ...generated}
    return {filename, source: `${JSON.stringify(document, null, 2)}\n`}
  })
}
