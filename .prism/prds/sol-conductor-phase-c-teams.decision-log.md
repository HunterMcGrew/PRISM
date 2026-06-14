# Decision log: sol-conductor-phase-c-teams

> Paired with [sol-conductor-phase-c-teams.md](./sol-conductor-phase-c-teams.md).
> Status: draft — awaiting Hunter's ratification gate.

## Scope decisions

### Team model: implement ADR-0049, do not re-litigate it

**Decision:** Phase C implements the accepted team model from ADR-0049 — teams are lane-groups (data on the flat `lanes[]`), not sub-conductors or control structures. Phase C activates the nullable `team` and `dependsOn` fields that shipped in v1; it does not introduce new schema fields for team structure.

**Reasoning:** ADR-0049 is accepted and runtime-grounded: the Workflow engine forbids nesting deeper than one level, and a nested workflow shares the parent's concurrency cap — zero throughput gain, structurally blocked. The brief's Q7 (nested budgets) and Q8 (per-team autonomy ceilings) dissolve under the lane-groups model: there is one run-wide budget and one autonomy ceiling. Phase C's job is implementation of this decision, not evaluation of alternatives.

**Status:** recorded at draft. No further action until Hunter ratifies.

---

### Phase B is a hard prerequisite

**Decision:** Phase C requires Phase B to be on main before any implementation begins. The integration gate (FR-5/FR-6) is a leaf lane whose `dependsOn` edges span teams — that lane lives in the epic→issue→ticket tree that Phase B introduces. Building Phase C against a Phase B-absent codebase would require reimplementing or stalling on tree semantics that Phase B owns.

**Reasoning:** The B/C boundary is clean by design: tree semantics (parentId-driven) = B; teams + cross-team seam = C. Phase C adds a new *kind* of edge (`dependsOn` cross-team) over the tree structure Phase B introduces. The dependency is one-directional and hard.

**Status:** recorded at draft. Delivery sequencing constraint in the PRD.

---

### Integration gate is always `needs-human` — open for Hunter on `hobby`-stakes

**Decision (draft):** The integration gate does not auto-clear at any autonomy level. This is a stronger constraint than the discovery-loop's `hobby` = autonomous behavior, and it is intentional: an integration gate represents two teams' work converging, which is a qualitatively different checkpoint than a within-lane confidence gate.

**Open:** [ASSUMPTION-5] — whether `hobby`-stakes runs should be exempt (auto-dispatch integration lanes without gate). This is a policy decision for Hunter, not a technical choice for Winston. The PRD defaults to always-`needs-human`; Hunter may relax for `hobby`.

---

### Cross-team `dependsOn` is the integration gate trigger, not file-overlap

**Decision:** The integration gate is triggered by a lane with `dependsOn` edges spanning two or more distinct `team` values (cross-team convergence), not by file overlap. The file-conflict gate (unchanged from Phase A) serializes lanes that touch the same files. These are two separate gate types: the file-conflict gate is automatic and within-conductor; the integration gate is `needs-human` and cross-team.

**Reasoning:** A cross-team integration may touch entirely different files (the API is in `/backend/`, the UI is in `/frontend/`) — no file overlap would trigger the conflict gate. The integration gate is about *semantic convergence* (the seam between two teams' outputs), not physical file contention.

**Status:** recorded at draft. Winston to confirm implementation doesn't conflate the two gate paths.

---

### `dependsOn` is a DAG — cycle detection is a hard requirement

**Decision:** `dependsOn` edges form a directed acyclic graph over the flat `lanes[]`. Cycles are a `needs-human` escalation, not a silent failure or a deadlock. Sol must run a cycle check at each reconcile boundary before dispatching any `dependsOn`-dependent lanes.

**Reasoning:** The alternative (silent stall) is the worst failure mode — an operator watching a run that never progresses with no explanation. Cycle detection at the dispatch layer is cheap; silent deadlock is expensive.

**Status:** recorded at draft. Implementation detail for Clove/Winston.

---

## Deferred decisions (for Winston's plan authoring)

The following open questions are formally deferred to Winston's Phase C plan authoring. Each has a default path in the PRD's `## Open questions` section; no implementation should proceed past the default path without Winston's explicit resolution.

| # | Open question | Default path |
|---|---------------|--------------|
| ASSUMPTION-1 | Per-team model tier configuration | Nullable `modelTier` seam on team config; defaults to run-wide model |
| ASSUMPTION-2 | Parked dependency state representation | `pending` + blocked-dependency flag on the lane; surfaces to human gate |
| ASSUMPTION-3 | Per-team autonomy overrides | One run-wide ceiling for Phase C; per-team overrides deferred to Phase D consideration |
| ASSUMPTION-4 | Integration lane marker and persona ownership | `type: "integration"` field; persona from scope statement |
| ASSUMPTION-5 | Integration gate `hobby`-stakes policy | Always `needs-human`; Hunter decides whether `hobby` is exempt |
