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

## 2026-05-04: When fixing a class of drift, sweep the full spec surface — not just the punch list

- **What happened:** THR-1826's first review pass caught Pixel AC and task 5 description referencing `states-canon.md` and `tailwind-tokens.md` (files that were never created — Pixel scope narrowed from 3 → 2 files during implementation). Briar logged 4 review issues, Clove cleaned them up, all marked `fixed`. Hunter then caught a 5th instance: ADR-0033 line 30's Tier 3 paragraph still listed `doctrine.md`, `states-canon.md`, and `tailwind-tokens.md` as the canonical examples. Same phantom-file class. Briar's first pass had focused on the AC and task body; the ADR's terminology fix on line 20 was on the punch list but the file roster on line 30 was a different surface and slipped through. Clove's cleanup faithfully executed the specified line numbers (15, 20, 34) without sweeping for the same drift class elsewhere.
- **Rule:** When a review surfaces a drift pattern (phantom file references, stale identifiers, count drift, terminology drift), the fix pass must include a full-repo grep for the same pattern across all spec surfaces — ADRs, architect docs, dev docs, plan files, skill files. The original review identifies _instances_; the cleanup pass enumerates the _class_ and sweeps it. A `grep -rn "<drifted-name>" .prism/ docs/` before declaring done would have caught ADR-0033 line 30 in the same pass.
- **Process takeaway:** Two how-to-think failures stacked. Briar's adversarial sweep didn't extrapolate from "AC has phantom files" to "where else might this class live?" — she stayed inside the AC/task surface. Clove's cleanup followed the line-numbered punch list as a literal recipe rather than a signal that there's a class to sweep. For Briar: when a review flags drift, the closing sweep must be class-level, not instance-level — grep for the drifted name before signing off. For Clove: when the punch list names specific lines, treat them as the _known_ instances and grep for siblings before committing. The architect-doc-verification rule already says diverged claims in ADRs are at minimum Major because of blast radius into agent context — the verification triage needs to apply not just to "is _this_ doc accurate?" but to "are all docs in _this class_ accurate?"

## When a build script applies the same logic across N branches, verify all N — not just the first one

**Why:** 2026-05-04 — `scripts/ai-skills/build.ts` runs three near-identical platform branches (Claude, Codex, Cursor) for each skill. Codex and Cursor both called `syncOptionalSkillPayloads()` to copy the `references/` folder into the platform output. The Claude branch had been written without it, so every Pixel/Reese/Nora reference link in `.claude/skills/<id>/SKILL.md` (`./references/doctrine.md` etc.) pointed to a nonexistent file. Caught only when verifying AC after the build, not while reading the script. The plan even cited `scripts/ai-skills/build.ts:84` (the `optionalSkillPayloads` declaration) as evidence the copy happened — the declaration was correct but only two of three branches consumed it.

**How to apply:** When the build script handles multiple platforms in parallel branches and the work depends on platform-output parity, diff the branches against each other before trusting the plan's assumption. A `grep -n syncOptionalSkillPayloads scripts/ai-skills/build.ts` would have surfaced the asymmetry in one round. More generally: when a plan's load-bearing claim names a specific source line as evidence, open that source and verify the line proves what the plan says it proves.
