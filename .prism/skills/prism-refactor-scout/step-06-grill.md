# Step 06 — Grill

Five-pass grilling loop on the chosen candidate:

1. **Design tree walk** — what does this code reach? What reaches it? Map the dependency and consumer trees.
2. **Challenge assumptions** — why does the abstraction exist? What changed since it was introduced? Has the original justification held up?
3. **Deletion test rigor** — re-run the deletion test with full context, not the surface heuristic. Trace where complexity actually moves.
4. **Surface alternatives** — name the four refactor shapes (`collapse` / `extract` / `inline` / `move`) and pick the one that fits. Justify the pick.
5. **User confirmation** — present the grilled candidate with all five pass outputs. Prompt `confirm` / `reject`.
   - `confirm` → set `currentPhase: "planning"`, advance to step-07.
   - `reject` → set candidate `status: "deferred"`, record `decidedAt`, return to step-04.

Record pass outputs in candidate state under `grillNotes` (object with pass 1-5 keys). Append `step-06-grill` to `stepsCompleted`. Atomic state write.

## Exit condition

Candidate confirmed (advance to step-07) or deferred (return to step-04).
