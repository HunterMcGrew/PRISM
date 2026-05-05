---
title: "Rule Loading Tiers"
description: "Why PRISM splits `.prism/rules/` into three tiers — always-loaded, path-scoped, and skill-internal — and how to choose the right tier for a new rule."
category: "architecture"
audience: "dev"
last_updated: "2026-05-05"
---

# Rule Loading Tiers

PRISM ships engineering standards as `.prism/rules/*.md` files, and the rule loading tiers are how those rules reach an agent's context window without flooding every conversation with rules that don't apply.

## The need: rules cost tokens, but most rules apply to specific work

PRISM ships a growing collection of rules into a consumer repo. Some govern every conversation — writing voice, code comments, code standards, git conventions. Others govern specific work — accessibility for UI files, architect-doc-verification for spec edits, source-verified review for ADR text. Every rule loaded is tokens consumed before the user types anything, and the cumulative load grows as the rules directory grows.

The cost is asymmetric. A docs-only conversation paying the React-hook-rules tax wastes tokens on guidance that won't fire. A spec-editing conversation that misses the writing-voice rule produces drift the next reviewer has to clean up. Both failure modes are real, and they pull in opposite directions — load more, load less.

## What the requirements force

Three things fall out of "rules apply with different scopes":

- **A way to mark a rule as 'always applicable.'** Cross-cutting workflow and code-quality rules need to load on every session — there's no glob that captures "any time the agent does work."
- **A way to mark a rule as 'only applicable when files in scope X are touched.'** Domain-specific rules need to ride along with the relevant files, not the entire conversation surface.
- **A way for a rule to live with a specific skill's workflow but stay out of the auto-load pool entirely.** Some rules are skill-internal references — only load when that skill runs, only when its workflow needs them. Putting them in `.prism/rules/` would defeat the optimization.

The first requirement points away from "scope every rule." The second points away from "load every rule." The third points away from "rules only live in `.prism/rules/`."

## The natural fit: Claude Code's `paths:` frontmatter, plus a third home

Claude Code's [memory mechanism](https://code.claude.com/docs/en/memory#path-specific-rules) already supports `paths:` YAML frontmatter on rule files — a rule with `paths:` only loads when the agent reads files matching those globs; a rule without `paths:` loads unconditionally on every session. That's two of the three tiers handled by the platform with no custom layer.

The third tier — skill-internal references — falls out naturally too. Skill folders already have a `references/` payload directory the build script copies alongside `SKILL.md`. References in that folder don't reach the auto-load surface at all because they don't sit under `.prism/rules/`; the citing `SKILL.md` instructs the persona to read them at specific points in its mode-detection flow.

The convention sitting on top of the platform mechanism is the actual architecture: three named tiers, a default that biases new rules toward Tier 2, and a discoverability path so rule authors can choose the right tier instead of guessing.

## Platform limits force a tier-membership convention, not custom code

The platform handles the loading itself. What the platform doesn't do — and can't, because it's a content question — is decide which rule belongs in which tier, what `paths:` glob is correct for a given Tier 2 rule, or whether a new file should go in `.prism/rules/` or in a skill's `references/` folder. That's the custom layer: a small set of conventions that survive contact with rule authors who weren't around when the original tiers were drawn.

Three pieces:

- **Tier-membership rule.** Default to Tier 2 if the rule applies to a specific code area; default to Tier 1 only if the rule applies across every persona's lane. Tier 3 is for skill authors extracting references for lazy loading — not a destination for general project rules. The default biases the corpus toward scoping; an unscoped rule should be a deliberate choice, not a forgotten step.
- **Glob slightly wide.** Cast `paths:` globs slightly wide rather than tight. False positives are cheaper than false negatives — a rule that loads on a file that doesn't strictly need it costs a few tokens; a rule that misses a file that needed it produces a missed-rule case in PR review. When the glob is wrong, the fix is widening it, not abandoning the tier model.
- **Tier 3 lives outside `.prism/rules/`.** Skill-internal references live under `.ai-skills/skills/<id>/references/` and surface in the platform copy under `.claude/skills/<id>/references/`. Putting them in `.prism/rules/` would re-enter the auto-load pool and defeat the lazy-load entirely.

## The three tiers

| Tier                        | Where it lives                                                                                  | When it loads                                                    | Examples                                                                                                                                                   |
| --------------------------- | ----------------------------------------------------------------------------------------------- | ---------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Tier 1** — Always-loaded  | `.prism/rules/<rule>.md` (no `paths:` frontmatter)                                              | Every conversation, before any work starts                       | `branch-plan.md`, `pr-description.md`, `git-conventions.md`, `verification-commands.md`, `acceptance-criteria.md`, `implementation-task-detail.md`, `code-comments.md`, `code-standards.md` |
| **Tier 2** — Path-scoped    | `.prism/rules/<rule>.md` with `paths:` YAML frontmatter                                         | Only when the agent reads a file matching one of the globs       | `accessibility.md` (scoped to UI files), `architect-doc-verification.md` (scoped to architect docs, ADRs, paired dev docs)                                 |
| **Tier 3** — Skill-internal | `.ai-skills/skills/<id>/references/<file>.md` (copied to platform output by `pnpm prism:build`) | Only when the citing `SKILL.md` instructs the persona to read it | Pixel's `doctrine.md` and `pattern-vocabulary.md`; Reese's per-mode files; Nora's `frameworks.md`                                                          |

## How to add a new rule

1. **Decide the tier.** Walk the membership rule above. If the rule applies to a specific code area, it's Tier 2 — write the `paths:` frontmatter to scope it. If it applies across every persona's lane, it's Tier 1 — no frontmatter. If it's a reference one specific skill loads at a specific moment, it's Tier 3 — put it in that skill's `references/` folder, not in `.prism/rules/`.

2. **For Tier 2: write the `paths:` frontmatter.** A YAML block at the top of the file:

   ```yaml
   ---
   description: One-line description of what the rule covers
   paths:
     - "**/*.{ts,tsx,jsx,vue,svelte}"
     - "another-glob/**"
   ---
   ```

   Cast the glob slightly wide. The accessibility rule uses `**/*.{ts,tsx,jsx,vue,svelte}` rather than narrower per-framework patterns — PRISM consumers may run on any UI stack, and the wider glob keeps the rule firing across them.

3. **For Tier 3: cite the reference in `SKILL.md`'s startup flow.** The reference doesn't auto-load — it loads when the skill instructs the persona to read it. Name the file explicitly in the relevant startup or mode section so removing the citation is a visible diff in PR review:

   ```markdown
   ## Startup

   Run these steps automatically. Before step N, read [`frameworks.md`](./references/frameworks.md) — the S1-S4 scale, impact formula, Definition of Ready checklists all live there.
   ```

4. **Run `pnpm prism:build`.** Tier 1 and Tier 2 rules ride the existing canonical-to-platform copy. Tier 3 references ride the same copy via the `references/` payload, landing under `.claude/skills/<id>/references/` (and the equivalent under `.codex/`, `.cursor/`).

5. **Run `pnpm prism:check`.** Drift detection confirms the platform copies match canonical.

> [!TIP]
> When you're not sure whether a new rule is Tier 1 or Tier 2, the question to ask is: "Would this rule fire on a docs-only conversation that touches no code?" If yes, it's Tier 1. If no, it's Tier 2 and needs a `paths:` glob.

## Trade-offs the tier model accepts

- **Glob accuracy is the failure mode.** A Tier 2 rule with the wrong `paths:` glob silently misses files it should have fired on. Mitigation: cast slightly wide; if reviewers (Briar, Eric) catch a missed-rule case, the fix is widening the glob, not abandoning the tier.
- **Tier 3 depends on the citing SKILL.md.** Removing the load instruction from a SKILL.md silently breaks the lazy-load. Mitigation: each Tier 3 reference is named explicitly in its citing SKILL.md's startup section, so removing the citation shows up in the diff.
- **Tier 1 is unbounded.** Rules that earn Tier 1 membership add to baseline cost on every session. The membership rule biases new rules toward Tier 2 specifically to keep Tier 1 small.

## Cross-references

- [`ADR-0035`](../../../../.prism/spec/adrs/0035-rule-loading-tiers.md) — the decision and the alternatives considered
- [Claude Code memory docs § Path-specific rules](https://code.claude.com/docs/en/memory#path-specific-rules) — the platform mechanism Tier 2 rides on
- [`docs/content/dev/architecture/install-layout.md`](./install-layout.md) — how canonical content reaches each platform's auto-load surface; the build copy that Tier 1 and Tier 2 ride on, and the `references/` payload that Tier 3 rides on
- [`.prism/architect/install-layout.md`](../../../../.prism/architect/install-layout.md) — agent-loaded reference for the install layout, terser by design
- [`.prism/spec/adrs/0015-humane-language-over-mandates.md`](../../../../.prism/spec/adrs/0015-humane-language-over-mandates.md), [`.prism/spec/adrs/0016-explain-the-why.md`](../../../../.prism/spec/adrs/0016-explain-the-why.md) — voice principles applied to the rules themselves
