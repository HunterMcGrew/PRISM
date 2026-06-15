# Code Review PR — GitHub Writes (batch D)

The batch D write commands for Eric's review (`prism-code-review-pr`). All thread replies, resolves, inline comments, labels, and the summary comment go out in **one** parallel batch — every write is an independent GitHub API call and the summary content doesn't depend on inline-comment success.

## Parallel batch D — all writes in one message

- **Strip old review labels** — remove all review labels before applying new ones. Run this first in the batch (it's independent of everything else). Loop through each label with a REST DELETE — `gh pr edit --remove-label` would go through GraphQL and fail on repos with GitHub Projects Classic still associated. Per-label DELETE preserves non-review labels (`bug`, `documentation`, etc.) that the bulk PUT endpoint would strip:
  ```bash
  for label in "effort:glance" "effort:quick" "effort:deep" "confidence:high" "confidence:needs-judgment" "review:has-minors"; do
    gh api "repos/<owner>/<repo>/issues/<pr-number>/labels/$label" -X DELETE >/dev/null 2>&1 || true
  done
  ```

- **Resolve fixed threads** — For each unresolved thread, check whether the referenced code is fixed in the current diff.
  - If the fix is confirmed: reply with a short confirmation, then resolve via GraphQL mutation:
    ```
    gh api graphql -f query='mutation { resolveReviewThread(input: {threadId: "<thread-id>"}) { thread { isResolved } } }'
    ```
  - If the fix is **not** confirmed: leave the thread open. Do not resolve threads without evidence.

- **Post new inline comments** — use the REST API (not `gh pr review`, which lacks file/line flags):
  ```
  gh api repos/<owner>/<repo>/pulls/<pr-number>/comments \
    -f body="Comment text" \
    -f commit_id="$COMMIT_SHA" \
    -f path="frontend/path/to/file.ts" \
    -F line=42 \
    -f side="RIGHT"
  ```
  **Important:** The `line` must fall within a diff hunk — you cannot comment on unchanged lines. If the line you want to comment on isn't in the diff, include the observation in the summary comment instead.

- **Update the summary comment** — write the summary to a temp file using a bash heredoc (do not use the Write tool for temp files — it requires a prior Read), then post/update it in the same batch as inline comments:
  ```bash
  cat > /tmp/pr-review-summary.md << 'EOF'
  <!-- code-review-pr-summary -->
  ...summary content...
  EOF
  BODY=$(cat /tmp/pr-review-summary.md)
  ```
  - If a comment exists (from step 4d): **update it** via `gh api repos/<owner>/<repo>/issues/comments/<comment-id> -X PATCH -f body="$BODY"`
  - If no comment exists: **create one** via `gh api repos/<owner>/<repo>/issues/<pr-number>/comments -f body="$BODY"`
  - The `<!-- code-review-pr-summary -->` marker is the first line of the composed comment body — it comes from `summary-template.md` and must remain at the top so the step 4d re-run check in `context-gathering.md` can locate an existing summary comment and PATCH it rather than creating a new one.
  - Never create duplicate summary comments — there must be exactly one per PR.

**Why one batch:** Every thread reply, resolve mutation, inline comment, and summary comment update is an independent GitHub API call. The summary content is fully determined by the review analysis — it does not depend on whether inline comments succeed. Posting them all in one message eliminates an extra round trip.

## Applying labels in batch D

After determining the two labels from the decision gate, apply them in the same batch D message as all other GitHub writes. **In state #3 only**, also flip the PR from draft to ready — the merge gate has been satisfied:

```bash
gh api repos/<owner>/<repo>/issues/<pr-number>/labels -X POST --input - <<EOF
{"labels": ["<effort-label>", "<confidence-or-status-label>"]}
EOF
gh pr ready <pr-number> 2>/dev/null || true
```

`gh pr edit --add-label` would go through GraphQL and fail on repos with GitHub Projects Classic still associated — the REST POST endpoint is unaffected. `gh pr ready` uses a different API path and works as-is.

Ready-flip only fires in state #3 — states #1 (critical/major) and #2 (unaddressed minors) leave the PR in draft so the merge gate stays in place until the next review pass.
