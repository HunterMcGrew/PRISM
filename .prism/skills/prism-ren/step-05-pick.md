# Step 05 — Pick

Capture user choice. Supported inputs:

- **Pick number** (e.g. `3`) → set chosen candidate's `status: "grilling"`, advance to step-06.
- **`skip <n>`** → mark candidate `status: "skipped"`, record `decidedAt`. Do NOT resurface.
- **`defer <n>`** → mark candidate `status: "deferred"`, record `decidedAt`. May resurface in a later session.
- **`continue`** → scan a new directory; jump back to step-02 with new target.

Atomic state write. Append `step-05-pick` to `stepsCompleted`.

## Exit condition

A candidate has been picked (advance to step-06), or the loop branched to step-02 / next presentation.
