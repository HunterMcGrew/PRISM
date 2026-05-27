---
Number: 0045
Title: Skill Content Disclosure Model
Status: accepted
Date: 2026-05-26
---

## Context

PRISM skills accreted through iterative patching — each "add a Lessons Check," "make the DoD include X," "inline the framework catalog" felt small at the time. The result: 9 of 18 skills sat at or over the skill-creator guide's 500-line soft cap, with `prism-design` at 703.

Skill content loads at three **levels** (the disclosure model's term — deliberately *not* "tier," which [ADR-0035](./0035-rule-loading-tiers.md) already owns for rule loading across handoffs):

1. **Frontmatter** (`name` + `description`) — loaded every session for every installed skill. Permanent cost.
2. **Skill body** (the generated `SKILL.md` = `shared.md` + the platform file) — loaded every time the skill triggers, and stays in context for the rest of the conversation.
3. **References** — separate files the body points to. Free until the body instructs the agent to read them.

The failure mode is attention dilution, not token cost alone. A 200-line skill with five sharp rules treats them as load-bearing because they're the whole document. A 700-line skill with the same five rules plus thirty nice-to-haves flattens the importance hierarchy — critical rules compete with nice-to-haves for attention and get followed less reliably, and not predictably less. Opus 4.7's instruction-hierarchy sensitivity amplifies this: more competing signals to weight, less reliable weighting.

The phase-machine personas (`prism-refactor-scout`/Ren, `prism-doc-walker`/Theo, `prism-retro`/Iris, `prism-prd`/Parker) already externalize their per-phase procedure into step files and stay lean (83–161 lines). The large judgment-and-procedure skills did not — they inlined modes, command bodies, and reference catalogs the model already holds from training.

Two alternatives were considered and rejected:

- **(a) A uniform line cap enforced in CI (`wc -l`).** Rejected: it optimizes the measurable thing (lines) at the expense of the real thing (instruction adherence). The phase-machine-vs-cross-cutting evidence shows lines and adherence don't move together — a uniform cap would pressure authors to externalize load-bearing lenses to hit a number, which is the exact harm this ADR prevents.
- **(b) Do nothing.** Rejected: adherence degrades as skills grow, and the cross-skill duplication (session-close boilerplate in all 18; review frameworks in both review skills) keeps drifting.

## Decision

Every skill section is sorted by **load-frequency × trigger-determinism** into one of four dispositions:

- **PIN** — stays in the skill body. The section fires every run *and* is voice, the "How X Thinks" lens / cognitive approach, an anti-pattern guardrail, the workflow router (startup + the at-a-glance phase/mode index), or the Definition of Done. If a section must shape reasoning *throughout* the run, it is a **lens** and it stays — regardless of length. A reference that loads mid-run arrives after reasoning has already started; a lens has to be present when reasoning begins.
- **EXTERNALIZE** — the body moves to a reference; an inline trigger stays. Permitted **only if you can write a one-line imperative trigger that names the exact file and the exact condition** ("When the user asks to plan, read `…/plan-mode.md` and follow it"). If you can't write that trigger — if the honest trigger is "keep this in mind throughout" — it's a lens, not a reference. Whole modes, conditional procedures, and command/template bodies are the candidates.
- **CATALOG** — model-resident reference knowledge (named frameworks, heuristics, laws) or verbatim templates. Moves freely to a reference; the body cites by name. This only enforces consistency and citation-by-name — the model already holds the content.
- **CUT** — fails the deletion test (restates a pinned lens, or is dead weight from a one-off patch). Removal is a separate, signed-off decision, never bundled silently into relocation.

Supporting invariants:

- **The vague-pointer failure mode is the thing the gate prevents.** "See the references for design principles" leaves the agent guessing whether to load — most often it never does and wings it from training. Every externalization trigger is imperative and names its file and condition.
- **Tripwire nuance.** When a trigger is detective/implicit ("you're about to overwrite X," "scope changed"), the *detection* stays inline; only the procedure body moves. You cannot externalize a detection condition — the skill would never know to load the file.
- **Atlas-anchor hard rule.** `scripts/ai-skills/lib/anchor-substitute.ts` substitutes `<!-- atlas:* -->` anchors only in skill-source files (`shared.md`, `claude.md`, `codex.md`, `cursor.md`); references are never scanned. An anchor moved into a reference would never be populated. Never move an anchor into a reference — split the section so the anchor stays pinned.
- **Reference home.** Skill-specific references live at `.prism/references/<skill>/<topic>.md`; genuinely shared cross-skill references live at `.prism/references/` top-level. The build mirrors `.prism/references/` (sub-dirs included) into each platform's `references/`. Triggers link the canonical `../../../.prism/references/<skill>/<topic>.md`.
- **Wrap a lens in a step when a judgment must fire every run.** A lens that's present but not placed fires only when the run's reasoning path happens to reach it. To make a judgment reliable, give it a deterministic placement — a gate, a forcing question, a DoD item — rather than hoping the path lands there. Winston's premise gate is the precedent: "how to think," delivered as "when to think it."

The operational, author-facing form of this decision lives in [`.prism/rules/skill-authoring.md`](../../rules/skill-authoring.md).

## Consequences

- **Positive:** Leaner bodies reduce attention dilution, so load-bearing rules get followed more reliably. References cost nothing until consulted. Consolidating duplicated content (session-close boilerplate, shared review frameworks) into single sources kills the drift that duplication invites.
- **Positive (counterintuitive):** Line counts are deliberately *non-uniform*. Judgment-heavy skills (the reviewers, the debugger, the architect) stay larger because their lenses PIN. A skill landing at 400 lines of mostly-lens is correct; a skill padded to 250 by externalizing a lens is wrong. The gate, not the line count, is the standard.
- **Negative:** Indirection has a cost — a reference that fails to load means the agent wings it from training. The imperative-trigger requirement is the mitigation; a section that can't earn a deterministic trigger doesn't externalize.
- **Negative:** Discipline is required at authoring time. Every new section is a PIN-vs-externalize decision, and every new pin re-adds dilution. The standard is saying no to the next pin, not maximizing pins.
- **Negative (portability):** Lens-heavy "how to think" content assumes a capable model — a weaker model executes procedural steps fine but can't always *use* a reasoning lens. This sits in tension with the cross-LLM portability promise of [ADR-0033](./0033-implementation-task-detail.md). Tracked as a separate consideration, not resolved here.
- **Neutral:** The phase-machine personas already embody the model; this ADR generalizes it across the roster. `prism-architect` was refactored first as the pilot.

## References

- [ADR-0035](./0035-rule-loading-tiers.md) — the rule-loading taxonomy. Owns "tier"; this ADR uses "level"/"stage" for content disclosure to avoid colliding the two vocabularies.
- [ADR-0033](./0033-implementation-task-detail.md) — cross-LLM portability, the tension the portability consequence names.
- [`.prism/rules/skill-authoring.md`](../../rules/skill-authoring.md) — the author-facing rule that operationalizes this ADR.
- [`.prism/rules/lazy-artifacts.md`](../../rules/lazy-artifacts.md) — related: references are created on first write, never seeded empty.
- `prism-architect` (`.ai-skills/skills/prism-architect/shared.md` + `.prism/references/architect/`) — the worked precedent: voice/lens/router/DoD pinned, modes externalized behind triggers.
