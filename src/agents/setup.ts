import {writeFile} from 'node:fs/promises'
import path from 'node:path'

import {AgentSetupReportSchema, type AgentSetupReport} from '../core/schemas.js'
import {pathExists} from '../repository/io.js'
import {readOptionalText} from '../repository/managed.js'
import {repositoryPaths} from '../repository/paths.js'

const CLAUDE_BRIDGE = '@AGENTS.md\n'
const INSTALL_GUIDANCE = 'Use the existing universal Agent Skills installer: npx skills@latest add liebaor/evoworkflow'

export interface AgentSetupOptions {
  readonly apply?: boolean
  readonly now?: Date
}

/** Plans or applies only the safe, thin Claude bridge; all other setup remains guidance. */
export async function setupAgentCompatibility(root: string, options: AgentSetupOptions = {}): Promise<AgentSetupReport> {
  const paths = repositoryPaths(root)
  const agentsExists = await pathExists(paths.agents)
  const claudeSource = await readOptionalText(path.join(paths.root, 'CLAUDE.md'))
  const target = 'CLAUDE.md'
  let action: AgentSetupReport['action']
  let reason: string
  if (!agentsExists) {
    action = 'BLOCKED'
    reason = 'AGENTS.md is missing; setup will not create a bridge to a missing canonical authority.'
  } else if (claudeSource === null) {
    action = 'CREATE_CLAUDE_BRIDGE'
    reason = 'CLAUDE.md is absent; the only safe automatic adapter is the exact @AGENTS.md bridge.'
  } else if (claudeSource.trim() === '@AGENTS.md') {
    action = 'ALREADY_CONFIGURED'
    reason = 'CLAUDE.md already contains the exact thin @AGENTS.md bridge.'
  } else {
    action = 'NEEDS_HUMAN_MERGE'
    reason = 'CLAUDE.md already contains user content; setup will not overwrite or append to it.'
  }

  let mode: AgentSetupReport['mode'] = options.apply ? 'APPLIED' : 'PREVIEW'
  if (options.apply && action === 'CREATE_CLAUDE_BRIDGE') {
    try {
      await writeFile(path.join(paths.root, 'CLAUDE.md'), CLAUDE_BRIDGE, {encoding: 'utf8', flag: 'wx'})
      action = 'ALREADY_CONFIGURED'
      reason = 'Created the exact thin CLAUDE.md -> @AGENTS.md bridge; no other repository file was changed.'
    } catch (error) {
      if ((error as NodeJS.ErrnoException).code === 'EEXIST') {
        action = 'NEEDS_HUMAN_MERGE'
        reason = 'CLAUDE.md appeared during setup; it was not overwritten and requires human review.'
      } else {
        throw error
      }
    }
  }
  if (!options.apply) mode = 'PREVIEW'
  return AgentSetupReportSchema.parse({
    schemaVersion: 1,
    generatedAt: (options.now ?? new Date()).toISOString(),
    repository: paths.root,
    mode,
    action,
    path: agentsExists ? target : null,
    content: action === 'CREATE_CLAUDE_BRIDGE' || action === 'ALREADY_CONFIGURED' ? CLAUDE_BRIDGE : null,
    reason,
    installGuidance: INSTALL_GUIDANCE,
  })
}

/** Formats a setup plan while keeping preview and apply semantics obvious. */
export function formatAgentSetupReport(report: AgentSetupReport): string {
  return [
    `Agent setup: ${report.mode}`,
    `Repository: ${report.repository}`,
    `Action: ${report.action}`,
    `Path: ${report.path ?? 'none'}`,
    `Reason: ${report.reason}`,
    `Universal Skill install guidance: ${report.installGuidance}`,
    report.mode === 'PREVIEW' ? 'Preview is read-only; use --apply only after reviewing this exact operation.' : 'Only the declared safe adapter operation was applied.',
  ].join('\n')
}
