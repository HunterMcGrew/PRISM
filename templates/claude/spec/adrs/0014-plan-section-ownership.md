---
Number: 0014
Title: Plan Section Ownership
Status: accepted
Date: 2026-04-19
---

## Context

The plan file has many sections — goal, user stories, decisions, tasks, history, debugged issues, review issues, AC, cleanup items, PR readiness. Multiple skills read and write to the plan across a ticket's lifetime. Without an ownership model, skills either step on each other's work or leave sections untouched out of caution.

Concrete example: if both Winston and Clove might write to `## Decisions`, an ambiguous state ("who decided X?") makes the history unreliable. If neither is sure they own `## Review Issues`, bugs sit unlogged.

## Decision

Each plan section has designated readers and writers. The ownership table in `.claude/architect/skills-ecosystem.md` § Plan Section Ownership is the canonical source.

Summary:

- `## Goal` — Winston, Nora write; all read
- `## User Stories` — Mira writes; Winston/Clove/Eli read
- `## Decisions` — Winston writes; all read
- `## Implementation Tasks` — Winston writes; Clove reads
- `## Acceptance Criteria` — Winston generates, Briar validates/updates, Nora for bugs; Clove/Briar/Eric read
- `## Design` — Pixel writes (mode 2 only); Winston/Clove read
- `## History` — all write (append-only); all read
- `## Debugged Issues` — Sasha creates, Clove marks fixed; Clove/Briar/Eric read
- `## Review Issues` — Briar/Eric create, Clove marks fixed; Clove reads
- `## Cleanup Items` — Briar writes; Clove reads
- `## PR Readiness` — Briar writes; Clove/Eric read

## Consequences

- Positive: conflicts are structural, not procedural — if two skills want to write the same section, the ownership table resolves it.
- Positive: readers know where to look. Clove reads `## Debugged Issues` before implementing because Sasha's findings live there.
- Negative: the table is another thing to maintain. When a new skill or section is added, the ownership needs to be decided and written in.
- Neutral: `## History` is the one section all skills write to. Append-only discipline keeps that shared section safe.

## References

- `.claude/architect/skills-ecosystem.md` § Plan Section Ownership
- ADR-0001 (Plan Is Source of Truth) — this ADR specifies who writes to which section
