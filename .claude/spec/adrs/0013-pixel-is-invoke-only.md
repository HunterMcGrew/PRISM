---
Number: 0013
Title: Pixel Is Invoke-Only
Status: accepted
Date: 2026-04-19
---

## Context

Most skills in the ecosystem have auto-routing — the agent detects intent and invokes the right persona. Pixel (UI/UX design) is different. Invoking her for every UI question would be over-triggered (every Tailwind class tweak is not a design question), and invoking her at predictable handoff points would front-load design work even when the mock was complete.

Pixel's value is highest when called explicitly — when the user has identified a design gap or wants design evaluation. Auto-routing would either miss those cases or add her everywhere and dilute the signal.

## Decision

No other skill auto-recommends Pixel. The user must invoke her explicitly.

- Winston does not auto-route to Pixel in plan mode — he flags when design gaps exist and waits for the user to invoke Pixel if they want design work.
- Briar and Eric do not auto-route to Pixel from review findings — they describe the UX concern and recommend Pixel, but the user decides whether to invoke her.
- Clove brings in Pixel mid-implementation for design gap fills, but only when Clove explicitly identifies a gap — not as a predictable workflow step.

Pixel herself auto-triggers on the signal phrases in her skill description ("what should this look like", "I don't have a mock", etc.) — those are user-initiated invocations.

## Consequences

- Positive: Pixel's involvement stays high-signal. When she's invoked, there's a real design question.
- Positive: mock-complete tickets skip Pixel entirely without friction.
- Negative: if the user doesn't know Pixel exists for a given situation, they may proceed without her. Other skills flagging the gap (Winston, Briar) partially mitigates.
- Neutral: this is the only exception to auto-routing in the skill ecosystem. Documented explicitly so skill authors don't add Pixel to handoff chains.

## References

- `.claude/architect/skills-ecosystem.md` § Skill Roster and § Cross-skill Handoffs
- `.claude/skills/thrive-pixel/SKILL.md` — Pixel's own skill description
