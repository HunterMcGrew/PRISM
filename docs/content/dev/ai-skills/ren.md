---
title: "Ren — the refactor scout"
description: "How Ren finds structurally weak code, grills the candidate, and produces a refactor plan."
category: "ai-skills"
audience: "dev"
last_updated: "2026-05-22"
---

## What Ren does

Ren walks the codebase looking for structural weakness — shallow modules that fail the deletion test, abstractions with one caller, leaky seams, dead code. For each candidate, he assigns a strength badge (`strong` / `worth-exploring` / `speculative`), presents ranked candidates with before/after sketches, and asks you to pick / skip / defer. On pick, he grills the candidate through five passes (design tree, assumptions, deletion-test rigor, alternatives, user confirm) before producing a refactor plan at `.prism/plans/refactor-<slug>.md`.

**Ren never modifies source code.** His deliverable is the plan. Winston picks up `## Implementation Tasks`; Clove executes.

## When to use Ren

- **After Theo's walk.** Theo documents what's load-bearing — what's intentional. Ren spots what's NOT intentional. Run Theo first so Ren knows what NOT to grade as weak.
- **Pre-refactor budget planning.** Ren ranks candidates by strength. Use his output to decide which refactors are worth the effort and which to defer.
- **Periodic structural audits.** Walking a feature area every few cycles surfaces structural debt before it compounds.

## How Ren works

Ren's a multi-phase persona — 8 phases per scout: init → explore → categorize → present → pick → grill → plan → continue. Each phase lives in its own step file at `.prism/skills/prism-refactor-scout/step-NN-*.md` so phases are individually replaceable.

Resumability is structural — Ren writes progress to `.prism/ren-state.json` after every phase. If you pause mid-scout, the next invocation reads the state file and offers to resume from the last completed phase. Full schema at [`.prism/skills/prism-refactor-scout/lib/state.md`](https://github.com/HunterMcGrew/PRISM/blob/main/.prism/skills/prism-refactor-scout/lib/state.md).

## The five-pass grill

What differentiates Ren from a naive "find weak code" tool:

1. **Design tree walk** — what does this code reach? What reaches it? Map the dependency and consumer trees.
2. **Challenge assumptions** — why does the abstraction exist? What changed since it was introduced?
3. **Deletion test rigor** — re-run the deletion test with full context; trace where complexity actually moves.
4. **Surface alternatives** — `collapse` / `extract` / `inline` / `move`. Pick the fit and justify.
5. **User confirmation** — present all five pass outputs; confirm or reject.

Plans Ren produces are pre-grilled — Winston picks up `## Implementation Tasks` shaped by five passes of skepticism.

## Output

- **Refactor plans** at `.prism/plans/refactor-<slug>.md` — uses the branch-plan template. `## Goal` from problem statement; `## Decisions` from grill-pass outcomes; `## Implementation Tasks` reserved for Winston.
- **State file** at `.prism/ren-state.json` — operational state for resume. Gitignored.

## Composition with the other codebase-touching personas

| Persona | Posture | Question | Output |
| --- | --- | --- | --- |
| **Atlas** | One-shot configurator | "What stack and team is this?" | `.ai-skills/config.json`, per-team rules |
| **Theo** | Proactive walker, cartographic | "What's load-bearing here?" | Architect docs + paired dev docs |
| **Ren** | Proactive walker, evaluative | "What's structurally weak here?" | Refactor plans |
| **Winston** | Reactive evaluator | "Is this approach right?" | Plan evaluations, decisions |

Theo and Ren walk the same codebase with opposite lenses. Atlas configures; Winston evaluates proposed approaches. The four are orthogonal.

## See also

- [ADR-0042 — Ren as the refactor scout persona](https://github.com/HunterMcGrew/PRISM/blob/main/.prism/spec/adrs/_toolkit/0042-ren-refactor-scout.md)
- [`.prism/skills/prism-refactor-scout/lib/state.md`](https://github.com/HunterMcGrew/PRISM/blob/main/.prism/skills/prism-refactor-scout/lib/state.md) — state schema and protocol
- [`docs/content/dev/ai-skills/theo.md`](./theo.md) — Theo's complementary persona
