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

---

## Sessions

- 2026-07-20 [huntermcgrew/prism-417-explicit-rule-load-declaration] open: Intent — file the ticket, create the branch, and seed the plan for Winston's ratified Lane 2 explicit-load-declaration work; Bounds — ticket setup only, no code changes, no touching lane 1 or the branch-plan-slim follow-up; Approach — transpose Winston's already-detailed tasks and AC verbatim, record the ratified undeclared-consumer-rule default as a Decision. · close: scope held
- 2026-07-20 [huntermcgrew/prism-417-explicit-rule-load-declaration] open: Intent — implement tasks 2–9 (Clove's lane) plus the absorbed task 1 (ADR), landing the mechanism + migration in one commit and the `pr-description.md` reclassification in a second, per the eval doc's review-readability guidance; Bounds — issue #417 only, no branch-plan.md slim (#418), no lane 1 (routing completeness); Approach — build a shared `rule-load.ts` validator (fail-mode for canonical, warn-mode for consumer-facing callers) so the classifier, both platform dialects, and the platform-copy exclusion all read one source of truth. · close: scope held — all 9 Clove tasks landed; `pnpm prism:check` green; mutation test confirmed the hard-fail; PR-body-authoring persona list corrected against the actual tree (see Decisions) rather than followed verbatim from the eval doc.

---

## History

- 2026-07-20 [huntermcgrew/prism-417-explicit-rule-load-declaration]: Nora created the ticket (#417), branched from `origin/main`, and seeded this plan from Winston's ratified architecture evaluation.
- 2026-07-20 [huntermcgrew/prism-417-explicit-rule-load-declaration]: Landed the `load:` mechanism + migration (all 29 canonical rules and seed twins) in one commit, then `pr-description.md`'s reclassification to `load: skill` in a second — new shared `scripts/ai-skills/rule-load.ts`, classifier/dialect/build/update/doctor changes, Atlas rule-generator `load:` assignment, ADR-0070. `pnpm prism:check` green on both commits; mutation test (strip `load:` from `core-principles.md`) confirmed the named hard-fail.

---

## Debugged Issues

None yet.

---

## Review Issues

None yet.

---

## Acceptance Criteria

### Behavioral

- [x] Given a canonical rule file without a `load:` declaration, When `pnpm prism:build` runs, Then the build fails naming the file. (REQ-2)
  - Evidence: `machine` — mutation run: stripped `load:` from `core-principles.md`, build failed with `core-principles.md: missing or invalid \`load:\` frontmatter declaration...`, reverted; `pnpm prism:build` green after revert.
- [x] Given all canonical rules carry `load:`, When the build runs, Then the AGENTS block, `.claude/rules/`, and `.cursor/rules/` contain exactly the `load: always` set (plus `paths` rules in their path-scoped form), and no `load: skill` rule appears on any always-on platform surface. (REQ-2)
  - Evidence: `machine` — `agents-md-block.test.ts`, `rule-dialect.test.ts`, `content-copy.test.ts` assertions + structural check: `.claude/`, `.codex/`, `.cursor/` rules dirs carry no `pr-description.md`/`.mdc` copy after build.
- [x] Given a consumer repo with a PRISM-managed AGENTS marker pair and a rules directory that changed since the last fill, When `prism update` runs, Then the marker-pair block is regenerated from the consumer's rules and content outside the markers is byte-identical to before. (REQ-2, consumer evidence)
  - Evidence: `machine` — `update.test.ts`: "runUpdate refreshes the consumer AGENTS.md Tier-1 block..." + "runUpdate leaves a consumer AGENTS.md with no marker pair untouched" (outside-markers equality via exact original-content match).
- [x] Given a consumer-owned rule without `load:`, When `prism update` or `prism doctor` runs, Then the file is named in a warning with the remedy, and the effective load set does not change silently. (ratified default)
  - Evidence: `machine` — `update.test.ts` "runUpdate treats a consumer rule missing load: as always-on and warns..."; `doctor.test.ts` "runDoctor warns on a consumer rule missing load:...".
- [ ] Given a session that is not authoring or syncing a PR body, When always-on context loads, Then `pr-description.md` is absent; Given Clove reaches the shipping step, When the trigger fires, Then the rule is read before the PR body is written. (REQ-2)
  - Evidence: `human` — **partially verified, not fully.** Structural half confirmed: `.claude/rules/`, `.codex/rules/`, `.cursor/rules/` carry no `pr-description.md` copy after build (grep/ls check on disk). Positive-case loader evidence: this session's own start injected the full body of every then-frontmatter-less rule as a system-reminder — direct proof presence in `.claude/rules/` triggers auto-load. What was **not** done: a literal fresh cold session with `pr-description.md` now absent, confirming the negative (absence prevents injection) — that requires starting a genuinely new session, which isn't possible from mid-session. Leaving unchecked pending a human cold-session spot check; the design doesn't depend on this either way per ADR-0070's Neutral consequence (skill rules are never copied to the platform surface at all, so there's nothing for an unconfirmed loader behavior to still load).
- [ ] Given Atlas generates a stack rule during onboarding, When the file is written, Then it carries a `load:` declaration chosen in the question flow, and onboarding ends with a fresh AGENTS block. (consumer evidence)
  - Evidence: `human` — **machine half covered, human half not run.** `rule-generators.test.ts` and `atlas-dogfood.test.ts` confirm generated files carry the correct `load:` frontmatter end-to-end through the real generator functions. Not run: a live interactive Atlas onboarding transcript exercising the confirmation-before-write step's new generated-rule summary and the closing `pnpm prism:build` refresh — that requires a live onboarding session against a target repo, out of scope for this implementation pass.

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

- [x] No critical or major issues
- [x] Types correct — no `any`, no unsafe `as`
- [x] No stray console.logs or debug artifacts
- [x] Tests written for new logic and edge cases
- [x] All debugged issues resolved (no `open` entries)
- [x] Build passes — last run: 2026-07-20 (`pnpm prism:check` green on both commits)
- [ ] PR description up to date
- [x] Lasting decisions promoted to architect context (if applicable) — ADR-0070 is the durable artifact; no separate architect-doc promotion needed (see `## Decisions` verdicts above)

**Last updated:** 2026-07-20
