# Step 04 — Dispatch

Author and invoke the autonomous Workflow segment that drives the lanes through `implement → ac-verify → self-review → pr-review → qa → docs`. Cite `claude.md` § The autonomous segment for the Claude Code mechanism rather than restating it: `pipeline(lanes, …)` for the per-lane phase chains, `agent()` calls carrying `agentType` (the compiled persona def at `.claude/agents/<persona>.md`), `model` (the per-dispatch tier from the model-tiering table), `schema` (the report-back verdict shape), `isolation: 'worktree'` (one checkout per lane), and `budget` (the global dispatch cap).

`ac-verify` dispatches Reese in AC Verification mode after deterministic ratification (which checks the work *ran*) and before the review loop (AC verification checks it *did what was asked* — an UNMET caught here costs one Clove dispatch, not Briar + Eric twice). This is a **new** phase distinct from the existing post-review `qa` phase (Reese's tester-facing checklist mode) — the two are different Reese modes, disambiguated by input shape (no PR yet at `ac-verify`; a PR exists at `qa`).

The segment runs each lane forward autonomously and **clears `auto-cleared` gates in place** without returning to Sol — the owning persona judges its own gate under the autonomy policy and the script proceeds. It breaks back to Sol only when a lane returns `needs-human` / `blocked`, completes, or trips a budget.

Sol does not talk to running workers. It reads the returned verdicts when the segment ends and records them in goal-state (`lastVerdict`, `signals`, the gate disposition) per the mutate protocol in `.prism/skills/prism-conductor/lib/goal-state.md`. Set the per-dispatch `model` off each lane's `models` map — the top-tier model for top-tier personas per the tiering table and for any worker that escalated, the worker-tier model for the default worker dispatch. When a run carries a `teamConfig[]` array, Sol also checks whether the dispatched lane's `team` matches any `teamConfig[].team` entry; when a match exists and `modelTier` is non-null, that value overrides the default tier for this lane's dispatch. The per-team model tier is the override when set; the run-wide default applies otherwise. See `lib/goal-state.md` § Field notes for the `teamConfig[]` schema.

The runtime equivalents for other adapters (`@openai/codex-sdk`, `@cursor/sdk`, or a sequential `prism-handoff` fallback) live in `codex.md` / `cursor.md`.

## Per-team dispatch ordering

Sol reads each eligible lane's `team` field and applies a team-aware ordering layer on top of the existing slot-fill — lanes sharing a `team` value form a logical queue (preserving their `lanes[]` array order); Sol interleaves teams round-robin as concurrency slots open, so no single team starves another within the shared concurrency cap. A lane with `team: null` is its own implicit singleton group, ordered by array position.

This is an **ordering layer on the existing single-conductor dispatch loop, not a second scheduler** (NFR-3) — the concurrency cap, conflict gate, and budget are unchanged shared resources. The conflict gate is defined in `lib/fleet.md`; the `pipeline(lanes, …)` mechanism is defined in `claude.md § The autonomous segment`.

When recording dispatch state in goal-state, Sol tags each dispatched lane's segment-membership by `team` — the `team` value on the lane is the grouping key the end-of-run report (step-10) reads to produce the per-team view. No new schema field is needed; the existing `team` value serves as the grouping key. This is a documentation note only: no build effect.

## Dependency-gated eligibility

Before a lane is placed in the dispatch set, Sol checks its `dependsOn` list. A lane is **eligible** only when every `laneId` in its `dependsOn` has `status: "done"`. A lane with an unresolved edge is held: set `phaseStatus: "parked"` and `blockedBy: [<unresolved laneIds>]` per the mutate protocol in `lib/goal-state.md`, and it is not added to the `pipeline()` set this segment.

Eligibility is checked **at each segment boundary (segment-granular), not mid-segment** — consistent with the segment model where Sol does not talk to running workers (`lib/goal-state.md` § Mutate protocol). A dependency that resolves mid-segment unblocks the dependent lane at the *next* boundary, not instantly. An empty `dependsOn` is trivially eligible (Phase A/B behavior, FR-2).

## Batching against the concurrency cap

When the ready-lane set for a segment exceeds the concurrency cap, Sol invokes the batcher (`lib/batcher.md`) to order and slice the ready lanes into a cap-sized segment. Sol then authors the segment's `pipeline()` over that batch; the remainder queues for the next segment's dispatch boundary.

Batching changes **which** lanes a segment's `pipeline()` covers, not **how** a lane runs — the autonomous segment, the gauntlet, and the merge-only human gate are all unchanged (NFR-1). The batcher's four ordering rules, budget composition, and dedup composition are defined in `lib/batcher.md`; do not restate them here.

A lane whose `dependsOn` is unmet never enters the ready set for batching — it is waiting on a dependency, not queued behind a batch slot. The report (step-10) distinguishes the two states (FR-10, `lib/batcher.md § Input`).

## The review phase is the gauntlet

The `self-review` and `pr-review` phases are not single passes — each runs the prism-review-loop ladder (`.claude/skills/prism-review-loop/SKILL.md`, canonical `.ai-skills/skills/prism-review-loop/shared.md`): dispatch the reviewer; a `done` (zero-findings) verdict advances the phase, a `needs-fix` verdict routes the recorded `## Review Issues` to the implementer and re-dispatches the **same** reviewer, looping until a clean pass. `self-review` (Briar) loops to clean, then `pr-review` (Eric) loops to clean. A fix pushed during the `pr-review` loop is re-reviewed by the same reviewer (Eric), not re-run through self-review — the self-review loop already ran to clean before `pr-review` opened.

Cleaner-path findings (the ladder's third rung) never gate the zero-findings exit. They surface as secondary signals — `found-followup-work` (→ Nora) or `observation` (recorded) — and route per the report-back contract; a clear-cut cleaner path the implementer can fold into the current fix dispatch may ride the same `needs-fix` loop instead.

`pr-review` is a **default rung, not a proportionality skip** — any lane with an open PR runs Eric, regardless of how small or green the change looks. Skipping the PR review because the diff seems trivial is the failure mode this default exists to prevent; a single self-review leaves no review signal on the PR the human merges. Opening and pushing the PR are conducted actions inside this phase, not human gates — Clove opens/pushes the PR and Eric reviews it as a fresh dispatch, all autonomously. Sol parks for the human only at merge (`step-10-report.md`; ADR-0011), never at push or PR-open; the operator's run invocation plus the autonomy policy already authorize every outward action up to the merge gate.

The loop reuses Sol's existing guardrails rather than duplicating them — the pass budget and three-strike survival rule from `step-07-budgets.md`, and the disagreement fast-path (a fixer who believes a finding is wrong → Winston to adjudicate, → human only if Winston needs your input) from `step-06-escalate.md`. Cite the ladder for its rules; do not restate the budget or strike numbers here.

One ladder rule does not carry over: the prism-review-loop phase-boundary gate (its interactive `/prism-handoff` prompt at the `self-review → pr-review` transition) does not fire under Sol's autonomous segment — Sol advances the transition in place. Interactive gates only reach the human through `needs-human` / `pendingHumanReport`; Sol surfaces a review boundary to the human only when a rung returns `needs-human`, never as a routine handoff prompt.

## Tree dispatch — leaf-first, container lanes roll up

**Only leaf lanes dispatch.** A leaf lane is one with no other lane naming it as `parentId`. The `pipeline(lanes, …)` segment is authored over the **leaf lanes only**; container lanes (epics, issues — any lane with ≥1 child) are never passed to `agent()` and never enter a phase chain. The container-lane definition is in `lib/goal-state.md` § Field notes.

**Container status is derived, not dispatched.** A container lane's `status` is computed from its children at each reconcile boundary: `done` only when every child is `done` or `dropped`; `blocked` if any child is `blocked`; otherwise `active`. Its `currentPhase` is not meaningful — set it to `null` and rely on `status`.

**The invariant:** no container lane closes as `done` while any child remains `active`, `parked`, or otherwise unresolved (FR-1). This falls out of the rollup rule — it needs no separate enforcement.

**Parent-status computation is a deterministic run-state rollup.** Sol reads child `status` from goal-state and computes the parent's; it is not a dispatch and does not count against `globalBudget.spent`.

## Exit condition

A segment returned and its verdicts are recorded in goal-state — control advances to step-05 to route them.
