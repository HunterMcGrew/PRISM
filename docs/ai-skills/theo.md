---
title: "Theo — the architect-doc walker"
description: "How Theo finds load-bearing decisions in your codebase and proposes them as architect docs."
category: "ai-skills"
audience: "dev"
last_updated: "2026-06-16"
---

## What Theo does

Theo opens by orienting — asks where to walk. He explores the directory you point him at, naming what he sees instead of grading it. For each load-bearing decision he finds, he presents it to you with a reason and a suggested shape — then asks whether to write it up, skip it, or set it aside for later. If you say write, he drafts the doc, hands it to you for review, iterates if you want changes, and commits when you accept. He tracks where he's been so you can pause mid-walk and resume next session.

The "load-bearing" check is the Deletion Test: imagine deleting the abstraction. If complexity vanishes, it was a pass-through — nothing to document. If complexity reappears scattered across multiple callers, the abstraction was earning its keep, and that's where the doc-worthy decisions live.

## When to use Theo

- **Post-Atlas onboarding.** After Atlas has configured the team, Theo's the first ongoing skill to invoke — he turns Atlas's stub anchors into real architect docs by walking the actual codebase.
- **Periodic audit.** Every few cycles, walk a feature area to surface decisions that were implicit and should become explicit. Catches doc gaps before they become tribal knowledge.
- **Pre-refactor.** Before Ren goes hunting for refactor candidates, Theo maps what's load-bearing so Ren knows what's intentional vs. accidental complexity.

## How Theo works

Theo's a multi-phase persona. He cycles through eight phases per walk: init → scan → present → discuss → draft → review → commit → continue. Each phase has its own step file at `.prism/skills/prism-doc-walker/step-NN-*.md` so individual phases can be swapped without disturbing the rest.

Resumability is structural — Theo writes his progress to `.prism/theo-state.json` after every phase. If you pause mid-walk (close the session, switch branches, lose power), the next invocation reads the state file and offers to resume from the last completed phase. See [`.prism/skills/prism-doc-walker/lib/state.md`](https://github.com/HunterMcGrew/PRISM/blob/main/.prism/skills/prism-doc-walker/lib/state.md) for the read/write/mutate protocol.

## Output

Theo produces three file types:

- **Architect docs** at `.prism/architect/<topic>.md` — the agent-facing record of load-bearing decisions. Read by every PRISM agent during relevant edits via the manifest.
- **State file** at `.prism/theo-state.json` — operational state for resume. Gitignored; not durable spec.

When a topic warrants human-readable narrative documentation, Theo flags it and routes to Eli. Eli decides the appropriate `docs/` path. The automatic paired dev doc at `docs/content/dev/architecture/<topic>.md` is retired per [ADR-0058](https://github.com/HunterMcGrew/PRISM/blob/main/.prism/spec/adrs/_toolkit/0058-retire-paired-dev-doc-convention.md).

Architect docs follow the four-beat arc named in [`.prism/architect/_toolkit/architecture-doc-shape.md`](https://github.com/HunterMcGrew/PRISM/blob/main/.prism/architect/_toolkit/architecture-doc-shape.md).

## Composition with the other codebase-touching personas

| Persona | Posture | Shape | Output |
| --- | --- | --- | --- |
| **Atlas** | One-shot configurator | Single-turn onboarding | `.ai-skills/config.json`, per-team rules |
| **Theo** | Proactive walker | Multi-phase, resumable | Architect docs + paired dev docs |
| **Ren** (Phase 2.6) | Refactor scout | Multi-phase, resumable | Refactor candidates with grades |
| **Winston** | Reactive evaluator | Single-turn (per evaluate run) | Plan documents, evaluations |

Theo names load-bearing shape; Ren grades quality; Winston evaluates proposed approaches. Atlas sets the stage for all three by configuring the team. The four personas are orthogonal — invoking one doesn't preempt the others.

## See also

- [ADR-0041 — Theo as the architect-doc walker persona](https://github.com/HunterMcGrew/PRISM/blob/main/.prism/spec/adrs/_toolkit/0041-theo-architect-doc-walker.md)
- [`.prism/skills/prism-doc-walker/lib/state.md`](https://github.com/HunterMcGrew/PRISM/blob/main/.prism/skills/prism-doc-walker/lib/state.md) — state schema and protocol
- [`.prism/architect/_toolkit/architecture-doc-shape.md`](https://github.com/HunterMcGrew/PRISM/blob/main/.prism/architect/_toolkit/architecture-doc-shape.md) — the four-beat arc Theo's drafts follow
