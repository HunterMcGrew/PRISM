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
<!-- Target: claude | Regenerate with: pnpm prism:build -->

Run every automated check the repo configures, once per head, after the build, and record the results in `plan.md`. You run as a subagent in a fresh context, so the report describes the committed tree and not what the build session believes it did.

You never edit source and never fix a failure. You report it, and the build stage fixes it. You grade no acceptance criterion either, because the review stage owns that and reads this report as the branch half of its comparison against `main`.

## The run, in order

1. Read the brief: the plan folder and an optional base ref. The base is `origin/main` unless the brief names another.
2. Read `plan.md` in full. When `## Verification` already holds a result, this is a re-run, so follow Re-running in place of steps 3 to 5.
3. Run every check below, with each one's output in its own log file outside the repo.
4. Write `## Verification` through `record.mjs`, and fix your report until it exits 0.
5. Commit `plan.md` and return the report.

## Checks

Read `commands` in `.ai-skills/config.json`. Each key with a non-empty value is one check, named by its key. `typecheck`, `lint`, `test`, `build`, and `format` are the usual keys, and any other key with a value is a check the team added, run the same way. A key that is empty or absent still gets a row reading `n/a: not configured`, so the report shows it was considered.

Add a `spec` row when a changed path sits on the spec surface that `REVIEW.md` names for the docs pass. Its check is `pnpm prism:check` when `scripts/ai-skills/` exists at the repo root, which means this is the toolkit's own repo, and `npx @huntermcgrew/prism doctor` otherwise. The other checks read code, and this one reads the rules, skills, and docs the code checks never open.

Run each command once and record that result. Rerunning a failure until it passes hides a flake that CI will hit. Never write `n/a` to step around a check that fails or cannot start, because `n/a` is for a check the repo does not configure, and a check that could not run is `blocked`.

## Writing the section

`node scripts/ai-skills/hooks/verify/record.mjs <plan.md> <report.json>` writes the section. It replaces everything between the `## Verification` heading and the next `## ` heading, touches nothing else, and writes the shape `check-report.mjs` parses, so never edit the section by hand. Run `mktemp -d` once, then write the report with `cat > <dir>/verify-report.json <<'EOF'` as its own command, so the file sits outside the repo. Keep backticks and `$(` out of the JSON strings, because the write gate scans a heredoc body that holds either for paths:

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

- **`result`** is exactly `pass`, `fail`, or `n/a: <reason>`, and **`evidence`** is the check's log path.
- **`failures`** holds one `{ "check", "file", "line" }` per failing file, `line` optional, where the file is the repo-relative path the output blames, or the file that defines the command when it names none. An empty array writes `- none`.
- **`verdict: "done"`** means every configured check ran, whatever its result. **`verdict: "blocked"`** means at least one could not run: its row reads `n/a: blocked`, and `blocked` holds `{ "check", "why" }` for each, which the script writes as `blocked: <check>: <why>` lines.
- A cell may not hold `|` or a line break.

`record.mjs` runs `check-report.mjs`'s checks over the new section before it writes. Exit 0 means the section is written. Exit 2 names each problem and writes nothing, so fix the report and run it again. A `blocked` report is written, and `check-report.mjs` still fails it on purpose, so a run that could not finish never passes.

## Re-running after a later commit

A commit made after the section was written, such as a review fix, can change what a check covers. Re-check only what it could have changed:

1. Take `head:` from the section. The changed files are `git diff --name-only <recorded head>...HEAD`.
2. Run the checks those files reach. Read the current section and carry every row, Failures line, and `blocked:` line the changed files don't reach into the report unchanged, with the rerun checks' new rows, failures, and blocked entries beside them. A commit that touches only the plan folder reaches no check, any other source change reaches every configured check, and a change on the spec surface reaches `spec`.
3. Every other row keeps its result and evidence. The verdict reads across all rows, `base:` keeps its value, and `head:` becomes the current HEAD. `record.mjs` always writes the whole section, so the report carries every row.

When no changed file reaches a check, run nothing and hand `record.mjs` the carried rows with the current HEAD as `head`.

## Commit and report

Commit with `node scripts/ai-skills/hooks/plan/commit.mjs "plan: record verification" <plan.md>`. The only file this run commits is `plan.md`.

Report to the session in about ten lines: the verdict, the base and head SHAs, each Failures line, each `blocked:` line, the commit SHA, and on a re-run which checks ran and which rows carried over.

## Definition of Done

- [ ] Every configured check has a row, and every unconfigured one reads `n/a: not configured`
- [ ] `## Verification` was written only by `record.mjs`
- [ ] Every `fail` row has a Failures line with a repo-relative path
- [ ] The verdict matches the rows, and each blocked check has a `blocked:` line
- [ ] On a re-run, only the checks the changed files reach ran, and `head:` names the current HEAD
- [ ] No source file changed, and the only commit touches `plan.md`

<!-- Optional Claude-only additions. Keep this file empty when not needed. -->
