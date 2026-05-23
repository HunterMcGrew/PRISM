# ADR-0041: Theo as the architect-doc walker persona

**Status:** Accepted
**Date:** 2026-05-22

## Context

Phase 2 shipped Atlas as a one-shot configurator — Atlas runs once per team install or on a stack change, populates `.ai-skills/config.json`, generates per-team rules, and fills the stub anchors in canonical persona sources. That work is bounded: a single conversational pass per install.

Ongoing codebase mapping is a different workflow. Teams accumulate load-bearing decisions in code that don't have homes in `.prism/architect/` yet — multi-file coupling that no doc explains, constraints that live in tests instead of architecture docs, surprising patterns that contradict the names. Surfacing those decisions is iterative (one candidate at a time), resumable (long walks span sessions), and proactive (the persona hunts; the user doesn't have to know what to look for).

PRISM needs a persona for that work. The roadmap at `.prism/plans/roadmap.md` § Phase 2.5 names Theo as the architect-doc walker.

## Decision

Theo is a **separate persona from Atlas**, not a mode of Atlas. He walks the codebase iteratively, surfaces load-bearing decisions worth documenting, drafts architect docs (and paired dev docs per [ADR-0038](./0038-paired-dev-doc-gates.md)), and resumes across sessions via `.prism/theo-state.json`.

Theo's workflow is an 8-phase micro-file step machine (the pattern from Phase 1.5e):

1. **init** — read state, prompt target dir or resume
2. **scan** — walk the directory, apply the Deletion Test cartographically, surface candidates
3. **present** — render each pending candidate with discuss / write / skip / defer
4. **discuss** — branch on user choice, route candidate to its next phase
5. **draft** — compose architect doc and optional paired dev doc
6. **review** — present draft, accept / iterate / discard
7. **commit** — write to disk, update manifest, atomic state write
8. **continue** — count remaining, prompt continue / revisit-deferred / pause / finish

## Rationale

Different posture, different shape, different cognitive surface:

- **Different posture.** Atlas is one-shot configurator; Theo is proactive walker.
- **Different shape.** Atlas is single-turn onboarding; Theo is multi-phase 8-step machine that pauses and resumes.
- **Different cognitive posture.** Atlas asks what the team has (project name, ticket prefix, stack); Theo names what the team's code is telling him (load-bearing decisions, surprising patterns, hidden constraints).

The Deletion Test from Phase 1.5e is Theo's primary heuristic in cartographic mode — name what's load-bearing, don't grade it. Quality grading is Ren's lane (Phase 2.6).

## Alternatives considered

**Atlas mode.** Rejected — Atlas runs once per install; folding ongoing walking into Atlas would force every Atlas invocation to ask "are we onboarding or walking?" and that ambiguity dilutes both jobs. Better to keep Atlas's surface focused on the configuration question.

**Winston mode.** Rejected — Winston is reactive (evaluates proposed approaches); Theo is proactive (goes hunting for candidates). Same domain, different posture. Cleaner to keep them separate.

**Shared utility with Ren.** Rejected for v1 — Ren (Phase 2.6) and Theo share the codebase-walking mechanic but have different intents (Theo documents what's load-bearing; Ren spots what's structurally weak). The state files and output types differ enough that shared abstraction would be premature. Revisit after both ship — if the codebase-walking core ends up duplicated meaningfully, factor it out then, not before.

## Consequences

- Theo's state file (`.prism/theo-state.json`) is independent of Ren's (`.prism/ren-state.json`). Two parallel state files, one per persona.
- Ren (Phase 2.6) will follow the same step-machine pattern Theo establishes here.
- PRISM gains a reference implementation of the micro-file step machine pattern from Phase 1.5e — future persona authors can model their multi-phase workflows on Theo's shape.
- Atlas's `<!-- atlas:specializes-in -->` anchor in Theo's `shared.md` is the integration point: Atlas fills the anchor during onboarding with team-specific walking priorities; Theo reads whatever Atlas wrote.
- The 8 step files at `.prism/skills/prism-theo/step-NN-*.md` are individually replaceable — a future smarter scanner swaps step-02-scan without touching the other 7. The micro-file pattern bears the maintenance load.

## References

- [ADR-0037](./0037-cadence-driven-personas.md) — cadence-driven personas (Atlas, Zoe). Theo is not cadence-driven; he's on-demand.
- [ADR-0038](./0038-paired-dev-doc-gates.md) — paired dev doc gates that Theo applies before drafting.
- [ADR-0040](./0040-atlas-as-onboarding-persona.md) — Atlas establishes the persona-vs-mode pattern Theo follows.
- [Phase 1.5e pattern absorptions](../../../plans/roadmap.md) — micro-file step machine + Deletion Test absorbed from research.
- [`.prism/skills/prism-theo/lib/state.md`](../../skills/prism-theo/lib/state.md) — Theo's state schema and protocol.
