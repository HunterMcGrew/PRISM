---
Number: 0052
Title: Conductor — Greenfield Decompose Extends the Reconcile Primitive; the Ratification Gate Is the Breadth Gate's Human Review
Status: accepted
Date: 2026-06-14
---

## Context

Phase A built the between-segment reconcile-delta primitive (`.prism/skills/prism-conductor/lib/reconcile.md`) once, deliberately, so later phases reuse it rather than fork it ([ADR-0050](./0050-conductor-growth-loop-and-convergence-governor.md)). Phase B's second half adds greenfield mode: Sol takes a PRD plus an architecture document and conducts a Parker→Winston→Nora chain that turns them into a ratifiable epic→issue→ticket tree, then dispatches it. Two architectural questions had to be settled together, because the answer to each shapes the other (`.prism/plans/epic-sol-conductor-phase-b.md`, Decisions B-A6 and B-A4).

**First, how the chain's tree output enters the lane set.** The Phase A primitive handles *flat* discovery signals → candidate lanes. A planned ticket tree carries internal `parentId` structure the flat path doesn't model, and the whole tree must land at `generation: 0` regardless of depth — which the flat path's `parent.generation + 1` formula would get wrong (it would assign growing generations down the tree, falsely tripping the governor's generation cap; see [ADR-0051](./0051-conductor-tree-dispatch-semantics.md)).

**Second, how the planned tree interacts with the breadth gate.** The breadth gate (default 12) exists to surface a large *single-reconcile expansion* to a human before auto-dispatch ([ADR-0050](./0050-conductor-growth-loop-and-convergence-governor.md), brake 3). A large planned tree — say 30 tickets — dispatched after ratification could appear to bypass the gate built to stop runaway growth. The worry is a loophole; the resolution has to close it under *every* autonomy policy.

Alternatives considered, reconcile path: **(A)** reuse the primitive unmodified — forces the tree through the flat path, losing parent pointers and mis-assigning generation. **(B)** fork a tree-specific reconcile primitive — duplicates dedup/registry logic and breaks the reuse-once contract (NFR-3). **(C)** additive extension — one new input-shape path on the existing primitive. Alternatives considered, breadth gate: **(A)** apply the breadth gate to the planned tree too — double-gates a tree the operator already ratified. **(B)** exclude planned + ratified trees unconditionally — clean at internal/launch, but at `hobby` there is no ratification gate, so a huge tree auto-dispatches ungated. **(C)** exclude planned + ratified, keep the breadth gate armed for planned + auto-dispatched (`hobby`) trees as the backstop.

## Decision

**Greenfield decompose extends the reconcile primitive additively; it does not fork it.** When the emitted delta carries `parentId` pointers — the chain's tree output, not flat discovery signals — the reconcile pass preserves the pointers into the candidate lanes and assigns `generation: 0` to every lane in the planned tree regardless of depth. It does not compute `parent.generation + 1` for planned-tree lanes; that formula applies only to discovered lineage. The flat-signal path (Phase A discovery) is untouched — the tree path is a second input shape the same primitive handles, and structural dedup at the door still runs on the tree's leaf lanes the same way it runs on flat signals. The primitive's contract is unchanged: input is emitted work, output is a lane delta plus updated registry.

**The chain is Parker→Winston→Nora, sequential, run as a conducted segment.** Parker emits epic lanes (initiative grain), Winston emits issue lanes (architecture grain, each `parentId` → its epic), Nora writes ticket lanes (leaf lanes, DoR-draft, each `parentId` → its issue). The chain reuses the decision-box crash-safety pattern — Sol writes goal-state after each chain step returns and resumes from the last written step, never re-running a completed step. A mid-chain `needs-human` return is the existing gate-routing, not a new state machine.

**The ratification gate is the human review the breadth gate exists to force.** After the chain completes, Sol surfaces the generated tree to the operator using the same tree-render the end-of-run report uses. Gate behavior is autonomy-policy-driven (config seam, NFR-5): at `internal`/`launch` the gate is `needs-human` — no dispatch proceeds until the operator approves; at `hobby` the tree auto-dispatches. Because ratification already is the human look the breadth gate wants, a *ratified* planned tree is **excluded from the breadth gate** — applying it again is redundant double-gating, not a second safeguard. The loophole guard: at `hobby` there is no ratification gate, so the breadth gate **does** apply to the planned tree as the backstop. The three cases:

- **Planned + ratified** (internal/launch) → breadth gate skipped; ratification is the gate.
- **Planned + auto-dispatched** (`hobby`) → breadth gate applies as the backstop.
- **Unplanned discovery** → breadth gate always applies (Phase A behavior, unchanged).

Under every policy a large planned tree faces exactly one human gate — never zero, never two.

## Consequences

- **Positive:** A diff against the Phase A primitive shows the flat path unchanged and no duplicated registry/dedup logic, so the reuse-once success metric (SM-5, NFR-3) holds. The extension is the minimum that preserves the seam — Phase C's `dependsOn`-sequenced lanes become a third input shape on the same primitive without touching Phase B's path. The breadth-gate resolution preserves the "planned + ratified vs. unplanned discovery" distinction the PRD calls load-bearing while guaranteeing exactly one human gate per large tree under any autonomy policy. Reusing the report's tree-render as the ratification artifact means one render format serves both surfaces.
- **Negative:** The reconcile primitive now has two input shapes behind one contract — a reader has to know that `parentId`-bearing deltas take the planned-tree path (gen 0, pointers preserved) and flat deltas take the discovery path (`parent.generation + 1`), and a future third shape must stay additive or the seam erodes. The breadth-gate exclusion is a conditional a reviewer has to verify holds in all three cases; getting the `hobby` backstop wrong silently reopens the loophole, which is exactly the failure the guard exists to prevent.
- **Neutral:** No schema change — `parentId`, `generation`, `scope`, and `pendingTicketCommit` all already ship in `goal-state` v2; greenfield mode drives them as logic. The chain runs as a single conducted segment one level deep (no nesting, NFR-4), consistent with the one-Sol-per-run invariant ([ADR-0049](./0049-conductor-teams-are-lane-groups.md)). The chain-persona mapping, the auto-dispatch threshold, and the breadth-gate-vs-planned-tree interaction are config-driven, not hardcoded.

## References

- `.prism/plans/epic-sol-conductor-phase-b.md` § Decisions B-A6 (reconcile extension) and B-A4 (ratification-gate / breadth-gate interaction) — co-located here as one ADR; also B-A2, B-A3, B-A7 for the chain ordering, ratification artifact, and crash-safety pattern
- `.prism/prds/sol-conductor-phase-b-hierarchy.md` — the Phase B PRD (FR-4, FR-5, FR-6; NFR-3, NFR-4, NFR-5)
- [ADR-0050](./0050-conductor-growth-loop-and-convergence-governor.md) — the reconcile-delta primitive this extends and the breadth gate this gate's review satisfies
- [ADR-0051](./0051-conductor-tree-dispatch-semantics.md) — the gen-0-planned-tree rule the reconcile extension assigns and the tree dispatch model the ratified tree feeds
- [ADR-0049](./0049-conductor-teams-are-lane-groups.md) — the one-Sol-per-run invariant the one-level conducted segment respects
- `.prism/skills/prism-conductor/lib/reconcile.md`, `lib/greenfield-decompose.md`, `step-02-decompose.md`, `lib/convergence.md`, `step-10-report.md` — the reconcile extension, the chain and ratification-gate procedure, the greenfield mode wiring, the breadth gate cited, and the shared tree-render
