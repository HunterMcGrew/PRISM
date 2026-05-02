---
Number: 0009
Title: Acceptance Criteria Required and Synced to Linear
Status: accepted
Date: 2026-04-19
---

## Context

Acceptance criteria live in two places: the branch plan (for agents during implementation) and the Linear ticket description (for QA and stakeholders). If the two copies drift, QA tests against stale criteria and the implementation marks itself "done" against criteria QA never saw.

Without a sync discipline, AC updates happen during plan mode but never propagate. AC adjustments made during implementation stay in the plan; Linear still shows the original version. The gap grows silently.

## Decision

Every non-DX ticket carries `## Acceptance Criteria` in both the branch plan and the Linear description, and the two stay in sync.

- **Winston** generates AC during plan mode and auto-syncs to Linear on plan-mode exit.
- **Clove** syncs AC to Linear whenever the implementation accepts an AC adjustment.
- **Briar** syncs AC to Linear whenever self-review refines or adds criteria based on the shipped implementation.
- **Nora** syncs AC on demand and for bug tickets at scaffolding time.

Every sync appends a row to the plan's `AC Sync Log` table so the current sync state is visible at a glance.

DX tickets (label: `DX`) are exempt — the developer verifies the work; there is no user-facing behavior for QA to test.

AC lives at the bottom of the Linear ticket description so readers encounter intent, plan, and AC in that order.

## Consequences

- Positive: QA always tests against current criteria. Stakeholders see the same AC the implementation was validated against.
- Positive: AC adjustments are explicit events (status `proposed`, then user accept, then sync) rather than silent changes.
- Negative: every AC-touching skill must know the sync mechanics — fetch, replace section, save, log. Ceremony cost.
- Neutral: the AC Sync Log accumulates entries per ticket. Not noise — it's audit history.

## References

- `.claude/architect/skills-ecosystem.md` § Plan Section Ownership and § Rules for All Skills item 9
- `.claude/templates/acceptance-criteria.md` — canonical format
- `.claude/rules/acceptance-criteria.md` — writing-style and content rules
