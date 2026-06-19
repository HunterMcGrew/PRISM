# Plan: prism-231

> Closed: 2026-06-19

## Ticket

Issue #231 — consolidate business-layer.md roster + patterns

## Goal

Readability consolidation of `.prism/architect/_toolkit/business-layer.md`: convert the run-on persona roster sentence to a scannable table and group the two pattern subsections under a single parent heading.

---

## Implementation Tasks

### Clove (implementation)

1. Convert the prose roster in `## The anchor persona: Vera (prism-founder)` to a table with columns Persona | Skill id | Owns / produces | Strategy-doc section. All 9 personas with exact facts from their specs.
2. Add `## Business-layer patterns` parent heading above the two existing subsections, keeping subsection content verbatim.
3. Mirror source to `templates/install/.prism/architect/_toolkit/business-layer.md`.
4. Run `pnpm prism:build` and `pnpm prism:check`.

---

## Decisions

- **Readability-only restructure — no semantic change.** All ownership facts, section names, and prose content are preserved verbatim. The table reflects exactly what the persona specs say; Kora and Ellis use "Research section" / "Finance section" because their specs don't name a backtick `##` heading (unlike Charlie's `## Marketing`, Quinn's `## Sales`, etc.). No facts were invented or changed.
  - → no promotion needed (readability refactor; no architectural decision)

---

## History

- 2026-06-19 [hmcgrew/prism-231-business-layer-consolidation]: Converted run-on roster to 9-persona table and grouped pattern subsections under `## Business-layer patterns`; build + check GREEN, source == seed.
- 2026-06-19 [hmcgrew/prism-231-business-layer-consolidation]: Closed plan — Eric CLEAN, build green, PR #233 ready to merge. No decisions promoted (readability refactor; consolidated doc is itself the architect context, shipping in this PR).

---

## Review Issues

None found.

---

## Acceptance Criteria

### Behavioral

- [ ] Roster is a table with all 9 personas (Vera, Kora, Ellis, Charlie, Quinn, Tess, Remy, Penny, Lex) and their existing ownership facts preserved
- [ ] The two pattern subsections ("dividing ownership" and "disclaimer-as-architecture") are grouped under `## Business-layer patterns`
- [ ] No semantic changes — no new claims, no deleted facts, no ownership changes
- [ ] All 5 surfaces in sync: source, install seed, `.claude/`, `.codex/`, `.cursor/` mirrors
- [ ] `pnpm prism:build` passes
- [ ] `pnpm prism:check` GREEN

### AC Sync Log

| Date | Agent | Action | Plan | Linear |
| ---- | ----- | ------ | ---- | ------ |

---

## PR Readiness

Living checklist — last updated 2026-06-19 by Briar.

- [x] No critical or major issues
- [x] No type safety concerns (doc-only change)
- [x] No stray debug artifacts
- [x] Tests not applicable (architect doc, no logic)
- [x] All debugged issues resolved (none opened)
- [x] Build passes — last run: 2026-06-19 (329/329, crossref-lint clean)
- [x] PR description references #231
- [x] Lasting decisions: one Decision entry with verdict sub-bullet (`→ no promotion needed`) — correctly scoped as readability refactor

**Last updated:** 2026-06-19
