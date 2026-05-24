# Lessons

Append-only working memory for the dogfood install. Captures patterns from corrections, mistakes, and confirmed-good calls during work on PRISM itself — anything a future session would want to pick up without re-litigating.

## Format

One entry per pattern. Lead with the rule, then a `**Why:**` line (the trigger — usually a date and a one-line summary of what happened), and a `**How to apply:**` line (when the rule kicks in). Keep entries short — one sentence per line where possible.

```markdown
## Don't reach for X when Y is available

**Why:** 2026-05-02 — used X for Z and lost an hour debugging when Y would have done the same job in three lines.

**How to apply:** Check for Y first. Reach for X only when Y demonstrably can't carry the case.
```

Group related entries under topical headings. Update existing entries before adding new ones — duplicate lessons defeat the purpose.

## Scope

This file is for the **PRISM toolkit's own evolution** — patterns about how the build works, how the canonical sources behave, how the dogfood interacts with consumers. Team-side lessons (lessons a consumer team learns about their own codebase) belong in their own `.prism/lessons.md`, generated during onboarding.

## Why this file is otherwise empty

PRISM was extracted from a personal install of Thrive's `.claude/` toolkit. The original `lessons.md` carried 200+ lines of Thrive-specific corrections that don't apply outside Thrive. Phase 1 prune cleared them out. New lessons accumulate from PRISM development going forward.

## On Windows, the Write tool's `/tmp/` resolves to `D:/tmp/`, not the OS temp dir

**Why:** 2026-05-03 — wrote a PR body to `/tmp/pr1-body-new.md` via the Write tool, then `gh pr edit --body-file /tmp/...` failed with "system cannot find the file specified" because gh resolved `/tmp/` to `C:\Users\<user>\AppData\Local\Temp\` (Windows OS temp). The Write tool had actually placed the file at `D:\tmp\` (literal `/tmp/` on the D drive). Cost one round trip to locate.

**How to apply:** When passing files between the Write tool and a Windows-native CLI tool (`gh`, native git, etc.) on this dogfood install, use absolute Windows-style paths (`D:/...` or `C:/Users/.../Temp/...`) explicitly rather than relying on `/tmp/`. Or write the temp file inside the project tree (gitignored) so the path is unambiguous across tools.

## When updating cross-cutting docs, verify behavioral claims against current ADRs, not prior doc text

**Why:** 2026-05-23 — README update for #32 preserved the line "`.prism/rules/` for cross-cutting standards loaded into every conversation" because the prior README said it. That phrasing predated ADR-0035 (2026-05-22, three-tier rule loading) and was no longer accurate — only Tier 1 rules load unconditionally; Tier 2 is path-scoped via `paths:` frontmatter and Tier 3 is skill-internal. Hunter caught it on the merged PR, forcing a follow-up (#33).

**How to apply:** When updating user-facing docs (README, top-level guides) that describe runtime behavior of the system — loading model, persona routing, file resolution, etc. — re-verify each claim against the current ADRs in `.prism/spec/adrs/` before publishing. Don't trust the prior doc's wording on behavioral claims, even if you're "just updating" adjacent content. ADRs are the source of truth; docs paraphrasing them rot when an ADR lands but the doc doesn't follow.

## Epic plans are preserved, not deleted, despite branch-plan.md saying "delete"

**Why:** 2026-05-23 — Phase 1.5f close-out hit a rule-vs-practice divergence. `.prism/rules/branch-plan.md § Before Closing` says "Delete the plan — once decisions are promoted, delete the plan file. Git history preserves it if you ever need to look back." But the actual PRISM practice for shipped epic plans (1.5c, 1.5d, 1.5e all still exist) is to preserve them — the roadmap links each shipped epic to its plan file as an archived reference. Epic plans serve as durable historical records of the architectural decisions and persona changes the phase introduced, more useful preserved than deleted.

**How to apply:** Until the rule is reconciled with the practice, follow the practice for epic plans (preserve, mark `shipped` in roadmap). Regular ticket plans likely still follow the rule (delete after close). The branch-plan.md § Before Closing language needs an update to distinguish the two — flag for Winston (or a future Theo pass) to resolve. Surface as a follow-up: either tighten the rule to except epic plans, or formally delete the prior shipped epics if the rule's intent is to preserve only in git history.

## `gh pr edit --add-label` fails silently due to GitHub Projects Classic deprecation

**Why:** 2026-05-23 (Phase 1.5f, every PR) — `gh pr edit <num> --add-label "X"` returned exit 1 with `GraphQL: Projects (classic) is being deprecated...` for every label-apply attempt on PRISM. The deprecation hit a code path that prevents the label from being added entirely. Cost one round trip per PR to detect; fixed by switching to REST.

**How to apply:** Fixed in issue #39 — Eric's batch D template now uses the REST labels endpoint (`POST .../labels` for apply, per-label `DELETE .../labels/<name>` for strip) instead of `gh pr edit --add-label` / `--remove-label`. Entry retained as a record of the upstream `gh` CLI / Projects Classic deprecation in case the same symptom surfaces in other contexts (other repos, other tooling, other `gh` subcommands that route through the affected GraphQL path).

## Don't `replace_all` on text where the old value also appears as evidence

**Why:** 2026-05-23 (Wave 2 PR 2 Briar review followup) — Clove ran `Edit replace_all: true` to change `2026-05-24` → `2026-05-23` in a plan, intending to fix a History date drift. The replace swept the right places (History entry, PR Readiness "Last updated") but also swept the documentation of the bug itself — the prior Review Issue's `Problem:` and `Suggested fix:` lines that quoted `2026-05-24` AS EVIDENCE of the original drift, plus the new History line recording the fix that referenced both dates. After the replace those lines read tautologically ("dated `2026-05-23` but commit timestamped `2026-05-23`"; "drift (`2026-05-23` vs actual session date `2026-05-23`)"). The audit trail anchor was erased; Briar caught it on re-review.

**How to apply:** When a value appears in a document in two roles — (a) the value-in-use that needs correcting and (b) the value-as-evidence that documents the original error — `replace_all` will destroy role (b). Use targeted `Edit` calls with enough surrounding context to distinguish the two. The general test before any `replace_all`: grep for the target string and read the surrounding context for each match. If any match describes the value rather than uses it (Review Issue Problem/Suggested-fix lines, History entries documenting a fix, commit messages quoting prior wording), `replace_all` is the wrong tool. Targeted edits are slightly more work; preserving the audit trail is worth it.

## Self-restructure introduces step-number collisions

**Why:** 2026-05-24 (Wave 2 PR 3 — Eric reviewing his own restructure) — Clove restructured Eric's `prism-code-review-pr/shared.md` Phase 3 from one step to four (6, 7, 8, 9), but left Phase 4 starting at step 7 and Phase 5 starting at step 8 from the pre-restructure numbering. After the change, step numbers 7 and 8 each appeared twice with different meanings, ambiguating every "step N" citation in the procedure. The internal citation at line 551 (originally pointing at "step 12") had no anchor at all. Eric's review of his own restructure caught it — self-applicability verified the new pattern by catching a real defect in itself.

**How to apply:** Whenever a procedure gains or loses steps in any phase, renumber ALL subsequent steps in lockstep — not just the affected phase. Walk the procedure top to bottom after the edit and confirm step numbers run linearly with no duplicates. Internal citations referencing step numbers ("see step 6", "fallback to step 10") need to be re-verified against the new numbering — grep for `step <N>` after every restructure. This is the markdown equivalent of renaming a variable and forgetting to update every caller. The fix is mechanical, but easy to miss when the eye scans phase headers rather than step numbers.

## `gh api` writes error responses to stdout, not stderr

**Why:** 2026-05-23 (issue #39 PR #40 review) — Eric's batch D strip loop wrapped each `gh api ... -X DELETE` call in `2>/dev/null || true`, intending to silence 404 errors when stripping labels that aren't present. The strip ran "successfully" in the sense that labels were removed when present, but every first-review run on a clean PR spammed six `{"message":"Label does not exist","status":"404"}` JSON lines to chat — the redirect caught stderr, but `gh api` writes the error body to stdout. Eric caught it during his own smoke test of the batch D fix.

**How to apply:** When silencing `gh api` errors, use `>/dev/null 2>&1` (both streams), not `2>/dev/null` (stderr only). The `|| true` is still needed to swallow the non-zero exit code. Pattern: `gh api ... >/dev/null 2>&1 || true`. This applies to any `gh api` call where the response body shouldn't surface on failure — including DELETE calls that may 404 on missing resources. Standard `gh` CLI subcommands (e.g. `gh pr ready`, `gh pr view`) follow the normal stdout/stderr split; the inversion is specific to `gh api`.
