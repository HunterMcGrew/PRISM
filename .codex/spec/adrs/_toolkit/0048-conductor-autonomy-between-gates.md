---
Number: 0048
Title: Conductor — Autonomy Between Gates
Status: accepted
Date: 2026-06-13
---

## Context

PRISM's output is trustworthy because humans hold the gates: Eric never approves ([ADR-0011](./0011-eric-never-approves-prs.md)), humans merge, Nora enforces the Definition of Ready, Winston runs the A/P/C plan gate. Adding a goal-driven orchestrator — one persona that decomposes a goal and dispatches the existing personas across the whole lifecycle — risks eroding exactly that property if the orchestrator can clear a gate to keep momentum.

This decision comes out of the epic plan at `.prism/plans/epic-prism-conductor.md` and the in-character design review on it, where Briar, Clove, and Nora independently converged on "autonomy between gates, never through them." Alternatives considered:

- **(a) Bake orchestration into an existing persona** (a Winston or Nora mode) — rejected: hat-stacking violates one-lean-persona-one-job, and an orchestration posture (dispatch + route + track) is distinct from planning or ticket setup.
- **(b) Ship as a voiceless utility skill** like `prism-review-loop` — rejected: the user wants a persona whose *job* is orchestration, with its own posture and voice, not an action that runs in the invoking persona's voice.
- **(c) A new persona on a third *orchestration* axis**, orthogonal to ticket-flow and cadence-driven — chosen.

## Decision

Sol (skill `prism-conductor`) is a persona on a third axis — orchestration. The core invariant: **Sol drives autonomously between gates and stops at them, but never clears a gate itself.**

Each gate is owned by a persona — Winston for plan / A-P-C, Nora for the Definition of Ready — that judges its own gate against a human-set autonomy policy (`launch` / `internal` / `hobby`, reusing Parker's stakes-calibration vocabulary) and returns one of three dispositions: `auto-cleared`, `needs-human`, or `blocked`. Sol routes the disposition; it never judges one. The autonomy rule is one-directional: a persona may always escalate up (`needs-human` under any policy) but never auto-clear below the policy ceiling. Merge is the one unconditional gate — enforced by branch protection ([ADR-0011](./0011-eric-never-approves-prs.md)) at the infrastructure level — so it is never a disposition any persona returns; every lane parks there for the human.

Sol has no authoritative write path. It writes only its own goal-state run-control file (`.prism/conductor-state.json`), dispatches personas, and routes verdicts. It never writes code (Clove's lane), Linear (Nora's lane), or merges (the human's).

## Consequences

- **Positive:** Autonomy moves the human from in-the-loop (approve before) to on-the-loop (review after) without going dark — every `auto-cleared` gate records the owning persona's stakes reasoning in the plan and is surfaced in Sol's end-of-run report. One dispatch engine serves both a single-unit pipeline and a multi-lane fleet (a pipeline is a one-lane fleet).
- **Negative:** A third persona axis to keep oriented against the existing two. A new run-control state primitive (`.prism/conductor-state.json`) lives alongside the branch plans. Fleet runs introduce a worktree per lane and a conflict gate that serializes overlapping-blast-radius lanes rather than parallelizing them.
- **Neutral:** Gate resolutions are written to a plan's `## Decisions` by the gate's owning persona (not Sol) via the existing `OPEN —` decision lifecycle — the owner has the architectural context to write a better record than Sol could, and Sol logs only the ephemeral event in goal-state.

## References

- `.prism/plans/epic-prism-conductor.md` — the epic plan and design review this decision comes out of
- [ADR-0011](./0011-eric-never-approves-prs.md) — Eric never approves; humans merge — the gate-integrity property this preserves
- [ADR-0001](./0001-plan-is-source-of-truth.md) — the plan is the source of truth; Sol's two-channel model keeps it so
- [ADR-0046](./0046-persona-vs-utility-skill-type.md) — the persona-vs-utility distinction Sol lands on the persona side of
- `.prism/skills/prism-conductor/lib/report-back.md` and `lib/goal-state.md` — the dispositions and run-control schema this invariant operates over
