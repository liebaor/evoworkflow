# 测试

## 测试层次

- Scanner 测试使用合成 Greenfield/Brownfield 仓库，并包含防误报夹具。
- 初始化测试验证先报告后写入、保留已有文件、Schema 有效性和幂等性。
- 协议测试拒绝重复主权威和悬空活动状态。
- Artifact 测试拒绝在 `AWAITING_APPROVAL` 之前批准，并检测批准后的内容变化。
- Goal 测试使用确定性假 Adapter 和真实子进程验证命令，覆盖持久化 current Slice 投影以及忽略优雅超时的进程。
- Adapter 测试验证 JSON 结果解析，不连接模型。
- CLI 冒烟测试在临时仓库中验证源码和构建后的用户入口。
- S5 场景测试覆盖 Standard 生命周期、Requirement Delta、Bug 回归和中断 Goal 恢复。
- Working Context 测试验证按 Change、能力、参考实现、测试和 Git 路径排序，默认不写入；一致性测试验证响应、权限、命名和实际区域的候选漂移。
- Resilience 测试验证 Delta/Bug 记录只写活动工作、使状态进入 `NEEDS_INFO`，以及 `evo recover` 保留未知项并且不自动继续。
- 三期约束/新鲜度测试覆盖 source priority、HARD/SOFT/REFERENCE/UNKNOWN/CONFLICT、派生指纹、Acceptance Trace、Protocol/Project Gate、Candidate Admission、Goal preflight、READY_FOR_REVIEW 和结构化 Git checkpoint。
- 二期 RuoYi Grounding 和三期 RuoYi clean-revision 评估只读取调用方提供的固定 Git revision；三期会先用 `git archive` 创建清洁临时副本，再检查后端/前端的技术、区域、能力、入口、未知项和 Feature A/B/Delta/Bug/Recovery/C 场景。它不修改输入仓库、不启动 RuoYi、不连接 MySQL、不打开浏览器，也不调用 Agent。
- 三期真实 Agent 行为基线是独立现场评估，不属于普通 `pnpm run check`：它在固定 revision 的临时组合副本中运行多个全新 Codex invocation，要求只写 `.evo/behavioral/` 报告，再用独立进程校验真实 RuoYi 源码引用、Feature A/B/C 连续性、Requirement Delta、Bug 字段、`evo recover` 和源码未被修改。它另外运行 FastAPI + React/Ant Design Pro 正向一致性场景，并将结果保存为 `BEHAVIORAL_PASS`/失败；Agent 自报不直接计为证据。
- 三期 Development Continuity Eval 是另一条真实代码变更证据链：它在固定 backend/frontend revision 的清洁临时组合副本中执行 Session A 初始功能、Requirement Delta、故障注入与回归修复、Fresh Agent follow-up。独立 verifier 检查实际 changed paths、RuoYi 命名/权限/响应/服务/Mapper/XML/API 语言和跨 Session 一致性；`evo recover` 必须从 Repository/EVO/Git 重建下一步。输入 checkout 不可写，trace 只保存脱敏结果。
- 二期 `eval:phase2` 执行 E001-E012：机制漂移、权限并行、命名、Context、复用、影响范围、Bug、恢复、Small 流程、过早抽象、跨框架和实际区域扩张。
- EVO hardening 评估执行 E013-E020：验收项精确集合、重复/额外验收、证据记录引用、证据后的工作树漂移、完成凭证、当前事实目标、v1-to-v2 迁移和多仓库 Change Set。
- 三期评估执行 E301-E319：行为基线、Recovery、Delta/Bug freshness、硬门禁负向回归、Finding→Eval→Rule/Gate 晋升、Acceptance/Admission、Worker 边界、Git chronology、Finish 边界、跨框架和人类 Decision 冲突停止，以及 implementation-ahead、evidence reconciliation、Project HARD registry、durable artifact hash。E320 是成本较高的真实 Development Continuity field eval，不进入普通 CI hard gate。
- RuoYi evaluator 针对 Feature A（Supplier CRUD）、Feature B（Inventory DataScope/pagination/response/export）和 Feature C 在清洁临时副本中检查 `SysUserController`、DataScope、分页/响应、导出、领域语言和跨 Session 引用；FastAPI + Ant Design Pro 使用独立确定性夹具。
- v0.4 跨 Agent 确定性评估执行 E401-E410：canonical Skill/manifest、Claude thin bridge、setup no-overwrite、duplicate/version drift、missing-client non-fatal、universal router、Recovery contract 和 single-writer boundary。它使用注入的 runtime fixture，不调用 coding model。
- v0.4 `smoke:package` 同时检查 clean packed artifact 中的 CLI、`skills/manifest.json`、全部 canonical `SKILL.md` 和 `agents` 命令，确认没有 vendor-specific Skill/authority copies。
- v0.4 真实 continuity 评估是独立现场测试：在临时固定 revision 中启动全新的 Codex、Claude Code、OpenCode 和 Fresh Agent invocation，独立检查实际 product-code changes、changed-path boundary、验证结果、恢复输入和跨任务工程语言；它不把 Agent 自报当作证据，也不作为普通 CI hard gate。

自动化测试不得调用真实 coding model、外部系统、部署或生产写入。此类证据必须单独标注。

## 命令

```sh
pnpm run typecheck
pnpm run test
pnpm run build
pnpm run validate:skills
pnpm run check
pnpm run eval:phase2
pnpm run eval:hardening
pnpm run eval:phase3
pnpm run eval:cross-agent
pnpm run eval:cross-agent:behavioral
pnpm run eval:phase3:continuity -- \
  --backend-root /path/to/ruoyi-backend-git-root \
  --backend-revision <40-char-commit> \
  --frontend-root /path/to/ruoyi-frontend-git-root \
  --frontend-revision <40-char-commit> \
  --output references/experiments/phase3/development-continuity.json \
  --summary references/experiments/phase3/development-continuity.md

# Evidence v2
pnpm evo evidence reconcile --root /path/to/project --change <change-id>
pnpm evo evidence run --root /path/to/project --change <change-id> --acceptance AC-01 --kind integration --label "focused test" -- pnpm test --filter focused
pnpm evo evidence inspect --root /path/to/project --change <change-id>

# Finish handoff and migration
pnpm evo migrate --root /path/to/project
pnpm evo migrate --root /path/to/project --apply
pnpm evo completion inspect --root /path/to/project <change-id>
pnpm evo completion bind-commit --root /path/to/project <change-id>

# 二期只读评估；使用固定输入 checkout。
pnpm run eval:ruoyi -- \
  --backend-root /path/to/ruoyi-backend-archive \
  --backend-revision <40-char-commit> \
  --frontend-root /path/to/ruoyi-vue3-archive \
  --frontend-revision <40-char-commit>

# 三期 RuoYi 现场评估；必须提供两个 Git root 和完整 40 字符 revision。
pnpm run eval:ruoyi:phase3 -- \
  --backend-root /path/to/ruoyi-backend-git-root \
  --backend-revision <40-char-commit> \
  --frontend-root /path/to/ruoyi-frontend-git-root \
  --frontend-revision <40-char-commit>

# 三期真实 Agent 行为基线；成本/稳定性未证明前不作为普通 CI hard gate。
pnpm run eval:ruoyi:phase3:behavioral -- \
  --backend-root /path/to/ruoyi-backend-git-root \
  --backend-revision <40-char-commit> \
  --frontend-root /path/to/ruoyi-frontend-git-root \
  --frontend-revision <40-char-commit> \
  --output /tmp/evoworkflow-phase3-ruoyi-behavioral.json

# 真实打包产物的 clean-install 黑盒。
pnpm run smoke:package
```

`pnpm run check` 是本地聚合检查。CI 在最低支持 Node 主版本和开发 Node 主版本上运行它。

跨 Agent 现场评估会把 machine-readable 结果保存到 `references/experiments/cross-agent/`。如果某个客户端未安装、认证不可用或宿主环境不允许安全执行，结果必须保留为 `UNVERIFIED`/限制说明；不能用本地确定性 fixture 冒充真实 Harness 证据。

Development Continuity 的结果不能把环境限制提升为成功：`BEHAVIORAL_PASS` 只表示真实代码变更、独立 verifier、recovery 和 changed-boundary 目标通过；RuoYi runtime、MySQL/Redis、浏览器，以及因宿主 Java/依赖环境未执行的 backend/frontend build 必须保留为 `UNVERIFIED`。最终 trace 通过 Evidence artifact 记录 SHA-256，篡改后的 artifact 不得继续支持原结论。

## 证据规则

只报告实际执行过的命令。一个聚焦测试通过，只支持它覆盖的行为，不能自动代表整个 MVP。由于源码加载和编译后的 oclif 发现路径不同，CLI 命令发现必须包含构建后冒烟测试。Evidence 记录中的命令、退出码、工作目录、输出摘要和 Git 快照必须能被独立检查；人工观察证据必须明确标为 `manual`，不能伪装成自动执行。
