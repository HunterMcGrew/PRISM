---
Number: 0012
Title: Epic vs Story Threshold
Status: accepted
Date: 2026-04-19
---

## Context

Some tickets are big enough that a single plan, single branch, and single PR would be unwieldy — they touch multiple systems, involve multiple personas across independent sub-tasks, and span weeks. Others are small enough that an epic wrapper would be overhead.

Without a threshold, ticket shapes drift. Large stories accumulate tasks until they're de facto epics without the structure. Small epics accumulate ceremony for work a single story would have handled cleanly.

## Decision

**Default to story.** Most tickets are stories.

**Promote to epic** when both of these hold:

1. More than 5 implementation tasks
2. Tasks cross system boundaries (frontend + backend + infrastructure, or multiple unrelated components)

Either condition alone is not sufficient — 6 tasks all in one frontend component are still a story; 3 tasks spanning frontend/backend/infra are still a story.

Winston detects epic candidates after building implementation tasks in plan mode and flags them for the user to confirm the promotion.

Epic plans use the filename `epic-<name>.md` and contain a `## Stories` section referencing the individual story plans.

## Consequences

- Positive: ticket shape matches scope. Epics carry the structure that large work needs; stories stay light.
- Positive: the threshold is explicit and mechanical, so Winston and the user have a shared basis for the promotion decision.
- Negative: borderline cases still need judgment. A ticket with exactly 5 tasks across 2 systems might go either way.
- Neutral: epic promotion happens at plan-mode end. If the work turns out to be bigger than planned, the promotion can still happen later — just more expensive to split retroactively.

## References

- `.claude/architect/skills-ecosystem.md` § Epic vs Story
- `.claude/rules/branch-plan.md` — epic filename convention
