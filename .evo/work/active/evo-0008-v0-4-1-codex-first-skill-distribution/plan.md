---
change: evo-0008-v0-4-1-codex-first-skill-distribution
status: AWAITING_APPROVAL
approval: null
currentTruthTargets:
  - path: src/commands/skills/inspect.ts
    action: CREATE
    reason: Read-only canonical Skill installation inspection.
  - path: src/commands/skills/install.ts
    action: CREATE
    reason: Preview/apply canonical Skill installation.
  - path: src/commands/skills/update.ts
    action: CREATE
    reason: Safe preview/apply Skill updates.
  - path: src/commands/skills/doctor.ts
    action: CREATE
    reason: Skill visibility, link, copy and drift diagnostics.
  - path: src/skills/installation.ts
    action: CREATE
    reason: Canonical installation planning and application model.
  - path: src/skills/links.ts
    action: CREATE
    reason: Claude symlink/junction and copy-fallback handling.
  - path: src/skills/diagnostics.ts
    action: CREATE
    reason: Cross-harness Skill installation diagnostics.
  - path: src/repository/skill-manifest.ts
    action: UPDATE
    reason: Reuse canonical hashes for runtime install/update verification.
  - path: skills/ask-evo/agents/openai.yaml
    action: CREATE
    reason: Codex-native display and invocation policy for the router.
  - path: scripts/validate-skills.ts
    action: UPDATE
    reason: Validate Codex-native metadata without making it the canonical behavior source.
  - path: scripts/skill-install-evals.ts
    action: CREATE
    reason: Deterministic E411-E420 installation regressions.
  - path: scripts/codex-native-behavioral.ts
    action: CREATE
    reason: Real Codex native discovery/router/target-Skill field evaluation.
  - path: scripts/cross-agent-behavioral.ts
    action: UPDATE
    reason: Reframe Claude/OpenCode as compatibility checks over shared canonical Skills.
  - path: docs/skills/installation.md
    action: CREATE
    reason: Canonical install/update model and safety rules.
  - path: docs/skills/codex.md
    action: CREATE
    reason: First-class Codex usage and metadata contract.
  - path: docs/skills/claude-code.md
    action: CREATE
    reason: Claude symlink/copy adapter contract.
  - path: docs/skills/opencode.md
    action: CREATE
    reason: OpenCode direct shared-source usage.
  - path: docs/skills/migration.md
    action: CREATE
    reason: Safe migration from historical duplicate Skill copies.
  - path: docs/agents/README.md
    action: UPDATE
    reason: Separate Agent compatibility from Skill distribution responsibilities.
  - path: README.md
    action: UPDATE
    reason: Make Codex the default recommended EVO experience.
  - path: docs/testing.md
    action: UPDATE
    reason: Document deterministic and native behavioral proof boundaries.
  - path: package.json
    action: UPDATE
    reason: Add v0.4.1 scripts and align final version before delivery.
---

# Implementation plan / 实施计划

## 1. Product boundary / 产品边界

v0.4.1 不新增新的软件工程生命周期，也不改变 v0.4 已完成的跨 Agent Repository Protocol。

本次只解决：

> 一份 EVO Skill 如何以 Codex-first 的方式稳定安装、更新、验证，并被 Codex、OpenCode、Claude Code 共用。

稳定边界：

`EVO package skills/* -> canonical ~/.agents/skills -> Codex/OpenCode native + Claude link -> shared AGENTS.md/.evo/Git`

其中：

- `skills/*`：EVO 产品源码中的 canonical authoring source；
- `~/.agents/skills/*`：用户机器 canonical runtime installation；
- `.evo/`：具体项目工程状态，不承载通用 Skill；
- `AGENTS.md`：具体项目 standing rules；
- Agent-specific adapter 只解决 runtime visibility，不拥有工程事实。

## 2. Reuse analysis / 复用分析

优先复用：

- 现有 20 个 `skills/*/SKILL.md`；
- `skills/manifest.json` 与 `src/repository/skill-manifest.ts`；
- `scripts/validate-skills.ts`；
- `evo agents inspect/setup/doctor` 的 report-first、安全 preview/apply 哲学；
- `AGENTS.md`、Claude `@AGENTS.md` bridge；
- `ProcessAgentAdapter` 仅用于兼容性 eval，不作为 Codex-native Skill discovery 的证明；
- Evidence v2、Admission、Independent Review、Finish、evo-commit；
- Node 22/24 CI 与 package smoke。

明确不复用/不继续扩大：

- v0.4 中把所有已知目录硬编码成统一 Agent discovery matrix 的做法；
- 为三家维护物理 Skill 副本；
- 自研 universal marketplace/package manager；
- 把机器安装事实写进 `.evo/state.yml`。

---

# Execution Slices / 执行切片

### S1 — Canonical Installation Core

实现 `evo skills inspect/install` 的 canonical root、preview/apply、安全冲突模型和基础 deterministic tests。

### S2 — Claude Shared-Link Adapter

实现 Claude symlink/junction、Windows fallback、wrong/broken link、real-directory conflict 与 copy drift 检测。

### S3 — Codex Native Metadata & Default Experience

为核心 Skills 建立 Codex-first metadata/policy，明确 Codex 默认 Harness，并完成 metadata validation/package inclusion。

### S4 — Safe Update & Skill Doctor

实现 `evo skills update/doctor`，完成版本/hash drift、local modification、legacy duplicate 和迁移 guidance。

### S5 — Native Behavioral Proof & Closure

完成真实 Codex native discovery/router/target-Skill behavioral eval，以及 Claude/OpenCode shared-source compatibility checks、持久化证据和最终收口。

---

# S1 — Canonical Installation Core

## Objective

把“EVO package 中的一份 canonical Skill source”安全部署为“用户机器的一份 canonical runtime installation”。

## S1.1 Canonical root resolver

新增稳定解析器：

- 默认 canonical root：`$HOME/.agents/skills`；
- 测试允许注入 temp HOME；
- 不读取/写入 `.evo/state.yml`；
- 不把 project-local `.agents/skills` 作为 EVO 通用 Skill 默认安装位置。

## S1.2 Installation plan

`evo skills install` 默认只生成 plan：

- EVO distribution source；
- target canonical root；
- expected 20 Skills；
- per-Skill action：`INSTALL | SAME | UPDATE_CANDIDATE | CONFLICT`；
- Claude adapter plan；
- warnings / blockers。

Preview 不能写任何文件。

## S1.3 Apply

只有：

`evo skills install --apply`

才允许写 canonical root。

要求：

- 原子/可恢复写入；
- 不静默覆盖 user-modified Skill；
- expected manifest hash 与实际 source 一致；
- 不自动删除历史目录；
- install 完成后立即执行 post-install verification。

## S1.4 Local modification protection

如果现有 `~/.agents/skills/evo-*/SKILL.md` hash 不等于：

- 当前 package canonical hash；且
- 已知上一版 managed hash（若可证明）

则状态为：

`LOCAL_MODIFICATION_DETECTED`

默认 BLOCKED。强制覆盖必须是显式授权，且第一版可以只提供 remediation guidance，不必立即实现 `--force`。

## Tickets

- EVO41-101 Add canonical global Skill-root resolver
- EVO41-102 Add install inspection model/schema
- EVO41-103 Add install preview command
- EVO41-104 Add explicit apply path
- EVO41-105 Protect local modifications/conflicts
- EVO41-106 Add S1 unit/integration tests

## Verification

- empty temp HOME -> preview no writes；
- apply installs exactly one copy of each EVO Skill；
- repeat apply -> idempotent；
- local modification -> blocked；
- `.evo/state.yml` unchanged。

---

# S2 — Claude Shared-Link Adapter

## Objective

让 Claude Code 使用自己的 native Skill directory，但不形成第二 physical Skill Authority。

## S2.1 Target model

目标：

`~/.claude/skills/evo-* -> ~/.agents/skills/evo-*`

每个 entry 状态：

- `MISSING`
- `CORRECT_SYMLINK`
- `WRONG_SYMLINK`
- `BROKEN_SYMLINK`
- `REAL_DIRECTORY_CONFLICT`
- `COPY_FALLBACK_CURRENT`
- `COPY_FALLBACK_DRIFT`

## S2.2 Safe creation

Unix-like：优先目录 symlink。

Windows：优先可验证的 directory symlink/junction；如果环境不允许，允许 COPY fallback。

禁止：

- 删除已有真实目录；
- 自动重定向未知 symlink；
- 把 COPY fallback 伪装成 shared source。

## S2.3 Copy fallback

COPY fallback 必须：

- 在 report 中明确 `mode: COPY`；
- 与 canonical hash 对比；
- update 时同步；
- stale 时 Doctor ERROR/WARNING（严重度按是否影响可用性决定）。

## Tickets

- EVO41-201 Add Claude link inspection
- EVO41-202 Add safe symlink/junction planning
- EVO41-203 Add explicit apply
- EVO41-204 Add Windows copy fallback
- EVO41-205 Add wrong/broken/conflict diagnostics
- EVO41-206 Add S2 platform-aware tests

## Verification

- correct link -> NOOP；
- wrong link -> diagnostic，不覆盖；
- real directory -> conflict，不删除；
- copy fallback hash current -> PASS；
- copy fallback stale -> drift finding。

---

# S3 — Codex Native Metadata & Default Experience

## Objective

让 Codex 成为真正的 First-class EVO Harness，而不是“与其他 Agent 平权的一个 Adapter”。

## S3.1 `agents/openai.yaml`

对需要 Codex native presentation/policy 的 Skill 增加：

`skills/<name>/agents/openai.yaml`

最少包含合法 interface metadata；涉及 invocation policy 时必须与 EVO lifecycle authority一致。

首批至少包括：

- `ask-evo`
- `evo-init`
- `evo-finish`
- `evo-commit`

其他 Skill 是否添加由审计决定，不机械复制模板。

## S3.2 Invocation classification

建立清晰分类：

### Human-initiation candidates

- `ask-evo`：导航入口；
- `evo-init`：Repository initialization；
- `evo-finish`：工程完成/人类接受边界；
- `evo-commit`：Git chronology / side-effect boundary。

### Model-invokable candidates

例如：

- `evo-bug`
- `evo-engineering`
- `evo-recover`
- `evo-verify`

最终分类需逐 Skill审查，并保持：

> Harness policy 只是 invocation UX；真正授权仍由 Repository Protocol / CLI Gate 决定。

## S3.3 Default backend

EVO 配置/Goal 未显式指定 Agent 时：

- default backend = Codex；
- Claude/OpenCode 必须显式选择；
- 不改变 Adapter interface。

如果现有 schema 改动会产生 migration，必须先通过独立 Decision；优先使用 backward-compatible default，而不是 schema churn。

## Tickets

- EVO41-301 Audit Skill invocation categories
- EVO41-302 Add Codex metadata to selected Skills
- EVO41-303 Extend Skill validator for `agents/openai.yaml`
- EVO41-304 Ensure packed artifact includes metadata
- EVO41-305 Make Codex the documented/default execution Harness
- EVO41-306 Add S3 tests

## Verification

- metadata schema valid；
- package smoke includes metadata；
- no `SKILL.md` behavior fork；
- explicit Claude/OpenCode adapters still work；
- side-effect authority remains in EVO protocol。

---

# S4 — Safe Update & Skill Doctor

## Objective

让 Skill 安装可长期维护，而不是“一次复制以后永远不知道版本”。

## S4.1 `evo skills inspect`

只读输出：

- canonical source package version；
- canonical runtime root；
- installed Skills / hashes；
- Codex availability；
- OpenCode availability；
- Claude adapter mode；
- drift/conflict/legacy sources；
- recommended next action。

## S4.2 `evo skills update`

默认 preview。

per-Skill：

- `SAME`
- `UPDATE`
- `LOCAL_MODIFICATION`
- `MISSING`
- `CONFLICT`

`--apply` 只更新被确认安全的 managed canonical Skill。

Claude symlink consumer无需复制；COPY fallback在 canonical 成功更新后再同步。

## S4.3 `evo skills doctor`

至少覆盖：

### Canonical

- `CANONICAL_SKILL_MISSING`
- `CANONICAL_SKILL_INVALID`
- `CANONICAL_SKILL_VERSION_DRIFT`
- `SKILL_MANIFEST_STALE`

### Codex

- `CODEX_NOT_FOUND`（INFO）
- `CODEX_SKILL_NOT_VISIBLE`
- `CODEX_METADATA_INVALID`

### OpenCode

- `OPENCODE_NOT_FOUND`（INFO）
- `OPENCODE_SKILL_NOT_VISIBLE`

### Claude

- `CLAUDE_NOT_FOUND`（INFO）
- `CLAUDE_SKILL_MISSING`
- `CLAUDE_SKILL_WRONG_SYMLINK`
- `CLAUDE_SKILL_BROKEN_SYMLINK`
- `CLAUDE_SKILL_COPY_DRIFT`
- `CLAUDE_SKILL_CONFLICT`

### Legacy / duplicate

- `LEGACY_EVO_SKILL_SOURCE`
- `DUPLICATE_EVO_SKILL_SOURCE`

不要通过硬编码所有 Harness目录来“证明生态真理”；只检查 EVO 明确定义的 installation contract，并通过 real Harness eval 验证最终可用性。

## S4.4 Migration guidance

如果发现 v0.4 历史副本：

- 只报告；
- 给出 canonical install -> verify -> Claude link -> manual cleanup 顺序；
- 不自动删除。

## Tickets

- EVO41-401 Add `evo skills inspect`
- EVO41-402 Add update preview/apply
- EVO41-403 Add hash/link/copy drift diagnostics
- EVO41-404 Add legacy duplicate guidance
- EVO41-405 Split `evo agents` vs `evo skills` docs/responsibility
- EVO41-406 Add S4 regression tests

## Verification

- install/update idempotence；
- symlink consumer auto reflects canonical update；
- COPY fallback sync/current；
- user-modified file never silently overwritten；
- legacy source never automatically deleted。

---

# S5 — Native Behavioral Proof & Closure

## Objective

把 v0.4 中“Protocol portability”的证明升级成真正的“Codex-native Skill portability”，并确认 Claude/OpenCode共享安装可接力。

## S5.1 Deterministic evals

新增 E411-E420：

- **E411 Canonical Global Install**：temp HOME 只产生一份 canonical physical Skills。
- **E412 Install Preview Read-only**：preview 文件系统零变化。
- **E413 Codex Native Visibility**：Codex contract 对 canonical `.agents/skills` 可见。
- **E414 OpenCode Shared Visibility**：只存在 canonical source 时 OpenCode compatibility 可见。
- **E415 Claude Symlink**：Claude link realpath 指向 canonical。
- **E416 Claude Existing Directory Conflict**：已有真实目录时 BLOCKED，不覆盖。
- **E417 Symlink Drift**：错误/broken target 被发现。
- **E418 Copy Fallback Drift**：copy hash 不一致被发现。
- **E419 Safe Update**：canonical 更新一次后三个 consumer保持/恢复一致。
- **E420 Codex Metadata Validation**：`agents/openai.yaml` 合法且 packaged。

E411-E420 应进入默认 deterministic CI，除非某一项需要真实外部 Harness，此时拆成 deterministic contract + behavioral proof。

## S5.2 Real Codex native behavioral eval

必须与 v0.4 `ProcessAgentAdapter` 直接塞 Slice Prompt 的测试区别开。

场景：

1. clean temp HOME；
2. `evo skills install --apply`；
3. 创建固定 small Brownfield fixture，包含 `AGENTS.md + .evo/ + approved current Slice`；
4. fresh Codex process；
5. 只给用户级请求：`Use ask-evo and continue the current approved work.`；
6. Codex必须原生发现 `ask-evo`；
7. `ask-evo` 根据 Repository State推荐正确 target Skill；
8. target Skill被加载；
9. Codex执行 bounded product change；
10. independent evaluator 验证 changed paths/tests/no unauthorized finish/commit。

不得直接在 harness prompt 中注入完整 Slice acceptance 以绕过 Skill discovery/router。

## S5.3 Claude compatibility field check

验证：

`canonical ~/.agents/skills -> Claude symlink -> Skill visible -> same Repository/.evo recover -> bounded continuation`

不要求和 Codex同等深度，但必须证明 link 后真实 Harness可见。

## S5.4 OpenCode compatibility field check

验证：

`canonical ~/.agents/skills -> OpenCode visible -> same AGENTS/.evo -> bounded continuation`

不创建 `.opencode/skills/evo-*` duplicate。

## S5.5 Durable evidence

持久化：

- `references/experiments/skills/codex-native-skill-flow.json`
- `references/experiments/skills/codex-native-skill-flow.md`
- 必要的 Claude/OpenCode compatibility summary

记录：

- fixed revisions；
- clean HOME / install mode；
- actual Skill path；
- native harness invocation；
- loaded/router/target observations；
- changed paths；
- build/test status；
- limitations；
- artifact SHA256。

Agent self-report不能单独作为验收证据。

## Tickets

- EVO41-501 Add deterministic E411-E420
- EVO41-502 Build clean-HOME Codex native harness
- EVO41-503 Prove ask-evo -> target Skill native route
- EVO41-504 Add Claude shared-link field check
- EVO41-505 Add OpenCode shared-source field check
- EVO41-506 Persist durable native-flow trace
- EVO41-507 Refresh all current Evidence/Gates/Freshness

---

# Verification strategy / 验证策略

每个 Slice：

`Focused tests -> relevant deterministic eval -> checkpoint`

最终至少运行：

- `pnpm run typecheck`
- `pnpm test`
- `pnpm run build`
- `pnpm run smoke:cli`
- `pnpm run validate:skills`
- `pnpm run check:schemas`
- `pnpm run eval:phase2`
- `pnpm run eval:phase3`
- `pnpm run eval:hardening`
- `pnpm run eval:cross-agent`
- `pnpm run eval:skill-install`（新）
- `pnpm run smoke:package`
- real Codex native behavioral eval
- Claude/OpenCode compatibility field checks
- GitHub Actions Node 22 + Node 24

真实外部 Agent eval 如果因未安装/认证等外部边界无法执行，必须明确 `UNVERIFIED`，不能伪装 PASS。

---

# Migration strategy / 迁移策略

v0.4 -> v0.4.1 不应要求 `.evo` schema migration。

机器级 migration：

1. `evo skills inspect`；
2. preview canonical install；
3. apply canonical `~/.agents/skills`；
4. verify Codex/OpenCode；
5. preview/apply Claude symlink；
6. 报告 legacy copies；
7. 人工清理旧副本；
8. `evo skills doctor` PASS。

如果实现被迫修改 `.evo/state.yml` schema、Change protocol 或 Evidence schema：STOP，单独 Decision，不把机器级 Skill distribution 问题扩散到 Repository protocol。

---

# Documentation / 文档

新增：

- `docs/skills/installation.md`
- `docs/skills/codex.md`
- `docs/skills/claude-code.md`
- `docs/skills/opencode.md`
- `docs/skills/migration.md`

README 默认 Quick Start 改为 Codex-first：

1. Install EVO CLI
2. `evo skills install`
3. review preview
4. `evo skills install --apply`
5. `evo skills doctor`
6. enter project
7. `evo init`（若未管理）
8. start Codex
9. use `ask-evo`

Claude/OpenCode 放在“Compatible Harnesses”章节，不与 Codex默认路径竞争。

---

# Stop conditions / 停止条件

出现以下情况必须停止并回到人工 Decision：

- Codex当前官方 Skill contract 与 `~/.agents/skills` 假设发生实质冲突；
- Windows无法提供可验证的 symlink/junction/copy fallback；
- 为支持安装必须新增后台服务/常驻 daemon；
- 必须修改 `.evo` lifecycle schema；
- 需要自动删除用户历史 Skill directories；
- native behavioral eval 只能通过直接注入 target Skill/acceptance 才能成功；
- Claude/OpenCode 共享 source 与官方 runtime contract 实质不兼容。

---

# Final closure sequence / 最终收口顺序

1. Freeze v0.4.1 scope。
2. Human review exact current Change/Plan。
3. Approve exact artifacts。
4. S1 -> S5 顺序实现，focused verification + checkpoint。
5. 更新 package version 到 `0.4.1`，文档与实际行为一致。
6. Rebuild Working Context / Constraints / Freshness / Acceptance Trace / Gates / Evidence。
7. 全套 deterministic verification + native behavioral proof。
8. Candidate Admission 必须为 `REVIEW_ADMITTED`。
9. Fresh-context Independent Review。
10. Human Acceptance。
11. `evo-finish --apply`。
12. `evo-commit` FINAL_DELIVERY；push 仍需显式授权。
13. 合并 main 后再次跑 Node 22/24 CI。

---

# Definition of Done / 完成定义

v0.4.1 只有同时满足以下条件才算完成：

1. 用户机器 EVO 通用 Skills 只有一个 canonical physical runtime source；
2. 默认 canonical root 为 `~/.agents/skills`；
3. Codex 原生发现并运行 EVO Skills；
4. OpenCode直接复用同一 source；
5. Claude通过 symlink/junction 复用；
6. link 不可用时 COPY fallback安全、可识别、可校验；
7. install/update默认 preview；
8. 用户现有内容不被静默覆盖或删除；
9. canonical update只需执行一次；
10. wrong/broken link、copy drift、version drift、legacy duplicate均可诊断；
11. Codex native metadata合法且被 package smoke覆盖；
12. `.evo/` 不包含通用 Skill，也不持久化本机 Agent安装事实；
13. 三个 Harness继续读取同一项目 `AGENTS.md + .evo/ + Git`；
14. E411-E420 deterministic eval通过；
15. 真实 Codex原生完成 `ask-evo -> target Skill -> bounded work`；
16. Claude/OpenCode shared-source compatibility field checks通过或明确记录不可控 `UNVERIFIED`；
17. 全套 Node 22/24 CI、package smoke、历史 regressions通过；
18. Independent Review / Human Acceptance / Finish / Final Delivery完整闭环。
