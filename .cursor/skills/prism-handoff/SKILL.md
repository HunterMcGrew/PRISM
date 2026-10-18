---
name: prism-handoff
description: >
  Compacts the current session into a scoped handoff document a fresh agent can
  continue from, in the same skill or a different one. Flushes plan-worthy state
  into the branch plan first, then writes only the session residue to a unique
  path under the OS temp dir and reports that path back. Explicit
  /prism-handoff invocation. Triggers: handoff, hand off, continue in a new
  chat, fresh session, pass this to.
argument-hint: "[scope and/or target, e.g. 'story 4' or 'prism-implement: story 4.1']"
---

<!-- AUTO-GENERATED FILE. DO NOT EDIT DIRECTLY. -->
<!-- Source: .ai-skills/skills/prism-handoff -->
<!-- Target: cursor | Regenerate with: pnpm prism:build -->

Compacts the current session into a handoff document a fresh agent can continue from. A fresh chat is the point: every message in a long session re-pays for every tool result and tangent before it, and the handoff document replaces that conversation. The branch plan stays the working memory. Task: $ARGUMENTS

## When to run

Run it when the user asks to hand off or continue in a new chat. Any skill may offer it at session close when the session is long or its own answers show drift (wrong paths, stale assumptions, re-asking what the user already said). The offer is a judgment call and never an auto-invocation, because a counted proxy such as files read or skills invoked is a number the model cannot measure mid-session. Do not wait for the context limit, since a session at its edge writes a degraded summary exactly when a good one matters.

## Flush to the plan first

Before writing, promote anything plan-worthy into the branch plan. A handoff document that holds decisions is a shadow plan the next session will trust over the real one.

- A decision with its reason goes under `## Decisions`.
- Changes since the last `## History` line go in one line each, with the branch name.
- An open bug with a root cause goes under `## Debugged Issues`, and an unrecorded review finding under `## Review Issues`.

The document then carries only what the plan cannot: in-flight reasoning, the user's framing, open threads, and this session's dead ends. The better the plan was kept, the thinner this document is. With no plan found, skip the flush and note "No branch plan found; flush skipped." under `## Artifacts`. This skill reads and updates the plan and never touches source files.

## Arguments

- **A scope filter** (a topic or story, such as "story 4") keeps only the threads about it. Everything else goes under `## Dropped`.
- **A target prefix** (a skill ID or persona name and a colon, such as `prism-implement:`) produces a next-action brief for that skill instead of a same-session resume. If the target is not in the routing rule, resume in the same session and note that under `## Focus`.
- **No arguments** resumes the session's dominant work item.

For every load-bearing gap, pick a defensible default and state it under `## Focus`. If a gap blocks the document, put the blocker and the default you took in the closing message.

## Write the document

Write to `<os-temp>/prism-handoffs/<branch-slug>/<UTC-timestamp>-<shortid>.md`, creating directories as needed. Join the segments explicitly, with `"${TMPDIR%/}/..."` so one slash separates them whether or not `$TMPDIR` ends in one. Use a unique path every time, because a fixed shared path collides between concurrent sessions and gets stale reads of dead handoffs. If the temp directory cannot be written, use `.prism/handoffs/<branch-slug>/<UTC-timestamp>-<shortid>.md` in the repo and say so in the report.

Sections:

- **`## Continue from`.** One paragraph on what the session was doing and where it stopped. For a target skill, write what to do next and skip how the session got here.
- **`## Artifacts`.** Plan, ADRs, issues, PRs, and key files, as paths and URLs only. Never copy what an artifact already holds.
- **`## Open threads`.** One line per unresolved question.
- **`## Live state`.** What the next session inherits physically: uncommitted files, open worktrees, background processes, an unpushed branch.
- **`## Dropped`.** One line per thread the scope filter excluded, so dropping is a visible decision.
- **`## Suggested skills`.** By capability, citing the routing rule. Do not list the roster again.
- **`## Focus`.** The arguments restated as the next session's brief, plus every default and assumption from above.

Write neutral structured prose with no greetings, voice, or puns, since the next reader may be a different model. Redact secrets and PII. Before reporting, check each `## Live state` and `## Open threads` item against this session's tool output, and mark any claim you are asserting from memory "(unverified)" so the next session re-checks it before acting.

## Report

Give the user the absolute path, the one-line start for the next session (for example: New chat, then `/prism-plan`, then "continue from `<path>`"), and one line per default they should confirm before opening the new chat.

## Reading a handoff

Open the file at the path you were given and never scan the handoffs directory for recent files, because a stale handoff read as current is worse than none. Then run normal startup: plan lookup and the routed architect docs. The handoff supplements the plan. When its `## Live state` conflicts with the plan's `## History`, the plan wins.
