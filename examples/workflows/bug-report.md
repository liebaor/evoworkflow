# Bug investigation / 缺陷调查示例

## Observed behavior / 观察到的行为

筛选条件为空时，列表被错误地隐藏。

## Reproduction and failing evidence / 复现与失败证据

使用最窄的本地入口运行回归夹具，退出码为 `1`，输出为 `expected=visible actual=hidden`。

## Expected behavior / 预期行为

筛选条件为空时，列表仍然可见。

## Root cause / 根因

空筛选条件被错误解释成隐藏列表的值。

## Existing rule or mechanism to reuse / 应复用的现有规则或机制

复用现有的可见性断言，不新增第二套判断规则。

## Fix boundary / 修复边界

只修正空筛选条件的可见性赋值，并保留回归测试。

## Regression evidence / 回归证据

修复后使用同一入口运行，退出码为 `0`，没有失败输出。

## Real-entry-path status / 真实入口状态

- `UNVERIFIED`：本示例只证明本地夹具，不替代真实应用入口验证。

## Knowledge promotion / 知识沉淀

本次故障没有产生需要提升为长期规则的新知识。
