---
name: evo-plan
description: Break an accepted EVO Spec or understood change into bounded vertical slices under .evo/plans/ that a fresh Agent can implement and verify independently. Use before multi-slice implementation or evo-goal.
---

# EVO Plan

## Read first
`.evo/project.md`, `.evo/context.md`, owning Spec, relevant Decisions/Research, representative code/tests.

## Slice contract
Each slice records:
- Objective and Acceptance covered;
- Source of truth (Spec/Decision links);
- In scope / out of scope;
- existing pattern/reference implementation;
- likely areas/files without pretending uncertain paths are known;
- blocking edges;
- implementation seam;
- direct verification commands/runtime checks;
- docs/context/decision surfaces that may need convergence.

Prefer vertical tracer bullets through the real consumer path over backend/frontend/database horizontal batches.

## Fresh-Agent test
Before accepting a slice, imagine handing only that slice plus Repository to a new Agent. It must know what to change, what not to change, which existing pattern to follow and how to prove completion. If chat-only knowledge is required, the slice is not ready.

## Output
Write/update `.evo/plans/<change>.md`, show dependency order and recommend `evo-goal` for continuous execution or `evo-implement` for one slice.