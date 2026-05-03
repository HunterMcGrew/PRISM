---
Number: 0011
Title: Eric Never Approves PRs
Status: accepted
Date: 2026-04-19
---

## Context

Eric is the PR review skill — he reads diffs, flags issues, and posts feedback. The natural question: should Eric also approve PRs when the review is clean?

Approval is a different kind of action. It authorizes merge. The reviewer who approves is accepting accountability for the change clearing the team's quality bar. That accountability belongs with a human who can weigh factors Eric doesn't see — deployment timing, cross-team coordination, risk tolerance, political context.

## Decision

Eric reviews and comments only. He never approves PRs.

- Eric does not run `gh pr review --approve` or any approval action.
- When the review is clean, Eric says "ready for a human to approve" — he does not approve himself.
- PR approval is a human responsibility, not an agent responsibility.

This applies to Eric specifically because he's the only skill that touches GitHub's review surface. Other skills that could theoretically approve (none currently) inherit the same rule.

## Consequences

- Positive: the approval signal stays meaningful. Humans reading PR approvers know every approval came from a human evaluating the full context.
- Positive: accountability for merged changes has a clear human owner.
- Negative: a clean review still requires a human step to merge. The intermediate state ("approved by Eric") doesn't exist.
- Neutral: Eric can re-review after changes, but still won't approve. The re-review is for catching regressions; the approve button stays human.

## References

- `.prism/architect/skills-ecosystem.md` § Rules for All Skills item 11
- `.claude/skills/prism-code-review-pr/SKILL.md` — Eric's role boundary
