# Plan: 417

## Ticket

https://github.com/HunterMcGrew/PRISM/issues/417

## Goal

Replace implicit rule-tier classification (Tier-1 = absence of `paths:`) with an explicit `load: always|paths|skill` frontmatter declaration and a build hard-fail on absence, plus a consumer-side seam that keeps a consumer's AGENTS.md Tier-1 block current.

---

## User Stories

Not applicable.

---

## Design

Not applicable.

---

## Implementation Tasks

Transposed verbatim from `.prism/plans/eval-routing-and-rule-load.md` § Proposed Implementation Tasks → Lane 2 — explicit load declaration. That document is the shared architecture record for this issue and its sibling, #416.

### Winston (spec)

1. **Write the ADR** (next free number in `.prism/spec/adrs/_toolkit/`): explicit `load: always|paths|skill` replaces absence-of-`paths:` as the tier discriminator; ADR-0035's model unchanged; note the amendment in ADR-0035's References.

### Clove (implementation)

2. **Add `load:` frontmatter to all canonical rules** in `.prism/rules/` and their seed twins: `load: always` for the current 21 no-`paths:` rules, `load: paths` for the 8 `paths:` rules (keep `paths:` as the data). Content-only change to the rules themselves.
3. **Rewrite the classifier:** `agents-md-block.ts` — `collectTier1RuleBodies` includes iff frontmatter declares `load: always`; **throw** (fail the build) naming the file when a canonical rule lacks a valid `load:`; delete `CODEX_INLINE_EXCLUDE` and its references (subsumed — sweep per `code-standards.md § Removal completeness`). Update `agents-md-block.test.ts` cases.
4. **Teach `rule-dialect.ts` and the platform-copy path in `build.ts`** the `load:` key: strip it from Codex copies (like `paths:` today); Cursor keeps `alwaysApply: true` derivation from `load: always`; **`load: skill` rules are excluded from all platform copies and from AGENTS inlining** — they exist only canonically. Update dialect/content-copy tests.
5. **Reclassify `pr-description.md` → `load: skill`,** and in `.ai-skills/skills/{prism-code-dev,prism-code-review-self,prism-code-review-pr,prism-architect}/shared.md`, convert each existing `pr-description.md` citation at a PR-body-authoring moment into an imperative read-trigger ("When opening or syncing a PR body, read `.prism/rules/pr-description.md` and follow it") — locate via `grep -rn "pr-description" .ai-skills/skills/*/shared.md`. Sweep dangling platform copies (they stop being generated; ensure build removes or they're cleaned).
6. **Consumer seam:** in `update.ts`, after `refreshPlatformSkills`, re-render the consumer `AGENTS.md` marker-pair block from the consumer's `.prism/rules/` via the (relocated/shared) `collectTier1RuleBodies` + `replaceTier1Block`; only when the marker pair exists — never create or restructure a consumer AGENTS.md on update. Undeclared consumer-owned rules: per the ratified default (see `## Decisions`), include as `always` and print a per-file warning naming the missing declaration. Add `update.test.ts` cases: block refreshed; markers absent → untouched; undeclared rule → warned + included.
7. **`doctor.ts`:** report every consumer rule missing `load:` with the one-line remedy.
8. **Atlas:** in `.ai-skills/skills/prism-onboarding/` (shared.md + the question-flow reference), the rule-generation step assigns `load:` per generated rule (stack-scoped rules default `paths`; single-stack framework guidance and the security baseline default `always` — confirmed with the user in the flow), and onboarding's closing build/refresh step regenerates the AGENTS block.
9. **Verify:** `pnpm prism:check` green; cold-session smoke check that `pr-description.md` no longer loads at session start and is read at the Clove shipping trigger; local mutation test — remove `load:` from one rule, observe the build fail naming it.

### Clove (review fixes — Winston adjudication, 2026-07-20)

10. **Hoist warning emission out of the AGENTS refresh:** in `scripts/ai-skills/update.ts`, scan the consumer's `.prism/rules/` once in `runUpdate` (alongside or before `refreshPlatformDirs`, which classifies the same files for platform copies) and print the per-file warnings via the existing `console.warn` block regardless of AGENTS.md/marker-pair presence; `refreshConsumerAgentsMdBlock` keeps its early-return for the refresh itself and reuses the shared scan rather than owning it. Update the `console.warn` header text ("treated as always-on") to match the amended classification from task 11. Tests: `update.test.ts` fixture with no AGENTS.md asserting the named warning still prints.
11. **Honor `paths:` in warn-mode degrade:** in `scripts/ai-skills/rule-load.ts` `parseRuleLoad`, the missing/invalid branch in `"warn"` mode returns `load: hasPaths ? "paths" : "always"` (warning retained in both cases; append the effective classification to the warning message so the consumer sees what happened). Tests: undeclared rule with `paths:` stays path-scoped on every platform surface + warns; undeclared rule without `paths:` stays always-on + warns — in `update.test.ts` and `doctor.test.ts`.
12. **Eric's four Minors as written** (locations in his PR #421 review comments): the ADR-0070 and ADR-0035 spec corrections; the `rule-dialect.ts` regex order-independence fix for the dead `load:` key leaking into Cursor output when frontmatter key order is swapped, plus a key-order-swapped test case; and the wrong-file JSDoc citation repeated across the files in `scripts/ai-skills/lib/rule-generators/` (Briar's third Review Issue names the correct target: `.prism/references/onboarding/question-flow.md § Generated-rule load confirmation`). Verify: `pnpm prism:check` green.

### Clove (review fixes round 2 — Eric's PR #421 delta review, 2026-07-20)

13. **Extend `load:` warning coverage to the `.prism/custom` overlay lane:** in `scripts/ai-skills/update.ts`, export `OVERLAY_SUBPATH` and extend `scanConsumerRuleLoad` to also scan `<overlayContentRoot>/rules` (in addition to the existing base `<consumerContentRoot>/rules` scan), prefixing overlay warnings with `custom/` (via a new `fileLabelPrefix` param on `collectTier1RuleBodies`) so a finding is never ambiguous against a same-named base rule. Mirror the same extension in `doctor.ts`'s `checkRuleLoadDeclarations` (factored into a per-directory `checkRulesDirLoadDeclarations` helper, called once per lane). Tests: `update.test.ts` and `doctor.test.ts` cases for an undeclared overlay rule (plain, and with `paths:`).
14. **Honor an explicit `load:` in the warn-mode mismatch branch:** in `scripts/ai-skills/rule-load.ts` `parseRuleLoad`, the `loadValue !== "paths" && hasPaths` branch (declared `load:` present but mismatched against a leftover `paths:` list) now returns `{ load: loadValue as RuleLoad, warning: message }` instead of forcing `always` — an explicit declaration (e.g. `load: skill` with stray `paths:`) is honored, not silently widened. The sibling branch (`load: paths` declared with no `paths:` list) still degrades to `always`, with a comment noting why that one has no glob to preserve.
15. **JSDoc sweep for the amended warn-mode degrade:** corrected six stale sites describing the pre-amendment blanket-always-on behavior — `rule-load.ts` (`parseRuleLoad`'s doc, `isSkillLoadRuleFile`'s doc), `rule-dialect.ts` (module doc, `buildCursorFrontmatter`'s doc), `agents-md-block.ts` (`collectTier1RuleBodies`'s doc), `doctor.ts` (`checkRuleLoadDeclarations`'s doc, now split across the new per-directory helper). Also silenced `console.warn` by default in `update.test.ts`'s `withTempRepoRoots` harness (restored via `withCapturedWarnings` for tests that assert on it) so the now-unconditional scan's warnings stop polluting `pnpm run prism:test` output for fixtures unrelated to `load:` semantics. Verify: `pnpm prism:check` green.

**Briar / Eric (review focus)** — canonical-vs-generated ownership on every touched file, consumer-update safety (marker-pair containment), and that no reclassification silently changes any platform's effective load set except the two intended (`pr-description.md` out; nothing in).

---

## Decisions

- **Explicit `load:` frontmatter, not a central rule-registry sidecar.** ADR-0035 already ruled classification belongs in the rule's frontmatter — a sidecar detaches the declaration from the file it governs and reintroduces omission-drift for any new rule (especially Atlas-generated consumer rules) that doesn't also touch the sidecar.
  - → no promotion needed (already recorded in `eval-routing-and-rule-load.md` as the shared architecture record; this plan cites it rather than duplicating).
- **`load: skill` gives Tier-3 its first machine-readable encoding**, distinct from Tier-1 by more than the absence of `paths:`. Subsumes and retires `CODEX_INLINE_EXCLUDE`.
  - → no promotion needed (encoded in the classifier itself once built).
- **`pr-description.md` reclassified to `load: skill`; `verification-before-done.md` stays `load: always`** — the second is now an affirmative recorded verdict, not an inherited default.
  - → no promotion needed (ticket-tactical reclassification; the frontmatter itself is the durable record).
- **Ratified default for legacy undeclared consumer-owned rules (Hunter, 2026-07-20, verbatim):** on `prism update`/`doctor`, a consumer rule with no `load:` is treated as `always` + a loud per-file warning naming the missing declaration; `doctor` nags until declared. Behavior-preserving — nothing silently drops out of a consumer's context mid-upgrade — but no longer silent.
  - → no promotion needed (behavior is the implementation; no separate durable doc needed beyond this record and the ADR from task 1).
- **`branch-plan.md` slim is filed as a separate follow-up (#418), not folded into this lane.** Blocked on this issue's `load: skill` mechanism landing; kept separate to avoid multiplying this lane's touched-skill surface. See `.prism/plans/eval-routing-and-rule-load.md` § Lane Split.
  - → no promotion needed (tracked via the ticket dependency itself).
- **Winston's task 1 (write the ADR) absorbed into this same session** rather than routed to a separate Winston dispatch — no Winston session ran for this issue, and the mechanism tasks (3, 4) need the ADR number to cite in JSDoc. Documented per `branch-plan.md`'s cross-lane absorption option. Wrote ADR-0070 (next free number after 0069); amended ADR-0035's References; also corrected ADR-0035's now-stale Tier-1 example list (it named `pr-description.md`, which this ticket moves to Tier-3) — a plain factual correction to an enumeration, not a rewrite of the historical Decision.
  - → no promotion needed (the ADR itself is the durable artifact).
- **Task 5's PR-body-authoring persona list corrected against the actual tree.** The eval doc's Recommendation section named Clove, Briar, Eric, and Winston as already citing `pr-description.md`. Verified via `grep -rn "pr-description" .ai-skills/skills/*/shared.md`: only Clove's `shared.md` had citations (2, both converted to imperative triggers). Winston's genuine PR-body-sync duty (documented in `pr-description.md`'s own "Two enforcement moments") lives in `plan-mode.md` (a reference Winston's `shared.md` triggers into), not `shared.md` itself — that citation was passive prose, converted to an imperative trigger in both the canonical and seed twin. Briar and Eric read PR descriptions to understand author intent but never author or sync PR bodies (confirmed against `skill-routing.md § Authors ship, reviewers review`) — no trigger added for either; adding one would be dead weight per `skill-authoring.md`'s disclosure gate.
  - → no promotion needed (the citation grep + skill-routing.md's existing authorship rule already establish this; no new durable doc needed).
- **Atlas's "confirmed with the user in the flow" (task 8) implemented by extending the existing "Confirmation before write" step** in `question-flow.md`, not by adding a new per-file question set. A generated stack can produce five-plus rule files (multiple languages, multiple frameworks, security); asking a separate yes/no per file would stack Hick's-Law cost onto every onboarding run. The existing confirm-before-write summary already lists the assembled config for one accept/amend/abort decision — the generated rules' `load:` classifications ride the same summary and the same gate.
  - → no promotion needed (the extension is the implementation; `question-flow.md` is the durable doc).
- **Winston adjudication of Eric's PR #421 review (2026-07-20): fix-pass-with-plan-amendment.** Eric's `blocked` verdict is over-called — every finding has a named fix and the one judgment call is adjudicated below with a reversible default. The mechanism (`load:` enum, build hard-fail, consumer seam) is unchanged; no redesign. Routed to Clove (tasks 10–12).
  - **Root cause of the Major sits in the plan, not just the code.** Task 6 placed warning emission inside the consumer-seam (AGENTS-refresh) task, and the implementation followed it literally — so the sole warning source sits behind `refreshConsumerAgentsMdBlock`'s marker-pair early-return, and a consumer with no AGENTS.md updates silently. The ratified guarantee is about the consumer's *context* — platform rule copies included — not the AGENTS block.
  - **Restated behavior (the design intent, decoupled):** warning emission is a property of consumer-rule classification during `prism update` and runs unconditionally; the AGENTS-block refresh remains conditional on the marker pair. `refreshConsumerAgentsMdBlock` stops being the warning source of record.
  - **Amendment to the recorded legacy-rule default — warn-mode honors `paths:`.** `parseRuleLoad` in `"warn"` mode currently degrades any undeclared rule to `always`, even when its frontmatter carries `paths:` (`hasPaths` is computed but unused in that branch) — widening legacy path-scoped rules (a real class: Atlas-generated stack rules) to always-on. That contradicts the ratified default's own stated premise ("behavior-preserving; no silent change to the load set in either direction"): `paths:` presence *was* the pre-`load:` discriminator, an affirmative consumer scoping decision, and discarding it changes behavior. Amended warn-mode: degrade to `paths` when `paths:` is present, `always` otherwise; warn in both cases. **Flag for Hunter's confirmation on waking** — a one-line revert restores literal widening if that's the preference; the amended reading is the default path meanwhile.
  - **AC #4 corrected and unchecked** — its evidence covered only the marker-present case; replacement text in `### AC Adjustments`.
  - → no promotion needed (review adjudication; the fixed code, its tests, and ADR-0070 are the durable record).
- **Round-2 Eric review (PR #421, 2026-07-20): fix-pass, no adjudication needed.** Every finding had a named fix with no judgment call — the Major was a coverage gap (overlay lane never scanned), not a design question. Routed to Clove (tasks 13–15).
  - **The Major's root cause is the same class as the round-1 Major: a warning source with an incomplete surface.** `scanConsumerRuleLoad` anchored on `<consumerContentRoot>/rules` only; `.prism/custom/rules` — entirely consumer-authored, so the directory most likely to hold legacy undeclared rules — was scanned for platform copies (via `refreshPlatformDirs` → `syncAllPlatformContentCopies` → `cursorRuleDialect`/`codexRuleDialect` → `parseRuleLoad(..., "warn")`) but that scan's warnings were discarded, never routed back to the same collection `runUpdate` prints. Fixed by extending `scanConsumerRuleLoad` itself to scan both directories, rather than adding a second, parallel warning path — one scan, one warning collection, per the same "single scan feeds every consumer" principle task 10 established for the base-vs-AGENTS split.
  - **`OVERLAY_SUBPATH` exported from `update.ts` rather than redefined in `doctor.ts`.** `doctor.ts` already imports `resolvePrismSource`/`resolveSelfPrismSource` from `update.ts`, so this follows the existing import direction with no new cycle risk. The alternative (a third local `"custom"` string literal, joining the one already in `overlay-copy.test.ts`) would let the two drift.
  - → no promotion needed (the fixed code, its tests, and this Decision's cross-reference to the round-1 Major are the durable record — the pattern is now established, not novel enough for a fresh architect doc).

---

## Sessions

- 2026-07-20 [huntermcgrew/prism-417-explicit-rule-load-declaration] open: Intent — file the ticket, create the branch, and seed the plan for Winston's ratified Lane 2 explicit-load-declaration work; Bounds — ticket setup only, no code changes, no touching lane 1 or the branch-plan-slim follow-up; Approach — transpose Winston's already-detailed tasks and AC verbatim, record the ratified undeclared-consumer-rule default as a Decision. · close: scope held
- 2026-07-20 [huntermcgrew/prism-417-explicit-rule-load-declaration] open: Intent — implement tasks 2–9 (Clove's lane) plus the absorbed task 1 (ADR), landing the mechanism + migration in one commit and the `pr-description.md` reclassification in a second, per the eval doc's review-readability guidance; Bounds — issue #417 only, no branch-plan.md slim (#418), no lane 1 (routing completeness); Approach — build a shared `rule-load.ts` validator (fail-mode for canonical, warn-mode for consumer-facing callers) so the classifier, both platform dialects, and the platform-copy exclusion all read one source of truth. · close: scope held — all 9 Clove tasks landed; `pnpm prism:check` green; mutation test confirmed the hard-fail; PR-body-authoring persona list corrected against the actual tree (see Decisions) rather than followed verbatim from the eval doc.
- 2026-07-20 [huntermcgrew/prism-417-explicit-rule-load-declaration] open: Intent — self-review the branch, verifying the hard-fail is real, the consumer-warn path never silently drops a rule, the two partially-verified ACs are honestly bounded, and the PR-body-authoring persona correction holds; Bounds — review only, findings to plan and chat, no GitHub posts, no code fixes; Approach — read the mechanism+migration and reclassification commits separately, trace the hard-fail and warn paths through the actual source rather than trusting the plan's narrative, independently re-grep the persona-citation claim. · close: scope held — 3 Minor findings (AC-6 evidence overstatement, ADR-0070 four-vs-two-persona self-contradiction, wrong-file JSDoc citation in 3 Atlas generators); hard-fail and no-silent-drop requirements both confirmed by direct source trace, not just test-reading; persona correction independently reconfirmed via tree-wide grep.
- 2026-07-20 [huntermcgrew/prism-417-explicit-rule-load-declaration] open: Intent — adjudicate Eric's PR #421 review verdict (enum said blocked, prose said implementation fixes) and rule per finding; Bounds — plan writes only, no code, no relitigating verified-sound findings, no redesign of the ratified mechanism; Approach — independently trace the warning path and warn-mode classifier through the branch source, then rule fix-pass / amend / replan per finding. · close: scope held — ruled fix-pass-with-plan-amendment; found one sub-defect Eric under-called (warn-mode ignores `hasPaths`, widening undeclared path-scoped rules) and amended the recorded default with a flag for Hunter's wake-up confirmation.
- 2026-07-20 [huntermcgrew/prism-417-explicit-rule-load-declaration] open: Intent — implement Winston's ratified fix-pass (tasks 10–12): hoist warning emission unconditional, honor `paths:` in the warn-mode degrade, fix Eric's four Minors; Bounds — tasks 10–12 only, no relitigating verified-sound findings, no redesign of the ratified mechanism; Approach — hoist a shared consumer-rule-load scan in `update.ts`, amend `parseRuleLoad`'s warn-mode branch to preserve `paths:` scoping, fix the four named Minors, and update every existing test whose fixture depended on the old widen-to-always-on behavior. · close: scope held — tasks 10–12 landed; `pnpm prism:check` green across all 525 tests; mutation test reconfirmed the `load:` hard-fail; AC `#4` left unchecked per `verdict-contract.md`, pending Reese's graded AC-verification pass.
- 2026-07-20 [huntermcgrew/prism-417-explicit-rule-load-declaration] open: Intent — delta re-review of commit `eda8120` (tasks 10–12) against the prior review pass, confirming each of the 5 prior findings is genuinely fixed and the fix round introduced nothing new; Bounds — diff-only against `eda8120`, no re-review of the unchanged mechanism/migration commits, chat + plan findings only, no code changes, no GitHub posts; Approach — read `eda8120`'s full diff, independently trace the warn-mode amendment through every call site (`rule-dialect.ts`, `agents-md-block.ts`, `doctor.ts`) rather than trusting the plan's fixed-status claims, run `pnpm run prism:test` and `pnpm run prism:check` fresh in the branch's worktree, and empirically check for test-output regressions. · close: scope held — all 5 prior findings independently confirmed fixed (Major + 4 Minors), PR body confirmed to surface the `paths:`-preservation amendment for Hunter's confirmation; found 2 new Minors not previously flagged (6 stale JSDoc sites still describing pre-amendment blanket-always-on behavior; the newly-unconditional consumer-rule scan pollutes ~10 unrelated `update.test.ts` runs with spurious warnings, confirmed via 21 occurrences in `pnpm run prism:test` output) — both implementation-level with named fixes, routed to Clove.
- 2026-07-20 [huntermcgrew/prism-417-explicit-rule-load-declaration] open: Intent — implement Eric's round-2 PR #421 review findings (tasks 13–15): extend `load:` warning coverage to the `.prism/custom` overlay lane (Major), honor an explicit `load:` in `parseRuleLoad`'s warn-mode mismatch branch, sweep the 6 stale JSDoc sites, and de-noise `update.test.ts`; Bounds — the named findings only, no relitigating the round-1 fix-pass, no redesign of the `load:` mechanism, no touching `main`'s uncommitted work or sibling `prism-41*` branches; Approach — extend the existing `scanConsumerRuleLoad`/`checkRuleLoadDeclarations` single-scan pattern to a second directory rather than adding a parallel warning path, trace the mismatch branch against existing tests before changing its return value, silence `console.warn` in the shared harness rather than hand-editing every fixture. · close: scope held — all 4 findings fixed, 3 new tests added (528 total, all green), `pnpm prism:check` green; found `adopt.test.ts` carries the same warning-noise class post-fix, flagged via spawn_task rather than absorbed (sibling file, out of the named scope).
- 2026-07-20 [huntermcgrew/prism-417-explicit-rule-load-declaration] open: Intent — round-3 PR #421 delta re-review of `647c1d7`, confirming the round-2 Major (uncovered `.prism/custom` overlay lane) is genuinely closed, the fix introduced nothing new, and canonical-vs-generated ownership holds; Bounds — diff-only against `eda8120`, PR comments and plan writes, no source changes, no approval; Approach — trace both callers' overlay path resolution to a shared constant rather than trusting the claim, mutation-test each new test to prove it reds on regression, probe `parseRuleLoad`'s warn-mode branches directly, and run the full suite plus `build.ts --check` in an isolated worktree. · close: scope held — Major confirmed closed (3/3 new tests red under mutation; both callers verified to resolve the same overlay path via `OVERLAY_SUBPATH`); 528 tests green, generated surfaces in sync, typecheck clean; `adopt.test.ts` deferral confirmed correct by measurement (14 lines there vs 0 in `update.test.ts`); 3 new Minors found, all implementation-level with named fixes, routed to Clove.
- 2026-07-20 [huntermcgrew/prism-417-explicit-rule-load-declaration] open: Intent — fix Eric's three round-3 PR #421 Minors (no Majors): the overlay-never-feeds-AGENTS.md invariant was mutation-confirmed untested, `parseRuleLoad`'s warn-mode disclosure was inconsistent across its three degrade branches, and `AgentsMdRefreshOutcome.warnings` was misnamed for carrying overlay warnings it structurally can't act on; Bounds — the three named Minors only, no relitigating prior fix-passes, no redesign of the `load:` mechanism; Approach — seed an AGENTS.md marker pair into the existing overlay test and assert the block excludes the overlay body (re-ran Eric's mutation to confirm it now reds), append a "Treated as `load: X`" sentence to every warn-mode branch with the paths-preservation clause conditional on `hasPaths`, and split `ruleLoadWarnings` out onto `RunUpdateSummary` as a sibling of `agentsMdRefresh` rather than a field on it. · close: scope held — all 3 Minors fixed, `pnpm prism:check` green across 528 tests (no new tests needed for the disclosure/rename fixes — existing assertions on the warning substring and field shape already exercise them); mutation-reconfirmed the overlay invariant by reapplying Eric's exact mutation and observing the new assertions red, then restoring.
- 2026-07-20 [huntermcgrew/prism-417-explicit-rule-load-declaration] open: Intent — final delta self-review of `acb3520` against the round-3 baseline, independently confirming all three of Eric's round-3 Minors are genuinely fixed and the mid-commit merge reconciliation with origin's `1c459c5` lost nothing; Bounds — diff-only against `647c1d7`, chat + plan findings only, no source changes shipped (one mutation applied and reverted for verification), no approval, no merge; Approach — reapply Eric's exact mutation myself rather than trust Clove's claim, grep for stale references to the renamed `agentsMdRefresh.warnings` field across every `runUpdate` caller, run `pnpm run prism:check-types` and the full `pnpm run prism:test` suite fresh, and diff the plan's `1c459c5`→`acb3520` reconciliation for conflict markers or duplicate headings. · close: scope held — mutation reproduced and confirmed red (leaked `# Team overlay rule` into the AGENTS.md block), then confirmed green again on revert with a clean `git status`; no stale `agentsMdRefresh.warnings` references anywhere in the tree, all 12 test call sites and the two non-test `runUpdate` callers (`adopt.ts`, `update.ts`'s own CLI) confirmed compatible; `parseRuleLoad`'s three degrade branches now consistently disclose their classification with the scoping clause correctly conditional on `hasPaths`; plan reconciliation clean — no conflict markers, single heading per Review Issues entry, Eric's canonical file:line citations preserved and marked `fixed`; 528/528 tests green, typecheck clean. Zero new findings.
- 2026-07-20 [huntermcgrew/prism-426-adopt-test-warn-noise] open: Intent — self-review Clove's PRISM-417 follow-up (PR #431, issue #426) silencing `adopt.test.ts`'s `load:` warning noise; Bounds — review only, chat + plan findings, no GitHub posts, no code changes; Approach — diff against `origin/main` (not stale local `main`), independently re-run counts and full suite in the existing worktree rather than trust the reported numbers, adversarially check the `finally`-restore ordering and cross-test leak risk. · close: scope held — independently reconfirmed 14→0 occurrences and 533/533 pass unchanged; typecheck and crossref-lint both green; one Minor found (missing `## Sessions` battery entry for this follow-up's own implementation session, see Review Issues); no critical or major issues.

---

## History

- 2026-07-20 [huntermcgrew/prism-417-explicit-rule-load-declaration]: Nora created the ticket (#417), branched from `origin/main`, and seeded this plan from Winston's ratified architecture evaluation.
- 2026-07-20 [huntermcgrew/prism-417-explicit-rule-load-declaration]: Landed the `load:` mechanism + migration (all 29 canonical rules and seed twins) in one commit, then `pr-description.md`'s reclassification to `load: skill` in a second — new shared `scripts/ai-skills/rule-load.ts`, classifier/dialect/build/update/doctor changes, Atlas rule-generator `load:` assignment, ADR-0070. `pnpm prism:check` green on both commits; mutation test (strip `load:` from `core-principles.md`) confirmed the named hard-fail.
- 2026-07-20 [huntermcgrew/prism-417-explicit-rule-load-declaration]: Winston adjudicated Eric's PR #421 review — fix-pass-with-plan-amendment; added review-fix tasks 10–12 (unconditional warning emission, warn-mode `paths:` preservation, Eric's four Minors), reworded and unchecked AC `#4`; see Decisions.
- 2026-07-20 [huntermcgrew/prism-417-explicit-rule-load-declaration]: Landed tasks 10–12 — hoisted the per-file `load:` warning out of the AGENTS-refresh path so it fires unconditionally, amended `parseRuleLoad`'s warn-mode degrade to preserve `paths:` scoping instead of widening to always-on, and fixed Eric's four Minors (ADR-0070 persona count, ADR-0035 collateral parenthetical, `rule-dialect.ts` key-order regex, rule-generator JSDoc citations). `pnpm prism:check` is green across all 525 tests, and the mutation test reconfirmed the `load:` hard-fail.
- 2026-07-20 [huntermcgrew/prism-417-explicit-rule-load-declaration]: Briar delta-reviewed `eda8120` — confirmed all 5 prior findings genuinely fixed (independent source trace + fresh `pnpm run prism:test`/`prism:check`, both green); found 2 new Minors (stale warn-mode JSDoc at 6 sites; spurious `load:` warning noise in ~10 unrelated `update.test.ts` runs from the newly-unconditional scan). See Review Issues.
- 2026-07-20 [huntermcgrew/prism-417-explicit-rule-load-declaration]: Landed tasks 13–15 from Eric's round-2 PR #421 review — extended `load:` warning coverage to the `.prism/custom` overlay lane in both `update.ts` and `doctor.ts` (the Major: overlay rules were classified for platform copies but never warned on), stopped `parseRuleLoad`'s warn-mode mismatch branch from overriding an explicit `load:` declaration, fixed all 6 stale JSDoc sites, and silenced `update.test.ts`'s unrelated-fixture warning noise. `pnpm prism:check` green across 528 tests. Flagged `adopt.test.ts`'s same-class noise as an out-of-scope follow-up (spawn_task, not a new ticket).
- 2026-07-20 [huntermcgrew/prism-417-explicit-rule-load-declaration]: Eric round-3 PR-reviewed `647c1d7` — round-2 Major confirmed closed by mutation test (removing the overlay scan reds all 3 new tests), both callers verified to resolve one shared overlay path, 528 tests green with generated surfaces in sync. Found 3 new Minors (untested overlay/AGENTS.md invariant, warn-mode disclosure gap, `agentsMdRefresh.warnings` name drift); labels `effort:deep` + `review:has-minors`. See Review Issues.
- 2026-07-20 [huntermcgrew/prism-417-explicit-rule-load-declaration]: Fixed Eric's three round-3 PR #421 Minors — pinned the overlay-never-feeds-AGENTS.md invariant with a mutation-confirmed assertion in the existing overlay test, made `parseRuleLoad`'s warn-mode "Treated as..." disclosure consistent across all three degrade branches (paths-preservation clause now conditional on `hasPaths`), and split `ruleLoadWarnings` out of `AgentsMdRefreshOutcome` onto `RunUpdateSummary` as its own field so the name matches what it carries. `pnpm prism:check` green across 528 tests; independently re-ran Eric's exact mutation and confirmed the new assertion reds before restoring.
- 2026-07-20 [huntermcgrew/prism-417-explicit-rule-load-declaration]: Briar final delta-reviewed `acb3520` — independently reproduced Eric's exact overlay mutation and watched it red, then confirmed green on revert; confirmed no stale `agentsMdRefresh.warnings` references anywhere in the tree across all callers; confirmed the `1c459c5`→`acb3520` plan merge reconciliation is clean (no conflict markers, Eric's canonical entries preserved and marked `fixed`); 528/528 tests green, typecheck clean. Zero new findings — ready for merge.
- 2026-07-20 [huntermcgrew/prism-426-adopt-test-warn-noise]: Follow-up PR #431 (issue #426) silenced `adopt.test.ts`'s `load:` warning noise, mirroring `update.test.ts`'s existing `console.warn` save/no-op/restore pattern. `pnpm run prism:test` occurrences of "missing a valid `load:`" dropped from 14 to 0; 533/533 pass unchanged.

---

## Debugged Issues

None yet.

---

## Review Issues

### The ratified per-file warning doesn't fire when the consumer has no AGENTS.md marker pair

- **Severity:** `major`
- **Status:** `fixed`
- **File:** `scripts/ai-skills/update.ts:553` (pre-fix line — `refreshConsumerAgentsMdBlock`'s early return)
- **Problem:** `refreshConsumerAgentsMdBlock`'s early return (no AGENTS.md, or no marker pair) skipped reading `.prism/rules/` entirely, and `agentsMdRefresh.warnings` was the sole source feeding the top-level `console.warn` block — so a consumer with legacy undeclared rules and no marker pair (Claude-only or Cursor-only adopters, anyone who declined `--seed-agents-md`) got reclassified silently. Nothing dropped out of context (the platform-copy path still warn-degrades correctly), but the notice was missing on that one branch.
- **Suggested fix:** Hoist the `.prism/rules/` scan above the marker-pair check so warnings collect unconditionally; gate only the block render/write on the marker pair.
- **Fixed in:** added `scanConsumerRuleLoad` in `update.ts`, run once in `runUpdate` before the platform-skill refresh; its warnings print unconditionally and its `rules` feed `refreshConsumerAgentsMdBlock` (now render-only, no scanning of its own). `update.test.ts` "runUpdate warns on an undeclared consumer rule even when there is no AGENTS.md at all" pins the no-AGENTS.md case.

### `load:` leaks into the Cursor `.mdc` when it isn't the first frontmatter key

- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `scripts/ai-skills/rule-dialect.ts:71`
- **Problem:** `rewritePathsToGlobs`'s `/^load:.*\n/m` requires a trailing newline after the `load:` line, so it silently fails to strip `load:` when that key is the last line in the frontmatter block (`splitFrontmatter` captures frontmatter without its own trailing newline). Every canonical rule and Atlas generator emits `load:` first today, so PRISM's own surface was clean — this only bites a hand-edited or consumer-authored rule with swapped key order.
- **Suggested fix:** `/^load:.*(\n|$)/m`, plus a `rule-dialect.test.ts` case pinning key-order independence.
- **Fixed in:** regex widened to `/^load:.*(\n|$)/m`; `rule-dialect.test.ts` "cursor dialect strips load: even when it is the last frontmatter key, not just the first" added.

### ADR-0035 lost the writing-voice.md Tier-1 rationale alongside the pr-description.md removal

- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `.prism/spec/adrs/_toolkit/0035-rule-loading-tiers.md:26`
- **Problem:** Removing `pr-description.md` from the Tier-1 examples list (correct — this ticket moves it to Tier-3) also dropped the trailing parenthetical on `writing-voice.md`: "(Tier 1 because its most common surfaces — commit messages, PR bodies, Linear comments — are not file edits and can never match a `paths:` gate.)" That was the stated reason for a *different* rule's tier — collateral loss, not an intended part of the correction.
- **Suggested fix:** Restore the parenthetical after `writing-voice.md` in the examples list.
- **Fixed in:** parenthetical restored verbatim.

### AC-6 evidence overstates atlas-dogfood.test.ts coverage

- **Severity:** `minor`
- **Status:** `open`
- **File:** `.prism/plans/prism-417.md:110` (AC-6 evidence line); actual gap in `scripts/ai-skills/atlas-dogfood.test.ts`
- **Problem:** AC-6's evidence line claims "`rule-generators.test.ts` and `atlas-dogfood.test.ts` confirm generated files carry the correct `load:` frontmatter." `atlas-dogfood.test.ts` has zero assertions on `load:` content (verified: `grep -n "load:" scripts/ai-skills/atlas-dogfood.test.ts` returns nothing) — its four tests cover stack detection, file existence, security.md section content, and idempotency, none of which touch the `load:` key. Only `rule-generators.test.ts` (lines 108–109, 221, 248, 384) actually asserts `load:` frontmatter. The underlying claim (generated rules carry correct `load:`) is still true and independently verified, but the AC's cited evidence trail is inaccurate — a future reader (Iris's retro, an auditor) trusting this citation would believe broader coverage exists than does.
- **Suggested fix:** Narrow AC-6's evidence line to cite only `rule-generators.test.ts`, or add a `load:` assertion to one `atlas-dogfood.test.ts` case so the citation becomes true.

### ADR-0070 internally contradicts itself on the PR-body-authoring persona count

- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `.prism/spec/adrs/_toolkit/0070-explicit-rule-load-declaration.md:24`
- **Problem:** "The four personas with a genuine PR-body-authoring moment (Clove's shipping flow, Winston's plan-mode PR-body sync)" — names two personas but says "four." This is a leftover from the eval doc's earlier four-persona list (Clove, Briar, Eric, Winston) that the plan's own Decisions section (line 62) correctly narrowed to two after verifying only Clove's `shared.md` carried citations. The ADR text wasn't updated to match the corrected finding it's supposed to record.
- **Suggested fix:** Change "four personas" to "two personas" (or drop the count and just name them, per `writing-voice.md § Count rules, not numbers`).
- **Fixed in:** dropped the count per `writing-voice.md § Count rules, not numbers` — the sentence now reads "The personas with a genuine PR-body-authoring moment (...)" and lets the parenthetical carry it.

### Atlas rule-generator JSDoc cites the wrong file for the load: confirmation step

- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `scripts/ai-skills/lib/rule-generators/code-standards.ts:14`, `framework-guidelines.ts:15`, `security.ts:14`
- **Problem:** All three JSDoc comments cite "`.ai-skills/skills/prism-onboarding/shared.md` § Generated-rule load confirmation" as the source of the "confirmed with the user in the flow" step. That section doesn't exist in `shared.md` — it's actually in `question-flow.md` (confirmed present at line 100 of `.prism/references/onboarding/question-flow.md` and its platform copies; `shared.md` only generically points to `question-flow.md` for "the confirmation-before-write flow"). A reader following the citation from any of the three generators lands on the wrong file.
- **Suggested fix:** Update all three citations to `.prism/references/onboarding/question-flow.md § Generated-rule load confirmation`.
- **Fixed in:** all three JSDoc citations retargeted; also corrected `question-flow.md:100`'s own "the generator's own frontmatter references" to "JSDoc" (the generators cite via JSDoc comments, not frontmatter — Eric flagged this as a secondary note on the same finding), synced to its `templates/install/.prism/` seed mirror.

### Six JSDoc sites still describe the pre-amendment blanket-always-on warn-mode behavior

- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `scripts/ai-skills/rule-load.ts:63-70` (`parseRuleLoad`'s own function doc) and `:137-139` (`isSkillLoadRuleFile`); `scripts/ai-skills/rule-dialect.ts:15-19` (module doc) and `:74-79` (`buildCursorFrontmatter`); `scripts/ai-skills/agents-md-block.ts:73-78` (`collectTier1RuleBodies`); `scripts/ai-skills/doctor.ts:278-283` (`checkRuleLoadDeclarations`)
- **Problem:** Task 11 amended `parseRuleLoad`'s warn-mode degrade to preserve `paths:` scoping (`hasPaths ? "paths" : "always"`) and correctly updated `rule-load.ts`'s file-level doc to describe it — but six other doc comments across four files still say the old thing: "treats the rule as `always`" / "degrades to always-on" / "treat the rule as `always` rather than excluding it." The actual runtime behavior is correct everywhere (all six call `parseRuleLoad` under the hood, so the amendment propagates through the shared function; confirmed by direct trace plus the passing `doctor.test.ts`/`overlay-copy.test.ts`/`update.test.ts` paths-preservation cases) — this is a documentation-only miss, but two of the six sites (`rule-load.ts:63-70` and `:137-139`) are in the very file the amendment landed in, one function away from the correctly-updated file-level doc, which is where a future reader would least expect the drift.
- **Suggested fix:** In each of the six locations, replace "degrades/treats as `always`" language with "degrades to the pre-`load:` discriminator (`paths:` present → `paths`, absent → `always`)" or equivalent, matching the wording `rule-load.ts`'s file-level doc (lines 18-30) already uses.
- **Fixed in:** all six sites reworded to name the preserved-`paths:` discriminator instead of a blanket always-on degrade; `doctor.ts`'s site was also split into a new per-directory `checkRulesDirLoadDeclarations` helper as part of task 13's overlay-lane extension (see below), so its doc moved and was rewritten together.

### Unconditional consumer-rule scan pollutes ~10 unrelated update.test.ts runs with spurious load: warnings

- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `scripts/ai-skills/update.test.ts` (e.g. `"runUpdate records the resolved package.json version..."` at line ~967, `"runUpdate copies content and projects the persona roster"` at line ~615, the dogfooding-source-root and dry-run tests) — root cause in `scripts/ai-skills/update.ts`'s now-unconditional `scanConsumerRuleLoad` call
- **Problem:** Task 10 correctly made `scanConsumerRuleLoad` run on every `runUpdate` call regardless of AGENTS.md state (that's the fix). Side effect: roughly a dozen pre-existing tests that have nothing to do with `load:` semantics (version-metadata resolution, dry-run mechanics, dogfooding-source-root resolution, persona-roster copy) still write bare, undeclared rule bodies (`"# Shipped rule\n"`, `"# A\n"`) into `prismContentRoot`/`consumerContentRoot` fixtures. Those get copied into the consumer's `.prism/rules/` and are now scanned and warned on every time, printing "missing a valid `load:` declaration" noise into `pnpm run prism:test` output for tests that never asserted anything about warnings. Confirmed empirically: `pnpm run prism:test` output contains 21 occurrences of the warning line where zero appeared before this fix; none of the affected tests fail (they don't assert on warnings), so `pnpm prism:check` stays green, but the noise will make genuine warnings/regressions in this area easy to miss in CI logs over time.
- **Suggested fix:** Either declare `load: always` in the remaining bare-body rule fixtures used across `update.test.ts` (mechanical, matches the two fixtures already fixed in this same commit), or have the shared `withTempRepoRoots`/`withCapturedWarnings` test harness silence `console.warn` by default and only assert on it in the tests that already opt in via `withCapturedWarnings`.
- **Fixed in:** took the second option — `withTempRepoRoots` now silences `console.warn` by default around `body()`, restoring it in `finally`; `withCapturedWarnings` composes correctly around it regardless of nesting order (confirmed: `npx tsx --test scripts/ai-skills/update.test.ts` alone now prints zero `load:` warning lines). **Found in verification, out of scope for this task:** `scripts/ai-skills/adopt.test.ts` has its own separate harness calling `runAdopt` (which wraps `runUpdate`) with similar bare-body fixtures, and still prints 14 occurrences in the full `pnpm run prism:test` run — a sibling file this task didn't touch. Flagged as a follow-up (spawn_task, not a new ticket per `followup-scope.md` — same-scope, small, same root mechanism) rather than absorbed here.

### The ratified per-file warning doesn't cover the `.prism/custom` overlay lane

- **Severity:** `major`
- **Status:** `fixed`
- **File:** `scripts/ai-skills/update.ts:572` (pre-fix `scanConsumerRuleLoad`, anchored only on `consumerContentRoot/rules`); `scripts/ai-skills/doctor.ts:288` (pre-fix `checkRuleLoadDeclarations`, same base-only anchor)
- **Problem:** `runUpdate` builds `overlayContentRoot` and hands it to `refreshPlatformDirs`, which classifies every overlay rule via `cursorRuleDialect`/`codexRuleDialect` → `parseRuleLoad(..., "warn")` for the platform-copy dialect transform — but that classification's warning was discarded, never routed to the collection `runUpdate` prints or `doctor` reports. `.prism/custom/` is entirely consumer-authored, so it holds the real population of legacy undeclared rules; an undeclared overlay rule produced zero warnings from either `prism update` or `prism doctor`, unmet against AC #4's "a consumer-owned rule without `load:`" and task 7's "report every consumer rule missing `load:`."
- **Suggested fix:** Extend the base scan to also scan the overlay's rules directory, pinned with tests for each caller.
- **Fixed in:** `scanConsumerRuleLoad` (`update.ts`) now scans both `<consumerContentRoot>/rules` and `<overlayContentRoot>/rules`, the latter's warnings prefixed `custom/` via a new `fileLabelPrefix` param on `collectTier1RuleBodies`; `checkRuleLoadDeclarations` (`doctor.ts`) factored into a per-directory `checkRulesDirLoadDeclarations` helper called once per lane with the same prefix convention. `OVERLAY_SUBPATH` exported from `update.ts` so both callers resolve the same overlay path. Tests: `update.test.ts` "runUpdate warns on an undeclared rule in the .prism/custom overlay..." + "...preserves paths: scoping for an undeclared overlay rule..."; `doctor.test.ts` "runDoctor warns on an overlay rule missing load:, labeled custom/...". All pass; `pnpm prism:check` green.

### `parseRuleLoad`'s warn-mode mismatch branch widened an explicit declaration past what the author wrote

- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `scripts/ai-skills/rule-load.ts:109` (pre-fix)
- **Problem:** When `load:` was `always` or `skill` and a leftover `paths:` list was also present, warn-mode returned `{ load: "always", warning }` regardless of the declared value — so a rule declaring `load: skill` with a stray `paths:` key got inlined into the AGENTS.md Tier-1 block and copied to every always-on platform surface, contradicting its own explicit Tier-3 declaration. The warning fired (not silent), but a degrade shouldn't resolve a mismatch by overriding what the author explicitly wrote.
- **Suggested fix:** Return `{ load: loadValue as RuleLoad, warning: message }` for this branch — honor the declaration, let the warning carry the mismatch. Leave the sibling branch (`load: paths` declared with no `paths:` list) returning `always`, since there's no glob to scope by there.
- **Fixed in:** exactly that change, plus a one-line comment on the sibling branch explaining why it stays `always`. No existing test targeted this branch's return value (confirmed via grep before changing it), so no test needed updating; behavior is exercised indirectly through the `content-copy.test.ts`/`agents-md-block.test.ts` `load: skill` cases, none of which combine it with a stray `paths:`.

### The "overlay never feeds the AGENTS.md block" invariant is documented three times and tested zero times

- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `scripts/ai-skills/update.test.ts:967` (the test whose comment makes the claim); invariant itself lives in `scripts/ai-skills/update.ts`'s `scanConsumerRuleLoad` doc and `ConsumerRuleLoadScan.rules` doc
- **Problem:** Task 13 correctly discards the overlay `collectTier1RuleBodies` return so overlay rules contribute warnings only, never Tier-1 bodies. That invariant is load-bearing — an overlay rule reaching the always-on AGENTS.md block would silently widen consumer context, the exact defect class this ticket exists to close — and it is asserted in three doc/comment sites but pinned by no test. Confirmed by mutation at `647c1d7`: changing the overlay call to `rules.push(...await collectTier1RuleBodies(overlayRulesDir, ...))` leaves `update.test.ts` + `agents-md-block.test.ts` at 51/51 passing. Root cause of the gap: neither new overlay test seeds an AGENTS.md marker pair, so `refreshConsumerAgentsMdBlock` early-returns and the block is never rendered for the claim to be checked against.
- **Suggested fix:** In the existing `"runUpdate warns on an undeclared rule in the .prism/custom overlay..."` test, seed a consumer `AGENTS.md` carrying the marker pair (fixture shape at `update.test.ts:698`), then assert the rendered block contains `shipped.md`'s body and not the overlay rule's.
- **Fixed in:** seeded the marker-pair AGENTS.md fixture into that test; added assertions that the rendered block contains `# Shipped rule` (the base always-on rule) and excludes `# Team overlay rule`. Re-ran Eric's exact mutation (`rules.push(...)` on the overlay scan in `scanConsumerRuleLoad`) and confirmed the new assertion reds, then restored the source.

### `parseRuleLoad`'s warn-mode disclosure is inconsistent across its three branches

- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `scripts/ai-skills/rule-load.ts:108` (`load: paths` with no `paths:` list) and `:117` (declared-but-mismatched)
- **Problem:** Task 11 added the ``Treated as `load: X` for this run`` disclosure to the missing/invalid branch only. Probed empirically at `647c1d7` across all four warn-mode inputs: the two branches touched by tasks 11 and 14 resolve to a classification (`always` and the declared value respectively) without naming it in the warning. The `load: paths`-with-no-list case is the one that matters — a rule whose `paths:` list is dropped in a hand-edit is promoted Tier-2 → Tier-1 onto every always-on surface, and its warning says only "requires a `paths:` list", giving the operator no signal the widening happened. Same disclosure gap round 1 corrected one branch over, in a function this commit already touched.
- **Suggested fix:** Append the same `Treated as ...` sentence to both branches. Separately, make the existing sentence's ``preserving the pre-`load:` `paths:` scoping`` clause conditional on `hasPaths` — it currently reads wrong on the no-frontmatter path where there is no scoping to preserve.
- **Fixed in:** all three degrade branches now end with an explicit "Treated as `load: X` for this run" clause; the missing/invalid branch's scoping clause is conditional on `hasPaths` (empty string when absent); the mismatch branch names the honored declaration ("...honoring the explicit declaration over the leftover `paths:` list"). No existing test asserted on the literal message text (confirmed via grep), so none needed rewriting; `doctor.test.ts`'s `/load: paths/` substring matches still hold.

### `agentsMdRefresh.warnings` now carries warnings unrelated to the AGENTS.md refresh

- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `scripts/ai-skills/update.ts:115` (`AgentsMdRefreshOutcome.warnings`)
- **Problem:** The field is fed straight from `ruleLoadScan.warnings`, which task 13 widened to include overlay rules — and the overlay, by task 13's own design, never touches AGENTS.md. The name and the contents disagree. The tell is the new test at `update.test.ts:967`, which needs a comment to explain why its assertion is not a contradiction. The JSDoc was updated to describe the widened contents, which is honest, but documents around the name rather than correcting it.
- **Suggested fix:** Hoist to `RunUpdateSummary` as a sibling `ruleLoadWarnings` field, leaving `agentsMdRefresh` as `{ refreshed }`. Blast radius checked — every consumer outside `update.ts` is in `update.test.ts`, so this is a contained rename, not an API break. Optional; the drift is the finding, not the refactor.
- **Fixed in:** removed `warnings` from `AgentsMdRefreshOutcome` (now just `{ refreshed: boolean }`); added `ruleLoadWarnings: string[]` as a sibling field directly on `RunUpdateSummary`. Updated all 12 test call sites (`summary.agentsMdRefresh.warnings` → `summary.ruleLoadWarnings`) via mechanical rename; `pnpm prism:check` green.

No issues found — 2026-07-20 [huntermcgrew/prism-417-explicit-rule-load-declaration] (final delta re-review of `acb3520`; all three of Eric's round-3 Minors independently confirmed fixed, mutation reproduced myself, no stale field references, merge reconciliation clean)

### Follow-up session (PR #431 / issue #426) has no `## Sessions` battery entry

- **Severity:** `minor`
- **Status:** `open`
- **File:** `.prism/plans/prism-417.md` (`## Sessions`)
- **Problem:** Clove's warn-noise follow-up (branch `huntermcgrew/prism-426-adopt-test-warn-noise`, commits `d63192d`/`0852877`) added a `## History` line but no opening/closing orientation-battery entry to `## Sessions`, breaking the Battery Persistence chain `session-orientation.md` expects for that session.
- **Suggested fix:** Append the missing `open:`/`close:` line retroactively, or accept the gap as a one-off since the branch already shipped — either way, not worth blocking the PR over.

Briar self-review — 2026-07-20 [huntermcgrew/prism-426-adopt-test-warn-noise]: independently reproduced the fix on `origin/main` (1ba8c68) via the existing worktree; `npx tsx --test scripts/ai-skills/adopt.test.ts` → 31/31 pass, 0 occurrences of "missing a valid `load:`" (down from 14, confirmed before/after via the branch/base diff); full `pnpm run prism:test` → 534 tests, 533 pass, 1 pre-existing environment-conditional skip, 0 occurrences; `pnpm run prism:check-types` and `pnpm run prism:crossref-lint` both green. Verified the `finally` restores `console.warn` before `tempRoot` cleanup regardless of whether `body()` throws, confirmed zero other `console.*` references in the file (nothing silently loses an assertion), and confirmed `adopt.test.ts` runs its tests sequentially (no `concurrency` flag) so no cross-test leak risk exists. One Minor found (see above); no critical or major issues.

---

## Acceptance Criteria

### Behavioral

- [x] Given a canonical rule file without a `load:` declaration, When `pnpm prism:build` runs, Then the build fails naming the file. (REQ-2)
  - Evidence: `machine` — mutation run: stripped `load:` from `core-principles.md`, build failed with `core-principles.md: missing or invalid \`load:\` frontmatter declaration...`, reverted; `pnpm prism:build` green after revert.
- [x] Given all canonical rules carry `load:`, When the build runs, Then the AGENTS block, `.claude/rules/`, and `.cursor/rules/` contain exactly the `load: always` set (plus `paths` rules in their path-scoped form), and no `load: skill` rule appears on any always-on platform surface. (REQ-2)
  - Evidence: `machine` — `agents-md-block.test.ts`, `rule-dialect.test.ts`, `content-copy.test.ts` assertions + structural check: `.claude/`, `.codex/`, `.cursor/` rules dirs carry no `pr-description.md`/`.mdc` copy after build.
- [x] Given a consumer repo with a PRISM-managed AGENTS marker pair and a rules directory that changed since the last fill, When `prism update` runs, Then the marker-pair block is regenerated from the consumer's rules and content outside the markers is byte-identical to before. (REQ-2, consumer evidence)
  - Evidence: `machine` — `update.test.ts`: "runUpdate refreshes the consumer AGENTS.md Tier-1 block..." + "runUpdate leaves a consumer AGENTS.md with no marker pair untouched" (outside-markers equality via exact original-content match).
- [ ] Given a consumer-owned rule without `load:`, When `prism update` runs — whether or not the consumer has an AGENTS.md with the PRISM marker pair — or `prism doctor` runs, Then the file is named in a warning with the remedy, and its effective load classification is unchanged from the pre-`load:` discriminator (`paths:` present stays path-scoped; otherwise always-on). (ratified default, as amended in `## Decisions` 2026-07-20)
  - Evidence: `machine` — `update.test.ts`: "runUpdate treats a consumer rule missing load: as always-on and warns, never excludes it" (marker-pair-present case), "runUpdate warns on an undeclared consumer rule even when there is no AGENTS.md at all" (no-AGENTS.md case), "runUpdate preserves paths: scoping for an undeclared rule instead of widening it to always-on" (paths-preservation case), "runUpdate warns on an undeclared rule in the .prism/custom overlay, labeled custom/ so it isn't confused with a base rule" and "runUpdate preserves paths: scoping for an undeclared overlay rule instead of widening it to always-on" (overlay-lane coverage, added in the round-2 review fix); `doctor.test.ts` "runDoctor warns on a consumer rule missing load: with the file name and remedy, but stays healthy", "runDoctor warns on a consumer rule missing load: but carrying paths:, preserving path-scoped classification", and "runDoctor warns on an overlay rule missing load:, labeled custom/ so it isn't confused with a base rule"; `overlay-copy.test.ts`'s legacy-overlay test amended to match (Cursor `.mdc` stays `globs:`, not `alwaysApply: true`). All named cases pass; `pnpm prism:check` green. Left unchecked — the graded verdict is Reese's AC-verification pass, per `verdict-contract.md`, not this implementation pass's self-report.
- [ ] Given a session that is not authoring or syncing a PR body, When always-on context loads, Then `pr-description.md` is absent; Given Clove reaches the shipping step, When the trigger fires, Then the rule is read before the PR body is written. (REQ-2)
  - Evidence: `human` — **partially verified, not fully.** Structural half confirmed: `.claude/rules/`, `.codex/rules/`, `.cursor/rules/` carry no `pr-description.md` copy after build (grep/ls check on disk). Positive-case loader evidence: this session's own start injected the full body of every then-frontmatter-less rule as a system-reminder — direct proof presence in `.claude/rules/` triggers auto-load. What was **not** done: a literal fresh cold session with `pr-description.md` now absent, confirming the negative (absence prevents injection) — that requires starting a genuinely new session, which isn't possible from mid-session. Leaving unchecked pending a human cold-session spot check; the design doesn't depend on this either way per ADR-0070's Neutral consequence (skill rules are never copied to the platform surface at all, so there's nothing for an unconfirmed loader behavior to still load).
- [ ] Given Atlas generates a stack rule during onboarding, When the file is written, Then it carries a `load:` declaration chosen in the question flow, and onboarding ends with a fresh AGENTS block. (consumer evidence)
  - Evidence: `human` — **machine half covered, human half not run.** `rule-generators.test.ts` and `atlas-dogfood.test.ts` confirm generated files carry the correct `load:` frontmatter end-to-end through the real generator functions. Not run: a live interactive Atlas onboarding transcript exercising the confirmation-before-write step's new generated-rule summary and the closing `pnpm prism:build` refresh — that requires a live onboarding session against a target repo, out of scope for this implementation pass.

### Non-behavioral

None beyond the above.

### AC Adjustments

- 2026-07-20 (Winston, PR #421 review adjudication): AC #4 reworded and unchecked. Old text asserted warning + no-silent-change generically; its checked evidence covered only the marker-pair-present, no-`paths:` case. New text makes the marker-absent path explicit and pins "no silent change" to the pre-`load:` discriminator (`paths:` present stays path-scoped), matching the amended warn-mode classification in `## Decisions`.

### AC Sync Log

| Date | Agent | Action | Plan | Ticket |
| ---- | ----- | ------ | ---- | ------ |
| 2026-07-20 | Nora | Seeded AC from Winston's ratified evaluation | synced | synced |

---

## Cleanup Items

None yet.

---

## PR Readiness

- [x] No critical or major issues
- [x] Types correct — no `any`, no unsafe `as`
- [x] No stray console.logs or debug artifacts
- [x] Tests written for new logic and edge cases — including the mutation-pinned "overlay never feeds the AGENTS.md block" assertion added in the round-3 fix pass
- [x] All debugged issues resolved (no `open` entries)
- [x] Build passes — last run: 2026-07-20 (`pnpm prism:check` green, including tasks 10–12's, tasks 13–15's, and the round-3 review fixes; 528 tests passing)
- [x] Eric round-3 review Minors addressed — all 3 entries in `## Review Issues` now `fixed` (overlay/AGENTS.md invariant mutation-pinned, `parseRuleLoad` warn-mode disclosure made consistent, `agentsMdRefresh.warnings` split into `ruleLoadWarnings`)
- [x] Briar final delta re-review of `acb3520` — clean, zero new findings; mutation independently reproduced (red on regression, green on revert), no stale field references, plan merge reconciliation confirmed intact
- [x] PR description up to date
- [x] Lasting decisions promoted to architect context (if applicable) — ADR-0070 is the durable artifact; no separate architect-doc promotion needed (see `## Decisions` verdicts above)

**Follow-up PR #431 (issue #426, branch `huntermcgrew/prism-426-adopt-test-warn-noise`) readiness — Briar self-review, 2026-07-20:**

- [x] No critical or major issues
- [x] Tests — 533/533 pass, unchanged; "missing a valid `load:`" occurrences confirmed 14 → 0
- [x] Types correct — `pnpm run prism:check-types` green
- [x] Lint — `pnpm run prism:crossref-lint` green
- [x] No stray console.logs or debug artifacts
- [x] PR description up to date — correctly framed as a no-new-ticket follow-up per `followup-scope.md`
- [ ] `## Sessions` battery entry for this follow-up's own implementation session — missing, see Review Issues (Minor, non-blocking)

**Last updated:** 2026-07-20
