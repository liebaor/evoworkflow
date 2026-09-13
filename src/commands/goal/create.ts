import {Args, Command, Flags} from '@oclif/core'

import {failCommand, jsonFlag, rootFlag} from '../../core/cli.js'
import {EvoError} from '../../core/errors.js'
import {GoalDefinitionSchema, type GoalDefinition} from '../../core/schemas.js'
import {createGoal, formatGoal, readGoalDefinition} from '../../repository/goals.js'

export default class GoalCreate extends Command {
  public static override args = {
    id: Args.string({description: 'Stable lowercase Goal id / 稳定的小写 Goal id', required: true}),
  }
  public static override description = 'Create a DRAFT Goal from explicit Slice definitions / 根据明确的 Slice 定义创建 DRAFT Goal'
  public static override flags = {
    adapter: Flags.string({description: 'Configured Agent Adapter name / 已配置的 Agent Adapter 名称'}),
    change: Flags.string({description: 'Active Change id / 活动 Change id'}),
    from: Flags.file({description: 'YAML Goal definition / YAML Goal 定义', exists: true}),
    json: jsonFlag,
    root: rootFlag,
    slice: Flags.string({description: 'Draft Slice in ID:objective form; repeat for multiple Slices / 使用 ID:目标格式输入草稿 Slice，可重复', multiple: true}),
    title: Flags.string({description: 'Goal title / Goal 标题'}),
  }

  public async run(): Promise<void> {
    try {
      const {args, flags} = await this.parse(GoalCreate)
      const definition = flags.from ? await readGoalDefinition(flags.from) : definitionFromFlags(flags)
      const goal = await createGoal(flags.root, args.id, definition)
      this.log(flags.json ? JSON.stringify(goal, null, 2) : `${formatGoal(goal)}\n\nEdit the DRAFT with measurable acceptance and verification, then approve it explicitly.`)
    } catch (error) {
      failCommand(this, error)
    }
  }
}

function definitionFromFlags(flags: {
  readonly adapter: string | undefined
  readonly change: string | undefined
  readonly slice: string[] | undefined
  readonly title: string | undefined
}): GoalDefinition {
  if (!flags.title || !flags.change || !flags.slice || flags.slice.length === 0) {
    throw new EvoError('Without --from, --title, --change, and at least one --slice are required.')
  }
  return GoalDefinitionSchema.parse({
    title: flags.title,
    changeId: flags.change,
    ...(flags.adapter ? {adapter: flags.adapter} : {}),
    slices: flags.slice.map((source) => {
      const separator = source.indexOf(':')
      if (separator < 1) throw new EvoError(`Invalid --slice value: ${source}`)
      return {
        id: source.slice(0, separator).trim(),
        objective: source.slice(separator + 1).trim(),
        acceptance: [],
        dependsOn: [],
        verify: [],
      }
    }),
  })
}
