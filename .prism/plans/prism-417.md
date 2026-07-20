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

---

## Sessions

- 2026-07-20 [huntermcgrew/prism-417-explicit-rule-load-declaration] open: Intent — file the ticket, create the branch, and seed the plan for Winston's ratified Lane 2 explicit-load-declaration work; Bounds — ticket setup only, no code changes, no touching lane 1 or the branch-plan-slim follow-up; Approach — transpose Winston's already-detailed tasks and AC verbatim, record the ratified undeclared-consumer-rule default as a Decision. · close: scope held

---

## History

- 2026-07-20 [huntermcgrew/prism-417-explicit-rule-load-declaration]: Nora created the ticket (#417), branched from `origin/main`, and seeded this plan from Winston's ratified architecture evaluation.

---

## Debugged Issues

None yet.

---

## Review Issues

None yet.

---

## Acceptance Criteria

### Behavioral

- [ ] Given a canonical rule file without a `load:` declaration, When `pnpm prism:build` runs, Then the build fails naming the file. (REQ-2)
  - Evidence: `machine` — mutation run: strip `load:` from one rule, observe named failure, revert.
- [ ] Given all canonical rules carry `load:`, When the build runs, Then the AGENTS block, `.claude/rules/`, and `.cursor/rules/` contain exactly the `load: always` set (plus `paths` rules in their path-scoped form), and no `load: skill` rule appears on any always-on platform surface. (REQ-2)
  - Evidence: `machine` — build assertions + `grep -L`/diff checks in tests.
- [ ] Given a consumer repo with a PRISM-managed AGENTS marker pair and a rules directory that changed since the last fill, When `prism update` runs, Then the marker-pair block is regenerated from the consumer's rules and content outside the markers is byte-identical to before. (REQ-2, consumer evidence)
  - Evidence: `machine` — `update.test.ts` fixture asserting block refresh + outside-markers equality.
- [ ] Given a consumer-owned rule without `load:`, When `prism update` or `prism doctor` runs, Then the file is named in a warning with the remedy, and the effective load set does not change silently. (ratified default)
  - Evidence: `machine` — CLI test asserting the warning text and unchanged classification.
- [ ] Given a session that is not authoring or syncing a PR body, When always-on context loads, Then `pr-description.md` is absent; Given Clove reaches the shipping step, When the trigger fires, Then the rule is read before the PR body is written. (REQ-2)
  - Evidence: `human` — cold-session smoke check on both halves.
- [ ] Given Atlas generates a stack rule during onboarding, When the file is written, Then it carries a `load:` declaration chosen in the question flow, and onboarding ends with a fresh AGENTS block. (consumer evidence)
  - Evidence: `human` — scripted onboarding dry-run transcript showing the declaration decision and the closing refresh.

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
