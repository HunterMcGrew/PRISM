# PR Description Template

The agent-generated PR description. This is the spec Clove, Briar, and Eric read when generating or updating PR descriptions.

This template intentionally diverges from `.github/pull_request_template.md`, which stays minimal. A PR body using this richer structure signals an agent-aware flow generated it; a PR body matching the sparse GitHub template signals the PR was opened cold. See `.prism/rules/pr-description.md` — do not sync the two files.

File-level change details live in the GitHub diff, and acceptance criteria live in Linear and the branch plan. The PR body should never duplicate either.

**Keep this body current as scope evolves.** On squash-merge, this body becomes the merge commit description in `main` history — a stale body at merge time means a stale record forever. Agents auto-sync the agent-owned sections (Summary, What did you do?, Why did you do it?, How did you achieve it?) when the plan or branch drifts past the last body write; user-owned sections (any section the agent didn't originate) are preserved verbatim. See [ADR-0020](../spec/adrs/_toolkit/0020-pr-body-reflects-current-scope.md) and [.prism/rules/pr-description.md § Keeping the PR in sync with scope](../rules/pr-description.md).

**The template body starts after the `---` divider below.** The text above is template metadata for whoever edits this file or reviews the sync logic — do not include it in the generated PR description.

---

## Summary

[BLUF, scaled to the PR's size — one line for a small PR; for a large one, a lead line plus a few bullets naming the major moving parts. The reviewer should know what they're walking into before they scroll.]

## What did you do?

[A few sentences describing the change concretely.]

## Why did you do it?

[The problem or motivation. Link the Linear ticket's "Rationale" if it's already well-written there.]

## How did you achieve it?

[Approach, key decisions, patterns used. Skip this section if the change is self-evident from the diff.]

## Screenshots

[For UI changes. Delete this section if not applicable.]

## Notes

[Edge cases, follow-ups, reviewer callouts, deployment notes. Delete this section if there's nothing to add.]

## Ticket

[${TICKET_PREFIX}-#### or Linear URL]

## Type of Change

- [ ] Bug fix (non-breaking change which fixes an issue).
- [ ] New feature (non-breaking change which adds functionality).
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected).
- [ ] This change requires a documentation update.

## Before submitting this PR, please use the following list to prepare your PR:

- [ ] Git conflicts have been resolved.
- [ ] Build succeeds with no errors and/or warnings.
- [ ] You have removed all console.logs, unnecessary comments, and/or whitespace.
- [ ] All changes have been formatted using Prettier.
- [ ] If your change includes Javascript, you are using correct typings and avoiding the use of `any`.
- [ ] If this is a UI change, you've evaluated the accessibility of your code. Proper heading levels used, alt text attribute set on images, etc. https://www.a11yproject.com/checklist/ is a great list to learn and compare your code to.
- [ ] If this is a UI change, you've tested it on various screen sizes, especially on mobile and verified that your change does not cause unexpected side effects.
- [ ] If this is a UI change, you've included a screenshot of the adjustment.
- [ ] You've evaluated whether the code you are adding or editing is using best practices.
- [ ] If the area you're working in needs improvement that is out of scope, have you considered adding a fix within your PR or notified your team lead of the issue?
