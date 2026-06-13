---
title: "Audit Workflow"
description: "Why PRISM ships a cadence-driven audit persona, what surfaces it walks, and how it keeps the durable .prism/ surface from accumulating dead context."
category: "architecture"
audience: "dev"
last_updated: "2026-05-22"
---

# Audit Workflow

Agent-facing version: `.prism/architect/audit-workflow.md`.

PRISM accumulates durable context over time — branch plans, lessons learned, architectural decision records, architect docs. Every one of those surfaces grows on every ticket. Most of the growth is healthy: a plan documents a decision, the decision lands in the architect doc, the lesson hardens into a rule. Some of it isn't: a plan stays open after the work shipped, a lesson never gets referenced, an ADR's underlying assumption shifts without anyone updating the entry.

The pile-up matters because durable context is loaded into agent sessions. A stale plan with a stale decision still routes through `manifest.json` into Winston's evaluation. A lesson that was true in 2025 but is now misleading still sits in `.prism/lessons.md` for every future session to read. The cost of dead context isn't zero — it's wasted tokens and, worse, occasional misdirection when an agent treats stale advice as current.

The audit workflow is PRISM's answer.

## The need: someone has to clean up

The existing personas — Winston, Clove, Eric, Sasha, Briar, Nora, Mira, Pixel, Eli, Sage, Reese — are all ticket-flow personas. They're invoked in the context of a specific ticket: greet, resolve the plan, do the work, hand off. None of them have a reason to walk the entire `.prism/` surface, because none of them are looking at the entire surface — they're looking at the plan in front of them.

Three approaches got considered (and the rejected ones say what's wrong with the obvious alternatives):

- **Add the maintenance work to existing personas.** Have Winston run a quarterly audit. Have Briar sweep `.prism/lessons.md` after every self-review. The cost lands on personas whose job isn't maintenance, and the timing is wrong — a user opening Briar to review their own PR doesn't want Briar also reading the lessons file.
- **Build cadence into the tooling, not into personas.** Run a cron job that walks `.prism/`, dumps findings to a static report. The work is judgment work, not mechanical work. Classifying a Decision as still-load-bearing or no-longer-needed requires reasoning a script can't carry. The output of a cron job that nobody reads is a list nobody acts on.
- **Introduce a new persona axis: cadence-driven, separate from ticket-flow.** This is the path PRISM took. The persona is named Zoe; the ADR codifying the axis is [ADR-0037](https://github.com/HunterMcGrew/PRISM/blob/main/.prism/spec/adrs/0037-cadence-driven-personas.md).

## What the persona does

Zoe walks four surfaces per audit run.

- **`.prism/plans/`** — every plan file. For each plan, Zoe reads the `## Decisions` section and issues one verdict per entry. She also looks for open-question Decisions that have aged past their stale threshold.
- **`.prism/lessons.md`** — every entry. Zoe classifies each lesson as live (referenced recently) or archive-candidate (no references in 30 days).
- **`.prism/spec/adrs/`** — every ADR. Zoe scans for assumptions that may have shifted since the ADR shipped — a referenced PR closed without merging, a sibling decision since superseded.
- **`.prism/architect/`** — every architect doc. Zoe scans for re-enumeration drift (a doc claims something one way while a sibling doc owns a different enumeration of the same concept) and stale source references.

For each surface, Zoe produces verdicts. The verdicts are the durable output. They get written into the plan files directly — as sub-bullets on the Decision entries — so that downstream personas (Winston, Clove, Briar, Eric, Zoe) see them when they read the plan. The audit report at `.prism/audits/<YYYY-MM-DD>-audit.md` captures the full run for human reference; the per-Decision sub-bullets are what affects future agent context.

## Why verdicts live on the Decision, not in a separate report

A standalone audit report has the cron-job problem in a different shape: the report exists but the downstream readers (Winston, Clove, Briar, Eric, Zoe) never see it because they don't go looking for it. The plan is what they read. So the verdict has to live where they read.

The sub-bullet format on each Decision is the simplest version of that idea: the verdict travels with the Decision, the date travels with the verdict, the next audit run can tell whether the verdict has aged into a new bucket. Five personas carry a reflex bullet that says "when you read a plan's `## Decisions` section, note any Zoe-issued verdict sub-bullet and respect it during current work." That reflex makes Zoe's output load-bearing for ticket-flow work without putting Zoe in the ticket flow.

## What the verdicts mean

Four verdicts, mutually exclusive. The full procedure lives in the agent-facing doc; the short version:

- `live` — the decision is still in effect. Downstream code depends on it. No action.
- `archive-candidate` — the decision is no longer load-bearing. Candidate for promotion to a durable surface (architect doc, ADR, rule) or for deletion alongside the plan.
- `overdue-archive` — work shipped more than 90 days ago AND the plan is still open. The plan has overstayed its useful life.
- `open-stale` — an open-question variant Decision (`OPEN — TBD, needs <name> input`) that has been open more than 30 days. The default path may be carrying work fine, but the question has gone stale and warrants either resolution or explicit acceptance of the default.

When multiple criteria apply (an open-question entry on a plan past 90 days), the more severe verdict wins: `open-stale` < `archive-candidate` < `overdue-archive`.

## Lessons archive

Lessons get the same kind of classification but a different end state. Live lessons stay in `.prism/lessons.md`. Archive-candidate lessons move to `.prism/archived/lessons-archive.md` on the user's confirmation — Zoe never moves silently. The archive file is append-only: lessons go in, lessons don't come back out.

The archive file and archived plans directory are created on first use per `.prism/rules/lazy-artifacts.md` — neither is pre-seeded at install time.

## Plan archive

Closed plans accumulate in `.prism/plans/` after tickets ship. Per ADR-0047, plans are never deleted — but they don't need to stay on the active surface forever.

A plan becomes an archive candidate when: it carries a `> Closed:` marker, every Decision entry has a verdict (either a close-gate verdict from plan close or a Zoe verdict sub-bullet), and the close date is at least 90 days in the past. Zoe flags qualifying plans in the audit report and waits for explicit user confirmation before moving anything — silence is never consent.

Confirmed plans move to `.prism/archived/plans/`. The directory is created on first move; it's not pre-seeded.

## Operational state

Zoe persists state between runs at `.prism/audit-state.json`. The state file ships seeded but empty — a `schemaVersion`, a `lastRun` of `null`, and empty maps for classified items, deferred items, and archived items. The file is operational state, not durable spec; it lives at `.prism/` and not in templates.

The state file's main job is to skip re-classification on rapid follow-up runs. If a user runs Zoe Monday, accepts every verdict, then runs her again Tuesday, the Tuesday run doesn't re-prompt for items the Monday run already classified — it picks up at the next surface that hasn't been touched. The user can also defer items explicitly; deferred items get re-prompted after a grace period elapses.

## What Zoe doesn't do

A few negative-space invariants that matter:

- **No auto-trigger.** Zoe doesn't run on a timer or a cron. The cadence ("weekly default") is advisory. The user invokes Zoe explicitly when the cadence comes due or when an off-cadence audit is wanted.
- **No silent edits.** Zoe never archives a lesson, moves a plan to `.prism/archived/plans/`, or modifies an ADR without explicit user confirmation. Verdicts get written to plan files because they're a kind of annotation; everything else waits for go-ahead.
- **No handoff chain.** Zoe doesn't recommend the next persona at the end of her run. She isn't part of the ticket-flow handoff chain, by construction.

## How this fits the rest of the toolkit

The new persona axis sits alongside ticket-flow personas, not above or below them. The skill roster in `.prism/architect/skills-ecosystem.md` lists Zoe separately so the distinction shows up in the first place a reader looks. The audit doc the agent loads when it touches `.prism/audit-state.json`, `.prism/archived/lessons-archive.md`, `.prism/archived/plans/**`, or `.prism/audits/**` is this document's paired agent-facing version at `.prism/architect/audit-workflow.md`.

The pattern generalizes. A future cadence persona — say, a quarterly ADR-review persona that walks `.prism/spec/adrs/` with more depth than Zoe does, or a metrics-rollup persona that summarizes the team's ticket flow — adopts the same shape: dedicated state file, dedicated architect doc, explicit invocation, no ticket-flow handoff. Zoe is the first; the axis is durable.

## References

- [ADR-0037](https://github.com/HunterMcGrew/PRISM/blob/main/.prism/spec/adrs/0037-cadence-driven-personas.md) — the cadence-driven persona axis.
- [ADR-0038](https://github.com/HunterMcGrew/PRISM/blob/main/.prism/spec/adrs/0038-paired-dev-doc-gates.md) — the paired-doc invariant this document follows.
- `.prism/architect/audit-workflow.md` — agent-facing version with the verdict procedure, state schema, and output format.
- `.ai-skills/skills/prism-surface-audit/` — Zoe's canonical skill source.
