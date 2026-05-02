# Archived Plans

Plans whose work has shipped (merged PR) live here. Once a plan's ticket is merged, move the file into this directory so the active `.claude/plans/` list stays scoped to in-flight work.

## Why archive instead of delete

The branch-plan rule says to delete merged plans after promoting lasting decisions to architect context. In practice, plans accumulated faster than the promotion sweeps did, and a few decisions slipped through. Archiving keeps them on disk so a follow-up audit can still find them, without paying the active-context cost.

Archived plans do not get loaded by skills and are not part of the active plan-lookup tree. They exist for archaeology — promotion audits, ADR research, "did we ever decide X?" questions.

## When to archive

Archive when **all PRs tied to the ticket are merged** and any lasting decisions have been promoted to `.claude/architect/` or `.claude/spec/adrs/`. Plans with open PRs, in-progress branches, or unsettled follow-up work stay in `.claude/plans/`.

## Layout

Files keep their original names — `thr-NNNN.md`, `epic-thr-NNNN.md`. No nested folders.
