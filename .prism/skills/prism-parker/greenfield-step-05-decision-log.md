---
step: greenfield-step-05-decision-log
---

# Greenfield Step 05 — Decision log

Conditional. Skip entirely for `stakes: hobby`.

## Actions

1. **Check stakes.** If `stakes: hobby` → skip; advance to step-06-review.
2. **Create the decision log file** at `.prism/prds/<slug>.decision-log.md`. Seed content:

   ```markdown
   # Decision Log — <title>

   Audit trail for the `<slug>` PRD. Each entry captures a decision Parker made while drafting, with the alternative considered and the reason for the choice.

   ## <ISO 8601 timestamp> — Stakes calibration

   - **Decision:** `<stakes>` stakes level.
   - **Alternative considered:** <other level that almost fit>.
   - **Reason:** <one-line rationale from the calibration interview>.

   ## <ISO 8601 timestamp> — Draft mode

   - **Decision:** `<fast | coaching>` path.
   - **Alternative considered:** the other.
   - **Reason:** <one-line rationale — user choice or recommended default>.

   ---

   Subsequent decisions appended below as the PRD evolves.
   ```

3. **Add decision-log link to PRD body** under the `## Decision log link` section: `See [decision-log.md](./<slug>.decision-log.md)`.
4. **Update PRD frontmatter:** append `greenfield-step-05-decision-log` to `stepsCompleted`. `lastEdited: <ISO 8601>`.

## Exit condition

Decision log file exists at `.prism/prds/<slug>.decision-log.md` (or skipped for hobby stakes). PRD links to it (or the link section is empty for hobby). Advance to step-06-review.
