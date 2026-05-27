# Step 03 — Categorize

Apply the strength badge taxonomy to each pending candidate:

- **Strong** — deletion test passes cleanly AND ≥2 call sites AND no missing test coverage AND clear refactor approach.
- **Worth exploring** — 2-3 criteria met with one ambiguous.
- **Speculative** — only one criterion met OR uncertain deletion test.

Set each candidate's `strength` field. Re-rank `candidates[]` by strength descending (strong → worth-exploring → speculative). Set `currentPhase: "presenting"`. Append `step-03-categorize` to `stepsCompleted`.

## Exit condition

Every pending candidate has a `strength` value. Advance to step-04.
