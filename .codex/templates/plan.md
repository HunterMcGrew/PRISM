---
title:
ticket:
stage: plan
status: draft
---

<!--
Copy this file to .prism/plans/<ticket>/plan.md as is, then fill each section. Only a script changes status.

Leave status at draft. Only the auto-approval script, or the approval script after the person approves, changes it.
-->

## Tasks

<!--
One task per heading. Task IDs are appended and never renumbered, so a citation to T3 stays true.
Each task also meets the bar in .prism/rules/implementation-task-detail.md: the file path, the exact change, the verification command, and the sequence.
Above the first task, record the parallel groups the bundle check (plan/bundles.mjs in the hook runtime) prints, one line per group, such as "Group 1: T1, T2". Rerun it after any task change.

### T1: <summary>

- files: <paths this task changes, one path per entry, with no globs or directories>
- proof: <the command that shows the task works>
- proof fails on main: yes
- depends on: <task IDs, or none>
- behavior change: <only when an existing test changes, say what and why>

"proof fails on main" is optional. Add it when the proof is a test that fails before this task lands.
Below the fields, describe the specific change in prose: the exact edit, its insertion point, or the new file's content outline.
-->

## Challenge

<!-- One line per challenge round: "round <n>: clean", "round <n>: resolved <count>", "round <n>: blocking <count>", or, from a confirm round only, "round <n>: carried <count>". -->

## Decisions

<!--
One entry per decision. Lead each entry with a bold title, then the reason.
At close, add a verdict line under each entry: "→ promoted to <path>" or "→ no promotion needed (<reason>)".
-->

## History

<!-- Append-only, oldest first: "- YYYY-MM-DD [branch-name]: <what changed and why>", three sentences at most. -->

## Sessions

<!-- One line per working session. -->

## Verification

<!-- What was run to prove the work, and what it showed. -->

## Review

<!-- One line per review round, "- review round <n> at <sha>[ (part <k> of <m>)]: <verdict>", written by review/record.mjs per REVIEW.md. -->

## PR Readiness

<!-- Fill the Retro line with the retro report's path. The retro always runs. -->

Retro:
