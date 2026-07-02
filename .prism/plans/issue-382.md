# Plan: issue-382

## Ticket

https://github.com/HunterMcGrew/PRISM/issues/382

## Goal

Give consumers three trust docs — `SECURITY.md`, `docs/what-prism-writes.md`, `docs/troubleshooting.md` — that accurately describe PRISM's current trust posture, verified against the shipped code rather than assumed.

---

## Implementation Tasks

### Eli (documentation)

1. Write `SECURITY.md` at repo root — the trust model, sourced from `ownership.ts`, `adopt.ts`, `update.ts`, `build.ts`, `templates/install/.claude/settings.json`, and `docs/publishing-prism.md`'s leak-audit section.
2. Write `docs/what-prism-writes.md` — the complete PRISM-owned / consumer-owned / seed-once inventory, sourced from `ownership.ts`'s glob classification plus the `--seed-agents-md` and `doctor`/`eject` behavior shipped in recent commits.
3. Write `docs/troubleshooting.md` — common failure modes (adopt refusal, `.bak` files, leftover-token build failure, pre-manifest fallback, Windows notes), leading with `prism doctor` as the first-stop diagnostic.
4. Link all three from `README.md` (inline callouts + repo-shape tree).
5. Run `pnpm run prism:crossref-lint` and confirm all links resolve.

---

## Decisions

- **SECURITY.md documents the CURRENT guidance-only state, not the reverted enforcement floor.** The enforcement floor (Stop/SubagentStop hooks gating Sol's report-back channel) was implemented at commit 5b87146, then fully reverted at a1907b6 ("revert the enforcement floor — return PRISM to guidance-only"), confirmed by ADR-0067's supersession notice. `templates/install/.claude/settings.json` ships as a literal `{}` with no hooks wired. No promotion needed — this is a factual-accuracy call already dictated by the current code state, not a new architectural decision.
- **Disclosure contact is GitHub's private security advisory flow, flagged as needing Hunter's confirmation.** No `bugs` field in `package.json`, no existing security contact anywhere in the repo. Considered: a plain email address. Rejected — no verified security-specific email exists to cite, and inventing one would be worse than pointing at GitHub's native advisory form (`github.com/HunterMcGrew/PRISM/security/advisories/new`), which requires no new infrastructure and works today. → no promotion needed (placeholder pending Hunter's explicit sign-off, noted inline in SECURITY.md's NOTE callout).
- **`audience: developer-user` frontmatter matches the majority convention** used by `adopt-prism.md`, `adopting-into-existing-repos.md`, `getting-started.md`, `overview.md`, `personas.md`, and `workflow.md` — not the `dev` value used by the more maintainer-facing `distribution.md`/`publishing-prism.md`. These three docs are consumer-facing, so `developer-user` is correct. → no promotion needed (existing convention, not a new one).

---

## History

- 2026-07-02 [hmcgrew/382-trust-docs]: Wrote SECURITY.md, docs/what-prism-writes.md, docs/troubleshooting.md — all claims verified against ownership.ts, adopt.ts, update.ts, build.ts, doctor.ts, eject.ts, sync-manifest.ts, agents-md-block.ts, templates/install/.claude/settings.json, and ADR-0067. Linked from README; crossref-lint and install-relative-link-gate pass clean.

---

## Acceptance Criteria

### Behavioral

- [x] Given a consumer landing on the repo cold, When they read `SECURITY.md`, Then every trust claim matches the current shipped code (no stale enforcement-floor references).
- [x] Given a consumer running `prism adopt`, When they check `docs/what-prism-writes.md`, Then every path adopt/update/eject can touch is listed with its ownership category (PRISM-owned / consumer-owned / seed-once).
- [x] Given a consumer hitting an adopt/update/build failure, When they open `docs/troubleshooting.md`, Then `prism doctor` is presented as the first diagnostic step and each listed failure mode has a resolution path.

### Non-behavioral

- [x] All three docs linked from `README.md`.
- [x] `pnpm run prism:crossref-lint` (crossref-lint + install-adr-gate + install-relative-link-gate) passes clean.
- [x] Docs follow `.prism/rules/writing-voice.md` — no session-context leakage, no reference to "this epic" or the generation session.

### AC Adjustments

None.

### AC Sync Log

| Date | Agent | Action | Plan | Linear |
| ---- | ----- | ------ | ---- | ------ |
| 2026-07-02 | Eli | Created plan + AC, all items verified true at write time | `.prism/plans/issue-382.md` | N/A (GitHub issue tracker) |

---

## Cleanup Items

None.

---

## PR Readiness

- [x] No critical or major issues
- [x] All links resolve — crossref-lint + install-relative-link-gate clean
- [x] No stray console.logs or debug artifacts (docs-only change)
- [x] Every non-trivial claim verified against source, cited in PR body / report
- [x] PR description up to date
- [ ] Lasting decisions promoted to architect context — none of this PR's decisions generalize beyond documenting current state; see verdicts above

**Last updated:** 2026-07-02
