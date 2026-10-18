# PR Review: GitHub Writes

The commands behind `prism-pr-review`'s posting step: labels, thread resolution, inline comments, and the summary comment. Each write is an independent API call, so send them in one parallel batch.

## Labels

A pass that labels at all applies exactly two: one effort label, and one confidence label or `review:has-minors`. The skill's three states pick them. Create a missing label with `gh label create "<name>" --description "<text>" --color "<hex>" 2>/dev/null || true`.

| Label | Color | Applies when |
| --- | --- | --- |
| `effort:glance` | `0E8A16` | Only plan files, docs, config, or copy changed |
| `effort:quick` | `FBCA04` | One concern, 3 or fewer files with logic changes, tests for new logic |
| `effort:deep` | `D93F0B` | More than 3 files with logic changes, several concerns, or cross-cutting. The default when unclear |
| `confidence:high` | `0E8A16` | Both checks ran clean and no Minor stands |
| `confidence:needs-judgment` | `E4E669` | A judgment call remains, or the only Minors left are bookkeeping-only |
| `confidence:standards-only` | `BFD4F2` | The Spec check was skipped for lack of a spec. A transparency label, not a finding |
| `review:has-minors` | `FBCA04` | A Minor stands that is not addressed, acknowledged, or bookkeeping-only. Takes the confidence slot |

Strip and apply through REST. `gh pr edit` goes through GraphQL, which fails on repos still tied to Projects Classic, and the bulk PUT endpoint strips non-review labels such as `bug`.

```bash
for label in "effort:glance" "effort:quick" "effort:deep" "confidence:high" "confidence:needs-judgment" "confidence:standards-only" "review:has-minors"; do
  gh api "repos/<owner>/<repo>/issues/<pr>/labels/$label" -X DELETE >/dev/null 2>&1 || true
done
gh api repos/<owner>/<repo>/issues/<pr>/labels -X POST --input - <<EOF
{"labels": ["<effort-label>", "<confidence-or-has-minors-label>"]}
EOF
```

## Threads

List with `reviewThreads(first: 50) { nodes { id isResolved comments(first: 1) { nodes { databaseId body path } } } }`. Reply with a short confirmation to a thread whose fix you verified, then resolve it:

```
gh api graphql -f query='mutation { resolveReviewThread(input: {threadId: "<id>"}) { thread { isResolved } } }'
```

A failed mutation (stale id, missing `write:discussion` scope) is not retried. Leave the thread open and say so in the summary.

## Inline comments

```
gh api repos/<owner>/<repo>/pulls/<pr>/comments -f body="<text>" -f commit_id="<headRefOid>" -f path="<file>" -F line=<n> -f side="RIGHT"
```

`line` must sit inside a diff hunk. A 422 means it does not, so move the observation to the summary and do not retry with another line.

## Summary comment

There is one per PR. Its body opens with the literal line `<!-- code-review-pr-summary -->`, then `## Summary`, with nothing above them. Re-runs find the existing comment by that marker and PATCH it, and a missing marker posts a duplicate. The marker keeps its pre-rename spelling so comments already on open PRs still match.

```
gh api repos/<owner>/<repo>/issues/<pr>/comments --jq '.[] | select(.body | contains("<!-- code-review-pr-summary -->")) | .id'
```

Write the body to a temp file with a shell heredoc. PATCH `issues/comments/<id>` with `-f body="$BODY"` when an id came back, or POST to `issues/<pr>/comments` when none did.
