---
step: brownfield-step-03-sketch
---

# Brownfield Step 03 — Sketch confirmation

Present the observed surface as a labeled sketch; ask the user to confirm, correct, or augment.

## Actions

1. **Present sketch.** Render the observed surface (from step-02) as a labeled chat output:

   > "Here's what I see in `<target>`:
   >
   > **Files (`<count>`):**
   > - `<file>` — `<one-line role>`
   > - ...
   >
   > **Public API:**
   > - `<symbol>(<signature>)` — `<inferred purpose>`
   > - ...
   >
   > **Tests:**
   > - `<test file>` — `<test count>` cases
   >
   > **Inbound dependencies:** `<list>`
   > **Outbound dependencies:** `<list>`
   >
   > Does this match how you think about the module? Confirm, correct, or augment."

2. **Capture corrections.** Apply user feedback to the scratch state — add missing files, rename roles, fix dependency lists.
3. **Lock the sketch.** Once the user confirms, the corrected sketch is ground truth for step-04 and step-05.
4. **Update PRD frontmatter:** append `brownfield-step-03-sketch` to `stepsCompleted`. `lastEdited: <ISO 8601>`.

## Exit condition

User-confirmed sketch in scratch state. Advance to brownfield-step-04-tests.
