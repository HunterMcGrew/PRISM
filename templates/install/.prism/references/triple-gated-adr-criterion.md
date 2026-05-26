# Triple-Gated ADR Criterion

Three gates that determine whether a decision warrants ADR-class documentation. All three must fire — one alone is not enough.

**Source:** Adapted from Matt Pocock's `grill-with-docs` skill via Phase 1.5e of the bmad-pocock pattern absorption pass. Wave 2 extracts the criterion to a dedicated reference doc so Theo can cite it directly (his `shared.md` already points at this file) and Winston's inlined version can become a single citation.

## The three gates

A decision is ADR-worthy when ALL of the following are true:

- **Hard to reverse** — the decision shapes interfaces, schemas, persona ownership, or pattern conventions that downstream work composes against. Reversing it later requires migrating consumers, not just editing one file.
- **Surprising without explanation** — a competent reader looking at the resulting code or doc would ask "why is this shaped this way?" The reasoning isn't self-evident from the artifact.
- **Genuine trade-off** — a real alternative was considered and rejected. If there was no alternative, there's nothing to document; the choice was forced.

## All three must fire

One gate alone is not enough:

- **Hard to reverse + no alternative** — just inevitable; nothing to record.
- **Surprising + trivially reversible** — a curiosity, not an ADR.
- **Two of three** — the absent gate is usually the one that makes the ADR worth the maintenance cost.

The gate has teeth because absent gates are the failure mode. A "hard to reverse" decision with no rejected alternative is a forced choice — there's no reasoning to preserve. A "surprising" decision that's trivially reversible isn't load-bearing — git history is enough. A "genuine trade-off" that doesn't shape downstream work belongs in the plan's `## Decisions` and gets deleted with the plan.

## Where decisions go when the gate fails

A decision that fails the triple-gate still goes somewhere — just not into an ADR:

- **Promote to architect doc** (`.prism/architect/<file>.md`) — patterns and constraints other personas need to know about, without the rejected-alternatives history. Architect docs explain *how the system works*; ADRs explain *why we chose this path*.
- **Stay in plan `## Decisions`** — implementation tactics specific to this ticket, bug workarounds self-evident from the code, temporary scaffolding decisions. Git history preserves these once the plan closes.

## When to apply

Apply the gate at decision-promotion time — typically Winston during plan close, sometimes Theo when surfacing a walking candidate that might warrant an ADR rather than (or in addition to) an architect doc.

- **Winston** — `.ai-skills/skills/prism-architect/shared.md` § Immediate Decision Promotion cites this reference and applies the gate after each `## Decisions` entry.
- **Theo** — `.ai-skills/skills/prism-theo/shared.md` § "When to write an ADR vs architect doc" cites this reference; Theo flags ADR candidates during walks and hands off to Winston, who applies the gate and writes the ADR.

## Who cites this pattern

- **Winston** — applies the gate at plan close for every `## Decisions` entry.
- **Theo** — flags ADR candidates during architect-doc walks; defers gate application to Winston.
- **Briar** and **Eric** — apply the gate when reviewing whether a Decision in a plan should have been promoted to an ADR but wasn't (or vice versa). Flag as Minor in review when the gate is misapplied.

## Why a reference doc rather than inlining

Phase 1.5e inlined the gate in Winston's `## Immediate Decision Promotion` section and asked Theo to cite the Phase 1.5e roadmap entry until the dedicated doc landed. Wave 2 extracts it for three reasons:

- Theo's `shared.md` (line 55) already names this exact file path; the roadmap fallback was always temporary.
- Future personas that need ADR criteria (Briar review checks, Eric PR review checks, the Iris retrospective persona) can cite one source instead of three.
- The gate is the canonical PRISM criterion for ADR promotion. Canonical criteria belong in `.prism/references/`, not inlined in one persona that other personas have to read around.
