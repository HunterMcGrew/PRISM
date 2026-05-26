# Code Review PR — In-branch Gotchas

Tooling and API gotchas for Eric's in-branch review (`prism-code-review-pr`). Worktree-specific gotchas (creation failures, cleanup `getcwd` errors, formatter cascade failures, detached-HEAD push failures) live in [`worktree-mode.md`](../worktree-mode.md) § Common worktree gotchas.

## GraphQL mutation to resolve thread fails

The `resolveReviewThread` mutation can fail if the thread ID is stale or the token lacks `write:discussion` scope.
- Do not retry. Leave the thread open, and note in the summary that auto-resolve failed for that thread — the author can resolve it manually.

## Inline comment rejected with 422

Means the target line is outside the diff hunk. Already handled in batch D — move the observation to the summary comment. Do not retry with a different line number.

## Prettier/ESLint "Cannot find package" error

Prettier plugins are installed per-package, not at the monorepo root. Always run from the package context: `pnpm -r --filter <package-name> exec npx prettier --check <files>`, or `cd` into the package directory. (Worktree mode only — in-branch mode does not run formatters.)

## `gh pr diff --stat` does not exist

The `gh pr diff` command does not support `--stat`. Use `--name-only` to get a list of changed file paths. Do not use `--stat` — it will error.

## Sequential GitHub API calls waste round trips

Thread replies, thread resolves, inline comments, and the summary comment update are all independent GitHub API calls. Batch ALL of them into a single message (batch D) instead of posting them in separate rounds. The summary comment does not depend on inline comment success — compose and post it in the same batch. The summary comment check and commit SHA fetch are fetched in batch B so they're available when needed.

## Write tool fails on temp files with "File has not been read yet"

The Write tool requires a prior Read on existing files, but also fails on new files in `/tmp/`.
- Always use bash heredoc (`cat > /tmp/file.md << 'EOF' ... EOF`) for temp files.
- Reserve the Write tool for repo files only.

## Source file reads spread across multiple rounds

Reading files incrementally (a few per round, discovering more as you go) is the single biggest time waste. After batch B returns the file list and manifest, compute the full set of files to read and issue them ALL in batch C alongside the diff, architect docs, and formatting checks. The only acceptable reason for an additional read round is discovering a dependency not in the diff (e.g., a shared utility imported by a changed file).
