---
title: Release 1.0.0 — version bump, migration note, and docs
ticket: https://github.com/HunterMcGrew/PRISM/issues/550
stage: spec
status: draft
epic: prism-499
child: 9
---

Child 9 of the Kitchen Line epic (#499). The design source is `.prism/plans/prism-499/spec.md`: row 9 of its Children table ("Version `1.0.0`, the migration note, the docs", proving "A fresh `prism adopt` and an upgrade both pass `prism doctor`") and its Merge order, which puts this child last and has the npm package published by hand after it merges. The epic's approved `intent.md` covers this child, through its Release decision ("ships as `1.0.0`, a clean break with a migration note. `prism update` removes the deleted skills, and old persona names keep routing") and its Regression surface ("A `prism update` must leave a consumer's own skills, docs, plans, and existing git-hook setup alone").

The checked starting point is `origin/main` at `2cb1633a`. npm `latest` is `0.10.0`, published 2026-09-02, before phase 1 began on 2026-10-17. So no phase-1 or Kitchen Line change has reached a consumer, and the migration note covers everything from `0.10.0` to `1.0.0`, not only children 2 to 8. `0.10.0` is commit `7441c073`.

## Requirements

1. `package.json` `"version"` reads `1.0.0`, edited by hand, with no other change to the file.
2. `CHANGELOG.md` opens with a `## [1.0.0] — <YYYY-MM-DD>` entry, above every existing entry, holding the migration note described under Design. Every link in it resolves.
3. The migration note's rename table lists every skill ID present at `0.10.0` and absent at `1.0.0`, each with its replacement or marked retired, and every skill ID added since `0.10.0`.
4. Every persona name that maps to a current skill still routes to it in `.prism/rules/skill-routing.md`. A name with no current skill is named as retired in the migration note.
5. A fresh repo that runs `prism init` and `prism adopt` from the packed `1.0.0` tarball gets a `prism doctor` exit of 0 with no ERROR line.
6. A repo adopted at `0.10.0` and then updated from the packed `1.0.0` tarball gets a `prism doctor` exit of 0 with no ERROR line, and after the update:
   - `.prism/.sync-manifest.json` records version `1.0.0`;
   - no skill ID retired since `0.10.0` remains under `.claude/skills`, `.cursor/skills`, `.agents/skills`, `.claude/agents`, or `.codex/agents`;
   - the consumer's own skill directory and flat plan are byte-identical to before the update;
   - each PRISM hook command appears exactly once in `.claude/settings.json`, with the same counts as the fresh repo;
   - `core.hooksPath` is `.githooks`, and `.claude/hooks/plan/approve.mjs` and `.claude/hooks/commit-gate.mjs` exist.
7. The same upgrade run with `core.hooksPath` set to `.husky` beforehand leaves `core.hooksPath` at `.husky`, and `prism doctor` reports the hooks as left alone.
8. The packed tarball holds no file under `.prism/plans`, `.prism/audits`, `.prism/retros`, `.prism/prds`, `.prism/changelogs`, or `.prism/archived`, and no `.prism/lessons.md`.
9. `docs/publishing-prism.md` shows every `git commit` with the paths it commits after `--`.
10. `docs/adopt-prism.md` lists every `prism doctor` check, in the order `runDoctor` runs them, and is the only doc that lists them. `docs/what-prism-writes.md` summarizes doctor in one line that links to that list.
11. `docs/getting-started.md` lists Atlas's architect-doc offer among the onboarding steps, and no doc in `docs/`, `README.md`, or `CONTEXT.md` tells a reader to start work with "Winston, plan this out" or says Winston plans or writes the tasks.
12. `docs/workflow.md` describes the plan-folder workflow that ships in `1.0.0`, not the flat-plan, persona-driven flow it describes at `2cb1633a`.
13. `docs/troubleshooting.md` has a section that tells a reader which PRISM gate denied an agent's command and what clears it, covering every gate `hook-runtime.md` documents and the git hooks.
14. `README.md`, `docs/overview.md`, `docs/ai-skills/parker.md`, and `CONTEXT.md` no longer name a retired skill, say Winston plans architecture, or say Mira writes user stories.
15. `pnpm prism:check` passes on the branch head.
16. #544's AC-11 human check (decline Atlas's architect-doc offer during onboarding) is run in the fresh scratch repo from requirement 5, and its result is recorded in `plan.md`.

## Design

### Version

Hand-edit `"version": "0.10.0"` to `"version": "1.0.0"` in `package.json`. `npm version` is not used, because it also commits and tags, and the commit has to go through `commit.mjs` with the task subject. Outside test fixtures, `package.json:3` is the only place the string `0.10.0` appears, so no other file carries the version. A version-only change touches no dependency entry, so the commit gate's `new dependency:` allowance isn't needed, though the file is on the default dependency stop path (see Decisions).

The bump lands last, after every docs change is committed, because the proof below packs the tree and its result has to describe what ships.

### Migration note

The note lives in `CHANGELOG.md`, which ships in the tarball through `package.json#files` and was last updated 2026-06-16. `docs/` doesn't ship, so a consumer reading `node_modules` finds only the changelog. The `docs/` pages link to it instead of repeating it. The entry follows this outline, in this order:

1. **Who it's for.** Anyone on `0.10.0` or earlier. Run `npx @huntermcgrew/prism@1.0.0 update`, then `prism doctor`. Flat plans, the consumer's own skills and plans, and a foreign `core.hooksPath` are left alone.
2. **New hooks stop agents on day one.** Claude Code and Codex get them, and Cursor gets none. The commit, secrets, brief, and approve gates, the reconcile gate on PR review, the two kill switches, and which gates ignore them. The secrets gate's remedy is `env-keys.mjs`. Links to the troubleshooting section from requirement 13.
3. **Git hooks.** `.githooks/` and `core.hooksPath`, set by `adopt`, `update`, and session start. A foreign path is left alone. With no command in the `gitHooks` key, the hook skips with a notice.
4. **Skill renames and removals.** An old → new table built from the roster diff below. Sasha is now `prism-debug`, `devils-advocate` is now `prism-challenge`, and `prism-user-stories` is replaced by `prism-intent`. Retired with no replacement: Sol, Ren, Theo, and `prism-review-loop`.
5. **The new workflow.** Plan folders and their stages, the person's two touches (approve the intent, read the PR), approval in chat or from a terminal, and that stages commit while the session pushes. Links to `docs/workflow.md`.
6. **Review and verify.** `REVIEW.md` at the repo root and who owns its markers, the review-misses log and its `.gitattributes` line, `prism-verify`, and the fixed retro stage.
7. **New optional config keys.** `stopPaths`, `testGlobs`, `secretPaths`, `importAliases`, `ci.requiredCheck`, `gitHooks`, and `hooks`. The schema's required list is the same at `0.10.0` and `1.0.0`, so an existing config stays valid.
8. **Codex.** `project_doc_max_bytes` in `.codex/config.toml` and the doctor warning. The note says the repo-level key is not yet verified live.
9. **Also since `0.10.0`.** The compaction arms, the umbrella speed bump, Atlas's architect-doc offer, and the expanded doctor.

The roster diff, `0.10.0` (`7441c073`) → `2cb1633a`:

- Removed: `devils-advocate`, `prism-code-dev`, `prism-code-review-pr`, `prism-code-review-self`, `prism-conductor`, `prism-data`, `prism-debugger`, `prism-documentation`, `prism-doc-walker`, `prism-founder`, `prism-onboarding`, `prism-qa-test-plan`, `prism-refactor-scout`, `prism-review-loop`, `prism-skill-forge`, `prism-standup-summary`, `prism-surface-audit`, `prism-ticket-start`, `prism-user-stories`.
- Added: `prism-audit`, `prism-challenge`, `prism-debug`, `prism-docs`, `prism-forge-skill`, `prism-implement`, `prism-intent`, `prism-metrics`, `prism-onboard`, `prism-plan`, `prism-pr-review`, `prism-qa-plan`, `prism-self-review`, `prism-spec`, `prism-standup`, `prism-start-ticket`, `prism-strategy`, `prism-verify`.

The table is rebuilt from `git ls-tree --name-only 7441c073 .ai-skills/skills/` against the branch head when the entry is written, so a skill added or removed after `2cb1633a` is caught.

### Docs

Each file below is a disjoint edit. Every edited page gets `last_updated` set to the day of the edit, per the Frontmatter schema in `.prism/architect/_toolkit/documentation.md`.

- **`docs/publishing-prism.md`.** Line 59, `git commit -m "chore: bump version to 1.1.0"`, gains ` -- package.json`. The commit gate denies a commit that names no paths, so the guide as written fails for the maintainer. A `git tag` step is an open question (see Decisions).
- **`docs/adopt-prism.md`.** "Check install health with `prism doctor`" lists five checks while `runDoctor` (`scripts/ai-skills/doctor.ts`) runs more. The section is rewritten to every check in run order: config, git repo, sync state, seed delivery (adopted only), rule-load declarations, architect routes, hook registration, git hooks, Codex doc limit (adopted only), `REVIEW.md` (adopted only), host output, and version. Line 37's "Winston, plan this out." becomes an intent-first example, "Mira, write the intent."
- **`docs/what-prism-writes.md`.** "What `prism doctor` does — nothing gets written" keeps its read-only promise and replaces its list with one sentence linking to the `adopt-prism.md` section. Two copies of the list are why each new check drifted, so one copy owns it.
- **`docs/getting-started.md`.** The Atlas onboarding list (about lines 37 to 50) gains the architect-doc offer (`prism-onboard/shared.md`, step 6). Line 57's "Winston, plan this out." becomes "Mira, write the intent", with Winston named for approach questions.
- **`docs/workflow.md`.** Rewritten around the plan-folder chain: intent → design when needed → spec → plan → two challenge rounds → implement → verify → review → draft PR → PR review → retro. It covers the person's two touches, resuming from folder state, a persona table that includes Sasha (`prism-debug`) and Winston as the consult, and that flat plans still work. It links to `.prism/rules/workflow.md` and does not copy its resume table, because `documentation.md` keeps agent-facing spec out of the doc root and has the two cross-reference. At `2cb1633a` the page has no Sasha row, has Winston writing tasks, Clove pushing, Briar writing `## Review Issues`, Mira writing user stories, and flat plans only.
- **`README.md`, `docs/overview.md`, `docs/ai-skills/parker.md`, `CONTEXT.md`.** `README.md:7` and `:11`, and `docs/overview.md:17` and `:31`, say Winston plans architecture or lead the lifecycle with him. `docs/ai-skills/parker.md:21` says Winston plans an initiative, and `:66` says Mira writes user stories. `CONTEXT.md:51` names `prism-review-loop` as a utility skill example, and becomes `prism-plan`.
- **`docs/troubleshooting.md`.** A new section, "A PRISM hook denied an agent's command", with a gate → what clears it table. Rows for the write gate, the umbrella speed bump, the secrets gate, the commit gate, the approve guard, the brief gate, the reconcile gate, and the git hooks skipping or yielding to a foreign `core.hooksPath`. A short paragraph names the two kill switches and the gates that ignore them. The page cites `.prism/architect/_toolkit/hook-runtime.md` for detail rather than restating it.

Two checks guard the stale-phrasing sweep. `git grep -nE "review-loop|Winston, plan|Winston plans|plan this out|User story" -- docs README.md CONTEXT.md` prints nothing. At `2cb1633a` it matches `CONTEXT.md:51`, `README.md:7`, `docs/adopt-prism.md:37`, `docs/ai-skills/parker.md:21` and `:66`, `docs/getting-started.md:57`, `docs/overview.md:17`, and `docs/workflow.md:25` and `:27`, so it fails on `main`. A grep of the retired skill IDs over the same paths matches only `CONTEXT.md:51` at `2cb1633a`.

### Adopt and upgrade proof

The proof runs against the packed tarball, never the source tree, because only the tarball shows what a consumer receives, the same reason `npm-packaging.md` gives for its packaging-parity gate. It runs after every docs commit and the version commit, in a scratch directory `$S`, on Linux. Windows is covered by CI's `prism:check`.

```bash
pnpm install --silent && pnpm run prism:check
npm pack --pack-destination "$S"
TGZ="$S/huntermcgrew-prism-1.0.0.tgz"
tar tzf "$TGZ" | grep -E 'prism/(plans|audits|retros|prds|changelogs|archived)/|prism/lessons\.md' && echo LEAK || echo CLEAN
INIT='--project Acme --ticket-prefix ACME --ticket-system github-issues --github-owner acme --github-repo app'
mkdir "$S/fresh" && cd "$S/fresh" && git init -q -b main && git commit -q --allow-empty -m init
npx -y --package="$TGZ" prism init $INIT && npx -y --package="$TGZ" prism adopt
npx -y --package="$TGZ" prism doctor; echo "exit=$?"
mkdir "$S/up" && cd "$S/up" && git init -q -b main && git commit -q --allow-empty -m init
npx -y @huntermcgrew/prism@0.10.0 init $INIT && npx -y @huntermcgrew/prism@0.10.0 adopt
mkdir -p .claude/skills/acme-notes && echo '# mine' > .claude/skills/acme-notes/SKILL.md
mkdir -p .prism/plans && echo '# Plan: acme-1' > .prism/plans/acme-1.md
git add -A && git commit -qm "0.10.0 baseline"
npx -y --package="$TGZ" prism update
npx -y --package="$TGZ" prism doctor; echo "exit=$?"
git diff --quiet HEAD -- .claude/skills/acme-notes .prism/plans; echo "untouched=$?"
```

The `.husky` variant repeats the upgrade in a third directory with `git config core.hooksPath .husky` before `update`. Each WARN and INFO line doctor prints in the three runs is recorded in `plan.md` with a reason. The upgrade checks in requirement 6 and the variant check in requirement 7 are read from these three directories.

Orphan cleanup keys on the managed marker, per `consumer-sync-flow.md`, so it should remove the bare `devils-advocate` directory as well as the `prism-*` ones. That has not been run. A retired skill left on disk or a duplicated hook registration is a code defect: it goes back to the plan stage as a re-plan, not into a docs workaround.

### Shared contracts

`package.json` `"version"` is the published package's version, which every consumer's `prism update` and doctor's version check read. `1.0.0` signals a clean break, which the intent's Release decision chose. No shared type, public function, or dependency changes.

## Affected systems

```text
package.json
CHANGELOG.md
README.md
CONTEXT.md
docs/publishing-prism.md
docs/adopt-prism.md
docs/what-prism-writes.md
docs/getting-started.md
docs/workflow.md
docs/overview.md
docs/troubleshooting.md
docs/ai-skills/parker.md
```

## Decisions

- **`package.json`, `CHANGELOG.md`, `README.md`, and `CONTEXT.md` join Affected systems as scope changes that follow from the outcome.** The intent's systems list names `docs/` but none of these four. The version lives only in `package.json`, the migration note the intent requires lives in `CHANGELOG.md`, and `README.md` and `CONTEXT.md` carry lines this release makes false. Winston's fit verdict: proceed with changes.
  - → no promotion needed (scope bookkeeping for this ticket)
- **`package.json` sends `plan.md` to Hunter for approval.** It is on the default dependency stop path, so `auto-approve.mjs` exits 1. Hunter's approval of `plan.md` is the go-ahead for the version bump.
  - → no promotion needed (already how plan approval works: `package.json` is on the default dependency stop path `auto-approve.mjs` reads)
- **The migration note covers `0.10.0` → `1.0.0`, not only children 2 to 8.** npm `latest` predates phase 1, so phase 1, PRISM-477, PRISM-488, PRISM-492, PRISM-513, and #534 have never reached a consumer either. Winston's fit verdict: proceed with changes.
  - → no promotion needed (the range this one release note covers)
- **One PR.** About a dozen files, nearly all prose with one job. If review needs a split, the cut is the docs first, then the changelog, the version, and the proof.
  - → no promotion needed (the PR cut for this ticket)
- **Publishing and the epic retro follow the merge.** Hunter publishes by hand per `docs/publishing-prism.md`. The epic retro then appends `## Retro` to `.prism/plans/prism-499/spec.md`, after the publish, so it can cite the published version.
  - → no promotion needed (the order of this epic's last steps; the epic retro is still to run)
- **No committed pack → adopt → doctor test in this release.** Rejected for now: it would add a networked, slow test to `prism:check` on the release ticket. It is a follow-up PR after the release.
  - → no promotion needed (a deferred test, carried as an action item in the retro report)
- **OPEN — TBD, needs Hunter input.** Whether the migration note lives only in `CHANGELOG.md` or is also copied into a `docs/` page. **Default path (used until resolved):** `CHANGELOG.md` only, because it is the one copy that ships, and the docs link to it.
  - → no promotion needed (still open; the default shipped, and PR #551's Notes list it as D1 for Hunter)
- **OPEN — TBD, needs Hunter input.** Whether `CHANGELOG.md` backfills entries for `0.7.0` to `0.10.0`, which it never recorded. **Default path (used until resolved):** no backfill; the `[1.0.0]` entry carries one line saying those versions are not tracked here.
  - → no promotion needed (still open; the default shipped, and PR #551's Notes list it as D2 for Hunter)
- **OPEN — TBD, needs Hunter input.** Whether `docs/publishing-prism.md` gains a `git tag v<version>` step. Tags stopped at `v0.8.0`, and Sage (`prism-changelog`) and Reese (`prism-qa-plan`) key on tags. **Default path (used until resolved):** no tag step is added; the only edit to the guide is the commit path.
  - → no promotion needed (still open; the default shipped, and PR #551's Notes list it as D3 for Hunter)
- **OPEN — TBD, needs Hunter input.** The intent says "old persona names keep routing", and Sol, Ren, and Theo have no current skill to route to. **Default path (used until resolved):** every persona name with a current skill routes, as requirement 4 states, and the migration note names Sol, Ren, and Theo as retired with no replacement.
  - → no promotion needed (still open; the default shipped, and PR #551's Notes list it as D4 for Hunter)
