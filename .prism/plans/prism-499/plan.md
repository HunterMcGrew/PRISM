---
title: AI-native SDLC — phase 1 plan (slimming, deletions, umbrella speed bump)
stage: plan
status: draft
intent: intent.md (approved 2026-10-17)
ticket: https://github.com/HunterMcGrew/PRISM/issues/499
created: 2026-10-17
---

# Plan: prism-499 — phase 1

## Ticket

https://github.com/HunterMcGrew/PRISM/issues/499

## Goal

Land phase 1 of the intent's § Order of work: measure the baseline, delete Sol, Sasha, Ren, and Theo, rename and thin every surviving skill to the four tests, and port the umbrella-section speed bump into the write gate.

---

## Baseline

Measured on `main` at `8ef1df0d` on 2026-10-17, before any phase-1 change.

### Method

- **Body** is `shared.md` plus `claude.md` from `.ai-skills/skills/<id>/`, the two files the Claude `SKILL.md` is generated from.
- **Loaded** is body plus every `.md` under `.prism/references/` or `.prism/skills/` the body cites by markdown link or backticked path. This is the number the intent's 120-line cap applies to.
- **Closure** follows the same citations transitively through those files. It is reported because a step file that names the next step is also read on a normal run.
- Rules and architect docs are not counted per skill. Rules are measured once as always-on content, and architect docs load by manifest route whatever skill is running.
- The script is read-only and lives outside the repo. Re-run it before phase 1 closes to record the after numbers.

### Skills

| Skill | Body | Loaded | Closure |
| --- | --- | --- | --- |
| devils-advocate | 123 | 123 | 123 |
| prism-architect | 266 | 824 | 1105 |
| prism-changelog | 273 | 550 | 966 |
| prism-code-dev | 254 | 814 | 1028 |
| prism-code-review-pr | 369 | 1251 | 1576 |
| prism-code-review-self | 363 | 1078 | 1382 |
| prism-conductor | 160 | 1005 | 1693 |
| prism-customer-success | 133 | 398 | 666 |
| prism-data | 144 | 426 | 677 |
| prism-debugger | 291 | 881 | 1184 |
| prism-design | 331 | 889 | 1140 |
| prism-doc-walker | 205 | 964 | 1355 |
| prism-documentation | 238 | 968 | 1384 |
| prism-finance | 143 | 408 | 676 |
| prism-founder | 147 | 412 | 680 |
| prism-handoff | 178 | 278 | 711 |
| prism-legal | 148 | 413 | 681 |
| prism-market-research | 137 | 419 | 670 |
| prism-marketing | 115 | 380 | 648 |
| prism-onboarding | 160 | 482 | 915 |
| prism-prd | 210 | 536 | 804 |
| prism-qa-test-plan | 223 | 833 | 1249 |
| prism-recruiting | 148 | 430 | 681 |
| prism-refactor-scout | 148 | 448 | 881 |
| prism-retro | 231 | 586 | 837 |
| prism-review-loop | 307 | 458 | 914 |
| prism-sales | 143 | 408 | 676 |
| prism-skill-forge | 256 | 356 | 789 |
| prism-standup-summary | 205 | 865 | 1116 |
| prism-surface-audit | 317 | 434 | 850 |
| prism-ticket-start | 396 | 1078 | 1329 |
| prism-user-stories | 269 | 741 | 1029 |
| tdd | 53 | 53 | 53 |
| **Total** | **7,084** | **20,189** | **30,468** |

32 of 33 skills exceed 120 loaded lines. Only `tdd` fits.

### Always-on content

- **Rules with `load: always`:** 21 files, 1,622 lines, 19.7k words. Two more rules (`pr-description.md`, `worktree-git.md`) are `load: skill`, and seven are `load: paths`.
- **`CLAUDE.md`:** 54 lines, all hand-authored.
- **`AGENTS.md`:** 1,822 lines. Lines 37–1764 are the generated tier-1 rule block, which leaves 94 hand-authored lines.

### First-pass clean PRs

- **Window:** the 30 most recent merged PRs, #462–#497, merged 2026-08-19 to 2026-10-12 (Central).
- **Result:** 19 clean, 0 not clean, 1 unclear (#470), and 10 with no agent review (chores and version bumps). That is 19/19 with #470 excluded, or 19/20 counting it against.
- **Method:** each PR's reviews, comments, and commits were merged into one timeline. The last agent verdict is Eric's summary comment, which he edits in place. Commits after that verdict counted as human-requested unless an agent finding, CI, a merge from `main`, or plan bookkeeping explains them.
- **This is an upper bound, not a rate.** Agent and human post from one account, and no human review text appears on any of the 30 PRs. Human corrections happen in chat and surface only as agent-written commits. See Decision: First-pass clean needs a human-written signal.

---

## Stack

Phase 1 ships as a GitHub stack off this branch. Each PR merges in order once its review loop comes back clean with no `review:has-minors` label. The next branch then absorbs the squash with `git merge -X ours origin/main`.

File and line counts below cover hand-authored source. They leave out generated mirrors (`.claude/`, `.codex/`, `.cursor/`, `templates/install/`), which `pnpm prism:build` writes and `pnpm prism:check` verifies byte for byte.

| # | Branch suffix | What lands | Est. files | Why the cut is here |
| --- | --- | --- | --- | --- |
| 1 | `prism-499-ai-native-sdlc` | `intent.md` and this plan | 2 | The baseline has to be on `main` before any change it measures |
| 2 | `-umbrella-speed-bump` | Write-gate speed bump, `umbrellas` key, harness tests, docs | ~12 | Depends on nothing. It also stops the later PRs from adding sections to umbrella docs |
| 3 | `-delete-sol` | Sol skill and conductor tree removed, merge flag renamed, merge-authority ADR | ~70, mostly one-line | One concept per removal, so the sweep for it is complete in one diff |
| 4 | `-delete-sasha-ren-theo` | The three remaining deletions and their sweeps | ~60, mostly one-line | Same reason. None of the three has a replacement to wait for |
| 5 | `-shared-core` | Thin `skill-core.md` and the references most skills load; add the loaded-lines check with an allowlist | ~15 | Every skill loads the core, so no skill can reach 120 until it shrinks |
| 6 | `-review-lane` | `prism-self-review`, `prism-pr-review` | ~25 | The two reviewers share references and must stay consistent |
| 7 | `-build-lane` | `prism-implement`, `prism-docs`, `prism-design` | ~30 | The build lane's handoffs reference each other |
| 8 | `-flow-entry` | `prism-plan` (rename only), `prism-start-ticket`, `prism-onboard` | ~30 | The entry of the engineering flow |
| 9 | `-utilities` | `prism-challenge`, `tdd`, `prism-forge-skill`, `prism-handoff` | ~20 | Persona-less skills share one shape |
| 10 | `-cadence-release` | `prism-retro`, `prism-audit`, `prism-changelog`, `prism-standup`, `prism-qa-plan`, `prism-prd` | ~35 | Skills run on a schedule or at release, outside the ticket flow |
| 11 | `-business` | The nine business skills | ~30 | One shared strategy-doc flow |

Every PR over 10 files is over because a rename or removal has to reach every reference in the same diff, per `.prism/rules/code-standards.md` § Removal and rename completeness. Splitting one removal across PRs would leave `main` pointing at a skill that no longer exists.

---

## Implementation Tasks

### PR 2 — Umbrella-section speed bump

1. **Add the `umbrellas` key.** `.prism/architect/manifest.json`, `.prism/architect/_toolkit/manifest.base.json`, and `templates/install/.prism/architect/manifest.stub.json` gain a top-level `"umbrellas": [...]` array. The members are the broad `_toolkit/` docs (`skills-ecosystem.md`, `spec-editing.md`, `hook-runtime.md`, `install-layout.md`) plus `.prism/rules/*.md`. The stub ships with only the rules glob.
2. **Keep `umbrellas` out of route matching.** `matchDocsForPath` in `scripts/ai-skills/hooks/architect-route.mjs`, `verify-manifest-coverage.ts`, `ownership.ts`, and `prism doctor`'s manifest checks skip the reserved key. One test asserts that every umbrella entry matches at least one file.
3. **Add `editContent` to each `HARNESSES` row** in `scripts/ai-skills/hooks/harnesses.mjs`. Claude reads Edit `new_string`, Write `content`, and MultiEdit `edits[].new_string`. Codex reads the added lines of an `apply_patch`. Cursor's field names are a documented guess.
4. **Add the speed bump to `runPreToolUseArm`** in `scripts/ai-skills/hooks/hook.mjs`. It runs after the read-credit check passes and denies once per scope, doc, and `##`–`######` heading the file lacks. The acknowledgement is written to route state before the deny, and a failed write allows. The deny text names the doc's routes or, for a rule file, the every-session cost, and it points at `writing-an-architect-doc.md` § Where new content goes.
5. **Write tests on all three hosts** in `hook-gate.test.ts`, one leg each: the deny fires, a seeded acknowledgement clears it, and a retry through the gate clears it. Cursor's row asserts the documented limitation instead, which is that `emitDeny` returns `null` and the edit passes.
6. **Write the docs.** Add `hook-runtime.md` § Umbrella-section speed bump, update `writing-an-architect-doc.md` § Where new content goes step 2, and make the consumer-facing note in `docs/ai-skills/compatibility.md`.
7. **Verify.** Run `pnpm prism:check` and `pnpm prism:test`.

### PRs 3–11

Each PR's tasks are written into this section when its branch is cut, so a task list never runs ahead of the code it describes. The rules every one of those PRs follows are recorded under `## Decisions`.

---

## Decisions

- **`devils-advocate` becomes `prism-challenge`. `tdd` keeps its bare name.**
  - **Root cause:** the intent renames `devils-advocate` to `challenge`, says `tdd` keeps its name, and says skill IDs keep the `prism-` prefix.
  - **Alternatives considered:** a bare `challenge`, or `prism-tdd`.
  - **Chosen approach:** the prefix rule wins wherever a skill is renamed. `tdd` is not renamed, so it keeps its bare name.

- **`prism-plan`, `prism-user-stories`, and `prism-review-loop` stay over the 120-line cap through phase 1.** Winston is renamed to `prism-plan` with his plan logic intact. Mira and the review loop keep their names. Their replacements land in phase 2 (`intent`, the plan-folder writer) and phase 3 (`REVIEW.md` and the review runners). Thinning them now would cut logic nothing yet replaces. The loaded-lines check lists all three on its allowlist with this reason.

- **The 120-line cap is enforced by a check, not by review.** PR 5 adds a test that measures loaded lines the way § Baseline § Method defines them. It fails when any skill not on its allowlist is over. Each lane PR removes its skills from the allowlist, so the allowlist shrinks one PR at a time and cannot regrow without a visible diff. Without a check the cap is prose, and the intent's enforcement test says prose does not hold.

- **Old persona names stay in each renamed skill's `description` as trigger words.** "Briar" keeps routing to `prism-self-review`. Consumers' orphan cleanup removes the old directories on the next `prism update`, per `.prism/architect/_toolkit/consumer-sync-flow.md` § Orphan cleanup.

- **Merge authority moves to the main session under a renamed flag.** `features.conductorMayMerge` becomes `features.mainSessionMayMerge`. A new ADR supersedes ADR-0066 and records that the main session squash-merges PRISM's own PRs once the review loop is clean with no `review:has-minors` label. Consumers keep the human merge gate because the flag defaults to absent.

- **`umbrellas` is a reserved key in a flat manifest.** PRISM's manifest maps patterns to docs at the top level, unlike thrive's sectioned manifest. A top-level `umbrellas` array would otherwise read as a route whose pattern is the literal word `umbrellas`. Every manifest reader skips the key by name.
  - **Alternatives considered:** a separate `umbrellas.json`. That would be one more file for each consumer to keep in step with the manifest it describes.

- **Cursor gets no speed bump, and the limitation is recorded.** No install path writes a Cursor hook file, and `HARNESSES.cursor.emitDeny` returns `null` (`.prism/architect/_toolkit/hook-runtime.md` § Hook runtime). The Cursor test asserts the edit passes. The docs name the gap rather than papering over it.

- **First-pass clean needs a human-written signal.** GitHub cannot separate agent comments from human ones in this repo, so the baseline is an upper bound. **Default path (until a later phase adds the signal):** report the upper bound, and do not claim movement on criterion 1 from GitHub data alone.

---

## Sessions

- 2026-10-17 [huntermcgrew/prism-499-ai-native-sdlc] open: Intent — phase 1 of the AI-native SDLC port; Bounds — baseline, four deletions, rename and thin, umbrella speed bump, no phase-2 artifacts; Approach — stack of PRs, review loop on each, merge in order

---

## History

- 2026-10-17 [huntermcgrew/prism-499-ai-native-sdlc]: Recorded the phase-1 baseline and the stack plan.

---

## Acceptance Criteria

### Non-behavioral

- [ ] **AC-1** No live file references Sol, Sasha, Ren, or Theo by name or skill ID.
  - Evidence (machine): a `git grep` for each name and ID over the tree, excluding plans, lessons, retros, audits, and archived history, returns no file.
- [ ] **AC-2** Each ADR whose decision the deletions retire carries `Status: superseded` and names its successor.
  - Evidence (machine): `grep -l 'Status: superseded'` lists each retired ADR, and each names its successor.
- [ ] **AC-3** Every surviving skill carries its intent § Skills ID, and its old persona name is in its `description`.
  - Evidence (machine): `roles.json` IDs match the intent roster, and each renamed skill's `frontmatter` description contains the old persona name.
- [ ] **AC-4** Every skill except the three in Decision `prism-plan, prism-user-stories, and prism-review-loop stay over the 120-line cap` loads 120 lines or fewer.
  - Evidence (machine): the loaded-lines test passes with an allowlist holding exactly those three IDs.
- [ ] **AC-5** `pnpm prism:check` is green on every merged PR in the stack.
  - Evidence (machine): CI on each PR, on both `ubuntu-latest` and `windows-latest`.

### Behavioral

- [ ] **AC-6** Given a session that has read a rule file's governing docs, When it adds a new `##` heading to that rule file, Then the write is denied once with the always-on cost named, and the same edit retried passes.
  - Evidence (machine): the Claude and Codex legs of the speed-bump test. Each leg fails if the deny is missing, if it fires twice, or if the retry is denied.
- [ ] **AC-7** Given the same edit on Cursor, When the hook runs, Then the edit passes and the docs name the gap.
  - Evidence (machine): the Cursor leg asserts no deny. A `grep` finds the limitation in `hook-runtime.md`.

---

## Review Issues

## PR Readiness

**Last updated:** 2026-10-17
