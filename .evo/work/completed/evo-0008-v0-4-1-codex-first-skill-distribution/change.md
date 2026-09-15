---
id: evo-0008-v0-4-1-codex-first-skill-distribution
weight: STANDARD
status: APPROVED
approval:
  approvedAt: 2026-09-15T05:49:04.165Z
  approvedBy: human
  fingerprint: ef5c4c4782869884e3a7ac559e8eb9cb93cee35fa16bd869759f5ec823c43a7e
  source: user-authorized continuation
---

# evoworkflow v0.4.1 — Codex-first Skill Distribution & Shared Agent Installation

## Problem / 问题

v0.4 已完成跨 Agent Repository Protocol 的主体能力，并证明 Codex、Claude Code、OpenCode 可以在同一 Repository 上顺序接力开发。但是严格验收暴露出 Skill 分发层仍有最后一公里问题：

1. EVO 当前把 Skill authoring source、runtime installation source 和 Harness discovery 混在一起，容易把 `evoworkflow/skills/` 误认为 Agent 的原生 runtime source。
2. 现有 Agent discovery matrix 需要持续跟踪 Codex、Claude Code、OpenCode 的目录规则，重复了 installer / Harness 自己维护的生态知识，并容易产生 false positive。
3. v0.4 package smoke 已证明一份 canonical Skills 可以被打包，但尚未把“一份 Skill 如何稳定同时给三个 Harness 使用”固化为产品级安装方案。
4. EVO 已明确以 Codex 为默认方案，因此不能为了完全对称而放弃 Codex 原生体验；同时又不能让 Claude/OpenCode 各自形成第二份 Skill Authority。
5. 物理复制三份 Skill 会产生版本漂移；但完全依赖外部 installer 又不足以满足 Codex-first 的一等体验和可验证性。
6. Skill 安装属于机器环境事实，不应污染项目 `.evo/state.yml`；项目工程状态仍应由三个 Agent 共用同一份 `.evo/`。

## Goal / 目标

建立一套 Codex-first、单一物理 Skill Source、可跨 Harness 共享的安装模型：

`One Canonical EVO Skill Installation -> Codex Native + OpenCode Native + Claude Symlink -> Shared AGENTS.md + Shared .evo/ + Git`

最终目标：

> Skill 只有一份，项目工程状态也只有一份。Agent 可以切换，但 EVO Skill Behavior、Repository Truth 和 Lifecycle State 不发生分叉。

## Product position / 产品定位

正式采用：

> **Codex-first, harness-portable Repository-centered Engineering Control Layer.**

- Codex：First-class / Default / Native。
- OpenCode：Compatible / direct shared Skill source。
- Claude Code：Compatible / thin Skill adapter。
- Repository Protocol：仍保持 Harness-neutral。

Codex 是默认执行 Harness，但以下内容不能绑定 Codex：

- `AGENTS.md`
- `.evo/`
- Change / Plan / Decision
- Evidence / Gate / Recovery
- Git chronology

## Architectural decisions / 架构决策

### D1 — One Skill, One Owner

一个 EVO Skill 只能有一个 canonical physical source。长期禁止维护三个独立副本：

- `~/.agents/skills/evo-*`
- `~/.claude/skills/evo-*`
- `~/.opencode/skills/evo-*`

### D2 — Canonical runtime root

EVO 通用 Skill 的 canonical runtime installation 默认使用：

`~/.agents/skills/`

理由：

- Codex 是 EVO 默认 Harness，应获得原生体验；
- OpenCode 可以直接复用 `.agents/skills`；
- Claude Code 通过自己的原生 Skill root 建立 symlink 指向 canonical source；
- 一次更新即可让三个 Harness看到同一物理内容。

### D3 — Link > Copy

Claude Code 默认使用：

`~/.claude/skills/evo-* -> ~/.agents/skills/evo-*`

只有 symlink / junction 无法安全创建时才允许 COPY fallback。COPY fallback 必须被 Doctor 识别并参与 hash drift 校验。

### D4 — Skill installation != Repository state

- EVO Skills：机器级产品能力，默认位于 `~/.agents/skills/`。
- Repository Rules：项目级事实，位于 `AGENTS.md`。
- Repository State：项目级工程状态，位于 `.evo/`。

禁止把通用 EVO Skills 放到 `.evo/skills/`。

### D5 — Installation state is derived

Agent executable、Skill path、symlink/copy mode、版本/hash 等均属于 runtime observation，不写入 `.evo/state.yml`。

### D6 — Verify actual world

安装动作成功不等于 Harness 可用。EVO 必须用 deterministic doctor 和 real-harness smoke/eval 验证：

- Codex 原生发现；
- OpenCode共享发现；
- Claude link/copy 可见；
- `ask-evo -> target Skill -> Repository work` 链路真实成立。

## Scope / 范围

### M4.1.1 — Canonical global installation

新增 `evo skills` CLI topic：

- `evo skills inspect`
- `evo skills install`
- `evo skills update`
- `evo skills doctor`

安装默认 preview；只有 `--apply` 才允许写入。

### M4.1.2 — Codex native support

- `~/.agents/skills` 为默认 canonical runtime root。
- 核心 EVO Skills 可按需要包含 `agents/openai.yaml`，用于 Codex UI / invocation policy。
- `SKILL.md` 仍是跨 Harness canonical behavior source。
- Codex 是默认 Goal/Execution Backend；其他 Adapter 需显式选择。

### M4.1.3 — OpenCode direct reuse

OpenCode直接复用相同 `~/.agents/skills`，不创建 EVO-specific `.opencode/skills` 副本。

### M4.1.4 — Claude Code thin adapter

Claude Code通过 `~/.claude/skills` 中的 symlink/junction 指向 canonical EVO Skills。

- 已存在正确 link：NOOP/PASS。
- 已存在错误 link：报告 `WRONG_SYMLINK`。
- 已存在真实目录：报告 `CLAUDE_SKILL_CONFLICT`，不得静默覆盖或删除。
- symlink 不可用时允许显式 COPY fallback，并纳入 hash drift 检查。

项目级 `CLAUDE.md -> @AGENTS.md` bridge 继续由 `evo agents setup` 管理，不与 `evo skills` 混淆。

### M4.1.5 — Safe update and drift detection

升级 EVO 时只更新 canonical installation。Claude symlink consumer 自动看到新内容；COPY fallback 需要同步并检查 hash。

本次必须处理：

- local modification detection；
- old EVO version；
- wrong symlink；
- broken symlink；
- copy drift；
- duplicate/legacy source warning；
- no silent overwrite。

### M4.1.6 — Native behavioral proof

新增真实 Codex-first behavioral eval：

`clean HOME -> evo skills install --apply -> start Codex -> discover ask-evo -> route -> load target Skill -> read AGENTS/.evo -> bounded work -> independent verification`

同时保留较轻量的 Claude/OpenCode compatibility field checks。

## CLI responsibility boundary / CLI 职责边界

### `evo agents`

继续负责：

- Harness executable / repository compatibility；
- `AGENTS.md` / `CLAUDE.md` bridge；
- single-writer risk；
- client availability。

### `evo skills`

只负责：

- EVO Skill distribution；
- canonical install；
- symlink/copy adapter；
- Skill hash/version/metadata；
- Skill visibility / drift diagnostics。

禁止把两者合成一个巨大 Doctor。

## Safety / 安全边界

1. 所有 install/update 默认 preview。
2. `--apply` 才允许写入机器级 Skill 目录。
3. 现有真实目录/用户修改不得静默覆盖。
4. 不自动删除 legacy Skill source。
5. 不修改 `.evo/state.yml` 记录本机安装事实。
6. `evo init` 不负责全局 Skill 安装。
7. Finish / Commit / Push 仍受现有 human authority 与 CLI side-effect guard 控制。

## Acceptance / 验收标准

- **AC-8.1 One Canonical Installation**：EVO 通用 Skills 在用户机器只有一个 canonical physical installation，默认 `~/.agents/skills`。
- **AC-8.2 Codex Native**：Codex 无需 vendor-specific duplicate copy 即可原生发现并运行 EVO Skills。
- **AC-8.3 OpenCode Shared**：OpenCode直接复用同一 canonical installation，不需要 EVO-specific duplicate copy。
- **AC-8.4 Claude Shared**：Claude通过 symlink/junction 读取同一 canonical Skill；无法安全 link 时允许受控 COPY fallback。
- **AC-8.5 No Silent Overwrite**：已有用户 Skill、自定义内容、真实目录或冲突 link 不被静默覆盖/删除。
- **AC-8.6 Safe Update**：升级只更新 canonical source；symlink consumer自动一致；COPY fallback同步后必须 hash 一致。
- **AC-8.7 Drift Detection**：wrong/broken link、copy drift、version drift、legacy duplicate 能被 Doctor 识别。
- **AC-8.8 Codex Metadata**：需要 Codex native metadata 的核心 Skill 拥有合法 `agents/openai.yaml`，并明确 human/model invocation policy。
- **AC-8.9 Repository Independence**：Skill install/update 不把机器环境事实写入 `.evo/state.yml`；三个 Agent仍共享同一项目 `.evo/`。
- **AC-8.10 Native Behavioral Proof**：真实 Codex 完成 `discover ask-evo -> route -> load target Skill -> bounded Repository work`；Claude/OpenCode至少完成 shared-source compatibility smoke。
- **AC-8.11 CI / Distribution Quality**：Node 22/24、现有 Phase2/3/v0.4 regressions、CLI/package smoke 和新增 Skill-install eval 全部 PASS。

## Non-goals / 非目标

- 不维护三份 EVO Skill physical copy。
- 不创建 `.evo/skills`。
- 不自研通用 Agent marketplace/package-manager ecosystem。
- 不做后台自动更新 daemon。
- 不在本 Change 中发布 Claude Plugin / Codex Plugin marketplace package。
- 不做 project-local custom Skill linking helper。
- 不做 multi-agent scheduler / concurrent writer coordination。
- 不改变现有 Change/Decision/Evidence/Finish 生命周期。

## Migration / 迁移边界

如果用户已有：

- `~/.claude/skills/evo-*`
- `~/.codex/skills/evo-*`
- `.opencode/skills/evo-*`
- 其他历史 EVO Skill copy

`evo skills inspect` 只能报告和生成 migration guidance；v0.4.1 不自动删除旧目录。

迁移顺序：

1. 安装 canonical `~/.agents/skills`；
2. 验证 hash/visibility；
3. Claude 安全替换为 symlink（仅无冲突时）；
4. legacy source 由人工清理；
5. Doctor确认无 drift/duplicate。

## Definition of Done / 完成定义

v0.4.1 完成时必须证明：

1. `~/.agents/skills` 是 EVO 通用 Skill 唯一 canonical runtime installation；
2. Codex 原生使用；
3. OpenCode直接复用；
4. Claude通过 symlink/junction 复用，COPY fallback安全；
5. 安装/更新默认 preview，用户内容不被静默覆盖；
6. update 只需更新 canonical source；
7. Doctor 能发现 link/copy/version drift；
8. Codex native metadata 合法；
9. `.evo/` 不包含通用 Skills，也不记录本机安装事实；
10. 同一项目的 Codex/Claude/OpenCode继续读取同一 `AGENTS.md + .evo/ + Git`；
11. 真实 Codex native Skill discovery/routing/work behavioral eval PASS；
12. Claude/OpenCode shared-source compatibility PASS；
13. Node 22/24 CI、package smoke、regressions PASS；
14. Independent Review、Human Acceptance、Finish、Final Delivery 完整闭环。

## Open decisions / 未决 Decision

- `agents/openai.yaml` 的具体 human/model invocation 分类在实现前必须逐 Skill审计；不得机械复制 Matt 的分类。
- Windows 如果 symlink/junction 与权限策略存在不可可靠解决的差异，应优先使用明确 COPY fallback + drift check，而不是增加平台专属常驻服务。
- 如果 Codex 的原生 Skill packaging/plugin 能在当前版本显著优于 global `.agents/skills`，必须通过独立 Decision 比较，不在本 Change 中无声改变 canonical installation contract。
