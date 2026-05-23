---
title: Syncing
description: The two commands developers need to keep PRISM's platform outputs in sync.
---

# Syncing

Two commands cover almost every sync scenario for PRISM contributors:

```bash
pnpm prism:build         # regenerate platform outputs from .ai-skills/ and .prism/
pnpm prism:install-codex # copy Codex skills/agents into the user's ~/.agents and ~/.codex
```

This page explains what each one does, when to run it, and why the two are split.

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

## `pnpm prism:install-codex` — per-user Codex install

Codex reads skills from `~/.agents/skills/` and agents from `~/.codex/agents/` on the user's machine — both of those live in the user's home directory, not in the repo. `pnpm prism:install-codex` copies PRISM's build outputs into those home-directory destinations.

You run this once after first clone, and again whenever PRISM's Codex content changes. The build alone doesn't install for Codex — only for Claude Code and Cursor, whose destinations are in-repo.

`pnpm prism:install-codex` does **not** touch `~/.codex/codex-config.toml`. That file is per-user (it carries personality, projects, and marketplaces); overwriting it would clobber the consumer's setup. The build still produces `.codex/codex-config.toml` in the repo so PRISM's dogfood install works, but `.gitignore` keeps it out of commits and the install script doesn't push it to the home directory.

## Cursor: no install step

Cursor reads skills from `.cursor/skills/<id>/SKILL.md` directly in the repo. Since `.cursor/skills/` is committed (per [ADR-0044](https://github.com/HunterMcGrew/PRISM/blob/main/.prism/spec/adrs/0044-direct-write-tool-outputs.md)), Cursor consumers get every persona on `git pull` — no install step required.

This is the Phase 1.5f change. Before it, `.cursor/skills/` was generated and gitignored, so Cursor users had to run an install script to populate it. Now the build writes there directly and the directory is committed; the install script for Cursor went away.

## Why the split

The `build` / `install-codex` split is governed by the in-repo vs outside-repo rule:

- **In-repo destinations get sync.** The build writes directly to where the tool reads. The build IS the install.
- **Outside-repo destinations get install scripts.** The destination lives in the user's home directory, so the install script handles the copy from the repo's build output to the user's home.

The failure mode the rule prevents is staging-and-deploy drift — covered in detail in [`compatibility.md § The install-script rule`](./compatibility.md). The short version: a single staging-plus-install pipeline inevitably drifts as the build evolves; separating in-repo sync from outside-repo install removes the drift surface entirely.

## What happened to `.generated/`?

Pre-Phase-1.5f, the build wrote Cursor skills to `.generated/cursor-skills/` and Codex config to `.generated/codex-config.toml`, with `.gitignore` blanket-ignoring `/.generated/`, `/.cursor/`, and `/.codex/`. An install script then copied from staging to the live tool namespaces.

Phase 1.5f removed the staging directory and the install script that fed off it. Cursor skills land directly at `.cursor/skills/` (committed); Codex config lands directly at `.codex/codex-config.toml` (ignored). If you have a stale clone with a `.generated/` directory, delete it after pulling:

```bash
rm -rf .generated/
```

The build won't recreate it. The full reasoning lives in [ADR-0044](https://github.com/HunterMcGrew/PRISM/blob/main/.prism/spec/adrs/0044-direct-write-tool-outputs.md).
