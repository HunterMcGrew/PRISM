---
Number: 0086
Title: An Approved Epic Carries Its Children
Status: accepted
Date: 2026-11-19
---

## Context

Before #538, the workflow treated each child of an epic as a standard ticket with its own `intent.md` for the person to approve. PRISM-499's children skipped the intent and kept only `plan.md`. With no `spec.md`, `auto-approve.mjs` had no `## Affected systems` to check tasks against and always exited 1, so every child plan went to the person anyway.

Hunter's ruling on 2026-11-19: "if there is an epic like this, i approve the epic, i dont want to have to approve each child. If i want an agent or agents to work overnight, over 2 nights, on an approved epic, i dont want to have to check every hour."

Three alternatives were weighed against the one chosen:

- **An intent per child.** This was the status quo, and it is the per-child approval the ruling rejects.
- **A stub child `intent.md` stamped from the epic's approval.** Every reader of `intent.md` would stay unchanged. But it puts an approval stamp the person never gave on a file, which is what the approve guard exists to stop.
- **The child's acceptance criteria in a section of its `spec.md`.** This would change `REVIEW.md`, `.prism/review/intent-scope.md`, and `prism-self-review`, which read a folder's criteria from `intent.md` or `plan.md`. The review already reads `plan.md`'s `## Acceptance Criteria` for a folder with no intent, and every PRISM-499 child kept its criteria there.

## Decision

An epic child is a folder `.prism/plans/<child>/` holding `spec.md` and `plan.md` and no `intent.md`. The epic's approved intent covers it.

- **The child spec names its epic.** Its frontmatter carries `epic: <epic folder name>` and `child: <first-column value of its row in the epic spec's ## Children>`. `prism-spec` writes it in child mode, from the epic's intent, the epic's spec, and that row.
- **Auto-approval reads the epic.** For a folder with no intent, `auto-approve.mjs` requires that `epic:` names a sibling folder whose `intent.md` reads `status: approved` and `size: epic`. That folder's `spec.md` must also list the `child:` value in its `## Children` table. A child plan then auto-approves under the same conditions as any other plan.
- **Every folder needs an approved intent behind it.** For a standard folder, that intent is its own. Before this ADR, nothing checked the intent, and a standard folder with a draft intent could auto-approve.
- **A child's acceptance criteria live in its `plan.md`.** `prism-plan` writes them under `## Acceptance Criteria`, derived from the child's row and its spec. The review passes already read criteria from there for a folder with no intent, and read the epic's `intent.md` for the regression, security, and proposed-outcome surfaces.
- **The done range starts at the spec.** `tasks.mjs` starts a child's commit range at the commit that first added its `spec.md`, because there is no `intent.md` to start from.

## Consequences

- **Positive:** an approved epic runs through its children with the person asked only at the workflow's existing stops. No file carries an approval the person didn't give.
- **Positive:** the intent check also closes the gap where a standard folder with a draft intent could auto-approve.
- **Negative:** a child's acceptance criteria are written by an agent and approved by no person. The control is the epic's approved intent and the `## Children` row they derive from, plus review grading them. A wrong criterion is caught only if review spots it.
- **Negative:** the `## Children` check is only as strong as the epic's `spec.md`, which no person signs off. An agent that adds a row to the epic spec could add a child the person never saw. The workflow's scope-change rule is what governs that edit.
- **Negative:** a fresh session on a child branch with no folder yet finds no plan. Routing it to `prism-spec`'s child mode from `prism-start-ticket` is not built.
- **Neutral:** every reader of "the intent" needs an epic route for a child. `intent-scope.md`, `regressions.md`, `security.md`, `contracts.md`, `prism-self-review`, `prism-challenge`, `prism-plan`, and `prism-architect` each name it. A new reader has to add the same route.

## References

- `.prism/plans/prism-538.md`
- `.prism/rules/workflow.md` § the epic bullet and the Approval paragraph
- `.prism/architect/_toolkit/plan-chain-scripts.md` § Auto-approval, § Tasks and subjects, § Templates
- `.prism/architect/_toolkit/ticket-workflows.md` § Epic vs Story
- HunterMcGrew/PRISM#539 and HunterMcGrew/PRISM#540
