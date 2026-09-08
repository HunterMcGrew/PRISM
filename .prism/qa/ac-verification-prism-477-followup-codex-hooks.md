# AC Verification — prism-477-followup-codex-hooks

- **Plan:** `.prism/plans/prism-477-followup-codex-hooks.md`
- **PR:** #487 — "PRISM-477 followup: Deliver the hook runtime to Codex consumers"
- **Branch:** `huntermcgrew/codex-hook-delivery`
- **Graded at SHA:** `fe50d415ea129989a2e91b4371e40137c2178b76`
- **Date:** 2026-09-08
- **Environment:** worktree `.claude/worktrees/wf_cb2c787f-341-6`, Windows host, detached HEAD at the branch tip
- **Diff under grading:** `git diff origin/main...HEAD` — 9 files, 1040 insertions, 77 deletions

The branch was merged with `origin/main` (PRISM-488 Phase A git gates) at `fe50d415`, so every criterion below is re-graded from scratch against the merged HEAD rather than carried over from the plan's earlier marks.

---

## Verdict table

| ID | Verdict | Evidence type | Citation |
| --- | --- | --- | --- |
| AC-1 | MET | executed | `pnpm prism:test` — both named cases green; plus a direct read of `templates/install/.codex/hooks.json` against `PRISM_CODEX_HOOK_COMMAND_PATTERN` |
| AC-2 | MET | executed | `pnpm prism:test` → `mergeHookCodexRegistration: a consumer's own PreToolUse entry survives…`; plus a live merge against the real shipped template |
| AC-3 | MET | executed | live double-merge against the real template — raw bytes compared, identical (784 = 784) |
| AC-4 | MET | executed | `pnpm prism:test` → `refreshHookRuntime: dropping codex from hosts…`; plus a live drop against the real template |
| AC-5 | MET | executed | `pnpm prism:test` → `refreshHookRuntime: a hosts: ["codex"] consumer receives the runtime…`; plus a live `hosts: ["codex"]` refresh |
| AC-6 | MET | executed | `pnpm prism:test` → `the spawned entry point denies a Codex apply_patch on an unread routed path, and exits 0` |
| AC-7 | — | — | `human`-tagged; see § Awaiting human verification |
| AC-8 | MET | executed | `pnpm prism:check` exit 0 on this branch (see scope note below) |
| AC-9 | **UNMET** | executed | `grep -rn "Claude Code only" . --exclude-dir=node_modules --exclude-dir=.git` — 30 hits, many outside the two allowed classes |
| AC-10 | **UNMET** | executed | `grep -n "never blocks" templates/install/.prism/architect/_toolkit/install-layout.md` — returns line 121 |

**Machine counts:** 7 MET · 2 UNMET · 0 UNGRADEABLE. AC-7 is `human`-tagged and excluded from every machine count.

**Tree-clean discipline:** `git status -s` was empty before grading and empty after every criterion. `pnpm install --ignore-scripts` was needed to populate `node_modules` (untracked, gitignored); no tracked file changed at any point.

---

## Captured evidence

### AC-1 — `.codex/hooks.json` registers both events; `prism doctor` reports them

Direct read of the shipped template, each command tested against `PRISM_CODEX_HOOK_COMMAND_PATTERN`:

```
PreToolUse entries=2
   patternMatch=true | node ".claude/hooks/hook.mjs" --tool=codex --event=PreToolUse
   patternMatch=true | node ".claude/hooks/git-gates.mjs" --tool=codex --event=PreToolUse
PostToolUse entries=1
   patternMatch=true | node ".claude/hooks/hook.mjs" --tool=codex
```

Doctor half — `doctor.test.ts:1288` asserts exactly one `hook-registration` finding, message matching `/installed and registered for Codex/`, severity `info` (so zero warnings on that check):

```
✔ runDoctor reports codex hook reach, not a problem, when the runtime and its registration agree (140.4915ms)
```

**Evidence-source observation (not a defect in the criterion's outcome):** AC-1's falsifiability clause reads "delete either event key from `templates/install/.codex/hooks.json` and both assertions fail." The `update.test.ts` cases build their prism root from a test-local `PRISM_CODEX_HOOKS` fixture (`update.test.ts:1990`), not from the shipped template, so that specific mutation would not fail them. The criterion's substance is nonetheless confirmed — the direct template read above and the live merges below exercise the real file.

### AC-2 — a consumer's own PreToolUse entry survives beside PRISM's

```
✔ mergeHookCodexRegistration: a consumer's own PreToolUse entry survives, and PRISM's is added beside it (6.961ms)
```

Live merge against the real shipped template, seeded with a consumer-authored `./scripts/consumer-guard.sh` entry:

```
PreToolUse entries = 3
consumer entry preserved = true
```

### AC-3 — a repeat `prism update` leaves the file byte-identical

The named test compares parsed objects (`assert.deepEqual(secondPass, firstPass)`), not file bytes, so byte-identity was verified directly: two consecutive `mergeHookCodexRegistration` calls against the real template, raw `Buffer.equals` on the result.

```
first bytes  = 784
second bytes = 784
BYTE_IDENTICAL = true
PreToolUse entries = 3
PostToolUse entries = 1
```

Suite half:

```
✔ mergeHookCodexRegistration: running twice does not duplicate PRISM's entry or drift the consumer's (8.4905ms)
```

### AC-4 — dropping `codex` takes back PRISM's entries and leaves the consumer's

```
✔ refreshHookRuntime: dropping codex from hosts removes only PRISM's codex entries, and the consumer's own survive (34.3745ms)
```

Live drop against the real template — `hosts: ["codex"]` then `hosts: ["claude"]`:

```
AC-4 after add: PreToolUse entries = 3
AC-4 after drop: remaining commands = ["./scripts/consumer-guard.sh"]
AC-4 consumer entry survives = true
AC-4 no PRISM command remains = true
AC-4 PostToolUse dropped = true
```

### AC-5 — a Codex-only consumer gets the runtime and no Claude registration

```
✔ refreshHookRuntime: a hosts: ["codex"] consumer receives the runtime and only the codex registration (25.5351ms)
✔ refreshHookRuntime: dropping both hosts removes the runtime and both registrations — the regression guard on the split host gate (34.1845ms)
```

Live `hosts: ["codex"]` refresh against the real repo root:

```
AC-5 runtime at .claude/hooks/hook.mjs = true
AC-5 .claude/settings.json absent = true
AC-5 codex registration commands = [
  'true:node ".claude/hooks/hook.mjs" --tool=codex --event=PreToolUse',
  'true:node ".claude/hooks/git-gates.mjs" --tool=codex --event=PreToolUse',
  'true:node ".claude/hooks/hook.mjs" --tool=codex'
]
```

### AC-6 — the Codex deny envelope, and the process exits 0

```
✔ HARNESSES.codex.emitDeny returns the envelope OpenAI documents for PreToolUse (0.0954ms)
✔ the spawned entry point denies a Codex apply_patch on an unread routed path, and exits 0 (117.2313ms)
✔ the spawned entry point routes --event=PreToolUse to the deny arm (228.5809ms)
```

`hook-gate.test.ts:1508` asserts both halves the criterion names: `assert.deepEqual(parsed, { hookSpecificOutput: { hookEventName: "PreToolUse", permissionDecision: "deny", permissionDecisionReason: … } })` and `assert.equal(denied.status, 0)`. The exit assertion is against a real spawned process's exit status, which is stronger than the `process.exitCode === 0` the Evidence sub-bullet names.

### AC-8 — `pnpm prism:check` passes

```
crossref-lint passed. All prose cross-references resolve.
install-adr-gate passed. No forbidden ADR references on the install surface.
install-relative-link-gate passed. All relative links on the install surface resolve.
spec-scope-lint: no live plan resolved for this branch — skipping.
Ship-surface closure holds — 346 file(s) reachable.
verify-pack-parity: all 10 runtime-read path(s) present in the tarball.
EXIT=0
```

Test totals: `tests 914 · pass 912 · fail 0 · skipped 2`. One skip is the by-design Windows exclusion (`cold-start: a packaged tarball delivers a working hook into a fresh consumer with no node_modules`).

**Scope note.** AC-8 reads "passes on both PRs," and only PR #487 (the delivery seam, plan tasks 1–7) exists today; PR 2 (plan tasks 9–15) has not been opened. The verdict above covers the half that exists and asserts nothing about the PR that does not. A human closing this plan should re-read AC-8 once PR 2 opens.

### AC-9 — no document still claims hook enforcement reaches Claude Code alone — **UNMET**

**Procedure:** ran the criterion's own command verbatim from the repo root.

```
grep -rn "Claude Code only" . --exclude-dir=node_modules --exclude-dir=.git
```

**Expected** (quoted from the Evidence sub-bullet): "returns only Cursor-scoped statements and ADR-0074's frozen `## Context` narration."

**Observed:** 30 matching lines. Beyond the two allowed classes, the command returns live claims in canonical spec, always-on prose, the consumer-facing docs, and the shipped seed. Representative hits:

- `.prism/rules/context-reuse.md:30` — "It reaches Claude Code only, it is friction rather than a wall…" (this is the file the criterion's own positive control names).
- `.prism/architect/_toolkit/install-layout.md:145` — "**Delivery is Claude Code only.** … no install path writes a Cursor or Codex settings file, so those hosts receive nothing today."
- `.prism/architect/_toolkit/install-layout.md:159` — "The registration is `PreToolUse` matched `Write|Edit|Bash`, and it reaches Claude Code only."
- `docs/ai-skills/compatibility.md:17`, `:69` (section heading), `:73`, `:83`.
- `AGENTS.md:858` — the same sentence as `context-reuse.md:30`, hand-maintained.
- `templates/install/.prism/architect/_toolkit/install-layout.md:121`, `:135`; `templates/install/.prism/rules/context-reuse.md:30`.
- The `.claude/`, `.codex/`, and `.cursor/` build mirrors of each of the above.

`scripts/ai-skills/doctor.ts:812` — the other file the positive control names — no longer carries the claim; its current message at `doctor.ts:984` names the string only as a `§` section citation into `compatibility.md`, whose heading is itself still one of the hits above.

**Evidence type:** executed.

The plan's `## Implementation Tasks` assigns this sweep to tasks 11–14, which the plan's own PR-split Decision places in PR 2 — an observation about where the work sits, not a diagnosis or a prescribed fix.

### AC-10 — the curated seed twin no longer contradicts itself — **UNMET**

**Procedure:** ran the criterion's own command verbatim.

```
grep -n "never blocks" templates/install/.prism/architect/_toolkit/install-layout.md
```

**Expected** (quoted from the Evidence sub-bullet): "returns nothing. Falsifiable: the pre-change file returns line 121."

**Observed:** exit 0 with one match — the exact line the criterion's positive control names as the pre-change state:

```
121:The hook announces; it never blocks. On a read that matches an architect-context route, it names each still-unread doc by path once per session — see [`.prism/rules/context-reuse.md`](../../rules/context-reuse.md). Delivery reaches Claude Code only: no install path writes a Cursor or Codex settings file today.
```

**Evidence type:** executed.

This matches the plan's own open `## Review Issues` entry, "Curated seed twin contradicts itself on whether the hook blocks," whose suggested fix is task 12 (PR 2).

---

## Awaiting human verification

Not graded, not counted in any machine total — surfaced at the human merge gate.

- [ ] **AC-7** — Given a live Codex session in a PRISM-installed repo with `hosts` including `codex`, When the session edits a routed spec file with the governing doc unread, Then Codex blocks the edit and shows the reason naming the doc to read.
  - The plan's task 8 `[HITL]` probe, with all four observations it names recorded in `## History`. AC-6 confirms the envelope and the exit-0 fail-open property mechanically; only a live Codex session can confirm Codex actually honors the envelope.

---

## Re-check log

- **2026-09-08 @ `fe50d415`** — first pass. 7 MET · 2 UNMET · 0 UNGRADEABLE across the 9 machine criteria; AC-7 routed to human verification. Both UNMET criteria (AC-9, AC-10) are documentation sweeps the plan assigns to PR 2.
