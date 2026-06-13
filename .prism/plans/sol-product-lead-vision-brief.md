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
