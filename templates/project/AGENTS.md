# AGENTS.md

本仓库由 evoworkflow 管理。修改前先读取 `.evo/project.md`、`.evo/state.yml` 和活动 Change。

## 常驻规则

- 真实仓库及其列出的权威文档是项目事实来源。
- 修改前从代码、Git、文档、测试和运行证据调查事实；不要凭经验补全。
- 人工拥有需求、产品 Decision、重大架构 Decision、批准、风险接受和阶段转换。
- 只在已批准 Change 和 Slice 内工作。遇到模糊点、范围扩大、破坏性约定、安全 Decision、破坏性数据操作或意外依赖时停止。
- Standard 和 Large 工作只能使用 `.evo/state.yml` 或活动 Goal 中持久化的 `currentSlice`，不能猜测 Slice。
- 优先复用现有仓库能力和参考实现。
- 验证通过 Evidence v2 记录 `PASS`、`FAIL`、`BLOCKED` 或 `NOT_RUN`；不能把未观察结果写成完成。
- 不自动进入下一阶段、Finish、commit、merge、release、deploy 或写入外部系统。
- 保持当前文档准确；历史保存到 Git、Decision、completed Change 和 Postmortem。

使用当前阶段对应的 evoworkflow Skill。Skill 只产出一个阶段结果，然后停止等待人工指示。
