# Writing a Plan

A plan is the working memory for one ticket or epic. It holds why the work
exists, what was decided along the way, and what still has to be true before
it closes — so a session that picks the work up cold does not re-derive any of
it.

The full lifecycle rule lives at
[`.prism/rules/branch-plan.md`](../../rules/branch-plan.md): file naming,
lookup order, the close ceremony, the section template. This guide covers the
authoring judgment that rule assumes you already have.

---

## One plan per ticket, living on `main`

The filename is the ticket identifier, lowercased, under `.prism/plans/`. An
epic gets `epic-<id>.md`. Several branches and several PRs can all point at
one plan — the plan is scoped to the work, not to the branch that happens to
carry it.

Never open a second plan for the same ticket. When you cannot find the
existing one, search the tree for the ticket ID before creating anything; a
duplicate plan splits the record in half and neither half is trustworthy
afterwards.

## `## Decisions` is a do-not-undo contract

Every bullet under `## Decisions` records something the next person must not
quietly reverse. That is the section's whole job. Before you remove or
simplify existing logic, read it — if a Decision explains the logic, the
constraint behind it has to have changed before the logic can go, and the
Decision gets an update saying so in the same commit.

Write the reason, not just the outcome. "Use a full reset on parent change"
tells the next reader what happened; "use a full reset — a deep-equal check
costs too much on large attribute trees" tells them whether the reason still
holds. A Decision with no reason gets treated as arbitrary the first time it
is inconvenient.

When a decision had a real alternative, record the alternative and one line on
why it lost. Writing it down is what forces you to re-examine the rejection —
and occasionally the re-examination flips the call, which is the point.

**Open questions get recorded, not deferred.** When something genuinely cannot
be settled yet, write it as an open Decision that names who resolves it and
what path the work follows meanwhile. An undocumented open question either
blocks the work or gets silently absorbed into one of the answers, and both
are worse than a visible unknown.

## Acceptance criteria are a grading instrument

Behavioral criteria use Given / When / Then. Non-behavioral criteria are a
plain checklist. Both live under `## Acceptance Criteria`, and the format
reference is [`.prism/templates/acceptance-criteria.md`](../../templates/acceptance-criteria.md).

Each criterion carries a stable ID and evidence someone can actually check.
The bar is falsifiable, not merely runnable: "the command exits 0" passes a
command that does nothing. Name the observation that would prove the criterion
false if the work were wrong.

Agents propose criteria changes; people accept them. A criterion an agent
silently rewrote is a moved goalpost, so adjustments are recorded as proposals
until a human says yes.

## Keep it scannable

`## History` is append-only, one dated line per meaningful change, at most
three sentences each. When an entry wants to be longer than that, the depth
belongs in `## Decisions` and the history line becomes a pointer to it.

Skip history entries for formatting, renames, and whitespace. A plan nobody
can skim stops being working memory and becomes another thing to read.

---

## Route-verify

When you edit a doc this guide governs, confirm the route still names it: check
the pattern in `.prism/architect/manifest.json` that should
match the path you touched, and run `prism doctor` if you are unsure whether it
still resolves.
