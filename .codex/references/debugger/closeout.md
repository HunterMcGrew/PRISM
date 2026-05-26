# Sasha — Phase 6 Closeout & Linear Sync

Reference for `prism-debugger`. Read this when running Phase 6 — recording findings in the plan and syncing to Linear. The skill body pins the evidence-grading lens (Confirmed / Deduced / Hypothesized) and the phase spine; this file carries the deterministic closeout procedure.

> _Phase 6 deliverables — record findings, Linear sync, Lessons Check._

Three deliverables in order.

**1. Remove instrumentation.** Run the `grep -rn '\[DEBUG-' <touched-files>` cleanup gate from the [instrumentation-hygiene reference](./instrumentation-hygiene.md). No tagged debug logs survive into the PR.

**2. Record findings in the plan.** Append to `## Debugged Issues` (create if needed) using the extended format defined in [`.prism/rules/branch-plan.md`](../../rules/branch-plan.md) § Debugged Issues. The format the rule defines:

- `Confidence: High | Medium | Low` — `High` (Confirmed root cause + deterministic repro), `Medium` (Deduced), `Low` (Hypothesized, named data gap)
- `Root cause: [Confirmed] | [Deduced] | [Hypothesized] — one sentence` — inline evidence-grade tag on every claim
- `Refuted hypotheses:` (optional) — hypotheses ranked in Phase 3 and falsified in Phase 4 belong here, not in the trash. Refuted hypotheses are data — they document what was eliminated and why.
- `Missing evidence:` (optional) — a Gap / Impact / How to Obtain mini-table for any unconfirmed claim the diagnosis still depends on. Missing evidence is a finding, not an admission that the investigation is incomplete.
- `Suggested tests:` — what to cover, "none needed", or `"no correct seam — architecture prevents lockdown"` if the Phase 1/5 seam check failed.

Status defaults to `open`. The `Linear` field reflects whether the Linear sync sub-step ran.

The only file Sasha writes to is the plan. Source files stay untouched — Clove handles implementation.

**3. Lessons Check.** Did the root cause reveal a class of bug not previously documented? A codebase constraint or pattern that made the bug harder to find than it should have been? An assumption made during isolation that turned out to be wrong? If yes, append to `.prism/lessons.md` without being asked.

## Phase 6 sub-step: Linear sync

**Root Cause and Suspected Fix update.** Check whether the Linear ticket's `## Root Cause` and `## Suspected Fix` sections match Sasha's findings:

- Fetch current ticket description via `get_issue`.
- If Sasha's root cause or fix differs from what's in the ticket (e.g. Nora's initial `suspected` entry): replace those sections in the description via `save_issue`, updating the confidence to `verified`.
- If they match: no update needed.
- Append to plan `## History`: `YYYY-MM-DD [<branch>]: Updated Root Cause / Suspected Fix on Linear ticket PRISM-NNNN`.
- Append a row to `## Acceptance Criteria > AC Sync Log`: `| YYYY-MM-DD | Sasha | Updated Root Cause + Fix | — | synced |`.

**Optional Linear comment.** If the user said **yes** to the Linear gate (startup step 2b):

- Format the bug report using `.prism/templates/bug-report.md`, pre-filling fields from the debugged issue entry.
- Post it as a Linear comment via `save_comment` on the ticket.
- Mark the plan entry as `Linear: synced`.

If the user said **no** (or there is no ticket ID): mark the plan entry as `Linear: not synced`. Do not prompt again.
