---
name: prism-handoff
description: >
  Compact the current session into a scoped handoff document a fresh agent can
  continue from — same persona or a different one. Flushes plan-worthy state
  into the branch plan first, then writes only the session residue to a unique
  path under the OS temp dir and reports that path back. Explicit
  /prism-handoff invocation; no persona — runs in the current persona's voice.
  Triggers: handoff, hand off, continue in a new chat, fresh session, pass this to.
argument-hint: "[scope and/or target — e.g. 'story 4' or 'clove: implement story 4.1']"
---

<!-- AUTO-GENERATED FILE. DO NOT EDIT DIRECTLY. -->
<!-- Source: .ai-skills/skills/prism-handoff -->
<!-- Target: cursor | Regenerate with: pnpm prism:build -->

Compact the current session into a handoff document a fresh agent can continue
from. The fresh chat is the win: every message in a long session re-pays for
every tool result and tangent that came before it; the handoff doc replaces the
conversation, not the working memory. The branch plan stays the working memory.

## Step 1 — Flush before writing

Before writing the handoff doc, promote any plan-worthy state into the branch
plan: unrecorded decisions to `## Decisions`, meaningful changes to `## History`,
unresolved bugs to their structured sections. The handoff doc carries only what
the plan structurally can't — in-flight reasoning, the user's framing, open
threads, this session's dead ends. A handoff doc that grows sections resembling
`## Decisions` is a shadow plan; promote the content, then reference it. The
better the session maintained its plan, the thinner this doc — that's the
system working, not a failure to summarize.

## Step 2 — Parse the arguments

- **Scope filter** — keep only threads pertaining to the named scope; everything
  else goes in the dropped-threads manifest.
- **Target prefix** (`clove:`, `sasha:`, any persona name followed by a colon) —
  produce the cross-persona shape below instead of the same-persona resume.
- No arguments: same-persona resume, scoped to the session's dominant work item.

## Step 3 — Write the document

Write to `<os-temp>/prism-handoffs/<branch-slug>/<UTC-timestamp>-<shortid>.md`,
creating directories as needed. Join path segments explicitly — do not assume
`$TMPDIR` ends with a separator (it varies by environment; `"${TMPDIR%/}/..."`
guarantees exactly one slash either way). Never a fixed shared path — unique
paths prevent collisions between concurrent sessions and stale reads of dead
handoffs.

Both shapes share these sections; the shape changes the emphasis:

- **`## Continue from`** — one paragraph: what this session was doing and where
  it stopped. Same-persona resume: where the reasoning was mid-flight.
  Cross-persona route: a next-action brief — what to do, not how we got here.
- **`## Artifacts`** — plan, ADRs, issues, PRs, key files. Paths and URLs only;
  never duplicate content the artifact already holds.
- **`## Open threads`** — questions raised and unresolved, one line each.
- **`## Live state`** — anything the next session inherits physically:
  uncommitted files, open worktrees, background processes, an un-pushed branch.
- **`## Dropped`** — one line per thread the scope filter excluded. Dropping is
  a visible decision, not silent decay.
- **`## Suggested skills`** — by capability, citing AGENTS.md routing; don't
  re-enumerate the roster.
- **`## Focus`** — the passed args, restated as the next session's brief.

Write the doc in neutral structured prose — the next reader may be a different
persona or model, and persona flavor is noise to it. The spoken summary back to
the user may stay in the current persona's voice. Redact secrets and PII.

## Step 4 — Report the path

The absolute path is the final output — the path is the handoff token. Include
the one-line start for the next session, e.g.:

> New chat → `/prism-architect` → "continue from <path>"

## Read-side contract

A fresh agent reads a handoff only when handed its path. Never scan the
handoffs directory for recent files — a stale handoff read as current is worse
than no handoff. The receiving persona still runs its own startup (plan lookup,
architect context); the handoff doc supplements the plan, never replaces it.

## Timing

Hand off while the summarizer is still sharp. A session at the edge of its
context window writes a degraded summary exactly when a good one matters most —
around 20+ messages or the first signs of drift is the right moment, not 95%.
