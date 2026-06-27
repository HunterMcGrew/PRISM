# Plan: prism-295

## Ticket

https://github.com/HunterMcGrew/PRISM/issues/295

## Goal

Author Class B `gates.json` ownership and gate entries for the full persona roster, establishing per-persona write-ownership boundaries and procedural coherence gates at the Stop/SubagentStop boundary.

---

## User Stories

Add entries here via the user stories skill (Mira). Optional — not all tickets need user stories.

---

## Design

Add entries here via the design skill (Pixel). Optional — not all tickets need a design phase.

---

## Implementation Tasks

### Clove (implementation)

1. Author Class B gates.json entries for all 15 personas: winston, sasha, nora, mira, briar, eric, parker, reese, eli, pixel, theo, zoe, ren, iris, lilac — branch `hmcgrew/295-phase5-pr2-classb`
2. Add `DoD = gates.json#<persona>` reference line and `**Final act before stopping:**` write instructions to each persona's `shared.md` (matching the clove/sasha/theo pattern)
3. Run pnpm prism:build, verify triplet byte-identical (no drift), run crossref-lint, run smoke tests
4. Commit `PRISM-295: Phase 5 PR2 fix` and push to `hmcgrew/295-phase5-pr2-classb`

---

## Decisions

- Class B gates use file-exists checks on evidence sidecars (e.g., `plan-updated.json`, `case-closed.json`) rather than command execution — sidecars are written by the persona at phase completion, giving a real failure condition without hard command evidence (Class A territory).
- Reviewer personas (briar, eric) have `may_write` limited to `.prism/plans/**` plus evidence — task brief constraint; GitHub comment APIs are not filesystem writes.
- `may_not_run` for all personas includes evidence-deletion patterns — no persona may delete its own evidence; the stop gate reads it.
- `allowed_routes` derived from each skill's closing persona recommendation in shared.md — not assumed.

---

## History

- 2026-06-27 [hmcgrew/295-phase5-pr2-classb]: Authored Class B gates.json entries for 8 personas (winston, sasha, nora, mira, briar, eric, parker, reese); opened PR linking #289 + #295.
- 2026-06-27 [hmcgrew/295-phase5-pr2-classb]: Briar review fix — expanded to all 15 Class B personas (added eli, pixel, theo, zoe, ren, iris, lilac); fixed triplet drift (ai-skills→canonical→runtime+install seed byte-identical); restored enforcement schema from accidental overwrite; added Final act + DoD references to all 13 skill shared.md files missing them.

---

## Debugged Issues

---

## Review Issues

---

## Acceptance Criteria

### Behavioral

- [ ] Given a persona stop fires, When the evidence sidecar for that persona is missing, Then the gate overrides the reported verdict to `done-override`
- [ ] Given each persona's `may_write` globs, When compared to actual skill body output paths, Then no glob is inaccurate or missing a real output path
- [ ] Given reviewer personas (briar, eric), When `may_write` is inspected, Then it contains only plan paths and evidence paths — no src/, no gh CLI write paths

### Non-behavioral

- [ ] `pnpm prism:build` produces triplet byte-identical output (no drift)
- [ ] `pnpm run prism:crossref-lint` exits clean
- [ ] `node .ai-skills/hooks/__smoke__/run-all.mjs` green (pre-existing Windows-only failures out of scope)

### AC Sync Log

| Date | Agent | Action | Plan | Linear |
| ---- | ----- | ------ | ---- | ------ |

---

## Cleanup Items

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

**Last updated:** 2026-06-27
