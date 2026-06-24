# Plan: prism-256

## Ticket

https://github.com/HunterMcGrew/PRISM/issues/256

## Goal

Atlas (`prism-onboarding`) detects a `config.json` written by `prism init` and continues with the first-install-only onboarding steps — asset-path survey, per-team rule generation, security guidance, anchor population — without re-prompting for or clobbering fields `init` already collected.

---

## User Stories

---

## Design

---

## Implementation Tasks

> Mode resolved: `init-bootstrapped` (see `## Decisions`). Work is content-first (`shared.md`) with one typed code touch (`onboarding-types.ts`). All tasks are `[AFK]` — the OPEN decision is closed. Canonical edits land in `.ai-skills/skills/prism-onboarding/shared.md`; platform mirrors regenerate via `pnpm prism:build` and must not be hand-edited.

### Clove (implementation)

1. **Widen the `OnboardingState["mode"]` union to include the new mode.** File: `scripts/ai-skills/lib/onboarding-types.ts:79`. Replace `mode: "first-install" | "reconfigure" | "dogfood-self" | "first-contact";` with `mode: "first-install" | "reconfigure" | "dogfood-self" | "first-contact" | "init-bootstrapped";`. This is the only code change — it lets `initialState(mode)` and `OnboardingState` carry the new mode without an `as` cast. Verify with `pnpm prism:check-types`. (Blocks task 7's verification.)

2. **Document the `init-bootstrapped` mode in the Atlas mode list.** File: `.ai-skills/skills/prism-onboarding/shared.md`, the numbered mode list at lines 7–12 (inside `## Identity`). Insert a new mode entry after the `first-install` entry (line 9) and renumber the rest. New entry text:
   ```
   2. **init-bootstrapped** — a `.ai-skills/config.json` exists but no `.ai-skills/registry/onboarding-state.json` does. This is the fingerprint of `prism init` (the cold-bootstrap CLI) having written a skeletal config without running the guided flow. Atlas runs the full first-install step set — asset survey, rule generation, security guidance, anchor population — but seeds the fields `init` already collected as pre-filled and does not re-prompt for any present-and-valid field. The `init` command never writes a state file, so config-present + state-absent is the unambiguous init-origin signal.
   ```
   Content-only; no build effect beyond the mirror regen in task 8. (Parallel with tasks 3–6.)

3. **Add the `init-bootstrapped` branch to the mode-determination walk.** File: `.ai-skills/skills/prism-onboarding/shared.md`, Batch 2 step 7 (lines 67–73, `### Batch 2` → "Determine mode"). The walk is an ordered list; insert the new branch **after** the resume branch and **before** the reconfigure branch, so it claims the config-present/state-absent case before `reconfigure` can. Replace the existing ordered list:
   ```
   - If a state file exists with incomplete steps → **resume** (resume from `nextIncompleteStep`).
   - Else if a config exists → **reconfigure**.
   - Else if established-asset signals are present **and** no `.sync-manifest.json` exists → **first-contact**.
   - Else → **first-install** (no config, no established-asset signals, no state).
   ```
   with:
   ```
   - If a state file exists with incomplete steps → **resume** (resume from `nextIncompleteStep`).
   - Else if a config exists **and** no state file exists → **init-bootstrapped** (`prism init` wrote the config; the guided flow never ran). Atlas runs the first-install step set with config fields pre-seeded — see § Onboarding modes → init-bootstrapped.
   - Else if a config exists (and a state file exists) → **reconfigure**.
   - Else if established-asset signals are present **and** no `.sync-manifest.json` exists → **first-contact**.
   - Else → **first-install** (no config, no established-asset signals, no state).
   ```
   Rationale to preserve in the line: the state file is what distinguishes a guided run (which always writes state via `saveState`) from an `init` bootstrap (which never touches state). Content-only. (Parallel with tasks 2, 4–6.)

4. **Add the `### init-bootstrapped` mode section under `## Onboarding modes`.** File: `.ai-skills/skills/prism-onboarding/shared.md`, `## Onboarding modes` section. Insert a new `### init-bootstrapped` subsection immediately after the `### first-install` subsection (after line 100, before `### reconfigure` at line 102). Full content:
   ```
   ### init-bootstrapped

   Mode when `.ai-skills/config.json` exists but `.ai-skills/registry/onboarding-state.json` does not — the fingerprint of `prism init` having bootstrapped a skeletal config without the guided flow. Atlas runs the **first-install step set** (survey → remaining questions → rule generation → anchor substitution → config write → build), with two differences from a cold first-install:

   1. **Seed from the existing config.** Read `.ai-skills/config.json` in Batch 1 (already done at probe 2). For each field `init` collected — `project`, `ticketPrefix`, `ticketSystem.kind` (plus `teamKey`/`workspace` when present), `github.owner`, `github.repo` — treat the on-disk value as the answer and **skip the prompt** when the value is present and non-empty. Surface the seeded values in the survey so the user can correct one before the flow continues, but do not re-ask field by field.
   2. **Collect only what `init` does not write.** `init` writes `productDomain: ""`, `existingStandards: []`, and no `documentation` block. Atlas still prompts for product domain (question 6), existing engineering standards (question 7), and documentation setup (question 11), then runs the generators (`runRuleGenerators`) and anchor substitution (`runAnchorSubstitution`) and the asset-path/discovery work that `init` never performs.

   The asset-path survey and discovery sweep run only when established-asset signals are also present — `init-bootstrapped` does not force first-contact behavior, but it does not suppress it either; if a repo was `init`-bootstrapped *and* carries established assets, both the seed-from-config overlay and the first-contact additions apply.

   On config write, the seeded fields are passed through unchanged — Atlas writes the assembled config (seeded + newly collected) via `writeOnboardingConfig`, never resetting a seeded field to a default. Skip-if-exists still governs generated rule files.
   ```
   Content-only. (Parallel with tasks 2, 3, 5, 6.)

5. **Note the field-seeding behavior in the interactive flow's question order.** File: `.ai-skills/skills/prism-onboarding/shared.md`, `### Question order` (lines 135–148). Add one sentence at the end of the intro prose for that section (after the heading, before question 1), stating: "In `init-bootstrapped` mode, questions 1–5 (project name, ticket prefix, GitHub org/repo, ticket-system kind/workspace, Linear team key) are pre-seeded from the existing `config.json` and skipped when the on-disk value is present and non-empty; the flow resumes at question 6 (product domain). See § Onboarding modes → init-bootstrapped." Content-only. (Parallel with tasks 2–4, 6.)

6. **Add `init-bootstrapped` to the Batch-1 existing-config probe note and the closing-summary mode line.** File: `.ai-skills/skills/prism-onboarding/shared.md`. Two edits:
   - Probe 2 (lines 46–48, "Existing config"): append a sentence — "When a config exists but no `.ai-skills/registry/onboarding-state.json` exists, this is the `init-bootstrapped` signal (per Batch 2 step 7); capture the config values as pre-seeded answers rather than reconfigure-mode current-values."
   - Closing summary (line 237, "**Mode:**"): change `first-install / reconfigure / dogfood-self / first-contact` to `first-install / init-bootstrapped / reconfigure / dogfood-self / first-contact`.
   Content-only. (Parallel with tasks 2–5.)

7. **Regenerate platform mirrors and run the full check.** After tasks 1–6 land, run `pnpm prism:build` from the repo root to regenerate `.claude/skills/prism-onboarding/SKILL.md`, `.codex/...`, `.cursor/...` from the edited `shared.md`. Then run `pnpm prism:check` (build --check + check-types + test + verify-manifest + crossref-lint). Both must pass. Do not hand-edit any generated `SKILL.md`. (After tasks 1–6.)

8. **Confirm no smoke-test regression and assess test coverage.** The existing `scripts/ai-skills/atlas-dogfood.test.ts` exercises `runRuleGenerators` against a fixture and does not invoke mode detection (which is instruction-driven prose, not a function), so it should pass unchanged after task 7 — confirm via `pnpm prism:test`. Mode detection has no code seam to unit-test; the new `OnboardingState["mode"]` value is type-checked by task 1's `pnpm prism:check-types`. If task 1 surfaces any other `mode`-typed switch or exhaustiveness check that now needs the new case (search `scripts/ai-skills/` for `"first-contact"` to find sibling switches), handle it inline and add a focused assertion. No new behavioral test is required for the content-only mode walk. (After task 7.)

---

## Decisions

- **This follow-up is explicitly chartered.** The prism-250 Decision "Atlas existing-config detection is a noted follow-up" recorded this work for filing after #251 merged. The scope-fit gate confirms it as a new ticket: different surface (Atlas skill files vs. CLI scripts), different persona class (Atlas vs. Clove/Eli), non-trivial mode-detection logic change.

- **Scoping context for Winston (from Sol's pre-dispatch investigation):**

  Atlas currently distinguishes modes by checking two files (`shared.md` lines 9–11):

  | config.json | onboarding-state.json | Current mode |
  |---|---|---|
  | absent | absent | `first-install` |
  | present | present or absent | `reconfigure` |

  The `init` command (shipped #251) creates a third state: **config.json present, onboarding-state.json absent**. This state is currently misrouted into `reconfigure` mode (`shared.md` line 104), which is built for teams wanting to change existing fields. `reconfigure` gates off the asset-path survey and first-contact work (`shared.md` lines 144, 167) — exactly the steps a fresh `init`-bootstrapped consumer still needs.

  The design question Winston must settle: should Atlas add a fourth mode (`init-bootstrapped`) to the existing mode enum, or should the distinction live within `reconfigure` as a sub-path triggered by the absent state file? Either approach must ensure the asset-path survey, per-team rule generation, security guidance, and anchor population all run for an init-bootstrapped repo.

  **Canonical source:** `.ai-skills/skills/prism-onboarding/shared.md` is the only file to edit for skill behavior. The platform mirrors (`.claude/skills/prism-onboarding/SKILL.md`, `.codex/skills/prism-onboarding/SKILL.md`, `.cursor/skills/prism-onboarding/SKILL.md`) are generated by `pnpm prism:build` and must NOT be hand-edited.

  **Relevant line anchors in `shared.md` (as of prism-250 close):**
  - Lines 9–11: mode-detection logic (the two-file check)
  - Line 104: `reconfigure` mode entry point
  - Line 144: asset-path survey gate (currently skipped in reconfigure)
  - Line 167: first-contact/adopt work gate (currently skipped in reconfigure)

  **Fields `init` collects** (do not re-prompt for these in the new path): project name, ticket prefix, ticket system kind, GitHub org, GitHub repo.

  **Fields `init` does NOT collect** (Atlas must still collect these): product domain, existing standards, documentation setup; then generates per-team rules, security guidance, and populates anchors.

- **Mode-detection resolution: add `init-bootstrapped` as a distinct mode that routes into the first-install step set with config fields pre-seeded.**
  - **Root cause:** `init` (`scripts/ai-skills/init.ts:78-97`) writes a skeletal `config.json` (project, ticketPrefix, ticketSystem, github, linearTeam, `techStack`, `rules.universal`) but never runs the generators, anchors, or asset survey, and never writes an `onboarding-state.json` marker. The current two-file mode walk (`shared.md:67-73`) misroutes this state into `reconfigure`, which gates *off* exactly the first-install-only work the repo still needs (`shared.md:104` re-runs generators only on user-named field changes; the asset survey at `shared.md:144/167` is first-contact/first-install only).
  - **Alternatives considered:** (b) a sub-path inside `reconfigure` keyed on state-absent; (c) have `init` write a partial state marker so the resume path handles it.
  - **Chosen approach:** distinct `init-bootstrapped` mode. Beats (b) because `reconfigure`'s contract is "surface current values, change only named fields" — bending it to also run first-contact-style generators inverts its UX and risks regressing the AC's "reconfigure unchanged" guarantee (REQ-2). Beats (c) because it would expand scope into `init.ts` (a second file + the cold-bootstrap CLI lane), and the config-present/state-absent signal is already unambiguous without a marker — `init` is the *only* writer that produces config without state. The new mode reuses the **first-install flow machinery** (same generators, same anchor substitution, same documentation/standards questions) — it is an entry condition plus a "seed-from-config, skip-present-and-valid" overlay on first-install's question order, not parallel logic.
  - **Implementation guidance:** detection is content-only (the mode walk in `shared.md` is instruction-driven prose, no `detectMode()` function exists). The one code touch is widening the `OnboardingState["mode"]` union in `scripts/ai-skills/lib/onboarding-types.ts:79` to include `"init-bootstrapped"` so `initialState(mode)` (`onboarding-state.ts:122`) accepts it. Fields to skip when present-and-non-empty: `project`, `ticketPrefix`, `ticketSystem.kind` (+ `teamKey`/`workspace`), `github.owner`, `github.repo`. Fields init leaves empty that Atlas must still collect: `productDomain` (init writes `""`), `existingStandards` (init writes `[]`), `documentation` (absent), plus generators + anchors + (first-contact-only) asset survey.
  - **→ promoted to .prism/architect/onboarding.md** (mode taxonomy is durable system behavior future Atlas work reads — promote at close if the file exists; create the entry if not).

---

## History

- 2026-06-24 [hunter/prism-256-atlas-detects-init-config]: Plan created; issue #256 opened. Follow-up chartered from prism-250 Decision; scope-fit gate confirmed new ticket. Branch created from `origin/main` at `66889b0`.
- 2026-06-24 [hunter/prism-256-atlas-detects-init-config]: Winston settled the OPEN mode decision (`init-bootstrapped` distinct mode, first-install step set with config pre-seed) and wrote 8 implementation tasks under `### Clove`. Design stayed content-first; one typed code touch (widen `OnboardingState["mode"]` union). Verified no `switch (mode)` consumer exists in source — mode walk is instruction-driven prose.
- 2026-06-24 [hunter/prism-256-atlas-detects-init-config]: Clove implemented all 8 tasks — widened `OnboardingState["mode"]` union in `onboarding-types.ts`, added `init-bootstrapped` to the mode list, mode-determination walk, mode section, question-order note, Batch-1 probe note, and closing-summary line in `shared.md`. Regenerated platform mirrors via `pnpm prism:build`; `pnpm prism:check` green (377 tests, 0 failures, tsc clean, crossref-lint passed, mirror-drift check passed).

---

## Debugged Issues

---

## Review Issues

---

## Acceptance Criteria

### Behavioral

- [ ] Given a repo where `prism init` has written `config.json` but no `onboarding-state.json` exists, When a consumer runs Atlas, Then Atlas reads the existing config values and does not re-prompt for project name, ticket prefix, ticket system, GitHub org, or GitHub repo (REQ-1)
- [ ] Given the init-bootstrapped state above, When Atlas runs, Then it completes the asset-path survey, per-team rule generation, security guidance, and anchor population — the steps `init` does not perform (REQ-1)
- [ ] Given the init-bootstrapped state above, When Atlas completes, Then the config values written by `init` are preserved verbatim in the final `config.json` — none are clobbered or reset to defaults (REQ-1)
- [ ] Given a repo where both `config.json` AND `onboarding-state.json` exist, When a consumer runs Atlas, Then Atlas behaves exactly as it did before this ticket — existing `reconfigure` UX is unchanged (REQ-2)
- [ ] Given a repo where neither file exists, When a consumer runs Atlas, Then Atlas behaves exactly as before — existing `first-install` UX is unchanged (REQ-2)

### Non-behavioral

- [ ] The canonical source for the mode-detection change is `.ai-skills/skills/prism-onboarding/shared.md`; platform mirrors are regenerated via `pnpm prism:build` and not hand-edited (REQ-3)
- [ ] `pnpm prism:check` passes after all changes (build sync + tsc + tests + verify-manifest + crossref-lint) (REQ-3)

### AC Adjustments

### AC Sync Log

| Date | Agent | Action | Plan | Linear |
| ---- | ----- | ------ | ---- | ------ |
| 2026-06-24 | Nora | Initial AC from ticket requirements and done-condition | synced | N/A (GitHub issues) |

---

## Cleanup Items

---

## PR Readiness

- [x] No critical or major issues
- [x] Types correct — no `any`, no unsafe `as` (union widened without cast; `onboarding-state.ts:123` uses `OnboardingState["mode"]` which picks up the new variant automatically)
- [x] No stray console.logs or debug artifacts
- [x] Tests written for new logic and edge cases (mode detection is instruction-driven prose, no code seam; type union verified by tsc; 377 tests pass unchanged)
- [x] All debugged issues resolved (no `open` entries)
- [x] Build passes — last run: 2026-06-24 (`pnpm prism:check` green: mirror-drift check + tsc + 377 tests + verify-manifest + crossref-lint)
- [ ] PR description up to date
- [ ] Lasting decisions promoted to architect context (if applicable — promote the mode-taxonomy Decision to `.prism/architect/onboarding.md` at ticket close per the Decision verdict)

**Last updated:** 2026-06-24 (Clove implementation)
