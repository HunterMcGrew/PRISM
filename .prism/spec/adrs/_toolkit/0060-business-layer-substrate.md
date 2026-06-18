---
Number: 0060
Title: Business-Layer Substrate — Strategy Doc as the Content Bus
Status: proposed
Date: 2026-06-18
---

## Context

PRISM is extending from a software-delivery persona org into a full business persona suite (epic #213's parent, #212). The new personas form a layer that *wraps* the existing engineering pipeline, connecting at two seams: inbound at Parker's PRD (founder strategy → … → Parker specs it → engineering takes over) and outbound through a future data/metrics persona (engineering ships → data measures → back to strategy).

Every engineering persona grounds in the branch plan — Winston writes implementation tasks there, Clove reads them, Briar reviews against them. The business layer has no equivalent. The founder/strategy persona is meant to be the anchor the whole suite hangs off: every Wave 1+ business persona reads and writes a strategy doc the way every engineering persona reads the branch plan. Until that doc and its home exist, none of the Wave 1+ personas have a place to hand off to. This is the gating decision.

Three sub-questions force the ADR:

1. **Where does the business layer ground, and what shape is the strategy doc?** Proposed in #212/#213: `.prism/business/` with a strategy doc as the business-layer equivalent of the branch plan. The plan carries an OPEN question — single file vs. per-domain subdirectory.
2. **How does the business layer hand off into the engineering pipeline at Parker?** The seam has to be concrete enough that a future persona can execute it, and it has to reuse the artifacts that already exist (PRD, branch plan) rather than forking a parallel pipeline.
3. **What is the relationship to the primitives the suite is meant to build on — `deep-research`, `brand-voice`, `xlsx`?** A direct check of the tree found that none of the three are vendored in PRISM: there is no `.ai-skills/skills/deep-research/`, no `brand-voice` plugin, no `xlsx` skill in source. `deep-research` is present in the Claude Code session's skill roster as a host capability; `xlsx` is a host Agent Skill; `brand-voice` is a marketplace/plugin-style capability. They are host-environment capabilities, not PRISM source. PRISM already has a working precedent for this relationship: Lilac references the Slack MCP at runtime, reading its tool schema, and PRISM ships no copy of Slack.

## Decision

**1. The business layer grounds at `.prism/business/`, and the strategy doc is a single file: `.prism/business/strategy.md`.**

This resolves the plan's OPEN question to single-file. The strategy doc is the durable content bus business personas read and write — the business-layer mirror of the branch plan. It is *not* ticket-scoped or initiative-scoped; it is company/quarter-scoped, sitting above PRDs on grain. A template lives at `.prism/templates/business-strategy.md` (mirroring how the branch plan has a template inside `branch-plan.md`).

Single file over a subdirectory because:

- The branch-plan precedent is single-file-with-sections and it works: one file is the unit a persona loads to get full context. A subdirectory forces every reader to discover and load N files to reconstruct the same picture, and forces every writer to decide which file a given decision lands in — the same fragmentation we'd flag in any premature split.
- The per-domain split (OKRs, competitive, positioning as separate files) is a real future shape, but it's a *second adapter* problem: until two or more business personas are actively contending over the same file and the single file is demonstrably the bottleneck, the split is speculative. The branch plan absorbs user stories, design, decisions, history, and AC in one file across a dozen personas; the strategy doc starts there and earns a split only when the contention is observed, not anticipated.

The strategy doc carries, at minimum: mission/positioning, OKRs, cross-functional priorities, and a `## Decisions`-style log so strategy choices are durable and auditable the way branch-plan decisions are. The founder/strategy persona owns it; later business personas read it and append to their owned sections (the section-ownership model from ADR-0014, applied to the business layer).

**2. The inbound handoff seam to Parker is a strategy-doc → PRD handoff, not a new pipeline.**

The founder/strategy persona's terminal handoff is the same shape every PRISM persona uses: it names the next persona (Parker) and proposes the handoff. Concretely — when strategy work produces an initiative worth specifying, the founder persona points Parker at the relevant section of `.prism/business/strategy.md` as the upstream context for a greenfield PRD. Parker already accepts upstream context and produces `.prism/prds/<slug>.md`; nothing in Parker changes. The strategy doc becomes a *source* Parker reads, exactly as a brain-dump or a Linear initiative is today. This keeps the two layers connected by reusing the existing seam (PRD → Mira → Winston → Clove) rather than building a parallel one.

The **outbound seam** — engineering ships → a future data/metrics persona measures → results flow back into `.prism/business/strategy.md`'s OKR/metrics section — is named here as future (Wave 3) and explicitly *not built*. The substrate supports it: the data persona will append to the strategy doc the same way the founder writes it. No structure is added now for it beyond leaving the strategy doc's metrics section as the documented landing spot.

**3. Business personas orchestrate over host capabilities; PRISM vendors none of the three primitives.**

`deep-research`, `brand-voice`, and `xlsx` are host-environment capabilities, referenced at runtime — the same relationship Lilac has to the Slack MCP. PRISM ships no copy of any of them and adds no PRISM-namespaced wrapper skill for them. When a future business persona needs research, brand-consistent copy, or a spreadsheet, it invokes the host capability by reading its schema at runtime (the `ToolSearch`/MCP-schema pattern Lilac already documents) and degrades gracefully when the capability is absent (Lilac's "post via MCP when connected, render for paste when not" precedent). The substrate's only obligation is to document, in each business persona's spec, *which* host capability it orchestrates over and *what it does when that capability is missing* — never to reimplement the capability.

**4. The founder/strategy persona is a persona, not a utility (ADR-0046).**

It has a sustained identity, a voice, and a "How X thinks" lens; a human switches *into* it to do strategy work, the way they switch into Winston or Parker. That is the definition of a persona under ADR-0046, not a utility (which runs in the current persona's voice and has no identity, like `/prism-handoff`). It therefore gets a `persona` field in `roles.json`, a Codex agent adapter, and the full frontmatter + shared.md authoring shape. Its artifact — `.prism/business/strategy.md` — is the persona's state, mirroring Parker's "the artifact IS the state" model (ADR-0043): no separate `.prism/<name>-state.json`.

## Consequences

- **Positive:** the business suite gets one honest, durable home (`.prism/business/strategy.md`) that mirrors a proven shape (the branch plan), so every Wave 1+ persona has a place to hand off to and the wrap-the-pipeline model is structurally real, not aspirational.
- **Positive:** reusing the strategy-doc → Parker seam means the business layer connects to engineering without a second pipeline to maintain — Parker, Mira, Winston, Clove are untouched.
- **Positive:** the "orchestrate over host capabilities, vendor nothing" rule keeps the suite cheap (no reimplementation of research/brand/spreadsheet engines) and honest (no fake PRISM wrappers around capabilities that live in the host), with a documented graceful-degradation obligation per persona.
- **Negative:** single-file strategy doc will need a deliberate split into per-domain subdocs once enough business personas contend over it — that refactor is deferred, and someone will have to make the call when contention appears rather than having the structure pre-built.
- **Negative:** the host-capability dependency is invisible at PRISM build time — a business persona can pass `pnpm prism:build` and discovery/literal/path tests while orchestrating over a capability that isn't present in a given consumer's host. The per-persona "what to do when missing" documentation is the only guard; there is no build-time check that the host capability exists.
- **Neutral:** `.prism/business/` is a new top-level area under `.prism/`, parallel to `.prism/plans/`, `.prism/prds/`, `.prism/design/`. It needs a manifest routing entry and (when content warrants) an architect doc; the lazy-artifacts rule applies — the directory and `strategy.md` come into existence on first real write by the founder persona, not at install time.

## References

- `.prism/plans/prism-213.md` — Phase 1 plan; resolves its OPEN strategy-doc-shape question to single-file.
- #212 (epic) / #213 (Phase 1) — the wrap-the-pipeline model and roster.
- [ADR-0043](./0043-parker-prd-persona.md) — Parker as the PRD persona; the inbound seam terminates here, and "the artifact IS the state" is the model the founder persona's strategy doc follows.
- [ADR-0046](./0046-persona-vs-utility-skill-type.md) — persona vs utility; the founder/strategy persona is a persona.
- [ADR-0014](./0014-plan-section-ownership.md) — section ownership; applied to the strategy doc for multi-persona reads/writes.
- [ADR-0047](./0047-plans-are-preserved-at-close.md) — durable-artifact preservation; the strategy doc is durable working memory, not a disposable scratch file.
- `.prism/rules/branch-plan.md` — the single-file-with-sections shape the strategy doc mirrors.
- `.ai-skills/skills/prism-standup-summary/shared.md` — Lilac's Slack-MCP-as-host-capability precedent for the "orchestrate over, don't vendor" rule.
- `.prism/rules/lazy-artifacts.md` — `.prism/business/` and `strategy.md` are created on first write, not seeded.
