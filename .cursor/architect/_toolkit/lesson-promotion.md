# Lesson Promotion

How a lesson in `.prism/lessons.md` graduates to a durable home, and who decides. Zoe's archiving of stale lessons is [`audit-workflow.md`](./audit-workflow.md) § Archive classification.

---

## Lessons

Skills surface lessons during a session by appending to `.prism/lessons.md`. The append is cheap and unblocking — any persona that hits a moment worth recording writes it there. Promotion is the separate step that converts a lesson into a durable surface.

### Lesson promotion taxonomy

When a lesson moves from `.prism/lessons.md` to a durable home, it routes by type:

- **Process lessons** → `.prism/rules/<name>.md`. Operational patterns, workflow constraints, how-to-do-things-right. Loaded per the rule's `load:` declaration: every session, by matching `paths:`, or by the skills that cite it.
- **Architectural lessons** → the `.prism/architect/` doc that owns the subject, picked per `.prism/architect/guides/writing-an-architect-doc.md` § Where new content goes. Coupling, data flow, abstraction decisions, codebase shape. Loaded via manifest routing into the skills that work on the topic.
- **Decision-class lessons** → new ADR in `.prism/spec/adrs/`. When a lesson reflects a one-shot decision the team needs to remember why it made — alternatives considered, what got rejected, why the chosen path won. ADRs explain reasoning; rules and architect docs encode behavior.
- **Ephemeral lessons** → stay in `.prism/lessons.md` until they trip a second incident. One-time gotchas, environment-specific footguns, situational tactics. Promotion is triggered by recurrence, not by speculation about future value.

Promotion happens via Winston during plan close — the lessons accumulated during a ticket are reviewed and classified before the plan is marked closed; plans are preserved at close, never deleted. Routine personas surface candidates by appending to `lessons.md`; the routing decision is Winston's.
