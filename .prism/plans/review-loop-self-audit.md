# Plan: review-loop-self-audit

**Verdict: proceed with changes.** The three reported defects are real and they are not three problems — they are one missing concept plus one missing gate. The review loop has no notion of *which surface a finding landed on*, so it cannot tell work it was invoked to review from work it authored itself. Introduce that concept (a frozen loop base and three named surfaces), and the convergence signal and the severity gate both fall out of it as derivations rather than as new machinery. The spec-content trip-wire is genuinely separate and needs its own mechanism, keyed on what was touched rather than on how big the edit was. The code-vs-docs drift detector is a fourth thing and goes to its own ticket.

## Ticket

None yet — Nora files from this plan (see `## Implementation Tasks` → Nora).

## Goal

Give the review loop a scope boundary that distinguishes the diff it was invoked to review from the text it wrote itself, so a gauntlet pass cannot generate its own backlog.

---

## Decisions

- **One frozen ref, three named surfaces. Every other fix in this plan derives from it.**
  - **Root cause:** the loop's review target is the live branch diff (`git diff <default-branch>...HEAD` for the self-review persona, `gh pr diff <n>` for the PR-review persona). Both resolve at the moment the pass runs, so every fix commit the loop lands joins the surface the next pass reviews. Nothing in `.ai-skills/skills/prism-review-loop/shared.md` distinguishes "the diff I was invoked on" from "the diff I created." The loop is therefore structurally non-terminating whenever the reviewer's finding rate on loop-authored text is above zero — which is the observed behavior in both recorded instances.
  - **Alternatives considered:** (a) bound every pass to the original pre-review diff and never re-review loop output; (b) cap findings by severity — only Major and above earn a fix pass; (c) cap the number of consecutive passes that may raise a finding in the same file; (d) leave the surface unbounded and rely on the existing 20-pass budget.
  - **Chosen approach:** freeze `loopBase = git rev-parse HEAD` at loop start and derive three surfaces from it. **Subject** = `git diff $(git merge-base <default-branch> $loopBase) $loopBase` — the work the loop was invoked to review. **Repair** = `git diff $loopBase HEAD` — changes the loop authored to the subject. **Ledger** = the plan file, `## Review Issues` entries, `## History` appends, and `.prism/lessons.md` — text the loop authored *about itself*. Beats (a): a repair that breaks something would never be seen, which the exception below fixes without discarding the boundary. Beats (b): severity was never the discriminator — the recorded PRISM instance graded its self-audit findings Major, and they were still self-audit. Beats (c): a file-frequency cap punishes a file the ticket legitimately keeps touching and lets self-audit through anywhere else. Beats (d): the budget is a symptom limiter, not a boundary — a third of a budget spent before anyone noticed is the evidence that it does not bound the right thing.
  - **Implementation guidance:** the split is a *loop* construct, not a reviewer construct. Briar and Eric invoked standalone still review the full branch diff — that is correct and stays. The loop expresses the boundary in its dispatch text, so no reviewer skill body changes. Both reviewers already accept scope framing (the self-review skill's Phase 1 carries a follow-up-review path that scopes to a delta), so the mechanism exists.
  - **→ promotion verdict pending close.**

- **The repair surface is regression-only, and "regression" is four enumerable anchors — not a judgment call.**
  - **Root cause:** a hand-waved exception swallows the rule. "Review loop output only when something looks wrong" restores the unbounded surface under a different name, because *anything* can be made to look wrong in prose.
  - **Alternatives considered:** exempt loop-authored text entirely; allow re-review only of source files, never of markdown; require the architect persona to adjudicate every repair-surface finding.
  - **Chosen approach:** a finding on the repair surface is admissible only when the reviewer names one of exactly four anchors, and records which one: (1) a **failing command** — a named test, build, type-check or `pnpm prism:check` invocation that passes at `loopBase` and fails at `HEAD`; (2) a **violated acceptance criterion**, cited by its AC ID; (3) a **contradicted Decision**, cited by its `## Decisions` title; (4) **the originally-raised finding is still true** — quote it and show it unclosed. No anchor, no finding. Beats the source-only variant, which would have missed nothing in either recorded instance and blocks nothing useful. Beats architect adjudication, which is a fix whose failure mode is more passes.
  - **Implementation guidance:** three of the four anchors are mechanically checkable (a command, an AC ID, a Decision title), and the fourth is a quotation. The scoreboard records the named anchor beside each repair-surface finding, so a rationalized anchor is visible to the human reading the scoreboard rather than buried in a fix commit.
  - **→ promotion verdict pending close.**

- **The repair surface is out of full-bar scope for *this* loop only, and becomes subject on the next one.**
  - **Root cause:** "review-authored text is out of scope" reads as permanently unreviewable, which is a real objection and would be a real defect.
  - **Chosen approach:** `loopBase` is per-invocation. A second gauntlet run on the same branch re-freezes at the then-current `HEAD`, so everything the first run authored is subject at full bar in the second. Nothing is permanently exempt; the exemption is scoped to the pass sequence that created the text, which is exactly the window where re-review cannot converge.
  - **Implementation guidance:** state this explicitly in the skill body next to the surface definitions. A reader who meets the boundary without meeting its expiry will read it as a permanent hole and work around it.
  - **→ promotion verdict pending close.**

- **The ledger surface is not reviewed during the loop at all. It is swept once, deterministically, at close.**
  - **Root cause:** PRISM's own recorded instance is entirely this. `.prism/plans/response-shape-contract.md` § Review Issues on `main` (PR #446, merged as `d28f2aaf`) records eight review passes and states the pattern in its own words: the same defect species landed on passes 1, 2 and 3 — a claim the shipping commit had already invalidated, left standing in the plan — and "three review passes were spent on bookkeeping, not on the rule." A downstream repository running this skill set recorded the sibling case on the repair surface: two consecutive passes produced zero findings in the feature under review while still producing findings, all of them in text the cycle had itself written.
  - **Alternatives considered:** review the ledger but only on the final pass; review it at half bar; leave it in scope and rely on reviewer restraint.
  - **Chosen approach:** exclude it from every pass, and let the already-queued plan-drift work own its correctness. The queued design is recorded under `pendingHumanReport` in `.prism/conductor-state.json`: Layer 1 widens `.prism/rules/implementation-task-detail.md` § "Cite, don't restate" to plan-internal restatement, so a reversal has one home and there is nothing to sweep; Layer 2 adds two deterministic hard errors — a dangling Decision citation and an unswept reversal. That is a check, not a pass. Beats "final pass only" (still a pass, still generates repair work at the moment the loop is trying to close) and beats reviewer restraint (the recorded instance *is* three consecutive failures of reviewer restraint by two different reviewer personas).
  - **Implementation guidance:** this creates a real dependency. If the queued Layer 2 check does not land, the ledger goes unchecked between the loop's exclusion and the human's pre-merge read. Name the dependency in the skill body rather than letting it be discovered. The human read before merge is the interim backstop, and it is a genuine one — PRISM's own instance was caught by a human reading the ledger, not by a pass.
  - **→ promotion verdict pending close.**

- **The convergence signal is the loop's exit condition, not a warning — and it converts leftovers instead of discarding them.**
  - **Root cause:** today the loop exits on "a pass returns zero findings," where "findings" counts every surface. That condition is unreachable when the loop is generating its own findings, which is why the budget is what actually ends these runs.
  - **Alternatives considered:** keep "zero findings" and add a separate warning when subject findings hit zero twice; charge repair-surface passes against a smaller sub-budget; make the signal advisory and let the operator decide.
  - **Chosen approach:** redefine the exit as **subject-clean**: two consecutive passes with zero admissible findings on the subject surface, with every admitted repair-surface finding closed. When it fires, the loop stops and every outstanding non-subject observation is written into the scoreboard as a follow-up item per `.prism/rules/followup-scope.md`, not fixed in-cycle. A warning would leave the operator to make the same call under the same pressure that produced the observed runs. A repair sub-budget adds a second number to tune with no evidence about where to set it.
  - **Implementation guidance:** this depends on the surface split — subject findings cannot be counted before subject exists. Sequence the tasks accordingly. The 20-pass budget stays exactly as it is; subject-clean is expected to fire well before it, and the budget remains the backstop for the case where it does not.
  - **→ promotion verdict pending close.**

- **No new severity taxonomy. Provenance × existing severity is the gate, and provenance is computed, not judged.**
  - **Root cause:** the proposed real / marginal / self-inflicted split mixes two orthogonal axes. "Self-inflicted" is a provenance fact about which surface a finding landed on; "real vs marginal" is a severity judgment. Collapsed into one list, the taxonomy has no cell for a finding that is both self-inflicted *and* real — a repair that broke something, which must be fixed.
  - **Alternatives considered:** adopt the three-way taxonomy as stated; adopt it with a fourth "self-inflicted but real" class; gate on severity alone (fix Major and above, defer Minor).
  - **Chosen approach:** keep Critical / Major / Minor unchanged and let the surface split supply provenance for free. The gate is the cross product, and it needs no new judgment: **subject** — fix in cycle at every severity; **repair** — fix in cycle only if it cleared the four-anchor admissibility test, and nothing else is raisable; **ledger** — not raised during the loop, swept once at close. "Marginal" dissolves rather than needing a definition: a marginal observation on the subject surface is a Minor and still gets fixed, which terminates because the subject surface is frozen and finite; a marginal observation on the repair surface fails admissibility and never becomes a finding. Rejected severity-only gating on the evidence — PR #446's self-audit findings were graded Major.
  - **Implementation guidance:** ship the gate as a three-row table in the skill body. Do not add a taxonomy vocabulary anywhere — the whole value of this call is that there is nothing new for a reviewer to learn or misapply.
  - **→ promotion verdict pending close.**

- **The spec-content trip-wire keys on the `load:` frontmatter that already exists, plus a plan-mention test. It is mechanically enforceable, and it fails permissive by design.**
  - **Root cause:** `.prism/rules/followup-scope.md` already forbids unrelated work riding a ticket, and it was ignored because each edit looked like a one-liner. Size is what already failed, so the test cannot be keyed on size. Note what does *not* separate the two contrast cases: "is it markdown" fails (feature docs are markdown and correctly ride the feature PR), and "is it an always-on rule" also fails — in the fold-in case the artifact under change *is* a Tier 1 always-on rule.
  - **Alternatives considered:** a size or file-count threshold; a "markdown in a feature PR" trip-wire; a hand-maintained list of protected paths; reviewer prompting with no mechanical check.
  - **Chosen approach:** two conditions, both computable. **Condition A — is this process/spec content?** Yes when the canonical source declares `load: always` in its frontmatter, or is a skill body under `.ai-skills/skills/**`, or is `.prism/lessons.md`, or is a shared review reference at `.prism/references/review-*.md`. Every file under `.prism/rules/` already carries an explicit `load:` value, so no new registry is needed — the classifier reads a field the repo maintains anyway. **Condition B — is it unrelated to the ticket?** Yes when the file's basename appears nowhere in the branch's live plan file *and* no `## Decisions` entry names its path. A hard error fires only when both conditions hold. Rejected the size threshold on the operator's own evidence. Rejected the markdown trip-wire because it would block the documentation discipline this repo is deliberately building. Rejected a hand-maintained path list because it drifts and duplicates the `load:` field.
  - **Implementation guidance:** evaluate canonical sources only; build mirrors under `.claude/`, `.codex/`, `.cursor/` and `templates/install/` inherit their source's verdict, so they need no separate rule. Scope to live plans and exclude `.prism/archived/` — a frozen record must not fail a live invariant, which is the same constraint the queued Layer 2 check carries. The escape hatch is the point of the design: an author who genuinely needs the edit adds a `## Decisions` entry naming the path and the reason, which is the documented-absorption shape `.prism/rules/branch-plan.md` already defines for cross-lane work. That turns "it's just one line" into a Decision entry, and writing the Decision is where the author notices it does not belong.
  - **Both contrast cases, checked:** *Fold in* — a contract rollout reaching a second surface of the same artifact. The second surface's basename is the same basename the plan's Goal and tasks already name, so Condition B is false and no error fires. In PRISM's own case this is the seed twin at `templates/install/.prism/rules/response-shape.md` against a plan that names `response-shape.md` throughout. *Back out* — an always-on rule edited during review of an unrelated feature. Condition A is true, its basename appears nowhere in that ticket's plan, no Decision names it, so the error fires. The check separates the pair on the axis that actually differs.
  - **Known false negative, accepted:** a basename that appears in the plan for an unrelated reason — cited in prose while being edited for something else — passes Condition B and the error does not fire. This is a permissive failure: it lets something through, it never blocks correct work. That bias is deliberate. A check that catches the back-out case by also catching the fold-in case is worse than no check, so the design errs toward under-firing.
  - **→ promotion verdict pending close.**

- **Real code-vs-docs drift detection goes to a separate ticket.**
  - **Root cause:** it is a missing capability, not a broken guardrail. Every other item in this plan *narrows* what review looks at; that one *widens* it. A plan whose Goal needs an "and" to hold both is two plans.
  - **Alternatives considered:** fold it in as a final task here; fold it in as an epic sibling.
  - **Chosen approach:** separate ticket, sequenced after this one. Two of `.prism/rules/followup-scope.md`'s four signals point to splits — different persona class (a detector is a lint or a reviewer checklist, not loop mechanics) and a different system (the docs surface, not the review ladder). The sequencing argument is the stronger one: a drift detector needs to know where to look, and "code changed, docs did not" is a query about files *outside* the diff. Built today against an unbounded review surface, it lands as one more thing every pass audits — the exact multiplication this ticket removes. It is also not greenfield: `.prism/references/review-docs-impact.md` already carries a weak code-to-docs staleness scan, so the follow-up is "strengthen and make it deterministic," which is a scoped ticket rather than an open-ended one.
  - **→ promotion verdict pending close.**

- **`resolveLivePlan` gets a fourth tier: an unfiled plan matched by filename-slug token-run, for branches with no ticket-id token at all.**
  - **Root cause:** the resolver's three named tiers all key off `extractTicketId`, so a branch cut before Nora files a ticket — this ticket's own branch — has no ticket id to key on and the resolver returns `null` unconditionally, even though a real, current plan governs the branch.
  - **Alternatives considered:** treat the gap as a documented, per-branch exemption in `## Decisions` instead of fixing the resolver. Rejected: the ticket exists to replace developer-discipline reliance with mechanical enforcement, and a manual per-branch exemption is exactly the discipline-reliance this ticket removes elsewhere — it would leave every plan-first branch's entire pre-ticket lifecycle unenforced by default.
  - **Chosen approach:** when `extractTicketId` returns null, scan `.prism/plans/*.md` for a plan whose `## Ticket` field reads as unfiled (empty, or opening with "none"/"n/a"/"tbd"/"unfiled") and whose filename slug appears as a contiguous, in-order token run inside the branch's final `/`-segment (e.g. slug `review-loop-self-audit` inside branch segment `prism-review-loop-self-audit`). Requires at least two hyphenated tokens in the slug and exactly one matching plan — zero or multiple matches return `null` rather than guess, matching the fail-closed discipline `findPlanByTicketField`'s boundary-anchored match already applies to the ticket-id-prefix-collision case.
  - **Implementation guidance:** the new tier lives in `resolve-live-plan.ts` as `findUnfiledPlanBySlug`, invoked only when `extractTicketId` returns null; the three ticket-id-keyed tiers are unchanged. Never reads `.prism/archived/`, matching every other tier.
  - **→ no promotion needed (implementation detail of the shared resolver, already documented in the module's own JSDoc).**

- **`run-tests.ts`'s test discovery is recursive, not top-level-only — a latent gap this fix exposed.**
  - **Root cause:** `run-tests.ts` discovers test files with a single non-recursive `readdirSync(scriptDirectory)`, so `resolve-live-plan.test.ts` — added under `scripts/ai-skills/lib/` in the pass-1 fix — was never actually executed by `pnpm prism:test`. Every prior pass's "N tests passing, all green" claim was true of the tests that ran, but silently excluded this file's tests the entire time; the fix could not be verified through the project's own standard verification command until this was closed.
  - **Chosen approach:** `readdirSync(scriptDirectory, { recursive: true })`, filtered to `.test.ts` entries. Node 20 (CI's pinned version, per `.github/workflows/prism-check.yml`) supports the `recursive` option. Fixed in the same commit as the resolver tier because the resolver fix was unverifiable without it — same file family, blocking the verification this exact task needed.
  - **Implementation guidance:** the discovered-file count is now 616 (up from 598) — the delta is `resolve-live-plan.test.ts`'s 18 tests, previously silent.
  - **→ no promotion needed (build-pipeline implementation detail, not a product-facing decision).**

- **The two lints compose; build them against a shared plan resolver.**
  - **Root cause:** the trip-wire in this plan and the queued Layer 2 plan-drift check are the same species — plan-versus-tree consistency lints, in the same script family, under the same live-plans-only scope constraint.
  - **Chosen approach:** both read the branch's live plan through one shared helper rather than each resolving it their own way. Two independent resolvers would disagree on which plan a branch owns, and the disagreement surfaces as a lint that fires on the wrong ticket.
  - **Non-collision check:** the queued Layer 1 widens "Cite, don't restate" to plan-internal restatement — a task cites `see Decision: <title>` instead of repeating its conclusion. This plan's Condition B requires the plan to *name file paths*, which the detail bar in `.prism/rules/implementation-task-detail.md` already requires. Citing rather than restating a Decision's conclusion and naming a target path are different obligations; the two designs do not fight.
  - **→ promotion verdict pending close.**

---

## Sessions

- 2026-07-25 [huntermcgrew/prism-review-loop-self-audit] open: Intent — design the fix for a review loop that audits its own output instead of converging, across two independently observed instances; Bounds — this plan file only on a new branch off `origin/main`, no rule or skill edits, no PR, `pnpm prism:check` exit 0; Approach — find the one missing concept underneath the three reported defects rather than writing three independent guardrails, and check any trip-wire against both halves of the fold-in / back-out contrast before proposing it · close: scope held — one new plan file, no rule, skill, script, or config touched; `pnpm prism:check` exit 0; the fourth candidate defect routed to its own ticket rather than absorbed.
- 2026-07-25 [huntermcgrew/prism-review-loop-self-audit] open: Intent — implement Clove tasks 1-5 exactly as specified (review surfaces + subject-clean exit + disposition table, the shared plan resolver, the spec-scope lint with its three required fixtures, and the trip-wire's rule home), then rebuild and verify; Bounds — touch only the canonical sources the tasks name, never hand-edit `.claude/`/`.codex/`/`.cursor/`/`templates/install/` mirrors, commit and push only, no PR; Approach — insert the verbatim blocks for tasks 1-3 as given, extract the resolver before the lint per the stated sequence, and implement Condition A/B as the simplest logic that satisfies all three AC-6 fixtures without extra machinery · close: scope held — touched exactly the files tasks 1-5 name plus their build-regenerated mirrors (AGENTS.md and the platform copies); task 2's own `grep` verification is internally inconsistent with its required verbatim text (documented in `## History`, not a build defect); `pnpm prism:check-types`, `pnpm prism:test`, `pnpm prism:build` (twice, idempotent), and `pnpm prism:check` all ran and exit 0.
- 2026-07-25 [huntermcgrew/prism-review-loop-self-audit] open: Intent — grade AC-1 through AC-9 against the branch diff as an independent judge, running each machine criterion's exact command plus its stated positive control; Bounds — read-only on every graded surface, writing only the verdict report and the plan's `## History` pointer, no fixes and no source edits; Approach — run each criterion's evidence verbatim rather than a paraphrase, treat any failed positive control as UNGRADEABLE(harness) rather than UNMET, and leave the three human-tagged criteria ungraded rather than simulating a gauntlet · close: scope held — every machine criterion (AC-4 through AC-9) MET on executed evidence with all positive controls passing; the tree was clean before the first probe and after the last, and the only writes are the report at `.prism/qa/ac-verification-review-loop-self-audit.md` and this plan's `## History` and `## Sessions` lines.
- 2026-07-25 [huntermcgrew/prism-review-loop-self-audit] open: Intent — self-review (gauntlet pass 1) the branch's diff against origin/main (the AC verification's PR-#446-included stat was stale; the real subject is ~1075 lines across the skill body, the two new scripts, and the followup-scope rule addition) for correctness beyond what the grep-based ACs check; Bounds — subject surface only per the review-surfaces design this PR itself implements, no findings against plan ledger prose (`## History`/`## PR Readiness`/`## Review Issues`), no fixes, record findings and land a plan-only commit; Approach — diff-read every non-mirror canonical file, independently re-run every machine AC command rather than trust the prior report, and verify each Decision's factual claims (e.g. the mirror-inherits-verdict claim) against the actual build code and git history rather than the prose alone · close: scope held — 2 major + 1 minor finding recorded in `## Review Issues`, both majors confirmed against source (a `marked` CommonMark lex for the heading break, `seed-curation.json` + `build.ts` + PR `#442`/`#443` for the curated-twin gap); no source files touched.
- 2026-07-25 [huntermcgrew/prism-review-loop-self-audit] open: Intent — fix all 3 open `## Review Issues` entries from Briar's pass 1 (broken ATX heading, curated-seed-twin lint gap, untested plan resolver); Bounds — touch only the files each finding names plus their mirrors/tests, no other source changes, update the plan's Review Issues/History/PR Readiness, then commit and push; Approach — apply each finding's suggested fix, independently verify each one (re-lex the heading fix with `marked`, add regression fixtures for the lint gap, add the missing test file), rebuild mirrors, run `pnpm prism:check` · close: scope held — all 3 findings fixed and independently verified, `pnpm prism:check-types`/`prism:test`/`prism:check` all exit 0, no unrelated files touched.
- 2026-07-25 [huntermcgrew/prism-review-loop-self-audit] open: Intent — self-review (gauntlet pass 2) the subject diff (origin/main...HEAD, the real base — local `main` was stale) against the plan's Decisions and AC, per this ticket's own subject/repair/ledger split; Bounds — subject surface only, no findings against `## History`/`## PR Readiness`/`## Review Issues` prose, no fixes, record findings and land a plan-only commit; Approach — diff-read every canonical (non-mirror) file, independently re-run `pnpm prism:build`/`pnpm prism:check`, and adversarially probe the two new scripts' branch/ticket-id resolution logic (the exact class of bug pass 1 already fixed once) rather than trust it was fully swept · close: scope held — found and independently confirmed 1 critical (spec-scope-lint's `main()` never fires in CI — detached HEAD yields an empty branch name, reproduced directly) + 1 major (the `## Ticket` field-scan fallback's unanchored substring match misresolves on a ticket-id prefix collision, reproduced directly); no source files touched.
- 2026-07-25 [huntermcgrew/prism-review-loop-self-audit] open: Intent — fix both open `## Review Issues` entries from Briar's pass 2 (detached-HEAD CI silent-skip, ticket-id prefix-collision misresolve); Bounds — touch only `spec-scope-lint.ts` and `resolve-live-plan.ts` plus their test files, no rule/skill edits (the worktree instructions forbid detaching this checkout's HEAD, so the CI fix is verified via `GITHUB_HEAD_REF` env-var injection instead), commit and push only; Approach — read `GITHUB_HEAD_REF` before falling back to `git branch --show-current`, and anchor the ticket-id field-scan match to token boundaries the same way `extractTicketId` already does, each with regression tests and an independent non-detaching repro · close: scope held — both findings fixed, `pnpm prism:check-types`/`prism:test`/`prism:check` all exit 0, no unrelated files touched.
- 2026-07-25 [huntermcgrew/prism-review-loop-self-audit] open: Intent — self-review (gauntlet pass 3) the subject diff (origin/main...HEAD) against the plan's Decisions and AC per this ticket's own subject/repair/ledger split, focused on whether the pass-2 CI fix actually closes the CI-enforcement gap it targeted; Bounds — subject surface only, no findings against `## History`/`## PR Readiness`/`## Review Issues` prose per this session's explicit scope note, no fixes, record findings and land a plan-only commit; Approach — re-verify pass-1 and pass-2 fixes are still intact, then adversarially probe `main()`'s git-ref resolution (the one code path still with zero test coverage per pass 2's own finding) by reproducing CI's actual `actions/checkout@v4` default (single-branch, depth-1) via a real git clone rather than trusting the local full-history worktree · close: scope held — found and directly reproduced 1 critical (`resolveMergeBaseRef`/`main()` fails to resolve any merge-base under CI's real shallow-checkout default, independent of the pass-2 fix); no source files touched, only this plan file.
- 2026-07-25 [huntermcgrew/prism-review-loop-self-audit] open: Intent — self-review (gauntlet pass 5) the subject diff (origin/main...HEAD, ~2,394 lines across 15 canonical files — local `main` was again stale/diverged, matching the pass-3 note) against the plan's Decisions and AC, skipping prose findings against the plan's own `## History`/`## PR Readiness`/`## Review Issues` bookkeeping per this session's explicit scope note; Bounds — full subject surface, no fixes, record findings and land a plan-only commit; Approach — re-verify all four prior fixes are intact via a live `pnpm prism:check-types`/`prism:test`/`prism:build`/`prism:check` run rather than trusting the plan's own record, then adversarially probe the one part of the resolver chain no prior pass had reproduced against real data: whether `resolveLivePlan` actually resolves *this branch's own plan* · close: scope held — found and directly reproduced 1 major (`resolveLivePlan` returns `null` for this exact branch because it carries no ticket-id-shaped token, so `spec-scope-lint` silently no-ops on every `pnpm prism:check` run on this branch — confirmed live in the check output); all four prior fixes verified still intact (598 tests, zero build diff, full check green); no source files touched, only this plan file.
- 2026-07-25 [huntermcgrew/prism-review-loop-self-audit] open: Intent — fix the open pass-5 `## Review Issues` entry (`resolveLivePlan` can't resolve a plan-first branch's own unfiled-ticket plan); Bounds — touch `resolve-live-plan.ts` and its test file, plus `run-tests.ts` only if verification uncovers a blocking gap in how its own new tests get run, no rule/skill edits, commit and push only; Approach — add a fourth resolver tier that matches an unfiled plan by filename-slug token-run when the branch carries no ticket-id token, failing closed (null) on zero or multiple matches rather than guessing · close: scope held — the fourth tier resolves this branch's own plan live (`pnpm prism:spec-scope-lint` no longer skips); discovered mid-fix that `run-tests.ts` never actually ran `resolve-live-plan.test.ts` (it lived under `lib/`, and `run-tests.ts` only read the top-level `scripts/ai-skills/` directory) — every prior pass's "N tests passing" count silently excluded that file's tests; fixed by making the discovery recursive (see `## Decisions`); `pnpm prism:check-types`, `prism:test` (616 tests, up from 598), and `prism:check` all exit 0.
- 2026-07-25 [huntermcgrew/prism-review-loop-self-audit] open: Intent — fix all 4 findings from Eric's PR-review pass 1 on #447 (3 Major + 1 Minor: Condition B basename collision, stale ladder exit-condition wording, Ledger/Subject scope collision, ambiguous-match indistinguishability); Bounds — touch only the files each finding names plus their tests and mirrors, no unrelated changes, commit and push, reply on the resolved threads; Approach — apply each finding's suggested fix directly (skill-directory discriminator, reworded ladder items, rescoped Ledger bullet, an exported candidates helper plus a distinguishing CLI message), independently reproduce Eric's exact repro commands against the fixed code, and add regression coverage for each · close: scope held — all 4 findings fixed and independently reproduced against Eric's own repro commands; `pnpm prism:check-types`, `prism:test` (623 tests, up from 616), `prism:build` (mirrors regenerated), and `prism:check` all exit 0; no unrelated files touched.

---

## Implementation Tasks

Execution order: Clove 1 → 2 → 3 → 4 → 5, then Nora 6. Tasks 1–3 are one commit's worth of work on the same file and must land together — task 2's exit condition cannot be expressed without task 1's surfaces, and task 3's gate is a table over them. Tasks 4–5 are an independent lane and may run in parallel with 1–3.

### Clove (implementation)

1. **Add a `## Review surfaces` section to the review-loop skill.** File: `.ai-skills/skills/prism-review-loop/shared.md`. Insert a new `## Review surfaces` section immediately after `## Opening Orientation Battery` (ends at line 15) and immediately before `## The ladder` (line 17). Canonical source only — do not hand-edit `.claude/`, `.codex/` or `.cursor/` copies; they regenerate in task 5.

   Insert verbatim:

   ```markdown
   ## Review surfaces

   Freeze one ref before the first pass: `loopBase = git rev-parse HEAD`. Record
   it in the gauntlet state alongside the pass count. Three surfaces derive from
   it, and every pass reviews them at different bars:

   - **Subject** — `git diff $(git merge-base <default-branch> $loopBase) $loopBase`.
     The work the loop was invoked to review. Full bar, every pass.
   - **Repair** — `git diff $loopBase HEAD`. Changes the loop itself authored.
     Regression-only bar (below).
   - **Ledger** — the plan file, its `## Review Issues` and `## History`
     entries, and `.prism/lessons.md`. Text the loop authored *about itself*.
     Not a review target during the loop at any bar.

   **Why:** the review target used to be the live branch diff, which resolves at
   pass time — so every fix the loop landed joined the surface the next pass
   reviewed. A loop that reviews its own output cannot converge; it generates
   its own backlog. Two independent runs of this skill set recorded the failure:
   one spent consecutive passes finding nothing in the feature under review
   while still producing findings, all of them in text the cycle had written;
   PRISM's own PR #446 (merged as `d28f2aaf`) recorded the same species three
   passes running against its plan file. The ledger for that run is at
   `.prism/plans/response-shape-contract.md` § Review Issues.

   **The repair bar — four anchors, name one or it is not a finding.** A
   repair-surface finding is admissible only when the reviewer names, and the
   scoreboard records, one of:

   1. **A failing command** — a named test, build, type-check, or check
      invocation that passes at `loopBase` and fails at `HEAD`.
   2. **A violated acceptance criterion**, cited by its AC ID.
   3. **A contradicted Decision**, cited by its `## Decisions` title.
   4. **The original finding is still true** — quote it and show it unclosed.

   No anchor, no finding. An observation with no anchor is a follow-up per
   `.prism/rules/followup-scope.md`, recorded in the scoreboard, never a fix
   pass. Three of the four anchors are mechanically checkable and the fourth is
   a quotation, so a rationalized anchor is visible to the human reading the
   scoreboard.

   **The exemption expires with the loop.** `loopBase` is per-invocation. A
   later gauntlet run on the same branch re-freezes at the then-current `HEAD`,
   so everything this run authored is subject at full bar in the next one.
   Nothing is permanently unreviewable — the exemption covers only the pass
   sequence that created the text, which is the one window where re-review
   cannot converge.

   **The ledger's correctness is owned by a check, not by a pass.** Excluding it
   here depends on the plan-drift checks landing separately; until they do, the
   human's pre-merge read is the backstop. That backstop is real — PRISM's own
   instance was caught by a human reading the ledger, not by a pass.

   The split is a loop construct. The self-review and PR-review personas invoked
   standalone still review the full branch diff; the loop states the boundary in
   its dispatch text rather than changing how either persona works.
   ```

   Sequence: first. Verification: content-only, no build step in this task. `grep -c 'loopBase = git rev-parse HEAD' .ai-skills/skills/prism-review-loop/shared.md` returns 1, AND `grep -cE '^\s*- \*\*(Subject|Repair|Ledger)\*\*' .ai-skills/skills/prism-review-loop/shared.md` returns 3. Positive control: `grep -c 'Procedure H' .ai-skills/skills/prism-review-loop/shared.md` returns 2 (unchanged from baseline) — proves the file was extended, not truncated or replaced. Do not assert a raw occurrence count for `loopBase` itself: `grep -c` counts lines, and the count moves whenever the paragraph rewraps.

2. **Replace the loop's exit condition with subject-clean.** Same file. Two text-to-text replacements.

   **Edit 2a** — in `## The ladder` item 1 (line 19–23), replace the last sentence, verbatim:

   ```
   Repeat until a pass returns zero findings.
   ```

   with:

   ```
   Repeat until the phase is subject-clean (see **Subject-clean exit** under
   ## Guardrails).
   ```

   **Edit 2b** — add a new bullet to `## Guardrails`, immediately after the
   `**Pass budget: 20 review/fix passes.**` bullet (ends at line 41) and before
   the `**Three-strike survival rule.**` bullet (line 42):

   ```markdown
   - **Subject-clean exit.** A phase closes when two consecutive passes return
     zero admissible findings on the **subject** surface and every admitted
     repair-surface finding is closed. When it fires, stop the phase and write
     every outstanding non-subject observation into the scoreboard as a
     follow-up per `.prism/rules/followup-scope.md` — do not open a fix pass for
     it. **Why:** "zero findings" counted every surface, so it was unreachable
     whenever the loop was producing findings of its own; the pass budget, not
     the exit condition, is what actually ended those runs. This is the exit
     condition, not a warning — a warning would hand the operator the same call
     under the same pressure that produced them. The 20-pass budget stays as the
     backstop for the case where subject-clean does not fire.
   ```

   The PR-review phase's own two-part exit at `## The ladder` item 2 (zero new
   findings **and** zero fixed-but-unresolved threads) is unchanged — subject-clean
   replaces its findings half only; the thread-clean half stands as written.

   Sequence: after task 1 — the exit condition references surfaces that task 1
   defines. Verification: content-only. `grep -c 'zero findings' .ai-skills/skills/prism-review-loop/shared.md`
   returns 0 — the stale phrasing is the failure signature if edit 2a was applied
   by insertion rather than replacement. Positive control: `grep -c 'Subject-clean exit'`
   returns 2 (the guardrail bullet and the ladder cross-reference).

3. **Add the finding-disposition table.** Same file, at the end of the new `## Review surfaces` section from task 1, immediately before the `## The ladder` heading. Insert verbatim:

   ```markdown
   **Disposition — surface decides, severity is unchanged.** No new severity
   vocabulary: Critical / Major / Minor keep their existing meanings from
   `.prism/references/review-frameworks.md`, and the surface supplies provenance
   for free.

   | Surface | Critical / Major | Minor |
   | --- | --- | --- |
   | Subject | fix in cycle | fix in cycle |
   | Repair | fix in cycle, only if an anchor was named | not raisable |
   | Ledger | not raised during the loop; swept once at close | not raised |

   Fixing Minors on the subject surface terminates: the subject is frozen and
   finite, so each line can produce at most one fix, and that fix lands on the
   repair surface where the anchor bar protects it. Severity was never the
   discriminator — the findings in PR #446's recorded self-audit were graded
   Major and were still self-audit. Provenance is.
   ```

   Do not add a taxonomy vocabulary anywhere in the file. The value of this table
   is that there is nothing new for a reviewer to learn; a named three-way
   classification would reintroduce exactly the judgment call the surface split
   removes.

   Sequence: after task 1. Verification: content-only. `grep -c 'self-inflicted\|marginal' .ai-skills/skills/prism-review-loop/shared.md`
   returns 0 — a non-zero result means a taxonomy leaked in. Positive control:
   `grep -c '| Ledger |' .ai-skills/skills/prism-review-loop/shared.md` returns 1.

4. **Write the spec-content trip-wire lint.** New file: `scripts/ai-skills/spec-scope-lint.ts`. Register it in `package.json` as `"prism:spec-scope-lint": "tsx scripts/ai-skills/spec-scope-lint.ts"` and append it to the `prism:check` chain, after `prism:crossref-lint` and before `prism:verify-pack`.

   Behavior — a hard error (exit 1) fires for a changed path only when **both** conditions hold:

   - **Condition A — process/spec content.** The canonical source declares `load: always` in its frontmatter, **or** it is under `.ai-skills/skills/**`, **or** it is `.prism/lessons.md`, **or** it matches `.prism/references/review-*.md`. Read the frontmatter field; do not hard-code a path list. Build mirrors under `.claude/`, `.codex/`, `.cursor/` and `templates/install/` are excluded from evaluation — they inherit their canonical source's verdict, and the source is already evaluated.
   - **Condition B — unrelated to the ticket.** The file's basename appears nowhere in the branch's live plan file, **and** no `## Decisions` entry in that plan names the path.

   Scope and inputs: changed paths come from `git diff --name-only $(git merge-base <default-branch> HEAD) HEAD`. Resolve the plan through the shared helper from task 4a below. Exclude `.prism/archived/**` from plan resolution — a frozen record must not fail a live invariant. When no live plan resolves for the branch, exit 0 with a one-line note rather than erroring; a branch with no plan is a `branch-plan.md` concern, not this lint's.

   Error message shape, one line per offending path: `<path>: always-on spec content unrelated to this ticket (basename absent from <plan-path>). Ship it as a follow-up PR per .prism/rules/followup-scope.md, or add a ## Decisions entry naming this path and the reason.`

   4a. **Extract the shared plan resolver first.** New file: `scripts/ai-skills/lib/resolve-live-plan.ts`, exporting one function that takes a branch name and returns the live plan path or `null`. It implements the lookup already specified in `.prism/rules/branch-plan.md` § Plan Lookup (ticket ID from branch name, then `<id>.md`, then `epic-<id>.md`, then a `## Ticket` field scan) and excludes `.prism/archived/`. The queued plan-drift check reads the same helper — two independent resolvers would disagree about which plan a branch owns, and the disagreement surfaces as a lint firing on the wrong ticket.

   Tests: new file `scripts/ai-skills/spec-scope-lint.test.ts`, following the fixture pattern already used under `scripts/ai-skills/__fixtures__/`. Two fixture cases are required and they are the acceptance bar, not extras:

   - **Fold-in fixture (must pass, exit 0):** a plan whose Goal and tasks name `<name>.md`, with a changed path at `templates/install/.prism/rules/<name>.md` — a second surface of the same artifact. Condition A is true, Condition B is false, no error.
   - **Back-out fixture (must fail, exit 1):** a plan about an unrelated feature, with a changed path at `.prism/rules/<other>.md` declaring `load: always`, whose basename appears nowhere in the plan and which no Decision names. Both conditions true, error fires with the offending path in the message.
   - **Escape-hatch fixture (must pass, exit 0):** the back-out fixture plus a `## Decisions` entry naming that exact path. Condition B is false, no error.

   Sequence: 4a before 4. Independent of tasks 1–3; may run in parallel. Verification: `pnpm prism:test` passes with the three new fixture cases, and `pnpm prism:check` exits 0.

5. **Add the trip-wire's rule home and rebuild.** File: `.prism/rules/followup-scope.md`. Add a new `## Spec content never rides an unrelated ticket` section immediately before `## Who runs this rule`. The section states the two conditions from task 4 in prose, names the lint (`pnpm prism:spec-scope-lint`) as the enforcement, states the escape hatch (a `## Decisions` entry naming the path and the reason), and carries this `**Why:**` — the existing rule already forbade this and was ignored because each edit looked like a one-liner, so the remedy is a trip-wire rather than sharper prose, and it cannot be keyed on size because size is what already failed. Add one line to `## Who runs this rule` naming the lint as the mechanical half.

   Keep the section short. Do not restate the lint's implementation detail — cite `scripts/ai-skills/spec-scope-lint.ts` by path, per `.prism/rules/implementation-task-detail.md` § Cite, don't restate.

   Then run `pnpm prism:build` to regenerate every mirror touched by tasks 1–3 and 5, followed by `pnpm prism:check`.

   Sequence: after tasks 1–4. Verification: `git diff --name-only` shows no `.claude/`, `.codex/` or `.cursor/` path modified before `prism:build` runs; after it, `pnpm prism:check` exits 0. Capture the exit code by reading `$?` on its own line immediately after the command.

### Nora (ticket setup)

6. **File the code-vs-docs drift ticket.** Scope, pre-checked against `.prism/rules/followup-scope.md` § Scope-fit gate: one capability — make code-to-docs staleness detection deterministic. Traceable to one decision — this plan's `## Decisions` entry *Real code-vs-docs drift detection goes to a separate ticket*. Done condition — a check that flags a changed source file whose paired doc did not change in the same diff, with the pairing convention read from the repo's documentation cross-reference map rather than hard-coded. Persona class — implementation (a lint), with a reviewer-checklist half.

   Note in the ticket description that it is not greenfield: `.prism/references/review-docs-impact.md` already carries a Briar-owned code-to-docs staleness scan, so the work is to make it deterministic and give it a home in `prism:check`. Note the sequencing constraint — it lands after this ticket, because a drift detector built against an unbounded review surface becomes one more thing every pass audits.

   Sequence: after Clove's tasks land, so the ticket can cite them. Verification: ticket exists and cites this plan.

---

## Stated Requirements

The four requirements the acceptance criteria below cite. Each names the observed failure it answers and the `## Decisions` entry that resolves it.

- **REQ-1 — A review pass may not raise findings against text the same review cycle authored, except where a named anchor proves a regression.** Observed in two independent runs of this skill set. Resolved by Decisions *One frozen ref, three named surfaces*, *The repair surface is regression-only*, *The exemption expires with the loop*, and *The ledger surface is not reviewed during the loop at all*.
- **REQ-2 — The loop must terminate on a signal that measures progress on the subject, not on total finding count.** Resolved by Decision *The convergence signal is the loop's exit condition, not a warning*.
- **REQ-3 — Process and spec content must not ride a ticket it has no relationship to, enforced by a mechanism that is not keyed on edit size.** Resolved by Decisions *The spec-content trip-wire keys on the `load:` frontmatter that already exists* and *The two lints compose*.
- **REQ-4 — A finding earns a fix from where it landed, without a new severity vocabulary to learn.** Resolved by Decision *No new severity taxonomy*.

---

## Acceptance Criteria

### Behavioral

- [ ] **AC-1** — Given a gauntlet run whose first pass finds and fixes a prose issue, When the second pass runs, Then that fixed text is not re-raised. (REQ-1)
  - Evidence (human): run the gauntlet on a branch with one deliberate prose defect in the subject; read pass 2's findings — the pass-1 fix does not appear. · UNMET looks like: a pass-2 finding whose file and line are inside the pass-1 fix commit, with no named anchor beside it in the scoreboard.

- [ ] **AC-2** — Given a repair-surface observation with no named anchor, When the loop processes it, Then it is written to the scoreboard as a follow-up and no fix pass opens. (REQ-1)
  - Evidence (human): read the closing scoreboard of a run that produced at least one repair-surface observation — the observation appears under follow-ups, and the pass count does not increment for it. · UNMET looks like: a fix commit whose only justification is a repair-surface observation with no anchor recorded.

- [ ] **AC-3** — Given two consecutive passes with zero subject findings while other findings remain, When the second such pass completes, Then the loop stops and converts the remainder to follow-ups. (REQ-2)
  - Evidence (human): read the scoreboard — it states subject-clean as the exit reason, lists the converted items, and the pass count is below the 20-pass budget. · UNMET looks like: a run that reaches the budget with a subject-clean condition that fired earlier and was not acted on.

### Non-behavioral

- [ ] **AC-4** — The review-loop skill defines exactly three named surfaces with their diff commands, and a frozen loop base. (REQ-1)
  - Evidence (machine): `grep -cE '^\s*- \*\*(Subject|Repair|Ledger)\*\*' .ai-skills/skills/prism-review-loop/shared.md` returns 3, AND `grep -c 'loopBase = git rev-parse HEAD' .ai-skills/skills/prism-review-loop/shared.md` returns 1. Positive control: `grep -c '## The ladder' .ai-skills/skills/prism-review-loop/shared.md` returns 1 — proves the grep probe reads a real file and is not passing on an empty or missing path. · UNMET looks like: fewer than three surface bullets, or a missing frozen-base line.

- [ ] **AC-5** — The repair bar enumerates exactly four anchors and states that an unanchored observation is a follow-up. (REQ-1)
  - Evidence (machine): `grep -cE 'A failing command|A violated acceptance criterion|A contradicted Decision|The original finding is still true' .ai-skills/skills/prism-review-loop/shared.md` returns 4, AND `grep -c 'No anchor, no finding' .ai-skills/skills/prism-review-loop/shared.md` returns 1. Positive control: `grep -c 'Procedure C' .ai-skills/skills/prism-review-loop/shared.md` returns at least 2 (unchanged from baseline) — proves the file was extended, not rewritten. Match the anchor names, not a `^[1-4]\.` list pattern: `## The ladder` already carries a numbered bold list, so a positional pattern counts seven and the criterion fails on arrival. · UNMET looks like: a count other than 4, or a missing unanchored-observation clause.

- [ ] **AC-6** — The trip-wire fires on the back-out case and stays silent on the fold-in case. This criterion is the design's whole bar; a lint that passes one half and fails the other is UNMET. (REQ-3)
  - Evidence (machine): `pnpm prism:test` runs `spec-scope-lint.test.ts` — the back-out fixture asserts exit 1 with the offending path named in the message, and the fold-in fixture asserts exit 0. Positive control: the escape-hatch fixture — the back-out fixture plus a `## Decisions` entry naming the path — asserts exit 0, proving the back-out failure comes from Condition B and not from Condition A alone firing on any always-on file. · UNMET looks like: the fold-in fixture erroring, the back-out fixture passing, or the escape-hatch fixture erroring.

- [ ] **AC-7** — No new severity taxonomy is introduced. (REQ-4)
  - Evidence (machine): `grep -ciE 'self-inflicted|marginal finding' .ai-skills/skills/prism-review-loop/shared.md .prism/rules/followup-scope.md` returns 0. Positive control: `grep -ci 'Minor' .ai-skills/skills/prism-review-loop/shared.md` returns at least 1 — proves the existing severity vocabulary is still present and the first grep is not passing on an empty read. · UNMET looks like: any taxonomy term added, or a zero on the control.

- [ ] **AC-8** — Both lints resolve the live plan through one shared helper, and neither reads `.prism/archived/`. (REQ-3)
  - Evidence (machine): `grep -c 'resolve-live-plan' scripts/ai-skills/spec-scope-lint.ts` returns at least 1, AND `grep -rc 'archived' scripts/ai-skills/lib/resolve-live-plan.ts` returns at least 1 (the exclusion). Positive control: `grep -c 'export' scripts/ai-skills/lib/resolve-live-plan.ts` returns at least 1 — proves the helper file exists with real content. · UNMET looks like: a second inline plan-resolution path in the lint, or no archived-directory exclusion.

- [ ] **AC-9** — Build mirrors are regenerated, not hand-edited, and the full check suite passes. (REQ-3)
  - Evidence (machine): `pnpm prism:build` produces zero diff against the committed mirrors, then `pnpm prism:check` exits 0. Positive control: `git diff --name-only` before the build shows no `.claude/`, `.codex/` or `.cursor/` path — proves the mirrors were never hand-edited in the first place. · UNMET looks like: any non-zero exit, or a mirror path in the diff with no canonical counterpart.

### AC Adjustments

### AC Sync Log

| Date | Agent | Action | Plan | Ticket |
| ---- | ----- | ------ | ---- | ------ |
| 2026-07-25 | Winston | AC-1 through AC-9 authored | review-loop-self-audit | not yet filed |

---

## Review Issues

### `resolveLivePlan` requires a ticket-id-shaped token in the branch name, so `spec-scope-lint` silently no-ops for a plan-first branch's entire pre-ticket lifecycle — including this branch, right now

- **Severity:** `major`
- **Status:** `fixed`
- **File:** `scripts/ai-skills/lib/resolve-live-plan.ts:51-55` (`extractTicketId`, gating `resolveLivePlan`); consumed by `scripts/ai-skills/spec-scope-lint.ts:253`
- **Problem:** `resolveLivePlan` extracts a ticket id from the branch name *first* (`extractTicketId`) and returns `null` immediately when none is found — before ever attempting to read `.prism/plans/`. This is the correct implementation of `branch-plan.md` § Plan Lookup's literal steps, but that rule's own lookup procedure has no path for a plan that legitimately exists and governs the branch while carrying no ticket-id-shaped filename or `## Ticket` field content, which is exactly this ticket's own branch: `huntermcgrew/prism-review-loop-self-audit` has no `[a-z]+-\d+` token anywhere in it, and the plan is filed at `.prism/plans/review-loop-self-audit.md` (this file) with `## Ticket: None yet — Nora files from this plan`. Directly reproduced: `resolveLivePlan("huntermcgrew/prism-review-loop-self-audit", <this repo root>)` returns `null`, and running `pnpm prism:check` on this exact branch right now prints `spec-scope-lint: no live plan resolved for this branch — skipping.` and exits 0 — indistinguishable from the legitimate no-plan case, the identical failure signature the pass-2 (`GITHUB_HEAD_REF`) and pass-3/pass-4 (`resolveMergeBaseRef`) fixes were built to close for other root causes in the same mechanism. The gap is not hypothetical: this branch has landed ~2,400 lines across 15 canonical files (per `git diff origin/main...HEAD --stat`) entirely during the window this lint cannot see. `resolve-live-plan.test.ts:212-222` tests the "no ticket id → null" path directly and asserts it as designed behavior, but its fixture (`someone/draft-cleanup`) is a branch with no corresponding plan at all — it doesn't cover the case demonstrated here, where a real, current plan exists and the resolver still can't find it. No entry in `## Decisions` addresses branches whose plan predates ticket filing; task 4's "a branch with no plan is a `branch-plan.md` concern, not this lint's" rationale assumes `resolveLivePlan` is a complete implementation of that rule's lookup, but the rule's own step 5 fallback for this exact case ("ask the user which ticket this work is for") has no mechanical equivalent — the lint just goes silent instead.
- **Suggested fix:** add a fallback tier to `resolveLivePlan` for branches with no ticket-id-shaped token: when `extractTicketId` returns `null`, scan `.prism/plans/*.md` (excluding `.prism/archived/`) for a plan whose `## Ticket` field reads as unfiled (e.g. matches `/^none/i` or is empty) and whose filename's slug shares enough of the branch's final `/`-segment to be a confident match — or, more simply, treat a branch with an unfiled-ticket plan as a known, accepted gap and say so explicitly in a `## Decisions` entry (a documented exemption, not a silent one) so a reader hitting the "no live plan resolved" message can tell the two cases apart. Either way, add a regression fixture in `resolve-live-plan.test.ts` that mirrors this exact shape: a plan file with `## Ticket: None yet` and a branch name with no ticket-id token, asserting whichever resolution the chosen fix produces.
- **Fixed in:** implemented the fourth-tier fallback (not the documented-exemption alternative — see `## Decisions`): `findUnfiledPlanBySlug` scans `.prism/plans/*.md` for a plan whose `## Ticket` field reads as unfiled and whose filename slug appears as a contiguous token run in the branch's final `/`-segment, requiring at least two tokens and exactly one match (fails closed to `null` on zero or multiple). Live-verified: `resolveLivePlan("huntermcgrew/prism-review-loop-self-audit", <repo root>)` now resolves `.prism/plans/review-loop-self-audit.md`, and `npx tsx scripts/ai-skills/spec-scope-lint.ts` on this branch prints "spec-scope-lint passed" instead of the prior silent skip. Added 5 regression fixtures to `resolve-live-plan.test.ts` (resolves by slug match, skips an already-filed plan, returns null on an ambiguous two-plan match, requires ≥2 slug tokens, never reads `.prism/archived/`). Mid-fix discovered `run-tests.ts` never actually ran `resolve-live-plan.test.ts` at all (non-recursive discovery, file lives under `lib/`) — fixed alongside (see `## Decisions`); `pnpm prism:test` now reports 616 tests (up from 598), all passing. `pnpm prism:check-types`, `prism:test`, `prism:build` (zero mirror diff), and `prism:check` all exit 0.

### Broken ATX heading fractures list item 1 in `## The ladder`

- **Severity:** `major`
- **Status:** `fixed`
- **File:** `.ai-skills/skills/prism-review-loop/shared.md:101-102`
- **Problem:** task 2's verbatim Edit 2a text wraps `## Guardrails` onto its own source line inside list item 1's paragraph. CommonMark parses a bare `##`-prefixed line as an ATX heading even mid-paragraph inside a list item — confirmed by lexing the exact file content with `marked` (a CommonMark-compliant parser): the text after "under" becomes a `heading` token (`## Guardrails).`, depth 2) nested inside item 1, not a paragraph continuation. The sentence "Repeat until the phase is subject-clean (see **Subject-clean exit** under" is truncated, and a bogus H2 reading "Guardrails)." renders inside the numbered list on GitHub and any CommonMark-compliant viewer. `pnpm prism:build` regenerates the identical break into all four platform mirrors (`.claude/`, `.codex/`, `.cursor/`, `templates/install/`) plus the canonical source — confirmed via `pnpm prism:check` passing with the break already baked into the committed mirrors.
- **Suggested fix:** rewrap so `##` is never the first token of a source line inside the paragraph — e.g. "Repeat until the phase is subject-clean (see **Subject-clean exit** under **Guardrails** below)." matches the file's existing convention of bolding a cross-referenced bullet name rather than reusing literal heading syntax inline.
- **Fixed in:** rewrapped the sentence exactly as suggested in the canonical source, then ran `pnpm prism:build` to regenerate all platform mirrors. Re-lexed the rebuilt file with `marked`: the heading list now reads `Opening Orientation Battery, Review surfaces, The ladder, Guardrails, Procedures, Closing, Closing Re-Orientation Battery` — no bogus nested heading. Confirmed the fix reached `.claude/` and `.cursor/` mirrors via `git diff` and a direct grep for the rewrapped line.

### `spec-scope-lint`'s mirror exclusion silently exempts curated install-seed twins

- **Severity:** `major`
- **Status:** `fixed`
- **File:** `scripts/ai-skills/spec-scope-lint.ts:59-64` (`MIRROR_ROOT_PREFIXES`, consumed by `isMirrorPath`)
- **Problem:** Condition A skips every changed path under `templates/install/` on the claim that "the mirror inherits its canonical source's verdict, and the source is already evaluated" (task 4's own implementation guidance). That claim holds for `.claude/`, `.codex/`, `.cursor/` (`build.ts`'s `COPIED_CONTENT_AREAS` pass fully rewrites and content-diffs these on every `prism:check`) but not for the `templates/install/` seed: `.ai-skills/definitions/seed-curation.json`'s `curated` array lists 17 twins — including `references/review-docs-impact.md`, which independently also matches this lint's own `REVIEW_REFERENCE_RE` — that `build.ts`'s `checkSeedDrift` only verifies *exist*, never compares content (see `checkSeedDrift`'s doc comment and the function body: the `curatedSet` branch is a existence-only `pathExists` check). Two just-merged commits, `49a489df` ("Reconcile curated seed twin skills-ecosystem.md with canonical (#442)") and `001ed2e4` ("Reconcile curated seed twin install-layout.md with canonical (#443)"), document this exact drift recurring in production with "every build gate green" — the first commit's own message states the root cause verbatim: "checkSeedDrift only verifies curated seed files exist and never compares content." An edit to a curated twin alone, with no canonical file touched in the same diff, is exactly the "one-liner riding an unrelated ticket" pattern this lint exists to catch, and it passes silently — `spec-scope-lint.ts` never reads `seed-curation.json` or the word "curated" (confirmed by grep).
- **Suggested fix:** read `.ai-skills/definitions/seed-curation.json`'s `curated` list (the same source `build.ts` already treats as authoritative) and only skip a `templates/install/` path when its canonical-relative path is absent from that list; evaluate curated twins under Condition A/B the same as canonical content.
- **Fixed in:** added `isCuratedSeedTwin` (reads and caches `seed-curation.json`'s `curated` array per repo root) and wired it into `evaluateSpecScopeLint`'s mirror-skip check — a `templates/install/` path only skips when it is *not* a curated twin. Discovered mid-fix that Condition A's path-pattern checks (`.ai-skills/skills/**`, `.prism/lessons.md`, `.prism/references/review-*.md`) are canonical-shaped and never match a curated twin's actual `templates/install/.prism/...` location, so `isAlwaysOnSpecContent` now takes an optional `patternPath` — the curated twin's canonical-equivalent path — while still reading frontmatter from the real changed file. Added `isCuratedSeedTwin` unit tests plus two `evaluateSpecScopeLint` regression fixtures (curated twin fires; non-curated twin still skips) to `spec-scope-lint.test.ts`. `pnpm prism:test` and `pnpm prism:check` both exit 0.

### `resolve-live-plan.ts` fallback tiers and `extractTicketId` are untested

- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `scripts/ai-skills/lib/resolve-live-plan.ts`
- **Problem:** no dedicated test file exists for this module (`resolve-live-plan.test.ts` is absent). `spec-scope-lint.test.ts`'s fixtures only exercise the direct `<ticketId>.md` resolution tier; the `epic-<ticketId>.md` fallback and the `## Ticket` field-scan fallback (`findPlanByTicketField`) are never called by any test. `extractTicketId`'s `[a-z]+-\d+` pattern also takes the leftmost match anywhere in the branch name rather than anchoring to a path-segment boundary — a username shaped like `dev-2` or `user-99` (a plausible GitHub handle) ahead of the real ticket id (e.g. `dev-2/prism-1234-fix-thing`) would extract `dev-2` instead of `prism-1234`, silently resolving the wrong plan (or none) and disabling `spec-scope-lint` for that branch without any error. Untested, and the failure mode is a silent guardrail bypass rather than a loud one.
- **Suggested fix:** add `resolve-live-plan.test.ts` covering the epic-plan tier, the `## Ticket` field-scan tier, and the hyphenated-username collision case; anchor `TICKET_ID_RE` to a path-segment boundary (e.g. match only after the last `/`, or require the token to start at a `/` or string start) so a username can't shadow the real ticket id.
- **Fixed in:** `extractTicketId` now matches `TICKET_ID_RE` only within `branchName.split("/").pop()`, so a hyphenated username ahead of the ticket id can no longer shadow it. Added `resolve-live-plan.test.ts` covering the direct tier, the `epic-<id>.md` fallback, the `## Ticket` field-scan fallback, the `.prism/archived/` exclusion, the no-ticket-id and no-plan-resolves cases, and the `dev-2/prism-1234-...` collision case named in the finding.

### `spec-scope-lint.ts`'s `main()` resolves an empty branch name on detached HEAD, silently disabling the lint in CI

- **Severity:** `critical`
- **Status:** `fixed`
- **File:** `scripts/ai-skills/spec-scope-lint.ts:330`
- **Problem:** `main()` derives `branchName` from `git branch --show-current`, which returns an empty string in detached-HEAD state. `.github/workflows/prism-check.yml` runs `pnpm prism:check` (which now chains `prism:spec-scope-lint`) on `pull_request` — and `actions/checkout@v4` checks out `pull_request` events at a detached HEAD by default. Confirmed by direct reproduction: cloning this worktree and running `git checkout --detach HEAD` reproduces `git branch --show-current` returning `""`. `extractTicketId("")` returns `null` (no ticket-id-shaped token in an empty string), so `resolveLivePlan` returns `null` immediately, `evaluateSpecScopeLint` returns `{ planPath: null, violations: [] }`, and `main()` prints `"spec-scope-lint: no live plan resolved for this branch — skipping."` and exits 0 — indistinguishable from the legitimate no-plan case. The mechanical enforcement this ticket exists to build (per `.prism/rules/followup-scope.md` § Spec content never rides an unrelated ticket, "Enforced mechanically by `pnpm prism:spec-scope-lint`... which runs as part of `pnpm prism:check`") never fires in the one place named as its enforcement point: CI on every PR. It only works when a human happens to run `pnpm prism:check` locally on a checked-out (non-detached) branch — which is close to the developer-discipline reliance this ticket was built specifically to replace with a trip-wire (per the plan's own Decision *The spec-content trip-wire keys on the `load:` frontmatter*). None of the three required AC-6 fixtures exercise `main()`'s git-branch detection; they all call `evaluateSpecScopeLint` directly with a hardcoded `branchName`, so this gap has no test coverage.
- **Suggested fix:** resolve the branch name the same way the merge-base logic already does for PRs — e.g. read it from CI's own environment (`GITHUB_HEAD_REF` when set, which GitHub Actions populates for `pull_request` events) before falling back to `git branch --show-current`, or pass the PR's head ref through explicitly. Add a `main()`-level test (or an integration test that runs the compiled script under `git checkout --detach`) so a future change can't silently regress this again.
- **Fixed in:** added `resolveBranchNameFromEnv` (exported for tests), which reads `GITHUB_HEAD_REF` and returns it when non-empty; `main()` now tries it first and falls back to `git branch --show-current`, matching how `GITHUB_HEAD_REF` behaves under `actions/checkout@v4`'s default detached-HEAD checkout for `pull_request` events. Added 3 unit tests for `resolveBranchNameFromEnv` (set, unset, set-but-empty). Independently reproduced the fix without detaching this worktree's HEAD (out of bounds per this session's instructions): ran `spec-scope-lint.ts` with `GITHUB_HEAD_REF` set to a ticket-id-shaped branch name unrelated to this worktree's real branch, backed by a temporary `.prism/plans/prism-9999.md` — the lint resolved that plan and fired on unrelated spec content, proving the env var (not `git branch --show-current`) drove resolution.

### `findPlanByTicketField`'s ticket-id match is an unanchored substring, so a shorter ticket id matches as a prefix of a longer one

- **Severity:** `major`
- **Status:** `fixed`
- **File:** `scripts/ai-skills/lib/resolve-live-plan.ts:66-69`
- **Problem:** the `## Ticket` field-scan fallback tests `sectionMatch[1].toLowerCase().includes(ticketId)` — an unanchored substring check, not a boundary-anchored match. For `ticketId = "prism-100"` and any plan whose `## Ticket` field contains `"PRISM-1005"` (or any ticket id string with `"prism-100"` as a literal prefix — confirmed: `"prism-1005".includes("prism-100")` evaluates `true`), the check succeeds and `resolveLivePlan` silently resolves to the wrong ticket's plan. This is the same defect class the pass-1 fix already corrected in the sibling function `extractTicketId` (the `dev-2` username-collision fix, same file) — an unanchored match on a ticket-id-shaped token — but it reappears here, unaddressed, and is not covered by any fixture in `resolve-live-plan.test.ts` (the field-scan tests only exercise a single plan with an exact-match ticket field). The plan's own Decision *The two lints compose* names exactly this failure mode as the reason both lints must share one resolver: "two independent resolvers would disagree about which plan a branch owns, and the disagreement surfaces as a lint firing on the wrong ticket" — this bug produces that outcome from a single resolver, not resolver divergence, and any tracker whose ticket-id space grows past two digits will eventually hit a genuine prefix collision (e.g. `PRISM-1` vs `PRISM-10`, `PRISM-42` vs `PRISM-425`).
- **Suggested fix:** anchor the match to a full ticket-id token — e.g. wrap `ticketId` in a word-boundary-aware regex (`new RegExp(`\\b${escapeRegExp(ticketId)}\\b`, "i")`) or require the character immediately following the matched substring to be non-alphanumeric/end-of-string, matching the anchoring discipline `extractTicketId` already applies. Add a regression fixture with two plans whose ticket ids are prefix-related (e.g. `prism-100` and `prism-1005`) asserting the field-scan resolves the correct one.
- **Fixed in:** added `ticketIdBoundaryPattern` (a case-insensitive, boundary-anchored regex built from an `escapeRegExp` helper) and wired it into `findPlanByTicketField` in place of the unanchored `.includes()` check — the ticket id must now be flanked by a non-alphanumeric character or a string boundary on both sides. Added 2 regression fixtures: a prefix-collision case that must resolve to `null` (`prism-100` vs. a plan containing `PRISM-1005`) and a two-plan case where the shorter id's plan is skipped and the exact-match plan resolves.

### `spec-scope-lint`'s merge-base resolution silently no-ops under CI's actual (unmodified) shallow checkout

- **Severity:** `critical`
- **Status:** `fixed`
- **File:** `scripts/ai-skills/spec-scope-lint.ts:302-360` (`readDefaultBranch`, `resolveMergeBaseRef`, `main`)
- **Problem:** `main()` resolves the diff base via `resolveMergeBaseRef`, which tries `git rev-parse --verify origin/main` and falls back to the bare `main` ref, then runs `git merge-base <that ref> HEAD`. This assumes either `origin/main` or `main` is resolvable in the local repository. `.github/workflows/prism-check.yml` (unmodified by this branch) runs `actions/checkout@v4` with no `fetch-depth` or `ref` override — the documented default for a `pull_request` trigger is a single-branch, depth-1 fetch of only the PR's own ref. Confirmed by direct reproduction: `git clone --depth 1 --branch <this-branch> file://<worktree>` (matching that default) produces a repo where `git rev-parse --verify origin/main` fails (`fatal: Needed a single revision`) and `git rev-parse --verify main` also fails — neither ref exists locally, only the checked-out branch and its own `origin/<branch>` remote-tracking ref. Running `resolveMergeBaseRef`'s exact logic against that clone selects `main` as the fallback ref (since `origin/main` doesn't resolve), and `git merge-base main HEAD` then fails for the same reason, returning `null`. `main()`'s own handling for that case (`if (mergeBase === null)`) prints "could not resolve a merge-base against the default branch — skipping" and returns with exit 0 — indistinguishable from a clean pass. This means `pnpm prism:spec-scope-lint` — the mechanism this entire ticket exists to build, named in `.prism/rules/followup-scope.md` § Spec content never rides an unrelated ticket as "Enforced mechanically by `pnpm prism:spec-scope-lint`... which runs as part of `pnpm prism:check`" — never actually evaluates a single changed path on a real GitHub Actions PR run against the current, unmodified workflow config. This is a different root cause from the pass-2 finding (empty branch name on detached HEAD, fixed via `GITHUB_HEAD_REF`): that fix resolves the branch name correctly, but `resolveMergeBaseRef`'s ref resolution was never exercised against CI's actual shallow-checkout default and fails independently of it. No test in `spec-scope-lint.test.ts` calls `resolveMergeBaseRef`, `readDefaultBranch`, or `main()` — the three `resolveBranchNameFromEnv` tests added in the pass-2 fix cover only the branch-name half of `main()`, not the merge-base half. `pnpm prism:test` (594 tests) and `pnpm prism:check` both pass locally because the local worktree and CI's own full-history checkout of this branch (via the workflow's actual git history, not a fresh shallow clone) both have `origin/main` available — neither exercises the shallow, single-ref clone a real PR event produces.
- **Suggested fix:** stop assuming `origin/<defaultBranch>` is fetchable from the working tree. Either (a) have `main()` fetch the base ref on demand — `git fetch --depth=1 origin <defaultBranch>` — before computing merge-base, so the lint is self-sufficient under any checkout depth, or (b) update `.github/workflows/prism-check.yml` to pass `fetch-depth: 0` (or fetch the base ref explicitly) so `origin/main` is guaranteed to resolve, paired with a `main()`-level test (or a CI-config assertion) so a future workflow change can't silently reintroduce the gap. Add a regression test that reproduces the shallow-clone condition (a temp single-branch, depth-1 clone, matching the reproduction above) and asserts `mergeBase` resolves rather than returning `null`.
- **Fixed in:** option (a) — `resolveMergeBaseRef` now fetches the base ref on demand before falling back to the bare branch name. The first attempt used `git fetch --depth=1 origin <defaultBranch>` with no destination refspec; a regression test built against a faithful single-branch, depth-1 clone (mirroring `actions/checkout@v4`'s default) caught that this alone doesn't create the `origin/<defaultBranch>` tracking ref, because `remote.origin.fetch` is scoped to just the checked-out branch under that clone shape — the fetch only updates `FETCH_HEAD`. The working fix adds an explicit destination refspec, `<defaultBranch>:refs/remotes/origin/<defaultBranch>`, which does create the tracking ref regardless of the configured fetch scope. Independently re-verified outside the test suite: cloned this worktree's actual branch with `git clone --depth=1 --branch=huntermcgrew/prism-review-loop-self-audit --single-branch`, confirmed `origin/main` and `main` both fail to resolve pre-fetch (matching the finding's reproduction), then ran the fixed fetch command directly and confirmed `git merge-base origin/main HEAD` resolves to a real commit. Exported `readDefaultBranch` and `resolveMergeBaseRef` for testing; added a git-backed regression test (bare remote + `main`/`feature` branches, single-branch depth-1 clone of `feature`, asserts `origin/main` resolves after the fetch and `merge-base` returns a commit) plus two `readDefaultBranch` unit tests. `pnpm prism:check-types`, `pnpm prism:test` (597 tests, all passing), and `pnpm prism:check` all exit 0.

### `resolveMergeBaseRef`'s depth=1 fetch of the default branch only resolves merge-base when the fork point coincides with the branch's current tip

- **Severity:** `critical`
- **Status:** `fixed`
- **File:** `scripts/ai-skills/spec-scope-lint.ts:332-350` (`resolveMergeBaseRef`)
- **Problem:** the pass-3 fix fetches `origin/<defaultBranch>` with `git fetch --depth=1 origin <defaultBranch>:refs/remotes/origin/<defaultBranch>` before computing merge-base. A depth-1 fetch of the default branch only ever retrieves that branch's *current* tip commit — it does not retrieve the historical commit where the PR branch actually forked. Whenever the default branch has advanced past the fork point (true of essentially any branch that isn't merged within minutes of being cut, and true of this very branch: `git merge-base origin/main HEAD` on this worktree resolves to `d28f2aaf`, five merged PRs behind origin/main's current tip `001ed2e4`), the depth-1-fetched `origin/main` object graph does not contain `d28f2aaf`, `git merge-base origin/main HEAD` fails to find a common ancestor, and `main()`'s `mergeBase === null` branch prints "could not resolve a merge-base against the default branch — skipping" and returns with exit 0 — the identical silent-disable failure signature the pass-2 and pass-3 fixes were built to close, from a fourth, still-open root cause in the same function.
  Confirmed by direct reproduction (not the pass-3 regression test's fixture, which keeps the default branch static at the fork point and so cannot exercise this): built a bare remote with `main` at 1 commit, branched `feature` one commit ahead, then advanced `main` two further commits (mirroring PRs landing on `main` while a PR sits in review — this repo's actual recent history). Shallow-cloned `feature` exactly as `actions/checkout@v4`'s undecorated default does (`--depth=1 --single-branch`, confirmed against this repo's own `.github/workflows/prism-check.yml`, which sets no `fetch-depth` override). Ran `resolveMergeBaseRef`'s exact fetch command against that clone: `origin/main` resolves post-fetch (to `main`'s *current* tip), but `git merge-base origin/main HEAD` exits 1 — no common ancestor, because the fetched `origin/main` object is the post-advance tip, not the fork-point commit `feature` actually diverged from. `.git/shallow` confirms the fetched `origin/main` commit is a shallow boundary with no fetched parents.
  This is a different root cause from the pass-2 (empty branch name on detached HEAD) and pass-3 (no `origin/main` ref at all pre-fetch) findings: both of those are fixed and stay fixed. This gap is in the fetch depth itself, not the ref name or its existence, and the pass-3 regression test's fixture shape (`createBareRemoteWithFeatureBranch`, which never advances `main` past the fork commit) cannot catch it because in that fixture the fork point and `main`'s tip are the same commit — the one case where a depth-1 fetch happens to be sufficient.
- **Suggested fix:** fetch enough of the default branch's history to guarantee the fork point is present rather than a fixed shallow depth of 1 — e.g. `git fetch origin <defaultBranch>:refs/remotes/origin/<defaultBranch>` with no `--depth` (a full fetch of that one ref's history), or `git fetch --unshallow` when the local repo is already shallow. Add a regression fixture where the default branch advances past the fork point after the feature branch is cut (mirroring real repo history, and this repo's own) so a future change can't silently reintroduce a depth-insufficient fetch.
- **Fixed in:** neither suggested-fix alternative on its own actually closes the gap — verified by testing both in isolation before implementing. A full-history, no-`--depth` fetch of just `origin/<defaultBranch>` is *not* sufficient: `HEAD` itself (the PR branch, checked out at depth 1) is also shallow, and its own commit object's parent pointer is hidden by that shallow boundary during traversal, so `git merge-base` still fails to find a common ancestor no matter how much of `origin/<defaultBranch>`'s history is present. `resolveMergeBaseRef` now runs `git fetch --unshallow origin` first — which deepens `HEAD`'s own shallow boundary down to the repo root, exposing its real parent chain — before fetching `origin/<defaultBranch>` (still with an explicit destination refspec, still without `--depth`). Independently reproduced outside the test suite: shallow-cloned this worktree's actual branch (`--depth=1 --single-branch`, matching `actions/checkout@v4`'s default), confirmed `origin/main` and `main` both fail to resolve pre-fetch, ran the fixed two-fetch sequence, and confirmed `git merge-base origin/main HEAD` resolves to a real commit that `git merge-base --is-ancestor` independently confirms is a true ancestor of `HEAD`. Added a regression test (`createBareRemoteWithAdvancedMain`: bare remote where `main` advances two commits past `feature`'s fork point after `feature` is cut, single-branch depth-1 clone of `feature`) that asserts `merge-base` resolves to the exact fork-point commit hash, not just "some" commit. `pnpm prism:check-types`, `pnpm prism:test` (598 tests, all passing), and `pnpm prism:check` all exit 0.

### Condition B's basename-only match disables the trip-wire for every skill body (Eric PR pass 1)

- **Severity:** `major`
- **Status:** `fixed`
- **File:** `scripts/ai-skills/spec-scope-lint.ts:233` (`isUnrelatedToTicket`)
- **Problem:** `.ai-skills/skills/**` holds four shared basenames (`shared.md`, `claude.md`, `codex.md`, `cursor.md`) repeated across every skill directory, so `planText.includes(path.basename(changedPath))` is true for any plan that mentions *any* skill's file of that name — reproduced directly: `evaluateSpecScopeLint` on `.ai-skills/skills/prism-architect/shared.md` against this plan (which mentions `shared.md` 11 times for the review-loop skill) returned zero violations. AC-6 names the back-out/fold-in pair as the design's whole bar; the back-out half didn't fire for the class most likely to be edited as a one-liner in this repo.
- **Suggested fix:** discriminate on skill directory + basename (e.g. `prism-architect/shared.md`) for paths under `.ai-skills/skills/**`, falling back to plain basename everywhere else.
- **Fixed in:** added `discriminatorFor`, which returns `<skill-dir>/<basename>` for `.ai-skills/skills/**` paths and plain basename everywhere else; `isUnrelatedToTicket` now tests the discriminator instead of the raw basename. Live-reproduced the fix against Eric's exact repro: `.ai-skills/skills/prism-architect/shared.md` now fires a violation against this plan, while `.ai-skills/skills/prism-review-loop/shared.md` (the file this plan actually changes) still passes clean. Added a unit-test pair and an `evaluateSpecScopeLint` fixture pair (two skills sharing `shared.md`; naming one in the plan doesn't clear the other).

### Ladder items 2 and 3 still carry the removed "zero findings" exit condition (Eric PR pass 1)

- **Severity:** `major`
- **Status:** `fixed`
- **File:** `.ai-skills/skills/prism-review-loop/shared.md:104-111` (`## The ladder`, items 2-3)
- **Problem:** an earlier edit swept item 1's exit condition to reference subject-clean but left items 2 and 3 reading the removed "zero new findings" / "zero-findings exit" phrasing — the guardrails bullet explicitly calls unqualified "zero findings" unreachable, so the PR-review phase (where PR #446 burned three passes) was still describing an impossible exit.
- **Suggested fix:** item 2 → reference the subject-clean exit alongside the thread-clean condition; item 3 → "subject-clean exit" instead of "zero-findings exit."
- **Fixed in:** reworded both items exactly per the suggested fix. `grep -c 'zero new findings\|zero-findings exit' .ai-skills/skills/prism-review-loop/shared.md` now returns 0.

### Ledger surface's "the plan file" wording collides with Subject and voids two always-on obligations (Eric PR pass 1)

- **Severity:** `major`
- **Status:** `fixed`
- **File:** `.ai-skills/skills/prism-review-loop/shared.md:27` (`## Review surfaces`, Ledger bullet)
- **Problem:** the Ledger bullet's comma placement ("the plan file, its `## Review Issues` and `## History` entries...") read ambiguously as naming the whole plan file, which collides with Subject (the merge-base diff, which contains the plan file on a plan-first branch) and would make `implementation-task-detail.md` § Who runs this rule and `branch-plan.md` § Decision verdict gate — both of which assign Briar/Eric to review `## Implementation Tasks` and `## Decisions` — unreachable inside the loop. Broader than the Decision it implements, which scopes Ledger to "text the loop authored about itself."
- **Suggested fix:** scope Ledger explicitly to the loop-authored slice — `## Review Issues`, `## History`, `## Sessions`, plus `.prism/lessons.md`.
- **Fixed in:** reworded the bullet to name only `## Review Issues`, `## History`, and `## Sessions` entries plus `.prism/lessons.md`, and added an explicit sentence stating everything else in the plan file (`## Implementation Tasks`, `## Decisions`, `## Acceptance Criteria`) is Subject content when it falls inside the reviewed diff.

### Ambiguous-match case in `resolveLivePlan` is indistinguishable from "no plan" (Eric PR pass 1)

- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `scripts/ai-skills/lib/resolve-live-plan.ts:141` (`findUnfiledPlanBySlug`)
- **Problem:** `null` carries both "nothing matched" and "several matched, refusing to guess," and `main()` printed one message for both — the same silent-skip signature behind four of this plan's prior Review Issues entries, reintroduced via the unfiled-plan tier.
- **Suggested fix:** widen the return to distinguish the states, or log the colliding candidates so `main()` can name them.
- **Fixed in:** extracted `findUnfiledPlanCandidatesBySlug` (exported, returns the full candidate list) and had `findUnfiledPlanBySlug` collapse it to the existing `string | null` contract — no change to `resolveLivePlan`'s public shape. Added `describeNoLivePlan` in `spec-scope-lint.ts`, which re-checks candidates only on the no-ticket-id path and prints "N unfiled plans match this branch slug (...) — refusing to guess" instead of the generic no-plan message when ambiguous. Added unit tests for both the candidates export and the new message function.

---

## History

- 2026-07-25 [huntermcgrew/prism-review-loop-self-audit]: Plan created — surface split, subject-clean exit, provenance-based disposition, and the spec-content trip-wire designed against PR #446's review ledger and a second independently observed instance. Code-vs-docs drift routed to its own ticket; see Decision: *Real code-vs-docs drift detection goes to a separate ticket*.
- 2026-07-25 [huntermcgrew/prism-review-loop-self-audit]: Landed Clove tasks 1-5 — review surfaces, subject-clean exit, and the disposition table in `.ai-skills/skills/prism-review-loop/shared.md`; the shared plan resolver (`scripts/ai-skills/lib/resolve-live-plan.ts`) and `spec-scope-lint.ts` with its three required fixtures; and the trip-wire's rule home in `followup-scope.md`. `pnpm prism:build` regenerated every mirror and `pnpm prism:check` exits 0.
- 2026-07-25 [huntermcgrew/prism-review-loop-self-audit]: Task 2's own verification (`grep -c 'zero findings'` expected 0) reads 2 in practice — one hit is the verbatim Why-clause quote task 2's own insert text required, the other a pre-existing Closing Battery line unrelated to the ladder's exit condition; edit 2a's actual sentence replacement was independently confirmed correct by direct inspection, so this is a busted self-check wording, not a defect in the edit.
- 2026-07-25 [huntermcgrew/prism-review-loop-self-audit]: AC verification run at `50fc21f0` — report at `.prism/qa/ac-verification-review-loop-self-audit.md`; 6 MET, 0 UNMET, 0 UNGRADEABLE across the machine criteria (AC-4 through AC-9), with AC-1 through AC-3 awaiting a human gauntlet run.
- 2026-07-25 [huntermcgrew/prism-review-loop-self-audit]: Fixed all 3 Briar pass-1 findings — rewrapped the broken ATX heading and rebuilt mirrors; added `isCuratedSeedTwin` to `spec-scope-lint.ts` so curated `templates/install/` twins are evaluated instead of blanket-skipped; anchored `extractTicketId` to the branch's final `/`-segment. Added `resolve-live-plan.test.ts` and curated-twin fixtures to `spec-scope-lint.test.ts`. `pnpm prism:check` exits 0.
- 2026-07-25 [huntermcgrew/prism-review-loop-self-audit]: Briar pass 2 found `spec-scope-lint`'s `main()` never fires in CI (detached HEAD → empty branch name → silent skip, indistinguishable from the legitimate no-plan case) and the `## Ticket` field-scan fallback in `resolve-live-plan.ts` can misresolve on a ticket-id prefix collision (unanchored substring match); see `## Review Issues`.
- 2026-07-25 [huntermcgrew/prism-review-loop-self-audit]: Fixed both Briar pass-2 findings — `main()` now reads `GITHUB_HEAD_REF` before falling back to `git branch --show-current`; `findPlanByTicketField` now matches ticket ids on a boundary-anchored regex instead of an unanchored substring. Added tests for both (env-var branch resolution; prefix-collision field-scan). `pnpm prism:check-types`, `prism:test` (594 tests, all passing), and `prism:check` all exit 0.
- 2026-07-25 [huntermcgrew/prism-review-loop-self-audit]: Briar pass 3 found `spec-scope-lint`'s merge-base resolution (`resolveMergeBaseRef`/`main()`) silently no-ops under CI's actual, unmodified shallow-checkout config — a distinct root cause from the pass-2 branch-name fix, confirmed by reproducing a faithful single-branch depth-1 clone of this branch and observing `origin/main` and `main` both fail to resolve; see `## Review Issues`.
- 2026-07-25 [huntermcgrew/prism-review-loop-self-audit]: Fixed the pass-3 finding — `resolveMergeBaseRef` fetches `origin/<defaultBranch>` on demand with an explicit destination refspec before falling back to the bare branch name; a first attempt without the destination refspec was caught by the new regression test (fetch updated `FETCH_HEAD` only, not the tracking ref). Exported `readDefaultBranch`/`resolveMergeBaseRef` and added tests, including a git-backed single-branch depth-1 clone regression. `pnpm prism:check-types`, `prism:test` (597 tests), and `prism:check` all exit 0.
- 2026-07-25 [huntermcgrew/prism-review-loop-self-audit]: Briar pass 4 found `resolveMergeBaseRef`'s depth-1 fetch of the default branch only resolves merge-base when the fork point coincides with the branch's current tip — a fourth root cause in the same function, distinct from and not caught by the pass-3 fix or its regression test; confirmed by reproducing a fixture where the default branch advances past the fork point (this branch's own real state against `origin/main`) and observing `git merge-base` fail post-fetch. See `## Review Issues`.
- 2026-07-25 [huntermcgrew/prism-review-loop-self-audit]: Fixed the pass-4 finding — `resolveMergeBaseRef` now runs `git fetch --unshallow origin` before fetching `origin/<defaultBranch>`, since a full-history fetch of the default branch alone can't fix it (`HEAD`'s own shallow boundary hides its parent chain regardless). Added a regression test asserting merge-base resolves to the exact fork-point commit once the default branch has advanced past it. `pnpm prism:check-types`, `prism:test` (598 tests), and `prism:check` all exit 0.
- 2026-07-25 [huntermcgrew/prism-review-loop-self-audit]: Briar pass 5 found `resolveLivePlan` cannot resolve this branch's own plan — `huntermcgrew/prism-review-loop-self-audit` carries no ticket-id-shaped token, so `spec-scope-lint` has silently no-op'd on every check run on this branch since it was created; reproduced live via `pnpm prism:check`. All four prior fixes (passes 1–4) re-verified intact. See `## Review Issues`.
- 2026-07-25 [huntermcgrew/prism-review-loop-self-audit]: Fixed the pass-5 finding — `resolveLivePlan` gains a fourth tier, `findUnfiledPlanBySlug`, matching an unfiled plan by filename-slug token-run when the branch carries no ticket-id token; see Decision: *`resolveLivePlan` gets a fourth tier*. Also fixed `run-tests.ts`'s non-recursive test discovery, found mid-fix (it silently never ran `resolve-live-plan.test.ts`); see Decision: *`run-tests.ts`'s test discovery is recursive*. `pnpm prism:check-types`, `prism:test` (616 tests, up from 598), `prism:build` (zero mirror diff), and `prism:check` all exit 0.
- 2026-07-25 [huntermcgrew/prism-review-loop-self-audit]: Eric PR-review pass 1 on #447 found 3 Major + 1 Minor — Condition B's basename-only match let an unrelated skill body pass clean, the ladder's items 2-3 still carried the removed "zero findings" exit condition, the Ledger surface's wording collided with Subject content, and the resolver's ambiguous-match case was indistinguishable from no-match. See `## Review Issues`.
- 2026-07-25 [huntermcgrew/prism-review-loop-self-audit]: Fixed all 4 Eric pass-1 findings — Condition B now discriminates `.ai-skills/skills/**` paths on skill-directory + basename instead of basename alone; ladder items 2-3 now reference the subject-clean exit; the Ledger bullet now names only `## Review Issues`/`## History`/`## Sessions` plus `.prism/lessons.md`, with an explicit "never the whole plan file" clause; `resolveLivePlan`'s ambiguous-match case now gets a distinguishing CLI message via a new `describeNoLivePlan`/`findUnfiledPlanCandidatesBySlug` pair. Added regression fixtures for each. `pnpm prism:check-types`, `prism:test` (623 tests, up from 616), `prism:build` (mirrors regenerated), and `prism:check` all exit 0.

---

## PR Readiness

- [x] No critical or major issues — Eric PR-review pass 1's 3 Major + 1 Minor all fixed; see `## Review Issues`
- [x] Tests written for new logic and edge cases — `spec-scope-lint.test.ts` covers Condition A, Condition B (including the skill-body basename-collision fixture pair), `deriveExitCode`, `isCuratedSeedTwin`, `resolveBranchNameFromEnv`, `readDefaultBranch`, `resolveMergeBaseRef` (two git-backed shallow-clone regressions), `describeNoLivePlan`, and the three required fixtures (fold-in, back-out, escape-hatch); `resolve-live-plan.test.ts` covers every fallback tier plus `findUnfiledPlanCandidatesBySlug`
- [x] Build passes — last run: 2026-07-25, `pnpm prism:check-types`, `pnpm prism:test` (623 tests, up from 616), `pnpm prism:build` (mirrors regenerated), and `pnpm prism:check` all exit 0 on this worktree
- [ ] PR description up to date — no PR opened yet
- [ ] Lasting decisions promoted to architect context (if applicable) — pending plan close; every `## Decisions` entry still carries `→ promotion verdict pending close`

**Last updated:** 2026-07-25
