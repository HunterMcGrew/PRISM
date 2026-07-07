---
Number: 0068
Title: The Retro Charter, Universal Two-Grain Cadence, and the Retro Gate
Status: accepted
Date: 2026-07-06
---

## Context

The operator posed a six-item retro charter: (1) did we do what we said we'd do, (2) were there issues or bottlenecks, (3) actionable improvements, (4) did we follow code standards, (5) did we do anything wrong, (6) are the tests passing (read as: what did the CI record show). An evaluation against this charter surfaced two defects and a design gap.

**Advisory calendar cadence empirically under-fires.** Zoe's weekly-advisory cadence produced one audit in six weeks (`.prism/audits/` holds a single report). Iris never ran at all before this decision — no cadence was named for her, just "explicit invocation." Atlas is the reconciling case: its per-install event fires reliably because the event blocks something the user wants. Hook enforcement to force cadence was tried and reverted (`.prism/plans/epic-floor-revert.md`) — mandatory gates are off the table.

**Charter items 1/4/5/6 are unanswerable from plan sections alone.** AC-vs-shipped (item 1) needs the merged diff. Standards adherence and "did we do anything wrong" (items 4/5) live half in the plan (Briar writes `## Review Issues`) and half in Eric's PR threads — his default in-branch review mode explicitly skips plan writes. CI history (item 6) lives only in check-run conclusions. A plan-only retro cannot answer its own charter regardless of how well write-back is repaired; two-source evidence (plan = intent, execution record = outcome) is a precondition, not an enhancement. Iris's prior sparse-evidence guard ("fewer than two entries across four sections") could never fire on a real plan — `## History` alone always clears it — so this starvation passed silently.

**A GitHub+CI-hardcoded evidence reader would reintroduce the same failure one layer down.** Reading merged diffs, PR threads, and CI conclusions only via `gh` and GitHub Actions makes the charter-coverage table honest for a GitHub+CI team but silently mislabels "we don't read that source" as "that source had nothing" for a team with no CI or a different PR platform.

Alternatives considered for the retro's classification and shape:

- **Plan-only retro + aggressive write-back** — rejected. Write-back repairs the durable record but can never carry CI history or AC-vs-diff verification; the charter stays half-unanswerable no matter how disciplined the write-back gets.
- **GitHub-native retro, plan demoted to one source among many** — rejected. The plan is the content bus and the intent record; demoting it turns the retro into a changelog, not a divergence audit.
- **Separate retro implementations per context or grain** — rejected. One-source-of-truth violation; the contexts (standalone, gate, Sol dispatch) and grains (per-PR, epic) differ only in trigger, scope, and evidence delivery — one engine parameterized by `grain` covers all of them.
- **Reclassifying Iris as a utility skill** (ADR-0046's test) — rejected. A utility runs in the invoking persona's voice; the invoking personas are the retro's subjects, and once the retro's verdicts gate promotions, the verdict-issuer must not be the decision-author. Reclassification also fails the deletion test — it deletes ~40 lines of voice while the six-step machine and divergence classification (the actual complexity) remain.
- **Epic-only gate, propose-not-auto under Sol** — rejected. Most work never reaches an epic boundary, so an epic-only gate leaves every single-ticket close un-nudged; "propose, don't dispatch" under Sol squanders the one context that holds both the trigger authority and the evidence.
- **Mandatory execution of the gate** — rejected. Fresh precedent against forced gates (the floor revert); forced retros on trivial tickets are the theater risk the two-grain design exists to avoid.

## Decision

**(a) The retro is a charter-driven, two-source divergence audit.** Plan sections carry intent (what was decided, what was supposed to happen); the execution record — merged diffs, PR review threads, CI conclusions — carries outcome (what actually happened). Every charter item is answered from whichever source can answer it; an item neither source can answer is reported as unanswered, never papered over.

**(b) One engine, universal plan-close gate, two grains, plus explicit invocation.** Every plan close (ticket or epic) records a visible, declinable `> Retro:` verdict line (`<path>` or `declined — <reason>`). The gate runs at two grains: a light per-ticket/per-PR fidelity check (plan-AC vs. merged diff, own CI, own review — mechanical, cheap enough for every ticket, no persona dispatch required) and a heavy epic-level divergence audit that aggregates the per-ticket fidelity notes (map-reduce: per-PR = map, epic = reduce). The theater risk a universal gate raises — heavyweight synthesis on trivial tickets — is answered by grain, not by exempting trivial plans; an exemption would re-open the silent-skip hole. Explicit invocation remains available alongside the gate.

**(c) Under Sol, auto-dispatch at both grains.** Sol holds both the trigger authority and the evidence a retro needs at run close, so this is the one context where the retro is genuinely involuntary — Sol auto-dispatches Iris (both grains) rather than proposing, and every dispatch and outcome is recorded in the run report (on-the-loop, never dark).

**(d) The charter-coverage invariant.** Every report carries a `## Charter coverage` table — one row per charter item, each marked answered or unanswered, with an unanswered row naming its gap as either a missing/unreachable source or `not configured for this team`. An unqualified "no divergences" conclusion is never emitted when any charter item is unanswerable.

**(e) Evidence sources are Atlas-configured per team, not hardcoded to GitHub+CI.** A `retroEvidence` config block (`.ai-skills/config.json`) declares which execution-record sources exist for this team — CI presence and system, PR/review platform, test command, DoD gates. Atlas populates it during onboarding, proposing defaults from stack detection. A source the config marks absent renders as `not configured for this team`, distinct from `configured but unreachable this run`.

**(f) Write-back tightening runs in parallel.** Eric's in-branch mode still skips plan writes, but the downstream obligation sharpens: Clove records non-trivial PR-review findings as `## Review Issues` entries (not compressed into a `## History` one-liner) when fixing them. Non-trivial CI/build failures fixed inline earn a `## Debugged Issues` entry even without a debugger session. This repairs the durable record in parallel with the two-source read — it does not substitute for it.

**(g) Cadence axis carries calendar and event-bound rhythms.** Iris's cadence is named event-bound — per plan close, at two grains — refining ADR-0037's axis (which already accommodates Atlas's per-install event) rather than contradicting it. The defect was an unnamed rhythm, not a wrong axis.

**(h) Iris remains a persona; the invariant binds judgment verdicts, not mechanical ones.** ADR-0046's test is re-applied per grain: at epic grain, Iris issues judgment verdicts (divergence classification, promotion cautions) that Winston — the closer, often a decision-author — consumes; reflector ≠ closer is load-bearing. At per-PR grain, the fidelity check is mechanical (does the merged diff satisfy the stated AC, yes/no; did CI pass, yes/no) and needs no neutral persona — it can run inline as a checklist inside the existing close pass. The neutrality invariant binds judgment verdicts that gate promotions, not a mechanical AC-vs-diff diff.

**(i) The Before-Closing ceremony restructures into reflect-then-close.** Iris reflects (read-only: charter verdicts, action items, lesson candidates, promotion cautions); Winston closes (consumes promotion cautions into the Decision verdict gate — a refuted Decision is promoted as corrected or demoted to a lesson, never promoted unchanged — then promotes, records `> Retro:`, marks closed). This mirrors authors-ship-reviewers-review: deciders close, reflectors verify. Placement stays pre-merge-on-final-branch per ADR-0047; the charter-coverage table names the final-child CI approximation at epic grain.

## Consequences

- **Positive:** A starved retro is now loud instead of silent — every report states exactly which charter items it could and couldn't answer, and why.
- **Positive:** The retro fires far more often (every plan close, both directions of the gate) instead of never, without imposing epic-scale cost on every ticket — the two-grain split makes the cheap path genuinely cheap.
- **Positive:** The charter-coverage table stays honest for teams without CI or without a GitHub-hosted PR platform, because sourcing is config-driven rather than hardcoded.
- **Positive:** Today's ceremony could promote a Decision the execution record had already disproved; the reflect phase closes that gap without handing promotion authority to the reflector.
- **Negative:** Iris's evidence-gathering step (step-02) grows meaningfully more complex — config gating, runtime-reachability gating, grain switching, and per-PR-note ingestion all live in one step.
- **Negative:** The `retroEvidence` config block is one more onboarding question set Atlas must ask and one more schema surface `config.schema.json` must validate.
- **Neutral:** The per-PR fidelity check's mechanical nature means it can run without a persona dispatch (inside Briar's or Clove's close pass) — this is a deliberate cost optimization, not a demotion of the retro's rigor; a per-PR retro that surfaces a real divergence still escalates to a full Iris dispatch.

## References

- `.prism/plans/iris-cadence-starvation.md` — the plan and its `## Decisions` this ADR promotes
- [ADR-0037](0037-cadence-driven-personas.md) — the cadence axis this decision refines
- [ADR-0040](0040-atlas-as-onboarding-persona.md) — the event-bound + per-team-config precedent
- [ADR-0046](0046-persona-vs-utility-skill-type.md) — the persona-vs-utility test, re-applied per grain
- [ADR-0047](0047-plans-are-preserved-at-close.md) — the pre-merge-on-final-branch placement, preserved
- [ADR-0048](0048-conductor-autonomy-between-gates.md) — Sol's auto-dispatch at a phase boundary as his native verb
- `.prism/plans/epic-floor-revert.md` — the hook-enforcement revert that rules out mandatory gates
- The authors-ship-reviewers-review decision (`.prism/architect/_toolkit/skills-ecosystem.md` § Authors ship, reviewers review) — the reflector ≠ closer precedent this decision mirrors
