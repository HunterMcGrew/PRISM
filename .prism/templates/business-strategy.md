# Business Strategy Doc — Template & Conventions

## Purpose

The strategy doc is the business layer's durable working memory — the company/quarter-scoped equivalent of the branch plan. The founder/strategy persona (Vera) owns it; every Wave 1+ business persona reads it and appends to its owned sections, the way every engineering persona grounds in the branch plan. It sits *above* PRDs on grain: it decides what the company is doing and why, and points Parker at the relevant section as upstream context for the PRDs that flow from it.

This file is the template and the conventions. The live doc lives at `.prism/business/strategy.md` and is created on Vera's first real write — not seeded at install time (per [`lazy-artifacts.md`](../rules/lazy-artifacts.md)).

---

## File location

The strategy doc is a single file:

`.prism/business/strategy.md`

Single file with sections, not a per-domain subdirectory — the branch-plan precedent proves single-file-with-sections works across many personas, and a subdir fragments reads and writes before any contention justifies it. A split into per-domain subdocs is a deferred, second-adapter decision: earn it when contention is observed, not anticipated (see [ADR-0060](../spec/adrs/_toolkit/0060-business-layer-substrate.md)).

---

## Section ownership

Vera owns the doc and writes every section freely. Later business personas append to their owned sections under the section-ownership model ([ADR-0014](../spec/adrs/_toolkit/0014-plan-section-ownership.md)) — they read the whole doc but write only the sections they own. The `## Decisions` log is shared, append-only working memory the way the branch plan's is.

---

## Required Workflow

- **Read before writing.** Treat the existing doc as the source of truth for current mission, OKRs, priorities, and prior decisions. Each `## Decisions` entry is an implicit do-not-undo.
- **Reconcile, don't overwrite.** When a new choice conflicts with a recorded decision, update the `## Decisions` entry with the reason it changed — never silently overwrite a documented choice.
- **Outcomes over activity.** OKRs are measurable results, not lists of work. Reject key results that can't be measured.
- **Surface open questions.** When a call needs input you don't have, record it with the open-question variant and a default path so work continues without losing the question.

---

# Strategy Doc File Template

When creating `.prism/business/strategy.md`, use the following structure.

---

# Strategy: <company or product name>

> Quarter: <e.g. Q3 2026> · Last updated: YYYY-MM-DD

## Mission & Positioning

One short paragraph each. The anchor every contested priority resolves against.

- **Mission** — what the company is for.
- **Positioning** — who it serves, against whom, and why it wins.

---

## OKRs

Current quarter. Each objective is a direction; each key result is a measurable outcome that proves you got there.

### Objective 1: <one-sentence direction>

- [ ] KR1: <measurable result — e.g. "30% of weekly-active teams adopt X">
- [ ] KR2: <measurable result>

### Objective 2: <one-sentence direction>

- [ ] KR1: <measurable result>

---

## Cross-Functional Priorities

Ranked, so downstream personas know what comes first. Name what the company will *not* do this quarter as clearly as what it will.

1. <highest priority — one line, with the why>
2. <next>

---

## Decisions

Durable, auditable log of strategy choices. Append-only working memory — each entry is an implicit do-not-undo, and the reasoning is the signal.

- <what was decided and why — one line each>

When a decision had a real alternative, record it as a TL;DR: alternative + one-line reason it was rejected. No essay.

### Open-question Decision variant

Some strategy calls surface before the input to resolve them exists — a stakeholder hasn't weighed in, a benchmark hasn't run, a market read is pending. Record these explicitly so work continues under a documented default while the question stays visible. Mirrors the branch plan's `OPEN —` variant ([`branch-plan.md`](../rules/branch-plan.md)).

**Format:**

```markdown
- **OPEN — TBD, needs <name> input.** <The open question>. **Default path (used until resolved):** <what work follows in the meantime>.
```

When the question resolves, replace the entry with a normal Decision and note the resolution in `## History`.

---

## History

Append-only log. One line per meaningful change, oldest first.

- YYYY-MM-DD: <what changed and why>

---

## Metrics

The landing spot for measured outcomes. Today this section holds the OKR targets and any baseline numbers; it is also the documented home for the **future outbound seam** — a Wave 3 data/metrics persona will append measured results here, feeding the engineering pipeline's outcomes back into strategy. Keep the section present and labeled even before that persona exists.

| Metric | Target | Current | As of |
| ------ | ------ | ------- | ----- |
| <name> | <target> | <value or —> | YYYY-MM-DD |

---

## Initiatives → PRDs

Pointers to the PRDs that flow from this strategy. Vera names the initiative and the strategy section it derives from; Parker writes the PRD at `.prism/prds/<slug>.md`. This is the inbound handoff seam — the strategy doc is a *source* Parker reads, not a parallel pipeline.

| Initiative | Strategy section | PRD |
| ---------- | ---------------- | --- |
| <name> | <e.g. Cross-Functional Priorities #1> | `.prism/prds/<slug>.md` (or "pending") |
