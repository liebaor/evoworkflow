---
id: evo-0007-v0-4-cross-agent-portability
weight: LARGE
status: AWAITING_APPROVAL
approval: null
---

# evoworkflow v0.4 — Cross-Agent Portability

## Problem / 问题

v0.3 已经完成 Repository Grounding、Resolved Constraints、Freshness、Gates、Bounded Goal、Acceptance、Recovery、Finish 与 Git Delivery 的工程闭环，并证明真实开发连续性可以由 Repository 而不是 Chat 保存。

下一步问题不再是“EVO 会不会管理一个 Agent”，而是：同一套 EVO Engineering Protocol 能否可靠运行在 Codex、Claude Code、OpenCode 等不同 Coding Agent Harness 上，并在切换 Agent、模型和 Session 后保持同一个项目的工程语言与生命周期状态。

当前主要缺口：

1. Skills 虽然已经采用 `SKILL.md` 形式，但尚未完成一次面向 Codex、Claude Code、OpenCode 的统一兼容审计和分发验证。
2. Repository Standing Rules 的 canonical authority 是 `AGENTS.md`，但 Claude Code 需要薄 `CLAUDE.md -> @AGENTS.md` bridge；必须避免复制规则形成第二 Authority。
3. 用户需要可重复的 Agent setup/doctor，而不是手工记忆三套 discovery/config 规则。
4. OpenCode/Claude 等可能从多个目录发现同名 Skill，存在 duplicate skill 和 version drift 风险。
5. `ask-evo` 需要正式成为跨 Harness 的 Universal Router，让用户不必记住全部 EVO Skills。
6. v0.3 已证明 fresh-session continuity，但尚未证明真实产品开发能在 Codex -> Claude Code -> OpenCode 之间无聊天记录接力，并保持 Repository consistency。
7. v0.4 必须明确支持“跨 Agent 接力”，但不误称支持“同一 checkout 多 Agent 并发写入”。

## Goal / 目标

把 evoworkflow 从 Repository-centered Engineering Control Layer 升级为 Harness-independent Repository-centered Engineering Control Layer。

核心公式：

`One Repository Truth + One EVO Protocol + One Skill Set + Thin Harness Adapters + Cross-Agent Recovery + Cross-Agent Behavioral Evidence`

最终目标：

> 换 Agent、换模型、换 Session，但不换工程体系。

## Architectural decisions / 架构决策

### One Core + One Skills Set + Thin Agent Adapters

- Repository Rules 唯一事实源：`AGENTS.md`。
- Engineering State 唯一事实源：`.evo/`。
- Skill 唯一事实源：`skills/*/SKILL.md`。
- Codex / OpenCode 直接消费 `AGENTS.md`。
- Claude Code 通过薄 `CLAUDE.md` bridge 引用 `@AGENTS.md`；不得复制 Standing Rules。
- Agent Adapter 只解决 instruction discovery、skill discovery、invocation differences，不重新实现 EVO workflow。

### New principles / 新增原则

1. **One Skill -> Many Harnesses** — 同一个 Skill 不因 Agent 不同产生 fork。
2. **Repository State > Agent Memory** — Agent session 可以消失，工程状态必须由 Repository 恢复。
3. **Adapter Must Stay Thin** — adapter 只做兼容，不成为新的 workflow owner。
4. **Agent Identity Is Provenance, Not Authority** — Agent 来源可以记录，但不影响 Acceptance 权重。
5. **Single Checkout -> Single Writer** — v0.4 支持跨 Agent 接力，不支持同一 working tree 并发修改；并行需要独立 branch/worktree。

## Scope / 范围

### M4.1 — Canonical Skill Compatibility

- 审计全部 EVO Skills 是否满足通用 Agent Skills 结构。
- canonical frontmatter 尽量只使用通用字段，避免把核心安全依赖在某个 vendor-specific metadata 上。
- 新增可重建的 Skill Manifest，用于版本/Hash/类别诊断，不成为 Authority。
- 将 `ask-evo` 明确定义为 Universal Agent Router；只路由，不吞并目标 Skill 的执行职责。

### M4.2 — Repository Agent Compatibility

- 建立 runtime-derived Agent discovery，不把已安装 Agent 写入 `.evo/state.yml`。
- Codex：使用 `AGENTS.md` + Skills + `evo` CLI，不新增 `CODEX.md`。
- Claude Code：需要时创建只包含 `@AGENTS.md` 的薄 `CLAUDE.md`；已有文件冲突时只报告，不覆盖。
- OpenCode：使用 `AGENTS.md`，并检测 `.opencode/skills`、`.claude/skills`、`.agents/skills` 或显式 source 中的重复 EVO Skill。

### M4.3 — Setup & Doctor

新增 CLI topic：

- `evo agents inspect` — 只读显示已发现的 clients、instruction bridge、Skill sources、版本和问题。
- `evo agents setup` — 默认 preview；`--apply` 只创建安全、薄的 compatibility adapter。
- `evo agents doctor` — 检查 canonical authority、Skill validity、duplicate skill、version drift、CLI/client availability 与 single-writer 风险。

Client 未安装默认 INFO/WARNING，不是 Repository protocol error。

### M4.4 — Universal Distribution

- 优先复用现有 Agent Skills installer / ecosystem，不在 P0 自研完整 package manager。
- 验证 `npx skills@latest add liebaor/evoworkflow` 或等价 universal-install path 能把同一份 canonical Skills 分发给 Codex、Claude Code、OpenCode。
- 文档明确同一 Harness 不要通过多个 distribution mode 重复安装同一 EVO Skill。
- Claude native plugin 可作为 P1，不阻塞 v0.4。

### M4.5 — Cross-Agent Continuity

建立真实 behavioral eval：

`Codex Feature A -> Claude Requirement Delta -> OpenCode Bug/Regression -> Fresh Agent Feature B`

要求：

- 使用固定 Brownfield revision 和隔离临时副本；
- 每个 Agent 启动 fresh conversation，不传递上一个 Agent Chat；
- handoff 只依赖 Repository、`.evo/`、EVO Skills、Git chronology 和 `evo recover`；
- 真正修改产品源码，而不只是写分析报告；
- 独立 evaluator 检查 expected changed paths、build/test、Evidence freshness 和 Naming/API/Response/Permission/DataScope/Service/Persistence/Frontend/Domain/Testing consistency；
- 结果区分 `DETERMINISTIC_PASS`、`BEHAVIORAL_PASS`、`BEHAVIORAL_FAIL`、`UNVERIFIED`；
- machine-readable trace 持久化为 Repository/Evidence artifact。

## ask-evo / Universal Router

`ask-evo` 的稳定职责：

`Read Repository -> Read EVO State -> Identify Situation -> Recommend ONE next Skill`

典型路由：

- no EVO -> `evo-init`
- requirement ambiguity -> `evo-grill-with-docs`
- large spec needed -> `evo-to-spec`
- implementation planning -> `evo-plan`
- approved slice -> `evo-implement`
- requirement changed -> `evo-change`
- bug -> `evo-bug`
- evidence needed -> `evo-verify`
- fresh/interrupted session -> `evo-recover`
- review ready -> `evo-review`
- accepted -> `evo-finish`
- Git checkpoint/delivery -> `evo-commit`

原则：`ask-evo routes; it does not execute the destination workflow itself.`

## Agent compatibility diagnostics / 诊断边界

### Instruction findings

- `AGENTS_MISSING`
- `CLAUDE_BRIDGE_MISSING`
- `CLAUDE_IMPORT_INVALID`
- `CLAUDE_AUTHORITY_DUPLICATED`

### Skill findings

- `SKILL_MISSING`
- `SKILL_INVALID`
- `SKILL_NAME_MISMATCH`
- `DUPLICATE_AGENT_SKILL`
- `SKILL_VERSION_DRIFT`

### Runtime findings

- `EVO_CLI_NOT_FOUND`
- `CODEX_NOT_FOUND`
- `CLAUDE_NOT_FOUND`
- `OPENCODE_NOT_FOUND`

Missing client 不是 error；canonical skill invalid / incompatible duplicate version 可以是 error。

## Distribution / 分发策略

### P0 — Universal Skills

默认面向多 Agent 用户：

`npx skills@latest add liebaor/evoworkflow`

或 ecosystem 提供的等价 universal installer。

目标是同一 canonical `skills/` 被安装到不同 Harness，而不是维护三份 Skills。

### P1 — Native packaging

- Claude native plugin
- richer installer/update helper

P1 不能改变 canonical Skill authority。

## Concurrency boundary / 并发边界

v0.4 支持：

`Codex -> Claude Code -> OpenCode` 顺序接力。

同一个 checkout 只能有一个执行 writer。其他 Agent 可以只读 Review/Analyze。

真正并行开发必须使用独立 Git branch/worktree。v0.4 不实现 multi-agent scheduler、distributed lock manager 或 automatic merge coordinator。

## Non-goals / 非目标

- 不维护 `skills-codex/`、`skills-claude/`、`skills-opencode/`。
- 不复制 `AGENTS.md` 为三份 Repository Rules。
- 不新增 Agent-specific project memory 作为工程 Authority。
- 不把 installed-agent facts 持久化进 `.evo/state.yml`。
- 不自研通用 Agent Runtime、context compression、tool search、subagent scheduler。
- 不做 multi-agent swarm 或同 checkout 并发 mutation。
- 不做 cloud control plane、central DB、Vector DB/RAG、Web UI。
- 不做 Agent 排名系统。
- 不自动产品/架构/安全 Decision，不自动 Finish/merge/release/deploy。

## Acceptance / 验收标准

- **AC-7.1 Canonical Skills**：所有 EVO Skills 通过跨 Harness compatible validation；Repository 只维护一个 canonical `skills/` source。
- **AC-7.2 One Authority**：Codex/OpenCode 使用 `AGENTS.md`；Claude 仅通过薄 `CLAUDE.md -> @AGENTS.md` bridge；不存在复制的 Standing Rules Authority。
- **AC-7.3 Setup Safety**：`evo agents setup` 默认只读 preview；`--apply` 只创建安全 adapter，不覆盖已有用户配置，冲突必须回到人工处理。
- **AC-7.4 Doctor**：`evo agents doctor` 能检测 invalid/missing skill、duplicate source、version drift、instruction bridge、CLI/client availability，并正确区分 ERROR/WARNING/INFO。
- **AC-7.5 Universal Distribution**：同一版本 canonical EVO Skills 能被 Codex、Claude Code、OpenCode 正确发现，无需维护三套 Skill 内容。
- **AC-7.6 Cross-Agent Recover**：Agent B 不读取 Agent A Chat，也能从 Repository 恢复 objective、state、constraints、evidence、chronology 和 next action。
- **AC-7.7 Cross-Agent Engineering Consistency**：真实 Codex -> Claude -> OpenCode 连续开发后，独立 evaluator 证明目标 Repository engineering language 没有显著 drift，并保留真实 build/test/evidence 边界。
- **AC-7.8 Safe Concurrency Boundary**：Skills、Docs、Doctor 明确 one checkout -> one writer；v0.4 不宣称支持共享 working tree 并发写入。
- **AC-7.9 Router Consistency**：同一 Repository State 下，Codex/Claude/OpenCode 的 `ask-evo` 都路由到同一个 next Skill；自由语言可以不同。
- **AC-7.10 Distribution Quality**：Node 22/24 默认 CI、Phase 2/3 regressions、v0.4 deterministic eval、CLI/package smoke 全部 PASS；真实 cross-agent behavioral eval 单独保存并可复查。

## Existing mechanisms to reuse / 复用

- `AGENTS.md`、`.evo/project.md`、`.evo/state.yml`、Working Context、Resolved Constraints、Freshness、Recovery。
- `ask-evo`、全部现有 `skills/*/SKILL.md`。
- CLI deterministic safety、Doctor、Evidence v2、Git chronology。
- ProcessAgentAdapter / existing AgentAdapter boundary。
- v0.3 real-development continuity harness、packed-artifact smoke、Node 22/24 CI。

## Definition of Done

v0.4 完成时必须证明：

1. same Repository / same `.evo` / same `AGENTS.md` / same canonical Skills 可以被 Codex、Claude Code、OpenCode 使用；
2. Fresh Agent 只依赖 Repository + EVO Skills + `evo recover` 即可继续；
3. Codex implementation -> Claude continuation -> OpenCode bug fix -> fresh follow-up feature 的真实代码路径通过独立验证；
4. 三个 Harness 不产生第二套 EVO state、rules 或 Skills Authority；
5. single-writer boundary 被文档和 Doctor 明确保护；
6. 普通用户不需要理解三套配置细节即可通过 `evo agents inspect/setup/doctor` 完成诊断与适配。

## Open Decisions / 未决 Decision

- v0.4 P0 不自研 Skill installer；如果 universal installer 无法稳定支持三个目标 Harness，再单独提出 Decision，不在实现中悄悄扩 scope。
- Claude native plugin 保持 P1；只有通用分发证据不足时才升级优先级。
- Evidence executor provenance（codex/claude-code/opencode）可在实现成本很低时进入 v0.4，否则保持 P1，不阻塞跨 Agent continuity。
