---
step: step-01-detect-target
---

# Step 01 — Detect retro target

Determine what Iris is running the retrospective against. Two modes: epic-plan (primary) and date-range (fallback).

## Questions

1. "What's the retro target? Name an epic slug (e.g. `epic-prism-pattern-absorptions-wave-2`), a ticket ID, or a date range (`YYYY-MM-DD..YYYY-MM-DD`)."
2. If ambiguous: "Should I run this against the epic plan, or walk every plan with `## History` entries in a date window?"

## Actions

1. **Parse the user's target signal** from the trigger phrase and any follow-up answer.
   - If a slug or ticket ID is given → epic-plan mode.
   - If a date range is given (or the user explicitly asks for one) → date-range mode.
   - If no plan file exists at `.prism/plans/epic-<slug>.md` and no `<slug>.md` matches, ask the user to disambiguate before guessing.

2. **Epic-plan mode** — locate the plan:
   - Look for `.prism/plans/epic-<slug>.md` first.
   - Fall back to `.prism/plans/<slug>.md` for non-epic plans.
   - If neither exists, surface the miss and ask the user for the correct path.

3. **Date-range mode** — accept ISO dates only (`YYYY-MM-DD..YYYY-MM-DD`). Validate both ends are parseable; reject malformed ranges and ask the user to retry.

4. **Initialize state file** at `.prism/iris-state.json` with:
   ```json
   {
     "currentStep": "step-02-gather-evidence",
     "stepsCompleted": ["step-01-detect-target"],
     "retroTarget": { "kind": "epic" | "date-range", ... },
     "status": "in-progress"
   }
   ```
   For epic mode, `retroTarget` is `{ kind: "epic", slug, planPath }`. For date-range mode, `{ kind: "date-range", from, to }`.

5. **Confirm with the user** before advancing — "Running retro against `<target>`. Proceed?"

## Exit condition

`retroTarget` set in `.prism/iris-state.json`. Mode confirmed by user. Advance to `step-02-gather-evidence`.
