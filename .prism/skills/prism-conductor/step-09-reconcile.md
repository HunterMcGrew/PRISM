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

### 2.5 Resolve dependency eligibility and detect cycles

Run this step over the full `lanes[]` array before the convergence governor evaluates. It has three sub-checks, in order:

**(a) Cycle check** — run a depth-first cycle detection over the `dependsOn` graph across all `lanes[]` (edges are `laneId` references over the flat list; the graph must be a DAG per FR-9). A detected cycle of any length (A→B→A, or A→B→C→A) is a `needs-human` escalation: set the participating lanes' `escalation` object (`axis: "human"`, `reason: "dependsOn-cycle: <lane chain>"`, `raisedAt`), append a description of the cycle to `pendingHumanReport`, and do **not** dispatch any lane in the cycle until the human removes an edge. This is a constraint check, not a convergence brake — it does not consume `globalBudget` and is orthogonal to the three-brake priority order (see `lib/convergence.md § Dependency-graph pre-check`).

**(b) Eligibility resolution** — for each pending/held lane, recompute whether every `dependsOn` target has reached `status: "done"`. Clear `blockedBy` and `phaseStatus: "parked"` on lanes whose edges all resolved — they become dispatch-eligible for the next segment.

**(c) Parked-dependency surface** — if any `dependsOn` target is `parked` (not `done`), the dependent lane cannot resolve: keep its `blockedBy` entry and append a co-presented entry to `pendingHumanReport` naming both the dependent lane and the parked target's escalation reason (FR-3). Resolving the parked target's escalation unblocks the dependent lane on the next reconcile pass.

Eligibility is checked **at the reconcile boundary** (segment-granular), never mid-segment — consistent with the segment model where Sol does not talk to running workers (`lib/goal-state.md` § Mutate protocol). Cite `lib/convergence.md` for the convergence governor (this step runs before it) and `lib/goal-state.md` for the mutate protocol.

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
