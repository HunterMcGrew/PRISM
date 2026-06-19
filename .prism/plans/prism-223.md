# Plan: prism-223

## Ticket

https://github.com/HunterMcGrew/PRISM/issues/223

## Goal

Build the customer success / support persona — the business-layer voice for support playbooks, FAQ generation, and customer onboarding guides; owns customer-facing success content distinct from Eli's product/feature documentation surface.

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

- **CS ↔ Eli output boundary.** This persona owns *customer-facing* support and success content: support playbooks, FAQs, customer onboarding guides, escalation runbooks. Eli (`prism-documentation`) owns *product and feature* documentation: usage guides, API docs, developer onboarding. Boundary criterion is audience — external customers (CS) vs. internal/developer audiences (Eli). Winston: encode this boundary in the spec as a named section (e.g., "What [name] does not own") and add a forward reference to Eli's skill file. The two personas must not duplicate each other's artifact surface.
- **Host capability: `brand-voice`.** Detect at runtime via `ToolSearch` before relying on it. Graceful degradation when absent: produce support content in plain markdown; flag that output is not brand-voice-styled; offer to rerun when capability is present. Same pattern as Charlie/Quinn (Wave 2, ADR-0060).

---

## History

- 2026-06-19 [hmcgrew/prism-wave3-data-customer-success]: Scaffolded plan; Wave 3 serial topology, shares branch with prism-222.

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
