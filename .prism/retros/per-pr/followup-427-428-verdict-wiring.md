# Retro — followup-427-428-verdict-wiring (per-PR fidelity note)

**Target:** `.prism/plans/followup-427-428-verdict-wiring.md` (GitHub #427 + #428, merged into one lane)
**Grain:** per-PR (ticket) — compact fidelity note, no multi-voice dialogue
**PR:** [#435](https://github.com/HunterMcGrew/PRISM/pull/435) — draft, `MERGEABLE`, awaiting the human merge gate
**Commit graded:** `b366696` (true PR head — two commits past the dispatched branch ref; see Evidence basis)
**Generated:** 2026-07-22

## Summary

Shipped close to plan. All 15 implementation tasks landed; the AC-verify pass returned 9 machine criteria MET / 0 UNMET / 0 UNGRADEABLE with 4 human-tagged criteria routed to the merge gate and confirmed in place by Briar's second self-review pass. CI (`prism-check`) is green on both ubuntu and windows. **No Decision was refuted by the execution record** — Eric's Round-2 pass explicitly confirmed no Decision contradicted — so there are **no promotion cautions**. The two in-loop findings the gauntlet surfaced (a re-hardcoded phase literal, a duplicated test helper) were caught and fixed exactly as the plan's copy-target-plus-review design intended, which reads as the mechanism working rather than a divergence.

## Charter coverage

| # | Charter item | Answerable | Sources reached | Gap |
| --- | --- | --- | --- | --- |
| 1 | Did we do what we said? | Yes | ac-verification, decisions, merged-diff | none — all 15 tasks landed; 9 machine AC MET, 0 UNMET; 4 human-tagged AC confirmed in place (Briar pass 2) pending the merge gate |
| 2 | Issues / bottlenecks? | Yes | pr-thread, review, ac-verification | none — two Minor findings + one evidence-command observation, all in-loop |
| 3 | Actionable improvements? | Yes | ac-verification, review, pr-thread | none — see Action items |
| 4 | Code standards followed? | Yes | pr-thread, review | none — Eric clean pass; JSDoc/comment conventions held; `demand-elegance` three-uses rule actually applied for the helper extraction |
| 5 | Anything wrong / do better? | Yes | pr-thread, review, decisions | none — the anti-drift guard's own implementation briefly reintroduced the drift it forbids (see Fidelity note) |
| 6 | Tests passing? | Yes | ci, ac-verification, review | pre-merge CI approximation: item verified against PR #435 check-runs (green both platforms) + four independent local `pnpm prism:check` exit-0 runs — not yet post-merge main-CI |

Coverage is full: all six items answerable from the evidence reached, item 6 carrying only the standard pre-merge-CI approximation named in `branch-plan.md` § Before Closing.

## Fidelity note — plan intent vs. execution record

The one finding worth naming past the summary is the most on-theme thing in the ticket: the anti-drift guard's own implementation briefly reintroduced the drift it exists to forbid. The phase-chain parity test (`phase-chain-parity.test.ts`) held a second hardcoded copy of the phase sequence in `ARROW_LITERAL` alongside the canonical `EXPECTED_PHASES` — a dual source of truth inside the suite whose entire job is preventing dual sources of truth. Eric caught it as a Round-1 Minor; Clove fixed it by deriving `ARROW_LITERAL = EXPECTED_PHASES.join(" → ")` (`5fcbf01`), collapsing the two representations to one. This does **not** refute the phase-chain Decision — it vindicates it: the copy-target-plus-gauntlet design caught a real drift-risk at exactly the layer it was meant to. Recorded as a charter item-5 finding, not a promotion caution.

Adjacent, sub-finding severity (logged, not staged as a divergence per the retro charter's classification rule): the plan's task-14 expected-mirror list enumerated `.claude/`, `.cursor/`, and the install seed, but the build legitimately also regenerated `.codex/` and `AGENTS.md`. The outcome is consistent with the canonical/mirror-split Decision (build-generated, no hand-edit; AC-7 and AC-8 both MET) — the plan's enumeration was just incomplete, not wrong.

Positive fidelity signal: the ticket dog-fooded its own #428 deliverable. The `chore: Briar plan record …` and `chore: Reese AC-verification record …` commits on this branch are the § Landing a plan-only commit procedure that tasks 6–8 authored — the mechanism was exercised to land this ticket's own review records.

## Divergence verdicts

- **No Decision-refuting divergence.** Every `## Decisions` entry carries a verdict and the execution record confirms them; Eric's clean Round-2 pass checked "no Decision contradicted" directly, and AC-verify returned 0 UNMET / 0 UNGRADEABLE. Absence of divergence here is backed by full charter coverage, not by thin evidence.

## Action items

- [ ] Sharpen AC-9's evidence command from `grep -c 'needs-fix' docs/ai-skills/conductor.md` (counts matching *lines* — reads 1) to occurrence semantics (`grep -o 'needs-fix' … | wc -l` — reads 2), or drop the grep in favor of the parity-test assertion (d) that already proves the substance — proposed owner: **Winston**. Traceable to Reese's AC-9 observation and the identical `grep -c`-vs-occurrence slip Briar caught in the AC-3 machine note.

## Lesson candidates

- `grep -c` counts matching *lines*, not occurrences — when an evidence or AC command needs to count how many *times* a token appears (not on how many lines), use `grep -o 'token' file | wc -l`. This trap surfaced twice in one ticket: the AC-3 machine-note miscount and the AC-9 evidence-command miscalibration. Fits `.prism/lessons.md`.
- When building an anti-drift guard (a test that forbids a dual source of truth), sweep the test's own constants for the same dual-source-of-truth it forbids — derive the second representation from the first, don't re-hardcode it. Surfaced by the `ARROW_LITERAL` Round-1 Minor. Fits `.prism/lessons.md`.

## Promotion cautions

None. No Decision in this plan was refuted by the execution record; every Decision's verdict stands as written, so the close phase promotes them unchanged.

## Evidence basis

- **Reconciled against the true PR head `b366696`**, not the dispatched branch ref. The local branch ref lagged the PR by two commits — the dispatch context predated an entire Eric PR-review round (`5fcbf01`) and the Reese bug-fix QA plan (`b366696`). Iris fetched and graded the true head so the retro reflects what actually shipped, not the stale local tip. Surfaced to Sol as an `observation` (run branch-tip bookkeeping lagged the PR).
- **Merged diff:** 34 files, +854/-49 (`main..b366696`) — canonical edits, build-generated mirrors, 2 new parity tests, 1 shared helper, 2 QA artifacts, the updated plan.
- **PR review threads:** Eric Round-1 (1 Minor: `ARROW_LITERAL`) → fix → Round-2 (zero findings, not an approval). Briar Pass-1 (2 Minor: AC-3 grep-count, `extractSection` dedup) → fix → Pass-2 (0 new findings).
- **CI:** `prism-check` pass on ubuntu-latest (38s) and windows-latest (1m17s).
- **AC verification:** `.prism/qa/ac-verification-followup-427-428-verdict-wiring.md` — 9 MET / 0 UNMET / 0 UNGRADEABLE / 4 awaiting-human; both parity tests confirmed load-bearing by mutation.
- **QA plan:** `.prism/qa/bugfix-verification-followup-427-428-verdict-wiring.md` — 24 Pass/Fail items, all executed against branch tip, all pass.
