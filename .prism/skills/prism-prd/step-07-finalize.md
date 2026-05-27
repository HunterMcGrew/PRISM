---
step: step-07-finalize
---

# Step 07 — Finalize

Set `status: finalized` and emit the closing summary.

## Actions

1. **Update PRD frontmatter:**
   - `status: finalized`
   - `lastEdited: <ISO 8601>`
   - Append `step-07-finalize` to `stepsCompleted`.

2. **Emit closing summary** to the user:

   > "PRD finalized at `.prism/prds/<slug>.md`.
   >
   > - Stakes: `<stakes>`
   > - Mode: `<mode>`
   > - Open questions: `<N>` `[ASSUMPTION]` tags carried forward
   > - Decision log: `<path or 'skipped (hobby stakes)'>`
   >
   > Next options:
   > - Hand off to **Nora** to create a Linear initiative (step-08-linear-handoff)
   > - Hand off to **Mira** to decompose into user stories
   > - Hand off to **Winston** to evaluate the technical approach for the first story
   >
   > What's the next move?"

3. **Do not auto-run step-08-linear-handoff** — wait for explicit user confirmation.

## Exit condition

PRD `status: finalized`. Closing summary delivered.
