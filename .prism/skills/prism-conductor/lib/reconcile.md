# Conductor reconcile-delta primitive

Reusable between-segment procedure. `step-09-reconcile.md` cites this doc; do not restate its content there. The same primitive drives the v1 discovery loop and will drive greenfield specs→ticket-tree decompose in Phases B/C/D — build once, reuse by citation.

The registry is the live `signals[]` + `lanes[]` in goal-state (`lib/goal-state.md`). It is the single record of everything found and in-flight across the run.

## Procedure

### 1. Read the registry

Open goal-state and load `signals[]` and `lanes[]`. Identify all signals whose `processedAt` is `null` — these are unprocessed signals pending reconciliation this segment.

**Under the partitioned layout (v3):** the `signals[]` registry is read from the **root index** only — never from individual partition files. The registry lives exclusively in the root index (`lib/goal-state.md § Schema (v3)`, `lib/partition-store.md`), so a signal emitted by a lane in partition P1 is immediately visible to dedup logic checking partition P2. The registry is run-wide by construction; no per-partition registry exists.

### 2. Structural dedup at the door

For each unprocessed signal, match its `target` against existing registry entries (both in-flight and already-disposed signals) by structural identity. Under the partitioned layout, signals from all partitions are compared against the same run-wide registry — dedup is run-wide because the registry is root-level, never per-partition (FR-4, D-A4). A signal deduped in segment 1 (partition P1) is never re-dispatched in segment 2 (partition P2) because the registry spans all partitions.

- **Primary match:** same `target.file` AND same `target.symbol` (when non-null).
- **Secondary match (any one):** same `target.scopeSlug`, or same `target.errorSignature` (when non-null).
- **No match:** the signal is a distinct candidate.

On a match, **attach** the later signal to the first registry entry: set `processedAt` to now, link it to the existing decision unit. Do not re-dispatch a decision box for the duplicate — one decision unit per distinct `target`.

**Sol dedups structurally only.** A structurally-ambiguous "same issue?" call — where `target` fields don't yield a clear match — routes to Nora, never decided by Sol.

### 3. Compute the lane delta

Count the distinct unprocessed targets that survived dedup. These are the candidate new lanes for the next segment. Each candidate target will run through the decision box (`lib/decision-box.md`) before dispatch is authorized.

### 4. Write the registry update

Per the mutate protocol in `lib/goal-state.md`: read → mutate in-memory → atomic write. Update `lastUpdated`. Set `processedAt` on all signals handled in this reconcile pass.

## Tree-shaped delta (Phase B)

The primitive's contract is unchanged — input is emitted work, output is a lane delta + updated registry.

When the emitted delta carries `parentId` pointers (the greenfield decompose chain's output, not flat discovery signals), the reconcile pass **preserves the pointers** into the candidate lanes and **assigns `generation: 0` to every lane in the planned tree** regardless of depth. It does **not** compute `parent.generation + 1` for planned-tree lanes — that formula applies only to *discovered* lineage.

This is an **additive extension to the existing primitive, not a fork** (NFR-3). The flat-signal path (Phase A discovery) is untouched; the tree path is a second input shape the same primitive handles. A diff against the Phase A primitive shows the flat path unchanged — the success metric "no duplicate logic" holds.

Structural dedup at the door still runs on the tree's leaf lanes the same way it runs on flat signals.

## Reuse contract

This primitive is called at every segment boundary. It is not specific to the discovery loop:

- **v1 (Phase A):** reconciles discovered-work signals from worker lanes.
- **Phase B:** reconciles greenfield specs→ticket decompose output into candidate lanes — see § Tree-shaped delta above.
- **Phase C:** reconciles cross-team dependency signals into sequenced lanes.

The input is always `signals[]` + `lanes[]` in goal-state; the output is always a lane delta (distinct candidates) and an updated registry. The calling step applies the convergence governor (`lib/convergence.md`) to decide which candidates auto-dispatch vs. park.

## Field notes

- **Registry size cap:** the root registry has no size cap in v1 (D-A4 default path). At the ~100-lane scale ceiling (D-A6), structural dedup keeps the registry in the low hundreds — a JSON array of small objects, cheap to parse. A cap/prune mechanism (archiving `processedAt`-old entries out of the hot registry) is a named future refinement; it is not implemented in v1. The registry location (`lib/partition-store.md`) ensures the root read pays this cost once per segment boundary, not once per partition.

## Cross-references

- `lib/goal-state.md` — registry schema (`signals[]` + `lanes[]`), mutate protocol.
- `lib/fleet.md` — the conflict gate uses the same file-overlap class of check; structural dedup here is the registry-level analogue.
- `lib/decision-box.md` — each distinct deduped target runs through the decision box before a new lane is dispatched.
- `lib/convergence.md` — the governor that decides which delta lanes auto-dispatch after the decision box clears them.
