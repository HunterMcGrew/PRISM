# AC Verification — reviewer-scope-bookkeeping

> **Plan:** `.prism/plans/reviewer-scope-bookkeeping.md`
> **Graded at SHA:** `f748499c718be4a14fba100b7c4b56b844582299`
> **Date:** 2026-09-08
> **Environment:** detached HEAD at `origin/huntermcgrew/reviewer-scope-bookkeeping-rule`, worktree `.claude/worktrees/wf_cb2c787f-341-5`
> **Diff base:** `origin/main` at `972c77578dbbbe889150459169ac50bf5b8f6471` — the merge-base equals that tip, because the branch merged `main` at `da2b08ae`, so the three-dot and two-dot diffs agree
> **Verifier:** Reese, AC Verification mode

This is the second executed grading pass. The first ran at `95bf7102`, immediately after the branch merged `origin/main` (PR #489's review-loop restructure and PR #488's git gates); two review-fix commits have landed since. Every machine criterion was re-run from scratch at the SHA above rather than trusting the marks the plan or the earlier pass already carried.

---

## Verdict table

| ID   | Verdict | Evidence type | Citation                                                                                                                                                                                    |
| ---- | ------- | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC-1 | MET     | executed      | `grep -o 'bookkeeping-only'` over `.ai-skills/skills/prism-code-review-pr/shared.md` → `4` (threshold `>= 3`); positive control over `.prism/rules/followup-scope.md` → `3`                 |
| AC-2 | MET     | executed      | `grep -o 'sub-bullets under'` over `.prism/rules/followup-scope.md` → `1`; `grep -o 'lines those Evidence sub-bullets hang from'` → `1` (both thresholds `>= 1`)                            |
| AC-3 | MET     | executed      | `grep -o 'classifies the finding, not the reviewer'` over `.prism/rules/followup-scope.md` → `1` (threshold `>= 1`)                                                                         |
| AC-4 | MET     | executed      | `grep -o '## Cleanup Items'` over `.ai-skills/skills/prism-review-loop/shared.md` → `0` (threshold `0`); positive control over `.prism/rules/followup-scope.md` → `1`                       |
| AC-5 | MET     | executed      | `head -3 .prism/rules/followup-scope.md` shows `load: always`; the `.prism/rules/`-scoped diff against the base returns exactly one path, and that path is `.prism/rules/followup-scope.md` |
| AC-6 | MET     | executed      | `grep -o 'Spec content never rides an unrelated ticket'` over `.prism/rules/followup-scope.md` → `3` (threshold `>= 3`, stated baseline `2`)                                                |
| AC-7 | MET     | executed      | `pnpm prism:check` → exit `0`; 901 tests, 899 pass, 0 fail, 2 skipped                                                                                                                       |
| AC-8 | MET     | executed      | the conductor-scoped diff against the base returns `0` paths; positive control over `.ai-skills/skills/` returns `3`                                                                        |

**Machine totals:** 8 MET, 0 UNMET, 0 UNGRADEABLE.

**Tree-clean discipline:** `git status --porcelain` returned empty before grading and again after the final criterion, including after the `pnpm prism:check` leg. No tracked file moved during the run.

---

## Captured output

### AC-1

```
$ grep -o 'bookkeeping-only' .ai-skills/skills/prism-code-review-pr/shared.md | wc -l
4
$ grep -o 'bookkeeping-only' .prism/rules/followup-scope.md | wc -l     # positive control
3
```

Three of the four land where the criterion's evidence predicted: line 268 (decision-gate state #2), line 269 (state #3), and line 304 (the review-rung verdict paragraph). The fourth, at line 276, is the confidence-label cap Eric's PR-review pass 1 asked for, together with the precedence clause pass 2 added to it — both inside the same decision-gate paragraph the criterion targets, so the count rose without the criterion's meaning shifting. Task 3's twin edit in `.ai-skills/skills/prism-code-review-self/shared.md` is present at line 291.

### AC-2

```
$ grep -o 'sub-bullets under' .prism/rules/followup-scope.md | wc -l
1
$ grep -o 'lines those Evidence sub-bullets hang from' .prism/rules/followup-scope.md | wc -l
1
```

Both halves the criterion requires returned at threshold: the inclusion (Evidence sub-bullets count as bookkeeping) and the exclusion (AC criterion lines do not).

### AC-3

```
$ grep -o 'classifies the finding, not the reviewer' .prism/rules/followup-scope.md | wc -l
1
```

### AC-4

```
$ grep -o '## Cleanup Items' .ai-skills/skills/prism-review-loop/shared.md | wc -l
0
$ grep -o '## Cleanup Items' .prism/rules/followup-scope.md | wc -l      # positive control
1
```

The positive control confirms the pattern matches a live file, so the `0` is a real absence rather than a pattern that could never match.

### AC-5

```
$ head -3 .prism/rules/followup-scope.md
---
load: always
---

$ (diff --name-only against the base, scoped to .prism/rules/)
.prism/rules/followup-scope.md
(count: 1)
```

### AC-6

```
$ grep -o 'Spec content never rides an unrelated ticket' .prism/rules/followup-scope.md | wc -l
3
```

Above the stated `2` baseline — the heading itself plus the pre-existing reference under the rule's who-runs-this section — so the third occurrence is the new section's citation.

### AC-7

```
$ pnpm prism:check
... build --check, check-types, test, verify-manifest, crossref-lint,
    spec-scope-lint, ship-closure, verify-pack ...
crossref-lint passed. All prose cross-references resolve.
install-adr-gate passed. No forbidden ADR references on the install surface.
install-relative-link-gate passed. All relative links on the install surface resolve.
Ship-surface closure holds - 346 file(s) reachable.
verify-pack-parity: all 9 runtime-read path(s) present in the tarball.
EXIT=0

$ pnpm prism:test
tests 901
pass 899
fail 0
skipped 2
```

One note on how this leg ran, so the exit code is not read as stronger than it is. Under a detached HEAD, `spec-scope-lint` cannot resolve a branch name and reports `no live plan resolved for this branch - skipping`, which passes vacuously. The earlier pass at `95bf7102` re-ran that leg with the branch identity supplied through the head-ref environment variable the lint reads before falling back to the current-branch lookup, and it printed `spec-scope-lint passed. No unrelated spec content found.` at exit `0`. The files that lint reads are unchanged between the two SHAs, so that result carries forward.

### AC-8

```
$ (diff --name-only against the base, scoped to .ai-skills/skills/prism-conductor/ and .prism/skills/prism-conductor/) | wc -l
0
$ (diff --name-only against the base, scoped to .ai-skills/skills/) | wc -l    # positive control
3
```

The changed paths are the canonical sources — three skill bodies (Eric, Briar, the review loop), the rule file, `AGENTS.md`, this plan, and this report — plus one generated mirror per platform for each changed skill and rule, and the install seed. No conductor path appears in the list.

---

## Post-merge re-verification

The branch merged `origin/main` after the plan's first grading pass, so the two criteria whose evidence targets a file `main` also touched were examined beyond their probe.

- **`.ai-skills/skills/prism-review-loop/shared.md` (AC-4).** The hand-resolved Ledger bullet keeps this branch's citation to `.prism/rules/followup-scope.md` and appends `main`'s loop-local additions — the PR body and the loop-emitted readiness line — which is what the re-land Decision describes. Five of the six bookkeeping section names were probed beyond the one AC-4 names: the review-issues, history, sessions, debugged-issues, and cleanup-items headings each return `0`. The sixth, `## PR Readiness`, returns `1` — the bullet's own replacement text names it once by design, to explain why it's persona-rewritten bookkeeping rather than Subject content (see the plan's task 4), which is a reference mention, not the six-name restated list AC-4's probe targets.
- **`.ai-skills/skills/prism-code-review-pr/shared.md` (AC-1).** `main`'s changes did not disturb the decision gate; states #2 and #3 carry the qualifier at lines 268-269, and the two review-fix commits since added the confidence cap and its precedence clause at line 276 without altering either state's entry condition.

---

## Awaiting human verification

These criteria carry `Evidence (human)` sub-bullets. They are not machine-graded, are excluded from the totals above, and surface at the human merge gate.

- [ ] **AC-1 (human).** Read the decision-gate section of `.ai-skills/skills/prism-code-review-pr/shared.md` and confirm a pass holding only bookkeeping-only minors routes to state #3, which applies `effort + confidence` and flips the PR out of draft. UNMET looks like: the reader still lands in state #2. Reese's inspection, offered as context rather than as a grade: state #3 at line 269 reads "every remaining minor is addressed, acknowledged, or bookkeeping-only", and line 276 now qualifies the ready-flip with "provided no angle remains pass-bounded" — the human read should cover both lines together.
- [ ] **AC-3 (human).** Read the paragraph in `.prism/rules/followup-scope.md` that opens "The citation classifies the finding, not the reviewer's judgment" and confirm it states the every-cited-line condition and names one line outside bookkeeping content as sufficient to restore full gating. UNMET looks like: the condition reads "mostly" or "primarily", which is a judgment call again.

---

## Side findings

No born-UNGRADEABLE criteria. Two observations, recorded here rather than as review-issues entries because neither changes a verdict:

- **AC-4's probe is narrower than the invariant its task states.** Implementation task 4 requires the six-name restated list not to survive in `.ai-skills/skills/prism-review-loop/shared.md`, but AC-4 greps only the cleanup-items heading. All six names were probed by hand again this pass: five return `0`, and `## PR Readiness` returns `1` — the single reference mention the task's own replacement text prescribes, not the restated list. The invariant holds, but the criterion would not have caught a regression in one of the other five, which is worth widening the next time this AC is edited.
- **AC-7's `Observed` value in the plan no longer reproduces exactly.** It reads `901 tests, 900 pass, 0 fail, 1 skipped`; this run reports `899 pass, 2 skipped` at the same `901` total. The criterion grades the exit code, which is `0`, so no verdict moves. The cited line is an AC `Evidence` sub-bullet, which this PR's own new rule places in bookkeeping content — recorded here, not gated, and left to the AC's owner rather than edited by the grader.

---

## Re-check log

- **2026-09-08, SHA `95bf7102`** — first Reese-executed grading pass, run after the `origin/main` merge. 8 MET, 0 UNMET, 0 UNGRADEABLE. Verdict: `done`.
- **2026-09-08, SHA `f748499c`** — second grading pass, run after Eric's PR-review passes 1 and 2 and Clove's fixes for both. All eight machine criteria re-executed from scratch; 8 MET, 0 UNMET, 0 UNGRADEABLE, no earlier verdict refuted. Two probe values moved without changing a verdict: AC-1's count `3` → `4` (the pass-1 confidence cap and the pass-2 precedence clause added occurrences inside the same paragraph) and AC-7's tally `900 pass / 1 skipped` → `899 pass / 2 skipped` at the same exit `0`. Verdict: `done`.
- **2026-09-08, no new grading pass** — Eric's PR-review pass 7 flagged that AC-1's verdict-table citation above had been hand-edited to `7` / `4` after pass 6's `labels.md` and confidence-cap fixes, while this report's header SHA and Captured output section stayed frozen at `f748499c` with the original `4` / `3`. Editing one cell to track HEAD while leaving the rest at the graded snapshot is what produced the split, so the citation is reverted to `4` / `3` to match the frozen snapshot rather than re-stamped forward. Re-verified independently at current HEAD (`b16b2086` at the time of this note): `shared.md` now returns `7`, the positive control `4`. No verdict moves either way — the threshold is `>= 3`.
