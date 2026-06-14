# Decision Log — Sol conductor Phase D: scale — batching + state partitioning

Audit trail for the `sol-conductor-phase-d-scale` PRD. Each entry captures a decision Parker made while drafting, with the alternative considered and the reason for the choice.

## 2026-06-14T00:00:00Z — Stakes calibration

- **Decision:** `internal` stakes level (inherited from the initiative).
- **Alternative considered:** none — stakes were pre-calibrated for the Sol initiative; Phase D inherits `internal` from the Phase A PRD without re-adjudicating.
- **Reason:** Phase D is developer tooling for the same audience as Phases A–C. The real blast radius (autonomous dispatch at scale, potentially larger token spend) does not exceed the blast radius already calibrated at `internal` for Phase A. No new customer-facing or regulatory surface.

## 2026-06-14T00:00:00Z — Scope framing: batching + partitioning, not sub-conductors

- **Decision:** Phase D is "Scale: batching + state partitioning." Sub-conductors are not an alternative path for Phase D.
- **Alternative considered:** sub-conductors / nested Sol (the vision brief §5 originally named sub-conductors as the Phase D answer).
- **Reason:** ADR-0049 and §7.1 of the vision brief permanently reject sub-conductors on runtime grounds: the Workflow engine forbids nesting deeper than one level, and a nested workflow shares the parent's concurrency cap, agent counter, and budget — zero throughput gain. Sub-conductors are structurally blocked, not a deferred tradeoff. The PRD states this prominently in the Problem statement and Won't-this-time section, not only in an assumption, because the original brief's framing makes it likely that a future reader will re-raise the question.

## 2026-06-14T00:00:00Z — Partition key default: epic subtree

- **Decision:** stated default path for [ASSUMPTION-3] is one partition per epic subtree; resolved as an open question for Winston.
- **Alternative considered:** one partition per team (aligns with Phase C team groupings).
- **Reason:** the tree-partitioning (per-epic) aligns more naturally with Phase B's tree semantics, which are the foundation Phase D builds on. Team-partitioning would be cleaner for Phase C's cross-team dependency model. The tradeoff is not resolved at PRD grain — it requires Winston's full analysis during Phase D plan authoring, because the choice affects the root-index schema, the batcher's read strategy, and the end-of-run report shape. Recording epic-subtree as the default path allows planning to proceed without blocking.

## 2026-06-14T00:00:00Z — Root-index + partition-file split

- **Decision:** run-wide governor state and signal registry live in a root index file (`goal-state.json`); lane records live in partition files (`goal-state.<key>.json`).
- **Alternative considered:** (a) fully distributed — each partition file holds its own governor state and registry; (b) fully centralized — the root index holds everything and partition files are purely lane-record shards.
- **Reason:** fully distributed breaks the run-wide brakes (budget, dedup, generation cap) because each partition would see only its own signals and budget. Fully centralized defeats the purpose of partitioning (the root file grows with every lane record). The split — root for run-wide state, partitions for lane records — keeps the brakes run-wide while bounding partition file size. The root-index status summary (ASSUMPTION-9) is a denormalization cost accepted in exchange for not reading full partition files on every cross-partition dependency check.

## 2026-06-14T00:00:00Z — Crash-safety: needs-human on stale partition, not auto-repair

- **Decision:** a partition file whose `lastWritten` timestamp does not match the root index's manifest record surfaces as a `needs-human` gate on resume, not an auto-repair.
- **Alternative considered:** auto-repair by re-running the crashed segment's write (idempotent if the segment was idempotent).
- **Reason:** Phase D cannot guarantee that a crashed segment's writes were idempotent — the segment may have dispatched agents whose results are now in the partition file's `.tmp` or missing entirely. Auto-repair would require the system to re-run the segment, which risks double-dispatching already-sent work. The `needs-human` gate is consistent with Phase A's crash-safety pattern (surface `pendingTicketCommit` to human rather than auto-resolve) and keeps the invariant that Sol never makes semantic judgments about what happened in a crashed segment.

## 2026-06-14T00:00:00Z — Phase D is the terminal phase

- **Decision:** Phase D is named in the PRD as the terminal phase of the Sol product-lead conductor initiative. No Phase E is defined.
- **Alternative considered:** leaving the terminal status implicit.
- **Reason:** the vision brief's §5 strawman listed four phases (A–D). The PRD series (A, B, C, D) covers those four. Naming Phase D as terminal prevents readers from assuming a Phase E is pending and from scoping Phase D as a stepping stone rather than a completion. If the initiative grows a Phase E, it starts a new PRD, not an amendment to this one.

---

Subsequent decisions appended below as the PRD evolves.
