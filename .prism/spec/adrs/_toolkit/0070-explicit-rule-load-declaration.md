---
Number: 0070
Title: Explicit Rule-Load Declaration Replaces Absence-of-paths as the Tier Discriminator
Status: accepted
Date: 2026-07-20
---

## Context

ADR-0035 established the three-tier rule-loading model (Tier-1 always-on, Tier-2 path-scoped, Tier-3 skill-internal) and its machine-readable discriminator: a rule with no `paths:` frontmatter is Tier-1, a rule with `paths:` is Tier-2. `scripts/ai-skills/agents-md-block.ts`'s `collectTier1RuleBodies` implemented that discriminator literally — `frontmatter === null || !/^paths:/m.test(frontmatter)` — with a hand-maintained `CODEX_INLINE_EXCLUDE` set as the only Tier-3 opt-out, empty since the day it shipped.

`.prism/plans/eval-routing-and-rule-load.md` (the architecture evaluation this ADR implements) named the resulting defect: Tier-3 is structurally indistinguishable from Tier-1. A rule file with no `paths:` frontmatter is inlined as always-on whether its author intended that or not — "always on" was never an affirmative decision, only the default that fell out of omitting a key. The evaluation's Event-repo evidence made the cost concrete: Atlas-generated per-team rules (`code-standards-<lang>.md`, `<framework>-guidelines.md`, `security.md`) land with no frontmatter at all, so a rebuild silently raises the always-on set every time a team onboards a new language or framework — nobody decided that, it just happened.

The same evaluation found the consumer-side half of the gap: no seam regenerates a consumer's AGENTS.md Tier-1 block after `prism update` adds or changes rules. `prism adopt` seeds an empty marker pair and tells the consumer to run `pnpm prism:build` — a script consumers don't have.

## Decision

Every canonical rule under `.prism/rules/` declares an explicit `load:` key in frontmatter: `load: always` (Tier-1), `load: paths` (Tier-2, requires a `paths:` list in the same block), or `load: skill` (Tier-3, never copied to any platform's always-on surface — it exists only canonically and loads when a skill cites it as an imperative trigger). This replaces the absence-of-`paths:` discriminator; ADR-0035's three-tier model itself is unchanged.

`pnpm prism:build` hard-fails — naming the offending file — on any canonical rule missing a valid `load:` declaration, before any platform copy is written. "Always on" is now an authoring decision that has to be made, not an omission that resolves to always-on by default. `CODEX_INLINE_EXCLUDE` is retired; `load: skill` is its replacement, applying uniformly across Claude, Cursor, and Codex instead of only gating Codex's AGENTS.md inlining.

`prism update` gains a consumer-side seam: after refreshing the platform-skill roster, it re-renders the consumer's AGENTS.md Tier-1 marker-pair block from the consumer's own `.prism/rules/` — but only when the marker pair already exists; it never creates or restructures a consumer AGENTS.md. Because a consumer's rules directory may carry legacy rules that predate this mechanism, the consumer-facing path (`prism update`, `prism doctor`) never hard-fails on a missing `load:` the way PRISM's own build does — it treats the rule as `always` and prints a per-file warning naming the remedy, so nothing silently drops out of a consumer's context mid-upgrade, but the omission is no longer silent either. `prism doctor` reports the same warnings on every run until the rule declares `load:`.

`.prism/rules/pr-description.md` reclassifies to `load: skill` as the mechanism's first real Tier-3 rule: it fires at a specific action (opening or syncing a PR body), not on a file-path glob, so no `paths:` pattern could express its scope — it was Tier-1 only because Tier-3 had no machine-readable form to hold it. The four personas with a genuine PR-body-authoring moment (Clove's shipping flow, Winston's plan-mode PR-body sync) gain an explicit imperative read-trigger citing the rule by path, so it still loads exactly when needed instead of relying on it being ambient.

## Consequences

- **Positive:** A rule reaching every session, every platform, forever is now a decision someone made on purpose — reviewable in the same diff that adds the rule, rather than inferred from what the frontmatter doesn't say.
- **Positive:** Tier-3 finally has a machine-readable encoding distinct from Tier-1. `pr-description.md`'s 80-plus lines drop out of the always-on set on every session that isn't authoring a PR body — the load reduction `.prism/plans/agents-md-slim.md` already established only counts when content leaves the always-on set entirely, which this does (as opposed to shuffling it between two always-on surfaces, which saves nothing).
- **Positive:** Atlas's per-team generated rules now carry a `load:` decision made explicitly during onboarding (confirmed in the question flow) instead of landing frontmatter-less and silently always-on.
- **Negative:** Every future canonical rule author must choose a `load:` value; getting it wrong (or forgetting it) is a hard build failure rather than a silent default. This is the intended cost — see ADR-0035's own "Negative" consequence, now enforced instead of optional.
- **Negative:** The consumer-facing warn-not-fail path is a second code path (`parseRuleLoad`'s `"warn"` mode) that has to stay behaviorally consistent with the strict path used by PRISM's own build — a future change to one validation rule has to be applied to both branches of `parseRuleLoad`, not just one.
- **Neutral:** The exact mechanism by which Claude Code loads its platform-copy rules surface (always, or respecting some future `paths:`-aware loader) is inferred from observed behavior, not a documented Claude Code contract. This decision does not depend on that mechanism either way — `load: skill` rules are never copied to that surface at all, so there is nothing for an unconfirmed loader behavior to accidentally still load.

## References

- [ADR-0035](./0035-rule-loading-tiers.md) — owns the three-tier model this ADR amends only the discriminator of. Amended by this ADR: the discriminator is now the explicit `load:` key, not the absence of `paths:`.
- `.prism/plans/eval-routing-and-rule-load.md` — the architecture evaluation this ADR implements (Defect 2 and its recommendation).
- `.prism/plans/agents-md-slim.md` — established that moving content between two always-on surfaces saves no chat-load tokens; this ADR's `pr-description.md` reclassification is a genuine load reduction because the content leaves the always-on set entirely.
- `.prism/plans/prism-417.md` — the ticket plan this ADR ships with.
