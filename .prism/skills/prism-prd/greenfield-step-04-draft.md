---
step: greenfield-step-04-draft
---

# Greenfield Step 04 — Draft

Branch on the fast/coaching choice from step-03.

## Fast path

Batch-write all PRD sections from the brain dump:

1. Problem statement
2. Target users
3. Success metrics
4. Scope (in scope / out of scope / won't this time)
5. User journeys
6. Requirements (functional + non-functional)
7. Constraints
8. Open questions
9. Stakeholders
10. Decision log link (populated in step-05)

For every gap in the brain dump, insert an inline `[ASSUMPTION: <text>]` marker AND add a numbered entry to `## Open questions` with the same text. Number assumptions sequentially across the whole PRD — `[ASSUMPTION-1]` through `[ASSUMPTION-N]`.

## Coaching path

Walk through each section interactively:

1. Open the section.
2. Ask 2-3 PM-style clarifying questions specific to that section.
3. Write the section from the answers.
4. Move to the next section.

Coaching path produces fewer `[ASSUMPTION]` markers — the questions catch the gaps before writing.

## Actions

1. Branch on fast/coaching.
2. Write all 10 sections.
3. Update PRD frontmatter: append `greenfield-step-04-draft` to `stepsCompleted`. `lastEdited: <ISO 8601>`.
4. Confirm to user: "Draft complete with `<N>` assumptions tagged. Decision log next (for internal/launch stakes), then review."

## Exit condition

All 10 required sections present in the PRD body. Advance to greenfield-step-05-decision-log.
