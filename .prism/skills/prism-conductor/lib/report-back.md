# Conductor report-back contract — verdicts, signals, gate dispositions

Reference doc for what a dispatched persona returns to Sol and how Sol routes it. Step files (`step-05-route.md` especially) cite this doc instead of restating the table.

Every dispatched persona does two things when it finishes: it writes its work to the branch plan (the durable content bus — Briar to `## Review Issues`, Sasha to `## Debugged Issues`, Winston to `## Implementation Tasks` / `## Decisions`), **and** it returns a structured report-back to Sol. The report-back is the run-control channel; it carries no work content, only the verdict and signals Sol routes on. Sol's routing is deterministic — it applies the table and never interprets the work behind a verdict.

**The verdict Sol routes on is gate-ratified before the persona returns.** Sol trusts the returned verdict and reads nothing else to route — `report.json` (the gate's input) and the model's structured return are one contract, gated once, so by the time Sol sees a verdict the runtime has already ratified or overridden it against real evidence (per [ADR-0067](../../../spec/adrs/_toolkit/0067-runtime-ratifies-verdicts.md)). The `ratified-verdict.json` the gate writes is an audit artifact — what ran, exit codes, strike count — never a routing input; Sol never reads it. This is the channel-hardening invariant that keeps Sol's determinism safe without any Sol-side contract change.

## Primary verdict

Exactly one per dispatch. It routes the lane.

| Verdict | Meaning | Source persona example |
| --- | --- | --- |
| `done` | The persona completed its job. | Clove shipped the tasks; a review rung came back clean (zero findings). |
| `needs-fix` | A review rung found issues it recorded in `## Review Issues`; they're fixable in-loop. | Briar or Eric returned findings — route to the implementer, re-review, stay in-phase. |
| `blocked` | The persona can't proceed — a dependency, an environment failure, or a missing input. | Clove can't build because an upstream lane hasn't landed. |
| `needs-replan` | The plan is the problem — vague tasks, a wrong decision, a gap. | Clove reports the plan left implementation judgment calls open. |
| `needs-stronger-model` | The dispatch stalled on capability, not on the plan. | A Sonnet worker stalled the same unit twice. |
| `needs-human` | A gate or an open question needs a human. | Winston's A/P/C under a `launch` policy; an `OPEN —` decision; a review finding that needs a human call (disagreement → step-06). |

## Secondary signals

Optional, zero-or-more per dispatch. Each routes **independently** of the primary verdict — a dispatch can be `done` *and* carry a `found-followup-work` signal. Each signal has a `kind`, a `note`, and a routing target.

| Signal | Routes to | Note carries |
| --- | --- | --- |
| `found-bug` | Sasha | What broke and where, enough for a diagnosis dispatch. |
| `found-followup-work` | Nora (through her scope-fit + DoR gate) | The out-of-scope work and why it's separate. |
| `observation` | recorded, no auto-route (`routedTo: null`) | Context worth surfacing in the end-of-run report. |

The split exists because one enum value can't carry both routes — the dry run surfaced a `done` dispatch that also flagged a follow-up. The primary verdict routes the lane; each signal routes on its own. (Sources: a review rung returns `needs-fix` when findings are fixable in-loop, `done` when clean, and `needs-human` only when a finding needs a human call; Sasha's diagnosis is consumed by a `found-bug` signal; Nora's scope-fit gate consumes a `found-followup-work` signal.)

**Structured `target` on `found-bug` and `found-followup-work` signals:** when emitting inside a Sol run, both signal kinds carry a structured `target` object — `{ file, symbol, scopeSlug, errorSignature }` — matching the schema in `lib/goal-state.md`. This is what Sol uses for structural dedup at the registry door; a signal without a `target` cannot be deduped and will be routed to Nora for ambiguity resolution.

Before emitting either signal, a worker runs the two-question local-frame pre-filter in `followup-scope.md § Worker emit pre-filter (Sol-run-time)`. In-frame + trivial → fix inline, emit nothing; everything else → emit with a structured `target`. Tiebreaker: **over-emit < under-emit**.

A `found-bug` / `found-followup-work` signal emitted inside a Sol run carries the emitting lane's `team` value through reconcile and the decision box; a resulting lane inherits it (FR-7) — see `lib/decision-box.md § Step A`. The team tag is never stripped.

## Gate dispositions

A gate's owning persona returns one of three dispositions instead of (or alongside) a plain verdict. The disposition is judged by the **owning persona** under the human-set autonomy policy — Winston for plan / A-P-C, Nora for Definition of Ready — never by Sol.

**Deferred-commit shape (Sol-run-time decision box):** Nora's in-loop evaluation returns `{ disposition, draftTicket, escalationReason? }` rather than a plain gate disposition. The ticket is drafted (DoR-draft, estimate null, flagged for human ratification) but **not yet committed to Linear**.

- Under `hobby` policy: Nora may finalize autonomously — the ticket commits if warranted and the disposition clears.
- Under `internal` or `launch` policy: a ticket commit above trivial returns `needs-human`; the draft batches into `pendingHumanReport` at the end of the segment. Zero auto-commits above trivial.

See `lib/decision-box.md` for the full procedure, crash-safety protocol, and the uncertain (blast-radius) path.

| Disposition | Meaning | Sol routes |
| --- | --- | --- |
| `auto-cleared` | Within policy and low-stakes; the owner cleared it and recorded the stakes reasoning in the plan. | Advance the lane. |
| `needs-human` | The owner escalated regardless of policy. | Pause the lane; append to `pendingHumanReport`. |
| `blocked` | Policy forces a human (e.g. `launch` locked the gate). | Pause the lane. |

On a `needs-human` resolution, the human's answer is durable product content. The **owning persona** writes it — one `## Decisions` entry capturing escalation reason, human answer, and rationale, via the existing `OPEN —` decision lifecycle. Sol logs the gate *event* in goal-state (who escalated, why, resolved-at) and carries the answer back to the owner on re-dispatch ("Winston — Hunter answered: [Y]. Record it and re-judge."). Sol never writes the plan; the two channels split the labor — the ephemeral event in goal-state, the durable decision in the plan.

## Routing table (deterministic)

| Returned | Sol's route |
| --- | --- |
| primary `done` | advance `currentPhase` |
| primary `needs-fix` | dispatch the implementer (Clove) for the `## Review Issues`, then re-dispatch the same reviewer; lane stays in the review phase (the gauntlet loop, bounded by the step-07 pass budget + three-strike rule) |
| primary `needs-replan` / `blocked` | route to Winston (`escalation.axis: replan`) |
| primary `needs-stronger-model` | bump `models.<persona>` to `opus` (`escalation.axis: model`) |
| primary `needs-human` | pause; append to `pendingHumanReport` |
| signal `found-bug` | route to Sasha |
| signal `found-followup-work` | route to Nora (scope-fit + DoR) |
| signal `observation` | record only |
| gate `auto-cleared` | advance |
| gate `needs-human` / `blocked` | pause the lane |

Sol writes `lastVerdict`, `signals`, and the gate disposition into goal-state per the mutate protocol in `.prism/skills/prism-conductor/lib/goal-state.md`.

## Gate registry

The hard-pause gates in a Sol run, and the rule that binds them: **Sol cannot autonomously clear any of them.** The gate's owning persona clears or escalates it under the autonomy policy (`launch` / `internal` / `hobby`); Sol routes the disposition.

| Gate | Owner | Auto-clearable under policy? |
| --- | --- | --- |
| Plan readiness | Sol's firewall (step-03) | **No** — a quality gate, never a stakes gate; a vague plan always re-plans. |
| Winston A/P/C (approve / proceed / cancel) | Winston | Yes, under `internal` / `hobby` for low-stakes plans; `launch` locks it. |
| Nora Definition of Ready | Nora | Yes, under `internal` / `hobby` for clearly-ready tickets; `launch` locks it. |
| Eric review | Eric | **No** — Eric never approves a PR (ADR-0011); review findings route, they don't clear a merge. |
| Integration gate | the human (always) | **No** — always `needs-human` at every autonomy level, including `hobby`; a cross-team convergence checkpoint, not a stakes gate (NFR-4). Fires before an integration lane dispatches. |
| Human merge | the human | **No** — the one unconditional gate, enforced by branch protection (ADR-0011); never a returned disposition, always a park. |

Merge is the hard backstop on every lane. Even a maximally-autonomous Sol on a `hobby` policy parks at merge — branch protection enforces it at the infrastructure level, so merge is never a disposition any persona returns. See [ADR-0011](../../../spec/adrs/_toolkit/0011-eric-never-approves-prs.md) and [`git-conventions.md` § Who merges](../../../rules/git-conventions.md) — the review-side rule binds the reviewer, the merge-side rule binds every persona, and this registry binds Sol. The integration gate is the second unconditional `needs-human` gate alongside merge — but where merge is enforced by branch protection, the integration gate is enforced by Sol's dispatch logic (`lib/fleet.md § Integration gate`).

**Why one file, not two.** A gate disposition *is* one of the return shapes this contract enumerates — co-locating the disposition enum with the gates it applies to keeps them from drifting. Splitting the registry into a separate `gates.md` would put the enum in one file and its gates in another, guaranteeing the two fall out of sync.
