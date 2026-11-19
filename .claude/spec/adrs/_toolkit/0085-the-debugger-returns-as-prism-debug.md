---
Number: 0085
Title: The Debugger Returns as prism-debug
Status: accepted
Date: 2026-11-19
---

## Context

[ADR-0079](./0079-debugger-refactor-scout-and-doc-walker-are-retired.md) retired Sasha with no replacement and moved diagnosis to the implementer. Its own Negative consequence says nothing measured whether unstructured diagnosis finds root causes as reliably.

The amended PRISM-499 intent (2026-11-17) brings Sasha back as `prism-debug`: she diagnoses, changes no source, and her report becomes the Problem section of an intent. thrive's debugger (`thrive-debugger/shared.md` under its `.ai-skills/skills`) shows the policy fits the cap: a feedback loop before hypotheses, ranked hypotheses shown before testing, tagged temporary logging with a cleanup grep, and a report shaped for the intent stage.

ADR-0079 rejected a slimmed debugger because a model already applies the method unprompted. The skill earns its place on the policy a model would not apply on its own: it changes no file except a lessons entry, tags its temporary logging `[DEBUG-<hash>]` and greps it out twice before closing, checks `git status -s` against a startup snapshot so the person's own uncommitted edits are never touched, and hands its report to a named next stage.

## Decision

`prism-debug` is a persona skill named Sasha, ported from thrive's debugger and trimmed to the 120-line cap with no allowlist entry. It changes no file except a lessons entry. It tags its temporary logging `[DEBUG-<hash>]` and removes it, with the cleanup grep run twice. It hands the diagnosis to `prism-intent`, or to `prism-implement` inside a ticket whose intent is already approved. The broken-behavior phrases in `.prism/rules/skill-routing.md` move from `prism-implement` to it.

This supersedes ADR-0079 for the debugger only. Theo and Ren stay retired, `## Debugged Issues` stays a section any implementer may write, and Clove still confirms a known root cause before fixing it.

Alternatives that lost:

- **Keep diagnosis in the implementer, as ADR-0079 decided.** Rejected by the amended intent: a skill that edits source cannot also promise to change none.
- **A diagnosis mode inside `prism-implement`.** Rejected because that skill's lane is building, and the no-change promise would hold for one mode of a skill that otherwise writes code.

## Consequences

- Positive: a bug with an unknown cause gets a loop, ranked hypotheses, and a graded root cause before anyone writes a fix.
- Negative: "changes no file" is prose. No hook stops a debug run from editing source, and the cleanup grep is the model's to run.
- Negative: a bug that goes through Sasha takes the full chain (intent, spec, plan) before the fix, unless the ticket's intent is already approved, where her report goes straight to the build, which is longer than the Bug workflow's direct route to Clove.
- Neutral: "Sasha" routes again, so the persona name ADR-0079 left with no skill has one.

## References

- [ADR-0079](./0079-debugger-refactor-scout-and-doc-walker-are-retired.md), the decision this partly supersedes
- [ADR-0084](./0084-persona-skills-carry-a-short-voice.md), the Voice block Sasha carries
- `.ai-skills/skills/prism-debug/shared.md`
- `thrive-debugger/shared.md` in thrive's `.ai-skills/skills`, the debugger this skill is ported from
- `.prism/rules/skill-routing.md`
- `.prism/architect/_toolkit/ticket-workflows.md`
- `.prism/plans/prism-499/spec.md`
