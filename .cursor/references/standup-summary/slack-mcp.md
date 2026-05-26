# Lilac — Slack MCP Posting

Read this when a Slack MCP server is connected and the user wants the standup posted (not pasted). The skill body (`prism-standup-summary`) keeps the detection decision — whether an MCP is connected at all — inline, because the skill can't externalize a condition it would never know to load against. This file carries everything past detection: tool discovery, the disambiguation rules that reject the wrong sibling tools, the runtime schema load, channel-name-to-ID resolution, and the post / paste-fallback delivery. Do not hardcode tool or parameter names from memory — the schema load catches MCP variants.

> _Posting via Slack MCP — find the right send tool, reject draft/schedule/canvas siblings, load the schema, resolve the channel ID, then preview-confirm-post with paste fallback._

## Phase 5 — Discover and schema-load the posting tool

### 5.1 Find candidate posting tools

Use `ToolSearch` with keyword `slack` (broad) or `slack` + `send` / `slack` + `message` (narrower). Inspect the results for a tool that sends a message to a channel immediately. Common shapes across Slack MCP implementations:

- `slack_send_message` (Anthropic's Slack MCP — the common case)
- `slack_post_message` / `chat_postMessage` / `slack-post` (alternative wrappers that mirror Slack's raw API naming)

### 5.2 Disambiguate when multiple tools match

The Slack MCP often exposes sibling tools that are **not** the right choice for a standup post:

- Anything ending in `_draft` (e.g. `slack_send_message_draft`) creates a draft saved to the user's Drafts & Sent instead of posting to the channel — silent failure if picked by mistake
- Anything ending in `_schedule` (e.g. `slack_schedule_message`) queues the message for future delivery — not an immediate post
- Anything containing `_canvas` targets Slack Canvas documents — different surface entirely

Reject any tool whose name ends in `_draft`, `_schedule`, or `_canvas` (or similar modifier suffixes). Prefer the tool whose name combines `slack` or `chat` with a send/post verb and `message`, without those modifiers.

If after filtering there's still more than one clean candidate, ask the user: "I see a couple of Slack-ish tools that could post. Which one should I use, or should I skip posting and give you the paste version?"

### 5.3 Load the tool schema

Once you've picked a candidate tool, load its full schema so you know the exact parameter names:

```
ToolSearch with query "select:<exact-tool-name>"
```

Read the schema's `parameters` properties. Map Lilac's concepts to what the tool advertises:

- Lilac's "target channel" → typically `channel_id` (accepts a Slack channel ID like `C12345`) or sometimes `channel`
- Lilac's "message body" → typically `message` or `text`

Record the tool name and the mapped parameter names for use in the deliver step. Do not hardcode parameter names based on memory — if a future MCP version changes the schema, Lilac adapts without a skill edit.

### 5.4 Outcomes

- **Clean candidate found and schema loaded** — the post path is viable. Lilac uses it in the deliver step.
- **No matching tool** — the post path is unavailable this session. Lilac still runs the interactive flow and produces a pasteable standup via the paste fallback. Tell the user once: "No Slack MCP is connected — I'll give you a pasteable standup at the end."

## Phase 5.5 — Resolve the channel name to an ID

If the chosen post tool takes a channel ID (the common case), resolve the default channel name `#prism-dev` (or the user's per-invocation override, stripping any leading `#`) via the Slack MCP's channel search tool — typically `slack_search_channels`:

- Call the search tool with a query matching the channel name
- Pick the matching channel and record its ID for this invocation
- Cache the resolved ID — no need to re-resolve if the user re-confirms the same channel

If the search returns no match or fails: skip the post path, tell the user ("Couldn't find the channel via Slack MCP — here's the paste version"), and fall through to the paste fallback.

If the chosen post tool accepts a channel name directly (rare but possible for some MCP variants), skip this phase.
