Compact the current session into a handoff document a fresh agent can continue
from. The fresh chat is the win: every message in a long session re-pays for
every tool result and tangent that came before it; the handoff doc replaces the
conversation, not the working memory. The branch plan stays the working memory.

**The run, in order:** opening orientation → flush plan-worthy state into the
branch plan → parse arguments (scope filter / target persona) → write the
handoff document → closing re-orientation → report the path.

## Invocation trigger

Invoke when any of these conditions are true:

- The user explicitly asks to hand off or continue in a new chat.
- The session has 20+ messages and continuity across a new chat is expected.
- You notice drift in your own responses — wrong file paths, stale assumptions,
  re-asking context the user already provided.

Do not wait for 95% context — a session at the edge writes a degraded summary
exactly when a good one matters most.

## Step 0 — Opening orientation

Run the Opening Orientation Battery per [session-orientation.md](../../../.prism/rules/session-orientation.md)
once, before any other step. Answer all four questions internally, then
proceed — this is not visible output.

Handoff-specific framing for two of the four questions:

- **Intent** — e.g. "resume this Clove session as Briar for self-review," not
  "write a handoff."
- **Bounds** — a complete handoff covers the branch plan (read and may be
  written); source files are never touched by this skill.

The rule's mid-dispatch calibration applies as written: no user is available,
so pick a defensible default for each load-bearing gap, state the assumption in
the handoff `## Focus` section, and proceed — escalate only via the active
persona's floor verdicts (`needs-replan` / `blocked` / `needs-human`), never by
a question into the void.

## Step 1 — Flush before writing

**Trigger:** runs before Step 3, on every invocation.

Promote any plan-worthy state into the branch plan:

- Unrecorded architectural decisions → `## Decisions` (one bullet per decision
  with a reason — see branch-plan.md § Decisions)
- Meaningful changes since the last History entry → `## History` (one line per
  unit of work, branch name included)
- Open bugs with a root cause → their structured `## Debugged Issues` entry
- Review findings not yet recorded → `## Review Issues`

The handoff doc carries only what the plan structurally cannot: in-flight
reasoning, the user's framing, open threads, this session's dead ends. A handoff
doc that grows sections resembling `## Decisions` is a shadow plan; promote the
content, then reference it. The better the session maintained its plan, the
thinner this doc — that's the system working.

**Escape (no plan found):** if plan lookup (branch name → `.prism/plans/<id>.md`
→ `## Ticket` scan) finds no plan, skip this step. Note in the handoff
`## Artifacts` section: "No branch plan found; flush skipped." Proceed to Step 2.

## Step 2 — Parse the arguments

**Trigger:** runs after Step 1, using `$ARGUMENTS` or the user's last message.

Resolve the handoff shape:

- **Scope filter** (a topic or story reference, e.g. "story 4") — keep only
  threads pertaining to the named scope; place everything else in `## Dropped`.
- **Target prefix** (`clove:`, `briar:`, any persona name followed by a colon)
  — produce the cross-persona shape instead of the same-persona resume.
- **No arguments** — same-persona resume, scoped to the session's dominant work
  item.

**Escape (unrecognized target prefix):** if the named target persona does not
appear in AGENTS.md skill routing, default to same-persona resume and note in
`## Focus`: "Target persona `<name>` not recognized; defaulting to same-persona
resume."

## Step 3 — Write the document

**Trigger:** runs after Steps 1–2; produces the handoff file.

**Path construction:**

Write to `<os-temp>/prism-handoffs/<branch-slug>/<UTC-timestamp>-<shortid>.md`,
creating directories as needed. Join path segments explicitly — do not assume
`$TMPDIR` ends with a separator (`"${TMPDIR%/}/..."` guarantees exactly one
slash either way). Never a fixed shared path — unique paths prevent collisions
between concurrent sessions and stale reads of dead handoffs.

**Escape (OS temp unavailable):** if the temp directory cannot be written, write
to `<repo-root>/.prism/handoffs/<branch-slug>/<UTC-timestamp>-<shortid>.md` and
note the fallback path in Step 4's output.

**Document shapes:** both shapes share these sections; the shape changes emphasis.

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
- **`## Suggested skills`** — by capability, citing AGENTS.md routing; do not
  re-enumerate the roster.
- **`## Focus`** — the passed args restated as the next session's brief; any
  defaults or assumptions recorded in Steps 0–2 stated here explicitly.

**Prose discipline:** omit persona flavor — greetings, character voice, puns,
persona-specific phrasing. The next reader may be a different model or persona,
and voice is noise to it. Write neutral structured prose: declarative sentences,
section headers, bullet lists for parallel items. Redact secrets and PII before
writing. The spoken summary back to the user (Step 4) may stay in the active
persona's voice.

## Step 3b — Closing re-orientation

Run the Closing Re-Orientation Battery per [session-orientation.md](../../../.prism/rules/session-orientation.md)
once, after drafting the document but before reporting the path. Check each
question; update the draft if any answer reveals a gap.

Handoff-specific framing:

- **Scope boundary** — what did the handoff doc include; is any of it outside
  what was named in the arguments? What did you notice in adjacent open threads
  and exclude? If adjacent work should be tracked but was left out, emit a
  `found-followup-work` signal per followup-scope.md § worker-emit pre-filter
  (this utility runs in the active persona's voice, so the signal is attributed
  to that persona's lane).
- **Unasked assumptions** — name each silent decision in `## Focus` so the next
  session sees them explicitly.
- **Edge recall** — did the session involve empty states, absent files, missing
  plans, or malformed arguments? Did the handoff document capture each of those
  states explicitly, or did it silently resolve them?
- **Verification honesty** — for each item in `## Live state` and `## Open
  threads`, is the claim current (verifiable from this session's tool outputs)
  or asserted from memory? Mark asserted-from-memory items with "(unverified)"
  so the next session knows to re-check before acting on them.

## Step 4 — Report the path

**Trigger:** after the draft passes the Step 3b check.

Report:

1. The absolute path to the handoff file.
2. The one-line start for the next session, e.g.:
   > New chat → `/prism-architect` → "continue from <path>"
3. Any defaults picked in Steps 0–2 that the user should confirm or redirect
   before opening the new chat — one line per default.

## Read-side contract

**Trigger:** when a fresh session receives a handoff path.

Open the file at the given path. Never scan the handoffs directory for recent
files — a stale handoff read as current is worse than no handoff.

Then run normal startup: plan lookup, architect context load. The handoff doc
supplements the plan, never replaces it. If the handoff's `## Live state`
conflicts with what the plan's `## History` shows, the plan is authoritative;
the handoff is the session-residue layer above it.
