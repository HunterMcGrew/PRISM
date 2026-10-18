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
3. **Thin both skills to the four tests.** See Decision: What the review skills kept. `prism-self-review` loads 62 lines and `prism-pr-review` loads 114.
4. **Delete the references the skills no longer load.** See Decision: Why each review reference could go.
5. **Re-point the surviving citations.** `prism-review-loop/shared.md` now cites `prism-self-review` § Severity and the resolve-threads step, and `code-standards.md` names the two skills for the reviewer-side removal check. `shipping-flow.md` and `skills-ecosystem.md` (and its twin) no longer say the PR reviewer flips a PR ready.
6. **Drop stale tracking.** Removed the `SHIP_CLOSURE_TRACKED_DANGLING_REFS` entry for ADR-0011, which no shipped file links any more, and the `references/review-docs-impact.md`, `references/worktree-mode.md`, and `references/review-angles.md` entries in `seed-curation.json`.
7. **Address self-review pass 1.** `prism-skill-forge` now sends authors to the `writing-a-skill.md` guide and the four tests, and drops the voice and lens input, with its allowlist `max` re-measured (PR 9 thins it). Both review skills regain the coverage rule (sweep the whole range, and on a re-review re-run what the prior pass left unfinished), the four code smells, and the Atlas domain-context anchor. Self-review also proposes AC when the plan has none, widens its docs check to rule and architect files and a consumer's conventions doc, and no longer names an architect doc by path, which had pushed it to 180 lines under the stricter check. Both name the implementing and docs skills by their PR 7 IDs. `CONTEXT.md`, `skills-ecosystem.md` (and its twin), and `structural-remedies.md` no longer say the reviewers carry a voice or load the remedy file.

### PR 7 — Build lane

All done. Verification for the whole PR: `pnpm prism:build` and `pnpm prism:check` pass, `measureSkillLoad` reports 120 lines or fewer for all three skills, and a `git grep` for `prism-code-dev`, `prism-documentation`, `references/code-dev`, `references/documentation`, and `references/pixel` returns nothing outside the history paths (plans, lessons, retros, audits, archived, research, qa, prds), `.prism/spec/adrs/`, and `CHANGELOG.md`.

1. **Rename two skills.** `prism-code-dev` became `prism-implement` and `prism-documentation` became `prism-docs`, in the skill directories, `roles.json`, frontmatter `name`, `docs/personas.md`, `docs/parameterization.md`, `docs/adopting-into-existing-repos.md`, `CONTEXT.md`, `bootstrap-from-claude.ts`, the tests that used the old IDs as fixtures, `skills-ecosystem.md` and `business-layer.md` (with their curated twins), and the other skills that named them (`prism-customer-success`). `prism-design` keeps its ID. No manifest route, `seed-curation.json` entry, or `generate-skills.ts` pin named any of the three.
2. **Thin all three to the four tests.** See Decision: What the build skills kept. `prism-implement` loads 63 lines, `prism-docs` 117, and `prism-design` 36.
3. **Delete the references the skills no longer load.** See Decision: Why each build reference could go. That covers `.prism/references/code-dev/`, `.prism/references/documentation/`, and `.prism/references/pixel/` with their seed twins, and `prism-design/lib/`.
4. **Re-point the surviving citations.** `code-standards.md` (and its twin) no longer points at the removed "Scope discipline" and "Drive-by refactoring" sections, `closing-messages.md` (and its twin) points at `prism-design`'s `## Handoff`, and `branch-plan.md` (and its twin) names `implement` in the plan-lookup list. The `rules/implementation-task-detail.md` citation of `prism-design` § States still resolves, because the skill keeps a `## States` section.
5. **Drop stale tracking.** Removed the three build-lane entries from `OVER_CAP_ALLOWLIST` and the five `literal-allowlist.json` entries that exempted the old skill's THR-1881 citation, which the thinned body no longer carries.
6. **Leave the review skills to PR 6.** Their bodies already name the build skills by their new IDs, and `prism-self-review` no longer names an architect doc by path, so this PR makes no edit to either review skill.

### PR 8 — Flow entry

All done. Verification for the whole PR: `pnpm prism:build` and `pnpm prism:check` pass, `measureSkillLoad` reports 120 lines or fewer for `prism-start-ticket` and `prism-onboard`, and a `git grep` for `prism-architect`, `prism-ticket-start`, `prism-onboarding`, `references/architect/`, and `references/ticket-start/` returns nothing outside the history paths (plans, lessons, retros, audits, archived, research, qa, prds), `.prism/spec/adrs/` and its generated copies under `.claude/`, `.codex/`, and `.cursor/`, and `CHANGELOG.md`.

1. **Rename three skills.** `prism-architect` became `prism-plan`, `prism-ticket-start` became `prism-start-ticket`, and `prism-onboarding` became `prism-onboard`, in the skill directories, `roles.json`, frontmatter `name`, the `opus` pin in `generate-skills.ts` and the test that asserts it, the `.ai-skills/skills/prism-onboard/**` manifest route, `verify-manifest-coverage.ts`, `bootstrap-from-claude.ts`, `docs/` (`personas.md`, `parameterization.md`, `getting-started.md`, `adopting-into-existing-repos.md`), `CONTEXT.md`, `templates/install/AGENTS.md.tmpl`, the test fixtures and temp-directory prefixes that carried the old IDs, `skills-ecosystem.md` and `closing-messages.md`, the Atlas architect docs, and every rule that named them. The `.prism/references/architect/` directory became `.prism/references/plan/`, with its curated seed twin and the `seed-curation.json` key moved to match.
2. **Rename `prism-plan` and change nothing else.** See Decision: `prism-plan` is a rename. It keeps its plan logic and its allowlist entry, now at 1108 lines under `main`'s measurement.
3. **Thin `prism-start-ticket` and `prism-onboard` to the four tests.** See Decision: What the flow-entry skills kept. They load 116 and 55 lines.
4. **Delete the references the two skills no longer load.** See Decision: Why each flow-entry reference could go. That covers `.prism/references/ticket-start/` and `.prism/references/onboarding/` with their seed twins, and the `.prism/references/onboarding/**` manifest route.
5. **Re-point the surviving citations.** `prd-decompose.md` names the create path of `prism-start-ticket`, the PRD clarity rubric lists its own vague words, the three rule generators and `verification-commands.md` name `prism-onboard`, `triple-gated-adr-criterion.md` points at `references/plan/plan-mode.md`, and ADRs 0034, 0045, and 0065 lose the `.ai-skills/skills/` prefix on their links to the renamed skills so `crossref-lint` stops resolving them, as PR 3 did for the conductor. The Atlas architect doc drops its "Batch 2" and question-number references.
6. **Fix the allowlist.** Removed the `prism-ticket-start` and `prism-onboarding` entries, renamed `prism-architect` to `prism-plan`, and set `prism-user-stories` to 704, which is what its closure measures once the create-path reference is gone. Removed the `question-flow.md` entry from `literal-allowlist.json`.

### PR 9 — Utilities

All done. Verification for the whole PR: `pnpm prism:build` and `pnpm prism:check` pass, `measureSkillLoad` reports 120 lines or fewer for all four skills, and a `git grep` for `devils-advocate`, `prism-skill-forge`, and `skill-forge` returns nothing outside the history paths (plans, lessons, retros, audits, archived, research, qa, prds), `.prism/spec/adrs/` and its generated copies under `.claude/`, `.codex/`, and `.cursor/`, and `CHANGELOG.md`.

1. **Rename two skills.** `devils-advocate` became `prism-challenge` and `prism-skill-forge` became `prism-forge-skill`, in the skill directories, `roles.json`, frontmatter `name`, `docs/personas.md`, `docs/ai-skills/migrate-skill.md`, the `prism-plan` and `prism-onboard` sentences that named them, `install-layout.md`, `skills-ecosystem.md`, `writing-a-skill.md` (with their curated or mirrored seed twins), the routing rule's utility section (with its twin), and a comment in `routing-coverage.test.ts`. Every old trigger phrase stays in the description and the routing rule, so "devil's advocate" and "create skill" still route. `prism-handoff` and `tdd` keep their IDs.
2. **Thin the three over the cap.** See Decision: What the utility skills kept. `prism-challenge` loads 38 lines (was 123), `prism-forge-skill` 119 (was 334, counting the writing guide it cites), and `prism-handoff` 47 (was 174). `tdd` was already 53 and loads 52.
3. **State the `tdd` exception.** ADR-0080 § Decision (Names) and `skill-authoring.md` § Names each gained one clause saying `tdd` keeps its bare ID because the approved intent keeps its name, and `writing-a-skill.md` § Namespace ownership and `install-layout.md` say PRISM owns `tdd` too. `eject.ts` and `ship-closure.ts` now key on `checkIsPrismSkillId` (`ownership.ts`, which lists `PRISM_BARE_SKILL_IDS`), with a test each. See Decision: A bare PRISM skill ID is owned in code.
4. **Fix the description-shape pointer.** The forge skill pointed at a `writing-a-skill.md` section that does not exist. It now states the shape inline, and does not point at `skill-authoring.md`, which consumers do not receive.
5. **Cut the Sol-era words.** `prism-forge-skill` lost `needs-replan` and `needs-human` (each became "ask the user" or "stop and tell the user"), and `tdd` lost "under dispatch" and "report-back".
6. **No reference file existed to delete.** See Decision: No utility reference could go.
7. **Fix the allowlist.** Removed the `devils-advocate`, `prism-skill-forge`, and `prism-handoff` entries from `OVER_CAP_ALLOWLIST`.

### PR 10 — Cadence and release

All done. Verification for the whole PR: `pnpm prism:build` and `pnpm prism:check` pass, `measureSkillLoad` reports 120 lines or fewer for all six skills, and a `git grep` for `prism-surface-audit`, `prism-standup-summary`, `prism-qa-test-plan`, `shipping-flow`, `micro-file-step-machine`, `stakes-calibration`, `references/qa-test-plan`, `references/standup-summary`, `references/changelog`, and `iris-state` returns nothing outside the history paths (plans, lessons, retros, audits, archived, research, qa, prds), `.prism/spec/adrs/` and its generated copies under `.claude/`, `.codex/`, and `.cursor/`, and `CHANGELOG.md`.

1. **Rename three skills.** `prism-surface-audit` became `prism-audit`, `prism-standup-summary` became `prism-standup`, and `prism-qa-test-plan` became `prism-qa-plan`, in the skill directories, `roles.json`, frontmatter `name`, the QA-skill and `.ai-skills/skills/prism-audit/**` manifest routes (the live manifest, `manifest.base.json` and its seed twin, and `manifest.stub.json`), `verify-manifest-coverage.ts` and its test, a comment in `hooks/lib/match.mjs`, `bootstrap-from-claude.ts`, `docs/personas.md`, `CONTEXT.md`, `templates/install/AGENTS.md.tmpl`, `skills-ecosystem.md`, `audit-workflow.md`, `plan-authoring.md`, `qa-test-planning.md`, and `worktree-hygiene.md` (with their curated or mirrored twins), and the `prism-implement` sentence that named the QA skill. `prism-retro`, `prism-changelog`, and `prism-prd` keep their IDs. Every old persona name stays in the `description` as a trigger word. The `.prism/references/qa-test-plan/` directory became `.prism/references/qa-plan/`.
2. **Thin all six to the four tests.** See Decision: What the cadence and release skills kept. They load 54 (`prism-retro`, was 789), 57 (`prism-audit`, was 758), 49 (`prism-changelog`, was 707), 94 (`prism-standup`, was 882), 56 (`prism-qa-plan`, was 1181), and 62 (`prism-prd`, was 974).
3. **Delete the references, step files, and lib files the skills no longer load.** See Decision: Why each cadence reference could go. That covers the retro and PRD step trees, which were the whole of `.prism/skills/`, `.prism/references/changelog/`, `standup-summary/`, and `qa-test-plan/` (minus the verdict contract, which moved to `qa-plan/`), `stakes-calibration.md`, and `micro-file-step-machine.md`, with their seed twins and the `micro-file-step-machine.md` key in `seed-curation.json`. The stale `.prism/iris-state.json` left by an earlier retro run is deleted with the state file the skill no longer writes.
4. **Delete `shipping-flow.md`.** See Decision: `shipping-flow.md` is deleted, not folded. Its twin goes with it, and `skills-ecosystem.md` (and its twin) and `SPEC.md.tmpl` point at the skills that now carry the flow.
5. **Drop the dead route.** With the step trees gone, `.prism/skills/**` matches nothing, so the route is removed from the live manifest, `manifest.base.json` and its seed twin, and `manifest.stub.json`. `measureSkillLoad` still follows a `.prism/skills/<id>/` tree if a skill ever has one.
6. **Re-point the surviving citations.** `token-substitution.md` names `.prism/templates/standup-summary.md` as its token example. `lazy-artifacts.md` points at the audit skill's `§ Report`. `crossref-lint.ts` and its test use `audit-state.json` as the lazy-state example. ADRs 0003, 0020, 0043, 0073, and 0076 lose the `.prism/` prefix on their citations of the deleted references, and ADR 0060 loses the `.ai-skills/skills/` prefix on its link to the renamed standup skill, so `crossref-lint` stops resolving them, as PRs 3 and 8 did. `docs/ai-skills/iris.md` is rewritten for the new skill, and `parker.md` and `personas.md` drop the step-file and state-file wording. The `SHIP_CLOSURE_TRACKED_DANGLING_REFS` entry for ADR-0037 is removed, since nothing reaches it any more.
7. **Fix the allowlist.** Removed the six PR 10 entries from `OVER_CAP_ALLOWLIST`. `literal-allowlist.json` held no entry for any deleted file.

### PR 11

Its tasks are written into this section when its branch is cut, so a task list never runs ahead of the code it describes. The rules it follows are recorded under `## Decisions`.

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

- **The shared skill core is cut, not thinned.** Every section of `skill-core.md` restated an always-on rule, with one exception. Its general "match the paths you will touch against the manifest" survived in `context-reuse.md` only for a task that names a doc, so that rule now states it in general, which is what Cursor relies on. Orientation restated `session-orientation.md`, the plan section `branch-plan.md`, reading-before-writing `context-reuse.md`, closing `session-orientation.md` again, and the context budget `bash-output-minimization.md` and `subagent-strategy.md`. Every section of `session-close.md` likewise restated an always-on rule or a routed doc: the rule-loading tiers, `self-improvement-loop.md`, and `lesson-promotion.md`. Each section fails the policy test, because the model already reads the rule it restates. The intent says content that fails a test is cut, not moved, so both files go.
  - **Alternatives considered:** thinning `skill-core.md` to a few pointers. Each pointer would still cost every skill lines for a rule the session already holds.
  - **Persona-specific lesson signals stay** in each skill body under **Before closing the session:**, until each lane PR applies the four tests to them.
  - **Side effect:** skill bodies still tell a run to emit `needs-human`, `needs-replan`, or `blocked`, and nothing defines those words now. PR 3 retired their only consumer. Each lane PR cuts those instructions in the skills it thins.

- **The loaded-lines check measures the transitive closure, including bare step names.** `measureSkillLoad` counts the body, plus every reference, step, and `load: skill` rule file the body cites, followed through those files. A bare `step-NN-*.md` name is resolved under `.prism/skills/<id>/`.
  - **Root cause:** counting direct citations only lets a skill cite one step file that cites the next and charge only the first. The baseline's Loaded column also missed step files a body names without their directory, so `prism-prd` and `prism-retro` measured far below what a run reads: 902 and 717 lines once PR 5 counts them, against 536 and 586 in the baseline.
  - **Chosen approach:** this check is now the canonical measurement, and it supersedes § Baseline § Method's Loaded definition for every number after PR 5.
  - **Shrink-only allowlist:** an allowlisted skill that comes in under the cap fails the test until its entry is removed. A listed skill that grows past its recorded `max` fails too, so an entry can neither sit stale nor hide a regression.
  - **What counts, and what is followed.** Every file a body names counts: references, step files, its own `lib/` files, templates, architect docs, and `load: skill` rules. Citations are followed through references, step files, and skill sources, which are procedure. A cited template, architect doc, or rule counts but is not followed further, because its links are see-also context. An architect doc the manifest routes by path, with no body naming it, is not charged to any skill. `.prism/rules/skill-authoring.md` § The four tests lists this same set, so a change to what counts edits both.
  - **The ratchet is exact.** Each allowlist entry records the skill's current size, and any change fails until the entry is updated, so every lane PR's cut is recorded in its own diff.
  - **A link spelled for the generated tree resolves too.** Skill sources cite `../../references/x.md` as it reads from `.claude/skills/<id>/`. That spelling resolves nowhere from the source tree, and it resolves under `.prism/` instead. Without this, the check undercounted every skill citing `shipping-flow.md` by 98 lines.
  - **The parser is local.** Neither `crossref-lint.ts` nor `ship-closure.ts` resolves the three spellings a skill body uses: the platform-tree link, the `<repo-root>/` token, and a bare step name.

- **First-pass clean needs a human-written signal.** GitHub cannot separate agent comments from human ones in this repo, so the baseline is an upper bound. **Default path (until a later phase adds the signal):** report the upper bound, and do not claim movement on criterion 1 from GitHub data alone.

- **What the review skills kept.** Each line below survives because other parts of the system read it, and the rest of the old bodies failed the policy test (voice, "How X Thinks" lenses, greetings, batteries, generic review method, restated rules, the Sol-era verdict vocabulary).
  - **`prism-self-review`:** reports in chat only and never posts to GitHub; reviews `git diff ${DEFAULT_BRANCH}...HEAD`; Critical, Major, and Minor with one-line definitions; plan fidelity (a contradicted Decision is Major); source-verified review when the diff has architect docs; the removal-and-rename search; the coverage rule and the four code smells; the `## Review Issues` entries, the `No issues found — <date>` line, `## PR Readiness`, and AC proposed when absent and adjusted as `proposed`; the plan-only commit with its staged-set check; plan-file scope; bookkeeping-only Minors count as clean; the review-loop surfaces; no unqualified ready over a partial review; and the handoff rules (authors ship, route fixes to the implementer, recommend a fresh-chat PR review).
  - **`prism-pr-review`:** posts inline comments, one summary comment, and labels; never approves; stays in draft; the PR identifier forms; in-branch default with the three worktree triggers; Standards and Spec findings under separate headings; the AC-verification sampling rule; the three states and the label policy that `git-conventions.md` § Who merges reads; the resolve-threads step that `prism-review-loop` depends on; plan-file scope; the review-loop surfaces.
  - **Judgment calls:** the parallel Standards and Spec subagents and the lightweight docs-only path are cut, and the two headings stay. The subagents were an orchestration choice, not a policy a hook enforces, and the cap cannot hold the phases that describe them. The nine-angle coverage block, its status vocabulary, and the pass-bounded cap on `confidence:high` are cut with `review-angles.md`, replaced by the coverage rule and one line that a partial review never reports an unqualified ready. The `labels.md` strip loop missed `confidence:standards-only`, so a stale label survived a re-review. The new loop strips it.

- **Why each review reference could go.** A reference is cut when it fails the policy test and nothing else needs it. The files below are named because the spec-scope lint matches deleted `review-*` references by basename.
  - **`review-angles.md`:** the nine angles are generic review method, and the coverage block is the only PRISM-specific part. Only the two review skills read it, so it goes with their pass-bounded label cap.
  - **`review-justification.md`:** the four-question abstraction procedure restates `code-standards.md` § General (one adapter does not earn an abstraction). The one-consumer-is-Major line and the other smells from `review-frameworks.md` survive as one line in each skill.
  - **`review-doc-class-triage.md`:** a copy of `architect-doc-verification.md`, which the skills now cite directly.
  - **`review-docs-impact.md`:** one line in `prism-self-review` replaces it, pointing at the documentation architect doc without naming it by path, because a cited architect doc counts in full against the cap.
  - **`review-frameworks.md`:** severity definitions moved into the skills, and the removal-and-rename search became a line in each. The two other users, `prism-review-loop` and `code-standards.md`, are re-pointed to the skills. Its smells list survives as one line in each skill.
  - **`worktree-mode.md`:** generic git-worktree mechanics. The four PRISM-specific rules (return with `;`, detached-HEAD push, check-only formatting, tear down on every exit) became lines in `prism-pr-review`. `branch-plan.md` already states the full-ref push form.
  - **`pr-review/context-gathering.md`, `gotchas.md`, `labels.md`, and `summary-template.md`:** merged into `pr-review/github-writes.md` where PRISM-specific (the marker, REST for labels, the 422 rule, the label table) and cut elsewhere (generic `gh` calls, batching advice, the Write-tool temp-file workaround).
  - **Kept for other skills:** `structural-remedies.md` (the architect uses it), `architect-context.md`, `plan-lookup.md`, and `cleanup-pass.md` (the commit hook names it). The review skills no longer cite them, so none counts against their cap.

- **The PR reviewer leaves the PR in draft.** The old reviewer ran `gh pr ready` in state #3. The labels it applies are exactly what `git-conventions.md` § Who merges reads, so a flip inside the review pass could open the merge gate on a label the reviewer picked a moment earlier. The flip now belongs to the main session once the merge conditions hold. `shipping-flow.md` § Draft-by-default and the `skills-ecosystem.md` roster (with its curated twin) say so.

- **The summary-comment marker keeps its old spelling.** `<!-- code-review-pr-summary -->` is the first line of every summary comment already on open PRs. Re-runs find the comment by it, so renaming the marker would post a duplicate on every PR reviewed before the rename. It is the one `code-review-pr` string the rename sweep leaves, and the reference says why.

- **Always-on rules edited in PR 6.** These edits are the rename and the two re-points above, and nothing else in them changed: `.prism/rules/skill-routing.md` (routing rows, with its curated twin and `templates/install/AGENTS.md.tmpl`), `.prism/rules/context-reuse.md` (citation list), `.prism/rules/architect-doc-verification.md` (who runs it, with its twin), `.prism/rules/design-governance.md`, `.prism/rules/followup-scope.md`, `.prism/rules/implementation-task-detail.md` (with its twin), `.prism/rules/branch-plan.md` (the skill names under `## Review Issues` and `## PR Readiness`, and the push clause that cited `worktree-mode.md`, with its twin), and `.prism/rules/code-standards.md` (the reviewer-side pointer in § Removal and rename completeness). The pass-1 fixes edit no further rule.

- **What the build skills kept.** Each line survives because a gate, a rule, or another skill reads it. The rest of the old bodies failed the policy test: voice, greetings, "How X Thinks" lenses, batteries, generic engineering, design, and writing method, restated rules, and the Sol-era verdicts (`needs-replan`, `blocked`, `found-followup-work`, `needs-human`).
  - **`prism-implement`:** resolves the plan first and presents `open` Debugged and Review Issues; loads the routed architect docs; verifies external dependencies at the source; on a bug ticket confirms the root cause, records it under `## Debugged Issues`, and offers the tracker post; stays in the local frame per `code-standards.md` § Refactor scope; routes UI gaps to `prism-design` and plan-breaking changes to the plan skill; proposes AC changes as `proposed` and syncs the ticket once accepted; records fixed issues, one `## History` line, and timeless `## Decisions` in one plan pass; pre-flights AC without claiming a graded verdict and sends a disputed UNMET to the plan skill; runs the checks, the cleanup pass, and git-conventions commits; ships through the pause preference, `gh pr create --draft`, and the PR title and body lines (body sync per push, `--body-file`, `#N` escaping); proposes `prism-self-review` and never invokes it.
  - **`prism-docs`:** reads the `documentation.*` config and never assumes a path or audience; resolves the source and audience; checks the plan's identifiers against the codebase; updates before creating and checks siblings; follows `user-doc-template.md` and builds a control inventory for user docs; the frontmatter schema lives in the architect doc; post-write sidebar, index, cross-reference, and plan updates; ships its own docs PR as a draft with prettier on Markdown only.
  - **`prism-design`:** never writes code; the three modes with their save triggers, the mode 2 path and section order, the `## Design` summary and its Status values, and the HTML-only-on-request rule; `## States` (the five-state doctrine the task-detail rule cites); an approved mock is the design; reuse before inventing; every saved spec routes through the plan skill, a mode 1 gap-fill returns to the implementer.
  - **Judgment calls.** `prism-docs` cites `user-doc-template.md` (87 lines) because the template is the doc format, and the callout reference it cited is now named only by the documentation architect doc, so the closure stops there. The dev template is reached through the architect doc's split-audience paragraph, which is an architect doc the cap does not charge. `prism-implement` states the PR title and body shape inline and does not cite `pr-description.md` (87 lines) or its template, because either one would put it over the cap. The `ac-adjustment` reference is gone and `acceptance-criteria.md` is not cited, for the same reason.

- **Why each build reference could go.** A reference is cut when it fails the policy test and nothing else needs it.
  - **`code-dev/ac-adjustment.md` and `code-dev/decisions-temporal-scan.md`:** two lines in `prism-implement` carry each, and a 24-line and a 19-line file were more than the policy needed.
  - **`code-dev/formatting.md`:** the check-before-you-write discipline is one clause in `prism-implement`. The formatting-only fast path is generic tool use.
  - **`code-dev/engineering-frameworks.md`:** SOLID, debugging, refactoring, and testing method the model applies unprompted.
  - **`documentation/startup.md`, `codebase-read.md`, `after-writing.md`, and `frameworks.md`:** the config read, source resolution, audience, sibling check, and post-write steps are lines in `prism-docs`. The sub-agent split for mixed frontend and backend diffs was an orchestration choice, and the Divio and readability frameworks are model-resident.
  - **`pixel/frameworks.md` and `pixel/pattern-vocabulary.md`:** a catalog of named design frameworks and tactical patterns the model already knows.
  - **`pixel/mock-spec-template.md`:** the section order is one line in `prism-design`, and the detail bar already lives in `implementation-task-detail.md`. The template's verbatim wireframe scaffolding restated both.
  - **`prism-design/lib/output-modes.md` and `handoff-procedures.md`:** the mode triggers and the route-through-the-plan-skill invariant are in the body, and the Procedures C and E were generic.
  - **Kept for other skills:** `shipping-flow.md` (the changelog and QA skills still cite it, so it stays until PR 10, minus its Clove and Eli rows, since `prism-implement` and `prism-docs` state the flow themselves), `architect-context.md`, `plan-lookup.md`, `cleanup-pass.md`, `doc-callouts.md`, and both doc templates.

- **What the build skills cut on purpose.** These behaviors had no line in the old bodies' policy that a gate, rule, or other skill reads, so they are gone and not lost by accident.
  - **`prism-implement`:** the pass-by-pass "How Clove Thinks" lenses, the `engineering-frameworks` catalog, the testing-trophy and 100%-coverage lines (code-standards and `verification-commands.md` hold the test rules), the Zoe-verdict reflex bullet (kept as a clause on the `## Decisions` read; the audit workflow doc now lists the skills that still carry it), and the "After a merge" re-verify note.
  - **`prism-docs`:** the new-template breadcrumb (add a Category-specific rules bullet to the parent template) and the doc-collection handoff to the architect doc. Both fire only when a team adds a template or a collection of three or more pages, and the architect doc's own routes cover that edit. The missing-doc nudge became one clause, and the new-category sidebar and index check became one parenthetical.
  - **`prism-design`:** the six-dimension convention audit as a numbered lens (kept as one Startup line), the Nielsen and Gestalt axes, and the interview protocol (kept as one line).

- **A non-`docs/` doc root needs its own manifest route.** `prism-docs` does not name the documentation architect doc by path, because a named architect doc is charged in full to the cap and the manifest already routes it for the doc root. The install stub routes only `docs/`. A consumer whose `documentation.location` is elsewhere would never load the frontmatter schema and naming rules.
  - **Alternatives considered:** naming the doc in the skill body (its 124 lines would put the skill over the cap), or routing a pattern derived from `documentation.location` at install time (the manifest is consumer-owned and `prism update` never rewrites it).
  - **Chosen approach:** `docs/ai-skills/compatibility.md` tells such a consumer to add the route by hand, next to the existing note that an install adds the `umbrellas` key by hand.

- **Always-on rules edited in PR 7.** The edits are renames and re-points, and nothing else in them changed: `.prism/rules/skill-routing.md` (the two routing rows, with its curated twin and `templates/install/AGENTS.md.tmpl`), `.prism/rules/context-reuse.md` (citation list), `.prism/rules/design-governance.md` (who runs it), `.prism/rules/branch-plan.md` (the plan-lookup skill list), and `.prism/rules/code-standards.md` (the pointer to the implementation skill, reworded to "builds inside the same local frame" since its Scope discipline section is gone). Each has a seed twin that the build or the sweep updated to match.

- **What the flow-entry skills kept.** Each line survives because a gate, a rule, or another skill reads it. The rest of the old bodies failed the policy test: voice, greetings, "How X Thinks" lenses, batteries, generic ticket and onboarding method, restated rules, and the Sol-era verdicts (`needs-human`, `needs-replan`, `blocked`).
  - **`prism-start-ticket`:** works with whatever tracker the session has and asks for the basics when there is none; takes the type from the label (`bug`, `feature`, `improvement`, `DX`) and asks when none matches; the Definition of Ready (problem not solution, bounded scope, criteria and blockers, an estimate before the branch exists, priority by impact, status placement for Triage and Backlog tickets, every bug-template section present); the bug path (scaffold from `bug-report.md`, blast radius before priority, hand off to `prism-implement`); the create path with status placement and the stop after creating; the follow-up vehicle choice and scope-fit gate from `followup-scope.md`; the branch from `origin/${DEFAULT_BRANCH}` per `git-conventions.md` § Branch Naming, the dirty-tree stop, and assignment; the confirmation gate on every tracker write, with its skip-for-session override; the AC sync that strips ids and Evidence; the handoff by type; the `domain-context` anchor; and "Nora" as a trigger.
  - **`prism-onboard`:** the init, adopt, onboard sequence; the install-context table; the five-mode walk with resume first; the confirmation stop after the survey; one question per turn saved with `markStepComplete`; the question order with the asset survey and sweep (for first-contact, and for init-bootstrapped with asset signals), documentation, and retro evidence; skip-if-exists with its reason string; the `load:` confirmation; the config written only on an explicit yes through `writeOnboardingConfig`; regeneration in place of an anchor step; the closing summary; and "Atlas" as a trigger. The body points at `runRuleGenerators`, `writeOnboardingConfig`, and `ONBOARDING_STEPS` instead of restating what they do.
  - **Judgment calls.**
    - **Cycle View and Duplicate Finder are cut.** Cycle View is a tracker query sorted into buckets, which the model builds unprompted, and Duplicate Finder's 50/30/20 title, label, and description weights with trigram scoring replace the model's own comparison with a cruder one. The one policy in them, no change without confirmation, is the tracker-write gate. `prism-plan` lost its Cycle View handoff for the same reason.
    - **The S1 to S4 scale, the priority tier definitions, the "tomorrow test," INVEST, and the splitting strategies are cut.** The bug template names Critical, High, Medium, and Low, the tiers restated tracker priorities, and the rest is method the model holds. The vague-word list stays as one clause, and the PRD clarity rubric now lists its own words instead of citing the cut section.
    - **`bug-report.md` is cited and the other templates are not.** It costs 62 of `prism-start-ticket`'s 116 lines and is the scaffold format. `ticket-types.md` and `acceptance-criteria.md` would put the skill over the cap, so the four types, the DX rule, and the strip rule are one clause each.
    - **The `compatibility:` frontmatter no longer names Linear,** since the skill works with any tracker the session has.
    - **`ONBOARDING_STEPS` has no `retro-evidence` step,** although the old question flow told Atlas to save one, and `markStepComplete` throws on a name it does not know. The body saves that set under `documentation-setup`. Adding the step is a code change this PR does not make.

- **Why each flow-entry reference could go.** A reference is cut when it fails the policy test and nothing else needs it.
  - **`ticket-start/assessment-frameworks.md`:** its own header says the model already holds the frameworks. The PRISM-specific parts (Definition of Ready, the estimate scale, the impact formula, blast radius) are lines in the skill.
  - **`ticket-start/create-path.md` and `sync-ac.md`:** the create flow and the AC sync are sections of the skill, and the follow-up gate is `followup-scope.md`. `prd-decompose.md` named the create path and now names the skill.
  - **`ticket-start/mode-cycle-view.md` and `mode-duplicate-finder.md`:** see the judgment call above.
  - **`onboarding/modes.md`:** the mode walk and the first-install step set are in the skill, and the seeding rationale stays in the Atlas architect doc.
  - **`onboarding/question-flow.md`:** the question order, the documentation and retro-evidence sets, the survey, the sweep, and the `load:` confirmation are in the skill. The three rule generators named it in their JSDoc and now name the skill.
  - **`onboarding/output-contract.md`:** its file lists restated what `writeOnboardingConfig` and `runRuleGenerators` do, and the closing summary is one sentence.
  - **Kept for other skills:** `plan-lookup.md`, `architect-context.md`, `structural-remedies.md`, and the three files that moved to `references/plan/`, all of which `prism-plan` still loads.

- **`prism-plan` is a rename.** Its plan logic stays whole until the phase-2 plan skill replaces it, so the only cuts are the Sol-era verdict words (each became "ask the user," "stop and tell the user," or a follow-up per `followup-scope.md`), the Cycle View handoff, and the persona names of skills that this stack has already renamed, which became skill IDs. Persona names of skills renamed in later PRs stay until their lanes. The description drops "senior software architect" and keeps the "Winston" trigger.

- **Allowlist maxes for this PR come from the loaded-lines rules on `main`.** `measureSkillLoad` counts a skill's own files and cited architect docs, and this branch carries the same copy now that it has absorbed `main`. Under it `prism-plan` loads 1108 lines, `prism-user-stories` 704, and the two thinned skills 116 and 55. The test is an exact ratchet, so every entry must equal its measured total.

- **Always-on rules edited in PR 8.** The edits are renames and re-points, plus one corrected startup-step number in `context-reuse.md`, and nothing else in them changed: `.prism/rules/skill-routing.md` (the two routing rows and the onboarding line, with its curated twin and `templates/install/AGENTS.md.tmpl`), `.prism/rules/context-reuse.md` (citation list and the `prism-plan` startup step), `.prism/rules/architect-doc-verification.md`, `.prism/rules/design-governance.md`, `.prism/rules/followup-scope.md` (who runs it), `.prism/rules/implementation-task-detail.md`, and `.prism/rules/verification-commands.md` (the pointer to the onboarding flow). Each has a seed twin that the build or the sweep updated to match.

- **What the utility skills kept.** Each line survives because a gate, a rule, or another skill reads it. The rest of the old bodies failed the policy test: persona-versus-utility commentary, the orientation and closing batteries, per-step "Trigger" and "Escape" scaffolding, Sol-era verdicts, and persona names inside prose.
  - **`prism-challenge`:** the test for what is worth challenging (an artifact that commits to a decision before the evidence exists) and what is not (work already graded against evidence, readiness gates, derivative outputs); one target per run; read the target and its dependencies; check outside claims at the source; the four passes; the output order with its three-way typed verdict; the honest-verdict and two-findings-beat-ten bar; and the boundary that it never edits the artifact, assigns the fix, or blocks a run. The persona lists became artifact types, since the personas they named are renamed or gone.
  - **`prism-forge-skill`:** it writes only canonical source and the `roles.json` entry, then lets the build regenerate; the ID namespace (`prism-*` is PRISM's, a consumer takes its org token or `custom-`); the four tests and the cut-not-move rule; the description shape stated inline; the 500-line and 1,000-character build limits; fix the source, never generated output, and stop after three failed hypotheses; create mode's persona-or-utility fork with its adapter consequence, the `named-only` default and the routing-coverage coupling; migrate mode's CLI-first rule, source preference order, TOML unwrapping, generated-artifact stripping, and round-trip check; and the Cursor `.mdc` gap as a follow-up.
  - **`prism-handoff`:** the flush into `## Decisions`, `## History`, `## Debugged Issues`, and `## Review Issues` before writing, so the document holds only session residue; scope filter and target prefix; the unique temp path with its explicit separator join and the `.prism/handoffs/` fallback; the seven sections; neutral prose with secrets redacted; `(unverified)` on claims asserted from memory; the report; and the read-side contract (open the given path, never scan the directory, the plan wins a conflict).
  - **`tdd`:** unchanged apart from two edits. It was already 53 lines, so the cap did not call for a cut. The persona preamble became one line, and the dispatch clause now says to name the seam in the closing message. Absorbing the planned `testing` skill is phase 2.

- **No utility reference could go.** None of the four skills cited a `.prism/references/` file, a step file, or a template, so there was no reference to delete and no seed twin, `seed-curation.json` key, or manifest route to remove. The one cited file is `writing-a-skill.md`, an architect doc, and the forge skill cites it by path (119 loaded). The manifest does not route it on `.ai-skills/skills/**`: `.prism/architect/manifest.json` and `_toolkit/manifest.base.json` route only the spec-editing, skills-ecosystem, ticket-workflows, and closing-messages docs there, the install stub has no such route, and only the generated `.claude/skills/**` mirror routes the guide. An earlier draft dropped the citation on the opposite claim and shipped a forge skill that never told its run to read the guide. The description shape is stated inline, since `skill-authoring.md` is `excluded` from the consumer seed.

- **What the utility skills cut on purpose.** These behaviors had no line that a gate, rule, or other skill reads, so they are gone and not lost by accident.
  - **`prism-handoff`:** the "20+ messages" invocation condition, which contradicted the same paragraph's rule against counted proxies, and the unrecognized-target escape that named AGENTS.md routing (now: resume in the same session and say so under `## Focus`).
  - **`prism-forge-skill`:** the Procedure A to D scaffolds (their escapes were Sol-era verdicts), the persona-versus-utility explanation (ADR-0046 holds it), the ordered "run" summary, and the batteries. Domain overlap with an existing skill is now one sentence that asks the user whether to extend it.
  - **`prism-challenge`:** the "utility, not a persona" paragraph, since ADR-0080 removes voice from every skill, and the persona-by-persona lists.

- **The forge skill splits by install context.** A consumer has `.ai-skills/config.json`, `definitions/paths.json`, and `registry/`, and nothing else under `.ai-skills/`. The package ships `.ai-skills/skills/` and `roles.json`, but `refreshPlatformSkills` reads them from the package and renders into the host skill dirs. No consumer route runs a build, `adopt.ts` has no skill logic beyond provisioning `paths.json`, and the consumer CLI lists only init, adopt, detect, update, doctor, and eject. So `pnpm prism:build`, `prism:check-types`, `prism:migrate-skill`, canonical source, and a `roles.json` entry do not exist for a consumer, and the skill's scripts do not ship.
  - **Chosen approach:** the skill opens with an install-context table, as `prism-onboard` does. Toolkit context keeps create, migrate, and the build. Consumer context writes a `SKILL.md` by hand into each host's skill dir under its own prefix, has no verify step beyond `prism doctor` for install health, and has no migrate, since a skill already in a platform dir is consumer-owned and `prism update` never touches it. The scripts it cites sit under toolkit-only sections.
  - **`prism-onboard`:** its discovery sweep sent discovered skills to forge migrate in every context. In consumer context it now leaves them in place.
  - **Alternatives considered:** a consumer authoring path (a consumer-side build, or `prism update` rendering a consumer's `.ai-skills/skills/`). Rejected as new work this PR does not build.
  - **Follow-up (real gap):** a consumer has no way to keep one canonical source for its own skills across hosts, and nothing migrates a hand-written skill into one. Needs its own ticket under `followup-scope.md`: a consumer-side render of `.ai-skills/skills/` or a documented hand-copy workflow.

- **A bare PRISM skill ID is owned in code.** `tdd` is rendered and refreshed for consumers: `refreshPlatformSkills` in `update.ts` renders every skill under `.ai-skills/skills/` and cleans up by marker, not by prefix. Two places keyed on `prism-` alone, so `tdd` survived `prism eject` and `ship-closure` never walked its body. `ownership.ts` now exports `checkIsPrismSkillId`, backed by a module-private `PRISM_BARE_SKILL_IDS` (`tdd`), `eject.ts` and `ship-closure.ts` use it, and each has a test. The marker check in eject still protects a consumer's own unmarked `tdd`.
  - **Alternatives considered:** keying on the `roles.json` IDs. Rejected as larger: eject runs in a consumer repo with no PRISM source to read, so it needs a constant anyway.

- **Always-on rules edited in PR 9.** `.prism/rules/skill-routing.md` is the one `load: always` rule this PR edits, with its curated twin. The edit renames the two utility bullets (`prism-forge-skill`, `prism-challenge`), keeps every trigger phrase, and drops the "a named character would be tempted to perform skepticism" clause, which described the persona the skill no longer has in either form. `.prism/rules/skill-authoring.md` (`load: paths`) gained one clause in § Names saying `tdd` keeps its bare ID, and ADR-0080 gained the same clause in its Names bullet. Nothing else in them changed.

- **What the cadence and release skills kept.** Each line survives because a gate, a rule, or another skill reads it. The rest of the old bodies failed the policy test: voice, greetings, "How X Thinks" lenses, the opening and closing batteries, mid-flight re-anchor lists, per-lens Trigger and Escape scaffolding, and the Sol-era verdicts (`needs-human`, `needs-replan`, `blocked`, `found-followup-work`).
  - **`prism-retro`:** the six-question charter and the two-source rule (plan sections hold intent, the execution record holds outcome); the two grains and how the plan-close ceremony passes one; the `retroEvidence` config with `not configured` kept apart from `unreachable this run`; all three GitHub review surfaces, because the PR reviewer files no review object and a retro that read only reviews would call a reviewed PR unreviewed; ingesting the AC-verification report; the refuted-Decision test; the report paths and sections, including Promotion cautions at both grains, which the close ceremony consumes; read-only on the plan; unanswered items never filled in; and the offer to file action items through `prism-start-ticket` under the scope-fit gate.
  - **`prism-audit`:** the four verdicts with their precedence and the sub-bullet format; evidence-first classification, the open-since date rule, and never defaulting to `open-stale`; the lessons, closed-plan, ADR, and architect-doc rules; per-item consent for every archive move, with lazy creation of the archive files; the whole worktrees lane, including the batch gate for GREEN only, the re-classify before removal, and the classifier-absent stop; and the report shape.
  - **`prism-changelog`:** tag validation, the commit-subject formats, the PR-link and flag rules (`no PR link`, `off-format`, `unverified PR link`, `ambiguous`), the keyword groups and the meaning-first fallback, consolidation by ticket, the breaking-change list, the document structure, the save path, and the ship step with the pause preference and draft PR.
  - **`prism-standup`:** reading the template every run, UTC-`Z` windows, the `gh search prs` flag and field gotchas that failed real runs, in-window verification, the pre-window commit rule, the Today and Blockers normalization, posting-tool discovery that rejects `_draft`, `_schedule`, and `_canvas`, schema-driven parameters, and confirm-before-post. The template keeps the rendering contract (bold labels, U+200B spacers, no code fence) and the subsection and entry rules.
  - **`prism-qa-plan`:** mode selection from three signals, the five modes and their section layouts, the audience and Out-of-scope rule, ticket mapping, regression and cross-check, the tester-facing writing rules, save paths and the ship step, and AC Verification whole (read-only execution with tree-clean discipline, derived evidence, human-tagged criteria, UNMET entries in `## Review Issues`, the report and its re-check rules, and `converted` after two fix cycles). The verdict contract stays as the shared reference.
  - **`prism-prd`:** the grain test, the frontmatter and ten sections, stakes calibration and its table, the fast and coaching paths, `[ASSUMPTION-n]` against `[INFERRED-n]`, the separate decision log, the three-axis review with its triage and fix, accept, or override choices, and finalize with the optional tracker handoff.

- **Judgment calls in the cadence and release thinning.**
  - **Retro findings replace the multi-voice dialogue.** Staging voices and writing dialogue produced fiction-shaped output whose only policy was "cite evidence", and ADR-0080 removes personas from skill bodies. The findings are charter-keyed and each cites its source. If a reviewer finds the dialogue was doing real work, the report format is the place to restore it.
  - **The retro state file is dropped.** It existed to resume a six-step machine that no longer exists, so `.prism/iris-state.json` and its schema are gone.
  - **The `Zoe verdict` marker keeps its name.** Plans already carry `**Zoe verdict (date):**` sub-bullets, `CONTEXT.md` defines the term, and `prism-plan` and `prism-implement` read it, so the audit skill still writes the same string.
  - **`audit-workflow.md` and `worktree-hygiene.md` are not cited by path, and the skill does not rely on either.** A route loads a doc only on hosts with the write hook (Claude Code and Codex, not Cursor), and only when a call touches the routed path. The skill therefore inlines the `audit-state.json` shape and the worktrees lane steps. `audit-workflow.md` is routed on `.prism/audit-state.json` and `.prism/audits/**` in both the live manifest and the stub, and also on `.prism/plans/**` in the live manifest alone. `worktree-hygiene.md` is routed on `.prism/audit-state.json` in both. Its routes on the audit skill's directory and on `scripts/ai-skills/worktree-classify.ts` are not in the stub and fire on edits to those files, not on a run.
  - **`qa-test-planning.md` is not cited, and its content is cut from the run.** Its route fires on the skill's own path, so a QA run does not load it, and it is now maintainer reference only. The skill keeps one line of risk weighting and the tester-facing writing rules. These stay out of the run: the risk heat map, the test-design techniques (equivalence classes, boundary values, decision tables, and the rest), the happy-path-only and under-testing-high-risk anti-patterns, and the Product Domain Context slot. That slot is where a team's domain shapes (multi-tenant, faceted filtering, mobile field use, revenue-critical flows) reached the plan, so a plan no longer gets them automatically. **Default path (used until resolved):** the doc stays as reference, and a team that wants its domain context in plans adds it to the request or restores a short domain line to the skill in a later phase.
  - **The PRD drops `stepsCompleted`.** It tracked the step machine. `status` alone decides resume. The `linearInitiativeId` field name is unchanged, since existing PRDs carry it.
  - **The standup template is thinned too,** from 235 to about 60 lines (the worked example and the rationale incidents are gone). The skill cites it, so every line of it counts against the cap.
  - **The PRD review runs as parallel subagents where the host allows it.** The three rubric files are one bullet each in the skill, and the per-host override text in `claude.md`, `codex.md`, and `cursor.md` is gone.

- **Why each cadence reference could go.** A reference is cut when it fails the policy test and nothing else needs it.
  - **`changelog/frameworks.md`, `common-issues.md`, and `doc-generation.md`:** the audience table, the three-layer entry test, and the release-shape table are writing method. The categorization tree, the breaking-change list, and the consolidation rule are lines in the skill. The `.docx` and PDF recipes duplicate the docx and pdf skills.
  - **`standup-summary/phases.md`, `fetch.md`, and `slack-mcp.md`:** the date arithmetic, queries, normalization rule, and Slack discovery steps are lines in the skill. The rendering contract stays in the template.
  - **`qa-test-plan/mode-*.md`, `shared-mechanics.md`, `common-issues.md`, and `future-phases.md`:** the per-mode parsing, filtering, and skeletons are bullets in the skill. `mode-ac-verification.md` is the AC Verification section. `future-phases.md` is one sentence.
  - **`stakes-calibration.md`:** only `prism-prd` cited it, and its table and rules are in the skill.
  - **`micro-file-step-machine.md`:** only the retro and PRD skills cited it, and neither has steps now.
  - **Step files and rubrics for retro and PRD:** each step either restated a rule, held generic method (the code-walk, the interview), or was the state-file bookkeeping that went with the machine.
  - **Kept:** `qa-plan/verdict-contract.md`, now cited by `prism-qa-plan`, with the persona names in it replaced by skill IDs.

- **`shipping-flow.md` is deleted, not folded.** After PRs 7 to 9 only the changelog and QA skills cited it. What they still needed is inline: the pause preference, prettier on the Markdown only, a cold re-read for session-context leakage, the commit subjects, `gh pr create --draft`, and that the human flips the PR ready because no agent reviews it. The release PR stays with the team lead. What went: the per-push invariant (each skill states its own ship step), the two-path closing that offered a self-review and a PR review on Markdown artifacts, and the per-persona table. The cleanup-pass read is enforced by the commit gate hook, which names `cleanup-pass.md` itself, so no skill needs to cite it. The per-push PR body sync from ADR-0020 and the PR body format are one sentence each in the changelog and QA skills (rewrite only the listed templated sections, never Screenshots or Notes, keep the rest verbatim, state reasoning and never a file list), because citing `pr-description.md` would add its 87 lines to each and put both skills over the cap.

- **`> Retro:` enforcement is not part of phase 1.** The intent makes a missing `> Retro:` line a check failure, but neither the stack table nor any task here schedules a check, and PR 10 is rename-and-thin. **Default path (used until a later phase adds the check):** the line stays the declinable gate in `.prism/rules/branch-plan.md` § Before Closing, and `prism-retro` still writes the report that line points at. The intent's wider retro (a verdict on every Decision, promotion into the owning architect doc, the lessons lifecycle) is likewise not done here, because the plan skill's close ceremony owns promotion today and `prism-retro` stays a read-only reporter until the phase that moves it.

- **The `.prism/skills/` tree is gone.** The retro and PRD step files were all that remained of it, so the directory no longer exists and the `.prism/skills/**` route was removed from the four manifests. Install-layout's note that `.prism/skills/**` never ships stays true as a rule.

- **`pr-description.md` is now cited by no skill.** Only `shipping-flow.md` cited it for the changelog and QA skills, and `prism-implement` states the PR shape inline. It is a `load: skill` rule that `git-conventions.md`, `skills-ecosystem.md`, and `plan-authoring.md` still point at. A later PR can fold it into the one skill that writes PR bodies or re-declare its `load:`; this PR leaves it alone.

- **Always-on rules edited in PR 10.** The edits are renames and pointer fixes, and nothing else in them changed: `.prism/rules/skill-routing.md` (the `prism-qa-plan`, `prism-standup`, and `prism-audit` IDs in the routing rows and the named-invocation list, with its curated twin and `templates/install/AGENTS.md.tmpl`), `.prism/rules/context-reuse.md` (the same IDs in the citation list), and `.prism/rules/lazy-artifacts.md` (the audit ID and the `§ Report` pointer). The review-fix pass also edits `.prism/rules/verification-commands.md` (a `load: paths` rule, with its twin), which only replaces the `step-02` pointers with "the retro skill". Each has a seed twin that the build or the sweep updated to match. Every trigger phrase in the routing rows is unchanged.

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
- 2026-10-18 [huntermcgrew/prism-499-flow-entry]: Renamed Winston, Nora, and Atlas to `prism-plan` (rename only), `prism-start-ticket`, and `prism-onboard`, and thinned the last two to 116 and 55 loaded lines. Deleted eight reference files and moved `references/architect/` to `references/plan/`; see Decision: What the flow-entry skills kept.
- 2026-10-18 [huntermcgrew/prism-499-flow-entry]: Self-review pass 1 fixes. The asset survey and sweep now run for init-bootstrapped repos with asset signals, and the onboard and start-ticket bodies say what the agent does where the APIs lack it.
- 2026-10-18 [huntermcgrew/prism-499-flow-entry]: Self-review pass 2 fix. The onboard Close marks every step complete, skipped or not, so a finished run does not resume.
- 2026-10-18 [huntermcgrew/prism-499-flow-entry]: PR review pass 1 fixes. `closing-messages.md` no longer claims every skill has a `## Next persona` section, onboard asks before overwriting an unparseable config or state, and start-ticket says exactly which plan sections it writes.
- 2026-10-18 [huntermcgrew/prism-499-build-lane]: Self-review pass 1 fixes. Restored the domain-context anchor and the commit-pause preference, added the doc-root route note to `compatibility.md`, and reworded the audit-workflow reflex line, the anchor-substitution example, and the stale pointers; see Decision: A non-`docs/` doc root needs its own manifest route.
- 2026-10-18 [huntermcgrew/prism-499-build-lane]: PR review pass 1 fixes. Widened the Zoe-verdict clause in `prism-implement`, restored the doc-conventions read and the docs PR title policy, and reworded the UI-gap handoff as a recommendation; the six findings are under `## Review Issues`.
- 2026-10-18 [huntermcgrew/prism-499-review-lane]: Self-review pass 1 fixes. Brought `prism-skill-forge` onto the four tests, restored the coverage rule, smells, AC proposal, and domain anchor in the review skills, and fixed stale persona wording in `CONTEXT.md` and the roster.
- 2026-10-18 [huntermcgrew/prism-499-utilities]: Renamed `devils-advocate` and `prism-skill-forge` to `prism-challenge` and `prism-forge-skill`, thinned them and `prism-handoff` to 38, 112, and 47 loaded lines, and stated the `tdd` ID exception in ADR-0080 and `skill-authoring.md`. No utility reference existed to delete; see Decision: What the utility skills kept.
- 2026-10-18 [huntermcgrew/prism-499-utilities]: Self-review pass 1 fixes. The forge skill cites the writing guide by path again (112 loaded lines), migrate mode regained three facts, and `tdd` is owned in `eject.ts` and `ship-closure.ts`; see Decision: A bare PRISM skill ID is owned in code.
- 2026-10-18 [huntermcgrew/prism-499-utilities]: Self-review pass 2 fixes. A test ties `roles.json` IDs to `checkIsPrismSkillId`, and the stale `prism-*` prose in `eject.ts`, `generate-skills.ts`, and `consumer-sync-flow.md` now says PRISM-owned.
- 2026-10-18 [huntermcgrew/prism-499-utilities]: PR review pass 1 fixes. The forge skill now splits toolkit and consumer steps and loads 119 lines, the guide's ownership wording names `tdd`, and the bare-ID list is private; see Decision: The forge skill splits by install context.
- 2026-10-18 [huntermcgrew/prism-499-utilities]: PR review pass 2 fix. The guide's forge section is scoped to the toolkit repo and names the consumer path.
- 2026-10-18 [huntermcgrew/prism-499-utilities]: Fixed the `tdd` eject test's Windows-only path lookup; the production code was correct. See Debugged Issues.

- 2026-10-18 [huntermcgrew/prism-499-cadence-release]: Renamed Zoe, Lilac, and Reese to `prism-audit`, `prism-standup`, and `prism-qa-plan`, and thinned them with Iris, Sage, and Parker to 54, 57, 49, 94, 56, and 62 loaded lines. Deleted the retro and PRD step trees, the changelog, standup, and QA references, `shipping-flow.md`, `stakes-calibration.md`, and `micro-file-step-machine.md`; see Decision: What the cadence and release skills kept.
- 2026-10-18 [huntermcgrew/prism-499-cadence-release]: Briar pass 1 fixes. Repointed the worktrees-lane, `step-02`, PRD-shape, and Iris-row references, inlined the `audit-state.json` shape, and added the PR body sync to the changelog and QA skills; see Decision: Judgment calls in the cadence and release thinning.
- 2026-10-18 [huntermcgrew/prism-499-cadence-release]: Briar pass 2 fixes. Listed the rewritable PR body sections explicitly in the changelog, QA, and implement skills so Screenshots and Notes stay user-owned, and corrected two Decision details.

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

## Debugged Issues

### Bare-skill eject test failed on Windows

- **Status:** `fixed`
- **Severity:** Low
- **Confidence:** `High`
- **Environment:** `windows-latest` CI only
- **File:** `scripts/ai-skills/eject.test.ts:388`
- **Root cause:** `[Confirmed]` the test looked up the outcome with `o.path.includes(".cursor/skills/tdd")`, but eject builds outcome paths with `path.join`, which uses backslashes on Windows. Production code was correct. The existing marker tests match on a bare name (`prism-handauthored`), which has no separator.
- **Fix:** the lookup uses `o.path.endsWith(path.join(".cursor", "skills", "tdd"))`, so it matches on either platform.
- **Ticket:** `N/A`

## Review Issues

### PR 8: init-bootstrapped shadows the asset survey and sweep

- **Severity:** `major`
- **Status:** `fixed`
- **File:** `.ai-skills/skills/prism-onboard/shared.md:23`
- **Problem:** the survey and sweep were "first-contact only", but init-bootstrapped shadows first-contact and `adopt` writes the sync manifest, so an established repo on the init, adopt, onboard path never reached them.
- **Fixed in:** mode 2 now runs both when asset signals are present, and the question order says "First-contact, or init-bootstrapped with asset signals".

### PR 8: dead pointer to the placement test

- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `.ai-skills/skills/prism-onboard/shared.md:36`
- **Problem:** `.prism/SPEC.md` does not hold the placement test.
- **Fixed in:** the body names the test from the writing-a-rule guide in prose, with no backticked path, which would add the guide's lines to the cap.

### PR 8: onboard states behavior the APIs lack

- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `.ai-skills/skills/prism-onboard/shared.md:40,46,47,54`
- **Problem:** `writeOnboardingConfig` has no `retroEvidence` field, `runRuleGenerators` takes no `load` input, no generator emits a "generator error" skip, and `nextIncompleteStep` could not reach `null` because five steps were never marked.
- **Fixed in:** the body now says the agent merges `retroEvidence` into the config after the write, edits `load:` in the frontmatter after generation, catches and reports a generator error, and marks `stack-detection`, `rule-generation`, `anchor-substitution`, `config-write`, and `build-verify`. The code gaps stay open as follow-ups.

### PR 8: description-template rule has no referent outside bugs

- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `.ai-skills/skills/prism-start-ticket/shared.md:18`
- **Problem:** "every section heading of the type's template" names a template only bugs have.
- **Fixed in:** the rule is scoped to the bug-report template, and features, improvements, and DX get their one-line shapes.

### PR 8: priority and placement review is documented but not in the body

- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `.prism/architect/_toolkit/skills-ecosystem.md:35`
- **Problem:** the roster and `ticket-workflows.md` say the start-ticket skill reviews priority and triage placement for existing tickets, and the thinned body only placed status on create.
- **Fixed in:** the Definition of Ready has a one-clause placement check for Triage and Backlog tickets.

### PR 8: self-assignment is ambiguous against the write gate

- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `.ai-skills/skills/prism-start-ticket/shared.md:36`
- **Problem:** the Branch section assigned silently while the gate listed assignment as a write.
- **Fixed in:** the bullet says assignment is a tracker write that goes through the gate.

### PR 8: stale Decision text and workflow order

- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `.prism/plans/prism-499/plan.md:382`
- **Problem:** the allowlist Decision called `main`'s `measureSkillLoad` stricter than this branch's copy, but the two are now identical, and `_toolkit/onboarding.md` § Workflow order wrote the config before generating rules.
- **Fixed in:** the Decision states that the copies match and the ratchet is exact, and the workflow order is confirm, generate, write.

### PR 8: untouched onboarding steps leave the run resumable forever

- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `.ai-skills/skills/prism-onboard/shared.md:54`
- **Problem:** `initialState` seeds all `ONBOARDING_STEPS` as pending, and steps that are never asked (Linear steps on a `github-issues` repo, the survey and sweep outside their modes, a blank Slack channel, fields `init` wrote) stay pending, so `nextIncompleteStep` never returns `null` and the next run takes Resume.
- **Fixed in:** Close says to mark every step complete when it finishes or is seeded, skipped, or not applicable. The generator fallback now runs the exported `RULE_GENERATORS` one at a time, the Close summary lists discovery decisions whenever the sweep ran, and the Decision lists the survey and sweep for init-bootstrapped with asset signals.

### Audit-workflow doc overstated who carries the Zoe-verdict reflex

- **Severity:** `major`
- **Status:** `fixed`
- **File:** `.prism/architect/_toolkit/audit-workflow.md:169`
- **Problem:** the doc said every skill that acts on Decisions states the reflex, but `prism-implement` handled only `archive-candidate` and the review skills carry no verdict language.
- **Suggested fix:** widen the `prism-implement` clause to all four verdicts and name exactly `prism-architect`, `prism-surface-audit`, and `prism-implement` in the doc and its twin. Fixed in: the PR 7 review-fix commit.

### `prism-docs` dropped the read side of the doc-conventions doc

- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `.ai-skills/skills/prism-docs/shared.md:9`
- **Problem:** the old startup read a consumer's documentation-conventions doc, and the thinned startup only wrote to it.
- **Suggested fix:** add a prose clause, with no backticked path, to read it when it exists. Fixed in: the PR 7 review-fix commit.

### Docs PRs lost their title and body policy

- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `.ai-skills/skills/prism-docs/shared.md:26`
- **Problem:** nothing in the skill's closure cited the PR description rule.
- **Suggested fix:** one sentence stating the title (the commit subject) and the body (reasoning and ticket link, no file list or AC). Fixed in: the PR 7 review-fix commit.

### PR 7 Task 6 described an edit this PR does not make

- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `.prism/plans/prism-499/plan.md:207`
- **Problem:** the task claimed a `prism-self-review` change and a 56-line count, and the diff carries neither.
- **Suggested fix:** state that the review skills are left to PR 6. Fixed in: the PR 7 review-fix commit.

### Callout wording in the user doc template did not match the architect doc

- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `.prism/references/user-doc-template.md:86`
- **Problem:** it said the architect doc's Callouts section says when to use each type, but that section gives count guidance and points to the callouts reference.
- **Suggested fix:** reword both mentions to say count guidance. Fixed in: the PR 7 review-fix commit.

### "A UI gap goes to `prism-design`" read as an invocation

- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `.ai-skills/skills/prism-implement/shared.md:18`
- **Problem:** it dropped the old option to make the call and keep going, and no skill invokes another.
- **Suggested fix:** recommend `prism-design` to the user, or make the call and record it in `## Decisions`. The plan-skill handoff is worded the same way. Fixed in: the PR 7 review-fix commit.

### PR 8: closing-messages claims a `## Next persona` section no skill has

- **Severity:** `major`
- **Status:** `fixed`
- **File:** `.prism/architect/_toolkit/closing-messages.md:69`
- **Problem:** the doc said every persona's `shared.md` has a `## Next persona` section that cites it, and the thinned skills have none.
- **Fixed in:** the doc now says each skill names its next skill in its own closing or handoff text and this doc holds the routing table. Line 49 and the install twin agree. The lesson is in `.prism/lessons.md`.

### PR 8: onboard overwrites an unparseable config or state file without asking

- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `.ai-skills/skills/prism-onboard/shared.md:20`
- **Problem:** the old body warned before overwriting a config that fails to parse. A write over one drops hand-added fields, and `loadState` throws on a corrupt state file.
- **Fixed in:** Mode says to report a parse failure and ask before overwriting the config or restarting the state.

### PR 8: start-ticket overstates what it does not write

- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `.ai-skills/skills/prism-start-ticket/shared.md:1`
- **Problem:** "writes no code, plan, or stories" contradicts the AC Sync Log row and `plan-authoring.md`, which lists the skill as a writer of `## Goal` and bug AC. `docs/personas.md` and `docs/workflow.md` said it initializes or sets up the plan.
- **Fixed in:** the body names what it does not write (code, stories, and plan sections beyond `## Goal`, bug AC, and the AC Sync Log), and both docs drop the plan-setup claim.

### PR 8: the Parker doc says the clarity rubric cites Nora's list

- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `docs/ai-skills/parker.md:48`
- **Problem:** the rubric now lists its own vague words.
- **Fixed in:** the line says so.

### Forge skill claimed a manifest route that does not exist

- **Severity:** `major`
- **Status:** `fixed`
- **File:** `.ai-skills/skills/prism-forge-skill/shared.md:6`
- **Problem:** the body and the Decision "No utility reference could go" said the manifest routes `writing-a-skill.md` on `.ai-skills/skills/**`. It does not, so the run was never told to read the guide.
- **Fixed in:** the forge skill cites `.prism/architect/guides/writing-a-skill.md` by path again (112 loaded lines), and the Decision states the real routing.

### Forge description-shape pointer reached an excluded rule

- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `.ai-skills/skills/prism-forge-skill/shared.md:7`
- **Problem:** the pointer to `skill-authoring.md` led to a rule consumers never receive, and the line told a new skill to list "the old persona name".
- **Fixed in:** the pointer is dropped and the old-name clause applies only to a renamed or replaced persona.

### Migrate mode lost three facts

- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `.ai-skills/skills/prism-forge-skill/shared.md:13`
- **Problem:** the thinned body dropped that the `bootstrap-from-claude.ts` helpers are module-private, that existing canonical source is never overwritten, and that a persona also generates a Claude agent definition.
- **Fixed in:** one clause each, including the verify step.

### The `tdd` ID exception was stated inconsistently and not enforced

- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `.prism/rules/skill-authoring.md:37`
- **Problem:** ADR-0080 and `skill-authoring.md` gave different reasons, `writing-a-skill.md` and `install-layout.md` said PRISM owns only `prism-*`, and `eject.ts` and `ship-closure.ts` keyed on the prefix alone.
- **Fixed in:** one reason in both places, the exception named in the guide and `install-layout.md` (with its twin), and both scripts keyed on `checkIsPrismSkillId` with tests. See Decision: A bare PRISM skill ID is owned in code.

### Nothing tied the bare-ID list to roles.json

- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `scripts/ai-skills/ownership.ts:41`
- **Problem:** a future bare skill ID could ship in `roles.json` without joining `PRISM_BARE_SKILL_IDS`, and would fall out of eject and ship-closure silently.
- **Fixed in:** `ownership.test.ts` asserts every `roles.json` skill ID satisfies `checkIsPrismSkillId`.

### Prefix prose left stale after the ownership change

- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `scripts/ai-skills/eject.ts:279`
- **Problem:** the JSDoc said a marked skill that is not `prism-*` is protected by construction, but a marked `tdd` is removed. The `eject.ts` header, the removal-pass and agent-pass comments, `generate-skills.ts`, and `consumer-sync-flow.md` still said `prism-*`.
- **Fixed in:** all now say PRISM-owned (`checkIsPrismSkillId`), and `consumer-sync-flow.md` and its seed twin say "PRISM skill roster".

### Plan quoted a line count that had moved

- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `.prism/plans/prism-499/plan.md:404`
- **Problem:** the Decision gave the writing guide as 81 lines, and it is now 82.
- **Fixed in:** the Decision keeps "112 loaded" and drops the guide's own count.

### Forge skill's run path used things a consumer lacks

- **Severity:** `major`
- **Status:** `fixed`
- **File:** `.ai-skills/skills/prism-forge-skill/shared.md:1`
- **Problem:** the skill ships to consumers, but its steps named `pnpm prism:build`, `prism:check-types`, `prism:migrate-skill`, canonical source under `.ai-skills/skills/`, `roles.json`, and files that do not ship.
- **Fixed in:** an install-context table splits toolkit and consumer steps, with the scripts under toolkit-only sections; `prism-onboard` now leaves discovered consumer skills in place; the real gap is a follow-up. See Decision: The forge skill splits by install context. 119 loaded lines.

### Forge skill cited `PRISM_OWNED_GLOBS` for skill-ID ownership

- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `.ai-skills/skills/prism-forge-skill/shared.md:5`
- **Problem:** the code for skill-ID ownership is `checkIsPrismSkillId`, not the path globs.
- **Fixed in:** the skill cites `checkIsPrismSkillId` in `ownership.ts`.

### Guide said ownership needs no list and `tdd` was unnamed

- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `.prism/architect/guides/writing-a-skill.md:46`
- **Problem:** "anything that is not `prism-`" and "nobody has to keep a list" are false for `tdd`, and a consumer skill named `tdd` is overwritten.
- **Fixed in:** both sentences reworded and the overwrite stated; the seed copy follows through the build.

### `PRISM_BARE_SKILL_IDS` was exported with no importer

- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `scripts/ai-skills/ownership.ts:41`
- **Problem:** only `checkIsPrismSkillId` is imported.
- **Fixed in:** the constant is module-private.

### Guide's forge section contradicted the consumer column

- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `.prism/architect/guides/writing-a-skill.md:61`
- **Problem:** § Where `prism-forge-skill` fits said Migrate decomposes back into canonical source and that editing generated output is what both modes prevent, with no scope. A consumer has neither canonical source nor a build.
- **Fixed in:** the section is scoped to the toolkit repo and says a consumer hand-writes a `SKILL.md` per host under its own prefix. The section keeps its length, so the forge skill stays at 119 loaded lines.

### PR 10: dead pointer to the worktrees lane

- **Severity:** `major`
- **Status:** `fixed`
- **File:** `.prism/architect/_toolkit/worktree-hygiene.md:9`
- **Problem:** the doc cited the audit skill's `§ Worktree hygiene lane`, and the heading is now `## Worktrees lane`.
- **Fixed in:** the pointer names `§ Worktrees lane`. The seed twin carries no section pointer.

### PR 10: deleted retro step files still cited

- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `.ai-skills/config.schema.json:226`
- **Problem:** `step-02` was cited in the consumer-visible schema descriptions and in `verification-commands.md` and its twin, and the step files are deleted.
- **Fixed in:** each says "the retro skill". A sweep for `step-0` outside history paths and the onboarding skill's own steps finds nothing.

### PR 10: Iris row says multi-voice synthesis

- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `templates/install/AGENTS.md.tmpl:144`
- **Problem:** the row described the dialogue the retro skill no longer writes.
- **Fixed in:** the row says an evidence-cited charter report.

### PR 10: PRD decompose reference points at a removed section

- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `.prism/references/user-stories/prd-decompose.md:14`
- **Problem:** it cited `§ PRD output shape`, which the thinned PRD skill no longer has.
- **Fixed in:** it cites `§ Startup`, where the frontmatter and sections now live. The seed twin matches.

### PR 10: QA cuts not fully recorded

- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `.prism/plans/prism-499/plan.md:441`
- **Problem:** the Decision covered the risk and writing rules only. The heat map, test-design techniques, two anti-patterns, and the Domain Context slot were cut unrecorded, and `qa-test-planning.md` still named Reese as its primary reader.
- **Fixed in:** the Decision lists each cut and its default path, and the doc's intro (and twin) says it is maintainer reference that the QA run does not load.

### PR 10: routing claims overstated

- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `.ai-skills/skills/prism-audit/shared.md:5`
- **Problem:** the skill said the audit-workflow doc loads when the state file is written, which is false on Cursor. The Decision also named routes that fire on edits and that the stub lacks.
- **Fixed in:** the skill inlines the `audit-state.json` shape, and the Decision states which routes exist in the live manifest and the stub and when they fire.

### PR 10: artifact PRs lost the body sync

- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `.ai-skills/skills/prism-changelog/shared.md:41`
- **Problem:** the changelog and QA skills dropped the per-push PR body sync from ADR-0020 and the body format.
- **Fixed in:** each skill gains one sentence on both, and the `shipping-flow.md` Decision records why they do not cite `pr-description.md`.

### PR 10: typo and consent wording

- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `.prism/architect/_toolkit/skills-ecosystem.md:72`
- **Problem:** ", Each finding" should start a sentence, and the audit skill's "Everything else waits for the user" overstated what needs consent.
- **Fixed in:** both reworded, with the twin of the roster row.

### PR 10: body-sync range swallowed user-owned sections

- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `.ai-skills/skills/prism-changelog/shared.md:44`
- **Problem:** "Summary through Ticket" spans Screenshots and Notes, which `pr-description.md` makes user-owned. The same wording sat in the QA skill and `prism-implement`.
- **Fixed in:** all three list the rewritable sections (Summary, What did you do, Why did you do it, How did you achieve it, Ticket, Type of Change, and the checklist) and exclude Screenshots and Notes. `prism-docs` carries no such wording.

### PR 10: two Decision details

- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `.prism/plans/prism-499/plan.md:440`
- **Problem:** the skill-directory route was said to exist only in the live manifest, though `manifest.base.json` and its twin carry it. The `pr-description.md` note named only the changelog skill as pushed over the cap.
- **Fixed in:** the Decisions say "not in the stub" and "both skills".

## PR Readiness

**Last updated:** 2026-10-17
