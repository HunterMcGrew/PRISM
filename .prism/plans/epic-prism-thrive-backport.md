# Plan: epic-prism-thrive-backport

> Closed: 2026-06-05

## Ticket

PRISM Phase 1.5c — Thrive backports (no Linear ticket; phase work). See [roadmap.md § Phase 1.5c](./roadmap.md#phase-15c--thrive-backports) for sequencing rationale.

## Goal

Absorb the 21 PRs of `.claude/`-equivalent work that landed in Thrive between PRISM's extraction and now, across six ordered sub-PRs, so PRISM doesn't drift from the dogfood.

---

## History

- 2026-05-22 [main]: Plan created. Synthesizes roadmap.md § Phase 1.5c into six PR-scoped task groups with persona ownership. Two open decisions flagged for Hunter input (PR-1.5c.3 cherry-pick mechanics; PR-1.5c.2 Sasha content adaptation).
- 2026-05-22 [main]: Both open decisions resolved by Hunter. PR-1.5c.3 Nora cherry-pick mechanics → rebuild against PRISM's Nora (path b). PR-1.5c.2 Sasha content absorption → PRISM-adapt for language-agnostic framing (path b) per ADR-0032. Decisions sections updated; task specs already aligned with these defaults so no task rewrites required.
- 2026-05-22 [hmcgrew/prism-1.5c.1-universal-rule-backports]: PR-1.5c.1 implementation complete — universal rules (context-reuse, worktree-isolation, followup-scope) authored; refactor-scope subsection added to code-standards; ADR-0038 (paired dev doc gates) and ADR-0039 (.ai-* namespace) drafted; lesson-promotion taxonomy added to all 12 persona sources and skills-ecosystem architect doc. All 15 plan tasks completed. Build + check + check-types + test all green.
- 2026-05-22 [hmcgrew/prism-1.5c.2-sasha-upgrade]: PR-1.5c.2 implementation complete — Sasha's prism-debugger source gains `## Feedback Loop` (10-rung ladder), `### Hypothesis-first diagnosis`, `### Instrumentation hygiene` with `[DEBUG-<hash>]` grep cleanup gate, plus approaches #8 (compound diagnoses) and #9 (diff before you dive) appended to `## How Sasha Thinks`. skills-ecosystem.md Sasha persona updated and dual-written to templates. All verification green.
- 2026-05-22 [hmcgrew/prism-1.5c.3-nora-upgrade]: PR-1.5c.3 implementation complete — Nora's prism-ticket-start source gains `## Mode: Cycle View` (Ready/In-flight/Blocked buckets with rollover detection), `## Mode: Duplicate Finder` (title 50% / labels 30% / description 20% scoring with propose-then-confirm), `## Shared state writes` confirmation gate governing all Linear mutations, and a step-4b follow-up scope-fit gate in the create-ticket path that cites `.prism/rules/followup-scope.md`. Cross-persona handoff bullets added to Winston, Eric, Briar, and Eli sources. skills-ecosystem.md Nora row updated and dual-written to templates. All verification green.
- 2026-05-22 [hmcgrew/prism-1.5c.4-eric-dual-mode]: PR-1.5c.4 implementation complete — extracted Eric's worktree procedure to `.prism/references/worktree-mode.md` (and templates mirror) with When-to-use, Worktree lifecycle, and Cleanup contract sections; refactored Eric to dual-mode shape with `## Mode selection`, `## In-branch mode procedure` (no checkout, reads via `gh pr diff` + `git show`), and `## Worktree mode procedure` linking to the reference. Briar's Eric handoff prose updated for dual-mode; Clove gains a temporal-framing scan step before writing to `## Decisions`; skills-ecosystem.md Eric row updated with dual-mode shape and a Session-cost economics rationale subsection added. All verification green.
- 2026-05-22 [hmcgrew/prism-1.5c.5-three-tier-loading]: PR-1.5c.5 implementation complete (tasks 1–5 + 7) — ADR-0035 (three-tier rule loading) and ADR-0036 (security as a distributed rule) authored and dual-written to canonical + templates. Six Tier 2 rule files (`accessibility.md`, `architect-doc-verification.md`, `implementation-task-detail.md`, `acceptance-criteria.md`, `worktree-isolation.md`, `verification-commands.md`) gain `paths:` YAML frontmatter, byte-identical between `.prism/rules/` and `templates/install/.prism/rules/`. Manifest restructured to register 7 Tier 1 rules and 6 Tier 2 rules as explicit per-file entries — the blanket `.prism/rules/**` entry is replaced with explicit routing while the architect-doc target stays `spec-editing.md`. All 12 persona sources gain a `## Context reuse across skills` section documenting how the three-tier model governs cross-skill invocations (Tier 1 inherits, Tier 2 re-evaluates, Tier 3 stays local). Platform copies regenerated via `pnpm prism:build`. All verification green.
- 2026-05-22 [hmcgrew/prism-1.5c.5-three-tier-loading]: Task 6 (lazy-loading restructure for skills >500 lines) deferred to follow-up PR — task spec under-specified per `.prism/rules/implementation-task-detail.md` (the 5 skills over 500 lines — `prism-code-review-pr` 507, `prism-pixel` 715, `prism-qa-test-plan` 573, `prism-standup-summary` 588, `prism-ticket-start` 677 — need per-skill judgment on which sections belong in core vs. supplemental references, and the lazy-load mechanism's interaction with `pnpm prism:build` is undefined). Safer to refactor with per-skill judgment after three-tier infrastructure (tasks 1–5) verifies working. Surfaced in PR description as known follow-up.
- 2026-05-22 [hmcgrew/prism-1.5c.6-zoe-persona]: PR-1.5c.6 implementation complete — ADR-0037 (cadence-driven personas axis) authored and dual-written, `audit-workflow.md` architect doc and paired dev doc landed per ADR-0038, Zoe's canonical skill source created at `.ai-skills/skills/prism-zoe/` (5 files, stack-agnostic) with roles.json registration. Manifest gains four routes for Zoe's surfaces (`.prism/lessons.md`, `.prism/lessons-archive.md`, `.prism/audit-state.json`, `.prism/audits/**` → `audit-workflow.md`); `audit-state.json` seeded with schemaVersion=1 shape; `lessons-archive.md` ships on both surfaces; per-Decision verdict reflex bullet added to Winston, Briar, Eric, and Zoe; open-question Decision variant codified in `.prism/rules/branch-plan.md` (mirrored to templates). All verification green (`pnpm prism:build && pnpm prism:check && pnpm prism:check-types && pnpm prism:test`).
- 2026-06-05 [hmcgrew/prism-audit-2026-06-05]: Plan closed retroactively per the 2026-06-05 audit close-out. Verdict gate surfaced one genuine promotion gap — the templates/install dual-write convention, now promoted to `install-layout.md` § The templates/install seed surface; the other six Decisions are tactical, no promotion. See `.prism/plans/audit-2026-06-05-closeout.md`.

---

## Decisions

- **Six sub-PRs in fixed order: 1.5c.1 → (1.5c.2 + 1.5c.3 + 1.5c.4 parallel-safe) → 1.5c.5 → 1.5c.6.**
  - **Root cause:** Universal rules are referenced by the persona upgrades (Sasha, Nora, Eric) and by the three-tier loading model and Zoe. Shipping rules first means downstream PRs reference live files. Three-tier loading is foundational for Zoe — Zoe should be born into the new loading model rather than retrofitted.
  - **Alternatives considered:** (a) Single mega-PR — too large to review, mixes mechanical sweeps with new-persona authoring. (b) Per-Thrive-PR mapping — produces 21 PRISM PRs with no cohesive groupings, drowns review attention. (c) Persona-first then rules — leaves persona PRs referencing rules that don't exist yet.
  - **Chosen approach:** Six cohesive sub-PRs grouped by concern. Universal rules first establishes the substrate; persona upgrades land in parallel against that substrate; three-tier loading restructures the substrate before Zoe is born into it.
  - **Implementation guidance:** Track each sub-PR as a separate task group below. Branch names follow the pattern `hmcgrew/prism-1.5c.N-<slug>`. Each sub-PR closes its own PR before the next dependent one opens.
  - → no promotion needed (PR sequencing tactic)
  - **Zoe verdict (2026-06-05):** `archive-candidate` — Phase 1.5c shipped (all six sub-PRs complete 2026-05-22 per History); ADRs 0035–0039 carry the durable record; plan never closed.

- **ADR renumbering map locked for this phase.** Avoids collisions with PRISM's existing ADR-0033 and Thrive's duplicated 0035.
  - Thrive ADR-0033 (rule loading tiers) → PRISM ADR-0035
  - Thrive ADR-0035 (security as a distributed rule) → PRISM ADR-0036
  - Thrive ADR-0035 (cadence-driven personas) → PRISM ADR-0037
  - Thrive ADR-0037 (paired dev doc gates) → PRISM ADR-0038
  - Thrive ADR-0038 (`.ai-*` namespace) → PRISM ADR-0039
  - **Implementation guidance:** Every new ADR cites its Thrive origin in a `## References` line so the genealogy is recoverable. ADR titles may diverge from Thrive's wording where PRISM's framing differs.
  - → no promotion needed (one-shot mapping; each ADR's References line carries the genealogy)
  - **Zoe verdict (2026-06-05):** `archive-candidate` — Phase 1.5c shipped (all six sub-PRs complete 2026-05-22 per History); ADRs 0035–0039 carry the durable record; plan never closed.

- **Every new ADR dual-writes to canonical (`.prism/spec/adrs/`) and templates (`templates/install/.prism/spec/adrs/`) surfaces.** Byte-identical except for plan-file references stripped from the templates copy per the ADR-0029/0030 pattern established in Phase 1.
  - **Implementation guidance:** Author the canonical copy first; copy to templates; delete any `.prism/plans/` reference line from the templates copy. `pnpm prism:check` verifies drift between the two copies.
  - → promoted to `.prism/architect/install-layout.md` § The templates/install seed surface (promotion executed at plan close 2026-06-05 — the convention had been re-tripping as a lessons.md entry because no durable surface recorded it)
  - **Zoe verdict (2026-06-05):** `archive-candidate` — Phase 1.5c shipped (all six sub-PRs complete 2026-05-22 per History); ADRs 0035–0039 carry the durable record; plan never closed.

- **PR-1.5c.1's `writing-voice.md` updates are conditional.** Thrive #1978 modifies writing-voice; PRISM may not ship that rule yet.
  - **Implementation guidance:** Before authoring writing-voice updates, run `ls .prism/rules/writing-voice.md` and `ls templates/install/.prism/rules/writing-voice.md`. If neither exists, the task is a no-op — note in plan history. If either exists, apply the updates to that surface and mirror to the other if it also exists.
  - → no promotion needed (one-shot conditional, resolved at implementation)
  - **Zoe verdict (2026-06-05):** `archive-candidate` — Phase 1.5c shipped (all six sub-PRs complete 2026-05-22 per History); ADRs 0035–0039 carry the durable record; plan never closed.

- **PR-1.5c.3 Nora cherry-pick mechanics — rebuild against PRISM's Nora.** Resolved 2026-05-22 by Hunter.
  - **Alternatives considered:** (a) rebase Thrive's `claude/sharp-albattani-ee8002` commits onto PRISM main — preserves commit history but guarantees conflicts on every file touched since PRISM's Nora source has diverged (prism- prefix, `.prism/` paths, dogfood content stripped); (b) rebuild Nora's modes against PRISM's existing canonical sources — re-authoring cost but lands clean on PRISM's diverged structure.
  - **Chosen approach:** path (b) — rebuild. Composes cleanly with PRISM's post-extraction shape; no merge-conflict overhead; commit-level genealogy is recoverable via plan history + ADR citation. Matches the canonical-content-is-generic principle from ADR-0032 — port the *capability*, not Thrive's exact source.
  - **Implementation guidance:** PR-1.5c.3 tasks below are the authoritative spec. Read Thrive's PR #2019 (branch `claude/sharp-albattani-ee8002`) as a reference for the cycle-view and duplicate-finder mode shapes, then re-author against PRISM's existing `.ai-skills/skills/prism-ticket-start/shared.md`. Do not git-cherry-pick or git-rebase Thrive's commits.
  - → no promotion needed (one-shot porting tactic; the port-the-capability-not-the-source principle is ADR-0032's)
  - **Zoe verdict (2026-06-05):** `archive-candidate` — Phase 1.5c shipped (all six sub-PRs complete 2026-05-22 per History); ADRs 0035–0039 carry the durable record; plan never closed.

- **PR-1.5c.2 Sasha content absorption — PRISM-adapt for language-agnostic framing.** Resolved 2026-05-22 by Hunter.
  - **Alternatives considered:** (a) verbatim port of Thrive's Sasha content — fastest, preserves exact phrasing but ladder examples cite WordPress/PHP debugging contexts and falsification principles cite Thrive incidents, bleeding Thrive shape into PRISM's canonical sources in violation of ADR-0032; (b) port the structural framework (ladder shape, hypothesis-count requirement, instrumentation gate, principles list) and adapt examples and citations to language-agnostic framing.
  - **Chosen approach:** path (b) — PRISM-adapt. Composes with ADR-0032 (canonical content is generic; per-team specializations land via Atlas during onboarding). Canonical Sasha stays language-agnostic; Atlas writes per-team examples into stub anchors during Phase 2 onboarding. The structural value (ranked hypotheses, feedback-loop ladder, tagged-instrumentation discipline) survives the adaptation — those are model-agnostic.
  - **Implementation guidance:** PR-1.5c.2 tasks below name structural elements to import and call out specific phrasings that need language-agnostic rewrites. Where Thrive's Sasha cites a WordPress/React example, PRISM's Sasha names the principle without the language-specific example and reserves a `<!-- atlas:example -->` anchor (per Phase 1.5d's stub-anchor convention) for Atlas to populate.
  - → no promotion needed (instance of the ADR-0032 principle)
  - **Zoe verdict (2026-06-05):** `archive-candidate` — Phase 1.5c shipped (all six sub-PRs complete 2026-05-22 per History); ADRs 0035–0039 carry the durable record; plan never closed.

- **Persona ownership within sub-PRs.** Clove owns implementation tasks (file edits, new file authoring, build verification). Eli owns documentation tasks (architect docs, dev docs, ADR Context/Decision/Consequences prose where it crosses into explanation rather than spec).
  - **Implementation guidance:** Within each sub-PR's `### PR-1.5c.N` heading, tasks split into `#### Clove` and `#### Eli` subheadings. Tasks reference each other inline when sequence matters (e.g. "after Eli's ADR-0035 draft lands").
  - → no promotion needed (instance of ADR-0018 persona-lane ownership)
  - **Zoe verdict (2026-06-05):** `archive-candidate` — Phase 1.5c shipped (all six sub-PRs complete 2026-05-22 per History); ADRs 0035–0039 carry the durable record; plan never closed.

---

## Implementation Tasks

### PR-1.5c.1 — Universal rule backports

**Branch:** `hmcgrew/prism-1.5c.1-universal-rule-backports`
**Depends on:** none — foundational sub-PR for Phase 1.5c.
**Blocks:** PR-1.5c.2, PR-1.5c.3, PR-1.5c.4, PR-1.5c.5, PR-1.5c.6 (every downstream PR references rules or anchors created here).
**Parallel-safe with:** none — must merge first.
**Verification:** `pnpm prism:build && pnpm prism:check && pnpm prism:check-types && pnpm prism:test` after each task group.

#### Clove

1. **Author `context-reuse.md` rule** at `.prism/rules/context-reuse.md` AND `templates/install/.prism/rules/context-reuse.md` (byte-identical). Content draws from Thrive PR #2014. Required sections: `## Purpose` (one-paragraph rationale — agents waste tokens re-reading files within a session), `## When to apply` (during any multi-step skill invocation that touches the same file across steps), `## Citation list — skills that load this rule` (enumerate all 12 PRISM skills by name: prism-architect, prism-code-dev, prism-code-review-pr, prism-code-review-self, prism-debugger, prism-documentation, prism-pixel, prism-qa-test-plan, prism-ticket-start, prism-user-stories, prism-changelog, prism-standup-summary). No verification command needed — content-only.

2. **Add one-line reference to context-reuse.md in each of the 12 canonical skill sources.** For each skill at `.ai-skills/skills/<skill-id>/shared.md`, append to the existing `## Lessons Check` or equivalent reflex-bullets section: `- Reuse already-loaded file context within a session — see [.prism/rules/context-reuse.md](../../../.prism/rules/context-reuse.md).` Skills to edit:
   - `.ai-skills/skills/prism-architect/shared.md`
   - `.ai-skills/skills/prism-code-dev/shared.md`
   - `.ai-skills/skills/prism-code-review-pr/shared.md`
   - `.ai-skills/skills/prism-code-review-self/shared.md`
   - `.ai-skills/skills/prism-debugger/shared.md`
   - `.ai-skills/skills/prism-documentation/shared.md`
   - `.ai-skills/skills/prism-pixel/shared.md`
   - `.ai-skills/skills/prism-qa-test-plan/shared.md`
   - `.ai-skills/skills/prism-ticket-start/shared.md`
   - `.ai-skills/skills/prism-user-stories/shared.md`
   - `.ai-skills/skills/prism-changelog/shared.md`
   - `.ai-skills/skills/prism-standup-summary/shared.md`
   Run `pnpm prism:build` afterward to regenerate the 12 `.claude/skills/<skill-id>/SKILL.md` outputs.

3. **Update `.prism/rules/branch-plan.md` History section with a 3-sentence cap.** Find the existing `## History` template guidance (around the line documenting one-line-per-meaningful-change). Append: `Each history entry must be at most 3 sentences. Longer entries indicate the change belongs in ## Decisions with sub-bullets, not in history narration.` Mirror the same edit to `templates/install/.prism/rules/branch-plan.md`.

4. **Add reflex bullet to Winston, Clove, Briar, Sasha shared.md sources** referencing the History cap. For each of `.ai-skills/skills/prism-architect/shared.md`, `.ai-skills/skills/prism-code-dev/shared.md`, `.ai-skills/skills/prism-code-review-self/shared.md`, `.ai-skills/skills/prism-debugger/shared.md`, append to the same Lessons Check section: `- Keep ## History entries to 3 sentences max — see [.prism/rules/branch-plan.md § History](../../../.prism/rules/branch-plan.md#5-keep-the-plan-clean-and-concise).` Run `pnpm prism:build` after.

5. **Add `### Refactor scope` subsection to `.prism/rules/code-standards.md` AND `templates/install/.prism/rules/code-standards.md`.** Locate the existing `## General` section. Insert after the existing bullets, before `## Whitespace`. Content (full new prose):
   ```markdown
   ### Refactor scope

   Refactor code you're already modifying for the ticket — including small local-frame reshape (initializing a variable to its default, extracting a helper from the function you're in, collapsing redundant branches) when the existing shape is making the right answer harder than it needs to be. That's not drive-by refactor; it's making the fix compose.

   Do not refactor code outside the local frame. Drive-by cleanup of nearby-but-unrelated code goes in a follow-up ticket.

   **Why:** Terse "do not refactor unrelated code" wording can override downstream guidance on ambiguous calls and prime minimum-diff fixation — bolting fallback after fallback onto an awkward shape instead of reshaping the frame so the fix composes. Defining the local frame flips the precedence correctly without losing scope discipline.

   **What "local frame" means:**

   - **In scope:** the lines you're already modifying; the function or method containing those lines; helpers you extract from that code; files already in the diff for this ticket.
   - **Out of scope:** unmodified code elsewhere in the same file; sibling files; "while I'm here" cleanup of code the ticket doesn't otherwise touch.
   ```

6. **Augment the existing `### Anti-pattern: Drive-by refactoring` section** in `.ai-skills/skills/prism-code-dev/shared.md` (verified present at line 85 within the existing anti-patterns subsection — verified during PR-1.5c.1 plan re-verification 2026-05-22). Revise the section to incorporate the local-frame distinction explicitly and cite `.prism/rules/code-standards.md § Refactor scope`. Two paragraphs total — first defines the local frame (lines being modified, containing function, helpers extracted from that code, files already in the diff); second defines what's out of scope (unmodified code elsewhere in the same file, sibling files, "while I'm here" cleanup). Run `pnpm prism:build` after.

7. **Author `acceptance-criteria.md` rule** at `.prism/rules/acceptance-criteria.md` (already exists per current state — augment, don't replace). Add a new `## AC citation discipline` section after the existing `## What NOT to include`. Content: citation rules — every AC must trace to either a user story, a debug finding, or a stated requirement; numbered citation format `(US-3)`, `(Debug-2)`, `(REQ-1)`; ACs without citations are flagged in self-review as Minor. Mirror to `templates/install/.prism/rules/acceptance-criteria.md`.

8. **Author/update `acceptance-criteria.md` template** at `.prism/templates/acceptance-criteria.md`. Add `### Pre-requisites Background` pattern section. Content: when AC depends on user state, system state, or fixtures (e.g. "user is logged in with admin role"), express as `**Background:** [state]` block at the top of the behavioral section. Following Gherkin's Background convention. Mirror to `templates/install/.prism/templates/acceptance-criteria.md`.

9. **Author `worktree-isolation.md` rule** at `.prism/rules/worktree-isolation.md` AND `templates/install/.prism/rules/worktree-isolation.md`. Content draws from Thrive PR #1996 but written language-agnostic. Required sections: `## Purpose` (worktrees prevent branch-state corruption during PR review); `## When to apply` (any persona that operates on someone else's branch — currently PR review, future-extensible); `## Cleanup contract` (worktree must be removed on skill exit, success or failure); `## Who runs this rule` (Eric — see PR-1.5c.4 for dual-mode addition).

10. **Author `followup-scope.md` rule** at `.prism/rules/followup-scope.md` AND `templates/install/.prism/rules/followup-scope.md`. Content draws from Thrive PR #2020. Required sections: `## Purpose` (follow-up tickets must have explicit scope, not be open-ended); `## Scope-fit gate` (Nora applies this when creating follow-up tickets — see Nora upgrade PR-1.5c.3); `## What counts as in-scope for a follow-up` (single fix or single feature, traceable to one decision in the originating plan); `## Anti-patterns` (follow-up tickets that bundle unrelated cleanups; "we'll figure out scope later" framing).

11. **Add lesson promotion taxonomy paragraph to all 12 personas' `## Lessons Check` sections.** Content (full paragraph to insert): `When promoting a lesson from \`.prism/lessons.md\` to a durable surface, classify the lesson by type and route accordingly: (a) Process lessons → \`.prism/rules/\`; (b) Architectural lessons → \`.prism/architect/<topic>.md\`; (c) Decision-class lessons → new ADR in \`.prism/spec/adrs/\`; (d) Ephemeral lessons (one-time gotchas) → stay in \`lessons.md\` until they trip a second incident. Promotion happens via Winston during plan close; routine personas surface the candidate via lessons.md append.` Insert into each of the 12 shared.md sources from task #2. Run `pnpm prism:build` after.

12. **`writing-voice.md` updates** (Thrive PR #1978 backport — verified both surfaces exist as of plan creation 2026-05-22: `.prism/rules/writing-voice.md` and `templates/install/.prism/rules/writing-voice.md`). Apply the `## Count rules, not numbers` section augmentation: additional examples covering compound count claims like "5 of 12 personas" and "three of the four backports". Dual-write byte-identical to both surfaces. Verification: `diff .prism/rules/writing-voice.md templates/install/.prism/rules/writing-voice.md` returns empty.

#### Eli

13. **Author ADR-0038 — Paired dev doc gates.** Dual-write to `.prism/spec/adrs/0038-paired-dev-doc-gates.md` AND `templates/install/.prism/spec/adrs/0038-paired-dev-doc-gates.md`. Content draws from Thrive PR #2016 (was Thrive ADR-0037). Sections: Context (architect docs in `.prism/architect/<topic>.md` need paired dev docs in `docs/content/dev/architecture/<topic>.md` so the consumer team's engineers can read the architectural reasoning without loading PRISM agent context); Decision (every new architect doc in `.prism/architect/` ships with a paired dev doc; build-time gate verifies pairing); Consequences (Theo persona in Phase 2.5 enforces this; until then, Winston manually pairs); References (Thrive PR #2016, PRISM ADR-0024 on branch-plan decisions, PRISM architect-doc-verification.md rule). Strip plan-file references from the templates copy.

14. **Author ADR-0039 — `.ai-*` prefix namespace validates `.prism/` choice.** Dual-write to `.prism/spec/adrs/0039-ai-prefix-namespace.md` AND `templates/install/.prism/spec/adrs/0039-ai-prefix-namespace.md`. Content draws from Thrive PR #2017 (was Thrive ADR-0038). Sections: Context (industry convergence on `.ai-*`-style namespaces — Cursor's `.cursor/`, Claude Code's `.claude/`, etc.); Decision (PRISM's `.prism/` choice validated by the pattern; `.ai-skills/` canonical source directory naming aligns with the same namespace convention); Consequences (consumer teams can identify AI-toolkit directories at a glance; no top-level pollution); References (Thrive PR #2017, PRISM ADR-0031 on bifurcated install layout). Strip plan-file references from the templates copy.

15. **Update `.prism/architect/skills-ecosystem.md` with the lesson promotion taxonomy.** Locate the existing `## Lessons` section (or create one immediately before the closing rule list). Add a `### Lesson promotion taxonomy` subsection summarizing the same four-class classification from task #11 with one-line route descriptions. Mirror to `templates/install/.prism/architect/skills-ecosystem.md`.

---

### PR-1.5c.2 — Sasha upgrade

**Branch:** `hmcgrew/prism-1.5c.2-sasha-upgrade`
**Depends on:** PR-1.5c.1 (cites context-reuse.md, lesson-promotion taxonomy paragraph).
**Blocks:** none within Phase 1.5c.
**Parallel-safe with:** PR-1.5c.3, PR-1.5c.4 (different persona files; section anchors disjoint from PR-1.5c.1's edits to Sasha's `shared.md`).
**Verification:** `pnpm prism:build && pnpm prism:check && pnpm prism:check-types && pnpm prism:test` after each task.

All tasks below adapt Thrive content to language-agnostic framing per the resolved Decisions § PR-1.5c.2 Sasha content absorption (rebuild path b confirmed 2026-05-22).

#### Clove

1. **Add `## Feedback Loop` section to `.ai-skills/skills/prism-debugger/shared.md`** with the 10-rung loop-type ladder from Thrive PR #2018, adapted for language-agnostic framing. Insert after the existing `## When this skill is invoked` section (verified section heading 2026-05-22 — the file uses `## When this skill is invoked`, not `## When to invoke`). Ladder rungs (all 10, in order, each as a bullet with a 1-sentence description):
   1. Stack trace inspection — pinpoint the literal line where the error surfaces.
   2. Binary search by git bisect — find the commit that introduced the bug.
   3. Print-statement bisection — add `[DEBUG-<hash>]` instrumentation at suspected boundaries (see task #3 for the tagged-instrumentation gate).
   4. State snapshot diffing — capture state before and after the failure point; diff.
   5. Dependency isolation — disable suspected components one at a time.
   6. Reproduction minimization — strip the failure context to the smallest input that still fails.
   7. Behavior comparison against a known-good environment — same code, different machine.
   8. Time-travel debugging — replay the failure with state inspection at each step.
   9. Adversarial input generation — fuzz the suspect surface.
   10. Pair the bug — explain it to another agent or human; the act of explaining often surfaces the cause.

   The phrasing must be stack-agnostic — no language-specific tooling names in the rung descriptions. Per-stack tooling examples belong in Atlas-generated per-stack rules.

2. **Add 3-5 ranked falsifiable hypotheses requirement to Sasha's debug procedure.** In the same `.ai-skills/skills/prism-debugger/shared.md`, locate the existing diagnosis procedure (or add one if it doesn't yet exist as a named section). Insert: `### Hypothesis-first diagnosis` with content requiring Sasha to enumerate 3–5 falsifiable hypotheses before running any diagnostic command, ranked by prior probability, each with an explicit falsification criterion ("if I see X, hypothesis Y is dead"). Forbidden: pursuing a single hypothesis without ranking it against alternatives.

3. **Add `[DEBUG-<hash>]` tagged instrumentation exception with grep-cleanup gate** to Sasha's procedure. Insert `### Instrumentation hygiene` section in `.ai-skills/skills/prism-debugger/shared.md`. Content: temporary debug logging is permitted ONLY when each statement is tagged with a unique `[DEBUG-<hash>]` prefix where `<hash>` is a 6-char random identifier. Cleanup gate: before Sasha exits the debug session, she runs `grep -rn '\[DEBUG-' <touched-files>` and removes every match. If any tagged instrumentation survives the grep, the session is not complete.

4. **Add compound-diagnoses as approach #8 in `## How Sasha Thinks`** in `.ai-skills/skills/prism-debugger/shared.md`. Verified section structure 2026-05-22: `## How Sasha Thinks` has numbered approaches 1–7 (Hypothesize before investigating, Evidence over intuition, Halve the search space, Root cause not proximate cause, Categorize first, One change per experiment, Minimal reproduction). Append as `### 8. Compound diagnoses are real.` with content: `A single observed failure can have multiple independent root causes that compose. Do not stop at the first plausible cause — verify each candidate is necessary and sufficient. Loading-state bugs (state machine renders stale data because the fetch failed AND the cache was stale AND the loading-state flag was already false) are the canonical compound class — language-agnostic per ADR-0032.` Adapt any UI-specific phrasing to language-agnostic prose.

5. **Add "Diff before you dive" as approach #9 in `## How Sasha Thinks`** — same section as task #4, appended after the approach #8 added there. Numbering: existing approaches 1–7 stay intact; task #4 adds #8 (compound diagnoses); this task adds #9. Content: `### 9. Diff before you dive.` followed by `Before tracing logic in source, run \`git log -p\` against the suspect file or function over the last N commits where N covers the timeframe in which the bug first appeared. Code-archaeology often surfaces the answer faster than runtime instrumentation — especially for "it used to work" reports.` Sequence: must land after task #4 in the same PR to preserve numbering.

6. **Run `pnpm prism:build`** to regenerate `.claude/skills/prism-debugger/SKILL.md`. Then `pnpm prism:check && pnpm prism:check-types && pnpm prism:test` to verify no drift, no type errors, no test breakage. Sasha has no compiled outputs beyond the SKILL.md mirror, so verification is fast.

#### Eli

7. **Update `.prism:architect/skills-ecosystem.md` with Sasha's new capabilities.** Locate the existing Sasha persona description. Append references to the 10-rung ladder, hypothesis ranking, and instrumentation hygiene. Mirror to `templates/install/.prism/architect/skills-ecosystem.md`.

---

### PR-1.5c.3 — Nora upgrade

**Branch:** `hmcgrew/prism-1.5c.3-nora-upgrade`
**Depends on:** PR-1.5c.1 (cites followup-scope.md scope-fit gate; lesson-promotion taxonomy paragraph).
**Blocks:** none within Phase 1.5c.
**Parallel-safe with:** PR-1.5c.2, PR-1.5c.4 (Nora's canonical source plus disjoint cross-persona references; merge surfaces don't collide with the other two).
**Verification:** `pnpm prism:build && pnpm prism:check && pnpm prism:check-types && pnpm prism:test` after each task.

All tasks below rebuild against PRISM's existing Nora canonical source per the resolved Decisions § PR-1.5c.3 Nora cherry-pick mechanics (rebuild path b confirmed 2026-05-22). Thrive PR #2019 (branch `claude/sharp-albattani-ee8002`) is the reference for mode shapes; do not git-cherry-pick its commits.

#### Clove

1. **Add Cycle View mode to `.ai-skills/skills/prism-ticket-start/shared.md`.** Locate the existing mode list (Nora currently has at least the "start a ticket" and "create a ticket" modes). Insert a new mode section `## Mode: Cycle View`. Content draws from Thrive PR #2019. Required behavior:
   - Trigger phrases: "show me the cycle", "what's in flight", "cycle view", "sprint view".
   - Pull all tickets in the active Linear cycle.
   - Bucket tickets into three groups:
     - **Ready** — assigned but not started (status = "Todo" or equivalent).
     - **In-flight** — actively in progress (status = "In Progress" or has open PR).
     - **Blocked** — has a "blocked" label or status = "Blocked".
   - **Rollover detection:** for tickets that appeared in the previous cycle's "In-flight" bucket and still appear in this cycle, flag with a `rollover` indicator and surface the count at the top of the output.
   - Output format: markdown table with columns `Ticket | Title | Status | Rollover? | Last activity`.

2. **Add Duplicate Finder mode to Nora's canonical source.** Same file as task #1, insert another mode section `## Mode: Duplicate Finder`. Required behavior:
   - Trigger phrases: "find duplicates", "is this a duplicate", "check for similar tickets".
   - Accept either a ticket ID (to check duplicates of) or a free-text description (to check duplicates against existing).
   - Similarity scoring: combine title cosine similarity, label overlap, and description fuzzy match. Specific weights: title 50%, labels 30%, description 20%.
   - **Propose-then-confirm pattern:** present the top 3 candidates with similarity scores and a per-candidate reasoning bullet; await user confirmation before any Linear mutation (linking, closing, merging). Never auto-merge.
   - Output: ranked list with score, title, status, and `Propose: link as duplicate / close as duplicate of / no action` action options.

3. **Add Linear shared-state write confirmation requirement** to Nora's existing modes (the original start/create modes, plus the two new ones). Insert into the existing `## Shared state writes` section (or create one immediately after the mode definitions). Content: any write to Linear that mutates shared state (creating a ticket, changing status, adding labels, linking tickets, posting comments) must be preceded by an explicit confirmation step where Nora prints the intended change and awaits a `yes` or equivalent. No silent writes. Reads (fetching ticket data, listing cycles) are exempt.

4. **Add cross-persona references for the new Nora modes.**
   - In `.ai-skills/skills/prism-architect/shared.md`, locate the section where Winston references other personas (likely `## Handoffs` or similar). Append: `- When the user asks "what's in flight" or "show the cycle", route to Nora's Cycle View mode.`
   - In `.ai-skills/skills/prism-code-review-pr/shared.md`, append to the same kind of handoff section: `- When duplicate-ticket suspicion arises during PR review (PR addresses same surface as a known ticket), route to Nora's Duplicate Finder mode.`
   - In `.ai-skills/skills/prism-code-review-self/shared.md`, same handoff guidance: `- Duplicate suspicion during self-review → Nora's Duplicate Finder.`
   - In `.ai-skills/skills/prism-documentation/shared.md`, append: `- Eli does not need to invoke Nora's modes directly, but should be aware that Cycle View is the source of truth for "what shipped this cycle" when authoring release notes.`
   - Run `pnpm prism:build` after to regenerate the four `.claude/skills/<id>/SKILL.md` outputs.

5. **Add scope-fit gate to Nora's follow-up ticket creation flow.** Locate the existing "create a follow-up ticket" subsection (or the general "create a ticket" mode if follow-up isn't yet a sub-mode). Add a pre-creation gate that invokes `.prism/rules/followup-scope.md` (from PR-1.5c.1 task #10). Required behavior: before creating any follow-up ticket, Nora prints the proposed scope, checks it against the followup-scope rule's `## Scope-fit gate` criteria (single fix or single feature; traceable to one decision in the originating plan), and either creates or asks the user to narrow scope. Tickets that fail the gate are not created without explicit override.

6. **Run `pnpm prism:build && pnpm prism:check && pnpm prism:check-types && pnpm prism:test`.** Verify no drift in regenerated skill outputs; verify no test breakage from the new modes.

#### Eli

7. **Update `.prism/architect/skills-ecosystem.md` Nora persona description** with the two new modes (Cycle View, Duplicate Finder) and the shared-state write confirmation requirement. Mirror to `templates/install/.prism/architect/skills-ecosystem.md`.

---

### PR-1.5c.4 — Eric dual-mode

**Branch:** `hmcgrew/prism-1.5c.4-eric-dual-mode`
**Depends on:** PR-1.5c.1 (cites worktree-isolation.md).
**Blocks:** none within Phase 1.5c.
**Parallel-safe with:** PR-1.5c.2, PR-1.5c.3 (most mechanical of the three — clean refactor of Eric's execution model; lowest judgment-call surface; recommended candidate if running two PRs in parallel).
**Verification:** `pnpm prism:build && pnpm prism:check && pnpm prism:check-types && pnpm prism:test` after each task.

Cuts session cost on the most-invoked review skill by making worktree mode opt-in instead of default.

#### Clove

1. **Extract worktree procedure to dedicated reference file `.prism/references/worktree-mode.md`** AND `templates/install/.prism/references/worktree-mode.md`. Source content: copy the existing worktree procedure currently embedded in `.ai-skills/skills/prism-code-review-pr/shared.md`. Sections: `## When to use worktree mode` (PR is on a divergent branch; review must not contaminate the current working tree; explicit user request via flag); `## Worktree lifecycle` (create, switch, cleanup on exit success or failure); `## Cleanup contract` (links to `.prism/rules/worktree-isolation.md` from PR-1.5c.1 task #9).

2. **Refactor Eric to dual-mode shape.** In `.ai-skills/skills/prism-code-review-pr/shared.md`, restructure the existing single-mode procedure. Required new shape:
   - `## Mode selection` — explicit gate at session start. Default = in-branch mode (no worktree). Opt-in = worktree mode, triggered by either (a) explicit user flag in the invocation (`--worktree` or "review in worktree" phrasing) or (b) Eric detecting that the PR's branch has uncommitted changes relative to the current working tree.
   - `## In-branch mode procedure` — fetch the PR's diff via `gh pr diff <num>`, read changed files at their HEAD state (the PR head, not main), run review against the diff. No checkout, no worktree.
   - `## Worktree mode procedure` — link to `.prism/references/worktree-mode.md` from task #1. Same review logic, executed against the worktree checkout.
   - Remove the standalone worktree procedure that was inline (now lives in the reference file).

3. **Update Briar's handoff prose** in `.ai-skills/skills/prism-code-review-self/shared.md`. Locate the existing reference to Eric (where Briar passes work to Eric after self-review). Update the prose to reflect that Eric now defaults to in-branch mode; explicit flag needed for worktree. One-paragraph update; no structural changes.

4. **Add Clove write-time scan for `## Decisions` temporal framing.** In `.ai-skills/skills/prism-code-dev/shared.md`, locate the existing section where Clove writes to the plan's `## Decisions` (likely in `## Plan updates after implementation` or similar). Add a scan step: before appending to `## Decisions`, Clove greps the proposed entry for temporal framing words that drift (`recently`, `currently`, `now`, `today`, `at the time of writing`, `going forward`). If any match, rewrite the entry with timeless framing (state what the decision is, not when it was made — the History entry carries the date). Provide three example rewrites inline:
   - `Currently we use X` → `X is the chosen approach because...`
   - `Going forward, all features must Y` → `Features must Y because...`
   - `Recently switched from A to B` → `B is used instead of A because...`

5. **Update `.prism/architect/skills-ecosystem.md` skill description for Eric.** Reflect dual-mode shape. Add a one-line note on session-cost rationale ("default in-branch keeps Eric cheap on the common path; worktree opt-in preserves isolation for branches with divergent state"). Mirror to `templates/install/.prism/architect/skills-ecosystem.md`.

6. **Run `pnpm prism:build && pnpm prism:check && pnpm prism:check-types && pnpm prism:test`.** Verify Eric's regenerated SKILL.md reflects dual-mode; verify Briar's regenerated SKILL.md reflects the updated handoff prose; verify Clove's regenerated SKILL.md includes the temporal-framing scan step.

#### Eli

7. **Document the dual-mode rationale in `.prism/architect/skills-ecosystem.md`** with a paragraph explaining session-cost economics. Why this matters: Eric is the highest-frequency review skill; worktree creation alone adds 5–15 seconds per invocation plus filesystem state. In-branch mode for the common path (PR is on the current branch, working tree is clean) saves cumulative session time without sacrificing isolation. Worktree mode remains available for the cases where it earns its cost.

---

### PR-1.5c.5 — Three-tier rule loading model

**Branch:** `hmcgrew/prism-1.5c.5-three-tier-loading`
**Depends on:** PR-1.5c.1, PR-1.5c.2, PR-1.5c.3, PR-1.5c.4 (the `paths:` frontmatter sweep + cross-skill context-reuse paragraph touch all 12 persona sources; sequencing after 1.5c.2/3/4 means the manifest restructure operates on final post-backport persona content rather than intermediate state).
**Blocks:** PR-1.5c.6 (Zoe must be authored against the new `paths:` frontmatter convention from the start, not retrofitted).
**Parallel-safe with:** none — must follow 1.5c.2/3/4 to avoid merge churn on the 12 persona sources.
**Verification:** `pnpm prism:build && pnpm prism:check && pnpm prism:check-types && pnpm prism:test` after each task.

Foundational — affects how every future skill/rule author works.

#### Eli

1. **Author ADR-0035 — Rule loading tiers (three-tier model).** Dual-write to `.prism/spec/adrs/0035-rule-loading-tiers.md` AND `templates/install/.prism/spec/adrs/0035-rule-loading-tiers.md`. Content draws from Thrive PR #1970 (was Thrive ADR-0033). Sections:
   - **Context** — PRISM currently loads all `.prism/rules/*.md` files into context on every session via the manifest's blanket `**` routing. Cost grows linearly with rule count; some rules apply only to specific personas or file paths.
   - **Decision** — adopt a three-tier loading model:
     - **Tier 1 — Always loaded** (rules that apply universally across all sessions). Routed via manifest blanket entry. Examples: `.prism/rules/code-comments.md`, `.prism/rules/code-standards.md` (because almost every session touches code).
     - **Tier 2 — Path-scoped** (rules that apply only when the diff touches certain paths). Routed via manifest `paths:` YAML frontmatter on the rule file itself. Example: `.prism/rules/accessibility.md` with `paths: ["**/*.tsx", "**/*.jsx", "**/*.vue"]`.
     - **Tier 3 — Skill-internal** (rules referenced only by specific skills; loaded lazily when the skill loads). No manifest entry; the skill's `shared.md` references the rule by path.
   - **Consequences** — manifest restructure (lean less on `**`); `paths:` frontmatter added to ~12 rule files; future rule authors must classify their rule by tier on creation; Tier 3 rules go into a new `.prism/skills/<skill-id>/rules/` subdirectory naming convention.
   - **References** — Thrive PR #1970; PRISM ADR-0029 (rules self-declare); PRISM ADR-0031 (bifurcated install layout).
   Strip plan-file references from the templates copy.

2. **Author ADR-0036 — Security as a distributed rule.** Dual-write to `.prism/spec/adrs/0036-security-as-distributed-rule.md` AND `templates/install/.prism/spec/adrs/0036-security-as-distributed-rule.md`. Content draws from Thrive PR #2001 (was Thrive ADR-0035 security variant). Sections:
   - **Context** — security concerns vary by stack; a single universal `security.md` rule can't cover every team's threat model.
   - **Decision** — adopt the pattern (security is a distributed rule applied across multiple reviewer skills: Eric, Briar, Sasha) but DO NOT ship `security.md` content with PRISM. Content is generated per-stack by Atlas during Phase 2 onboarding (e.g. `.prism/rules/security-react.md`, `.prism/rules/security-django.md`).
   - **Consequences** — Atlas's rule generator includes a per-stack security module; PRISM's reviewer skills reference security findings via the existing `acceptance-criteria.md` AC citation discipline (PR-1.5c.1 task #7).
   - **References** — Thrive PR #2001; PRISM ADR-0029, ADR-0032; future Phase 2 Atlas spec.
   Strip plan-file references from the templates copy.

#### Clove

3. **Add `paths:` YAML frontmatter to ~12 rule files.** For each rule, classify by tier and add frontmatter at the very top of the file. Specific routing:
   - **Tier 1 — Always loaded** (no `paths:` frontmatter; loaded universally):
     - `.prism/rules/code-comments.md`
     - `.prism/rules/code-standards.md`
     - `.prism/rules/branch-plan.md`
     - `.prism/rules/git-conventions.md`
     - `.prism/rules/pr-description.md`
     - `.prism/rules/context-reuse.md` (from PR-1.5c.1)
     - `.prism/rules/followup-scope.md` (from PR-1.5c.1)
   - **Tier 2 — Path-scoped** (add `paths:` frontmatter):
     - `.prism/rules/accessibility.md` → `paths: ["**/*.tsx", "**/*.jsx", "**/*.vue", "**/*.svelte", "**/*.html"]`
     - `.prism/rules/architect-doc-verification.md` → `paths: [".prism/architect/**/*.md", "docs/content/dev/architecture/**/*.md"]`
     - `.prism/rules/implementation-task-detail.md` → `paths: [".prism/plans/**/*.md", ".prism/design/mocks/**/*.md"]`
     - `.prism/rules/acceptance-criteria.md` → `paths: [".prism/plans/**/*.md"]`
     - `.prism/rules/worktree-isolation.md` (from PR-1.5c.1) → `paths: [".prism/**", "scripts/**"]`
     - `.prism/rules/verification-commands.md` → `paths: ["**/*.ts", "**/*.tsx", "**/*.js", "**/*.jsx", "**/*.php", "**/*.py", "**/*.go"]`
   Mirror each frontmatter addition to the corresponding `templates/install/.prism/rules/<file>.md` byte-identically.

4. **Restructure manifest to lean less on `**` blanket routing.** In `.ai-skills/manifest.json` (or wherever the existing manifest lives — verify path first), replace the blanket `**` entry for rules with explicit tier-based routing:
   - Tier 1 rules: explicit per-file entry with no path filter.
   - Tier 2 rules: explicit per-file entry, but the rule's own `paths:` frontmatter governs when it loads (the manifest just registers it; the loader respects frontmatter).
   - Tier 3 rules: not in the manifest at all.
   Verify with `pnpm prism:check` that the manifest still validates against the schema; verify with a session test that a rule with `paths: ["**/*.tsx"]` does not load when no `.tsx` files are in the current change set.

5. **Add cross-skill context-reuse paragraph to all 12 SKILL.md sources.** This complements PR-1.5c.1 task #2 (which added the one-line reference). In each of the 12 `.ai-skills/skills/<skill-id>/shared.md` files, add a fuller `## Context reuse across skills` section (new heading) explaining how Tier 1 / Tier 2 / Tier 3 loading affects cross-skill invocation. Content: when a skill invokes another skill (e.g. Winston invoking Mira for user stories), the second skill inherits Tier 1 rules already loaded; Tier 2 rules reload based on the second skill's path filters; Tier 3 rules are skill-local and don't transfer. This is the formal substrate for the previous one-line reference. Run `pnpm prism:build` after.

6. **Lazy-loading restructure for heavy skills.** Identify skills whose `shared.md` exceeds 500 lines (likely candidates: prism-architect, prism-debugger, prism-code-dev). For each:
   - Split the `shared.md` into a core surface (≤300 lines) + supplemental references at `.ai-skills/skills/<skill-id>/references/<topic>.md`.
   - The skill's `shared.md` references the supplemental files by path; the skill loads them lazily only when the relevant mode is invoked.
   - Verify per-skill that `pnpm prism:build` regenerates a SKILL.md whose core surface is the canonical core, and supplemental refs are not inlined.

   This task is conditional — if no skill exceeds 500 lines, record "no skills exceed lazy-load threshold" in plan history and skip.

7. **Run full verification.** `pnpm prism:build && pnpm prism:check && pnpm prism:check-types && pnpm prism:test`. The manifest restructure is the highest-risk change; verify with a manual session test that a session loading a `.md` file (no `.tsx`) does not load `accessibility.md`.

---

### PR-1.5c.6 — Zoe persona

**Branch:** `hmcgrew/prism-1.5c.6-zoe-persona`
**Depends on:** PR-1.5c.5 (Zoe must be born into the three-tier loading model with `paths:` frontmatter from the start).
**Blocks:** none within Phase 1.5c.
**Parallel-safe with:** none — final sub-PR in Phase 1.5c.
**Verification:** `pnpm prism:build && pnpm prism:check && pnpm prism:check-types && pnpm prism:test` after each task.

Introduces a new persona category — cadence-driven, orthogonal to ticket-flow handoffs. New PRISM ADR-0037 codifies the axis.

#### Eli

1. **Author ADR-0037 — Cadence-driven personas as a separate axis.** Dual-write to `.prism/spec/adrs/0037-cadence-driven-personas.md` AND `templates/install/.prism/spec/adrs/0037-cadence-driven-personas.md`. Content draws from Thrive PR #2003 (was Thrive ADR-0035 cadence variant). Sections:
   - **Context** — PRISM's existing personas (Winston, Clove, Eric, etc.) are all ticket-flow personas — invoked in the context of a specific ticket or PR. Some maintenance work (lessons archival, plan staleness audit, ADR review) doesn't fit that flow.
   - **Decision** — introduce cadence-driven personas as a separate axis. Zoe is the first. Cadence personas are invoked on a schedule or threshold trigger, operate over the entire `.prism/` surface, and write to dedicated state files rather than ticket-scoped plans.
   - **Consequences** — new directory pattern `.prism/<persona-state>.json` for cadence-persona operational state; new architect doc category `.prism/architect/<workflow>-workflow.md` for cadence-persona workflows.
   - **References** — Thrive PR #2003; PRISM ADR-0001 (skill auto-routing); PRISM ADR-0035 (three-tier loading — Zoe loads Tier 1 plus archive-specific rules as Tier 3).
   Strip plan-file references from the templates copy.

2. **Author `.prism/architect/audit-workflow.md` architect doc** AND paired dev doc at `docs/content/dev/architecture/audit-workflow.md` (per ADR-0038 paired-doc gate from PR-1.5c.1 task #13). Content: Zoe's workflow — cadence trigger (weekly or on-demand), surface scan (read `.prism/plans/`, `.prism/lessons.md`, `.prism/spec/adrs/`), classification step (per-decision verdicts), archival action (move stale items to `.prism/lessons-archive.md` or close stale plans), state update (`.prism/audit-state.json`). Mirror the architect doc to `templates/install/.prism/architect/audit-workflow.md`.

#### Clove

3. **Create canonical Zoe skill source.** Author all five files in a new directory `.ai-skills/skills/prism-zoe/`:
   - `frontmatter.yml` — skill metadata: id, name, description, invocation phrases. Match the shape of other skills (e.g. `.ai-skills/skills/prism-architect/frontmatter.yml` as the reference shape).
   - `shared.md` — the core canonical content. Sections:
     - `## Purpose` — Zoe audits the `.prism/` surface on cadence to surface stale plans, archive-candidate lessons, and overdue ADR reviews.
     - `## Cadence` — invoked weekly (default) or on user demand. The cadence is advisory; the user controls invocation.
     - `## Audit surfaces` — `.prism/plans/`, `.prism/lessons.md`, `.prism/spec/adrs/`, `.prism/architect/`.
     - `## Per-Decision verdict procedure` — for each `## Decisions` entry in every plan file, Zoe issues one of three verdicts: `live` (still in effect), `archive-candidate` (decision is no longer load-bearing, candidate for promotion-or-deletion review), `overdue-archive` (decision references work that shipped >90 days ago and the plan is still open). Verdicts written into the plan as sub-bullets on each Decision entry.
     - `## Archive classification` — for lessons in `.prism/lessons.md`, classify each entry as `archive-candidate` (not referenced in any plan or ADR in the last 30 days) or `live` (referenced recently). Archive-candidate lessons get moved to `.prism/lessons-archive.md` on the user's confirmation.
     - `## Open-question Decision variant` — Zoe also handles the `OPEN — TBD, needs Hunter input` decision variant: when Zoe sees an open Decision still unresolved after >30 days, she flags it as `open-stale` for the user's attention. Open-stale Decisions appear in Zoe's audit output as a top-line surface.
     - `## Output format` — markdown report saved to `.prism/audits/<YYYY-MM-DD>-audit.md`; not posted to chat unless explicitly requested.
     - `## State file` — Zoe reads and writes `.prism/audit-state.json` to track last-run timestamp, items already classified, items deferred. See task #5 below for the schema.
   - `claude.md` — Claude Code platform addendum (skill invocation specifics, slash command name). Match shape of other skills.
   - `codex.md` — Codex platform addendum. Match shape.
   - `cursor.md` — Cursor platform addendum. Match shape.

4. **Register Zoe in the manifest.** Update `.ai-skills/manifest.json` to include the new skill at `prism-zoe`. Routing: Tier 1 always-loaded (Zoe needs the same baseline rules every persona needs); no path filter; explicit invocation only (Zoe does not auto-trigger).

5. **Initialize `.prism/audit-state.json` operational state file.** Create the file with seed content:
   ```json
   {
     "schemaVersion": 1,
     "lastRun": null,
     "classified": {},
     "deferred": [],
     "archived": {
       "lessons": [],
       "plans": []
     }
   }
   ```
   Schema description (add to `.prism/architect/audit-workflow.md` from task #2): `schemaVersion` (integer, bump on shape change); `lastRun` (ISO 8601 timestamp or null); `classified` (map of plan path → most-recent-verdict timestamp); `deferred` (array of items the user chose to defer with reason strings); `archived` (record of what's been moved to lessons-archive or closed). The file is operational state, not durable spec — it lives at `.prism/` (not in templates) and ships empty per task #6.

6. **Initialize `.prism/lessons-archive.md` storage file.** Create the file with seed content:
   ```markdown
   # Lessons Archive

   Lessons that were once active in `.prism/lessons.md` and have been archived by Zoe. Each entry retains its original date and content; archive timestamp added on move.

   ---
   ```
   The templates surface gets an empty version at `templates/install/.prism/lessons-archive.md` so consumer teams start with the file in place (Zoe doesn't have to create it on first run).

7. **Add Per-Decision verdict sub-bullets to Winston, Briar, Eric, Zoe canonical sources.** For each of `.ai-skills/skills/prism-architect/shared.md`, `.ai-skills/skills/prism-code-review-self/shared.md`, `.ai-skills/skills/prism-code-review-pr/shared.md`, `.ai-skills/skills/prism-zoe/shared.md`, add a reflex bullet to the existing reflex-bullets section: `- When reading a plan's ## Decisions section, note any decision with a Zoe-issued verdict sub-bullet (live / archive-candidate / overdue-archive / open-stale) and respect the verdict during current work.`

8. **Add open-question Decision variant to `.prism/rules/branch-plan.md` AND `templates/install/.prism/rules/branch-plan.md`.** Locate the existing `## Decisions` section template. Add a paragraph describing the `OPEN — TBD, needs <name> input` variant — explicit syntax for decisions deferred to a specific person, with the default path documented inline so work can continue under the default until the decision is resolved. Cite this plan's own Decisions section as the canonical example pattern.

9. **Run `pnpm prism:build && pnpm prism:check && pnpm prism:check-types && pnpm prism:test`.** Verify Zoe's regenerated SKILL.md exists at `.claude/skills/prism-zoe/SKILL.md`; verify the manifest validates; verify the state file is well-formed JSON; verify Per-Decision verdict bullets appear in the four updated skills' regenerated outputs.

---

## Acceptance Criteria

### Behavioral

- [ ] Given PR-1.5c.1 has merged, When any persona runs against a session, Then context-reuse.md is loaded and the persona avoids re-reading already-loaded files within the session (US-1).
- [ ] Given PR-1.5c.1 has merged, When Winston writes a `## History` entry, Then the entry is at most 3 sentences (REQ-1).
- [ ] Given PR-1.5c.1 has merged, When Clove modifies a function, Then refactor scope is limited to the local frame as defined in `code-standards.md § Refactor scope` (REQ-2).
- [ ] Given PR-1.5c.2 has merged, When Sasha diagnoses a bug, Then she enumerates 3–5 falsifiable hypotheses with explicit falsification criteria before running any diagnostic command (US-2).
- [ ] Given PR-1.5c.2 has merged, When Sasha adds temporary instrumentation, Then every statement is tagged `[DEBUG-<hash>]` and Sasha verifies a clean grep before session exit (US-3).
- [ ] Given PR-1.5c.3 has merged, When the user says "show me the cycle", Then Nora returns a Ready/In-flight/Blocked bucketed view with rollover detection (US-4).
- [ ] Given PR-1.5c.3 has merged, When the user provides a ticket ID and asks "is this a duplicate", Then Nora returns top-3 candidates with similarity scores and awaits user confirmation before any Linear mutation (US-5).
- [ ] Given PR-1.5c.3 has merged, When Nora creates a follow-up ticket, Then the scope is verified against `followup-scope.md § Scope-fit gate` before creation (REQ-3).
- [ ] Given PR-1.5c.4 has merged, When Eric is invoked without an explicit worktree flag, Then Eric runs in in-branch mode against `gh pr diff` output (US-6).
- [ ] Given PR-1.5c.4 has merged, When the user passes `--worktree` or "review in worktree", Then Eric runs in worktree mode per `.prism/references/worktree-mode.md` (US-7).
- [ ] Given PR-1.5c.4 has merged, When Clove appends to `## Decisions`, Then temporal-drift words are scanned and rewritten to timeless framing (REQ-4).
- [ ] Given PR-1.5c.5 has merged, When a session's change set includes only `.md` files, Then `.prism/rules/accessibility.md` is not loaded into context (REQ-5).
- [ ] Given PR-1.5c.5 has merged, When a future rule author creates a new rule, Then they classify it by tier and add `paths:` frontmatter for Tier 2 rules (US-8).
- [ ] Given PR-1.5c.6 has merged, When the user invokes Zoe, Then Zoe audits `.prism/plans/`, `.prism/lessons.md`, and `.prism/spec/adrs/` and produces a markdown report saved to `.prism/audits/<YYYY-MM-DD>-audit.md` (US-9).
- [ ] Given PR-1.5c.6 has merged, When Zoe encounters a `## Decisions` entry, Then she issues a `live`, `archive-candidate`, `overdue-archive`, or `open-stale` verdict (US-10).

### Non-behavioral

- [ ] After each sub-PR merges, `pnpm prism:build` completes without error.
- [ ] After each sub-PR merges, `pnpm prism:check` reports no drift between canonical sources and generated outputs.
- [ ] After each sub-PR merges, `pnpm prism:check-types` reports no TypeScript errors.
- [ ] After each sub-PR merges, `pnpm prism:test` reports all tests passing.
- [ ] ADR numbering across PR-1.5c.1 through PR-1.5c.6 does not collide with existing PRISM ADRs (0001–0034) or within the new range (0035–0039).
- [ ] All new rules created in this phase exist on both surfaces — `.prism/rules/<name>.md` AND `templates/install/.prism/rules/<name>.md` (byte-identical except for plan-file reference stripping in templates).
- [ ] All new ADRs created in this phase exist on both surfaces — `.prism/spec/adrs/<id>-<title>.md` AND `templates/install/.prism/spec/adrs/<id>-<title>.md` (byte-identical except for plan-file reference stripping in templates).
- [ ] Zoe's operational state file `.prism/audit-state.json` validates as JSON and contains the seed shape from PR-1.5c.6 task #5.
- [ ] `.prism/lessons-archive.md` exists on both surfaces (canonical and templates) ready for first Zoe run.

### AC Adjustments

### AC Sync Log

| Date | Agent | Action | Plan | Linear |
| ---- | ----- | ------ | ---- | ------ |

---

## Cleanup Items

None at plan-creation time.

---

## PR Readiness

Living checklist — updated by each sub-PR's self-review run.

- [ ] No critical or major issues across all six sub-PRs
- [ ] Types correct — no `any`, no unsafe `as`
- [ ] No stray console.logs or debug artifacts
- [ ] Tests written for new logic and edge cases (especially Zoe's verdict procedure and Nora's similarity scoring)
- [ ] All debugged issues resolved (no `open` entries)
- [ ] Build passes — last run: not yet started
- [ ] PR descriptions up to date for each sub-PR
- [ ] Lasting decisions promoted to architect context (ADR-0035 / 0036 / 0037 / 0038 / 0039 cover the durable surface)

**Last updated:** 2026-05-22
