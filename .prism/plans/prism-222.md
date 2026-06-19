# Plan: prism-222

## Ticket

https://github.com/HunterMcGrew/PRISM/issues/222

## Goal

Build the data / metrics analyst persona — the business-layer voice for funnel analysis, cohort analysis, and dashboards; owns the outbound metrics seam that writes `## Metrics` in `.prism/business/strategy.md` and closes the business loop back to Vera.

---

## User Stories

<!-- Added by Mira when invoked -->

---

## Design

Not Applicable

---

## Implementation Tasks

<!-- Winston fills this section -->

---

## Decisions

- **Outbound metrics seam.** This persona owns the `## Metrics` section of `.prism/business/strategy.md` (section-ownership model, ADR-0014). Writing to that section is the signal that closes the business loop back to Vera — the Founder re-reads it at next strategy review. Winston: encode this ownership relationship explicitly in the spec's "How [name] Thinks" section and in the `## Grounding` frontmatter stub, mirroring Kora/Ellis. Do not let the persona write to other strategy sections.
- **Host capability: `xlsx` + analytics.** Detect at runtime via `ToolSearch select:xlsx` before relying on it. Graceful degradation when absent: derive metrics from user-supplied summaries; flag that analysis is not from raw data; offer to rerun when capability is present. Same pattern as Kora → `deep-research` (ADR-0060).

---

## History

- 2026-06-19 [hmcgrew/prism-wave3-data-customer-success]: Scaffolded plan; Wave 3 serial topology, shares branch with prism-223.

---

## Debugged Issues

<!-- Sasha fills this section -->

---

## Review Issues

<!-- Briar / Eric fill this section -->

---

## Acceptance Criteria

<!-- Winston fills this section -->

### Behavioral

### Non-behavioral

### AC Adjustments

### AC Sync Log

| Date | Agent | Action | Plan | Linear |
| ---- | ----- | ------ | ---- | ------ |

---

## Cleanup Items

---

## PR Readiness

- [ ] No critical or major issues
- [ ] Types correct — no `any`, no unsafe `as`
- [ ] No stray console.logs or debug artifacts
- [ ] Tests written for new logic and edge cases
- [ ] All debugged issues resolved (no `open` entries)
- [ ] Build passes — last run: not yet run
- [ ] PR description up to date
- [ ] Lasting decisions promoted to architect context (if applicable)

**Last updated:** 2026-06-19
