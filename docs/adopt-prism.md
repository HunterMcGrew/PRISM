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

## Check install health with `prism doctor`

`prism doctor` runs the same config and git-repo checks as `adopt`/`update`, plus a sync-state and version report, and prints every finding in one pass — instead of a bad config only surfacing later as an opaque leftover-token build failure.

```bash
npx @huntermcgrew/prism doctor
```

`doctor` never writes anything; it's a read-only report. It checks:

- **Config validity.** Same schema validation `adopt`/`update` run — the offending field is named directly.
- **Git repo.** Confirms the target is inside a git repository.
- **Sync state.** Reads `.prism/.sync-manifest.json` and reports how many recorded files are PRISM-owned vs. consumer-owned, which PRISM-owned files have diverged from their recorded base (paired with any `.bak` siblings already on disk), and which recorded files are missing entirely. A repo that hasn't run `adopt` yet reports no manifest as informational, not an error.
- **Version.** Compares the installed PRISM version against the latest published on npm. When the network is unavailable or the package hasn't been published yet, this check degrades to "unavailable" rather than failing the whole command.

Unlike `adopt`/`update`, `doctor` doesn't stop at the first problem — every check runs regardless of what the others found, so you see everything wrong in one pass. It exits `0` when healthy and non-zero with the findings list printed when it isn't, which makes it a natural fit for a CI health-check step.

`pnpm prism:doctor` runs the same command from a local checkout.

## Ejecting PRISM

`prism eject` removes PRISM from a repo. It exists for the case where a team evaluates PRISM and decides not to keep it — adopting shouldn't read as lock-in.

```bash
npx @huntermcgrew/prism eject --yes
```

**What it removes:** every PRISM-owned `.prism/` file (the same `classifyPath` classification `prism update` uses), every projected `prism-*` skill and agent adapter under `.claude/`, `.codex/`, `.agents/`, and `.cursor/` — and, last, `.prism/.sync-manifest.json` itself.

**What it preserves:**

- Consumer-owned content — `plans/`, `lessons.md`, `custom/**`, flat `architect/*.md`, `architect/manifest.json`, flat `spec/adrs/*.md` — and any path the manifest doesn't recognize as PRISM-owned.
- Any `prism-`-prefixed skill or agent file that lacks PRISM's `.ai-skill-generated` marker (or, for the flat Codex/Claude agent adapters, the generated header line). That combination — the `prism-` prefix without the marker — means you hand-authored it, so eject never touches it.
- `AGENTS.md` and `CLAUDE.md`. Both are seeded once and commonly hand-edited afterward, so eject leaves them in place and instead reports what PRISM contributed: the delimited block markers in `AGENTS.md` you can delete by hand, and a note that `CLAUDE.md` was seeded by PRISM and may carry your own edits.

**The `.bak` guarantee.** If you edited a PRISM-owned file, eject backs it up to `.bak` (or the next free `.bak.N`, never clobbering an earlier snapshot) before removing it — the same backup primitive `prism update` uses for diverged files. Eject never destroys your edits silently; the completeness report lists every `.bak` path it wrote so you can find and review them afterward.

**`--yes` and `--dry-run`.** Like `adopt`/`update`, `eject` never writes without asking:

```bash
npx @huntermcgrew/prism eject             # dry run — prints what would happen, deletes nothing
npx @huntermcgrew/prism eject --dry-run   # same as above, explicit
npx @huntermcgrew/prism eject --yes       # performs the eject
```

Without `--yes`, eject computes the full report — every file and skill's outcome — and prints it, but performs no `fs` write. `--dry-run` is an explicit preview synonym and always wins: `eject --yes --dry-run` still previews only. This mirrors the `--dry-run` posture `adopt`/`update` already use.

**Re-adopting.** Because eject removes `.sync-manifest.json` last, `prism adopt` will run cleanly again afterward — eject leaves no tombstone that would block a future re-adopt.

`pnpm prism:eject` runs the same command from a local checkout.

## Help

```bash
npx @huntermcgrew/prism --help
```

Prints available subcommands and flags.

## What's running under the hood

Whether you run `npx @huntermcgrew/prism adopt`, `pnpm prism:adopt`, or `prism adopt` via a global link, the same underlying adopt script runs. The three invocation paths are dispatchers — the logic is identical. If you're debugging an unexpected result, `adopt.ts`, `update.ts`, and `doctor.ts` in the PRISM repository are the source of truth.
