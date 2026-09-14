/**
 * Extracts the execution Slice ids declared by a Plan.
 *
 * New Plans should use an `Execution Slices` section so narrative headings
 * such as `Session A` or `ERROR` cannot become lifecycle checkpoints. The
 * conventional-id fallback keeps older v0.1-v0.3 Plans readable while they
 * are still present in completed or active repository history.
 */
export function extractPlanSliceIds(body: string): string[] {
  const executionSection = /^##\s+(?:[0-9]+\.\s+)?Execution Slices\b[^\n]*\n([\s\S]*?)(?=^##\s|^#\s|$(?![\s\S]))/mu.exec(body)?.[1] ?? ''
  const scoped = parseSliceHeadings(executionSection)
  if (scoped.length > 0) return scoped

  const headings = parseSliceHeadings(body)
  const conventional = headings.filter((id) => /^(?:S|F)[0-9]+$/u.test(id))
  return conventional.length > 0 ? conventional : headings
}

function parseSliceHeadings(body: string): string[] {
  return [...body.matchAll(/^###\s+([A-Za-z0-9][A-Za-z0-9_-]*)\s+(?:—|-)\s+/gmu)].map((match) => match[1] ?? '')
}
