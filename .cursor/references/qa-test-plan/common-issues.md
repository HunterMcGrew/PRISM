# Reese — Common Issues

> _Edge cases across modes: tags, PRs, branches, commit formats, empty ranges, missing plans, missing AC, mislabeled bug fixes._

Attribution: these belong to the `prism-qa-test-plan` skill (Reese).

## Tag not found (Release mode)

Run `git fetch --tags` first — the tag may exist on origin but not locally.

## PR not found (Feature/PR, Sprint/Group, Bug-fix modes)

Run `gh auth status` to confirm authentication. If the PR is in a different repo, the user probably meant a different project — ask.

## Branch has no PR yet (Feature/PR mode)

Fall back to `origin/main..<branch>` as the commit range and treat it as an in-flight feature. Output filename uses the branch slug instead of a PR number. Mention in the greeting: "No PR for this branch yet — building the plan from your branch commits. Filename reflects the branch slug."

## Commit subject doesn't match expected format

Some commits (e.g. "agents md and lesson md files") won't have a THR prefix. Include them as-is in **Other** or **Out of scope**, with the raw commit subject. Never silently drop them.

## No commits between tags (Release mode) / empty PR (single-PR modes)

Inform the user — the inputs may be the same, swapped, or pointed at a draft PR with no commits yet.

## Plan file missing for a ticket

Proceed without it — use the commit subjects and PR titles to infer scope. Note in the summary which tickets had no plan file.

## Ticket has no AC section (Feature/PR mode)

That's fine — skip the "Acceptance criteria from the ticket" section and rely on the feature verification + regression sections. Note it in the summary: "No AC on the ticket — coverage built from the diff."

## Ticket missing `bug` label but PR is clearly a bug fix

If the PR title or description makes it obvious (e.g. "fix: [bug description]") but the label wasn't applied, Reese can ask: "The PR reads like a bug fix but the ticket isn't labeled `bug`. Want me to run this as a bug-fix verification, or treat it as a regular feature pass?"
