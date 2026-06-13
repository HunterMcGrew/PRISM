# Step 04 — Dispatch

Author and invoke the autonomous Workflow segment that drives the lanes through `implement → self-review → pr-review → qa → docs`. Cite `claude.md` § The autonomous segment for the Claude Code mechanism rather than restating it: `pipeline(lanes, …)` for the per-lane phase chains, `agent()` calls carrying `agentType` (the compiled persona def at `.claude/agents/<persona>.md`), `model` (the per-dispatch tier from the model-tiering table), `schema` (the report-back verdict shape), `isolation: 'worktree'` (one checkout per lane), and `budget` (the global dispatch cap).

The segment runs each lane forward autonomously and **clears `auto-cleared` gates in place** without returning to Sol — the owning persona judges its own gate under the autonomy policy and the script proceeds. It breaks back to Sol only when a lane returns `needs-human` / `blocked`, completes, or trips a budget.

Sol does not talk to running workers. It reads the returned verdicts when the segment ends and records them in goal-state (`lastVerdict`, `signals`, the gate disposition) per the mutate protocol in `.prism/skills/prism-conductor/lib/goal-state.md`. Set the per-dispatch `model` off each lane's `models` map — `opus` for Winston and for any worker that escalated, `sonnet` for the default worker dispatch.

The runtime equivalents for other adapters (`@openai/codex-sdk`, `@cursor/sdk`, or a sequential `prism-handoff` fallback) live in `codex.md` / `cursor.md`.

## The review phase is the gauntlet

The `self-review` and `pr-review` phases are not single passes — each runs the prism-review-loop ladder (`.claude/skills/prism-review-loop/SKILL.md`, canonical `.ai-skills/skills/prism-review-loop/shared.md`): dispatch the reviewer; a `done` (zero-findings) verdict advances the phase, a `needs-fix` verdict routes the recorded `## Review Issues` to the implementer and re-dispatches the **same** reviewer, looping until a clean pass. `self-review` (Briar) loops to clean, then `pr-review` (Eric) loops to clean.

`pr-review` is a **default rung, not a proportionality skip** — any lane with an open PR runs Eric, regardless of how small or green the change looks. Skipping the PR review because the diff seems trivial is the failure mode this default exists to prevent; a single self-review leaves no review signal on the PR the human merges.

The loop reuses Sol's existing guardrails rather than duplicating them — the pass budget and three-strike survival rule from `step-07-budgets.md`, and the disagreement fast-path (a `needs-human` returned because the fixer thinks the finding is wrong → Winston) from `step-06-escalate.md`. Cite the ladder for its rules; do not restate the budget or strike numbers here.

## Exit condition

A segment returned and its verdicts are recorded in goal-state — control advances to step-05 to route them.
