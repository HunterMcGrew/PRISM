---
title: "pnpm prism:migrate-skill — decompose a generated skill back to source"
description: "How the migrate-skill CLI reverses pnpm prism:build — turning a generated SKILL.md or Codex TOML back into canonical .ai-skills/ source."
category: "ai-skills"
audience: "dev"
last_updated: "2026-06-16"
---

## What it does

`pnpm prism:migrate-skill` decomposes a generated skill artifact back into canonical source under `.ai-skills/skills/<id>/`. It is the reverse of `pnpm prism:build`.

The build pipeline takes canonical source (`frontmatter.yml` + `shared.md`) and generates per-platform copies: `.claude/skills/<id>/SKILL.md`, `.cursor/skills/<id>/SKILL.md`, `.agents/skills/<id>/SKILL.md`, and `.codex/agents/<id>.toml`. This script goes the other direction — you hand it one of those generated files and it recovers the source.

This fills a gap that comes up when skills are developed directly inside a platform directory (Claude Code, Cursor, Codex) without starting from canonical source first. The generated file exists; the canonical source doesn't. Running `pnpm prism:migrate-skill` on the generated file brings it into the build pipeline so all four platform copies stay in sync going forward.

The CLI is the executable form of the guided migrate procedure in the `prism-skill-forge` skill. It handles the mechanical case — one generated copy, unambiguous shape, no platform divergence. When the script flags ambiguity (multiple platform copies that may have diverged, uncertain persona detection, substituted token values), fall back to the step-by-step procedure in `prism-skill-forge`.

## When to use it

- You authored a skill directly in `.claude/skills/`, `.cursor/skills/`, `.agents/skills/`, or `.codex/agents/` and want to bring it into the canonical build pipeline.
- You received a generated SKILL.md from another repo (a consumer sending a contribution back to PRISM) and need to import it as canonical source.
- You want to check what the decomposed source would look like before writing anything — use `--dry-run`.

## How it works

The CLI performs four operations in sequence:

**1. Source-shape detection.** The script infers which platform generated the artifact from the file path: a `.toml` extension is Codex; a path containing `.claude/` is Claude; `.cursor/` is Cursor; `.agents/` is Agents. When the path gives no signal (a file copied out of its original location), pass `--platform` explicitly.

**2. Decomposition.** For Markdown shapes (`.claude`, `.cursor`, `.agents`), the script splits on the frontmatter delimiters and strips the three-line AUTO-GENERATED HTML header block that `prism:build` injects. The recovered frontmatter becomes `frontmatter.yml`; the remainder becomes `shared.md`. For the Codex TOML shape, the script unwraps the `developer_instructions` multiline block, strips three scaffolding lines (`You are <Name>.`, `Canonical skill source: …`, `Follow this generated skill definition:`), and passes the embedded skill Markdown to the same decomposer — no separate parser needed. The Codex path also recovers the persona name for the `roles.json` entry.

**3. ID normalization.** The script normalizes the skill ID for the target repo. A `prism-<role>` ID from a PRISM-generated artifact gets re-prefixed with the consumer's org token from `.ai-skills/config.json` — producing `<org>-<role>`. When no org token is set, the prefix is `custom`. When the repo's own org token is `prism` (PRISM's own config), the ID stays `prism-<role>` — this is a PRISM-internal contribution, not a consumer namespace reclaim. `--id` always overrides normalization verbatim.

**4. Write canonical source and register the role.** The script writes `frontmatter.yml` and `shared.md` under `.ai-skills/skills/<id>/`, creating the directory if needed. Existing files are skipped unless `--force` is passed — re-runs are safe. It also appends an entry to `.ai-skills/definitions/roles.json`: `{ "id": "<id>", "persona": "<Name>" }` for persona skills, or `{ "id": "<id>", "type": "utility" }` for utility skills. The entry is skipped if one already exists for that ID.

After the script runs, the skill enters the build pipeline. Run `pnpm prism:build` to generate all four platform copies, then `pnpm prism:check` to confirm zero drift.

> [!NOTE]
> The generated artifact may contain substituted token values (`org`, `project`, `slackChannel`, etc.) that were filled in by the build pipeline from your team's config. The script prints a reminder to scan `shared.md` for team-specific strings and replace them with `${TOKEN}` placeholders before committing to canonical source. Reverse-substitution is not automated.

## Flags and arguments

```
pnpm prism:migrate-skill <source> [--id <new-id>] [--platform <claude|cursor|agents|codex>] [--force] [--dry-run]
```

| Argument / Flag | Required | Description |
| --- | --- | --- |
| `<source>` | Yes | Path to the generated artifact. Accepts a file (e.g. `.claude/skills/prism-changelog/SKILL.md`) or a skill directory (e.g. `.claude/skills/prism-changelog/`) — the script resolves `SKILL.md` inside a directory automatically. Also accepts a `.codex/agents/<id>.toml` file. |
| `--id <new-id>` | No | Override the normalized skill ID. Use this when contributing a `prism-*` skill back to PRISM, or when you want a specific ID that differs from what normalization would produce. Takes precedence over all other ID logic. |
| `--platform <shape>` | No | Override source-shape autodetection. One of `claude`, `cursor`, `agents`, `codex`. Required when the source file has been moved out of its original platform directory and the path no longer carries the platform signal. |
| `--force` | No | Overwrite existing canonical files. Without this flag, the script skips writing if `frontmatter.yml` or `shared.md` already exist — protecting hand-edited canonical source from accidental overwrite. |
| `--dry-run` | No | Print the planned writes (target paths and first line of each file) and the `roles.json` delta, then exit without writing anything. Useful for previewing before committing. |

## Example usage

Migrate a Claude-generated skill into canonical source:

```bash
pnpm prism:migrate-skill .claude/skills/prism-my-skill/SKILL.md
```

Migrate a Codex TOML with an explicit ID override:

```bash
pnpm prism:migrate-skill .codex/agents/prism-my-skill.toml --id acme-my-skill
```

Preview what the script would write without touching any files:

```bash
pnpm prism:migrate-skill .agents/skills/prism-my-skill/SKILL.md --dry-run
```

Migrate a skill whose file was copied out of its platform directory:

```bash
pnpm prism:migrate-skill ~/Downloads/SKILL.md --platform cursor --id acme-my-skill
```

After migrating, complete the round-trip:

```bash
pnpm prism:build && pnpm prism:check
```

## Outputs

| Path | Description |
| --- | --- |
| `.ai-skills/skills/<id>/frontmatter.yml` | Recovered frontmatter (`name`, `description`, optional `argument-hint`). Written verbatim from the generated artifact — the build normalizes it on the next rebuild. |
| `.ai-skills/skills/<id>/shared.md` | Recovered skill body with the AUTO-GENERATED header block stripped. |
| `.ai-skills/definitions/roles.json` | Updated with a new entry for the migrated skill ID (skipped if the entry already exists). |

## Error cases

| Situation | What happens |
| --- | --- |
| `<source>` path does not exist | Exits 1 with a clear message naming the path. |
| No frontmatter found in the source file | Exits 1: `Missing or invalid frontmatter in <path>`. |
| Codex TOML missing `description` or `developer_instructions` | Exits 1 naming which field is absent. |
| Platform cannot be detected from path and `--platform` is not passed | Exits 1 with a message explaining why and naming the flag. |
| `--platform` is passed with an invalid value | Exits 1 listing the four valid values. |
| Sibling platform copies detected (same skill ID in multiple platform dirs) | Prints a note that multi-copy delta recovery is not automated — diff manually if the copies may have diverged. Continues writing. |

## Relationship to prism-skill-forge

The `prism-skill-forge` skill has a guided **Migrate mode** that walks the same decomposition as a step-by-step procedure: detecting shape, decomposing, normalizing the ID, recovering the persona, handling the re-tokenization pass, and registering the role. That procedure remains the authority for judgment calls — ambiguous persona detection, per-platform delta recovery when copies have diverged, token mapping.

`pnpm prism:migrate-skill` automates the unambiguous mechanical path: a single generated copy, clear shape, no divergence. Use the CLI first; fall back to the guided procedure when the CLI prints an advisory or when the situation involves multiple diverged copies.

## See also

- [`scripts/ai-skills/migrate-skill.ts`](https://github.com/HunterMcGrew/PRISM/blob/main/scripts/ai-skills/migrate-skill.ts) — the CLI source
- [`.ai-skills/skills/prism-skill-forge/shared.md`](https://github.com/HunterMcGrew/PRISM/blob/main/.ai-skills/skills/prism-skill-forge/shared.md) — the guided migrate procedure and Create mode
- [`docs/ai-skills/syncing.md`](./syncing.md) — how `pnpm prism:build` generates the per-platform copies this CLI reverses
