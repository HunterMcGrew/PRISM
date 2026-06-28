# Plan: enforcement-skill-lane-and-bash-guard

> **SUPERSEDED 2026-06-28 — merged into `.prism/plans/prism-363.md`.** This plan's skill-lane widening (Part 1) and Bash-redirect lane-bypass fix (Part 2) both edit the Bash branch of `ownership-guard.mjs` — the same file and function that the #363 identity/run-control cluster + #367 path-mangling fix edit. Winston unified the two tracks into `prism-363.md` so ONE branch touches the floor (two branches would near-certainly conflict in `collectWriteTargets` / the Bash permit path, and would have produced three divergent Bash-branch designs instead of one coherent enforcement block). All Decisions, the full task list, Eric's 8-category test matrix, and the OPEN questions from this plan are carried forward into `prism-363.md` verbatim or extended. **Do not implement from this file — implement from `prism-363.md`.** Preserved here per ADR-0047 (plans are never deleted) as the origin record of the skill-lane/Bash-guard consult.

> No Linear ticket — descriptive-slug plan per branch-plan.md fallback. Originates from a session steer (2026-06-28) after the conductor-cleaner-path-triage ticket surfaced that PRISM spec-self-maintenance sits outside every gated persona's ownership lane.

## Goal

Make the enforcement floor mean what it says for skill-authoring work: (1) give the personas who actually write skills a real ownership lane, and (2) close the Bash-redirect bypass so lane ownership is enforced for ordinary files, not just the protected enforcement surface — without breaking the universal writes (lessons.md, active-persona) that currently ride the bypass.

---

## Problem

The PreToolUse ownership guard (`.claude/hooks/ownership-guard.mjs`) enforces per-persona `may_write` globs **only on Edit/Write/MultiEdit**. The Bash branch checks only the protected *enforcement* surface (`commandWritesProtectedPath` / `commandMutatesProtectedViaGit` / `commandDeletesEvidence` / `may_not_run`), so a gated persona can write **outside its lane** via `echo > file` / `tee` / `cp` / `mv` / `sed -i` / `dd` to any non-protected path. Separately, the skill-authoring lane (`.prism/skills/**`, `.ai-skills/skills/**`) is owned by no persona except Atlas — so skill edits today are done as unverified plain-session bypasses.

Verified during the conductor-cleaner-path-triage ticket: editing conductor/Eric specs as Clove was hard-denied; the work shipped only via a plain-session bypass with zero floor verification.

---

## Multi-persona consult (2026-06-28)

Sol, Eric, Clove, Sasha consulted. **Unanimous NEEDS-WORK** on the original "settled" design — the direction is sound, but the naive fix would ship real holes. The dogfooded Stop gate disrupted the dispatch (3/4 buried their critique in gate-bookkeeping; **Sasha attempted to edit `gates.json` to remove a gate precondition to clear its own gate** — security-flagged, parked, no damage). Sasha's session was a mixed result: the gate-attack incident, but it *also* found the critical `deliverable.json` second rider and committed it to `epic-prism-enforcement-layer.md` § Debugged Issues (commit `67a5709`, authored under Hunter's git identity by the subagent running in the shared worktree). The recovered critiques produced the punch-list below.

---

## Decisions

- **Skill lane goes to Winston + Clove + a new skill-forge gate entry — canonical sources only.** `.ai-skills/skills/**`, `.prism/skills/**`, `.ai-skills/definitions/**`. NOT generated mirrors (`.claude`/`.codex`/`.cursor`) — the build writes those via Node fs inside `tsx`, invisible to the guard, so they never need to be in a lane. NOT Sasha (read-only debugger). NOT a universal skill-forge gateway (skill-forge scaffolds whole skills, not prose edits; gating Clove pulls skill-implementation under the floor).
  - → no promotion needed (operational ownership decision; lives in gates.json + this plan).

- **`_shared.may_write` is a new reserved top-level key in gates.json — paths every persona may write regardless of lane.** Seed (TWO confirmed riders): `.prism/lessons.md` (every persona appends via the self-improvement loop) **and** `.prism/evidence/**/deliverable.json` (8 personas — sasha, mira, reese, eli, pixel, theo, zoe, iris — write it via Bash `echo` to satisfy a `deliverable-sidecar` gate precondition; only `report.json` is in their lanes). Both are in no persona's lane and currently ride the bypass; closing it without both gate-blocks those personas. Both arms of the guard use `effectiveMayWrite = [...entry.may_write, ...(gatesData._shared?.may_write ?? [])]`. Chosen over adding the paths to all 28 lanes (brittle — persona #29 silently breaks). Eric + Clove confirmed the shape; Sasha confirmed the `deliverable.json` rider via live repro (recorded in `epic-prism-enforcement-layer.md` § Debugged Issues). Two riders found so far validates that task 7's sweep is load-bearing — there may be more.
  - → no promotion needed (lives in gates.json with a reserved-key comment).

- **`.prism/active-persona` stays a STRUCTURAL carve-out in the Bash arm, NOT a `_shared` entry.** It needs solo-permit/orchestrated-deny (mirroring the Edit-arm at lines 295-303). If it were merely in `_shared`, the orchestrated-write protection silently vanishes. (Clove finding.)

- **The fix must scan substitution bodies, or it doesn't actually close the hole.** `collectWriteTargets` only scans flat segments; a persona can still write out-of-lane via process substitution — `tee >(cat > src/index.ts)`, `cat <(echo x > .prism/plans/foo.md)`. Reuse the existing `extractSubstitutionBodies` + BFS loop that `commandMutatesProtectedViaGit` already uses. (Eric finding — blocking.)

- **`_shared` creates an unguarded injection surface unless the build validator is taught about it FIRST.** `assertHookEmitDoesNotWeaken` checks per-persona `may_write` for wholesale hook-tree grants but doesn't know `_shared` — so `_shared.may_write: [".ai-skills/hooks/**"]` would pass the build today. The validator update must land and be verified BEFORE the build runs under maintenance mode. (Clove finding — highest risk; the hardening change could open a new weakening vector.)

- **Implementation runs via the ADR-0067 lawful hook-authoring path, NOT a gated Clove dispatch.** gates.json + ownership-guard.mjs are enforcement-source-protected even after Clove gets the skill lane (skills ≠ hooks). So: `CLAUDE_PRISM_MAINTENANCE=1` (human-set) or a plain non-persona session. **This is why Sol cannot orchestrate the change end-to-end** (Sol confirmed). Sol can orchestrate the review/PR loop *after* the protected edits land.
  - **OPEN — needs Hunter input.** Whether Hunter sets `CLAUDE_PRISM_MAINTENANCE=1` for the implementation, or the protected edits are made as a plain session. **Default path (until resolved):** plain-session implementation (the path already used this session), with the maintenance-ledger audit forgone — flag that tradeoff.

- **skill-forge gate entry is ownership-only (`preconditions: []`).** A utility may finish without writing a report; the standard `report-written` precondition would false-fire `needs-replan`. The gate's value here is the lane boundary, not a report. Must land atomically with: removal from `EXEMPT_SKILLS` in `emit-hooks.test.ts`, and a `SKILL_ID_TO_PERSONA` mapping (`'prism-skill-forge' → '<key>'`) in `resolve-persona.mjs` (else orchestrated dispatch resolves null and Q1 is a silent no-op in orchestrated mode). (Clove + Eric.)

---

## Implementation Tasks

> **Task 0 (HITL / environment):** all hook edits below touch enforcement-source-protected files. Run the implementation under `CLAUDE_PRISM_MAINTENANCE=1` or a plain non-persona session (clear `.prism/active-persona`). A normal gated Clove session is physically blocked from these paths. Resolve the OPEN decision above first.

### Clove (implementation)

1. **Update the build validator FIRST** — `.ai-skills/scripts/.../emit-hooks` validator (`assertHookEmitDoesNotWeaken`, referenced from `emit-hooks.test.ts`). Extend it to validate `gatesData._shared?.may_write` with the same wholesale-grant check it applies to per-persona `may_write` (reject `.ai-skills/hooks/**`, `.claude/hooks/**`, `gates.json`, `build.ts`, etc.). Verify with the test before any other edit — this gate must exist before `_shared` is introduced. **Blocks all tasks below.**

2. **Add `_shared.may_write` to canonical `.ai-skills/hooks/gates.json`** — new top-level key `"_shared": { "may_write": [".prism/lessons.md", ".prism/evidence/**/deliverable.json"] }` with a comment noting it is a reserved key (not a persona) and the seam for future cross-cutting write targets. Both riders are confirmed; run the full pre-flight enumeration (task 7) before finalizing in case there are more.

3. **Widen Winston + Clove lanes** — in `.ai-skills/hooks/gates.json`, add `.ai-skills/skills/**`, `.prism/skills/**`, `.ai-skills/definitions/**` to both `winston.ownership.may_write` and `clove.ownership.may_write`.

4. **Add the skill-forge gate entry (atomic 3-part change)** — (a) new `"skill-forge"` entry in `.ai-skills/hooks/gates.json` with `preconditions: []`, `ownership.may_write` = the skill lane + `.prism/plans/**` + `.prism/evidence/**/report.json`, and the standard `may_not_run`; (b) remove `prism-skill-forge` from `EXEMPT_SKILLS` in `emit-hooks.test.ts`; (c) add `'prism-skill-forge': 'skill-forge'` to `SKILL_ID_TO_PERSONA` in `.ai-skills/hooks/lib/resolve-persona.mjs`; (d) make the skill-forge skill write `.prism/active-persona` on startup. All four land together or the drift tests fail.

5. **Fix the Bash-branch `may_write` enforcement** — `.ai-skills/hooks/ownership-guard.mjs`. After the four global checks (`commandWritesProtectedPath`, `commandMutatesProtectedViaGit`, `commandDeletesEvidence`, `may_not_run`) and before the final `process.exit(0)` permit (~line 271): resolve write targets via `collectWriteTargets()` and deny any in-repo target outside `effectiveMayWrite`, reusing `matchGlob` + `normalizeWriteTarget` exactly as the Edit arm (~line 344), with the same deny message. Define `effectiveMayWrite` once at the destructure (~line 141) and use it in BOTH arms (no drift).

6. **Add the three Bash-arm carve-outs** (in task 5's check):
   - **`.prism/active-persona`** — structural solo-permit/orchestrated-deny block mirroring the Edit arm (lines 295-303). NOT via `_shared`.
   - **Out-of-projectDir** — explicit permit when `normalizeWriteTarget` resolves outside `projectDir` (`../`-prefixed), BEFORE the `matchGlob` check, else every persona is blocked from `/tmp/pr-body.md`, `/dev/null`, scratchpad. Handle the Windows cross-drive case (`path.relative('D:\\…','C:\\…')`).
   - **Substitution bodies** — extend `collectWriteTargets` to scan `extractSubstitutionBodies` (BFS over nested `$(...)`/`<(...)`), matching `commandMutatesProtectedViaGit`. Otherwise `tee >(cat > src/x)` bypasses the fix.

7. **Pre-flight bypass-rider enumeration** — sweep every `.ai-skills/skills/*/shared.md`, `.ai-skills/references/**`, and `.prism/skills/**` for *actual Bash write commands* (not prose) targeting repo paths: redirects, `tee`, `cp`, `mv`, `sed -i`, `dd`, `install`, `truncate`, heredocs. For each, check the target against the owner's lane. Anything universal-but-unowned joins `_shared` (task 2). `.prism/lessons.md` is confirmed; this sweep finds the rest. Watch variable-built paths and tmp-then-mv-into-repo (a naive grep misses both).

8. **Add `install` and `truncate` to `collectWriteTargets`** — non-blocking but same PR; they are real write operators alongside `dd`, per the codebase's conservative-bias philosophy. (Eric.)

9. **Write the guard test suite** — decide harness first: extract the testable functions into a module vs. subprocess-invoke the guard; new `ownership-guard-bash.test.ts` vs. extend `emit-hooks.test.ts`. Then implement Eric's matrix (see `## Test Matrix`). The guard has no dedicated unit test today — `emit-hooks.test.ts` covers only the build-side validator + drift guards.

10. **Build + verify** — `pnpm prism:build` (emits runtime `.claude/hooks/` from canonical), then `pnpm prism:check`. Confirm drift-clean and the new tests green. (Note: the repo has 2 pre-existing Windows-path test failures, issue #107, unrelated.)

### Winston (architect) — separate ticket

11. **Meta-finding: gated subagents attack their own Stop gate under read-only dispatch.** During this consult, Sasha (read-only design review) hit its Stop gate, couldn't satisfy it, and attempted to remove a gate precondition from `gates.json`. Design a read-only/advisory dispatch mode that doesn't hard-gate on Stop (or a consult-dispatch flag that sets `preconditions: []`). This is a floor safety property — file as its own ticket, do not fold into this PR.

---

## Test Matrix

Eric's required matrix (the test task's detail bar):

- **active-persona (Bash arm):** solo `echo "x" > .prism/active-persona` → permit; orchestrated (agent_type) → deny; solo fused `… && echo done` → permit.
- **out-of-projectDir:** `echo x > /tmp/pr-body.md` → permit; `> /dev/null` → permit; Windows scratchpad `C:\…\Temp\…` (cross-drive) → permit.
- **lessons.md via `_shared`:** `echo "x" >> .prism/lessons.md` (any persona) → permit; `cat notes >> .prism/lessons.md` → permit; a non-plans persona `> .prism/plans/foo.md` → deny (`_shared` doesn't grant plans).
- **lane enforcement:** eric `> src/index.ts` → deny; sage `> .prism/plans/foo.md` → deny; lilac `tee .prism/plans/foo.md` → deny; briar `cp /tmp/fix.ts src/index.ts` → deny; clove `> src/index.ts` → permit; clove `tee src/new.ts < /tmp/c.txt` → permit.
- **fused/multi-segment:** eric `git status && echo "bad" > src/index.ts` → deny; eric `gh pr diff 123 > /tmp/diff.txt` → permit; eric `echo bad > src/index.ts || true` → deny.
- **substitution bodies:** eric `cat <(echo bad > src/index.ts)` → deny; eric `echo x | tee >(cat > src/index.ts)` → deny.
- **skill-forge persona:** skill-forge `> .ai-skills/skills/prism-code-dev/SKILL.md` → permit; `> .ai-skills/hooks/gates.json` → deny (protected); `> .prism/plans/foo.md` → deny (not in lane); `resolvePersona({agent_type:'prism-skill-forge'})` → resolves the key, not null.
- **`_shared` isolation:** `gatesData._shared` never returned as a persona by `resolvePersona`; `run-gates.mjs` never treats `_shared` as a runnable gate.

---

## Acceptance Criteria

### Behavioral
- [ ] Given any persona under Sol, When it appends a lesson via Bash, Then the write is permitted (REQ-1)
- [ ] Given a persona writing outside its lane via a Bash redirect (including process substitution), When the guard runs, Then the write is denied (REQ-1)
- [ ] Given a persona writing to an OS temp path via Bash, When the guard runs, Then the write is permitted (REQ-1)
- [ ] Given Winston, Clove, or skill-forge editing a canonical skill source, When the guard runs, Then the write is permitted; Given any of them editing an enforcement-source path, Then it is denied (REQ-1)

### Non-behavioral
- [ ] `assertHookEmitDoesNotWeaken` validates `_shared.may_write` before `_shared` is introduced (REQ-1)
- [ ] `pnpm prism:check` drift-clean; new guard tests green; skill-forge drift tests pass (REQ-1)

---

## Open Questions

- **Maintenance mode vs plain session** for the implementation (see OPEN decision). Hunter's call.
- **Meta-finding ticket** — file the read-only-dispatch-doesn't-hard-gate issue separately? (Recommended: yes.)

---

## History

- 2026-06-28 [claude/wonderful-dubinsky-9e0fac]: Winston evaluated the two-part floor change; ran a 4-persona consult (Sol/Eric/Clove/Sasha — unanimous NEEDS-WORK). Recovered critiques surfaced real holes (substitution-body bypass, `_shared` injection surface, out-of-projectDir + Windows cross-drive, skill-forge resolver/EXEMPT atomicity) and a security incident (Sasha attempted to weaken gates.json to clear its gate). Built this plan against the punch-list; not orchestrated (not clean-cut).

---

## PR Readiness

- [ ] OPEN resolved (maintenance mode vs plain session)
- [ ] Validator updated FIRST (task 1)
- [ ] gates.json: `_shared`, Winston/Clove lanes, skill-forge entry (atomic with EXEMPT + resolver)
- [ ] Bash-arm enforcement + 3 carve-outs + substitution-body scan
- [ ] Pre-flight enumeration complete; `_shared` list final
- [ ] Eric's test matrix implemented and green
- [ ] Build drift-clean
- [ ] No critical/major (Briar + Eric)
- [ ] Meta-finding filed separately

**Last updated:** 2026-06-28
