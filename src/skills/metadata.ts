import {readFile} from 'node:fs/promises'
import path from 'node:path'
import {parse} from 'yaml'
import {z} from 'zod'

const CodexMetadataSchema = z.object({
  interface: z.object({
    display_name: z.string().min(1).max(64),
    short_description: z.string().min(1).max(200),
    default_prompt: z.string().min(1).optional(),
  }).passthrough(),
  policy: z.object({
    allow_model_invocation: z.boolean().optional(),
  }).passthrough().optional(),
}).passthrough()

export interface CodexMetadataResult {
  readonly skill: string
  readonly path: string
  readonly valid: boolean
  readonly errors: readonly string[]
}

/** Validates the small Codex presentation/policy contract without forking SKILL.md behavior. */
export async function validateCodexMetadata(root: string, skill: string): Promise<CodexMetadataResult> {
  const target = path.join(path.resolve(root), 'skills', skill, 'agents', 'openai.yaml')
  try {
    const source = await readFile(target, 'utf8')
    let value: unknown
    try {
      value = parse(source)
    } catch (error) {
      return {skill, path: target, valid: false, errors: [`invalid YAML: ${error instanceof Error ? error.message : String(error)}`]}
    }
    const result = CodexMetadataSchema.safeParse(value)
    if (!result.success) return {skill, path: target, valid: false, errors: result.error.issues.map((issue) => `${issue.path.join('.') || '<root>'}: ${issue.message}`)}
    if (result.data.interface.display_name !== skill) return {skill, path: target, valid: false, errors: [`interface.display_name must be ${skill}`]}
    return {skill, path: target, valid: true, errors: []}
  } catch (error) {
    return {skill, path: target, valid: false, errors: [error instanceof Error && 'code' in error && (error as NodeJS.ErrnoException).code === 'ENOENT' ? 'metadata file is missing' : error instanceof Error ? error.message : String(error)]}
  }
}

export const codexMetadataSkills = ['ask-evo', 'evo-init', 'evo-finish', 'evo-commit'] as const
