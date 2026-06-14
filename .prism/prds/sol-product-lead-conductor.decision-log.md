# Decision Log — Sol as a self-growing product-lead conductor

Audit trail for the `sol-product-lead-conductor` PRD. Each entry captures a decision Parker made while drafting, with the alternative considered and the reason for the choice.

## 2026-06-13T23:29:59Z — Stakes calibration

- **Decision:** `internal` stakes level.
- **Alternative considered:** `launch` — treating the multi-team distribution (SPC + future consumers) as multi-tenant blast radius.
- **Reason:** the capability is developer tooling, dogfooded, distributed across PRISM-consuming teams — real blast radius (autonomous ticket creation, autonomous token spend) but not customer-facing or regulatory. `internal` rigor (standard PM depth, decision log on, rubric runs, scoped assumptions allowed to survive draft) fits; `launch`'s zero-assumption bar would block on design parameters that are correctly left to Winston's plan.

## 2026-06-13T23:29:59Z — Draft mode

- **Decision:** fast path.
- **Alternative considered:** coaching path.
- **Reason:** the brain dump is a fully-resolved, pressure-tested architecture record (§7 of the vision brief), so the PM thinking the coaching path stress-tests is already done. Fast path batch-drafts from §7 and tags `[ASSUMPTION]` only at genuine gaps.

## 2026-06-13T23:29:59Z — v1 scope boundary

- **Decision:** v1 = Phase A discovery loop + decision box + two-axis convergence governor + registry/dedup. Phases B (hierarchy + greenfield), C (teams), D (scale) named and scoped out.
- **Alternative considered:** bundling hierarchy (Phase B) into v1 since it shares the reconcile-delta primitive.
- **Reason:** §7.8's recommendation — Phase A is highest value, smallest blast radius, and builds the primitive every later phase reuses. Bundling B widens v1's blast radius for a capability that's cheaper *after* A ships.

## 2026-06-13T23:29:59Z — Breadth-gate threshold

- **Decision:** configurable, default 12.
- **Alternative considered:** default 8 (more conservative); or leaving it as an `[ASSUMPTION]` for benchmark-driven tuning.
- **Reason:** user calibration. Matches the tunable-governor pattern already used for the dispatch budget and generation cap; the ~dozen strawman becomes a shippable default rather than a blocking unknown.

## 2026-06-13T23:29:59Z — goal-state v2 ships full additive field set in v1

- **Decision:** v1 ships the full additive nullable schema (including later-phase `team` / `dependsOn`), but v1 logic drives only the discovery-loop subset; `parentId` ships with discovery-lineage meaning now, tree semantics in Phase B.
- **Alternative considered:** ship only the fields v1 drives, add later-phase fields with their phases.
- **Reason:** §7.2 frames the deltas as one additive, nullable, backward-parsing set. One migration now is cheaper than two, and additive nullable fields cost nothing at rest. Recorded as [ASSUMPTION-2] for Winston to confirm — the YAGNI counterargument is live enough to flag rather than settle unilaterally.

## 2026-06-13T23:29:59Z — Reviewer rubric pass

- **Decision:** ran all three rubrics (product-fit, technical-feasibility, clarity); applied all 11 minor findings as fixes.
- **Alternative considered:** accepting the two product-fit findings as-is.
- **Reason:** zero critical/major findings. All 11 were concrete, low-risk improvements; two (the "resolved, pressure-tested" descriptor and the Phase D "reframed" note) were session-context leaks that violate `writing-voice.md`, so applying was non-optional. The pass added [ASSUMPTION-6] (dispatch-budget default) — a genuine gap the technical-feasibility rubric surfaced.

---

Subsequent decisions appended below as the PRD evolves.
