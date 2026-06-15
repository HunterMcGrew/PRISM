# Step 10 — Report

The closing report. Surface the run's state to the human and save goal-state with a terminal-or-paused `status`.

Cover, per lane:

- **Status** — `active` / `parked` / `blocked` / `done`, and the `currentPhase` each lane reached.
- **Verdict / strike / escalation summary** — the `lastVerdict`, any `strikes` survival history, and any open `escalation` axis and reason.
- **What's parked and why** — lanes stopped on a budget or an escalation, with the reason that parked them.
- **What's awaiting the human** — drain `pendingHumanReport` into the report. Fleet `needs-human` pauses arrive here already batched from step-08.
- **Auto-cleared gates** — every gate a persona auto-cleared under the autonomy policy, with its stakes reasoning, so autonomy stays on-the-loop, never dark.

Cover for the run as a whole:

- **Per-subtree budget attribution** — consumed dispatches shown rolled up to each epic's subtree and each issue's subtree, computed read-time from the global counter (no per-lane counter).
- **Every discovered spin-out and its outcome** — list each signal that entered the registry during the run, with its outcome: `ticketed` (ticket committed), `folded` (folded into an active lane), or `parked` (awaiting human). No spin-out is omitted — an omitted spin-out is an orphaned finding.
- **Ratified-pending spin-out lanes** — each discovered lane that was authorized and ran to completion is shown as such, alongside its origin signal.
- **Stub sites surfaced** — any stub site flagged by the reconcile step (from the broken-dependency convention in `followup-scope.md § Worker emit pre-filter`) that the fix lane's landing has not yet cleared. These need human or follow-up attention.
- **Termination reason** — the run's terminal state: `converged` (zero-delta reconcile, run closed cleanly) or `budget-exhausted` (dispatch budget hit, remaining lanes parked). One of these two, always set. A run that ends without a recorded termination reason is a bug — set `converged` as the safe default.

## Tree-structured view

When the run drove a tree (lanes carry `parentId` children), the report renders the tree shape — each epic, its child issues, and their child tickets, with per-lane `status` and termination reason, indented to show the `parentId` hierarchy.

**Discovered work (generation ≥ 1) is shown in a separate section from the planned tree (generation 0)** so the operator can distinguish what was planned from what was found during build (FR-9).

A flat run (no lane has children / no `parentId`) renders exactly as today — the tree view is additive and degrades to the flat lane list when no lane has children.

## Per-team view (Phase C)

For each distinct non-null `team` value across `lanes[]`, surface a per-team summary — count of lanes **dispatched, done, parked, and discovered** (discovered = lanes whose origin signal carried that team tag, identified from the `team` value on the lane). The grouping key is the `team` value already recorded on each lane; no re-derivation is needed.

This view is **additive** — it appears alongside the existing flat-list view and the tree-structured view above; all applicable views appear in one report (FR-8). A run with all-null `team` shows no per-team section, preserving Phase A/B behavior unchanged.

## Integration gate report (Phase C)

When an integration gate fires (a lane with `type: "integration"` whose `dependsOn` spans two or more distinct `team` values — all dependencies reached `done`), the report surfaces, distinctly labeled as an integration gate (not a file-conflict gate):

- A **per-team summary of completed `dependsOn` lanes** — lane ID, scope statement, termination reason — grouped by upstream team.
- Any `dependsOn` lanes that are `parked` rather than `done`, with their escalation reason.
- The integration lane's **scope statement** (what it validates).
- A prompt for the operator to approve dispatch or escalate (FR-6).

The trigger is defined in `lib/fleet.md § Integration gate`. The integration gate report and the file-conflict gate report are distinct — label them clearly so the operator can tell which is which.

Save goal-state with `status` set per the write protocol in `.prism/skills/prism-conductor/lib/goal-state.md`: `done` (run complete), `paused` (stopped at a gate, resumable via `resumeFromRunId`), or `stopped` (tripped a budget).

**Never flip a PR ready or merge.** Merge is the human's call — branch protection enforces it (ADR-0011) and `git-conventions.md` § Who merges binds every persona. Sol surfaces what's parked at merge; the human clicks it.

## Exit condition

Goal-state saved with a terminal-or-paused `status` and the human report surfaced — the run is complete, resumable, or stopped, with no source / Linear / merge writes from Sol.
