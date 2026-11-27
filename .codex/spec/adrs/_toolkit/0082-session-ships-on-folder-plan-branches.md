---
Number: 0082
Title: The Session Ships on Folder-Plan Branches
Status: accepted
Date: 2026-11-18
---

## Context

[ADR-0003](./0003-authors-ship-reviewers-review.md) has the authoring persona commit, push, and open the PR. That fits a flat plan, where one persona builds the work in one run and the PR opens when it finishes.

A folder-plan run builds in bundles, and each bundle is a separate dispatched agent: `prism-implement` for the code, `prism-docs` for the docs, with the review stage after them. If each agent pushed when it finished, the first push would open a PR holding the code without its docs, or one bundle without the next. A reviewer would then read a half-built change, and the PR body would describe a state that is gone minutes later.

## Decision

On a folder-plan branch, `prism-implement` and `prism-docs` commit only. The session's PR stage pushes once and opens the draft PR, following `.prism/references/shipping-flow.md`. Reviewers never ship, as before. Flat-plan branches keep ADR-0003 unchanged.

Alternatives that lost:

- **Each stage pushes.** It opens a half-built PR, which is the failure above.
- **`prism-docs` ships its own PR.** The docs are part of the change the feature PR proposes, so a second PR splits one review into two and lets the code merge without its docs.

## Consequences

- Positive: the PR opens once, with code, docs, and the review record together, so the first reviewer sees a whole change.
- Positive: the per-user pause preference in ADR-0003 fired once, at the push, instead of once per bundle, until PRISM removed it on 2026-11-27.
- Negative: a session that stops before the PR stage leaves local commits and nothing on the remote. Nothing outside that worktree can see the work until a later session pushes it.
- Negative: the stage skills carry two shipping behaviors, one for folder plans and one for flat plans, and a reader has to check which kind of plan the branch holds.
- Neutral: the resume table's PR row picks up local commits on a folder-plan branch with no open PR, so a later session finishes the push without a new instruction.

## References

- [ADR-0003](./0003-authors-ship-reviewers-review.md)
- `.prism/plans/prism-522/plan.md`
- `.prism/references/shipping-flow.md`
- `.prism/rules/git-conventions.md`
