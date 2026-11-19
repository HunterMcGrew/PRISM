# Review Runtime

The review rulebook an install carries and the scripts a review or verify run calls: how [`REVIEW.md`](../../../REVIEW.md) and its pass files reach a repo and who owns them, and what `reconcile.mjs`, `check-report.mjs`, and the retro-line check promise. How the hook runtime reaches an install is [`hook-runtime.md`](./hook-runtime.md). The plan-folder scripts, `watch-ci.mjs` among them, are [`plan-chain-scripts.md`](./plan-chain-scripts.md).

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

`reconcile.mjs <pr>` runs after an agent review. It replies to and resolves the agent's own threads whose lines changed, corrects the review labels, and reports what is still unclean. Every GitHub read and write goes through `gh api`, so it needs the `gh` login.

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

**Why the login check gates every write.** The marker is plain text anyone can paste. So the runner asks `gh api user` which login it is, and it resolves a thread, checks for an earlier reply, or reads the summary the labels follow only for a marked comment from that login. Without it, a pasted marker could get a thread resolved or the labels changed.

**Threads.** An unresolved thread the agent opened, whose lines changed in a later commit, gets a reply `addressed in <sha>` and is then resolved, unless the last non-bot comment in it is a person's. That thread stays open and needs a reply, because the change may not have fixed what the person raised. A run whose resolve failed already posted the reply, so the next run does not post a second. The read goes through GraphQL first and falls back to the `ccr/` thread route when GitHub answers that GraphQL is not available from the session, which is also the route that resolves.

**Labels.** It reads the verdict line in the agent's latest summary comment, `<!-- prism-verdict: state=<1|2|3> effort=<e> confidence=<c> -->`, and makes the PR's labels match. State 1 expects none. State 2 expects `effort:<e>` and `review:has-minors`. State 3 expects `effort:<e>` and `confidence:<c>`. It touches only the closed set: `effort:glance`, `effort:quick`, `effort:deep`, `confidence:high`, `confidence:needs-judgment`, `confidence:standards-only`, and `review:has-minors`. With no verdict line, or one it cannot read, it leaves every label alone.

**PR body headings.** It reads `.prism/templates/pr-description.md` from the repo's top level and takes each `## ` heading after the template's `---` divider. A heading is required unless its placeholder says "Delete this section" or "Skip this section". The report lists the ones the PR body lacks.

**The misses log** is `.prism/metrics/review-misses.jsonl`, append-only JSON lines. `reconcile.mjs` only reads it. A miss row is `{"pr","reviewer","file","summary","class","nearest_pass","comment","logged_at"}`, and `comment` is the human comment's URL, which is what marks that comment as logged. A resolve row is `{"class","resolved","fix"}`. A missing log reads as empty, and the first appended row creates it, so the file is never committed empty.

**Classes.** A class is its trimmed, lower-cased text. It is open when it has at least 3 miss rows and no resolve row. `--classes` lists each open class with its row count and the passes its rows named nearest.

**The union-merge line.** Two branches that each append a row would conflict on the log's last line. `prism adopt` and `prism update` add `.prism/metrics/review-misses.jsonl merge=union` to `.gitattributes`, so a merge keeps both sides' rows. The write is append-only and skips a line already present, and it runs on every host mix because every install has the log.

## `check-report.mjs`

`check-report.mjs <plan.md> [<expected.json>]` checks the `## Verification` section a verify run wrote into a plan. The section runs from that heading to the next `## ` heading.

**The shape it expects:**

- a `verdict:` line that reads `done` or `blocked`, and a `head:` line
- a table whose rows are `| <check> | <result> | <evidence> |`, where `<result>` is `pass`, `fail`, or `n/a: <reason>`
- under `### Failures`, one line `- <check>: <path>[:<line>]` for each `fail` row, or `- none`

**With one argument it checks the shape alone:** a verdict and a head are present, every row's result is valid, and each `fail` row has a Failures line and the reverse. A `blocked` verdict is a problem too, reported once per `blocked:` line, so a run that could not finish never passes the check.

**With an expected file** `{ "failures": [{ "check", "file" }] }` it also compares the reported failures to that list. A failure the section lacks is `missed`, and one it adds is a `false failure`. The comparison is on the check and the file, so a line number is ignored.

It exits 0 when clean, 1 with one line per problem, and 2 on a usage error or an unreadable input.

## The retro-line check

`plan-retro-line.ts` fails a live folder plan whose PR review has given its final verdict while the `Retro:` line under `## PR Readiness` is still empty. The retro is the fixed last stage of a folder plan, so a plan that got that far with no retro line was left unfinished.

**What counts as a recorded PR review.** The last `- pr-review round <n> at <sha>: <verdict>` or `- pr-review confirm at <sha>: <verdict>` line under `## Review`. It is final when it is a `confirm` line, or a `round` line whose verdict is exactly `clean`. A round with open counts means fixes and another round are coming, so the retro is not due yet.

**Stacked tickets.** Every PR in a stack shares one plan folder. A record line written on a PR that is not the last carries ` (part <k> of <m>)` after the sha, as in `- pr-review round 2 at <sha> (part 1 of 2): clean`, and the check skips a last line whose `<k>` is less than `<m>`. A line with no marker, or with `<k>` equal to `<m>`, counts as above. [`REVIEW.md`](../../../REVIEW.md) gives the `self-review` lines the same marker and says a line whose `<k>` is less than `<m>` is never a final verdict.

**Why only folder plans.** It reads `.prism/plans/<name>/plan.md` and skips epic folders, flat plans, and `.prism/archived/`. The retro of an epic or a flat plan stays declinable or lives in a different file, so an empty line there is not a defect.

**It is PRISM's own lint and is not delivered.** PRISM runs it over its own plans in its build check. A consumer's folder plans get no enforcement from it, so a consumer who wants the same guarantee writes their own check against the line shapes above.

## Invocation

In a consumer, run `node .claude/hooks/review/reconcile.mjs` and `node .claude/hooks/verify/check-report.mjs`. In PRISM's own tree the same scripts are `node scripts/ai-skills/hooks/review/reconcile.mjs` and `node scripts/ai-skills/hooks/verify/check-report.mjs`. Both are zero-dependency `.mjs` files with a `.d.mts` sidecar, they carry the runtime ownership marker, and `HOOK_RUNTIME_FILES` delivers them with the rest of the runtime ([`hook-runtime.md`](./hook-runtime.md)). Neither needs the executable bit. `reconcile.mjs` needs `gh` signed in, and `check-report.mjs` reads only local files.
