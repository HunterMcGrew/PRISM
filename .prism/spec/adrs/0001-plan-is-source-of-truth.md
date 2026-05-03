---
Number: 0001
Title: Plan Is Source of Truth
Status: accepted
Date: 2026-04-19
---

## Context

Tickets cross multiple skills, sessions, and sometimes weeks. Without a persistent record of decisions and reasoning, each session starts fresh — re-litigating choices that were already made, re-discovering constraints that were already known, or silently undoing logic that solved a real problem.

Conversation history does not survive compaction. Chat context does not transfer between skills. The only artifact that persists across both is a file on disk scoped to the ticket.

## Decision

Every ticket has a living plan at `.prism/plans/<ticket-id>.md` (epics live at `.prism/plans/epic-<ticket-id>.md`). The plan is the authoritative record of:

- What the ticket is for (goal, user stories)
- What has been decided and _why_ (`## Decisions` — each entry is an implicit do-not-undo)
- What has been done, with branch attribution (`## History` — append-only)
- What review and debug findings are open or fixed (`## Review Issues`, `## Debugged Issues`)
- What the PR-readiness state is (`## PR Readiness`)

Agents read the plan before starting work. They update it after meaningful changes. They check `## Decisions` before removing or changing any logic — a decision without an update note is a decision still in force.

## Consequences

- Positive: decisions survive compaction, session ends, and skill handoffs. Skills can pick up mid-ticket without re-asking.
- Positive: `## Decisions` acts as a documented Chesterton's Fence — code reviewers and future agents can see why a piece of logic was chosen.
- Negative: plans require discipline to maintain. A stale plan is worse than no plan. Skills need explicit "update the plan" steps in their workflows.
- Neutral: plans live on `main` and carry through until the ticket closes. At close, lasting decisions promote to architect context and the plan is deleted (git history preserves it).

## References

- `.prism/rules/branch-plan.md` — plan file location, template, maintenance expectations
- `.prism/architect/skills-ecosystem.md` § Plan Section Ownership — who writes which section
- `AGENTS.md § Task Management` — plan is the working memory across sessions
