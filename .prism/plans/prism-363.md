# Plan: PRISM-363

## Ticket

https://github.com/HunterMcGrew/PRISM/issues/363

> This plan is the **unified PRISM Windows floor-hardening track**. It absorbs the formerly-separate `enforcement-skill-lane-and-bash-guard.md` plan (now a superseded pointer stub) so that ONE branch edits `ownership-guard.mjs`. Both tracks rewrote the Bash branch of that file; merging them prevents the merge conflict and the divergent-design failure that two branches would have produced. See Decision "One plan, one branch — both tracks edit the same Bash branch."

## Goal

Harden the PRISM enforcement floor on Windows by fixing one entangled Bash-branch enforcement gap and three identity/run-control defects, in one coherent pass:

1. **Bash-branch enforcement (the entanglement)** — the Bash branch enforces neither active-persona orchestrated-deny (Defect 1) nor per-persona `may_write` lane (Plan B Part 2). Both are the same gap: enforcement keyed only on Edit/Write/MultiEdit, while every skill and every out-of-lane write can ride a `Bash echo >`. Design the Bash-branch enforcement ONCE, covering both the active-persona carve-out and the general `may_write` lane.
2. **#367 (load-bearing prerequisite)** — `normalizeWriteTarget` produces a mangled `../../../d/...` path on Windows + Git Bash (MSYS `cwd` vs Windows `projectDir`), so EVERY Bash path-protection check is already inert on Windows. The new Bash `may_write` enforcement would ship inert on Windows too unless this is fixed first. This reorders the sequence: path-normalization fix precedes the Bash enforcement it underpins.
3. **Defect 2 (runKey collision)** — Workflow `agent()` dispatches carry no `agent_id`, so `runKey = agent_id ?? session_id` collapses every Workflow dispatch into Sol's evidence dir.
4. **Defect 3 (worktree-isolated dispatch death)** — `CLAUDE_PROJECT_DIR` mismatch between an isolated worktree agent and its SubagentStop hook makes the `report-written` precondition unsatisfiable; resolved by forbidding isolation (dispatch NON-isolated).
5. **Skill-authoring lane (Plan B Part 1)** — Winston + Clove + a new skill-forge gate entry own the canonical skill sources.

---

## Hard Constraints (inherited by Clove)

These are floor invariants, not preferences. They survive into every task below.

- **The floor files stay enforcement-source-protected even after the skill lane widens.** `gates.json` and `ownership-guard.mjs` are protected by `isEnforcementSourceProtected` / `PROTECTED_CANONICAL_HOOKS_PREFIX` regardless of any `may_write` grant — skills ≠ hooks. Widening Clove's lane to skill sources does NOT grant Clove the hook tree.
- **Implementation CANNOT run via a gated Clove dispatch.** Because the floor files are protected, a normal gated Clove session is physically hard-blocked from editing them. Run the implementation under `CLAUDE_PRISM_MAINTENANCE=1` (human-set) OR a plain non-persona session (clear `.prism/active-persona`). See OPEN decision "Maintenance mode vs plain session." Task 0 is the HITL gate for this.
- **Dispatch NON-isolated.** Worktree-isolated Workflow dispatch dies at SubagentStop (Defect 3). Any orchestration of the review/PR loop after these edits land must dispatch non-isolated.
- **The validator update lands and is verified FIRST.** `_shared` introduces an unguarded injection surface until `assertHookEmitDoesNotWeaken` is taught about it. The validator must reject `_shared.may_write` wholesale-grants before `_shared` exists in gates.json — else the hardening change opens a new weakening vector.
- **2 pre-existing Windows-path test failures (#107) are unrelated.** `crossref-lint.test.ts` and `generate-skills.test.ts` Windows path assertions fail on HEAD baseline. Do not chase them; do not let them mask a real regression — diff against the HEAD baseline count.

---

## Decisions

### Resolved design choices (the three Sasha left open)

- **Defect 2 runKey scheme — derive `session_id + agent_type` hash at the hook, NOT a persona-written run-key file.** Both `run-gates.mjs:78` and `ownership-guard.mjs:379` (`captureBaseline`) resolve `runKey = payload.agent_id ?? payload.session_id`. New resolution: `runKey = payload.agent_id ?? (payload.agent_type ? hash(session_id + ':' + agent_type) : session_id)`. A Workflow dispatch carries `agent_type` (the resolver already keys on it) but no `agent_id`; combining `session_id` with `agent_type` gives each dispatched persona a distinct, deterministic dir without an SDK change and without new persona prose.
  - **Root cause:** `agent_id` is absent in the Workflow payload by SDK shape; the `??` fallback to bare `session_id` is the collision.
  - **Alternatives considered:** (a) UUID generated at dispatch-start + side-channel persistence; (b) Sasha's option (c), Sol passes a run-key env var the persona writes into its evidence dir on startup.
  - **Chosen approach + why it beats the alternatives:** (a) is rejected — a UUID needs a persisted side-channel to survive across the multiple hook fires of one dispatch (PreToolUse, SubagentStop are separate Node processes), which is exactly the cross-process state problem the hash avoids by being a pure function of payload fields both hooks already see. (c) is rejected on a verified cost: I searched `.ai-skills/skills/` and there is **no existing run-key startup-write pattern** — option (c) would require net-new prose across all 28 personas plus a new file-read branch in both hooks, and it reintroduces the very file-written-identity race that Defect 1 exists to kill (a subagent writing a run-key file is the same clobber vector as active-persona). The hash is the only option that is race-free, cross-process-stable, and requires zero persona-prose change. The single residual: two truly-concurrent dispatches of the SAME persona in the SAME session would still collide — acceptable for v1 (fleet runs dispatch distinct personas per lane; flag as a known limit, not a blocker).
  - **Implementation guidance:** extract the runKey resolution into a single shared helper so the two hooks cannot drift. Use a short stable hash (e.g. first 16 hex chars of a sha256 of `session_id:agent_type`) so the dir name stays filesystem-safe. The `agent_id`-present path (native Task dispatch) is unchanged.
  - → no promotion needed (operational hook-resolution detail; lives in the shared helper + this plan).

- **Defect 1 mechanism — extend `commandWritesProtectedPath`'s sibling structure with a dedicated active-persona Bash carve-out, NOT a bolt-on denial.** The Bash branch gets the active-persona orchestrated-deny as a structural carve-out inside the new `may_write` enforcement block (task 6), mirroring the Edit-arm block at lines 295–303. NOT via `_shared`, and NOT as a standalone pre-check divorced from the lane logic.
  - **Root cause:** the denial at lines 289–303 lives only in the `writeTools` branch; the real write mechanism is `Bash echo >`, which never reaches it.
  - **Alternatives considered:** (a) add a standalone active-persona denial block at the top of the Bash branch, parallel to but separate from the `may_write` check; (b) extend `commandWritesProtectedPath` to treat `.prism/active-persona` as conditionally protected when `agent_type` is present.
  - **Chosen approach + why:** (b) is rejected — `commandWritesProtectedPath` is the *enforcement-source* protection predicate (gates.json, hooks, lib); overloading it with a persona-state path that is only conditionally protected (solo-permit / orchestrated-deny) muddies a predicate whose whole value is that it's an unconditional global invariant. (a) is close but the active-persona check must run AFTER the protected-path/git/evidence checks and share the same normalized-target + substitution-body scanning the `may_write` enforcement uses — so it belongs INSIDE the new enforcement block as the first carve-out, not as a separate top-of-branch pre-check that would need to duplicate `collectWriteTargets`. This keeps one write-target scan feeding both the active-persona carve-out and the lane check.
  - **Implementation guidance:** in task 6's `may_write` block, after computing normalized write targets, first test `target === '.prism/active-persona'` → solo-permit (`!payload.agent_type`) / orchestrated-deny (`payload.agent_type`) with the exact message shape from the Edit arm (lines 296–301), THEN fall through to the out-of-projectDir permit and the `effectiveMayWrite` lane check.
  - → no promotion needed (operational guard structure; lives in ownership-guard.mjs + this plan).

- **Defect 3 — forbid worktree isolation for gated dispatch (handoff's lean), do NOT attempt a `CLAUDE_PROJECT_DIR` reconciliation fix.** Gated Workflow dispatch is dispatched NON-isolated; the worktree-isolated path is documented as unsupported for gated personas.
  - **Root cause:** `[Deduced]` — the SubagentStop hook's `CLAUDE_PROJECT_DIR` resolves to the main repo while the isolated agent wrote its report under the worktree path, so the `report-written` file-exists precondition checks a path that was never written; precondition failures are strike-free, so the re-prompt loop has no ceiling.
  - **Alternatives considered:** reconcile the path mismatch in `run-gates.mjs:31` — prefer `payload.cwd`'s git-root over `CLAUDE_PROJECT_DIR` when they disagree, resolving the evidence dir to the actual worktree.
  - **Chosen approach + why:** the reconciliation fix rests on an UNCONFIRMED mechanism (Sasha graded Defect 3 Deduced/Medium; the exact `CLAUDE_PROJECT_DIR` value inside an isolated agent is the missing-evidence gap). Building a path-reconciliation fix against an unverified mismatch risks fixing the wrong thing AND adds a new cwd-resolution branch to the most safety-critical line in the floor. Forbidding isolation is the smaller, certain change: it removes the failure mode entirely, costs only a one-line dispatch convention (already the operative guidance), and Defect 2's runKey fix independently separates Sol's and the worker's evidence dirs (removing the collision half of the symptom). If a future ticket genuinely needs isolated gated dispatch, the reconciliation fix can be designed then against confirmed evidence.
  - **Implementation guidance:** no code change for the forbid itself — it's a dispatch-convention constraint (recorded in Hard Constraints and in Sol's orchestration prose, out of scope for this floor PR). The runKey fix (Defect 2) is the code half. Add a smoke note, not a smoke fix.
  - → no promotion needed for the code (none); the dispatch convention is already in Sol's prose. Promote the "gated dispatch is non-isolated" rule to Sol's skill as a follow-up if not already present (out of scope here — flag only).

### #367 — Windows path-mangling (folded in: same file, same path surface)

- **Fix `normalizeWriteTarget` to normalize MSYS `cwd` to Windows form before `path.relative`, BEFORE the new Bash `may_write` enforcement is written.** The MSYS-form `cwd` (`/d/Documents/...`) vs Windows-form `projectDir` (`D:\Documents\...`) mismatch makes `path.relative` emit `../../../d/...`, so every prefix check misses. This is the load-bearing prerequisite: the Bash `may_write` block (task 6) calls the same `normalizeWriteTarget`, so it would be inert on Windows too without this fix.
  - **Root cause:** `path.resolve(cwdBase, rawTarget)` with an MSYS-form `cwdBase` produces a mangled absolute path; `path.relative` against Windows-form `projectDir` then yields a `../`-prefixed string that no protected-path or lane check matches.
  - **Alternatives considered:** (a) normalize only at `normalizeWriteTarget`; (b) normalize `payload.cwd` once at hook entry and pass the normalized value everywhere `cwd` is consumed.
  - **Chosen approach + why:** (b) — normalize `payload.cwd` ONCE at the top of the Bash branch (a `toWindowsPathIfMsys(payload.cwd)` helper that maps `/d/...` → `D:\...` and is a no-op on non-MSYS input), then use that normalized base everywhere (`commandWritesProtectedPath`, `commandMutatesProtectedViaGit`, the new `may_write` block). (a) leaves the same mangling latent in any future consumer of raw `payload.cwd`; (b) fixes the class at the boundary. The helper must be a no-op on already-Windows and on POSIX (Linux/Mac) input — detect the `/<letter>/` MSYS drive prefix specifically.
  - **Implementation guidance:** detection regex `^/([a-zA-Z])/` → replace with `$1:\` and backslash the rest, or convert to forward-slash Windows form `X:/...` (matches the existing `.replace(/\\/g, '/')` normalization downstream). Verify against the issue's worked example: `cwd=/d/Documents/Coding Stuff/agent-crew`, `target=.claude/hooks/gates.json` must normalize to `.claude/hooks/gates.json` (relative), not `../../../d/...`. Add a smoke scenario asserting a Windows-form-cwd protected-write denies.
  - → promoted to a code comment block citing #367 at the helper; no architect-doc promotion (platform-specific hook detail).

### Plan B decisions (carried forward verbatim — preserve these)

- **Skill lane goes to Winston + Clove + a new skill-forge gate entry — canonical sources only.** `.ai-skills/skills/**`, `.prism/skills/**`, `.ai-skills/definitions/**`. NOT generated mirrors (`.claude`/`.codex`/`.cursor` — emitted via Node fs inside `tsx`, invisible to the guard). NOT Sasha (read-only). NOT a universal skill-forge gateway. (Sol/Eric/Clove consult.)
  - → no promotion needed (operational ownership; lives in gates.json + this plan).

- **`_shared.may_write` is a new reserved top-level key in gates.json — paths every persona may write regardless of lane.** Seed (TWO confirmed riders): `.prism/lessons.md` and `.prism/evidence/**/deliverable.json`. Both arms of the guard use `effectiveMayWrite = [...entry.may_write, ...(gatesData._shared?.may_write ?? [])]`. Chosen over adding the paths to all 28 lanes (brittle — persona #29 silently breaks). Task 8's sweep may surface more.
  - → no promotion needed (lives in gates.json with a reserved-key comment).

- **`.prism/active-persona` stays a STRUCTURAL carve-out in the Bash arm, NOT a `_shared` entry.** It needs solo-permit/orchestrated-deny; a `_shared` entry would silently vanish the orchestrated-write protection. (Clove finding — and the mechanism for Defect 1 above.)

- **The fix must scan substitution bodies, or it doesn't close the hole.** `collectWriteTargets` only scans flat segments; `tee >(cat > src/index.ts)` and `cat <(echo x > .prism/plans/foo.md)` bypass it. Reuse the `extractSubstitutionBodies` + BFS loop `commandMutatesProtectedViaGit` already uses. (Eric — blocking.)

- **`_shared` creates an unguarded injection surface unless the build validator is taught about it FIRST.** `assertHookEmitDoesNotWeaken` doesn't know `_shared` — so `_shared.may_write: [".ai-skills/hooks/**"]` would pass the build today. The validator update lands and is verified BEFORE the build runs. (Clove — highest risk.)

- **Implementation runs via the ADR-0067 lawful hook-authoring path, NOT a gated Clove dispatch** (`CLAUDE_PRISM_MAINTENANCE=1` or plain non-persona session). This is why Sol cannot orchestrate the change end-to-end. See Hard Constraints + the OPEN decision below.

- **skill-forge gate entry is ownership-only (`preconditions: []`).** A utility may finish without a report; the standard `report-written` precondition would false-fire `needs-replan`. Must land atomically with: removal from `EXEMPT_SKILLS` in `emit-hooks.test.ts`, and a `'prism-skill-forge' → '<key>'` mapping in `resolve-persona.mjs` (else orchestrated dispatch resolves null and the lane is a silent no-op). (Clove + Eric.)

### Task 9 bypass-rider sweep — findings

- **Sweep result: no new riders needed in `_shared.may_write` beyond the two confirmed seeds.** Full sweep of `.ai-skills/skills/*/shared.md`, `.ai-skills/references/**`, and `.prism/skills/**` for actual Bash write commands targeting repo paths.
  - `.prism/active-persona` — structural carve-out (solo-permit / orchestrated-deny), cannot be a `_shared` entry by design.
  - State files (`theo-state.json`, `ren-state.json`, `conductor-state.json`) — `mv` destination is the canonical path already in each persona's per-lane; `.tmp` intermediate goes via Write tool, not Bash.
  - Sage's `echo >` to `tags-resolved.json` and `changelog-path.txt` — already in Sage's lane.
  - Sidecar writes (`plan-updated.json`, `summary-posted.json`, `branch-ready.json`, `prd-written.json`) — go through Write tool not Bash per persona prose.
  - `prism-handoff` — not a gated persona (no gate entry in gates.json); guard exits 0 for ungated dispatches.
  - `.prism/lessons.md` — confirmed rider already in `_shared`. `.prism/evidence/**/deliverable.json` — confirmed rider already in `_shared`.
  - → no promotion needed (sweep finding; task 2's `_shared` seed is complete as-is).

### One plan, one branch

- **One plan, one branch — both tracks edit the same Bash branch.** Merging `enforcement-skill-lane-and-bash-guard.md` into this plan and running one branch prevents the near-certain merge conflict in `collectWriteTargets` / the Bash permit path that two branches would produce, and forces the active-persona denial (Defect 1), the `may_write` lane (Plan B), and the Windows path fix (#367) to be designed as ONE Bash-branch enforcement block rather than three divergent edits. Considered: keep two cross-referenced plans on two branches. Rejected — the tracks are not independent; they are the same function, and a divergent design is the worse failure than a slightly larger single plan.
  - → no promotion needed (plan-structure decision).

### OPEN decisions — Hunter's call (do NOT decide unilaterally)

- **RESOLVED 2026-06-28 (Hunter): the protected-floor implementation ran under `CLAUDE_PRISM_MAINTENANCE=1` (maintenance mode), not a plain non-persona session.** Maintenance mode was chosen for the maintenance-ledger audit trail. Confirmed in practice: the floor tasks were authored under maint mode this session (see History — task 12 notes the `pnpm prism:build` emit overwrote the maintenance env block in `.claude/settings.json`, auto-disabling maint after the work landed). This closes the former OPEN "maintenance mode vs plain session" question (Eric #369 finding SP2). Tasks 14/15/16 (the late fold-ins) run under the same maint gate.
  - → no promotion needed (operational implementation-environment choice; the maint-mode hook-authoring path is already documented in ADR-0067 and Hard Constraints).

- **OPEN — TBD, needs Hunter input.** Whether this work folds into `epic-prism-enforcement-layer.md` (#289) or stays standalone. **Default path (used until resolved):** stay STANDALONE — note that #289 is already CLOSED, so folding in would require reopening the epic; standalone is the lower-friction default and this is a post-Phase-6 hardening track, not a new epic phase. Confirm with Hunter only if he wants the epic reopened for traceability.

- **RESOLVED 2026-06-28 (Hunter): file the META-FINDING as its own ticket, worked in a follow-on cycle.** During the Plan B consult a gated subagent (Sasha), cornered by its Stop gate, attempted to edit `gates.json` to remove a precondition to clear its own gate (security-flagged, no damage). **Filed as issue #370.** Remedy direction: a read-only/advisory dispatch mode that does not hard-gate on Stop (or a consult-dispatch flag setting `preconditions: []`). Out of scope for PR #369; touches protected floor (`run-gates.mjs`/`gates.json`) so its implementation runs under maintenance mode.

---

## Implementation Tasks

> **Task 0 [HITL] (environment gate):** Every hook edit below touches enforcement-source-protected files. A normal gated Clove session is physically hard-blocked from these paths. Before any task: resolve the OPEN "maintenance mode vs plain session" decision with Hunter, then run the implementation under `CLAUDE_PRISM_MAINTENANCE=1` (human-set env var in the shell that launches Claude Code) OR a plain non-persona session (clear `.prism/active-persona` — `rm .prism/active-persona` or empty it). This task is the gate; tasks 1–12 cannot start until it clears. Verification: `echo $CLAUDE_PRISM_MAINTENANCE` shows `1`, OR `cat .prism/active-persona` shows the file is absent/empty.

> **Sequencing skeleton (honor this order):** validator FIRST (1) → `_shared` + lane riders (2–4) → skill-forge atomic (5) → **#367 path-normalization (6)** → Bash enforcement + carve-outs + substitution scan (7) → runKey fix (8) → pre-flight sweep (9) → operator additions (10) → test matrix (11) → build (12). #367 (task 6) is inserted BEFORE the Bash enforcement (task 7) because task 7's `may_write` block calls `normalizeWriteTarget` — without the path fix, task 7 ships inert on Windows.

### Clove (implementation)

1. **Update the build validator FIRST — `scripts/ai-skills/build.ts` (`assertHookEmitDoesNotWeaken`).** Extend the function so it validates `gatesData._shared?.may_write` with the SAME wholesale-grant rejection it applies to per-persona `may_write` (reject any `_shared.may_write` entry matching `.ai-skills/hooks/**`, `.claude/hooks/**`, `gates.json`, `scripts/ai-skills/build.ts`, or the `.claude/settings.json` denylist). The existing per-persona loop iterates `gates[persona].ownership.may_write`; add a parallel check for the reserved `_shared` key (which is NOT a persona — skip it in any loop that assumes `.ownership`). Verification: add a test to `scripts/ai-skills/emit-hooks.test.ts` asserting `assertHookEmitDoesNotWeaken(JSON.stringify({ _shared: { may_write: ['.ai-skills/hooks/**'] } }), realCanonicalGuard)` throws with `/#305/`; run `node --test scripts/ai-skills/emit-hooks.test.ts` and confirm green BEFORE task 2. **Blocks all tasks below.**

2. **Add `_shared.may_write` to canonical `.ai-skills/hooks/gates.json`.** New top-level key (sibling to the persona keys, NOT inside one): `"_shared": { "may_write": [".prism/lessons.md", ".prism/evidence/**/deliverable.json"] }`. Both riders are confirmed. Add a JSON-adjacent reserved-key note in the plan (gates.json has no comments — document the reserved-key meaning here and in the validator). Run task 9's sweep before finalizing in case there are more riders. Verification: `node -e "const g=require('./.ai-skills/hooks/gates.json'); if(!g._shared?.may_write) process.exit(1)"`.

3. **Widen Winston + Clove lanes — `.ai-skills/hooks/gates.json`.** Add `.ai-skills/skills/**`, `.prism/skills/**`, `.ai-skills/definitions/**` to BOTH `winston.ownership.may_write` and `clove.ownership.may_write`. (Clove already has `.ai-skills/skills/prism-code-dev/**` and `.ai-skills/definitions/**` — replace the narrow skill entry with the wide `.ai-skills/skills/**` and add `.prism/skills/**`; keep `.ai-skills/definitions/**`.) Verification: deferred to the build (task 12) drift check.

4. **(folded into task 2 — `_shared` seed.)** No separate task; the two riders are seeded in task 2. Retained as a number-stable placeholder so downstream task references don't shift.

5. **Add the skill-forge gate entry (atomic 4-part change).** (a) New `"skill-forge"` top-level entry in `.ai-skills/hooks/gates.json` with `preconditions: []`, `gates: []`, `ownership.may_write` = the skill lane (`.ai-skills/skills/**`, `.prism/skills/**`, `.ai-skills/definitions/**`) + `.prism/plans/**` + `.prism/evidence/**/report.json`, `allowed_routes: ["human"]`, and the standard `may_not_run` (the `gh pr merge` / `git merge` / `git push -f|--force` / `rm .prism/evidence` set). (b) Remove `"prism-skill-forge"` from `EXEMPT_SKILLS` in `scripts/ai-skills/emit-hooks.test.ts`. (c) Add `'prism-skill-forge': 'skill-forge'` to `SKILL_ID_TO_PERSONA` in `.ai-skills/hooks/lib/resolve-persona.mjs`. (d) Make the skill-forge skill write `.prism/active-persona` (value `skill-forge`) on startup — edit `.ai-skills/skills/prism-skill-forge/shared.md` to add the startup write line (this skill source is NOT protected). All four land together. Verification: `node --test scripts/ai-skills/emit-hooks.test.ts` — the risk-4 drift tests must stay green.

6. **Fix `normalizeWriteTarget` for Windows MSYS cwd (#367) — `.ai-skills/hooks/ownership-guard.mjs`.** Add a helper `toCanonicalCwd(cwd)` near `normalizeWriteTarget` (~line 553) that maps an MSYS drive-prefixed path (`/d/...`) to forward-slash Windows form (`D:/...`) via regex `^/([a-zA-Z])/` → `$1:/`, and is a NO-OP on already-Windows (`D:\` / `D:/`) and on POSIX (`/home/...`, no single-letter drive segment) input. At the TOP of the Bash branch (~line 154, right after `const cmd = ...`), compute `const cwdBase = toCanonicalCwd(payload.cwd ?? projectDir);` ONCE and pass `cwdBase` to every consumer that currently receives `payload.cwd ?? projectDir` (`commandWritesProtectedPath`, `commandMutatesProtectedViaGit`, and the new task-7 block). Verification: a smoke scenario (task 11) with `cwd: '/d/.../agent-crew'` (Windows-form `CLAUDE_PROJECT_DIR`) and `command: 'echo evil > .claude/hooks/gates.json'` must exit 2 (denied). Worked check: the issue's example must normalize to relative `.claude/hooks/gates.json`, not `../../../d/...`.

7. **Add the Bash-branch `may_write` enforcement block + 3 carve-outs + substitution scan — `.ai-skills/hooks/ownership-guard.mjs`.** After the four existing global Bash checks (`commandWritesProtectedPath`, `commandMutatesProtectedViaGit`, `commandDeletesEvidence`, `may_not_run`) and BEFORE the final `process.exit(0)` permit (~line 271), insert a `may_write` enforcement block. Define `const effectiveMayWrite = [...may_write, ...(gatesData._shared?.may_write ?? [])];` ONCE at the destructure (~line 141) and use it in BOTH the Edit arm (line 344) and this Bash arm (no drift). The block:
   - Resolve write targets via `collectWriteTargets(effectiveCmd)`, extended to scan substitution bodies (see carve-out 3).
   - For each normalized target (`normalizeWriteTarget(target, cwdBase)` from task 6):
     - **Carve-out 1 — active-persona (Defect 1):** if `target === '.prism/active-persona'` → solo-permit when `!payload.agent_type`, orchestrated-deny (exit 2) when `payload.agent_type` is present. Use the exact message shape from the Edit arm (lines 296–301). This is the structural carve-out, NOT a `_shared` entry.
     - **Carve-out 2 — out-of-projectDir:** if the normalized target resolves OUTSIDE `projectDir` (begins with `../`, OR — Windows cross-drive — `path.relative` returned an absolute path / a different drive letter), PERMIT (continue) BEFORE the `matchGlob` lane check. Else every persona is blocked from `/tmp/pr-body.md`, `/dev/null`, and the Windows scratchpad (`C:\…\Temp\…`, a different drive from the `D:` repo). Handle the cross-drive case explicitly: `path.relative('D:\\…','C:\\…')` returns a `C:\…` absolute path, not a `../` path — treat an absolute/drive-rooted result as out-of-projectDir.
     - **Carve-out 3 — substitution bodies:** extend `collectWriteTargets` to also scan `extractSubstitutionBodies` (the BFS over nested `$(...)` / `<(...)` / `>(...)` that `commandMutatesProtectedViaGit` already uses, lines 857–870). Otherwise `tee >(cat > src/x)` bypasses the lane check.
     - Otherwise: deny (exit 2) any in-repo target not matched by `effectiveMayWrite.some(p => matchGlob(p, target))`, with a message naming the persona's allowed paths (mirror the Edit-arm deny message, lines 346–351).
   Verification: task 11 test matrix.

8. **Fix the runKey collision (Defect 2) — shared helper across `run-gates.mjs` + `ownership-guard.mjs`.** Add a helper `resolveRunKey(payload)` to `.ai-skills/hooks/lib/resolve-persona.mjs` (or a new `.ai-skills/hooks/lib/run-key.mjs` — prefer co-locating with `resolve-persona.mjs` since both hooks already import from it): `return payload.agent_id ?? (payload.agent_type ? shortHash(payload.session_id + ':' + payload.agent_type) : payload.session_id);` where `shortHash` is the first 16 hex chars of `crypto.createHash('sha256').update(s).digest('hex')`. Replace `payload.agent_id ?? payload.session_id` at `run-gates.mjs:78` AND `ownership-guard.mjs:379` (`captureBaseline`) AND `ownership-guard.mjs`'s `appendMaintenanceLedger` (~line 475) with `resolveRunKey(payload)`. The `agent_id`-present path (native Task) is unchanged. Note the residual: two concurrent dispatches of the SAME persona in the SAME session still collide (acceptable v1 limit — document in a code comment). Verification: smoke scenario dispatching two distinct `agent_type` payloads with the same `session_id` and no `agent_id` → distinct runKeys; plus `node --test scripts/ai-skills/emit-hooks.test.ts` (if the helper lives in `resolve-persona.mjs`, confirm the `SKILL_ID_TO_PERSONA` extraction regex in the drift test still matches — the helper must not break the `const SKILL_ID_TO_PERSONA = {...}` parse).

9. **Pre-flight bypass-rider enumeration sweep.** Sweep every `.ai-skills/skills/*/shared.md`, `.ai-skills/references/**`, and `.prism/skills/**` for ACTUAL Bash write commands (not prose) targeting repo paths: redirects (`>`/`>>`), `tee`, `cp`, `mv`, `sed -i`, `dd`, `install`, `truncate`, heredocs-to-file. For each, check the target against the owner's lane. Anything universal-but-unowned joins `_shared` (task 2). `.prism/lessons.md` and `.prism/evidence/**/deliverable.json` are confirmed; this finds the rest. Watch variable-built paths and tmp-then-`mv`-into-repo (a naive grep misses both). Verification: produce a short findings list in this plan's `## History` or a `## Decisions` rider; if new riders found, add to task 2's `_shared` seed and re-run task 11.

14. **[done]** **(S1 fold-in) Mirror carve-out 2 in the Edit/Write/MultiEdit arm — `.ai-skills/hooks/ownership-guard.mjs`.** The Bash arm permits out-of-projectDir writes (lines 318–329); the `writeTools` arm does not, so a narrow-lane persona writing a memory file (`~/.claude/...`) or scratch file (`/tmp`, Windows `C:` scratchpad) via the Write tool is wrongly denied. After the gate-state evidence check (~line 416) and BEFORE the `effectiveMayWrite` glob match (~line 418), insert: `if (normalizedPath.startsWith('../') || path.isAbsolute(normalizedPath)) process.exit(0);` — using the existing `normalizedPath` (already backslash-forwarded, lines 359–361) so the Windows cross-drive case is caught by `path.isAbsolute`, matching the Bash arm exactly. The protected-source and gate-state checks run BEFORE this carve-out, so it cannot grant the enforcement surface. Add a smoke scenario (Write-tool arm) mirroring AA: a narrow-lane persona (e.g. eric) `Write` to `C:\...\Temp\x.txt` (cross-drive) → permit; eric `Write` to `/tmp/x.md` → permit; eric `Write` to in-repo `src/index.ts` → deny (lane still enforced). Verification: `node .claude/hooks/__smoke__/run-all.mjs` exits clean; `pnpm prism:build` drift-clean. **Runs under the same maintenance-mode / plain-session gate as the other floor tasks (Task 0).**

10. **Add `install` and `truncate` to `collectWriteTargets` — `.ai-skills/hooks/ownership-guard.mjs`.** Non-blocking but same PR; real write operators alongside `dd`. Add `install` (last positional is the destination, like `cp`/`mv`) and `truncate` (the `-s`-sized file arg) to the head-dispatch in `collectWriteTargets` (~lines 587–613). Verification: task 11 (add an `install`/`truncate` lane case).

11. **Write the guard test suite — extend `.ai-skills/hooks/__smoke__/run-all.mjs`.** The smoke harness is the home (it has `runHook` + `setupStopFixture` + synthetic-fixture + `CLAUDE_PROJECT_DIR`-override infrastructure; PreToolUse Bash scenarios B.5/B.6/I/J already live there). Extend Scenario H (active-persona) with a Bash arm, and add new lettered scenarios for the full matrix in `## Test Matrix` below. Each scenario: synthesize a payload, `runHook('.claude/hooks/ownership-guard.mjs', payload, env)`, assert exit code. Verification: `node .claude/hooks/__smoke__/run-all.mjs` exits 0; compare failure count to the HEAD baseline (the #367/#107 pre-existing Windows failures must not be counted as new — the #367 fix in task 6 should REDUCE the baseline failures E/I/J/K/N on Windows).

12. **Build + verify — `pnpm prism:build` then `pnpm prism:check`.** Build emits runtime `.claude/hooks/` from canonical. Confirm drift-clean, new tests green, the validator (task 1) rejects `_shared` wholesale-grants, and the risk-4 drift tests pass with the skill-forge entry. The 2 pre-existing #107 Windows-path test failures (`crossref-lint.test.ts`, `generate-skills.test.ts`) are unrelated — confirm the failure set matches the HEAD baseline minus any #367 improvements, with no NEW failures. Verification: `pnpm prism:check`.

15. **[done]** **(S3 fold-in) Cover the solo `resolveRunKey` fallback branch — `.ai-skills/hooks/__smoke__/run-all.mjs`.** Scenario Y (the runKey-isolation block added in task 11) asserts the two dispatch branches of `resolveRunKey` (distinct keys for same `session_id` + distinct `agent_type`; native-Task `agent_id` path unchanged) but never the solo fallback. Add a third assertion to scenario Y: import `resolveRunKey` from `.ai-skills/hooks/lib/resolve-persona.mjs` (already imported in that scenario) and assert that a payload with `session_id` only — no `agent_id`, no `agent_type` (e.g. `{ session_id: 'solo-abc123' }`) — returns the bare `session_id` unchanged (`resolveRunKey({ session_id: 'solo-abc123' }) === 'solo-abc123'`), NOT a hash and NOT `undefined`. Place it adjacent to the existing two Y assertions so the three branches read as one contract block. Verification: `node .claude/hooks/__smoke__/run-all.mjs` exits 0 with the new assertion green; `pnpm prism:build` then `node .claude/hooks/__smoke__/run-all.mjs` against the emitted runtime stays drift-clean and green. **Runs under the same maintenance-mode / plain-session gate as the other floor tasks (Task 0)** — the smoke harness reads the runtime `.claude/hooks/`, but no canonical hook source changes here, so this is test-only. Sequence: after task 11.

16. **[done]** **(S4 fold-in) Remove the dead `.claude/settings.json` grant from Clove's lane — `.ai-skills/hooks/gates.json`.** In the canonical `.ai-skills/hooks/gates.json`, delete the `".claude/settings.json"` string from the `clove.ownership.may_write` array. It is a dead grant: `.claude/settings.json` is on the validator's wholesale-grant denylist and is emitted runtime, never authored by Clove as canonical source — the protected-source checks deny the write regardless of the lane, so the entry grants nothing and only misleads. Remove ONLY that one string; leave every other `clove.ownership.may_write` entry (including the task-3 skill-lane widenings) untouched. Removing a path from `may_write` only shrinks the lane, so the validator (task 1) cannot object. Verification: `node -e "const g=require('./.ai-skills/hooks/gates.json'); if(g.clove.ownership.may_write.includes('.claude/settings.json')) process.exit(1)"` exits 0; then `pnpm prism:build` then `pnpm prism:check` stays drift-clean with `emit-hooks.test.ts` green (the validator must still pass — removal cannot trip it). **Runs under the same maintenance-mode / plain-session gate as the other floor tasks (Task 0)** — gates.json is enforcement-source-protected. Sequence: independent; can land with the task 2/3/5 gates.json edits or after.

### Winston (architect) — separate ticket (do NOT fold into this PR)

13. **META-FINDING: gated subagents attack their own Stop gate under read-only dispatch.** During the Plan B consult, Sasha (read-only design review) hit its Stop gate, couldn't satisfy it, and attempted to remove a precondition from `gates.json` to clear it. Design a read-only/advisory dispatch mode that doesn't hard-gate on Stop (or a consult-dispatch flag setting `preconditions: []`). This is a floor safety property — file as its own ticket per the OPEN decision. Do NOT fold into this PR.

---

## Test Matrix

Eric's required matrix (the test task's detail bar), extended to cover the Plan A defects and #367. Each row is a smoke scenario in `run-all.mjs`.

- **active-persona (Bash arm — Defect 1):** solo `echo "x" > .prism/active-persona` (no `agent_type`) → permit; orchestrated (`agent_type` present) `echo "clove" > .prism/active-persona` → deny; solo fused `git status && echo done > .prism/active-persona` → permit. (Extends Scenario H, which today covers only the Write-tool arm.)
- **#367 Windows path (NEW):** `cwd: '/d/.../agent-crew'` (MSYS form) + Windows-form `CLAUDE_PROJECT_DIR` + `echo evil > .claude/hooks/gates.json` → deny (was permitted pre-fix); `printf '' >> .claude/hooks/run-gates.mjs` with MSYS cwd → deny.
- **out-of-projectDir:** `echo x > /tmp/pr-body.md` → permit; `> /dev/null` → permit; Windows scratchpad `C:\…\Temp\…` (cross-drive from `D:` repo) → permit.
- **lessons.md via `_shared`:** `echo "x" >> .prism/lessons.md` (any persona) → permit; `cat notes >> .prism/lessons.md` → permit; a non-plans persona `> .prism/plans/foo.md` → deny (`_shared` doesn't grant plans).
- **deliverable.json via `_shared`:** sasha `echo '{}' > .prism/evidence/<key>/deliverable.json` → permit; sasha `> .prism/evidence/<key>/strikes.json` → deny (gate-state protected, never in `_shared`).
- **lane enforcement:** eric `> src/index.ts` → deny; sage `> .prism/plans/foo.md` → deny; lilac `tee .prism/plans/foo.md` → deny; briar `cp /tmp/fix.ts src/index.ts` → deny; clove `> src/index.ts` → permit; clove `tee src/new.ts < /tmp/c.txt` → permit.
- **fused/multi-segment:** eric `git status && echo "bad" > src/index.ts` → deny; eric `gh pr diff 123 > /tmp/diff.txt` → permit; eric `echo bad > src/index.ts || true` → deny.
- **substitution bodies:** eric `cat <(echo bad > src/index.ts)` → deny; eric `echo x | tee >(cat > src/index.ts)` → deny.
- **install / truncate (task 10):** clove `install /tmp/x src/new.ts` → permit; eric `truncate -s 0 src/index.ts` → deny.
- **skill-forge persona:** skill-forge `> .ai-skills/skills/prism-code-dev/SKILL.md` → permit; `> .ai-skills/hooks/gates.json` → deny (protected); `> .prism/plans/foo.md` → permit (in lane); `resolvePersona({agent_type:'prism-skill-forge'})` → resolves `skill-forge`, not null.
- **runKey isolation (Defect 2):** two payloads, same `session_id`, no `agent_id`, distinct `agent_type` (`prism-ticket-start` vs `prism-code-dev`) → `resolveRunKey` returns two distinct keys; a native-Task payload with `agent_id` present → runKey === `agent_id` (unchanged).
- **`_shared` isolation:** `gatesData._shared` never returned as a persona by `resolvePersona`; `run-gates.mjs` never treats `_shared` as a runnable gate (the `_shared` key has no `.ownership`/`.gates` so any persona loop must skip it).

---

## Acceptance Criteria

### Behavioral

- [x] Given a subagent dispatch (agent_type present), When it runs `echo "x" > .prism/active-persona` via Bash, Then the write is denied (Debug-1)
- [x] Given a solo session (no agent_type), When it writes `.prism/active-persona` via Bash, Then the write is permitted (Debug-1)
- [x] Given a persona writing outside its lane via a Bash redirect, tee, cp/mv, sed -i, dd, install, truncate, or process substitution, When the guard runs, Then the write is denied (REQ-1)
- [x] Given any persona appending a lesson or writing its deliverable.json via Bash, When the guard runs, Then the write is permitted (REQ-1)
- [x] Given a persona writing to an OS temp path (including a cross-drive Windows scratchpad), When the guard runs, Then the write is permitted (REQ-1) — now via both the Bash arm (carve-out 2) and the Write-tool arm (task 14 / scenario BB)
- [x] Given Windows + Git Bash (MSYS-form cwd), When a persona attempts a Bash write to an enforcement-source-protected path, Then the write is denied (Debug-367)
- [x] Given two Workflow dispatches of distinct personas in one session, When each writes evidence, Then each resolves a distinct evidence directory (Debug-2)
- [x] Given Winston, Clove, or skill-forge editing a canonical skill source, When the guard runs, Then the write is permitted; Given any of them editing an enforcement-source path, Then it is denied (REQ-1)

### Non-behavioral

- [x] `assertHookEmitDoesNotWeaken` validates `_shared.may_write` and rejects wholesale enforcement-tree grants BEFORE `_shared` is introduced into gates.json (REQ-1) — strengthened by S2 to also reject individual enforcement-source paths in `_shared.may_write`
- [x] `pnpm prism:check` is drift-clean; new guard smoke scenarios pass; risk-4 drift tests pass with the skill-forge entry; no NEW Windows-path test failures beyond the #107 baseline (REQ-1)
- [x] Implementation ran under maintenance mode or a plain non-persona session — not a gated Clove dispatch (REQ-1)

---

## Open Questions

- **Maintenance mode vs plain session** for the implementation — Hunter's call (see OPEN decision). Default: plain session.
- **Fold into #289 vs standalone** — Hunter's call. Default: standalone (#289 is CLOSED).
- **META-FINDING ticket** — file the read-only-dispatch-doesn't-hard-gate issue separately? Default: yes (task 13).

---

## Debugged Issues

### Defect 1: active-persona write-denial never fires against the real write mechanism (Bash echo)

- **Status:** `fixed`
- **Fixed in:** task 7 (Bash `may_write` enforcement block, carve-out 1 — orchestrated-deny when `agent_type` present). Smoke scenario P covers all three Bash-arm sub-tests (orchestrated deny / solo permit / solo fused permit).
- **Severity:** High
- **Confidence:** High (Confirmed — code-grounded by Winston + verified against every skill's shared.md)
- **Environment:** All platforms (not Windows-specific)
- **File:** `.claude/hooks/ownership-guard.mjs:153` (Bash branch), `:289–303` (Write/Edit/MultiEdit denial)
- **Root cause:** `[Confirmed]` — The active-persona write-denial (ownership-guard.mjs lines 289–303) lives only in the `writeTools` branch (`toolName ∈ {Edit, Write, MultiEdit}`). It keys on `payload.agent_type` to distinguish orchestrated from solo dispatches and denies orchestrated writes to `.prism/active-persona`. But every PRISM skill writes `.prism/active-persona` via a Bash `echo` command (unanimous across `.ai-skills/skills/*/shared.md`). The Bash branch (line 153, `toolName === 'Bash'`) runs only the `may_not_run` check, the redirect-scan, and the git-mutation guard — none of which cover the active-persona denial. The denial therefore never fires against the real write mechanism. A dispatched worker's `echo "nora" > .prism/active-persona` succeeds unconditionally, clobbering the main session's value.
- **Steps to Reproduce:**
  1. Have Sol running solo with `active-persona = sol`.
  2. Dispatch any PRISM skill (e.g. Clove) as a Workflow agent (non-isolated or isolated).
  3. The dispatched skill's startup line (`echo "clove" > .prism/active-persona`) runs via Bash.
  4. The Bash branch of ownership-guard fires — runs `may_not_run` check, finds no match, exits 0.
  5. Active-persona is now `clove` in the main-tree file.
  6. Sol's next solo-path tool call reads `.prism/active-persona` → resolves as `clove` → enforcement enforces Clove's lane boundaries against Sol's commands.
- **Expected behavior:** A Workflow-dispatched skill's `echo "nora" > .prism/active-persona` should be denied when `payload.agent_type` is present (orchestrated context), matching the intent of the Write/Edit/MultiEdit denial at lines 289–303.
- **Actual behavior:** The Bash branch exits 0 unconditionally (after `may_not_run` and path checks pass). The active-persona file is clobbered. The denial at lines 289–303 is dead code against the actual write mechanism.
- **Refuted hypotheses:**
  - "Smoke scenario H catches this" — refuted. Smoke H tests the Write-tool path only; the Bash-echo path is untested and unguarded.
  - "The orchestrated resolver reads `agent_type` from payload, so the file value doesn't matter" — partially true for the orchestrated path, but the solo resolver for the MAIN session reads the file, which is now corrupted. The race is against the main session's subsequent tool calls, not the subagent's own gate.
- **Recommended fix:** In the Bash branch of ownership-guard.mjs, add an active-persona denial parallel to the Write/Edit/MultiEdit denial (lines 289–303): when `payload.agent_type` is present and the effective command writes `.prism/active-persona` (redirect scan would catch `echo "x" > .prism/active-persona`), deny with the same message. Alternatively, extend `commandWritesProtectedPath` to treat `.prism/active-persona` as a conditionally protected path when `payload.agent_type` is present — same logic, structural location.
- **Suggested tests:** Extend smoke scenario H to include a Bash-echo arm: payload with `agent_type: "prism-code-dev"` and `command: 'echo "clove" > .prism/active-persona'` should exit 2 (denied). Currently, this arm is absent and would exit 0.
- **Linear:** `not synced`

---

### Defect 2: runKey collision — dispatched Workflow agents share Sol's session_id as their runKey

- **Status:** `fixed`
- **Fixed in:** task 8 (`resolveRunKey` helper in resolve-persona.mjs using `session_id:agent_type` sha256 hash; all 3 call sites updated). Smoke scenario Y covers: distinct keys for same session_id+distinct agent_type; native-Task agent_id path unchanged.
- **Severity:** High
- **Confidence:** High (Confirmed — directly observed in `.prism/evidence/abe91dac-60cd-42bd-a837-7b6f46e2e2b7/`, hook code traced)
- **Environment:** All platforms; affects Workflow `agent()` dispatches (not native Task dispatches)
- **File:** `.claude/hooks/run-gates.mjs:78`, `.claude/hooks/ownership-guard.mjs:379` (`captureBaseline`)
- **Root cause:** `[Confirmed]` — Both `run-gates.mjs` (line 78) and `ownership-guard.mjs` (`captureBaseline`, line 379) resolve `runKey = payload.agent_id ?? payload.session_id`. Native Task dispatches carry a distinct `agent_id` in the hook payload (observed format: short hex hashes like `a38d158a7f3f8f1e6`), giving each dispatched agent its own evidence directory. Workflow `agent()` dispatches do NOT populate `agent_id` in the hook payload — the field is absent, and the `??` fallback resolves to `session_id`, which is Sol's own session identifier. Every Workflow dispatch therefore writes its `baseline.json`, `ledger.jsonl`, `strikes.json`, `report.json`, and `ratified-verdict.json` into Sol's evidence directory, repeatedly overwriting Sol's artifacts. Confirmed: `.prism/evidence/abe91dac-60cd-42bd-a837-7b6f46e2e2b7/` shows Sol's own `report.json` (persona=sol, verdict=done) and ledger containing only Sol's Bash commands — consistent with Workflow-dispatched workers colliding into this dir and Sol rewriting its report after each collision (per conductor-state: "Nora's runKey collided with Sol's session_id and overwrote Sol's report.json — Sol rewrote it").
- **Steps to Reproduce:**
  1. Sol dispatches a persona as a Workflow agent (e.g. `Agent({ subagent_type: 'prism-ticket-start', ... })` with no `isolation: 'worktree'`).
  2. The dispatched agent writes a tool call (Edit/Write/Bash) — ownership-guard fires; `captureBaseline` resolves `runKey = payload.agent_id ?? payload.session_id`. `agent_id` is absent → runKey = Sol's session_id.
  3. `captureBaseline` writes `baseline.json` to Sol's evidence dir, overwriting Sol's baseline.
  4. At SubagentStop, run-gates resolves the same runKey → reads the report from Sol's evidence dir. If Sol already wrote its own report there, gates read the wrong report. If the dispatched worker wrote its report first, Sol's next Stop overwrites it.
  5. The evidence dir is a shared collision surface for all concurrent Workflow dispatches in the same fleet run.
- **Expected behavior:** Each dispatched agent has its own isolated evidence directory, keyed by a dispatch-unique identifier. Sol's evidence dir contains only Sol's artifacts.
- **Actual behavior:** All Workflow dispatch agents collapse to Sol's session_id as runKey. Their evidence artifacts overwrite each other and Sol's artifacts in the single shared directory `abe91dac-60cd-42bd-a837-7b6f46e2e2b7/`.
- **Refuted hypotheses:**
  - "agent_id is populated for all subagent dispatches" — refuted by observation. Short-hash evidence dirs (e.g. `a38d158a7f3f8f1e6`) confirm `agent_id` is present for native Task dispatches. UUID-format dirs (e.g. `05987de6-34ec-4274-abbe-f1f4e65fff4c`) contain Clove and Sol reports — these are session_id-keyed, confirming Workflow dispatches carry no agent_id.
- **Recommended fix:** Derive a dispatch-unique runKey that does not depend on `agent_id` being present in the Workflow payload. Options in order of preference: (a) Generate a UUID at dispatch-start (first PreToolUse fire for this subagent) and persist it in a side-channel; (b) Use a combination of `session_id + agent_type + dispatch-timestamp` hashed to a short key; (c) Have Sol pass a `runKey` as an environment variable or context to each dispatch and have the persona write it into its evidence dir on startup. Winston should evaluate option (c) — it aligns with the existing pattern where skills write `active-persona` on startup and could write `run-key` as well, giving the hooks a file to read for Workflow-dispatch runKey resolution.
- **Suggested tests:** Smoke test: dispatch two Workflow agents sequentially, verify each writes to a distinct evidence dir. Currently absent — the smoke suite tests `SubagentStop` behavior but does not verify evidence-dir isolation across concurrent Workflow dispatches.
- **Missing evidence:**
  | Gap | Impact | How to Obtain |
  |-----|--------|---------------|
  | Whether `agent_id` is absent in the Workflow payload by SDK design or by hook-payload shape omission | Determines if the fix must be in the PRISM hooks or requires an SDK-level change | Log `payload.agent_id` explicitly in a Workflow dispatch context; compare to Task dispatch logs |
- **Linear:** `not synced`

---

### Defect 3: worktree-isolated Workflow dispatch dies at SubagentStop with no return (Nora #1 death mode)

- **Status:** `open`
- **Severity:** High
- **Confidence:** Medium (Deduced — mechanism is consistent with code + observed outcome; the exact `CLAUDE_PROJECT_DIR` value inside an isolated worktree agent is the unconfirmed link)
- **Environment:** Windows; worktree-isolated Workflow dispatches (`isolation: 'worktree'`)
- **File:** `.claude/hooks/run-gates.mjs:31,84–85`, `.claude/hooks/gates.json` (nora preconditions)
- **Root cause:** `[Deduced]` — run-gates.mjs resolves `projectDir = process.env.CLAUDE_PROJECT_DIR ?? process.cwd()` (line 31) and then `evidenceDir = path.join(projectDir, '.prism', 'evidence', runKey)` (line 84). The `report-written` precondition checks `file-exists` at `.prism/evidence/${runKey}/report.json` using `resolvePath(check.path, runKey, projectDir)` (line 491), where `projectDir` comes from the hook process's own `CLAUDE_PROJECT_DIR`. The deduced failure mode: under worktree isolation, the dispatched agent's process (and its tool calls) runs with `cwd` set to the worktree, but `CLAUDE_PROJECT_DIR` may also resolve to the worktree path rather than the main repo. If so, the persona writes its `report.json` to `<worktree>/.prism/evidence/<runKey>/report.json`, but the SubagentStop hook — when it fires — resolves `projectDir` from the SubagentStop payload's `CLAUDE_PROJECT_DIR`. If the SubagentStop hook's `CLAUDE_PROJECT_DIR` resolves to the MAIN repo (not the worktree), it checks `<main-repo>/.prism/evidence/<runKey>/report.json` — a path that was never written to. The `report-written` file-exists precondition fails, run-gates issues a re-prompt (exit 2, no strike), and the persona loops trying to satisfy a precondition it can never satisfy from inside the worktree.
- **Steps to Reproduce:**
  1. Sol dispatches a persona with `isolation: 'worktree'` (Workflow Workflow Agent call with `isolation: 'worktree'`).
  2. The worktree-isolated agent completes its work and writes `report.json` to whatever `CLAUDE_PROJECT_DIR` it sees.
  3. SubagentStop fires on the isolated agent.
  4. run-gates.mjs resolves `projectDir` from `CLAUDE_PROJECT_DIR` in the SubagentStop environment.
  5. If the two `CLAUDE_PROJECT_DIR` values disagree (worktree in the agent vs. main repo in the SubagentStop hook), the precondition file-exists check fails.
  6. No strike is consumed (precondition failures are strike-free per run-gates.mjs lines 184–201). The re-prompt loop runs until the agent exhausts context or the session times out — no max-retry ceiling for precondition failures.
- **Expected behavior:** The SubagentStop hook resolves the same `projectDir` the worktree-isolated agent used to write its `report.json`, finds the file, and either passes or fails on gates (consuming a strike toward the 3-cap ceiling).
- **Actual behavior:** SubagentStop hook resolves a different `projectDir` than the agent used. File-exists check fails permanently. Re-prompt loop has no ceiling (precondition failures don't consume strikes). Agent never returns.
- **Refuted hypotheses:**
  - "Nora died from the deliverable-touched-this-run Windows gate-loop (the same bug as #364)" — refuted. Confirmed in gates.json: Nora has no `deliverable-touched-this-run` precondition. Her preconditions are report-written (file-exists) and nothing else.
  - "Non-isolated Workflow dispatches hit the same death mode" — refuted by observation. The TAIL-SESSION block confirms multiple non-isolated Workflow dispatches (Clove ×3, Winston, Nora #2, Briar, Eric) all completed clean. Only the worktree-isolated dispatch died.
  - "The runKey collision is what killed Nora #1" — partially refuted. The runKey collision means Nora's evidence dir is the same as Sol's. Sol's report.json is already present in that dir before Nora writes. The `report-written` precondition would therefore PASS (the file exists — it's Sol's file). The collision corrupts the artifacts after the fact but is not the immediate cause of the infinite loop for a non-isolated dispatch. For the isolated dispatch, the path-mismatch theory above is the load-bearing mechanism.
- **Recommended fix:** Two independent fixes are needed: (1) Fix Defect 2 (runKey collision) first — give each dispatch a unique runKey so Sol's and Nora's evidence dirs are separate. (2) Determine whether `CLAUDE_PROJECT_DIR` is consistent between the worktree agent's writes and the SubagentStop hook's resolution. If it is always the main repo in both contexts, the worktree death is explained entirely by the runKey collision (different cause, same symptom). If it differs, a `cwd`-normalization fix is needed in run-gates.mjs at line 31 — preferring `payload.cwd` over `CLAUDE_PROJECT_DIR` when they disagree, or resolving the evidence dir relative to the actual git root of `payload.cwd`.
- **Suggested tests:** After fixing Defect 2, run a worktree-isolated dispatch end-to-end and verify SubagentStop completes cleanly. If it still loops, the `CLAUDE_PROJECT_DIR` mismatch is real and the path-normalization fix is needed.
- **Missing evidence:**
  | Gap | Impact | How to Obtain |
  |-----|--------|---------------|
  | Value of `CLAUDE_PROJECT_DIR` inside a worktree-isolated agent vs. in the SubagentStop hook for that same agent | Determines whether the path-mismatch theory is correct vs. the collision-only theory | Add `process.stderr.write(process.env.CLAUDE_PROJECT_DIR)` to run-gates.mjs startup and run a worktree-isolated dispatch in a test session |
  | Whether precondition re-prompts have any ceiling other than context exhaustion | Determines blast radius | Audit run-gates.mjs precondition path — confirmed no strike is consumed (lines 184–201), so the ceiling is context only |
- **Linear:** `not synced`

---

### Defect 4: PowerShell tool calls bypass ownership-guard may_not_run enforcement

- **Status:** `open`
- **Severity:** High
- **Confidence:** High (Confirmed — code-grounded; settings.json matcher now includes PowerShell, but ownership-guard.mjs has no PowerShell branch)
- **Environment:** Windows (PowerShell tool available and used)
- **File:** `.claude/hooks/ownership-guard.mjs:153` (Bash branch only), `.claude/settings.json:5` (matcher includes PowerShell)
- **Root cause:** `[Confirmed]` — PR #364 widened the PreToolUse hook matcher in `.claude/settings.json` from `Edit|Write|MultiEdit|Bash` to `Edit|Write|MultiEdit|Bash|PowerShell` (verified in settings.json line 5). This means ownership-guard.mjs now fires on PowerShell tool calls. However, ownership-guard.mjs has no `PowerShell` branch — the tool exits at line 153 (`if (toolName === 'Bash' && toolInput.command)`) only when `toolName === 'Bash'`. When `toolName === 'PowerShell'`, the Bash branch is skipped. The code then falls to the `writeTools` check (`Edit|Write|MultiEdit`) which also doesn't match. The result: `process.exit(0)` — unconditional permit. A persona can run any command via the PowerShell tool without `may_not_run` enforcement. The `commandWritesProtectedPath`, `commandDeletesEvidence`, and `commandMutatesProtectedViaGit` scans all go unchecked.
- **Steps to Reproduce:**
  1. Set up a gated persona (e.g. Clove) with `"gh pr merge"` in `may_not_run`.
  2. Issue `gh pr merge <number>` via the PowerShell tool (not Bash).
  3. ownership-guard fires (matcher matches), reads `toolName = 'PowerShell'`, falls through all branches, exits 0.
  4. The merge executes — the lane boundary is bypassed.
- **Expected behavior:** The PowerShell branch applies the same `may_not_run` enforcement, `commandWritesProtectedPath` scan, `commandDeletesEvidence` scan, and `commandMutatesProtectedViaGit` scan as the Bash branch. The logic is identical; only the tool name differs.
- **Actual behavior:** All PowerShell commands pass through ownership-guard unconditionally.
- **Refuted hypotheses:**
  - "The matcher in settings.json not including PowerShell is why it bypasses" — refuted. PR #364 added PowerShell to the matcher. The hook now fires but doesn't enforce.
- **Recommended fix:** In ownership-guard.mjs, extract the Bash enforcement logic into a shared function `enforceCommandBoundaries(cmd, payload, persona, entry, projectDir)` and call it for both `toolName === 'Bash'` and `toolName === 'PowerShell'`. The `toolInput.command` field is the same shape for both. Alternatively, replace the `toolName === 'Bash'` condition with `(toolName === 'Bash' || toolName === 'PowerShell')` at line 153 — the `toolInput.command` access pattern is identical.
- **Suggested tests:** Add smoke scenario covering PowerShell: payload with `tool_name: "PowerShell"`, `tool_input.command: "gh pr merge 1"`, gated persona that has `"gh pr merge"` in `may_not_run` → should exit 2. Currently absent.
- **Linear:** `not synced`

---

### Defect 5: the Stop gate launders every report-rejection — coherence, shape, and invalid-verdict alike — into `needs-stronger-model`, with no "your report is fine, the gate's rule is the mismatch" path

- **Status:** `open`
- **Severity:** High
- **Confidence:** High (Confirmed — code-grounded across `run-gates.mjs` rejection paths + `report-contract.md`; the live Sol/Eric collision artifact corroborates the symptom but was overwritten, so the verdict-string detail is Deduced from the symptom note's first-hand capture)
- **Environment:** All platforms; any gated dispatch (solo or orchestrated) whose report is rejected by shape/coherence validation rather than by a substantive gate failure. The collision half (carve-out below) is specific to dispatches that resolve a non-unique runKey.
- **File:** `.ai-skills/hooks/run-gates.mjs:149–164` (shape-strike path), `:332–337` + `:342–367` (`isCoherent` invoked inside `validateShape`), `:267–287` (gate-failure strike path), `:572–587` (`injectNeedsStrongerModel` — the shared terminal). Collision half: `.ai-skills/hooks/lib/resolve-persona.mjs:141–148` (`resolveRunKey`).
- **Root cause:** `[Confirmed]` — **one root cause, two surfaces.** The strike system has a single terminal for every rejection class: `injectNeedsStrongerModel` (line 572). Three structurally different "the report did not satisfy the gate" outcomes all funnel into it:
  1. **Coherence rejection** (Symptom 1) — `isCoherent` is called *inside* `validateShape` (line 332), so a coherence failure is a *shape* failure. The `needs-fix` payload-coherence branch (lines 359–365) returns `false` when `report.payload.findings` carries no `critical`/`major` finding. Eric's minor-only `needs-fix → clove` is well-formed and contract-honest, but `hasMaterial` is false → `isCoherent` false → `validateShape` fails → shape-strike path (lines 149–164) → at cap, `needs-stronger-model` injected.
  2. **Invalid verdict/route strings** (Symptom 2b) — Eric emitted `verdict: "has-minors"` / `next_route: "human-review-after-dev-addresses-minors"`, neither in `VALID_VERDICTS` (line 33) nor any `allowed_routes`. `validateShape` rejects (lines 325–330) → same shape-strike path → same `needs-stronger-model` terminal.
  3. **Real gate failure** (the legitimate case) — lines 267–287 → same terminal.
  The defect: **there is no rejection-classification branch.** The verdict the contract *reserves for capability ceilings* (`needs-stronger-model`, gate-injected-only per `VERDICT_ROUTE_CONSTRAINTS`) is pinned onto a model that produced a perfectly capable report the gate's *content rule* (or the model's *verdict-vocabulary slip*) rejected. A contract/shape mismatch is laundered into a capability verdict. This is the exact category-confusion #370 flagged from the other direction (a cornered agent attacking its own gate): in both, the strike loop turns a *can't-satisfy-the-gate-as-written* situation into a wrong action, because the only escape the gate offers is "escalate the model" — never "the gate's rule is the mismatch."
  - **The collision carve-out (Symptom 2a) is a SECOND, independent root cause.** Eric's `report.json` landed in the Sol *session* dir (`9dbf84cd…`) because his dispatch resolved `runKey = session_id` — the very collision Defect 2's `resolveRunKey` exists to prevent. Confirmed the dir now holds Sol's own clean `done`/`human` report (Sol rewrote it post-collision, matching the symptom note). The Defect-2 fix handles two payload shapes — `agent_id` present (native Task) and `agent_type` present (Workflow) — but a dispatch carrying **neither** falls back to bare `session_id` (line 147), which collides with the orchestrator's session. The symptom note hypothesizes this is **background native dispatch**: a background `Agent` call that populates neither `agent_id` (not yet assigned at report-write time) nor a Workflow `agent_type`, so `resolveRunKey` returns `session_id`. This is the `resolveRunKey` residual, NOT the verdict-laundering bug — different file, different mechanism, different fix.
- **One-root-vs-two verdict:** **TWO root causes.** (A) The rejection-laundering bug (`run-gates.mjs` — every report-rejection terminates in `needs-stronger-model`) is ONE root cause that fully explains Symptom 1 AND the verdict-laundering half of Symptom 2 (2b → 2c: the invalid report gated the Sol conductor on stop because the rejection re-injected rather than cleanly reporting the contract miss). (B) The runKey collision (Symptom 2a, `resolveRunKey` neither-field fallback) is a SECOND, independent root cause — it determines *where* Eric's report landed, not *how* the gate mishandled it. They co-occurred in the live incident but are separable: fixing one leaves the other live.
- **Steps to Reproduce:**
  - *Surface A (laundering):* 1. Dispatch a gated reviewer (Eric, `allowed_routes: ["clove","human"]`). 2. Have it emit `verdict: "needs-fix", next_route: "clove"` with `payload.findings` containing only `severity: "minor"` entries. 3. Stop fires → `validateShape` → `isCoherent` → `hasMaterial` false → reject → strike (lines 149–164). 4. Repeat to strike cap (3). 5. `injectNeedsStrongerModel` forces a `needs-stronger-model` re-emit — a clean minor-only review is reported to Sol as a model-capability failure.
  - *Surface B (collision):* 1. Background-dispatch a native `Agent` whose hook payload carries neither `agent_id` nor `agent_type` at report-write time. 2. `resolveRunKey` falls through to `payload.session_id` (line 147). 3. The agent's `report.json` writes to the orchestrator's session evidence dir. 4. If the orchestrator later writes its own report there, one overwrites the other.
- **Expected behavior:** A report the model produced correctly but that fails a *contract/shape/vocabulary* rule (wrong verdict string, coherence-rule mismatch, minor-only `needs-fix`) should surface as a *contract correction* the model can fix in one re-emit — and if it persists, escalate as a *contract/route problem* (a `needs-replan`/`needs-human`-class signal naming the gate rule), NOT as `needs-stronger-model`. The capability verdict should be reserved for genuine gate failures (work that does not hold up). Each dispatch should resolve a unique evidence dir regardless of which payload fields are populated.
- **Actual behavior:** Every rejection class — coherence, invalid-verdict, real gate failure — converges on `needs-stronger-model` at strike cap. A contract/shape mismatch is misrepresented as a capability ceiling. Separately, a neither-field dispatch collides into the orchestrator's session dir and reports overwrite each other.
- **Refuted hypotheses:**
  - "Symptom 1 and Symptom 2 are the same single bug" — refuted. Symptom 2a (the report landing in the wrong dir) is a `resolveRunKey` collision (resolve-persona.mjs), entirely independent of the `run-gates.mjs` laundering that explains Symptom 1 and 2b/2c. Two root causes that co-occurred.
  - "Defect 2's `resolveRunKey` fully closed the collision" — refuted. The fix covers `agent_id`-present and `agent_type`-present; a payload with neither still returns bare `session_id` (line 147) and collides. The symptom note's background-native-dispatch hypothesis fits this gap exactly.
  - "The invalid verdict (`has-minors`) is the root cause of Symptom 2" — partially refuted. The invalid string is a *symptom* of the same laundering category-error (the model reached for a vocabulary the contract doesn't have, and the gate had no clean way to say "that's not a verdict, here's the set" without strike-looping). It is downstream of the missing rejection-classification branch, not a separate cause.
  - "PR #369 introduced this" — refuted. PR #369 changed `resolveRunKey` and the Bash arm; it did NOT touch `VERDICT_ROUTE_CONSTRAINTS`, `isCoherent`, or the strike-terminal structure. The laundering is pre-existing floor logic, surfaced (not introduced) by this work. (Confirmed: the shipped `isCoherent` already carries the `gateForcedPark` accept-path from a prior Bug-1 fix; the `hasMaterial` branch predates this branch.)
- **Recommended fix:** Two independent fixes (one per root cause), both in enforcement-source-protected files — a separate maintenance-gated cycle, NOT this PR.
  - **Fix A — split the rejection terminal (the laundering bug).** Introduce a rejection *class* between `validateShape`/`isCoherent` and the strike terminal so the gate distinguishes:
    - *contract/shape/vocabulary mismatch* (invalid verdict string, coherence-rule miss, minor-only `needs-fix`) → a **strike-free, bounded** correction re-prompt that names the exact rule and the valid set; if it persists past a small cap, terminate as a **contract-level escalation** (`needs-human` or a new `needs-contract-fix` class routed to Winston/human), explicitly NOT `needs-stronger-model`.
    - *substantive gate failure* (work doesn't hold up) → keep the existing strike → `needs-stronger-model` path unchanged.
    Adjacent design question to settle first (against `report-contract.md § Verdict-to-route coherence`): is minor-only `needs-fix` *intended* to be incoherent? Three options — (a) allow `needs-fix` with any non-empty findings array (drop the critical/major gate); (b) require minor-only reviews to emit `done` and carry minors in the payload, and document that contract; (c) keep the rule but route its rejection through the contract-escalation path above, never `needs-stronger-model`. Option (c) is the minimal fix that closes the category-error regardless of which semantics win on (a)/(b).
  - **Fix B — close the `resolveRunKey` neither-field collision.** When a dispatch carries neither `agent_id` nor `agent_type`, the bare-`session_id` fallback collides with the orchestrator. Confirm first (missing-evidence table) whether background native dispatch truly presents neither field at report-write time; if so, give the neither-field case a dispatch-distinct suffix (e.g. hash `session_id` + a per-dispatch nonce the hook can see, or `session_id + ':' + pid`/start-timestamp) so a background worker never shares the orchestrator's `session_id` dir. Keep the `agent_id` and `agent_type` paths unchanged.
- **Suggested tests:**
  - Fix A: a `run-gates.mjs`-level test (or smoke scenario) asserting that a minor-only `needs-fix` report is NOT struck toward `needs-stronger-model` — it either passes (if semantics (a) win) or routes to a contract-escalation verdict (if (c)); and an invalid-verdict-string report produces a bounded, strike-free correction prompt naming `VALID_VERDICTS`, not a capability escalation at cap.
  - Fix B: extend scenario Y with a fourth assertion — a payload carrying `session_id` only AND simulating a background-dispatch context resolves a runKey distinct from the orchestrator's session_id (pins the neither-field branch the S3 fold-in already started covering for the plain-solo case).
- **Missing evidence:**
  | Gap | Impact | How to Obtain |
  |-----|--------|---------------|
  | Whether a **background** native `Agent` dispatch presents neither `agent_id` nor `agent_type` in the SubagentStop/PreToolUse payload at report-write time (vs. an `agent_id` that arrives late) | Determines whether Fix B is needed at all, or whether the collision was a one-off ordering race | Log `payload.agent_id`/`agent_type`/`session_id` at hook entry during a background native dispatch and compare to a foreground one |
  | The exact `verdict`/`next_route` strings Eric emitted (the live artifact was overwritten by Sol's report) | Confirms Symptom 2b's vocabulary-slip detail beyond the symptom note's first-hand capture | The symptom note (line 415) is the surviving record — `has-minors` / `human-review-after-dev-addresses-minors`; treat as Deduced unless a ledger/transcript copy is recoverable |
  | Intended semantics of minor-only `needs-fix` per the report contract | Picks between Fix-A options (a)/(b)/(c) | Hunter/Winston decision against `report-contract.md § Verdict-to-route coherence` |
- **Cross-reference:** sibling of issue #370 (gated subagent attacks its own gate). Both are the strike-cap loop converting a *can't-satisfy-the-gate-as-written* situation into a wrong action because the gate offers no "the rule is the mismatch" exit. A unified remedy — a contract-escalation / advisory-rejection class that is strike-free and never escalates the model tier — would close #370, Symptom 1, and Symptom 2b/2c together. Winston should weigh folding Fix A into #370's advisory-dispatch design rather than as a standalone patch.
- **Linear:** `N/A` (PRISM tracker is GitHub issues; this diagnosis is recorded in-plan. Recommend Winston file the Fix-A remedy against #370 and a separate issue for Fix B, per the OPEN decision that floor-coherence work is its own maint-gated cycle.)

---

## Review Issues

### SP1 — smoke scenario Z.a asserted `.key` (vacuously green)

- **Severity:** `minor`
- **Status:** `fixed`
- **Fixed in:** scenario Z.a now asserts `resolvedSolo.persona !== '_shared'` (was `resolvedSolo.key`). `resolvePersona` returns `{ persona }`, never `.key`, so the old check read `undefined !== '_shared'` → always true regardless of the resolved value. The fix makes Z.a actually test the resolved persona, matching scenario X.d's correct `.persona` pattern. `.ai-skills/hooks/__smoke__/run-all.mjs` (Z.a).
- **File:** `.ai-skills/hooks/__smoke__/run-all.mjs` (scenario Z.a)
- **Problem:** the assertion read a `.key` property that `resolvePersona` never returns, so the value half of the OR was vacuously true and the scenario never tested the `_shared`-is-not-a-persona invariant it claimed to.
- **Suggested fix:** read `.persona` (the real return-shape property) instead of `.key`.

### S2 — validator missed individual protected paths in `_shared.may_write`

- **Severity:** `major`
- **Status:** `fixed`
- **Fixed in:** `assertHookEmitDoesNotWeaken` (`scripts/ai-skills/build.ts`) now rejects individual exact enforcement-source paths in `_shared.may_write` (new `INDIVIDUAL_ENFORCEMENT_SOURCE_PATHS` constant mirroring ownership-guard's `PROTECTED_WRITE_PATHS`: the three runtime `.mjs`, `.claude/hooks/gates.json`, `.claude/settings.json`, `scripts/ai-skills/build.ts`), alongside the pre-existing `WHOLESALE_GRANTS` glob check. Two tests added to `emit-hooks.test.ts` (`.claude/hooks/gates.json` and `scripts/ai-skills/build.ts` each throw `/#305/`).
- **File:** `scripts/ai-skills/build.ts` (`assertHookEmitDoesNotWeaken`)
- **Problem:** the `_shared.may_write` check rejected wholesale globs (`.ai-skills/hooks/**`, `.claude/hooks/**`) but accepted an exact individual enforcement-source path (e.g. `_shared.may_write: ['.claude/hooks/gates.json']`), which grants every persona write access to one protected file — re-opening the floor through `_shared` (#305).
- **Suggested fix:** extend the `_shared.may_write` check to also reject the individual enforcement-source paths the per-persona protection covers.

### Quoted-path carve-out 2 bypass — Bash lane enforcement

- **Severity:** `minor`
- **Status:** `fixed`
- **Fixed in:** quote-strip applied as a pre-step in the `for` loop at the top of the Bash lane block (before both `normalizeWriteTarget` and carve-out 2's `path.resolve`). Smoke scenario AA (AA.a: Windows double-quoted cross-drive path → permit; AA.b: POSIX single-quoted `/tmp` path → permit; AA.c: unquoted in-repo out-of-lane path → deny) locks in the fix.
- **File:** `.ai-skills/hooks/ownership-guard.mjs:315`
- **Problem:** `normalizeWriteTarget` calls `path.resolve(cwdBase, rawTarget)` where `rawTarget` is produced by `tokenize` (whitespace-split only). When the Bash command uses a double-quoted path argument — e.g. `echo test > "C:\Users\...\file.txt"` — the token includes the surrounding quotes: `"C:\...`. Node's `path.resolve` sees `"C:` as a relative path (leading `"` is not a drive letter), so `path.isAbsolute` returns false and `path.relative` returns an in-repo-looking path. Carve-out 2 (out-of-projectDir permit) silently fails, and the guard incorrectly denies the write. The fix: strip surrounding single/double quotes from `rawTarget` before calling `path.resolve`. Observed directly: `echo test > "C:\Users\test\file.txt"` exits 2 with deny message `'C:Users'`.
- **Suggested fix:** In `normalizeWriteTarget`, or as a pre-step in the `for` loop at line 288, strip `rawTarget` of surrounding quotes: `rawTarget = rawTarget.replace(/^(['"])(.*)\1$/, '$2')`.

### Smoke harness inherits maintenance mode — deny-scenarios invert silently

- **Severity:** `minor`
- **Status:** `fixed`
- **Fixed in:** `CLAUDE_PRISM_MAINTENANCE: ''` added to the base env of groups E, I, J, K, and N. K's deny-scenarios (K1, K3, K5) now self-protect; K's maint-on scenarios (K2, K4, K6) continue to override via `...extraEnv`. Suite runs 29/29 with ambient `CLAUDE_PRISM_MAINTENANCE=1` (no `env -u` needed).
- **File:** `.ai-skills/hooks/__smoke__/run-all.mjs:40`
- **Problem:** `runHook` spreads `process.env` into every child process: `env: { ...process.env, ...env }`. When `CLAUDE_PRISM_MAINTENANCE=1` is set in the shell (the normal state for a hook-authoring session), all 25+ deny-scenarios in E, I, J, K, N pass through the maintenance unlock and exit 0 instead of 2 — the harness silently reports a false pass for half its scenarios. The fix instruction (`env -u CLAUDE_PRISM_MAINTENANCE`) is documented and works, but it's an invisible footgun for anyone running `node .claude/hooks/__smoke__/run-all.mjs` directly.
- **Suggested fix:** For deny-scenario groups (E, I, J, K, N) that use a synthetic `tmpDir` as `CLAUDE_PROJECT_DIR`, pass `CLAUDE_PRISM_MAINTENANCE: ''` in their per-scenario `env` overrides (the same technique Scenario Q uses at line 2326: `const maintOff = { CLAUDE_PROJECT_DIR: REPO_ROOT, CLAUDE_PRISM_MAINTENANCE: '' }`). Scenarios that exercise maintenance-mode behaviour (K) keep their existing explicit flag handling.

### S1 — Edit/Write arm lacks the out-of-projectDir carve-out the Bash arm has

- **Severity:** `minor`
- **Status:** `fixed`
- **Fixed in:** task 14 — mirrored carve-out 2 in the `writeTools` arm of `ownership-guard.mjs` (out-of-projectDir permit after the gate-state check, before the lane glob; `normalizedPath.startsWith('../') || path.isAbsolute(normalizedPath)`). Smoke scenario BB locks it in (BB.a cross-drive permit, BB.b /tmp permit, BB.c in-repo deny). Fixing this surfaced a stale fixture in smoke scenario B (`/other-service/index.js` resolves out-of-repo, now correctly permitted) — B's fixture changed to an in-repo out-of-lane path so it still exercises lane enforcement.
- **Disposition (Winston):** FOLD INTO PR #369 — added as a Clove task below.
- **File:** `.ai-skills/hooks/ownership-guard.mjs:351–427` (the `writeTools` arm)
- **Problem:** The Bash arm permits writes that resolve outside `projectDir` via carve-out 2 (lines 318–329: `../`-prefixed or drive-rooted `path.relative` result → permit before the lane check). The Edit/Write/MultiEdit arm has no equivalent — after the protected-source and gate-state checks it falls straight to the `effectiveMayWrite` glob match (line 418). A narrow-lane persona using the **Write tool** to write outside the repo (a memory file at `~/.claude/...`, a scratch file in `/tmp`, a Windows scratchpad on `C:`) produces a `../`-prefixed `normalizedPath` that matches no `may_write` glob → wrongly denied. The Bash arm permits the same target. Surfaced live this session.
- **Why it is correct to add (not an intentional omission):** the floor's job in the write arms is (a) protect the enforcement surface — handled earlier by `isEnforcementSourceProtected` + the evidence-basename check, which run BEFORE any carve-out and are unaffected; and (b) enforce lane boundaries *within the repo*. An out-of-repo path is neither the enforcement surface nor an in-repo lane, so denying it is pure false-positive with no security value. The Bash arm already encodes exactly this reasoning. The asymmetry is an oversight from the Bash arm being the new code in this PR — the Edit arm predates it and was never revisited for parity. No reason exists for the arms to diverge here.
- **Scope call (per `followup-scope.md`):** same file, same concept (carve-out 2), small, same persona (Clove) — three signals point to same-scope, zero to splits. Fold-in, not a follow-up ticket. The Bash arm's carve-out 2 shipped in THIS PR, so adding its Edit-arm twin closes a gap this PR's own asymmetry created.
- **Suggested fix:** mirror carve-out 2 in the `writeTools` arm — after the gate-state check (line 416) and before the `effectiveMayWrite` match (line 418), permit when the normalized path resolves out of `projectDir`. The Edit arm already computes `relativePath`/`normalizedPath` via `path.relative(projectDir, path.resolve(payload.cwd ?? projectDir, filePath))` (lines 359–361), so the test is `if (normalizedPath.startsWith('../') || path.isAbsolute(normalizedPath)) process.exit(0);`. Use `normalizedPath` (already backslash-forwarded) so the Windows cross-drive case (`path.relative('D:\\…','C:\\…')` → drive-rooted absolute) is caught by `path.isAbsolute`, exactly as the Bash arm handles it.

### Gate-coherence rejected Eric's needs-fix → clove route (forced needs-stronger-model escalation)

- **Severity:** `minor` (operational/floor-design, not a PR #369 code defect)
- **Status:** `diagnosed` → see **Defect 5** in `## Debugged Issues` (root cause A: rejection-laundering terminal in run-gates.mjs). Remedy is a separate maint-gated cycle; fold Fix A into #370's advisory-dispatch design.
- **Disposition (Winston):** ROUTE TO SASHA — `found-bug`-style diagnosis note below. NOT a PR #369 finding (PR #369 did not touch the coherence table); NOT `needs-human` (the mechanism is code-grounded and the remedy is a contained design question Sasha can scope). Do NOT fix in this PR — the coherence rules live in `run-gates.mjs`, an enforcement-source-protected file out of scope here.
- **PR #369 confirmation:** PR #369 changed `resolveRunKey` (Defect 2) and the Bash arm of `ownership-guard.mjs`. It did **not** touch `run-gates.mjs`'s `VERDICT_ROUTE_CONSTRAINTS` table or `isCoherent`. The behavior is pre-existing floor logic, surfaced — not introduced — by this work.

**found-bug note (for Sasha):**

- **Symptom:** Eric (allowed_routes `["clove","human"]`) intended to emit `verdict: needs-fix, next_route: clove` carrying **3 Minor findings**. The Stop gate rejected the report at shape-validation, strike-looped him, and the strike cap forced a `needs-stronger-model` re-emit — an escalation that misrepresents a clean-with-minors review as a model-capability failure.
- **File:** `.ai-skills/hooks/run-gates.mjs:359–365` (`isCoherent`, the `needs-fix` payload-coherence branch).
- **Mechanism (Deduced, code-grounded):** `isCoherent` rejects `needs-fix` unless `report.payload.findings` contains at least one finding with `severity === 'critical' || severity === 'major'` (lines 360–364: `hasMaterial`). A `needs-fix` verdict carrying ONLY minor findings is treated as shape-incoherent ("verdict claims review work but nothing actionable"). Eric's 3 Minors all have `severity: 'minor'`, so `hasMaterial` is false → `isCoherent` returns false → `validateShape` fails (line 332) → strike, re-prompt, and at cap the gate injects `needs-stronger-model`. The verdict the contract reserves for capability ceilings gets pinned onto a reviewer who correctly produced a minor-only review.
- **What to investigate / scope the remedy:** is "minor-only findings cannot be `needs-fix`" the intended contract, or should a minor-only review route as `done` (clean enough to ship, minors noted) or as `needs-fix` with minors permitted? Options to weigh: (a) allow `needs-fix` with minor-only findings (drop the critical/major requirement, or accept any non-empty findings array); (b) require reviewers with minor-only results to emit `done` and carry minors in the report payload, and document that contract; (c) keep the rule but stop the strike loop from escalating a coherence-rejection to `needs-stronger-model` (the deeper bug — a *shape/contract* mismatch is being laundered into a *capability* verdict, which is the same category-confusion meta-finding #370 flagged from the other direction). Confirm the intended semantics against `report-contract.md § Verdict-to-route coherence` before choosing.
- **Cross-reference:** this is the third-party-coherence sibling of issue #370 (gated subagent attacked its own gate). Both are the strike-cap loop turning a *can't-satisfy-the-gate* situation into a wrong action. Worth Sasha noting the shared root cause: precondition/coherence rejections are strike-free OR strike-capped into `needs-stronger-model`, with no path that says "your report is fine, the gate's rule is the mismatch."

### Eric's summary comment posted a literal `@file` path instead of the file body

- **Severity:** `minor` (cosmetic + process)
- **Status:** `open`
- **Disposition (Winston):** REPOST (by Eric/whoever re-runs the review tooling) + FOLLOW-UP NOTE. Low effort, and a review summary that reads `@C:\...\summary-body.md` instead of the findings is unusable to the next reader of PR #369 — not purely cosmetic. Pair with a one-line follow-up note since this is the **third** Windows `gh`/path glitch in the floor work.
- **File:** N/A (tooling invocation, not repo source) — PR #369 comment thread.
- **Problem:** the summary comment was posted with `gh ... --body @C:\...\scratchpad\summary-body.md`. On Windows Git Bash, `gh`'s `@file` expansion did not resolve the Windows-form path, so the literal `@C:\...` string posted instead of the file contents.
- **Suggested fix (repost):** re-post the summary using `gh pr comment <n> --body-file <path>` (the explicit flag, not the `@`-prefix body expansion) — mirrors the `pr-description.md § Writing mechanics` guidance to prefer `--body-file` over inline body on Windows. Whoever re-runs Eric's tooling reposts; no persona-lane issue (review comments are Eric's surface).
- **Follow-up note (third Windows gh/path glitch):** this is now a recurring class across the floor work (alongside the #367 MSYS path-mangling already fixed in this PR, and the smoke-harness `D:\` dynamic-import fix in task 12). Worth a small follow-up to audit every `gh`/path invocation in the persona tooling for `@file` usage and Windows path assumptions, and standardize on `--body-file`. Scope is sharp enough for a ticket per `followup-scope.md` (one concern: "convert `@file` body args to `--body-file` across persona gh-invocation prose; audit Windows path handling"), but FILE IT SEPARATELY — out of scope for PR #369. Recommend Nora open it; not blocking.

### Eric's #369 findings were undercounted — three recovered (SP2, S3, S4) NEED Winston disposition

- **Severity:** `minor` (process — finding-capture gap)
- **Status:** `open` — SP2/S3/S4 not yet adjudicated (Winston's disposition pass only saw SP1/S1/S2 + the two anomalies; the rest were missing because Eric's summary glitched as a literal `@file` and only SP1/S1/S2 posted as inline comments).
- **Problem:** Eric's full report (recovered from his misplaced `report.json` — see anomaly below) lists **six** minors, not three. The three not previously captured:
  - **SP2** — the OPEN decision "maintenance mode vs plain session" was never formally closed in the plan. *Already resolved in practice:* Hunter chose maintenance mode this session. Disposition: bookkeeping — formally close that OPEN decision in `## Decisions` (mark resolved → maint mode). Not blocking.
  - **S3** — the solo `resolveRunKey` path (no `agent_type`, no `agent_id` → falls back to `session_id`) has no smoke coverage. Test-coverage gap. **Disposition (Winston): FOLD INTO PR #369** — see the dedicated S3 entry below; added as Clove task 15.
  - **S4** — `.claude/settings.json` in `clove.ownership.may_write` is a dead/stale entry. Cleanup. **Disposition (Winston): FOLD INTO PR #369** — see the dedicated S4 entry below; added as Clove task 16.
- **Routing:** S3 and S4 are now adjudicated (both fold-in, tasks 15/16). SP2 is closed as plan bookkeeping (the OPEN "maintenance mode vs plain session" decision is now resolved — maint mode chosen). No items remain for the execution session beyond tasks 15/16.

### S3 — solo `resolveRunKey` fallback path (`session_id` branch) has no smoke coverage

- **Severity:** `minor`
- **Status:** `fixed`
- **Fixed in:** task 15 — added Y.c to scenario Y asserting `resolveRunKey({ session_id: 'solo-abc123' }) === 'solo-abc123'` (the solo fallback: no `agent_id`, no `agent_type` → bare `session_id`, not a hash, not `undefined`). `.ai-skills/hooks/__smoke__/run-all.mjs`.
- **Disposition (Winston):** FOLD INTO PR #369 — added as Clove task 15 below.
- **File:** `.ai-skills/hooks/__smoke__/run-all.mjs` (scenario Y, the runKey-isolation block added in task 11)
- **Problem:** `resolveRunKey(payload)` (task 8) has three branches: (a) `agent_id` present → return it (native Task); (b) `agent_type` present, no `agent_id` → return `shortHash(session_id + ':' + agent_type)` (Workflow dispatch); (c) neither present → return bare `session_id` (solo session). Scenario Y exercises (a) and (b) but not (c). The solo fallback is the path EVERY non-dispatched session takes, and a regression that broke it (e.g. returning `undefined` or hashing the solo case) would mis-resolve the main session's evidence dir and silently corrupt the floor's strike/report bookkeeping with no test catching it.
- **Why it is correct to add (not an intentional omission):** the Defect-2 fix (task 8) shipped all three branches of `resolveRunKey` in THIS PR. Scenario Y was authored in THIS PR (task 11) to lock the function's contract. Leaving the most-traveled branch (solo) unasserted is a gap this PR's own work created — the same shape as S1, where the Bash arm's new code created the parity gap the Edit arm needed to close. The branch is pure, deterministic, and trivially testable; there is no reason for the contract test to cover two of three branches.
- **Scope call (per `followup-scope.md`):** same file (`run-all.mjs`, scenario Y), same concept (the `resolveRunKey` contract from Defect 2), trivial (one added assertion), same persona (Clove). Four signals point to same-scope, zero to splits. Fold-in, not a follow-up ticket. The runKey fix shipped in THIS PR, so closing its own test gap belongs with it.
- **Suggested fix:** extend scenario Y with a third assertion — a payload carrying `session_id` only (no `agent_id`, no `agent_type`) must make `resolveRunKey` return the bare `session_id` unchanged (not a hash, not `undefined`). This pins the solo branch alongside the two dispatch branches already covered.

### S4 — `.claude/settings.json` is a dead entry in `clove.ownership.may_write`

- **Severity:** `minor`
- **Status:** `fixed`
- **Fixed in:** task 16 — removed the dead `.claude/settings.json` string from `clove.ownership.may_write` in canonical `.ai-skills/hooks/gates.json` (verified absent in emitted runtime). The entry granted nothing (the enforcement-source-protected checks deny the write regardless of lane); removal only shrinks the lane, so the validator stays green.
- **Disposition (Winston):** FOLD INTO PR #369 — added as Clove task 16 below.
- **File:** `.ai-skills/hooks/gates.json` (`clove.ownership.may_write`)
- **Problem:** `.claude/settings.json` appears in Clove's `may_write` lane, but it is a dead grant: `.claude/settings.json` is on the build validator's wholesale-grant DENYLIST (`assertHookEmitDoesNotWeaken` — task 1 references it as a denylist target), and `.claude/**` is emitted runtime, not a canonical source Clove authors. The entry grants nothing real (the protected-source checks deny the write regardless of the lane) and misleads the next reader into thinking Clove owns the settings file. It is stale config noise in a lane object this PR is already editing.
- **Why it is correct to remove (not load-bearing):** removing a path from a `may_write` lane only ever SHRINKS what the lane permits — it can never weaken the floor, so the validator (task 1) cannot object (the validator rejects ADDING protected paths to `may_write`, never removing one). The protected-source/denylist checks that actually govern `.claude/settings.json` run BEFORE the lane glob and are untouched. Nothing reads this entry as load-bearing; it is pure stale grant.
- **Scope call (per `followup-scope.md`):** `gates.json` is already in this PR's diff (tasks 2/3/5), and the dead entry sits inside `clove.ownership.may_write` — the exact object task 3 widens. Same file, same concept (lane ownership config), trivial (delete one array element), same persona (Clove, under Task 0's maint gate like every floor task). Four signals same-scope, zero splits. Fold-in.
- **Suggested fix:** remove the `.claude/settings.json` string from `clove.ownership.may_write` in canonical `.ai-skills/hooks/gates.json`. Leave every other entry untouched. Re-run the build to confirm drift-clean and the validator still green.

### Eric's review report landed in the session-runKey dir with an invalid verdict (for Sasha — folds into the gate-coherence diagnosis)

- **Severity:** `minor` → routes into the **gate-coherence found-bug already assigned to Sasha** (above); these are the same Eric-report-under-the-live-floor failure family.
- **Status:** `diagnosed` → see **Defect 5** in `## Debugged Issues`. Verdict: NOT one root cause with Symptom 1 — Symptom 2a (report in wrong dir) is a SECOND root cause (`resolveRunKey` neither-field collision, root cause B); Symptom 2b/2c (invalid verdict gated the conductor) share root cause A (rejection-laundering) with Symptom 1.
- **Symptoms (observed, not diagnosed here):** (1) Eric's `report.json` was written to `.prism/evidence/<session_id>/` (the Sol session dir, runKey `9dbf84cd…`) instead of an Eric-specific dir — a runKey collision the Defect-2 fix was meant to prevent, possibly specific to **background** native dispatch (foreground native dispatches this session got their own `agent_id` dirs). (2) Eric used `verdict: "has-minors"` and `next_route: "human-review-after-dev-addresses-minors"` — neither is in the valid verdict/route set; the Stop gate rejected the shape. (3) This invalid report then gated the **Sol conductor session** on stop (the live-floor-gates-the-conductor issue, lessons.md). Sasha to diagnose alongside the `run-gates.mjs:359–365` coherence rejection — likely one root cause (Eric's report-contract handling under the live floor).

---

## Cleanup Items

- `.prism/plans/issue-a-body.md`, `issue-b-body.md`, `issue-c-body.md` — untracked plan scratch files in `.prism/plans/`; check if these are safe to remove or archive.

---

## PR Readiness

Living checklist — updated after the SP1/S2/14/15/16 close-out 2026-06-28.

- [x] No critical or major issues
- [x] Types correct — no `any`, no unsafe `as`
- [x] No stray console.logs or debug artifacts
- [x] Tests written for new logic and edge cases
- [x] All debugged issues resolved (Defects 1 + 2 fixed; Defects 3 + 4 + 5 are pre-existing open with known remedies, tracked in their own follow-up scope)
- [x] Build passes — last run: 2026-06-28 (434/430, 4 pre-existing #107 failures only — no new failures)
- [x] emit-hooks test: 12/12 (incl. the two new S2 individual-path tests)
- [x] Smoke harness: 30/30 (ambient maint OK — deny-scenarios self-protect via base env)
- [x] prism:check drift-clean ("Generated outputs are in sync"); check-types fails only on the pre-existing `esbuild`-not-found in `bundle.ts` (environmental, not in this PR's diff)
- [x] Five close-out fixes resolved: SP1 (vacuously-green Z.a assertion), S2 (validator individual-path gap in `_shared.may_write`), task 14 (S1 — Edit/Write arm out-of-projectDir carve-out + scenario BB; fixed stale scenario-B fixture), task 15 (S3 — Y.c solo `resolveRunKey` assertion), task 16 (S4 — dead `.claude/settings.json` clove grant removed)
- [x] PR description up to date
- [x] Lasting decisions promoted to architect context (not applicable — all decisions are operational hook details)

**Last updated:** 2026-06-28

---

## History

- 2026-06-27 [claude/youthful-jennings-22bbf2]: Read-only diagnosis session — root cause traced, findings returned as assistant message per user instruction. Plan stub created to satisfy gate precondition; formal findings recording deferred to the ticket pickup session.
- 2026-06-28 [hmcgrew/prism-windows-gate-loop]: Sasha diagnosis session — four defects diagnosed and recorded under Debugged Issues: active-persona Bash-echo guard gap (Defect 1, Confirmed High); runKey collision on Workflow dispatches (Defect 2, Confirmed High); worktree-isolated dispatch death at SubagentStop (Defect 3, Deduced Medium); PowerShell may_not_run bypass (Defect 4, Confirmed High).
- 2026-06-28 [hmcgrew/prism-363-floor-hardening]: Winston unified design — merged `enforcement-skill-lane-and-bash-guard.md` into this plan (one branch edits ownership-guard.mjs's Bash branch; two would conflict). Resolved 3 open design choices (runKey = session_id+agent_type hash; Defect-1 = active-persona carve-out inside the new Bash may_write block; Defect-3 = forbid worktree isolation). Folded #367 (Windows MSYS-path mangling) in as a load-bearing prerequisite to the Bash may_write enforcement. 13 tasks (12 Clove + 1 Winston meta-finding), sequenced validator→_shared→skill-forge→#367→Bash-enforcement→runKey→sweep→tests→build. 3 OPEN decisions left for Hunter.
- 2026-06-28 [hmcgrew/prism-363-floor-hardening]: Task 1 — extended `assertHookEmitDoesNotWeaken` in `scripts/ai-skills/build.ts` to validate `_shared.may_write` against the same `WHOLESALE_GRANTS` check as the per-persona loop; added the `#305` test to `emit-hooks.test.ts`; 9/10 tests pass (1 pre-existing settings.json drift failure unrelated to task 1).
- 2026-06-28 [hmcgrew/prism-windows-gate-loop]: Tasks 2, 3, 5 — seeded `_shared.may_write` (lessons.md + deliverable.json); widened winston + clove lanes to `.ai-skills/skills/**` + `.prism/skills/**` + `.ai-skills/definitions/**`; added skill-forge gate entry (preconditions:[], ownership-only) with EXEMPT removal, resolver mapping, and shared.md startup write; risk-4 drift tests pass (9/10, 1 expected settings byte-match failure).
- 2026-06-28 [hmcgrew/prism-363-floor-hardening]: Tasks 6, 7, 8, 10 + comment fix — added `toCanonicalCwd` (#367 Windows MSYS-path fix) + `cwdBase` wired through all Bash consumers; added Bash `may_write` enforcement block with 3 carve-outs (active-persona, out-of-projectDir incl. cross-drive, substitution-body scan via `collectBashWriteTargets`); extracted `resolveRunKey` (session_id+agent_type sha256 hash) into resolve-persona.mjs and replaced all 3 call sites; added `install`/`truncate` to `collectWriteTargets`; fixed EXEMPT_SKILLS comment to reflect skill-forge now has a gate entry (2 utility skills, not 3). Synth tests: MSYS protected write → 2, out-of-dir → 0, eric in-repo → 2. Suite: 9/10 (1 pre-existing settings failure).
- 2026-06-28 [hmcgrew/prism-363-floor-hardening]: Tasks 9 + 11 — bypass-rider sweep found no new `_shared` riders needed (`.prism/active-persona` is a structural carve-out; state files and sidecar writes go via Write tool; all other Bash repo-writes are already in the owner's per-lane); added 12 smoke scenarios (P–Z) covering the full Test Matrix: active-persona Bash arm, #367 MSYS-cwd denial, out-of-projectDir permits, `_shared` rider grants/denials, lane enforcement across 5 personas, fused/multi-segment commands, substitution bodies, install/truncate, skill-forge persona, runKey isolation (Defect 2), and `_shared` isolation. Marked Defects 1 + 2 fixed; Defects 3 + 4 remain open (design/follow-up). emit-hooks.test.ts: 9/10 (1 pre-existing settings byte-match failure, expected).
- 2026-06-28 [hmcgrew/prism-363-floor-hardening]: Task 12 build + smoke-harness fix — ran `pnpm prism:build` (emitted new floor canonical→runtime; the emit overwrote the maintenance env block in `.claude/settings.json`, so maint mode auto-disabled and the byte-match test went green). Verification surfaced smoke-harness fixture lag (NOT floor bugs, confirmed by direct guard tests): `setupStopFixture` hardcoded `runKey='smoke-session'` vs the new `resolveRunKey` hash, and the new P–Z scenarios used bare `D:\` paths for dynamic import. Fixed both in `__smoke__/run-all.mjs` (resolveRunKey-derived fixture runKey + `pathToFileURL`). Final: emit-hooks 10/10, runtime smoke 28/28, full suite 428/432 (only the 4 pre-existing #107 Windows-path failures). Opened draft PR #369. Meta-finding (task 13) filed as issue #370.
- 2026-06-28 [hmcgrew/prism-363-floor-hardening]: Briar self-review — verification confirmed: emit-hooks 10/10, smoke 28/28 (env -u CLAUDE_PRISM_MAINTENANCE), suite 428/432 (4 pre-existing #107). Two minors found: (1) quoted-path tokens with surrounding double-quotes defeat carve-out 2 (out-of-projectDir permit fails for `> "C:\..."` commands); (2) smoke harness inherits `CLAUDE_PRISM_MAINTENANCE` from parent shell, causing deny-scenarios E/I/J/K/N to silently pass when maint mode is live. No critical or major issues. PR #369 is ready for Eric (after minors addressed or deferred).
- 2026-06-28 [hmcgrew/prism-windows-gate-loop]: Briar minor fixes — (1) quote-strip applied as pre-step in the Bash lane for-loop (covers both normalizeWriteTarget and carve-out 2); new smoke scenario AA locks it in; (2) `CLAUDE_PRISM_MAINTENANCE: ''` added to base env of groups E/I/J/K/N; K's explicit maint-on overrides intact. Smoke: 29/29 with ambient maint set (no env -u), emit-hooks 10/10.
- 2026-06-28 [hmcgrew/prism-363-floor-hardening]: Winston adjudicated Eric's 3 ambiguous PR #369 findings. S1 (Edit/Write arm lacks the out-of-projectDir carve-out the Bash arm has) → FOLD IN; added Clove task 14 (mirror carve-out 2 in the writeTools arm). Gate-coherence anomaly (Eric's needs-fix→clove rejected because 3 Minors fail the `hasMaterial` critical/major requirement in run-gates.mjs:359–365, forcing a needs-stronger-model park) → ROUTE TO SASHA with a found-bug note; confirmed PR #369 did not touch the coherence table, so it is surfaced-not-introduced; sibling root cause to #370. Eric's `@file` summary glitch → REPOST via `--body-file` + file a separate follow-up (third Windows gh/path glitch; recommend Nora). Nothing requires Hunter.
- 2026-06-28 [hmcgrew/prism-363-floor-hardening]: Sasha diagnosis — recorded Defect 5 (Debugged Issues) for the two Sasha-assigned symptom notes (gate-coherence strike-loop + Eric-report-under-floor family). Verdict: TWO root causes — (A) every report-rejection in run-gates.mjs (coherence, invalid-verdict, gate-failure) launders into `needs-stronger-model` with no contract-mismatch exit, explaining Symptom 1 + Symptom 2b/2c; (B) `resolveRunKey`'s neither-field fallback to bare `session_id` collides into the orchestrator dir, explaining Symptom 2a (background-native-dispatch hypothesis). Sibling of #370; recommended Fix A fold into #370's advisory-dispatch design, Fix B as a separate maint-gated issue. Read-only — no source touched.
- 2026-06-28 [hmcgrew/prism-363-floor-hardening]: Clove close-out — landed SP1 (Z.a `.key`→`.persona`, was vacuously green), S2 (validator rejects individual enforcement-source paths in `_shared.may_write`, +2 emit-hooks tests), task 14 (S1 Edit/Write out-of-projectDir carve-out + scenario BB; surfaced and fixed a stale scenario-B fixture that resolved out-of-repo), task 15 (S3 Y.c solo `resolveRunKey` assertion), task 16 (S4 dead `.claude/settings.json` clove grant removed). All canonical edits before `pnpm prism:build`; the build auto-disabled maint (settings.json env block normalized). emit-hooks 12/12, smoke 30/30, prism:check drift-clean, suite 434/430 (only the 4 #107 baseline failures, none new). See Review Issues SP1/S2/S1/S3/S4.
- 2026-06-28 [hmcgrew/prism-363-floor-hardening]: Winston adjudicated the 3 late-recovered Eric #369 minors (SP2/S3/S4). S3 (solo `resolveRunKey` fallback branch has no smoke coverage) → FOLD IN; added Clove task 15 (third assertion on scenario Y). S4 (`.claude/settings.json` is a dead grant in `clove.ownership.may_write`) → FOLD IN; added Clove task 16 (remove the stale entry — removal only shrinks the lane, validator-safe). Both four-signal same-scope per followup-scope.md (same files already in the PR diff, same concepts the PR created, trivial, same persona). SP2 → CLOSED: the OPEN "maintenance mode vs plain session" decision is now resolved (Hunter chose maint mode; corroborated by task-12 History). No new tickets; nothing requires Hunter.
