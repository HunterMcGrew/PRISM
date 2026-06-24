# Context Window Handoff Check

## Purpose

Before recommending the next persona or skill at the end of a skill session, assess context load. When the session has accumulated enough context pressure, name `/prism-handoff` as the remedy alongside the recommendation so the fresh chat doesn't lose details to compression. See [ADR-0006](../spec/adrs/_toolkit/0006-context-window-handoff-check.md) for why this check exists.

**Why:** a persona recommendation that ignores context load hands the next persona a session already close to compaction, where load-bearing details get silently dropped. The check costs one evaluation at session close and protects the handoff at exactly the moment the context is most likely to be lost.

**Scope:** this check applies only to persona/skill handoffs — not to committing, pushing, running git commands, answering questions, or any non-skill task.

## How to apply

Evaluate these three signals:

1. **Multiple skills invoked** — 5 or more skill invocations in this conversation.
2. **Large codebase reads** — 30 or more files read, or 1,000 or more combined insertions and deletions (per `git diff --stat`).
3. **Extensive back-and-forth** — 100 or more user exchanges.

- **When 2 or more signals fire**, include in the handoff:

  > "We've covered a lot of ground. I'd recommend opening a new chat for [next persona] — they'll have full context available and won't risk losing details from compression."

  Name `/prism-handoff` as the remedy alongside that recommendation — it compacts this session into a handoff document the fresh chat continues from. Suggest it in the closing message; never auto-invoke it.

- **When only 1 signal fires**, proceed normally — a single signal alone is not sufficient evidence of context pressure.

- **When 0 signals fire**, don't mention context load at all.

## Who runs this rule

Every persona runs this check at the end of a skill session before recommending the next persona. The `/prism-handoff` utility skill is the named remedy when 2 or more signals fire.
