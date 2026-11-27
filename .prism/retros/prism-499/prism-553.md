# Retro — PRISM-553

**Target:** `.prism/plans/prism-553/plan.md` and `spec.md`, both parts of the stack
**Grain:** per-pr
**Generated:** 2026-11-27
**Graded at:** `2058c229`, the head of PR #556 (part 2). Part 1 is graded at its merge, `403e9a30` (PR #554, head `cf6dffe0`).

## Charter coverage

This run reached every source `.ai-skills/config.json#retroEvidence` declares: git, the GitHub PR platform (`gh` signed in), and GitHub Actions CI. No source reads `not configured for this team` or `unreachable this run`. All six questions are answered, and one answer waits on CI.

| Charter question | Answer | Sources | Gap |
| --- | --- | --- | --- |
| Did we do what we said? | Yes. All 24 tasks (T1 to T24) have a commit naming them. This retro re-ran the machine evidence at `2058c229`. Nine test files passed, 180 tests and 0 failures (`one-review`, `update-retire-review`, `brief-gate`, `review-ignore`, `review-record`, `plan-retro-line`, `review-post`, `review-reconcile`, `routing-coverage`). The greps for AC-2, AC-8, AC-11, AC-12, AC-17, AC-18, AC-19, and AC-20 printed as required, and `pnpm prism:crossref-lint` exited 0. So AC-1 to AC-5 and AC-7 to AC-20 are met. AC-6 is met by `## Release proof`. AC-21 is met for part 1 and pending for part 2. | `## Tasks`, `## Acceptance Criteria`, `## Release proof`, `git log`, PR #554 and #556 bodies | AC-21 on part 2: `CI pending on 2058c229` |
| Were there issues or bottlenecks? | Three. The challenge took five rounds (blocking 4, 1, 4, then resolved and clean), and round 3 found the same broken proof shape in four tasks. T11's first build stopped on `routing-coverage.test.ts`, whose exactly-once rule conflicted with AC-7, which cost one re-plan (T24). Part 2's round 2 raised a decision only Hunter could make, and he ruled mid-run. | `## Challenge`, `## History` T11 line, the routing-coverage Decision, the decision-only-round Decision | none |
| What improvements could we make? | Tie the merge bar's review line to the head it reviewed, and settle whether folder-plan stages write `## Sessions` (see Action Items). Also observed: a proof ending `&& <grep> ; test $? -eq 1` passes when the first command fails. The challenge caught it, but the plan stage wrote it four times. | `## Review`, `## Sessions`, `## Challenge` round 3 | none |
| Did we follow the code standards? | Yes, after review. Verify passed at `9ebf4f2d` (typecheck, lint, test, build, spec, with format n/a). Each part's round 1 found 2 Major, and each part's round 2 had zero Critical and zero Major. Part 1 left 3 Minors for its PR body. Part 2 left one Minor: `post.mjs` accepts a PR URL from another repo. | `## Verification`, `## Review`, the two round-fix Decisions, PR #556 Open items | none |
| Did we do anything wrong, or could we have done better? | The decision-verdict fix landed after the last review round (see Fidelity gap), so the final review line describes `67f4b517`, not the head. `## Sessions` is empty, which the PRISM-537, PRISM-544, and PRISM-550 retros also found. The release proof and the nested-dispatch probe both did their job. | `## Review`, `## Sessions`, `git log 67f4b517..HEAD` | none |
| Are the tests passing? | Yes, at every head CI has finished. Part 1's `prism-check` passed on ubuntu and windows at `cf6dffe0`. Part 2 passed at `347d67dd`. Verify ran the full suite green at `9ebf4f2d`, and the 180 targeted tests pass locally at `2058c229`. | `gh pr view --json statusCheckRollup`, `gh run list`, `## Verification`, local `tsx --test` | `CI pending on 2058c229`, owned by the session's watcher |

## Fidelity gap

- **The last review line predates six source edits.** `- review round 2 at 67f4b517 (part 2 of 2): clean` is the line the merge bar reads. After it, `355d9b6a` (T16 fix), `415d9320` (T19 fix), and `7bc81a45` (T21 fix) changed `record.mjs`, its test, `REVIEW.md`, its mirror, and `review-runtime.md`. That is 9 files, +50/−15, outside the plan. The main session checked that diff and its tests directly instead of running a third round, and the PR #556 body says so. That is a legitimate call under the two-round cap. But `git-conventions.md` "Who merges" asks only that the last line read `clean` and CI be green on the head, so the same shape would pass with code no round ever saw. The line also reads bare `clean`. Under the grammar this PR ships, that round would read `clean, 1 decision`. The decision is answered (Hunter chose option b), so this merge is sound. The mechanical check is what has the gap.
- **The merge rule says "reads `clean`", and `REVIEW.md` says "only a bare `clean`".** `git-conventions.md:118` is the always-on text a merging session reads, and it doesn't rule out `clean, 1 decision`. `REVIEW.md:108` and `review-runtime.md` do. A session that loads only the rule could read the decision form as meeting the bar.
- **Scope moved only through recorded Decisions.** These were `prism-forge-skill` joining the sweep, the label removal moving to part 1, `branch-plan.md` leading the rulebook by one merge, T24, the `prism-retro` grading text in the part 2 round 1 fix, and T19, T20, and T21's edits beyond their task text. Each PR body lists its own.
- **Planned and shipped match on every requirement.** REQ-26's probe returned `PROBE inner=pong`, and REQ-8's upgrade proof passed every check. Doctor's one WARN is the consumer-owned manifest's dead `prism-pr-review` route, which is carried as a 1.0.x release note.

## Action Items

- **Make the merge bar check the review line against the head.** Accept the last `review round` line only when its sha is the head, or when every commit after it changes only plan-folder files. Change `git-conventions.md` "Who merges" from "reads `clean`" to "reads a bare `clean`", matching `REVIEW.md`. The check that reads that line, `plan-retro-line.ts`, is already being rekeyed to `review round` lines by epic child 13, so the sha check fits in the same reader. Done when a test fails a plan whose last line is `clean` at a sha with non-plan commits after it. Traces to the decision-only-round Decision. — proposed owner: the spec stage of epic child 13 (fold-in) → ticket proposal via Nora if child 13's spec declines it
- **Decide whether folder-plan stages write `## Sessions`, then make it true.** Four children running (PRISM-537, 544, 550, 553) reached the retro with the section empty, though `session-orientation.md` asks every persona to append its battery there. Dispatched subagents are the likely reason: they keep no state between turns. Either a stage script appends the `open:` and `close:` line, or the section leaves the folder-plan template and the rule names what replaces it. Done when the next folder plan reaches its retro with the section filled, or the template no longer carries it. — proposed owner: `prism-architect` for the call → ticket proposal via Nora

## Lessons exits

The 90-day window opens 2026-08-29.

**Promoted (0).** None of this run's promotion targets (`hook-runtime.md`, `review-runtime.md`) holds the rule of a lesson.

**Expired (0).** Three entries are dated before 2026-08-29, and each is still cited. "Epic plans are preserved, not deleted" is cited by ADR-0047. "AC evidence commands are code" is cited by `.prism/plans/reviewer-scope-bookkeeping.md`, whose citation landed 2026-09-08. "A control arm that receives an always-on instruction" is cited by `.prism/rules/writing-voice.md`.

**Merged (0).** No two entries record the same rule.

Outside the three exits: "A PR-review re-run PATCHes the marked summary comment" (2026-11-19) describes the summary marker and the PR-review skill this ticket removed. No exit fits it yet, since it is recent and not a duplicate. It is left for the next audit run to archive as obsolete.

## Review-miss classes

`node scripts/ai-skills/hooks/review/reconcile.mjs --classes` printed "No open class has 3 or more rows." So there is no open class, no proposal, and no resolve row to append. `reconcile.mjs 556 --no-write --json` reports `clean: true`, with no unlogged human comment, no thread needing a reply, and no missing PR body heading.

## Citations

### Plan evidence

- `plan.md` `## Decisions`: 23 entries. Four are promoted to `review-runtime.md`, and the rest are ticket tactics or rules codified where the work landed. `spec.md` `## Decisions`: 8 entries. Two are promoted, to `hook-runtime.md` and `review-runtime.md`.
- `## Challenge`: round 1 blocking 4, round 2 blocking 1, round 3 blocking 4 (the `test $? -eq 1` proof shape in T4, T6, T19, and T21), round 4 resolved 4, round 5 clean.
- `## Review`: part 1 round 1 at `283bc090` (0/2/5/3) and round 2 at `5d562281` clean. Part 2 round 1 at `06773215` (0/2/7/1) and round 2 at `67f4b517` clean, with one decision item that Hunter answered.
- `## Verification`: `verdict: done`, base `403e9a30`, head `9ebf4f2d`. The evidence cells are session scratch paths, which the PRISM-550 retro also noted.
- `## Release proof`: old pack from `37cdbd28`, new pack from `5d85b848`. Every AC-6 check passed, and doctor exited 0 with one WARN.
- `## History`: 27 lines. T14 records part 1 as shipped at `403e9a30`.
- `## Sessions`: empty before this retro.

### Execution record

- **PR #554** (part 1): merged as `403e9a30` from head `cf6dffe0`, 199 files, +1629/−3141. `prism-check` succeeded on `ubuntu-latest` and `windows-latest`. It has no review objects, issue comments, or inline threads.
- **PR #556** (part 2): an open draft at `2058c229`, 84 files, +2226/−407 against `origin/main`. One review object from the author's login (COMMENTED, empty body) carries a single inline comment on `.prism/rules/git-conventions.md:118`, marked `<!-- prism-agent -->`. That is the round 2 decision item, posted through `post.mjs`. It has no human comments. CI succeeded at `347d67dd` and is in progress at `2058c229`.
- **Commits after the last review round:** `347d67dd`, `d51cbce7`, `355d9b6a`, `415d9320`, `7bc81a45`, `0fccb303`, `9ebf4f2d`, `2058c229`. Three of them change source.
