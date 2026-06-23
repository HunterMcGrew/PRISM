---
title: "Getting Started"
description: "How to install PRISM into a new or existing repository."
category: "getting-started"
audience: "developer-user"
last_updated: "2026-06-16"
---

# Getting Started

This guide takes you from zero to a working PRISM install in your repository. By the end you'll have a configured `.claude/`, `.codex/`, or `.cursor/` directory written to your repo with personas, rules, and templates tailored to your stack.

## Prerequisites

- [pnpm](https://pnpm.io/) installed (`npm install -g pnpm`)
- Access to the PRISM repository
- A target codebase to install into

## Step 1 — Clone and build PRISM

PRISM lives as a sibling repo next to your codebase, not inside it.

```bash
# From the parent directory of your codebase
git clone https://github.com/HunterMcGrew/PRISM.git prism
cd prism
pnpm install
pnpm prism:build
```

`pnpm prism:build` generates platform-specific outputs (`.claude/`, `.codex/`, `.cursor/`) from the canonical sources in `.ai-skills/`. You only need to run this once per PRISM update.

## Step 2 — Run Atlas in your target repo

Open Claude Code (or Codex/Cursor) from inside your target codebase and invoke Atlas:

> "Atlas, onboard this repo."

Atlas will:

1. Detect your tech stack from your project files
2. Ask a few questions about your team's setup (org name, ticket prefix, GitHub repo, docs location, etc.)
3. Generate per-team engineering rules from patterns in your actual code
4. Write `.ai-skills/config.json` with your team's values
5. Track its progress in `.ai-skills/registry/onboarding-state.json` so an interrupted session can resume

If you already have engineering standards (ESLint configs, style guides, existing conventions), tell Atlas — it reads them and decides where each belongs in the tier system.

## Step 3 — Verify the install

After Atlas finishes, confirm the platform output landed correctly:

```bash
# Check that generated outputs are in sync with canonical sources
pnpm prism:check
```

Exit 0 means everything is in sync. If you see drift errors, run `pnpm prism:build` to regenerate.

## Step 4 — Start using personas

From inside your target repo, invoke personas by name or by intent:

- **Planning architecture:** "Winston, plan this out." or describe an architecture question
- **Implementing:** "Clove, implement this." or start writing about a feature
- **Reviewing:** "Briar, review my changes." before opening a PR
- **Documenting:** "Eli, document this." after shipping a feature

See [workflow.md](./workflow.md) for the full ticket-to-ship flow, and [personas.md](./personas.md) for what each persona owns and hands off to.

## Keeping PRISM up to date

Pull the latest PRISM changes and rebuild:

```bash
cd /path/to/prism
git pull
pnpm install
pnpm prism:build
```

Then re-run `pnpm prism:check` in your target repo to verify the install is still in sync.

## Config reference

Your install is parameterized by `.ai-skills/config.json`. Atlas writes this during onboarding; you can edit it manually too. See [parameterization.md](./parameterization.md) for the full field reference and all available tokens.

## The prism command (consumer shortcut)

Once you've cloned PRISM locally, you can install a `prism` command that runs `prism adopt` and `prism update` from any consumer repo without supplying path arguments. See [adopt-prism.md](./adopt-prism.md) for the one-time setup and the steady-state workflow.

## Going deeper

The onboarding architecture — stack detection, rule generators, stub-anchor population — is documented in the Atlas skill at `.ai-skills/skills/prism-onboarding/`. The ADRs for the install layout and parameterization model live in [`.prism/spec/adrs/`](../.prism/spec/adrs/).
