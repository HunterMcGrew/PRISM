---
slug: sol-conductor-phase-c-teams
title: "Sol conductor Phase C: teams as lane-groups + cross-team seam + integration gate"
mode: greenfield
stakes: internal
status: finalized
created: 2026-06-14T00:00:00Z
lastEdited: 2026-06-14T00:00:00Z
stepsCompleted: ["step-01-init", "greenfield-step-02-stakes", "greenfield-step-03-mode", "greenfield-step-04-draft", "greenfield-step-05-decision-log", "step-06-review", "step-07-finalize"]
linearInitiativeId: null
---

## Initiative description

Phase C is the third phase of the Sol product-lead conductor initiative. Phase A (shipped, merged) closed the discovery loop and built the reconcile-delta primitive. Phase B (scoped, depends on A) turns on epic→issue→ticket tree semantics and greenfield specs→ticket-tree decompose. Phase C activates the two schema fields that have shipped as nullable-provisional since v1 — `team` and `dependsOn` — making them **load-bearing**: named teams as lane-groups under the single conductor, cross-team dependency sequencing, and an integration gate where two teams' work meets and is tested together.

The team model is a resolved architectural decision (ADR-0049): a "team" is **data on the flat `lanes[]`, not a control structure**. Sol stays the single conductor. Phase C implements this decision; it does not re-examine it.

Sourced from §2 net-new items 3 and 4, §7.1, §7.11, and brief Q4/Q8 of [`sol-product-lead-vision-brief.md`](../plans/sol-product-lead-vision-brief.md), the Phase A PRD at [`.prism/prds/sol-product-lead-conductor.md`](./sol-product-lead-conductor.md), the Phase B PRD at [`.prism/prds/sol-conductor-phase-b-hierarchy.md`](./sol-conductor-phase-b-hierarchy.md), and ADR-0049.

---

## Problem statement

Phase A and B give Sol a self-growing fleet with a tree-structured work graph. But every lane in that fleet is still homogeneous — there is no concept of specialization. A backend lane and a frontend lane look identical to Sol: both are dispatched, both can fail, both report back. Sol cannot express "these four lanes build the API; those three lanes build the UI on top of it" — and it cannot enforce "the UI work cannot start until the API contract exists."

**The team problem.** Real product work is built by specialized groups in parallel. A backend team and a frontend team often work simultaneously, each with their own queue and (possibly) their own model tier preferences. Today Sol has no way to group lanes by specialization, no way to label a lane as belonging to a named team, and no way to route a discovered-work signal to the team that owns it rather than the next available lane slot.

**The sequencing problem.** Some lanes have cross-team dependencies that are not file-overlap conflicts: a frontend lane that reads an API type must wait for the backend lane that writes it, even if those lanes touch different files entirely. Today the only cross-lane gate Sol has is the file-conflict gate, which serializes lanes that touch the same files. A lane that depends on another team's *output* (a contract, a schema, a published endpoint) has no mechanism to block on it.

**The integration gate problem.** When two teams' work converges — the API is written, the UI is built, and now they must be tested *together* — Sol has no phase for that joint verification. The conflict gate merges worktrees; it does not test the seam. There is no "integration lane" concept that waits for multiple upstreams and then validates the combined result.

**Why now.** Phase B's tree semantics and `parentId` are the enabling structure — an integration lane is a leaf lane whose `dependsOn` points at lanes in two different teams. Phase B must be on main before Phase C can build on it. The `team` and `dependsOn` fields have shipped nullable since v1 precisely so Phase C can activate them without a schema change.

---

## Target users

- **PRISM operators running multi-team work (primary).** Developers who want to give Sol a goal that spans backend and frontend (or any two specialized groups) and have Sol organize, sequence, and gate the work without manually serializing lanes or running separate runs per team. Today they must either hand-sequence everything or run separate Sol invocations and manually stitch the outputs.
- **The run owner / human gate.** Whoever reviews the integration gate when two teams' work converges. They need the integration gate to be a distinct, legible checkpoint — not buried in the file-conflict gate — with a clear report of what each team produced and what the integration lane is verifying.
- **The PRISM personas, as parties to the run-control contract.** Clove/Briar/Eric/Sasha (emitting signals tagged with their team), Nora (creating tickets that belong to a named team), Winston (reading team groupings when evaluating blast-radius; possibly owning the integration lane). Their interaction with Sol changes when lanes carry `team` and `dependsOn`.
- **Future PRISM-consuming teams (secondary).** They inherit the `team`-driven `goal-state` and the integration gate concept. Team names, model tiers, and integration gate behavior must be config-driven, not hardcoded.

---

## Success metrics

How we'll know Phase C solved the problem — observable from the end-of-run report and `goal-state` inspection:

- **Teams are legible.** The end-of-run report shows per-team progress — lanes grouped by `team`, with per-team status and discovered-work counts. An operator can read "backend: 5 done, 1 parked; frontend: 3 done, 0 parked" without parsing a flat list.
- **Cross-team sequencing holds.** A frontend lane with `dependsOn: [backend-api-lane]` does not dispatch until the backend lane it depends on reaches `done`. Zero lanes in any completed run dispatch against an unresolved dependency.
- **The integration gate fires and is distinct.** A lane with multiple `dependsOn` edges pointing at lanes in different teams triggers a human gate before dispatch — not the file-conflict gate, a separate, named integration checkpoint. The end-of-run report distinguishes integration gates from file-conflict gates.
- **Per-team discovered-work routing is correct.** A signal emitted by a lane tagged `team: backend` is routed to the Nora decision step with the team context; the resulting ticket (if created) inherits `team: backend`. No signal is silently stripped of its team tag.
- **The autonomy ceiling holds, per-team or run-wide.** [ASSUMPTION-3] — see Open questions. Whatever granularity resolves, no team's lanes auto-commit above the ceiling set for that team (or the run-wide ceiling if per-team is not implemented in Phase C).

These are outcome statements at initiative grain. Reese and Briar derive the verifiable checklist downstream.

---

## Scope

### In scope (Phase C)

- **Drive the `team` field.** A lane can be assigned `team: "backend"` or `team: "frontend"` (or any named string). Sol reads this field and uses it for per-team grouping in scheduling, reporting, and discovered-work routing. The `team` field already ships nullable in v1; Phase C makes it meaningful.
  - **Per-team queue management.** Sol maintains a logical per-team queue within the single conductor: lanes tagged with the same `team` share a logical ordering, and Sol dispatches them within the concurrency cap as slots open. No sub-conductors; no separate scheduler per team — the single conductor does this with existing lane scheduling logic.
  - **Per-team reporting.** The end-of-run report groups lanes by `team` and surfaces per-team progress (dispatched, done, parked, discovered) alongside the existing flat-list view.
  - **Per-team model tier configuration.** [ASSUMPTION-1] — see Open questions. Whether a named team can specify a preferred model tier (e.g., backend uses a larger model) is a configurable seam; the default is the run-wide model setting.
  - **Discovered-work team propagation.** A signal emitted by a lane with `team: "backend"` carries that tag into the Nora decision step. The resulting lane (fold-in or new ticket) inherits the team tag. Sol does not reassign team tags; only the operator or the decompose chain sets them.

- **Drive `dependsOn`.** A lane can declare `dependsOn: [laneId, laneId, ...]` to express that it must not dispatch until every named lane has reached `done`. Sol enforces this at dispatch time.
  - **Cross-team dependency sequencing.** The primary use case: `team: "frontend"` lanes depend on specific `team: "backend"` lanes. Sol blocks the dependent lane at dispatch until the dependency is resolved.
  - **Same-team dependency sequencing.** `dependsOn` is not restricted to cross-team edges; same-team edges are also valid and enforced by the same logic.
  - **Dependency resolution is status-based.** A dependency is resolved when the target lane reaches `done`. A `parked` lane is not resolved — a lane waiting on a parked dependency surfaces to the human gate rather than blocking silently. [ASSUMPTION-2]
  - **`dependsOn` is flat (laneId references), not recursive.** The edges form a directed acyclic graph over the flat `lanes[]`. Cycle detection is a constraint the implementation must enforce; cycles are a `needs-human` escalation, not a silent failure.

- **The integration gate.** A lane whose `dependsOn` spans **multiple teams** (i.e., at least one edge crosses a team boundary) and whose `type` or `role` is `integration` triggers a human gate before it dispatches, distinct from the file-conflict gate.
  - **What triggers it.** A lane tagged `type: "integration"` (or an equivalent role marker — [ASSUMPTION-4]) with `dependsOn` edges pointing at lanes in two or more distinct teams. A same-team lane with multiple `dependsOn` edges does not trigger the integration gate.
  - **What the gate surfaces.** A summary of what each upstream team produced: per-team completed lanes, any `parked` dependencies, the integration lane's scope statement, and a prompt for the operator to approve or escalate. The integration gate does not auto-approve at any autonomy level — it is always a `needs-human` gate. [ASSUMPTION-5]
  - **Who owns the integration lane.** The integration lane is a conductor-dispatched lane like any other; the persona it dispatches depends on its scope (Briar for a review-and-test pass, a QA persona if Reese is available, or Winston for a seam-architecture check). [ASSUMPTION-4] The integration lane's scope statement names what it validates.
  - **Relationship to the file-conflict gate.** The file-conflict gate and the integration gate are distinct phases. The file-conflict gate serializes lanes that touch the same files (existing behavior, unchanged). The integration gate gates on cross-team work convergence, independent of file overlap.
  - **Integration gate in the lifecycle.** The integration gate fires after all `dependsOn` lanes are `done` and before the integration lane dispatches. It is a pre-dispatch gate for the integration lane, not a post-dispatch report.

- **Per-team autonomy granularity.** [ASSUMPTION-3] — see Open questions. Phase C's default is run-wide autonomy (one ceiling for all teams). The infrastructure for per-team autonomy overrides is a configurable seam that Phase C introduces but may not fully populate.

### Out of scope (later phases — named, not built)

- **Phase D — Scale: batching + state partitioning.** Phase C must work within the single `goal-state` file and the ~12 concurrency cap. Batching a multi-team run that exceeds the cap, and partitioning `goal-state` when it grows beyond single-file practicality, are Phase D concerns.
- **Discovery-rate decay** as a productive-vs-runaway convergence signal — a later refinement.
- **Phase B's tree semantics.** Phase C builds on top of Phase B's `parentId`-driven epic→issue→ticket tree. Phase C does not redefine or extend tree semantics; the B/C boundary is clear: tree = B, teams + seam = C.

### Won't this time

- **Sub-conductors / nested Sol.** Permanently rejected on runtime grounds (ADR-0049). The Workflow engine forbids nesting deeper than one level; a nested workflow shares the parent's concurrency cap, agent counter, and budget — zero throughput gain, structurally blocked. One Sol per run, always. This is not a Phase D deferral; it is a standing invariant.
- **Sol making semantic judgments about team membership.** Sol reads the `team` field; it does not decide which team a lane belongs to. Team assignment comes from the operator at run start, from the decompose chain (Parker/Winston/Nora), or from the discovered-work routing rule (inherited from the emitting lane). Sol never reassigns.
- **Auto-merge at any scale or team count.** Merge stays the one unconditional human gate (ADR-0011). Integration gates surface to a human; they never auto-clear.
- **Integration gate as a test executor.** The integration gate is a human checkpoint and a dispatch gate for an integration lane. The integration *lane* may run tests; the gate itself does not. Sol does not execute tests at the gate boundary.

---

## User journeys

**1. Backend team builds the API; frontend team builds on it.** An operator starts a run with eight lanes: four tagged `team: "backend"` (API endpoints, schema, tests), four tagged `team: "frontend"` (components, pages, integration). The frontend lanes each carry `dependsOn: [backend-schema-lane]`. Sol dispatches all four backend lanes immediately (within the concurrency cap). The frontend lanes are held — their dependency is not `done`. Backend lanes complete. Sol resolves the `dependsOn` edges and dispatches the frontend lanes. The end-of-run report shows two team columns; the operator sees which team finished first and which lanes were blocked by cross-team dependencies.

**2. Integration gate fires.** After all backend and frontend lanes are `done`, one remaining lane — `type: "integration"`, `dependsOn: [backend-api-lane, frontend-page-lane]` — becomes eligible. Sol detects the cross-team `dependsOn` edges and triggers the integration gate before dispatching. The gate surfaces a summary: backend produced the `/api/items` endpoint and schema; frontend produced the `ItemsPage` component consuming that endpoint. The operator reviews, approves, and Sol dispatches the integration lane (Briar runs a seam-level review and test pass). The integration lane completes; the run ends.

**3. A dependency lands parked, not done.** A frontend lane is waiting on a backend lane that parks (`needs-human` escalation). The frontend lane's `dependsOn` edge is not resolved. Sol does not silently drop the frontend lane into a stall — it surfaces the blocked dependency at the human gate alongside the parked backend lane's escalation. The operator resolves the backend lane's escalation; it resumes and reaches `done`; the frontend lane unblocks and dispatches.

**4. Discovered work inherits team tag.** A Clove lane tagged `team: "backend"` finds a bug outside its local frame and emits `found-bug` with a structured target. At the segment boundary Sol reconciles: the signal carries `team: "backend"` from the emitting lane. Nora's decision step receives the signal with its team tag. If a new lane is created, it inherits `team: "backend"`. The backend team's discovered-work count in the end-of-run report includes this signal.

**5. Dependency cycle detected.** A decompose chain (or an operator) writes lanes where lane A `dependsOn` lane B and lane B `dependsOn` lane A. Sol's pre-dispatch cycle check catches this and escalates to the human gate with a description of the cycle. No lane is dispatched until the cycle is resolved (the operator removes one edge or splits the work). Sol does not deadlock; the cycle is a `needs-human` escalation, not a silent hang.

**6. Large multi-team run hits the concurrency cap.** An operator starts a run with 20 lanes across three teams. The cap is ~12. Sol dispatches the first 12 eligible lanes (respecting `dependsOn` ordering) and holds the rest. As lanes complete, Sol dispatches from the held set in team-queue order. The run behaves correctly — no batching, no partitioning (Phase D), but teams are visibly legible in the per-segment dispatch order. The operator can observe which team is cap-bound and why.

---

## Requirements

### Functional

- **FR-1 — Drive `team` at dispatch.** Sol reads `team: string | null` on each lane and uses it for per-team queue management within the single conductor's dispatch loop. Lanes with the same `team` share a logical ordering; Sol dispatches them as concurrency slots open, interleaved with other teams. The dispatch logic does not change the concurrency cap or the conflict gate; it adds team-aware ordering to the existing slot-fill algorithm.
- **FR-2 — `dependsOn` enforcement.** Sol enforces `dependsOn: laneId[]` at each dispatch decision: a lane is not eligible for dispatch until every lane in its `dependsOn` list has reached `done`. Sol checks this condition at each segment boundary; it does not re-check mid-segment.
- **FR-3 — Parked dependency escalation.** A lane whose `dependsOn` list includes a lane that is `parked` (not `done`) surfaces to the human gate alongside the parked lane's escalation reason. Sol does not silently stall a dependent lane; it surfaces the blocked dependency.
- **FR-4 — Cycle detection.** Sol runs a cycle check over the `dependsOn` graph at each reconcile boundary. A detected cycle (lane A → lane B → lane A, or any length) is a `needs-human` escalation with a description of the cycle. No lane in the cycle is dispatched until the cycle is resolved.
- **FR-5 — Integration gate trigger.** A lane whose `dependsOn` edges span two or more distinct `team` values (i.e., cross-team `dependsOn`) and which carries a designated integration marker [ASSUMPTION-4] triggers a pre-dispatch human gate before it is dispatched. This is a `needs-human` gate at all autonomy levels — no auto-clear. [ASSUMPTION-5]
- **FR-6 — Integration gate report.** When the integration gate fires, Sol surfaces: (a) per-team summary of completed `dependsOn` lanes (lane ID, scope statement, termination reason), (b) any `dependsOn` lanes that are `parked` rather than `done`, (c) the integration lane's scope statement, and (d) a prompt for the operator to approve dispatch or escalate. The report distinguishes this gate from file-conflict gate reports.
- **FR-7 — Team tag propagation in discovered-work routing.** A signal emitted by a lane with a non-null `team` carries that `team` value through the Nora decision step. A resulting new lane (fold-in or new ticket) inherits the `team` value from the emitting lane unless the operator or decompose chain explicitly overrides it. Sol does not strip or reassign team tags.
- **FR-8 — Per-team reporting in the end-of-run report.** The end-of-run report surfaces a per-team view: for each distinct `team` value, the count of lanes dispatched, done, parked, and discovered. This is additive to the existing flat-list and (Phase B) tree-structured views — all three views appear in the report.
- **FR-9 — `dependsOn` is a DAG over the flat list.** The implementation treats `dependsOn` edges as a directed acyclic graph over `lanes[]`. The graph is not nested; it is a flat reference structure. Sol's cycle check and dispatch ordering operate on this graph. Depth of the DAG is unbounded by Phase C (a chain A→B→C→D is valid); throughput is bounded by the concurrency cap and budget, not by DAG depth.
- **FR-10 — No schema change required.** `team` and `dependsOn` ship in the v1 schema as nullable. Phase C is a logic change — it drives these fields — not a schema change. Old runs (with null `team` and empty `dependsOn`) still parse and dispatch identically to before.

### Non-functional

- **NFR-1 — Invariants preserved.** All Phase A and B NFRs carry forward unchanged. Sol dispatches, never does (writes only `goal-state` + chat). The plan is the content bus; `goal-state` is run-control (ADR-0001). Merge is the one unconditional human gate (ADR-0011). Autonomy is a human-set ceiling (ADR-0048). One Sol per run, always (ADR-0049).
- **NFR-2 — Non-breaking.** Phase C extends Phases A and B additively. Runs with null `team` and empty `dependsOn` (Phase A and B runs) dispatch identically; Phase C logic is activated only when those fields are non-null/non-empty. No migration step.
- **NFR-3 — Single conductor, single scheduler.** Per-team queue management is an ordering layer on top of the existing single-conductor dispatch loop, not a second scheduler. The concurrency cap, conflict gate, and budget are all shared, unchanged resources. There is exactly one scheduling decision point per slot: the conductor's existing dispatch loop, extended with team-queue ordering and `dependsOn` blocking.
- **NFR-4 — Integration gate is always `needs-human`.** At no autonomy level does the integration gate auto-clear. The gate is a cross-team convergence checkpoint, not a routine gate that confidence can satisfy. This is a categorical distinction from the confidence-gated autonomy pattern (ADR-0048), which applies to within-lane decisions.
- **NFR-5 — Config-driven seams.** Team names are operator-defined strings (not hardcoded values). The integration gate trigger condition (the integration marker — [ASSUMPTION-4]), per-team model tier configuration ([ASSUMPTION-1]), and per-team autonomy overrides ([ASSUMPTION-3]) are configurable seams, not Thrive-hardcoded.
- **NFR-6 — Lives within Workflow-engine limits.** No design element in Phase C introduces nesting, a second budget, or a second concurrency counter. The Workflow engine's one-level nesting limit and ~12 concurrency cap are binding; team grouping and `dependsOn` ordering are data transforms on the flat lane list, not structural changes to the engine topology.

---

## Constraints

- **Phase B must ship first.** Phase C's integration gate is a lane with `dependsOn` edges across teams. That lane is a leaf in the epic→issue→ticket tree that Phase B introduces. The `parentId`-driven tree is the structural substrate that integration lanes live in. Phase C cannot be built against a Phase B-absent codebase.
- **Workflow engine (technical, hard — same as Phase A/B).** One-level nesting only. Shared concurrency cap (~12), agent counter, and budget per run. These are the same constraints that forced the lane-groups model (ADR-0049) and the between-segment reconcile. Phase C does not relax or work around them.
- **Single `goal-state` file.** Run-control is one file. Multi-team runs with dozens of lanes will stress the single-file model; Phase C must work within it. Partitioning is Phase D.
- **ADR-0049 is not re-examined.** Teams are data, not control structures. Sub-conductors are rejected on runtime grounds and are a standing invariant, not deferred scope. Phase C implements the accepted decision.
- **`dependsOn` is nullable-provisional until Phase C.** The field ships in v1 and v2 as nullable. Phase C is the first phase that reads and enforces it. Runs from Phase A or B that happen to set `dependsOn` to a non-null value (a misconfiguration) are handled by the cycle check and parked-dependency escalation paths in FR-3 and FR-4.
- **Tracker-agnostic scope.** Phase C scopes at initiative grain, tracker-agnostically. Thrive consumers use Linear; PRISM's dogfood uses GitHub issues. The `team` tag is a `goal-state` field; which tracker system Nora writes to is Nora's execution concern.

---

## Open questions

- **[ASSUMPTION-1] — Per-team model tier configuration.** The vision brief (§2, item 3) names "possibly its own model tiers" for each team. Whether Phase C ships per-team model tier preferences (e.g., `backend` uses a larger model) or defers them is unresolved. *Default path (used until resolved):* per-team model tier is a configurable seam that Phase C introduces as a nullable `modelTier: string | null` field on the team config, defaulting to the run-wide model setting. Phase C ships the seam; the behavior when populated is implemented. *Resolve with Winston:* confirm whether the model-tier seam belongs in `goal-state` (a run-control concern) or in a separate team-config manifest, and whether the Workflow engine's agent dispatch supports per-agent model overrides.

- **[ASSUMPTION-2] — Parked dependency behavior.** When a `dependsOn` target lane is `parked` (not `done`), the dependent lane is blocked. The PRD specifies this surfaces to the human gate alongside the parked lane's escalation. *Default path (used until resolved):* implement the blocked-dependency human gate co-presentation as described in FR-3. *Resolve with Winston:* confirm whether the blocked dependent lane should itself carry a `status: "dependency-blocked"` state distinct from `pending`, or whether `pending` + a blocked-dependency flag on the lane is sufficient for the end-of-run report and crash-safety.

- **[ASSUMPTION-3] — Per-team autonomy granularity (brief Q8).** The vision brief asks whether teams need their own autonomy ceilings (e.g., backend on `hobby`, a risky frontend lane on `internal`) or whether one run-wide policy suffices. ADR-0049 dissolves the brief's Q8 as a sub-conductor concern — there is one run-wide budget and one autonomy ceiling — but the question of per-team *overrides* to the run-wide ceiling remains open. *Default path (used until resolved):* one run-wide autonomy ceiling for Phase C; no per-team override. The integration gate is always `needs-human` regardless of the ceiling (NFR-4), which is the most critical autonomy constraint. *Resolve with Winston:* confirm whether per-team overrides are a Phase C requirement or a Phase D concern, and whether implementing them requires changes to the `goal-state` schema beyond adding a `teamConfig[]` entry.

- **[ASSUMPTION-4] — Integration lane marker and persona ownership.** The PRD specifies a "designated integration marker" on a lane to trigger the integration gate. The exact mechanism (a `type: "integration"` field, a `role` field, or a named lane convention) and the persona that owns integration lanes (Briar for a test/review pass, Winston for an architecture-seam check, or a configurable mapping) are unresolved. *Default path (used until resolved):* implement a `type: "integration"` field on the lane, nullable, defaulting to null (non-integration behavior). A lane with `type: "integration"` and cross-team `dependsOn` triggers the integration gate. The integration lane's persona assignment follows the existing persona-assignment logic on any other lane (the scope statement names the persona). *Resolve with Winston:* confirm the field name, its schema placement, and whether a default integration-lane persona mapping belongs in the conductor config or is always explicit in the scope statement.

- **[ASSUMPTION-5] — Integration gate is always `needs-human`.** The PRD states the integration gate does not auto-clear at any autonomy level. This means even a `hobby`-stakes run must stop at the integration gate and wait for a human. This is a stronger constraint than the discovery-loop's `hobby` = autonomous behavior. *Default path (used until resolved):* integration gate is always `needs-human`, as specified in NFR-4. *Resolve with Hunter:* confirm whether `hobby`-stakes runs should be exempt from the always-human integration gate (i.e., `hobby` = auto-dispatch integration lanes without gate). If exempt, the gate behavior is `hobby` → auto-dispatch; `internal`/`launch` → `needs-human`. This is a policy decision, not a technical one, and it belongs to Hunter, not Winston.

---

## Stakeholders

- **Owner / decision-maker — Hunter.** Builds PRISM, sets direction, ratifies this PRD, clears the integration gate (NFR-4), and resolves [ASSUMPTION-5] (the `hobby`-stakes integration gate policy). Sets the autonomy ceiling per run; sets team names and `dependsOn` edges at run start (or delegates to the Phase B decompose chain).
- **Implementing personas.** Winston (Phase C epic plan, `dependsOn`-graph cycle detection, integration gate design, and resolution of [ASSUMPTION-1]/[ASSUMPTION-2]/[ASSUMPTION-3]/[ASSUMPTION-4]), Clove (implementation of team-aware dispatch, `dependsOn` enforcement, integration gate trigger and report), Nora (team-tag propagation in ticket creation), Briar/Eric (review), Sasha (debug emissions that carry team tags through the decision box).
- **Affected — future PRISM-consuming teams (SPC).** They inherit team-grouped `goal-state` and the integration gate. Config-driven seams for team names, model tiers, and integration-gate behavior must be tunable rather than hardcoded.
- **Sign-off.** Hunter ratifies scope, the integration gate policy ([ASSUMPTION-5]), and any ADRs that emerge from Winston's plan authoring. Merge sign-off is human and unconditional (ADR-0011) — never delegated to Sol.

---

## Decision log link

See [decision-log.md](./sol-conductor-phase-c-teams.decision-log.md).
