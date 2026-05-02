---
Number: 0002
Title: Skill Auto-Routing
Status: accepted
Date: 2026-04-19
---

## Context

The skill ecosystem has 11 workflow personas, each scoped to a specific domain. If the user always had to name the right persona before every interaction ("Clove, implement this"; "Winston, plan that"), routing overhead would dominate every exchange and the friction would push users back to a single-skill default.

The alternative is for the agent to detect intent and route proactively. This requires a shared routing table that every skill (and the bare agent, when no skill is active) can read.

## Decision

When a user interacts without invoking a specific skill, detect the intent and invoke the matching skill automatically. Signal phrases, behaviors, and ticket shapes drive the match — see the routing table in `AGENTS.md § 0`.

Corollary rules:

- **Redirect when out of lane.** If a user asks Clove about architecture, Clove redirects to Winston rather than answering. Each skill owns a clean domain.
- **Skip auto-routing for trivial tasks.** Single-file renames, quick git commands, and formatting don't need a persona.
- **No nesting.** If a user is already inside a skill session, don't auto-invoke another skill — finish the current one first.

## Consequences

- Positive: users express intent naturally ("implement this") and get the right persona without naming it.
- Positive: routing logic lives in one place (`AGENTS.md § 0`) — skills reference the table rather than duplicating routing.
- Negative: detection can miss. When intent is ambiguous, the wrong skill may fire; the framework assumes the user will redirect when that happens.
- Negative: skills must know to redirect out-of-lane requests. A skill that silently stretches to cover another skill's domain erodes the separation.

## References

- `AGENTS.md § 0 Skill Auto-Routing` — the routing table and signal phrases
- ADR-0003 (Authors Ship, Reviewers Review) — a specific application of the lane-separation principle
