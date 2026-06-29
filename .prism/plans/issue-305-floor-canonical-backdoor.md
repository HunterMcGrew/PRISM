# Plan: issue-305-floor-canonical-backdoor

> Reverted: 2026-06-29 — the enforcement floor this plan hardened was removed; see [`epic-floor-revert.md`](./epic-floor-revert.md).

## Ticket

GitHub issue #305 — Close the canonical-source back-door in the enforcement floor.

---

## Goal

Extend the enforcement floor's non-circumventability guarantee to the canonical hook sources under `.ai-skills/hooks/`, so a gated persona can no longer weaken a runtime gate by editing canonical source and rebuilding.

---

## Implementation Tasks

Added by Winston. Grouped under Clove. **Tasks execute in the exact order below — the order is load-bearing**, for the same reason as the #301 Phase 2 A–D order: the guard reads its `PROTECTED_*` consts fresh on every PreToolUse fire (each hook invocation is a fresh Node process), so the new canonical protection activates the instant the emitted `ownership-guard.mjs` lands. All canonical edits that the protection will later forbid must complete — and the build must run — **before** that guard edit is the final hook-touching action.

A `[HITL]` Task 0 grant is **not** required to start: `.ai-skills/hooks/**` is currently in `clove.may_write` (that entry is the hole), so Clove can lawfully edit every canonical hook source now, before the protection lands. The fix removes that grant as its last gates.json action and lands the denylist as its last guard action — after which the door is shut.

### Clove (implementation)

> **Status (2026-06-26, Clove):** Tasks 1–4 all ✅ done, in the load-bearing order. See `## History` and `## PR Readiness`. One scope detail beyond Task 2's literal text: `.claude/hooks/**` was narrowed to `.claude/hooks/__smoke__/**` alongside `.ai-skills/hooks/**`, because the Task-4 backstop (`assertHookEmitDoesNotWeaken`) refuses to emit a `may_write` carrying either wholesale enforcement-tree grant. The runtime `.claude/hooks/**` was already inert (denylist-protected since #301); narrowing it keeps gates.json honest per the Component 1 "misleading-inert-grant" rationale.

**Task 1 — Smoke assertions first (author before the guard edit; they fail until Task 3 lands).**
File: `.ai-skills/hooks/__smoke__/run-all.mjs`. Add a new scenario block — call it **Scenario J: canonical-source protection** — modeled byte-for-byte on the existing Scenario E (`.ai-skills/hooks/__smoke__/run-all.mjs:475–579`). Reuse E's `runGuardWrite` / `runGuardBash` helper shape and `envReal = { CLAUDE_PROJECT_DIR: REPO_ROOT }`. The guard script under test is `path.join(HOOKS_DIR, 'ownership-guard.mjs')`. Assertions:

- **J1** — `Write` to `.ai-skills/hooks/gates.json` → **exit 2**, stderr names canonical-source protection. (The primary hole: canonical gate data.)
- **J2** — `Write` to `.ai-skills/hooks/run-gates.mjs` → **exit 2**. (Canonical enforcement runtime source.)
- **J3** — `Write` to `.ai-skills/hooks/ownership-guard.mjs` → **exit 2**. (The guard's own canonical source.)
- **J4** — `Write` to `.ai-skills/hooks/evidence-ledger.mjs` → **exit 2**.
- **J5** — `Write` to `.ai-skills/hooks/lib/resolve-persona.mjs` → **exit 2**. (Prefix-covered `lib/` — pins forward-coverage of future helpers.)
- **J6 (carve-out)** — `Write` to `.ai-skills/hooks/__smoke__/x.mjs` → **exit 0**. (Smoke gates nothing — same carve-out logic as runtime E7.)
- **J7 (carve-out)** — `Write` to `.ai-skills/skills/prism-code-dev/x.md` → **exit 0**. (Clove's own skill source stays writable.)
- **J8 (Bash redirect)** — `Bash` `echo '{}' > .ai-skills/hooks/gates.json` → **exit 2**. (Bash-path arm covers canonical too — mirror of I.aa.)
- **J9 (Bash sed -i)** — `Bash` `sed -i s/a/b/ .ai-skills/hooks/run-gates.mjs` → **exit 2**. (Mirror of I.c.)
- **J10 (negative control)** — `Bash` `echo hi > .ai-skills/hooks/__smoke__/note.txt` → **exit 0**. (Bash-path carve-out for smoke — protection is selective, not a whole-tree block.)

Register the scenario in the final-result aggregation the same way E is. These assertions FAIL until Task 3 lands (no canonical protection exists yet) — that is expected; run them as Task 3's verification, not Task 1's. Verification for Task 1 itself: `node .ai-skills/hooks/__smoke__/run-all.mjs` runs without a harness error (the new assertions fail-as-expected, existing scenarios still pass).

**Task 2 — Narrow the canonical `may_write` lane (defense-in-depth half of Component 1).**
File: `.ai-skills/hooks/gates.json`, `clove.ownership.may_write`. Replace the entry:

```
".ai-skills/hooks/**",
```

with:

```
".ai-skills/hooks/__smoke__/**",
```

This removes Clove's wholesale grant over the canonical enforcement sources while preserving the legitimate smoke-authoring lane. `.ai-skills/skills/prism-code-dev/**` stays untouched (Clove's own skill source). Do this BEFORE Task 3 — once the denylist lands, canonical `gates.json` is protected and a later `may_write` edit to it would itself be denied (same self-lock the #301 A-before-C order avoids).

Note: this edits the canonical `gates.json` only. The runtime `.claude/hooks/gates.json` is updated by the build in Task 4 (canonical → runtime emit), so the two converge with zero drift — same convergence the #301 bootstrap relied on. Do **not** hand-edit the runtime gates.json.

**Task 3 — Extend `PROTECTED_WRITE_PATHS` to the canonical sources (the structural guarantee — Component 1's load-bearing half). Do this LAST among hook writes.**
File: `.ai-skills/hooks/ownership-guard.mjs`.

Add a canonical-protection prefix alongside the existing runtime consts (after `PROTECTED_LIB_PREFIX` at ~line 48). The mechanism mirrors the runtime `PROTECTED_LIB_PREFIX` prefix-match exactly, with a `__smoke__/` carve-out:

```js
// Canonical enforcement source — the build emits these to the runtime, so protecting
// only the runtime (PROTECTED_WRITE_PATHS) left a back door: a gated persona could edit
// canonical .ai-skills/hooks/gates.json (drop its tests gate / widen may_write) or a
// canonical *.mjs, run `pnpm prism:build`, and the weakened runtime would go live. The
// whole canonical hooks tree is protected EXCEPT __smoke__/ (which gates nothing — same
// carve-out as the runtime .claude/hooks/__smoke__/ exemption). prism-code-dev/** is a
// SEPARATE tree (.ai-skills/skills/), not under this prefix, so Clove's own skill source
// stays writable. See issue #305.
const PROTECTED_CANONICAL_HOOKS_PREFIX = '.ai-skills/hooks/';
const CANONICAL_HOOKS_SMOKE_CARVEOUT = '.ai-skills/hooks/__smoke__/';
```

Add a helper used by both the tool-path branch and the Bash-path branch so the two arms cannot drift (the same single-source-of-truth discipline the #301 `SEGMENT_SEPARATORS` Decision established):

```js
/**
 * Returns true if a normalized path is a protected canonical enforcement source.
 *
 * The canonical hooks tree (.ai-skills/hooks/) is the build's input; the runtime
 * (.claude/hooks/) is its output. Protecting only the output left the canonical back door
 * (issue #305). Everything under the canonical hooks prefix is protected EXCEPT __smoke__/
 * — smoke tests gate nothing, so a gated persona may still adjust coverage there.
 */
function isProtectedCanonicalHookPath(normalizedPath) {
  return (
    normalizedPath.startsWith(PROTECTED_CANONICAL_HOOKS_PREFIX) &&
    !normalizedPath.startsWith(CANONICAL_HOOKS_SMOKE_CARVEOUT)
  );
}
```

Wire it into **both** branches:

- **Tool-path branch** (Edit/Write/MultiEdit), at the existing global protected-paths check (~line 194). Extend the condition:
  ```js
  if (
    PROTECTED_WRITE_PATHS.includes(normalizedPath) ||
    normalizedPath.startsWith(PROTECTED_LIB_PREFIX) ||
    isProtectedCanonicalHookPath(normalizedPath)
  ) {
  ```
  The existing stderr message already says "To author hook changes, use the canonical source at .ai-skills/hooks/" — update that line so it no longer points the persona at a now-protected path. Replace it with: the canonical hook sources are protected; hook changes go through a human-granted lawful path (see § The lawful hook-authoring path in this plan / ADR-0067).

- **Bash-path branch** — `commandWritesProtectedPath` (~line 329). After the existing `PROTECTED_LIB_PREFIX` target check (~line 337), add:
  ```js
  if (isProtectedCanonicalHookPath(target)) return target;
  ```
  `target` is already a write-destination token from `collectWriteTargets`, so this denies a redirect/`tee`/`cp`/`mv`/`sed -i`/`dd` write to a canonical enforcement source while a read mention still permits (the target-binding semantics are unchanged — same property I.h–I.k assert for the runtime side). The `__smoke__/` carve-out flows through `isProtectedCanonicalHookPath`, so J10 permits.

Verification for Task 3: `node .ai-skills/hooks/__smoke__/run-all.mjs` — all scenarios pass, including the new J1–J10 (now that the denylist is live) and every existing scenario (regression check that the canonical prefix didn't over-block: E9 / I.y negative controls still permit).

**Task 4 — Build-side backstop (Component 2) + emit.**
File: `scripts/ai-skills/build.ts`, `emitHooks` (~line 740–773).

Add a non-shrinking-protection assertion to `emitHooks`, run before the copy loop emits `gates.json` and `ownership-guard.mjs`. The backstop is proportionate — it is a second line behind Task 3's denylist, not the primary guarantee. Mechanism (a structural, low-cost check — no baseline file to maintain):

- Parse the canonical `.ai-skills/hooks/gates.json`. Assert, for `clove.ownership.may_write`, that it does **not** contain `.ai-skills/hooks/**` or `.claude/hooks/**` (the wholesale enforcement-tree grants that constitute the hole). If present, `emitHooks` throws with a message naming issue #305 and the offending entry — refusing to emit a gates.json that re-opens the canonical or runtime back door.
- Assert the emitted `ownership-guard.mjs` source text contains the marker `PROTECTED_CANONICAL_HOOKS_PREFIX` (the protection is present in what's about to go live). If absent, throw — refusing to emit a guard that dropped the canonical protection.

Both assertions read the canonical text `emitHooks` is already loading (`raw`), so the cost is two string/JSON checks per build, no new file I/O. Keep the assertion logic in a small named helper (`assertHookEmitDoesNotWeaken(canonicalGatesRaw, canonicalGuardRaw)`) so its intent is self-documenting and unit-testable.

Add a unit test in the existing build test suite (`scripts/ai-skills/*.test.ts`) covering: (a) a canonical gates.json WITH `.ai-skills/hooks/**` in clove may_write → `assertHookEmitDoesNotWeaken` throws; (b) the real canonical gates.json (post-Task-2) → does not throw; (c) a guard source missing the `PROTECTED_CANONICAL_HOOKS_PREFIX` marker → throws.

Then run the build: `pnpm prism:build`. This emits the Task 1–3 canonical changes to the runtime (`.claude/hooks/ownership-guard.mjs`, `.claude/hooks/gates.json`, `.claude/hooks/__smoke__/run-all.mjs`) and to `templates/install/.claude/hooks/`. The runtime `ownership-guard.mjs` now carries the canonical protection, and the runtime `gates.json` now carries the narrowed `may_write` — the door is shut on both ends.

**Edit-order recap (why this sequence, not another):**
1. Task 1 (smoke) and Task 2 (narrow canonical may_write) and the Task 3 guard edit are all canonical-source writes that the *landed* protection would forbid. They must happen while `.ai-skills/hooks/**` is still in `may_write` — i.e. before Task 2 removes it AND before Task 3's denylist activates at runtime.
2. Task 2 must precede Task 3: once the denylist is live, canonical `gates.json` is protected, so removing the `may_write` entry afterward would be self-denied — exactly the #301 A-before-C lock.
3. Task 3 is the final canonical edit; the protection goes live only after `pnpm prism:build` (Task 4) emits the new `ownership-guard.mjs` to the runtime. On *this* branch the protection does not actually fire mid-task, because the runtime guard is only swapped at build time — but the order is still authored to match the steady-state rule so the pattern is consistent and the branch is re-runnable cleanly.
4. Task 4 (build) is last: it both adds the backstop and cuts the runtime over.

Verification (run end-to-end after Task 4):
- `node .ai-skills/hooks/__smoke__/run-all.mjs` — all scenarios green (J1–J10 + all prior).
- `node .claude/hooks/__smoke__/run-all.mjs` — runtime copy green (confirms the emit landed the new scenario).
- `pnpm prism:build` — green (build + prism:test).
- `pnpm prism:check` — green (`--check` idempotent: canonical and emitted runtime match, zero drift; check-types, prism:test, verify-manifest, crossref-lint all pass).
- `pnpm prism:crossref-lint` — green (covered by prism:check, called out explicitly per dispatch).
- Build unit tests (`pnpm prism:test`) — the new `assertHookEmitDoesNotWeaken` cases pass.

---

## Decisions

- **Component 1 — protect the canonical enforcement sources, via BOTH a denylist prefix AND a `may_write` narrowing.**
  - **Root cause:** the #301 denylist (`PROTECTED_WRITE_PATHS`) protects only the runtime `.claude/hooks/*`. The canonical sources under `.ai-skills/hooks/**` are the build's *input* and were left unprotected, while that same tree sits in `clove.may_write`. `emitHooks` copies canonical → runtime raw with no integrity check, so a gated persona edits canonical, runs `pnpm prism:build`, and the weakened runtime goes live on the next stop — the same in-place-tamper class #301 closed, reopened on the input end of the pipe. The protection was on the wrong end.
  - **Alternatives considered:** (a) `may_write` narrowing alone — rejected as the *sole* fix: discipline-based, exactly the softer guarantee #301 rejected; Phase 5 (which authors `may_write` for every persona) or a consumer could silently re-add `.ai-skills/hooks/**`. (b) denylist alone, leaving the inert `may_write` entry — workable (the denylist overrides may_write), but leaves a misleading grant in gates.json that reads as "Clove may write canonical hooks" and invites a future re-open. (c) protect the whole `.ai-skills/hooks/` tree including `__smoke__/` — rejected: blocks Clove from adjusting smoke coverage in a gated dispatch, the same over-block the runtime side already carved out.
  - **Chosen approach:** BOTH. The structural guarantee is a denylist prefix `PROTECTED_CANONICAL_HOOKS_PREFIX = '.ai-skills/hooks/'` with a `__smoke__/` carve-out, checked in both the tool-path and Bash-path branches via one shared `isProtectedCanonicalHookPath` helper (single source of truth, the #301 anti-drift discipline). The `may_write` narrowing (`.ai-skills/hooks/**` → `.ai-skills/hooks/__smoke__/**`) is the defense-in-depth companion that keeps gates.json honest about what Clove may write. Const-prefix-not-data for the same reason as #301: a data-form protected list is editable by anyone whose may_write includes gates.json — the hole one level up. `prism-code-dev/**` lives under `.ai-skills/skills/`, a separate tree, so Clove's own skill source is untouched by the prefix.
  - **Implementation guidance:** Tasks 2 (may_write narrow) and 3 (denylist prefix + shared helper + both-branch wiring). The smoke carve-out must permit `.ai-skills/hooks/__smoke__/**` and `.ai-skills/skills/prism-code-dev/**` while denying `gates.json`, `run-gates.mjs`, `ownership-guard.mjs`, `evidence-ledger.mjs`, and `lib/**` — assert all explicitly (Scenario J).
  - → promoted to ADR-0067 (amendment — the non-circumventability guarantee extends to canonical hook source, not only the emitted runtime) + `.prism/references/enforcement-floor.md` (the protected surface is canonical-input + runtime-output, both ends of the emit pipe) + the `gates.json` schema-doc `may_write` description (canonical hooks tree is `__smoke__/`-only for gated personas).

- **Component 2 — build-side backstop: `emitHooks` refuses to emit a weakened gate.**
  - **Root cause:** even with Component 1, the canonical → runtime emit is the trusted channel; if Component 1 were ever bypassed or regressed (a future edit drops the prefix, a consumer re-widens may_write), the build would silently propagate the weakened gate. A backstop on the emit closes that.
  - **Alternatives considered:** (a) full baseline-compare of the entire gates structure against a stored known-good snapshot — rejected as disproportionate: it's a backstop, not the primary guarantee, and a maintained baseline file is its own drift surface (the #301 baseline.json complexity, for a lower-stakes check). (b) no backstop, rely on Component 1 alone — rejected: defense-in-depth is cheap here and the dispatch explicitly asked for it. (c) the chosen targeted structural assertion.
  - **Chosen approach:** `assertHookEmitDoesNotWeaken(canonicalGatesRaw, canonicalGuardRaw)` runs inside `emitHooks` before the copy, asserting (1) clove `may_write` contains neither `.ai-skills/hooks/**` nor `.claude/hooks/**` (the wholesale grants that ARE the hole), and (2) the guard source contains the `PROTECTED_CANONICAL_HOOKS_PREFIX` marker (the protection is present in what's going live). Throws on violation, naming issue #305. Proportionate: two checks on text the build already reads, no new file I/O, no maintained baseline. Unit-tested in the existing build suite.
  - **Implementation guidance:** Task 4. Keep the assertion in a named, unit-testable helper; cover the throw path, the real-gates pass path, and the missing-marker throw.
  - → no promotion needed (ticket-tactical build-pipeline hardening; the principle it backstops is promoted via the Component 1 Decision).

- **Component 3 — the lawful hook-authoring path for Phases 3–4: human-granted Stage-0-style grant to the RUNTIME gates.json, build must not revert it mid-task.**
  - **Root cause:** protecting the canonical sources removes Clove's hook-authoring lane — but epic Phases 3 (command tokenization: edits `run-gates.mjs` token resolution + `gates.json` command tokens) and 4 (build pipeline: edits `build.ts` + hooks) NEED to edit exactly these protected files. Without a lawful path, the fix cripples the epic. The #300/#302 bootstrap already established the pattern: a human adds the specific path to runtime `gates.json#clove.may_write` for the task's duration — a human running raw tools is not a gated dispatch, so the guard never fires for them.
  - **The bootstrap interaction (load-bearing — solved explicitly):** with canonical `gates.json` now protected, the per-task grant CANNOT be added to canonical (Clove can't edit it, and a human editing canonical then building is fine but the grant would then be *permanent* in canonical, defeating the point). So the grant goes to the **runtime** `.claude/hooks/gates.json` only, human-applied. But `emitHooks` re-emits canonical → runtime on every build, which would *revert a runtime-only grant* mid-task (the exact revert we hit in #302). Resolution: during a Phase 3–4 hook-authoring task, the canonical edit is what's being authored, so the build's emit of the *canonical* gates.json is the intended runtime state — the human grant is a temporary widening that the task's own canonical edit either (a) does not touch (Phase 3 edits command tokens, not may_write — the runtime grant survives because the canonical gates.json being emitted doesn't carry it, so the FIRST build reverts it; therefore the human re-applies the runtime grant AFTER each build during the task, OR sequences so the build runs last), or (b) the grant targets a path the canonical edit will permanently add anyway (Phase 4's `build.ts` already in may_write).
  - **Alternatives considered:** (a) a designated non-gated path (e.g. a separate unprotected canonical staging dir hooks are authored in, then promoted) — rejected: adds a permanent structural seam and a promotion step for the rare hook-authoring case; the human-grant is deliberate, gauntlet-visible, and already proven. (b) carve hook-authoring personas out of gating entirely for those phases — rejected: removes the floor exactly when editing the floor, the highest-stakes moment. (c) the chosen human-grant-to-runtime, build-runs-last sequencing.
  - **Chosen approach:** Phase 3–4 hook-authoring follows the Stage-0 pattern, grant applied to RUNTIME `.claude/hooks/gates.json#clove.may_write` by the human, scoped to the specific file (e.g. `.ai-skills/hooks/run-gates.mjs` for Phase 3). The task is sequenced so `pnpm prism:build` runs LAST — the build's canonical → runtime emit reverts the temporary runtime grant as its final act, returning the floor to its protected steady state with zero residue. If a build must run mid-task, the human re-applies the runtime grant after it. This is the same convergence logic as #300/#302, now made explicit for the protected-canonical world. Confirmed: Phases 3–4 CAN proceed under it — Phase 3 grants `run-gates.mjs`, Phase 4 grants the relevant hook files; both revert cleanly at the closing build.
  - **Implementation guidance:** documented here for the epic; no code in #305 implements it (it's a procedure, not a change). The Component 1 denylist is what *forces* this path — Phase 3/4 plans must open with the `[HITL]` runtime grant and close with the build.
  - → promoted to ADR-0067 (amendment — the lawful hook-authoring path under canonical protection: human-granted runtime widening, build-runs-last revert) + `.prism/references/enforcement-floor.md` (how to lawfully change a protected hook).

- **Edit-order for implementing THIS fix — smoke → narrow-may_write → denylist → build, mirroring #301 A–D.**
  - **Root cause:** Clove must edit the canonical enforcement sources (`ownership-guard.mjs`, `gates.json`, `build.ts`) that the fix will protect. `.ai-skills/hooks/**` is currently in `may_write` (the hole), so Clove CAN edit them now — but the moment the protection lands, those same edits would be denied. A naive order self-locks.
  - **Chosen approach:** (1) author smoke assertions (`__smoke__/` is carved out — never protected — but authored first to batch hook-writes and to serve as Task 3's verification); (2) narrow canonical `may_write` `.ai-skills/hooks/**` → `__smoke__/**` BEFORE the denylist, because once the denylist is live the canonical gates.json is protected and a later may_write edit self-denies (the #301 A-before-C lock); (3) land the denylist prefix in `ownership-guard.mjs` as the final canonical-source edit; (4) `pnpm prism:build` last — emits canonical → runtime, cutting the protection over and reverting any residue. On this branch the runtime guard only swaps at build time, so the protection doesn't fire mid-task; the order is authored to match the steady-state rule regardless, so the branch re-runs cleanly.
  - **Start grant:** none needed. `.ai-skills/hooks/**` is in `clove.may_write` today, so Clove can start immediately. No `[HITL]` Task 0.
  - → no promotion needed (ticket-tactical sequencing for this branch; the principle it serves — protect-the-input-too — is promoted via the Component 1 Decision).

---

## History

- 2026-06-26 [hmcgrew/issue-305-floor-canonical-backdoor]: Winston designed the fix — three coupled components (canonical-source denylist prefix + may_write narrowing; emitHooks non-weakening backstop; human-grant-to-runtime hook-authoring path for Phases 3–4) plus the load-bearing edit-order. No Task 0 grant needed — canonical hooks are still in Clove's may_write today. Ready for Clove.
- 2026-06-26 [hmcgrew/issue-305-floor-canonical-backdoor]: Clove implemented Tasks 1–4 in the load-bearing order — Scenario J smoke (canonical protection), narrowed `clove.may_write` (both `.ai-skills/hooks/**` and `.claude/hooks/**` → their `__smoke__/` lanes, since the Task-4 backstop forbids both wholesale grants), `PROTECTED_CANONICAL_HOOKS_PREFIX` + shared `isProtectedCanonicalHookPath` wired into both guard branches, and `assertHookEmitDoesNotWeaken` backstop in `emitHooks`. `pnpm prism:build` cut the protection over to runtime + install seed with zero drift; canonical/runtime/install smoke all green (A–J), fleet-keying 3/3, emit-hooks unit test 5/5, crossref-lint clean. types/tests fail pre-existing (esbuild missing, Windows path-norm `D:\D:\…%20…`) — neither in this diff.
- 2026-06-26 [hmcgrew/issue-305-floor-canonical-backdoor]: Briar self-review — both guard arms verified (tool-path + Bash-path deny canonical `gates.json`/`*.mjs`/`lib/**`; carve-outs `__smoke__/` and `prism-code-dev/**` permit; Scenario J 10/10 on canonical+runtime). Adversarial `..`-traversal / `./`-prefix / trailing-slash probes all denied (path.relative collapses traversal before the prefix check). `pnpm prism:build` permits (not a protected write-target token; subprocess fs emit not guard-intercepted). emit-hooks unit test 5/5. Verdict: clean → Eric. Recorded one deferred `minor` (build.ts residual self-weakening vector) as a documented known-limitation/follow-up — not a #305 must-fix.
- 2026-06-26 [hmcgrew/issue-305-floor-canonical-backdoor]: Clove fixed Eric's Major (Bash-arm `./`/absolute canonical bypass) by normalizing each Bash write-target the same way the tool-path normalizes filePath, before the protected checks; see Review Issue "Bash-path canonical protection bypassable…". Added Scenario J11–J15 (`./`/`..`-traversal/absolute/`sed -i` writes deny, read permits) and mopped three cosmetic minors. Live-probed the emitted runtime guard — every write spelling exits 2, reads/carve-outs/lookalike all correct; zero drift, all smoke + fleet-keying + emit-hooks green.
- 2026-06-29 [claude/stupefied-liskov-b00735]: Reverted — the enforcement floor whose canonical-source back-door this plan closed was removed in the floor revert. See [`epic-floor-revert.md`](./epic-floor-revert.md).

---

## Review Issues

### Bash-path canonical protection bypassable via `./`-prefix and absolute-path target spellings

- **Severity:** `major`
- **Status:** `fixed`
- **File:** `.ai-skills/hooks/ownership-guard.mjs` (`commandWritesProtectedPath`); emitted to runtime + install seed.
- **Problem:** The Bash arm passed the raw redirect/`sed -i` target token to `isProtectedCanonicalHookPath`, which uses `startsWith('.ai-skills/hooks/')` — so `./`-prefix and absolute spellings slipped past while the bare spelling denied, reopening the #305 canonical vector on the Bash arm. The tool-path arm was solid because it normalizes filePath via `path.relative`/`path.resolve` before the prefix check; the Bash arm skipped that.
- **Fixed in:** `commandWritesProtectedPath` now normalizes each write-target via new `normalizeWriteTarget(rawTarget, cwdBase)` = `path.relative(projectDir, path.resolve(payload.cwd ?? projectDir, target)).replace(/\\/g,'/')` before all protected checks, mirroring the tool-path arm so the two cannot drift on path spelling. Scenario J11–J15 pin the `./`/`..`-traversal/absolute/`sed -i` spellings → deny plus a read-permits control; J15 (true absolute) runs only on space-free `REPO_ROOT` (a spaced absolute token splits in the whitespace tokenizer — an orthogonal pre-existing limit). Live-probed the emitted runtime guard: every write spelling exits 2; reads, `__smoke__/`/`prism-code-dev/**` carve-outs, and the `__smoke__evil.mjs` lookalike-injection all correct.

### build.ts is in clove.may_write and contains the backstop — residual self-weakening vector

- **Severity:** `minor`
- **Status:** `deferred`
- **File:** `scripts/ai-skills/build.ts` (in `clove.ownership.may_write`); backstop `assertHookEmitDoesNotWeaken` at `scripts/ai-skills/build.ts:721–773`.
- **Problem:** A gated Clove can write `scripts/ai-skills/build.ts` (it's in `may_write`, and #305 deliberately keeps it there). That file *contains* the Component-2 backstop. In principle a gated persona could, in one branch, strip `assertHookEmitDoesNotWeaken` from `build.ts` AND rewrite `emitHooks` to emit a weakened runtime `gates.json` — bypassing the now-protected canonical `gates.json`, since the runtime is generated, not hand-protected at emit time. Component 1's denylist doesn't cover this because the weakening rides through the build's own emit logic, not a direct hook write.
- **Ruling — out of scope for #305, correctly left as a documented known-limitation/follow-up.** Three reasons it is not a must-fix here: (1) **Diff visibility** — a `build.ts` edit that deletes the backstop and rewrites the emit loop is large and conspicuous; the review gauntlet and the strike/ratify floor catch it as they catch any out-of-lane logic change. (2) **Phase 4 needs it writable** — Phase 4 legitimately edits `build.ts`; protecting it wholesale would cripple the epic exactly as protecting canonical hooks would have. (3) **#305's stated scope** is the canonical-hook back door (edit canonical + rebuild), now closed on both arms. The build-logic vector is a distinct, lower-likelihood class that warrants its own decision, not a silent expansion of this ticket.
- **Suggested fix (follow-up issue against the epic — pick one):** (a) protect `scripts/ai-skills/build.ts` for gated personas and route Phase-4 build edits through the Component-3 human-grant/build-reverts lawful path; (b) sign/hash the emitted runtime `gates.json`+guard and verify at hook load, rejecting a hand-rewritten emit regardless of how it was produced; (c) move `assertHookEmitDoesNotWeaken` (or a minimal integrity check) into a protected non-`may_write` module that `emitHooks` imports, so stripping it requires editing a protected file. Recommend (a) — smallest extension consistent with the pattern already in the plan. Do not expand #305.

---

## Acceptance Criteria

### Behavioral

- [ ] Given a gated Clove dispatch, When Clove attempts to write canonical `.ai-skills/hooks/gates.json`, Then the write is denied (exit 2) with a message naming canonical-source protection.
- [ ] Given a gated Clove dispatch, When Clove attempts to write canonical `.ai-skills/hooks/run-gates.mjs` (or any enforcement `*.mjs` or `lib/` file under `.ai-skills/hooks/`), Then the write is denied.
- [ ] Given a gated Clove dispatch, When Clove attempts a Bash redirect or `sed -i` writing a canonical enforcement source, Then the command is denied.
- [ ] Given a gated Clove dispatch, When Clove writes `.ai-skills/hooks/__smoke__/x.mjs` or `.ai-skills/skills/prism-code-dev/x`, Then the write is permitted (carve-outs intact).
- [ ] Given a canonical `gates.json` whose clove `may_write` re-includes `.ai-skills/hooks/**` or `.claude/hooks/**`, When `pnpm prism:build` runs, Then `emitHooks` refuses to emit and reports issue #305.

### Non-behavioral

- [ ] `node .ai-skills/hooks/__smoke__/run-all.mjs` and `node .claude/hooks/__smoke__/run-all.mjs` both pass all scenarios.
- [ ] `pnpm prism:build`, `pnpm prism:check`, and `pnpm prism:crossref-lint` all pass; `prism:check --check` reports zero canonical↔runtime drift.
- [ ] The canonical protection is enforced by a const prefix in `ownership-guard.mjs` (structural), not by gates.json data alone.

### AC Sync Log

| Date | Agent | Action | Plan | Linear |
| ---- | ----- | ------ | ---- | ------ |
| 2026-06-26 | Winston | created AC | issue-305 | N/A (GitHub issue) |

---

## PR Readiness

- [x] No critical or major issues — Eric's Bash-arm `./`/absolute Major fixed (normalize-before-check); J11–J15 pin the regression
- [x] Types correct in changed files — `build.ts` additions type-check; the only `prism:check-types` error is pre-existing `bundle.ts` missing `esbuild` (not in this diff)
- [x] No stray console.logs or debug artifacts
- [x] Tests written for new logic — Scenario J (J1–J15) smoke + `emit-hooks.test.ts` (5 cases) for the backstop
- [x] No open debugged issues
- [x] Build passes — `tsx build.ts` + `--check` green, zero canonical↔runtime↔install drift; runtime + install seed cut over (the `pnpm prism:build` test step trips only the pre-existing Windows path-norm test fixtures, see Note)
- [ ] PR description up to date — set at PR-open (later ship step)
- [ ] Lasting decisions promoted to architect context — at ticket close (ADR-0067 amendment + enforcement-floor.md, per Component 1/3 verdicts)

**Note:** `prism:check-types` and `prism:test` report pre-existing failures unrelated to this diff — `esbuild` absent from `node_modules` (`bundle.ts`) and a Windows path-normalization defect in the test harness (`crossref-lint.test.ts` expects POSIX `/repo/…`; `generate-skills.test.ts` hits `D:\D:\…%20…` double-drive + URL-encoded space). Neither file is in this change set; the `prism:crossref-lint` linter itself (vs. its test fixture) passes clean, and CI is green on Ubuntu.

**Last updated:** 2026-06-26
