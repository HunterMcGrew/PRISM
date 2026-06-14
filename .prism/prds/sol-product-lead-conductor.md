---
slug: sol-product-lead-conductor
title: "Sol as a self-growing product-lead conductor"
mode: greenfield
stakes: internal
status: finalized
created: 2026-06-13T23:29:59Z
lastEdited: 2026-06-13T23:29:59Z
stepsCompleted: ["step-01-init", "greenfield-step-02-stakes", "greenfield-step-03-mode", "greenfield-step-04-draft", "greenfield-step-05-decision-log", "step-06-review", "step-07-finalize"]
linearInitiativeId: null
---

## Initiative description

Evolve Sol (the PRISM Conductor) from a single-team lead over a flat, fixed set of parallel lanes into a self-growing, multi-team product-lead conductor. v1 closes the discovery loop — the fleet grows itself mid-run as agents find new work — governed by a two-axis convergence brake. Teams, hierarchy, and greenfield specs→ticket-tree are named as later phases. Sourced from §7 of [`sol-product-lead-vision-brief.md`](../plans/sol-product-lead-vision-brief.md), which holds the resolved v1 architecture for the discovery loop and convergence brake.

---

## Problem statement

Sol today conducts a **flat, fixed lane set**. The lanes are the input — hand-listed at decompose time — and the run ends when those lanes finish. But real product work discovers itself: agents implementing, reviewing, and debugging surface bugs, follow-ups, and gaps that nobody could enumerate up front. Today that discovered work becomes a *separate future run* — `found-followup-work → Nora` produces a ticket that waits for a human to notice it and start another run. The fleet cannot grow during the run it was found in.

The consequence: a single Sol run can't take a goal from "start" to "actually done." It stops at the boundary of what was visible at decompose time, and everything found along the way is parked for later human attention. The operator who wanted to hand Sol a goal and walk away still has to come back, triage a backlog of spin-out tickets, and kick off follow-on runs.

**Why now:** the find-and-route half of the loop already exists. `found-bug` and `found-followup-work` are defined report-back signals; Nora already owns ticket creation; confidence-gated autonomy already lets gate owners self-clear or escalate (ADR-0048). Closing the loop is the smallest net-new capability that unlocks "drive this to done while I'm away" — and it is the **foundation every later phase reuses**: hierarchy, teams, and greenfield decompose all ride the same reconcile-delta primitive built here.

The problem is two-sided. Closing the loop without braking it produces a new failure mode: an autonomously self-growing fleet can run away — work that finds work that finds work, or sixteen lanes finding the same broken helper, burning budget unsupervised overnight. v1 must **close the loop and govern its convergence** in the same delivery, or it ships a hazard.

---

## Target users

- **PRISM operators (primary).** Developers running Sol — Hunter at Thrive today, PRISM-consuming teams (SPC) next. They hand Sol a goal and want it driven to done *including the work that surfaces along the way*, without babysitting each discovered item or running a second triage pass afterward.
- **The run owner / human gate.** Whoever sets the autonomy ceiling for the run and clears the gates Sol escalates to. They need every autonomous decision to stay under a ceiling they set on purpose, and every spin-out to be visible rather than orphaned in a backlog.
- **The PRISM personas, as parties to the run-control contract.** Nora (ticket creation now happens *in-loop*), Clove/Briar/Eric/Sasha (emitters of discovered work behind a scope-fit pre-filter), and Winston (blast-radius reads inside the decision box). Their interaction contract with Sol changes; the PRD names how.
- **Future PRISM-consuming teams (secondary).** They inherit the capability and the `goal-state` v2 schema. Config-driven seams (autonomy mapping, governor thresholds) must be tunable per team rather than hardcoded to Thrive's defaults.

---

## Success metrics

How we'll know v1 solved the problem — observable from the end-of-run report and `goal-state` inspection:

- **The fleet grows itself.** A run that starts with *N* origin lanes can complete with more than *N* lanes, where the additional lanes were discovered, ticketed-or-folded, and dispatched **within the same run** — with no human manually adding a lane.
- **Discovery is deduplicated.** When multiple lanes surface the same structured target, Sol dispatches **one** decision unit, not one per finder. The registry collapses the "many lanes found the same thing" case before it spends budget.
- **No runaway.** Every completed run records a termination reason of `budget-exhausted` or `converged` (no new work); zero runs end with a `killed` or unset reason. No lane auto-dispatches past generation *K* without a human gate, and no single reconcile auto-dispatches a large expansion past the breadth gate.
- **The autonomy ceiling holds.** At `internal`/`launch` stakes, zero Linear tickets are auto-committed above trivial without a human gate; auto-created tickets are DoR-draft (estimate null) and flagged for ratification; every spin-out appears in the end-of-run report.
- **Crash-safe resume.** A run interrupted mid-decision resumes deterministically — no double-committed tickets, no lost signals.

These are outcome statements at initiative grain, not test assertions — Reese and Briar derive the verifiable checklist downstream. There is no separate telemetry surface in v1 ([ASSUMPTION-1]).

---

## Scope

### In scope (v1)

- **The discovery loop on the existing flat fleet (Phase A).** find → Sol reconciles `goal-state` between segments → Nora-led decision → Sol dispatches the new lane → which may discover more. The lane set becomes an *output* of the run, not only its input.
- **The reconcile-delta primitive.** Growth happens **between** Workflow segments (a lane can't be injected into a running script); `goal-state` is the bus across the boundary and the next segment's lane set is recomputed from it. Built once here; reused by every later phase.
- **The discovered-work decision box** (deferred-commit, Nora-led). Dispositions map 1:1 onto [`followup-scope.md`](../rules/followup-scope.md)'s three tiers — fold-into-active-PR / follow-up-PR-no-ticket / new-ticket — plus `drop`.
- **The two-axis convergence governor.** Dispatch budget (primary, depth-agnostic brake); generation cap **K = 3** default (lineage signal + soft gate, tunable by autonomy); breadth gate (**default 12**, configurable — surfaces a large single-reconcile expansion to a human).
- **The registry + structural dedup at the door.** Sol holds a live registry (`signals[]` + `lanes[]`) and dedups structurally by `target`; semantic "same issue?" calls route to Nora.
- **`goal-state` schema v2** (additive, nullable, old runs still parse). v2 ships the full additive field set; **v1 logic drives only the discovery-loop subset** — `generation`, per-lane `scope`, the structured `target` / `disposition` / `processedAt` on signals, `pendingTicketCommit`, and the typed escalation reason. `parentId` ships in v1 carrying **discovery lineage** (it's how generation is computed: `parent.generation + 1`); its epic→issue→ticket *tree* meaning arrives in Phase B. `team` and `dependsOn` ship as nullable schema-forward but are not driven until Phase C ([ASSUMPTION-2]).

### Out of scope (later phases — named, not built)

- **Phase B — Hierarchy + greenfield decompose.** epic→issue→ticket tree *semantics* in `goal-state`, and a specs (PRD + architecture) → ticket-tree step. Reuses Phase A's reconcile-delta primitive, so it is cheaper once v1 ships. (Vision Q6.)
- **Phase C — Teams as lane-groups + cross-team seam.** Named teams (the `team` field driven), dependency sequencing across teams, and an integration gate (a lane with multiple `dependsOn` edges plus a human gate, distinct from the file-conflict gate). No sub-conductors. (Vision Q4.)
- **Phase D — Scale: batching + state partitioning.** Batching against the concurrency cap and partitioning the single `goal-state` file.
- **Discovery-rate decay** as a productive-vs-runaway signal — a later convergence refinement.

### Won't this time

- **Sub-conductors / nested Sol** — the one genuinely rejected alternative. Permanently rejected on runtime grounds, not postponed: the Workflow engine forbids nesting deeper than one level (`workflow()` inside a child throws), and a nested workflow *shares the parent's concurrency cap, agent counter, and budget* — so a sub-conductor is structurally blocked and buys **zero** throughput. Teams are data on the flat lane list instead. (ADR candidate: lane-groups over sub-conductors.)

The next two are standing invariants restated for the self-growth context — not scope the team weighed, but properties self-growth must not erode:

- **Sol making semantic judgments.** Sol tracks and structurally-dedups; it never decides "are these the same issue?" or "does this earn a ticket?" — those are Nora's. Load-bearing and permanent, not a v1 simplification.
- **Auto-merge at any scale.** Merge stays the one unconditional human gate (ADR-0011). Self-growth never reaches into merge.

---

## User journeys

**1. The loop closes within one run.** An operator hands Sol a goal at `internal` autonomy and walks away. A Clove lane, mid-implementation, finds a bug outside its local frame. Clove runs the scope-fit pre-filter, decides it's not a trivial inline fix, and emits `found-bug` with a structured `target`. At the segment boundary Sol reconciles: it registers the signal, finds no in-flight duplicate, and dispatches one Nora-led decision. Nora judges it a new-ticket case, drafts a DoR-draft ticket, and — because the autonomy ceiling is `internal` — batches the commit into a human gate. The operator returns to an end-of-run report listing the goal as done plus the discovered bug as a ratified-pending spin-out lane that ran to completion.

**2. Dedup saves the budget.** Three separate lanes all trip over the same broken shared helper and each emits a signal with the same `target`. Sol's structural dedup at the door matches them, **attaches** the two later signals to the first instead of re-dispatching, and sends a single decision unit. Budget buys one fix, not three redundant investigations.

**3. The brake engages.** A run keeps finding work. Three things can stop it, in priority order: the **dispatch budget** exhausts → Sol parks the remaining lanes and reports (the "while I'm sleeping" backstop, depth-agnostic); or a lane reaches **generation K=3** and its finds would be gen 4 → captured but parked to a human gate; or a single reconcile yields more new lanes than the breadth gate allows (default 12) → the breadth gate surfaces the expansion to a human rather than auto-dispatching it.

**4. The uncertain decision, and a crash.** A discovered follow-up carries blast-radius uncertainty. Nora drafts the ticket but defers the Linear write and returns `{ disposition, draftTicket, escalationReason: "blast-radius" }`. Sol routes a Winston read; Winston returns its assessment; Sol dispatches Nora a second time to finalize with it. `goal-state` is written at each step (routed → winston-verdict → finalized) with `pendingTicketCommit` set, so a crash mid-decision resumes deterministically — no double-commit, no lost draft.

**5. Cross-lane fold-in.** A discovered fix belongs to a sibling lane that is already **done** — its worktree is cleaned, so it's never reopened. Sol spawns a new **follow-up-PR lane** (branch/PR conventions per the ported rule), which must link the origin PR, **verify the diagnosis before implementing**, and **fix the test gap** that let the bug through. If instead the fold-in overlaps a **parked or active** sibling's still-live worktree, the conflict gate (now checking pending-vs-active, not only pending-vs-pending) can't auto-resolve two worktrees on the same code and routes to a **human gate**.

---

## Requirements

### Functional

- **FR-1 — Between-segment reconcile.** Sol recomputes the next segment's lane set from `goal-state` (`signals[]` + `lanes[]`) at each segment boundary. Discovery-loop growth and (later) greenfield decompose are the **same** reconcile-delta primitive — build it once.
- **FR-2 — Emit behind a pre-filter.** Workers (Clove, Briar, Eric, Sasha) run a lightweight scope-fit pre-filter (a cheap subset of Nora's four-signal gate; exact criteria TBD per [ASSUMPTION-4]) before emitting, so trivial noise never reaches the queue. Trivial + local-frame work is fixed inline per `code-standards.md § Refactor scope`. One widened case: "a dependency of code I'm currently writing is broken" → emit the signal **and** proceed on a documented stub so the lane doesn't stall. Stated tiebreaker: **over-emit < under-emit**.
- **FR-3 — Batch, dedup, dispatch one.** Sol batches a segment's signals, structurally dedups against the registry by `target`, attaches obvious duplicates, and dispatches **one** Nora-led scope-decision unit per distinct target. Sol never classifies the work.
- **FR-4 — Deferred-commit decision box.** Nora evaluates a signal against `followup-scope.md`'s four-signal gate (file overlap, subject-matter adjacency, size, persona alignment), which resolves to one of the three dispositions plus `drop`, **drafts** the ticket, **defers** the Linear write, and returns `{ disposition, draftTicket, escalationReason? }`. No escalation → Nora finalizes (committing only if warranted). Blast-radius escalation → Sol routes a Winston read → Nora finalizes with it (the uncertain path is two Nora dispatches around one Winston). `goal-state` is written at each intermediate step and `pendingTicketCommit` is set for crash-safe resume.
- **FR-5 — Disposition mapping + labor split.** Dispositions are `followup-scope.md`'s three tiers plus `drop`. **Nora** runs the four-signal scope judgment; **Sol** picks fold-into-active vs follow-up-PR from the target lane's merge status (a deterministic run-state lookup, not interpretation); **Winston** is consulted only on blast-radius.
- **FR-6 — Cross-lane fold-in rules.** A fold-in targeting a *done* sibling spawns a new follow-up-PR lane with required artifacts: links the origin PR, verifies the diagnosis before implementing, and fixes the missing test that let the bug through. The conflict gate checks pending-vs-**active** lanes (not only pending-vs-pending); a fold-in overlapping a **parked** lane's live worktree routes to a human gate.
- **FR-7 — Two-axis convergence governor.** The **dispatch budget** is the primary, depth-agnostic brake (caps total work regardless of shape). The **generation cap** K=3 (tunable by autonomy) auto-dispatches gen 1–3; a gen-3 lane's finds (gen 4) are captured but parked to a human gate. Generation is **lineage** (`parent.generation + 1`), not a wall-clock wave. The **breadth gate** (default 12, configurable) surfaces a large single-reconcile expansion to a human.
- **FR-8 — Autonomy ↔ confirmation gate.** The autonomy policy is the explicit, up-front opt-out of Nora's per-write confirmation: `hobby` = autonomous ticket writes; `internal`/`launch` = ticket commits above trivial batch into a human gate (Nora returns the draft as `needs-human`). Auto-created tickets are DoR-draft (estimate null), flagged for human ratification before a future run picks them up; spin-outs are surfaced in the end-of-run report so they aren't orphaned.
- **FR-9 — Sol holds the registry.** Sol maintains the live registry of everything found and in-flight (it *is* `signals[]` + `lanes[]`) and performs structural dedup at the door — the same class of check as the conflict gate's file-overlap test. Semantic "are these the same issue?" calls go to Nora.

### Non-functional

- **NFR-1 — Invariants preserved.** Sol dispatches, never does (writes only `goal-state` + chat). The plan is the content bus; `goal-state` is run-control (ADR-0001). Merge is the one unconditional human gate (ADR-0011). Autonomy is a human-set ceiling — agents escalate above it, never auto-clear below it (ADR-0048).
- **NFR-2 — Additive, non-breaking migration.** `goal-state` v2 fields are additive and nullable; runs written against the v1 schema still parse. No breaking migration step. Rollback is abandon-not-migrate: a v2 run interrupted by a revert is parked and reported, and any in-flight `pendingTicketCommit` entries are surfaced to the human rather than auto-resolved (confirm with Winston that no down-migration step is needed).
- **NFR-3 — Deterministic crash-safety.** A run interrupted mid-decision resumes without double-committing a ticket or losing a signal, via the typed escalation reason (`blast-radius` | `scope-fit`), `pendingTicketCommit`, and per-step `goal-state` writes.
- **NFR-4 — Lives within Workflow-engine limits.** No design element assumes deeper than one-level nesting, more than the per-run concurrency cap (see Constraints), or a budget/counter not shared across a nested run.
- **NFR-5 — Failure-mode bias.** The pre-filter and governor bias toward **over-emit over under-emit** — a borderline find is emitted (and deduped/dropped downstream) rather than silently lost.

---

## Constraints

- **Workflow engine (technical, hard).** One-level nesting only (`workflow()` inside a child throws). A nested workflow shares the parent's concurrency cap, agent counter, and budget. ~12 concurrent agents per run. A lane can't be injected into a running script — growth only happens *between* segments. These three facts are what forced the lane-groups team model and the between-segment reconcile; the design is built around them, not against them. *Open for Winston:* the breadth-gate default (12) and the concurrency cap (~12) are the same order of magnitude — confirm whether a near-cap reconcile expansion serializes against the cap, or whether the breadth gate should sit below it.
- **Single `goal-state` file.** Run-control is one file (the bus across segment boundaries). Partitioning it is a Phase D concern; v1 must work within the single-file model.
- **Architectural invariants (non-negotiable).** ADR-0001 (plan is content bus), ADR-0011 (merge is the human gate), ADR-0048 (confidence-gated autonomy). Listed in NFR-1; they bound every design choice.
- **Fixed-input dependency.** [`followup-scope.md`](../rules/followup-scope.md) is a landed, fixed input — the decision box's dispositions *are* its three tiers, and Nora runs *its* four-signal gate. The PRD does not re-specify the rule.
- **Delivery sequencing.** v1 must ship before Phases B/C/D, which reuse its reconcile-delta primitive.
- **Delivery-state caveat (not a design constraint).** The `followup-scope.md` port is currently uncommitted and scope-mixed on `hmcgrew/issue-64-slim-agents`; how it lands (commit there vs. its own branch) is an open delivery decision, separate from this PRD's design.

---

## Open questions

- **[ASSUMPTION-1]** — Success metrics are observed via the end-of-run report and `goal-state` inspection; there is no separate telemetry or dashboard surface in v1. *Resolve before merge: confirm no instrumentation requirement.*
- **[ASSUMPTION-2]** — v2 ships the full additive nullable field set even though `team` and `dependsOn` aren't driven until Phase C, and `parentId`'s tree semantics arrive in Phase B. The bet is that one additive migration now is cheaper than two. *Resolve with Winston: confirm shipping later-phase fields as nullable-now vs. adding them with their phase.*
- **[ASSUMPTION-3]** — The autonomy-policy → governor-threshold mapping (does `launch` lower K below 3? does it tighten the breadth gate below 12?) is not yet specified. v1 ships K=3 / breadth=12 as the defaults across all levels; per-level tuning is TBD. *Resolve with Winston during plan authoring.*
- **[ASSUMPTION-4]** — The worker scope-fit pre-filter (FR-2) is a lightweight heuristic — a cheap subset of Nora's four-signal gate — not a full Nora-grade evaluation. The exact pre-filter criteria are TBD. *Resolve with Winston/Clove in the plan.*
- **[ASSUMPTION-5]** — The "documented stub" convention for the broken-dependency case (FR-2: worker proceeds on a stub while emitting) is unspecified — stub format, how the dependent lane reconciles when the real fix lands. *Resolve with Winston/Clove in the plan.*
- **[ASSUMPTION-6]** — The dispatch-budget default (max total dispatches per self-growing run) is unspecified. The current `goal-state` schema carries `maxDispatches: 100`, but v1's default for runs that grow themselves is TBD — and the budget is the primary brake, so the default is load-bearing. *Resolve with Winston during plan authoring.*

*Resolved during calibration (no longer open):* breadth-gate threshold = configurable, default 12.

---

## Stakeholders

- **Owner / decision-maker — Hunter.** Builds PRISM, sets direction, sets the autonomy ceiling per run, clears human gates, and ratifies this PRD, the two ADRs, and the epic scope before implementation.
- **Implementing personas.** Winston (the two ADRs, the epic plan, and the blast-radius reads inside the box), Clove (the loop, the governor, the schema deltas), Nora (the decision-box logic and DoR-draft tickets), Briar/Eric (review), Sasha (debug emissions through the box).
- **Affected — future PRISM-consuming teams (SPC).** Inherit the capability and the `goal-state` v2 schema; depend on the governor thresholds and autonomy mapping being config-driven rather than Thrive-hardcoded.
- **Sign-off.** Hunter ratifies scope and the ADRs. Merge sign-off is human and unconditional (ADR-0011) — never delegated to Sol.

---

## Decision log link

See [decision-log.md](./sol-product-lead-conductor.decision-log.md).
