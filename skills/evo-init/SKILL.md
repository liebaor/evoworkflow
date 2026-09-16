---
name: evo-init
description: Semantically learn an existing repository's authorities, architecture, commands, reusable capabilities and representative implementation patterns so later EVO development conforms to the project instead of inventing a parallel structure.
compatibility: "Codex, Claude Code, OpenCode; Git repository; integrates with Matt setup"
disable-model-invocation: true
metadata:
  opencode/autoinvoke: "false"
---

# EVO Init

## Purpose

Make the repository legible to a fresh Agent and establish how future code should fit the existing system. This is semantic repository archaeology, not framework detection alone.

## Preconditions

Matt's repository setup should already define issue-tracker and domain-doc conventions. If `docs/agents/issue-tracker.md` / domain configuration is missing and `setup-matt-pocock-skills` is unavailable, report `MATT_SKILL_REQUIRED: setup-matt-pocock-skills`.

## Read first

Inspect standing instructions (`AGENTS.md`, `CLAUDE.md` when present), README/current docs, architecture/coding/contributing standards, manifests/locks, CI, formatter/linter/type/test configuration, application entry points, representative source, tests, migrations/contracts, framework/platform conventions present in the codebase, and recent Git history.

## Archaeology layers

1. **Explicit authorities** — identify where architecture, coding rules, domain language, API/data rules and operations are actually documented.
2. **Architecture** — trace real module boundaries, dependency direction and at least one representative end-to-end consumer path.
3. **Operating paths** — confirm build, test, typecheck/lint, run and relevant observation commands from repository evidence.
4. **Existing patterns** — find representative implementations for concerns future changes are likely to touch: API/controller, service/domain, persistence, permissions/auth, transactions/errors, frontend state/forms/tables, migrations and tests as applicable.
5. **Reusable capabilities** — identify existing framework-native classes, helpers, utilities, shared modules, components, annotations, middleware, data/access abstractions and extension points that should be reused or extended rather than rebuilt.
6. **Conflicts/unknowns** — surface meaningful disagreement between docs and dominant code, multiple incompatible patterns, or missing evidence.

Prefer a widely used, current and tested pattern over an isolated example. A documented repository rule overrides generic taste; when a documented rule and dominant current implementation materially conflict, record the conflict rather than pretending one is canonical.

## Write

Create or refresh `docs/agents/repository.md` as a compact map with:

- Authorities
- Build / Test / Run
- Architecture / Module Boundaries
- Representative Consumer Paths
- Existing Patterns (`Concern | Reference | Why this is representative`)
- Reusable Capabilities (`Concern | Existing capability | Typical use | Reference`)
- Development Contract
- Known Inconsistencies / Unknowns
- Observation commit/date for traceability

The Reusable Capabilities map should cover the repository/framework concerns most likely to be reinvented: standard responses, pagination, auth/permission, audit/logging, validation, persistence helpers, transactions/errors, caching, file/Excel/import-export, dictionaries/status handling, frontend request/state/table/form components, migrations and test helpers when they exist.

Link to source/authorities; do not copy large documents or source bodies. Do not create `.evo/` state.

Ensure the repository's existing agent-instruction root points readers to `docs/agents/repository.md`; preserve surrounding user instructions.

## Development Contract

The Development Contract must include both rules:

**Reference Before Edit** — non-mechanical implementation identifies the nearest existing reference before editing and classifies its approach `REUSE`, `EXTEND`, or `NEW`.

**Capability Before Creation** — before creating a shared class/helper/utility/component/middleware/base abstraction or framework-like mechanism, search the repository and framework capability map for an existing owner. Reuse or extend that owner unless a new abstraction is explicitly justified.

For framework-based brownfield projects, repository-specific usage wins over generic framework tutorials. Framework-native capability wins over a parallel custom abstraction unless an accepted architectural decision says otherwise.

## Stop

Do not start feature implementation. Stop if the repository cannot be safely interpreted because entry points/authorities materially conflict or required files are inaccessible.

## Output

Summarize confirmed authorities, representative patterns, reusable framework/project capabilities, meaningful unknowns, and whether the repository is ready for conformant planning and implementation.
