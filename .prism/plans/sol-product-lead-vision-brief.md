# Vision Brief: Sol as a multi-team product-lead conductor

> **Status:** pre-PRD discussion brief. Input to a Winston architecture conversation, then a Parker PRD. Not a plan, not an ADR — a shared starting point so the architecture discussion runs against a written target instead of a moving one.
>
> **Not committed yet** — working artifact. Gets a durable home (PRD + epic plan) once scope is calibrated.

---

## 1. The vision in one paragraph

Sol should conduct across the full range of real product work — from "fix these three tickets" up to "here's the PRD and architecture for a fresh product, go build it." The agents underneath plan, ticket, implement, review, and **make their own judgment calls when confident**, pausing to a human gate only when they genuinely aren't. As agents work they **discover new work** (bugs, follow-ups, gaps); they report it up, Sol routes it to Nora, Nora applies real PM/ticketing judgment to create tickets, and Sol dispatches those as new work — so the fleet **grows itself** during the run. And because real products are built by specialized teams in parallel, Sol should be able to run a **backend team** and a **frontend team** (and more) at once, each with its own flow and queue, while Sol owns the seam between them.

## 2. What this changes relative to Sol today

Sol today is a strong **single-team lead over a flat, fixed set of parallel tickets**. The lane engine is solid and reusable. The vision adds an **org layer** on top of it plus a **dynamic work-graph**.

### Already exists (reusable primitives)
- **Confidence-gated autonomy.** The `launch` / `internal` / `hobby` autonomy policy already means gate owners self-clear when confident and escalate (`needs-human`) when not. The pause-and-report-to-human behavior the vision wants is the core of how Sol already thinks (ADR-0048). The lane that "parks and reports needs-human" already works.
- **The find-and-route half of the discovery loop.** `found-bug → Sasha` and `found-followup-work → Nora` are already defined report-back signals (`lib/report-back.md`). An agent that finds work already knows how to tell Sol, and Sol already knows Nora owns ticket creation.
- **Per-lane full lifecycle, containment, isolation.** Each lane runs PRD→…→docs in its own worktree; one lane failing parks without halting the rest; file-overlap lanes serialize (conflict gate); human-gate pauses batch into one report.

### Net-new (the capability gap)
1. **Close the discovery loop — the fleet grows mid-run.** Today a `found-followup-work → Nora` ticket becomes a *separate future run*. The vision re-injects Nora's new ticket as a **live lane in the same run**: discover → Sol → Nora tickets (with her DoR/scope-fit gate) → Sol dispatches the new lane → which may discover more. The lane set is an *output* of the run, not just its input.
2. **Greenfield decompose from specs.** "Here's the PRD + architecture, build it" → agents generate the **whole ticket tree** (epics → issues → tickets), not a hand-listed lane set. Today `decompose` produces sibling lanes from an already-scoped goal; this needs a specs-in → ticket-tree-out step.
3. **Teams.** Named groups (backend, frontend, …), each with its own flow, its own queue, possibly its own model tiers, building in parallel. Lanes are homogeneous today — there's no team grouping.
4. **Cross-team seam.** Dependency sequencing ("frontend lanes wait on the backend API contract landing") plus an **integration gate** where two teams' work meets and is tested together. The conflict gate only de-conflicts files today.
5. **Scale + delegation depth.** Dozens of tickets across teams strain one flat conductor. Likely needs **team-lead sub-conductors** under Sol. Runtime constraint to design around: the Workflow engine caps concurrency (~a dozen) and nests **one level only**.

## 3. The invariants any design must preserve

- **Sol dispatches, never does.** No code (Clove), no Linear/tickets (Nora), no merge (human). Sol writes only run-control state + chat. Teams/sub-conductors must keep this — a sub-conductor still dispatches, never does.
- **The plan is the content bus; goal-state is run-control.** Personas talk through branch plans (ADR-0001). Any hierarchy/team state is run-control (goal-state), not work content.
- **Merge is the one unconditional human gate** (ADR-0011, branch protection). Scale never auto-merges.
- **Autonomy is a human-set ceiling.** Agents escalate above it, never auto-clear below it. Whatever per-team granularity emerges must keep that property.

## 4. Open questions for Winston (the real architecture decisions)

1. **Teams: sub-conductors or lane-groups?** Is a "team" a nested Sol (its own conductor running its own fleet) or just a labeled grouping of lanes under one conductor with shared scheduling? The Workflow one-level-nesting cap and concurrency cap push on this. What's the data model — a `teams[]` layer over `lanes[]`, or recursion?
2. **How does the fleet grow mid-run?** What's the mechanism for adding a lane to a live run — a re-decompose segment between Workflow segments? How does goal-state represent dynamically-added lanes, and how does Nora's DoR gate sit in the loop without stalling everything?
3. **goal-state schema evolution.** Hierarchy (epic→issue→ticket tree), team grouping, and dependency edges all need representation. How much can ride the existing flat `lanes[]` (e.g. with `parentId` / `team` / `dependsOn` fields) vs. needing a new structure? Migration/versioning of the schema.
4. **Cross-team dependency + integration gate.** How are dependencies declared and enforced (a lane blocks until another lane/contract lands)? What does the integration gate look like as a phase — who owns it (a new persona? Winston? a QA integration pass?), and where does it sit in the lifecycle?
5. **Scale ceiling.** Concurrency cap (~12) and a single goal-state file vs. dozens of tickets across teams. Batching strategy, sub-run isolation, state-file partitioning.
6. **Greenfield decompose.** Specs (PRD + architecture) → ticket tree. Is this a new upstream step before `decompose`, and which persona owns "turn specs into an epic/ticket tree" — Parker (initiative grain), Winston (architecture → tasks), Nora (tickets), or a chain?
7. **Budget model across teams/epics.** Today there's one global dispatch budget. Does it become per-team / per-epic nested budgets? How do strikes and escalation compose across a hierarchy?
8. **Autonomy granularity.** Is one run-wide autonomy policy enough, or do teams/epics need their own ceilings (e.g. backend on `hobby`, a risky frontend lane on `internal`)?

## 5. Phasing — a strawman for the scope conversation (Winston/Parker to calibrate)

Not a commitment — a starting point for "what's v1."

- **Phase A — Dynamic discovery loop on the existing flat fleet.** Close the loop (find → Nora ticket → live lane) without teams or hierarchy. Highest value, smallest blast radius, exercises the growth mechanism.
- **Phase B — Hierarchy.** epic→issue→ticket tree in goal-state + greenfield decompose from specs.
- **Phase C — Teams + cross-team seam.** Named teams, parallel flows, dependency sequencing, integration gate.
- **Phase D — Delegation depth + scale.** Team-lead sub-conductors, nested budgets, state partitioning.

Open for debate: whether teams (C) actually need sub-conductors (D), or whether lane-groups + the dependency model get most of the value without nesting.

## 6. What Winston should produce from the discussion

- A recommended **team model** (sub-conductor vs lane-group) with the tradeoff named.
- The **goal-state schema deltas** (hierarchy, teams, dependencies, growth).
- The **cross-team dependency + integration gate** design.
- A **phasing recommendation** (what's v1) feeding the Parker PRD.
- Any **ADR candidates** (the team model almost certainly is one).

---

## 7. Winston's resolutions (architecture conversation — input to Parker)

Resolved in the Winston conversation, pressure-tested by Briar/Nora/Clove. This section is the design record Parker builds the PRD from.

### 7.1 Team model — lane-groups, single conductor (ADR candidate)

Sol stays the single conductor. A "team" is **data, not a control structure** — `team` / `parentId` / `dependsOn` fields on the existing flat `lanes[]`. No sub-conductors.

- **Why, grounded in the runtime:** the Workflow engine forbids nesting deeper than one level (a `workflow()` inside a child throws), and a nested workflow *shares the parent's concurrency cap, agent counter, and budget*. So a sub-conductor is both structurally blocked and buys **zero** throughput — the ~12-concurrency cap is per-run and nesting doesn't raise it. Sub-conductors add nested-budget/escalation complexity (the brief's Q7/Q8) for no gain.
- **Consequence:** Phase C (teams) does **not** need Phase D (sub-conductors). Rename D to "Scale: batching + state partitioning" — batching against the concurrency cap is the real scale answer.

### 7.2 goal-state schema deltas (v2 — additive, nullable, old runs still parse)

- `team: string | null`, `parentId: laneId | null` (epic→issue→ticket tree = **parent pointers over the flat list**, not nested objects), `dependsOn: laneId[]`.
- `generation: number` — per-lane; `parent.generation + 1`; origin lanes are gen 0.
- Per-lane `scope` statement (one line: "implement X; do not touch shared utils") — lets workers self-check drift.
- On `signals[]`: a **structured `target`** (`file` / `symbol` / `scopeSlug` / `errorSignature?`) in addition to the prose note, plus `disposition` and `processedAt`. The structured target is what enables Sol's registry dedup *and* a non-vague ticket draft.
- `pendingTicketCommit: boolean` on lanes (crash-safety, see 7.4).
- Escalation carries a **typed reason** (`blast-radius` | `scope-fit`), not a bare `confident` boolean — drives deterministic routing and resume disambiguation.

### 7.3 Growth loop — between-segment reconcile; Sol holds the registry

- Growth happens **between** Workflow segments (you can't inject a lane into a running script). goal-state is the bus across the boundary; the next segment's lane set is recomputed from it. This rides Sol's existing segment cadence.
- **Sol holds a live registry** of everything found and in-flight (it's `signals[]` + `lanes[]`) and does **structural dedup at the door** — same class of check as the conflict gate's file-overlap test. Before dispatching a decision for a new signal, Sol matches it structurally (same `target`) against in-flight / already-disposed entries and *attaches* obvious dups instead of re-dispatching. This is conducting (air-traffic control), not interpreting.
- **The line:** Sol tracks and structurally-dedups; **semantic** "are these the same issue?" calls go to Nora. Sol never semantically-judges.
- Discovery-loop and greenfield-decompose are the **same reconcile-delta primitive** (something emits tickets → Sol reconciles goal-state → dispatches the delta) — build it once.

### 7.4 Discovered-work decision box

- **Trivial + local frame** → the worker fixes inline (`code-standards.md § Refactor scope`). Widen the local frame for one case Clove flagged: "a dependency of code I'm currently writing is broken" → **emit the signal AND proceed on a documented stub** so the lane doesn't stall.
- **Otherwise** → emit `found-followup-work` / `found-bug` (with the structured `target`). The worker runs a **lightweight scope-fit pre-filter before emitting** so trivial noise never reaches the queue. Preferred failure mode, stated as a tiebreaker: **over-emit < under-emit**.
- **Emitter-agnostic:** Briar/Eric/Sasha emit follow-up signals too — the box is not Clove-specific.
- Sol **batches** a segment's signals, structural-dedups against the registry, and dispatches **one** Nora-led scope-decision unit. Sol never classifies.
- **Box internals (deferred-commit):** Nora evaluates against the ported follow-up rule's four-signal gate, **drafts** the ticket but **defers the Linear write**, returns `{ disposition, draftTicket, escalationReason? }`. If no escalation → Nora finalizes (commits only if warranted) and returns. If blast-radius escalation → Winston returns a read → Nora finalizes with it. Because Nora owns the Linear pen, the uncertain path is **two Nora dispatches around one Winston**. Write goal-state at each intermediate step (routed → winston-verdict → finalized) and set `pendingTicketCommit` so a resume after a mid-decision crash is deterministic.
- **Dispositions map 1:1 onto the ported `followup-scope.md` three tiers:** fold-into-active-PR (pre-merge, same-scope) / follow-up-PR-no-ticket (post-merge, same-scope) / new-ticket (scope splits) — plus `drop`. **Labor split:** Nora runs the four-signal scope judgment; **Sol picks fold-into-active vs follow-up-PR from the target lane's merge status** (a run-state lookup, deterministic — not interpretation); Winston only on blast-radius.
- **Cross-lane fold-in:** a *done* sibling is never reopened (worktree already cleaned) → spawn a new follow-up-PR lane (branch/PR conventions per the ported rule). New-lane artifacts required: PR links to the origin PR, **verify the diagnosis before implementing**, **fix the test gap** that missed the bug. A *parked/active* sibling is the gap Briar found — the conflict gate must check pending-vs-**active** lanes (not just pending-vs-pending), and a fold-in overlapping a **parked** lane's still-live worktree routes to a **human gate** (the conflict gate can't auto-resolve two worktrees on the same code).

### 7.5 Convergence — two axes

- **Depth:** generation cap **K = 3 default** (origin = 0; gen 1/2/3 auto-dispatch; a gen-3 lane's finds = gen 4 → captured but **park to a human gate**). Tunable by autonomy policy. Generation is **lineage** (parent.gen + 1), not a wall-clock wave — a late-returning gen-0 lane's find is gen 1 regardless of what else started.
- **Breadth + total (the real backstop):** the **dispatch budget** is depth-agnostic and primary — it's the "while I'm sleeping" brake (caps total work whatever the shape). The **dedup registry** makes the budget buy real progress (collapses the "16 lanes found the same thing" case). A **breadth gate** surfaces a large single-reconcile expansion (≈ a dozen distinct new lanes — threshold TBD) to the human rather than auto-dispatching.
- Generation is a **reported signal + soft gate**, not the load-bearing guarantee; the budget is. **Tree depth (epic→issue→ticket) ≠ generation depth** — the planned tree is all gen 0; generations accrue only from *unplanned discovery* during build.
- **Future refinement (later phase):** discovery-rate decay as the productive-vs-runaway signal (a converging run finds less new work per completed lane; a runaway finds as much or more).

### 7.6 Autonomy ↔ Nora's confirmation gate

The autonomy policy is the **explicit, up-front opt-out** of Nora's per-write confirmation. `hobby` = autonomous ticket writes; `internal` / `launch` = ticket commits above trivial **batch into a human gate** (Nora returns the draft as `needs-human`). Auto-created tickets are **DoR-draft** (estimate null), flagged for human ratification before a future run picks them up; **spin-outs are surfaced in the end-of-run report** so they aren't orphaned in the backlog.

### 7.7 Invariants preserved (from §3)

Sol dispatches, never does (writes only goal-state + chat). Plan is the content bus; goal-state is run-control. Merge is the one unconditional human gate. Autonomy is a human-set ceiling — escalate above, never auto-clear below.

### 7.8 Phasing recommendation

- **v1 = Phase A** (dynamic discovery loop on the existing flat fleet) + the full decision box + the two-axis convergence governor + the registry/dedup. Highest value, smallest blast radius.
- **Phase B** (hierarchy + greenfield specs→ticket-tree) reuses Phase A's reconcile-delta primitive — cheaper once A ships. **Deferred; marked open for Parker.**
- **Phase C** (teams as lane-groups) — no sub-conductors.
- **Phase D** → reframed as "Scale: batching + state partitioning."

### 7.9 ADR candidates

1. **Team model: lane-groups over sub-conductors** (the load-bearing one — runtime-grounded).
2. **Growth via between-segment reconcile + two-axis convergence governor** (registry/dedup + budget primary + generation cap as signal).

### 7.10 Landed this session

`.prism/rules/followup-scope.md` (+ `templates/install/.prism/rules/` copy) **ported from Thrive's three-tier follow-up model, scrubbed and build-verified** (`pnpm prism:build` green, literal-guard clean). The decision box's dispositions are this rule's three tiers — Nora runs *its* four-signal gate inside the box. Change is uncommitted on `hmcgrew/issue-64-slim-agents` (scope-mixed with that branch — see Live state in the handoff).

### 7.11 Open for Parker

- **Greenfield specs → ticket-tree decompose** (brief Q6) — deferred to a later phase; PRD should scope it out of v1 but name it.
- **Breadth-gate threshold** — the count of distinct new lanes in one reconcile that trips the human gate (≈ a dozen, unconfirmed).
- **Integration gate** (brief Q4, cross-team) — a lane with multiple `dependsOn` edges + a human gate, distinct from the file-conflict gate; relevant to Phase C, not v1.
