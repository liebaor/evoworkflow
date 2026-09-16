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

- semantic repository onboarding and reusable-capability discovery;
- Spec/ticket repository-conformance gates around upstream planning methods;
- repository-conformant implementation with Reference Before Edit and Capability Before Creation;
- changed-intent propagation with selective gate/evidence invalidation;
- acceptance-to-evidence verification;
- pre-delivery review of worktree changes and duplicate/parallel capability detection;
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

## Planning conformance boundary

EVO does not fork Matt planning methods. Instead it wraps them:

```text
to-spec (Matt)
        ↓
evo-spec-review
        ↓
to-tickets (Matt)
        ↓
evo-plan-review
        ↓
execution
```

The canonical Spec/tickets remain the owners. EVO review gates may update those owners when repository evidence makes an intent-preserving correction unambiguous. They never create a parallel planning database.

`evo-spec-review` operates at architecture/framework-capability granularity. `evo-plan-review` operates at executable ticket granularity and is the hard gate before `evo-goal`.

## Execution Envelope

A Goal may continuously execute mechanical transitions only after intent, repository fit and boundaries are sufficiently clear. The envelope identifies at least:

- source Spec / parent task;
- conformance-reviewed tracker scope/frontier;
- commit policy;
- push policy (`none`, `final-only`, or `per-ticket`);
- human-stop conditions.

The envelope belongs on the canonical tracker source (or the local tracker document), not in a second progress database.

## Repository conformance

Planning and implementation shape follow this precedence:

```text
Human-approved intent (WHAT)
        ↓
Documented repository rules (HOW constraints)
        ↓
Representative existing implementation (SHAPE)
        ↓
Existing repository/framework capability (REUSE OWNER)
        ↓
Framework official convention
        ↓
Matt/general engineering heuristics (FALLBACK)
        ↓
New abstraction (LAST OPTION)
```

Two standing rules enforce this:

- **Reference Before Edit** — inspect the nearest representative implementation before non-mechanical edits.
- **Capability Before Creation** — inspect/search existing repository/framework capability owners before adding reusable infrastructure or parallel abstractions.

If documented rules and real code disagree materially, surface the inconsistency instead of silently choosing whichever is convenient.

## No hidden orchestration runtime

`evo-goal` is a Skill-level orchestrator. It derives progress from the tracker, Git and evidence. It does not own locks, phase state, fingerprints, adapters, or a duplicate Slice ledger.
