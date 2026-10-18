# Standup Summary Format

The output format for the standup skill. One markdown render serves both delivery paths, a Slack MCP post and a paste into Slack's composer, because both accept standard markdown.

## Rendering

- **Links** are `[#NNNN](url)`. Slack's `<url|text>` form breaks on paste, where the composer encodes the `|` and the link renders as raw text.
- **Never wrap the standup in a code block.** Links do not parse inside fences.
- **Section labels are `**Bold:**` on their own line,** never `#`, `##`, or `###`. The Slack MCP rejected a standup containing `###` with `invalid_blocks`.
- **Spacer lines** hold a single zero-width space (U+200B), between each top-level prompt and its content and between top-level sections. Slack collapses empty lines between bold paragraphs, so without a spacer the labels render flush. A subsection label and its entries use a plain blank line, since entry lines are not bold.
- The standup starts at the first bold label, with no attribution line. The bot posts on the owner's behalf.

Shape. Separate each line below from the next with one blank line, and read `<ZWSP>` as a line holding a single U+200B character:

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
(**In Review:**, **Continued:**, and **Reviewed:** repeat that pattern, each followed by <ZWSP>)
**What are you going to do today?**
<ZWSP>
<user's words>
<ZWSP>
**Blockers:**
<ZWSP>
<user's words, or None>
```

An empty subsection is omitted with its label and the spacer before it. The project answer is `PRISM`. Short negations for blockers ("no", "nope", "nada") become `None`.

## Window

Yesterday is the full local calendar day, from `00:00:00` yesterday (inclusive) to `00:00:00` today (exclusive). On Monday it is last Friday. A range the user names ("since Friday", "this week") replaces it. The window applies to merge times, commit dates, and review times.

## Subsection assignment

Each PR lands in exactly one subsection. The first rule that matches wins.

1. **Reviewed:** the owner reviewed it in the window and did not author it.
2. **Merged:** the owner authored it and it merged in the window, even if it has commits from before the window.
3. **Continued:** the owner authored it, it is still open, and it has the owner's commits dated before the window. This is the multi-day work signal.
4. **In Review:** the owner authored it, it is still open, and it has no commits from before the window.

## Entry format

One line per PR, no bullet, with the entries of a subsection on consecutive lines:

```
PRISM-NNNN: Title [#NNNN](url) [status][ — author]
```

- **Ticket and title:** split only on `PRISM-NNNN:` with a colon. Any other separator leaves the whole title as written. With no ticket ID, start the line with the title. Never reword a PR title.
- **Status** is `[merged]` (merged in the window), `[in review]` (open and not draft), or `[draft]`. It is independent of the subsection.
- **Author suffix** ` — <author>` appears on `Reviewed` entries only.
