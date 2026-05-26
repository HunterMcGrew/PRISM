# Lilac — Phase 2: Fetch and Verify PR Activity

Read this when running Phase 2 — gathering the user's GitHub PR activity for the resolved window. The skill body (`prism-standup-summary`) pins the phase index; this file carries the full fetch procedure: the `gh search prs` gotchas, the four queries, and the in-window verification filters. Do not reconstruct these from memory — the flag and field gotchas have caused real failures.

> _Running the PR fetch — riskiest query alone first, then batch, then verify each result against actual in-window activity._

## 2.1 Fetch PRs — mind the `gh search prs` gotchas

Before running queries, read these — they've caused failures before:

- **`--merged` is a boolean flag, not a date filter.** Use `--merged-at="$SINCE_DATE..$UNTIL_DATE"` for date range filtering (range syntax keeps the window closed on both ends).
- **`--json` fields for `gh search prs` differ from `gh pr view` / `gh pr list`.** Notably, `mergedAt` is NOT a valid field for `gh search prs`. Use `closedAt`, `updatedAt`, `createdAt`, etc. If you need `mergedAt`, fall back to `gh pr view <n> --json mergedAt` or the REST API.
- **Run the riskiest query alone first.** Batching risky + safe queries in parallel means a syntax error kills the safe ones too.

## 2.2 Merged PRs authored by the user (run alone first)

```bash
gh search prs --author=@me --merged-at="$SINCE_DATE..$UNTIL_DATE" --repo=HunterMcGrew/agent-crew --json title,number,closedAt,isDraft --limit 50
```

## 2.3 Open PRs authored by the user, updated in the window (batch after 2.2 succeeds)

```bash
gh search prs --author=@me --updated="$SINCE_DATE..$UNTIL_DATE" --repo=HunterMcGrew/agent-crew --state=open --json title,number,createdAt,updatedAt,isDraft --limit 50
```

## 2.4 Reviewed PRs updated in the window

```bash
gh search prs --reviewed-by=@me --updated="$SINCE_DATE..$UNTIL_DATE" --repo=HunterMcGrew/agent-crew --json title,number,author,state,isDraft --limit 50
```

## 2.5 Reviewed PRs merged in the window

```bash
gh search prs --reviewed-by=@me --merged-at="$SINCE_DATE..$UNTIL_DATE" --repo=HunterMcGrew/agent-crew --json title,number,author,closedAt,isDraft --limit 50
```

## 2.6 Verify actual activity in the window

The `updated` filter from `gh search` is broad — it includes comments, label changes, and CI runs. Filter each query result by actual user activity before including it.

The jq filters below use lexicographic string compare against GitHub's UTC-`Z` timestamps. This only works because `$SINCE_DATE` / `$UNTIL_DATE` were emitted in UTC-`Z` in step 1.3.

**Open PRs — verify user pushed commits in the window:**

```bash
gh api repos/HunterMcGrew/agent-crew/pulls/<number>/commits --jq "[.[] | select(.commit.author.date >= \"$SINCE_DATE\" and .commit.author.date < \"$UNTIL_DATE\")] | length"
```

If `> 0`, include. Otherwise skip.

**Reviewed PRs — verify the user actually submitted a review in the window and is not the author:**

Filter out any where `author.login == $USERNAME`. Then verify a submitted review exists in the window:

```bash
gh api repos/HunterMcGrew/agent-crew/pulls/<number>/reviews --jq "[.[] | select(.user.login == \"$USERNAME\" and .submitted_at >= \"$SINCE_DATE\" and .submitted_at < \"$UNTIL_DATE\")] | length"
```

If `> 0`, include. Otherwise skip.
