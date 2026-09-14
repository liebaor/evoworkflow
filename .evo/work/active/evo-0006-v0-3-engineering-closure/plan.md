---
change: evo-0006-v0-3-engineering-closure
status: AWAITING_APPROVAL
approval: null
currentTruthTargets:
  - path: src/core/schemas.ts
    action: UPDATE
    reason: Phase 3 machine-state contracts and compatibility fields.
  - path: src/core/goal.ts
    action: UPDATE
    reason: Bounded per-Slice execution and READY_FOR_REVIEW boundary.
  - path: src/repository/working-context.ts
    action: UPDATE
    reason: Fresh context and resolved-constraint routing.
  - path: src/repository/constraints.ts
    action: CREATE
    reason: Rebuildable task-level engineering constraints.
  - path: src/repository/freshness.ts
    action: CREATE
    reason: Derived-artifact input fingerprint and freshness checks.
  - path: src/repository/acceptance-trace.ts
    action: CREATE
    reason: Acceptance to implementation, verification, and evidence mapping.
  - path: src/validation/gates.ts
    action: CREATE
    reason: Protocol/project gates and candidate admission.
  - path: src/repository/delivery.ts
    action: CREATE
    reason: Read-only and explicitly authorized Git chronology delivery.
  - path: src/commands/commit.ts
    action: CREATE
    reason: evo-commit CLI boundary.
  - path: src/repository/recovery.ts
    action: UPDATE
    reason: Fresh-session constraint, gate, freshness, and chronology handoff.
  - path: src/validation/doctor.ts
    action: UPDATE
    reason: Report-first Phase 3 repository diagnostics.
  - path: scripts/phase3-evals.ts
    action: CREATE
    reason: Deterministic Phase 3 evaluation suite.
  - path: scripts/phase3-ruoyi-smoke.ts
    action: CREATE
    reason: Clean-revision real RuoYi field evaluation.
  - path: scripts/phase3-ruoyi-behavioral.ts
    action: CREATE
    reason: Real-Agent behavioral baseline and positive cross-framework evaluation.
  - path: scripts/package-smoke.ts
    action: CREATE
    reason: Packed-artifact clean-install black-box smoke.
---

# Implementation plan / 实施计划

## 1. Reuse analysis / 复用分析

Phase 3 不重建 v0.2 已经存在的机制，而是先验证其真实 Agent 行为，再把已经证明有价值的能力收敛成稳定工程闭环。

优先复用：

- `scanRepository` 与 `.evo/project.md`：Repository Grounding 与 Authority Map。
- `buildWorkingContext`：任务上下文路由入口。
- `analyzeRepositoryConsistency`：启发式 drift signal；不把统计推断直接升级为 hard fail。
- Approval fingerprint、Evidence v2、Convergence：人工批准、证据和 Finish 的确定性基础。
- Goal state/checkpoint、AgentAdapter：顺序 bounded execution 基础。
- Doctor/Check：知识与协议健康检查入口。
- Phase 2 eval harness、RuoYi/FastAPI fixtures：回归与跨框架验证基础。
- `evo-finish`：继续负责 Engineering Completion；不吸收 Git commit/push 职责。

## 2. Architectural rule / 三期架构规则

Phase 3 统一采用五层架构：

1. Repository Intelligence — What is true?
2. Engineering Contract — What are we changing and what constraints apply?
3. Deterministic Control — What is mechanically allowed and proven?
4. Execution Backend — Let the agent work.
5. Evaluation & Learning — Did it work and what should the repository learn?

主链：

`Repository → Working Context → Resolved Constraints → Change/Plan → Approval → Bounded Execution → Focused Verification → Acceptance Traceability → Candidate Admission → Independent Review → Human Acceptance → evo-finish → evo-commit/Push → Finding → Eval → Rule/Gate`

关键原则：

- Harness Is a Dependency, Not the Product.
- Eval Before Enforcement.
- Derived State Is Disposable.
- Worker Cannot Accept Its Own Work.
- Contract Strict, Method Flexible.

## Vertical Slice checkpoints / 垂直 Slice 检查点

### S1 — M3.1 Behavior Baseline & Field Evaluation

建立真实 Brownfield 与跨框架行为基线，并区分确定性、行为性和运行时未知结果。

### S2 — M3.2 Resolved Engineering Constraints

解析带 source/scope/evidence/fingerprint 的任务级约束，处理冲突和新鲜度。

### S3 — M3.3 Deterministic Control & Git Chronology

落地 Protocol/Project Gate、Acceptance Trace、Candidate Admission 和 evo-commit 交付边界。

### S4 — M3.4 Bounded Execution Integration

将 fresh context、constraints、preflight、focused verification、postflight 和 checkpoint 接入 Goal。

### S5 — M3.5 Change Resilience & Knowledge Learning

验证 Delta/Bug/Recovery 的 freshness 与 Evidence 边界，并保留 Finding 晋升的人工控制。

### S6 — M3.6 Doctor, Package Black-box & Release Readiness

完成 Doctor、Phase 3 eval、RuoYi clean-revision 场景和 packed artifact 黑盒路径。

## 3. Expected blast radius / 预计影响范围

Primary：

- `src/repository/working-context.ts`
- 新增 resolved constraints / freshness 相关 deterministic primitives
- `src/repository/consistency.ts`
- validation/gate/admission 模块
- `src/core/goal.ts`
- `src/repository/goal-execution.ts`
- Evidence / acceptance traceability
- 新增 commit/delivery rendering primitive
- Phase 3 eval scripts

Affected：

- CLI commands
- core schemas / generated schemas
- Skills（新增 `evo-commit`，必要时修订 verify/review/goal/recover）
- README、Architecture、Testing、Operations
- CI/package metadata

Unaffected：

- 用户项目的自动产品/架构/安全 Decision
- 自动 merge/release/deploy/Finish
- 通用 Agent Harness runtime
- Multi-Agent parallel swarm

持久化结构优先保持 schemaVersion 2 向后兼容；需要破坏性结构变化时必须提供显式 migration preview。

---

# M3.1 — Behavior Baseline & Field Evaluation

## Objective

先建立 v0.2 在真实 Coding Agent 与真实 Repository 上的行为基线，再决定哪些规则值得机械化。

## Required outcomes

### Real Brownfield scenario

固定真实 RuoYi backend/frontend revision，在隔离副本执行：

1. `evo init`
2. Feature A：典型 CRUD/业务能力
3. Feature B：包含 permission/data-scope/pagination/response/export 等已有机制
4. Requirement Delta：修改一个明确业务边界
5. Bug：必须包含 reproduction、failing evidence、root cause、regression
6. 关闭 Session
7. Fresh Agent / Fresh Context
8. `evo recover`
9. Feature C：与 A/B 同领域但新任务
10. Review A vs C 的工程一致性

比较至少：Naming、API、Response、Permission、DataScope、Service/Mapper、Logging、Frontend API/Page、Domain Vocabulary、Testing。

### Cross-framework positive consistency

使用真实或固定可复现的 FastAPI + React/Ant Design Pro 项目，验证：

- 不出现 RuoYi 机制泄漏；
- Agent 能主动延续目标项目自己的 router/schema/service/exception/response/test 风格；
- Actual Repository 高于通用知识与 framework stereotype。

## Evidence model

结果必须区分：

- `DETERMINISTIC_PASS`
- `BEHAVIORAL_PASS`
- `BEHAVIORAL_FAIL`
- `UNVERIFIED`

模型自报完成不算 Evidence。

## Tickets

- EVO3-001 Real RuoYi field fixture
- EVO3-002 Feature A behavioral scenario
- EVO3-003 Feature B behavioral scenario
- EVO3-004 Requirement Delta scenario
- EVO3-005 Bug/regression scenario
- EVO3-006 Fresh-session Feature C
- EVO3-007 Cross-feature consistency evaluator
- EVO3-008 FastAPI positive convention scenario

## Verification

- 固定 revision / clean temporary copies
- 可复查 prompts、adapter、results、Git diff 和 evidence output
- 不能把 runtime 未执行路径写成 PASS

## Stop conditions

- 只能通过硬编码 fixture 名称得到好结果；
- 无法固定输入 revision；
- Agent evaluation 无法区分 self-report 与 observable evidence。

---

# M3.2 — Resolved Engineering Constraints

## Objective

为每个 Standard/Large Change 构建一份最小、可追溯、可删除并重新生成的任务级 Engineering Constraints 派生视图。

## Core model

`ResolvedConstraint` 建议字段：

- `id`
- `type`: HARD | SOFT | REFERENCE | UNKNOWN | CONFLICT
- `topic`
- `statement`
- `source`
- `scope`
- `evidence[]`
- `fingerprint`
- `confidence`（仅 SOFT/inference 可用）

## Source priority

`Explicit Decision > Explicit Project Authority > Approved Contract > Project Map > Representative Code > Inference`

## Rules

- HARD 必须有明确 Authority；不能用模糊 confidence 冒充 hard rule。
- Representative code 产生 SOFT/REFERENCE，不直接产生 HARD。
- 同一事实 Authority 冲突时输出 CONFLICT 并停止 hard enforcement。
- 只保存引用和解析结果，不复制完整 Authority 内容。
- Working Context 输出 relevant constraints、unknowns、conflicts 和 references。

## Freshness

Constraints fingerprint 至少绑定：

- active Change/Spec fingerprint
- relevant Decision fingerprints
- relevant Authority fingerprints
- Working Context inputs

任一关键输入变化后旧 constraints 为 STALE。

## Tickets

- EVO3-101 ResolvedConstraint schema
- EVO3-102 Authority resolver
- EVO3-103 Decision resolver
- EVO3-104 Reference-pattern resolver
- EVO3-105 Conflict model
- EVO3-106 Constraint fingerprint
- EVO3-107 Working Context integration

## Verification

- Unit tests：priority、conflict、hard/soft boundary、freshness
- RuoYi 与 FastAPI fixture eval
- Derived constraints 删除后可 deterministically rebuild

---

# M3.3 — Deterministic Control & Git Chronology

## Objective

将真正确定的工程承诺做成 executable control，并增加独立 Git Delivery 层。

## 3.3.1 Gate model

### Protocol Gates — 默认 Hard Fail

第一批：

- Approval fingerprint current
- Active/current Slice matches persisted state
- Required Evidence exists and is current
- Decision lifecycle/supersession valid
- Acceptance coverage complete before admission/finish
- Required convergence/current-truth obligations satisfied before Finish

### Project Gates — 默认 Report Only

命名、架构相似性、项目 pattern 等默认只产生 warning。

只有满足以下五个条件才能晋升 HARD：

1. Authoritative Source
2. Deterministic Predicate
3. Falsifying Case
4. Negative Regression Test
5. Remediation

每个新增 hard gate 必须测试：valid → PASS；deliberate violation → FAIL；restore → PASS。

## 3.3.2 Acceptance Traceability

建立：

`Acceptance → Implementation Surface → Verification → Evidence → Current/Stale Status`

目的：避免 “tests green = requirement complete”。

## 3.3.3 Candidate Admission

在 Review 前执行 deterministic admission：

- Hard Acceptance 是否都有 current Evidence
- Hard Gates 是否通过
- 是否有 UNKNOWN blocker
- Approval 是否 stale
- 是否存在无法解释的 scope expansion
- 是否存在 self-proving-only evidence

输出：`REVIEW_ADMITTED` 或 `NOT_READY`。

## 3.3.4 evo-commit

`evo-commit` 属于 Delivery，不属于 Finish。

职责：

1. Identify checkpoint（Change/Slice/Final delivery）
2. Inspect actual Git diff
3. Read existing EVO facts
4. Render structured commit message
5. Commit
6. Explicitly authorized optional push

Commit message：

- subject: Conventional Commit-style engineering outcome
- Context
- Completed
- Engineering Notes
- Verification
- Limitations
- Next
- trailers: EVO-Change / EVO-Slice / EVO-Phase / EVO-Evidence / EVO-Decision / EVO-Next

原则：`Commit describes state. It does not create state.`

禁止 evo-commit：

- 宣布 Acceptance
- Promote Decisions
- Finish Change
- merge/release/deploy/force-push
- 新建 `.evo/commit-history/`

## Tickets

- EVO3-201 Protocol Gate interface
- EVO3-202 Approval gate
- EVO3-203 Slice/state gate
- EVO3-204 Evidence-current gate
- EVO3-205 Acceptance traceability
- EVO3-206 Candidate Admission
- EVO3-207 Project gate promotion model
- EVO3-208 `evo-commit` skill
- EVO3-209 commit message renderer
- EVO3-210 optional explicit push delivery

---

# M3.4 — Bounded Execution Integration

## Objective

让 Goal 成为 Engineering Orchestrator，而不是另一个 Generic Agent Runtime。

## Execution boundary

EVO 控制：intent、authority、constraints、scope、stop conditions、evidence、state transition。

Agent Harness 控制：reasoning、tool usage、context compression、generic agent loop、subagents/runtime mechanics。

## Per-slice lifecycle

1. Load approved Change/Spec/Plan and current Slice
2. Build fresh Working Context
3. Resolve current Engineering Constraints
4. Run Protocol preflight gates
5. Send bounded task package to ExecutionBackend
6. Run configured focused verification
7. Run consistency signals + post-execution gates
8. Record Evidence/checkpoint
9. Decide next Slice or STOP

ExecutionBackend 与 EvaluatorBackend 应允许复用同一 adapter，但必须使用独立 invocation/fresh context。

Worker success state 为 `READY_FOR_REVIEW`，不能写 ACCEPTED 或自动 Finish。

## Stop conditions

- new requirement ambiguity
- architecture/product/security Decision
- destructive migration
- breaking public contract
- major unapproved dependency
- HARD/CONFLICT constraint requiring human choice
- stale approval/context
- repeated adapter or verification failure
- failure budget exhausted

## Tickets

- EVO3-301 ExecutionBackend contract
- EVO3-302 Evaluator isolation
- EVO3-303 Goal preflight
- EVO3-304 Per-slice context refresh
- EVO3-305 Focused verification runner
- EVO3-306 Post-execution gate
- EVO3-307 Failure budget
- EVO3-308 READY_FOR_REVIEW transition

---

# M3.5 — Change Resilience & Knowledge Learning

## Objective

让 Requirement Change、Bug、Recovery 与长期知识晋升共享同一套 freshness/evidence/control 模型。

## Artifact freshness graph

优先 fingerprint，不新增大量手工 `invalidated=true` 状态。

示例：

Requirement changes → Change fingerprint changes → affected Plan approval / Working Context / Constraints / Evidence / Goal checkpoint become STALE according to their input dependencies。

未受影响 Evidence 如果 input fingerprint 仍匹配可以保留。

## Requirement Delta

继续：OLD / NEW / RETAIN / MODIFY / REMOVE / ADD。

Delta 后需要明确 affected acceptance/slices/contracts/data/API/docs，并重新计算 freshness。

## Bug

继续：

`REPRODUCE → FAILING EVIDENCE → ROOT CAUSE → FIX → REGRESSION → REAL ENTRY PATH → LEARNING`

不可验证真实入口继续保持 NOT_RUN/BLOCKED/UNVERIFIED，不得用静态 fixture 冒充。

## Knowledge promotion

`Observation → Finding → Repeated Finding → Eval → Rule/Decision → Mechanical Guardrail`

单次 Review/Bug finding 不自动写入 AGENTS/conventions，也不自动生成 Gate。

## Recover

Fresh session recovery 增加：

- constraint freshness/conflicts
- gate status
- approval freshness
- current Evidence
- current Slice
- recent relevant EVO commit chronology
- one recommended next human-controlled action

继续保持 report-only，不自动恢复 Goal。

## Tickets

- EVO3-401 Artifact freshness graph
- EVO3-402 Delta freshness propagation
- EVO3-403 Evidence preservation rules
- EVO3-404 Bug evidence binding
- EVO3-405 Finding model
- EVO3-406 Eval promotion model
- EVO3-407 Recover integration

---

# M3.6 — Doctor, Package Black-box & Release Readiness

## Objective

让 v0.3 能从真实打包产物安装、运行、诊断，并明确已验证与未验证能力。

## Doctor — report first

检查：

- duplicate/conflicting authority
- stale/zombie work
- stale Working Context / Constraints
- stale approvals
- orphan/stale Evidence
- invalid gate source
- unresolved conflicts
- broken Decision supersession
- repeated findings that may deserve eval/promotion

不自动做大规模 refactor 或 architecture migration。

## Package black-box

必须执行：

`pnpm pack → clean temp directory → install packed artifact → evo --help → evo init → evo check → evo context → evo recover`

核心 Evidence 测试用户真正安装到的 artifact，不只测试源码入口。

## CI

默认 `pnpm run check` 最终包含：

- typecheck
- unit/integration tests
- build
- CLI smoke
- skill validation
- schema validation
- Phase 2 deterministic eval
- Phase 3 deterministic eval
- package smoke

真实 Agent behavioral eval 单独运行和保存结果；在重复性、成本、稳定性被证明前不作为普通 PR hard gate。

## Tickets

- EVO3-501 Doctor stale-state checks
- EVO3-502 Doctor knowledge checks
- EVO3-503 package smoke
- EVO3-504 clean-install CLI smoke
- EVO3-505 Phase 3 eval CI
- EVO3-506 Operations guide
- EVO3-507 v0.3 capability matrix
- EVO3-508 Release readiness

---

# Phase 3 core evals

- E301 Existing Pattern Continuation
- E302 Fresh Session Feature
- E303 Requirement Delta Invalidation
- E304 Bug Regression
- E305 Hard Gate Negative Regression
- E306 Soft Signal Must Not Hard Fail
- E307 Acceptance Traceability
- E308 Stale Evidence Detection
- E309 Stale Context/Constraints Detection
- E310 Worker Cannot Self-Accept
- E311 Checkpoint Commit
- E312 Final Delivery Commit
- E313 Cross-framework Positive Consistency
- E314 Package Black-box
- E315 Goal Stop on Human Decision

---

# Implementation order

`M3.1 → M3.2 → M3.3 → M3.4 → M3.5 → M3.6`

Reason：先建立真实 Behavior Baseline，再解析约束，再把已经证明稳定的规则机械化；之后才增加 Goal 自主性。最后处理跨变更学习、诊断、分发与发布。

# P0

- Behavioral baseline
- Resolved Constraints
- Artifact fingerprint/freshness
- Protocol Gates
- Acceptance Traceability
- Candidate Admission
- `evo-commit`
- Bounded Goal integration
- Delta freshness
- Bug regression
- Fresh-session Recover
- Phase 3 deterministic eval
- Package black-box

# P1

- Advanced Doctor
- Project Gate promotion
- Additional Agent Adapters
- More behavioral scenarios
- Finding analytics

# Verification strategy

Focused：每个 Ticket/Slice 对应最窄 unit/integration/eval。

Milestone admission：每个 milestone 完成后运行受影响模块检查、Phase 3 relevant eval，并使用 `evo-commit` 创建 checkpoint。

Repository-wide before Finish：

- `pnpm run typecheck`
- `pnpm run test`
- `pnpm run build`
- `pnpm run smoke:cli`
- `pnpm run validate:skills`
- `pnpm run check:schemas`
- `pnpm run eval:phase2`
- `pnpm run eval:phase3`
- package black-box smoke

# Migration

优先兼容 schemaVersion 2。若必须新增不兼容状态：

1. explicit migration plan
2. preview before write
3. deterministic migration tests
4. rollback guidance

禁止 CLI 未预览静默重写用户 managed repository。

# Rollback

- 每个 milestone 保持独立可回退。
- Project Gates 在晋升前使用 report-only。
- 新 Goal integration 必须允许禁用而不破坏手动 Change 流程。
- Behavioral eval 不作为普通 CI gate，直到可靠性有证据。

# Stop conditions

- 需要把启发式 inference 当作 hard fact。
- 需要复制现有 Authority 建第二套 conventions encyclopedia。
- 需要自己实现通用 Harness runtime 才能继续。
- 需要自动做产品、架构、安全、破坏性数据 Decision。
- 需要并行 Agent 才能完成 v0.3。
- 破坏 v0.2 repository 且没有明确 migration。
- Eval 只能通过测试 fixture 专用硬编码成立。

# Definition of Done

Phase 3 结束时必须证明：

- Fresh Agent 无旧 Chat 仍能恢复 objective/constraints/decisions/evidence/next action。
- 跨 Session 新 Feature 保持目标 Repository 自己的工程语言。
- HARD 与 SOFT/REFERENCE/UNKNOWN/CONFLICT 边界可解释且可测试。
- 所有 hard gate 有 negative regression。
- Worker 只能 READY_FOR_REVIEW，不能 self-accept。
- Requirement Delta 后 stale/current 状态正确传播。
- Bug 有 failing evidence + root cause + regression。
- 至少一条 Finding → Eval → Rule/Decision → Gate 晋升链被真实证明。
- `evo-finish` 与 `evo-commit` 边界保持清晰。
- Git checkpoint 能让未来 Agent 理解阶段完成情况、Evidence、限制与 Next。
- Packed artifact clean-install 主路径通过。
