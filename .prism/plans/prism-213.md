# Plan: prism-213

> Closed: 2026-06-18

## Ticket

https://github.com/HunterMcGrew/PRISM/issues/213

## Goal

Lay the foundation the business persona suite hangs off: decide where business personas ground via an ADR, and author the founder/strategy persona as the anchor every Wave 1+ business persona's strategy doc connects to.

---

## Requirements Summary

Drawn from #213 (Phase 1) and the parent epic #212.

### Context

PRISM extends from a software-delivery persona org into a full business persona suite — a business layer that wraps the existing engineering pipeline at two seams:

- **Inbound seam:** Founder sets strategy → ... → Parker (PRD). The new business personas hand off to Parker, keeping the two layers connected rather than forked.
- **Outbound seam:** engineering pipeline → Data/metrics persona → back to Founder. (Wave 3; not in scope here.)

The founder/strategy persona is the anchor: every other business persona reads and writes the strategy doc it owns — the same relationship that all engineering personas have to the branch plan. Until this substrate exists, none of the Wave 1+ personas have a place to hand off to.

### Scope (from #213)

1. **Substrate ADR** — document where the business layer lives:
   - Proposed location: `.prism/business/` with a strategy doc as the business-layer equivalent of the branch plan.
   - Define the handoff seam to Parker's PRD (business layer → existing engineering pipeline).
   - Decide the relationship to existing primitives (`deep-research`, `brand-voice`, `xlsx`) so later personas orchestrate over them rather than reinventing.

2. **Founder/strategy persona spec** — a new PRISM persona that:
   - Owns the strategy doc, OKRs, and cross-functional prioritization.
   - Follows existing persona conventions (sharp boundary, concrete artifact, handoffs).
   - Is the entry seam of the wrap-the-pipeline model.
   - Uses the skill-forge conventions (frontmatter + shared.md + roles.json entry).

### Deliverables (from #213)

- ADR for the business-layer substrate
- Founder/strategy persona spec (frontmatter + shared.md + roles.json entry)
- `pnpm prism:build` green; discovery/literal/path tests pass

### Out of scope

The other ten business personas (Wave 2+). Their specs are shaped by the substrate ADR — filed as Wave issues once this lands.

### Genuine gap this fills

Today there is no CEO/CTO-level persona. Winston ≈ CTO/architecture, Parker ≈ VP Product, but no business-strategy voice. The founder/strategy persona is that gap.

---

## User Stories

Not applicable for this Phase 1 substrate ticket — the deliverables are an ADR and a persona spec, not user-facing features.

---

## Design

Not applicable.

---

## Implementation Tasks

Tasks meet the detail bar in `.prism/rules/implementation-task-detail.md`. The persona-authoring work (group 2) runs via `prism-skill-forge` create-mode in the current persona's voice — there is no dedicated "skill author" persona, so the group is labelled by the tool that does it.

### Winston (architecture + ADR) — DONE

1. **Write ADR-0060** at `.prism/spec/adrs/_toolkit/0060-business-layer-substrate.md` following `TEMPLATE.md` — substrate location, strategy-doc shape, Parker handoff seam, host-capability relationship, persona-type call. _Done this session._
2. **Add the ADR-0060 index row** to `.prism/spec/adrs/_toolkit/README.md` (every ADR from 0022 onward gets a row). _Done this session._
3. **Resolve the OPEN strategy-doc-shape Decision** to single-file in this plan's `## Decisions`. _Done this session._

### prism-skill-forge create-mode (founder/strategy persona authoring) — tasks 5–8 DONE

Sequence: task 4 first (blocks 5–8). Run only after Hunter ratifies ADR-0060 and picks the persona name at the A/P/C gate.

4. [HITL] **Pick the founder/strategy persona name.** _Done — Hunter ratified **Vera**._ The persona ID is `prism-founder` regardless of the human name chosen (function-descriptive ID convention; the human name is the `persona` field only).
5. **DONE — Scaffold the persona via `prism-skill-forge` create-mode** with ID `prism-founder`, type persona (the default — no `type` field). This writes three things:
   - `.ai-skills/skills/prism-founder/frontmatter.yml` — fields per Parker's shape (`.ai-skills/skills/prism-prd/frontmatter.yml`): `name: prism-founder`; `description` as a YAML folded scalar (`>`, ≤1000 chars) following the 4-part pattern (persona name + role | what it does | artifact location | `Triggers:` list — include the chosen name, "strategy doc", "OKRs", "set strategy"); `argument-hint: "[<topic> | strategy]"`; `category: business`.
   - `.ai-skills/skills/prism-founder/shared.md` — body following Parker's heading structure: `You are <Name>` voice paragraph → `## Personality` → `## How <Name> thinks` (strategy/prioritization lens) → `## The strategy doc` (output shape, pointing at `.prism/business/strategy.md`) → `## Intro` → `## Startup` (read `.prism/business/strategy.md` if it exists; this is the persona's state per ADR-0043's artifact-IS-state model — no separate state file) → `## Orchestrating over host capabilities` (the ADR-0060 rule: reference `deep-research`/`brand-voice`/`xlsx` at runtime via schema read, degrade gracefully when absent, document what-if-missing — mirror Lilac's Slack-MCP pattern) → `## Project Engineering Standards` → `## Ownership & Handoff` (owns `.prism/business/`; hands off INTO Parker by pointing Parker at the relevant strategy-doc section as upstream PRD context) → `## When dispatched by Sol` → `## Next persona` (default route: Parker for PRD) → `## Definition of Done` → `## Lessons Check`. Keep generated body ≤500 lines (discovery test enforces).
   - The `roles.json` entry in `.ai-skills/definitions/roles.json` — append `{ "id": "prism-founder", "persona": "<Name>" }` to the `skills` array (no `type` field; persona is the default per ADR-0046).
6. **DONE — Add the strategy-doc template** at `.prism/templates/business-strategy.md` — the single-file shape from ADR-0060: sections for mission/positioning, OKRs, cross-functional priorities, a `## Decisions` log (durable, auditable), and a metrics section documented as the future outbound-seam landing spot. Mirror the section-with-template shape of `.prism/rules/branch-plan.md`. Do NOT create `.prism/business/strategy.md` itself — lazy-artifacts rule: it comes into existence on the founder persona's first real write.
7. **DONE — Add the manifest routing entry** for `.prism/business/**` to `.prism/architect/manifest.json` (route to `_toolkit/spec-editing.md`, matching the existing `.prism/**` and area entries) so architect-context lookups resolve for the new area.
8. **DONE — Run `pnpm prism:build`** (runs `tsx scripts/ai-skills/build.ts` then `pnpm prism:test`). _Green: 329 tests pass, 0 fail; all four adapters generated._ Confirm green: discovery tests (`scripts/ai-skills/discovery-metadata.test.ts` — canonical files present, role-map shape valid, description ≤1000 chars, body ≤500 lines, managed markers), literal guard (no hardcoded team literals in generated output), path tests (`scripts/ai-skills/path-guard.test.ts` — no cross-platform path leakage). Verify the build generated `.claude/skills/prism-founder/SKILL.md`, `.cursor/skills/prism-founder/SKILL.md`, `.agents/skills/prism-founder/SKILL.md`, and the Codex agent adapter `.codex/agents/prism-founder.toml` (persona entries get an adapter per ADR-0046).

### Eli (documentation) — DONE

9. **DONE — Add an architect doc for the business layer** at `.prism/architect/_toolkit/business-layer.md` — covering the wrap-the-pipeline model, where the layer grounds, the anchor persona (Vera), and the four rules every Wave 2+ business persona author must follow (ground in strategy doc, orchestrate over host capabilities, hand off into Parker, follow persona type). Updated `.prism/architect/manifest.json` to route `.prism/business/**` to `_toolkit/business-layer.md` (was `spec-editing.md`; spec-editing still loads via the `.prism/**` catch-all).

### Briar (self-review) — after task 8

10. **Self-review the branch** — confirm `pnpm prism:build` green, the `roles.json` entry validates (no `persona`+`type:utility` conflict), the ADR has its index row, the OPEN Decision is resolved with a verdict sub-bullet, and no `.prism/business/strategy.md` was speculatively seeded (lazy-artifacts). Report in chat only.

---

## Decisions

All substrate decisions are recorded in full in [ADR-0060](../spec/adrs/_toolkit/0060-business-layer-substrate.md); summarized here with the why.

- **Business layer grounds at `.prism/business/`; strategy doc is a single file `.prism/business/strategy.md`.** Resolves the prior OPEN question to single-file.
  - **Root cause of the question:** the business suite needs a durable content bus the way engineering has the branch plan, and the shape (one file vs. per-domain subdir) was open.
  - **Alternatives considered:** per-domain subdirectory (OKRs/competitive/positioning as separate files).
  - **Chosen approach:** single file. The branch-plan precedent proves single-file-with-sections works across many personas; a subdir fragments reads (load N files to reconstruct context) and writes (which file does this decision land in?) before any contention justifies it. Splitting later is a second-adapter problem — earn it when contention is observed, not anticipated.
  - **Implementation guidance:** template at `.prism/templates/business-strategy.md`; the doc itself is created lazily on first founder-persona write (lazy-artifacts).
  - **→ promoted to ADR-0060.**
- **Inbound handoff seam is strategy-doc → Parker PRD, reusing the existing pipeline — not a new one.** The founder persona points Parker at the relevant `strategy.md` section as upstream context; Parker/Mira/Winston/Clove are untouched. The outbound seam (data persona → strategy metrics, Wave 3) is named as future and not built. **Why:** keeping the two layers connected by reusing the PRD seam avoids maintaining a parallel pipeline. **→ promoted to ADR-0060.**
- **Business personas orchestrate over host capabilities; PRISM vendors none of the three primitives.** Direct tree check confirmed `deep-research`/`brand-voice`/`xlsx` are not in PRISM source — they're host-environment capabilities. Personas reference them at runtime (schema read) and degrade gracefully when absent, exactly like Lilac → Slack MCP. **Why:** reimplementing them is wasted work, and a fake PRISM wrapper around a host capability is dishonest data. **→ promoted to ADR-0060.**
- **The founder/strategy persona is a persona, not a utility (ADR-0046).** Sustained identity, voice, "How X thinks" lens; a human switches into it. ID is `prism-founder` (function-descriptive); the human name is the `persona` field. Its strategy doc is its state (no separate state file, per ADR-0043). **→ promoted to ADR-0046 / ADR-0060.**
- **Founder/strategy persona NAME — candidates for Hunter to choose at the gate.** Single human first names, per the roster convention. Recommendation: **Vera**.
  - **Vera** — from *veritas* (truth) and "very/verity"; a founder's job is to hold the true north of the company. Clean, distinct from the existing roster, reads as a decisive strategist.
  - **Sol** — *already taken* by the Conductor; listed only to flag the collision so it isn't accidentally reused. Not a candidate.
  - **Quinn** — short, gender-neutral, executive cadence; "quintessence"/"fifth element" reads as the top-layer voice that was the genuine gap. Strong second choice.
  - **Margo** — warm, senior-operator feel (evokes a seasoned CEO); distinct phonetically from every current persona. Third option if Vera/Quinn feel too abstract.
  - **→ no promotion needed (name choice is ticket-tactical; the persona-type call it rides on is promoted to ADR-0046/0060).**

---

## History

- 2026-06-18 [hmcgrew/prism-213-business-substrate-founder-persona]: Created plan; branch foundation established for Winston to populate.
- 2026-06-18 [hmcgrew/prism-213-business-substrate-founder-persona]: Winston wrote ADR-0060 (business-layer substrate), resolved the OPEN strategy-doc-shape question to single-file, and populated Implementation Tasks, Decisions, and AC. Gate: needs Hunter to ratify the ADR and pick the persona name before skill-forge authoring runs.
- 2026-06-18 [hmcgrew/prism-213-business-substrate-founder-persona]: Authored the Vera founder/strategy persona (`prism-founder`) via skill-forge create-mode — frontmatter.yml, shared.md, roles.json entry, the `.prism/templates/business-strategy.md` template, and the `.prism/business/**` manifest route. `pnpm prism:build` green (329 tests, 0 fail); all four runtime adapters plus the Codex toml generated; `.prism/business/strategy.md` not seeded (lazy-artifacts).
- 2026-06-18 [hmcgrew/prism-213-business-substrate-founder-persona]: Eli wrote `_toolkit/business-layer.md` — the contextual map for Wave 2+ business persona authors covering the wrap-the-pipeline model, strategy-doc grounding, and the four authoring rules. Updated manifest route for `.prism/business/**` from `spec-editing.md` to `business-layer.md` so lookups in that area resolve to the new doc.
- 2026-06-18 [hmcgrew/prism-213-business-substrate-founder-persona]: Briar self-review found Major issue (seed drift: 3 new .prism/ files lacked install-seed copies; crossref-lint failing on lazy-artifact refs). Fixed in commit fdb69c1 — added seed copies + CROSSREF_FILE_ALLOWLIST entries. pnpm prism:check green. All checklist items pass.
- 2026-06-18 [hmcgrew/prism-213-business-substrate-founder-persona]: Branch pushed and draft PR #214 opened against main. Pending Eric's PR review.
- 2026-06-18 [hmcgrew/prism-213-business-substrate-founder-persona]: Eric's PR review found the install-seed ADR README was missing rows 0049–0056 and 0060. Synced seed to canonical and added the missing crossref-lint allowlist entry for the ADR-0060 lazy-artifact ref; pnpm prism:check green.
- 2026-06-18 [hmcgrew/prism-213-business-substrate-founder-persona]: Closed Phase 1 plan — implementation, self-review, and PR review all clean. Lasting decisions confirmed promoted to ADR-0060 (rationale) and `.prism/architect/_toolkit/business-layer.md` (contextual map); all `## Decisions` carry verdict sub-bullets. PR #214 stays draft, parked at the human merge gate.

---

## Debugged Issues

None.

---

## Review Issues

### Missing install seed files for business layer (pnpm prism:check failing)

- **Severity:** `major`
- **Status:** `fixed`
- **File:** `scripts/ai-skills/crossref-lint.ts`, `templates/install/.prism/architect/_toolkit/business-layer.md`, `templates/install/.prism/spec/adrs/_toolkit/0060-business-layer-substrate.md`, `templates/install/.prism/templates/business-strategy.md`
- **Problem:** Three new `.prism/` files lacked matching `templates/install/.prism/` seed copies, causing `pnpm prism:check` to fail with seed-drift errors. Additionally, all references to `.prism/business/strategy.md` (a lazy artifact) lacked `CROSSREF_FILE_ALLOWLIST` entries, causing crossref-lint to fail.
- **Suggested fix:** Add seed copies and CROSSREF_FILE_ALLOWLIST entries.
- **Fixed in:** commit `fdb69c1`

---

## Acceptance Criteria

AC is non-user-facing here (the deliverables are an ADR and a persona spec, not a running app), so most items are non-behavioral. Citations: REQ-N maps to #213's deliverables checklist.

### Behavioral

- [ ] Given the founder/strategy persona is installed, When a user invokes it by its trigger phrase or name, Then it greets in its persona voice and reads the strategy doc if one exists (REQ-2)
- [ ] Given the persona is invoked and no strategy work has been done yet, When it starts, Then it does not error on a missing `.prism/business/strategy.md` and offers to begin one (REQ-2)

### Non-behavioral

- [ ] An ADR for the business-layer substrate exists at `.prism/spec/adrs/_toolkit/0060-business-layer-substrate.md` with an index row in the ADR README (REQ-1)
- [ ] The ADR resolves: substrate location, strategy-doc shape (single file), the Parker handoff seam, the host-capability relationship for `deep-research`/`brand-voice`/`xlsx`, and the persona-type call (REQ-1)
- [ ] The founder/strategy persona spec exists as `frontmatter.yml` + `shared.md` + a `roles.json` entry under `.ai-skills/skills/prism-founder/` and `.ai-skills/definitions/roles.json` (REQ-2)
- [ ] A single-file strategy-doc template exists at `.prism/templates/business-strategy.md`; no `.prism/business/strategy.md` is seeded at install time (REQ-1)
- [ ] `.prism/architect/manifest.json` routes `.prism/business/**` for architect-context lookups (REQ-1)
- [ ] `pnpm prism:build` is green and the discovery, literal-guard, and path tests pass (REQ-3)
- [ ] The build generated the founder persona's skill adapters for all runtimes and a Codex agent adapter at `.codex/agents/prism-founder.toml` (persona, not utility) (REQ-3)

### AC Sync Log

| Date | Agent | Action | Plan | Linear |
| ---- | ----- | ------ | ---- | ------ |

---

## Cleanup Items

None.

---

## PR Readiness

- [x] No critical or major issues — one Major fixed (seed drift + crossref allowlist, commit fdb69c1)
- [x] Types correct — no `any`, no unsafe `as` (persona/spec/doc content, no TypeScript source changed)
- [x] No stray console.logs or debug artifacts
- [x] Tests written for new logic and edge cases — 329 tests pass (discovery, literal-guard, path, manifest-coverage, crossref-lint)
- [x] All debugged issues resolved (no `open` entries)
- [x] Build passes — last run: 2026-06-18 (329 tests, 0 fail); pnpm prism:check passes clean after fdb69c1
- [x] PR description up to date — PR #214 opened as draft
- [x] Lasting decisions promoted to architect context — see Decisions section (all four → ADR-0060, plus business-layer.md)

**Last updated:** 2026-06-18
