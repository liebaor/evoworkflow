---
id: evo-0006-v0-3-engineering-closure
weight: LARGE
status: AWAITING_APPROVAL
approval: null
---

# evoworkflow v0.3 — Final Engineering Closure

## Problem / 问题

Phase 3 的主体实现已经存在：Resolved Constraints、Freshness、Protocol/Project Gates、Acceptance Traceability、Candidate Admission、bounded Goal、Recovery/Doctor、`evo-commit`、E301-E315、RuoYi/FastAPI 行为评估和 packed-artifact smoke 均已落地，并且 Node 22/24 CI 能通过默认 `pnpm run check`。

剩余问题已经不再是“缺少更多功能”，而是最后的工程证明与自举闭环：

1. **EVO 自身出现 implementation-ahead-of-approval**：三期代码已经实现并形成 checkpoint，但活动 Change/Plan 仍处于 `AWAITING_APPROVAL`。这不是理由去手工改状态，而是一次真实 dogfood finding：EVO 必须能识别并诚实恢复 out-of-band implementation，而不伪造历史授权。
2. **现有 Behavioral Eval 主要证明 Repository Understanding**：真实 Agent 能找到 RuoYi/FastAPI 的项目模式、跨 Session 恢复并避免跨框架泄漏，但 evaluator 明确禁止修改产品源码，因此尚未证明“真实产品代码在多 Session / Requirement Delta / Bug / Fresh Agent 后仍保持工程连续性”。
3. **Behavioral trace 需要持久化**：核心行为结果不能只以 `/tmp/...json` 或人工摘要存在；关键 machine-readable trace 需要脱敏后进入 Repository/Evidence artifact，并由 hash 保护。
4. **Project HARD Gate 需要保持保守边界**：启发式 naming/architecture/consistency 信号默认只能 WARNING；任何可晋升 HARD 的 project check 必须绑定真实 deterministic checker 和 CI 中的 negative regression，而不能只依赖一段 prose 声明。
5. **Release/Finish 尚未发生**：当前 Change 没有完成 exact approval → fresh derived state → admission → independent review → human acceptance → `evo-finish` → final delivery；`main` 与 package metadata 也尚未代表完成后的 v0.3。

## Goal / 目标

不再扩展 Phase 3 的产品边界，而是用最小必要改动证明并关闭 v0.3：

`Detect deviation → Reconcile honestly → Run real code-changing continuity eval → Persist trace → Rebuild current evidence → Admit → Independent Review → Human Acceptance → Finish → Final Git Delivery`

最终证明 EVOworkflow 已经从“高级 workflow / skill 集合”收敛为一个可长期工作的 Repository-centered Engineering Control Layer。

## External engineering evidence / 外部工程经验

本次最终收口吸收以下公开经验：

- OpenAI《Harness engineering: leveraging Codex in an agent-first world》（2026-02-11）：Humans steer, agents execute；Repository 是系统事实源；重点是环境、意图、反馈回路和可执行 invariant，而不是微操 Agent 的实现步骤。
- OpenAI《Building self-improving tax agents with Codex》（2026-05-27）：真实 production trace / expert correction 应先变成 Finding，再变成 Eval 和 scoped engineering task；有歧义的案例回到人类，不强制自动化。
- OpenAI《How agents are transforming work》（2026-06-25）：Agent 的工作单元正在从短交互转为 delegated long-horizon task，因此跨 Session、恢复和持续上下文比单次生成质量更重要。
- OpenAI《Introducing the Agents API》（2026-09-10）：通用 context management、long-running session、tool orchestration、subagent mechanics 由持续演进的 Codex harness 承担；EVO 应聚焦自己的 tools、knowledge、workflow 和 engineering control，不重复实现通用 Harness。

这些经验强化 EVO 已有原则：Harness Is a Dependency, Not the Product；Eval Before Enforcement；Derived State Is Disposable；Worker Cannot Accept Its Own Work；Evidence > Claim；Minimum Necessary Process。

## Final scope / 最终收尾范围

### F1 — Dogfood deviation detection & reconciliation

- 不新增新的 workflow enum/status，仅增加一个可观察的 implementation-ahead-of-approval 诊断与恢复说明。
- 当活动 Change/Plan 未批准，但同一 Change 已出现实现型 checkpoint、Evidence、Admission/Gate 结果或非规划产物时，Doctor/Recovery 应明确报告 `IMPLEMENTATION_AHEAD_OF_APPROVAL`（或等价稳定 code）。
- 该 finding 不“追认”过去的执行授权；它要求人类审阅当前 exact Change/Plan，然后从当前实现候选重新建立 Freshness、Evidence、Admission 与 Review。
- 禁止通过手工把 `.evo/state.yml` 改成 COMPLETED 来清除偏差。

### F2 — Long-horizon Development Continuity Eval

- 保留现有 read-only Repository Understanding behavioral baseline。
- 新增至少一个真正修改临时 Brownfield 产品代码的连续开发评估：Feature → Requirement Delta → Bug/Regression → Fresh Session/Recover → Follow-up Feature。
- 每个阶段必须限制 expected change boundary；独立 evaluator 检查真实 changed paths、build/test、项目工程模式和跨 Session 一致性。
- Eval 不要求修改任何真实生产 Repository；使用固定 revision、隔离临时 clone/database/runtime。
- 真实 runtime/UI 如果环境或安全边界不允许，必须保持 `UNVERIFIED`，不能用静态分析替代。

### F3 — Durable trace & conservative project-gate hardening

- 把最终 behavioral machine-readable output 脱敏后保存为 Repository/Evidence artifact，记录 SHA-256、固定 revisions、Agent/evaluator 边界、结果与 limitations。
- Project heuristic signals 默认继续 WARNING。
- v0.3 不引入任意表达式/DSL Project Gate；只有现有受控 `ProjectGateCheck` / deterministic checker 且在 CI 中存在 valid → fail-on-violation → restore regression 的检查才允许人工晋升 HARD。
- 新增任何 project hard checker 必须同时增加 deterministic regression；prose `negativeRegression` 不能单独构成证明。

### F4 — Final acceptance, Finish & delivery

- Human 审阅并批准 exact current Change/Plan；批准不改写“实现先于批准”的历史事实。
- 重建 Working Context、Resolved Constraints、Acceptance Trace、Freshness、Protocol/Project Gate 与 Evidence。
- 运行全部默认 CI、packed-artifact smoke 和最终 continuity eval。
- Candidate Admission 必须 `REVIEW_ADMITTED`。
- 独立 fresh-context Review 后由 Human Acceptance。
- 只有随后执行 `evo-finish --apply` 才能把 Change 归档为 COMPLETED。
- Final Delivery 使用 `evo-commit`；commit/push/merge 不属于 Finish。Merge 到 `main` 只在 Finish、final delivery 与 CI 成功之后进行。
- 在最终交付前把 package/version/documentation 统一为 v0.3.0；若暂不发布 npm，可继续保留 `private: true`，不要为了版本号假装已发布。

## Non-goals / 非目标

- 不再新增 Phase 3 Skill，除非现有 Skill 无法表达收口动作。
- 不新增通用 Agent Runtime、context compression、tool search、subagent scheduler 或云控制面。
- 不新增 Multi-Agent parallel swarm。
- 不新增中央数据库、Vector DB/RAG 平台或 Web UI。
- 不为本次 dogfood 偏差新增一整套 workflow status/state machine。
- 不实现任意 Project Gate DSL/插件系统。
- 不自动做产品、架构、安全或破坏性数据 Decision。
- 不自动 merge、release、deploy、force-push 或 Finish。
- 不用 retroactive approval 伪装历史上已经获得授权。

## Final acceptance / 最终验收标准

- **AC-F1 Dogfood honesty**：EVO 能检测并报告 implementation-ahead-of-approval；恢复流程不手工伪造 COMPLETED，也不把后补 approval 描述为过去已经授权。
- **AC-F2 Real development continuity**：固定 Brownfield revision 上至少一个真实代码修改场景完成 Feature → Delta → Bug/Regression → Fresh Recover → Follow-up Feature；changed paths 落在预期边界，独立 build/test/evaluator 通过，并能比较前后 Feature 的 naming/API/permission/response/data-scope/service/frontend/testing/domain consistency。
- **AC-F3 Durable trace**：最终 continuity eval 的脱敏 machine-readable output 作为可复查 artifact 持久化，Evidence 记录 artifact path + SHA-256；临时路径不是唯一证据。
- **AC-F4 Conservative enforcement**：启发式 project signal 默认 WARNING；任何 HARD project check 都对应明确 Authority、deterministic checker、falsifying case、CI negative regression 与 remediation。
- **AC-F5 Current-state convergence**：exact Change/Plan approval current；Working Context/Constraints/Acceptance/Evidence/Freshness current；Protocol hard gates PASS；Candidate Admission 为 `REVIEW_ADMITTED`。
- **AC-F6 Independent acceptance**：Worker/Goal 最多 `READY_FOR_REVIEW`；fresh-context independent Review 通过并由 Human 明确 Acceptance 后才能 Finish。
- **AC-F7 Distribution**：`pnpm run check` 在 Node 22/24 CI 通过；Phase 2/3 eval、schema/skill validation、CLI smoke、packed-artifact clean-install smoke 全部 PASS；behavioral/runtime limitations 被诚实记录。
- **AC-F8 Final delivery**：`evo-finish --apply` 产生真实 COMPLETED/archive 状态；随后 final `evo-commit` 记录 chronology；v0.3.0 metadata/docs 对齐；只有这些完成后才允许 merge `main`。

## Existing mechanisms to reuse / 复用现有机制

- Approval fingerprint、`evo approve`。
- `buildWorkingContext`、Resolved Constraints、Freshness。
- Evidence v2、Acceptance Traceability、Candidate Admission。
- Protocol/Project Gate、Doctor、Recover。
- bounded Goal / failure budget / READY_FOR_REVIEW。
- `evo-review`、`evo-finish`。
- `evo-commit` checkpoint/final-delivery boundary。
- E301-E315、RuoYi/FastAPI behavioral harness、package black-box、Node 22/24 CI。

## evo-finish vs evo-commit

- `evo-finish`：建立 Engineering Completion，负责当前事实收敛、归档与 COMPLETED 状态。
- `evo-commit`：记录/交付已经存在的 Engineering State，不产生 Acceptance 或 Completion。

> Commit describes state. It does not create state.

## Open decisions / 未决 Decision

本 Change 不再保留需要新架构 Decision 的开放项。若收尾过程中发现必须：

- 新增 workflow enum/state；
- 新增通用 Agent orchestration/runtime；
- 新增任意 Project Gate DSL；
- 修改 Human Acceptance / Finish 权限边界；

则立即停止并创建单独 Decision，而不是在 v0.3 收尾中顺带扩张。
