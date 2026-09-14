---
change: evo-0006-v0-3-engineering-closure
status: APPROVED
approval:
  approvedAt: 2026-09-14T11:02:18.640Z
  approvedBy: human
  fingerprint: 03e5b83dbc2553ff375669b21a56ec653ea1c9f4458ee83026e4395ac65f8152
  source: user-delegated human approval for final closure
currentTruthTargets:
  - path: src/validation/doctor.ts
    action: UPDATE
    reason: Detect implementation-ahead-of-approval without adding a new workflow state.
  - path: src/repository/recovery.ts
    action: UPDATE
    reason: Explain out-of-band implementation recovery and preserve chronology.
  - path: src/validation/gates.ts
    action: UPDATE
    reason: Keep project hard-gate promotion bound to registered deterministic checks and regressions.
  - path: scripts/phase3-development-continuity.ts
    action: CREATE
    reason: Real code-changing long-horizon Brownfield continuity evaluation.
  - path: references/experiments/phase3/development-continuity.json
    action: CREATE
    reason: Durable sanitized machine-readable behavioral trace.
  - path: references/experiments/phase3/development-continuity.md
    action: CREATE
    reason: Human-readable summary that points to the raw trace and evidence boundaries.
  - path: scripts/phase3-evals.ts
    action: UPDATE
    reason: Regression coverage for dogfood deviation detection and project-gate promotion safety.
  - path: tests/goal-orchestration.test.ts
    action: UPDATE
    reason: Preserve bounded worker/review boundary if recovery diagnostics touch orchestration state.
  - path: tests/gates.test.ts
    action: UPDATE
    reason: Verify only registered deterministic project checks can be promoted HARD.
  - path: package.json
    action: UPDATE
    reason: Align final repository version with v0.3.0 before final acceptance.
  - path: README.md
    action: UPDATE
    reason: Describe final v0.3 verified boundary and remaining explicit limitations.
  - path: docs/testing.md
    action: UPDATE
    reason: Document long-horizon continuity eval and durable trace rules.
  - path: docs/workflow-protocol.md
    action: UPDATE
    reason: Document implementation-ahead-of-approval recovery without retroactive authorization.
  - path: docs/operations.md
    action: UPDATE
    reason: Document final Approval → Admission → Review → Finish → Delivery sequence.
---

# Phase 3 final closure plan / 三期最终收尾开发方案

## 0. Executive decision / 最终决策

Phase 3 已经 Feature Complete。此 Plan 不再增加产品功能，而是把 v0.3 从“实现完成”推进到“工程证明完成”。

最终只做四件事：

1. **诚实恢复**：识别 EVO 自己出现的 implementation-ahead-of-approval，不新增状态机、不伪造历史批准。
2. **补强真实证明**：新增一个真正修改产品代码的 long-horizon Development Continuity Eval。
3. **固化反馈回路**：把行为 trace 持久化为 Evidence artifact，并把 Project HARD Gate 保持在可执行、可回归的保守边界。
4. **用 EVO 完成 EVO**：exact approval → fresh artifacts/evidence → candidate admission → independent review → human acceptance → finish → final delivery → merge。

完成这些以后，停止 Phase 3；任何新能力进入未来 Change，不继续塞进 v0.3。

## Machine-readable execution Slices / 机器可识别执行边界

以下四个 Slice 只是把本收尾 Plan 的 F1–F4 实施边界投影给现有 Goal/state 导航；它们不新增 workflow status，也不改变最终验收合同。

### F1 — Dogfood deviation detection

实现并验证 implementation-ahead-of-approval finding、Recovery 说明和不追认历史的回归。

### F2 — Development continuity evaluation

实现并验证真实代码修改的 Feature → Delta → Bug/Regression → Fresh Recover → Follow-up Feature 连续评估。

### F3 — Durable behavioral trace

实现脱敏 machine-readable trace、Repository artifact、SHA-256 绑定和篡改回归。

### F4 — Conservative Project HARD Gate

实现受控 deterministic checker registry、HARD 晋升约束和 valid → violation → restore 回归。

---

# 1. Why this is the final plan / 为什么这是最终方案

## 1.1 OpenAI Harness Engineering

OpenAI 2026-02-11 的 Harness Engineering 经验强调：

- Humans steer, agents execute；
- Repository/环境必须成为 Agent 可读的系统事实源；
- 工程师应设计 intent、feedback loop、tests 和 guardrails；
- 机械 enforce architecture/invariants，而不是微操实现过程；
- Agent autonomy 应建立在 testing、validation、review、feedback、recovery 之后。

EVO 当前 Constraints/Freshness/Gates/Acceptance/Goal/Recovery 的方向是正确的；收尾不应再扩流程，而应证明这条反馈链真正闭合。

## 1.2 OpenAI self-improving agents

OpenAI 2026-05-27 的 self-improving tax agents 实践给出的关键循环是：

`Production Trace → Human/Expert Correction → Finding → Eval → Scoped Engineering Task → Regression → Better Product`

因此本次不把一次 finding 直接升级成新规则或新状态；先把 EVO 自己的流程偏差变成可观察 diagnostic，把 real development behavior 变成可重放 Eval，再决定是否长期机械化。

## 1.3 Long-horizon work

OpenAI 2026-06-25 对 Agent 工作模式的总结指出，工作单元已经从短对话转向 delegated long-horizon task。EVO 最重要的证明不是“Codex 能写一次 CRUD”，而是：

- Session 断开后能恢复；
- Requirement Delta 后旧证明会正确失效；
- Bug 后能留下 regression；
- Fresh Agent 只依赖 Repository/EVO/Git 就能继续；
- 新代码仍延续同一个项目的工程语言。

因此最终 Field Eval 必须是连续开发，而不是单次生成 demo。

## 1.4 OpenAI Agents API

OpenAI 2026-09-10 的 Agents API 把 context management、long-running session、tool orchestration、subagent mechanics 和 sandbox 等通用 Harness 能力交给持续演进的 Codex harness。

所以本 Plan 明确禁止 EVO 在收尾阶段自研：

- generic agent loop；
- context compaction；
- tool search；
- subagent scheduler；
- cloud sandbox/control plane。

EVO 的差异化继续是 Repository Intelligence、Engineering Contract、Deterministic Control、Evidence、Acceptance、Knowledge Evolution。

---

# 2. Current verified baseline / 当前已验证基线

以下能力视为已经实现，不重新开发：

- Repository Grounding / Working Context；
- Resolved Constraints：HARD / SOFT / REFERENCE / UNKNOWN / CONFLICT；
- input fingerprint / CURRENT / STALE / MISSING / UNKNOWN / CONFLICT；
- Protocol Gates / Project Signals；
- Acceptance Traceability；
- Candidate Admission；
- bounded Goal + fresh preflight + focused verification + postflight + failure budget；
- Worker success = READY_FOR_REVIEW；
- `evo-recover` / `evo-doctor`；
- Evidence v2；
- `evo-finish` / `evo-commit` 分离；
- E301-E315 deterministic suite；
- Node 22/24 default CI；
- packed-artifact clean-install smoke；
- RuoYi/FastAPI real-Agent Repository Understanding baseline。

这些不是本 Plan 的开发目标；本 Plan 只修闭环缺口。

---

# 3. F1 — Dogfood deviation detection & honest reconciliation

## Objective

处理当前真实 finding：Phase 3 实现已经存在，但 Change/Plan 仍未批准。

不能通过新增一个复杂 workflow state 或直接改 `.evo/state.yml` 来“修平历史”。系统要做的是检测事实、阻止错误 Finish，并给出可执行恢复路径。

## 3.1 No new workflow enum

明确不新增：

- `RECOVERY_REQUIRED`
- `IMPLEMENTED_OUTSIDE_PROTOCOL`
- 其他仅为这次收尾服务的状态枚举。

原因：当前已有 `AWAITING_APPROVAL`、Approval Gate、Freshness、Admission 和 Finish boundary，已经足够表达“现在不能继续收口”。

新增的应该是 **diagnostic/finding**，不是新的状态机。

## 3.2 Detection

增加稳定 diagnostic code，例如：

`IMPLEMENTATION_AHEAD_OF_APPROVAL`

触发条件使用可观察 Repository 事实，至少覆盖：

- active Change 或 Plan 没有 current approval；并且
- 同一 Change 已经存在实现型迹象之一：
  - Evidence record 的 `git.changedPaths` 包含 `.evo/` / docs 之外的 source/test/script/schema/package path；
  - Goal attempt 记录了产品/工程文件 changedFiles；
  - 最近相关 Git chronology 含 `EVO-Change: <id>` checkpoint，且 checkpoint 明确发生在未批准阶段。

不要求猜测人类主观意图。

## 3.3 Behavior

- Doctor：报告 finding，说明历史事实和恢复方法；report-first，不自动写状态。
- Recover：在 blockers/next action 中明确说明“implementation exists before current approval”。
- Goal/Admission/Finish：继续使用已有 approval/current gates 阻止未批准候选；不新增重复 gate。
- Approval 后 diagnostic 可以解除当前 blocker，但 Git/Evidence chronology 保留过去发生过的偏差。

## 3.4 Reconciliation semantics

Human 现在执行 approval 的语义是：

> “我审阅并批准当前 exact Change/Plan，允许从这个已存在的 implementation candidate 开始重新验证并完成收口。”

它**不是**：

> “过去的实现当时已经获得批准。”

最终 Review/Delivery 的 Limitations/Engineering Notes 保留这条历史事实。

## Tickets

- EVO3-F101 Doctor diagnostic
- EVO3-F102 Recovery explanation/next action
- EVO3-F103 Regression fixture: unapproved + implementation evidence → finding
- EVO3-F104 Regression fixture: current approval + rebuilt current artifacts → no active blocker

## Verification

- 不手改 state；
- 未批准时 Candidate Admission 仍不能通过；
- 诊断只基于可观察事实；
- 批准后必须重新 build derived state/evidence，不能因为 approval 本身自动变 PASS。

---

# 4. F2 — Long-horizon Development Continuity Eval

## Objective

补足当前最大证据缺口：现有 behavioral baseline 证明 Agent “看懂并描述项目模式”，但没有证明 Agent 真正修改产品代码后仍能长期保持一致。

新增 evaluator：

`scripts/phase3-development-continuity.ts`

它与现有 `phase3-ruoyi-behavioral.ts` 并存：

- 旧 evaluator = Repository Understanding Behavioral Eval；
- 新 evaluator = Real Development Continuity Eval。

## 4.1 Fixed inputs

- 固定 RuoYi backend revision；
- 固定 RuoYi frontend revision；
- clean temporary clone/archive；
- evaluator 自己的 dedicated database/runtime（如果运行 runtime）；
- 原始 checkout 只读；
- 每次运行记录 exact revisions、Agent config、command、timestamps。

## 4.2 Scenario

使用一个小而真实、能体现 RuoYi 工程惯例的 Supplier/Inventory 类能力。具体业务命名可以在实现 evaluator 时微调，但场景结构固定：

### Session A — Initial feature

真正修改产品源码，完成一个 bounded vertical slice，例如 Supplier Category / Inventory Rule 的 CRUD 主路径。

要求延续真实 Repository：

- Controller naming / annotations；
- AjaxResult/TableDataInfo 等 response/pagination；
- permission；
- Service/Mapper/XML；
- logging/export pattern；
- Vue API/page pattern；
- domain vocabulary；
- tests/build path。

完成后在临时 repo 创建 checkpoint commit。

### Session B — Requirement Delta

修改一个已实现业务边界，例如：

- threshold inclusive → exclusive；或
- supplier status 从简单 enabled 变为 review/approved boundary。

必须验证：

- Change/Plan/Constraints/Evidence freshness 正确变化；
- 只修改受影响 surface；
- 不重写无关实现；
- 新行为有 focused regression。

### Session C — Bug / Regression

对一个 permission/DataScope/boundary bug 建立：

`failing reproduction → root cause → bounded fix → regression`

真实入口无法安全运行时允许 `UNVERIFIED`，但 build/test/source evidence 必须独立存在。

### Session D — Fresh Agent continuation

关闭旧 Agent invocation；新 Agent 不获得旧聊天。

只允许读取：

- Repository；
- `.evo/` current authorities/state；
- Git chronology；
- current Change/Decision/Evidence。

执行 `evo recover` 后实现 follow-up feature，例如 export / additional endpoint / UI behavior。

最终比较 Initial vs Fresh Feature 的工程一致性。

## 4.3 Expected Change Boundary

Evaluator 在 Agent 运行前声明允许的 path patterns，例如：

- bounded Java module/controller/service/mapper/XML；
- bounded frontend API/page；
- dedicated SQL migration/test fixture；
- `.evo/` work/evidence artifacts。

Independent verifier 必须检查：

`actual changed paths ⊆ expected change boundary`

出现无解释的 auth/core/framework/global config 扩散时 FAIL 或 route to human。

## 4.4 Independent verification

至少包括：

- backend compile/package；
- frontend build；
- focused tests / deterministic source assertions；
- permission/response/DataScope/naming/reference checks；
- Git diff / change-boundary check；
- fresh-session recovery assertions；
- A 与 D 的 cross-feature consistency comparison。

如果 dedicated runtime 可安全启动，再记录：

- MySQL/Redis/Spring Boot；
- target API calls；
- optional browser/UI。

Runtime/UI 没跑必须保持 `UNVERIFIED`，不影响 build-level behavioral conclusion，但会成为 Limitations。

## 4.5 Result vocabulary

严格区分：

- `DETERMINISTIC_PASS`
- `BEHAVIORAL_PASS`
- `BEHAVIORAL_FAIL`
- `BUILD_PASS` / `BUILD_FAIL`
- `RUNTIME_PASS` / `RUNTIME_FAIL` / `UNVERIFIED`
- `SOURCE_BOUNDARY_PASS` / `SOURCE_BOUNDARY_FAIL`

Agent 自己说“done”永远不构成独立 PASS。

## Tickets

- EVO3-F201 Continuity evaluator skeleton
- EVO3-F202 Initial code-changing feature
- EVO3-F203 Requirement Delta session
- EVO3-F204 Bug failing/regression session
- EVO3-F205 Fresh Agent continuation
- EVO3-F206 Expected-change-boundary verifier
- EVO3-F207 Cross-feature consistency evaluator
- EVO3-F208 Optional isolated runtime verification

## Stop conditions

- 需要修改原始 input checkout；
- 需要真实生产凭证/数据；
- 只能通过 hard-coded final answer 而非 Repository behavior 得到 PASS；
- Agent 修改 expected boundary 之外的关键系统且没有 human Decision；
- evaluator 把 `UNVERIFIED` 自动提升成 PASS。

---

# 5. F3 — Durable behavioral trace

## Objective

把核心 behavior evidence 从临时路径提升为 Repository 可复查的 production-like trace。

## 5.1 Raw trace

最终成功 run 生成脱敏 JSON：

`references/experiments/phase3/development-continuity.json`

至少保存：

- evaluator schema version；
- fixed revisions；
- session/scenario ids；
- objectives/acceptance；
- Agent observable status；
- verification results；
- actual changed paths；
- expected boundary；
- build/runtime statuses；
- recovery output summary；
- fresh-session indicator；
- cross-feature comparison；
- limitations；
- generated timestamp。

不保存：

- secrets/tokens/passwords；
-完整 chain-of-thought；
- 无必要的超长 stdout；
- 临时数据库凭证。

## 5.2 Human-readable summary

保存：

`references/experiments/phase3/development-continuity.md`

只总结结论、环境、边界、limitations，并链接 JSON；不复制整份 raw trace。

## 5.3 Evidence binding

通过 Evidence v2 把 JSON/必要 summary 作为 artifact 记录：

- repository-relative path；
- SHA-256；
- fixed revisions；
- acceptance ids；
- git snapshot；
- result status。

临时 `/tmp/...` 可以作为执行中间产物，但不能是唯一长期证据。

## Tickets

- EVO3-F301 JSON sanitizer/schema
- EVO3-F302 durable raw result
- EVO3-F303 evidence artifact binding
- EVO3-F304 artifact hash regression

---

# 6. F4 — Conservative Project HARD Gate boundary

## Objective

不把三期收尾变成规则引擎项目，只修“prose 声明可以被误认为 regression proof”的边界。

## 6.1 Default

- generated consistency/naming/architecture signals = WARNING；
- no heuristic auto-promotion；
- Human 仍可决定是否接受 warning 或修改项目 Authority。

## 6.2 HARD promotion

v0.3 只允许现有受控 `ProjectGateCheck` 枚举/registered deterministic checker 晋升 HARD。

增加一个极薄 registry，例如概念上：

`ProjectGateCheck -> { deterministic: true, regressionId: 'E306-response-drift' }`

`evaluateGatePromotion` 除现有五项外必须确认：

- check 在 registry 中；
- checker 是 deterministic；
- regressionId 对应默认 CI 中实际执行的 regression/eval。

`negativeRegression` prose 继续作为解释/导航，但不能独立证明可机械 enforce。

## 6.3 No gate DSL

v0.3 明确不支持：

- arbitrary predicate expression；
- user-supplied executable gate code；
- project gate plugin marketplace；
- framework-specific rule packs。

这些需要独立 Future Change。

## Tickets

- EVO3-F401 Built-in project-check registry
- EVO3-F402 Promotion validation
- EVO3-F403 valid → deliberate violation → restore regressions
- EVO3-F404 Docs: WARNING-first semantics

---

# 7. F5 — Final self-dogfood closure

这是 v0.3 真正的最终验收，不是新的功能开发。

## Step 1 — Freeze

- 停止新增功能；
- 当前 branch 保持 `phase3/v0.3-engineering-closure`；
- 不 merge main；
- 不手改 COMPLETED。

## Step 2 — Review final contract

Human 审阅此 Change 和本 Plan 的 exact 内容。

确认重点：

- 当前 implementation-ahead-of-approval 被诚实记录；
- approval 不是 retroactive authorization；
- long-horizon eval 的范围可接受；
- 不扩 Generic Harness。

## Step 3 — Exact approval

执行现有批准机制：

- approve current Change；
- approve current Plan；
- 如存在 Spec 且参与当前 contract，也批准 exact Spec。

任何之后的 substantive contract edit 都让 approval stale，必须重新批准。

## Step 4 — Implement only F1-F4

按顺序：

`F1 deviation diagnostic → F2 continuity eval → F3 durable trace → F4 gate hardening`

每个步骤：

- narrow tests first；
- relevant eval；
- checkpoint commit；
- 不提前 Finish。

## Step 5 — Align v0.3 metadata

在最终 evidence 前：

- `package.json` version → `0.3.0`；
- README/capability matrix 描述当前真实 verified boundary；
- `private: true` 可保留，除非单独决定发布 npm；
- 不因为 version 变更宣称 release 已发生。

## Step 6 — Rebuild derived state

基于最终代码重新生成/检查：

- Working Context；
- Resolved Constraints；
- Freshness；
- Acceptance Trace；
- Protocol Gates；
- Project Gate report；
- Evidence reconciliation。

所有旧 Evidence 都必须通过 input fingerprint 证明仍 current；否则重跑受影响 Evidence。

## Step 7 — Full verification

Repository-wide 必须运行：

- `pnpm run typecheck`
- `pnpm run test`
- `pnpm run build`
- `pnpm run smoke:cli`
- `pnpm run validate:skills`
- `pnpm run check:schemas`
- `pnpm run eval:phase2`
- `pnpm run eval:phase3`
- `pnpm run eval:hardening`
- `pnpm run smoke:package`
- final Development Continuity Eval

GitHub CI：Node 22 + Node 24 必须成功。

## Step 8 — Candidate Admission

运行 Candidate Admission。

必须满足：

- exact approvals CURRENT；
- hard Protocol Gates PASS；
- allowed Project HARD Gates PASS；
- Acceptance Trace complete；
- Evidence current；
- derived freshness CURRENT；
- no unresolved UNKNOWN/CONFLICT blocker。

目标：`REVIEW_ADMITTED`。

## Step 9 — Independent fresh-context Review

Reviewer 不读取实现 Agent 的旧聊天，仅使用 Repository/EVO/Evidence/Git chronology。

Review 至少检查：

1. Intent/Acceptance：是否真的完成 AC-F1~AC-F8；
2. Repository Fit：是否破坏一期/二期原则；
3. Scope/Risk：F1-F4 是否越界、是否引入新 Harness/状态机/规则 DSL；
4. Evidence：long-horizon eval 是否真的改代码、build/test、fresh session、change boundary；
5. Distribution：packed artifact 与 Node matrix；
6. Known limitations：runtime/UI 未验证是否诚实保留。

Reviewer 只能给 Review 结论，不能代替 Human Acceptance。

## Step 10 — Human Acceptance

Human 明确接受：

- 最终实现；
- out-of-band history 说明；
- behavioral/runtime limitations；
- v0.3 Release boundary。

没有 Human Acceptance，不执行 Finish。

## Step 11 — evo-finish

先 preview，再 `evo-finish --apply`。

Finish 负责：

- convergence；
- Decision/current truth obligations；
- archive active Change；
- State → COMPLETED；
- completion record。

Finish 不 commit、不 push、不 merge。

## Step 12 — Final delivery

Finish 后使用 `evo-commit`：

- checkpoint = FINAL_DELIVERY；
- explicit paths；
- structured Context/Completed/Verification/Limitations/Next；
- trailers 指向 Change/Evidence/Decision；
- push 只有显式授权才执行。

## Step 13 — Merge main

只有：

`Finish COMPLETE + Final Delivery Commit + Remote CI PASS`

三者都成立以后才 merge `phase3/v0.3-engineering-closure` → `main`。

Merge 之后再次确认 main CI。

---

# 8. Final implementation order / 最终实施顺序

`F1 → F2 → F3 → F4 → Metadata 0.3.0 → Fresh Evidence → Admission → Independent Review → Human Acceptance → Finish → Final Delivery → Main`

不允许为了赶进度跳过 Admission/Review/Finish。

---

# 9. Priority

## P0 — v0.3 Finish blockers

- implementation-ahead-of-approval detection/recovery explanation；
- real code-changing Development Continuity Eval；
- durable behavioral trace + Evidence artifact hash；
- conservative Project HARD promotion registry/regression binding；
- exact approval + fresh evidence + candidate admission；
- independent review + human acceptance；
- package version/docs 0.3.0 alignment；
- `evo-finish --apply`；
- final delivery + Node 22/24 CI。

## P1 — explicitly deferred

- more Agent adapters；
- more frameworks；
- more behavioral scenarios；
- automated finding analytics；
- arbitrary project gate extension system；
- multi-agent orchestration。

P1 不阻塞 v0.3。

---

# 10. Regression/eval additions

现有 E301-E315 保持。

建议新增收尾编号：

- **E316 Implementation Ahead of Approval**：未批准 + implementation evidence → diagnostic。
- **E317 Reconciliation Does Not Auto-Pass**：approval 后旧 stale evidence 不会自动变 current。
- **E318 Project HARD Registry**：未注册 heuristic check 不能晋升 HARD。
- **E319 Durable Behavioral Artifact**：raw trace artifact 存在且 hash 可验证。
- **E320 Development Continuity**：真实 code-changing A → Delta → Bug → Fresh C 完成，changed paths 在 expected boundary，build/test/evaluator 通过。

其中 E320 是 field/behavioral eval，不进入每次普通 PR 的 hard CI，直到成本和重复性有足够证据；E316-E319 进入默认 deterministic CI。

---

# 11. Verification philosophy / 验证哲学

继续坚持：

- Verify the world, not the self-report.
- Evidence must match the claim.
- Test the shipping artifact.
- Focused verification often; broader verification near Finish.
- Real entry path 和 static/source evidence 分开报告。
- UNVERIFIED 不是 FAIL，但绝不能伪装成 PASS。
- Eval before enforcement。

最终 continuity eval 的核心 claim 不是“RuoYi 所有功能都工作”，而是：

> 在固定真实 Brownfield Repository 上，EVO 能让不同 Session 的 Agent 在真实代码修改、Requirement Delta、Bug 和恢复之后，仍受同一工程 Contract/Constraints/Evidence 控制，并继续使用该 Repository 自己的工程语言。

---

# 12. Migration & rollback

## Migration

- 优先保持 schemaVersion 2；
- F1 diagnostic 不新增 workflow enum；
- F4 registry 优先使用内部 TypeScript mapping，不引入新的用户持久化协议；
- 若实际实现发现必须修改持久化 schema，立即 STOP，单独写 migration preview/tests/rollback，不在收尾中静默升级。

## Rollback

- F1/F4 是小范围 deterministic change，可独立回退；
- F2/F3 主要是 evaluator/experiment artifact，不改变用户项目协议；
- continuity eval 失败时不降低 acceptance 标准，记录 BEHAVIORAL_FAIL 并修 harness/contract 后重跑；
- 不通过删除失败 Evidence 来获得 PASS。

---

# 13. Stop conditions

立即停止并回到 Human Decision，如果收尾需要：

- 新的产品需求；
- 新的核心架构层；
- 新 workflow state machine；
- generic Agent Runtime；
- arbitrary Gate DSL/plugin；
- multi-agent parallel orchestration；
- 生产凭证/危险数据操作；
- breaking schema 无 migration；
- 把 inference 当 hard fact；
- 把失败/未验证结果改写成 PASS。

这些都不属于 v0.3 closure。

---

# 14. Final Definition of Done / 最终完成定义

只有以下全部成立，Phase 3 才能宣布完成：

1. 当前 implementation-ahead-of-approval finding 被 EVO 自己检测并在最终 Review/chronology 中诚实记录。
2. Human 已批准 exact final Change/Plan；没有 stale approval。
3. 真实 code-changing long-horizon Brownfield continuity eval PASS：Feature → Delta → Bug/Regression → Fresh Recover → Follow-up Feature。
4. Fresh Agent 不依赖旧 Chat，能从 Repository/EVO/Git 恢复 objective、constraints、evidence、next action。
5. Actual changed paths 落在 approved/expected boundary；跨 Session 代码延续目标 Repository 的 naming/API/response/permission/data-scope/service/frontend/testing/domain language。
6. 最终 behavioral raw trace 已脱敏持久化并由 Evidence artifact SHA-256 绑定。
7. Project heuristic 默认 WARNING；任何 Project HARD checker 都是 registered deterministic check，并有默认 CI 中实际执行的 negative regression。
8. Working Context、Constraints、Acceptance Trace、Evidence、Freshness 全部 current；Protocol hard gates PASS。
9. Candidate Admission = `REVIEW_ADMITTED`。
10. Fresh-context Independent Review 通过；Worker 没有 self-accept。
11. Human Acceptance 已明确记录。
12. `pnpm run check` 在 Node 22/24 CI 成功，packed-artifact clean install PASS。
13. package/docs 对齐 v0.3.0；未发布 npm 时 `private: true` 可保留。
14. `evo-finish --apply` 真正归档 Change 并产生 COMPLETED/completion record。
15. final `evo-commit` 在 Finish 之后创建 Git Delivery；commit 不创建 Completion。
16. Final remote CI PASS 后才 merge main；merge 后 main CI 再次 PASS。

满足以上 16 条后，v0.3 停止开发并进入稳定使用/真实项目观察期。

---

# 15. After v0.3 / v0.3 之后

不立即规划新的“大阶段”。先用 v0.3 在真实项目中运行，收集：

`Trace → Finding → Repeated Pattern → Eval → Scoped Change`

只有生产/真实项目 evidence 证明某个问题重复出现，才创建后续 Change。

这保持 EVO 的长期原则：

> Complexity Must Earn Its Keep.

> Eval Before Enforcement.

> Harness Is a Dependency, Not the Product.

> Human Authority > Agent Autonomy.
