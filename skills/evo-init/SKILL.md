---
name: evo-init
description: Understand an EVO-enabled repository and populate its canonical project and domain knowledge. Use after evo-setup on first adoption or when project.md/context.md are clearly incomplete. Do not use merely because a new session started.
---

# EVO Init

## Preconditions
The canonical `.evo/` workspace already exists. Otherwise use `evo-setup`.

## Purpose
Make a fresh Agent able to navigate, build, test and extend the repository without chat-only knowledge.

## Workflow
1. Read repository instructions, README/current docs, manifests/lockfiles, source layout, representative implementations, tests, CI/build files, Git history, runtime entry points and `.evo/decisions/`.
2. Use host tools when they reveal facts better than static guessing: effective dependency graphs, framework commands, test discovery, Git history, etc.
3. Classify findings as Confirmed, Inferred or Unknown. Unknown is blocking only when it materially changes current risk/work.
4. Write/update `.evo/project.md` with:
   - system purpose;
   - stack and important versions when confirmed;
   - module/repository map;
   - build/test/run commands;
   - real entry/consumer paths;
   - representative existing patterns;
   - important current docs/external systems;
   - known constraints and meaningful unknowns.
5. Write/update `.evo/context.md` with domain vocabulary and stable business facts only.
6. If init discovers a durable design rationale not already owned, record it in `.evo/decisions/`; do not invent decisions simply to fill the directory.

## Output
Summarize what the system is, where to work, how to verify changes, which patterns to reuse and which material facts remain unknown.

## Final checks
A fresh Agent reading `AGENTS.md + .evo/project.md + .evo/context.md` can find the rest of the relevant repository without asking the user to re-explain basic project structure.