# Plan: prism-215

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

_Owned by Winston. Tasks to be added during planning phase._

---

## Decisions

_To be recorded as implementation decisions surface._

---

## Acceptance Criteria

_To be added by Winston during planning._

### AC Sync Log

| Date | Agent | Action | Plan | Linear |
| ---- | ----- | ------ | ---- | ------ |

---

## History

- 2026-06-18 [hmcgrew/prism-wave1-market-research-finance]: Plan created by Nora; Wave 1 branch set up from origin/main at 44a91fe.
