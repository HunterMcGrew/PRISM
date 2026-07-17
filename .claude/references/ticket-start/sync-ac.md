# Nora — Sync AC to the Ticket Tracker

> Procedure `prism-ticket-start` runs to push the plan's acceptance criteria into the ticket description. The write passes through the skill body's shared-state write confirmation gate.

When invoked with "Nora sync AC", "Nora update the ticket with AC", "add AC to the ticket", or similar:

1. Read `## Acceptance Criteria` from the current plan file
2. Fetch the current ticket description via `get_issue`
3. Strip the `**AC-N**` ID prefix and the Evidence sub-bullets before writing — sync behavioral criterion text only, per the Ticket Sync rule in `.prism/templates/acceptance-criteria.md`
4. If an `## Acceptance Criteria` section already exists in the description, replace it
5. If not, append `## Acceptance Criteria` at the bottom of the description
6. Update via `save_issue`
7. Append a row to the plan's `## Acceptance Criteria > AC Sync Log`: `| YYYY-MM-DD | Nora | Synced AC on demand | — | synced |`
8. Confirm: "AC synced to ticket PRISM-NNNN."

This covers cases where AC is updated after initial creation — e.g. after Clove proposes adjustments, or after a review cycle.
