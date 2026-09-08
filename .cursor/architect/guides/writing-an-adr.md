# Writing an ADR

An Architecture Decision Record captures one decision and the reasoning behind
it: what forced the choice, what was chosen, and what the choice costs. Rules
and architect docs encode behavior; an ADR is the only place that keeps the
alternatives someone rejected and the reason they lost.

Write one when a reader six months out would otherwise ask "why is it like
this?" and have nowhere to look.

---

## Three sections

**`## Context`** — the situation that forced a decision. What was true before,
what pressure appeared, what constraints were in play. This section does most
of the work: a decision without its context reads as arbitrary, and the next
person changes it without knowing what they are giving up.

**`## Decision`** — what was chosen, stated plainly, ideally in one sentence
before any elaboration. Name the alternatives that were on the table and one
line each on why they lost. An alternative recorded without its reason is a
list, not an argument.

**`## Consequences`** — what follows, positive and negative both.

## The honest negative

Every real decision costs something. An ADR whose Consequences section is all
upside is either describing a decision nobody had to make, or hiding the part
the next reader most needs.

State the negatives plainly rather than hedging them into invisibility. "This
reaches one host only; the others have no delivery path" is useful. "There may
be some limitations in certain environments" is not. Where a cost is
compensated by something else, name the compensating control instead of
implying the cost went away.

Read the sentence right after each admitted gap with suspicion. A line whose
job is to make the reader feel better about an unknown is the likeliest place
to assert a property nobody actually verified.

## Numbering and status

Numbers are sequential and never reused. Confirm the next one against the
directory rather than against memory — list the existing files and take the
highest number plus one, because two branches drafting at once is how
duplicates happen.

The filename is `NNNN-<kebab-slug>.md`, and the slug says what was decided,
not what the topic was: `0047-plans-are-preserved-at-close.md` beats
`0047-plan-lifecycle.md`.

Give each ADR a `Status`. `accepted` is the normal state. A decision that a
later ADR replaces becomes `superseded`, with a pointer to the one that
replaced it — superseded ADRs are never deleted, because the reasoning that
led somewhere wrong is part of why the current answer is right.

## The `_toolkit/` ownership split

ADRs under `.prism/spec/adrs/_toolkit/` belong to PRISM itself — decisions
about the skill ecosystem, the install layout, the spec structure. A consuming
team's own decisions go in `.prism/spec/adrs/` outside `_toolkit/`, where a
PRISM update will never touch them.

The split is path-decidable on purpose: nobody has to remember which decisions
are whose, because the directory answers it. Do not add a team ADR inside
`_toolkit/`, and do not renumber across the boundary — the two sequences are
independent.

---

## Route-verify

When you edit a doc this guide governs, confirm the route still names it: check
the pattern in `.prism/architect/manifest.json` that should
match the path you touched, and run `prism doctor` if you are unsure whether it
still resolves.
