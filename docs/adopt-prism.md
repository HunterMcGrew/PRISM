---
title: "Adopt PRISM into your repo"
description: "How to adopt PRISM into a consumer repo — via npx (recommended), or via a local checkout for air-gapped environments and contributors."
category: "getting-started"
audience: "developer-user"
last_updated: "2026-06-27"
---

# Adopt PRISM into your repo

`prism adopt` seeds `.prism/` and projects the full persona roster into your repo. `prism update` keeps it current. This guide covers the recommended path — running PRISM directly from npm — and the checkout-based alternatives for air-gapped environments, customization, and contributors.

## Before you adopt: `prism init`

`prism adopt` requires a config file — `.ai-skills/config.json` — to know which project it's seeding. If this is your first time bringing PRISM into this repo, run `init` first:

```bash
cd your-repo
npx @huntermcgrew/prism init
```

`init` asks for your project name, ticket prefix, ticket system (`linear` or `github-issues`), and GitHub owner/repo, then writes the config. It detects your tech stack automatically. In CI or scripts, pass the same values as flags (`--project`, `--ticket-prefix`, etc.) instead of answering prompts.

Once the config is written, run `adopt` below. After that, open Claude Code and run Atlas for the richer, AI-assisted onboarding (per-team rules, stack-specific guidance, anchor population).

## Recommended: npx

Run PRISM directly from npm — no clone, no global install, no PATH setup.

```bash
cd your-repo
npx @huntermcgrew/prism adopt
```

After this runs, open Claude Code in `your-repo` and the personas are available: "Winston, plan this out." "Clove, implement this." "Briar, review my changes."

**Steady state.** Once your repo is adopted, keep it current:

```bash
npx @huntermcgrew/prism update
```

`prism update` refreshes canonical content under `.prism/` and regenerates platform outputs. It's idempotent — running it twice in a row produces the same result.

**Pinning vs. latest.** npm versions are immutable — a published version never changes after release. We recommend pinning to a specific version so your team adopts at a known point and updates intentionally:

```bash
npx @huntermcgrew/prism@1.0.0 adopt   # pinned — reproducible across machines
npx @huntermcgrew/prism@latest adopt  # always pulls the current release
```

Pinning is especially useful for teams adopting PRISM in a CI context or across multiple machines. When you're ready to update, pin to the next version deliberately.

## Alternative install methods

These paths are for air-gapped environments, teams that want to customize PRISM's source directly, or contributors to PRISM itself. For everyone else, `npx @huntermcgrew/prism adopt` is the right starting point.

### Vendor PRISM inside your repo

Clone PRISM as a subdirectory of your consumer repo, then run `pnpm prism:adopt` from inside the clone. No global link, no PATH setup, and you control exactly which commit you're on.

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

**Steady state with a vendored checkout:**

```bash
cd your-repo/PRISM
git pull
pnpm install
pnpm prism:update
```

**Nesting depth and submodule support.** The vendored path works at any nesting depth — `your-repo/PRISM`, `your-repo/tools/PRISM`, and deeper all resolve correctly to the consumer repo root. PRISM as a git submodule works the same way.

### Global `prism` command

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

### `--consumer` flag (checkout beside the repo)

Pass `--consumer <path>` to target a specific directory instead of the auto-detected enclosing repo. Useful when PRISM is checked out beside the consumer rather than inside it:

```bash
pnpm prism:adopt --consumer /path/to/your-repo
pnpm prism:update --consumer /path/to/your-repo
```

The explicit flag always takes priority over auto-detection. Both commands also accept `--prism-source <path>` if you have multiple PRISM checkouts and want to point at a specific one.

## First contact — prism adopt

`prism adopt` seeds `.prism/` and projects the full persona roster into `.claude/`, `.cursor/`, and `.codex/` (whichever platforms are relevant to your setup).

`prism adopt` is a first-contact command. It refuses to run a second time once `.prism/` already has a sync record — that's the signal that the repo is already adopted, and `prism update` is the right command from that point on.

## Preview a run with `--dry-run`

Both `adopt` and `update` accept `--dry-run`. It runs the full classification pass — every file still gets a `written` / `no-op` / `overwritten` / `backed-up` / `removed` decision — but nothing is written, overwritten, or removed:

```bash
npx @huntermcgrew/prism update --dry-run
npx @huntermcgrew/prism adopt --dry-run
```

The printed summary is the same shape a real run produces, prefixed with `(dry run)` so it's unambiguous in CI logs. Useful before a first `adopt` on an unfamiliar repo, or before an `update` when you want to see how many files have diverged and would get a `.bak` before committing to the sync.

`pnpm prism:adopt --dry-run` and `pnpm prism:update --dry-run` work the same way from a local checkout.

## Safety checks before any write

Before either command writes a single file, it runs two checks:

- **Config validation.** `.ai-skills/config.json` is validated against the schema — required fields, the `ticketPrefix` pattern, `ticketSystem.kind`, and `techStack` entries all have to be valid. A hand-edited config that fails validation is rejected with the specific field that's wrong, before any file is touched.
- **Git-repo check.** The target directory has to be inside a git repository. PRISM writes files that should be reviewable and revertable via `git diff` / `git checkout` — running adopt or update outside version control (a bad `--consumer` path, or a stray invocation) is refused with a clear message instead of silently writing ungoverned files.

Both checks apply whether or not `--dry-run` is set.

## Help

```bash
npx @huntermcgrew/prism --help
```

Prints available subcommands and flags.

## What's running under the hood

Whether you run `npx @huntermcgrew/prism adopt`, `pnpm prism:adopt`, or `prism adopt` via a global link, the same underlying adopt script runs. The three invocation paths are dispatchers — the logic is identical. If you're debugging an unexpected result, `adopt.ts` and `update.ts` in the PRISM repository are the source of truth.
