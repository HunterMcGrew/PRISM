# Step 04 — Dispatch

Author and invoke the autonomous Workflow segment that drives the lanes through `implement → self-review → pr-review → qa → docs`. Cite `claude.md` § The autonomous segment for the Claude Code mechanism rather than restating it: `pipeline(lanes, …)` for the per-lane phase chains, `agent()` calls carrying `agentType` (the compiled persona def at `.claude/agents/<persona>.md`), `model` (the per-dispatch tier from the model-tiering table), `schema` (the report-back verdict shape), `isolation: 'worktree'` (one checkout per lane), and `budget` (the global dispatch cap).

The segment runs each lane forward autonomously and **clears `auto-cleared` gates in place** without returning to Sol — the owning persona judges its own gate under the autonomy policy and the script proceeds. It breaks back to Sol only when a lane returns `needs-human` / `blocked`, completes, or trips a budget.

Sol does not talk to running workers. It reads the returned verdicts when the segment ends and records them in goal-state (`lastVerdict`, `signals`, the gate disposition) per the mutate protocol in `.prism/skills/prism-conductor/lib/goal-state.md`. Set the per-dispatch `model` off each lane's `models` map — `opus` for Winston and for any worker that escalated, `sonnet` for the default worker dispatch.

The runtime equivalents for other adapters (`@openai/codex-sdk`, `@cursor/sdk`, or a sequential `prism-handoff` fallback) live in `codex.md` / `cursor.md`.

## The review phase is the gauntlet

The `self-review` and `pr-review` phases are not single passes — each runs the prism-review-loop ladder (`.claude/skills/prism-review-loop/SKILL.md`, canonical `.ai-skills/skills/prism-review-loop/shared.md`): dispatch the reviewer; a `done` (zero-findings) verdict advances the phase, a `needs-fix` verdict routes the recorded `## Review Issues` to the implementer and re-dispatches the **same** reviewer, looping until a clean pass. `self-review` (Briar) loops to clean, then `pr-review` (Eric) loops to clean. A fix pushed during the `pr-review` loop is re-reviewed by the same reviewer (Eric), not re-run through self-review — the self-review loop already ran to clean before `pr-review` opened.

Cleaner-path findings (the ladder's third rung) never gate the zero-findings exit. They surface as secondary signals — `found-followup-work` (→ Nora) or `observation` (recorded) — and route per the report-back contract; a clear-cut cleaner path the implementer can fold into the current fix dispatch may ride the same `needs-fix` loop instead.

`pr-review` is a **default rung, not a proportionality skip** — any lane with an open PR runs Eric, regardless of how small or green the change looks. Skipping the PR review because the diff seems trivial is the failure mode this default exists to prevent; a single self-review leaves no review signal on the PR the human merges. Opening and pushing the PR are conducted actions inside this phase, not human gates — Clove opens/pushes the PR and Eric reviews it as a fresh dispatch, all autonomously. Sol parks for the human only at merge (`step-10-report.md`; ADR-0011), never at push or PR-open; the operator's run invocation plus the autonomy policy already authorize every outward action up to the merge gate.

The loop reuses Sol's existing guardrails rather than duplicating them — the pass budget and three-strike survival rule from `step-07-budgets.md`, and the disagreement fast-path (a fixer who believes a finding is wrong → Winston to adjudicate, → human only if Winston needs your input) from `step-06-escalate.md`. Cite the ladder for its rules; do not restate the budget or strike numbers here.

One ladder rule does not carry over: the prism-review-loop phase-boundary gate (its interactive `/prism-handoff` prompt at the `self-review → pr-review` transition) does not fire under Sol's autonomous segment — Sol advances the transition in place. Interactive gates only reach the human through `needs-human` / `pendingHumanReport`; Sol surfaces a review boundary to the human only when a rung returns `needs-human`, never as a routine handoff prompt.

## Tree dispatch — leaf-first, container lanes roll up

**Only leaf lanes dispatch.** A leaf lane is one with no other lane naming it as `parentId`. The `pipeline(lanes, …)` segment is authored over the **leaf lanes only**; container lanes (epics, issues — any lane with ≥1 child) are never passed to `agent()` and never enter a phase chain. The container-lane definition is in `lib/goal-state.md` § Field notes.

**Container status is derived, not dispatched.** A container lane's `status` is computed from its children at each reconcile boundary: `done` only when every child is `done` or `dropped`; `blocked` if any child is `blocked`; otherwise `active`. Its `currentPhase` is not meaningful — set it to `null` and rely on `status`.

**The invariant:** no container lane closes as `done` while any child remains `active`, `parked`, or otherwise unresolved (FR-1). This falls out of the rollup rule — it needs no separate enforcement.

**Parent-status computation is a deterministic run-state rollup.** Sol reads child `status` from goal-state and computes the parent's; it is not a dispatch and does not count against `globalBudget.spent`.

## Exit condition

A segment returned and its verdicts are recorded in goal-state — control advances to step-05 to route them.
