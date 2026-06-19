# Plan: prism-229

> Closed: 2026-06-19

## Ticket

https://github.com/HunterMcGrew/PRISM/issues/229

## Goal

Formalize Sol's standing authority to merge PRISM's own self-development PRs as an ADR, as a narrow repo-scoped exception to ADR-0011.

---

## Decisions

- ADR-0061 records the grant: Sol may merge PRISM's own self-development PRs when the Briar→Eric loop is clean AND there's no `review:has-minors` label; otherwise investigate, re-review/fix, merge only once the label clears.
  - **Scope boundary:** applies only to PRISM building itself (this repo's dogfood install). ADR-0011 is unchanged for consumers — their merge stays an unconditional human responsibility. The ADR makes this boundary explicit because the consumer-facing safety guarantee depends on it.
  - **Enforcement boundary:** the Claude Code auto-mode classifier does not honor authority living only in agent-maintained state, so each session still requires an explicit in-session user authorization before a merge runs. Recorded as the property that keeps a human in the loop, not a gap to close.
  - **Chosen vehicle:** a new ADR (0061, accepted) plus a cross-reference from `git-conventions.md § Who merges`, rather than rewriting ADR-0011. Keeps ADR-0011 intact as the rule and frames 0061 as the narrow exception.
  - → promoted to ADR-0061 (this plan's deliverable is the ADR itself).

---

## Acceptance Criteria

### Non-behavioral

- [ ] ADR exists at `.prism/spec/adrs/_toolkit/0061-sol-merge-authority.md` following the _toolkit ADR structure.
- [ ] ADR cites ADR-0011 and frames itself as a narrow exception, not a replacement.
- [ ] The scope boundary (PRISM-self only; consumers unchanged) is explicit and unmistakable.
- [ ] The enforcement boundary (per-session in-session authorization) is recorded.
- [ ] `git-conventions.md § Who merges` cross-references ADR-0061; README ADR index lists 0061.
- [ ] `pnpm prism:check` is green (and `pnpm prism:build` mirrors regenerated).

---

## Review Issues

### Install-template README missing ADR-0061 row

- **Severity:** `minor`
- **Status:** `fixed`
- **Fixed in:** `templates/install/.prism/spec/adrs/_toolkit/README.md` — added `| 0061 | ...` row matching the live README verbatim.
- **File:** `templates/install/.prism/spec/adrs/_toolkit/README.md` (end of file)
- **Problem:** All four live README surfaces (`.prism/`, `.claude/`, `.codex/`, `.cursor/`) received a `| 0061 | ...` index row. The install-seed README was not updated; consumers who install get the ADR file but no matching index entry.
- **Suggested fix:** Add the same `| 0061 | ...` row to `templates/install/.prism/spec/adrs/_toolkit/README.md`, matching the other surfaces.

### Scope-boundary wording tension in install seed

- **Severity:** `minor`
- **Status:** `fixed`
- **Fixed in:** `.prism/spec/adrs/_toolkit/0061-sol-merge-authority.md` + all mirrors (`.claude/`, `.codex/`, `.cursor/`, `templates/install/`) — rephrased "travels nowhere" → "applies only to PRISM's own repository". `pnpm prism:build` propagated to runtime mirrors; install seed hand-mirrored.
- **File:** `.prism/spec/adrs/_toolkit/0061-sol-merge-authority.md` (Scope boundary paragraph) + `templates/install/.prism/spec/adrs/_toolkit/0061-sol-merge-authority.md`
- **Problem:** The ADR says "this exception lives in the dogfood install and travels nowhere" — but the ADR ships verbatim to consumer repos via the install seed. The authority doesn't travel, but the text does. A consumer reading their seeded copy gets PRISM-internal PR numbers and the phrase "travels nowhere" in content that manifestly arrived in their repo. The scope-boundary paragraph is explicit enough that no consumer should misconstrue the grant as applying to them, but the wording slightly undercuts itself.
- **Suggested fix:** Rephrase "this exception lives in the dogfood install and travels nowhere" to something like "this exception applies only to PRISM's own repository" — a statement that stays accurate regardless of which copy the reader holds.

---

## PR Readiness

Living checklist — updated by Briar self-review on 2026-06-19.

- [x] No critical or major issues
- [x] Types correct — no `any`, no unsafe `as` (doc-only change)
- [x] No stray console.logs or debug artifacts
- [x] Tests written for new logic (N/A — doc-only ADR)
- [x] All debugged issues resolved (no `open` entries)
- [x] Build passes — last run: 2026-06-19 (329 tests pass, crossref-lint clean)
- [x] Install-template README missing ADR-0061 row — fixed
- [x] Scope-boundary wording tension in install seed — fixed
- [x] PR description up to date
- [x] Lasting decisions promoted to architect context (ADR-0061 is itself the promotion)

**Last updated:** 2026-06-19

---

## History

- 2026-06-18 [hmcgrew/prism-229-sol-merge-authority-adr]: Wrote ADR-0061; cross-referenced from `git-conventions.md § Who merges` and the README index. Follow-up off main, post Epic #212.
- 2026-06-19 [hmcgrew/prism-229-sol-merge-authority-adr]: Briar self-review — build green (329 pass), crossref-lint clean. Two minors: install-template README missing 0061 row; scope-boundary wording tension in seeded ADR copy.
- 2026-06-19 [hmcgrew/prism-229-sol-merge-authority-adr]: Fixed both Briar minors — added 0061 row to install-seed README; rephrased "travels nowhere" to "applies only to PRISM's own repository" in source ADR, propagated via prism:build to runtime mirrors and hand-mirrored to install seed. 329 pass.
- 2026-06-19 [hmcgrew/prism-229-sol-merge-authority-adr]: Plan closed on final PR branch before #232 merges. Eric reviewed CLEAN, build 329 green. Decision verdict confirmed (→ promoted to ADR-0061); no architect-context rebuild needed — the ADR is itself the durable artifact.
