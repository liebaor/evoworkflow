---
change: evo-0001-v0-1
status: APPROVED
approval:
  approvedAt: 2026-09-13T04:45:51.961Z
  approvedBy: human
  fingerprint: e7094c24adebfaf072460508068680fa745054384975ed3d7c9a82193b1d7404
  source: active-thread-goal
---

# evoworkflow v0.1 Specification

The behavioral specification and non-goals are owned by [the product specification](../../../../docs/product-spec.md). The active Change acceptance criteria trace AC-01 through AC-15 to that authority.

## Compatibility

- Node.js 22 or newer.
- ESM TypeScript runtime and build output.
- Filesystem and Git storage only.
- Agent CLI execution through explicit argument arrays without a shell.
- Managed project documents remain authoritative and are never overwritten by initialization.

## Failure behavior

- Invalid YAML, dangling state, duplicate authority, stale approval, missing evidence, and invalid Goal graphs fail loudly.
- Missing repository facts remain unknown rather than inferred.
- Goal subprocess failure retries only within the approved attempt budget and then records `BLOCKED`.
- Goal success means `READY_FOR_REVIEW`, not accepted or finished.
