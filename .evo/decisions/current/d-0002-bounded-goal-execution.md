---
id: d-0002
change: evo-0001-v0-1
status: current
supersedes: null
supersededBy: null
---

# Goals delegate execution, not ambiguity

## Problem

Long-running agent work is useful only when its requirements, Slice boundaries, evidence, and stop conditions remain under human control.

## Decision

A v0.1 Goal is single-agent and sequential. Approval binds Goal intent, adapter configuration, and active Change/Plan content. Agent output is followed by deterministic verification. Success ends at `READY_FOR_REVIEW`; Goals cannot Finish Changes.

## Consequences

Independent Slices can continue after a blocker, dependent Slices wait, and interruptions leave durable checkpoints. Adapter changes or material Plan edits require renewed approval.

## Verification

Tests cover five-Slice ordering, Decision stops, repeated failure, stale approval, and no automatic Finish.

## Revisit trigger

Consider parallel or remote execution only after sequential Goals are stable in multiple real repositories.
