# PRISM Roadmap

Meta-index for PRISM's phased work. Each phase below has (or will have) its own epic plan file in `.prism/plans/`. This document tracks sequencing, dependencies, and rationale across phases — not per-task implementation detail.

## Current state

| Phase | Scope | Status | Plan |
|---|---|---|---|
| 1 | PRISM foundation — extract from Thrive, prism- prefix migration, canonical sources, dogfood prune | ✅ shipped via [PR #1](https://github.com/HunterMcGrew/agent-crew/pull/1) | [epic-phase-1-foundation.md](./epic-phase-1-foundation.md) |
| 1.5a | Install layout bifurcation — `.prism/` canonical + platform copies | ✅ shipped via [PR #2](https://github.com/HunterMcGrew/agent-crew/pull/2) | [epic-prism-install-layout.md](./epic-prism-install-layout.md) |
| 1.5b | Detail bar codification + Pixel-always-Winston routing | ✅ shipped via [PR #3](https://github.com/HunterMcGrew/agent-crew/pull/3) | [prism-detailed-plans.md](./prism-detailed-plans.md) |

## Proposed phases

| Phase | Scope | Status | Plan |
|---|---|---|---|
| **1.5c** | Thrive backports — universal rules, persona upgrades (Sasha, Nora, Eric), three-tier rule loading, Zoe persona | shipped | [`epic-prism-thrive-backport.md`](./epic-prism-thrive-backport.md) |
| **1.5d** | Tokenization + content cleanup sweep — replaces original PR #3 + PR #4 | shipped | [`epic-prism-tokenization.md`](./epic-prism-tokenization.md) |
| **1.5e** | Pattern absorptions — deletion test, two-adapters seam rule, micro-file step machine, triple-gated ADR criterion, A/P/C menu | shipped | [`epic-prism-pattern-absorptions.md`](./epic-prism-pattern-absorptions.md) |
| **1.5f** | Thrive backports, second wave — `.generated/` collapse, tool-agnostic Pixel mocks, Decisions verdict pattern, draft PRs by default | proposed | [`epic-prism-thrive-backport-wave-2.md`](./epic-prism-thrive-backport-wave-2.md) |
| **2** | Atlas — onboarding persona, stack detection, per-team rule generation (incl. `security.md`), stub-anchor population | in progress, multi-PR | [`epic-prism-atlas.md`](./epic-prism-atlas.md) |
| **2.5** | **Theo** — architect-doc walker, codebase-walking, interactive, resumable | proposed | TBD: `epic-prism-theo.md` |
| **2.6** | **Ren** — refactor scout, codebase-walking for refactor candidates, interactive grilling loop | proposed | TBD: `epic-prism-ren.md` |
| **3** | **Parker** — PRD persona, one persona, two modes (greenfield + brownfield) | proposed | TBD: `epic-prism-parker.md` |

Out of scope for the current planning horizon (revisit later): e2e test creator (conditional via Atlas if the team's stack has an e2e harness), grill-with-docs (community/optional skill — human onboarding, not core PRISM workflow), sprint planner (Nora's cycle view + duplicate finder modes from PR #2019 cover the gap).

---

## Phase 1.5c — Thrive backports

**Goal:** Absorb the 21 PRs of `.claude/`-equivalent work that landed in Thrive between PRISM's extraction (early May 2026) and now (mid-May 2026), so PRISM doesn't drift from the dogfood.

**Scope breakdown (proposed PR sequence within this phase):**

1. **PR-1.5c.1 — Universal rule backports.** Small, cross-cutting edits to PRISM-shipped rules and reflex-bullet additions across multiple personas.
   - `context-reuse.md` rule (Thrive #2014) + one-line reference in 12 PRISM skills
   - `branch-plan.md` History cap at 3 sentences (Thrive #1993) + reflex bullets in Winston/Clove/Briar/Sasha
   - `code-standards.md` "Refactor scope" subsection with local-frame definition (Thrive #1952) + Clove paragraph
   - `acceptance-criteria.md` rule + template — AC citation discipline, Pre-requisites Background pattern (Thrive #1977)
   - `worktree-isolation.md` rule (Thrive #1996)
   - `followup-scope.md` rule (Thrive #2020) + Nora scope-fit gate
   - Lesson promotion taxonomy paragraph in all 12 personas' `## Lessons Check` (Thrive #1942)
   - `writing-voice.md` updates IF PRISM ships this rule (Thrive #1978) — verify first

2. **PR-1.5c.2 — Sasha upgrade.** Cohesive persona refresh combining three Thrive PRs.
   - Feedback loop with 10-rung loop-type ladder (Thrive #2018)
   - 3–5 ranked falsifiable hypotheses requirement (Thrive #2018)
   - `[DEBUG-<hash>]` tagged instrumentation with grep-cleanup gate (Thrive #2018)
   - Loading-state bug category + compound-diagnosis falsification principle (Thrive #2020)
   - "Diff before you dive" approach #6 (Thrive #1942)

3. **PR-1.5c.3 — Nora upgrade.** Cherry-pick from Thrive's open PR #2019 (`claude/sharp-albattani-ee8002` branch).
   - Cycle view mode — Ready/In-flight/Blocked buckets with rollover detection
   - Duplicate finder mode with similarity scoring and propose-then-confirm pattern
   - Cross-persona references in Winston/Eric/Briar/Eli for the new Nora modes
   - **Caveat documented in plan:** cherry-picked pre-merge; revisit alignment if Thrive's PR #2019 changes materially during their review

4. **PR-1.5c.4 — Eric dual-mode.** Refactor Eric to in-branch-by-default, worktree-opt-in (Thrive #1974). Cuts cost on the most-invoked review skill. Includes paired Briar handoff cleanup and Clove write-time scan for `## Decisions` temporal framing.

5. **PR-1.5c.5 — Three-tier rule loading model.** Adopt Thrive's ADR-0033 pattern (always-loaded / path-scoped / skill-internal) with `paths:` YAML frontmatter. **Foundational** — affects how every future skill/rule author works.
   - New PRISM ADR-0035 (renumbered from Thrive's 0033 to avoid collision with PRISM's existing ADR-0033 on implementation-task-detail)
   - `paths:` frontmatter on relevant rules
   - Lazy-loading restructure for heavy skills if applicable

6. **PR-1.5c.6 — Zoe persona.** New cadence-driven audit persona (Thrive #2003). New persona *category* — orthogonal to ticket-flow handoffs.
   - `.prism/skills/prism-zoe/` (or `.ai-skills/skills/prism-zoe/` canonical + generated mirrors)
   - `.prism/architect/audit-workflow.md`
   - `.prism/audit-state.json` operational state
   - `.prism/lessons-archive.md` archived lessons storage
   - New PRISM ADR — Cadence-driven personas as a separate axis (renumbered from Thrive's ADR-0035)
   - Per-Decision verdict sub-bullets across Winston/Briar/Eric
   - Archive classification (`archive-candidate`, `overdue-archive`)

**Skipped from Thrive's backport set:**
- Thrive #2001 `security.md` content — pattern only (security as a distributed rule applied across reviewers); content moves to Atlas-generated per stack
- Thrive #1964 — already in PRISM (PR #3 was the upstream)
- Thrive #1946, #1956, #1976 — Thrive-domain-only, no PRISM relevance

**ADR collisions resolved here:** Thrive's ADR-0033 (three-tier loading), ADR-0035 (cadence-driven personas), ADR-0035 (security distributed rule), ADR-0037 (paired dev doc gates), ADR-0038 (`.ai-*` prefix namespace) → PRISM ADRs 0035, 0037, 0036, 0038, 0039 respectively. Numbering pinned below in § ADR numbering plan.

**Dependencies:**
- 1.5c.1 (universal rules) is foundational — should land first so other backports reference the new rules
- 1.5c.3 (Nora) requires the cherry-pick from Thrive's open branch
- 1.5c.5 (three-tier loading) is foundational for Zoe (1.5c.6) — Zoe should be born into the new model

**Sequence:** 1.5c.1 → 1.5c.2 + 1.5c.3 + 1.5c.4 (parallel-safe) → 1.5c.5 → 1.5c.6.

---

## Phase 1.5d — Tokenization + content cleanup

**Goal:** Run the originally-planned PR #3 (tokenization) and PR #4 (content cleanup) as one combined sweep against post-backport content.

**Scope:**
- Token substitution in `scripts/ai-skills/build.ts` (per ADR-0030)
- `scripts/ai-skills/lib/tokens.ts` extraction
- Literal-Thrive guard at `.ai-skills/definitions/literal-allowlist.json`
- Sweep canonical sources + templates for token replacement
- Editorial content cleanup per ADR-0032 (strip language/framework specializations, strip equipment-dealership domain blocks, generalize originating-incident citations, stub anchors where Atlas writes)

**Rationale for combining:** Doing tokenization first then backports would force double work — tokenizing both current content AND backported content. Backports first, single tokenization pass at the end, single sweep against final post-backport content.

**Detailed task breakdown:** Already exists in [`epic-phase-1-foundation.md`](./epic-phase-1-foundation.md) tasks 13–28. Move into a dedicated epic plan file when starting this phase.

**Dependencies:** Must follow 1.5c (all backports landed); precedes Phase 2 (Atlas operates on post-tokenization paths).

---

## Phase 1.5e — Pattern absorptions

**Goal:** Absorb the non-persona patterns surfaced during planning research — slot into existing PRISM surfaces without new personas.

**Scope (small, single PR):**

| Pattern | Source | PRISM home |
|---|---|---|
| Deletion test heuristic | Matt Pocock — improve-codebase-architecture | Winston evaluate axes (in [.ai-skills/skills/prism-architect/shared.md](../../.ai-skills/skills/prism-architect/shared.md)) + Eric/Briar review framing |
| "Two adapters = real seam" rule | Matt Pocock — DEEPENING.md | [`code-standards.md`](../rules/code-standards.md) § General — inverse of "three similar lines" |
| Triple-gated ADR criterion | Matt Pocock — grill-with-docs | Winston § When to write an ADR — sharpens existing decision-promotion heuristic |
| Micro-file step machine reference | BMAD — bmad-create-architecture | New reference doc at `.prism/references/micro-file-step-machine.md` — Winston and architect-doc walker both cite |
| `stepsCompleted` frontmatter pattern | BMAD | Architect-doc walker spec; available for Winston plan mode if it grows |
| A/P/C menu (Advanced Elicitation / Party Mode / Continue) | BMAD | Winston evaluate mode — explicit user gates between phases |
| Stakes calibration (hobby/internal/launch) | BMAD bmad-prd | PRD persona; possibly Mira stress signal |

**Rationale:** These are pattern transfers, not new personas. They sharpen existing surfaces. Doing this as a small PR after the bigger backports validates the absorption workflow at lower risk than the persona-introduction PRs in Phase 2.5 / 3.

**Dependencies:** Can land before, during, or after Phase 2/2.5/3. Suggested sequencing: after 1.5d to avoid merge churn during the content cleanup sweep.

---

## Phase 2 — Atlas (onboarding)

**Goal:** Replace the vapor — Atlas has been referenced in 20+ places across plans/ADRs/decisions as the Phase 2 persona, but doesn't exist as a skill. Build it.

**Scope:**
- Stack detection from package files (`package.json`, `composer.json`, `Pipfile`, `go.mod`, `Cargo.toml`, `Gemfile`, etc.)
- Per-team rule generation: `code-standards-<lang>.md`, framework-specific guidelines, **`security.md` per stack** (moved here from universal scope), per-team architect docs as stub anchors
- Stub-anchor population in canonical persona sources — fills the `<!-- atlas:specializes-in -->`, `<!-- atlas:domain-context -->` and similar markers with team-specific content
- Identifier substitution coordination — runs after Phase 1.5d's substitution layer; Atlas writes the team's `config.json` and triggers the build
- Interactive onboarding flow — asks team about stack, domain, ticket prefix, GitHub org/repo, Linear workspace, etc.

**Why this is multi-PR:**
- Stack detection alone is a substantial subsystem (matrix of package-file × language × framework → rule set)
- Each per-team rule type (code-standards, security, framework-guidelines) is its own generator
- Stub-anchor population requires reading every canonical persona source to enumerate anchors

**Suggested PR breakdown (to be detailed in epic plan):**
- PR-2.1 — Atlas skill scaffold + interactive flow + config writing
- PR-2.2 — Stack detection subsystem
- PR-2.3 — Per-team rule generators (code-standards, security, framework guidelines)
- PR-2.4 — Stub-anchor population mechanism
- PR-2.5 — Atlas runs against PRISM itself as dogfood (PRISM is the first team Atlas onboards)

**Dependencies:** Must follow 1.5c (backports complete so Atlas writes against final personas) and 1.5d (tokenization in place so Atlas's config writes drive substitution).

---

## Phase 2.5 — Theo (architect-doc walker)

**Persona:** Theo (he/him). Methodical, observant, cartographic. Walks the codebase carefully, notices the load-bearing stuff, doesn't rush.

**Goal:** A persona that walks the codebase looking for load-bearing decisions worth documenting as architect docs. Interactive, resumable, iterative.

**Distinct from Atlas because:** Atlas runs once per team install (or on stack change). The walker runs *iteratively* — long-running, resumable, proactive. Atlas does initial setup; walker does ongoing codebase mapping.

**Workflow loop (per the interaction shape):**
1. Scan a directory or module
2. Identify candidate architect-doc topics (load-bearing decisions, surprising patterns, multi-file coupling that should be documented)
3. Present candidates to user with brief context
4. For each candidate: discuss → write architect doc + paired dev doc → OR skip → OR defer
5. Track progress in a state file so the user can pause/resume across sessions
6. Continue walking until codebase coverage is complete OR user stops

**Patterns absorbed:**
- BMAD's micro-file step machine (one file per workflow step, `stepsCompleted` frontmatter for resumability)
- Matt Pocock's deletion test (to identify shallow abstractions worth flagging)
- Matt Pocock's triple-gated ADR criterion (when a candidate warrants an ADR vs an architect doc)

**Output:**
- Architect docs in `.prism/architect/<topic>.md` + paired dev docs in `docs/content/dev/architecture/<topic>.md`
- State file at `.prism/architect-walker-state.json` tracking visited directories, accepted/skipped candidates, deferred items

**Dependencies:** Requires Atlas (Phase 2) so the walker writes per-team architect content shape, not generic placeholders.

---

## Phase 2.6 — Ren (refactor scout)

**Persona:** Ren (he/him). Observant, exploratory, sharp-eyed for shallow abstractions and leaky seams. Different posture from Theo — Theo documents what's load-bearing, Ren spots what's structurally weak.

**Goal:** A persona that scans the codebase for refactor opportunities — shallow-module/leaky-seam patterns, untested interfaces, modules that don't earn their abstraction. Interactive, presents ranked candidates, drops into a grilling loop on the chosen one.

**Distinct from Theo because:** Same codebase-walking *mechanic*, different *intent* and *output*. Theo writes architect docs documenting load-bearing decisions. Ren writes refactor plans proposing structural changes. The two personas compose well — Theo's output identifies "this is intentional and load-bearing"; Ren's output identifies "this looks load-bearing but is actually weak."

**Workflow loop:**
1. Explore phase — walk codebase looking for friction signals (shallow modules, leaky seams, untested interfaces)
2. Apply the deletion test as primary heuristic — "if I deleted this module, where does complexity reappear?"
3. Categorize candidates by strength: `Strong | Worth exploring | Speculative`
4. Present candidates with file paths, problem statement, suggested approach, before/after sketch
5. User picks one
6. Drop into a grilling loop on the chosen candidate — walk the design tree, challenge assumptions, surface alternatives
7. Output: refactor plan at `.prism/plans/refactor-<slug>.md`

**Patterns absorbed:**
- Matt Pocock's deletion test (primary heuristic)
- Matt Pocock's "two adapters = real seam" rule (when to introduce abstraction)
- Matt Pocock's strength badge taxonomy (Strong / Worth exploring / Speculative)
- BMAD's micro-file step machine for the multi-phase walk → present → grill flow
- BMAD's `stepsCompleted` frontmatter for resumability

**Output:**
- Refactor plan at `.prism/plans/refactor-<slug>.md` (NOT an HTML report — keeps PRISM's plan-file-as-source-of-truth convention)
- State file at `.prism/ren-state.json` tracking visited directories, presented candidates, accepted/skipped/deferred items

**Why Ren needs his own persona vs. absorbing into Winston:** Winston is reactive — evaluates proposed approaches. Ren is proactive — goes hunting for refactor candidates. Same domain (architecture), different posture. Cleaner to keep them separate.

**Dependencies:** Requires Atlas (Phase 2). Parallel-safe with Theo (Phase 2.5) — they touch different state files and produce different output types.

---

## Phase 3 — Parker (PRD persona)

**Persona:** Parker (he/him). Product-strategic, asks the hard questions about stakes and scope, distinct from Mira (who works at user-story grain).

**Goal:** A persona that handles PRD-level requirements work — initiative-grained, feature-scoped, multi-ticket. Sits above Mira's user stories.

**One persona, two modes** (validated by BMAD's `bmad-prd` collapsed-modes design — they unified create/update/validate into one skill):

- **Greenfield mode** — BMAD-style. Brain dump → stakes calibration (hobby/internal/launch) → fast path (batch draft with `[ASSUMPTION]` tags) or coaching path (PM-thinking sections built collaboratively) → reviewer rubric → finalize. Produces `.prism/prds/<slug>.md` + `decision-log.md` audit trail.
- **Brownfield mode** — Matt-Pocock-style. Walks existing codebase, synthesizes existing feature/area into a PRD without an interview. Produces `.prism/prds/<slug>.md` from observed code.

**Patterns absorbed:**
- BMAD stakes calibration (one skill, three intensity levels)
- BMAD `[ASSUMPTION]` deferred-decision markers
- BMAD reviewer-rubric gate (subagents dispatched in parallel for rubric review before finalize)
- BMAD resumability via workspace folder binding + frontmatter `status` field

**Output:**
- PRD doc in `.prism/prds/<slug>.md`
- Optional Linear initiative creation (handoff to Nora)
- Optional user-story decomposition (handoff to Mira)

**Dependencies:** Atlas (Phase 2) so the PRD persona's stub anchors get per-team context. Architect-doc walker (Phase 2.5) optional — the brownfield mode can run independently but composes well with the walker's output.

---

## ADR numbering plan

PRISM has shipped through ADR-0034 (PR #3). Backports + new personas add ADRs. To avoid Thrive's collision on ADR-0035 and PRISM's own collision (Thrive's ADR-0033 collides with PRISM's existing ADR-0033), the renumbering map:

| ADR # | Title | Source | Phase |
|---|---|---|---|
| 0035 | Rule loading tiers (three-tier model) | Thrive #1970 (was ADR-0033) | 1.5c.5 |
| 0036 | Security as a distributed rule (pattern only; content via Atlas) | Thrive #2001 (was ADR-0035) | 1.5c.5 or 1.5c.6 |
| 0037 | Cadence-driven personas as a separate axis | Thrive #2003 (was ADR-0035) | 1.5c.6 |
| 0038 | Paired dev doc gates | Thrive #2016 (was ADR-0037) | 1.5c.1 |
| 0039 | `.ai-*` prefix namespace — validates PRISM's `.prism/` choice | Thrive #2017 (was ADR-0038) | 1.5c.1 |
| 0040 | Atlas as the onboarding persona | PRISM new | 2 |
| 0041 | Theo as a separate persona from Atlas (architect-doc walker) | PRISM new | 2.5 |
| 0042 | Ren as a separate persona from Theo (refactor scout) | PRISM new | 2.6 |
| 0043 | Parker as the PRD persona with greenfield + brownfield modes | PRISM new | 3 |

Four new PRISM personas, two pattern adoptions, one Thrive structural validation, plus the renumbering of three colliding Thrive ADRs. Clean.

---

## Persona naming

| Role | Name | Pronouns | Phase |
|---|---|---|---|
| Onboarding | Atlas | _TBD_ | 2 |
| Architect-doc walker | Theo | he/him | 2.5 |
| Refactor scout | Ren | he/him | 2.6 |
| PRD persona | Parker | he/him | 3 |

Refactor scout's pattern-only absorption was reconsidered — Ren has a distinct posture from Winston (proactive vs reactive) and a different output type (refactor plans vs evaluations), so he warrants his own persona. The pattern absorptions in Phase 1.5e still happen — Winston, Eric, and Briar all get the deletion test and two-adapters-seam rule — but they apply the patterns reactively to whatever's in front of them. Ren is the one who goes looking.

---

## Sequencing summary

```
Phase 1.5c (Thrive backports) [multi-PR]
   └─> Phase 1.5d (Tokenization + content cleanup) [single sweep]
        ├─> Phase 1.5e (Pattern absorptions) [small PR]
        └─> Phase 2 (Atlas) [multi-PR]
              ├─> Phase 2.5 (Theo — architect-doc walker)
              ├─> Phase 2.6 (Ren — refactor scout)
              └─> Phase 3 (Parker — PRD persona)
```

Phase 1.5e can land in parallel with Phase 2 — they touch different surfaces.

Phases 2.5, 2.6, and 3 all depend on Atlas but are parallel-safe with each other. They touch different state files (`theo-state.json` / `ren-state.json` / Parker's PRD workspace folder) and produce different output types (architect docs / refactor plans / PRDs). Can run in any order or in parallel once Atlas lands.

---

## Open decisions

All four open decisions resolved by Hunter on 2026-05-22 (gym session). Captured in each affected plan's `## Decisions` and `## History` sections:

- **PR-1.5c.3 (Nora) cherry-pick mechanics** → **rebuild against PRISM's Nora.** Re-author the cycle-view and duplicate-finder modes against PRISM's existing canonical sources rather than rebasing Thrive commits. Per [epic-prism-thrive-backport.md](./epic-prism-thrive-backport.md) § Decisions.
- **PR-1.5c.2 Sasha content absorption** → **PRISM-adapt for language-agnostic framing.** Port the structural framework (ladder, hypothesis count, instrumentation gate, principles); rewrite WordPress/PHP/React examples to language-agnostic framing with `<!-- atlas:example -->` anchors for Atlas to populate. Per ADR-0032. Per [epic-prism-thrive-backport.md](./epic-prism-thrive-backport.md) § Decisions.
- **Atlas dogfood timing** → **PRISM-first.** PR-2.5 runs against PRISM's own repo. Real-consumer dogfood scheduled as a follow-up exercise after PR-2.5 lands clean. Per [epic-prism-atlas.md](./epic-prism-atlas.md) § Decisions.
- **PRD output location** → **local canonical at `.prism/prds/<slug>.md`** with Linear push as optional handoff via PR-3.4 step-08. Matches PRISM's existing local-first convention. Per [epic-prism-parker.md](./epic-prism-parker.md) § Decisions.

No open decisions remain at the roadmap level. Implementation of Phase 1.5c can begin.

---

## History

- 2026-05-22 [main]: Roadmap created. Synthesizes 21-PR Thrive backport set + 3 new persona candidates (Atlas, architect-doc walker, PRD persona) + 7 pattern absorptions from Matt Pocock and BMAD research. Supersedes the older PR-#3-tokenization + PR-#4-content-cleanup sequence in [epic-phase-1-foundation.md](./epic-phase-1-foundation.md) — tokenization and content cleanup move to Phase 1.5d, sequenced after backports.
- 2026-05-22 [main]: Persona naming locked: Theo (he/him, Phase 2.5 architect-doc walker), Ren (he/him, Phase 2.6 refactor scout), Parker (he/him, Phase 3 PRD persona). Ren reinstated as separate persona after initial pattern-only absorption was reconsidered — distinct proactive posture and different output type warrant his own scope. New ADR row 0042 added for Ren; Parker bumped to 0043.
- 2026-05-22 [main]: Seven epic plans drafted via /goal-driven autonomous run with subagent-per-phase fan-out. Files at `.prism/plans/epic-prism-{thrive-backport,tokenization,pattern-absorptions,atlas,theo,ren,parker}.md`. Each plan meets the detail bar per `.prism/rules/implementation-task-detail.md`. Four open decisions flagged and deferred per the /goal contract (Nora cherry-pick, Sasha absorption, Atlas dogfood timing, PRD output location).
- 2026-05-22 [main]: All four open decisions resolved by Hunter: Nora cherry-pick → rebuild against PRISM's Nora; Sasha absorption → PRISM-adapt language-agnostic per ADR-0032; Atlas dogfood timing → PRISM-first; PRD output location → local canonical at `.prism/prds/<slug>.md` with optional Linear handoff. Decisions and History sections updated across the four affected plans. Phase 1.5c implementation can begin.
