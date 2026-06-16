---
title: "Iris — the retrospective persona"
description: "How Iris synthesizes multi-voice retros from plan evidence — only personas that touched the work speak, and disagreements come from divergences the evidence already captured."
category: "ai-skills"
audience: "dev"
last_updated: "2026-05-23"
---

## What Iris does

Iris facilitates retrospectives on shipped work. She reads the target plan's `## History`, `## Decisions`, `## Debugged Issues`, and `## Review Issues`, identifies which PRISM personas actually touched the work, and synthesizes a multi-voice dialogue grounded in that evidence. Disagreements are evidence-based — when a `## Decisions` entry's rationale didn't hold up against later `## Debugged Issues`, Iris surfaces that divergence rather than papering over it.

Iris is the third cadence-driven persona, joining Zoe (audit) and Atlas (onboarding). She runs on explicit invocation only — no cadence-driven auto-trigger, no place in the ticket-flow handoff chain.

## When to bring in Iris

- **End of an epic.** When a multi-PR epic ships, Iris produces a retro that names what worked, what didn't, and which Decisions the team should rethink before the next epic in the same area.
- **Post-incident.** When a bug surfaced that a Decision had explicitly ruled out, Iris re-litigates the Decision against the Debugged Issues that produced the incident.
- **Date-range retros.** When you want a cross-cutting view across multiple plans (e.g. "all bug fixes in March"), Iris accepts a date range and walks every plan whose `## History` entries fall inside it.

Don't invoke Iris on a single-PR plan — there's rarely enough evidence for multi-voice synthesis. Single-PR retrospection lives in the PR review itself.

## How Iris works

Iris uses the [micro-file step machine pattern (full variant)](https://github.com/HunterMcGrew/PRISM/blob/main/.prism/references/micro-file-step-machine.md) — per-step files plus a single state file at `.prism/iris-state.json`. Six steps, each feeding the next:

1. **Detect target** — epic-plan (primary, by slug) or date-range (fallback).
2. **Gather evidence** — categorize `## History`, `## Decisions`, `## Debugged Issues`, `## Review Issues` from every plan in scope. Cross-reference Decisions against Debugged Issues to flag divergences.
3. **Stage voices** — identify which personas actually touched the work from `## History` annotations, `## Implementation Tasks` persona headings, and ownership signals in the debugged/review entries. Only those personas speak.
4. **Facilitate** — generate the multi-voice dialogue body. Every line cites the evidence it responds to. Divergences flagged in step 2 produce explicit disagreement lines.
5. **Action items** — synthesize `## Action Items` with proposed owners from the staged voices. Offer the Nora handoff.
6. **Save report** — write the assembled report to `.prism/retros/<YYYY-MM-DD>-<epic-slug-or-date-range>.md`. Read-only on the source plan.

Resumability follows the standard step-machine pattern — Iris writes state after each step, so a paused session resumes from the last completed step.

## Example output

A short illustrative excerpt from a retro on a hypothetical epic that absorbed Pocock's diagnostic patterns into Sasha:

```markdown
# Retro — epic-prism-pattern-absorptions-wave-2

**Target:** `.prism/plans/epic-prism-pattern-absorptions-wave-2.md`
**Generated:** 2026-05-23
**Voices:** Winston, Clove, Briar, Sasha

## Multi-voice dialogue

Winston (senior architect): "We chose the six-phase frame for Sasha over a strict
Pocock port because the diagnose-only boundary needed to stay intact. Phase 5
became design-only by intention, not by accident."

Clove (implementation engineer): "Phase 5 was clean to implement, but the
state-file schema took two passes — the hypothesis-state field shape wasn't
obvious from Pocock's writeup alone. That's the kind of thing the next
Pocock-adoption plan should call out upfront."

Sasha (debugger): "The 'no correct seam' format for `Suggested tests:` started
paying dividends inside one PR. Pocock's wording was right — adopting it
verbatim worked."

Briar (self-review): "Self-review caught one regression: the case-file resume
flow didn't handle the `aborted` status cleanly. That was a divergence from
the lighter-variant pattern doc — worth a follow-up rule."

## Action Items

- [ ] Document hypothesis-state field shape in the lighter-variant pattern doc — proposed owner: Winston
- [ ] Add a regression test for `aborted` status in Sasha's resume flow — proposed owner: Clove
```

The dialogue is short on purpose. Iris isn't trying to fill pages — she's trying to surface signal the team will act on.

## Action items and Nora

Iris's `## Action Items` section is a list of proposals. At the end of step 5, Iris offers the Nora handoff:

> "Want me to hand off to Nora to file these as follow-up tickets? She'll run the scope-fit gate from `.prism/rules/followup-scope.md` on each one."

If the user accepts, they type `Nora` into the next prompt and Nora's skill picks up the action items, applying the scope-fit gate before filing each one in Linear. If the user declines, the action items stay in the retro report as a record — no tickets get filed.

The handoff is always a proposal, never an execution. Iris doesn't auto-invoke Nora; she names the natural next persona and lets the user choose.

## What Iris is not

- **Iris does not modify source plans.** The plan being retro'd is read-only. Iris writes once to a separate report file.
- **Iris does not write code.** Reports are markdown; state is JSON. No source files, tests, configs, or rules.
- **Iris does not invent dialogue.** A retro that scripts in personas absent from the evidence is fiction. Only personas with at least one evidence entry attributed to them appear in the dialogue.
- **Iris does not auto-file action items.** Nora does the filing, after the scope-fit gate, after the user explicitly invokes her.

## See also

- [`.ai-skills/skills/prism-retro/shared.md`](https://github.com/HunterMcGrew/PRISM/blob/main/.ai-skills/skills/prism-retro/shared.md) — canonical persona source
- [ADR-0037 — Cadence-driven personas](https://github.com/HunterMcGrew/PRISM/blob/main/.prism/spec/adrs/_toolkit/0037-cadence-driven-personas.md) — the axis Iris shares with Zoe and Atlas
- [`.prism/references/micro-file-step-machine.md`](https://github.com/HunterMcGrew/PRISM/blob/main/.prism/references/micro-file-step-machine.md) — the step-machine pattern
- [`.prism/rules/followup-scope.md`](https://github.com/HunterMcGrew/PRISM/blob/main/.prism/rules/followup-scope.md) — the scope-fit gate Nora applies to Iris's action items
