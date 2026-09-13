# Skill 约定

每个 EVOworkflow Skill 都面向一个结果。它的 `SKILL.md` 只保留会改变 Agent 决策或保护工程不变量的信息。

每个 Skill 必须说明：

- 用途和激活条件；
- 目标和必读输入；
- 必须产生的结果和仓库 Artifact；
- 范围、权威和禁止的副作用；
- 决策规则和相关证据；
- 停止条件以及停止时记录的状态；
- 可以执行的仓库写入。

Skill 不规定有能力的 Agent 可以安全选择的通用搜索或编辑步骤。大量条件性指导放到 `references/`，只在相关时加载。

## 共享规则

- 动手前读取 `AGENTS.md`、`.evo/project.md`、`.evo/state.yml` 和活动 Change。
- 遵循已有仓库权威和参考实现。
- 先调查仓库事实，再向用户提问。
- 只询问尚未解决的人工 Decision；可行时一次只问一个有实质影响的 Decision。
- 不能把建议、草稿或提议中的 Decision 当成批准。
- 永远不能自动串到另一个 Skill 或阶段。
- 记录精确证据；没有观察结果时保留 `UNVERIFIED`。
- 未经明确授权，不 commit、merge、deploy、删除数据或写入外部系统。

Advisory Skill 只读。Planning Skill 只能写 working Change 和 Decision Artifact。Execution Skill 只能编辑已批准 Slice 的范围。Quality Skill 按阶段写证据、评审和收敛 Artifact。
