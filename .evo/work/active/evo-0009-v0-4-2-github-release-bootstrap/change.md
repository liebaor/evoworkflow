---
id: evo-0009-v0-4-2-github-release-bootstrap
weight: STANDARD
status: AWAITING_APPROVAL
approval: null
---

# evoworkflow v0.4.2 — GitHub Release CLI Distribution & Bootstrap

## Problem / 问题

v0.4.1 已完成 Codex-first Skill Distribution，并建立 `evo skills install/update/doctor`、Codex metadata、Claude adapter 和 native Codex behavioral proof。但真实首次使用暴露出新的 Bootstrap 缺口：

1. `npx skills@latest add liebaor/evoworkflow` 只安装 Skills，不安装 `evo` CLI。
2. Agent 加载 `evo-init` 后会尝试调用 `evo init`；如果本机没有 CLI，就可能回退到 clone 源码、pnpm install、build。
3. 这把普通 EVO 用户错误地带入 EVOworkflow 自身的开发环境，暴露 Corepack、pnpm、TypeScript、Windows cache 等无关复杂度。
4. 当前 package smoke 已证明 `.tgz` 内的 CLI/Skills 可以被干净安装和运行，但还没有正式的 GitHub Release 分发入口，也没有验证真实 `npm install -g <GitHub Release URL>` 路径。
5. CLI 缺失时，Skill 目前缺少统一的 Bootstrap Contract，不能保证所有 Agent 都停止并给出唯一官方安装方式。

因此，v0.4.2 只解决一个问题：

> 普通用户如何无需 clone/build EVO 源码，就能从 GitHub 获得可执行 `evo` CLI，并让 Skills 在 CLI 缺失时采用一致、安全的安装引导。

## Goal / 目标

正式采用：

`GitHub Repository -> Tag -> GitHub Actions -> GitHub Release .tgz -> npm install -g URL -> evo -> evo skills install -> Agent`

目标用户体验：

```sh
npm install -g https://github.com/liebaor/evoworkflow/releases/latest/download/evoworkflow-cli.tgz

evo --version
evo skills install --apply
cd my-project
evo init --root . --apply
```

普通用户不再需要：

- `git clone evoworkflow`
- `pnpm install`
- `pnpm build`
- TypeScript / tsc
- Corepack / pnpm troubleshooting

## Product decisions / 产品决策

### D1 — GitHub is the distribution authority

本版本不发布 npm Registry，不创建 npm Organization，不使用 GitHub Packages。GitHub Repository 是源码 Authority，GitHub Release 是 CLI Distribution Authority。

### D2 — Keep `private: true`

继续保留 `package.json` 的 `private: true`，防止误执行 `npm publish`。GitHub Release 使用 `pnpm pack` / `npm pack` 生成可安装 `.tgz`，不依赖 npm Registry。

### D3 — Release artifact is prebuilt

用户安装的是已经构建好的 `.tgz`，不是源码 checkout。Release artifact 必须包含 `dist/`、`templates/`、`skills/`，并通过真实全局安装黑盒验证。

### D4 — One official bootstrap path

CLI 缺失时，所有 CLI-dependent Skill 必须报告 `EVO_CLI_REQUIRED`，展示 GitHub Release 安装命令，然后停止。禁止自动 clone/build EVOworkflow 自身。

### D5 — Existing v0.4.1 Skill distribution is reused

v0.4.2 不重新设计 Skill Distribution。CLI 安装后继续使用 v0.4.1 已完成的：

- `evo skills inspect`
- `evo skills install`
- `evo skills update`
- `evo skills doctor`

## Scope / 范围

### M1 — Release Contract

- Tag `vX.Y.Z` 必须与 `package.json.version` 一致。
- 生成 versioned artifact：`evoworkflow-cli-X.Y.Z.tgz`。
- 同时生成 stable artifact：`evoworkflow-cli.tgz`，供 `/releases/latest/download/...` 使用。
- 生成 `SHA256SUMS.txt`。

### M2 — Global Install Proof

在隔离环境验证：

- `npm install -g <tgz>`
- `evo --version`
- `evo --help`
- `evo init` preview/apply
- `evo check`
- `evo doctor`
- `evo recover`

至少覆盖 Ubuntu + Windows 的真实全局安装路径。

### M3 — GitHub Release Automation

新增 `.github/workflows/release.yml`：

`tag -> version check -> pnpm check -> pack -> checksum -> global-install smoke -> create release -> upload artifacts`

普通 CI 保持 `contents: read`；Release workflow 单独使用 `contents: write`。

### M4 — Bootstrap Guard

所有会调用 `evo` CLI 的 Skill 在 CLI 不可用时：

`EVO_CLI_REQUIRED -> show official GitHub Release install -> STOP`

不得：

- 搜索并猜测安装方式；
- clone EVO repository；
- 安装 pnpm；
- build EVO source。

### M5 — Documentation & Post-release Verification

README 的 Quick Start 改为：

1. Install EVO CLI from GitHub Release
2. `evo skills install --apply`
3. `evo init`
4. Start Codex / use `ask-evo`

源码开发方式移动到 Development。

正式 Release 后必须重新从真实 exact URL 和 `latest` URL 安装并验证。

## Acceptance / 验收标准

- **AC-9.1 GitHub Distribution**：CLI 可从 GitHub Release `.tgz` 全局安装，不需要 clone/build 源码。
- **AC-9.2 Version Contract**：Git tag 与 package version 不一致时 Release 必须失败。
- **AC-9.3 Release Contents**：artifact 包含正式 CLI entry、templates、canonical Skills/manifest，无 vendor-specific duplicate source。
- **AC-9.4 Global Install Linux**：Ubuntu clean install 后 `evo --version/help/init/check/doctor/recover` PASS。
- **AC-9.5 Global Install Windows**：Windows clean install 后相同用户路径 PASS。
- **AC-9.6 Exact URL**：`/releases/download/vX.Y.Z/...` 真实安装 PASS。
- **AC-9.7 Latest URL**：`/releases/latest/download/evoworkflow-cli.tgz` 真实安装 PASS。
- **AC-9.8 Bootstrap Guard**：CLI 缺失时 Skill 给出唯一官方安装命令并停止，不 clone/build source。
- **AC-9.9 v0.4.1 Reuse**：安装 CLI 后，现有 `evo skills install/update/doctor` 可继续使用，无第二套 Skill installer。
- **AC-9.10 Documentation**：README 默认路径面向普通用户；pnpm/source build 只出现在 Development。
- **AC-9.11 Regression**：Node 22/24、现有 Phase2/3/v0.4/v0.4.1 regressions、package smoke 全部 PASS。

## Non-goals / 非目标

- 不发布 npm Registry。
- 不使用 GitHub Packages npm registry。
- 不做 Homebrew / Winget / Chocolatey / apt / deb / rpm。
- 不做 exe/msi GUI installer。
- 不提供 `curl | sh` / `irm | iex` 作为官方主路径。
- 不重写 v0.4.1 Skill Distribution。
- 不改变 `.evo/` 项目状态模型。
- 不做后台自动升级 daemon。

## Definition of Done / 完成定义

v0.4.2 完成时必须证明：

1. GitHub Release Workflow 可重复生成正式 CLI artifact；
2. tag/version contract 机械检查；
3. versioned + latest-friendly tgz + SHA256 均存在；
4. Ubuntu / Windows 全局安装黑盒 PASS；
5. `evo` 命令直接出现在用户 PATH；
6. `evo init/check/doctor/recover` 从已安装 artifact 正常运行；
7. CLI 缺失 Skill 统一停止并提示 GitHub Release 安装方式；
8. 不再出现业务项目 Agent 自动 clone/build EVO 源码的推荐路径；
9. README Quick Start 完成；
10. 真实 Release exact/latest URL post-release verification PASS；
11. 原有 CI / package smoke / Skill distribution regressions 全部 PASS；
12. Independent Review、Human Acceptance、Finish、Git Delivery 完整闭环。
