import {readFile} from 'node:fs/promises'
import {fileURLToPath} from 'node:url'
import {describe, expect, it} from 'vitest'
import {parse} from 'yaml'

import {
  ChangeMetadataSchema,
  DecisionMetadataSchema,
  GoalDefinitionSchema,
  LinkedArtifactMetadataSchema,
  ReviewMetadataSchema,
} from '../src/core/schemas.js'
import {parseMarkdownDocument} from '../src/repository/markdown.js'
import {readTemplate} from '../src/repository/templates.js'

describe('workflow templates and examples', () => {
  it('keeps narrative frontmatter aligned with runtime schemas', async () => {
    const change = parseMarkdownDocument(await readTemplate('change/change.md'), 'change.md')
    const specification = parseMarkdownDocument(await readTemplate('change/spec.md'), 'spec.md')
    const plan = parseMarkdownDocument(await readTemplate('change/plan.md'), 'plan.md')
    const review = parseMarkdownDocument(await readTemplate('change/review.md'), 'review.md')
    const decision = parseMarkdownDocument(await readTemplate('decision/decision.md'), 'decision.md')

    expect(ChangeMetadataSchema.parse(change.data)).toEqual(expect.objectContaining({status: 'DRAFT', approval: null}))
    expect(LinkedArtifactMetadataSchema.parse(specification.data).approval).toBeNull()
    expect(LinkedArtifactMetadataSchema.parse(plan.data).approval).toBeNull()
    expect(ReviewMetadataSchema.parse(review.data)).toEqual(expect.objectContaining({humanAcceptance: false, openFindings: 0, acceptedLimitations: false}))
    expect(DecisionMetadataSchema.parse(decision.data)).toEqual(expect.objectContaining({status: 'working', change: null}))
  })

  it('requires explicit requirement Delta and Bug evidence sections', async () => {
    const delta = await readTemplate('change/delta.md')
    const bug = await readTemplate('change/bug.md')

    for (const heading of ['## Old', '## New', '## Retain', '## Modify', '## Remove', '## Add', '## Impact']) {
      expect(delta).toContain(heading)
    }
    for (const heading of ['## Reproduction and failing evidence', '## Root cause', '## Regression evidence', '## Real-entry-path status']) {
      expect(bug).toContain(heading)
    }
    expect(bug).toContain('`UNVERIFIED`')
  })

  it('ships a valid five-Slice Goal definition without granting approval', async () => {
    const target = fileURLToPath(new URL('../examples/goals/five-slice.yml', import.meta.url))
    const definition = GoalDefinitionSchema.parse(parse(await readFile(target, 'utf8')))

    expect(definition.slices).toHaveLength(5)
    expect(definition.slices.every((slice) => slice.acceptance.length > 0 && slice.verify.length > 0)).toBe(true)
  })
})
