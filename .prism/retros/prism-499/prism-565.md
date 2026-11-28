# Retro — PRISM-565

**Target:** `.prism/plans/prism-565/plan.md` and `spec.md`, both parts of the stack
**Grain:** per-pr
**Trigger:** amended: T2; amended: T15; amended: T17
**Generated:** 2026-11-27
**Graded at:** `fc2f5c35`, the head of PR #567 (part 2). Part 1 is graded at its merge, `fe39c308` (PR #566, final head `0bb17bc6`).

## Charter coverage

This run reached every source `.ai-skills/config.json#retroEvidence` declares: git, the GitHub PR platform (`gh` signed in), and GitHub Actions CI. No source reads `not configured for this team` or `unreachable this run`. All six questions are answered, and one answer waits on CI.

This is the first run of the retro as this ticket changed it, so it ran `retro-trigger.mjs` first. It exited 0 with the three reasons on the `**Trigger:**` line above. No `review:` reason and no `challenge:` reason fired, because all four recorded review rounds read a bare `clean` and the challenge stopped at round 2.

| Charter question | Answer | Sources | Gap |
| --- | --- | --- | --- |
| Did we do what we said? | Yes. All 16 requirements shipped, and AC-1 to AC-13 are met at `fc2f5c35`. Part 1's tests (`plan-retro-trigger`, `review-lines`, `review-merge-bar`, `plan-retro-line`, `plan-runtime-delivery`) and `skill-loaded-lines` ran 82 tests with 0 failures, and the three new test files do not exist at `02e9aeb0`. The greps for AC-2, AC-4, AC-5, and AC-6 printed as required. `pnpm prism:retro-line` exits 0 on the tree. For part 2, AC-7 to AC-13 print as required: the skill names `plan/retro-trigger.mjs` and `none — no trigger` and has 0 `fixed last stage` hits, `OVER_CAP_ALLOWLIST` is `{}`, and `prism-retro` loads 117 of 120 lines. `git-conventions.md` names `merge-bar.mjs`, both `branch-plan.md` copies carry `none — no trigger`, ADR-0089 exists with no seed copy, and `crossref-lint` exits 0. The two Iris rows are identical. AC-13's three counts are 2, 2, and 2, with the seed twin read at `##`. AC-15 is met by this run (see Fidelity gap). `merge-bar.mjs` passes at `fc2f5c35`, so the tool this ticket built accepts the ticket's own branch. | `## Acceptance Criteria`, `## Tasks`, `git log`, PR #566 and #567 bodies, local `tsx --test`, the greps above, `retro-trigger.mjs`, `merge-bar.mjs` | AC-14 on part 2: `CI pending on fc2f5c35` (ubuntu passed, windows in progress when read). The review's mutation-style checks are not re-run here. |
| Were there issues or bottlenecks? | Three, all small. The plan needed three amendments after approval (T2, T15, T17), and each is what fired the trigger. Part 1's review ended at its cap with three leftovers, which moved into part 2 as `T2 fix`, `T3 fix`, and `T6 fix`. Part 2's round 1 produced five `T* fix` commits (`T3`, `T9`, `T11`, `T12`, `T15`) and a regeneration. The challenge ran only two rounds, both clean. | `## Challenge`, `## Review`, PR #566 and #567 bodies, `git log fe39c308..HEAD` | The #567 body says round 1 found 2 Minors and 1 nit, and the log shows five fix commits. The review's findings are not stored in the plan, so the two counts cannot be reconciled from the record. |
| What improvements could we make? | Run the extraction half of each task proof and AC evidence command against the pre-change tree before the plan is approved. T15's proof and AC-13's evidence both used an `awk` for `### Compaction arms` against a seed twin whose heading is `## Compaction arms`, so each selects nothing there. See Action Items. | `plan.md` T15 `amended` line and Decisions, `.prism/lessons.md` | none |
| Did we follow the code standards? | Yes, after review. Verify passed at head `abffc0f9` (base `fe39c308`): typecheck, lint, test, build, and spec, with format `n/a: not configured`. Round 1 was clean at `fd06d94a` and round 2 clean at `0b7b91fd`. `merge-bar.mjs` passes at `fc2f5c35`, since both commits after the reviewed sha touch only the plan folder. Every changed path sits inside the spec's Affected systems. `reconcile.mjs --classes` reports no open class. `pnpm prism:check` also exited 0 on the tree with this retro's edits in it, `prism:retro-line` included. | `## Verification`, `## Review`, `git diff --name-only origin/main...HEAD`, `merge-bar.mjs` | The review's per-round findings are not in the plan, so the standards findings themselves were not read. Only their fixes are visible in the log. |
| Did we do anything wrong, or could we have done better? | Two things. The plan left stale text standing (see Fidelity gap), and two evidence commands were wrong as written (see above). | `plan.md`, `spec.md` `## Decisions`, `.prism/templates/plan.md`, `CHANGELOG.md` | none |
| Are the tests passing? | Yes, at every head CI has finished. Part 1's `prism-check` passed on ubuntu and windows at merge (`0bb17bc6`). Locally, `pnpm run prism:test` at `fc2f5c35` ran 3052 tests: 3051 pass, 0 fail, 1 skipped. That matches the #567 body. | `gh pr view --json statusCheckRollup`, `## Verification`, local `pnpm run prism:test` | `CI pending on fc2f5c35` (windows), owned by the session's watcher |

## Fidelity gap

- **Planned and shipped match on every requirement.** Scope moved only through recorded Decisions: the two-PR cut, part 1's three leftovers fixed in part 2, and the AC-13 seed-twin read. Challenge round 1 predicted that the report would run on every plan, and it did. This plan fires too, though through a path round 1 did not name: three amended tasks and no review or challenge reason.
- **AC-15 is met, on the exit 0 path.** `retro-trigger.mjs .prism/plans/prism-565` at the commit before this one prints `amended: T2`, `amended: T15`, and `amended: T17`, and exits 0. This commit writes this report with that output on its `**Trigger:**` line and sets `Retro:` to its path. The exit 1 path, `none — no trigger`, was not taken. It is covered by the script's unit tests and by no plan so far.
- **Two of the three amendments trace to part 1's leftovers.** T2's `amended` line names review round 2 on #566, and T17's names the `T6 fix`, which edits part 1's `review-runtime.md`. Decision "Part 1's three review-round-2 leftovers are fixed in part 2" made that choice and priced it as three small commits. The record shows the price also included two amendments, and so the report this run wrote. That is the Decision working as written, not a refutation.
- **Observation, no action item: a Minor-only review never triggers.** All four rounds here raised findings: #566 round 1 had one Minor, round 2 left two Minors and a nit, and #567 round 1 had two Minors and a nit. `record.mjs` records a round with no Critical or Major as a bare `clean`, so none of them printed a `review:` reason. ADR-0089's Context says the report runs when "a review asked for changes". The script reads only Critical, Major, or a decision item. The first run on new-format review lines supports the Decision that clean first rounds become common, and whether a Minor should trigger is a call for the epic retro.
- **Observation, no action item: the resume table still has no case for a stack's earlier part.** This plan's Decision "Part 1 ships from T7, not from the resume table" is the fourth plan, after PRISM-553, 557, and 558, to write a Decision around it. The PRISM-557 retro already carries the action item, and `workflow.md` has no stack row.
- **Stale text outside the spec's Affected systems.** `.prism/templates/plan.md:54` and its seed twin still say "Fill the Retro line with the retro report's path. The retro always runs.", though `Retro: none — no trigger` is now valid. The PR #567 body lists `CHANGELOG.md:79` ("a fixed last stage of a plan folder") as left for child 16. `docs/what-prism-writes.md` lists `watch-ci.mjs` but has no row for the three modules T5 added. Epic row 16 names the retired reviewer, the renamed skill, the labels, the small size, the lean plan, and the budget. It does not name this child's pages, so the Decision that left `what-prism-writes.md` for child 16 rests on the row reading as covering every earlier child, which it does not say.
- **The spec's "and nothing else" is narrower than the shipped bar.** The spec Decision says the merge bar exempts `retro:` and plan-folder commits and nothing else. The shipped script also exempts a commit that changes no files, and `review-runtime.md` documents all three. The rationale held, since plan-folder-only would still fail after the retro, so this is a wording gap and not a refuted Decision.

## Action Items

- **Name this child's pages in epic row 16.** Add to `.prism/plans/prism-499/spec.md` row 16: `CHANGELOG.md:79`, the three runtime rows in `docs/what-prism-writes.md`, and `.prism/templates/plan.md:54` with its seed twin and host copies, reworded so `Retro:` may read `none — no trigger`. Done when the row lists each, or the plan template line and its copies are corrected in a follow-up PR off `main`. Traces to the stale-text bullet above. — proposed owner: the main session, as the epic spec's author, at the epic's retro → follow-up PR, no new ticket, per `.prism/rules/followup-scope.md`
- **Check each task proof and AC evidence command against the pre-change tree before approval.** The plan stage runs the extraction half, such as the `awk`, `sed -n`, or `grep -n`, and confirms it selects text. The proof half cannot pass yet, so it is not run. Done when a proof that selects nothing is caught at the plan stage. Traces to T15's proof and AC-13's evidence, and to PRISM-558's T4 and T13. It is the third ticket in the epic, and `.prism/lessons.md` § AC evidence commands are code covers AC evidence only, not task proofs. — proposed owner: the epic retro → lesson candidate for `.prism/lessons.md`, or the plan stage's checklist

## Lessons exits

The 90-day window opens 2026-08-29.

**Promoted (0).** No lesson's rule now lives in a file this run's verdicts name. The promoted Decisions land in ADR-0089, `review-runtime.md`, and `skills-ecosystem.md`, and no lesson in `.prism/lessons.md` states their rules.

**Expired (0).** Three entries are dated before 2026-08-29, and each is still cited. "Epic plans are preserved, not deleted" is cited by ADR-0047. "AC evidence commands are code" is cited by `.prism/plans/opus5-port.md` and `.prism/plans/reviewer-scope-bookkeeping.md`. "A control arm that receives an always-on instruction" is cited by `.prism/rules/writing-voice.md` and `.prism/plans/writing-voice-port.md`.

**Merged (0).** No two entries record the same rule.

**Appended (0).** The wrong-heading evidence is the same class as "AC evidence commands are code", so nothing was appended. A per-PR retro proposes no lesson candidates.

## Review-miss classes

`node scripts/ai-skills/hooks/review/reconcile.mjs --classes` printed "No open class has 3 or more rows." So there is no open class, no proposal, and no resolve row to append. The misses log does not exist, since no human comment on either PR was ever logged.

## Citations

### Plan evidence

- `plan.md` `## Decisions`: 7 entries, all given a verdict this run (`promoted` for one and `no promotion needed` for six). `spec.md` `## Decisions`: 8 entries. Six are `promoted`, to ADR-0089, `review-runtime.md`, and `skills-ecosystem.md`, and two are `no promotion needed`.
- `plan.md` `## Tasks`: T2, T15, and T17 carry `amended` lines, which are the three trigger reasons.
- `## Challenge`: round 1 clean (7 non-blocking), round 2 clean (4 non-blocking). Round 1 named AC-7's grep-only evidence and the exit 1 path as unreachable on real data. Round 2 named the unchecked generated-copy lists in T7 and T17.
- `## Review`: part 1 round 1 at `36d2c4bc` and round 2 at `4913fb07`, both clean. Part 2 round 1 at `fd06d94a` and round 2 at `0b7b91fd`, both clean.
- `## Verification`: `verdict: done`, base `fe39c308`, head `abffc0f9`.

### Execution record

- **PR #566** (part 1): merged as `fe39c308`, 27 files, +1999/−152. `prism-check` succeeded on `ubuntu-latest` and `windows-latest`. It has no review objects, issue comments, or inline threads.
- **PR #567** (part 2): an open draft at `fc2f5c35`, 71 files, +399/−154 against `origin/main`. It has no review objects, issue comments, or inline threads. `prism-check` succeeded on ubuntu and was in progress on windows when read.
- **Commits after the last review round (`0b7b91fd`):** `fc2f5c35`, plan-only. `merge-bar.mjs` passes at that head.
- **Trigger input:** across every folder plan under `.prism/plans/`, `retro-trigger.mjs` exits 0 on prism-530, 537, 544, 550, 553, 557, 558, and 565, and exits 1 on prism-516, 519, 520, and 522. Every plan that exits 0 other than this one prints a `challenge:` or `review:` reason, so this is the first whose only reasons are `amended`.
