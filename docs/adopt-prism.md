---
title: "Adopt PRISM into your repo"
description: "How to adopt PRISM into a consumer repo — vendored inside the repo (recommended) or via a global prism command."
category: "getting-started"
audience: "developer-user"
last_updated: "2026-06-23"
---

# Adopt PRISM into your repo

`prism adopt` seeds `.prism/` and projects the full persona roster into your repo. `prism update` keeps it current. This guide covers the two ways to run those commands.

## What you need

- [pnpm](https://pnpm.io/) installed (`npm install -g pnpm`)
- Access to PRISM (clone or submodule — see below)
- A consumer repo you want to bring into PRISM

## Recommended: vendor PRISM inside your repo

Clone or add PRISM as a subdirectory of your consumer repo, then run `pnpm prism:adopt` from inside it. No global link, no PATH setup.

```bash
# Clone PRISM into your repo (or use a submodule — both work)
cd your-repo
git clone https://github.com/HunterMcGrew/PRISM.git PRISM

# Install and adopt
cd PRISM
pnpm install
pnpm prism:adopt
```

`pnpm prism:adopt` detects that it's running from inside a PRISM checkout and automatically targets the enclosing repo — `your-repo` in this case. You don't pass any path arguments; the command figures it out.

After this runs, open Claude Code in `your-repo` and the personas are available: "Winston, plan this out." "Clove, implement this." "Briar, review my changes."

**Steady state.** Once your repo is adopted, pull in PRISM's latest on your own cadence:

```bash
cd your-repo/PRISM
git pull
pnpm install
pnpm prism:update
```

`pnpm prism:update` refreshes canonical content under `.prism/` and regenerates platform outputs. It's idempotent — running it twice in a row produces the same result.

**Nesting depth and submodule support.** The vendored path works at any nesting depth — `your-repo/PRISM`, `your-repo/tools/PRISM`, and deeper all resolve correctly to the consumer repo root, not an intermediate directory. PRISM as a git submodule works the same way.

## First contact — prism adopt

`pnpm prism:adopt` seeds `.prism/` and projects the full persona roster into `.claude/`, `.cursor/`, and `.codex/` (whichever platforms are relevant to your setup).

`prism adopt` is a first-contact command. It refuses to run a second time once `.prism/` already has a sync record — that's the signal that the repo is already adopted, and `prism update` is the right command from that point on.

## Override the consumer target

Pass `--consumer <path>` to target a specific directory instead of the auto-detected enclosing repo. Useful when PRISM is checked out beside the consumer rather than inside it, or when you want to adopt a repo that isn't the one enclosing PRISM:

```bash
pnpm prism:adopt --consumer /path/to/your-repo
pnpm prism:update --consumer /path/to/your-repo
```

The explicit flag always takes priority over auto-detection.

Both commands also accept `--prism-source <path>` if you have multiple PRISM checkouts and want to point at a specific one. The explicit flag takes priority over the auto-derived location.

## Alternative: global `prism` command

If you manage many consumer repos from one PRISM clone, you can install a global `prism` command so you can run `prism adopt` and `prism update` from any consumer directory without entering the PRISM clone each time.

```bash
cd /path/to/your/prism-clone
pnpm install
pnpm link --global
```

Then from any consumer repo:

```bash
cd /path/to/your-repo
prism adopt
prism update
```

**PATH setup required.** `pnpm link --global` puts the binary into pnpm's global bin directory. If you've never used pnpm globals before, that directory may not be on your PATH. Run `pnpm setup` first to add it, then restart your shell. You'll know it worked when `which prism` returns a path inside pnpm's global dir.

When you pull a newer PRISM commit, run `pnpm install` in the clone again — the global link picks up the change automatically, no re-link needed.

The global command accepts the same flags as the vendored `pnpm prism:*` scripts, including `--consumer <path>` and `--prism-source <path>`.

## Help

```bash
pnpm prism:adopt --help
# or, if using the global command:
prism --help
```

Prints available subcommands and flags.

## What's running under the hood

`pnpm prism:adopt` and `prism adopt` call the same underlying adopt script. `pnpm prism:update` and `prism update` call the same update script. The vendored `pnpm prism:*` aliases and the global `prism` command are both dispatchers — the underlying logic is identical. If you're debugging an unexpected result, `adopt.ts` and `update.ts` in the PRISM repo are the source of truth.
