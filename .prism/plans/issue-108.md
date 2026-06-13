# Plan: issue-108

## Ticket

https://github.com/HunterMcGrew/PRISM/issues/108

## Goal

Remove stale `prism-architect` and `prism-qa-test-plan` literal-allowlist entries whose referenced bodies no longer carry the allowlisted literals.

---

## Implementation Tasks

### Clove (implementation)

1. Verify each stale entry family (source + mirrors) carries no allowlisted literal via grep.
2. Remove the 10 stale entries from `.ai-skills/definitions/literal-allowlist.json`.
3. Run `pnpm prism:check` to confirm green.

---

## Decisions

- Removed all 5 `prism-architect` entries (THR-1636 literal absent from all bodies) and all 5 `prism-qa-test-plan` entries (THR-1630 literal absent from all bodies). Kept all `prism-code-dev` / THR-1881 entries — literal confirmed present.
  - → no promotion needed (ticket-tactical cleanup; no architectural pattern established)

---

## History

- 2026-06-13 [hmcgrew/issue-108-prune-stale-literal-allowlist]: Removed 10 stale allowlist entries for prism-architect (THR-1636) and prism-qa-test-plan (THR-1630); all body files confirmed empty of the literals via grep.

---

## Review Issues

### prism-code-dev allowlist reason text cites wrong ticket

- **Severity:** `minor`
- **Status:** `open`
- **File:** `.ai-skills/definitions/literal-allowlist.json:29` (and mirrors at lines 33, 37, 41, 45)
- **Problem:** The `reason` field for all 5 `prism-code-dev` entries says "skill cites the THR-1636 originating incident in prettier guidance" but the actual literal triggering the guard in those files is `THR-1881`, not THR-1636. THR-1636 does not appear in the prism-code-dev bodies.
- **Suggested fix:** Update reason text to reference THR-1881 and PR body sync guidance. No functional impact — guard exempts by path prefix, not reason text.

---

## Acceptance Criteria

### Behavioral

- [ ] Given `pnpm prism:check` is run after the 10 stale entries are removed, Then the literal guard passes with no violations.
- [ ] Given the `prism-architect` and `prism-qa-test-plan` body files are grepped for THR-1636 and THR-1630 respectively, Then zero matches are found in all present files.
- [ ] Given the `prism-code-dev` body files are grepped for `THR-1881`, Then at least one match is found in each present file confirming the entries are still needed.

### Non-behavioral

- [ ] JSON at `.ai-skills/definitions/literal-allowlist.json` is valid and parses without error.

### AC Sync Log

| Date | Agent | Action | Plan | Linear |
| ---- | ----- | ------ | ---- | ------ |
| 2026-06-13 | Briar | Generated AC from review | updated | N/A |

---

## PR Readiness

- [x] No critical or major issues
- [x] Types correct — N/A (JSON file, deletion-only)
- [x] No stray console.logs or debug artifacts
- [x] Tests written for new logic and edge cases — no new logic; pre-existing test failure on main (atlas-dogfood Windows path separator) confirmed not introduced by this branch
- [x] All debugged issues resolved (no open entries)
- [x] Build passes — literal guard clean (`prism:check passed`); one pre-existing test failure on main not introduced here
- [x] PR description up to date
- [x] Lasting decisions promoted — not applicable; ticket-tactical cleanup

**Last updated:** 2026-06-13
