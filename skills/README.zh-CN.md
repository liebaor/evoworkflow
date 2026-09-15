# EVO Skills

EVOworkflow v1 是一套 **Skill-first、Repository-native** 的 AI 软件工程工作流。

它不需要 EVO CLI、状态机、Scanner、Goal Runner 或中央 Gate。Agent 负责语义理解与工程推理；Repository 负责长期知识；项目自己的测试、构建、Lint、CI 和真实运行路径负责机械验证；Git 负责历史；人负责最终决策。

推荐从 `ask-evo` 开始。新仓库先用 `evo-init`，需求不清楚用 `evo-grill-with-docs`，外部方案不确定用 `evo-research`，较大变更按 `evo-spec → evo-plan → evo-implement → evo-verify → evo-review` 推进。中途需求变化使用 `evo-change`，Bug 使用 `evo-bug`，新 Session 或换 Agent 使用 `evo-recover`。

所有 Skill 都应适应宿主仓库已有约定，不强迫项目创建 EVO 专属目录或状态文件。