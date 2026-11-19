---
name: prism-verify
description: >
  The verify stage. Run as a subagent after the build: it runs every automated
  check the repo configures against the committed head, once per head, and
  records the results under `## Verification` in plan.md. It fixes nothing and
  grades no acceptance criterion. Dispatched by the workflow, never routed off a
  phrase.
argument-hint: "[plan folder path]"
---

<!-- AUTO-GENERATED FILE. DO NOT EDIT DIRECTLY. -->
<!-- Source: .ai-skills/skills/prism-verify -->
<!-- Target: cursor | Regenerate with: pnpm prism:build -->

Run every automated check the repo configures, once per head, after the build, and record the results in `plan.md`. You run as a subagent in a fresh context, so the report describes the committed tree and not what the build session believes it did.

You never edit source and never fix a failure. You report it, and the build stage fixes it. You grade no acceptance criterion either, because the review stage owns that and reads this report as the branch half of its comparison against `main`.

## The run, in order

1. Read the brief: the plan folder and an optional base ref. The base is `origin/main` unless the brief names another.
2. Read `plan.md` in full. When `## Verification` already holds a result, this is a re-run, so follow Re-running in place of steps 3 to 5.
3. Run every check below, with each one's output in its own log file outside the repo.
4. Write `## Verification`, run the checker, and fix your own section until it passes.
5. Commit `plan.md` and return the report.

## Checks

Read `commands` in `.ai-skills/config.json`. Each key with a non-empty value is one check, named by its key. `typecheck`, `lint`, `test`, `build`, and `format` are the usual keys, and any other key with a value is a check the team added, run the same way. A key that is empty or absent still gets a row reading `n/a: not configured`, so the report shows it was considered.

Add a `spec` row when a changed path sits on the spec surface that `REVIEW.md` names for the docs pass. Its check is `pnpm prism:check` when `scripts/ai-skills/` exists at the repo root, which means this is the toolkit's own repo, and `npx @huntermcgrew/prism doctor` otherwise. The other checks read code, and this one reads the rules, skills, and docs the code checks never open.

Run each command once and record that result. Rerunning a failure until it passes hides a flake that CI will hit. Never write `n/a` to step around a check that fails or cannot start, because `n/a` is for a check the repo does not configure, and a check that could not run is `blocked`.

## Writing the section

Replace everything between the `## Verification` heading and the next `## ` heading, and touch no other section or frontmatter. The shape is fixed, because `check-report.mjs` parses it:

```md
## Verification

verdict: done
base: <base sha>
head: <HEAD sha>

| check | result | evidence |
| --- | --- | --- |
| typecheck | fail | <log path> |
| lint | pass | <log path> |
| format | n/a: not configured | none |

### Failures

- typecheck: scripts/lib/parse.ts:42
```

- **`result`** is exactly `pass`, `fail`, or `n/a: <reason>`. **`evidence`** is the check's log path.
- **Failures** holds one `- <check>: <path>[:<line>]` line per failing file, where the path is the repo-relative file the output blames. When it names none, use the file that defines the command. With no failures the section says `- none`.
- **`verdict: done`** means every configured check ran, whatever its result. **`verdict: blocked`** means at least one could not run. Its row reads `n/a: blocked`, and a `blocked: <check>: <why>` line under the verdict names it, one per check.

Then run `node scripts/ai-skills/hooks/verify/check-report.mjs <plan.md>` and fix your own section until it exits 0. A `blocked` verdict exits 1 on purpose, so a run that could not finish never passes, and for that case a clean report of the other rows is enough.

## Re-running after a later commit

A commit made after the section was written, such as a review fix, can change what a check covers. Re-check only what it could have changed:

1. Take `head:` from the section. The changed files are `git diff --name-only <recorded head>...HEAD`.
2. Run the checks those files reach and rewrite their rows and their Failures and `blocked:` lines. A commit that touches only the plan folder reaches no check, any other source change reaches every configured check, and a change on the spec surface reaches `spec`.
3. Every other row keeps its result and evidence. The verdict reads across all rows, `base:` keeps its value, and `head:` becomes the current HEAD.

When no changed file reaches a check, run nothing and update only `head:`, so the section still names the head it describes.

## Commit and report

Commit with `node scripts/ai-skills/hooks/plan/commit.mjs "plan: record verification" <plan.md>`. The only file this run commits is `plan.md`.

Report to the session in about ten lines: the verdict, the base and head SHAs, each Failures line, each `blocked:` line, the commit SHA, and on a re-run which checks ran and which rows carried over.

## Definition of Done

- [ ] Every configured check has a row, and every unconfigured one reads `n/a: not configured`
- [ ] Every `fail` row has a Failures line with a repo-relative path
- [ ] The verdict matches the rows, and each blocked check has a `blocked:` line
- [ ] On a re-run, only the checks the changed files reach ran, and `head:` names the current HEAD
- [ ] No source file changed, and the only commit touches `plan.md`

<!-- Optional Cursor-only additions. Keep this file empty when not needed. -->
