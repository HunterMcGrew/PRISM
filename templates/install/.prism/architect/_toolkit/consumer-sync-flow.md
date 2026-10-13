# Consumer Sync Flow

How `prism init`, `prism adopt`, and `prism update` put PRISM's content into a consumer repo and keep it current. What lands where, and who owns it once it is there, is [`install-layout.md`](./install-layout.md). The hook runtime that rides the same update is [`hook-runtime.md`](./hook-runtime.md).

---

## First-contact adoption: `prism init` then `prism adopt`

A cold consumer — a repo that has never had PRISM — needs to run two commands before the agent-driven onboarding begins:

1. **`npx @huntermcgrew/prism init`** — writes `.ai-skills/config.json` so the consumer repo is identifiable. This is deterministic and requires no AI agent: it detects the tech stack, collects a handful of required values (project name, ticket prefix, ticket system, GitHub owner, and repo), and writes the config. When stdin is a TTY, it prompts interactively. In CI or scripted contexts, pass the same values as flags: `--project`, `--ticket-prefix`, `--ticket-system` (`linear` or `github-issues`), `--github-owner`, `--github-repo`. `--linear-team` is required with `--ticket-system linear`. The other optional flags are `--org`, `--linear-workspace`, `--default-branch`, `--slack-channel`. `init` refuses and exits if a config already exists — edit the file directly or remove it to re-init. `init` writes only `config.json` and nothing else; adopt, update, and Atlas are responsible for everything after it.

2. **`npx @huntermcgrew/prism adopt`** — seeds `.prism/` and projects the full persona roster. This is the first-contact install step described in the section below. If adopt detects that `config.json` is missing, it stops and tells the consumer to run `init` first. Adopt also self-heals the consumer's `.ai-skills/definitions/paths.json` — provisioning it from the PRISM package copy when it is absent or structurally incomplete (an older schema missing `generated.platformContentCopies`) — so the cold `init`→`adopt` path is robust against a `paths.json` that `init` never writes; a complete consumer file (even a customized one) is left untouched.

3. **(Later, in-agent) Atlas** — handles the richer, conversational onboarding: generating per-team rules, writing stack-appropriate security guidance, and populating stub anchors with team context. Atlas owns this layer because it requires judgment that a deterministic CLI step can't provide; adopt is seed-and-sync rather than a merge engine.

The split is intentional: `init` is the repeatable, CI-safe bootstrap; Atlas is the AI-assisted configuration pass that runs once per team.

---

The install seed ([`install-layout.md`](./install-layout.md) § The templates/install seed surface) is what a consumer repo *receives*; `prism adopt` is what *lays it down* the first time. It is the install entry for a repo that has never had PRISM — an established team adopting PRISM into a codebase that already has its own setup.

`prism adopt` runs two steps in sequence:

1. **Seed `.prism/` from `templates/install/.prism/`.** Adopt recursively copies the install seed into the consumer's `.prism/`, writing only paths the consumer does **not** already have and skipping any that exist. It never overwrites an existing consumer file.
2. **Run the first sync.** Adopt then runs the same sync `prism update` runs, which applies PRISM-owned files and writes the steady-state baseline manifest. The no-op-before-`.bak` ordering means byte-identical consumer files are left untouched and only genuinely diverged files are preserved as `.bak` — so the first sync into an established repo with no baseline manifest is safe.

Around those two steps it provisions `paths.json` first and, with `--seed-agents-md`, writes an absent `AGENTS.md` last.

After this one run, `.prism/.sync-manifest.json` exists and the repo is in steady-state: `prism update` handles all future syncs.

**The manifest-exists refusal is the install-vs-steady-state guard.** Adopt checks for a `.sync-manifest.json` before seeding. If one is already present, it stops with `"prism:adopt: this repo already has a PRISM baseline — run pnpm prism:update for steady-state."` This mirrors `prism update`'s refusal to run when its source is the consumer itself: each entry point refuses the other's job so the two flows' preconditions stay clean. `--dry-run` previews the whole sequence with nothing written. First-contact's real safety is still recover-after-`.bak`: the seed never overwrites, and the sync no-ops byte-identical files and `.bak`-snapshots divergence.

## Steady-state persona-skill distribution

After the first `prism adopt` run, every subsequent `prism update` (and every future `prism adopt` on a fresh repo) automatically renders the full `prism-*` persona roster into the consumer's configured skill directories. Both entry points reach the same render step without duplication.

**What you receive.** For each `prism-*` skill in the PRISM source roster, the update renders the skill body with your own token map — `${PROJECT}` becomes your project name, `${TICKET_PREFIX}` becomes your ticket prefix, and so on — and writes the rendered output to the platform directory for each host your `hosts` config key declares, all three when the key is absent:

- `.claude/skills/<id>/SKILL.md` (Claude Code)
- `.agents/skills/<id>/SKILL.md` (Codex)
- `.cursor/skills/<id>/SKILL.md` (Cursor)

Codex agent adapters (`.toml`) and Claude agent definitions (`.md`) render into their respective output roots using the same token map. Every written skill directory carries the managed marker (`.ai-skill-generated`) so orphan cleanup knows what to remove — see [`install-layout.md`](./install-layout.md) § Skill namespace ownership.

**The consumer's tokens, not PRISM's.** The render reads its token values from the consumer's own `.ai-skills/config.json`, not any PRISM-side values. A skill body that says "Create an issue in ${PROJECT}" lands as "Create an issue in Acme" in an Acme consumer. No unresolved token literals survive in any rendered output — the leftover-token guard runs over the consumer's skill output roots immediately after the render and fails the update if any are found.

**Orphan cleanup.** When a persona is removed from the PRISM roster, the next `prism update` removes its skill directories from the consumer's platform dirs. Cleanup is gated on the managed marker, not on the `prism-*` prefix: a consumer-authored `prism-*`-named skill directory without the marker is never a delete target. The same cleanup fires a second way: drop a host from `hosts` and the next `prism update` sweeps that host's entire skill root, agent-definition root, Codex config, and platform content dir the same way — skill directories gated on the managed marker and agent files on the generated header line they carry, so your own files under those roots are never a delete target either — and a `codex-config.toml` you have replaced with your own content is left alone, since PRISM removes one only while it still carries the generated header it wrote. A persona leaving the roster and a host leaving `hosts` are the same cleanup at different granularity.

**Consumer-authored skills are untouched.** The render writes only to roster-member IDs, and cleanup deletes only marker-bearing directories that are no longer in the roster. A consumer's own skills — whether they use a non-`prism-*` prefix or a custom-prefixed name — are never written or deleted by `prism update`.

**The hook runtime rides the same update.** See [`hook-runtime.md`](./hook-runtime.md) for what it delivers, to which hosts, and how a consumer turns it off.

**Idempotency.** The render writes a file only when its content changed: if the rendered content matches the file already on disk, no write occurs. A `prism update` run on a repo already at the current PRISM version is a no-op across the roster.
