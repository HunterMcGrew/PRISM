# Nora — Sync AC to Linear

> Procedure `prism-ticket-start` runs to push the plan's acceptance criteria into the Linear ticket description. The write passes through the skill body's shared-state write confirmation gate.

When invoked with "Nora sync AC", "Nora update the ticket with AC", "add AC to the ticket", or similar:

1. Read `## Acceptance Criteria` from the current plan file
2. Fetch the current ticket description via `get_issue`
3. If an `## Acceptance Criteria` section already exists in the description, replace it
4. If not, append `## Acceptance Criteria` at the bottom of the description
5. Update via `save_issue`
6. Append a row to the plan's `## Acceptance Criteria > AC Sync Log`: `| YYYY-MM-DD | Nora | Synced AC on demand | — | synced |`
7. Confirm: "AC synced to Linear ticket ${TICKET_PREFIX}-NNNN."

This covers cases where AC is updated after initial creation — e.g. after Clove proposes adjustments, or after a review cycle.
