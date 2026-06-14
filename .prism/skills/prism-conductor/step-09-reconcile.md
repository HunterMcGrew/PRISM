# Step 09 — Reconcile

The between-segment growth step. After a segment completes (steps 04–08), Sol runs this step before deciding whether to loop or report.

## Procedure

### 1. Invoke the reconcile primitive

Call the reconcile-delta procedure in `.prism/skills/prism-conductor/lib/reconcile.md`:
- Read `goal-state` (`signals[]` + `lanes[]`).
- Structural dedup at the door — attach duplicate signals, route ambiguous matches to Nora.
- Compute the lane delta: distinct unprocessed targets that survived dedup.

### 2. Run the decision box per distinct target

For each candidate target in the lane delta, invoke the decision box in `.prism/skills/prism-conductor/lib/decision-box.md`:
- Dispatch Nora to evaluate the signal and return `{ disposition, draftTicket, escalationReason? }`.
- If `escalationReason: "blast-radius"`: dispatch Winston, then dispatch Nora a second time to finalize.
- Sol resolves `fold-active` vs. `followup-pr` from the target lane's merge status (run-state lookup).
- Write `goal-state` at each decision-box step (`routed` → `winston-verdict` → `finalized`) per the crash-safety protocol.

After the decision box, each candidate is classified as: auto-dispatchable, parked-to-human, or dropped.

### 3. Apply the convergence governor

Apply the three brakes in priority order per `.prism/skills/prism-conductor/lib/convergence.md`:

1. **Dispatch budget** — if `globalBudget.spent ≥ globalBudget.maxDispatches`, park remaining candidates and set termination reason `budget-exhausted`; go to step-10.
2. **Generation cap K=3** — for each candidate lane, compute `generation = parent.generation + 1` (origin lanes are gen 0; discovered lanes inherit from the emitting lane's `parentId`). Candidates at `generation ≥ 4` (default K=3) are captured but parked to a human gate; gen 1–3 auto-dispatch.
3. **Breadth gate (default 12)** — count remaining auto-dispatchable candidates; if the count exceeds 12, surface the full expansion to a human rather than auto-dispatching; go to step-10 for the parked set.

Record parked candidates in `pendingHumanReport`; record any budget or breadth-gate trip in the lane's termination reason.

### 4. Branch

- **Non-empty auto-dispatchable candidates** — loop back to step-04 dispatch for the next segment, authoring the segment's `pipeline()` over the new lane set via `resumeFromRunId`. Every dispatch against the new lane set increments `globalBudget.spent`.
- **Empty delta** — set termination reason `converged`; go to step-10.
- **Governor brake tripped** — termination reason already set above; go to step-10.

## Exit condition

Either the next segment is dispatched (loop) or the run terminates (`converged` or `budget-exhausted`) and control passes to step-10 report.
