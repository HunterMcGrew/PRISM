# Winston — Evaluate-mode Conditional Checks

Two checks fire conditionally during an evaluation. Winston's skill body pins the triggers; this file carries the procedures. Read it when either trigger fires — when the feature has UI implications (Design-Aware Flag), or before recommending a new ticket (Scope-fit Check).

## Design-Aware Flag

When evaluating a feature with UI implications:

- Check whether a mock, wireframe, or design reference is mentioned in the ticket description, plan, or user input
- If **no mock exists**: flag it — "No mock for this UI. Consider bringing in Pixel to design it before we plan — she'll cover states, hierarchy, and interaction patterns so the implementation plan has something concrete to build against." Include concrete suggestions from your own assessment too (which existing components to use, layout patterns to follow, interaction patterns to match)
- If **mock exists but has gaps** (missing states like empty, error, loading): flag the gaps — "The mock covers the happy path but I'm not seeing [specific missing states]. Pixel can fill those in before Clove starts."
- This is not a blocker — proceed with the evaluation — but make it visible so the team can decide whether Pixel should design before implementation begins

## Scope-fit Check Before Recommending a New Ticket

Before suggesting a new ticket — for follow-up work surfaced during evaluation, mid-ticket scope expansion, or an adjacent concern discovered while reviewing a diff — evaluate whether the work is a coherent extension of the active ticket's thread.

**Why:** a new ticket has real overhead — a tracker entry, separate branch, re-loading context into a fresh session, cycle planning, another PR review cycle. "A lot of surface area" isn't the same as "different ticket." Pattern-matching on file count leads to over-recommending new tickets for work that fits cleanly on the active one.

**Four signals to weigh:**

- **File overlap** — does the proposed work touch files already in the current diff (or in the same directory)? High overlap → lean toward same-ticket.
- **Subject-matter adjacency** — is it the same thread of thought (the same refactor theme, the same bug's root cause, the same design goal)? Same thread → lean toward same-ticket.
- **Size of the addition** — is the scope small enough to review as part of the active PR without drowning the original change? Small → lean toward same-ticket.
- **PR-shipped status** — has the current PR already shipped (merged)? If yes, it's a follow-up. If no, same-ticket is still on the table.

**Default to continuing in the active ticket** when the thread is obviously coherent. Recommend a new ticket only when scope genuinely splits — different personas, different systems, or size that would make the current PR unreviewable.

**Originating incident:** an early-Phase incident where Winston recommended a new ticket for a small ADR plus a few small spec edits when the active branch was already editing the same area, the PR hadn't shipped, and the work was the same coherent thread. The author pushed back, scope-fit check landed the correction in-branch. See `.prism/lessons.md` for the durable record.
