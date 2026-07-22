---
title: "Sol — the Conductor"
description: "How Sol drives a goal across the lifecycle by dispatching the existing personas, pausing at every human gate, and routing each report-back verdict."
category: "ai-skills"
audience: "dev"
last_updated: "2026-06-27"
---

## What Sol does

Sol takes a stated goal — "build this content type from our SPECs," "ship these four tickets" — decomposes it into lifecycle phases, and dispatches the existing PRISM personas to do the work: Parker and Mira and Pixel upstream, Winston to plan, Nora at the ticket gate, Clove to implement, Sasha to debug, Briar and Eric to review. Sol sequences the phases, pauses at every human gate, routes each persona's report-back verdict to the right next persona, and contains failures per-lane when running a fleet.

Sol is a persona on a **third axis — orchestration** — orthogonal to the ticket-flow personas (Winston, Clove, …) and the cadence-driven personas (Zoe, Iris). It is **additive, not a replacement**: PRISM works exactly as it does today when Sol isn't invoked. You keep invoking personas by hand whenever you want to; Sol is the option for when you'd rather hand the whole lifecycle to one orchestrator.

**Sol has no authoritative write path.** It writes only its own run-control state at `.prism/conductor-state.json` — nothing else. It never writes code (Clove's lane), never writes Linear (Nora's lane). Merge is a human responsibility by default; Sol may merge only when `features.conductorMayMerge: true` is set in `.ai-skills/config.json` (see [Configuration — Feature flags](../parameterization.md#feature-flags)). Its job is to dispatch and route — it never does or interprets another persona's work.

## When to invoke Sol

- **Goal-driven fleet work.** You have several independently-shippable units and a clear spec for each — Sol lays down one lane per unit, runs them in parallel where their blast radius doesn't overlap, and parks any lane that fails without halting the rest.
- **End-to-end from a spec.** "Build the CMS Pages content type from `.prism/`" — Sol drives Parker → Mira → Pixel → Winston → Nora → Clove → Briar → Eric without you re-invoking each by hand.
- **Long pipelines where re-invoking by hand is the friction.** A single unit that still walks the whole lifecycle is a one-lane fleet; Sol drives it through the phases and stops at each gate for you.

**When to keep invoking by hand:** a quick fix with known scope (Clove → Briar is faster), exploratory work where you don't yet have a goal to decompose, or any task where you want to stay in the loop on every step rather than reviewing on the loop. Sol earns its keep when the lifecycle is long and the goal is well-specified; it adds overhead when neither is true.

## How Sol works

Sol's conductor loop is a ten-step state machine, each step a prose file at `.prism/skills/prism-conductor/step-NN-*.md`: init → decompose → plan-readiness → dispatch → route → escalate → budgets → fleet → reconcile → report. Resume is driven off run-state, not step frontmatter — Sol reads each lane's `currentPhase` from goal-state and jumps to the matching step.

Between human touchpoints, Sol dispatches through a deterministic orchestration script (Claude Code's Workflow tool). The script holds the run-state in its own variables, so coordination never competes for Sol's context window — the decisive property at lifecycle scale. Each dispatched persona is a compiled per-runtime agent definition, so a worker loads its full persona at spawn. The script runs each lane forward through its phases, clears low-stakes gates in place, and breaks back to Sol only when a lane needs a human, completes, or trips a budget. Sol — the conversational main loop — surfaces those gates, takes your input, and launches the next segment.

## Two channels — the plan is the bus, goal-state is run-control

Personas already talk to each other through the **branch plan**: Briar writes `## Review Issues` and Clove reads and fixes them; Sasha writes `## Debugged Issues` and Winston reads them into tasks. Sol keeps that intact and adds a thin second channel for run-state.

- **The branch plan is the durable content bus** — decisions, tasks, findings, history. The real conversation. It stays the source of truth ([ADR-0001](https://github.com/HunterMcGrew/PRISM/blob/main/.prism/spec/adrs/_toolkit/0001-plan-is-source-of-truth.md)).
- **The goal-state file is the ephemeral run-control channel** — phase pointer, per-lane status, strike tables, escalation flags, per-dispatch model tier. It holds pointers into plans, never work content, and is born lazily on the first phase transition. Schema and protocol: [`lib/goal-state.md`](https://github.com/HunterMcGrew/PRISM/blob/main/.prism/skills/prism-conductor/lib/goal-state.md).

Sol's dispatch message stays minimal — "Clove, your turn, plan at `<path>`, tasks 3–5, report back." The work content rides the plan; the run-state rides goal-state. There is no transcript-passing between personas, which is what keeps context tight enough for a Conductor on the strong model to run a fleet of workers on the cheaper one.

## The four reliability mechanics

1. **Three nested failure budgets.** A per-unit strike budget (the three-strike rule, generalized — a defect that survives three fix attempts pauses the unit and surfaces its survival history), a per-phase failure budget (repeated hard failures of the same persona on the same unit stop that phase), and a global run budget (a total dispatch cap so a runaway can't burn unbounded). A tripped budget parks the lane, not the run. "Failure" is narrow — a persona's "no" is a verdict to route, not a failure.
2. **Three escalation axes, each trigger to a target.** *Needs a better plan* routes to Winston to re-plan, triggered by a plan-readiness failure or a worker reporting guesswork. *Needs a stronger model* bumps the tier on that persona's next dispatch, triggered by the cheaper model stalling the same unit twice. *Needs a human* pauses and surfaces, triggered by an open question, a reviewer who believes a finding is wrong (the disagreement fast-path escalates immediately, not via strikes), or an inherently human gate.
3. **Report-back — a primary verdict plus optional secondary signals.** Every dispatched persona writes to the plan and returns one *primary verdict* (`done` · `needs-fix` · `blocked` · `needs-replan` · `needs-stronger-model` · `needs-human`) that routes the lane, plus zero or more *secondary signals* (`found-bug` → Sasha, `found-followup-work` → Nora, `observation` → recorded) that each route independently. A review rung returns `needs-fix` when its findings are fixable in-loop — Sol routes them to the implementer and re-dispatches the same reviewer, keeping the lane in the review phase. One enum value can't carry both a completion and an incidental follow-up, so the verdict routes the lane while each signal routes on its own. The full table and the literal dispatch schema: [`lib/report-back.md`](https://github.com/HunterMcGrew/PRISM/blob/main/.prism/skills/prism-conductor/lib/report-back.md).
4. **Fleet containment plus a conflict gate.** Fleet is the dispatch engine over multiple lanes — one engine; a pipeline is a one-lane fleet. Per-lane independence contains failures natively: a lane that throws drops out and skips its remaining stages while the others continue. Before parallelizing, Sol checks for **overlapping blast radius** — two lanes touching the same shared type, architect doc, or plan file — and serializes those rather than manufacturing merge conflicts (refuse-to-parallelize, the recorded default). `needs-human` pauses are batched into one end-of-segment report, never one ping per lane. The contract: [`lib/fleet.md`](https://github.com/HunterMcGrew/PRISM/blob/main/.prism/skills/prism-conductor/lib/fleet.md).

## Model tiering

Sol reads the tier off the goal-state lane and sets it per dispatch through the runtime's model override.

| Role | Default model | Escalation |
| --- | --- | --- |
| **Sol (Conductor)** | Opus (default, not hardcoded) | n/a — already top tier |
| **Winston (architect / plan)** | Always Opus, never weaker | n/a — the firewall never runs cheap |
| **Eric (PR review)** | Always Opus, never weaker | n/a — high-judgment review task, top tier by default |
| Worker personas (Clove, Sasha, Briar, …) | Sonnet | → Opus on signal (the worker stalled the unit twice) |

A plan-readiness failure means *re-plan harder* — Winston is already on the strong model — not *escalate the model*. A config seam lets other runtimes map their own tiers.

## Autonomy between gates, never through them

The invariant that keeps Sol from eroding PRISM's human-gated correctness model: **Sol drives autonomously between gates and stops at them, but never clears a gate itself.** Each gate is owned by a persona — Winston for plan / A-P-C, Nora for the Definition of Ready — that judges its own gate against a human-set autonomy policy (`launch` / `internal` / `hobby`) and returns one of three dispositions: `auto-cleared`, `needs-human`, or `blocked`. Sol routes the disposition; it never judges one.

The rule is one-directional — a persona can always escalate up (`needs-human` under any policy) but never auto-clear below the policy ceiling the human set. Every `auto-cleared` gate records the owner's stakes reasoning in the plan and surfaces in the end-of-run report, so autonomy moves you from in-the-loop to on-the-loop without going dark. Merge is a human gate by default — Sol parks every lane there unless `features.conductorMayMerge: true` is set in `.ai-skills/config.json` (see [Configuration — Feature flags](../parameterization.md#feature-flags)). The full decision, with the alternatives weighed, is in [ADR-0048](https://github.com/HunterMcGrew/PRISM/blob/main/.prism/spec/adrs/_toolkit/0048-conductor-autonomy-between-gates.md).

## Composition with the personas Sol dispatches

Sol is a thin conductor — every dispatched persona runs its full, unmodified rules and voice. Three relationships are worth calling out:

- **Winston is the firewall.** Before Sol dispatches implementation for a phase, the plan must pass the detail bar (any worker at any effort executes it without judgment calls). A vague plan is a hard pause that routes back to Winston to re-plan — not "proceed carefully." This is the single highest-leverage gate, because a worker dispatched against a fuzzy plan is exactly where two runs diverge.
- **Nora keeps the no-write-path boundary honest.** Sol never writes Linear or creates tickets. When a worker surfaces a `found-followup-work` signal, Sol routes it to Nora, who applies her scope-fit and Definition-of-Ready gates — the ticket gets created by the persona that owns ticket creation, not by Sol.
- **Briar and Eric are verdict sources.** A self-review or PR review comes back as a primary verdict Sol routes (clean → advance, findings → back to Clove). Eric never approves a PR ([ADR-0011](https://github.com/HunterMcGrew/PRISM/blob/main/.prism/spec/adrs/_toolkit/0011-eric-never-approves-prs.md)); review findings route, they don't clear the merge gate.

Sol is the lifecycle-scale generalization of the `prism-review-loop` utility — the review loop runs the self-review-then-PR-review gauntlet to a clean pass over the review *segment*; Sol generalizes the same loop-to-done, route-by-verdict, pass-budget shape to the *whole* lifecycle and gives it a persona. Review-loop is the review-segment ancestor: [`.ai-skills/skills/prism-review-loop/shared.md`](https://github.com/HunterMcGrew/PRISM/blob/main/.ai-skills/skills/prism-review-loop/shared.md).

## The self-growth loop

The v1 discovery loop closes in a single run what previously required a second triage pass. When a worker persona (Clove, Briar, Eric, Sasha) finds work outside its local frame and beyond trivial, it emits a `found-bug` or `found-followup-work` signal with a structured `target` — the file, symbol, scope slug, or error signature that identifies what was found. The signal enters the run-control registry (`signals[]` in goal-state) and waits for the next segment boundary.

At each segment boundary, Sol runs **step 9 — reconcile** ([`step-09-reconcile.md`](https://github.com/HunterMcGrew/PRISM/blob/main/.prism/skills/prism-conductor/step-09-reconcile.md)). The reconcile step reads the full registry, deduplicates signals structurally, runs the decision box on each distinct target, and applies the convergence governor. The next segment's lane set is then *recomputed* from that output — not carried forward unchanged from the run's input. The lane set is an output of the run, not only its input. A zero-delta reconcile (no new signals, or all new signals dropped) sets termination reason `converged` and hands off to step 10 — report.

The worker pre-filter keeps the signal queue signal-to-noise honest: a worker answers two questions before emitting. Is the find inside its local frame (the function it's modifying and the helpers it extracted)? Is it trivial (a one-line fix with no design trade-off)? In-frame and trivial means fix inline and emit nothing. Everything else emits. When the worker is unsure, it over-emits rather than silently dropping the find — dedup and the decision box downstream do the filtering. When a broken dependency blocks the lane, the worker emits the signal *and* continues on a documented stub so the lane does not stall.

The reconcile-delta procedure is built as a reusable primitive ([`lib/reconcile.md`](https://github.com/HunterMcGrew/PRISM/blob/main/.prism/skills/prism-conductor/lib/reconcile.md)) — not inlined into the discovery path — so later phases ride the same seam: Phase B will drive greenfield specs into a ticket-tree via the same primitive; Phase C will reconcile cross-team dependency signals the same way.

See [ADR-0050](https://github.com/HunterMcGrew/PRISM/blob/main/.prism/spec/adrs/_toolkit/0050-conductor-growth-loop-and-convergence-governor.md) for the design decision behind the growth loop and why between-segment is the right placement.

## The registry and structural dedup

Sol maintains a live registry across the entire run: the `signals[]` and `lanes[]` arrays in goal-state. Every signal that enters the run and every lane that exists or has existed lives here — it is the single record of everything found and in-flight.

Before the decision box runs, Sol deduplicates signals structurally by `target`. The match logic:

- **Primary match:** same `target.file` and same `target.symbol` (when non-null).
- **Secondary match (any one):** same `target.scopeSlug`, or same `target.errorSignature` (when non-null).

On a match, the later signal is *attached* to the first registry entry — `processedAt` set, linked to the existing decision unit — and no second decision-box dispatch is opened for it. The structural dedup is what makes the dispatch budget buy real progress rather than redundant investigations: when N worker lanes all find the same broken helper, one decision unit handles it, not N.

**Sol dedups structurally only.** A structurally ambiguous "are these the same issue?" call — where `target` fields don't yield a clear match — routes to Nora, not decided by Sol. This is air-traffic control, not interpretation, and it keeps Sol on the right side of the no-semantic-judgment invariant ([ADR-0048](https://github.com/HunterMcGrew/PRISM/blob/main/.prism/spec/adrs/_toolkit/0048-conductor-autonomy-between-gates.md)).

## The deferred-commit decision box

For each distinct target that survives dedup, Sol invokes the deferred-commit decision box ([`lib/decision-box.md`](https://github.com/HunterMcGrew/PRISM/blob/main/.prism/skills/prism-conductor/lib/decision-box.md)). The box is a Nora-led procedure with a clear labor split: **Nora** runs the four-signal scope judgment (per `followup-scope.md`'s scope-fit gate), drafts the ticket, defers the Linear write, and returns `{ disposition, draftTicket, escalationReason? }`. **Sol** resolves the fold-vs-follow-up question from the target lane's `status` in goal-state — a deterministic run-state lookup, never an interpretation call. **Winston** enters only on `escalationReason: "blast-radius"`.

Nora resolves to one of four dispositions:

- `fold-active` — the fix belongs in an active lane's open PR.
- `followup-pr` — a follow-up PR, no new ticket.
- `new-ticket` — a distinct new ticket is warranted.
- `drop` — the signal is noise; no action.

When Nora's disposition is `fold-active` or `followup-pr`, Sol reads the target lane's `status` from goal-state and settles the question: `status: done` (worktree cleaned) → `followup-pr`; `status: active | parked` (open worktree) → `fold-active`. Nora never interprets merge status.

A same-scope-vs-split borderline call is **not** escalated — Nora resolves it herself using the over-emit-under-emit tiebreaker and the conservative default (prefer the lighter disposition, `fold-active` or `followup-pr`, over standing up a new ticket).

**The uncertain path.** When the find touches shared or high-impact surface, Nora sets `escalationReason: "blast-radius"`. Sol then runs two Nora dispatches around one Winston read: Nora flags the uncertainty → Sol dispatches Winston for a blast-radius assessment → Sol dispatches Nora a second time to finalize with Winston's verdict. The shape is always one Nora first-pass, one Winston read, one Nora finalize — never more.

**Crash safety.** Goal-state is written at each decision-box step before the next step begins, with `pendingTicketCommit` set:

| Step | `pendingTicketCommit` | goal-state record |
| ---- | -------------------- | ----------------- |
| After Nora's first dispatch | `true` | step = `routed` |
| After Winston's verdict | `true` | step = `winston-verdict` |
| After Nora finalizes | `false` | step = `finalized`, disposition + `processedAt` set |

A run interrupted mid-decision resumes from the last recorded step deterministically — no double-commit, no lost draft. `pendingTicketCommit: true` on resume means the ticket was drafted but not committed; Sol surfaces it to the human.

The autonomy ceiling governs when ticket commits fire. Under `hobby` policy Nora may finalize autonomously; under `internal` or `launch` a ticket commit above trivial returns `needs-human` and batches into the end-of-segment human gate — zero auto-commits above trivial at those stakes levels.

## The convergence governor

The convergence governor is what keeps a self-growing fleet from running away. Three brakes evaluate at reconcile time in a fixed priority order ([`lib/convergence.md`](https://github.com/HunterMcGrew/PRISM/blob/main/.prism/skills/prism-conductor/lib/convergence.md)):

**1. Dispatch budget (primary).** Every dispatch counts against `globalBudget.spent` — origin-lane phases, decision-box dispatches (Nora and Winston), and discovered-lane phases alike. Depth, shape, and generation are irrelevant; every dispatch is equal. Default ceiling: 100. On exhaustion, Sol parks remaining candidates and records termination reason `budget-exhausted`. This is the load-bearing guarantee: a single shape-agnostic counter is what makes the brake unconditional.

**2. Generation cap (K = 3, soft gate and lineage signal).** Generation tracks discovery depth, not clock time. Origin lanes start at generation 0. A lane spawned from a discovered signal has `generation = parent.generation + 1`, via the `parentId` pointer in goal-state. Gen 0–3 auto-dispatch; a gen-3 lane's finds would be gen 4 — those signals are captured in the registry but parked to a human gate rather than auto-dispatched. The generation cap is a governance signal, not the primary guarantee: the budget is the unconditional backstop. A team that trusts its automation can raise K without touching the budget.

**3. Breadth gate (default 12).** When a single reconcile pass yields more than 12 distinct candidate lanes, Sol surfaces the full expansion to a human rather than auto-dispatching it. This catches the one-reconcile-spawns-many-lanes pathology that neither the budget (might still be under) nor the generation cap (all candidates might be gen 1) would catch alone. The default 12 is calibrated to the runtime's concurrency cap (`min(16, cores-2)`, approximately 12). A reconcile that yields ≤12 candidates dispatches them; the runtime queues any overflow against the cap, which is the engine's safe default. A team that wants no silent queueing can lower the breadth gate below its own cap via the config seam — the default is kept at 12 to honor the calibration.

The three brakes are evaluated in the order above, stopping at the first brake that fires. Every completed run records exactly one termination reason: `converged` (zero-delta reconcile) or `budget-exhausted` (dispatch budget hit). A run never ends with termination reason `killed` or with no reason set.

Governor thresholds — budget ceiling, K, and the breadth gate — are config-driven, not hardcoded. The values above are the shipped defaults; a consuming team overrides them via the config seam in goal-state.

## Tree semantics — epics, issues, and tickets as a lane hierarchy

Phase A treated the lane list as flat. Phase B makes `parentId` load-bearing as a **tree pointer**: a lane whose `parentId` names another lane is a child in that parent's subtree. Any lane with at least one child is a **container lane** — an epic or an issue. Any lane with no children is a **leaf lane** — a ticket. The flat `lanes[]` array in goal-state doesn't change shape; the tree is read from the `parentId` pointers it already holds.

**Container lanes are non-dispatchable.** Only leaf lanes enter the `pipeline()` segment and run a phase chain. An epic or issue lane is never passed to `agent()`; it has no implementation phase of its own. Instead, its `status` is computed from its children at each reconcile boundary: `done` only when every child is `done` or `dropped`; `blocked` if any child is `blocked`; `active` otherwise. Its `currentPhase` is `null` — the field is not meaningful for a container. This is a deterministic read-time rollup from goal-state, not a dispatch, so it does not count against `globalBudget.spent`.

The invariant that falls out of the rollup rule: no container lane closes as `done` while any child remains `active`, `parked`, or otherwise unresolved. The rule enforces itself — no separate state machine is needed.

**Tree depth is not generation depth.** A planned three-level tree has epic, issue, and ticket lanes that are all `generation: 0`. Generation accrues only from *unplanned* discovery during build — a lane spawned from a discovered signal has `generation = parent.generation + 1`. The convergence governor's generation cap (brake 2 in `lib/convergence.md`) counts discovered lineage, never planned-tree depth. A planned tree of any depth does not trigger the generation cap.

The canonical statements of both rules live in [`lib/goal-state.md`](https://github.com/HunterMcGrew/PRISM/blob/main/.prism/skills/prism-conductor/lib/goal-state.md) § Field notes (the `parentId` bullet and the container-lane generation bullet). The dispatch mechanics are in [`step-04-dispatch.md`](https://github.com/HunterMcGrew/PRISM/blob/main/.prism/skills/prism-conductor/step-04-dispatch.md) § Tree dispatch. The full design decision is in [ADR-0051 — Conductor: Tree Dispatch Semantics](https://github.com/HunterMcGrew/PRISM/blob/main/.prism/spec/adrs/_toolkit/0051-conductor-tree-dispatch-semantics.md).

## Greenfield decompose mode

When the operator brings a PRD and an architecture document instead of a hand-listed lane set, Sol runs in **greenfield mode**. Rather than asking the operator to enumerate every ticket, Sol conducts a Parker→Winston→Nora chain that turns the spec documents into a ratifiable epic→issue→ticket tree.

### The conducted chain

The chain is a Sol-dispatched conducted segment — sequential, one level deep, no nesting:

1. **Parker** reads the PRD and emits **epic** lanes at initiative grain. Each epic gets a one-line `scope` statement.
2. **Winston** reads the PRD, the architecture document, and Parker's epics, then emits **issue** lanes at architecture grain — task breakdowns, each carrying `parentId` → its epic.
3. **Nora** reads the issues and writes **ticket** lanes — the leaf lanes that will be dispatched. Each ticket is in DoR-draft form with a `null` estimate (estimates are not meaningful before ratification) and carries `parentId` → its issue.

Every lane emitted by the chain is `generation: 0`, regardless of depth. The reconcile primitive folds the chain's tree output into goal-state using the same dedup and registry logic it uses for flat signals, with one difference: when the delta carries `parentId` pointers, the primitive preserves them and assigns `generation: 0` to every lane in the planned tree rather than computing `parent.generation + 1`. The flat-signal path from Phase A is untouched — this is an additive extension to the same primitive, not a fork of it (see [`lib/reconcile.md`](https://github.com/HunterMcGrew/PRISM/blob/main/.prism/skills/prism-conductor/lib/reconcile.md) § Tree-shaped delta).

Each chain step counts against `globalBudget.spent` like any dispatch.

### Crash safety and mid-chain escalation

The chain reuses the decision-box crash-safety pattern. Sol writes goal-state after each step returns — `parker-done` → `winston-done` → `nora-done` — so a crash between steps loses nothing. On resume, Sol continues from the last written step; completed steps are never re-run, and a partial tree already in goal-state is preserved.

If a chain persona returns `needs-human` — for example, Winston's architecture step hits an ambiguous data-ownership call — Sol surfaces the escalation through the existing gate-routing in `step-05-route.md` and resumes the chain from that step after the human resolves it. No new state machine. Mid-chain escalation works exactly like any other gate.

### The ratification gate

After the chain completes, Sol surfaces the generated tree to the operator before dispatching any leaf lanes. The artifact is the same tree-structured view the end-of-run report uses (§ Tree-structured end-of-run report below): epics → issues → tickets with `parentId` pointers, per-lane `scope` statements, persona assignments, and the DoR-draft ticket list — rendered as a chat-readable text summary alongside the goal-state lane tree.

Gate behavior depends on the autonomy policy:

- **`internal` or `launch` stakes:** the gate is `needs-human`. Sol batches the ratification artifact into `pendingHumanReport` and dispatches nothing until the operator approves.
- **`hobby` stakes:** the tree auto-dispatches without a ratification pause.

The operator may adjust `scope` statements or drop lanes before approving. Sol re-invokes the reconcile primitive over the edited tree before dispatching.

**The breadth gate and ratification are complementary, not redundant.** The breadth gate (brake 3 in the convergence governor) exists to surface a large single-reconcile expansion to a human before auto-dispatch. A ratified planned tree already received that human review, so it is excluded from the breadth gate — applying it again would be a second gate on work the operator already approved. The loophole closes at `hobby` stakes: when there is no ratification gate, the breadth gate applies to the planned tree as the backstop, so a very large tree can never bypass human review under any policy. Under every policy, a large planned tree faces exactly one human gate — ratification at `internal`/`launch`, the breadth gate at `hobby`. Unplanned discovery always hits the breadth gate regardless of policy, as it did in Phase A.

Once the tree is approved (or auto-dispatches at `hobby`), the leaf-ticket lanes hand off to the normal step-04 dispatch flow with tree-aware convergence.

The full procedure is in [`lib/greenfield-decompose.md`](https://github.com/HunterMcGrew/PRISM/blob/main/.prism/skills/prism-conductor/lib/greenfield-decompose.md). The design decisions behind the chain structure and the ratification-gate/breadth-gate interaction are in [ADR-0052 — Conductor: Greenfield Decompose and Ratification Gate](https://github.com/HunterMcGrew/PRISM/blob/main/.prism/spec/adrs/_toolkit/0052-conductor-greenfield-decompose-and-ratification-gate.md).

> [!NOTE]
> The greenfield chain takes already-authored spec documents as inputs. Sol conducts the chain; it does not write PRDs or architecture documents. If those documents don't exist yet, the operator runs Parker and Winston first, then hands the results to Sol for the greenfield chain.

## Subtree budget attribution

The convergence governor's `globalBudget.spent` counter is a single shape-agnostic number — every dispatch increments it, regardless of which lane or phase it came from. That design is what makes the budget brake unconditional (see `lib/convergence.md` § Brake 1).

When the run drives a tree, the end-of-run report breaks that global number down by subtree. A leaf lane's dispatches roll up to its parent issue's subtree and its parent epic's subtree by summing across the leaves. This is **read-time aggregation only** — no per-lane budget counter exists in the schema, and nothing is written during the run. The global counter remains the primary brake; the subtree breakdown is a reporting convenience. Per-lane counters would add a second source of truth that could disagree with the global counter without adding any braking capability.

## Tree-structured end-of-run report

When a run drove a tree, the end-of-run report (step 10) renders the tree shape alongside the flat per-lane coverage: each epic, its child issues, and their child tickets, with per-lane `status` and termination reason, indented to reflect the `parentId` hierarchy.

**Discovered work is shown separately from the planned tree.** Lanes at `generation: 0` (the planned tree) and lanes at `generation ≥ 1` (unplanned work found during build) appear in distinct sections. The separation lets the operator see what was planned and what was found — and confirm that the planned tree resolved cleanly before looking at the discovered work.

A flat run — one where no lane has children — renders exactly as Phase A. The tree view is additive; it does not change the flat-run report format.

The full report procedure is in [`step-10-report.md`](https://github.com/HunterMcGrew/PRISM/blob/main/.prism/skills/prism-conductor/step-10-report.md) § Tree-structured view.

## Teams as lane-groups — cross-team sequencing and the integration gate

The `team` field on a lane is a first-class scheduling axis. It does not introduce a second conductor or a second budget — it is a grouping dimension layered over the flat `lanes[]` array.

### Per-team dispatch ordering

When lanes carry a `team` value, Sol applies a team-aware ordering layer on top of the slot-fill: lanes sharing a `team` value form a logical queue that preserves their `lanes[]` order, and Sol interleaves teams round-robin as concurrency slots open. No single team starves another within the shared concurrency cap. A lane with `team: null` is its own implicit singleton group, ordered by array position.

The important thing this is not: a second scheduler. The concurrency cap, the conflict gate, and the global budget are shared resources, unchanged. The `team` field controls the order in which eligible lanes are handed to the existing dispatch loop — nothing more. The full dispatch contract is in [`step-04-dispatch.md`](https://github.com/HunterMcGrew/PRISM/blob/main/.prism/skills/prism-conductor/step-04-dispatch.md) § Per-team dispatch ordering.

### Cross-team dependency sequencing

A lane can declare `dependsOn: [<laneId>, ...]` to express that it must wait for one or more other lanes to finish before it dispatches. Eligibility is checked at each segment boundary: a lane whose `dependsOn` list contains any lane not yet at `status: "done"` is held out of the dispatch set. When held, the lane stays `status: "active"` with `phaseStatus: "parked"` and a `blockedBy` field listing the unresolved edges.

Eligibility is segment-granular because Sol does not talk to running workers — a dependency can only resolve when its target lane finishes and Sol observes the result at a segment boundary. A dependency that completes mid-segment unblocks the dependent lane at the *next* boundary.

Dependency edges form a directed acyclic graph. If the graph contains a cycle — lane A depends on B, which depends on A — the reconcile step detects it with a depth-first check and raises a `needs-human` escalation describing the cycle. No lane in the cycle dispatches until the human removes an edge. This is a constraint check on a malformed graph, not one of the three convergence brakes — it does not consume budget and runs before the brake priority order. The cycle check is in [`step-09-reconcile.md`](https://github.com/HunterMcGrew/PRISM/blob/main/.prism/skills/prism-conductor/step-09-reconcile.md) § 2.5; the `lib/convergence.md § Dependency-graph pre-check` records its placement relative to the brakes.

When a `dependsOn` target is `parked` rather than `done`, the dependent lane cannot resolve either. The reconcile step co-presents both in a single `pendingHumanReport` entry — the blocked lane and the reason its target stalled — so the operator sees the full picture rather than a confusingly stalled lane with no apparent cause. Resolving the parked lane's escalation unblocks the dependent lane on the next reconcile pass.

### Per-team model tier

The `teamConfig[]` array in `conductor-state.json` provides a per-team model tier seam. Each entry pairs a `team` name with a `modelTier` — one of the tier values defined in `shared.md § Model tiering` (e.g. `opus`, `sonnet`). When Sol dispatches a lane whose `team` matches an entry, it uses that entry's `modelTier` as the per-dispatch model override. `null` means fall back to the run-wide model. The seam exists so a consuming team can run one team's lanes on a stronger model without upgrading the whole run. The schema is in [`lib/goal-state.md`](https://github.com/HunterMcGrew/PRISM/blob/main/.prism/skills/prism-conductor/lib/goal-state.md) § Field notes.

### Team-tag inheritance through discovered work

When a worker lane emits a `found-bug` or `found-followup-work` signal and the emitting lane carries a `team` value, that tag travels through the decision box and onto any resulting lane. A new ticket or fold-in inherits the emitting lane's `team` unless the operator or the decompose chain explicitly overrides it. Sol never strips or reassigns a team tag — the carry is deterministic and automatic. This is Nora's scope judgment and Sol's tag carry kept distinct: Nora decides what to do with the signal; Sol decides which team owns the result.

### The integration gate

An integration lane is a lane with `type: "integration"` whose `dependsOn` edges span two or more distinct `team` values. When all of its dependencies reach `done`, a pre-dispatch human gate fires before the integration lane is dispatched. The purpose is to give the operator a cross-team convergence checkpoint — a moment to review that the backend and frontend (or whichever teams are converging) have each completed what the integration lane will validate.

Two conditions are both required to trigger the gate: `type: "integration"` on the lane, and at least one cross-team `dependsOn` edge. A same-team lane with multiple `dependsOn` edges does not trigger it. A `type: "integration"` lane whose dependencies are all same-team does not trigger it.

The gate is `needs-human` at every autonomy level, including `hobby`. It is not a stakes gate that confidence can satisfy — it is a categorical checkpoint, a sibling of the merge gate in that it never auto-clears regardless of policy. The design decision is in [ADR-0054](https://github.com/HunterMcGrew/PRISM/blob/main/.prism/spec/adrs/_toolkit/0054-conductor-integration-gate-always-human.md). The gate is also distinct from the conflict gate, which serializes lanes that share a file — the integration gate is about cross-team work convergence, independent of file overlap.

The integration lane's persona comes from its `scope` statement, not from a default mapping. A scope describing a review-and-test pass names Briar; a seam-architecture check names Winston. This keeps the gate general-purpose: the operator or the decompose chain sets the scope, and the persona follows from it.

When an integration gate fires, the end-of-run report surfaces a labeled integration gate section — distinct from any file-conflict gate section — with a per-team summary of completed dependency lanes, any dependencies still parked, the integration lane's scope statement, and an approve/escalate prompt.

The full gate contract is in [`lib/fleet.md`](https://github.com/HunterMcGrew/PRISM/blob/main/.prism/skills/prism-conductor/lib/fleet.md) § Integration gate. The gate appears in the gate registry in [`lib/report-back.md`](https://github.com/HunterMcGrew/PRISM/blob/main/.prism/skills/prism-conductor/lib/report-back.md).

### Per-team end-of-run report

When any lanes carry a non-null `team`, the end-of-run report adds a per-team summary alongside the flat lane list and the tree-structured view. For each distinct team, the summary shows the count of lanes dispatched, done, parked, and discovered (where "discovered" means lanes whose origin signal carried that team tag). A run with all-null `team` values shows no per-team section, and the report format is identical to what Phases A and B produce.

See [ADR-0053](https://github.com/HunterMcGrew/PRISM/blob/main/.prism/spec/adrs/_toolkit/0053-conductor-integration-lane-type-marker.md) for the decision to use a `type` field as the integration lane marker.

---

## Scale — batching and partitioned run-control state

At larger run sizes, two mechanics work together: the batcher keeps dispatch efficient within a segment, and the partition store keeps the run-control file from becoming a bottleneck across segments. Neither introduces a second scheduler, a second budget, or any form of nesting — sub-conductors are permanently off the table ([ADR-0049](https://github.com/HunterMcGrew/PRISM/blob/main/.prism/spec/adrs/_toolkit/0049-conductor-teams-are-lane-groups.md)).

### The batcher

When the set of ready lanes for a segment exceeds the concurrency cap (default ~12), Sol invokes the batcher to order and slice the ready set into a cap-sized batch. The batch becomes that segment's `pipeline()` input; remaining lanes queue for the next segment's dispatch boundary.

The batcher applies four ordering rules as a stable sort, in this sequence:

1. **Dependency-unblocking first.** A lane that other lanes depend on is ordered ahead, because completing it unblocks the most downstream work.
2. **Team co-batching.** Among equally-unblocking lanes, lanes sharing a `team` value are co-batched so a team's parallel work advances together across segments rather than interleaving with other teams.
3. **Leaf-first within the tree.** Ticket lanes before issue lanes before epic lanes, consistent with Phase B's leaf-first dispatch.
4. **Generation order.** Lower generation first — origin lanes before discovered work.

All four rules read existing fields on the lane record (`dependsOn`, `team`, `parentId`, `generation`). Sol makes no semantic priority judgment — the ordering is fully deterministic from the data. Two identical runs over the same state produce the same batch order.

Batching changes which lanes a segment covers, not how a lane runs. The autonomous segment, the gauntlet, and the merge gate are unchanged. The batcher's full contract is in [`lib/batcher.md`](https://github.com/HunterMcGrew/PRISM/blob/main/.prism/skills/prism-conductor/lib/batcher.md).

**The budget is per-run, not per-batch.** Before composing each segment the batcher checks the global counter; if the budget is exhausted, it parks the remaining queue with termination reason `budget-exhausted` and does not compose the segment. Subdividing the budget per batch — giving each batch its own pool — would reintroduce the exact failure the single-counter design exists to prevent: two pools each staying "under budget" while total spend runs away. Batches are just segments, and every segment's dispatches count against the one counter.

Structural dedup runs before batch assignment. A signal deduped in segment 1 is never re-dispatched in segment 2 because the registry is checked at the door, ahead of the batcher.

### Partitioned run-control state

`conductor-state.json` is the single run-control file in Phases A through C. In Phase D, when a run's lane count crosses the partition threshold (default 50 lanes, config-driven), Sol migrates the file in place into a **partitioned layout**: a root index at `.prism/conductor-state.json` plus one partition file per epic subtree at `.prism/conductor-state.epic-<laneId>.json`.

Partitioning is a layout the same schema takes, not a breaking change. A run below the threshold stays single-file exactly as before.

#### Why partition by epic subtree, not by team

The partition key is the epic-subtree root, not the team. The reason follows from where the hot dependency edges land.

The most common cross-lane dependency in a Sol run is a frontend ticket waiting on a backend ticket — a cross-team edge. If the state were partitioned by team, every one of those edges would cross a partition boundary and require a cross-partition file read. Partitioning by the wrong key makes the hottest path slower.

Partitioning by epic subtree localizes the common case: a backend ticket and the frontend ticket that depends on it are typically both children of the same epic. Their `dependsOn` edge is an in-partition check, no cross-partition read needed. Only genuinely cross-epic dependencies — the rarer case — take the slower path, which is exactly where a denormalized summary is the right tool.

`team` remains a field on the lane and drives the per-team report view. Partition-by-epic and report-by-team are orthogonal. The design decision is in [ADR-0055](https://github.com/HunterMcGrew/PRISM/blob/main/.prism/spec/adrs/_toolkit/0055-conductor-partitions-run-control-by-epic-subtree.md).

#### The root index and partition files

The root index carries the fields that must be run-wide: `globalBudget`, `pendingHumanReport`, `teamConfig`, and — new in the partitioned layout — three additional fields:

- `partitionManifest` — the canonical record of which partition files exist, each entry carrying the partition key, file path, lane count, and the `lastWritten` timestamp used for crash detection.
- `lanesSummary` — a denormalized status snapshot of every lane across all partitions. Each entry holds the lane's `status`, `team`, `generation`, and `partitionKey`. Cross-partition dependency checks read this summary rather than opening the foreign partition file.
- `signals` — the run-wide signal registry, moved from per-lane to the root index so structural dedup spans all partitions.

The v2 `lanes[]` array is absent from the root index in a partitioned run — lane records live only in their partition files.

Each partition file holds `{ version, key, lastWritten, lanes[] }` where `lanes[]` is the unchanged v2 lane-record format for that subtree's lanes. The schema is in [`lib/goal-state.md`](https://github.com/HunterMcGrew/PRISM/blob/main/.prism/skills/prism-conductor/lib/goal-state.md) § Schema (v3 — partitioned layout).

#### Reading and writing under partitioning

At each segment boundary, Sol reads the root index first — that gives it the manifest, the status summary, the signal registry, and the budget. Then it reads only the partition files whose lanes are active or ready in the current segment. Untouched partitions are not opened. A cross-partition dependency check that needs only a lane's status reads `lanesSummary` in the root index; only if a full lane record is needed does Sol open the foreign partition file.

Writes follow a load-bearing order: touched partition files first, root index last. The root index is the commit point. Writing the root last means that if Sol crashes after writing a partition but before writing the root, the manifest's `lastWritten` timestamp for that partition will be behind the partition file's — a detectable mismatch. Writing the root first would mean a crash after the root write but before the partition write leaves the manifest claiming the partition is current when it may not be. The protocol is in [`lib/partition-store.md`](https://github.com/HunterMcGrew/PRISM/blob/main/.prism/skills/prism-conductor/lib/partition-store.md).

#### Cross-partition dependency resolution

When lane A (in partition P1) depends on lane B (in partition P2), Sol reads B's status from `lanesSummary` in the root index — not by opening P2's partition file. The summary is refreshed on every root-index write (which follows every partition write), so it is never staler than the last segment boundary. That is the only point dependency resolution is checked, consistent with Phase C's segment-granular eligibility rule.

A cross-partition edge whose target is `parked` rather than `done` is surfaced to the human gate the same way a same-partition parked dependency is: the dependent lane's `blockedBy` entry stays set, and a co-presented entry goes to `pendingHumanReport` naming both lanes.

#### Crash-safe resume across partitions

On resume of a partitioned run, Sol reads the root index and compares each partition file's `lastWritten` against the manifest's recorded timestamp for that partition. A match means the partition is current. A mismatch — the partition file's timestamp is older than the manifest's record, or the partition file is absent — means the partition is potentially stale: the crash happened after the partition was meant to be written but before the root index committed.

A potentially-stale partition raises a `needs-human` gate rather than auto-repairing. Sol cannot infer what the crashed segment accomplished, so the correct recovery is to surface the discrepancy and let the operator decide. This is the same bias as v2's corruption-recovery handling — surface, not repair.

#### Governor brakes stay run-wide under partitioning

Splitting lane records across files does not weaken any convergence brake. Every brake evaluates against the full run's state.

The budget counter lives only in the root index — every dispatch in any partition increments the one counter. There is no per-partition budget. The generation cap reads `generation` from `lanesSummary` across all partitions — the cap applies to the full discovered-lineage graph, not to any single partition's lanes. The breadth gate counts distinct new lanes summed across all partitions in a single reconcile pass: a six-lane expansion in one partition and a seven-lane expansion in another is a thirteen-lane reconcile that trips a gate of twelve, even though neither partition alone exceeds it.

The per-partition counting mistake — where each partition's expansion is checked independently against the gate — is exactly what the run-wide design exists to prevent. The invariant is in [`lib/convergence.md`](https://github.com/HunterMcGrew/PRISM/blob/main/.prism/skills/prism-conductor/lib/convergence.md) § Brakes are run-wide under partitioning and recorded in [ADR-0056](https://github.com/HunterMcGrew/PRISM/blob/main/.prism/spec/adrs/_toolkit/0056-conductor-governor-brakes-evaluated-run-wide.md).

#### The partition-aware end-of-run report

When a run partitioned, the end-of-run report aggregates across all partitions and adds a per-partition summary for each epic subtree: lane count, status breakdown, discovered-work count, and budget consumed by that subtree. The per-team summary from the teams section and the per-epic-partition summary are both present — they are orthogonal views of the same run. The existing flat lane list is preserved in full for compatibility.

The report structure is in [`step-10-report.md`](https://github.com/HunterMcGrew/PRISM/blob/main/.prism/skills/prism-conductor/step-10-report.md) § Partition-aware summary.

#### Scale ceiling

Phase D supports runs at ~100 lanes. Runs trending past that size are expected to hit the dispatch budget (default 100) or the breadth gate (12 per reconcile) before growing further — the ceiling is a governance expectation enforced by existing brakes, not a new hard limit. Batching and partitioning raise the practical run size Sol handles efficiently; the governor brakes remain the enforcement ceiling.

---

## See also

- [ADR-0048 — Conductor: Autonomy Between Gates](https://github.com/HunterMcGrew/PRISM/blob/main/.prism/spec/adrs/_toolkit/0048-conductor-autonomy-between-gates.md) — the autonomy invariant and the alternatives weighed
- [ADR-0049 — Conductor: Teams Are Lane-Groups, Not Sub-Conductors](https://github.com/HunterMcGrew/PRISM/blob/main/.prism/spec/adrs/_toolkit/0049-conductor-teams-are-lane-groups.md) — why the flat lane list holds and sub-conductors are permanently rejected
- [ADR-0050 — Conductor: Growth via Between-Segment Reconcile, Governed by a Two-Axis Convergence Brake](https://github.com/HunterMcGrew/PRISM/blob/main/.prism/spec/adrs/_toolkit/0050-conductor-growth-loop-and-convergence-governor.md) — the design decision behind the reconcile primitive and the three-brake governor
- [ADR-0051 — Conductor: Tree Dispatch Semantics](https://github.com/HunterMcGrew/PRISM/blob/main/.prism/spec/adrs/_toolkit/0051-conductor-tree-dispatch-semantics.md) — container lanes are non-dispatchable rollup nodes; child-first dispatch; tree depth ≠ generation depth
- [ADR-0052 — Conductor: Greenfield Decompose and Ratification Gate](https://github.com/HunterMcGrew/PRISM/blob/main/.prism/spec/adrs/_toolkit/0052-conductor-greenfield-decompose-and-ratification-gate.md) — the chain reuses the reconcile primitive additively; ratification gate is the human review the breadth gate would otherwise force; hobby backstop
- [ADR-0053 — Conductor: Integration Lane Type Marker](https://github.com/HunterMcGrew/PRISM/blob/main/.prism/spec/adrs/_toolkit/0053-conductor-integration-lane-type-marker.md) — `type: "integration"` as the marker; no default integration persona; `null` is ordinary
- [ADR-0054 — Conductor: Integration Gate Always Human](https://github.com/HunterMcGrew/PRISM/blob/main/.prism/spec/adrs/_toolkit/0054-conductor-integration-gate-always-human.md) — the gate is `needs-human` at every autonomy level, including `hobby`; categorical, not confidence-gated
- [ADR-0055 — Conductor: Run-Control State Partitions by Epic-Subtree Root, Not by Team](https://github.com/HunterMcGrew/PRISM/blob/main/.prism/spec/adrs/_toolkit/0055-conductor-partitions-run-control-by-epic-subtree.md) — why epic-subtree beats team-partition; the sharding-by-right-key argument
- [ADR-0056 — Conductor: Governor Brakes Evaluated Run-Wide, Never Per-Partition](https://github.com/HunterMcGrew/PRISM/blob/main/.prism/spec/adrs/_toolkit/0056-conductor-governor-brakes-evaluated-run-wide.md) — the invariant that keeps Phase D from quietly weakening the convergence governor
- The conductor loop, step by step: [`step-01-init.md`](https://github.com/HunterMcGrew/PRISM/blob/main/.prism/skills/prism-conductor/step-01-init.md) … [`step-09-reconcile.md`](https://github.com/HunterMcGrew/PRISM/blob/main/.prism/skills/prism-conductor/step-09-reconcile.md) → [`step-10-report.md`](https://github.com/HunterMcGrew/PRISM/blob/main/.prism/skills/prism-conductor/step-10-report.md)
- [`lib/goal-state.md`](https://github.com/HunterMcGrew/PRISM/blob/main/.prism/skills/prism-conductor/lib/goal-state.md) — run-control schema and read/write/mutate protocol
- [`lib/reconcile.md`](https://github.com/HunterMcGrew/PRISM/blob/main/.prism/skills/prism-conductor/lib/reconcile.md) — the reusable reconcile-delta primitive
- [`lib/decision-box.md`](https://github.com/HunterMcGrew/PRISM/blob/main/.prism/skills/prism-conductor/lib/decision-box.md) — the deferred-commit decision box procedure
- [`lib/convergence.md`](https://github.com/HunterMcGrew/PRISM/blob/main/.prism/skills/prism-conductor/lib/convergence.md) — the convergence governor and three-brake priority order
- [`lib/report-back.md`](https://github.com/HunterMcGrew/PRISM/blob/main/.prism/skills/prism-conductor/lib/report-back.md) — verdicts, signals, the gate registry, and the deterministic routing table
- [`lib/fleet.md`](https://github.com/HunterMcGrew/PRISM/blob/main/.prism/skills/prism-conductor/lib/fleet.md) — lane lifecycle, native containment, the conflict gate, and the integration gate
- [`lib/batcher.md`](https://github.com/HunterMcGrew/PRISM/blob/main/.prism/skills/prism-conductor/lib/batcher.md) — the batcher: ordering rules, budget composition, dedup composition
- [`lib/partition-store.md`](https://github.com/HunterMcGrew/PRISM/blob/main/.prism/skills/prism-conductor/lib/partition-store.md) — the partition store: onset, read strategy, write order, crash-safe resume
- [`lib/greenfield-decompose.md`](https://github.com/HunterMcGrew/PRISM/blob/main/.prism/skills/prism-conductor/lib/greenfield-decompose.md) — the Parker→Winston→Nora chain procedure, ratification gate, and breadth-gate interaction
- [`.ai-skills/skills/prism-review-loop/shared.md`](https://github.com/HunterMcGrew/PRISM/blob/main/.ai-skills/skills/prism-review-loop/shared.md) — the review-segment utility Sol generalizes to the lifecycle
