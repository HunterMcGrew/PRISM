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
