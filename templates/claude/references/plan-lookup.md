# Plan Lookup

This is the shared plan resolution logic used by all skills that need to find the branch plan before starting work.

## Steps

1. **Extract a ticket ID** from the branch name using the `thr-NNNN` pattern (case-insensitive). If the branch name doesn't contain a ticket ID, check the PR title or user input for one.

2. **Look for the plan file** at `<repo-root>/.claude/plans/<ticket-id>.md` (lowercase ticket ID).

3. **If not found**, check for an epic plan at `<repo-root>/.claude/plans/epic-<ticket-id>.md`. Epics use this naming convention when the ticket is a parent story with multiple sub-tasks.

4. **If still not found by filename**, scan all `.md` files in `<repo-root>/.claude/plans/` for a `## Ticket` heading whose content matches the ticket ID. Some plans may have been created with a different filename convention.

5. **If a plan exists**: read it. The plan is the authoritative source for intent, decisions, and constraints on this branch. Treat `## Decisions` entries as intentional — do not second-guess or override them without explicit user approval.

6. **If no plan exists**: ask the user which ticket this work is for, then create one using the template defined in the plan rule. If the skill's role is read-only on the branch (e.g., reviewing someone else's PR), do NOT create a plan — note "no plan found" and proceed.

## Why this matters

The plan is the persistent record that survives across sessions, handoffs between personas, and context window resets. Skipping it means working without the decisions, constraints, and history that prior sessions established — which leads to contradicting earlier work or repeating solved problems.
