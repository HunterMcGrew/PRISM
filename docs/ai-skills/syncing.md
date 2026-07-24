---
title: Syncing
description: The commands developers use to keep PRISM's platform outputs in sync.
---

# Syncing

PRISM's sync model has one command:

```bash
pnpm prism:build         # regenerate platform outputs from .ai-skills/ and .prism/
```

This page explains what `pnpm prism:build` does, when to run it, and how Codex's skill bodies reach `.agents/skills/` without a separate per-user install step.

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

## Codex skill bodies — no install step

Codex's skills root, `.agents/skills/`, resolves repo-relative — not `~/.agents/skills/` — so `pnpm prism:build` populates it directly, the same render pass that writes `.claude/skills/` and `.cursor/skills/`. Consumer repos get the same behavior from `prism update`/`prism adopt` (ADR-0062). `.agents/` stays gitignored as machine-local output, not because population is unshipped.

`.codex/codex-config.toml` is per-user (personality, projects, marketplaces) and stays gitignored for the same reason — the build writes it locally so PRISM's own dogfood install works, but never commits it.

## Cursor: no install step

Cursor reads skills from `.cursor/skills/<id>/SKILL.md` directly in the repo. Since `.cursor/skills/` is committed (per [ADR-0044](https://github.com/HunterMcGrew/PRISM/blob/main/.prism/spec/adrs/_toolkit/0044-direct-write-tool-outputs.md)), Cursor consumers get every persona on `git pull` — no install step required.

This is the Phase 1.5f change. Before it, `.cursor/skills/` was generated and gitignored. PRISM never shipped a Cursor install script (the upstream dogfood had one; PRISM was extracted before that script was added). So pre-1.5f, Cursor consumers of PRISM had no clean install path — direct-write + commit closes that gap.

## Why the split

The build vs install-script split is governed by the in-repo vs outside-repo rule:

- **In-repo destinations get sync.** The build writes directly to where the tool reads. The build IS the install.
- **Outside-repo destinations get install scripts.** No PRISM destination is currently outside the repo — the rule is retained for a future tool integration whose destination genuinely lives outside the repo.

The failure mode the rule prevents is staging-and-deploy drift — covered in detail in [`compatibility.md § Install-Script Scope`](./compatibility.md). The short version: a single staging-plus-install pipeline inevitably drifts as the build evolves; separating in-repo sync from outside-repo install removes the drift surface entirely.

## What happened to `.generated/`?

Pre-Phase-1.5f, the build wrote Cursor skills to `.generated/cursor-skills/` and Codex config to `.generated/codex-config.toml`, with `.gitignore` blanket-ignoring `/.generated/`, `/.cursor/`, and `/.codex/`. The build wrote to staging, but PRISM never shipped a downstream install script to copy from staging to the live tool namespaces — the staging directory existed without a consumer.

Phase 1.5f removed the staging directory entirely. Cursor skills land directly at `.cursor/skills/` (committed); Codex config lands directly at `.codex/codex-config.toml` (ignored). If you have a stale clone with a `.generated/` directory, delete it after pulling:

```bash
rm -rf .generated/
```

The build won't recreate it. The full reasoning lives in [ADR-0044](https://github.com/HunterMcGrew/PRISM/blob/main/.prism/spec/adrs/_toolkit/0044-direct-write-tool-outputs.md).
