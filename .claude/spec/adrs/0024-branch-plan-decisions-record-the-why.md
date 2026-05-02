---
Number: 0024
Title: Branch-Plan Decisions Record the Why, Not Just the What
Status: accepted
Date: 2026-04-28
---

## Context

The same THR-1775 audit that surfaced the architect-doc accuracy gaps also surfaced a depth gap in the branch plan. Winston's `## Decisions` entries tend to record the conclusion of a verified fix without the reasoning that produced it — root cause, alternatives considered, chosen approach, implementation guidance.

The downstream cost compounds:

- **Clove** picks between plausible interpretations because the plan doesn't say which one Winston ruled out.
- **Briar** self-reviews against the same gap — the conclusion looks reasonable, the reasoning is invisible.
- **Eric** PR-reviews against the same gap, often catching the same questions Winston already answered but didn't write down.

The brevity rule in [`branch-plan.md`](../../rules/branch-plan.md) § 5 (`Keep the Plan Clean and Concise`) is correct as a default — short, factual bullets keep the plan scannable. But verified fixes and non-trivial decisions are the entries downstream personas most need to act on, and they're the ones least served by a single conclusion line.

A blanket depth bar across every Decisions entry was considered. Rejected — would inflate the section, blur the brevity default, and cost more than it gains for routine implementation tactics that are obvious from the diff.

## Decision

When Winston records a verified fix or non-trivial decision in `## Decisions`, the entry uses sub-bullets covering:

- **Root cause** — what the underlying problem turned out to be.
- **Alternatives considered** — what other approaches were on the table.
- **Chosen approach** — the path taken and the one-line reason it beat the alternatives.
- **Implementation guidance** — what Clove (or whichever persona executes) needs to know to act on it.

Sub-bullets, not paragraph drift. Five tight bullets beat one long paragraph.

Routine implementation tactics keep the existing one-line shape — the rule applies to depth, not length, and only to entries where the reasoning is the thing downstream personas need.

The depth bar is codified in [`branch-plan.md`](../../rules/branch-plan.md) under a new section (`Depth on Verified Fixes and Non-Trivial Decisions`) and in Winston's Plan Mode `## Decisions` guidance.

## Consequences

- Positive: downstream personas no longer guess. Clove acts on documented reasoning, Briar self-reviews against it, Eric PR-reviews against it.
- Positive: the plan becomes the working memory it's already supposed to be — verified fixes carry their context forward.
- Negative: verified-fix entries take longer to write. Winston spends an extra minute or two per decision; downstream personas save much more than that.
- Neutral: the brevity default still governs routine entries. The rule is a refinement of when to go deep, not a replacement for the existing concision rule.

## References

- [`.claude/rules/branch-plan.md`](../../rules/branch-plan.md) § Depth on Verified Fixes and Non-Trivial Decisions — the rule this ADR backs.
- [ADR-0023](0023-architect-docs-source-verified-review.md) — sibling decision from the same THR-1775 audit, governs review-class on architect docs.
- THR-1775 — originating incident.
