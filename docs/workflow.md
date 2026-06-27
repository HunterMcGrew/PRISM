---
title: "The PRISM Workflow"
description: "How work moves from ticket to ship in PRISM: who to call, when, and what each persona hands off."
category: "workflow"
audience: "developer-user"
last_updated: "2026-06-27"
---

# The PRISM Workflow

A ticket in PRISM moves through five phases: start, plan, implement, review, and ship. Each phase has a persona that owns it. The branch plan — a file in `.prism/plans/` — carries context across all five, so every persona picks up where the last one left off.

## The five phases

### 1. Start — Nora picks up the ticket

When you're ready to start a ticket, say: "Nora, start PRISM-1234." or "Start this ticket."

Nora reads the ticket, confirms scope, and sets up the branch and plan file. The plan file becomes the shared memory for everyone who touches the ticket.

**Nora hands off to:** Winston (if architectural planning is needed) or Clove (if the path is already clear).

### 2. Plan — Winston designs the approach

For anything non-trivial — three or more steps, or a real architectural decision — Winston plans before anyone writes code.

Say: "Winston, plan this out." or ask an architecture question.

Winston reads the branch plan, evaluates the approach against codebase patterns, makes decisions, and writes ordered implementation tasks into `## Implementation Tasks`. Each task is specific enough that Clove can execute it without judgment calls.

**Winston hands off to:** Clove for implementation.

### 3. Implement — Clove writes the code

Say: "Clove, implement this." or describe what you want built.

Clove reads the branch plan, works through the implementation tasks in order, and updates the plan after each meaningful change. When work surfaces a design question, Clove loops in Pixel. When a bug surfaces mid-implementation, Clove loops in Sasha.

**Clove hands off to:** Briar for self-review before opening a PR.

### 4. Review — Briar then Eric

**Self-review (Briar):** Before opening a PR, say "Briar, review my changes." Briar checks types, logic, accessibility, and tests. Findings go into `## Review Issues` in the branch plan. Briar never posts to GitHub.

**PR review (Eric):** After the PR is open, say "Eric, review PR #123." Eric posts inline comments and severity-ranked findings directly to the GitHub PR. Eric never approves — approval is a human responsibility.

**Briar hands off to:** Clove for fixes, then back to Briar until clean. When documentation gaps surface during review, Briar can route to Eli instead.

**Eric hands off to:** Clove for fixes.

### 5. Ship — Clove pushes and opens the PR

When the branch is ready, Clove commits, pushes, and opens the PR. Eli documents the feature. Sage generates the changelog entry when the release is ready.

---

## The enforcement floor

Each persona writes a `report.json` to its evidence directory before stopping. The runtime's Stop hook reads that file and ratifies or overrides the claimed verdict before the handoff proceeds — so a `done` from any persona is backed by a runtime check, not just the model's self-report. See [enforcement-floor.md](./ai-skills/enforcement-floor.md) for how ownership guards, verdict gates, and the report contract work together.

---

## Why rules load when they do

The tier system is built so rules load at the right scope rather than all at once — a rule about WordPress blocks doesn't load when you're working on a TypeScript utility. See [SPEC.md](../.prism/SPEC.md) for the full tier breakdown and the [ADR for the three-tier rule loading model](../.prism/spec/adrs/_toolkit/0035-rule-loading-tiers.md).

---

## Other personas and when to call them

| Persona | Call when |
|---------|-----------|
| **Mira** | Writing user stories before planning |
| **Pixel** | You need a UI/UX design, a mock, or layout direction |
| **Reese** | You need a QA test plan or release checklist |
| **Sasha** | Something is broken and you need a diagnosis |
| **Theo** | Walking a directory for architect-doc coverage |
| **Ren** | Scouting the codebase for refactor candidates |
| **Parker** | Writing a PRD from scratch or synthesizing one from existing code |
| **Lilac** | Generating a standup summary |
| **Sage** | Generating a changelog between releases |
| **Zoe** | Running a cadence audit to surface stale decisions and open plans |
| **Sol** | Goal-driven orchestration across multiple personas end-to-end |

See [personas.md](./personas.md) for what each persona owns, what it needs, and what it hands off.

---

## The branch plan

Every ticket has one plan file at `.prism/plans/<ticket-id>.md`. It contains:

- **`## Goal`** — one sentence, what this ticket achieves
- **`## Implementation Tasks`** — ordered tasks by persona (Winston writes; Clove executes)
- **`## Decisions`** — choices made and why, each an implicit do-not-undo
- **`## History`** — append-only log of what happened on the branch
- **`## Review Issues`** — findings from Briar and Eric
- **`## Acceptance Criteria`** — the bar the implementation must meet

Plans persist after tickets close — they're the durable record of what was built and why. See [AGENTS.md](../AGENTS.md) § Plan Rule for the full plan lifecycle.

---

## Going deeper

The behavioral norms behind this workflow — why authors ship and reviewers don't, why plans are never deleted, why cross-agent handoffs require verification — are documented in the ADRs under [`.prism/spec/adrs/`](../.prism/spec/adrs/). The tier system, promotion pathways, and spec ownership model are in [`.prism/SPEC.md`](../.prism/SPEC.md).
