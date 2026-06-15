---
Number: 0037
Title: Cadence-Driven Personas as a Separate Axis
Status: accepted
Date: 2026-05-22
---

## Context

PRISM's existing personas — Winston, Clove, Eric, Sasha, Briar, Nora, Mira, Pixel, Eli, Sage, Reese — are all **ticket-flow personas**. They're invoked in the context of a specific ticket or PR, they read and write the ticket's branch plan, and they hand off to one another in a chain that tracks the lifecycle of a unit of work. The whole ecosystem assumes a ticket as the unit of context: persona greets, persona resolves the plan, persona does its work, persona hands off.

Some maintenance work does not fit that flow. Auditing `.prism/lessons.md` for archive candidates. Walking every `.prism/plans/*.md` to flag stale `## Decisions`. Reviewing the ADR set for entries whose context has shifted enough that the decision should be revisited. None of this is ticket-scoped; none of it produces a PR; none of it threads through Nora → Mira → Winston → Clove. Trying to staple it onto a ticket-flow persona either pollutes that persona's prompt with unrelated work or leaves the maintenance work permanently undone because no persona owns it.

Thrive PR #2003 (the dogfood's cadence-variant ADR for what later became Thrive's archival persona) surfaced the shape of the answer: a class of personas that exists on a different axis. They aren't invoked at a step in the ticket flow — they're invoked on a schedule (weekly, monthly) or a threshold (when `.prism/lessons.md` crosses N entries, when an ADR is N days past its last review). They operate over the whole `.prism/` surface, not a single ticket. They write to dedicated state files rather than ticket-scoped plans.

Three approaches were considered:

- **(a) Add the maintenance work to existing personas.** Winston gets a "weekly audit" sub-mode. Briar runs an archival pass after every self-review. Rejected: it pollutes ticket-flow personas with cadence work whose timing doesn't align with the persona's normal invocation. A user opening Briar to review their own PR doesn't want Briar also auditing the lessons file.
- **(b) Build cadence into the toolkit infrastructure, not into personas.** A cron-like runner walks `.prism/` on a schedule and emits findings to a static report file. Rejected: the work is judgment work, not mechanical work — classifying a decision as live or archive-candidate, deciding whether a lesson is still load-bearing, all of it requires the kind of reasoning a persona is designed to carry. A cron job that produces a flat list is a list nobody acts on.
- **(c) Introduce cadence-driven personas as a separate axis from ticket-flow personas.** Accepted — see below.

## Decision

PRISM adds a second persona axis: **cadence-driven personas**, orthogonal to the existing ticket-flow personas.

A cadence-driven persona:

- Is invoked on a schedule (weekly default) or on user demand — not as a step in the ticket-flow handoff chain.
- Operates over the entire `.prism/` surface — every plan, every lesson, every ADR — not a single ticket's branch plan.
- Writes to a dedicated **operational state file** at `.prism/<persona-state>.json` (or similar), not a ticket-scoped plan. The state file tracks what's been classified, what's been deferred, what's been archived.
- Owns a paired **architect doc** at `.prism/architect/<workflow>-workflow.md` describing the workflow, the audit surfaces, and the verdict procedure.

Zoe is the first cadence-driven persona. She audits the `.prism/` surface on cadence to surface stale plans, archive-candidate lessons, and overdue ADR reviews. Her state file lives at `.prism/audit-state.json` and her workflow doc at `.prism/architect/_toolkit/audit-workflow.md`.

The axis is durable, not Zoe-specific. Future cadence personas — for example, a quarterly ADR-review persona, or a metrics-rollup persona — adopt the same shape: dedicated state file, dedicated architect doc, explicit-invocation, no ticket-flow handoff.

## Consequences

- **Positive:** Ticket-flow personas stay focused on ticket-flow work. Winston isn't loaded with audit logic; Briar isn't loaded with archival logic. The cost of the maintenance work lives in personas whose only job is the maintenance work.
- **Positive:** Cadence-driven personas have a well-defined operational state pattern — a JSON state file, an architect workflow doc, explicit invocation. Future cadence persona authors follow the pattern instead of inventing one each time.
- **Positive:** Surfaces that nobody currently owns get an owner. Lessons archival, stale plan flagging, ADR review — these are now Zoe's responsibility. The next cadence persona picks up its own slice.
- **Negative:** Two persona axes increase the conceptual surface area of the ecosystem. Onboarding documentation has to introduce the distinction. Mitigation: the skill roster table in `.prism/architect/_toolkit/skills-ecosystem.md` calls cadence-driven personas out explicitly so the distinction shows up in the first place a reader looks.
- **Negative:** Operational state files at `.prism/<persona-state>.json` introduce a new file class that ships with consumer installs. Mitigation: the file is seeded empty on install; the architect doc documents the schema; the persona that owns the file handles migration when the shape changes.
- **Neutral:** Cadence-driven personas don't auto-trigger. They're explicit-invocation only — the user controls when they run. The cadence ("weekly default") is advisory, not enforced by tooling. A future PR may add a tooling layer that suggests invocation when the cadence elapses; that's out of scope for this ADR.

## References

- Thrive PR #2003 — origin of the cadence-driven persona shape in the dogfood (Thrive's archival-persona variant).
- [ADR-0002](./0002-skill-auto-routing.md) — sibling decision: ticket-flow skill auto-routing. Cadence-driven personas are explicitly **not** auto-routed; the user invokes them by name on cadence.
- [ADR-0035](./0035-rule-loading-tiers.md) — related: three-tier rule loading. Zoe loads Tier 1 (universal rules) plus archive-specific rules at Tier 3 (skill-internal).
- [ADR-0038](./0038-paired-dev-doc-gates.md) — related: every architect doc ships paired with a dev doc. Zoe's `audit-workflow.md` follows the paired-doc invariant.
- `.prism/architect/_toolkit/audit-workflow.md` — Zoe's workflow doc and state-file schema.
- `.ai-skills/skills/prism-surface-audit/` — Zoe's canonical skill source.
