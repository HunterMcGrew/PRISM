# AC Verification — reviewer-scope-bookkeeping

> **Plan:** `.prism/plans/reviewer-scope-bookkeeping.md`
> **Graded at SHA:** `95bf7102db0167b42dd1e56866f540633d4f5052`
> **Date:** 2026-09-08
> **Environment:** detached HEAD at `origin/huntermcgrew/reviewer-scope-bookkeeping-rule`, worktree `.claude/worktrees/wf_cb2c787f-341-4`
> **Diff base:** `origin/main` at `972c77578dbbbe889150459169ac50bf5b8f6471` — the merge-base equals that tip, because the branch merged `main` at `da2b08ae`, so the three-dot and two-dot diffs agree
> **Verifier:** Reese, AC Verification mode

This is a re-grade after the branch merged `origin/main` (PR #489's review-loop restructure and PR #488's git gates). Every machine criterion was re-run from scratch at the SHA above rather than trusting the marks the plan already carried.

---

## Verdict table

| ID   | Verdict | Evidence type | Citation                                                                                                                                                                                    |
| ---- | ------- | ------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC-1 | MET     | executed      | `grep -o 'bookkeeping-only'` over `.ai-skills/skills/prism-code-review-pr/shared.md` → `3` (threshold `>= 3`); positive control over `.prism/rules/followup-scope.md` → `3`                 |
| AC-2 | MET     | executed      | `grep -o 'sub-bullets under'` over `.prism/rules/followup-scope.md` → `1`; `grep -o 'lines those Evidence sub-bullets hang from'` → `1` (both thresholds `>= 1`)                            |
| AC-3 | MET     | executed      | `grep -o 'classifies the finding, not the reviewer'` over `.prism/rules/followup-scope.md` → `1` (threshold `>= 1`)                                                                         |
| AC-4 | MET     | executed      | `grep -o '## Cleanup Items'` over `.ai-skills/skills/prism-review-loop/shared.md` → `0` (threshold `0`); positive control over `.prism/rules/followup-scope.md` → `1`                       |
| AC-5 | MET     | executed      | `head -3 .prism/rules/followup-scope.md` shows `load: always`; the `.prism/rules/`-scoped diff against the base returns exactly one path, and that path is `.prism/rules/followup-scope.md` |
| AC-6 | MET     | executed      | `grep -o 'Spec content never rides an unrelated ticket'` over `.prism/rules/followup-scope.md` → `3` (threshold `>= 3`, stated baseline `2`)                                                |
| AC-7 | MET     | executed      | `pnpm prism:check` → exit `0`; 899 tests pass, 0 fail                                                                                                                                       |
| AC-8 | MET     | executed      | the conductor-scoped diff against the base returns `0` paths; positive control over `.ai-skills/skills/` returns `3`                                                                        |

**Machine totals:** 8 MET, 0 UNMET, 0 UNGRADEABLE.

**Tree-clean discipline:** `git status -s` returned empty before grading, again after the dependency install, and again after the final criterion. No tracked file moved during the run.

---

## Captured output

### AC-1

```
$ grep -o 'bookkeeping-only' .ai-skills/skills/prism-code-review-pr/shared.md | wc -l
3
$ grep -o 'bookkeeping-only' .prism/rules/followup-scope.md | wc -l     # positive control
3
```

The three occurrences land where the criterion's evidence predicted: line 268 (decision-gate state #2), line 269 (state #3), and line 302 (the review-rung verdict paragraph). Task 3's twin edit in `.ai-skills/skills/prism-code-review-self/shared.md` is present at line 291.

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
pass 899
fail 0
```

Two notes on how this leg ran, so the exit code is not read as stronger than it is.

- `node_modules` was absent in the grading worktree and the first invocation failed with `'tsx' is not recognized`. That is a harness condition, not a criterion failure. `pnpm install --frozen-lockfile` restored the toolchain, `git status -s` confirmed no tracked file moved, and the exit-0 above is from the run after the install.
- Under a detached HEAD, `spec-scope-lint` cannot resolve a branch name and reports `no live plan resolved for this branch - skipping`, which passes vacuously. Because implementation task 5 names that leg explicitly, it was re-run with the branch identity supplied through the head-ref environment variable the lint reads before falling back to the current-branch lookup. That run printed `spec-scope-lint passed. No unrelated spec content found.` and exited `0`, so the leg passes on its merits rather than by skipping.

### AC-8

```
$ (diff --name-only against the base, scoped to .ai-skills/skills/prism-conductor/ and .prism/skills/prism-conductor/) | wc -l
0
$ (diff --name-only against the base, scoped to .ai-skills/skills/) | wc -l    # positive control
3
```

Twenty paths change on this branch: three canonical skill bodies (Eric, Briar, the review loop), the rule file, this plan, `AGENTS.md`, and the rest generated mirrors plus the install seed. No conductor path appears in the list.

---

## Post-merge re-verification

The branch merged `origin/main` after the plan's first grading pass, so the two criteria whose evidence targets a file `main` also touched were examined beyond their probe.

- **`.ai-skills/skills/prism-review-loop/shared.md` (AC-4).** The hand-resolved Ledger bullet keeps this branch's citation to `.prism/rules/followup-scope.md` and appends `main`'s loop-local additions — the PR body and the loop-emitted readiness line — which is what the re-land Decision describes. Five of the six bookkeeping section names were probed beyond the one AC-4 names: the review-issues, history, sessions, debugged-issues, and cleanup-items headings each return `0`. The sixth, `## PR Readiness`, returns `1` — the bullet's own replacement text names it once by design, to explain why it's persona-rewritten bookkeeping rather than Subject content (see the plan's task 4), which is a reference mention, not the six-name restated list AC-4's probe targets.
- **`.ai-skills/skills/prism-code-review-pr/shared.md` (AC-1).** `main`'s changes did not disturb the decision gate; states #2 and #3 carry the qualifier at lines 268-269.

---

## Awaiting human verification

These criteria carry `Evidence (human)` sub-bullets. They are not machine-graded, are excluded from the totals above, and surface at the human merge gate.

- [ ] **AC-1 (human).** Read the decision-gate section of `.ai-skills/skills/prism-code-review-pr/shared.md` and confirm a pass holding only bookkeeping-only minors routes to state #3, which applies `effort + confidence` and flips the PR out of draft. UNMET looks like: the reader still lands in state #2. Reese's inspection, offered as context rather than as a grade: state #3 at line 269 reads "every remaining minor is addressed, acknowledged, or bookkeeping-only".
- [ ] **AC-3 (human).** Read the paragraph in `.prism/rules/followup-scope.md` that opens "The citation classifies the finding, not the reviewer's judgment" and confirm it states the every-cited-line condition and names one line outside bookkeeping content as sufficient to restore full gating. UNMET looks like: the condition reads "mostly" or "primarily", which is a judgment call again.

---

## Side findings

No born-UNGRADEABLE criteria. One observation, recorded here rather than as a review-issues entry because it changes no verdict:

- **AC-4's probe is narrower than the invariant its task states.** Implementation task 4 says all six bookkeeping section names must not survive anywhere in `.ai-skills/skills/prism-review-loop/shared.md`, but AC-4 greps only the cleanup-items heading. The other five were checked by hand during this pass and all return `0`, so the invariant holds today. The criterion simply would not have caught a regression in one of the other five, which is worth widening the next time this AC is edited.

---

## Re-check log

- **2026-09-08, SHA `95bf7102`** — first Reese-executed grading pass, run after the `origin/main` merge. 8 MET, 0 UNMET, 0 UNGRADEABLE. Verdict: `done`.
