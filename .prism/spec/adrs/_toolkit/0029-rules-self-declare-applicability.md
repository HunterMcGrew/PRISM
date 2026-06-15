---
Number: 0029
Title: Rules Self-Declare Their Applicability; Skills Don't Reference Per-Team Rule Files
Status: accepted
Date: 2026-05-03
---

## Context

PRISM ships a static set of universal rules in `.prism/rules/` (always loaded into every conversation per Tier 2 of `.prism/SPEC.md`). Atlas (Phase 2) generates additional per-team rules during onboarding based on the team's `techStack` — `use-effect-guidelines.md` for React/Next teams, `code-standards-<language>.md` per language, etc.

Phase 1 chunk 6 dropped the language- and framework-specific rules that previously shipped statically (`use-effect-guidelines.md`, `headless-architecture.md`, `component-props-decoupling.md`, `prop-ordering.md`, `code-standards-{ts,php}.md`, `data-layer-boundaries.md`, `plugins-manifest.md`) on the basis that Atlas would generate them per-team. But the canonical skill sources still cited them by name — dangling references across `.ai-skills/skills/prism-debugger/`, `prism-code-review-pr/`, `prism-code-review-self/`, and `prism-code-dev/`. The generated `.claude/skills/<id>/SKILL.md` outputs inherited the dangling refs, so every skill running on the dogfood install pointed at files that didn't exist.

The deeper question this surfaced: how does a skill cite a per-team rule it can't statically know about — without coupling skill maintenance to the per-team rules surface, and without adding dead lines for teams that don't have a given rule?

Six approaches were considered:

- **(a) Rule discovery via taxonomy.** Skills enumerate `.prism/rules/*.md` at chat time and infer what to apply from filename patterns. Rejected: too dynamic; agents don't reliably infer that `code-standards-rust.md` is "the Rust standards, apply during code review" without an explicit taxonomy that itself becomes a maintained surface.
- **(b) Tech-stack flag branching.** Skills branch on `techStack` from `config.json` ("if `react`, look for `use-effect-guidelines.md`"). Rejected: brittle coupling. Adding a new tech-stack value forces audits across every skill that might want a corresponding rule.
- **(c) Rule manifest at `.prism/rules/manifest.json`.** Atlas writes a manifest listing per-team rules; skills read it. Rejected: extra layer that doesn't earn its keep when file presence is already the signal.
- **(d) Inline rule content into skills.** Skills carry the checklist itself instead of pointing at a rule file. Rejected: defeats the per-team value prop — the whole reason Atlas generates rules per-team is to customize them from the team's actual code patterns.
- **(e) Defer entirely to Phase 2.** Strip the references now, tackle the convention later. Rejected: leaves skills weaker today and forces a retrofit when Phase 2 lands.
- **(f) Conditional file-existence references in skills.** Skills name the per-team rules they extend with, framed as "if `<rule>.md` exists, apply it; skip if absent." Rejected after review pushback: adds dead lines for teams without that rule and couples skill maintenance to the per-team rules surface — every new conditional rule a skill might want requires a skill edit.

The pattern that already works in PRISM (and that all six options were trying to reinvent) is rule self-declaration. Existing universal rules open with an applicability statement: `accessibility.md` says "These rules apply when writing, reviewing, or architecting any UI." `code-standards.md` says "Universal standards that apply to all code in this repository." `architect-doc-verification.md` goes further with a "Who runs this rule" section that explicitly names the bound personas (Winston, Eric, Briar). The rule reaches into the skills, not the other way around. The agent reads all loaded rules as part of every action and applies them when the rule's applicability declaration matches what the agent is doing.

## Decision

Skills do not reference per-team rule files by name. Rules — universal or Atlas-generated — declare their own applicability and the agent applies them when relevant.

The dangling references in canonical skill sources are deleted with no replacement. Where the bullet containing the reference is itself a per-team-only concern (e.g. "Unnecessary useEffect — apply the full review checklist in use-effect-guidelines.md"), the whole bullet is deleted. Where the reference appears inside broader prose (e.g. inside a network-waterfall paragraph), the surrounding sentence is revised to drop the file pointer while keeping the generic guidance.

Atlas-generated rules (Phase 2) follow the existing convention: open with an applicability statement that names when the rule applies and, optionally, which personas it binds. The format mirrors `architect-doc-verification.md`'s "Who runs this rule" section when persona-specific binding matters.

## Consequences

- Positive: skills stay generic process definitions. Adding a new per-team rule does not require a skill edit — the agent picks it up automatically once the rule file is present and declares its applicability.
- Positive: no new machinery (no manifest, no discovery layer, no tech-stack flag coupling) and no dead lines in skills for rules a team doesn't have.
- Positive: works on the dogfood install today with zero tooling change. The agent already loads referenced files at chat time; rules in `.prism/rules/` are loaded as Tier 2 context unconditionally.
- Negative: skill review checklists become slightly less explicit. A reviewer running on a React codebase before Atlas has generated `use-effect-guidelines.md` will not be prompted by the skill to check for unnecessary useEffect. The agent may still catch the issue from training data, but the cue is weaker until Atlas runs.
- Neutral: this convention extends naturally to architect docs and other artifacts where existence-of-file is the signal. If a skill later wants to cite a per-team architect doc, the same pattern applies — the architect doc declares its applicability and the agent loads it when relevant.

## References

- `.prism/rules/architect-doc-verification.md` — the model pattern. Has a "Who runs this rule" section binding the rule to Winston, Eric, and Briar.
- `.prism/rules/accessibility.md`, `.prism/rules/code-standards.md`, `.prism/rules/code-comments.md` — additional examples of applicability declarations.
- `.prism/SPEC.md` § Tier 2 — Durable Rules — the loading model that makes this convention work (rules in `.prism/rules/` are auto-loaded into every conversation).
- `.prism/plans/epic-phase-1-foundation.md` — Phase 1 plan, originating context.
- ADR-0001 (Plan Is Source of Truth) — the broader pattern of authoritative artifacts being read directly rather than enumerated by reference.
