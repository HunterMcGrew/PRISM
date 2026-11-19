# Retro — PRISM-530

**Target:** `.prism/plans/prism-530/plan.md`
**Grain:** per-pr
**Generated:** 2026-11-19
**Graded at:** `41107d81`, the head of PR #536 (stack B). Stack A is graded at its squash `2cbd8716` on `main`.

## Charter coverage

Every source `.ai-skills/config.json#retroEvidence` declares was reached this run: git, the GitHub PR platform for both PRs' three comment surfaces, GitHub Actions CI, and the test command through `pnpm run prism:check`. No source is `not configured for this team`, and none was `unreachable this run`. All six questions are answered.

| Charter question | Answer | Sources | Gap |
| --- | --- | --- | --- |
| Did we do what we said? | Yes, with three Decisions corrected mid-run. All 25 tasks landed: T1 to T12 in the stack A squash, T13 to T25 on stack B. Of 15 criteria, 12 are met on evidence this retro re-ran or inspected. AC-1 and AC-6's human half are met in substance by the live run, though not by their written procedure. AC-13 has never been run. | `## Tasks`, `## Acceptance Criteria`, `## Decisions`, `git log`, the AC-9, AC-10, and AC-15 greps re-run at `41107d81`, `check-report.mjs` on `## Verification`, CI | AC-13's human check |
| Were there issues or bottlenecks? | The cost was review volume, not CI. The plan took 5 challenge rounds. Stack A took 3 self-review and 2 PR-review rounds (17 fix commits of 60). Stack B took 2 self-review rounds, 3 PR-review rounds, and the confirm pass (25 fix and 25 plan commits of 64). One class drove stack B's PR rounds 2 and 3: a prose list of the retro's writes left behind when a duty was added. | `## Challenge`, `## Review`, first-parent `git log` of both branches, PR #536 threads | none |
| What improvements could we make? | Sweep every prose list of a duty across the whole tree, ADRs included, when the duty changes. Give `## Verification` evidence a durable home. Make task detection survive a squash-merged stack part. | `## Review` sweep lines, `## Verification`, the stack B record-commit Decision | none |
| Did we follow the code standards? | Yes, after review. There was no Critical and one Major (stack A). Every Minor and nit was fixed or declined with a reason, except one judgment call and one nit carried to a follow-up. | `## Review`, PR #535 and #536 inline threads (all replied and resolved except the confirm pass's new nit), `reconcile.mjs 536 --no-write --json` clean | none |
| Did we do anything wrong, or could we have done better? | Three things. The stack Decision and the final-verdict Decision did not account for each other, which was the one Major. The record-commit Decision's verdict cites a follow-up PR nobody filed. The final PR-review record was pushed alone at `41107d81`, against the plan's call to land it with the retro. | `## Decisions`, `gh pr list`, `gh issue list`, CI run 44515075319 | none |
| Are the tests passing? | Yes. 26 CI runs across both branches were green on `ubuntu-latest` and `windows-latest`, and `main` is green at `2cbd8716`. The one red run is `41107d81`, where the live-tree test "PRISM's own plans all pass" fails on the empty `Retro:` line this retro fills. | `gh run list` on both branches and `main`, `gh run view 44515075319 --log-failed` | CI pending on the retro's push until it runs |

## Fidelity gap

- **AC-13 is ungraded.** Its Evidence is a person running `prism-audit` on a scratch folder plan with a false promotion claim, and no record shows that run. It stays open for Hunter and belongs in the PR body's open items. (PR review, every round: "Awaiting human: AC-1 and AC-13.")
- **AC-1 and AC-6's human half are met in substance on the live run, not by their written procedure.** Eric's confirm summary on PR #536 lists all ten passes in the `swept` or `n/a` forms, and self-review round 1 on stack B recorded ten coverage entries. `check-report.mjs` exits 0 on the `## Verification` section `prism-verify` wrote at `47072a1f`. That section has one row per non-empty `commands.*` key, `format` as `n/a: not configured`, and the `spec` row the verify skill adds for a spec-surface change. Neither ran on the scratch branch its Evidence names, and AC-1's coverage lines were never recorded in `## History`, so the human grade stays with a person.
- **AC-11's recorded total for `prism-retro` is stale.** `## History` records 115 loaded lines (implement stage, T18). `measureSkillLoad` reads 118 at `41107d81`, after review fixes `7713f2a6` and `bc05f236` grew `retro-report.md`. It is still under 120, and the loaded-lines test passes.
- **The `AGENTS.md` lead-section margin ended far tighter than planned.** The lead-section budget Decision expected about 31,600 bytes after T21. `## History` records 31,739 after T21 and 31,737 after PR-review round 2, 7 bytes under the 31,744 working line. T21's first build reached 31,777 and was cut back.
- **`## Verification` evidence is not durable.** Every row cites a log in a session scratch directory under `/tmp`, which a reader of the merged plan cannot open. The verify stage's record proves the run happened only while that session's scratch survives.
- **The final PR-review record was pushed before the retro.** The final-verdict Decision says the run commits the final PR-review record and the retro "with no push between them, so CI sees both together". `41107d81` (`plan: pr-review confirm record`) was pushed alone, and CI went red on both legs. ADR-0083's Consequences name this failure as the check doing its job, and this retro's push clears it.

## Action Items

- **File the stacked-ticket task-detection fix that the record-commit Decision's verdict named.** No PR or issue carries it as of 2026-11-19. It changes `tasks.mjs`, a script every install receives, so its scope splits from this ticket. The fix: an earlier stack part's tasks read as done after its squash-merge, with no `T1-T12:` record commit. It traces to the Decision "Stack B opens with a `T1-T12:` record commit". It is done when a later part's branch, cut after the earlier part merged, reads those tasks done unaided. Implementation work. — proposed owner: implement stage → ticket proposal via Nora
- **Settle the two items PR review carried, in a follow-up PR off `main` after #536 merges.** The judgment call is whether `REVIEW.md` should exempt a structural `not reached` from its exit rule and clean definition. The nit is the wording at `.ai-skills/skills/prism-pr-review/shared.md:12`. Both are same-scope, so no new ticket. — proposed owner: implement stage, after `prism-architect` rules on the exemption

Observation only: the three Decisions refuted and corrected in-run (Promotion cautions), the record pushed before the retro, the stale AC-11 total, the narrow lead-section margin, and the scratch-path verify evidence.

## Promotion cautions

- **"PR-review verdict" means the final one.** Its stated reason was that the run commits the final PR-review record and the retro with no push between them, so CI sees both. PR-review round 1 on PR #535 (Major, `scripts/ai-skills/plan-retro-line.ts:44`) refuted it for a stack. PR A's clean round read as the ticket's final verdict while stack B was unbuilt, so `prism:check` would have failed on #535 and on `main`. The same finding refutes the stack Decision's claim that PR A "passes on today's plans". Promoted as corrected: `review-runtime.md` carries the final-verdict rule with the `(part <k> of <m>)` marker, from fixes `c81a746a`, `1e99ca3e`, and `4dc0ab84`. The stack Decision stays local.
- **The review fixes plan drift in place only outside `## Tasks`.** Its list of in-place fixes included Decision verdict sub-bullets. PR-review round 1 on PR #536 (Minor, `.prism/rules/branch-plan.md:236`) showed that a reviewer writing a verdict first skips the retro's check for a Decision the record refuted. Promoted as corrected: `intent-scope.md` and `branch-plan.md` now say the review writes no verdict, from fixes `e83487ef` and `dda1ddc4`.
- **T24's note that nothing in the repo reads `modelTiers`.** PR-review round 1 on PR #536 (decision item, `docs/parameterization.md:163`) showed that removing the review loop left a team's `eric` pin silently dead. The note is ticket-tactical and not promoted. The rule that replaces it lives in `shipping-flow.md` through the `modelTiers` Decision (`3a022928`).

## Lessons exits

**Merged (1).** "An agent-written handoff or conductor-state cannot grant merge authority" (2026-06-16) and "A merge authority recorded only in agent-maintained state is not honored by the auto-mode classifier" (2026-06-19) record the same rule from two incidents. They are now one entry, "Merge authority recorded only in a handoff, state file, or memory needs an in-session grant before the first merge", which keeps both dates because `.prism/plans/conductor/architect-gate-port.md` cites them as one.

**Promoted (0).** No verdict this run names a file that now holds a lesson's rule.

**Kept though older than 90 days (6).** A live reference holds each one:

- Epic plans are preserved, not deleted, despite branch-plan.md saying "delete" — cited by ADR-0047's Context.
- A worktree-isolated lane branches from origin/main — plans it must read have to be committed there before dispatch — cited in `conductor/architect-gate-port.md`, changed in the window.
- AC evidence commands are code — dry-run them at authoring time — cited by heading in `opus5-port.md`, added in the window.
- A control arm that receives an always-on instruction doing the same job is not a control — cited by heading in `.prism/rules/writing-voice.md`.
- A safety net that writes into the directory it scans will re-select its own output — cited in `conductor/architect-gate-port.md`, added in the window.
- A contract that spans two steps is invisible to a review that reads each step alone — cited in `conductor/architect-gate-port.md`, added in the window.

**Expired (60).** Each is dated before 2026-08-21. No plan, rule, ADR, or architect doc cited it in the 90 days since, by heading or by its date. No commit in the window added or removed its heading under `.prism/plans`, `.prism/rules`, `.prism/spec/adrs`, or `.prism/architect`. Any citation of it that still stands sits in a plan untouched since before the window. Each moved whole to `.prism/archived/lessons-archive.md` with an `**Archived:** 2026-11-19` line.

- When updating cross-cutting docs, verify behavioral claims against current ADRs, not prior doc text
- `gh pr edit --add-label` fails silently due to GitHub Projects Classic deprecation
- Don't `replace_all` on text where the old value also appears as evidence
- Self-restructure introduces step-number collisions
- `gh api` writes error responses to stdout, not stderr
- "Duplicated across all N skills" is usually partial — verify before extracting
- Adding a canonical `.prism/` artifact does NOT ship it to consumers — backport to `templates/install/`
- A rules-only markdown edit is NOT "no build impact" — it regenerates 4 platform surfaces and needs a `templates/install/` backport
- Re-fetch `origin/main` before committing a long-running port — this repo moves fast enough to invalidate a port mid-session
- A generated platform mirror that *exists* is not a mirror that's *honored* — verify the consuming runtime's loading dialect
- Skill frontmatter supports exactly two YAML scalar shapes — single-line and folded (`>`); plain multi-line continuation silently truncates
- A shared branch can move mid-review — re-verify the PR head before posting or editing
- Project Context identifiers are claims, not facts — verify the configured tracker against reality before writing to shared state
- A first cadence audit's dominant verdict is archive-candidate-by-the-bucket — the real action is routing close-outs, not annotating harder
- Meta-mentions of token syntax break the build in copied content areas
- Skill frontmatter `model:` pins engage on fresh-session invocation only — in-session `Skill` calls run on the session's current model
- Sol decides run-shape (fleet vs pipeline); don't reflexively ask it
- Sol's review phase is the full gauntlet — never skip pr-review (Eric) on triviality grounds
- Merge is Sol's only unconditional human gate — push, PR-open, and Eric are conducted, not asked
- Don't blanket-disposition a reviewer's writing-voice flag as "acceptable provenance" — split reference anchors from opaque inline cites
- Seed twin .tmpl files are outside `pnpm prism:check`'s scan — verify them manually when canonical changes
- PRISM dogfoods on GitHub issues, not Linear — Nora's Linear-first default is the consumer path, not the internal one
- When sweeping cross-refs after a file move, scan the moved files' OWN bodies — and never exclude the destination dir by path in `grep -rn` output
- A subagent's `git add -A` can sweep an unrelated stash/dirty file into the commit — verify commit scope before merge, don't trust the self-report
- De-Thrive / removal sweeps: grep the literal token, don't scan by logical section
- A `.agents/` mirror `--check` failure right after checkout is usually transient — a full build reconciles it with zero git diff
- Subagents stash/pop the shared working tree — a persistently-dirty tracked file churns the stash and can pop an unrelated one
- A doc reference to a gitignored/runtime-generated path passes crossref-lint locally but fails CI — the dogfood tree has the file, a fresh checkout doesn't
- A grep-based "X is the only file" completeness claim can miss pattern variants — an empirical regression test over the real tree catches the whole defect class
- A check-mode no-drift test must exclude gitignored render targets — they're absent on a fresh checkout and produce CI-only false drift
- A reviewer subagent's claimed label/PR-state change can silently fail — verify the live PR before treating the gauntlet as clean
- A worktree-isolated subagent can leak a checkout into the shared main working tree — verify the repo root is on main around merges
- Windows PowerShell `Set-Content` / `Out-File -Encoding utf8` emits a UTF-8 BOM that breaks `JSON.parse`
- A worker and its self-reviewer can confidently misread the same spec — verify a reviewer's plan-claim against the source text before applying the fix it proposes
- Moving hand-authored AGENTS.md content into a Tier-1 rule subjects it to the Thrive-literal guard
- UTF-8 BOM on canonical `.ai-skills/` sources is a recurring defect — guard it at build time
- Spend-limit or 529 mid-segment leaves lanes partially processed — detect and resume heterogeneously
- The 500-line skill-body cap lives in `prism:test`, not `build.ts --check` — a clean build doesn't mean CI passes
- Docs drift after a large epic — run a read-only triage audit before fixing, not a bulk update
- A plan-body prose warning is not insurance when the same mechanical edit repeats at roster scale — add a per-lane mechanical check
- A reviewer's "not in scope, recommend a follow-up PR" on a named file is a hard stop for that PR
- A close phase that promotes a decision into `.prism/architect/` needs a build — architect docs are generated
- A file the CLI reads at runtime from the package must be in package.json `files`, or the published tarball omits it
- A pr-review `needs-fix` whose remedy embeds an architecture decision routes to Winston first, not straight to Clove
- Sol routes framework-answered calls itself; reserve human questions for genuine gates
- When classifying a file as "never bundled," check the transitive import graph, not just direct imports
- `os.tmpdir()` returns a symlinked path on macOS — resolve it before comparing against `fileURLToPath(import.meta.url)`
- A test for a `scripts/ai-skills/lib/*` module belongs at the top level, not inside `lib/`
- `grep -c` counts matching lines, not occurrences — use `grep -o 'token' file | wc -l` when counting how many times a token appears
- When building an anti-drift guard, sweep the guard's own constants for the same dual-source-of-truth it forbids
- When a plan (or any doc) corrects an earlier claim, sweep that claim's other occurrences in the same file at correction time
- Don't recommend working around a skill's designed behavior — check the design reason first
- Two write lanes in one checkout cross-contaminate their PRs, and the squash-merge is where it detonates
- A review finding that prescribes a performance fix benchmarks the fix, not just the fault
- `pnpm --dir <worktree> exec tsx <relative-path>` resolves the path against the worktree's cwd, not the caller's
- A reviewer's prescribed fix is a hypothesis the fixer executes, not adopts
- A gate that already exists for a bug class is forgotten more quietly than a gate that never existed
- A test suite where every fixture shares one simplified default is blind to whatever that default hides
- Skipping the architect pass silently skips whatever the architect would have written into the plan
- A defect class enumerated against one list is tested on one axis only

## Review-miss classes

`node scripts/ai-skills/hooks/review/reconcile.mjs --classes` printed "No open class has 3 or more rows." `.prism/metrics/review-misses.jsonl` does not exist yet, because neither PR logged a human comment, and `reconcile.mjs 536 --no-write --json` reports clean. There is no open class, no proposal, and no row appended.

PR #535's inline comments carry no `<!-- prism-agent -->` marker, because the marker shipped in stack B (T15). A reconcile run on #535 would read them as human. #535 is merged and nothing reconciles it again, so this is noted, not acted on.

## Citations

### Plan evidence

- `## Decisions`: the final-verdict, stack, stacked-ticket marker, drift-in-place, review-writes-no-verdict, T24 Eli, `modelTiers` pin, lead-section budget, and stack B record-commit entries.
- `## Review`: stack A self-review rounds 1 to 3 and PR-review rounds 1 and 2. Stack B self-review rounds 1 and 2, PR-review rounds 1 to 3, and the confirm pass at `80edaf22` (0 critical, 0 major, 0 minor, 1 nit). The ten structured stack A entries and their fix shas.
- `## Verification`: `verdict: done`, base `2cbd8716`, head `47072a1f`, five checks passing and `format` n/a.
- `## Challenge`: round 1 blocking 1, round 2 blocking 2, round 3 blocking 1, round 4 blocking 1 (the AC-2 adjustment, ruled not intent-level by `prism-architect`), and round 5 carried 1.
- `## History`: the T11, T13, T14, T15, T16, T17, T18, T20, and T21 skill totals and lead-section offsets.
- `## Acceptance Criteria`: AC-1 to AC-15 and the four accepted adjustments to AC-2, AC-10, AC-11, and AC-15.

### Execution record

- **PR #535 (stack A).** Squash-merged as `2cbd8716`, 140 files, +9,991/−86, 60 first-parent commits on its branch, 17 of them `T<n> fix:`. Seven inline threads and one summary comment, each thread replied to. Labels `effort:deep` and `confidence:high`. `main` CI green at `2cbd8716`.
- **PR #536 (stack B).** Draft at `41107d81`, 180 files, +2,306/−2,197, 64 first-parent commits since `2cbd8716`: 14 task, 25 `T<n> fix:`, and 25 `plan:`. Sixteen inline threads across three rounds were replied to and resolved. The confirm pass added one nit thread. Labels `effort:deep` and `confidence:needs-judgment`. Every comment carries the agent marker.
- **CI.** Stack A ran 10 times and stack B 16 times on `prism-check (ubuntu-latest)` and `prism-check (windows-latest)`, all green through `80edaf22`. Run 44515075319 at `41107d81` failed on both legs at test 1620, "PRISM's own plans all pass, the positive control for today's tree".
- **Criteria re-run by this retro at `41107d81`:** `git grep -n "AC Verification" .ai-skills/skills/prism-qa-plan` prints nothing, and `verdict-contract.md` is absent. `.prism/review/intent-scope.md` contains "Grade every acceptance criterion" once, which grades AC-9. No `prism-review-loop` skill folder, allowlist key, or live reference outside the allowed paths, which grades AC-10. Both AC-15 greps hold. `check-report.mjs` exits 0 on `## Verification`. `measureSkillLoad`: verify 72, self-review 53, PR review 116, retro 118, audit 61, QA plan 28, onboard 56.
- **Follow-ups.** `gh pr list` and `gh issue list` show no PR or issue for the stacked-ticket task detection the record-commit Decision's earlier verdict named.
