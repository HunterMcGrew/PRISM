# PR Review: GitHub Writes

The commands behind `prism-pr-review`'s posting step: labels, thread resolution, inline comments, and the summary comment. Each write is an independent API call, so send them in one parallel batch.

## Labels

A pass that labels at all applies exactly two: one effort label, and one confidence label or `review:has-minors`. The skill's three states pick them. Create a missing label with `gh label create "<name>" --description "<text>" --color "<hex>" 2>/dev/null || true`.

| Label | Color | Applies when |
| --- | --- | --- |
| `effort:glance` | `0E8A16` | Only plan files, docs, config, or copy changed |
| `effort:quick` | `FBCA04` | One concern, 3 or fewer files with logic changes, tests for new logic |
| `effort:deep` | `D93F0B` | More than 3 files with logic changes, several concerns, or cross-cutting. The default when unclear |
| `confidence:high` | `0E8A16` | State 3 with nothing open: every pass reads `swept` or `n/a`, and no judgment call or bookkeeping-only Minor remains |
| `confidence:needs-judgment` | `E4E669` | A judgment call remains, or the only Minors left are bookkeeping-only |
| `confidence:standards-only` | `BFD4F2` | The intent-conformance pass read a structural `not reached` for lack of criteria. A transparency label, not a finding |
| `review:has-minors` | `FBCA04` | A Minor stands that is not addressed, acknowledged, or bookkeeping-only, or a pass is unfinished (`not reached` for a reason of this round, or a bare `swept`). Takes the confidence slot |

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

List with `reviewThreads(first: 50) { nodes { id isResolved comments(first: 1) { nodes { databaseId body path } } } }`. Reply with a short confirmation to a thread whose fix you verified, then resolve it. The reply starts with `<!-- prism-agent -->`, like every comment this skill posts:

```
gh api graphql -f query='mutation { resolveReviewThread(input: {threadId: "<id>"}) { thread { isResolved } } }'
```

A failed mutation (stale id, missing `write:discussion` scope) is not retried. Leave the thread open and say so in the summary.

## Inline comments

The body starts with `<!-- prism-agent -->` on its own line. The marker is what separates an agent's comment from a person's when `reconcile.mjs` reads the PR, since agents post under the developer's own login.

```
gh api repos/<owner>/<repo>/pulls/<pr>/comments -f body="<text>" -f commit_id="<headRefOid>" -f path="<file>" -F line=<n> -f side="RIGHT"
```

`line` must sit inside a diff hunk. A 422 means it does not, so move the observation to the summary and do not retry with another line.

## Summary comment

There is one per PR. Its body opens with three fixed lines, in this order, then `## Summary`:

```
<!-- code-review-pr-summary -->
<!-- prism-agent -->
<!-- prism-verdict: state=<1|2|3> effort=<glance|quick|deep|-> confidence=<high|needs-judgment|standards-only|has-minors|-> -->
```

Re-runs find the existing comment by the first line and PATCH it, and a missing marker posts a duplicate. That marker keeps its pre-rename spelling so comments already on open PRs still match. The verdict line records the gate state and the labels applied, so `reconcile.mjs` can correct the labels from the PR number alone. `state` is the skill's state number, `effort` and `confidence` are the label suffixes, and `has-minors` stands for `review:has-minors`. State 1 applies no review labels, so it writes `effort=- confidence=-`.

The body carries a `### Pass coverage` section, one line per pass in the `REVIEW.md` coverage-line tokens. It is always emitted, because a pass nobody ran and a pass that found nothing look the same when both are absent.

```
gh api repos/<owner>/<repo>/issues/<pr>/comments --jq '.[] | select(.body | contains("<!-- code-review-pr-summary -->")) | .id'
```

Write the body to a temp file with a shell heredoc. PATCH `issues/comments/<id>` with `-f body="$BODY"` when an id came back, or POST to `issues/<pr>/comments` when none did.
