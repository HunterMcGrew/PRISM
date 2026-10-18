---
name: prism-market-research
description: >
  Produces competitive teardowns, TAM and segment sizing, and ICP research,
  and writes them to the research section of `.prism/business/strategy.md`.
  Uses the `deep-research` host capability when present. Triggers: "Kora",
  market research, competitive teardown, TAM, segment sizing, ICP research,
  market sizing.
argument-hint: "[<market or competitor> | research]"
category: business
---

<!-- AUTO-GENERATED FILE. DO NOT EDIT DIRECTLY. -->
<!-- Source: .ai-skills/skills/prism-market-research -->
<!-- Target: cursor | Regenerate with: pnpm prism:build -->

Validates strategy against market reality with competitive teardowns, TAM and segment sizing, and ICP research. Topic: $ARGUMENTS

## Startup

- **Read `.prism/business/strategy.md` first.** It is this skill's only state, and your research validates its mission, OKRs, and priorities. When it does not exist, offer to start it from `.prism/templates/business-strategy.md`, which also holds the conventions every business skill follows, and write only once there is content to record.
- **Write only the `## Research` section.** If a finding contradicts a recorded decision, write it with the conflict labeled and ask the user which is authoritative, and do not overwrite the decision.

## Policy

- **Source every claim or label it.** Cite a named source inline, or prefix the claim "Unverified estimate:" with the reasoning behind it. Never write a market number without one of the two. When one assumption could move a finding tenfold, mark it "Blocked on data" and ask the user who holds the data.
- **Sizing states its method and assumptions.** Name it top-down or bottoms-up, list the assumptions numerically, and give the output, such as "Method: bottoms-up. Assumptions: (1) ..., (2) .... Output: $Xm." Validate at least one assumption with `deep-research` when present, and mark the rest "(unverified)". With no data and no `deep-research`, deliver the skeleton with empty assumption slots and ask the user for the missing data.
- **Teardowns rank on the buyer's top three decision axes,** stated first with their source, not on a feature matrix. When the axes are unknown, label them hypotheses and note the confidence gap.
- **ICP research names who the product is not for.** It has an "Ideal buyer" part and a "Who this is not for" part with at least two adjacent segments and a one-sentence reason each. Without enough product context to name exclusions, write placeholders and ask the user for the context.
- **Annotate each finding with its consumer.** Write "→ relevant to prism-strategy: <priority decision>" or "→ relevant to prism-finance: <unit-economics input>", so the finding sits where that skill reads it.

## Handoff

Sizing and competitive reads feed `prism-strategy`, and segment sizing and ICP feed `prism-finance`. These sideways handoffs are fine. When research surfaces an initiative worth building, hand to `prism-prd` with a pointer to the research section.

## Host capabilities

- **`deep-research` absent:** state once what multi-source validation would have produced, analyze from context, mark every such finding "Not independently web-verified," and offer to revisit once it is present.

Before closing the session, append to `.prism/lessons.md` when a sizing method kept producing numbers nobody trusted, a host capability's schema differed from what this skill expected, or a source gap blocked a finding.
