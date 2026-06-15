# Plan: issue-112

## Ticket

GitHub issue #112 — Eric resolves re-verified inline threads on a clean re-review pass (bug)

## Goal

On a clean re-review pass, Eric resolves the inline review threads he re-verified so the PR's GitHub conversation surface matches the loop's "clean" verdict.

---

## Implementation Tasks

### Clove (implementation)

1. Wire thread-resolution into Eric's clean-pass verdict in the skill body and references, then rebuild the platform mirrors. Done.

---

## Decisions

- **The resolve-thread mechanism already existed in `github-writes.md` batch D; the gap was that nothing in the skill body directed Eric to use it on a clean pass.**
  - **Root cause:** batch D's "Resolve fixed threads" sweep (added 2026-05-26, #57) is generic and conservative — it confirms per-thread and defaults to leaving threads open without evidence. The decision gate (state #3 / clean pass) never named thread-resolution as a step, and no instruction asked Eric to note the count. So on PR #111 the clean verdict shipped with four threads still open.
  - **Alternatives considered:** (a) add a brand-new resolve step to batch D — rejected, the mechanism was already there; (b) auto-resolve every unresolved thread on a clean pass regardless of authorship — rejected, the issue scopes resolution to threads Eric himself re-verified, leaving any disputed thread open.
  - **Chosen approach:** make thread-resolution an explicit, documented part of the state-#3 clean-pass flow. Skill body (`shared.md` § Decision gate) directs it and frames it as hygiene, not approval (ADR-0011); `github-writes.md` batch D gains a clean-pass clause + count instruction; `summary-template.md` shows where the count lands; the closing message reports the count on a re-review.
  - **Implementation guidance:** canonical edits in `.ai-skills/skills/prism-code-review-pr/shared.md` and `.prism/references/code-review-pr/{github-writes,summary-template}.md`; install-seed copies under `templates/install/.prism/...` kept in sync; regenerate `.claude`/`.codex`/`.cursor` via `pnpm prism:build`; `pnpm prism:check` green.
  - → no promotion needed (this is skill-behavior documentation, codified directly in the Eric skill source and its references — not a cross-cutting architect decision).

---

## History

- 2026-06-15 [hmcgrew/issue-112-eric-resolve-threads]: Wired clean-pass thread-resolution into the Eric skill body, batch D reference, summary template, and closing message; synced install seed; rebuilt mirrors; prism:check green. See Decision above.
- 2026-06-15 [hmcgrew/issue-112-eric-resolve-threads]: Briar self-review — clean, no critical/major/minor. ADR links verified across all four trees; seed-sync green; body-vs-reference disclosure split correct.

---

## Review Issues

No open issues. Briar self-review (2026-06-15) found the change clean. One non-blocking observation: the clean-pass clause is scoped to "every prior finding confirmed addressed," which is a strict subset of decision-gate state #3 (state #3 can also be reached via acknowledged-but-unfixed minors). The text already handles this — "leave any thread with a remaining or disputed finding open" — so an acknowledged-but-unfixed minor's thread stays open. Behavior is correct; noted for Eric's eye.

---

## PR Readiness

- [x] No critical or major issues
- [x] Types correct — n/a (docs/skill-source change, no TypeScript)
- [x] No stray console.logs or debug artifacts
- [x] Tests written for new logic and edge cases — n/a (build test suite green via prism:check; no new code paths)
- [x] All debugged issues resolved (no `open` entries)
- [x] Build passes — last run: 2026-06-15 (`pnpm prism:check` green)
- [ ] PR description up to date
- [x] Lasting decisions promoted to architect context (if applicable) — verdict: no promotion needed

**Last updated:** 2026-06-15
