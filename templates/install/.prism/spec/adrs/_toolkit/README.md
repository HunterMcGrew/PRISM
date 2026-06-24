# Architectural Decision Records

This folder holds ADRs for durable, cross-cutting decisions — skill ecosystem, codebase architecture, spec structure. Each ADR captures the context, the decision, and the consequences so the reasoning survives future reorganizations.

See [`.prism/SPEC.md`](../../SPEC.md) for the tier hierarchy that these ADRs govern.

---

## When to Write an ADR

Write an ADR when the decision:

- **Crosses multiple skills, rules, or tiers.** "Authors ship, reviewers review" affects Clove, Eli, Sage, Reese, Briar, and the AGENTS.md routing layer. That's an ADR.
- **Reverses or supersedes a prior decision.** The old decision's Status becomes `superseded` and its `Superseded-by:` frontmatter field names the successor; the new ADR gets a fresh number, a `Supersedes:` field pointing back, and a Context section explaining what changed.
- **Describes a pattern that future agents need context to apply correctly.** If an agent reading only the rule could misapply it, the reasoning belongs in an ADR the rule can link to.
- **Encodes a tradeoff the team evaluated.** "We chose A over B because [reason]" — without the reasoning, the decision looks arbitrary and gets re-litigated.

## When NOT to Write an ADR

- **Ticket-tactical decisions.** Those belong in the ticket's plan file under `## Decisions`. Plans decay; ADRs are durable.
- **Implementation choices with no cross-cutting impact.** "We used `useMemo` here because profiling showed a 40ms cost" is a code comment, not an ADR.
- **Minor wording tweaks.** Rewording a rule for clarity doesn't need an ADR. Changing what the rule enforces does.
- **Obvious decisions.** "We use TypeScript" doesn't need an ADR. "We mirror WP types instead of importing them from `@wordpress/*` because the frontend doesn't depend on WP npm packages" does.

---

## Numbering

ADRs are numbered `NNNN-kebab-case-slug.md`, four-digit zero-padded, starting at `0001`. The next ADR takes the next unused number — never reuse numbers, never renumber to fill gaps.

Four digits gives comfortable headroom past the point we'd need a new scheme.

---

## Status Lifecycle

Every ADR has a `Status` field in its frontmatter. Valid values:

| Status       | Meaning                                                                                                                                  |
| ------------ | ---------------------------------------------------------------------------------------------------------------------------------------- |
| `proposed`   | Drafted but not accepted. The decision is under discussion.                                                                              |
| `accepted`   | Active. The decision is in force and agents should apply it.                                                                             |
| `deprecated` | No longer recommended, but not yet replaced. Keep for historical context; avoid citing in new work.                                      |
| `superseded` | A newer ADR replaces this one. The `Superseded-by:` frontmatter field names the successor. Do not delete — historical context has value. |

When an ADR is superseded: set Status to `superseded`, populate the `Superseded-by:` frontmatter field with the successor's number, and keep the body intact. The successor references the original in its `Supersedes:` frontmatter field. Status carries the state; frontmatter carries the link — one mechanism each, no duplication.

---

## Cross-Reference Pattern

ADRs are the canonical source for a decision's _rationale_. Other documents (AGENTS.md, skill files, architect context, rules) describe the _narrative_ — how the decision shows up in day-to-day work.

- **Source docs link to ADRs.** A skill file or rule has a one-line summary of the decision plus a pointer to the relevant ADR (e.g. `See ADR-NNNN for...`).
- **ADRs do not link back to every source.** An ADR may cite a source doc for context, but it doesn't enumerate every skill file that applies it.
- **Updating a decision:** change the ADR first, then update the source docs to match. This keeps the ADR as the authoritative entry point.

This direction matters: if source docs were canonical, a decision would live in multiple files and drift. ADRs collapse the reasoning to one place.

---

## Writing an ADR

Copy `TEMPLATE.md`, fill in the frontmatter, and write the four sections:

1. **Context** — what forces led to this decision? What problem does it solve?
2. **Decision** — what was decided, in plain language.
3. **Consequences** — what follows from the decision? Both positive and negative. What becomes harder? What becomes easier?
4. **References** — links to plans, prior ADRs, source docs, or lessons that informed the decision.

Keep it under ~60 lines unless the decision genuinely needs more space. A short ADR that gets read beats a long ADR that gets skimmed.

---

## Index

Add a row here for every ADR you write. Sort by number, four-digit zero-padded.

| Number | Title | Status | Summary |
| ------ | ----- | ------ | ------- |
