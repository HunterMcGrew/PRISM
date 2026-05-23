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

**How to apply:** Use the REST API workaround for label edits on this repo: `gh api repos/HunterMcGrew/PRISM/issues/<num>/labels -X POST --input - <<< '{"labels":["effort:X","confidence:Y"]}'`. Eric's batch D template in `prism-code-review-pr/shared.md` still uses `gh pr edit --add-label` — consider updating the template, or document the workaround in the skill source. Affects every Eric run on PRISM until either GitHub fixes the deprecation or PRISM's Projects Classic association is removed.
