# Step 07 — Plan

Generate slug from candidate topic (kebab-case, ≤40 chars). Create refactor plan at `.prism/plans/refactor-<slug>.md` using the template from [`.prism/rules/branch-plan.md`](../../rules/branch-plan.md).

Populate:

- `## Goal` — from candidate `problemStatement`
- `## Decisions` — from grill-pass outcomes (5 sub-bullets per ADR-0024's decision-depth convention when applicable)
- `## Implementation Tasks` — stub heading reserved for Winston (Ren does not write implementation tasks)
- `## History` — initial entry naming Ren as author with branch context

Use `Write` tool. Set candidate `status: "committed"`, record `committedAt`. Set `currentPhase: "continuing"`. Append `step-07-plan` to `stepsCompleted`. Atomic state write.

Confirm to user with one-line summary:

> "Refactor plan written to `.prism/plans/refactor-<slug>.md`. Winston picks up `## Implementation Tasks`."

## Exit condition

Plan file exists on disk. Advance to step-08.
