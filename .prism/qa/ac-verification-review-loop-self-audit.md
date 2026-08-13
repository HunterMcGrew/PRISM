# AC Verification — review-loop-self-audit

- **Commit:** `50fc21f0b8e2cf55a178b3bd7f12cf0a6c8ea6a6`
- **Date:** 2026-07-25
- **Environment:** worktree `.claude/worktrees/wf_1e6d0e19-737-1` on `huntermcgrew/prism-review-loop-self-audit`
- **Plan:** `.prism/plans/review-loop-self-audit.md`
- **Counts:** 6 MET · 0 UNMET · 0 UNGRADEABLE (machine) · 3 awaiting human verification

## Verdict table

| ID | Verdict | Evidence type | Citation |
| --- | --- | --- | --- |
| AC-4 | MET | executed | `grep -cE '^\s*- \*\*(Subject\|Repair\|Ledger)\*\*'` → `3`; `grep -c 'loopBase = git rev-parse HEAD'` → `1`; control `grep -c '## The ladder'` → `1` (all exit 0) |
| AC-5 | MET | executed | anchor-name grep → `4`; `grep -c 'No anchor, no finding'` → `1`; control `grep -c 'Procedure C'` → `2` (all exit 0) |
| AC-6 | MET | executed | `pnpm prism:test` exit 0 — fold-in `ok 461`, back-out `ok 462`, escape-hatch `ok 463`; 586/586 pass |
| AC-7 | MET | executed | `grep -ciE 'self-inflicted\|marginal finding'` → `0` on both files (exit 1, no-match); control `grep -ci 'Minor'` → `4` (exit 0) |
| AC-8 | MET | executed | `grep -c 'resolve-live-plan' spec-scope-lint.ts` → `1`; `grep -rc 'archived' resolve-live-plan.ts` → `1`; control `grep -c 'export'` → `2` (all exit 0) |
| AC-9 | MET | executed | control `git diff --name-only` pre-build → empty; `pnpm prism:build` exit 0, zero mirror diff; `pnpm prism:check` exit 0 |

## Captured evidence

### AC-4 — three named surfaces and a frozen loop base

```
$ grep -cE '^\s*- \*\*(Subject|Repair|Ledger)\*\*' .ai-skills/skills/prism-review-loop/shared.md
3                                                    # exit 0 — expected 3
$ grep -c 'loopBase = git rev-parse HEAD' .ai-skills/skills/prism-review-loop/shared.md
1                                                    # exit 0 — expected 1
$ grep -c '## The ladder' .ai-skills/skills/prism-review-loop/shared.md
1                                                    # exit 0 — positive control, expected 1
```

The control returning 1 proves the probe reads a real file rather than passing on an empty or missing path.

### AC-5 — four anchors and the unanchored-observation clause

```
$ grep -cE 'A failing command|A violated acceptance criterion|A contradicted Decision|The original finding is still true' .ai-skills/skills/prism-review-loop/shared.md
4                                                    # exit 0 — expected 4
$ grep -c 'No anchor, no finding' .ai-skills/skills/prism-review-loop/shared.md
1                                                    # exit 0 — expected 1
$ grep -c 'Procedure C' .ai-skills/skills/prism-review-loop/shared.md
2                                                    # exit 0 — positive control, expected >= 2
```

The control at 2 matches the stated baseline, so the file was extended rather than rewritten. The anchor-name pattern was used as the criterion directs, not a positional `^[1-4]\.` list pattern.

### AC-6 — trip-wire fires on back-out, silent on fold-in

```
$ pnpm prism:test                                    # exit 0
ok 461 - fold-in fixture: a second surface of an artifact the plan already names passes clean
ok 462 - back-out fixture: an always-on rule unrelated to the plan fires
ok 463 - escape-hatch fixture: a ## Decisions entry naming the path suppresses the error
# tests 586
# pass 586
# fail 0
```

Both halves of the design's bar hold, and the assertions in `scripts/ai-skills/spec-scope-lint.test.ts` match what the criterion names:

- **back-out** asserts `deriveExitCode(...) === 1` and the violation record carrying `path: ".prism/rules/some-unrelated-rule.md"` — the offending path is named in the message.
- **fold-in** asserts `deriveExitCode(...) === 0` with `violations: []`.
- **escape-hatch** (positive control) asserts `deriveExitCode(...) === 0` on the back-out fixture plus a `## Decisions` entry naming the path — proving the back-out failure comes from Condition B, not from Condition A firing on any always-on file.

### AC-7 — no new severity taxonomy

```
$ grep -ciE 'self-inflicted|marginal finding' .ai-skills/skills/prism-review-loop/shared.md .prism/rules/followup-scope.md
.ai-skills/skills/prism-review-loop/shared.md:0      # expected 0
.prism/rules/followup-scope.md:0                     # expected 0
                                                     # exit 1 — grep's no-match exit, both counts 0
$ grep -ci 'Minor' .ai-skills/skills/prism-review-loop/shared.md
4                                                    # exit 0 — positive control, expected >= 1
```

The control at 4 confirms the existing severity vocabulary survives, so the zero above is a real absence rather than an empty read.

### AC-8 — one shared plan resolver, archived excluded

```
$ grep -c 'resolve-live-plan' scripts/ai-skills/spec-scope-lint.ts
1                                                    # exit 0 — expected >= 1
$ grep -rc 'archived' scripts/ai-skills/lib/resolve-live-plan.ts
scripts/ai-skills/lib/resolve-live-plan.ts:1         # exit 0 — expected >= 1 (the exclusion)
$ grep -c 'export' scripts/ai-skills/lib/resolve-live-plan.ts
2                                                    # exit 0 — positive control, expected >= 1
```

### AC-9 — mirrors regenerated, full check suite passes

```
$ git diff --name-only                               # positive control, run BEFORE the build
                                                     # empty — no .claude/, .codex/ or .cursor/ path dirty
$ pnpm prism:build                                   # exit 0
$ git diff --name-only                               # empty — zero diff against committed mirrors
$ pnpm prism:check                                   # exit 0
crossref-lint passed. All prose cross-references resolve.
install-adr-gate passed. No forbidden ADR references on the install surface.
install-relative-link-gate passed. All relative links on the install surface resolve.
spec-scope-lint: no live plan resolved for this branch — skipping.
verify-pack-parity: all 6 runtime-read path(s) present in the tarball.
```

Tree-clean discipline held: `git status -s` was empty before the first probe and after the last one.

## Awaiting human verification

AC-1 through AC-3 carry `Evidence (human)` lines. They need a real gauntlet run under the new design, which does not exist yet — no run of the loop has executed since the surface split landed. They are excluded from every machine count and surface at the human merge gate.

- [ ] **AC-1** — Given a gauntlet run whose first pass finds and fixes a prose issue, When the second pass runs, Then that fixed text is not re-raised. Run the gauntlet on a branch with one deliberate prose defect in the subject; read pass 2's findings — the pass-1 fix does not appear.
- [ ] **AC-2** — Given a repair-surface observation with no named anchor, When the loop processes it, Then it is written to the scoreboard as a follow-up and no fix pass opens. Read the closing scoreboard of a run that produced at least one repair-surface observation.
- [ ] **AC-3** — Given two consecutive passes with zero subject findings while other findings remain, When the second such pass completes, Then the loop stops and converts the remainder to follow-ups. Read the scoreboard for a subject-clean exit reason, the converted items, and a pass count below the 20-pass budget.

## Observations (not AC-graded)

- At the commit stamped above, `pnpm prism:check` reported `spec-scope-lint: no live plan resolved for this branch — skipping` — the branch name `huntermcgrew/prism-review-loop-self-audit` carries no ticket-id-shaped token, so `extractTicketId` returned null and the lint no-opped. `findUnfiledPlanCandidatesBySlug` (landed `265e2f28`, pass 2) closed that gap by resolving an unfiled branch's plan from its filename slug instead. At `HEAD`, `tsx scripts/ai-skills/spec-scope-lint.ts` reports `spec-scope-lint passed. No unrelated spec content found.` — the trip-wire now live-fires on the branch that authored it; no outstanding follow-up remains for this observation.
