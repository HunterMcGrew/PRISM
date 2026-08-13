# Plan: spec-scope-lint-resolution

## Ticket

Unfiled — no tracker ticket. Prerequisite PR carved out of the `opus5-port` stack by Sol on 2026-08-13, after a PR reviewer's counterfactual showed `pnpm prism:spec-scope-lint` silently no-opping instead of gating. Parent stack: [`.prism/plans/opus5-port.md`](./opus5-port.md) (this plan does not edit that file).

## Goal

Fix the two independent defects that stop `pnpm prism:spec-scope-lint` from ever resolving a plan-first branch's plan, so the trip-wire in `.prism/rules/followup-scope.md` § Spec content never rides an unrelated ticket actually gates in CI instead of exiting 0 on a skip line.

**Branch:** `huntermcgrew/opus5-port-lint-resolution` — the name is load-bearing. Its final segment tokenizes as `[opus5, port, lint, resolution]`, which contains the `opus5-port` plan slug under both today's ordered-contiguous matcher and the relaxed matcher this plan installs. That means the lint resolves the *parent* plan (`opus5-port.md`) on this branch under either code path, so the PR proves the fix rather than depending on it.

---

## Decisions

- **`containsTokenRun`'s ordering and contiguity constraints are both removed; the matcher becomes plain set containment.**
  - **Root cause:** `findUnfiledPlanCandidatesBySlug` requires the plan's filename-slug tokens to appear as an *ordered, contiguous* run inside the branch's final `/`-segment. Branch `huntermcgrew/thrive-port-opus5-rule-amendments` tokenizes as `[thrive, port, opus5, rule, amendments]`; the slug `opus5-port` tokenizes as `[opus5, port]`. Both tokens are present, adjacent even — but reversed. No run matches, `resolveLivePlan` returns null, `evaluateSpecScopeLint` returns `{violations: [], planPath: null}`, and `main()` prints a skip line and returns without a non-zero exit. CI gates on the exit code, so a branch touching always-on spec content with no resolvable plan is indistinguishable from a clean pass.
  - **The docstring's stated justification does not survive inspection.** It reads: *"Token-boundary matching avoids the false positives a raw substring check would allow (a slug `log` must not match inside a branch segment `catalog`)."* That case is closed by `hyphenTokens` + exact string equality — `"catalog" === "log"` is false regardless of position or adjacency. Ordering and contiguity are answering a question tokenization already answered. They are not earning their place.
  - **Alternatives considered:** (a) *unordered contiguous* — every slug token appears in some same-length window of branch tokens, in any order. (b) *set containment* — every slug token appears somewhere in the branch's token list. (c) leave it and rename every branch to satisfy the matcher.
  - **Chosen approach: (b) set containment.** Measured against this repo's live tree at `9c6d6d0e`, (a) and (b) return *identical* results on all four stack branch names and on `huntermcgrew/spec-scope-lint-resolution` — exactly one candidate each, zero ambiguity, across the 20 unfiled plans currently in `.prism/plans/`. When two options are indistinguishable on the data, pick the one that states more simply and deletes more code. (b) is one sentence — *every token of the plan's filename slug appears as a whole token in the branch's final segment* — against (a)'s *every slug token appears in some window of the same length, in any order*, which no reader can hold in their head. (b) also collapses a 12-line nested-loop function to a one-line `every`/`includes`; (a) keeps the window arithmetic and adds a sort. (c) was rejected because branch naming is not a place to encode a lint's implementation detail, and the next plan-first branch would re-break it silently.
  - **Why the relaxation is safe without adding a new guard:** the two guards that actually carry the weight already exist and both stay. `slugTokens.length < 2` rejects one-word slugs as too coincidence-prone, and `findUnfiledPlanBySlug` fails closed (returns null) whenever more than one unfiled plan matches. Only 20 of the plans in the tree read as unfiled at all, and only one of those has a two-token slug.
  - **Implementation guidance:** rename the function to `containsAllTokens` so the name stops promising a behavior the body no longer has, rewrite its docstring to state what the check now guards (whole-token equality) and what it deliberately does not (order, adjacency), and keep both call-site guards unchanged.
  - **→ promotion verdict pending close.**

- **`discriminatorFor` returns the skill directory with no trailing slash.**
  - **Root cause:** for a path under `.ai-skills/skills/**`, the function returns `` `${skillDirectory}/` `` — e.g. `prism-changelog/`. Plans name skill directories bare, in backticks, in prose: `` `prism-architect`, `prism-changelog`, `prism-code-dev` ``. The substring search therefore misses every such mention and Condition B reports the file as unrelated.
  - **Evidence (measured at `9c6d6d0e`, branch `huntermcgrew/thrive-port-opus5-rule-amendments`, 121 changed paths):** running `evaluateSpecScopeLint` with a resolving branch name produces **10 violations, all of them skill bodies, all of them false positives** — every one of the 10 skill directories is named bare in `opus5-port.md`'s non-Ledger text, and none is named with a trailing slash. Widened to all 31 skill directories in the roster, today's discriminator would flag **27**; the bare-name discriminator flags **17** (see the next Decision for what those 17 are).
  - **The rule's own prose already specifies the fixed behavior.** `.prism/rules/followup-scope.md` reads: *"the file's discriminator — its basename, or for a skill body under `.ai-skills/skills/**`, its skill directory."* A skill directory is `prism-changelog`. The slash is an implementation artifact with no prose behind it, so this fix aligns code to spec rather than changing spec — which is why this PR touches no rule file (see the scope Decision below).
  - **Alternatives considered:** keep the slash and teach plans to write paths with trailing slashes (rejected — it makes a lint's internals a plan-authoring convention, and every existing plan is already written the other way); match both slashed and bare forms (rejected — two accepted spellings for one discriminator, with no case that needs the slashed one).
  - **Substring-collision check, run before choosing this:** no skill directory name in the roster is a substring of any other, so a bare-name search cannot cross-clear one skill with a mention of a different one. The existing regression test at `spec-scope-lint.test.ts:273` locks that property and passes unchanged under the fix.
  - **→ promotion verdict pending close.**

- **The 17 skill bodies that still violate after both fixes are genuine violations, not a third defect — and their remedy belongs to PR 3, not to this PR.**
  - **What they are:** `prism-customer-success`, `prism-data`, `prism-doc-walker`, `prism-finance`, `prism-founder`, `prism-legal`, `prism-market-research`, `prism-marketing`, `prism-onboarding`, `prism-prd`, `prism-recruiting`, `prism-refactor-scout`, `prism-retro`, `prism-sales`, `prism-skill-forge`, `prism-standup-summary`, `prism-surface-audit`. Every one is a skill body PR 3 edits and `opus5-port.md` never names individually — its task 21 declares scope with a wildcard (*"In each `.ai-skills/skills/<id>/shared.md`"*) instead of an enumeration.
  - **Why this is the rule working, not failing:** the escape hatch `.prism/rules/followup-scope.md` defines is *"a `## Decisions` entry naming the path and the reason."* Naming the path. Teaching the lint to expand `<id>` or a `*` glob would let one wildcard clear the entire roster for the life of a plan, which is precisely the deliberate-and-named absorption the trip-wire exists to force. A lint that accepts a wildcard as a scope declaration is not a trip-wire.
  - **Alternatives considered:** glob expansion in `isUnrelatedToTicket` (rejected above); pre-emptively enumerating the 17 in `opus5-port.md` as part of this PR (rejected — Sol scoped this lane away from that file, another lane is reviewing a PR that edits it, and a concurrent write is a collision); suppressing skill-body evaluation entirely (rejected — skill bodies are the largest always-on surface the rule names).
  - **Chosen approach:** ship the two fixes, leave the 17 to PR 3, and hand PR 3 its remedy in writing. The remedy is one edit in `opus5-port.md` when PR 3 is authored: either enumerate the 31 skill directories in task 21 the way task 5 already enumerates its 11, or add one `## Decisions` entry naming `.ai-skills/skills/` and the reason. Either satisfies Condition B for all 31.
  - **Blast-radius check — does this PR still go green?** Yes. This branch's own diff is two `scripts/` files, two test files, and this plan. None of them is always-on spec content: `scripts/**` is outside `.ai-skills/skills/`, does not match `.prism/references/review-*.md`, and carries no `load: always` frontmatter, so Condition A never fires. If the branch is cut from PR 1 rather than `main`, PR 1's 10 skill-body edits come along and all 10 clear under the fixed discriminator — measured, not assumed.
  - **→ promotion verdict pending close.**

- **This PR edits no file under `.prism/rules/`, `.ai-skills/skills/`, or `.prism/references/`.** The rule's prose is already correct for both fixes (see the discriminator Decision), so there is nothing to reconcile. This is also self-protective: an always-on rule edit riding this PR would be exactly the pattern the lint gates on, and would need its own `## Decisions` naming entry to pass the check it is fixing. Keeping the PR to `scripts/` + tests + this plan keeps that circularity out of the diff.
  - **→ no promotion needed (scope discipline for one PR, not a durable pattern).**

- **Each fix is tested red-first: the regression test is written and observed failing against unfixed code before the fix lands.** A test authored after the fix proves the code does what the author just wrote, not that the bug is closed — it is written against the fix instead of against the failure, and it stays green if a later refactor reintroduces the bug through a different path. Tasks 1 and 3 below are the red steps and each carries an explicit "observe this fail" verification; tasks 2 and 4 are the green steps. Both bugs are pure functions with no I/O, so the red-green loop costs one test run each.
  - **→ no promotion needed (codified in `.prism/rules/verification-before-done.md` and the `tdd` reference).**

---

## Implementation Tasks

Tasks run in strict sequence 1 → 5. Tasks 1 and 3 are expected to **fail**; that failure is the deliverable, not an error.

### Clove (implementation)

**1. Add the red regression tests for the slug-ordering bug.** In `scripts/ai-skills/lib/resolve-live-plan.test.ts`, append three tests after the existing `"resolveLivePlan: the unfiled-plan-by-slug tier requires at least two hyphenated tokens in the slug"` test (currently at line 357). Use the file's existing `withTempTree` / `writeFile` helpers and the plan-fixture shape from the test at line 245 — a `.prism/plans/<slug>.md` whose `## Ticket` section body is `Unfiled — no tracker ticket.`

- **Test A — reversed order resolves.** Name: `resolveLivePlan: the unfiled-plan-by-slug tier matches slug tokens in any order`. Branch `huntermcgrew/thrive-port-opus5-rule-amendments`, fixture plan `.prism/plans/opus5-port.md`. Assert `resolveLivePlan` returns `.prism/plans/opus5-port.md`.
- **Test B — non-adjacent tokens resolve.** Name: `resolveLivePlan: the unfiled-plan-by-slug tier matches slug tokens separated by an unrelated token`. Branch `huntermcgrew/opus5-lint-port-fix`, same fixture. Assert the same return.
- **Test C — the guard the relaxation must not break.** Name: `resolveLivePlan: the unfiled-plan-by-slug tier does not match a slug token inside a longer branch token`. Branch `huntermcgrew/catalog-porting-notes`, fixture plan `.prism/plans/log-port.md` (slug tokens `[log, port]`; neither `catalog` nor `porting` is an exact token match). Assert `resolveLivePlan` returns `null`. This is the docstring's own substring example, converted into a lock — it must pass **both** before and after task 2.

**Verify:** `node --test scripts/ai-skills/lib/resolve-live-plan.test.ts`. Expected: **Tests A and B fail, Test C passes.** If A or B passes here, stop — the bug is not what this plan describes and the diagnosis needs re-checking before any fix lands.

**2. Replace the ordered-contiguous matcher with set containment.** In `scripts/ai-skills/lib/resolve-live-plan.ts`, replace the whole `containsTokenRun` function (lines 68–87, docstring included) with:

```ts
/**
 * True when every token in `needle` appears somewhere in `haystack` — order
 * and adjacency are not required, because a branch name interleaves the plan
 * slug's words with its own descriptors (`thrive-port-opus5-rule-amendments`
 * carries the `opus5-port` slug reversed, and `opus5-lint-port-fix` carries it
 * split). Whole-token equality is what guards against false positives: a slug
 * token `log` never matches the branch token `catalog`, at any position. The
 * caller supplies the two guards that bound the looseness — a minimum of two
 * slug tokens, and failing closed when more than one plan matches.
 */
function containsAllTokens(haystack: string[], needle: string[]): boolean {
	return needle.length > 0 && needle.every((token) => haystack.includes(token));
}
```

Update the single call site at line 125 from `!containsTokenRun(branchTokens, slugTokens)` to `!containsAllTokens(branchTokens, slugTokens)`. Leave the `slugTokens.length < 2` guard on that same line unchanged.

Then reconcile the two prose references to the old behavior, both in the same file: the module docstring's *"matching an unfiled plan by filename slug"* line needs no change, but `findUnfiledPlanCandidatesBySlug`'s docstring (lines 89–102) says *"whose filename slug appears as a contiguous token run in the branch's final `/`-segment"* — rewrite that clause to *"whose filename slug's tokens all appear in the branch's final `/`-segment"*. No file outside `scripts/ai-skills/lib/` describes this behavior (verified by grep across `.prism/`, `docs/`, and `AGENTS.md` at `9c6d6d0e`; the only other mentions are in plan and audit records, which are historical).

**Verify:** `node --test scripts/ai-skills/lib/resolve-live-plan.test.ts` — all tests green, including A, B, C and the 22 pre-existing ones. Then `grep -rn "containsTokenRun" scripts/` returns nothing.

**3. Add the red regression tests for the discriminator trailing slash.** In `scripts/ai-skills/spec-scope-lint.test.ts`, append two tests to the `isUnrelatedToTicket` block, after the existing test at line 289 (`"naming one file in the skill directory clears every sibling file in that directory"`). Match that block's style — inline `planText` string literals, no temp tree.

- **Test D — bare directory name clears the skill body.** Name: `isUnrelatedToTicket: for .ai-skills/skills/** paths, a plan naming the skill directory without a trailing slash clears the file`. `planText` = ``"## Implementation Tasks\n\n1. Edit 11 skill bodies: `prism-architect`, `prism-changelog`, `prism-code-dev`.\n"``. Assert `isUnrelatedToTicket(".ai-skills/skills/prism-changelog/shared.md", planText)` is `false`.
- **Test E — the guard the fix must not break.** Name: `isUnrelatedToTicket: a bare skill-directory mention inside a Ledger section still does not clear the file`. `planText` = a `## Goal` line followed by a `## History` section whose body reads ``"- 2026-08-13 [branch]: touched `prism-changelog` while fixing the lint."``. Assert `isUnrelatedToTicket(".ai-skills/skills/prism-changelog/shared.md", planText)` is `true` — Ledger stripping runs before the discriminator search, and dropping the slash must not change that.

**Verify:** `node --test scripts/ai-skills/spec-scope-lint.test.ts`. Expected: **Test D fails, Test E passes.** Test E passing before the fix is correct — it locks behavior that already holds.

**4. Drop the trailing slash from the skill-directory discriminator.** In `scripts/ai-skills/spec-scope-lint.ts`, in `discriminatorFor` (line 318), change:

```ts
		return `${skillDirectory}/`;
```

to:

```ts
		return skillDirectory;
```

In the same function's docstring (lines 302–317), change the parenthetical *"the discriminator there is the skill directory itself (`prism-architect/`)"* to *"the discriminator there is the skill directory name itself (`prism-architect`)"*, and append one sentence: *"The name is matched bare rather than as a path segment because plans name skill directories in prose, not as paths; no skill directory name is a substring of another, so a bare match cannot cross-clear a different skill."*

**Verify:** `node --test scripts/ai-skills/spec-scope-lint.test.ts` — all tests green, including D, E, and the pre-existing cross-skill guard at line 273.

**5. Prove the fix end to end against the live tree, then commit.** Run the full gate and the live counterfactual.

- `pnpm prism:check-types` — exit 0.
- `pnpm prism:test` — exit 0.
- `pnpm prism:check` — exit 0, zero drift.
- **Live counterfactual (the criterion that matters):** from the repo root on this branch, run `npx tsx scripts/ai-skills/spec-scope-lint.ts`. Expected output: `spec-scope-lint passed. No unrelated spec content found.` — **not** a line beginning `spec-scope-lint: no live plan resolved`. A skip line here means resolution is still broken and the PR is not done.
- Commit per `.prism/rules/git-conventions.md` § Commit Messages: `chore: Fix the two defects that make spec-scope-lint silently no-op`, with a body naming both bugs and citing `.prism/plans/spec-scope-lint-resolution.md`. Do not amend tasks 1–4 into one commit — the red-then-green boundary is worth reading in `git log`.

---

## Acceptance Criteria

Baselines measured on `huntermcgrew/thrive-port-opus5-rule-amendments` at `9c6d6d0e`, 2026-08-13.

### Behavioral

- [x] **AC-1.** Given a plan-first branch whose name carries the plan's filename-slug tokens in a different order than the slug, When `resolveLivePlan` runs, Then it resolves that plan.
  - *Evidence (machine):* Test A in `scripts/ai-skills/lib/resolve-live-plan.test.ts` passes, **and** was observed failing at task 1 before task 2 landed. Both halves required — a test that never failed is written against the fix, not against the bug.
- [x] **AC-2.** Given a plan-first branch whose name separates the slug's tokens with an unrelated token, When `resolveLivePlan` runs, Then it resolves that plan.
  - *Evidence (machine):* Test B passes and was observed failing at task 1.
- [x] **AC-3.** Given a plan slug token that appears only as a substring of a longer branch token, When `resolveLivePlan` runs, Then it does not resolve that plan.
  - *Evidence (machine):* Test C passes both before task 2 and after it. A single green run after the fix does not satisfy this criterion — the point is that the relaxation did not widen the match.
- [x] **AC-4.** Given a plan that names a skill directory bare in its non-Ledger text, When Condition B evaluates a file inside that directory, Then the file is treated as related.
  - *Evidence (machine):* Test D passes and was observed failing at task 3.
- [x] **AC-5.** Given a plan that names a skill directory only inside a Ledger section, When Condition B evaluates a file inside that directory, Then the file is still treated as unrelated.
  - *Evidence (machine):* Test E passes, and the pre-existing cross-skill guard at `spec-scope-lint.test.ts:273` passes unchanged.
- [x] **AC-6.** Given this PR's branch, When `pnpm prism:spec-scope-lint` runs, Then it reports a real verdict rather than skipping.
  - *Evidence (machine):* `npx tsx scripts/ai-skills/spec-scope-lint.ts` prints `spec-scope-lint passed. No unrelated spec content found.` and exits 0. Confirmed on `huntermcgrew/opus5-port-lint-resolution` — resolves `.prism/plans/opus5-port.md` as the single unfiled-slug candidate.

### Non-behavioral

- [x] **AC-7.** The old matcher name leaves no live references.
  - *Evidence (machine):* `grep -rn "containsTokenRun" scripts/ .prism/rules/ .prism/references/` returns nothing.
- [x] **AC-8.** No prose in the tree still describes the removed ordered-contiguous behavior.
  - *Evidence (machine):* `grep -rn "contiguous token run" scripts/ .prism/rules/ .prism/references/ .ai-skills/ docs/ AGENTS.md` returns nothing. `.prism/plans/` and `.prism/audits/` are excluded deliberately — they are historical record of the bug.
- [x] **AC-9.** The PR carries no always-on spec content.
  - *Evidence (machine):* `git diff --name-only origin/main...HEAD` lists only `scripts/ai-skills/lib/resolve-live-plan.{ts,test.ts}`, `scripts/ai-skills/spec-scope-lint.{ts,test.ts}`, and this plan file. No path under `.prism/rules/`, `.ai-skills/skills/`, or `.prism/references/review-*.md` appears.
- [x] **AC-10.** The full gate is green.
  - *Evidence (machine):* `pnpm prism:check-types`, `pnpm prism:test` (667 tests), and `pnpm prism:check` each exit 0, zero drift.
- [x] **AC-11.** The 17 skill bodies PR 3 will trip on are recorded before PR 3 is authored, so their remedy is a planned edit rather than a CI surprise.
  - *Evidence (human):* the third `## Decisions` entry in this plan names all 17 and states the one-line remedy. Verified by reading it, not by a command.

### AC Adjustments

### AC Sync Log

| Date | Agent | Action | Plan | Ticket |
| ---- | ----- | ------ | ---- | ------ |
| 2026-08-13 | Winston | AC created in plan; no tracker ticket exists for this lane | ✓ | N/A |

---

## Review Issues

No issues found — 2026-08-13 [huntermcgrew/opus5-port-lint-resolution]

---

## PR Readiness

- [x] No critical or major issues
- [x] Types correct — no `any`, no unsafe `as`
- [x] No stray console.logs or debug artifacts
- [x] Tests written for new logic and edge cases — 5 new tests, each independently confirmed red-first against the pre-fix commit in a scratch worktree
- [x] All debugged issues resolved (no `open` entries) — plan carries none
- [x] Build passes — last run: 2026-08-13 (`pnpm prism:check`, zero drift; `pnpm prism:test`, 667 tests)
- [x] PR description up to date — matches the diff and the verified test/AC evidence
- [ ] Lasting decisions promoted to architect context — correctly deferred; all three Decisions carry `→ promotion verdict pending close`, and this plan is not closing in this PR

**Last updated:** 2026-08-13

---

## Sessions

- 2026-08-13 [huntermcgrew/thrive-port-opus5-rule-amendments] open: Intent — plan a small prerequisite PR fixing the two defects that make `spec-scope-lint` no-op, and answer what happens to the false positives resolution will surface; Bounds — write only `.prism/plans/spec-scope-lint-resolution.md`, never touch `opus5-port.md`, no code, no subagents; Approach — run the counterfactual against the live tree and measure every claimed number rather than inheriting the reviewer's estimate · close: scope held — one file written; the reviewer's "~25 false positives" estimate was measured as 27 under today's discriminator and 17 after the fix, and the 17 were classified against the rule's actual text rather than assumed to be a defect.
- 2026-08-13 [huntermcgrew/opus5-port-lint-resolution] open: Intent — implement the plan's 5 tasks (two red-first fixes) so `spec-scope-lint` gates instead of no-opping; Bounds — touch only the two lib/test file pairs plus this plan file, leave `opus5-port.md` and `.prism/plans/conductor/`/`.prism/research/` untouched; Approach — run each red test to observed failure before writing its fix, then the full gate and the live counterfactual before shipping · close: scope held — diff is exactly `resolve-live-plan.{ts,test.ts}`, `spec-scope-lint.{ts,test.ts}`, and this plan; all 11 AC items verified with the cited evidence; PR #458 opened as draft.
- 2026-08-13 [huntermcgrew/opus5-port-lint-resolution] open: Intent — self-review PR #458's two-defect spec-scope-lint fix (set-containment matcher, bare skill-directory discriminator) per Sol's five scrutiny items; Bounds — the two lib/test file pairs plus this plan, findings chat-only, no GitHub posts, no merge; Approach — verify the two surviving guards by direct code read, confirm true red-first history by checking out the pre-fix commits in scratch worktrees and re-running the exact tests, and verify the substring-collision and four-branch-resolution claims by running the real functions against the live tree rather than trusting the plan's prose · close: scope held — zero critical/major findings; all five review items verified with direct evidence (worktree test runs, live script output, programmatic substring check).

---

## History

- 2026-08-13 [huntermcgrew/thrive-port-opus5-rule-amendments]: Created this plan — 5 tasks across two pure-function fixes in `scripts/ai-skills/lib/resolve-live-plan.ts` and `scripts/ai-skills/spec-scope-lint.ts`, each tested red-first. Measured the live counterfactual at `9c6d6d0e`: 10 violations on PR 1's diff, all false positives from the trailing-slash discriminator, all clearing after the fix. Classified the 17 remaining roster-wide violations as genuine and routed their remedy to PR 3; see Decision 3.
- 2026-08-13 [huntermcgrew/opus5-port-lint-resolution]: Implemented all 5 tasks — `containsTokenRun` renamed `containsAllTokens` (set containment), `discriminatorFor` drops the trailing slash. Both fixes tested red-first (5 new tests, each observed failing before its fix landed). Full gate green (667 tests, zero drift); live counterfactual on this branch prints the pass line, not a skip line. Opened PR #458 as draft.
