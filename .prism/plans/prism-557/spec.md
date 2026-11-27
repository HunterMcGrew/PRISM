---
title: Stage tools — declared tool lists, and verify writes its record by script
ticket: https://github.com/HunterMcGrew/PRISM/issues/557
stage: spec
status: draft
epic: prism-499
child: 11
---

Child 11 of the Kitchen Line epic (#499). The design source is `.prism/plans/prism-499/spec.md`: row 11 of its second Children table and the "Tools per stage, records by script" part of its "Third amendment, 2026-11-26" section. The epic's approved `intent.md` covers this child through "Each stage skill declares the tools it may use. The verify stage and the review stage get no Edit and no Write" under Skills, and the "Reviewer tools" and "Skills" lines of its third amendment.

The checked starting point is `main` at `8c53b07a`, after child 10 (#554, #556) merged `review/record.mjs`, `review/post.mjs`, `review/ignore.mjs`, `prism-review` as a gated role, and the nested-dispatch probe.

## Requirements

### The `tools` field

1. A skill's `frontmatter.yml` may carry `tools: <Name>, <Name>, ...` on one line. The build fails, naming the skill, on an empty list, an empty entry, a repeated name, or a name that is neither a bare tool name (`^[A-Z][A-Za-z]*$`) nor an MCP name (`^mcp__\S+$`).
2. Every stage skill declares `tools`: `prism-intent`, `prism-design`, `prism-spec`, `prism-plan`, `prism-challenge`, `prism-implement`, `prism-docs`, `prism-verify`, `prism-review`, and `prism-retro`.
3. The generator writes the declared list as `tools: <list>` into the Claude agent file of every role marked `gated: true` in `roles.json`, after the `model:` line. The build fails when a gated role declares no `tools`. A role that is not gated gets no `tools:` line in its agent file, so it inherits every tool as it does today.
4. `prism-verify` declares exactly `Read, Bash`. `prism-review` declares exactly `Read, Grep, Glob, Bash, Agent, WebFetch, WebSearch`. Neither list holds `Edit`, `Write`, or `NotebookEdit`.
5. Every other stage's list holds the tools its body uses: read, search, and shell for all of them, `Edit` and `Write` where the body writes a file, `Agent` where it dispatches, and any other tool its body names.
6. A test pins each stage skill's list to an expected value, checks each gated role's generated `.claude/agents/<id>.md` carries the same list, and checks the generated `prism-review` and `prism-verify` agent files name no `Edit` and no `Write`.

### The verify record

7. `node <runtime>/verify/record.mjs <plan.md> <report.json>` replaces the body of the plan's `## Verification` section with the section `check-report.mjs` parses, built from the report, and touches nothing else. A plan with no `## Verification` gets the heading at the end of the file.
8. It exits 0 when the section is written, and 2 on a missing argument, an unreadable plan or report, a report that is not valid JSON or not in the shape under Design, or a composed section that `checkReport` finds a problem in other than a `blocked` verdict. On exit 2 it writes nothing.
9. A section `record.mjs` writes from a `done` report passes `check-report.mjs` with exit 0, and one written from a `blocked` report fails it only with its `verdict is blocked:` lines.
10. `verify/record.mjs` carries the runtime marker and a `.d.mts` sidecar, joins `HOOK_RUNTIME_FILES`, and reaches a consumer's `.claude/hooks/verify/record.mjs`.
11. `prism-verify` writes `## Verification` only through `record.mjs`, including a re-run, where it carries the unchanged rows into the report it hands the script. It commits through `plan/commit.mjs` as today.

### The review body

12. `prism-review` writes its round report JSON to a file in the OS temp directory through the shell, as it no longer has Write. On a flat plan it hands its `## Review Issues` entries, its Cleanup Items and PR Readiness state, any proposed criteria, and the plan file it would have created to the session in its report, and the session writes them. A lesson it would have appended is listed in the report for the session to append.

### Hosts

13. A live run on Claude Code shows whether the generated `prism-verify` agent can call `Edit` or `Write`, and whether the generated `prism-review` agent, under its list, can still launch a subagent. Both results, either way, are recorded in `hook-runtime.md` and in `plan.md`.
14. Codex's agent file is checked for a tool allowlist. Where it has one, the generator writes the same list for gated roles. Where it has none, Codex gets the declaration only, and `hook-runtime.md` records it as a host limitation. Cursor, which gets no agent files, is recorded the same way.

### Docs

15. `review-runtime.md` gains a `## verify/record.mjs` section with its arguments, report shape, and exit codes, and its Invocation paragraph names it. `skills-ecosystem.md` states the `tools` field contract, and its curated seed twin carries the same sentence.

### Folded in

16. `reconcile.mjs` takes its PR argument as `N`, `#N`, or a URL ending `/pull/N`, the pattern `post.mjs` uses, and exits 2 on anything else, `0` and a leading zero included. The exported `reconcile()` throws before any `gh` call when `pr` is not a positive safe integer.

17. `pnpm prism:check` passes on both CI platforms.

## Design

### Where the list lives and where it goes

`frontmatter.yml` holds the list as one comma-separated line, the same string a Claude agent file's `tools:` takes, so the generator copies it without reshaping. `parseFrontmatter` in `utils.ts` already reads a single-line value, so no parser change is needed. A YAML list would need one.

The line also passes into each rendered `SKILL.md`, the way `category:` already does on `prism-retro` with no host complaint. There it is a declaration the model reads. It is not `allowed-tools`, which only pre-approves tools and removes none.

`buildClaudeAgentMarkdown` takes the role's `gated` flag and the parsed list, writes `tools:` for a gated role, and throws for a gated role with none. Validation (requirement 1) runs in `loadSkillSource`, beside the description-length check, so a bad list fails for every skill, gated or not.

`gated` is the existing flag for "runs as a subagent from a plan folder", and it already marks exactly the stages a session dispatches: `prism-spec`, `prism-challenge`, `prism-implement`, `prism-docs`, `prism-verify`, and `prism-review`. `prism-intent`, `prism-design`, `prism-plan`, and `prism-retro` run in the session, so their list is the declaration only. `prism-intent`, `prism-design`, and `prism-retro` still get an agent file as personas, and it stays unrestricted, because a list written for a session-run stage would be a guess about a dispatch nobody makes.

Child 12 also edits `buildClaudeAgentMarkdown`, for the builder model pin. The two children merge in either order, and the second rebases onto the first.

### Lists

Requirement 4 fixes verify and review. For the rest, the plan reads each body and writes the list from what it tells a run to do. A write-capable stage starts from `Read, Grep, Glob, Bash, Edit, Write`, adds `Agent` where the body dispatches a subagent, and adds any other tool the body names. The pin test then holds those values.

Tool names are Claude Code's. Claude Code dispatches a subagent as `Agent`, and older builds named it `Task`. The lists name `Agent` only, because the probe in requirement 13 runs on the current build, and the brief gate already matches both names on the dispatching side.

### What it proves

A stage with a shell can still write through it, so the list is friction and not a wall. What it removes is the edit tools a reviewer used to fix plan drift by hand, which is the behavior the third amendment cut. Claude Code's docs describe an agent file's `tools:` as an allowlist. The epic read that on 2026-11-27 and did not probe it, and this spec did not re-read the docs. Requirement 13 runs the probe.

The review's list must keep `Agent`. Child 10's probe showed a dispatched `prism-review` launching a subagent when it inherited every tool. An allowlist is a different case, so the probe reruns under the list.

Codex is unchecked. From memory and not verified: Codex's agent `.toml` may take a `sandbox_mode`, but a read-only sandbox would stop `record.mjs` writing `plan.md`, so it is no substitute for a tool list. The plan reads Codex's docs before deciding.

### `verify/record.mjs`

The report the verify run hands the script:

```json
{
  "verdict": "done",
  "base": "8c53b07a",
  "head": "1a2b3c4d",
  "blocked": [{ "check": "build", "why": "pnpm not on PATH" }],
  "rows": [{ "check": "typecheck", "result": "fail", "evidence": "/tmp/verify/typecheck.log" }],
  "failures": [{ "check": "typecheck", "file": "scripts/lib/parse.ts", "line": 42 }]
}
```

- `base` and `head` match `^[0-9a-f]{7,40}$` once trimmed. `rows` is a non-empty array. `blocked` and `failures` are arrays and may be empty. `line` is optional and a positive integer when present.
- A cell holding `|` or a newline is a shape error, because it would break the table `check-report.mjs` reads.
- The script composes the section in the shape `prism-verify` shows today: `verdict:`, `base:`, `head:`, one `blocked: <check>: <why>` line per blocked entry, the table, then `### Failures` with one line per failure, or `- none`.
- It then runs `checkReport`, imported from `check-report.mjs`, over the plan with the new section in place. A problem other than `verdict is blocked: ...` exits 2 and writes nothing. Reusing the checker keeps one copy of the row and failure rules, so the writer can't drift from the reader.
- The section is replaced from the line after `## Verification` to the next `## ` heading, and nothing outside it changes.

Exit codes follow the plan-chain scripts, 0 and 2. There is no held condition, so no exit 1: a `blocked` run is written like any other, and `check-report.mjs` is what fails it.

On a re-run, `prism-verify` reads the current section, keeps each row, Failures line, and `blocked:` line the changed files don't reach, and hands the whole set to the script. The script always writes the whole section, so it never has to merge.

### `prism-review` without Write

Child 10 left three writes in the review body that a tool list without Edit or Write blocks: the report JSON temp file, the flat-plan record, and the lessons append.

- **The temp file** is written through a shell heredoc into the OS temp directory, outside the repo, so no architect route matches it.
- **The flat-plan record** goes to the session. The epic already says a legacy flat plan keeps `## Review Issues` and the session writes it. The review hands the entries, the checklist state, proposed criteria, and a missing plan file in its report.
- **A lesson** is listed in the report under its own heading, and the session appends it.

When the review runs in the session, because a host can't dispatch or a person invoked it directly, the session is the one writing, so the body reads the same both ways.

### `reconcile.mjs` argument check

`parseArgs` today accepts `/^\d+$/`, so `0` and `007` pass, and `#12` and a PR URL are rejected while `post.mjs` accepts them. The CLI takes `post.mjs`'s pattern, `^(?:#|https?:\/\/\S+\/pull\/)?([1-9]\d*)$`, as its own constant. A shared module for one regex is not worth an import between two scripts that otherwise share nothing. `reconcile()` adds a guard so an importing caller can't splice a bad value into `pulls/${pr}` either.

### Shared contracts

These change in this child, and none of them is a dependency:

- the Claude agent files a consumer receives for the six gated roles, which go from every tool to a fixed list
- `frontmatter.yml`'s accepted keys, which gain `tools`
- the delivered hook runtime, which gains `verify/record.mjs`
- `reconcile.mjs`'s CLI, which accepts `#N` and a PR URL and rejects `0` and a leading zero

## Affected systems

```text
.ai-skills/skills/prism-intent/frontmatter.yml
.ai-skills/skills/prism-design/frontmatter.yml
.ai-skills/skills/prism-spec/frontmatter.yml
.ai-skills/skills/prism-plan/frontmatter.yml
.ai-skills/skills/prism-challenge/frontmatter.yml
.ai-skills/skills/prism-implement/frontmatter.yml
.ai-skills/skills/prism-docs/frontmatter.yml
.ai-skills/skills/prism-retro/frontmatter.yml
.ai-skills/skills/prism-verify/**
.ai-skills/skills/prism-review/**
scripts/ai-skills/generate-skills.ts
scripts/ai-skills/utils.ts
scripts/ai-skills/update.ts
scripts/ai-skills/*.test.ts
scripts/ai-skills/hooks/verify/**
scripts/ai-skills/hooks/review/reconcile.mjs
scripts/ai-skills/hooks/review/reconcile.d.mts
.prism/architect/_toolkit/hook-runtime.md
.prism/architect/_toolkit/review-runtime.md
.prism/architect/_toolkit/skills-ecosystem.md
templates/install/.prism/architect/_toolkit/**
.prism/plans/prism-557/**
.prism/lessons.md
.claude/**
.codex/**
.cursor/**
```

The three host directories are regenerated by `pnpm prism:build` and committed. `templates/install/.prism/architect/_toolkit/` holds the seed mirror of the two runtime docs and the curated twin of `skills-ecosystem.md`.

## Decisions

- **The tool list is written only for gated roles.** The epic writes it "for a stage that runs as an agent". `gated` already marks exactly those roles, and a test already holds the brief gate's copy equal to it. Considered: writing it into every agent file whose skill declares one. Rejected, because `prism-intent`, `prism-design`, and `prism-retro` run in the session, and a list on their agent files would restrict a dispatch the workflow never makes.
  - → promoted to .prism/architect/_toolkit/skills-ecosystem.md
- **The review keeps `WebFetch` and `WebSearch`.** The epic lists read, search, shell, and dispatch tools for the review. Its body tells it to check a framework behavior or vendor API at the source rather than from memory, and both tools only read. Leaving them off would push that check through `curl` in the shell, with no gain for the no-Edit, no-Write outcome. This follows from the approved outcome, so it goes ahead as a Decision.
  - → no promotion needed (codified in the review's `tools` line, which `stage-tools.test.ts` pins)
- **The flat-plan review record moves to the session.** A review dispatched with no Edit or Write can't write `## Review Issues`, create a missing plan, or append a lesson. The epic already gives `## Review Issues` to the session on a flat plan. The review hands every one of those writes to the session in its report. This follows from the approved outcome.
  - → promoted to .prism/architect/_toolkit/skills-ecosystem.md
- **`reconcile.mjs`'s PR check is folded in.** Child 10 gave `post.mjs` a PR pattern and left `reconcile.mjs` building `pulls/${pr}` from an unchecked value, noted in its PR body. The fix is one constant and one guard in a review-runtime script, beside the verify script this child adds. The main session asked for it in this child's brief.
  - → promoted to .prism/architect/_toolkit/review-runtime.md
- **OPEN — TBD, needs the Codex docs read during planning.** Whether a Codex agent `.toml` takes a tool allowlist. **Default path (used until resolved):** Codex gets the declaration only, through the rendered `SKILL.md`, and `hook-runtime.md` records it as a host limitation.
  - → no promotion needed (resolved by the plan's Codex Decision, which is promoted to .prism/architect/_toolkit/hook-runtime.md)
