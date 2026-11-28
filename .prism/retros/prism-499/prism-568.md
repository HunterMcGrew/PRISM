# Retro — PRISM-568

**Target:** `.prism/plans/prism-568/plan.md` and `spec.md`, both parts of the stack
**Grain:** per-pr
**Trigger:** challenge: round 3; challenge: round 4; challenge: round 5; challenge: round 6; amended: T8; amended: T11; amended: T12; amended: T13
**Generated:** 2026-11-28
**Graded at:** `9adb6687`, the head of PR #571 (part 2). Part 1 is graded at its merge, `9aca8b54` (PR #570, final head `2d7dd73e`).

## Charter coverage

This run reached every source `.ai-skills/config.json#retroEvidence` declares: git, the GitHub PR platform (`gh` signed in), and GitHub Actions CI. No source reads `not configured for this team` or `unreachable this run`. All six questions are answered. Part 2's Windows check was still running when this run began reading and had failed by the end of it, and the table says so.

`retro-trigger.mjs` exited 0 with the eight reasons on the `**Trigger:**` line. No `review:` reason fired, because all three recorded review lines read a bare `clean`. The four `challenge:` reasons are not a fix loop on the original plan: rounds 1 and 2 were clean, and rounds 3 to 6 are two re-challenges after post-approval amendments (see Fidelity gap).

| Charter question | Answer | Sources | Gap |
| --- | --- | --- | --- |
| Did we do what we said? | Yes for AC-1 to AC-12, graded by this run against the tree at `9adb6687`. No for part 2's AC-13, which fails on windows. Targeted tests (`plan-size`, `commit-gate-size`, `commit-gate-test-guard`, `plan-approve`, `plan-templates`, `skill-loaded-lines`, `one-review`, `plan-runtime-delivery`) ran 227 tests with 0 failures, and `plan-size.test.ts` does not exist at `1b3904cd`. The evidence greps print as required: `SIZE_CHECK` is second in `GATE_CHECKS` after `CONFIG_CHECK`, `size.mjs` carries the marker with a `.d.mts` sidecar and no package import, `four checks` prints 2 and `three checks` 0 in both `hook-runtime.md` copies, `OVER_CAP_ALLOWLIST` is `{}`, the workflow rule has 4 `small or standard` rows, 1 `small, no ticket-subject` row, and 1 `standard or epic` row, and the sentence saying the gate trusts `size:` as written is in each `hook-runtime.md` copy. AC-13 for part 1 passed on ubuntu and windows at merge. For part 2, ubuntu passed at `9adb6687` and windows failed in run 46132660092 (see Fidelity gap). | `plan.md` Acceptance Criteria, `git diff`, the greps above, `gh pr view 570 571 --json statusCheckRollup`, `gh run view 46132660092 --log-failed`, local `npx tsx --test` | none |
| Were there issues or bottlenecks? | Four plan amendments after approval (T8, T11, T12, T13) and six challenge rounds. Per Hunter's note, two amendments followed weakened-tests denies (T8, T11). The plan records the deny only on T8's `amended` line. T11's line names a full-suite run that found `one-review.test.ts` still keyed on the old row text. Each amendment cost two challenge rounds, a first that blocked or resolved and a confirm. | `## Challenge`, `amended` lines on T8, T11, T12, T13, `git log 9aca8b54..HEAD` | The commit gate's deny text on T8 and T11 is not stored in the plan, so the two denies are read from the amendment lines and Hunter's note. |
| What improvements could we make? | Sweep the tests for the old value of every behavior a requirement reverses or renames, and list those test files in the task with `behavior change:` before approval. Close the gap in the small flow's end-of-ticket text, and run path-sensitive tests for Windows forms before a push (see Fidelity gap and Action Items). | `plan.md` T8 and T11, `spec.md` REQ-5 and REQ-11 | none |
| Did we follow the code standards? | Yes, after review. Verify passed at head `80acae36` (base `9aca8b54`): typecheck, test, lint, build, and spec, with format `n/a: not configured`. Part 1's round 1 was clean at `ea512f91`. Part 2's round 1 was clean at `ed27e4a4` with one Minor, the build-report sentence in `workflow.md` not scoped to a standard ticket, fixed by `T11 fix` and `T13 fix`, and round 2 was clean at `035275ee`. `merge-bar.mjs` exits 0 at `9adb6687`, since the commits after `035275ee` touch only the plan folder. `reconcile.mjs --classes` reports no open class. | `## Verification`, `## Review`, #570 and #571 bodies, `merge-bar.mjs`, `reconcile.mjs --classes` | The plan holds one line per round, so the review's findings were read from the #571 body and not the review's own report. |
| Did we do anything wrong, or could we have done better? | Two things the record shows, both in Fidelity gap: the spec's Outgrowing steps had no home in a rule or skill and named `git rm`, which `commit.mjs` cannot commit, and the plan's tasks missed two tests that pin behavior the requirements change. | `spec.md` Design and Decisions, `lessons.md` | none |
| Are the tests passing? | Not on windows for part 2. Locally on Linux, 227 of 227 pass in the targeted set above, and verify's full suite ran with 0 failed and 1 skipped per the #571 body. Part 1's `prism-check` passed on ubuntu and windows. Part 2's passed on ubuntu and failed on windows at `9adb6687`: two tests in `plan-approve.test.ts`, "approving a small intent writes plan.md from plan-small.md with the intent's title, ticket, and approval lines" and "re-approving a small intent leaves an existing plan.md byte-for-byte unchanged", fail a deep-equal on paths. The actual list holds `C:/Users/RUNNER~1/...` and the expected one `C:\\Users\\RUNNER~1\\...`. | `gh pr view --json statusCheckRollup`, `gh run view 46132660092 --log-failed`, local `npx tsx --test`, #571 body | The log shows which assertion failed and the two path forms, and not which side builds its path wrong. The builder reads the test and `approve.mjs` to decide. |

## Fidelity gap

- **Every requirement shipped, and scope moved only through recorded Decisions.** The two-PR cut, the `.prism/**` record rule found by challenge round 1, `one-review.test.ts` added to the Affected systems, and `hook-runtime.md` added to T12 and T13 are each a plan or spec Decision. Hunter's ruling that only added product lines count is in both Decision lists and in part 1's script and docs.
- **Challenge rounds 3 to 6 are two re-challenges after amendments, not a fix loop.** Rounds 1 and 2 were clean. The T11 amendment sent the plan back through rounds 3 and 4, and round 3 found a blocking flaw in a Decision that rounds 1 and 2 had passed: the T8 Decision had the builder write its probe result into `plan.md`, which T8's `files` does not list, so the report would have read `needs-replan`. The size-flip amendment went through rounds 5 and 6, and round 5 blocked because section signs in the amendment prose failed `pnpm prism:plan-citations`, the check `.prism/lessons.md` already names. Both blocks were caught before the build ran on them, so the challenge did its job, at the price of four rounds.
- **The amendments share one cause.** REQ-5 reverses an existing assertion (`small` is refused) and REQ-11 renames a row `one-review.test.ts` pins. The requirements said so, and the tasks did not list the tests or declare `behavior change:`, so the commit gate and a full-suite run found them during the build. `.prism/rules/code-standards.md` § Removal and rename completeness asks for a tree-wide search for an old name, and this is the plan-stage version of it. Observation only: the PRISM-565 retro proposed the adjacent item for task proofs, so the epic retro weighs the two together.
- **Part 2's AC-13 is unmet: two new tests fail on windows.** Verify, both review rounds, and the local run were Linux. The failing assertions compare a path the approval script writes, `C:/Users/...`, with one the test builds, `C:\\Users\\...`. `.prism/lessons.md` § Linux-only verification lets Windows path failures reach the PR's CI describes this class, from PRISM-544, and this is its second occurrence. The review's `clean` lines and the green ubuntu check both pass over it, and `merge-bar.mjs` exits 0, because the bar reads review lines and not CI.
- **The size is the person's to approve "as it is today", and today the guard does not stop a `size:` edit.** REQ-6 and the Outgrowing design assumed the approval covers the size. The approve guard compares only `status`, `approved_by`, and `approved_at`, so an Edit that flips an approved intent's `size: small` to `standard`, or edits any other body line, exits 0. Part 1's review asked, T8's probe confirmed it, `prism-architect` ruled to document it here and fix it in general, and T12 added the sentence to `hook-runtime.md`. The control is the person reading the intent's diff until the general fix lands.
- **The Outgrowing steps had no home when the work shipped, and named `git rm`.** The spec's Design says the session sets `size: standard`, asks once, commits the intent, and removes the small `plan.md` with `git rm`. At `9adb6687` `workflow.md` says only that a `standard` report makes the ticket standard, and `prism-implement` says to stop, so the procedure lived only in `spec.md`. The `git rm` step also fails: in a scratch repo, `git rm` then `commit.mjs "plan: x" p/plan.md p/intent.md` exits 128 with `pathspec 'p/plan.md' did not match any files`, and a plain `rm` first commits the deletion. `.prism/lessons.md` § `git mv` and `git rm` break `plan/commit.mjs` already says so. This close step wrote the procedure into `plan-chain-scripts.md` with `rm` (see Promotion cautions).
- **Observation, no action item: a small ticket's retro will usually read `none — no trigger`.** A small plan has no tasks and no challenge, so only a `review:` reason can fire, and a clean review prints none. `plan-small.md` still carries `<!-- Fill the Retro line with the retro report's path. The retro always runs. -->`, copied from `plan.md` byte for byte, and `plan-templates.test.ts` pins the two equal. The PRISM-565 retro's action item already covers the line in `plan.md`, and the test means the fix edits both files together.
- **Observation, no action item: items already carried to child 16.** `closing-messages.md` routes the intent stage to the spec stage by default, `prism-implement`'s small bullet still says to load architect docs for the plan's tasks, `docs/what-prism-writes.md` does not list `size.mjs`, and `AGENTS.md` has about 600 bytes of headroom for child 15. All four are in the #570 and #571 open items.

## Action Items

- **Fix the two windows failures in `plan-approve.test.ts`.** Compare the paths in the form the approval script writes, or write them in the form the test expects, so `prism-check (windows-latest)` passes on part 2. Done when the windows check is green at the new head and the ubuntu check stays green. Traces to AC-13 for part 2 and run 46132660092. — proposed owner: `prism-implement`, as a `T8 fix:` commit on part 2's branch before merge → no ticket, per `.prism/rules/followup-scope.md`
- **Add the approved-text hash.** `approve.mjs` stamps a hash of the approved file's text, and the guard or the commit gate treats a mismatch as unapproved, so a body edit or a `size:` flip needs a fresh `approve`. Done when a test shows an Edit to an approved intent's `size:` line is denied or voids the approval. Traces to the plan Decision "The approve guard lets an unapproved `size:` flip through", the #571 body's "Follow-up ticket recommended", and `prism-architect`'s ruling that the general fix is a standalone ticket. — proposed owner: Nora → ticket proposal via Nora, under `.prism/rules/followup-scope.md`'s scope-fit gate (one fix, traceable to that Decision, with the done condition above, implementation work)

## Promotion cautions

- **Spec Decision "An outgrown small ticket removes its `plan.md` and restarts as standard" says `git rm`, which fails with `commit.mjs`.** The rationale holds: an approved file is removed and not edited, and the approve guard lets the removal through. The mechanism does not hold. Verified in a scratch repo at `9adb6687`: `git rm` then `commit.mjs` exits 128, and a plain `rm` then `commit.mjs` exits 0 and commits the deletion. The Decision was promoted as corrected, with `rm`, into `plan-chain-scripts.md`'s Size section, and the spec Decision carries a sub-bullet saying so.

## Lessons exits

The 90-day window opens 2026-08-30.

**Promoted (0).** No lesson's rule now lives in a file this run's verdicts name. The promoted Decisions land in `plan-chain-scripts.md`, `hook-runtime.md`, and `workflow.md`, and no lesson states their rules. The `git mv` and `git rm` lesson is general and stays, because the new paragraph names one case of it.

**Expired (0).** Three entries are dated before 2026-08-30, and each is still cited. "Epic plans are preserved, not deleted" is cited by ADR-0047. "AC evidence commands are code" is cited by `.prism/plans/opus5-port.md` and `.prism/plans/reviewer-scope-bookkeeping.md`. "A control arm that receives an always-on instruction" is cited by `.prism/rules/writing-voice.md` and `.prism/plans/writing-voice-port.md`. The first heading in the file, "Don't reach for X when Y is available", is the format example inside a code fence and not an entry.

**Merged (0).** No two entries record the same rule.

**Appended (0).** A per-PR retro proposes no lesson candidates. The `git rm` recurrence and the Windows path failure are covered by existing entries.

## Review-miss classes

`node scripts/ai-skills/hooks/review/reconcile.mjs --classes` printed "No open class has 3 or more rows." So there is no open class, no proposal, and no resolve row to append. The misses log does not exist, since no human comment on either PR was ever logged.

## Citations

### Plan evidence

- `plan.md` `## Decisions`: 12 entries, each given a verdict this run (5 `promoted`, 7 `no promotion needed`). `spec.md` `## Decisions`: 10 entries (7 `promoted`, 3 `no promotion needed`).
- `plan.md` `## Tasks`: T8, T11, T12, and T13 carry `amended` lines, the four `amended:` trigger reasons. `## Challenge`: rounds 3 to 6, the four `challenge:` reasons.
- `spec.md` REQ-3, REQ-5, REQ-6, REQ-11, and the Design sections "The commit gate arm" and "Outgrowing".

### Execution record

- PR #570: merged at `9aca8b54`, head `2d7dd73e`, `prism-check` green on ubuntu and windows, no comments or reviews.
- PR #571: draft at `9adb6687`, `prism-check` ubuntu passed and windows failed (run 46132660092, two `plan-approve.test.ts` cases), no comments or reviews.
- `git log 9aca8b54..HEAD`: `T1-T6` record commit, `T7` to `T13`, `T11 fix` (`31819f38`, `aec52749`), `T13 fix` (`80acae36`), and the `plan:` commits for challenge, verify, and review.
- `## Verification` (done, base `9aca8b54`, head `80acae36`) and `## Review` (three lines, all `clean`).
- Scratch-repo run of `commit.mjs` after `rm` and after `git rm`, described in Promotion cautions. `.prism/lessons.md` § `git mv` and `git rm` break `plan/commit.mjs`.
