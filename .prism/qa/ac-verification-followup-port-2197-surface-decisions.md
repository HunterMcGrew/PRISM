# AC Verification — followup-port-2197-surface-decisions

> Verifier: Reese (AC Verification mode) · read-only grading against the branch diff.

- **Commit graded:** `398306b7feda9abfa4df19e6e9e74c3b85659f8c` (`chore: record PR #438 in the port-2197 plan's PR Readiness`; the port itself lands in `8a101ab`)
- **Date:** 2026-07-22
- **Diff basis:** `origin/main...huntermcgrew/prism-port-2197-surface-decisions` (7 files)
- **Pass:** first
- **Machine result:** 5 MET · 0 UNMET · 0 UNGRADEABLE · 1 awaiting-human

## Environment note

The dispatched worktree (`wf_f269891d-39d-2`) was checked out at `origin/main` (`d62197c`), not at the branch under test — the branch (`398306b`) is checked out in a sibling worktree (`wf_f269891d-39d-1`). Grading therefore ran against the branch **ref**, per this mode's "resolve the diff via `origin/main..<branch>`":

- Content criteria (AC-1/2/3/4/6) graded via `git show <branch>:<path>` and `git diff origin/main...<branch>` — the branch's file content, independent of the dispatch worktree's HEAD.
- AC-5's `pnpm prism:check` was run in a temporary detached worktree provisioned at the branch tip (`node_modules` is gitignored, so the install touched no tracked file; the tree stayed clean before and after the check).

## Verdict table (machine-graded criteria)

| ID | Verdict | Evidence type | Citation |
| --- | --- | --- | --- |
| AC-1 | MET | executed | `git show <branch>:.prism/rules/writing-voice.md \| grep -n` → bullet at line 84 (exactly one match); "Point, don't menu" at line 83; 84 = 83 + 1 |
| AC-2 | MET | executed | `grep -c` placement sentence = 1; `grep -n` → match on line 79, which is this section's `**Why:**` line |
| AC-3 | MET | executed | bullet present in all four named mirrors (AGENTS.md, `.claude`, `.codex`, `templates/install`) → `grep -rl \| wc -l` = 4 |
| AC-5 | MET | executed | `pnpm prism:check` exit 0 in a clean deps-provisioned checkout of the branch tip — build-drift, seed-parity, type-check, tests, manifest, crossref, pack all pass |
| AC-6 | MET | inspected | `git diff origin/main...<branch>` = 7 paths; each inspected — all are rule-prose mirrors or the plan file, no script/schema/skill body. See observation below. |

Human-tagged criterion **AC-4** is not machine-graded — see the awaiting-human-verification checklist below.

## Captured command output

### AC-1 — bullet present, immediately after "Point, don't menu"

```
$ git show huntermcgrew/prism-port-2197-surface-decisions:.prism/rules/writing-voice.md | grep -n "Surface the ask, don't bury it"
84:- Surface the ask, don't bury it. When a message needs a decision back before you can proceed, make that ask impossible to miss ...

$ git show ...:.prism/rules/writing-voice.md | grep -n "Point, don't menu"
83:- Point, don't menu. When you have a recommendation, make it ...
```

Exactly one match for the bullet; its line (84) is exactly one greater than "Point, don't menu" (83). MET.

### AC-2 — Why paragraph explains the placement point, on the section's `**Why:**` line

```
$ git show ...:.prism/rules/writing-voice.md | grep -c "pushes the same decision back onto the reader by placement"
1

$ git show ...:.prism/rules/writing-voice.md | grep -n "pushes the same decision back onto the reader by placement"
79:**Why:** every sentence before the answer is cognitive load ... An ask-back buried at the end of a long update pushes the same decision back onto the reader by placement rather than by content — they have to hunt for the one line that needs their action.
```

Count is 1, and the match is on line 79, which begins with the `**Why:**` marker for the "Answer first, one offer at a time" section. MET.

### AC-3 — bullet present in all four named mirrors

```
$ for f in AGENTS.md .claude/rules/writing-voice.md .codex/rules/writing-voice.md templates/install/.prism/rules/writing-voice.md; do
    git show <branch>:$f | grep -c "Surface the ask, don't bury it"; done
AGENTS.md : 1
.claude/rules/writing-voice.md : 1
.codex/rules/writing-voice.md : 1
templates/install/.prism/rules/writing-voice.md : 1
```

All four mirrors carry the bullet → the criterion's `grep -rl ... | wc -l` returns 4. MET.

### AC-5 — prism:check green in a clean checkout of the branch

```
$ pnpm run prism:check     → exit 0
  $ tsx scripts/ai-skills/build.ts --check ...   → "prism:check passed. Generated outputs are in sync."
  $ tsc --noEmit -p scripts/ai-skills/tsconfig.json   → (clean)
  $ tsx scripts/ai-skills/run-tests.ts   → all subtests ok
  $ verify-manifest-coverage / crossref-lint / verify-pack-parity   → all passed
$ git status -s   → clean (dist/ is gitignored; no tracked-file mutation)
```

The `build.ts --check` stage machine-verifies mirror⇄canonical sync (build-drift) and seed parity — exit 0 means no mirror was hand-edited out of sync, which is exactly what AC-5 requires. This independently corroborates the implementer's PR-Readiness self-report (prism:check exit 0, 2026-07-22). MET.

### AC-6 — change confined to rule prose; no script/schema/skill body

```
$ git diff --name-only origin/main...huntermcgrew/prism-port-2197-surface-decisions
.claude/rules/writing-voice.md
.codex/rules/writing-voice.md
.cursor/rules/writing-voice.mdc
.prism/plans/followup-port-2197-surface-decisions.md
.prism/rules/writing-voice.md
AGENTS.md
templates/install/.prism/rules/writing-voice.md

$ git diff --name-only origin/main...<branch> | grep -E '\.(ts|json|mjs|cjs)$|scripts/|\.ai-skills/|/skills/'
(no match — no script/schema/skill-body files touched)

# .cursor/rules/writing-voice.mdc diff = the same bullet + Why-sentence propagation as every other mirror
```

The confinement requirement — change confined to rule prose, no script/schema/skill body modified — holds: every one of the 7 changed paths is a rule-prose mirror or the plan file. MET (inspected).

**Observation (evidence-command miscalibration, not an implementation defect):** AC-6's Evidence sub-bullet asserts the diff "lists only `.prism/rules/writing-voice.md`, its **four** generated mirrors, and this plan file" (six paths). The diff lists seven — the extra is `.cursor/rules/writing-voice.mdc`, a **fifth** generated mirror. That file pre-exists on `origin/main` and `pnpm prism:build` regenerated it with the same rule-prose propagation as the other mirrors (the plan's own `## Decisions` already records this correction; `prism:check`'s build-drift stage confirms it is in sync, not hand-edited). So the confinement the criterion is testing for is satisfied — only the criterion's mirror **count** is stale. Rendering UNMET here would route an appeasement fix (deleting a legitimate, build-required mirror regeneration to satisfy a stale count — see verdict-contract.md rule 7). Recommend Winston sharpen AC-6's Evidence to "its generated mirrors" (or "five") at plan close. Surfaced as an `observation` secondary signal, not a lane-blocking finding.

## Awaiting human verification

This criterion carries an `Evidence (human)` sub-bullet — it turns on reading the shipped prose, which a human confirms at the merge gate. It is not machine-graded and is excluded from the machine MET/UNMET/UNGRADEABLE counts.

- [ ] **AC-4** — The shipped bullet reserves the structured question for decisions that change what happens next and warns against a generic proceed-gate. (Machine note: both clauses are present in the bullet at `.prism/rules/writing-voice.md:84` on the branch — "Reserve it for genuine decisions the user owns that change what you do next" and "not a generic 'can I proceed?' checkpoint, which trades one friction for another." The reading-for-intent confirmation is the human check.)

## Notes

- All grading ran read-only. Content criteria were graded against the branch ref via `git show` / `git diff`; the dispatched worktree stayed `git status`-clean throughout. AC-5's `prism:check` ran in a throwaway detached worktree at the branch tip, provisioned with gitignored dependencies, and left that tree clean before and after.
- No UNMET and no born-UNGRADEABLE criteria, so this pass adds no `## Review Issues` entries. The single observation (AC-6's stale mirror count) is a plan-AC refinement for Winston at close, already anchored by the plan's existing `.cursor` correction Decision.
