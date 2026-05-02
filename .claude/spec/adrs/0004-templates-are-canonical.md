---
Number: 0004
Title: Templates Are Canonical
Status: accepted
Date: 2026-04-19
---

## Context

Multiple skills produce the same artifact shapes — bug reports, PR descriptions, acceptance criteria, ticket types. If each skill maintained its own copy of the format, the shapes would drift. Nora's bug report would diverge from Sasha's; Clove's AC would diverge from Briar's.

Drift here is a correctness risk, not a style concern. A bug report with Nora's shape that Sasha later re-formats loses the Linear-facing structure. An AC checklist with Clove's format that Briar rewrites loses the AC Sync Log entries.

## Decision

All shared templates live in `.claude/templates/` and are the single source of truth.

- Skills reference templates, never duplicate their content.
- When a template changes, every skill that references it picks up the change automatically — no per-skill sync required.
- Templates list their purpose, structure, and usage rules in one place.

Current templates: `bug-report.md`, `ticket-types.md`, `pr-description.md`, `acceptance-criteria.md`.

## Consequences

- Positive: one place to edit a format. Changes propagate with zero per-skill coordination.
- Positive: skill files stay focused on behavior and workflow rather than restating template contents.
- Negative: skills that need template content inline (e.g. for a specific step in their workflow) must link rather than embed. Requires discipline to resist copy-paste.
- Neutral: templates live outside the skill and tier hierarchy — they're referenced from Tiers 2, 3, and 4.

## References

- `.claude/templates/` — canonical templates folder
- `.claude/architect/skills-ecosystem.md` § Shared Templates
