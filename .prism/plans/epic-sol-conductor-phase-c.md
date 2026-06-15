# Plan: epic-sol-conductor-phase-c

> Closed: 2026-06-15

## Ticket

<Linear/GitHub epic ID — placeholder; Nora opens the epic + child issues downstream>

PRD: [`.prism/prds/sol-conductor-phase-c-teams.md`](../prds/sol-conductor-phase-c-teams.md) (status: finalized)

---

## Goal

Activate the `team` and `dependsOn` schema fields as load-bearing run-control — named teams as lane-groups under the single conductor, cross-team dependency sequencing, and an always-human integration gate — implementing ADR-0049 without re-litigating it and without a schema change.

---

## Build dependency (ordering)

**Phase C builds on Phase B being on `main`.** The integration gate is a leaf lane in Phase B's `parentId`-driven epic→issue→ticket tree whose `dependsOn` edges cross teams. Phase C cannot be built against a Phase B-absent codebase. **Build order: Phase C is built and merged second, after Phase B.** This plan is authored now (in parallel with Phase B's) but its implementation is gated on Phase B's merge — Clove does not start Phase C dispatch until Phase B is on `main`.

The B/C boundary is clean and must stay clean:
- **Tree semantics (`parentId` read/drive, greenfield decompose, parent-lane hold) = Phase B.** Phase C does not touch tree logic.
- **Teams + cross-team seam (`team` drive, `dependsOn` enforce, integration gate) = Phase C.** Phase C adds team-grouping and a dependency-edge layer *over* the flat lane list Phase B keeps flat.

No Phase C task edits a file in a way that redefines `parentId` semantics. Where Phase C and Phase B both touch `step-09-reconcile.md` or `step-10-report.md`, the Phase C edits are additive sections appended after Phase B's — sequence-noted inline.

---

## Implementation Tasks

Tasks are grouped by persona. The persona heading is the source of truth for ownership (ADR-0018). Each task meets the detail bar in `.prism/rules/implementation-task-detail.md` — exact file, specific change, verification, sequence. All file paths are relative to repo root.

**Schema note for every task below:** `team`, `dependsOn`, `parentId` already ship nullable in the v2 schema (`.prism/skills/prism-conductor/lib/goal-state.md` § Schema (v2), lines 52–54). Phase C is a **logic change only** — it drives these fields. The one schema-*doc* edit (adding `type` and a `dependency-blocked` note) is task C-1 and edits the doc's prose/JSON example, not a runtime schema migration. No task introduces a required field; old runs with null `team` / empty `dependsOn` / null `type` parse and dispatch identically (FR-10, NFR-2).

These are doc/spec edits to the conductor skill (Sol writes only `.prism/conductor-state.json` + chat at runtime; the *behavior* lives in the cited step/lib files). "Verification" for content-only spec edits is `pnpm prism:check` (build/lint of the skill pipeline) plus the stated grep/read confirmations — there is no runtime unit test for a markdown spec edit.

### Clove (implementation)

**Group 1 — Drive `team` (FR-1, FR-8, NFR-3)**

1. **Add the `type` field and `dependency-blocked` note to the goal-state schema doc.** File: `.prism/skills/prism-conductor/lib/goal-state.md`. In the JSON example (the `lanes[]` object, around line 52 where `"team": null,` appears), add immediately after `"team": null,`:
   ```json
   "type": null,
   ```
   Then in § Field notes, update the existing bullet that reads `team` and `dependsOn` ship nullable and are **provisional** (Phase C — shape not yet driven in v1)... — replace its "do not write logic that reads them until Phase C" clause, since Phase C now drives them. New text for that bullet: `` `team`, `dependsOn`, and `type` are driven as of Phase C: `team` groups lanes for scheduling/reporting/discovered-work routing; `dependsOn` is a flat `laneId[]` DAG enforced at dispatch eligibility; `type: "integration" | null` marks a lane as an integration lane (null = ordinary lane). Phase A/B runs with null `team` / empty `dependsOn` / null `type` dispatch identically — the fields are additive (NFR-2). `` Add a new Field-notes bullet: `` A lane blocked on an unresolved `dependsOn` edge stays `status: "active"` with `phaseStatus: "parked"` and a `blockedBy: laneId[]` note naming the unresolved edges; it is not a new top-level status value (see Phase C Decision: C-A2). `blockedBy` is absent when the lane has no unresolved dependency. `` Add `"blockedBy": []` to the JSON example after `"dependsOn": [],`. Verification: `pnpm prism:check`; grep `type` and `blockedBy` appear in the schema doc. Sequence: first — C-2 through C-13 reference these fields.

2. **Add per-team queue ordering to the dispatch slot-fill.** File: `.prism/skills/prism-conductor/step-04-dispatch.md`. After the paragraph ending `...for the default worker dispatch.` (line 7), add a new section `## Per-team dispatch ordering`. Content: Sol reads each eligible lane's `team` field and applies a team-aware ordering layer on top of the existing slot-fill — lanes sharing a `team` value form a logical queue (preserving their `lanes[]` array order); Sol interleaves teams round-robin as concurrency slots open, so no single team starves another within the shared ~12 cap. State explicitly: this is an **ordering layer on the existing single-conductor dispatch loop, not a second scheduler** (NFR-3) — the concurrency cap, conflict gate, and budget are unchanged shared resources. A lane with `team: null` is its own implicit singleton group, ordered by array position. Cite `lib/fleet.md` for the conflict gate (unchanged) and `claude.md § The autonomous segment` for the `pipeline(lanes, …)` mechanism — do not restate them. Verification: `pnpm prism:check`. Sequence: after C-1.

3. **Add `dependsOn` eligibility blocking to the dispatch decision.** File: `.prism/skills/prism-conductor/step-04-dispatch.md`. In the same `## Per-team dispatch ordering` section (or a sibling `## Dependency-gated eligibility` section directly after it), add: before a lane is placed in the dispatch set, Sol checks its `dependsOn` list — a lane is **eligible** only when every `laneId` in its `dependsOn` has `status: "done"`. A lane with an unresolved edge is held: set `phaseStatus: "parked"` and `blockedBy: [<unresolved laneIds>]` per the mutate protocol, and it is not added to the `pipeline()` set this segment. State that eligibility is checked **at each segment boundary (segment-granular), not mid-segment** (FR-2) — consistent with the segment model where Sol does not talk to running workers (`shared.md` § 4). An empty `dependsOn` is trivially eligible (Phase A/B behavior). Verification: `pnpm prism:check`. Sequence: after C-2.

4. **Surface team groups in dispatch reporting hooks.** File: `.prism/skills/prism-conductor/step-04-dispatch.md`. In the `## Per-team dispatch ordering` section, add one paragraph: when recording dispatch state in goal-state, Sol tags each dispatched lane's segment-membership by `team` so the end-of-run report (step-10, task C-9) can group without re-deriving. No new schema field — the `team` value on the lane is the grouping key; this paragraph documents that step-10 reads it. Verification: content-only, no build effect — state so. Sequence: after C-3.

**Group 2 — Drive `dependsOn` enforcement, cycle detection, parked-dependency escalation (FR-2, FR-3, FR-4, FR-9)**

5. **Add the cross-team `dependsOn` eligibility + cycle check to the reconcile step.** File: `.prism/skills/prism-conductor/step-09-reconcile.md`. Insert a new numbered sub-step between the current step 2 (`### 2. Run the decision box per distinct target`) and step 3 (`### 3. Apply the convergence governor`), titled `### 2.5 Resolve dependency eligibility and detect cycles`. Content, in order: (a) **Cycle check** — run a depth-first cycle detection over the `dependsOn` graph across all `lanes[]` (edges are `laneId` references over the flat list, a DAG per FR-9). A detected cycle of any length (A→B→A, or A→B→C→A) is a `needs-human` escalation: set the participating lanes' `escalation` object (`axis: "human"`, `reason: "dependsOn-cycle: <lane chain>"`, `raisedAt`), append a description of the cycle to `pendingHumanReport`, and do **not** dispatch any lane in the cycle until the human removes an edge. (b) **Eligibility resolution** — for each pending/held lane, recompute whether every `dependsOn` target reached `status: "done"`; clear `blockedBy` and `phaseStatus: "parked"` on lanes whose edges all resolved (they become dispatch-eligible next segment). (c) **Parked-dependency surface** — if any `dependsOn` target is `parked` (not `done`), the dependent lane cannot resolve: keep its `blockedBy` entry and append a co-presented entry to `pendingHumanReport` naming both the dependent lane and the parked target's escalation reason (FR-3). State that the cycle check runs **at the reconcile boundary** (FR-4) — once per segment, before the convergence governor. Cite `lib/convergence.md` for the governor (this step precedes it) and `lib/goal-state.md` for the mutate protocol. Verification: `pnpm prism:check`; grep `dependsOn-cycle` and `2.5` appear in the step file. Sequence: after C-1; this is the load-bearing `dependsOn` task.

6. **Record the cycle-detection contract in the convergence lib as a named pre-governor check.** File: `.prism/skills/prism-conductor/lib/convergence.md`. After the `## Termination-reason invariant` section (line 49) and before `## Priority order at reconcile time` (line 51), add a section `## Dependency-graph pre-check (Phase C)`. Content: before the three brakes evaluate, the reconcile step runs a `dependsOn`-graph cycle check (defined in `step-09-reconcile.md § 2.5`); a cycle is a `needs-human` escalation, never a silent hang — it is a **constraint check, not a brake** (it doesn't park for budget/generation/breadth reasons; it escalates a malformed graph). State that this check is orthogonal to and runs *before* the budget/generation/breadth priority order, and that it does not consume `globalBudget` (no dispatch occurs). Cite `step-09-reconcile.md § 2.5` for the procedure — do not restate the DFS. Verification: `pnpm prism:check`. Sequence: after C-5 (cite it).

7. **Add parked-dependency surfacing to the escalation step.** File: `.prism/skills/prism-conductor/step-06-escalate.md`. After the three-axis bullet list (the `human →` bullet ending `...an inherently human gate.`, line 7), add a new bullet under a brief lead or as a fourth contextual note: `` **dependency-blocked (co-presented, not a fourth axis)** — a lane held on an unresolved `dependsOn` edge is not itself escalated; it is *surfaced alongside* the blocking lane's escalation. When the `dependsOn` target is `parked`, reconcile (`step-09 § 2.5`) appends a co-presented `pendingHumanReport` entry naming the dependent lane and the parked target's reason. Resolving the parked target's escalation unblocks the dependent lane on the next reconcile pass (FR-3). `` State this is a presentation/routing note, not a new escalation axis — the three axes (replan/model/human) are unchanged. Cite `step-09-reconcile.md § 2.5`. Verification: `pnpm prism:check`. Sequence: after C-5.

**Group 3 — Team-tag propagation through discovered-work routing (FR-7)**

8. **Propagate the emitting lane's `team` tag through the decision box and onto the resulting lane.** File: `.prism/skills/prism-conductor/lib/decision-box.md`. In `### Step A — Nora evaluates (first dispatch)`, after item 4 (the `{ disposition, draftTicket, escalationReason? }` return, line 28), add a paragraph: when the originating signal was emitted by a lane with a non-null `team`, Sol carries that `team` value into the decision-box context and onto any resulting lane (fold-in or new ticket) — the new lane inherits the emitting lane's `team` unless the operator or decompose chain explicitly overrides it. **Sol does not strip or reassign team tags** (FR-7; ADR-0049 "Sol never reassigns"). State that this is a deterministic carry, not a Nora scope judgment — Nora judges scope, Sol carries the team tag. Then in `### Step D — No-escalation path` item 3 (the commit branch), add: the committed ticket / spawned lane records the inherited `team` in its `lanes[]` entry. Verification: `pnpm prism:check`; grep `team` appears in `decision-box.md`. Sequence: after C-1.

8a. **Record team-tag carry in the report-back signal contract.** File: `.prism/skills/prism-conductor/lib/report-back.md`. In the `## Secondary signals` section, after the paragraph on the structured `target` object (the bullet ending `...routed to Nora for ambiguity resolution.`, line 32), add one sentence: a `found-bug` / `found-followup-work` signal emitted inside a Sol run carries the emitting lane's `team` value through reconcile and the decision box; a resulting lane inherits it (FR-7) — see `lib/decision-box.md § Step A`. State the team tag is never stripped. Verification: `pnpm prism:check`. Sequence: after C-8 (cite it).

**Group 4 — Per-team reporting (FR-8)**

9. **Add the per-team view to the end-of-run report.** File: `.prism/skills/prism-conductor/step-10-report.md`. After the `Cover for the run as a whole:` block (ending with the `Termination reason` bullet, line 18) and before the `Save goal-state...` paragraph (line 20), add a section `## Per-team view (Phase C)`. Content: for each distinct non-null `team` value across `lanes[]`, surface a per-team summary — count of lanes **dispatched, done, parked, and discovered** (discovered = lanes whose origin signal carried that team tag). State this is **additive** — it appears alongside the existing flat-list view and (Phase B) the tree-structured view; all applicable views appear in one report (FR-8). A run with all-null `team` shows no per-team section (Phase A/B behavior unchanged). Verification: `pnpm prism:check`; grep `Per-team view` appears in step-10. Sequence: after C-1; coordinate with Phase B's step-10 tree-view edit — append the per-team section after Phase B's tree-view section (see Build dependency note). 

**Group 5 — The integration gate (FR-5, FR-6, NFR-4)**

10. **Define the integration gate as a distinct gate in the fleet contract.** File: `.prism/skills/prism-conductor/lib/fleet.md`. After the `## Conflict gate` section (ending with the pending-vs-active paragraph, line 33) and before `## Cross-lane fold-in` (line 35), add a section `## Integration gate (Phase C)`. Content: (a) **Trigger** — a lane with `type: "integration"` whose `dependsOn` edges point at lanes in **two or more distinct `team` values** (at least one cross-team edge) triggers a pre-dispatch human gate, fired after all its `dependsOn` lanes reach `done` and before the integration lane dispatches (FR-5). A same-team lane with multiple `dependsOn` edges does **not** trigger it. A `type: "integration"` lane with only same-team edges does not trigger it. (b) **Always human** — the integration gate is **`needs-human` at every autonomy level, including `hobby`** (NFR-4): it never auto-clears. State this is a categorical distinction from the confidence-gated autonomy pattern (ADR-0048), which governs within-lane decisions; the integration gate is a cross-team convergence checkpoint, not a routine gate confidence can satisfy. (c) **Distinct from the conflict gate** — the file-conflict gate serializes same-file lanes (unchanged); the integration gate gates cross-team work convergence, independent of file overlap. The two are separate phases and produce separate reports. Cite ADR-0011 (merge stays the unconditional gate) and ADR-0049. Verification: `pnpm prism:check`; grep `Integration gate` appears in `fleet.md`. Sequence: after C-1.

11. **Register the integration gate in the gate registry.** File: `.prism/skills/prism-conductor/lib/report-back.md`. In the `## Gate registry` table (lines 76–82), add a row after the `Eric review` row and before `Human merge`:
   `| Integration gate | the human (always) | **No** — always `needs-human` at every autonomy level, including `hobby`; a cross-team convergence checkpoint, not a stakes gate (NFR-4). Fires before an integration lane dispatches. |`
   Then after the merge paragraph (ending `...this registry binds Sol.`, line 84), add one sentence: the integration gate is the second unconditional `needs-human` gate alongside merge — but where merge is enforced by branch protection, the integration gate is enforced by Sol's dispatch logic (`lib/fleet.md § Integration gate`). Verification: `pnpm prism:check`; grep `Integration gate` appears in `report-back.md`. Sequence: after C-10 (cite it).

12. **Add the integration-gate report shape to the end-of-run / gate report.** File: `.prism/skills/prism-conductor/step-10-report.md`. In the `## Per-team view (Phase C)` section added in C-9, or as a sibling section `## Integration gate report (Phase C)` directly after it, add: when an integration gate fires, the report surfaces — (a) a **per-team summary of completed `dependsOn` lanes** (lane ID, scope statement, termination reason per upstream team), (b) any `dependsOn` lanes that are `parked` rather than `done`, (c) the integration lane's **scope statement** (what it validates), and (d) a prompt for the operator to approve dispatch or escalate (FR-6). State the report **distinguishes the integration gate from file-conflict gate reports** — it is labeled as an integration gate and groups by upstream team. Cite `lib/fleet.md § Integration gate` for the trigger. Verification: `pnpm prism:check`; grep `Integration gate report` appears in step-10. Sequence: after C-10 and C-9.

13. **Document the integration-lane persona-assignment path (no new mapping).** File: `.prism/skills/prism-conductor/lib/fleet.md`. In the `## Integration gate (Phase C)` section, add a closing paragraph: the integration lane is a conductor-dispatched lane like any other — its persona follows the **existing persona-assignment logic** (the lane's `scope` statement names the persona; Briar for a review-and-test pass, Winston for a seam-architecture check, a QA persona if available). Phase C introduces **no default integration-lane persona mapping** — the scope statement is always explicit (Decision C-A4). State Sol does not choose the persona; the decompose chain or operator sets it in the scope. Verification: `pnpm prism:check`. Sequence: after C-10.

### Nora (ticket/team-tag in discovered-work)

14. **Confirm team-tag inheritance in the deferred-commit ticket draft.** No separate file edit if C-8 fully covers the carry — but verify during Phase C implementation that Nora's decision-box draft (referenced in `lib/decision-box.md § Step A` and `followup-scope.md`) does not strip the `team` value Sol carries in. This is a **review-time confirmation**, not a new write: the team tag lives in goal-state run-control (Sol's channel), not in the Linear/GitHub ticket body, so Nora's tracker write is unaffected and tracker-agnostic (PRD Constraints § Tracker-agnostic). If implementation reveals Nora's draft path *does* touch the team tag, fold a one-line note into `decision-box.md` and record it in `## Decisions`. Verification: read-confirm only. Sequence: after C-8.

### Eli (documentation)

15. **Update the conductor dev doc / architect context for Phase C semantics — deferred to the documentation phase.** No task body here beyond the pointer: when Phase C lands, the `team` / `dependsOn` / integration-gate semantics promoted in `## Decisions` below graduate to the relevant architect doc (`.prism/architect/` — the conductor's architect-context file if one exists, else flag its creation). This is the Architect Context Updates handoff, executed at plan close, not during implementation. Sequence: at epic close, after Clove's groups merge.

---

## Decisions

Resolving all five PRD `[ASSUMPTION-N]` items. C-A1, C-A2, C-A4 are Winston-resolved (architectural); C-A3 and C-A5 carry a default and are flagged Hunter-policy.

- **C-A4 (ASSUMPTION-4) — Integration lane marker is a `type: "integration" | null` field; persona assignment stays explicit in the scope statement, no default mapping.**
  - **Context:** The PRD needs a marker that, combined with cross-team `dependsOn`, triggers the integration gate. Candidates: a `type` field, a `role` field, or a named-lane convention.
  - **Alternatives considered:** (a) `role` field — rejected: "role" collides conceptually with persona-assignment (the persona *is* the lane's role), inviting confusion. (b) Named-lane convention (e.g. laneId starts with `integration-`) — rejected: string-convention triggers are fragile and unschematized; a typo silently disables the gate. (c) A default persona mapping in conductor config (integration → Briar) — rejected: the right integration persona depends on what's being validated (a seam check is Winston, a test pass is Briar/QA); a default would be wrong often enough to mislead.
  - **Chosen approach:** A nullable `type: "integration" | null` field on the lane, defaulting to `null` (ordinary lane). Beats `role` (no persona collision), beats named-convention (schematized, typo-safe), beats default-mapping (scope statement names the persona explicitly, which is already how every other lane's persona is assigned). The gate triggers on `type === "integration"` AND cross-team `dependsOn` — both conditions required.
  - **Implementation guidance:** Add `type` to the schema doc (C-1); trigger logic in `lib/fleet.md` (C-10); persona-assignment-via-scope documented (C-13). `type: null` is the additive default — Phase A/B lanes are unaffected.
  - **→ promoted to ADR-0053** (`.prism/spec/adrs/0053-conductor-integration-lane-type-marker.md`, status: accepted).

- **C-A2 (ASSUMPTION-2) — Parked-dependency state is `status: "active"` + `phaseStatus: "parked"` + a `blockedBy: laneId[]` note, not a new top-level `status` value.**
  - **Context:** When a `dependsOn` target is `parked` (not `done`), the dependent lane is blocked. The question: does the blocked lane need a distinct `status: "dependency-blocked"` value, or is the existing status model + a flag sufficient?
  - **Alternatives considered:** (a) New `status: "dependency-blocked"` enum value — rejected: it forks the four-value status model (`active | parked | blocked | done`) that every step file and the report already branch on; a new value means touching every consumer and risks Phase A/B code mishandling an unknown status. (b) Reuse `status: "blocked"` — rejected: `blocked` already means "the persona can't proceed — dependency/environment/missing input" (report-back verdict); overloading it loses the distinction between a *worker* block and a *scheduling* block, and muddies the end-of-run report.
  - **Chosen approach:** Keep the blocked lane `status: "active"` (it's still in-flight, just held), set `phaseStatus: "parked"`, and add a `blockedBy: laneId[]` note listing unresolved edges. Reporting and crash-safety read `blockedBy` to surface "held on dependency" distinctly without a new status value. Beats a new enum (no fork of the status model, additive) and beats reusing `blocked` (preserves the worker-block vs scheduling-block distinction).
  - **Implementation guidance:** `blockedBy` added to schema doc (C-1); set/cleared in `step-04` eligibility (C-3) and `step-09 § 2.5` (C-5); surfaced in `step-06` (C-7) and `step-10` per-team view (C-9). Absent when no unresolved dependency.
  - **→ no promotion needed (ticket-tactical state representation; the rule lives in the schema doc's Field notes, which C-1 updates — the durable home is the schema doc itself).**

- **C-A1 (ASSUMPTION-1) — Per-team model tier is a nullable `modelTier` seam on a `teamConfig[]` entry in goal-state; the seam ships, behavior-when-populated is implemented, default is the run-wide model.**
  - **Context:** The vision brief names "possibly its own model tiers" per team. The question: ship per-team model-tier preference in Phase C or defer; and does the seam belong in goal-state or a separate team-config manifest.
  - **Alternatives considered:** (a) Separate team-config manifest file — rejected for Phase C: model tier is a per-dispatch run-control concern, and goal-state is already the run-control channel (ADR-0001); a second config file fragments run-control and adds a read path. (b) Hardcode per-team tiers — rejected: violates NFR-5 (config-driven seams, not Thrive-hardcoded). (c) Defer entirely to Phase D — rejected: the seam is cheap (a nullable field) and the model-tiering table already supports per-dispatch overrides (`shared.md § Model tiering`, `claude.md` per-dispatch `model`), so wiring per-team is low-cost now.
  - **Chosen approach:** Add a nullable `teamConfig[]` array to goal-state (each entry: `{ team: string, modelTier: string | null }`), `modelTier` defaulting to the run-wide model. Sol reads it when setting the per-dispatch `model` override for a lane whose `team` matches. Phase C ships the seam **and** the read path. Beats a separate manifest (run-control stays one file), beats hardcoding (config-driven), beats full deferral (cheap, leverages existing per-dispatch override).
  - **Implementation guidance:** **This is a small additive scope beyond the schema fields the PRD pre-named.** Add `teamConfig[]` to the schema doc and the per-dispatch model read in `step-04`. **RATIFIED 2026-06-14 (Hunter, plan-ready gate): ship the seam AND the read path** (Winston's recommendation) — not schema-doc-only. The Workflow engine's per-agent `model` override (confirmed in `claude.md`) supports it; Clove implements the read path in `step-04`. The lean schema-doc-only fallback is off the table.
  - **→ no separate ADR — the `modelTier` seam folds into the epic plan's Decisions; ADR-0053 stays focused on the `type` integration marker.**

- **C-A3 (ASSUMPTION-3) — Per-team autonomy override: NOT in Phase C. One run-wide autonomy ceiling. Hunter-policy flag.**
  - **Context:** Brief Q8 asks whether teams need their own autonomy ceilings. ADR-0049 already dissolves the sub-conductor framing (one run-wide budget, one ceiling); the residual question is whether per-team *overrides* to the run-wide ceiling are a Phase C requirement.
  - **Default path (used until resolved):** one run-wide autonomy ceiling for Phase C; no per-team override. The integration gate is always `needs-human` regardless of ceiling (NFR-4, C-A5) — the most critical autonomy constraint already holds without per-team overrides.
  - **Chosen approach (default):** Defer per-team autonomy overrides to Phase D. Rationale: ADR-0049 made one ceiling the invariant; per-team overrides reintroduce per-group policy surface that the lane-groups model was meant to flatten. The integration-gate-always-human constraint covers the one cross-team risk that matters. Implementing overrides would add a `teamConfig[].autonomyOverride` field and per-team ceiling resolution in every gate-disposition path — non-trivial, and unmotivated until a real run needs it.
  - **→ HUNTER-POLICY.** This is a policy call, not purely architectural — flag at plan-ready: *confirm per-team autonomy overrides are out of Phase C (Phase D concern).* Default holds unless Hunter says otherwise. If Hunter wants them in Phase C, it's an additive `teamConfig[]` field (no schema bump beyond that) — scope grows by one field + ceiling-resolution logic in the gate paths.
  - **→ no promotion needed (deferral decision; revisit in Phase D plan).**

- **C-A5 (ASSUMPTION-5) — Integration gate is always `needs-human`, including `hobby`. HUNTER-POLICY flag at `hobby` stakes.**
  - **Context:** The PRD states the integration gate never auto-clears at any autonomy level — even a `hobby`-stakes run stops and waits for a human. This is stronger than the discovery-loop's `hobby` = autonomous behavior. The PRD explicitly flags this as a policy decision belonging to Hunter, not Winston.
  - **Default path (used until resolved):** integration gate is always `needs-human`, as specified in NFR-4. Implemented that way in C-10 and C-11.
  - **Architectural read (Winston's input on the technical side):** Always-human is the *safer* default and the cleaner implementation — it makes the integration gate a categorical sibling of the merge gate (one rule, no autonomy-level branching in the gate logic). An exemption (`hobby` → auto-dispatch integration lanes) adds a conditional branch to the gate and a path where two teams' work merges-and-tests with zero human eyes — defensible only if Hunter judges `hobby` runs as genuinely throwaway. The technical cost of *either* choice is one conditional; the risk asymmetry favors always-human.
  - **→ HUNTER-POLICY.** Flag at plan-ready: *confirm `hobby`-stakes runs are NOT exempt from the always-human integration gate (default), OR exempt them (`hobby` → auto-dispatch, `internal`/`launch` → needs-human).* Default (always-human) is implemented unless Hunter exempts `hobby`. If Hunter exempts, C-10/C-11 gain one autonomy-level conditional on the gate trigger.
  - **→ promoted to ADR-0054** (`.prism/spec/adrs/0054-conductor-integration-gate-always-human.md`, status: accepted).

- **C-D1 — `dependsOn` eligibility is segment-granular, checked at the reconcile/dispatch boundary, never mid-segment.** Sol does not talk to running workers (`shared.md § 4`); a dependency can only resolve when its target lane reaches `done`, which Sol observes at a segment boundary. So eligibility is recomputed once per boundary (FR-2). A lane whose dependency completes mid-segment unblocks at the *next* boundary, not instantly. → no promotion needed (restates the existing segment model for the `dependsOn` case; codified in C-3/C-5 task bodies).

- **C-D2 — Cycle detection is a constraint check at the reconcile boundary, not a fourth convergence brake.** It escalates a malformed `dependsOn` graph (`needs-human`); it does not park for budget/generation/breadth and consumes no `globalBudget`. It runs *before* the three-brake priority order (C-6). → no promotion needed (codified in `lib/convergence.md § Dependency-graph pre-check` via C-6; the contract lives there).

- **C-D3 — Team assignment is never Sol's call (ADR-0049 restated for discovered work).** `team` comes from the operator at run start, the decompose chain, or inheritance from the emitting lane in discovered-work routing. Sol carries and groups; it never assigns or reassigns (FR-7). → no promotion needed (direct restatement of ADR-0049; the carry mechanics are codified in C-8).

---

## Acceptance Criteria

Derived from the PRD § Success metrics (cited inline). Reese and Briar derive the test-executable checklist downstream from these.

### Behavioral

- [ ] **Given** a run with lanes tagged `team: "backend"` and `team: "frontend"`, **When** the run completes, **Then** the end-of-run report shows a per-team view with each team's dispatched/done/parked/discovered counts, separate from the flat list. *(PRD: "Teams are legible"; FR-8)*
- [ ] **Given** a `team: "frontend"` lane with `dependsOn: [backend-schema-lane]`, **When** the backend lane has not reached `done`, **Then** the frontend lane is held (not dispatched) and carries a `blockedBy` note. *(PRD: "Cross-team sequencing holds"; FR-2)*
- [ ] **Given** a frontend lane held on a backend dependency, **When** the backend lane reaches `done`, **Then** the frontend lane becomes dispatch-eligible at the next segment boundary and its `blockedBy` clears. *(PRD journey 1; FR-2)*
- [ ] **Given** a `dependsOn` target lane that is `parked` (not `done`), **When** reconcile runs, **Then** the dependent lane and the parked target's escalation are co-presented in one `pendingHumanReport` entry — the dependent lane does not silently stall. *(PRD: journey 3; FR-3)*
- [ ] **Given** lanes where A `dependsOn` B and B `dependsOn` A, **When** the reconcile cycle check runs, **Then** a `needs-human` escalation fires describing the cycle and no lane in the cycle dispatches. *(PRD: journey 5; FR-4)*
- [ ] **Given** a lane with `type: "integration"` and `dependsOn` edges spanning two or more distinct `team` values, **When** all its `dependsOn` lanes reach `done`, **Then** a pre-dispatch integration gate fires as `needs-human` before the integration lane dispatches. *(PRD: "The integration gate fires and is distinct"; FR-5)*
- [ ] **Given** an integration gate fires, **When** the report is surfaced, **Then** it shows per-team completed-dependency summaries, any parked dependencies, the integration lane's scope statement, an approve/escalate prompt, and is labeled distinctly from a file-conflict gate report. *(FR-6)*
- [ ] **Given** a signal emitted by a lane with `team: "backend"`, **When** the decision box routes it and a new lane results, **Then** the new lane inherits `team: "backend"` — no signal is stripped of its team tag. *(PRD: "Per-team discovered-work routing is correct"; FR-7)*
- [ ] **Given** a `type: "integration"` lane whose `dependsOn` edges are all same-team, **When** its dependencies resolve, **Then** the integration gate does NOT fire (cross-team edges are required). *(PRD scope § integration gate trigger; FR-5)*

### Non-behavioral

- [ ] A Phase A/B run with all-null `team`, empty `dependsOn`, and null `type` dispatches and reports identically to pre-Phase-C behavior — no migration step. *(FR-10, NFR-2)*
- [ ] Per-team queue management is an ordering layer on the single-conductor dispatch loop — no second scheduler, no change to the concurrency cap, conflict gate, or budget. *(NFR-3, NFR-6)*
- [ ] The integration gate auto-clears at no autonomy level, including `hobby` (subject to C-A5 Hunter-policy resolution). *(NFR-4)*
- [ ] Team names are operator-defined strings; the integration marker, per-team model tier, and per-team autonomy seams are config-driven, not hardcoded. *(NFR-5)*
- [ ] No Phase C change introduces Workflow-engine nesting, a second budget, or a second concurrency counter; `team`/`dependsOn` are data transforms on the flat lane list. *(NFR-6, ADR-0049)*

### AC Adjustments

### AC Sync Log

| Date | Agent | Action | Plan | Linear |
| ---- | ----- | ------ | ---- | ------ |
| 2026-06-14 | Winston | AC authored from PRD success metrics | created | pending Nora |

---

## ADR Candidates

Named here with verdict notes per the plan-ready gate. **Winston does not write ADR files** — these are candidates for Hunter to ratify; Nora/Winston author them if approved.

- **ADR-0053 (candidate) — Integration lane marker is a `type` field; no default integration persona.** Captures C-A4. *Verdict: likely warranted* — it's a schema-shape + naming decision other phases (D) and consuming teams inherit. May bundle the `teamConfig[].modelTier` seam (C-A1) if both land together, or stay focused on the `type` marker. Recommend a focused ADR on the marker; fold the `modelTier` seam into the epic plan's Decisions only unless it grows.
- **ADR-0054 (candidate) — The integration gate is an unconditional `needs-human` gate (alongside merge).** Captures C-A5. *Verdict: generalizes* — this is a categorical autonomy invariant ("cross-team convergence is always human-reviewed") that sits beside ADR-0011 (merge always human) and qualifies ADR-0048 (autonomy between gates). Strong ADR candidate **if Hunter ratifies always-human** at plan-ready. If Hunter exempts `hobby`, the ADR records the exemption instead. Either way the decision deserves an ADR because it defines a second unconditional gate.

No ADR for C-A2 (state representation — ticket-tactical, lives in schema doc), C-A3 (deferral to Phase D), or the C-D* restatements.

---

## History

- 2026-06-14 [hmcgrew/sol-product-lead-prd]: Authored Phase C epic plan — teams as lane-groups (`team` drive), cross-team `dependsOn` sequencing + cycle detection, always-human integration gate. Resolved all 5 PRD assumptions: C-A1/C-A2/C-A4 architecturally, C-A3/C-A5 defaulted-and-flagged for Hunter. Build-ordered second (after Phase B on main).
- 2026-06-14 [hmcgrew/sol-phase-b-prd]: Plan-ready gate cleared (Hunter, Winston's defaults). C-A5 ratified always-human (incl. hobby); C-A3 per-team autonomy confirmed out-of-scope (deferred); C-A1 confirmed ship modelTier seam + read path (not lean). ADR candidates 0053 (`type` marker) / 0054 (integration-gate-always-human) ratified — written during the Phase C build.
- 2026-06-14 [hmcgrew/sol-phase-c-teams]: Wrote ADR-0053 (`type` integration marker, no default persona) and ADR-0054 (integration gate always-human, incl. hobby) as accepted; added README index rows; resolved C-A4/C-A5 promotion pointers and marked the ADR-not-written Review Issue fixed.
- 2026-06-14 [hmcgrew/sol-phase-c-teams]: Implemented Clove tasks 1–13 + C-A1 seam/read path. Adds type/blockedBy/teamConfig[] schema, per-team ordering + dependency-gated eligibility in step-04, DFS cycle check + eligibility resolution in step-09 § 2.5, convergence pre-check, team-tag carry through decision box, per-team/integration-gate views in step-10, integration gate in fleet.md + gate registry. pnpm prism:build && prism:check: 158/158 pass.
- 2026-06-14 [hmcgrew/sol-phase-c-teams]: Fixed 4 writing-voice minors from Briar self-review (64caa04) — replaced instruction-voice "Cite ADR-..." with declarative "See ADR-..." in fleet.md and step-10-report.md, dropped opaque "C-A1 read path" label from step-04-dispatch.md, replaced "(see Phase C Decision: C-A2)" with "(the four-value status model is unchanged)" in goal-state.md. 158/158 pass.
- 2026-06-14 [hmcgrew/sol-phase-c-teams]: Fixed 2 writing-voice minors from Eric PR review (772a794) — rewrote "Cite...do not restate them" in step-04-dispatch.md:15 to declarative form; added modelTier vocabulary cite to shared.md § Model tiering in goal-state.md:79. 158/158 pass.
- 2026-06-15 [hmcgrew/sol-conductor-bcd-epic-close]: Epic closed — implementation merged (PR #145), ADRs 0053/0054 promoted, dev doc shipped. Verdict gate passed (all Decisions carried verdicts; none added). No separate architect-doc promotion needed — task 15's "graduate team/dependsOn/integration semantics to architect doc" is satisfied by ADRs 0053/0054 plus the schema-doc Field notes; no conductor architect-context file exists and the ADRs are the durable surface (lazy-artifacts: not created speculatively).

---

## Review Issues

### Writing-voice: "Cite ADR-0011...and ADR-0049" meta-instruction in fleet.md

- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `.prism/skills/prism-conductor/lib/fleet.md:39`
- **Problem:** `(b) Always human` paragraph ends with `Cite ADR-0011 (merge stays the unconditional gate alongside this one) and ADR-0049 (Sol never reassigns team tags).` — task-spec instruction text pasted verbatim into the durable skill file. Reads as a directive to a future reader, not a declaration.
- **Suggested fix:** Replace `Cite ADR-0011` with `See ADR-0011`.
- **Fixed in:** `64caa04`

### Writing-voice: "Cite `lib/fleet.md § Integration gate`" instruction in step-10

- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `.prism/skills/prism-conductor/step-10-report.md:44`
- **Problem:** `Cite \`lib/fleet.md § Integration gate\` for the trigger.` is a task-spec instruction, not a declaration. Reads as telling Sol what to cite rather than stating the spec.
- **Suggested fix:** Replace with `The integration gate trigger is defined in \`lib/fleet.md § Integration gate\`.`
- **Fixed in:** `64caa04`

### Writing-voice: "C-A1 read path" internal session label in step-04

- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `.prism/skills/prism-conductor/step-04-dispatch.md:7`
- **Problem:** `This is the C-A1 read path` — C-A1 is a plan decision label opaque to readers loading step-04 cold without the epic plan.
- **Suggested fix:** Drop the label entirely — the cite to `lib/goal-state.md § Field notes` is sufficient.
- **Fixed in:** `64caa04`

### Writing-voice: "see Phase C Decision: C-A2" internal label in goal-state

- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `.prism/skills/prism-conductor/lib/goal-state.md:78`
- **Problem:** `(see Phase C Decision: C-A2)` is an internal plan reference opaque in the skill file standing alone.
- **Suggested fix:** Replace with plain rationale: `(the four-value status model is unchanged)`.
- **Fixed in:** `64caa04`

### ADR-0053 and ADR-0054 cited but not yet written

- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `.prism/skills/prism-conductor/lib/fleet.md:39`, `.prism/skills/prism-conductor/lib/report-back.md:84`
- **Problem:** Both ADRs are cited in durable skill files but no files exist in `.prism/spec/adrs/` for them yet. The `(candidate)` qualifier in fleet.md signals this, but a reader following the cite finds nothing.
- **Suggested fix:** No change needed before PR; ADR authoring happens at plan close per the Decisions section. Non-blocking.
- **Resolution:** 2026-06-14 — both ADRs written as `status: accepted` (numbers confirmed free; max was 0052). README index rows added. Plan promotion pointers resolved to the live files.

### Writing-voice: "Cite `lib/fleet.md`...do not restate them" instruction in step-04-dispatch.md

- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `.prism/skills/prism-conductor/step-04-dispatch.md:15`
- **Problem:** `Cite \`lib/fleet.md\` for the conflict gate (unchanged) and \`claude.md § The autonomous segment\` for the \`pipeline(lanes, …)\` mechanism — do not restate them.` is instruction voice — a directive to a reader, not a declaration.
- **Suggested fix:** Replace with declarative form: `The conflict gate is defined in \`lib/fleet.md\`; the \`pipeline(lanes, …)\` mechanism is defined in \`claude.md § The autonomous segment\`.`
- **Fixed in:** `772a794`

### Writing-voice: `teamConfig[].modelTier` typed `string | null` without pointing to valid tier vocabulary in goal-state.md

- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `.prism/skills/prism-conductor/lib/goal-state.md:79`
- **Problem:** `modelTier: string | null` field is self-described but doesn't point to the valid values — a reader can't tell what strings are valid without searching.
- **Suggested fix:** Add a brief cite noting valid values are the model tiers defined in `shared.md § Model tiering` (e.g. `opus`/`sonnet`), and `null` means the run-wide model.
- **Fixed in:** `772a794`

---

## Cleanup Items

- `.prism/skills/prism-conductor/lib/fleet.md:39` — `Cite ADR-0011...` → `See ADR-0011...` (instruction voice)
- `.prism/skills/prism-conductor/step-10-report.md:44` — `Cite \`lib/fleet.md...\`` → declarative form
- `.prism/skills/prism-conductor/step-04-dispatch.md:7` — drop `This is the C-A1 read path —` prefix
- `.prism/skills/prism-conductor/lib/goal-state.md:78` — replace `(see Phase C Decision: C-A2)` with `(the four-value status model is unchanged)`

---

## PR Readiness

Living checklist — updated by Briar self-review 2026-06-14.

- [x] `type`, `blockedBy`, `teamConfig[]` schema-doc additions are additive (no required fields; Phase A/B parse-forward verified)
- [x] Per-team ordering confirmed as a layer, not a second scheduler (NFR-3)
- [x] `dependsOn` cycle check escalates (never hangs); eligibility is segment-granular
- [x] Integration gate is `needs-human` at all levels (C-A5 ratified: always-human)
- [x] Team tag never stripped through the decision box (FR-7)
- [x] Build passes — `pnpm prism:build && pnpm prism:check` — last run: 2026-06-14 (158/158 pass)
- [x] No critical or major issues — zero critical/major findings (Briar self-review 2026-06-14)
- [x] 6 minor writing-voice cleanup items (see ## Review Issues) — all fixed
- [x] PR description up to date
- [x] Lasting decisions promoted (C-A4 → ADR-0053, C-A5 → ADR-0054; no separate conductor architect doc — ADRs are the durable surface)

**Last updated:** 2026-06-15 (Winston, epic close — verdict gate passed, decisions promoted to ADRs 0053/0054)
