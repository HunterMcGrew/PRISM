---
Number: 0088
Title: Folder-Plan Tasks Carry Fields and Two Gotcha Lines
Status: accepted
Date: 2026-11-27
---

> Supersedes in part [ADR-0033](./0033-implementation-task-detail.md): its task half only. The mode 2 mock-spec bar stands.

## Context

[ADR-0033](./0033-implementation-task-detail.md) set one bar for every task: name the file, the exact change, its insertion point, and the verification command, so any model at any effort level could build the task without a judgment call. The plan stage met it by writing each task as several lines of prose under its heading.

In the plan folders written under that bar, task prose was 58 to 73 percent of a plan's words. Most of it repeated what the spec's design already said, or described an edit the builder could read off the code. The plan stage paid for that prose on every task, every challenge round re-read it, and the person read it at approval.

The bar's reason has also moved. The implement agent now runs on the planning model, because `CLAUDE_AGENT_MODEL_DEFAULTS` in `generate-skills.ts` maps `prism-implement` to `inherit`, and it reads the spec and the code itself, so a task no longer has to carry everything a smaller model would need.

The fields still do work no prose does. `bundles.mjs` groups tasks by their `files`, `auto-approve.mjs` tests each file against the spec's Affected systems, and the `proof` is what the builder runs to show the task works.

## Decision

**A task in a plan folder's `plan.md` carries its field list and at most two gotcha lines.** A gotcha line names what the builder would otherwise get wrong: something two builders who read the spec and the code would still do differently. `plan-folder-citations.ts` fails a task with more than two prose lines below its fields, with a shrink-only allowlist for plans written before the check. `.prism/rules/implementation-task-detail.md` carries the bar.

A legacy flat plan's `## Implementation Tasks` keeps ADR-0033's bar, and Pixel's mode 2 mock specs keep it too, because the plan stage writes tasks from them.

Alternatives considered:

- **Keep the full bar with a soft cap on task length.** Rejected: a cap nothing checks gets argued past one task at a time, and the prose comes back.
- **Drop the gotcha lines and keep fields only.** Rejected: some decisions live in neither the spec nor the code, such as which of two valid shapes a sibling file expects, and the task is the only place left to put them.

## Consequences

- **Positive:** plans get shorter to write, to challenge, and to approve, and the words left in a task are the ones a builder couldn't recover.
- **Positive:** the cap is a lint, so it holds without a reviewer counting lines.
- **Negative:** a builder reads the spec and the code to recover what a task no longer states, and that costs more reads per task. A builder on a weaker model than the planner, such as a consumer who pins the implement agent to a smaller one, loses the detail ADR-0033 gave it.
- **Negative:** whether a line earns its place as a gotcha is a judgment the plan stage makes. A missing gotcha shows up as a review finding or a re-plan, after the build.

## References

- [ADR-0033](./0033-implementation-task-detail.md) — the bar this supersedes in part.
- `.prism/rules/implementation-task-detail.md` — the rule that carries the new bar.
- `.prism/plans/prism-558/spec.md` — the spec that measured the prose share and set the two-line cap.
