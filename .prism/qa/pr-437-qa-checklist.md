# PRISM — PR QA Checklist

**PR:** [#437 — PRISM: Add runtime phase-completeness check to conductor lane close](https://github.com/HunterMcGrew/PRISM/pull/437)
**Plan:** [eval-runtime-completeness-check](../plans/eval-runtime-completeness-check.md)
**Scope:** Manual verification of the runtime phase-completeness check landing in this PR. This is a skill-instruction and drift-guard-test change to the conductor (Sol) — no application UI. Covers the plan's 5 acceptance criteria, the changed behavior (the two-tier hard-required / content-gated split), and targeted + full-project regression.
**Who this is for:** Anyone verifying this PR on a checkout of this repo with `pnpm` available. There's no UI to click through — "testing" here means running the drift-guard tests, deliberately breaking the new rule to confirm the guard catches it, and reading the specific paragraphs a tester would rely on if they were Sol.
**How to use:** Each item records **Pass/Fail** plus short notes on failure. Work through the sections in order — §1 verifies the plan's own acceptance criteria one by one, §2 demonstrates the changed behavior by breaking it on purpose, §3 is targeted regression, §4 is the full-project sweep.

---

## Before you start

- Check out this repo at PR #437's branch (`huntermcgrew/prism-completeness-check`) and run `pnpm install` once.
- No build step is required — this PR touches only markdown skill files and test files, nothing under `dist/`.
- Every scenario below that edits a file ends with a restore step. Run `git status -s` after each one to confirm the working tree is clean before moving to the next scenario.

---

## 1. Acceptance criteria from the plan

The plan (`eval-runtime-completeness-check.md`) carries 5 stable-ID criteria. Each is Pass/Fail below.

- [ ] **1.1 — AC-RC-1: `phaseLog` is documented as an append-only, additive, absent-safe field.**
  1. Open `.prism/skills/prism-conductor/lib/goal-state.md`.
  2. Find the `phaseLog` line in the `## Schema (v2)` block, and its bullet in the field-notes list below it.
  - **Pass:** The schema block shows `phaseLog` as an array of `{ phase, at, skipped, skipReason }` objects. The field-notes bullet calls it "append-only," says it's "additive and absent-safe" for lane records written before the field existed, and ties the append to the mutate protocol's "write at every phase transition."
  - **Fail:** Any of those three claims (append-only, absent-safe, tied to the mutate-protocol write) is missing or contradicted.

- [ ] **1.2 — AC-RC-2: a missing hard-required phase re-dispatches, then parks — never edits the plan or re-judges output.**
  1. Open `.prism/skills/prism-conductor/step-05-route.md`, section `### Deterministic ratification`.
  2. Find the paragraph beginning "Before advancing a **leaf** lane…".
  - **Pass:** The paragraph names `implement`, `self-review`, and `pr-review` as hard-required, states a silent absence gets a strike-budget-bounded re-dispatch, and parks at `needs-human` naming the phase only if that re-dispatch survives the budget. It also states the check is read-only — it confirms a phase ran, never re-judges what it produced.
  - **Fail:** Any hard-required phase is missing from the list, the routing skips straight to park with no re-dispatch, or there's no read-only statement.

- [ ] **1.3 — AC-RC-3: a missing content-gated phase surfaces to the report and the lane still advances.**
  1. Run:
     ```
     npx tsx --test scripts/ai-skills/phase-completeness-gate.test.ts
     ```
  2. Open `.prism/skills/prism-conductor/step-10-report.md` and find the bullet starting "**Phase-coverage gaps**".
  - **Pass:** The test run reports 4 tests, 4 pass, 0 fail. The step-10-report.md bullet says a content-gated phase (`ac-verify`/`qa`/`docs`) silently absent from `phaseLog` is "surfaced for operator adjudication," and explicitly distinguishes this from a hard-required omission (which already parked the lane).
  - **Fail:** Any test fails, the report bullet is missing, or it describes parking instead of surfacing.

- [ ] **1.4 — AC-RC-4: the check only applies to leaf lanes — container lanes are exempt.**
  1. Re-read the opening clause of the same paragraph from 1.2, in `step-05-route.md`.
  2. Cross-check against `.prism/skills/prism-conductor/step-04-dispatch.md`, section `## Tree dispatch`.
  - **Pass:** The step-05-route.md paragraph opens with "Before advancing a **leaf** lane (container lanes never run a phase chain — step-04 § Tree dispatch)…", and the step-04-dispatch.md Tree dispatch section confirms container lanes "are never passed to `agent()` and never enter a phase chain."
  - **Fail:** The leaf-lane scoping clause is missing from step-05-route.md, or the two files disagree on which lanes run a phase chain.

- [ ] **1.5 — AC-RC-5: breaking the hard-required list makes the drift-guard test fail, naming the phase.**
  1. Edit `.prism/skills/prism-conductor/step-05-route.md`: in the sentence starting "**Hard-required**", remove `` `implement`, `` from the phase list.
  2. Run:
     ```
     npx tsx --test scripts/ai-skills/phase-completeness-gate.test.ts
     ```
  3. Restore the file: `git checkout -- .prism/skills/prism-conductor/step-05-route.md`
  - **Pass:** Step 2 shows `not ok` for the "hard-required phases route to park/re-dispatch" test, with an error message naming `'implement'`. After step 3, `git status -s` shows nothing for that file.
  - **Fail:** The test still passes with `implement` removed, the error doesn't name the phase, or the file doesn't restore cleanly.

---

## 2. Feature scenarios — the completeness-check drift guard, working as designed

The core change is a set of instructions Sol (the conductor persona) follows at run time, backed by a test suite that fails if the instructions drift from the two-tier split. These scenarios exercise that drift guard directly.

- [ ] **2.1 — A clean checkout passes the full new gate-test suite.**
  1. Run: `npx tsx --test scripts/ai-skills/phase-completeness-gate.test.ts`
  - **Pass:** 4 tests, 4 pass, 0 fail — the two-tier split, the `ac-verify`/`qa` content-gated pairing, and the phase-coverage-gap report line all check out.
  - **Fail:** Any of the 4 tests fails.

- [ ] **2.2 — Misclassifying a content-gated phase as hard-required is caught by name.**
  1. Edit `.prism/skills/prism-conductor/step-05-route.md`: in the sentence starting "**Content-gated**", remove `` `qa`, `` from the phase list.
  2. Run: `npx tsx --test scripts/ai-skills/phase-completeness-gate.test.ts`
  3. Restore the file: `git checkout -- .prism/skills/prism-conductor/step-05-route.md`
  - **Pass:** Step 2 shows exactly 2 failing tests — "content-gated phases route to surface" and "ac-verify and qa are content-gated" — both naming `qa` in their error message. After step 3, `git status -s` shows nothing for that file.
  - **Fail:** Fewer than 2 tests fail, the failures don't name `qa`, or the file doesn't restore cleanly.

- [ ] **2.3 — `phaseLog`'s phase list stays in lockstep with the canonical phase chain.**
  1. Run: `npx tsx --test scripts/ai-skills/phase-chain-parity.test.ts`
  - **Pass:** 5 tests, 5 pass, 0 fail — including "phaseLog's phase enum matches the canonical lane phase chain exactly," the new assertion this PR adds.
  - **Fail:** Any test fails, particularly the phaseLog-parity one.

- [ ] **2.4 — Sol's dispatch-time instructions record a conscious skip reason, and never treat `implement`/`self-review`/`pr-review` as skippable.**
  1. Open `.prism/skills/prism-conductor/step-04-dispatch.md` and find the paragraph starting "Every omission is a **conscious** skip, never a silent one."
  - **Pass:** The paragraph instructs Sol to record `{ phase, skipped: true, skipReason }` in `phaseLog` at the moment it narrows the chain, names `ac-verify`, `qa`, and `docs` as the only legitimate omissions, and states `implement`, `self-review`, and `pr-review` are never a legitimate omission.
  - **Fail:** Any of those three elements is missing, or this phase list disagrees with the content-gated list checked in 1.3/1.4.

---

## 3. Targeted regression

- [ ] **3.1 — No leftover doc still claims `docs` is the only skippable phase.**
  This PR replaces an older sentence in `step-04-dispatch.md` that named `docs` as the sole legitimate skip — now three phases are skippable. Confirm the old claim isn't still sitting somewhere else in the conductor skill.
  1. Run: `grep -rn "is the only phase a lane legitimately skips" .prism/skills/prism-conductor/`
  - **Pass:** No output — the phrase doesn't appear anywhere in the conductor skill.
  - **Fail:** The phrase still appears in any file.

- [ ] **3.2 — The pre-existing phase-chain-parity tests still pass, unaffected by the new one.**
  1. Run: `npx tsx --test scripts/ai-skills/phase-chain-parity.test.ts`
  - **Pass:** All 5 tests pass. This PR edited prose surrounding `step-04-dispatch.md`'s existing "Canonical lane phase chain" block; this confirms the block itself — which other tests parse structurally — wasn't disturbed.
  - **Fail:** Any of the 4 pre-existing tests (anything besides the new phaseLog-parity one) fails.

---

## 4. Full-project sweep

- [ ] **4.1 — The full local project check passes end to end.**
  1. Run: `pnpm run prism:check`
  - **Pass:** The command finishes with exit code 0 — type check, the full test suite (552 tests, 551 pass, 1 pre-existing skip, 0 fail), manifest coverage, crossref-lint, and pack-parity all report clean. No output shows one script's report bleeding into another's.
  - **Fail:** Any step in the chain fails, or the test/pass/fail counts differ from the above.

---

## Sign-off

| Tester | Date | Environment URL | Notes |
|--------|------|-----------------|-------|
|        |      |                 |       |

---

*Reference link: [PR #437](https://github.com/HunterMcGrew/PRISM/pull/437). §2–§3 are the regression sweep — they confirm the automated drift-guard tests back every scenario in §1.*
