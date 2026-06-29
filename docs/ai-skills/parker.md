---
title: "Parker — the PRD persona"
description: "How Parker drafts initiative-grain Product Requirements Documents — two modes, stakes-calibrated, with a parallel reviewer rubric."
category: "ai-skills"
audience: "dev"
last_updated: "2026-06-27"
---

## What Parker does

Parker writes Product Requirements Documents at initiative grain — above Mira on the product-thinking ladder. Two modes:

- **Greenfield** — new initiative, no code exists yet. Parker runs a brain-dump → stakes calibration → fast or coaching path → draft → reviewer rubric → finalize. Optional Linear initiative handoff at the end.
- **Brownfield** — feature exists; PRD doesn't. Parker walks the named code area, confirms the module sketch and test scope with you, and synthesizes a PRD using `[INFERRED]` markers for any claim that can't be observed directly from the code.

The output is `.prism/prds/<slug>.md` (always) plus `.prism/prds/<slug>.decision-log.md` (greenfield + internal/launch stakes).

## When to use Parker

- **Before Mira.** When you're about to ask Mira to write user stories but you realize you don't have a PRD to decompose from. Parker first, Mira second.
- **Before Winston.** When you're about to ask Winston to plan an initiative but the scope is fuzzy. The PRD pins the scope; Winston plans against it.
- **Documenting an existing feature.** Brownfield mode catches the gap where features ship without a PRD and the absence makes onboarding, scope debates, and rewrites harder.

## How Parker works

Multi-phase, resumable. State lives in the PRD's YAML frontmatter — no separate state file. Each phase is its own step file at `.prism/skills/prism-prd/step-*.md` so phases are individually replaceable.

**Greenfield flow:** init → stakes calibration → fast/coaching mode → draft → decision log (if stakes ≥ internal) → review → finalize → optional Linear handoff.

**Brownfield flow:** init → explore → sketch confirmation → test scope → draft → review → finalize → optional Linear handoff.

## Stakes calibration

| Level | Review rubric | Open questions | Decision log | Linear handoff |
| --- | --- | --- | --- | --- |
| **hobby** | Skip | None required | Skip | Skip |
| **internal** | Run | Encouraged | Optional | Offered |
| **launch** | Run + escalate | Required | Mandatory | Encouraged |

Parker asks the calibration interview once at the top of every greenfield run. Brownfield infers stakes from the named code area (production code = internal/launch; sandbox/experiment = hobby).

## The reviewer rubric

Three parallel rubric subagents in step-06:

- **Product fit** — problem clarity, target-user specificity, success-metric measurability, scope coherence, JTBD alignment.
- **Technical feasibility framing** — does the PRD surface the feasibility questions Winston will need to answer? Constraints articulated? Dependencies named? (Not evaluating feasibility itself — that's Winston.)
- **Clarity** — ambiguity red flags (cites Nora's list), `[ASSUMPTION]`/`[INFERRED]` discipline, section completeness, internal consistency.

Findings synthesize into a triage table; user picks `fix` / `accept` / `override` per finding. Critical findings must be fixed or overridden before finalize.

## `[ASSUMPTION]` vs `[INFERRED]`

Load-bearing distinction:

- **`[ASSUMPTION]`** — greenfield only. Parker deferred an unknown because the brain dump didn't cover it. The user knows; the PRD didn't capture it.
- **`[INFERRED]`** — brownfield only. Parker inferred from existing code. The truth lives in the user's head and the code; the inferred guess needs validation.

Both get numbered inline AND enumerated in `## Open questions` so nothing slips silently.

## Composition with other personas

| Persona | Grain | Direction | Output |
| --- | --- | --- | --- |
| **Parker** | Initiative | Product → engineering | PRD + optional decision log |
| **Mira** | User story | Initiative → tickets | User stories with AC hints |
| **Nora** | Ticket | Story → Linear | Linear ticket + branch |
| **Winston** | Implementation | Ticket → plan | Branch plan + implementation tasks |

Parker → Mira → Nora → Winston is the typical product-to-engineering descent. Each persona owns one rung; cross-grain work is a handoff, not a mode-switch.

## See also

- [ADR-0043 — Parker as the PRD persona](https://github.com/HunterMcGrew/PRISM/blob/main/.prism/spec/adrs/_toolkit/0043-parker-prd-persona.md)
- [`.prism/references/stakes-calibration.md`](https://github.com/HunterMcGrew/PRISM/blob/main/.prism/references/stakes-calibration.md) — the three-level table
- [`.prism/references/micro-file-step-machine.md`](https://github.com/HunterMcGrew/PRISM/blob/main/.prism/references/micro-file-step-machine.md) — step-machine pattern
- [Theo's paired dev doc](./theo.md), [Ren's paired dev doc](./ren.md) — sibling personas using the same step-machine pattern
