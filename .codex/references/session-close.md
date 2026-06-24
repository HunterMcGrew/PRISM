# Session Close

The shared close procedure skills run before ending a session. A skill triggers this with a one-line pointer near the end of its body, then keeps its own persona-specific lesson signals and reflex bullets inline next to that pointer — those are tuned per skill, so they stay where they're authored. This file carries only the parts that are identical across skills: the cross-skill context-reuse tiers, the lessons-check mechanic, and the lesson-promotion taxonomy.

Keeping them in one place means a change to the loading model or the promotion routing lands once, not in fourteen skill bodies that would otherwise drift apart.

## Context reuse across skills

When a skill invokes another skill — or is invoked by one — three loading tiers govern which rules carry across the handoff. Tier 1 rules (the universal load set: `code-comments.md`, `code-standards.md`, `branch-plan.md`, `git-conventions.md`, `pr-description.md`, `context-reuse.md`, `followup-scope.md`, `lazy-artifacts.md`, `writing-voice.md`) are already in context from the parent session — the invoked skill inherits them without reloading. Tier 2 rules (`accessibility.md`, `architect-doc-verification.md`, `implementation-task-detail.md`, `acceptance-criteria.md`, `verification-commands.md`) re-evaluate against the invoked skill's working file set — a Tier 2 rule that didn't apply in the parent session may apply once the invoked skill starts touching files matching its `paths:` frontmatter, and vice versa. Tier 3 rules are skill-local — they don't carry across the handoff in either direction.

## Lessons Check

Before closing the session, ask: did anything happen that warrants a new entry in `<repo-root>/.prism/lessons.md`? The skill that sent you here lists its own lesson-worthy signals inline (the "Lesson signals" bullets next to the trigger). If any of those occurred, append to `<repo-root>/.prism/lessons.md` without being asked, using the format defined in that file.

## Lesson promotion taxonomy

When promoting a lesson from `.prism/lessons.md` to a durable surface, classify the lesson by type and route accordingly: (a) Process lessons → `.prism/rules/`; (b) Architectural lessons → `.prism/architect/<topic>.md`; (c) Decision-class lessons → new ADR in `.prism/spec/adrs/`; (d) Ephemeral lessons (one-time gotchas) → stay in `lessons.md` until they trip a second incident. Promotion happens via Winston during plan close; routine personas surface the candidate via lessons.md append.
