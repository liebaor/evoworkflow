---
id: d-0001
change: evo-0001-v0-1
status: current
supersedes: null
supersededBy: null
---

# Humans own phase transitions

## Problem

Automatic routing can turn ambiguous intent or advisory output into unauthorized implementation.

## Decision

Every EVO Skill executes one phase outcome and stops. Humans invoke the next phase, approve content-bound artifacts, accept residual risk, and authorize side effects. `ask-evo` and `evo status` recommend but never execute the next action.

## Consequences

The workflow remains inspectable and resumable. Users perform more explicit transitions, while agents still automate work inside each phase.

## Verification

Skill validation and workflow scenarios must show no automatic phase chaining or Finish.

## Revisit trigger

Revisit only if observed usage demonstrates a safe class of deterministic transitions that preserves equivalent human authority.
