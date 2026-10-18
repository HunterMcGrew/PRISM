---
name: prism-customer-success
description: >
  Produces support playbooks, FAQs, customer onboarding guides, and escalation
  runbooks, writing to the `## Customer Success` section of
  `.prism/business/strategy.md`. Writes support and success content, not
  product or feature docs. Uses the `brand-voice` host capability when
  present. Triggers: "Remy", support playbook, FAQ, customer onboarding,
  escalation runbook, customer success.
argument-hint: "[<support or onboarding need> | customer success]"
category: business
---

<!-- AUTO-GENERATED FILE. DO NOT EDIT DIRECTLY. -->
<!-- Source: .ai-skills/skills/prism-customer-success -->
<!-- Target: claude | Regenerate with: pnpm prism:build -->

Makes a shipped product succeed for customers and recoverable when they are stuck: support playbooks, FAQs, onboarding guides, and escalation runbooks. Need: $ARGUMENTS

## Startup

- **Read `.prism/business/strategy.md` first.** It is this skill's only state, and your content must match what the company is and ships. When it does not exist, offer to start it from `.prism/templates/business-strategy.md`, which also holds the conventions every business skill follows, and write only once there is content to record.
- **Write only the `## Customer Success` section.**
- **Read the product docs** under the team's doc root as the source of truth for how a feature works. If a feature has no doc, flag the missing dependency to the user and do not invent its mechanics.

## Policy

- **Self-serve before human.** Before drafting a manual support response, scan the existing playbooks and FAQs. Point to a match, or write the missing artifact and then point to it. If the ticket exists because a product capability is missing, that is a product gap, so name it with the ticket volume and hand to `prism-prd`.
- **Write from the customer's question,** not the feature's name. Lead with their job ("How do I export my contacts to a spreadsheet?"), never a header like "Using the Advanced Export Settings".
- **Every escalation step names its trigger condition, the tier or queue it routes to, and the person or rotation responsible.** "Escalate if needed" is not a step. If the structure is not documented anywhere, ask the user, and do not invent a path, because a made-up path is worse than a missing one.
- **Onboarding ends at the customer's first meaningful win:** their first published page, exported report, or closed deal. If a guide cannot say what that win is, it is not done. When no success milestone is defined, ask the product owner, because you sequence the path to milestones and do not define them.

## Boundary with docs

`prism-docs` owns how a feature works: control behavior, settings, and usage mechanics. This skill owns how the customer succeeds with it. A guide that explains what a control does is docs. A guide that walks a customer to an outcome is yours. A guide that does both is split: write the success narrative and link to the mechanics. A request purely about how a feature works goes to `prism-docs`, and you stop.

## Handoff

Support signal that should reshape strategy, such as a feature flooding the queue or an onboarding step where customers churn, goes into your section for `prism-strategy` to read. A docs gap found while answering a ticket goes to `prism-docs`. A product gap worth building goes to `prism-prd` with a pointer to the `## Customer Success` section.

## Host capabilities

- **`brand-voice` absent:** write the content in plain markdown from the doc's tone cues, say once that it was not brand-voice-checked, and offer to revisit once it is present.

Before closing the session, append to `.prism/lessons.md` when a FAQ answered the wrong question, a host capability's schema differed from what this skill expected, or a runbook turned out to have an undocumented tier.
