/**
 * Extracts the execution Slice ids declared by a Plan.
 *
 * New Plans should use an `Execution Slices` section so narrative headings
 * such as `Session A` or `ERROR` cannot become lifecycle checkpoints. The
 * conventional-id fallback keeps older v0.1-v0.3 Plans readable while they
 * are still present in completed or active repository history.
 */
export function extractPlanSliceIds(body: string): string[] {
  const executionSection = extractExecutionSection(body)
  const scoped = parseSliceHeadings(executionSection)
  if (scoped.length > 0) return scoped

  const headings = parseSliceHeadings(body)
  const conventional = headings.filter((id) => /^(?:S|F)[0-9]+$/u.test(id))
  return conventional.length > 0 ? conventional : headings
}

function parseSliceHeadings(body: string): string[] {
  return [...body.matchAll(/^#{2,3}[ \t]+([A-Za-z0-9][A-Za-z0-9_-]*)[ \t]+(?:—|-)[ \t]+/gmu)].map((match) => match[1] ?? '')
}

function extractExecutionSection(body: string): string {
  const lines = body.split(/\r?\n/u)
  const headerPattern = /^(#{1,2})[ \t]+(?:[0-9]+\.[ \t]+)?Execution Slices\b/u
  const headerIndex = lines.findIndex((line) => headerPattern.test(line))
  if (headerIndex < 0) return ''

  const header = headerPattern.exec(lines[headerIndex] ?? '')
  const level = header?.[1]?.length ?? 2
  const boundary = new RegExp(`^#{1,${level}}[ \\t]+`)
  const endIndex = lines.findIndex((line, index) => index > headerIndex && boundary.test(line))
  return lines.slice(headerIndex + 1, endIndex < 0 ? lines.length : endIndex).join('\n')
}
