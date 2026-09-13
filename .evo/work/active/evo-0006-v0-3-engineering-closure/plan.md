---
change: evo-0006-v0-3-engineering-closure
status: AWAITING_APPROVAL
approval: null
---

# Implementation plan / 实施计划

## Reuse analysis / 复用分析

第三期不重建 v0.2 已经存在的机制，而是把它们收敛成一个稳定闭环。优先复用：

- `scanRepository` 与 `.evo/project.md` 作为 Repository Grounding 和 Authority Map 来源。
- `buildWorkingContext` 作为任务上下文路由入口。
- `analyzeRepositoryConsistency` 作为启发式 drift signal，不把统计推断直接升级为 hard fail。
- Approval fingerprint、Evidence v2、Convergence 作为人工批准与完成门禁。
- Goal state/checkpoint、Process Agent Adapter 作为顺序 bounded execution 基础。
- Doctor/Check 作为长期知识与协议健康检查入口。
- Phase 2 eval harness 作为回归测试基础，不复制第二套测试框架。

## Engineering rule / 工程规则

第三期统一采用：

`Authority → Resolved Convention Contract → Working Context → Plan/Slice → Execution → Mechanical Gates → Evidence → Review → Finish`

其中：

- Authority、Decision、Schema、已批准 Contract 可以形成 hard invariant。
- Repository 统计、命名推断、相似代码分析默认只形成 warning/review signal。
- 任何新 Gate 必须能指出来源、适用范围、失败原因和修复方向。
- 不为了“自动化率”牺牲 Human Authority。

## Primary and affected modules / 主模块与受影响模块

Primary：

- `src/repository/working-context.ts`
- 新增/扩展 convention contract 与 gate engine
- `src/core/goal.ts`
- `src/repository/goal-execution.ts`
- `src/validation/project.ts`
- `src/validation/doctor.ts`
- Phase 3 eval scripts

Affected：

- CLI commands
- Schemas 与 generated schemas
- Skills
- README、Architecture、Testing、Operations
- CI/package metadata

Unaffected：

- 用户项目业务规则的自动决策
- 自动 commit/merge/deploy
- 多 Agent 并行
- 云端控制面

## Expected blast radius / 预计影响范围

主要影响 evoworkflow 自身 deterministic engine、协议文档、测试与评估。受管理项目新增的持久化字段必须保持向后兼容，优先通过 schemaVersion 2 的可选字段或显式迁移实现，禁止静默破坏现有 v0.2 仓库。

## Vertical Slices / 垂直 Slice

### S1 — Resolved Convention Contract / 任务级规范契约

Objective：让每个 Change 能得到一份最小、可追溯、按任务相关性解析的工程规范集合。

Required outcomes：
- 定义 Convention item：id/topic/source/scope/confidence/enforcement/rule/evidence。
- 来源优先级：explicit authority/Decision > project map > representative code inference。
- 只存引用与解析结果，不复制原文档全文。
- Working Context 输出相关 conventions 和 unresolved conflicts。
- 同一事实冲突时停止升级为 hard rule。

Verification：unit tests + fixture eval，至少覆盖 RuoYi 与 FastAPI 两种风格。

Stop：需要创建 framework-specific hardcoded profile 时停止并重新设计。

### S2 — Mechanical Gate Engine / 机械门禁引擎

Objective：把真正可机械验证的承诺从 prose reminder 升级为 executable gate。

First-class gates：
- approval fingerprint current
- active/current Slice matches persisted state
- acceptance has required current evidence before Finish
- declared forbidden/new mechanism conflicts with explicit convention contract
- required current-truth targets/doc convergence when applicable
- no unapproved destructive/breaking marker

Heuristic signals such as naming dominance and architecture similarity remain warnings.

Verification：table-driven gate tests；明确测试 false-positive boundary。

### S3 — Per-slice Goal Closure / Slice 执行闭环

Objective：让 Goal Runner 使用 S1/S2，而不是单纯调用 Adapter。

Per Slice：
1. Load approved Change/Spec/Plan and current Slice.
2. Build fresh Working Context + Convention Contract.
3. Run preflight gates.
4. Execute one bounded slice through Adapter.
5. Run configured focused verification.
6. Run consistency warnings + post-execution gates.
7. Record Evidence/checkpoint and decide next Slice or STOP.

Stop conditions：new ambiguity, approval drift, new major dependency, breaking API, destructive data/security choice, convention conflict requiring human choice, repeated adapter/verification failure, failure budget exhausted。

Success remains `READY_FOR_REVIEW`; never auto Finish.

### S4 — Delta/Bug/Recovery integration / 变更韧性整合

Objective：让需求变化、Bug 和中断恢复影响同一组 Context/Convention/Gate/Evidence 状态。

Required outcomes：
- Requirement Delta 标记受影响 acceptance/slices/approvals/context/evidence mapping。
- 未受影响 Evidence 可保留且有理由。
- Bug investigation 绑定 regression evidence 和 real-entry status。
- Recover 报告 convention/gate conflicts、stale context 与 approval drift。

Verification：Requirement Delta + Bug + fresh-session recovery scenario。

### S5 — Behavioral Evaluation / Agent 行为评估

Objective：从“函数正确”升级到“Agent 在真实仓库里表现正确”。

Required outcomes：
- `eval:phase3` deterministic scenarios 默认进入 CI。
- 提供 `eval:agent` 可选 runner：固定 repository/revision、adapter、prompt contract、timeout 和结果目录。
- 标准场景至少包括：existing-pattern feature、requirement delta、bug/regression、fresh-session feature。
- 评估结果区分 deterministic PASS、agent behavioral PASS/FAIL、runtime UNVERIFIED。
- 不把模型自报完成当 Evidence。

### S6 — Doctor, Packaging & Release Readiness / 长期维护与可分发性

Objective：让 v0.3 能够真实安装、长期运行和自我诊断。

Required outcomes：
- Doctor 检查 duplicate authority、stale/zombie work、stale context、approval drift、orphan evidence、invalid gate source、unpromoted repeated findings。
- `pnpm run check` 包含 Phase 2 + Phase 3 deterministic evals。
- package smoke 从打包产物安装 CLI 并运行 `evo --help/init/check/context` 基础路径。
- Operations 提供从安装到 Finish 的完整人工驱动流程。
- 明确 v0.3 的已验证能力和仍为 UNVERIFIED 的运行路径。

## Slice order / 实施顺序

S1 → S2 → S3 → S4 → S5 → S6。

原因：先确定“Agent 应遵守什么”，再做机械 Gate，然后才让 Goal 自动执行；否则会把不稳定规则自动化。

## Verification strategy / 验证策略

Focused：每个 Slice 对应 Vitest + evaluator。

Repository-wide：
- `pnpm run typecheck`
- `pnpm run test`
- `pnpm run build`
- `pnpm run smoke:cli`
- `pnpm run validate:skills`
- `pnpm run check:schemas`
- `pnpm run eval:phase2`
- `pnpm run eval:phase3`
- package smoke

Integration：RuoYi/FastAPI evaluator 保持固定 revision；真实 Agent eval 可选执行并单独报告，不阻断普通 PR CI，直到稳定性和成本证明适合升级为 Gate。

## Migration / 迁移

优先兼容现有 schemaVersion 2。若必须新增不兼容状态结构，则使用显式 v2.x → v3 migration，不允许 CLI 在未预览的情况下重写用户仓库。

## Rollback / 回滚

每个 Slice 保持独立可回退；新 Gate 在稳定前支持 report-only 模式。Goal 集成必须允许关闭新增 Gate/Agent behavioral eval 而不破坏手动 Change 流程。

## Stop conditions / 停止条件

- 需要把启发式 convention inference 当作强制事实。
- 需要自动做产品、架构、安全或破坏性数据决定。
- 需要并行 Agent 才能继续。
- 破坏 v0.2 managed repository 且没有明确 migration。
- Eval 只能通过针对测试 fixture 的硬编码才能成立。
