---
change: evo-0007-v0-4-cross-agent-portability
status: APPROVED
approval:
  approvedAt: 2026-09-14T15:12:54.355Z
  approvedBy: human
  fingerprint: ef429ca085365a16d863bae6370fe17545b4478e6dda113f04daf8b08d59995b
  source: user-delegated human approval for v0.4 completion after execution-boundary correction
currentTruthTargets:
  - path: skills/ask-evo/SKILL.md
    action: UPDATE
    reason: Make ask-evo the stable cross-harness router.
  - path: scripts/validate-skills.ts
    action: UPDATE
    reason: Validate canonical Agent Skills compatibility across supported harnesses.
  - path: scripts/generate-skill-manifest.ts
    action: CREATE
    reason: Generate a disposable canonical Skill index and hashes.
  - path: skills/manifest.json
    action: CREATE
    reason: Derived Skill manifest used for distribution and drift checks.
  - path: src/agents/discovery.ts
    action: CREATE
    reason: Runtime-derived detection of supported Agent clients and Skill sources.
  - path: src/agents/compatibility.ts
    action: CREATE
    reason: Cross-agent instruction and Skill compatibility model.
  - path: src/commands/agents/inspect.ts
    action: CREATE
    reason: Read-only compatibility inspection.
  - path: src/commands/agents/setup.ts
    action: CREATE
    reason: Preview/apply thin repository adapters such as CLAUDE.md -> AGENTS.md.
  - path: src/commands/agents/doctor.ts
    action: CREATE
    reason: Cross-agent diagnostics, duplicate Skill and version drift detection.
  - path: scripts/cross-agent-evals.ts
    action: CREATE
    reason: Deterministic v0.4 protocol regression suite.
  - path: scripts/cross-agent-behavioral.ts
    action: CREATE
    reason: Real Codex/Claude/OpenCode handoff evaluation.
  - path: docs/agents/README.md
    action: CREATE
    reason: Shared cross-agent installation and usage guide.
  - path: docs/agents/codex.md
    action: CREATE
    reason: Codex-specific thin compatibility notes.
  - path: docs/agents/claude-code.md
    action: CREATE
    reason: Claude Code bridge and Skill discovery notes.
  - path: docs/agents/opencode.md
    action: CREATE
    reason: OpenCode Skill-source and duplicate-detection notes.
  - path: references/experiments/cross-agent/cross-agent-continuity.json
    action: CREATE
    reason: Durable machine-readable real cross-agent continuity evidence.
  - path: references/experiments/cross-agent/cross-agent-continuity.md
    action: CREATE
    reason: Human-readable cross-agent behavioral summary.
  - path: README.md
    action: UPDATE
    reason: Document Harness-independent v0.4 workflow and supported agents.
  - path: docs/testing.md
    action: UPDATE
    reason: Document deterministic and behavioral cross-agent eval boundaries.
  - path: docs/operations.md
    action: UPDATE
    reason: Document setup, doctor, handoff, and single-writer operating rules.
  - path: package.json
    action: UPDATE
    reason: Add v0.4 eval/manifest scripts and align final version before delivery.
---

# Implementation plan / 实施计划

## 1. Product boundary / 产品边界

v0.4 不新增新的开发生命周期，也不重写 v0.3 的 Repository / Constraints / Gate / Evidence / Finish 机制。

它只解决一个问题：

> 同一套 EVO Engineering Protocol 能否在 Codex、Claude Code、OpenCode 之间无损接力。

主链保持：

`Repository -> EVO State -> Canonical Skills -> Thin Harness Adapter -> Agent Work -> Evidence -> Git -> Recover`

其中：

- Repository / `.evo` / `AGENTS.md` 是长期工程事实源；
- `skills/*/SKILL.md` 是唯一 Skill source；
- Codex / Claude Code / OpenCode 是可替换执行 Harness；
- compatibility adapter 不拥有工程事实和 lifecycle state。

## 2. Reuse analysis / 复用分析

优先复用：

- `AGENTS.md`：Repository standing rules / authority map。
- `.evo/state.yml`、Working Context、Resolved Constraints、Freshness、Evidence、Recovery。
- `ask-evo` 与现有 20 个 canonical Skills。
- `scripts/validate-skills.ts` 与现有 Skill contract validation。
- `ProcessAgentAdapter` / AgentAdapter abstraction。
- `evo doctor` 的 report-first philosophy。
- v0.3 real-development continuity harness、package black-box、Node 22/24 CI。
- Universal Agent Skills ecosystem / installer；P0 不自研 package manager。

避免：

- three vendor-specific Skill copies；
- duplicated AGENTS/CLAUDE/OPENCODE rule documents；
- installed-agent state 持久化；
- generic multi-agent orchestration runtime。

---

## Execution Slices / 执行切片

以下是本 Plan 的唯一执行边界。其他 `###` 标题是设计、诊断、会话或评估说明，不是可独立执行的 Slice。

### S1 — M4.1 Canonical Skill Compatibility

完成 canonical Skill 审计、可重建 manifest、Universal Router 以及对应确定性回归测试。

### S2 — M4.2 Repository Agent Compatibility

完成 Codex、Claude Code、OpenCode 的运行时发现、AGENTS 单一权威、Claude 薄桥接和重复来源检测。

### S3 — M4.3 Setup and Doctor

完成 `evo agents inspect/setup/doctor` 的只读报告、预览/显式 apply 安全边界和确定性诊断。

### S4 — M4.4 Universal Distribution

完成现有通用 Skill 分发路径、版本/哈希一致性检查、使用文档和包级 smoke 验证。

### S5 — M4.5 Cross-Agent Continuity

完成固定 Brownfield 版本上的真实跨 Agent 接力、独立评估、持久化 machine-readable/human-readable 行为证据和最终收口准备。

# M4.1 — Canonical Skill Compatibility

## Objective

证明 EVO Skills 本身是 Harness-neutral，而不是“Codex 可用的 prompt 集合”。

## 4.1.1 Canonical Skill audit

对所有 `skills/*/SKILL.md` 检查：

- directory name 与 frontmatter `name` 一致；
- `description` 足够支持 Agent discovery，但不塞执行流程；
- canonical content 不假设 Claude slash-command、Codex 专有命令或 OpenCode tool 名；
- vendor-specific metadata 不承担安全/授权语义；
- Skill 中涉及副作用时，最终授权必须依赖 EVO CLI / Repository Protocol，而非某个 Harness UI 特性；
- Skill 不复制 project facts；需要 facts 时引用 Repository authority。

## 4.1.2 Generated Skill Manifest

新增：

`pnpm run generate:skill-manifest`

从 canonical Skills 生成 `skills/manifest.json`：

```json
{
  "schemaVersion": 1,
  "evoVersion": "0.4.0",
  "skills": [
    {"name": "ask-evo", "category": "router", "sha256": "..."}
  ]
}
```

规则：

- manifest 是 Derived Artifact；
- source of truth 仍是 `skills/*/SKILL.md`；
- 删除 manifest 后可 deterministically rebuild；
- CI 检查生成结果与 committed manifest 一致。

## 4.1.3 ask-evo universal router

强化 `ask-evo`：

- 先读取 `AGENTS.md`、`.evo/state.yml`、active Change、必要的 `evo status/recover`；
- 只推荐一个 next Skill；
- 对 Bug/Requirement Delta/Recovery/Review/Finish/Commit 有明确优先级；
- 不直接吞并目的 Skill 的工作；
- 不依赖 slash-command 语法。

## Tickets

- EVO4-001 Extend Skill validator for cross-harness canonical rules
- EVO4-002 Audit all canonical Skill frontmatter/content
- EVO4-003 Add deterministic Skill manifest generator
- EVO4-004 Commit/reconcile derived manifest
- EVO4-005 Harden ask-evo as universal router
- EVO4-006 Add router deterministic fixtures

## Verification

- unit validation of every Skill；
- manifest delete/rebuild equality；
- `ask-evo` same-state fixtures route to same next Skill；
- no vendor-specific duplicated Skill content introduced。

---

# M4.2 — Repository Agent Compatibility

## Objective

让三个 Harness 看到同一份 Repository truth，而不是三份复制配置。

## 4.2.1 Agent discovery model

新增 runtime-derived discovery：

```ts
interface AgentClientObservation {
  client: 'codex' | 'claude-code' | 'opencode'
  executable: 'FOUND' | 'MISSING'
  version?: string
  instructionSources: string[]
  skillSources: string[]
}
```

这些是 observation，不写 `.evo/state.yml`。

检测优先使用：

- PATH executable；
- known user/project Skill roots；
- known instruction files；
- explicit config source if safely readable。

未知/未安装 client 不能使 Repository invalid。

## 4.2.2 AGENTS canonical authority

Codex / OpenCode：

- `AGENTS.md` 是 canonical standing rule source；
- 不创建 `CODEX.md` 或 `OPENCODE.md` 复制规则。

Claude Code：

- 如果 root `CLAUDE.md` 不存在，setup preview 可建议创建仅包含 `@AGENTS.md` 的 bridge；
- 如果已经正确 import，PASS；
- 如果已有 CLAUDE.md 但没有 bridge，报告 `NEEDS_HUMAN_MERGE`；
- 不覆盖、不自动拼接未知用户内容；
- Doctor 检测明显复制过的 AGENTS 内容并报告 duplicate-authority risk。

## Tickets

- EVO4-101 Define Agent client observation schemas
- EVO4-102 Implement Codex discovery
- EVO4-103 Implement Claude Code discovery/bridge inspection
- EVO4-104 Implement OpenCode discovery/skill-source inspection
- EVO4-105 Add AGENTS/CLAUDE authority diagnostics

## Verification

Fixtures：

- only Codex installed；
- only Claude installed；
- only OpenCode installed；
- all three；
- none installed；
- valid CLAUDE bridge；
- existing incompatible CLAUDE.md；
- duplicated instructions。

---

# M4.3 — `evo agents inspect/setup/doctor`

## Objective

让多 Agent 用户不需要记忆不同 Harness 的安装和配置细节。

## 4.3.1 `evo agents inspect`

Read-only。

输出至少：

- repository canonical instruction source；
- detected clients / versions；
- per-client instruction sources；
- discovered EVO Skill sources；
- manifest/version/hash relation；
- duplicate Skill IDs；
- recommended next action。

JSON output 必须稳定，便于测试。

## 4.3.2 `evo agents setup`

默认 preview：

- 允许建议创建 `CLAUDE.md` bridge；
- 可以报告 universal Skill install guidance；
- 不默认复制 Skills；
- 不修改 `.evo/state.yml`；
- 不覆盖已有 config；
- 所有写操作需要 `--apply`。

第一版唯一安全自动写入候选：

```md
@AGENTS.md
```

仅当 `CLAUDE.md` 不存在时创建。

## 4.3.3 `evo agents doctor`

Report-first。

Diagnostic examples：

### ERROR

- canonical Skill invalid；
- same EVO Skill ID resolves to incompatible versions/hashes in one client；
- broken canonical AGENTS bridge；
- committed Skill manifest does not match canonical source。

### WARNING

- Claude installed but bridge missing；
- duplicate equivalent Skill sources；
- stale EVO Skill version；
- copied duplicate repository rules；
- potential multiple-writer working-tree situation when detectable。

### INFO

- supported client not installed；
- native plugin not used；
- only one Harness available。

## Tickets

- EVO4-201 Add `evo agents inspect`
- EVO4-202 Add setup plan model
- EVO4-203 Add `setup --apply` safe bridge creation
- EVO4-204 Duplicate Skill detection
- EVO4-205 Version/hash drift detection
- EVO4-206 Add `evo agents doctor`
- EVO4-207 CLI/package smoke for agents commands

## Verification

- preview writes nothing；
- apply only creates declared safe file；
- existing user files unchanged；
- deterministic diagnostics across fixtures；
- missing clients non-fatal。

---

# M4.4 — Universal Distribution

## Objective

验证一套 canonical EVO Skills 能通过现有 ecosystem 分发到目标 Harness，不自己复制三套内容。

## P0 path

验证现有 universal installer，例如：

`npx skills@latest add liebaor/evoworkflow`

如果具体 installer CLI 在实现时发生变化，以其当前公开 contract 为准，不在 EVO 里硬编码未经验证的参数。

## Required outcomes

- Codex 能发现安装后的 EVO Skills；
- Claude Code 能发现同一 canonical Skill version；
- OpenCode 能发现同一 canonical Skill version；
- Doctor 能确认 installed hash/version；
- duplicate installation 被报告；
- README 明确选择一种 distribution mode，不重复装。

## Native plugin

Claude native plugin 属于 P1。

只有 universal distribution 无法提供可靠体验时，才通过 Decision 提升优先级。

## Tickets

- EVO4-301 Universal installer compatibility experiment
- EVO4-302 Distribution fixtures / temp homes
- EVO4-303 Cross-client Skill discovery smoke
- EVO4-304 Duplicate distribution regression
- EVO4-305 User installation docs

## Stop condition

如果 universal installer 不能稳定覆盖目标 Harness：

- 记录 Evidence；
- 新建 Decision 比较 thin own installer vs native packaging；
- 不在 Ticket 中直接扩大为 package-manager project。

---

# M4.5 — Cross-Agent Continuity

## Objective

证明 EVO 的核心价值：不同 Agent Harness 接手同一个真实项目时，不依赖旧聊天仍能保持工程连续性。

## Fixed evaluation sequence

使用固定 Brownfield revision、isolated temporary copy。

### Session A — Codex

- fresh session；
- `evo recover/context`；
- 实现 Feature A；
- focused verify；
- Evidence；
- EVO checkpoint commit。

### Session B — Claude Code

- 不提供 Codex chat；
- `evo recover`；
- Requirement Delta；
- 修改 Feature A；
- verify/evidence/checkpoint。

### Session C — OpenCode

- fresh session；
- `evo recover`；
- deterministic bug reproduction；
- root cause；
- fix；
- regression；
- checkpoint。

### Session D — Fresh Agent

- 可再次使用 Codex 或另一个目标 Harness；
- `evo recover`；
- 实现同领域 Feature B；
- verify/evidence。

## Independent evaluator

比较至少：

- Naming
- API / routing
- Response / error
- Permission / authorization
- Data-scope / tenancy where relevant
- Service boundaries
- Persistence pattern
- Transactions where relevant
- Logging
- Frontend API/state/page patterns
- Domain vocabulary
- Tests

并检查：

- changed paths within expected boundary；
- build/test outcome；
- Evidence freshness；
- approvals/gates not silently bypassed；
- no new parallel mechanism without decision；
- no RuoYi mechanism leakage into non-RuoYi positive fixture when cross-framework scenario is used。

## Durable output

写入：

- `references/experiments/cross-agent/cross-agent-continuity.json`
- `references/experiments/cross-agent/cross-agent-continuity.md`

Machine trace 至少包含：

- fixed revisions；
- harness sequence；
- invocation boundaries；
- changed paths；
- verification/evaluator results；
- explicit limitations；
- sanitized prompts/task packages where safe；
- artifact hash。

真实 Agent behavioral eval 不进入普通 PR CI hard gate，直到成本/稳定性/重复性有充分证据。

## Router behavioral check

相同 repository snapshots 分别让 Codex / Claude / OpenCode 使用 `ask-evo`。

要求推荐相同的 next Skill；自然语言解释可不同。

## Tickets

- EVO4-401 Create fixed cross-agent Brownfield fixture
- EVO4-402 Codex Feature A stage
- EVO4-403 Claude Requirement Delta stage
- EVO4-404 OpenCode Bug/Regression stage
- EVO4-405 Fresh-agent Feature B stage
- EVO4-406 Independent consistency evaluator
- EVO4-407 Durable machine/human trace
- EVO4-408 Cross-agent ask-evo router evaluation

---

# 3. Deterministic evaluation suite

新增：

`pnpm run eval:cross-agent`

建议 E401-E410：

- **E401 Canonical Agent Skills** — 全部 canonical Skill 通过跨 Harness contract validation。
- **E402 Manifest Reproducibility** — 删除并重建 Skill manifest 结果一致。
- **E403 Claude AGENTS Bridge** — missing bridge 可安全 preview/create；valid bridge PASS。
- **E404 No-overwrite** — 已有 CLAUDE.md 不被 setup 自动覆盖。
- **E405 Duplicate Skill Discovery** — 多 Skill source 的同名 EVO Skill 被发现并分类。
- **E406 Missing Client Non-fatal** — 未安装某个 Harness 不导致 Repository invalid。
- **E407 Skill Version Drift** — hash/version 不一致被 Doctor 检测。
- **E408 Universal Router** — 固定 state 下 ask-evo 路由唯一且稳定。
- **E409 Cross-Agent Recovery Contract** — fresh harness 得到相同 objective/state/next action 输入。
- **E410 Single-writer Boundary** — docs/setup/doctor 不宣称同 checkout parallel mutation safe。

如果 Evidence executor provenance 进入 P0，可追加 E411；否则不扩 P0。

---

# 4. Repository structure

预计新增：

```text
src/agents/
  discovery.ts
  compatibility.ts

src/commands/agents/
  inspect.ts
  setup.ts
  doctor.ts

scripts/
  generate-skill-manifest.ts
  cross-agent-evals.ts
  cross-agent-behavioral.ts

docs/agents/
  README.md
  codex.md
  claude-code.md
  opencode.md

references/experiments/cross-agent/
  cross-agent-continuity.json
  cross-agent-continuity.md
```

不新增：

```text
skills-codex/
skills-claude/
skills-opencode/
CODEX.md
OPENCODE.md
.evo/agents.yml
```

---

# 5. P0

必须完成：

- canonical Skill compatibility audit；
- generated Skill manifest；
- ask-evo universal router；
- runtime-derived client/skill-source discovery；
- AGENTS canonical authority + Claude thin bridge；
- `evo agents inspect`；
- `evo agents setup` preview/apply；
- `evo agents doctor`；
- duplicate/version-drift detection；
- universal distribution experiment/documentation；
- E401-E410 deterministic suite；
- real Codex -> Claude -> OpenCode continuity eval；
- durable cross-agent evidence；
- README/testing/operations docs；
- Node 22/24 CI + package smoke regressions。

# 6. P1

不阻塞 v0.4：

- Claude native plugin；
- custom EVO Skill installer/updater；
- Evidence executor provenance；
- additional Harness adapters；
- worktree convenience helper；
- richer installed-skill dashboard。

不得把 P1 偷偷升级为 P0，除非出现阻断 P0 的可验证事实并经过 Decision。

---

# 7. Migration / backward compatibility

v0.3 managed Repository 应无需 `.evo` schema migration。

升级主要新增：

- CLI commands；
- derived manifest；
- compatibility diagnostics；
- optional CLAUDE bridge；
- docs/evals。

Rules：

- only Codex project 继续工作；
- only Claude project 可 setup bridge 后工作；
- only OpenCode project 继续工作；
- 没有任何 supported client installed 时 EVO repository protocol 本身仍可 validate；
- 旧 `.evo/state.yml` 不记录 installed clients。

---

# 8. Concurrency safety

v0.4 只承诺：

`one checkout -> one executing writer`

其他 Agent 可以进行 read-only review/analysis。

如果用户需要并行：

- 使用独立 Git branch/worktree；
- 每个 writer 有独立 checkout；
- merge/rebase 仍由 Git/EVO Change boundary 管理。

v0.4 不实现：

- scheduler；
- shared-worktree lock service；
- merge coordinator；
- parallel subagent runtime。

---

# 9. Documentation plan

`docs/agents/README.md`：总体跨 Agent 模型、推荐 universal install、single-writer rule。

`docs/agents/codex.md`：AGENTS、Skill discovery、CLI use；不新增 CODEX authority。

`docs/agents/claude-code.md`：CLAUDE.md bridge、Skill discovery、避免重复安装。

`docs/agents/opencode.md`：AGENTS、多个 Skill source、duplicate precedence 风险。

README 增加最短路径：

```text
1. install evo CLI
2. install canonical EVO Skills with one distribution mode
3. evo agents inspect
4. evo agents setup
5. evo agents doctor
6. use ask-evo
```

---

# 10. Verification strategy

## Per Ticket

最窄 unit/integration validation。

## Per Milestone

- relevant tests；
- relevant E4xx；
- CLI smoke where affected；
- `evo-commit` checkpoint。

## Before Review

- `pnpm run typecheck`
- `pnpm run test`
- `pnpm run build`
- `pnpm run smoke:cli`
- `pnpm run validate:skills`
- `pnpm run check:schemas`
- `pnpm run eval:phase2`
- `pnpm run eval:phase3`
- `pnpm run eval:cross-agent`
- `pnpm run smoke:package`

## Behavioral

- fixed revision real harness sequence；
- results persisted but not ordinary CI gate；
- every unexecuted runtime boundary remains UNVERIFIED。

---

# 11. Stop conditions

Stop and return to Human Decision if：

- universal installer cannot reliably distribute to required Harnesses and a custom installer would materially expand scope；
- a Harness requires copying Repository Authority instead of thin linking/reference；
- canonical Skill must fork to preserve behavior；
- supporting a client requires implementing a generic Agent Runtime；
- cross-agent eval requires sharing previous chat to pass；
- same checkout parallel mutation appears necessary；
- v0.3 state/evidence schema must be broken without migration；
- behavior can only pass using fixture-specific hidden instructions。

---

# 12. Rollback

- M4.1 Skill validation changes independently revertible；
- CLAUDE bridge creation only creates missing file and is easy to delete；
- `evo agents` commands are additive；
- manifest is disposable；
- behavioral eval is isolated from product Repository；
- v0.3 lifecycle remains usable even if all v0.4 compatibility commands are disabled。

---

# 13. Definition of Done

v0.4 可以 Finish 只有当：

1. canonical EVO Skills 只有一份 source，并全部通过 cross-harness validation；
2. `AGENTS.md` 是唯一 Repository standing-rule authority；Claude bridge 不复制 rules；
3. `evo agents inspect/setup/doctor` 在 fixture 和 packaged CLI 中可用且默认安全；
4. duplicate Skill / version drift / broken bridge 可以 deterministic 检测；
5. universal distribution 至少在 Codex、Claude Code、OpenCode 上有可复查证据；
6. `ask-evo` 在相同 Repository State 下跨 Harness 推荐相同 next Skill；
7. 真实 Codex -> Claude -> OpenCode -> Fresh Agent 产品代码连续开发通过 independent evaluator；
8. handoff 不使用旧 Chat，只使用 Repository、EVO State、Skills、Git chronology；
9. single-checkout single-writer boundary 被实现/文档/测试一致表达；
10. Node 22/24 CI、v0.3 regressions、E401-E410、package black-box 全 PASS；
11. behavioral trace 已作为 durable artifact 保存，limitations 不被伪装成 PASS；
12. Human Acceptance 后通过 `evo-finish` 收敛，再由 `evo-commit` 做 final delivery。

## Implementation order

`M4.1 Canonical Skills -> M4.2 Repository Compatibility -> M4.3 Setup/Doctor -> M4.4 Distribution -> M4.5 Cross-Agent Continuity -> Review -> Human Acceptance -> Finish -> Delivery`

这个顺序是强约束：先稳定标准和 Authority，再写兼容工具，最后才用真实 Agent 证明接力能力。
