# Plan: prism-215

> Closed: 2026-06-18

## Ticket

https://github.com/HunterMcGrew/PRISM/issues/215

## Goal

Build the market research analyst persona — the business-layer voice for competitive teardowns, TAM/segment sizing, and ICP research, grounded in the Wave 1 substrate established by ADR-0060.

---

## Requirements Summary

**Persona shape (per ADR-0060 + business-layer.md):**
- Full persona (not utility) under ADR-0046: sustained identity, voice, "How X Thinks" lens, `persona` field in `roles.json`, Codex agent adapter.
- Structural model: mirror Vera (`prism-founder`) in frontmatter + shared.md shape.
- Skill ID: `prism-market-research` (function-descriptive, per skill-authoring.md).

**Grounding:**
- Reads `.prism/business/strategy.md` at startup for strategic direction.
- Writes research findings back into its owned section of the strategy doc (section-ownership model, ADR-0014). Does not create a separate state file — the strategy doc is the shared state (ADR-0043 artifact-IS-state model, applied to the business layer).

**Host capability: `deep-research`:**
- Detect at runtime via `ToolSearch select:deep-research` before relying on it.
- Use the advertised schema shape; no hardcoded argument names.
- Graceful degradation when absent: analyze from context + user input; tell the user the report is not independently web-verified; offer to revisit when research is available.
- PRISM ships no copy, no wrapper. Referenced at runtime only (Lilac → Slack MCP precedent).

**Artifacts:**
- Competitive teardowns, TAM/segment sizing, ICP research — delivered as structured sections in the strategy doc (or pointed at from it).

**Handoff seam:**
- Sideways: research findings inform Vera's strategy decisions and the finance persona's unit economics.
- Into engineering: always through Parker. The persona names Parker and points at the relevant `strategy.md` section as upstream PRD context — it does not hand off to Mira, Winston, or Clove directly.

**Build requirements:**
- `pnpm prism:build` green.
- Discovery/literal/path tests pass.
- `roles.json` entry following skill-forge conventions.

**Note:** Built on shared branch `hmcgrew/prism-wave1-market-research-finance` with the sibling Wave 1 persona (prism-216, finance/pricing analyst). One PR closes both issues — the two personas share a `roles.json` diff and the same build run.

---

## User Stories

_To be added by Mira if user stories are warranted._

---

## Design

_Not applicable — this is a persona spec, not a UI feature._

---

## Implementation Tasks

Tasks meet the detail bar in `.prism/rules/implementation-task-detail.md` and mirror prism-213 tasks 5–8 (the Vera worked example). The persona-authoring work runs via `prism-skill-forge` create-mode in the current persona's voice — there is no dedicated "skill author" persona, so the group is labelled by the tool that does it.

> **Shared-branch coordination (read before starting either persona).** This persona and prism-216 (finance) share one branch and one PR. Both append `.ai-skills/definitions/roles.json` and regenerate the same build mirrors, so a single `pnpm prism:build` must cover BOTH personas. **Do not run a per-persona build cycle.** Sequence across the two plans: author ALL of prism-215's source files (tasks 1–3) AND ALL of prism-216's source files first, THEN run one `pnpm prism:build` (prism-215 task 4 / prism-216 task 4 are the same single run), THEN verify both personas' adapter sets. If this plan is executed alone, its task 4 build still validates only after both personas' `roles.json` entries are present.

### prism-skill-forge create-mode (market research persona authoring)

Sequence: task 0 (name) is [HITL] and blocks 1–4. Run authoring only after Hunter ratifies the persona name at the A/P/C gate.

0. [HITL] **Pick the market research persona name.** Blocked on Hunter's choice at the gate (see `## Decisions` → name candidates). The persona ID is `prism-market-research` regardless of the human name chosen (function-descriptive ID convention per `.prism/rules/skill-authoring.md`; the human name is the `persona` field only). Substitute the ratified name everywhere `<Name>` appears below.

1. **[DONE]** **Scaffold the persona via `prism-skill-forge` create-mode** with ID `prism-market-research`, type persona (the default — no `type` field). This writes two source files; the `roles.json` append is task 3. Mirror Vera (`.ai-skills/skills/prism-founder/`) as the structural model.
   - **`.ai-skills/skills/prism-market-research/frontmatter.yml`** — fields per Vera's shape:
     - `name: prism-market-research`
     - `description:` as a YAML folded scalar (`>`, ≤1000 chars; target 250–400) following the 4-part pattern per `.prism/rules/skill-authoring.md` § Description field shape: (1) `<Name> — market research analyst persona.` (2) WHAT — produces competitive teardowns, TAM/segment sizing, and ICP research; grounds in and writes to `.prism/business/strategy.md`; orchestrates over the `deep-research` host capability. (3) grain line — sits in the business layer; hands off into Parker's PRD. (4) `Triggers:` line — `"<Name>"`, plus distinctive keywords: `market research`, `competitive teardown`, `TAM`, `segment sizing`, `ICP`, `market sizing`.
     - `argument-hint: "[<market or competitor> | research]"`
     - `category: business`
   - **`.ai-skills/skills/prism-market-research/shared.md`** — body following Vera's heading structure (study `.ai-skills/skills/prism-founder/shared.md`), ≤500 lines (discovery test enforces). Sections in order:
     - `You are <Name>` voice paragraph — the market research analyst; validates strategy against market reality; reads/writes the strategy doc the way engineering personas ground in the branch plan.
     - `## Personality` — evidence-first, skeptical of unvalidated assumptions, distinguishes a sourced claim from a guess.
     - `## How <Name> thinks` — the research lens (sample shape, mirror Vera's numbered list): (1) a claim without a source is a hypothesis, not a finding; (2) TAM/segment sizing states its method (top-down vs bottoms-up) and its assumptions; (3) competitive teardowns compare on the buyer's axes, not feature checklists; (4) ICP research names who the product is NOT for as sharply as who it is for; (5) findings feed strategy decisions and finance's unit economics — write them where those personas read.
     - `## Research artifacts` — output shape: competitive teardowns, TAM/segment sizing, ICP research delivered as structured sections in `.prism/business/strategy.md` (or pointed at from it). Do not duplicate strategy-grain or PRD-grain detail.
     - `## Intro` — brief in-character greeting (mirror Vera's `## Intro`).
     - `## Startup` — read `.prism/business/strategy.md` if it exists; it is the persona's state per ADR-0043's artifact-IS-state model — no separate state file. If absent, don't error; offer to begin a strategy doc or append research to one. Append to the owned research section under section ownership (ADR-0014); reconcile before overwriting a recorded decision.
     - `## Orchestrating over host capabilities` — the ADR-0060 rule for `deep-research`. Mirror Vera's pattern exactly: (1) detect at runtime via `ToolSearch select:deep-research` before relying on it; (2) use the advertised schema shape, no hardcoded argument names; (3) degrade gracefully when absent — **`deep-research` absent:** do the analysis from what's in context + the user's input, tell the user the report is NOT independently web-verified, and offer to revisit once research is available. Note that the capability is invisible at PRISM build time and graceful degradation is the only guard.
     - `## Project Engineering Standards` — defer to `.prism/rules/` and `.prism/architect/`; cite `AGENTS.md § Ownership & Handoff`; hand off out-of-lane work.
     - `## Ownership & Handoff` — appends to its owned research section of `.prism/business/strategy.md`. Sideways: findings inform Vera's strategy and the finance persona's unit economics. Into engineering: ALWAYS through Parker — name Parker and point at the relevant `strategy.md` section as upstream PRD context; never hand off to Mira/Winston/Clove directly.
     - `## When dispatched by Sol` — return a primary verdict per `report-back.md` plus secondary signals, in addition to strategy-doc writes (mirror Vera).
     - `## Next persona` — default route: Parker (when research surfaces an initiative worth specifying); conditional route: Vera (when findings should reshape strategy/OKRs) or the finance persona (sideways, for unit-economics input).
     - `## Definition of Done` — research claims sourced or flagged as hypotheses; sizing states method + assumptions; host-capability use degraded gracefully and the fallback stated when absent; no `.prism/business/strategy.md` seeded empty; next persona named and handoff proposed not executed.
     - `## Lessons Check` and `## Session close` (reflex bullets incl. context-reuse) — mirror Vera's closing sections.

2. **(Covered by task 1's two files.)** _No separate task — frontmatter.yml and shared.md are both written in task 1._

3. **[DONE]** **Append the `roles.json` entry.** In `.ai-skills/definitions/roles.json`, add `{ "id": "prism-market-research", "persona": "<Name>" }` to the `skills` array (no `type` field — persona is the default per ADR-0046). Place it adjacent to the other business personas (after the `prism-founder` entry at line ~80–82 is the natural home; finance's entry from prism-216 sits beside it). **Coordination:** this is the shared-file touchpoint — prism-216 also appends here. Both entries must be present before the single build runs.

4. **[DONE]** **Run the shared `pnpm prism:build`** (runs `tsx scripts/ai-skills/build.ts` then `pnpm prism:test`) — ONE run covering both Wave 1 personas; do not run a per-persona build. Confirm green: discovery tests (`scripts/ai-skills/discovery-metadata.test.ts` — canonical files present, role-map shape valid, description ≤1000 chars, body ≤500 lines, managed markers), literal guard (no hardcoded team literals), path tests (`scripts/ai-skills/path-guard.test.ts`). Verify the build generated this persona's four runtime adapters — `.claude/skills/prism-market-research/SKILL.md`, `.cursor/skills/prism-market-research/SKILL.md`, `.agents/skills/prism-market-research/SKILL.md`, and the Codex agent adapter `.codex/agents/prism-market-research.toml` (persona entries get an adapter per ADR-0046) — alongside prism-216's four adapters. Also run `pnpm prism:check` for seed/crossref drift (prism-213's Briar pass caught seed-copy gaps — but these personas live in `.ai-skills/` with no `templates/install/` mirror, so no seed copies are required per ADR-0059; confirm `prism:check` is green regardless).

### Briar (self-review) — after task 4 (covers both Wave 1 personas)

5. **Self-review the branch** — confirm `pnpm prism:build` and `pnpm prism:check` green, both `roles.json` entries validate (no `persona`+`type:utility` conflict), no `.prism/business/strategy.md` was speculatively seeded (lazy-artifacts), and no new manifest entry was added (`.prism/business/**` already routes to `business-layer.md`). Report in chat only.

---

## Decisions

- **Persona ID is `prism-market-research`** (function-descriptive, per `.prism/rules/skill-authoring.md` § Persona name vs. slash-command ID). The human name is the `persona` field only.
  - **Alternatives considered:** `prism-research` (too broad — could read as engineering/spike research), `prism-market` (drops the "research/analysis" function the ID is supposed to describe).
  - **Chosen approach:** `prism-market-research`. It describes the function precisely so a user who doesn't know the human name can still discover and route to it, and it reads cleanly alongside `prism-founder` / `prism-prd`. Matches the dispatch recommendation.
  - **→ no promotion needed (ID convention is already codified in skill-authoring.md; this is its application).**
- **No new manifest entry.** `.prism/business/**` already routes to `_toolkit/business-layer.md` (added during prism-213). Confirmed in `.prism/architect/manifest.json:36`. **→ no promotion needed (ticket-tactical confirmation).**
- **No install-seed copies required.** Per ADR-0059, the seed-copy requirement applies to `.prism/` content with a `templates/install/` mirror. These personas add source only under `.ai-skills/` (no `templates/install/` mirror) and create no new `.prism/` files, so no seed copies. **→ no promotion needed (scope confirmation; ADR-0059 already owns the rule).**
- **Shared-branch / single-build coordination.** Both Wave 1 personas append the same `roles.json` and regenerate the same mirrors. Author both personas' source first, then run ONE `pnpm prism:build`, then verify both adapter sets — never two build cycles. **Why:** separate builds on the shared `roles.json` would self-conflict and a per-persona build would validate against an incomplete roster. **→ no promotion needed (ticket-tactical; the durable rule lives in ADR-0060 + business-layer.md).**
- **Persona NAME — candidates for Hunter to choose at the gate.** Single human first names, per the roster convention. Recommendation: **Marlo**.
  - **Marlo** — crisp, gender-neutral, "market"-adjacent phonetically without being on-the-nose; reads as a sharp analyst. Distinct from every current persona. **(Recommended.)**
  - **Devi** — short, modern, evokes "data/discovery"; clean three-letter cadence that sits well beside Vera. Strong second choice.
  - **Cora** — warm, senior-analyst feel; "core/corpus" undertone fits someone who finds the core market truth. Third option if Marlo/Devi feel too abstract.
  - **→ no promotion needed (name choice is ticket-tactical; the persona-type call it rides on is promoted to ADR-0046/0060).**

---

## Review Issues

### Cross-persona name coupling in "How Kora thinks" prose

- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `.ai-skills/skills/prism-market-research/shared.md`
- **Problem:** Kora's "How Kora thinks" prose names the sibling finance persona (Ellis) by name, coupling the two persona specs; the reverse coupling exists in prism-216. Eric flagged as non-blocking, possibly intentional.
- **Suggested fix:** Replaced `Ellis's pricing and unit-economics models` with `the finance persona's pricing and unit-economics models` in the thinking-principle prose only. Handoff and Next-persona routing lines left unchanged.
- **Fixed in:** commit on `hmcgrew/prism-wave1-market-research-finance` resolving Eric's minor from PR #217 review.

---

## Acceptance Criteria

AC is largely non-user-facing here (the deliverable is a persona spec, not a running app). Citations: REQ-N maps to #215's deliverables checklist.

### Behavioral

- [ ] Given the market research persona is installed, When a user invokes it by its trigger phrase or name, Then it greets in its persona voice and reads the strategy doc if one exists (REQ-1)
- [ ] Given the persona is invoked and no strategy work has been done yet, When it starts, Then it does not error on a missing `.prism/business/strategy.md` and offers to begin or append research to one (REQ-1)
- [ ] Given the `deep-research` host capability is absent this session, When the persona is asked for a teardown or market sizing, Then it analyzes from context and user input, states that the report is not independently web-verified, and offers to revisit when research is available (REQ-2)

### Non-behavioral

- [ ] The market research persona spec exists as `frontmatter.yml` + `shared.md` + a `roles.json` entry under `.ai-skills/skills/prism-market-research/` and `.ai-skills/definitions/roles.json` (REQ-1)
- [ ] The `shared.md` includes an `## Orchestrating over host capabilities` section documenting `deep-research` detection (`ToolSearch select:deep-research`), advertised-schema use, and the graceful-degradation path (REQ-2)
- [ ] The `roles.json` entry has a `persona` field and no `type` field (persona is the default) (REQ-3)
- [ ] `pnpm prism:build` is green and the discovery, literal-guard, and path tests pass (REQ-3)
- [ ] The build generated the persona's skill adapters for all runtimes and a Codex agent adapter at `.codex/agents/prism-market-research.toml` (REQ-3)
- [ ] No `.prism/business/strategy.md` is seeded at install time (lazy-artifacts) and no new manifest entry was added (REQ-1)

### AC Sync Log

| Date | Agent | Action | Plan | Linear |
| ---- | ----- | ------ | ---- | ------ |
| 2026-06-18 | Winston | AC authored during Wave 1 planning | prism-215 | N/A (GitHub issue #215) |

---

## PR Readiness

- [x] No critical or major issues (Briar self-review + Eric PR review confirmed; one non-blocking minor deferred)
- [x] Build passes — last run: 2026-06-18 (`pnpm prism:build` 329 tests pass; `pnpm prism:check` green)
- [x] Self-review pass (Briar) — clean, no critical/major issues found
- [x] PR review pass (Eric) — merge-ready pending human; one non-blocking minor (cross-persona name coupling) recorded as deferred
- [x] PR description up to date
- [x] Lasting decisions promoted to architect context — none new; all decisions follow ADR-0060 + `_toolkit/business-layer.md` (already covering the convention)

**Last updated:** 2026-06-18

---

## History

- 2026-06-18 [hmcgrew/prism-wave1-market-research-finance]: Plan created by Nora; Wave 1 branch set up from origin/main at 44a91fe.
- 2026-06-18 [hmcgrew/prism-wave1-market-research-finance]: Winston populated Implementation Tasks, Decisions, and AC mirroring the Vera (prism-213) worked example. Persona ID `prism-market-research`; design settled by ADR-0060. Gate: needs Hunter to pick the persona name at the A/P/C gate before skill-forge authoring runs; shared-branch single-build coordination noted with prism-216.
- 2026-06-18 [hmcgrew/prism-wave1-market-research-finance]: Authored Kora (`prism-market-research`) — `frontmatter.yml` + `shared.md` mirroring Vera, plus the `roles.json` entry. Ran the single shared `pnpm prism:build` (329 tests pass) and `pnpm prism:check` (green) covering both Wave 1 personas; all five adapters generated. No `.prism/business/strategy.md` seeded.
- 2026-06-18 [hmcgrew/prism-wave1-market-research-finance]: Briar self-review — clean pass. Build green, all adapters verified, roles.json valid, no seed violations, no session-context leakage, no hardcoded literals. AC items satisfiable by shipped content. Ready for PR.
- 2026-06-18 [hmcgrew/prism-wave1-market-research-finance]: Draft PR #217 opened against main — closes #215 and #216 together (shared branch/build). Pending Eric review and Hunter merge.
- 2026-06-18 [hmcgrew/prism-wave1-market-research-finance]: Plan closed by Winston. All Decisions follow ADR-0060 + business-layer.md — nothing new to promote. Eric's one minor (cross-persona name coupling) recorded as deferred for Hunter to decide; PR #217 stays draft, parked at the human merge gate.
- 2026-06-18 [hmcgrew/prism-wave1-market-research-finance]: Fixed Eric's minor — replaced `Ellis's pricing and unit-economics models` with `the finance persona's pricing and unit-economics models` in thinking-principle prose only; handoff and routing lines unchanged. Build green (329 tests, crossref-lint passed).
