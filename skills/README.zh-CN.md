# EVO Skills

EVOworkflow 1.0 使用固定 `.evo/` 工程知识空间和 18 个专职 Skills。

## 固定工作区

```text
.evo/
├── project.md
├── context.md
├── goal.md
├── decisions/
├── specs/
├── plans/
└── research/
```

先 `evo-setup`，再 `evo-init`。之后不确定下一步就使用 `ask-evo`。

## Skills

**入口与指导**：`ask-evo`、`evo-advisor`

**项目基础**：`evo-setup`、`evo-init`、`evo-recover`

**思考与设计**：`evo-grill-with-docs`、`evo-research`、`evo-spec`、`evo-plan`、`evo-change`

**执行与质量**：`evo-implement`、`evo-tdd`、`evo-bug`、`evo-verify`、`evo-review`、`evo-finish`、`evo-goal`、`evo-commit`

关键区分：TDD 负责“怎么开发”，Verify 负责“怎么证明”，Review 负责“整体是否合理”，Finish 负责“知识是否收敛”，Commit 负责“如何留下 Git 历史”。