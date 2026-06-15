---
Number: 0053
Title: Conductor — Integration Lane Marker Is a Nullable `type` Field; No Default Integration Persona
Status: accepted
Date: 2026-06-14
---

## Context

Phase C activates the `team` and `dependsOn` schema fields as run-control: named teams become lane-groups under one conductor, and `dependsOn` sequences cross-team work ([ADR-0049](./0049-conductor-teams-are-lane-groups.md)). The capstone is the integration gate — a pre-dispatch human checkpoint that fires when work from two or more teams converges into a lane that validates the combined result. To fire it, Sol has to recognize *which* lane is the integration lane, and the question is what marks it (`.prism/plans/epic-sol-conductor-phase-c.md`, Decision C-A4).

The marker combines with cross-team `dependsOn` to trigger the gate, so its shape has to be unambiguous and typo-safe — a marker that silently fails to match would disable the one gate Phase C exists to add. A second question rides along: once a lane is marked as integration, does the conductor know which persona to dispatch for it?

Alternatives considered for the marker:

- **(A) A `role` field.** Rejected — "role" collides conceptually with persona assignment. A lane's persona already *is* its role; a `role: "integration"` field next to a persona-bearing scope statement invites a reader to ask which one is authoritative.
- **(B) A named-lane convention** — e.g. the integration lane's `laneId` starts with `integration-`. Rejected — string-convention triggers are fragile and unschematized. A typo in the prefix silently disables the gate, which is the failure the marker exists to prevent.
- **(C) A nullable `type` field.** Chosen.

Alternatives considered for persona assignment:

- **(A) A default persona mapping in conductor config** — e.g. integration lanes default to Briar. Rejected — the right integration persona depends on what's being validated: a seam-architecture check is Winston, a review-and-test pass is Briar or a QA persona. A default would be wrong often enough to mislead, and a wrong default is worse than no default.
- **(B) Persona stays explicit in the lane's scope statement.** Chosen — this is already how every other lane's persona is assigned.

## Decision

**The integration lane marker is a nullable `type: "integration" | null` field on the lane, defaulting to `null` (ordinary lane).** The integration gate triggers on two conditions, both required: `type === "integration"` AND the lane's `dependsOn` edges span two or more distinct `team` values (at least one cross-team edge). A `type: "integration"` lane whose edges are all same-team does not trigger the gate, and an ordinary lane with cross-team edges does not either — the marker and the cross-team topology are an AND, not an OR.

**Persona assignment for an integration lane stays explicit in its scope statement — Phase C introduces no default integration-lane persona mapping.** The integration lane is a conductor-dispatched lane like any other; its persona follows the existing persona-assignment logic, where the lane's `scope` statement names the persona. Sol does not choose the persona — the decompose chain or the operator sets it in the scope. This keeps integration-lane persona assignment identical to every other lane's, rather than a special case the conductor has to reason about.

The `type` field is additive. A run with all-null `type` — every Phase A/B run — parses and dispatches identically; the field is read only by the integration-gate trigger.

This ADR is focused on the `type` marker. The companion Phase C seam for per-team model tiers (`teamConfig[].modelTier`) is a separate run-control concern recorded in the epic plan's `## Decisions` (C-A1), not folded in here — the two decisions share a phase but not a subject, and bundling them would blur what this ADR governs.

## Consequences

- **Positive:** A schematized `type` field is typo-safe in a way a string-prefix convention is not — a malformed value is a null (ordinary lane), a visible miss, not a silently disabled gate. Naming it `type` rather than `role` keeps "what kind of lane" and "which persona runs it" as separate concerns the reader never has to disentangle. No default persona mapping means integration-lane persona assignment reuses the one path every lane already uses, so there is no second assignment mechanism to keep coherent, and the persona is always the right one for what the lane actually validates.
- **Negative:** The two-condition trigger (`type === "integration"` AND cross-team `dependsOn`) is a conjunction a reader and a reviewer have to hold — marking a lane `type: "integration"` is not sufficient on its own, and a same-team integration lane that the author *expected* to gate will silently not, which can surprise someone who reasoned from the marker alone. The absence of a default persona means an integration lane with a scope statement that omits the persona has no fallback; the scope statement carries load it must not drop.
- **Neutral:** No schema change — `type` already ships nullable in `goal-state` v2 alongside `team` and `dependsOn`; Phase C drives it as logic, never a version bump. The marker is config-driven and tracker-agnostic — the `type` value lives in goal-state run-control (Sol's channel), never in a Linear or GitHub ticket body.

## References

- `.prism/plans/epic-sol-conductor-phase-c.md` § Decisions C-A4 — the decision this ADR records, with the marker and persona-assignment alternatives; C-A1 holds the companion `modelTier` seam kept out of this ADR
- `.prism/prds/sol-conductor-phase-c-teams.md` — the Phase C PRD (FR-5; the integration-gate trigger and persona-assignment requirements)
- [ADR-0049](./0049-conductor-teams-are-lane-groups.md) — the `team` field and flat `lanes[]` model the cross-team trigger reads
- [ADR-0054](./0054-conductor-integration-gate-always-human.md) — the always-human gate behavior this marker triggers
- `.prism/skills/prism-conductor/lib/goal-state.md`, `lib/fleet.md` — the schema field notes that add `type` and the integration-gate trigger and persona-assignment-via-scope sections that drive it
