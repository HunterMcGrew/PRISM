---
Number: 0054
Title: Conductor — The Integration Gate Is an Unconditional Human Gate, Including at `hobby`
Status: accepted
Date: 2026-06-14
---

## Context

Sol drives the lifecycle autonomously between human gates but never clears one itself ([ADR-0048](./0048-conductor-autonomy-between-gates.md)). Most gates are *confidence-gated* by a human-set autonomy policy: at `hobby` stakes Sol may auto-clear a gate the owning persona would otherwise route to a human; at `internal`/`launch` the same gate stops for a human. Phase C adds the integration gate — a pre-dispatch checkpoint that fires when a `type: "integration"` lane's `dependsOn` edges span two or more teams ([ADR-0053](./0053-conductor-integration-lane-type-marker.md)). The question is whether the integration gate follows the confidence-gated pattern, or whether it is unconditional like the merge gate (`.prism/plans/epic-sol-conductor-phase-c.md`, Decision C-A5).

The risk the gate guards is specific: two teams' independently-built work converging into one lane that merges and tests the combined result. If that gate auto-clears, two teams' work merges and is validated with zero human eyes — the one moment where cross-team assumptions collide is exactly the moment no one is looking. This is categorically different from a within-lane decision (a copy choice, a refactor judgment) that confidence can reasonably satisfy at low stakes.

The merge gate is already unconditional for the same shape of reason — merging is the last point a wrong change can be stopped, so no autonomy level clears it ([ADR-0011](./0011-eric-never-approves-prs.md), and the merge-side complement in `git-conventions.md`). The integration gate sits one step earlier in the same risk chain: it gates the *convergence* that merge later seals.

Alternatives considered:

- **(A) Confidence-gated, like most gates.** At `hobby`, integration lanes auto-dispatch; at `internal`/`launch`, they stop for a human. Rejected as the default — it adds an autonomy-level conditional to the gate logic and creates a path where two teams' work integrates with zero human review, defensible only if `hobby` runs are judged genuinely throwaway.
- **(B) Always `needs-human`, at every autonomy level including `hobby`.** Chosen. One rule, no branching; a categorical sibling of the merge gate.

The technical cost of either choice is one conditional. The risk asymmetry — the downside of a wrong auto-cleared integration is two teams' merged-and-tested work no human saw — favors always-human. Hunter ratified always-human at the plan-ready gate (2026-06-14); this ADR records the ratified decision.

## Decision

**The integration gate is `needs-human` at every autonomy level, including `hobby`. It never auto-clears.** When a `type: "integration"` lane's `dependsOn` lanes all reach `done` and the lane's edges span two or more teams, Sol surfaces the gate to the operator and holds dispatch until the operator approves or escalates — regardless of the run's autonomy policy.

This makes the integration gate the **second unconditional `needs-human` gate, alongside merge.** The two differ in enforcement, not in unconditionality: merge is enforced by branch protection (a human clicks merge), while the integration gate is enforced by Sol's dispatch logic (Sol holds the integration lane until the operator clears it). Both are categorical — there is no autonomy-level branching in either gate's trigger.

The integration gate is **distinct from the confidence-gated autonomy pattern** of [ADR-0048](./0048-conductor-autonomy-between-gates.md). That pattern governs within-lane decisions a per-run autonomy ceiling can satisfy. The integration gate is a cross-team *convergence* checkpoint — not a routine decision confidence can reasonably clear, but a structural point where two teams' assumptions meet and a human is the only adequate reviewer.

## Consequences

- **Positive:** Always-human is the simpler implementation — the gate is one rule with no autonomy-level conditional, where a `hobby` exemption would add a branch and a path to verify. It makes the integration gate a categorical sibling of the merge gate, so a reader who understands "merge is always human" already understands the integration gate's shape. It closes the one cross-team risk that matters — two teams' work merging-and-testing unreviewed — under every autonomy policy, including the one (`hobby`) where every other gate relaxes.
- **Negative:** A `hobby`-stakes run that the operator *intended* to be fully autonomous still stops at the integration gate — the gate does not relax for genuinely throwaway runs, so an operator running a low-stakes cross-team experiment pays a human-gate stop they may not want. This is the deliberate cost of the categorical rule: the safety of "no cross-team integration is unreviewed" is bought by removing the operator's ability to waive it at low stakes. If a future run pattern makes this stop genuinely unwanted, the change is a new ADR superseding this one, not a quiet conditional.
- **Neutral:** No schema change — the gate's behavior is dispatch logic over the existing `type`, `team`, and `dependsOn` fields. Per-team autonomy overrides are explicitly out of Phase C (epic plan Decision C-A3, deferred to Phase D); this ADR assumes one run-wide autonomy ceiling, and the integration gate holds regardless of where that ceiling sits.

## References

- `.prism/plans/epic-sol-conductor-phase-c.md` § Decisions C-A5 — the decision this ADR records, with the always-human-vs-confidence-gated alternatives and the Hunter ratification at plan-ready
- `.prism/prds/sol-conductor-phase-c-teams.md` — the Phase C PRD (NFR-4, the never-auto-clears requirement; FR-5, FR-6 for the gate trigger and report)
- [ADR-0011](./0011-eric-never-approves-prs.md) — the merge gate this gate is the categorical sibling of (the unconditional-human-gate precedent)
- [ADR-0048](./0048-conductor-autonomy-between-gates.md) — the confidence-gated autonomy pattern this gate is explicitly distinct from
- [ADR-0053](./0053-conductor-integration-lane-type-marker.md) — the `type: "integration"` marker plus cross-team `dependsOn` that triggers this gate
- `.prism/skills/prism-conductor/lib/fleet.md`, `lib/report-back.md` — the integration-gate trigger/behavior and the gate-registry row that bind Sol to this decision
