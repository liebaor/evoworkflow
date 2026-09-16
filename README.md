# EVOworkflow 2.0

> A compatibility-first extension layer for long-running AI software engineering, built **on top of** Matt Pocock's engineering Skills without modifying them.

EVOworkflow 2.0 deliberately stops trying to own the whole software-engineering workflow. Matt's mature methods are carried here as a pinned, **vendored read-only upstream**; EVO adds the pieces needed for long-lived projects: semantic repository onboarding, repository-conformant implementation, requirement evolution, acceptance evidence, continuous goal execution, knowledge convergence, recovery, and controlled Git delivery.

```text
Matt Skills                  EVO Extensions
───────────                  ──────────────
domain-modeling              evo-init
grill-with-docs              evo-implement
research                     evo-change
to-spec                      evo-verify
to-tickets                   evo-review
wayfinder                    evo-goal
tdd                          evo-finish
diagnosing-bugs              evo-commit
codebase-design              evo-recover
code-review                  evo-advisor
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

### 1. Understand the repository before editing

`evo-init` performs semantic repository archaeology. It identifies documented authorities, build/test/run commands, module boundaries, real consumer paths, reusable capabilities, representative implementations, test patterns, and known inconsistencies.

It writes a compact map at:

```text
docs/agents/repository.md
```

The guide links to authorities and references rather than copying them.

### 2. Reference Before Edit

For non-mechanical code changes, EVO requires a nearest existing implementation to be identified before editing. Every change should be classified as:

```text
REUSE | EXTEND | NEW
```

`NEW` requires an explicit reason why the existing structure cannot be extended; material new architecture routes to design/decision work rather than being invented silently.

### 3. Human owns meaning; Agent owns execution

The human owns product intent, material architecture/security/data decisions, risk acceptance, and external authorization. Inside an approved **Execution Envelope**, `evo-goal` can continuously execute ready tickets without asking the human to approve every mechanical transition.

### 4. Tracker owns progress

EVO 2.0 has no `.evo/state.yml`, phase database, or duplicated Slice progress. Specs, tickets, blocking edges, claims, and completion live in the configured tracker. Git records history; tests/CI provide mechanical evidence.

### 5. Commit describes state

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
     to-tickets
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
→ recompute tracker frontier
→ resume evo-goal
```

## EVO-owned Skills

| Skill | Responsibility |
|---|---|
| `ask-evo` | Route to exactly one best next Matt or EVO capability. |
| `evo-init` | Learn how this repository is actually built and how code is expected to fit. |
| `evo-advisor` | Give repository-grounded senior engineering guidance and route to upstream design capabilities where appropriate. |
| `evo-implement` | Implement one bounded ticket while conforming to existing structure; no Git delivery. |
| `evo-change` | Propagate changed accepted intent through canonical owners without rewriting unaffected work. |
| `evo-verify` | Map acceptance claims to executed PASS / FAIL / UNVERIFIED evidence. |
| `evo-review` | Review worktree/committed changes for repository conformance, intent, and evidence before delivery. |
| `evo-goal` | Continuously consume the ready ticket frontier inside an approved execution envelope. |
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
- One Fact → One Owner
- Change > Rewrite
- Human Owns Meaning; Agent Owns Execution
- Tracker Owns Progress
- Commit Describes State
- Minimum Necessary Process
