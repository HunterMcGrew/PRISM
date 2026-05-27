# Step 04 — Present

Render ranked candidates grouped by strength. Each candidate displays:

- File path(s)
- One-line problem statement
- Suggested approach (`collapse` / `extract` / `inline` / `move`)
- Before/after sketch in fenced ASCII when the shape change is visual

Cap at 10 candidates per round. If more remain after the user picks, they resurface in subsequent step-04 invocations.

Set `currentPhase: "presenting"`. Append `step-04-present` to `stepsCompleted`. Advance to step-05.

## Exit condition

Ranked candidates presented to user. User input expected in step-05.
