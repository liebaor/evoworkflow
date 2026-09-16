# Skill Contract

All EVO Skills follow this behavioral contract.

## Common structure

Each `SKILL.md` should define:

- Purpose
- When to use
- When not to use
- Read first
- Process
- Decision rules
- Writes
- Stop conditions
- Output

## Shared rules

### Repository evidence first

Do not treat chat memory or EVO summaries as stronger than current repository evidence.

### Minimum necessary context

Read only the EVO/project knowledge relevant to the current job. Use progressive disclosure instead of loading the entire knowledge layer.

### Reference Before Edit

When a Skill influences implementation/planning context, identify the nearest representative implementation for the affected concern before recommending a new pattern.

### Capability Before Creation

Before encouraging a new shared abstraction or infrastructure capability, check `capabilities.md`, repository source, and framework-native ownership.

### Confidence discipline

Do not upgrade a weak observation into a repository rule. Use Authoritative / Representative / Observed evidence strengths.

### Freshness discipline

If relevant EVO knowledge was observed against an older commit and its evidence surface changed, treat it as potentially stale until checked.

### One Fact → One Owner

Update the canonical owner and link to it. Avoid parallel summaries that drift independently.

### Promote, Don't Accumulate

Do not store every task detail or debugging note. Promote only stable project-specific facts that future agents are likely to reuse.

## Skill responsibilities

### evo-init

Owns initial repository archaeology and creation of the Repository Engineering Contract.

Writes/refreshes primarily:

- `.evo/project.md`
- `.evo/references.md`
- `.evo/capabilities.md`
- initial `.evo/current.md`
- Repository Engineering Context block in the standing agent instruction file

It does not implement product features.

### evo-refresh

Owns freshness analysis after repository evolution.

It compares observation points against current Git changes, rescans affected evidence surfaces, and preserves unaffected knowledge.

### evo-change

Owns semantic change impact for accepted intent changes.

It records delta, affected/unaffected areas, preserved work, invalidated assumptions/evidence, and required follow-up. It does not replace the project's normal spec/planning/ticket workflow.

### evo-learn

Owns promotion of durable project-specific lessons.

It may create a learning record or update a stronger owner. It must refuse low-value accumulation.

### evo-recover

Owns repository-based session/model continuity.

It reconstructs current state from standing instructions, `.evo/current.md`, active changes, Git/worktree/history and relevant verification evidence. It should update `current.md` only with evidence-backed current state.

### evo-advisor

Is read-only. It provides repository-aware senior engineering guidance for architecture/design questions, module ownership, reuse-vs-extension decisions, tradeoffs, risks and adaptation of current external technical practice to the repository.

It should:

- establish current repository facts before giving generic advice;
- use relevant capabilities and representative references;
- distinguish repository facts, external current facts and recommendations;
- prefer REUSE, then EXTEND, then NEW when each can satisfy the accepted intent safely;
- use authoritative current external sources when fast-changing technical facts materially affect the answer;
- avoid persisting consultation output automatically.

It does not replace specification, planning, implementation, testing, debugging or review.

### ask-evo

Is read-only. It routes to exactly one EVO Skill above, `evo-advisor` when repository-aware engineering judgment is the primary need, or returns that no EVO action is needed and normal engineering work should continue.

## Writes and authority

EVO files are engineering context, not replacements for:

- source/tests;
- issue trackers;
- product specs;
- release/deployment systems;
- Git history;
- runtime/CI evidence.

When a Skill discovers a conflict with a stronger authority, report it and update/downgrade the EVO knowledge rather than masking the conflict.

## Stop conditions

A Skill should stop and expose uncertainty when:

- required repository files are inaccessible;
- conflicting current authorities make safe synthesis impossible;
- evidence is too weak to classify a durable fact;
- a requested change requires product/architecture/security intent that has not been accepted;
- the Skill would need to invent unsupported current state.

## Output style

Outputs should be compact and operational. Summarize:

- what was confirmed;
- what changed in EVO knowledge, when the Skill writes knowledge;
- important uncertainty or staleness;
- the recommendation or next useful engineering action.
