# EVO Skill Installation

v0.4.2 keeps `skills/*` as the authoring source and installs one machine-level runtime copy at `~/.agents/skills`.

```text
EVO package skills/*
        ↓
~/.agents/skills/*   canonical runtime
        ├── Codex      native
        ├── OpenCode   shared native source
        └── Claude     ~/.claude/skills/* → symlink/junction
```

Commands are report-first:

```sh
evo skills inspect
evo skills install                 # preview only
evo skills install --apply         # apply missing safe entries
evo skills update                  # preview receipt-backed updates
evo skills update --apply
evo skills doctor
```

Installation never writes `.evo/state.yml`, deletes legacy copies, or overwrites a user-modified Skill. A canonical installation receipt is derived state used only to distinguish a managed previous version from an unknown local modification.

Claude links prefer a directory symlink/junction. If the platform rejects link creation, the installer uses an explicit COPY fallback and Doctor reports copy drift separately.
