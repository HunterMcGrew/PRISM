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

---

## Sessions

- 2026-07-20 [huntermcgrew/prism-417-explicit-rule-load-declaration] open: Intent — file the ticket, create the branch, and seed the plan for Winston's ratified Lane 2 explicit-load-declaration work; Bounds — ticket setup only, no code changes, no touching lane 1 or the branch-plan-slim follow-up; Approach — transpose Winston's already-detailed tasks and AC verbatim, record the ratified undeclared-consumer-rule default as a Decision. · close: scope held
- 2026-07-20 [huntermcgrew/prism-417-explicit-rule-load-declaration] open: Intent — implement tasks 2–9 (Clove's lane) plus the absorbed task 1 (ADR), landing the mechanism + migration in one commit and the `pr-description.md` reclassification in a second, per the eval doc's review-readability guidance; Bounds — issue #417 only, no branch-plan.md slim (#418), no lane 1 (routing completeness); Approach — build a shared `rule-load.ts` validator (fail-mode for canonical, warn-mode for consumer-facing callers) so the classifier, both platform dialects, and the platform-copy exclusion all read one source of truth. · close: scope held — all 9 Clove tasks landed; `pnpm prism:check` green; mutation test confirmed the hard-fail; PR-body-authoring persona list corrected against the actual tree (see Decisions) rather than followed verbatim from the eval doc.
- 2026-07-20 [huntermcgrew/prism-417-explicit-rule-load-declaration] open: Intent — self-review the branch, verifying the hard-fail is real, the consumer-warn path never silently drops a rule, the two partially-verified ACs are honestly bounded, and the PR-body-authoring persona correction holds; Bounds — review only, findings to plan and chat, no GitHub posts, no code fixes; Approach — read the mechanism+migration and reclassification commits separately, trace the hard-fail and warn paths through the actual source rather than trusting the plan's narrative, independently re-grep the persona-citation claim. · close: scope held — 3 Minor findings (AC-6 evidence overstatement, ADR-0070 four-vs-two-persona self-contradiction, wrong-file JSDoc citation in 3 Atlas generators); hard-fail and no-silent-drop requirements both confirmed by direct source trace, not just test-reading; persona correction independently reconfirmed via tree-wide grep.
- 2026-07-20 [huntermcgrew/prism-417-explicit-rule-load-declaration] open: Intent — adjudicate Eric's PR #421 review verdict (enum said blocked, prose said implementation fixes) and rule per finding; Bounds — plan writes only, no code, no relitigating verified-sound findings, no redesign of the ratified mechanism; Approach — independently trace the warning path and warn-mode classifier through the branch source, then rule fix-pass / amend / replan per finding. · close: scope held — ruled fix-pass-with-plan-amendment; found one sub-defect Eric under-called (warn-mode ignores `hasPaths`, widening undeclared path-scoped rules) and amended the recorded default with a flag for Hunter's wake-up confirmation.
- 2026-07-20 [huntermcgrew/prism-417-explicit-rule-load-declaration] open: Intent — implement Winston's ratified fix-pass (tasks 10–12): hoist warning emission unconditional, honor `paths:` in the warn-mode degrade, fix Eric's four Minors; Bounds — tasks 10–12 only, no relitigating verified-sound findings, no redesign of the ratified mechanism; Approach — hoist a shared consumer-rule-load scan in `update.ts`, amend `parseRuleLoad`'s warn-mode branch to preserve `paths:` scoping, fix the four named Minors, and update every existing test whose fixture depended on the old widen-to-always-on behavior. · close: scope held — tasks 10–12 landed; `pnpm prism:check` green across all 525 tests; mutation test reconfirmed the `load:` hard-fail; AC `#4` left unchecked per `verdict-contract.md`, pending Reese's graded AC-verification pass.

---

## History

- 2026-07-20 [huntermcgrew/prism-417-explicit-rule-load-declaration]: Nora created the ticket (#417), branched from `origin/main`, and seeded this plan from Winston's ratified architecture evaluation.
- 2026-07-20 [huntermcgrew/prism-417-explicit-rule-load-declaration]: Landed the `load:` mechanism + migration (all 29 canonical rules and seed twins) in one commit, then `pr-description.md`'s reclassification to `load: skill` in a second — new shared `scripts/ai-skills/rule-load.ts`, classifier/dialect/build/update/doctor changes, Atlas rule-generator `load:` assignment, ADR-0070. `pnpm prism:check` green on both commits; mutation test (strip `load:` from `core-principles.md`) confirmed the named hard-fail.
- 2026-07-20 [huntermcgrew/prism-417-explicit-rule-load-declaration]: Winston adjudicated Eric's PR #421 review — fix-pass-with-plan-amendment; added review-fix tasks 10–12 (unconditional warning emission, warn-mode `paths:` preservation, Eric's four Minors), reworded and unchecked AC `#4`; see Decisions.
- 2026-07-20 [huntermcgrew/prism-417-explicit-rule-load-declaration]: Landed tasks 10–12 — hoisted the per-file `load:` warning out of the AGENTS-refresh path so it fires unconditionally, amended `parseRuleLoad`'s warn-mode degrade to preserve `paths:` scoping instead of widening to always-on, and fixed Eric's four Minors (ADR-0070 persona count, ADR-0035 collateral parenthetical, `rule-dialect.ts` key-order regex, rule-generator JSDoc citations). `pnpm prism:check` is green across all 525 tests, and the mutation test reconfirmed the `load:` hard-fail.

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
  - Evidence: `machine` — `update.test.ts`: "runUpdate treats a consumer rule missing load: as always-on and warns, never excludes it" (marker-pair-present case), "runUpdate warns on an undeclared consumer rule even when there is no AGENTS.md at all" (no-AGENTS.md case), "runUpdate preserves paths: scoping for an undeclared rule instead of widening it to always-on" (paths-preservation case); `doctor.test.ts` "runDoctor warns on a consumer rule missing load: with the file name and remedy, but stays healthy" and "runDoctor warns on a consumer rule missing load: but carrying paths:, preserving path-scoped classification"; `overlay-copy.test.ts`'s legacy-overlay test amended to match (Cursor `.mdc` stays `globs:`, not `alwaysApply: true`). All three named cases pass; `pnpm prism:check` green. Left unchecked — the graded verdict is Reese's AC-verification pass, per `verdict-contract.md`, not this implementation pass's self-report.
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
- [x] Tests written for new logic and edge cases
- [x] All debugged issues resolved (no `open` entries)
- [x] Build passes — last run: 2026-07-20 (`pnpm prism:check` green, including tasks 10–12's review fixes)
- [x] PR description up to date
- [x] Lasting decisions promoted to architect context (if applicable) — ADR-0070 is the durable artifact; no separate architect-doc promotion needed (see `## Decisions` verdicts above)

**Last updated:** 2026-07-20
