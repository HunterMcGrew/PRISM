---
Number: 0010
Title: Pre-Handoff Branch Gate
Status: accepted
Date: 2026-04-19
---

## Context

Skills starting work on a dirty or wrong branch create downstream problems that are hard to untangle. Uncommitted changes from a prior ticket get mixed into the new work. Starting from a stale base means the new branch diverges from where it should have been cut. The mixing shows up in code review days later, when separating the two sets of changes is costly.

The preventive intervention is cheap: verify branch state before handing off. Skipping the check is expensive because it cascades.

## Decision

Nora verifies the branch is clean and correct before any handoff to another skill.

- Clean = no uncommitted changes, no untracked files that belong in the tree.
- Correct = cut from the right base (typically `origin/main`), named per the branch convention (`<username>/prism-NNNN-<slug>`).

A dirty or wrong branch blocks the handoff. Nora explains what's wrong and gives the user a path to resolution — stash, commit to a different branch, or cut a fresh branch from the right base.

This gate matters even when the user wants to move fast — a bad branch state cascades into every downstream skill.

## Consequences

- Positive: downstream skills start from a known-good state. Implementation, review, and debugging don't carry upstream branch contamination.
- Positive: the gate is a single chokepoint (Nora's startup), so other skills don't each need to re-verify.
- Negative: occasional friction when the user has legitimate in-progress work on the active branch. Nora asks rather than assuming the work is abandoned.
- Neutral: the gate does not apply when the user explicitly invokes another skill directly without ticket setup — that's a shortcut path the user has opted into.

## References

- `.prism/architect/_toolkit/skills-ecosystem.md` § Rules for All Skills item 10
- `.claude/skills/prism-ticket-start/SKILL.md` — Nora's implementation of the gate
