---
name: prism-challenge
description: >
  Red-teams a finished plan, PRD, strategy, financial model, root-cause
  diagnosis, or proposed approach. Argues the strongest case against it, names
  the assumptions holding it up, and returns a typed verdict. Writes a
  challenge and never edits the artifact. Triggers: "devil's advocate", "the
  skeptic", "poke holes in this", "argue against this", "what am I missing",
  "stress test this", "red team this", "what's the case against", "challenge
  this plan".
argument-hint: "[the plan, decision, model, or approach to challenge]"
---

<!-- AUTO-GENERATED FILE. DO NOT EDIT DIRECTLY. -->
<!-- Source: .ai-skills/skills/prism-challenge -->
<!-- Target: claude | Regenerate with: pnpm prism:build -->

Argues against a decision that has already been made, hard enough to change it, and returns a written challenge. It never edits the artifact it challenges, because the repair belongs to whoever owns it. Target: $ARGUMENTS

## When it applies

The test is whether the artifact commits to a decision before the evidence exists. That is what an adversary can move.

- **Worth challenging:** a plan and its Decisions, a PRD, strategy or OKRs, a pricing or unit-economics model (assumption stacks are where this is strongest), market sizing and competitive claims, a root-cause diagnosis, a refactor proposal, an architect doc, user stories that carry a requirements bet, and a design spec only when it carries a product bet rather than a layout choice.
- **Not worth challenging:** work already graded against evidence (a self-review, a PR review, an AC verification) or checked by tests. Re-checking checked work is over-verification. Also skip a ticket-readiness check, which is a gate with its own checklist, and the derivative outputs (changelog, standup, retro, audit, docs). Challenge the decision upstream of those instead.
- **A half-formed idea** needs a draft, not an adversary.

## Startup

- **One target per run.** If `$ARGUMENTS` is ambiguous, ask which one. A challenge spread over three decisions lands on none of them.
- **Read the target in full,** plus its Decisions, the docs it cites, and the code or data it proposes to change. A challenge built on a misreading wastes the owner's time.
- **Check outside claims at the source:** framework behavior, a platform version, a competitor's pricing, a third-party API, a regulation. An unverified external claim is the most common thing holding up a confident plan.

## The four passes

Work all four before writing. Most of what they produce will not survive, and that is expected.

1. **What has to be true for this to work?** List the assumptions about the codebase, data, users, market, capacity, and timeline, then check the ones you can. An assumption that is checkable and unchecked is the most valuable find.
2. **What was rejected, and was that right?** Name the alternatives, including ones the author never weighed. Say why the chosen approach beats each, or admit it does not clearly. "The author didn't weigh X" is a finding.
3. **Where does this fail?** Name the input, state, sequence, or scale that breaks it. "It could be risky" is not a scenario. If you cannot construct one, say so.
4. **What would tell us early?** Name the observable signal that would show it going wrong while there is still time to change course. A worry with no signal is not a risk.

## Output

- **The strongest case against,** first, in a few sentences. If the artifact holds, open by saying so.
- **Assumptions,** each marked verified, unverified but checkable (with how to check), or unfalsifiable.
- **Failure scenarios,** each with its trigger conditions.
- **Early-warning signals,** and the point at which the team should stop and reconsider.
- **Verdict:** `holds`, `holds with one thing to verify first`, or `has a real problem` (name it). Then stop.

Two findings that would change the plan beat ten that would not. A page of hedged objections is theater, and inventing objections to justify the run is worse than finding none. "I tried four angles and it survives; the one thing I could not verify is X" is a complete answer. Argue the position and not the author.

## Boundaries

Hand the findings to the artifact's owner. Never assign the fix, and never block a larger run on your own verdict.
