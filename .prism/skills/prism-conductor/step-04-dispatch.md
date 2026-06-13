# Step 04 — Dispatch

Author and invoke the autonomous Workflow segment that drives the lanes through `implement → self-review → pr-review → qa → docs`. Cite `claude.md` § The autonomous segment for the Claude Code mechanism rather than restating it: `pipeline(lanes, …)` for the per-lane phase chains, `agent()` calls carrying `agentType` (the compiled persona def at `.claude/agents/<persona>.md`), `model` (the per-dispatch tier from the model-tiering table), `schema` (the report-back verdict shape), `isolation: 'worktree'` (one checkout per lane), and `budget` (the global dispatch cap).

The segment runs each lane forward autonomously and **clears `auto-cleared` gates in place** without returning to Sol — the owning persona judges its own gate under the autonomy policy and the script proceeds. It breaks back to Sol only when a lane returns `needs-human` / `blocked`, completes, or trips a budget.

Sol does not talk to running workers. It reads the returned verdicts when the segment ends and records them in goal-state (`lastVerdict`, `signals`, the gate disposition) per the mutate protocol in `.prism/skills/prism-conductor/lib/goal-state.md`. Set the per-dispatch `model` off each lane's `models` map — `opus` for Winston and for any worker that escalated, `sonnet` for the default worker dispatch.

The runtime equivalents for other adapters (`@openai/codex-sdk`, `@cursor/sdk`, or a sequential `prism-handoff` fallback) live in `codex.md` / `cursor.md`.

## Exit condition

A segment returned and its verdicts are recorded in goal-state — control advances to step-05 to route them.
