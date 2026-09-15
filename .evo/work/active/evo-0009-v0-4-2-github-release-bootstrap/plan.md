---
change: evo-0009-v0-4-2-github-release-bootstrap
status: AWAITING_APPROVAL
approval: null
currentTruthTargets:
  - path: .github/workflows/release.yml
    action: CREATE
    reason: Build, verify and publish versioned GitHub Release artifacts from tags.
  - path: scripts/check-release-version.ts
    action: CREATE
    reason: Enforce tag/package version equality before release.
  - path: scripts/release-install-smoke.ts
    action: CREATE
    reason: Verify true global installation and direct evo execution from packed artifact.
  - path: scripts/package-smoke.ts
    action: UPDATE
    reason: Reuse existing packed-artifact checks and align release artifact contract.
  - path: skills/evo-init/SKILL.md
    action: UPDATE
    reason: Add uniform EVO_CLI_REQUIRED bootstrap guard and prohibit source-build fallback.
  - path: skills/ask-evo/SKILL.md
    action: UPDATE
    reason: Route CLI-missing situations to the official bootstrap contract instead of improvising installation.
  - path: scripts/validate-skills.ts
    action: UPDATE
    reason: Enforce consistent CLI bootstrap guidance across CLI-dependent Skills.
  - path: README.md
    action: UPDATE
    reason: Make GitHub Release install the default Quick Start and move source development commands out of user onboarding.
  - path: docs/installation.md
    action: CREATE
    reason: Document installation, update, rollback and verification flows.
  - path: docs/distribution/github-release.md
    action: CREATE
    reason: Record GitHub Release distribution contract and release operations.
  - path: docs/testing.md
    action: UPDATE
    reason: Document global-install and post-release black-box evidence.
  - path: docs/operations.md
    action: UPDATE
    reason: Document release creation, rollback and post-release verification.
---

# Implementation Plan / 实施计划

## 1. Boundary / 边界

v0.4.2 不重新设计 v0.4.1 已完成的 Skill Distribution。

本 Change 只增加一个前置产品能力：

> **普通用户无需 clone/build EVO 源码，即可从 GitHub Release 获得可执行 `evo` CLI，并在 CLI 缺失时获得唯一、安全的 Bootstrap 指引。**

最终 Authority 模型：

```text
GitHub Repository         = Source Authority
GitHub Release            = CLI Distribution Authority
CLI bundled skills/*      = Skill Distribution Source
~/.agents/skills          = Machine Runtime Skill Authority
AGENTS.md                  = Project Standing Rules Authority
.evo/                      = Project Engineering State Authority
Git                        = Durable Engineering History
```

## 2. Existing mechanisms to reuse / 复用

必须复用而不是重写：

- 当前 `package.json` 的 `bin.evo -> dist/index.js`；
- `files: [dist, templates, skills]` 打包边界；
- 现有 `scripts/package-smoke.ts`：已经证明 `.tgz` 可在 clean consumer 中安装并运行 `--help/init/check/context/recover`；
- 当前 Node 22/24 CI；
- v0.4.1 已完成的 `evo skills inspect/install/update/doctor`；
- v0.4.1 Codex/Claude/OpenCode Skill compatibility；
- 当前 Finish / Commit / Evidence 生命周期。

v0.4.2 的核心不是“再做一个 installer”，而是把现有 package 变成正式 Release Artifact，并验证真实用户安装路径。

---

# Execution Slices / 执行切片

## S0 — Release Contract & Artifact

建立版本、Artifact、checksum 和 package contract。

### Tasks

1. 新增 `scripts/check-release-version.ts`。
2. 从 tag 解析 `X.Y.Z`，要求：
   - tag = `vX.Y.Z`
   - `package.json.version = X.Y.Z`
3. 保留 `private: true`，明确 GitHub Release 模式禁止 npm publish。
4. `pnpm pack` 后规范化输出：
   - `evoworkflow-cli-X.Y.Z.tgz`
   - `evoworkflow-cli.tgz`
   - `SHA256SUMS.txt`
5. 扩展 package artifact assertion，确认至少包含：
   - `dist/index.js`
   - CLI commands
   - `templates/`
   - `skills/manifest.json`
   - 全部 canonical `skills/*/SKILL.md`
6. 禁止 vendor-specific physical Skill copies 进入包。

### Verification

- **E401 Release Version Contract**：tag/package version match；mismatch FAIL。
- **E402 Release Pack**：pack 生成 tgz。
- **E403 Release Contents**：required entries 完整且无 duplicate vendor source。
- checksum 可重复生成并对应两个 artifact。

### Stop condition

如果 `.tgz` 无法在不访问源码树的情况下包含 CLI + Skills，则停止并提出 Packaging Decision，不进入 Release Workflow。

---

## S1 — Global Install Smoke

验证真正的用户安装方式，而不是只调用 `dist/index.js`。

### New script

`scripts/release-install-smoke.ts`

### Test algorithm

1. 创建隔离 temporary npm prefix。
2. `npm install -g <local-tgz>`。
3. 将 temporary global bin 放入 PATH。
4. 直接运行：
   - `evo --version`
   - `evo --help`
5. 创建临时业务 Repository。
6. 执行：
   - `evo init --root <repo>`，确认 preview 不写文件；
   - `evo init --root <repo> --apply`；
   - `evo check --root <repo>`；
   - `evo doctor --root <repo>`；
   - `evo recover --root <repo>`。
7. 验证整个运行过程不依赖 EVO source checkout。

### Matrix

P0：

- Ubuntu + Node 22
- Windows + Node 22

现有 CI 继续负责 Node 22 / 24 source/package regressions，不把 Release smoke 扩成过重矩阵。

### Verification

- **E404 Global Install Linux**：PASS。
- **E405 Global Install Windows**：PASS。
- **E406 CLI Version**：installed CLI version = package version。
- **E407 CLI Init**：preview/apply/check/doctor/recover PASS。

---

## S2 — GitHub Release Workflow

新增：`.github/workflows/release.yml`

### Trigger

```yaml
on:
  push:
    tags:
      - 'v*'
```

### Permission

Release workflow：

```yaml
permissions:
  contents: write
```

现有 CI 继续保持：

```yaml
permissions:
  contents: read
```

### Pipeline

```text
Tag vX.Y.Z
   ↓
Checkout
   ↓
check-release-version
   ↓
Node / pnpm setup
   ↓
pnpm install --frozen-lockfile
   ↓
pnpm run check
   ↓
pnpm pack
   ↓
normalize versioned + stable artifact
   ↓
SHA256SUMS
   ↓
release-install-smoke
   ↓
create GitHub Release
   ↓
upload artifacts
```

### Release assets

每个 Release 至少：

- `evoworkflow-cli-X.Y.Z.tgz`
- `evoworkflow-cli.tgz`
- `SHA256SUMS.txt`

### Release Notes

包含：

- Highlights
- Install
- Upgrade
- Rollback
- Verification
- Known Limitations

### Safety

- Release 只能从 tag 触发。
- 任何 test / pack / install smoke 失败，都不能创建 Release。
- 不使用 npm token。
- 不执行 `npm publish`。

---

## S3 — CLI Missing Bootstrap Guard

统一所有 CLI-dependent Skills 的缺失行为。

### Canonical behavior

```text
Skill starts
   ↓
check evo CLI availability
   ↓
FOUND
   → continue normal workflow

MISSING
   → report EVO_CLI_REQUIRED
   → print official GitHub Release install command
   → STOP
```

官方命令：

```sh
npm install -g https://github.com/liebaor/evoworkflow/releases/latest/download/evoworkflow-cli.tgz
```

### Explicit prohibition

CLI 缺失时不得：

- `git clone liebaor/evoworkflow`
- `pnpm install`
- 安装/升级 Corepack
- build TypeScript source
- 在用户业务 Repository 中 vendoring EVO source
- 搜索网页后自行发明替代安装方式

### Skill scope

至少审计：

- `evo-init`
- `ask-evo`
- 任何直接要求调用 `evo` CLI 的 Skill

避免在每个 Skill 重复大段安装说明。优先定义一份稳定 bootstrap wording / validator contract，并通过 validator 保证一致性。

### Verification

- **E408 CLI Missing Guard**：CLI absent fixture 下输出 `EVO_CLI_REQUIRED` + official install，且不会 source-build。
- validator 发现错误或过期 bootstrap command 时 FAIL。

---

## S4 — Documentation & Real Release Proof

### README Quick Start

普通用户首页只展示：

```sh
# 1. Install EVO CLI
npm install -g https://github.com/liebaor/evoworkflow/releases/latest/download/evoworkflow-cli.tgz

# 2. Install EVO Skills
evo skills install --apply
evo skills doctor

# 3. Initialize project
cd my-project
evo init --root .
evo init --root . --apply

# 4. Start Codex
codex
# then use ask-evo
```

### Source development

以下内容移动至 `Development`：

- `pnpm install`
- `pnpm evo ...`
- TypeScript build/test commands

并明确：

> 这些命令用于开发 evoworkflow 本身，不是普通用户安装方式。

### Installation docs

`docs/installation.md` 包含：

- prerequisites：Node.js >=22 + npm；
- latest install；
- exact version install；
- update；
- rollback；
- uninstall；
- checksum verification；
- CLI + Skills 的职责区别。

### Distribution docs

`docs/distribution/github-release.md` 包含：

- artifact authority；
- release workflow；
- version contract；
- release rollback；
- post-release verification；
- why npm Registry is not used in v0.4.2。

### Post-release black-box

完成 Finish / final delivery 并打 `v0.4.2` tag 后，从 GitHub 的真实网络地址进行：

#### Exact URL

```sh
npm install -g https://github.com/liebaor/evoworkflow/releases/download/v0.4.2/evoworkflow-cli-0.4.2.tgz
```

对应：**E409 Exact Release URL**。

#### Latest URL

```sh
npm install -g https://github.com/liebaor/evoworkflow/releases/latest/download/evoworkflow-cli.tgz
```

对应：**E410 Latest Release URL**。

两者均要求：

```sh
evo --version
evo --help
evo skills doctor
```

PASS。

注意：E409/E410 是 post-release Evidence，必须区分“Release 前 local tgz smoke”和“Release 后真实 URL smoke”。

---

# 3. Update & rollback model / 更新与回滚

## Update CLI

```sh
npm install -g https://github.com/liebaor/evoworkflow/releases/latest/download/evoworkflow-cli.tgz
```

然后：

```sh
evo --version
evo skills update
evo skills update --apply
evo skills doctor
```

## Exact rollback

```sh
npm install -g https://github.com/liebaor/evoworkflow/releases/download/v0.4.2/evoworkflow-cli-0.4.2.tgz
```

历史版本必须使用对应 GitHub Release asset；不得从 `main` 重建同名版本。

## Uninstall

```sh
npm uninstall -g @evoworkflow/cli
```

CLI uninstall 不自动删除 `~/.agents/skills` 或项目 `.evo/`，因为这些是不同 Authority / 生命周期。

---

# 4. Findings / Doctor expectations

Release / bootstrap 相关诊断至少包括：

- `EVO_CLI_REQUIRED`
- `RELEASE_VERSION_MISMATCH`
- `RELEASE_ARTIFACT_INVALID`
- `RELEASE_CHECKSUM_MISMATCH`
- `GLOBAL_INSTALL_FAILED`

机器 Skill state 仍由现有 `evo skills doctor` 负责，不复制到新的 Release Doctor。

---

# 5. P0 / P1

## P0 — v0.4.2 必须完成

- GitHub Release distribution；
- tag/version contract；
- versioned + latest artifact；
- SHA256；
- Linux/Windows global install smoke；
- CLI missing bootstrap guard；
- README Quick Start；
- update / rollback docs；
- E401-E410；
- existing v0.4.1 Skill Distribution regression；
- real exact/latest URL post-release proof。

## P1 — 后续再考虑

- PowerShell / shell one-line installer；
- GitHub Packages；
- npm Registry；
- Homebrew；
- Winget；
- Chocolatey；
- self-update command；
- binary bundling without Node runtime。

---

# 6. Security / 安全

1. 不把 `curl | sh` / `irm | iex` 作为默认安装入口。
2. Release artifact 必须来自已验证 tag。
3. 保留 checksum。
4. 发布前必须执行现有 full check + global install smoke。
5. Release workflow 仅对 `contents` 申请写权限，不扩展其他 token 权限。
6. CLI-dependent Skill 不得通过网络脚本自动修改用户系统。
7. 安装/升级和项目初始化保持两个独立步骤。

---

# 7. Definition of Done

v0.4.2 只有在以下事实均成立时才允许 Finish：

1. `private: true` 保留且没有 npm publish path。
2. Tag / package version mechanically match。
3. `evoworkflow-cli-X.Y.Z.tgz` 可重建。
4. `evoworkflow-cli.tgz` 与 versioned artifact 内容一致。
5. SHA256SUMS 正确。
6. Packed artifact 仍含一份 canonical Skills。
7. Ubuntu global-install smoke PASS。
8. Windows global-install smoke PASS。
9. `evo --version/help` 从 installed global bin 运行，而不是源码路径。
10. `evo init` preview 不写入。
11. `evo init --apply/check/doctor/recover` 从 installed package PASS。
12. Release workflow 只在 tag 上发布。
13. CI 普通 job 仍是 read-only permission。
14. CLI 缺失时 Skill 报 `EVO_CLI_REQUIRED`。
15. CLI 缺失时没有 clone/build fallback。
16. README Quick Start 采用 GitHub Release 安装。
17. `evo skills install/update/doctor` 继续复用 v0.4.1 实现。
18. Exact Release URL install PASS。
19. Latest Release URL install PASS。
20. Node 22/24 和所有现有 deterministic/package regressions PASS。
21. Independent Review PASS。
22. Human Acceptance 完成。
23. Finish / Git Delivery 完成。
24. v0.4.2 GitHub Release 已生成并带 post-release Evidence。

---

# 8. Recommended execution order / 推荐顺序

```text
S0 Release Contract & Artifact
        ↓
S1 Global Install Smoke
        ↓
S2 GitHub Release Workflow
        ↓
S3 CLI Missing Bootstrap Guard
        ↓
S4 Docs + Release Readiness
        ↓
Full regression
        ↓
Independent Review
        ↓
Human Acceptance
        ↓
Finish / Final Delivery
        ↓
tag v0.4.2
        ↓
GitHub Release
        ↓
E409/E410 Post-release Verification
```

Release 后 Evidence 属于正式分发事实，必须保存；不能只把“workflow 运行成功”当成用户可安装的证据。
