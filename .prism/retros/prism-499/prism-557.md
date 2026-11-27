# Retro — PRISM-557

**Target:** `.prism/plans/prism-557/plan.md` and `spec.md`, both parts of the stack
**Grain:** per-pr
**Generated:** 2026-11-27
**Graded at:** `28484bbe`, the head of PR #562 (part 2). Part 1 is graded at its merge, `dc02db07` (PR #559, final head `254114c1`).

## Charter coverage

This run reached every source `.ai-skills/config.json#retroEvidence` declares: git, the GitHub PR platform (`gh` signed in), and GitHub Actions CI. No source reads `not configured for this team` or `unreachable this run`. All six questions are answered, and one answer waits on CI.

| Charter question | Answer | Sources | Gap |
| --- | --- | --- | --- |
| Did we do what we said? | Yes. T1 to T13 each have a commit naming them. This retro re-ran the machine evidence at `28484bbe`: `stage-tools`, `verify-record`, `review-reconcile`, and `plan-runtime-delivery` ran 84 tests with 0 failures. `.claude/agents/prism-verify.md` reads `tools: Read, Bash` and `prism-review.md` reads `tools: Read, Grep, Glob, Bash, Agent, WebFetch, WebSearch` in their first frontmatter block. No `.codex/agents/*.toml` carries a `tools =` key. The greps for AC-8, AC-9, and AC-12 printed as required, and the two `**Stage tools.**` paragraphs are identical. So AC-1 to AC-13 are met. AC-14 is met for part 1 and pending for part 2. | `## Tasks`, `## Acceptance Criteria`, `git log`, PR #559 and #562 bodies, local `tsx --test` and greps | AC-14 on part 2: `CI pending on 28484bbe` (ubuntu passed, windows in progress) |
| Were there issues or bottlenecks? | Three. The challenge took four rounds (blocking 1, 2, 1, then resolved), and each round found a proof or example the builder would have followed wrongly: AC-11 and AC-4 grepped a line the generated file repeats in its body, T3 and T4 showed a `done` report the script refuses, and AC-8 asked for two matches where one line existed. Part 1's round 1 found 1 Major, that `record.mjs` let through a row whose `check` the reader drops as a header. The `main` merge after #560 conflicted once, in the generated `prism-implement` agent file, and was regenerated. | `## Challenge`, `## Review`, `## History`, the `matchesHeaderOrSeparator` Decision | none |
| What improvements could we make? | Give a stacked ticket's earlier part a place in the resume handling, since PRISM-557 is the second ticket, after PRISM-553, whose plan wrote a Decision to route around the resume table (see Action Items). | `## Decisions`, `.prism/plans/prism-553/plan.md` | none |
| Did we follow the code standards? | Yes, after review. Verify passed at `eb79bef3`: typecheck, lint, test, build, and spec, with format `n/a: not configured`. Part 1 round 1 left 1 Major (fixed), 4 Minor, and 2 Nit, and round 2 was clean. Part 2 round 1 was clean with one decision item and one Minor (a stale comment on the `gated` flag, fixed in `acb38e5d`), and round 2 was clean. `reconcile.mjs 562 --no-write --json` reports `clean: true`. | `## Verification`, `## Review`, PR #562 body, `reconcile.mjs` | none |
| Did we do anything wrong, or could we have done better? | Two things. Part 1 merged after a direct `gh` check of comments and reviews and no `reconcile.mjs` run, to avoid reading two routed docs; the same answer came back at this retro (see Fidelity gap). And the epic spec carries a false sentence about a consumer pin (see Fidelity gap), which this ticket did not write but did not catch either. | `## Decisions`, `scripts/ai-skills/generate-skills.ts`, `.ai-skills/config.schema.json` | none |
| Are the tests passing? | Yes, at every head CI has finished. Part 1's `prism-check` passed on ubuntu and windows at merge. Part 2 passed on ubuntu at `28484bbe`. Verify ran the full suite green at `eb79bef3`, and 84 targeted tests pass locally at `28484bbe`. | `gh pr view --json statusCheckRollup`, `## Verification`, local `tsx --test` | `CI pending on 28484bbe` (windows), owned by the session's watcher |

## Fidelity gap

- **The epic spec's sentence on a consumer pin is false.** `.prism/plans/prism-499/spec.md` line 301 says "A consumer's per-persona pin still wins" over `inherit` for the builder's model. No builder pin exists. The generator takes the model only from `CLAUDE_AGENT_MODEL_DEFAULTS` and a fixed `sonnet` fallback (`generate-skills.ts` lines 127 to 130 and 255). `modelTiers.overrides` is the only per-persona pin in the config, and its schema says it is read only for `briar`, by the session's review dispatch. Child 12 shipped `inherit` for `prism-implement` as the sentence's first half asks, and the test the sentence names passes, so nothing shipped wrong. The second half promises a behavior no code has. This retro does not edit the epic spec.
- **Planned and shipped match on every requirement.** REQ-13's probes ran live: `PROBE write=failed` and `PROBE edit=failed` for the verify agent, `PROBE write=ok edit=ok` for the `general-purpose` control, and `PROBE inner=pong` for the review under its list. The Codex question the spec left open is settled: the subagents documentation lists no tools key, so Codex gets the declaration only.
- **Scope moved only through recorded Decisions.** These were `WebFetch` and `WebSearch` on `prism-implement` and `prism-challenge`, the `verdict` and `blocked` pairing in `record.mjs`, the delivery of `verify/record.mjs` moving to part 2, the export of `matchesHeaderOrSeparator` from `check-report.mjs` and its `.d.mts` (two files no task listed), and the Windows ruling. No Decision was refuted by the execution record, so there are no promotion cautions.
- **Part 1's `review-runtime.md` made a delivery claim that was true only after part 2.** The plan recorded it, and no consumer receives either part before the next publish, so it never reached one.
- **Prose elsewhere still names the old writer.** `branch-plan.md` (Landing a plan-only commit), `skill-routing.md` (Authors ship, reviewers review), and `plan-authoring.md` (the ownership rows for `## Review Issues`, `## Cleanup Items`, and `## PR Readiness`) say the reviewer commits and writes a flat plan's record, which a dispatched review no longer does. `.ai-skills/README.md` and `prism-forge-skill` do not say a gated role needs a `tools` list. `docs/what-prism-writes.md` and `docs/troubleshooting.md` lack the new script rows and the Windows note. All are open items in the PR #562 body.
- **Verify's evidence cells are session scratch paths** (`/tmp/tmp.1QjVrY7AZf/*.log`), which the PRISM-550 and PRISM-553 retros also found.
- **`## Sessions` holds an `open:` line from the plan stage and no `close:` line,** as it did in earlier folder plans. Child 12 removes the section from the folder template.

## Action Items

- **Make a stack's earlier part a case in the resume handling, and reword the reviewer-commits prose.** Add to `workflow.md`'s resume rows a case for a stacked ticket whose earlier part is ready to verify, review, and PR while later tasks stay open, with the retro waiting for the last part. Reword `branch-plan.md` (Landing a plan-only commit) and `skill-routing.md` (Authors ship, reviewers review) to say the session commits and pushes a dispatched review's record. Done when a stacked plan needs no Decision to get its first part through verify, review, and PR, and neither rule says a dispatched reviewer commits. Traces to the Decisions on shipping part 1 and on the Briar-as-writer prose. `plan-authoring.md`, `.ai-skills/README.md`, `prism-forge-skill`, and the two docs pages ride epic child 16. — proposed owner: epic child 15, which rewrites `workflow.md` and re-sorts the always-on rules → ticket proposal via Nora if its spec declines it
- **Correct the epic spec's consumer-pin sentence.** Replace "A consumer's per-persona pin still wins." in `.prism/plans/prism-499/spec.md` with what is true: the builder's model comes from `CLAUDE_AGENT_MODEL_DEFAULTS`, and `modelTiers.overrides` is read only for `briar`. Done when no sentence in the epic spec promises a builder pin. Traces to the Fidelity gap above. — proposed owner: the main session, as the epic spec's author → observation only if Hunter would rather build the pin

## Lessons exits

The 90-day window opens 2026-08-29.

**Promoted (0).** No lesson's rule now lives in a file this run's verdicts name.

**Expired (0).** Three entries are dated before 2026-08-29, and each is still cited. "Epic plans are preserved, not deleted" is cited by ADR-0047. "AC evidence commands are code" is cited by `.prism/plans/reviewer-scope-bookkeeping.md` and `opus5-port.md`. "A control arm that receives an always-on instruction" is cited by `.prism/rules/writing-voice.md`. The fourth early heading, "Don't reach for X when Y is available", is the format example inside a code fence and not an entry.

**Merged (0).** No two entries record the same rule.

**Appended (1).** "A spec sentence that promises a consumer override names the key that reads it" records the Fidelity gap's first item, because no existing entry covers a spec promising a behavior no code has. The nearest, "Verify a tool's behavior for each case a prose exception lists", is about a rule's stated reason, not a spec's promise.

## Review-miss classes

`node scripts/ai-skills/hooks/review/reconcile.mjs --classes` printed "No open class has 3 or more rows." So there is no open class, no proposal, and no resolve row to append. `reconcile.mjs 562 --no-write --json` reports `clean: true`, with no unlogged human comment, no thread needing a reply, and no missing PR body heading.

## Citations

### Plan evidence

- `plan.md` `## Decisions`: 17 entries. Three are promoted to `hook-runtime.md` or `review-runtime.md`, and the rest are ticket tactics or rules codified where the work landed. `spec.md` `## Decisions`: 5 entries. Three are promoted, to `skills-ecosystem.md` and `review-runtime.md`.
- `## Challenge`: round 1 blocking 1, round 2 blocking 2, round 3 blocking 1, round 4 resolved with no blocking finding.
- `## Review`: part 1 round 1 at `83394455` (0 critical, 1 major, 4 minor, 2 nit) and round 2 at `d6940bbf` clean. Part 2 round 1 at `0b010b8e` clean with 1 decision, and round 2 at `3cab77c2` clean.
- `## Verification`: `verdict: done`, base `6b97a1d6`, head `eb79bef3`.
- `## History`: the T13 line quotes the probes' `PROBE write=`, `PROBE file=`, and `PROBE inner=` lines.

### Execution record

- **PR #559** (part 1): merged as `dc02db07`, 19 files, +1491/−155. `prism-check` succeeded on `ubuntu-latest` and `windows-latest`. It has no review objects, issue comments, or inline threads.
- **PR #562** (part 2): an open draft at `28484bbe`, 64 files, +404/−43 against `origin/main`. It has no review objects, issue comments, or inline threads. `prism-check` succeeded on ubuntu and is in progress on windows.
- **Commits after the last review round (`3cab77c2`):** `28484bbe`, a plan-only record commit.
