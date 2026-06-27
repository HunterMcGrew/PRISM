---
title: "Getting Started"
description: "How to install PRISM into a new or existing repository."
category: "getting-started"
audience: "developer-user"
last_updated: "2026-06-27"
---

# Getting Started

This guide takes you from zero to a working PRISM install in your repository. By the end you'll have a configured `.claude/`, `.codex/`, or `.cursor/` directory written to your repo with personas, rules, and templates tailored to your stack.

## Prerequisites

- Node.js 20+ and [pnpm](https://pnpm.io/) installed (`npm install -g pnpm`)
- A target codebase to install into

## Step 1 — Initialize config

From inside your target repo, run:

```bash
cd your-repo
npx @huntermcgrew/prism init
```

`prism init` asks for your project name, ticket prefix, ticket system (`linear` or `github-issues`), and GitHub owner/repo, then writes `.ai-skills/config.json`. It detects your tech stack automatically. In CI or scripts, pass values as flags (`--project`, `--ticket-prefix`, etc.) instead of answering prompts.

## Step 2 — Adopt PRISM

```bash
npx @huntermcgrew/prism adopt
```

`prism adopt` seeds `.prism/` from the PRISM install surface and projects the persona roster into `.claude/`, `.codex/`, and `.cursor/`. It's a first-contact command — it refuses to run a second time once `.prism/` already has a sync record; use `npx @huntermcgrew/prism update` from that point on.

## Step 3 — Run Atlas for AI-assisted onboarding

Open Claude Code (or Codex/Cursor) from inside your target codebase and invoke Atlas:

> "Atlas, onboard this repo."

Atlas will:

1. Detect your tech stack from your project files
2. Ask a few questions about your team's setup (org name, ticket prefix, GitHub repo, docs location, etc.)
3. Generate per-team engineering rules from patterns in your actual code
4. Fill in the stub anchors that `adopt` put in place
5. Track its progress in `.ai-skills/registry/onboarding-state.json` so an interrupted session can resume

If you already have engineering standards (ESLint configs, style guides, existing conventions), tell Atlas — it reads them and decides where each belongs in the tier system.

## Step 4 — Start using personas

From inside your target repo, invoke personas by name or by intent:

- **Planning architecture:** "Winston, plan this out." or describe an architecture question
- **Implementing:** "Clove, implement this." or start writing about a feature
- **Reviewing:** "Briar, review my changes." before opening a PR
- **Documenting:** "Eli, document this." after shipping a feature

See [workflow.md](./workflow.md) for the full ticket-to-ship flow, and [personas.md](./personas.md) for what each persona owns and hands off to.

## Keeping PRISM up to date

```bash
npx @huntermcgrew/prism update
```

`prism update` pulls PRISM's latest canonical content into your already-adopted repo. It's idempotent — running it twice in a row produces the same result. PRISM-owned files are overwritten when you haven't diverged from the last-known base; files you've edited are preserved as `.bak` snapshots.

## Config reference

Your install is parameterized by `.ai-skills/config.json`. `prism init` writes a baseline during first install; Atlas fills in per-team rules and stack-specific guidance during AI-assisted onboarding. You can edit the file manually at any time. See [parameterization.md](./parameterization.md) for the full field reference and all available tokens.

## Alternative install methods

The `npx` path is the recommended starting point. For air-gapped environments, contributor setups, or teams that want to pin to a specific PRISM commit, see [adopt-prism.md](./adopt-prism.md) — it covers vendoring PRISM inside your repo, setting up a global `prism` command, and the `--consumer` flag for targeting a specific directory.

## Going deeper

The onboarding architecture — stack detection, rule generators, stub-anchor population — is documented in the Atlas skill at `.ai-skills/skills/prism-onboarding/`. The ADRs for the install layout and parameterization model live in [`.prism/spec/adrs/`](../.prism/spec/adrs/).
