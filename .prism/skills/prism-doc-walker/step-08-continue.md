# Step 08 — Continue

Close the loop. Walk through remaining candidates, revisit deferred ones, or finish cleanly.

## Inputs

- Full `state.candidates[]` with current statuses
- User intent for what to do next

## Actions

1. **Count candidates by status.** Build a one-line summary for the user:

   > "Walk status: `<pending>` pending, `<deferred>` deferred, `<committed>` committed, `<skipped>` skipped."

2. **Branch on remaining work:**

   ### Pending candidates remain

   Prompt:
   > `continue` (back to step-03 for next pending) / `revisit-deferred` (re-present any candidate with status `deferred`) / `pause` (close session cleanly with state preserved)

   - `continue` → advance to step-03 with the next pending candidate.
   - `revisit-deferred` → switch each deferred candidate's `status` back to `"pending"` (with a `revisitedAt` timestamp), then advance to step-03.
   - `pause` → set `currentPhase: "idle"`, append `step-08-continue` to `stepsCompleted`, atomic state write. Close session — resumption is offered on next invocation per step-01.

   ### No pending, deferred candidates remain

   Prompt:
   > `revisit-deferred` / `pause` / `finish`

   - `revisit-deferred` → as above.
   - `pause` → same as above.
   - `finish` → set `currentPhase: "idle"`, mark walk complete (`completedAt: "<ISO timestamp>"`), atomic state write.

   ### No pending, no deferred

   Prompt:
   > `finish` (close cleanly) / `walk-new-directory` (prompt for new directory, jump back to step-01 for a fresh walk)

   - `finish` → set `currentPhase: "idle"`, atomic state write. Close session.
   - `walk-new-directory` → ask for the new target directory, jump to step-01.

3. **Closing summary.** When the session closes (any `pause` / `finish` path), emit a final summary listing committed architect docs, skipped candidates, and deferred candidates carried forward.

## Exit condition

Session closed (`currentPhase: "idle"`), or jumped back to step-03 / step-01 for more work.
