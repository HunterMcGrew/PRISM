# Plan: prism-216

## Ticket

https://github.com/HunterMcGrew/PRISM/issues/216

## Goal

Build the finance / pricing analyst persona — the business-layer voice for unit economics, pricing models, runway analysis, and budgets, grounded in the Wave 1 substrate established by ADR-0060.

---

## Requirements Summary

**Persona shape (per ADR-0060 + business-layer.md):**
- Full persona (not utility) under ADR-0046: sustained identity, voice, "How X Thinks" lens, `persona` field in `roles.json`, Codex agent adapter.
- Structural model: mirror Vera (`prism-founder`) in frontmatter + shared.md shape.
- Skill ID: `prism-finance` (function-descriptive, per skill-authoring.md).

**Grounding:**
- Reads `.prism/business/strategy.md` at startup for strategic context and OKRs.
- Writes financial findings and constraints back into its owned section of the strategy doc (section-ownership model, ADR-0014). Does not create a separate state file — the strategy doc is the shared state (ADR-0043 artifact-IS-state model, applied to the business layer).

**Host capability: `xlsx`:**
- Detect at runtime via `ToolSearch select:xlsx` (or equivalent host capability name) before relying on it.
- Use the advertised schema shape; no hardcoded argument names.
- Graceful degradation when absent: keep models as markdown tables in the strategy doc; offer to export to a spreadsheet when the capability is present.
- PRISM ships no copy, no wrapper. Referenced at runtime only (Lilac → Slack MCP precedent).

**Artifacts:**
- Unit economics models, pricing analysis, runway projections, and budget summaries — delivered as structured sections in the strategy doc (or as linked outputs when `xlsx` is available).

**Handoff seam:**
- Sideways: financial constraints and pricing analysis inform Vera's strategy decisions and the market research persona's ICP sizing.
- Into engineering: always through Parker. The persona names Parker and points at the relevant `strategy.md` section as upstream PRD context — it does not hand off to Mira, Winston, or Clove directly.

**Build requirements:**
- `pnpm prism:build` green.
- Discovery/literal/path tests pass.
- `roles.json` entry following skill-forge conventions.

**Note:** Built on shared branch `hmcgrew/prism-wave1-market-research-finance` with the sibling Wave 1 persona (prism-215, market research analyst). One PR closes both issues — the two personas share a `roles.json` diff and the same build run.

---

## User Stories

_To be added by Mira if user stories are warranted._

---

## Design

_Not applicable — this is a persona spec, not a UI feature._

---

## Implementation Tasks

Tasks meet the detail bar in `.prism/rules/implementation-task-detail.md` and mirror prism-213 tasks 5–8 (the Vera worked example). The persona-authoring work runs via `prism-skill-forge` create-mode in the current persona's voice — there is no dedicated "skill author" persona, so the group is labelled by the tool that does it.

> **Shared-branch coordination (read before starting either persona).** This persona and prism-215 (market research) share one branch and one PR. Both append `.ai-skills/definitions/roles.json` and regenerate the same build mirrors, so a single `pnpm prism:build` must cover BOTH personas. **Do not run a per-persona build cycle.** Sequence across the two plans: author ALL of prism-215's source files AND ALL of prism-216's source files (tasks 1–3) first, THEN run one `pnpm prism:build` (prism-215 task 4 / prism-216 task 4 are the same single run), THEN verify both personas' adapter sets. If this plan is executed alone, its task 4 build still validates only after both personas' `roles.json` entries are present.

### prism-skill-forge create-mode (finance / pricing persona authoring)

Sequence: task 0 (name) is [HITL] and blocks 1–4. Run authoring only after Hunter ratifies the persona name at the A/P/C gate.

0. [HITL] **Pick the finance / pricing persona name.** Blocked on Hunter's choice at the gate (see `## Decisions` → name candidates). The persona ID is `prism-finance` regardless of the human name chosen (function-descriptive ID convention per `.prism/rules/skill-authoring.md`; the human name is the `persona` field only). Substitute the ratified name everywhere `<Name>` appears below.

1. **[DONE]** **Scaffold the persona via `prism-skill-forge` create-mode** with ID `prism-finance`, type persona (the default — no `type` field). This writes two source files; the `roles.json` append is task 3. Mirror Vera (`.ai-skills/skills/prism-founder/`) as the structural model.
   - **`.ai-skills/skills/prism-finance/frontmatter.yml`** — fields per Vera's shape:
     - `name: prism-finance`
     - `description:` as a YAML folded scalar (`>`, ≤1000 chars; target 250–400) following the 4-part pattern per `.prism/rules/skill-authoring.md` § Description field shape: (1) `<Name> — finance and pricing analyst persona.` (2) WHAT — produces unit economics models, pricing analysis, runway projections, and budget summaries; grounds in and writes to `.prism/business/strategy.md`; orchestrates over the `xlsx` host capability. (3) grain line — sits in the business layer; hands off into Parker's PRD. (4) `Triggers:` line — `"<Name>"`, plus distinctive keywords: `finance`, `pricing`, `unit economics`, `runway`, `budget`, `pricing model`, `margins`.
     - `argument-hint: "[<model or pricing question> | finance]"`
     - `category: business`
   - **`.ai-skills/skills/prism-finance/shared.md`** — body following Vera's heading structure (study `.ai-skills/skills/prism-founder/shared.md`), ≤500 lines (discovery test enforces). Sections in order:
     - `You are <Name>` voice paragraph — the finance and pricing analyst; stress-tests strategy on unit economics and pricing; reads/writes the strategy doc the way engineering personas ground in the branch plan.
     - `## Personality` — rigorous, assumption-surfacing, allergic to a model whose inputs aren't stated; makes OKRs measurable in dollar and margin terms.
     - `## How <Name> thinks` — the finance lens (sample shape, mirror Vera's numbered list): (1) every model states its assumptions and its time horizon — an unstated assumption is a hidden risk; (2) unit economics come before growth — a negative-margin unit doesn't improve at scale; (3) pricing is a strategic choice, not a markup — anchor it to value and willingness-to-pay, not just cost; (4) runway is a function of burn and the next milestone, stated together; (5) financial constraints feed strategy decisions and the market research persona's ICP sizing — write them where those personas read.
     - `## Finance artifacts` — output shape: unit economics models, pricing analysis, runway projections, budget summaries delivered as structured sections in `.prism/business/strategy.md` (or as linked outputs when `xlsx` is available). Do not duplicate strategy-grain or PRD-grain detail.
     - `## Intro` — brief in-character greeting (mirror Vera's `## Intro`).
     - `## Startup` — read `.prism/business/strategy.md` if it exists; it is the persona's state per ADR-0043's artifact-IS-state model — no separate state file. If absent, don't error; offer to begin a strategy doc or append financial findings to one. Append to the owned finance section under section ownership (ADR-0014); reconcile before overwriting a recorded decision.
     - `## Orchestrating over host capabilities` — the ADR-0060 rule for `xlsx`. Mirror Vera's pattern exactly: (1) detect at runtime via `ToolSearch select:xlsx` (or the host's equivalent capability name) before relying on it; (2) use the advertised schema shape, no hardcoded argument names; (3) degrade gracefully when absent — **`xlsx` absent:** keep models as markdown tables in the strategy doc and offer to export to a spreadsheet when the capability is present. Note that the capability is invisible at PRISM build time and graceful degradation is the only guard.
     - `## Project Engineering Standards` — defer to `.prism/rules/` and `.prism/architect/`; cite `AGENTS.md § Ownership & Handoff`; hand off out-of-lane work.
     - `## Ownership & Handoff` — appends to its owned finance section of `.prism/business/strategy.md`. Sideways: financial constraints and pricing analysis inform Vera's strategy and the market research persona's ICP sizing. Into engineering: ALWAYS through Parker — name Parker and point at the relevant `strategy.md` section as upstream PRD context; never hand off to Mira/Winston/Clove directly.
     - `## When dispatched by Sol` — return a primary verdict per `report-back.md` plus secondary signals, in addition to strategy-doc writes (mirror Vera).
     - `## Next persona` — default route: Parker (when a pricing or budget decision surfaces an initiative worth specifying); conditional route: Vera (when financials should reshape strategy/OKRs) or the market research persona (sideways, for sizing input).
     - `## Definition of Done` — every model states its assumptions and horizon; unit economics stated before growth claims; host-capability use degraded gracefully and the fallback stated when absent; no `.prism/business/strategy.md` seeded empty; next persona named and handoff proposed not executed.
     - `## Lessons Check` and `## Session close` (reflex bullets incl. context-reuse) — mirror Vera's closing sections.

2. **(Covered by task 1's two files.)** _No separate task — frontmatter.yml and shared.md are both written in task 1._

3. **[DONE]** **Append the `roles.json` entry.** In `.ai-skills/definitions/roles.json`, add `{ "id": "prism-finance", "persona": "<Name>" }` to the `skills` array (no `type` field — persona is the default per ADR-0046). Place it adjacent to the other business personas (after the `prism-founder` entry at line ~80–82; the market research entry from prism-215 sits beside it). **Coordination:** this is the shared-file touchpoint — prism-215 also appends here. Both entries must be present before the single build runs.

4. **[DONE]** **Run the shared `pnpm prism:build`** (runs `tsx scripts/ai-skills/build.ts` then `pnpm prism:test`) — ONE run covering both Wave 1 personas; do not run a per-persona build. This is the SAME run as prism-215 task 4. Confirm green: discovery tests (`scripts/ai-skills/discovery-metadata.test.ts` — canonical files present, role-map shape valid, description ≤1000 chars, body ≤500 lines, managed markers), literal guard (no hardcoded team literals), path tests (`scripts/ai-skills/path-guard.test.ts`). Verify the build generated this persona's four runtime adapters — `.claude/skills/prism-finance/SKILL.md`, `.cursor/skills/prism-finance/SKILL.md`, `.agents/skills/prism-finance/SKILL.md`, and the Codex agent adapter `.codex/agents/prism-finance.toml` (persona entries get an adapter per ADR-0046) — alongside prism-215's four adapters. Also run `pnpm prism:check` for seed/crossref drift (these personas live in `.ai-skills/` with no `templates/install/` mirror, so no seed copies are required per ADR-0059; confirm `prism:check` green regardless).

### Briar (self-review) — after task 4 (covers both Wave 1 personas)

5. **Self-review the branch** — confirm `pnpm prism:build` and `pnpm prism:check` green, both `roles.json` entries validate (no `persona`+`type:utility` conflict), no `.prism/business/strategy.md` was speculatively seeded (lazy-artifacts), and no new manifest entry was added (`.prism/business/**` already routes to `business-layer.md`). Report in chat only. (Single self-review pass covers both Wave 1 personas — do not duplicate from prism-215 task 5.)

---

## Decisions

- **Persona ID is `prism-finance`** (function-descriptive, per `.prism/rules/skill-authoring.md` § Persona name vs. slash-command ID). The human name is the `persona` field only.
  - **Alternatives considered:** `prism-pricing` (too narrow — drops the unit-economics/runway/budget half of the scope), `prism-cfo` (role-title rather than function-descriptive; breaks the `prism-<function>` pattern).
  - **Chosen approach:** `prism-finance`. It covers the full scope (unit economics, pricing, runway, budgets), describes the function so a user who doesn't know the human name can discover it, and reads cleanly alongside `prism-founder` / `prism-prd`. Matches the dispatch recommendation.
  - **→ no promotion needed (ID convention is already codified in skill-authoring.md; this is its application).**
- **No new manifest entry.** `.prism/business/**` already routes to `_toolkit/business-layer.md` (added during prism-213). Confirmed in `.prism/architect/manifest.json:36`. **→ no promotion needed (ticket-tactical confirmation).**
- **No install-seed copies required.** Per ADR-0059, the seed-copy requirement applies to `.prism/` content with a `templates/install/` mirror. These personas add source only under `.ai-skills/` (no `templates/install/` mirror) and create no new `.prism/` files, so no seed copies. **→ no promotion needed (scope confirmation; ADR-0059 already owns the rule).**
- **Shared-branch / single-build coordination.** Both Wave 1 personas append the same `roles.json` and regenerate the same mirrors. Author both personas' source first, then run ONE `pnpm prism:build`, then verify both adapter sets — never two build cycles. **Why:** separate builds on the shared `roles.json` would self-conflict and a per-persona build would validate against an incomplete roster. **→ no promotion needed (ticket-tactical; the durable rule lives in ADR-0060 + business-layer.md).**
- **Persona NAME — candidates for Hunter to choose at the gate.** Single human first names, per the roster convention. Recommendation: **Sterling**.
  - **Sterling** — evokes "sterling/currency" and "sound value" without being a job title; reads as a precise, trustworthy finance voice. Distinct from every current persona. **(Recommended.)**
  - **Drew** — short, gender-neutral, "draw down/drawdown" undertone fits runway and burn analysis; clean cadence beside Vera. Strong second choice.
  - **Pierce** — sharp, decisive, "pierces" through optimistic projections to the real margins; senior-analyst feel. Third option if Sterling/Drew feel off-tone.
  - **→ no promotion needed (name choice is ticket-tactical; the persona-type call it rides on is promoted to ADR-0046/0060).**

---

## Acceptance Criteria

AC is largely non-user-facing here (the deliverable is a persona spec, not a running app). Citations: REQ-N maps to #216's deliverables checklist.

### Behavioral

- [ ] Given the finance / pricing persona is installed, When a user invokes it by its trigger phrase or name, Then it greets in its persona voice and reads the strategy doc if one exists (REQ-1)
- [ ] Given the persona is invoked and no strategy work has been done yet, When it starts, Then it does not error on a missing `.prism/business/strategy.md` and offers to begin or append financials to one (REQ-1)
- [ ] Given the `xlsx` host capability is absent this session, When the persona builds a model, Then it keeps the model as a markdown table in the strategy doc and offers to export to a spreadsheet when the capability is present (REQ-2)

### Non-behavioral

- [ ] The finance / pricing persona spec exists as `frontmatter.yml` + `shared.md` + a `roles.json` entry under `.ai-skills/skills/prism-finance/` and `.ai-skills/definitions/roles.json` (REQ-1)
- [ ] The `shared.md` includes an `## Orchestrating over host capabilities` section documenting `xlsx` detection (`ToolSearch select:xlsx`), advertised-schema use, and the graceful-degradation path (REQ-2)
- [ ] The `roles.json` entry has a `persona` field and no `type` field (persona is the default) (REQ-3)
- [ ] `pnpm prism:build` is green and the discovery, literal-guard, and path tests pass (REQ-3)
- [ ] The build generated the persona's skill adapters for all runtimes and a Codex agent adapter at `.codex/agents/prism-finance.toml` (REQ-3)
- [ ] No `.prism/business/strategy.md` is seeded at install time (lazy-artifacts) and no new manifest entry was added (REQ-1)

### AC Sync Log

| Date | Agent | Action | Plan | Linear |
| ---- | ----- | ------ | ---- | ------ |
| 2026-06-18 | Winston | AC authored during Wave 1 planning | prism-216 | N/A (GitHub issue #216) |

---

## PR Readiness

- [x] Build passes — last run: 2026-06-18 (`pnpm prism:build` 329 tests pass; `pnpm prism:check` green)
- [ ] Self-review pass (Briar) — pending its lane
- [ ] PR description up to date

**Last updated:** 2026-06-18

---

## History

- 2026-06-18 [hmcgrew/prism-wave1-market-research-finance]: Plan created by Nora; Wave 1 branch set up from origin/main at 44a91fe.
- 2026-06-18 [hmcgrew/prism-wave1-market-research-finance]: Winston populated Implementation Tasks, Decisions, and AC mirroring the Vera (prism-213) worked example. Persona ID `prism-finance`; host capability `xlsx`; design settled by ADR-0060. Gate: needs Hunter to pick the persona name at the A/P/C gate before skill-forge authoring runs; shared-branch single-build coordination noted with prism-215.
- 2026-06-18 [hmcgrew/prism-wave1-market-research-finance]: Authored Ellis (`prism-finance`) — `frontmatter.yml` + `shared.md` mirroring Vera, plus the `roles.json` entry. Built in the single shared `pnpm prism:build` (329 tests pass) and `pnpm prism:check` (green) covering both Wave 1 personas; all five adapters generated. No `.prism/business/strategy.md` seeded.
