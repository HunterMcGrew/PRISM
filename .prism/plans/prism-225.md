# Plan: prism-225

## Ticket

https://github.com/HunterMcGrew/PRISM/issues/225

## Goal

Build the Recruiting / People persona — the business-layer voice for job descriptions, interview rubrics, and hiring process documentation, grounded in ADR-0060 and the Wave 1 substrate.

---

## User Stories

Add entries here via the user stories skill (Mira). Optional — not all tickets need user stories.

---

## Design

Add entries here via the design skill (Pixel). Optional — not all tickets need a design phase.

---

## Implementation Tasks

Added by the architect skill (Winston).

### Clove (implementation)

1. <!-- Winston to fill -->

### Eli (documentation)

1. <!-- Winston to fill if needed -->

---

## Decisions

- Ships in its own PR first; Legal (#226) branches from updated `main` after this merges — sequential topology per ADR-0060 and Sol's Wave 4 plan to avoid roles.json/build conflicts.

---

## History

- 2026-06-19 [hmcgrew/prism-wave4-recruiting]: Scaffolded plan; issues #225 (Recruiting) and #226 (Legal) filed; Recruiting branch created from origin/main @ 30234af.

---

## Debugged Issues

---

## Review Issues

---

## Acceptance Criteria

### Behavioral

- [ ] Given the Recruiting persona is invoked, When asked for a job description, Then it produces a structured JD grounded in `.prism/business/strategy.md` context.
- [ ] Given the Recruiting persona is invoked, When asked for an interview rubric, Then it produces a structured rubric with evaluation criteria.
- [ ] Given `.prism/business/strategy.md` is absent, When the persona is invoked, Then it flags the missing context and requests relevant details before proceeding.

### Non-behavioral

- [ ] Persona spec follows ADR-0046 shape (frontmatter.yml + shared.md, `persona` field in `roles.json`, Codex adapter).
- [ ] `pnpm prism:build` passes; discovery/literal/path tests pass.
- [ ] `roles.json` entry present and correct.

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
- [ ] Build passes — last run: pending
- [ ] PR description up to date
- [ ] Lasting decisions promoted to architect context (if applicable)

**Last updated:** 2026-06-19
