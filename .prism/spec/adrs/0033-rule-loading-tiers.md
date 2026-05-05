---
Number: 0033
Title: Rule Loading Tiers
Status: accepted
Date: 2026-05-04
---

## Context

Every Claude Code conversation in this repo loads a baseline of context before the user types anything. Most of that baseline is the contents of `.prism/rules/*.md`, which Claude Code auto-discovers via the per-platform copies that `pnpm prism:build` writes alongside each platform dir, and treats as project instructions. The team's rules directory has grown over time — the cumulative load runs into the thousands of lines on every session, much of it irrelevant to the conversation at hand.

THR-1826 measured the load and found that domain-specific rules were loading on every conversation regardless of whether the conversation touched the relevant code. A docs-only conversation paid the same React-hook-rules tax as a frontend block edit.

Claude Code's memory mechanism already supports the fix. From the [memory docs § Path-specific rules](https://code.claude.com/docs/en/memory#path-specific-rules): a rule with YAML `paths:` frontmatter only loads when Claude reads files matching those globs. A rule without `paths:` loads unconditionally on every session.

Three approaches were considered for the remaining unscoped rules:

- **(a) Single tier — leave everything unscoped.** The status quo. Rejected: this is the cost we're trying to leave behind.
- **(b) Two tiers — always-loaded versus scoped, no further structure.** Workable, but doesn't capture rules that are referenced only by specific skills. Two tiers conflate "general workflow rules" with "skill-internal references" and miss the optimization on the latter.
- **(c) Three tiers — always-loaded, path-scoped, skill-internal.** Adopted. Maps cleanly onto the rule taxonomy: cross-cutting workflow rules stay unscoped, domain rules use `paths:` frontmatter to load only when relevant, skill-internal references load via the citing skill's reading flow.

## Decision

Rules in `.prism/rules/` fall into three tiers based on when they should be in context. Tier membership is determined by the rule's content, not its filename.

**Tier 1 — Always-loaded.** Rules that apply across every persona's lane and every conversation. No `paths:` frontmatter. Members: workflow rules (`branch-plan.md`, `pr-description.md`, `git-conventions.md`, `verification-commands.md`, `acceptance-criteria.md`), universal code rules (`code-comments.md`, `code-standards.md`).

**Tier 2 — Path-scoped via `paths:` frontmatter.** Rules that only apply when files in a specific area are being read or edited. The frontmatter scopes them to the relevant globs. Members include the writing-voice rule (`writing-voice.md`, scoped to durable spec content), the accessibility rule (`accessibility.md`, scoped to UI files), and the architect-doc-verification rule (`architect-doc-verification.md`, scoped to architect/ADR/dev-doc surfaces).

**Tier 3 — Skill-internal references.** Files referenced by specific skills as part of their workflow but not loaded as project instructions on every session. Pixel's `doctrine.md` and `pattern-vocabulary.md` (introduced in THR-1826 and ported to PRISM) are the canonical examples — the SKILL.md instructs the persona to read them at specific points in its mode-detection flow. These live inside the skill folder under `references/`, not in `.prism/rules/`, so they fall outside the auto-load mechanism entirely.

The membership rule for adding a new rule: **default to Tier 2 if the rule applies to a specific code area; default to Tier 1 only if the rule applies across every persona's lane.** Tier 3 is for skill-specific references the skill author chooses to extract for lazy loading; it's not a destination for general project rules.

## Consequences

- **Positive:** Baseline conversation context drops by a measurable amount on conversations that don't touch the relevant code areas. THR-1826 measured roughly 16,400 tokens shed from baseline on the rules tier alone.
- **Positive:** The mechanism is built into Claude Code. No custom routing layer, no `manifest.json` extension, no maintenance burden beyond keeping `paths:` globs accurate as the codebase evolves.
- **Positive:** New rule authors have a clear default. "Does this apply to a specific code area?" is a question with a yes/no answer that produces the right tier.
- **Negative:** Rules in Tier 2 don't load on conversations that should have triggered them but didn't match the glob. Mitigation: cast `paths:` globs slightly wide rather than tight — false positives are cheaper than false negatives. If reviewers (Briar, Eric) catch a missed-rule case in PR review, the fix is widening the glob, not abandoning the tier model.
- **Negative:** Skill-internal Tier 3 references depend on the SKILL.md correctly instructing the persona to load them. A SKILL.md edit that drops the load instruction silently breaks the lazy-load. Mitigation: each Tier 3 reference is named explicitly in its citing SKILL.md's startup section, so removing the citation is a visible diff in PR review.
- **Neutral:** The tier model is descriptive, not normative. It documents how rules are already loaded today (Tier 1 = unscoped, Tier 2 = `paths:`-scoped) and gives a name to the new Tier 3 pattern.

## References

- [.prism/plans/epic-context-optimization.md](../../plans/epic-context-optimization.md) — implementation plan and history of the migration.
- [Claude Code memory docs § Path-specific rules](https://code.claude.com/docs/en/memory#path-specific-rules) — the underlying mechanism.
- [docs/content/dev/architecture/rule-loading-tiers.md](../../../docs/content/dev/architecture/rule-loading-tiers.md) — paired human-readable dev doc with longer narrative for teammates (to be written by Eli in task 11).
- [ADR-0015](./0015-humane-language-over-mandates.md), [ADR-0016](./0016-explain-the-why.md) — voice principles applied to the rules themselves.
