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

---

## Sessions

- 2026-07-20 [huntermcgrew/prism-416-skill-routing-completeness] open: Intent — file the ticket, create the branch, and seed the plan for Winston's ratified Lane 1 routing-completeness work; Bounds — ticket setup only, no code changes, no touching lane 2 or the branch-plan-slim follow-up; Approach — transpose Winston's already-detailed tasks and AC verbatim, record the ratified routing-policy table as a Decision. · close: scope held

---

## History

- 2026-07-20 [huntermcgrew/prism-416-skill-routing-completeness]: Nora created the ticket (#416), branched from `origin/main`, and seeded this plan from Winston's ratified architecture evaluation.

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
