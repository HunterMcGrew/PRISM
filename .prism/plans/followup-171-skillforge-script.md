# Plan: followup-171-skillforge-script

## Ticket

GitHub issue #171 — Follow-up: automate `prism-skill-forge` migrate mode as an executable script. Part of epic #154.

> Closed: <!-- set on close -->

---

## Goal

Add a `tsx` CLI that decomposes a consumer-side generated skill (any of the four source shapes) back into canonical `.ai-skills/` source with the ID normalized — the reverse of `pnpm prism:build`, generalizing the Claude-only `bootstrap-from-claude.ts`.

---

## Design

The build pipeline is the load-bearing constraint here. Three facts from `build.ts` / `rule-dialect.ts` shape every decision below:

1. **The generated SKILL.md body is `sharedBody + "\n\n" + platformBody`** with no delimiter between them (`buildSkillMarkdown`, build.ts:154). A *single* generated copy cannot losslessly recover the shared/platform split. When the per-platform files (`claude.md`/`codex.md`/`cursor.md`) are empty — the common case for every current skill — the entire body is `shared.md` and the split is trivially recoverable. When they're non-empty, recovery needs a multi-copy diff (Step 4 of the migrate procedure) and is best-effort.

2. **The codex `.toml` embeds the full generated codex SKILL.md** inside `developer_instructions = """ … """`, after three scaffolding lines (`You are <Name>.`, `Canonical skill source: …`, `Follow this generated skill definition:`). That embedded block *is* a skill-markdown form. So the TOML reverse unwraps the fence, strips the scaffolding, recovers the persona name + description, and then **delegates to the same skill-markdown decomposer** — it is not a separate parser. (`buildCodexAgentToml`, build.ts:163.)

3. **Round-trip is verified by idempotent rebuild, not byte-identity against the original file.** `normalizeFrontmatter` trims and the build re-folds frontmatter; a decompose→rebuild is not guaranteed byte-identical to the *original generated artifact*. It is guaranteed to converge: once canonical source exists, `pnpm prism:build` followed by `pnpm prism:check` reports zero drift. The done-condition's "round-trips back to canonical" is operationalized as **"`prism:check` is green after decompose + build,"** plus a content-equivalence spot check on the body. This is recorded as a Decision, not left implicit.

This CLI is the **executable complement** to the markdown migrate-mode procedure in `prism-skill-forge/shared.md` — it does not replace it (see Decisions → "CLI complements the skill body"). Both stay; the skill body gains one trigger line pointing at the script for the mechanical case.

---

## Implementation Tasks

### Clove (implementation)

The CLI is one new script — `scripts/ai-skills/migrate-skill.ts` — plus a `package.json` script entry and a test file. Model arg-parsing, `main()`/`isMain` guard, and IO helpers on `update.ts` and `bootstrap-from-claude.ts`. Reuse the exported helpers from `utils.ts` (`pathExists`, `ensureDirectory`, `readFileIfExists`, `listDirectories`, `stripSurroundingQuotes`) — do **not** re-implement them. The `splitFrontmatter` / `rewriteSkillIdReferences` / `writeIfMissingOrForce` patterns in `bootstrap-from-claude.ts` are module-private and not exported; replicate equivalent logic inline in the new script (the migrate procedure already says this).

1. **Create `scripts/ai-skills/migrate-skill.ts` with the CLI shell.**
   - Shebang `#!/usr/bin/env tsx`; file-level JSDoc describing the reverse-of-build purpose (cite that it generalizes `bootstrap-from-claude.ts`).
   - `repoRoot` resolution copied from `update.ts:391` pattern (`process.cwd()` for consumer use; this script runs from the repo being migrated). Do **not** use the `scriptDirectory/../..` form — a consumer runs this against their own repo, like `prism:update`.
   - Arg parsing — positional + flags, parsed with the same hand-rolled style as `update.ts` `resolvePrismSource` (no new dependency):
     - **positional 1 (required):** `<source>` — path to the generated artifact. Accepts a file (`.claude/skills/<id>/SKILL.md`, `.cursor/skills/<id>/SKILL.md`, `.agents/skills/<id>/SKILL.md`, `.codex/agents/<id>.toml`) or a skill directory (`.claude/skills/<id>/`), in which case the script resolves `SKILL.md` inside it.
     - **`--id <new-id>` (optional):** explicit target canonical ID. When omitted, derive per the ID-normalization rule (Task 4).
     - **`--platform <claude|cursor|agents|codex>` (optional):** override source-shape autodetection (Task 2).
     - **`--force` (optional):** overwrite existing canonical files. Default: skip-if-exists, mirroring `writeIfMissingOrForce` in `bootstrap-from-claude.ts:77` so a re-run never clobbers hand-edited canonical source.
     - **`--dry-run` (optional):** print the planned writes (target paths + first line of each) and the roles.json delta without writing anything. Exits 0.
   - `main()` + `isMain` direct-invocation guard copied from `update.ts:462`.
   - On any user error (missing source, unparseable frontmatter, ambiguous platform), throw a clear `Error`; the `main().catch` prints `error.message` and exits 1 (same shape as the two reference CLIs).

2. **Source-shape autodetection — `detectSourceShape(sourcePath): "claude" | "cursor" | "agents" | "codex"`.**
   - `.toml` extension → `codex`.
   - `.md` (or a directory containing `SKILL.md`) → inspect the path segments: a `.cursor/` ancestor → `cursor`; a `.claude/` ancestor → `claude`; a `.agents/` ancestor → `agents`. When the path gives no signal (e.g. a copied-out file), require `--platform` and throw a guidance error if absent.
   - `--platform` always wins when provided.
   - **Why the shape matters:** the three markdown shapes are nearly identical (all `buildSkillMarkdown` output), so shape mainly selects which per-platform delta file an extracted addition would land in (Task 5). The procedure's guidance — prefer `.agents` as least-dialected — is advisory; the decomposer handles all three identically at the body level.

3. **Skill-markdown decomposition — `decomposeSkillMarkdown(content): { frontmatter, body }`.**
   - Split on the frontmatter delimiters with the exact regex from `bootstrap-from-claude.ts:64` (`/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/`). Throw `Missing or invalid frontmatter in <path>` on no match.
   - **Strip generated markers from the body** before it becomes `shared.md`. The build injects, immediately after the closing `---`, the three-line HTML header block:
     ```
     <!-- AUTO-GENERATED FILE. DO NOT EDIT DIRECTLY. -->
     <!-- Source: .ai-skills/skills/<id> -->
     <!-- Target: <platform> | Regenerate with: pnpm prism:build -->
     ```
     Remove this exact block (match the three `<!-- … -->` lines; they are always contiguous and lead the body per build.ts:148–158). Trim the leading blank line left behind. Do **not** strip the `argument-hint:` or `description:` from frontmatter — those are canonical.
   - The frontmatter recovered here is already in the canonical `name:` + folded-`description:` shape the build emitted from `normalizeFrontmatter`, so it round-trips. Write it verbatim into `frontmatter.yml` (the build re-normalizes on rebuild). **Do not reformat the `description` folded scalar** — preserving the `>` shape is what keeps `parseFrontmatter` honest (lessons.md 2026-06-04: plain multi-line continuation silently truncates).

4. **ID normalization — `normalizeSkillId(rawId, config): string`.**
   - `rawId` is the source skill ID: for markdown, the `name:` value from frontmatter (fall back to the directory name); for codex, the `name = "…"` TOML key.
   - Apply the consumer-namespace rule from `ownership.ts` (`PRISM_OWNED_GLOBS` JSDoc) and the migrate procedure Step 5:
     - If `--id` is given, use it verbatim (caller is explicit — e.g. contributing a `prism-*` skill back to PRISM).
     - Else strip a leading `prism-` (the source was a PRISM-generated copy a consumer is reclaiming) and re-prefix with the consumer's org token: read `org` from `.ai-skills/config.json` via `loadConfig` (`lib/tokens.ts`), lowercase it, producing `<org>-<role>`. When no `org` token is set, use `custom-<role>`.
     - **Exception:** if the resolved org token *is* `prism` (this repo's own config has `"org": "PRISM"`), the normalized ID stays `prism-<role>` — a skill migrated inside the PRISM repo itself is a PRISM contribution. Document this branch in a JSDoc line so it doesn't read as a bug.
   - Apply `rewriteSkillIdReferences`-equivalent: replace literal occurrences of the old ID with the new ID across the extracted `frontmatter` and `body` so cross-skill triggers stay coherent (mirror `bootstrap-from-claude.ts:50`). Build the rename pair as `[rawId, normalizedId]`; skip the rewrite when they're equal.

5. **Codex TOML decomposition — `decomposeCodexToml(content): { frontmatter, body, persona }`.**
   - Reverse `buildCodexAgentToml` (build.ts:163):
     - Drop the leading generated header block (the `# AUTO-GENERATED …` / `# Source: …` / `# Target: …` lines — match against `GENERATED_HEADER_LINE` from `utils.ts`).
     - Recover `description` from the `description = "…"` line; unescape with the inverse of `escapeToml` (`\\n`→newline, `\\r`→CR, `\\"`→`"`, `\\\\`→`\\`). Recover the skill ID from `name = "…"` the same way.
     - Extract the `developer_instructions = """ … """` multiline block; unescape with the inverse of `escapeTomlMultiline` (`\\"\\"\\"`→`"""`, `\\\\`→`\\`).
     - Inside that block, drop the scaffolding lines: the optional `You are <Name>.` opener (capture `<Name>` as `persona`), `Canonical skill source: .ai-skills/skills/<id>`, and `Follow this generated skill definition:`. What remains, from the first `---` onward, **is a skill-markdown document** — pass it straight to `decomposeSkillMarkdown` (Task 3) to recover frontmatter + body. This is the delegation that keeps the codex path from being a second full parser.
   - Carry `persona` (and `description`, if the embedded frontmatter somehow lacks it) forward to the roles.json registration (Task 7).

6. **Per-platform delta recovery (best-effort, behind a flag-free default).**
   - Default behavior: write the whole decomposed body to `shared.md`; leave `claude.md`/`codex.md`/`cursor.md` absent (per `lazy-artifacts.md` — no header-only placeholders). This is correct for every current skill (all per-platform files empty).
   - When the user points the CLI at a directory that has sibling generated copies for the same ID across platforms (rare), the script **prints a note** that multi-copy delta recovery is not automated in v1 and to diff manually if the platforms diverged. Do not attempt the diff in v1 — flag it. (Matches migrate procedure Step 4: "best-effort — flag for human review, do not block.")

7. **Write canonical source + register the role.**
   - Write `.ai-skills/skills/<normalized-id>/frontmatter.yml` and `shared.md` via a local `writeIfMissingOrForce` (replicate `bootstrap-from-claude.ts:77`): skip if present unless `--force`; `ensureDirectory` first; trailing-newline normalize (`${content.trim()}\n`).
   - **Register the role** in `.ai-skills/definitions/roles.json`: read+parse, append `{ "id": "<normalized-id>", "persona": "<Name>" }` for a persona shape (codex source, or markdown whose body opens `You are <Name>`), or `{ "id": "<normalized-id>", "type": "utility" }` for a utility shape (no persona recoverable). Skip if an entry with that `id` already exists. Re-serialize with tab indent + trailing newline to match the existing file's formatting (the file uses tabs — confirm before writing and match exactly so the diff is minimal). In `--dry-run`, print the delta instead of writing.
   - **Detecting persona vs utility:** codex source → always persona (utility skills generate no `.toml`, build.ts:1255). Markdown source → persona if the recovered body's first non-blank line is `You are <Name>.`; else utility. When ambiguous, default to utility and print a one-line note to set the persona manually — never guess a human name.

8. **Re-tokenize substituted literals (best-effort).**
   - The build runs `substituteTokens` (`org`, `slackChannel`, etc.) on the way out, so a consumer's generated file carries resolved literals. Reverse-substitution is lossy. In v1, **do not auto-reverse**; instead, after writing, print a one-line reminder naming the config tokens (`org`, `project`, `slackChannel`, …) and advising a manual scan if the skill embedded team-specific strings. Record as a Decision (see "Re-tokenizing is out of v1 scope"). This matches the migrate procedure's "best-effort, flag every uncertain case, never block."

9. **Add the `package.json` script entry.**
   - `"prism:migrate-skill": "tsx scripts/ai-skills/migrate-skill.ts"`, placed alphabetically among the `prism:*` scripts. Invocation becomes `pnpm prism:migrate-skill <source> [--id …] [--platform …] [--force] [--dry-run]`.

10. **Write `scripts/ai-skills/migrate-skill.test.ts`.**
    - Named `*.test.ts` so `pnpm prism:test` (`tsx --test scripts/ai-skills/*.test.ts`) picks it up automatically.
    - Export the pure helpers (`detectSourceShape`, `decomposeSkillMarkdown`, `decomposeCodexToml`, `normalizeSkillId`) from the script (alongside the `isMain`-guarded `main`) so the test imports them without running `main` — mirror how `build.ts` exports `buildCodexAgentToml` for `claude-agent-def.test.ts`.
    - **Round-trip tests, one per source shape** (the done-condition), using `__fixtures__` or generating fixtures from the live `.claude`/`.cursor`/`.agents`/`.codex` outputs of a real skill (see Acceptance Criteria for the named skills): decompose → assert the recovered `frontmatter`/`body` match the canonical source the build started from (body equality after marker-strip; frontmatter equality after `normalizeFrontmatter`).
    - Unit tests for `normalizeSkillId`: `prism-foo` + org `acme` → `acme-foo`; `prism-foo` + org `PRISM` → `prism-foo` (the in-PRISM exception); `prism-foo` + no org → `custom-foo`; `--id bar-baz` → `bar-baz` verbatim.
    - Codex TOML unescape round-trip: a string with `"""`, backslashes, and newlines survives `escapeTomlMultiline` → decompose.

11. **Verify the round-trip end-to-end (the done-condition gate).**
    - Pick one real skill per source shape (Acceptance Criteria names them). For each: copy its generated artifact to a scratch path, run the CLI against it with `--id <its-canonical-id> --force` into a *scratch* canonical dir or a throwaway branch state, then run `pnpm prism:build` followed by `pnpm prism:check` and confirm **zero drift**. Because the named skills already exist in canonical, the cleanest verification is: decompose into a temp dir, diff the decomposed `frontmatter.yml`/`shared.md` against the real canonical files — assert equality (modulo the documented frontmatter-trim). Do **not** overwrite the live canonical source during verification.
    - Run `pnpm prism:check-types` (`tsc --noEmit -p scripts/ai-skills/tsconfig.json`) clean.

---

## Decisions

- **CLI complements the skill body; it does not replace it.** The markdown migrate-mode procedure in `prism-skill-forge/shared.md` stays. The script handles the mechanical, unambiguous case (single generated copy → canonical); the procedure still governs the judgment calls (persona-vs-utility when ambiguous, per-platform delta recovery, re-tokenization). The skill body gains one trigger line: "For the mechanical case, run `pnpm prism:migrate-skill <source>`; fall back to the steps below when it flags ambiguity." Rationale: a script that silently guessed persona names or invented token mappings would be worse than the guided procedure — the procedure's value is exactly the human-in-the-loop on the lossy steps.
  - → no promotion needed (ticket-tactical; the skill-body trigger line is the durable surface).

- **Round-trip fidelity = idempotent rebuild green, not byte-identity to the original artifact.** `normalizeFrontmatter` trims and the build re-folds, so decompose→build is not guaranteed byte-equal to the *original generated file*; it is guaranteed to converge (a second `prism:build` is a no-op and `prism:check` is green). The done-condition is operationalized as "decompose + build leaves `prism:check` clean" plus body content-equivalence.
  - Alternatives considered: (a) require byte-identity to the original artifact — rejected, the trim/re-fold makes it unachievable without preserving exact source whitespace the build deliberately normalizes away; (b) snapshot-compare only the body — rejected, misses frontmatter regressions.
  - → promoted to .prism/architect/<TBD>.md — this is a durable property of the build pipeline (decompose is the inverse only up to normalization). Promote at close if an architect doc covers the build pipeline; else record as ADR candidate.

- **Codex TOML decomposition delegates to the markdown decomposer.** The `.toml` embeds the full generated codex SKILL.md inside `developer_instructions`; after unwrapping the TOML fence and stripping the three scaffolding lines, the remainder is a skill-markdown document. Reusing `decomposeSkillMarkdown` avoids a second frontmatter parser and keeps the two paths from drifting.
  - → no promotion needed (implementation tactic, self-evident from build.ts:163).

- **Re-tokenizing substituted literals is out of v1 scope.** Reverse token-substitution (`Acme Corp` → `{{org}}`) is lossy and ambiguous. v1 prints a reminder naming the config tokens and leaves the scan to the human, matching the migrate procedure's "best-effort, never block." Auto-reversal can be a follow-up if it proves needed.
  - → no promotion needed (codified in the skill-body procedure and this plan).

- **OPEN — TBD, needs Hunter input.** Whether the in-PRISM ID-normalization exception (org token `prism` → keep `prism-` prefix) should instead require an explicit `--id` to ever emit a `prism-*` ID, so a consumer who happens to set `"org": "prism"` can't accidentally claim the PRISM namespace. **Default path (used until resolved):** honor the config `org` token verbatim (org `prism` → `prism-<role>`), since PRISM's own `config.json` already declares `"org": "PRISM"` and this is the repo where contributing `prism-*` skills is legitimate. The `--id` override always wins regardless.

---

## History

- 2026-06-16 [hmcgrew/prism-171-skillforge-script]: Winston planned the migrate-mode CLI (`scripts/ai-skills/migrate-skill.ts`) — 4 reverse transforms, ID normalization, round-trip-via-rebuild verification. Plan only; no code.

---

## Acceptance Criteria

Reference: `.prism/templates/acceptance-criteria.md`.

### Behavioral

- [ ] Given a generated `.claude/skills/<id>/SKILL.md`, When the CLI runs against it, Then it writes canonical `frontmatter.yml` + `shared.md` whose content matches what `pnpm prism:build` would consume to regenerate that same file, with the generated HTML header block stripped from the body. (Verify against a real skill — e.g. `prism-changelog`.)
- [ ] Given a generated `.cursor/skills/<id>/SKILL.md`, When the CLI runs against it, Then it produces canonical source equivalent to the claude case (the cursor SKILL.md body is the same `buildSkillMarkdown` output). (Verify against `prism-changelog`.)
- [ ] Given a generated `.agents/skills/<id>/SKILL.md`, When the CLI runs against it, Then it produces canonical source equivalent to the claude case. (Verify against `prism-changelog`.)
- [ ] Given a generated `.codex/agents/<id>.toml`, When the CLI runs against it, Then it unwraps the TOML fence, strips the `You are X.` / scaffolding lines, recovers the persona name into the roles.json entry, and produces canonical `frontmatter.yml` + `shared.md`. (Verify against a persona skill — e.g. `prism-changelog.toml`.)
- [ ] Given a source ID `prism-<role>` and a consumer config with `org: acme`, When the CLI normalizes the ID, Then the output skill ID is `acme-<role>`; with no org token it is `custom-<role>`; with `--id <explicit>` it is `<explicit>` verbatim.
- [ ] Given the source artifact already has canonical files present, When the CLI runs without `--force`, Then existing canonical files are left untouched (skip-if-exists); with `--force` they are overwritten.
- [ ] Given `--dry-run`, When the CLI runs, Then it prints the planned writes and the roles.json delta and exits 0 without modifying any file.
- [ ] Given a decomposed skill of each of the four shapes, When `pnpm prism:build` then `pnpm prism:check` run, Then `prism:check` reports zero drift (the round-trip done-condition).

### Non-behavioral

- [ ] The CLI reuses exported helpers from `utils.ts` and does not introduce a new dependency.
- [ ] `frontmatter.yml` is written with the `description` as a folded (`>`) scalar — never plain multi-line continuation (lessons.md 2026-06-04).
- [ ] A new `scripts/ai-skills/migrate-skill.test.ts` is picked up by `pnpm prism:test` and covers one round-trip per source shape plus `normalizeSkillId` unit cases.
- [ ] `pnpm prism:check-types` passes clean.
- [ ] `package.json` gains `prism:migrate-skill` placed alphabetically among `prism:*` scripts.

### AC Sync Log

| Date | Agent | Action | Plan | Linear |
| ---- | ----- | ------ | ---- | ------ |
| 2026-06-16 | Winston | Authored AC from #171 done-condition | followup-171-skillforge-script | N/A (GitHub issue #171) |

---

## PR Readiness

- [ ] No critical or major issues
- [ ] Types correct — `pnpm prism:check-types` clean
- [ ] No stray console.logs (the CLI's user-facing `console.log` output is intentional)
- [ ] Tests written — one round-trip per source shape + `normalizeSkillId` units
- [ ] Build passes — `pnpm prism:build` + `pnpm prism:check` green
- [ ] PR description up to date
- [ ] Lasting decisions promoted (round-trip-fidelity property → architect doc / ADR)

**Last updated:** 2026-06-16
