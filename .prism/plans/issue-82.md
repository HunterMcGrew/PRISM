# Plan: issue-82

## Ticket

GitHub issue #82 — ADR README index covers only a subset of the directory.

## Goal

Backfill missing ADR index rows in `.prism/spec/adrs/README.md` and state the membership rule so the gap can't silently reopen.

---

## Decisions

- Index covers ADRs numbered 0021 and up; 0001–0020 stay directory-discoverable. Honors the index's existing intentional design rather than backfilling all 47.
  - → no promotion needed (the membership rule is now self-documenting in the README index prose itself).
- Index titles are editorial lookup labels, not verbatim source titles. Existing rows already shorten/title-case (0023 drops "Require", 0024 drops "Not Just the What"); the new 0040–0044 rows are title-cased to match house style. The link target is the source of truth and every link resolves to an existing file.
  - → no promotion needed (ticket-tactical formatting call, consistent with pre-existing index style).
- Membership rule restated as a count-rule per `writing-voice.md` § Count rules, not numbers: "Every ADR numbered 0021 and up has a row" replaces the prior count-free-but-loose "surfaces newer entries." A 0021+ ADR that lands without a row is now a visible violation.
  - → no promotion needed (lives in the README index prose, which is the durable surface for this rule).

---

## History

- 2026-06-09 [hmcgrew/issue-82-adr-index]: Backfilled index rows for ADRs 0029–0045 (each existing file in range) and restated the membership rule. 0046/0047 already had rows; 0021/0025–0028 correctly omitted (no files on disk).
- 2026-06-09 [hmcgrew/issue-82-adr-index]: Briar self-review — clean. Verified every linked file exists, rows sorted, summaries accurate against source Decision sections, count-rules fix applied.

---

## Review Issues

### Index titles diverge from source frontmatter casing

- **Severity:** `minor`
- **Status:** `deferred`
- **File:** `.prism/spec/adrs/README.md`
- **Problem:** Rows 0040–0044 title-case ADR names ("Atlas as a Dedicated Onboarding Persona") while source headers use sentence case ("Atlas as a dedicated onboarding persona").
- **Suggested fix:** No action — the index is an editorial lookup table, not a verbatim mirror; pre-existing rows already shorten/recase titles. Link targets are exact. Documented as a Decision.

---

## PR Readiness

- [x] No critical or major issues
- [x] Types correct — N/A (docs-only)
- [x] No stray console.logs or debug artifacts
- [x] Tests written for new logic and edge cases — N/A (docs-only)
- [x] All debugged issues resolved (no `open` entries)
- [x] Build passes — skipped — diff does not affect Next.js bundle (docs-only)
- [ ] PR description up to date — no PR (task scope: no PR)
- [x] Lasting decisions promoted to architect context (if applicable) — N/A

**Last updated:** 2026-06-09
