---
Number: 0047
Title: Plans Are Preserved at Close, Not Deleted
Status: accepted
Date: 2026-06-05
---

## Context

The original close procedure in `branch-plan.md` ended with deletion: promote lasting decisions, then delete the plan file — git history preserves it. Practice diverged immediately: every shipped epic plan (1.5c, 1.5d, 1.5e) was preserved as a roadmap reference, and `lessons.md` recorded the rule-vs-practice gap on 2026-05-23 with a reconciliation flag that never landed. The gap kept costing: each close re-raised the deletion question, and the wave-4.2 close manufactured a scope conflict (issue #77) that existed only because plan survival was undecided. Hunter settled it on 2026-06-05: plans are never deleted.

"Git history preserves it" undercounts what deletion costs. A deleted plan's Decisions survive only through promotion; everything else — the History timeline, refuted hypotheses, review-issue narratives, AC verification notes — becomes reachable only by knowing which commit to excavate. The consumers who walk plans (Zoe's cadence audits, Iris's retros, next-wave triage, follow-up filing) all read the live tree, not git archaeology.

## Decision

At close, plans are marked closed and preserved in `.prism/plans/`. The close procedure: promote lasting decisions (unchanged — the Decision verdict gate still applies), then mark the plan closed with a `> Closed: YYYY-MM-DD` line under the title and a final `## History` entry. No file deletion, for any plan class — ticket plans and epic plans alike. The closed plan merges into the repo as living memory.

Moving a plan out of `.prism/plans/` is Zoe's lane exclusively — her cadence audit flags aged closed plans (archive-candidate verdicts) and performs the archive move on confirmation. No other persona moves a plan, and no persona deletes one.

Considered: keep deletion for ticket plans and preserve only epics (the 2026-05-23 lesson's implicit split). Rejected: two lifecycles cost more than one — every close would first have to classify the plan, and the plan-walkers would still need the deleted half via git.

## Consequences

- Positive: closed plans stay walkable for audits, retros, and follow-up filing — and the deletion question never re-asks at close.
- Positive: the #77-style conflict class (new work slotting into a "finished" plan) disappears — a closed plan reopens by appending.
- Negative: `.prism/plans/` accumulates. Accepted cost — Zoe's cadence audit owns the archive path (flag as archive-candidate, move on confirmation), the only sanctioned exit from `.prism/plans/`.
- Neutral: `branch-plan.md` § Before Closing and ADR-0001's close-mechanics consequence are updated to match. The verdict gate is unchanged — promotion discipline is what makes preservation safe.

## References

- `.prism/rules/branch-plan.md` § Before Closing — the procedure this ADR governs
- [ADR-0001](./0001-plan-is-source-of-truth.md) — plan is source of truth; its close-mechanics consequence is updated by this ADR
- `.prism/lessons.md` 2026-05-23 — the rule-vs-practice divergence that flagged this
