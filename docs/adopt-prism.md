---
title: "Adopt PRISM into your repo"
description: "How a consumer maintainer installs the prism command once and uses prism adopt / prism update to keep their repo in sync."
category: "getting-started"
audience: "developer-user"
last_updated: "2026-06-23"
---

# Adopt PRISM into your repo

So this guide gets you from zero to a working `prism` command — one you can run from any consumer repo without remembering internal script paths. The result: `prism adopt` on first contact, `prism update` every time you want to pull the latest, and nothing else to configure.

## What you need

- [pnpm](https://pnpm.io/) installed (`npm install -g pnpm`)
- A local PRISM clone (see [Getting Started](./getting-started.md) if you haven't cloned it yet)
- A consumer repo you want to bring into PRISM

## One-time setup

Do this once per machine. The `prism` command lives inside the PRISM clone; `pnpm link --global` puts it on your PATH so you can call it from anywhere.

```bash
cd /path/to/your/prism-clone
pnpm install
pnpm link --global
```

**Gotcha — pnpm global bin must be on PATH.** `pnpm link --global` puts the binary into pnpm's global bin directory. If you've never used pnpm globals before, that directory may not be on your PATH yet. Run `pnpm setup` first to add it, then restart your shell. You'll know it worked when `which prism` returns a path inside pnpm's global dir.

Once linked, `prism` is available from any directory on this machine. When you pull a newer PRISM commit, run `pnpm install` in the clone again — the global link picks up the change automatically, no re-link needed.

## First contact — prism adopt

From inside the consumer repo you want to set up:

```bash
cd /path/to/your-repo
prism adopt
```

`prism adopt` seeds `.prism/` and projects the full persona roster into `.claude/`, `.cursor/`, and `.codex/` (whichever platforms are relevant to your setup). No `--prism-source` argument is needed — the command knows where it lives.

After this runs, open Claude Code in your consumer repo and the personas are available: "Winston, plan this out." "Clove, implement this." "Briar, review my changes."

`prism adopt` is a first-contact command. It refuses to run a second time once `.prism/` already has a sync record — that's the signal that the repo is already adopted, and `prism update` is the right command from that point on.

## Steady state — prism update

Once a repo is adopted, pull in PRISM's latest on your own cadence:

```bash
cd /path/to/your-repo
prism update
```

`prism update` refreshes canonical content under `.prism/` and regenerates platform outputs. It's idempotent — running it twice in a row produces the same result. The command prints a summary of what changed.

## Override the auto-derived source

Both commands derive the PRISM source from their own location. If you have multiple PRISM checkouts and want to point at a specific one:

```bash
prism adopt --prism-source /path/to/other-prism-clone
prism update --prism-source /path/to/other-prism-clone
```

The explicit flag takes priority over the auto-derived location.

## Help

```bash
prism --help
```

Prints available subcommands. `prism` with no arguments does the same.

## What's running under the hood

`prism adopt` calls the same adopt script as `pnpm prism:adopt` in the PRISM repo. `prism update` calls the same update script as `pnpm prism:update`. The `prism` command is a dispatcher — it adds the global entrypoint and auto-derives the PRISM source, but the underlying logic is unchanged. If you're debugging an unexpected result, the PRISM repo's own `adopt.ts` and `update.ts` are the source of truth.
