# Plan: prism-219

## Ticket

https://github.com/HunterMcGrew/PRISM/issues/219

## Goal

Build the sales persona — PRISM's business-layer voice for ICP profiles, proposals, outreach sequences, and objection-handling playbooks, using `brand-voice` for on-brand content.

---

## User Stories

Add entries here via the user stories skill (Mira). Optional — not all tickets need user stories.

- As a [user type], I want to [action], so that [benefit]

---

## Design

Add entries here via the design skill (Pixel). Optional — not all tickets need a design phase. Pixel writes here in mode 2 (saved mock spec) only.

---

## Implementation Tasks

Added by the architect skill (Winston). Tasks are grouped by persona — each group has a heading naming the skill that owns those tasks.

### Clove (implementation)

1. <task description — one concrete unit of work>

### Eli (documentation)

1. <task description — docs changes go here>

---

## Decisions

- Shares branch `hmcgrew/prism-wave2-marketing-sales` with prism-218 (Marketing strategist) per serial topology — both personas append `roles.json` and regenerate the roster build; two branches would self-conflict. Mirrors the proven #217 shape.
- Uses `brand-voice` for outreach and proposal content per ADR-0060; graceful degradation required when `brand-voice` is absent.
- Grounds in `.prism/business/strategy.md` reading marketing positioning from prism-218's output (sequenced: marketing strategist persona spec completes first so Sales can reference established messaging).

---

## History

- 2026-06-18 [hmcgrew/prism-wave2-marketing-sales]: Scaffolded plan; issues #218 and #219 filed; branch created from origin/main.

---

## Debugged Issues

---

## Review Issues

---

## Acceptance Criteria

Add entries here via the architect skill (Winston). Reference `.prism/templates/acceptance-criteria.md` for format details.

### Behavioral

- [ ] Given [precondition], When [action], Then [outcome]

### Non-behavioral

- [ ] [Constraint or quality requirement]

### AC Adjustments

### AC Sync Log

| Date | Agent | Action | Plan | Linear |
| ---- | ----- | ------ | ---- | ------ |

---

## Cleanup Items

---

## PR Readiness

Living checklist — updated every time `code-review-self` runs. Reflects current state.

- [ ] No critical or major issues
- [ ] Types correct — no `any`, no unsafe `as`
- [ ] No stray console.logs or debug artifacts
- [ ] Tests written for new logic and edge cases
- [ ] All debugged issues resolved (no `open` entries)
- [ ] Build passes — last run: not yet run
- [ ] PR description up to date
- [ ] Lasting decisions promoted to architect context (if applicable)

**Last updated:** 2026-06-18
