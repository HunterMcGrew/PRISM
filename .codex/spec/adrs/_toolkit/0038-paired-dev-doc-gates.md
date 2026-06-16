---
Number: 0038
Title: Paired Dev Doc Gates for Architect Docs
Status: superseded
Date: 2026-05-22
Superseded-by: 0058
---

## Context

PRISM's architect docs live at `.prism/architect/<topic>.md`. They're loaded into agent context via the manifest's path routing and represent the durable reasoning behind architectural choices — coupling boundaries, data-flow assumptions, abstraction trade-offs. The agent surface is well-defined, well-routed, and well-reviewed (see [ADR-0023](./0023-architect-docs-source-verified-review.md) for the source-verification bar).

The human surface is not. A consumer team's engineers want to read the same reasoning without loading the agent context — they're onboarding, they're tracing a decision through git history, they're writing an RFC against a topic the architect doc already covers. Today those engineers either read the architect doc in raw form (which carries agent-context idioms like `paths:` frontmatter, manifest hooks, persona references that don't land for a human reader) or they don't read it at all and re-derive the reasoning from scratch.

The pattern that solves this is a paired dev doc at `docs/content/dev/architecture/<topic>.md` — same topic, adapted prose, audience-appropriate framing. The architect doc carries the agent context; the dev doc carries the human narrative. The two cite each other so a reader on either side can cross to the other.

The cost of optional pairing — pair when you remember, skip when you don't — is the same cost the architect-doc-verification rule was authored to fix: drift. An architect doc updated three times without paired-doc updates leaves the human-facing version stale, and a reader landing on it cold gets the wrong reasoning. The paired pattern only works as an enforced invariant.

Three approaches were considered:

- **(a) Optional pairing, recommend in skill prose.** Rejected — the same failure mode the architect-doc-verification rule was authored to fix. "Recommend" decays to "skip when busy."
- **(b) Build-time gate that fails when an architect doc lacks a paired dev doc.** Adopted as the medium-term enforcement layer. Fails fast at PR time; doesn't depend on persona discipline.
- **(c) Dedicated persona (Theo in Phase 2.5) that maintains the pairing.** Adopted as the long-term operator of the gate — Theo handles paired-doc authoring, sync, and review. Until Theo lands, Winston manually pairs.

## Decision

Every new architect doc at `.prism/architect/<topic>.md` ships with a paired dev doc at `docs/content/dev/architecture/<topic>.md`. The pairing is one-to-one: each architect doc has exactly one paired dev doc; each paired dev doc traces back to exactly one architect doc.

The pairing is enforced at two layers:

- **Build-time gate.** A check verifies every file under `.prism/architect/<topic>.md` has a corresponding `docs/content/dev/architecture/<topic>.md`. The check fails the build when a pairing is missing. The gate runs in the same place that `pnpm prism:check` already runs.
- **Persona ownership.** Theo (Phase 2.5) owns paired-doc authoring and sync. Until Theo lands, Winston manually pairs — when Winston authors or updates an architect doc, he also authors or updates the paired dev doc in the same PR.

The two docs cite each other. The architect doc references the paired dev doc near the top ("Human-facing version: `docs/content/dev/architecture/<topic>.md`"). The dev doc references the architect doc near the top ("Agent-facing version: `.prism/architect/<topic>.md`"). Both citations live in the doc's introduction, not buried at the bottom.

Pairing is checked by source-verification review per [ADR-0023](./0023-architect-docs-source-verified-review.md) and [`.prism/rules/architect-doc-verification.md`](../../rules/architect-doc-verification.md) — the verification bar already covers both surfaces.

## Consequences

- **Positive:** Human readers get an audience-appropriate version of every architectural decision. Onboarding accelerates; agent context stops bleeding into human-facing docs.
- **Positive:** The build-time gate catches missing pairs at PR time, not at runtime. Drift is impossible by construction once Theo or Winston commits the pair.
- **Positive:** The source-verification bar from ADR-0023 already covers re-enumeration drift between the two surfaces — when both docs claim a thing, the rule routes the diverged claim to be fixed.
- **Negative:** Doubles the authoring cost for every architect doc. Winston (until Theo lands) writes both versions; Theo absorbs the cost long-term.
- **Negative:** The dev doc has to be re-edited every time the architect doc changes. Mitigation: Theo's job (and Winston's interim job) is exactly this kind of sync.
- **Neutral:** Existing architect docs that don't yet have paired dev docs continue to work — the gate applies to new docs. A separate Phase 2.5 task backfills pairings for existing architect docs.

## References

- Thrive PR #2016 — origin of the paired-doc pattern in the dogfood.
- [ADR-0023](./0023-architect-docs-source-verified-review.md) — sibling decision: architect docs are reviewed against source. The paired dev doc is in scope for that review.
- [ADR-0024](./0024-branch-plan-decisions-record-the-why.md) — sibling decision on documenting reasoning; the dev-doc surface is one of the readers the reasoning lands for.
- [`.prism/rules/architect-doc-verification.md`](../../rules/architect-doc-verification.md) — the verification rule that scopes its review to both surfaces.
