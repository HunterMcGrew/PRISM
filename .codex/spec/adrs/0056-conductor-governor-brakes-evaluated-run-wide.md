---
Number: 0056
Title: Conductor — Convergence Governor Brakes Are Evaluated Run-Wide, Never Per-Partition
Status: accepted
Date: 2026-06-14
---

## Context

The convergence governor is the brake that keeps Sol's self-growing fleet from running away: a dispatch budget (primary), a generation cap, and a breadth gate that limits how many distinct new lanes one reconcile may add ([ADR-0050](./0050-conductor-growth-loop-and-convergence-governor.md)). Phase D splits run-control state across files — lane records move from one `conductor-state.json` into per-epic-subtree partition files ([ADR-0055](./0055-conductor-partitions-run-control-by-epic-subtree.md)). The risk this creates is specific and easy to introduce silently: a brake that *counts* could quietly become a per-partition count.

The breadth gate makes the failure concrete. The gate trips when a single reconcile would add more than the breadth limit (default 12) of distinct new lanes. If the gate counted per partition, two partitions each expanding 11 lanes in the same reconcile would add 22 lanes total — and neither partition alone exceeds 12, so the gate never trips. The governor's job is to brake the *run's* growth; counting per file would let the run grow past the brake while every file stays "under the limit." The same hazard applies to the budget counter (two per-partition budget pools each "under budget" while total dispatches run away — the exact failure ADR-0050 rejected for discovered-work budgets) and to the generation cap (a per-partition generation count would miss growth distributed across partitions).

The natural mistake under partitioning is to put the counters where the data now lives — in the partition files. That is precisely the mistake to refuse. The brake's scope is the run, so its state has to live where the run's scope is: the root index.

## Decision

**The governor's brakes are evaluated run-wide, never per-partition.** The dispatch budget counter, the generation counts, and the signal registry live **only in the root index** — never in a partition file — so every brake evaluates against the summed full-run state by construction.

Concretely, under the partitioned layout:

- **Budget** — `globalBudget` is a single root-level counter. Every dispatch, in any partition's lanes, increments the one counter. There is no per-partition budget pool and no per-batch subdivision (the per-run budget doctrine of ADR-0050 applied to partitions and batch segments alike).
- **Generation cap** — generation counts are read from the root index's denormalized lane summary (`lanesSummary[laneId].generation`), so the cap sees generations across all partitions, not a per-file subset.
- **Breadth gate** — the gate counts **distinct new lanes summed across all partitions in a single reconcile**. A 6-lane expansion in `epic-1` plus a 7-lane expansion in `epic-2` is a 13-lane reconcile that trips the gate of 12, even though neither partition alone exceeds it.
- **Signal registry** — `signals[]` lives in the root index, so structural dedup spans all partitions; a signal deduped against the run-wide registry can never be re-dispatched from a different partition.

The invariant, stated plainly: **no brake is weakened by partitioning.** Partitioning splits lane *records* across files for read/parse cost; it never splits the governor's counting surface. This constrains every future partition-aware change — any new brake, or any change to an existing one, evaluates run-wide and keeps its counter in the root index.

## Consequences

- **Positive:** The convergence governor that ADR-0050 established survives Phase D intact — the brakes count the run, not the file, so a large partitioned run is braked exactly as a small single-file run would be. Putting budget, generation counts, and the registry in the root index makes "run-wide" true by construction rather than by a discipline a future change could forget: there is no per-partition counter to accidentally read. Run-wide structural dedup means a duplicate finding emitted from two different partitions collapses to one decision unit, so partitioning does not multiply discovered work.
- **Negative:** The root index carries the run-wide counters and the full signal registry, so it is the hot file every reconcile reads and writes — partitioning relieves the lane-record read cost but concentrates the governor's read cost on one file. At the ~100-lane ceiling with structural dedup collapsing duplicates the registry stays in the low hundreds of small objects (epic plan D-A4), but the registry is uncapped in v1, so a pathological run could grow it; a prune of `processedAt`-old entries is a named future refinement, not v1. The breadth gate's cross-partition sum means a reconcile that expands several partitions at once can trip the gate even when no single partition's expansion looks large — which is the intended behavior, but it means an operator reasoning from one partition's growth alone can be surprised by a gate trip.
- **Neutral:** No schema change to the brakes themselves — the budget, generation cap, and breadth gate are the same brakes ADR-0050 defined; Phase D changes only *where their state lives* (root index) and *how it is summed* (across all partitions), not the brake logic or the default thresholds. The breadth gate default (12) is calibrated to the concurrency cap and stays config-driven, as in Phase A.

## References

- `.prism/plans/epic-sol-conductor-phase-d.md` § Decisions D-A3-companion — the decision this ADR records, with the per-partition counting bug it prevents; tasks 1 and 8 place the counters in the root index and evaluate the brakes run-wide
- `.prism/prds/sol-conductor-phase-d-scale.md` — the Phase D PRD (FR-9, NFR-6, the run-wide-brakes requirement)
- [ADR-0050](./0050-conductor-growth-loop-and-convergence-governor.md) — the convergence governor (budget, generation cap, breadth gate) this ADR keeps run-wide under partitioning
- [ADR-0055](./0055-conductor-partitions-run-control-by-epic-subtree.md) — the partitioned layout this invariant constrains; this ADR is its companion
- `.prism/skills/prism-conductor/lib/convergence.md`, `lib/reconcile.md`, `lib/partition-store.md` — the run-wide brake evaluation, the run-wide registry/dedup path, and the root-index-holds-the-counters layout that bind Sol to this decision
