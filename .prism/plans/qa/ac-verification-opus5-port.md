# AC Verification — `opus5-port.md`, PR 2D (the deny gate)

- **Graded at SHA:** `de3d34303eb7af0d2f6575750171ec8a9e787d18`
- **Branch:** `huntermcgrew/opus5-port-deny-gate` (PR #470, draft)
- **Date:** 2026-08-19
- **Environment:** worktree `.claude/worktrees/agent-a507b79a93c90415f`, macOS (darwin 25.5.0), node via `pnpm`. Tree clean before and after; `pnpm prism:build` and `pnpm prism:check` both left `git status --porcelain` empty.
- **Scope:** the criteria PR 2D is responsible for (tasks D0–D10). AC-6, AC-8 through AC-18, AC-22 through AC-29 belong to other PRs in the stack and are not graded here.

> **This grading is stale, and it is published as a record of that pass rather than as a grading of the PR.** The graded SHA sits more than twenty commits behind the branch head and predates the inversion that deleted the write parser the graded suite was built around, so **every line citation in the verdict table below points at a line that no longer exists.** PR review re-executed the substantive citations against head and no verdict flipped — the report is out of date, not wrong. A re-grade at head is Reese's to run, and it owes two things this pass does not have: current citations, and **AC-25**, which was excluded as another PR's and is not — this is the PR that deletes the catch-all from all three tables and ships the rejection that makes the criterion consequential.

## Verdict table

| ID | Verdict | Evidence type | Citation |
| --- | --- | --- | --- |
| AC-1 | MET | executed | `pnpm prism:test` exit 0, 798/798. `hook-gate.test.ts:1029` asserts both the doc path and `/cat \.prism\/architect\/_toolkit\/spec-editing\.md/`. |
| AC-2 | MET | executed | `hook-gate.test.ts:1104` (`Read`), `:1111` (`cat`), `:1120` positive control. Leg 3 runs through `assertRemedyClearsTheGate`, which never seeds. |
| AC-3 | MET | executed | `hook-gate.test.ts:1166` loops `Write`, `Edit`, and `Bash` over an unrouted path; all return `null`. |
| AC-4 | MET | executed | `hook-gate.test.ts:1224` — no session id never denies. |
| AC-5 | MET | executed | `hook-gate.test.ts:1253` (announced-but-unread still denies) plus the ported `architect-route.test.ts:157`/`:194`/`:244` credit-on-read cases, all passing against the `.mjs` runtime. |
| AC-7 | **UNMET** | executed | The named sub-assertion is absent. See below. |
| AC-19 | MET | executed (derived filter) | ADR-0072 present; `pnpm prism:crossref-lint` exit 0; D6's corrected grep across all five roots returns nothing. See the evidence-line note below. |
| AC-20 | MET | executed | `pnpm prism:build` exit 0, `pnpm prism:check` exit 0 on this branch. |
| AC-21 | MET | executed | `pnpm prism:check` exit 0; no drift reported outside the curated set. |
| AC-30 | MET | executed | `hook-gate.test.ts:1137` asserts both directions; the deny arm resolves its key through `spec.scopeId(payload)` (`hook.mjs:516`), the same resolver the announce arm uses at `:384`, not `session_id` directly. |
| AC-31 | **UNMET** | executed | A `held` row's recorded result does not reproduce. See below. |

## AC-7 — UNMET

**Criterion:** Given a compaction event, When `PostCompact` fires with a session id, Then that session's dedup state is deleted so docs re-announce and re-gate, and no summary file is written.

**Evidence procedure followed:** `pnpm prism:test` (exit 0), then inspected every `runPostCompactArm` case in `scripts/ai-skills/hook-gate.test.ts` (lines 314, 341, 373, 400 — the complete set; `grep -rn "runPostCompactArm" scripts/ai-skills/*.test.ts` finds no others).

**Expected (per the Evidence line):** "`PostCompact` cases pass with and without a session id; **the no-session case asserts the file still exists**."

**Observed:** the with-session cases are present and passing. The no-session case, `hook-gate.test.ts:400`, is one line:

```js
await assert.doesNotReject(runPostCompactArm(JSON.stringify({ cwd: "/repo" })));
```

It asserts only that the call does not throw. It uses `/repo`, a path with no state file at all, so no file survives the call to be asserted about. The Evidence line's named assertion — that a no-session `PostCompact` leaves the state file in place — is not exercised anywhere in the suite.

The substantive reset behavior does hold (`:314` deletes the session's file, `:341` its subagents', `:373` spares a prefix-sibling). What is missing is the negative half: nothing proves a no-session `PostCompact` is inert rather than destructive.

## AC-31 — UNMET

**Criterion:** Every task in PR 2D ships a verify line that was re-derived against the implementation as it landed, not inherited from the task as it was authored.

**Structural half — passes.** Two dated sweep tables sit in `## History`: D0's, dated 2026-08-19 and before the first implementation commit, and D10's, dated after the last. Each carries a row per task with a `held` / `fixed` / `amended` disposition (both tables cover D0–D10, a superset of the required D1–D10).

**Command half — fails on D3.** The D10 table records D3 as `held`, with the recorded result *"The mirror grep names all five copies of `context-reuse.md`."* Re-run literally from the repo root, D3's verify line names four files and errors:

```
$ /usr/bin/grep -rln "mechanical enforcer" .prism/rules/context-reuse.md .claude/rules/context-reuse.md \
    .codex/rules/context-reuse.md .cursor/rules/context-reuse.md templates/install/.prism/rules/context-reuse.md
grep: .cursor/rules/context-reuse.md: No such file or directory
.prism/rules/context-reuse.md
.claude/rules/context-reuse.md
.codex/rules/context-reuse.md
templates/install/.prism/rules/context-reuse.md
exit=2
```

The Cursor mirror is `.cursor/rules/context-reuse.mdc` — every file in `.cursor/rules/` carries the `.mdc` extension. The verify line names a path that does not exist, so the command exits 2 and reaches four of the five surfaces the task changes. This is AC-31's own UNMET signature: "any command returning something other than what its row claims."

The underlying D3 work is correct. With the extension fixed, all five mirrors carry the sentence and the command exits 0:

```
$ /usr/bin/grep -rln "mechanical enforcer" ... .cursor/rules/context-reuse.mdc ...
.prism/rules/context-reuse.md
.claude/rules/context-reuse.md
.codex/rules/context-reuse.md
.cursor/rules/context-reuse.mdc
templates/install/.prism/rules/context-reuse.md
exit=0
```

The defect is in the verify line and in the D10 row that claims to have run it — a dead path in a `held` row is the exact class D0 and D10 exist to catch, on the axis-1 surface (the command does not reach everything the task changes).

**Positive control — passes.** AC-31 requires re-running one `held` row's command and confirming the recorded result. D6's row records *"The re-derived grep returns nothing."* Re-run literally:

```
$ grep -rn "no \`PreToolUse\` ownership guards on writes" .ai-skills/ .prism/ .claude/ .codex/ .cursor/ \
    | grep -v '^\.prism/plans/'
(no output)
```

Zero hits, matching the row. The table is not a table of commands nobody ran.

**Other `held` rows re-run, all reproducing:**

| Row | Recorded | Observed |
| --- | --- | --- |
| D1 | `1` and `1` | `.claude/settings.json:1`, `templates/install/.claude/settings.json:1` |
| D5 (`amended`) | `1` for both | `seed-curation.json:1`, `ship-closure.ts:1`; ADR file present |
| D7 | `pnpm prism:test` exit 0, 798/798/0 | exit 0, 798 tests, 798 pass, 0 fail, 0 skipped |
| D9 (`amended`) | `1` for both pairs | `## Write gate` → `1` and `1`; `PRISM_HOOK_DENY_DISABLE` → `1` and `1` |

**Observation, not a separate verdict.** AC-31 also names as UNMET "a `held` disposition on a task whose mechanism changed between the two sweeps." Two D10 rows sit close to that line: D1 (`held`, and the arm "gained `resolveListedToolKind` during implementation") and D3 (`held`, and the write detector "grew a segment scanner mid-implementation"). Both rows name the change explicitly and argue the command's reach is unchanged, which is the re-derivation D10 asks for rather than the re-read it forbids. Recorded here so the call is visible; the AC-31 verdict rests on D3's non-reproducing result, not on this.

## Note on AC-19's evidence line

AC-19 grades MET, but its command as written does not do what its own prose says. Run literally it returns two hits:

```
.prism/plans/issue-408.md:60
.prism/plans/opus5-port.md:580
```

Both are plan files quoting the retired string — exactly what the filter `grep -v "^\./\.prism/plans/"` is meant to remove. It does not remove them: `grep -rn` over the roots `.ai-skills/ .prism/` emits paths with no `./` prefix, so the anchor never matches. AC-14 in the same plan handles this with `grep -vE "^(\./)?\.prism/(plans|audits)/"`, and D6's own verify line uses the unprefixed anchor and works.

The invariant AC-19 asserts holds, proven by D6's broader command over all five roots returning nothing. The defect is in AC-19's evidence line, and it belongs to Winston rather than to this PR's diff.

## Criteria awaiting human verification

No criterion in the plan's AC set is tagged `human`, and none is contingent on task D8.

**D8 is unrun and stays unrun.** The `[HITL]` end-to-end run against a live Claude Code host cannot happen in a dispatched session — there is no live host to run it against. Clove states this in the PR body under **What is not proven** and in `## PR Readiness (PR 2D)`, and the D10 sweep records D8 as `held` with "unrun in this lane." This is an accurate report of an outstanding item, not a gap papered over.

Its significance is real and unchanged by the green suite: every leg in `hook-gate.test.ts` synthesizes its own payload, so none of them can catch a payload-shape mistake, which is the one thing D8 exists to catch. Claude's `permissionDecisionReason` shape comes from a live measurement recorded in `## Decisions`, not from a run of this code.

**Merge-gate checklist for a human at a live host:**

- [ ] A `Write` or `Edit` to a routed path is denied, and the denial appears in the transcript.
- [ ] The message renders legibly — the path, one `cat` line per unread doc, no escaping artifacts.
- [ ] A full `Read` of each named doc clears the deny; the retried write lands.
- [ ] A `cat` of each named doc also clears it.
- [ ] A subagent doing routed work is denied on its own budget after the parent has already read the doc.
- [ ] A write to an unrouted path is not denied.

## Re-check log

- 2026-08-19 — initial grading at `de3d3430`. 9 MET, 2 UNMET, 0 UNGRADEABLE.
- 2026-08-19 — targeted re-check of AC-7 and AC-31 at `9a7d1ebd`. Both MET. Detail below.

## AC-7 — MET on re-check

**Evidence procedure:** `pnpm prism:test` exit 0, 798/798, 0 skipped. Read all four `runPostCompactArm` cases (`hook-gate.test.ts:314`, `:341`, `:373`, `:400`) and the arm itself (`hook.mjs:614`).

The Evidence line asks for two things and gets both. The `PostCompact` cases pass with and without a session id, and the no-session case now seeds real state through the announce arm, then asserts the state file survives the reset. Clove's second assertion — a repeat read returns `null`, so the already-delivered announcement stays suppressed — is the right addition: a state file that survives as an empty or corrupted shell would satisfy the file-exists check while re-announcing every doc, which is the destructive outcome the no-session clause exists to prevent. The with-session half is covered end to end at `:314` (delete, then confirm the doc re-announces), `:341` (subagent state files clear with the parent), and `:373` (a sibling whose id merely prefixes the compacted one is left alone).

**On the mutation finding clove surfaced — the conclusion holds, the stated mechanism does not.**

Clove records in `## Sessions` that removing the `if (!sessionId) return` guard leaves the test alive "because an empty session id builds the prefix `architect-route-state..`, which matches nothing." The code does not produce an empty string there. `payload.session_id ?? payload.conversation_id ?? null` on a payload carrying neither key evaluates to `null`, so a guard-free arm reaches `sessionId.replace(...)` and throws a `TypeError`, which the surrounding `catch` swallows into one stderr line. No prefix is ever built. Confirmed directly:

```
$ node -e 'const p={cwd:"/x"};const s=p.session_id??p.conversation_id??null;
  try{`architect-route-state.${s.replace(/[^a-zA-Z0-9._-]/g,"_")}.`}catch(e){console.log("THROWS:",e.constructor.name)}'
THROWS: TypeError
```

Two things follow. The survival conclusion is correct — the arm is inert on a no-session payload with or without the guard, so that single mutation cannot kill the test. But the killing mutation clove reports, "widening the no-session prefix to `architect-route-state.`", is not a single edit either: with the guard removed the null throws before any prefix exists, so producing that mutant requires *also* introducing a string fallback. The 57→56 measurement is real; the mutant behind it is compound.

**This does not make the test pass for an adjacent reason.** The test asserts an outcome — the file survives and suppression holds — not a code path. That no single mutation reaches the failing outcome is a property of the implementation carrying two independent protections (the explicit guard, and a null that cannot form a matching prefix), not a gap in the assertion. The criterion's Evidence line is satisfied literally and in substance.

**One clause of AC-7 is not test-covered, and was not asked to be.** "No summary file is written" has no assertion behind it; `grep -rn "summary"` over `hook.mjs` and `hook-gate.test.ts` returns nothing, so the clause holds by absence of any summary-writing mechanism rather than by a test. The Evidence line does not name it, so it is not a grading input — recorded so a later reader does not mistake the green suite for coverage of that clause.

## AC-31 — MET on re-check

**Structural half — unchanged and passing.** Both dated sweep tables are still in `## History`, D0's pre-implementation and D10's post-implementation, each with a row per task across D0–D10.

**The D3 defect is closed.** D3's verify line now names `.cursor/rules/context-reuse.mdc`, and its D10 row reads `fixed` with the dead path and its consequence recorded. Re-run literally from the repo root:

```
$ grep -rln "mechanical enforcer" .prism/rules/context-reuse.md .claude/rules/context-reuse.md \
    .codex/rules/context-reuse.md .cursor/rules/context-reuse.mdc templates/install/.prism/rules/context-reuse.md
.claude/rules/context-reuse.md
.prism/rules/context-reuse.md
.cursor/rules/context-reuse.mdc
.codex/rules/context-reuse.md
templates/install/.prism/rules/context-reuse.md
exit=0
```

Five files, exit 0 — what the corrected row claims. The disposition move from `held` to `fixed` is the right call rather than a reword in place: the verify line itself changed, and `held` would have asserted that the line as authored survived the sweep.

**Positive control — two `held` rows re-run, both reproduce.**

```
$ grep -rn "no \`PreToolUse\` ownership guards on writes" .ai-skills/ .prism/ .claude/ .codex/ .cursor/ | grep -v '^\.prism/plans/'
(no output, exit 1)          # D6's row: "The re-derived grep returns nothing."

$ grep -c '"PreToolUse"' .claude/settings.json templates/install/.claude/settings.json
.claude/settings.json:1
templates/install/.claude/settings.json:1   # D1's row: "→ `1` and `1`."
```

Both match their recorded results. The remaining non-`held` rows (D5, D9) were verified in the initial grading at `de3d3430` and are untouched by this diff.
