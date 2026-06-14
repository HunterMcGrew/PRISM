---
slug: sol-conductor-phase-b-hierarchy
title: "Sol conductor Phase B: hierarchy + greenfield specs→ticket-tree decompose"
mode: greenfield
stakes: internal
status: finalized
created: 2026-06-14T00:00:00Z
lastEdited: 2026-06-14T00:00:00Z
stepsCompleted: ["step-01-init", "greenfield-step-02-stakes", "greenfield-step-03-mode", "greenfield-step-04-draft", "greenfield-step-05-decision-log", "step-06-review", "step-07-finalize"]
linearInitiativeId: null
---

## Initiative description

Phase B is the second phase of the Sol product-lead conductor initiative. Phase A (shipped, merged) closed the discovery loop — the fleet grows itself mid-run — and built the reconcile-delta primitive that every later phase reuses. Phase B turns on two capabilities that Phase A deliberately deferred: **epic→issue→ticket tree semantics** in `goal-state` (the `parentId` field already ships as nullable, carrying discovery lineage; Phase B makes Sol read and drive the tree), and a **greenfield specs→ticket-tree decompose step** (given a PRD + architecture, a chain of personas generates the full ticket tree rather than requiring the operator to hand-list lanes). Both capabilities ride Phase A's reconcile-delta primitive, making Phase B cheaper than it would have been built cold.

Sourced from §7 (§7.2, §7.8, §7.11) of [`sol-product-lead-vision-brief.md`](../plans/sol-product-lead-vision-brief.md) and the Phase A PRD at [`.prism/prds/sol-product-lead-conductor.md`](./sol-product-lead-conductor.md), which explicitly named Phase B as "deferred, cheaper once A ships."

---

## Problem statement

**The hierarchy problem.** Phase A's `goal-state` tracks a flat lane list. `parentId` ships in v1 carrying discovery lineage (how `generation` is computed), but its epic→issue→ticket *tree* meaning is unread. An operator who wants to run a goal at initiative grain — "build the auth module" rather than "implement these four tickets" — cannot express that grain in the conductor today. Every lane is a sibling. There is no budget rollup from child tickets to their parent issue, no reporting that surfaces progress at epic grain, and no dispatching logic that knows a parent lane can't close until its children do.

**The greenfield problem.** When an operator has a PRD and an architecture document and wants Sol to build the described initiative, they must hand-list every lane at decompose time. Today `decompose` takes a goal and produces sibling lanes from an already-scoped set; there is no step that turns specs into the ticket tree itself. The operator has to do Parker→Winston→Nora work manually — writing the PRD, the architecture, the stories, the tickets — before Sol can conduct anything. This defeats the goal of handing Sol a goal and walking away at initiative grain.

**Why now.** Phase A's reconcile-delta primitive is the enabling artifact — greenfield decompose is the same shape: specs emit a ticket tree → Sol reconciles `goal-state` → dispatches the delta. Building it now avoids rebuilding the primitive. The `parentId` field is already in the schema; Phase B's tree semantics extend what Phase A shipped rather than replacing it.

**The gap.** A PRISM operator with a finalized PRD and a Winston architecture cannot today tell Sol "build this" and have Sol generate the plan, break it into tickets, and conduct the work. They hit the decompose step and stop.

---

## Target users

- **PRISM operators (primary).** Developers running Sol who want to drive an initiative from specs — "here is the PRD and architecture, go build it" — rather than hand-listing ticket lanes at decompose time. Today they must manually do every pre-lane step; Phase B makes that the conductor's job.
- **The run owner / human gate.** Whoever sets the autonomy ceiling and ratifies the generated ticket tree before Sol dispatches it. At `internal`/`launch` stakes, the tree is generated and surfaced for ratification before any work begins; at `hobby`, it auto-dispatches. They need a ratifiable artifact, not a black-box decomposition.
- **The PRISM personas, as parties to the run-control contract.** Parker (specs-to-initiative-decompose in the greenfield chain), Winston (architecture→tasks in the greenfield chain), Nora (ticket tree writes in the greenfield chain), Clove/Briar/Eric (conducting tree-aware lanes whose parent lanes must resolve before children close). Their contracts with Sol and with each other change when lanes have parent→child relationships.
- **Future PRISM-consuming teams (secondary).** They inherit the capability and the tree-aware `goal-state`. Config-driven seams (greenfield chain ownership, ratification gates) must be tunable rather than hardcoded.

---

## Success metrics

How we'll know Phase B solved the problem — observable from the end-of-run report and `goal-state` inspection:

- **Greenfield decompose works end-to-end.** Given a PRD + architecture as inputs, Sol runs the greenfield chain and produces a ticket tree in `goal-state` with correct `parentId` parent pointers — no operator hand-listing of lanes required.
- **Tree semantics are correct.** A parent lane's status reflects its children: no parent closes as `done` while a child remains `active` or `parked`. Budget rollup and convergence reporting surface progress at epic grain, not only at leaf-ticket grain.
- **Generation accounting is unchanged.** The planned tree is all generation 0. Only *unplanned* discovery during build accrues generations (`parent.generation + 1`). A three-level planned tree (epic → issue → ticket) is not a gen-2 or gen-3 run; it's gen-0 all the way down.
- **The ratification gate holds.** At `internal`/`launch` stakes, the generated ticket tree is surfaced to the operator before dispatch. Zero trees are auto-dispatched above `hobby` without a human gate.
- **The reconcile-delta primitive is unchanged.** Greenfield decompose reuses Phase A's primitive without forking it — a diff against the Phase A primitive shows no duplicate logic.

These are outcome statements at initiative grain, not test assertions. Reese and Briar derive the verifiable checklist downstream.

---

## Scope

### In scope (Phase B)

- **Epic→issue→ticket tree semantics in `goal-state`.** `parentId` already ships nullable (v1 drives it for discovery lineage only). Phase B makes Sol *read and drive* the tree: a lane can be an epic with child-issue lanes with child-ticket lanes, related by `parentId` parent pointers over the flat `lanes[]`. Specifically:
  - **Dispatch**: a parent lane dispatches only after all its children have closed (`done` or `dropped`). [ASSUMPTION-1]
  - **Convergence reporting**: the end-of-run report surfaces progress at each tree level (epic → issue → ticket grain), not only per-leaf-lane.
  - **Budget rollup**: `globalBudget.spent` already counts all dispatches; tree-aware reporting shows consumed budget attributed to each epic's subtree.
  - **Convergence**: a parent lane is `done` only when all its children are `done` or `dropped`. This is a change to convergence-check logic, not to the convergence governor (budget/generation/breadth gate — those are unchanged).
  - **Tree depth ≠ generation depth invariant, restated for Phase B.** The planned tree (epics + issues + tickets all generated by the decompose step) is entirely gen 0. Generations accrue only from *unplanned* discovery during build. A three-level planned tree is three levels of gen-0 lanes. This is a load-bearing invariant: the convergence governor (budget, K=3 cap, breadth gate) is not triggered by the planned tree's depth, only by discovered work's depth.

- **Greenfield specs→ticket-tree decompose step.** A new upstream step — before the existing `decompose` segment — that takes a PRD and architecture document as inputs and emits a full ticket tree (epics → issues → tickets) into `goal-state`. This step:
  - Uses the same reconcile-delta primitive Phase A built (`lib/reconcile.md`): the chain emits a ticket tree → Sol reconciles `goal-state` → dispatches the delta.
  - The decompose chain is Parker (initiative grain: PRD→epics) → Winston (architecture→tasks→issues) → Nora (issues→tickets, ticket writes), run sequentially as a conducted segment. [ASSUMPTION-2]
  - The generated tree is surfaced to the operator as a ratification gate at `internal`/`launch` stakes before dispatch. At `hobby`, the tree auto-dispatches.
  - The ratification artifact is the generated `goal-state` lane tree — the operator reviews lanes with `parentId` pointers, scope statements, and persona assignments before Sol dispatches. [ASSUMPTION-3]
  - After ratification (or auto-dispatch at `hobby`), Sol runs the normal dispatch flow (step 4 onward) against the tree, with tree-aware convergence checks.

### Out of scope (later phases — named, not built)

- **Phase C — Teams as lane-groups + cross-team seam.** Named teams (the `team` field driven), dependency sequencing across teams, and an integration gate (a lane with multiple `dependsOn` edges plus a human gate). `team` and `dependsOn` ship nullable-provisional in v1 and remain undriven through Phase B. Phase C is when they become load-bearing.
- **Phase D — Scale: batching + state partitioning.** Batching against the concurrency cap and partitioning the single `goal-state` file for runs larger than the cap can hold in one segment.
- **Discovery-rate decay** as a productive-vs-runaway convergence signal — a later refinement of the governor.
- **The integration gate** (Phase C, brief Q4) — a lane with multiple `dependsOn` edges plus a human gate. Distinct from the file-conflict gate. Not in Phase B even though `dependsOn` ships nullable in the schema.
- **Breadth-gate threshold tuning** for the tree shape — the breadth gate (default 12) applies to *unplanned* discovery expansions, not to the planned tree generated by decompose. Whether the planned tree generation in a single reconcile triggers the breadth gate is resolved in [ASSUMPTION-4].

### Won't this time

- **Sub-conductors / nested Sol** — permanently rejected on runtime grounds (same as Phase A PRD: the Workflow engine forbids nesting deeper than one level; a nested workflow shares the parent's cap, counter, and budget — zero throughput, structurally blocked). Not re-examined in Phase B.
- **Sol making semantic judgments.** Sol reads tree shape (parent pointers, lane status) and drives convergence checks deterministically. It never decides "should this ticket be a child of this issue?" — that is Parker/Winston/Nora's in the decompose chain.
- **Auto-merge at any scale.** Merge stays the one unconditional human gate (ADR-0011). Tree depth never changes this.
- **Sol owning greenfield spec-writing.** Sol conducts the decompose chain; it does not write the PRD or the architecture. If the operator has no PRD, they run Parker (prism-prd) and Winston (prism-architect) first, then hand the outputs to Sol's greenfield decompose step.

---

## User journeys

**1. Operator hands Sol a finalized PRD + architecture and walks away.** An operator has a Parker-authored PRD and a Winston architecture document for a new feature. They invoke Sol's greenfield mode. Sol runs the decompose chain: Parker segments the PRD into epics; Winston decomposes the architecture into issues (groups of related tasks) under each epic; Nora writes tickets under each issue. The result is a `goal-state` lane tree with `parentId` pointers linking tickets → issues → epics. Sol surfaces the tree to the operator as a ratification gate (at `internal` stakes). The operator reviews, adjusts one issue's scope note, and approves. Sol dispatches the leaf-ticket lanes (gen 0). As Clove/Briar lanes work, they may discover new work (gen 1 and beyond, per Phase A rules). The run ends with the initiative done, the convergence governor having braked any runaway discovered work, and the end-of-run report showing progress at each tree level.

**2. Parent lane waits for its children.** Sol is running a three-level tree (epic → issues → tickets). Three ticket lanes under "Issue A" complete. The "Issue A" lane cannot close until all its child tickets are `done` or `dropped`. Sol's convergence check blocks the issue lane from marking `done` until the last child resolves. Once all children close, the issue lane closes, and the epic lane can advance toward its own close once all its child issues resolve.

**3. Discovery during a tree run accrues generations correctly.** A Clove lane working on ticket T3 (gen 0) finds a bug outside its local frame and emits a signal. Sol reconciles: the new lane is gen 1 (T3.generation + 1 = 1). The gen-1 lane dispatches (under budget and K=3). It finds another issue — gen 2, dispatches. The planned tree (T1, T2, T3, Issue A, Epic 1) stays gen 0 throughout. The operator reviewing the end-of-run report sees the gen-1 and gen-2 discoveries as discovered work, distinct from the planned tree. The convergence governor did not mistake the planned tree's depth for discovery depth.

**4. Generated tree surfaced for ratification.** Sol's decompose chain produces a 12-ticket tree across 3 issues and 1 epic. At `internal` stakes, Sol surfaces the tree as a `needs-human` gate — the operator sees the lane list with `parentId` pointers, per-lane scope statements, and persona assignments. They approve. Sol dispatches the leaf lanes. The 12 planned lanes all dispatch at once as gen-0 work; the breadth gate (default 12) is not triggered because the breadth gate governs *unplanned* expansion in a single reconcile, not the initial planned dispatch. [ASSUMPTION-4]

**5. Decompose chain fails mid-chain.** Winston's architecture→tasks step returns `needs-human` because a design decision about data ownership is ambiguous. Sol surfaces the escalation to the operator with Winston's question. The operator resolves it and Sol resumes the chain from Winston's step. The partial tree (Parker's epics are already in `goal-state`) is preserved; Winston continues against them. No already-completed chain step is re-run.

---

## Requirements

### Functional

- **FR-1 — Tree-aware `goal-state` semantics.** Sol reads and drives the `parentId` field as epic→issue→ticket parent pointers. A lane's `parentId` links it to its parent lane in the flat `lanes[]`. Sol enforces: no parent lane closes as `done` while any child lane is `active`, `parked`, or otherwise unresolved.
- **FR-2 — Tree-aware convergence checks.** The end-of-run report surfaces progress at each tree level. Budget attribution in the report is per-subtree (a leaf lane's spent budget rolls up to its parent issue, which rolls up to its parent epic) for reporting purposes. The global dispatch budget (`globalBudget.spent`) remains a single counter — subtree attribution is read-time, not write-time aggregation. [ASSUMPTION-5]
- **FR-3 — Generation accounting preserves the tree-depth ≠ generation-depth invariant.** Lanes emitted by the greenfield decompose step are assigned `generation: 0` regardless of their depth in the tree. Generation accrues only from unplanned discovery (`parent.generation + 1`). Sol assigns `generation: 0` to all lanes emitted by the decompose chain, not `parent.generation + 1`.
- **FR-4 — Greenfield decompose step.** Sol supports a new decompose mode: `greenfield`. In greenfield mode, Sol accepts a PRD document and an architecture document as inputs and runs the decompose chain (Parker → Winston → Nora) as a conducted segment, producing a `goal-state` lane tree. The existing `decompose` step (hand-listed lanes) is unchanged.
- **FR-5 — Decompose chain: Parker→Winston→Nora, sequential.** Parker reads the PRD and emits epics (initiative-grain lanes with scope statements). Winston reads the PRD, architecture, and Parker's epics and emits issues (architecture-grain lanes with task breakdowns under each epic). Nora reads the issues and writes tickets (leaf lanes under each issue, DoR-draft with null estimate before ratification). Each chain step is a Sol-dispatched agent running the named persona's skill. [ASSUMPTION-2]
- **FR-6 — Ratification gate before dispatch.** After the decompose chain completes, Sol surfaces the generated lane tree (lanes with `parentId` pointers, scope statements, persona assignments, and estimated ticket list) to the operator. At `internal`/`launch` stakes, this is a `needs-human` gate — no dispatch proceeds until the operator approves. At `hobby`, the tree auto-dispatches. The operator may adjust scope statements or drop lanes before approval; Sol reconciles the adjustment before dispatching.
- **FR-7 — Greenfield decompose reuses the reconcile-delta primitive.** The decompose chain emitting a ticket tree → Sol reconciling `goal-state` → dispatching the delta is the same primitive as Phase A's discovery-loop reconcile (`lib/reconcile.md`). No new reconcile logic is introduced; the existing primitive is invoked. [ASSUMPTION-6]
- **FR-8 — Parent-lane dispatch sequencing.** Leaf lanes (tickets) are dispatched first. Parent lanes (issues, epics) do not dispatch until their children resolve. [ASSUMPTION-1] Sol's dispatch logic in the conducted segment respects this order — it walks the tree leaf-first for dispatch, but parent lanes are held as pending until their children close.
- **FR-9 — Tree-aware end-of-run report.** The end-of-run report shows the tree-structured view: each epic, its child issues, and their child tickets, with per-lane status and termination reason. Discovered work (gen 1+) is shown separately from the planned tree (gen 0) so the operator can distinguish what was planned from what was found.

### Non-functional

- **NFR-1 — Invariants preserved.** All Phase A NFRs carry forward without change: Sol dispatches, never does (writes only `goal-state` + chat); the plan is the content bus, `goal-state` is run-control (ADR-0001); merge is the one unconditional human gate (ADR-0011); autonomy is a human-set ceiling (ADR-0048). Tree depth never changes any of these.
- **NFR-2 — Additive, non-breaking migration.** Phase B extends Phase A's `goal-state` v2 schema additively. No new required fields. Runs from Phase A still parse. `parentId` is already in the schema (nullable); Phase B drives it with tree semantics, which is a logic change, not a schema change.
- **NFR-3 — Single reconcile-delta primitive.** Phase B does not fork or duplicate Phase A's reconcile-delta primitive. The greenfield decompose step is a new *caller* of `lib/reconcile.md`, not a new primitive.
- **NFR-4 — Lives within Workflow-engine limits.** The decompose chain is a conducted segment (one level deep). No design element introduces nesting beyond the one-level limit. Tree depth in `goal-state` data is not Workflow nesting.
- **NFR-5 — Config-driven seams.** The decompose chain persona mapping [ASSUMPTION-2], the ratification-gate behavior (auto-dispatch threshold by autonomy level) [ASSUMPTION-3], and any breadth-gate interaction with the planned tree [ASSUMPTION-4] are config-driven, not hardcoded.

---

## Constraints

- **Phase A must ship first.** Phase B reuses Phase A's reconcile-delta primitive, `goal-state` schema v2, and the between-segment growth loop. Phase B cannot be built against a Phase A-absent codebase. Delivery sequencing is a hard constraint.
- **Workflow engine (technical, hard — same as Phase A).** One-level nesting only. A nested workflow shares the parent's concurrency cap, agent counter, and budget. ~12 concurrent agents per run. A lane can't be injected into a running script. These constraints force the greenfield decompose chain to run as a conducted segment (sequential in a single segment), not as a nested conductor.
- **Single `goal-state` file.** Run-control is one file. Phase D concerns partitioning it; Phase B must work within the single-file model, which may constrain the maximum tree size.
- **Architectural invariants (non-negotiable).** ADR-0001, ADR-0011, ADR-0048. Same as Phase A — tree semantics do not erode them.
- **`parentId` is already in the schema.** Phase B does not introduce a schema change for the parent-pointer field; it introduces the *logic* that reads and drives it. This is a constraint on scope: if `parentId` semantics need to change shape (e.g., from a single nullable to a path), that would require a schema bump — which is out of scope for Phase B.
- **Tracker-agnostic scope.** The PRD scopes at initiative grain, tracker-agnostically. Thrive consumers use Linear; PRISM's dogfood uses GitHub issues. The Phase B decompose chain produces lanes in `goal-state`; which tracker system Nora writes to is Nora's execution concern, not a PRD scoping concern.

---

## Open questions

- **[ASSUMPTION-1]** — Parent lanes do not dispatch until all their children resolve. The stated behavior is: leaf lanes dispatch first; parent lanes are held pending until all children are `done` or `dropped`. *Default path (used until resolved):* implement child-first dispatch with parent-lane hold as described. *Resolve with Winston:* confirm whether there are cases where a parent lane should run concurrently with its children (e.g., a "meta" epic lane that tracks status), or whether child-first is the invariant.

- **[ASSUMPTION-2]** — The greenfield decompose chain is Parker → Winston → Nora, run sequentially. Parker emits epics, Winston emits issues, Nora writes ticket lanes. *Default path (used until resolved):* implement the chain in this order. *Resolve with Winston:* confirm the chain order and persona ownership. The vision brief (Q6) names this as an explicit open; the chain is a plausible answer but not yet formally resolved. An alternative: Parker + Winston collapse into a single Winston step (Winston reads the PRD directly). The PRD recommends the chain for grain separation, but Winston may advise collapsing it.

- **[ASSUMPTION-3]** — The ratification gate surfaces the generated lane tree as a `goal-state`-readable artifact (lanes with `parentId`, scope statements, persona assignments). The operator reviews and approves before dispatch. *Default path (used until resolved):* surface the tree in the same format as the end-of-run report (text summary in chat + `goal-state` readable). *Resolve with Winston:* confirm what the ratification artifact looks like in practice — is it a chat-readable summary, a generated document, or a structured diff against the operator's PRD? The artifact's form affects how operators trust the tree.

- **[ASSUMPTION-4]** — The breadth gate (default 12) governs unplanned discovery expansions, not the planned tree generated by the decompose step. A greenfield tree of 30 tickets dispatched after ratification does not trigger the breadth gate because it's a planned, ratified dispatch, not an unplanned single-reconcile expansion. *Default path (used until resolved):* exclude the planned post-ratification dispatch from the breadth-gate count. *Resolve with Winston:* confirm this is correct and does not create a loophole where a very large planned tree bypasses the gate that was designed to stop runaway growth. The distinction (planned + ratified vs. unplanned discovery) is the load-bearing invariant.

- **[ASSUMPTION-5]** — Subtree budget attribution is read-time aggregation (summing `globalBudget.spent` contributions by subtree at report time), not a new write-time counter per lane. A single global counter is the primary brake; subtree attribution is for reporting only. *Default path (used until resolved):* implement subtree attribution as read-time reporting math. *Resolve with Winston:* confirm that read-time aggregation is sufficient and that no per-lane budget counter is needed in the schema.

- **[ASSUMPTION-6]** — Greenfield decompose reuses `lib/reconcile.md` without modification. The chain emitting a ticket tree is the "something emits tickets" side; Sol reconciling `goal-state` and dispatching the delta is the same primitive. *Default path (used until resolved):* invoke `lib/reconcile.md` directly from the decompose step. *Resolve with Winston:* confirm no extension to the primitive is needed for tree-shaped input (the current primitive handles flat signals; a ticket tree may need a tree-specific reconcile path, which would be an additive extension to `lib/reconcile.md`, not a fork).

- **[ASSUMPTION-7]** — Decompose chain failure/resume: if the chain fails mid-step (e.g., Winston returns `needs-human`), the partial tree is preserved in `goal-state` and the chain resumes from the failed step after the human gate clears. `pendingTicketCommit` semantics from Phase A apply to Nora's ticket writes in the chain. *Default path (used until resolved):* use the existing crash-safety pattern (write `goal-state` at each chain step; resume from the last written state). *Resolve with Winston:* confirm that the crash-safety pattern for the decompose chain is the same as the decision-box pattern, or whether the multi-step chain requires a new state machine in `goal-state`.

---

## Stakeholders

- **Owner / decision-maker — Hunter.** Builds PRISM, sets direction, ratifies this PRD and the Phase B plan, clears the ratification gate before dispatch, and sets the autonomy ceiling per run.
- **Implementing personas.** Winston (Phase B epic plan, ADR candidates if tree semantics introduce new architectural decisions, and the blast-radius reads on the `[ASSUMPTION-N]` gaps above), Parker (participates in the decompose chain), Nora (ticket writes in the chain and the ratification gate), Clove (implementation of tree-aware dispatch and the decompose chain step), Briar/Eric (review).
- **Affected — future PRISM-consuming teams (SPC).** Inherit the capability and the tree-aware `goal-state`. Config-driven seams (decompose chain persona mapping, ratification gate thresholds) must be tunable rather than hardcoded.
- **Sign-off.** Hunter ratifies scope and any ADRs that emerge from Winston's plan authoring. Merge sign-off is human and unconditional (ADR-0011) — never delegated to Sol.

---

## Decision log link

See [decision-log.md](./sol-conductor-phase-b-hierarchy.decision-log.md).
