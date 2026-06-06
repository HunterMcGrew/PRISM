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

- 2025-06-05 [hmcgrew/issue-5-ghost-adrs]: Plan created — remove 3 ghost ADR rows from README index across canonical, install template, and mirrored directories.
- 2025-06-05 [hmcgrew/issue-5-ghost-adrs]: All tasks complete — removed 0021, 0025, 0026 rows from 2 source READMEs, rebuilt mirrors, verified clean sweep.

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

---

## Cleanup Items

---

## PR Readiness

- [ ] No critical or major issues
- [ ] Types correct — no `any`, no unsafe `as`
- [ ] No stray console.logs or debug artifacts
- [ ] Tests written for new logic and edge cases
- [ ] All debugged issues resolved (no `open` entries)
- [ ] Build passes
- [ ] PR description up to date
- [ ] Lasting decisions promoted to architect context (if applicable)

**Last updated:** 2025-06-05
