# Plan: epic-prism-thrive-backport-wave-3

## Ticket

PRISM Thrive backports, third wave (no Linear ticket; phase work). Follows [`epic-prism-thrive-backport.md`](./epic-prism-thrive-backport.md) (Wave 1, Thrive PRs through ~#2024) and [`epic-prism-thrive-backport-wave-2.md`](./epic-prism-thrive-backport-wave-2.md) (Thrive PRs #2025–#2027).

## Goal

Absorb four content-layer refinements from Thrive PRs #2043, #2041, #2040, and #2039 across two ordered sub-PRs — de-stale the model-version framing, restructure the session-context-leakage rule principle-first, add the one-concept-one-word AC terminology rule, and fold the offensive-simplification review lens into the review + architect skills — so PRISM stays in sync with the dogfood without porting infrastructure it doesn't yet need.

---

## Scope boundary — what this wave does NOT do

Discovery (6 parallel deep-dives) triaged Thrive PRs #2032–#2043. Four PRs are explicitly excluded from this epic, each for a recorded reason (see `## Decisions`):

- **#2042 (THR-1900, preamble generator) — DEFERRED.** Solves a 42-doc preamble-drift problem PRISM doesn't have (12 architect docs, 1 preamble, 1 rule with `description:` frontmatter). See Decision § "#2042 deferred."
- **#2037 (THR-1637, AGENTS.md slim + Tier 1 rule extraction) — ROUTED.** The backport-worthy delta is already owned by [`agents-md-slim.md`](./agents-md-slim.md) (GitHub issue #64, Slice 1 merged in #66, Slices 2–4 pending). Do not duplicate here. See Decision § "#2037 routed, not duplicated."
- **#2032 (THR-1902, lean skill architecture) — ABSORBED.** PRISM's [`epic-lean-skill-architecture.md`](./epic-lean-skill-architecture.md) already shipped this, broader (18 skills + 7 renames vs Thrive's 13 + 2).
- **#2038, #2036, #2035, #2034, #2033 — PRODUCT-ONLY.** Carousel server resolver, Chromatic bump, Forms/ADF docs, carousel video gating, platform RFC. Thrive app code, no PRISM relevance.

---

## History

- 2026-05-29 [main]: Plan created. Winston ran discovery (6 subagents) + evaluation across Thrive PRs #2032–#2043, triaged to four portable content PRs, and scoped a 2-sub-PR epic. Premise gate failed #2042 (generator solves drift PRISM doesn't have) and #2037 (already owned by agents-md-slim); both recorded as documented exclusions rather than silent drops.
- 2026-05-29 [main]: Hunter resolved the OPEN decision — remove Eric's large-PR escape-hatch note (PR-wave3.2 task 7, with a `skill-authoring.md:102` referrer fix Winston caught) — and absorbed the AC WordPress generalization into PR-wave3.1 task 6. Both recorded as Decisions with verdicts; AC + Cleanup Items updated.
- 2026-05-29 [hmcgrew/prism-wave3.1-writing-ac-refinements]: Clove implemented PR-wave3.1 tasks 1–8 — de-staled the Claude 4.7 pins in writing-voice.md + spec-editing.md, restructured the session-context-leakage rule principle-first (heading shortened to "Session-context leakage", ADR-0032 citation fixed), added the one-concept-one-word AC rule, generalized the AC rule's WordPress phrasing, and added the test-description cross-ref in code-standards § Tests. All edits mirrored to `templates/install/`; `pnpm prism:build && prism:check && prism:check-types && prism:test` all pass. Task 9 (ADR-0015 forward-annotation) left for Eli.

---

## Decisions

- **Two sub-PRs grouped by concern: Slice 1 (writing & AC content) → Slice 2 (simplification lens). Parallel-safe; Slice 1 recommended first.**
  - **Root cause:** The four portable PRs split cleanly into two concerns. #2043 + #2041 + #2040 are all sub-20-line content edits in the `.prism/rules/` + `.prism/spec/adrs/` neighborhood (writing-voice.md ×2 disjoint sections, acceptance-criteria.md, ADR-0015, ADR-0032). #2039 is a single cohesive capability spanning a new reference + two review skills + Winston.
  - **Alternatives considered:** (a) One PR per Thrive PR (4 sub-PRs) — three of them are tiny content diffs; four PRs is ceremony heavier than the work. (b) One mega-PR — mixes the simplification capability (multi-skill, needs careful non-blocking framing) with trivial content edits, drowning review attention on the part that needs it. (c) The chosen 2-PR split.
  - **Chosen approach:** Bundle the three content reworks into Slice 1 (reviewable as one "clarity + de-staling" pass, no build risk); isolate the simplification lens as Slice 2 (one concern, the only part with real review-framing risk).
  - **Implementation guidance:** Slice 1 and Slice 2 touch disjoint files (Slice 1: writing-voice/acceptance-criteria/ADR-0015/ADR-0032; Slice 2: references/review skills/architect skill) — they are parallel-safe. Recommend landing Slice 1 first as the low-risk warm-up. Branch names follow `hmcgrew/prism-wave3.N-<slug>`.
  - → no promotion needed (process scoping specific to this wave).

- **#2042 (preamble generator) deferred — does not earn its place yet.**
  - **Root cause:** Thrive's generator keeps 42 hand-maintained architect-doc preambles from drifting against rule `description:` frontmatter. PRISM has 1 preamble across 12 docs and 1 rule (`writing-voice.md`) with `description:`. Porting it requires building net-new surface first — backfill `description:` on 7 Tier 2 rules, add `## Rules that apply here` headings to ~11 docs — so a generator has inputs, to prevent drift that isn't occurring.
  - **Alternatives considered:** (a) Port now with the prerequisite backfill — premature abstraction with build-system blast radius; the generator would be a near-no-op against today's surface. (b) Port the `description:`-frontmatter discipline alone — still speculative; nothing in PRISM consumes it yet. (c) Defer with a documented trigger.
  - **Chosen approach:** Defer. **Trigger to revisit:** when PRISM's architect docs grow hand-maintained `## Rules that apply here` preambles (organically, as the doc surface expands) AND those preambles start drifting against rule frontmatter. At that point, port #2042's generated end-state directly — do NOT port Thrive's #2037-Phase-4 hand-maintained interim first (Thrive built hand-maintained preambles, then replaced them with the generator; PRISM has neither and should leapfrog straight to generated).
  - → no promotion needed (deferral decision lives here as the durable record; re-surfaces when the trigger fires).

- **#2037 (AGENTS.md slim + Tier 1 rule extraction) routed to its existing plan, not duplicated.**
  - **Root cause:** The backport-worthy delta — slim AGENTS.md from 234 lines, externalize behavioral norms `§§ 1–6, 8, 10–12` to Tier 1 rule files — is exactly the scope of [`agents-md-slim.md`](./agents-md-slim.md), created (per its own History) "after Hunter asked about porting Thrive's tiered-rules architecture." Slice 1 is merged (#66); Slices 2–4 (create 10 rule files, register in manifest, rewrite AGENTS.md) are pending.
  - **Alternatives considered:** Fold the AGENTS.md work into this epic — rejected, violates one-plan-per-ticket (`branch-plan.md § One Plan Per Ticket`) and would orphan the in-flight `agents-md-slim.md` plan + its GitHub issue #64.
  - **Chosen approach:** Leave `agents-md-slim.md` as the owner; this epic references it and does not touch AGENTS.md. #2037's Phase 4 (architect-doc preambles) is subsumed by the #2042 deferral above; #2037 Phase 1D/1E (SPEC.md invariant promotion, writing-voice→Tier 1 + chat scope) are genuinely unplanned but low-value — flagged as a candidate follow-up, not core scope.
  - → no promotion needed (routing decision; the AGENTS.md work's durable home is agents-md-slim.md).

- **ADR-0032 generic-adaptation applies to all four ports — drop Thrive specifics.**
  - **Root cause:** Per ADR-0032 (canonical content is generic), porting Thrive's exact prose would import dogfood-session specifics into PRISM's product surface. Three concrete traps surfaced in discovery: (1) #2041's `**Why:**` recurrence tally ("recurred four times across three artifact types," specific JSDoc/test cases) is Thrive-session-specific — porting it verbatim is itself session-context leakage into PRISM's own rule; (2) #2040's worked example is built on Thrive ticket THR-1874 with Thrive AC quotes; (3) #2039's heuristics cite WordPress/block/PHP examples.
  - **Chosen approach:** Port the *structure/capability*, rewrite examples generically. #2041: keep the principle-first restructure + PRISM's existing Eli "largest so far" incident, drop Thrive's tally. #2040: keep the generic clipped-vs-clamped illustration, drop THR-1874. #2039: keep the framing-neutral remedies menu (already generic), drop Thrive's stack examples.
  - → no promotion needed (codified in ADR-0032; this is application, not a new rule).

- **No new ADRs this wave.**
  - **Root cause:** All four ports are content edits to existing rules/ADRs/references, or extensions of existing framing. #2039's offensive-simplification lens *extends* ADR-0017's Necessity axis (the defensive abstraction check); Thrive itself created no ADR for it, folding it into the shared references instead.
  - **Alternatives considered:** A new ADR for the simplification lens — rejected as premature; the reference files (`structural-remedies.md`, `review-justification.md`) are the durable home, matching Thrive's own choice. Optionally a one-line note in ADR-0017's Consequences.
  - **Chosen approach:** No new ADR. No ADR renumbering map needed (unlike Waves 1–2). Optionally annotate ADR-0017.
  - → no promotion needed (the reference files are the durable surface).

- **#2039's simplification lens stays strictly non-blocking — load-bearing.**
  - **Root cause:** Thrive's PR raises what reviews *suggest*, never what *blocks*. The "Cleaner Paths" bucket sits outside Critical/Major/Minor severity and the merge/PR-Readiness gate by design. PRISM already has strong anti-gatekeeping discipline (`review-frameworks.md`: impact×likelihood sets severity, not bug class; Eric's "if you can't articulate why it's Critical/Major, it's Minor"). A blocking simplification lens would collide head-on with that.
  - **Chosen approach:** Cleaner Paths is a non-blocking output bucket only — never a GitHub label, never in `## PR Readiness`, never a severity tier. Port the "Severity discipline still governs" paragraph mapped to PRISM's Critical/Major/Minor. A declinable reframe is Minor or a non-blocking note; Major only on real bug/maintenance/misleading-the-next-dev impact.
  - **Implementation guidance:** Include the mis-calibration self-check (if Cleaner Paths runs longer than the Issues list, recalibrate). Do not add a Cleaner Paths checkbox to the plan template's `## PR Readiness`.
  - → no promotion needed (the non-blocking contract lives in the reference + skill sections this wave authors).

- **Absorbed: AC WordPress generalization into PR-wave3.1** (resolved 2026-05-29 by Hunter — "just add this to one of the waves").
  - **Root cause:** `.prism/rules/acceptance-criteria.md` carries Thrive-product language ("testers with access to WordPress admin," "the relevant WordPress setting") — a pre-existing ADR-0032 divergence in the generic product. It was flagged as a separate cleanup, but PR-wave3.1 already edits this exact file (#2040 appends a section).
  - **Alternatives considered:** File a standalone cleanup ticket (the original flag) — rejected; it's a same-file, local-frame edit that rides along the AC-rule work for free, and a separate ticket is redundant handoff per `branch-plan.md § cross-lane absorption`.
  - **Chosen approach:** Absorb into PR-wave3.1 as task 6. Generic baseline per ADR-0032 ("running application and its admin or configuration surface"); Atlas writes per-team specifics during onboarding.
  - → no promotion needed (codified by the edit itself + ADR-0032).

- **Remove the large-PR escape-hatch note from Eric** (resolved 2026-05-29 by Hunter — mirror Thrive #2039). The blockquote at `prism-code-review-pr/shared.md:1` (`claude-opus-4-7[1m]` opt-in) goes; PRISM assumes 1M context for review by default.
  - **Root cause:** The note instructed temporarily swapping `model:` to a 1M variant for oversized PRs. Thrive removed it because their review runs 1M by default — the same posture Hunter confirms for PRISM.
  - **Alternatives considered:** Leave it in place (the prior default path) — rejected; it's now obsolete guidance pinned to a stale model string (`opus-4-7`), and a stale opt-in note is worse than no note.
  - **Chosen approach:** Delete the blockquote. **Referrer fix required:** `.prism/rules/skill-authoring.md:102` (+ templates mirror) cites this note as a canonical example of a load-bearing wall "nearly cut on a line-count basis." That citation goes stale on removal — but the *principle* it illustrates ("line count alone never justifies a cut") still holds, because this removal is an obsolescence cut, not a line-count cut. Update line 102 to drop the escape-hatch example and keep the standup-summary one, so the illustration isn't a note that no longer exists.
  - **Implementation guidance:** Removal + referrer fix live in PR-wave3.2 (task 7). The closed `epic-lean-skill-architecture` § Decisions reference is historical (git-history territory) — do not edit a closed plan; only the live `skill-authoring.md` referrer matters.
  - → no promotion needed (skill-content decision; the skill source + skill-authoring.md referrer are the durable surface).

---

## Implementation Tasks

### PR-wave3.1 — Writing & AC rule refinements

**Branch:** `hmcgrew/prism-wave3.1-writing-ac-refinements`
**Depends on:** none.
**Blocks:** none.
**Parallel-safe with:** PR-wave3.2 (disjoint file surfaces).
**Verification:** `pnpm prism:build && pnpm prism:check && pnpm prism:check-types && pnpm prism:test` after the task group. Content-only edits, but build regenerates the `.claude/`/`.codex/`/`.cursor/` mirrors of any touched rule, so the full chain must pass.

Backport targets: Thrive PR #2043 (THR-1911, model-version generalization), #2041 (THR-1899, session-leakage principle-first), #2040 (THR-1910, one-concept-one-word).

#### Clove

1. **De-stale the "Claude 4.7" pin in writing-voice.md** (#2043). Edit `.prism/rules/writing-voice.md:20`. Change `**Why:** On Claude 4.7, absolute mandates trigger an alignment-override reflex that can invert or ignore the instruction.` to `**Why:** Absolute mandates trigger an alignment-override reflex that can invert or ignore the instruction.` (delete the literal `On Claude 4.7, ` prefix; keep the rest of the line and the ADR-0015 citation intact). Mirror byte-identically to `templates/install/.prism/rules/writing-voice.md` (same line). Content-only.

2. **De-stale the "Claude 4.7" pin in spec-editing.md** (#2043). Edit `.prism/architect/spec-editing.md:19`. Change `absolute mandates invert on Claude 4.7, so the voice itself carries the constraint` to `absolute mandates invert across models, so the voice itself carries the constraint`. Keep both ADR citations on the line. Mirror to `templates/install/.prism/architect/spec-editing.md` (match by content — the mirror may differ in surrounding line numbers).

3. **Restructure the session-context-leakage rule principle-first** (#2041). Edit `.prism/rules/writing-voice.md` (+ templates mirror). Four changes to the section currently at line 94:
   - **Heading:** `## Anti-pattern: Session-context leakage in generated artifacts` → `## Anti-pattern: Session-context leakage`.
   - **Opening paragraph:** rewrite to lead with the principle, not the example list. Lead sentence: "A durable artifact — anything a future reader loads cold, with no memory of the work that produced it — describes its subject only, never the session that wrote it. The principle is the test, not the list." Move the example list inline and append the non-exhaustive marker at the *end*; add `source comments and JSDoc, and test descriptions (\`describe\`/\`it\` strings)` to the examples.
   - **`**Why:**`:** keep PRISM's existing Eli "largest so far" incident verbatim (it is PRISM's own canonical example). DROP Thrive's recurrence tally ("recurred four times across three artifact types," the specific JSDoc/test/Decisions cases) — porting it would inject Thrive-session context into PRISM's rule. If a closing justification is wanted, use a generic clause ("the principle now leads and the examples are explicitly non-exhaustive"), no instance counts.
   - **`**How to apply:**`:** change "generated artifact" → "durable artifact"; add the test-name anti-pattern (prefer `it("renders the newest size", ...)` over `it("renders text-6xl", ...)` style — generic phrasing, no Tailwind-specific token).

4. **Fix the heading citation in ADR-0032** (#2041, follow-on to task 3). Edit `.prism/spec/adrs/0032-canonical-skill-content-is-generic.md:46` AND `templates/install/.prism/spec/adrs/0032-canonical-skill-content-is-generic.md:46`. Change `§ Anti-pattern: Session-context leakage in generated artifacts` → `§ Anti-pattern: Session-context leakage` (the heading renamed in task 3 — this keeps the citation resolving). Note: `.ai-skills/skills/prism-code-dev/shared.md:84` already uses the short form, so it becomes an exact match after task 3 — verify, no edit expected.

5. **Add the one-concept-one-word AC terminology rule** (#2040). Edit `.prism/rules/acceptance-criteria.md` (+ templates mirror, currently byte-identical). Append a new section after the final `## AC citation discipline` section. Content shape (match the existing rule / `**Why:**` / `**How to apply:**` convention; generic clipped-vs-clamped illustration, NO THR-1874 reference, NO WordPress nouns):

   ```markdown
   ---

   ## One concept, one word

   Within a single AC set, give each distinct visual behavior one word and reuse it everywhere that behavior appears. When one item calls a behavior "clipped" and another calls it "clamped," a tester can't tell whether they're the same thing or two separate things to check. (Distinct from "Items that duplicate each other with different wording" under What NOT to include — that rule says don't write two items testing the same behavior; this one says when separate items legitimately reference the same behavior, name it the same way.)

   For the jargon half, run the translation test from [`writing-voice.md` § Plain language over jargon](writing-voice.md) over the set: read each item and ask whether the reader has to translate any word into a plainer one before the meaning lands. Lean on the test — don't keep a separate jargon list here.

   **Why:** Every drifted or jargon-laden AC costs a tester a round-trip. When a reviewer can't verify an item without asking what the wording means, the clarification happens later and slower than it would have at write time.

   **How to apply:** Before finishing an AC set, pick one word for each visual behavior and confirm every item uses it, then run the translation test over the set for jargon. If you reach for a second word for a behavior you've already named, change it back.
   ```

6. **Generalize the WordPress-specific phrasing in the AC rule** (absorbed cleanup — see Decision § "Absorbed: AC WordPress generalization"). Same file as task 5, so it rides along. Edit `.prism/rules/acceptance-criteria.md` (+ templates mirror), three lines:
   - Line 18: `AC is written for non-technical testers with access to WordPress admin and the live frontend only.` → `AC is written for non-technical testers with access to the running application and its admin or configuration surface only.`
   - Line 20: `Describe a specific, observable behavior verifiable in the browser or WordPress admin` → `Describe a specific, observable behavior verifiable in the running application or its admin surface`
   - Line 21: `Include where to find the relevant WordPress setting when it's not obvious` → `Include where to find the relevant setting in the admin or configuration surface when it's not obvious`
   This is the generic baseline per ADR-0032; Atlas writes per-team specifics (e.g. "WordPress admin") into stub anchors during onboarding. Do not introduce any other stack noun.

7. **(Optional, low-priority) Cross-reference from code-standards § Tests** (#2041 secondary). PRISM has no `code-standards-ts.md` (TS standards are generated per-team). If carrying the cross-reference, add to `.prism/rules/code-standards.md § Tests` (+ templates mirror) a tool-neutral bullet: "Test descriptions state the contract under test in the present tense, not the change that added them — see `writing-voice.md § Anti-pattern: Session-context leakage`." Skip if it complicates the diff; the rule itself (task 3) is the load-bearing port.

8. **Regenerate mirrors and verify.** Run `pnpm prism:build && pnpm prism:check && pnpm prism:check-types && pnpm prism:test`. Confirm the `.claude/` mirrors of writing-voice.md, acceptance-criteria.md, spec-editing.md, and ADR-0032 reflect the edits, no "WordPress" string remains in `.prism/rules/acceptance-criteria.md` or its mirror, and `pnpm prism:check` reports no canonical↔mirror drift.

#### Eli

9. **Annotate ADR-0015 forward for cross-model framing** (#2043). Edit `.prism/spec/adrs/0015-humane-language-over-mandates.md` AND `templates/install/.prism/spec/adrs/0015-humane-language-over-mandates.md` (edit by content — the two copies differ slightly around line 12, so match prose, not line numbers). Two edits:
   - Insert a new paragraph in the **Context** immediately after the existing 4.7-narrative paragraph (do NOT rewrite the historical 4.6→4.7 narrative — annotate forward): "Although first observed on Claude 4.7, the reflex is not version-specific — later Claude models (4.8+) and non-Claude agents on other tools exhibit the same pattern. That is why this decision lives in the model-agnostic shared layer rather than a Claude-specific config; see [ADR-0005](./0005-cross-model-portability.md) (Cross-Model Portability)."
   - In **Consequences**, change the line `restore 4.6-era absolutes and 4.7 will invert them` → `restore absolute mandates and later models will invert them`. Keep any "4.7 audit" citation in that sentence intact.

---

### PR-wave3.2 — Offensive simplification lens

**Branch:** `hmcgrew/prism-wave3.2-simplification-lens`
**Depends on:** none.
**Blocks:** none.
**Parallel-safe with:** PR-wave3.1.
**Verification:** `pnpm prism:build && pnpm prism:check && pnpm prism:check-types && pnpm prism:test` after each task group.

Backport target: Thrive PR #2039 (THR-1909). Port the *offensive* simplification ambition (hunt the reframe that deletes complexity, not just tidies) into Eric, Briar, and Winston, plus a new shared remedies menu and two scan items. PRISM already has the *defensive* half (ADR-0017 Necessity axis + deletion test) — reference it, do not duplicate. All content language-agnostic per ADR-0032 (drop Thrive's WordPress/block/PHP examples). Cleaner Paths stays strictly non-blocking (see Decision § "#2039's simplification lens stays strictly non-blocking").

**Vocabulary guardrail:** PRISM's "two-axis split" means **Standards / Spec** — NOT ADR-0017's **Correctness / Necessity**. The simplification content is a necessity/abstraction enhancement and belongs under the **Standards axis → Justification Review**. Do not introduce it as a third top-level axis or a Spec concern.

#### Clove

1. **Create the shared remedies menu.** New file `.prism/references/structural-remedies.md` AND `templates/install/.prism/references/structural-remedies.md` (byte-identical). Port Thrive's framing-neutral `## Preferred Remedies` menu (~13 complexity-removing remedies: delete a layer of indirection; reframe the state model so conditionals disappear; collapse duplicate branches; replace condition chains with a typed model/dispatcher; move logic to the module that owns the concept; reuse the canonical helper; separate orchestration from business logic; make type boundaries explicit; etc.). The menu is already generic — no Thrive specifics to scrub. Header names the three consumers: Eric, Briar, Winston.

2. **Append the offensive-simplification section to review-justification.md.** Edit `.prism/references/review-justification.md` AND `templates/install/.prism/references/review-justification.md`. Append a `## Simplification & Structural Leverage` section after the existing defensive four-question check. Content: the four offensive heuristics (don't stop at "a bit cleaner" — hunt the reframe that *deletes* complexity; assume a structural-leverage move is often available; treat scattered special-cases as a design problem not a style nit; prefer the solution that feels inevitable in hindsight) + a **"Severity discipline still governs"** paragraph mapped to PRISM's Critical/Major/Minor (declinable reframe = Minor or non-blocking note; Major only on real bug/maintenance/misleading-the-next-dev impact). End with a cross-link to `structural-remedies.md`. Language-agnostic.

3. **Add the two scan items.** Edit `.prism/references/review-frameworks.md` AND `templates/install/.prism/references/review-frameworks.md`. Add two generically-worded scan bullets: (a) **"magic"/brittle behavior** — ad-hoc mechanisms or generic abstractions hiding data-shape assumptions; prefer direct/boring/explicit over clever indirection; (b) **silent fallback papering over an unclear invariant** — a branch quietly defaulting on `undefined`/`unknown` to dodge an unclear contract; make the boundary explicit instead. Place under the existing standards/abstraction scan area.

4. **Add the Cleaner Paths bucket to Eric.** Edit `.ai-skills/skills/prism-code-review-pr/shared.md`. Add a non-blocking `### Cleaner Paths (non-blocking)` subsection to the **Summary format** (after Test Coverage, outside `## PR Readiness`). Rules to encode: summary-comment body only; never a GitHub label; never in PR Readiness; never a severity tier; mis-calibration self-check (if longer than the Issues list, recalibrate). Broaden the existing Justification Review (Standards axis) hook to also point at the Simplification lens + `structural-remedies.md`. If the Summary template lives in a reference (e.g. `.prism/references/code-review-pr/summary-template.md`), add the section there too (verify the path first). (The large-PR escape-hatch blockquote is removed separately in task 7.)

5. **Add the Cleaner Paths line to Briar.** Edit `.ai-skills/skills/prism-code-review-self/shared.md`. Add a `**Cleaner paths:** None (or list…)` line to the chat Review format after the existing `**Cleanup:**` line — non-blocking, does not change the verdict. Broaden Briar's Justification Review hook the same way as task 4.

6. **Add Winston's simplification cognitive move.** Edit `.ai-skills/skills/prism-architect/shared.md`. Add a move to `## Cognitive Approach` (alongside "Justice sensitivity toward architectural integrity"): **"Push for the simpler design, not just a sound one"** — the offensive complement (justice catches *wrong* architecture; this catches *merely adequate* architecture when a far simpler design existed). Fires every evaluate pass before "Proceed" ("what would make this change half the size? is there an existing seam that absorbs it?"). Guardrail: it raises what Winston *recommends*, not what must clear to *proceed*. Cross-link `structural-remedies.md`. Wire it into the existing Premise gate so it fires each evaluate pass.

7. **Remove the large-PR escape-hatch note + fix its referrer** (resolved OPEN decision). Two edits:
   - Delete the entire blockquote at `.ai-skills/skills/prism-code-review-pr/shared.md:1` (the `> **Large-PR escape hatch:** …claude-opus-4-7[1m]…` line) and the blank line after it, so the file now opens on the `<!-- atlas:specializes-in -->` block.
   - Edit `.prism/rules/skill-authoring.md:102` AND `templates/install/.prism/rules/skill-authoring.md:102`. The sentence cites two "load-bearing walls nearly cut on a line-count basis — the standup-summary anti-pattern guardrails and the code-review-pr large-PR escape-hatch note." Drop the escape-hatch example and keep the standup-summary one (e.g. "…nearly cut a load-bearing wall — the standup-summary anti-pattern guardrails — on a line-count basis…"). The principle is unchanged; only the now-removed example is dropped.

8. **Regenerate mirrors and verify.** Run `pnpm prism:build && pnpm prism:check && pnpm prism:check-types && pnpm prism:test`. Confirm Eric, Briar, and Winston's regenerated `.claude/skills/<id>/SKILL.md` reflect the new sections, the escape-hatch blockquote is gone from Eric's mirror, the two new references appear in the `.claude/`/`.codex/`/`.cursor/` mirrors, and no Cleaner Paths checkbox leaked into any `## PR Readiness` surface.

#### Eli

9. **Document the simplification lens in skills-ecosystem.md.** Edit `.prism/architect/skills-ecosystem.md` AND `templates/install/.prism/architect/skills-ecosystem.md`. Add a one-line note to the Eric, Briar, and Winston rows/sections that they now carry the offensive-simplification lens (non-blocking for reviewers; recommend-not-block for Winston), citing `structural-remedies.md`.

10. **(Optional) Annotate ADR-0017.** If Hunter wants the durable record, add a one-line Consequences note to `.prism/spec/adrs/0017-dual-axis-review-correctness-and-necessity.md` (+ templates mirror): the Necessity axis now includes an offensive-simplification lens, surfaced non-blockingly via the Cleaner Paths bucket and `structural-remedies.md`. Skip if keeping the diff minimal — the references are the durable home.

---

## Acceptance Criteria

### Behavioral

- [ ] Given PR-wave3.1 has merged, When an agent on a non-Claude tool reads PRISM's writing-voice or spec-editing rule, Then the mandate-inversion rationale reads as cross-model, with no "Claude 4.7" version pin (US-1).
- [ ] Given PR-wave3.1 has merged, When a contributor reads the session-context-leakage rule, Then the principle leads and the example list is explicitly non-exhaustive, with the heading reading "Session-context leakage" (US-2).
- [ ] Given PR-wave3.1 has merged, When a persona writes an AC set, Then the one-concept-one-word rule directs reusing one word per behavior and running the jargon translation test (US-3).
- [ ] Given PR-wave3.1 has merged, When a reader follows the ADR-0032 citation to the session-leakage section, Then the link resolves to the renamed heading (REQ-1).
- [ ] Given PR-wave3.2 has merged, When Eric reviews a PR, Then a non-blocking "Cleaner Paths" bucket may appear in the summary, with no GitHub label, no severity tier, and no PR-Readiness entry (US-4).
- [ ] Given PR-wave3.2 has merged, When Briar self-reviews, Then a non-blocking "Cleaner paths" line may appear without changing the verdict (US-5).
- [ ] Given PR-wave3.2 has merged, When Winston runs an evaluate pass, Then he asks whether a far simpler design exists before recommending "Proceed," raising what he recommends rather than what must clear the gate (US-6).
- [ ] Given PR-wave3.2 has merged, When a reviewer or architect reaches for a complexity-removing remedy, Then `structural-remedies.md` is available as the shared menu (US-7).
- [ ] Given PR-wave3.1 has merged, When a tester reads the AC rule, Then it describes the testing surface generically (running application + admin/config surface) with no WordPress-specific noun (US-8).
- [ ] Given PR-wave3.2 has merged, When Eric is invoked on a large PR, Then no instruction to swap to a 1M model variant appears — 1M context is the assumed default (US-9).

### Non-behavioral

- [ ] After each sub-PR merges, `pnpm prism:build`, `pnpm prism:check`, `pnpm prism:check-types`, and `pnpm prism:test` all pass.
- [ ] No "Claude 4.7" version pin remains in `.prism/rules/writing-voice.md` or `.prism/architect/spec-editing.md` (or their templates mirrors) (REQ-2).
- [ ] ADR-0015's historical 4.6→4.7 narrative is preserved (annotated forward, not rewritten) (REQ-3).
- [ ] No Thrive-session specifics ported: no THR-1874 reference in the AC rule, no recurrence tally in the session-leakage `**Why:**`, no WordPress/block/PHP examples in the simplification content (REQ-4, ADR-0032).
- [ ] `structural-remedies.md` exists on both surfaces (`.prism/references/` + `templates/install/.prism/references/`), byte-identical (REQ-5).
- [ ] No "Cleaner Paths" checkbox exists in any `## PR Readiness` surface (REQ-6).
- [ ] No new ADR created; no ADR renumbering performed (REQ-7).
- [ ] The large-PR escape-hatch blockquote is gone from `prism-code-review-pr/shared.md`, and `skill-authoring.md:102` no longer cites it as an example (referrer fixed, principle preserved) (REQ-8).

### AC Adjustments

### AC Sync Log

| Date | Agent | Action | Plan | Linear |
| ---- | ----- | ------ | ---- | ------ |

---

## Cleanup Items

Flagged during discovery — out of scope for this epic, candidate follow-up tickets:

- ~~`.prism/rules/acceptance-criteria.md` WordPress phrasing~~ — **absorbed into PR-wave3.1 task 6** (see Decision § "Absorbed: AC WordPress generalization"). No longer a follow-up.
- `.prism/rules/skill-authoring.md` — lacks the "Patterns Anthropic explicitly warns against" section Thrive has. Not stale (the 4.7 pin doesn't exist there), so nothing to port this wave — but a divergence worth a separate evaluation. **Left as a follow-up** (net-new section authoring, not a cleanup — different shape from the WordPress edit).
- #2037 Phase 1D/1E (SPEC.md invariant promotion; writing-voice → Tier 1 + chat scope) — genuinely unplanned, low-value. Candidate follow-up if Hunter wants full #2037 parity.

---

## PR Readiness

Living checklist — updated by each sub-PR's self-review run.

- [ ] No critical or major issues across both sub-PRs
- [ ] Types correct — no `any`, no unsafe `as` (N/A — content/markdown only, no TS source touched)
- [ ] No stray console.logs or debug artifacts
- [ ] Tests written for new logic and edge cases (N/A — no executable logic; verification is `pnpm prism:check` drift detection)
- [ ] All debugged issues resolved (no `open` entries)
- [x] Build passes — last run: 2026-05-29 (PR-wave3.1: build/check/check-types/test all green)
- [ ] PR descriptions up to date for each sub-PR
- [ ] Lasting decisions promoted to architect context (no new ADRs this wave; reference files are the durable home — confirm at close)

**Last updated:** 2026-05-29 (PR-wave3.1 Clove tasks 1–8 implemented)
