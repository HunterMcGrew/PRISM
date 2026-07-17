# AC Verification — PRISM-413 (eval-layer)

- **SHA:** 1dc1975ec542a9a4430fd1f5a96ce145480f9d4b
- **Date:** 2026-07-17
- **Environment:** branch `huntermcgrew/prism-413-eval-layer`, diff resolved via `origin/main..HEAD` (no PR yet — `ac-verify` runs before the review loop)
- **Grader:** Reese (AC Verification mode) — dogfood: this run exercises the mode this branch introduced, grading the plan that specified it.
- **Primary verdict:** `done` — all 6 machine criteria MET; AC-7 is human-tagged and awaits the merge gate.

## Verdict table

| ID | Verdict | Evidence type | Citation |
| --- | --- | --- | --- |
| AC-1 | MET | executed | Task E3 fixture run: `test -f <report>` exit 0; header grep matches branch SHA (1); plan `## History` pointer appended (1) |
| AC-2 | MET | executed | Task E3 fixture (2): `grep -c ZZZ_DELIBERATE_FAIL_SENTINEL README.md` → expected ≥1, observed 0 (exit 1) → graded UNMET; machine set carries ≥1 UNMET → report-back `needs-fix` |
| AC-3 | MET | inspected | Task E3 fixture (3) FC-3 "feels elegant" → UNGRADEABLE(ac-defect) (unfalsifiable, no derivable source); fixture (5) all-UNGRADEABLE plan → report-back `needs-replan` |
| AC-4 | MET | inspected | Task E3 fixture (4) FC-4 `Evidence (human)` → present under awaiting-human section (grep 1), absent from verdict table (`grep -c "\| FC-4 \|"` → 0) and from machine totals |
| AC-5 | MET | executed | E1 grep battery all pass; `grep -rl "acVerdicts"` → report-back.md (schema) + claude.md (pointer); `evidenceType` / reason-enum quoted in report-back.md only |
| AC-6 | MET | executed | `pnpm prism:check` → exit 0 (build --check, types, test, verify-manifest, crossref-lint, verify-pack) |

**Evidence-type ratio:** 4 executed / 2 inspected / 0 demonstrated. Zero `demonstrated` — no verdict rests on self-report; every MET is backed by a re-runnable command or a structural file inspection.

**Machine totals:** 6 MET / 0 UNMET / 0 UNGRADEABLE. (AC-7 excluded — human-tagged.)

**Integrity check (dogfood pass condition):** fixture (2), the deliberately-failing criterion, genuinely graded **UNMET** with byte-level expected-vs-observed (expected ≥1 sentinel match, observed 0, grep exit 1) — the grader distinguishes a real failure from a rubber stamp.

---

## Captured evidence

### AC-1 — report exists, SHA-pinned header, plan History pointer

Fixture `fixture-acv-pass` run produced a report; the mode's three AC-1 observations were executed against it:

```
test -f <report>                       → exit 0     (report exists)
grep -c "<branch SHA>" <report>         → 1          (SHA in header)
grep -c "AC-verification report at" <plan> → 1       (plan ## History pointer appended)
```

The real report you are reading is itself the second witness: it carries the SHA-pinned header above and its pointer is appended to `.prism/plans/prism-413.md` `## History`.

### AC-2 — deliberately-failing criterion grades UNMET (integrity check)

```
grep -c "ZZZ_DELIBERATE_FAIL_SENTINEL" README.md → 0   (grep exit 1)
```

Expected observation (from the fixture Evidence line): count ≥ 1. Observed: 0 matches, grep exit 1. Verdict rendered: **UNMET** (not MET, not UNGRADEABLE). Machine set = {FC-1 MET, FC-2 UNMET, FC-3 UNGRADEABLE} → ≥1 UNMET → report-back primary verdict **`needs-fix`**. Confirmed.

### AC-3 — UNGRADEABLE with named reason; all-UNGRADEABLE → needs-replan

- Fixture (3) FC-3 "the codebase feels elegant and well-architected" carries no falsifiable procedure and no derivable evidence source → **UNGRADEABLE(ac-defect)**.
- Fixture (5) `fixture-acv-allungr` (GC-1 "it is robust", GC-2 "performance is acceptable") — every criterion unfalsifiable, none derivable → all UNGRADEABLE → report-back primary verdict **`needs-replan`** (not `done`). Confirmed.

### AC-4 — human-tagged criterion in awaiting-human checklist, absent from machine counts

```
grep -c "FC-4" <report>        → 1   (present under "## Awaiting human verification")
grep -c "| FC-4 |" <report>    → 0   (absent from the verdict table)
```

FC-4 (`Evidence (human)`) surfaced only in the awaiting-human section and was excluded from the 1 MET / 1 UNMET / 1 UNGRADEABLE machine totals. Confirmed.

### AC-5 — consistency greps + acVerdicts schema single-owner

```
grep -rn "four modes" .ai-skills/skills/prism-qa-test-plan/          → 0 matches (exit 1)   PASS
grep -c  "four modes" .claude/skills/prism-qa-test-plan/SKILL.md      → 0                    PASS
grep -c  "AC Verification" .ai-skills/skills/prism-qa-test-plan/shared.md → 8  (≥2)          PASS
grep -cn "ac-verify" step-04-dispatch.md                             → 2 hits               PASS
grep -cn "ac-verify" lib/goal-state.md                               → 1 hit                PASS
grep -rl "acVerdicts" .prism/skills .ai-skills/skills
    → .prism/skills/prism-conductor/lib/report-back.md   (schema — the sole quote)
    → .ai-skills/skills/prism-conductor/claude.md         (pointer: "per lib/report-back.md § Evidence fields")
grep -rln "evidenceType" .prism/skills .ai-skills/skills  → report-back.md only               PASS
grep -rln '"ac-defect"'  .prism/skills .ai-skills/skills  → report-back.md only               PASS
strip-rule present: acceptance-criteria.md (1), sync-ac.md (1)                                 PASS
consumer edits present: Eric, Clove, Iris (step-02), Zoe                                       PASS
```

Two files reference `acVerdicts`, but only report-back.md *quotes the schema fields*; claude.md is a pointer. AC-5's UNMET signature ("a second file quoting the schema fields") does not occur. MET.

### AC-6 — pnpm prism:check

```
$ pnpm prism:check
...
verify-pack-parity: all 5 runtime-read path(s) present in the tarball.
PRISM_CHECK_EXIT=0
```

Exit 0 across build --check, types, test, verify-manifest, crossref-lint, verify-pack. No hand-edited mirror drift, no body-line-cap failure. MET.

---

## Awaiting human verification

These criteria are human-tagged (`Evidence (human)`); they are never machine-graded and are excluded from the machine totals. They surface at the human merge gate.

- [ ] **AC-7** — Given a completed AC-verification run inside a Sol lifecycle, When the run closes, Then Iris ingests the `.prism/qa/` report as charter-item-1 evidence rather than re-deriving fidelity independently.
  - Verification (human): trace one conducted run end-to-end and confirm the Iris retro report cites the AC-verification report path from the plan pointer (no independent re-derivation of "did we do what we said"). UNMET looks like: the retro re-computes AC fidelity with no reference to the `.prism/qa/` report.
  - Note: the wiring this criterion depends on is present in the diff — Iris's `step-02-gather-evidence.md` ingests `.prism/qa/ac-verification-<ticket-id>.md` via the plan `## History` pointer. The end-to-end trace is the human confirmation this criterion asks for; it cannot be machine-observed from a static diff at `ac-verify` time.
