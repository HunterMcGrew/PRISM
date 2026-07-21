# Plan: followup-429-linear-literals

## Ticket

[#429 — templates/install/ seed twins still carry hardcoded Linear literals](https://github.com/HunterMcGrew/PRISM/issues/429)

## Goal

Remove hardcoded `Linear` literals from the install surface that consumers receive verbatim in the npm tarball, and add a build guard so the class cannot silently return.

---

## Design

None — content sweep plus one build-guard pattern. No UI.

---

## Implementation Tasks

Sequence matters: tasks 1–4 (seed twins) are independent of each other and can land in any order; tasks 5–7 (canonical + mirror) must precede task 8's build run; tasks 9–11 (guard) must come last, because the guard is the verification instrument for everything above.

### Clove (implementation)

**Group A — curated seed twins that fell behind canonical.** These four files are listed in `.ai-skills/definitions/seed-curation.json` under `"curated"`, so `prism:build` never writes them; it only checks that they *exist*. Canonical is already tracker-neutral for every line below. Hand-edit the seed file only — do **not** copy canonical wholesale, because each of these seed twins also carries deliberate curation edits (stripped ADR cross-references, PRISM-self-references removed) that must survive.

1. **`templates/install/.prism/architect/_toolkit/skills-ecosystem.md` — replace 15 `Linear` literals with canonical's wording.** For each line, take the replacement text verbatim from the same line in `.prism/architect/_toolkit/skills-ecosystem.md`, changing only the `Linear` phrase and leaving the rest of the seed line as-is:
   - L25 (Nora row): `Fetches Linear tickets` → `Fetches tickets`; `All Linear writes pass` → `All ticket-tracker writes pass`.
   - L35 (Reese row): `based on prompt words, input shape, and Linear labels` → `…and ticket labels`.
   - L73 (Sol row): `never code, Linear, or merges` → `never code, tracker writes, or merges`.
   - L96: `check Linear labels first` → `check the ticket's labels first`.
   - L123: `syncs AC to Linear` → `syncs AC to the tracker`.
   - L125: `syncs AC to Linear if adjusted` → `syncs AC to the tracker if adjusted`.
   - L126: `syncs AC to Linear if updated` → `syncs AC to the tracker if updated`.
   - L127: `rooted in the Linear bug report` → `rooted in the ticket's bug report`.
   - L216 (plan-section ownership table): `` `## Acceptance Criteria` → Linear `` → `` `## Acceptance Criteria` → tracker ``.
   - L297: `Updates the Linear ticket description` → `Updates the ticket description`.
   - L300: `**Linear sync** — opt-in: Sasha asks whether to post the bug report to Linear.` → `**Ticket sync** — opt-in: Sasha asks whether to post the bug report to the tracker.`
   - L301: `syncs AC to Linear if adjusted` → `syncs AC to the tracker if adjusted`.
   - L302: `syncs AC to Linear if updated` → `syncs AC to the tracker if updated`.
   - L333 (rule 9): `synced to Linear` → `synced to the ticket tracker`; `in the Linear description` → `in the ticket description`; `sync AC to Linear whenever it changes` → `sync AC to the tracker whenever it changes`.
   - L339 (rule 15): `parallel to rule 9's AC-to-Linear sync pattern` → `parallel to rule 9's AC-to-tracker sync pattern`.
   - Verify: `grep -c Linear templates/install/.prism/architect/_toolkit/skills-ecosystem.md` returns `0`.

2. **`templates/install/.prism/references/architect/plan-mode.md` — replace 5 `Linear` literals.** Canonical `.prism/references/architect/plan-mode.md` carries the neutral wording at the same steps:
   - L87 heading: `**Sync AC to Linear** — after writing AC to the plan, automatically push it to the Linear ticket:` → `**Sync AC to the ticket tracker** — after writing AC to the plan, automatically push it to the ticket:`.
   - L93: `Synced AC to Linear ticket ${TICKET_PREFIX}-NNNN` → `Synced AC to ticket ${TICKET_PREFIX}-NNNN`.
   - L95: `(If the team doesn't use Linear, skip the push and record AC in the plan only.)` → `If the team's tracker doesn't support AC push, record AC in the plan only.`
   - L119: `Recommend creating separate Linear tickets for each story (via Nora)` → `Recommend creating separate tickets for each story (via Nora)`.
   - L120: `If no parent ticket exists in Linear` → `If no parent ticket exists in the tracker`.
   - Do not re-add the ADR cross-references canonical carries at L9/L36/L38/L45/L50/L106/L134 — the seed strips them on purpose and `pnpm prism:crossref-lint` fails the build if they come back.
   - Verify: `grep -c Linear templates/install/.prism/references/architect/plan-mode.md` returns `0`.

3. **`templates/install/.prism/rules/branch-plan.md` — replace 5 `Linear` literals.** Canonical `.prism/rules/branch-plan.md` carries the neutral wording:
   - L28: `prefer creating a parent ticket in Linear` → `prefer creating a parent ticket in the tracker`.
   - L231 (plan template `## Ticket` placeholder): `<Linear ticket URL or reference — optional>` → `<Ticket URL or reference — optional>`.
   - L362 (Debugged Issues schema field): `- **Linear:** \`synced\` | \`not synced\` | \`N/A\`` → `- **Ticket:** …`.
   - L400 (AC Sync Log table header): `| Date | Agent | Action | Plan | Linear |` → `| Date | Agent | Action | Plan | Ticket |`.
   - L403 (HTML comment under the table): `"Linear" = synced/pending/—` → `"Ticket" = synced/pending/—`.
   - Verify: `grep -c Linear templates/install/.prism/rules/branch-plan.md` returns `0`.

4. **`templates/install/.prism/architect/_toolkit/qa-test-planning.md` — replace 1 `Linear` literal.** L157, Output Shapes table, **Feature / PR** row: `Inline ${TICKET_PREFIX}-\* with Linear AC if present` → `Inline ${TICKET_PREFIX}-\* with ticket AC if present` (matches canonical L163). Verify: `grep -c Linear templates/install/.prism/architect/_toolkit/qa-test-planning.md` returns `0`.

**Group B — canonical carries the literal too.** These three seed files are byte-identical mirrors of canonical (not curated), so `prism:build` overwrites any hand-edit to the seed. Edit **canonical** and let the build re-mirror.

5. **`.prism/rules/writing-voice.md` L109 — genericize the count-rule example.** Change `"every persona that operates on a Linear ticket loads this rule"` to `"every persona that operates on a ticket in the team's tracker loads this rule"`. This rule ships to consumers and the sentence is an illustrative example, not a Linear fact.

6. **`.prism/references/pixel/pattern-vocabulary.md` L76 — rewrite the easing bullet to remove the capital-`Linear` false positive.** Current text ends `ease-in for exits. Linear for progress indicators only.` Change the final sentence to `Use linear easing for progress indicators only.` This is the CSS timing function, not the tracker — lowercasing it keeps the meaning and stops the guard added in task 9 from tripping on a file that has nothing to do with ticketing.

7. **`.prism/references/debugger/closeout.md` L38 — genericize the comment-API example.** Change `Post it as a ticket comment (via the tracker's comment API — \`save_comment\` on Linear).` to `Post it as a ticket comment (via the tracker's comment API — e.g. \`save_comment\`).` The sentence already frames the tracker generically; the trailing `on Linear` is the only tracker-specific token.

**Group C — hand-maintained loose file.**

8. **`templates/install/AGENTS.md.tmpl` L33 — drop `Linear` from the ticket-start routing row.** Change `shares a Linear ticket ID` to `shares a ticket ID`, matching canonical `.prism/rules/skill-routing.md` L21. This file is hand-maintained — no script writes it (confirmed: `scripts/ai-skills/*.ts` references it only from `crossref-lint.ts`). Note that the seed literal guard in task 9 scans `templates/install/.prism` only, so this file is not covered by it; the sweep here is manual and the gap is recorded in `## Decisions`.

**Group D — the guard (do last; it is the verification instrument for tasks 1–8).**

9. **`scripts/ai-skills/literal-guard.ts` — add `Linear` to `SEED_DOGFOODING_PATTERN`.** The constant is at roughly L46. Add `|\bLinear\b` to the alternation so it reads `/(Thrive|tractru|TracTru\/thrive|THR-[0-9A-Z#*\\]+|thrive\.[a-zA-Z]+|PRISM-[0-9]+|de-thriving|\bLinear\b)/`. Use the word boundary and keep the regex case-sensitive so `linear` (CSS easing, "linear time") does not match. Update the constant's JSDoc: the existing block already explains why `Sol`/`Iris`/`ADR-NNNN` are deliberately absent — add one sentence saying `Linear` is included because the install seed must stay tracker-neutral, with legitimately-Linear files carried on the allowlist. `SEED_DOGFOODING_PATTERN` is used only by `runConsumerSeedLiteralGuard`, so the blast radius is the seed scan alone — `runLiteralGuard` and `runLeftoverTokenGuard` are unaffected.

10. **`.ai-skills/definitions/literal-allowlist.json` — add the three legitimately-Linear seed files.** Append to the `files` array, matching the existing `{ "path", "reason" }` shape. Paths are repo-root-relative prefixes (the guard computes `relativePath` from `repoRoot`):
    - `templates/install/.prism/references/operational-gotchas.md` — reason: `Linear MCP sanitizer gotchas are tracker-specific facts, useful verbatim to Linear consumers`.
    - `templates/install/.prism/references/onboarding/question-flow.md` — reason: `the onboarding question offers Linear as one of the supported ticket systems`.
    - `templates/install/.prism/architect/onboarding.md` — reason: `documents the Linear team-key gate that only fires for Linear installs`.
    Before writing the entries, run `pnpm prism:build` once after task 9 and copy the paths verbatim out of the `seed-literal-guard:` error lines — the guard prints the exact `relativePath` form it matches on, which removes any guesswork about separators or prefixes.

11. **`scripts/ai-skills/literal-guard.test.ts` — add one seed-guard test.** Follow the shape of the existing `test("seed literal guard flags a PRISM ticket reference", …)` at roughly L112. Add `test("seed literal guard flags a hardcoded Linear literal", …)` asserting one violation on a seed file whose body contains `Synced AC to Linear ticket`, and extend the existing `test("seed literal guard allows legitimate framework references (Sol, Iris, ADR-NNNN)", …)` fixture body with the string `linear easing for progress indicators` to lock in the lowercase-passes behavior. Verify: `pnpm prism:test`.

**Group E — build, mirrors, and bundle.**

12. **Regenerate mirrors — never hand-edit them.** Run `pnpm prism:build`. It re-mirrors tasks 5–7's canonical edits into `templates/install/.prism/` and into the `.claude/` / `.codex/` / `.cursor/` platform copies, and rewrites the tier-1 rule block inside `AGENTS.md` (task 5 edits `writing-voice.md`, which is a tier-1 always-on rule). Every generated mirror is produced by `pnpm prism:build` and is never hand-edited — if a mirror looks wrong, fix the canonical source and re-run the build. Expect a second `pnpm prism:build` to produce no git diff (the write path is idempotent).

13. **Rebuild the tracked CLI bundle.** `dist/cli.js` is git-tracked and bundles `literal-guard.ts` (reached via `scripts/ai-skills/update.ts` → `runLeftoverTokenGuard`), so task 9's edit changes it. Run `pnpm prism:bundle`, then `git status -s dist/cli.js`; if it changed, commit it with the rest of the PR — leaving it stale would ship a `dist/` that disagrees with source, which is the exact drift class this ticket is closing.

14. **Full verification gate.** Run `pnpm prism:check` (build check + types + tests + manifest verify + crossref lint + pack parity). It must exit 0. Then confirm the sweep's done condition directly: `grep -rn '\bLinear\b' templates/install/ | grep -v -e operational-gotchas.md -e question-flow.md -e architect/onboarding.md` returns nothing.

### Eli (documentation)

None. The sweep changes agent-facing spec prose, not user-facing feature docs, and adds no new capability a doc would describe.

---

## Decisions

- **Scope is the four curated seed twins, not the eleven files the issue names.** The issue counts every file under `templates/install/` containing the string `Linear`. Verified against the tree: eleven files match, but seven of them are byte-identical with their canonical source, which means they are auto-mirrored by `prism:build` and their `Linear` literals are either legitimate (the onboarding question that *offers* Linear; the Linear MCP sanitizer gotchas), a false positive (CSS `Linear` easing in `pattern-vocabulary.md`), or a canonical-side wording nit — not seed-twin drift. Exactly four files carry the drift the issue describes, and all four appear in `seed-curation.json`'s `"curated"` list: `rules/branch-plan.md`, `references/architect/plan-mode.md`, `architect/_toolkit/qa-test-planning.md`, `architect/_toolkit/skills-ecosystem.md`.
  - **Root cause:** canonical was neutralized to tracker-agnostic wording after these four seeds were curated. Curated files are exempt from `checkSeedDrift`'s byte comparison — the build only asserts they exist — so they never caught up and no gate noticed.
  - **Alternatives considered:** (a) sweep all eleven files to zero `Linear`; (b) sweep only the four and leave the rest.
  - **Chosen approach:** sweep the four as seed-twin drift, fix three canonical-side wording nits separately (tasks 5–7), and allowlist the three files where `Linear` is a true statement about a supported tracker. Blanket-genericizing the operational-gotchas file would delete real, useful, Linear-specific guidance from Linear consumers to satisfy a string count.
  - **Implementation guidance:** the seed twins carry deliberate curation edits beyond the Linear wording (ADR cross-references stripped to satisfy the install-adr-gate in `crossref-lint.ts`, PRISM-self-references removed). Copy canonical's replacement *phrase*, not canonical's *line*.
- **Add `Linear` to the existing seed literal guard rather than leaving the done condition to a one-time eyeball.** `runConsumerSeedLiteralGuard` already scans `templates/install/.prism` on every `prism:build` and already has an allowlist with per-file reasons. Extending its pattern is roughly fifteen lines and converts the acceptance criterion from "someone grepped once" into a permanent CI gate. Considered and rejected: leaving the guard out to keep the ticket purely mechanical — rejected because a sweep with no gate re-rots the next time canonical moves and a curated seed doesn't follow, which is precisely how this ticket came to exist.
- **The guard change does not touch the parked staleness-signal question.** That question is whether *byte-parity* is the right drift signal for curated seeds, given they diverge from canonical by design. The literal guard is content-based, not parity-based: it asserts a property of the seed's own text without any reference to canonical. Adding a forbidden literal neither answers nor forecloses the parity question.
- **The literal guard's scope stops at `templates/install/.prism`, so `AGENTS.md.tmpl` is swept by hand.** `build.ts` calls `runConsumerSeedLiteralGuard(repoRoot, templatesContentRoot)` with the `.prism` subtree only; the guard's scan engine walks directory roots, so adding a single loose file is not a one-line change. Widening it is real follow-up work, not part of this sweep — recorded as a signal.
- **`pattern-vocabulary.md` is fixed by lowercasing, not by allowlisting.** `Linear for progress indicators only` is the CSS timing function. Allowlisting the whole file would exempt it from every future tracker-literal check for a reason that has nothing to do with ticketing; `Use linear easing for progress indicators only` reads better and removes the collision at the source.
- **Every generated mirror is regenerated with `pnpm prism:build` and never hand-edited.** This sweep touches a tier-1 rule (`writing-voice.md`), two `references/` files, and a bundled script, so the build regenerates `templates/install/.prism/` mirrors for the non-curated files, the `.claude/` / `.codex/` / `.cursor/` platform copies, and the tier-1 block inside `AGENTS.md`. `dist/cli.js` is tracked and is regenerated with `pnpm prism:bundle`.

---

## Sessions

- 2026-07-21 [main] open: Intent — plan the tracker-neutral sweep of the install surface before the 0.8.0 publish; Bounds — write this plan file only, no code, no branch, no tracker writes, parked staleness question stays parked; Approach — verify the issue's file inventory against the tree, split by mirror class, add the existing seed guard as the recurrence gate · close: scope held
- 2026-07-21 [huntermcgrew/prism-429-linear-literals] open: Intent — implement all 14 plan tasks (sweep the four curated seed twins, fix three canonical nits, extend the literal guard, allowlist the three legitimate-Linear files, regenerate mirrors and bundle); Bounds — plan's task list only, no touch to `checkSeedDrift`/`seed-curation.json`; Approach — follow task sequence A→E exactly, verify each group's grep before moving on · close: scope held — all 14 tasks landed as specified, `pnpm prism:check` exits 0, AC-7 (parked staleness question) confirmed untouched
- 2026-07-21 [huntermcgrew/prism-429-linear-literals] open: Intent — self-review the branch for types, logic, tests, build, and mirror/seed-drift hygiene; Bounds — plan-only edits, no source changes, no PR edits; Approach — diff against `main`, verify every seed-twin edit against the plan's literal instructions, run `pnpm prism:check` plus bundle/build idempotency checks against the branch's actual commit · close: scope held — one Minor wording-drift finding recorded (skills-ecosystem.md L216 seed vs. canonical phrasing), no critical/major issues, all machine-checkable AC pass

---

## History

- 2026-07-21 [main]: Plan created — enumerated the install-surface `Linear` literals against the tree, split them into curated-seed drift / canonical-side nits / legitimate-Linear allowlist entries, and scoped the recurrence guard; see Decision: "Scope is the four curated seed twins, not the eleven files the issue names."
- 2026-07-21 [huntermcgrew/prism-429-linear-literals]: Implemented all 14 tasks — swept the four curated seed twins to zero `Linear` literals, fixed the three canonical-side nits (`writing-voice.md`, `pattern-vocabulary.md`, `closeout.md`), added `Linear` to `SEED_DOGFOODING_PATTERN`, allowlisted the three legitimate-Linear files, added the guard test pair, dropped `Linear` from `AGENTS.md.tmpl`. Regenerated mirrors (`pnpm prism:build`, idempotent on a second run) and the CLI bundle (`pnpm prism:bundle`, stable on rebuild). `pnpm prism:check` exits 0.

---

## Acceptance Criteria

### Behavioral

- [ ] **AC-1** Given a consumer installs PRISM with a non-Linear ticket tracker, When they read the installed plan rule, architect context, and plan-mode reference, Then no instruction names Linear as the tracker they must sync to.
  - Evidence (`machine`): `grep -rn '\bLinear\b' templates/install/.prism/rules/branch-plan.md templates/install/.prism/references/architect/plan-mode.md templates/install/.prism/architect/_toolkit/skills-ecosystem.md templates/install/.prism/architect/_toolkit/qa-test-planning.md templates/install/AGENTS.md.tmpl` returns no lines.
- [ ] **AC-2** Given a consumer installs PRISM and is choosing a ticket system during onboarding, When they read the onboarding questions and the tracker-specific gotchas, Then Linear is still named as a supported option and its tracker-specific guidance is intact.
  - Evidence (`human`): read `templates/install/.prism/references/onboarding/question-flow.md`, `templates/install/.prism/architect/onboarding.md`, and `templates/install/.prism/references/operational-gotchas.md` and confirm the Linear-specific content is unchanged from before the sweep.
- [ ] **AC-3** Given someone later reintroduces a hardcoded tracker name into the install seed, When the build runs, Then the build fails and names the offending file and line.
  - Evidence (`machine`): `pnpm prism:test` passes, including the new `seed literal guard flags a hardcoded Linear literal` case.

### Non-behavioral

- [ ] **AC-4** The full verification gate passes.
  - Evidence (`machine`): `pnpm prism:check` exits 0.
- [ ] **AC-5** No generated mirror is hand-edited — the build is idempotent over the final tree.
  - Evidence (`machine`): after the work is complete, `pnpm prism:build && git status -s` shows no unexpected modifications beyond what the branch already committed.
- [ ] **AC-6** The tracked CLI bundle matches source.
  - Evidence (`machine`): `pnpm prism:bundle && git status -s dist/cli.js` shows no uncommitted change.
- [ ] **AC-7** The parked question — whether curated seed twins should carry a staleness signal at all — remains unresolved and untouched by this branch.
  - Evidence (`human`): the branch diff contains no change to `checkSeedDrift`, to `seed-curation.json`'s tier assignments, or to the curated-vs-mirrored classification.

### AC Adjustments

### AC Sync Log

| Date | Agent | Action | Plan | Ticket |
| ---- | ----- | ------ | ---- | ------ |
| 2026-07-21 | Winston | Generated AC | updated | not synced (dispatch bounds: no tracker writes) |

---

## Debugged Issues

None.

---

## Review Issues

### Seed twin uses shorter phrasing than canonical for the AC-sync-target table cell

- **Severity:** `minor`
- **Status:** `open`
- **File:** `templates/install/.prism/architect/_toolkit/skills-ecosystem.md:216`
- **Problem:** The seed's plan-section-ownership row reads `` `## Acceptance Criteria` → tracker ``, but canonical (`.prism/architect/_toolkit/skills-ecosystem.md:223`, untouched by this branch) reads `` `## Acceptance Criteria` → the ticket tracker ``. Task 1's L216 bullet specified the shorter text directly, which doesn't match the general "take the replacement text verbatim from canonical's wording" instruction it sits under. Since this file is curated (build only checks it exists, never re-mirrors it), the two copies will stay out of sync on this cell indefinitely unless hand-fixed. No functional impact — AC-1's grep still passes and the meaning is unchanged.
- **Suggested fix:** change `→ tracker` to `→ the ticket tracker` on that line to match canonical exactly.

---

## Cleanup Items

None.

---

## PR Readiness

- [x] No critical or major issues
- [x] Types correct — no `any`, no unsafe `as`
- [x] No stray console.logs or debug artifacts
- [x] Tests written for new logic and edge cases (seed-guard Linear + lowercase-easing pair)
- [x] All debugged issues resolved (no `open` entries)
- [x] Build passes — last run: 2026-07-21 (`pnpm prism:check` exits 0; `prism:build` and `prism:bundle` idempotent)
- [ ] PR description up to date
- [ ] Lasting decisions promoted to architect context (if applicable — plan not yet closed)

**Last updated:** 2026-07-21
