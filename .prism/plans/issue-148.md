# Plan: issue-148

## Ticket

https://github.com/HunterMcGrew/PRISM/issues/148

## Goal

Fix Eric's PR summary comment idempotency by inserting the `<!-- code-review-pr-summary -->` marker into `summary-template.md` so re-runs patch the existing comment rather than creating a duplicate.

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

- **Out of scope: Eric's section headings drift (`## Eric — PR Review: <phase>` vs. `## Summary`).** Winston flagged this as a separate template-adherence issue. It does not affect idempotency and is not fixed here.
  - → no promotion needed (separate issue; stays noted here for traceability)

- **Out of scope: pre-existing duplicate comments on PR #146.** Cleaning up the two existing summary comments (IDs 4703683215 and 4703728047) is an owner's call, not part of this fix.
  - → no promotion needed (ticket-tactical; one-time cleanup decision)

---

## History

- 2026-06-14 [hmcgrew/issue-148-eric-summary-marker]: Plan seeded. Bug confirmed: `summary-template.md` omits `<!-- code-review-pr-summary -->`, causing Eric re-runs to create duplicate summary comments instead of patching.

---

## Debugged Issues

### Eric posts duplicate PR summary comments on re-run

- **Status:** `open`
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

## Acceptance Criteria

### Behavioral

- [ ] Given a PR where Eric has already posted a summary comment, When Eric runs again on the same PR, Then the existing summary comment is PATCHed (not a new comment created)
- [ ] Given the composed PR summary comment body, When inspected, Then `<!-- code-review-pr-summary -->` is the first line of the comment body

### Non-behavioral

- [ ] `pnpm prism:build` passes green
- [ ] `pnpm prism:check` passes green
- [ ] The marker appears in the `templates/install/` mirror of `summary-template.md` (propagated by the build)

### AC Sync Log

| Date | Agent | Action | Plan | Linear |
| ---- | ----- | ------ | ---- | ------ |
| 2026-06-14 | Nora | Seeded AC from bug report and Winston-confirmed root cause | created | N/A |

---

## Cleanup Items

None at this stage.

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

**Last updated:** 2026-06-14
