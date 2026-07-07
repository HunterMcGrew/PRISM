# Plan: iris-cadence-starvation — retro-charter redesign

## Ticket

None yet — the operator files after reviewing this plan (Winston evaluation dispatched by Sol, 2026-07-06). Do not open a GitHub issue from this plan without operator sign-off.

## Goal

Redefine the retro as a charter-driven, two-source divergence audit with one engine (Iris) and three entry points (explicit, a universal declinable plan-close gate, Sol run-close auto-dispatch), running at two grains (light per-ticket fidelity check, heavy epic divergence audit) with per-team-configured evidence sources, so a retro that never runs or runs underfed can no longer fail silently.

---

## The retro charter

The operator's definition of what a retro must check — the north star every design decision below serves:

1. Did we do what we said we'd do? (`## Decisions` / `## Acceptance Criteria` vs. what actually shipped)
2. Were there issues? Bottlenecks?
3. Actionable items — improvements we could make?
4. Did we follow the code standards?
5. Did we do anything wrong? What could we do better?
6. Are the tests passing? (retro reading: what did the CI record show — red cycles, late catches, cost)

**Structural consequence:** items 1, 4, 5, and 6 require evidence the plan never holds. AC-vs-shipped needs the merged diff (git). Standards adherence and "anything wrong" live half in the plan (Briar writes `## Review Issues`) and half in Eric's PR threads (his default in-branch mode skips plan writes by design). CI state lives only in check runs. A plan-only retro therefore *cannot answer the charter* — even with perfect plan write-back. Two-source evidence (plan = intent; git/GitHub execution record = outcome) is a precondition for the retro doing its stated job, not an enhancement.

**What a retro is in an agentic system — one engine, three entry points, two grains.** (The operator broadened all three OPEN questions: the gate is universal not epic-only, Sol auto-dispatches not proposes, and retros run at two grains. The design below reflects the resolved model; the per-question reasoning is in `## Decisions`.)

- **Standalone** (today's Iris, upgraded): explicitly invoked on an epic or date range; runs the full charter against both evidence sources; multi-voice synthesis; neutrality preserved by the persona.
- **In the happy path** (universal, two-grain): every plan close records a declinable `> Retro:` verdict line — the nudge is universal, the skip is visible. The Before-Closing ceremony restructures into **reflect, then close**: a reflection phase produces the evidence-checked view, then the close phase promotes and marks closed. The reflect phase is grain-adaptive: at ticket/PR grain it is a *lightweight charter-fidelity check* (did THIS ticket ship what it said — plan-AC vs. merged diff, its own CI, Eric's review — mechanical, cheap enough to run on every ticket, no persona dispatch); at epic grain it is the *full Iris charter retro* that aggregates the per-ticket fidelity notes and spends its budget on cross-ticket patterns (map-reduce: per-PR = map, epic = reduce). The theater risk of a universal gate is answered by grain, not by exempting trivial tickets. The rest of the flow *feeds* the reflect phase: write-back obligations (Eric/Clove findings → `## Review Issues`) keep the plan a truthful intent-and-issue record.
- **Inside Sol**: Sol reaches run close holding exactly the evidence a plan-only retro lacks — lane verdicts, Briar/Eric findings, CI results, merge outcomes. Sol does not own a retro utility (Sol writes only run-control state; artifact writes belong to personas); Sol *auto-dispatches Iris* at run close, both grains, with those evidence pointers in the dispatch prompt. Auto-dispatch is the Sol default — this is the one context that holds both the trigger authority and the evidence, so the retro is genuinely involuntary here; every dispatch and outcome is recorded in the run report (on-the-loop, never dark).

**Evidence sources are per-team, not hardcoded.** The charter's items 1/4/5/6 read from merged diffs, PR threads, and CI — but a team may have no CI, or a non-GitHub PR platform. Atlas writes a `retroEvidence` config block at onboarding; Iris reads it to know which sources exist. A source the team doesn't have renders in the coverage table as *not configured* (an honest unavailable), never as *nothing found* — the seam that keeps the coverage table honest across stacks, not just GitHub+CI.

**Does the retro replace Winston's Before-Closing ceremony?** It replaces the ceremony's *shape*, not its *ownership*. Full replacement — Iris executing promotions, verdict gates, and the close marker — breaks three invariants at once: Iris's read-only-on-source-plans invariant (`step-06` § Invariant), Winston's ownership of `.prism/` promotion writes, and facilitator neutrality (if the retro's divergence verdicts gate what gets promoted to durable context, the verdict-issuer must not be the decision-author — promotion-verification by the promoter is self-review of one's own judgment). "Sit beside" is equally wrong: two overlapping close ceremonies whose "what should we improve" and "what should we promote" can silently disagree. The correct structure is **reflect → close within one ceremony**: Iris reflects (read-only; produces charter verdicts, action items, lesson candidates, and *promotion cautions* — Decisions the execution record refuted), Winston closes (consumes the cautions into the Decision verdict gate — a refuted Decision is promoted as corrected or demoted to a lesson, never promoted unchanged — then promotes, records `> Retro:`, marks closed). This is the same separation PRISM already runs at shipping: authors ship, reviewers review; here, deciders close, reflectors verify. Today's ceremony promotes decisions without checking them against outcomes — the retro is the missing verification step inside it, not a second ceremony next to it.

**Placement seam (pre-merge vs. post-merge evidence):** ADR-0047's placement stands — the close, retro included, runs on the final PR branch post-review pre-merge, and the retro report rides that PR as a committed file. A post-merge retro would require exactly the standalone close-out PR the rule exists to avoid. Evidence cost is small and nameable: at single-ticket grain, squash makes branch-diff ≈ merged-diff and PR CI ≈ main CI; at epic grain, all earlier children are fully merge-settled by close time and only the final child's main-CI is approximated by its PR CI — the charter-coverage table states this approximation explicitly. Sol runs get the best evidence (his close fires after gate-merges settle) and write the same `> Retro:` line.

---

## Problem statement

Three questions were evaluated ahead of the charter; verdicts with evidence:

1. **Cadence contradiction — partially confirmed.** "Cadence-driven + explicit invocation" is not itself a contradiction — ADR-0037 defines the axis that way ("Cadence-driven personas don't auto-trigger... advisory", `0037-cadence-driven-personas.md:44`), and Zoe and Atlas carry identical "Explicit invocation; no auto-trigger" wording. The real defect: Iris has no cadence *at all*. Zoe names "weekly default" (`prism-surface-audit/shared.md:116`); Atlas is event-bound ("once per install", ADR-0040); Iris's `shared.md:1,14,78` and the roster row (`skills-ecosystem.md:48`) name no rhythm and no event. The operator's deeper thesis is empirically supported, and Zoe is corroboration, not a counterexample: her advisory weekly cadence produced exactly one audit in six weeks (`.prism/audits/` holds only `2026-06-05-audit.md`), and Iris has never run (`.prism/retros/` and `.prism/iris-state.json` do not exist). Atlas is the reconciling case — event-bound triggers fire because the event blocks something the user wants.
2. **Silent starvation — confirmed, upgraded by the charter.** Not a wholesale GitHub migration: Briar demonstrably writes `## Review Issues` into plans (epic-floor-revert, agents-md-slim, epic-lean-skill-architecture all carry real entries). Three specific leaks starve the divergence engine: (a) Eric's default in-branch mode skips plan writes — "Findings live in the PR comments" (`prism-code-review-pr/shared.md:214`); (b) CI/build failures fixed inline never produce `## Debugged Issues` entries — that section is empirically near-empty across epics; (c) review-loop fix cycles compress findings to one-line `## History` entries. Iris's own guard (Procedure C, `prism-retro/shared.md:107`) can never fire on a real plan — "fewer than two evidence entries across all four sections combined" is always exceeded by `## History` alone — so divergence-fuel starvation passes silently and emits "No divergences surfaced; this epic shipped close to plan" (`shared.md:28`) unqualified. The charter upgrades this from "thin food" to "wrong food model": charter items 1/4/5/6 were never answerable from plan sections, so the fix is a two-source evidence design, with write-back repairing the durable record in parallel.
3. **Persona vs utility — refuted (persona is correct).** ADR-0046's test: a utility is "an action every persona can run... runs in the invoking persona's voice." A retro fails both halves. It is not something every persona does mid-flow — it is a boundary act. And the voice question is disqualifying: the invoking personas are the retro's *subjects*. Step-04 re-litigates Winston's Decisions against Clove's Debugged Issues; a retro running in a participant's voice is structurally an advocate's retro — facilitator neutrality is the load-bearing property. ADR-0037's rejection of option (b) applies equally: "the work is judgment work... a cron job that produces a flat list is a list nobody acts on." Multi-voice staging is not theater — persona attribution is routing information (step-05 derives action-item owners from voices). Reclassification also fails the deletion test: it deletes ~40 lines of voice/lens while the six-step machine and divergence classification (the actual complexity) remain. And it does not dissolve Problem 1: nothing in ADR-0046 forks invocation ("a utility skill is invoked the same way everywhere") — a boundary trigger dispatches a persona exactly as easily as it invokes a utility. The Sol-context variant ("Sol-owned utility") fails on Sol's own constitution: Sol writes only run-control state and dispatches personas; dispatch-with-context is his native verb, so no second retro implementation is needed. One engine, three entry points.

**Root cause framing: two defects, one amplifying loop, one charter gap.** Problem 1 is an activation-design defect (memory-bound trigger). Problem 2 is an evidence-model defect (plan-only sourcing against a charter that is half execution-record). They interact as a loop: never runs → starvation never observed → the one run produces a boring retro → never runs again. The fixes invert the loop: boundary entry points make retros frequent; charter-coverage reporting makes underfed retros loud; each loud report pressures the write-back seams.

---

## Implementation Tasks

Grouped by persona per ADR-0018. All canonical edits go to `.ai-skills/skills/` and `.prism/` sources; `pnpm run prism:build` regenerates platform copies (`.claude/`, `.codex/`, `.cursor/`) and syncs the install seed (`templates/install/.prism/` — the seed-drift gate reports what must move together). Never edit generated copies directly.

### Clove (implementation)

1. **Charter + event-bound cadence + entry points in `.ai-skills/skills/prism-retro/shared.md`.**
   - Add a `## Charter` section directly after `## Identity`, listing the six charter questions verbatim (from § The retro charter above) and the two-source rule: plan sections carry intent; the execution record carries outcome; every charter item is answered from the sources that can answer it (per the team's `retroEvidence` config), and an unanswerable item is reported as unanswered — never papered over.
   - Line 1: after "You exist on the cadence axis alongside Zoe and Atlas", name the rhythm: "Your cadence is event-bound — every plan close, at two grains — the way Atlas's is per-install and Zoe's is weekly." Keep "explicit invocation, never auto-routed."
   - Line 14: extend the shared-shape sentence: each cadence persona carries its own rhythm (Zoe weekly, Atlas per install, Iris per plan close — the retro gate in `branch-plan.md § Before Closing` surfaces the offer at that boundary).
   - Line 28 quirk: replace `"No divergences surfaced; this epic shipped close to plan."` with the coverage-qualified pair — full coverage: "No divergences surfaced — and all six charter items were answerable from the evidence reached. This shipped close to plan." / partial coverage: "No divergences detectable from the evidence reached — charter items <list> went unanswered (<missing or not-configured source>). Treat this as absence of evidence, not absence of drift."
   - § When this skill is invoked (line 78): keep explicit-only; name the three entry points: explicit invocation, the universal plan-close retro gate in `.prism/rules/branch-plan.md § Before Closing` (Winston surfaces the offer at plan close, grain-adaptive), and Sol's run-close auto-dispatch (both grains). The first two are offers the user invokes; the third is a Sol persona dispatch. Note the two grains — per-PR fidelity check vs. epic divergence audit — and that step-02 takes a `grain` input.
   - Add a `## When dispatched by Sol` section mirroring Winston's/Eric's (return one verdict from `.prism/skills/prism-conductor/lib/report-back.md` plus secondary signals; accept evidence pointers — plan path, PR numbers, CI outcomes, lane verdicts — from the dispatch prompt as step-02 inputs). Iris currently lacks it and cannot be Sol-dispatched cleanly without it.
   - Add a ceremony-position paragraph to `## Identity`: Iris is the reflection phase of the plan-close ceremony (`branch-plan.md § Before Closing`) — her report's divergence verdicts, lesson candidates, and promotion cautions are *inputs* Winston consumes during the close phase. Iris stays read-only on plans and architect docs; the separation (reflector ≠ closer) is deliberate, mirroring authors-ship-reviewers-review.
   - Rewrite Procedure C to key off charter coverage (task 2) instead of the "fewer than two entries combined" threshold.
   - Update the Output format block to match task 4's report shape.
   - Verification: `pnpm run prism:build` green; `grep -rn "shipped close to plan" .ai-skills .prism .claude .cursor .agents templates` shows only the new coverage-qualified phrasings.

2. **Two-source evidence model + config-driven sources + grain switch + charter-coverage table in `.prism/skills/prism-retro/step-02-gather-evidence.md`.**
   - Rename the step's job: gather *intent* evidence (plan sections, as today) and *outcome* evidence (execution record), then compute charter coverage.
   - **Read the per-team evidence config first.** Load `.ai-skills/config.json#retroEvidence` (schema from task 2b). It declares which execution-record sources exist for this team (CI system present + name; PR/review platform; test command; DoD/coverage gates). Every source read below is gated on this config, not hardcoded — a source the config marks absent is skipped and rendered as `not configured for this team` in the coverage table, distinct from `configured but unreachable this run`.
   - **Grain switch.** step-02 accepts a `grain` input (`per-pr` | `epic`, default `epic`; Sol and the ceremony pass it explicitly):
     - `per-pr` — scope is one ticket/PR. Read only that ticket's plan-AC, its merged diff, its own CI conclusion, and its PR review thread. No cross-plan glob, no aggregation. Output is the compact per-ticket fidelity note (charter items 1/4/5/6 for this ticket only). This is the cheap grain — it runs on every ticket.
     - `epic` — scope is the epic plan and its children. Full source set below, **plus** ingest any per-PR fidelity notes emitted by child tickets (the map-reduce: per-PR notes are the map output, the epic retro reduces them) so the epic retro spends budget on cross-ticket patterns, not re-deriving per-ticket fidelity.
   - Outcome-evidence actions, each config-gated and individually skippable:
     - **Merged diffs:** from `## History` branch names and PR references, resolve merge commits (`git log --oneline --grep=<ticket-id>` / `gh pr view <n> --json mergeCommit,files` when the config's PR platform is GitHub). Used for charter item 1 (AC-vs-shipped). Git is always available; this source is never `not configured`.
     - **PR review threads:** via the config's PR platform (`gh pr view <n> --comments` for GitHub) for every PR the plan names. Used for charter items 4/5 (Eric's findings that never reached the plan).
     - **CI conclusions:** only when the config declares a CI system — check-run *conclusions* (pass/fail history, not log archaeology). Used for charter item 6. No-CI team → this row renders `CI — not configured for this team`.
     - When dispatched by Sol, evidence pointers arrive in the dispatch prompt — use them before searching.
     - Runtime gate on top of the config gate: even a configured source can be unreachable (`gh auth status` fails) — that renders `configured but unreachable this run`, and the dependent charter items are unanswered.
   - Compute and write to state: `evidence.census = { history, decisions, debugged, review, prThreads, ciRuns, mergedPrs }` (counts), `evidence.grain`, and `evidence.charterCoverage = [{ item: 1..6, answerable: true|false, sources: [...], gap: "<missing source>" | "not-configured" | null }]`.
   - Tag every outcome-evidence entry `source: "pr-thread" | "ci" | "merged-diff"` so plan-borne and execution-borne citations never blend.
   - Cross-referencing (existing action 3) extends at `epic` grain: divergence candidates now include AC items with no corresponding shipped change, Decisions contradicted by PR-thread findings, and CI red-cycles clustered on an area a Decision called low-risk.
   - Exit condition gains: `evidence.charterCoverage` populated; any unanswerable item carries a named gap (`not-configured` vs. a missing source is distinguished).
   - Verification: build green; dry-run at `epic` grain against `.prism/plans/epic-prism-conductor.md` (decisions-rich, debug-empty) marks items 4–6 unanswered when run without `gh`; against `.prism/plans/epic-floor-revert.md` with `gh` available reaches PR threads for the PRs its History names (#371, #372); a `per-pr` dry-run against any single-ticket plan produces a one-row-per-item fidelity note and no cross-plan reads.

2b. **Per-team retro evidence-source config: schema + Atlas onboarding question set.**
   - **Schema field** — add a `retroEvidence` block to `.ai-skills/config.json` (and the install skeleton the build seeds). Shape:
     ```json
     "retroEvidence": {
       "ci": { "present": true, "system": "github-actions" },
       "prPlatform": "github",
       "testCommand": "pnpm run prism:test",
       "dodGates": ["types", "crossref-lint", "tests", "build"]
     }
     ```
     Document each key in `.prism/rules/verification-commands.md`'s config-map section (that file already documents `commands.*`; `retroEvidence` is a sibling block) — one row per key, cite don't restate.
   - **Atlas onboarding question set** — add a retro-evidence question group to the onboarding flow at `.prism/references/onboarding/question-flow.md` (Atlas's question order lives there per `prism-onboarding/shared.md:127`). One-question-per-turn per Atlas's invariant. Questions: "Does this team run CI? Which system?" → "What platform hosts your PRs/reviews?" → "What's your test command?" → "What gates define done (types/lint/tests/build/coverage)?" Each answer writes into `retroEvidence` and saves state before the next question (Atlas's state-after-each-answer guarantee).
   - **Detection default** — where Atlas already detects the stack, propose defaults: a `.github/workflows/` dir → `ci.present: true, system: "github-actions"`; a GitHub remote → `prPlatform: "github"`; `commands.test` → `testCommand`. Atlas proposes, the user confirms/corrects (his standard detection-then-confirm shape).
   - Sequence: before task 2 can be verified end-to-end (step-02 reads this config), but the schema field can land independently. Verification: `pnpm run prism:test` (config-schema + discovery tests); `pnpm run prism:check`.

3. **Charter-keyed topics + grain switch + coverage-qualified phrasing in `.prism/skills/prism-retro/step-04-facilitate.md`.**
   - Replace the "typical groupings" with the charter: topics are the six charter items (grouped 1 / 2+3 / 4+5 / 6 when evidence is thin). Every topic either gets dialogue grounded in cited evidence or an explicit "unanswered — <missing source>" line.
   - **Grain switch.** At `per-pr` grain, skip multi-voice staging entirely — emit the compact fidelity note (one line per charter item: shipped-vs-said, CI pass/fail, Eric's-review-clean), no dialogue, no cross-ticket topics. step-03's two-voice floor is relaxed at this grain (a single-scope mechanical fidelity check needs no second voice). At `epic` grain, run the full multi-voice dialogue as designed, and open with a synthesis of the ingested per-PR fidelity notes before the cross-ticket topics.
   - Add to Anti-patterns: "Don't emit an unqualified 'no divergences' conclusion. When any charter item is unanswerable, the closing line lists the unanswered items and their missing sources" — exact phrasings from task 1.
   - Exit condition gains: every charter item appears in the output (dialogue at epic grain, fidelity row at per-pr grain) as either answered or explicitly unanswered.
   - Verification: build green.

4. **Charter-coverage + close-phase outputs in `.prism/skills/prism-retro/step-05-action-items.md` and `step-06-save-report.md`.**
   - Step-05 gains two output lists beside `actionItems`: `lessonCandidates` (patterns fitting `.prism/lessons.md` — proposed, not appended; Winston or the session-close mechanic appends) and `promotionCautions` (each `## Decisions` entry the execution record refuted, with the citing evidence — consumed by Winston's Decision verdict gate during close).
   - Step-06 template: under `**Voices:**`, add a `## Charter coverage` table — one row per charter item: answered/unanswered, sources used, gap (`not-configured` distinguished from an unreachable source). Counts from `evidence.census` render as a single supporting line beneath the table. New `## Promotion cautions` and `## Lesson candidates` sections between `## Action Items` and `## Citations`.
   - **Grain switch on report shape.** At `per-pr` grain the report is the compact fidelity note — header + charter-coverage table + any fidelity gap, no dialogue section, filename `.prism/retros/per-pr/<ticket-id>.md` (or a `.prism/retros/<epic>/` subdir so epic-grain ingest can glob its children). At `epic` grain the full report as designed, with the ingested per-PR notes cited under `### Per-ticket fidelity` in Citations.
   - `## Citations`: split into `### Plan evidence` and `### Execution record` (pr-thread / ci / merged-diff tags); epic grain adds `### Per-ticket fidelity`.
   - Verification: build green.

5. **Description update in `.ai-skills/skills/prism-retro/frontmatter.yml`.**
   - Rewrite the WHAT sentence around the charter and two grains: "Runs the retro charter — plan intent vs. execution record (merged diffs, PR threads, CI, per team-config) — at every plan close: a light per-ticket fidelity check and a full epic-level divergence audit. Every report carries a charter-coverage table." Add `plan close`, `per-PR retro` to the Triggers line. Respect the description shape rules (target 250–400 chars, 1000 cap, folded scalar).
   - Verification: `pnpm run prism:test` (discovery-metadata length check).

6. **Restructure `.prism/rules/branch-plan.md § Before Closing` into reflect-then-close, with the universal two-grain retro gate.**
   - Reframe the section opener: the close ceremony has two phases. **Reflect** — grain-adaptive: at ticket/PR grain, run the lightweight charter-fidelity check (AC-vs-diff-vs-CI, mechanical, runnable inside the existing close pass, no persona dispatch); at epic grain, run the full Iris charter retro (or record the decline). **Close** — promote lasting Decisions (consuming the retro's `## Promotion cautions`: a Decision the execution record refuted is promoted as corrected or demoted to a lesson, never promoted unchanged), run the verdict gate, record the retro verdict line, mark closed. Existing steps 1–2 keep their content; they become the close phase.
   - **Universal gate — every plan close, not just epics.** Every plan (ticket and epic) records a retro verdict line beside `> Closed:`: `> Retro: <path>` or `> Retro: declined — <one-line reason>`. The nudge is universal; declining is always legitimate; the decline is visible and recorded so the skip has teeth. The theater risk the universal gate raises is answered by grain (light per-ticket vs. heavy epic), **not** by exempting trivial plans — an exemption would re-open the silent-skip hole.
   - Why-paragraph (use this reasoning): PRISM cannot force a retro to run involuntarily outside a Sol run — no scheduler, personas never auto-invoke each other, hook enforcement was deliberately reverted (epic-floor-revert). What it can replicate is CI's real property: skipping is a visible, recorded override, not a silent omission. Under Sol the retro *is* involuntary (auto-dispatch, task 10). And promotion-without-relitigation is the defect the reflect phase fixes — today's ceremony can promote a decision the work itself disproved.
   - Placement note in the rule: ADR-0047's pre-merge-on-final-branch placement stands; the retro report rides the final PR as a committed file; the coverage table names the final-child CI approximation at epic grain.
   - Verification: `pnpm run prism:build` (platform copies + seed-drift sync to `templates/install/.prism/rules/branch-plan.md`); `pnpm run prism:crossref-lint`.

7. **Winston close-time reflexes in `.ai-skills/skills/prism-architect/shared.md`.**
   - Add two reflex bullets alongside the existing decision-verdict-gate bullet: "During plan close, run the reflect phase first — grain-adaptive (lightweight fidelity check at ticket grain, full Iris retro at epic grain) — and record the `> Retro:` verdict line before the close marker lands; see [.prism/rules/branch-plan.md § Before Closing]." and "When a retro report exists for the plan being closed, consume its `## Promotion cautions` in the Decision verdict gate — a refuted Decision is promoted as corrected or demoted to a lesson, never promoted unchanged."
   - Verification: build green.

8. **Reviewer flags in Briar and Eric.**
   - `.ai-skills/skills/prism-code-review-self/shared.md`: add a bullet next to the existing missing-decision-verdict flag — when a plan being closed (any grain) lacks the `> Retro:` line, surface as Minor. A recorded `declined` line satisfies the gate; only a *missing* line is flagged.
   - `.ai-skills/skills/prism-code-review-pr/shared.md`: same bullet, scoped to close-out PRs.
   - Verification: build green.

9. **Write-back tightening (content-bus repair — durable record, in parallel with two-source reads).**
   - `.ai-skills/skills/prism-code-review-pr/shared.md`, the in-branch "Plan update is skipped" paragraph (~line 214): keep the skip, sharpen the downstream obligation — non-trivial findings are recorded by Clove as `## Review Issues` entries (Status: `fixed`) when fixing, not compressed into a History one-liner.
   - `.ai-skills/skills/prism-code-dev/shared.md`: add one reflex bullet — when fixing PR-review findings from Eric's GitHub comments, record each non-trivial finding in the plan's `## Review Issues` with Status `fixed`. The plan is the durable content bus; PR threads don't survive as plan evidence.
   - `.prism/rules/branch-plan.md` `## Debugged Issues` template intro: add one sentence — non-trivial CI/build failures fixed during implementation earn an entry even when no Sasha session ran.
   - Verification: build green.

10. **Sol run-close retro auto-dispatch in `.prism/skills/prism-conductor/step-10-report.md`.**
    - New subsection before the goal-state save: **Retro dispatch (auto, both grains).** Under a conducted run Sol **auto-dispatches** the retro at close — not propose:
      - **Per-PR grain:** as each lane's ticket closes, Sol dispatches Iris (or runs the mechanical fidelity check inline) at `per-pr` grain with that lane's plan path, PR number, verdict, and CI conclusion — producing the compact per-ticket fidelity note that feeds the epic retro.
      - **Epic grain:** when a run closed one or more epic-scale lanes, Sol dispatches Iris at `epic` grain per closed epic, dispatch prompt carrying the plan path, touched PR numbers, per-lane verdicts, CI outcomes, and the child per-PR notes as step-02 evidence pointers. The returned report path lands in the run report and satisfies the plan's `> Retro:` line.
    - Auto-dispatch is the Sol default; the run report records every dispatch and its outcome (on-the-loop, never dark — same shape as the auto-cleared-gates line). This is the one context where the retro is genuinely involuntary, which is why the operator chose auto over propose here.
    - Sol remains within his constitution: he dispatches a persona and records run-state; Iris writes the artifact. Auto-dispatching a persona at a phase boundary is Sol's native verb (ADR-0048), not a new authority.
    - Verification: build green; wording cross-checked against ADR-0048's autonomy-between-gates framing (`pnpm run prism:crossref-lint`).

11. **Roster and axis wording in `.prism/architect/_toolkit/skills-ecosystem.md`.**
    - Line 42: extend "on a default cadence (weekly for Zoe)" to also name bound events: "(weekly for Zoe), at a bound event (per install for Atlas, per plan close for Iris)".
    - Line 48 (Iris row): replace the trailing "Explicit invocation; no auto-trigger." with "Three entry points: explicit invocation, the universal plan-close retro gate (`branch-plan.md § Before Closing` — light per-ticket fidelity check, full epic-level audit), and Sol run-close auto-dispatch. Evidence sources are Atlas-configured per team; runs the retro charter against plan + execution record; every report carries a charter-coverage table — underfed retros are labeled, never silent."
    - Propagate to the mirrored `skills-ecosystem.md` surfaces via the build (agents-md-slim precedent: identical edit on all mirrors).
    - Verification: `pnpm run prism:build` + `pnpm run prism:crossref-lint`.

12. **ADR-0068 — The retro charter, universal two-grain cadence, and the retro gate.**
    - New file `.prism/spec/adrs/_toolkit/0068-retro-charter-and-two-grain-cadence.md` (next free number after 0067) + a row in the ADR README table.
    - Context: the operator's six-item charter; advisory calendar cadence empirically under-fires (Zoe: one audit in six weeks; Iris: never ran); hook enforcement off the table (floor revert); charter items 1/4/5/6 unanswerable from plan sections; a GitHub+CI-hardcoded evidence reader would silently mislabel a no-CI team's coverage.
    - Decision: (a) the retro is a charter-driven two-source divergence audit — plan carries intent, execution record carries outcome; (b) one engine, universal plan-close gate at two grains (light per-ticket fidelity check, heavy epic-level divergence audit that aggregates the per-ticket notes — map-reduce) plus explicit invocation, all recording a visible declinable `> Retro:` verdict line; (c) under Sol, auto-dispatch at both grains — the one genuinely-involuntary context; (d) the charter-coverage invariant — an unanswerable charter item is reported unanswered, never silent, with `not-configured` distinguished from unreachable; (e) evidence sources are Atlas-configured per team (`retroEvidence` config block), so the coverage table is honest across stacks, not just GitHub+CI; (f) the write-back obligation repairing the content bus; (g) cadence axis carries calendar and event-bound rhythms; (h) Iris remains a persona (ADR-0046 re-applied: neutrality is load-bearing for *judgment* verdicts at epic grain; the per-PR fidelity check is *mechanical*, so it needs no neutral persona and can run inline — the invariant binds judgment verdicts, not AC-vs-diff diffs); (i) the Before-Closing ceremony restructures into reflect-then-close — Iris reflects (read-only), Winston closes (consumes promotion cautions); reflector ≠ closer mirrors authors-ship-reviewers-review; placement stays pre-merge-on-final-branch per ADR-0047.
    - References: ADR-0037 (refines, does not supersede), ADR-0040 (Atlas event + config precedent), ADR-0046 (persona-vs-utility test re-applied per-grain), ADR-0047 (placement preserved), ADR-0048 (autonomy: Sol auto-dispatch at a phase boundary is his native verb), epic-floor-revert plan, the authors-ship-reviewers-review decision.
    - Verification: `pnpm run prism:crossref-lint` green; README row renders.

13. **Full verification and removal-completeness sweep.**
    - `pnpm run prism:check` (types + crossref + tests + build/seed-drift), then the tree-wide sweep from task 1 for the retired unqualified phrasing — zero hits outside this plan and the ADR's historical context.
    - Confirm `.claude/skills/prism-retro/SKILL.md` regenerated with the charter, dispatch, and entry-point sections.

### Eli (documentation)

No tasks. Consumer-facing docs don't describe Iris's invocation mechanics; the roster table, rule, and ADR (tasks 6, 11, 12) are the durable record. Revisit if `docs/` gains a persona guide.

---

## Decisions

- **The retro is a charter-driven, two-source divergence audit — one engine, three entry points, two grains.**
  - **Root cause:** the operator's charter (six questions) is half execution-record. Items 1/4/5/6 need merged diffs, PR threads, and CI conclusions — evidence the plan never holds. A plan-only retro cannot answer its own charter, independent of any write-back improvements.
  - **Alternatives considered:** plan-only retro + aggressive write-back (rejected — write-back repairs the durable record but can never carry CI history or AC-vs-diff verification; the charter stays half-unanswerable); GitHub-native retro with the plan demoted to one source among many (rejected — the plan is the content bus and the intent record; demoting it makes the retro a changelog, not a divergence audit); separate retro implementations per context or grain (rejected — one-source-of-truth violation; the contexts and grains differ only in trigger, scope, and evidence delivery, not in engine — one engine parameterized by `grain`).
  - **Chosen approach:** plan = intent, execution record = outcome, divergence = the retro's product. Standalone invocation, the universal plan-close gate, and Sol auto-dispatch all enter the same engine, parameterized by grain (per-PR fidelity check vs. epic divergence audit); Sol's entry point additionally pre-loads evidence pointers he already holds.
  - **Implementation guidance:** tasks 1–4 (charter, two-source + grain-switch step-02, charter-keyed step-04, coverage table in step-06); task 2b (per-team sources); task 10 (Sol auto-dispatch).
  - → promoted to ADR-0068 (task 12)
- **Iris stays a persona (Problem 3 refuted).**
  - **Root cause of the question:** the retro looked action-shaped (boundary-triggered, Sol-orchestratable), pattern-matching the utility class.
  - **Alternatives considered:** utility per ADR-0046; Sol-owned utility at run close; hybrid (utility wrapper dispatching a persona).
  - **Chosen approach:** persona. A utility runs in the invoking persona's voice, and the invoking personas are the retro's subjects — facilitator neutrality is load-bearing. The close-ceremony role makes this *stronger*, not weaker: once the retro's divergence verdicts gate what gets promoted to durable architect context, the verdict-issuer must not be the decision-author. "Involuntary closing step" describes the trigger, not the voice — and the fixed trigger is carried by the gate and the Sol dispatch, which are orthogonal to skill type (ADR-0046: type does not fork invocation). ADR-0037's option-(b) rejection (judgment work needs a persona-carried lens) applies. Sol-owned utility fails on Sol's constitution (run-control state only; dispatching personas is his native verb) and would duplicate the engine the standalone context needs anyway. Deletion test: reclassification deletes ~40 lines of voice while the actual complexity remains.
  - **Implementation guidance:** no `roles.json` change; add `## When dispatched by Sol` (task 1) so the Sol entry point works.
  - → promoted to ADR-0068
- **Trigger = universal declinable gate at every plan close + Sol auto-dispatch, across two grains — not epic-only, not propose-only. (resolves OPEN-1 and OPEN-3, both broadened by the operator.)**
  - **Root cause:** memory-bound activation. Zoe's advisory weekly cadence yielded one run in six weeks; Iris never ran. Atlas (event-bound) fires reliably because the event blocks something the user wants. The operator's broadening: a gate that fires only at epic close leaves every single-ticket close un-nudged, and "propose, don't dispatch" under Sol keeps the retro optional in exactly the context that can make it involuntary.
  - **Alternatives considered:** epic-only gate (rejected by the operator — most work never reaches an epic boundary, so most closes would never see a retro nudge); propose-not-auto under Sol (rejected by the operator — Sol holds both the trigger authority and the evidence; proposing there squanders the one genuinely-involuntary context); mandatory execution (rejected — the floor revert is fresh precedent against forced gates, and forced retros on trivial tickets are the theater risk).
  - **Chosen approach — reconcile universality with the theater risk via the two-grain split.** Every plan close records a retro verdict line (`> Retro: <path>` or `> Retro: declined — <reason>`), so the nudge is universal and its skip is visible and recorded — CI's real property without hook enforcement. The theater risk the universal gate raises is answered *by grain, not by exemption*: the per-PR/per-ticket retro is a lightweight charter-fidelity check (cheap enough to run on every ticket), and the epic retro is the heavyweight cross-ticket divergence audit. Under Sol, auto-dispatch is the default — Sol dispatches Iris at close, both grains, and records the result in the run report (on-the-loop, never dark). Outside Sol, the gate is the human-declinable nudge. Explicit invocation unchanged.
  - **Implementation guidance:** tasks 6–8 (universal gate wording), 10 (Sol auto-dispatch), and the two-grain design in the paired Decision below. Label fixes in tasks 1, 5, 12.
  - → promoted to ADR-0068
- **Two grains, both fire: a light per-PR/per-ticket fidelity check and a heavy epic-level divergence audit — the epic retro aggregates the per-PR outputs. (resolves the operator's two-grain directive under Decision 3.)**
  - **Root cause:** a universal gate that ran the *full* charter retro on every ticket would be the theater the operator warned against — heavyweight multi-voice synthesis on a one-line bugfix is noise. But exempting trivial tickets re-opens the silent-skip hole. The resolution is to make the cheap grain genuinely cheap, not to skip it.
  - **Weight/relationship design (the load-bearing call):**
    - **Per-PR/per-ticket retro — charter-fidelity check, single-scope, single-voice-permitted.** Answers only "did THIS ticket ship what it said?" — its plan-AC vs. its merged diff (charter item 1), its own CI conclusion (item 6), Eric's review on that PR (items 4/5). No cross-ticket pattern analysis, no multi-voice staging requirement (step-03's two-voice floor is relaxed at this grain — a single-scope fidelity check with one participant is legitimate, unlike an epic retro). Output is compact: a charter-coverage row per item plus any fidelity gap (shipped ≠ said), written to a lightweight per-ticket retro note, and — critically — *retained as an input for the epic retro*.
    - **Epic retro — full charter divergence audit, cross-ticket, multi-voice.** Unchanged from the core design, plus one new input: it **aggregates the per-PR fidelity notes** from its child tickets rather than re-deriving each ticket's fidelity from scratch. The per-PR retros do the per-ticket AC-vs-diff work incrementally; the epic retro spends its budget on what only it can see — patterns *across* tickets (the same area re-worked three times, a Decision refuted by a bug two tickets later, a standards drift that compounded). This is the map-reduce shape: per-PR = map (cheap, local, per-ticket), epic = reduce (expensive, global, cross-ticket).
  - **Should per-PR retros fire on trivial tickets?** Yes — but the cost is bounded by scope, not gated by a triviality threshold. A one-line bugfix's fidelity check is itself one line (AC vs. diff vs. CI, all trivially green or trivially divergent). A threshold ("skip retros under N lines") re-introduces the silent-skip hole the universal gate closed, and mis-thresholds the case that matters most — the "trivial" change that quietly broke its AC. Cheap-by-scope beats gated-by-threshold.
  - **Persona-vs-utility coherence across both grains (verdict-issuer ≠ decision-author holds at both):** at **epic grain**, Iris issues the verdicts and Winston (the closer, and often a decision-author) consumes them — reflector ≠ closer, as designed. At **per-PR grain**, the fidelity check's verdict is *mechanical, not judgmental* — "does the merged diff satisfy the stated AC, yes/no; did CI pass, yes/no" — so it does not require a neutral human-judgment persona to issue it; it can run inside the ticket-close flow (Briar's self-review pass or Clove's close step) as a checklist, with Iris as the persona only when a genuine multi-voice synthesis is warranted. The neutrality invariant binds *judgment* verdicts (which gate promotions); it does not bind a mechanical AC-vs-diff diff. This keeps per-PR cheap (no persona dispatch needed for the common case) without violating the invariant (no judgment verdict is issued by a decision-author). When a per-PR retro *does* surface a real divergence needing synthesis, it escalates to an Iris dispatch — same engine, invoked on demand.
  - **Implementation guidance:** tasks 2 (step-02 gains a per-PR-grain evidence mode), 3–4 (charter topics + report shape parameterized by grain), 6 (branch-plan gate wording covers both grains), 10 (Sol dispatches both grains), 13 (ADR decision h).
  - → promoted to ADR-0068
- **The retro restructures Winston's Before-Closing ceremony (reflect-then-close) — it does not replace it and does not sit beside it.**
  - **Root cause:** the retro charter and the close ceremony overlap on their durable outputs (architect-doc promotions, lessons, improvement actions). Two independent ceremonies at the same boundary would silently disagree; full replacement breaks three invariants at once — Iris's read-only-on-source-plans invariant, Winston's ownership of promotion writes, and reflector neutrality once verdicts gate promotions.
  - **Alternatives considered:** full replacement — Iris executes promotions, verdict gate, and close marker (rejected: the three invariant breaks above; a reflector who executes the promotions is a participant again, in mirror form); sit-beside — retro gate as a pure offer, ceremony unchanged (rejected: leaves promotion-without-relitigation in place — today's ceremony can promote a decision the epic itself disproved — and leaves two overlapping reflection surfaces in the tree); post-merge placement for better CI evidence (rejected: recreates the standalone close-out PR ADR-0047 exists to avoid).
  - **Chosen approach:** one ceremony, two phases. Iris reflects — read-only outputs: charter verdicts, action items, lesson candidates, promotion cautions. Winston closes — consumes cautions into the Decision verdict gate (a refuted Decision is promoted as corrected or demoted to a lesson, never promoted unchanged), promotes, records `> Retro:`, marks closed. Reflector ≠ closer is the same separation as authors-ship-reviewers-review. The reflect phase is **grain-adaptive** (see the two-grain Decision): at per-ticket grain it is the lightweight charter-fidelity check (AC-vs-diff-vs-CI, mechanical, runnable inside Briar's or Clove's close pass without a persona dispatch); at epic grain it is the full multi-voice Iris retro that aggregates the per-ticket fidelity notes. Same ceremony shape, weight scaled by grain. Placement stays pre-merge-on-final-branch per ADR-0047; the coverage table names the final-child CI approximation.
  - **Implementation guidance:** tasks 4 (cautions/lesson-candidate outputs), 6 (rule restructure), 7 (Winston consumes cautions), 12 (ADR decision g).
  - → promoted to ADR-0068
- **Iris's cadence is named event-bound — per plan close, at two grains — refining, not contradicting, ADR-0037.** The axis already accommodates non-calendar rhythms (Atlas per install); the defect was an unnamed rhythm, not a wrong axis. The operator's broadening moves the bound event from "epic close" to "every plan close," with grain governing weight. → promoted to ADR-0068
- **Evidence sources are Atlas-configured per team, not hardcoded to `gh`+CI — the charter-coverage table degrades honestly on a no-CI repo. (resolves OPEN-2, broadened by the operator.)**
  - **Root cause:** the core design hardcoded the execution-record readers to `gh` (PR threads, check-run conclusions) and git (merged diff). That makes the charter-coverage table honest only for a GitHub+CI team like Thrive. A team with no CI, or GitLab, or a different DoD signal, would get a table that silently mislabels "we don't read that source" as "that source had nothing" — the exact silent-starvation failure this whole plan exists to kill, reintroduced one layer down.
  - **Depth unchanged:** CI check-run *conclusions* + PR review threads + merged diff. No log archaeology (high noise, weak persona attribution) — that half of the original OPEN-2 default stands; the operator kept the depth and broadened only the *source configurability*.
  - **Chosen approach — a per-team retro evidence-source config, written by Atlas, read by Iris.** Atlas already owns per-team config (`.ai-skills/config.json`) and a one-question-per-turn onboarding flow. Add a retro-evidence question set ("How does this team evidence 'done'? — CI system y/n + which; PR/review platform; coverage or DoD gates; test command") that writes a `retroEvidence` config block. Iris's step-02 reads that block to know which sources exist and how to reach them; a source the config marks absent renders in the coverage table as *"CI — not configured for this team"* (an honest unavailable, distinct from *"CI — configured but unreachable this run"* when `gh` auth fails). A no-CI team's retro leans on PR review + merged-diff + plan evidence, and the table says exactly that. This is the seam that makes the charter-coverage table honest across teams, not just Thrive.
  - **Implementation guidance:** new task for the `retroEvidence` schema field + Atlas onboarding question-set edit (task 2b below); Iris step-02 reads the config (folded into task 2).
  - → promoted to ADR-0068
- **Per-PR retro-note retention: retain, co-located per epic.**
  - **Root cause:** the per-PR fidelity note is the map output the epic retro reduces over (task 2's map-reduce design); if it's deleted after the epic retro ingests it, a later audit or re-retro of the same epic loses the per-ticket trace entirely.
  - **Alternatives considered:** delete after epic-grain ingest (rejected — destroys the per-ticket audit trail for no space savings that matter at this scale); retain only until the epic closes then archive via Zoe (rejected — adds a lifecycle Zoe doesn't otherwise own; plans and retros already share the "never deleted, Zoe may archive" pattern from ADR-0047, no new mechanism needed).
  - **Chosen approach:** retain, co-located at `.prism/retros/<epic>/<ticket-id>.md` (or `.prism/retros/per-pr/<ticket-id>.md` for a standalone ticket). Matches the plan-preservation precedent in ADR-0047 — retros are never deleted at write time; only Zoe's cadence audit may later move one to `.prism/archived/` as an explicit archive action. Confirmed by the operator 2026-07-06.
  - **Implementation guidance:** tasks 2, 4, 6 (filename convention in step-02's ingest glob and step-06's report shape).
  - → no promotion needed (already covered by ADR-0047's plan-preservation precedent — retros inherit the same retention model, no new ADR needed)

---

## History

- 2026-07-06 [main]: Winston (dispatched by Sol) evaluated the Iris cadence/starvation critique plus persona-vs-utility; wrote this plan. Verdicts: P1 partial (no rhythm named, not axis contradiction), P2 confirmed (Eric-in-branch + CI seams + miscalibrated Procedure C), P3 refuted (persona correct per ADR-0046).
- 2026-07-06 [main]: Reframed around the operator's retro charter — two-source evidence model promoted from starvation supplement to charter precondition; census generalized to per-item charter-coverage table; three-context answer added (standalone / happy-path-feeds / Sol dispatch); tasks 1–4, 10 rewritten accordingly.
- 2026-07-06 [main]: Resolved the close-ceremony question — the retro restructures § Before Closing into reflect-then-close (Iris reflects read-only, Winston closes consuming promotion cautions), placement stays pre-merge-on-final-branch per ADR-0047. Tasks 1, 4, 6, 7, 12 updated; see Decision "restructures Winston's Before-Closing ceremony."
- 2026-07-06 [main]: Operator broadened all three OPEN questions (universal declinable gate, Atlas-configured evidence sources, Sol auto-dispatch + two grains). Replaced the three OPEN Decisions with resolved ones; added the two-grain (map-reduce) trigger Decision and the Atlas-config Decision; added task 2b (retroEvidence schema + Atlas question set); rewrote tasks 2–3, 5–8, 10–12 for universal/two-grain/auto-dispatch/config. Task count 13 → 14 (2b added). ADR-0068 gains decisions e (per-team config) and h (per-grain persona-vs-utility coherence).
- 2026-07-06 [huntermcgrew/retro-charter-redesign]: Clove implemented all 14 tasks — Iris charter/entry-points/Sol-dispatch (shared.md), two-source evidence + grain switch (step-02), charter-keyed dialogue (step-04), coverage table + promotion cautions + lesson candidates (step-05/06), frontmatter description, branch-plan.md reflect-then-close restructure (canonical + seed), Winston close-time reflexes, Briar/Eric retro-gate flags, write-back tightening (Eric/Clove/Debugged-Issues intro), Sol step-10 auto-dispatch, skills-ecosystem.md roster wording (canonical + seed), ADR-0068 + README row + seed-exclusion entry. Finalized the per-PR retro-note retention Decision (retain, co-located per epic) since no `OPEN —` entry existed to resolve.
- 2026-07-06 [huntermcgrew/retro-charter-redesign]: `pnpm run prism:check` green (build/seed-drift, types, tests 485/485, verify-manifest, crossref-lint); tree-wide sweep confirmed the retired "shipped close to plan" unqualified phrasing has zero hits outside this plan file.

---

## Debugged Issues

_(none — this plan originates from an architecture evaluation, not a bug investigation)_

---

## Review Issues

_(none yet)_

---

## Acceptance Criteria

### Behavioral

- [ ] Given any plan being closed (ticket or epic), when the close ceremony runs, then the plan carries a `> Retro:` line (report path, or `declined` with a one-line reason) before the `> Closed:` marker lands (REQ-2)
- [ ] Given a retro report exists for a plan being closed, when Winston runs the Decision verdict gate, then every Decision listed in the report's `## Promotion cautions` is promoted as corrected or demoted to a lesson — never promoted unchanged (REQ-3)
- [ ] Given a retro on any target, when the report generates, then it contains a `## Charter coverage` table with one row per charter item marked answered or unanswered, and every unanswered row names its gap as either a missing source or `not configured for this team` (REQ-1, REQ-5)
- [ ] Given a per-PR-grain retro on a single ticket, when it runs, then it emits a compact one-row-per-charter-item fidelity note (AC-vs-diff, own CI, PR review) with no multi-voice dialogue and no cross-plan reads (REQ-2)
- [ ] Given an epic-grain retro whose child tickets emitted per-PR fidelity notes, when it runs, then it ingests those notes (cited under `### Per-ticket fidelity`) rather than re-deriving each ticket's fidelity (REQ-2)
- [ ] Given a team whose `retroEvidence` config declares no CI system, when a retro runs, then charter item 6's coverage row reads `CI — not configured for this team` and the retro completes on PR-review + merged-diff + plan evidence (REQ-5)
- [ ] Given a plan whose `## History` names PR numbers and the team config declares a reachable PR platform, when step-02 runs, then PR review threads and check-run conclusions for those PRs enter the evidence set tagged as execution-record sources, cited under `### Execution record` (REQ-1)
- [ ] Given a Sol run that closed an epic-scale lane, when step-10 runs, then Iris is auto-dispatched at both grains with plan path, PR numbers, lane verdicts, and CI outcomes as evidence pointers, and the run report records every dispatch and its outcome (REQ-2)
- [ ] Given a close-out PR for any plan (ticket or epic) missing the `> Retro:` line, when Briar or Eric reviews it, then the omission surfaces as a Minor finding; a recorded `declined` line satisfies the gate (REQ-2)

REQ citations map to `## Decisions`: REQ-1 = charter-driven two-source audit; REQ-2 = universal two-grain gate + Sol auto-dispatch; REQ-3 = reflect-then-close ceremony restructure; REQ-4 = write-back / content-bus repair; REQ-5 = Atlas-configured evidence sources.

### Non-behavioral

- [ ] `pnpm run prism:check` green (types, crossref-lint, tests, build + seed-drift) (REQ-1)
- [ ] Iris remains `type: persona` in `roles.json`; no registry change (REQ-3)
- [ ] The retired unqualified phrasing is swept tree-wide (canonical, generated, and seed surfaces) (REQ-1)
- [ ] All execution-record reads degrade gracefully when a source is absent (no CI, no `gh`, unconfigured platform) — no hard dependency on GitHub for the retro to complete (REQ-1, REQ-5)
- [ ] The `retroEvidence` config block validates and Atlas's onboarding writes it; the install skeleton seeds a sensible default (REQ-5)
- [ ] Exactly one close ceremony exists in the tree after the change — `branch-plan.md § Before Closing` restructured in place, no parallel retro-close procedure introduced anywhere (REQ-3)

### AC Adjustments

### AC Sync Log

| Date | Agent | Action | Plan | Ticket |
| ---- | ----- | ------ | ---- | ------ |
| 2026-07-06 | Winston | AC created; no ticket exists — sync deferred until operator files | this file | — |

---

## Cleanup Items

_(none)_

---

## PR Readiness

- [x] No critical or major issues (pending Briar/Eric review)
- [x] Build passes — last run: 2026-07-06, `pnpm run prism:check` green (build/seed-drift, types, tests 485/485, verify-manifest, crossref-lint)
- [ ] PR description up to date (no PR opened yet — Sol runs Briar's self-review first)
- [x] Lasting decisions promoted to architect context (ADR-0068 written, task 12; all `## Decisions` entries carry a verdict sub-bullet)

**Last updated:** 2026-07-06
