---
Number: 0036
Title: Security as a Distributed Rule
Status: accepted
Date: 2026-05-22
---

## Context

Security concerns vary by stack. A React/Next.js codebase worries about XSS through `dangerouslySetInnerHTML`, CSRF on form submissions, and prototype pollution in shared utilities. A Django codebase worries about ORM injection, template-render auto-escaping, and middleware ordering. A WordPress codebase worries about nonces, capability checks, and sanitization on save. A single universal `security.md` rule that tried to cover every team's threat model would either be too generic to act on or too long to load on every session.

The right pattern is to make security a distributed concern across the reviewer skills (Eric, Briar, Sasha) — each reviewer checks for security findings relevant to the change in front of them — without shipping a one-size-fits-all rule body. The content that fills the rule has to come from somewhere closer to the team's actual stack.

PRISM's onboarding flow (Atlas, Phase 2) already generates per-stack rule files based on the team's `techStack` config. Security fits the same pattern: Atlas writes `security-react.md`, `security-django.md`, `security-wordpress.md` (or whatever stack mix the team declared) during onboarding, populated from the patterns in the team's actual code.

Three approaches were considered:

- **(a) Ship a universal `security.md` with every common pattern.** Rejected: the rule becomes a 500-line dump of patterns most of which don't apply to any given team. Reviewers skim past content that doesn't match, and the real findings get lost in the noise.
- **(b) Don't ship security as a rule at all — let reviewer skills carry the patterns inline in `shared.md`.** Rejected: the patterns become invisible to anyone reading the rule set, and any cross-skill update has to touch every reviewer skill separately.
- **(c) Ship the pattern (security is a distributed rule referenced by reviewer skills) but generate the content per-stack via Atlas during onboarding.** Accepted — see below.

## Decision

PRISM adopts the distributed-rule pattern for security but does not ship security content. The pattern works as follows:

- **The pattern is documented.** Security is treated as a distributed rule applied across multiple reviewer skills — Eric (PR review), Briar (self-review), Sasha (debugger when investigating security-flavored bugs).
- **Content is generated per-stack by Atlas during Phase 2 onboarding.** For each language and framework in the team's `techStack`, Atlas writes a corresponding `security-<stack>.md` file under `.prism/rules/`, populated from patterns in the team's actual code (the same per-codebase rule-generation pattern from [ADR-0032](./0032-canonical-skill-content-is-generic.md)).
- **Tier classification follows the same three-tier model from [ADR-0035](./0035-rule-loading-tiers.md).** Most stack-specific security rules will be Tier 2 with `paths:` frontmatter scoping them to relevant file types (`security-react.md` → `paths: ["**/*.tsx", "**/*.jsx"]`).
- **Reviewer skills reference security findings via the existing acceptance-criteria citation discipline.** When a reviewer surfaces a security finding, it lands in the plan's `## Review Issues` section the same way any other major finding does. No special routing.

What this ADR does **not** do: ship a `security.md` body. PRISM's canonical rule set under `.prism/rules/` and the templates copy under `templates/install/.prism/rules/` do not include security content. The pattern slot is reserved; the content fills in at Atlas time.

## Consequences

- **Positive:** Teams get security rules that match their actual stack — patterns drawn from the code in front of them, not a generic checklist. The signal-to-noise ratio for the reviewer is higher.
- **Positive:** PRISM stays stack-agnostic in its canonical sources. The substrate ships without leaning on assumptions about React vs Django vs WordPress.
- **Positive:** The cross-skill substrate (Eric, Briar, Sasha all check security) is documented in this ADR and any future reviewer skill knows where to plug into.
- **Negative:** Until Phase 2 lands, teams using PRISM don't get a security rule. The pattern slot is empty; reviewers carry security checking in their own heads or via team-internal docs.
- **Negative:** The per-stack generation depends on Atlas's rule generator (Phase 2 deliverable). If Atlas writes a thin or wrong `security-<stack>.md`, reviewers may trust it falsely.
- **Neutral:** This ADR pairs with [ADR-0032](./0032-canonical-skill-content-is-generic.md) (canonical content is stack-agnostic) and [ADR-0035](./0035-rule-loading-tiers.md) (three-tier loading). The security rule slot is the canonical example of all three: stack-agnostic at substrate, Tier 2 at runtime, generated per-team at onboarding.

## References

- Thrive PR #2001 — the original distributed-security pattern this ADR backports.
- [ADR-0029](./0029-rules-self-declare-applicability.md) — sibling decision: rules self-declare their applicability and bind reviewer personas via "Who runs this rule." Atlas's generated `security-<stack>.md` files follow the same self-declaration pattern.
- [ADR-0032](./0032-canonical-skill-content-is-generic.md) — sibling decision: canonical content stays stack-agnostic. Security content is the canonical example.
- [ADR-0035](./0035-rule-loading-tiers.md) — sibling decision: three-tier rule loading. Stack-specific security rules are Tier 2 with `paths:` frontmatter scoping them to relevant file types.
- Phase 2 Atlas spec (forthcoming) — the per-codebase rule generator that writes `security-<stack>.md` content at onboarding.
