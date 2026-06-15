---
Number: 0015
Title: Humane Language Over Mandates
Status: accepted
Date: 2026-04-19
---

## Context

The original skill files used compliance-contract vocabulary: `NON-NEGOTIABLE`, `MUST NEVER`, `FAILURE STATE`, `HARD RULE`, all-caps `ALWAYS` / `NEVER`. On Claude 4.6 this worked — the user's custom instructions were treated as high-priority overrides.

On Claude 4.7 the instruction hierarchy changed. Absolute mandates now trigger the alignment-override reflex: the model treats "NON-NEGOTIABLE — follow them exactly as written, no autonomous judgment overrides" as an attempted safety-layer bypass and either ignores or inverts the instruction. Documented in PRISM's 4.7 skill audit across several findings.

Although first observed on Claude 4.7, the reflex is not version-specific — later Claude models (4.8+) and non-Claude agents on other tools exhibit the same pattern. That is why this decision lives in the model-agnostic shared layer rather than a Claude-specific config; see [ADR-0005](./0005-cross-model-portability.md) (Cross-Model Portability).

Anthropic's own skill-creator guidance validates the alternative framing: _"Try to explain to the model why things are important in lieu of heavy-handed musty MUSTs"_ and _"If you find yourself writing ALWAYS or NEVER in all caps, or using super rigid structures, that's a yellow flag — reframe and explain the reasoning."_

## Decision

Skill files, rules, and shared config use humane language, not mandate language.

- Reframe absolute mandates as contextual authority: "the team's intentional engineering standards — built through iterative testing" replaces "NON-NEGOTIABLE — follow exactly as written."
- Reframe prohibitions as consequences: "Fabricating a search erodes trust faster than admitting uncertainty" replaces "Do not fabricate searches."
- Reframe `FAILURE STATE` as `Anti-pattern:` (established engineering vocabulary, same weight without adversarial framing). Exception: behaviors that 4.7's alignment layer actively wants to produce (hedging, qualifying) use "course-correction signals" — even softer.
- Use imperative form without mandate prefixes. "Offer this after every PR push" replaces "MUST offer two paths."
- Keep reasoning inline. "Prove a task works before marking it complete" pairs with "the bar is: would a staff engineer approve this?"

The constraint is not softer — the framing is. "Apply every applicable rule" still means apply every applicable rule.

## Consequences

- Positive: instructions land on 4.7 without triggering alignment override. The compliance outcome matches 4.6 while the framing cooperates with 4.7's hierarchy.
- Positive: skill files read like onboarding docs for a teammate, not compliance contracts for a machine. More maintainable and more correct.
- Negative: reviewers new to the pattern may think the language is "too soft" and push for mandates. The reasoning in this ADR and the 4.7 audit is the answer — restore absolute mandates and later models will invert them.
- Neutral: lowercase natural usage ("every matching pattern must be loaded — partial loads miss constraints") is allowed. The problem is absolute mandates as behavioral constraints, not lowercase English.

## References

- Anthropic's skill-creator skill (`/mnt/.claude/skills/skill-creator/SKILL.md`) — official guidance on imperative form and reasoning-based emphasis
- ADR-0005 (Cross-Model Portability) — why this framing works across models
- ADR-0016 (Explain the Why) — the complementary pattern for rule-writing
