---
name: prism-standup
description: "Composes a four-section Slack standup (Project, Yesterday, Today, Blockers) from your GitHub PR activity plus two prompts, then posts it through a connected Slack MCP after you confirm, or returns a pasteable block. Reads its format from `.prism/templates/standup-summary.md`. Triggers: \"Lilac\", standup, daily sync, summarize my PRs, generate my standup."
model: sonnet
---

<!-- AUTO-GENERATED FILE. DO NOT EDIT DIRECTLY. -->
<!-- Source: .ai-skills/skills/prism-standup -->
<!-- Target: claude-agent | Regenerate with: pnpm prism:build -->

---
name: prism-standup
description: >
  Composes a four-section Slack standup (Project, Yesterday, Today, Blockers)
  from your GitHub PR activity plus two prompts, then posts it through a
  connected Slack MCP after you confirm, or returns a pasteable block. Reads
  its format from `.prism/templates/standup-summary.md`. Triggers: "Lilac",
  standup, daily sync, summarize my PRs, generate my standup.
argument-hint: "[time period, e.g. 'since Friday', 'this week']"
---

<!-- AUTO-GENERATED FILE. DO NOT EDIT DIRECTLY. -->
<!-- Source: .ai-skills/skills/prism-standup -->
<!-- Target: claude | Regenerate with: pnpm prism:build -->

Composes a four-section Slack standup (Project, Yesterday, Today, Blockers) from your GitHub PR activity and two prompts, then posts it through a connected Slack MCP or hands you a block to paste. It produces the standup and nothing else. Window: $ARGUMENTS

## Startup

- **Read `.prism/templates/standup-summary.md` on every run** and render from it, never from memory, because the team may have changed it. If it is missing, stop and name the path.
- **Anchor time** with `date "+%Y-%m-%d %H:%M:%S %z %Z %A"`, and never infer the day of the week. Compute `$SINCE_DATE` and `$UNTIL_DATE` for the template's window as UTC timestamps ending in `Z`, because GitHub's timestamps are UTC and the string compares below misclassify events near local midnight otherwise. Use GNU `date -d`, or `gdate` on macOS. Resolve `$USERNAME` with `gh api user --jq .login`, and echo the window to the user before querying.
- **Default repo** is `HunterMcGrew/PRISM`, and the default channel is `#prism-dev`. Holidays and PTO are not detected, so the user names a different window when one applies.

## Fetch PRs

Run the first query alone, then batch the rest, since one syntax error fails a whole batch. `--merged` is a boolean flag, so filter dates with `--merged-at="$SINCE_DATE..$UNTIL_DATE"`. `mergedAt` is not a `gh search prs --json` field, so use `closedAt`, or fall back to `gh pr view <n> --json mergedAt`.

- **Authored and merged:** `gh search prs --author=@me --merged-at=... --repo=... --json title,number,closedAt,isDraft --limit 50`.
- **Authored and open:** `--author=@me --updated=... --state=open --json title,number,createdAt,updatedAt,isDraft`.
- **Reviewed:** `--reviewed-by=@me --updated=...` and `--reviewed-by=@me --merged-at=...`, with `author,state` in the JSON fields.
- **Verify real activity.** `--updated` also matches comments, labels, and CI runs. Keep an open authored PR only if `gh api repos/HunterMcGrew/PRISM/pulls/<n>/commits` has a commit by you dated in the window. Keep a reviewed PR only if you are not its author and `pulls/<n>/reviews` has a review you submitted in the window.
- **Pre-window commits** decide Continued over In Review. Count your commits on the PR dated before `$SINCE_DATE`, matching the author email against `$USERNAME` and falling back to `commit.author.name` against `gh api user --jq .name`.
- **Status** comes from `isDraft` and `state`. When a query lacks `isDraft`, run `gh pr view <n> --json isDraft,state,mergedAt`.

## Assemble

- **Entries follow the template exactly.** They are PRs with a status, so "worked on", "continued", and "hoping to" are stripped, and the PR title is never reworded. Give an unclear title as written with "(title unclear)".
- **With no PR activity,** say so plainly, offer another range, and still offer the prompts, since a valid standup can have only Today and Blockers.
- **Ask "What are you going to do today?" and "Any blockers?"** The answers stay the user's words. Multi-line input goes in verbatim. Single-line input is split on " and ", ", ", and "; " into one item per line, with leading filler (i'm, im, i am, i, also, then) dropped and the first letter capitalized. Nothing else changes, because rewording the user's own plan puts words in their mouth. Ask a blank Today once more, then leave it empty.

## Deliver

- **Paste path** when no Slack MCP is connected or `#prism-dev` is empty. Say why once, and give the standup as plain text with no backticks and the channel named.
- **Otherwise ask** whether to post or paste. A channel the user names is used for this run only, and a channel is never inferred.
- **Find the posting tool** with `ToolSearch` for `slack`. Take a tool that sends a channel message immediately, and reject names ending `_draft` (saved to Drafts, a silent failure), `_schedule`, and `_canvas`. Ask the user when more than one clean candidate remains. Load its schema with `ToolSearch select:<exact-name>` and map the channel and message parameters from it, because wrappers differ (`channel_id` and `message` is common, not universal). Resolve the channel name to an ID with the channel search tool, stripping a leading `#`. If it finds none, use the paste path and say why.
- **Confirm before posting.** Show the exact rendered message and the target channel, and post only on an explicit yes. Re-render and re-confirm after any edit. Never retry a failed post. Report it in one line and give the paste block.

Before closing the session, append to `.prism/lessons.md` when a `gh search prs` flag or field behaved unexpectedly, or a Slack tool's schema differed from what is described here.

<!-- Optional Claude-only additions. Keep this file empty when not needed. -->
