---
name: evo-plan
description: Break accepted intent into bounded vertical slices that a fresh Agent can implement and verify using repository-native patterns and tools.
---

# EVO Plan

## Objective

Produce the smallest executable plan that preserves intent and gives fast feedback. Reuse the repository's existing issue tracker, plan format, or task files.

## Slice design

Each slice should deliver a coherent vertical result through the real path that exists, not merely modify one architectural layer. For every slice record:

- objective and acceptance covered;
- relevant existing pattern/reference implementation;
- likely files/areas, without pretending exact paths are known when they are not;
- dependencies/blocking edges;
- implementation seam;
- direct verification commands or runtime checks;
- current docs/decision surfaces that must converge if facts change.

Prefer slices small enough for a fresh Agent/session. Avoid a giant checklist and avoid artificial micro-tasks that cannot be verified independently.

## Authority

The plan coordinates work; it does not become permanent architecture authority. Current docs own current facts, decisions own rationale, tests own executable promises, and Git owns chronology.