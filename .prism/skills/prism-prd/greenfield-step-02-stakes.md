---
step: greenfield-step-02-stakes
---

# Greenfield Step 02 — Stakes calibration

Interview-driven stakes calibration. Three questions; map answers to `stakes` field.

## Questions

1. "Is this a **hobby project**, an **internal tool**, or a **public launch**?"
2. "Roughly how many users are affected by getting this right (or wrong)?"
3. "What's the cost of getting this wrong? Throwaway, support burden, customer-facing incident, regulatory consequence?"

## Mapping

| Signal | → stakes |
| --- | --- |
| Personal exploration, throwaway, 1 user, learning project | `hobby` |
| Team-internal tool, low blast radius, <100 users, support burden if broken | `internal` |
| Customer-facing, public-facing, regulatory, multi-tenant, >100 users | `launch` |

If the three answers don't agree (e.g. "internal tool" + "10,000 users" + "regulatory"), surface the contradiction and ask the user to reconcile before picking a level.

## Actions

1. Ask question 1. Capture answer.
2. Ask question 2. Capture answer.
3. Ask question 3. Capture answer.
4. Propose `stakes` value based on the mapping. Confirm with user before writing.
5. Update PRD frontmatter: `stakes: <hobby|internal|launch>`, `lastEdited: <ISO 8601>`.
6. Append `greenfield-step-02-stakes` to `stepsCompleted`.
7. **STOP** before advancing to step 03. Surface the calibrated stakes to the user with this phrasing template (adapted from Sage's existing STOP precedent):

   > "Stakes calibrated as `<level>`. Before I move to drafting, **STOP**: review the stakes call. The level drives review rigor, open-question requirements, and decision log mandate. Do you want to recalibrate, or proceed?"

   **Conditional skip:** if `stakes == hobby`, skip the STOP. Rubric is auto-skipped for hobby per `step-06-review.md:11`, so the recalibration moment has less consequence.

## Exit condition

PRD frontmatter has a confirmed `stakes` value. Advance to greenfield-step-03-mode.
