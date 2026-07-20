# Plan: 416

## Ticket

https://github.com/HunterMcGrew/PRISM/issues/416

## Goal

Close the 15-persona routing-table gap against `roles.json` with an explicit, machine-checked `auto`/`named-only` policy instead of hand-maintained, silently-drifting prose.

---

## User Stories

Not applicable.

---

## Design

Not applicable.

---

## Implementation Tasks

Transposed verbatim from `.prism/plans/eval-routing-and-rule-load.md` § Proposed Implementation Tasks → Lane 1 — routing completeness. That document is the shared architecture record for this issue and its sibling, #417.

### Winston (spec ratification)

1. **Ratify the per-persona routing policy** — DISCHARGED. Hunter ratified Winston's proposed default verbatim on 2026-07-20 (see `## Decisions`); this task is resolved, not blocking.

### Clove (implementation)

2. **Add `routing` to `.ai-skills/definitions/roles.json`.** Every entry gains `"routing": "auto"` or `"routing": "named-only"` per the ratified table (default: `named-only` for `prism-surface-audit`, `prism-doc-walker`, `prism-refactor-scout`, `prism-retro`, and the 3 utilities; `auto` for all other personas). Keep key order `id`, `persona`/`type`, `routing`.
3. **Extend `buildRoleMap` validation** in `scripts/ai-skills/generate-skills.ts` to require `routing` and reject values outside the enum; add matching cases in `discovery-metadata.test.ts` alongside the existing utility-entry tests (`:191-215`).
4. **Rewrite `.prism/rules/skill-routing.md`:** add one table row per missing `auto` persona (Parker, Lilac, Vera, Kora, Ellis, Charlie, Quinn, Tess, Remy, Penny, Lex), deriving Signal phrases from each skill's frontmatter `Triggers:` line (curate, don't paste); add `## Named-invocation personas` after `## Utility skills` listing Zoe, Theo, Ren, Iris with one-clause purposes and the note that they route on explicit name/phrase only; add `prism-skill-forge` to the utility section. Keep the `# Skill Auto-Routing` heading and all existing section headings verbatim (issue-302 citation contract). No bare `ADR-NNNN` (install-adr-gate).
5. **Sync the curated seed twin** `templates/install/.prism/rules/skill-routing.md` to the new content — tokenized (`${TICKET_PREFIX}`), genericized ("tracker", not "Linear" — this closes the PRISM-380 drift), ADR-free.
6. **Add the 9 business personas to `skills-ecosystem.md`'s roster** (`.prism/architect/_toolkit/skills-ecosystem.md`), following the existing table shape; place them per the doc's ticket-flow/cadence grouping logic (they are neither — add a third grouping if the doc's structure demands it, mirroring how the doc already separates cadence personas).
7. **Create `scripts/ai-skills/routing-coverage.test.ts`** asserting: (a) every `routing: "auto"` id appears exactly once as a backticked id in the canonical rule's routing table; (b) every `named-only` id appears in the named-invocation or utility section; (c) every `prism-*` id in the rule exists in `roles.json`; (d) assertions a–c against the seed twin; (e) every `persona` name in `roles.json` appears in `skills-ecosystem.md`. Auto-discovered by `run-tests.ts` — no `package.json` change.
8. **Verify:** `pnpm prism:build` (regenerates all platform copies + AGENTS block), then `pnpm prism:check` green. Confirm the new test fails when a `roles.json` entry is added without a rule edit (mutate locally, observe red, revert).

**Briar / Eric (review focus)** — parity-test correctness and citation-contract preservation (the `# Skill Auto-Routing` heading and section headings must survive verbatim per the issue-302 citation contract).

---

## Decisions

- **Routing completeness is enforced by validation against `roles.json`, not generation.** Membership drift is the observed failure and set-equality checking catches it completely; generation would move curated routing prose (the Signal-phrases column) into build tooling for marginal gain. Revisit only if signal-phrase prose demonstrably rots.
  - → no promotion needed (already recorded in `eval-routing-and-rule-load.md` as the shared architecture record; this plan cites it rather than duplicating).
- **Routing policy is a two-value enum** (`auto` / `named-only`) on the registry entry. Cadence is scheduling metadata and stays in `skills-ecosystem.md`, not the routing policy.
  - → no promotion needed (encoded directly in `roles.json` schema; self-documenting).
- **Ratified per-persona routing policy (Hunter, 2026-07-20, verbatim default):** `auto` = the current 13 (Clove, Winston, Sasha, Eric, Nora, Mira, Briar, Pixel, Reese, Sage, Eli, Sol, Atlas) + Parker + Lilac + all 9 business personas (Vera, Kora, Ellis, Charlie, Quinn, Tess, Remy, Penny, Lex). `named-only` = Zoe (`prism-surface-audit`), Theo (`prism-doc-walker`), Ren (`prism-refactor-scout`), Iris (`prism-retro`), plus the 3 utilities (`prism-handoff`, `prism-review-loop`, `prism-skill-forge`). Discharges Winston's `[HITL]` task 1.
  - → no promotion needed (ticket-tactical; the table itself, once written into `skill-routing.md`, is the durable record).
- **Parker's `routing: "auto"` does not contradict skills-ecosystem.md's "Invoke-only; not part of the standard handoff chain" line — no amendment made.**
  - **Tension as flagged:** the dispatch flagged that Parker's ratified `auto` routing sits against the roster line saying Parker is invoke-only and outside the standard handoff chain.
  - **Reconciliation:** "invoke-only; not part of the standard handoff chain" describes cross-skill handoff recommendation (no other persona's closing message auto-suggests "next: Parker") — a different axis from bare-agent intent routing (`auto`/`named-only`). Pixel already carries both properties simultaneously (`routing: auto` in roles.json, and the identical "Invoke-only; not part of the standard handoff chain" line at skills-ecosystem.md's own Pixel row), and the Cross-skill Handoffs table confirms neither Pixel nor Parker appears as a "Recommends" target from any other persona. The two properties are orthogonal, not contradictory.
  - **Chosen approach:** no edit to skills-ecosystem.md's Parker row. The line is accurate as written under its own axis (handoff-chain membership); ratifying `auto` for Parker's routing changes a different axis entirely.
  - → no promotion needed (reconciliation reasoning lives here; no durable surface asserts the two axes are equivalent, so there's nothing to correct).
- **`RoleDefinition.routing` is optional in the TypeScript type but required at runtime.** Mirrors the existing pattern for `type` (`persona?: string`, `type?: "persona" | "utility"`, both runtime-validated in `buildRoleMap`) rather than making `routing` a required TS field, which would have forced every test fixture across `generate-skills.test.ts`, `adopt.test.ts`, and `update.test.ts` to carry a dummy `routing` value even where the test has nothing to do with routing. `buildRoleMap` throws `missing or unrecognized routing` for any entry without a valid value, so the production path (`roles.json`) is fully enforced; only test literals are exempt, and only where they don't reach the routing check (verified — see `## History`).
  - → no promotion needed (encoded directly in `generate-skills.ts`; self-documenting).
- **The routing-coverage gate accepts Atlas's `## Onboarding intent routing` section as valid `auto` evidence, not just `## Routing table` rows.** Atlas has always routed via a dedicated onboarding-intent clause rather than a table row (a one-time setup flow, not a conversational-intent row parallel to the others) — Winston's task 4 enumeration of missing table rows correctly excluded Atlas for this reason. The gate's "exactly once" check for `auto` ids sums occurrences across both the routing table and the onboarding section, so it accepts this legitimate exception without opening the door to duplicate rows elsewhere.
  - → no promotion needed (encoded directly in `routing-coverage.test.ts`; self-documenting).
- **`skills-ecosystem.md`'s roster gained a Lilac (`prism-standup-summary`) row beyond the 9 business personas task 6 named.** The routing-coverage gate's assertion (e) — "every persona in `roles.json` appears in `skills-ecosystem.md`" — is unscoped by design (it mirrors AC-5, not the narrower task-6 enumeration), and Lilac was a pre-existing gap the gate caught on first run. Added Lilac to the Ticket-flow personas table (she operates on ticket/PR data like Reese and Eric, not business-strategy grain or a cadence/ceremony trigger).
  - → no promotion needed (the fix is the roster row itself; nothing further to codify).
- **`crossref-lint.ts`'s `CROSSREF_FILE_ALLOWLIST` gained one entry** (`.prism/architect/_toolkit/skills-ecosystem.md::.prism/business/strategy.md`) for the same reason the existing four pairs are there: `.prism/business/strategy.md` is a lazy artifact (Vera creates it on first write; never seeded in the monorepo tree), and the new Business personas section references it in prose the same way `business-layer.md` and the business-strategy template already do.
  - → no promotion needed (allowlist entry is the durable record; pattern already established).

---

## Sessions

- 2026-07-20 [huntermcgrew/prism-416-skill-routing-completeness] open: Intent — file the ticket, create the branch, and seed the plan for Winston's ratified Lane 1 routing-completeness work; Bounds — ticket setup only, no code changes, no touching lane 2 or the branch-plan-slim follow-up; Approach — transpose Winston's already-detailed tasks and AC verbatim, record the ratified routing-policy table as a Decision. · close: scope held
- 2026-07-20 [huntermcgrew/prism-416-skill-routing-completeness] open: Intent — implement Winston's Lane 1 routing-completeness tasks 2-8 (routing field, rule rewrites, seed-twin sync, ecosystem roster, parity gate); Bounds — tasks 2-8 only, no lane 2, no prism-prd BOM fix, no auto-picking the flagged Parker/skills-ecosystem.md tension without recording the reasoning; Approach — execute tasks in order, verify with the named commands after each content change. · close: scope held — touched two files outside the named task list (`crossref-lint.ts` allowlist, three test fixtures needing a `routing` value) but both were direct, necessary consequences of tasks 3 and 6, not independent scope; documented as Decisions. Found and flagged (not fixed) a real out-of-scope gap in `migrate-skill.ts`'s roles.json writer.

---

## History

- 2026-07-20 [huntermcgrew/prism-416-skill-routing-completeness]: Nora created the ticket (#416), branched from `origin/main`, and seeded this plan from Winston's ratified architecture evaluation.
- 2026-07-20 [huntermcgrew/prism-416-skill-routing-completeness]: Implemented tasks 2-8 — added `routing` to all 31 `roles.json` entries, extended `buildRoleMap` validation, rewrote `skill-routing.md` (canonical + seed twin, closing the Linear-literal drift), added a Business personas roster and Lilac's row to `skills-ecosystem.md`, and added `routing-coverage.test.ts`. Fixed three test fixtures (`generate-skills.test.ts`, `adopt.test.ts`, `update.test.ts`) that needed a `routing` value once `buildRoleMap` started enforcing it, and one `crossref-lint.ts` allowlist entry for the new business-layer prose reference. `pnpm prism:check` green; mutation test confirmed the gate fails naming an unrouted id.

---

## Debugged Issues

None yet.

---

## Review Issues

None yet.

---

## Acceptance Criteria

### Behavioral

- [ ] Given a persona entry is added to `roles.json` without a matching `skill-routing.md` edit, When `pnpm prism:test` runs, Then the routing-coverage gate fails naming the unrouted id. (REQ-1)
  - Evidence: `machine` — mutation run: add a dummy entry, observe named failure, revert.
- [ ] Given the shipped rule, When every `routing: "auto"` entry in `roles.json` is checked against the routing table, Then each appears exactly once, and every `named-only` persona and utility appears in its dedicated section. (REQ-1)
  - Evidence: `machine` — `routing-coverage.test.ts` green on `main`.
- [ ] Given the install seed twin, When the same assertions run against `templates/install/.prism/rules/skill-routing.md`, Then they pass, and the twin contains no "Linear" literal and no bare `ADR-NNNN`. (REQ-1)
  - Evidence: `machine` — gate + `grep -c "Linear" == 0` + install-adr-gate green.
- [ ] Given a fresh session in this repo after `pnpm prism:build`, When the always-on rules load, Then the routing surface presents a route (auto row or named-invocation entry) for every installed persona and utility. (US: consumer onboarding evidence)
  - Evidence: `human` — cold-session spot check: ask for market-research work, observe Kora routed; ask "what's stale", observe Zoe reachable by name.
- [ ] Given `skills-ecosystem.md`, When compared against `roles.json`, Then every registered persona appears in the roster. (REQ-1)
  - Evidence: `machine` — roster assertion in the same gate.

### Non-behavioral

None beyond the above.

### AC Adjustments

None yet.

### AC Sync Log

| Date | Agent | Action | Plan | Ticket |
| ---- | ----- | ------ | ---- | ------ |
| 2026-07-20 | Nora | Seeded AC from Winston's ratified evaluation | synced | synced |

---

## Cleanup Items

None yet.

---

## PR Readiness

- [ ] No critical or major issues
- [ ] Types correct — no `any`, no unsafe `as`
- [ ] No stray console.logs or debug artifacts
- [ ] Tests written for new logic and edge cases
- [ ] All debugged issues resolved (no `open` entries)
- [ ] Build passes — last run: not yet run
- [ ] PR description up to date
- [ ] Lasting decisions promoted to architect context (if applicable)

**Last updated:** 2026-07-20
