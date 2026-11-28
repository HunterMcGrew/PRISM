# Review Runtime

The review rulebook an install carries and the scripts a review or verify run calls: how [`REVIEW.md`](../../../REVIEW.md) and its pass files reach a repo and who owns them, and what `reconcile.mjs`, `ignore.mjs`, `record.mjs`, `lines.mjs`, `merge-bar.mjs`, `post.mjs`, `check-report.mjs`, `verify/record.mjs`, and the retro-line check promise. How the hook runtime reaches an install is [`hook-runtime.md`](./hook-runtime.md). The plan-folder scripts, `watch-ci.mjs` and `retro-trigger.mjs` among them, are [`plan-chain-scripts.md`](./plan-chain-scripts.md).

---

## The rulebook

`REVIEW.md` sits at the repo root. It holds severity, the finding shape, the exit rule, and the table of passes. Every review stage reads it, so a missing or stale copy changes how every review runs.

**Its first line is the ownership marker.** A root file sits outside `.prism/`, so the sync manifest holds no hash for it, and ownership is content-keyed the way the hook runtime's files are ([`hook-runtime.md`](./hook-runtime.md) § Hook-runtime ownership and recovery). The marker is an HTML comment that opens with `<!-- prism:review`. While the first line starts with it, `prism update` keeps the file current. Delete the line and the file is yours.

**How each command treats the file:**

- **`prism adopt` and `prism update`** write it when it is absent, whatever `hosts` holds. When it carries the marker and differs from PRISM's copy, they replace it in place with no backup, the way the hook runtime replaces its own marked files. A marked copy that already matches is left alone. A file without the marker is never touched, and the update prints a warning saying so.
- **`prism doctor`** checks it once the repo has adopted, because a repo that never ran `prism adopt` is a target for adopt and not a broken install. It warns when the file is missing, warns when a marked copy differs from PRISM's, reports an unmarked file as info with the same text the update prints, and reports a marked, matching copy as current. An unmarked file is info and not a warning because deleting the marker line is the documented way to keep your own rulebook, so a team that did it on purpose is not told it did something wrong.
- **`prism eject`** removes a file whose first line carries the marker and keeps one without it.

**Why a marker and not a sync-manifest entry:** a team that rewrote the rulebook has to keep its rewrite through every update. A hash-keyed overwrite cannot tell a hand edit from an older PRISM version, and a marker lets the team opt out by deleting one line.

**Why no backup:** with no hash, an update cannot tell a team's edit from an older PRISM copy, so a backup would fire on every release that changes the rulebook and leave an untracked `REVIEW.md.bak` in the repo root. The cost is that an edit made with the marker still in place is lost on the next update. A team that edits the rulebook deletes the marker line first.

## Pass files and stack checks

The ten pass files live in `.prism/review/`, one per pass in `REVIEW.md`'s table. They are PRISM-owned. `prism update` refreshes them like the rules, and they are copied into each host's platform directory with the other copied areas ([`install-layout.md`](./install-layout.md) § What gets copied; what stays canonical-only). Each ends with a line naming its stack file.

**`.prism/review/stack/` is the team's.** It is consumer-owned, and it never ships in the install seed, so an update has nothing to write or remove there. Onboarding's `review-stack` generator writes the files, and a file that already exists is kept unless the run is forced. The generator writes a file only when its gate holds:

- **`architecture.md`**, when `.prism/rules/` holds a per-team language or framework rule file (`code-standards-<language>.md` or `<name>-guidelines.md`). It carries one bullet per such file.
- **`security.md`**, when `.prism/rules/` holds a `security.md` rule.
- **`correctness.md`**, when a language was detected and `commands.typecheck` or `commands.test` is set in `.ai-skills/config.json`. Each language's bullet names those commands as the evidence a correctness finding cites.

**Stack checks point at the rules and do not restate them.** A copy of a rule drifts the first time the rule changes, while a pointer carries the edit into the next review with no second file to update. Eject keeps the directory, because the files are the team's.

## `reconcile.mjs`

`reconcile.mjs <pr>` runs after an agent review. It replies to and resolves the agent's own threads whose lines changed and reports what is still unclean. Every GitHub read and write goes through `gh api`, so it needs the `gh` login.

**Arguments.** `<pr>` is `N`, `#N`, or a URL ending `/pull/N`, the forms `post.mjs` takes, with no leading zero. A URL's owner and repo must match the repo `gh` resolves for the checkout, compared without regard to case, because a reconcile on another repo's PR number would reply to the wrong threads. `--no-write` skips every write and reports each as `would ...`. `--json` prints the findings as one object with the same exit code, for a caller that should not parse prose. `--log <path>` overrides the misses log location. `--classes` prints the open miss classes and exits without touching GitHub.

**Exit codes.** 0 when nothing is unclean. 1 when something is, and the report lists it. 2 on a usage error, a `<pr>` in none of those forms included, a URL naming another repo, or when it cannot find the repo to locate the log and `--log` was not given. A failed `gh` read is not caught, so it ends the run with the thrown error.

**What counts as unclean:**

- a thread that needs a reply
- a human comment not yet in the misses log
- a required PR body heading that is missing
- a log line that does not parse
- a write GitHub refused
- more than 100 review threads, which the GraphQL read does not page through

**Agent comment or human comment.** A comment carrying `<!-- prism-agent -->` from a login that is not a bot reads as an agent's. The same line from any developer's login reads as an agent's too, so another developer's agent is neither a miss nor owed a reply. A human comment is one that is not agent-marked, not from a bot, and not the PR author's own note.

**Why the login check gates every write.** The marker is plain text anyone can paste. So the runner asks `gh api user` which login it is, and it resolves a thread or checks for an earlier reply only for a marked comment from that login. Without it, a pasted marker could get a thread resolved.

**Threads.** An unresolved thread the agent opened, whose lines changed in a later commit, gets a reply `addressed in <sha>` and is then resolved, unless the last non-bot comment in it is a person's. That thread stays open and needs a reply, because the change may not have fixed what the person raised. A run whose resolve failed already posted the reply, so the next run does not post a second. The read goes through GraphQL first and falls back to the `ccr/` thread route when GitHub answers that GraphQL is not available from the session, which is also the route that resolves.

**PR body headings.** It reads `.prism/templates/pr-description.md` from the repo's top level and takes each `## ` heading after the template's `---` divider. A heading is required unless its placeholder says "Delete this section" or "Skip this section". The report lists the ones the PR body lacks.

**The misses log** is `.prism/metrics/review-misses.jsonl`, append-only JSON lines. `reconcile.mjs` only reads it. A miss row is `{"pr","reviewer","file","summary","class","nearest_pass","comment","logged_at"}`, and `comment` is the human comment's URL, which is what marks that comment as logged. A resolve row is `{"class","resolved","fix"}`. A missing log reads as empty, and the first appended row creates it, so the file is never committed empty.

**Classes.** A class is its trimmed, lower-cased text. It is open when it has at least 3 miss rows and no resolve row. `--classes` lists each open class with its row count and the passes its rows named nearest.

**The union-merge line.** Two branches that each append a row would conflict on the log's last line. `prism adopt` and `prism update` add `.prism/metrics/review-misses.jsonl merge=union` to `.gitattributes`, so a merge keeps both sides' rows. The write is append-only and skips a line already present, and it runs on every host mix because every install has the log.

The session runs `reconcile.mjs <pr> --json` after each push and logs each unlogged human comment, per `.prism/references/shipping-flow.md`.

## `review/ignore.mjs`

`ignore.mjs` holds the paths the review never raises a finding on, the one function that reads them, and the one function that normalizes a path before it is matched. It is imported, not run. `record.mjs` and `post.mjs` both read the lists through `resolveReviewIgnore`, so a finding the review may not record is also one it may not post.

**Path normalization.** `normalizeReviewPath(file, repoRoot)` turns backslashes into slashes, makes an absolute path relative to `repoRoot`, applies `posix.normalize`, and strips a leading `./`. `record.mjs` runs each finding's `file` through it and `post.mjs` runs its `<file>` through it, so `./src/a.ts`, `src\a.ts`, and an absolute path all match the patterns the same way in both scripts.

**The default lists.** With `reviewIgnore` unset in `.ai-skills/config.json`, the ignore list names the operational records (`.prism/plans/**`, `.prism/lessons.md`, `.prism/retros/**`, `.prism/audits/**`, `.prism/metrics/**`), `REVIEW.md`, `.githooks/**`, `.claude/hooks/**`, the PRISM-owned `.prism/` trees, their host copies under `.claude/`, `.codex/`, and `.cursor/`, PRISM's own skills under each skill root, and the generated `prism-*` agent files. A keep list carves the consumer's own files back out of those trees: `.prism/architect/*.md`, `.prism/spec/adrs/*.md`, `.prism/architect/manifest.json`, `.prism/custom/**`, and `.prism/review/stack/**`. A path is never reviewed when it matches an ignore pattern and no keep pattern.

**Why the `.prism/` trees are spelled out.** They mirror `PRISM_OWNED_GLOBS` and `CONSUMER_OWNED_GLOBS` in `ownership.ts`, which the runtime cannot import because it ships no TypeScript. `review-ignore.test.ts` holds the copies equal.

**A set list replaces both defaults.** Setting `reviewIgnore` drops the default keep list too, so the config names every never-reviewed path itself, and an empty array reviews every path. A value that is not an array, a non-string entry, or a pattern holding `{` throws an error naming `reviewIgnore`. Braces are refused because `compileMatcher` reads them literally, so the pattern would match nothing. Patterns use the architect routes' dialect, and case counts.

## `review/record.mjs`

`record.mjs <plan.md> <report.json>` writes a review round's one record line under the plan's `## Review`. The line is `- review round <n> at <sha>[ (part <k> of <m>)]: <verdict>`, and nothing goes under it, because findings and criterion grades reach the session in the report.

**The report.** A JSON object holding `round`, which must be 1 or 2, a `sha` that matches `^[0-9a-f]{7,40}$` once trimmed, a non-empty `passes` array, and a `findings` array, plus an optional `part` of integers `k` and `m` with `m >= 2` and `1 <= k <= m`. Each pass needs a string `token`. Each finding needs a non-empty `file` and a `severity` of `critical`, `major`, `minor`, or `nit`, lower-case only. A severity outside those four is a shape error rather than nothing, because a typo such as `Major` would otherwise count as no finding and read as `clean`. `line`, `kind`, and `summary` are optional, and other fields are ignored.

**The verdict.** Every finding in the report counts as open, since the report carries no status. A finding marked `kind: "decision"` never makes a round unclean and is left out of the counts, because it waits on a person rather than a fix. The round is `clean` when no other Critical or Major is present and every pass token is `swept — ` or `n/a: ` followed by text. A bare `swept`, or a prefix with nothing after it, names no reach, so it makes the round unclean. A clean round that holds decision items records `clean, 1 decision` or `clean, <d> decisions` instead of a bare `clean`, because only a bare `clean` meets the merge bar in `git-conventions.md` § Who merges, and a call only the person can make must not let the session merge. Otherwise the verdict is `<crit> critical, <maj> major, <min> minor, <nit> nit`, with decision items still left out.

**The line.** The sha is trimmed and cut to its first 8 characters. The line goes after the last non-blank line of `## Review`, before the next `## ` heading. A plan with no `## Review` gets the heading at the end of the file, and `## Review Issues` does not count as one.

**Never-reviewed paths.** It reads `reviewIgnore` from the config of the repo holding the plan, found by walking up to `.git`, and with no repo it uses the defaults. A finding whose `file`, normalized through `normalizeReviewPath`, is never reviewed exits 1, names each such path, and leaves the plan untouched. The review drops the finding and records again.

**Exit codes.** 0 when the line is written, and the line is printed. 1 for a never-reviewed path. 2 on a missing argument, an unreadable plan or report, a report that is not valid JSON or not in the shape above (an empty `passes`, a malformed `sha`, and a `part` out of range included), a `.ai-skills/config.json` that exists but does not parse, and a malformed `reviewIgnore`.

## review/lines.mjs

`lines.mjs` is the one reader of the record lines under a plan's `## Review`. It is imported, not run: `plan/retro-trigger.mjs` and `merge-bar.mjs` both read review lines through it, so the two scripts judge the same lines.

**What it reads.** `readReviewLines(text)` takes the section through `sectionBody` in `plan/frontmatter.mjs`, so HTML comments are removed, the section ends at the next `#` or `##` heading outside a code fence, and `## Review Issues` is not `## Review`. It returns each record line in file order as `{ kind, round, sha, part, verdict, line }`. A record line is `- <prefix> round <n> at <sha>` or `- <prefix> confirm at <sha>`, then an optional ` (part <k> of <m>)`, a colon, and the verdict. The prefix is `review`, or the older `self-review` and `pr-review`. `kind` is `round` or `confirm`, `round` is null on a confirm line, `part` is `{ k, m }` or null, the verdict is trimmed, and `line` is the record text without its leading dash. The sha is any run of characters with no space or colon, and is not checked as hex.

**A line that doesn't match is skipped, not an error.** Prose or notes in the section never break a reader, and a plan with no `## Review` returns an empty list.

**The writer and the reader agree through one test.** `REVIEW.md` owns the grammar, `record.mjs` writes it, and `review-lines.test.ts` feeds a line `record.mjs` just wrote back through the reader and checks the round, sha, part, and verdict it was given.

## review/merge-bar.mjs

`merge-bar.mjs <plan.md> [--head <ref>]` checks that a plan's last review record line still holds at the head about to merge. `--head` defaults to `HEAD`. The PR's head sha is the right value to pass, because the local checkout may be behind the PR.

**The tests, in order.** It reads the last record line through `lines.mjs` and prints every failing reason, one per line:

- **A record line exists.** With none, that is the only reason printed.
- **The verdict is a bare `clean`.** `clean, 1 decision` fails, matching the rule in `REVIEW.md` that only a bare `clean` meets the merge bar.
- **The sha resolves to a commit that is the head or an ancestor of it.** A sha that names no commit, or one the head can't reach, such as after a rebase dropped it, is printed and the check stops there.
- **Every commit after the sha is exempt.** It walks every commit in `<sha>..<head>`, commits a merge brought in included, and names each one that is not exempt.

**What is exempt.** A commit whose subject begins `retro:`, a commit whose every changed file sits under the plan's own folder, and a commit that changes no files. The plan folder is the plan's directory relative to the repo root, with `\` turned to `/` and a trailing `/`, so a sibling folder that shares the name as a prefix doesn't count as inside it. The `retro:` exemption exists because the retro commits its promotions into rules and architect docs after the final review, and the review never reads those writes as code. The plan-folder exemption covers `plan:` commits and verify re-runs. The subject is a convention and not a wall, since the commit gate does not judge subjects.

**A merge commit after the sha always fails**, whatever its subject or files. A clean refresh from `main` and a conflict resolution that changed code look the same to this check, so a merge after the review costs another review round. Each failing reason names the commit by its first 8 characters and subject and says to run another round.

**The part marker changes nothing.** A ` (part <k> of <m>)` line is checked like any other, because each part of a stack merges as its own PR.

**Why a script and not a lint.** The lint runs in CI and sees no PR head, because the plan is committed on the branch and the head moves with every push. The answer is needed at merge time, with the head in hand. The check came from a review that recorded `clean` at one sha while three commits that changed source landed after it, and the merge rule then only asked that the last line read `clean`.

**Repo and git.** It finds the repo root by walking up from the plan's real directory to `.git`, and runs `git` as argument arrays with no shell. It reads only local git and the plan.

**Exit codes.** 0 when the bar holds, with nothing printed. 1 with one reason per failure on stdout, a reviewed sha that names no commit included. 2 on a usage error, an unreadable plan, a plan in no repo, a `--head` that names no commit, and a `git` it cannot run.

## `review/post.mjs`

`post.mjs <pr> <file> <line> <body-file>` posts one inline comment on the PR's head commit. The session posts decision items and leftover Critical or Major findings through it, never through `gh` directly, so every agent comment carries the marker `reconcile.mjs` reads and none lands on a never-reviewed path.

**What it posts.** `<pr>` is `N`, `#N`, or a URL ending `/pull/N`. It reads the head with `gh pr view <pr> --repo <owner>/<repo> --json headRefOid`, then posts the body through `gh api repos/<owner>/<repo>/pulls/<pr>/comments` on that commit, at `<line>` on the right side. `<!-- prism-agent -->` is put on the body's first line unless the body already opens with it. `owner` and `repo` come from `github.owner` and `github.repo` in `.ai-skills/config.json`, read from the repo's top level, or from the working directory outside a repo, and each must match `^[A-Za-z0-9._-]+$`. `<file>` is normalized through `normalizeReviewPath` before it is checked and posted. Nothing is posted until every check passes.

**Exit codes.** 0 once the comment is posted. 1 when `<file>` is never reviewed, when GitHub answers 422, and on any other `gh` failure, with its stderr. A failed `gh pr view` exits 1 before any `gh api` call. A 422 means the line sits outside the diff's hunks. The script does not retry another line, because that would pin the comment somewhere the finding is not, so the session lists the item in the PR body instead. 2 on a missing argument, a `<pr>` in none of the three forms, a line that is not a positive integer, an unreadable body file, a config without `github.owner` and `github.repo` (which includes a missing or unparseable config), an owner or repo outside that pattern, and a malformed `reviewIgnore`.

## `check-report.mjs`

`check-report.mjs <plan.md> [<expected.json>]` checks the `## Verification` section a verify run wrote into a plan. The section runs from that heading to the next `## ` heading.

**The shape it expects:**

- a `verdict:` line that reads `done` or `blocked`, and a `head:` line
- a table whose rows are `| <check> | <result> | <evidence> |`, where `<result>` is `pass`, `fail`, or `n/a: <reason>`
- a table row with fewer than three cells, such as `| lint | pass |`, is dropped and not read as a row
- under `### Failures`, one line `- <check>: <path>[:<line>]` for each `fail` row, or `- none`

**With one argument it checks the shape alone:** a verdict and a head are present, every row's result is valid, and each `fail` row has a Failures line and the reverse. A `blocked` verdict is a problem too, reported once per `blocked:` line, so a run that could not finish never passes the check.

**With an expected file** `{ "failures": [{ "check", "file" }] }` it also compares the reported failures to that list. A failure the section lacks is `missed`, and one it adds is a `false failure`. The comparison is on the check and the file, so a line number is ignored.

It exits 0 when clean, 1 with one line per problem, and 2 on a usage error or an unreadable input.

## verify/record.mjs

`record.mjs <plan.md> <report.json>` writes the plan's `## Verification` section from a verify run's report. It replaces the lines from the heading to the next `## ` heading and nothing else, and a plan with no heading gets it at the end.

**The report.** A JSON object in this shape:

```json
{
  "verdict": "done",
  "base": "8c53b07a",
  "head": "1a2b3c4d",
  "blocked": [],
  "rows": [
    { "check": "typecheck", "result": "fail", "evidence": "/tmp/verify/typecheck.log" },
    { "check": "lint", "result": "pass", "evidence": "/tmp/verify/lint.log" }
  ],
  "failures": [{ "check": "typecheck", "file": "scripts/lib/parse.ts", "line": 42 }]
}
```

`verdict` is `done` or `blocked`. `base` and `head` match `^[0-9a-f]{7,40}$` once trimmed, and the section gets the trimmed values. `rows` is a non-empty array of `{ check, result, evidence }`, each a string that is not blank, with no whitespace in `check`, and no `check` that reads as the table's header or separator (`check` in any case, or dashes with optional colons such as `---` or `:-:`), because `check-report.mjs` drops that row. `blocked` is an array of `{ check, why }`, and `failures` an array of `{ check, file, line? }` whose `check` and `file` hold no whitespace and whose `line`, when present, is a positive integer. A `blocked` verdict needs at least one `blocked` entry, and a `done` verdict needs none. No cell may hold `|` or a line break, because either would break the table row or the line `check-report.mjs` reads.

**One copy of the rules.** It composes the section in the shape `check-report.mjs` parses and runs `checkReport` over the plan with the new section in place before it writes. Any problem other than `verdict is blocked:` exits 2 and writes nothing, so the writer cannot drift from the reader.

**Exit codes.** 0 when the section is written. 2 on a missing argument, an unreadable plan or report, invalid JSON, a shape error, a `checkReport` problem, or a plan it cannot write, whose path the message names. There is no exit 1: a `blocked` report is written, and `check-report.mjs` is what fails it. On a re-run, `prism-verify` carries the unchanged rows into the report, so the script never merges.

## The retro-line check

`plan-retro-line.ts` fails a closed live folder plan whose `Retro:` line under `## PR Readiness` is empty, absent, or names no file. The retro writes the `> Closed:` line and the `Retro:` line together, so a closed plan whose `Retro:` line says nothing usable was left unfinished.

**What counts as closed.** A `> Closed: <YYYY-MM-DD>` line before the plan's first `## ` heading. A plan with no such line passes, whatever its `Retro:` line holds. The check reads no review line.

**What the `Retro:` value must be.** The check reads the text after the colon of the last `Retro:` line under `## PR Readiness`, trimmed:

- **Empty or absent** fails.
- **A single token**, with no whitespace, is read as a path from the repo root once backticks are stripped, and fails unless it names a regular file.
- **A value holding whitespace** passes and is not read as a path, so `none — no trigger` and the prose lines on older plans pass.

**What it can't see.** It cannot tell whether `none — no trigger` is true, and a retro that never ran leaves no `> Closed:` line for it to key on. The resume table is what sends a session to the retro.

**Why only folder plans.** It reads `.prism/plans/<name>/plan.md` and skips epic folders, flat plans, and `.prism/archived/`. The retro of an epic or a flat plan stays declinable or lives in a different file, so an empty line there is not a defect.

**It is PRISM's own lint and is not delivered.** PRISM runs it over its own plans in its build check. A consumer's folder plans get no enforcement from it, so a consumer who wants the same guarantee writes their own check against the line shapes above.

## Invocation

In a consumer, the commands are `node .claude/hooks/review/reconcile.mjs`, `node .claude/hooks/review/record.mjs`, `node .claude/hooks/review/merge-bar.mjs`, `node .claude/hooks/review/post.mjs`, `node .claude/hooks/verify/check-report.mjs`, and `node .claude/hooks/verify/record.mjs`. `review/ignore.mjs` is imported by `review/record.mjs` and `post.mjs`, not run. `review/lines.mjs` is imported by `merge-bar.mjs` and `plan/retro-trigger.mjs`, not run. `verify/record.mjs` imports `check-report.mjs`. In PRISM's own tree the same files sit under `scripts/ai-skills/hooks/` in place of `.claude/hooks/`. All of these are zero-dependency `.mjs` files with a `.d.mts` sidecar, they carry the runtime ownership marker, and `HOOK_RUNTIME_FILES` delivers them with the rest of the runtime ([`hook-runtime.md`](./hook-runtime.md)). None needs the executable bit. `reconcile.mjs` and `post.mjs` need `gh` signed in, `review/record.mjs`, `verify/record.mjs`, and `check-report.mjs` read only local files, and `merge-bar.mjs` reads only the plan and local git.
