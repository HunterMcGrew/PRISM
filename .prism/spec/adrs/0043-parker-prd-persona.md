# ADR-0043: Parker as the PRD persona

**Status:** Accepted
**Date:** 2026-05-22

## Context

PRISM has personas across the ticket-flow lifecycle: Nora starts tickets, Mira writes user stories, Winston plans implementation, Clove builds, Briar/Eric review, Sage logs releases. The lifecycle has one structural gap: nothing sits **above** Mira on grain.

Mira decomposes a known scope into user stories. But who decides the scope? Who writes the document that an engineering team reads to understand the initiative's why, who it's for, and what's in/out — the Product Requirements Document?

Without a PRD persona, three failure modes recur:

1. **PRDs get drafted by Mira at the wrong grain.** A user-story persona writing initiative-grain artifacts produces feature-list PRDs (no problem framing, no scope discipline).
2. **PRDs get drafted by Winston in plan mode.** Architectural evaluation framing produces implementation-shaped PRDs (heavy on technical detail, light on user / market context).
3. **PRDs don't get written at all.** Teams skip the artifact and pick up tickets from a shared verbal understanding — which doesn't survive contact with stakeholders, new hires, or a quarterly review.

PRISM needs a persona for initiative-grain product thinking.

## Decision

Parker is a **dedicated persona** for Product Requirements Documents, sitting above Mira on grain. Parker produces `.prism/prds/<slug>.md` (plus an optional `.prism/prds/<slug>.decision-log.md`); Mira decomposes finalized PRDs into stories.

Parker runs as a multi-phase, resumable workflow with **two modes**:

- **Greenfield** — interview-driven. Brain dump → stakes calibration → fast/coaching path → draft → reviewer rubric → finalize → optional Linear handoff.
- **Brownfield** — code-walking, no interview. Walks named code area → sketch confirmation → test scope → draft (with `[INFERRED]` markers, not `[ASSUMPTION]`) → review → finalize.

The phases live in `.prism/skills/prism-parker/step-*.md` per the micro-file step machine pattern from Phase 1.5e.

## Rationale

Different posture, different output, different cognitive surface from every existing persona:

- **Vs Mira.** Mira decomposes a known scope into stories. Parker establishes the scope. Same flow direction (product → engineering), different grain.
- **Vs Winston.** Winston evaluates technical approaches against an in-flight ticket. Parker writes the initiative document that ticket flows from. Parker is upstream of Winston.
- **Vs Theo/Ren.** Theo and Ren walk codebases; Parker writes product documents. Brownfield mode is the closest overlap, but Parker's brownfield reconstructs intent from code (a product-shaped output) while Theo/Ren produce architecture-shaped outputs.

The two modes are load-bearing. Greenfield is the dominant case (most PRDs cover new initiatives). Brownfield catches a real gap: teams accumulate features that never got a PRD and that historical absence makes onboarding, scope debates, and rewrites harder. One persona with two modes, not two personas, because the output shape (PRD frontmatter + 10 sections) is identical.

The stakes-calibration mechanism from Phase 1.5e (`hobby` / `internal` / `launch`) keeps Parker's rigor proportional. Launch-stakes PRDs get full rubric + escalation; hobby-stakes PRDs skip the rubric entirely.

## Alternatives considered

**Mira mode.** Rejected — Mira's user-story posture is fundamentally different from initiative-level product thinking. Folding both into one persona would force Mira to context-switch between grain levels mid-flow, diluting both jobs.

**Winston mode.** Rejected — Winston is reactive (evaluates proposed approaches). Parker is proactive product thinking. Same domain (product → engineering), different posture.

**Standalone script.** Rejected — PRDs benefit from conversational drafting. Greenfield's coaching path stress-tests thin PM thinking section by section; a script can't ask "what's the cost of getting this wrong?" with the calibration interview's nuance.

**Two personas (Parker + Brownfield-Parker).** Rejected — output shape is identical (10-section PRD); only the input differs (interview vs code walk). One persona with two modes is the smaller maintenance surface.

## Consequences

- Parker's state lives in the PRD's YAML frontmatter (`stepsCompleted`, `status`, `stakes`, `mode`, `linearInitiativeId`), not a separate state file. No `.prism/parker-state.json` — the artifact IS the state.
- `[ASSUMPTION]` (greenfield) vs `[INFERRED]` (brownfield) is a load-bearing distinction. Greenfield defers unknowns; brownfield infers from code. Open questions enumerate both.
- The reviewer rubric in step-06 dispatches three parallel subagents on Claude (Task tool) and runs sequentially on Codex/Cursor. Auto-skip for hobby stakes; escalation prompt for launch.
- Linear handoff (step-08) is opt-in and stakes-calibrated. Hobby skips offer; internal offers; launch recommends.
- Phase 3 is the second persona pair (after Phase 2.5 Theo + Phase 2.6 Ren) that uses the micro-file step machine pattern — three implementations now exist, providing a stable reference for future personas.

## References

- [ADR-0040](./0040-atlas-as-onboarding-persona.md) — Atlas establishes the persona-vs-mode pattern Parker follows.
- [ADR-0041](./0041-theo-architect-doc-walker.md) — Theo's micro-file step machine reference implementation.
- [ADR-0042](./0042-ren-refactor-scout.md) — Ren's parallel implementation Parker mirrors.
- Phase 1.5e — stakes-calibration reference doc, `[ASSUMPTION]` discipline.
- [`.prism/references/stakes-calibration.md`](../../references/stakes-calibration.md) — three-level table.
- [`.prism/references/micro-file-step-machine.md`](../../references/micro-file-step-machine.md) — step-machine pattern.
