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

Land phase 1 of the intent's § Order of work: measure the baseline, delete Sol, Sasha, Ren, and Theo, rename every surviving skill and thin it to the four tests (except the three whose replacements land later), and port the umbrella-section speed bump into the write gate.

---

## Baseline

Measured on `main` at `8ef1df0d` on 2026-10-17, before any phase-1 change.

### Method

- **Body** is `shared.md` plus `claude.md` from `.ai-skills/skills/<id>/`, the two files the Claude `SKILL.md` is generated from. The intent's 6,977-line figure counts `shared.md` alone, and on that measure 31 skills exceed 120 lines, not the intent's 29. The after-run uses the Body measure here.
- **Loaded** is body plus every `.md` under `.prism/references/` or `.prism/skills/` the body cites by markdown link or backticked path. This is the number the intent's 120-line cap applies to.
- **Closure** follows the same citations transitively through those files. It is context, not a target, and it depends on how a citation is parsed: a second parser gave 891 for `prism-review-loop` against this one's 914.
- Architect docs are not counted per skill, because they load by manifest route whatever skill is running. A `load: always` rule is counted once, as always-on content. A `load: skill` rule the body cites counts against that skill's Loaded lines, because it loads only when that skill runs. Without that, content moved into a `load: skill` rule would leave the cap's view. No `load: skill` rule is cited from a skill body today, so the numbers below don't change.
- PR 5's loaded-lines test becomes the canonical measurement. It has to reproduce the Loaded column below before it gates anything.

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

- **Rules with `load: always`:** 21 files, 1,622 lines, 19.7k words. Of the other rules, seven are `load: paths` and two (`pr-description.md`, `worktree-git.md`) are `load: skill`.
- **`CLAUDE.md`:** 54 lines, all hand-authored.
- **`AGENTS.md`:** 1,822 lines. Lines 37–1764 are the generated tier-1 rule block, which leaves 94 hand-authored lines.

### First-pass clean PRs

- **Window:** the 30 highest-numbered merged PRs, #462–#497, merged 2026-08-19 to 2026-10-12 (Central).
- **Result:** 19 clean, 0 not clean, 1 unclear (#470), and 10 with no agent review (chores and version bumps). That is 19/19 with #470 excluded, or 19/20 counting it against.
- **Method:** each PR's reviews, comments, and commits were merged into one timeline. The last agent verdict is Eric's summary comment, which he edits in place. Commits after that verdict counted as human-requested unless an agent finding, CI, a merge from `main`, or plan bookkeeping explains them.
- **This is an upper bound, not a rate.** Agent and human post from one account, and no human review text appears on any of the 30 PRs. Human corrections happen in chat and surface only as agent-written commits. See Decision: First-pass clean needs a human-written signal.

---

## Stack

Phase 1 ships as a GitHub stack off this branch. Each PR merges in order once its review loop comes back clean with no `review:has-minors` label. See Decision: Each stack branch absorbs the squash below it with `git merge -X ours origin/main`.

File counts below are estimates of hand-authored files. They leave out the generated mirrors under `.claude/`, `.codex/`, and `.cursor/`, which `pnpm prism:build` writes and `pnpm prism:check` verifies byte for byte. Hand-edited files under `templates/install/` count.

| # | Branch suffix | What lands | Est. files | Why the cut is here |
| --- | --- | --- | --- | --- |
| 1 | `prism-499-ai-native-sdlc` | `intent.md`, this plan, and the folder-plan tier in `resolveLivePlan` | 4 | The baseline has to be on `main` before any change it measures, and the stack's spec lint has to find this plan |
| 2 | `-umbrella-speed-bump` | Write-gate speed bump, `umbrellas` key, tests, docs | ~20 | Depends on nothing. It also stops the later PRs from adding sections to umbrella docs |
| 3 | `-delete-sol` | Sol skill and conductor tree removed, merge flag renamed, merge-authority ADR | ~70, mostly one-line | One concept per removal, so the sweep for it is complete in one diff |
| 4 | `-delete-sasha-ren-theo` | The three remaining deletions and their sweeps | ~60, mostly one-line | Same reason. None of the three has a replacement to wait for |
| 5 | `-shared-core` | Thin `skill-core.md` and the references most skills load. Add the loaded-lines check with an allowlist | ~15 | Every skill loads the core, so no skill can reach 120 until it shrinks |
| 6 | `-review-lane` | `prism-self-review`, `prism-pr-review` | ~25 | The two reviewers share references and must stay consistent |
| 7 | `-build-lane` | `prism-implement`, `prism-docs`, `prism-design` | ~30 | The build lane's handoffs reference each other |
| 8 | `-flow-entry` | `prism-plan` (rename only), `prism-start-ticket`, `prism-onboard` | ~30 | The entry of the engineering flow |
| 9 | `-utilities` | `prism-challenge`, `tdd`, `prism-forge-skill`, `prism-handoff` | ~20 | Persona-less skills share one shape |
| 10 | `-cadence-release` | `prism-retro`, `prism-audit`, `prism-changelog`, `prism-standup`, `prism-qa-plan`, `prism-prd` | ~35 | Skills that run on a schedule or at release, outside the ticket flow |
| 11 | `-business` | The nine business skills | ~30 | One shared strategy-doc flow |

PRs 3, 4, and 6–11 are over 10 files because a rename or removal has to reach every reference in the same diff, per `.prism/rules/code-standards.md` § Removal and rename completeness. Splitting one would leave `main` pointing at a skill that no longer exists. PR 2 is over because one hook change has to land with its type sidecars, every manifest reader, the consumer seed twins, and its tests, or a consumer gets a runtime the docs do not describe. PR 5 is over because the shared references and the check that enforces their size have to move together.

---

## Implementation Tasks

### PR 1 — Plan and resolver

1. **Add the folder tier to `resolveLivePlan`** in `scripts/ai-skills/lib/resolve-live-plan.ts`. Check `.prism/plans/<id>/plan.md` before `.prism/plans/<id>.md`. Add two tests to `resolve-live-plan.test.ts`: a folder plan wins over a flat plan of the same id, and a folder without `plan.md` falls through to the flat tier. Verify with `pnpm prism:spec-scope-lint`, which must resolve this plan rather than print "no live plan resolved".

### PR 2 — Umbrella-section speed bump

Tasks run in order. Tasks 1–6 each leave `pnpm prism:check-types` passing, and task 7 runs the tests.

1. **Add the reserved-key helpers to `scripts/ai-skills/hooks/lib/match.mjs`** and its sidecar `match.d.mts`: `UMBRELLAS_KEY = "umbrellas"`, `manifestRoutes(manifest)` (every `[pattern, docOrDocs]` pair except that key), and `manifestUmbrellas(manifest)` (the key's string entries, `[]` when absent or not an array). `match.mjs` is already in `HOOK_RUNTIME_FILES` (`update.ts`), so no new delivered file is needed.
2. **Route every manifest reader through `manifestRoutes`.** These are `matchDocsForPath` in `hooks/architect-route.mjs`, `loadedDocsForScope` and `collectRoutedDocs` in `verify-manifest-coverage.ts`, `collectRoutedDocs` in `doctor.ts`, the routed-doc loop in `ship-closure.ts`, `findCatchAllKeys` and `findBraceGlobKeys` in `lib/manifest-routes.ts`, and the install-seed route test in `hook-gate.test.ts`. `Manifest` is typed `Record<string, string | string[]>`, so `tsc` cannot catch a missed reader. The sweep is a search for `Object.entries(manifest)`, `Object.values(manifest)`, and `Object.keys(manifest)` under `scripts/ai-skills/`.
3. **Add the `umbrellas` key to two manifests.**
   - `.prism/architect/manifest.json` gets `[".prism/architect/_toolkit/audit-workflow.md", ".prism/architect/_toolkit/closing-messages.md", ".prism/architect/_toolkit/install-layout.md", ".prism/architect/_toolkit/plan-authoring.md", ".prism/architect/_toolkit/skills-ecosystem.md", ".prism/architect/_toolkit/spec-editing.md", ".prism/architect/_toolkit/ticket-workflows.md", ".prism/architect/guides/*.md", ".prism/rules/*.md"]`.
   - `templates/install/.prism/architect/manifest.stub.json` gets `[".prism/rules/*.md", ".prism/custom/rules/*.md"]`.
   - Every entry is a repo-relative pattern compiled by `compileMatcher`, not a route value. `_toolkit/manifest.base.json` gets no key. See Decision: The hook reads only the live manifest.
4. **Add `editContent(payload, filePath) => string` to every `HARNESSES` row** in `hooks/harnesses.mjs`. Declare it on `HarnessSpec` in both the JSDoc typedef and `harnesses.d.mts`, and add `new_string?`, `content?`, and `contents?` to `HookPayload.tool_input` in both, or `checkJs` fails with TS2339. Export `extractPatchAddedText(command: string | undefined, filePath: string): string` and declare it in the sidecar. Claude reads `tool_input.new_string`, then `content`. Cursor's row tries the same two plus `contents`, but those names are unverified guesses, matching the posture of its `emitDeny`. The row cannot run today, because `StrReplace` is unlisted and `emitDeny` returns `null`. Codex reads the same two for `Edit` and `Write`. Those names are unverified for Codex, which documents `apply_patch` as its edit tool. For `apply_patch` it reads only the `+` lines of the section whose `*** Add File:` or `*** Update File:` header names `filePath` (`extractPatchAddedText`). `MultiEdit` gets no accessor, because it is not in Claude's `toolKinds` or its `Write|Edit|Bash` registration, so the deny arm never sees it.
5. **Carry `umbrellaAcks` through route state** in `hooks/architect-route.mjs`. `loadRouteState` returns `{ read, announced, umbrellaAcks }`, defaulting each to `[]`. Both saves in `resolveArchitectNag` spread the loaded state, so a read between a deny and its retry keeps the acknowledgement. `ArchitectRouteState` in `architect-route.d.mts` gains `umbrellaAcks?: string[]`. The two `loadRouteState` tests in `architect-route.test.ts` that `deepEqual` the empty state change their expectation to `{ read: [], announced: [], umbrellaAcks: [] }`.
6. **Add the speed bump to `hooks/architect-route.mjs`** and call it from `runPreToolUseArm` in `hooks/hook.mjs`. It runs only for a `write` kind, and only when the read-credit check (`resolveDenyReason`) returned `null`.
   - `extractNewHeadings(editText, currentText)` returns the trimmed `##`–`######` lines the edit adds. A line the file already has does not count, nor does a `#` title or a line inside a fenced block in the edit text. A file being created has no headings, so every one it adds is new.
   - `resolveUmbrellaSpeedBump(repoRoot: string, scopeId: string, edits: { filePath: string; editText: string }[]): Promise<string | null>` takes the first umbrella file with unacknowledged headings. It saves every such heading as `<repo-relative path>\n<heading>` in `umbrellaAcks`, then returns the reason. A failed save logs to stderr and returns `null`. All the headings in one deny are acknowledged together, so one retry clears them.
   - `formatUmbrellaReason(relativePath: string, headings: string[], routes: string[], currentText: string): string` writes the deny text. For a path under `.prism/rules/` or `.prism/custom/rules/`, it names when the rule loads, read from its `load:` key (`always`, `paths`, or `skill`, with a missing key read as always). It points at `.prism/architect/guides/writing-an-architect-doc.md` § Where new content goes and `.prism/rules/writing-voice.md` § Keep it short enough to be read. For any other umbrella, it lists the routes that deliver the doc and points at the same placement section. Headings cap at three and routes at four, each with an `and N more` tail.
   - Declare `extractNewHeadings`, `formatUmbrellaReason`, and `resolveUmbrellaSpeedBump` in `architect-route.d.mts`.
   - Rewrite the `runPreToolUseArm` JSDoc paragraph "Nothing here writes state". Its narrower form is that the read-credit deny writes no state and the speed bump writes its acknowledgement before it denies.
7. **Write `scripts/ai-skills/umbrella-speed-bump.test.ts`.**
   - Unit tests cover `extractNewHeadings`, `extractPatchAddedText`, `manifestRoutes`, `manifestUmbrellas`, and `formatUmbrellaReason`.
   - Three gate legs run on the Claude row and the Codex row. The deny fires on a rule file. A seeded `umbrellaAcks` entry clears it. A retry through the gate clears it, including after a `PostToolUse` read in between.
   - Separate tests cover: an unread governing doc denies first with the read-credit message, an acknowledgement in one doc does not clear the same heading in another, a failed save allows, and a multi-file patch charges a heading only to its own file.
   - A Cursor test asserts the edit passes, since `runPreToolUseArm` returns `null` on that row.
   - An integrity test asserts every `umbrellas` entry in `.prism/architect/manifest.json` matches at least one tracked file.
   - Verify with `pnpm prism:check-types` and `pnpm prism:test`.
8. **Update the docs.**
   - `.prism/architect/_toolkit/hook-runtime.md`: add `### Umbrella-section speed bump` as the first `###` under `## Write gate`, directly before `### Git gates`, since the speed bump is part of the write gate. Add `umbrellaAcks` to the State-file paragraph. Add one sentence after "What triggers a deny" saying a write that clears all five then meets the speed bump.
   - Hand-edit the same three changes into the curated seed twin, `templates/install/.prism/architect/_toolkit/hook-runtime.md`, since the build skips curated files. Its deny-conditions paragraph is headed `**What triggers it.**`, so the sentence goes after that one, adapted to the twin's wording. The twin has no `###` sections, so its `### Umbrella-section speed bump` goes at the end of the file, after the ownership paragraph.
   - `.prism/architect/guides/writing-an-architect-doc.md` § Where new content goes, step 2: add one sentence saying the manifest's `umbrellas` list names the umbrellas, and that the write gate stops a new heading in one once per session.
   - `docs/ai-skills/compatibility.md` § "Hook-based enforcement reaches Claude Code and Codex": add one paragraph. `.ai-skills/docs/compatibility.md` carries no hook content, so it is left alone. It says the speed bump ships in new installs' stub manifest, that an existing install opts in by adding the `umbrellas` key by hand, and that Cursor has no speed bump.
   - Verify with `pnpm prism:check`.

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

- **Old persona names stay in each renamed persona skill's `description` as trigger words.** "Briar" keeps routing to `prism-self-review`. Consumers' orphan cleanup removes the old directories on the next `prism update`, per `.prism/architect/_toolkit/consumer-sync-flow.md` § Steady-state persona-skill distribution.

- **Merge authority moves to the main session under a renamed flag.** `features.conductorMayMerge` becomes `features.mainSessionMayMerge`. The old name describes an actor PR 3 deletes, so keeping it would point every reader at a persona that no longer exists. A new ADR supersedes ADR-0066 and records that the main session squash-merges PRISM's own PRs once the review loop is clean with no `review:has-minors` label. PR 3 also updates `config.schema.json` and the onboarding-config passthrough. A consumer who set the old flag loses nothing, because without Sol nothing read it. Consumers keep the human merge gate because the new flag defaults to absent.

- **Each stack branch absorbs the squash below it with `git merge -X ours origin/main`.** This is the user's instruction for this stack.
  - **Root cause:** after a lower PR squash-merges, `main` holds its changes as one commit while the next branch still holds them as several. That is the squash-upstream trap `.prism/rules/git-conventions.md` § Keeping a Branch Current describes.
  - **Alternatives considered:** rebasing the remainder onto `origin/main`, the rule's remedy. It rewrites a branch that is already pushed with an open PR.
  - **Chosen approach:** `-X ours` resolves each conflict with the branch's side, which already contains the squashed content. The risk is that it also silences a real conflict with unrelated work on `main`, in a file both sides edited. The compensating check runs after every absorb. List the commits the merge brought in with `git log HEAD^1..HEAD^2`. For each one that is not a squash of this stack and touches a file the PR also changes, confirm `git diff origin/main HEAD -- <file>` shows only this PR's own edits, not a revert of that commit. Then `pnpm prism:check` must pass.

- **The hook reads only the live manifest, so `umbrellas` reaches new installs, not existing ones.** `loadManifest` in `hooks/architect-route.mjs` reads `.prism/architect/manifest.json` alone. That file is consumer-owned, and `prism update` never rewrites it. So the key ships in the install stub. An existing consumer opts in by adding it by hand, and the compatibility doc says how. `_toolkit/manifest.base.json` carries no key, because nothing reads umbrellas from it.

- **`umbrellas` is a reserved key in a flat manifest.** PRISM's manifest maps patterns to docs at the top level, unlike thrive's sectioned manifest. A top-level `umbrellas` array would otherwise read as a route whose pattern is the literal word `umbrellas`. Every reader skips the key through `manifestRoutes` in `hooks/lib/match.mjs`.
  - **Alternatives considered:** a separate `umbrellas.json`. That would be one more file for each consumer to keep in step with the manifest it describes.

- **Umbrella membership is a hand-kept list.** An umbrella covers a wide area by design, and no route shape can read that intent. The members are the `_toolkit/` docs routed over whole trees of spec content, plans, or skills (`plan-authoring.md` among them, routed over every template and plan), the writing guides (each routed over one whole content area), and the rules glob. `hook-runtime.md` is a topic doc routed by the hook paths alone, so it is not on the list.

- **The rules entry is one glob, and the deny wording reads each rule's `load:` key.** The intent names "the always-on rules". This widens that to every rule, because a `paths` or `skill` rule still loads into every session its trigger reaches. `.prism/rules/*.md` catches the next rule file added, the same way the build loads every rule in the directory. Not every rule is always-on: `load: paths` and `load: skill` rules load on narrower triggers. So the deny states the trigger the rule actually has rather than claiming every rule loads in every session.

- **A plan folder is resolved by `resolveLivePlan` before the flat tiers.** `spec-scope-lint` resolves the branch's plan through that function, and a folder plan was invisible to it, so the lint printed "no live plan resolved" and passed every PR in this stack. `.prism/rules/branch-plan.md` § Plan Lookup and `.prism/references/plan-lookup.md` still describe flat plans only, until phase 2 adds plan folders to both. Until then, a persona working on this stack is handed `.prism/plans/prism-499/plan.md` by path.

- **The speed bump's gaps are recorded, not papered over.**
  - **Cursor gets none.** No install path writes a Cursor hook file, and `HARNESSES.cursor.emitDeny` returns `null` (`.prism/architect/_toolkit/hook-runtime.md` § Hook runtime). The Cursor test asserts the edit passes.
  - **A shell edit bypasses it.** A `Bash` command carries no edit text, so `cat >> rule.md` adds a heading unseen. The read-credit gate still applies to that command.
  - **Codex `Edit` and `Write` field names are unverified.** A wrong guess yields no edit text and lets the edit pass, which is the direction every hook failure takes.
  - The docs name all three.

- **First-pass clean needs a human-written signal.** GitHub cannot separate agent comments from human ones in this repo, so the baseline is an upper bound. **Default path (until a later phase adds the signal):** report the upper bound, and do not claim movement on criterion 1 from GitHub data alone.

---

## Sessions

- 2026-10-17 [huntermcgrew/prism-499-ai-native-sdlc] open: Intent — phase 1 of the AI-native SDLC port; Bounds — baseline, four deletions, rename and thin, umbrella speed bump, no phase-2 artifacts; Approach — stack of PRs, review loop on each, merge in order

---

## History

- 2026-10-17 [huntermcgrew/prism-499-ai-native-sdlc]: Recorded the phase-1 baseline and the stack plan.
- 2026-10-17 [huntermcgrew/prism-499-ai-native-sdlc]: Self-review pass 1 fixes. Rewrote the PR 2 tasks to the shipped design and added the folder tier to `resolveLivePlan`.

---

## Acceptance Criteria

### Non-behavioral

- [ ] **AC-1** No live file references Sol, Sasha, Ren, or Theo by name or skill ID. The only exceptions are the superseded ADRs that recorded their decisions, the ADRs that supersede them, and the 1.0.0 migration note.
  - Evidence (machine): a `git grep` for each name and ID, excluding plans, lessons, retros, audits, archived history, `.prism/spec/adrs/`, and the migration note, returns no file. The same grep with no exclusions returns at least one file, which proves the pattern matches.
- [ ] **AC-2** Each ADR whose decision a deletion retires carries `Status: superseded` and names its successor.
  - Evidence (machine): PR 3 and PR 4 each list their retired ADRs in their own tasks, and `grep` finds `Status: superseded` and a successor in each one listed.
- [ ] **AC-3** Every skill the intent's § Skills roster renames carries its new name with the `prism-` prefix. `tdd` keeps its bare name, and `prism-user-stories` and `prism-review-loop` keep theirs until phase 2 and phase 3 replace them. Every renamed persona skill keeps its old persona name in its `description`.
  - Evidence (machine): `roles.json` IDs match the roster. Each renamed persona skill's frontmatter `description` contains the old persona name.
- [ ] **AC-4** Every skill except the three in Decision `prism-plan, prism-user-stories, and prism-review-loop stay over the 120-line cap` loads 120 lines or fewer.
  - Evidence (machine): the loaded-lines test passes with an allowlist holding exactly those three IDs.
- [ ] **AC-5** `pnpm prism:check` is green on every merged PR in the stack.
  - Evidence (machine): CI on each PR, on both `ubuntu-latest` and `windows-latest`.

### Behavioral

- [ ] **AC-6** Given a session that has read a rule file's governing docs, When it adds a new `##` heading to that rule file, Then the write is denied once with the rule's load trigger named, and the same edit retried passes.
  - Evidence (machine): the Claude and Codex legs in `umbrella-speed-bump.test.ts`. Each leg fails if the deny is missing, if the reason names the wrong trigger, or if the retry is denied.
- [ ] **AC-7** Given the same edit on Cursor, When the hook runs, Then the edit passes and the docs name the gap.
  - Evidence (machine): the Cursor test asserts `runPreToolUseArm` returns `null`. A `grep` finds the limitation in `hook-runtime.md`.

---

## Review Issues

## PR Readiness

**Last updated:** 2026-10-17
