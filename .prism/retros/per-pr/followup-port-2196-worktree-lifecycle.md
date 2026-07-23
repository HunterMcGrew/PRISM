# Retro — followup-port-2196-worktree-lifecycle (per-PR fidelity note)

**Target:** `.prism/plans/followup-port-2196-worktree-lifecycle.md` · PR [#439](https://github.com/HunterMcGrew/PRISM/pull/439) · branch `huntermcgrew/prism-port-2196-worktree-lifecycle`
**Grain:** per-pr
**Generated:** 2026-07-22

## Charter coverage

| # | Charter item | Answered | Sources used | Gap |
| - | --- | --- | --- | --- |
| 1 | Did we do what we said? | yes | plan Tasks/Decisions/AC · branch diff (39 files, +1406/−46) · History · executed QA checklist (`.prism/qa/pr-439-qa-checklist.md`) | none |
| 2 | Issues? Bottlenecks? | yes | `## Review Issues` (6 entries) · PR #439 inline threads · Sessions | none |
| 3 | Actionable items? | yes | synthesized below | none |
| 4 | Code standards followed? | yes | Briar passes 1–2 (`## Review Issues`) · Eric round 1 (4 minors) + round 2 (clean) | none |
| 5 | Anything wrong / do better? | yes | `## Review Issues` (AC-8/AC-9 evidence defects) · Eric threads | none |
| 6 | Tests passing / CI record? | partial | 570 tests pass at branch tip · `pnpm prism:check` exit 0 (all six gates, run live in Briar pass 2 and the QA pass) · CI: `prism-check (ubuntu-latest)` SUCCESS | `prism-check (windows-latest)` still IN_PROGRESS at retro time — AC-12's both-runners evidence is not yet complete; the Windows job is the one the TypeScript-port Decision exists to satisfy |

## Fidelity verdict

**Shipped close to plan — 12/12 tasks implemented, every Decision held, all six recorded review findings fixed and reviewer-verified.** Coverage is 5.5 of 6: everything answerable was answered; the only open evidence is the in-flight windows-latest CI run (charter item 6).

The one pattern worth carrying forward: **two of the plan's twelve machine-evidence AC clauses were unexecutable as authored**, both caught by self-review rather than at authoring time.

- **AC-9** asserted `grep -c "worktree-git" AGENTS.md` returns `0` — impossible by the plan's *own* task 2, which deliberately adds the one-line cross-reference that makes `1` the correct answer. The Decision priced this in ("spends one line of always-on budget instead of thirty-five"); the AC clause contradicted the Decision it was verifying. Caught by Briar pass 1, major, fixed in-place.
- **AC-8**'s pattern `"rev-list --count"` can never match the TypeScript it verifies — `execFile` passes `"rev-list"` and `"--count"` as separate argv elements, so the joined substring exists only in prose. Caught by Briar pass 2, major, fixed to the single-token pattern with a live-run confirmation.

Both are intent-side defects (the verification spec, not the implementation), and both were closed inside the loop — but each survived one full pass before detection, and AC-8's original clause would have *passed-by-vacuous-miss* if run uncritically.

## Divergence verdicts

- **No Decision refuted by the execution record.** Tier-3 placement (AC-9 confirmed body absent from all mirrors), TypeScript classifier, injected `gh` dependency, lane idiom over numbered modes, Procedure E, explicit-only lane — all held as reasoned.
- **OPEN Decision (consumer distribution): default path incompletely applied, then corrected.** Zoe's lane carried the availability guard; the rule's self-cleanup line didn't, and the rule *does* ship to consumers. Eric minor, fixed in `63e50ee`. A default path is only as good as its least-guarded citation site.
- **Plan premise drift (logged, not staged):** the Goal's "35 remaining worktrees" was 80 at dry-run time (11 GREEN / 35 RED / 34 YELLOW, 0 unreadable; both hand spot-checks agreed with the classifier). Adjacent to, not contradicting, any Decision; Eric caught the count where it was durable (rule prose) and the plan copy stands as a historical snapshot.
- **Documented task deviations (both fine):** task 8's "Specializes-in list" structure didn't exist in Zoe's `shared.md` — the opening paragraph was extended instead, same intent, recorded in Sessions; one beyond-plan fix (markdown link → code-span so the seed-mirrored architect doc passes the install-relative-link-gate), also recorded.

## Promotion cautions

None. The refuted zero-count claim lived in an AC evidence clause, not in the Decision — the Tier-3 Decision's own text already states the one-line cross-reference cost and promotes cleanly as written.

## Action items

- [ ] **Execute machine-evidence AC commands at authoring time.** When an AC's evidence is a command with an asserted result, run it (against the tree, or reason it against the plan's own tasks) before the plan ships — this plan's AC-8 and AC-9 both shipped unrunnable, and AC-9 contradicted the plan's own task 2. A grep pattern meant to match code must account for argv-array style: a shell command written as prose never appears as a joined string in `execFile` calls. — proposed owner: **Winston** (AC authoring practice)
- [ ] **Fix the dangling manifest route for `.prism/rules/worktree-isolation.md`.** Pre-existing, out of this PR's scope, surfaced by Briar pass 2: `.prism/architect/manifest.json` and `manifest.base.json` route a rule file that exists nowhere in the tree. — proposed owner: **Clove** (one-line removal in both manifests + mirrors via `pnpm prism:build`)
- [ ] **Confirm `prism-check (windows-latest)` completes green before merge.** The Windows runner is the decisive fact behind the TypeScript-port Decision; AC-12 is not evidenced until it reports. — proposed owner: **Sol** (gate check, no code)

## Lesson candidates

- AC evidence commands are code — dry-run them at authoring time. Two of twelve machine-evidence clauses in this plan could never return their asserted result; both cost a full review pass to catch. (Fits `.prism/lessons.md`; proposed, not appended.)
- Live counts leak from plan premises into durable prose. The stale "35 worktrees" traveled from the plan's Goal into `worktree-git.md` before Eric caught it — writing-voice § Count rules already covers the durable side; the leak vector is the copy step from plan to rule.

## Citations

### Plan evidence (branch tip `9b71294`)

- `## Sessions` — 5 entries: plan authoring (main), implementation, Briar pass 1, Briar pass 2, Eric-fix pass, QA pass; every close clause `scope held`, deviations named inline.
- `## Review Issues` — 6 entries, all `fixed`: AC-9 zero-count (major, Briar p1), AC-8 unmatched grep (major, Briar p2), detached-HEAD comment invariant (minor, Eric), drifting count (minor, Eric), `currentHeadOid` naming (minor, Eric), missing availability guard (minor, Eric).
- `## History` — implementation (all 12 tasks, `prism:check` exit 0), task-11 live dry-run (80 worktrees: 11/35/34/0, two spot-checks agreed), Eric-minors fix, QA checklist added.
- `## Debugged Issues` — empty; no non-trivial CI/build failure was recorded, and none is visible in the execution record.
- `## PR Readiness` — 6/8 checked; PR-description and decision-promotion items correctly deferred to plan close.

### Execution record

- Branch diff `origin/main...origin/huntermcgrew/prism-port-2196-worktree-lifecycle`: 39 files, +1406/−46; classifier (241 lines) + 10-case test suite (406 lines) + rule + Zoe lane + mirrors, matching the task list.
- PR #439 review threads: Eric round 1 — 4 minors, zero majors on the code itself; round 2 — all four verified fixed in `63e50ee`, "this PR is clean."
- CI at retro time (2026-07-22): `prism-check (ubuntu-latest)` SUCCESS; `prism-check (windows-latest)` IN_PROGRESS.
- QA: `.prism/qa/pr-439-qa-checklist.md` — every command executed against the branch tip before publishing; all passed.
- No standalone AC-verification report file or comment was found on the PR; AC evidence is carried by the test suite, the executed QA checklist, and the corrected AC clauses' live runs recorded in Sessions.
