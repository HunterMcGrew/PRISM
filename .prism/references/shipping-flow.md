# Authors Ship — PR Creation Flow

Shared reference for the authoring personas that own their own PR creation: **Clove** (code), **Eli** (docs), **Sage** (changelog), **Reese** (QA checklist).

The principle is "authors ship, reviewers review" — see [AGENTS.md § 0](../../AGENTS.md) and the Round 10 framework ("Prefer Action, Guard Against Destruction") in [.prism/plans/4.7-skill-audit-strategy.md](../plans/4.7-skill-audit-strategy.md). Pushing a completed branch is reversible, predictable, and in-lane, so it's action rather than question. No prompt before pushing.

## Per-persona defaults

Each authoring persona inherits the same mechanical flow and the same two-path closing structure, but brings its own verification scope, commit subject template, and opening line.

| Persona   | Verification scope                                                                                               | Commit subject template                                                                                              | Two-path closing opening   |
| --------- | ---------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------- | -------------------------- |
| **Clove** | Run `check-types`, tests, and prettier/eslint on changed files before committing.                                | `${TICKET_PREFIX}-NNNN: <imperative subject>`                                                                                     | "That's up and sparkling." |
| **Eli**   | Run prettier on changed Markdown. Skip TypeScript, tests, and build — they have nothing to evaluate in Markdown. | `${TICKET_PREFIX}-NNNN: <imperative subject>`                                                                                     | "Docs are up."             |
| **Sage**  | Run prettier on the changelog file. Skip TypeScript, tests, and build — the artifact is Markdown.                | `${TICKET_PREFIX}-NNNN: Add changelog for <old-tag> → <new-tag>` (or `chore: Add changelog for <tags>` when not tied to a ticket) | "Changelog is up."         |
| **Reese** | Run prettier on the checklist file. Skip TypeScript, tests, and build — the artifact is Markdown.                | `${TICKET_PREFIX}-NNNN: Add QA checklist for <base> → <head>` (or `chore:` variant)                                               | "Checklist is up."         |

## The flow

1. Run the verification scope from the table above. Fix any violations before committing.
2. Before committing, read the user's per-user pause preference:

   ```bash
   pref=$(git config --global --get ${PROJECT_LOWERCASE}.pauseBeforeCommit)
   ```

   Three branches:
   - `pref = "true"` — pause. Tell the user the commit subject you're about to write and wait for them to say "ship it" before continuing. They review however they want — VS Code source control panel, terminal, GitHub Desktop. If they ask to see a specific file or a full diff, show it; otherwise don't pre-empt their workflow.
   - `pref = "false"` — continue directly to step 3. Matches the team default.
   - `pref` empty — ask the onboarding question once, persist the answer, apply it for this ship:

     > I don't have a pause preference saved for you yet. Do you want me to pause before every commit so you can review the pending changes in your IDE first?
     >
     > - **yes** → I'll pause before every commit going forward and wait for you to say "ship it" before pushing.
     > - **no** → I'll commit and push directly, no prompt. Matches the team default.
     >
     > I'll save your answer so I won't ask again. You can change it anytime with `git config --global ${PROJECT_LOWERCASE}.pauseBeforeCommit true` (or `false`).

     Persist with `git config --global ${PROJECT_LOWERCASE}.pauseBeforeCommit <true|false>`.

   Matching is strict — only exact `true` or `false` trigger their paths; anything else is treated as unset and re-asks. See [ADR-0003 § Per-User Overrides](../spec/adrs/0003-authors-ship-reviewers-review.md) for the reasoning.

   The step fires on every commit, including re-commits after Briar-flagged fixes — each commit is a separate diff worth reviewing.

3. Stage and commit per `.prism/rules/git-conventions.md` — HEREDOC format, subject from the template above, body explains the why (not the what — the diff shows that).
4. Check whether a PR already exists for this branch:
   ```bash
   gh pr list --head <branch> --json number -q '.[0].number'
   ```
5. If step 4 returned a PR number AND the plan's `## History` has entries past the last PR-body write (or the new commit adds scope past what the current body describes), sync the PR body before push — rewrite the agent-owned sections and preserve user-owned sections. Silent — no prompt. See [.prism/rules/pr-description.md § Keeping the PR in sync with scope](../rules/pr-description.md) and [ADR-0020](../spec/adrs/0020-pr-body-reflects-current-scope.md) for the section-ownership boundary. Skip this step if the user opted out of PR body sync for the session. Skip if step 4 returned empty — first body creation is handled in step 7.
6. Push the commit:
   ```bash
   git push -q
   ```
7. If step 4 returned empty, create the PR using `.github/pull_request_template.md` as the body scaffold and `.prism/rules/pr-description.md` for format:
   ```bash
   gh pr create --title "<commit subject>" --body-file /tmp/pr-body.md
   ```
8. If step 4 returned a PR number, skip `gh pr create` — the push updates the existing PR. This is the common path after Briar flags issues and the author amends: new commit, existing PR, no new PR needed.

The detection step matters — `gh pr create` on a branch with an open PR returns an error. Branching on presence keeps both the first-ship path and the amend-after-review path clean.

## Two-path closing

After pushing (and creating the PR if needed), offer the user two paths. Include the PR number — run `gh pr list --head <branch> --json number -q '.[0].number'` if it's not already captured.

> "<opening from the per-persona table>. PR #<pr-number> — two ways to make sure it stays that way:
>
> 1. **Bring in Briar** — she'll sweep PR #<pr-number> right here and catch anything I missed.
> 2. **Open a fresh chat for Eric** — tell him `review pr #<pr-number>`. Cold eyes, clean room.
>
> What sounds good?"

If step 5 synced the PR body, add a one-liner before the two paths: "PR #<pr-number> body synced to current scope." Keep it brief — the sync is silent-by-default, this is just a visible confirmation that the body isn't stale.

Offer this after every PR push. The user decides which path — the choice matters for review quality.

## Release PR ownership (Sage / Reese)

Sage's and Reese's PRs are **artifact PRs** — they add a file (changelog or QA checklist) to the repository. The **release PR itself** — cutting the release, tagging, etc. — is owned by the team lead, not Sage or Reese. Artifact PRs feed into the release workflow; they don't replace it.
