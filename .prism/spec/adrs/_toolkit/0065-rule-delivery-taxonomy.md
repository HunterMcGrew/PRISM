---
Number: 0065
Title: Rule Delivery Taxonomy — The Unit of Ownership Decides the Delivery Mechanism
Status: accepted
Date: 2026-06-24
---

## Context

PRISM's canonical rule set lands in a consumer repo through several different mechanisms — some ship verbatim, some get per-team token substitution, some are generated fresh by Atlas at onboarding, some bake into a single skill. Before this decision the mechanisms existed but the *assignment* was ad hoc: a rule landed wherever the last person who touched it put it, and two failure modes followed.

First, the behavioral kernel reached no consumer at all. The always-loaded behavioral rules (core-principles, verification-before-done, demand-elegance, plan-before-building, and the rest) were neither in the install rule surface nor in `AGENTS.md.tmpl` — a consumer's agents ran without them. A curation accident, not a decision.

Second, an earlier "SHIP-DEFAULT+TAILOR" bucket conflated two genuinely different things: token-bearing files (no human choice — the build substitutes `PRISM` and moves on) with preference-bearing files (a real editorial choice a team might restyle). Collapsing them created pressure to add onboarding interview questions where the data was already collected, and a skip-if-exists/reconfigure conflict where a hand-written file silently no-ops a later prefix change.

The fix is a single organizing principle, vetted across four lenses (architect evaluation + Nora/Clove/Briar/Atlas consult, 2026-06-24): **the unit of ownership decides the delivery mechanism.**

## Decision

Every canonical rule lands in exactly one of five modes. The mode follows from one question — *who owns this content, and does it have a universal form?*

- **SHIP (kernel, verbatim, tokenized where a value varies).** Content shared across many skills or loaded repo-wide, and invariant across teams. Ships as a small verbatim kernel — never regenerated (drift), never duplicated into N skills (drift). Covers the repo-wide always-loaded rules and the cross-persona contextual ones, including the full behavioral kernel that previously reached no consumer.
- **SHIP (build-time token substitution).** Content whose only per-team variation is a token Atlas already holds (`PRISM` and friends). Substituted by the build, never Atlas-written. Covers git-conventions, pr-description, followup-scope.
- **TAILOR (single soft offer).** Content with a sensible default a team might restyle, where the choice is a genuine editorial one worth one onboarding offer. Currently acceptance-criteria only (checklist default vs Gherkin). The offer carries **two independent, both-required properties**: (1) a **skip-if-exists guard** on whether the offer fires at all — it does not fire when the AC format is already configured, so a reconfigure run does not re-prompt; and (2) **user-skippable** within a firing offer — when it does fire, the user may decline and keep the default. These are not the same property, and implementing only (2) — an unconditional offer the user declines every reconfigure run — is the bug the guard exists to prevent.
- **GENERATE (Atlas, per-team).** Content with no universal form — build/test/lint commands, language standards, security. Atlas writes it from the detected stack at onboarding.
- **BAKE (into one skill).** Content owned by exactly one skill bakes into that skill's bundle. skill-authoring → skill-forge's `lib/` is the first single-owner bake.

**The test for GENERATE** is "does the content have a universal form?" If yes with only a token varying → SHIP token-sub. If it has a sensible default a team might restyle → TAILOR. Generate only when no universal default exists. Applicability (accessibility, design-governance) is handled by `paths:` load-gating plus a one-line Atlas applicability declaration — not by regenerating invariant content.

## Consequences

- **Positive:** Every rule has one unambiguous delivery mode, decidable by the ownership-unit test rather than by precedent. The behavioral kernel ships. Token-bearing files never generate an interview question, and preference-bearing files get exactly one offer.
- **Positive:** The skip-if-exists guard on the TAILOR offer makes reconfigure idempotent — a second run does not re-prompt for a format already chosen, matching every other skip-if-exists generator in the onboarding step-10 path.
- **Negative:** The five-mode split is a classification every new rule author must run. Mis-classifying a token-bearing file as TAILOR re-introduces the conflated-bucket bug; the ownership-unit test is the guard, but it has to be applied.
- **Negative:** "Two independent properties, both required" on the AC offer is subtle and was misread once already (built as an unconditional offer). The framing has to stay explicit in the Atlas spec or it regresses.
- **Neutral:** Behavioral-kernel rules run the literal-Thrive guard as they enter the seed — they had never been scanned, so they may have carried residue the seed scan never checked. (They came through clean.)

## References

- `.prism/plans/epic-prism-consumer-boundary.md` — Decisions: "Rule delivery taxonomy for the canonical rule set", "The behavioral kernel ships", "All skills ship; skill-forge ships as a consumer utility"
- ADR-0030 — Token substitution at build time (the SHIP token-sub mechanism)
- ADR-0035 — Rule loading tiers (the `paths:` load-gating this taxonomy composes with)
- ADR-0036 — Security as a distributed rule (the GENERATE precedent for per-stack content)
- ADR-0064 — Consumer/internal boundary (the sibling boundary decision; ADRs themselves are neither shipped nor tailored — they stay internal)
- `.ai-skills/skills/prism-onboarding/shared.md` — Atlas step-10 generators and the AC offer
