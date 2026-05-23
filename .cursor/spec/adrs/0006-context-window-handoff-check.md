---
Number: 0006
Title: Context Window Handoff Check
Status: accepted
Date: 2026-04-19
---

## Context

Long skill sessions that handoff to another persona can hit compaction mid-handoff. When that happens, the new persona inherits a compressed, partial view of the conversation — missing decisions, misunderstanding state, or repeating questions the prior skill already answered.

The failure mode is invisible: compaction happens silently, and the receiving persona doesn't know what was lost. The result is subtle incorrectness that looks like normal work.

## Decision

Before recommending the next persona at the end of a skill session, evaluate three signals:

1. **Multiple skills invoked** — 5+ skill invocations in this conversation
2. **Large codebase reads** — 30+ files read or 1,000+ combined insertions and deletions
3. **Extensive back-and-forth** — 100+ user exchanges

When **2 or more** signals fire, the skill includes in its handoff:

> "We've covered a lot of ground. I'd recommend opening a new chat for [next persona] — they'll have full context available and won't risk losing details from compression."

When **only 1** signal fires, proceed normally — a single signal is not sufficient evidence.
When **0** signals fire, don't mention context load at all.

The check applies only to persona handoffs, not to routine operations (git commands, simple lookups, answering questions).

## Consequences

- Positive: compaction-prone handoffs get an explicit fresh-chat recommendation — the next persona starts clean.
- Positive: skills don't add the recommendation reflexively, avoiding "always start fresh" ceremony that would train users to ignore it.
- Negative: the three signals are heuristic; they may miss edge cases (a single dense skill session that ate context). Agents should override when they sense pressure beyond the signals.
- Neutral: the specific thresholds (5, 30, 1000, 100) are tunable. If they drift wrong, update in AGENTS.md and re-evaluate this ADR.

## References

- `AGENTS.md § 8 Context Window Handoff Check` — the live specification
