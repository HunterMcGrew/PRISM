# Lilac — Phase Procedures

Read this at the start of a standup run and follow the phases in order. The skill body (`prism-standup-summary`) pins the phase index that names these phases; this file carries their bodies — Phase 1 (context), Phase 3 (assign/label/format), Phase 4 (assemble Yesterday), Phase 6 (interactive prompts), Phase 7 (assemble/preview/deliver) — plus the Common Issues catalog. Phase 2 (fetch) lives in [`./fetch.md`](./fetch.md); the Slack MCP posting procedure lives in [`./slack-mcp.md`](./slack-mcp.md). The rendering contract — bold labels, U+200B spacers, link format — lives in the template at [`../../templates/standup-summary.md`](../../templates/standup-summary.md); read it and follow it, do not reconstruct it here.

> _Running the standup phases — anchor the window, fetch (sibling ref), classify into four subsections, assemble against the template, prompt for Today/Blockers, then preview-confirm-deliver._

## Phase 1 — Context

### 1.1 Read the template

Open `<repo-root>/.prism/templates/standup-summary.md` in full. This defines the output format, window rules, link format, section structure, status labels, continuation rule, and worked example. Do not proceed without reading it.

### 1.2 Anchor the current date, time, and timezone

Run this single command to capture the current local datetime:

```bash
date "+%Y-%m-%d %H:%M:%S %z %Z %A"
```

Returns something like: `2026-04-17 14:22:05 -0500 CDT Friday`

Parse and store: `$TODAY_DATE`, `$NOW_TIME`, `$UTC_OFFSET`, `$TZ_ABBREV`, `$DAY_OF_WEEK`.

This is the single source of truth for "now" and "today." Never infer day-of-week from memory or the system prompt date alone.

### 1.3 Resolve the window

Compute `$SINCE_DATE` (start of window, inclusive) and `$UNTIL_DATE` (end of window, exclusive) as UTC ISO 8601 timestamps with a trailing `Z`. Emit the window boundaries in UTC so lexicographic string compares against GitHub's UTC-`Z` API responses (commit dates, review submitted_at) are correct. Mixing a local offset like `-0500` with GitHub's `Z` timestamps misclassifies events near local midnight.

Use GNU `date` syntax (Linux) — Claude Code's shell is Linux, so BSD `date -v` flags will fail with `invalid option -- 'v'`. On macOS locally, substitute `gdate` (coreutils) or the BSD equivalents (`date -v-1d`, `date -v-last-fri`).

```bash
# Default — yesterday 00:00 local to today 00:00 local, expressed in UTC
date -d "yesterday 00:00" -u "+%Y-%m-%dT%H:%M:%SZ"   # $SINCE_DATE
date -d "today 00:00"     -u "+%Y-%m-%dT%H:%M:%SZ"   # $UNTIL_DATE

# Monday exception — last Friday 00:00 local to Monday 00:00 local, expressed in UTC
# (covers Friday + full weekend, which the Monday default reports under "Friday & Weekend:")
date -d "last friday 00:00"          -u "+%Y-%m-%dT%H:%M:%SZ"   # $SINCE_DATE
date -d "today 00:00"                -u "+%Y-%m-%dT%H:%M:%SZ"   # $UNTIL_DATE
```

For user-specified ranges, parse the phrase into appropriate `$SINCE_DATE` / `$UNTIL_DATE` values and emit them in the same UTC-`Z` form.

### 1.4 Resolve the GitHub user

```bash
gh api user --jq '.login'
```

Store as `$USERNAME`. Run in parallel with step 1.3 where possible.

### 1.5 Confirm the resolved window to the user

Always echo the window before querying, so the user can catch a mistake immediately:

> Pulling activity from **Friday, April 17** (full day, local time).

## Phase 3 — Assign, label, and format

### 3.1 Detect status for every PR

For each PR, compute its status label from GitHub state:

- **`[merged]`** — PR appears in any merged-in-window query (2.2 or 2.5), or `state=closed` with a merge commit
- **`[draft]`** — `isDraft: true`
- **`[in review]`** — `state=open` and not draft (the catch-all for PRs that are open and ready for team eyes, regardless of whether formal reviews have been requested)

If `isDraft` isn't in the query JSON for a particular path, fall back to `gh pr view <number> --json isDraft,state,mergedAt` to resolve.

### 3.2 Detect pre-window commits for authored PRs

For every PR authored by the user (from queries 2.2 and 2.3), query the PR's commit history and check whether any commits authored by `$USERNAME` predate `$SINCE_DATE`:

```bash
gh api repos/${GITHUB_OWNER}/${GITHUB_REPO}/pulls/<number>/commits --jq "[.[] | select(.commit.author.email | contains(\"$USERNAME\")) | select(.commit.author.date < \"$SINCE_DATE\")] | length"
```

The `email | contains` check is a loose match — GitHub commit author identification varies, so the query looks for the username within the author's email field (e.g. `hunter@example.com` for username `hunter`). If the result is `> 0`, the PR has pre-window commits. Record this per-PR as `$HAS_PRIOR_COMMITS`.

If the email check is unreliable for a given user, fall back to matching `commit.author.name` against the GitHub display name resolved via `gh api user --jq '.name'`.

This check drives subsection assignment (3.3), not an inline prefix — the old `Continued ` prefix is retired.

### 3.3 Assign each PR to exactly one subsection

Walk the verified PR lists and assign each unique PR number to exactly one subsection using first-match-wins rules:

1. **`Reviewed`** — the user reviewed the PR in the window AND `author.login != $USERNAME`. Draws from queries 2.4 and 2.5; de-duplicate by PR number.
2. **`Merged`** — the user is the author AND the PR merged within the window (from query 2.2). Merge wins over pre-window commits — a merged PR always reports under Merged.
3. **`Continued`** — the user is the author AND the PR is still open AND `$HAS_PRIOR_COMMITS` is true for that PR. Covers both `[in review]` and `[draft]` states.
4. **`In Review`** — the user is the author AND the PR is still open AND `$HAS_PRIOR_COMMITS` is false. Covers both `[in review]` and `[draft]` states.

If the same PR somehow appears as both authored and reviewed (rare — GitHub's `--author=@me` and `--reviewed-by=@me` are usually disjoint), authored wins — classify by rules 2–4.

### 3.4 Format entries

For each PR, emit the line format from the template. The entry shape:

```
${TICKET_PREFIX}-NNNN: Title [#NNNN](url) [status][ — author]
```

Where:

- `${TICKET_PREFIX}-NNNN:` — ticket ID if present (colon-only split from the PR title)
- `Title` — PR title with the `${TICKET_PREFIX}-NNNN:` prefix removed
- `[#NNNN](url)` — standard markdown link; same syntax whether Lilac posts or the user pastes
- `[status]` — always present, from step 3.1
- ` — author` — only on `Reviewed` entries

No `Continued ` prefix — continuation is expressed through the `Continued` subsection, not by modifying the entry.

## Phase 4 — Assemble the Yesterday section

Render the Yesterday section for display in chat using the template's bold-label structure. The full rendering contract — which labels are bold, where the U+200B spacers go, how empty subsections are omitted — lives in [`../../templates/standup-summary.md`](../../templates/standup-summary.md). Follow the template's shape exactly; the four Yesterday subsections render in order: `Merged`, `In Review`, `Continued`, `Reviewed`.

Omit a subsection entirely when it has no entries — both the `**Label:**` line and the spacer that would have preceded it, per the template's omission rule.

If all four subsections are empty, tell the user warmly ("quiet stretch") and ask whether to proceed with the standup anyway (they might still have Today plans worth posting) or check a different window.

## Phase 6 — Interactive prompts

### 6.1 Today

Ask: "What are you going to do today?" Accept either multi-line or single-line input.

- **Multi-line input** (the user's response contains one or more newline characters) — preserve their formatting verbatim. No normalization.
- **Single-line input** — apply light list normalization (6.3) to turn a conversational sentence into scannable items, one per line.

If the user skips or leaves it blank, ask once more; if still blank, move on with an empty Today section.

### 6.2 Blockers

Ask: "Any blockers?" Accept multi-line input, single-line input, or the literal word `None`.

- If the user types "no," "nope," "nada," or any short negation, interpret as `None` and emit `None` on a single line — no normalization, no splitting.
- Multi-line input → preserve verbatim.
- Single-line descriptive input → apply 6.3 normalization.

### 6.3 Conversational normalization rule

Goal: turn a natural-language single-line answer into a clean list without changing the user's words. The user is still the authority on their own plan — this is formatting, not editing.

Steps (single-line input only; skip entirely for multi-line input):

1. **Split** on these delimiters, applied in order, first match wins per pass — walk the string left-to-right and split at each occurrence:
   - `and` (surrounded by spaces)
   - `, and `
   - `, `
   - `; `
   - `. ` (period-space between clauses, only when the next character would start a word)
2. **Trim** whitespace from each resulting item.
3. **Strip leading conversational filler** from each item — case-insensitive match against the start of the item, applied once:
   - `i'm `, `im `, `i am `, `i `, `and `, `also `, `then `
4. **Capitalize** the first character of each item.
5. **Drop empty items** (if a split produced one).
6. Emit one item per line.

Never remove or alter words that carry meaning — only the explicit filler listed in step 3 is stripped, and only from the start of an item. If the rule would produce something the user didn't say, fall back to emitting the input as-is on one line.

**Example:**

Input: `${PROJECT} sprint planning and im watching out for mega menu issues`
Split on `and`: `["${PROJECT} sprint planning", "im watching out for mega menu issues"]`
Strip filler: `["${PROJECT} sprint planning", "watching out for mega menu issues"]`
Capitalize: `["${PROJECT} sprint planning", "Watching out for mega menu issues"]`

Rendered:

```
${PROJECT} sprint planning
Watching out for mega menu issues
```

## Phase 7 — Assemble, preview, and deliver

### 7.1 Decide the delivery path

Ask: "Post to `${SLACK_CHANNEL}`, or would you rather paste it yourself?" (If no Slack MCP was found during detection, skip straight to the paste path and tell the user why.) If the user names a different channel ("post to #planning"), use that channel instead — default is `${SLACK_CHANNEL}`, never inferred. If the user switched channels, loop back to the channel-resolution step in [`./slack-mcp.md`](./slack-mcp.md) to resolve the new channel's ID.

### 7.2 Render the full standup

Assemble the full 4-section standup using the template structure in [`../../templates/standup-summary.md`](../../templates/standup-summary.md). No attribution line — the standup starts at the first bold label, and the Slack bot posts on the standup owner's behalf, so authorship is already clear. The bold-label structure, U+200B spacer placement, standard-markdown link format, and the no-code-block rule all live in the template — follow it exactly. Same rendering whether the standup goes to the post path or the paste path.

### 7.3 Preview and confirm

Show the user the exact message that will be posted, with the target channel named. No summary, no paraphrase — the rendered text. Wait for explicit confirmation ("yes", "post it", "go ahead", etc.) before proceeding to step 7.4. If the user wants to edit — for example, to fix a typo in their Today line — apply the edit, re-render, and re-confirm.

### 7.4 Post via Slack MCP

On confirmation with the post path selected:

- Use the tool name + parameter mapping recorded during the schema load in [`./slack-mcp.md`](./slack-mcp.md) and the channel ID recorded during channel resolution
- Call the tool with the mapped parameter names — typically `channel_id: <resolved ID>` and `message: <rendered standup>`, but defer to whatever the loaded schema advertises
- On success, confirm to the user with a short warm line. If the tool returns a message URL or permalink, include it.
- On failure, report the reason in one line and fall through to step 7.5 (paste fallback). Do not auto-retry — failures degrade with user awareness.

### 7.5 Paste fallback

When the user declines the post, the Slack MCP is unavailable, the channel search fails, or the post call fails:

- Present the already-rendered standup in chat as a plain-text block (no backticks wrapping it — Slack-facing) the user can copy
- Remind them of the target channel name

No re-rendering needed — link syntax is identical across both paths.

## Common Issues

### `gh` CLI not authenticated

Run `gh auth status` to confirm. If unauthenticated, stop and tell the user to run `gh auth login`.

### `gh search prs` returns an unexpected field error

The `--json` field list for `gh search prs` is narrower than `gh pr view`. Remove the offending field and fetch it via `gh pr view <n> --json <field>` if needed.

### PR title has no ticket ID

Emit the line with just the title and link, per the template's "Missing ticket ID" rule.

### A PR merged right at the window boundary

Use the `closedAt` / `mergedAt` timestamp as returned by GitHub. No fuzzing.

### User asks for a different window

Use the window they specified. The Monday-rolls-to-Friday rule is the default, not a lock.

### Slack MCP not connected

Skip the post path entirely. Tell the user once, then proceed with the interactive flow and deliver the pasteable standup.

### Slack MCP post call fails

Report the failure reason in one line. Fall back to the paste path. Do not auto-retry — the user may want to edit the message or defer to later.

### Channel search returns no match or fails

If `slack_search_channels` can't find `${SLACK_CHANNEL}` (or the override), fall through to the paste path and explain why. The user can post it themselves while the channel-name issue is sorted.

### User wants to post to a different channel

Accept the override for this invocation. The default `${SLACK_CHANNEL}` stays unchanged for future runs. Re-run the channel-resolution step in [`./slack-mcp.md`](./slack-mcp.md) to resolve the override's channel ID.

### Status label unclear

If `isDraft` isn't in the JSON for a particular query, hit `gh pr view <n> --json isDraft,state,mergedAt` for that PR. Classify per the rules in step 3.2.

### Continuation check returns nothing on a genuinely multi-day PR

The email-based author match in step 3.3 can miss if the user's GitHub commit email doesn't include their username. Fall back to matching `commit.author.name` against the GitHub display name resolved via `gh api user --jq '.name'`, or inspect commit dates against the PR creation date (`createdAt`) as a heuristic.

### MCP tool schema uses unexpected parameter names

The default assumption is `channel_id` + `message`, but some MCP variants may use `channel` + `text` or other shapes. The schema load in [`./slack-mcp.md`](./slack-mcp.md) catches this — do not skip that step.
