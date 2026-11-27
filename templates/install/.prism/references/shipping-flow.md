# Shipping Flow — The PR Stage

The session runs this flow on a folder-plan branch, after the build commits are made, for code and docs together. `prism-implement` and `prism-docs` commit their bundles and never push. Sage and Reese keep their own flows, and a flat-plan branch ships through `prism-implement` and `prism-docs` instead.

Pushing a completed branch is reversible, predictable, and in-lane, so it is an action and not a question. The one pause is the user's own preference, read in step 2.

## Per-push invariant

This flow runs on every `git push`, not once per session. A fix-up commit after a review finding, a regeneration, a `lessons.md` append, and any other follow-up commit re-enters it at step 1, because each commit is a separate diff worth reviewing. A branch that has already pushed once doesn't treat the earlier steps as done.

## The flow

1. **Verify.** When a commit since `## Verification` touches a file those checks cover, on the first push as well as a later one, re-dispatch `prism-verify` on the new head first, per the After a fix part of `REVIEW.md`. A push that skips it ships checks that describe the tree before the fix. With no such commit, run nothing beyond the verify row: the verify stage already ran every check on the committed tree.
2. **Pause preference.** Read it here, because the build commits are already made:

   ```bash
   pref=$(git config --global --get ${PROJECT_LOWERCASE}.pauseBeforeCommit)
   ```

   - `pref = "true"`: pause. Tell the user the commit subject you are about to write and wait for "ship it". They review however they want, and you show a specific file or the full diff only if they ask.
   - `pref = "false"`: continue to step 3. This is the team default.
   - `pref` empty: ask once, whether they want to pause before every commit and review pending changes in their IDE first. Save the answer with `git config --global ${PROJECT_LOWERCASE}.pauseBeforeCommit <true|false>`, say they can change it the same way, and apply it to this ship.

   Matching is strict. Only an exact `true` or `false` takes its path, and anything else counts as unset and asks again. The pause fires before each push, which on a folder plan is once at the PR stage and not once per bundle commit, because a pause per bundle would put the person back in the loop.
3. **Commit** anything still uncommitted, except `.prism/metrics/review-misses.jsonl`, which the retro's `retro:` commit carries. Once `Retro:` is filled, commit the log alone with `node ${HOOK_RUNTIME_DIR}/plan/commit.mjs "retro: log review misses" .prism/metrics/review-misses.jsonl`. Commit per `.prism/rules/git-conventions.md`, with the subject form for the work, a body that explains why, and HEREDOC formatting.
4. **Find the PR.** Check whether one exists for the branch:

   ```bash
   gh pr list --head <branch> --json number -q '.[0].number'
   ```

5. **Sync the body.** When step 4 returned a number and the plan's `## History` has entries past the last body write, or the new commit adds scope the body doesn't describe, rewrite the templated sections before the push and preserve every other section, per `.prism/rules/pr-description.md`, under "Keeping the PR in sync with scope". Skip it when the user opted out for the session, and when step 4 returned nothing, because step 7 writes the first body.
6. **Push.** Name the remote branch, because `prism-start-ticket` creates the branch from `origin/${DEFAULT_BRANCH}`, which makes that its upstream. A bare `git push` then refuses on the first push, and git's hint points at the default branch. This form is safe on the first push and every later one.

   ```bash
   git push -q -u origin HEAD
   ```

7. **Open the PR as a draft** when step 4 returned nothing. The title is `${TICKET_PREFIX}-NNNN: <imperative subject>`, and the body follows `.prism/rules/pr-description.md` on the `.github/pull_request_template.md` scaffold. The body lists every `OPEN` Decision and every scope change since the intent, so the person can still veto one.

   ```bash
   gh pr create --draft --title "<title>" --body-file <body file>
   ```

8. **Update the PR** when step 4 returned a number: skip `gh pr create`, because the push updates it. This is the common path after a review finding is fixed.
9. **Watch CI.** Start `node ${HOOK_RUNTIME_DIR}/plan/watch-ci.mjs <pr>` in the background, and read a failed job with `gh run view <run-id> --log-failed`.

Detecting the PR first matters, because `gh pr create` on a branch with an open PR is an error. Branching on presence keeps the first ship and the later pushes clean.

## Draft by default

Every agent PR opens as a draft and stays one. GitHub blocks merging a draft, so nothing reaches the merge button until a person or the main session flips it ready, per "Who merges" in `.prism/rules/git-conventions.md`. A reviewer never flips it.

## Close

After the push, say one line: "PR #<number> is open as a draft." Include the number from step 4 or from `gh pr create`. If step 5 synced the body, add "PR #<number> body synced to current scope." before it.

Then run `node ${HOOK_RUNTIME_DIR}/review/reconcile.mjs <pr> --json`. For each human comment it reports as not yet logged, append one miss row to `.prism/metrics/review-misses.jsonl` in the shape `.prism/architect/_toolkit/review-runtime.md` gives under "The misses log", naming the nearest pass. The log is committed by the retro, per step 3.
