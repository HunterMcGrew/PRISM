---
load: always
---

# Lazy Artifacts

## Purpose

Personas don't create empty or header-only placeholder files at install time or session start. Files come into existence when content is being written, not before. This keeps the consumer's `.prism/` surface honest — every file the team sees has content; nothing is a placeholder waiting to be filled in.

**Why:** Speculative seeding produces "files in waiting" that consumers scan through and dismiss. The cost compounds: every empty seed adds a paper-tiger file the team scans past on every audit, and the seed quietly diverges from how the file would actually be created (different header text, different timestamp format, different metadata) when the real first write happens. The originating trip-point was `templates/install/.prism/lessons-archive.md` — a header-only file consumers got pre-installed even when Zoe had nothing to archive. It was never load-bearing; it just sat there until wave 2 removed it.

## When to apply

- **Persona state files** — return `null` or sentinel on absent. Don't auto-initialize at session start; create on first content write. Atomic-write protocol (write to `.tmp`, rename) for state files that consumers may read concurrently.
- **Archive files** — create with the standard header on the first archive move, not at install time.
- **Report directories** (`.prism/audits/`, `.prism/retros/`, etc.) — create the directory when writing the first report; don't `mkdir` empty.
- **Install templates** — never ship empty or header-only files under `templates/install/.prism/`. Consumers receive nothing until they have something to receive.

## Canonical patterns

- **Theo's state file** (`.prism/theo-state.json`) — returns `null` on absent; created on first phase advance. Atomic-write via `.tmp` + rename. See `.prism/skills/prism-doc-walker/lib/state.md`.
- **Pixel's mock directory** (`.prism/design/mocks/`) — created on first mode 2 spec save.
- **Zoe's audits directory** (`.prism/audits/`) — created on first audit run (see `prism-surface-audit/shared.md` § Output format).
- **Atlas's onboarding state** (`.ai-skills/registry/onboarding-state.json`) — written on first answer; not seeded at session start.
- **Zoe's lessons archive** (`.prism/archived/lessons-archive.md`) — created with the standard header on first archive move. Wave 2 removed the install-template seed that previously shipped this file empty.
- **Zoe's archived plans directory** (`.prism/archived/plans/`) — created on first confirmed plan archive move; not pre-seeded.

## Exception: schema-required structural stubs

Some files need non-empty contents to be valid for downstream consumers — a manifest with default pattern→file routing, a config file with sentinel keys downstream code reads. These aren't speculative seeds; they're structural starting points without which the system fails on first load.

The test: **would the system fail to function if the file were absent at install time?** If yes (and the missing content is structural, not example data), the stub stays. If no (header placeholder, empty array, "this fills in when you do X"), it's a lazy candidate.

`templates/install/.prism/architect/manifest.stub.json` is the canonical exception — ships with the default pattern→file routing table consumers depend on before Atlas customizes during onboarding. Removing it would break first-load architect-context lookups for fresh installs. The exception is content-bearing on install (default routes), not a header-only placeholder.

## Who runs this rule

Every persona that creates files in `.prism/` applies this rule. Cite it when:

- Writing a new persona spec that produces operational state
- Adding install-template content
- Reviewing a PR that introduces a new file in `.prism/` or `templates/install/.prism/`

Briar and Eric flag any install-template addition that ships empty as Minor in review — apply the schema-required-stub test before accepting it.
