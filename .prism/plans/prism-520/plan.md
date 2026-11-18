---
title: Port the chain scripts, plan-folder templates, and shell parser
ticket: https://github.com/HunterMcGrew/PRISM/issues/520
stage: plan
status: draft
---

Child 4 of the Kitchen Line epic (#499). The design comes from the epic spec on `huntermcgrew/prism-499-approve-once` (PR #518), at `.prism/plans/prism-499/spec.md`: the Children table row 4, the "Plan folder" and "Scripts" parts of its Design, and the "Agent hooks" paragraph that assigns the shell parser port to this child. The thrive reference is TracTru/thrive at `db3570975431fa1d6114cc5f4170c126f6be7e97`, which contains every script tip from #2853, #2854, and #2859.

**Goal:** PRISM ships the plan-chain scripts that later children call: the four chain templates, frontmatter helpers, folder-aware plan lookup with a separate archive search, the task parser, the bundle check, the commit script, auto-approval, stop paths, the citation lint, and thrive's shell parser. Each is inert until child 5 uses it, and each is proved by its own suite.

## Tasks

Parallel groups, worked out by hand because `bundles.mjs` does not exist until this child lands. Each group's tasks touch disjoint files.

- Group 1: T1, T3, T4, T5, T6, T11, T14
- Group 2: T2, T7, T10, T12, T15
- Group 3: T8, T9, T13, T16
- Group 4: T17, T18

Every task is Clove's except T18, which is Eli's. These conventions hold for every task:

- **Precondition.** Child 2 (#516) is merged to `main`. Start the build with `git merge origin/main`. T6, T10, and T12 import `readRepoConfig` from `scripts/ai-skills/hooks/lib/command.mjs`, which child 2's T1 adds. If that file is not on `main`, stop and report the build as blocked rather than writing a second config reader.
- **Reading thrive.** `gh api "repos/TracTru/thrive/contents/<path>?ref=db3570975431fa1d6114cc5f4170c126f6be7e97" -q .content | base64 -d`. "Port" means copy the file and change only the swaps the task names, plus the JSDoc types `checkJs` asks for.
- **Runtime modules.** Each new `.mjs` starts with the three-line `@prism-hook-runtime` header copied from `scripts/ai-skills/hooks/lib/match.mjs`. It imports only `node:` builtins and sibling runtime modules, and gets a `.d.mts` sidecar. It must pass `pnpm prism:check-types`, which runs `tsconfig.hooks.json` with `strict` and `checkJs`. Fix type errors with JSDoc annotations and never by changing behavior.
- **Tests.** Each suite is a top-level `scripts/ai-skills/<name>.test.ts` using `node:test` and `node:assert/strict`, because `run-tests.ts` discovers only `*.test.ts`. A thrive `.test.mjs` is ported case for case and given the parameter types strict `tsc` needs.
  - Fixture git repos set `GIT_CONFIG_NOSYSTEM=1` and point `GIT_CONFIG_GLOBAL` at an empty temp file, never `/dev/null`, which does not exist on Windows.
  - A symlink case skips on `win32` when `symlinkSync` throws `EPERM`.
  - A `chmod 0o000` case skips on `win32` and when running as root.
- **Entry guards.** CLI modules keep thrive's `realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)` guard. None of them is reachable from `cli.ts`, so the esbuild collapse that `npm-packaging.md` describes does not apply.
- **Globs.** Every glob these scripts match goes through `compileMatcher` from `scripts/ai-skills/hooks/lib/match.mjs`. Never use `path.matchesGlob`.
- **Commits.** One commit per task, subject `PRISM-520: <summary> (T<n>)`.

### T1: Port the shell tokenizer

- files: scripts/ai-skills/hooks/lib/tokenize.mjs, scripts/ai-skills/hooks/lib/tokenize.d.mts, scripts/ai-skills/hook-tokenize.test.ts
- proof: pnpm exec tsx --test scripts/ai-skills/hook-tokenize.test.ts
- proof fails on main: yes
- depends on: none

Owner: Clove. Port thrive's `scripts/hooks/lib/tokenize.mjs` with no source swaps. It has no imports and no thrive literals. The sidecar declares exactly four exports:

- `tokenize(cmd)`, which returns `{ tokens: string[]; operators: Set<number>; bodies: Set<number>; substitutions: string[] }` and throws on an unbalanced quote, ANSI-C quote, backtick, or `$( )`
- `flattenCommand(inner: string): string`
- `REDIRECTS` and `PIPES`, which are `Set<string>`

Port `scripts/hooks/lib/tokenize.test.mjs` whole, including the test that pins the export list to these four names.

### T2: Port the shell segment walker

- files: scripts/ai-skills/hooks/lib/segments.mjs, scripts/ai-skills/hooks/lib/segments.d.mts, scripts/ai-skills/hook-segments.test.ts
- proof: pnpm exec tsx --test scripts/ai-skills/hook-segments.test.ts
- proof fails on main: yes
- depends on: T1

Owner: Clove. Port thrive's `scripts/hooks/lib/segments.mjs`. It imports `node:os`, `node:path`, and `./tokenize.mjs`.

The source keeps its header's known-misses list word for word. The sidecar declares `SHELLS`, `SHELL_STRING_FLAG`, `walkSegments(cmd, { cwd, maxDepth })`, `resolveDir`, `containsSubstitution`, `readFedStdin`, `toHostPath`, and `shellOperandAt`, with the segment shape from thrive's doc comment as an exported interface. The module is not wired into `hook.mjs` or `git-gates.mjs`. Child 5's approve guard is its first caller.

Port `scripts/hooks/lib/segments.test.mjs` with two test-data swaps: the container name `thrive-admin-1` becomes `app-1`, and the path `.ai-spec/rules/a.md` becomes `.prism/rules/a.md`. Add one case: `walkSegments("bash -c 'cd sub && git commit -m x'", { cwd: root })` yields a segment whose `argv[0]` is `git`, whose `via` is `shell-string`, and whose `cwd` is `path.join(root, "sub")`.

### T3: Port the chain-file frontmatter helpers

- files: scripts/ai-skills/hooks/plan/frontmatter.mjs, scripts/ai-skills/hooks/plan/frontmatter.d.mts, scripts/ai-skills/plan-frontmatter.test.ts
- proof: pnpm exec tsx --test scripts/ai-skills/plan-frontmatter.test.ts
- proof fails on main: yes
- depends on: none

Owner: Clove. Port thrive's `scripts/plan/frontmatter.mjs`. It has no imports. The one swap is `CHAIN_FILE`, which becomes `/(?:^|\/)\.prism\/(?:archived\/)?plans\/([^/]+)\/(intent|design|spec|plan)\.md$/i`. Group 1 is still the folder and group 2 the stage.

The sidecar declares `CHAIN_FILE`, `readFrontmatter`, `matchApprovalLine`, `approvalLines`, `replaceFrontmatterLine`, `stampApproval`, `formatLocalDate`, and `sectionBody`. All of them are ported now, even the approval helpers only child 5 calls, so the module lands whole.

Thrive ships no suite for this file, so write one:

- `CHAIN_FILE` matches `.prism/plans/acme-1/plan.md` and `.prism/archived/plans/acme-1/intent.md`. It rejects `.prism/plans/acme-1/notes.md`, `.prism/plans/acme-1.md`, and `.ai-spec/plans/acme-1/plan.md`.
- `readFrontmatter` keeps the first of two `title:` lines and returns null for a file with no frontmatter block.
- `approvalLines` with two `status:` lines does not report `approved`.
- `stampApproval` writes the three lines with no `approved_via`, and writes four lines when `via` is `chat`.
- `replaceFrontmatterLine` leaves a `Status:` line alone, because the match is case-sensitive, and never touches a matching line below the frontmatter block.
- `sectionBody`:
  - strips HTML comments and reads CRLF as LF
  - stops at the next `##` heading but not at a `###`, and ignores a `##` inside a fenced block
  - returns null for an absent heading
- `formatLocalDate(new Date(2026, 0, 5))` is `2026-01-05`.

### T4: Add the stopPaths and importAliases config keys

- files: .ai-skills/config.schema.json, scripts/ai-skills/plan-config-schema.test.ts
- proof: pnpm exec tsx --test scripts/ai-skills/plan-config-schema.test.ts
- proof fails on main: yes
- depends on: none

Owner: Clove. Add two top-level properties after `hooks`.

`stopPaths` is an object with `additionalProperties: false`. It has two optional arrays of strings, `dependency` and `contract`. Its description says:

- These are paths where a plan always needs a person, in two kinds:
  - `dependency` is manifests and lockfiles. When it is unset, a built-in list of common manifests and lockfiles applies.
  - `contract` is shared-contract trees. It defaults to empty.
- A list that is set replaces its default and does not add to it.
- Patterns use the manifest route syntax: `**` crosses directories, `*` stays within one segment, and a `**/` prefix does not match a file at the repo root, so list root files on their own.
- Matching ignores case, and a directory that holds a match also matches.

`importAliases` is an object whose `additionalProperties` is a string. Each key is an import specifier prefix, and each value is the repo-relative path prefix it stands for, as in `{ "@/": "src/" }`. The description says the bundle check uses it to turn an aliased import into a dependency edge, and ignores a bare specifier that matches no key.

The test validates through `config-schema-validate.ts`, the same path `prism update` uses:

- A config with both keys passes.
- A config with `stopPaths.extra` fails.
- A config with `stopPaths.dependency: "package.json"` (a string, not an array) fails.
- A config with `importAliases: { "@/": 3 }` fails.
- The positive control is that PRISM's own `.ai-skills/config.json` still passes.

PRISM's own config gets neither key, so PRISM runs on the defaults.

### T5: Port stop paths with config-driven lists

- files: scripts/ai-skills/hooks/plan/stop-paths.mjs, scripts/ai-skills/hooks/plan/stop-paths.d.mts, scripts/ai-skills/plan-stop-paths.test.ts
- proof: pnpm exec tsx --test scripts/ai-skills/plan-stop-paths.test.ts
- proof fails on main: yes
- depends on: none

Owner: Clove. This adapts thrive's `scripts/plan/stop-paths.mjs`. Imports: `node:path` and `compileMatcher` from `../lib/match.mjs`.

Exports:

- `DEFAULT_DEPENDENCY_FILES`, in this order: `package.json`, `**/package.json`, `package-lock.json`, `**/package-lock.json`, `pnpm-lock.yaml`, `**/pnpm-lock.yaml`, `yarn.lock`, `**/yarn.lock`, `bun.lockb`, `**/bun.lockb`, `composer.json`, `**/composer.json`, `composer.lock`, `**/composer.lock`, `pyproject.toml`, `**/pyproject.toml`, `poetry.lock`, `**/poetry.lock`, `uv.lock`, `**/uv.lock`, `requirements.txt`, `**/requirements.txt`, `go.mod`, `**/go.mod`, `go.sum`, `**/go.sum`, `Cargo.toml`, `**/Cargo.toml`, `Cargo.lock`, `**/Cargo.lock`, `Gemfile`, `**/Gemfile`, `Gemfile.lock`, `**/Gemfile.lock`.
- `resolveStopPaths(config)` returns `{ dependency, contract }`.
  - `dependency` is `config?.stopPaths?.dependency` when that is an array, else `DEFAULT_DEPENDENCY_FILES`.
  - `contract` is `config?.stopPaths?.contract` when that is an array, else `[]`.
- `matchStopPath(file, stopPaths)` returns `{ kind: "dependency" | "contract", glob } | null`.
  - Normalize the file: `path.posix.normalize`, strip a leading `./`, strip trailing `/`, then lowercase.
  - For each pattern, `dependency` first and then `contract`, compare lowercased. A pattern hits when `compileMatcher(pattern)(file)` is true, or when the file holds the pattern.
  - The file holds the pattern when the pattern's literal prefix (the `/`-segments before the first segment containing `*`) is non-empty and either equals the file or starts with `file + "/"`. So `src` and `src/contracts` both hit `src/contracts/**`, and `src` hits `src/package.json`.
  - Return the first hit with the original, un-lowercased pattern as `glob`.

Port `scripts/plan/stop-paths.test.mjs` with the contract cases rewritten against a test-supplied list `["src/contracts/**", "api/schema/**"]` in place of thrive's tree. Keep these cases:

- root and nested `package.json`
- `PACKAGE.JSON` and `Src/Contracts/x.ts`
- a `./` prefix and a trailing slash
- `src` and `src/contracts` holding a contract glob
- `**/package.json` not matching a root `package.json` on its own, while the root entry does
- an empty `contract` list matching nothing under `src/contracts/`
- a configured `dependency: ["deps.lock"]` replacing the default, so `package.json` no longer hits

### T6: Port the task parser with the configured ticket prefix and default branch

- files: scripts/ai-skills/hooks/plan/tasks.mjs, scripts/ai-skills/hooks/plan/tasks.d.mts, scripts/ai-skills/plan-tasks.test.ts
- proof: pnpm exec tsx --test scripts/ai-skills/plan-tasks.test.ts
- proof fails on main: yes
- depends on: none

Owner: Clove. Port thrive's `scripts/plan/tasks.mjs`, keeping the task grammar, the field rules, every throw, and the done rule as they are. The done rule is first-parent from the commit that added `intent.md` when one sits beside `plan.md`, and otherwise `<base>..HEAD`. The swaps:

- **Default base.** `DEFAULT_BASE = "origin/main"` goes. When `--base` is not given, `loadPlanState` reads `git rev-parse --show-toplevel` from the plan's directory, then `readRepoConfig(toplevel)` (from `../lib/command.mjs`), and uses `origin/<defaultBranch>`, where `defaultBranch` falls back to `main` when it is unset or the config is unreadable.
- **Ticket subject.** `parseSubject(subject, ticketPrefix = null)` builds the ticket form from the prefix: the escaped prefix, case-insensitive, `^<prefix>-\d+: \S`. With no prefix it never returns the `ticket` kind. `loadPlanState` passes `ticketPrefix` from the same config read. Only `task` subjects count toward done, as before.
- **Usage text.** It reads `Usage: tasks.mjs <plan.md> [--base <ref>] [--json]` with no directory, because the path differs between PRISM's tree and a consumer's.

The sidecar declares a `Task` interface with thrive's fields and types: `parseTasks`, `parseSubject`, `doneTasks`, `parseCliArgs`, and `loadPlanState`.

Port `scripts/plan/tasks.test.mjs` case for case, with these swaps:

- `THR-123:` subjects become `ACME-123:`, with `ticketPrefix: "ACME"`.
- Fixture repos write `.ai-skills/config.json` where a case needs a config.
- One new case: with `defaultBranch: "trunk"` and a `refs/remotes/origin/trunk` ref, the done set reads from `origin/trunk`. With no config, it reads from `origin/main`.
- One new case: `parseSubject("ACME-1: x")` with no prefix returns null.

### T7: Write the folder-aware plan lookup and the archive search

- files: scripts/ai-skills/hooks/plan/lookup.mjs, scripts/ai-skills/hooks/plan/lookup.d.mts, scripts/ai-skills/plan-lookup.test.ts
- proof: pnpm exec tsx --test scripts/ai-skills/plan-lookup.test.ts
- proof fails on main: yes
- depends on: T3

Owner: Clove. This adapts thrive's `scripts/plan/lookup.mjs`. Imports: `node:fs`, `node:path`, and `readFrontmatter` from `./frontmatter.mjs`. Every function is synchronous, so a hook can call it without awaiting.

Exports:

- `CHAIN_FILES = ["intent.md", "design.md", "spec.md", "plan.md"]`.
- `resolvePlan(repoRoot, ticketId)` reads only `.prism/plans/`. It returns `{ kind: "folder" | "flat" | "epic-folder" | "epic-flat", dir: string | null, file: string } | null`, with repo-relative POSIX paths and `dir` null for a flat plan.
- `findArchivedPlan(repoRoot, ticketId)` uses the same rules over `.prism/archived/plans/` only.

Behavior, for each root:

1. Throw `TypeError` unless `ticketId` matches `/^[a-z][a-z0-9]*-\d+$/i`. Use the lowercased id from here on. The check also keeps a path segment out of the id.
2. Name tiers, in order:
   - `<id>/` when it holds a chain file as a regular file
   - `<id>.md`
   - `epic-<id>/` with the same chain-file test
   - `epic-<id>.md`
3. Ticket scan. Read the root's direct entries, sorted with `localeCompare`:
   - A directory holding a chain file matches when any of its chain files has a frontmatter `ticket:` value matching the boundary pattern `(?:^|[^a-z0-9])<id>(?:[^a-z0-9]|$)` (case-insensitive).
   - A `*.md` file matches when the first content line under `## Ticket` matches the same pattern. That line is read with `resolve-live-plan.ts`'s `/## Ticket\s*\r?\n+([^\r\n#]*)/i`.
   - A name starting with `epic-` gives the epic kind.
4. A folder's `file` is its latest-stage chain file: `plan.md`, else `spec.md`, else `design.md`, else `intent.md`.
5. `ENOENT` and `ENOTDIR` read as absent. Every other fs error is rethrown.

A directory with no chain file, such as `conductor/` or `retros/`, never resolves.

Port `scripts/plan/lookup.test.mjs` with these swaps:

- `.ai-spec/plans` becomes `.prism/plans`.
- The archive directory becomes `.prism/archived/plans`.
- `thr-` ids become `acme-` ids.

Then add these cases:

- **Folders.**
  - A folder holding only `intent.md` resolves ahead of a flat `acme-1.md` with `file` = `.prism/plans/acme-1/intent.md`.
  - A folder with `intent.md` and `spec.md` gives `spec.md`.
  - `epic-acme-2/` holding `intent.md` and `spec.md` gives kind `epic-folder` and `spec.md`.
  - A folder holding only `notes.md` does not resolve.
- **Ticket scan.**
  - A ticket scan hit on a folder's `plan.md` frontmatter resolves.
  - A `ticket:` URL such as `https://example.test/issues/1` does not match `acme-1`.
  - `acme-7` does not match `acme-70` in either scan form.
- **Archive.**
  - `resolvePlan` never returns a path under `.prism/archived/`, even when only the archive holds the plan.
  - `findArchivedPlan` finds an archived folder and an archived flat plan.
- **Input.** `resolvePlan(root, "../x-1")` throws `TypeError`.

### T8: Route resolveLivePlan through the shared lookup

- files: scripts/ai-skills/lib/resolve-live-plan.ts, scripts/ai-skills/lib/resolve-live-plan.test.ts
- proof: pnpm exec tsx --test scripts/ai-skills/lib/resolve-live-plan.test.ts scripts/ai-skills/spec-scope-lint.test.ts
- proof fails on main: yes
- depends on: T7
- behavior change: a plan folder that holds any chain file now resolves ahead of a flat plan of the same id, returning its latest-stage file, where before a folder without plan.md fell through to the flat tier. An epic folder and a folder's ticket field now resolve too. The spec defines a plan folder as one holding a chain file.

Owner: Clove. In `resolve-live-plan.ts`:

- Import `resolvePlan` from `../hooks/plan/lookup.mjs`.
- In `resolveLivePlan`, after `extractTicketId` returns an id, return `resolvePlan(repoRoot, ticketId)?.file ?? null`.
- Delete the inline folder, direct, and epic checks, `findPlanByTicketField`, and any helper left with no caller (`ticketIdBoundaryPattern`, `escapeRegExp`, and the `pathExists` import if unused). The id regex `[a-z]+-\d+` always satisfies the lookup's check, so the `TypeError` path is unreachable from here.
- Keep `extractTicketId`, `findUnfiledPlanCandidatesBySlug`, the slug fallback, and the "never reads `.prism/archived/`" guarantee unchanged.
- Rewrite the file's opening JSDoc to name the lookup order in `lookup.mjs` and drop the sentence saying the rule does not yet name the folder tier.

In the test file:

- Rename "a plan folder with no plan.md falls through to the flat tier" to "a plan folder holding only intent.md wins over a flat plan of the same id", and assert `.prism/plans/prism-1003/intent.md`. This is the behavior change above.
- Add an epic-folder case and a folder ticket-field case.
- Every other existing assertion stays as written. `spec-scope-lint.test.ts` runs in the proof because its plan resolution goes through this function.

### T9: Route the compaction arms' plan lookup through the shared lookup

- files: scripts/ai-skills/hooks/compact-handoff.mjs, scripts/ai-skills/compact-handoff.test.ts
- proof: pnpm exec tsx --test scripts/ai-skills/compact-handoff.test.ts
- proof fails on main: yes
- depends on: T7
- behavior change: findPlanForBranch now resolves plan folders and runs the ticket-field scan, where before it checked four fixed flat paths. A folder-plan branch had no plan path in its compaction summary.

Owner: Clove. In `findPlanForBranch`:

- Keep the `ticketPrefix` extraction and its boundary regex.
- Replace the four-candidate list with `resolvePlan(repoRoot, id)?.file ?? findArchivedPlan(repoRoot, id)?.file ?? null` (imported from `./plan/lookup.mjs`), inside a `try` that returns null on any throw. The compaction arms must never fail.
- Delete `PLANS_RELATIVE` and `ARCHIVED_PLANS_RELATIVE` if nothing else reads them.
- Rewrite the JSDoc to say a live plan is found first, then an archived one, and that the `## Ticket` scan now runs.

In the test, keep the existing assertions: flat, epic, archived, case-insensitive prefix, `acme-70`, `notacme-7`, and `hook-pr-896bdc`. If one pins the skipped `## Ticket` scan, flip it under the behavior change above. Add these cases:

- `dev/acme-7-x` with `.prism/plans/acme-7/plan.md` resolves to that path.
- A flat `notes.md` whose `## Ticket` names `acme-8` resolves for `dev/acme-8-x`.
- A live folder plan wins over an archived flat plan of the same id.

### T10: Port the bundle check onto PRISM's manifest

- files: scripts/ai-skills/hooks/plan/bundles.mjs, scripts/ai-skills/hooks/plan/bundles.d.mts, scripts/ai-skills/plan-bundles.test.ts
- proof: pnpm exec tsx --test scripts/ai-skills/plan-bundles.test.ts
- proof fails on main: yes
- depends on: T3, T6

Owner: Clove. This adapts thrive's `scripts/plan/bundles.mjs`. It keeps the duplicate-claim rule, the import-edge rule, cycle detection, grouping, the amended-plan behavior (done tasks claim nothing), the `--base` approval gate, and every message, with the CLI prefix `bundles.mjs:`. The swaps:

- **No architect hook.** Drop the import of thrive's architect-context hook.
  - The repo root comes from `findRepoRoot(path.dirname(planPath))`, imported from `../architect-route.mjs`. It is async, so `main` awaits it.
  - The manifest is `JSON.parse` of `<repoRoot>/.prism/architect/manifest.json`, or `{}` when that file is absent.
  - A file's docs are `matchDocsForPath(manifest, file)` from `../architect-route.mjs`. That is PRISM's flat manifest, already skipping the `umbrellas` key, and it replaces thrive's `code` and `authoring` sections.
- **Import scanning.** Copy thrive's `extractImportSpecifiers` and its four regexes verbatim from `scripts/hooks/architect-context/hook.mjs` at the same ref into this module, and export it.
- **Aliases.** Delete the hard-coded `@frontend/` rule. `analyzeBundles({ tasks, done, repoRoot, manifest, aliases = {} })` resolves a specifier that starts with an `aliases` key by swapping the longest matching key for its value. A `.`-led specifier resolves as before, and anything else is ignored. The CLI passes `readRepoConfig(repoRoot)?.importAliases ?? {}`.
- `RESOLVE_EXTENSIONS` stays `[".ts", ".tsx", ".mjs", ".js"]`.

Port `scripts/plan/bundles.test.mjs` with these swaps:

- Fixtures write a flat manifest such as `{ "src/a/**": "_toolkit/a.md", "umbrellas": [".prism/rules/*.md"] }`.
- The `@frontend/` case passes `aliases: { "@frontend/": "frontend/" }`.

Required cases, kept or added:

- **Duplicate claims.**
  - Two open tasks listing `src/a.ts` with no dependency give `duplicates: [{ file: "src/a.ts", ids: ["T1", "T2"] }]`, and the CLI exits 1 with `Duplicate claim: src/a.ts is listed by T1 and T2`.
  - The positive control is the same plan with `depends on: T1` on T2, which exits 0.
  - A done T1 and an open T2 sharing a file is not a duplicate.
- **Imports.**
  - An import edge between tasks adds `T2 depends on T1`.
  - An aliased import adds the same edge.
  - A bare `node:fs` import adds nothing.
- **Manifest.**
  - Two tasks routed to the same docs share a group, and a task with no route shows `docs: none`.
  - The `umbrellas` key is never treated as a route.
- **Plan state.**
  - A cycle exits 1 with `Dependency cycle:`.
  - `--base` on an unapproved plan exits 1 with the not-approved message.

### T11: Replace commit.sh with a cross-platform commit script

- files: scripts/ai-skills/hooks/plan/commit.mjs, scripts/ai-skills/hooks/plan/commit.d.mts, scripts/ai-skills/plan-commit.test.ts
- proof: pnpm exec tsx --test scripts/ai-skills/plan-commit.test.ts
- proof fails on main: yes
- depends on: none

Owner: Clove. This rewrites thrive's `scripts/plan/commit.sh` as `.mjs` with the same behavior. Every git call is `spawnSync("git", [...args], { cwd, env, encoding: "utf8" })` with an argv array and no shell, so quoting is the same on every platform.

- **Entry and export.** `node commit.mjs "<subject>" <path>...` runs `runPlanCommit({ cwd, subject, paths, env })`, which returns `{ exitCode, stdout, stderr }` and is exported for tests.
- **Usage.** Fewer than two arguments, or an empty subject, exits 2 with `Usage: commit.mjs "<subject>" <path>...`.
- **Unchanged paths.** For each path that exists on disk, run `git --literal-pathspecs status --porcelain --untracked-files=all -- <path>`. Empty output marks it unchanged.
  - Any unchanged path exits 1 before anything is staged, with `commit.mjs: no change to commit in: <paths>. Make the edit first, in its own command, or drop the path.`
  - A deleted path skips this check.
- **Commit steps.** `git --literal-pathspecs add -- <paths>`, then `git --literal-pathspecs commit -m <subject> -- <paths>`.
  - Committing with a pathspec keeps a sibling's staged files staged and out of this commit.
  - Literal pathspecs make `:/` a missing path, not the repo root.
- **Lock retry.** A step that exits non-zero with `index.lock` in its stderr is retried, up to `PRISM_PLAN_COMMIT_RETRIES` attempts in total (default 20), sleeping `PRISM_PLAN_COMMIT_RETRY_DELAY_MS` between them (default 500).
  - The sleep is `Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms)`.
  - Giving up exits 1 with `commit.mjs: gave up after <n> attempts; the lock is still held at <git rev-parse --git-path index.lock>`.
- **Other failures.** Any other failure prints git's stderr and exits with git's code. On success, each step's stderr is passed through.

Port `scripts/plan/commit.test.mjs` case for case, spawning `process.execPath` with the script path instead of `/bin/bash commit.sh`. The lock case:

- Spawn the script asynchronously with `PRISM_PLAN_COMMIT_RETRY_DELAY_MS=100` while `.git/index.lock` exists, and delete the lock after 300 ms. The commit lands.
- With `PRISM_PLAN_COMMIT_RETRIES=2` and the lock never removed, the script gives up with the message above.

### T12: Port auto-approval with config-driven stop paths

- files: scripts/ai-skills/hooks/plan/auto-approve.mjs, scripts/ai-skills/hooks/plan/auto-approve.d.mts, scripts/ai-skills/plan-auto-approve.test.ts, scripts/ai-skills/__fixtures__/auto-approve/clean/plan.md, scripts/ai-skills/__fixtures__/auto-approve/clean/spec.md, scripts/ai-skills/__fixtures__/auto-approve/blocking-then-resolved/plan.md, scripts/ai-skills/__fixtures__/auto-approve/blocking-then-resolved/spec.md, scripts/ai-skills/__fixtures__/auto-approve/one-round/plan.md, scripts/ai-skills/__fixtures__/auto-approve/one-round/spec.md, scripts/ai-skills/__fixtures__/auto-approve/round-2-blocking/plan.md, scripts/ai-skills/__fixtures__/auto-approve/round-2-blocking/spec.md, scripts/ai-skills/__fixtures__/auto-approve/outside-affected-systems/plan.md, scripts/ai-skills/__fixtures__/auto-approve/outside-affected-systems/spec.md, scripts/ai-skills/__fixtures__/auto-approve/dependency-file/plan.md, scripts/ai-skills/__fixtures__/auto-approve/dependency-file/spec.md, scripts/ai-skills/__fixtures__/auto-approve/contract-path/plan.md, scripts/ai-skills/__fixtures__/auto-approve/contract-path/spec.md, scripts/ai-skills/__fixtures__/auto-approve/thirteen-tasks/plan.md, scripts/ai-skills/__fixtures__/auto-approve/thirteen-tasks/spec.md
- proof: pnpm exec tsx --test scripts/ai-skills/plan-auto-approve.test.ts
- proof fails on main: yes
- depends on: T3, T5, T6

Owner: Clove. Port thrive's `scripts/plan/auto-approve.mjs` from the ref above. Keep all of these as they are:

- the order of checks and the collect-all reporting
- `ROUND_LINE`, with `clean`, `resolved N`, `carried N`, and `blocking N`
- `FIRST_CONFIRM_ROUND = 4`
- the highest-numbered-round rule
- rounds 1 and 2 required
- no task cap
- the `.git` walk for the repo root, where `existsSync` also accepts a worktree's `.git` file
- the `--check` behavior
- the `approved_by: auto` stamp
- every message, with the prefix `auto-approve:`

The swaps:

- **Affected systems.** Globs are matched with `compileMatcher` from `../lib/match.mjs` in place of thrive's `matchManifest`.
- **Stop paths.** These come from `matchStopPath(file, stopPaths)`. `autoApprove({ folder, check, today, stopPaths })` takes `stopPaths`, defaulting to `resolveStopPaths(null)`. The CLI passes `resolveStopPaths(readRepoConfig(repoRoot))`.
- **Usage text.** It names `auto-approve.mjs` with no directory.

Port the eight fixtures from `scripts/plan/fixtures/auto-approve/`:

- `frontend/blocks/foo/` becomes `src/blocks/foo/` in task files and in each spec's Affected systems block.
- `ticket: THRN-1` becomes `ticket: ACME-1`.
- Thrive's `packages-core` becomes `contract-path`, whose task lists `src/contracts/shape.ts`. Its spec block adds `src/contracts/**`, and the test passes `stopPaths: { dependency: [], contract: ["src/contracts/**"] }`.
- Thrive's `package-json` becomes `dependency-file`. Its task lists `package.json`, its spec block adds `package.json`, and it runs on the default stop paths.

Port `scripts/plan/auto-approve.test.mjs` case for case, including the inline edits of `clean`. Every case copies a fixture into a temp folder that holds a fake `.git` directory, so nothing writes into the repo. The required outcomes:

- **Approves.**
  - `clean` approves with `status: approved`, `approved_by: auto`, and today's date.
  - `thirteen-tasks` approves.
  - `blocking-then-resolved` approves.
- **Holds, with nothing written.** `one-round`, `round-2-blocking`, `outside-affected-systems`, `dependency-file`, and `contract-path` each exit 1, and the plan is byte-identical afterward.
- **Confirm rounds.**
  - `clean` plus `round 3: blocking 1` and `round 4: carried 2` approves.
  - `round 3: carried 1` as the highest round fails.
  - `round 4: blocking 1` fails.
- **Other paths.**
  - `--check` on an approved plan exits 0 and writes nothing.
  - A worktree-style `.git` file is accepted as the repo root.

### T13: Deliver the shell parser and chain modules with the hook runtime

- files: scripts/ai-skills/update.ts, scripts/ai-skills/plan-runtime-delivery.test.ts
- proof: pnpm exec tsx --test scripts/ai-skills/plan-runtime-delivery.test.ts scripts/ai-skills/update.test.ts && pnpm run prism:verify-pack
- proof fails on main: yes
- depends on: T1, T2, T3, T5, T6, T7, T10, T11, T12

Owner: Clove. Append to `HOOK_RUNTIME_FILES` in `update.ts`, after child 2's entries:

- `"lib/tokenize.mjs"` and `"lib/segments.mjs"`
- `"plan/frontmatter.mjs"`, `"plan/lookup.mjs"`, `"plan/tasks.mjs"`, `"plan/bundles.mjs"`, `"plan/commit.mjs"`, `"plan/auto-approve.mjs"`, and `"plan/stop-paths.mjs"`

None of them goes in `HOOK_RUNTIME_ENTRY_POINTS`, because each runs as `node <file>`. Nothing else in `update.ts` changes. `deliverHookRuntimeFile` already creates subdirectories, and child 2's `git-hooks/` entries rely on it. `verify-pack-parity.ts` needs no entry, because its `scripts/ai-skills/hooks` prefix covers the new files.

The test copies the `runUpdate` fixture shape from `update.test.ts` into this new file rather than importing it:

- **Fresh update.** A fresh update delivers every new file under `.claude/hooks/` with `HOOK_RUNTIME_MARKER` in it.
- **No-op.** A second update rewrites none of the new files.
- **Runs in place.** In the consumer fixture, `node .claude/hooks/plan/tasks.mjs <fixture>/plan.md --base HEAD` exits 0. The fixture plan has one task, and the fixture is a git repo with one commit. This proves the delivered modules' sibling imports (`../lib/command.mjs`, `./frontmatter.mjs`) resolve in the consumer layout.
- **Cursor only.** `hosts: ["cursor"]` delivers none of them.

### T14: Port the plan-folder citation lint with an allowlist

- files: scripts/ai-skills/plan-folder-citations.ts, scripts/ai-skills/plan-folder-citations.test.ts, package.json, .prism/plans/prism-519/plan.md
- proof: pnpm exec tsx --test scripts/ai-skills/plan-folder-citations.test.ts && pnpm run prism:plan-citations
- proof fails on main: yes
- depends on: none

Owner: Clove. Port thrive's `scripts/ai-skills/plan-folder-citations.ts` and keep its detection exactly:

- It skips lines inside a fenced block (`/^\s*```/`).
- It removes double-backtick spans, then single-backtick spans.
- It flags any `§` as `section-citation` and `/see Decision:/i` as `decision-citation`.

The swaps:

- `PLAN_ROOTS = [".prism/plans", ".prism/archived/plans"]`, direct children only. A child counts as a plan folder when it holds one of the four chain files as a file.
- Files are listed with `readdir(folder, { recursive: true })` in its string form, filtered to `*.md`, in place of `Dirent.parentPath`, which needs a newer Node than the `>=20.10.0` engines floor.
- `PLAN_CITATION_ALLOWLIST = ["prism-499/plan.md"]`. Each entry is `<folder>/<path inside the folder>`, so it holds whether the folder is live or archived.
- `runPlanFolderCheck(repoRoot)` returns `{ violations, staleAllowlist }`.
  - Violations in an allowlisted file are dropped.
  - `staleAllowlist` lists each allowlisted entry that exists with zero violations, or no longer exists. This makes the allowlist shrink mechanically.
- A `main`, guarded by `isDirectCliEntry("plan-folder-citations")` from `./lib/cli-entry`, prints `<file>:<line> <kind>` per violation and `plan-folder-citations: <entry> is clean or gone; remove it from the allowlist` per stale entry. It exits 1 when either list is non-empty, and otherwise prints nothing and exits 0.

In `package.json`, add `"prism:plan-citations": "tsx scripts/ai-skills/plan-folder-citations.ts"` and insert `pnpm run prism:plan-citations` into `prism:check` right after `pnpm run prism:crossref-lint`. The scripts block is the only change, and no dependency entry moves.

Fix every violation the new script reports on the branch after the precondition merge by spelling the citation as words. The one known on 2026-11-18 is in `.prism/plans/prism-519/plan.md`, in the `## Review Issues` entry that cites `compatibility.md` and a section sign followed by "Per-Tool Directory Ownership". It becomes `compatibility.md, under Per-Tool Directory Ownership`. If that line is already clean when the task runs, leave the file out of the commit and say so in `## History`.

Port the thrive test cases with the root swaps, then add these:

- **Allowlist.**
  - An allowlisted file with a violation passes.
  - An allowlisted file with no violation is reported stale, and so is an allowlisted file that is missing.
  - An allowlisted path in an archived folder still matches.
- **Scope.**
  - A flat plan with a `§` is not scanned.
  - A `§` inside a code span is not flagged.
- **This repo.** Running `runPlanFolderCheck` on this repo returns no violations and no stale entries.

### T15: Add the four chain-file templates

- files: .prism/templates/intent.md, .prism/templates/design.md, .prism/templates/spec.md, .prism/templates/plan.md, scripts/ai-skills/plan-templates.test.ts, .claude/templates/intent.md, .claude/templates/design.md, .claude/templates/spec.md, .claude/templates/plan.md, .codex/templates/intent.md, .codex/templates/design.md, .codex/templates/spec.md, .codex/templates/plan.md, .cursor/templates/intent.md, .cursor/templates/design.md, .cursor/templates/spec.md, .cursor/templates/plan.md, templates/install/.prism/templates/intent.md, templates/install/.prism/templates/design.md, templates/install/.prism/templates/spec.md, templates/install/.prism/templates/plan.md
- proof: pnpm exec tsx --test scripts/ai-skills/plan-templates.test.ts && pnpm run prism:build
- proof fails on main: yes
- depends on: T3, T6

Owner: Clove. Port thrive's four templates from `.ai-spec/templates/`, keeping their frontmatter keys, `##` headings, and order exactly. The scripts read headings by name. These ship to consumers, so they name no tracker, no ticket number, no thrive path, and no framework. Every template's opening comment says `Copy this file to .prism/plans/<ticket>/<name>.md` and that only a script changes `status`.

- **`intent.md`.**
  - `ticket:` is "the ticket ID or URL from your tracker".
  - `size` says to use `epic` only inside an `epic-<id>/` folder, for work split into several stories under one tracker parent.
  - The status line reads "Leave status at draft. Only the approval script changes it, after the person approves." It names no path, because the approval script lands in child 5.
  - The Acceptance criteria comment points at `.prism/templates/acceptance-criteria.md`, which gives each criterion a stable ID and an Evidence line, and keeps thrive's epic-only `none — <why>` rule.
  - Every other comment is thrive's.
- **`design.md`.**
  - Keep the frontmatter, including `approval`, and every `##` heading.
  - Under `## States`, replace the six `###` subsections with one comment: one `###` subsection per state in the state list `prism-design` uses, each with an ASCII wireframe and annotations.
  - In the opening comment, "Tailwind tokens (text-lg, p-4, gap-2)" becomes "design tokens", and the XD and Figma example becomes "a design file or frame".
  - Drop the server-component and `'use client'` wording from "Reused components" and from "Architectural inputs for the spec".
- **`spec.md`.**
  - The Affected systems comment says each line is one path pattern, that the plan's auto-approval reads this block, and the pattern syntax: `**` crosses directories, `*` stays within one segment, and a `**/` prefix does not match a file at the repo root.
  - The closing epic comment becomes "Don't add a `## Retro` heading here. The retro stage appends it after every child merges."
- **`plan.md`.**
  - The status comment reads "Only the auto-approval script, or the approval script after the person approves, changes it."
  - The task-detail pointer is `.prism/rules/implementation-task-detail.md`.
  - The groups sentence says to record the groups the bundle check (`plan/bundles.mjs` in the hook runtime) prints.
  - `files` takes one path per entry, with no globs or directories.
  - The Decisions verdict lines use `→ promoted to <path>` and `→ no promotion needed (<reason>)`, matching `branch-plan.md`.
  - Keep the example task inside the HTML comment.

The test reads the four canonical files:

- each one's frontmatter keys and `##` headings, in order, against the lists above
- no `§`, no `see Decision:`, and none of `.ai-spec`, `thrive`, `Linear`, `THR` in any of them
- `parseTasks(plan template)` returns `[]`, because the example sits inside a comment
- `sectionBody(spec template, "Affected systems")` holds an empty `text` fence

Run `pnpm prism:build` and commit the platform and seed copies it writes. The files list names the expected ones. Add any other copy the build writes from these sources to this commit. The build prints an unclassified-file warning for the four new templates, and that is expected: they ship as non-curated mirrors.

### T16: Teach the plan rule and lookup reference about plan folders

- files: .prism/rules/branch-plan.md, .prism/references/plan-lookup.md, templates/install/.prism/rules/branch-plan.md, templates/install/.prism/references/plan-lookup.md, .claude/rules/branch-plan.md, .codex/rules/branch-plan.md, .cursor/rules/branch-plan.mdc, .claude/references/plan-lookup.md, .codex/references/plan-lookup.md, .cursor/references/plan-lookup.md, AGENTS.md
- proof: pnpm run prism:build && pnpm run prism:crossref-lint && pnpm run prism:spec-scope-lint
- depends on: T7, T14

Owner: Clove. Edit existing paragraphs and list items only, and add no new heading. These files are umbrellas, and the change is not a new section.

- **`branch-plan.md`, Plan Lookup.**
  - Steps 2 and 3 become the four name tiers in T7's order:
    - `.prism/plans/<ticket-id>/` when it holds a chain file (`intent.md`, `design.md`, `spec.md`, or `plan.md`)
    - `<ticket-id>.md`
    - `epic-<ticket-id>/`
    - `epic-<ticket-id>.md`
  - Step 4's scan also reads a plan folder's chain-file `ticket:` frontmatter.
  - Add one sentence after the list: a folder resolves to its latest-stage file (`plan.md`, else `spec.md`, `design.md`, `intent.md`), and `.prism/archived/` never resolves as a live plan.
- **`branch-plan.md`, History.** In "History entries: cap at 3 sentences", the sentence giving the one-line form with `see Decision: <title>` stays for flat plans. Add: "In a plan folder, name the Decision in plain words without that form. The plan-folder citation lint rejects it, because folder files move and get renamed."
- **`plan-lookup.md`.**
  - Step 1's `thr-NNNN` pattern becomes "the ticket prefix set as `ticketPrefix` in `.ai-skills/config.json`".
  - Steps 2 to 4 get the same tiers and scan as `branch-plan.md`, with the latest-stage sentence.
- **Seed twins.** `branch-plan.md`'s seed twin is curated, so apply the same two edits to `templates/install/.prism/rules/branch-plan.md` by hand, wherever the twin carries the same text. Run `pnpm prism:build` and commit what it writes. The files list names the expected copies, including `AGENTS.md`, which inlines the rule. Add any other copy the build writes from these sources to this commit.

### T17: Document the chain scripts and route them

- files: .prism/architect/_toolkit/plan-chain-scripts.md, .prism/architect/_toolkit/hook-runtime.md, .prism/architect/manifest.json, .prism/architect/_toolkit/manifest.base.json, templates/install/.prism/architect/_toolkit/plan-chain-scripts.md, templates/install/.prism/architect/_toolkit/hook-runtime.md, templates/install/.prism/architect/_toolkit/manifest.base.json, .claude/architect/_toolkit/plan-chain-scripts.md, .codex/architect/_toolkit/plan-chain-scripts.md, .cursor/architect/_toolkit/plan-chain-scripts.md, .claude/architect/_toolkit/hook-runtime.md, .codex/architect/_toolkit/hook-runtime.md, .cursor/architect/_toolkit/hook-runtime.md, .claude/architect/manifest.json, .codex/architect/manifest.json, .cursor/architect/manifest.json, .claude/architect/_toolkit/manifest.base.json, .codex/architect/_toolkit/manifest.base.json, .cursor/architect/_toolkit/manifest.base.json
- proof: pnpm run prism:build && pnpm run prism:check
- depends on: T1, T2, T5, T6, T7, T9, T10, T11, T12, T13

Owner: Clove. Write every claim against the merged source of T1 to T13, per the writing-an-architect-doc guide. The doc ships to consumers, so it names no origin project and no PRISM ticket. The seed literal guard rejects both. It names only paths under `scripts/ai-skills/hooks/` or a consumer's `.claude/hooks/`.

**New `_toolkit/plan-chain-scripts.md`.** Its scope is the plan-chain modules under the hook runtime's `plan/` directory and the shell parser under `lib/`. Its neighbour for delivery and gates is `hook-runtime.md`. It covers:

- **Contracts.** One line per module.
- **Task and subject grammar.** The task grammar, the subject grammar, and the done rule, including why a stacked branch counts first-parent commits from the `intent.md` add.
- **Lookup.** The lookup order, the latest-stage file, and why the live lookup never reads the archive.
- **Bundle check.** Grouping by manifest doc set, the duplicate-claim rule and how a dependency clears it, import edges, and `importAliases`.
- **Auto-approval.** Its conditions, the round grammar, and the confirm round starting at 4.
- **Stop paths.** The two kinds, the defaults, case-insensitive matching, and the directory-holds rule.
- **Commit script.** Its three guarantees: named paths only, no unchanged path, and literal pathspecs.
- **Globs.** The dialect decision: `compileMatcher`, not `path.matchesGlob`, because the engines floor predates it. Include the `**/` root caveat.
- **Invocation.** `node .claude/hooks/plan/<name>.mjs` in a consumer, and `node scripts/ai-skills/hooks/plan/<name>.mjs` in PRISM's own tree.
- **Entry guards.** These modules keep the realpath guard only while nothing in the CLI bundle imports them.
- **Shell parser.** It has no caller yet. Later gates call it, and its header lists its known misses.
- **Cursor.** A Cursor-only consumer does not receive these modules yet.

**Routes.** In both `manifest.json` and `_toolkit/manifest.base.json`, add:

- `"scripts/ai-skills/hooks/plan/**": "_toolkit/plan-chain-scripts.md"`
- `".prism/templates/plan.md": "_toolkit/plan-chain-scripts.md"`
- `".prism/templates/spec.md": "_toolkit/plan-chain-scripts.md"`

The existing `scripts/ai-skills/hooks/**` route keeps naming `hook-runtime.md`. Add the same three routes to `templates/install/.prism/architect/_toolkit/manifest.base.json`.

**`hook-runtime.md`.** Edit existing paragraphs only, with no new heading:

- The Delivery path paragraph says the runtime also carries the plan-chain modules under `plan/` and the shell parser in `lib/tokenize.mjs` and `lib/segments.mjs`, with a link to `plan-chain-scripts.md`.
- In Compaction arms, the plan-path paragraph now says the path comes from the shared lookup: plan folders and flat plans, the ticket-field scan, then the archive. Delete the sentences saying the `## Ticket` scan is skipped. Keep the sentence on why a generic `<letters>-<digits>` match was rejected.
- The doc is curated, so apply the same edits by hand to `templates/install/.prism/architect/_toolkit/hook-runtime.md` wherever the twin carries those paragraphs.

Run `pnpm prism:build` and commit what it writes. The files list names the expected copies. Add any other copy the build writes from these sources to this commit. `pnpm prism:check` must pass, including the new `prism:plan-citations` step.

### T18: Document the new config keys and runtime files for consumers

- files: docs/parameterization.md, docs/what-prism-writes.md
- proof: pnpm run prism:crossref-lint
- depends on: T4, T13

Owner: Eli. Set `last_updated` to the edit date.

- **`parameterization.md`.** Add field-reference rows for `stopPaths.dependency`, `stopPaths.contract`, and `importAliases`, using the wording of the T4 schema descriptions. Give the default dependency list as "common manifests and lockfiles (package.json, lockfiles, composer, pyproject, go.mod, Cargo, Gemfile)", not the full pattern list.
- **`what-prism-writes.md`.** Under PRISM-owned paths, add rows for `.claude/hooks/plan/*.mjs` (the plan-chain scripts) and `.claude/hooks/lib/tokenize.mjs` and `segments.mjs` (the shell parser that later gates read commands with). State that they arrive with the hook runtime, so a Cursor-only install does not get them yet.

## Challenge

## Decisions

- **The plan uses the folder shape and the chain task shape before the chain tooling exists.** The spec gives every child a folder at `.prism/plans/prism-<n>/`, and this child's own task parser would reject the flat persona-heading shape. Tasks carry only the parser's fields, and each names its owning persona in its first prose line. No challenge rounds were run and `status` stays `draft`, because the round grammar's runner lands in child 5. Commits use `PRISM-520: <summary> (T<n>)`, because the `T<n>:` subject rule lands in child 5 with `git-conventions.md`.
- **Children 4 and 5 stay separate.** The spec allows merging them. Child 4 is code with tests and no behavior change for anyone, while child 5 rewrites skills and adds approval, which reviewers read differently. Merged, the PR would roughly double in size and mix two kinds of review. Child 5 needs only what child 4 lands, and the merge order already sequences them.
- **The chain modules live in the hook runtime tree and ride its delivery.**
  - **Root cause.** The spec asks for one copy of each parser, reachable from both a hook and a skill, in zero-dependency `.mjs` a consumer can run without `node_modules`.
  - **Alternatives considered.** A `prism plan` subcommand bundled into `dist/cli.js`, which adds public CLI surface, needs `npx` for every call, and would need the bundle-safe entry guard. A separate host-neutral delivery directory, which needs a second copy path, ownership rule, and prune list.
  - **Chosen approach.** Modules sit in `scripts/ai-skills/hooks/plan/`, with the parser in `hooks/lib/`. They join `HOOK_RUNTIME_FILES` and reach `.claude/hooks/plan/`. A consumer runs `node .claude/hooks/plan/<name>.mjs`, and PRISM's own tree runs `node scripts/ai-skills/hooks/plan/<name>.mjs`.
  - **Implementation guidance.** A Cursor-only consumer receives no hook runtime, so it does not get these modules from this child. Nothing calls them until child 5, so no merged step breaks. Child 5 writes the first caller and the approval script, which the intent says a Cursor user runs from a terminal, so child 5 decides how Cursor-only installs reach them and how skill bodies spell the path.
- **Plan lookup exists once, in `lookup.mjs`.**
  - **Root cause.** `resolveLivePlan` is TypeScript importing `../utils`, which a delivered hook cannot load. `compact-handoff.mjs` keeps its own four-path lookup that misses plan folders entirely, so a folder-plan branch would lose its plan path in every compaction summary.
  - **Alternatives considered.** Extending each copy in place. Rejected, because the spec requires one copy and the two already disagree on the ticket scan.
  - **Chosen approach.** `lookup.mjs` holds the order. `resolveLivePlan` (T8) and `findPlanForBranch` (T9) delegate to it and keep their own ticket-id extraction: the generic token for the build-time lint, and `ticketPrefix` for the hook.
  - **Implementation guidance.** A folder resolves to its latest-stage chain file, because every caller reads one file's text. A folder holding only `intent.md` now beats a flat plan of the same id. That reverses a phase-1 test that was an implementation choice, not a recorded Decision, and T8 carries the behavior change. The live lookup and `findArchivedPlan` stay separate functions, so no gate can mistake a frozen record for a live plan.
- **Every glob goes through PRISM's `compileMatcher`.** `path.matchesGlob` needs Node 20.17 and was experimental there, while the engines floor is `>=20.10.0` and CI pins Node 20. Thrive's matcher is a third dialect. Using the manifest's own matcher means Affected systems, stop paths, and routes read one syntax. The cost is that `**/x` does not match a root `x`, so the default stop paths list root files on their own and the spec template says so.
- **The bundle check reads PRISM's flat manifest and takes aliases from config.** Thrive's check imported its 2,120-line architect hook for three helpers and read a two-section manifest PRISM does not have. `findRepoRoot` and `matchDocsForPath` already exist in `architect-route.mjs`, and `extractImportSpecifiers` is copied into `bundles.mjs`, its only caller. Thrive's hard-coded `@frontend/` alias becomes the `importAliases` key, per the spec. Reading `tsconfig` `paths` was considered and rejected, because it covers only TypeScript and needs a JSONC parser.
- **Config is read through child 2's `readRepoConfig`, so child 2 must merge first.** A second reader would make three copies, counting `compact-handoff.mjs`'s private one. The merge order already puts child 2 before child 4. If child 2 slips, the build halts as blocked instead of forking the helper.
- **The shell parser is ported now and wired to nothing.** The spec assigns it here because child 5's approve guard needs it before the agent-hooks child moves the existing gates onto it. Wiring it into `hook.mjs` belongs to those children.
- **`commit.sh` becomes `commit.mjs` with an argv array and no shell.** The runtime is tested on Windows, which rules out bash. Spawning git without a shell keeps quoting identical on every platform. The retry knobs are renamed `PRISM_PLAN_COMMIT_RETRIES` and `PRISM_PLAN_COMMIT_RETRY_DELAY_MS` (milliseconds, where thrive used seconds), per the spec's `prism` naming swap.
- **The citation lint is its own `prism:check` step, and its allowlist can only shrink.** Thrive enforced it through a repo-wide test case. A named script gives a readable failure line in CI and runs alone. An allowlisted file that comes clean fails the run until its entry is removed, so the spec's "can only shrink" is mechanical rather than a promise. A violation in another plan folder is reworded rather than allowlisted, because the list starts with the phase-1 plan alone.
- **The ticket subject form is built from `ticketPrefix`.** Thrive hard-coded `THR[PN]?-`. With no prefix configured, no subject reads as a ticket subject, which changes nothing, because only task subjects count toward done.
- **The issue's acceptance criteria are synced.** Issue #520 carries all nine criteria under its Acceptance Criteria heading, worded as the plan's criteria without the ID prefix and Evidence lines, so nothing needed writing to the tracker.
- **Child 4 ships as one PR.** The shell parser (T1, T2) could have been stacked under the chain scripts, but the epic is already cut at child grain and each part is inert alone. Hunter ruled on 2026-11-18 that standard PRs have no size limit, and whether to stack is the orchestrator's call, which chose one PR.
  - → no promotion needed (a ticket-specific shipping call)
- **The install seed's routing stub reaches `plan-chain-scripts.md` through the plan and spec templates, not through `.claude/hooks/plan/**`.** `templates/install/.prism/architect/manifest.stub.json` routes `.prism/templates/plan.md` and `.prism/templates/spec.md` to `_toolkit/plan-chain-scripts.md`, the way the base manifest does, because `verify-manifest` rejects a shipped doc that no stub route names and `hook-runtime.md` says the consumer's `.claude/hooks/` files stay unrouted. The orchestrator approved a stub edit after T17, since no task listed the stub.
  - **Root cause.** The first build routed `.claude/hooks/plan/**` and cited `.githooks/**` as precedent. `.githooks/` is not on `hook-runtime.md`'s unrouted list and `.claude/hooks/` is, so the precedent did not cover it. PR review probed the shipped stub as a consumer manifest: a Bash call to `node .claude/hooks/plan/tasks.mjs` or `commit.mjs` was denied until `plan-chain-scripts.md` was read.
  - **Alternatives considered.** Keep the hooks route and amend `hook-runtime.md` to say the plan directory is routed. Rejected: those files belong to the consumer, and the route would deny every chain-script call once per session in every new install. The templates are PRISM-owned paths, and an agent that edits a chain file is the reader the doc is for.
  - **Implementation guidance.** A Bash call to the delivered scripts is not denied under the new stub, which the gate probe confirms. Do not route `.claude/hooks/**` from the stub.
  - → no promotion needed (`hook-runtime.md`, under Write gate, already states that `.claude/hooks/` stays unrouted, and the stub now mirrors the base manifest's template routes)
- **`prism-516/plan.md` and `prism-519/plan.md` citations were reworded in T14.** The new lint reported 18 section-sign citations in the merged `prism-516/plan.md` and two in `prism-519/plan.md`, where T14 named only the second file. T14 says to fix every violation the script reports by spelling it as words, so the build reworded each as `<file>, under <heading>`, and the meaning is unchanged. The alternative, allowlisting `prism-516/plan.md`, was rejected because the allowlist is meant to hold the phase-1 plan alone.
- **`plan-chain-scripts.md` cites the four chain templates by path.** `pnpm prism:ship-closure` fails when a shipped template is reachable from nothing, and no skill cites them until child 5. The architect doc is routed from the base manifest, and it genuinely depends on the templates' headings, so it names them in a short Templates paragraph.
- **The `plan.md` template's Retro comment allows "declined".** Thrive's comment said the retro always runs, which contradicts the plan rule's declinable retro line. The comment now reads "the retro report's path, or `declined — <reason>`". The `Retro:` line and every heading stay as thrive has them.
- **Two T4 schema cases are pinned on the schema document, not the validator.** The config validator does not enforce `additionalProperties`, so an unknown `stopPaths` key and a non-string `importAliases` value pass it. The test asserts the schema declares both rules.
- **A container's directories resolve as POSIX paths, and `~` and a bare `cd` inside one read as unknown.** The orchestrator decided the cwd uses `path.posix` with no `toHostPath`, after the Windows leg of PR #528 failed on four docker segment tests.
  - **Root cause.** `unwrapDocker` and a `cd` inside a container went through the host's `resolveDir`, so a Windows host turned `/workspace` into `\workspace` and `-w /w` into `W:\`.
  - **Chosen approach.** `resolveContainerDir` in `segments.mjs`, used for a `docker -w`, for any wrapper that runs after a docker one, and for every `cd` in a segment whose container is set. `~` and a bare `cd` are null, because the host's home directory is wrong inside a container, and null is the walk's existing "unknown" value.
  - **Implementation guidance.** A test sets `process.platform` to `win32` on Linux, since `path.win32` can't be injected into the module. Expected host paths in the segment tests use `path.normalize`, not `path.resolve`, because `resolveDir` normalizes and `path.resolve` would add a drive letter it never produces. The Windows leg itself has not run on this fix, so the next CI run is its proof.
- **`WRAPPERS` is read behind `Object.hasOwn`.** A prototype name such as `toString` or `constructor` is a plain command word, not a wrapper, and never throws. A null-prototype map was the other option, but the own-property check keeps the table a literal.
- **Stop-path globs are fixed in `stop-paths.mjs` only, and the shared `compileMatcher` is untouched.** Architect routing depends on that matcher, and changing a shared utility needs its own approval.
  - **Chosen approach.** `expandMiddleGlobstars` tries every combination of crossing or skipping each mid-path `**/`, and a pattern holding `{` is a config error, because the matcher reads braces literally and a brace pattern would never match. A leading `**/` is unchanged, so root files are still listed on their own.
  - **Implementation guidance.** The schema description, `plan-chain-scripts.md`, and `docs/parameterization.md` state both rules. The affected-systems globs in `spec.md` still go through the unexpanded matcher, so a mid-path `**/` there needs a directory, which fails closed to a person.
- **`resolveStopPaths` rejects an unknown `stopPaths` key and a non-string entry, and `auto-approve.mjs` exits 2 with the message.** The config validator does not enforce `additionalProperties`, so a misspelled `contracts` key turned contract protection off with no output. The shared validator is left alone, and issue #526 tracks it. A list that is set but is not an array still falls back to its default, as the existing test pins. A config file that exists but does not parse also exits 2, through `readStopPathConfig` in `auto-approve.mjs`, because the shared `readRepoConfig` returns null for an absent file and for an unreadable one and stays unchanged for the git hooks.
- **`parseFiles` rejects a backslash.** This closes the stop-path and outside-the-repo bypass at the parse, in one place, instead of normalizing in each check.
- **The alias swap joins the value with `path.posix.join` instead of stripping `./` and a trailing slash at read time.** It accepts the same spellings the orchestrator named (`./src/`, `src`) and a few more, and it needs no second copy of the normalization.
- **The bundle check's `{}` manifest fallback is removed, not made reachable.** `findRepoRoot` finds the root by the manifest, so a repo with none could never reach the fallback. Making it reachable would need a second root finder keyed on `.git`, for a state no install is in, because every install ships the stub manifest. A plan with no manifest above it exits 1 naming the path, and a test pins that.
- **`resolveLivePlan` swallows lookup errors again.** T8's behavior-change field names only the folder precedence, and `spec-scope-lint` passes a branch whose plan is missing, so restoring the old null keeps both true. Recording a new throw would have meant a lint that crashes on a permissions error it never crashed on before. `resolvePlan` still throws, because the hook callers want to know.
- **`commit.mjs` returns git's stdout on failure, reports a failed `git status`, and honors a delay of `0`.** A failed status used to read as an unchanged path, and a hook or git message on stdout used to vanish.
- **The seed copy of `branch-plan.md` now mentions the plan-folder citation lint.** T16 says to apply both edits to the twin. That lint exists only in PRISM's own tree, so a consumer reads a sentence about a check it does not have. Child 5 or a later pass can soften it.

## History

- 2026-11-18 [huntermcgrew/prism-520-chain-scripts]: Plan created: shell parser, frontmatter, lookup and archive search, tasks, bundles, commit, auto-approve, stop paths, citation lint, templates, rule and doc edits, as 18 tasks.
- 2026-11-18 [huntermcgrew/prism-520-chain-scripts]: Built T1 to T18, one commit each, with 1482 tests passing. `prism:check` fails only on the stub route recorded in Decisions, so the PR is held.
- 2026-11-18 [huntermcgrew/prism-520-chain-scripts]: The orchestrator approved the stub route and the one-PR call, so both Decisions are resolved. `prism:check` was then run as one command with `GITHUB_HEAD_REF` set.

- 2026-11-18 [huntermcgrew/prism-520-chain-scripts]: Fixed all thirteen self-review findings and the cleanup items in seven commits, each behavior fix with a test that fails on the old head; see the Decisions on container paths, stop-path globs, and the removed manifest fallback. `prism:check` passes on Linux, and the Windows leg has not run on the fix yet.
- 2026-11-18 [huntermcgrew/prism-520-chain-scripts]: Fixed the second-pass Major and both Minors in 5f506cb0, with a test that fails on the old source for the first two. CI on e9705bfc is green on both legs, and the new commits have not run there yet.
- 2026-11-18 [huntermcgrew/prism-520-chain-scripts]: Fixed both PR-review Majors and both Minors in e8547f90, afde75fd, and 518a5eae, with a CLI test that fails on the old head for the config one; the Decision on the install seed's routing stub records the route change. CI on e9ad165b is green on both legs, and the new commits have not run there yet.

## Sessions

- 2026-11-18 [huntermcgrew/prism-520-chain-scripts] open: Intent: plan child 4 (chain scripts) to the detail bar from the epic spec and thrive at db3570975. Bounds: plan file only, no code, no PR, nothing outside the spec's Affected systems, no new dependency or shared-type change. Approach: port thrive's modules onto PRISM's hook runtime, matcher, manifest, and config, with one lookup copy shared by the build lint and the compaction hook. · close: scope held
- 2026-11-18 [huntermcgrew/prism-520-chain-scripts] open: Intent: build T1 to T18 and open one draft PR. Bounds: only the plan's file lists, plus pinned tests and mirrors. Approach: one commit per task, port thrive's suites case for case, then run `prism:check`. · close: drifted — reworded citations in `prism-516/plan.md` and added a stub route, both recorded in Decisions.
- 2026-11-18 [huntermcgrew/prism-520-chain-scripts] open: Intent: full self-review of PR #528. Bounds: plan Review and PR Readiness only, no source fix, no GitHub post. Approach: run `prism:check`, read the Windows CI log, diff the ports against thrive at db35709, and verify the architect doc against source. · close: scope held

- 2026-11-18 [huntermcgrew/prism-520-chain-scripts] open: Intent: fix every open self-review finding on PR #528 under the orchestrator's decisions. Bounds: the findings and cleanup items only, no change to `lib/match.mjs` or the config validator, no merge, no ready flip. Approach: one fix commit per concern, each test shown red on the old head, then `prism:check`. · close: scope held
- 2026-11-18 [huntermcgrew/prism-520-chain-scripts] open: Intent: self-review the review-fix commits 2c4f7de6..e9705bfc on PR #528. Bounds: plan Review and PR Readiness only, no source fix, no GitHub post, no merge. Approach: run `prism:check`, read both CI legs on the head, check each fix against its finding, and verify the changed architect-doc claims against source. · close: scope held
- 2026-11-18 [huntermcgrew/prism-520-chain-scripts] open: Intent: fix the three open second-pass findings on PR #528. Bounds: those findings, the plan's Verification and Review records, and the PR body's Windows line; no merge, no ready flip. Approach: one fix commit with tests shown red on the old source, a separate plan commit, then `prism:check`. · close: scope held
- 2026-11-18 [huntermcgrew/prism-520-chain-scripts] open: Intent: fix the four PR-review findings on PR #528, then the PR body and a lesson. Bounds: those findings and the plan's Decision, Review, History, and Verification records; no change to `lib/command.mjs` exports or `lib/match.mjs`, no thread resolution, no merge, no ready flip. Approach: a CLI test shown red on the old head, one fix commit per concern, a separate lessons commit and plan commit, then `prism:check`. · close: scope held

## Verification

- `pnpm exec tsc --noEmit` passes for both `scripts/ai-skills/tsconfig.json` and `tsconfig.hooks.json`.
- `pnpm run prism:test` reports 1505 passing, 0 failing, and 1 skipped, after the PR-review fixes. The skip is the existing `.agents` round-trip case, which waits on `prism:build`. Each behavior fix has a test that fails on the head before it.
- `prism:crossref-lint`, `prism:plan-citations`, `prism:spec-scope-lint`, `prism:ship-closure`, `prism:verify-manifest`, and `prism:verify-pack` pass, and `pnpm prism:check` run as one command with `GITHUB_HEAD_REF=huntermcgrew/prism-520-chain-scripts` exits 0.
- CI run 44290931324 on e9ad165b is green on `ubuntu-latest` and `windows-latest`, so the second-pass fixes have run on the Windows leg. The leg that had failed 7 tests passes with the container-path and test-literal fixes.
- The consumer gate probe denies a Bash call to `node .claude/hooks/plan/tasks.mjs` or `commit.mjs` with the old stub as the manifest and allows both with the new stub. The auto-approve probe exits 2 on a trailing-comma config, 1 on the same config without the comma, and 0 on a config that sets a string where a list belongs, which the stop-path Decision keeps.
- Not verified: the PR-review fix commits on CI, and the delivered scripts under a real Claude Code session.

## Review

Briar self-review, 2026-11-18, of 35f6ca7a..9ddb7de4 (all of T1 to T18). Two Major findings and eleven Minor ones. AC-1 is unmet, because the Windows leg of PR #528's `prism-check` is red with 7 failures, all in `hook-segments.test.ts`. AC-2 through AC-9 hold on the diff and on the Linux run. Every finding below is marked fixed in the review-fix commits, with its commit named; the Windows leg is the one thing left to confirm.

### A container's working directory resolves as a Windows host path

- **Severity:** `major`
- **Status:** `fixed`
- **Fixed in:** 86e51eaa: a container's directories resolve through `resolveContainerDir` with `path.posix`, with no drive mapping. A test fakes `win32` on Linux to cover it.
- **File:** `scripts/ai-skills/hooks/lib/segments.mjs:668`
- **Problem:** `unwrapDocker` (and `bash -lc 'cd /workspace'` walked inside a container) resolves the container cwd through the host's `resolveDir` and `toHostPath` (lines 212 and 266). On a Windows host `/workspace` becomes `\workspace`, and `-w /w` becomes `W:\`. This is Major because the Windows CI leg fails (AC-1 unmet), and any Windows gate that reads a container segment's `cwd` would get a wrong path. The behavior is inherited from thrive. Failing tests: "a docker exec'd bash -lc string…", "docker exec -w sets the container cwd…", "docker compose exec and run…", and "docker container exec strips like docker exec".
- **Suggested fix:** inside a container, resolve with `path.posix` and skip `toHostPath`. Add a test that pins it with `path.win32` injected, so the Linux leg covers it too.

### Three segment tests assert POSIX literals for host paths

- **Severity:** `major`
- **Status:** `fixed`
- **Fixed in:** 86e51eaa: the three expected values are built with `path.normalize`.
- **File:** `scripts/ai-skills/hook-segments.test.ts:201`
- **Problem:** the assertions at lines 201, 369, and 409 compare host-resolved paths with `"/abs"` and `"/x"`. On Windows, `path.normalize` gives `\abs` and `\x`, so "a shell string reached past argv[0]…", "cd reads ~ as home…", and "resolveDir needs a base…" fail. This is Major because it is the other half of the red Windows leg that leaves AC-1 unmet. The literals are inherited from thrive's tests.
- **Suggested fix:** build each expected value with `path.resolve` or `path.normalize`, the same way the suite already builds `REPO` with `path.join`.

### A command word naming an Object.prototype member breaks the whole walk

- **Severity:** `minor`
- **Status:** `fixed`
- **Fixed in:** 86e51eaa: `WRAPPERS` is read behind `Object.hasOwn`.
- **File:** `scripts/ai-skills/hooks/lib/segments.mjs:648`
- **Problem:** `WRAPPERS[name]?.(...)` resolves inherited members. `toString x`, `valueOf x`, and `__proto__ x` throw, and `constructor git push` is stripped as if it were a wrapper. One such word anywhere in a chain discards the walk. This is Minor because nothing calls the module yet. It becomes a guard bypass if child 5's approve guard fails open on a throw. Inherited from thrive.
- **Suggested fix:** give `WRAPPERS` (line 713) a null prototype, or check with `Object.hasOwn`.

### A stop path with a mid-path globstar or braces silently never matches

- **Severity:** `minor`
- **Status:** `fixed`
- **Fixed in:** 55b0b923 and 3c1a18f9: `stop-paths.mjs` expands a mid-path globstar to zero directories and rejects `{`. The schema description, the architect doc, and `docs/parameterization.md` say so.
- **File:** `.ai-skills/config.schema.json:226`
- **Problem:** `compileMatcher` needs at least one directory for a `/**/` in the middle and reads braces literally. Probed: `api/**/schema.graphql` does not match `api/schema.graphql`, and `src/**/*.{ts,tsx}` matches nothing. On the stop-path side this fails open, so auto-approval can pass a plan through the tree the pattern was meant to protect. The schema description, `plan-chain-scripts.md` line 32, and the `stopPaths` rows in `docs/parameterization.md` warn only about a leading `**/`.
- **Suggested fix:** state both caveats wherever the root caveat is stated, or have `resolveStopPaths` reject patterns containing `{`.

### A misspelled stopPaths key turns contract protection off with no warning

- **Severity:** `minor`
- **Status:** `fixed`
- **Fixed in:** 55b0b923: `resolveStopPaths` throws on an unknown key or a non-string entry, and `auto-approve.mjs` prints it and exits 2.
- **File:** `scripts/ai-skills/hooks/plan/stop-paths.mjs:66`
- **Problem:** `config-schema-validate.ts` does not enforce `additionalProperties`, which the plan's Decisions already record for the T4 tests. The runtime consequence is not recorded: `stopPaths: { contracts: [...] }` passes `prism update`, and `resolveStopPaths` returns `contract: []`. A non-string entry throws at line 105 instead. That fails closed, but the output is a stack trace.
- **Suggested fix:** have `resolveStopPaths` warn on unknown keys and non-string entries. Fixing the shared validator instead needs a heads-up first, per code-standards on shared utilities.

### An alias value with a leading ./ or no trailing slash drops import edges

- **Severity:** `minor`
- **Status:** `fixed`
- **Fixed in:** 53a8c475: the alias swap joins the value to the rest of the specifier with `path.posix.join`. Four spellings are tested.
- **File:** `scripts/ai-skills/hooks/plan/bundles.mjs:287`
- **Problem:** the alias target is pasted in without normalizing. `{ "@/": "./src/" }`, the tsconfig spelling, and `{ "@/": "src" }` both yield no edge, so two tasks that import each other land in one parallel group with no message.
- **Suggested fix:** `path.posix.normalize` the joined result and strip a leading `./`. Add a case for each spelling.

### Backslash paths skip the stop paths and the outside-repo check

- **Severity:** `minor`
- **Status:** `fixed`
- **Fixed in:** 53a8c475: `parseFiles` rejects `\`, which closes the stop-path and outside-repo bypass at the parse.
- **File:** `scripts/ai-skills/hooks/plan/stop-paths.mjs:92`
- **Problem:** probed: `matchStopPath("src\\contracts\\x.ts", …)` returns null. `auto-approve.mjs:190` likewise lets `..\x` past the outside-repo check, and `tasks.mjs` does not reject `\` in `files`. A Windows-authored plan could auto-approve over a stop path. Inherited from thrive. Minor because plan authors write forward slashes and nothing calls auto-approve until child 5.
- **Suggested fix:** reject `\` in `parseFiles`, matching the existing rule against spaces and glob characters.

### The compaction summary still says the plan was missed by filename

- **Severity:** `minor`
- **Status:** `fixed`
- **Fixed in:** 7ce44412: the status line reads `none found`, the template says by name, ticket field, or archive, and the pinned test follows.
- **File:** `scripts/ai-skills/hooks/compact-handoff.mjs:179`
- **Problem:** after T9 a miss means the name tiers, the ticket-field scan, and the archive all came up empty. The summarizer copies "none found by filename" as fact, which understates the search. `compact-handoff.test.ts:96` pins the old text.
- **Suggested fix:** reword it to "none found" (or "none found by name or ticket field") and update the pinned test.

### T12's "--check on an approved plan" case is missing

- **Severity:** `minor`
- **Status:** `fixed`
- **Fixed in:** 55b0b923: the CLI case asserts exit 0 and byte-identical bytes.
- **File:** `scripts/ai-skills/plan-auto-approve.test.ts:100`
- **Problem:** T12 requires that `--check` on an approved plan exits 0 and writes nothing. The only `--check` case runs on a draft, and the already-approved case runs without `--check`.
- **Suggested fix:** add the case, asserting exit 0 and byte-identical bytes.

### T10's duplicates return value and docs: none text go unasserted

- **Severity:** `minor`
- **Status:** `fixed`
- **Fixed in:** 53a8c475: `analyzeBundles` is asserted for `duplicates`, and a text-report run asserts `docs: none`.
- **File:** `scripts/ai-skills/plan-bundles.test.ts:273`
- **Problem:** T10 requires `duplicates: [{ file: "src/a.ts", ids: ["T1", "T2"] }]` from `analyzeBundles`. The test checks only the CLI's stderr. The `docs: none` line from `formatReport` (around line 317) is never exercised, because every case runs `--json`. AC-2's evidence (the CLI exit and message) still holds.
- **Suggested fix:** assert the `analyzeBundles` return, and add one non-JSON run that checks `docs: none`.

### The bundle check's {} manifest fallback is unreachable

- **Severity:** `minor`
- **Status:** `fixed`
- **Fixed in:** 53a8c475: the dead fallback is removed and a test pins the exit 1 naming the manifest. See the Decision on the stricter behavior.
- **File:** `scripts/ai-skills/hooks/plan/bundles.mjs:454`
- **Problem:** T10 says the manifest is `{}` when the file is absent. `findRepoRoot` from `architect-route.mjs` only returns a directory that holds the manifest, so `readManifest`'s fallback never runs, and a repo with no manifest exits 1 with "no .prism/architect/manifest.json above the plan". Every install ships the stub manifest, which is why this is Minor.
- **Suggested fix:** find the root by `.git` when no manifest is found, or delete the dead fallback and record the stricter behavior in the plan.

### resolveLivePlan now throws on fs errors it used to swallow

- **Severity:** `minor`
- **Status:** `fixed`
- **Fixed in:** 7ce44412: `resolveLivePlan` catches and returns null again, with a `chmod` test.
- **File:** `scripts/ai-skills/lib/resolve-live-plan.ts:151`
- **Problem:** before this change, a permission error on `.prism/plans/` read as "no plan". `resolvePlan` rethrows anything other than ENOENT and ENOTDIR, so `resolveLivePlan`, and through it `spec-scope-lint`, now throws. That is defensible for a lint, but T8's behavior-change field names only the folder precedence.
- **Suggested fix:** add a sentence to T8's behavior-change field, or catch and return null in `resolveLivePlan`.

### The citation lint's JSDoc says plans can be deleted

- **Severity:** `minor`
- **Status:** `fixed`
- **Fixed in:** 7ce44412: the JSDoc now gives the folder-files-move reason and says plans are never deleted.
- **File:** `scripts/ai-skills/plan-folder-citations.ts:10`
- **Problem:** "Plans can be deleted at any time" is carried over from thrive. PRISM's plan rule and ADR-0047 say plans are never deleted, so the stated reason for the lint contradicts the rule it serves.
- **Suggested fix:** give PRISM's reason, which the T16 edit to `branch-plan.md` already states: folder files move and get renamed, so a heading citation rots.

**Cleanup items (non-blocking, not findings).**

- `plan/commit.mjs` (fixed in 667ed2b0, each with a test that fails on the old head):
  - A failing step drops git's stdout, so a failure git reports only there ends as a bare exit 1.
  - `readPositiveInteger` turns a delay of `0` into the default.
  - The unchanged-path check discards `git status` errors.
- The usage lines differ in case and form: `Usage: tasks.mjs …` in tasks, bundles, and commit, but `usage: node auto-approve.mjs …` in auto-approve. Fixed: auto-approve's line is `Usage: auto-approve.mjs …` (55b0b923) and commit's file header drops `node` (667ed2b0).
- The AC-9 test checks `argv[0] === "git"` only through its `find()` lookup, not with its own assertion. Fixed in 7ce44412.

### Second pass: the review-fix commits

Briar self-review, 2026-11-18, of 2c4f7de6..e9705bfc (the seven fix commits and the plan record). One Major finding and two Minor ones. Every earlier fix holds: each one's code matches its suggested fix or the Decision that replaced it, and each new test fails on the old head where the plan says so. The faked-`win32` container test fails there because `toHostPath` turns `/w` into `W:/`. CI run 44289419823 on e9705bfc is green on `ubuntu-latest` and `windows-latest`, so AC-1 now holds, and AC-2 through AC-9 still hold. `pnpm prism:check` with `GITHUB_HEAD_REF` set exits 0 locally: 1504 tests, 1503 pass, 0 fail, and 1 skipped. The skip is the existing `.agents` round-trip case, which waits on `prism:build`.

#### The commit script's doc says a failed git status passes stdout through, and it drops it

- **Severity:** `major`
- **Status:** `fixed`
- **Fixed in:** 5f506cb0: `commit.mjs` returns `status.stdout` when `git status` fails, and a new test with a `git` stand-in that prints to stdout on `status` asserts it. The test sits beside the real-git status test, because the stand-in is POSIX-only and that test also runs on Windows.
- **File:** `.prism/architect/_toolkit/plan-chain-scripts.md:93`
- **Problem:** the doc says any other git failure, "including a failed `git status` during the unchanged-path check", exits with git's code, stdout, and stderr. `scripts/ai-skills/hooks/plan/commit.mjs:87` returns `stdout: ""` on that path. `architect-doc-verification.md` grades a diverged claim Major at minimum, because the next agent loads the doc as fact. The runtime cost is small: a failing `git status --porcelain` writes its error to stderr, which does pass through.
- **Suggested fix:** return `stdout: status.stdout` at `commit.mjs:87`, which also matches the Decision that `commit.mjs` returns git's stdout on failure. The existing status-failure test can assert it. Editing the doc instead would leave the code and that Decision disagreeing.

#### The post-compact note still says the plan was missed by name

- **Severity:** `minor`
- **Status:** `fixed`
- **Fixed in:** 5f506cb0: the note opens with the template's wording, and the existing plan-lookup-miss test pins it.
- **File:** `scripts/ai-skills/hooks/compact-handoff.mjs:245`
- **Problem:** the earlier fix in 7ce44412 reworded the PreCompact status line and template, but `buildPostCompactNote` still opens with "No plan file named for this branch's ticket was found". After T9, a miss means the name tiers, the ticket-field scan, and the archive all came up empty. This is Minor because the note still sends the session to the full Plan Lookup, so the only cost is a repeated scan.
- **Suggested fix:** use the template's wording, "No plan file was found for this branch's ticket, by name, by ticket field, or in the archive", and pin it in `compact-handoff.test.ts`.

#### resolveLivePlan's new JSDoc is written in changelog voice

- **Severity:** `minor`
- **Status:** `fixed`
- **Fixed in:** 5f506cb0: the JSDoc keeps the invariant and drops the history clause.
- **File:** `scripts/ai-skills/lib/resolve-live-plan.ts:142`
- **Problem:** "resolves as no plan, as it did before the lookup moved to `resolvePlan`" describes the commit, not the code. `code-comments.md` lists changelog voice under Not Allowed. This is Minor because the next sentence already gives the real reason, so only the clause misleads.
- **Suggested fix:** keep the invariant and drop the history: "A plans directory that can't be read resolves as no plan, because `resolvePlan` throws on it and `spec-scope-lint` passes a branch whose plan is missing."

**Considered and not filed.** The alias swap's `path.posix.join` maps a key that ends mid-segment differently from the old string paste: `{ "@lib": "src/lib" }` sends `@libfoo` to `src/lib/foo`, not `src/libfoo`. The Decision on the alias swap accepts that trade, and the documented key shape ends in `/`.

### PR review: the whole PR against main

Eric PR review, 2026-11-18, of 35f6ca7a..e9ad165b. Two Major findings and two Minor ones. CI run 44290931324 on e9ad165b is green on `ubuntu-latest` and `windows-latest`, and `pnpm prism:check` with `GITHUB_HEAD_REF` set exits 0 locally (1505 tests, 1504 pass, 0 fail, 1 skipped). Both Majors were confirmed with a probe, not read off the code alone.

#### An unparseable config lets auto-approval run with no contract stop paths

- **Severity:** `major`
- **Status:** `fixed`
- **Fixed in:** e8547f90: `readStopPathConfig` throws when the config file exists and `readRepoConfig` returns null, so the CLI exits 2 with a message, and the new CLI test fails on the old head. An absent file keeps the defaults.
- **File:** `scripts/ai-skills/hooks/plan/auto-approve.mjs:389`
- **Problem:** `readRepoConfig` returns null when `.ai-skills/config.json` does not parse, so `resolveStopPaths(null)` returns the defaults with an empty contract list and the plan approves. Probed: the `contract-path` fixture with `{ "stopPaths": { "contract": ["src/contracts/**"] }, }` (a trailing comma) passes `--check` with exit 0, and the same config without the comma exits 1 on the stop path. `plan-chain-scripts.md:81` and the comment at `auto-approve.mjs:391` both say a config it can't read exits 2 without approving.
- **Suggested fix:** leave the shared `readRepoConfig` alone. In `runCli`, when `<repoRoot>/.ai-skills/config.json` exists and `readRepoConfig` returns null, print that the config can't be parsed and exit 2. An absent file keeps the defaults. Add a CLI test with a trailing-comma config.

#### The install stub routes `.claude/hooks/plan/**`, which the hook runtime doc says stays unrouted

- **Severity:** `major`
- **Status:** `fixed`
- **Fixed in:** afde75fd: the stub drops the `.claude/hooks/plan/**` route and routes `.prism/templates/plan.md` and `.prism/templates/spec.md` to the doc. `prism:verify-manifest` passes, and the gate probe allows both calls. See the Decision on the install seed's routing stub.
- **File:** `templates/install/.prism/architect/manifest.stub.json:28`
- **Problem:** `hook-runtime.md:31` says the consumer-side files under `.claude/hooks/` are deliberately unrouted, because in a consumer repo they belong to the consumer. The new route puts them under the write gate. Probed: in a consumer fixture with the shipped stub as its manifest, a `PreToolUse` Bash call running `node .claude/hooks/plan/tasks.mjs …` or `node .claude/hooks/plan/commit.mjs …` is denied until `plan-chain-scripts.md` is read. The Decision on the stub route cites `.githooks/**` as precedent, but `.githooks/` is not on the doc's unrouted list and `.claude/hooks/` is.
- **Suggested fix:** route the doc in the stub the way the base manifest does, with `.prism/templates/plan.md` and `.prism/templates/spec.md` pointing at `_toolkit/plan-chain-scripts.md`, drop the `.claude/hooks/plan/**` route, and rerun `prism:verify-manifest`. If the `.claude/hooks/` route is wanted, amend the sentence in `hook-runtime.md` and record why in Decisions.

#### The copied extractImportSpecifiers JSDoc cites a missing module and reads as a changelog

- **Severity:** `minor`
- **Status:** `fixed`
- **Fixed in:** 518a5eae: the comparison and the history are cut, and the three invariants stay.
- **File:** `scripts/ai-skills/hooks/plan/bundles.mjs:188`
- **Problem:** the JSDoc came over verbatim. It compares the function to a "shell-token extractor" that does not exist in PRISM, and its closing sentences narrate history ("silently dropped that fourth one", "a specifier that matches today"), which `code-comments.md` lists under Not Allowed.
- **Suggested fix:** keep the invariants (the four import forms, that a specifier in a comment can add an edge but never drop one, and why the two `from` patterns are bounded differently) and drop the comparison and the history.

#### The resolver test header lists the tiers from before the lookup moved

- **Severity:** `minor`
- **Status:** `fixed`
- **Fixed in:** 518a5eae: the header lists the plan folder (`<id>/` and `epic-<id>/`), the flat files, the ticket-field scan for folders and flat plans, and the slug tier.
- **File:** `scripts/ai-skills/lib/resolve-live-plan.test.ts:4`
- **Problem:** the header says the suite exercises "every fallback tier" and lists a plan folder's `<id>/plan.md`, `<id>.md`, and `epic-<id>.md`. This PR added the intent-only folder, the epic folder, and the folder ticket-field cases, so the list is now incomplete.
- **Suggested fix:** name the order in `lookup.mjs`, or drop the list and point at `lookup.mjs`.

## Acceptance Criteria

The issue's one-line proof ("every suite passes, and a plan with two tasks on one file is rejected"), expanded into checkable criteria.

- [ ] **AC-1** Every suite this child adds passes on both CI platforms.
  - Evidence (machine): the PR's `prism-check` CI is green on `ubuntu-latest` and `windows-latest`. Locally, `pnpm prism:test` reports 0 failures and its output includes tests from `hook-tokenize`, `hook-segments`, `plan-frontmatter`, `plan-config-schema`, `plan-stop-paths`, `plan-tasks`, `plan-lookup`, `plan-bundles`, `plan-commit`, `plan-auto-approve`, `plan-templates`, `plan-folder-citations`, and `plan-runtime-delivery` · UNMET looks like: either leg red, or a listed suite missing from the run.
- [ ] **AC-2** A plan with two open tasks listing the same file, neither depending on the other, is rejected by the bundle check.
  - Evidence (machine): in `plan-bundles.test.ts`, the CLI on that fixture exits 1 with `Duplicate claim: src/a.ts is listed by T1 and T2`. The positive control is the same plan with `depends on: T1` on T2, which exits 0 · UNMET looks like: exit 0 on the duplicate, or exit 1 on the control.
- [ ] **AC-3** A plan meeting every condition auto-approves, and a plan failing any one is held with nothing written.
  - Evidence (machine): in `plan-auto-approve.test.ts`:
    - `clean` and `thirteen-tasks` end with `status: approved` and `approved_by: auto`.
    - `one-round`, `round-2-blocking`, `outside-affected-systems`, `dependency-file`, and `contract-path` each exit 1 with the plan byte-identical.
    - UNMET looks like: any held fixture written to, or any approving fixture left at `draft`.
- [ ] **AC-4** A confirm round may carry findings, and an earlier round may not.
  - Evidence (machine): in `plan-auto-approve.test.ts`, `round 4: carried 2` as the highest round approves, and `round 3: carried 1` as the highest round exits 1 · UNMET looks like: the round-3 carry approves, or the round-4 carry is held.
- [ ] **AC-5** A plan folder resolves ahead of a flat plan, legacy flat plans resolve as before, and an archived plan is found only by the archive search.
  - Evidence (machine):
    - `plan-lookup.test.ts`: a folder holding only `intent.md` beats a flat plan of the same id, and `resolvePlan` returns null when only `.prism/archived/plans/` holds the plan, while `findArchivedPlan` returns it.
    - `resolve-live-plan.test.ts` passes with only the one renamed assertion changed.
    - UNMET looks like: an archived path returned by `resolvePlan`, or a flat-plan assertion edited beyond the renamed one.
- [ ] **AC-6** The commit script commits only the named paths and refuses an unchanged one.
  - Evidence (machine): in `plan-commit.test.ts`:
    - A sibling's staged file is still staged and absent from the new commit.
    - Naming an unchanged path exits 1 with nothing staged.
    - `:/` is treated as a missing path.
    - UNMET looks like: the sibling file in the commit, or anything staged after the refusal.
- [ ] **AC-7** A plan folder holding a section-sign citation fails `pnpm prism:check`, and the allowlisted phase-1 plan does not.
  - Evidence (machine): `plan-folder-citations.test.ts` reports `<file>:<line> section-citation` for a fixture folder. In this repo, `pnpm run prism:plan-citations` exits 0, and `prism:check` in `package.json` contains `prism:plan-citations` · UNMET looks like: the fixture passes, the repo run fails on `prism-499/plan.md`, or the step is missing from `prism:check`.
- [ ] **AC-8** A consumer's delivered copy of the chain scripts runs.
  - Evidence (machine): in `plan-runtime-delivery.test.ts`, after `runUpdate`, `node .claude/hooks/plan/tasks.mjs <plan> --base HEAD` exits 0 in the consumer fixture, and `hosts: ["cursor"]` delivers none of the files · UNMET looks like: a module-not-found error from the delivered copy.
- [ ] **AC-9** The shell parser follows a directory change inside a shell string.
  - Evidence (machine): in `hook-segments.test.ts`, `bash -c 'cd sub && git commit -m x'` yields a `git` segment with `via: "shell-string"` and `cwd` ending in `sub` · UNMET looks like: no `git` segment, or `cwd` left at the root.

### AC Sync Log

| Date | Agent | Action | Plan | Ticket |
| ---- | ----- | ------ | ---- | ------ |
| 2026-11-18 | Winston | Generated AC from the issue's proof line | written | not synced (awaiting go-ahead) |
| 2026-11-18 | Clove | Checked issue #520's Acceptance Criteria against the plan's nine criteria | none needed | synced |

## PR Readiness

- [x] No critical or major issues — both self-review passes' and the PR review's findings are fixed; the PR review's re-review has not run
- [x] Types correct — `pnpm prism:check-types` passes for both tsconfigs, and the modules use JSDoc types with no `any`
- [x] No stray console.logs or debug artifacts
- [x] Tests written for new logic and edge cases — a CLI test pins exit 2 on a config that does not parse
- [x] All debugged issues resolved (no `open` entries)
- [x] Build passes — last run 2026-11-18: `pnpm prism:check` with `GITHUB_HEAD_REF` set exits 0 locally on the PR-review fix commits (1505 pass, 1 skipped). CI on those commits has not run; run 44290931324 on e9ad165b is green on `ubuntu-latest` and `windows-latest`
- [x] PR description up to date — its Not-verified line names the PR-review fix commits, and Notes name the `prism-519/plan.md` rewordings
- [ ] Lasting decisions promoted to architect context (if applicable) — close-time work, not yet done

**Last updated:** 2026-11-18

Retro:
