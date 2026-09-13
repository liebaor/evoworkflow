---
id: evo-0006-v0-3-engineering-closure
weight: LARGE
status: AWAITING_APPROVAL
approval: null
---

# evoworkflow v0.3 — Engineering Closure, Delegation & Learning

## Problem / 问题

v0.2 已经具备 Repository Grounding、Working Context、Consistency 信号、Requirement Delta、Bug、Recovery、Evidence、Goal、Doctor、Review 与 Finish 等基础机制，但还没有形成一个经过真实 Agent 行为验证、可以长期使用的完整工程闭环。

当前核心缺口不是“功能数量”，而是：

1. Phase 2 主要证明 deterministic functions 与静态 Grounding 正确，真实 Agent 跨任务、跨 Session、跨模型保持项目工程连续性的能力仍缺少标准化 Behavioral Baseline。
2. Working Context 能路由 Authority、Decision、Reference、Tests 与 Bug History，但当前任务真正适用的工程约束还没有形成最小、可追溯、可重建的派生视图。
3. Consistency 目前以 review signal 为主；哪些规则可以 Hard Fail、哪些只能提示，缺少明确的晋升标准和 negative regression 证明。
4. Goal、Evidence、Review、Finish 已分别存在，但执行、验收、独立评估与人工 Acceptance 的职责边界还需要进一步闭合。
5. Requirement Delta、Bug、Context、Evidence 与 Approval 的 stale/current 关系需要更多依赖 fingerprint/freshness，而不是增加手工 invalidate 状态。
6. Git 能保存代码历史，但缺少面向未来人和 Agent 的结构化工程 chronology；`evo-finish` 不负责 commit/push，因此需要独立的 Delivery 层。

## Goal / 目标

把 evoworkflow 从“能够管理 AI 开发流程”升级为“能够长期约束、验证、交付并持续学习的 Repository-centered Engineering Control Layer”。

Phase 3 需要证明并实现：

`Repository Grounding + Engineering Contract + Resolved Constraints + Deterministic Control + Bounded Execution + Evidence + Independent Acceptance + Git Chronology + Knowledge Learning`

最终让不同 Agent、模型、Session 和不断变化的需求仍然保持工程连续性，同时不重复实现模型厂商已经提供的通用 Agent Harness 能力。

## Architectural position / 架构定位

EVO 控制：

- intent、scope、authority、constraints、approval、state、acceptance、evidence、stop conditions、knowledge promotion。

Execution Backend 控制：

- model reasoning、tool usage、context compression、generic agent loop、subagent/runtime mechanics。

原则：

> Harness Is a Dependency, Not the Product.

EVO 应成为 Coding Agent Harness 之上的工程控制层，而不是另一个通用 Agent Runtime。

## Golden principles / 三期新增原则

1. **Harness Is a Dependency, Not the Product** — 不重复构建通用 Agent Runtime。
2. **Eval Before Enforcement** — Pattern 在成为 Gate 前必须先能被 Eval 稳定测量。
3. **Derived State Is Disposable** — Working Context、Resolved Constraints、Consistency Report 等派生状态可重建，不成为第二 Authority。
4. **Worker Cannot Accept Its Own Work** — Worker 最多返回 READY_FOR_REVIEW；最终 Acceptance 由独立 Review/Evaluator 与 Human 决定。

继续继承：Repository > Chat、Evidence > Claim、Human Authority > Agent Autonomy、One Fact → One Owner、Minimum Necessary Process、Contract Strict / Method Flexible。

## Scope / 范围

### M3.1 — Behavior Baseline & Field Evaluation

- 用真实 Brownfield 项目建立 v0.2 Agent Behavioral Baseline。
- 标准场景覆盖 Feature A → Feature B → Requirement Delta → Bug → Fresh Session → Recover → Feature C。
- 比较不同 Session/Agent 产生的 Naming、API、Response、Permission、DataScope、Service、Frontend、Domain Vocabulary、Testing 等工程语言。
- 增加第二技术栈的正向一致性验证，证明 EVO 不只是“避免 RuoYi 泄漏”，而是能学习目标 Repository 自己的模式。

### M3.2 — Resolved Engineering Constraints

- 从 Decision、明确 Authority、Approved Contract、Representative Code 与 Working Context 解析当前任务的最小工程约束。
- Constraint 类型：`HARD`、`SOFT`、`REFERENCE`、`UNKNOWN`、`CONFLICT`。
- Derived constraints 只保存引用和解析结果，可删除、可重建，不复制第二份 conventions 百科。
- Authority 冲突时形成 `CONFLICT`，不得让 Agent 自动选择并升级为 hard rule。

### M3.3 — Deterministic Control & Git Chronology

- 建立 Protocol Gate 与 Project Gate 两层。
- Hard Gate 必须满足：Authoritative Source + Deterministic Predicate + Falsifying Case + Negative Regression + Remediation。
- 建立 Acceptance Traceability 和 Candidate Admission，使 Review 只接收已经满足确定性准入条件的候选。
- 新增 `evo-commit`，负责 Git checkpoint 与 optional explicit push；不拥有 Acceptance、Finish、Decision Promotion 权限。

### M3.4 — Bounded Execution Integration

- 将现有 Goal 定位为 Engineering Orchestrator，而不是 Generic Agent Runtime。
- 每个 Slice 使用 fresh Working Context、Resolved Constraints、preflight gates、bounded execution、focused verification、post-execution gates、Evidence 与 checkpoint。
- Execution 与 Evaluation 使用隔离 invocation/context；成功状态为 `READY_FOR_REVIEW`，禁止自动 Finish。

### M3.5 — Change Resilience & Knowledge Learning

- 使用 artifact fingerprint/freshness 处理 Change、Decision、Context、Constraints、Plan、Evidence 和 Goal checkpoint 的 stale/current 关系。
- Requirement Delta 保留未受影响 Evidence，失效真正受影响的批准和证明。
- Bug 继续坚持 reproduce → failing evidence → root cause → fix → regression → real entry path → learning。
- 知识晋升链改为：Finding → Repeated Finding → Eval → Rule/Decision → Mechanical Guardrail。

### M3.6 — Doctor, Package Black-box & Release Readiness

- Doctor report-first：发现 duplicate authority、stale context、zombie work、stale approval、orphan evidence、invalid gate source、unresolved conflict 与重复 finding。
- 从真正打包产物执行 clean-install black-box smoke，而不是只测试源码入口。
- Phase 2 + Phase 3 deterministic evals 进入默认 CI；Agent behavioral eval 单独报告直到稳定性、成本和重复性足以升级为 Gate。

## Non-goals / 非目标

- 不做多 Agent 并行 swarm。
- 不做云控制面板、Web UI、中央数据库或 Vector DB/RAG 平台。
- 不自研 generic context compression、tool search、subagent scheduler 或通用 Agent Runtime。
- 不自动做产品、架构、安全或破坏性数据 Decision。
- 不自动 merge、release、deploy、force-push 或 Finish。
- 不做按语言穷举的全功能静态分析器，也不硬编码 RuoYi Framework Profile。
- 不建立 `.evo/commit-history/` 等第二套 Git 历史数据库。
- 不要求每个 Slice 默认跑全量测试；验证继续匹配风险与影响范围。

## Rules and acceptance / 规则与验收

- **AC-6.1 Behavioral baseline**：至少一个真实 Brownfield 连续开发场景和一个不同技术栈场景能区分 deterministic PASS、behavioral PASS/FAIL 与 runtime UNVERIFIED，并留下可复查结果。
- **AC-6.2 Resolved constraints**：Standard/Large Change 能得到可重建的任务级 constraints；每项有 source/scope/evidence/type；推断不得伪装成 HARD。
- **AC-6.3 Gate promotion**：任何新增 hard gate 都有明确 Authority、deterministic predicate、negative regression 与 remediation；启发式 naming/architecture signal 默认只能 warning。
- **AC-6.4 Acceptance traceability**：Acceptance 能映射 implementation surface、verification、Evidence 与 current/stale status；Candidate Admission 能阻止 evidence 缺失、stale approval、hard gate failure 的候选进入 Review。
- **AC-6.5 Bounded execution**：Goal 每个 Slice 执行 context/constraints preflight → bounded execution → focused verification → gates/evidence/checkpoint；遇到 ambiguity、major dependency、breaking contract、security/destructive Decision、constraint conflict 或 failure budget 耗尽必须停止。
- **AC-6.6 Independent acceptance**：Worker 不能自行把工作标记为 ACCEPTED；最终流程保持 READY_FOR_REVIEW → independent review/evaluation → human acceptance → evo-finish。
- **AC-6.7 Freshness**：Requirement Delta 或 Authority/Decision 变化后，受影响的 Plan/Context/Constraints/Evidence/Goal state 能根据 fingerprint 正确判定 stale；未受影响 Evidence 可保留并有依据。
- **AC-6.8 Git chronology**：`evo-commit` 能生成结构化 checkpoint/delivery commit，引用 Change/Slice/Evidence/Decision/Next；commit 只描述状态，不创造 COMPLETED 状态；push 需要明确授权。
- **AC-6.9 Recovery**：全新 Session 的 `evo recover` 能报告 objective、approved content、current slice、constraint/gate/freshness、Evidence、checkpoint chronology 和唯一下一步，不依赖历史聊天。
- **AC-6.10 Distribution**：Node 22/24 CI、schema/skill validation、Phase 2/3 deterministic eval、CLI smoke 与 packed-artifact clean-install black-box smoke 全部通过。

## Existing mechanisms to reuse / 复用现有机制

- `scanRepository`、`buildWorkingContext`、`analyzeRepositoryConsistency`、`buildRecoveryReport`。
- Approval fingerprint、Evidence v2、Convergence、Goal state/checkpoint、AgentAdapter、Doctor、`evo check`。
- `evo-verify`、`evo-review`、`evo-finish` 的既有边界。
- Phase 2 eval harness 与 RuoYi/FastAPI 验证基础。

## evo-finish vs evo-commit

- `evo-finish`：关闭 Engineering Lifecycle，负责 Human Acceptance、Decision Promotion、Current Truth/Docs Convergence、Archive Work、State → COMPLETED。
- `evo-commit`：记录并交付 Git chronology，负责 checkpoint scope、structured commit message、commit 与显式授权的 push。

原则：

> Commit describes state. It does not create state.

## Boundaries / 边界

Primary modules：Repository context/consistency/freshness、validation/gates、goal execution、evidence/acceptance traceability、delivery/commit rendering、eval scripts。

Affected：CLI commands、Schemas、Skills、Testing/Operations/Architecture 文档、CI/package metadata。

Unaffected：用户业务 Repository 的生产数据、外部部署系统、第三方框架源码，以及任何未经批准的人类 Decision。

## Open Decisions / 未决 Decision

- Project-level HARD Gate 默认禁止由 Repository 统计推断直接生成；只有明确 Authority + deterministic validation + negative regression 才能晋升。若实现需要例外，必须创建 Decision。
- Phase 3 只支持顺序 bounded execution；并行 Agent 留待未来重新评估。
- Agent behavioral eval 在稳定性和成本被证明之前不阻断普通 PR CI。
