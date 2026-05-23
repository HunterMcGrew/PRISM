---
Number: 0033
Title: Implementation Task Detail Bar
Status: accepted
Date: 2026-05-03
---

## Context

PRISM's value prop rests on cross-LLM portability — a plan written by one model should be executable by another model at any effort level (Sonnet, low-effort Opus, ChatGPT-5, Cursor's built-in agent). The shape of an implementation-driving artifact determines whether that promise holds. A plan that says "update the config" gets one answer from a fast model and a different answer from a slow one; a plan that says "edit `.ai-skills/config.schema.json:100` — drop `(10 universal rules ship with PRISM)` from the `rules.universal` description per writing-voice § Count rules, not numbers" gets the same answer from every model.

The latent model already exists in the dogfood — foundation-era tasks hit this bar implicitly, naming files, line numbers, exact text replacements, and verification commands. The pattern works. But it isn't codified anywhere, which means the next planner has to reinvent it, and the next reviewer has no standard to flag against.

Two artifact classes drive implementation:

- **Winston's `## Implementation Tasks`** in branch plans — the procedural instructions Clove executes against.
- **Pixel's mode 2 saved mock specs** at `.claude/design/mocks/<slug>.md` — the design instructions Clove (via Winston's tasks) implements against.

Both artifacts are read by an implementer who may be Sonnet on a fast pass, low-effort Opus, or any future model. Both need to meet a bar that eliminates judgment calls on what file, what change, what verification.

Three approaches were considered:

- **(a) Skill-level guidance only — no rule.** Add a paragraph to Winston's and Pixel's skill sources describing the bar. Rejected: gets diluted on every skill rewrite, and there's no central place reviewers can cite when flagging an under-specified task.
- **(b) Rule but no concrete examples.** Author the rule abstractly. Rejected: an abstract bar is the same as no bar — people read it, agree with it, and then write under-specified tasks anyway because they don't have a model to compare against.
- **(c) Apply the bar uniformly across all Pixel artifacts including HTML mocks and mode 1 sketches.** Rejected: mode 1 is conversational by design (riffing in chat), and mode 3 is a visual preview, not a spec. Holding either to the spec-class bar defeats their purpose.

## Decision

Implementation-driving artifacts must hit a detail bar that eliminates judgment calls on what file to touch, what specific change to make, and how to verify. The principle: **front-load every decision; do not front-load every keystroke.**

Two artifact classes are covered: Winston's `## Implementation Tasks` and Pixel's mode 2 mock specs. Two artifact classes are explicitly exempt: Pixel's mode 1 inline sketches and mode 3 HTML mockups.

The bar is codified at `.prism/rules/implementation-task-detail.md`, which opens with applicability declaration per [ADR-0029](./0029-rules-self-declare-applicability.md), names Winston and Pixel in a "Who runs this rule" section, and includes concrete good-task and bad-task examples drawn from PRISM's foundation-era plans.

Tasks or specs that fail the bar are at minimum **Major** in self-review and PR review. The blast radius is wider than a typical correctness issue — every implementer downstream makes the same judgment call against the same gap, and the divergences compound.

## Consequences

- **Positive:** Cross-LLM execution becomes more deterministic. Two LLMs running the same task produce more similar outputs. Review-cycle volume drops because under-specification is caught at planning time, not implementation time.
- **Positive:** The bar exists in one durable place. Future maintainers don't have to derive it from looking at past plans; they can read the rule and the examples directly.
- **Positive:** Reviewers (Briar, Eric) have a concrete standard to flag against. "This task is under-specified" becomes "this task fails the detail bar in `implementation-task-detail.md` — Major."
- **Negative:** Planning sessions get longer. Winston now spends more time on each task; Pixel's mode 2 specs grow longer. The cost is paid on every UI ticket.
- **Negative:** Plans become more brittle when files move between planning and implementation. A task that names `path/to/file.ts:42` is wrong if a refactor between planning and Clove's execution moves line 42. Mitigation: prefer section headings over line numbers when the file is actively being edited; recheck file paths during the post-Pixel plan-mode-only pass when applicable.
- **Neutral:** The bar describes a pattern that already exists in the dogfood. Codifying it doesn't create new behavior — it documents and enforces what's already working in the team's best plans.

## References

- `.prism/rules/implementation-task-detail.md` — the rule itself, with the bar, the artifact-class scope, and good/bad examples.
- [ADR-0029](./0029-rules-self-declare-applicability.md) — sibling decision: rules self-declare their applicability and bind personas in a "Who runs this rule" section. The new rule follows that pattern.
- [ADR-0034](./0034-pixel-always-routes-through-winston.md) — sibling decision: Pixel always routes mode 2 specs through Winston, which makes the always-Winston-tasks invariant possible.
