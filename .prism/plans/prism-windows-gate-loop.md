# Plan: prism-windows-gate-loop

> Reverted: 2026-06-29 — the enforcement floor this gate-loop fix targeted was removed; see [`epic-floor-revert.md`](./epic-floor-revert.md).

## Ticket

To be filed by Nora (GitHub issue on `HunterMcGrew/PRISM`). Reconcile the plan ID to the issue number once filed. This is a NEW post-#289-epic floor-bug block, distinct from the `prism-363` stub (active-persona guard mis-placement), which is referenced here only as a downstream dependency.

## Goal

Make the `deliverable-touched-this-run` gate precondition evaluate cross-platform so the enforcement floor's Stop gate no longer loops forever on Windows, and close the PowerShell-tool ownership-guard matcher hole in the same change.

---

## Design

### Problem (code-grounded, verified 2026-06-27)

The `deliverable-touched-this-run` precondition on ~every deterministic-target persona (Sasha, Mira, Reese, Eli, Pixel, Theo, Zoe, Iris — every Class-B entry in `gates.json`) is a `check.kind: "command"`:

```
{ git diff --name-only $(git merge-base HEAD origin/main)...HEAD; git diff --name-only HEAD; git diff --name-only --cached; } 2>/dev/null | sort -u | grep -qE '<persona pattern>'
```

`run-gates.mjs` `runCheck()` (lines 393–406) executes every `kind: "command"` via `spawnSync(cmd, { shell: true })`. On Windows `shell: true` resolves to `cmd.exe`, which cannot parse the `{ …; }` brace group, `$(…)` substitution, `2>/dev/null`, `sort`, or `grep`. The command exits non-zero, the precondition never passes, and because a precondition failure re-injects without consuming a strike (lines 184–201 — protocol misses are deliberately strike-free), the Stop gate loops forever. This killed two Nora dispatches this session and breaks every Class-B gated session on Windows.

### Chosen approach — new structured `kind: "deliverable-touched"` evaluated in Node

A new precondition check kind whose git-diff logic lives entirely in `run-gates.mjs` as args-array `spawnSync` calls (no `shell: true`), with the per-persona path pattern carried as a `pattern` data field on the check. The runner runs each git command as a discrete argv invocation, dedupes the union in JS, and tests the supplied regex against the changed-file set. No shell grammar is ever handed to a shell.

```json
{
  "id": "deliverable-touched-this-run",
  "description": "the deliverable path is new or modified this run …",
  "check": {
    "kind": "deliverable-touched",
    "pattern": "^\\.prism/plans/.*\\.md$"
  },
  "on_fail": "needs-replan"
}
```

See `## Decisions` for why this beats moving the logic inline under the existing `command` kind (approach a) and forcing the command under git-bash (approach b).

### PowerShell matcher hole (folded in)

The `PreToolUse` matcher `Edit|Write|MultiEdit|Bash` in all three `settings.json` surfaces omits the harness's PowerShell tool. On a Windows host with a PowerShell tool, a persona could mutate a protected file via PowerShell and `ownership-guard.mjs` never fires. The canonical `.ai-skills/hooks/settings.json` is fixed and rebuilt; the runtime and install-seed copies follow via `emitHooks`. See the OPEN Decision on the exact tool-name token.

---

## Implementation Tasks

All tasks are `[AFK]` unless tagged. Canonical-source edits land first, then the build emits to runtime + install seed, then verification. Note that `.ai-skills/hooks/**` and `.claude/hooks/**` are denylist-protected against gated-persona writes — this work is done in a floor-OFF maintenance session (per the dispatch), so the writes are not gated. If a future session runs this with the floor live, set `CLAUDE_PRISM_MAINTENANCE=1` first.

### Clove (implementation)

1. **Add the `deliverable-touched` check kind to canonical `run-gates.mjs`.**
   File: `.ai-skills/hooks/run-gates.mjs`, function `runCheck` (currently lines 374–409).
   Insert a new branch BEFORE the existing `if (check.kind === 'command')` branch (so the new kind is matched first; order is cosmetic but keep command last as the catch-all-ish branch). Insert this block immediately after the `file-validates` branch closes (after line 391, before `if (check.kind === 'command')`):

   ```js
   if (check.kind === 'deliverable-touched') {
     // Cross-platform replacement for the bash-only command precondition: gather the
     // union of (committed-since-base ∪ working-tree ∪ staged) changed files via discrete
     // argv git invocations (no shell grammar — Windows cmd.exe cannot parse the former
     // `{ …; } | sort -u | grep` pipeline), then test the persona's deliverable pattern
     // against that set. See plan prism-windows-gate-loop § Design.
     const pattern = check.pattern;
     if (typeof pattern !== 'string' || pattern.length === 0) {
       return { passed: false, error: `deliverable-touched check is missing a 'pattern' string` };
     }

     let re;
     try {
       re = new RegExp(pattern);
     } catch (e) {
       return { passed: false, error: `deliverable-touched pattern is not a valid regex: ${e.message}` };
     }

     const changed = new Set();
     const runGit = (args) => {
       const r = spawnSync('git', args, { cwd: projectDir, encoding: 'utf8', timeout: 30000 });
       if (r.status === 0 && typeof r.stdout === 'string') {
         for (const line of r.stdout.split('\n')) {
           const f = line.trim();
           if (f) changed.add(f);
         }
       }
       // Non-zero git exit (e.g. no origin/main, not a repo) is tolerated — the other
       // arms still contribute; an empty set simply fails the pattern match, matching the
       // original `2>/dev/null` swallow semantics.
     };

     // committed-since-base: resolve merge-base first, then diff base...HEAD.
     const mb = spawnSync('git', ['merge-base', 'HEAD', 'origin/main'], { cwd: projectDir, encoding: 'utf8', timeout: 30000 });
     if (mb.status === 0 && mb.stdout.trim()) {
       runGit(['diff', '--name-only', `${mb.stdout.trim()}...HEAD`]);
     }
     // working-tree (unstaged) and staged.
     runGit(['diff', '--name-only', 'HEAD']);
     runGit(['diff', '--name-only', '--cached']);

     const passed = [...changed].some((f) => re.test(f));
     return { passed, output: passed ? '' : `no changed file matched ${pattern}` };
   }
   ```

   Verification: `node .claude/hooks/__smoke__/run-all.mjs` (after task 4 lands the runtime copy) and the new scenario in task 3.

2. **Convert every `deliverable-touched-this-run` precondition in canonical `gates.json` from `command` to `deliverable-touched`.**
   File: `.ai-skills/hooks/gates.json`.
   For each persona carrying the precondition (Sasha, Mira, Reese, Eli, Pixel, Theo, Zoe, Iris), replace the `check` object. The pattern is the SAME regex currently inside the `grep -qE '…'`, carried verbatim into the `pattern` field. Concretely, replace each block of the form:

   ```json
         "check": {
           "kind": "command",
           "command": "{ git diff --name-only $(git merge-base HEAD origin/main)...HEAD; git diff --name-only HEAD; git diff --name-only --cached; } 2>/dev/null | sort -u | grep -qE '<PATTERN>'"
         }
   ```

   with:

   ```json
         "check": {
           "kind": "deliverable-touched",
           "pattern": "<PATTERN>"
         }
   ```

   The per-persona `<PATTERN>` values to preserve (read each from the current file; do not retype from memory — confirm against the live grep string):
   - Sasha: `^\\.prism/plans/.*\\.md$`
   - Mira: `^\\.prism/plans/.*\\.md$`
   - Reese: `^\\.claude/docs/qa/.*\\.md$`
   - Eli: `^docs/.*\\.md$`
   - Pixel: `^\\.prism/design/mocks/.*\\.md$`
   - Theo: `^\\.prism/architect/.*\\.md$`
   - Zoe: `^\\.prism/audits/.*-audit\\.md$`
   - Iris: `^\\.prism/retros/.*\\.md$`

   Leave the `id`, `description`, and `on_fail` fields unchanged. Do NOT touch the `report-written` or `deliverable-sidecar` preconditions — only the `deliverable-touched-this-run` one.
   Verification: `node -e "JSON.parse(require('fs').readFileSync('.ai-skills/hooks/gates.json','utf8'))"` (valid JSON), then the smoke run.

3. **Add smoke Scenario L exercising `deliverable-touched` cross-platform.**
   File: `.ai-skills/hooks/__smoke__/run-all.mjs`. Append a new scenario block after Scenario K closes (the file's last scenario; append before any final summary/exit logic — confirm placement by reading the file tail). The scenario builds a real throwaway git repo under a temp dir, makes a tracked change matching a pattern and one that doesn't, and asserts the precondition passes for the matching pattern and fails for a non-matching pattern — WITHOUT going through a shell, proving the kind is platform-neutral.

   Required sub-tests (deterministic, self-contained — use `spawnSync('git', […])` with argv arrays to set up the fixture so the test itself is shell-free):
   - L.a: temp git repo, commit a base, create `.prism/plans/foo.md` in the working tree, gates fixture gives a Class-B persona a `deliverable-touched` precondition with pattern `^\\.prism/plans/.*\\.md$`, report.json valid → run-gates exits 0 (precondition satisfied by the working-tree file).
   - L.b: same repo, same working-tree file, but pattern `^docs/.*\\.md$` (no match) → run-gates exits 2 and stderr names the `deliverable-touched-this-run` precondition (precondition correctly fails).
   - L.c: pattern omitted from the check object → run-gates exits 2 (malformed-check guard fires — the `missing a 'pattern' string` arm).
   - L.d (no-origin tolerance): a repo with NO `origin/main` remote, a staged matching file → exits 0 (the merge-base arm is skipped, staged arm still contributes — proves the non-zero-git tolerance).

   Model the fixture setup on `setupStopFixture` but add a git-init helper. Each git command in the fixture MUST be an argv array, never a shell string, so the smoke test runs identically on Windows and CI. Set `git config user.email`/`user.name` locally in the temp repo so commits succeed in CI.
   Verification: `node .claude/hooks/__smoke__/run-all.mjs` exits 0 with `PASS L`.

4. **Widen the PreToolUse matcher to cover the PowerShell tool in canonical `settings.json`.**
   File: `.ai-skills/hooks/settings.json`, line 5.
   Change `"matcher": "Edit|Write|MultiEdit|Bash"` → `"matcher": "Edit|Write|MultiEdit|Bash|PowerShell"` (pending the OPEN Decision resolving the exact tool-name token — use `PowerShell` as the default per the OPEN entry; if the resolved token differs, use that instead).
   Do NOT hand-edit `.claude/settings.json` or `templates/install/.claude/settings.json` — those are build outputs emitted from this canonical file by `emitHooks` (build.ts lines 857–869). Task 6 regenerates them.
   Note: the runtime `.claude/settings.json` is currently hand-emptied to `{"hooks":[…empty…]}` for the floor-off maintenance window. See the Risk note and OPEN Decision — the matcher widening only takes effect once the floor wiring is restored (epic floor re-enable, not this ticket). Widening the canonical matcher now is correct and harmless: it ships the fix so that whenever the floor is re-enabled, the hole is already closed.
   Verification: `node -e "JSON.parse(require('fs').readFileSync('.ai-skills/hooks/settings.json','utf8'))"`.

5. **Update the human-readable verification/enforcement docs if the check-kind set is enumerated anywhere.**
   Search the tree for an enumeration of precondition `kind` values (`file-exists`, `file-validates`, `command`) in `.prism/references/enforcement/**` and any ADR describing the gate check contract: run a tree-wide search for `file-validates` and for `kind` in `.prism/references/` and `.prism/spec/adrs/`. Wherever the closed set of check kinds is listed, add `deliverable-touched` with a one-line description ("git-diff union matched against a persona deliverable `pattern`; cross-platform replacement for the bash-only command form"). If no such enumeration exists, record "no doc enumeration found — none to update" in the plan History. This is the removal-and-rename-completeness sweep applied to an addition: the new kind must not exist only in code.
   Verification: content-only; no build effect. State that explicitly.

6. **Rebuild to emit runtime + install-seed copies and confirm drift-clean.**
   Run `pnpm prism:build`. This runs `emitHooks` (build.ts:806), which copies canonical `run-gates.mjs`, `gates.json`, the `__smoke__/` harness, and `settings.json` raw into both `.claude/` (runtime) and `templates/install/.claude/` (install seed), then runs the smoke harness and the test suite. `assertHookEmitDoesNotWeaken` runs first — it inspects only `clove.may_write` and the guard marker, so the precondition-kind change does not trip it (verified against build.ts:744–778).
   Then run `pnpm prism:check` to confirm zero drift between canonical and emitted copies.
   Caveat — runtime settings.json: if `pnpm prism:build` overwrites the hand-emptied `.claude/settings.json` with the canonical live-wiring content, that RE-ENABLES the floor mid-maintenance. This is the in-flight-working-tree risk (see Risk + OPEN). Before running the build, decide with the operator (Hunter) whether to (i) let the build restore the live wiring now that the fix is in place, or (ii) keep the floor off by re-emptying `.claude/settings.json` after the build. The build's `writeFileIfChanged` will report `.claude/settings.json` as drifted either way — that is expected given the hand-edit; it is not a fix-introduced regression.
   Verification: `pnpm prism:build` then `pnpm prism:check` — the latter must print "prism:check passed. Generated outputs are in sync." (after the settings.json decision above is reconciled).

7. **Update plan History and confirm the `prism-363` boundary.**
   File: this plan's `## History`. Add the implementation entry. Confirm in the entry that the active-persona guard mis-placement (#363) was NOT touched — it remains a separate Sasha-diagnosis dependency.
   Verification: content-only.

---

## Decisions

- **Chosen gate-loop fix: a new structured `kind: "deliverable-touched"` evaluated in Node, carrying the per-persona regex as a `pattern` data field.**
  - **Root cause:** `runCheck`'s `command` branch runs every check via `spawnSync(cmd, { shell: true })`, which is `cmd.exe` on Windows; the precondition's `{ …; } | sort -u | grep` bash pipeline is unparseable there, so it always exits non-zero. Precondition failures re-inject strike-free by design, so the Stop gate loops forever.
  - **Alternatives considered:** (a) move the git-diff logic inline under the existing `command` kind / a special-case in `runCheck`; (b) force the precondition command to run under git-bash by pointing `spawnSync`'s `shell` at a bash path; (c) a new structured check kind interpreted in Node.
  - **Chosen approach:** (c). It beats (a) because (a) smuggles one command's imperative git logic into the runner as a hard-coded special case, breaking the data-driven gates.json contract where every check is a declarative spec — and it still has to invent somewhere to carry the per-persona pattern. (c) carries the pattern as first-class data (`check.pattern`) and adds a named, reusable, testable kind. It beats (b) decisively because (b) assumes git-bash exists at a known path on the consumer's machine; PRISM ships to other teams (SPC is a confirmed future consumer) and consumer Windows hosts frequently lack bash on a predictable path. `which bash` returning `/usr/bin/bash` on the dogfood box is not a guarantee anywhere PRISM installs — baking in that assumption would trade a deterministic Windows break for a nondeterministic one.
  - **Implementation guidance:** new branch in `run-gates.mjs` `runCheck`; discrete argv `spawnSync('git', […])` calls (no `shell: true`); union the three diff sources in a JS `Set`; `new RegExp(check.pattern)` tested against the set; tolerate non-zero git exits (mirrors the original `2>/dev/null`); guard a missing/invalid `pattern` with a clear error. gates.json preserves each persona's exact regex verbatim in `pattern`.
  - → no promotion needed (implementation tactic specific to the enforcement-floor runtime; the durable contract lives in the enforcement reference docs updated in task 5, not in an architect doc).

- **PowerShell matcher hole folded into this ticket rather than split.** Same enforcement-floor surface, same settings.json files, same build-emit step, security-relevant and small — folding it in avoids a redundant second dispatch through the identical canonical→build→runtime path. Per `followup-scope.md`, this is same-scope (file overlap + subject adjacency + small), so it rides this change, not a new ticket.
  - → no promotion needed (scope decision, ticket-local).

- **Worktree-copy settings.json files are out of scope.** The `.claude/worktrees/**/settings.json` copies are ephemeral per-run worktree artifacts regenerated from canonical; editing them by hand would drift and be overwritten. Only the three canonical-and-emitted surfaces (`.ai-skills/hooks/settings.json` canonical, `.claude/settings.json` runtime, `templates/install/.claude/settings.json` seed) are in scope, and only the canonical one is hand-edited.
  - → no promotion needed (scope decision, ticket-local).

- **#363 (active-persona guard mis-placement) is a dependency/follow-up, not in scope here.** Per the dispatch, it needs a clean Sasha diagnosis in a floor-FIXED session first (the native-Task-vs-Workflow `agent()` clobber is unresolved, and the write-denial keys on `payload.agent_type` in a branch the Bash `echo` writes never hit). Resolving the Windows gate-loop is a prerequisite for running that diagnosis on Windows without looping. This plan does not modify `ownership-guard.mjs`'s active-persona branch.
  - → no promotion needed (cross-ticket boundary note; the diagnosis itself routes to Sasha under #363).

- **RESOLVED (operator, 2026-06-27): PowerShell matcher token is `PowerShell`.** Hunter confirmed the harness exposes the tool as `PowerShell`; task 4 widened the canonical matcher to `Edit|Write|MultiEdit|Bash|PowerShell` and the build propagated it to runtime + seed. If a future harness change renames the tool, update the alternation and rebuild.
  - → no promotion needed (ticket-local matcher token).

- **RESOLVED (operator, 2026-06-27): the rebuild restores the live floor wiring.** Hunter authorized `pnpm prism:build` to re-enable the floor in runtime `.claude/settings.json` now that the fix is in place; the runtime was NOT re-emptied post-build. The floor is live for the remainder of this session. As Class A (no deliverable-touched precondition), Clove's Stop clears on the report-written gate alone.
  - → no promotion needed (ticket-local floor-state decision).

- **Doc-enumeration sweep (task 5) updated the canonical gate schema, which is outside Clove's `may_write`.** The only doc enumeration of the closed check-kind set is the JSON Schema at `.prism/references/enforcement/gates.json` (`CheckSpec.kind` enum + descriptions). Adding `deliverable-touched` to the code without updating the schema would leave the new kind rejected by `additionalProperties: false` for any validator — a removal-and-rename-completeness gap. `.prism/references/**` is Winston's lane, but this edit is tightly coupled to the code change (the schema is stale the instant the code lands) and must ship in the same PR. Absorbed per `branch-plan.md` cross-lane option, documented here. Added the new kind to the enum, the `CheckSpec`/`kind` descriptions, and a new `pattern` field property; the build propagated to the `.claude`/`.codex`/`.cursor` mirrors.
  - → no promotion needed (completeness edit; the contract it documents is the code change itself).

- **Smoke scenario named `O`, not `L` (plan task 3 said "Scenario L").** The harness already had scenarios L (Class B coherence gate), M (run-scoped deliverable preconditions), and N (git mutation guard) — the plan was written against a stale view where K was the last. Naming the new scenario `L` would emit a duplicate `PASS L` line, ambiguous in the dispatch's verify step. Used the next free letter `O` with sub-tests O.a–O.d. Scenario M stubs `deliverable-touched-this-run` with `node -e`; O exercises the real git-diff logic against a throwaway repo, which M never did — so O is additive, not a duplicate.
  - → no promotion needed (test-naming tactic, ticket-local).

---

## History

- 2026-06-27 [main]: Winston design + plan for the Windows gate-loop fix (new structured `deliverable-touched` precondition kind) + PowerShell matcher widening. Read gates.json, run-gates.mjs `runCheck`, the smoke harness, and build.ts `emitHooks`/`assertHookEmitDoesNotWeaken` to ground the approach. Did NOT touch #363 (active-persona guard) — separate Sasha dependency. Design returned to Sol for Hunter sign-off before Clove implements.
- 2026-06-27 [hmcgrew/prism-windows-gate-loop]: Clove implemented all 7 tasks — added the `deliverable-touched` branch to canonical `run-gates.mjs`, converted all 8 Class-B `deliverable-touched-this-run` preconditions in `gates.json` (regexes carried byte-for-byte), added shell-free smoke Scenario O (named O not L — L/M/N already taken), widened the canonical PreToolUse matcher to include `PowerShell`, and added `deliverable-touched` + a `pattern` field to the canonical gate JSON Schema (task-5 doc sweep; only enumeration found). `pnpm prism:build` re-enabled the floor (operator-authorized) and `pnpm prism:check` reported "Generated outputs are in sync" — drift-clean. The 4 remaining test failures (resolveRef path-norm trio, render-check-drift, esbuild devDep TS2307) are the named Windows-only baseline, not regressions; `ownership-guard.mjs` and #363's active-persona branch were NOT touched.
- 2026-06-27 [hmcgrew/prism-windows-gate-loop]: Clove addressed two cosmetic review minors — corrected the inaccurate `git diff HEAD` comment in `run-gates.mjs` (kept both arms; `--cached` covers the staged-then-reverted edge case Eric mislabeled as redundant) and renamed Scenario O's stale `runL`/`prism-smoke-l-` internals to `runO`/`prism-smoke-o-` (Scenario L untouched). Build drift-clean, smoke `PASS O` green.
- 2026-06-29 [claude/stupefied-liskov-b00735]: Reverted — the enforcement floor this Windows gate-loop fix targeted was removed in the floor revert. See [`epic-floor-revert.md`](./epic-floor-revert.md).

---

## Acceptance Criteria

### Behavioral

- [ ] Given a Class-B persona (e.g. Sasha) finishes a dispatch on a Windows host with the enforcement floor live, When it has produced its deliverable file in the working tree, Then the Stop gate accepts the stop on the first attempt rather than re-prompting indefinitely (REQ-1)
- [ ] Given the same persona on Windows has NOT produced a file matching its deliverable pattern, When it attempts to stop, Then the gate re-prompts naming the `deliverable-touched-this-run` precondition (not an unparseable-command error) (REQ-1)
- [ ] Given a persona finishes a dispatch in a checkout with no `origin/main`, When its deliverable exists as a staged or working-tree change, Then the precondition still passes (the merge-base arm is skipped without failing the whole check) (REQ-1)
- [ ] Given a persona attempts to write a protected enforcement file via the PowerShell tool on a Windows host with the floor live, When the PreToolUse matcher fires, Then ownership-guard evaluates and denies the write the same way it does for Bash (REQ-2)

### Non-behavioral

- [ ] The smoke harness (`node .claude/hooks/__smoke__/run-all.mjs`) includes a `deliverable-touched` scenario that runs shell-free and passes on both Windows and CI (REQ-1)
- [ ] `pnpm prism:check` reports the runtime and install-seed `gates.json`, `run-gates.mjs`, smoke harness, and `settings.json` as in sync with canonical after the build (REQ-1)
- [ ] Every persona's deliverable regex is preserved byte-for-byte from the old `grep -qE` form into the new `pattern` field (no pattern drift) (REQ-1)
- [ ] No change to `ownership-guard.mjs`'s active-persona branch — #363 remains untouched (REQ-3)

### AC Adjustments

### AC Sync Log

| Date | Agent | Action | Plan | Linear |
| ---- | ----- | ------ | ---- | ------ |
| 2026-06-27 | Winston | Initial AC drafted from design | written | N/A (GitHub issue pending Nora) |

---

## Review Issues

### Minor: stale internal naming in Scenario O (`runL`, `prism-smoke-l-`)

- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `.ai-skills/hooks/__smoke__/run-all.mjs:2027,2098`
- **Problem:** The internal helper function is named `runL` and the tmp directory prefix is `prism-smoke-l-`, both reflecting the scenario's original planned letter `L` before the Decision renamed it to `O`. Block-scoped and cosmetic — no functional impact.
- **Suggested fix:** Rename `runL` → `runO` and `prism-smoke-l-` → `prism-smoke-o-` inside the Scenario O block.
- **Eric (PR review #364):** confirmed. Non-blocking; inline comment posted at `run-all.mjs:2098`.
- **Fixed in:** `hmcgrew/prism-windows-gate-loop` — renamed `runL` → `runO` (5 sites) and `prism-smoke-l-` → `prism-smoke-o-` inside the Scenario O block only; Scenario L (line 1320) untouched. Verified no `runL`/`-l-` leftovers; `PASS O` green.

### Minor: comment mislabels `git diff --name-only HEAD` coverage

- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `.ai-skills/hooks/run-gates.mjs:430`
- **Problem:** The comment `// working-tree (unstaged) and staged.` describes `git diff --name-only HEAD` as "unstaged", but `git diff HEAD` captures both staged and unstaged changes (working tree vs last commit). The code is correct; the comment is inaccurate.
- **Eric (PR review #364):** confirmed the comment is inaccurate. Eric additionally claimed the `--cached` arm is a strict subset (redundant for tracked files) — that claim is **wrong** and was not adopted: a file staged then reverted in the working tree appears in `git diff --cached` but NOT in `git diff HEAD`, so the `--cached` arm legitimately covers an edge case the HEAD diff misses. Both arms kept; only the comment changed.
- **Fixed in:** `hmcgrew/prism-windows-gate-loop` — replaced the comment with an accurate three-line note stating `git diff HEAD` covers staged+unstaged and the `--cached` arm covers the staged-then-worktree-reverted edge case. Code (both `runGit` arms) unchanged.

---

## PR Readiness

- [x] No critical or major issues
- [x] Smoke harness green (incl. new Scenario O) on Windows — `node .claude/hooks/__smoke__/run-all.mjs` → all scenarios pass incl. `PASS O`
- [x] `pnpm prism:check` drift-clean — "Generated outputs are in sync." (esbuild/resolveRef/render-drift test failures are named Windows baseline, not drift)
- [x] Per-persona regexes verified byte-identical to pre-change (all 8 confirmed against live grep strings)
- [x] #363 active-persona branch confirmed untouched (`ownership-guard.mjs` not in diff)
- [ ] PR description up to date (set at PR open)
- [x] Briar self-review: 2 minor findings (stale naming + comment inaccuracy); no critical/major — ready for Eric
- [x] Eric PR #364 minors resolved: both cosmetic findings fixed on `hmcgrew/prism-windows-gate-loop` (see Review Issues, both `fixed`)

**Last updated:** 2026-06-27 (Clove — review-minors fix)
