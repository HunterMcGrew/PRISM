# Plan: epic-prism-pattern-absorptions-wave-2

## Ticket

Wave 2 of pattern absorptions from Matt Pocock + BMAD-METHOD research. Builds on [Phase 1.5e](./epic-prism-pattern-absorptions.md), which absorbed seven non-persona patterns. Wave 2 covers the persona-specific deepenings Phase 1.5e intentionally scoped out — five existing personas get targeted upgrades, one new persona (Iris) lands, two cross-cutting patterns sweep across all personas. Ships as **five sequenced PRs** per the subagent re-evaluation finding.

No Linear ticket yet — assign one before opening the first PR.

## Goal

Extend the BMAD/Pocock absorption pass with persona-specific changes:

- **Sasha** — restructure into six explicit diagnostic phases (with Phase 5 adapted to design-only, preserving the diagnose-only boundary), add evidence grading (`[Confirmed]`/`[Deduced]`/`[Hypothesized]`), add lighter-variant case-file resumability via `.prism/sasha-state.json`.
- **Eric** — restructure into a 3-section output (Standards / Spec / Cross-cutting) with parallel subagents enforcing non-merging; lightweight path stays single-pass.
- **Winston** — three composing changes: tag `[HITL]` tasks (`[AFK]` is unmarked default), add Re-plan Mode as a top-level mode, offer vertical-slicing before task generation based on a refined signal set; vertical slices count as epic stories under Epic Detection.
- **Parker + Atlas** — single pre-write STOP markers at the strongest correction points (end of Parker stakes step, end of Atlas Batch-2 survey), with stakes-aware and mode-aware skipping.
- **Iris** — new retrospective persona, multi-voice format using the actual PRISM persona roster, evidence-driven disagreements (re-litigate `## Decisions` against `## Debugged Issues`), action items routed to Nora for follow-up filing.
- **Cross-cutting** — extract triple-gate to `.prism/references/triple-gated-adr-criterion.md`, codify lazy-artifact rule (most personas already lazy — scope shrinks to rule + one template fix), synthesize closing-message routing from existing AGENTS.md § 9 table into `.prism/architect/closing-messages.md`.

---

## User Stories

Not applicable — internal toolkit deepening. The "users" are the personas that pick up these patterns on the next invocation; no end-user behavior changes.

---

## Design

Not applicable — no UI work.

---

## Scope this wave does NOT touch

Items considered and explicitly skipped (rationale in `## Decisions`):

- **Token-compression "caveman" mode** (Pocock) — conflicts with verbose-by-design handoff format
- **PRFAQ Working-Backwards layer** (BMAD) — over-engineering above Parker
- **Quick-dev fast-track lane** (BMAD) — undermines planning discipline (ADR-0009, ADR-0024)
- **Standalone implementation-readiness gate** (BMAD) — Winston does this implicitly
- **customize.toml three-layer overrides** (BMAD) — YAGNI; no team has asked
- **Numbered lifecycle folder structure** (BMAD) — persona names already carry order
- **HTML temp-dir reports** (Pocock) — markdown is diffable, repo-resident
- **Standalone correct-course skill** (BMAD) — folded into Winston as Re-plan Mode
- **Checkpoint-preview HITL walkthrough** (BMAD) — Clove's closing summary + diff already covers this
- **Halt-at-checkpoints as configurable feature** — YAGNI; default-off skill features rot. Forward-looking note added to `.prism/architect/onboarding.md` only.
- **BMAD's third adversarial-hunter layer (Edge Case Hunter)** — two axes is enough for PRISM PR sizes; third subagent triples API cost without clear payoff
- **Scripted-character retrospective format** (BMAD) — Iris uses real persona roster instead; evidence-driven disagreement, not theater
- **Per-step file machine for Sasha** — case file is single-state-file lighter variant; gate #2 of the micro-file pattern is weak for diagnostic sessions

---

## Implementation Tasks

Tasks meet the detail bar in [`.prism/rules/implementation-task-detail.md`](../rules/implementation-task-detail.md). All persona edits target canonical sources at `.ai-skills/skills/<id>/shared.md`. Tasks tagged `[HITL]` need a human decision before execution can start; default is unmarked (`[AFK]` per the new tag rule extracted in PR 1). Task numbers are stable across PRs — the PR split in `## Dependencies and Sequencing` references these numbers.

### PR 1 — Foundation (small additive surface)

**Clove (implementation)**

1. **Extract triple-gate to `.prism/references/triple-gated-adr-criterion.md`** — Theo's shared.md (line 55) already points at this file; it doesn't exist. Phase 1.5e left the gate inlined in Winston with a roadmap fallback citation. Reference doc shape mirrors `stakes-calibration.md` and `micro-file-step-machine.md`. Update Winston's `## Immediate Decision Promotion` section to cite the new doc; update Theo's fallback note (line 55, line 92) to cite it directly.

2. **Write `.prism/rules/lazy-artifacts.md`** — codify the lazy-creation pattern already followed by most personas. Rule content: (a) personas do not create empty/header-only files at install time or session start, (b) files are created when content is being written, never as placeholders, (c) state files return null/sentinel on absent rather than auto-initializing, (d) cite canonical patterns (Theo state, Pixel mocks dir, Zoe audits dir), (e) cite the anti-pattern (lessons-archive seed). Short prescriptive file.

3. **Switch `templates/install/.prism/lessons-archive.md` to lazy creation** — current file is a 5-line header-only placeholder. Remove from install template; have Zoe's archive step create the file with the header on first archive. Verify by checking `wc -l templates/install/.prism/lessons-archive.md` post-edit (file should not exist) and that Zoe's shared.md instructs creation on first archive.

4. **Quick read on `templates/install/.prism/architect/manifest.stub.json`** — subagent flagged this as a potential lazy candidate. If it contains only `{}` or trivial structural shape, switch to lazy following task 3's pattern. If it carries schema-required fields consumers depend on, leave it and document the exception in the lazy-artifacts rule. [HITL] — decision based on file contents.

5. **Add the AFK/HITL tag rule to `.prism/rules/implementation-task-detail.md`** — extend the rule's "How to apply — Winston's Implementation Tasks" section with a 5th bullet defining the tag. Tag goes immediately after the task number, before the title. **Default is unmarked (`[AFK]` implicit); only `[HITL]` is tagged explicitly.** `[HITL]` definition: task needs human decision before execution can start (e.g., `OPEN —` Decision blocks it, stakeholder approval gate, benchmark needed before algorithm lock). Cite Pocock's `to-issues` as source. Note the deliberate contradiction with Pocock's "avoid file paths in issues" guidance — PRISM tasks are session-local execution units, not customer-facing tickets.

6. **Write `.prism/architect/closing-messages.md`** — synthesize the routing data from `AGENTS.md § 9 Ownership & Handoff` into per-persona contextual routing tables. Each persona gets a row covering: default next persona, conditional routes, phrasing pattern. Document the recommend-without-auto-invoke posture (closing messages suggest; never auto-invoke the downstream persona). Architect doc, not rule — contextual guidance is not universally loaded. Iris omitted from initial table (added in PR 5).

7. **Update each persona's `shared.md` with a `## Next persona` section** — 3–5 lines citing `.prism/architect/closing-messages.md` and providing that persona's specific routing row. Personas covered in PR 1: Nora, Mira, Pixel, Winston, Clove, Briar, Eric, Sasha, Eli, Sage, Reese, Parker, Theo, Ren, Zoe, Lilac, Atlas. (Iris's routing added with the persona itself in PR 5.) Use Nora's existing step 11 ("next steps") and Pixel's "Flagging for Winston" handoff as the phrasing template.

8. **PR 1 build + verify** — run after tasks 1–7:
   ```bash
   pnpm prism:build
   pnpm prism:check
   pnpm prism:check-types
   pnpm prism:test
   ```

**Eli (documentation)**

9. **Update Eli's awareness of the closing-message pattern** — small note in Eli's `shared.md` acknowledging the cross-cutting closing pattern so future docs cite it.

### PR 2 — Sasha upgrades

**Clove (implementation)**

10. **Restructure Sasha into six explicit phases, adapted for diagnose-only scope** — file: `.ai-skills/skills/prism-debugger/shared.md`. Phases:
    - **Phase 1: Feedback Loop (deliverable, not precondition)** — produce a fast deterministic pass/fail signal. Rewrite the current "Feedback Loop" body (lines 211–225) to cover Pocock's signal-construction ladder (failing test, curl script, CLI w/ fixture diff, headless browser, replay trace, throwaway harness, fuzz loop, bisect harness, differential loop, HITL bash). Move the existing 10-rung *diagnostic-techniques* ladder (currently inside this section) into Phase 4 — those are instrumentation techniques, not feedback-loop construction.
    - **Phase 2: Reproduce** — confirm the signal triggers consistently. Fold the existing "Categorize the bug" sub-step (line 272) into this phase. Add a one-liner: *"The user's description is Hypothesis #0 — verify independently."*
    - **Phase 3: Hypothesize** — generate 3–5 ranked falsifiable hypotheses. Adopt Pocock's "show ranked hypotheses to user before testing" checkpoint. Add Pocock's "stronghold first" reflex as a one-liner: *"Anchor every hypothesis on one Confirmed piece of evidence and expand outward."*
    - **Phase 4: Instrument** — gather evidence per the top hypothesis. Diagnostic-techniques ladder (moved from current Feedback Loop section) lives here.
    - **Phase 5: Confirm root cause + design regression test** — name the cause with evidence; **design** (do not write) a regression test for Clove. Adopt Pocock's wording for the no-correct-seam case: a `Suggested tests:` value of `"no correct seam — architecture prevents lockdown"` is a legitimate finding that flags Winston/Ren follow-up. Phase 5 is design-only; Clove implements the test in their own pass.
    - **Phase 6: Cleanup + Post-Mortem** — remove instrumentation, route to Lessons Check (which Sasha already has at line 426), formalize "missing evidence is a finding" with a `Gap / Impact / How to Obtain` mini-table for any unconfirmed claims.

    Replace the existing "Debugging process" section (lines 264–337) with the six-phase frame. Preserve 5b/5c Linear sync flow inside Phase 6. Update Definition of Done (line 396 area) to reorder against the six phases.

11. **Add evidence grading to `## Debugged Issues` plan section format** — extend the template defined in `.prism/rules/branch-plan.md`. Three changes to each entry:
    - **Add `Confidence:` field** — `High` (Confirmed root cause + deterministic repro) / `Medium` (Deduced) / `Low` (Hypothesized, named data gap).
    - **Inline-tag the Root cause line** — `[Confirmed]` / `[Deduced]` / `[Hypothesized]`. One-token cost, high-information.
    - **Add optional `Refuted hypotheses:` sub-bullet** — keeps the "hypotheses are never deleted" principle without bloating the format. Skipped when there were no real alternatives.

    **Touches 3 files in lockstep:** `.prism/rules/branch-plan.md`, `.claude/rules/branch-plan.md`, `templates/install/.prism/rules/branch-plan.md`. Verify all three carry the same template after edit.

12. **Update `.prism/templates/bug-report.md`** if it exists — referenced from Sasha's shared.md (line 298, 330). Mirror the evidence-grading additions from task 11 so the template matches the new `## Debugged Issues` shape. Verify file exists before edit; if absent, no-op.

13. **Add Sasha case-file resumability via `.prism/sasha-state.json`** — single state file (no per-step files — lighter variant of `micro-file-step-machine.md`). Schema: `currentPhase`, `phasesCompleted`, `hypotheses` (with status: Open/Confirmed/Refuted), `confirmedEvidence`, `caseSlug` (one per ticket/branch — keyed inside if multiple compound diagnoses surface), `status` (`not-started | in-progress | paused | complete | aborted`). Atomic-write protocol mirrors Theo's (write to `.tmp`, then rename). On Sasha invocation: check for existing state matching the current ticket/branch; if `status` is `in-progress` or `paused`, offer resume from `currentPhase`. Cleanup on `complete` — delete the file.

14. **Update `.prism/references/micro-file-step-machine.md` with the lighter-variant clarification** — add a paragraph acknowledging that operational-state-only (no per-step files) is a valid lighter variant. Add Sasha to the citers list. Source: subagent finding that Sasha hits 2 of 3 gates strongly; per-step files would duplicate the plan's `## Debugged Issues` entry without adding signal.

15. **PR 2 build + verify** — same `pnpm prism:build / check / check-types / test` sequence.

### PR 3 — Eric two-axis restructure

**Clove (implementation)**

16. **Replace Eric's "What to look for" (lines 314–327) with two explicit axis sub-sections** — file: `.ai-skills/skills/prism-code-review-pr/shared.md`. Standards axis covers: logic, types, abstraction + deletion test (which stays where it is at lines 332–346 inside `### Justification Review`, with `### Justification Review` re-headered to mark it explicitly as a Standards-axis check), a11y, doc-class triage, test coverage, comment standards, visual regression. Spec axis covers: AC conformance, plan `## Decisions` respect, scope creep, architect context constraints.

17. **Restructure phase 3 of Eric's flow (line 230 area) to spawn two parallel subagents per Pocock's pattern** — each subagent receives only its own context bundle (Standards subagent gets diff + standards-source files; Spec subagent gets diff + AC + plan + architect context). Context isolation enforces non-merging. The aggregator (Eric's main thread) reads both reports and assembles the summary without re-ranking across axes.

18. **Rewrite Eric's Summary format (lines 362–386) into a 3-section output:**
    - `### Summary` (unchanged — paragraph)
    - `### Standards findings` — Critical / Major / Minor within axis
    - `### Spec findings` — Critical / Major / Minor within axis (or `"Spec axis skipped — no spec available"` when missing-spec)
    - `### Cross-cutting observations` — outputs worth surfacing together (test coverage gaps, doc-class triage results)
    - `### PR Readiness` (unchanged — checklist)

19. **Add a "Missing spec handling" sub-section to Eric's mode selection** — three states (full spec, partial spec, no spec) and what each means for the Spec subagent. The skip must be loud in the summary; silent skipping looks like a passing review. Add the new label `confidence:standards-only` for the spec-skipped case (alongside existing `confidence:high` and `confidence:needs-judgment`).

20. **Add the lightweight-path opt-out** — full Eric path uses parallel subagents (doubles API cost); lightweight path (docs-only PRs) stays single-pass. Document the threshold for "lightweight" (e.g., diff is `.md`-only and under N files). Subagent suggested: docs-only diffs.

21. **Implementation note for subagent context-fetching** — to avoid each subagent re-reading the same source files, pre-fetch all source files in Eric's main thread and pass content into each subagent prompt. Pre-fetching avoids redundant reads and keeps the two subagents from racing on filesystem reads.

22. **PR 3 build + verify** — same sequence.

### PR 4 — Winston upgrades

**Clove (implementation)**

23. **Reference the AFK/HITL tag rule from Winston's shared.md** — file: `.ai-skills/skills/prism-architect/shared.md`, line 257 area (existing "Apply the detail bar" bullet). Single-line reference to the new tag rule extracted in PR 1, task 5. Do not re-define the tag in shared.md.

24. **Add `## Re-plan Mode` as a third top-level mode** — file: `.ai-skills/skills/prism-architect/shared.md`, new section after current line 313 (`---` separator before `## Epic Detection`). Mode fires when: (a) user explicitly says "scope changed, re-plan this" / "the ticket grew" / similar, OR (b) Winston detects mid-session that he's about to overwrite `## Implementation Tasks` on a plan with a non-empty `## History` (i.e., implementation has started). Flow:
    1. Diff old vs new tasks/AC (what was added, removed, restated).
    2. Walk the stale-artifact table (see task 25).
    3. Output a propagation report — per-artifact verdict: `stale` / `clean` / `verify`.
    4. For each `stale`, offer routing to the owning persona (Mira → user stories, Parker → PRD, Nora → Linear ticket desc, Clove → in-flight work coordination, Pixel → mock spec, Reese → AC checklist).
    5. Auto-sync the artifacts Winston already owns (Linear AC, PR body via ADR-0020) without prompt; report what was synced.

25. **Stale-artifact table for Re-plan Mode** — document inline in the Re-plan Mode section:

    | Artifact | Owner | Stale when... |
    |---|---|---|
    | Linear AC | Winston (auto-sync) | Tasks change → AC changes |
    | Linear ticket description | Nora | User stories or goal restate |
    | `## User Stories` in plan | Mira | Scope shift adds/removes a user-facing capability |
    | `.prism/prds/<slug>.md` | Parker | PRD-grain change (rare mid-ticket; possible on epic re-plans) |
    | In-flight Clove work | Clove | Tasks Clove was executing got removed or restated |
    | PR body | Winston (auto-sync per ADR-0020) | Tasks/Decisions/AC change |
    | Pixel mock spec | Pixel | UI scope shifts |
    | AC already QA-planned | Reese | AC drift after Reese wrote a test plan |

26. **Add the decomposition-shape gate to plan mode** — file: `.ai-skills/skills/prism-architect/shared.md`, insert between current plan-mode steps 2 (read goal/decisions) and 3 (break into tasks) — around line 251. Step name: "Decomposition shape". Winston evaluates the signals:
    - Tracer-bullet vocabulary in ticket/user stories ("end-to-end", "demo-able", "thin slice", "spike", "happy path first")
    - Explicit feature-flag or phased rollout mentioned in ticket
    - Greenfield (no existing code in the touched area)
    - User stories outnumber implementation surfaces (5 stories, 3 layers → stories are the slice candidates)
    - Epic-detection threshold met AND stories are independently shippable
    - (Necessary condition, not sufficient): touches 3+ layers — required for vertical to be meaningful, but won't trigger the offer alone

    If signals fire (3+ matches in pure plan mode, all signals in evaluate-then-plan to avoid gate fatigue), Winston asks once: "This looks slice-able — want horizontal lanes (default, persona-grouped) or vertical tracer-bullets (each slice cuts through all layers and is demoable on its own)?" Then generates one shape only. No retroactive reshape.

27. **Define vertical-mode output format** — new sub-section under `## Plan Mode` in Winston's shared.md. In vertical mode, tracer-bullet slices replace persona groups. Each slice has: a name (one-line demoable capability), its own subset of AC, ordered list of touched layers, and a mandatory `[AFK]` or `[HITL]` tag (because that's the slice's native question — slice carrying the whole feature can either ship without me or not). Horizontal mode stays default; vertical is opt-in via the decomposition gate.

28. **Update `## Epic Detection` to acknowledge vertical mode** — when in vertical mode and slice count exceeds the epic threshold (>5), each slice becomes an independent story plan. The epic plan references the slice-story plans. This is the natural composition; per the user decision, slices ARE the story shape when vertical mode and epic threshold both fire.

29. **Add Pocock's "Quiz the user" decomposition-check gate** — after task generation (either horizontal or vertical), Winston pauses with a single confirmation: "Does this decomposition feel right — granularity, dependencies, merge/split, tag accuracy?" One-line gate; user accepts or pushes back; if pushback, reshape before AC sync. Catches over-slicing/under-slicing.

30. **Add "publish in dependency order" as a documented rule in Winston** — Winston already orders tasks by dependency, but doesn't name this as a rule. One-line note in the Implementation Tasks section: "Order tasks so each task's prerequisites land before it." Pocock's source for naming the rule.

31. **Add mode banners to all three modes' opening lines** — one-line `Running <mode> — [gates expected]` at session start so the user knows the session shape. Mitigates the gate-density concern across runs.
    - Evaluate mode: `Running evaluate mode — Devil's Advocate, A/P/C decision point, then Suggested Approach.`
    - Plan mode: `Running plan mode — decomposition shape question, optional task-check pause, then tasks + AC.`
    - Re-plan mode: `Running re-plan mode — propagation report and routing offers.`

32. **Update Winston's "What Winston is not" section** — Winston still doesn't write code. Note explicitly that AFK/HITL tagging and vertical-mode-and-epic-stories composition do not change Winston's no-code-written invariant.

33. **PR 4 build + verify** — same sequence.

### PR 5 — Parker + Atlas STOPs + Iris new persona

**Clove (implementation)**

34. **Add Parker STOP marker at end of `greenfield-step-02-stakes.md`** — file: `.prism/skills/prism-parker/greenfield-step-02-stakes.md`. Insertion point: after step 5 ("Append stakes to stepsCompleted"), before transition to `greenfield-step-03-mode.md`. Phrasing template (adapted from Sage's existing STOP precedent):

    > "Stakes calibrated as `<level>`. Before I move to drafting, **STOP**: review the stakes call. The level drives review rigor, open-question requirements, and decision log mandate. Do you want to recalibrate, or proceed?"

    **Conditional skip:** if `stakes == hobby`, skip the STOP (rubric is auto-skipped for hobby per `step-06-review.md:11`; recalibration moment has less consequence).

35. **Add Atlas STOP marker at end of Batch 2 survey** — file: `.ai-skills/skills/prism-atlas/shared.md`. Insertion point: right after current line 55 (the survey-findings step), BEFORE question 1. Phrasing:

    > "Detection found `<stack>` with evidence at `<paths>`. **STOP** before I start the question flow — confirm the detection looks right, or correct it now. Any misdetection here propagates into rule generation and anchor substitution."

    **Conditional skip:** if Atlas is in `dogfood-self` mode (per `shared.md:80`), skip the STOP (preserves smoke-test idempotency).

36. **Add forward-looking configurable-checkpoint note to `.prism/architect/onboarding.md`** — single paragraph noting that team-level config could enable `atlas.checkpoints: minimal | standard | aggressive` as a future feature. Today the STOP is fixed at post-detection; teams running Atlas in CI or smoke-tests want it suppressed; teams new to PRISM want more. No code; documentation only.

**Iris — new retrospective persona**

37. **Create Iris persona scaffolding** — new skill directory at `.ai-skills/skills/prism-iris/` with the standard layout:
    - `frontmatter.yml` — name (`prism-iris`), description (with trigger phrases), argument-hint
    - `shared.md` — the persona body (mirror Zoe's structure as scaffold)
    - `claude.md`, `codex.md`, `cursor.md` — single-line placeholder comments per the platform-mirror convention

    Trigger words: "Iris" by name + phrases ("let's run a retro", "retrospective on this epic", "what went well/badly on PRISM-####", "post-mortem this").

38. **Create Iris step files** at `.prism/skills/prism-iris/`:
    - `step-01-detect-target.md` — epic-plan (primary) vs date-range (fallback). Look for `.prism/plans/epic-<slug>.md`; fall back to date range when explicitly requested or no epic plan detected.
    - `step-02-gather-evidence.md` — walk the plan's `## History`, `## Decisions`, `## Debugged Issues`, `## Review Issues`. For date-range mode, walk all plans with history entries in the range.
    - `step-03-stage-voices.md` — identify which personas actually touched the plan (from `## History` branch names and persona-task ownership). Only those personas speak in the retro; absent personas don't get scripted in.
    - `step-04-facilitate.md` — generate the multi-voice dialogue body. Format: `Name (Role): "dialogue"`. Disagreements are evidence-based — re-litigate `## Decisions` entries where actual outcome diverged from predicted (e.g. Decision said X beat Y because Y was expensive, but Debugged Issues shows X caused three regressions — that's a real disagreement worth surfacing).
    - `step-05-action-items.md` — synthesize `## Action Items` section with proposed owners (`[ ] <action> — proposed owner: <persona>`). At end, offer: "Want me to hand off to Nora to file these as follow-up tickets? She'll run the scope-fit gate from `.prism/rules/followup-scope.md` on each one."
    - `step-06-save-report.md` — write report to `.prism/retros/<YYYY-MM-DD>-<epic-slug>.md`. Read-only on the plan (don't modify the source plan's `## History`).

39. **Write Iris's `shared.md` body** — covers identity, personality, when invoked, output format (the retro template), routing to Nora for action items, the no-write-on-source-plan invariant. Iris is explicit-invocation only (like Zoe) — no auto-routing. Add Iris's row to `.prism/architect/closing-messages.md` (created in PR 1, updated here): default next persona is Nora (for action items); user can decline the handoff.

40. **Add Iris to `.prism/SPEC.md` persona roster** — under the cadence-driven tier (alongside Zoe). Update lifecycle/cadence taxonomy if needed.

41. **Update `AGENTS.md § 9 Ownership & Handoff`** — add Iris row to the routing table: Owns retros at `.prism/retros/`; Routes to Nora (action-item filing). Mirror in `templates/install/AGENTS.md` per the install-template pattern.

**Eli (documentation)**

42. **Evaluate paired dev doc requirement for Iris** — per ADR-0038, every new persona evaluates whether `docs/content/dev/architecture/iris.md` warrants a paired dev doc. Iris is a retrospective persona; teammates touching epic retros will plausibly want a narrative doc. Current call: **write the paired doc** — retros are inherently human-facing. Use Zoe's paired doc as template structure.

**Verification**

43. **PR 5 build + verify** — same sequence.

---

## Decisions

- **Re-scoped from initial exploration after discovering Phase 1.5e overlap.**
  - **Root cause:** Initial exploration produced ~9 candidate items, but reading sibling plans revealed Phase 1.5e (epic-prism-pattern-absorptions, complete) already absorbed the triple-gated ADR test in Winston and Theo, plus six related patterns. Re-implementing absorbed items would have caused merge conflicts and duplicated work.
  - **Alternatives considered:** Rewrite items 1.5e already absorbed (rejected — duplicate work, merge conflict guaranteed); skip wave 2 entirely (rejected — 11+ items still novel); re-scope to persona-specific deepenings (chosen).
  - **Chosen approach:** Wave 2 as a sibling to Phase 1.5e — references the prior phase, intentionally scopes to persona-specific work the prior phase left out.
  - **Implementation guidance:** Subagent re-evaluation (2026-05-23) confirmed no further overlap with 1.5e beyond the triple-gate.
  - → no promotion needed (process recovery, ticket-tactical)

- **Standalone correct-course skill rejected — folded into Winston as Re-plan Mode (top-level mode, not end-of-flow step).**
  - **Root cause:** The "value" isn't the re-planning (Winston already does this); it's the multi-artifact propagation across Linear AC, user stories, PRD, in-flight Clove work. That's orchestration. **Subagent caught:** Winston's plan mode is one-shot today — there's no concept of mid-ticket re-planning to append to. Re-plan must be a new mode, not a step.
  - **Alternatives considered:** Standalone persona (rejected — orchestration without ownership), `/correct-course` slash command (rejected — breaks persona-naming convention), Winston end-of-plan step (rejected — fires for fresh plans that have nothing to propagate yet), Winston new mode (chosen).
  - **Chosen approach:** `## Re-plan Mode` as Winston's third top-level mode, alongside Evaluate and Plan.
  - **Implementation guidance:** Tasks 24–25.
  - → no promotion needed (codified inline in Winston's shared.md)

- **Sasha Phase 5 is design-only, not implementation. Preserves diagnose-only boundary.**
  - **Root cause:** Pocock's Phase 5 is "Fix + regression test" — Sasha's invariant is no source-file modifications (line 209: "Sasha diagnoses — she doesn't treat"). Adopting Pocock verbatim would break the Clove-owns-implementation boundary that the persona model depends on.
  - **Alternatives considered:** Adopt Pocock verbatim (rejected — breaks diagnose-only boundary), drop Phase 5 entirely (rejected — regression test design is a real diagnostic deliverable), adapt to design-only (chosen, user-confirmed 2026-05-23).
  - **Chosen approach:** Sasha designs the regression test (specifies what it covers, where it lives, what it asserts); Clove implements in their own pass. Pocock's "no correct seam" finding format adopted as-is.
  - **Implementation guidance:** Task 10, Phase 5 section.
  - → no promotion needed (codified inline in Sasha's shared.md)

- **Sasha case file is single-state lighter variant of micro-file pattern.**
  - **Root cause:** The full micro-file pattern fits 2 of 3 gates strongly; gate #2 ("outlasts a context window") is weak for diagnostic sessions — bugs rarely span days the way Theo walks span hundreds of files. Per-step files would duplicate the plan's `## Debugged Issues` entry without adding signal.
  - **Alternatives considered:** Full micro-file pattern (rejected — duplicate maintenance), no resumability (rejected — multi-day prod incidents are real), lighter single-state variant (chosen).
  - **Chosen approach:** Single `.prism/sasha-state.json` with `currentPhase` / `phasesCompleted` / hypothesis state / confirmed evidence / case slug / status. Update `.prism/references/micro-file-step-machine.md` to acknowledge the lighter variant.
  - **Implementation guidance:** Tasks 13–14.
  - → no promotion needed (codified in `.prism/references/micro-file-step-machine.md` lighter-variant clarification)

- **Eric is a 3-section output (Standards / Spec / Cross-cutting), not a strict 2-axis.**
  - **Root cause:** Eric covers more than two axes today — a11y, justification, doc-class triage, test coverage. **Subagent caught:** these flow INTO axes (a11y → Standards, justification → Standards, test coverage → Standards) — they're cross-cutting concerns, not axes themselves. Forcing strict 2-axis would lose them or duplicate them.
  - **Alternatives considered:** Strict 2-axis (rejected — loses concerns), 5-axis (rejected — proliferates), 3-section with axes + cross-cutting (chosen).
  - **Chosen approach:** Standards axis + Spec axis + Cross-cutting observations. Parallel subagents handle the two axes; cross-cutting outputs surface in the main thread.
  - **Implementation guidance:** Tasks 16, 18.
  - → no promotion needed (codified inline in Eric's shared.md)

- **Eric's parallel-subagent pattern uses context isolation, but reserves lightweight single-pass path for docs-only PRs.**
  - **Root cause:** Pocock's mechanism literally spawns two subagents — context isolation enforces non-merging beyond just a prompt instruction. But API cost roughly doubles, and docs-only PRs don't need the heavyweight path.
  - **Alternatives considered:** Always parallel (rejected — wasteful for trivial PRs), never parallel (rejected — defeats the non-merging mechanism), threshold-based opt-out (chosen).
  - **Chosen approach:** Full path uses parallel subagents; docs-only PRs (`.md` diff only) stay single-pass. Threshold documented in Eric's shared.md.
  - **Implementation guidance:** Tasks 17, 20.
  - → no promotion needed (codified inline in Eric's shared.md)

- **AFK/HITL tag defaults to unmarked (`[AFK]` implicit); only `[HITL]` is tagged.**
  - **Root cause:** Tagging every task as `[AFK]` or `[HITL]` is signal-to-noise drift — most tasks are AFK. Pocock himself prefers AFK; HITL is the exception. **Subagent caught:** Anchoring the definition in `.prism/rules/implementation-task-detail.md` (not in Winston's shared.md) prevents drift between the two files.
  - **Alternatives considered:** Tag every task explicitly (rejected — noise), tag only HITL explicitly with AFK as unmarked default (chosen), put definition in Winston's shared.md (rejected — drift risk).
  - **Chosen approach:** Definition lives in `.prism/rules/implementation-task-detail.md`; Winston's shared.md references it. `[HITL]` is the explicit tag; `[AFK]` is the unmarked default.
  - **Implementation guidance:** Tasks 5 (rule), 23 (Winston reference).
  - → no promotion needed (codified in `.prism/rules/implementation-task-detail.md`)

- **AFK/HITL composes with vertical slicing — slices are the AFK unit.**
  - **Root cause:** Pocock's tags exist *because* the unit is a vertical slice cutting through all layers. On horizontal lane tasks, "AFK for whom?" gets fuzzy (the human, Winston, Pixel?). On vertical slices, AFK means "this whole slice can ship without me" — a coherent claim.
  - **Alternatives considered:** Tag taxonomy is mode-agnostic (rejected — definitional drift), tags are mode-specific (chosen).
  - **Chosen approach:** Horizontal mode (default) uses tags sparingly (only `[HITL]` explicit). Vertical mode (opt-in) requires `[AFK]` or `[HITL]` on every slice — that's the slice's native question.
  - **Implementation guidance:** Tasks 5, 23, 27.
  - → no promotion needed (codified inline in Winston's shared.md vertical-mode section)

- **Vertical-slicing offer fires BEFORE task generation, not after.**
  - **Root cause:** **Subagent caught:** If Winston builds horizontal tasks then asks "would you like vertical?", he's done the work twice and the user picks horizontal because it's concrete. The offer dies on the vine.
  - **Alternatives considered:** Offer after task generation (rejected — see root cause), offer in parallel (rejected — double generation), offer before task generation as a gate (chosen).
  - **Chosen approach:** Decomposition-shape gate between plan-mode steps 2 and 3. Signals fire → Winston asks once → generates one shape only.
  - **Implementation guidance:** Task 26.
  - → no promotion needed (codified inline in Winston's shared.md decomposition gate)

- **Vertical-slicing signal set refined — original "3+ layers" alone was too noisy.**
  - **Root cause:** "Touches 3+ layers" fires constantly (most non-trivial work hits 3 layers). Better signals: tracer-bullet vocabulary in ticket/user stories, feature-flag / phased rollout, greenfield (no existing code), user stories outnumber implementation surfaces, epic decomposition into independently-shippable stories. The 3-layer test is a necessary condition (you can't slice vertically with one layer), not a sufficient one.
  - **Alternatives considered:** Single weak signal (rejected — noise), conjunctive signal set (chosen — multiple match before offering).
  - **Chosen approach:** Offer fires when 3+ signals match in pure plan mode, all signals in evaluate-then-plan (to avoid gate fatigue post-A/P/C).
  - **Implementation guidance:** Task 26.
  - → no promotion needed (codified inline in Winston's shared.md decomposition gate)

- **Vertical slices count as epic stories when slice count exceeds epic threshold (user-confirmed 2026-05-23).**
  - **Root cause:** Vertical slices are the natural story shape — they're independently demoable and shippable. When the slice count crosses the epic-detection threshold, each slice becomes its own story plan; the epic plan references the slice-story plans. This is the natural composition.
  - **Alternatives considered:** Keep vertical inside a single plan even at large slice count (rejected — duplicates story-plan ergonomics inside the plan), each slice becomes a story plan (chosen).
  - **Chosen approach:** Update Epic Detection to acknowledge vertical mode. Slice count > epic threshold → slices become epic stories.
  - **Implementation guidance:** Task 28.
  - → no promotion needed (codified inline in Winston's shared.md Epic Detection section)

- **Iris (formerly Echo) — name confirmed 2026-05-23 to avoid E-prefix collision with Eric and Eli.**
  - **Root cause:** Echo collides with Eric and Eli in the E-prefix cluster; Iris keeps eye/reflection imagery without collision.
  - **Alternatives considered:** Echo (rejected — E-prefix cluster), Vera (rejected — less natural fit), Rena (rejected — same), Iris (chosen).
  - **Chosen approach:** All references to Echo throughout the plan and downstream artifacts use Iris.
  - **Implementation guidance:** Tasks 37–41.
  - → no promotion needed (naming choice, ticket-tactical)

- **Iris uses the real PRISM persona roster — evidence-driven disagreements, not scripted characters.**
  - **Root cause:** BMAD's retrospective uses hardcoded characters (Amelia, Alice, Charlie, etc.) with scripted disagreements for "authentic team dynamics." That's theater. PRISM has a real persona roster; Iris should drive participation from evidence (the personas that actually touched the plan) and surface real disagreements (re-litigate `## Decisions` against `## Debugged Issues`).
  - **Alternatives considered:** Scripted characters (rejected — theater), single facilitator with no other voices (rejected — loses multi-voice mechanic), real-roster + evidence-based dialogue (chosen).
  - **Chosen approach:** Iris stages voices based on `## History` and persona-task ownership in the plan. Disagreements come from outcome-vs-prediction gaps in `## Decisions`.
  - **Implementation guidance:** Task 38, step-03 and step-04.
  - → no promotion needed (codified inline in Iris's shared.md + step-04-facilitate.md)

- **Iris proposes action items; Nora files them.** Preserves the Nora ownership boundary for follow-up tickets.
  - **Root cause:** Action items are follow-up ticket candidates; Nora owns follow-up filing (with the scope-fit gate from `.prism/rules/followup-scope.md`). Iris bypassing Nora would create scope-gate gaps.
  - **Alternatives considered:** Iris files directly (rejected — bypasses scope-fit gate), Iris proposes + offers handoff (chosen).
  - **Chosen approach:** Iris writes `## Action Items` to the retro report; closing offer is "want me to hand off to Nora to file these as follow-up tickets?" — user accepts or declines.
  - **Implementation guidance:** Task 38, step-05.
  - → no promotion needed (codified inline in Iris's shared.md + step-05-action-items.md)

- **Lazy-artifact audit scope shrunk — most personas are already lazy.**
  - **Root cause:** **Subagent caught:** scope was over-stated. Per-persona audit found Theo's state file returns null on absent (already lazy), Pixel's mock dir creates on demand (already lazy), Zoe's audits dir creates on first run (already lazy), Atlas writes state on first answer (already lazy). The single concrete eager seed: `templates/install/.prism/lessons-archive.md` (header-only placeholder).
  - **Alternatives considered:** Full audit + per-persona edits (rejected — manufactured work), rule + targeted single template fix (chosen).
  - **Chosen approach:** Write the rule at `.prism/rules/lazy-artifacts.md` codifying the existing pattern; remove the `lessons-archive.md` template seed; have Zoe create the file on first archive.
  - **Implementation guidance:** Tasks 2–4.
  - → no promotion needed (codified in `.prism/rules/lazy-artifacts.md`)

- **Closing-message routing synthesizes from existing AGENTS.md § 9, lives in architect doc (not rule).**
  - **Root cause:** **Subagent caught:** 80% of the routing data already exists in `AGENTS.md § 9 Ownership & Handoff`. The new file is synthesis + per-persona conditional elaboration (e.g., Briar → Clove if issues / "ready to ship" if clean). Closing-message routing is contextual guidance, not universally loaded — architect docs are the right home, not rules.
  - **Alternatives considered:** New file at `.prism/rules/closing-messages.md` (rejected — wrong category, universally loaded would be wasteful), inline per-persona (rejected — drift), architect doc (chosen).
  - **Chosen approach:** `.prism/architect/closing-messages.md`. Each persona's shared.md cites it; persona's row provides the conditional routing logic AGENTS.md doesn't cover.
  - **Implementation guidance:** Tasks 6–7.
  - → no promotion needed (codified in `.prism/architect/closing-messages.md`)

- **Recommend-without-auto-invoke posture for all persona closings.**
  - **Root cause:** Closing messages suggest the next persona; they never auto-invoke. Auto-routing would bypass user agency and conflict with explicit-invocation principles (Zoe, Theo, Iris). The existing Nora pattern (line 382 of shared.md) is the gold standard — "Handing off to Sasha to verify..." is phrased as a proposal, not an execution.
  - **Alternatives considered:** Auto-invoke (rejected — bypasses agency), recommend-only (chosen).
  - **Chosen approach:** Every persona's closing names the next persona and offers; user invokes or doesn't.
  - **Implementation guidance:** Task 6, posture documented in closing-messages.md.
  - → no promotion needed (codified in `.prism/architect/closing-messages.md`)

- **Wave 2 ships as 5 PRs, not 1 (user-confirmed 2026-05-23).**
  - **Root cause:** Phase 1.5e was 9 tasks in one PR — manageable but close to the line. Wave 2 has ~43 tasks across 6 personas + new persona + cross-cutting work. Single-PR shape would be bisect-hostile and merge-conflict-prone. Splitting by structural concern keeps each PR reviewable.
  - **Alternatives considered:** Single PR (rejected — too large), 8 PRs (rejected — too granular), 5 PRs grouped by structural concern (chosen).
  - **Chosen approach:** PR 1 (foundation: ref doc + lazy + closing + AFK/HITL rule + per-persona closing-message references), PR 2 (Sasha), PR 3 (Eric), PR 4 (Winston), PR 5 (Parker + Atlas STOPs + Iris).
  - **Implementation guidance:** PR sequence in `## Dependencies and Sequencing`.
  - → no promotion needed (sequencing decision, ticket-tactical)

- **No new ADR for wave 2.** Per the triple-gate (hard-to-reverse + surprising + genuine trade-off, all three must fire), wave 2's changes don't meet the bar. Persona deepenings absorb into existing surfaces; new persona (Iris) follows established precedent (Parker, Atlas, Theo, Zoe); cross-cutting patterns absorb into the architect/rules layer. ADR creation would fail its own gate.
  - → no promotion needed (triple-gate fails by intent — this Decision is itself the application of the gate)

---

## History

- 2026-05-23 [hmcgrew/epic-skill-improvements-bmad-pocock]: Plan created. Wave 2 of bmad-pocock pattern absorptions — re-scoped after discovering Phase 1.5e overlap. Targets 5 persona deepenings, 1 new persona, 2 cross-cutting patterns, 1 reference doc extraction.
- 2026-05-23 [hmcgrew/epic-skill-improvements-bmad-pocock]: Subagent re-evaluation complete. Four parallel subagents deep-dove the proposed changes against current PRISM skills + source skills (Pocock diagnose/review/to-issues, BMAD investigate/code-review/retrospective). Major revisions: Sasha Phase 5 design-only (preserves diagnose-only); Sasha case file = lighter-variant micro-file pattern; Eric = 3-section output (not strict 2-axis); Eric uses parallel subagents but reserves lightweight single-pass for docs-only PRs; AFK/HITL composes with vertical slicing (slices are the AFK unit); vertical-slicing offer fires BEFORE task generation; refined signal set for vertical; vertical slices become epic stories when slice count > threshold; scope-change propagation is a NEW MODE (Re-plan Mode), not an end-of-flow step; Parker STOP at end of stakes step (not "between" stakes and rubric); Atlas STOP at end of Batch-2 survey (not "between" detection and rule generation); both STOPs conditional (hobby/dogfood skip); Iris (renamed from Echo per user 2026-05-23) uses real persona roster + evidence-driven disagreements; lazy-artifact scope shrunk to rule + one template fix (most personas already lazy); closing-messages synthesizes from existing AGENTS.md § 9 (architect doc, not rule).
- 2026-05-23 [hmcgrew/epic-skill-improvements-bmad-pocock]: Pre-flight retrofit — added verdict sub-bullets to all 16 Decisions per the gate from #35; broadened AC mirror list to include `.cursor/skills/` and `.codex/agents/` per ADR-0044; captured three operational notes (label REST workaround, `confidence:standards-only` ready-flip, epic preservation).
- 2026-05-23 [hmcgrew/epic-skill-improvements-bmad-pocock]: PR 1 (Foundation) implemented. New canonical files: `.prism/references/triple-gated-adr-criterion.md` (extracted from Winston's inlined section per Phase 1.5e fallback), `.prism/rules/lazy-artifacts.md` (codifies create-on-first-use; documents manifest.stub.json exception), `.prism/architect/closing-messages.md` (synthesizes AGENTS.md § 9 with conditional routing). Added AFK/HITL tag rule to `.prism/rules/implementation-task-detail.md` (default unmarked; `[HITL]` only when human input blocks execution; cites Pocock's `to-issues`). Removed `templates/install/.prism/lessons-archive.md` seed; Zoe now creates the file with standard header on first archive. All 17 persona shared.md files got `## Next persona` sections citing closing-messages.md. Winston and Theo updated to cite the new triple-gate reference doc. Build + check + check-types + test all green (116 tests pass).
- 2026-05-23 [hmcgrew/epic-skill-improvements-bmad-pocock]: Briar self-review on PR #41. Four Major issues found (3 in closing-messages.md: two broken ADR links to wrong filenames, two fabricated quote examples citing wrong line numbers/content) + one Minor (stale line citation in lazy-artifacts.md). All routed to Clove for fix. Build/test re-run skipped (Clove ran clean minutes prior; no commits since).
- 2026-05-23 [hmcgrew/epic-skill-improvements-bmad-pocock]: Clove fixed all 5 Briar findings. closing-messages.md: corrected ADR-0034 + ADR-0011 link filenames; reframed Nora/Pixel example block as illustrative phrasings (dropped fabricated file:line citations rather than chasing the actual line content — patterns are the point). lazy-artifacts.md: replaced `prism-zoe/shared.md line 177` with section-name reference (`§ Output format`) per the rule's own "section headings when line numbers will drift" guidance. Build regenerated 6 platform mirrors (closing-messages + lazy-artifacts across .claude/.codex/.cursor); check + check-types + test all green (116/116).
- 2026-05-23 [main]: PR #41 (Wave 2 PR 1 — Foundation) squash-merged at commit 98bd6bd. Briar re-review clean; Eric review clean (zero issues, state #3, effort:glance + confidence:high). All PR 1 AC items verified delivered.
- 2026-05-23 [hmcgrew/wave-2-pr-2-sasha]: PR 2 (Sasha) implemented on fresh branch off post-PR-1 main. Sasha shared.md restructured into six explicit phases (Feedback Loop signal construction → Reproduce → Hypothesize 3-5 ranked falsifiable → Instrument → Confirm + design regression test [DESIGN ONLY] → Cleanup + Post-Mortem). Phase 5 stays design-only — preserves Sasha's diagnose-only invariant. Evidence grading added to `## Debugged Issues` template in branch-plan.md (2 canonical surfaces in lockstep + 3 platform mirrors regenerated): `Confidence` field, inline `[Confirmed]`/`[Deduced]`/`[Hypothesized]` tag on root cause, optional `Refuted hypotheses` and `Missing evidence` fields. Bug-report.md template mirrored with `## Confidence` and `## Refuted Hypotheses` sections. Sasha case-file resumability added via single `.prism/sasha-state.json` (lighter variant of micro-file pattern — no per-step files since plan's `## Debugged Issues` entry is the durable artifact). `micro-file-step-machine.md` extended with the lighter-variant section + Sasha added to citers list. Build + check + check-types + test all green (116/116).
- 2026-05-23 [hmcgrew/wave-2-pr-2-sasha]: Briar self-review on PR #42 found 0 Critical / 0 Major / 1 Minor — plan-history date drift (2026-05-24 vs actual session date 2026-05-23). Clove followup commit corrected the date in two places and marked the Review Issue `fixed`. Plan-only change; no build re-run needed (plans aren't in the mirrored area per install-layout.md).
- 2026-05-23 [hmcgrew/wave-2-pr-2-sasha]: Briar re-review on PR #42 caught one new Minor — Clove's followup `replace_all` had over-swept `2026-05-24` references inside the Review Issue documentation and the new History line, erasing the original-bad-date anchor. Restored the three `2026-05-24` references with targeted Edits (no `replace_all`). Lesson learned for the toolkit: when documenting a bad value's correction, the documentation needs both the wrong value (as evidence) and the right value (as the fix) — global text replacements that don't distinguish "value-in-use" from "value-as-evidence" damage the audit trail.
- 2026-05-23 [main]: PR #42 (Wave 2 PR 2 — Sasha) squash-merged at commit 93955b2. Briar two-pass review clean; Eric review clean (zero issues, state #3, effort:glance + confidence:high). All PR 2 AC items verified delivered.
- 2026-05-23 [hmcgrew/wave-2-pr-3-eric]: PR 3 (Eric) implemented on fresh branch off post-PR-2 main. Eric's `prism-code-review-pr/shared.md` restructured: Phase 3 ("Review") replaced with the two-axis split — spawn two parallel subagents with context-isolated inputs (Standards subagent gets diff + source + standards rules; Spec subagent gets diff + source + plan + AC + architect context). The existing "What to look for" flat list reorganized into `### Standards axis` and `### Spec axis` sub-sections, with Accessibility/Justification/Doc-Class/Test-Coverage folded under Standards as named sub-procedures. Added `### Missing spec handling` sub-section with full/partial/no-spec state table. Summary format restructured into 3 sections (`### Standards findings` / `### Spec findings` / `### Cross-cutting observations`) plus unchanged Summary and PR Readiness. New label `confidence:standards-only` added to Confidence table; Decision gate's state #3 expanded to three confidence variants (high / needs-judgment / standards-only); ready-flip treats standards-only as state #3 per wave-2 operational notes. Lightweight path (docs-only PRs) explicitly opts out of subagent fanout. Pre-fetch pattern documented in batch C — source files read once in Eric's main thread and passed inline into each subagent prompt to avoid double-reads. Build + check + check-types + test all green (116/116).
- 2026-05-23 [hmcgrew/wave-2-pr-3-eric]: Briar self-review on PR #43 found 0 Critical / 0 Major / 1 Minor — grammar break in the new Spec-axis "Scope creep" bullet ("Diffs that include files no task names is the canonical signal" — missing word, incoherent as written). Clove followup commit corrected the sentence to "Diffs that touch files not named in any implementation task are the canonical signal" via targeted Edit (no `replace_all` per the lesson). Build regenerated 4 platform mirrors; check + check-types + test re-run skipped (Clove's commit was the only change since the prior green run).
- 2026-05-23 [hmcgrew/wave-2-pr-3-eric]: Eric review on PR #43 — first application of the new two-axis pattern against itself. Found 1 Major (step-number collision: Phase 3 grew to four steps 6-9 but Phases 4 and 5 still started at 7 and 8, creating ambiguous `step 7` / `step 8` references) + 1 Minor pre-existing (line 551 cites nonexistent "step 12"). Clove followup commit: targeted Edits renumbered Phase 4 step 7 → 10, Phase 5 step 8 → 11, and repointed the 422-fallback citation to "step 10" (the new batch D number). Build regenerated 4 platform mirrors. Self-applicability of the new pattern verified — Eric found a real bug in its own restructure.
- 2026-05-23 [hmcgrew/wave-2-pr-4-winston]: PR 4 (Winston) implemented on fresh branch off post-PR-3 main. 11 targeted edits to `.ai-skills/skills/prism-architect/shared.md` — single-line AFK/HITL cite to `implementation-task-detail.md § 5` (task 23); new `## Re-plan Mode` as third top-level mode with triggers, flow, stale-artifact table, history line, and closing message (tasks 24-25); decomposition-shape gate inserted as Plan Mode step 3 with signal set + threshold + one-shot question (task 26); new `### Vertical-mode output format` sub-section with Implementation Slices and Slice Order (task 27); Epic Detection now acknowledges vertical-mode + epic threshold composition (task 28); Pocock's `decomposition-check` one-line gate inserted as Plan Mode step 5 (task 29); "Publish in dependency order" rule named under task generation (task 30); mode banners on Evaluate, Plan, Re-plan as quote callouts (task 31); new `## What Winston is not` boundary section preserving the no-code-written invariant explicitly across AFK/HITL, vertical, and Re-plan mechanics (task 32). Plan Mode steps renumbered to 1-9 with consistent internal references (step 6 = AC generation, step 8 = Linear sync); cross-references inside Re-plan Mode updated to step 8 to match the renumber. Build regenerated 4 platform mirrors; check + check-types + test all green (116/116).
- 2026-05-23 [hmcgrew/wave-2-pr-4-winston]: Briar self-review on PR 4 found 0 Critical / 2 Major / 2 Minor. Top finding: new `## What Winston is not` section at line 139 declares editable surface as `.prism/ + docs/` while pre-existing line 118 Ownership & Handoff sentence still claims `.claude/ + docs/` — internal contradiction in the canonical that future architect-mode invocations would hit. Also a structural gap in Re-plan Mode (flow documents propagate but never the plan-rewrite step the intro promises). Build re-verified via direct binary (pnpm unavailable in worktree per `ERR_PNPM_IGNORED_BUILDS`); 116/116 tests pass. Plan Mode renumber clean; mirror parity verified. Route to Clove for fixes before PR opens.
- 2026-05-23 [hmcgrew/wave-2-pr-4-winston]: Clove fixed all 4 Briar findings (2 Major: editable-surface contradiction at line 118, Re-plan Mode missing plan-rewrite step; 2 Minor: Re-plan trigger over-fires, § 5 citation convention). Mirrors regenerated; check + check-types + test green.
- 2026-05-23 [hmcgrew/wave-2-pr-4-winston]: Briar re-review on PR 4 fix commit 65d88db clean. All 4 prior findings verified resolved. Ready to open PR + route to Eric.
- 2026-05-23 [hmcgrew/wave-2-pr-5-iris-stops]: PR 5 (Iris + STOPs) implemented on fresh branch off post-PR-4 main at commit 97aa3b6. Parker STOP added at end of `greenfield-step-02-stakes.md` step 7 (hobby-skip conditional, mirrors auto-skipped rubric at step-06-review.md:11). Atlas STOP appended to Batch-2 step 6 in `prism-atlas/shared.md` (dogfood-self skip preserves smoke-test idempotency). Forward-looking configurable-checkpoint section added to `.prism/architect/onboarding.md` documenting `atlas.checkpoints: minimal | standard | aggressive` shape for future contributors. New Iris persona scaffolding landed at `.ai-skills/skills/prism-iris/` (frontmatter.yml, shared.md, claude.md, codex.md, cursor.md) plus six step files at `.prism/skills/prism-iris/` (full-variant micro-file pattern — each step's output feeds the next). State file at `.prism/iris-state.json`; reports to `.prism/retros/<YYYY-MM-DD>-<slug>.md`. Read-only on source plans; explicit-invocation only; routes to Nora for action-item filing. Iris added to `.ai-skills/definitions/roles.json` (persona registry), `.prism/architect/skills-ecosystem.md` + install template (cadence-driven tier alongside Atlas and Zoe), `AGENTS.md § 9 Ownership & Handoff` + install template (Iris row routing to Nora), `.prism/architect/closing-messages.md` (Iris row replacing the PR-5 placeholder paragraph). Eli paired dev doc at `docs/content/dev/architecture/iris.md` (note: persona paired docs typically land under `docs/content/dev/ai-skills/` — followed user's explicit path instruction). Frontmatter description trimmed from 1021 to under 1000 chars after build flagged Codex discovery limit. Build regenerated 16 mirror files including `.claude/skills/prism-iris/`, `.codex/agents/prism-iris.toml`, `.cursor/skills/prism-iris/`, plus three architect-doc mirrors (closing-messages, onboarding, skills-ecosystem) across all three platforms. check + check-types + test all green (116/116).

---

## Debugged Issues

_None._

---

## Review Issues

### closing-messages.md broken ADR-0011 link

- **Severity:** `major`
- **Status:** `fixed`
- **File:** `.prism/architect/closing-messages.md:31`
- **Problem:** Link uses filename `0011-eric-never-approves.md`; actual filename is `0011-eric-never-approves-prs.md`. Link will 404. Per architect-doc-verification, broken links in architect docs mislead every future agent that loads the doc via manifest routing.
- **Suggested fix:** Update link target to `0011-eric-never-approves-prs.md`.

### closing-messages.md broken ADR-0034 link

- **Severity:** `major`
- **Status:** `fixed`
- **File:** `.prism/architect/closing-messages.md:27`
- **Problem:** Link uses filename `0034-pixel-mode-1-to-clove.md`; actual filename is `0034-pixel-always-routes-through-winston.md`. Link will 404.
- **Suggested fix:** Update link target to `0034-pixel-always-routes-through-winston.md`.

### closing-messages.md fabricated Nora example

- **Severity:** `major`
- **Status:** `fixed`
- **File:** `.prism/architect/closing-messages.md:55`
- **Problem:** Cites `prism-ticket-start/shared.md:382` with quote "Handing off to Sasha to verify the bug before Clove takes the fix...". Actual line containing the pattern is **384**, and the literal text is `"This is a bug ticket. Handing off to Sasha to verify the root cause and suspected fix before we plan anything."` Both the line number and the quoted text diverge from the source. Architect-doc-verification rule: claim contradicts the source → Major.
- **Suggested fix:** Either (a) replace the quoted text with the actual line-384 content and update the line number, OR (b) drop the file:line citation and reframe as an illustrative example.

### closing-messages.md fabricated Pixel example

- **Severity:** `major`
- **Status:** `fixed`
- **File:** `.prism/architect/closing-messages.md:56`
- **Problem:** Cites `prism-pixel/shared.md:616` (line number correct) with quote "Flagging for Winston: the data flow through the new prop chain will want his review before Clove builds against this spec." Actual line 616 text is `"...Flagging for Winston: SortableList may need a formal slot pattern if this is the second consumer. Plan updated, status: Needs architecture review."` The "Flagging for Winston:" frame is real; the rest of the quoted sentence is fabricated. Same divergence finding as the Nora example.
- **Suggested fix:** Either (a) replace with the actual line-616 quote, OR (b) drop the file:line citation and reframe as illustrative.

### lazy-artifacts.md stale line citation for Zoe

- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `.prism/rules/lazy-artifacts.md:20`
- **Problem:** Cites `prism-zoe/shared.md line 177` for the "audits dir created on first run" claim. Actual content is at line 187 — the Zoe edit earlier in PR 1 (adding the lessons-archive create-on-first-archive instruction) shifted line numbers. The claim's intent is correct; only the line number is stale.
- **Suggested fix:** Update `177` → `187`, or drop the line number and reference by section name only (matches `implementation-task-detail.md` guidance: "reference section headings when line numbers will drift").

### PR 2 plan history date off by one day

- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `.prism/plans/epic-prism-pattern-absorptions-wave-2.md` (PR 2 History entry + PR Readiness "Last updated" line)
- **Problem:** Plan History entry for PR 2 was originally dated `2026-05-24` but the commit (`f52c07b`) is timestamped `2026-05-23 20:15:09 -0500` and the session's `Today's date` is `2026-05-23`. PR Readiness "Last updated" carried the same `2026-05-24` drifted date. The History rule requires dates to match real events — this was a transcription drift, not a correctness issue, but it confused anyone cross-referencing the plan against `git log`.
- **Suggested fix:** Change both `2026-05-24` references to `2026-05-23` so the plan matches the commit timestamp.

### PR 3 Eric Spec-axis "Scope creep" bullet has broken grammar

- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `.ai-skills/skills/prism-code-review-pr/shared.md` — in the new `### Spec axis — what to check` section, the "Scope creep" bullet
- **Problem:** Sentence reads `"Diffs that include files no task names is the canonical signal."` — missing a verb/word. Intent is decipherable from surrounding context (diffs touching files not mentioned in any plan task signal scope creep), but the sentence as written is incoherent. Future Spec-axis subagents reading this rule as their checklist will trip on the ambiguity.
- **Suggested fix:** Replace with `"Diffs that touch files not named in any implementation task are the canonical signal."` Targeted Edit (not `replace_all`) — only this one occurrence of the phrase. Platform mirrors regenerate via `pnpm prism:build`.

### PR 2 followup commit over-replaced `2026-05-24` references

- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `.prism/plans/epic-prism-pattern-absorptions-wave-2.md` (`## Review Issues` entries + new Briar-followup `## History` line)
- **Problem:** Clove's followup commit (`edca387`) used a global replace that swept ALL `2026-05-24` references — including the ones inside the prior Review Issue's `Problem:` and `Suggested fix:` descriptions that were *documenting* the bad date as evidence, plus the new History line that records the drift cause. After the global replace: Review Issue Problem reads "dated `2026-05-23` but the commit timestamped `2026-05-23`" (no drift described); Suggested fix reads "Change both `2026-05-23` references to `2026-05-23`" (tautology); History entry says "drift (`2026-05-23` vs actual session date `2026-05-23`)" (no drift described). The actual fix to the History and PR Readiness dates is correct — the audit trail in `## Review Issues` and the new History line lost the original-bad-date anchor.
- **Suggested fix:** Restore `2026-05-24` references in three places: (1) the prior Review Issue's `Problem:` line where it says the entry "is dated `2026-05-23`" — change back to "was originally dated `2026-05-24`"; (2) the prior Review Issue's `Suggested fix:` line where it says "Change both `2026-05-23` references" — change back to "Change both `2026-05-24` references"; (3) the new Briar-followup History line where it says "drift (`2026-05-23` vs actual session date `2026-05-23`)" — change back to "drift (`2026-05-24` vs actual session date `2026-05-23`)". Use targeted `Edit` calls (not `replace_all`) so the corrections don't sweep historical anchors.

### PR 3 Eric in-branch procedure has step-number collisions across Phase 3/4/5

- **Severity:** `major`
- **Status:** `fixed`
- **File:** `.ai-skills/skills/prism-code-review-pr/shared.md` — in-branch mode procedure, Phases 3, 4, 5
- **Problem:** The two-axis restructure grew Phase 3 to four steps (6, 7, 8, 9) but left Phase 4 starting at step 7 and Phase 5 at step 8 — the original numbering from before the restructure. Result: steps 7 and 8 each appear twice with different meanings ("If lightweight" vs "Parallel batch D", "Assemble the 3-section output" vs "Plan update is skipped"). Future agents and the internal `step 12` citation at line 551 hit ambiguous references. The two-axis upgrade is functionally correct but the procedure is no longer linearly addressable.
- **Suggested fix:** Renumber Phase 4 step 7 → 10 (Parallel batch D), Phase 5 step 8 → 11 (Plan update skipped). Repoint line 551 citation from "step 12" → "step 10" so the inline-comment 422 fallback points at the new batch D step. Targeted Edits (not `replace_all`) on the canonical, then rebuild platform mirrors via `pnpm prism:build`.

### PR 4 Winston editable-surface claim conflicts with pre-existing Ownership & Handoff line

- **Severity:** `major`
- **Status:** `fixed`
- **File:** `.ai-skills/skills/prism-architect/shared.md:139` (new) vs `.ai-skills/skills/prism-architect/shared.md:118` (pre-existing)
- **Problem:** The new `## What Winston is not` section (line 139) states "Winston's editable surface is `.prism/` (plans, architect docs, ADRs) and `docs/`". The pre-existing **Ownership & Handoff** sentence at line 118 states "Winston's editable scope is `.claude/` and `docs/` files only". The two claims disagree on the canonical editable surface. Winston's actual behavior writes plans/architect docs/ADRs under `.prism/`, so line 139 reflects reality and line 118 is stale — but with both present in the same file, downstream agents and reviewers will alternately get the wrong answer depending on which they hit first. Internal contradiction in a doc that every architect-mode invocation loads is a Major; the prior PR 3 step-collision finding was scored Major on the same shape (ambiguous references future agents trip on).
- **Suggested fix:** Reconcile by editing line 118's Ownership & Handoff sentence to match the new section: change "`.claude/` and `docs/`" → "`.prism/` (plans, architect docs, ADRs) and `docs/`". Targeted Edit on the canonical only; rebuild regenerates the 3 mirrors.

### PR 4 Re-plan Mode flow omits the "rewrite plan" step

- **Severity:** `major`
- **Status:** `fixed`
- **File:** `.ai-skills/skills/prism-architect/shared.md` — `## Re-plan Mode` flow (lines 367–380)
- **Problem:** The intro at line 367 says "The mode's job is to **update the plan**, then propagate the changes to every artifact that depends on it." The numbered flow at lines 376–380 documents only the propagate half: (1) diff old vs new, (2) walk stale-artifact table, (3) output propagation report, (4) route stale artifacts, (5) auto-sync. There is no step that actually rewrites `## Implementation Tasks` and `## Acceptance Criteria` in the plan to match the new scope. As written, step 5's "auto-sync Linear AC per the standard plan-mode flow at step 8" would push whatever AC is currently in the plan — which by definition is the stale, pre-re-plan AC, since no step instructed Winston to rewrite it. The mode is structurally incomplete: the propagation steps assume an update that the procedure never performs.
- **Suggested fix:** Insert a new step 2 between the diff (step 1) and the artifact walk (current step 2 → becomes 3): `**Rewrite the plan.** Update ## Implementation Tasks and ## Acceptance Criteria in the plan to reflect the new scope. Apply the detail bar from implementation-task-detail.md. Preserve completed-task markers so Clove can see what survived the re-scope.` Renumber the remaining steps (3–6). Update step 6 (current step 5)'s parenthetical reference to step 8 of plan-mode if needed (it still refers to plan-mode step 8, which is unaffected). The intro's "update the plan, then propagate" phrasing then matches the documented flow.

### PR 4 Re-plan Mode implicit trigger fires falsely on plain plan revisions

- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `.ai-skills/skills/prism-architect/shared.md:372`
- **Problem:** The implicit trigger says "Winston detects he's about to overwrite `## Implementation Tasks` on a plan whose `## History` is non-empty (i.e., implementation has started). In that case, switch to Re-plan Mode instead of overwriting silently." But the parenthetical equivalence is wrong: `## History` becomes non-empty as soon as Winston's own plan-mode step 7 appends `YYYY-MM-DD: Plan created — …`. So the trigger fires the moment Winston re-enters plan mode after initial plan creation, even if Clove hasn't touched a single file. The intended trigger is "**implementation** has started," not "history is non-empty." The over-trigger is a friction case — Re-plan Mode would run when the user just wants to revise pre-implementation scope.
- **Suggested fix:** Tighten the implicit trigger to "history contains a Clove implementation entry" or "PR exists for the branch" — both signal real implementation start. Alternative: change the wording from "non-empty" to "contains entries past the initial `Plan created` entry." Either lands the correct semantic without false-firing on pre-Clove revisions.

### PR 4 `implementation-task-detail.md § 5` citation references a list item, not a section

- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `.ai-skills/skills/prism-architect/shared.md:285, 329`
- **Problem:** Two new citations in PR 4 use `[implementation-task-detail.md § 5](../../rules/implementation-task-detail.md)`. The `§ 5` notation conventionally maps to a `## 5` or `### 5` heading. The actual file has no such heading — item 5 of the numbered bullet list under `## The bar` (the `[HITL]` tag rule) is what's being referenced. Readers clicking the link land at the file root, not at item 5 — and section-search for "5" returns nothing useful. No other skill in the codebase uses `§ <number>` citation against this rule; the convention was invented in PR 4.
- **Suggested fix:** Either (a) replace `§ 5` with the readable section anchor — `implementation-task-detail.md § The bar (item 5 — [HITL] tag)`; or (b) reformat to a deep-link by adding an explicit anchor in `implementation-task-detail.md` (`<a id="hitl-tag"></a>` near item 5) and citing the anchor. Option (a) is the lower-friction fix and matches the existing PRISM citation pattern (`branch-plan.md § Depth on Verified Fixes…`).

---

## Acceptance Criteria

### Behavioral

- [x] Given Sasha is invoked to diagnose a bug, When she runs through the diagnostic flow, Then she produces a six-phase output with the feedback loop as the deliverable Phase 1 output (a pass/fail signal). _(PR 2 — six-phase frame replaces the old 5-stage debugging process; Phase 1 is signal-construction ladder)_
- [x] Given Sasha reaches Phase 5, When she designs a regression test, Then she specifies what it should cover without writing the test (preserving the diagnose-only boundary; Clove implements). _(PR 2 — Phase 5 names what to assert / where it lives / what inputs trigger / failing-test output; "no correct seam" finding format adopted)_
- [x] Given Sasha files a debug report in `## Debugged Issues`, When she states a root-cause claim, Then every claim is tagged `[Confirmed]`, `[Deduced]`, or `[Hypothesized]` and the entry carries a `Confidence:` field. _(PR 2 — branch-plan.md `## Debugged Issues` template extended in 2 surfaces in lockstep: `.prism/rules/`, `templates/install/.prism/rules/`; `.claude/`, `.codex/`, `.cursor/` mirrors regenerated by build)_
- [x] Given a multi-session debug is in progress, When the session is interrupted and resumed, Then Sasha reads `.prism/sasha-state.json` (single state file, no per-step files) and offers to continue from the prior `currentPhase`. _(PR 2 — case-file schema, atomic-write protocol, and resume-detection logic added; lighter-variant clarification added to `micro-file-step-machine.md` with Sasha as new citer)_
- [x] Given Eric is reviewing a PR with a full spec, When he produces his review output, Then the output has three sections (Standards findings / Spec findings / Cross-cutting observations) and findings from one axis never mask findings from the other. _(PR 3 — Phase 3 rewritten to spawn two parallel subagents with context-isolated inputs; Summary format restructured with three named sections; explicit "do not merge across axes" rule)_
- [x] Given Eric is reviewing a PR with no branch plan or AC, When he produces his review output, Then the Spec axis is loudly skipped (`"Spec axis skipped — no spec available"`) and the confidence label reflects this (`confidence:standards-only`). _(PR 3 — Missing spec handling sub-section added with full/partial/no-spec state table; new `confidence:standards-only` label added to label definitions and decision gate; standards-only treated as state #3 for ready-flip)_
- [x] Given Eric is reviewing a docs-only PR, When he selects the review path, Then he uses the lightweight single-pass path (no parallel subagents) to avoid doubled API cost on trivial PRs. _(PR 3 — PR classification step augmented with explicit "lightweight stays single-pass" branch; full path's parallel-subagent dispatch is opt-in via the classification gate)_
- [ ] Given Winston writes implementation tasks, When a task requires a human decision before execution can start, Then that task carries the `[HITL]` tag immediately after its number; tasks without the tag default to `[AFK]`.
- [ ] Given Winston is asked to re-plan a ticket whose plan has non-empty `## History`, When he runs Re-plan Mode, Then his output names which other artifacts (Linear AC, Linear ticket desc, Mira user stories, Parker PRD, in-flight Clove work, PR body, Pixel mock spec, Reese AC) are stale and offers persona routing for each.
- [ ] Given Winston is starting plan mode and the vertical-slice signals fire (3+ signals in pure plan mode; all signals in evaluate-then-plan), When he transitions between plan-mode steps 2 and 3, Then he asks the decomposition-shape question once before generating tasks.
- [ ] Given Winston is in vertical mode and the slice count exceeds the epic-detection threshold, When he completes the decomposition, Then each slice becomes its own story plan and the epic plan references the slice-story plans.
- [ ] Given Parker is in greenfield mode at `stakes != hobby` transitioning out of stakes calibration, When the transition fires, Then Parker pauses with a STOP marker and waits for explicit user confirmation before advancing to mode/draft/rubric.
- [ ] Given Atlas is transitioning out of Batch 2 survey, When the transition fires and Atlas is not in `dogfood-self` mode, Then Atlas pauses with a STOP marker and waits for explicit user confirmation before starting question 1.
- [ ] Given an epic is complete and the user invokes Iris, When Iris runs the retro, Then she produces a multi-voice dialogue using only personas that actually touched the plan (evidence-based), surfaces disagreements from outcome-vs-prediction gaps in `## Decisions`, and closes with `## Action Items` proposing owners.
- [ ] Given Iris finishes a retro with action items, When she presents the closing message, Then she offers to hand off to Nora to file the action items as follow-up tickets (recommend-without-auto-invoke).
- [x] Given any persona finishes its work, When the persona produces its closing message, Then the message names the natural next persona and offers handoff without auto-invoking. _(PR 1 — 17 persona shared.md files updated with `## Next persona` sections citing `.prism/architect/closing-messages.md`)_
- [x] Given Theo or Winston needs to apply the triple-gate ADR criterion, When they look up the criterion, Then they find it at `.prism/references/triple-gated-adr-criterion.md` and cite that doc instead of the roadmap fallback. _(PR 1)_

### Non-behavioral

- [x] All canonical edits land in `.ai-skills/skills/<id>/shared.md` (not in generated `.claude/skills/<id>/SKILL.md`, `.cursor/skills/<id>/SKILL.md`, or `.codex/agents/<id>.toml` mirrors). _(PR 1 — all 17 persona edits in canonical; mirrors regenerated by build)_
- [x] No new install-template file is created as an empty/header-only placeholder (lazy-artifact rule applied). _(PR 1 — lazy-artifacts.md rule landed; manifest.stub.json exception documented)_
- [x] `templates/install/.prism/lessons-archive.md` no longer exists; Zoe creates it on first archive. _(PR 1)_
- [x] `pnpm prism:build` regenerates mirrors without errors after each PR. _(PR 1 verified)_
- [x] `pnpm prism:check` reports no drift between canonical sources and mirrors after each PR. _(PR 1 verified — "Generated outputs are in sync")_
- [x] `pnpm prism:check-types` exits clean after each PR. _(PR 1 verified)_
- [x] `pnpm prism:test` exits clean after each PR. _(PR 1 verified — 116/116 tests pass)_
- [ ] No new ADR file is created — wave 2's changes don't meet the triple-gate.
- [x] New reference doc exists at `.prism/references/triple-gated-adr-criterion.md`. _(PR 1)_
- [x] New rule file exists at `.prism/rules/lazy-artifacts.md` and `.prism/rules/implementation-task-detail.md` has the AFK/HITL tag rule. _(PR 1)_
- [x] New architect doc exists at `.prism/architect/closing-messages.md`. _(PR 1 — Iris's row added in PR 5)_
- [ ] New persona files exist under `.ai-skills/skills/prism-iris/` and `.prism/skills/prism-iris/`.
- [ ] Iris registered in `.prism/SPEC.md` persona roster and `AGENTS.md § 9` routing table.
- [ ] Paired dev doc for Iris exists at `docs/content/dev/architecture/iris.md` per ADR-0038.
- [ ] Templates mirror updates land in `templates/install/` per the canonical-template pairing convention (verified by `pnpm prism:check`).
- [x] Updates to `.prism/rules/branch-plan.md` (evidence grading in `## Debugged Issues`) land in lockstep across `.prism/`, `.claude/`, and `templates/install/` mirrors. _(PR 2 — `.prism/rules/` and `templates/install/.prism/rules/` edited manually; `.claude/`, `.codex/`, `.cursor/` regenerated by `pnpm prism:build`)_

### AC Adjustments

### AC Sync Log

| Date | Agent | Action | Plan | Linear |
| ---- | ----- | ------ | ---- | ------ |

---

## Cleanup Items

- `templates/install/.prism/architect/manifest.stub.json` — quick read in PR 1 task 4 to determine lazy-eligibility.

---

## PR Readiness

- [ ] No critical or major issues — _PR 5: Briar self-review not yet run._
- [x] Types correct — no `any`, no unsafe `as` — _PR 5: `tsc --noEmit` clean_
- [x] No stray console.logs or debug artifacts — _PR 5: content-only edits + new markdown persona scaffolding_
- [x] Tests written for new logic and edge cases — _N/A, content-only edits + persona scaffolding across all 5 PRs (116 existing tests pass)_
- [x] All debugged issues resolved (no `open` entries) — _none filed in PR 5_
- [x] Build passes — last run: 2026-05-23 (PR 5 — direct-binary verification: tsx build, tsx --check, tsc --noEmit, tsx --test all green; 116/116)
- [ ] PR description up to date — _PR 5 not yet opened; Briar self-review precedes PR creation_
- [x] Lasting decisions promoted to architect context (if applicable) — _wave 2 itself is the absorption; Iris persona promoted into skills-ecosystem.md + closing-messages.md + AGENTS.md § 9 + install template mirrors_

**Last updated:** 2026-05-23 (PR 5 Clove implementation complete; build + check + check-types + test all green; awaiting Briar self-review)

---

## Operational notes

- **Label-edit REST workaround.** `gh pr edit --add-label` fails silently on PRISM due to GitHub Projects Classic deprecation (see `.prism/lessons.md`). Use `gh api repos/HunterMcGrew/PRISM/issues/<num>/labels -X POST --input -` instead. Affects every wave-2 PR's Eric review batch D label step.
- **`confidence:standards-only` ready-flip.** PR #36 introduced draft-by-default + Eric ready-flip on state #3 (`confidence:high` / `confidence:needs-judgment`). When PR 3 adds the `confidence:standards-only` label (task 19), it should be treated as state #3 for ready-flip purposes — Spec-axis-skip is a transparency label, not a blocking finding.
- **Epic plan preservation at close-out.** Per `.prism/lessons.md`, shipped epic plans are preserved and marked `shipped` in `.prism/plans/roadmap.md` — not deleted (overrides the default `branch-plan.md` "delete on close" rule for epics). After all 5 PRs merge, mark this plan shipped in the roadmap; preserve the file.

---

## Dependencies and Sequencing

### PR sequence

| PR | Scope | Tasks | Depends on |
|---|---|---|---|
| **PR 1** | Foundation (small additive surface) | 1–9 | None — lands first |
| **PR 2** | Sasha (six-phase + evidence + case file) | 10–15 | PR 1 (branch-plan template changes coordinate) |
| **PR 3** | Eric (3-section + parallel subagents) | 16–22 | PR 1 (closing-messages.md cited) |
| **PR 4** | Winston (Re-plan Mode + AFK/HITL + vertical) | 23–33 | PR 1 (AFK/HITL rule extracted; closing-messages.md cited) |
| **PR 5** | Parker + Atlas STOPs + Iris | 34–43 | PR 1 (closing-messages.md exists for Iris's row) |

PR 1 is the gating PR — it lands the rules, references, and architect docs that PRs 2–5 cite. PRs 2–5 are parallel-safe once PR 1 merges.

### Internal sequencing within PRs

- PR 1: Tasks 1–6 parallel-safe (independent file edits). Task 7 (per-persona shared.md routing) runs after tasks 1–6 land. Task 8 (build + verify) runs last.
- PR 2: Tasks 10–13 parallel-safe within Sasha. Task 14 (micro-file-step-machine.md update) parallel-safe. Task 15 last.
- PR 3: Tasks 16–21 sequential (each modifies overlapping sections). Task 22 last.
- PR 4: Tasks 23–32 mostly sequential (Re-plan Mode + decomposition gate touch overlapping sections). Task 33 last.
- PR 5: Tasks 34–36 (Parker/Atlas STOPs + onboarding docs note) parallel-safe with tasks 37–42 (Iris). Task 43 last.

### External dependencies

- The other in-flight agent on `hmcgrew/prism-1.5f.1-pixel-mocks-relocation` is modifying overlapping files. Wave 2 implementation (PRs 2–5) must wait for that branch to merge OR explicitly rebase. PR 1 plan creation in this worktree does not conflict.
