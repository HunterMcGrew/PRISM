# Retro — PRISM-537

**Target:** `.prism/plans/prism-537/plan.md`
**Grain:** per-pr
**Generated:** 2026-11-19
**Graded at:** `efc1fc45`, the head of PR #542 (part 2). Part 1 is graded at its squash `d83ffd7a` on `main`, from PR #541 at `166a62c5`.

## Charter coverage

Every source `.ai-skills/config.json#retroEvidence` declares was reached this run: git, the GitHub PR platform for both PRs' reviews, inline comments, and issue comments, and GitHub Actions CI. The test command was not run by this retro. Its results come from the CI runs and the verify record. No source is `not configured for this team`, and none was `unreachable this run`. All six questions are answered.

| Charter question | Answer | Sources | Gap |
| --- | --- | --- | --- |
| Did we do what we said? | Yes, with six scope changes, each recorded as a Decision. All 13 tasks landed: T1 to T9 in the #541 squash, T10 to T13 on #542. Every criterion's machine half is met in the review records. The human halves of AC-1, AC-4, AC-5, and AC-6 are open, and the PR body lists them. | `## Tasks`, `## Acceptance Criteria`, `## Decisions`, `## Review`, first-parent `git log d83ffd7a..efc1fc45`, PR #542 body | the four human checks |
| Were there issues or bottlenecks? | Review volume, mostly from one class. The plan took 4 challenge rounds. Part 1 took 2 self-review and 2 PR-review rounds. Part 2 took 3 self-review and 2 PR-review rounds, and 16 of its 27 first-parent commits are `plan:`. One class came up four times in part 2: a route change written into one place and not into the sibling texts that state the same handoff. | `## Challenge`, `## Review` class lines, `git log` | none |
| What improvements could we make? | When reversing a retirement, walk the retiring commit's file list. Give a folder plan a home for a confirmed bug finding. Stop pushing the final clean PR-review record alone. | `## Review` part 2 PR-review round 1, the Sasha workflow Decision's amendment, CI runs 44639742746 and 44639999158 | none |
| Did we follow the code standards? | Yes, after review. No Critical. Two Majors, one per part, both an ADR claim that diverged from its source. Every Minor and nit was fixed, except one nit declined (the snapshot nit, a verbatim port), one Minor declined (`docs/workflow.md`, child 9's file), and one plan-drift Minor the author acknowledged. | `## Review`, PR #541 and #542 inline threads, `reconcile.mjs 542 --no-write --json` | none |
| Did we do anything wrong, or could we have done better? | Three things. The final PR-review record was pushed alone at `9b6cf103`, and CI went red on both legs, the same thing the PRISM-530 retro recorded earlier today. The out-of-diff test in `REVIEW.md` was applied two ways in PR-review round 1. This child has no `spec.md`, so `auto-approve.mjs` could not run and Hunter approved the plan by hand. | CI runs above, `## Review`, the folder-shape Decision, `.prism/retros/prism-499/prism-530.md` | none |
| Are the tests passing? | Not at the head, by design. Part 1 ran green 6 of 6 on its branch, and `main` is green at `d83ffd7a`. Part 2 ran green at `371f6f02`, `8ff5e7a1`, `8365094a`, and `6d71bb75`. It failed on both legs at `9b6cf103` and `efc1fc45`, on one test, "PRISM's own plans all pass" in `plan-retro-line.test.ts`, which the `Retro:` line this retro writes clears. | `gh run list` on both branches and `main`, `gh run view 44639999158 --log-failed` | CI pending on the retro's push until it runs |

## Fidelity gap

- **Four human checks are open.** AC-1 (reading each Voice block for a restated rule), AC-4 (a scratch-PR run showing no Eric voice in posted comments), AC-5 (a planted-bug Sasha run that leaves only a lessons entry), and AC-6 (a fresh session routing "Sasha, look at this" and "this is broken"). PR-review round 1 on #541 noted that its own posted comments carry no greeting or signature, which can stand as AC-4's evidence if Hunter accepts it. The PR body lists all four.
- **The consumer `AGENTS.md` template was missed until PR review.** T10's file list named root `AGENTS.md` and the routing rule's twin, but not `templates/install/AGENTS.md.tmpl`, which 020859f7 edited when it retired Sasha. PR-review round 1 on #542 found it (Minor), and d4da16d8 fixed it under a scope-change Decision Hunter approved.
- **Three task texts dictate the pre-amendment handoff.** T10, T11, and T13 still name only the intent route, while the shipped route also sends Sasha's report to Clove inside an approved ticket and to Nora outside it. The author acknowledged this on the PR thread: the tasks stay the record of what was planned, and the amended Decision records what shipped.
- **A folder plan has nowhere to record a confirmed bug finding.** Self-review round 1's fix prescribed recording Sasha's report under `## Debugged Issues`, and the implementer amended the Decision instead, because a folder plan has no such section. `prism-implement` (`shared.md:32`) and the Bug workflow and Bug Report Lifecycle in `ticket-workflows.md` still send a confirmed finding there on any plan. Self-review round 2 recorded the Bug workflow text as out of scope, since it predates the branch.
- **The child folder has no `spec.md`.** The workflow rule and `plan-chain-scripts.md` describe an epic child's folder as holding `spec.md` and `plan.md`. This child, like children 5 and 6, put its acceptance criteria in `plan.md` and wrote no spec, so `auto-approve.mjs` exits 1 and Hunter approved the plan in chat. The folder-shape Decision records the choice. It costs one manual approval per child.

## Action Items

- **Give a folder plan a home for a confirmed bug finding, and point `prism-implement` and the Bug workflow at it.** `prism-implement/shared.md:32`, the Bug workflow step 2, and Bug Report Lifecycle step 4 in `ticket-workflows.md` name `## Debugged Issues`, which `.prism/templates/plan.md` does not carry. The change is a skill and an architect doc outside this ticket's systems, and it predates this branch. It traces to the Sasha workflow Decision's self-review amendment. It is done when a bug fixed on a folder plan has one named place its confirmed root cause is recorded, and all three texts name it. — proposed owner: `prism-architect` for the home, then the implement stage → ticket proposal via Nora
- **Stop the final clean PR-review record from going out in a push of its own.** On both PRISM-530 and PRISM-537 the clean record was pushed before the retro (`41107d81` there, `9b6cf103` here), and the retro-line test failed CI on both legs each time. The PRISM-530 retro records that ADR-0083 treats that red run as the check doing its job, but a red run on a ready PR reads as a broken PR to anyone who looks before the retro lands. A second occurrence makes it a pattern. The fix is in the shipping flow or the PR-review stage: hold the push of a final clean record until the retro commit is on top. — proposed owner: `prism-architect` → ticket proposal via Nora

Observation only: `docs/workflow.md` line 37 still sends every mid-build bug to Clove and has no Sasha row. Child 9 owns that file and must cover it. The PR body's scope list now names the template, so PR-review round 2's body nit is resolved.

## Lesson candidates

Three candidates came from PR review. Per-PR grain appends none, so the two that hold are proposed for the main session to append.

- **(a) holds.** When a change reverses a retirement, walk the retiring commit's file list as the checklist. 020859f7 edited `templates/install/AGENTS.md.tmpl`, and the reversal missed it until PR-review round 1. A tree grep for the moved phrase would also have found it, which `code-standards.md` already asks for under Removal and rename completeness. The commit's file list is the cheaper check and catches a file whose text shares no token with the change.
- **(b) dropped.** It restates `REVIEW.md` line 60, which already says a finding names a diff line that causes it and anything else is an observation. It also states that rule more narrowly than the rulebook does: "cites a line in the diff" is not "names a diff line that causes it". The record shows the rule applied two ways in one round. The template Minor and the `docs/workflow.md` Minor both cited files outside the diff, and both were caused by diff lines. One was fixed as a finding, and round 2 moved the other to Out of scope for having no diff line. That inconsistency is worth a note to whoever next edits the rulebook, but it is not a new lesson.
- **(c) holds.** Before writing a handoff that tells a skill to record into a plan section, check the folder-plan template carries that section. Self-review round 1 prescribed `## Debugged Issues` for Sasha's report, and the shipped Decision had to route around it. Two older texts still make the same assumption (Action Items above).

## Promotion cautions

- **The Sasha workflow Decision, as first written, sent every diagnosis to Mira.** Self-review round 1 (Minor, `.prism/architect/_toolkit/ticket-workflows.md:110-115`) showed a diagnosis made inside an approved ticket landed nowhere, because `prism-intent` treats an approved intent as done. The Decision was amended in the plan, and the shipped texts carry the amended route. Promoted as corrected: `ticket-workflows.md` under Mid-Ticket Moves, and ADR-0085.

## Lessons exits

**Promoted (0).** No verdict this run names a file that now holds a lesson's rule.

**Expired (0).** The PRISM-530 retro ran the 90-day exit earlier on 2026-11-19 and kept six entries older than 90 days, each with a live reference. Those references still stand, and every other entry is dated 2026-08-21 or later.

**Merged (0).** No two entries record the same rule.

## Review-miss classes

`node scripts/ai-skills/hooks/review/reconcile.mjs --classes` printed "No open class has 3 or more rows." `.prism/metrics/review-misses.jsonl` does not exist. There is no open class, no proposal, and no row appended.

`reconcile.mjs 542 --no-write --json` reports no unlogged human comment and one thread needing a reply: the plan-drift thread at `plan.md:608`. Its last comment is the author's acknowledgement, posted without the agent marker, so reconcile reads it as a person's. PR-review round 2 left that thread open as a judgment call. It needs Hunter's resolve or reply before merge.

## Citations

### Plan evidence

- `## Decisions`: all 21 entries, chiefly the folder shape, the stack, the Voice placement, the Sasha workflow and its amendment, and the six scope changes.
- `## Review`: part 1 self-review rounds 1 and 2 and PR-review rounds 1 and 2; part 2 self-review rounds 1 to 3 and PR-review rounds 1 and 2, with their class and sweep lines.
- `## Verification`: `verdict: done`, base `d83ffd7a`, head `8365094a`, five checks passing and `format` n/a. Every evidence cell is a session scratch path, which a reader of the merged plan cannot open.
- `## Challenge`: round 1 clean, rounds 2 and 3 blocking 1, round 4 resolved 1.
- `## History`: the T3, T4, T5, and T10 loaded-line totals and the `AGENTS.md` lead-set offset of 31,708.
- `## Acceptance Criteria`: AC-1 to AC-10.

### Execution record

- **PR #541 (part 1).** Squash-merged as `d83ffd7a`, 155 files, +2,808/−40. Two inline findings and their two replies, one summary comment carrying `prism-verdict: state=3`, labels `effort:deep` and `confidence:needs-judgment`. CI green on both legs at `166a62c5`, 6 of 6 runs on its branch, and green on `main` at `d83ffd7a`.
- **PR #542 (part 2).** Draft at `efc1fc45`, 69 files, +1,169/−69, 27 first-parent commits since `d83ffd7a`: 11 task or fix, and 16 `plan:`. Five inline comments in two threads, the last of them the author's acknowledgement. The summary comment carries `prism-verdict: state=3`, and the labels are `effort:deep` and `confidence:needs-judgment`.
- **CI on part 2.** Runs 44636432217 (`371f6f02`), 44638079738 (`8ff5e7a1`), 44638786941 (`8365094a`), and 44639120337 (`6d71bb75`) passed. Runs 44639742746 (`9b6cf103`) and 44639999158 (`efc1fc45`) failed on `ubuntu-latest` and `windows-latest` at test 1638, "PRISM's own plans all pass, the positive control for today's tree".
- **020859f7** (`PRISM-499: Delete Sasha, Ren, and Theo`) touches root `AGENTS.md` and `templates/install/AGENTS.md.tmpl`, the file the reversal missed.
- **Folder-plan template.** `git grep "Debugged Issues" .prism/templates/plan.md` finds nothing, while `prism-implement/shared.md` lines 28 and 32 name the section.
