# EVOworkflow 2.0 Architecture

## Positioning

EVOworkflow is an extension layer, not a behavioral fork of Matt Pocock's Skills and not an Agent runtime. Matt's formal Skills are vendored into this repository as a pinned, read-only upstream snapshot so users can install one combined bundle without turning those files into EVO-owned code.

```text
Human
  │ owns intent, material decisions, risk, external authorization
  ▼
Vendored Matt engineering methods + EVO extension contracts
  │
  ├── Repository / CONTEXT / ADR / current docs
  ├── Issue tracker (specs, tickets, dependencies, progress)
  ├── Source / tests / runtime / CI
  └── Git / PR history
```

There is intentionally no `.evo/` state database.

## Responsibility split

### Matt vendored upstream

Provides mature reusable methods such as domain modeling, grilling, research, Spec synthesis, tracer-bullet ticketing, TDD, diagnosis, codebase design, wayfinding, code review, and supporting productivity Skills.

The vendored snapshot is externally owned upstream code. EVO distributes it unchanged, pins its exact source trees in CI, and consumes the capabilities by Skill ID. Normal EVO development never edits those trees.

### EVO extensions

EVO owns integration problems that matter for long-running projects:

- semantic repository onboarding and repository conformance;
- changed-intent propagation;
- acceptance-to-evidence verification;
- pre-delivery review of worktree changes;
- continuous ticket-frontier execution;
- current-truth convergence after delivery;
- cross-session recovery;
- structured commit and authorized push policy.

## Upstream integrity boundary

Each vendored Matt Skill directory has an expected Git tree SHA derived from pinned upstream commit `959a8e9f1edc3adbe2f7e3054bb6fbefa6696260`.

```text
Matt upstream tree SHA
        =
EVO vendored Matt tree SHA
```

If contents, file modes, helper docs, scripts, or metadata drift, CI fails. Intentional upstream updates replace the snapshot and advance the pin; they are not mixed into ordinary EVO feature edits.

## Execution Envelope

A Goal may continuously execute mechanical transitions only after intent and boundaries are sufficiently clear. The envelope identifies at least:

- source Spec / parent task;
- tracker scope/frontier;
- commit policy;
- push policy (`none`, `final-only`, or `per-ticket`);
- human-stop conditions.

The envelope belongs on the canonical tracker source (or the local tracker document), not in a second progress database.

## Repository conformance

Implementation shape follows this precedence:

```text
Human-approved intent (WHAT)
        ↓
Documented repository rules (HOW constraints)
        ↓
Representative existing implementation (SHAPE)
        ↓
Matt/general engineering heuristics (FALLBACK)
```

If documented rules and real code disagree materially, surface the inconsistency instead of silently choosing whichever is convenient.

## No hidden orchestration runtime

`evo-goal` is a Skill-level orchestrator. It derives progress from the tracker, Git and evidence. It does not own locks, phase state, fingerprints, adapters, or a duplicate Slice ledger.
