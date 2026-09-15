# GitHub Release 分发说明

## Authority

v0.4.2 的分发权威是 GitHub Release，而不是 npm Registry：

```text
GitHub Repository       = Source Authority
GitHub Release          = CLI Distribution Authority
Release asset           = Installable package authority
skills/manifest.json    = Bundled Skill inventory
~/.agents/skills         = Machine runtime Skill authority
```

package 保持 `private: true`，因此 v0.4.2 不执行 `npm publish`，也不需要 npm token。

## Release assets

每个版本 Release 至少包含：

- `evoworkflow-cli-X.Y.Z.tgz`
- `evoworkflow-cli.tgz`
- `SHA256SUMS.txt`

versioned 和 stable asset 必须来自同一次打包，内容 hash 必须相同。打包前检查 `vX.Y.Z` tag 与 `package.json.version` 精确一致，并确认 package 仍为 private。

## Workflow

`.github/workflows/release.yml` 只响应 `v*` tag，并按以下顺序执行：

```text
tag
  -> checkout
  -> tag/package version check
  -> frozen dependency install
  -> full repository check
  -> package + checksum
  -> global-install smoke
  -> GitHub Release + assets
```

任何 check、pack 或 install smoke 失败，工作流都不会创建 Release。普通 CI 保持 `contents: read`；Release job 仅使用 `contents: write` 创建 Release，不发布 npm。

## Release notes

Release notes 至少说明 Highlights、Install、Upgrade、Rollback、Verification 和 Known Limitations。普通用户安装入口为：

```sh
npm install -g https://github.com/liebaor/evoworkflow/releases/latest/download/evoworkflow-cli.tgz
```

## 回滚

回滚通过安装历史 Release 的 versioned asset 完成：

```sh
npm install -g https://github.com/liebaor/evoworkflow/releases/download/v0.4.2/evoworkflow-cli-0.4.2.tgz
```

不要移动、覆盖或从当前 `main` 重建历史版本资产。回滚前后都应执行 `evo --version`、`evo --help` 和 `evo skills doctor`。

## 发布后验证

在 Release 实际可访问后，分别验证 exact URL 和 latest URL：

```sh
npm install -g https://github.com/liebaor/evoworkflow/releases/download/v0.4.2/evoworkflow-cli-0.4.2.tgz
evo --version
evo --help
evo skills doctor

npm install -g https://github.com/liebaor/evoworkflow/releases/latest/download/evoworkflow-cli.tgz
evo --version
evo --help
evo skills doctor
```

这两条真实网络路径分别形成 E409 Exact Release URL 和 E410 Latest Release URL Evidence；本地 `.tgz` smoke 不能替代它们。
