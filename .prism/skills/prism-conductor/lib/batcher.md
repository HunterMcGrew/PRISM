# Conductor batcher — segment-sized dispatch against the concurrency cap

Reference doc for batch composition. `step-04-dispatch.md` cites this doc when the ready-lane set exceeds the cap — step files cite this doc instead of restating its content.

Cross-links: `lib/convergence.md` (governor brakes — budget, generation cap, breadth gate), `lib/reconcile.md` (structural dedup runs before batch assignment), `lib/fleet.md` (the concurrency cap and conflict gate the batcher schedules against), `lib/goal-state.md` (schema fields the batcher reads).

---

## Input

The **ready-lane set** for the current segment: lanes whose `status` is not `done` or `parked`, and whose every `dependsOn` edge has `status: "done"` (Phase C eligibility check, per `step-04-dispatch.md § Dependency-gated eligibility`). Lanes with unresolved `dependsOn` edges are **not in the ready set** — they are waiting on a dependency, not queued behind a batch slot. The batcher never sees them.

The **concurrency cap** is read from config (default ~12 — same value as the breadth gate by calibration — see `lib/convergence.md § Brake 3`).

---

## Ordering rules (FR-2)

Applied as a **stable sort in priority sequence** — earlier rules break ties for later rules. Two runs over the same goal-state produce the same batch order (determinism is the contract).

1. **(a) Dependency-unblocking first.** A ready lane that other lanes' `dependsOn` edges point at is ordered ahead — completing it unblocks the most downstream work. Among equally-unblocking lanes, proceed to rule (b).
2. **(b) Team co-batching.** Among equally-unblocking lanes, prefer co-batching lanes sharing a `team` value so a team's parallel work advances together rather than interleaving across segments. Lanes with `team: null` are each their own singleton group, ordered by rule (c).
3. **(c) Leaf-first within the tree.** Ticket lanes before issue lanes before epic lanes — consistent with Phase B's leaf-first dispatch (`step-04-dispatch.md § Tree dispatch`). Leaf depth is derived from the `parentId` chain in goal-state.
4. **(d) Generation order.** Lower `generation` first. Origin lanes (gen 0) precede discovered lanes (gen 1+).

All four rules read existing goal-state fields (`dependsOn`, `team`, `parentId`, `generation`). **Sol makes no semantic priority judgment** (NFR-1) — the ordering is fully deterministic from the data.

---

## Batching

Fill the current segment with up to `cap` lanes in the ordered sequence. The remainder queues for the next segment's dispatch boundary. At the next boundary, the batcher re-runs over the updated ready set (new ready lanes may have become eligible as dependencies resolved).

---

## Budget composition (FR-3)

The dispatch budget is **per-run, not per-batch.** Before composing each batch segment, the batcher checks `globalBudget.spent < globalBudget.maxDispatches` (Brake 1 in `lib/convergence.md`). If the budget is exhausted:

- Park the remaining queue with termination reason `budget-exhausted`.
- Do not compose the segment.

Budget counts **total dispatches across all batch segments** — batches are just segments, and every segment's dispatches count against the one global counter. Per-batch budget subdivision is explicitly rejected (two pools each "under budget" while total spend runs away is the exact failure ADR-0050 addresses).

---

## Dedup composition (FR-4)

Structural dedup against the run-wide root-index registry (`lib/reconcile.md § Structural dedup at the door`) runs **before batch assignment** — a signal deduped in segment 1 is never re-dispatched in segment 2 because dedup precedes batching, not per-batch. The registry is run-wide (root index, v3 schema) so dedup spans all partitions.
