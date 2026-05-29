# Plan: chore-thrive-pr-2039-backport

## Ticket

Backport of [thrive#2039](https://github.com/TracTru/thrive/pull/2039) (THR-1909 — "Fold thermonuclear code quality review concepts into review skills"). No PRISM ticket; tracked as a chore plan.

## Goal

Port Thrive PR #2039's offensive-simplification concepts into PRISM: a shared structural-remedy vocabulary, a simplification lens for Winston (design time) and Eric + Briar (review time), and a non-blocking Cleaner Paths output bucket — landing them in PRISM's post-lean-epic shared-reference structure.

---

## Decisions

- **Port lands on the post-lean-epic structure, not PRISM's old inline review skills.** The lean-skill-architecture epic (PRs #54–#67) merged to `main` mid-session and created the shared review-reference layer (`.prism/references/review-justification.md` et al.). The port targets that shared layer directly — the simplification procedure goes in the shared `review-justification.md` (both reviewers already hook into it), so it's authored once, not duplicated per reviewer.
  - **Root cause:** an earlier draft of this backport was built against the pre-epic inline structure and went stale when the epic merged; the branch was reset to the new `main` and rebuilt.
  - → no promotion needed (one-time backport sequencing, captured in History)

- **The simplification procedure is single-homed in the shared `review-justification.md`; the remedy menu is single-homed in a new shared `structural-remedies.md`.** Both reviewers reach the procedure through their existing `### Justification Review` hook; their hooks are broadened by one sentence to also apply the § Simplification & Structural Leverage lens and reach for the remedy menu. One home, three consumers (Eric, Briar, Winston).
  - → no promotion needed (this *is* the shared reference layer per ADR-0045)

- **Winston's "Push for the simpler design, not just a sound one" is pinned, not externalized.** Per [`skill-authoring.md`](../rules/skill-authoring.md) / ADR-0045, a cognitive-approach lens stays in the skill body. It lands in `prism-architect/shared.md` § Cognitive Approach as the offensive complement to justice sensitivity, cross-linking the shared remedy menu (not duplicating it).
  - → no promotion needed (encoded in the architect body; governed by ADR-0045)

- **The simplification lens is bounded by severity discipline — it raises what reviewers *suggest*, not what *blocks*.** A reframe the author could decline is a Minor or a non-blocking Cleaner Paths note; Major only when the current structure causes bugs, misleads the next developer, or compounds real maintenance cost. The "Severity discipline still governs" paragraph in `review-justification.md` and Winston's guardrail paragraph carry this.
  - → no promotion needed (encoded in the shared procedure + the architect lens)

- **Cleaner Paths is a non-blocking output bucket, outside Critical/Major/Minor.** Never labeled, never in the PR Readiness gate. Eric: a `## Cleaner Paths (non-blocking)` section in `references/code-review-pr/summary-template.md`, between Cross-cutting observations and PR Readiness. Briar: a `**Cleaner paths:**` line in her in-skill Review format, after Cleanup.
  - → no promotion needed (encoded in the two reviewer output formats)

- **Deleted Eric's large-PR escape hatch, matching Thrive.** Hunter's call. Winston's recommendation was to keep + fix the stale `claude-opus-4-7[1m]` model ID, since PRISM ships to teams whose default context may not be 1M. Overridden — the blockquote was removed from Eric's body. (Note: `skill-authoring.md` records this same escape-hatch note as a prior near-miss CUT; this removal is now an intentional, signed-off decision rather than a line-count cut.)
  - → no promotion needed (scope choice, self-evident in the diff)

- **Closed [#68](https://github.com/HunterMcGrew/PRISM/issues/68) as already-delivered.** The follow-up filed earlier this session (extract PRISM's shared review references) was delivered by the lean-skill epic before this port committed.
  - → no promotion needed (issue housekeeping)

---

## Implementation Tasks

### Winston — DONE this session

1. Created `.prism/references/structural-remedies.md` (Preferred Remedies menu, verbatim port). ✅
2. Appended `## Simplification & Structural Leverage` to the shared `.prism/references/review-justification.md`, cross-linking the remedy menu. ✅
3. Added the "Push for the simpler design, not just a sound one" pinned lens to `prism-architect/shared.md` § Cognitive Approach. ✅
4. Broadened both reviewers' `### Justification Review` hooks to apply the lens + reach for the remedy menu; added the two scan-list gaps ("magic"/brittle, silent fallback) to Eric's Standards-axis and Briar's "what to look for". ✅
5. Added the `## Cleaner Paths (non-blocking)` bucket to Eric's `summary-template.md` and the `**Cleaner paths:**` line to Briar's Review format; removed Eric's large-PR escape hatch. ✅
6. Ran `prism:build` (mirrors regenerated across `.claude/.cursor/.codex/.agents`); `build --check` clean, `verify-manifest` passes. ✅

---

## Acceptance Criteria

None — DX/chore backport, AC-exempt. Verification is developer-owned:

- `build --check` reports generated outputs in sync; `verify-manifest` passes.
- `structural-remedies.md` cross-links resolve from all three skills × all platforms and from the two shared references.
- The simplification procedure appears once in the shared `review-justification.md`; the Winston lens appears in the architect body; the Cleaner Paths bucket appears in both reviewer output formats.
- No large-PR escape-hatch / `opus-4-7` reference remains in any skill source or mirror.

## Review Issues

- **[Local-env artifact — not a real gate failure] `atlas-dogfood` test fails on this Windows checkout only.** The `rule generators write expected files for react+next stack` assertion expects a forward-slash path literal but Windows `path.join` produces backslashes. Pre-existing and unrelated — zero overlap with the review/architect files this backport touched.
  - Status: closed — local-env only, no action needed.

## PR Readiness

- [x] `build --check` green; `verify-manifest` passes
- [x] New `.prism/references/structural-remedies.md`; auto-mirrored into `.claude/.cursor/.codex` references
- [x] Simplification procedure single-homed in shared `review-justification.md`; both reviewer hooks broadened
- [x] Winston lens pinned in architect body per ADR-0045
- [x] Cleaner Paths bucket in both reviewer output formats, non-blocking and unlabeled
- [x] Large-PR escape hatch + stale `opus-4-7` reference removed from Eric
- [x] Issue #68 closed as delivered by the lean-skill epic
- [x] All `## Decisions` entries carry a verdict sub-bullet

**Last updated:** 2026-05-28

---

## History

- 2026-05-28 [hmcgrew/backport-2039-structural-leverage]: Backported thrive#2039. First draft was built against PRISM's old inline review skills; the lean-skill epic (PRs #54–#67) merged to `main` mid-session and created the shared review-reference layer, so the branch was reset to the new `main` and rebuilt against it. Final shape: simplification procedure single-homed in shared `review-justification.md`, remedy menu in new `structural-remedies.md`, Winston lens pinned in the architect body, Cleaner Paths in both reviewer output formats, Eric's escape hatch removed per Hunter; follow-up #68 closed as already-delivered by the epic.
