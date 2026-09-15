# 安装指南

## 前置条件

- Node.js 22 或更高版本。
- npm（随 Node.js 提供）。

v0.4.2 使用 GitHub Release 分发 CLI，不要求用户 clone、安装 pnpm 或构建 TypeScript 源码。

## 安装最新版本

```sh
npm install -g https://github.com/liebaor/evoworkflow/releases/latest/download/evoworkflow-cli.tgz
evo --version
evo --help
```

然后安装机器级 Skills：

```sh
evo skills install --apply
evo skills doctor
```

CLI 和 Skills 是两个独立职责：CLI 提供 `evo` 命令；Skills 提供 Coding Agent 读取的工作流指令。更新 CLI 不会自动删除项目 `.evo/` 或机器级 `~/.agents/skills`。

## 安装精确版本

把版本号替换为目标 Release，例如：

```sh
npm install -g https://github.com/liebaor/evoworkflow/releases/download/v0.4.2/evoworkflow-cli-0.4.2.tgz
evo --version
```

精确版本 URL 使用对应 Release 的 versioned asset；不要从 `main` 重新构建同名版本。

## 更新

```sh
npm install -g https://github.com/liebaor/evoworkflow/releases/latest/download/evoworkflow-cli.tgz
evo --version
evo skills update
evo skills update --apply
evo skills doctor
```

## 回滚

安装目标版本的精确 asset：

```sh
npm install -g https://github.com/liebaor/evoworkflow/releases/download/v0.4.2/evoworkflow-cli-0.4.2.tgz
evo --version
```

CLI 回滚不会回滚项目 `.evo/` 状态，也不会自动回滚已安装的 Skills；如需同步 Skills，应按目标版本重新执行 `evo skills update --apply` 并检查 Doctor 结果。

## 卸载

```sh
npm uninstall -g @evoworkflow/cli
```

卸载 CLI 不会删除 `~/.agents/skills`、项目 `.evo/` 或项目中的 `AGENTS.md`。

## 校验 checksum

每个 GitHub Release 都包含 `SHA256SUMS.txt`。下载 versioned asset 和 checksum 文件后，在 Unix-like 环境中执行：

```sh
sha256sum -c SHA256SUMS.txt
```

Windows PowerShell 可执行：

```powershell
Get-FileHash .\evoworkflow-cli-0.4.2.tgz -Algorithm SHA256
Get-Content .\SHA256SUMS.txt
```

只有 hash 与 Release 提供的值一致时才继续安装。

## CLI 缺失时

CLI-dependent Skill 如果无法运行 `evo --version`，必须报告 `EVO_CLI_REQUIRED` 并停止。唯一的官方 bootstrap 命令是：

```sh
npm install -g https://github.com/liebaor/evoworkflow/releases/latest/download/evoworkflow-cli.tgz
```

不要在业务仓库中 clone 或构建 EVO 源码作为替代安装方式。
