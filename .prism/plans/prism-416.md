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

### Clove (review fixes — Winston adjudication, 2026-07-20)

9. **Restructure the Sol paragraph for parseability** (blocks task 10): in `.prism/rules/skill-routing.md` and `templates/install/.prism/rules/skill-routing.md`, move the `**Sol is a persona, not a utility.**` paragraph out of `## Utility skills` into its own `## Sol is a persona, not a utility` section immediately after `## Utility skills`. Content unchanged; no heading removed. Regenerate mirrors via `pnpm prism:build`.
10. **Add both-direction exclusivity to `scripts/ai-skills/routing-coverage.test.ts`** (after task 9): in `assertRoutingRuleAgreesWithRoles`, for `routing === "auto"` assert 0 occurrences of the id in the Named-invocation + Utility scopes; for `named-only` assert 0 occurrences in the routing-table + onboarding scopes. Reuse `extractBacktickedSkillIds` — no new parsing. Verify with Eric's two mutations (add a `prism-retro` table row; add a `prism-code-dev` Named-invocation bullet) — both must red, then revert.
11. **migrate-skill fold-in:** in `scripts/ai-skills/migrate-skill.ts` (`newRolesEntry`, ~line 572), both shapes gain `routing: "named-only"`; key order `id`, `persona`/`type`, `routing`. Update `.ai-skills/skills/prism-skill-forge/shared.md` Step 4's two documented entry shapes to match, plus one sentence: personas flip to `"auto"` only when the same change adds the routing-table row (the routing-coverage gate enforces the pairing). Verify: emitted entry passes `buildRoleMap`; `pnpm prism:check` green.
12. **Triggers clauses for Named-invocation bullets:** in both rule files, append a `Triggers:` clause to each of the four bullets with 2–3 phrases curated from that skill's frontmatter (e.g. Zoe: "weekly audit", "what's stale"; Iris: "retro this epic", "post-mortem"). Curate, don't paste, per task 4's bar.
13. **Qualify colliding signal phrases** in both rule files' routing tables: Kora → "ICP research"; Quinn → "ICP qualification"; Vera drops "positioning" (her mission/OKRs/strategy signals are unambiguous); Charlie keeps bare "positioning" (a bare positioning ask is a marketing ask by default). Verify: `pnpm prism:check` green.

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
- **Winston adjudication of Eric's PR #420 review (2026-07-20): fix-pass-with-plan-amendment.** Eric's `needs-replan` verdict is over-called — his own findings confirm the validate-don't-generate approach, the two-value enum, and the gate pattern all stand; every finding is an implementation fix plus the plan amendments below. Routed to Clove (tasks 9–13).
  - **Exclusivity assertion (Eric Major 1) — correct in both directions, at the membership level.** The `auto`/`named-only` enum is mutually exclusive by construction and the rule's sections are its rendered form, so a persona appearing in both scopes is exactly the registry-vs-prose disagreement this lane exists to eliminate. No legitimate dual-scope case exists: `auto` already implies name-routing via skill frontmatter, so the Named-invocation section grants an `auto` persona nothing — a dual listing is always drift, never intent.
  - **Assertion shape:** symmetric to the existing positive checks, same `extractBacktickedSkillIds` scopes, no new parsing — each `auto` id occurs 0 times in the Named-invocation + Utility scopes; each `named-only` id occurs 0 times in the routing-table + onboarding scopes. Run against canonical and seed twin.
  - **Required doc restructure first:** the Utility section's "Sol is a persona, not a utility" paragraph contains backticked `prism-conductor` (an `auto` id) and would falsely red a strict assertion. Per this lane's own tripwire — restructure the rule for parseability rather than harden the parser — that paragraph is promoted to its own `##`-level section, moving it outside all four extraction scopes. Adds a heading, removes none; the issue-302 citation contract (existing headings verbatim) holds.
  - **migrate-skill default (Eric Major 2): `named-only` confirmed, reasoning corrected.** Eric's tree-green argument doesn't hold — a freshly scaffolded persona reds the gate under *either* value until the rule gains its table row or bullet, and that is the gate doing its job. The actual ground: ambient-intent routing must be an affirmative decision (membership-by-omission is this lane's root-cause failure class), so the scaffold floor is `named-only`; the author flips to `auto` by adding the routing-table row, and the gate enforces that the flip and the row land together. For utilities `named-only` is definitional per the ratified policy. Skill-forge implies no different answer — but its `shared.md` Step 4 documents the same `routing`-less entry shapes, so the fold-in covers both the script writer and the documented shapes.
  - **Phrase-uniqueness assertion (Eric Minor 2, optional half): out of scope.** The gate's charter is registry↔rule set parity; phrase-collision detection means quoted-phrase extraction from a curated prose column — the parser growth the tripwire counsels against. The two observed collisions are paste artifacts, fixed by qualification (task 13). If a third collision lands, that recurrence is the evidence a dedicated assertion earns its place — file it then.
  - **Eric Minor 1 (Triggers clauses): in scope as proposed** — once each Named-invocation bullet carries curated trigger phrases, AC-4's probe tests this rule rather than skill frontmatter. No AC text change needed.
  - → no promotion needed (review adjudication; the amended tasks and the gate itself are the durable record).
- **Review-fix: install seed twin of `skills-ecosystem.md` synced with the Business personas section, Lilac's Ticket-flow row, and the three-axes-to-four-axes rewrite** (Briar's Major finding). Content copied verbatim from canonical since none of the new prose contained org/repo tokens, "Linear," or bare `ADR-NNNN` refs needing genericization; the four-axes intro paragraph follows the seed's established pattern of stripping ADR-citation clauses (matches how the seed already omits them for the cadence/orchestration axes). The new Business personas section references `.prism/business/strategy.md`, so `crossref-lint.ts`'s `CROSSREF_FILE_ALLOWLIST` gained the paired `templates/install/...` entry alongside the canonical one added under task 6 — same lazy-artifact reasoning, completing the pairing pattern the other four allowlist entries already follow. `routing-coverage.test.ts`'s roster assertion was split into a helper (`assertEcosystemRosterAgreesWithRoles`) run against both the canonical and seed-twin paths, mirroring how the first two tests already parity-check both surfaces — mutation-tested by swapping `**Lilac**` for `**NotLilac**` in the seed twin and confirming the new test reds, then reverted.
  - → no promotion needed (fix restores parity with an already-established pattern; nothing new to codify).

---

## Sessions

- 2026-07-20 [huntermcgrew/prism-416-skill-routing-completeness] open: Intent — file the ticket, create the branch, and seed the plan for Winston's ratified Lane 1 routing-completeness work; Bounds — ticket setup only, no code changes, no touching lane 2 or the branch-plan-slim follow-up; Approach — transpose Winston's already-detailed tasks and AC verbatim, record the ratified routing-policy table as a Decision. · close: scope held
- 2026-07-20 [huntermcgrew/prism-416-skill-routing-completeness] open: Intent — implement Winston's Lane 1 routing-completeness tasks 2-8 (routing field, rule rewrites, seed-twin sync, ecosystem roster, parity gate); Bounds — tasks 2-8 only, no lane 2, no prism-prd BOM fix, no auto-picking the flagged Parker/skills-ecosystem.md tension without recording the reasoning; Approach — execute tasks in order, verify with the named commands after each content change. · close: scope held — touched two files outside the named task list (`crossref-lint.ts` allowlist, three test fixtures needing a `routing` value) but both were direct, necessary consequences of tasks 3 and 6, not independent scope; documented as Decisions. Found and flagged (not fixed) a real out-of-scope gap in `migrate-skill.ts`'s roles.json writer.
- 2026-07-20 [huntermcgrew/prism-416-skill-routing-completeness] open: Intent — fix Briar's one Major self-review finding (install seed twin of `skills-ecosystem.md` never synced with the Business personas section/Lilac row/four-axes rewrite); Bounds — that finding only, no scope expansion, no issue #418, review fix as a separate commit; Approach — sync the seed twin following its established curation pattern, extend the roster gate to check it, verify with `pnpm run prism:check`. · close: scope held — one incidental `crossref-lint.ts` allowlist entry needed to keep the new seed-twin content resolvable, same pairing pattern the plan already documents for the canonical entry.
- 2026-07-20 [huntermcgrew/prism-416-skill-routing-completeness] open: Intent — adjudicate Eric's PR #420 review verdict (enum said needs-replan, prose said implementation fixes) and rule per finding; Bounds — plan writes only, no code, no relitigating verified-sound findings; Approach — independently verify each Major against the branch tree (gate source, migrate-skill writer, rule sections), then rule fix-pass / amend / replan per finding. · close: scope held — ruled fix-pass-with-plan-amendment; found one surface Eric missed (skill-forge shared.md Step 4 entry shapes) and folded it into task 11.
- 2026-07-20 [huntermcgrew/prism-416-skill-routing-completeness] open: Intent — execute Winston's review-fix tasks 9–13 exactly as specified (both-direction exclusivity assertion, Sol-paragraph restructure, migrate-skill `routing` fold-in incl. skill-forge Step 4, Triggers clauses, phrase de-collision); Bounds — tasks 9–13 only, no other lanes, no amending prior commits, one separate commit; Approach — execute in task order, verify incrementally with `pnpm prism:check-types`/`pnpm prism:test`, `pnpm prism:build` to regenerate mirrors, mutation-test the new exclusivity assertion both directions, then `pnpm prism:check` full gate. · close: scope held — all five tasks completed exactly as ruled; both mutations (named-only id given a table row, auto id given a Named-invocation bullet) reproduced the expected red with the intended assertion message, then reverted clean; `pnpm prism:check` green after `pnpm prism:build` regenerated all mirrors + AGENTS.md.

---

## History

- 2026-07-20 [huntermcgrew/prism-416-skill-routing-completeness]: Nora created the ticket (#416), branched from `origin/main`, and seeded this plan from Winston's ratified architecture evaluation.
- 2026-07-20 [huntermcgrew/prism-416-skill-routing-completeness]: Implemented tasks 2-8 — added `routing` to all 31 `roles.json` entries, extended `buildRoleMap` validation, rewrote `skill-routing.md` (canonical + seed twin, closing the Linear-literal drift), added a Business personas roster and Lilac's row to `skills-ecosystem.md`, and added `routing-coverage.test.ts`. Fixed three test fixtures (`generate-skills.test.ts`, `adopt.test.ts`, `update.test.ts`) that needed a `routing` value once `buildRoleMap` started enforcing it, and one `crossref-lint.ts` allowlist entry for the new business-layer prose reference. `pnpm prism:check` green; mutation test confirmed the gate fails naming an unrouted id.
- 2026-07-20 [huntermcgrew/prism-416-skill-routing-completeness]: Winston adjudicated Eric's PR #420 review — fix-pass-with-plan-amendment; added review-fix tasks 9–13 (both-direction exclusivity + Sol-paragraph restructure, migrate-skill `routing` fold-in incl. skill-forge Step 4, Triggers clauses, phrase de-collision); see Decisions.
- 2026-07-20 [huntermcgrew/prism-416-skill-routing-completeness]: Fixed Briar's Major review finding — synced the install seed twin of `skills-ecosystem.md` with the Business personas section, Lilac's row, and the four-axes rewrite; extended `routing-coverage.test.ts`'s roster assertion to also check the seed twin; added the paired `crossref-lint.ts` allowlist entry the new seed-twin content needs. `pnpm prism:check` green; mutation-tested the new seed-twin assertion (swap Lilac's name, observe red, revert).
- 2026-07-20 [huntermcgrew/prism-416-skill-routing-completeness]: Executed Winston's review-fix tasks 9–13 (both files, canonical + seed twin) — promoted the Sol paragraph to its own `## Sol is a persona, not a utility` section; added the both-direction exclusivity assertion to `routing-coverage.test.ts`; folded `routing: "named-only"` into `migrate-skill.ts`'s writer and `prism-skill-forge/shared.md` Step 4's two entry shapes; added `Triggers:` clauses to the four Named-invocation bullets; qualified Kora → "ICP research" and Quinn → "ICP qualification", dropped "positioning" from Vera. `pnpm prism:build` regenerated all mirrors + AGENTS.md; `pnpm prism:check` green; mutation-tested the exclusivity assertion in both directions (reverted clean).

---

## Debugged Issues

None yet.

---

## Review Issues

### Install seed twin of `skills-ecosystem.md` was not synced with the Business personas section

- **Severity:** `major`
- **Status:** `fixed`
- **File:** `templates/install/.prism/architect/_toolkit/skills-ecosystem.md`
- **Problem:** Task 6 added the `### Business personas` section (9 rows), Lilac's ticket-flow row, and the "three axes" → "four axes" rewrite to the canonical `.prism/architect/_toolkit/skills-ecosystem.md` and its generated mirrors (`.claude`, `.codex`, `.cursor`), but never to the curated install seed twin at `templates/install/.prism/architect/_toolkit/skills-ecosystem.md`. Verified on the branch: the seed twin still reads "three axes," has zero occurrences of "Business personas," and zero occurrences of "Lilac." `skills-ecosystem.md` is listed as `curated` in `seed-curation.json` (same class as `skill-routing.md` before this PR) — `pnpm prism:build`'s seed-drift check only verifies curated files *exist*, never their content, so nothing catches this silently. `routing-coverage.test.ts`'s third assertion ("skills-ecosystem.md roster includes every persona in roles.json") only reads the canonical path (`.prism/architect/_toolkit/skills-ecosystem.md`), not the seed twin — unlike assertions (a)-(c), which the test explicitly re-runs against both files. Net effect: a fresh consumer running `npx @huntermcgrew/prism adopt` gets a roster doc — the file every skill session loads via the `"**"` manifest wildcard — that has never heard of Vera, Kora, Ellis, Charlie, Quinn, Tess, Remy, Penny, Lex, or Lilac, even though that same consumer's `skill-routing.md` seed twin (which *was* synced, per task 5) will bare-agent-route all of them. This is exactly defect instance 4 from `eval-routing-and-rule-load.md`'s own root-cause framing ("`skills-ecosystem.md` roster vs. `roles.json` — 9 personas behind") — fixed for canonical, left open for the seed twin that new consumers actually receive.
- **Suggested fix:** Sync `templates/install/.prism/architect/_toolkit/skills-ecosystem.md` to canonical's new content the same way task 5 synced `skill-routing.md`'s seed twin (genericized/tokenized per the file's existing curation pattern — org/repo tokens, "tracker" not "Linear", no bare `ADR-NNNN`). Then extend `routing-coverage.test.ts`'s third test to also assert against the seed twin path, mirroring how the first two tests already do — otherwise this same gap can silently reopen on the next roster change.

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

- [x] No critical or major issues — Briar's Major fixed (install seed twin of `skills-ecosystem.md` now synced); Eric's two PR #420 Majors fixed via tasks 9–11 (see `## Decisions` and `## History`)
- [x] Types correct — no `any`, no unsafe `as`
- [x] No stray console.logs or debug artifacts
- [x] Tests written for new logic and edge cases — `routing-coverage.test.ts`, independently mutation-tested in both directions (unrouted persona, ghost route, seed-twin roster gap, and now the both-direction exclusivity assertion) across review and review-fix passes
- [x] All debugged issues resolved (no `open` entries)
- [x] Build passes — last run: 2026-07-20 (`pnpm run prism:check` green after tasks 9–13, `pnpm prism:build` regenerated all mirrors + AGENTS.md)
- [x] PR description up to date — synced to reflect tasks 9–13 scope
- [x] Lasting decisions promoted to architect context (if applicable) — n/a, all Decisions carry `no promotion needed` verdicts

**Last updated:** 2026-07-20
