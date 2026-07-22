# AC Verification — followup-427-428-verdict-wiring

> Verifier: Reese (AC Verification mode) · read-only grading against the branch diff.

- **Commit graded:** `da3a6a214f731e49d29a6c9813f4079227be31e7` (`PRISM-427: Harden dispatch verdict-enum + phase-chain against runtime drift`)
- **Date:** 2026-07-22
- **Environment:** worktree `/Users/hunter/Documents/PRISM/PRISM/.claude/worktrees/wf_cc749247-0b0-2`, branch `huntermcgrew/prism-427-428-verdict-wiring` (checked out detached at the branch tip)
- **Diff basis:** `origin/main..huntermcgrew/prism-427-428-verdict-wiring` (30 files)
- **Pass:** first
- **Machine result:** 9 MET · 0 UNMET · 0 UNGRADEABLE · 4 awaiting-human

## Verdict table (machine-graded criteria)

| ID | Verdict | Evidence type | Citation |
| --- | --- | --- | --- |
| AC-1 | MET | inspected | `claude.md:15` + `step-04-dispatch.md:5,30`; `grep -c needs-stronger-model claude.md` = 0 |
| AC-2 | MET | executed | `pnpm prism:test` exit 0; `verdict-enum-parity.test.ts` tests 1 (a) + 2 (b) pass |
| AC-6 | MET | demonstrated | mutation of `report-back.md:57` → assertion (b) fails naming `needs-fix`; restored |
| AC-7 | MET | executed | `pnpm prism:build` exit 0 + `pnpm prism:check` exit 0; every mirror change paired with canonical source |
| AC-8 | MET | executed | post-build `git status --short` clean; no `.claude/skills/prism-conductor/{lib,step-*}` churn |
| AC-9 | MET | executed + inspected | `verdict-enum-parity.test.ts` test 5 (assertion d) passes; `conductor.md:44` lists all six verdicts incl `needs-fix`; no subset enumeration. See observation below. |
| AC-11 | MET | inspected | arrow-literal count 0 in `step-04-dispatch.md` and `step-01-init.md`; `Canonical lane phase chain` count = 2 in step-04 |
| AC-12 | MET | executed | `phase-chain-parity.test.ts` tests 1 (a) + 2 (b) + 3 (c) pass |
| AC-13 | MET | demonstrated | deletion of the `qa` line at `step-04-dispatch.md:24` → assertions (a)/(b)/(c) fail naming `qa`; restored |

Human-tagged criteria (AC-3, AC-4, AC-5, AC-10) are not machine-graded — see the awaiting-human-verification checklist below.

## Captured command output

### AC-1 — copy-target citation, no prose enum in the authoring path

```
$ grep -n 'Canonical dispatch schema' .ai-skills/skills/prism-conductor/claude.md .prism/skills/prism-conductor/step-04-dispatch.md
.ai-skills/skills/prism-conductor/claude.md:15:...`schema` (copy the literal block at ... § Canonical dispatch schema verbatim — the full six-value `verdict` enum on every dispatch ...)
.prism/skills/prism-conductor/step-04-dispatch.md:5:**Copy the schema; do not author it.** The `schema` field ... is the literal block at `lib/report-back.md` § Canonical dispatch schema, copied verbatim...
.prism/skills/prism-conductor/step-04-dispatch.md:30:**Copy the chain; do not author it.** ... This is the phase-chain twin of the § Canonical dispatch schema rule in `lib/report-back.md`...
(hit in both files)

$ grep -c 'needs-stronger-model' .ai-skills/skills/prism-conductor/claude.md
0
```

### AC-2 — schema verdict enum == Primary verdict table, both contain needs-fix

```
$ pnpm run prism:test   → exit 0 (547 tests, 546 pass, 0 fail, 1 skipped)
$ node --test scripts/ai-skills/verdict-enum-parity.test.ts
ok 1 - report-back.md: Primary verdict table matches the expected six-value enum, in order          [assertion a]
ok 2 - report-back.md: Canonical dispatch schema verdict enum matches the Primary verdict table       [assertion b]
```

### AC-6 — verdict-enum parity test is load-bearing

```
# temporary mutation: report-back.md:57 verdict enum, drop "needs-fix"
$ node --test scripts/ai-skills/verdict-enum-parity.test.ts
not ok 2 - report-back.md: Canonical dispatch schema verdict enum matches the Primary verdict table
    § Canonical dispatch schema is missing verdict(s) present in § Primary verdict: [needs-fix]
# restored via git checkout -- ; re-run green ; git status clean
```

### AC-7 — build + check green, mirrors paired with canonical sources

```
$ pnpm run prism:build   → exit 0
$ pnpm run prism:check    → exit 0  (build.ts --check + check-types + test + verify-manifest + crossref-lint + verify-pack)
# canonical .prism/rules/{branch-plan,skill-routing}.md   → mirrors in .claude/.codex/.cursor/rules present
# canonical .ai-skills/skills/{prism-code-review-pr,prism-code-review-self}/shared.md, prism-conductor/claude.md
#   → compiled mirrors in .claude/{agents,skills}, .codex/agents, .cursor/skills present
# build.ts --check (inside prism:check) machine-verifies mirror⇄canonical sync — exit 0 means no drift
```

### AC-8 — no prism-conductor mirror churn

```
$ pnpm run prism:build   → exit 0
$ git status --short      → (empty; fully clean)
$ git status --short | grep -E '\.claude/skills/prism-conductor/(lib/|step-)'   → no match
```

### AC-9 — consumer doc lists all six verdicts, no subset enumeration

```
$ node --test scripts/ai-skills/verdict-enum-parity.test.ts
ok 5 - docs/ai-skills/conductor.md: no verdict enumeration lists needs-replan but omits needs-fix   [assertion d]

# conductor.md:44 (inspected): "(`done` · `needs-fix` · `blocked` · `needs-replan` · `needs-stronger-model` · `needs-human`)"
#                              + "A review rung returns `needs-fix` when its findings are fixable in-loop"

$ grep -c 'needs-fix' docs/ai-skills/conductor.md
1            # line-count — both mentions share line 44
$ grep -o 'needs-fix' docs/ai-skills/conductor.md | wc -l
2            # occurrence-count — the criterion's substance
```

**Observation (evidence-command miscalibration, not an implementation defect):** AC-9's Evidence sub-bullet asserts `grep -c 'needs-fix' docs/ai-skills/conductor.md` returns `≥ 2`. `grep -c` counts matching *lines*; both `needs-fix` mentions landed on the same physical paragraph line (line 44), so the line-count reads `1` while the occurrence-count (`grep -o | wc -l`) is `2`. The criterion's substantive requirement — all six verdicts listed including `needs-fix`, and no other enumeration listing a strict subset — is fully satisfied and machine-confirmed by the parity test (assertion d). Grading UNMET would route an appeasement fix (splitting a paragraph to satisfy a line-counter, no requirement behind it — see verdict-contract.md rule 7). Recommend Winston sharpen the evidence command to occurrence semantics (`grep -o 'needs-fix' ... | wc -l` ≥ 2) or drop the redundant grep in favor of assertion (d). Surfaced as an `observation` secondary signal, not a lane-blocking finding.

### AC-11 — phase chain is a single named block, no prose re-enumeration

```
$ grep -c 'implement → ac-verify → self-review → pr-review → qa → docs' .prism/skills/prism-conductor/step-04-dispatch.md .prism/skills/prism-conductor/step-01-init.md
.prism/skills/prism-conductor/step-04-dispatch.md:0
.prism/skills/prism-conductor/step-01-init.md:0

$ grep -c 'Canonical lane phase chain' .prism/skills/prism-conductor/step-04-dispatch.md
2
```

### AC-12 — phase chain == contiguous subsequence of currentPhase; ac-verify + qa both Reese

```
$ node --test scripts/ai-skills/phase-chain-parity.test.ts
ok 1 - Canonical lane phase chain block lists the six build phases in order                                   [assertion a]
ok 2 - phase chain is a contiguous, same-order subsequence of goal-state's currentPhase enum                  [assertion b]
ok 3 - every phase names a dispatching persona, and ac-verify + qa both map to Reese                          [assertion c]
```

### AC-13 — phase-chain parity test is load-bearing

```
# temporary mutation: delete the `qa` line at step-04-dispatch.md:24
$ node --test scripts/ai-skills/phase-chain-parity.test.ts
not ok 1 - Canonical lane phase chain block lists the six build phases in order
    ... Found: [implement, ac-verify, self-review, pr-review, docs]   (-  'qa')
not ok 2 - phase chain is a contiguous, same-order subsequence of goal-state's currentPhase enum
    Expected [implement, ac-verify, self-review, pr-review, docs], found [implement, ac-verify, self-review, pr-review, qa]
not ok 3 - every phase names a dispatching persona, and ac-verify + qa both map to Reese
    error: 'Both ac-verify and qa must be present in the phase chain block'
# restored via git checkout -- ; re-run green ; git status clean
```

## Awaiting human verification

These criteria carry `Evidence (human)` sub-bullets — they turn on reading prose for placement and non-contradiction, which a human verifies at the merge gate. They are not machine-graded and are excluded from the machine MET/UNMET/UNGRADEABLE counts.

- [ ] **AC-3** — Both `.ai-skills/skills/prism-code-review-pr/shared.md` and `.../prism-code-review-self/shared.md` § `## When dispatched by Sol` name `needs-fix` as the review-rung verdict and distinguish it from `needs-replan` and `blocked` in place. (Machine note: `grep -c 'needs-fix'` returns 2 for the pr file and 2 for the self file — the wiring is present; the four-verdict distinction reading is the human check.)
- [ ] **AC-4** — `.ai-skills/skills/prism-code-review-self/shared.md` § `## After completing the review` item 7 directs Briar to stage the plan file alone, verify the staged set mechanically, commit, and push — including the worktree full-ref push form.
- [ ] **AC-5** — `.prism/rules/skill-routing.md` § Authors ship, reviewers review and `.prism/rules/branch-plan.md` § Landing a plan-only commit read back to back without contradiction.
- [ ] **AC-10** — `.prism/skills/prism-conductor/step-05-route.md` § Deterministic ratification and `lib/report-back.md:30` specify the review-lane landing check (blob-SHA-unchanged → re-dispatch, strike-budget-bounded, park at `needs-human`), cross-referenced between the two files, with Eric excluded.

## Notes

- All grading ran read-only against the branch tip; the worktree was `git status`-clean before grading, after every criterion, and at the end. The two load-bearing demonstrations (AC-6, AC-13) mutated tracked files as their own defined evidence procedure, then restored via `git checkout --`; a final clean-tree check confirmed no residue.
- No UNMET or born-UNGRADEABLE criteria, so `## Review Issues` carries no new entries from this pass.
