# Plan: prism-213

## Ticket

https://github.com/HunterMcGrew/PRISM/issues/213

## Goal

Lay the foundation the business persona suite hangs off: decide where business personas ground via an ADR, and author the founder/strategy persona as the anchor every Wave 1+ business persona's strategy doc connects to.

---

## Requirements Summary

Drawn from #213 (Phase 1) and the parent epic #212.

### Context

PRISM extends from a software-delivery persona org into a full business persona suite — a business layer that wraps the existing engineering pipeline at two seams:

- **Inbound seam:** Founder sets strategy → ... → Parker (PRD). The new business personas hand off to Parker, keeping the two layers connected rather than forked.
- **Outbound seam:** engineering pipeline → Data/metrics persona → back to Founder. (Wave 3; not in scope here.)

The founder/strategy persona is the anchor: every other business persona reads and writes the strategy doc it owns — the same relationship that all engineering personas have to the branch plan. Until this substrate exists, none of the Wave 1+ personas have a place to hand off to.

### Scope (from #213)

1. **Substrate ADR** — document where the business layer lives:
   - Proposed location: `.prism/business/` with a strategy doc as the business-layer equivalent of the branch plan.
   - Define the handoff seam to Parker's PRD (business layer → existing engineering pipeline).
   - Decide the relationship to existing primitives (`deep-research`, `brand-voice`, `xlsx`) so later personas orchestrate over them rather than reinventing.

2. **Founder/strategy persona spec** — a new PRISM persona that:
   - Owns the strategy doc, OKRs, and cross-functional prioritization.
   - Follows existing persona conventions (sharp boundary, concrete artifact, handoffs).
   - Is the entry seam of the wrap-the-pipeline model.
   - Uses the skill-forge conventions (frontmatter + shared.md + roles.json entry).

### Deliverables (from #213)

- ADR for the business-layer substrate
- Founder/strategy persona spec (frontmatter + shared.md + roles.json entry)
- `pnpm prism:build` green; discovery/literal/path tests pass

### Out of scope

The other ten business personas (Wave 2+). Their specs are shaped by the substrate ADR — filed as Wave issues once this lands.

### Genuine gap this fills

Today there is no CEO/CTO-level persona. Winston ≈ CTO/architecture, Parker ≈ VP Product, but no business-strategy voice. The founder/strategy persona is that gap.

---

## User Stories

Not applicable for this Phase 1 substrate ticket — the deliverables are an ADR and a persona spec, not user-facing features.

---

## Design

Not applicable.

---

## Implementation Tasks

Owned by Winston. Headers below are stubs — Winston populates task detail.

### Winston (architecture + ADR)

_To be populated by Winston._

### Clove (implementation)

_To be populated by Winston after ADR decisions are recorded._

### Briar (self-review)

_To be populated by Winston._

---

## Decisions

_To be populated by Winston after evaluating the substrate ADR options._

Open questions from epic #212 that Winston should resolve:

- **OPEN — TBD, needs Hunter input.** Whether the business-layer strategy doc lives at `.prism/business/strategy.md` (one file, like the branch plan) or as a directory with per-domain docs (OKRs, competitive, positioning as separate files). **Default path (used until resolved):** design for a single strategy doc in `.prism/business/`; refactor into subdocs in a follow-up if needed.

---

## History

- 2026-06-18 [hmcgrew/prism-213-business-substrate-founder-persona]: Created plan; branch foundation established for Winston to populate.

---

## Debugged Issues

None.

---

## Review Issues

None.

---

## Acceptance Criteria

_To be populated by Winston._

### Behavioral

_Pending Winston._

### Non-behavioral

_Pending Winston._

### AC Sync Log

| Date | Agent | Action | Plan | Linear |
| ---- | ----- | ------ | ---- | ------ |

---

## Cleanup Items

None.

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

**Last updated:** 2026-06-18
