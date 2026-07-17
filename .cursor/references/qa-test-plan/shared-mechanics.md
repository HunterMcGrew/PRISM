# Reese — Shared Test-Plan Mechanics

> _Ticket mapping, regression scanning, cross-check, sign-off, save/deliver — plus non-default behaviors and the per-mode commit subject-line templates._

Attribution: these mechanics belong to the `prism-qa-test-plan` skill (Reese).

These apply across the checklist-producing modes (Release, Sprint / Group, Feature / PR, Bug-fix Verification). Each of those mode references points here instead of duplicating the mechanics. **AC Verification mode is the exception** — it doesn't produce a checklist, so it skips this file entirely: no ticket mapping, no sign-off block, no subject-line template. It saves its report to `.prism/qa/` and reports back directly per `mode-ac-verification.md`.

## Map tickets

- Parse **THR-_nnnn_** from commit subjects and PR titles
- For important tickets, optionally read `<repo-root>/.prism/plans/thr-<lowercase>.md` when it exists to sharpen scenarios — still translate everything to QA language
- Any orphan commits (no THR prefix) get included as-is in **Other** or **Out of scope** with the raw commit subject — never silently drop them

## Identify regression risks

After covering what the change should do, ask what the change might have broken. Run `git show <hash> --stat` (or `gh pr diff <num> --name-only`) for each included change and flag the regression signals listed in `../../architect/_toolkit/qa-test-planning.md` — shared components, block renderer / registry, global styles, utility functions, PHP endpoints / middleware, Next.js routing, WordPress hooks / filters.

For each regression risk found:

1. Identify the surface that could be affected (e.g. "all blocks using the shared Image component")
2. Write 1–3 spot-check scenarios — specific, observable things a tester can verify
3. Use the writing rules from the architect file

If no regression risks are found, still include the regression section with a note explaining the minimal smoke test (homepage loads, navigation works, a sample block renders in the editor).

## Cross-check before saving

Verify, regardless of mode:

- Every in-scope UI change appears either in the coverage table or in **Out of scope** with an explicit reason
- Section references in the coverage table match final section numbers
- No compare / PR URL typos — base / head / numbers match the user's inputs
- No orphaned PRISM-\* tickets (mentioned in commits but missing from the document)

## Sign-off block

Always the last section in the document:

```
---

## Sign-off

| Tester | Date | Environment URL | Notes |
|--------|------|-----------------|-------|
|        |      |                 |       |

---

*Reference link: <compare URL, PR URL, or ticket URL depending on mode>. **PRISM-XXXX** is validated mainly by automated tests; **§N** is a short regression sweep.*
```

- Fill in the reference link appropriate for the mode
- Replace the `PRISM-XXXX` / `§N` footnote with actual tickets that are tests-only or automated-only, and the actual regression section number — omit the footnote line entirely if there are no such tickets

## Save and deliver

**Output is always Markdown.** For Word docs, suggest the `docx` skill for conversion after the fact — generating `.docx` directly produces worse results.

- Create the directory if needed: `mkdir -p <repo-root>/.claude/docs/qa/`
- Write the Markdown file to the mode-appropriate path (see each mode's section)
- Reply with: file path, mode used, change-set size (commit count / PR count), section count, count of anything excluded, and any tickets that had no plan file
- If the user asked for a `.docx`: let them know the Markdown is saved and suggest: "Want me to convert this to a Word doc? Just say the word."

## Optional: non-default behaviors

If the user asks:

- **"Include agentic PRs"** — drop or narrow the Out of scope table; still no fake UI steps — summarize as "no manual UI"
- **"Engineering / AC only"** — produce acceptance-criteria style bullets (still grouped by PRISM-\*), not checkbox tables
- **"Single parent ticket list"** — emit one deduplicated bullet AC list with THR labels instead of long sections

## Subject-line templates by mode

The commit subject template branches per checklist-producing mode. Use the template for the mode you just ran:

- **Release:** `chore: Add QA checklist for <base> → <head>` (or `PRISM-NNNN:` variant when tied to a ticket)
- **Sprint / Group:** `chore: Add QA checklist for PRs #X, #Y, #Z` (or `chore: Add QA checklist for <range-slug>`)
- **Feature / PR:** `chore: Add QA checklist for PR #<number>` — and if a PRISM-NNNN is in the PR title, prefer `PRISM-NNNN: Add QA checklist for PR #<number>`
- **Bug-fix Verification:** `PRISM-NNNN: Add bug-fix verification plan for PR #<number>`

**AC Verification mode has no entry here** — it has no commit at all. Its deliverable is the saved report plus a plan `## History` pointer and a report-back verdict, per `mode-ac-verification.md` § 9. There is nothing to push.
