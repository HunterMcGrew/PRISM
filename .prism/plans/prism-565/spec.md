---
title: Close step and triggered retro report
ticket: https://github.com/HunterMcGrew/PRISM/issues/565
stage: spec
status: draft
epic: prism-499
child: 13
---

Child 13 of the Kitchen Line epic (#499). The design source is `.prism/plans/prism-499/spec.md`: row 13 of its second Children table and the "Close and the retro report" part of its "Third amendment, 2026-11-26" section. The epic's approved `intent.md` covers this child through its third amendment ("Retro"), and through the Workflow line that the close step runs on every plan and the report runs on a trigger.

Two items are folded in from the issue and the coordinator. The first is the stale compaction-note sentence in `hook-runtime.md`. The second is the merge bar's missing tie between the review line and the PR head, action item 1 of `.prism/retros/prism-499/prism-553.md`.

The checked starting point is `main` at `02e9aeb0`. Children 10, 11, and 12 are merged, so the review writes `review round` lines, the plan template has no History or Sessions, and `plan-retro-line.ts` still reads the retired `pr-review` line form.

## Requirements

1. `retro-trigger.mjs <plan folder>` reads the folder's `plan.md`, prints one line per reason, and exits 0 when at least one reason holds. With none it prints nothing and exits 1. A missing `plan.md`, an unreadable file, or a malformed task list exits 2.
2. A reason is a `## Challenge` round line numbered 3 or higher, any line under `## Review` whose verdict is not exactly `clean`, or a task that carries an `amended` field. A verdict of `clean, 1 decision` is not `clean`.
3. One reader parses review record lines for every script that needs them. It accepts `review round`, and the older `self-review round` and `pr-review round` or `confirm` prefixes, each with the optional ` (part <k> of <m>)`. One copy of the challenge round-line pattern serves both `auto-approve.mjs` and `retro-trigger.mjs`.
4. On a folder plan with a `plan.md`, `prism-retro` always runs the close step and runs the report only when `retro-trigger.mjs` exits 0. An epic folder holds no `plan.md`, so its retro always runs the full-grain report.
5. The close step writes a verdict under each Decision, proposes a fix for each open review-miss class, applies the lessons exits, writes the `Retro:` line under `## PR Readiness` and the `> Closed:` line after the frontmatter, and commits as `retro: <summary>`. With no trigger it writes `Retro: none — no trigger` and creates no report file. With a trigger it writes `Retro: <report path>`.
6. A report written on a trigger names the script's reasons in its header.
7. The retro-line lint fails a live folder plan that carries a dated `> Closed:` line while its `Retro:` line is empty or absent. It also fails one whose `Retro:` value is a single token that names no file. A value with whitespace passes, so `none — no trigger` and an older prose line pass. A plan with no `> Closed:` line passes whatever its `Retro:` line holds. The lint reads no review line.
8. `merge-bar.mjs <plan.md> [--head <ref>]` exits 0 only when the plan's last review record line reads a bare `clean`, its sha is the head or an ancestor of it, and every commit after that sha is exempt. A commit is exempt when its subject begins `retro:`, or when every file it changes sits under the plan's own folder. A merge commit after the sha is never exempt. Otherwise it exits 1 and prints each failing reason, one per line. An unreadable plan, an unknown `--head`, or a repo it cannot find exits 2.
9. The merge rule in `git-conventions.md` says the bar is a bare `clean` at the PR head, checked by `merge-bar.mjs`, plus green CI on that head. It no longer says only that the line "reads `clean`".
10. `branch-plan.md` describes the close step and the triggered report for folder plans, drops the final-PR-review key from the retro-line check, and keeps the declinable gate for flat plans.
11. The resume table row for an empty `Retro:` line and `shipping-flow.md` say the close step runs, with the report only on a trigger. The retro-report template has a header line for the trigger reasons.
12. A new ADR amends ADR-0083 and ADR-0068 for the split. Both older ADRs gain an amended-by pointer, and the ADR index and `seed-curation.json` list the new one.
13. `plan-chain-scripts.md`, `review-runtime.md`, and the Iris row of `skills-ecosystem.md` describe the two new scripts, the shared reader, and the rekeyed lint. `docs/ai-skills/iris.md` and `docs/personas.md` no longer call the retro a fixed stage that always writes a report.
14. The Compaction arms section of `hook-runtime.md`, and the header of `compact-handoff.mjs`, say the post-compact note writes only scope changes and open questions into `## Decisions` on a plan folder, as the note's own text does since #564.
15. The new `.mjs` files are zero-dependency, carry the runtime marker and a `.d.mts` sidecar, and reach a consumer through `HOOK_RUNTIME_FILES`.
16. `prism-retro` stays at or under the 120-line loaded cap with no allowlist entry. `pnpm prism:check` passes, and PRISM's own plans all pass the rekeyed lint.

## Design

### Review-line reader

`review/lines.mjs` exports a function that takes plan text and returns each record line under `## Review` as `{ kind, round, sha, part, verdict }`, in file order. It reads the section through `sectionBody` in `plan/frontmatter.mjs`, so it sees the same text the other scripts see. `kind` is `round` or `confirm`, and `part` is `{ k, m }` or null. `record.mjs` writes the line and this module reads it, so the grammar lives in `REVIEW.md` and the two files agree through one test that feeds the writer's output to the reader.

`retro-trigger.mjs` and `merge-bar.mjs` both import it. `plan-retro-line.ts` no longer needs it, because the lint stops reading review lines.

### The trigger script

`plan/retro-trigger.mjs` lives beside the other plan-folder commands. It reads `plan.md` once and applies three tests:

- **Challenge.** Any `## Challenge` round line whose number is 3 or higher, in either spelling `auto-approve.mjs` accepts. The round-line pattern is exported from one place and imported by both scripts, so a change to the grammar cannot split them.
- **Review.** Any record line whose verdict is not exactly `clean`. A round that found two Majors and a later round that came back clean still triggers, because the first review asked for changes. A capped review ends in a non-clean line and triggers too.
- **Amended.** Any task for which `parseTasks` returns a non-empty `amended` list.

Each reason prints on its own line, naming the test and the entry, such as `challenge: round 3`, `review: <the record line>`, or `amended: T4`. The exit codes follow the plan-chain convention in `plan-chain-scripts.md`: 0 when the condition holds, 1 when it does not, 2 on a usage or config error.

### The skill split

The `prism-retro` flow on a folder plan becomes: resolve the target, run the trigger script, then the close step. When the script exits 0 the skill also runs the charter, reads the evidence, and writes the report, and the close step then follows. When it exits 1 the skill skips both and goes straight to the close step. An exit 2 stops the run and reports the message, as any chain script does.

The close step is the writer duties that exist today, minus the dependence on a report:

- **Verdicts** follow the verdict gate in `branch-plan.md`. A Decision the record refuted is promoted as corrected or demoted to a lesson, which can only happen when a report ran, so that clause applies to a report run only.
- **Review-miss classes** stay in the close step, not the report. A class opens when three human catches share a label across tickets, and those tickets can each have reviewed clean, so no trigger would ever fire for it.
- **Lessons exits**, the **`Retro:` and `> Closed:` lines**, and the **commit** are as today. The commit names the report path only when one exists.

Epic grain is unchanged. The epic's retro appends `## Retro` to its `spec.md` after every child has merged and always writes the full-grain report, because an epic has no challenge, review, or task lines of its own to key a trigger on. The retro-report template gains one header line, `**Trigger:**`, holding the script's output, so a reader of a report can tell why it exists.

The skill is edited to cut as much as it adds. It stays under the loaded-line cap by removing text, not by moving it into a cited file, per `skill-authoring.md`.

### The rekeyed lint

`plan-retro-line.ts` keeps its entry point, its `prism:retro-line` script name, and its choice of files: live folder plans only, with epic folders, flat plans, and `.prism/archived/` skipped. Three things change.

- **The key.** A plan is checked when it holds a `> Closed: <date>` line before its first `##` heading. The previous key, a final `pr-review` verdict, and its line pattern and stacked-part handling are deleted.
- **The empty check.** The `Retro:` line under `## PR Readiness` must hold a value. This is today's rule, applied under the new key.
- **The path check.** A value with no whitespace, after backticks are stripped, is read as a path from the repo root and must name a regular file. A value with whitespace is not read as a path, which lets `none — no trigger` and the prose lines on the older plans pass.

The lint cannot tell whether a `none — no trigger` line is true, and it cannot see a retro that never ran. The resume table drives the stage, as the epic spec records. The existing repo-wide positive control stays: every plan under `.prism/plans/` passes.

### The merge bar

The retro of PRISM-553 found a `clean` line recorded at an earlier sha while three source-changing commits landed after it, and the merge rule only asked that the last line read `clean`. `review/merge-bar.mjs` makes the check mechanical.

It reads the plan's last record line with the shared reader and applies four tests in order, printing every failing reason:

- **Line present.** At least one record line exists.
- **Bare clean.** The verdict is exactly `clean`, which also closes the gap between `git-conventions.md` saying "reads `clean`" and `REVIEW.md` saying only a bare `clean` counts.
- **Sha reachable.** The line's short sha resolves to a commit that is the head or an ancestor of it. A rebase that dropped the commit fails here, with a reason that says to run another round.
- **Commits after it are exempt.** For each commit between the sha and the head, the commit passes when its subject begins `retro:` or when every file it changes sits under the plan's folder. Any other commit fails and is named. A merge commit fails without looking at its files.

The `retro:` exemption exists because the close step runs after the final review and commits promotions into rules and architect docs, the retro report, the lessons file, and the misses log. Those are the retro's writes and the review never reads them as code. The plan-folder exemption covers `plan:` commits and verify re-runs. The subject is a convention and not a wall, since the commit gate does not judge subjects, so the exemption trusts the commit script that writes `retro:` commits.

`--head` defaults to `HEAD`. The session passes the PR's head sha from `gh pr view`, so a local branch behind the PR cannot pass. The script reads only local git and the plan, runs `git` through argument arrays with no shell, and finds the repo root by walking up to `.git`, as `record.mjs` does.

`git-conventions.md` names the script in the main-session merge sentence. A flat plan has no `## Review` section, so the sentence stays as written for it.

### Docs and text that change with the behavior

- **`branch-plan.md`.** The reflect-and-close paragraph, the universal-gate paragraph, and the verdict-gate note each say a folder plan's retro is a fixed stage that fails the lint once a final review is recorded. They become: the close step always runs, the report runs on a trigger, `Retro: none — no trigger` is a valid value, and the lint keys on `> Closed:`.
- **`workflow.md` and `shipping-flow.md`.** The resume row keeps its key, an empty `Retro:` line, and its action becomes the close step plus the report when triggered. Shipping-flow's retro mentions say the same.
- **Architect docs.** `plan-chain-scripts.md` lists `retro-trigger` among the commands and the shared reader among the modules. `review-runtime.md` rewrites its retro-line section for the new key, and adds `lines.mjs` and `merge-bar.mjs` with their exit codes and the exemption rule. The Iris row in `skills-ecosystem.md` says the close step always runs and the report runs on a trigger.
- **Compaction text.** The second bullet of the Compaction arms section and the sentence after the plan-path paragraph in `hook-runtime.md` say the note writes the summary's unrecorded decisions into `## Decisions`, adds a `## History` line on a flat plan, and on a plan folder writes only scope changes and open questions, since a routine implementation choice already lives in a commit. The header of `compact-handoff.mjs` says the same in its two matching sentences. No behavior changes, because the note's own text already limits a plan folder.
- **User docs.** `docs/ai-skills/iris.md` and `docs/personas.md` carry the older sentence that Iris always runs and writes the report.
- **The ADR.** It records the split, and the alternatives that lost: keeping the retro a fixed full report on every plan, which the intent's trigger replaces, and making the close step also optional, which would reopen the silent-skip hole ADR-0083 closed.

### Delivery

The work spans scripts, checks, rules, docs, and an ADR, so the plan stage should cut it as a two-PR stack, as child 10's row allows. The first PR holds the shared reader, `retro-trigger.mjs`, `merge-bar.mjs`, the rekeyed lint, their tests, the delivery list, and the architect-doc entries for them. It leaves the skill and the always-on rules as they are, so the old retro still works and the rekeyed lint passes the plans it already passes. The second PR holds the skill split, the template line, the rule and reference text, the ADR, the user docs, and the compaction text.

## Affected systems

```text
.ai-skills/skills/prism-retro/**
.ai-skills/definitions/seed-curation.json
.prism/templates/retro-report.md
.prism/rules/branch-plan.md
.prism/rules/workflow.md
.prism/rules/git-conventions.md
.prism/references/shipping-flow.md
.prism/architect/_toolkit/plan-chain-scripts.md
.prism/architect/_toolkit/review-runtime.md
.prism/architect/_toolkit/skills-ecosystem.md
.prism/architect/_toolkit/hook-runtime.md
.prism/spec/adrs/_toolkit/**
.prism/plans/prism-565/**
scripts/ai-skills/plan-retro-line.ts
scripts/ai-skills/plan-retro-line.test.ts
scripts/ai-skills/plan-retro-trigger.test.ts
scripts/ai-skills/review-lines.test.ts
scripts/ai-skills/review-merge-bar.test.ts
scripts/ai-skills/plan-runtime-delivery.test.ts
scripts/ai-skills/update.ts
scripts/ai-skills/hooks/plan/retro-trigger.mjs
scripts/ai-skills/hooks/plan/retro-trigger.d.mts
scripts/ai-skills/hooks/plan/auto-approve.mjs
scripts/ai-skills/hooks/plan/auto-approve.d.mts
scripts/ai-skills/hooks/review/lines.mjs
scripts/ai-skills/hooks/review/lines.d.mts
scripts/ai-skills/hooks/review/merge-bar.mjs
scripts/ai-skills/hooks/review/merge-bar.d.mts
scripts/ai-skills/hooks/compact-handoff.mjs
docs/ai-skills/iris.md
docs/personas.md
templates/install/**
AGENTS.md
CLAUDE.md
.claude/**
.codex/**
.cursor/**
```

`templates/install/**` holds the seed copies `pnpm prism:build` mirrors from the rules, references, architect docs, and templates above. `AGENTS.md`, `CLAUDE.md`, and the three host directories are regenerated by the same build, because they inline the always-on rules and carry the skill and agent output.

## Decisions

- **Review-miss classes stay in the close step.** The epic spec lists the close step as verdicts, the two lines, and the lessons exits, and puts the class read in the retro's description. A class opens on repeated human catches across tickets, and each of those tickets can review clean and never fire the trigger, so a class read tied to the report would never run for the case it exists to catch. This follows from the approved outcome, a run that fixes recurring misses without a person starting it. Rejected: leaving it in the report, for that reason.
  - → promoted to ADR-0089 (its Consequences say review-miss classes stay in the close step, and the skill's close step item 2 runs them)
- **The merge bar exempts `retro:` commits and plan-folder commits, and nothing else.** Action item 1 of the PRISM-553 retro asked for "only plan-folder files" after the reviewed sha. The close step commits rule and architect-doc promotions after the final review on most tickets, so a plan-folder-only rule would fail the bar after the retro. Rejected: plan-folder-only, for that reason. Rejected: exempting any path the review ignores, because PRISM's own config keeps its rules and skills reviewable.
  - → promoted to .prism/architect/_toolkit/review-runtime.md (the "What is exempt" part of review-runtime.md; promoted as corrected, since the shipped bar also exempts a commit that changes no files, which "and nothing else" leaves out)
- **The merge-bar check is a script, not a new lint.** The lint runs in CI and sees no PR head, since the plan is committed on the branch and the head moves with every push. The session needs the answer at merge time with the head in hand. Rejected: folding the sha check into `plan-retro-line.ts`, as the retro suggested, for that reason.
  - → promoted to .prism/architect/_toolkit/review-runtime.md (the "Why a script and not a lint" part of review-runtime.md)
- **No ADR for the merge-bar tie.** It adds a condition to the bar that ADR-0078 and ADR-0087 set, and it reverses nothing in them. `git-conventions.md` and `review-runtime.md` carry the rule. The plan stage applies the triple-gated criterion in `.prism/references/triple-gated-adr-criterion.md` to confirm.
  - → no promotion needed (the call is to write no ADR; the rule lives in `git-conventions.md` and the review/merge-bar.mjs part of `review-runtime.md`, and the plan's Decision records the confirmation)
- **`docs/parameterization.md` is left for child 16.** Its `mainSessionMayMerge` paragraph still names the `review:has-minors` label that child 10 retired, so it is stale for a reason this child did not cause, and child 16's docs sweep covers the pages the earlier children changed.
  - → no promotion needed (an ordering call between children; `docs/parameterization.md` still names `has-minors` at lines 140 and 156, and epic row 16 owns the page)
- **The lint does not check that `none — no trigger` is true.** A cross-check against `retro-trigger.mjs` would catch a close step that wrote `none` while a trigger held. It is a larger change to a check the issue scopes to two conditions, so it is a candidate follow-up and not part of this child.
  - → promoted to .prism/architect/_toolkit/review-runtime.md (the "What it can't see" part of the retro-line check in review-runtime.md, and ADR-0089's Consequences)
- **A merge commit after the reviewed sha fails the merge bar.** Hunter agreed on 2026-11-27. The reason tells the session to run another review round. A clean refresh of a long branch from `main` then costs a round. The check cannot cheaply tell a clean merge from one whose conflict resolution changed code.
  - → promoted to .prism/architect/_toolkit/review-runtime.md (the "A merge commit after the sha always fails" part of review-runtime.md)
- **An epic's retro always writes the full-grain report.** Hunter agreed on 2026-11-27. It runs on no trigger, because an epic folder has no challenge, review, or amended-task lines to read. The close step, which cannot be declined, runs either way.
  - → promoted to .prism/architect/_toolkit/skills-ecosystem.md (the Iris row: "An epic folder always gets the full-grain report")
