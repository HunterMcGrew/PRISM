---
title: "Rule Loading Tiers"
description: "How PRISM decides which rules load into agent context on a given session — a three-tier model balancing universal coverage against per-session cost."
category: "architecture"
audience: "dev"
last_updated: "2026-06-15"
---

# Rule Loading Tiers

Spec source: [ADR-0035](../../spec/adrs/_toolkit/0035-rule-loading-tiers.md)

PRISM ships durable agent context as rules in `.prism/rules/`, and the rule-loading system is what decides which of those rules enter agent context on a given session.

## The cost of loading everything

PRISM's rule count grows. Each rule that loads on every session taxes every conversation, whether the rule applies to the work in front of the agent or not. The cost is invisible per-session but cumulative — across the team, across the LLM tiers we run (Sonnet, low-effort Opus, ChatGPT, Cursor), and across the lifetime of the toolkit. The cheaper the model, the more the wasted context matters. A flat "load every rule, every session" policy was the original design, and it doesn't scale past a small rule set.

The rules vary in scope too. Some apply universally — comment standards, code standards, git conventions, branch-plan rules — because almost every session touches code, edits a plan, or writes a commit. Others apply only when the diff touches certain file types — accessibility rules are only relevant to UI changes, architect-doc verification is only relevant when an architect doc is in the diff. A third class is referenced by only one or two specific skills — patterns that don't earn placement in the universal rule set but still need a durable home a skill can cite. Treating all three the same — load everything, every session — is the policy that broke.

## What the loader has to do

Any working solution has to answer three requirements at once. There has to be a stable set of always-loaded rules so cross-cutting context never goes missing. There has to be a per-session filter that loads scope-specific rules only when the scope is in play. And there has to be an escape hatch for rules that don't belong in the manifest at all because only one or two skills cite them.

Loading happens at session start. The agent reads the manifest at `.prism/architect/manifest.json`, walks the working file set against every key, and collects every matching doc. That walk is the bridge between scope and context — what the agent reads is shaped by what it's about to touch.

## The three-tier model

The three-tier model is what fell out of those requirements.

**Tier 1 — Always loaded.** Rules that apply universally. The manifest registers them with no path filter; the loader fires them on every session. The current set includes the comment standard, the code standard, the branch-plan rule, git conventions, PR-description rules, context-reuse, follow-up scope, lazy artifacts, and the writing-voice guide — the last one Tier 1 because its most common surfaces (commit messages, PR bodies, ticket comments) are not file edits, so no `paths:` gate could ever fire for them. These are the load-bearing universals — the rules that govern voice, structure, and process across every piece of work.

**Tier 2 — Path-scoped.** Rules that apply only when the diff touches certain paths. The manifest still registers them, but each rule carries its own `paths:` YAML frontmatter as a list of glob patterns. The loader checks the patterns against the working file set and fires only when one matches. Accessibility carries `paths: ["**/*.tsx", "**/*.jsx", "**/*.vue", "**/*.svelte", "**/*.html"]`; architect-doc verification carries `paths: [".prism/architect/**/*.md", "docs/content/dev/architecture/**/*.md"]`. The frontmatter shape is the same across every Tier 2 rule — same file format, same load mechanic.

**Tier 3 — Skill-internal.** Rules that only one or two skills cite. No manifest entry; the skill's `shared.md` references the rule by path. The rule loads lazily when the skill loads and stays out of context for sessions that don't invoke the skill. This is the escape hatch — a durable home for patterns that don't earn universal placement but still need to be cited from somewhere specific.

Rule authors classify a new rule by tier at creation. The classification is encoded in the rule file itself: Tier 2 carries the `paths:` field, Tier 1 has no `paths:` field and lives in the manifest's universal section, and Tier 3 has no manifest entry at all and is referenced from one skill's source.

## What's still rough

Two seams are visible in the model and the team should expect to hit them.

**Tier 2 frontmatter glob drift.** The `paths:` list is hand-maintained. A rule with `paths: ["**/*.tsx"]` doesn't catch `.jsx` if the team starts using JSX, and the divergence is silent — the loader simply stops firing the rule, and the omission doesn't surface until someone notices a session where the rule should have applied. The mitigation is process, not platform: review `paths:` during PR review of any rule change, the way reviewers already scan `manifest.json` patterns.

**Tier 3 isolation across skill handoffs.** When a skill invokes another skill — Clove → Briar → Eric, for example — Tier 3 rules don't cross the handoff in either direction. The invoked skill loads its own Tier 3 set; the invoking skill keeps its own. A rule that should have been Tier 1 or Tier 2 but was misclassified as Tier 3 will silently miss handoff scenarios. The seam is what makes Tier 3 cheap; it's also what makes the classification call load-bearing.

For consumer installs, rule files mirror from `.prism/rules/` to the per-platform copies that `pnpm prism:build` writes alongside each platform directory. The tier classification is encoded in the rule file itself — the frontmatter and the manifest entry — so it propagates with the copy without consumer-side configuration.

Each runtime receives a dialect appropriate to its loader:

- **Claude** receives verbatim copies — the canonical `.md` files, unchanged.
- **Codex** receives copies with the `paths:` frontmatter key stripped from Tier-2 rules. Codex has no path-tiering primitive — it cannot act on `paths:`, so the key is dead frontmatter that misrepresents how those files load. The build strips it via a `codexRuleDialect` transform so the `.codex/rules/` copies are honest about their own behavior.
- **Cursor** receives a full dialect translation: `paths:` rewrites to `globs:`, Tier-1 rules gain `alwaysApply: true`, and `.md` renames to `.mdc`. Cursor's rules loader reads that shape; the canonical `.md` format would be inert without the translation.

Codex also requires a separate mechanism to reach Tier-1 rule bodies at all. Codex auto-loads only `AGENTS.md` — it has no rules-directory auto-load mechanism, so the `.codex/rules/` copies exist as citable references but are never automatically read at session start. To close this gap, `pnpm prism:build` inlines every Tier-1 rule body into a generated, marker-delimited block in root `AGENTS.md`, inserted after the `## Behavioral norms` pointer table. The table remains — it is the human-scannable index and the anchor for cross-references — while the generated block adds the full rule text for Codex to read inline.

Tier-2 rules are deliberately excluded from the inlined block. Tier 2 exists precisely because file-type-specific rules should not load on every session; inlining them unconditionally would defeat that purpose. Codex has no path-tiering primitive that could replicate the `paths:` gate, so Tier-1-only inlining is the faithful ceiling. The 7 Tier-2 rules remain citable at `.codex/rules/<file>.md` for skills that reference them by path.

## Related

- [ADR-0035: Rule Loading Tiers](../../spec/adrs/_toolkit/0035-rule-loading-tiers.md) — the spec source for this doc
- [ADR-0029: Rules Self-Declare Applicability](../../spec/adrs/_toolkit/0029-rules-self-declare-applicability.md) — sibling decision; Tier 2's `paths:` frontmatter is the machine-readable counterpart to the self-declaration this ADR introduces
- [ADR-0031: Bifurcated Install Layout](../../spec/adrs/_toolkit/0031-bifurcated-install-layout.md) — the per-platform copy mechanism this loading model rides on
