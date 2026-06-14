# Follow-up Scope

## Purpose

Work surfaced after a ticket is underway doesn't always earn its own ticket. Same-scope work folds into the active PR when the originating ticket hasn't merged, or ships as a follow-up PR off `${DEFAULT_BRANCH}` when it has — a new ticket is reserved for work whose scope genuinely splits from the original. When a follow-up *does* warrant a ticket, it earns its place only when its scope is sharp enough to act on; open-ended follow-ups ("clean up X someday") drift into the backlog as dead weight, because no one can tell when they're done or whether the next reader will agree on what "X" even means.

**Why:** Filing a new ticket for every small same-thread correction inflates ticket and story-point counts on work that's really one continuous effort — and each ticket carries real overhead: a backlog entry, a separate branch, cycle planning, and another full review cycle. When the work doesn't earn that overhead, the overhead is pure tax. The flip side is just as real: a vague follow-up ticket is worse than none — it consumes ticket-hygiene budget, gives the originating ticket false confidence that the work is "tracked," and leaves the next implementer guessing at intent. Both failure modes come from picking the wrong vehicle, so the rule's first job is choosing the vehicle.

## Choosing the vehicle: fold-in, follow-up PR, or new ticket

Walk this table before opening a ticket or recommending one:

| Situation | Action |
| --- | --- |
| **Pre-merge** — surfaced work is same-scope as the active ticket's thread | Fold into the active PR |
| **Post-merge** — small follow-up that's same-scope as the just-merged ticket | Open a follow-up PR off `${DEFAULT_BRANCH}`, no new ticket |
| **Scope genuinely splits** — different personas, different systems, or a size that wouldn't have fit in the original ticket | New ticket |

**Four signals decide same-scope vs. splits:**

- **File overlap** — touches files in the original diff or the same directory? High overlap → same-scope.
- **Subject-matter adjacency** — same thread of thought (same refactor theme, same bug's root cause, same design goal)? Same thread → same-scope.
- **Size** — small enough to review as one focused PR without drowning the original change? Small → same-scope.
- **Persona alignment** — owned by the same persona class that owned the original? Cross-persona expansion signals that scope is splitting.

**Default to fold-in or follow-up PR.** Recommend a new ticket only when at least two signals point to "splits" — for example different personas plus different systems, or a size that would have triggered an epic in the original ticket.

## Follow-up PR conventions

When the vehicle is a follow-up PR (the post-merge, same-scope case):

- **Branch naming:** `<username>/${TICKET_PREFIX_LOWERCASE}-NNNN-followup-<short-slug>` — the original ticket ID anchors the lineage so PR lists and git logs read coherently. Follows the base convention in [`git-conventions.md`](./git-conventions.md) § Branch Naming.
- **PR body opener:** "Follow-up to ${TICKET_PREFIX}-NNNN. No new ticket per `.prism/rules/followup-scope.md`." This pre-empts the "where's the ticket?" reflex from reviewers and auto-link tooling.
- **Ticket linkage (optional):** drop a one-line comment on the original ticket linking the follow-up PR when the audit trail matters — a notable feature, an epic, or a post-incident fix.

## Scope-fit gate

When the vehicle is a new ticket, the proposed scope passes the gate before Nora files it:

- **One fix or one feature.** A follow-up ticket addresses a single concern. "Refactor X and update Y and add tests for Z" is three follow-ups, not one.
- **Traceable to one decision.** The follow-up cites the specific decision, review comment, or plan entry in the originating ticket that produced it. The citation is a one-liner inside the ticket description, not buried in conversation.
- **Has a done condition.** A reader landing on the ticket cold can tell when it's complete. "When the helper is extracted and the three callers updated" passes; "when this feels cleaner" doesn't.
- **Owned by a known persona class.** The follow-up names which kind of work it is (implementation, debugging, design, documentation) so the next persona invocation routes correctly.

If the proposed scope fails any of these, Nora asks the user to narrow it before creating the ticket. The ticket is not created without an explicit override.

## What counts as in-scope for a follow-up

- A specific refactor, surfaced during review, that's larger than the local frame defined by [`.prism/rules/code-standards.md` § Refactor scope](./code-standards.md).
- A separate bug discovered while implementing the originating ticket — recorded in the plan's `## Debugged Issues`, not silently fixed inline.
- A documentation gap noted by Briar or Eric that isn't load-bearing for the current PR.
- A design follow-up Pixel flagged as out-of-scope for the current mock spec.
- A test coverage gap the originating ticket couldn't reach without scope creep.

The common shape: it could plausibly have been part of the originating ticket but wasn't, and there's a single specific action that closes it.

## Anti-patterns

- **Bundled cleanup tickets.** "Clean up the auth module" combining six unrelated cleanups into one ticket. Each cleanup is its own follow-up — or, if they're not worth filing individually, none of them are.
- **Open-ended phrasing.** "We'll figure out scope later." If you don't know what's in scope at file time, the ticket isn't ready to file.
- **Speculative follow-ups.** "Maybe we should look into X someday." Backlog noise. Either it's a known problem with a known shape (file it), or it's not (don't).
- **Follow-ups without traceability.** A ticket with no link back to the decision that produced it. Six months later no one can answer "why is this ticket here?" and it gets closed unread.

## Who runs this rule

- **Nora** ([prism-ticket-start](../skills/prism-ticket-start/SKILL.md)) — walks the three-tier table before filing. When the situation is a same-scope follow-up, redirects to a fold-in or a follow-up PR instead of creating a ticket. When a new ticket is warranted, applies the scope-fit gate and, if scope fails, asks the user to narrow it before filing.
- **Winston** ([prism-architect](../skills/prism-architect/SKILL.md)) — during evaluate mode, before recommending a new ticket for surfaced work, walks the table; same-scope work is a fold-in or a follow-up PR, not a ticket.
- **Briar** ([prism-code-review-self](../skills/prism-code-review-self/SKILL.md)) and **Eric** ([prism-code-review-pr](../skills/prism-code-review-pr/SKILL.md)) — when surfacing a follow-up item during review, the default answer is "follow-up PR." A recommended ticket arrives with the scope-fit elements already filled in so Nora can act on it without round-tripping.
- **Sasha** ([prism-debugger](../skills/prism-debugger/SKILL.md)) — when investigation surfaces an adjacent fix or refinement, applies the same table.
