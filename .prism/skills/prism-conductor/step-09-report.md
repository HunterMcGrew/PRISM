# Step 09 — Report

The closing report. Surface the run's state to the human and save goal-state with a terminal-or-paused `status`.

Cover, per lane:

- **Status** — `active` / `parked` / `blocked` / `done`, and the `currentPhase` each lane reached.
- **Verdict / strike / escalation summary** — the `lastVerdict`, any `strikes` survival history, and any open `escalation` axis and reason.
- **What's parked and why** — lanes stopped on a budget or an escalation, with the reason that parked them.
- **What's awaiting the human** — drain `pendingHumanReport` into the report. Fleet `needs-human` pauses arrive here already batched from step-08.
- **Auto-cleared gates** — every gate a persona auto-cleared under the autonomy policy, with its stakes reasoning, so autonomy stays on-the-loop, never dark.

Save goal-state with `status` set per the write protocol in `.prism/skills/prism-conductor/lib/goal-state.md`: `done` (run complete), `paused` (stopped at a gate, resumable via `resumeFromRunId`), or `stopped` (tripped a budget).

**Never flip a PR ready or merge.** Merge is the human's call — branch protection enforces it (ADR-0011) and `git-conventions.md` § Who merges binds every persona. Sol surfaces what's parked at merge; the human clicks it.

## Exit condition

Goal-state saved with a terminal-or-paused `status` and the human report surfaced — the run is complete, resumable, or stopped, with no source / Linear / merge writes from Sol.
