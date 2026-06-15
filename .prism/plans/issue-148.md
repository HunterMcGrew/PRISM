# Plan: issue-148

## Ticket

https://github.com/HunterMcGrew/PRISM/issues/148

## Goal

Fix Eric's PR summary comment idempotency by inserting the `<!-- code-review-pr-summary -->` marker into `summary-template.md` so re-runs patch the existing comment rather than creating a duplicate. Extended to also close two orchestration gaps: (1) the PR-review loop's exit condition now requires zero fixed-but-unresolved threads, and (2) Eric's summary body no longer opens with a persona heading.

---

## User Stories

Not Applicable

---

## Design

Not Applicable

---

## Implementation Tasks

### Clove (implementation)

1. **Insert the idempotency marker into `summary-template.md`.** Add `<!-- code-review-pr-summary -->` followed by a blank line immediately above `## Summary` (currently line 5). This is the first line of the *composed comment body* — insert it between line 3 (end of doc header) and line 5 (`## Summary`). Do NOT insert it above lines 1–3 (the agent-facing doc header; those lines describe the template to Eric and are not emitted into the comment). File: `.prism/references/code-review-pr/summary-template.md`.

2. **Update the marker note in `github-writes.md`.** Line 42 currently reads: `- Always include the \`<!-- code-review-pr-summary -->\` marker at the top of the body.` Reword to make clear the marker comes from `summary-template.md` as its source of truth, e.g.: `- The \`<!-- code-review-pr-summary -->\` marker is the first line of the composed comment body — it comes from \`summary-template.md\` and must remain at the top so the step 4d re-run check in \`context-gathering.md\` can locate an existing summary comment and PATCH it rather than creating a new one.` File: `.prism/references/code-review-pr/github-writes.md`.

3. **Build and verify.** `.prism/references/` is a source-controlled build input — mirrors are generated, not hand-edited. Run `pnpm prism:build` then `pnpm prism:check`. Both must pass green before committing. Do NOT hand-edit the `.claude/`, `.cursor/`, `.codex/`, or `templates/install/` mirrors.

---

## Decisions

- **Fix is template-only, not an instruction patch.** The idempotency marker belongs in `summary-template.md` (the composed-body source of truth), not as a repeated directive in `github-writes.md` or `context-gathering.md`. Adding it to instructions creates drift risk — the instruction could be followed or ignored; the template emits it deterministically every run.
  - → no promotion needed (ticket-tactical fix; the template-as-source-of-truth pattern is already the established approach for Eric's comment structure)

- **Heading-drift fix: enforce template, never patch the instruction.** Eric was opening posted comment bodies with `## Eric — PR Review: <phase>` instead of the template's `## Summary`. Fix is a template-adherence instruction in `shared.md` § Summary format and a reinforcing note on the marker line in `github-writes.md` — not a separate template guard or post-hoc strip. The marker (`<!-- code-review-pr-summary -->`) must remain the literal first line; the heading follows from the template.
  - → no promotion needed (ticket-tactical skill-instruction fix; the template-as-source-of-truth pattern is already established)

- **Thread-resolution root cause: orchestration gap, not a missing Eric instruction.** Unresolved threads on minor-only PRs traced to the review-loop exit condition: the loop exited on zero new findings without requiring zero fixed-but-unresolved threads, so Eric's batch-D resolve sweep never ran on the final pass.
  - **Root cause:** `prism-review-loop/shared.md` ladder step 2 defined exit as "zero findings" only. Eric resolves threads in batch D of each pass, but batch D only runs when Eric runs — a loop that exits before a final Eric pass leaves threads open.
  - **Alternatives considered:** (a) make Eric resolve threads in a separate pre-exit step independent of batch D; (b) add a post-loop cleanup pass outside the ladder.
  - **Chosen approach:** update the ladder's exit condition to "zero new findings AND zero fixed-but-unresolved threads." If threads remain after findings hit zero, one final reviewer pass runs. This keeps resolution fully in Eric's batch D (single actor, no new pass type) and makes the invariant visible in the ladder itself.
  - **Implementation guidance:** `prism-review-loop/shared.md` step 2 and new Guardrails bullet "Thread-clean exit." Eric's `github-writes.md` "Resolve fixed threads" bullet now explicitly says "on every run (including re-reviews), sweep ALL currently-unresolved threads."
  - → no promotion needed (ticket-tactical orchestration fix; the exit-condition logic is self-evident from the updated ladder wording)

- **Out of scope: pre-existing duplicate comments on PR #146.** Cleaning up the two existing summary comments (IDs 4703683215 and 4703728047) is an owner's call, not part of this fix.
  - → no promotion needed (ticket-tactical; one-time cleanup decision)

---

## History

- 2026-06-14 [hmcgrew/issue-148-eric-summary-marker]: Plan seeded. Bug confirmed: `summary-template.md` omits `<!-- code-review-pr-summary -->`, causing Eric re-runs to create duplicate summary comments instead of patching.
- 2026-06-14 [hmcgrew/issue-148-eric-summary-marker]: Inserted marker above `## Summary` in `summary-template.md` (canonical + templates/install mirror); rewrote the matching note in `github-writes.md` to name the template as source of truth. Build green (86a794e).
- 2026-06-14 [hmcgrew/issue-148-eric-summary-marker]: Briar self-review found 1 major: `templates/install/.prism/references/code-review-pr/github-writes.md:42` not updated to match canonical reword. All other mirrors clean; build + check green (158/158).
- 2026-06-14 [hmcgrew/issue-148-eric-summary-marker]: Applied line-42 reword to `templates/install/` copy of `github-writes.md`; both install copies now match canonical byte-for-byte. pnpm prism:check 158/158 green (27cc7d9).
- 2026-06-14 [hmcgrew/issue-148-eric-summary-marker]: Folded two additional fixes into PR #149: (1) review-loop exit gate now requires zero fixed-but-unresolved threads (accaa7d); (2) Eric's every-run resolve sweep made explicit and marker-first rule reinforced in `github-writes.md` + `templates/install` mirror (2412e3f); (3) Eric's `shared.md` § Summary format now prohibits persona headings in the posted comment body (da05657). pnpm prism:check 158/158 green.
- 2026-06-14 [hmcgrew/issue-148-eric-summary-marker]: Briar second self-review (expanded PR). Thread-clean invariant loop-safety confirmed clean — "fixed-but-unresolved" scoping excludes praise threads; pass budget is hard escape. All mirrors byte-identical. 1 minor: github-writes.md:42 run-on sentence (non-blocking).
- 2026-06-14 [hmcgrew/issue-148-eric-summary-marker]: Split github-writes.md:42 run-on into two sub-bullets — marker-first rule and no-prepend-heading rule now separate scannable points; templates/install mirror updated to match (2407c41).
- 2026-06-14 [hmcgrew/issue-148-eric-summary-marker]: Fixed Eric Major — committed stale .claude/.codex/.cursor mirrors for github-writes.md that the 2407c41 build left unstaged (2d18405); fixed Eric Minor — dropped "one" from "run one final reviewer pass" in review-loop/shared.md and committed its mirrors (910b472). prism:check 158/158 green.

---

## Debugged Issues

### Eric posts duplicate PR summary comments on re-run

- **Status:** `fixed` — Fixed in: 86a794e
- **Severity:** Medium
- **Confidence:** High (confirmed root cause — zero marker matches on PRs #144/#145/#146; two comments on #146 as direct evidence)
- **Environment:** Any PR where Eric runs twice
- **File:** `.prism/references/code-review-pr/summary-template.md:5`
- **Root cause:** `[Confirmed]` — `summary-template.md` does not emit `<!-- code-review-pr-summary -->` as the first composed-body line, so the re-run check in `context-gathering.md` step 4d finds no match and creates a new comment instead of PATCHing the existing one
- **Steps to Reproduce:**
  1. Open a PR and invoke Eric (prism-code-review-pr)
  2. Wait for the summary comment to post
  3. Invoke Eric again on the same PR
  4. Observe a second summary comment created rather than the first being updated
- **Expected behavior:** Second Eric run finds the existing summary comment via the `<!-- code-review-pr-summary -->` marker and PATCHes it in place
- **Actual behavior:** Second Eric run finds no marker, creates a new summary comment — PR #146 has two summary comments as evidence
- **Recommended fix:** Insert `<!-- code-review-pr-summary -->` + blank line above `## Summary` in `summary-template.md`
- **Suggested tests:** Manually verify on next Eric run that only one summary comment exists and a second run updates it
- **Linear:** N/A

---

## Review Issues

### templates/install github-writes.md not updated

- **Severity:** `major`
- **Status:** `fixed` — Fixed in: 27cc7d9
- **File:** `templates/install/.prism/references/code-review-pr/github-writes.md:42`
- **Problem:** `github-writes.md` in `templates/install/` still carries the old `Always include...` wording. The canonical `.prism/` copy was reworded to name `summary-template.md` as source-of-truth, but the `templates/install/` mirror was not updated. `prism:check` does not drift-check this tree, so the mismatch passes CI. Fresh consumer installs receive a stale instruction note.
- **Suggested fix:** Apply the same line-42 reword to `templates/install/.prism/references/code-review-pr/github-writes.md` — match the canonical copy exactly.

### github-writes.md line 42 run-on sentence (extended fix round)

- **Severity:** `minor`
- **Status:** `fixed` — Fixed in: 2407c41 (source); runtime mirrors committed in 2d18405
- **File:** `.prism/references/code-review-pr/github-writes.md:42`
- **Problem:** The reworded line is a compound-complex run-on with two em-dashes and a redundant parenthetical that restates the marker-first rule already expressed earlier in the sentence. Content is correct; readability is mildly degraded.
- **Suggested fix:** Split into two sentences or trim the closing parenthetical `(the marker stays the literal first line of the body)` as it repeats "must remain at the top."

### Stale runtime mirrors committed without regeneration (Eric Major)

- **Severity:** `major`
- **Status:** `fixed` — Fixed in: 2d18405
- **File:** `.claude/references/code-review-pr/github-writes.md`, `.codex/references/code-review-pr/github-writes.md`, `.cursor/references/code-review-pr/github-writes.md`
- **Problem:** The run-on fix in 2407c41 edited the canonical source and ran `pnpm prism:build` but did not commit the regenerated runtime mirrors. `pnpm prism:check` exited 1 on the committed branch, naming the three drift files.
- **Suggested fix:** Run `pnpm prism:build`, stage the regenerated mirrors, and commit. After any build-input edit, the regenerated mirrors must ride in the same commit.

### review-loop "one final reviewer pass" terminal framing (Eric Minor)

- **Severity:** `minor`
- **Status:** `fixed` — Fixed in: 910b472
- **File:** `.ai-skills/skills/prism-review-loop/shared.md:19`
- **Problem:** "Run one final reviewer pass" implied a strict single-pass limit, but a re-pass can surface new findings and re-open the loop.
- **Suggested fix:** Drop "one" → "run a final reviewer pass".

---

## Acceptance Criteria

### Behavioral

- [x] Given a PR where Eric has already posted a summary comment, When Eric runs again on the same PR, Then the existing summary comment is PATCHed (not a new comment created)
- [x] Given the composed PR summary comment body, When inspected, Then `<!-- code-review-pr-summary -->` is the first line of the comment body
- [x] Given the review-loop PR-review phase exits, When there are fixed-but-unresolved threads, Then a final reviewer pass runs before the phase is declared complete
- [x] Given Eric posts a PR summary comment, When inspected on GitHub, Then the body opens with the marker line and `## Summary` — no persona heading prepended

### Non-behavioral

- [x] `pnpm prism:build` passes green
- [x] `pnpm prism:check` passes green (158/158)
- [x] The marker appears in the `templates/install/` mirror of `summary-template.md` (propagated by the build)
- [x] All runtime mirrors (.claude, .cursor, .codex, templates/install) byte-identical to canonical for both github-writes.md and summary-template.md

### AC Sync Log

| Date | Agent | Action | Plan | Linear |
| ---- | ----- | ------ | ---- | ------ |
| 2026-06-14 | Nora | Seeded AC from bug report and Winston-confirmed root cause | created | N/A |

---

## Cleanup Items

None at this stage.

---

## PR Readiness

- [x] No critical or major issues
- [x] Types correct — no `any`, no unsafe `as`
- [x] No stray console.logs or debug artifacts
- [x] Tests written for new logic and edge cases (not applicable — reference-only change)
- [x] All debugged issues resolved (no `open` entries)
- [x] Build passes — last run: 2026-06-14 (pnpm prism:build + prism:check 158/158 green)
- [x] All runtime mirrors byte-identical (verified by git diff — zero drift across .claude, .cursor, .codex, templates/install)
- [x] PR description up to date — PR #149 opened as draft
- [x] Lasting decisions promoted to architect context (if applicable) — decisions marked no-promotion-needed
- [x] Minor: github-writes.md:42 run-on sentence — fixed in 2407c41

**Last updated:** 2026-06-14 (Clove — committed stale runtime mirrors (2d18405) and review-loop minor (910b472); prism:check 158/158 green; all issues resolved)
