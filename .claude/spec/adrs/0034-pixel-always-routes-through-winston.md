---
Number: 0034
Title: Pixel Always Routes Through Winston
Status: accepted
Date: 2026-05-03
---

## Context

Pixel's existing skill defines two handoff paths after a mode 2 saved mock spec:

- **Path A — Pixel → Winston → Clove.** When Pixel sees architectural implications (new shared component, new state pattern, changes to data flow, new design system pattern), she routes through Winston for an architecture pass before implementation.
- **Path B — Pixel → Clove (direct).** When Pixel determines the design is "ready to build" (reuses existing patterns, no architectural questions, all states covered), she hands directly to Clove. The mock spec serves as the implementation guide; there is no `## Implementation Tasks` section.

The direct-to-Clove path asks Pixel to make architecture calls outside her lane. Pixel is a designer — her depth is in cognitive science, interaction patterns, visual hierarchy, and accessibility. She'll wave through new shared component candidates that should be hoisted to a slot pattern. She'll miss server/client boundary issues because she's thinking in pixels, not in `'use client'` directives. She'll specify a state pattern that creates coupling between systems she doesn't have visibility into.

Some of the time Pixel gets the call right. Some of the time she gets it wrong. The cost of one wrong direct-route is rework of design-quality work — and with [ADR-0033](./0033-implementation-task-detail.md)'s detail bar in place, that rework is more expensive than before. The work product is heavier; the cost of wrong direction climbs with it.

The other gap Path B exposes: when Pixel routes direct to Clove, **there is no `## Implementation Tasks` section in the plan.** Clove implements directly against the mock spec. That's effectively self-planning at execute-time, which violates the always-have-tasks invariant that ADR-0033 depends on. Sonnet or low-effort runs are most likely to pick the wrong build order, skip a state because the spec didn't explicitly start there, or restitch from the wrong existing component.

Three approaches were considered:

- **(a) Keep Path B with a stricter Pixel self-route checklist.** Pixel runs more architectural checks before deciding direct-to-Clove is safe. Rejected: still asks Pixel to make calls outside her lane; the checklist would either be too narrow (missing the misses) or too wide (effectively becoming a full Winston evaluation, at which point Winston should run anyway).
- **(b) Make Path B explicit-opt-in.** Default to Path A; let the user override. Rejected: same risk profile, with extra friction.
- **(c) Drop Pixel altogether and have Winston do design.** Loses Pixel's design depth. Winston is an architect, not a designer.

## Decision

Pixel always routes mode 2 saved specs through Winston. Direct-to-Clove path is removed.

Winston runs in **plan-mode-only** when Pixel flagged "no architectural concerns" in her handoff. This is a quick verification pass — one read of Pixel's spec, checking for architectural concerns Pixel might have waved through (new shared component candidates, server/client boundary issues, data-flow couplings) — followed by `## Implementation Tasks` written to the [ADR-0033](./0033-implementation-task-detail.md) detail bar. No full evaluate ceremony. Winston signals plan-mode-only with the plan status `Status: Ready for Winston`. If Winston spots architecture Pixel missed, he switches to evaluate mode and amends the design with Pixel or notes the concern in `## Decisions`.

**Mode 1 inline sketches keep direct-back-to-Clove.** Mid-ticket gap-fills (Clove → Pixel → Clove) are conversational by design — quick answers in chat, no formal handoff. The detail bar exempts them ([ADR-0033](./0033-implementation-task-detail.md)), and the routing change exempts them too. If a mid-ticket gap grows into a mode 2 spec, the spec routes through Winston.

The change lands in three surfaces:

- **`.ai-skills/skills/prism-design/shared.md`** — handoff section drops Path B; team-flow section reflects single canonical path; mock-spec template adds the architectural inputs Winston needs.
- **`.ai-skills/skills/prism-architect/shared.md`** — adds the post-Pixel plan-mode-only path.
- **`.prism/architect/skills-ecosystem.md`** + **`AGENTS.md`** — Cross-skill Handoffs and Ownership tables updated.

## Consequences

- **Positive:** The architectural safety net widens. Winston catches misses Pixel can't see because they're outside her lane. Cross-LLM portability holds — every implementation has explicit `## Implementation Tasks` written to the detail bar.
- **Positive:** Pixel's lane is clearer. She designs; Winston plans the architecture and procedure; Clove implements. No more "is this a Pixel call or a Winston call?" judgment Pixel has to make.
- **Negative:** One extra session per UI ticket. For trivial UI changes that genuinely have no architecture concern, the always-Winston pass is overhead.
- **Negative:** Risk of rubber-stamping. If every post-Pixel Winston pass reads "no architectural concerns, tasks below" without real evaluation, the safety net atrophies. Briar and Eric should push back on rubber-stamping when they see it.
- **Neutral:** Mode 1 carve-out preserves the existing Clove → Pixel → Clove gap-fill pattern. The change is scoped to mode 2.
- **Neutral:** Mode 3 HTML mockups are unaffected — they're optional visual companions to mode 2 specs, not standalone artifacts.

## References

- [ADR-0033](./0033-implementation-task-detail.md) — sibling decision: implementation-driving artifacts must meet a detail bar. The always-Winston rule is what makes ADR-0033 enforceable for design-driven work.
- [ADR-0013](./0013-pixel-is-invoke-only.md) — related: Pixel is invoke-only on the discovery side. ADR-0034 governs the routing destination, ADR-0013 governs the routing source.
- [ADR-0018](./0018-persona-lane-ownership.md) — related: persona headings in `## Implementation Tasks` define ownership. Always-Winston ensures the tasks section exists for every mode 2 implementation.
- `.ai-skills/skills/prism-design/shared.md` — the surface where the change lands on the design side.
- `.ai-skills/skills/prism-architect/shared.md` — the surface where the post-Pixel plan-mode-only path is added.
