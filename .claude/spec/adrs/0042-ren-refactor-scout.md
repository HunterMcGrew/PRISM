# ADR-0042: Ren as the refactor scout persona

**Status:** Accepted
**Date:** 2026-05-22

## Context

Phase 2 shipped Atlas as one-shot configurator; Phase 2.5 shipped Theo as the architect-doc walker. Both walk the codebase, but with different lenses — Theo names what's load-bearing; neither persona spots what's structurally weak.

Teams accumulate refactor candidates that no current persona surfaces: shallow modules that fail the deletion test, pass-through abstractions with one caller, premature generic shapes, leaky seams, untested public interfaces, dead code. Without a persona to hunt for them proactively, the friction stays implicit — engineers feel it without naming it.

PRISM needs a persona for that work.

## Decision

Ren is a **separate persona from Theo**, not a mode of Theo. He walks the codebase iteratively, applies a friction-signal lens, ranks refactor candidates by strength (strong / worth-exploring / speculative), grills the chosen candidate through five passes (design tree → assumptions → deletion-test rigor → alternatives → user confirm), and produces a refactor plan at `.prism/plans/refactor-<slug>.md` that Winston or Clove picks up.

**Ren never modifies consumer source code.** His output is plan-shaped — `Write` tool restricted to refactor plans and his state file (`.prism/ren-state.json`). The actual refactor execution is Clove's lane.

Ren's workflow is an 8-phase micro-file step machine (mirroring Theo's pattern from Phase 2.5):

1. **init** — read state, detect resume
2. **explore** — walk directory, surface 6 friction-signal classes
3. **categorize** — strength badge taxonomy (strong / worth-exploring / speculative)
4. **present** — render ranked candidates with before/after sketches
5. **pick** — user picks / skips / defers
6. **grill** — five-pass deep grill on chosen candidate
7. **plan** — generate `.prism/plans/refactor-<slug>.md`
8. **continue** — count remaining, prompt next-action

## Rationale

Different lens, different output shape, different cognitive posture from Theo:

- **Different lens.** Theo: "what's load-bearing here?" Ren: "what's structurally weak here?" Same codebase walk, opposite questions.
- **Different output shape.** Theo writes architect docs (documentation). Ren writes refactor plans (action items for Clove/Winston).
- **Different cognitive posture.** Theo names shape without grading; Ren grades structural weakness explicitly via the strength badge taxonomy.

The five-pass grill is what differentiates Ren from a naive "find weak code" tool — each pass forces the persona to challenge his own initial verdict before producing a plan. Plans Ren produces are pre-grilled; Winston picks up tasks shaped by five passes of skepticism.

## Alternatives considered

**Theo mode.** Rejected — Theo's cartographic posture and Ren's evaluative posture are fundamentally different cognitive shapes. Folding them into one persona dilutes both; the persona would have to ask the user "are we mapping or grading?" at every walk and that ambiguity defeats the value.

**Winston mode.** Rejected — Winston is reactive (evaluates proposed approaches). Ren is proactive (hunts for candidates). Same domain (architecture), different posture.

**Shared utility with Theo.** Rejected for v1 — Ren and Theo share the codebase-walking mechanic but the state files, output types, and core questions differ enough that shared abstraction would be premature. Revisit after both ship — if the walking core ends up duplicated meaningfully, factor it out then.

**Ren writes source code.** Rejected — keeping Ren read-only makes the plan-execution handoff explicit. Winston reviews the plan; Clove executes. The plan is the single artifact crossing the boundary; there's no ambiguity about where Ren stops and Clove starts.

## Consequences

- Ren's state file (`.prism/ren-state.json`) is independent of Theo's (`.prism/theo-state.json`).
- Refactor plans use the branch-plan template from `.prism/rules/branch-plan.md` so Winston's `## Implementation Tasks` writing flow picks them up unchanged.
- Phase 2.6 is the second reference implementation of the micro-file step machine pattern from Phase 1.5e — Atlas, Theo, Ren now form a triplet showing the pattern in three distinct workflows.
- Atlas's `<!-- atlas:specializes-in -->` anchor in Ren's `shared.md` is the integration point: Atlas fills the anchor during onboarding with team-specific friction signals (WordPress block patterns, React RSC/client boundaries, Django ORM N+1, etc.); Ren reads what Atlas wrote and adds team-stack-specific signals to his heuristic set.
- Read-only on consumer source — Ren never `Edit`s code. Enforced in `claude.md`'s tool-routing section.

## References

- [ADR-0038](./0038-paired-dev-doc-gates.md) — paired dev doc gates.
- [ADR-0040](./0040-atlas-as-onboarding-persona.md) — Atlas establishes the persona-vs-mode pattern Ren follows.
- [ADR-0041](./0041-theo-architect-doc-walker.md) — Theo's pattern that Ren mirrors with a different lens.
- Phase 1.5e pattern absorptions — micro-file step machine, deletion test as primary heuristic.
- [`.prism/skills/prism-ren/lib/state.md`](../../skills/prism-ren/lib/state.md) — Ren's state schema and protocol.
