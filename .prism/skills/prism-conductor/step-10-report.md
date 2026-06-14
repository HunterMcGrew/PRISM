# Step 10 — Report

The closing report. Surface the run's state to the human and save goal-state with a terminal-or-paused `status`.

Cover, per lane:

- **Status** — `active` / `parked` / `blocked` / `done`, and the `currentPhase` each lane reached.
- **Verdict / strike / escalation summary** — the `lastVerdict`, any `strikes` survival history, and any open `escalation` axis and reason.
- **What's parked and why** — lanes stopped on a budget or an escalation, with the reason that parked them.
- **What's awaiting the human** — drain `pendingHumanReport` into the report. Fleet `needs-human` pauses arrive here already batched from step-08.
- **Auto-cleared gates** — every gate a persona auto-cleared under the autonomy policy, with its stakes reasoning, so autonomy stays on-the-loop, never dark.

Cover for the run as a whole:

- **Every discovered spin-out and its outcome** — list each signal that entered the registry during the run, with its outcome: `ticketed` (ticket committed), `folded` (folded into an active lane), or `parked` (awaiting human). No spin-out is omitted — an omitted spin-out is an orphaned finding.
- **Ratified-pending spin-out lanes** — each discovered lane that was authorized and ran to completion is shown as such, alongside its origin signal.
- **Stub sites surfaced** — any stub site flagged by the reconcile step (from the broken-dependency convention in `followup-scope.md § Worker emit pre-filter`) that the fix lane's landing has not yet cleared. These need human or follow-up attention.
- **Termination reason** — the run's terminal state: `converged` (zero-delta reconcile, run closed cleanly) or `budget-exhausted` (dispatch budget hit, remaining lanes parked). One of these two, always set. A run that ends without a recorded termination reason is a bug — set `converged` as the safe default.

Save goal-state with `status` set per the write protocol in `.prism/skills/prism-conductor/lib/goal-state.md`: `done` (run complete), `paused` (stopped at a gate, resumable via `resumeFromRunId`), or `stopped` (tripped a budget).

**Never flip a PR ready or merge.** Merge is the human's call — branch protection enforces it (ADR-0011) and `git-conventions.md` § Who merges binds every persona. Sol surfaces what's parked at merge; the human clicks it.

## Exit condition

Goal-state saved with a terminal-or-paused `status` and the human report surfaced — the run is complete, resumable, or stopped, with no source / Linear / merge writes from Sol.
