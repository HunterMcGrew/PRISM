# Plan: conductor-review-loop-default

> No Linear ticket — descriptive-slug plan per branch-plan.md fallback. Originates from a session steer (2026-06-13).

## Goal

Make the prism-review-loop gauntlet the conductor's default review phase, so a Sol run loops self-review→fix and pr-review→fix to a zero-findings pass instead of a single, skippable self-review.

---

## Implementation Tasks

### Clove (implementation)

1. `lib/report-back.md` — add the `needs-fix` primary verdict (review rung found issues → route to implementer, stay in-phase, re-review) with a routing-table row; update the non-clean-review note so a fixable review returns `needs-fix`, reserving `needs-human` for findings that need a human decision.
2. `step-04-dispatch.md` — add a "review phase is the gauntlet" section: self-review loops to clean, then pr-review loops to clean; Eric is a default rung (any open PR gets a PR review), not a proportionality skip; loop guardrails reuse the pass-budget/three-strike (step-07) and disagreement→Winston fast-path (step-06); cite prism-review-loop's ladder so the two don't drift.
3. `step-05-route.md` — add the `needs-fix` route (dispatch the implementer for the `## Review Issues`, then re-dispatch the same reviewer; stay in-phase).
4. `lib/goal-state.md` — add `needs-fix` to the `lastVerdict` enum.
5. `step-01-init.md` — note in the phase mapping that the self-review / pr-review phases each run the gauntlet loop.

---

## Decisions

- **The conductor's review phase runs the prism-review-loop ladder by default; pr-review (Eric) is non-skippable on any lane with an open PR.**
  - **Root cause:** the conductor's review phase had no findings→fix→re-review loop — a review returned `done` (clean) or `needs-human` (escalate), and pr-review was an advanceable phase a proportionality call could skip. A live run skipped Eric and ran a single Briar pass on two open PRs, leaving zero review signal on the PRs.
  - **Alternatives considered:** (a) keep review single-pass, rely on the operator to invoke prism-review-loop by hand; (b) have Sol invoke the prism-review-loop *skill* at the review phase; (c) codify the ladder in Sol's native persona-dispatch routing via a new verdict.
  - **Chosen approach:** (c). Sol dispatches persona agents, not skills, so a Workflow agent can't `Skill`-invoke the loop (a). Relying on a manual invocation (a) is the exact gap that caused the miss. The `needs-fix` verdict expresses the loop in Sol's existing deterministic routing, and the guardrails (pass budget, three-strike, disagreement fast-path) already exist in step-06/step-07 — so the ladder reuses them rather than duplicating.
  - **Implementation guidance:** keep the `self-review` / `pr-review` phase names (the two rungs) to avoid churning the `currentPhase` enum; the loop is expressed by `needs-fix` keeping the lane in-phase. Cite prism-review-loop `shared.md` for the ladder definition; don't restate the pass budget / strike numbers.
  - → no promotion needed (the decision lives in the conductor skill's own step files, which are the durable surface; ADR candidacy noted to the user as an optional follow-up).

---

## History

- 2026-06-13 [hmcgrew/conductor-review-loop-default]: Wired prism-review-loop gauntlet into the conductor as the default review phase; added `needs-fix` verdict; Eric made non-skippable. Originated from a session steer after a Sol run skipped Eric.
- 2026-06-13 [hmcgrew/conductor-review-loop-default]: Briar self-review minor — clarified in step-04 that Sol's autonomous segment skips the prism-review-loop phase-boundary gate.

---

## Review Issues

### Phase-boundary gate undefined under autonomous dispatch

- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `.prism/skills/prism-conductor/step-04-dispatch.md:13`
- **Problem:** The gauntlet section doesn't address the prism-review-loop phase-boundary gate (`/prism-handoff` prompt at the `self-review → pr-review` boundary) — when Sol's Workflow segment runs this transition autonomously, the gate doesn't surface, leaving the behavior undefined for a reader consulting this spec.
- **Suggested fix:** Add one sentence noting that Sol's autonomous segment skips the prism-review-loop phase-boundary gate; interactive gates only surface via `needs-human` / `pendingHumanReport`.
- **Resolution:** Added a paragraph to step-04 § The review phase is the gauntlet stating the phase-boundary gate does not fire under Sol's autonomous segment; interactive gates reach the human only via `needs-human` / `pendingHumanReport`.

---

## Acceptance Criteria

No user stories or Linear ticket — AC omitted per acceptance-criteria.md (no Mira AC, no Debug entries, no REQ sources to cite).

---

## PR Readiness

- [x] No critical or major issues
- [ ] `pnpm prism:check` green — last run: pending (pre-existing atlas-dogfood Windows path failure, issue #107; not this branch)
- [ ] PR description up to date

**Last updated:** 2026-06-13
