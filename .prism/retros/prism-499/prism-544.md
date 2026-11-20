# Retro — PRISM-544

**Target:** `.prism/plans/prism-544/plan.md` and `spec.md`
**Grain:** per-pr
**Generated:** 2026-11-20
**Graded at:** `d31c143f`, the local head of PR #549 (part 5), whose last pushed commit is `f4306ab2`. `d31c143f` adds only the PR-review record to `plan.md`. Parts 1 to 4 are graded at their squashes on `main`: #545 `fdce3e87`, #546 `1a308cd8`, #547 `fd1d1393`, and #548 `e715c91d`.

## Charter coverage

Every source `.ai-skills/config.json#retroEvidence` declares was reached this run. That is git, the GitHub PR platform (`gh` signed in, and `reconcile.mjs 549 --no-write --json` reports clean), and GitHub Actions CI. This retro did not run the test command. Its results come from CI and the verify record. No source is `not configured for this team`, and none was `unreachable this run`. All six questions are answered.

| Charter question | Answer | Sources | Gap |
| --- | --- | --- | --- |
| Did we do what we said? | Yes, as adjusted. All 26 tasks shipped across the five PRs, and the plan's five-part cut held. Requirement 6 and AC-5 lost the subject, `plan:`, and `retro:` denies under Hunter's 2026-11-20 ruling. AC-5 was adjusted and synced to issue #544. Every criterion's machine evidence is graded met. The human halves of AC-7 and AC-11 are open, and the #549 body lists both. | `## Tasks`, `## Acceptance Criteria` and AC Adjustments, `## Review` (part 5 self-review round 1 ticket-wide grades, pr-review round 1 at `f4306ab2`), `spec.md` Requirements and Decisions, `gh pr view 545..549` | the two human checks |
| Were there issues or bottlenecks? | Review volume. Parts 1 to 4 each ran 3 self-review rounds and 3 PR-review rounds. Part 1 took 3 confirm passes, and parts 2 and 3 took one each. The plan took 4 challenge rounds. In parts 2 and 3, each PR-review round found what was left over from the previous round's fix, in the same defect class. Squash merges dropped the task IDs four times, so four commits had to mark tasks done again. One of those miscounts gave `bundles.mjs` 21 duplicate claims. `bundles.mjs` cycles forced two re-plans (T5, T9). | `## Review` round lines, `## Challenge`, `## History` (T5 and T9 re-plans, the done-marking lines after each squash, the part 2 and part 3 retro candidates) | none |
| What improvements could we make? | Make a squash keep the task IDs that `bundles.mjs` reads. Open the follow-up PRs this stack deferred, now that it lands. Run path-sensitive tests in Windows form before the PR, which this ticket's lessons entry already asks for. | the Decisions on the doctor check and the quadratic walk, `## History` done-marking lines, the `## Debugged Issues` Windows entry, `.prism/lessons.md` (the Linux-only verification entry) | none |
| Did we follow the code standards? | Yes, after review. No Critical in any round. Every Major was fixed before its part merged: 20 in self-review and 15 in PR review across the stack. The declines carry reasons, mostly port fidelity (function names, `parseArgs` copies, check labels) and edges that only under-warn. | `## Review`, PR #545 to #548 inline threads, final summary labels | none |
| Did we do anything wrong, or could we have done better? | Five things. Self-review missed what PR review then found in every part except part 5, including part 1's write-gate regressions and part 3's 3 Majors and 14 Minors. Windows path handling reached CI red at least three times (part 1 at `829b09b9`, part 2, and part 3), because verify and self-review run on Linux. The first `RETRO_PATHS` set could not keep up with what `prism-retro` commits. A plan Decision with no subject rule would have prevented that. Two Decisions name each PR's head SHA as its squash (`5966a640` for #545, `5462e75c` for #546). This time the final clean PR-review record (`d31c143f`) was held for the retro commit instead of pushed alone, which is what the PRISM-530 and PRISM-537 retros asked for. | `## Review`, `## Debugged Issues`, CI runs 44701477121 and 44772579391, the `RETRO_PATHS` and subject Decisions, `gh pr view` merge commits, `git log origin/main..HEAD` | none |
| Are the tests passing? | Yes. `main` is green at all four squashes. #549 is green on `ubuntu-latest` and `windows-latest` at `f4306ab2` (run 44800256899). Verify ran clean locally at `1b90ef9d`. `d31c143f` and this retro's commit change only plan and retro files and have not run CI yet. | `gh run list --branch main`, `gh pr checks 549`, `## Verification` | CI pending on the retro push until it runs |

## Fidelity gap

- **Two human checks are open.** For AC-7, run a scratch PR with one unanswered human comment and see the reconcile gate send the `prism-pr-review` stop back. For AC-11, run Atlas on a scratch repo, decline the doc offer, and see no new route or empty doc. Both machine halves pass, and the #549 body lists both checks under its open items.
- **The commit gate shipped without its subject rules, by ruling.** The spec and AC-5 first had the gate deny a non-task subject and fence `plan:` and `retro:` commits to path sets. Part 3 self-review round 1 found that the retro path set could not keep up (findings 5 and 11). Hunter then ruled that any message passes. The code, `hook-runtime.md`, the spec, AC-5, and the tracker all match the ruling.
- **Scope grew by recorded Decisions, not silently.** Eight scope changes landed with a Decision each. Three came under Hunter's rulings: ADR-0076 in part 1, `docs/parameterization.md` in part 2, and `branch-plan.md` in part 3. The others followed from the outcome: `verification-commands.md`, `hook-runtime.md` in part 1, and the onboard agent and `prism-pr-review` copies. `docs/publishing-prism.md:59` was routed to child 9 instead.
- **The spec's two Codex questions stay unprobed.** Codex's `SubagentStart` and `SubagentStop` payloads and Claude's `SubagentStop` matcher took their defaults. `hook-runtime.md` records them as host limits read off the documentation, so nothing claims a live probe.
- **Two Decisions misstate a squash SHA.** "#545 squash-merged at `5966a640`" and "#546 merged at `5462e75c`" give each PR's head commit. The squashes are `fdce3e87` and `1a308cd8`, and `## History` has them right. The verdicts note the correction, and nothing downstream reads those SHAs.

## Action Items

- **Open the follow-up PRs the stack deferred, one per fix, off `main` once #549 merges.** (1) Extend `doctor`'s runtime-without-registration check to the four new entry points, per the Decision that kept it on the three existing ones. (2) Remove the quadratic `readablePrefix` retokenize in `lib/segments.mjs`, per the quadratic-walk Decision, which part 1's PR body listed. (3) Stop `runGate` in `commit-gate.mjs:150` from failing open on any `git add` failure while it builds the index, which PR-review round 3 on #547 named as a follow-up candidate. Each is done when its PR merges with a test that fails on the current code. Each is same-scope with this ticket, so it is a follow-up PR and not a new ticket, per `followup-scope.md`. — proposed owner: the implement stage → follow-up PRs off `main`, no new ticket
- **Keep task IDs through a squash merge, so a stacked plan stops re-marking finished tasks.** Each part's squash carries a ticket subject, so `bundles.mjs --base` read the shipped tasks as open. That took four done-marking commits (`## History`, after #545, #546, #547, and #548), and one miscount gave 21 duplicate claims. The fix belongs in the shipping flow or in `plan/tasks.mjs`: write the task IDs into the squash body and read them there, or count a task done from its merged PR. It traces to the stack Decision's part-opening commit. It is done when a stacked plan's next part opens with no done-marking commit. — proposed owner: `prism-architect` → ticket proposal via Nora

Observation only: twice in part 3, the code writer got around a guard false positive with a scratchpad script (`## History`, the part 3 retro candidate). That makes three times overall, and it adds weight to the existing approval-guard follow-up rather than needing a new item.

## Promotion cautions

- **`RETRO_PATHS` covers the generated copies a promotion commits** (plan Decision), along with the parts of "T13 departs from thrive" and "T14 departs from thrive" that set the `plan:` scope, the subject check on an epic folder, and `SUBJECT_CHECK`. Part 3 self-review round 1 findings 5 and 11 showed the retro path set could not keep up with what `prism-retro` commits, and Hunter's ruling removed all of it. None is promoted. The subject Decision that replaced them is promoted to `hook-runtime.md`.
- **The commit gate reads `commit.mjs` calls** (spec Decision). As first written, only the one `commit.mjs` beside the gate counted, matched by realpath. Part 3 self-review round 1, finding 1, showed a `commit.mjs` call from any other checkout passed with no check at all. It is promoted as corrected: any copy carrying the runtime marker counts, as the Commit gate section of `hook-runtime.md` says.

## Lessons exits

Today's 90-day window opens 2026-08-22, one day after the window the PRISM-530 retro used. An entry counts as cited when a rule, ADR, or architect doc still cites it, or when a plan added or changed a citation of it inside the window. The PRISM-530 retro used the same test.

**Promoted (0).** No verdict this run names a file that now holds a lesson's rule.

**Merged (0).** No two entries record the same rule. "When a review finds one config-sensitive git read, audit every git read in the module at once" and "A bug report's inventory is a snapshot of where the reporter looked" are close, but the first is about one module's calls and the second about a report's scope.

**Kept though older than 90 days (3).**

- "Epic plans are preserved, not deleted, despite branch-plan.md saying "delete"" — ADR-0047's Context cites it.
- "AC evidence commands are code — dry-run them at authoring time" — `.prism/plans/reviewer-scope-bookkeeping.md` added a citation on 2026-09-08.
- "A control arm that receives an always-on instruction doing the same job is not a control" — cited in `.prism/rules/writing-voice.md`.

**Expired (6).** Each is dated before 2026-08-22. Each one's only remaining citation is in `.prism/plans/conductor/architect-gate-port.md` (last changed 2026-08-21), or in plans and retros last touched before that. Each moved whole to `.prism/archived/lessons-archive.md` with an `**Archived:** 2026-11-20` line. The PRISM-530 retro kept four of them yesterday because that plan then sat inside the window.

- "Merge authority recorded only in a handoff, state file, or memory needs an in-session grant before the first merge"
- "A worktree-isolated lane branches from origin/main — plans it must read have to be committed there before dispatch, not left uncommitted in the shared checkout"
- "A safety net that writes into the directory it scans will re-select its own output"
- "A contract that spans two steps is invisible to a review that reads each step alone"
- "A comment that justifies a rule by listing the shapes it governs will be wrong"
- "A measurement over this repo's fixtures cannot bound a claim about code that ships elsewhere"

## Review-miss classes

`node scripts/ai-skills/hooks/review/reconcile.mjs --classes` printed "No open class has 3 or more rows." `.prism/metrics/review-misses.jsonl` does not exist, so there is no open class, no proposal, and no row to append.

`reconcile.mjs 549 --no-write --json` reports `clean: true`, with no unlogged human comment, no thread needing a reply, and no missing PR body heading.

## Citations

### Plan evidence

- `plan.md` `## Decisions`: 50 entries, chiefly the five-part stack, the subject ruling and its no-task consequence, `RETRO_PATHS` (superseded), the secrets-gate caps and residues, the reconcile counter move, the brief-shape sentence, and the two deferred follow-ups.
- `spec.md` `## Decisions`: 11 entries, chiefly the gated roles, the `testGlobs` default, `commit.mjs` recognition (corrected), the hold rename, the remedy path relative to `cwd`, and the `branch-plan.md` scope change.
- `## Challenge`: round 1 blocking 1 (T11 fixture), round 2 blocking 1 (T18 proof), round 3 blocking 1 (T4 assertion), round 4 resolved.
- `## Review`: parts 1 to 4 each ran self-review rounds 1 to 3 and PR-review rounds 1 to 3, plus confirm passes (3 on part 1, 1 each on parts 2 and 3). Part 5 ran self-review round 1 (1 nit, declined) and PR-review round 1, clean at `f4306ab2`.
- `## Verification`: `verdict: done`, base `e715c91d`, head `1b90ef9d`, five checks passing and `format` n/a. Every evidence cell is a session scratch path, which a reader of the merged plan cannot open, as the PRISM-537 retro also recorded.
- `## Debugged Issues`: the Windows under-deny in `namesSecret` and `expandGlob`, fixed at `c58a55ed`.
- `## History`: the T5 and T9 re-plans, four done-marking commits, the retro candidates from parts 1, 2, and 3, and the lead set at byte 31,879 after T22.
- `## Acceptance Criteria`: AC-1 to AC-13, and the AC-5 adjustment with its two sync rows.

### Execution record

- **#545 (part 1)**, squash `fdce3e87`, head `5966a640`, 34 files, +2,241/−458, labels `effort:deep` and `confidence:needs-judgment`.
- **#546 (part 2)**, squash `1a308cd8`, head `5462e75c`, 37 files, +3,708/−59, labels `effort:deep` and `confidence:needs-judgment`. The Windows under-deny came from run 44701477121.
- **#547 (part 3)**, squash `fd1d1393`, head `c784e073`, 62 files, +6,715/−99, labels `effort:deep` and `confidence:high`. Run 44772579391 failed 18 tests on `windows-latest` at PR-review round 1.
- **#548 (part 4)**, squash `e715c91d`, head `26a6d3f2`, 37 files, +2,758/−62, labels `effort:deep` and `confidence:needs-judgment`.
- **#549 (part 5)**, open as a draft at `f4306ab2` on GitHub, 12 files, +130/−17, labels `effort:quick` and `confidence:needs-judgment`. `prism-check` passed on both legs in run 44800256899. At the local head it has 11 first-parent commits since `e715c91d`: 3 task commits, 2 done-marking commits, and 6 `plan:` commits.
- **`main` CI**: success at `fdce3e87`, `1a308cd8`, `fd1d1393`, and `e715c91d`.
