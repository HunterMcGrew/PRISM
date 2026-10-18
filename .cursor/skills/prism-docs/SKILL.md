---
name: prism-docs
description: >
  Writes or updates feature docs, usage guides, and control inventories from a
  code diff, a plan, or an interview, in the repo's configured doc root, and
  ships the docs PR. Writes docs only, never code. Triggers: "Eli", document
  this feature, write the docs, generate feature docs, update the docs.
argument-hint: "[branch name, feature description, or doc path to update]"
---

<!-- AUTO-GENERATED FILE. DO NOT EDIT DIRECTLY. -->
<!-- Source: .ai-skills/skills/prism-docs -->
<!-- Target: cursor | Regenerate with: pnpm prism:build -->

Creates or updates a documentation page from a code diff, a plan, or an interview, in the repo's doc root, and ships it. It writes docs only: code goes to `prism-implement` and planning to the plan skill. Task: $ARGUMENTS

<!-- atlas:domain-context -->
Populated during onboarding from the team's actual product domain.
<!-- atlas:end -->

## Startup

- **Read the doc config** from the `documentation` block of `.ai-skills/config.json`: `location` (where docs live), `audience`, `keepsDevDocs`, and `format`. Never assume a path or an audience. The documentation architect doc, which the manifest routes for the doc root, holds the frontmatter schema, naming rules, category list, and cross-reference map. In a consumer repo, also read its own documentation-conventions architect doc when it exists.
- **Resolve the source** from `$ARGUMENTS` (a branch, PR, tag range, doc path, or topic), else from the current branch's diff against `main`. With neither, ask what to document. With no diff, interview the user: what the feature does, who uses it, how, and its limits.
- **Read the plan** per `.prism/rules/branch-plan.md` § Plan Lookup, including `## Decisions` and `## History`. They hold choices already made about tone, structure, and terms, and ignoring them undoes earlier work.
- **Confirm the audience** from `documentation.audience` in one line before writing, because a doc for the wrong reader wastes both sides' time.
- **Verify the plan against the codebase.** The plan is context, not truth: glob every file path and grep every identifier it names before a doc repeats it. Where they disagree, document what exists and flag the discrepancy. A confident doc that names a path or component that does not exist is the most common doc failure.

## Write

- **Update before creating.** Look for an existing page on the topic and edit it, keeping its structure and tone. For a new page, read the sibling headings and link to overlap instead of repeating it. When the diff touches a feature that has no page, offer to write one.
- **Structure follows `.prism/references/user-doc-template.md`.** For a developer-facing page (only when `keepsDevDocs` is true), use the dev template that the architect doc names.
- **Describe observable behavior, not implementation.** User docs carry no function names or file paths, because they go stale with each refactor.
- **For user docs, build a control inventory from source.** Every setting, toggle, and option the feature exposes gets a description, not only those the plan lists. Report a control whose behavior is unknown instead of inventing it.
- **Frontmatter** follows the schema in the architect doc, with `last_updated` set to today.
- **After writing,** add the page to the sidebar config when `documentation.format` uses one (a new category directory needs its own sidebar config and a landing-index link), and to the landing index. Add a cross-reference row when the page covers a topic a `.prism/` file also covers. Append a `## History` line to the plan. In a consumer repo, team doc-convention entries go in `.prism/architect/documentation-conventions.md`, because `prism update` overwrites the architect doc PRISM ships.

## Ship

- **Ship it yourself** (authors ship). Docs have no agent reviewer, so the human flips the PR ready. Run prettier on the changed Markdown only, since types, tests, and build have nothing to check. Re-read the Markdown cold for session-context leakage per `.prism/rules/writing-voice.md` § Anti-pattern: Session-context leakage. Read `git config --global --get prism.pauseBeforeCommit` first: `true` means state the commit subject and wait for "ship it", and unset means ask once and save the answer with `git config --global`. Commit as `PRISM-NNNN: <imperative subject>`, push, and open a draft PR with `gh pr create --draft`. If `gh pr list --head <branch>` already finds one, the push updates it. The PR title is the commit subject, and the body carries the reasoning (what changed, why, how) and the ticket link, never a file list or the AC.
- **Close** with the doc paths and the PR number. If a decision log emerged while writing, propose the plan skill for ADR promotion. Propose handoffs and never invoke them.

Before closing the session, append to `.prism/lessons.md` when an assumption about the feature's audience or scope proved wrong, or a codebase pattern made the feature hard to document.

<!-- Optional Cursor-only additions. Keep this file empty when not needed. -->
