# Plan: hmcgrew/ai-skills

## Goal

Add shared AI skills, rules, and ticket-scoped plans for Claude Code and Cursor to the repository.

---

## Decisions

- Skills are canonical in `.claude/skills/` — Cursor stubs in `.cursor/skills/` point to the Claude versions
- Plans are scoped to tickets/epics (not branches) — multiple PRs share one plan, named by ticket ID
- Rules use `schema.ts` and resolver pattern (not legacy `config.ts` / `get-block-props.ts`) to match current codebase
- Plan template includes `## Review Issues`, `## Cleanup Items`, and `## Before Closing` sections
- PR review skill updates existing summary comments (never duplicates) and only resolves threads after verifying the fix
- Self-review creates a plan if none exists (exception to the "review skills don't create plans" rule) because it needs one to write review issues and PR readiness into

---

## History

- 2026-03-19: Initial commit with 5 skills, 6 rules, 21 branch plans, gitignore updates.
- 2026-03-19: Self-review identified 3 major issues: schema.ts/config.ts mismatch, missing plan template sections, PR review comment management.
- 2026-03-19: Fixed code-standards.md, added template sections, updated PR review skill.
- 2026-03-19: Renamed prop-ordering.md heading from "Motes rules" to "Object and Props Ordering".
- 2026-03-19: Rewrote branch-plan rule as ticket-scoped "Plan Rule" — plans named by ticket ID, span multiple PRs, include Before Closing section for decision promotion.
- 2026-03-19: Updated all 5 skills with ticket-based plan lookup logic.
- 2026-03-19: Renamed 18 plan files from branch-slug to ticket ID format.
- 2026-03-19: Renamed epic-7-featured-links-block.md to thr-1134.md per user.
- 2026-03-19: Deleted 2 stale plans (testing-blocks-renderer, add-retry-logic).
- 2026-03-19: Second self-review found 10 stale "branch plan" references across 5 files — all fixed.
- 2026-03-19: Fixed plan rule cross-file inconsistency — self-review now explicitly allowed to create plans.

---

## Debugged Issues

None.

---

## Review Issues

None — all issues resolved during this session.

---

## Cleanup Items

None.

---

## PR Readiness

- [x] No critical or major issues
- [x] Types correct — no `any`, no unsafe `as`
- [x] No stray console.logs or debug artifacts
- [x] Tests written for new logic and edge cases — N/A (config-only)
- [x] All debugged issues resolved (no `open` entries)
- [x] Build passes — pre-existing gravity-platform-core failure, not related to this branch
- [ ] Lasting decisions promoted to architect context — N/A, architect context files don't exist yet
- [ ] PR description up to date

**Last updated:** 2026-03-19
