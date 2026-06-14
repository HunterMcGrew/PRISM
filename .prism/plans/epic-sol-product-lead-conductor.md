# Plan: epic-sol-product-lead-conductor

## Ticket

GitHub epic [#115](https://github.com/HunterMcGrew/PRISM/issues/115) — Sol self-growing conductor v1 (Phase A). Ten child issues, one per user story: [#116](https://github.com/HunterMcGrew/PRISM/issues/116) (US-1) … [#125](https://github.com/HunterMcGrew/PRISM/issues/125) (US-10), linked as native sub-issues. PRISM tracks on GitHub issues, not Linear. Sourced from the finalized PRD at [`.prism/prds/sol-product-lead-conductor.md`](../prds/sol-product-lead-conductor.md) (`internal` stakes) and §7 of [`.prism/plans/sol-product-lead-vision-brief.md`](./sol-product-lead-vision-brief.md).

## Goal

Evolve Sol from a single-team lead over a fixed lane set into a self-growing conductor whose fleet grows itself mid-run as agents discover new work — governed by a two-axis convergence brake so it closes the loop without running away. v1 is Phase A only (discovery loop + decision box + governor + registry/dedup); Phases B/C/D are named and out of scope.

---

## User Stories

> Decomposed from the finalized v1 PRD (Mira, prism-user-stories). v1 scope only — Phase A discovery loop, the discovered-work decision box, the two-axis convergence governor, and the registry/dedup. Stories trace to the PRD's 5 user journeys and FR-1…FR-9 / NFR-1…NFR-5. AC hints are Gherkin-style starting points — Winston formalizes them into full acceptance criteria and resolves the `[ASSUMPTION-N]` gaps each story references.

### Story 1: The discovery loop closes within a single run

**As a** PRISM operator,
**I want** Sol to grow the fleet mid-run — registering work that agents discover, ticketing-or-folding it, and dispatching it as new lanes within the same run,
**so that** one run drives a goal to *actually done* including the work that surfaces along the way, instead of parking everything found for a second triage pass I have to come back for.

*Walking skeleton — the thinnest end-to-end slice across the journey: one worker emits one signal → Sol reconciles → (trivial) dedup → Nora decides new-ticket → autonomy gate clears → one new lane dispatches → it completes → end-of-run report. The thicker slices (dedup-of-many, the governor, cross-lane fold-in, the uncertain path) layer on top. Traces Journey 1, FR-1, FR-3.*

**Acceptance criteria hints:**
- [ ] Given a run that starts with *N* origin lanes, When a lane emits a discovered-work signal and it survives dedup and the decision box, Then Sol dispatches a new lane within the same run and the run can complete with more than *N* lanes — no human manually added a lane.
- [ ] Given a segment boundary, When Sol reconciles, Then the next segment's lane set is recomputed from `goal-state` (`signals[]` + `lanes[]`) — the lane set is an output of the run, not only its input.
- [ ] Given a segment with zero new signals, When Sol reconciles, Then the reconcile is a no-op and the run converges (termination reason `converged`).
- [ ] The reconcile-delta step is built as a reusable primitive (not inlined into the discovery path), because Phases B/C/D ride the same primitive. *(non-behavioral — FR-1)*

### Story 2: Workers emit discovered work behind a scope-fit pre-filter

**As a** PRISM worker persona (Clove, Briar, Eric, or Sasha),
**I want** to run a lightweight scope-fit pre-filter before emitting a discovered-work signal, and to fix trivial local-frame work inline instead of emitting it,
**so that** genuine out-of-frame work gets captured without flooding the queue with trivial noise that burns the operator's budget.

*Traces Journey 1, FR-2, NFR-5. The pre-filter is a cheap subset of Nora's four-signal gate — exact criteria TBD per [ASSUMPTION-4]; stub convention for the broken-dependency case TBD per [ASSUMPTION-5]. Reference the gap; don't resolve it.*

**Acceptance criteria hints:**
- [ ] Given a worker finds work outside its local frame, When the work passes the scope-fit pre-filter, Then the worker emits a signal carrying a structured `target`.
- [ ] Given a worker finds trivial, local-frame work, When it applies `code-standards.md § Refactor scope`, Then it fixes the work inline and emits nothing.
- [ ] Given a worker finds that a dependency of the code it is currently writing is broken, When it cannot proceed cleanly, Then it emits the signal **and** proceeds on a documented stub so the lane does not stall.
- [ ] Given a borderline find, When the worker is unsure whether to emit, Then it over-emits (deduped/dropped downstream) rather than silently dropping the find. *(NFR-5 — over-emit < under-emit)*

### Story 3: Structural dedup at the door

**As a** PRISM operator,
**I want** Sol to collapse multiple lanes that surfaced the same structured `target` into one decision unit before any budget is spent,
**so that** budget buys one fix, not one redundant investigation per finder.

*Traces Journey 2, FR-3, FR-9. Sol dedups **structurally** by `target` (the same file-overlap class of check as the conflict gate); semantic "are these the same issue?" calls route to Nora — never decided by Sol.*

**Acceptance criteria hints:**
- [ ] Given multiple signals with the same `target` in a segment, When Sol batches and dedups at the door, Then it attaches the later signals to the first and dispatches exactly one Nora-led decision unit for that `target`.
- [ ] Given two lanes emit the same `target` concurrently in one segment, When Sol reconciles, Then both attach to a single registry entry — no double-dispatch.
- [ ] Given a signal whose sameness is structurally ambiguous, When Sol cannot match it by `target`, Then Sol routes the "same issue?" judgment to Nora rather than deciding it.
- [ ] Sol maintains the live registry (`signals[]` + `lanes[]`) as the single record of everything found and in-flight. *(non-behavioral — FR-9)*

### Story 4: The deferred-commit decision box

**As** Nora (the ticket-creation persona, acting in-loop),
**I want** to evaluate a discovered signal against `followup-scope.md`'s four-signal gate, draft the ticket, but **defer** the Linear write and return `{ disposition, draftTicket, escalationReason? }`,
**so that** ticket commits stay crash-safe and respect the autonomy ceiling instead of firing the moment a disposition is chosen.

*Traces Journey 1, FR-4, FR-5. Dispositions are `followup-scope.md`'s three tiers + `drop`. Labor split: **Nora** runs the four-signal scope judgment; **Sol** picks fold-into-active vs. follow-up-PR from the target lane's merge status (a deterministic run-state lookup, not interpretation); Winston is consulted only on blast-radius (Story 5).*

**Acceptance criteria hints:**
- [ ] Given a deduped signal, When Nora evaluates it, Then she resolves it to one of fold-into-active-PR / follow-up-PR-no-ticket / new-ticket / `drop` and returns the disposition with a drafted ticket, without writing to Linear yet.
- [ ] Given a disposition with no escalation, When Nora finalizes, Then she commits the ticket only if warranted, and `goal-state` records the outcome.
- [ ] Given a chosen disposition of fold-into-active vs. follow-up-PR, When Sol resolves which one, Then Sol picks it from the target lane's merge status (run-state lookup) — Nora never interprets merge status.
- [ ] Given any intermediate decision step, When Sol writes `goal-state`, Then `pendingTicketCommit` is set so a crash mid-decision resumes deterministically. *(ties to Story 5)*

### Story 5: The uncertain decision routes to Winston and resumes crash-safe

**As a** run owner,
**I want** a blast-radius-uncertain discovery to route through a Winston read and then back to Nora to finalize — with `goal-state` written at every step,
**so that** a run interrupted mid-decision resumes without double-committing a ticket or losing a signal.

*Traces Journey 4, FR-4, NFR-3. The uncertain path is two Nora dispatches around one Winston read (routed → winston-verdict → finalized). Typed escalation reason is `blast-radius` | `scope-fit`.*

**Acceptance criteria hints:**
- [ ] Given Nora returns `escalationReason: "blast-radius"`, When Sol routes a Winston read, Then Winston returns its assessment and Sol dispatches Nora a second time to finalize with it.
- [ ] Given the run crashes after `routed` but before `finalized`, When the run resumes, Then it continues from the last `goal-state` step with `pendingTicketCommit` intact — no double-commit, no lost draft.
- [ ] Given any decision-box step (`routed` / `winston-verdict` / `finalized`), When it completes, Then `goal-state` is written before the next step begins.
- [ ] Given a resumed run, When it reconciles, Then no signal recorded before the crash is dropped. *(NFR-3)*

### Story 6: Cross-lane fold-in rules

**As a** PRISM operator,
**I want** a discovered fix that belongs to a sibling lane to follow explicit rules — spawn a follow-up-PR lane when the sibling is *done*, route to a human gate when it overlaps a still-live worktree,
**so that** fold-ins land safely instead of reopening a cleaned worktree or letting two lanes edit the same code unsupervised.

*Traces Journey 5, FR-6. The conflict gate now checks pending-vs-**active** lanes, not only pending-vs-pending.*

**Acceptance criteria hints:**
- [ ] Given a fold-in targets a *done* sibling (worktree cleaned), When Sol handles it, Then it spawns a new follow-up-PR lane that links the origin PR, verifies the diagnosis before implementing, and fixes the missing test that let the bug through.
- [ ] Given a fold-in overlaps a **parked or active** sibling's live worktree, When the conflict gate evaluates it, Then it cannot auto-resolve two worktrees on the same code and routes to a human gate.
- [ ] Given a done sibling, When a follow-up-PR lane is spawned, Then branch/PR naming follows the ported `followup-scope.md` conventions.

### Story 7: The two-axis convergence governor brakes the fleet

**As a** run owner,
**I want** dispatch budget, a generation cap, and a breadth gate to brake the self-growing fleet in priority order,
**so that** a run that keeps finding work can't run away overnight — it stops on budget, depth, or a too-large single expansion, and tells me why.

*Traces Journey 3, FR-7. Three brakes: **dispatch budget** (primary, depth-agnostic — default TBD per [ASSUMPTION-6], load-bearing); **generation cap K=3** (lineage signal + soft gate, tunable by autonomy per [ASSUMPTION-3]); **breadth gate** (default 12, configurable). Generation is lineage (`parent.generation + 1`), not a wall-clock wave. May split along SPIDR's Rules axis (one brake per story) during planning — kept as one governor here because the brakes share a priority order.*

**Acceptance criteria hints:**
- [ ] Given a run that exhausts its dispatch budget, When the budget is hit, Then Sol parks the remaining lanes and reports with termination reason `budget-exhausted` — depth-agnostic.
- [ ] Given a lane at generation 3 whose finds would be generation 4, When Sol reconciles, Then those finds are captured but parked to a human gate (no auto-dispatch past K).
- [ ] Given a single reconcile that yields more new lanes than the breadth gate allows (default 12), When Sol reconciles, Then the breadth gate surfaces the expansion to a human rather than auto-dispatching it.
- [ ] Given any completed run, When it ends, Then the termination reason is `budget-exhausted` or `converged` — zero runs end `killed` or unset. *(success metric — no runaway)*
- [ ] Breadth-gate default and concurrency cap are the same order of magnitude — confirm with Winston whether a near-cap expansion serializes against the cap. *(non-behavioral — open constraint)*

### Story 8: The autonomy ceiling holds

**As a** run owner,
**I want** the autonomy policy to be the explicit, up-front opt-out of Nora's per-write confirmation — `hobby` writes tickets autonomously; `internal`/`launch` batch ticket commits above trivial into a human gate,
**so that** every autonomous decision stays under a ceiling I set on purpose, and nothing gets auto-committed above it.

*Traces Journey 1, FR-8, NFR-1. Auto-created tickets are DoR-draft (estimate null), flagged for human ratification before a future run picks them up. Per-level threshold tuning (does `launch` lower K or tighten the breadth gate?) is TBD per [ASSUMPTION-3].*

**Acceptance criteria hints:**
- [ ] Given autonomy `hobby`, When Nora resolves a disposition that warrants a ticket, Then she writes it autonomously.
- [ ] Given autonomy `internal` or `launch`, When a ticket commit above trivial is warranted, Then Nora returns the draft as `needs-human` and the commit batches into a human gate — zero auto-commits above trivial.
- [ ] Given any auto-created ticket, When it is drafted, Then it is DoR-draft (estimate null) and flagged for human ratification.
- [ ] Given an agent operating below the ceiling, When it hits a decision above the ceiling, Then it escalates — it never auto-clears below it. *(NFR-1 / ADR-0048)*

### Story 9: `goal-state` v2 is additive and config-driven

**As a** future PRISM-consuming team (SPC),
**I want** `goal-state` v2 fields to be additive and nullable, with governor thresholds and the autonomy→threshold mapping config-driven,
**so that** old runs still parse, no breaking migration is needed, and the seams are tunable per team rather than hardcoded to Thrive's defaults.

*Traces NFR-2, NFR-4, and the secondary-user need. v2 ships the full additive field set; v1 logic drives only the discovery-loop subset (`generation`, per-lane `scope`, structured `target`/`disposition`/`processedAt`, `pendingTicketCommit`, typed escalation reason). `parentId` ships driving discovery lineage only; `team`/`dependsOn` ship nullable schema-forward, not driven until Phase C — bet that one migration now beats two, per [ASSUMPTION-2].*

**Acceptance criteria hints:**
- [ ] Given a run written against the v1 schema, When it is read by v2 code, Then it still parses — fields are additive and nullable, no breaking migration step.
- [ ] Given the governor thresholds (dispatch budget, K, breadth gate) and the autonomy mapping, When a consuming team configures them, Then they are read from config — not hardcoded to Thrive defaults.
- [ ] Given a v2 run interrupted by a revert, When rollback occurs, Then it is abandon-not-migrate: the run is parked and reported, and in-flight `pendingTicketCommit` entries are surfaced to the human rather than auto-resolved.
- [ ] No design element assumes deeper than one-level nesting, more than the per-run concurrency cap, or a budget/counter not shared across a nested run. *(NFR-4)*

### Story 10: The end-of-run report surfaces every spin-out

**As a** PRISM operator,
**I want** the end-of-run report to list the goal status, every discovered spin-out lane, and the termination reason,
**so that** nothing found along the way is orphaned in a backlog and I can see why the run stopped without inspecting `goal-state` by hand.

*Traces FR-8 and the success metrics. There is no separate telemetry/dashboard surface in v1 — the report and `goal-state` inspection are the observability surface, per [ASSUMPTION-1].*

**Acceptance criteria hints:**
- [ ] Given a completed run, When the end-of-run report is produced, Then it lists the goal status plus every discovered spin-out (ticketed, folded, or parked) — no spin-out is omitted.
- [ ] Given a run that grew itself, When the report lists spin-outs, Then each ratified-pending spin-out lane that ran to completion is shown as such.
- [ ] Given any completed run, When the report is produced, Then it states the termination reason (`converged` / `budget-exhausted`).
- [ ] Given v1, When success is measured, Then it is observable from the report and `goal-state` inspection alone — confirm with Winston there is no instrumentation requirement. *([ASSUMPTION-1])*

---

### Scope

**In scope (v1 — these stories):** the discovery loop on the existing flat fleet (Phase A); the reconcile-delta primitive; the deferred-commit decision box; the two-axis convergence governor; the registry + structural dedup; `goal-state` schema v2 (additive, with v1 driving the discovery-loop subset).

**Deferred (later phases — named, not built):**
- Phase B — hierarchy (epic→issue→ticket tree semantics) + greenfield specs→ticket-tree decompose.
- Phase C — teams as lane-groups + cross-team dependency sequencing + integration gate (the `team`/`dependsOn` fields driven).
- Phase D — scale: batching against the concurrency cap + partitioning the single `goal-state` file.
- Discovery-rate decay as a runaway signal.

**Out of scope (won't — standing invariants, not v1 simplifications):**
- Sub-conductors / nested Sol — permanently rejected on Workflow-engine grounds (nesting forbidden; a nested run shares the parent's cap/counter/budget → zero throughput). Teams are data on the flat lane list instead.
- Sol making semantic judgments ("same issue?" / "earns a ticket?") — always Nora's.
- Auto-merge at any scale — merge stays the one unconditional human gate (ADR-0011).

---

## Decisions

> Winston, plan authoring. Resolves the PRD's six `[ASSUMPTION-N]` gaps and the two architectural threads the stories surfaced. The two load-bearing decisions are promoted to ADRs (status `proposed` — flip to `accepted` on Hunter's ratification). Decisions marked **confirm** are Winston's calls presented for Hunter's ratification before implementation.

### Architecture (promoted to ADRs)

- **Teams are lane-groups, not sub-conductors.**
  - **Root cause:** the vision wanted parallel teams; the fork was nested-Sol vs. labeled lanes. The Workflow engine settles it — nesting deeper than one level throws, and a nested workflow shares the parent's concurrency cap, agent counter, and budget.
  - **Chosen approach:** a team is a `team` field on the flat `lanes[]`. Sub-conductors are a standing invariant rejection (one Sol per run), not deferred scope. Beats nested-Sol, which is structurally blocked *and* buys zero throughput.
  - **Implementation guidance:** all growth/governor logic runs on the flat lane list; no design in any phase introduces a conductor that dispatches a conductor.
  - → promoted to [ADR-0049](../spec/adrs/0049-conductor-teams-are-lane-groups.md).

- **Growth via between-segment reconcile, governed by a two-axis convergence brake.**
  - **Root cause:** discovered work today becomes a separate future run; the fleet can't grow mid-run. Closing the loop without a brake creates a runaway hazard.
  - **Chosen approach:** a reuse-once reconcile-delta primitive recomputes the next segment's lane set from `goal-state` between Workflow segments; Sol holds the registry and structurally dedups by `target`; convergence brakes on dispatch budget (primary, depth/shape-agnostic), generation cap K=3 (soft gate + lineage signal), and a breadth gate (default 12).
  - **Implementation guidance:** the three brakes evaluate at reconcile time in priority order; the budget is the guarantee, generation is a signal. Build the reconcile-delta as a reusable lib primitive — Phases B/C/D ride it.
  - → promoted to [ADR-0050](../spec/adrs/0050-conductor-growth-loop-and-convergence-governor.md).

### Resolved assumptions

- **[ASSUMPTION-6 resolved] Dispatch-budget default = `maxDispatches: 100` (unchanged), and every dispatch counts against it. (confirm)**
  - **Root cause:** the budget is the primary, load-bearing brake; its default for self-growing runs was unspecified.
  - **Alternatives considered:** a lower self-growth-specific default (e.g. 40); a separate budget for discovered work.
  - **Chosen approach:** keep the existing `maxDispatches: 100` as the v1 default and count *all* dispatch types against it — origin-lane phases, decision-box dispatches (Nora/Winston), and discovered-lane phases alike. A single shape-agnostic counter is what makes the brake honest; a separate discovered-work budget would let the two pools each stay "under budget" while total spend runs away. Configurable per team (see schema decision below).
  - **Implementation guidance:** `globalBudget.spent` increments on every `agent()` dispatch in the Workflow segment, not only on origin-lane work.

- **[ASSUMPTION-2 resolved] Ship the full additive nullable v2 schema now; `team`/`dependsOn` are provisional. (confirm)**
  - **Root cause:** whether to ship later-phase fields (`team`, `dependsOn`, `parentId` tree-semantics) nullable-now or add them with their phase.
  - **Chosen approach:** confirm the PRD's bet — ship the full additive nullable set. Old runs parse forward; one additive migration beats two. Hedge the YAGNI counter: `parentId` ships **driven** (discovery lineage) in v1, `generation`/per-lane `scope`/structured `target`·`disposition`·`processedAt`/`pendingTicketCommit`/typed escalation ship **driven**; `team` and `dependsOn` ship **nullable, not driven, explicitly provisional** — Phase C may reshape them without ceremony because nothing reads them yet.
  - **Implementation guidance:** mark `team`/`dependsOn` in the schema doc as "Phase C — shape provisional, not driven in v1."

- **[ASSUMPTION-3 resolved] Autonomy policy and governor thresholds are orthogonal in v1.**
  - **Root cause:** does `launch` lower K below 3 or tighten breadth below 12?
  - **Chosen approach:** keep K=3 / breadth=12 flat across all autonomy levels in v1. Autonomy governs the *confirmation gate* (whether ticket commits batch to a human); the governor governs *convergence* (runaway). They are different knobs — coupling them conflates blast-radius-of-writes with fleet-growth-rate. The config seam (below) lets a team wire `launch`→lower-K later without a schema change, when there's data to tune on. Clean YAGNI win.

- **[ASSUMPTION-4 resolved] Worker scope-fit pre-filter = a two-question local-frame test.**
  - **Root cause:** the exact pre-filter criteria (a cheap subset of Nora's four-signal gate) were unspecified.
  - **Chosen approach:** the worker answers two questions before emitting — (1) *Is this in my local frame?* (the lines I'm editing / their function / helpers I extracted, per `code-standards.md § Refactor scope`) and (2) *Is it trivial?* (one-line, no design trade-off). In-frame **and** trivial → fix inline, emit nothing. Otherwise → emit `found-bug`/`found-followup-work` with a structured `target`. The worker deliberately does **not** attempt Nora's adjacency/size/persona-alignment judgment — that's Nora's, inside the decision box. Tiebreaker on a borderline find: **over-emit < under-emit** (emit; downstream dedups/drops).
  - **Implementation guidance:** house additively in `followup-scope.md`; cite the four-signal gate as the heavier downstream check, do not restate it.

- **[ASSUMPTION-5 resolved] Broken-dependency stub convention: emit-and-proceed, surface-not-rewire.**
  - **Root cause:** when a worker finds a dependency of code it's writing is broken, the stub format and how the dependent lane reconciles when the real fix lands were unspecified.
  - **Chosen approach:** the worker (a) emits the signal with a structured `target`, and (b) proceeds on a **documented stub** — a clearly-marked placeholder whose comment names the emitted signal's `target`. Reconciliation is **surface, not auto-rewire**: the signal is tracked in the registry, and when the fix lane lands, the end-of-run report flags the original stub site for human/follow-up attention. v1 does **not** auto-replace stubs — the dependent lane's worktree may already be done; rewiring is itself follow-up work. Conservative and crash-safe.

- **[ASSUMPTION-1 resolved] No telemetry surface in v1. (confirm)**
  - **Chosen approach:** confirm — the end-of-run report (every spin-out + termination reason) and `goal-state` inspection are the observability surface. All five success metrics are observable from those two surfaces; a telemetry/dashboard surface is a later-phase concern. No instrumentation requirement before merge.

### Architectural threads

- **Breadth gate (12) vs. concurrency cap (~12): serialization-by-queueing is safe; the gate need not sit below the cap. (confirm)**
  - **Root cause:** the breadth-gate default (12, Hunter-calibrated) and the runtime concurrency cap (`min(16, cores-2)`, ~12) are the same order of magnitude — the PRD asked whether a near-cap expansion serializes against the cap, or whether the gate should sit below it.
  - **Chosen approach:** keep breadth=12 (honor the calibration). The two govern different things — the cap is a *runtime* limit (exceeding it queues, it doesn't fail), the breadth gate is a *governance* limit (surface large expansions to a human before auto-dispatch). A reconcile yielding >12 distinct new lanes hits the governance gate; one yielding ≤12 dispatches and the runtime queues the overflow against the cap, which is the engine's safe default, not a failure. A team that wants no silent queueing lowers the breadth gate below its cap via the config seam.
  - **Implementation guidance:** document the queueing behavior in `convergence.md`; do not lower the default.

- **Convergence governor stays one cohesive group, three sub-tasks.** Story 7's three brakes share a priority order and a single reconcile-time evaluation point — splitting them into independent tasks would fragment the priority logic that binds them. Each brake is its own sub-task (independently testable) under one group. (SPIDR-Rules split at sub-task grain, not lane grain.)

### Schema & migration

- **`goal-state` version bumps to `"2"`; v2 reads v1, v1 refuses v2.** v2 fields are additive nullable, so v2 code reading a v1 file (older version) parses and treats missing fields as null — the additive-migration guarantee (NFR-2). v1 code reading a v2 file (newer version) hits the existing version-mismatch refusal in the read protocol — which *is* the rollback safety. No down-migration step is needed (resolves NFR-2's "confirm with Winston").
- **Rollback is abandon-not-migrate.** A v2 run interrupted by a revert to v1 code is parked and reported (version-mismatch refusal); in-flight `pendingTicketCommit` entries surface to the human rather than auto-resolving. Nothing to strip — v1 simply doesn't read v2 fields.
- **Governor thresholds and the autonomy→threshold mapping are config-driven, not hardcoded to Thrive defaults** (NFR-4, Story 9, secondary-user SPC). The seam lives in the schema/convergence doc; defaults (100 / K=3 / 12) are the Thrive values a consuming team can override.
- **The reconcile-delta primitive, the registry/dedup, the decision box, and the convergence governor each get their own lib reference doc** (`lib/reconcile.md`, `lib/decision-box.md`, `lib/convergence.md`), cited by the new reconcile step — so Phases B/C/D reuse them by citation and the priority order / dispositions live in exactly one home (cite-don't-restate, per `implementation-task-detail.md`).

### Review-surfaced (Briar self-review, tasks 1–14)

- **Decision-box escalation reason is `blast-radius` only — `scope-fit` is removed from the enum.** (Briar major)
  - **Root cause:** the typed escalation enum shipped as `{ blast-radius, scope-fit }`, but only `blast-radius` has a handler (Sol routes a Winston read → Nora finalizes). A Nora return of `scope-fit` falls through silently to the no-escalation path, contradicting the typed contract. The deeper issue: `scope-fit` had no coherent handler to write. Escalation routes *to* a party who resolves the question — `blast-radius` routes to Winston. But "is this same-scope or split-scope?" *is* Nora's four-signal judgment; there is no third party to escalate it to. Sol can't take it (`decision-box.md`: "Sol never judges scope"; standing invariant: semantic judgments are "always Nora's"). Winston can't take it (blast-radius is architecture; scope-fit is the ticket-earns-its-place call, which is Nora's). A human gate is redundant — ticket commits above trivial already batch to a human gate via the autonomy ceiling.
  - **Alternatives considered:** (A) give `scope-fit` a handler — route to a human gate, or back to Nora with the over-emit<under-emit tiebreaker, or to Sol. (B) remove `scope-fit` from the enum; Nora resolves scope ambiguity herself via the tiebreaker rather than escalating it.
  - **Chosen approach:** (B) remove `scope-fit`. Every form of (A) fights an invariant — routing scope judgment to Sol violates "Sol never judges scope," to Winston conflates blast-radius with scope-fit, to a human gate duplicates the autonomy ceiling that already gates ticket commits. The design already hands Nora the resolution: when a scope find is borderline, the **over-emit < under-emit** tiebreaker (ASSUMPTION-4 / NFR-5) plus the conservative-disposition default (prefer the lighter `fold-active` / `followup-pr` over standing up a new ticket) lets Nora resolve it inside her own gate. `scope-fit` was a self-resolved disposition uncertainty wearing an escalation reason's clothes — which is exactly why it never had a handler.
  - **Implementation guidance:** narrow the enum to `escalationReason: "blast-radius"` (and `escalation.reason` typed value to `"blast-radius" | string`) at all four sites — `lib/goal-state.md`, `lib/decision-box.md`, `step-09-reconcile.md`, and `prism-ticket-start/shared.md`. In `shared.md` step 4, drop the `scope-fit` clause and add a sentence that Nora resolves a genuinely ambiguous same-scope-vs-split call herself via over-emit<under-emit (conservative default: the lighter disposition), not by escalating. Exact text in `## Review Issues`.
  - **Verdict:** → no promotion needed (decision-box escalation contract is conductor-local to `lib/decision-box.md`; the "Sol never judges scope" invariant it rests on is already promoted in ADR-0049 and the plan's standing invariants).

---

## Implementation Tasks

> Grouped by persona. Sequenced walking-skeleton-first: tasks 1–6 build Story 1's thin end-to-end slice (schema → reconcile primitive → decision box → wired loop); tasks 7–13 thicken it (governor, pre-filter, fold-in, report). The implementer is Clove for all spec/doc edits (the conductor's step/lib docs and skill instructions are this feature's source); Winston owns the two ADRs (done this session); Eli owns the dev doc.
>
> **Build note:** edits under `.prism/skills/prism-conductor/` (step + lib files) are not build inputs — verify content-only changes with `pnpm prism:check` (drift + tests + manifest). Edits under `.ai-skills/skills/**` and `.prism/rules/**` are build inputs — run `pnpm prism:build` to regenerate the platform copies, then `pnpm prism:check`.

### Clove (implementation)

1. **`goal-state` schema v2** — `.prism/skills/prism-conductor/lib/goal-state.md`. In the ```json``` schema block (lines ~11–42): bump `"version": "1"` → `"2"`. Add to each lane object: `"team": null`, `"parentId": "laneId or null"`, `"dependsOn": []`, `"generation": 0`, `"scope": "one-line lane scope statement"`, `"pendingTicketCommit": false`. Change the `signals[]` element shape to add a structured `"target": { "file": "string", "symbol": "string or null", "scopeSlug": "string or null", "errorSignature": "string or null" }`, plus `"disposition": "fold-active | followup-pr | new-ticket | drop | null"` and `"processedAt": "ISO-8601 or null"`. Change `escalation.reason` to a typed `"reason": "blast-radius | scope-fit"`. Add to `globalBudget`: keep `"maxDispatches": 100` and add a comment-free `"countsAllDispatches": true` marker is **not** needed — instead, in § Field notes, add bullets stating: (a) `version` is `"2"`; v2 reads v1 forward (missing fields → null), v1 refuses v2 via the version-mismatch protocol — that refusal is the rollback safety; (b) `team`/`dependsOn` ship nullable and **provisional** (Phase C — shape not yet driven); `parentId` is driven for discovery lineage (`generation = parent.generation + 1`); (c) every dispatch counts against `globalBudget.spent` — origin, decision-box, and discovered alike; (d) governor thresholds and the autonomy→threshold mapping are config-driven (defaults 100 / K=3 / 12 are Thrive values, overridable). Verification: content-only — `pnpm prism:check`.

2. **Reconcile-delta primitive + registry/dedup** — new file `.prism/skills/prism-conductor/lib/reconcile.md`. Content: the between-segment reconcile-delta procedure as a reusable primitive — (a) read `goal-state` (`signals[]` + `lanes[]`); (b) **structural dedup at the door**: for each unprocessed signal, match its `target` (same `file`, or same `symbol`/`scopeSlug`/`errorSignature`) against in-flight and already-disposed registry entries — on a match, *attach* the later signal to the first (set `processedAt`, link to the existing decision unit) and do not re-dispatch; (c) the line: Sol dedups **structurally** only — a structurally-ambiguous "same issue?" call routes to Nora, never decided by Sol; (d) compute the lane delta (distinct unprocessed targets → candidate new lanes); (e) note that discovery-loop growth and (later) greenfield specs→ticket-tree decompose are the *same* primitive — build once, reused by Phases B/C/D. Cross-link `lib/goal-state.md` (registry = `signals[]`+`lanes[]`) and `lib/fleet.md` (same file-overlap class as the conflict gate). Verification: content-only — `pnpm prism:check`. Sequence: after task 1.

3. **Convergence governor reference** — new file `.prism/skills/prism-conductor/lib/convergence.md`. Content: the two-axis governor as a single priority-ordered reference (cited by tasks 6 and 7 so the order lives in one home). Document, in priority order: (1) **dispatch budget** — primary, depth/shape-agnostic; every dispatch counts; on exhaustion park remaining lanes, termination reason `budget-exhausted`; (2) **generation cap K=3** — lineage (`parent.generation + 1`), origin = gen 0; gen 1–3 auto-dispatch; a gen-3 lane's gen-4 finds are captured but parked to a human gate; a soft gate + lineage signal, not the guarantee; (3) **breadth gate** (default 12) — a single reconcile yielding >12 distinct new lanes surfaces the expansion to a human. Document the breadth-vs-cap interaction: a ≤12 auto-dispatch that exceeds the concurrency cap **serializes by queueing** (safe, the runtime default), and a team wanting no silent queueing lowers breadth below its cap via the config seam. State the termination-reason invariant: every completed run records `converged` or `budget-exhausted` — never `killed`/unset. Note thresholds are config-driven (defaults are Thrive values). Verification: content-only — `pnpm prism:check`. Sequence: after task 1.

4. **Deferred-commit decision box** — new file `.prism/skills/prism-conductor/lib/decision-box.md`. Content: the Nora-led deferred-commit procedure Sol invokes per distinct deduped `target` — (a) Sol dispatches Nora to evaluate the signal against `followup-scope.md`'s four-signal gate; Nora resolves a disposition (fold-into-active-PR / follow-up-PR-no-ticket / new-ticket / `drop`), **drafts** the ticket, **defers** the Linear write, and returns `{ disposition, draftTicket, escalationReason? }`; (b) **labor split** — Nora runs the four-signal scope judgment; **Sol** picks fold-into-active vs. follow-up-PR from the target lane's merge status (a deterministic run-state lookup, never Nora interpreting merge status); Winston is consulted only on `blast-radius`; (c) **no-escalation path** — Nora finalizes, committing the Linear ticket only if warranted and only if the autonomy gate clears (task 11); (d) **uncertain path** — on `escalationReason: "blast-radius"`, Sol routes a Winston read, then dispatches Nora a second time to finalize with it (two Nora dispatches around one Winston); (e) **crash-safety** — `goal-state` is written at each step (`routed` → `winston-verdict` → `finalized`) with `pendingTicketCommit` set, so a resume after a mid-decision crash is deterministic (no double-commit, no lost draft); on resume, no signal recorded before the crash is dropped. Cross-link `lib/reconcile.md`, `lib/report-back.md`, `.prism/rules/followup-scope.md`. Verification: content-only — `pnpm prism:check`. Sequence: after task 2.

5. **Nora's in-loop decision-box mode** — `.ai-skills/skills/prism-ticket-start/shared.md`. Add a section "In-loop decision-box mode (dispatched by Sol)" describing: when dispatched by Sol with a discovered signal, Nora runs her four-signal scope-fit gate, **drafts** the ticket as a DoR-draft (estimate null, flagged for human ratification), **defers** the Linear write, and returns `{ disposition, draftTicket, escalationReason? }` where `escalationReason ∈ { blast-radius, scope-fit }`. She does not write Linear until the finalize dispatch, and only then if the autonomy gate clears. Cite `lib/decision-box.md` and `followup-scope.md` (do not restate the four-signal gate). Verification: `pnpm prism:build` then `pnpm prism:check`. Sequence: after task 4.

6. **The reconcile step + wire the run loop** — new file `.prism/skills/prism-conductor/step-09-reconcile.md`; rename `.prism/skills/prism-conductor/step-09-report.md` → `step-10-report.md`. The new step-09 content: after a segment completes (steps 04–08), Sol (a) invokes the reconcile primitive (`lib/reconcile.md`) to dedup signals and compute the lane delta; (b) for each distinct deduped `target`, runs the decision box (`lib/decision-box.md`); (c) applies the convergence governor (`lib/convergence.md`) in priority order — budget, then generation cap, then breadth gate — to decide which delta lanes auto-dispatch vs. park to a human gate; (d) branches: non-empty auto-dispatchable delta → loop back to step-04 dispatch for the next segment; empty delta or a tripped brake → step-10 report. **Removal/rename completeness:** grep the tree for `step-09` and update every hand-source reference to the renamed report file — at minimum `.ai-skills/skills/prism-conductor/shared.md` (step index), `.prism/skills/prism-conductor/step-06-escalate.md`, `step-07-budgets.md`, `step-08-fleet.md`, and `lib/fleet.md` ("batched for step-09" → "for step-10"); the dev doc is Eli's task 14. Verification: `pnpm prism:check`; confirm `grep -rn "step-09-report" .prism .ai-skills` returns nothing. Sequence: after tasks 2, 3, 4.

7. **Wire the step index + run loop into the skill body** — `.ai-skills/skills/prism-conductor/shared.md` (§ Workflow overview, lines ~45–57) and `.ai-skills/skills/prism-conductor/claude.md` (§ The autonomous segment). In shared.md: insert step 9 **reconcile** (`step-09-reconcile.md` — between-segment growth: dedup the registry, run the decision box per target, apply the convergence governor, loop or report) and renumber report to step 10 (`step-10-report.md`). Add one paragraph after the step list describing the run loop: decompose → plan-readiness → [segment: dispatch → route → escalate → budgets → fleet] → reconcile → (loop to dispatch | report). In claude.md § The autonomous segment: add that between segments Sol runs the reconcile step and authors the next segment's `pipeline()` over the recomputed lane set via `resumeFromRunId`, and that `budget` on `agent()` calls is the shared global dispatch budget (every dispatch counts). Verification: `pnpm prism:build` then `pnpm prism:check`. Sequence: after task 6.

8. **Extend the global budget into the primary dispatch-budget brake** — `.prism/skills/prism-conductor/step-07-budgets.md`. In the global-budget portion, state that the global budget *is* the depth/shape-agnostic dispatch-budget brake: every dispatch counts (origin, decision-box, discovered), default `maxDispatches: 100`, on exhaustion park remaining lanes with termination reason `budget-exhausted`. Cite `lib/convergence.md` for the full priority order; do not restate generation/breadth here. Verification: content-only — `pnpm prism:check`. Sequence: after task 3.

9. **Implement the generation cap + breadth gate in the reconcile step** — `.prism/skills/prism-conductor/step-09-reconcile.md` (extends task 6's file). In the governor-application portion, implement the two reconcile-time brakes per `lib/convergence.md`: compute each candidate lane's `generation` (`parent.generation + 1`); auto-dispatch gen 1–3, park gen-4 finds to a human gate; count distinct new lanes in the reconcile and park the whole expansion to a human gate when it exceeds the breadth gate (default 12). Cite `lib/convergence.md`. Verification: content-only — `pnpm prism:check`. Sequence: after task 6 (same file) and task 3.

10. **Worker emit pre-filter + broken-dependency stub** — `.prism/rules/followup-scope.md` **and** its install copy `templates/install/.prism/rules/followup-scope.md`. Add **additively** (do not alter the three-tier dispositions or the four-signal gate — they are a fixed input) a section "§ Worker emit pre-filter (Sol-run-time)": the two-question local-frame test (in-frame? trivial?) → fix inline vs. emit; the over-emit < under-emit tiebreaker; and the broken-dependency case — emit the signal **and** proceed on a documented stub whose comment names the emitted `target`, with reconciliation by *surface-not-rewire* (the registry tracks it; the end-of-run report flags the stub site when the fix lands; v1 never auto-replaces a stub). Cite the four-signal gate as the heavier downstream check. Verification: `pnpm prism:build` then `pnpm prism:check`. Sequence: independent (parallel with 1–9).

11. **Structured signal `target`, pre-filter citation, autonomy batching** — `.prism/skills/prism-conductor/lib/report-back.md`. In § Secondary signals: add that `found-bug`/`found-followup-work` signals carry the structured `target` (per `lib/goal-state.md`), and cite `followup-scope.md § Worker emit pre-filter` as the gate a worker runs before emitting (over-emit < under-emit). In § Gate dispositions: add the deferred-commit shape — Nora returns `{ disposition, draftTicket, escalationReason? }`; under `hobby` she may finalize autonomously; under `internal`/`launch`, a ticket commit above trivial returns `needs-human` and batches into the end-of-segment human gate (zero auto-commits above trivial). Cite `lib/decision-box.md`. Verification: content-only — `pnpm prism:check`. Sequence: after tasks 1, 4, 10.

12. **Conflict gate pending-vs-active + cross-lane fold-in** — `.prism/skills/prism-conductor/lib/fleet.md`. In § Conflict gate: extend the overlap check from pending-vs-pending to **pending-vs-active** — a fold-in overlapping a parked or active sibling's live worktree cannot auto-resolve two worktrees on the same code and routes to a human gate. Add a § Cross-lane fold-in: a fold-in targeting a *done* sibling (worktree cleaned, never reopened) spawns a new follow-up-PR lane that (a) links the origin PR, (b) verifies the diagnosis before implementing, (c) fixes the missing test that let the bug through; branch/PR naming follows `followup-scope.md` conventions. Verification: content-only — `pnpm prism:check`. Sequence: after task 1.

13. **End-of-run report: spin-outs + termination reason** — `.prism/skills/prism-conductor/step-10-report.md` (renamed in task 6). Add that the closing report lists, in addition to per-lane status: every discovered spin-out and its outcome (ticketed / folded / parked), each ratified-pending spin-out lane that ran to completion shown as such, any surfaced stub sites (task 10), and the run's termination reason (`converged` | `budget-exhausted`). No spin-out is omitted. Verification: content-only — `pnpm prism:check`. Sequence: after tasks 6, 9, 10.

14. **Build + full verify** — run `pnpm prism:build` then `pnpm prism:check` from the repo root; confirm the build regenerates platform copies for the edited `.ai-skills/**` and `.prism/rules/**` sources with no drift, tests pass, and the manifest verifies. Sequence: last (after all Clove tasks).

### Eli (documentation)

15. ✓ **Update the conductor dev doc** — `docs/content/dev/ai-skills/conductor.md`. Add narrative sections covering the v1 self-growth capability: the between-segment growth loop, the registry + structural dedup, the deferred-commit decision box (with the uncertain/crash-safe path), the two-axis convergence governor, and the new step in the run loop (reconcile, step 9). Update any step-list/numbering references (report is now step 10). Cross-link ADR-0049 and ADR-0050. Verification: prose-only — confirm internal links resolve. Sequence: after task 7 (skill body wired) and task 6 (steps renamed).

---

## Acceptance Criteria

> Winston, plan authoring — formalized from Mira's 10 stories' Gherkin hints. Epic-grain, observable from the end-of-run report and `goal-state` inspection (no telemetry surface — [ASSUMPTION-1]). Reese and Briar derive the verifiable per-PR checklist downstream. Format per `.prism/templates/acceptance-criteria.md`.

### Behavioral

- [ ] Given a run that starts with N origin lanes, When a lane emits a discovered-work signal that survives dedup and the decision box and the governor permits it, Then a new lane is dispatched within the same run and the run can complete with more than N lanes, with no human having manually added a lane (US-1)
- [ ] Given a segment boundary, When the run reconciles, Then the next segment's lane set is recomputed from the run-control registry — the lane set is an output of the run, not only its input (US-1)
- [ ] Given a segment with zero new signals, When the run reconciles, Then the reconcile makes no change and the run finishes with termination reason "converged" (US-1)
- [ ] Given a worker finds work outside its local frame that is not trivial, When it applies the emit pre-filter, Then it emits a signal carrying a structured target (US-2)
- [ ] Given a worker finds trivial work inside its local frame, When it applies the emit pre-filter, Then it fixes the work inline and emits nothing (US-2)
- [ ] Given a worker finds a dependency of the code it is currently writing is broken, When it cannot proceed cleanly, Then it both emits the signal and proceeds on a documented stub so the lane does not stall (US-2)
- [ ] Given a borderline find where the worker is unsure whether to emit, When it decides, Then it emits rather than silently dropping the find (US-2)
- [ ] Given multiple signals naming the same target within a segment, When the run dedups at the door, Then it attaches the later signals to the first and dispatches exactly one decision unit for that target (US-3)
- [ ] Given two lanes emit the same target concurrently in one segment, When the run reconciles, Then both attach to a single registry entry and no second decision unit is dispatched for that target (US-3)
- [ ] Given a signal whose sameness to an existing one cannot be matched by target, When the run reconciles, Then the "same issue?" judgment is routed to the ticket persona rather than decided by the conductor (US-3)
- [ ] Given a deduped signal, When the ticket persona evaluates it in-loop, Then it resolves to one of fold-into-active-PR / follow-up-PR-no-ticket / new-ticket / drop and returns the disposition with a drafted ticket, without writing to the ticket system yet (US-4)
- [ ] Given a chosen disposition of fold-into-active versus follow-up-PR, When the conductor resolves which one, Then it is chosen from the target lane's merge status as a run-state lookup, and the ticket persona never interprets merge status (US-4)
- [ ] Given a disposition that warrants a ticket and clears the autonomy gate, When the ticket persona finalizes, Then the ticket is committed and the outcome is recorded in run-control (US-4)
- [ ] Given a blast-radius-uncertain discovery, When the decision routes, Then the architect persona returns a read and the ticket persona is dispatched a second time to finalize with it (US-5)
- [ ] Given a run crashes after the decision is routed but before it is finalized, When the run resumes, Then it continues from the last recorded step with the pending ticket commit intact — no double-commit and no lost draft (US-5)
- [ ] Given a resumed run, When it reconciles, Then no signal recorded before the crash is dropped (US-5)
- [ ] Given a discovered fix that belongs to a done sibling lane whose worktree is cleaned, When the conductor handles it, Then it spawns a new follow-up-PR lane that links the origin PR, verifies the diagnosis before implementing, and fixes the missing test that let the bug through (US-6)
- [ ] Given a discovered fix that overlaps a parked or active sibling's live worktree, When the conflict gate evaluates it, Then it routes to a human gate rather than auto-resolving two worktrees on the same code (US-6)
- [ ] Given a run that exhausts its dispatch budget, When the budget is hit, Then the remaining lanes are parked and the run reports termination reason "budget-exhausted", regardless of fleet depth or shape (US-7)
- [ ] Given a lane at generation 3 whose finds would be generation 4, When the run reconciles, Then those finds are captured but parked to a human gate rather than auto-dispatched (US-7)
- [ ] Given a single reconcile that yields more new lanes than the breadth gate allows, When the run reconciles, Then the expansion is surfaced to a human rather than auto-dispatched (US-7)
- [ ] Given any completed run, When it ends, Then its termination reason is "converged" or "budget-exhausted" — never "killed" or unset (US-7)
- [ ] Given autonomy policy "hobby", When the ticket persona resolves a disposition that warrants a ticket, Then it writes the ticket autonomously (US-8)
- [ ] Given autonomy policy "internal" or "launch", When a ticket commit above trivial is warranted, Then the draft is returned as needs-human and the commit batches into a human gate, with zero auto-commits above trivial (US-8)
- [ ] Given any auto-created ticket, When it is drafted, Then it is a Definition-of-Ready draft with a null estimate, flagged for human ratification (US-8)
- [ ] Given a completed run, When the end-of-run report is produced, Then it lists the goal status plus every discovered spin-out (ticketed, folded, or parked) with none omitted, and states the termination reason (US-10)

### Non-behavioral

- [ ] The reconcile-delta step is built as a reusable primitive, not inlined into the discovery path, so later phases ride the same primitive (US-1)
- [ ] The conductor maintains the live registry (signals and lanes) as the single record of everything found and in-flight (US-3, US-9)
- [ ] A run written against the v1 schema still parses when read by v2 code — fields are additive and nullable, with no breaking migration step (US-9)
- [ ] The governor thresholds (dispatch budget, generation cap, breadth gate) and the autonomy→threshold mapping are read from configuration, not hardcoded to one team's defaults (US-9)
- [ ] A v2 run interrupted by a rollback to v1 code is parked and reported, with in-flight pending ticket commits surfaced to the human rather than auto-resolved (US-9)
- [ ] No design element assumes deeper than one-level nesting, more concurrency than the per-run cap, or a budget or counter not shared across a nested run (US-9)
- [ ] The dispatch budget, generation cap, and breadth gate are evaluated in a fixed priority order at reconcile time, with the budget as the primary brake (US-7)
- [ ] Success is observable from the end-of-run report and run-control inspection alone, with no separate instrumentation requirement (US-10)

### AC Sync Log

| Date | Agent | Action | Plan | Tracker |
| ---- | ----- | ------ | ---- | ------ |
| 2026-06-14 | Winston | Generated AC from the 10 user stories | updated | not synced — no ticket yet (Nora opens the epic next) |
| 2026-06-14 | Nora | Opened GitHub epic #115 + 10 child issues (#116–#125); synced full AC into epic #115 body | unchanged | synced — GitHub #115 |

---

## History

- 2026-06-13 [hmcgrew/sol-product-lead-prd]: Created epic plan; Mira decomposed the finalized v1 PRD into 10 user stories with Gherkin AC hints and explicit in/deferred/out scope. Next: Winston for the two ADRs (vision-brief §7.9) + the epic implementation plan.
- 2026-06-14 [hmcgrew/sol-product-lead-prd]: Winston wrote ADR-0049 (lane-groups over sub-conductors) and ADR-0050 (between-segment reconcile + two-axis governor), both `proposed`; built `## Implementation Tasks` (14 Clove + 1 Eli), `## Acceptance Criteria`, and `## Decisions` resolving all 6 PRD assumptions + the breadth-vs-cap thread. Next: Hunter ratifies scope + ADRs, then Nora opens the Linear epic.
- 2026-06-14 [hmcgrew/sol-product-lead-prd]: Hunter ratified the three `confirm` decisions as Winston resolved them — budget default 100 (all dispatches count), breadth gate stays 12 (near-cap queueing is safe), and the full additive v2 schema ships now (team/dependsOn nullable-provisional). ADRs ready to flip `proposed` → `accepted` at Nora's epic open.
- 2026-06-14 [hmcgrew/sol-product-lead-prd]: Nora opened GitHub epic #115 with 10 child issues #116–#125 (one per user story, native sub-issues), synced the full AC set into the epic body, set the plan `## Ticket` field, and flipped ADR-0049/0050 `proposed` → `accepted` across canonical + platform mirrors. Next: Clove for implementation (tasks 1–6 first — schema + reconcile skeleton).
- 2026-06-13 [hmcgrew/sol-product-lead-prd]: Clove completed tasks 1–6 (child issue #116 walking skeleton): goal-state schema v2 (structured target/disposition/generation/pendingTicketCommit), reconcile-delta primitive, convergence governor, deferred-commit decision box, Nora in-loop mode, and step-09-reconcile + step-09-report→step-10-report rename with tree-wide sweep. Build passes 158/158, prism:check clean, grep sweep clean outside closed plan history.
- 2026-06-13 [hmcgrew/sol-product-lead-prd]: Clove completed tasks 7–14 (segment 2 — thicken the skeleton): wired run loop into shared.md/claude.md; extended global budget as primary brake; added generation computation to reconcile; added worker emit pre-filter + broken-dependency stub to followup-scope (canonical + install copy); extended report-back with structured target + autonomy batching; extended fleet conflict gate to pending-vs-active + cross-lane fold-in; added spin-outs/termination-reason to step-10 report. Build 158/158, prism:check clean, no drift.
- 2026-06-13 [hmcgrew/sol-product-lead-prd]: Briar self-review (tasks 1–14): 1 major, 2 minor; build green (158/158); no dangling step-09-report references in live source. See ## Review Issues.
- 2026-06-13 [hmcgrew/sol-product-lead-prd]: Winston resolved Briar's scope-fit major — remove `scope-fit` from the escalation enum (Nora resolves scope ambiguity herself via over-emit<under-emit; the labor split gives no coherent party to escalate it to). Recorded the call in ## Decisions and wrote exact Clove directives for all 3 findings into ## Review Issues. Next: Clove executes the four-site enum narrowing + two minor fixes.
- 2026-06-13 [hmcgrew/sol-product-lead-prd]: Clove applied all 3 Briar review fixes (acd7365): removed scope-fit from escalation enum at four sites (major), corrected disposition tokens in decision-box.md Step B (minor), fixed pendingTicketCommit field note to match crash-safety table (minor). Build 158/158, prism:check clean, no drift.
- 2026-06-13 [hmcgrew/sol-product-lead-prd]: Eli wrote task 15 — added four narrative sections to `docs/content/dev/ai-skills/conductor.md` covering the self-growth loop, registry/structural dedup, deferred-commit decision box (uncertain/crash-safe path), and the two-axis convergence governor; fixed stale `step-09-report` reference and updated step count from nine to ten.
- 2026-06-13 [hmcgrew/sol-product-lead-prd]: Briar final gate pass — all three prior findings confirmed resolved (scope-fit removed at all four sites, disposition tokens fixed in decision-box.md Step B, pendingTicketCommit field note matches crash-safety table); Eli dev doc clean (step numbering correct, ADR-0049/0050 cross-links present, enum vocabulary matches, no session-context leakage, no stale step-09-report refs). Build 158/158, prism:check green. Ready for human merge gate.

---

## Review Issues

### `scope-fit` escalation reason is typed but unhandled

- **Severity:** `major`
- **Status:** `fixed` — Fixed in: commit `acd7365`. Removed `scope-fit` from the enum at all four sites; Nora resolves scope ambiguity herself via over-emit<under-emit. See `## Decisions` → "Decision-box escalation reason is `blast-radius` only."
- **File:** `.prism/skills/prism-conductor/lib/decision-box.md:28`, `.prism/skills/prism-conductor/lib/goal-state.md:34` & `:69`, `.prism/skills/prism-conductor/step-09-reconcile.md` (verify), `.ai-skills/skills/prism-ticket-start/shared.md:361`
- **Problem:** `escalationReason: "scope-fit"` is defined in the typed enum but no handler routes it — it falls through to the no-escalation path, contradicting the typed contract.
- **Clove directive (exact edits):**
  1. **`.prism/skills/prism-conductor/lib/decision-box.md:28`** — replace `Returns `{ disposition, draftTicket, escalationReason? }` where `escalationReason ∈ { "blast-radius", "scope-fit" }`.` with `Returns `{ disposition, draftTicket, escalationReason? }` where `escalationReason` is `"blast-radius"` when set. A genuinely ambiguous same-scope-vs-split call is **not** escalated — Nora resolves it herself (over-emit < under-emit; conservative default is the lighter disposition, `fold-active` / `followup-pr`, over a new ticket).`
  2. **`.prism/skills/prism-conductor/lib/goal-state.md:34`** — in the `escalation` object, change `"reason": "blast-radius | scope-fit | string"` to `"reason": "blast-radius | string"`.
  3. **`.prism/skills/prism-conductor/lib/goal-state.md:69`** — in the field note, change `` `escalation.reason` is typed: `"blast-radius"` or `"scope-fit"` for decision-box escalations; plain string for other escalation axes.`` to `` `escalation.reason` is typed `"blast-radius"` for decision-box escalations; plain string for other escalation axes. A same-scope-vs-split scope-fit call is never escalated — Nora resolves it inside her four-signal gate.``
  4. **`.ai-skills/skills/prism-ticket-start/shared.md:361`** — replace bullet 4 (`**Return `{ disposition, draftTicket, escalationReason? }`.** `escalationReason` is typed: `"blast-radius"` (the fix touches shared or high-impact surface) or `"scope-fit"` (the boundary between same-scope and split-scope is genuinely ambiguous). Omit `escalationReason` when there is no uncertainty.`) with: `**Return `{ disposition, draftTicket, escalationReason? }`.** Set `escalationReason: "blast-radius"` only when the fix touches shared or high-impact surface and needs a Winston read. When the same-scope-vs-split-scope boundary is genuinely ambiguous, do **not** escalate — resolve it yourself with over-emit < under-emit (the conservative default is the lighter disposition: `fold-active` / `followup-pr` over a new ticket). Omit `escalationReason` when there is no blast-radius uncertainty.`
  5. **`.prism/skills/prism-conductor/step-09-reconcile.md`** — no edit needed; line 18 already handles only `escalationReason: "blast-radius"`. After the four edits, confirm no remaining `scope-fit` escalation references: `grep -rn "scope-fit" .prism/skills/prism-conductor .ai-skills/skills/prism-ticket-start` should return nothing (the `followup-scope.md` scope-fit *gate* is a different concept and lives elsewhere — it must not be touched).
- **Verification:** `.ai-skills/**` edit (shared.md) is a build input → `pnpm prism:build` then `pnpm prism:check`. The three `.prism/skills/prism-conductor/**` edits are content-only → `pnpm prism:check`. Run the grep in step 5.

### Disposition naming inconsistency in `decision-box.md` Step B

- **Severity:** `minor`
- **Status:** `fixed` — Fixed in: commit `acd7365`. Replaced `follow-up-PR-no-ticket` / `fold-into-active-PR` with enum tokens `followup-pr` / `fold-active` in Step B.
- **File:** `.prism/skills/prism-conductor/lib/decision-box.md:36-37`
- **Problem:** Step B uses backtick'd `follow-up-PR-no-ticket` and `fold-into-active-PR` as if they are the values written into `disposition`, but the schema enum is `followup-pr` / `fold-active`. A reader implementing Step B can't tell which form Sol writes.
- **Clove directive (exact edit):** in `.prism/skills/prism-conductor/lib/decision-box.md`, replace lines 36–37:
  - `- Target lane `status: done` → `follow-up-PR-no-ticket` (worktree cleaned; a new lane spawns).` → `- Target lane `status: done` → disposition `followup-pr` (worktree cleaned; a new follow-up-PR lane spawns).`
  - `- Target lane `status: active | parked` → `fold-into-active-PR` (open worktree; the fix folds into that lane).` → `- Target lane `status: active | parked` → disposition `fold-active` (open worktree; the fix folds into that lane).`
- **Verification:** content-only — `pnpm prism:check`.

### `pendingTicketCommit` field note inaccurate at `finalized`

- **Severity:** `minor`
- **Status:** `fixed` — Fixed in: commit `acd7365`. Field note now reads: `true` at `routed`/`winston-verdict`, resets to `false` at `finalized` — matching the crash-safety table in `decision-box.md`.
- **File:** `.prism/skills/prism-conductor/lib/goal-state.md:74`
- **Problem:** Field note says the field is "set to `true` at each decision-box step (`routed` → `winston-verdict` → `finalized`)" but `decision-box.md` crash-safety table shows it resets to `false` at `finalized`. The note implies it stays `true` through `finalized`.
- **Clove directive (exact edit):** in `.prism/skills/prism-conductor/lib/goal-state.md`, replace line 74 (`` - `pendingTicketCommit` is set to `true` at each decision-box step (`routed` → `winston-verdict` → `finalized`) before the next step begins, enabling deterministic resume after a crash — no double-commit, no lost draft.``) with: `` - `pendingTicketCommit` is `true` at the `routed` and `winston-verdict` steps and resets to `false` at `finalized`, enabling deterministic resume after a crash — a `true` value on resume means the ticket was drafted but not committed (surface it to the human), so there is no double-commit and no lost draft.``
- **Verification:** content-only — `pnpm prism:check`.

---

## Cleanup Items

None.

---

## PR Readiness

Living checklist — updated every time `code-review-self` runs. Reflects current state.

- [x] No critical or major issues
- [x] Types correct — no `any`, no unsafe `as` (content-only diff; no type surface)
- [x] No stray console.logs or debug artifacts
- [x] Tests written for new logic and edge cases (content-only diff; 158/158 pass)
- [x] All debugged issues resolved (no `open` entries)
- [x] Build passes — last run: 2026-06-13 (`pnpm prism:check` 158/158 green, no drift)
- [ ] PR description up to date
- [ ] Lasting decisions promoted to architect context (if applicable)

**Last updated:** 2026-06-13 (Briar final pass — all three prior findings confirmed resolved; Eli dev doc clean)
