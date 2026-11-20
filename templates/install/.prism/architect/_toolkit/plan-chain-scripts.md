# Plan-Chain Scripts

The plan-chain modules under the hook runtime's `plan/` directory, and the shell parser in `lib/tokenize.mjs` and `lib/segments.mjs`. They read and gate a plan folder (`intent.md`, `design.md`, `spec.md`, `plan.md`) with no `node_modules`. Delivery, registration, and the gates that run on every tool call are [`hook-runtime.md`](./hook-runtime.md). The plan lifecycle is [`.prism/rules/branch-plan.md`](../../rules/branch-plan.md).

## Contracts

Every module is zero-dependency `.mjs` with a `.d.mts` sidecar for PRISM's own `tsc` run. Each one carries the `@prism-hook-runtime` marker and is delivered by `HOOK_RUNTIME_FILES`.

- **`plan/frontmatter.mjs`** reads a file's leading `---` block as `key: value` lines (no YAML), reads `## ` sections with HTML comments removed, and writes the approval stamp. It also owns the pattern that recognizes a chain-file path. Approval state is always read through this module, so a writer and a guard can't disagree on it.
- **`plan/lookup.mjs`** resolves a ticket ID to a plan file, live or archived.
- **`plan/tasks.mjs`** parses `## Tasks` and reports which tasks are done from commit subjects.
- **`plan/bundles.mjs`** groups open tasks into parallel-safe bundles.
- **`plan/auto-approve.mjs`** approves a folder plan when every condition holds.
- **`plan/stop-paths.mjs`** holds the dependency and contract path lists and the matcher for them.
- **`plan/commit.mjs`** commits exactly the named paths.
- **`plan/approve.mjs`** stamps a chain file's approval lines for a person, after a keypress in their terminal or, inside an agent session, on a chat approval token in place of the keypress. It stamps `intent.md`, `design.md`, and `plan.md` and never `spec.md`, and it refuses a file whose text changed after the person said `approve`.
- **`plan/chat-approval.mjs`** holds the chat approval token's file name, the prompt parser, and the hash of every chain artifact, plus the helpers that find, read, and take the token. The approve guard writes the token and `approve.mjs` takes it ([`hook-runtime.md`](./hook-runtime.md) § Approve guard).
- **`plan/watch-ci.mjs`** waits for a PR's CI to settle on its newest commit. It waits for the check named by `--required`, else by `ci.requiredCheck` in `.ai-skills/config.json`, until that check exists on the head and nothing is pending, and with neither set it waits until the head has at least one check and none is pending. With neither set, a check that registers after the others settle can be missed, so the watcher can exit 0 before it runs. Setting `ci.requiredCheck` or passing `--required` is what closes that. It follows the PR, so a push made while it waits moves it to the new head. It prints one JSON line naming the head and any failed checks, and exits 0 when every check passed, 1 when one failed or was cancelled, 8 when `--timeout-min` (60 by default) ran out, 2 on a usage error, and 3 when `gh` cannot read the PR.
- **`lib/tokenize.mjs`** and **`lib/segments.mjs`** turn a shell command into the simple commands bash would run.

## Invocation

In a consumer, run `node .claude/hooks/plan/<name>.mjs`. In PRISM's own tree, run `node scripts/ai-skills/hooks/plan/<name>.mjs`. Skill and rule text spells that directory with the `HOOK_RUNTIME_DIR` token, which renders as `scripts/ai-skills/hooks` in PRISM and `.claude/hooks` in a consumer. It comes from `hookRuntimeDir` in `.ai-skills/config.json`, which a consumer never sets. Only `tasks`, `bundles`, `auto-approve`, `approve`, `commit`, and `watch-ci` are commands. The rest are imported. A command exits 0 on success, 2 on a usage or config error, and 1 when one of its own conditions fails. `watch-ci.mjs` adds 8 and 3 to those. `commit.mjs` passes any other git failure through with git's code. A `.ai-skills/config.json` that exists but does not parse is a config error, exit 2, for every command that reads it except `watch-ci.mjs`, so a typo in a config that sets `stopPaths` can't fall back to the default paths and approve a plan the configured ones would stop. `watch-ci.mjs` reads the file only for `ci.requiredCheck` and treats one that does not parse as absent, which makes it wait only until the head has a check and none is pending, with the late-check gap above, instead of for one named check.

## Templates

`.prism/templates/intent.md`, `.prism/templates/design.md`, `.prism/templates/spec.md`, and `.prism/templates/plan.md` are the starting copy of each chain file. The scripts read their frontmatter keys and `##` headings by name: `## Tasks` and `## Challenge` in the plan, `## Affected systems` and the `epic:` line in the spec, and the approval lines in every file's frontmatter. The spec's `epic:` and `child:` lines are for an epic child only. An epic child's folder holds `spec.md` and `plan.md` and no `intent.md`, because the epic's approved intent covers it. `epic:` names the epic's plan folder, and `child:` the first-column value of the child's `## Children` row in the epic spec. Every other spec deletes both lines. A plan keeps the headings its template gives, and the example task and empty glob block in the templates sit inside comments or an empty fence so they parse as nothing until a person fills them.

## Entry guards

Every command ends with a guard that compares the realpath of `process.argv[1]` to the module's own path, so a symlinked invocation still counts as direct. That guard is only right while nothing in the `dist/cli.js` bundle imports these modules. The esbuild bundle collapses every module's `import.meta.url` to one file, so a bundled guard would fire on every invocation. The runtime can't use `isDirectCliEntry` instead, because it ships no TypeScript. Before a bundled module imports a command module, split the CLI from the logic.

## Globs

Every glob in these modules goes through `compileMatcher` in `lib/match.mjs`, the one dialect the architect routes use. `**` crosses directories, `*` stays inside one segment, and every other character is literal, `[` included, so a glob naming a `[...slug]` route matches it. A `**/` prefix does not match a file at the repo root, so a pattern that should cover both is written twice. The same holds in the middle of a pattern: `a/**/b` needs at least one directory between `a` and `b`, and braces never expand, so `{ts,tsx}` is not an alternation. Stop paths are the one place that works around both (§ Stop paths). `path.matchesGlob` is not used, because the package's engines floor predates it.

## Lookup

`resolvePlan` looks in `.prism/plans/` in this order: `<id>/`, `<id>.md`, `epic-<id>/`, `epic-<id>.md`, then a scan of every entry for a folder chain file whose `ticket:` line names the ID, or a flat file whose `## Ticket` line does. A folder counts only when it holds a chain file as a regular file, because `plans/` also holds folders that are not plans. A folder resolves to its latest-stage file: `plan.md`, else `spec.md`, `design.md`, `intent.md`.

`findArchivedPlan` applies the same rules to `.prism/archived/plans/`. It is a separate function so the live lookup never reads the archive: a frozen record that resolved as a live plan would send a session to work from a closed ticket's plan. A caller that wants the archive asks for it by name, as the compaction arms do after a live miss.

## Tasks and subjects

A task is a `### T<n>: <summary>` heading under `## Tasks`, followed by a field list: `files`, `proof`, `proof fails on main`, `depends on`, `behavior change`, `amended` (repeatable), and `new dependency`. HTML comments are stripped first, so the template's example task parses as nothing. The parser throws on a malformed heading, a duplicate ID, a malformed `files`, `depends on`, or `amended` value, a `depends on` ID that names no task, a repeated field, and a miscased or unknown key in the opening field list.

`files` is a comma-separated list of single paths. Backticks, quotes, and a leading `./` are stripped. A glob character, a space, a backslash, a trailing slash, and `.` are errors, so every file claim is a real path the other checks can test. A backslash is rejected because the stop-path and outside-the-repo checks read forward slashes, so a `src\contracts\x.ts` claim would slip past both.

A commit subject finishes tasks through one of these forms:

- `T<n>: ...`, `T<a>-T<b>: ...`, or `T<a>,T<b>: ...` names the tasks it completes.
- `T<n> fix: ...` names a task without completing it, so a fix on a finished task can't mark an unfinished one done.
- `plan: ...`, `retro: ...`, and `<ticketPrefix>-<digits>: ...` are recognized and complete nothing. The ticket form is built from `ticketPrefix` in `.ai-skills/config.json`, matched without regard to case. With no prefix, no subject reads as a ticket subject.

Done is judged over a commit range. With `--base <ref>`, the range is `<ref>..HEAD` and follows first parents only. Without it, the range starts at the commit that first added the plan folder's `intent.md`, or its `spec.md` for an epic child, whose folder holds no intent. It follows first parents only and includes that commit's own subject. First-parent matters on a stacked branch: a branch built on another plan's branch would otherwise count the parent's `T<n>:` commits, including ones a merge of the parent brings in, and every plan numbers its tasks from `T1`, so a merged parent's later `T2:` would mark this plan's open `T2` done. A squash-merge breaks the other direction on a ticket shipped as a stack of PRs: the earlier part reaches the default branch as one ticket-subject commit, so a later part's branch, cut after that merge, reads the earlier part's tasks as open, and `bundles.mjs` and the resume table would send a session back to build them again. Until the script reads a stack part some other way, the later part opens with one commit that touches only the plan, whose subject names the shipped tasks, such as `T1-T12: Record part 1 as shipped`. A folder whose anchor file isn't committed yet has no task done. A plan with neither file beside it reads `origin/<defaultBranch>..HEAD`, with `defaultBranch` from the config and `main` as the fallback.

## Bundle check

`bundles.mjs` takes the open tasks and groups the unblocked ones by the set of architect docs the manifest routes their files to, so one agent can load that set once. A done task claims nothing, which lets an amended plan add tasks over files an earlier task already shipped. It finds the repo root by walking up to `.prism/architect/manifest.json`, so a plan with no manifest above it exits 1 naming that path. Every install ships the stub manifest, so a repo that has none was never installed.

- **Duplicate claim.** Two open tasks listing one file with no dependency between them, direct or through other open tasks, exit 1, because they would edit one file in parallel. Declaring `depends on` on the later task clears it. A chain that passes through a done task doesn't count, since the done task no longer holds the later one back.
- **Import edges.** For each file a task lists that exists on disk, the check reads its import specifiers (`import ... from`, `import "x"`, `require("x")`, and dynamic `import("x")`). A specifier that resolves to a file another open task owns adds a dependency on that task, so a task never runs beside the task that owns a file it imports. Resolution tries the path as written, then with `.ts`, `.tsx`, `.mjs`, or `.js`, then as a folder with an `index` file, and a file another task claims counts even if it isn't written yet. A relative specifier is an edge candidate. So is one that starts with a key of `importAliases` in `.ai-skills/config.json`, where the longest matching key is swapped for its value. The value may be spelled `src/`, `src`, or `./src/`, because the swap joins it to the rest of the specifier as a path. Any other specifier is a package and adds nothing. A listed file not yet on disk is reported as not scanned.
- **Cycle.** Dependencies that form a cycle exit 1 and name it.
- **Approval.** With `--base`, which only the build passes, a plan whose frontmatter carries a `status` other than `approved` exits 1, so no wave after the first starts from an unapproved plan. Without `--base` a draft is accepted, and a flat plan with no status line is unaffected.

## Auto-approval

`auto-approve.mjs <plan-folder> [--check]` approves a plan without a person when every one of these holds, and reports every failing condition rather than the first:

- the folder's `intent.md` reads `status: approved`, or, with no `intent.md`, `spec.md`'s `epic:` line names a sibling plan folder whose `intent.md` does and reads `size: epic`, and whose `spec.md` has a `## Children` row whose first cell, backticks aside, is the child spec's `child:` value. Approving an epic approves the children its spec lists and no other ticket's. An `epic:` value holding `/`, `\`, or `..` fails, so it can't point outside the plans directory, and so does a folder with neither an intent nor an `epic:` line;
- the plan has at least one task, and `plan.md` has a `status` line;
- every task lists at least one file, each inside the repo and none a directory;
- every listed file matches a glob in the first fenced block under `## Affected systems` in `spec.md`;
- `## Challenge` has round lines `round <n>: clean`, `resolved <k>`, `carried <k>`, or `blocking <k>`, with no repeated number, rounds 1 and 2 both present, and the highest-numbered round not `blocking`;
- no listed file is on a stop path.

`carried` is accepted only from round 4 on, because rounds 1 to 3 are the fix loop and round 4 is the first confirm round. A carried finding is one the confirm round leaves for the PR as an open item. The task count has no cap, because a cap sends a sound plan to a person for its size alone.

When every condition holds, the script rewrites the `status: draft` line to `status: approved` plus `approved_by: auto` and `approved_at: <local date>`, and changes nothing else. `--check` writes nothing. An already approved plan passes untouched. A `status` other than `draft` or `approved`, or a status line that isn't plain `status: draft`, fails instead of reporting an approval it never wrote. The script writes through the filesystem, so an approval guard watching agent edits never sees it.

## Stop paths

Two kinds stop auto-approval. `dependency` paths are manifests and lockfiles. `contract` paths are the shared trees other systems read. They come from `stopPaths.dependency` and `stopPaths.contract` in `.ai-skills/config.json`, and a list that is set replaces its default. The default dependency list covers common manifests and lockfiles at the repo root and at any depth: `package.json`, the npm, pnpm, yarn, and bun lockfiles, `composer.json` and its lockfile, `pyproject.toml`, `poetry.lock`, `uv.lock`, `requirements.txt`, `go.mod`, `go.sum`, `Cargo.toml` and its lockfile, and `Gemfile` and its lockfile. Each is listed twice, bare and with a `**/` prefix, because of the root caveat under Globs. The default contract list is empty, so a repo that wants one names it.

`stop-paths.mjs` expands each pattern so a `**/` in the middle also matches zero directories: `api/**/schema.graphql` covers `api/schema.graphql`. The expansion lives there and not in `compileMatcher`, because the architect routes share that function and changing it would change what every route matches. A `**/` prefix still needs the root file listed on its own. Braces are rejected: a pattern holding `{` is a config error, because `compileMatcher` reads them literally and the pattern would never match. An unknown key under `stopPaths`, a non-string entry, and a list that is set but is not an array, such as `"contract": "src/contracts/**"`, are config errors as well. Only an absent key takes its default. A set value that fell back to the default would turn the default contract list, which is empty, into approval past the paths the config meant to stop on. A stop path that silently matches nothing lets a plan past the tree it was meant to protect, so these fail loudly. `auto-approve.mjs` prints the message and exits 2 without approving, since a config it can't read is not a held condition. The config validator in `config-schema-validate.ts` runs from `prism adopt`, `prism update`, and `prism doctor`. It rejects a list that is not an array and a non-string entry. It accepts an unknown key and a brace pattern, because it does not enforce `additionalProperties` and has no rule for braces. `auto-approve.mjs` never runs the validator, so at approval time `resolveStopPaths` is the check for all four.

Matching ignores case, because macOS paths do. A directory also matches when it is, or sits above, the literal part of a glob before its first wildcard segment: `src/contracts` hits `src/contracts/**`. That is why a bare directory in `files` can't hide a stop path under it.

## Commit script

`commit.mjs "<subject>" <path>...` stages and commits exactly the named paths, so parallel task agents sharing one worktree never sweep a sibling's staged files into their commit. It makes three guarantees:

- **Named paths only.** It runs `git add -- <paths>` then `git commit -m <subject> -- <paths>`, so anything else already staged stays staged.
- **No unchanged path.** A named path that exists and has no change against HEAD exits 1 before anything is staged, because git would commit the other paths and the subject would describe a change the commit doesn't carry. A deleted path is a change.
- **Literal pathspecs.** Every call passes `--literal-pathspecs`, so `:/` or a glob in a path can't widen the commit. Every git call is an argv array with no shell, so quoting is the same on every platform.

A step that fails on a held `index.lock` is retried, because a sibling's git call holding the lock is the normal case. `PRISM_PLAN_COMMIT_RETRIES` is the total number of attempts (default 20) and `PRISM_PLAN_COMMIT_RETRY_DELAY_MS` is the wait between them (default 500). After the last attempt it exits 1 naming the lock path. Any other git failure, including a failed `git status` during the unchanged-path check, exits with git's own code, stdout, and stderr. A delay of `0` is honored, and a retry count below 1 falls back to the default.

## Shell parser

`lib/segments.mjs` walks a shell command into its simple commands, unwrapping wrappers such as `env`, `timeout`, and `bash -c`, and tracking the directory each one runs in. Inside a container (`docker exec` and the compose forms) a directory resolves as a POSIX path whatever the host is, and `~` and a bare `cd` read as unknown, because the container's home is not the host's. It never runs anything. What a segment means is the calling gate's rule. Every gate that reads a shell command reads it through these two modules, and the runtime ships no other shell splitter. The header of `lib/segments.mjs` lists its accepted false walks and its known misses, such as `xargs`, `find -exec`, `sudo`, and git aliases. A gate built on it has to treat those as unwalked, not as safe.

## Hosts

The modules arrive with the hook runtime, which reaches every install whatever `hosts` holds, so a Cursor user can run `approve.mjs` from a terminal. Only the registrations and the git hook shims follow `hosts`.
