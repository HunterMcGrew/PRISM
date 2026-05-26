# Code Review PR — Context Gathering (in-branch mode)

The batch A/B/C command bodies for Eric's in-branch review (`prism-code-review-pr`). The phase skeleton and the "why" of each phase stay pinned in the skill; this reference holds the exact commands so the body stays scannable. Maximize parallelism — every independent call in a batch goes in one message.

## Phase 1 — Setup

1. Parse `$ARGUMENTS` to extract `<pr-number>`.

2. **Parallel batch A** — repo info + PR metadata + file list (all independent):

   ```
   gh repo view --json owner,name
   gh pr view <pr-number> --json number,title,headRefName,baseRefName
   gh pr diff <pr-number> --name-only
   ```

   Store `headRefName` as `<branch>`. Store the file list for classification and batch B.

2b. **PR classification** — classify the PR based on the file list from batch A:
   - **Non-code patterns:** `.claude/**`, `docs/**`, `*.md`, `.github/**`, `.vscode/**`
   - If **ALL** changed files match non-code patterns → **lightweight** review path
   - If **ANY** file falls outside these patterns → **full** review path (conservative default)
   - Store the classification as `<review-path>` (`lightweight` or `full`)

3. **No checkout.** In-branch mode reads files at the PR head via `gh pr diff` and direct reads against the PR's branch ref. The current working tree is not modified.

## Phase 2 — Context gathering (batch B then C)

4. **Parallel batch B** — metadata + file list + plan. Run ALL of these in a single message:

   a. **Plan lookup** — read `<repo-root>/.prism/references/plan-lookup.md` and execute every step. Use the PR head ref (`origin/<branch>`) when fetching the plan content — `git show origin/<branch>:.prism/plans/<plan-file>` reads the plan as it exists on the PR's branch.
      - **Override:** Never write a plan during in-branch mode — this is someone else's branch. If no plan exists, note "no plan found" and proceed. All findings go into the GitHub PR comment only.
      - If a plan exists: check `## Debugged Issues` and `## Review Issues` for open/fixed status, and respect `## Decisions` as intentional constraints.

   b. **Manifest** — read `<repo-root>/.prism/architect/manifest.json`. The file list is already available from batch A (`gh pr diff --name-only`).

   c. **Review threads** via GraphQL:
      ```
      gh api graphql -f query='{
        repository(owner: "<owner>", name: "<repo>") {
          pullRequest(number: <pr-number>) {
            reviewThreads(first: 50) {
              nodes {
                id
                isResolved
                comments(first: 1) {
                  nodes { databaseId body path }
                }
              }
            }
          }
        }
      }'
      ```

   d. **Existing summary comment check** — fetch early so you know whether to create or update:
      ```
      gh api repos/<owner>/<repo>/issues/<pr-number>/comments --jq '.[] | select(.body | contains("<!-- code-review-pr-summary -->")) | .id'
      ```

   e. **Commit SHA** for inline comments:
      ```
      gh pr view <pr-number> --json headRefOid --jq '.headRefOid'
      ```

   **Why batch all of these:** Plan, manifest, file list, threads, summary check, and commit SHA are completely independent. Running them sequentially wastes round trips.

5. **Parallel batch C — the big read.** Immediately after batch B returns, use the manifest + file list to compute everything needed, then issue ONE parallel batch containing ALL of the following:

   a. **Full diff**: `gh pr diff <pr-number>`

   b. **Architect docs** — read `<repo-root>/.prism/references/architect-context.md` and execute fully against the changed file list from batch B. Every matching pattern must be loaded — partial loads miss constraints. Skip any that don't exist.

   c. **All source files at the PR head** — from the file list, identify every file you'll need to read for review context (new/modified source files, not deleted files or config-only changes like `.claude/` files). Read them ALL in this batch using `git show origin/<branch>:<path>` so the read reflects the PR head, not the current working tree. Do not spread source file reads across multiple rounds — that is the single biggest time waste in this workflow.

   **Why pre-fetch every source file in Eric's main thread:** When the full path spawns subagents, the source-file content is passed *into each subagent's prompt* rather than re-fetched inside the subagent. Two reasons: (1) Each subagent re-reading the same files duplicates the read cost — pre-fetching once lets both subagents work from identical source material. (2) Subagents may have inconsistent filesystem access; passing content into the prompt removes any race condition between the two subagent contexts trying to read the same path. Batch C is the canonical pre-fetch.

   **Why no formatting checks in in-branch mode:** Formatters and linters need files on disk and per-package plugin resolution. In-branch mode reads from refs, not disk. Formatting/linting checks are deferred to CI on the PR — Eric flags only formatting issues visible in the diff itself (e.g. trailing whitespace, obvious style drift). For full formatter/linter runs against the PR's branch, the user opts into worktree mode.
