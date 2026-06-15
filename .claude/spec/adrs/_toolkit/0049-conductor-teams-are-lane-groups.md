---
Number: 0049
Title: Conductor — Teams Are Lane-Groups, Not Sub-Conductors
Status: accepted
Date: 2026-06-14
---

## Context

The Sol product-lead vision (`.prism/plans/sol-product-lead-vision-brief.md`) wants Sol to run several specialized teams — a backend team and a frontend team and more — in parallel, each with its own flow and queue. The brief's open question Q1 framed the fork directly: is a "team" a **nested Sol** (its own conductor running its own fleet) or a **labeled grouping of lanes** under the one conductor? Q5/Q7/Q8 piled on — scale ceiling, nested budgets, autonomy granularity — all of which only exist if teams are sub-conductors.

The fork is not a style preference; the runtime settles it. PRISM's fleet runs on the Workflow engine (`.prism/skills/prism-conductor/lib/fleet.md`, `.ai-skills/skills/prism-conductor/claude.md`), and that engine has two hard properties: it **forbids nesting deeper than one level** — a `workflow()` call inside a child workflow throws — and a nested workflow **shares the parent's concurrency cap, agent counter, and token budget**. The per-run concurrency cap is ~12 (`min(16, cores-2)`), and nesting does not raise it.

Alternatives considered:

- **(a) Sub-conductors — a nested Sol per team.** Rejected on runtime grounds, not postponed. It is structurally blocked (the engine throws on the second nesting level) *and*, even if it ran, a nested conductor would share the parent's single ~12-agent cap and one budget — so it buys **zero** throughput while adding nested-budget and nested-escalation complexity (the brief's Q7/Q8).
- **(b) Teams as lane-groups — data on the flat lane list.** Chosen. A "team" is a `team` field on the existing flat `lanes[]`, scheduled by the one conductor that already owns the cap, the conflict gate, and the budget.

## Decision

A team is **data, not a control structure**. Sol stays the single conductor. Team membership, hierarchy, and cross-team dependencies are expressed as fields on the existing flat `lanes[]` in goal-state — `team: string | null`, `parentId: laneId | null` (epic→issue→ticket modeled as parent pointers over the flat list, never nested objects), and `dependsOn: laneId[]` — not as nested conductors or recursive run structures.

Sub-conductors / nested Sol are a **standing invariant rejection**, not deferred scope: no design in any phase may introduce a conductor that dispatches another conductor. The invariant that produced ADR-0048 holds — *Sol dispatches, never does* — and it now carries a corollary: *there is exactly one Sol per run.* Scale is answered by batching against the concurrency cap and (later) partitioning the single goal-state file, not by delegation depth.

## Consequences

- **Positive:** Phase C (teams) no longer depends on a Phase D (sub-conductors) — the original phasing collapses, and "Phase D" is reframed as "Scale: batching + state partitioning." One conductor keeps one cap, one budget, one conflict gate, and one escalation table; cross-team sequencing rides the `dependsOn` edges the conflict gate already understands the shape of. The brief's Q7 (nested budgets) and Q8 (per-team autonomy ceilings) dissolve — there is one run-wide budget and one autonomy ceiling.
- **Negative:** A single conductor is a single scheduling bottleneck — dozens of lanes across teams contend for one ~12-agent cap, so true parallelism is capped regardless of how many teams are named. Teams are an organizing and dependency-sequencing convenience, not a throughput multiplier; an operator who reads "teams" as "more concurrent work" will be surprised. Mitigation: the cap and the batching strategy are the real scale levers, and they live where they always have — one place.
- **Neutral:** `team` and `dependsOn` ship in the v2 schema as nullable-now and are not driven until Phase C; `parentId` ships driven for discovery lineage in v1 with its tree meaning arriving in Phase B (see [ADR-0050](./0050-conductor-growth-loop-and-convergence-governor.md) and the epic plan's `## Decisions`). The fields are present so old runs parse forward; their later-phase semantics are explicitly provisional.

## References

- `.prism/plans/sol-product-lead-vision-brief.md` § 7.1 — the team-model resolution this ADR records, and § 2/§ 4 for the brief's open questions
- `.prism/prds/sol-product-lead-conductor.md` — the v1 PRD (Won't-this-time: sub-conductors)
- `.prism/plans/epic-sol-product-lead-conductor.md` — the epic plan that builds on this decision
- [ADR-0048](./0048-conductor-autonomy-between-gates.md) — Sol dispatches, never does; this ADR adds the one-Sol-per-run corollary
- `.prism/skills/prism-conductor/lib/fleet.md` — the fleet contract and concurrency cap this decision is grounded in
- [ADR-0050](./0050-conductor-growth-loop-and-convergence-governor.md) — the growth loop and convergence governor that run on the flat lane list this ADR keeps flat
