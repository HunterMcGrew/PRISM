---
title: Syncing
description: The commands developers use to keep PRISM's platform outputs in sync.
---

# Syncing

PRISM's sync model has one command today and one more planned:

```bash
pnpm prism:build         # regenerate platform outputs from .ai-skills/ and .prism/
# pnpm prism:install-codex  (planned for Phase 2 — not yet shipped)
```

This page explains what `pnpm prism:build` does, when to run it, and why the per-user Codex install needs its own script (eventually).

## `pnpm prism:build` — the build

`pnpm prism:build` reads canonical content from `.ai-skills/` and `.prism/` and writes platform outputs to their tool-namespaced destinations:

| Source | Destination |
| --- | --- |
| `.ai-skills/skills/<id>/` | `.claude/skills/<id>/SKILL.md` |
| `.ai-skills/skills/<id>/` | `.agents/skills/<id>/SKILL.md` (Codex skill body) |
| `.ai-skills/skills/<id>/` | `.codex/agents/<id>.toml` (Codex agent adapter) |
| `.ai-skills/skills/<id>/` | `.cursor/skills/<id>/SKILL.md` |
| Roles definition | `.codex/codex-config.toml` |
| `.prism/{rules,architect,spec,templates,references}/` | mirrored into `.claude/`, `.codex/`, `.cursor/` |
| `.prism/SPEC.md` | mirrored into `.claude/`, `.codex/`, `.cursor/` |

After the build, `pnpm prism:test` runs automatically to verify the canonical-source invariants (description length, role mapping, managed marker presence). The combined command is what you run during development.

Run it whenever you edit anything under `.ai-skills/` or `.prism/`. If you forget, `pnpm prism:check` will catch the drift on CI.

## Per-user Codex install — planned

Codex reads skills from `~/.agents/skills/` and agents from `~/.codex/agents/` on the user's machine — both of those live in the user's home directory, not in the repo. A future per-user install script (`pnpm prism:install-codex`, planned for Phase 2 as part of Atlas's onboarding flow) will copy PRISM's build outputs into those home-directory destinations.

PRISM does not yet ship that script. Pre-Phase-2, Codex consumers have two options:

1. **Dogfood PRISM directly** — clone PRISM, run `pnpm prism:build`, and point Codex at the repo's `.agents/skills/` and `.codex/agents/` (or symlink them into your home directory).
2. **Wire `~/.agents/skills/` yourself** — copy the build outputs from `.agents/skills/` and `.codex/agents/` into your home directory by hand or with a personal script.

Whichever path you take, do **not** touch `~/.codex/codex-config.toml` from PRISM's build. That file is per-user (personality, projects, marketplaces); overwriting it would clobber your setup. The build still produces `.codex/codex-config.toml` in the repo so PRISM's dogfood install works locally, but `.gitignore` keeps it out of commits and any future install script must not push it to the home directory.

## Cursor: no install step

Cursor reads skills from `.cursor/skills/<id>/SKILL.md` directly in the repo. Since `.cursor/skills/` is committed (per [ADR-0044](https://github.com/HunterMcGrew/PRISM/blob/main/.prism/spec/adrs/_toolkit/0044-direct-write-tool-outputs.md)), Cursor consumers get every persona on `git pull` — no install step required.

This is the Phase 1.5f change. Before it, `.cursor/skills/` was generated and gitignored. PRISM never shipped a Cursor install script (the upstream Thrive dogfood had one; PRISM was extracted before that script was added). So pre-1.5f, Cursor consumers of PRISM had no clean install path — direct-write + commit closes that gap.

## Why the split

The build vs install-script split is governed by the in-repo vs outside-repo rule:

- **In-repo destinations get sync.** The build writes directly to where the tool reads. The build IS the install.
- **Outside-repo destinations get install scripts.** The destination lives in the user's home directory, so the install script handles the copy from the repo's build output to the user's home.

The failure mode the rule prevents is staging-and-deploy drift — covered in detail in [`compatibility.md § Install-Script Scope`](./compatibility.md). The short version: a single staging-plus-install pipeline inevitably drifts as the build evolves; separating in-repo sync from outside-repo install removes the drift surface entirely.

## What happened to `.generated/`?

Pre-Phase-1.5f, the build wrote Cursor skills to `.generated/cursor-skills/` and Codex config to `.generated/codex-config.toml`, with `.gitignore` blanket-ignoring `/.generated/`, `/.cursor/`, and `/.codex/`. The build wrote to staging, but PRISM never shipped a downstream install script to copy from staging to the live tool namespaces — the staging directory existed without a consumer.

Phase 1.5f removed the staging directory entirely. Cursor skills land directly at `.cursor/skills/` (committed); Codex config lands directly at `.codex/codex-config.toml` (ignored). If you have a stale clone with a `.generated/` directory, delete it after pulling:

```bash
rm -rf .generated/
```

The build won't recreate it. The full reasoning lives in [ADR-0044](https://github.com/HunterMcGrew/PRISM/blob/main/.prism/spec/adrs/_toolkit/0044-direct-write-tool-outputs.md).
