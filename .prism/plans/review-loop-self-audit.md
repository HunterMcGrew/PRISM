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

---

## History

- 2026-07-25 [huntermcgrew/prism-review-loop-self-audit]: Plan created — surface split, subject-clean exit, provenance-based disposition, and the spec-content trip-wire designed against PR #446's review ledger and a second independently observed instance. Code-vs-docs drift routed to its own ticket; see Decision: *Real code-vs-docs drift detection goes to a separate ticket*.
- 2026-07-25 [huntermcgrew/prism-review-loop-self-audit]: Landed Clove tasks 1-5 — review surfaces, subject-clean exit, and the disposition table in `.ai-skills/skills/prism-review-loop/shared.md`; the shared plan resolver (`scripts/ai-skills/lib/resolve-live-plan.ts`) and `spec-scope-lint.ts` with its three required fixtures; and the trip-wire's rule home in `followup-scope.md`. `pnpm prism:build` regenerated every mirror and `pnpm prism:check` exits 0.
- 2026-07-25 [huntermcgrew/prism-review-loop-self-audit]: Task 2's own verification (`grep -c 'zero findings'` expected 0) reads 2 in practice — one hit is the verbatim Why-clause quote task 2's own insert text required, the other a pre-existing Closing Battery line unrelated to the ladder's exit condition; edit 2a's actual sentence replacement was independently confirmed correct by direct inspection, so this is a busted self-check wording, not a defect in the edit.
- 2026-07-25 [huntermcgrew/prism-review-loop-self-audit]: AC verification run at `50fc21f0` — report at `.prism/qa/ac-verification-review-loop-self-audit.md`; 6 MET, 0 UNMET, 0 UNGRADEABLE across the machine criteria (AC-4 through AC-9), with AC-1 through AC-3 awaiting a human gauntlet run.
- 2026-07-25 [huntermcgrew/prism-review-loop-self-audit]: Fixed all 3 Briar pass-1 findings — rewrapped the broken ATX heading and rebuilt mirrors; added `isCuratedSeedTwin` to `spec-scope-lint.ts` so curated `templates/install/` twins are evaluated instead of blanket-skipped; anchored `extractTicketId` to the branch's final `/`-segment. Added `resolve-live-plan.test.ts` and curated-twin fixtures to `spec-scope-lint.test.ts`. `pnpm prism:check` exits 0.

---

## PR Readiness

- [x] No critical or major issues — Briar pass 1's 2 major + 1 minor all fixed (see `## Review Issues`)
- [x] Tests written for new logic and edge cases — `spec-scope-lint.test.ts` covers Condition A, Condition B, `deriveExitCode`, `isCuratedSeedTwin`, the three required fixtures (fold-in, back-out, escape-hatch), and two curated-twin regression fixtures; `resolve-live-plan.test.ts` added covering every fallback tier and the hyphenated-username collision case
- [x] Build passes — last run: 2026-07-25, `pnpm prism:check` exit 0 (post-fix, mirrors rebuilt via `pnpm prism:build`)
- [ ] PR description up to date — no PR opened yet
- [ ] Lasting decisions promoted to architect context (if applicable) — pending plan close; every `## Decisions` entry still carries `→ promotion verdict pending close`

**Last updated:** 2026-07-25
