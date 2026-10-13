# Writing an Architect Doc

An architect doc explains one area of the system to whoever is about to change
it. Unlike a rule, it does not load into every session — `manifest.json` routes
it in when someone touches a matching path. That routing is what makes the doc
cheap, and it is also the one step a new doc is most likely to skip.

---

## What earns a doc: the Deletion Test

Ask what breaks if this document disappears. If the answer is "someone reads
the code and figures it out again in ten minutes," it does not earn a doc.

A doc earns its place when it carries something the code cannot say for
itself:

- **A decision with a rejected alternative.** The code shows the path taken; it
  cannot show the two that were considered and why they lost.
- **A constraint from outside the file.** An API that does not support the
  obvious approach, an ordering the framework imposes, a limit someone
  discovered the expensive way.
- **A pattern spanning files.** Anything a reader can only see by holding four
  files open at once is worth writing down once.

What does not earn a doc: a narration of what the code does. That kind of doc
is stale within a release and misleads a reader who trusts it — worse than no
doc, because the trust is what makes it dangerous.

## Every claim is checked against the source

Architect docs are durable context. A future session loads this one as
authoritative, so a confident sentence that drifted from the code actively
misleads. Walk every claim in the doc against the file it describes before you
ship it, and sort each one: verified, diverged, or missing. Diverged and
missing claims get fixed, not softened.

Describe behavior and contracts rather than individual function signatures.
Signatures move on every refactor; the contract usually does not.

## Open with a scope statement

The first paragraph names what this doc covers and what it does not, with a
link to the neighbour that owns the rest. A reader who lands here from search
should be able to tell in one sentence whether they are in the right file, and
a doc without that sentence quietly grows into a second copy of its neighbour.

## Where new content goes

New content, such as a plan Decision promoted at close, goes to the first home
that fits, in this order:

1. **The topic doc that already owns the subject.** Its scope statement covers
   the content without widening. Widening a scope to claim content is how a doc
   picks up a second concern.
2. **An umbrella doc, used sparingly.** An umbrella is one doc routed over a
   wide area, such as every file under `src/components/`. Content belongs there
   only when it applies to every file the umbrella's routes reach. Content
   about one subsystem inside that area is its own topic, and filing it in the
   umbrella makes every session in the area load it.
3. **A new doc with its own route.** When neither fits, write one doc for the
   topic and route it per § Route-add is part of authoring. When no doc covers
   the content without widening, a doc is missing. That is not a license to
   widen one.

**Why:** the umbrella always looks related, so it is where promoted content
lands by default. Picture a date-handling rule filed in an umbrella for backend
classes, routed only by backend paths: the frontend code that shares the rule
never loads it. A section in the wrong umbrella can cost twice: sessions that
need it miss it, and sessions that don't need it load it anyway.

**One concern per doc.** You should be able to say what the doc explains in one
sentence with no "and" or "or". A conjunction joining two unrelated concerns
means two docs, because a route that delivers the doc for one half also
delivers the other. The sharper test: every section serves the same reader on
the same trigger.

**Rules are a partial exception.** A rule that loads every session costs the
same whatever it holds, so splitting it saves no context. It can cover a wider
concern than an architect doc, but it still states one rule.
[`writing-a-rule.md`](./writing-a-rule.md) decides whether content is a rule at
all.

**In a consumer repo, write to your own docs.** `.prism/architect/_toolkit/`
and `.prism/architect/guides/` belong to PRISM. `prism update` overwrites the
files PRISM ships there, and PRISM may ship a new file at any path under them. Team content goes in flat
`.prism/architect/<topic>.md` files, routed in your `manifest.json`.

**Name the file for its concern.** Descriptive beats short:
`headless-ui-dialog.md` over `dialog.md`, `backend-editor-components.md` over
`components.md`. Never name a doc for a ticket, a date, or the state it was
written in. The filename is how a reader listing the directory decides whether
this is the home they want.

## Route-add is part of authoring

**A new doc under `.prism/architect/` is not done until a route in
`manifest.json` names it.** There is no frontmatter and no
metadata that would make the doc discoverable on its own — the manifest is the
only thing that connects a path someone edits to the doc that governs it. An
unrouted doc is a file nobody will ever be told to read.

So, in the same commit as the doc:

1. Pick the narrowest path pattern that holds the files this doc governs.
   Anchor it to a real leading path segment — a pattern starting with a
   wildcard matches everything and stops constraining anything. A pattern
   wider than the concern loads the doc into sessions that never needed it.
2. Add the route, pointing at the doc's path relative to `.prism/architect/`.
   A path may match several routes; every matched doc is named, so adding one
   does not displace another.
3. Confirm the route resolves — the doc has to exist at exactly the path the
   route spells, or the route silently matches nothing.

The same obligation runs the other way. When you move or rename an architect
doc, update its routes in the same change; a route pointing at a path that no
longer exists degrades to silence rather than to an error.

---

## Route-verify

When you edit a doc this guide governs, confirm the route still names it: check
the pattern in `.prism/architect/manifest.json` that should
match the path you touched, and run `prism doctor` if you are unsure whether it
still resolves.
