# Plan: issue-374

## Ticket

https://github.com/HunterMcGrew/PRISM/issues/374 (lane L374 of epic #373)

## Goal

PRISM's coexistence mechanics — never overwriting a consumer's existing `AGENTS.md`/`CLAUDE.md`/`.claude/settings.json`, skip-if-exists seeding, `prism-*` namespacing, `.bak` conflict backups — are sound but undocumented and silent. Document the mechanics for consumers adopting into an existing repo, and add an adopt-time warning + test so a pre-existing `AGENTS.md`/`CLAUDE.md` is surfaced instead of silently skipped.

---

## Implementation Tasks

### Eli (documentation)

1. New `docs/adopting-into-existing-repos.md` — what `prism adopt` touches vs. skips (`.prism/**`, `AGENTS.md`, `CLAUDE.md`, `.claude/settings.json`, `.claude/skills/`, `.cursor/rules`), the `prism-*` skill-prefix convention and how consumer-owned skill names coexist, how the always-loaded `.prism/rules/skill-routing.md` table interacts with a consumer's pre-existing routing/skills, and the full `.bak` conflict-resolution workflow (what a `.bak` means, the `.bak`/`.bak.1`/`.bak.2` naming scheme, keep-PRISM's/keep-yours/merge options, whether to commit it — no).
2. Link the new doc from `README.md` (repo-shape tree + Quick start paragraph) and `docs/adopt-prism.md` (intro paragraph + the `--dry-run` section, which already mentions `.bak`).
3. Add two rows to the Cross-Reference Map in `.prism/architect/_toolkit/documentation.md`: `.prism/rules/skill-routing.md` ↔ the new doc, and `scripts/ai-skills/ownership.ts` + `scripts/ai-skills/adopt.ts` ↔ the new doc.
4. Verification: `pnpm run prism:crossref-lint` clean (checks relative links + install-surface links resolve).

### Clove (implementation)

> **Re-scoped by Winston 2026-07-02.** Issue #374's premise (adopt "seeds" a fresh `AGENTS.md`/`CLAUDE.md`, warn when one exists so the seed is skipped) is contradicted by the code. Ground truth: adopt never seeds either root file. The real, user-useful signal is the **inverse** — an **absent** `AGENTS.md` means PRISM's always-on Tier-1 constitution never reaches Codex-based agents (Codex auto-loads only `AGENTS.md`). See the `## Decisions` entry "Issue #374's warning premise was backwards — adopt never seeds root files" for the full trace. The seed-a-fresh-`AGENTS.md` question is a product decision escalated to Hunter (`VERDICT: needs-human`); the tasks below are the accurate-warning + docs work that ships in the meantime under the documented default path.

1. `scripts/ai-skills/adopt.ts` — add a coexistence check at the end of `runAdopt`, after the `seed`/`update` calls complete and before the `return { pathsProvisioned, seed, update }` (line 190). Thread the result into `AdoptSummary` (add a field, e.g. `rootFileNotices: string[]`) so `reportSummary` prints it via `console.log` on the CLI path — this keeps the check testable at the `runAdopt` seam and the print at the `reportSummary` seam, matching how `seed`/`update` counts already flow. Do **not** print directly inside `runAdopt` (it returns a summary; it doesn't do I/O).

   The check inspects two root paths at `consumerRepoRoot`:

   **(a) `AGENTS.md` — the real gap.** When `AGENTS.md` is **absent**, push this exact notice (respect the `dryRun` prefix like the other `reportSummary` lines — `prism:adopt (dry run)` vs `prism:adopt`):

   > `prism adopt: no AGENTS.md found at repo root — PRISM's always-on rules are not reaching Codex-based agents (Codex auto-loads only AGENTS.md). Claude-based agents are unaffected (they load .prism/rules/ directly). See docs/adopting-into-existing-repos.md to add an AGENTS.md by hand.`

   When `AGENTS.md` is **present**, push this exact notice (informational — adopt did not modify it; the Tier-1 block is injected by `pnpm prism:build`, not by adopt):

   > `prism adopt: existing AGENTS.md left untouched — run pnpm prism:build to inject PRISM's generated Tier-1 rules block into it, then review the marked block. See docs/adopting-into-existing-repos.md.`

   **(b) `CLAUDE.md` — no action, no warning.** adopt never creates or touches `CLAUDE.md`, and Claude loads `.prism/rules/` directly, so a missing or present `CLAUDE.md` is not a gap. **Do not emit any `CLAUDE.md` notice from adopt.** (This is the deliberate asymmetry — see Decisions.)

2. Why this wording is correct (for the reviewer): `seedConsumerContentRoot` hardcodes its seed root to `templates/install/.prism` (`adopt.ts:151`) and only walks under it (`adopt.ts:62-104`) — the `templates/install/AGENTS.md.tmpl` and `templates/install/.claude/CLAUDE.md.tmpl` files are PRISM's own dogfooded repo-root files, never consumer seed sources. `syncAgentsMdTier1Block` (`build.ts:468-497`) returns early when `AGENTS.md` is absent (`:476-478`) and runs during `prism:build` against the PRISM repo's own file — never against a consumer during adopt. `init.ts` writes only `.ai-skills/config.json`. So a consumer with no `AGENTS.md` silently never receives the Tier-1 constitution: that is the gap the (a)-absent notice surfaces.

3. `scripts/ai-skills/eject.ts` — fix the inaccurate seeding claim in `collectRootFileNotices` (folded into this lane; see Decisions "eject.ts CLAUDE.md notice folded in"). At `eject.ts:427-432`, the `CLAUDE.md` notice currently asserts `"CLAUDE.md was seeded by PRISM and may contain your own edits — review manually before deleting."` — PRISM never seeds `CLAUDE.md`. Replace the notice string with:

   > `CLAUDE.md is present but was not created by PRISM — review manually before deleting.`

   Also correct the `collectRootFileNotices` JSDoc (`eject.ts:410-414`): the phrase `"Both are seeded once and commonly consumer-edited"` is false for both root files (AGENTS.md is injected-into if present, never seeded whole; CLAUDE.md is never touched). Reword to: `Reports PRISM's contribution to AGENTS.md (the injected Tier-1 block, if present) and notes a present CLAUDE.md, without modifying either file.` Update the corresponding assertion in `eject.test.ts:549` if it pins the old "seeded" wording.

4. Test alongside `adopt.test.ts` — assert `runAdopt` returns / `reportSummary` prints:
   - the **absent-AGENTS.md** notice when a fixture consumer root has no `AGENTS.md`;
   - the **present-AGENTS.md** notice when the fixture has an `AGENTS.md`;
   - **no `CLAUDE.md` notice** in either case (present or absent).

5. Verification: `pnpm run prism:test`, `pnpm run prism:check-types`.

6. Open the PR once the code lands — see `.claude/rules/skill-routing.md § Authors ship, reviewers review`. Update this plan's `## History` and `## PR Readiness` after implementing.

> **Eli follow-up (doc accuracy):** `docs/adopting-into-existing-repos.md` must reflect the corrected ground truth — adopt never seeds `AGENTS.md`/`CLAUDE.md`; the absent-`AGENTS.md` Codex gap and the "run `pnpm prism:build` to inject the Tier-1 block" step are the real coexistence story. If the doc as written describes seeding or the old warning framing, it needs a pass. Verify against this re-scope before the lane closes.

---

## Decisions

- **Doc placement:** `docs/adopting-into-existing-repos.md` (flat, matching `docs/adopt-prism.md` and the rest of `docs/`) rather than a new section inside `adopt-prism.md`. `.ai-skills/config.json` has `documentation.format: "flat-markdown-guides"` and `keepsDevDocs: false` — one doc tree, topic-based naming. Considered: a `## Coexistence` section inside `adopt-prism.md`. Rejected: `adopt-prism.md` is already long (212 lines) and covers install-method mechanics; coexistence is a distinct enough topic (what happens when files already exist, not how to invoke the commands) to earn its own page, cross-linked both ways.
- **Issue #374's warning premise was backwards — adopt never seeds root files.** (Supersedes the earlier bullet claiming "no seed file exists" — that was imprecise: `.tmpl` twins do exist, they're just not consumer seed sources.)
  - **Root cause of the confusion:** `templates/install/AGENTS.md.tmpl` and `templates/install/.claude/CLAUDE.md.tmpl` exist, which reads like seed material. They are not — they are PRISM's *own* dogfooded repo-root files, stored as `.tmpl` twins so seed-drift and crossref-lint tooling can track them (`crossref-lint.ts:59,488-493`). The adopt seed pass hardcodes its root to `templates/install/.prism` (`adopt.ts:151`) and `seedConsumerContentRoot` only walks under that root (`adopt.ts:62-104`), so nothing at `templates/install/` top-level or under `templates/install/.claude/` is ever copied to a consumer.
  - **Ground truth — root `AGENTS.md`:** *absent* → adopt creates nothing; PRISM's always-on Tier-1 constitution silently never reaches Codex-based agents (Codex auto-loads only `AGENTS.md`). *present* → adopt leaves it untouched; the Tier-1 block is injected into it by `syncAgentsMdTier1Block` during `pnpm prism:build` (`build.ts:468-497`, early-returns when absent at `:476-478`), not by adopt.
  - **Ground truth — root `CLAUDE.md`:** *absent or present* → adopt never creates or touches it, and Claude loads `.prism/rules/` directly, so there is no gap. Deliberate asymmetry: `AGENTS.md` needs the root-file bridge for Codex; `CLAUDE.md` does not.
  - **Consequence for the warning:** the issue's "existing file → seed skipped" warning would state something false. The accurate, user-useful signal is the inverse — warn when `AGENTS.md` is *absent* (Codex gap), inform (not warn) when it's *present* (build-time injection step), and say nothing about `CLAUDE.md`.
  - **Alternatives considered:** (1) ship the issue's warning verbatim — rejected, it asserts a seeding step that doesn't exist. (2) Warn on a present `CLAUDE.md` too — rejected, there's no gap to surface; a warning with no remedy is noise.
  - → no promotion needed (the corrected `docs/adopting-into-existing-repos.md` is the durable record of this behavior; the asymmetry is an implementation fact already correct in source, not a new architectural decision).

- **eject.ts CLAUDE.md notice folded into this lane, not split to a follow-up.** The `eject.ts:430` notice ("CLAUDE.md was seeded by PRISM") is the same inaccurate-seeding-claim theme as this whole re-scope, same file family, one-line fix. Per `.claude/rules/followup-scope.md` the signals point to same-scope (high file/subject adjacency, small size, same persona), so it folds into Clove's task 3 rather than earning its own ticket. Documented here as the required scope note.
  - → no promotion needed (bug-fix tactic; the Debugged Issue entry below is the durable trace).

- **OPEN — TBD, needs Hunter input.** Whether `prism adopt` should *seed a minimal `AGENTS.md`* (carrying the Tier-1 constitution block) for consumers who lack one, closing the Codex-reach gap automatically instead of only warning about it. This is a product-intent call about PRISM's install contract — not something Winston resolves. **Default path (used until resolved):** adopt does not seed; it emits the accurate absent-`AGENTS.md` warning (Clove task 1a) pointing the consumer at `docs/adopting-into-existing-repos.md` to add one by hand. The lane ships the docs + factually-correct warning under this default; if Hunter chooses to seed, that's a new ticket with its own `AGENTS.md`-seed path, tests, and `eject.ts` seed-reversal coverage.
- **`.bak` scope is `.prism/`-only, not repo-root files.** Verified in `scripts/ai-skills/update.ts`: `applyIncomingFile`/`backupConsumerFile` operate only on paths under `PRISM_OWNED_GLOBS` (all relative to `.prism/`). `AGENTS.md`/`CLAUDE.md`/`.claude/settings.json` at the consumer root are handled by the skip-if-exists seed logic in `adopt.ts`, never by the `.bak` backup path — the two mechanisms are separate and the doc keeps them clearly separated to avoid consumers expecting a `.bak` for a root file that will never get one.
  - → no promotion needed (implementation detail already correctly scoped in source; the doc's job is narrating the existing split, not changing it).

---

## History

- 2026-07-02 [hmcgrew/374-coexistence-docs]: Created plan for issue #374; verified adopt/update/ownership mechanics against `scripts/ai-skills/adopt.ts`, `update.ts`, `ownership.ts`, `build.ts`, `eject.ts` before writing.
- 2026-07-02 [hmcgrew/374-coexistence-docs]: Wrote `docs/adopting-into-existing-repos.md`; linked from `README.md` and `docs/adopt-prism.md`; added two Cross-Reference Map rows in `documentation.md`. `prism:crossref-lint` clean.
- 2026-07-02 [hmcgrew/374-coexistence-docs]: Winston re-scoped the Clove adopt-warning task — issue #374's "seed skipped" premise was backwards; verified adopt never seeds root `AGENTS.md`/`CLAUDE.md` (traced `adopt.ts`, `build.ts:468-497`, `init.ts`, the `.tmpl` twins). Accurate warning now fires on *absent* `AGENTS.md` (Codex gap); folded the `eject.ts` seeding-claim fix into the same lane; escalated seed-a-fresh-`AGENTS.md` as `OPEN — needs Hunter`. See Decision "Issue #374's warning premise was backwards".

---

## Debugged Issues

### `eject.ts` claims CLAUDE.md is "seeded by PRISM" — no seed path exists

- **Status:** `open` (fix folded into Clove task 3 this lane — see Decisions "eject.ts CLAUDE.md notice folded in")
- **Severity:** Low
- **Confidence:** `High` (Confirmed — verified absence across every write path)
- **Environment:** `scripts/ai-skills/eject.ts:411-414` (JSDoc) and `:430` (notice string)
- **File:** `scripts/ai-skills/eject.ts:411-414`
- **Root cause:** `[Confirmed]` The comment and user-facing notice both assert "CLAUDE.md was seeded by PRISM," but no code path writes `CLAUDE.md` for a consumer — `templates/install/CLAUDE.md` does not exist, `adopt.ts`'s `seedConsumerContentRoot` only walks `.prism/`, and `init.ts` doesn't touch root files. The only place `CLAUDE.md` shows up in the source tree is as pre-existing fixture data in `eject.test.ts`.
- **Steps to Reproduce:**
  1. Run `prism adopt` on a fresh consumer repo with no `CLAUDE.md`.
  2. Observe that no `CLAUDE.md` is created.
  3. Run `prism eject` afterward — the notice still claims PRISM seeded it, which is now confirmed false for this repo.
- **Expected behavior:** The eject notice should describe what's actually true — PRISM does not currently seed `CLAUDE.md` at all — or the seed step should be implemented to match the comment's claim.
- **Actual behavior:** The comment and notice describe a seeding mechanism that doesn't exist in the current build.
- **Recommended fix:** Drop the "seeded by PRISM" claim. Replace the `:430` notice with `"CLAUDE.md is present but was not created by PRISM — review manually before deleting."` and correct the `:410-414` JSDoc ("Both are seeded once…") per Clove task 3. The seed-a-fresh-`AGENTS.md` question (issue's original premise, if intended) is escalated separately as the `OPEN — needs Hunter` Decision, not resolved by this notice fix.
- **Suggested tests:** covered by the eject.test.ts assertion update in Clove task 3; a future seeding feature would need its own coverage.
- **Linear:** `N/A` (GitHub issues)

---

## Acceptance Criteria

### Behavioral

- [ ] Given a consumer repo with **no** `AGENTS.md` at the root, When `prism adopt` runs, Then a notice prints explaining PRISM's always-on rules are not reaching Codex-based agents and pointing at `docs/adopting-into-existing-repos.md`, and adopt still completes successfully (REQ-1)
- [ ] Given a consumer repo with a pre-existing `AGENTS.md`, When `prism adopt` runs, Then an informational notice prints saying the file was left untouched and to run `pnpm prism:build` to inject the Tier-1 block, and adopt still completes successfully (REQ-1)
- [ ] Given a consumer repo with or without a `CLAUDE.md`, When `prism adopt` runs, Then no `CLAUDE.md` notice prints (REQ-1)
- [ ] Given `prism eject` runs on a repo with a `CLAUDE.md`, When the eject report prints, Then the `CLAUDE.md` notice does not claim PRISM seeded the file (Debug-1)
- [ ] Given the new doc, When a reader follows any relative link inside it or into it from `README.md`/`docs/adopt-prism.md`, Then the link resolves (REQ-1)

### Non-behavioral

- [ ] `pnpm run prism:crossref-lint` passes with the new doc and its inbound/outbound links
- [ ] `pnpm run prism:test` and `pnpm run prism:check-types` pass with Clove's warning + test added

### AC Adjustments

- 2026-07-02 (Winston, re-scope): Inverted the AGENTS.md warning ACs — issue #374's "existing file → seed skipped" premise was contradicted by the code (adopt never seeds root files). New ACs warn on *absent* `AGENTS.md` (real Codex-reach gap), inform on *present* `AGENTS.md`, drop all `CLAUDE.md` warnings, and add a Debug-1 AC for the folded `eject.ts` notice fix. AC not synced to a tracker (GitHub issues; no auto-sync surface for AC here).

### AC Sync Log

| Date | Agent | Action | Plan | Linear |
| ---- | ----- | ------ | ---- | ------ |

---

## Cleanup Items

---

## PR Readiness

- [x] Docs written and linked (Eli's half)
- [ ] Adopt-time warning implemented (Clove's half)
- [ ] Test added alongside `adopt.test.ts` (Clove's half)
- [ ] No critical or major issues
- [ ] Types correct — no `any`, no unsafe `as`
- [ ] No stray console.logs or debug artifacts
- [ ] Tests written for new logic and edge cases
- [ ] All debugged issues resolved (no `open` entries — one `open` entry above, low severity, doc-only fix recommended)
- [ ] Build passes — last run: not yet run (docs-only change so far; Clove runs full build after code lands)
- [ ] PR description up to date — PR not yet opened (Clove opens after code lands, per `.claude/rules/skill-routing.md § Authors ship, reviewers review`)
- [ ] Lasting decisions promoted to architect context (if applicable)

**Last updated:** 2026-07-02
