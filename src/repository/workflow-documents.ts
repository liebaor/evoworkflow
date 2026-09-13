export type ChangeWorkflowDocumentKind = 'delta' | 'bug'

const REQUIRED_SECTIONS: Record<ChangeWorkflowDocumentKind, readonly string[]> = {
  delta: ['Old', 'New', 'Retain', 'Modify', 'Remove', 'Add', 'Impact'],
  bug: [
    'Observed behavior',
    'Reproduction and failing evidence',
    'Expected behavior',
    'Root cause',
    'Existing rule or mechanism to reuse',
    'Fix boundary',
    'Regression evidence',
    'Real-entry-path status',
    'Knowledge promotion',
  ],
}

/** Returns required Delta or Bug sections missing from a Markdown document. */
export function missingWorkflowDocumentSections(source: string, kind: ChangeWorkflowDocumentKind): string[] {
  const headings = [...source.matchAll(/^##\s+(.+?)\s*$/gmu)].map((match) => match[1]?.trim() ?? '')
  return REQUIRED_SECTIONS[kind].filter((required) => !headings.some((heading) => heading === required || heading.startsWith(`${required} /`)))
}
