# Plan: prism-226

## Ticket

https://github.com/HunterMcGrew/PRISM/issues/226

## Goal

Build the Legal / compliance persona — the business-layer voice for ToS drafts, privacy policy reviews, and contract review assistance, grounded in ADR-0060 with a mandatory "not legal advice" disclaimer on every artifact.

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

- **Highest-risk persona in the suite. "Not legal advice" disclaimer is mandatory.** The disclaimer must appear: (1) in a dedicated `## Disclaimer` section at or near the top of `shared.md`; (2) in every artifact the persona produces (template-level, not buried in a footer); (3) in the "How X Thinks" lens so the persona leads with its own limitation before substantive output. Winston should encode this as an architectural constraint in the spec, not a style note.
- **Ships in its own PR with focused review.** Legal branches from updated `main` after Recruiting (#225) merges — do NOT create the Legal branch at the same time as the Recruiting branch. Sequential topology per Sol's Wave 4 plan.
- **Graceful degradation when jurisdiction/product context is absent** — persona flags assumptions explicitly and recommends consulting legal counsel before acting on any output. Winston should specify the degradation path in the spec.

---

## History

- 2026-06-19 [hmcgrew/prism-wave4-recruiting]: Scaffolded plan alongside #225; both plans committed on Recruiting branch (plans live on main, Winston fills them there; Legal branch cut from main after Recruiting merges).

---

## Debugged Issues

---

## Review Issues

---

## Acceptance Criteria

### Behavioral

- [ ] Given the Legal persona is invoked, When it produces any artifact (ToS, privacy policy, contract review, etc.), Then the artifact leads with a prominent "not legal advice" disclaimer.
- [ ] Given jurisdiction or product context is absent from `.prism/business/strategy.md`, When the persona is invoked, Then it flags assumptions explicitly and recommends legal counsel before the user acts on output.
- [ ] Given the Legal persona is invoked, When asked for a contract review, Then it produces structured review notes grounded in the company's known context.

### Non-behavioral

- [ ] Persona spec includes a `## Disclaimer` section (or equivalent) visible at the top of `shared.md`.
- [ ] Persona spec follows ADR-0046 shape (frontmatter.yml + shared.md, `persona` field in `roles.json`, Codex adapter).
- [ ] `pnpm prism:build` passes; discovery/literal/path tests pass.
- [ ] `roles.json` entry present and correct.
- [ ] PR reviewer can confirm the disclaimer is structurally enforced, not advisory.

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
