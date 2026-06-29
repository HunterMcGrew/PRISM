# Plan: epic-floor-revert

## Ticket

To be filed — GitHub epic on `HunterMcGrew/PRISM`. Reverts the enforcement-floor epic ([#289](https://github.com/HunterMcGrew/PRISM/issues/289)) while preserving the Phase 6 ceiling persona rewrites ([#296](https://github.com/HunterMcGrew/PRISM/issues/296)).

## Goal

Remove the runtime enforcement floor (hooks, gates, ownership-guard, evidence ledger, build-side hook emission, and the gate-tied sections injected into every skill body) and return PRISM to its guidance-only model — because the `Stop`/`SubagentStop` gate sits directly on Sol's report-back channel and degrades orchestration. Keep the Phase 6 procedural-prose persona rewrites.

---

## Decisions

- **Strategy is surgical forward removal — NOT `git revert`, NOT snapshot-and-restore.**
  - **Root cause:** the ceiling rewrites were *authored with the floor baked in* — they were co-designed ("the ceiling is co-equal with the floor," epic plan). Verified: `prism-debugger/shared.md` carries the same 6 floor references at its Phase 6 commit (`1bb36ac`) as at current HEAD. Keep-content (procedural prose) and revert-content (gate refs) live in the *same commit, same files, interwoven* — there is no clean commit anywhere in history. The only floor-free state is the pre-Phase-6 baseline, which is the *old* prose the rewrites replaced.
  - **Alternatives considered:**
    - `git revert` of the ~15 floor squash commits — rejected: conflicts across skill files, and `build.ts` hook emission is woven in, not a clean append; risks clobbering the kept rewrites.
    - **Snapshot current skill files → full revert → restore them** (the obvious shortcut) — rejected: current files carry the floor sections, so restoring them re-introduces dangling gate references pointing at deleted hooks. Moves the surgical work after the revert instead of avoiding it.
    - **Checkout skill files from their Phase 6 commit** (the smarter snapshot) — rejected: the Phase 6 commit *already* contains the floor refs (proven above). No git operation separates keep from revert; only content editing does.
  - **Chosen approach:** forward removal, file by file. Confirmed tractable — the floor refs cluster into repeating block-shapes rather than weaving through prose (next Decision). Verified by a tree-wide reference sweep (per `code-standards.md` § Removal and rename completeness) and a clean `pnpm prism:build`.
  - → no promotion needed (reversal tactic specific to this epic).

- **The surgical pass is mostly removing 2–3 repeating block-types per skill, not a deep reweave.** Confirmed on `prism-debugger`, the floor appears as the same shapes across skills: (1) the `echo "<persona>" > .prism/active-persona` startup block; (2) the `## Definition of Done` section (`DoD = gates.json#<persona>`); (3) the "Final act before stopping: write `report.json`…" paragraph; (4) a few inline parentheticals referencing `report.json`/the gate. Items 1–3 are clean section deletes; item 4 is a light inline edit (the sentence's ceiling meaning survives — drop the floor clause). Replace the `## Definition of Done` section with a lean prose DoD checklist (restored from the pre-Phase-6 version of that skill, or freshly written) rather than deleting it, so each skill keeps a DoD. Because the shapes repeat, establish the exact pattern on one skill (proof-of-pattern), then apply across the rest with a per-file grep verifying zero floor refs remain. Clove and Sol need individual care (more refs; Sol's `report-back.md` carries the routing contract).
  - → no promotion needed (execution tactic).

- **No hooks survive.** The `.claude/hooks/` directory was created by the floor (Phase 1, [#298](https://github.com/HunterMcGrew/PRISM/issues/298)) — nothing predates it. All three hooks (`run-gates`, `ownership-guard`, `evidence-ledger`) are floor machinery. Reverting the floor empties the `settings.json` hooks block entirely. If a lightweight `ownership-guard`-only safety is wanted later (write-lane protection without verdict ratification), that is a separate, smaller opt-in — not this revert.
  - → no promotion needed (consequence of the revert).

- **Floor plans are kept, not deleted.** `epic-prism-enforcement-layer.md`, `issue-305-floor-canonical-backdoor.md`, and `prism-windows-gate-loop.md` stay in `.prism/plans/` per `branch-plan.md` (plans are never deleted, ADR-0047). Each gets a `> Reverted: <date>` marker and a History entry pointing to this plan.
  - → no promotion needed.

- **ADR-0067 is superseded, not deleted.** Per ADR convention, add a superseding note (status → Superseded by this revert) rather than removing the file. The reasoning stays as historical record of why the floor was tried and why it was reverted.
  - → no promotion needed.

- **Keep the `config.json` `commands` map.** The `{{commands.*}}` token map (typecheck/test/lint/build) is harmless and reusable independent of the gates — `verification-commands.md` renders the same data. Removing it widens blast radius for no benefit. Strip only the gate-specific references, not the command tokens.
  - → no promotion needed.

- **Blessed removal pattern (proof set on `prism-debugger`).** Four block-shapes, each with a fixed handling rule. Apply to every skill's `shared.md` (the build regenerates the platform `.claude`/`.codex`/`.cursor` copies — edit canonical source only).
  - **Shape 1 — `active-persona` startup write → clean delete.** The `echo "<persona>" > .prism/active-persona` block plus its lead-in ("…so the ownership-guard hook can resolve identity…"). Delete the block and lead-in; keep the rest of the startup step (detect branch, resolve repo root).
  - **Shape 2 — `## Definition of Done` gate pointer → replace, don't delete.** Remove the `DoD = gates.json#<persona>` paragraph and the "Final act before stopping: write `report.json` to `.prism/evidence/<runKey>/`…" paragraph. Replace with one lean prose sentence naming the real deliverable (debugger: "the plan is the deliverable; the `## Debugged Issues` entry is the final act; when dispatched by Sol, return the verdict alongside the plan write"). Keep the section header, any existing prose preamble, and any existing `- [ ]` checklist — those are already a lean DoD.
  - **Shape 3 — inline `report.json` / "done-class report" parentheticals → light inline edit.** Drop the floor clause, keep the sentence's meaning. E.g. "emitting the done-class report (writing `report.json` and declaring complete)" → "declaring the investigation complete and reporting back".
  - **Shape 4 — "the floor's verdicts" / "floor's evidence gate" framing → light inline edit.** Typed escapes (`needs-replan` / `needs-human` / `blocked` / `found-bug` / `found-followup-work`) stay as prose guidance — they degrade gracefully without the gate. Only reword the phrases that name the floor as the runtime machinery ("Escalate only by the floor's verdicts (…)" → "Escalate only by emitting a typed verdict (…)").
  - **Keep, never strip:** persona voice, the cognitive lens, anti-patterns, the workflow/phase frame, orientation batteries, the `## When dispatched by Sol` section (Sol still routes on the returned verdict per `report-back.md` — that contract survives the floor).
  - **Per-file verification:** the machinery-only sweep must return no hits — `grep -niE "gates\.json|report\.json|active-persona|evidence/|run-gates|SubagentStop|may_write|deliverable\.json|ownership-guard|enforcement|floor|report-contract|done-class|verdict-enum"`. The literal `## Definition of Done` heading is intentionally retained (Shape 2), so it's the one expected hit on a pattern that *includes* "Definition of Done"; the machinery-only sweep above excludes it and must be empty.
  - **Build note:** `pnpm prism:build` needs `node_modules` in the worktree (`pnpm install` first — fresh worktrees lack it). On Windows the suite carries 4 pre-existing path-handling failures (3 `resolveRef`, 1 "no drift" — doubled-drive-letter / `%20` / forward-slash bugs); unrelated to floor removal. Green = those 4 and only those 4.
  - → no promotion needed (execution pattern for this epic; codified here for the scale-out).

- **Pattern refinements from Winston's review of the proof (apply before scaling to Class A + Sol).** The four shapes are correct and scale as-is for Class B/C skills. The debugger (Class B) could not surface three things the harder files need:
  - **Shape 2 has a Class A variant — preserve real criteria, don't delete them.** Class A bodies (`prism-code-dev`/Clove, `prism-changelog`/Sage, `prism-onboarding`/Atlas) carry a richer DoD: beyond the gate pointer and `report.json` paragraph, a `The gate enforces:` list with *real* criteria (`types`/`lint`/`tests`, `config.json` validates) and a `gate cannot verify (structurally trusted)` list. The real criteria are the persona's genuine DoD — they were merely *enforced* by the gate. Fold them back into a prose `- [ ]` checklist ("types pass, lint passes, tests pass before stopping"); strip only the gate-machinery framing. Deleting the `The gate enforces:` block wholesale would strip Clove's actual DoD. Demote from gate-enforced to self-verified prose, don't remove.
  - **Verification sweep is insufficient for Class A — read, don't just grep.** The machinery sweep misses Class A framing: add `The gate enforces|gate cannot verify|structurally trusted|Ownership: writes only|gate ratifies` to the sweep. Even then, the criteria-preservation judgment in the Shape-2 Class A variant cannot be grepped — the scaling agent must *read* each Class A `## Definition of Done` section, not rely on the sweep alone.
  - **Sol needs its own task — the routing contract is contaminated, and it is not a body shape.** The pattern's "keep `## When dispatched by Sol`" is correct, but the contract that section points to (`report-back.md`, location to confirm — not under `.ai-skills/skills/prism-conductor/` in the proof's `find`) itself carries floor language (`needs-stronger-model` gate-forced verdict, ratification/override). Restoring Sol's pre-floor routing is plan task 4, separate from the four body shapes. Do not assume Sol is covered by the shapes.
  - → no promotion needed (review refinement to the execution pattern; consumed at scale-out).

---

## Implementation Tasks

### Clove (implementation)

Sequence matters: delete runtime + build emission first (so the build stops expecting hooks), then clean skill bodies, then docs/ADR, then verify.

**1. Delete the runtime hooks (clean deletes).**
   - `.claude/hooks/` — remove `run-gates.mjs`, `ownership-guard.mjs`, `evidence-ledger.mjs`, `gates.json`, `lib/`, `__smoke__/`.
   - `.ai-skills/hooks/` (canonical source) — remove `run-gates.mjs`, `ownership-guard.mjs`, `evidence-ledger.mjs`, `gates.json`, `settings.json`, `lib/resolve-persona.mjs`, `__smoke__/` (`fleet-keying.mjs`, `run-all.mjs`).
   - `.claude/settings.json` — remove the entire `hooks` block (`PreToolUse`, `PostToolUse`, `Stop`, `SubagentStop`). Leave the rest of settings intact.

**2. Remove build-side hook emission (`scripts/ai-skills/build.ts`).**
   - Delete `emitHooks`, `assertHookEmitDoesNotWeaken`, the #305 canonical-backdoor guards, and the canonical→runtime hook-copy logic (around lines 116–821).
   - Remove the call sites that invoke them in the build flow.
   - `scripts/ai-skills/bom-guard.test.ts` — remove the `run-gates.mjs` / `gates.json` BOM test cases (lines ~67–103).
   - Verify `pnpm prism:build` runs clean with no hook emission.

**3. Strip gate-tied sections from all skill bodies (~every `.ai-skills/skills/*/`).**
   This is the largest and most delicate task — do it per-file, not as a blind sweep. For each skill's `shared.md` (and platform `.md` files if they carry it):
   - Remove the `## Definition of Done` content that references `gates.json#<persona>`, the `report.json` / `plan-updated.json` "final act" writes to `.prism/evidence/<runKey>/`, and the `report-contract.md` pointer.
   - Remove `active-persona` startup writes (`echo "<persona>" > .prism/active-persona`).
   - Remove ownership-matrix references (`may_write` / `may_not_run` framing tied to the guard).
   - Remove the typed report-back verdict-enum dispatch language where it exists only to feed the gate.
   - **Keep** the Phase 6 procedural prose: named procedures, orientation batteries, the persona voice/personality, and the typed escapes *as guidance* (they degrade gracefully to prose Sol/human can act on).
   - Highest-care files: `prism-code-dev` (Clove) and `prism-conductor` (Sol) — most floor-entangled.

**4. Restore Sol's pre-floor report-back / dispatch.**
   - `.ai-skills/skills/prism-conductor/lib/report-back.md` — remove gate-ratification, `needs-stronger-model` gate-forced verdict, and `report.json`-as-gate-input language. Sol still routes on the persona's returned verdict; it just isn't gate-intercepted.
   - `shared.md` / `claude.md` — remove `SubagentStop`-dependency framing and gate-tiering language. The Workflow `schema` remains Sol's verdict shape.

**5. Remove floor docs + supersede ADR.**
   - Delete `.prism/references/enforcement/` (`gates.json`, `report-contract.md`).
   - Delete the canonical enforcement-floor reference doc added in [#353](https://github.com/HunterMcGrew/PRISM/issues/353).
   - Remove the "floor pointer" additions from core/persona/distribution docs ([#354](https://github.com/HunterMcGrew/PRISM/issues/354)–[#356](https://github.com/HunterMcGrew/PRISM/issues/356)) and README floor mentions.
   - `.prism/spec/adrs/_toolkit/0067-*.md` — mark `Status: Superseded` with a one-line reason and a link to this plan. Do not delete.

**6. Clean rules + state.**
   - `.prism/rules/verification-commands.md` — remove floor references; keep the command documentation itself.
   - Delete `.prism/evidence/` (runtime artifacts).
   - Add `> Reverted: <date>` markers + History entries to the three floor plans.

**7. Tree-wide completeness sweep + verification.**
   - Grep the whole tree for dangling references: `gates.json`, `run-gates`, `ownership-guard`, `evidence-ledger`, `report.json`, `active-persona`, `enforcement-floor`, `ADR-0067`, `SubagentStop`, `needs-stronger-model`, `{{commands` (the last only to confirm remaining uses are the kept config map).
   - `pnpm prism:build` green; discovery/literal/path tests green; BOM-guard test green.
   - Sol dry-run: dispatch one lane, confirm no gate interception and a clean report-back.

---

## Acceptance Criteria

### Behavioral
- [x] Given a persona finishes a task, When it stops, Then no hook intercepts, blocks, force-continues, or overrides its result. (Structural: `.claude/settings.json` is `{}`; no hook files exist in `.claude/hooks/`, `.ai-skills/hooks/`, or `templates/install/.claude/hooks/`.)
- [x] Given Sol dispatches a persona, When the persona returns, Then Sol routes on the returned verdict with no gate in the channel. (`report-back.md` de-floored: gate-ratification paragraph removed; Sol routes on the returned verdict.)
- [x] Given the Phase 6 persona rewrites, When a persona loads, Then its procedural prose and voice are intact (rewrites preserved). (Only floor sections/clauses removed; voice, phases, lenses, typed escapes kept.)

### Non-behavioral
- [x] `pnpm prism:build` passes and emits no hooks. (416/420 — the 4 fails are the pre-existing Windows path bugs; `emitHooks` removed in task 2.)
- [x] No dangling references to floor concepts remain in the tree (sweep clean). (Live guidance surface clean; floor refs remain only in historical plans, `lessons.md`, and the superseded ADR-0067 + its README index — accurate-for-their-time records.)
- [x] ADR-0067 marked Superseded; the three floor plans marked Reverted and retained.

---

## History

- 2026-06-28 [claude/festive-cori-cfe87a]: Plan created. Winston diagnosed the `Stop`/`SubagentStop` gate as degrading Sol's report-back channel; strategy is surgical forward removal. Hooks answer: none survive.
- 2026-06-28 [claude/festive-cori-cfe87a]: Evaluated snapshot-and-restore and Phase-6-commit-checkout as shortcuts; both rejected — the ceiling rewrites were authored floor-entangled (debugger Phase 6 commit carries the same 6 floor refs as HEAD), so no clean commit exists. Found the floor clusters into repeating removable block-shapes, so the surgical pass is proof-of-pattern + repeat, not a deep reweave.
- 2026-06-29 [claude/stupefied-liskov-b00735]: Proof-of-pattern set on `prism-debugger/shared.md` — stripped all floor machinery via the four block-shapes (see Decision "Blessed removal pattern"); replaced the DoD gate pointer with a lean prose DoD, kept typed escapes as prose. Build regenerated all 4 platform copies clean; machinery sweep empty; prism:test green except the 4 pre-existing Windows path failures. Stopped for user review before scaling to other skills.
- 2026-06-29 [claude/stupefied-liskov-b00735]: Task 3 — stripped floor refs from 28 skill bodies via the blessed pattern (Clove + 2 utility skills done directly; the 25 standard personas fanned out to 5 subagents, all verified clean and spot-checked). Build regenerated all platform copies; only `prism-conductor` source remains dirty (deferred to task 4 for individual care — ~71 refs across 8 files incl. the `report-back.md` routing contract). prism:build 416/420 (4 pre-existing Windows path fails).
- 2026-06-29 [claude/stupefied-liskov-b00735]: Tasks 1–2 — removed the enforcement runtime and build emission. Deleted `.claude/hooks/`, `.ai-skills/hooks/`, `templates/install/.claude/hooks/`; emptied both `settings.json` to `{}` (live edit user-authorized — auto-mode flagged it as self-modification). Stripped `emitHooks`/`assertHookEmitDoesNotWeaken`/`WHOLESALE_GRANTS` + call site + guard plumbing from `build.ts`; deleted `emit-hooks.test.ts`; repointed `bom-guard` `.mjs`/`.json` fixtures off hook paths (coverage kept); removed two hook-specific `literal-guard` tests. check-types green; prism:build 416/420 pass (4 pre-existing Windows path fails). Remaining: task 4 (Sol channel), task 3 (27 skill bodies), tasks 5–6 (docs/ADR/rules), task 7 (sweep).
- 2026-06-29 [claude/stupefied-liskov-b00735]: Winston reviewed the proof — verdict Proceed with changes. Diff is clean (all 4 shapes correct, machinery sweep clean bar the intentional header). Stress-test against Clove (Class A) surfaced 3 refinements now recorded in Decisions: Shape-2 Class A variant (preserve real types/lint/tests criteria as prose, don't delete), sweep insufficient for Class A (read the DoD section), and Sol's `report-back.md` routing contract is contaminated and needs its own task (task 4).
- 2026-06-29 [claude/stupefied-liskov-b00735]: Task 4 — stripped floor from Sol (prism-conductor). Removed the gate-ratification paragraph plus the `needs-stronger-model` gate-forced verdict (enum + routing table + step-05 route + goal-state enum) from the report-back routing contract, and the active-persona startup write / `the floor's verdicts` / `gate-ratified` framing from shared.md. Kept Sol's human-ratification gates, gate dispositions, and the strike-2→model-axis escalation (Sol's own, not gate-driven); the real machinery sweep was 24 hits across 9 files, not the handoff's ~71 (broad "gate"/"ratif" over-count). Build regenerated all platform copies clean; conductor machinery sweep empty; prism:build 416/420 (4 pre-existing Windows path fails).
- 2026-06-29 [claude/stupefied-liskov-b00735]: Tasks 5–7 — docs/ADR/rules/state cleanup + verification. Deleted `.prism/references/enforcement/`, the architect + dev `enforcement-floor.md` docs, and `.prism/evidence/`; superseded ADR-0067 (+ its README index row); stripped floor refs from `verification-commands.md`/`config.schema.json`/`seed-curation.json`/`manifest.json`/`.gitignore` (kept the `{{commands.*}}` map); removed `## Enforcement floor` sections + scattered mentions across 13 `docs/` files (docs sweep delegated to a subagent, verified clean); marked the 3 floor plans Reverted with History entries. Tree-wide sweep: live guidance surface clean (floor refs remain only in historical plans/lessons + the superseded ADR); `pnpm prism:build` 416/420 (4 pre-existing Windows path fails); no-gate-interception confirmed structurally (settings `{}`, zero hook files). All 6 AC ticked.
- 2026-06-29 [claude/stupefied-liskov-b00735]: Post-revert cleanup — pruned floor-specific lessons from `.prism/lessons.md` (5 deleted, 4 reworded to keep non-floor value; commit `adde52e`), closed the 8 open floor-byproduct GitHub items (PRs #369/#368, issues #370/#367/#366/#365/#363/#362) with revert-linking comments, and deleted the 2 obsolete floor branches. Assessed docs for residual Eli work — none needed (concept sweep clean; narrative docs coherent; remaining "gate"/"enforce" language is Sol's human gates + build/publish guards).
- 2026-06-29 [claude/stupefied-liskov-b00735]: Briar self-review — zero critical/major; build holds at 416/420 (no new fails). Two Minors found: an orphan `literal-allowlist.json` entry for deleted hook scripts (falsifies AC #114's "live surface clean" claim) and `prism-295` missing the `> Reverted` marker its sibling floor plans carry. See `## Review Issues`.
- 2026-06-29 [claude/stupefied-liskov-b00735]: Clove fixed both Briar Minors — removed the orphan `.claude/hooks` allowlist entry (canonical-only) and added the `> Reverted` marker + History line to `prism-295`. `pnpm prism:build` 416/420 (no new fails); AC #114 ("live guidance surface clean") now genuinely holds.
- 2026-06-29 [claude/stupefied-liskov-b00735]: Review-loop gauntlet complete (4 passes) — Briar self-review (2 Minors → fixed in `314fca8`) → Briar re-review clean → Eric PR review clean. Eric's independent live-surface orphan sweep, `build.ts` symbol-removal check, `prism:check-types`, and AC-vs-actual-state checks all passed; labels `effort:deep`/`confidence:high`. PR #371 ready for human review, stays draft.

---

## Review Issues

### Orphan literal-allowlist entry for deleted floor hook scripts

- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `.ai-skills/definitions/literal-allowlist.json:264`
- **Problem:** The entry `{ "path": ".claude/hooks", "reason": "hand-authored hook scripts … ${STRIKE_CAP} … ${runKey}" }` allowlists floor hook scripts the revert deleted (`.claude/hooks/` confirmed gone). The file sat outside the diff, so the removal-completeness sweep missed it — falsifying AC #114's "live guidance surface clean" claim, and leaving a latent footgun (a future unrelated `.claude/hooks` dir would be silently exempted from the literal-guard).
- **Suggested fix:** Remove the `.claude/hooks` entry from canonical `literal-allowlist.json` (and any platform copies); re-run `pnpm prism:build` to confirm the literal-guard stays green.
- **Fixed in:** Removed the `.claude/hooks` entry (canonical-only — no platform copies exist); JSON re-validated, `pnpm prism:build` 416/420 with no new fails, literal-guard green. AC #114 now holds.

### prism-295 floor plan missing Reverted marker

- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `.prism/plans/prism-295.md:1`
- **Problem:** prism-295 (Goal: "Author Class B `gates.json` ownership and gate entries") is a floor-implementation plan but lacks the `> Reverted` marker its three sibling floor plans carry, so a cold reader sees a live-looking plan for a deleted mechanism. Judgment call — defensible as a sub-plan of the already-marked `epic-prism-enforcement-layer`, but inconsistent with the revert's own marking pattern.
- **Suggested fix:** Add `> Reverted: 2026-06-29 — the enforcement floor this plan helped author was removed; see epic-floor-revert.md` under the title (matching the siblings) — or consciously leave it and record the scoping decision.
- **Fixed in:** Added the `> Reverted` marker under the `# Plan: prism-295` title (sibling format, backticked link) plus a one-line History entry on prism-295. Confirmed prism-295's Goal is pure floor (Class B `gates.json` authoring), so the marker is correct, not over-marking.

---

## PR Readiness

- [x] No critical or major issues — two Minors open (see `## Review Issues`)
- [x] Build passes — `pnpm prism:build` 416/420, the 4 fails pre-existing Windows path bugs (no new regressions) — last run: 2026-06-29
- [x] Floor structurally gone — `settings.json` `{}`, zero hook files, no live-surface floor residue except the one orphan above
- [x] All 6 AC ticked (AC #114 to be re-confirmed once the orphan entry is removed)

**Last updated:** 2026-06-29
