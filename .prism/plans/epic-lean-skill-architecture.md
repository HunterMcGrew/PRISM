# Plan: epic-lean-skill-architecture

## Ticket

No Linear (this team doesn't use it). Tracked by branch `hmcgrew/lean-skill-architecture`.

## Goal

Refactor all 18 PRISM skills to a lean "scaffolding + references" model — pin load-bearing voice/lens/router/DoD in the skill body, externalize conditional procedures and reference catalogs behind one-line imperative triggers — and rename the 7 persona-named skills to function-descriptive slash-command IDs.

---

## Design

N/A — no UI. The "design" here is the content-disclosure architecture, captured in `## Decisions` and promoted to ADR-0045.

---

## Implementation Tasks

Sequencing rationale lives in `## Decisions` (Sequencing). Slices ship as independent PRs; the before/after comparison (Slice 5) is the epic's acceptance gate.

### Winston (architecture) — Slice 0: governing standard (do first)

1. **Write ADR-0045** at `.prism/spec/adrs/0045-skill-content-disclosure-model.md`. Capture the PIN / EXTERNALIZE / CATALOG / CUT gate and the one-line-imperative-trigger rule (see `## Decisions` → "Disclosure gate"). Status `accepted`, Date 2026-05-26. Cross-link ADR-0035 and explicitly note the **"level"/"stage" not "tier"** vocabulary boundary. Verify number is still unused (`ls .prism/spec/adrs/ | grep 0045`).
2. **Write `.prism/rules/skill-authoring.md`** — the universal authoring rule downstream skills cite. Contents: the three loading *levels* (frontmatter / body / references), the gate, the always-PIN list (persona+voice, "How X Thinks" lens, anti-pattern guardrails, workflow router, DoD), the trigger-writing requirement, and the deletion-test audit requirement. Add it to the universal-rules set so it loads for skill-editing work. Cross-link ADR-0045.
3. **Resolve the OPEN ship-surface decision** (see `## Decisions`) before Slice 3 starts — it dictates where per-skill externalized content lands.

### Clove (implementation) — Slice 1: shared session-close extraction

**Status:** `done` (2026-05-26). `session-close.md` created; the 13 standard-block skills + iris re-pointed behind a one-line trigger with persona signals/reflex bullets kept inline; parker/ren/theo/atlas left untouched (no shared boilerplate — see Decisions → "Session-close extraction"). Build + 129 tests + `prism:check` green.

4. Create `.prism/references/session-close.md` holding the shared boilerplate currently duplicated across all 18 skills: the "Context reuse across skills" tier-loading paragraph, the "Lessons Check" trigger conditions, and the "Lesson promotion taxonomy." Parameterize so per-skill reflex bullets stay in the skill.
5. In each of the 18 `.ai-skills/skills/*/shared.md`, replace the duplicated block with: (a) a one-line trigger — "Before closing the session, follow `.prism/references/session-close.md`." — and (b) the skill-specific reflex bullets retained inline. Do NOT remove a skill's unique reflex bullets.
6. Run `pnpm prism:build && pnpm prism:test`. Verify generated `.claude/skills/*/SKILL.md` shrank by ~25–35 lines each and all tests pass. This slice is the proof that build + citation mechanics hold end-to-end — ship it before touching anything riskier.

### Clove (implementation) — Slice 2: shared references (folded into Slice 3 — see note)

**Superseded by Slice 3's per-skill structure.** The deep audit showed each skill's catalog externalization is cleanest done *with* that skill's mode externalization in one PR (the natural unit). So per-skill catalogs now live in the Slice 3 per-skill blocks (Task group B), under the `.prism/references/<skill>/` sub-dir convention. The only genuinely cross-skill catalogs — the shared review references (`review-frameworks.md`, `review-justification.md`, `review-doc-class-triage.md`) — are Slice 3 Task group A: created once, consumed by both Eric and Briar. The cross-skill `session-close.md` extraction stays as Slice 1 (or fold it into each skill's PR — Clove's call; either avoids the other's double-touch).

### Clove (implementation) — Slice 3: per-skill refactors

**Status:** ALL 11 skills refactored. `prism-architect` (pilot) + Task group A + `prism-code-review-self` (Briar) + `prism-code-review-pr` (Eric) + `prism-pixel` (Pixel) merged (PRs #56–#58). The remaining 8 (ticket-start, standup-summary, qa-test-plan, debugger, code-dev, documentation, changelog, user-stories) refactored in ONE combined PR — per Hunter's call to consolidate the tail rather than ship 1-PR-per-skill. This slice absorbs the per-skill catalog externalization originally sketched as Slice 2 — each skill is refactored holistically (its catalogs + its modes together), since the deep audit showed that's the natural unit. The only genuinely cross-skill catalog is the shared review references (task group A below); everything else is skill-local.

Each skill replicates the shipped `prism-architect` precedent exactly: pin voice / "How X Thinks" lens / router / DoD; externalize conditional procedures + catalogs to `.prism/references/<skill-id-without-prism>-<topic>.md` behind a `## Heading` + `> _one-line note_` + an imperative trigger naming the exact file and condition. Each skill ends with `pnpm prism:build` (runs tests) + a **cold** before/after invocation smoke check (fresh session — confirm it loads referenced files at the trigger and covers its DoD).

#### Cross-cutting execution rules (verified — apply to every skill)

- **HARD RULE — never move an `atlas:*` anchor into a reference file.** Atlas onboarding substitutes anchors only in skill source (`shared.md`/`claude.md`); references are never scanned. If an externalized section contains an anchor, **split it**: the anchor + its stub prose stays pinned in `shared.md`; only surrounding non-anchor prose moves. Affected: code-dev (`workflow-example-2/3/4`), documentation (`workflow-example`, `-2`), user-stories (`domain-context-user-types`, `-entities`), debugger (`workflow-example`, `-2`). Post-build check: `grep -c "atlas:" shared.md` unchanged before/after.
- **Path convention (sub-dir):** skill-specific refs live at `.prism/references/<skill>/<topic>.md`; shared refs (review-*, session-close) stay at `.prism/references/` top-level. Triggers in `shared.md` link `../../../.prism/references/<skill>/<topic>.md` (canonical). Internal links inside a skill sub-dir reference take the extra hop — `../../rules/`, `../../spec/`, `../../architect/`, `../../templates/`; a top-level shared ref is `../<file>.md`; a sibling in the same sub-dir is `./<file>.md`. The build mirrors `.prism/references/` (sub-dirs included) → `.claude/references/`, so pre-existing `../../references/` 2-dot links are NOT broken — **leave them; no link-depth fixes in this slice.**
- **Never externalize a lens for line count.** Targets are not uniform: judgment-heavy skills stay larger because their lenses PIN. That's the gate working, not a miss.
- **Leave session-close boilerplate inline** ("Context reuse across skills" + "Lessons Check" + promotion taxonomy) — Slice 1's job, not here.
- **Standard per-section shape:** create the reference file(s) from the named source line ranges (re-path internal links) → replace each externalized section body in `shared.md` with heading + `> _note_` + trigger → build → confirm triggers present in generated SKILL.md, references resolve, pinned lenses/anchors intact, report line count.

#### Task group A — shared review references (do first; Eric + Briar both consume)

Eric (code-review-pr) and Briar (code-review-self) carry near-identical review catalogs (Eric's terser). Consolidate to one source each — this kills existing duplication-drift. The wording superset (Briar's fuller version) is reference catalog, not reasoning, so it's a safe consolidation, not a behavior rewrite.

1. Create `.prism/references/review-frameworks.md` — severity classification, code-type review heuristics, two-pass model, the 400-line cliff, self-review compensation techniques. Source: Briar `shared.md` 74–109 ∪ Eric 82–94 (use Briar's fuller wording).
2. Create `.prism/references/review-justification.md` — the abstraction-justification procedure (4 questions + scope note + deletion-test tiebreaker). Source: Briar 256–267 ∪ Eric 96–102/374–387.
3. Create `.prism/references/review-doc-class-triage.md` — verified/diverged/missing source-verification triage. Source: Briar 271–277 ∪ Eric's equivalent. Re-path: `../rules/architect-doc-verification.md`.

#### Task group B — per-skill refactors

Each block lists the reference files to create (with source line ranges) and the skill-specific pins/constraints. Trigger wording follows the architect shape; the agents' exact trigger sentences are reproducible from the section + condition named here.

**Filename mapping:** per-skill blocks name files in flat `<skill>-<topic>.md` shorthand; create them under the sub-dir convention — drop the `<skill>-` prefix and nest under `<skill>/`. E.g. `pixel-frameworks.md` → `.prism/references/pixel/frameworks.md`; `debugger-case-file-state.md` → `.prism/references/debugger/case-file-state.md`. Shared review refs (group A) stay at top-level.

**prism-design (pixel) — 703 → ~300.** Single-pass, mode-router shape.
- `pixel-frameworks.md` ← 136–196 (Nielsen, Johnson, Gestalt, named laws, additional principles).
- `pixel-pattern-vocabulary.md` ← 198–301 (form/states/container/feedback/search/tables/typography/color/motion/micro-interactions/content-first/dark patterns).
- `pixel-mock-spec-template.md` ← 419–495 (mode-2 spec template) + 568–587 (plan `## Design` template as a § Plan Design Section); re-path the `implementation-task-detail.md` link to `../rules/`.
- PIN: all lens sections, convention-audit reflex, deep-audit axes (lens), mode-1 default, interview protocol, HTML-mode detection (tripwire), handoff/ADR-0034 routing, DoD. All 4 atlas anchors are in PIN sections — no split needed.

**prism-ticket-start — 687 → ~400.** Startup is the primary path (PIN); 4 alternate modes externalize.
- `ticket-start-assessment-frameworks.md` ← 104–246 (severity, impact, DoR, INVEST, splitting, complexity, requirements quality, blast radius, dependency detection).
- `ticket-start-create-path.md` ← 402–457 · `ticket-start-mode-cycle-view.md` ← 459–498 · `ticket-start-mode-duplicate-finder.md` ← 500–548 · `ticket-start-sync-ac.md` ← 596–608.
- PIN: How Nora thinks, Ticket Standards, **Startup steps 1–11** (primary path — do NOT externalize), **Shared-state confirmation gate** (lens — fires before any mutating write), Common Issues, `atlas:domain-context`. Detection of create-vs-start intent stays inline in the create-path trigger.

**prism-code-review-pr — 626 → ~395.** Two-mode router over a 5-phase skeleton.
- Uses shared `review-frameworks.md` (group A) ← replaces 82–102.
- `code-review-pr-context-gathering.md` ← batch A/B/C command bodies (163–231) · `code-review-pr-github-writes.md` ← batch D (266–306) + label-apply (517–528) · `code-review-pr-summary-template.md` ← 428–466 · `code-review-pr-labels.md` ← label tables (472–494) · `code-review-pr-gotchas.md` ← in-branch gotchas (552–574).
- Formatting Check (333–346) → fold into existing `worktree-mode.md` § Formatting (worktree-only path).
- PIN: How Eric Thinks, Review Standards, mode-selection gate, **Phase 1–5 skeleton**, two-axis split, Standards/Spec axis checks, missing-spec handling, **three-state label decision gate** (keep inline; move only the label tables), "Eric never approves" invariant, closing.

**prism-standup-summary — 602 → ~295.** 7-phase machine.
- `standup-summary-fetch.md` ← Phase 2 (180–236) · `standup-summary-slack-mcp.md` ← Phases 5+5.5 (339–392) · `standup-summary-phases.md` ← Phases 1,3,4,6,7 + Common Issues.
- ZWSP/bold rendering contract → cite existing `.prism/templates/standup-summary.md`; do not restate.
- PIN: How Lilac Thinks, Default Configuration, the numbered **phase INDEX** as router, DoD. No atlas anchors in file. (Slack-MCP detection stays inline; only the discovery/disambiguation body moves.)

**prism-qa-test-plan — 591 → ~265.** Mode-router (4 modes + shared mechanics).
- `qa-test-plan-shared-mechanics.md` ← 394–453 + non-default behaviors (465–471) + subject-line templates (511–516) · `qa-test-plan-mode-release.md` ← 126–221 · `-mode-sprint.md` ← 223–281 · `-mode-feature.md` ← 282–334 · `-mode-bugfix.md` ← 336–392 · `qa-test-plan-common-issues.md` ← 473–505 · `qa-test-plan-future-phases.md` ← 521–529.
- PIN: How Reese Thinks, **Mode-Detection router** (the spine), Writing Rules (lens digest), Post-Delivery detection + `shipping-flow.md` cite, DoD, `atlas:specializes-in`.

**prism-debugger — 556 → ~360.** 6-phase router.
- `debugger-frameworks.md` ← Framework Knowledge (115–141) + bug checklists (434–453) · `debugger-signal-and-instrument-ladders.md` ← Phase 1 ladder (219–230) + Phase 4 ladder (266–275) · `debugger-instrumentation-hygiene.md` ← 290–307 · `debugger-closeout.md` ← Phase 6 Linear sync (342–358) · `debugger-case-file-state.md` ← case file/`sasha-state.json` (366–430) · `debugger-output-format.md` ← 461–478.
- **HARD PIN — evidence-grading lens (Confirmed/Deduced/Hypothesized):** stays inline across How Sasha Thinks, Phase 3, Phase 5, Phase 6 deliverable 2, and DoD. Externalize the ladder *enumerations* but keep the "climb cheapest-first / stop at first deterministic rung" lens inline. Split-keep `atlas:workflow-example` (Phase 4) and `-2` (What to watch for) inline.

**prism-code-dev — 509 → ~365.** Linear implementation workflow.
- `code-dev-engineering-frameworks.md` ← Framework Knowledge (118–251) — **SPLIT: keep `atlas:workflow-example-2/3/4` inline** · `code-dev-decisions-temporal-scan.md` ← 335–348 (keep "How Clove Thinks #9" lens pinned) · `code-dev-ac-adjustment.md` ← 369–386 · `code-dev-formatting.md` ← 420–434 (**SPLIT: keep `atlas:workflow-example-4` inline**).
- PIN: How Clove Thinks 1–11, implementation anti-patterns, Startup, 9-step Implementation Instructions, Git (already delegates to `shipping-flow.md`), DoD.

**prism-documentation — 500 → ~310.** Numbered startup procedure.
- `documentation-frameworks.md` ← Divio + readability (67–89) · `documentation-startup.md` ← Startup (116–257) **EXCEPT Step 2c (184–193), which stays PINNED verbatim** (run-wide codebase-verification lens) · `documentation-codebase-read.md` ← 261–294 (**SPLIT: keep `atlas:workflow-example`/`-2` inline**) · `documentation-after-writing.md` ← 372–422.
- Output paths (296–323) + Frontmatter (324–338) → replace with a citation to existing `.prism/architect/documentation.md` — **verify that doc + `docs/README.md` cover every category the skill table lists before deleting** (don't drop information).
- PIN: How Eli Thinks, Documentation Standards, Step 2c lens, doc templates (already delegate), DoD, `atlas:specializes-in`/`domain-context`.

**prism-code-review-self — 440 → ~330.** Phase 1–5 batch machine.
- Uses shared `review-frameworks.md`, `review-justification.md`, `review-doc-class-triage.md` (group A) ← replaces 72–109, 254–267, 269–277.
- `review-docs-impact.md` ← 311–321 (Briar-owned; flag if Eric later shares).
- PIN: How Briar Thinks, **Phases 1–5 machine**, What to look for, Accessibility Review, Test Coverage, write-to-plan ordering, Review format, **Clean-Review Closing routing tree**, `atlas:domain-context`.

**prism-changelog — 426 → ~300.** Linear startup + per-format recipes.
- `changelog-frameworks.md` ← Framework Knowledge (93–170) · `changelog-doc-generation.md` ← per-format recipes (292–336) · `changelog-common-issues.md` ← 340–362.
- **Reconcile restated content:** Categorization (249–259) + Change consolidation (261–269) stay PINNED (keyword groups = detection); rewrite their back-references to point at `changelog-frameworks.md`. Do NOT delete the operational steps.
- PIN: How Sage Thinks, Changelog Standards, Startup spine, Commit parsing, Document structure template, Post-Delivery cite.

**prism-user-stories — 411 → ~270.** Operational workflow already lean; the framework catalog is the move.
- `user-stories-frameworks.md` ← Framework Knowledge (105–242) **MINUS the two atlas anchor stubs — SPLIT: re-home `atlas:domain-context-user-types` (216–218) + `atlas:domain-context-entities` (226–228) into the pinned body** under retained Stakeholder Awareness / Domain Modeling stubs.
- PIN: How Mira Thinks (large lens), Startup, Path B interview, **Story format** (template + quality-check gate — do NOT extract to `templates/`; the gate is a lens), After drafting, `atlas:domain-context`.

#### After all skills

4. Run `pnpm prism:test` once across the full set. Confirm every skill's generated SKILL.md carries its triggers, every reference resolves, every `atlas:*` anchor count is unchanged, and no lens was externalized.

#### CUT candidates — needs Hunter/Winston sign-off (NOT baked into Clove tasks)

Deletion-test failures the agents surfaced. These are content removals, not relocations — decide separately:
- **standup-summary** `## Standup Standards` anti-pattern wall (52–98, ~47 lines) — restates pinned lenses + template contract. Strongest cut candidate (~250 vs ~295 lines if cut).
- **code-review-self** `## Formatting Check` (289–307) — duplicates the Phase 4 / batch-D formatting steps. Collapse into Phase 4.
- **code-review-pr** line-1 "Large-PR escape hatch" note + the Prettier/ESLint gotcha partial-dup — minor.

### Clove (implementation) — Slice 4: rename migration

**Status:** `done` (2026-05-27). All 7 persona skills renamed (pixel→design, theo→doc-walker, zoe→surface-audit, atlas→onboarding, parker→prd, iris→retro, ren→refactor-scout) across `.ai-skills/skills/`, `.prism/skills/` step-file dirs, `roles.json`, frontmatter `name` fields, and every live cross-reference (scripts, `.prism/architect/`, `.prism/rules/`, `.prism/references/`, ADRs, `AGENTS.md`, `docs/content/`, and the `templates/install/.prism/` mirror). Build regenerated the 4 platform mirrors and auto-removed the old-named generated dirs. `manifest.json` needed no change (routes only `prism-qa-test-plan`). Persona-name triggers preserved; reference sub-dirs (`references/pixel/` etc.) left as-is — out of the rename scope, which is skill IDs only. Historical `.prism/plans/` left as append-only record (Hunter's call), so the repo-wide grep's only non-plan residual is one intentional `epic-prism-atlas` plan-filename citation in `stack-detect.ts`. `pnpm prism:check` + 129 tests + verify-manifest green.

21. Rename the 7 skill directories in all three locations they appear — `.ai-skills/skills/<old>/`, `.claude/skills/<old>/`, and `.prism/skills/<old>/` (where step files exist):
    - `prism-pixel` → `prism-design`
    - `prism-theo` → `prism-doc-walker`
    - `prism-zoe` → `prism-surface-audit`
    - `prism-atlas` → `prism-onboarding`
    - `prism-parker` → `prism-prd`
    - `prism-iris` → `prism-retro`
    - `prism-ren` → `prism-refactor-scout`
22. Update each renamed skill's `frontmatter.yml` `name` field.
23. Update hardcoded paths in `scripts/ai-skills/verify-manifest-coverage.ts` and any other script referencing the old IDs; update `.prism/architect/manifest.json` if it routes by skill ID.
24. Grep-and-sweep every cross-reference to the 7 old IDs across `.prism/spec/adrs/`, `.prism/rules/`, `.prism/architect/` (esp. `closing-messages.md`), `.claude/rules/context-reuse.md` (the citation list), and sibling skills' handoff sections. **Preserve persona-name trigger phrases in `frontmatter.yml` descriptions** ("invoke whenever the user mentions 'Pixel'") — only the skill ID/slash command changes; personas still announce their names on intro.
25. `grep -rn "prism-pixel\|prism-theo\|prism-zoe\|prism-atlas\|prism-parker\|prism-iris\|prism-ren\b" .` returns no stale hits (mind `prism-ren` vs `prism-refactor-scout` false-positives). Run `pnpm prism:build && pnpm prism:test`.

### Clove + Hunter — Slice 5: before/after acceptance test

26. Define the benchmark workflow(s) in this plan's `## History` before testing. Recommended: (a) a **Winston evaluate→plan** run on a small real change, and (b) a **prism-design** run (biggest catalog externalization) — these exercise both a mode-router and a catalog-heavy skill.
27. **OLD capture:** `git checkout main && pnpm prism:build`, run each benchmark workflow, save the transcript/output.
28. **NEW capture:** `git checkout hmcgrew/lean-skill-architecture && pnpm prism:build`, run the identical workflow, save output.
29. **Quantitative:** record generated `.claude/skills/<id>/SKILL.md` line counts old vs new (`wc -l`). **Qualitative (Hunter judges):** did the new lean version cover every DoD item, hit the same decisions, keep the persona voice/lens, and read as well or better? Confirm no "winged it from training" gaps where a reference failed to load.

---

## Decisions

- **Disclosure gate — the governing rule for which content stays in the body vs moves to references.**
  - **Root cause:** skills grew via iterative patching (each "add a Lessons Check" / "make DoD include X" felt small), flattening the importance hierarchy so critical rules compete with nice-to-haves and get followed less reliably — amplified under Opus 4.7's instruction-hierarchy sensitivity.
  - **Alternatives considered:** (a) uniform ~250-line cap enforced in CI — rejected: optimizes the measurable thing (lines) at the expense of the real thing (adherence); phase-machine vs cross-cutting evidence shows the two don't move together. (b) do nothing — rejected: adherence degrades, and the duplication keeps drifting.
  - **Chosen approach:** sort every section by load-frequency × trigger-determinism into PIN / EXTERNALIZE / CATALOG / CUT. The hard gate: **you may externalize a section only if you can write a one-line imperative trigger naming the exact file and exact condition; if you can't, it's a lens and it stays.** Voice, "How X Thinks" lens, anti-pattern guardrails, workflow router, and DoD always PIN.
  - **Implementation guidance:** references that shape reasoning throughout a run must be in the body (they also risk loading too late to matter); only conditional procedures and model-resident catalogs move. Never externalize a lens to hit a line target.
  - **→ promoted to ADR-0045 + `.prism/rules/skill-authoring.md`** (Slice 0).
- **Use "level"/"stage" for the disclosure model, never "tier."** "Tier 1/2/3" is already owned by ADR-0035 (rule-loading across handoffs); reusing it collides two taxonomies. → promoted to ADR-0045.
- **RESOLVED — skill-specific externalized content lives in `.prism/references/<skill>/` sub-dirs; genuinely shared refs stay at `.prism/references/` top-level.** `.prism/references/` ships to consumers and the build mirrors it (sub-dirs included) into each platform; sub-dirs keep the library navigable at ~30+ files. Chosen over flat-prefixed names and over skill-local `.ai-skills/skills/<id>/references/` payload (whose trigger path is ambiguous from repo root). Trigger links use `../../../.prism/references/<skill>/<topic>.md`; internal links inside a sub-dir reference take an extra `../` (e.g. `../../rules/`). Architect's pilot refs were re-homed `winston-*.md` → `architect/{plan-mode,replan-mode,evaluate-checks}.md` and re-pointed (build + tests green). The separate pre-existing `.prism/skills/` ship-gap (ren/theo/iris/parker step files may not reach fresh consumer installs) is untouched by this epic — file as its own follow-up. → promoted to `skill-authoring.md` (Slice 0).
- **Sequencing: session-close → catalogs → per-skill → rename → test.** Rename is last so it sweeps the already-centralized structure instead of chasing scattered citations through files that Slices 1–3 are still moving. Session-close is first because it's mechanical, touches no decision logic, and validates the build+citation loop cheaply.
- **Naming: only the 7 persona-named skills change ID; the 11 function-named ones are untouched.** Persona-name trigger phrases stay in descriptions — personas announce their names on intro, so name-users lose nothing.
- **Within-file duplication is fixed as part of the owning slice, not deferred.** code-review-pr (Justification framework ×2), changelog (Decision Tree ×2), standup (ZWSP contract ×4), ticket-start (priority-band / estimate-scale ×2). Externalizing to one home is a correctness win, not just a token win.
- **Testing is full-vs-full on main vs branch**, quantitative (generated SKILL.md `wc -l`) plus qualitative (DoD coverage, lens adherence, voice) on a benchmark workflow — Hunter is the judge of qualitative parity.
- **Session-close extraction (Slice 1): only the truly-shared boilerplate moves; persona-specific lesson signals stay inline.**
  - **Root cause:** the four-part close block (context-reuse → Lessons Check → reflex bullets → promotion taxonomy) is only partly shared. The context-reuse paragraph and promotion taxonomy are byte-identical across the 13 standard-block skills, and the Lessons-Check *mechanic* (ask/append framing) is identical — but the "Required if" conditions are persona-tuned (changelog: commit-parsing; standup: Slack-MCP/`gh`; pixel: UX/cognitive-science) and the reflex bullets are persona-specific. The task's "duplicated across all 18 skills" was an overcount: 13 carry the full block, iris a partial one, parker/ren/theo bespoke short prose, atlas none.
  - **Alternatives considered:** genericize the conditions into the shared file so only reflex bullets stay inline — would hit the task's ~25–35-line savings target but erase persona-tuned lesson signal. Rejected (confirmed with Hunter).
  - **Chosen approach:** `.prism/references/session-close.md` holds context-reuse + the lessons mechanic + the promotion taxonomy; each of the 13 standard skills + iris keeps its persona conditions and reflex bullets inline behind a one-line trigger. Preserves all signal. Real savings ~10 lines/skill — below the task's 25–35 estimate because the externalized prose is long *wrapped single lines*, so token/attention savings far exceed the line delta.
  - **Scope:** parker/ren/theo carry bespoke short close prose (not the boilerplate) and atlas has no close block — left untouched per Hunter's call; touching them would be a behavior change, not an extraction. iris's trimmed context-reuse variant was normalized to the canonical version.
  - **Implementation guidance:** Slice 3 per-skill refactors leave this section alone — it is already a trigger + inline signals, satisfying the cross-cutting "leave session-close inline" rule.
  - **→ no promotion needed (Slice-1 execution decision; the durable standard is ADR-0045 + `skill-authoring.md`, already promoted in Slice 0).**

---

## History

- 2026-05-26 [hmcgrew/lean-skill-architecture]: Plan created — lean skill-architecture refactor (disclosure gate, 18-skill externalization) + 7-skill rename. Audit of all over-cap skills complete; see Decisions for the governing gate. Benchmark workflows for Slice 5 TBD before testing.
- 2026-05-26 [hmcgrew/lean-skill-architecture]: Re-sequenced to pilot `prism-architect` (Winston) first as the highest-lens skill — if the gate preserves parity on the riskiest skill, the rest follow. Pilot benchmark (run cold in a fresh session, before vs after the refactor): evaluate-then-plan on adding a `## Risks` section to the branch-plan template. CONTEXT.md glossary filed as GitHub issue #53 for post-epic follow-up.
- 2026-05-26 [hmcgrew/lean-skill-architecture]: Piloted the refactor on `prism-architect` — externalized Plan Mode, Re-plan Mode, Epic Detection, AC/PR sync, Decision Promotion, Scope-fit Check, and Design-Aware Flag to three `.prism/references/winston-*.md` files behind inline triggers; pinned the Cognitive Approach, evaluate axes, Devil's Advocate, A/P/C, and DoD. Generated `SKILL.md` 555→360 lines; build + 129 tests pass. Awaiting Hunter's before/after benchmark comparison.
- 2026-05-26 [hmcgrew/lean-skill-architecture]: Added a **Premise gate** to Winston's evaluate flow (separate behavior change from the lean refactor) — an explicit "does this proposal earn its existence?" fork after the lightweight pass: "no" routes weight to existing homes (Plan 2's strength), "yes" continues and verifies the proposal against reality before prescribing (Plan 1's strength). Makes premise-questioning a reflex instead of path-dependent. Note: this post-dates the pilot benchmark "after" run, so future Winston runs differ from that captured output.
- 2026-05-26 [hmcgrew/lean-skill-architecture]: Fanned out 8 subagents to plan Slice 3 (the 11 remaining skills); audited and merged into per-skill Clove-ready tasks. Verified via `anchor-substitute.ts` that atlas anchors are substituted only in skill-source files — never references — so the keep-anchors-inline rule is now fact, not assumption. Locked reference-home convention to `.prism/references/<skill>/` sub-dirs and re-homed architect's 3 pilot refs to match (build + tests green).
- 2026-05-26 [hmcgrew/lean-skill-architecture]: Slice 0 done — wrote ADR-0045 (Skill Content Disclosure Model) and `.prism/rules/skill-authoring.md` (Tier 2, `paths:` scoped to `.ai-skills/skills/**` + `.prism/references/**`), registered in `manifest.json`. The disclosure gate, always-pin list, atlas-anchor hard rule, sub-dir reference convention, and the wrap-a-lens-in-a-step pattern are now the written standard Slices 1–4 execute against. Build + tests green.
- 2026-05-26 [hmcgrew/lean-skill-architecture]: Slice 1 done — extracted the shared session-close boilerplate (context-reuse + lessons mechanic + promotion taxonomy) to `.prism/references/session-close.md` and pointed the 13 standard-block skills + iris at it behind a one-line trigger, keeping each skill's persona-specific lesson signals and reflex bullets inline. parker/ren/theo/atlas left untouched (no shared boilerplate); build + 129 tests + `prism:check` green, atlas anchor counts unchanged. See Decision: Session-close extraction.
- 2026-05-26 [hmcgrew/lean-skill-architecture]: Briar self-review of PR #54 — 1 Major (new canonical refs/rules/ADR not backported to `templates/install/.prism/`, so fresh consumer installs dangle on the session-close + architect triggers; fails AC install-surface check) and 1 Minor (ADR-0045 names post-rename ID `prism-refactor-scout` pre-Slice-4). Routed to Clove. See Review Issues.
- 2026-05-26 [hmcgrew/lean-skill-architecture]: Clove fixed both Briar findings — backported the 8 dependency-closed artifacts (session-close, architect refs, triple-gated, skill-authoring, lazy-artifacts, ADR-0045) into `templates/install/.prism/` + added the stub-manifest route; corrected ADR-0045's `prism-refactor-scout` forward-ref to `prism-ren` and rebuilt mirrors. All install targets resolve; `prism:check` + 129 tests green.
- 2026-05-26 [hmcgrew/slice3-code-review-self]: Slice 3 — created Task group A shared review refs (`review-frameworks`, `review-justification`, `review-doc-class-triage`) + Briar's `review-docs-impact`, refactored `prism-code-review-self` to cite them behind inline triggers, and backported all 4 to `templates/install/.prism/references/`. Generated SKILL.md 444→391 (`## Formatting Check` left pinned pending CUT sign-off, so above the ~330 estimate). Build + 129 tests + `prism:check` green; atlas anchor count unchanged. Eric flagged + Clove fixed a Minor (dangling `../skills/` header-attribution links in the new refs → plain backtick'd IDs), setting the no-`../skills/`-attribution precedent for later ref-creating PRs. Merged as PR #56.
- 2026-05-26 [hmcgrew/slice3-code-review-pr]: Slice 3 — refactored `prism-code-review-pr` (Eric) to consume the group-A shared refs and externalized its command bodies to 5 sub-dir refs (`code-review-pr/{context-gathering,github-writes,summary-template,labels,gotchas}.md`); folded the worktree-only Formatting Check into `worktree-mode.md` § Formatting. Pinned: How Eric Thinks, two-axis split, Phase skeleton, three-state label gate, missing-spec handling, never-approves. Generated SKILL.md 631→390; atlas anchors 6→6; build + 129 tests + `prism:check` green; install copies byte-identical.
- 2026-05-26 [hmcgrew/slice3-design]: Slice 3 — refactored `prism-pixel` (Pixel) to 3 sub-dir refs (`pixel/{frameworks,pattern-vocabulary,mock-spec-template}.md`, the last also holding the plan `## Design` template); pinned all lens sections, convention/deep-audit axes, mode-1 default, interview protocol, HTML-mode detection, handoff/ADR-0034, and DoD. Generated SKILL.md 706→457; atlas anchors 8→8 unchanged; build + 129 tests + `prism:check` green; 3 refs backported byte-identical to `templates/install/.prism/references/pixel/`.
- 2026-05-26 [hmcgrew/slice3-remaining-skills]: Slice 3 — refactored the final 8 skills in ONE combined PR (per Hunter's call to consolidate): ticket-start (691→418), standup-summary (605→225), qa-test-plan (594→247), debugger (559→376), code-dev (512→359), documentation (503→284), changelog (429→295), user-stories (414→311). 33 new sub-dir refs created + backported byte-identical to `templates/install`; all atlas anchor counts preserved (debugger/code-dev/documentation/user-stories used split-keep for in-section anchors); build + 129 tests + `prism:check` green. Surfaced a pre-existing gap: documentation's output-paths category table + the `docs/content` vs `docs` path mismatch aren't covered by `documentation.md` and `docs/README.md` doesn't exist, so that detail was kept inline (not deleted) — flagged for a follow-up.
- 2026-05-27 [hmcgrew/lean-skill-architecture]: Slice 4 done — renamed the 7 persona skills (pixel→design, theo→doc-walker, zoe→surface-audit, atlas→onboarding, parker→prd, iris→retro, ren→refactor-scout) across source dirs, `.prism/skills/` step files, `roles.json`, frontmatter `name`, scripts (`bootstrap`/`anchor-substitute`/`verify-manifest`), and every live cross-ref in architect/rules/references/ADRs/AGENTS/docs + the `templates/install` mirror; the build regenerated all 4 platform mirrors and removed the old-named generated dirs. Persona-name triggers preserved, reference sub-dirs left out of scope, and historical `.prism/plans/` left as append-only record — so the only non-plan grep residual is one intentional `epic-prism-atlas` plan-filename citation in `stack-detect.ts`. `pnpm prism:check` + 129 tests + verify-manifest green.

---

## Acceptance Criteria

### Behavioral

- [ ] Given the refactored skills on the branch, When a user runs the benchmark workflow, Then every Definition-of-Done item the old skill enforced is still enforced and the persona's voice and lens are intact.
- [ ] Given any refactored skill, When it is invoked, Then it loads its pinned body and reads each referenced file at the point its inline trigger fires — with no behavior derived from training instead of the (now externalized) content.
- [ ] Given the before/after comparison, When Hunter runs the identical workflow on `main` and on the branch, Then he can confirm adherence/quality parity with no regression.

### Non-behavioral

- [ ] Every externalized section has a one-line imperative trigger in the body naming the exact file and condition.
- [ ] No section classified as voice / lens / workflow-router / DoD was externalized.
- [ ] `pnpm prism:build` and `pnpm prism:test` pass on the branch.
- [ ] Every referenced file path resolves — no dangling citations — verified against the shipped `templates/install/.prism/` surface, not just the dogfood repo.
- [ ] All `<!-- atlas:* -->` anchors preserved (grep count unchanged before/after).
- [x] The 7 renamed skills: all cross-references updated, persona-name triggers preserved, no orphaned old IDs in a repo-wide grep (Slice 4 — only intentional residuals remain: historical `.prism/plans/` and one `epic-prism-atlas` plan-filename citation in `stack-detect.ts`).
- [ ] ADR-0045 and `.prism/rules/skill-authoring.md` authored; both use "level/stage," never "tier."
- [ ] Each previously-over-cap skill's generated `SKILL.md` lands at or under ~250 pinned lines (target, not a hard gate — a justified larger pin is acceptable if it's all lens).

### AC Adjustments

### AC Sync Log

| Date | Agent | Action | Plan | Linear |
| ---- | ----- | ------ | ---- | ------ |
| 2026-05-26 | Winston | Generated AC | updated | N/A (no Linear) |

---

## Review Issues

### New canonical references/rules/ADR not shipped to the install template

- **Severity:** `major`
- **Status:** `fixed`
- **File:** `templates/install/.prism/` (consumer install seed, hand-maintained — no build step populates it)
- **Problem:** Slice 1's `.prism/references/session-close.md`, the pilot's `.prism/references/architect/{plan-mode,replan-mode,evaluate-checks}.md`, Slice 0's `.prism/rules/skill-authoring.md`, and ADR-0045 exist in canonical (and mirror to `.claude/.codex/.cursor`) but are absent from `templates/install/.prism/`. A fresh consumer install seeds `.prism/` from that surface, so the 14 skills' session-close trigger (and Winston's externalized-mode triggers) would point at files not on the consumer's disk — the agent wings the procedure from training. Fails the non-behavioral AC "every referenced file path resolves … against the shipped `templates/install/.prism/` surface, not just the dogfood repo."
- **Suggested fix:** Backport the new canonical artifacts into `templates/install/.prism/` (byte-identical copies), then re-verify each trigger target resolves under `templates/install/`.
- **Fixed in:** backported `references/session-close.md`, `references/architect/{plan-mode,replan-mode,evaluate-checks}.md`, `references/triple-gated-adr-criterion.md`, `rules/skill-authoring.md`, `rules/lazy-artifacts.md`, `spec/adrs/0045-…md` byte-identically; added `.prism/rules/skill-authoring.md` → `spec-editing.md` to `manifest.stub.json`. `triple-gated-adr-criterion.md` and `lazy-artifacts.md` were pulled in as link dependencies of shipped files (plan-mode and skill-authoring), so the shipped files are self-consistent; any other pre-existing install lag (e.g. rule→skill nav links) stays a separate backport chore. All install-side targets resolve; `prism:check` + 129 tests green.

### ADR-0045 names a post-rename skill ID before the rename ships

- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `.prism/spec/adrs/0045-skill-content-disclosure-model.md:20` (+ 3 platform mirrors)
- **Problem:** Line 20 names a phase-machine persona as `prism-refactor-scout` — a post-Slice-4 rename ID. The skill dir doesn't exist until the rename slice lands (still `prism-ren`), so it reads as a dangling ID in durable agent context meanwhile.
- **Suggested fix:** Use the current ID `prism-ren` now; Slice 4's old→new grep-sweep will flip it to `prism-refactor-scout` along with every other reference, keeping the repo internally consistent at each slice. Rebuild to refresh the 3 mirrors.
- **Fixed in:** ADR-0045 line 20 now reads `prism-ren`/`prism-theo`/`prism-iris`/`prism-parker` (current IDs); rebuilt to refresh the 3 platform mirrors. 0 `prism-refactor-scout` hits remain in any ADR surface.

---

## PR Readiness

Per-slice — each slice is its own PR.

- [x] No critical or major issues — Major (install-template backport) + Minor (ADR-0045 forward-ref) both `fixed`; see Review Issues
- [x] Build passes — last run: 2026-05-26 — Slice 1: `pnpm prism:build` + `pnpm prism:test` (129 pass) + `pnpm prism:check` (no drift)
- [x] Every externalized section has a deterministic inline trigger — verified (session-close + architect triggers name file + condition)
- [x] No lens/voice/router/DoD externalized — verified (session-close is procedure/catalog; conditions are signals, not lens; architect lenses pinned)
- [x] PR description up to date — PR #54 body written
- [x] Lasting decisions promoted (ADR-0045 + skill-authoring.md) — shipped in Slice 0
- [x] Referenced paths resolve on the shipped `templates/install/.prism/` surface — backported; all session-close + architect trigger/link targets resolve

**Last updated:** 2026-05-26 (Briar self-review of PR #56 — Slice 3 Briar + Task group A; clean, no issues)

### PR #56 (Slice 3 — prism-code-review-self + shared review refs)

- [x] No critical or major issues — clean sweep
- [x] No voice/lens/router/DoD externalized — only catalogs/procedures moved; How Briar Thinks #4/#6, Phases 1–5, Review format, Clean-Review Closing all pinned
- [x] Every externalized section has a one-line imperative trigger naming exact file + condition — all 4 verified in generated SKILL.md
- [x] No `atlas:*` anchor moved into a reference — anchor count 8/8 unchanged; refs contain zero anchors
- [x] Every referenced path resolves on BOTH dogfood `.prism/` and shipped `templates/install/.prism/` — trigger targets + internal ref links (`../rules/`, `../architect/`) verified on all 5 surfaces
- [x] Shared refs are genuine Briar∪Eric supersets — Briar's fuller wording used; deletion-test, blast-radius, all 4 compensation techniques, 400-line cliff present; no content lost
- [x] 4 refs byte-identical across `.prism`/`.claude`/`.codex`/`.cursor`/`templates/install` — md5 match
- [x] Build + tests pass — `pnpm prism:check`: 129/129 tests pass, no drift
- [x] Generated SKILL.md 444→391 lines

### Slice 3 COMPLETE — all 11 skills merged (PRs #56, #57, #58, #59)

- [x] All 11 skills refactored to scaffolding+references and merged to `main` (e99e0b1). Generated SKILL.md sizes: architect 361, code-review-self 391, code-review-pr 390, pixel 457, ticket-start 418, standup-summary 225, qa-test-plan 247, debugger 376, code-dev 359, documentation 284, changelog 295, user-stories 311.
- [x] Both review gates passed on every PR (Briar self-review → Eric PR review). Only finding across the whole slice was one Minor on #56 (dangling `../skills/` attribution links) — fixed, and the no-`../skills/` precedent held for all later refs.
- [x] Full-set `pnpm prism:check` green on `main`; no `<!-- atlas: -->` anchor in any reference; 11 ref sub-dirs present on both dogfood and `templates/install/.prism/` surfaces; all Slice-3-authored reference citations resolve on both surfaces.
- [ ] **Pre-existing install-surface gaps (NOT introduced by Slice 3 — separate backport follow-up):** (a) `closing-messages.md` is absent from `templates/install/.prism/architect/`, so every skill's `## Next persona` trigger dangles on a fresh install; (b) `prism-documentation` cites `dev-block-doc-template.md`/`user-block-doc-template.md` and `prism-pixel` cites `frontend-blocks.md`/`frontend-components.md` — flat-namespace refs that predate Slice 3 and don't exist on either surface; (c) documentation's output-paths category table + the `docs/content`-vs-`docs` path mismatch aren't covered by `documentation.md` and `docs/README.md` is absent. All pre-existing; the epic defers pre-existing install lag to a dedicated backport chore.
- [ ] **CUT candidates still pending Hunter/Winston sign-off (NOT done in Slice 3):** standup `## Standup Standards` anti-pattern wall, code-review-self `## Formatting Check` (left pinned on #56), code-review-pr line-1 large-PR note. Decide separately.

**Last updated:** 2026-05-26 (Slice 3 complete — all 11 skills merged via PRs #56–#59)
