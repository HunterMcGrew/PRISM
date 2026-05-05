# Ticket Description

The default scaffold Nora uses when creating or fleshing out a Linear ticket. Fill every section heading — write "Not Applicable" under any heading that doesn't apply rather than omitting it. Downstream personas (Winston, Mira, Sasha, Clove) reference these section names directly when reading the ticket; missing headings create gaps.

For type-specific structure (bug, feature, improvement, DX), see [`ticket-types.md`](./ticket-types.md). For acceptance criteria format, see [`acceptance-criteria.md`](./acceptance-criteria.md). For bug-specific fields, use [`bug-report.md`](./bug-report.md) and skip this scaffold.

---

## Problem statement

One paragraph describing the problem or outcome — not the solution. The user, what they're trying to accomplish, and why the current state is insufficient. If the trigger was a specific incident or piece of feedback, reference it.

## Currently

Concrete description of how things work today. One paragraph. The "before" half of the standard "Currently X. This change makes it Y because Z." structure.

## This change makes it

What changes — described in observable terms. The "after" half of the same structure. If a mock or design exists, link it here.

## Because

The rationale. What problem this solves, what value it delivers, what it unblocks.

## Scope

What's in:
- [item]

What's out:
- [item]

## Technical notes

Optional. Constraints, dependencies, complexity signals, or context the team needs that doesn't fit cleanly above. Skip the heading if there's nothing to add.

## Links

Optional. Related tickets, design references, prior conversations, external context. Skip the heading if there's nothing to add.

## Acceptance Criteria

See [`acceptance-criteria.md`](./acceptance-criteria.md) for the format. Behavioral criteria use Gherkin; non-behavioral use a plain checklist. Winston typically generates AC during planning; Nora can scaffold a placeholder when creating the ticket so the section heading is present.
