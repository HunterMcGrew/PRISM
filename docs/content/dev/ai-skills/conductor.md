---
title: "Sol — the Conductor"
description: "How Sol drives a goal across the lifecycle by dispatching the existing personas, pausing at every human gate, and routing each report-back verdict."
category: "ai-skills"
audience: "dev"
last_updated: "2026-06-13"
---

## What Sol does

Sol takes a stated goal — "build this content type from our SPECs," "ship these four tickets" — decomposes it into lifecycle phases, and dispatches the existing PRISM personas to do the work: Parker and Mira and Pixel upstream, Winston to plan, Nora at the ticket gate, Clove to implement, Sasha to debug, Briar and Eric to review. Sol sequences the phases, pauses at every human gate, routes each persona's report-back verdict to the right next persona, and contains failures per-lane when running a fleet.

Sol is a persona on a **third axis — orchestration** — orthogonal to the ticket-flow personas (Winston, Clove, …) and the cadence-driven personas (Zoe, Iris). It is **additive, not a replacement**: PRISM works exactly as it does today when Sol isn't invoked. You keep invoking personas by hand whenever you want to; Sol is the option for when you'd rather hand the whole lifecycle to one orchestrator.

**Sol has no authoritative write path.** It writes only its own run-control state at `.prism/conductor-state.json`. It never writes code (Clove's lane), never writes Linear (Nora's lane), never merges (the human's). Its job is to dispatch and route — it never does or interprets another persona's work.

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

- **The branch plan is the durable content bus** — decisions, tasks, findings, history. The real conversation. It stays the source of truth ([ADR-0001](https://github.com/HunterMcGrew/PRISM/blob/main/.prism/spec/adrs/0001-plan-is-source-of-truth.md)).
- **The goal-state file is the ephemeral run-control channel** — phase pointer, per-lane status, strike tables, escalation flags, per-dispatch model tier. It holds pointers into plans, never work content, and is born lazily on the first phase transition. Schema and protocol: [`lib/goal-state.md`](https://github.com/HunterMcGrew/PRISM/blob/main/.prism/skills/prism-conductor/lib/goal-state.md).

Sol's dispatch message stays minimal — "Clove, your turn, plan at `<path>`, tasks 3–5, report back." The work content rides the plan; the run-state rides goal-state. There is no transcript-passing between personas, which is what keeps context tight enough for a Conductor on the strong model to run a fleet of workers on the cheaper one.

## The four reliability mechanics

1. **Three nested failure budgets.** A per-unit strike budget (the three-strike rule, generalized — a defect that survives three fix attempts pauses the unit and surfaces its survival history), a per-phase failure budget (repeated hard failures of the same persona on the same unit stop that phase), and a global run budget (a total dispatch cap so a runaway can't burn unbounded). A tripped budget parks the lane, not the run. "Failure" is narrow — a persona's "no" is a verdict to route, not a failure.
2. **Three escalation axes, each trigger to a target.** *Needs a better plan* routes to Winston to re-plan, triggered by a plan-readiness failure or a worker reporting guesswork. *Needs a stronger model* bumps the tier on that persona's next dispatch, triggered by the cheaper model stalling the same unit twice. *Needs a human* pauses and surfaces, triggered by an open question, a reviewer who believes a finding is wrong (the disagreement fast-path escalates immediately, not via strikes), or an inherently human gate.
3. **Report-back — a primary verdict plus optional secondary signals.** Every dispatched persona writes to the plan and returns one *primary verdict* (`done` · `blocked` · `needs-replan` · `needs-stronger-model` · `needs-human`) that routes the lane, plus zero or more *secondary signals* (`found-bug` → Sasha, `found-followup-work` → Nora, `observation` → recorded) that each route independently. One enum value can't carry both a completion and an incidental follow-up, so the verdict routes the lane while each signal routes on its own. The full table: [`lib/report-back.md`](https://github.com/HunterMcGrew/PRISM/blob/main/.prism/skills/prism-conductor/lib/report-back.md).
4. **Fleet containment plus a conflict gate.** Fleet is the dispatch engine over multiple lanes — one engine; a pipeline is a one-lane fleet. Per-lane independence contains failures natively: a lane that throws drops out and skips its remaining stages while the others continue. Before parallelizing, Sol checks for **overlapping blast radius** — two lanes touching the same shared type, architect doc, or plan file — and serializes those rather than manufacturing merge conflicts (refuse-to-parallelize, the recorded default). `needs-human` pauses are batched into one end-of-segment report, never one ping per lane. The contract: [`lib/fleet.md`](https://github.com/HunterMcGrew/PRISM/blob/main/.prism/skills/prism-conductor/lib/fleet.md).

## Model tiering

Sol reads the tier off the goal-state lane and sets it per dispatch through the runtime's model override.

| Role | Default model | Escalation |
| --- | --- | --- |
| **Sol (Conductor)** | Opus (default, not hardcoded) | n/a — already top tier |
| **Winston (architect / plan)** | Always Opus, never weaker | n/a — the firewall never runs cheap |
| Worker personas (Clove, Sasha, Briar, Eric, …) | Sonnet | → Opus on signal (the worker stalled the unit twice) |

A plan-readiness failure means *re-plan harder* — Winston is already on the strong model — not *escalate the model*. A config seam lets other runtimes map their own tiers.

## Autonomy between gates, never through them

The invariant that keeps Sol from eroding PRISM's human-gated correctness model: **Sol drives autonomously between gates and stops at them, but never clears a gate itself.** Each gate is owned by a persona — Winston for plan / A-P-C, Nora for the Definition of Ready — that judges its own gate against a human-set autonomy policy (`launch` / `internal` / `hobby`) and returns one of three dispositions: `auto-cleared`, `needs-human`, or `blocked`. Sol routes the disposition; it never judges one.

The rule is one-directional — a persona can always escalate up (`needs-human` under any policy) but never auto-clear below the policy ceiling the human set. Every `auto-cleared` gate records the owner's stakes reasoning in the plan and surfaces in the end-of-run report, so autonomy moves you from in-the-loop to on-the-loop without going dark. Merge is the one unconditional gate, enforced by branch protection — even a maximally-autonomous Sol parks every lane there for the human. The full decision, with the alternatives weighed, is in [ADR-0048](https://github.com/HunterMcGrew/PRISM/blob/main/.prism/spec/adrs/0048-conductor-autonomy-between-gates.md).

## Composition with the personas Sol dispatches

Sol is a thin conductor — every dispatched persona runs its full, unmodified rules and voice. Three relationships are worth calling out:

- **Winston is the firewall.** Before Sol dispatches implementation for a phase, the plan must pass the detail bar (any worker at any effort executes it without judgment calls). A vague plan is a hard pause that routes back to Winston to re-plan — not "proceed carefully." This is the single highest-leverage gate, because a worker dispatched against a fuzzy plan is exactly where two runs diverge.
- **Nora keeps the no-write-path boundary honest.** Sol never writes Linear or creates tickets. When a worker surfaces a `found-followup-work` signal, Sol routes it to Nora, who applies her scope-fit and Definition-of-Ready gates — the ticket gets created by the persona that owns ticket creation, not by Sol.
- **Briar and Eric are verdict sources.** A self-review or PR review comes back as a primary verdict Sol routes (clean → advance, findings → back to Clove). Eric never approves a PR ([ADR-0011](https://github.com/HunterMcGrew/PRISM/blob/main/.prism/spec/adrs/0011-eric-never-approves-prs.md)); review findings route, they don't clear the merge gate.

Sol is the lifecycle-scale generalization of the `prism-review-loop` utility — the review loop runs the self-review-then-PR-review gauntlet to a clean pass over the review *segment*; Sol generalizes the same loop-to-done, route-by-verdict, pass-budget shape to the *whole* lifecycle and gives it a persona. Review-loop is the review-segment ancestor: [`.ai-skills/skills/prism-review-loop/shared.md`](https://github.com/HunterMcGrew/PRISM/blob/main/.ai-skills/skills/prism-review-loop/shared.md).

## The self-growth loop

The v1 discovery loop closes in a single run what previously required a second triage pass. When a worker persona (Clove, Briar, Eric, Sasha) finds work outside its local frame and beyond trivial, it emits a `found-bug` or `found-followup-work` signal with a structured `target` — the file, symbol, scope slug, or error signature that identifies what was found. The signal enters the run-control registry (`signals[]` in goal-state) and waits for the next segment boundary.

At each segment boundary, Sol runs **step 9 — reconcile** ([`step-09-reconcile.md`](https://github.com/HunterMcGrew/PRISM/blob/main/.prism/skills/prism-conductor/step-09-reconcile.md)). The reconcile step reads the full registry, deduplicates signals structurally, runs the decision box on each distinct target, and applies the convergence governor. The next segment's lane set is then *recomputed* from that output — not carried forward unchanged from the run's input. The lane set is an output of the run, not only its input. A zero-delta reconcile (no new signals, or all new signals dropped) sets termination reason `converged` and hands off to step 10 — report.

The worker pre-filter keeps the signal queue signal-to-noise honest: a worker answers two questions before emitting. Is the find inside its local frame (the function it's modifying and the helpers it extracted)? Is it trivial (a one-line fix with no design trade-off)? In-frame and trivial means fix inline and emit nothing. Everything else emits. When the worker is unsure, it over-emits rather than silently dropping the find — dedup and the decision box downstream do the filtering. When a broken dependency blocks the lane, the worker emits the signal *and* continues on a documented stub so the lane does not stall.

The reconcile-delta procedure is built as a reusable primitive ([`lib/reconcile.md`](https://github.com/HunterMcGrew/PRISM/blob/main/.prism/skills/prism-conductor/lib/reconcile.md)) — not inlined into the discovery path — so later phases ride the same seam: Phase B will drive greenfield specs into a ticket-tree via the same primitive; Phase C will reconcile cross-team dependency signals the same way.

See [ADR-0050](https://github.com/HunterMcGrew/PRISM/blob/main/.prism/spec/adrs/0050-conductor-growth-loop-and-convergence-governor.md) for the design decision behind the growth loop and why between-segment is the right placement.

## The registry and structural dedup

Sol maintains a live registry across the entire run: the `signals[]` and `lanes[]` arrays in goal-state. Every signal that enters the run and every lane that exists or has existed lives here — it is the single record of everything found and in-flight.

Before the decision box runs, Sol deduplicates signals structurally by `target`. The match logic:

- **Primary match:** same `target.file` and same `target.symbol` (when non-null).
- **Secondary match (any one):** same `target.scopeSlug`, or same `target.errorSignature` (when non-null).

On a match, the later signal is *attached* to the first registry entry — `processedAt` set, linked to the existing decision unit — and no second decision-box dispatch is opened for it. The structural dedup is what makes the dispatch budget buy real progress rather than redundant investigations: when N worker lanes all find the same broken helper, one decision unit handles it, not N.

**Sol dedups structurally only.** A structurally ambiguous "are these the same issue?" call — where `target` fields don't yield a clear match — routes to Nora, not decided by Sol. This is air-traffic control, not interpretation, and it keeps Sol on the right side of the no-semantic-judgment invariant ([ADR-0048](https://github.com/HunterMcGrew/PRISM/blob/main/.prism/spec/adrs/0048-conductor-autonomy-between-gates.md)).

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

Governor thresholds — budget ceiling, K, and the breadth gate — are config-driven, not hardcoded. The values above are the defaults for Thrive; a consuming team overrides them via the config seam in goal-state.

## See also

- [ADR-0048 — Conductor: Autonomy Between Gates](https://github.com/HunterMcGrew/PRISM/blob/main/.prism/spec/adrs/0048-conductor-autonomy-between-gates.md) — the autonomy invariant and the alternatives weighed
- [ADR-0049 — Conductor: Teams Are Lane-Groups, Not Sub-Conductors](https://github.com/HunterMcGrew/PRISM/blob/main/.prism/spec/adrs/0049-conductor-teams-are-lane-groups.md) — why the flat lane list holds and sub-conductors are permanently rejected
- [ADR-0050 — Conductor: Growth via Between-Segment Reconcile, Governed by a Two-Axis Convergence Brake](https://github.com/HunterMcGrew/PRISM/blob/main/.prism/spec/adrs/0050-conductor-growth-loop-and-convergence-governor.md) — the design decision behind the reconcile primitive and the three-brake governor
- The conductor loop, step by step: [`step-01-init.md`](https://github.com/HunterMcGrew/PRISM/blob/main/.prism/skills/prism-conductor/step-01-init.md) … [`step-09-reconcile.md`](https://github.com/HunterMcGrew/PRISM/blob/main/.prism/skills/prism-conductor/step-09-reconcile.md) → [`step-10-report.md`](https://github.com/HunterMcGrew/PRISM/blob/main/.prism/skills/prism-conductor/step-10-report.md)
- [`lib/goal-state.md`](https://github.com/HunterMcGrew/PRISM/blob/main/.prism/skills/prism-conductor/lib/goal-state.md) — run-control schema and read/write/mutate protocol
- [`lib/reconcile.md`](https://github.com/HunterMcGrew/PRISM/blob/main/.prism/skills/prism-conductor/lib/reconcile.md) — the reusable reconcile-delta primitive
- [`lib/decision-box.md`](https://github.com/HunterMcGrew/PRISM/blob/main/.prism/skills/prism-conductor/lib/decision-box.md) — the deferred-commit decision box procedure
- [`lib/convergence.md`](https://github.com/HunterMcGrew/PRISM/blob/main/.prism/skills/prism-conductor/lib/convergence.md) — the convergence governor and three-brake priority order
- [`lib/report-back.md`](https://github.com/HunterMcGrew/PRISM/blob/main/.prism/skills/prism-conductor/lib/report-back.md) — verdicts, signals, the gate registry, and the deterministic routing table
- [`lib/fleet.md`](https://github.com/HunterMcGrew/PRISM/blob/main/.prism/skills/prism-conductor/lib/fleet.md) — lane lifecycle, native containment, and the conflict gate
- [`.ai-skills/skills/prism-review-loop/shared.md`](https://github.com/HunterMcGrew/PRISM/blob/main/.ai-skills/skills/prism-review-loop/shared.md) — the review-segment utility Sol generalizes to the lifecycle
