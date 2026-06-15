# Conductor partition store — read / write / atomic protocol

Reference doc for the partitioned run-control layout (schema v3). Step files and the crash-resume path cite this doc instead of restating the protocol. For the single-file atomic-write mechanism (write `.tmp` → `mv`), cite `lib/goal-state.md § Write protocol` — it is not restated here.

Cross-links: `lib/goal-state.md` (single-file protocol, schema v2 and v3), `lib/reconcile.md` (registry lives in root index), `lib/convergence.md` (governor counters live in root index).

---

## Onset — when partitioning activates (FR-11)

A run operates **single-file** (`.prism/conductor-state.json` holding `lanes[]` directly, v2 layout) until the lane count crosses the **partition threshold** (default 50 lanes — config-driven per `lib/goal-state.md § Field notes (v3 additions)`).

Sol checks the lane count at each reconcile boundary. On crossing the threshold, Sol **migrates in place**:

1. Group all existing lanes by `walkToEpicRoot(laneId)` — the partition key derivation (see [ADR-0055](../../spec/adrs/0055-conductor-partitions-run-control-by-epic-subtree.md)). A lane with no epic ancestor uses the synthetic key `"epic-root"`.
2. For each group, write one partition file (`conductor-state.epic-<laneId>.json`) containing `{ "version": "3", "key": "epic-<laneId>", "lastWritten": "<ISO-8601>", "lanes": [ ... ] }` with the group's lane records.
3. Rewrite the root index with `partitionManifest` + `lanesSummary` + the moved `signals[]` / `globalBudget`, setting `version: "3"`.
4. Clear `lanes[]` from the root — in the partitioned layout, `lanes[]` lives only in partition files.

Pre-Phase-D runs and sub-threshold runs never partition (FR-11) — this onset is a one-way, in-place migration triggered only by crossing the threshold.

---

## Read strategy (FR-6)

At every segment boundary, Sol reads state in this order:

1. **Read the root index first** — manifest (`partitionManifest`), `lanesSummary`, `signals[]`, `globalBudget`, governor counters. This is the minimum needed to assess run-wide state and resolve cross-partition dependency checks.
2. **Read only the partition files whose lanes are active or ready in the current segment.** Sol does not open a partition file it has not touched this segment.
3. A cross-partition `dependsOn` check that needs only a lane's `status` reads `lanesSummary` in the root index — no partition file read. Only when a cross-partition check needs a full lane record (rare) does Sol open the foreign partition file.

This strategy keeps per-segment I/O bounded: one root index read plus only the active-partition reads, regardless of total partition count.

---

## Write strategy and crash safety (FR-7, NFR-3)

Partition files are written atomically (`.tmp` + `mv`, per `lib/goal-state.md § Write protocol`). The write order is **load-bearing**:

1. Write all **touched partition files** first. Update each partition file's `lastWritten` timestamp.
2. Write the **root index last.** The root write carries the updated `partitionManifest` (with the matching `lastWritten` per partition), the refreshed `lanesSummary` for any lane whose `status` or `generation` changed, and the updated `signals[]` / `globalBudget`.

The root index is the **commit point.** If Sol crashes before the root write, the manifest still reflects the *previous* segment's timestamps — the stale-partition detection on resume detects the mismatch. If Sol crashes after a partition write but before the root write, the partition file is ahead of the manifest: that discrepancy is the stale signal.

---

## Mutate protocol

Read root → read needed partitions → mutate in-memory → write touched partitions → write root last. In a single mutate cycle:

- Always refresh `lanesSummary` for any lane whose `status` or `generation` changed.
- Always update `lastUpdated` on the root index (consistent with the v2 mutate protocol in `lib/goal-state.md § Mutate protocol`).
- Batch all mutations within one step into a single read-mutate-write cycle — same discipline as the v2 protocol.

---

## Stale-partition detection (FR-7, NFR-3) {#stale-partition-detection}

On resume of a partitioned run (root index carries `partitionManifest`):

1. For each entry in `partitionManifest`, read the corresponding partition file's `lastWritten` field.
2. **Match** — partition file's `lastWritten` equals the manifest's recorded `lastWritten` for that partition → the partition is current.
3. **Mismatch** — partition file's `lastWritten` is older than, or absent versus, the manifest record → the partition is **potentially stale** (the crash occurred after that partition was meant to be written but before the root index committed, or the file was partially written).

A potentially-stale or missing partition surfaces as a **`needs-human` gate**: append `"partition epic-N may be stale; confirm before resuming"` to `pendingHumanReport`. Sol does **not** auto-repair — the correct action depends on what the crashed segment accomplished, which Sol cannot infer (NFR-3). This mirrors v2's corruption-recovery bias (surface, let the human choose) — see `lib/goal-state.md § Corruption recovery`.

**`.tmp` partition files:** a `conductor-state.epic-N.json.tmp` present without its canonical sibling follows the same stale-partition rule: surface as `needs-human`, do not auto-repair. Both `.tmp` and canonical present: read canonical, overwrite `.tmp` on next write (same as the single-file `.tmp` case).
