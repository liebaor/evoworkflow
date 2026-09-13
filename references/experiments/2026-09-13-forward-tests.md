# Fresh-agent forward tests — 2026-09-13

这些是没有继承当前会话历史的只读代理复测。代理先读取目标 Skill，再从仓库文件报告；没有编辑、批准、推进或删除任何文件。

## Recovery

Skill: `skills/evo-recover/SKILL.md`

Observed result: the agent reconstructed the active objective, `evo-0001-v0-1`, `LARGE`, `PLAN / AWAITING_APPROVAL`, no active Goal, `currentSlice: null`, and the persisted checkpoints `S1..S4=PASS`, `S5=PENDING`. It independently matched Plan headings `S1..S5` with `state.yml` ids and recommended human review plus exact-content Plan approval. This confirms recovery now has a machine-readable Slice projection; it does not turn the checkpoints into human approval.

## Architecture advice

Skill: `skills/ask-evo-architect/SKILL.md` with `skills/evo-engineering/SKILL.md`, run against the separate read-only SDD_Study checkout.

Observed result: a hypothetical RBAC addition to a procurement export stopped at `NEEDS_INFO` because the repository authority still describes a single-user system and has no trusted identity, role, permission, or actor audit model. The agent identified the existing API, service, model, OpenAPI, frontend, and security-document evidence, and produced advice without editing the study repository. This confirms architecture advice remains grounded and does not self-approve a security or product Decision.

## Greenfield discovery

Skill: `skills/evo-solution-discovery/SKILL.md`, run against the requirements-only example.

Observed result: the agent did not bootstrap custom code. It compared Plane Community Edition, Odoo Community, and Frappe/ERPNext as candidates, left foundation selection to the human, and proposed a disposable Plane-versus-Odoo bake-off. The durable comparison is recorded in [`2026-09-13-greenfield-discovery.md`](./2026-09-13-greenfield-discovery.md).

## Limits

These tests cover agent behavior at the repository/Skill seam. They do not prove live coding-model execution, GUI behavior, Windows/macOS behavior, CI execution, production deployment, or external-system writes.
