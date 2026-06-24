# Standup Summary Format

Output format for Lilac's standup summaries. Lilac delivers the standup to Slack in two ways — a direct post via the Slack MCP, or a pasteable block for the WYSIWYG composer. Both delivery paths accept standard markdown, so there's only one render format.

---

## Link format

PR entries use standard markdown link syntax throughout — `[#NNNN](url)`. This works on both delivery paths:

- **Slack MCP direct post** — the MCP's posting tool (e.g. `slack_send_message`) accepts standard markdown and handles any protocol translation internally. Lilac doesn't emit Slack's legacy mrkdwn (`<url|text>`) because the MCP wrapper owns that layer.
- **Paste into the composer** — Slack's WYSIWYG composer converts standard markdown to rich-text links on paste. The legacy mrkdwn form would break here — the composer URL-encodes the `|` as `%7C` and the link renders as raw text.

Never wrap the standup in a code block — link syntax doesn't parse inside code fences on either path.

---

## Window rules

The standup covers yesterday's work — strictly.

- **Strict yesterday.** The window is the full calendar day of yesterday, local time — from `00:00:00` yesterday (inclusive) to `00:00:00` today (exclusive).
- **Monday rolls to Friday.** If today is Monday, the window is last Friday — weekends are typically non-working days.
- **User override** — if the user specifies a different range ("since Friday", "this week", "last 3 days"), use that instead.

Apply the window to PR activity timestamps (merged, commits pushed, reviews submitted). Anything outside the window is excluded.

---

## Full standup structure

Lilac assembles four top-level sections, in this order. The Yesterday section contains four subsections (`Merged`, `In Review`, `Continued`, `Reviewed`). `Today` and `Blockers` come from interactive prompts to the user.

Every section label — top-level prompt and Yesterday subsection — renders as `**Bold:**` on its own line. Lilac skips Markdown heading syntax (`#` / `##` / `###`) because the Slack MCP's `slack_send_message` tool rejected a posted standup containing `###` with `invalid_blocks` during a real run; bold-on-its-own-line is what both delivery paths accept.

Spacer lines contain a single zero-width space (`U+200B`) and sit in two places: between every top-level prompt and its content (whether that content is plain text like `PRISM` or another bold label like `**Merged:**`), and between adjacent top-level sections. Slack's rendering collapses empty lines between any two bold paragraphs, so without the spacer the labels render flush and the team loses the visual break they rely on to scan the standup. A line with U+200B counts as non-empty to Slack's renderer, so the paragraph break survives.

Shape of the rendered message — the `<ZWSP>` placeholder below is literally one U+200B character on a line by itself:

```
**What project(s) are you working on?**

<ZWSP>

PRISM

<ZWSP>

**What did you do yesterday?**

<ZWSP>

**Merged:**

<entries>

<ZWSP>

**In Review:**

<entries>

<ZWSP>

**Continued:**

<entries>

<ZWSP>

**Reviewed:**

<entries>

<ZWSP>

**What are you going to do today?**

<ZWSP>

<user-provided>

<ZWSP>

**Blockers:**

<ZWSP>

<user-provided, or "None">
```

**Section rules:**

- Every section label uses `**bold**` on its own line — both top-level prompts and Yesterday subsections. The rejected-post incident is why `###` / `##` / `#` never appear.
- The standup starts at the first bold label. No attribution line — the Slack bot posts on the standup owner's behalf, which already names them.
- A U+200B spacer line goes between every top-level prompt and its content (whether the content is plain text like `PRISM` or another bold label like `**Merged:**`) and between adjacent top-level sections. A real run showed Slack collapsing a plain blank line between `**What did you do yesterday?**` and `**Merged:**` so the two labels rendered flush; the spacer is the only thing that survives rendering. Subsection labels inside Yesterday (`**Merged:**`, `**In Review:**`, `**Continued:**`, `**Reviewed:**`) keep the plain blank line to their entries — entry lines are non-bold, so the paragraph break renders fine without a spacer.
- One line per PR, no bullet prefix.
- A subsection with no entries is omitted entirely — both the `**Label:**` line and the spacer that would have preceded it. A trailing empty subsection creates confusing whitespace.
- The `Project` answer is hardcoded to `PRISM` for now. Multi-project standups aren't a current need.
- `Today` and `Blockers` values come from the user's responses to Lilac's prompts. Lilac renders them as-is; short affirmations like "no" / "nope" / "nada" for blockers resolve to the literal word `None`.

---

## Subsection assignment

A PR lands in exactly one subsection. Walk the rules in order; the first match wins.

1. **`Reviewed`** — the standup owner reviewed the PR in the window and is **not** the author
2. **`Merged`** — the standup owner is the author AND the PR merged within the window (regardless of whether there were pre-window commits — a merge means the work shipped, so it reports as Merged)
3. **`Continued`** — the standup owner is the author AND the PR is still open AND has commits on that PR dated before the window's start (`$SINCE_DATE`). Covers both `[in review]` and `[draft]` states
4. **`In Review`** — the standup owner is the author AND the PR is still open AND there are no pre-window commits. Covers both `[in review]` and `[draft]` states

`Continued` is the multi-day-open-work signal — something you've been chipping at but haven't shipped. The old `Continued ` prefix on entries is retired; it's now a subsection instead, and entries never carry the prefix.

---

## PR entry format

Every PR line follows this shape:

```
PRISM-NNNN: Title [#NNNN](url) [status][ — author]
```

### Ticket ID and title

- `PRISM-NNNN:` — ticket ID from the PR title, if present
- `Title` — the PR title with the `PRISM-NNNN:` prefix removed
- The ticket prefix match is **colon-only** — `PRISM-NNNN:` splits into ticket + title. Other separators (dash, space, em-dash) are treated as part of the title and the line falls back to the title-only form. This keeps parsing deterministic.

### Link

Standard markdown link syntax: `[#1234](https://github.com/HunterMcGrew/PRISM/pull/1234)`. Used for both delivery paths — see the Link format section above.

### Status label

Every entry ends with a status label in square brackets, computed from GitHub:

| Label         | Condition                         |
| ------------- | --------------------------------- |
| `[merged]`    | PR was merged within the window   |
| `[in review]` | PR is open and not in draft state |
| `[draft]`     | PR is in draft state              |

Status labels are independent of subsection. A `[draft]` can appear under `Continued` (when it had pre-window commits) or under `In Review` (when it didn't). A `[merged]` always appears under `Merged`.

### Author suffix — Reviewed only

Entries in `Reviewed` append ` — <author>` at the end, identifying who authored the PR:

```
PRISM-1621: Emit complete ILink (target/rel) for migrated nav items [#1801](url) [merged] — jmotes
```

Entries in `Merged` / `In Review` / `Continued` never get an author suffix — the subsection header makes authorship implicit (the standup owner is the author for all three).

### Missing ticket ID

If a PR title has no `PRISM-NNNN:` prefix, omit the ticket ID and start the line with the title as-is:

```
Title [#NNNN](url) [status]
```

Never modify or summarize the PR title — emit it exactly as GitHub has it.

---

## Worked example

Assume today is Monday. Friday's window rolls in the Monday default. The standup owner is HunterMcGrew. Over Friday and the weekend:

- Merged their own PR #1794 (PRISM-1614), with no commits before Friday — new work
- Merged their own PR #1798 (PRISM-1616), with commits going back to Thursday — merged, so reports as Merged
- Has an open `[in review]` PR #1800 (PRISM-1620) with commits going back to Wednesday — open multi-day work
- Has an open draft PR #1803 (PRISM-1622) opened Friday, no pre-window commits
- Reviewed and approved jmotes's PR #1801 (PRISM-1621) which merged Friday
- Reviewed jmotes's still-open PR #1793 (PRISM-1613)

Output — `<ZWSP>` is a spacer line containing one U+200B character, and the same format ships whether Lilac posts via Slack MCP or hands it over for paste:

```
**What project(s) are you working on?**

<ZWSP>

PRISM

<ZWSP>

**What did you do yesterday?**

<ZWSP>

**Merged:**

PRISM-1614: Fix Mega Menu Locations Add Location button visibility [#1794](https://github.com/HunterMcGrew/PRISM/pull/1794) [merged]
PRISM-1616: Make PRISM mega menu link target editor-controlled only [#1798](https://github.com/HunterMcGrew/PRISM/pull/1798) [merged]

<ZWSP>

**In Review:**

PRISM-1622: Suppress nav link navigation in mega menu editor preview [#1803](https://github.com/HunterMcGrew/PRISM/pull/1803) [draft]

<ZWSP>

**Continued:**

PRISM-1620: Cleanup of Columns block tests [#1800](https://github.com/HunterMcGrew/PRISM/pull/1800) [in review]

<ZWSP>

**Reviewed:**

PRISM-1621: Emit complete ILink (target/rel) for migrated nav items [#1801](https://github.com/HunterMcGrew/PRISM/pull/1801) [merged] — jmotes
PRISM-1613: Prevent feature branches from silently tracking origin/main [#1793](https://github.com/HunterMcGrew/PRISM/pull/1793) [in review] — jmotes

<ZWSP>

**What are you going to do today?**

<ZWSP>

PRISM sprint planning
Watching out for mega menu issues

<ZWSP>

**Blockers:**

<ZWSP>

None
```
