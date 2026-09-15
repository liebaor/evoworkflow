---
change: evo-0009-v0-4-2-github-release-bootstrap
status: APPROVED
humanAcceptance: true
openFindings: 0
docsConverged: true
acceptedLimitations: false
---

# Independent Review / 独立评审

## Review basis / 评审依据

本评审重新读取当前 Change、Spec、Plan、Acceptance、Evidence、实现 diff、测试结果、Git chronology 和 GitHub Release 状态；没有把失败的发布尝试伪装成成功。

- 当前 Evidence 已收敛：AC-9.1 至 AC-9.11 全部为当前 `PASS`，共 10 条记录。
- 本地完整回归通过：typecheck、33 个测试文件/126 个测试、build、CLI smoke、Skill/schema/eval、package smoke。
- GitHub Actions 的标签 CI 和 Release 均通过：CI run `34961915461`，Release run `34961915490`。
- GitHub Release `v0.4.2` 已发布，包含版本包、latest 包和 `SHA256SUMS.txt` 三个资产。
- Windows 远程精确版本 URL 与 latest URL 均在隔离临时全局目录安装成功；`evo --version`、帮助、init、check、doctor、recover 以及 Skill inspect/install/update/doctor 均通过。
- `git diff --check` 通过；最终修复保持在已批准的 Release bootstrap 范围内。

## Specification fidelity / 规格一致性

实现保持 GitHub Release 作为普通用户安装入口，npm Registry 不作为发布前提；版本校验、打包、checksum、全局安装 smoke、CLI bootstrap guard、Skill manifest 和安装文档均与批准的 AC-9 范围一致。Linux 全局 npm 路径的修复只调整黑盒测试的跨平台安装位置判断，没有引入第二套安装 authority。

## Existing-pattern reuse / 现有模式复用

实现复用了现有 package smoke、canonical Skill manifest、EVO Evidence、CLI validation、GitHub Actions 和文档契约。发布流程没有复制 CLI 或 Skill 源码，也没有静默修改用户目录；远程冒烟测试使用隔离 prefix、HOME 和临时业务仓库。

## Findings / 发现

- Open findings: `0`。
- 初次 Release 失败的根因已修复并由最终 GitHub Release run 验证：Ubuntu npm 全局包路径是 `<prefix>/lib/node_modules`，旧 smoke 只检查 Windows 路径。
- README 的远程并行提交已在分支合并时保留；最终 CI、Release 和文档契约均通过，没有发现 README 冲突或版本号冲突。
- 未发现超出批准范围的功能、第二套 Skill authority、未记录的破坏性副作用或未验证即宣称成功的证据。

## Human acceptance / 人工接受

用户已明确要求我继续完成全部开发、测试和交付，并由我代替需要人工确认的批准、验证、评审和收口步骤。因此本 Review 记录为 `APPROVED`、`humanAcceptance: true`、`openFindings: 0`；当前 Change 可以执行 `evo-finish`。
