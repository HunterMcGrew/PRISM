# Step 02 — Decompose

Dispatch the upstream spec personas in dependency order so each one populates the plan — the durable content bus. Sol only sequences and records; every persona does its own work and writes its own plan section.

Dependency order:

1. **Parker** (PRD) — initiative-grain requirements.
2. **Mira** (user stories) — `As a / I want / So that` stories with acceptance hints.
3. **Pixel** (design) — only when the unit has a UI surface; skip otherwise.
4. **Winston** (architecture + plan) — the `## Implementation Tasks`, `## Decisions`, and `## Acceptance Criteria` that the implementation phase executes against.

Lay down **one lane per independently-shippable unit**. A fleet run decomposes a goal into several lanes here; a pipeline run carries one. For each lane, record the phase progression in goal-state (`currentPhase` / `phaseStatus`) as each persona returns — Sol never writes the plan content itself, only the run-control pointers (see `.prism/skills/prism-conductor/lib/goal-state.md` for the write/mutate protocol).

Each upstream persona returns a primary verdict per `.prism/skills/prism-conductor/lib/report-back.md`; route it (step-05) before advancing the lane. A spec persona that hits a gate (e.g. Winston's A/P/C under the autonomy policy) returns the gate disposition — Sol routes it, never judges it.

## Greenfield mode

Sol supports a `greenfield` decompose mode distinct from the existing hand-listed lane decompose above (which is **unchanged**).

In greenfield mode, Sol takes a PRD document path and an architecture document path and runs the Parker→Winston→Nora chain documented in `lib/greenfield-decompose.md` as a conducted segment. The chain emits an epic→issue→ticket tree into goal-state. After the chain completes, Sol runs the ratification gate (`lib/greenfield-decompose.md` § Ratification gate). On operator approval — or at `hobby` stakes where the gate auto-clears — the leaf-ticket lanes hand off to the normal step-04 dispatch flow with tree-aware convergence (`step-04-dispatch.md` § Tree dispatch).

The mode is selected at intake (step-01) from the operator's invocation: a PRD + architecture handoff signals greenfield; a hand-listed lane set signals the existing mode.

## Exit condition

Every lane has a plan and has reached `currentPhase: plan` — control advances to step-03 (plan-readiness) for each lane.
