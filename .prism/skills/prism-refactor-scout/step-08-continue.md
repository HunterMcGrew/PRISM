# Step 08 — Continue

Count remaining candidates by status. Build summary:

> "Scout status: `<pending>` pending, `<deferred>` deferred, `<committed>` committed (refactor plans written), `<skipped>` skipped."

Prompt:

- **`continue`** → return to step-04 with remaining pending candidates.
- **`revisit-deferred`** → switch deferred candidates' `status` to `pending` (with `revisitedAt`); return to step-04.
- **`scan-new-directory`** → return to step-02 with a new target directory.
- **`pause`** → set `currentPhase: "idle"`, record `pausedAt`, atomic state write. Close session cleanly — resumption offered next invocation per step-01.
- **`finish`** → set `currentPhase: "idle"`, record `completedAt`, mark scout complete.

Closing summary (on any `pause` / `finish`): list refactor plans written (with paths) and any deferred candidates carried forward.

## Exit condition

Session closed (`currentPhase: "idle"`), or jumped back to step-02 / step-04 for more work.
