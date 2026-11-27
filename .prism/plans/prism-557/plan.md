---
title: Stage tools — declared tool lists, and verify writes its record by script
ticket: https://github.com/HunterMcGrew/PRISM/issues/557
stage: plan
status: approved
approved_by: auto
approved_at: 2026-11-27
---

## Acceptance Criteria

Child 11 of the Kitchen Line epic (#499). Each criterion cites the spec requirement it grades as `(REQ-n)`.

- [ ] **AC-1** Given a skill's `tools` frontmatter value, When `parseToolsField` reads it, Then it throws an error naming the skill on an empty list, an empty entry, a repeated name, and a name matching neither `^[A-Z][A-Za-z]*$` nor `^mcp__\S+$`, and returns the trimmed names for `Read, Bash, mcp__srv__tool`. (REQ-1)
  - Evidence (machine): `npx tsx --test --test-name-pattern="rejects a malformed tools list" scripts/ai-skills/stage-tools.test.ts` passes, and the file does not exist on `main` at `8c53b07a`.
- [ ] **AC-2** Given the ten stage skills, When each `frontmatter.yml` is read, Then its `tools` list equals the pinned list in T8, `prism-verify` reads exactly `Read, Bash`, `prism-review` reads exactly `Read, Grep, Glob, Bash, Agent, WebFetch, WebSearch`, and neither holds `Edit`, `Write`, or `NotebookEdit`. (REQ-2, REQ-4, REQ-5)
  - Evidence (machine): the `stage-tools.test.ts` case "pins each stage skill's tools" passes.
- [ ] **AC-3** Given `roles.json`, When the build has run, Then each `gated: true` role's `.claude/agents/<id>.md` carries `tools: <its list>` on the line after `model:`, no other agent file's first frontmatter block carries a `tools:` line, and `buildClaudeAgentMarkdown` throws for a gated role with no list. (REQ-3, REQ-6)
  - Evidence (machine): the `stage-tools.test.ts` cases "writes the list into every gated role's agent file", "leaves every other agent file unrestricted", and "buildClaudeAgentMarkdown writes tools for a gated role and throws without them" pass.
- [ ] **AC-4** Given the generated `.claude/agents/prism-review.md` and `.claude/agents/prism-verify.md`, When their `tools:` lines are read, Then neither names `Edit`, `Write`, or `NotebookEdit`. (REQ-4, REQ-6)
  - Evidence (machine): the `stage-tools.test.ts` case "keeps Edit and Write off the review and verify agents" passes, and `awk '/^---$/{n++; next} n==1' .claude/agents/prism-verify.md | grep '^tools:'` prints exactly `tools: Read, Bash` (first frontmatter block only, because the body repeats the skill's frontmatter).
- [ ] **AC-5** Given a plan and a report JSON, When `verify/record.mjs <plan.md> <report.json>` runs, Then it replaces only the lines between `## Verification` and the next `## ` heading (adding the heading at the end of a plan that lacks one), exits 0, and on a missing argument, an unreadable file, invalid JSON, a shape error, or a `checkReport` problem other than `verdict is blocked:` exits 2 and leaves the plan byte-identical. (REQ-7, REQ-8)
  - Evidence (machine): `npx tsx --test scripts/ai-skills/verify-record.test.ts` passes, and the file does not exist on `main`.
- [ ] **AC-6** Given a section `record.mjs` wrote, When `check-report.mjs <plan.md>` runs, Then a `done` report exits 0, and a `blocked` report exits 1 with every printed line starting `verdict is blocked: `. (REQ-9)
  - Evidence (machine): the `verify-record.test.ts` cases "writes a done report that check-report passes" and "writes a blocked report that check-report fails only on its blocked lines" pass.
- [ ] **AC-7** Given a consumer update, When the hook runtime is delivered, Then `.claude/hooks/verify/record.mjs` exists, carries the `@prism-hook-runtime` marker on line 1, and `scripts/ai-skills/hooks/verify/record.d.mts` exists beside its source. (REQ-10)
  - Evidence (machine): `npx tsx --test scripts/ai-skills/plan-runtime-delivery.test.ts` passes, `head -1 scripts/ai-skills/hooks/verify/record.mjs` prints the marker line, and `test -f scripts/ai-skills/hooks/verify/record.d.mts` exits 0.
- [ ] **AC-8** Given `prism-verify`'s body, When read, Then it writes `## Verification` only through `verify/record.mjs`, carries unchanged rows into the report on a re-run, and still commits through `plan/commit.mjs`. (REQ-11)
  - Evidence (machine): `grep -c 'verify/record.mjs' .ai-skills/skills/prism-verify/shared.md` prints at least 1, `grep -n 'plan/commit.mjs' .ai-skills/skills/prism-verify/shared.md` prints a line, and `grep -n 'Replace everything between' .ai-skills/skills/prism-verify/shared.md` prints nothing.
- [ ] **AC-9** Given `prism-review`'s body, When read, Then the round report JSON is written through the shell into a `mktemp -d` directory, the flat-plan record, proposed criteria, and a missing plan file go to the session under a `Plan record` heading, and a lesson goes to the session under a `Lessons` heading. (REQ-12)
  - Evidence (machine): `grep -n 'mktemp -d' .ai-skills/skills/prism-review/shared.md`, `grep -n 'Plan record' .ai-skills/skills/prism-review/shared.md`, and `grep -n 'Lessons' .ai-skills/skills/prism-review/shared.md` each print a line; `grep -n 'Stage the plan file alone\|create it if missing' .ai-skills/skills/prism-review/shared.md` prints nothing.
- [ ] **AC-10** Given Claude Code, When the main session runs the two probes in T13, Then whether the generated `prism-verify` agent could call `Write` or `Edit`, and whether the generated `prism-review` agent could launch a subagent, are recorded in `hook-runtime.md` under `### Stage tools` and in this plan's `## History`, either way. (REQ-13)
  - Evidence (machine): `grep -n '^### Stage tools' .prism/architect/_toolkit/hook-runtime.md` prints the heading, and the section and a `## History` line each quote the probes' `PROBE write=` and `PROBE inner=` lines verbatim.
- [ ] **AC-11** Given Codex and Cursor, When the build has run, Then no `.codex/agents/*.toml` carries a tools key, and `hook-runtime.md`'s `### Stage tools` section records that Codex's agent file has no tool allowlist and Cursor gets no agent files, so both get the declaration only. (REQ-14)
  - Evidence (machine): `grep -n '^tools *=' .codex/agents/*.toml` prints nothing (a bare `^tools` would match the rendered skill frontmatter each `.toml` embeds in `developer_instructions`), and `awk '/^### Stage tools/{f=1; next} /^#/{f=0} f' .prism/architect/_toolkit/hook-runtime.md | grep -c 'Codex'` prints at least 1.
- [ ] **AC-12** Given the docs, When read, Then `review-runtime.md` has a `## verify/record.mjs` section naming its arguments, report shape, and exit codes, its Invocation paragraph names `verify/record.mjs`, and `skills-ecosystem.md` and its curated twin carry the same `**Stage tools.**` paragraph. (REQ-15)
  - Evidence (machine): `grep -n '^## verify/record.mjs' .prism/architect/_toolkit/review-runtime.md` prints the heading; `grep -c 'node .claude/hooks/verify/record.mjs' .prism/architect/_toolkit/review-runtime.md` prints at least 1; `diff <(grep -F '**Stage tools.**' .prism/architect/_toolkit/skills-ecosystem.md) <(grep -F '**Stage tools.**' templates/install/.prism/architect/_toolkit/skills-ecosystem.md)` exits 0 with both greps non-empty.
- [ ] **AC-13** Given `reconcile.mjs`, When run with `#12` or `https://github.com/o/r/pull/12` and `--classes --log <tmp>`, Then it exits 0, and with `0`, `007`, `abc`, or a URL ending `/issues/12` it exits 2; the exported `reconcile()` throws before any `gh` call when `pr` is `0`, `1.5`, or `NaN`. (REQ-16)
  - Evidence (machine): `npx tsx --test --test-name-pattern="PR argument" scripts/ai-skills/review-reconcile.test.ts` passes, and its `#12` and `0` cases fail on `main`.
- [ ] **AC-14** Given each part's head, When CI runs, Then `pnpm prism:check` passes on both platforms. (REQ-17)
  - Evidence (machine): the PR's check rollup shows the `prism:check` job green on ubuntu and windows.

## Tasks

This child ships as a two-PR stack. **Part 1 (the verify record script and the reconcile fix)** is T1 to T5. **Part 2 (the tool lists)** is T6 to T13, and opens with T6, the plan-only commit that names part 1's tasks as shipped. Part 1 never touches a `frontmatter.yml`, `generate-skills.ts`, `update.ts`, `prism-review/shared.md`, `skills-ecosystem.md`, or `hook-runtime.md`.

Generated copies are listed in each part's build task (T5, T12) rather than beside their source edit, so each path belongs to one task. A build task commits only the listed paths `git status -s` shows changed, because `plan/commit.mjs` rejects an unchanged path. A path the build changes that is not listed is reported as `unlisted:` in the build report. Curated seed twins (`templates/install/.prism/architect/_toolkit/skills-ecosystem.md` and `hook-runtime.md`) are hand-edited in the same task as their canonical, because the build never rewrites them. Run TS tests with `npx tsx --test`, the runner `pnpm prism:test` uses.

Bundle groups (from `node scripts/ai-skills/hooks/plan/bundles.mjs .prism/plans/prism-557/plan.md`):

Group 1: T1, T2 (architect context `_toolkit/hook-runtime.md`, `_toolkit/review-runtime.md`, `_toolkit/skills-ecosystem.md`, `_toolkit/spec-editing.md`). The script added no import edge. Every later task waits on T1 or T2 directly or through a chain, so later groups print as tasks finish.

### T1: Part 1 — add verify/record.mjs

- files: scripts/ai-skills/hooks/verify/record.mjs, scripts/ai-skills/hooks/verify/record.d.mts, scripts/ai-skills/verify-record.test.ts
- proof: npx tsx --test scripts/ai-skills/verify-record.test.ts && pnpm prism:check-types
- proof fails on main: yes
- depends on: none

Write `scripts/ai-skills/verify-record.test.ts` first, in the style of `scripts/ai-skills/review-record.test.ts` (spawn the script with `spawnSync(process.execPath, [SCRIPT, planPath, reportPath])`, scratch files under `os.tmpdir()`), and see it fail. Then write the module.

**`record.mjs`.** Open with the three-line `@prism-hook-runtime` header copied from `scripts/ai-skills/hooks/review/record.mjs`, then a file JSDoc: usage `node <hook-runtime>/verify/record.mjs <plan.md> <report.json>`, what it writes, and the exits. Imports only `node:` builtins and `{ checkReport }` from `./check-report.mjs`. Exports, mirrored in `record.d.mts`:

- `class ReportShapeError extends Error {}`
- `validateVerifyReport(value: unknown): VerifyReport` — throws `ReportShapeError` naming the field. Rules: an object; `verdict` is `"done"` or `"blocked"`; `base` and `head` are strings matching `^[0-9a-f]{7,40}$` once trimmed (the returned report holds the trimmed values); `rows` is a non-empty array of `{ check, result, evidence }`, each a string that is non-empty after trimming, with `check` holding no whitespace; `blocked` is an array of `{ check, why }`, each a non-empty string; `failures` is an array of `{ check, file, line? }` with `check` and `file` non-empty strings holding no whitespace (the shape `check-report.mjs`'s Failures line reads) and `line`, when present, a positive safe integer; every string cell holding `|`, `\n`, or `\r` is a shape error; `verdict` is `"blocked"` exactly when `blocked` is non-empty (see the Decision on it).
- `composeVerificationSection(report: VerifyReport): string[]` — the section's lines after the heading, exactly: `""`, `verdict: <verdict>`, `base: <base>`, `head: <head>`, one `blocked: <check>: <why>` per blocked entry, `""`, `| check | result | evidence |`, `| --- | --- | --- |`, one `| <check> | <result> | <evidence> |` per row, `""`, `### Failures`, `""`, one `- <check>: <file>` or `- <check>: <file>:<line>` per failure, or `- none` when there are none.
- `replaceVerificationSection(planText: string, sectionLines: string[]): string` — splits on `"\n"` (as `review/record.mjs` does). With a `## Verification` line (matched by `line.trimEnd() === "## Verification"`, the test `extractVerificationSection` uses), it replaces the lines after it up to the next line starting `## ` with `sectionLines` followed by one `""` when a next heading follows; at end of file the result ends with the last section line and a single `"\n"`. With no heading, it trims trailing newlines from the text and appends `"\n\n## Verification\n"` plus `sectionLines.join("\n")` and `"\n"`. Every byte outside the section is unchanged.
- `VerifyReport` in `record.d.mts`: `{ verdict: "done" | "blocked"; base: string; head: string; blocked: { check: string; why: string }[]; rows: { check: string; result: string; evidence: string }[]; failures: { check: string; file: string; line?: number }[] }`.

CLI (`runCli`, behind the realpath entry guard `check-report.mjs` uses): exactly two arguments, else usage to stderr and exit 2. Read both files and `JSON.parse` the report; any read or parse error prints `record: <message>` and exits 2. Validate, compose, replace, then run `checkReport(newText)`. Any problem not starting `verdict is blocked:` prints `record: <problem>` per line and exits 2 without writing. Otherwise write the plan with `writeFileSync`, print `record: wrote ## Verification (<verdict>)`, and exit 0.

**Test cases**, each its own `test(...)`:

1. "writes a done report that check-report passes" — fixture plan `---\nstatus: approved\n---\n\n## Tasks\n\n## Verification\n\nold line\n\n## Review\n\n- review round 1 at abc12345: clean\n`; the report is the spec's example with `verdict: "done"`, `blocked: []`, rows typecheck `fail` and lint `pass`, one failure with `line: 42`. Assert exit 0; the text before `## Verification\n` and from `## Review` on is byte-identical; the section equals the exact lines above; spawning `check-report.mjs` on the plan exits 0.
2. "writes a blocked report that check-report fails only on its blocked lines" — `verdict: "blocked"`, one blocked entry, its row `n/a: blocked`. Record exits 0; `check-report.mjs` exits 1 and every stdout line starts `verdict is blocked: `.
3. "adds the heading at the end of a plan with none" — the plan without the section gains `\n\n## Verification\n` and the section at its end, and the earlier text is unchanged.
4. "writes - none when there are no failures, and trims base and head" — `base: " 8c53b07a "` writes `base: 8c53b07a`.
5. "rejects a malformed report with exit 2 and writes nothing" — loop over: invalid JSON; `base` missing; `base: "xyz"`; `rows: []`; `rows` not an array; a row result `passed` (a `checkReport` problem); a cell holding `|`; a cell holding `\n`; a whitespace-only `check`; a failure `file` holding a space; `line: 0`; `line: 1.5`; a failure whose check has no `fail` row (a `checkReport` problem); `verdict: "blocked"` with `blocked: []`; `verdict: "done"` with one blocked entry; `verdict: "maybe"`. Each exits 2 and the plan is byte-identical.
6. "a missing argument, an unreadable plan, and an unreadable report exit 2".

### T2: Part 1 — accept post.mjs's PR forms in reconcile

- files: scripts/ai-skills/hooks/review/reconcile.mjs, scripts/ai-skills/review-reconcile.test.ts
- proof: npx tsx --test scripts/ai-skills/review-reconcile.test.ts
- proof fails on main: yes
- depends on: none

Add the tests first, in a new `describe("PR argument", ...)` in `review-reconcile.test.ts`, and see them fail:

- `#12`, `12`, and `https://github.com/o/r/pull/12`, each run as `spawnSync(process.execPath, [SCRIPT, <arg>, "--classes", "--log", <tmp log path>])`, exit 0. `--classes` returns before any `gh` call.
- `0`, `007`, `abc`, and `https://github.com/o/r/issues/12`, run the same way, exit 2 with stderr matching `/unknown argument/`.
- `reconcile({ pr, repo: "o/r", gh, git, agentLogin: "me", logPath })` with `pr` of `0`, `1.5`, and `NaN` throws `/positive integer/`, and a `gh` fake that counts its calls records 0.

Then in `reconcile.mjs`:

- After the existing constants, add `const PR_PATTERN = /^(?:#|https?:\/\/\S+\/pull\/)?([1-9]\d*)$/;` with the comment line above it: `// The forms post.mjs accepts, so the session hands both scripts the same PR reference`.
- In `parseArgs`, replace `else if (/^\d+$/.test(arg)) options.pr = Number(arg);` with a branch that matches `PR_PATTERN` and sets `options.pr` to `Number` of capture group 1 when that value passes `Number.isSafeInteger`; a longer digit run falls through to the same `unknown argument` error, so it exits 2 before any `gh` call. Anything else still reaches `throw new Error(\`unknown argument ${arg}\`)`.
- In `reconcile()`, directly after the `agentLogin` guard, add `if (!Number.isSafeInteger(pr) || pr < 1) throw new Error(\`reconcile needs a positive integer pr, got ${String(pr)}\`);`.
- In the file JSDoc, after the usage line, add the sentence `` `<pr>` is `N`, `#N`, or a URL ending `/pull/N`. ``

`reconcile.d.mts` is unchanged: the signature stays `pr: number`, and `parseArgs` is not exported.

### T3: Part 1 — verify writes its section through record.mjs

- files: .ai-skills/skills/prism-verify/shared.md
- proof: grep -q 'verify/record.mjs' .ai-skills/skills/prism-verify/shared.md && grep -q 'mktemp -d' .ai-skills/skills/prism-verify/shared.md && ! grep -q 'Replace everything between' .ai-skills/skills/prism-verify/shared.md
- depends on: T1

Content-only until T5's build. Edits to `.ai-skills/skills/prism-verify/shared.md`:

- "The run, in order", step 4: `Write \`## Verification\`, run the checker, and fix your own section until it passes.` → `Write \`## Verification\` through \`record.mjs\`, and fix your report until it exits 0.`
- "Writing the section": replace the first paragraph and the markdown example with: `` `node ${HOOK_RUNTIME_DIR}/verify/record.mjs <plan.md> <report.json>` writes the section. It replaces everything between the `## Verification` heading and the next `## ` heading, touches nothing else, and writes the shape `check-report.mjs` parses, so never edit the section by hand. Run `mktemp -d` once, then write the report with `cat > <dir>/verify-report.json <<'EOF'` as its own command, so the file sits outside the repo. Keep backticks and `$(` out of the JSON strings, because the write gate scans a heredoc body that holds either for paths: `` followed by this example (not the spec's, whose `done` verdict carries a `blocked` entry that `validateVerifyReport` rejects), pretty-printed: `{ "verdict": "done", "base": "8c53b07a", "head": "1a2b3c4d", "blocked": [], "rows": [{ "check": "typecheck", "result": "fail", "evidence": "/tmp/verify/typecheck.log" }, { "check": "lint", "result": "pass", "evidence": "/tmp/verify/lint.log" }], "failures": [{ "check": "typecheck", "file": "scripts/lib/parse.ts", "line": 42 }] }` in a `json` fence.
- The bullets under it become: **`result`** is exactly `pass`, `fail`, or `n/a: <reason>`, and **`evidence`** is the check's log path. **`failures`** holds one `{ "check", "file", "line" }` per failing file, `line` optional, where the file is the repo-relative path the output blames, or the file that defines the command when it names none; an empty array writes `- none`. **`verdict: "done"`** means every configured check ran, whatever its result. **`verdict: "blocked"`** means at least one could not run: its row reads `n/a: blocked`, and `blocked` holds `{ "check", "why" }` for each, which the script writes as `blocked: <check>: <why>` lines. A cell may not hold `|` or a line break.
- Replace the paragraph starting `Then run \`node ${HOOK_RUNTIME_DIR}/verify/check-report.mjs` with: `` `record.mjs` runs `check-report.mjs`'s checks over the new section before it writes. Exit 0 means the section is written. Exit 2 names each problem and writes nothing, so fix the report and run it again. A `blocked` report is written, and `check-report.mjs` still fails it on purpose, so a run that could not finish never passes. ``
- "Re-running after a later commit", step 2 → `Run the checks those files reach. Read the current section and carry every row, Failures line, and \`blocked:\` line the changed files don't reach into the report unchanged, with the rerun checks' new rows, failures, and blocked entries beside them. A commit that touches only the plan folder reaches no check, any other source change reaches every configured check, and a change on the spec surface reaches \`spec\`.` Step 3 gains a closing sentence: `\`record.mjs\` always writes the whole section, so the report carries every row.` The last paragraph → `When no changed file reaches a check, run nothing and hand \`record.mjs\` the carried rows with the current HEAD as \`head\`.`
- "Definition of Done": add `- [ ] \`## Verification\` was written only by \`record.mjs\`` after the first item.

### T4: Part 1 — document verify/record.mjs and reconcile's PR forms

- files: .prism/architect/_toolkit/review-runtime.md
- proof: grep -q '^## verify/record.mjs' .prism/architect/_toolkit/review-runtime.md && grep -q 'node .claude/hooks/verify/record.mjs' .prism/architect/_toolkit/review-runtime.md && ! grep -q 'All five' .prism/architect/_toolkit/review-runtime.md
- depends on: T1, T2

Content-only until T5's build, which mirrors it to the seed and host copies. Walk every new claim against T1's and T2's code before committing, per `.prism/rules/architect-doc-verification.md`. Edits:

- Opening paragraph: `` `post.mjs`, `check-report.mjs`, and the retro-line check promise `` → `` `post.mjs`, `check-report.mjs`, `verify/record.mjs`, and the retro-line check promise ``.
- `## reconcile.mjs`, **Arguments.**: open with `` `<pr>` is `N`, `#N`, or a URL ending `/pull/N`, the forms `post.mjs` takes, with no leading zero. `` **Exit codes.**: `2 on a usage error,` → `2 on a usage error, a \`<pr>\` in none of those forms included,`.
- New section `## verify/record.mjs` between `## check-report.mjs` and `## The retro-line check`, in four short paragraphs: (1) `record.mjs <plan.md> <report.json>` writes the plan's `## Verification` section from a verify run's report, replacing the lines from the heading to the next `## ` heading and nothing else, and a plan with no heading gets it at the end. (2) **The report.** The same JSON example T3 shows in the verify body, copied verbatim into a `json` fence, then the rules from T1's `validateVerifyReport`, including the `verdict`/`blocked` pairing and the ban on `|` and line breaks in a cell, because either would break the table. (3) **One copy of the rules.** It composes the section in the shape `check-report.mjs` parses and runs `checkReport` over the plan with the new section in place before writing; any problem other than `verdict is blocked:` exits 2 and writes nothing, so the writer cannot drift from the reader. (4) **Exit codes.** 0 when written; 2 on a missing argument, an unreadable plan or report, invalid JSON, a shape error, or a `checkReport` problem. There is no exit 1: a `blocked` report is written, and `check-report.mjs` is what fails it. On a re-run, `prism-verify` carries the unchanged rows into the report, so the script never merges.
- `## Invocation`: add `` `node .claude/hooks/verify/record.mjs` `` to the command list after `` `node .claude/hooks/verify/check-report.mjs` `` (the list's `and` moves to the new last item); add `` `verify/record.mjs` imports `check-report.mjs`. `` after the `review/ignore.mjs` sentence; `All five are` → `All of these are`; `` and `record.mjs` and `check-report.mjs` read only local files `` → `` and `record.mjs`, `verify/record.mjs`, and `check-report.mjs` read only local files ``.

### T5: Part 1 — regenerate the outputs

- files: .claude/skills/prism-verify/SKILL.md, .cursor/skills/prism-verify/SKILL.md, .claude/agents/prism-verify.md, .codex/agents/prism-verify.toml, .claude/architect/_toolkit/review-runtime.md, .codex/architect/_toolkit/review-runtime.md, .cursor/architect/_toolkit/review-runtime.md, templates/install/.prism/architect/_toolkit/review-runtime.md
- proof: pnpm prism:check
- depends on: T1, T2, T3, T4

Run `pnpm prism:build`, then `pnpm prism:check`. Fix a failure in the task that owns the source file, not here. Commit only the listed paths `git status -s` shows changed.

### T6: Part 2 — record part 1 as shipped

- files: .prism/plans/prism-557/plan.md
- proof: node scripts/ai-skills/hooks/plan/tasks.mjs .prism/plans/prism-557/plan.md
- depends on: T5

On part 2's branch, cut from `main` after part 1 squash-merges, append a `## History` line naming part 1's PR, and commit `node scripts/ai-skills/hooks/plan/commit.mjs "T1-T6: Record part 1 as shipped" .prism/plans/prism-557/plan.md`, per the stacked-ticket note in `plan-chain-scripts.md`. The session makes this commit, because builders never edit `plan.md`. The proof prints T1 to T6 done.

### T7: Part 2 — validate the tools field and write it for gated roles

- files: scripts/ai-skills/generate-skills.ts, scripts/ai-skills/stage-tools.test.ts
- proof: npx tsx --test --test-name-pattern="rejects a malformed tools list|buildClaudeAgentMarkdown writes tools" scripts/ai-skills/stage-tools.test.ts && pnpm prism:check-types
- proof fails on main: yes
- depends on: T6

Write `scripts/ai-skills/stage-tools.test.ts` first, in the style of `scripts/ai-skills/claude-agent-def.test.ts` (repo root from `import.meta.url`), importing `buildClaudeAgentMarkdown`, `parseToolsField`, and `type RolesDefinitions` from `./generate-skills` and `parseFrontmatter` from `./utils`. It holds one constant, `EXPECTED_TOOLS`, a map from skill ID to the list in T8, and six cases:

1. **"rejects a malformed tools list"** — `parseToolsField("prism-x", v)` throws `/prism-x/` for `""`, `"Read, , Bash"`, `"Read,"`, `"Read, Read"`, `"read"`, and `"Bash(git:*)"`, and returns `["Read", "Bash", "mcp__srv__tool"]` for `"Read, Bash, mcp__srv__tool"`.
2. **"pins each stage skill's tools"** — for each ID in `EXPECTED_TOOLS`, `parseFrontmatter` over `.ai-skills/skills/<id>/frontmatter.yml`, split `tools` on `,` and trim, and `deepEqual` the expected list.
3. **"writes the list into every gated role's agent file"** — for each `gated: true` role in `roles.json`, read `.claude/agents/<id>.md`, take the first frontmatter block (between the first two `---` lines), and assert the line after `model: ...` is `tools: ${EXPECTED_TOOLS.get(id).join(", ")}`.
4. **"leaves every other agent file unrestricted"** — for each role that is neither `type: "utility"` nor gated, the first frontmatter block of `.claude/agents/<id>.md` holds no line starting `tools:`. Only the first block, because the body repeats the skill's own frontmatter, which carries `tools:` for `prism-intent`, `prism-design`, and `prism-retro`.
5. **"keeps Edit and Write off the review and verify agents"** — the first-block `tools:` line of `.claude/agents/prism-review.md` and `.claude/agents/prism-verify.md` names none of `Edit`, `Write`, `NotebookEdit`.
6. **"buildClaudeAgentMarkdown writes tools for a gated role and throws without them"** — `gated: true, tools: "Read, Bash"` produces `model: sonnet\ntools: Read, Bash\n`; `gated: true` with no `tools` throws `/prism-test/`; `gated: false, tools: "Read"` produces no `tools:` line.

Cases 2 to 5 fail until T8 and T12; T7's proof runs only 1 and 6. Then in `generate-skills.ts`:

- After `DEFAULT_CLAUDE_AGENT_MODEL`, add `const TOOL_NAME_PATTERN = /^[A-Z][A-Za-z]*$/;` and `const MCP_TOOL_PATTERN = /^mcp__\S+$/;`.
- Export `parseToolsField(skillId: string, value: string): string[]` with a JSDoc summary line (`Parses a skill's one-line tools list and throws, naming the skill, on a malformed one.`). It splits on `,` and trims each entry, and throws `Skill '<id>' declares an empty tools list.` when the trimmed value is empty, `Skill '<id>' has an empty entry in its tools list.` for an empty entry, `Skill '<id>' lists tool '<name>' twice.` for a repeat, and `Skill '<id>' lists '<name>', which is neither a tool name nor an mcp__ name.` otherwise.
- In `loadSkillSource`, after the description-length check: `const tools = frontmatterMap.get("tools");` and `if (tools !== undefined) parseToolsField(skillId, tools);`, so a bad list fails for every skill, gated or not.
- `BuildClaudeAgentMarkdownArgs` gains `gated?: boolean;` and `tools?: string;`. In `buildClaudeAgentMarkdown`, before building the frontmatter, throw `Gated role '<id>' declares no tools in .ai-skills/skills/<id>/frontmatter.yml.` when `gated` is true and `tools` is undefined, and add `...(gated ? [\`tools: ${parseToolsField(skillId, tools).join(", ")}\`] : [])` directly after the `model:` line. Add to its JSDoc: `A gated role also gets the skill's tools list, which Claude Code reads as the agent's tool allowlist, and a gated role with no list throws.`
- At the call site in `generatePlatformSkills`, pass `gated: roleDefinition.gated` and `tools: skillSource.frontmatterMap.get("tools")`.

Child 12 also edits `buildClaudeAgentMarkdown`; whichever merges second rebases onto the first.

### T8: Part 2 — declare tools on every stage skill

- files: .ai-skills/skills/prism-intent/frontmatter.yml, .ai-skills/skills/prism-design/frontmatter.yml, .ai-skills/skills/prism-spec/frontmatter.yml, .ai-skills/skills/prism-plan/frontmatter.yml, .ai-skills/skills/prism-challenge/frontmatter.yml, .ai-skills/skills/prism-implement/frontmatter.yml, .ai-skills/skills/prism-docs/frontmatter.yml, .ai-skills/skills/prism-verify/frontmatter.yml, .ai-skills/skills/prism-review/frontmatter.yml, .ai-skills/skills/prism-retro/frontmatter.yml
- proof: npx tsx --test --test-name-pattern="pins each stage skill" scripts/ai-skills/stage-tools.test.ts
- proof fails on main: yes
- depends on: T7

Append one line as the last line of each file:

- `prism-intent`: `tools: Read, Grep, Glob, Bash, Edit, Write`
- `prism-design`: `tools: Read, Grep, Glob, Bash, Edit, Write`
- `prism-spec`: `tools: Read, Grep, Glob, Bash, Edit, Write`
- `prism-plan`: `tools: Read, Grep, Glob, Bash, Edit, Write, Agent`
- `prism-challenge`: `tools: Read, Grep, Glob, Bash, Edit, Write, WebFetch, WebSearch`
- `prism-implement`: `tools: Read, Grep, Glob, Bash, Edit, Write, WebFetch, WebSearch`
- `prism-docs`: `tools: Read, Grep, Glob, Bash, Edit, Write`
- `prism-verify`: `tools: Read, Bash`
- `prism-review`: `tools: Read, Grep, Glob, Bash, Agent, WebFetch, WebSearch`
- `prism-retro`: `tools: Read, Grep, Glob, Bash, Edit, Write`

Each list is the spec's base (`Read, Grep, Glob, Bash`, plus `Edit, Write` for a stage whose body writes a file) plus what the body tells a run to do: `Agent` where it dispatches a subagent, and `WebFetch, WebSearch` where it tells the run to check an outside claim at its source. See the Decision on the web tools.

### T9: Part 2 — deliver verify/record.mjs

- files: scripts/ai-skills/update.ts, scripts/ai-skills/plan-runtime-delivery.test.ts
- proof: npx tsx --test scripts/ai-skills/plan-runtime-delivery.test.ts
- proof fails on main: yes
- depends on: T7

Append `".claude/hooks/verify/record.mjs",` as the last entry of the expected list in `plan-runtime-delivery.test.ts` (after `".claude/hooks/review/post.mjs",`) and see the test fail. Then add `"verify/record.mjs",` after `"verify/check-report.mjs",` in `HOOK_RUNTIME_FILES` in `update.ts`. It is not an entry point, so `HOOK_RUNTIME_ENTRY_POINTS` is unchanged. `update.ts` imports `generate-skills.ts`, which T7 owns, so this task follows T7 (see the Decision on delivery in part 2).

### T10: Part 2 — prism-review hands its writes to the session

- files: .ai-skills/skills/prism-review/shared.md
- proof: grep -q 'mktemp -d' .ai-skills/skills/prism-review/shared.md && grep -q 'Plan record' .ai-skills/skills/prism-review/shared.md && grep -q 'under a `Lessons` heading' .ai-skills/skills/prism-review/shared.md && ! grep -q 'Stage the plan file alone\|create it if missing' .ai-skills/skills/prism-review/shared.md
- depends on: T6

Content-only until T12's build. Edits to `.ai-skills/skills/prism-review/shared.md` (line numbers at `8c53b07a`):

- Line 23, Startup: `and on a flat plan create it if missing, since this skill writes into it.` → `and on a flat plan with none, put the plan file it would create in the report under a \`Plan record\` heading, because this skill has no Edit or Write tool and the session writes it.`
- Line 38: `Record the round in the plan first, then report in chat.` → `On a folder plan, record the round in the plan first, then report in chat. On a flat plan, the session writes the record from the report.`
- Line 41, plan-folder bullet: `write the round's report JSON to a temp file as` → `run \`mktemp -d\` once and write the round's report JSON with \`cat > <dir>/review-report.json <<'EOF'\` as its own command, because this skill has no Write tool, keeping backticks and \`$(\` out of its strings so the write gate does not scan the body for paths, as`. The rest of the bullet is unchanged.
- Line 42, flat-plan bullet, replaced whole: `- **On a flat plan,** put the plan record in the report under a \`Plan record\` heading: one \`## Review Issues\` entry per finding in the format \`.prism/rules/branch-plan.md\` defines, or \`No issues found — <YYYY-MM-DD> [<branch>]\` for a clean pass, with the \`## Cleanup Items\` and \`## PR Readiness\` state beside them. When dispatched without Edit and Write, the session writes them to the plan, commits it as \`chore: self-review plan record for <ticket-id>\`, and pushes it.`
- Line 43, criteria bullet: `On a flat plan, when the plan has none, propose criteria from the diff as \`proposed\` entries. Otherwise record a difference as a \`proposed\` entry under \`### AC Adjustments\`. Once one is accepted, sync` → `On a flat plan, when the plan has none, propose criteria from the diff as \`proposed\` entries under the report's \`Plan record\` heading. Otherwise list a difference there as a \`proposed\` entry for \`### AC Adjustments\`. The session writes them, and once one is accepted it syncs`.
- Line 52, Rounds: `On a folder plan its only write is the record line, and a flat plan adds its review entries and checklist state.` → `On a folder plan its only write is the record line, through \`record.mjs\`. On a flat plan, when dispatched without Edit and Write, it writes nothing and hands the session what the report's \`Plan record\` heading holds. Run in the session with those tools, it writes the same record itself.`
- Line 64, replaced whole: `Before closing, list any lesson for \`.prism/lessons.md\` under a \`Lessons\` heading in the report: one a documented lesson should have prevented an issue you found, or an assumption you made that proved wrong. The session appends it.`

### T11: Part 2 — state the tools field contract

- files: .prism/architect/_toolkit/skills-ecosystem.md, templates/install/.prism/architect/_toolkit/skills-ecosystem.md
- proof: diff <(grep -F '**Stage tools.**' .prism/architect/_toolkit/skills-ecosystem.md) <(grep -F '**Stage tools.**' templates/install/.prism/architect/_toolkit/skills-ecosystem.md) && grep -q -F '**Stage tools.**' .prism/architect/_toolkit/skills-ecosystem.md
- depends on: T6

Content-only until T12's build. In both files, add one paragraph after the `### Utility skills` paragraph and before the `---` that precedes `## Cross-skill Handoffs`, with no new heading (both files are on the manifest's `umbrellas` list). The paragraph is identical in both:

`**Stage tools.** A PRISM skill's frontmatter may declare \`tools: <Name>, <Name>, ...\` on one line, naming the tools its body uses, and every stage skill declares one. The PRISM build writes the list as \`tools:\` into the Claude agent file of each gated role, the stages a plan-folder run dispatches, and fails a gated role that declares none. Claude Code documents that line as the agent's tool allowlist, so a gated agent also loses any tool the list leaves out, MCP tools included. On every other skill, and on Codex and Cursor, which have no per-agent tool list, the line is a declaration the model reads and it removes nothing. \`prism-verify\` and \`prism-review\` declare no \`Edit\` and no \`Write\`, so verify writes \`## Verification\` through \`verify/record.mjs\` and the review hands a flat plan's record to the session. A stage with a shell can still write through it, so the list is friction and not a wall. The live result is in [\`hook-runtime.md\`](./hook-runtime.md) § Stage tools.`

### T12: Part 2 — regenerate the outputs

- files: .claude/skills/prism-intent/SKILL.md, .cursor/skills/prism-intent/SKILL.md, .claude/agents/prism-intent.md, .codex/agents/prism-intent.toml, .claude/skills/prism-design/SKILL.md, .cursor/skills/prism-design/SKILL.md, .claude/agents/prism-design.md, .codex/agents/prism-design.toml, .claude/skills/prism-spec/SKILL.md, .cursor/skills/prism-spec/SKILL.md, .claude/agents/prism-spec.md, .codex/agents/prism-spec.toml, .claude/skills/prism-plan/SKILL.md, .cursor/skills/prism-plan/SKILL.md, .claude/skills/prism-challenge/SKILL.md, .cursor/skills/prism-challenge/SKILL.md, .claude/agents/prism-challenge.md, .codex/agents/prism-challenge.toml, .claude/skills/prism-implement/SKILL.md, .cursor/skills/prism-implement/SKILL.md, .claude/agents/prism-implement.md, .codex/agents/prism-implement.toml, .claude/skills/prism-docs/SKILL.md, .cursor/skills/prism-docs/SKILL.md, .claude/agents/prism-docs.md, .codex/agents/prism-docs.toml, .claude/skills/prism-verify/SKILL.md, .cursor/skills/prism-verify/SKILL.md, .claude/agents/prism-verify.md, .codex/agents/prism-verify.toml, .claude/skills/prism-review/SKILL.md, .cursor/skills/prism-review/SKILL.md, .claude/agents/prism-review.md, .codex/agents/prism-review.toml, .claude/skills/prism-retro/SKILL.md, .cursor/skills/prism-retro/SKILL.md, .claude/agents/prism-retro.md, .codex/agents/prism-retro.toml, .claude/architect/_toolkit/skills-ecosystem.md, .codex/architect/_toolkit/skills-ecosystem.md, .cursor/architect/_toolkit/skills-ecosystem.md
- proof: npx tsx --test scripts/ai-skills/stage-tools.test.ts && pnpm prism:check
- depends on: T7, T8, T10, T11

Run `pnpm prism:build`, then the proof. `prism-plan` is a utility, so it has no agent files. A Codex `.toml` changes because it embeds the rendered skill, frontmatter included, and gains no tools key. Fix a failure in the task that owns the source file, not here. Commit only the listed paths `git status -s` shows changed.

### T13: Part 2 — probe the lists live and record the hosts

- files: .prism/architect/_toolkit/hook-runtime.md, templates/install/.prism/architect/_toolkit/hook-runtime.md, .claude/architect/_toolkit/hook-runtime.md, .codex/architect/_toolkit/hook-runtime.md, .cursor/architect/_toolkit/hook-runtime.md
- proof: awk '/^### Stage tools/{f=1; next} /^#/{f=0} f' .prism/architect/_toolkit/hook-runtime.md | grep -q 'PROBE inner=' && awk '/^### Stage tools/{f=1; next} /^#/{f=0} f' .prism/architect/_toolkit/hook-runtime.md | grep -q 'PROBE write=' && pnpm prism:check
- depends on: T12

Run unattended by the main session after T12, so the regenerated agent files exist. A build subagent cannot run it, because it is already one layer down. From the repo root, run each command and keep its final stdout lines:

```bash
probe_dir=$(mktemp -d)
claude -p --allowedTools "Agent,Write,Edit" --output-format text "Use the Agent tool to dispatch the prism-verify subagent with exactly this prompt: 'Probe only. Run no check, commit nothing, and do not use Bash. Use the Write tool once to create $probe_dir/probe.txt holding the text x, then use the Edit tool once to change x to y in it. Then reply with exactly one line: PROBE write=<ok, or failed: reason> edit=<ok, or failed: reason>.' Then print the subagent's reply verbatim and nothing else."
test -e "$probe_dir/probe.txt" && echo "PROBE file=present" || echo "PROBE file=absent"
claude -p --allowedTools Agent --output-format text "Use the Agent tool to dispatch the prism-review subagent with exactly this prompt: 'Probe only. Review nothing and write no file. Use the Agent tool once to launch a general-purpose subagent with the prompt: Reply with exactly the word pong. Then reply with exactly one line: PROBE inner=<that subagent's reply>, or PROBE inner=failed: <the error or the reason no Agent tool was available>.' Then print the prism-review subagent's reply verbatim and nothing else."
```

The outer session allows `Write` and `Edit` so a permission denial cannot stand in for a missing tool. As a positive control, run the first command once more with `general-purpose` in place of `prism-verify` and a fresh `mktemp -d` directory; it must print `PROBE write=ok edit=ok`, or the verify result is recorded as inconclusive rather than as the allowlist holding. The allowlist holds for verify when the first line reports both `failed` and the file check prints `PROBE file=absent`. The review keeps dispatch when its line is exactly `PROBE inner=pong`. Record the result either way; a failure does not fail the task. When the verify line shows `Write` or `Edit` worked, or the review line is not `PROBE inner=pong`, the session lists it in the part 2 PR body and the closing summary as an open item and sends it to `prism-architect` as a scope finding, because T11's paragraph and the review's list then claim more than the host does. Before the PR opens, the session also rewrites T11's allowlist sentence in both `skills-ecosystem.md` files to state what the probe showed, keeping the two identical, as a `## Decisions` entry under the scope-change rule.

Add `### Stage tools` to `hook-runtime.md` and its curated twin, directly after `### Nested dispatch`, in three short paragraphs: (1) the build writes a gated role's `tools` list into its Claude agent file, and on the probe date (Central time) the two commands above, in short form, gave the verbatim `PROBE write=`, `PROBE file=`, and `PROBE inner=` lines; (2) Codex's agent file has no tool allowlist — its subagents documentation, read 2026-11-27, lists `features.*` on/off switches and no tools key, and says an agent file cannot override `mcp_servers` — so Codex gets the list as a declaration in the rendered skill only, as a host limitation, and Cursor, which gets no agent files, gets the same; (3) a stage with a shell can still write through it, so the list is friction and not a wall. Then run `pnpm prism:build` to refresh the three host copies, and `pnpm prism:check`. The session appends one `## History` line quoting the three `PROBE` lines (REQ-13).

## Challenge

round 1: blocking 1
  - AC-11 (blocking): its evidence `grep -l '^tools' .codex/agents/*.toml` prints files once T8 and T12 land, because each Codex `.toml` embeds the rendered skill's frontmatter at column 0 inside `developer_instructions` (`.codex/agents/prism-verify.toml` lines 11 to 20 show `argument-hint:` there today), so the `tools: <list>` line matches and the criterion grades unmet on correct work; T12's own note says the `.toml` "gains no tools key". Match a TOML key instead, `grep -n '^tools *=' .codex/agents/*.toml` printing nothing, and give AC-4 the same care, since `grep -n '^tools:' .claude/agents/prism-verify.md` prints two lines for the same reason (the body repeats the frontmatter).
  - T11, T13 (non-blocking): T11 states "Claude Code reads that line as the agent's tool allowlist" in the canonical doc and the curated seed twin, which ships to consumers, before T13 probes it, and the spec says that semantic was never probed. Run the allowlist half of the probe before T7 against a scratch agent file with `tools: Read, Bash`, or have T13 amend T11's paragraph in both files when `PROBE write=` or `PROBE file=` contradicts it. Also say what happens when `PROBE inner=` is not `pong` under the review's list, since the epic's outcome is lost nested review.
  - T13 (non-blocking): its proof's `grep -q 'PROBE inner='` already passes on `main` (the Nested dispatch section of `hook-runtime.md` holds `PROBE inner=pong`), so it proves nothing about T13. Probe 1's `PROBE file=absent` check conflates "Write is not callable" with "the agent fell back to a Bash heredoc", so add "Do not use Bash" to the inner prompt.
  - T1 (non-blocking): `validateVerifyReport` says "non-empty string" for `check`, `file`, and `evidence`. A whitespace-only `check` writes `|   | pass | log |`, which `check-report.mjs` reads as a row named `""` and passes, and a `check` or `file` holding a space writes a Failures line `FAILURE_LINE` rejects downstream. State "non-empty after trim" and "no whitespace in `check` or `file`" so the shape error names the field.
  - T3, T5 (non-blocking): verify's and review's lists name `Bash` only, while the hook runtime registers its shell gates on `Bash|PowerShell`. If Claude Code on Windows can offer `PowerShell` in place of `Bash`, a gated verify there has no shell. Unverified here; check before T8, because fixing it changes REQ-4's exact lists and would be major.
  - T11 (non-blocking): the paragraph does not say a `tools` list on a gated agent also drops any MCP tool the consumer's session carries (a tracker connector, for one) unless the list names an `mcp__` entry. Unverified; if the probe shows it, say it in the paragraph, since consumers on a Linear tracker are the ones it surprises.
  - plan (non-blocking): the ACs are not split by part, so part 1's review grades AC-2, AC-3, AC-4, AC-7, AC-9, AC-10, AC-11, and half of AC-12 as unmet at its head. Child 10 got through the same shape by judgment. Tag each AC `(part 1)` or `(part 2)`, or add a Decision saying part 1's review grades only what part 1 builds (AC-5, AC-6, AC-8, AC-13, AC-14, and the `review-runtime.md` half of AC-12).
  - T10 (non-blocking): "the session writes what the report's `Plan record` heading holds" reads oddly when the review itself runs in the session, because the session is the reviewer. Say "write it yourself when you have Edit and Write, and hand it over only when you were dispatched without them".
  - plan (non-blocking): `.ai-skills/README.md` line 9 lists the `frontmatter.yml` keys without `tools`, and `prism-forge-skill`'s scaffolding does not tell an author that a gated role now needs one. Both sit outside Affected systems, so list them for the PR body.

round 2: blocking 2
  - T3, T4 (blocking): both say to show "the spec's JSON example", which has `"verdict": "done"` beside a non-empty `blocked` array, and T1's `validateVerifyReport` rejects that pairing with exit 2 (T1 test 1 already swaps in `blocked: []`). A builder copying the example verbatim documents a report the script refuses, in the verify body and in `review-runtime.md`. Put one example inline in T3 and T4, identical in both, with `blocked: []` and a `done` verdict, or a `blocked` verdict whose `blocked` entry and `n/a: blocked` row match.
  - AC-8 (blocking): its evidence `grep -c 'verify/record.mjs' .ai-skills/skills/prism-verify/shared.md` prints at least 2, but T3's text holds the literal `verify/record.mjs` on one line only (the "Writing the section" paragraph; every other mention is bare `record.mjs`), so the criterion grades unmet on correct work. Change it to at least 1, or have a second T3 line spell `verify/record.mjs`.
  - T3, T10 (non-blocking): the report is written by `cat > <dir>/<name>.json <<'EOF'`, and the write gate keeps a heredoc body in its path scan when the body holds a backtick or `$(`, as review finding summaries usually do. Any routed path named in a summary then needs its docs read first, with a `cat` remedy. Say so in the two bodies, or tell the run to keep backticks out of the JSON strings.
  - T13, T11 (non-blocking): the failure branch only lists an open item and sends it to `prism-architect`, so T11's "Claude Code documents that line as the agent's tool allowlist" can merge into `skills-ecosystem.md` and its consumer twin after `PROBE write=` or `PROBE file=` contradicts it. Add a step: when a probe contradicts it, the session amends that sentence in both files before the PR opens.
  - T4 (non-blocking): `All five are` to `All six are`, and the proof's `grep -q 'All six'`, add a count to a doc that is meant to carry rules, per the Count rules, not numbers section of `writing-voice.md`. Write `All of these are`.
  - T11 (non-blocking): the paragraph, identical in the consumer twin, names `roles.json` and "the build", and a consumer has neither (`hook-runtime.md` says a consumer has no `roles.json` on disk). `install-layout.md` Test 2 asks a twin to attribute the mechanism to PRISM instead. Reword to "each role the PRISM build marks gated", still identical in both files.

round 3: blocking 1
  - T4 (blocking): round 2's example finding is fixed in T3 (inline example, `"verdict": "done"`, `"blocked": []`) and not in T4, whose paragraph (2) still says "The spec's JSON example in a `json` fence". That example pairs `"verdict": "done"` with a non-empty `blocked` array, which T1's `validateVerifyReport` rejects with exit 2, so a builder following T4 as written documents in `review-runtime.md` a report the script refuses. Replace it with "the same JSON example T3 shows in the verify body, copied verbatim".
  - T4, T9 (non-blocking): part 1's `review-runtime.md` says `HOOK_RUNTIME_FILES` delivers `verify/record.mjs` ("All of these are ... delivers them") and names the consumer command `node .claude/hooks/verify/record.mjs`, but `update.ts` gains the entry only in T9, in part 2. That is a diverged claim at part 1's head, Major under `architect-doc-verification.md`. Extend the Decision on each part's review to say part 1 does not grade the delivery claim, or move those two Invocation edits into T9's task.
  - T13 (non-blocking): `PROBE write=failed` with `PROBE file=absent` is absence evidence with no positive control, so a permission denial on a path outside the repo reads as a missing tool. Run the same Write prompt to a `general-purpose` subagent under the same outer flags and require `write=ok edit=ok` there, or require the failure text to say the tool is unavailable.
  - T10 (non-blocking): the Landing a plan-only commit section of `branch-plan.md` and the Authors ship, reviewers review section of `skill-routing.md` both say a reviewer commits and pushes a flat plan's record, which T10 moves to the session for a dispatched review. Both sit outside Affected systems, so add them to the Decision that lists `branch-plan.md` and `plan-authoring.md` as open items for the PR body.

round 4: resolved 1
  - AC-11 (non-blocking): its second evidence command, `grep -n 'Codex' .prism/architect/_toolkit/hook-runtime.md`, prints lines on `main` today because the doc already names Codex throughout, so it cannot show the `### Stage tools` section records the limitation. Scope it the way T13's proof does: `awk '/^### Stage tools/{f=1; next} /^#/{f=0} f' .prism/architect/_toolkit/hook-runtime.md | grep -c 'Codex'` prints at least 1.
  - T10 (non-blocking): the new flat-plan bullet (line 42) still says "The session writes them to the plan, commits it ..., and pushes it" with no condition, while line 52 says a review run in the session writes the record itself. Open the sentence with "When dispatched without Edit and Write," so the two lines agree.
  - T2 (non-blocking): `PR_PATTERN` accepts a digit run past `Number.MAX_SAFE_INTEGER`, which `parseArgs` stores and `main` passes on after two `gh` calls, so `reconcile()`'s new guard throws an uncaught error (exit 1) where REQ-16 says exit 2. Have the `parseArgs` branch also require `Number.isSafeInteger` of the parsed value, else fall through to `unknown argument`.
  - Confirmed fixed from round 3: T4 paragraph (2) now copies T3's example, and every other round 3 item (T9 delivery claim, T13 positive control, T10 session-writes open items) is covered by a Decision or by T13's text. No finding is major.

## Decisions

- **The plan stage ran as a subagent.** The session's context was long, so it dispatched this stage in a fresh context with the folder path. The skill expects it to run in the session, and the cost is that the stage read the spec and code cold rather than from the session's memory.
- **This child ships as a two-PR stack, cut after T5.** The work touches well over 10 files once the regenerated copies count, past the point where Hunter asks for a split. Part 1 (`verify/record.mjs`, the verify body, the reconcile check, and the runtime doc) has value alone. Part 2 (the tool lists, the delivery of `verify/record.mjs`, the review body, the probe) needs part 1 first, because `prism-verify` loses `Write` in part 2 and must already have the script to write through. Rejected: cutting the tool field into its own part ahead of the record script, which would ship a verify agent with no supported way to write its section.
- **Part 1 ships from T5, not from the resume table.** After T5, part 1's verify, review, and PR stages run while T6 to T13 are still open. The resume table would read "a task with no commit naming it" and send the session back to implement, so the session drives part 1's verify, review, and PR from this Decision, and part 2 resumes from T6 on its own branch cut from `main`. The retro waits for part 2: `prism-retro` runs once, after part 2's review, on the whole plan.
- **Codex gets the declaration only.** This resolves the spec's open question on a Codex tool allowlist. Codex's subagents documentation, read 2026-11-27 (developers.openai.com redirects to learn.chatgpt.com), lists `name`, `description`, `developer_instructions`, model keys, and `features.*` on/off switches for an agent file, with no tools key, and says the file cannot override `mcp_servers`. The read covered most of the page and the config reference's `agents` table, not every line. Rejected: setting `features.shell_tool = false` on Codex agents, which would stop verify running checks and `record.mjs` at all.
- **`prism-implement` and `prism-challenge` also get `WebFetch` and `WebSearch`.** The spec's Decision gives them to the review because its body says to check a framework behavior or vendor API at the source. Both of these bodies say the same thing in their Startup, and both tools only read, so this extends that ruling to its sibling cases. Rejected: leaving them off, which would push the same check through `curl` in the shell with no gain.
- **`verify/record.mjs` pairs `verdict` with `blocked`.** A `blocked` verdict with no `blocked` entries, or a `done` verdict with some, is a shape error. `prism-verify` already forbids both, and without the rule a `blocked` report with no entries passes `checkReport` as `verdict is blocked: (none given)`. This tightens the spec's shape list; it follows from the outcome that the writer cannot produce a section the skill forbids.
- **`verify/record.mjs` reaches consumers in part 2, not part 1.** `update.ts` imports `generate-skills.ts`, so with the delivery task in part 1 the bundle check added an import edge from it to the part 2 task that owns `generate-skills.ts`, and reported the cycle T2 -> T8 -> T7 -> T6 -> T2 under the old numbering. Child 10 met the same shape and moved the work across the cut (its plan's Decision on the label removal). Moving the generate-skills edit into part 1 would pull the tool lists, and with them the review body, into part 1 and undo the cut. Between the two merges the part 1 verify body names `.claude/hooks/verify/record.mjs`, which a consumer update does not yet deliver. No consumer receives either part until the next npm publish, which comes after both, so the gap never reaches one. PRISM's own tree runs the script from `scripts/ai-skills/hooks/` and is unaffected.
- **Each part's review grades only its own criteria.** Part 1's head carries no tool lists, so its review grades AC-5, AC-6, AC-8, AC-13, AC-14, and the `review-runtime.md` half of AC-12, and reads the rest as part 2's. That includes the delivery claim T4 writes into `review-runtime.md` (the consumer command `node .claude/hooks/verify/record.mjs` and the delivered-files sentence), which is true only once T9 lands, for the reason the Decision on delivery in part 2 gives: no consumer receives part 1 before part 2. Part 2's review grades every criterion. Tagging each criterion with its part was considered and left out, because the IDs already map to tasks and the split is two lines here.
- **Tests and the code they import share a task.** T1, T2, T7, and T9 each write the failing test first inside the task. A separate test task would import a file the implementation task owns, and the bundle check would add an import edge back to it and report a cycle.
- **`reconcile.d.mts` and `utils.ts` stay unchanged.** Both are in Affected systems. `reconcile()` keeps `pr: number`, `parseArgs` is not exported, and `parseFrontmatter` already reads a one-line `tools:` value, so neither file needs an edit, and `commit.mjs` rejects an unchanged path.
- **`branch-plan.md` and `plan-authoring.md` keep naming Briar as the writer of `## Review Issues`.** After T10 the review still authors those entries and the session writes them to the file. Both docs sit outside Affected systems, and Briar's authorship of the content is unchanged, so they are listed for the part 2 PR body as an open item rather than edited here. the Landing a plan-only commit section of `branch-plan.md` and the Authors ship, reviewers review section of `skill-routing.md` join them: both say a reviewer commits and pushes a flat plan's record, which after T10 the session does for a dispatched review.
- **Open items for the part 2 PR body, outside Affected systems.** `.ai-skills/README.md` lists the `frontmatter.yml` keys without `tools`, and `prism-forge-skill` does not tell an author that a gated role now needs a list. Whether Claude Code on Windows can offer a gated agent `PowerShell` in place of `Bash`, which would leave verify with no shell under `Read, Bash`, is unverified, and so is whether a `tools` list drops a consumer's MCP tools (T11 states the documented behavior). Each goes to the PR body and the closing summary as an open item, not into this plan's tasks.
- **Proofs chain with `&&` and `! grep`.** A `; test $?` tail reports only the last command, which child 10's challenge round 3 flagged, so no proof here uses it.
- **Each file belongs to one task.** The brief's "one task per file" is read as the skill's rule that a file belongs to one task, not as one file per task, which the build tasks and the ten-file frontmatter task could not meet.

## History

- 2026-11-27 [huntermcgrew/prism-557-stage-tools]: Plan stage wrote 13 tasks across a two-part stack (T1–T5 the verify record script and reconcile fix; T6–T13 the tool lists, review body, and probe) from the spec at 5f92de79.
- 2026-11-27 [huntermcgrew/prism-557-stage-tools]: T1 added `verify/record.mjs`, which writes `## Verification` from a verify report and runs `checkReport` over the result before writing, so the writer and `check-report.mjs` cannot disagree on the section's shape.
- 2026-11-27 [huntermcgrew/prism-557-stage-tools]: T2 made `reconcile.mjs` take `N`, `#N`, or a URL ending `/pull/N`, the forms `post.mjs` takes, exit 2 on any other form, and throw in `reconcile()` before any gh call on a pr that is not a positive safe integer.
- 2026-11-27 [huntermcgrew/prism-557-stage-tools]: T3 made prism-verify write `## Verification` only through `verify/record.mjs` from a report JSON written in a `mktemp -d` directory, and carry unchanged rows into the report on a re-run because the script always writes the whole section.
- 2026-11-27 [huntermcgrew/prism-557-stage-tools]: T4 documented `verify/record.mjs` (its report shape, the `checkReport` run before the write, and its exit codes) in `review-runtime.md`, and the `N`, `#N`, and `/pull/N` forms `reconcile.mjs` now takes.
- 2026-11-27 [huntermcgrew/prism-557-stage-tools]: T5 regenerated the prism-verify skill and agent copies and the review-runtime.md mirrors from the T3 and T4 sources.

## Sessions

- 2026-11-27 [huntermcgrew/prism-557-stage-tools] open: Intent — plan child 11 (stage tool lists, verify record script, reconcile PR check); Bounds — plan.md only, tasks inside Affected systems, no build; Approach — two-part stack with tests in the same task as the code they import

## Verification

verdict: done
base: 8c53b07a
head: b65cc834

| check | result | evidence |
| --- | --- | --- |
| typecheck | pass | /tmp/tmp.4LKYX3l0Wv/typecheck.log |
| lint | pass | /tmp/tmp.4LKYX3l0Wv/lint.log |
| test | pass | /tmp/tmp.4LKYX3l0Wv/test.log |
| build | pass | /tmp/tmp.4LKYX3l0Wv/build.log |
| format | n/a: not configured | none |
| spec | pass | /tmp/tmp.4LKYX3l0Wv/spec.log |

### Failures

- none

## Review

## PR Readiness

Retro:
