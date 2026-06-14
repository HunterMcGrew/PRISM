# Decision log: sol-conductor-phase-b-hierarchy

> Paired with [sol-conductor-phase-b-hierarchy.md](./sol-conductor-phase-b-hierarchy.md).
> Status: draft — awaiting Hunter's ratification gate.

## Scope decisions

### Phase B is two capabilities, not three

**Decision:** Phase B scopes to (1) epic→issue→ticket tree semantics in `goal-state` and (2) greenfield specs→ticket-tree decompose. The integration gate (brief Q4, a lane with multiple `dependsOn` edges + a human gate) is Phase C, not Phase B, even though `dependsOn` ships nullable in the Phase A schema.

**Reasoning:** The integration gate is a *cross-team* capability — it gates one team's output against another team's output. Teams as lane-groups (Phase C) is the prerequisite; the integration gate has no useful meaning before teams are driven. Phase B's tree semantics are *single-team* hierarchy (epics contain issues contain tickets). These are different shapes of the same `parentId`/`dependsOn` schema fields, but driven by different phases for different reasons.

**Status:** recorded at draft. No further action until Hunter ratifies.

---

### Tree depth ≠ generation depth is a load-bearing invariant

**Decision:** The planned tree produced by the greenfield decompose step is assigned `generation: 0` at every level (epic, issue, ticket). Generation accrues only from unplanned discovery (`parent.generation + 1`). This is restated as a Phase B invariant because it affects both the convergence governor (the budget/K=3/breadth-gate brakes must not mistake a planned 3-level tree for gen-3 discovered work) and the ratification gate (the operator is approving a gen-0 planned tree, not a gen-3 runaway).

**Status:** recorded at draft. Winston to confirm during plan authoring.

---

### Breadth gate applies to unplanned discovery, not the planned tree dispatch

**Decision:** The breadth gate (default 12) governs unplanned single-reconcile expansions. The planned tree dispatch after ratification is explicitly excluded from the breadth-gate count. A 30-ticket ratified tree dispatches without triggering the breadth gate.

**Open:** [ASSUMPTION-4] — Winston to confirm the planned/unplanned distinction is implemented correctly and does not create a loophole.

---

### Decompose chain order: Parker → Winston → Nora

**Decision (draft, unconfirmed):** The greenfield decompose chain runs Parker first (PRD→epics), Winston second (architecture→issues), Nora third (tickets). This matches the grain hierarchy (initiative > architecture task > ticket) and each persona's established ownership.

**Open:** [ASSUMPTION-2] — Winston may advise collapsing Parker+Winston or reordering. The chain order is a planning decision, not a durable architectural choice; it should be resolved during plan authoring.

---

### Reconcile-delta primitive is reused unchanged

**Decision (draft, unconfirmed):** Phase B's greenfield decompose step invokes `lib/reconcile.md` as a caller, not a forked implementation. The "specs emit a ticket tree → Sol reconciles → dispatches the delta" shape is the same primitive as Phase A's "signals emit → reconcile → dispatch."

**Open:** [ASSUMPTION-6] — the current primitive handles flat signals; a tree-shaped input may need an additive extension. Winston to confirm during plan authoring.

---

## Deferred decisions (for Winston's plan authoring)

The following open questions are formally deferred to Winston's Phase B plan authoring. Each has a default path in the PRD's `## Open questions` section; no implementation should proceed past the default path without Winston's explicit resolution.

| # | Open question | Default path |
|---|---------------|--------------|
| ASSUMPTION-1 | Parent-lane dispatch: child-first hold vs. concurrent run | Child-first; parent holds until all children resolve |
| ASSUMPTION-2 | Decompose chain order and persona ownership | Parker → Winston → Nora, sequential |
| ASSUMPTION-3 | Ratification artifact form | Chat-readable summary + `goal-state` readable |
| ASSUMPTION-4 | Breadth gate and planned tree | Planned ratified dispatch excluded from gate count |
| ASSUMPTION-5 | Budget subtree attribution | Read-time aggregation, no per-lane counter |
| ASSUMPTION-6 | Reconcile-delta primitive extension for tree input | Additive extension to `lib/reconcile.md`, not a fork |
| ASSUMPTION-7 | Decompose chain crash-safety and resume | Same `pendingTicketCommit` pattern as decision-box |
