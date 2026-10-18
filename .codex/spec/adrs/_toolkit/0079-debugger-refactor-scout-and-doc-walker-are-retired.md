---
Number: 0079
Title: The Debugger, Refactor Scout, and Doc Walker Are Retired
Status: accepted
Date: 2026-10-17
Supersedes: 0041, 0042
---

## Context

Three personas each owned one analysis workflow that sat outside the ticket flow's core path:

- Sasha (`prism-debugger`) diagnosed bugs. She climbed a 10-rung feedback-loop ladder, required three to five ranked falsifiable hypotheses before any diagnostic command, and enforced `[DEBUG-<hash>]` instrumentation hygiene with a grep cleanup gate before she exited. She wrote `## Debugged Issues` in the plan.
- Theo (`prism-doc-walker`, [ADR-0041](./0041-theo-architect-doc-walker.md)) walked a directory, applied the Deletion Test, and drafted architect docs through an 8-phase step machine with state in `.prism/theo-state.json`. His second job, keeping paired dev docs in sync, ended when [ADR-0058](./0058-single-audience-retires-paired-dev-docs.md) retired paired dev docs.
- Ren (`prism-refactor-scout`, [ADR-0042](./0042-ren-refactor-scout.md)) walked the codebase, ranked refactor candidates, ran a five-pass grill on the chosen one, and wrote `.prism/plans/refactor-<slug>.md` through an 8-phase step machine with state in `.prism/ren-state.json`.

The AI-native SDLC intent (PRISM-499, approved 2026-10-17) holds every skill to four tests: it encodes policy the model would not apply unprompted, its description fires it reliably, its body fits in 120 lines, and anything that must always hold is enforced by a hook or check. The intent's audit found that most persona-skill text was voice, generic engineering method, or pointers. The phase-1 baseline measured the three at 881, 964, and 448 loaded lines, against a cap of 120.

The intent also separates deletions by what they wait on. A skill is deleted only once its replacement exists, but "Sol, Sasha, Ren, and Theo have no replacement to wait for, so they go in the first phase." Nothing in the planned chain (`intent`, `spec`, `plan`, `implement`, `verify`, the review runners, `retro`) takes over diagnosis, doc discovery, or refactor scouting as a named job.

## Decision

**The three personas are retired with no replacement.**

- Diagnosis moves to the implementer. In the bug workflow Nora verifies the bug and scaffolds the report, then Clove confirms the root cause against the code before fixing it. `## Debugged Issues` stays a plan section, and any implementer may write it.
- Architect-doc discovery and refactor scouting have no named owner. Winston still plans against the docs that exist, and plan close still promotes lasting Decisions into the doc that owns the subject.

Alternatives considered:

- **Keep Sasha as a slimmed debugger.** Rejected. Ranked hypotheses and instrumentation cleanup are method a frontier model already applies when asked. A 120-line version would carry mostly that method and little policy.
- **Fold a diagnosis mode into the implement skill.** Rejected for this PR. The workflow docs now name Clove as the diagnosing persona, but no skill text is added. The later rewrite of the implement skill decides whether the step needs a line.
- **Keep Theo and Ren as named-only skills until a later phase.** Rejected. No phase replaces either one. They would keep shipping to every consumer, count against the loaded-lines check, and carry state schemas and step trees nothing else uses.

[ADR-0041](./0041-theo-architect-doc-walker.md) and [ADR-0042](./0042-ren-refactor-scout.md) describe the retired personas wholesale and are superseded. [ADR-0014](./0014-plan-section-ownership.md), [ADR-0036](./0036-security-as-distributed-rule.md), and [ADR-0045](./0045-skill-content-disclosure-model.md) keep their decisions and lose one persona reference each, so they carry an amendment note instead.

## Consequences

- **Positive:** Three fewer skills, two fewer step-machine trees, a debugger reference directory, and three state-file conventions. Each skill removed is one fewer body for the loaded-lines check to measure and for a consumer to receive.
- **Negative:** There is no dedicated hypothesis-ladder debugging persona. The ranked-hypotheses requirement, the feedback-loop ladder, and the instrumentation cleanup gate are no longer enforced by anything. Clove diagnoses by the model's own method unless the user asks for more structure. Nobody measured whether unstructured diagnosis finds root causes as reliably as Sasha did.
- **Negative:** There is no automated architect-doc discovery. An undocumented pattern in code surfaces only when a person or Winston notices it. The retro's promotion step covers Decisions that already exist in a plan, not patterns nobody recorded.
- **Negative:** There is no refactor ranking. Refactor candidates surface through review findings and the follow-up scope rule, with no scored list and no grilled plan to act on.
- **Negative:** A consumer who invokes "Sasha", "Theo", or "Ren" gets no skill. Renamed skills keep their old persona name as a trigger word, and these three have no successor to carry it. `prism update` removes their skill directories. PRISM no longer reads or writes `.prism/theo-state.json`, `.prism/ren-state.json`, or `.prism/sasha-state.json`, and a consumer can delete any that exist.
- **Neutral:** The `documentation.keepsDevDocs` config key stays. Its description no longer names the doc walker's steps.
- **Neutral:** Historical ADRs, closed plans, and retros that mention the three personas are left as written.

## References

- `.prism/plans/prism-499/intent.md` § Order of work and § Skills
- `.prism/plans/prism-499/plan.md` § Implementation Tasks, PR 4
- [ADR-0041](./0041-theo-architect-doc-walker.md) and [ADR-0042](./0042-ren-refactor-scout.md), the decisions this one supersedes
- [ADR-0058](./0058-single-audience-retires-paired-dev-docs.md), which had already ended Theo's pairing duty
- `.prism/architect/_toolkit/ticket-workflows.md` § Bug and § Bug Report Lifecycle
