---
name: evo-init
description: Understand a repository, discover its existing engineering conventions and knowledge owners, and establish only the minimum missing repository guidance needed for durable AI-assisted development.
---

# EVO Init

## Objective

Make the repository legible to a fresh Agent without introducing an EVO runtime or forcing a new directory scheme.

## Repository archaeology

Inspect the actual repository: root and nested instructions, README/docs, manifests and lockfiles, source layout, representative implementations, tests, CI/build files, Git history, runtime entry paths, public contracts, issue/spec/ADR conventions, and domain vocabulary.

Use the host project's own tools when they reveal facts better than static reading. Examples include Maven effective POM/dependency tree, package-manager metadata, test discovery, framework CLIs, or Git history. Do not reimplement package managers with heuristics.

Separate findings into:

- **Confirmed** — directly supported by repository/runtime evidence.
- **Inferred** — likely, with the evidence and uncertainty stated.
- **Unknown** — not established. Unknown is not automatically blocking.

## Reuse before creating

Find which existing artifacts already own:

- repository working rules;
- current architecture/system behavior;
- domain language and durable business facts;
- proposals/specs/plans;
- stable design decisions;
- tests and verification commands;
- delivery/history.

Reuse them. Only when no equivalent exists, propose the smallest useful structure, typically a short `AGENTS.md`, a concise `CONTEXT.md`, and a decision/docs location appropriate to the repository.

## Human review

Before writing new standing guidance, show the discoveries, proposed owners, and exact files to create/update. Do not rewrite existing project authorities merely to fit EVO.

## Completion

Initialization is complete when a fresh Agent can answer: what this repository is, where current truth lives, how to build/test/run relevant parts, which patterns to reuse, where durable decisions live, and which important facts remain genuinely unknown.