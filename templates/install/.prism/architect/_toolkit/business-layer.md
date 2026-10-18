# Business Layer

The business layer is a suite of skills that wraps the existing engineering pipeline — connecting inbound at the PRD (`prism-prd`) and outbound through `prism-metrics` back to strategy. This document is the contextual map a business-skill author needs: where the layer grounds, how it connects to the engineering pipeline, and what every business skill must do.

## The wrap-the-pipeline model

The business layer doesn't fork the engineering pipeline — it wraps it at two seams:

- **Inbound seam (live):** Business skills produce strategy and hand off to `prism-prd` by pointing it at the relevant `strategy.md` section as upstream PRD context. The engineering skills are untouched. The handoff reuses the existing PRD seam rather than building a parallel one.
- **Outbound seam (live — `prism-metrics`):** Engineering ships → `prism-metrics` measures outcomes → results flow back into `strategy.md`'s `## Metrics` section, closing the loop to `prism-strategy`. `prism-metrics` owns the `## Metrics` section, and its default handoff is back to `prism-strategy` (loop closure), inverting the `prism-prd` default the other business skills use.

Every business skill operates inside this model. None of them touch the engineering pipeline directly; they either feed into `prism-prd` or receive from `prism-metrics`.

## Where the business layer grounds

The layer's home is `.prism/business/`. The single durable artifact is `.prism/business/strategy.md` — the business-layer equivalent of the branch plan.

| Dimension | Business layer | Engineering layer (parallel) |
| --- | --- | --- |
| Home directory | `.prism/business/` | `.prism/plans/` |
| Durable artifact | `strategy.md` | `prism-<ticket>.md` |
| Grain | Company/quarter | Ticket |
| Owner | `prism-strategy` | `prism-plan` (tasks) / `prism-implement` (writes) |
| Template | `.prism/templates/business-strategy.md` | `.prism/rules/branch-plan.md` |

**Lazy creation:** `.prism/business/` and `strategy.md` come into existence on the first real write by a business skill — never seeded at install time (per [`lazy-artifacts.md`](../../rules/lazy-artifacts.md)).

**Section ownership:** `prism-strategy` owns the full doc and writes freely. The other business skills append to their owned sections under the same section-ownership model engineering skills use for branch plan subsections. The `## Decisions` log is shared, append-only working memory.

## The anchor skill: `prism-strategy`

`prism-strategy` owns the strategy doc and sits above `prism-prd` on grain. Every other business skill reads and writes the strategy doc it owns. The conventions all of them follow (read first, write only your section, hand off through `prism-prd`, host-capability fallbacks) live in the strategy doc template, which each skill loads.

The full business-layer roster, with each skill's old persona name, what it produces, and the strategy doc section it owns:

| Persona name | Skill id | Owns / produces | Strategy-doc section |
| --- | --- | --- | --- |
| Vera | `prism-strategy` | Strategy, OKRs, cross-functional priorities | Owns the full doc |
| Kora | `prism-market-research` | Competitive teardowns, TAM/segment sizing, ICP research | `## Research` |
| Ellis | `prism-finance` | Unit economics, pricing analysis, runway projections, budget summaries | `## Finance` |
| Charlie | `prism-marketing` | Positioning, messaging hierarchy, campaign/content briefs, SEO | `## Marketing` |
| Quinn | `prism-sales` | ICP-to-pipeline qualification, proposals, outreach sequences, objection handling | `## Sales` |
| Tess | `prism-metrics` | Outcome metrics; closes the loop back to `prism-strategy` | `## Metrics` |
| Remy | `prism-customer-success` | Support playbooks, FAQs, escalation runbooks, onboarding to first win | `## Customer Success` |
| Penny | `prism-recruiting` | Job descriptions, interview rubrics, hiring-process docs | `## People` |
| Lex | `prism-legal` | ToS drafts, privacy policy reviews, contract-review notes | `## Legal & Compliance` |

## Business-layer patterns

### Dividing ownership when two skills share an input

When two business skills both touch the same input and both produce the same class of output, split ownership by *function*, not by giving each a private copy of the shared input. Marketing and Sales are the worked example: both legitimately touch the ICP and both produce buyer-facing words, so the split is message-vs-pipeline with the ICP as a shared, single-owner input.

- **`prism-market-research` researches the buyer** (owns ICP research) — marketing frames the message to that buyer, sales works the pipeline against that buyer.
- **`prism-marketing` owns the outbound message:** positioning, messaging hierarchy, campaign briefs, content briefs, SEO. It does not write outreach sequences.
- **`prism-sales` owns pipeline mechanics:** ICP-to-pipeline qualification, proposals, outreach sequences, objection handling. It does not write positioning — it reads the `## Marketing` section so outreach inherits one voice.

A second worked instance crosses the business/engineering boundary: **`prism-customer-success` and `prism-docs` share the feature itself as input.** The split is content-class, not audience — both write customer-facing content, so audience can't separate them.

- **`prism-docs` owns the single canonical description of how the feature works** (the researching-owner role): control behavior, settings, feature reference and usage mechanics.
- **`prism-customer-success` reads the product docs and writes how the customer succeeds with the feature** (the downstream-reader role): support playbooks, FAQs, escalation runbooks, and outcome-framed onboarding to first win. It never forks a second copy of feature mechanics.
- **Contested seam:** a usage guide that explains *what a feature does and how to operate its controls* belongs to `prism-docs` (mechanics); a guide that *sequences a customer's path to an outcome* belongs to `prism-customer-success` (success). A guide doing both is split — the success skill writes the narrative and links to the mechanics.

The general rule for future skills: a shared input gets one researching owner; downstream skills read it rather than forking private copies, and each owns a distinct *function* over that input. Two copies of a shared input drift; one owner with downstream readers does not.

### Disclaimer-as-architecture for high-liability skills

`prism-legal` is the worked precedent for any future skill operating in a high-liability domain (legal, medical, financial-advice). The "not legal advice" disclaimer is encoded at three structural points, not one:

- A dedicated `## Disclaimer` section placed first in the skill body, before any procedure — placement is the structural signal that it's load-bearing, not decorative.
- An artifact-level rule: every output the skill emits leads with the disclaimer as its first line, whether shown in chat or saved to a file. No artifact bypasses it.
- A missing-context path in the policy — not just "this isn't advice" but "I don't have the context to draft well; get counsel." The output is marked assumption-based and closes with a counsel recommendation.

A single disclaimer section is bypassable — the skill's normal output path could emit an artifact that never restates it. Encoding it at the section, artifact, and degradation levels means the disclaimer rides every path the skill can take. Apply this pattern to any future skill whose outputs carry liability if acted on without expert review.

## Rules for adding a new business skill

When authoring a business skill, four rules apply.

### 1. Ground in the strategy doc, not a new artifact

Each business skill reads `.prism/business/strategy.md` at startup and appends to its owned section. It does not create its own state file — the strategy doc *is* the shared state. If the skill's content is large enough to warrant a dedicated section, add a section to the strategy doc; do not create a sibling file under `.prism/business/` without a strong contention-driven reason.

### 2. Orchestrate over host capabilities — never vendor them

`deep-research`, `brand-voice`, and `xlsx` are host-environment capabilities. PRISM ships no copy and no wrapper for any of them. The pattern, which the strategy doc template states once for every business skill:

1. Detect at runtime with `ToolSearch select:<tool-name>` before relying on the capability.
2. Use the advertised schema shape, not hardcoded argument names.
3. Degrade gracefully when the capability is absent — name what you'd have done and what you'll do instead, then continue.

Each business skill's body names which host capabilities it uses and what it does when they're missing. This documentation is the only build-time guard: a skill that passes `pnpm prism:build` may be running in a host without the capability it depends on.

### 3. Hand off into `prism-prd`, not sideways

When a business skill's work produces something worth building, it hands to `prism-prd`, pointing it at the relevant `strategy.md` section as upstream PRD context. Business skills do not hand off to the story, plan, or implementation skills directly; `prism-prd` is the inbound seam. Sideways handoffs between business skills (e.g., a GTM skill handing to a finance skill) are fine; the constraint is that the bridge into engineering always crosses through `prism-prd`.

### 4. Follow the skill shape, not a persona

A business skill is held to the same four tests as every other skill (policy, trigger, length, enforcement): no voice or reasoning lens, and the body plus the strategy doc template it loads fits in 120 lines. The old persona name stays in the `description` as a trigger word. It keeps a `persona` field in `roles.json` (no `type: utility`) and a Codex agent adapter. Use `prism-strategy` as the structural model.

## Manifest routing

`.prism/business/**` routes to this file in `manifest.json`, and that is the only route a business path matches — there is no broader `.prism/**` route pulling in `install-layout.md` alongside it. A business path that also needs install-layout context has to name it explicitly.

## References

- `.prism/templates/business-strategy.md` — the strategy doc template and the conventions every business skill follows
- `.ai-skills/skills/prism-strategy/shared.md` — the anchor skill
- `.prism/rules/lazy-artifacts.md` — `.prism/business/` and `strategy.md` are created on first write
