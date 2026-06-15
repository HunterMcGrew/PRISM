---
Number: 0055
Title: Conductor — Run-Control State Partitions by Epic-Subtree Root, Not by Team
Status: accepted
Date: 2026-06-14
---

## Context

Phase D scales Sol to large runs (~100 lanes) by partitioning the single `conductor-state.json` run-control file into a root index plus per-partition files, so a segment boundary no longer re-parses the whole run's state ([epic plan](../../plans/epic-sol-conductor-phase-d.md), Goal). The load-bearing question is the partition key — which dimension the file boundary follows. The PRD names this "the most load-bearing Phase D design decision," because the key determines which dependency edges land on the slow cross-partition path (`.prism/plans/epic-sol-conductor-phase-d.md`, Decision D-A3).

Phase D inherits two structural dimensions it must honor without redefining either: Phase B's `parentId` tree (epic → issue → ticket) and Phase C's `team` field plus cross-team `dependsOn` edges. Three partition keys present themselves, and each puts a different class of dependency edge across the partition boundary:

- **(A) One partition per epic subtree** — the file boundary follows Phase B's `parentId` tree.
- **(B) One partition per team** — the file boundary follows Phase C's `team` field.
- **(C) Hybrid, one partition per team-epic combination** — the boundary follows both.

The decisive lens is the same one database sharding turns on: you shard to keep the *most-traversed* join inside one shard, and if your hottest edge crosses shards, sharding made the system worse, not better. The hottest cross-partition traffic in Phase D is the **cross-team `dependsOn` edge** — the PRD's own canonical journey is "a frontend lane waits on a backend lane." Each candidate has to be judged against *that* edge, not against file size in the abstract.

- **Team-partitioning (B)** puts *every* cross-team `dependsOn` across a partition boundary by construction. The most-traversed edge lands entirely on the root-summary slow path. That is sharding by the wrong key — it maximizes cross-partition traffic on exactly the edge Phase D exists to keep cheap. Rejected.
- **Hybrid (C)** minimizes individual file size but multiplies partition count combinatorially (teams × epics), and within each epic it *re-introduces* the cross-team-edge-crosses-boundary problem. It carries the most complexity and brings back the failure mode (B) was rejected for. Rejected.
- **Epic-partitioning (A)** localizes the common case: a backend-API ticket and the frontend-page ticket that depends on it, both under *Epic: checkout*, live in the **same** partition — their `dependsOn` is an in-partition check with no root-summary hop. Only genuinely *cross-epic* dependencies, which are rarer, take the slow path, and that slow path is exactly where a denormalized root summary is the right tool (epic plan D-A9). Chosen.

The third dimension — `team` — does not disappear; it stops driving the file boundary and becomes a reporting dimension instead. The run-control surface keeps `team` as a field on each lane, surfaced in the end-of-run report by grouping. Partition-by-epic and report-by-team are orthogonal: the partition boundary localizes the hot dependency path, while the team grouping answers "how is each team's work progressing" at read time, with neither forcing the file boundary into the wrong place.

## Decision

**Run-control state partitions by epic-subtree root.** Above the partition threshold, a partitioned run is a root index (`.prism/conductor-state.json`) plus one partition file per epic subtree (`.prism/conductor-state.epic-<laneId>.json`), where the partition key is `walkToEpicRoot(laneId)` — the lane's `parentId` chain walked to the tree root. A lane's full record lives in its epic-subtree partition file; the root index holds run-wide state (manifest, denormalized lane summary, signal registry, budget) and no lane records.

**`team` is a reporting dimension, not a partition boundary.** The `team` field stays on the lane and is surfaced in the end-of-run report by grouping. Partition-by-epic and report-by-team are orthogonal, so Phase B's tree drives the file boundary while Phase C's teams drive a report view — both honored, neither in the wrong place.

A flat run with no epic ancestor (no `parentId`) partitions under a synthetic `epic-root` key, or stays single-file below the threshold. The partition key is derived once per lane and cached in the root index's lane summary (`lanesSummary[laneId].partitionKey`), so the `parentId` walk runs once per lane rather than once per dependency check.

Partition-by-epic-subtree is the run-control state-layout key only; it does not redefine Phase B's tree semantics or Phase C's team semantics. It reads both and chooses which one the file boundary follows.

## Consequences

- **Positive:** The common-case dependency edge — a ticket depending on a sibling ticket under the same epic — resolves as an in-partition check with no root-summary hop, because both lanes live in the same partition file. This is the hot-path localization the whole partitioning effort exists to buy. Keeping `team` as a reporting dimension means Phase B's tree and Phase C's teams are both honored without either forcing the file boundary into the wrong place, and the report carries both an epic-partition view and a team view. Caching the derived key in the lane summary means the `parentId` walk is paid once per lane, not once per dependency check.
- **Negative:** A genuinely cross-epic dependency — a lane under *Epic: checkout* depending on a lane under *Epic: search* — still takes the slow root-summary path; epic-partitioning makes the common case cheap, not every case. Partition-by-epic also means a single very large epic (one epic with 80 lanes) concentrates most of the run into one partition file, so the per-partition read cost is uneven across a lopsided tree — partitioning by epic does not guarantee evenly-sized partitions. The cross-epic-edge cost is the deliberate price of optimizing for the common case the PRD's canonical journey describes.
- **Neutral:** The partition key depends on Phase B's `parentId` tree being on `main` — `walkToEpicRoot` walks `parentId` to the root, so Phase D is build-ordered after Phase B (epic plan, Build dependency). The partition key is a config seam: `partition key strategy` defaults to `epic-subtree`, and a consuming team could in principle select `team` or `hybrid`, but `epic-subtree` is the shipped default and the only strategy v1 implements end-to-end (epic plan D-A3 implementation guidance, D-A2 config seams). The run-control `team` value lives in goal-state (Sol's channel), never in a Linear or GitHub ticket body.

## References

- `.prism/plans/epic-sol-conductor-phase-d.md` § Decisions D-A3 — the decision this ADR records, with the three partition keys, the sharding-by-right-key analysis, and the rejected alternatives grounded in runtime cost; D-A9 holds the companion denormalized-summary mechanics the cross-epic path relies on
- `.prism/prds/sol-conductor-phase-d-scale.md` — the Phase D PRD (the partition-key decision named "the most load-bearing Phase D design decision")
- [ADR-0051](./0051-conductor-tree-dispatch-semantics.md) — the `parentId` tree and container/leaf semantics the partition key walks
- [ADR-0049](./0049-conductor-teams-are-lane-groups.md) — the `team` field this ADR keeps as a reporting dimension rather than a partition boundary
- [ADR-0056](./0056-conductor-governor-brakes-evaluated-run-wide.md) — the companion invariant that the governor brakes stay run-wide under this partitioned layout
- `.prism/skills/prism-conductor/lib/goal-state.md`, `lib/partition-store.md`, `lib/fleet.md` — the v3 partitioned schema, the partition read/write protocol, and the cross-partition dependency resolution that bind Sol to this decision
