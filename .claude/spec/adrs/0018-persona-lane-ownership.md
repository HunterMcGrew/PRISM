---
Number: 0018
Title: Persona Lane Ownership
Status: accepted
Date: 2026-04-19
---

## Context

Plans group `## Implementation Tasks` under persona headings — `### Clove`, `### Eli`, `### Sasha`, etc. — so it's clear which skill owns which work. The headings exist to prevent two problems: skills picking up work outside their lane, and work that crosses lanes happening invisibly with no record of the scope shift.

Concrete history: in THR-1632 task 8, `## Implementation Tasks` enumerated separate Clove and Eli targets. Clove absorbed two of Eli's `docs/content/dev/ai-skills/` files (`overview.md`, `why-ai-skills.md`) during her Briar-decoupling pass. The edits were thematically correct — same theme, same file cluster, same PR — but boundary-crossing without a handoff note. The plan said Eli owned those files; Clove edited them anyway, with no `## Decisions` entry recording the absorption. That's the gap this ADR closes.

## Decision

Persona headings under `## Implementation Tasks` are the source of truth for task ownership. When a skill picks up the plan, it works within its named heading and treats other personas' headings as out-of-scope by default.

When work needs to cross a lane, the skill has three options:

- **Skip and let the owner handle it.** Default — leave the lane to its owner and continue with in-scope work.
- **Absorb with a `## Decisions` entry.** When same-PR absorption is meaningfully faster (shared file, related rewrite, would otherwise require a redundant handoff), the skill may absorb the cross-lane work — but only with a `## Decisions` entry documenting the scope shift, the reason, and the affected files. The entry is the audit trail.
- **Route to the owning persona now.** Mid-ticket handoff to the named persona, same as the Clove → Pixel → Clove pattern for design gaps.

Silent cross-lane edits are the failure mode this ADR prevents. Documented absorption is fine; undocumented absorption is not.

## Consequences

- Positive: handoffs become legible. Reviewers can read the plan and see what each skill touched and why.
- Positive: the `## Decisions` log now carries scope shifts as well as technical decisions, which is a cleaner audit trail for "why did Clove edit Eli's file."
- Positive: routing decisions surface earlier. When a skill hits a cross-lane edit, it pauses and chooses an explicit option rather than drifting.
- Negative: occasional velocity tradeoff. Same-PR absorption is sometimes the right call but now carries a small cost — the `## Decisions` entry. The gain in traceability is worth the cost.
- Neutral: this codifies an expectation that was implicit. Nothing changes about what the headings mean — the ADR makes the existing structure binding.

## References

- `.claude/rules/branch-plan.md` — Implementation Tasks section enforces the heading structure
- `.claude/architect/skills-ecosystem.md` — Rules for All Skills (Rule 13 cites this ADR)
- `.claude/plans/thr-1632.md` — the absorption incident that surfaced the gap (see `## Decisions` entry on 2026-04-19 documenting the scope expansion)
- ADR-0014 (Plan Section Ownership) — related but distinct: 0014 governs who writes to which `## Section`; this ADR governs who owns which task within `## Implementation Tasks`
