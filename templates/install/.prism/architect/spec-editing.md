# Spec Editing

Architect context for edits under `.claude/` spec surfaces — the Tier 0 SPEC.md, skills, templates, rules, ADRs, architect context, references, and plan files.

## Rules that apply here

Rules that apply to spec edits include, but aren't limited to:

- `.prism/rules/writing-voice.md` — onboarding voice, not mandate voice; explain the why; keep it short enough to be read
- `.prism/rules/branch-plan.md` — plan file structure and lifecycle (applies to `.prism/plans/**`)
- `.prism/rules/architect-doc-verification.md` — source-verified review for architect docs and paired dev docs

The "include, but aren't limited to" framing is load-bearing — don't collapse it into a closed list. Treating an enumerated list as exhaustive is a known LLM failure mode that has produced voice drift in spec content; see ADR-0015 for the originating reasoning. When a new rule governs spec content, add it to this list and keep the preamble.

## Why this file exists

The `**` catch-all in `manifest.json` routes spec edits to `skills-ecosystem.md`, which covers the skill roster and lifecycle — not the voice or reasoning rules. Without a dedicated spec-content route, writing-voice and explain-the-why only reach the agent via preload context (CLAUDE.md / AGENTS.md), which is easy to pattern-match around when an agent is mid-edit on an existing spec file. Routing through the manifest puts these rules in the same context window as the file being edited, at the moment of the edit.

See [ADR-0015](../spec/adrs/0015-humane-language-over-mandates.md) (humane language over mandates) — absolute mandates invert across models, so the voice itself carries the constraint. And [ADR-0016](../spec/adrs/0016-explain-the-why.md) (explain the why) — a rule without its reason gets treated as arbitrary and skipped in edge cases.

## Scope

This context loads for edits under:

- `.prism/SPEC.md` — the Tier 0 meta-doc that defines the spec hierarchy itself
- `.claude/skills/**`
- `.prism/templates/**`
- `.prism/rules/**`
- `.prism/spec/adrs/**`
- `.prism/architect/**`
- `.prism/references/**`
- `.prism/plans/**` — durable sections only; in-progress `## History`, `## Debugged Issues`, and `## Review Issues` are working notes

Out of scope: `.prism/lessons.md`, `.claude/docs/`, `.prism/design/mocks/` — working notes and design artifacts, not durable spec.

If you add a new `.claude/` subfolder or a new top-level `.claude/*.md` file, decide whether it's spec content. If yes, add a manifest route pointing it here.
