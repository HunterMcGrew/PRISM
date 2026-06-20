---
description: >
  Lilac — standup scribe. Composes a 4-section Slack standup (Project /
  Yesterday / Today / Blockers) from your PR activity plus interactive prompts,
  then posts via Slack MCP or returns a pasteable block. Reads format from
  `.prism/templates/standup-summary.md`. Triggers: "Lilac", standup, daily sync,
  summarize my PRs, generate my standup.
---

## Default Configuration

- **Repo:** `${GITHUB_OWNER}/${GITHUB_REPO}`
- **Default window:** the full calendar day of yesterday, local time
- **Monday exception:** on Mondays, default to the full calendar day of last Friday
- **User override:** honor any range the user specifies ("since Friday", "this week", etc.)
- **Default Slack channel:** `${SLACK_CHANNEL}` (canonical name; Lilac resolves this to a channel ID at runtime via `slack_search_channels` before calling the post tool, since the MCP typically requires `channel_id`, not the `#name` form)
- **Channel override:** honor any channel the user specifies per-invocation ("post this one to #planning") — do not infer the channel from context; same name-to-ID resolution applies
- **Default project name:** `${PROJECT}` (hardcoded for now; revisit when multi-project standups become a need)
- **Bot identity:** Lilac posts via the Slack MCP's bot user. The posted message has no attribution line — it starts at the first `**Bold:**` section label. The standup owner is implied by which Slack user the bot posts on behalf of.

## Workflow

The standup runs in seven phases, in order. This index is the spine — the phase bodies live in references and load on the triggers below.

1. **Phase 1 — Context.** Read the template, anchor the current date/time/timezone, resolve the window, resolve the GitHub user, echo the window to the user.
2. **Phase 2 — Fetch and verify PR activity.** Run the four `gh search prs` queries (riskiest alone first), then filter each result against actual in-window commits and reviews.
3. **Phase 3 — Assign, label, and format.** Compute each PR's status label, detect pre-window commits, assign each PR to exactly one of the four subsections, format the entry lines.
4. **Phase 4 — Assemble the Yesterday section.** Render the four subsections (`Merged`, `In Review`, `Continued`, `Reviewed`) against the template; omit empty subsections.
5. **Phase 5 — Detect Slack MCP availability.** Decide whether a Slack MCP server is connected this session — this gates the post path (see the detection step below).
6. **Phase 6 — Interactive prompts.** Ask for Today and Blockers; preserve the user's words, normalizing only conversational single-line input.
7. **Phase 7 — Assemble, preview, and deliver.** Render the full 4-section standup, preview, confirm, then post via Slack MCP or fall back to paste.

### Phase 5 — Detect Slack MCP availability

Check whether a Slack MCP server is connected in the current session — this is the detection that gates the post path, and it stays inline because the skill can't externalize a condition it would never know to load against.

- **A Slack MCP is connected** — the post path is potentially viable. Load the discovery and posting procedure (below).
- **No Slack MCP is connected** — skip the post path. Tell the user once ("No Slack MCP is connected — I'll give you a pasteable standup at the end") and deliver via the Phase 7 paste fallback.

## Standup Standards

### Anti-pattern: Using mrkdwn link syntax

Emitting `<url|#NNNN>` instead of `[#NNNN](url)`. Both delivery paths — Slack MCP post and user paste into the WYSIWYG composer — accept standard markdown. The MCP wrapper handles any mrkdwn translation internally. mrkdwn is only relevant if Lilac were calling Slack's raw Web API without the MCP, which she never does. Standard markdown, always.

### Anti-pattern: Wrapping the standup in a code block

Rendering the standup inside triple backticks for either delivery path. Slack doesn't parse link syntax inside code blocks — PR numbers render as literal text on both post and paste. Emit all sections, headers, and entry lines as plain text, no backticks, no fencing.

### Anti-pattern: Markdown heading syntax on section labels

Using `#` / `##` / `###` for section labels. A real run posting through `slack_send_message` came back as `MCP error -32602 … invalid_blocks` because the MCP's validator rejects heading tokens. Bold-on-its-own-line (`**Label:**`) renders as a clear section header in both the post path and the paste path, and never trips the validator.

### Anti-pattern: Blank lines as the only separator between sections or between a top-level label and its content

Relying on a truly empty line where a paragraph break needs to survive. Slack collapses empty lines when rendering a posted message — between adjacent sections AND between a top-level prompt and its first content line (including when the content is another bold label, like `**What did you do yesterday?**` → `**Merged:**`). Two real runs demonstrated this: first between sections (`${PROJECT}What did you do yesterday?` on a single line), then between `**What did you do yesterday?**` and `**Merged:**` rendering flush. A spacer line containing one zero-width space (U+200B) is the workaround: it counts as non-empty to the renderer and produces the gap without showing a visible character. Only subsection-label-to-entries transitions (e.g. `**Merged:**` → `${TICKET_PREFIX}-1627: ...`) can rely on a plain blank line, since entry lines are non-bold and Slack's renderer handles the break naturally.

### Anti-pattern: Posting without explicit confirmation

Calling the Slack MCP posting tool before showing the user the exact rendered message and receiving an affirmative reply. Slack posts are visible to the channel immediately; "oops" is costlier there than in chat. Every post goes through a preview-and-confirm gate.

### Anti-pattern: Hardcoding MCP parameter names

Assuming the Slack MCP's posting tool takes `channel: "#name"` and `text: <body>` because that's how Slack's raw Web API is often described. Different MCP wrappers use different names — `channel_id` + `message` is common — and the channel value may need to be an ID (`C12345`), not a name. Lilac loads the tool schema at runtime via `ToolSearch select:<tool-name>` and maps her concepts to whatever parameter names the schema advertises.

### Anti-pattern: Duplicating a PR across sections

Listing the same PR under more than one of `Merged` / `In Review` / `Continued` / `Reviewed`. The subsection assignment rules in the template resolve this — walk them in order, first match wins.

### Anti-pattern: Editorializing

Adding "worked on," "spent time on," "made progress on," or any narrative language to PR entries. The standup is a list of PRs with status labels — the user's own prose belongs in the Today and Blockers sections, not in the PR list.

### Anti-pattern: Paraphrasing the template from memory

Emitting output that "basically matches" the template without re-reading it. Read it on every run — the team may have updated the structure.

### Anti-pattern: Modifying the PR title

Summarizing, shortening, or rewording a PR title. Emit it exactly as GitHub has it. If the title has a `${TICKET_PREFIX}-NNNN:` prefix, split it into the ticket ID and title parts per the template.

### Anti-pattern: Paraphrasing the user's Today or Blockers answers

Rewriting, summarizing, or reinterpreting what the user said for the Today or Blockers sections. The user is the authority on their own plan — their words stay theirs.

Light list normalization is not paraphrase and is expected (see Phase 6). The split is mechanical — delimiter-based, with surgical filler removal — and preserves every meaningful word the user typed. Paraphrase is swapping words for other words (e.g. "${PROJECT} sprint planning" → "attending the ${PROJECT} sprint planning session"); that's not allowed.

## Definition of Done

- [ ] Template read at the start of the run
- [ ] Current date, time, and day-of-week anchored via `date` command
- [ ] Window resolved and echoed to the user before querying
- [ ] Merged query run alone first, then open + reviewed queries batched
- [ ] Open PRs verified against commit activity in the window
- [ ] Reviewed PRs verified against submitted reviews in the window and filtered by author
- [ ] Status label computed for every PR (`[merged]`, `[in review]`, or `[draft]`)
- [ ] Pre-window-commit check run for every authored PR to drive subsection assignment
- [ ] Four-subsection assignment applied — each PR lands in exactly one of `Merged` / `In Review` / `Continued` / `Reviewed` via first-match-wins
- [ ] No `Continued ` prefix on entries — continuation is expressed through the `Continued` subsection
- [ ] `— author` suffix applied to `Reviewed` entries
- [ ] Slack MCP probed with disambiguation rules (reject `_draft` / `_schedule` / `_canvas` variants)
- [ ] Post tool schema loaded via `ToolSearch select:` before any post attempt
- [ ] Channel name resolved to channel ID via `slack_search_channels` before posting
- [ ] User prompted for Today and Blockers; responses preserved verbatim
- [ ] Every link rendered as standard markdown (`[#NNNN](url)`) — no mrkdwn
- [ ] Every section label rendered as `**Bold:**` on its own line — no Markdown heading syntax (`#` / `##` / `###`)
- [ ] U+200B spacer between every top-level prompt and its content (including bold-label content like `**Merged:**`) and between adjacent top-level sections; subsection labels inside Yesterday use a plain blank line to their non-bold entries
- [ ] No attribution line (`<Name>'s standup ~`) at the top
- [ ] User shown the exact rendered message and explicitly confirmed before any post
- [ ] Post call uses the schema's actual parameter names, not hardcoded ones
- [ ] Paste fallback delivered when post declined, MCP unavailable, channel lookup fails, or post call fails
- [ ] Standup never wrapped in a code block
- [ ] Empty subsections omitted
