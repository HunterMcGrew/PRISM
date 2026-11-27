# Review Runtime

The review rulebook an install carries and the scripts a review or verify run calls: how [`REVIEW.md`](../../../REVIEW.md) and its pass files reach a repo and who owns them, and what `reconcile.mjs`, `ignore.mjs`, `record.mjs`, `post.mjs`, `check-report.mjs`, and the retro-line check promise. How the hook runtime reaches an install is [`hook-runtime.md`](./hook-runtime.md). The plan-folder scripts, `watch-ci.mjs` among them, are [`plan-chain-scripts.md`](./plan-chain-scripts.md).

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

**Arguments.** `--no-write` skips every write and reports each as `would ...`. `--json` prints the findings as one object with the same exit code, for a caller that should not parse prose. `--log <path>` overrides the misses log location. `--classes` prints the open miss classes and exits without touching GitHub.

**Exit codes.** 0 when nothing is unclean. 1 when something is, and the report lists it. 2 on a usage error, or when it cannot find the repo to locate the log and `--log` was not given. A failed `gh` read is not caught, so it ends the run with the thrown error.

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

**The verdict.** Every finding in the report counts as open, since the report carries no status. A finding marked `kind: "decision"` is left out of both the verdict and the counts, because it waits on a person rather than a fix. The round is `clean` when no other Critical or Major is present and every pass token is `swept — ` or `n/a: ` followed by text. A bare `swept`, or a prefix with nothing after it, names no reach, so it makes the round unclean. Otherwise the verdict is `<crit> critical, <maj> major, <min> minor, <nit> nit`.

**The line.** The sha is trimmed and cut to its first 8 characters. The line goes after the last non-blank line of `## Review`, before the next `## ` heading. A plan with no `## Review` gets the heading at the end of the file, and `## Review Issues` does not count as one.

**Never-reviewed paths.** It reads `reviewIgnore` from the config of the repo holding the plan, found by walking up to `.git`, and with no repo it uses the defaults. A finding whose `file`, normalized through `normalizeReviewPath`, is never reviewed exits 1, names each such path, and leaves the plan untouched. The review drops the finding and records again.

**Exit codes.** 0 when the line is written, and the line is printed. 1 for a never-reviewed path. 2 on a missing argument, an unreadable plan or report, a report that is not valid JSON or not in the shape above (an empty `passes`, a malformed `sha`, and a `part` out of range included), a `.ai-skills/config.json` that exists but does not parse, and a malformed `reviewIgnore`.

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

## The retro-line check

`plan-retro-line.ts` fails a live folder plan whose PR review has given its final verdict while the `Retro:` line under `## PR Readiness` is still empty. The retro is the fixed last stage of a folder plan, so a plan that got that far with no retro line was left unfinished.

**What counts as a recorded PR review.** The last `- pr-review round <n> at <sha>: <verdict>` or `- pr-review confirm at <sha>: <verdict>` line under `## Review`. It is final when it is a `confirm` line, or a `round` line whose verdict is exactly `clean`. A round with open counts means fixes and another round are coming, so the retro is not due yet.

**Stacked tickets.** Every PR in a stack shares one plan folder. A record line written on a PR that is not the last carries ` (part <k> of <m>)` after the sha, as in `- pr-review round 2 at <sha> (part 1 of 2): clean`, and the check skips a last line whose `<k>` is less than `<m>`. A line with no marker, or with `<k>` equal to `<m>`, counts as above. [`REVIEW.md`](../../../REVIEW.md) gives the `review round` lines `record.mjs` writes the same marker and says a line whose `<k>` is less than `<m>` is never a final verdict.

**Why only folder plans.** It reads `.prism/plans/<name>/plan.md` and skips epic folders, flat plans, and `.prism/archived/`. The retro of an epic or a flat plan stays declinable or lives in a different file, so an empty line there is not a defect.

**It is PRISM's own lint and is not delivered.** PRISM runs it over its own plans in its build check. A consumer's folder plans get no enforcement from it, so a consumer who wants the same guarantee writes their own check against the line shapes above.

## Invocation

In a consumer, the commands are `node .claude/hooks/review/reconcile.mjs`, `node .claude/hooks/review/record.mjs`, `node .claude/hooks/review/post.mjs`, and `node .claude/hooks/verify/check-report.mjs`. `review/ignore.mjs` is imported by `record.mjs` and `post.mjs`, not run. In PRISM's own tree the same files sit under `scripts/ai-skills/hooks/` in place of `.claude/hooks/`. All five are zero-dependency `.mjs` files with a `.d.mts` sidecar, they carry the runtime ownership marker, and `HOOK_RUNTIME_FILES` delivers them with the rest of the runtime ([`hook-runtime.md`](./hook-runtime.md)). None needs the executable bit. `reconcile.mjs` and `post.mjs` need `gh` signed in, and `record.mjs` and `check-report.mjs` read only local files.
