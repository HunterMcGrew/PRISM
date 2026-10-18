---
title: "Iris — the retrospective skill"
description: "How the retro skill compares a plan's stated intent with the execution record and writes an evidence-cited report."
category: "ai-skills"
audience: "dev"
last_updated: "2026-10-18"
---

## What Iris does

`prism-retro` (Iris) runs the retro charter on a plan: six questions answered from the plan's intent sections (`## History`, `## Decisions`, `## Acceptance Criteria`, `## Debugged Issues`, `## Review Issues`) and from the execution record (merged diffs, PR review threads, CI conclusions). It writes one report to `.prism/retros/` and never edits the plan.

The six questions are: did we do what we said, were there issues or bottlenecks, what could we improve, did we follow the code standards, did we do anything wrong, and are the tests passing. A question that no reached source can answer is reported as unanswered, so a retro built on thin evidence says so.

Iris runs when invoked and at plan close. She has no place in the ticket-flow handoff chain.

## Two grains

- **Per-PR.** A light fidelity check on one ticket: what the plan said against what shipped, what CI showed, and whether review findings were addressed. It produces a compact note.
- **Epic.** The full audit of an epic plan and its children. It reads the per-PR notes first and spends its effort on cross-ticket patterns.

A date range (`YYYY-MM-DD..YYYY-MM-DD`) walks every plan with a `## History` line inside it.

## How it works

1. **Resolve the target and the grain,** and confirm the target before reading.
2. **Read the team's evidence config** (`retroEvidence` in `.ai-skills/config.json`). A source the team does not have is `not configured`, and one that fails this run is `unreachable`. The report keeps the two apart.
3. **Gather evidence** from the plan sections, merged diffs, all three GitHub review surfaces (issue comments, review objects, check runs), CI conclusions, and an AC-verification report when the plan points at one.
4. **Flag divergences.** A Decision counts as refuted only when later evidence directly contradicts its stated rationale. An adjacent bug is logged, not staged as a disagreement.
5. **Write the report:** summary, charter coverage, findings that each cite their evidence, action items with proposed owners, promotion cautions, lesson candidates, and citations.

## Action items

Action items are proposals. Iris offers to hand them to `prism-start-ticket`, which runs the scope-fit gate from `.prism/rules/followup-scope.md` on each one before filing. If you decline, the items stay in the report as a record and no tickets are filed.

## What Iris is not

- **Not an editor of plans.** The plan being retro'd is read-only. The plan-close ceremony consumes the report's promotion cautions, so the reflector and the closer stay separate.
- **Not a code writer.** The output is a Markdown report.
- **Not a source of invented perspectives.** Every finding cites a plan section or an execution-record entry.

## See also

- [`.ai-skills/skills/prism-retro/shared.md`](https://github.com/HunterMcGrew/PRISM/blob/main/.ai-skills/skills/prism-retro/shared.md) — the skill
- [ADR-0037 — Cadence-driven personas](https://github.com/HunterMcGrew/PRISM/blob/main/.prism/spec/adrs/_toolkit/0037-cadence-driven-personas.md) — the axis Iris shares with Zoe and Atlas
- [`.prism/rules/followup-scope.md`](https://github.com/HunterMcGrew/PRISM/blob/main/.prism/rules/followup-scope.md) — the scope-fit gate applied to action items
