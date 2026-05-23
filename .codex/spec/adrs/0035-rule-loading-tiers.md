---
Number: 0035
Title: Rule Loading Tiers
Status: accepted
Date: 2026-05-22
---

## Context

PRISM ships rules under `.prism/rules/` as durable agent context. The canonical manifest at `.prism/architect/manifest.json` historically routed every rule edit to the same architect doc via a blanket `.prism/rules/**` entry, and every skill loaded the full rule set on every invocation. Cost grows linearly with rule count: each additional rule taxes every session, whether the rule applies to the work in front of the agent or not.

The rules themselves vary in scope. Some apply universally — `code-comments.md`, `code-standards.md`, `branch-plan.md`, `git-conventions.md` — almost every session touches code, edits a plan, or writes a commit. Others apply only when the diff touches certain file types — `accessibility.md` is only relevant to UI changes, `architect-doc-verification.md` is only relevant to architect-doc edits. A third class is referenced only by one or two specific skills — patterns that don't earn placement in the universal rule set but still need a durable home the skill can cite.

Treating all three classes identically — load everything, every session — burns context on rules that don't apply. The cost is invisible per-session but cumulative across the team and across LLM tiers (Sonnet, low-effort Opus, ChatGPT, Cursor). The cheaper the model, the more the wasted context matters.

Three approaches were considered:

- **(a) Keep the blanket `**` routing and add per-file `paths:` frontmatter that the runtime respects.** The frontmatter governs load; the manifest blanket stays. Rejected: leaves the manifest as a misleading registry — it claims to route every rule, but the rule's frontmatter overrides the manifest. The discrepancy makes the manifest harder to read as the source of truth.
- **(b) Drop the manifest entries for rules entirely and rely on skill-side `shared.md` references.** Each skill loads exactly the rules it needs. Rejected: loses the cross-cutting universal set — every skill would have to enumerate every universal rule, and the enumeration would drift the moment a new universal rule lands.
- **(c) Adopt a three-tier model: Tier 1 universal (manifest-registered, always loaded), Tier 2 path-scoped (manifest-registered, frontmatter governs load), Tier 3 skill-internal (no manifest entry, skill references by path).** Accepted — see below.

## Decision

PRISM rules load through a three-tier model:

- **Tier 1 — Always loaded.** Rules that apply universally across all sessions. Registered in the manifest with no path filter; loaded on every invocation. Examples: `.prism/rules/code-comments.md`, `.prism/rules/code-standards.md`, `.prism/rules/branch-plan.md`, `.prism/rules/git-conventions.md`, `.prism/rules/pr-description.md`, `.prism/rules/context-reuse.md`, `.prism/rules/followup-scope.md`.

- **Tier 2 — Path-scoped.** Rules that apply only when the diff touches certain paths. Registered in the manifest, but the rule's own `paths:` YAML frontmatter governs when the loader fires. Examples: `.prism/rules/accessibility.md` with `paths: ["**/*.tsx", "**/*.jsx", "**/*.vue", "**/*.svelte", "**/*.html"]`; `.prism/rules/architect-doc-verification.md` with `paths: [".prism/architect/**/*.md", "docs/content/dev/architecture/**/*.md"]`.

- **Tier 3 — Skill-internal.** Rules referenced only by specific skills. No manifest entry; the skill's `shared.md` references the rule by path. The rule loads lazily when the skill loads, and stays out of context for sessions that don't invoke the skill.

Rule authors classify a new rule by tier on creation. The classification belongs in the rule's frontmatter (Tier 2 frontmatter is the `paths:` field itself; Tier 1 has no frontmatter and lives in the manifest's universal section; Tier 3 has no manifest entry and is referenced from one skill).

The `paths:` frontmatter convention follows the shape already used by `.prism/rules/writing-voice.md` — a YAML list of glob patterns at the top of the rule file. The format is byte-identical between `.prism/rules/<file>` and `templates/install/.prism/rules/<file>`.

## Consequences

- **Positive:** Per-session context cost drops on every session that doesn't touch every file type. A session editing only Markdown skips `accessibility.md`; a session editing only TypeScript skips `architect-doc-verification.md`. The cumulative cost across the team compounds in the right direction.
- **Positive:** The manifest becomes a more honest registry. Tier 1 rules appear as explicit entries; Tier 2 rules appear with their `paths:` frontmatter as the governing rule. Future readers can scan the manifest and see the universal load set without inferring it from a blanket pattern.
- **Positive:** Tier 3 carves out a durable home for skill-local patterns that don't earn universal placement but still need to be cited. Skills can reference Tier 3 rules from `shared.md` without polluting every other skill's context.
- **Negative:** Rule authors now make a tier classification decision on every new rule. The classification is one extra step at authoring time, and gets it wrong sometimes.
- **Negative:** Tier 2 `paths:` frontmatter glob patterns can drift from the underlying intent. A rule with `paths: ["**/*.tsx"]` doesn't catch `.jsx`, and the divergence is silent. Mitigation: review the `paths:` list during PR review of any rule change, the way reviewers already scan `manifest.json` patterns.
- **Neutral:** The three-tier model maps cleanly onto Thrive PR #1970's original design. PRISM adopts the same shape and applies it across the universal rule set.

## References

- Thrive PR #1970 — the original three-tier loading design this ADR backports.
- [ADR-0029](./0029-rules-self-declare-applicability.md) — sibling decision: rules self-declare their applicability via a "Who runs this rule" section. Tier 2's `paths:` frontmatter is the machine-readable counterpart to that self-declaration.
- [ADR-0031](./0031-bifurcated-install-layout.md) — related: rules under `.prism/rules/` are canonical; platform-dir copies regenerate via `pnpm prism:build`. Frontmatter additions to canonical sources mirror byte-identically to platform copies and to `templates/install/.prism/rules/`.
