import {readFile} from 'node:fs/promises'
import path from 'node:path'

import {
  ArtifactApprovalSchema,
  ChangeMetadataSchema,
  LinkedArtifactMetadataSchema,
  type ArtifactApproval,
  type ChangeMetadata,
  type LinkedArtifactMetadata,
  type State,
} from '../core/schemas.js'
import {artifactApprovalFingerprint} from '../core/fingerprint.js'
import {EvoError} from '../core/errors.js'
import {writeTextAtomic, writeYaml} from './io.js'
import {formatMarkdownDocument, parseMarkdownDocument, type MarkdownDocument} from './markdown.js'
import {openManagedRepository} from './managed.js'
import {repositoryPaths} from './paths.js'

export type ApprovableArtifactKind = 'change' | 'spec' | 'plan'

export interface ApprovedArtifactResult {
  readonly changeId: string
  readonly kind: ApprovableArtifactKind
  readonly path: string
  readonly approval: ArtifactApproval
}

export interface ArtifactApprovalInspection {
  readonly valid: boolean
  readonly code: 'VALID' | 'UNAPPROVED' | 'MISSING_APPROVAL' | 'INVALID_APPROVAL' | 'STALE_APPROVAL' | 'UNEXPECTED_APPROVAL'
  readonly detail: string
}

/** Records explicit human approval for one active narrative artifact. */
export async function approveArtifact(
  root: string,
  changeId: string,
  kind: ApprovableArtifactKind,
  source = 'evo approve',
  now = new Date(),
): Promise<ApprovedArtifactResult> {
  const managed = await openManagedRepository(root)
  if (managed.state.activeChange !== changeId) throw new EvoError(`Change ${changeId} is not the active Change.`)
  const target = artifactPath(root, changeId, kind)
  const document = parseMarkdownDocument(await readFile(target, 'utf8'), target)
  const metadata = parseArtifactMetadata(document, kind, changeId)
  if (metadata.status !== 'AWAITING_APPROVAL') {
    throw new EvoError(`${kind}.md must be AWAITING_APPROVAL before approval; current status is ${metadata.status}.`)
  }
  document.data.status = 'APPROVED'
  document.data.approval = null
  const approval: ArtifactApproval = {
    approvedAt: now.toISOString(),
    approvedBy: 'human',
    fingerprint: artifactApprovalFingerprint(document.data, document.body),
    source,
  }
  document.data.approval = approval
  await writeTextAtomic(target, formatMarkdownDocument(document))
  const nextState: State = {
    ...managed.state,
    status: 'APPROVED',
    updatedAt: now.toISOString(),
  }
  if (kind === 'plan' && nextState.slices.length === 0) {
    nextState.slices = planSliceIds(document.body).map((id) => ({id, status: 'PENDING', blockReason: null}))
  }
  await writeYaml(repositoryPaths(root).state, nextState)
  return {changeId, kind, path: path.relative(repositoryPaths(root).root, target).split(path.sep).join('/'), approval}
}

/** Rejects execution context unless every required narrative artifact has current human approval. */
export async function requireApprovedChangeContext(root: string, changeId: string): Promise<void> {
  for (const kind of ['change', 'plan', 'spec'] as const) {
    const target = artifactPath(root, changeId, kind)
    let source: string
    try {
      source = await readFile(target, 'utf8')
    } catch (error) {
      const code = (error as NodeJS.ErrnoException).code
      if (kind === 'spec' && code === 'ENOENT') continue
      if (code === 'ENOENT') throw new EvoError(`Active Change ${changeId} is missing ${kind}.md.`)
      throw error
    }
    const document = parseMarkdownDocument(source, target)
    parseArtifactMetadata(document, kind, changeId)
    const approval = inspectArtifactApproval(document)
    if (!approval.valid) throw new EvoError(`${kind}.md is not currently approved: ${approval.detail}`)
  }
}

/** Parses and validates Change, Specification, or Plan frontmatter and its Change link. */
export function parseArtifactMetadata(
  document: MarkdownDocument,
  kind: ApprovableArtifactKind,
  expectedChangeId: string,
): ChangeMetadata | LinkedArtifactMetadata {
  if (kind === 'change') {
    const result = ChangeMetadataSchema.safeParse(document.data)
    if (!result.success) throw invalidMetadata(kind, result.error.issues)
    if (result.data.id !== expectedChangeId) {
      throw new EvoError(`${kind}.md references Change ${result.data.id}; expected ${expectedChangeId}.`)
    }
    return result.data
  }
  const result = LinkedArtifactMetadataSchema.safeParse(document.data)
  if (!result.success) throw invalidMetadata(kind, result.error.issues)
  if (result.data.change !== expectedChangeId) {
    throw new EvoError(`${kind}.md references Change ${result.data.change}; expected ${expectedChangeId}.`)
  }
  return result.data
}

/** Checks that approval exists only on approved content and still matches that content. */
export function inspectArtifactApproval(document: MarkdownDocument): ArtifactApprovalInspection {
  const status = document.data.status
  if (status !== 'APPROVED') {
    return document.data.approval === null || document.data.approval === undefined
      ? {valid: false, code: 'UNAPPROVED', detail: `Artifact status is ${String(status ?? 'missing')}.`}
      : {valid: false, code: 'UNEXPECTED_APPROVAL', detail: `Artifact status is ${String(status ?? 'missing')} but an approval record remains.`}
  }
  if (document.data.approval === null || document.data.approval === undefined) {
    return {valid: false, code: 'MISSING_APPROVAL', detail: 'APPROVED artifact has no approval record.'}
  }
  const approval = ArtifactApprovalSchema.safeParse(document.data.approval)
  if (!approval.success) {
    return {valid: false, code: 'INVALID_APPROVAL', detail: 'Artifact approval metadata is invalid.'}
  }
  const expected = artifactApprovalFingerprint(document.data, document.body)
  if (approval.data.fingerprint !== expected) {
    return {valid: false, code: 'STALE_APPROVAL', detail: 'Artifact content changed after human approval.'}
  }
  return {valid: true, code: 'VALID', detail: `Artifact was approved by a human at ${approval.data.approvedAt}.`}
}

/** Resolves one approvable artifact in an active Change without accepting traversal ids. */
export function artifactPath(root: string, changeId: string, kind: ApprovableArtifactKind): string {
  if (!/^[a-zA-Z0-9][a-zA-Z0-9_-]*$/u.test(changeId)) throw new EvoError(`Invalid Change id: ${changeId}`)
  return path.join(repositoryPaths(root).activeWork, changeId, `${kind}.md`)
}

function planSliceIds(body: string): string[] {
  return [...body.matchAll(/^###\s+([A-Za-z0-9][A-Za-z0-9_-]*)\s+(?:—|-)\s+/gmu)].map((match) => match[1] ?? '')
}

function invalidMetadata(kind: ApprovableArtifactKind, issues: readonly {readonly path: readonly PropertyKey[]; readonly message: string}[]): EvoError {
  const details = issues.map((item) => `${item.path.join('.') || 'frontmatter'}: ${item.message}`).join('; ')
  return new EvoError(`Invalid ${kind}.md metadata: ${details}`)
}
