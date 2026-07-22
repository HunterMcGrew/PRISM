# PRISM — Bug-Fix Verification Plan

**Bug:** PRISM-427: Harden dispatch verdict-enum + phase-chain against runtime drift — [GitHub #427](https://github.com/HunterMcGrew/PRISM/issues/427) + [#428](https://github.com/HunterMcGrew/PRISM/issues/428)
**PR:** [#435 — PRISM-427: Harden dispatch verdict-enum + phase-chain against runtime drift](https://github.com/HunterMcGrew/PRISM/pull/435)
**Severity:** Not tracker-rated (no S1–S4) — this closes a defect class caught during a conductor run, not a filed production incident. Confirmed still unbuilt against `main` at plan time (three drift sites live); see the plan's `## Decisions` → "Hunter's '#427 has been done' challenge."
**Environment:** A repo checkout of this branch with the PRISM toolset — git, Node ≥ 22, `pnpm`. There is no browser or UI surface for this change; every scenario below is verified by reading a spec file or running a repo command.
**Who this is for:** A developer verifying that the dispatch-schema and phase-chain hardening actually landed, and that nothing else in the conductor's spec surface broke along the way.

**How to use:** Each item records **Pass / Fail** and a one-line **note** on failure (the command output or the line that didn't match). No screenshots — evidence here is command output or a quoted line from the file.

---

## Before you start

1. Fetch and check out the PR branch: `git fetch origin huntermcgrew/prism-427-428-verdict-wiring && git checkout huntermcgrew/prism-427-428-verdict-wiring` (or `gh pr checkout 435`).
2. Confirm dependencies are installed: `pnpm install --silent`.
3. Confirm you're at the branch tip this plan verifies: `git log -1 --oneline` should show `5fcbf01 PRISM-427-428 followup: Derive ARROW_LITERAL from EXPECTED_PHASES`. A different tip means new commits landed since this plan was written — re-run the checklist against the current tip rather than assuming it still holds.

---

## 1. Primary verification

The fix closes four related defect threads, each with its own "before" (the bug) and "after" (what good looks like now). Each thread below converts its repro into Pass/Fail scenarios.

### 1a. Dispatch schema truncation (#427)

**The bug:** Sol authored dispatch schemas by hand at run time, reconstructing the `verdict` enum from prose instead of copying a fixed block. On PRs #420 and #421 the hand-typed schema silently dropped `needs-fix`, forcing Eric to misreport clear-cut implementation findings as `needs-replan` or `blocked`.

**What good looks like now:** the enum lives in exactly one copy-target block, and every authoring path cites it instead of retyping it.

- [ ] **Pass/Fail** — Open `.prism/skills/prism-conductor/lib/report-back.md`. Confirm a `## Canonical dispatch schema` section exists, sitting after `## Evidence fields (write lanes)` and before `## Secondary signals`, and its fenced block's `verdict:` line lists exactly six values: `done`, `needs-fix`, `blocked`, `needs-replan`, `needs-stronger-model`, `needs-human`.
- [ ] **Pass/Fail** — In the same file, confirm the opening paragraph ends with a sentence pointing readers at "§ Canonical dispatch schema — copy it, never retype it."
- [ ] **Pass/Fail** — Open `.ai-skills/skills/prism-conductor/claude.md` around line 15. Confirm the `schema` clause of the `agent()` field list now reads "copy the literal block at `.prism/skills/prism-conductor/lib/report-back.md` § Canonical dispatch schema verbatim" and no longer names `needs-stronger-model` as a standalone example. Run `grep -c 'needs-stronger-model' .ai-skills/skills/prism-conductor/claude.md` — expect `0`.
- [ ] **Pass/Fail** — Open `.prism/skills/prism-conductor/step-04-dispatch.md`. Confirm a "**Copy the schema; do not author it.**" paragraph appears right after the opening section's first paragraph, and it names the 2026-07-20 PR #420/#421 incident as the reason.
- [ ] **Pass/Fail** — Run `pnpm prism:test`. Expect exit 0 with all tests passing (547 tests at plan time — the count will grow, but the run must be all-green, 0 failed). The suite includes `scripts/ai-skills/verdict-enum-parity.test.ts`, which is the automated form of the two checks above.

### 1b. Reviewer verdict wiring (#427, reviewer side)

**The bug:** `needs-fix` existed in the enum but neither Eric's nor Briar's own "when Sol dispatches me" instructions named it — a reviewer reading only their own spec had no way to learn the verdict existed.

**What good looks like now:** both review-rung specs spell out all four relevant verdicts (`done`, `needs-fix`, `needs-replan`, `blocked`) and when each applies, in place, without sending the reader to another file.

- [ ] **Pass/Fail** — Open `.ai-skills/skills/prism-code-review-pr/shared.md` § `## When dispatched by Sol`. Confirm a "**The review-rung verdict, spelled out.**" paragraph is present distinguishing `done` (zero findings), `needs-fix` (fixable findings, stays in review phase), `needs-replan` (the plan itself is wrong), and `blocked` (can't review at all).
- [ ] **Pass/Fail** — Repeat the same check on `.ai-skills/skills/prism-code-review-self/shared.md` § `## When dispatched by Sol` — same paragraph, same four-way distinction.
- [ ] **Pass/Fail** — Run `grep -c 'needs-fix' .ai-skills/skills/prism-code-review-pr/shared.md .ai-skills/skills/prism-code-review-self/shared.md`. Expect `2` for each file.

### 1c. Briar's plan-only commit has a landing path (#428)

**The bug:** Briar correctly won't ship code ("authors ship, reviewers review"), but nothing landed her review write either — her plan edit could die uncommitted in a torn-down worktree. This stranded a review record three times in the 2026-07-20 run, once needing manual recovery.

**What good looks like now:** Briar lands her own plan-file-only commit under a narrow, mechanically-checked exception, and — inside a Sol run — Sol verifies the write actually reached the branch and re-dispatches Briar if it didn't.

- [ ] **Pass/Fail** — Open `.prism/rules/branch-plan.md`. Confirm a `## Landing a plan-only commit` section exists between `## 6. One Plan Per Ticket` and `# Before Closing`, and that it requires the staged set to be exactly one file (`git diff --cached --name-only` check) before the commit proceeds.
- [ ] **Pass/Fail** — Open `.prism/rules/skill-routing.md` § `## Authors ship, reviewers review`. Confirm it now cross-references the exception above (search for "Landing a plan-only commit") rather than reading as an unqualified "reviewers never push."
- [ ] **Pass/Fail** — Open `.ai-skills/skills/prism-code-review-self/shared.md` § `## After completing the review`. Confirm item 7 directs Briar to stage the plan file alone, verify the staged set, commit as `chore: Briar plan record for <ticket-id>`, and push using the worktree full-ref form (`git push origin HEAD:refs/heads/<branch>`).
- [ ] **Pass/Fail** — In the same file, § `## Definition of Done`, confirm a sentence states the plan commit must be staged, verified, committed, and pushed before the review counts as written.
- [ ] **Pass/Fail** — Open `.prism/skills/prism-conductor/step-05-route.md` § `### Deterministic ratification`. Confirm a paragraph describes a **review-lane landing check**: Sol captures the plan blob SHA before dispatching Briar (self-review) or Reese (AC-verify), re-reads it after, and re-dispatches the reviewer if the blob is unchanged — bounded by the strike budget, parking at `needs-human` if it survives. Confirm Eric is named as excluded (his findings land on the PR, not the plan).
- [ ] **Pass/Fail** — Open `.prism/skills/prism-conductor/lib/report-back.md` around line 30. Confirm the old blanket claim "Read-lanes ... are exempt — no files, nothing to ratify" is replaced with language describing the plan-writing-lane carve-out and pointing at the landing check above.

### 1d. Lane phase chain silently dropping a phase (fold-in)

**The bug:** the six-phase build chain (`implement → ac-verify → self-review → pr-review → qa → docs`) was written only as prose in two places. A 2026-07-21 run reconstructed it from memory and silently dropped both Reese phases, running `implement → self-review → pr-review → close` — nothing caught it, and the lane closed anyway.

**What good looks like now:** the chain lives in exactly one copy-target block naming the phase and the dispatching persona for each step, both prose sites cite it instead of re-listing it, and an automated check keeps the block in sync with the full lifecycle enum.

- [ ] **Pass/Fail** — Open `.prism/skills/prism-conductor/step-04-dispatch.md`. Confirm a `## Canonical lane phase chain` section exists (right after the opening section, before `## Per-team dispatch ordering`) whose fenced block lists, in order: `implement → Clove`, `ac-verify → Reese`, `self-review → Briar`, `pr-review → Eric`, `qa → Reese`, `docs → Eli`.
- [ ] **Pass/Fail** — In the same file's opening paragraph, confirm the old inline chain (`implement → ac-verify → self-review → pr-review → qa → docs`) is gone, replaced by a pointer to "§ Canonical lane phase chain."
- [ ] **Pass/Fail** — Open `.prism/skills/prism-conductor/step-01-init.md` § Phase mapping. Confirm the same arrow-literal chain is gone there too, replaced by a citation to `step-04-dispatch.md` § Canonical lane phase chain.
- [ ] **Pass/Fail** — Run: `grep -c 'implement → ac-verify → self-review → pr-review → qa → docs' .prism/skills/prism-conductor/step-04-dispatch.md .prism/skills/prism-conductor/step-01-init.md`. Expect `0` for both files — the chain should exist only as the newline-list block, never as a re-typed arrow string.
- [ ] **Pass/Fail** — Run `pnpm prism:test`. Confirm `scripts/ai-skills/phase-chain-parity.test.ts` is part of the green run — it asserts the block is a contiguous, same-order slice of `lib/goal-state.md`'s full `currentPhase` enum, and that `ac-verify` and `qa` both name Reese as the dispatching persona.

---

## 2. Targeted regression

The change touches 33 files: canonical spec sources under `.prism/`, `.ai-skills/skills/`, and `docs/`; their generated mirrors under `.claude/`, `.cursor/`, `.codex/`; two new test files; and one new shared test helper extracted out of an existing test. None of this is runtime application code, so regression here means "did the spec surface and its generated mirrors stay consistent," not "does a page still render."

- [ ] **Pass/Fail** — Run `pnpm prism:build` twice in a row. The first run regenerates the mirrors; `git status --short` afterward should list only the expected mirror files (`.claude/rules/branch-plan.md`, `.claude/rules/skill-routing.md`, `.claude/skills/prism-code-review-self/SKILL.md`, `.claude/skills/prism-code-review-pr/SKILL.md`, `.claude/skills/prism-conductor/SKILL.md`, and their `.cursor`/`.codex`/install-seed twins) if run against a pre-build tree, or nothing at all if the branch's mirrors are already committed. The second run must produce zero further changes — a build that isn't idempotent is itself a regression.
- [ ] **Pass/Fail** — Run `git status --short | grep -E '\.claude/skills/prism-conductor/(lib/|step-)'` after `pnpm prism:build`. Expect no output — `.prism/skills/prism-conductor/**` is canonical-but-unmirrored, and any hit here means a file that should never be copied got copied anyway.
- [ ] **Pass/Fail** — Run `pnpm prism:test`. Confirm the full suite passes, not just the two new files — the routing-coverage suite was refactored in this PR (its local `extractSection` helper moved into the new shared `scripts/ai-skills/lib/markdown-section.ts`), so a passing `routing-coverage.test.ts` confirms the extraction didn't change its behavior.
- [ ] **Pass/Fail** — Run `pnpm prism:check` (typecheck, tests, manifest coverage, crossref-lint, pack parity). Expect exit 0. This is the full gate, not just the build — it catches broken cross-file links (e.g. a citation added in this PR pointing at a heading that doesn't exist) that `prism:build` alone won't catch.

---

## 3. Root-cause adjacency

Per the plan's own root-cause framing, this is a recurring pattern — three independent sites had already reconstructed the verdict enum from memory and gotten it wrong before this PR (the hand-typed dispatch schema, `claude.md`'s prose citation, and `docs/ai-skills/conductor.md`'s four-value enum), and the same defect class (reconstructing a canonical structure at run time instead of copying it) recurred separately on the phase chain. The adjacency check is: does anything else in the repo still enumerate either structure from memory?

- [ ] **Pass/Fail** — Open `docs/ai-skills/conductor.md` around line 44. Confirm the report-back paragraph now lists all six verdicts (`done · needs-fix · blocked · needs-replan · needs-stronger-model · needs-human`) and adds a sentence on when a review rung returns `needs-fix`.
- [ ] **Pass/Fail** — Run `grep -c 'needs-fix' docs/ai-skills/conductor.md`. Expect `1` — **this is a known counting quirk, not a failure.** Both `needs-fix` mentions on that page land on the same physical line, so `grep -c` (which counts matching *lines*) reads `1` even though the requirement is satisfied. Confirm the real count with `grep -o 'needs-fix' docs/ai-skills/conductor.md | wc -l`, which should read `2`. If you only run `grep -c` here, don't fail this item on a `1` — check the occurrence count before calling it a defect.
- [ ] **Pass/Fail** — Run `pnpm prism:test` and confirm `verdict-enum-parity.test.ts`'s fifth assertion passes — it walks the whole of `docs/ai-skills/conductor.md` and fails if any line names `needs-replan` without also naming `needs-fix`, which is the automated form of the adjacency check above.
- [ ] **Pass/Fail** — Confirm the two new drift-guard tests are actually load-bearing, not just present. For the verdict enum: temporarily remove `needs-fix` from the `verdict:` line in `.prism/skills/prism-conductor/lib/report-back.md`'s schema block, re-run `pnpm prism:test` (or `npx tsx --test scripts/ai-skills/verdict-enum-parity.test.ts`), confirm a named failure calling out the missing `needs-fix`, then restore the file (`git checkout -- .prism/skills/prism-conductor/lib/report-back.md`) and re-run to confirm green again.
- [ ] **Pass/Fail** — Same check for the phase chain: temporarily delete the `qa → Reese` line from the `## Canonical lane phase chain` block in `.prism/skills/prism-conductor/step-04-dispatch.md`, re-run the phase-chain test, confirm a named failure calling out the missing `qa` phase, then restore and re-confirm green.

---

## Sign-off

| Tester | Date | Environment URL | Notes |
|--------|------|-----------------|-------|
|        |      |                 |       |

---

*Reference link: [PR #435](https://github.com/HunterMcGrew/PRISM/pull/435). Every item above is verified by reading a spec file or running a repo command — there is no manual-UI surface for this change. AC-3, AC-4, AC-5, and AC-10 in the branch plan's `## Acceptance Criteria` carry the same human-read checks as §§ 1b–1c above; this plan restates them in tester-facing Pass/Fail form rather than duplicating a second source of truth.*
