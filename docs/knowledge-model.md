# Knowledge Model

## Goal

EVO knowledge should let a future agent answer five questions quickly:

1. What is this repository and how is it structured?
2. What capabilities and patterns already exist?
3. What is happening right now?
4. What changed and what remains valid?
5. What project-specific lessons should influence future work?

Knowledge is durable only when it improves future engineering decisions. Do not record information merely because it was observed once.

## Directory contract

```text
.evo/
├── project.md
├── current.md
├── references.md
├── capabilities.md
├── decisions/
├── changes/
└── learnings/
```

## project.md

**Owner:** stable repository understanding.

Contains:

- project purpose and technology shape;
- applications/entry points;
- architecture and module boundaries;
- dependency direction;
- build/run/test/quality commands;
- important repository conventions;
- external systems and data boundaries;
- important constraints and known inconsistencies;
- observation metadata.

Do not turn `project.md` into a file inventory. Prefer concise maps and links to authoritative source/docs.

## references.md

**Owner:** representative implementation index.

Each entry answers: “When doing this kind of work, what existing implementation should an agent inspect first?”

Recommended fields:

```text
Concern
Scope
Reference (path + symbol when useful)
Confidence: Authoritative | Representative | Observed
Why representative
Observed at
```

Examples of concerns: CRUD, permission checks, transactions, complex services, API clients, forms, tables, migrations and tests.

## capabilities.md

**Owner:** reusable project/framework capability index.

Each entry answers: “Does the repository already provide a capability that should be reused or extended?”

Recommended fields:

```text
Concern
Capability
Scope
Typical use
Reference
Confidence
Observed at
```

Common concerns include response envelopes, pagination, auth/permissions, audit/logging, validation, persistence helpers, transactions/errors, caching, file/import/export, dictionaries/status handling, frontend request/state/form/table components, migrations and test helpers.

## current.md

**Owner:** compact current engineering state.

Keep this file short. It may contain:

- current goal;
- active change(s);
- branch/worktree context when useful;
- confirmed completed work;
- in-progress work;
- blockers;
- pending verification;
- important uncertainties;
- recommended next action;
- last recovery/update observation.

`current.md` is not a task tracker. Link to the real tracker/spec/change owner instead of duplicating it.

## changes/

**Owner:** accepted intent deltas and their propagation.

A material change record should contain:

```text
Previous intent
New intent
Semantic delta
Affected areas
Unaffected areas
Invalidated knowledge/assumptions/evidence
Preserved work
Follow-up required
Verification status
Observation/references
```

The central rule is selective invalidation: preserve anything not materially affected.

## learnings/

**Owner:** promoted project-specific engineering lessons.

Candidate learning sources include bug diagnosis, review findings, incidents, migrations and surprising implementation discoveries.

A lesson is durable only if all are true:

1. it is supported by evidence;
2. it is stable enough to outlive the current task;
3. it is meaningfully project-specific or project-contextual;
4. a future agent is likely to benefit;
5. the same fact is not already better owned elsewhere.

If a learning changes a stronger owner, update that owner and keep only a concise trace/reference rather than duplicating the rule.

## decisions/

Use decisions only for durable choices with meaningful alternatives or consequences. Keep them lightweight:

```text
Context
Decision
Alternatives considered
Consequences
References
```

Do not create a decision record for ordinary implementation details.

## Confidence model

### Authoritative

Explicitly required by current repository instructions, contracts, architecture docs, accepted decisions or other clear authorities.

### Representative

Supported by repeated, current production usage and preferably tests. Suitable as the default pattern when no stronger authority conflicts.

### Observed

Supported by limited evidence. Useful for navigation or hypotheses, not safe as a normative rule.

## Freshness model

Knowledge should record an observation point, normally:

```text
Observed at commit: <sha>
Observed on: <date>
Evidence: <paths/symbols/docs>
```

Freshness is evidence-scoped, not repository-global. If HEAD advances but none of an entry's evidence surface changes, the entry may remain valid.

`evo-refresh` should:

1. compare the entry/project observation point with current Git state;
2. identify changed modules/evidence surfaces;
3. mark potentially affected knowledge;
4. re-read only affected areas;
5. update, downgrade confidence, or retire stale entries;
6. preserve unaffected knowledge.

## Progressive disclosure

Agents should normally read in this order:

1. standing repository instructions;
2. `.evo/project.md` and `.evo/current.md` when broadly relevant;
3. targeted search in `references.md` / `capabilities.md` for the concern at hand;
4. only the relevant change, learning or decision records;
5. source/tests to confirm important facts.

Do not require every consumer to read the whole knowledge directory.

## One Fact → One Owner

Canonical ownership examples:

- implementation behavior → source/tests;
- current architecture/conventions summary → `project.md`;
- representative pattern lookup → `references.md`;
- reusable capability lookup → `capabilities.md`;
- current work snapshot → `current.md`;
- accepted semantic delta → `changes/`;
- durable project lesson → `learnings/` or a promoted stronger owner;
- rationale for durable choice → `decisions/`;
- chronology → Git/tracker history.

Other artifacts link to the canonical owner instead of copying it.
