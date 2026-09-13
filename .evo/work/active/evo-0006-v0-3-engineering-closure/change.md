---
id: evo-0006-v0-3-engineering-closure
weight: LARGE
status: AWAITING_APPROVAL
approval: null
---

# evoworkflow v0.3 — Engineering Closure / 工程闭环

## Problem / 问题

v0.2 已经具备 Repository Grounding、Working Context、Consistency 信号、Requirement Delta、Bug、Recovery、Evidence、Goal、Doctor 等基础机制，但这些能力仍存在三个缺口：

1. 一致性主要是评审信号，关键开发规范、接口规范、命名与既有机制还没有形成“可解释、可分级、可执行”的统一约束闭环。
2. Goal、Context、Consistency、Evidence、Review 和 Finish 已分别存在，但尚未形成一个由同一组批准内容、上下文和门禁驱动的稳定执行链。
3. 当前 Evals 主要证明确定性函数和静态 Grounding 正确，尚未形成面向真实 Agent 行为与跨 Session 连续开发的标准化验证入口。

## Goal / 目标

把 v0.2 的分散能力收敛为最终可长期使用的工程化闭环：每个新任务都从实际 Repository 和当前批准内容构建 Working Context，复用已有模式，关键一致性规则可以机械检查，Goal 在明确边界内执行，Evidence/Review/Finish 对同一组 Acceptance 收敛，并可通过可重复的行为评估证明跨任务、跨 Session、跨 Agent 的工程连续性。

## Scope / 范围

- 建立 Resolved Convention Contract：从现有 Authority、Decision、Reference Implementation 和 Repository 事实解析当前任务真正适用的规范，不复制第二套项目百科。
- 建立 Mechanical Gate Engine：只把确定、可机械验证的 invariant 升级为 Gate；启发式 Consistency 继续保持 warning/review signal。
- 将 Context、Convention、Gate、Evidence 与现有 Goal Runner 串成 per-slice 闭环，并保留 failure budget、checkpoint、stop conditions 与人工边界。
- 增加 Phase 3 deterministic evals 与可选 real-agent behavioral eval runner，覆盖新会话恢复、模式复用、需求变更、Bug 回归和跨任务一致性。
- 扩展 Doctor/Check，发现 stale context、失效批准、重复权威、未解释的 drift、未完成知识收敛和 Gate 配置问题。
- 完成可安装/可发布的 CLI packaging、CI 回归保护、运行手册和最终 v0.3 使用路径。

## Non-goals / 非目标

- 不做多 Agent 并行编排。
- 不做云控制面板、中央数据库或 Web UI。
- 不让 Agent 自动做产品、架构、安全或破坏性数据决策。
- 不做按语言穷举规则的全功能静态分析器，也不硬编码 RuoYi Profile。
- 不自动 commit、merge、release、deploy 或 Finish。
- 不要求每个 Slice 默认跑全量测试；验证仍按风险和影响范围分层。
- 不新增一份复制现有文档内容的 conventions 百科；One Fact → One Owner 保持不变。

## Rules and acceptance / 规则与验收

- AC-6.1：每个 Standard/Large Change 能解析出任务级 Convention Contract，所有条目都包含来源、适用范围、置信度和 enforcement 级别；推断事实不能伪装成硬规则。
- AC-6.2：确定性 Gate 能阻止已批准内容指纹失效、越权 Slice、缺失必需 Evidence、明确的并行机制或已确认规范冲突；启发式命名/架构信号默认不会误升级为 hard fail。
- AC-6.3：Goal 每个 Slice 都执行 Context preflight → bounded execution → focused verification → consistency/gate check → evidence/checkpoint；遇到新歧义、未批准 Decision、breaking contract 或 failure budget 耗尽必须停止。
- AC-6.4：Requirement Delta 发生后，受影响的批准、Context、Plan/Goal checkpoint 和 Evidence 映射会失效或明确保留，不会静默继续旧意图。
- AC-6.5：Bug 工作流能把 failing evidence、root cause、regression evidence 和 knowledge promotion 映射到同一 Change，并保持不可验证真实入口为 NOT_RUN/BLOCKED，而不是自报 PASS。
- AC-6.6：`evo recover` 在全新 Session 中能给出当前目标、已批准内容、当前 Slice、有效 Evidence、Convention/Gate 状态和唯一下一步，不依赖历史聊天。
- AC-6.7：新增 Phase 3 deterministic evals 进入默认 CI；可选 real-agent eval 使用固定 Repository/Revision 并显式区分 PASS 与 UNVERIFIED。
- AC-6.8：Node 22/24 CI、schema/skill validation、phase2/phase3 eval、CLI smoke、package smoke 全部通过；v0.3 具备从安装、init、change、implement、verify、review 到 finish 的完整运行手册。

## Existing mechanisms to reuse / 复用的现有机制

- `scanRepository`、`buildWorkingContext`、`analyzeRepositoryConsistency`、`buildRecoveryReport`。
- Approval fingerprint、Evidence v2、Convergence、Goal state/checkpoint、AgentAdapter、Doctor、`evo check`。
- 现有 Skill contract、Repository Protocol、Phase 2 eval harness 和 RuoYi/FastAPI 验证基础。

## Boundaries / 边界

- Primary modules / 主模块：`src/repository/working-context.ts`、`src/repository/consistency.ts`、`src/core/goal.ts`、`src/repository/goal-execution.ts`、`src/validation/`、`scripts/`、相关 CLI commands。
- Affected modules / 受影响模块：Schemas、Skills、README、Architecture、Testing、Operations、CI、package metadata。
- Unaffected systems / 不受影响系统：用户业务仓库的真实生产数据、外部部署系统、云服务和原始第三方框架源码。

## Open Decisions / 未决 Decision

- Hard Gate 仅允许来自明确 Authority/Decision/Schema/Approval/Evidence contract 的确定性 invariant；Repository 统计推断和启发式命名模式默认只能 warning。该原则若在实现中需要例外，必须先创建 Decision。
- v0.3 只提供顺序 Goal execution；并行 Agent 留到未来版本重新评估。
