# evoworkflow

evoworkflow 是一套由人工驱动、AI 辅助执行、仓库持久化知识的软件工程工作流。

```text
人工决定目标与风险 + AI 执行已批准的工作 + 仓库保存知识与状态 + 证据决定是否完成
```

## 命名约定

- 项目名称、产品展示名、仓库目录、npm scope 和 Schema 域名统一为：`evoworkflow`。
- 命令行入口：`evo`；受管理仓库的状态目录：`.evo/`。

## 核心原则

- 人工决定做什么、为什么做、是否批准以及是否接受结果。
- Agent 负责调查真实仓库事实，并只执行已经授权的工作。
- `.evo/` 保存当前项目知识、Decision、活动变更、Goal 检查点和证据。
- `evo status` 只给出一个下一步建议，不会替用户进入下一阶段。
- 没有证据、人工接受或文档收敛时，系统不会自动 Finish、提交、合并、发布或部署。

## Quick Start / 普通用户安装

EVO CLI 从 GitHub Release 分发。普通用户不需要 clone 或构建 evoworkflow 源码。

前置条件：Node.js 22 或更高版本，以及 npm。

```sh
# 1. 安装 EVO CLI
npm install -g https://github.com/liebaor/evoworkflow/releases/latest/download/evoworkflow-cli.tgz

# 2. 安装并检查 EVO Skills
evo skills install --apply
evo skills doctor

# 3. 初始化业务项目
cd /path/to/my-project
evo init --root .
evo init --root . --apply

# 4. 启动你的 Coding Agent，然后使用 ask-evo
codex
```

检查安装结果：

```sh
evo --version
evo --help
```

更新、回滚、卸载和 checksum 校验请参阅[安装指南](docs/installation.md)；Release 运维约定请参阅[GitHub Release 分发说明](docs/distribution/github-release.md)。

## 当前能力

- `evo init`：先报告仓库发现结果，再以不破坏现有文件的方式初始化。
- `evo status`、`evo check`、`evo doctor`：恢复状态、检查协议、报告陈旧知识和锁。
- `evo context`、`evo recover`：分别生成当前任务的路径化 Working Context，以及只读恢复报告。
- `evo constraints`、`evo gate`、`evo admission`：重建任务约束、评估协议/项目门禁，并在满足硬条件后准入 Review。
- `evo approve`：把人工批准绑定到 Change、Specification 或 Plan 的精确内容指纹。
- `evo goal create/approve/run/resume/inspect/cancel`：执行有边界、可恢复、顺序运行的 Goal。
- `evo finish`：生成收敛报告；只有所有门禁通过并且人工接受后，`--apply` 才会归档 Change。
- `evo commit`：默认只预览结构化 Git checkpoint；只有明确 `--apply`、选择路径并获得授权后才创建 commit，`--push` 也必须显式指定。
- `evo evidence run/record/inspect/reconcile`：把命令执行或人工观察写成带 Git 快照的 Evidence v2，并检查验收项精确集合。
- `evo completion inspect/bind-commit`：检查 Finish 交付凭证，并绑定已有 Git 提交；不会自动 commit。
- `evo migrate`：预览或应用 v1 到 v2 的兼容迁移；`evo change-set check/status`：检查多仓库成员和契约哈希。
- 20 个面向结果的 Skill：调查、决策、规划、实现、验证、评审、交付和维护。
- Brownfield 发现：依据真实 checkout，而不是根据常见框架名称猜测项目结构。
- 二期 Grounding：记录技术声明版本、确认/推断状态、仓库区域和可观察运行入口；未确认事实保留为未知。
- 二期 Working Context：按当前 Change、项目地图、参考实现、能力、测试和 Git 状态路由路径与理由，不复制源代码或文档正文。
- 二期 Consistency：报告响应、权限、命名和实际影响范围的候选漂移；它提供评审信号，不替人工做架构决定。
- 二期 Resilience：记录 Requirement Delta、Bug 调查和中断恢复信息，保留批准失效与 `UNVERIFIED` 证据。
- 二期评估：提供 E001-E012 确定性评估，以及只读 RuoYi Feature A/B 和 FastAPI + Ant Design Pro 跨框架检验。
- 三期 Engineering Closure：提供可重建的 Resolved Constraints、freshness、Protocol/Project Gate、Acceptance Trace、Candidate Admission、bounded Goal preflight 和 Git chronology。
- 三期 Engineering Closure：提供 E301-E319 确定性评估、implementation-ahead-of-approval diagnostic、保守的 Project HARD registry，以及从固定 Git revision clean archive 执行的真实代码变更连续性评估；E320 的真实 Agent 行为不作为普通 CI hard gate。
- 三期的最终 verified boundary 是：`F1` 偏差诊断、`F2` Feature → Requirement Delta → Bug/Regression → Fresh Agent 的 Brownfield continuity、`F3` 脱敏 durable trace + Evidence SHA-256、`F4` deterministic Project HARD promotion。RuoYi runtime、数据库、浏览器和宿主环境缺失的 Java 17/frontend build 仍单独标记为 `UNVERIFIED`。
- Greenfield 指导：先比较成熟方案，再决定是否需要自建基础设施。

v0.4.2 继续采用 Codex-first、harness-portable 的 Skill 分发：`skills/*/SKILL.md` 是唯一 authoring source，`~/.agents/skills` 是唯一 canonical runtime installation，OpenCode 直接共享，Claude Code 使用安全 symlink/junction 或明确的 COPY fallback。`AGENTS.md` 仍是唯一的仓库级 standing-rule authority；`evo agents` 负责仓库兼容性，`evo skills` 负责 Skill 安装、更新和漂移诊断。

evoworkflow v0.3 仍不包含多 Agent 并行执行、云控制面板、中央数据库、自动产品或架构决策，也不会自动提交、合并、发布、部署或完成 Change。多仓库 Change Set 只是只读聚合检查；真实人工身份系统仍不在命令行测试范围内，人工批准继续由显式测试协议模拟。

## Development / 开发者模式

以下命令用于开发 evoworkflow 本身，不是普通用户安装方式。需要 Node.js 22 或更高版本，以及 pnpm。

```sh
pnpm install
pnpm run generate:schemas
pnpm run check
```

### 开发时运行 CLI

```sh
pnpm evo --help
pnpm evo init --root /path/to/project
pnpm evo init --root /path/to/project --apply
pnpm evo status --root /path/to/project
pnpm evo check --root /path/to/project
pnpm evo doctor --root /path/to/project
pnpm evo context --root /path/to/project
pnpm evo recover --root /path/to/project
pnpm evo constraints --root /path/to/project <change-id>
pnpm evo constraints --root /path/to/project <change-id> --write
pnpm evo gate --root /path/to/project <change-id> --kind both
pnpm evo admission --root /path/to/project <change-id>
pnpm evo admission --root /path/to/project <change-id> --defer-acceptance AC-F6 --defer-acceptance AC-F8
pnpm evo approve --root /path/to/project <change-id> change
pnpm evo approve --root /path/to/project <change-id> spec
pnpm evo approve --root /path/to/project <change-id> plan
pnpm evo goal create --root /path/to/project <goal-id> --from /path/to/goal.yml
pnpm evo goal approve --root /path/to/project <goal-id>
pnpm evo goal run --root /path/to/project <goal-id>
pnpm evo goal inspect --root /path/to/project <goal-id>
pnpm evo finish --root /path/to/project
pnpm evo finish --root /path/to/project --apply
pnpm evo commit --root /path/to/project <change-id> --checkpoint SLICE --slice S1 --path src/example.ts
pnpm evo commit --root /path/to/project <change-id> --apply --checkpoint SLICE --slice S1 --path src/example.ts
pnpm evo evidence reconcile --root /path/to/project --change <change-id>
pnpm evo evidence record --root /path/to/project --change <completed-change-id> --completed --acceptance AC-08 --kind manual --label "post-finish delivery" --status PASS --summary "Observed the final delivery checkpoint"
pnpm evo migrate --root /path/to/project
pnpm evo migrate --root /path/to/project --apply
pnpm evo completion inspect --root /path/to/project <change-id>
pnpm evo change-set check --root /path/to/project <change-set-id>
```

## Skills 与 Agent 适配

Quick Start 已安装 CLI。接下来安装一份 canonical EVO Skill source：

```sh
evo skills install
evo skills install --apply
evo skills doctor
```

随后进入项目并检查仓库兼容性：

```sh
evo agents inspect --root /path/to/project
evo agents setup --root /path/to/project       # 只预览，不写文件
evo agents setup --root /path/to/project --apply
evo agents doctor --root /path/to/project
```

Codex 原生读取 `~/.agents/skills`；OpenCode 共享该路径；Claude Code 通过 `~/.claude/skills` 适配。`setup --apply` 只会在缺少 `CLAUDE.md` 时安全创建内容为 `@AGENTS.md` 的 thin bridge；已有文件不会被覆盖，冲突必须人工合并。不要同时维护多份物理 Skill；Doctor 会报告重复、版本/hash drift 和 copied authority。一个 checkout 同时只允许一个 executing writer；需要并行时使用独立 branch/worktree。

v0.4 的确定性跨 Agent 回归是 `pnpm run eval:cross-agent`。真实 Codex → Claude Code → OpenCode → Fresh Agent 接力评估是独立的现场评估，可用 `pnpm run eval:cross-agent:behavioral` 运行；它写入脱敏的 Repository trace，但不属于普通 CI hard gate。

v0.4.1 的真实 Codex native Skill 评估可用 `pnpm run eval:codex-native` 运行。它使用 clean HOME、真实 `evo skills install --apply` 和用户级请求；只有独立检查确认 bounded product change、测试、路径边界且没有 commit/Finish 越权时才会记录 `NATIVE_PASS`，否则保留 `UNVERIFIED` 或失败限制。

`evo init` 会报告发现了什么以及准备创建什么。`--apply` 只写入缺失的 EVO 文件，不覆盖项目已有的指令和文档。

Candidate Admission 默认要求所有当前验收项都有 current PASS Evidence。若某些验收项的事实必然在 Admission 之后产生（例如独立 Review、Finish 或 final delivery），必须在命令行逐项使用 `--defer-acceptance` 声明；该列表会写入 `admission.yml`，其他验收项仍不能暂缓或跳过。

`evo context` 默认只读输出当前 Change 的路径化上下文；只有明确使用 `--write` 才会在活动 Change 下写入 `.evo/work/active/<change-id>/context.md`。`evo recover` 始终只读，不会自动恢复 Goal、改变阶段或继续实现。

二期验证命令：

```sh
pnpm run eval:phase2
pnpm run eval:ruoyi -- --backend-root /path/to/backend-archive --backend-revision <40-char-commit> \
  --frontend-root /path/to/frontend-archive --frontend-revision <40-char-commit>
```

三期验证命令：

```sh
pnpm run eval:phase3
pnpm run eval:phase3:continuity -- \
  --backend-root /path/to/ruoyi-backend-git-root \
  --backend-revision <40-char-commit> \
  --frontend-root /path/to/ruoyi-frontend-git-root \
  --frontend-revision <40-char-commit> \
  --output references/experiments/phase3/development-continuity.json \
  --summary references/experiments/phase3/development-continuity.md
pnpm run eval:ruoyi:phase3 -- \
  --backend-root /path/to/ruoyi-backend-git-root --backend-revision <40-char-commit> \
  --frontend-root /path/to/ruoyi-frontend-git-root --frontend-revision <40-char-commit>
pnpm run smoke:package
```

三期 RuoYi 评估会先用 `git archive` 固定指定 revision，再在临时副本中执行初始化、Feature A/B、Delta、Bug、Recovery 和 Feature C 的静态/确定性检查；不会修改输入仓库，也不会把未执行的 runtime、MySQL、浏览器或真实 Agent 结果写成 `PASS`。

`eval:phase3:continuity` 使用固定 revision 的临时 Brownfield 副本，真正运行多个独立 Agent invocation 修改后端和前端源码，验证 Requirement Delta、注入 Bug 的失败回归、修复、`evo recover` 和 Fresh Agent follow-up。结果必须写入脱敏 JSON/Markdown trace；changed-path boundary、cross-feature consistency 和 runtime/build limitations 分开报告。输入 checkout 保持只读。

真实 Agent 行为评估使用固定 revision 的临时组合副本，运行多个全新 Agent invocation 和一个 FastAPI/React 正向场景。Agent 只能写 `.evo/behavioral/` 评估材料；独立 verifier 检查真实源码引用、跨任务引用、Forbidden RuoYi 机制和产品源码完整性。命令需要额外提供 `--backend-root`、`--backend-revision`、`--frontend-root`、`--frontend-revision`，可用 `--output` 保存结构化结果。

规划 Skill 会把文档留在 `AWAITING_APPROVAL`。人工检查精确内容后，再执行 `evo approve <change-id> <change|spec|plan>` 记录批准。之后任何实质编辑都会使旧指纹失效，必须重新审阅和批准。

`goal create` 从明确的 Slice 定义创建 `DRAFT` Goal；人工检查后执行 `goal approve` 和 `goal run`。成功执行只到 `READY_FOR_REVIEW`，不会完成 Change。`finish --apply` 是唯一归档 Change 的命令，并且要求当前证据、评审记录和人工接受都已通过。

## 人工工作流

```text
理解仓库
  -> Grill / 需求澄清
  -> Spec / 大变更规格
  -> Plan / 计划
  -> 人工批准
  -> Implement / 每次一个垂直 Slice
  -> Verify / 验证
  -> Review / 评审
  -> 人工接受
  -> Finish / 收敛并归档
```

Small、Standard、Large 变更需要逐步增强的意图、计划和证据。Skill 永远不会自动串到下一个阶段。

详见[产品规格](docs/product-spec.md)、[工作流协议](docs/workflow-protocol.md)、[仓库协议](docs/repository-protocol.md)、[优化实施说明](docs/evo-hardening-implementation.md)、[Skill 约定](docs/skill-contract.md)、[Skill 中文索引](skills/README.zh-CN.md)、[Goal 协议](docs/goal-protocol.md)和[运行手册](docs/operations.md)。
