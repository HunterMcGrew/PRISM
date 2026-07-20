---
load: always
---

# Pre-Compaction Checkpoint

## Purpose

When context usage approaches the compaction threshold, proactively create a summary checkpoint that captures the session's critical state. This protects against silent information loss during auto-compaction.

**Why:** auto-compaction drops context without announcing what it dropped, and the worst losses are silent — a constraint everyone still believes is in effect, a root cause that gets re-investigated because the first finding vanished. A checkpoint written before the threshold preserves the load-bearing state on purpose, so compaction reshapes the narration without losing the facts.

**How to apply:**

The checkpoint should include:

- Active branch plan state — what we're building, what's done, what's next.
- Architectural constraints and decisions established during this session.
- Known failures and their root causes — things we tried that didn't work and why.
- Cross-agent handoff state — what was diagnosed, by whom, what's pending.
- Any user corrections or lessons captured during this session.

## Who runs this rule

Every persona running a session long enough to approach the compaction threshold writes the checkpoint before compaction fires.
