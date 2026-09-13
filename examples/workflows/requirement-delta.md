# Requirement Delta / 需求变更示例

## Old / 旧内容

列表只能读取，不能筛选。

## New / 新内容

列表支持一个明确的筛选条件。

## Retain / 保留

认证、分页和现有列表读取行为不变。

## Modify / 修改

原有验收标准增加筛选结果的可观察要求。

## Remove / 移除

没有删除现有验收标准。

## Add / 新增

增加筛选行为的验收标准和聚焦验证命令。

## Impact / 影响

- Acceptance / 验收：更新受影响的验收标准。
- Decisions / 决策：检查是否需要兼容性或数据决策。
- Plan and Slices / 计划与 Slice：重新检查受影响 Slice，并重新批准计划。
- Code and tests / 代码与测试：增加筛选实现和回归测试。
- Documentation / 文档：更新用户说明。
- Data, API, and compatibility / 数据、API 与兼容性：确认没有未经批准的破坏性变化。

改变已批准的 Change、Specification 或 Plan 后，旧指纹会失效；必须重新回到人工审阅和批准，不能直接修改批准记录中的指纹。
