---
title: Small size
ticket: https://github.com/HunterMcGrew/PRISM/issues/568
stage: spec
status: draft
epic: prism-499
child: 14
---

Child 14 of the Kitchen Line epic (#499). The design source is `.prism/plans/prism-499/spec.md`: row 14 of its second Children table and the "Small size" part of its "Third amendment, 2026-11-26" section. The epic's approved `intent.md` covers this child through its third amendment ("Sizes") and the Workflow lines that define small.

The checked starting point is `main` at `1b3904cd`. Children 10 to 13 are merged, so the review writes `review round` lines, `review/record.mjs` and `verify/record.mjs` write their records by script, the plan template has no History or Sessions, `retro-trigger.mjs` and `review/merge-bar.mjs` exist, and `approve.mjs` already checks the intent's Approach lines. `approve.mjs` accepts only `standard` and `epic` today, and no `size.mjs`, `plan-small.md`, or size check in the commit gate exists.

## Requirements

1. `size.mjs <base>` reads the diff against the merge base of `<base>` and `HEAD`, plus the working tree, prints `small` or `standard`, and prints one reason line for each limit that is over. It exits 0 for `small`, 1 for `standard`, and 2 on a usage error, an unknown `<base>`, a repo it cannot find, or a config it cannot read. `--tree <treeish>` measures the merge base against that tree instead of the working tree.
2. A changed file is product code unless it is a test (`testGlobs`), a doc (under `documentation.location` in the config, or any `.md` file), a plan (`.prism/plans/**`), a lockfile, or a config file (`*.json`, `*.yml`, `*.yaml`, `*.toml`). The script adds no config key and reads only `stopPaths`, `testGlobs`, and `documentation.location`.
3. A diff is `small` only when all four hold: at most 100 changed product lines, at most one new product file, every product file in one area, and no changed file on a stop path. A file's area is its directory cut to its first two segments. A stop-path file counts whatever its class, so a manifest edit is never small.
4. `plan-small.md` is a fifth template in `.prism/templates/`. Its headings are Verification, Review, and PR Readiness, with the `Retro:` line under the last. It has no Tasks section, so `parseTasks` returns no task for it, and it passes the plan-folder citation lint.
5. `approve.mjs` accepts `size: small` in a non-epic folder when the Design line opens with `not needed`, and refuses a small intent in an `epic-*/` folder or with a Design line of `needed` or `supplement`. When it approves a small intent it also writes `plan.md` from `plan-small.md` with the title and ticket copied from the intent and the intent's approval lines stamped, so the file reads `status: approved`. It refuses before writing anything when the template is missing. It leaves an existing `plan.md` alone on a re-approval.
6. The intent template names `small` in its `size:` comment, and `prism-intent` proposes `size: small` with its reason when the work is code only and its expected diff fits the limits in requirement 3. The size is the person's to approve, as it is today.
7. On a small ticket, the implement stage builds in the session with no bundle and no build report, runs `size.mjs` before each commit, and commits as `<ticketPrefix>-<digits>: <summary>` through `plan/commit.mjs`. When the script reports `standard`, the stage stops and the ticket goes on as a standard one (Design, Outgrowing).
8. The commit gate denies a commit when the branch's intent says `size: small` and the would-be tree, measured against the merge base with `origin/<defaultBranch>`, reports `standard`. The deny names the script's reasons and one remedy. The gate reads `size:` from the intent in the would-be tree, so the commit that sets `size: standard` passes even when the tree is over the limits. A branch whose intent does not say `small`, and a branch whose default-branch ref cannot be resolved, are unaffected. A config the gate cannot read keeps the existing config deny.
9. On a branch whose intent says `size: small`, the weakened-tests deny names going on as a standard ticket as its remedy, because the plan holds no task that could carry `behavior change:`.
10. The size arm has a three-leg test: an outgrown commit is denied, the same commit passes once the seeded intent says `size: standard`, and the spawned gate passes the remedy commit for a diff that fits.
11. The resume table names the sizes each row applies to. The spec row reads `standard or epic`, the plan, challenge, plan-approval, and task rows read `standard`, and the rows from verify on read `small or standard`. A small ticket has one row of its own, an approved intent with no ticket-subject commit after it, which runs implement.
12. `workflow.md` states the small size and its flow, and the small commit subject. `git-conventions.md` gives the small subject form. `ticket-workflows.md` and `docs/workflow.md` list three sizes in place of two.
13. On a plan copied from `plan-small.md`, `verify/record.mjs`, `review/record.mjs`, `retro-trigger.mjs`, `merge-bar.mjs`, and `plan-retro-line.ts` each run without error, and `retro-trigger.mjs` exits 1 when every review line reads `clean`.
14. `size.mjs` is a zero-dependency `.mjs` with the runtime marker and a `.d.mts` sidecar, and `HOOK_RUNTIME_FILES` delivers it.
15. `plan-chain-scripts.md` describes `size.mjs`, `plan-small.md`, and the copy in `approve.mjs`. `hook-runtime.md` describes the commit gate's size check and its place in the order.
16. `prism-intent` stays at or under the 120-line loaded cap with no allowlist entry, and `pnpm prism:check` passes.

## Design

### The measurement

`plan/size.mjs` exports a pure classifier and a reader, and the CLI joins them. The classifier takes the changed files, each with its status, added lines, and deleted lines, plus `testGlobs`, the stop paths, and the docs root, and returns `{ size, reasons }`. The reader runs `git diff --numstat -M -z` from the merge base, to the working tree or to a given tree, and lists untracked files that git does not ignore as new files with their line counts. Every git call is an argument array with no shell, as `commit.mjs` and `merge-bar.mjs` do.

Reasons read one per limit, such as `lines: 120 changed product lines, limit 100`, `new files: 2 new product files, limit 1`, `areas: product files in 2 areas (scripts, src/app)`, and `stop path: package.json`. A product file git reports as binary has no line count, so it adds a `lines:` reason of its own, because an unknown size cannot be called small. A rename counts as a file and is not new.

The area is the file's directory cut to its first two segments, so `scripts/x.ts` and `scripts/ai-skills/y.ts` are different areas, and a file at the repo root has the area `.`. Test, doc, plan, lockfile, and config files fall out before any limit is read, except that a stop path counts first. The default `stopPaths.dependency` list already holds the common lockfiles, so a lockfile edit is `standard` by default, and a team that sets its own list decides otherwise.

### The commit gate arm

`checks.mjs` gains a `SIZE_CHECK` beside `CONFIG_CHECK` and `STOPS_CHECK`, and `commit-gate.mjs` runs it second, after config and before the weakened-tests check. It runs only when `loadContext` found a plan folder and the `intent.md` in the would-be tree has frontmatter that says `size: small`. It reads the intent from the tree, not the working copy, so the commit that sets `size: standard` is judged as a standard branch's. It builds the classifier input from the would-be index the gate already makes (`index.treeHash`) against the merge base of `HEAD` and `origin/<defaultBranch>`, and reads the same config values the other checks read. A branch with no such base skips the check, and any error inside it passes, as the rest of the gate does.

The deny reads: the branch's intent says `size: small`, the commit would take the diff past the small limits, then the script's reasons. The remedy is one action: stop, set `size: standard` in `intent.md`, and ask the person for a fresh `approve`. This also keeps the remedy from deadlocking: a branch that got over the limits without passing the gate, such as through a merge, can still commit the intent change that resizes it.

The size check comes before the stop-path half of the stops check, so a manifest edit on a small branch gets the size message and its remedy, where the stops check would ask for a task that does not exist. A removed test line is not a size matter, so the weakened-tests check still denies it. It reads the plan's tasks, finds none, and today names a task in its remedy. It takes the standard-ticket remedy when the intent says small.

### The small plan and its approval

`plan-small.md` holds Verification, Review, and PR Readiness. `approve.mjs` finds the repo root from the intent's path, reads `<root>/.prism/templates/plan-small.md`, fills the frontmatter, and writes `plan.md` beside the intent in the same run that stamps the intent. It writes through the filesystem, so the approve guard's frontmatter arm never sees it, as with `auto-approve.mjs`. Verification and Review each have one writer, `verify/record.mjs` and `review/record.mjs`, and neither needs a Tasks section. `prism-intent` commits the stamp with both paths, as `plan: approve intent`.

A small plan has no Decisions heading. A scope change that follows from the approved outcome, or an open question, goes in a `## Decisions` section the session adds, which an approved plan keeps its approval through, and the close step gives each entry a verdict. A scope change beyond that is not small, and goes to Outgrowing.

### Flow on a small ticket

Intent, implement, verify, review, draft PR, close. The implement stage is `prism-implement` run in the session, because a small ticket has no bundle to dispatch. It builds test-first per `tdd`, runs `size.mjs <base>` with the default branch as `<base>` before each commit, and commits through `plan/commit.mjs` with a ticket-subject. The stage returns no build report, because the session is the one reading it. Verify and review read the intent's acceptance criteria and the diff, as the review skill already does for a folder with an intent, and there is no task list for either to read.

### Outgrowing

The implement stage stops on a `standard` report, and the commit gate stops a commit the stage missed. The ticket goes on as a standard one. The session sets `size: standard` in `intent.md` and asks once for `approve`. On approval it commits the intent and removes the small `plan.md` with `git rm`, both in `plan:` commits, so the resume table's `standard, no plan.md` row applies. The spec stage runs next, per the spec row, and then the plan stage writes a full `plan.md` from `.prism/templates/plan.md`. The uncommitted work stays in the tree, and the plan's tasks commit it under task subjects.

The small `plan.md` is removed, not edited, because it is approved, and the approve guard denies an edit that changes a chain file's approval lines. Whether the guard also denies the removal is the plan stage's first check, with `git rm` run against the guard in a test.

### Resume rows

The rows keep their order. The spec row opens with `standard or epic`, since a small ticket has no spec. The plan, challenge, plan-approval, and task rows read `standard`. The small row reads `small, no ticket-subject commit since the approving commit` and runs implement. Verify, review, PR, and retro read `small or standard`. The Design row cannot match a small ticket, because requirement 5 refuses a small intent with a Design line other than `not needed`.

### Delivery

The work spans scripts, a template, skills, rules, architect docs, and generated copies, well over ten files, so the plan stage should cut it as a two-PR stack, as child 13 did. The first PR holds `size.mjs`, its tests, the commit gate's size arm and its tests, the delivery list, and the two architect-doc entries. No intent can say `size: small` until `approve.mjs` accepts it, so the arm is dormant and the first PR leaves every stage as it is. The second PR holds `plan-small.md`, the copy in `approve.mjs`, the intent template and stage, the implement text, the resume rows and workflow text, the git-conventions sentence, the docs, and the regenerated copies.

## Affected systems

```text
.ai-skills/skills/prism-intent/**
.ai-skills/skills/prism-implement/**
.prism/templates/plan-small.md
.prism/templates/intent.md
.prism/rules/workflow.md
.prism/rules/git-conventions.md
.prism/architect/_toolkit/plan-chain-scripts.md
.prism/architect/_toolkit/hook-runtime.md
.prism/architect/_toolkit/ticket-workflows.md
.prism/plans/prism-568/**
scripts/ai-skills/hooks/plan/size.mjs
scripts/ai-skills/hooks/plan/size.d.mts
scripts/ai-skills/hooks/plan/approve.mjs
scripts/ai-skills/hooks/plan/approve.d.mts
scripts/ai-skills/hooks/commit-gate.mjs
scripts/ai-skills/hooks/commit-gate/checks.mjs
scripts/ai-skills/hooks/commit-gate/checks.d.mts
scripts/ai-skills/hooks/commit-gate/test-guard.mjs
scripts/ai-skills/hooks/commit-gate/test-guard.d.mts
scripts/ai-skills/update.ts
scripts/ai-skills/plan-size.test.ts
scripts/ai-skills/commit-gate-size.test.ts
scripts/ai-skills/commit-gate-checks.test.ts
scripts/ai-skills/commit-gate-test-guard.test.ts
scripts/ai-skills/plan-approve.test.ts
scripts/ai-skills/plan-templates.test.ts
scripts/ai-skills/plan-runtime-delivery.test.ts
docs/workflow.md
templates/install/**
AGENTS.md
CLAUDE.md
.claude/**
.codex/**
.cursor/**
```

`templates/install/**` holds the seed copies `pnpm prism:build` mirrors from the rules, architect docs, and templates above, and `AGENTS.md`, `CLAUDE.md`, and the three host directories are regenerated by the same build, because they inline the always-on rules and carry the skill and agent output.

## Decisions

- **OPEN — TBD, needs Hunter input.** Whether "changed lines" in the 100-line limit counts a modified line once or twice. The intent says "100 or fewer changed lines of product code" and does not say. Counting added plus deleted, as `git diff --numstat` reports, makes a rewrite of 60 lines read as 120 and `standard`. Counting the larger of added and deleted per file reads it as 60 and `small`, and lets a bigger rewrite through. **Default path (used until resolved):** added plus deleted, the stricter count, because a ticket that is wrongly `standard` costs a spec and a plan, and one that is wrongly `small` skips both. A change to the other count is one line in `size.mjs` and its tests.
- **A small ticket keeps no Decisions section in its template.** The epic's Third amendment lists Verification, Review, and PR Readiness, and a scope change that big is not small. A Decisions section the session adds on need serves the rare case without a heading every small plan carries empty. Rejected: shipping the heading in `plan-small.md`, which adds a section the epic row does not name.
- **A small ticket needs Design `not needed`.** The small flow has no design stage, so a `needed` or `supplement` line would never run one. The approval script refuses it. Rejected: ignoring the line, which approves an intent whose own Design promise nothing keeps.
- **An outgrown small ticket removes its `plan.md` and restarts as standard.** The record file the small ticket carried holds no tasks, so it cannot become a standard plan by editing, and the approve guard denies an edit that changes its approval lines. Removing it makes the standard resume rows fire without a new row. Considered: a resume row keyed on a `plan.md` with no Tasks heading. Rejected, because it keeps a second plan shape alive for one transition. The verify and review records of the abandoned attempt describe a smaller tree, so nothing is lost by dropping them.
- **The size check runs second in the commit gate.** Its reasons name the real cause on an outgrown branch, where the stops check would ask for a task that does not exist. Considered: running it last. Rejected, for the misleading stop-path message.
- **The merge base is measured against `origin/<defaultBranch>`, and a branch stacked on another feature branch reads as standard.** The parent's lines count as this branch's. A small ticket is one commit range off the default branch, so a stack is not small. A branch with no such ref skips the gate arm and exits 2 from the CLI, because a guess at the base would approve or deny on the wrong range.
- **The small resume row keys on a ticket-subject commit.** A small branch holds only `plan:` commits and ticket-subject commits, so one ticket-subject commit means the build started. The ticket form is the one `tasks.mjs` already reads from `ticketPrefix`, so no new parser is needed.
- **No ADR for the small size.** The epic spec's Decisions record the size's removal and its return, and the arm reverses by deleting one check and one script. This spec did not search the ADRs for a ruling on sizes, so the plan stage does that and applies `.prism/references/triple-gated-adr-criterion.md` before it confirms there is nothing to write.
- **`docs/what-prism-writes.md` and the stale stage list in `docs/workflow.md` are left for child 16.** The inventory page lists delivered runtime files and the stage list still names the retired reviewer. Child 16's sweep covers the pages the earlier children changed. This child edits only the Sizes paragraph of `docs/workflow.md`. Epic row 16 does not name either page, so the closing summary asks for the row to be extended.
