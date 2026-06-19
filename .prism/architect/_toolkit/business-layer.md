# Business Layer

The business layer is a suite of personas that wraps the existing engineering pipeline — connecting inbound at Parker's PRD and, in a future wave, outbound through a data/metrics persona back to strategy. This document is the contextual map Wave 2+ persona authors need: where the layer grounds, how it connects to the engineering pipeline, and what every new business persona must do. For *why* these decisions were made, see [ADR-0060](../spec/adrs/_toolkit/0060-business-layer-substrate.md).

## The wrap-the-pipeline model

The business layer doesn't fork the engineering pipeline — it wraps it at two seams:

- **Inbound seam (live):** Business personas produce strategy; Vera hands off to Parker by pointing Parker at the relevant `strategy.md` section as upstream PRD context. Parker, Mira, Winston, and Clove are untouched. The handoff reuses the existing PRD seam rather than building a parallel one.
- **Outbound seam (Wave 3, not yet built):** Engineering ships → a data/metrics persona measures outcomes → results flow back into `strategy.md`'s `## Metrics` section, closing the loop to Vera. The landing spot is documented now; the persona is deferred.

Every business persona operates inside this model. None of them touch the engineering pipeline directly; they either feed into Parker or (future) receive from the data persona.

## Where the business layer grounds

The layer's home is `.prism/business/`. The single durable artifact is `.prism/business/strategy.md` — the business-layer equivalent of the branch plan.

| Dimension | Business layer | Engineering layer (parallel) |
| --- | --- | --- |
| Home directory | `.prism/business/` | `.prism/plans/` |
| Durable artifact | `strategy.md` | `prism-<ticket>.md` |
| Grain | Company/quarter | Ticket |
| Owner | Vera (`prism-founder`) | Winston (tasks) / Clove (writes) |
| Template | `.prism/templates/business-strategy.md` | `.prism/rules/branch-plan.md` |

**Lazy creation:** `.prism/business/` and `strategy.md` come into existence on Vera's first real write — never seeded at install time (per [`lazy-artifacts.md`](../../rules/lazy-artifacts.md)).

**Section ownership:** Vera owns the full doc and writes freely. Later business personas append to their owned sections under the section-ownership model ([ADR-0014](../spec/adrs/_toolkit/0014-plan-section-ownership.md)), exactly as engineering personas write to plan subsections. The `## Decisions` log is shared, append-only working memory.

## The anchor persona: Vera (prism-founder)

Vera is the Wave 1 anchor — she owns the strategy doc and sits above Parker on grain. Every other business persona reads and writes the strategy doc she owns. Her spec lives at `.ai-skills/skills/prism-founder/shared.md`; read its `## Orchestrating over host capabilities` section as the worked example for every subsequent business persona.

Charlie (`prism-marketing`, marketing strategist) and Quinn (`prism-sales`, sales persona) are in the business layer alongside Vera. Wave 3+ roster and planned focus are tracked in epic #212.

## Rules for adding a new business persona

When authoring a Wave 2+ business persona, four rules apply. The ADR establishes all four; this section gives the author-facing guidance on applying them.

### 1. Ground in the strategy doc, not a new artifact

Each business persona reads `.prism/business/strategy.md` at startup and appends to its owned section. It does not create its own state file — the strategy doc *is* the shared state (the artifact-IS-state model from [ADR-0043](../spec/adrs/_toolkit/0043-parker-prd-persona.md), applied to the business layer). If the persona's content is large enough to warrant a dedicated section, add a section to the strategy doc; do not create a sibling file under `.prism/business/` without a strong contention-driven reason.

### 2. Orchestrate over host capabilities — never vendor them

`deep-research`, `brand-voice`, and `xlsx` are host-environment capabilities. PRISM ships no copy and no wrapper for any of them. The pattern, mirroring Lilac → Slack MCP:

1. Detect at runtime with `ToolSearch select:<tool-name>` before relying on the capability.
2. Use the advertised schema shape, not hardcoded argument names.
3. Degrade gracefully when the capability is absent — name what you'd have done and what you'll do instead, then continue.

Each business persona's spec names which host capabilities it orchestrates over and what it does when they're missing. This documentation is the only build-time guard: a persona that passes `pnpm prism:build` may be running in a host without the capability it depends on.

### 3. Hand off into Parker, not sideways

When a business persona's work produces something worth building, it names Parker and proposes the handoff — pointing Parker at the relevant `strategy.md` section as upstream PRD context. Business personas do not hand off to Mira, Winston, or Clove directly; Parker is the inbound seam. Sideways handoffs between business personas (e.g., a GTM persona handing to a finance persona) are fine; the constraint is that the bridge into engineering always crosses through Parker.

### 4. Follow the persona type (not utility type)

Every business persona is a persona under [ADR-0046](../spec/adrs/_toolkit/0046-persona-vs-utility-skill-type.md) — sustained identity, voice, "How X thinks" lens. That means: a `persona` field in `roles.json` (no `type: utility`), a Codex agent adapter, and the full frontmatter + shared.md authoring shape. Use Vera's spec as the structural model.

## Manifest routing

`.prism/business/**` routes to this file in `manifest.json`. The broader `.prism/**` catch-all still loads `install-layout.md` and `skills-ecosystem.md`; `spec-editing.md` loads via that catch-all too. This file adds the business-layer-specific context on top.

## References

- [ADR-0060](../spec/adrs/_toolkit/0060-business-layer-substrate.md) — the full rationale for every decision summarized here
- `.prism/templates/business-strategy.md` — the strategy doc template and conventions
- `.ai-skills/skills/prism-founder/shared.md` — Vera's spec; read `## Orchestrating over host capabilities` as the worked example
- [ADR-0014](../spec/adrs/_toolkit/0014-plan-section-ownership.md) — section ownership (shared `## Decisions` log)
- [ADR-0043](../spec/adrs/_toolkit/0043-parker-prd-persona.md) — artifact-IS-state model
- [ADR-0046](../spec/adrs/_toolkit/0046-persona-vs-utility-skill-type.md) — persona vs. utility distinction
- `.prism/rules/lazy-artifacts.md` — `.prism/business/` and `strategy.md` are created on first write
- Epic #212 — Wave 2+ roster and planned personas
