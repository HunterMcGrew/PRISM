---
Number: 0067
Title: The Runtime Ratifies Verdicts; the Model Only Proposes Them
Status: proposed
Date: 2026-06-25
---

## Context

PRISM today is almost entirely a guidance layer: skills and rules the model is *trusted to comply with*. "Load-bearing" currently means "the model complies." Every must-be-true claim a persona reports — did the tests pass, was the file written, who may write what — rides on that compliance. Off the strongest models, and even on them under orchestration, an unverified `done` propagates as truth.

Two readers pay for that gap. Sol (the Conductor) routes deterministically on a returned verdict — `report-back.md` states Sol "never interprets the work behind a verdict." That determinism is safe only if the verdict is true; today nothing checks it, so a false `done` makes Sol advance a phase on a lie. The same false `done` burns a human reading the verdict in a solo run. The primary goal of the enforcement-layer epic (`.prism/plans/epic-prism-enforcement-layer.md`) is to close this gap on Claude Code — orchestration and handoff integrity first; portability to smaller models is explicitly not a near-term driver.

A prototype (held by Hunter as a design output, not merged) proved the mechanism but carried three weak spots that this decision corrects: it wrote a *separate* `ratified-verdict.json` and posed "does Sol read the file or the model's claim?" as an open contract question (cross-worktree file-read problems); it keyed in-flight state by `session_id` (subagents share the parent's session, so fleet lanes collide); and it resolved persona identity through a shared mutable `active-persona` file (races under concurrency). The corrected mechanisms live in the plan's `## Decisions`; this ADR records the durable principle they all serve.

Alternatives considered for the principle itself:

- **Stricter prose Definition-of-Done checklists** — rejected. Still prose the model claims it followed; it moves nothing out of the trust layer.
- **A verification persona that re-checks every other persona** — rejected. Adds a dispatch and still self-reports — the re-checker's `done` is itself unverified.

## Decision

Correctness verdicts are computed from evidence by the runtime, not self-reported by the model. The model *proposes* a verdict; the gate *ratifies or overrides* it. This holds regardless of who invoked the persona — Sol or a human, orchestrated or solo.

The decision has four load-bearing parts.

**1. The inversion principle.** A `Stop`/`SubagentStop` hook computes the verdict from real exit codes and structural checks (did `tsc` exit non-zero, was the report file written, does the ownership glob match). An exit code cannot be argued past, which is exactly why it beats both prose checklists and a re-checking persona. The model still reasons toward the verdict — reasoning becomes the path to the gate — but the gate, not the reasoning, decides.

**2. Channel-hardening, not a competing verdict channel.** The hook does **not** create a separate `ratified-verdict.json` that Sol must learn to prefer. It *hardens the channel that already exists* — the model's own report/return. When the gates contradict a claimed `done`, the hook refuses to let the model stop (exit 2 → forced continue) and re-injects the real failure output. On the strike cap (3), it re-injects "emit your report as `needs-stronger-model` and stop," so the model's *returned* verdict is always gate-consistent before any reader sees it. `ratified-verdict.json` is retained only as an **audit artifact** (what ran, exit codes, strike count) — never a routing input. The consequence is that **Sol reads the model's structured return exactly as today; no Sol-side contract changes.** This is what makes the layer Sol-independent: Sol is a *consumer* of the hardened verdict, not a dependency of the enforcement. The Sol seam is therefore a one-line `lib/` reference edit, not its own ADR.

**3. Handoff is enforced as named and coherent, never auto-executed.** The report contract gains a required `next_route` field, shape-checked at the gate — a persona cannot stop without declaring where it hands off. `next_route` must be coherent with the verdict (`done` → normal next persona; `needs-replan` → Winston/user; `blocked` → human; `needs-fix` → implementer), the same check shape as Briar's `needs-fix ⇒ real blocker`. The ownership matrix already forces handoff negatively (Briar can't write source → must hand to Clove; Clove can't merge → must hand to a human); the required field makes it positive and checkable. The hard boundary: enforcement guarantees the handoff is *present and true* before stop — it never *auto-invokes* the next persona. Acting on the handoff (Sol auto-routes, or a human reads and dispatches) stays downstream and is identical in both modes. This preserves every skill's never-auto-invoke rule and the human gate.

**4. The factual-grounding bar — the ceiling, co-equal with the floor.** A second purpose of this epic, as load-bearing as trust, is to make the model *stronger and more reliable through the instructions themselves*. Vague skills let the model loop, over-reason, or under-reason because there is no concrete target. The ceiling pass rewrites vague judgment prose as named procedures, each holding to one bar: a procedure must name a concrete action the agent genuinely needs to take (a command to run, a file to read, an artifact to write, a decision to make), with a precise trigger and a typed escape. The escape is the anti-loop mechanism — a sanctioned exit instead of spinning. The precise trigger is the anti-over/under-reasoning mechanism — it calibrates how much to think and when to stop. A procedure that does not correspond to a real, factual action is aspiration, not instruction, and belongs in neither layer — aspiration dressed as procedure is worse than honest prose, because it invites the model to perform compliance with a step that has no real referent.

**The Briar ceiling caveat — name it so no later phase chases it.** A review-quality gate cannot exist. Briar's gate proves she *worked* and is *coherent* — the check-gates fired, and a `needs-fix` verdict is shape-validated against a real critical/major finding — never that she is *right*. Review quality rides on structural independence (a fresh dispatch plus `may_write: plan-only`), not on a gate that judges the quality of the review. Do not build a "review-quality gate" in any later phase; it is impossible by construction, and naming it here keeps a future contributor from spending the epic chasing it.

## Consequences

- **Positive:** A reported `done` becomes trustworthy to whoever consumes it — Sol or a human — independent of how capable the model is. Sol's deterministic routing stays safe because the verdict it routes on is gate-ratified before return. The floor enforces at the runtime boundary in both solo and orchestrated runs, so there is no mode where a false `done` silently bypasses the check.
- **Positive:** Hardening the existing channel instead of adding a competing one means no Sol-side contract change and no cross-worktree file read — the verdict travels by the model's own return, keyed in the hook's own worktree.
- **Negative:** The guarantee covers *provable* claims only — exit codes, file presence, ownership globs, shape-validity. Quality claims (is this review good, is this design sound) stay structurally trusted; the floor cannot and does not promise them. Future contributors must hold this line: a gate that claims to verify quality is a gate that lies.
- **Negative:** Every skill's Definition-of-Done section is reshaped to point at the gate data rather than restate a prose checklist, and the runtime now carries hooks that must stay in sync with the contract. Drift between the contract, the gates, and the hooks becomes a thing to guard (`prism:check`, Phase 4).
- **Neutral:** The floor scales by persona class (hard evidence gates / procedural gates / structurally-trusted) per the gate-strength taxonomy. The report contract and ownership matrix are universal; only the evidence gates scale. See the taxonomy architect doc for the class membership and what floor each class gets.

## References

- `.prism/plans/epic-prism-enforcement-layer.md` — the epic plan and the `## Decisions` that this ADR promotes (inversion principle, channel-hardening, handoff enforcement, factual-grounding bar, Briar caveat)
- `.prism/skills/prism-conductor/lib/report-back.md` — the authoritative verdict enum (`done` / `needs-fix` / `blocked` / `needs-replan` / `needs-stronger-model` / `needs-human`) and Sol's deterministic routing; the contract this floor hardens
- [ADR-0011](./0011-eric-never-approves-prs.md) — the human merge boundary is the one unconditional human gate; this floor never crosses it (enforcement names and verifies the handoff, but a human still merges)
- [ADR-0048](./0048-conductor-autonomy-between-gates.md) — Sol drives between gates and never clears one; a gate-ratified verdict is what makes that autonomy safe
- `.prism/architect/_toolkit/enforcement-floor.md` — the gate-strength taxonomy: the three classes, the universal contract + ownership primitives, and what floor each class gets
