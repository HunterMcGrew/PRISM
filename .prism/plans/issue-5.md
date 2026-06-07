# Plan: issue-5

## Ticket

https://github.com/HunterMcGrew/PRISM/issues/5

## Goal

Remove ghost ADR index rows (0021, 0025, 0026) that reference files never ported from Thrive, so every README entry links to an ADR that actually exists.

---

## Implementation Tasks

### Winston (spec)

1. ~~**Remove ghost rows from canonical ADR README** — edit `.prism/spec/adrs/README.md`, delete the three index table rows for ADRs 0021, 0025, and 0026.~~ Done.

2. ~~**Remove ghost rows from install template ADR README** — edit `templates/install/.prism/spec/adrs/README.md`, delete the same three rows.~~ Done.

3. ~~**Rebuild mirrors** — run `pnpm prism:build` to regenerate `.claude/spec/adrs/README.md`, `.cursor/spec/adrs/README.md`, `.codex/spec/adrs/README.md` from the canonical source.~~ Done — 140 tests passing.

4. ~~**Final sweep** — confirmed no remaining references to ADR-0021, ADR-0025, or ADR-0026 anywhere in the tree.~~ Done.

---

## Decisions

- Ghost rows are removed, not replaced with stub ADR files. These are Thrive-specific decisions (data-layer reshape, RSC patterns, `"use client"` constants) that don't apply to PRISM's codebase.
- Edit 2 source files and rebuild, rather than editing 5 files directly. The build system mirrors `.prism/spec/` to `.claude/spec/`, `.cursor/spec/`, `.codex/spec/` — editing mirrors directly would be overwritten on next build.

---

## History

- 2026-06-05 [hmcgrew/issue-5-ghost-adrs]: Plan created — remove 3 ghost ADR rows from README index across canonical, install template, and mirrored directories.
- 2026-06-05 [hmcgrew/issue-5-ghost-adrs]: All tasks complete — removed 0021, 0025, 0026 rows from 2 source READMEs, rebuilt mirrors, verified clean sweep.

---

## Acceptance Criteria

### Behavioral

- [ ] Given a reader opens the ADR README index, When they click any linked ADR, Then the linked file exists on disk
- [ ] Given a fresh install from the install template, When the ADR README is copied, Then it contains no rows referencing non-existent ADR files

### Non-behavioral

- [ ] No file in the repository references ADR-0021, ADR-0025, or ADR-0026

### AC Adjustments

### AC Sync Log

| Date | Agent | Action | Plan | Linear |
| ---- | ----- | ------ | ---- | ------ |

---

## Debugged Issues

---

## Review Issues

### Plan dates used wrong year

- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `.prism/plans/issue-5.md:36`
- **Problem:** History entries and PR Readiness timestamp said 2025 instead of 2026
- **Suggested fix:** Replace all `2025-06-05` with `2026-06-05`

---

## Cleanup Items

---

## PR Readiness

- [x] No critical or major issues
- [x] Types correct — N/A (markdown-only change)
- [x] No stray console.logs or debug artifacts
- [x] Tests written for new logic and edge cases — N/A (no new logic); build tests pass (140/140)
- [x] All debugged issues resolved (no `open` entries)
- [x] Build passes — `pnpm prism:build` clean, 140 tests passing
- [x] PR description up to date
- [x] Lasting decisions promoted to architect context (if applicable) — N/A

**Last updated:** 2026-06-05
