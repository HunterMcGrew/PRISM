---
Number: 0016
Title: Explain the Why
Status: accepted
Date: 2026-04-19
---

## Context

A rule that says "do X" without saying why gets treated as arbitrary. Agents (and humans) skip arbitrary rules in edge cases because they don't have the context to know when the rule is load-bearing and when it's stale.

A rule that explains its reasoning — "the team learned the hard way that Y caused Z" — gives the reader enough to evaluate edge cases correctly. When conditions change, the reader can tell whether the rule still applies.

This is broader than ADR-0015. ADR-0015 is about reframing mandate _framing_ (how instructions are worded). This ADR is about whether rules _cite their reason_ at all, regardless of framing.

## Decision

Rules, ADRs, and architect context explain the "why" alongside the "what."

- Rules in `.claude/rules/` lead with the rule, then pair a `**Why:**` line (the reason — often a past incident or observed cost) and a `**How to apply:**` line (when the rule kicks in).
- ADRs have a `## Context` section that explains the forces driving the decision. No decision is documented in isolation.
- Memory entries in agent auto-memory follow the same shape — rule, why, how to apply.
- Plan decisions document the reasoning, not just the outcome. "Picked A over B because [reason]" is load-bearing; "Picked A" is not.

When you find yourself writing a directive without the reason, pause. The reason is what makes the directive survive contact with an edge case.

## Consequences

- Positive: readers can judge when a rule applies. "The team learned Y caused Z" lets the reader check whether Z is still a risk in the current situation.
- Positive: reasoning-based rules are harder to silently drift past. The reason is what makes the rule feel load-bearing.
- Negative: rules take longer to write. "Do X" is one line; "Do X because Y, apply when Z" is three. The tradeoff is upfront-cost vs. downstream correct-application.
- Neutral: the exception is where the reason is already obvious from context (e.g. "use TypeScript" in a TypeScript project). Obvious reasons don't need to be stated; non-obvious reasons do.

## References

- `.claude/plans/4.7-skill-audit-strategy.md` § Guiding Principle 2
- ADR-0015 (Humane Language Over Mandates) — related but distinct: framing vs. presence of reasoning
- The auto-memory system format (feedback and project memories include `**Why:**` and `**How to apply:**` lines by design)
