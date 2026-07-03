# Plan: issue-396

## Ticket

GitHub issue #396 — Rename `step-08-linear-handoff.md` to a tracker-neutral filename.

---

## Goal

The PRD skill's step-08 file (and every reference to it) carries a tracker-neutral name, matching the tracker-neutral prose already shipped in #385.

---

## Implementation Tasks

### Clove (implementation)

1. Rename `.prism/skills/prism-prd/step-08-linear-handoff.md` → `step-08-ticket-handoff.md` (canonical source), update `step:` frontmatter and the two in-body `stepsCompleted` references.
2. Sweep every reference to the old filename/step-id across canonical sources (`step-07-finalize.md`, `.ai-skills/skills/prism-prd/shared.md`) and regenerate platform mirrors via `pnpm prism:build`.
3. Fold in the cosmetic table re-pad at `.prism/architect/_toolkit/skills-ecosystem.md` (whitespace-only column alignment after a prior cell edit widened one row past the others).

---

## Decisions

- **Historical plan files stay untouched.** `.prism/plans/issue-380.md` (which originally flagged this rename as an explicit followup) and `.prism/plans/epic-prism-parker.md` (PR-3.4 implementation history) both still reference `step-08-linear-handoff` by name. Per `.prism/rules/branch-plan.md` § Before Closing and ADR-0047, plans are durable historical record and are never rewritten to match current-state — they describe what was true when written. Left as-is.
  - → no promotion needed (scoped rename chore; no new architectural pattern to promote)
- **`linearInitiativeId` PRD frontmatter field name left alone.** The rename request scopes to the step filename and `step:` id. The frontmatter field name is a separate, larger-blast-radius rename (touches every PRD's frontmatter schema) that issue #396 doesn't ask for — out of scope here.
  - → no promotion needed (deliberately out of scope; flagged as potential followup, not actioned)

---

## History

- 2026-07-03 [huntermcgrew/prism-396-rename-step-08-tracker-neutral]: Renamed `step-08-linear-handoff.md` to `step-08-ticket-handoff.md`, swept all references across canonical sources and regenerated platform mirrors via `pnpm prism:build`; folded in the skills-ecosystem.md table re-pad. `pnpm prism:check` green.

---

## PR Readiness

- [x] No critical or major issues
- [x] Types correct — no `any`, no unsafe `as` (docs-only change, N/A)
- [x] No stray console.logs or debug artifacts
- [x] Tests written for new logic and edge cases (docs-only rename; covered by existing `prism:check` crossref-lint and manifest verification)
- [x] All debugged issues resolved (no `open` entries)
- [x] Build passes — last run: 2026-07-03
- [ ] PR description up to date
- [x] Lasting decisions promoted to architect context (if applicable — none needed, see Decisions)

**Last updated:** 2026-07-03
