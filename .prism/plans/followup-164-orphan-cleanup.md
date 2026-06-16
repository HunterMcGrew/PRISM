# Plan: followup-164-orphan-cleanup

## Ticket

GitHub issue #164 — no Linear ticket. Follow-up to #154 per `.prism/rules/followup-scope.md`.

## Goal

Delete the orphaned `.generated/cursor-skills/` tree, which predates ADR-0044 and is no longer a build target.

---

## Implementation Tasks

### Clove (implementation)

1. `git rm -r .generated/cursor-skills/` — remove 34 tracked files. Confirm `pnpm prism:check` is green after deletion.

---

## Decisions

- `.generated/cursor-skills/` is confirmed orphaned. `paths.json` resolves `cursorSkillsRoot` to `.cursor/skills` since ADR-0044. All build code references `pathDefinitions.generated.cursorSkillsRoot` which resolves to `.cursor/skills` — no path in `scripts/ai-skills/` reads from `.generated/cursor-skills/` directly. `literal-allowlist.json` has no entries for the old path. `path-guard.ts` does not reference `.generated/` at all. ADR prose referencing `.generated/cursor-skills/` is historical context, not a consumer.
  - → no promotion needed (ticket-tactical cleanup; the architectural decision lives in ADR-0044)
- The other `.generated/` files (`codex-config.toml`, two eric PR summary files) are out of scope for this issue — scoped to `cursor-skills/` only per issue #164.
  - → no promotion needed (scope decision local to this ticket)

---

## History

- 2026-06-15 [hmcgrew/prism-164-orphan-cleanup]: Deleted `.generated/cursor-skills/` (34 tracked files) — confirmed orphaned after ADR-0044 moved Cursor output to `.cursor/skills/`.

---

## Acceptance Criteria

### Behavioral

- [ ] `.generated/cursor-skills/` tree no longer exists in the repo
- [ ] `pnpm prism:check` exits green after deletion

### AC Sync Log

| Date | Agent | Action | Plan | Linear |
| ---- | ----- | ------ | ---- | ------ |

---

## PR Readiness

- [x] No critical or major issues
- [x] Types correct — deletion only, no type changes
- [x] No stray console.logs or debug artifacts
- [x] Tests written for new logic and edge cases — N/A (deletion)
- [x] All debugged issues resolved
- [ ] Build passes — last run: pending
- [ ] PR description up to date

**Last updated:** 2026-06-15
