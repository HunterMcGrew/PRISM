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

1. **Add the reserved-key helpers to `scripts/ai-skills/hooks/lib/match.mjs`** and its sidecar `match.d.mts`: `UMBRELLAS_KEY = "umbrellas"`, `listManifestRoutes(manifest)` (every `[pattern, docOrDocs]` pair except that key), and `listManifestUmbrellas(manifest)` (the key's string entries, `[]` when absent or not an array). `match.mjs` is already in `HOOK_RUNTIME_FILES` (`update.ts`), so no new delivered file is needed.
2. **Route every manifest reader through `listManifestRoutes`.** These are `matchDocsForPath` in `hooks/architect-route.mjs`, `loadedDocsForScope` and `collectRoutedDocs` in `verify-manifest-coverage.ts`, `collectRoutedDocs` in `doctor.ts`, the routed-doc loop in `ship-closure.ts`, `findCatchAllKeys` and `findBraceGlobKeys` in `lib/manifest-routes.ts`, and the install-seed route test in `hook-gate.test.ts`. `Manifest` is typed `Record<string, string | string[]>`, so `tsc` cannot catch a missed reader. The sweep is a search for `Object.entries(manifest)`, `Object.values(manifest)`, and `Object.keys(manifest)` under `scripts/ai-skills/`.
3. **Add the `umbrellas` key to two manifests.**
   - `.prism/architect/manifest.json` gets `[".prism/architect/_toolkit/audit-workflow.md", ".prism/architect/_toolkit/closing-messages.md", ".prism/architect/_toolkit/install-layout.md", ".prism/architect/_toolkit/plan-authoring.md", ".prism/architect/_toolkit/skills-ecosystem.md", ".prism/architect/_toolkit/spec-editing.md", ".prism/architect/_toolkit/ticket-workflows.md", ".prism/architect/guides/*.md", ".prism/rules/*.md"]`.
   - `templates/install/.prism/architect/manifest.stub.json` gets `[".prism/rules/*.md", ".prism/custom/rules/*.md"]`.
   - Every entry is a repo-relative pattern compiled by `compileMatcher`, not a route value. `_toolkit/manifest.base.json` gets no key. See Decision: The hook reads only the live manifest.
4. **Add `editContent(payload, filePath) => string` to every `HARNESSES` row** in `hooks/harnesses.mjs`. Declare it on `HarnessSpec` in both the JSDoc typedef and `harnesses.d.mts`, and add `new_string?`, `content?`, and `contents?` to `HookPayload.tool_input` in both, or `checkJs` fails with TS2339. Export `extractPatchAddedText(command: string | undefined, filePath: string): string` and declare it in the sidecar. Every row shares one accessor that reads `tool_input.new_string`, then `content`, then `contents`. `contents` is a guess at Cursor's spelling, and Cursor's names are unverified, matching the posture of its `emitDeny`. Cursor's row cannot run today, because `StrReplace` is unlisted and `emitDeny` returns `null`. Codex uses the same accessor for `Edit` and `Write`. Those names are unverified for Codex, which documents `apply_patch` as its edit tool. For `apply_patch` it reads only the `+` lines of the section whose `*** Add File:` or `*** Update File:` header names `filePath` (`extractPatchAddedText`). `MultiEdit` gets no accessor, because it is not in Claude's `toolKinds` or its `Write|Edit|Bash` registration, so the deny arm never sees it.
5. **Carry `umbrellaAcks` through route state** in `hooks/architect-route.mjs`. `loadRouteState` returns `{ read, announced, umbrellaAcks }`, defaulting each to `[]`. Both saves in `resolveArchitectNag` spread the loaded state, so a read between a deny and its retry keeps the acknowledgement. `ArchitectRouteState` in `architect-route.d.mts` gains `umbrellaAcks?: string[]`.
6. **Add the speed bump to `hooks/architect-route.mjs`** and call it from `runPreToolUseArm` in `hooks/hook.mjs`. It runs only for a `write` kind, and only when the read-credit check (`resolveDenyReason`) returned `null`.
   - `extractNewHeadings(editText, currentText)` returns the trimmed `##`–`######` lines the edit adds. A line the file already has does not count, nor does a `#` title or a line inside a fenced block in the edit text. A file being created has no headings, so every one it adds is new.
   - `resolveUmbrellaSpeedBump(repoRoot: string, scopeId: string, edits: { filePath: string; editText: string }[]): Promise<string | null>` takes the first umbrella file with unacknowledged headings. It saves every such heading as `<repo-relative path>\n<heading>` in `umbrellaAcks`, then returns the reason. A failed save logs to stderr and returns `null`. All the headings in one deny are acknowledged together, so one retry clears them.
   - `formatUmbrellaReason(relativePath: string, headings: string[], routes: string[], currentText: string): string` writes the deny text. For a path under `.prism/rules/` or `.prism/custom/rules/`, it names when the rule loads, read from its `load:` key (`always`, `paths`, or `skill`, with a missing key read as always). It points at `.prism/architect/guides/writing-an-architect-doc.md` § Where new content goes and `.prism/rules/writing-voice.md` § Keep it short enough to be read. For any other umbrella, it lists the routes that deliver the doc and points at the same placement section. Headings cap at three and routes at four, each with an `and N more` tail.
   - Declare `extractNewHeadings`, `formatUmbrellaReason`, and `resolveUmbrellaSpeedBump` in `architect-route.d.mts`.
   - Rewrite the `runPreToolUseArm` JSDoc paragraph "Nothing here writes state". Its narrower form is that the read-credit deny writes no state and the speed bump writes its acknowledgement before it denies.
7. **Write `scripts/ai-skills/umbrella-speed-bump.test.ts`.**
   - Unit tests cover `extractNewHeadings`, `extractPatchAddedText`, `listManifestRoutes`, `listManifestUmbrellas`, and `formatUmbrellaReason`.
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

### PR 3 — Delete Sol

All done. Verification for the whole PR: `pnpm prism:build` and `pnpm prism:check` pass, and a `git grep` for `Sol`, `prism-conductor`, and `conductorMayMerge` over tracked and untracked files returns nothing outside the history paths (plans, lessons, retros, audits, archived, research, qa, prds), `.prism/spec/adrs/`, and `CHANGELOG.md`.

1. **Delete the conductor.** Removed `.ai-skills/skills/prism-conductor/` and the whole `.prism/skills/prism-conductor/` tree (lib, steps), `docs/ai-skills/conductor.md`, the `roles.json` entry, the `prism-conductor` model pin in `scripts/ai-skills/generate-skills.ts`, the `.prism/skills/prism-conductor/**` route in `.prism/architect/manifest.json` and in `_toolkit/manifest.base.json` plus its seed twin, and the conductor-state block in `.gitignore`. The ADR entries in `seed-curation.json` stay, because the ADR files stay. `pnpm prism:build` removed the generated agent, skill, and Codex adapters.
2. **Resolve the tests that cited conductor files.** See Decision: Test dispositions for PR 3.
3. **Cut the dispatch contract from the surviving skills.** Removed the "When dispatched by Sol" section and the closing "return the verdict" sentence from every persona `shared.md` that carried them, and Nora's whole "In-loop decision-box mode" section. Cut § Reporting back from `skill-core.md`, § Worker emit pre-filter from `followup-scope.md`, the Orchestration personas section and every Sol mention from `skills-ecosystem.md` (and its curated twin), the Sol clauses in `branch-plan.md`, `worktree-mode.md` (and its twin), `skill-routing.md` (and its twin), `stakes-calibration.md` (the autonomy-ceiling section existed only for Sol), `plan-authoring.md`, `consumer-sync-flow.md`, the retro skill and its step-02, Reese's `verdict-contract.md` and `mode-ac-verification.md`, and both copies of the skill-authoring guide (the externalization example is now `prism-retro`). References that pointed at the removed `report-back.md` and the pre-filter are rewritten to plain "flag it as follow-up work" wording.
4. **Move merge authority to the main session.** Renamed `features.conductorMayMerge` to `features.mainSessionMayMerge` in `.ai-skills/config.json`, `config.schema.json`, `scripts/ai-skills/lib/onboarding-config.ts`, its test, `docs/parameterization.md`, and `onboarding/modes.md`. Rewrote `git-conventions.md` § Who merges (and the seed twin by build) so the main session may squash-merge when the flag is true, the review loop is clean, and the PR has no `review:has-minors` label. A reviewer persona or subagent never merges. The `modelTiers` schema and docs keep their keys and lose their Sol wording, because the review loop still reads `modelTiers.overrides`.
5. **Write the ADR.** `.prism/spec/adrs/_toolkit/0078-main-session-holds-merge-authority-and-the-conductor-is-retired.md`, indexed in the ADR README and classified `excluded` in `seed-curation.json`.
6. **Mark the retired ADRs.** Superseded by ADR-0078, with `Status: superseded`, `Superseded-by: 0078`, and the README row updated: 0048, 0049, 0050, 0051, 0052, 0053, 0054, 0055, 0056, 0061, 0066, and 0069. ADR-0067 was already superseded by the enforcement-floor revert and is left alone apart from the path edit below. ADR-0068 and ADR-0073 carry an amendment note. See Decision: Superseded versus amended ADRs. In ADRs 0048 to 0056, 0067, and 0069, links to the deleted conductor files lose their `.prism/skills/` or `.ai-skills/skills/` prefix so `crossref-lint` stops resolving them, and nothing else in those bodies changes.
7. **Clean the human docs.** Removed Sol from `README.md`, `SECURITY.md`, `docs/personas.md`, `docs/publishing-prism.md` (the conductor-state leak-audit pattern), and `docs/workflow.md`. `CHANGELOG.md` history is untouched. The `AGENTS.md` mentions sat in the generated rule block and went with the rule edits.
8. **Drop stale ship-closure tracking.** Removed the four `SHIP_CLOSURE_TRACKED_DANGLING_REFS` entries that nothing reaches any more (ADRs 0055, 0067, 0069, 0072), as `ship-closure.ts` instructs.

Retired ADRs, as AC-2 requires this PR to list them: 0048, 0049, 0050, 0051, 0052, 0053, 0054, 0055, 0056, 0061, 0066, 0069.

### PR 4 — Delete Sasha, Ren, Theo

All done. Verification for the whole PR: `pnpm prism:build` and `pnpm prism:check` pass, and a `git grep` for `Sasha`, `Ren`, `Theo`, `prism-debugger`, `prism-refactor-scout`, `prism-doc-walker`, and the three `-state.json` names returns nothing outside the history paths (plans, lessons, retros, audits, archived, research, qa, prds), `.prism/spec/adrs/`, and `CHANGELOG.md`. Two filename hits remain by design: the ADR filenames listed in `seed-curation.json`, and two plan filenames recorded in `.prism/audit-state.json`.

1. **Delete the three skills.** Removed `.ai-skills/skills/prism-debugger/`, `prism-refactor-scout/`, and `prism-doc-walker/`, the `.prism/skills/prism-doc-walker/` and `prism-refactor-scout/` step trees, the `.prism/references/debugger/` reference directory and its seed twin, `docs/ai-skills/ren.md` and `theo.md`, the three `roles.json` entries, and the Theo and Ren state-file blocks in `.gitignore`. Sasha never had a `.prism/skills/` tree. No manifest route and no `generate-skills.ts` model pin existed for any of the three. `pnpm prism:build` removed the generated agent, skill, and Codex adapters.
2. **Cut every handoff to or from them.** Removed their rows and handoff phrases from `skills-ecosystem.md`, `closing-messages.md`, `skill-routing.md` (routing row and named-invocation entries), `docs/personas.md`, and `docs/workflow.md`, plus the curated seed twins of each and `templates/install/AGENTS.md.tmpl`. Rewrote `plan-authoring.md`, `branch-plan.md`, `followup-scope.md`, `context-reuse.md`, `lazy-artifacts.md`, `acceptance-criteria.md`, `skill-authoring.md`, `writing-voice.md`, the surviving skills' handoff lines, the references that named them, the retro step files, `CONTEXT.md`, `README.md`, and `.ai-skills/config.schema.json` so none names a retired persona. See Decision: The bug workflow routes Nora to Clove.
3. **Resolve the tests.** See Decision: Test dispositions for PR 4.
4. **Retire the ADRs.** `.prism/spec/adrs/_toolkit/0079-debugger-refactor-scout-and-doc-walker-are-retired.md` supersedes 0041 and 0042, which now carry `Status: superseded` and `Superseded-by: 0079`. ADRs 0014, 0036, and 0045 carry an amendment note. The new ADR is indexed in the ADR README and classified `excluded` in `seed-curation.json`. In 0041 and 0042 the links to the deleted state docs lose their `.prism/skills/` prefix so `crossref-lint` stops resolving them. See Decision: Superseded versus amended ADRs in PR 4.
5. **Drop stale ship-closure tracking.** Removed the `SHIP_CLOSURE_TRACKED_DANGLING_REFS` entry for ADR-0058, which nothing reaches any more, as `ship-closure.ts` instructs.

Retired ADRs, as AC-2 requires this PR to list them: 0041, 0042.

### PR 5 — Shared core and the loaded-lines check

1. **Delete `.prism/references/skill-core.md` and `.prism/references/session-close.md`**, with their seed twins and the `skill-core.md` entry in `seed-curation.json`. See Decision: The shared skill core is cut, not thinned.
2. **Remove every citation** of both files. That covers the Step 0 line in each skill body and the session-close pointer before each skill's lesson signals, which becomes **Before closing the session:** with the signals unchanged. It also covers `skills-ecosystem.md` § The shared skill core and its curated twin, the Cursor sentence in `docs/ai-skills/compatibility.md`, and the hosts-without-hook message in `doctor.ts`.
3. **Add `scripts/ai-skills/lib/skill-loaded-lines.ts`** (`countLines`, `listCitedFiles`, `measureSkillLoad`) and `scripts/ai-skills/skill-loaded-lines.test.ts`. The test holds every skill to 120 loaded lines, and `OVER_CAP_ALLOWLIST` names the PR that thins each one still over.
4. Verify with `pnpm prism:check`.

### PR 6 — Review lane

All done. Verification for the whole PR: `pnpm prism:build` and `pnpm prism:check` pass, `measureSkillLoad` reports 120 lines or fewer for both skills, and a `git grep` for `prism-code-review-self`, `prism-code-review-pr`, and `code-review-(self|pr)/` returns nothing outside the history paths (plans, lessons, retros, audits, archived, research, qa, prds), `.prism/spec/adrs/`, and `CHANGELOG.md`.

1. **Land the doctrine.** The earlier commit on this branch wrote ADR-0080, rewrote `.prism/rules/skill-authoring.md`, set the body layout in `.prism/architect/guides/writing-a-skill.md`, and removed the `prism-skill-forge` copy of the skill guide.
2. **Rename the two skills.** `prism-code-review-self` became `prism-self-review` and `prism-code-review-pr` became `prism-pr-review`, in the skill directories, `roles.json`, frontmatter `name`, the manifest routes (`.prism/architect/manifest.json`, `_toolkit/manifest.base.json` and its seed twin, `manifest.stub.json`), `verify-manifest-coverage.ts`, `bootstrap-from-claude.ts`, the `skill-loaded-lines.test.ts` allowlist, `docs/personas.md`, `templates/install/AGENTS.md.tmpl`, and every rule and architect doc that named them (`skill-routing.md`, `context-reuse.md`, `architect-doc-verification.md`, `design-governance.md`, `followup-scope.md`, `implementation-task-detail.md`, `branch-plan.md`, `skills-ecosystem.md`, and the curated twins). `generate-skills.ts` needed no change, because the `opus` and `sonnet` pins come from each skill's `frontmatter.yml`. The `.prism/references/code-review-pr/` directory became `.prism/references/pr-review/`.
3. **Thin both skills to the four tests.** See Decision: What the review skills kept. `prism-self-review` loads 56 lines and `prism-pr-review` loads 109.
4. **Delete the references the skills no longer load.** See Decision: Why each review reference could go.
5. **Re-point the surviving citations.** `prism-review-loop/shared.md` now cites `prism-self-review` § Severity and the resolve-threads step, and `code-standards.md` names the two skills for the reviewer-side removal check. `shipping-flow.md` and `skills-ecosystem.md` (and its twin) no longer say the PR reviewer flips a PR ready.
6. **Drop stale tracking.** Removed the `SHIP_CLOSURE_TRACKED_DANGLING_REFS` entry for ADR-0011, which no shipped file links any more, and the `references/review-docs-impact.md`, `references/worktree-mode.md`, and `references/review-angles.md` entries in `seed-curation.json`.

### PR 7 — Build lane

All done. Verification for the whole PR: `pnpm prism:build` and `pnpm prism:check` pass, `measureSkillLoad` reports 120 lines or fewer for all three skills, and a `git grep` for `prism-code-dev`, `prism-documentation`, `references/code-dev`, `references/documentation`, and `references/pixel` returns nothing outside the history paths (plans, lessons, retros, audits, archived, research, qa, prds), `.prism/spec/adrs/`, and `CHANGELOG.md`.

1. **Rename two skills.** `prism-code-dev` became `prism-implement` and `prism-documentation` became `prism-docs`, in the skill directories, `roles.json`, frontmatter `name`, `docs/personas.md`, `docs/parameterization.md`, `docs/adopting-into-existing-repos.md`, `CONTEXT.md`, `bootstrap-from-claude.ts`, the tests that used the old IDs as fixtures, `skills-ecosystem.md` and `business-layer.md` (with their curated twins), and the other skills that named them (`prism-self-review`, `prism-pr-review`, `prism-customer-success`). `prism-design` keeps its ID. No manifest route, `seed-curation.json` entry, or `generate-skills.ts` pin named any of the three.
2. **Thin all three to the four tests.** See Decision: What the build skills kept. `prism-implement` loads 58 lines, `prism-docs` 113, and `prism-design` 32.
3. **Delete the references the skills no longer load.** See Decision: Why each build reference could go. That covers `.prism/references/code-dev/`, `.prism/references/documentation/`, and `.prism/references/pixel/` with their seed twins, and `prism-design/lib/`.
4. **Re-point the surviving citations.** `code-standards.md` (and its twin) no longer points at the removed "Scope discipline" and "Drive-by refactoring" sections, `closing-messages.md` (and its twin) points at `prism-design`'s `## Handoff`, and `branch-plan.md` (and its twin) names `implement` in the plan-lookup list. The `rules/implementation-task-detail.md` citation of `prism-design` § States still resolves, because the skill keeps a `## States` section.
5. **Drop stale tracking.** Removed the three build-lane entries from `OVER_CAP_ALLOWLIST` and the five `literal-allowlist.json` entries that exempted the old skill's THR-1881 citation, which the thinned body no longer carries.
6. **Fix a PR 6 side effect.** `prism-self-review` named `documentation.md` by path, which the loaded-lines rule in PR 5 charges in full. It now says "the documentation architect doc", which keeps the skill at 56 lines.

### PRs 8–11

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

- **Test dispositions for PR 3.** A test that only guards conductor files is deleted, and a test that guards something alive keeps its assertion with the conductor part dropped.
  - **Deleted:** `verdict-enum-parity.test.ts` (read `report-back.md`, the conductor `claude.md`, `conductor.md`, and the schema quoted in `skill-core.md`), `phase-chain-parity.test.ts` (read the conductor's `step-04-dispatch.md` and `goal-state.md`), and `phase-completeness-gate.test.ts` (read `step-05-route.md` and `step-10-report.md`). Every file they assert on is gone.
  - **Kept, conductor assertions dropped:** `claude-agent-def.test.ts` now asserts that the architect defaults to opus and other personas to sonnet, because the model map is still alive for the architect.
  - **Kept, fixture renamed:** `spec-scope-lint.test.ts` used `prism-conductor` as an example skill directory for the discriminator tests. It now uses `prism-example-skill`, so the tests no longer depend on any real skill that a later PR deletes or renames.
  - **Kept, flag renamed:** `onboarding-config.test.ts` asserts that an unknown `features` field survives a reconfigure, using the new flag name. `literal-guard.test.ts` swapped a Sol sentence in a fixture string for an Iris one.

- **Superseded versus amended ADRs.** An ADR whose whole decision describes the conductor, or the delivery of its authority, is superseded. An ADR whose decision stands minus one clause is amended with a note.
  - **Superseded:** 0048 to 0056 (conductor design), 0061 and 0066 (Sol's merge authority and its flag), and 0069 (ratification as a Sol pipeline stage, plus its rule against gates on Sol's report-back channel).
  - **Amended:** 0068 loses its Sol auto-dispatch clause, and 0073 loses the autonomy-ceiling axis, but the retro charter and the `quick` / `reviewed` / `strict` rename stand.
  - **Left alone:** 0067 (already superseded by the floor revert), 0063 (lists `conductor-state*.json` among files that must never publish, a historical list), 0064 (cites 0061 as history), and 0072 (cites 0067 and 0069 as history).

- **The bug workflow routes Nora to Clove, with no new persona.** Sasha was the confirm-root-cause step between Nora's scaffold and the fix.
  - **Chosen approach:** Clove confirms the root cause against the code before fixing, records the confirmed finding in `## Debugged Issues`, and offers the tracker sync that Sasha used to offer. Nora's closing handoff, `ticket-workflows.md` § Bug and § Bug Report Lifecycle, the ticket-types template, the bug-report template, and the handoff tables all say so. `## Debugged Issues` stays a plan section, and `plan-authoring.md` lists Clove as its writer with a note that any implementer may write it.
  - **Alternatives considered:** a diagnosis mode in the implement skill. Not done here, because the implement skill is rewritten in PR 7 and ADR-0079 records that no skill text was added.
  - **Gap:** nothing now enforces ranked hypotheses or instrumentation cleanup. ADR-0079 records that as a negative.

- **Test dispositions for PR 4.** No test guarded only the three skills, so none is deleted.
  - **Kept, citation retargeted:** `crossref-lint.test.ts` used `.prism/sasha-state.json`, `ren-state.json`, and `theo-state.json.tmp` as examples of lazy state files, which the linter matches with one generic pattern. The assertions now use `iris-state.json`, `audit-state.json`, and `iris-state.json.tmp`, and the comment in `crossref-lint.ts` names Iris's file.
  - **Kept, guard caught a curated twin:** `routing-coverage.test.ts` failed on the seed `skill-routing.md` until its Sasha row and the Theo and Ren entries were removed by hand. That is the guard working as intended, so it is unchanged.
  - **Script data, not a test:** the `thrive-debugger` to `prism-debugger` entry in `bootstrap-from-claude.ts` is removed, because its target skill no longer exists.

- **Superseded versus amended ADRs in PR 4.** Only Theo and Ren had ADRs of their own. Sasha had none.
  - **Superseded:** 0041 (Theo) and 0042 (Ren) by 0079. Both used a bold `**Status:**` header rather than frontmatter, so the header became frontmatter with `Status: superseded` and `Superseded-by: 0079`. Otherwise the bodies are unchanged.
  - **Amended:** 0014 loses Sasha as the `## Debugged Issues` writer, 0036 loses Sasha as a security checker, and 0045 loses Ren, Theo, and the debugger from its examples. Each decision stands.
  - **Left alone:** 0004, 0007, 0018, 0037, 0043, and 0064 name the personas as history or as examples. 0038 and 0058 concern paired dev docs, which 0058 had already retired.

- **Two always-on rules lose Theo's and Sasha's traces.** `.prism/rules/response-shape.md` drops the write/skip/defer prompt from its decision-gate examples. That prompt was Theo's, and `writing-voice.md` had already lost the same example. `.prism/rules/skill-routing.md` adds every debugging phrase Sasha's row carried to the implementer's row, because they would otherwise match no row. `.prism/rules/branch-plan.md` drops "a diagnostician" from its plan-only-commit example, since the diagnostician was Sasha.

- **`micro-file-step-machine.md` keeps its lighter-variant section with no exemplar.** Sasha was the only persona using the state-file-only variant. The pattern text is generic and still valid, so it stays. The Theo, Ren, and Sasha bullets and the Sasha paragraph are cut. The reference now cites Parker and Iris.

- **The `needs-fix` / `needs-replan` / `found-followup-work` vocabulary survives in per-skill persona prose only.** Its only defined consumer was Sol. The shared sites that told every run to escalate by typed verdict are fixed in this PR: `session-orientation.md` and `skill-core.md` § Orientation now say to state the blocker and the default taken in the closing message, `prism-handoff` points at the same wording, and the "orchestrated run" and "dispatched run" phrases in `prism-review-loop` Procedure G and Zoe's escapes are gone. The per-lane rewrites in PRs 5 to 11 retire the rest with each skill. Cutting it now would rewrite skill logic the stack replaces later.

- **`modelTiers` keeps only `overrides`.** Nothing reads `top` or `worker` once Sol is gone: no script, test, or skill references them, and the review loop reads only `modelTiers.overrides.eric`. The schema and `docs/parameterization.md` drop the two keys and the "Model tiering" section is now "Model overrides". A consumer config that still sets `top` or `worker` keeps validating, because the object does not forbid extra keys.

- **Each stack branch absorbs the squash below it with `git merge -X ours origin/main`.** This is the user's instruction for this stack.
  - **Root cause:** after a lower PR squash-merges, `main` holds its changes as one commit while the next branch still holds them as several. That is the squash-upstream trap `.prism/rules/git-conventions.md` § Keeping a Branch Current describes.
  - **Alternatives considered:** rebasing the remainder onto `origin/main`, the rule's remedy. It rewrites a branch that is already pushed with an open PR.
  - **Chosen approach:** `-X ours` resolves each conflict with the branch's side, which already contains the squashed content. The risk is that it also silences a real conflict with unrelated work on `main`, in a file both sides edited. The compensating check runs after every absorb. For every file the merged-in commits touched, this stack's own squash included, `git diff origin/main HEAD -- <file>` must show only this PR's own edits. The stack's own squash is the likeliest source of a loss: a branch that absorbed an earlier head of the PR below still carries older copies of that PR's late review fixes, and `-X ours` keeps them. Tests stay green when that happens, because the old code and the old tests agree. Merging the lower PR's final head into the branch before that PR squashes prevents it. Then `pnpm prism:check` must pass.

- **The hook reads only the live manifest, so `umbrellas` reaches new installs, not existing ones.** `loadManifest` in `hooks/architect-route.mjs` reads `.prism/architect/manifest.json` alone. That file is consumer-owned, and `prism update` never rewrites it. So the key ships in the install stub. An existing consumer opts in by adding it by hand, and the compatibility doc says how. `_toolkit/manifest.base.json` carries no key, because nothing reads umbrellas from it.

- **`umbrellas` is a reserved key in a flat manifest.** PRISM's manifest maps patterns to docs at the top level, unlike thrive's sectioned manifest. A top-level `umbrellas` array would otherwise read as a route whose pattern is the literal word `umbrellas`. Every reader skips the key through `listManifestRoutes` in `hooks/lib/match.mjs`.
  - **Alternatives considered:** a separate `umbrellas.json`. That would be one more file for each consumer to keep in step with the manifest it describes.

- **Umbrella membership is a hand-kept list.** An umbrella covers a wide area by design, and no route shape can read that intent. The members are the `_toolkit/` docs routed over whole trees of spec content, plans, or skills (`plan-authoring.md` among them, routed over every template and plan), the writing guides (each routed over one whole content area), and the rules glob. `hook-runtime.md` is a topic doc routed by the hook paths alone, so it is not on the list.

- **The rules entry is one glob, and the deny wording reads each rule's `load:` key.** The intent names "the always-on rules". This widens that to every rule, because a `paths` or `skill` rule still loads into every session its trigger reaches. `.prism/rules/*.md` catches the next rule file added, the same way the build loads every rule in the directory. Not every rule is always-on: `load: paths` and `load: skill` rules load on narrower triggers. So the deny states the trigger the rule actually has rather than claiming every rule loads in every session.

- **A plan folder is resolved by `resolveLivePlan` before the flat tiers.** `spec-scope-lint` resolves the branch's plan through that function, and a folder plan was invisible to it, so the lint printed "no live plan resolved" and passed every PR in this stack. `.prism/rules/branch-plan.md` § Plan Lookup and `.prism/references/plan-lookup.md` still describe flat plans only, until phase 2 adds plan folders to both. Until then, a persona working on this stack is handed `.prism/plans/prism-499/plan.md` by path.

- **The speed bump's gaps are recorded, not papered over.**
  - **Cursor gets none.** No install path writes a Cursor hook file, and `HARNESSES.cursor.emitDeny` returns `null` (`.prism/architect/_toolkit/hook-runtime.md` § Hook runtime). The Cursor test asserts the edit passes.
  - **A shell edit bypasses it.** A `Bash` command carries no edit text, so `cat >> rule.md` adds a heading unseen. The read-credit gate still applies to that command.
  - **Codex `Edit` and `Write` field names are unverified.** A wrong guess yields no edit text and lets the edit pass, which is the direction every hook failure takes.
  - The docs name all three.

- **The shared skill core is cut, not thinned.** Every section of `skill-core.md` restated an always-on rule. Orientation restated `session-orientation.md`, the plan section `branch-plan.md`, reading-before-writing `context-reuse.md`, closing `session-orientation.md` again, and the context budget `bash-output-minimization.md` and `subagent-strategy.md`. Every section of `session-close.md` likewise restated an always-on rule or a routed doc: the rule-loading tiers, `self-improvement-loop.md`, and `lesson-promotion.md`. Each section fails the policy test, because the model already reads the rule it restates. The intent says content that fails a test is cut, not moved, so both files go.
  - **Alternatives considered:** thinning `skill-core.md` to a few pointers. Each pointer would still cost every skill lines for a rule the session already holds.
  - **Persona-specific lesson signals stay** in each skill body under **Before closing the session:**, until each lane PR applies the four tests to them.
  - **Side effect:** skill bodies still tell a run to emit `needs-human`, `needs-replan`, or `blocked`, and nothing defines those words now. PR 3 retired their only consumer. Each lane PR cuts those instructions in the skills it thins.

- **The loaded-lines check measures the transitive closure, including bare step names.** `measureSkillLoad` counts the body, plus every reference, step, and `load: skill` rule file the body cites, followed through those files. A bare `step-NN-*.md` name is resolved under `.prism/skills/<id>/`.
  - **Root cause:** counting direct citations only lets a skill cite one step file that cites the next and charge only the first. The baseline's Loaded column also missed step files a body names without their directory, so `prism-prd` and `prism-retro` measured far below what a run reads: 902 and 717 lines once PR 5 counts them, against 536 and 586 in the baseline.
  - **Chosen approach:** this check is now the canonical measurement, and it supersedes § Baseline § Method's Loaded definition for every number after PR 5.
  - **Shrink-only allowlist:** an allowlisted skill that comes in under the cap fails the test until its entry is removed. A listed skill that grows past its recorded `max` fails too, so an entry can neither sit stale nor hide a regression.
  - **Templates count; architect docs don't.** A template a body cites is read by the run, so `.prism/templates/` counts. An architect doc loads by manifest route whatever skill runs, so it is measured with the routed docs, not charged to the skill.
  - **A link spelled for the generated tree resolves too.** Skill sources cite `../../references/x.md` as it reads from `.claude/skills/<id>/`. That spelling resolves nowhere from the source tree, and it resolves under `.prism/` instead. Without this, the check undercounted every skill citing `shipping-flow.md` by 98 lines.
  - **The parser is local.** Neither `crossref-lint.ts` nor `ship-closure.ts` resolves the three spellings a skill body uses: the platform-tree link, the `<repo-root>/` token, and a bare step name.

- **First-pass clean needs a human-written signal.** GitHub cannot separate agent comments from human ones in this repo, so the baseline is an upper bound. **Default path (until a later phase adds the signal):** report the upper bound, and do not claim movement on criterion 1 from GitHub data alone.

- **What the review skills kept.** Each line below survives because other parts of the system read it, and the rest of the old bodies failed the policy test (voice, "How X Thinks" lenses, greetings, batteries, generic review method, restated rules, the Sol-era verdict vocabulary).
  - **`prism-self-review`:** reports in chat only and never posts to GitHub; reviews `git diff ${DEFAULT_BRANCH}...HEAD`; Critical, Major, and Minor with one-line definitions; plan fidelity (a contradicted Decision is Major); source-verified review when the diff has architect docs; the removal-and-rename search; the `## Review Issues` entries, the `No issues found — <date>` line, `## PR Readiness`, and AC adjustments as `proposed`; the plan-only commit with its staged-set check; plan-file scope; bookkeeping-only Minors count as clean; the review-loop surfaces; no unqualified ready over a partial review; and the handoff rules (authors ship, route fixes to the implementer, recommend a fresh-chat PR review).
  - **`prism-pr-review`:** posts inline comments, one summary comment, and labels; never approves; stays in draft; the PR identifier forms; in-branch default with the three worktree triggers; Standards and Spec findings under separate headings; the AC-verification sampling rule; the three states and the label policy that `git-conventions.md` § Who merges reads; the resolve-threads step that `prism-review-loop` depends on; plan-file scope; the review-loop surfaces.
  - **Judgment calls:** the parallel Standards and Spec subagents and the lightweight docs-only path are cut, and the two headings stay. The subagents were an orchestration choice, not a policy a hook enforces, and the cap cannot hold the phases that describe them. The nine-angle coverage block, its status vocabulary, and the pass-bounded cap on `confidence:high` are cut with `review-angles.md`, replaced by one line that a partial review never reports an unqualified ready. The `labels.md` strip loop missed `confidence:standards-only`, so a stale label survived a re-review. The new loop strips it.

- **Why each review reference could go.** A reference is cut when it fails the policy test and nothing else needs it. The files below are named because the spec-scope lint matches deleted `review-*` references by basename.
  - **`review-angles.md`:** the nine angles are generic review method, and the coverage block is the only PRISM-specific part. Only the two review skills read it, so it goes with their pass-bounded label cap.
  - **`review-justification.md`:** the four-question abstraction procedure restates `code-standards.md` § General (one adapter does not earn an abstraction).
  - **`review-doc-class-triage.md`:** a copy of `architect-doc-verification.md`, which the skills now cite directly.
  - **`review-docs-impact.md`:** one line in `prism-self-review` replaces it, pointing at the mapping in `documentation.md`.
  - **`review-frameworks.md`:** severity definitions moved into the skills, and the removal-and-rename search became a line in each. The two other users, `prism-review-loop` and `code-standards.md`, are re-pointed to the skills.
  - **`worktree-mode.md`:** generic git-worktree mechanics. The four PRISM-specific rules (return with `;`, detached-HEAD push, check-only formatting, tear down on every exit) became lines in `prism-pr-review`. `branch-plan.md` already states the full-ref push form.
  - **`pr-review/context-gathering.md`, `gotchas.md`, `labels.md`, and `summary-template.md`:** merged into `pr-review/github-writes.md` where PRISM-specific (the marker, REST for labels, the 422 rule, the label table) and cut elsewhere (generic `gh` calls, batching advice, the Write-tool temp-file workaround).
  - **Kept for other skills:** `structural-remedies.md` (the architect uses it), `architect-context.md`, `plan-lookup.md`, and `cleanup-pass.md` (the commit hook names it). The review skills no longer cite them, so none counts against their cap.

- **The PR reviewer leaves the PR in draft.** The old reviewer ran `gh pr ready` in state #3. The labels it applies are exactly what `git-conventions.md` § Who merges reads, so a flip inside the review pass could open the merge gate on a label the reviewer picked a moment earlier. The flip now belongs to the main session once the merge conditions hold. `shipping-flow.md` § Draft-by-default and the `skills-ecosystem.md` roster (with its curated twin) say so.

- **The summary-comment marker keeps its old spelling.** `<!-- code-review-pr-summary -->` is the first line of every summary comment already on open PRs. Re-runs find the comment by it, so renaming the marker would post a duplicate on every PR reviewed before the rename. It is the one `code-review-pr` string the rename sweep leaves, and the reference says why.

- **Always-on rules edited in PR 6.** These edits are the rename and the two re-points above, and nothing else in them changed: `.prism/rules/skill-routing.md` (routing rows, with its curated twin and `templates/install/AGENTS.md.tmpl`), `.prism/rules/context-reuse.md` (citation list), `.prism/rules/architect-doc-verification.md` (who runs it, with its twin), `.prism/rules/design-governance.md`, `.prism/rules/followup-scope.md`, `.prism/rules/implementation-task-detail.md` (with its twin), `.prism/rules/branch-plan.md` (the skill names under `## Review Issues` and `## PR Readiness`, and the push clause that cited `worktree-mode.md`, with its twin), and `.prism/rules/code-standards.md` (the reviewer-side pointer in § Removal and rename completeness).

- **What the build skills kept.** Each line survives because a gate, a rule, or another skill reads it. The rest of the old bodies failed the policy test: voice, greetings, "How X Thinks" lenses, batteries, generic engineering, design, and writing method, restated rules, and the Sol-era verdicts (`needs-replan`, `blocked`, `found-followup-work`, `needs-human`).
  - **`prism-implement`:** resolves the plan first and presents `open` Debugged and Review Issues; loads the routed architect docs; verifies external dependencies at the source; on a bug ticket confirms the root cause, records it under `## Debugged Issues`, and offers the tracker post; stays in the local frame per `code-standards.md` § Refactor scope; routes UI gaps to `prism-design` and plan-breaking changes to the plan skill; proposes AC changes as `proposed` and syncs the ticket once accepted; records fixed issues, one `## History` line, and timeless `## Decisions` in one plan pass; pre-flights AC without claiming a graded verdict and sends a disputed UNMET to the plan skill; runs the checks, the cleanup pass, and git-conventions commits; ships through the pause preference, `gh pr create --draft`, and the PR title and body lines (body sync per push, `--body-file`, `#N` escaping); proposes `prism-self-review` and never invokes it.
  - **`prism-docs`:** reads the `documentation.*` config and never assumes a path or audience; resolves the source and audience; checks the plan's identifiers against the codebase; updates before creating and checks siblings; follows `user-doc-template.md` and builds a control inventory for user docs; the frontmatter schema lives in the architect doc; post-write sidebar, index, cross-reference, and plan updates; ships its own docs PR as a draft with prettier on Markdown only.
  - **`prism-design`:** never writes code; the three modes with their save triggers, the mode 2 path and section order, the `## Design` summary and its Status values, and the HTML-only-on-request rule; `## States` (the five-state doctrine the task-detail rule cites); an approved mock is the design; reuse before inventing; every saved spec routes through the plan skill, a mode 1 gap-fill returns to the implementer.
  - **Judgment calls.** `prism-docs` cites `user-doc-template.md` (87 lines) because the template is the doc format, and the callout reference it cited is now named only by the documentation architect doc, so the closure stops there. The dev template is reached through the architect doc's split-audience paragraph, which is an architect doc the cap does not charge. `prism-implement` states the PR title and body shape inline and does not cite `pr-description.md` (88 lines) or its template, because either one would put it over the cap. The `ac-adjustment` reference is gone and `acceptance-criteria.md` is not cited, for the same reason.

- **Why each build reference could go.** A reference is cut when it fails the policy test and nothing else needs it.
  - **`code-dev/ac-adjustment.md` and `code-dev/decisions-temporal-scan.md`:** two lines in `prism-implement` carry each, and a 24-line and a 19-line file were more than the policy needed.
  - **`code-dev/formatting.md`:** the check-before-you-write discipline is one clause in `prism-implement`. The formatting-only fast path is generic tool use.
  - **`code-dev/engineering-frameworks.md`:** SOLID, debugging, refactoring, and testing method the model applies unprompted.
  - **`documentation/startup.md`, `codebase-read.md`, `after-writing.md`, and `frameworks.md`:** the config read, source resolution, audience, sibling check, and post-write steps are lines in `prism-docs`. The sub-agent split for mixed frontend and backend diffs was an orchestration choice, and the Divio and readability frameworks are model-resident.
  - **`pixel/frameworks.md` and `pixel/pattern-vocabulary.md`:** a catalog of named design frameworks and tactical patterns the model already knows.
  - **`pixel/mock-spec-template.md`:** the section order is one line in `prism-design`, and the detail bar already lives in `implementation-task-detail.md`. The template's verbatim wireframe scaffolding restated both.
  - **`prism-design/lib/output-modes.md` and `handoff-procedures.md`:** the mode triggers and the route-through-the-plan-skill invariant are in the body, and the Procedures C and E were generic.
  - **Kept for other skills:** `shipping-flow.md` (the changelog and QA skills still cite it, so it stays until PR 10), `architect-context.md`, `plan-lookup.md`, `cleanup-pass.md`, `doc-callouts.md`, and both doc templates. `prism-implement` and `prism-docs` no longer load `shipping-flow.md`, so its Clove and Eli rows describe skills that now state the flow themselves.

- **Always-on rules edited in PR 7.** The edits are renames and re-points, and nothing else in them changed: `.prism/rules/skill-routing.md` (the two routing rows, with its curated twin and `templates/install/AGENTS.md.tmpl`), `.prism/rules/context-reuse.md` (citation list), `.prism/rules/design-governance.md` (who runs it), `.prism/rules/branch-plan.md` (the plan-lookup skill list), and `.prism/rules/code-standards.md` (the pointer to the implementation skill's removed sections). Each has a seed twin that the build or the sweep updated to match.

---

## Sessions

- 2026-10-17 [huntermcgrew/prism-499-ai-native-sdlc] open: Intent — phase 1 of the AI-native SDLC port; Bounds — baseline, four deletions, rename and thin, umbrella speed bump, no phase-2 artifacts; Approach — stack of PRs, review loop on each, merge in order

---

## History

- 2026-10-17 [huntermcgrew/prism-499-ai-native-sdlc]: Recorded the phase-1 baseline and the stack plan.
- 2026-10-17 [huntermcgrew/prism-499-ai-native-sdlc]: Self-review pass 1 fixes. Rewrote the PR 2 tasks to the shipped design and added the folder tier to `resolveLivePlan`.
- 2026-10-17 [huntermcgrew/prism-499-umbrella-speed-bump]: Shipped the umbrella speed bump per PR 2 tasks 1–8. The new `hook-runtime.md` section is a `###` under `## Write gate`, since it is part of the write gate.
- 2026-10-17 [huntermcgrew/prism-499-delete-sol]: Deleted Sol and the conductor tree, moved merge authority to the main session as `features.mainSessionMayMerge`, and wrote ADR-0078. Superseded ADRs 0048 to 0056, 0061, 0066, and 0069 and amended 0068 and 0073.
- 2026-10-17 [huntermcgrew/prism-499-delete-sol]: Self-review pass 1 fixes. Brought the curated `branch-plan.md` twin and the shared no-user wording in line with the Sol removal, defined `ac-defect`, trimmed `modelTiers` to `overrides`, and added the label-dependence negative to ADR-0078.
- 2026-10-17 [huntermcgrew/prism-499-delete-sol]: Restored four #501 files the `-X ours` absorb had reverted to pre-review copies, and widened the absorb check to every file the squash touched; see Decision: Each stack branch absorbs the squash below it.
- 2026-10-17 [huntermcgrew/prism-499-delete-sol]: PR review pass 1 fixes. The merge condition now names the final pass's clean state, since a missing label alone proves nothing. The review loop defers to § Who merges, and the legacy conductor-state ignores stay so older checkouts can't commit them.
- 2026-10-17 [huntermcgrew/prism-499-delete-sasha-ren-theo]: Deleted Sasha, Ren, and Theo with their step trees, references, docs, and every handoff; ADR-0079 supersedes 0041 and 0042; the bug workflow now runs Nora to Clove.
- 2026-10-17 [huntermcgrew/prism-499-shared-core]: Cut `skill-core.md` and `session-close.md` and added the loaded-lines check with a shrink-only allowlist; see Decision: The shared skill core is cut, not thinned.
- 2026-10-17 [huntermcgrew/prism-499-review-lane]: Renamed Briar and Eric to `prism-self-review` and `prism-pr-review`, thinned each to the four tests (56 and 109 loaded lines), and deleted ten reference files. The PR reviewer now leaves the PR in draft; see Decision: What the review skills kept.
- 2026-10-18 [huntermcgrew/prism-499-build-lane]: Renamed Clove and Eli to `prism-implement` and `prism-docs`, thinned both and `prism-design` to the four tests (58, 113, and 32 loaded lines), and deleted the `code-dev`, `documentation`, and `pixel` references; see Decision: What the build skills kept.

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
