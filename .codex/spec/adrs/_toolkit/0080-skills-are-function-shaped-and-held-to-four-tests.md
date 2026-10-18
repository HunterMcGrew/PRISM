---
Number: 0080
Title: Skills Are Function-Shaped and Held to Four Tests
Status: accepted
Date: 2026-10-17
Supersedes: 0045
---

## Context

[ADR-0045](./0045-skill-content-disclosure-model.md) let a skill keep a large body by moving content into references. Its gate sorted each section into pin, externalize, catalog, or cut. It always pinned the persona's voice and its "How X Thinks" lens, on the theory that a lens shapes reasoning and has to be present when a run starts.

The phase-1 baseline for the AI-native SDLC (PRISM-499, `.prism/plans/prism-499/plan.md` § Baseline) measured the result. Only one skill loaded fewer than 120 lines. Most loaded hundreds of lines, and the largest loaded 1,251. Most of that text was persona voice, engineering method a frontier model already applies, or pointers to rules every session already holds. An earlier audit of three of the same personas, in a repository that shares their origin, found about 50 of 1,040 lines that existed nowhere else and that the model would not apply unprompted. Externalizing content had moved the cost into references without cutting it, because a run that is told to read a reference pays for it anyway.

The approved PRISM-499 intent (`.prism/plans/prism-499/intent.md` § Skills) decides the replacement:

- Every skill passes four tests: policy, trigger, length, and enforcement.
- Content that fails a test is cut, not moved, because the cap measures what a run reads.
- Skills are function-shaped, with a verb name and no personality. Persona names stay only as trigger words.

## Decision

**A skill is a function a session runs, held to four tests, and content that fails a test is cut.**

- **Policy.** The skill encodes policy the model would not apply unprompted: PRISM's own formats, gates, lanes, and ownership. Generic method, voice, and restatements of rules the session already holds fail the test.
- **Trigger.** The `description` fires the skill reliably. It names what the skill does, when to use it, and the old persona name as a trigger word, so a request by name still routes.
- **Length.** The body plus everything it tells a run to read fits in 120 lines. `scripts/ai-skills/skill-loaded-lines.test.ts` measures it, so the cap is a check rather than a guideline.
- **Enforcement.** Anything that must always hold is enforced by a hook or a check, not by prose in a skill body.
- **Names.** A skill ID is a verb with the `prism-` prefix, such as `prism-self-review`. `prism update` rewrites only `prism-*` skills, so bare verbs would collide with a consumer's own skills. `tdd` is the one exception, because the approved intent keeps its bare name.

Alternatives considered:

- **Keep ADR-0045 and tighten its gate.** Rejected. Its externalize bucket is what let the loaded total grow while bodies looked lean. Any rule that lets content move without cutting it keeps that path open.
- **Keep persona voice as a thin opening line.** Rejected. Voice is the one section every run pays for and no test passes. A name in the description keeps routing by name, which is the only thing voice was doing for the user.

## Consequences

- **Positive:** a skill run reads only what it needs, and the cap holds by check.
- **Positive:** a renamed skill still routes by its old persona name.
- **Negative:** persona voice and continuity in conversation are gone. A user who liked talking to "Briar" now talks to `prism-self-review`, which answers in the session's own voice.
- **Negative:** the "How X Thinks" lenses are cut. Where one carried a judgment the model would not make unprompted, the judgment has to survive as a plain policy line or be lost. The lane PRs that thin each skill make that call one skill at a time, and a reviewer can only check it by reading what was cut.
- **Negative:** three skills stay over the cap until their replacements land: the plan writer, the user-story writer, and the review loop. The check allowlists them by name.
- **Neutral:** utility skills ([ADR-0046](./0046-persona-vs-utility-skill-type.md)) keep their type. With voice gone from personas, the difference between the two types now shows only in routing and in agent-adapter generation.

## References

- `.prism/plans/prism-499/intent.md` § Skills
- `.prism/plans/prism-499/plan.md` § Baseline and Decision: The loaded-lines check measures the transitive closure, including bare step names
- [ADR-0045](./0045-skill-content-disclosure-model.md), superseded
- [ADR-0046](./0046-persona-vs-utility-skill-type.md)
- `.prism/rules/skill-authoring.md`
