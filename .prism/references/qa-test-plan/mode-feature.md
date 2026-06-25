# Reese — Feature / PR Mode

> _Tight impact-analysis checklist scoped to one PR's diff._

Attribution: this mode belongs to the `prism-qa-test-plan` skill (Reese).

Triggered by a single PR (number, URL, or branch name) without bug-verification cues. Produces a tight impact-analysis checklist scoped to that one PR's diff.

## 1. Parse the input

- **PR number or URL:** resolve with `gh pr view <num> --json commits,title,headRefName,baseRefName,number,url`.
- **Branch name:** resolve with `gh pr view <branch>` (same JSON fields). If no PR exists for the branch yet, fall back to treating it as an in-flight feature: `origin/main..<branch>` is the commit range, no PR number yet.

## 2. Inline the Linear AC when a ${TICKET_PREFIX}-\* is in the PR title

If the PR title contains `${TICKET_PREFIX}-NNNN`, call `get_issue` and pull the `## Acceptance Criteria` section from the ticket description. These get inlined in the document so the tester can verify acceptance directly from the checklist without jumping to Linear.

## 3. Resolve the commit set and inspect the diff

```bash
gh pr view <num> --json commits -q '.commits[].oid'
```

Or, for a branch with no PR, use the `origin/main..<branch>` range. Then run `git show <hash> --stat` (or `gh pr diff <num> --name-only`) to see what surfaces the change touches — this is what drives the regression section.

## 4. Build the document

**Output path:**

- If a PR exists: `.claude/docs/qa/thrive-pr-<number>-qa-checklist.md`
- If branch-only (no PR yet): `.claude/docs/qa/thrive-<branch-slug>-qa-checklist.md`

**Header:**

```
# ${PROJECT} — PR QA Checklist

**PR:** [#<number> — <title>](<pr-url>)
**Ticket:** ${TICKET_PREFIX}-NNNN (inline; link to Linear)
**Scope:** Manual scenarios for the user-visible change in this PR, plus targeted regression on surfaces the diff touches.

**Who this is for:** Testers using the site like real visitors, plus the **content or block editor** when the change involves editor UI.

**How to use:** Each item records **Pass / Fail**, **browser**, **URL**, short **notes**, and a **screenshot** on failure.

---
```

**Body sections:**

1. **Before you start** — environment, toggles, preconditions
2. **Acceptance criteria from the ticket** (if ${TICKET_PREFIX}-\* found) — inline the AC items so testers can verify each one. Give them Pass/Fail checkboxes.
3. **Feature sections** — same format as Release feature sections, scoped to this one PR's change. Each with Tickets line, Goal, Steps | What "good" looks like table, and a Pass/Fail checklist.
4. **Targeted regression** — spot-checks on the specific shared surfaces the diff touched (not the broad release-style sweep). If no shared surfaces were touched, say so and include a minimal smoke test.
5. **Sign-off** — see [`shared-mechanics.md`](./shared-mechanics.md)

No "Out of scope" table (nothing to exclude — it's one PR) and no release-wide RTM table.
