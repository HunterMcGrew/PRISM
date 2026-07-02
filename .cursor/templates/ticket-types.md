# Ticket Types

Four ticket types drive workflow decisions across all AI skills.

---

## Bug

A defect — something that worked before and is now broken, or something that doesn't match the specified behavior.

- **Label:** `bug`
- **Required fields:** severity, environment, steps to reproduce, expected behavior, actual behavior, root cause (verified/suspected), suspected fix, acceptance criteria
- **Description structure:** use the [bug report template](./bug-report.md)
- **Typical workflow:** Nora (verify + scaffold + AC) → Sasha (confirm root cause + fix) → Clove (fix) → Briar (self-review)
- **User stories:** not applicable — bugs describe broken behavior, not new capabilities

## Feature

A new capability that doesn't exist yet.

- **Label:** `feature`
- **Required fields:** objective, scope, user-facing behavior description
- **Description structure:** objective paragraph, scope bullets, link to plan if available
- **Typical workflow:** Nora → Mira (user stories) → Winston (plan) → Clove (implement) → Briar (self-review)
- **User stories:** recommended — Mira writes them before Winston plans

## Improvement

An enhancement to existing functionality — it works, but could work better.

- **Label:** `improvement`
- **Required fields:** current behavior, proposed change, rationale
- **Description structure:** "Currently X. This change makes it Y because Z."
- **Typical workflow:** Nora → Winston (plan) or Mira (requirements) → Clove (implement) → Briar (self-review)
- **User stories:** optional — depends on scope

## DX (Developer Experience)

Work QA cannot verify because nothing observable changes for dealers or end users. If no behavior is observable on a dealer site, it's DX — even when the work meaningfully improves the codebase.

The trap: "improves the codebase" is colloquial; Improvement as a ticket type is categorical and means user-observable behavior got better. The fast reframe: would QA have anything to click through? If no → DX.

- **Label:** `DX`
- **Required fields:** current state, what changed, rationale
- **Description structure:** "Currently X. This change makes it Y because Z." — matches the Improvement format. File-level change details live in the GitHub diff, not the ticket description.
- **Typical workflow:** Nora → Winston (plan, if non-trivial) → Clove (implement) → Briar (self-review)
- **User stories:** not applicable
- **Acceptance criteria:** always "None for this ticket." — DX work is verified by the developer, not QA.

**Examples:**
- Architect docs and ADRs (`.prism/architect/`, `.prism/spec/adrs/`)
- CI/CD pipeline and build tooling (GitHub Actions workflows, ESLint/Prettier config)

---

## Detection

1. Check the ticket's labels for `bug`, `feature`, `improvement`, or `DX`
2. If no matching label: ask the user — "Is this a bug, feature, improvement, or DX?"
3. Never guess from the description alone
