# EVOworkflow 2.0

> A compatibility-first extension layer for long-running AI software engineering, built **on top of** Matt Pocock's engineering Skills without modifying them.

EVOworkflow 2.0 deliberately stops trying to own the whole software-engineering workflow. Matt's mature methods are carried here as a pinned, **vendored read-only upstream**; EVO adds the pieces needed for long-lived projects: semantic repository onboarding, repository-conformant planning and implementation, requirement evolution, acceptance evidence, continuous goal execution, knowledge convergence, recovery, and controlled Git delivery.

```text
Matt Skills                  EVO Extensions
───────────                  ──────────────
domain-modeling              evo-init
grill-with-docs              evo-spec-review
research                     evo-plan-review
to-spec                      evo-implement
to-tickets                   evo-change
wayfinder                    evo-verify
tdd                          evo-review
diagnosing-bugs              evo-goal
codebase-design              evo-finish
code-review                  evo-commit
                             evo-recover
                             evo-advisor
                             ask-evo
```

## Core boundary

**Matt is upstream. EVO is an extension, not a fork.**

- Matt's formal Engineering + Productivity Skills are vendored here unchanged for reproducible, one-source installation.
- Do not edit, rename, or shadow Matt Skills. CI protects every vendored Matt Skill with its upstream Git tree SHA.
- If EVO needs different behavior, create or change an `evo-*` Skill.
- Matt owns its engineering methods; EVO owns the integration contracts around them.
- Upstream progress/task state remains in the configured issue tracker rather than a second `.evo/` state database.
- Repository truth stays in the repository: source, tests, current docs, `CONTEXT.md`, ADRs, tracker history, Git, and CI.

See [`UPSTREAM.md`](UPSTREAM.md) for the pinned Matt commit, vendored scope, exact-integrity policy, and upgrade procedure.

## Installation

Use EVOworkflow as the single Skill source for this combined bundle:

```sh
npx skills@latest add liebaor/evoworkflow
```

The repository contains both the pinned Matt Skills and EVO's `evo-*` extensions. Do **not** also install `mattpocock/skills` into the same target, because that would duplicate Matt Skill IDs.

Then, in a repository:

```text
setup-matt-pocock-skills
→ evo-init
→ ask-evo
```

`setup-matt-pocock-skills` is still Matt's original setup authority for issue-tracker and domain-document conventions. `evo-init` adds semantic repository understanding and writes a repository guide; it does not replace or modify Matt setup.

## The v2 development contract

### 1. Understand the repository before planning or editing

`evo-init` performs semantic repository archaeology. It identifies documented authorities, build/test/run commands, module boundaries, real consumer paths, reusable framework/project capabilities, representative implementations, test patterns, and known inconsistencies.

It writes a compact map at:

```text
docs/agents/repository.md
```

The guide links to authorities and references rather than copying them.

### 2. Reference Before Edit

For non-mechanical code changes, EVO requires a nearest existing implementation to be identified before editing. Every material approach should be classified as:

```text
REUSE | EXTEND | NEW
```

`NEW` requires an explicit reason why the existing structure cannot be extended; material new architecture routes to design/decision work rather than being invented silently.

### 3. Capability Before Creation

Before creating a shared helper, utility, component, base abstraction, response/page wrapper, permission/auth mechanism, persistence wrapper, middleware, logging/audit mechanism or similar reusable capability, EVO requires a search of the repository/framework capability map and real source.

The default precedence is:

```text
Human-approved intent
→ documented repository rules
→ representative production pattern
→ existing repository/framework capability
→ framework official convention
→ general engineering heuristic
→ new abstraction
```

For a RuoYi-style brownfield project, that normally means reusing the project's existing response, pagination, security, logging, dictionary, data-scope, CRUD and frontend conventions rather than introducing parallel generic abstractions.

### 4. Planning must conform before execution

Matt's `to-spec` and `to-tickets` remain unchanged upstream methods. EVO adds two gates around them:

```text
to-spec
→ evo-spec-review
→ to-tickets
→ evo-plan-review
```

`evo-spec-review` checks architecture/framework fit without turning the Spec into a file-by-file plan. `evo-plan-review` checks each ticket's module fit, representative implementation, reusable capabilities, `REUSE/EXTEND/NEW` strategy and repository-native verification pattern. It edits the canonical Spec/tickets when an intent-preserving correction is unambiguous; it does not create a parallel review document.

`evo-goal` must not start on an unreviewed or blocked ticket graph.

### 5. Human owns meaning; Agent owns execution

The human owns product intent, material architecture/security/data decisions, risk acceptance, and external authorization. Inside an approved **Execution Envelope**, `evo-goal` can continuously execute ready tickets without asking the human to approve every mechanical transition.

### 6. Tracker owns progress

EVO 2.0 has no `.evo/state.yml`, phase database, or duplicated Slice progress. Specs, tickets, blocking edges, claims, and completion live in the configured tracker. Git records history; tests/CI provide mechanical evidence.

### 7. Commit describes state

`evo-commit` records an already-understood engineering checkpoint. A successful commit does not prove correctness. Push is default-off and may be pre-authorized by a Goal policy as `final-only` or `per-ticket`; force-push, protected/default-branch writes, history rewrites, merges, releases, and deploys always require separate explicit authorization.

## Standard workflow

```text
setup-matt-pocock-skills
        ↓
     evo-init
        ↓
grill-with-docs / domain-modeling / research
        ↓
      to-spec
        ↓
 evo-spec-review
        ↓
     to-tickets
        ↓
 evo-plan-review
        ↓
Human approves intent + execution envelope
        ↓
      evo-goal
        │
        ├─ evo-implement
        ├─ tdd when appropriate
        ├─ evo-verify
        ├─ evo-review
        ├─ diagnosing-bugs when needed
        ├─ evo-commit
        └─ next tracker frontier
        ↓
 full evo-verify
        ↓
  final evo-review
        ↓
    evo-finish
        ↓
    evo-commit
        ↓
 push only if authorized
```

If accepted intent changes during execution:

```text
evo-change
→ update canonical spec/tickets/ADRs/docs
→ preserve unaffected work/evidence
→ invalidate only affected conformance assumptions
→ rerun evo-spec-review / evo-plan-review only where needed
→ recompute tracker frontier
→ resume evo-goal
```

## EVO-owned Skills

| Skill | Responsibility |
|---|---|
| `ask-evo` | Route to exactly one best next Matt or EVO capability. |
| `evo-init` | Learn how this repository is actually built, what capabilities it already owns, and how code is expected to fit. |
| `evo-advisor` | Give repository-grounded senior engineering guidance and route to upstream design capabilities where appropriate. |
| `evo-spec-review` | Check the canonical Spec against repository architecture/framework-native capabilities before ticketing. |
| `evo-plan-review` | Gate the canonical ticket graph on module fit, references, capability reuse and verification fit before execution. |
| `evo-implement` | Implement one bounded reviewed ticket while conforming to existing structure/capabilities; no Git delivery. |
| `evo-change` | Propagate changed accepted intent through canonical owners while preserving unaffected work/evidence and only invalidating affected conformance gates. |
| `evo-verify` | Map acceptance claims to executed PASS / FAIL / UNVERIFIED evidence. |
| `evo-review` | Review worktree/committed changes for repository conformance, duplicate/parallel capabilities, intent, and evidence before delivery. |
| `evo-goal` | Continuously consume the conformance-reviewed ready ticket frontier inside an approved execution envelope. |
| `evo-finish` | Converge current docs/domain/ADRs/tracker after final verification and review. |
| `evo-commit` | Create AI-readable commits and perform only explicitly authorized push behavior. |
| `evo-recover` | Reconstruct work from repository/tracker/Git/tests rather than chat memory. |

## Vendored Matt Skills

EVOworkflow currently vendors the 25 formal Matt Engineering + Productivity Skills from pinned upstream commit `959a8e9f1edc3adbe2f7e3054bb6fbefa6696260`. Their source trees are immutable within normal EVO development and verified in CI. `UPSTREAM.md` is the source of truth for the imported set and upgrade process.

## Harness compatibility

EVO-owned Skills use portable `SKILL.md` semantics and avoid harness-specific tool syntax. Harness-specific discovery/invocation controls live in metadata:

- Codex: `agents/openai.yaml`.
- OpenCode: `metadata.opencode/autoinvoke` in `SKILL.md`.
- Claude Code: `disable-model-invocation` in `SKILL.md`.

Named Matt capabilities are **logical Skill dependencies**. EVO says “apply `tdd`” rather than assuming `/tdd`, `skill({id: ...})`, or another specific API. The vendored Matt files themselves remain byte-for-byte upstream and therefore keep Matt's own metadata choices. See [`docs/compatibility.md`](docs/compatibility.md).

## Principles

- Repository > Chat
- Evidence > Claim
- Existing Pattern > Reinvent
- Reference Before Edit
- Capability Before Creation
- Planning Conforms Before Execution
- One Fact → One Owner
- Change > Rewrite
- Human Owns Meaning; Agent Owns Execution
- Tracker Owns Progress
- Commit Describes State
- Minimum Necessary Process
