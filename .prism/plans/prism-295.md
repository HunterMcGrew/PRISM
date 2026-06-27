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

- Class B gate mechanism (Winston design, Phase 5 PR2): all 15 Class B personas use `gates: []` (empty) — the COHERENCE check is the floor. No sidecar file-exists gates; those are retired. The 8 deterministic-target personas (sasha, mira, eli, pixel, theo, zoe, iris, reese) receive a 2nd precondition (`kind: "command"`, `on_fail: "needs-replan"`) proving the act by checking for their real deliverable. The 7 coherence-only personas (winston, briar, eric, nora, parker, ren, lilac) get only the universal `report-written` precondition.
  - → no promotion needed (mechanism described in enforcement-floor.md Class B section; gates.json is the authoritative data)
- Reviewer personas (briar, eric) have `may_write` limited to `.prism/plans/**` plus evidence — task brief constraint; GitHub comment APIs are not filesystem writes.
  - → no promotion needed (reviewer write-lane constraint already in architect context)
- `may_not_run` for all personas includes evidence-deletion patterns — no persona may delete its own evidence; the stop gate reads it.
  - → no promotion needed (enforcement invariant; readable from gates.json directly)
- `allowed_routes` derived from each skill's closing persona recommendation in shared.md — not assumed.
  - → no promotion needed (implementation tactic, self-evident from gates.json entries)
- Class C gate mechanism (Phase 5 PR3): 10 business + conductor personas use lightest class — `gates: []` + single `report-written` precondition only. No command preconditions. All 9 business personas share `may_write: [".prism/business/strategy.md", ...]` since section-level filesystem globs aren't possible; Sol is restricted to `conductor-state.json` + `.tmp` only — no src, no plan, no Linear writes.
  - → no promotion needed (mechanism described in enforcement-floor.md Class C section; gates.json is the authoritative data)
- `isCoherent` extended with 5th `report` parameter: a `needs-fix` verdict with empty `payload.findings` (no critical/major entry) is shape-incoherent — an empty findings array claims review work was done but contains nothing actionable.
  - → no promotion needed (coherence invariant already described in enforcement-floor.md Class B section)

---

## History

- 2026-06-27 [hmcgrew/295-phase5-pr2-classb]: Authored Class B gates.json entries for 8 personas (winston, sasha, nora, mira, briar, eric, parker, reese); opened PR linking #289 + #295.
- 2026-06-27 [hmcgrew/295-phase5-pr2-classb]: Rewrote all 15 Class B gates.json entries to Winston mechanism (gates:[], content-preconditions for 8 deterministic-target personas); extended isCoherent for needs-fix payload coherence; added smoke scenario L (6 sub-tests); build triplet in sync, crossref clean.
- 2026-06-27 [hmcgrew/295-phase5-pr2-classb]: Briar review fix — expanded to all 15 Class B personas (added eli, pixel, theo, zoe, ren, iris, lilac); fixed triplet drift (ai-skills→canonical→runtime+install seed byte-identical); restored enforcement schema from accidental overwrite; added Final act + DoD references to all 13 skill shared.md files missing them.
- 2026-06-27 [hmcgrew/295-phase5-pr2-classb]: Landed 3 Eric Majors (PR #348): replaced repo-global grep preconditions with run-scoped deliverable-sidecar + deliverable-touched-this-run for 8 deterministic-target personas; stripped UTF-8 BOM from 6 run-all/run-gates copies; updated 8 skill Final act lines to reference deliverable.json; added Scenario M smoke tests + enforcement-floor.md Class B prose; smoke 15/15 green. 
- 2026-06-27 [hmcgrew/295-phase5-pr2-classb]: Stripped UTF-8 BOM from 13 shared.md canonical sources (16 total including prism-code-dev, prism-design/lib/output-modes.md, prism-review-loop); added build-time bom-guard.ts with 7 unit tests wired into prism:build+check so the defect cannot recur silently.
- 2026-06-27 [hmcgrew/295-phase5-pr3-classc]: Authored Class C gates.json entries for 10 personas (vera, kora, ellis, charlie, quinn, tess, remy, penny, lex, sol); triplet byte-identical, smoke 16/16, crossref clean.
- 2026-06-27 [hmcgrew/295-git-guard-hardening]: Closed CRITICAL-1 (embedded/prefixed command substitution bypass) and CRITICAL-2 (directory pathspec + :(top) magic bypass) in ownership-guard.mjs; added extractSubstitutionBodies (BFS), stripPathspecMagic, pathspecCoversProtectedDirectory helpers; extended Scenario N with 10+1 probes; smoke all green, triplet byte-identical, crossref clean.
- 2026-06-27 [hmcgrew/295-git-guard-hardening]: Complete-grammar re-architecture — extended extractSubstitutionBodies to cover process substitution <(...) and >(...) forms; replaced single-shot stripPathspecMagic with a generative loop closing :/, :!, :^, and stacked short forms; added smoke carveout to pathspecCoversProtectedDirectory; added N.ad–N.aj smoke probes covering all new forms; smoke green, triplet byte-identical, crossref clean.

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

- [x] No critical or major issues
- [x] Types correct — no `any`, no unsafe `as`
- [x] No stray console.logs or debug artifacts
- [x] Tests written for new logic and edge cases
- [x] All debugged issues resolved (no `open` entries)
- [x] Build passes — last run: 2026-06-27
- [x] PR description up to date
- [x] Lasting decisions promoted to architect context (enforcement-floor.md updated)

**Last updated:** 2026-06-27 (PR3 Class C)
