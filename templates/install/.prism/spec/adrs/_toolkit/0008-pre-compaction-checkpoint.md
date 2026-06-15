---
Number: 0008
Title: Pre-Compaction Checkpoint
Status: accepted
Date: 2026-04-19
---

## Context

Auto-compaction silently drops conversation context when the window fills. The compression is lossy — specific decisions, architectural constraints, and cross-agent handoff state can vanish without the agent noticing. The next response is built on whatever survived, and the agent does not know what's missing.

Because compaction is silent, the agent cannot react to it after the fact. The only window to preserve critical state is _before_ it fires.

## Decision

When context usage approaches the compaction threshold, the agent proactively creates a summary checkpoint that captures the session's critical state. The checkpoint includes:

- Active branch plan state (what we're building, what's done, what's next)
- Architectural constraints and decisions established during this session
- Known failures and their root causes (what was tried, what didn't work, why)
- Cross-agent handoff state (what was diagnosed, by whom, what's pending)
- Any user corrections or lessons captured during this session

The agent flags the checkpoint visibly so the user knows compaction pressure is imminent and what was preserved.

## Consequences

- Positive: the irreversible loss from compaction is contained. Critical state persists through the event.
- Positive: the user sees the checkpoint and can re-establish anything the agent missed.
- Negative: checkpoint generation adds tokens to an already-pressured context. The tradeoff is tokens-spent-now vs. work-lost-later — work-lost-later is the larger cost.
- Neutral: the agent needs to sense compaction pressure. The indicator is usage-based; if the threshold is tuned wrong, checkpoints fire too early or too late.

## References

- `AGENTS.md § 12 Pre-Compaction Checkpoint` — live specification
- `CLAUDE.md § Context Preservation Rules` — Claude-specific reinforcement, emphasizes flagging what's being lost
