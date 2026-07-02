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

1. `scripts/ai-skills/adopt.ts` — in `runAdopt` (or `runAdoptCli`'s reporting path, whichever keeps the check colocated with the existing `configExists`/`assertConsumerIsEstablished` guards), add a check for a pre-existing `AGENTS.md` or `CLAUDE.md` at `consumerRepoRoot`. When either is found, print a warning (not a failure — adopt still proceeds) with this exact wording:

   > `prism adopt: existing AGENTS.md detected — PRISM constitution content not seeded. See docs/adopting-into-existing-repos.md for what this means and how to add it by hand.`

   (swap `AGENTS.md` for `CLAUDE.md` in the CLAUDE.md case; print both lines if both files exist).

2. The warning fires because `seedConsumerContentRoot` only ever seeds under `.prism/`, and `syncAgentsMdTier1Block` (`scripts/ai-skills/build.ts`) returns early — no-op — when `AGENTS.md` is absent, so a pre-existing `AGENTS.md` never receives PRISM's generated Tier-1 rules block. The warning makes that silent gap visible at adopt time instead of leaving the consumer to discover it later.
3. Test alongside `adopt.test.ts` — assert `runAdopt`/`runAdoptCli` prints the warning when a fixture consumer root has a pre-existing `AGENTS.md` (and separately for `CLAUDE.md`), and does not print it when neither file exists.
4. Verification: `pnpm run prism:test`, `pnpm run prism:check-types`.
5. Open the PR once the code lands — see `.claude/rules/skill-routing.md § Authors ship, reviewers review`. Update this plan's `## History` and `## PR Readiness` after implementing.

---

## Decisions

- **Doc placement:** `docs/adopting-into-existing-repos.md` (flat, matching `docs/adopt-prism.md` and the rest of `docs/`) rather than a new section inside `adopt-prism.md`. `.ai-skills/config.json` has `documentation.format: "flat-markdown-guides"` and `keepsDevDocs: false` — one doc tree, topic-based naming. Considered: a `## Coexistence` section inside `adopt-prism.md`. Rejected: `adopt-prism.md` is already long (212 lines) and covers install-method mechanics; coexistence is a distinct enough topic (what happens when files already exist, not how to invoke the commands) to earn its own page, cross-linked both ways.
- **`AGENTS.md`/`CLAUDE.md` are not seeded by any current code path** — verified against `scripts/ai-skills/adopt.ts` (`seedConsumerContentRoot` only walks `.prism/`), no `templates/install/AGENTS.md` or `templates/install/CLAUDE.md` seed file exists, and `init.ts` doesn't touch either file. `eject.ts`'s `collectRootFileNotices` comment ("CLAUDE.md was seeded by PRISM") describes a mechanism that doesn't exist in the current codebase — likely aspirational language or drift from an earlier design. The new doc documents actual behavior (adopt never creates either file; it only refrains from touching them if they exist) rather than the eject.ts comment's claim.
  - → no promotion needed (documented as a Debugged Issue below and flagged as follow-up; the doc itself is the durable record of actual behavior — no architect-context promotion needed beyond that).
- **`.bak` scope is `.prism/`-only, not repo-root files.** Verified in `scripts/ai-skills/update.ts`: `applyIncomingFile`/`backupConsumerFile` operate only on paths under `PRISM_OWNED_GLOBS` (all relative to `.prism/`). `AGENTS.md`/`CLAUDE.md`/`.claude/settings.json` at the consumer root are handled by the skip-if-exists seed logic in `adopt.ts`, never by the `.bak` backup path — the two mechanisms are separate and the doc keeps them clearly separated to avoid consumers expecting a `.bak` for a root file that will never get one.
  - → no promotion needed (implementation detail already correctly scoped in source; the doc's job is narrating the existing split, not changing it).

---

## History

- 2026-07-02 [hmcgrew/374-coexistence-docs]: Created plan for issue #374; verified adopt/update/ownership mechanics against `scripts/ai-skills/adopt.ts`, `update.ts`, `ownership.ts`, `build.ts`, `eject.ts` before writing.
- 2026-07-02 [hmcgrew/374-coexistence-docs]: Wrote `docs/adopting-into-existing-repos.md`; linked from `README.md` and `docs/adopt-prism.md`; added two Cross-Reference Map rows in `documentation.md`. `prism:crossref-lint` clean.

---

## Debugged Issues

### `eject.ts` claims CLAUDE.md is "seeded by PRISM" — no seed path exists

- **Status:** `open`
- **Severity:** Low
- **Confidence:** `High` (Confirmed — verified absence across every write path)
- **Environment:** `scripts/ai-skills/eject.ts:412` (comment) and `:430` (notice string)
- **File:** `scripts/ai-skills/eject.ts:411-414`
- **Root cause:** `[Confirmed]` The comment and user-facing notice both assert "CLAUDE.md was seeded by PRISM," but no code path writes `CLAUDE.md` for a consumer — `templates/install/CLAUDE.md` does not exist, `adopt.ts`'s `seedConsumerContentRoot` only walks `.prism/`, and `init.ts` doesn't touch root files. The only place `CLAUDE.md` shows up in the source tree is as pre-existing fixture data in `eject.test.ts`.
- **Steps to Reproduce:**
  1. Run `prism adopt` on a fresh consumer repo with no `CLAUDE.md`.
  2. Observe that no `CLAUDE.md` is created.
  3. Run `prism eject` afterward — the notice still claims PRISM seeded it, which is now confirmed false for this repo.
- **Expected behavior:** The eject notice should describe what's actually true — PRISM does not currently seed `CLAUDE.md` at all — or the seed step should be implemented to match the comment's claim.
- **Actual behavior:** The comment and notice describe a seeding mechanism that doesn't exist in the current build.
- **Recommended fix:** Either (a) soften the eject notice to something like "CLAUDE.md may reference PRISM setup — review manually before deleting" (drop the "seeded by PRISM" claim), or (b) if seeding `CLAUDE.md`/`AGENTS.md` for greenfield consumers is actually intended future work, file it as its own ticket rather than leaving the claim stale in a comment.
- **Suggested tests:** none needed for the doc fix; a future seeding feature would need its own coverage.
- **Linear:** `N/A` (GitHub issues)

---

## Acceptance Criteria

### Behavioral

- [ ] Given a consumer repo with a pre-existing `AGENTS.md`, When `prism adopt` runs, Then a warning prints naming `AGENTS.md` and pointing at `docs/adopting-into-existing-repos.md`, and adopt still completes successfully (REQ-1)
- [ ] Given a consumer repo with a pre-existing `CLAUDE.md`, When `prism adopt` runs, Then a warning prints naming `CLAUDE.md` and pointing at the same doc (REQ-1)
- [ ] Given a consumer repo with neither file present, When `prism adopt` runs, Then no coexistence warning prints (REQ-1)
- [ ] Given the new doc, When a reader follows any relative link inside it or into it from `README.md`/`docs/adopt-prism.md`, Then the link resolves (REQ-1)

### Non-behavioral

- [ ] `pnpm run prism:crossref-lint` passes with the new doc and its inbound/outbound links
- [ ] `pnpm run prism:test` and `pnpm run prism:check-types` pass with Clove's warning + test added

### AC Adjustments

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
