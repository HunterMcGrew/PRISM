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
