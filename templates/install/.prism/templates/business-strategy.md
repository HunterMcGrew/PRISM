# Business Strategy Doc — Template & Conventions

The strategy doc is the business layer's working memory, scoped to a company and a quarter. It sits above PRDs: it decides what the company is doing and why, and the business skills feed it. The live doc is the single file `.prism/business/strategy.md`.

## Conventions every business skill follows

- **Read before writing.** Each `## Decisions` entry is an implicit do-not-undo. When a request conflicts with one, name the conflict and ask whether it is an intentional reversal. If yes, update the entry with the reason it changed before writing, and if reversing it would invalidate other recorded priorities, ask the user who must ratify it. Never overwrite a decision silently.
- **Write only your own section.** `prism-strategy` owns the doc and writes any section. Every other business skill reads the whole doc and writes only the section named in its body. `## Decisions` and `## History` are shared and append-only.
- **Stay in your lane.** Keep artifacts at strategy-feeding grain: feed other sections and PRDs, and do not restate them. For work outside your skill's lane (a PRD, user stories, architecture, implementation), name the owning skill and hand off.
- **Create on first real write.** Build the file from the structure below when a run has content to record, and never seed it empty.
- **Hand off through `prism-prd`.** When work surfaces an initiative worth building, point `prism-prd` at the relevant strategy section as upstream context. Business skills never hand to implementation skills directly. Handoffs between business skills are fine.
- **Host capabilities are not shipped.** `deep-research`, `brand-voice`, and `xlsx` come from the host. Check for one at runtime with `ToolSearch select:<name>`, use the parameters its schema advertises, and when it is absent say so once, use the fallback in your body, and continue.

# Strategy Doc Structure

# Strategy: <company or product name>

> Quarter: <e.g. Q3 2026> · Last updated: YYYY-MM-DD

## Mission & Positioning

- **Mission** — what the company is for.
- **Positioning** — who it serves, against whom, and why it wins.

## OKRs

Current quarter. Each objective is a direction, and each key result is a measurable outcome.

### Objective 1: <one-sentence direction>

- [ ] KR1: <measurable result, such as "30% of weekly-active teams adopt X">

## Cross-Functional Priorities

Ranked, with the why. Name what the company will not do this quarter as clearly as what it will.

1. <highest priority>

## Decisions

Durable log of strategy choices. Each entry gives the reasoning, and a real alternative gets one line on why it lost.

- <what was decided and why>
- **OPEN — TBD, needs <name> input.** <The question>. **Default path (used until resolved):** <what work follows meanwhile>. When it resolves, replace it with a normal Decision and note the resolution in `## History`.

## History

- YYYY-MM-DD: <what changed and why>

## Metrics

Written by `prism-metrics`, which appends measured results here for `prism-strategy` to review.

| Metric | Target | Current | As of |
| ------ | ------ | ------- | ----- |

## Initiatives → PRDs

| Initiative | Strategy section | PRD |
| ---------- | ---------------- | --- |
| <name> | <e.g. Cross-Functional Priorities #1> | `.prism/prds/<slug>.md` or "pending" |

Sections owned by the other business skills (`## Research`, `## Finance`, `## Marketing`, `## Sales`, `## Customer Success`, `## People`, `## Legal & Compliance`) are added by their owner on its first write.
