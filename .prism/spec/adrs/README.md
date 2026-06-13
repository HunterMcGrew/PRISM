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

- **Source docs link to ADRs.** `AGENTS.md § 0` has a one-line summary of "authors ship, reviewers review" plus a pointer to ADR-0003.
- **ADRs do not link back to every source.** An ADR may cite a source doc for context (the Round 10 audit for ADR-0003), but it doesn't enumerate every skill file that applies it.
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

ADR files are sorted by number on disk; this index surfaces newer entries that need easy lookup. Older ADRs (0001–0020) are discoverable by listing the directory.

| Number | Title                                                                                                          | Status   | Summary                                                                                                                |
| ------ | -------------------------------------------------------------------------------------------------------------- | -------- | ---------------------------------------------------------------------------------------------------------------------- |
| 0022   | [Encounter Protocol for Out-of-Scope Anti-Patterns](0022-encounter-protocol-for-out-of-scope-anti-patterns.md) | accepted | When implementation work touches out-of-scope wrong code, choose migrate / ticket / never silent — and log the choice. |
| 0023   | [Architect Docs Source-Verified Review](0023-architect-docs-source-verified-review.md)                         | accepted | Architect docs and paired dev docs require source-verification review by author and reviewer — glance is not sufficient. |
| 0024   | [Branch Plan Decisions Record the Why](0024-branch-plan-decisions-record-the-why.md)                           | accepted | Verified fixes and non-trivial decisions in `## Decisions` use sub-bullets covering root cause, alternatives, chosen approach, and implementation guidance. |
| 0046   | [Persona vs Utility Skill Type](0046-persona-vs-utility-skill-type.md)                                         | accepted | `roles.json` entries may declare `type: "utility"` — no persona, no Codex agent adapter; skill adapters still generate for all runtimes. |
| 0047   | [Plans Are Preserved at Close, Not Deleted](0047-plans-are-preserved-at-close.md)                              | accepted | At close, plans are marked closed (`> Closed: YYYY-MM-DD`) and preserved in `.prism/plans/` — promotion + verdict gate unchanged; no deletion for any plan class. |
| 0048   | [Conductor — Autonomy Between Gates](0048-conductor-autonomy-between-gates.md)                                  | accepted | Sol orchestrates the lifecycle on a third axis; drives autonomously between human gates but never clears one — the gate's owning persona clears or escalates under a human-set autonomy policy. |
