# Shared Harness compatibility field check

Run date: 2026-09-15

## Scope

This is a compatibility field check for the v0.4.1 canonical installation. It does not claim a full product change by Claude Code or OpenCode.

## Observed

- Canonical runtime: `C:\Users\lzcoffice\.agents\skills`
- Installed package version: EVO 0.4.1
- Canonical Skills: 20
- Claude runtime root: `C:\Users\lzcoffice\.claude\skills`
- Claude entries: 20 correct symlinks to the canonical runtime
- Codex executable: FOUND; `codex-cli 0.154.0-alpha.6.2`
- Claude Code executable: FOUND; version output unavailable
- OpenCode executable: MISSING
- `evo skills doctor --json`: PASS; OpenCode absence is INFO only
- Deterministic E414/E415: PASS for shared OpenCode visibility contract and Claude link target

## Boundary

The installed Claude links and declared OpenCode shared-source contract are verified. A real Claude bounded continuation and a real OpenCode continuation remain `UNVERIFIED`; OpenCode was not installed on this machine. No legacy Skill directory was removed and no repository `.evo/state.yml` was changed by installation.
