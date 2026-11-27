---
title: One review — rename self-review, retire the PR reviewer and labels
ticket: https://github.com/HunterMcGrew/PRISM/issues/553
stage: spec
status: draft
epic: prism-499
child: 10
---

Child 10 of the Kitchen Line epic (#499). The design source is `.prism/plans/prism-499/spec.md`: row 10 of its second Children table, the "One review" part of its "Third amendment, 2026-11-26" section, the Review part of its Design, and the `skill-routing.md`, `git-conventions.md`, and `followup-scope.md` lines under "Always-on rule edits". The epic's approved `intent.md` covers this child through its third amendment ("One review", "Review exit", "Review scope", "Never-reviewed paths", "Labels", "Reviewer tools", "Merge"). Issue #553 carries the same scope as acceptance criteria.

The checked starting point is `main` at `ceab998d`. The shipped `1.0.0` tree is `37cdbd28`, the child-9 merge. `1.0.0` was never published to npm, so "an upgrade from the shipped `1.0.0` tree" means a consumer adopted from a pack of `37cdbd28`, then updated from a pack of this branch.

## Requirements

### Rename and retirement

1. `.ai-skills/skills/prism-self-review/` becomes `.ai-skills/skills/prism-review/`. Its `roles.json` entry is renamed `prism-review`, keeps `persona: "Briar"` and `routing: "auto"`, and gains `gated: true`.
2. `prism-review`'s frontmatter takes `model: opus`, the stronger of the two skills' settings (`prism-pr-review` had `opus`, `prism-self-review` had `sonnet`). Its description keeps "Briar" and adds "Eric", "review pr", "review #123", and a PR URL to its `Triggers:` line.
3. `prism-review` accepts no argument (the current branch) or a PR number or URL. With a PR, it reviews `origin/<baseRefName>..<head>` read-only through `gh pr diff` and `git show`, writes no plan, posts nothing, and reports in chat.
4. `prism-review` never approves, never posts, never flips a PR ready, and never edits source. After verify and before the PR opens, the session dispatches it as a fresh subagent with a path brief of at most 15 lines. A host that cannot dispatch runs it in the session.
5. `prism-pr-review`'s source moves whole to `.ai-skills/deprecated/prism-pr-review/`, with `.prism/references/pr-review/github-writes.md` and `.prism/architect/_toolkit/eric-review-modes.md` moved beside it. Its `roles.json` entry is removed. The build, the generators, and the npm `files` list do not read `.ai-skills/deprecated/`.
6. The reconcile stop gate is removed: `scripts/ai-skills/hooks/reconcile-gate.mjs`, its `.d.mts`, its test, its `HOOK_RUNTIME_FILES` and `HOOK_RUNTIME_ENTRY_POINTS` entries, and its `SubagentStop` registration in `templates/install/.claude/settings.json`, `templates/install/.codex/hooks.json`, and PRISM's own `.claude/settings.json` and `.codex/hooks.json`.
7. `GATED_ROLES` in `brief-gate.mjs` swaps `prism-pr-review` for `prism-review`, and its test still holds the set equal to the roles flagged `gated` in `roles.json`.
8. After `prism update` from the shipped `1.0.0` tree, the consumer has no `prism-pr-review` or `prism-self-review` directory under `.claude/skills`, `.cursor/skills`, or `.agents/skills`, no `prism-pr-review` or `prism-self-review` file under `.claude/agents` or `.codex/agents`, no PRISM entry under `SubagentStop` in `.claude/settings.json` or `.codex/hooks.json`, and no `.claude/hooks/reconcile-gate.mjs`. A consumer's own `SubagentStop` entry survives.
9. "Briar", "Eric", "review pr", "review #<n>", and a PR URL route to `prism-review` in `.prism/rules/skill-routing.md`, which still overrides the built-in `/review`. The "Authors ship, reviewers review" section loses its PR-review line.
10. `modelTiers.overrides` is read for `briar`, by the session's `prism-review` dispatch. The config schema's `modelTiers` description says so, and nothing reads `eric`.
11. The PR-review step leaves the standard stage list, the Advancing paragraph, and the resume table in `.prism/rules/workflow.md`, and leaves `.prism/references/shipping-flow.md`. The review row sits before the PR row and dispatches `prism-review`. No row follows the PR row except the retro row.
12. After each push, the session runs `review/reconcile.mjs <pr> --json` and appends one misses row per unlogged human comment to `.prism/metrics/review-misses.jsonl`, the step `prism-pr-review` used to own. `shipping-flow.md` says so.
13. Every live mention of `prism-pr-review`, `prism-self-review`, or Eric as a current reviewer is gone from the rules, architect docs, references, templates, skills, scripts, and generated `AGENTS.md` and `CLAUDE.md`. A sentence recording what Eric caught in the past, and every plan, retro, audit, and archived file, stays as written.

### The rulebook

14. `REVIEW.md`'s exit rule is zero Critical and zero Major, apart from decision items, with every pass reading `swept` or `n/a`. A Minor is fixed inside the rounds when it can be and never earns a round. At most two rounds. The confirm pass is gone. Minors, decision items, and any Critical or Major left after round 2 are listed in the PR body. A Critical or Major left after round 2 is also posted as an inline comment, and the run goes on.
15. The review reads `intent.md`, `spec.md`, and `plan.md` as its yardstick and raises no finding on their prose. `REVIEW.md`'s "whole PR is in scope" section, the plan-drift checklist line, and `.prism/review/intent-scope.md`'s "Plan drift is reconciled, not reported" section go. The PR body is never reviewed. Published docs, code comments, and the changelog earn a finding only when they are wrong about the code.
16. `reviewIgnore` in `.ai-skills/config.json` is a list of globs in the manifest route dialect. Unset, it takes a default from the hook runtime. Set, it replaces the default. The schema documents it, and a malformed value is a config error, as `stopPaths` is.
17. The default holds `.prism/plans/**`, `.prism/lessons.md`, `.prism/retros/**`, `.prism/audits/**`, `.prism/metrics/**`, `REVIEW.md`, `.githooks/**`, the delivered hook runtime directory, PRISM's generated outputs under each host directory, and `.prism/<g>` for each glob in `PRISM_OWNED_GLOBS`. A path under `.prism/` that `CONSUMER_OWNED_GLOBS` claims stays reviewable unless another default entry lists it, so a consumer's flat ADRs and `review/stack/` files are reviewed. A test holds the default's `.prism/` entries and its exceptions equal to the two lists in `scripts/ai-skills/ownership.ts`.
18. PRISM's own `.ai-skills/config.json` sets `reviewIgnore` to the plan folders, the working notes, and the generated host directories only, so its skills, rules, and `REVIEW.md` stay reviewable.
19. `node <runtime>/review/record.mjs <plan.md> <report.json>` appends `- review round <n> at <short sha>[ (part <k> of <m>)]: <verdict>` under `## Review`. `<verdict>` is `clean` when zero Critical and zero Major are open and every pass token is `swept — …` or `n/a: …`. Otherwise it is `<crit> critical, <maj> major, <min> minor, <nit> nit`. It exits 1 and writes nothing when any finding cites a never-reviewed path, and exits 2 on a round outside 1 and 2 or a malformed report.
20. `node <runtime>/review/post.mjs <pr> <file> <line> <body-file>` posts one inline comment on the PR's head commit, with `<!-- prism-agent -->` as its first line. It exits 1 and posts nothing when `<file>` is never-reviewed. The session posts decision items and leftover Critical or Major findings through it and never through `gh` directly.
21. A line with the old `self-review` or `pr-review` prefix stays valid wherever a script reads review lines. `plan-retro-line.ts` keeps reading `pr-review` lines unchanged, since child 13 rekeys it.
22. The review labels (`effort:glance`, `effort:quick`, `effort:deep`, `confidence:high`, `confidence:needs-judgment`, `confidence:standards-only`, `review:has-minors`), the `prism-verdict` marker, and `planLabels` and its callers are removed from `reconcile.mjs`, and the label text from the config schema. Reconcile keeps threads, human comments, PR-body headings, the misses log, and `--classes`.
23. `git-conventions.md` "Who merges": the main session may merge when `features.mainSessionMayMerge` is true, the plan's last review line reads `clean`, and CI is green on the head. A reviewer never merges. The schema's `mainSessionMayMerge` description matches.
24. `followup-scope.md` loses "Bookkeeping findings are recorded, not gated". Its "Spec content never rides an unrelated ticket" section and lint stay.
25. A new ADR, `0087`, records the one review and supersedes the parts of ADR-0011 and ADR-0078 that name Eric and the labels. Each of those two gets a status line pointing at it, and the ADR index lists it.
26. A live run on Claude Code shows whether a dispatched `prism-review` can launch its own subagents. The result, either way, is recorded in `hook-runtime.md` and in `plan.md`. Where it cannot, the review sweeps the passes itself and prints the same coverage line.
27. `pnpm prism:check` passes on both CI platforms.

## Design

### The stack

The ticket ships as a two-PR stack, as the epic's Children note says for a plan over ten files. Each part leaves a working review.

- **Part 1, rename and retirement:** requirements 1 to 13. `REVIEW.md` and the pass files are not touched. Between the merges, `REVIEW.md` still names both old skills and still says `prism-pr-review` posts decision items. Until part 2 adds `post.mjs`, the session lists decision items in the PR body. The labels stay in `reconcile.mjs`, and with no verdict line on any new PR, it leaves every label alone.
- **Part 2, the rulebook:** requirements 14 to 25. It starts with a plan-only commit naming part 1's tasks, per the stacked-ticket note in `plan-chain-scripts.md`, because a squash-merged part 1 reads as open tasks on part 2's branch.
- Requirements 26 and 27 belong to both parts. The live probe runs in part 1, because that is where the dispatched agent first exists under its new name.

A three-way cut, the scripts in one PR and the name sweep in another, would leave routing pointed at a retired skill between merges, so it is not proposed.

### Skill body

`prism-review`'s `shared.md` is `prism-self-review`'s body with these changes. Part 1 adds the PR-number input, the read-only PR range, and the dispatch boundary, and drops the "recommend `review pr` in a fresh chat" handoff. Part 2 changes the record step to `record.mjs`, the round cap to two, and the verdict to the new exit rule, and drops the in-place plan-drift fix. The `## Voice` block stays, and its greeting is still skipped as a subagent. The skill-loaded-lines cap still applies. `REVIEW.md` and `.prism/review/*.md` are outside the count.

The skill keeps no tool list in this child, so its generated agent file inherits every tool, `Agent` included. Child 11 adds the `tools` field, and its list keeps `Agent`.

### Nested dispatch

The epic records Claude Code's docs as saying a subagent may launch its own, up to three layers below the main conversation, when `Agent` is in its tool list. This spec did not re-read those docs. One observation from this run: it was itself a dispatched subagent, and its tool list held `Agent`. No call was made, so that shows the tool is offered, not that a nested call works. A task runs the live probe: dispatch `prism-review`, have it launch one pass subagent, and record whether the inner call returned. Codex stays unprobed and is recorded as such.

### Removing the stop gate from a consumer

Dropping the `SubagentStop` entry from the templates is not enough. `mergeHookRegistration` in `update.ts` walks only the event keys the source file holds, so a consumer's `SubagentStop` key, which the new source no longer carries, is never visited and PRISM's old entry survives. The merge has to drop PRISM-owned entries from every event key the target holds, then delete any key left empty, which it already does for visited keys.

`PRISM_HOOK_COMMAND_PATTERN`, `PRISM_CODEX_HOOK_COMMAND_PATTERN`, and doctor's `HOOK_COMMAND_PATH_RE` keep `reconcile-gate` in their alternation. The first two let the merge recognize the old entry as PRISM's, and the third lets doctor report a leftover registration whose file is gone. The JSDoc on each names it as a retired entry point.

`pruneStaleHookRuntimeFiles` removes the delivered `reconcile-gate.mjs` once it leaves `HOOK_RUNTIME_FILES`, and backs it up first, as it does for every marked file it prunes. A `.claude/hooks/reconcile-gate.mjs.bak` is the expected result.

Skill directories and agent files are removed by the existing orphan cleanup, which is keyed on the roster and the managed marker. Moving the source out of `.ai-skills/skills/` and the role out of `roles.json` is what triggers it. The two moved `.prism/` files reach a consumer's removal path through the existing "no longer ships" handling in `update.ts`.

`readSubagentStop` in `harnesses.mjs` has no other caller once the gate is gone, so it goes with it.

### `reviewIgnore`

A new runtime module, `review/ignore.mjs`, owns the default, the resolver, and the matcher, and both `record.mjs` and `post.mjs` import it. It goes through `compileMatcher` in `lib/match.mjs`, the one glob dialect. Its resolver follows `resolveStopPaths`: only an absent key takes the default, and a non-array value, a non-string entry, or a pattern holding `{` throws. The runtime is `.mjs` and cannot import `ownership.ts`, so the lists are written out and a test holds them equal.

The default carries the consumer exceptions as a second list, because a glob list has no negation. `classifyPath` checks consumer claims first for the same reason. Without the exceptions, `.prism/spec/**` would swallow a consumer's own flat ADRs.

The generated host outputs are the copied areas under `.claude/`, `.codex/`, and `.cursor/` (`rules`, `architect`, `spec`, `templates`, `references`, `review`, `SPEC.md`), the `prism-*` and `tdd` skill directories under each skill root, the `prism-*` agent files, and `.claude/hooks/**`. The plan enumerates them from `paths.json` and `COPIED_CONTENT_AREAS`. A consumer's own skills and settings files stay reviewable.

All three new modules join `HOOK_RUNTIME_FILES`, with `.d.mts` sidecars and the runtime marker, and `review-runtime.md` gets a section for each.

### `record.mjs`

The report the review hands the session is a JSON file:

```json
{
  "round": 1,
  "sha": "abc1234",
  "part": { "k": 1, "m": 2 },
  "passes": [{ "pass": "Correctness", "token": "swept — 3 entry points" }],
  "findings": [{ "severity": "minor", "kind": "nitpick", "file": "x.ts", "line": 4, "summary": "..." }]
}
```

`part` is optional. A bare `swept` token counts as unfinished, so the round is not `clean`. The script writes the one line and nothing under it, because the intent gives a plan one review line per round. Findings, criterion grades, and the coverage line go to the session in the review's report. The session puts what is left at the end into the PR body. It creates `## Review` when the plan has none. A stage commits the line through `plan/commit.mjs`. Exit codes follow the plan-chain scripts: 0 written, 1 a held condition, 2 usage or config.

`intent-scope.md`'s "Where the grades go" changes to match: grades go in the report, an unmet criterion is a finding, and criteria awaiting a person are listed in the PR body.

### `post.mjs`

It reads `github.owner` and `github.repo` from `.ai-skills/config.json` and exits 2 when either is missing. It reads the PR's `headRefOid` and posts through `gh api repos/<owner>/<repo>/pulls/<pr>/comments` with `side=RIGHT`, using an argv array with no shell. A body missing the marker gets it prepended. A 422, a line outside the diff, exits 1 naming the reason, and the session moves the item to the PR body, as `github-writes.md` does today. Its `gh` runner is injectable, so tests pass a fake `gh`, as `plan-watch-ci.test.ts` does.

### Text this child makes wrong

The sweep is `grep -rn -E 'prism-pr-review|prism-self-review|pr-review|review:has-minors|prism-verdict|effort:|confidence:|\bEric\b'` over `.prism/rules`, `.prism/architect`, `.prism/references`, `.prism/templates`, `.prism/review`, `.ai-skills`, `scripts/ai-skills`, `templates/install`, `REVIEW.md`, `AGENTS.md`, and `CLAUDE.md`. On `main` at `ceab998d` it hits these sources outside plans and generated copies:

- **Rules:** `skill-routing`, `workflow`, `branch-plan`, `git-conventions`, `followup-scope`, `code-standards`, `context-reuse`, `design-governance`, `architect-doc-verification`, `implementation-task-detail`, `lazy-artifacts`, `skill-authoring`, `writing-voice`.
- **Architect docs:** `skills-ecosystem`, `closing-messages`, `ticket-workflows`, `hook-runtime`, `review-runtime`, `plan-authoring`, `audit-workflow`, `stack-detection`, `onboarding`, `eric-review-modes`, `manifest.base.json`, and the live `manifest.json`.
- **References and templates:** `shipping-flow`, `pr-review/github-writes`, `triple-gated-adr-criterion`, `.prism/templates/plan.md`, `.prism/templates/pr-description.md`, `templates/install/AGENTS.md.tmpl`, `templates/install/.prism/architect/manifest.stub.json`.
- **Skills:** `prism-implement` (its opening line and its flat-plan close), `prism-retro` (it runs "after PR review").
- **Scripts:** `brief-gate.mjs`, `harnesses.mjs`, `update.ts`, `doctor.ts`, `verify-manifest-coverage.ts` (its `eric` fixture), `bootstrap-from-claude.ts` (its thrive name map), and the tests `brief-gate`, `hook-harnesses`, `hook-registrations`, `plan-runtime-delivery`, `persona-voice`, `reconcile-gate`, `review-reconcile`, and `doctor`.

`writing-voice.md` and `skill-authoring.md` mention Eric only as an incident citation or a generic "PR review", and are likely to stay. Each hit is judged by the rule in requirement 13. `spec-scope-lint` requires the plan to name every always-on rule and skill body this child edits, so the plan's tasks list each one.

### Shared contracts

These change in this child, and none of them is a dependency:

- the skill ID `prism-self-review` and the role `prism-pr-review`, both public names a consumer may type
- `.ai-skills/config.schema.json`: the new `reviewIgnore` key, and the `modelTiers` and `mainSessionMayMerge` descriptions
- the `REVIEW.md` record-line grammar, which `plan-retro-line.ts` reads
- the hook registration files a consumer receives, and `mergeHookRegistration`'s drop behavior
- `reconcile.mjs`'s `--json` output, which loses the label fields

## Affected systems

```text
.ai-skills/skills/prism-review/**
.ai-skills/skills/prism-self-review/**
.ai-skills/skills/prism-pr-review/**
.ai-skills/skills/prism-implement/**
.ai-skills/skills/prism-retro/**
.ai-skills/deprecated/**
.ai-skills/definitions/roles.json
.ai-skills/definitions/seed-curation.json
.ai-skills/config.json
.ai-skills/config.schema.json
.prism/rules/**
.prism/architect/**
.prism/references/**
.prism/templates/**
.prism/review/**
.prism/spec/adrs/_toolkit/**
.prism/plans/prism-553/**
.prism/lessons.md
scripts/ai-skills/**
templates/install/**
REVIEW.md
AGENTS.md
CLAUDE.md
.claude/**
.codex/**
.cursor/**
```

The three host directories are regenerated by `pnpm prism:build` and committed. `.claude/settings.json` and `.codex/hooks.json` are hand-edited registration files inside them.

## Decisions

- **This child's own review runs on the new exit rule.** Hunter ruled on 2026-11-27 that child 10 runs on zero Critical, zero Major, and two rounds, before part 2 writes that rule into `REVIEW.md`. Each part gets one review, by the review skill at its branch head, and no PR-review dispatch.
- **The docs sweep is child 16's.** `docs/personas.md`, `docs/workflow.md`, `docs/parameterization.md`, `docs/what-prism-writes.md`, `docs/adopting-into-existing-repos.md`, `docs/ai-skills/compatibility.md`, and `CHANGELOG.md` name the PR reviewer or the labels. The epic's row 16 gives the docs sweep and the changelog to child 16, so `docs/**` and `CHANGELOG.md` stay outside this spec. The review's docs pass may flag them, and the answer is that pointer.
- **The ownership patterns keep the retired entry point.** The epic says the gate's doctor and prune handling go. Taken literally, removing `reconcile-gate` from the update and doctor patterns would leave a consumer's old registration unrecognized, so it would survive every update and doctor would stop flagging it. The patterns keep the name, and only the delivery and entry-point lists drop it.
- **The record line stands alone.** `prism-self-review` wrote findings and criterion grades under its record line. The intent gives a plan one review line per round, and the findings already reach the session in the report and the PR body, so `record.mjs` writes the line only.
- **The generated agent file keeps `model: sonnet`.** Both old agent files were generated as `sonnet`, and only the frontmatter differed. "The stronger model setting of the two" is read as the frontmatter. Pinning the agent file through `CLAUDE_AGENT_MODEL_DEFAULTS` would choose a model neither skill ran on, and `modelTiers.overrides.briar` remains the way to pin one.
- **PRISM's own `reviewIgnore` leaves `templates/install/**` reviewable.** Most of it is mirrored by `pnpm prism:build`, but the curated twins in it are written by hand and ship to every consumer. Considered: listing the whole tree. Rejected, because a hand-written consumer file would then never be reviewed. Settled by the main session on 2026-11-27 as a small design call.
