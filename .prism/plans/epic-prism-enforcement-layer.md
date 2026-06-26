# Plan: epic-prism-enforcement-layer

## Ticket

https://github.com/HunterMcGrew/PRISM/issues/289 (epic #289) — sub-issues: Phase 0 #290, Phase 1 #291, Phase 2 #292, Phase 3 #293, Phase 4 #294, Phase 5 #295, Phase 6 #296.

## Goal

Give every PRISM persona an enforced **floor** (typed report contract + ownership matrix + class-scaled evidence gates) and a sharper, procedural **ceiling** (skill prose rewritten as named procedures with typed escapes), so that (a) a persona's claimed completion is trustworthy to whoever consumes it — Sol or a human — without depending on how smart the model is, **and (b) the instructions themselves make the model stronger and more reliable** — preventing looping, over-reasoning, and under-reasoning by replacing vague aspiration with concrete, factually-grounded actions the agent actually needs to do.

---

## Context / Framing

PRISM today is ~100% guidance layer: skills and rules the model is *trusted to comply with*. "Load-bearing" currently means "the model complies." This epic moves the must-be-true claims out of prose the model self-reports and into code the runtime runs at the `Stop`/`SubagentStop` boundary.

**Primary goal is leg 2 — orchestration & handoff integrity, on Claude Code.** Sol routes deterministically on a returned verdict (`report-back.md`: "never interprets the work behind a verdict"). That determinism is safe only if the verdict is true; today nothing checks it, so a false `done` makes Sol advance a phase on a lie. The same gap burns a human reading `done` in a solo run. Portability to OSS/smaller models (leg 1) is explicitly **not** a near-term driver — if the hooks happen to help Codex, fine, but the design targets Claude Code first.

**The floor/ceiling split is not a reversal of PRISM's vague-by-design skills.** Latitude (judgment) stays prose and stays trusted. Only *guarantees* (did tests pass, who may write what) move to code. The split names which claims were never supposed to be vague.

**The floor is Sol-independent by construction** (see Decisions → "Channel-hardening"). It enforces at the runtime boundary regardless of invoker. Sol is a *consumer* of the hardened verdict, not a dependency of the enforcement.

**The ceiling is co-equal with the floor, not a follow-on.** A second purpose of this epic — as load-bearing as trust — is to make the model *stronger and more reliable through the instructions themselves*. Vague skills let the model loop, over-reason, or under-reason because there is no concrete target. Sharper procedural instructions, grounded in the real actions the agent must take, give the model a path: "reasoning becomes the path to the gate." The floor and ceiling reinforce — the ceiling tells the model *how*, grounded in the same real actions the floor *checks*. A procedure that doesn't correspond to a real, factual action the agent needs to do is aspiration, not instruction, and doesn't belong in either layer.

---

## Reference artifacts (prototypes — plan *around*, do not merge as-is)

Held by Hunter as design outputs on his Desktop, not yet in repo. They are reference implementations; the corrected mechanisms below supersede them:

- `enforcement-architecture.md` — three-layer map, control flow, F1–F7 failure taxonomy, settings.json wiring, DoD-rewrite pattern, review-verdict caveat.
- `gates.json` — Definition-of-Done-as-data + ownership matrix (clove, briar).
- `run-gates.mjs` — `Stop` reconciliation engine.
- `ownership-guard.mjs` — `PreToolUse` ownership guard.
- `evidence-ledger.mjs` — `PostToolUse` exit-code recorder.
- `report-contract.md` — typed dispatch contract (schema + validator + GBNF + re-prompt table).
- `prism-code-dev-senior.md` — Clove ceiling done right (vague lines → named procedures + typed escapes). This is the **template for the Phase 6 ceiling pass.**

---

## Decisions

- **The inversion principle (the one ADR — ADR-0067).** Correctness verdicts are computed from evidence by the runtime, not self-reported by the model; the model *proposes* a verdict, the gate *ratifies or overrides* it, and this holds regardless of who invoked the persona.
  - **Root cause it addresses:** every load-bearing claim in PRISM currently rides on model compliance; off the strongest models, and even on them under orchestration, an unverified `done` propagates as truth.
  - **Alternatives considered:** (a) stricter prose DoD checklists — rejected, still prose the model claims it followed; (b) a verification persona that re-checks every other persona — rejected, adds a dispatch and still self-reports.
  - **Chosen approach:** runtime hooks compute the verdict from real exit codes / structural checks. Beats the alternatives because an exit code cannot be argued past.
  - **Why an ADR:** durable, cross-cutting, reshapes every skill's DoD section; future contributors need the *why*. Triple-gate passes (hard to reverse, surprising without context, genuine trade-off vs. the simpler prose-only path).
  - → promoted to ADR-0067 (to be written in Phase 0).

- **Channel-hardening, not a competing verdict channel.** The hook does **not** create a `ratified-verdict.json` that Sol must learn to prefer. It *hardens the channel that already exists* — the model's own report/return.
  - **Root cause of the prototype's complexity:** the prototype wrote a separate ratified file and posed "does Sol read the file or the model's claim?" as an open contract — which looked ADR-worthy and introduced cross-worktree file-read problems.
  - **Chosen approach:** the `Stop`/`SubagentStop` hook refuses to let the model stop on a verdict the gates contradict (exit 2 → forced continue). On strike-cap, it re-injects "emit your report as `needs-stronger-model` and stop," so the model's *returned* verdict is always gate-consistent before Sol (or a human) ever reads it. `ratified-verdict.json` is retained only as an **audit artifact** (what ran, exit codes, strike count), never a routing input.
  - **Consequence:** Sol reads the model's structured return exactly as today; no Sol-side contract changes. This is what makes the layer Sol-independent and what makes the Sol seam a one-line `lib/` instruction, **not** an ADR.
  - **Implementation guidance:** make `report.json` (the gate's input) and the model's structured return to Sol the *same* contract, so there is one verdict, gated once. Whether Sol reads the return or reads `report.json` is a reference-file choice settled in Phase 2.
  - → promoted to ADR-0067 (same principle) + Sol `lib/` reference edit (no separate ADR).

- **Single-contract wiring settled: one contract, Sol reads the return (was the second Open Question; resolved in Phase 2 validation).** `report.json` and the model's structured return are the *same* contract, gated once; Sol reads the returned verdict and nothing else to route.
  - **Root cause it resolves:** the channel-hardening Decision left open whether `report.json` *is* the return Sol reads, or whether Sol reads its own schema return with the hook only guaranteeing the two agree — posed as the second Open Question with "one contract, Sol reads the return" as the default path.
  - **Why settled on the default path:** Phase 2 task 2 validation confirmed Sol's routing table consumes the returned verdict (including the gate-forced `needs-stronger-model`) with no Sol code change. The return is gate-ratified before Sol sees it; `ratified-verdict.json` is audit-only and never a routing input. A second contract or a separate routing file would have reintroduced the cross-worktree file-read problem channel-hardening exists to avoid.
  - **Confirm no ADR needed:** correct — the Sol seam is a one-to-two-line `lib/` reference edit (now in `report-back.md`), not a durable cross-cutting decision of its own. ADR-0067 already carries the channel-hardening principle this resolution rests on; a second ADR would duplicate it.
  - → promoted to Sol `lib/` reference edit in `report-back.md` (no separate ADR — ADR-0067 already carries the principle).

- **Persona identity resolves payload-first; the `active-persona` file survives only for the solo path.**
  - **Root cause:** the prototype's `echo "clove" > .prism/active-persona` is shared mutable state that races under fleet/worktree concurrency.
  - **Chosen approach:** a shared `resolve-persona` helper. Order: (1) `payload.agent_type` maps to a `gates.json` key → use it (orchestrated path, race-free, no file); (2) `agent_type` present but not a gates key (e.g. `Explore`, `general-purpose`) → exit 0, not a gated dispatch; (3) no `agent_type` (solo main-loop) → read `.prism/active-persona`, which the skill writes on startup — safe because solo = single persona owns the session.
  - **Implementation guidance:** the file path stays single-writer by construction; do not use it in the orchestrated path. Closes the fleet-concurrency open thread.

- **In-flight state keys by `agent_id`, not `session_id`.**
  - **Root cause:** subagents share the parent's `session_id` (confirmed against Claude Code hook docs), so two fleet lanes would collide their strike counters and ledgers under one session.
  - **Chosen approach:** `runKey = agent_id ?? session_id`. Evidence dir, strike counter, ledger, and report all key by `runKey`, written in the hook's own cwd (the lane's worktree). Sol never reaches in — the verdict travels by the model's return, so no cross-worktree file read is needed.

- **Wire the gate script on both `Stop` and `SubagentStop`.**
  - **Root cause:** a project-level `Stop` hook fires on main-loop stop only; orchestrated personas are subagents whose completion fires `SubagentStop`. `Stop`-only wiring enforces solo and silently no-ops under Sol — the exact mode where a false `done` does the most damage.
  - **Chosen approach:** register the same script on both events in `settings.json`; add a `stop_hook_active` early-exit as the runtime loop backstop, with the 3-strike counter as the primary ceiling.

- **Evidence ledger reads top-level payload fields.**
  - **Root cause:** the prototype guessed `i.tool_response?.exit_code`; the actual PostToolUse payload exposes `exit_code` and `tool_output` at the top level, so the ledger recorded `0` for everything.
  - **Chosen approach:** read `i.exit_code` / `i.tool_output`; record `{ ts, cmd, exit_code, runKey }`. Unblocks `source: ledger` gates (the cost knob that avoids re-running tests on every stop).

- **Commands tokenize through the existing config seam — no second source of truth.**
  - **Root cause:** `gates.json` hardcoded `pnpm`/`tsc`/`vitest`; PRISM already tokenizes verification commands via `config.json` (`techStack`) + Atlas + `verification-commands.md`.
  - **Chosen approach:** command *tokens* live in `config.json` (a `commands` map); `gates.json` references them (`{{commands.test}}`); the gate runner resolves at runtime; `verification-commands.md` becomes the human-readable rendering of the same data; Atlas populates the map at onboarding. `gates.json` stays canonical/structural and is never hand-edited per team.

- **Gate-strength taxonomy — three classes; floor scales, contract + ownership are universal.** Every persona gets the report contract and an ownership matrix (`may_write` globs + `may_not_run`). Evidence gates scale by class:
  - **Class A (hard evidence gates):** `prism-code-dev` (Clove — tsc/test/lint), `prism-changelog` (Sage — tags resolve + file written), `prism-onboarding` (Atlas — `config.json` validates against `config.schema.json`).
  - **Class B (procedural/structural gates — act provable, quality structurally trusted):** `prism-architect`, `prism-code-review-self`, `prism-code-review-pr`, `prism-debugger`, `prism-ticket-start`, `prism-user-stories`, `prism-qa-test-plan`, `prism-documentation`, `prism-doc-walker`, `prism-surface-audit`, `prism-design`, `prism-prd`, `prism-refactor-scout`, `prism-retro`, `prism-standup-summary`.
  - **Class C (structurally-trusted only — floor = ownership + contract + procedural prose):** the nine business personas (`prism-founder`, `prism-market-research`, `prism-finance`, `prism-marketing`, `prism-sales`, `prism-data`, `prism-customer-success`, `prism-recruiting`, `prism-legal`) + `prism-conductor` (Sol — verdict consumer; floor is heavily ownership: may not write code/tickets, may not run merge).
  - **Utilities (`prism-handoff`, `prism-review-loop`, `prism-skill-forge`):** no `gates.json` persona entry — they carry no verdict and inherit the active persona's ownership lane. They receive the **ceiling-prose pass only** (Phase 6).
  - **Implementation guidance:** class assignment here is by role; Phase 5 verifies each ownership matrix against the actual skill body (the accuracy check — ownership globs must match what the skill genuinely writes).

- **Briar's gate proves she *worked* and is *coherent*, never that she's *right*.** Mechanical: the check-gates fired, and `needs-fix` ⇒ a real critical/major finding exists (shape-validated). Quality rides on structural independence (fresh dispatch + `may_write: plan-only`). Do not build a "review-quality gate" in any later phase — it cannot exist; name the ceiling in the ADR so it is not chased.

- **Handoff is enforced as named + coherent, never auto-executed.** The contract carries the handoff, so it's enforced identically with or without Sol.
  - **Negative (ownership-forced):** the ownership matrix makes doing the next lane's work impossible (Briar can't write source → must hand to Clove; Clove can't merge → must hand to human), so handoff is the only remaining move, not a trusted nicety.
  - **Positive (required route field):** the report contract gains a required `next_route` field, shape-checked at the gate — the persona cannot stop without declaring where it hands off. Replaces the prose "Default route: X" the model is currently trusted to include.
  - **Coherence:** `next_route` must be consistent with the verdict (`done` → normal next persona; `needs-replan` → Winston/user; `blocked` → human; `needs-fix` → implementer) — same check shape as Briar's `needs-fix ⇒ real blocker`. An incoherent handoff misleads a human reader as much as it misroutes Sol.
  - **Hard boundary:** enforcement never *auto-invokes* the next persona — that would break the human gate and every skill's never-auto-invoke rule. It guarantees the handoff is present and true before stop; acting on it (Sol auto-routes / human reads and dispatches) stays downstream and identical in both modes.
  - **Implementation guidance:** add `next_route` to the report contract (Phase 0 task 3) and the verdict↔route coherence check to `validateShape` (Phase 1 task 4). The valid-route table per persona derives from each skill's existing `## Next persona` section.
  - → promoted to ADR-0067 + the taxonomy architect doc.

- **Factual-grounding bar — every procedure maps to a real action, with a calibrated reasoning budget.** The ceiling pass (Phase 6) and the taxonomy doc hold instructions to this bar: a procedure must name a concrete action the agent genuinely needs to take (a command to run, a file to read, an artifact to write, a decision to make), with a precise trigger and a typed escape. The escape is the anti-loop mechanism — it gives the model a sanctioned exit instead of spinning. The precise trigger is the anti-over/under-reasoning mechanism — it tells the model how much to think and when to stop.
  - **Why:** vague instruction is the root cause of looping, over-reasoning, and under-reasoning — with no concrete target the model either spins or guesses at depth. The `prism-code-dev-senior.md` artifact is the worked example (Risk-first sequencing → escape `needs-replan`; Chesterton's Fence → escape `needs-human`).
  - **Implementation guidance:** during Phase 6, the test for each rewritten line is "does this correspond to a real action the agent must do?" If not, it's aspiration — cut it or ground it. Aspiration dressed as procedure is worse than honest prose because it invites the model to perform compliance with a step that has no real referent.
  - → promoted to ADR-0067 + the taxonomy architect doc.

- **Phase the epic on the solo-proves-primitive / orchestration-wires-it fault line.** Prove the floor end-to-end on Clove solo (strongest gates) and smoke-test before touching Sol or rewriting any other skill. Land as sub-issues, never one PR (six subsystems: hooks, settings+seed, build pipeline+guards, every skill body, conductor read, config schema + Atlas).

- **Clove's `may_write` expanded beyond the plan spec to include hook/skill/settings paths.** The plan spec listed 4 may_write patterns (`src/**`, `**/*.test.*`, `.prism/plans/**`, `.prism/evidence/**`). Phase 1 implementation adds 3 more: `.ai-skills/skills/prism-code-dev/**`, `.claude/hooks/**`, `.claude/settings.json`.
  - **Root cause:** The Phase 1 build session IS a prism-code-dev agent session. Once `settings.json` and the hooks were wired, the ownership guard started enforcing Clove's ownership on the build session itself — denying Edits to the hook and skill source files. The missing paths caused the bootstrapping conflict.
  - **Chosen approach:** Add the three build-phase paths to `may_write`. This is correct: Clove genuinely owns the hook implementations, the skill source, and the settings wiring during Phase 1. The guard denying Clove from touching its own artifacts was the error, not the guard's existence.
  - **Phase 5 note:** when the Phase 5 accuracy audit runs, verify that these paths still belong to Clove's lane and are not over-broad.
  - → no promotion needed (ticket-tactical: Phase 1 bootstrap issue; Phase 5 will re-verify ownership matrices across all personas).

- **`gates.json#clove` `may_write` expanded to include `.gitignore`.** Briar's Major finding required adding `.prism/evidence/` to `.gitignore`, but `.gitignore` was not in Clove's `may_write` list. Cross-lane absorption per the rules: the `.gitignore` fix is part of the Phase 1 ledger feature (wiring evidence ledger output requires excluding it), not lane-creep. The `may_write` expansion landed first to satisfy the dogfooded ownership guard before the `.gitignore` write.
  - → no promotion needed (ticket-tactical; Phase 5 will verify all ownership matrices).

- **`stop_hook_active` does not exist in the Stop payload (confirmed 2026-06-26 against live docs).** The plan's Decision "Wire the gate script on both Stop and SubagentStop" specified using `stop_hook_active` as a runtime-loop backstop. The Claude Code hook docs confirm this field is absent from Stop and SubagentStop payloads — Stop only carries `stop_reason`.
  - **Root cause:** The field was specified in the plan based on the prototype's design assumptions; the live docs do not include it.
  - **Chosen approach:** Did not implement the `stop_hook_active` backstop (field doesn't exist — the check would be a no-op). The 3-strike counter is the sole ceiling. The runtime-loop backstop from the Decisions entry no longer applies.
  - **Impact:** The strike cap is the only mechanism preventing infinite looping on persistent gate failures. Phase 1 smoke test (scenario D) confirms the 3-strike cap fires correctly independent of `stop_hook_active`.
  - → no promotion needed (the plan Decision is now superseded; the strike counter is the implementation of record).

- **Gate non-circumventability — the enforcement runtime and gate state sit outside every gated persona's writable scope (global protected-paths denylist).**
  - **Root cause:** `gates.json#clove`'s `may_write` granted `.claude/hooks/**` and `.prism/evidence/**` wholesale, so a gated persona could lawfully rewrite its own gate (`run-gates.mjs`) and reset its own strike counter (`strikes.json`). Surfaced when Clove, blocked by its live Stop gate during Phase 2, attempted exactly this; the security hook caught it but the ownership matrix had permitted it. ADR-0067's inversion principle assumed the gated party couldn't disable the runtime without enforcing it — a verdict from an exit code is only un-arguable if the gated party can't edit the code that computes it.
  - **Alternatives considered:** (a) per-persona `may_write` removal of the protected globs — rejected: discipline-based, and Phase 5 (which authors `may_write` for every persona) or any consumer could silently re-open the hole; the incident *was* an agent reaching for the path under pressure, so discipline is the thing that failed. (b) protected list as `gates.json` data — rejected: editable by anyone whose `may_write` includes `gates.json`, which is the hole one level up.
  - **Chosen approach:** a global protected-paths denylist as a const in `ownership-guard.mjs` (itself protected), checked before `may_write` with no per-persona override path. Hard-denies the enforcement `.mjs` files + `lib/` + `gates.json` + `settings.json`, and the gate-state files (`strikes.json`, `ledger.jsonl`, `ratified-verdict.json`) under `.prism/evidence/`; carves out `.prism/evidence/**/report.json` as the persona's lawful report channel. Companion `may_not_run` rule (`rm .prism/evidence`) closes the obvious shell-deletion vector. Matches the floor's own thesis — structural guarantee over trusted compliance, the same reason an exit code beats a prose checklist. Const-not-data because data-form re-introduces "who can edit the protected list" one level up.
  - **Precision (why not the whole `.claude/hooks/` tree):** the denylist targets the enforcement files by path, NOT the directory. `__smoke__/` test files live under `.claude/hooks/` but gate nothing — protecting the tree would block Clove from ever adjusting smoke coverage in a gated dispatch. `gates.json` IS protected (it's the ownership data the guard reads, and where the hole lived); that protection is exactly what forces Phase 5 per-persona gates-authoring through the canonical-source split — noted as a Phase 5 dependency.
  - **Known softer edge:** obfuscated shell deletion of evidence is defended in depth (the `may_not_run` substring + the security hook backstop), not absolutely; the lawful write/edit path is airtight.
  - **Implementation guidance:** Phase 2 tasks A–D below. The `report.json` carve-out must match `report.json` and *not* its gate-state siblings — assert all four explicitly in the smoke harness. The denylist check is global, runs before `may_write`, never gated behind a persona check.
  - → promoted to ADR-0067 (amendment — part 5 + non-circumventability Consequence) + `enforcement-floor.md` (third universal primitive) + the `gates.json` schema-doc `may_write` description.

- **Hook source/runtime split resolves the authoring-vs-protection tension; the edit-order resolves it on THIS branch.**
  - **Root cause:** Clove legitimately authors hooks (Phase 3 tokenization, Phase 4 pipeline), but a steady-state denylist on the enforcement runtime would block that authoring. And on *this* branch the canonical split doesn't exist yet — `gates.json`, `ownership-guard.mjs`, and `__smoke__/` all live under `.claude/hooks/`, so a naive edit order deadlocks: denylist-first blocks the next `gates.json` edit; `may_write`-removal-first blocks the next hook edit before the denylist exists.
  - **Chosen approach (steady state):** hook *source* lives in canonical `.ai-skills/hooks/` (outside the guarded path); the Phase 4 build pipeline emits source → `.claude/hooks/` + `templates/install/`; the denylist covers the *emitted* runtime, not the source. De-risks Phases 3–4 by giving hook-authoring a lawful lane.
  - **Chosen approach (this branch):** the guard reads its const and `gates.json` fresh per PreToolUse fire (each hook invocation is a fresh Node process), so the denylist activates only *after* `ownership-guard.mjs` is saved. Therefore: do all `gates.json` + `__smoke__/` writes FIRST (while Clove still holds `.claude/hooks/**` in `may_write` and no denylist is active), then write the `ownership-guard.mjs` denylist LAST as the final hook-touching action. Do NOT remove `.claude/hooks/**` from `may_write` on this branch — once the denylist lands, `gates.json` is protected, so a later `may_write` edit to remove the entry would itself be denied. The leftover `.claude/hooks/**` entry is inert (the denylist overrides it) and is cleaned when the canonical split lands in Phase 4.
  - **Sequencing constraint for Phases 3–5:** the canonical-source split must land *before or with* any phase that needs to edit hooks OR author per-persona `gates.json` entries after the denylist is live — Phase 5 gates-authoring is now a canonical-source-split dependency, not a `.claude/hooks/` edit. Otherwise the denylist deadlocks the work that builds the split.
  - → no promotion needed (ticket-tactical sequencing; the principle it serves is promoted via the Decision above).

- **Issue #300 bootstrap edit-order — one irreducible human edit unlocks the whole block.**
  - **Root cause:** the two gate bugs must be fixed in canonical source and emitted to the runtime, because the runtime `.claude/hooks/` is denylist-protected against gated-persona writes. But teaching `scripts/ai-skills/build.ts` to emit hooks requires that file in Clove's `may_write`, and that grant lives in the denylist-protected runtime `.claude/hooks/gates.json` — a gated Clove cannot add it to itself via any tool path. The only tool path that *could* (Bash redirect to the protected gates.json) is itself a bug being fixed in this same block (finding 5) and must not be exploited.
  - **Alternatives considered:** (a) Clove disables its own gating via `settings.json` first — rejected: `settings.json` is denylist-protected too. (b) Clove uses the Bash-redirect bypass to self-grant — rejected: exploiting the bug we're fixing to bootstrap it is exactly the self-escape the floor forbids, and it would leave the block un-reproducible cleanly. (c) Have the human run the entire build — rejected: the human-needed part is the *code edit* to `build.ts` (which needs the lane), not running the build (a Bash command Clove may run); making the human author build.ts defeats the persona model. (d) the chosen one-edit grant.
  - **Chosen approach:** ONE `[HITL]` edit — the human adds `"scripts/ai-skills/build.ts"` and `".ai-skills/definitions/**"` to the runtime `gates.json#clove.may_write`. The denylist gates Clove from this edit; a human running raw tools is not a gated dispatch, so the guard never fires for them. Everything else is Clove's: author canonical hooks with all fixes (in-lane under `.ai-skills/hooks/**`), teach `build.ts`, run `pnpm prism:build`. The grant **converges**: the canonical `.ai-skills/hooks/gates.json` carries the same two `may_write` entries, so the build's emission overwrites the runtime gates.json with a copy that already has them — the human's manual edit and the build output match, zero drift, `prism:check` clean.
  - **Why irreducible:** given the no-bypass constraint, there is no tool path by which a gated persona adds a non-`.claude/hooks/`, non-`.ai-skills/hooks/` path to its own runtime `may_write` — that grant only lives in the denylist-protected runtime gates.json. This is the floor working as designed: the runtime is deliberately un-self-modifiable, and bootstrapping a NEW build-pipeline capability into it requires the one actor the floor trusts above the gate. Marked `[HITL]`; Sol surfaces it to Hunter as the block's first action.
  - **Implementation guidance:** Issue #300 Stage 0 (the human edit) blocks Stages 1–2. Stage 1 authors canonical source (in-lane, runtime untouched). Stage 2 teaches the build, runs it, and cuts the runtime over — the new denylist/guard go live the instant the emitted `ownership-guard.mjs` lands.
  - → no promotion needed (ticket-tactical bootstrap sequencing for this branch; the non-circumventability principle it rests on is already promoted via ADR-0067 part 5).

- **Issue #300 Bug 1 — stateful accept-on-re-emit via a `capped` flag in `strikes.json`.**
  - **Root cause:** at the 3-strike cap, `injectNeedsStrongerModel` forces the model to re-emit `verdict: needs-stronger-model`, but `isCoherent` returns `false` unconditionally for that verdict (it holds no state distinguishing a gate-FORCED re-emit from a persona self-claim). The re-emit fails `validateShape` → shape-fail branch re-strikes the already-capped count → re-injects → infinite stop-loop. No accept-on-re-emit path existed (confirmed by inspection of `run-gates.mjs`; Debugged Issues entry).
  - **Alternatives considered:** (a) persist a "park forced" flag and consult it in coherence — chosen. (b) skip the coherence rejection for `needs-stronger-model` whenever strike count is at cap — rejected: weaker, because "at cap" is a count, not proof the gate forced *this* verdict; a persona could self-claim `needs-stronger-model` after accruing 3 strikes on unrelated failures and escape. (c) have the cap path exit 0 directly without a re-emit — rejected: loses the channel-hardening property that the model's *returned* verdict is what Sol reads; the re-emit is what puts the gate-forced verdict into the return.
  - **Chosen approach:** `injectNeedsStrongerModel` writes `capped: true` into `strikes.json` before exiting. The gate loads `capped` into a `gateForcedPark` flag, threads it into `isCoherent`, and accepts a `needs-stronger-model` report **iff** `gateForcedPark === true` AND `next_route === persona`. A strike-0 self-claim (`capped` absent → `gateForcedPark` false) still rejects — the floor's no-self-escape guarantee holds. On the accepted re-emit, the gate skips re-running the evidence gates (they'd re-fail the verdict the gate itself demanded) and allows the stop directly. Beats (b) because it requires the gate's own forcing as the precondition, not a coincidental strike count; beats (c) because it keeps the verdict in the model's return.
  - **Implementation guidance:** Issue #300 Stage 1 task 3 (exact edits). The required behavior, stated to be implementer-independent: a `needs-stronger-model` report passes coherence iff the gate previously forced the park for this runKey (`capped` set) AND the route is the persona's own key; a self-claim fails; a gate-forced re-emit to the wrong persona fails.
  - → no promotion needed (the durable principle — gate forces the verdict, persona may not self-claim it — is already in ADR-0067 § channel-hardening and the report-contract coherence table; this is the implementation that makes the principle actually hold).

- **Issue #300 Bug 2 — baseline-regression tolerance for `fresh` gates (strike on change, not absolute state).**
  - **Root cause:** `fresh`-source gates (`types`, `lint`) re-run from scratch on every stop with no baseline. A gate hard-blocks on `claimed && !result.passed`, so a persona that did correct work and legitimately claims `types: true` strikes out when the fresh run fails on pre-existing env noise (Windows `bundle.ts` esbuild + path-norm failures; CI green on Ubuntu) it never caused — then hits Bug 1. The Phase 2 unclaimed-gate fix only covered `!claimed` gates; the claimed-true path was untouched (Debugged Issues entry).
  - **Alternatives considered:** (a) baseline-compare — capture each fresh gate's exit at dispatch start, strike only on baseline-pass→now-fail (a regression) — chosen; most directly matches ADR-0067's "reconcile change, not absolute repo state." (b) env-failure classification by parsing which files a gate failure touches — rejected: brittle, requires per-tool output parsing. (c) Atlas-populated known-pre-existing-failure allowlist — rejected: discipline-based, drifts, and re-introduces a "who edits the allowlist" question.
  - **Chosen approach:** `ownership-guard.mjs` captures a baseline (`{ gateId: exitCode }` for each `fresh` gate) on the persona's FIRST write-tool fire — the earliest reliable pre-mutation point, since PreToolUse fires before the write and the tree is still the lane's starting state. `run-gates.mjs` strikes a claimed-true fresh-gate failure ONLY when its baseline passed (regression); a baseline-fail-now-fail (pre-existing) or absent baseline downgrades to a non-blocking note. `ledger` gates (`tests`) are unchanged — the ledger already records only the persona's own command runs, so it's a regression proxy by construction. Floor intact: a genuine regression (clean baseline → now fails) still strikes; only inherited env state is tolerated.
  - **Tradeoff (capture point):** a dedicated `SessionStart` capture hook would be the textbook seam, but subagent event timing is unconfirmed (the plan's field-shape notes flag this). The first-write PreToolUse fire is reliable across solo and fleet because PreToolUse always fires. Cost: the baseline reflects the tree at first-write, not session-open — correct for "did THIS persona's work regress the gate," which is exactly the question. Absent-baseline fail-open is scoped to the *pre-existing question only*: it never strikes a fresh gate it can't prove regressed, but the `tests` ledger gate and all shape/coherence checks are unaffected.
  - **Implementation guidance:** Issue #300 Stage 1 task 4 (exact edits in both hooks). Smoke scenario G pins both arms: pre-existing (baseline-fail → no strike) and regression (baseline-pass → strike).
  - → no promotion needed (ticket-tactical mechanism; the principle — reconcile the persona's claim against proof of change, not absolute repo state — is ADR-0067's inversion principle, already promoted).

- **Issue #300 active-persona — deny the orchestrated write at the guard, keep the solo write.**
  - **Root cause:** Clove's DoD startup unconditionally writes `echo "clove" > .prism/active-persona`. The orchestrated resolver reads `agent_type` from the payload and never needs the file, but the subagent's write clobbers the solo session's value and races under fleet — the corruption the payload-first resolver Decision warned about.
  - **Alternatives considered:** (a) remove the skill-prose write and rely on the payload-first resolver — rejected: the *solo* resolver reads the file; removing the write leaves solo Clove ungated. (b) a SessionStart hook that writes only when `agent_type` absent — rejected: SessionStart fires before the user invokes a skill, so it can't know which persona to write in solo; it can gate *whether* but not *what*. (c) deny the write at the ownership guard when `agent_type` is present — chosen.
  - **Chosen approach:** in `ownership-guard.mjs`, deny any Write/Edit to `.prism/active-persona` when `payload.agent_type` is present (orchestrated); permit when absent (solo). The skill-prose write then succeeds in solo (correct, gating preserved) and is denied under orchestration (corruption + fleet race eliminated). This implements the resolver Decision ("do not use the file in the orchestrated path") as a structural guard the model can't accidentally violate — not prose it runs before any hook fires. Beats (a) (keeps solo gating) and (b) (works without SessionStart knowing the persona).
  - **Implementation guidance:** Issue #300 Stage 1 task 5; smoke scenario H pins both arms. The skill-prose write stays — the resolution is "harmless under orchestration," not "removed."
  - → no promotion needed (ticket-tactical; the resolver's payload-first principle is already a Decision above).

- **Issue #300 Bash-path hardening — close the redirect/copy/sed and `rm -f` bypasses structurally.**
  - **Root cause:** the `PROTECTED_WRITE_PATHS` denylist is checked only in the Edit/Write/MultiEdit branch; a Bash redirect/`tee`/`cp`/`mv`/`sed -i` to a protected path takes the Bash branch, which checks only `may_not_run`. And `rm -f`/`-fr`/`--force .prism/evidence` escape the `rm .prism/evidence` substring guard (the flag sits between `rm` and the path). Both are deferred Review Issues / Phase 5 follow-ons, pulled forward because the canonical split (which lets `gates.json` be edited again) lands in this block.
  - **Chosen approach:** in the Bash branch of `ownership-guard.mjs`, after `extractEffectiveCommand` and the `may_not_run` check, add two structural scans: (1) `commandWritesProtectedPath` — deny if the effective command contains a mutation operator (`>`, `>>`, `tee`, `cp`, `mv`, `sed -i`, `dd`) AND a `PROTECTED_WRITE_PATHS`/`PROTECTED_LIB_PREFIX`/protected-evidence-basename string; (2) `commandDeletesEvidence` — deny if it matches `rm … .prism/evidence/` regardless of flag form. Plus the declarative floor: add `rm -f`/`rm -fr`/`rm --force .prism/evidence` to canonical `gates.json#clove.may_not_run`. Conservative by design — a false positive denies a benign command mentioning a protected path next to a redirect, which is acceptable because hooks are authored in canonical source, never via Bash to the runtime. This narrows the "softer edge defended in depth" the plan named to "the lawful tool path AND the common shell-write/delete forms are now airtight; only deeply obfuscated shell remains the security-hook's job."
  - **Implementation guidance:** Issue #300 Stage 1 task 6; smoke scenario I pins all forms + negative controls.
  - → no promotion needed (ticket-tactical hardening of the Bash branch; ADR-0067 part 5 already names the softer-edge boundary, and this Decision records that the boundary moved inward).

- **Issue #300 build-emit scoping — hooks emit raw to `.claude/` + seed, not `.codex/`, and stay outside `seed-curation.json`.**
  - **Chosen approach:** `emitHooks` in `scripts/ai-skills/build.ts` copies `.ai-skills/hooks/**` (the `.mjs` hooks, `lib/`, `gates.json`, and `__smoke__/`) raw — no token substitution, no dialect transform — into `.claude/hooks/**` and `templates/install/.claude/hooks/**` via `writeFileIfChanged` (idempotent; drift-reported in check mode). Called from `main()` after `writeSeedMirror`, runs in both build and check mode.
  - **Scope calls (per the plan's task 8):**
    - **`.codex/` not emitted** — gated behind confirmed Codex hook parity (Open Question default path). Only `.claude/` + seed.
    - **`settings.json` not in canonical hooks** — it wires platform-specific hook paths and stays a hand-maintained runtime file (Stage 1 task 2 decision); `emitHooks` never touches it.
    - **`__smoke__/` IS seeded** — a consumer who edits hooks benefits from the harness; seeded alongside the `.mjs` hooks + `gates.json` + `lib/`.
    - **Hooks live OUTSIDE `seed-curation.json`'s scope** — `seed-curation.json` governs only `COPIED_CONTENT_AREAS` (the `.prism/` areas). `.claude/hooks/` is not among them, so `checkSeedDrift`/`writeSeedMirror` never interact with the emitted hooks; the hooks-seed copy is governed entirely by `emitHooks`. A future reader should NOT expect `seed-curation.json` to classify hooks.
    - **Guard scope** — `.claude/hooks` is already in `literal-allowlist.json` (raw `.mjs`/JSON, not Thrive-flavored prose); `path-guard` is NOT extended to hooks (they legitimately reference `.claude/hooks/` paths). `writeFileIfChanged` already produces drift entries in check mode, so `prism:check` covers hook drift; deeper drift-assertion work is Phase 4 remainder.
  - **Convergence confirmed:** the canonical `gates.json` carries the Stage-0 bootstrap paths, so the build's emission overwrote the human's tab-reindented manual grant with a byte-matching 2-space copy — `git diff .claude/hooks/gates.json` shows only the real may_write/may_not_run additions, `prism:check` reports no drift.
  - → no promotion needed (ticket-tactical build-pipeline wiring; pulls the Phase 4 split forward, which the Phase 4 remainder owns at epic scope).

---

## Implementation Tasks

Grouped by phase; persona ownership labeled per task. Phases 0–4 are largely sequential; Phases 5–6 are the parallelizable rollout. Each task is filed as (or under) a GitHub sub-issue by Nora.

### Phase 0 — Contract & schema foundations (no behavior change)

**Winston**
1. Write **ADR-0067** (`.prism/spec/adrs/_toolkit/0067-runtime-ratifies-verdicts.md`) — the inversion principle, channel-hardening, and the Briar ceiling caveat. Cite `report-back.md` and ADR-0011 (merge boundary).
2. Write the **gate-strength taxonomy** architect doc (`.prism/architect/_toolkit/enforcement-floor.md`) — the three classes, the universal contract+ownership primitives, what floor each class gets. Add a `manifest.json` route so personas load it.

**Clove**
3. Author the **report contract schema** at `.prism/references/enforcement/report-contract.md` (corrected from the prototype): JSON schema (`reasoning`, `persona`, `checklist`, `verdict`, `verdict_reason`, `next_route`, `payload`), reference validator, verdict enum matching `report-back.md` exactly (`done`/`needs-fix`/`blocked`/`needs-replan`/`needs-stronger-model`/`needs-human`). `next_route` is required and validated against the persona's allowed routes (derived from its `## Next persona` section).
4. Author the **gates.json schema** (structural shape only, no per-persona data yet): `<persona> → { writes_report_to, preconditions[], gates[], unverifiable_boxes[], ownership{ may_write[], may_not_run[] } }`. Document the `{{commands.*}}` token convention (resolved in Phase 3).

### Phase 1 — Floor primitive, proven on Clove solo

**Clove**
1. Implement `resolve-persona` helper (payload-first → file fallback per Decisions) used by both guard hooks.
2. Implement `ownership-guard.mjs` (`PreToolUse` on `Edit|Write|MultiEdit|Bash`): resolve persona, glob-match writes against `may_write`, substring-match Bash against `may_not_run`, exit 2 with a precise denial. Place in `.claude/hooks/` for dogfooding (pipeline integration is Phase 4).
3. Implement `evidence-ledger.mjs` (`PostToolUse` on `Bash`): read top-level `exit_code`/`tool_output`, append `{ ts, cmd, exit_code, runKey }` to `.prism/evidence/<runKey>/ledger.jsonl`.
4. Implement `run-gates.mjs` (`Stop` + `SubagentStop`): parse + shape-check `report.json` (including required `next_route` and the verdict↔route coherence check), check preconditions, run gates (fresh or ledger), reconcile claimed-vs-proven, exit 2 to force continue on false `done` or a missing/incoherent route, strike-count to 3, on cap re-inject the `needs-stronger-model` re-emit instruction, `stop_hook_active` backstop. Channel-hardening (no override file as routing input; `ratified-verdict.json` written as audit only).
5. Wire `.claude/settings.json`: the three hooks on their events (`PreToolUse`, `PostToolUse`, `Stop`+`SubagentStop`), `$CLAUDE_PROJECT_DIR` paths, `Stop` timeout covering the slowest fresh gate.
6. Populate `gates.json` for `clove` only (hardcoded commands acceptable here; tokenized in Phase 3): types/lint `fresh`, tests `ledger`; ownership `may_write: src/**, **/*.test.*, .prism/plans/**, .prism/evidence/**`, `may_not_run: gh pr merge, git merge, git push -f`.
7. Rewrite the Clove skill DoD section to the pointer form (DoD = `gates.json#clove`; final act = write `report.json`); add the startup persona-resolve line.

**Winston**
8. Author the **Phase 1 smoke test** spec (manual, in the plan): (a) force a false `done` with a failing test solo → confirm `Stop` blocks + re-injects the failing exit code; (b) attempt an out-of-lane write → confirm `ownership-guard` denies; (c) clean run → confirm ratify + stop. This is the Phase 1 exit gate.

### Phase 2 — Orchestration: SubagentStop + Sol

**Clove**
1. Validate `SubagentStop` fires `run-gates.mjs` under a real Sol dispatch of Clove; confirm `agent_type`/`agent_id` present in payload and resolver picks Clove.
2. Validate the park path end-to-end: 3 strikes → forced re-emit as `needs-stronger-model` → model's structured return carries it → Sol routes to `escalation.axis: model` (bump to opus). No code change to Sol's routing expected; confirm the existing table consumes it.
3. Validate fleet keying: two concurrent lanes, confirm `agent_id` keying prevents strike/ledger collision across lanes sharing a `session_id`.

**Winston**
4. Settle and document the report.json ↔ structured-return single-contract wiring in Sol's `lib/` (one reference line: "the verdict you route on is gate-ratified before return — trust it"). Confirm no ADR needed (per Decisions). Update `report-back.md` only if a citation is warranted.

#### Phase 2 (folded in) — Gate self-protection (closes the non-circumventability hole)

Winston designed; Clove implements. See the two `## Decisions` entries (gate non-circumventability; hook source/runtime split + edit-order). **Execute Tasks A–D in this exact order — the order is load-bearing.** The guard reads its const and `gates.json` fresh on every PreToolUse fire, so the denylist activates only after `ownership-guard.mjs` is saved; doing the protected-file writes first (while no denylist is active) then the guard edit last is the only order that doesn't deadlock on this branch.

**Clove**

A. **`gates.json#clove` ownership correction** (`.claude/hooks/gates.json`, the `clove.ownership.may_write` and `may_not_run` arrays). Do this FIRST, before touching `ownership-guard.mjs`.
   - In `may_write`: replace `".prism/evidence/**"` with `".prism/evidence/**/report.json"` (the persona writes only its own report under evidence; gate-state files are hook-written via Node `fs`, never persona-written — confirmed in `run-gates.mjs`/`evidence-ledger.mjs`).
   - In `may_write`: add `".ai-skills/hooks/**"` (Clove's lawful hook-authoring lane once the canonical-source split exists; harmless on this branch — no files there yet — and forward-correct).
   - In `may_write`: **leave `".claude/hooks/**"` and `".claude/settings.json"` in place** for this branch. Do NOT remove them — once the denylist lands (Task B), `gates.json` is protected and a later `may_write` edit would be denied. The denylist is the real guarantee; these entries become inert and are cleaned when the Phase 4 canonical split lands.
   - In `may_not_run`: add `"rm .prism/evidence"` and `"rm -rf .prism/evidence"` (closes the obvious shell-deletion vector for gate state). Confirm the substring match in `ownership-guard.mjs` `extractEffectiveCommand` covers `rm .prism/evidence/<runKey>/strikes.json` — `rm .prism/evidence` is a substring of it, and the multi-line scan (post-#298 fix) prevents a heredoc/line-2 smuggle.
   - Verification: `node .claude/hooks/__smoke__/run-all.mjs` still passes after this edit (no denylist active yet, so existing behavior unchanged).

B. **Smoke harness additions** (`.claude/hooks/__smoke__/`, exact file is Clove's call — likely `run-all.mjs` as new scenarios). Do this SECOND, still before `ownership-guard.mjs`. Author the assertions now so they exist before the guard edit makes `__smoke__/` writes deny-adjacent (they won't — `__smoke__/` is not protected — but authoring before the guard edit keeps the branch's hook-writes batched). Each assertion PASS-iff:
   - `ownership-guard` denies a Clove `Write`/`Edit` to `.claude/hooks/run-gates.mjs` → exit 2, stderr names enforcement-runtime protection. (This is the incident, now blocked.)
   - `ownership-guard` denies a Clove `Write` to `.claude/hooks/gates.json` → exit 2.
   - `ownership-guard` denies a Clove `Write` to `.prism/evidence/smoke/strikes.json` → exit 2.
   - `ownership-guard` denies a Clove `Write` to `.prism/evidence/smoke/ledger.jsonl` → exit 2.
   - `ownership-guard` denies a Clove `Write` to `.prism/evidence/smoke/ratified-verdict.json` → exit 2.
   - `ownership-guard` PERMITS a Clove `Write` to `.prism/evidence/smoke/report.json` → exit 0 (the carve-out — the report channel is intact).
   - `ownership-guard` PERMITS a Clove `Write` to `.claude/hooks/__smoke__/anything.mjs` → exit 0 (smoke tests are not protected — Clove can still adjust coverage).
   - `ownership-guard` denies a Clove `Bash` `rm .prism/evidence/smoke/strikes.json` → exit 2, stderr names the prohibition.
   - Negative control: `ownership-guard` PERMITS a Clove `Write` to `src/index.ts` → exit 0 (denylist is selective, not universal).
   - These assertions will FAIL until Task C lands (the denylist doesn't exist yet) — that's expected; they pass after C. Run them as the verification for C, not B.

C. **Protected-paths denylist in `ownership-guard.mjs`.** Do this LAST among hook writes — once saved, the denylist is live and further `.claude/hooks/` writes (except `__smoke__/`) are denied.
   - Add a module-level const after the imports (~line 26):
     ```js
     // Paths no persona may write via tools, regardless of its may_write lane.
     // The enforcement runtime and gate state — a gated party editing or resetting
     // the runtime that gates it would void the floor's guarantee (ADR-0067 §
     // gate non-circumventability). The evidence carve-out permits the one file the
     // persona legitimately writes: its own report.json.
     const PROTECTED_WRITE_PATHS = [
       '.claude/hooks/run-gates.mjs',
       '.claude/hooks/ownership-guard.mjs',
       '.claude/hooks/evidence-ledger.mjs',
       '.claude/hooks/lib/resolve-persona.mjs',
       '.claude/hooks/gates.json',
       '.claude/settings.json',
     ];
     const PROTECTED_EVIDENCE_BASENAMES = ['strikes.json', 'ledger.jsonl', 'ratified-verdict.json'];
     ```
     Note: list the enforcement files by path, NOT the `.claude/hooks/` directory — `__smoke__/` and future non-enforcement files under the dir must stay writable. If `lib/` grows more enforcement modules, add them here (a `.claude/hooks/lib/` prefix match is acceptable since everything in `lib/` is enforcement code — Clove's call between exact-paths and a `lib/` prefix; document whichever).
   - In the `writeTools` branch, AFTER `normalizedPath` is computed (~line 100) and BEFORE the `may_write` `allowed` check (~line 102), insert the protection check. Logic, stated so two implementers produce identical behavior:
     - If `normalizedPath` exactly equals any `PROTECTED_WRITE_PATHS` entry (or, for the `lib/` form, starts with `.claude/hooks/lib/`) → deny (exit 2). stderr: names it enforcement-runtime-protected; instructs to author hook changes in `.ai-skills/hooks/` (canonical source), which the build emits here.
     - Else if `normalizedPath` starts with `.prism/evidence/` AND `path.basename(normalizedPath)` is in `PROTECTED_EVIDENCE_BASENAMES` → deny (exit 2). stderr: gate state is hook-written; the persona's only writable evidence file is `report.json`.
     - Else (including `.prism/evidence/<runKey>/report.json`) → fall through to the existing `may_write` check unchanged.
   - The denylist check is global — runs for every resolved persona, before `may_write`, with NO per-persona exception path. Do not gate it behind a persona check; that's the override path the design forbids.
   - Verification: `node .claude/hooks/__smoke__/run-all.mjs` — all Task B assertions now pass; all pre-existing scenarios (A, B, B.5, B.6, C, D) still pass. Then `node .claude/hooks/__smoke__/fleet-keying.mjs` (3/3). Then `pnpm prism:crossref-lint` clean.

D. **Schema-doc description** — already applied by Winston to `.prism/references/enforcement/gates.json` (`OwnershipMatrix.may_write` description). Clove: no edit needed; named here so the task set is complete. If Clove's implementation diverges from the description (e.g. chooses the `lib/` prefix form), update the description to match — it must describe the shipped behavior.

### Phase 3 — Command tokenization seam (reuse, don't duplicate)

**Clove**
1. Add a `commands` map to `config.json` (typecheck/test/lint/format/build) and its schema to `config.schema.json`.
2. Convert `gates.json#clove` commands to `{{commands.*}}` tokens; implement token resolution in `run-gates.mjs` (resolve before execute and before ledger lookup, so ledger matches resolved strings).
3. Reshape `verification-commands.md` to render from the `config.json` data (single source).

**Atlas** (skill update)
4. Add a step to populate the `config.json` `commands` map during onboarding from detected stack.

### Phase 4 — Build pipeline integration + seed-twin + guards

**Clove**
1. Add a hooks/settings emission target to `scripts/ai-skills/build.ts`: canonical source for `*.mjs` hooks + `settings.json` compiles/copies into `.claude/` (and `.codex/` iff Codex hook support exists), and into `templates/install/`.
2. Bring `gates.json` into canonical source; classify it + the hooks + `settings.json` in `seed-curation.json` (curated vs excluded) with seed-twin discipline.
3. Extend `prism:check`: drift detection covers the new emitted file types; update `literal-guard` / `path-guard` scopes so hooks and gates are scanned.

### Phase 5 — Roster rollout: ownership + gate specs for all personas

**Clove** (parallelizable; one sub-issue per small batch)
1. Author `gates.json` ownership matrices for **every** persona (universal) + class-appropriate gates: Class A full evidence gates; Class B procedural/structural preconditions + coherence checks; Class C ownership + contract only.
2. Per persona, verify the ownership globs against the actual skill body (the accuracy check) — `may_write` must match what the skill genuinely writes; `may_not_run` must encode real boundaries (e.g. Eric/Sol never `gh pr merge`; reviewers `may_write` plan-only).
3. Add the startup persona-resolve line + DoD-pointer rewrite to each persona skill body (the floor half; the prose half is Phase 6).
4. **(From Phase 2 review — Cleanup Items § Phase 5 follow-ons, item 2)** Harden `may_not_run` for Bash redirect-write patterns targeting protected paths (`"> .claude/hooks"`, `"tee .claude/hooks"`, etc.) or add a path-prefix scan in `extractEffectiveCommand` before permitting Bash calls to protected paths.
5. **(From Phase 2 review — Cleanup Items § Phase 5 follow-ons, item 3)** Add `"rm -f .prism/evidence"`, `"rm -fr .prism/evidence"`, and `"rm --force .prism/evidence"` to `gates.json` `may_not_run` for each persona that owns evidence writes. Must go through canonical-source split (Phase 4 prerequisite).

**Winston** (Phase 5 architectural scoping)
6. **(From Phase 2 review — Cleanup Items § Phase 5 follow-ons, item 1)** Scope the `active-persona` write fix: either (a) a SessionStart hook that writes the file only when `agent_type` is absent from the payload (solo-only write), or (b) remove the write from Clove's DoD startup procedure entirely and confirm the payload-first resolver handles all dispatch modes without it. A skill-prose conditional is not acceptable (fails the factual-grounding bar). Verify the resolver Decision ("file path stays single-writer by construction; do not use it in the orchestrated path") is faithfully implemented after the fix.

### Phase 6 — Ceiling-prose pass: procedural & accurate, persona by persona

**Clove + owning-persona review** (parallelizable; one sub-issue per persona)
1. Rewrite each skill body so vague judgment lines become **named procedures with typed escapes** (the `prism-code-dev-senior.md` pattern): precise trigger + sanctioned exit verdict per procedure. Hold every line to the **factual-grounding bar** (see Decisions) — each procedure maps to a real action; the trigger calibrates reasoning depth; the escape prevents loops. Goal (Hunter's words): every persona is "procedural and accurate to its job."
2. Apply `skill-authoring.md` disclosure gate during each rewrite — PIN lenses, externalize modes/conditional procedures, do not bloat the body. The ceiling pass sharpens; it must not flatten the importance hierarchy.
3. Include the 3 utilities in this pass (prose only — no gates entry).

---

### Issue #300 — Gate-fix + canonical-source split (pull Phase 4 split forward; fix the two gate bugs)

Branch `hmcgrew/issue-300-gate-fix-canonical-split` (under epic #289). This block pulls the Phase 4 canonical-source/build-emit split forward because three things now depend on it: (1) the two gate bugs must be fixed in canonical source and emitted to the runtime (the runtime `.claude/hooks/` is denylist-protected, so it can't be hand-edited by a gated persona); (2) the Phase 5 follow-ons that touch `gates.json` were blocked on the split; (3) the bootstrap edit-order below only resolves once the build emits hooks.

**Execute the Stages in order. Stage 0 is `[HITL]` and blocks everything else. Within Stage 2, the canonical-source authoring precedes the build run, which precedes the runtime cutover — that ordering is load-bearing for the same reason the Phase 2 A–D order was (the live denylist activates the moment the new `ownership-guard.mjs` lands at runtime).**

Winston designed; Clove implements. The full mechanism designs are in `## Decisions` (Issue #300 entries): the bootstrap edit-order, the Bug 1 stateful-acceptance design, the Bug 2 baseline-tolerance design, and the active-persona orchestrated-write denial.

---

#### Stage 0 — Bootstrap unlock (the one irreducible human edit)

**Human (`[HITL]`)** — see Decision "Issue #300 bootstrap edit-order." This is the single edit a gated Clove cannot perform on itself, because it grants build-pipeline paths into Clove's `may_write`, and that grant lives in the denylist-protected runtime `.claude/hooks/gates.json`. The Bash-redirect bypass that *could* circumvent the denylist is itself a bug being fixed in this same block (finding 5) — it must NOT be exploited to self-bootstrap.

1. **[HITL] Human adds the bootstrap paths to the RUNTIME `gates.json#clove.may_write`** (`.claude/hooks/gates.json`, the `clove.ownership.may_write` array). Add exactly these two entries:
   - `"scripts/ai-skills/build.ts"`
   - `".ai-skills/definitions/**"`

   Why a human: the denylist (`PROTECTED_WRITE_PATHS` in `ownership-guard.mjs`) denies any persona Edit/Write to `.claude/hooks/gates.json`. A human running raw tools is not gated by the denylist (the guard resolves a persona only for a gated dispatch). One edit, two array entries, no other change. After this edit, `node .claude/hooks/__smoke__/run-all.mjs` must still pass (7/7) — the grant is additive and changes no existing behavior. **This grant becomes permanent and build-managed in Stage 2** (the canonical `.ai-skills/hooks/gates.json` carries the same two entries, so the build's emission overwrites the runtime gates.json with a copy that already has them — converging the manual edit with the build output, no drift).

   Verification: `git diff .claude/hooks/gates.json` shows only the two added `may_write` lines; `node .claude/hooks/__smoke__/run-all.mjs` exits 0.

---

#### Stage 1 — Author canonical source with all fixes (fully in Clove's lane)

All Stage 1 writes land under `.ai-skills/hooks/**` and `.ai-skills/skills/prism-code-dev/**`, both already in Clove's `may_write` and neither denylist-protected. The runtime is untouched in Stage 1, so the live (still-buggy) gate Clove runs under does not change yet — that is fine; Stage 1 only authors canonical source.

2. **Create the canonical hooks tree by copying the current runtime hooks into `.ai-skills/hooks/`.** Create these files with the EXACT current content of their `.claude/hooks/` counterparts as the starting point (subsequent tasks edit the canonical copies, not the runtime):
   - `.ai-skills/hooks/run-gates.mjs` ← copy of `.claude/hooks/run-gates.mjs`
   - `.ai-skills/hooks/ownership-guard.mjs` ← copy of `.claude/hooks/ownership-guard.mjs`
   - `.ai-skills/hooks/evidence-ledger.mjs` ← copy of `.claude/hooks/evidence-ledger.mjs`
   - `.ai-skills/hooks/lib/resolve-persona.mjs` ← copy of `.claude/hooks/lib/resolve-persona.mjs`
   - `.ai-skills/hooks/gates.json` ← copy of `.claude/hooks/gates.json`
   - `.ai-skills/hooks/__smoke__/run-all.mjs` ← copy of `.claude/hooks/__smoke__/run-all.mjs`
   - `.ai-skills/hooks/__smoke__/fleet-keying.mjs` ← copy of `.claude/hooks/__smoke__/fleet-keying.mjs`
   - **`settings.json` decision:** do NOT move `settings.json` into `.ai-skills/hooks/`. The settings file wires hook *paths* that are platform-specific (`$CLAUDE_PROJECT_DIR/.claude/hooks/...`). Keep the canonical settings concern out of this block — the build's hooks emission (task 9) targets `.claude/hooks/` only, and `.claude/settings.json` stays a hand-maintained runtime file on this branch (it already points at `.claude/hooks/`, which the build now keeps in sync). Record this in the Decision; a future phase can canonicalize `settings.json` if Codex hook parity lands. Verification: content-only; no build effect yet.
   - **`__smoke__/` decision:** canonical source IS the home for the smoke harness going forward (it gates the hooks). The build emits `.ai-skills/hooks/__smoke__/` → `.claude/hooks/__smoke__/` alongside the `.mjs` hooks. State this in the Decision.

3. **Bug 1 fix — stateful accept-on-re-emit at the cap.** Edit `.ai-skills/hooks/run-gates.mjs` (the canonical copy from task 2). Mechanism per Decision "Issue #300 Bug 1." Exact changes:
   - In `injectNeedsStrongerModel` (the function near the bottom, currently writing the audit artifact then exiting 2), **write the `capped` flag to `strikes.json` before exiting.** Replace the body's audit-write line `writeAuditArtifact(evidenceDir, runKey, persona, null, [], STRIKE_CAP);` with a sequence that first persists the cap state: add `writeStrikeFile(path.join(evidenceDir, 'strikes.json'), STRIKE_CAP, runKey, true);` immediately before the `writeAuditArtifact(...)` call. (The fourth arg `true` is the new `capped` flag — see the `writeStrikeFile` change below.)
   - **Extend `writeStrikeFile` to persist `capped`.** Change its signature from `writeStrikeFile(strikeFile, count, runKey)` to `writeStrikeFile(strikeFile, count, runKey, capped = false)` and change the written object to `{ count, runKey, capped, ts: new Date().toISOString() }`. The existing call sites that pass three args keep `capped: false` via the default — no behavior change for them.
   - **Read `capped` when loading the strike counter.** In the strike-counter load block (the `try { ... readFileSync(strikeFile) ... }` near the top), after parsing `strikes`, also read `const capped = strikes.capped === true;` and hold it in an outer-scope variable `let gateForcedPark = false;` set to `capped`. On the ENOENT/corruption branches, leave `gateForcedPark = false`.
   - **Thread `gateForcedPark` into shape validation.** Change the `validateShape(reportPath, entry.allowed_routes ?? [])` call to `validateShape(reportPath, entry.allowed_routes ?? [], gateForcedPark)`. Update `validateShape`'s signature to `validateShape(reportPath, allowedRoutes, gateForcedPark = false)` and pass `gateForcedPark` into the `isCoherent` call inside it: `isCoherent(report.verdict, report.next_route, allowedRoutes, gateForcedPark)`.
   - **Accept the gate-forced verdict in `isCoherent`.** Change `isCoherent(verdict, nextRoute, allowedRoutes)` to `isCoherent(verdict, nextRoute, allowedRoutes, gateForcedPark = false)`. Replace the `needs-stronger-model` rejection with the conditional acceptance:
     ```js
     function isCoherent(verdict, nextRoute, allowedRoutes, gateForcedPark = false) {
       const constraint = VERDICT_ROUTE_CONSTRAINTS[verdict];
       // needs-stronger-model is gate-injected only. A strike-0 self-claim is still
       // rejected (gateForcedPark is false). But once the gate has FORCED the park
       // (capped flag set by injectNeedsStrongerModel), the model's re-emit of exactly
       // this verdict routed back to its own persona key is the sanctioned exit — accept
       // it so the stop is allowed and the verdict reaches Sol. See ADR-0067 § channel-
       // hardening and Debugged Issues → strike-cap coherence deadlock.
       if (constraint?.gateInjected) {
         return gateForcedPark && nextRoute === resolvedPersonaKey;
       }
       if (constraint?.allowed) return constraint.allowed.includes(nextRoute);
       return allowedRoutes.includes(nextRoute);
     }
     ```
     `resolvedPersonaKey` is the `persona` value already resolved at the top of the script (`const { persona } = resolved;`). `persona` is module-scope and `isCoherent` is a module-scope function in the same file, so the simplest correct form is to reference `persona` directly inside `isCoherent` (a closure over the module binding) — no param threading needed for the persona key. Thread only `gateForcedPark` through `validateShape` → `isCoherent` (that one IS local to the per-fire state). If Clove prefers an explicit param over the closure for testability, add a `personaKey` param and pass `persona` — document whichever. The required behavior, stated so two implementers produce identical results: a `needs-stronger-model` report passes coherence **iff** `gateForcedPark === true` AND `next_route === persona`. A self-claim at strike 0 (`gateForcedPark === false`) fails. A gate-forced re-emit routed to the wrong persona fails.
   - **Allow the stop on the accepted re-emit.** Trace the control flow after the fix: on the re-emit pass, `strikeCount` loads as `STRIKE_CAP` and `gateForcedPark` is `true`; `validateShape` now returns `{ ok: true, report }` (coherence passes); execution proceeds past the shape-fail branch to preconditions and gates. **Guard against re-striking the gates on the park pass:** after `validateShape` succeeds AND `report.verdict === 'needs-stronger-model'` AND `gateForcedPark`, SKIP the evidence-gate reconciliation and allow the stop directly — write the audit artifact and `process.exit(0)`. Add this as an early block immediately after `const report = shapeResult.report;`:
     ```js
     // Gate-forced park accepted: the cap already fired and the model re-emitted the
     // forced verdict. Re-running gates here would re-fail and re-strike a verdict the
     // gate itself demanded. Allow the stop; carry needs-stronger-model to Sol.
     if (report.verdict === 'needs-stronger-model' && gateForcedPark) {
       writeAuditArtifact(evidenceDir, runKey, persona, report, [], STRIKE_CAP);
       process.exit(0);
     }
     ```
   - Verification (deterministic, via the smoke harness extended in task 7): a 4th invocation after the 3-strike cap, with `report.json` re-emitting `needs-stronger-model` + `next_route: clove`, exits **0**; a separate strike-0 self-claim of `needs-stronger-model` exits **2**.

4. **Bug 2 fix — baseline-regression tolerance for `fresh` gates.** Edit `.ai-skills/hooks/run-gates.mjs` and `.ai-skills/hooks/ownership-guard.mjs` (canonical copies). Mechanism per Decision "Issue #300 Bug 2." The fix strikes only on a regression the persona caused, never on inherited env state, and never reopens the floor (a genuine claimed regression with a clean baseline still strikes).
   - **Capture the baseline in `ownership-guard.mjs`'s first write-tool fire.** In the `writeTools.has(toolName)` branch, AFTER all the protection/`may_write` checks pass and BEFORE the final `process.exit(0)`, add a one-time baseline capture: if `.prism/evidence/<runKey>/baseline.json` does not exist, run each `fresh`-source gate command from the persona's `gates.json` entry once, record `{ [gateId]: exitCode }`, and write `baseline.json`. Key by `runKey = payload.agent_id ?? payload.session_id`. This fires on the FIRST write the persona makes — the earliest reliable pre-mutation point (PreToolUse fires before the write executes, so the tree is still in its starting state for the first write). Guard it so it runs exactly once per runKey (the `existsSync(baselinePath)` check). Make the capture non-fatal (wrap in try/catch; a capture failure leaves `baseline.json` absent, which the gate handles per the fallback below). Run the gate commands with `spawnSync(cmd, { shell: true, cwd: projectDir, timeout: 120000 })` — same invocation shape as `runCheck`.
     - **Why the guard, not a new SessionStart hook:** a dedicated `SessionStart` capture hook does not reliably fire pre-work for subagents (the plan's own field-shape notes flag subagent event timing as unconfirmed). The first-write PreToolUse fire is reliable across solo and fleet because PreToolUse always fires. Record this tradeoff in the Decision.
   - **Consult the baseline in `run-gates.mjs` reconciliation.** In the gate loop, change the strike condition for `fresh`-source gates. Currently `if (claimed && !result.passed) { gateFailures.push(...) }`. Replace with: a claimed-true fresh gate that fails now strikes ONLY IF the baseline for that gate passed (exit 0) — i.e. a regression. If the baseline failed (pre-existing) OR no baseline exists, downgrade to the existing non-blocking warning path (the same `process.stderr.write` warning shape used for unclaimed-failing gates) instead of striking. Exact logic:
     ```js
     // Load baseline once before the gate loop.
     let baseline = {};
     try {
       baseline = JSON.parse(readFileSync(path.join(evidenceDir, 'baseline.json'), 'utf8'));
     } catch { baseline = {}; }  // absent/corrupt → no regression provable → don't strike fresh gates
     // ... inside the gate loop, for each gate:
     if (claimed && !result.passed) {
       const isFresh = gate.source !== 'ledger';
       const baselinePassed = baseline[gate.id] === 0;
       if (isFresh && !baselinePassed) {
         // Pre-existing failure (baseline also failed) or no baseline — not this
         // persona's regression. Surface, do not strike. ADR-0067 reconciles change.
         process.stderr.write(
           `[run-gates] Note: gate '${gate.id}' fails, but it also failed at dispatch ` +
           `baseline (pre-existing, not your regression) — not counted as a strike.\n`
         );
       } else {
         // Regression (baseline passed, now fails) OR a ledger gate (persona's own
         // recorded failure) — strike.
         gateFailures.push({ gate, result });
       }
     }
     ```
     - **`ledger` gates are unchanged** — the `tests` gate is `source: ledger` and already strikes only on the persona's own recorded command failures (a regression proxy). The `isFresh` guard leaves ledger gates striking exactly as today.
   - Verification (deterministic, via smoke task 7): a `fresh` gate whose baseline recorded a non-zero exit (pre-existing failure), claimed true, fails now → exit 0 or non-blocking note, NO strike. Positive control: same gate with baseline exit 0 (clean) that now fails → strike (exit 2).

5. **Finding 4 — active-persona orchestrated-write denial.** Edit `.ai-skills/hooks/ownership-guard.mjs`. Mechanism per Decision "Issue #300 active-persona." Do NOT remove the skill-prose write (removing it breaks solo gating — the solo resolver reads the file). Instead, make the orchestrated write impossible at the guard:
   - In the `writeTools.has(toolName)` branch, after `normalizedPath` is computed and BEFORE the `may_write` check, add: if `normalizedPath === '.prism/active-persona'` AND `payload.agent_type` is present (orchestrated dispatch), deny (exit 2) with stderr naming that the file is solo-path-only and the orchestrated resolver reads `agent_type` from the payload, not the file. If `agent_type` is absent (solo), fall through (permit) — the skill-prose write lands and the solo resolver reads it correctly.
   - This directly implements the resolver Decision ("do not use the file in the orchestrated path") as a structural guard rather than prose the model can't reliably honor. It also kills the fleet race (two Clove subagents both have `agent_type`, so both are denied the write).
   - Verification (smoke task 7): a Write to `.prism/active-persona` with `agent_type: prism-code-dev` in payload → exit 2; the same Write with NO `agent_type` → exit 0.

6. **Findings 5 + 6 — close the Bash-path bypasses.** Edit `.ai-skills/hooks/ownership-guard.mjs` and `.ai-skills/hooks/gates.json`. Mechanism per Decision "Issue #300 Bash-path hardening."
   - **Finding 5 (redirect/copy/sed write to protected paths via Bash).** In the Bash branch (after `extractEffectiveCommand`, after the `may_not_run` check, before the `process.exit(0)`), add a protected-path write scan. If the effective command contains a mutation operator (any of `>`, `>>`, ` tee `, `cp `, `mv `, `sed -i`, `dd `) AND also contains any string from `PROTECTED_WRITE_PATHS` OR the `PROTECTED_LIB_PREFIX` OR a `.prism/evidence/` path ending in a `PROTECTED_EVIDENCE_BASENAMES` value, deny (exit 2) with stderr naming the enforcement-runtime protection and pointing at canonical `.ai-skills/hooks/`. Implement as a helper `commandWritesProtectedPath(effectiveCmd)` returning the matched path or null; deny on non-null. Conservative-by-design: a false positive (denying a benign command that mentions a protected path next to a `>`) is acceptable — the persona authors hooks in canonical source, never via Bash redirect to the runtime.
   - **Finding 6 (`rm -f`/`-fr`/`--force` evidence deletion).** Two parts:
     - In canonical `.ai-skills/hooks/gates.json#clove.may_not_run`, add `"rm -f .prism/evidence"`, `"rm -fr .prism/evidence"`, `"rm --force .prism/evidence"` (alongside the existing `"rm .prism/evidence"`, `"rm -rf .prism/evidence"`).
     - Parsing improvement (robust form) in `extractEffectiveCommand` or a sibling `rm`-normalizer: when an effective command token is `rm` followed by any flags and a path under `.prism/evidence/`, treat it as a forbidden evidence deletion regardless of flag form. Specify as: a helper `commandDeletesEvidence(effectiveCmd)` that matches `/\brm\b[^\n]*\.prism\/evidence\//` and returns true; deny in the Bash branch if true. This closes the variant-flag gap structurally; the explicit `may_not_run` strings remain as the declarative floor.
   - Verification (smoke task 7): `echo x > .claude/hooks/run-gates.mjs` → exit 2; `tee .claude/hooks/gates.json` → exit 2; `sed -i s/a/b/ .claude/hooks/ownership-guard.mjs` → exit 2; `rm -f .prism/evidence/smoke/strikes.json` → exit 2; `rm --force .prism/evidence/smoke/ledger.jsonl` → exit 2; negative control `echo x > src/foo.ts` → exit 0; negative control `rm src/foo.ts` → exit 0.

7. **Close the smoke gap — author the new scenarios in the canonical `__smoke__/`.** Edit `.ai-skills/hooks/__smoke__/run-all.mjs` (canonical). Add scenarios (Clove picks exact sub-test IDs; these are the required PASS-iff assertions):
   - **Scenario F — accept-on-re-emit at the cap (the gap that hid Bug 1).** Setup as Scenario D (strikes pre-seeded to 2, failing gate) but run a **4th** invocation: after the 3rd (cap) invocation, rewrite `report.json` with `verdict: "needs-stronger-model"`, `next_route: "clove"`, and assert the 4th invocation exits **0** (stop allowed), and `ratified-verdict.json` records `verdict: needs-stronger-model`. Negative control F.neg: a fresh runKey at strike 0 with `report.json` self-claiming `verdict: "needs-stronger-model"`, `next_route: "clove"` → exit **2** (self-claim rejected; `capped` not set).
   - **Scenario G — Bug 2 baseline tolerance.** G.a (pre-existing): pre-seed `baseline.json` with `{ "types": 1 }` (baseline failed), a `fresh` `types` gate whose command exits 1, `report.json` claims `types: true` → exit **0** or non-blocking note, NO strike written. G.b (regression positive control): pre-seed `baseline.json` with `{ "types": 0 }` (baseline clean), same failing gate, claim `types: true` → exit **2**, strike written.
   - **Scenario H — active-persona orchestrated-write denial (finding 4).** H.a: Write to `.prism/active-persona` with `agent_type: prism-code-dev` → exit **2** (orchestrated denial), stderr names the solo-path-only constraint. H.b: same Write but solo — NO `agent_type` in payload, and seed `<projectDir>/.prism/active-persona` with `clove` so the resolver's solo path resolves Clove (otherwise the resolver returns null → guard exits 0 as non-gated, which would pass H.b for the wrong reason). H.b asserts exit **0** with a resolved Clove persona (the solo write is permitted). To distinguish a real permit from a non-gated bypass, H.b also confirms an out-of-lane Write in the same solo payload IS denied (exit 2) — proving the persona resolved and the guard is active, so H.b's exit 0 is a genuine permit of the active-persona write, not a non-gated no-op.
   - **Scenario I — Bash-path protected-write + rm-variant denial (findings 5–6).** I.a `echo x > .claude/hooks/run-gates.mjs` → exit 2; I.b `tee .claude/hooks/gates.json` → exit 2; I.c `sed -i ... .claude/hooks/ownership-guard.mjs` → exit 2; I.d `rm -f .prism/evidence/smoke/strikes.json` → exit 2; I.e `rm --force .prism/evidence/smoke/ledger.jsonl` → exit 2; I.f negative `echo x > src/foo.ts` → exit 0; I.g negative `rm src/foo.ts` → exit 0.
   - Verification: `node .ai-skills/hooks/__smoke__/run-all.mjs` passes all scenarios (existing A,B,B.5,B.6,C,D,E + new F,G,H,I); `node .ai-skills/hooks/__smoke__/fleet-keying.mjs` still 3/3. (These run against the CANONICAL hooks in Stage 1; after Stage 2 they also run against the emitted runtime copies.)

---

#### Stage 2 — Teach the build to emit hooks; cut the runtime over

Stage 2 needs `scripts/ai-skills/build.ts` and `.ai-skills/definitions/**` writable — granted by Stage 0. **The build run (task 9) precedes the runtime cutover; the moment the emitted `ownership-guard.mjs` lands at `.claude/hooks/`, the new denylist + Bash-path scan are LIVE.** Author tasks 8 in canonical/build files (not denylist-protected), then run the build, then verify.

8. **Add a hooks emission target to `scripts/ai-skills/build.ts`.** The build currently mirrors `.prism/` content areas (`COPIED_CONTENT_AREAS`) to platform dirs; it does NOT emit `.ai-skills/hooks/`. Add a new emission step. Per the Open Question default path, scope emission to `.claude/` + `templates/install/` ONLY — do NOT emit `.codex/` (gate that behind confirmed Codex hook parity).
   - Add a function `emitHooks(repoRoot, checkMode, changedPaths)` that recursively copies `.ai-skills/hooks/**` (the `.mjs` files, `lib/`, `gates.json`, `__smoke__/`) → `.claude/hooks/**`, preserving subdirectory structure, using `writeFileIfChanged` (so `prism:check` reports drift and build is idempotent). Hooks are NOT token-substituted and NOT dialect-transformed — copy raw bytes (they are runtime `.mjs`/JSON, not skill prose). Call `emitHooks` from `main()` after the platform content-copy block (near the `writeSeedMirror` call).
   - Emit the hooks into the install seed too: copy `.ai-skills/hooks/**` → `templates/install/.claude/hooks/**` (raw bytes). **Seed-twin discipline:** the hooks are runtime code the consumer needs, so they are seeded (curated), NOT excluded. But the `__smoke__/` harness is dogfood test tooling — decide per `seed-curation.json` whether consumers get the smoke tests; default: seed the `.mjs` hooks + `gates.json` + `lib/`, and seed `__smoke__/` too (a consumer who edits hooks benefits from the harness). State the call in the Decision.
   - **Classify in `seed-curation.json`:** the enforcement *reference* files (`references/enforcement/report-contract.md`, `references/enforcement/gates.json`) are already `excluded[]` (the Review Issue that pulled forbidden ADR refs out of the seed). The emitted runtime hooks live under `.claude/hooks/`, which is OUTSIDE the `COPIED_CONTENT_AREAS` (`.prism/` areas) that `seed-curation.json` governs — so they are NOT covered by the existing curation classification. The hooks-emission seed copy is governed by the new `emitHooks` logic, not `writeSeedMirror`. Confirm `checkSeedDrift`/`writeSeedMirror` do not trip on the new `.claude/hooks/` seed files (they iterate `COPIED_CONTENT_AREAS` only — `.claude/hooks/` is not among them, so no interaction). Document this boundary in the Decision so a future reader doesn't expect `seed-curation.json` to classify hooks.
   - **Extend the guards' scope.** `literal-guard`/`leftover-token-guard`/`path-guard` run over the platform content copies. The emitted `.claude/hooks/` files are raw `.mjs`/JSON, not tokenized skill prose — they should NOT be literal-guarded as Thrive-flavored prose (the literal-allowlist was already updated to exempt `.claude/hooks` per the Phase 1 history). Confirm the emitted hooks are either outside the guard roots or allowlisted; if `emitHooks` writes into a guarded root, add `.claude/hooks/**` to the literal-allowlist (it likely already is — verify against `.ai-skills/definitions/literal-allowlist.json`). Do NOT extend `path-guard` to hooks (path-guard enforces `.prism/<area>/` references in canonical *content*; hooks reference `.claude/hooks/` paths legitimately). State this scoping call in the Decision. If extending `prism:check` drift detection to the emitted hooks is not load-bearing for THIS block (the `writeFileIfChanged` in `emitHooks` already produces drift entries in check mode), note that the Phase 4 remainder owns any deeper drift-assertion work.
   - Verification: `pnpm prism:build` emits `.ai-skills/hooks/**` → `.claude/hooks/**` and `templates/install/.claude/hooks/**`; `pnpm prism:check` passes (no drift after a clean build); `pnpm run prism:check-types` is unaffected (hooks are `.mjs`, outside the `scripts/ai-skills/tsconfig.json` scope).

9. **Run the build and cut the runtime over.** `pnpm prism:build`. This emits the canonical hooks (now carrying all Stage-1 fixes AND the expanded `may_write` including the Stage-0 bootstrap paths) → `.claude/hooks/`. **At this moment the new `ownership-guard.mjs` (with the Bash-path scan + active-persona denial) and the fixed `run-gates.mjs` go live.** The runtime `gates.json` is overwritten with the canonical copy, which already contains `scripts/ai-skills/build.ts` + `.ai-skills/definitions/**` (matching the human's Stage-0 edit) plus the `rm -f`/`--force` `may_not_run` additions — so the human's manual grant and the build output converge with zero drift.
   - After this, the runtime is build-managed: any further hook change goes canonical → `pnpm prism:build` → runtime. Never hand-edit `.claude/hooks/` again (the denylist enforces this for gated personas; the build is the lawful path).
   - Verification: `node .claude/hooks/__smoke__/run-all.mjs` (emitted runtime copy) passes all scenarios including the new F/G/H/I; `node .claude/hooks/__smoke__/fleet-keying.mjs` 3/3; `pnpm prism:check` clean; `git diff .claude/hooks/gates.json` shows the build-emitted copy matches canonical (bootstrap paths present, no manual-vs-build drift).

10. **Mark the now-resolved Phase 5 follow-ons and Debugged Issues.** Content-only edits to this plan (`.prism/plans/**`, in Clove's lane):
    - In `## Debugged Issues`, flip both entries (strike-cap coherence deadlock; pre-existing-failure intolerance) `Status: open` → `Status: fixed`, adding a one-line `Fixed in:` note citing Issue #300 Stage 1 tasks 3–4.
    - In `## Cleanup Items` § Phase 5 follow-ons, mark items 2 (Bash redirect bypass) and 3 (`rm -f` variants) resolved by Issue #300 findings 5–6, and item 1 (active-persona) resolved by finding 4 — these no longer wait for Phase 5.
    - In `## Review Issues`, flip the three deferred entries (`Bash redirect-write bypasses protected-paths denylist`; `rm -f variant bypasses may_not_run`; `active-persona unconditional startup write`) `Status: deferred` → `Status: fixed` with the Issue #300 citation. (The active-persona *unconditional startup write* entry: the skill-prose write stays, but finding 4's guard denial makes it harmless under orchestration — note this resolution precisely so the record isn't misread as "the write was removed.")
    - Verification: content-only, no build effect.

---

## Phase 1 Smoke Test

**This section is the Phase 1 exit gate (task 8).** It defines the acceptance bar Clove's hooks (tasks 1–7) must satisfy before Phase 1 is done. It goes first so the build targets a fixed bar — plan-before-building: the verification path is specified before the implementation.

### Two execution forms per scenario — which is the gate

Each scenario below is specified in two forms because these hooks fire on real Claude Code events, and a live session cannot deterministically reproduce "the model decides to lie about `done`":

- **(unit) Direct-invocation form — THIS IS THE AUTOMATABLE EXIT GATE.** Pipe a hand-built mock payload (JSON on stdin, matching the confirmed Claude Code payload field shapes below) to the `.mjs` script, then assert the **exit code** and a **stderr substring**. Headless, deterministic, reproducible across runs and models, CI-runnable. This is what "Phase 1 passes" means.
- **(manual) End-to-end form — HUMAN CONFIRMATION, NOT THE GATE.** What Hunter runs in a live Claude Code session to confirm the hook is actually *wired* on the real event (the unit form proves the script's logic; the manual form proves `settings.json` fires it). Pass/fail is observed by the human; it is not part of the automated gate.

The unit form is load-bearing because it is the only form that reproduces deterministically. The manual form catches wiring mistakes the unit form cannot (wrong event name in `settings.json`, wrong path, timeout too short).

### Confirmed payload field shapes (use these exact field names in mock payloads)

Verified against the Claude Code hook docs (`code.claude.com/docs/en/hooks`) on 2026-06-26, consistent with the plan's `## Decisions`:

- **PreToolUse / PostToolUse / Stop / SubagentStop** all carry top-level `session_id`, `cwd`, `hook_event_name`, and — when the hook fires inside a subagent or under `--agent` — `agent_id` and `agent_type`.
- **PreToolUse** carries top-level `tool_name` and `tool_input` (e.g. `tool_input.command` for Bash, `tool_input.file_path` for Edit/Write). Not nested under any wrapper.
- **PostToolUse** payload: the ledger reads top-level `exit_code` and `tool_output` (per Decisions — the prototype's `tool_response.exit_code` guess recorded `0` for everything). **Clove must confirm this exact shape against a live PostToolUse payload before trusting it** — see "Field-shape items Clove must confirm" below.
- **Exit-code-2 semantics (confirmed):** exit 2 on `Stop`/`SubagentStop` prevents the stop and feeds the hook's **stderr** back to the model as the continue reason; exit 2 on `PreToolUse` blocks the tool call before execution and surfaces stderr.
- `${CLAUDE_PROJECT_DIR}` is exported into the hook process environment; hook scripts resolve repo-relative paths from it.

### Scenario (a) — False `done` blocked, real failure re-injected

**Goal:** a persona emits `verdict: done` while a required check is failing; the `Stop` gate refuses the stop and surfaces the real failure.

**(unit) Direct-invocation form — automatable gate:**

1. **Setup — failing evidence.** In a scratch run dir, create `.prism/evidence/smoke-a/report.json` claiming success:
   ```json
   { "reasoning": "implemented the feature", "persona": "clove", "checklist": { "types": true, "tests": true, "lint": true }, "verdict": "done", "verdict_reason": "all checks pass", "next_route": "briar" }
   ```
   Configure `clove`'s `tests` gate (in the `gates.json` used by the harness) so its check command is one that exits non-zero — e.g. a `fresh` gate whose command is `node -e "process.exit(1)"`, or point it at a deliberately failing test file. The point: the claimed-true `tests` checklist item maps to a gate whose command exits 1.
2. **Trigger.** Pipe a `Stop` mock payload to the gate on stdin:
   ```bash
   echo '{"session_id":"smoke","cwd":"<scratch-run-dir>","hook_event_name":"Stop","agent_id":"smoke-a"}' \
     | CLAUDE_PROJECT_DIR=<scratch-run-dir> node .claude/hooks/run-gates.mjs ; echo "exit=$?"
   ```
   (`runKey` resolves to `agent_id` = `smoke-a`, so the gate reads `.prism/evidence/smoke-a/report.json`.)
3. **Assertion (PASS iff all hold):**
   - Exit code is **2** (force-continue).
   - **stderr names the failing gate** — contains the `tests` gate id and the real non-zero exit code / failing command output, not a generic message.
   - stderr does **not** ratify `done` — the override to `needs-fix` (per the `done-override` `on_fail`) is reflected in the message.
   - A strike was recorded: `.prism/evidence/smoke-a/` strike counter incremented to 1.

**(manual) End-to-end form — human confirmation:**

In a live Clove session on a branch with a genuinely failing test, instruct Clove to emit `verdict: done` and attempt to stop. Confirm: the session is **not** allowed to stop, and the injected continue message names the failing test with its real output. (This proves `settings.json` wires `run-gates.mjs` on `Stop` and the `Stop` timeout covers the fresh gate.)

### Scenario (b) — Out-of-lane write denied before execution

**Goal:** Clove attempts an `Edit`/`Write` to a path outside `clove`'s `may_write` globs; `ownership-guard.mjs` denies it on `PreToolUse` before the write happens.

**(unit) Direct-invocation form — automatable gate:**

1. **Setup.** Use the `clove` ownership matrix from `gates.json#clove` (`may_write: src/**, **/*.test.*, .prism/plans/**, .prism/evidence/**`). Pick a target path that matches **none** of those globs — e.g. `.github/workflows/ci.yml`.
2. **Trigger.** Pipe a `PreToolUse` mock payload for an `Edit` outside the lane:
   ```bash
   echo '{"session_id":"smoke","cwd":"<repo-root>","hook_event_name":"PreToolUse","agent_id":"smoke-b","tool_name":"Edit","tool_input":{"file_path":".github/workflows/ci.yml"}}' \
     | CLAUDE_PROJECT_DIR=<repo-root> node .claude/hooks/ownership-guard.mjs ; echo "exit=$?"
   ```
3. **Assertion (PASS iff all hold):**
   - Exit code is **2** (tool call blocked pre-execution).
   - **stderr names the allowed paths** — lists `clove`'s `may_write` globs so the model knows where it *may* write.
   - The file `.github/workflows/ci.yml` is **unchanged on disk** (the guard fired before the write — verify mtime/contents unchanged).
4. **Negative control (PASS iff it allows):** repeat with an in-lane target (`tool_input.file_path: "src/index.ts"`) → exit code **0**, no denial. This proves the guard denies selectively, not universally.
5. **`may_not_run` companion check:** pipe a `PreToolUse` Bash payload with a forbidden command:
   ```bash
   echo '{"session_id":"smoke","cwd":"<repo-root>","hook_event_name":"PreToolUse","agent_id":"smoke-b","tool_name":"Bash","tool_input":{"command":"gh pr merge 123"}}' \
     | CLAUDE_PROJECT_DIR=<repo-root> node .claude/hooks/ownership-guard.mjs ; echo "exit=$?"
   ```
   Assertion: exit **2**, stderr names the merge prohibition. (Clove can't merge — ADR-0011 / ownership-forced handoff.)

**(manual) End-to-end form — human confirmation:**

In a live Clove session, instruct Clove to edit a file outside its lane (e.g. a CI workflow). Confirm the write is refused before it happens and the message names the allowed paths. (Proves `settings.json` wires `ownership-guard.mjs` on `PreToolUse` for `Edit|Write|MultiEdit|Bash`.)

### Scenario (c) — Clean run ratifies and allows stop

**Goal:** all gates pass, the report is shape-valid with a coherent `next_route`; the `Stop` gate ratifies, allows the stop, and writes `ratified-verdict.json` as audit only.

**(unit) Direct-invocation form — automatable gate:**

1. **Setup — passing evidence.** Create `.prism/evidence/smoke-c/report.json` with `verdict: done`, `next_route: briar`, and a checklist whose every claimed-true item maps to a gate that passes. For `ledger`-source gates (tests), pre-seed `.prism/evidence/smoke-c/ledger.jsonl` with a matching entry recording exit code `0`:
   ```
   {"ts":"2026-06-26T00:00:00Z","cmd":"<resolved test command>","exit_code":0,"runKey":"smoke-c"}
   ```
   For `fresh` gates (types/lint), point the harness `gates.json` at commands that exit 0 (e.g. `node -e "process.exit(0)"`).
2. **Trigger.** Pipe the `Stop` mock payload (`agent_id: smoke-c`) to `run-gates.mjs` as in (a).
3. **Assertion (PASS iff all hold):**
   - Exit code is **0** (stop allowed).
   - No continue/override message on stderr.
   - `.prism/evidence/smoke-c/ratified-verdict.json` **exists** and records what ran (gate ids, exit codes, strike count) — an **audit artifact**.
   - **Channel-hardening check:** `ratified-verdict.json` is written but is **not** consumed as a routing input — the model's `report.json` `verdict`/`next_route` are unchanged by the ratification (the gate hardens the existing channel; it does not author a competing one). Verify the gate's only mutation of routing state is the strike counter and the audit file, never a rewrite of `report.json`'s verdict on the pass path.
   - `next_route: briar` passed the coherence check (`done` → normal next persona, in `clove`'s `allowed_routes`).

**(manual) End-to-end form — human confirmation:**

In a live Clove session where the work genuinely passes all checks, let Clove emit `done` with `next_route: briar` and stop. Confirm: the session stops normally, and `.prism/evidence/<runKey>/ratified-verdict.json` is present as an audit record. Confirm Sol/the human reads the model's returned verdict — not the audit file — to route to Briar.

### Scenario (d) — Strike cap forces `needs-stronger-model` re-emit

**Goal:** after 3 failed stop attempts, the gate stops looping and forces the model to re-emit its report as `needs-stronger-model`. The park-path *routing* is validated end-to-end in Phase 2; the **strike-count-to-3 logic is Phase 1 code** and gets a unit assertion here.

**(unit) Direct-invocation form — automatable gate:**

1. **Setup.** Same failing-gate setup as scenario (a), under a fresh `agent_id` (`smoke-d`).
2. **Trigger.** Invoke the `Stop` gate **three times** in sequence with the same payload (each invocation reads the persisted strike counter from `.prism/evidence/smoke-d/`):
   ```bash
   for i in 1 2 3; do
     echo '{"session_id":"smoke","cwd":"<scratch-run-dir>","hook_event_name":"Stop","agent_id":"smoke-d"}' \
       | CLAUDE_PROJECT_DIR=<scratch-run-dir> node .claude/hooks/run-gates.mjs ; echo "attempt=$i exit=$?"
   done
   ```
3. **Assertion (PASS iff all hold):**
   - Attempts 1 and 2: exit **2**, stderr re-injects the real failure (force-continue), strike counter increments to 1 then 2.
   - Attempt 3 (cap reached): the gate **re-injects the `needs-stronger-model` re-emit instruction** on stderr — the message tells the model to emit its report as `needs-stronger-model` and stop. Strike counter reads 3.
   - The gate, not the model, owns this verdict: per the report contract, a persona cannot emit `needs-stronger-model` directly (`isCoherent` returns `false`); confirm the cap-path instruction sets `next_route` to the same persona key (`clove`), per the report-contract coherence table.
   - **`stop_hook_active` backstop ordering:** the 3-strike counter is the *primary* ceiling; `stop_hook_active` is the runtime-loop backstop. Confirm the cap fires on the strike counter independently of `stop_hook_active`, so the ceiling holds even if the backstop field shape is wrong.

**(manual) End-to-end form — deferred to Phase 2.** The full park path (re-emit → model's structured return carries `needs-stronger-model` → Sol routes to `escalation.axis: model`) is a Phase 2 orchestration validation (Phase 2 task 2). Phase 1's manual confirmation is limited to: in a live session with a persistently failing gate, confirm the session is forced to re-emit as `needs-stronger-model` after the third stop attempt rather than looping indefinitely.

### Harness notes

- **Where the unit harness lives:** the four scenarios are runnable as a shell script or a small Node test file Clove places alongside the hooks (e.g. `.claude/hooks/__smoke__/` or a `*.test.mjs` per hook). The exact location is Clove's call; the requirement is that each scenario's unit form runs headless and asserts exit code + stderr substring. The negative controls (b.4) and the audit-only check (c) are part of the gate, not optional.
- **Scratch isolation:** each scenario keys by a distinct `agent_id` (`smoke-a`/`-b`/`-c`/`-d`) so strike counters and ledgers never collide — this also exercises the `runKey = agent_id ?? session_id` keying that Phase 2 stress-tests under real fleet concurrency.
- **Harness `gates.json`:** scenarios (a), (c), (d) need gate commands wired to deterministic pass/fail (`node -e "process.exit(N)"`). Use a harness-local `gates.json` (or a test override) so the smoke test does not depend on the real test suite's current state — the gate logic is what's under test, not the repo's tests.

### Field-shape items Clove must confirm against the live runtime (do not guess)

These are recorded as confirmed in `## Decisions` but were not independently re-verifiable from the public hook docs page on 2026-06-26. Confirm against an actual payload before relying on them; if any contradicts the Decisions, flag it (do not silently work around it):

1. **PostToolUse top-level `exit_code` / `tool_output`** — highest priority. If the real field is nested (e.g. under `tool_response`), the ledger records `0` for every command and scenario (a)/(d) silently pass when they should fail. Confirm by logging a real PostToolUse payload from a Bash call.
2. **`stop_hook_active` field name and presence on `Stop`/`SubagentStop`** — used as the loop backstop. The 3-strike counter is the primary ceiling (scenario d asserts this), so a wrong field name degrades the backstop but does not break the gate — still confirm the exact name.
3. **`agent_id` / `agent_type` presence on `Stop`/`SubagentStop`** (vs. only on tool-use events) — the docs say these appear inside subagent context; confirm they ride the `Stop`/`SubagentStop` payload specifically, since `runKey` resolution on the stop event depends on it. (The solo path falls back to `.prism/active-persona`, so a missing `agent_id` on solo `Stop` is expected and handled.)

---

## Phase 2 Validation

Evidence-backed results for Phase 2 tasks 1–3 (branch `hmcgrew/issue-292-orchestration-subagentstop-sol`).

### Task 1 — SubagentStop fires under real Sol dispatch

**Result: confirmed.** The `.prism/evidence/` directory on disk contains multiple runs keyed by `agent_id` values (`a72a40e9a7e9044a4`, `a6b84d8ba5acbf1ea`, `a9a881a7f0abc5497`), distinct from the current session's UUID-format `agent_id` (`46e195fa-82c0-4b51-95c1-58e1b9ebff2a`). Each `ratified-verdict.json` records `persona: "clove"` and its `runKey` matches the `agent_id` — not the `session_id`.

Specifically, `a9a881a7f0abc5497/ratified-verdict.json` records the Phase 1 final clean ratification (verdict `done`, next_route `briar`, strike_count 0), confirming `SubagentStop` fired `run-gates.mjs`, the resolver picked `clove` via `agent_type: "prism-code-dev"` → `SKILL_ID_TO_PERSONA`, and the runKey derived from `agent_id`. The Phase 2 dispatch itself produced a ledger entry at `46e195fa-82c0-4b51-95c1-58e1b9ebff2a/ledger.jsonl`, confirming this dispatch's `agent_id` is UUID-format and is independent of all prior hex-format runKeys.

**Live dogfooding of this dispatch:** this Phase 2 Clove dispatch itself fired `SubagentStop` twice during completion — once before `report.json` existed (shape validation failed, strike 1: "report.json not found"), and once with a BOM-corrupted JSON file written by PowerShell `Set-Content` (strike 2: "report.json is not valid JSON"). Both failures were correctly surfaced by the gate with precise error messages naming the file path and parse error. The report was rewritten via Node `fs.writeFileSync` (BOM-free UTF-8), and the gate ratified cleanly on the third attempt. The dispatch's `agent_id` is `af2d13a4137cf9dfe` — distinct from all prior hex-format runKeys, confirming fleet isolation in practice.

**`settings.json` wiring confirmed:** `SubagentStop` is wired alongside `Stop` — both events fire `run-gates.mjs` with a 120-second timeout. No silent bypass is possible under Sol dispatch.

### Task 2 — Park path consumes into Sol routing (no Sol code change required)

**Result: confirmed — existing table consumes `needs-stronger-model` cleanly, no Sol code change needed.**

Trace of the park path:

1. **Strike cap reached** (3 strikes) → `run-gates.mjs` `injectNeedsStrongerModel()` fires: re-injects instruction on stderr telling the model to emit `verdict: "needs-stronger-model", next_route: "<persona>"`, then exits 2 (stop refused).
2. **Model re-emits report** with `needs-stronger-model` as verdict. The model's structured return to Sol carries `verdict: "needs-stronger-model"`.

   > **CORRECTION (Issue #300, Sasha Bug 1 — design against the code, not this narrative).** The original text here claimed "`isCoherent()` returns `false` for `needs-stronger-model` … the gate passes through because the model is reporting the gate-forced verdict." That is **false against the shipped code.** `isCoherent` returning `false` makes `validateShape` return `{ ok: false }`, which is the *reject* path — the re-emit is rejected, re-strikes at the already-capped count, and re-injects, producing an infinite stop-loop (Debugged Issues → "strike-cap coherence deadlock"). What Task 2 actually validated is Sol's *routing table* consuming the verdict string (correct and unaffected) — NOT the gate's *re-emit acceptance*, which was never implemented. Issue #300 adds the stateful accept-on-re-emit path (`capped` flag in `strikes.json`) so the re-emit passes coherence and the stop is allowed. After the #300 fix lands, the park path's step 2 reads: the gate consults the `capped` flag set by `injectNeedsStrongerModel`; a re-emit of `needs-stronger-model` whose `next_route` equals the persona key passes coherence and the stop is allowed (exit 0), carrying the verdict to Sol.
3. **Sol's routing table** (`report-back.md` § Routing table): `primary needs-stronger-model` → `bump models.<persona> to opus (escalation.axis: model)`. The table entry is present and unconditional — no additional sol-side wiring is required.
4. **`step-06-escalate.md`** defines the model axis: "bump `models.<persona>` to `opus` for that persona's next dispatch. Triggered when Sonnet stalled the unit twice (strike 2)." The strike cap fires at 3 in the Phase 1 implementation; step-06 describes the axis shape — the exact strike threshold is the hook's concern, not Sol's.
5. **`goal-state.md` schema**: `escalation: { axis: "model", reason, raisedAt }` — the model axis is a first-class field in the lane record.

The channel-hardening Decision is confirmed: Sol reads the model's structured return (never `ratified-verdict.json`). The model's return after cap is gate-consistent because `run-gates.mjs` forced it. Sol's routing table is the final consumer and requires no modification.

**One nuance noted**: `step-06-escalate.md` describes the model-axis trigger as "Sonnet stalled the unit twice (strike 2)" while the hook fires at strike 3. This is a prose description in the Sol conductor skill — the hook's strike cap is authoritative; step-06's "twice" is illustrative. No code change needed; the distinction is documented here for Phase 6 ceiling-prose accuracy review.

### Task 3 — Fleet keying prevents cross-lane collision

**Result: confirmed via deterministic smoke assertion** (`fleet-keying.mjs`).

Three scenarios added to `.claude/hooks/__smoke__/fleet-keying.mjs`:

- **E1** (primary): Two lanes share `session_id: "shared-session"` but carry distinct `agent_id: "lane-alpha"` / `"lane-beta"`. After one stop attempt each, each lane has exactly 1 strike in its own evidence dir. Neither lane's dir contains the other's artifacts.
- **E2** (solo-path): No `agent_id` → runKey falls back to `session_id`. Strike appears under `session_id`-keyed dir. Solo path unbroken.
- **E3** (negative control): Two stop attempts with identical `agent_id` → both strikes accumulate in the same dir (2 total). Confirms isolation in E1 comes from distinct ids, not another mechanism.

All three pass. Two separate harness entry points: `node .claude/hooks/__smoke__/run-all.mjs` (6/6) and `node .claude/hooks/__smoke__/fleet-keying.mjs` (3/3). There is no single invocation that produces a combined result — run both scripts independently to reproduce.

---

## Acceptance Criteria

### Behavioral

- [ ] Given a persona claims completion while a required check is failing, When the session attempts to stop, Then it is prevented from stopping and is told which check failed with the real failure output.
- [ ] Given a persona is asked to write to a file outside its ownership lane, When it attempts the write, Then the write is denied before it happens with a message naming the allowed paths.
- [ ] Given a persona is asked to run a forbidden command (e.g. a merge), When it attempts the command, Then the command is denied before it runs.
- [ ] Given a persona cannot pass its checks after three attempts, When it stops, Then its reported verdict is the escalation outcome, not a false success, and the run routes to a stronger-model escalation.
- [ ] Given an enforced persona run under orchestration (as a subagent), When it finishes, Then the same enforcement applies as in a solo run (no silent bypass).
- [ ] Given two enforced personas run concurrently in a fleet, When both record evidence, Then one lane's failures do not affect the other lane's completion.
- [ ] Given a non-persona helper subagent (e.g. a search agent) runs, When it uses tools, Then enforcement stays out of its way.
- [ ] Given a persona finishes without declaring where its work hands off, When it tries to stop, Then it is prevented from stopping until it names a valid next route.
- [ ] Given a persona names a next route that contradicts its own verdict, When it tries to stop, Then it is prevented from stopping until the route and verdict agree.
- [ ] Given enforcement runs without Sol (solo invocation), When a persona completes, Then the handoff destination is present and coherent for the human to act on — never auto-executed.

### Non-behavioral

- [ ] Every persona has an ownership matrix and a typed report contract; evidence gates are present per the class taxonomy.
- [ ] Command strings exist in exactly one source (`config.json`); `gates.json` references tokens; `verification-commands.md` renders the same data.
- [ ] `prism:check` detects drift in the hooks, `settings.json`, and `gates.json`; seed-twin discipline holds for consumer install.
- [ ] No skill body is bloated by the ceiling pass — the `skill-authoring.md` disclosure gate is applied per rewrite.
- [ ] The enforcement layer functions with Sol absent (solo invocation) with no loss of guarantee — only the routing automation differs.

### AC Sync Log

| Date | Agent | Action | Plan | Tracker |
| ---- | ----- | ------ | ---- | ------- |
| 2026-06-25 | Winston | Generated AC | updated | not synced (GitHub epic TBD) |
| 2026-06-25 | Nora | Filed epic #289 + phase sub-issues #290–#296; updated Ticket line | updated | #289 |

---

## Debugged Issues

### strike-cap coherence deadlock — gate forces a verdict its own coherence check forbids

- **Status:** `fixed`
- **Fixed in:** Issue #300 Stage 1 task 3 — stateful accept-on-re-emit via a `capped` flag in `strikes.json`. `injectNeedsStrongerModel` persists `capped: true`; the gate loads it as `gateForcedPark` and `isCoherent` accepts `needs-stronger-model` iff `gateForcedPark && next_route === persona`; an early accept-block allows the stop without re-running gates. A strike-0 self-claim still rejects. Pinned by smoke scenario F (F.pos accept, F.neg reject); landed in canonical `.ai-skills/hooks/run-gates.mjs`, emitted to runtime in Stage 2.
- **Severity:** Critical
- **Confidence:** `High` (Confirmed root cause — read every line of the control flow + the coherence check; the loop is deterministic and provable by inspection)
- **Environment:** All environments — not Windows-specific. Any persona that accrues 3 strikes on any platform.
- **File:** `.claude/hooks/run-gates.mjs:120-130` (shape-fail → re-inject loop), `.claude/hooks/run-gates.mjs:273-280` (`isCoherent`), `.claude/hooks/run-gates.mjs:388-402` (`injectNeedsStrongerModel`)
- **Root cause:** `[Confirmed]` At strike cap the gate forces the model to re-emit `verdict: "needs-stronger-model"`, but `isCoherent` returns `false` unconditionally for that verdict (`VERDICT_ROUTE_CONSTRAINTS['needs-stronger-model'] = { gateInjected: true }` → `if (constraint?.gateInjected) return false`), so on the next stop `validateShape` rejects the re-emitted report, the shape-fail branch increments the (already-capped) strike and calls `injectNeedsStrongerModel` again → exit 2 → infinite stop-loop.
- **Steps to Reproduce:**
  1. Drive any gated persona (e.g. Clove) to 3 strikes on a failing gate (scenario d / scenario a setup in `## Phase 1 Smoke Test`).
  2. On strike 3, `injectNeedsStrongerModel` (line 388) writes to stderr: "Re-emit your report.json with verdict: needs-stronger-model, next_route: clove" and exits 2.
  3. Model complies, re-writes `report.json` with `verdict: "needs-stronger-model"`, `next_route: "clove"`, and attempts to stop.
  4. Next invocation: `validateShape` (line 114) → `isCoherent('needs-stronger-model', 'clove', allowedRoutes)` (line 263) → constraint has `gateInjected: true` → returns `false` (line 276).
  5. `validateShape` returns `{ ok: false }` → shape-fail branch (line 115) → strike incremented (line 117), already ≥ cap → `injectNeedsStrongerModel` fires AGAIN (line 121) → exit 2. Loop never terminates.
- **Expected behavior:** When the gate has forced `needs-stronger-model`, the model's re-emit of exactly that verdict should be accepted, the stop allowed, and the verdict carried to Sol/human for model-axis escalation.
- **Actual behavior:** The re-emit is rejected by the same coherence rule that forbids a persona from *self-claiming* `needs-stronger-model`, so the gate demands a verdict it then refuses — the model can never stop.
- **Refuted hypotheses:**
  - "The gate has an accept-on-re-emit path that distinguishes the forced verdict from a self-claim" — refuted by `run-gates.mjs:273-280`: `isCoherent` reads only the verdict string and route; it holds no state recording that the gate forced the verdict, and returns `false` for `needs-stronger-model` regardless of origin. There is no second code path.
  - "Phase 2 Validation Task 2 already proved the park path works end-to-end" — refuted. The plan's `## Phase 2 Validation` → Task 2 (line 430) asserts "`isCoherent()` returns `false` for `needs-stronger-model` ... the gate passes through because the model is reporting the gate-forced verdict, not a self-claimed one." **This is contradicted by the actual code** — `isCoherent` returning `false` makes `validateShape` return `{ ok: false }`, which is the reject path, not a pass-through. The narrative describes intended behavior that was never implemented; Task 2 validated Sol's *routing table* consuming the verdict (correct and unaffected), not the gate's *re-emit acceptance* (which is broken). **Flagged for Winston — design against the code, not the validation narrative.**
- **Recommended fix DIRECTION (Winston designs the mechanism):** The gate must distinguish a gate-FORCED `needs-stronger-model` re-emit from a persona self-claiming it, and accept the former while still rejecting the latter. Minimal condition the fix must satisfy: *after `injectNeedsStrongerModel` has fired for a runKey, a subsequent report whose verdict is exactly `needs-stronger-model` and whose `next_route` is the same persona key must pass coherence and be allowed to stop.* Candidate seams (Winston's call): (a) persist a "park forced" flag in the strike/evidence state when `injectNeedsStrongerModel` fires, and have `validateShape`/`isCoherent` consult it to allow the forced verdict; (b) skip `validateShape`'s coherence rejection for `needs-stronger-model` when strike count is already at cap; (c) have the cap path allow the stop directly (exit 0 with the verdict written) rather than instructing a re-emit the next pass re-validates. Interaction note: the cap path sets `next_route` to the same persona key (`injectNeedsStrongerModel` line 394) — any fix must keep that route coherent, since the same-persona route is what signals Sol to retry at a stronger model.
- **Suggested tests:** Extend the scenario-d smoke harness with a **fourth** invocation: after the 3rd (cap) invocation forces the re-emit, write a `report.json` with `verdict: "needs-stronger-model"`, `next_route: "<persona>"`, and assert the 4th invocation exits **0** (stop allowed) — NOT exit 2. The current harness stops at the 3rd invocation and never exercises the re-emit acceptance, which is exactly why the deadlock shipped unobserved. Add a negative control: a persona self-claiming `needs-stronger-model` at strike 0 must still be rejected (exit 2).
- **Missing evidence:** none — the loop is provable by inspection; no runtime reproduction was needed to confirm it.
- **Linear:** N/A

### pre-existing-failure intolerance — fresh gates strike on env noise the persona never claimed responsibility for

- **Status:** `fixed`
- **Fixed in:** Issue #300 Stage 1 task 4 — baseline-regression tolerance for `fresh` gates. `ownership-guard.mjs` captures each fresh gate's exit code on the persona's first write (`baseline.json`); `run-gates.mjs` strikes a claimed-true fresh-gate failure only when its baseline passed (a regression), downgrading a pre-existing or absent-baseline failure to a non-blocking note. `ledger` gates unchanged. Pinned by smoke scenario G (G.a pre-existing → no strike, G.b regression → strike); landed in canonical hooks, emitted to runtime in Stage 2. Side effect: smoke fixtures that want a fresh-gate strike must now pre-seed a clean baseline (`{ types: 0 }`) — applied to scenarios A, D, and all fleet-keying lanes.
- **Severity:** High
- **Confidence:** `Medium` (Deduced — the blocking logic and `fresh`-source config are Confirmed by inspection; the specific Windows failures are reported by Sol's dispatch context and corroborated by the plan's PR Readiness note, not independently re-run in this session)
- **Environment:** Windows dev environment (CI is green on Ubuntu/POSIX). Pre-existing `bundle.ts` esbuild error surfaced by `prism:check-types`; Windows path-normalization test failures (`crossref-lint.test.ts` POSIX-path assertion; `D:\D:\…` double-drive URL-decode in `generate-skills.test.ts`).
- **File:** `.claude/hooks/run-gates.mjs:168-218` (gate loop + claimed-vs-proven reconciliation), `.claude/hooks/gates.json:15-49` (`types`/`lint` = `source: "fresh"`, `tests` = `source: "ledger"`)
- **Root cause:** `[Confirmed]` (mechanism) / `[Deduced]` (env trigger) The gate runs `fresh`-source gates (`types`, `lint`) by executing the command now on every stop (`run-gates.mjs:333-356` → `runGateCheck` → `runCheck` for non-ledger). A gate hard-blocks when `claimed && !result.passed` (`run-gates.mjs:177`). Because the persona legitimately claims `types: true`/`lint: true` after doing correct work, a fresh run that fails on environment noise unrelated to the persona's diff produces `gateFailures.length > 0` → strike (`run-gates.mjs:198-217`). Repeated fresh failures accrue strikes to the cap, triggering Bug 1.
- **Steps to Reproduce:**
  1. On the Windows dev env, run any gated Clove dispatch whose actual work is correct, with `report.json` claiming `types: true`.
  2. Clove attempts to stop → `run-gates.mjs` runs the `types` fresh gate (`pnpm run prism:check-types`), which exits non-zero on the pre-existing `bundle.ts` esbuild error.
  3. `claimed (true) && !result.passed (true)` → `gateFailures` non-empty → verdict override + strike (line 198-217).
  4. Repeat across stop attempts → 3 strikes → cap → Bug 1 deadlock — even though the persona's work is correct.
- **Expected behavior:** A fresh-gate failure caused by a pre-existing, persona-independent environment problem should not strike the persona out (and certainly not deadlock it). The inversion principle (ADR-0067) reconciles *the persona's claim* against proof — not whether the whole repo is green on every stop.
- **Actual behavior:** Every fresh gate re-runs from scratch with no baseline comparison; a pre-existing failure the persona neither caused nor claimed-to-have-fixed is counted as the persona's gate failure, accruing strikes toward the cap.
- **Refuted hypotheses:**
  - "The Phase 2 unclaimed-but-failing-gate fix already neutralizes this." — partially refuted. The fix at `run-gates.mjs:180-190` only converts a failing gate to a non-blocking warning *when the persona did NOT claim the key* (`!claimed && !result.passed`). It does nothing for a **claimed-true** item: a persona that correctly did its work and claims `types: true` still hard-blocks when the fresh `types` run fails on env noise (line 177). The accelerant is the claimed-true path, which the Phase 2 fix never touched.
- **Recommended fix DIRECTION (Winston designs the mechanism):** Introduce pre-existing-failure tolerance so the gate strikes only on regressions the persona is responsible for, not on inherited env state. Candidate directions (Winston's call): (a) **baseline-compare** — capture a baseline gate result at dispatch start (against `origin/main` or the pre-work tree) and strike only when a claimed gate that passed at baseline now fails; (b) **claimed-only blocking with env-failure classification** — distinguish a gate command failing for reasons inside the persona's diff from one failing on untouched files, and treat the latter as a non-blocking warning even when claimed; (c) **environment-gating** — let `fresh` gates record a known-pre-existing-failure allowlist (per-repo, Atlas-populated) that downgrades matching failures to warnings. Direction (a) most directly matches ADR-0067's claimed-vs-proven framing — it reconciles *change*, not absolute repo state. Any direction must preserve the property that a genuine regression the persona introduced still strikes.
- **Suggested tests:** A smoke scenario where a `fresh` gate command fails on a file outside the persona's `may_write` / outside its diff, the persona claims the key true, and the gate does NOT strike (exits 0 or emits a non-blocking warning) — paired with a positive control where the same gate fails on a file inside the persona's diff and DOES strike. This pins the regression-vs-pre-existing distinction the fix introduces.
- **Missing evidence:**

  | Gap | Impact | How to Obtain |
  | --- | --- | --- |
  | The exact set of Windows-only fresh-gate failures that fire under a real Clove dispatch (which of `prism:check-types` / `prism:crossref-lint` / `prism:test` actually exit non-zero on this env) was reported by Sol's context + PR Readiness note, not re-run in this session. | Determines whether `types`, `lint`, both, or the ledger-sourced `tests` path is the dominant accelerant — narrows which gate-source the fix must target first. | Run `pnpm run prism:check-types`, `pnpm run prism:crossref-lint`, and `pnpm run prism:test` on this Windows env and record exit codes. PR Readiness (line 745) already confirms `prism:check-types` fails on the `bundle.ts` esbuild error and `prism:crossref-lint` passes clean. |

- **Linear:** N/A

---

## Review Issues

### report-contract.md install seed carries forbidden ADR references and dangling links

- **Severity:** `major`
- **Status:** `fixed`
- **Fixed in:** Added `references/enforcement/report-contract.md` and `references/enforcement/gates.json` to `seed-curation.json` `excluded[]`; removed both files from `templates/install/.prism/references/enforcement/` via `git rm`; confirmed `pnpm prism:crossref-lint` passes clean.
- **File:** `templates/install/.prism/references/enforcement/report-contract.md:5,206,212`
- **Problem:** `pnpm prism:crossref-lint` fails on this branch: 3 forbidden ADR references (`ADR-0067` cited at lines 5, 206, 212) and 6 dangling relative links (to `0067-runtime-ratifies-verdicts.md`, `enforcement-floor.md`, and `report-back.md` — none of which exist in `templates/install/`). Per ADR-0064, PRISM's install surface ships zero ADR references; the lessons.md "Adding a canonical .prism/ artifact" entry (2026-05-26) documents this exact pattern.
- **Suggested fix:** Two options — (a) exclude `report-contract.md` and `gates.json` from `templates/install/` (add to `seed-curation.json` `excluded[]`) if consumers don't need them at install time and will receive them later via `prism:update`; (b) strip/genericize the ADR-0067 inline references (per ADR-0064's "inline the operative kernel, drop the link" pattern) and resolve or remove the relative links to files that don't exist on the consumer install surface. Option (a) is cleaner for Phase 0 since the enforcement runtime doesn't exist yet; populate the seed in Phase 4 alongside the hooks.

### needs-stronger-model gate-injection next_route not specified in reference validator

- **Severity:** `minor`
- **Status:** `fixed`
- **Fixed in:** Updated the `needs-stronger-model` row in the coherence table in `.prism/references/enforcement/report-contract.md` to document that the gate sets `next_route` to the same persona key on the 3-strike cap; propagated via build to `.claude/`, `.codex/`, and `.cursor/` mirrors.
- **File:** `.prism/references/enforcement/report-contract.md:150-156`
- **Problem:** The JS reference snippet marks `needs-stronger-model` as `gateInjected: true` and returns `false` from `isCoherent`, correctly preventing the persona from emitting this verdict. But when the gate *itself* injects `needs-stronger-model` on the 3-strike cap (per ADR-0067 § channel-hardening), it also must inject a `next_route` value — and neither the reference validator nor the cross-reference table documents what that injected `next_route` should be. Phase 1 implementers will need to pick a value without guidance.
- **Suggested fix:** Add a note in the `needs-stronger-model` row of the coherence table: "The gate injects this verdict and sets `next_route` to `[value]` on strike cap — the persona cannot emit this verdict directly." The routing table in `report-back.md` routes `needs-stronger-model` to `escalation.axis: model` (bump to opus) but doesn't name a `next_route` string for the contract. Clove should define the injection value in Phase 1 and document it here.

### enforcement-floor.md contains a count claim that will drift

- **Severity:** `minor`
- **Status:** `fixed`
- **Fixed in:** Replaced "This is the largest class" with "Class B is the intermediate class — between Class A's hard evidence gates and Class C's ownership-only floor" in `.prism/architect/_toolkit/enforcement-floor.md`; propagated via build to `.claude/`, `.codex/`, and `.cursor/` mirrors.
- **File:** `.prism/architect/_toolkit/enforcement-floor.md:48`
- **Problem:** "This is the largest class" describes Class B by size relative to the other classes. Per `writing-voice.md § Count rules, not numbers`, count-relative claims drift the moment the taxonomy changes.
- **Suggested fix:** Replace with a rule-based description: "Class B is the intermediate class — between Class A (claims provable by exit code) and Class C (claims provable only structurally)." Applies to all mirrors of this file.

---

### gates.json schema example points to a .md file (Eric PR #297, Minor 1)

- **Severity:** `minor`
- **Status:** `fixed`
- **Fixed in:** Updated `CheckSpec.schema` example from `.prism/references/enforcement/report-contract.md` to `.prism/references/enforcement/gates.json`; extended field description to note that the target must be JSON-parseable. Propagated via build to all mirrors.
- **File:** `.prism/references/enforcement/gates.json:150`
- **Problem:** The `schema` field says "Path to a JSON Schema file" but the example pointed to a `.md` file. A JSON Schema validator cannot parse Markdown; a Phase 1 implementer following the example would get a runtime parse error.
- **Suggested fix:** Point example at a `.json` path.

### may_not_run allows empty array (Eric PR #297, Minor 2)

- **Severity:** `minor`
- **Status:** `fixed`
- **Fixed in:** Added `"minItems": 1` to `may_not_run` in `OwnershipMatrix`, matching the existing `minItems: 1` on `may_write`. Propagated via build to all mirrors.
- **File:** `.prism/references/enforcement/gates.json:179`
- **Problem:** `may_write` had `minItems: 1` but `may_not_run` did not. An empty `may_not_run: []` would pass schema validation while silently allowing forbidden commands — a silent failure mode before Phase 5 populates per-persona data.
- **Suggested fix:** Add `minItems: 1` to match `may_write`.

### done→human coherence gap (Eric PR #297, Minor 3)

- **Severity:** `minor`
- **Status:** `fixed`
- **Fixed in:** Added a prose comment block in the `isCoherent` function body in `.prism/references/enforcement/report-contract.md`, naming the Phase 5 population responsibility explicitly. Propagated via build to all mirrors.
- **File:** `.prism/references/enforcement/report-contract.md:159`
- **Problem:** The prose coherence table says `done`→`human` is invalid unless the persona's natural next step is a human action, but the JS `isCoherent` for `done` falls through to `allowedRoutes.includes(nextRoute)` — and every persona will have `human` in `allowed_routes` for `blocked`/`needs-human` cases, so the check is silently toothless for this case.
- **Suggested fix:** Document the gap as a named Phase 5 responsibility at the code site.

### .prism/evidence/ not covered by .gitignore (Phase 1 self-review)

- **Severity:** `major`
- **Status:** `fixed`
- **Fixed in:** Expanded `gates.json#clove` `may_write` to include `.gitignore` (documented in Decisions as cross-lane absorption — the fix is part of the ledger feature). Added `.prism/evidence/` to `.gitignore` with a comment citing `lazy-artifacts.md` and the established precedent. Verified via `git check-ignore` that `ledger.jsonl`, `strikes.json`, etc. are all excluded.
- **File:** `.gitignore`
- **Problem:** The `.gitignore` on this branch (confirmed: no diff on `.gitignore`, no `.prism/evidence` entry in the file) does not exclude `.prism/evidence/`. The evidence directory is runtime state: `ledger.jsonl` files record Bash commands and exit codes; `strikes.json` records loop ceiling state; `ratified-verdict.json` records gate audit runs; `report.json` contains persona verdict claims. Committing these files would (a) pollute repo history with per-developer run artifacts, (b) confuse CI and other readers about the repo's state, and (c) violate the lazy-artifacts.md precedent established for `conductor-state.json`, `ren-state.json`, `theo-state.json`. The plan's `## Cleanup Items` and PR Readiness already flag this, and Cleanup Items notes it is out of Clove's lane. The plan acknowledges it exists; this entry records it as a gatable blocking issue.
- **Suggested fix:** Add `.prism/evidence/` to `.gitignore`. One line, one file. This is not a lane boundary for a human reviewer or a follow-up PR — it must ship with this branch to prevent evidence files from being committed in the first place. Who resolves: Clove (`.gitignore` is not in `may_write` for Clove — this is the lane gap Clove's own Cleanup Items note; a human or a short follow-up PR can add the line, or Winston can update Clove's `may_write` to include `.gitignore` for this fix).

### strike counter corruption silently resets loop ceiling (Phase 1 self-review)

- **Severity:** `minor`
- **Status:** `fixed`
- **Fixed in:** Replaced the single `catch` with `ENOENT`/corruption discrimination. `ENOENT` → strike 0 (first attempt, normal path). Any other error → `strikeCount = STRIKE_CAP` + `process.stderr.write` naming the corruption and instructing deletion. Fail-safe direction: corruption escalates rather than silently opening the gate. Fixed the misleading "No strike file yet" comment.
- **File:** `.claude/hooks/run-gates.mjs:95-101`
- **Problem:** If `strikes.json` is corrupted (malformed JSON), the catch block silently resets `strikeCount` to 0. A repeated filesystem corruption would effectively remove the loop ceiling — the 3-strike cap is the sole remaining safety net (per the `stop_hook_active` confirmed-absent Decision), so a silently-reset counter means the gate could force-continue indefinitely. This is the one place the design's safety net is thin. In practice, `writeFileSync` is unlikely to produce partial writes to a small file, but the failure mode deserves a comment and a hardening note.
- **Suggested fix:** Log a warning on corruption rather than silently treating it as "first attempt": `process.stderr.write(\`run-gates: strikes.json corrupted — resetting counter (run may loop longer than cap)\n\`)`. Does not require a file change to the catch logic, but the comment in the catch block currently says "No strike file yet" which is inaccurate for the corruption case. Minor: worth noting for Phase 2 hardening; does not block merge.

### smoke harness omits may_not_run companion check (Phase 1 self-review)

- **Severity:** `minor`
- **Status:** `fixed`
- **Fixed in:** Added Scenario B.5 to `.claude/hooks/__smoke__/run-all.mjs` — four sub-tests: `gh pr merge 123` → exit 2, `git merge main` → exit 2, `git push --force origin main` → exit 2, `git status` → exit 0 (negative control). All sub-tests use a local test-scoped `may_not_run` list so the test exercises gate logic, not ambient repo state. All 5 scenarios (A, B, B.5, C, D) pass.
- **File:** `.claude/hooks/__smoke__/run-all.mjs`
- **Problem:** The plan's Phase 1 Smoke Test spec (scenario B.5) requires a `may_not_run` companion check: pipe a `PreToolUse Bash` payload with a forbidden command (`gh pr merge 123`) and assert exit 2 + prohibition message. The harness omits this scenario — all four smoke gate setups use `may_not_run: []`, so the `ownership-guard.mjs` `may_not_run` code path is never exercised. The ownership-guard code looks correct on inspection (`may_not_run.find(sub => effectiveCmd.includes(sub))`), but the gate itself has no test for the actual prohibitions in `gates.json#clove` (`gh pr merge`, `git merge`, `git push -f`, `git push --force`).
- **Suggested fix:** Add a scenario B.5 sub-test to the harness using a `may_not_run` list with at least `gh pr merge`, assert exit 2 when the Bash payload contains that string, and assert exit 0 for an allowed command (negative control). Smoke harness is in Clove's lane — straightforward addition.

### may_not_run multi-line bypass (Eric PR #298, Major)

- **Severity:** `major`
- **Status:** `fixed`
- **Fixed in:** Removed the unconditional `break` after `parts.push(trimmed)` in `extractEffectiveCommand` (`ownership-guard.mjs`). All non-heredoc lines are now scanned for `may_not_run` matches. Heredoc-stop logic preserved — the `break` inside the heredoc-delimiter branch stays. Added Scenario B.6 (4 sub-tests: forbidden on line 2 caught ×2, both-lines-allowed exit 0, heredoc body excluded). All 6 scenarios pass.
- **File:** `.claude/hooks/ownership-guard.mjs:143`
- **Problem:** `extractEffectiveCommand` stopped scanning after the first non-empty, non-comment line. A forbidden command on line 2 of a multi-line Bash call was never checked — a realistic bypass since Claude Code regularly produces multi-line Bash calls.

### precondition strikes burn gate ceiling (Eric PR #298, Minor 1)

- **Severity:** `minor`
- **Status:** `fixed`
- **Fixed in:** Removed `writeStrikeFile` and the `injectNeedsStrongerModel` branch from the precondition failure path. Precondition failures re-prompt with exit 2 but do not increment `strikeCount`. Message updated to note 'This re-prompt does not consume a gate strike.'
- **File:** `.claude/hooks/run-gates.mjs:157`
- **Problem:** A precondition failure (e.g. `report.json` not found) was incrementing the strike counter and could trigger `injectNeedsStrongerModel` after 3 misses. A missing report file is a protocol error, not a substantive gate failure — burning the strike cap on setup errors weakened the sole loop ceiling.

### dead smoke assertion for Scenario A (Eric PR #298, Minor 2)

- **Severity:** `minor`
- **Status:** `fixed`
- **Fixed in:** Changed `r.stderr.includes('done-override') || r.stderr.includes('types')` to `r.stderr.includes('types')`. Updated the scenario comment to document why the old left arm was permanently false.
- **File:** `.claude/hooks/__smoke__/run-all.mjs:143`
- **Problem:** `run-gates.mjs` writes the gate ID and real exit code to stderr on a claimed-true failure — not the `on_fail` fixture string `'done-override'`. The dead left arm meant a breaking change to the stderr format (dropping the gate ID) would still look like a passing assertion.

### unclaimed-but-failing gates produce no feedback (Eric PR #298, Minor 3)

- **Severity:** `minor`
- **Status:** `fixed`
- **Fixed in:** Added an `else if (!claimed && !result.passed && gate.checklist_key)` branch that emits a non-blocking `process.stderr.write` warning naming the gate and unclaimed key. Does not block the stop.
- **File:** `.claude/hooks/run-gates.mjs:181`
- **Problem:** `checklist: {}` passes all gates regardless of how every command exits — nothing is claimed, so nothing fails. An unclaimed-but-failing gate was silently invisible.

### ledger exact-match defeated by trailing whitespace (Eric PR #298, Minor 4)

- **Severity:** `minor`
- **Status:** `fixed`
- **Fixed in:** Changed `entry.cmd === resolvedCmd` to `entry.cmd?.trim() === resolvedCmd.trim()`.
- **File:** `.claude/hooks/run-gates.mjs:338`
- **Problem:** Exact string equality would silently fall through to a fresh run if the Bash tool appended a trailing newline to the recorded command — defeating the ledger cost optimization.

### SKILL_ID_TO_PERSONA second source of truth (Eric PR #298, Minor 5)

- **Severity:** `minor`
- **Status:** `deferred`
- **File:** `.claude/hooks/lib/resolve-persona.mjs:85`
- **Problem:** `SKILL_ID_TO_PERSONA` is a hardcoded mapping in `resolve-persona.mjs` that duplicates the skill-ID-to-persona-key relationship that `gates.json` already partially encodes. A roster change (new persona or renamed skill ID) must be updated in two places.
- **Suggested fix (Phase 5):** Add an `agentType` field to each `PersonaGateEntry` in `gates.json`; resolve by scanning `gatesData` entries for a matching `agentType` instead of a static map. Add a `prism:check` drift assertion to confirm `SKILL_ID_TO_PERSONA` (or its replacement) stays in sync with `gates.json`. Phase 5 owns persona accuracy verification — this belongs there.

### smoke readStrikeCount swallows corruption (Eric PR #299, M1)

- **Severity:** `minor`
- **Status:** `fixed`
- **Fixed in:** Added `STRIKE_CAP = 3` constant to `fleet-keying.mjs`; changed `catch` from `return 0` to emit a warning + `return STRIKE_CAP`, matching `run-gates.mjs` fail-safe direction.
- **File:** `.claude/hooks/__smoke__/fleet-keying.mjs:125`
- **Problem:** `readStrikeCount` returned `0` on parse error while production `run-gates.mjs` returns `STRIKE_CAP` on corruption. A corrupt-file fixture would pass with the wrong strike count, producing a false PASS.
- **Suggested fix:** Return `STRIKE_CAP` on corruption with a warning, matching production fail-safe direction.

### step-06 "strike 2" prose nuance not in discoverable location (Eric PR #299, M2)

- **Severity:** `minor`
- **Status:** `fixed`
- **Fixed in:** Added a `## Cleanup Items` entry: `.prism/skills/prism-conductor/step-06-escalate.md — "strike 2" prose should align with the hook's strike-3 cap (Phase 6 ceiling-prose pass).`
- **File:** `.prism/plans/epic-prism-enforcement-layer.md` (Cleanup Items section)
- **Problem:** The step-06 prose nuance was documented only in the Phase 2 Validation narrative. A Phase 6 assignee would need to read the full validation section to find it.
- **Suggested fix:** Add a `## Cleanup Items` entry pointing directly at `step-06-escalate.md` with the Phase 6 ceiling-prose label.

### "9/9 total" wording implies a unified harness (Eric PR #299, M3)

- **Severity:** `minor`
- **Status:** `fixed`
- **Fixed in:** Replaced "Full harness: `run-all.mjs` (6 scenarios) + `fleet-keying.mjs` (3 scenarios) = 9/9 pass" with a two-sentence clarification naming both scripts and their independent exit codes, and instructing a reproducer to run both independently.
- **File:** `.prism/plans/epic-prism-enforcement-layer.md` (Phase 2 Validation, Task 3)
- **Problem:** The aggregate "9/9 total" read as a single invocation. A reader reproducing the result would run one script, see 6/6, and wonder where the other 3 are.
- **Suggested fix:** Name both harness entry points with their individual counts.

### Bash redirect-write bypasses protected-paths denylist (Briar Phase 2 gate-self-protection review)

- **Severity:** `minor`
- **Status:** `fixed`
- **Fixed in:** Issue #300 Stage 1 task 6 (finding 5) — added `commandWritesProtectedPath` to the Bash branch of `ownership-guard.mjs`: denies any effective command pairing a mutation operator (`>`, `tee`, `cp`, `mv`, `sed -i`, `dd`) with a `PROTECTED_WRITE_PATHS` / `PROTECTED_LIB_PREFIX` / protected-evidence-basename string. Pinned by smoke scenario I (I.a–I.c protected-write denials, I.f negative control). Confirmed live in this dispatch — the scan fired on a diagnostic Bash command that referenced a protected path next to a redirect (the conservative-by-design false positive).
- **File:** `.claude/hooks/ownership-guard.mjs:94-108`
- **Problem:** The `PROTECTED_WRITE_PATHS` denylist is only checked in the `writeTools.has(toolName)` branch (Edit/Write/MultiEdit). A Bash tool call that writes to a protected path via shell redirection (e.g. `echo '' > .claude/hooks/run-gates.mjs`, `tee .claude/hooks/gates.json`, `cp`, `mv`, `sed -i`) takes the Bash branch (lines 94-108), which checks only `may_not_run` and then exits 0. These commands are not in Clove's `may_not_run` list, so the denylist is bypassed. This is a narrower version of the same class of gap the PR's multi-line Bash fix addressed: the tool path matters for which guard runs.
- **Suggested fix:** Three options in increasing strength: (a) Add redirect-write patterns to Clove's `may_not_run` (e.g. `"> .claude/hooks"`, `"tee .claude/hooks"`, `"cp .ai-skills/hooks"`) — brittle, pattern-matching surface is wide. (b) After the `may_not_run` check passes, additionally scan the effective command string for any token matching a PROTECTED_WRITE_PATH basename or path prefix before permitting the Bash call — more robust, still substring-based. (c) Defer to Phase 4/5 as a known-softer-edge per the plan's own wording: "obfuscated shell deletion of evidence is defended in depth (the `may_not_run` substring + the security hook backstop), not absolutely; the lawful write/edit path is airtight." The plan already names this limitation explicitly — option (c) is a legitimate call if the judgment is that tool-path writes are the airtight guarantee and Bash-path shell writes are the accepted softer edge. Recommend recording the exact bypass commands not yet covered rather than leaving this implicit.
- **Fix-now vs. defer call (followup-scope):** The plan already explicitly scoped this as a "softer edge defended in depth, not absolutely" — this finding confirms and names the specific bypass surface but doesn't change the design's known boundary. Classify as Minor, defer to Phase 5 (ownership accuracy rollout) where `may_not_run` is populated for all personas. The tool-path (Edit/Write/MultiEdit) guarantee is airtight; the Bash-path writes are the named softer edge.

### `rm -f` variant bypasses `may_not_run` evidence-deletion guard (Briar Phase 2 gate-self-protection review)

- **Severity:** `minor`
- **Status:** `fixed`
- **Fixed in:** Issue #300 Stage 1 task 6 (finding 6) — two parts: (1) added `"rm -f .prism/evidence"`, `"rm -fr .prism/evidence"`, `"rm --force .prism/evidence"` to canonical `gates.json#clove.may_not_run` (the declarative floor); (2) added `commandDeletesEvidence` to `ownership-guard.mjs` matching `/\brm\b[^\n]*\.prism\/evidence\//` regardless of flag form (the structural backstop). Pinned by smoke scenario I (I.d `rm -f`, I.e `rm --force`, I.g negative control). Emitted to runtime in Stage 2 via the canonical-source split (the prerequisite that unblocked the `gates.json` edit).
- **File:** `.claude/hooks/gates.json:67-74` (Clove `may_not_run`)
- **Problem:** Clove's `may_not_run` protects against `"rm .prism/evidence"` and `"rm -rf .prism/evidence"` via substring matching. But `rm -f .prism/evidence/smoke/strikes.json` does not contain either substring — `-f` appears between `rm` and the path, so neither guard fires. Variant flags (`rm -f`, `rm --force`, `rm -fr`) all bypass the current guard. Scenario E8 only passes because it tests the no-flag form `rm .prism/evidence/...`, which happens to contain the substring.
- **Suggested fix:** Add `"rm -f .prism/evidence"` and `"rm -fr .prism/evidence"` to `may_not_run`, OR replace the two specific entries with a more general approach: guard the evidence path itself (e.g. `"rm -" is too broad; a prefix match on the path segment `.prism/evidence` in `rm` commands with any flags would require a small parsing pass in `extractEffectiveCommand`). Minimum fix: add the two missing flag variants to `may_not_run`. This is a narrow gap in the Bash-path softness the plan already accepts; it's worth closing explicitly.
- **Fix-now vs. defer call (followup-scope):** Trivial fix — add two strings to `may_not_run` in `gates.json`. The file is denylist-protected (ironically), so it must wait for Phase 4's canonical-source split before Clove can edit it in a gated dispatch. It's a legitimate Phase 5 item: the Phase 5 accuracy audit already covers `may_not_run` correctness. Record here; defer to Phase 5.

### `.prism/active-persona` not gitignored (Sol finding — Briar Phase 2 assessment)

- **Severity:** `minor`
- **Status:** `fixed`
- **Fixed in:** Added `.prism/active-persona` to `.gitignore` with a comment citing the solo-path single-writer constraint and the `.prism/evidence/` precedent. Verified via `git check-ignore -v .prism/active-persona` → exit 0 (line 47). `pnpm prism:crossref-lint` passes clean.
- **File:** `.gitignore`
- **Problem:** `.prism/active-persona` is untracked (confirmed: `git status` shows `?? .prism/active-persona`, and `git check-ignore -v .prism/active-persona` returns exit 1 — not ignored). The file currently contains `sol` (written by the live gate dispatch). Runtime state that changes per-session should not be committable. The pattern is established: `.prism/evidence/` is already gitignored for exactly this reason.
- **Fix-now vs. defer call (followup-scope):** Trivial one-line fix. Same class as the `.prism/evidence/` gitignore from Phase 1 — it prevents a real mistake (accidental commit of stale runtime state) and is a legitimate Minor that should land in this PR. Recommend fix-now per followup-scope: trivial, prevents a real mistake, same-scope as `.prism/evidence/` which was fixed in Phase 1 on this same branch. **No new ticket needed.**

### `.prism/active-persona` unconditional write on subagent startup corrupts solo-path resolver (Sol finding — Briar Phase 2 assessment)

- **Severity:** `major`
- **Status:** `fixed`
- **Fixed in:** Issue #300 Stage 1 task 5 (finding 4) — the fix is a structural guard, NOT removal of the skill-prose write. The skill-prose write stays (the solo resolver reads `.prism/active-persona`, so removing it would leave solo Clove ungated). Instead, `ownership-guard.mjs` denies a Write/Edit to `.prism/active-persona` when `payload.agent_type` is present (orchestrated dispatch) and permits it when absent (solo). The orchestrated resolver reads `agent_type` from the payload and never the file, so denying the write under orchestration eliminates the fleet race and the solo-session clobber the resolver Decision warned about — while solo gating stays intact. This implements the resolver Decision ("do not use the file in the orchestrated path") as a guard the model can't accidentally violate, satisfying the factual-grounding bar (a real structural action, not a skill-prose conditional). Pinned by smoke scenario H (H.a orchestrated → deny, H.b solo → permit with active guard confirmed).
- **File:** `.ai-skills/skills/prism-code-dev/shared.md:170`
- **Problem:** Clove's Phase 1 DoD startup procedure unconditionally writes `echo "clove" > <repo-root>/.prism/active-persona` on every dispatch startup. The plan's own resolver Decision states: "the file path stays single-writer by construction; do not use it in the orchestrated path." When Clove runs as a subagent (orchestrated path), the resolver correctly uses `agent_type` from the payload and does not consult the file — so the write is unnecessary. But the write corrupts the file's semantics for any concurrent or subsequent solo dispatch: if Sol's own session reads `.prism/active-persona` for its solo resolver, it now sees `clove` instead of the correct active persona. The live evidence: `.prism/active-persona` currently contains `sol` — but Clove's startup would overwrite this to `clove`, and the next time Sol runs solo (or reads the file for any purpose), the resolver sees the wrong value. Under fleet dispatch, two concurrent Clove subagents also race to write the same file, which the Decision document explicitly calls out as the race condition the payload-first resolver was designed to prevent.
- **Assessment — is a skill-prose fix now appropriate?** The Decision documents the correct behavior: "the file path stays single-writer by construction; do not use it in the orchestrated path." A skill-prose fix could attempt to add a conditional: "skip the write if `agent_type` is present in the hook payload" — but the skill prose runs before any hook fires, and the model cannot reliably detect whether it's running as a subagent from skill prose alone. A SessionStart hook (not currently wired) could handle this, or a resolver refinement that makes the write conditional on the absence of a live `agent_type` signal. This is architectural — a skill-prose fix that says "check if you're a subagent before writing" is exactly the kind of vague aspiration the factual-grounding bar forbids. The correct fix requires a mechanism the skill prose can't provide.
- **Recommended route:** Winston / Phase 5. The resolver rollout phase (Phase 5) is where the `active-persona` file mechanics are verified across all personas. The fix is architectural — either (a) a SessionStart hook writes the file only on solo startup (not currently wired), or (b) the startup instruction is removed from the Clove DoD and replaced with a resolver-correct pattern that doesn't rely on the model detecting its own dispatch mode. Record as open Major; route to Winston for Phase 5 scoping. Do not attempt a half-baked skill-prose fix now.

---

## Cleanup Items

- `.claude/hooks/lib/resolve-persona.mjs:85` — `SKILL_ID_TO_PERSONA` is a second source of truth for the skill-ID-to-persona-key mapping. Phase 5 accuracy audit: add `agentType` field to `gates.json` entries and resolve by scanning `gatesData` instead of a static map; add a `prism:check` drift assertion. (Eric PR #298, Minor 5, deferred.)
- `.prism/skills/prism-conductor/step-06-escalate.md` — "strike 2" prose should align with the hook's strike-3 cap (Phase 6 ceiling-prose pass). (Phase 2 Task 2 nuance, Eric PR #299 Minor.)

### Phase 5 follow-ons (deferred from Briar Phase 2 gate-self-protection review) — ALL RESOLVED by Issue #300

All three items were resolved by Issue #300 (gate-fix + canonical-source split pulled forward) and no longer wait for Phase 5. Records kept for traceability.

1. **(Major) `.prism/active-persona` unconditional startup write in Clove DoD — RESOLVED by Issue #300 finding 4.** The skill-prose write stays (solo gating depends on it); `ownership-guard.mjs` now denies the write under orchestration (`agent_type` present) and permits it solo. This eliminates the fleet race and the solo-session clobber as a structural guard, satisfying the factual-grounding bar without a skill-prose conditional. See the Review Issues entry and Decision "Issue #300 active-persona."

2. **(Minor) Bash redirect/`tee`/`cp`/`mv`/`sed -i` bypasses `PROTECTED_WRITE_PATHS` denylist — RESOLVED by Issue #300 finding 5.** `commandWritesProtectedPath` in the Bash branch of `ownership-guard.mjs` now denies a mutation operator paired with a protected path. See the Review Issues entry and Decision "Issue #300 Bash-path hardening."

3. **(Minor) `rm -f`/`rm -fr`/`rm --force .prism/evidence` escape the `rm .prism/evidence` substring guard — RESOLVED by Issue #300 finding 6.** The three flag variants are added to `gates.json#clove.may_not_run` (declarative floor) and `commandDeletesEvidence` matches any `rm … .prism/evidence/` form (structural backstop). The canonical-source split (Stage 2) was the prerequisite that unblocked the `gates.json` edit. See the Review Issues entry and Decision "Issue #300 Bash-path hardening."

---

## Open Questions

- **OPEN — TBD, needs Hunter input.** Whether Phase 4 emits hooks into `.codex/` now or defers until Codex hook parity is confirmed. **Default path (used until resolved):** emit to `.claude/` + `templates/install/` only; gate `.codex/` emission behind a confirmed-parity check, since leg 1 portability is explicitly not a near-term driver.

---

## History

- 2026-06-25 [main]: Plan created — PRISM enforcement layer epic. Evaluate pass recommended Proceed-with-changes; redesigned the prototype's three weakest mechanisms (active-persona file → payload-first resolve; session_id → agent_id keying; ratified-file routing → channel-hardening). Scoped 7 phases; gate-strength taxonomy classifies all 28 personas A/B/C. See Decisions for the inversion principle (ADR-0067) and the Sol-independence reframe.
- 2026-06-25 [main]: Elevated the ceiling to co-equal with the floor per Hunter — the instructions themselves must make the model stronger (anti-loop, calibrated reasoning), grounded in real factual actions. Added the factual-grounding bar to Decisions and the Goal/Context framing.
- 2026-06-25 [main]: Added handoff enforcement per Hunter — required `next_route` field + verdict↔route coherence check, enforced identically with/without Sol; ownership already forces handoff negatively. Never auto-invokes the next persona (human gate preserved). Updated contract (Phase 0), gate (Phase 1), and AC.
- 2026-06-25 [hmcgrew/issue-290-contract-schema-foundations]: Phase 0 tasks 1–2 — Winston authored the inversion-principle ADR (inversion, channel-hardening, handoff enforcement, factual-grounding bar, Briar caveat) and the gate-strength taxonomy doc `.prism/architect/_toolkit/enforcement-floor.md`; routed it into the skill-body manifest globs. The plan reserved ADR-0062, but 0062–0066 already landed on main (consumer-boundary epic), so the ADR is **0067** (next free); all plan/doc references updated. Both new files excluded from the consumer seed (PRISM ships zero ADRs per ADR-0064; the taxonomy doc is internal enforcement-architecture guidance). Clove continues Phase 0 (tasks 3–4: report-contract + gates.json schemas) on this branch.
- 2026-06-25 [hmcgrew/issue-290-contract-schema-foundations]: Phase 0 tasks 3–4 — Clove authored the report contract schema (`.prism/references/enforcement/report-contract.md`) and the gates.json structural schema (`.prism/references/enforcement/gates.json`). Report contract defines all seven fields, the verdict enum (citing `report-back.md` as authoritative), `next_route` derivation/validation rule with Clove as the worked example, and a JS reference validator including the verdict↔route coherence check. Gates.json schema defines the per-persona entry shape (`writes_report_to`, `preconditions[]`, `gates[]`, `unverifiable_boxes[]`, `ownership`, `allowed_routes[]`) with `CheckSpec` and `OwnershipMatrix` as nested definitions; documents the `{{commands.*}}` token convention. Phase 0 now fully built; handoff to Briar for self-review.
- 2026-06-25 [hmcgrew/issue-290-contract-schema-foundations]: Briar self-review — 1 Major (install-seed crossref-lint failure: report-contract.md carries forbidden ADR-0067 refs + 6 dangling links in templates/install/), 2 Minor (needs-stronger-model injection next_route undocumented; enforcement-floor.md count claim). Verdict: needs-fix → Clove.
- 2026-06-25 [hmcgrew/issue-290-contract-schema-foundations]: Clove fixed Briar's 3 review findings — excluded enforcement reference files from consumer seed (seed-curation.json + git rm); documented gate-injected next_route for needs-stronger-model in report-contract.md coherence table; replaced count claim in enforcement-floor.md with role-based description. All mirrors rebuilt; pnpm prism:crossref-lint passes clean.
- 2026-06-25 [hmcgrew/issue-290-contract-schema-foundations]: Clove fixed Eric's 3 PR-review minors — corrected gates.json CheckSpec.schema example to a .json path; added minItems:1 to may_not_run; added Phase 5 population note to isCoherent for done→human gap. All mirrors rebuilt via build; pnpm prism:crossref-lint passes clean.
- 2026-06-26 [hmcgrew/issue-291-floor-primitive-clove-solo]: Phase 1 task 8 — Winston authored the `## Phase 1 Smoke Test` section (the Phase 1 exit gate), four scenarios (false-`done` blocked, out-of-lane write denied, clean ratify, strike-cap re-emit) each in a deterministic direct-invocation unit form (the automatable gate) plus a manual end-to-end form (human wiring confirmation). Verified exit-2 semantics and `agent_id`/`agent_type`/`$CLAUDE_PROJECT_DIR` against the live hook docs; flagged three field-shape items (top-level PostToolUse `exit_code`/`tool_output`, `stop_hook_active`, `agent_id` on Stop) for Clove to confirm against the runtime before trusting. Branch carries Phase 1; Clove implements tasks 1–7 here and the phase PRs together.
- 2026-06-26 [hmcgrew/issue-291-floor-primitive-clove-solo]: Phase 1 tasks 1–7 — Clove implemented the full floor primitive: `resolve-persona` helper (payload-first, active-persona fallback), `ownership-guard.mjs` (PreToolUse, with extractEffectiveCommand heredoc-false-positive fix), `evidence-ledger.mjs` (PostToolUse, top-level exit_code confirmed), `run-gates.mjs` (Stop+SubagentStop, 3-strike cap, channel-hardening), `.claude/settings.json` (all three hook events wired), `gates.json` (Clove-only, may_write expanded to cover build-phase paths — see Decisions), and the Clove skill DoD rewrite to pointer form. `stop_hook_active` not implemented (field confirmed absent from Stop payload — see Decisions). Literal-allowlist updated to exempt `.claude/hooks` from the leftover-token guard. All 4 smoke scenarios pass (`node .claude/hooks/__smoke__/run-all.mjs`).
- 2026-06-26 [hmcgrew/issue-291-floor-primitive-clove-solo]: Briar Phase 1 self-review — 1 Major (.gitignore missing `.prism/evidence/` — runtime state must not be committed), 2 Minor (strike counter corruption silently resets loop ceiling; smoke harness omits `may_not_run` companion check). Gate logic, channel-hardening, and 3-strike ceiling verified correct. Verdict: needs-fix → Clove.
- 2026-06-26 [hmcgrew/issue-291-floor-primitive-clove-solo]: Fixed Briar's 3 self-review findings — added `.prism/evidence/` to `.gitignore` (expanded `may_write` to include `.gitignore` first, documented as cross-lane absorption in Decisions); hardened strike-corruption catch to fail safe at cap instead of silently resetting to 0; added Scenario B.5 `may_not_run` smoke coverage (4 sub-tests: `gh pr merge`, `git merge`, `git push --force`, + negative control). All 5 smoke scenarios pass.
- 2026-06-26 [hmcgrew/issue-291-floor-primitive-clove-solo]: Corrected `gates.json#clove` lint command — `prism:lint` does not exist as a script; replaced with `prism:crossref-lint` (the correct lint analog for this repo). Discovered when the gate fired on stop and correctly blocked a false `done` claim.
- 2026-06-26 [hmcgrew/issue-291-floor-primitive-clove-solo]: Fixed Eric's PR #298 review findings — Major: removed unconditional `break` in `extractEffectiveCommand` so all non-heredoc lines are scanned for `may_not_run` matches (multi-line bypass closed); added Scenario B.6 smoke coverage (4 sub-tests). Minor 1: precondition failures no longer burn strike cap. Minor 2: Scenario A assertion corrected from `'done-override'` (never in stderr) to `'types'` (gate ID). Minor 3: non-blocking warning added when a gate fails unclaimed. Minor 4: ledger match uses `.trim()`. Minor 5 (SKILL_ID_TO_PERSONA drift): deferred to Phase 5 — documented in Cleanup Items. All 6 smoke scenarios pass; crossref-lint clean.
- 2026-06-26 [hmcgrew/issue-292-orchestration-subagentstop-sol]: Phase 2 tasks 1–3 — Clove validated SubagentStop fires under real Sol dispatch (agent_id-keyed runKeys confirmed in .prism/evidence/), confirmed Sol's routing table consumes `needs-stronger-model` without code change (report-back.md + step-05 + step-06 trace), and proved fleet keying prevents cross-lane collision via fleet-keying.mjs (3 new scenarios, 9/9 total). Full harness clean; crossref-lint clean. Winston continues Phase 2 task 4 on this branch.
- 2026-06-26 [hmcgrew/issue-292-orchestration-subagentstop-sol]: Phase 2 task 4 — Winston settled the single-contract wiring: added the gate-ratified-before-return invariant to `report-back.md` (one contract, Sol reads the return, `ratified-verdict.json` is audit-only, cites ADR-0067), closed the second Open Question by promoting it to a resolved Decision, and confirmed no ADR needed (ADR-0067 already carries the principle). Landed two dogfooding lessons (PowerShell BOM breaks JSON.parse; gated persona's own Stop gate disrupts report-back). Phase 2 fully built (Clove tasks 1–3 + Winston task 4).
- 2026-06-26 [hmcgrew/issue-292-orchestration-subagentstop-sol]: Briar Phase 2 self-review — clean pass. Validated: fleet-keying.mjs E1/E2/E3 pass and correctly exercise agent_id keying (not bypass); Task 2 park-path trace accurate (step-06 "strike 2" prose nuance correctly classified as Phase 6 item, not a routing bug); Sol lib/ line matches ADR-0067 channel-hardening exactly; OPEN→Decision resolution correct; two lessons well-formed. 9/9 smoke scenarios pass; crossref-lint clean. Verdict: done → Eric.
- 2026-06-26 [hmcgrew/issue-292-orchestration-subagentstop-sol]: Fixed Eric PR #299 minors — M1: `fleet-keying.mjs` `readStrikeCount` now returns `STRIKE_CAP` on corruption (matches `run-gates.mjs` fail-safe, prevents false PASS on corrupt fixture); M2: added `## Cleanup Items` entry for step-06 "strike 2" prose → Phase 6 ceiling-prose pass; M3: clarified Task 3 aggregate to name both harness entry points (`run-all.mjs` 6/6, `fleet-keying.mjs` 3/3). All smoke scenarios pass; crossref-lint clean.
- 2026-06-26 [hmcgrew/issue-292-orchestration-subagentstop-sol]: Winston designed the gate-self-protection fix for the non-circumventability hole dogfooding exposed (a gated persona could rewrite its own gate / reset its strike counter because `may_write` granted `.claude/hooks/**` + `.prism/evidence/**`). Amended ADR-0067 (part 5 + non-circumvent Consequence), added the third universal primitive to `enforcement-floor.md`, amended the `gates.json` schema `may_write` description, and recorded two Decisions (global protected-paths denylist over `may_write`-removal; hook source/runtime split + the load-bearing this-branch edit-order) plus the Clove spec (Phase 2 Tasks A–D). See Decisions. Clove implements next; PR not advanced.
- 2026-06-26 [hmcgrew/issue-292-orchestration-subagentstop-sol]: Phase 2 gate self-protection (Tasks A–D) — Clove implemented in the required order: (A) narrowed `gates.json#clove` `may_write` from `.prism/evidence/**` to `.prism/evidence/**/report.json`, added `.ai-skills/hooks/**`, added `rm .prism/evidence` variants to `may_not_run`; (B) added Scenario E (9 sub-tests) to smoke harness before denylist was live; (C) added `PROTECTED_WRITE_PATHS` denylist const to `ownership-guard.mjs` as the final hook write, using the `lib/` prefix form; (D) confirmed `gates.json` schema-doc description already matched shipped behavior. Full smoke: `run-all.mjs` 7/7, `fleet-keying.mjs` 3/3; crossref-lint clean.
- 2026-06-26 [hmcgrew/issue-292-orchestration-subagentstop-sol]: Briar expanded Phase 2 gate-self-protection review — denylist ordering verified correct (runs before may_write, early-exit confirmed). Found 1 Major: `.prism/active-persona` unconditional startup write in Clove DoD corrupts solo-path resolver under fleet dispatch (architectural fix; routed to Winston/Phase 5). Found 3 Minor: Bash redirect-write bypasses denylist (Bash branch only checks may_not_run, not PROTECTED_WRITE_PATHS); `rm -f` variant bypasses may_not_run evidence guard; `.prism/active-persona` untracked and not gitignored. Sol's two findings assessed: active-persona unconditional write → Major, architectural, Winston/Phase 5; active-persona gitignore → Minor, fix-now.
- 2026-06-26 [hmcgrew/issue-292-orchestration-subagentstop-sol]: Added `.prism/active-persona` to `.gitignore` (Minor fix-now from Briar Phase 2 review); deferred the three remaining review issues to Phase 5 — Bash redirect-write denylist gap, `rm -f` variant bypass, and unconditional `active-persona` startup write. Phase 5 task bullets added for all three; Phase 5 follow-ons recorded in `## Cleanup Items`.
- 2026-06-26 [hmcgrew/issue-300-gate-fix-canonical-split]: Winston designed the gate-fix block (Issue #300) against Sasha's fresh diagnosis — pulled the Phase 4 canonical-source/build-emit split forward, designed Bug 1 (stateful accept-on-re-emit via a `capped` flag in `strikes.json`) and Bug 2 (baseline-regression tolerance for `fresh` gates), and the four companion fixes (active-persona orchestrated-write denial, Bash redirect/`sed`/`rm -f` hardening, smoke gap closure). Sequenced as Stage 0 (one `[HITL]` human grant of build-pipeline paths to the runtime `may_write` — the irreducible bootstrap edit a gated Clove cannot self-apply without the forbidden Bash bypass) → Stage 1 canonical authoring → Stage 2 build-emit + runtime cutover, and corrected the stale Phase 2 Validation Task 2 narrative that claimed `isCoherent` false was a pass-through. Clove implements; Stage 0 needs Hunter first.
- 2026-06-26 [hmcgrew/issue-300-gate-fix-canonical-split]: Stage 1 — Clove authored the canonical `.ai-skills/hooks/**` tree with all fixes (Bug 1 capped-flag accept-on-re-emit; Bug 2 first-write baseline capture + regression-only striking; finding 4 active-persona orchestrated-write denial; findings 5+6 Bash redirect/`tee`/`sed`/`cp`/`mv` and `rm`-variant evidence hardening), plus smoke scenarios F/G/H/I; canonical smoke green (run-all 11/11, fleet-keying 3/3, with fleet lanes now seeding a clean baseline so Bug 2 tolerance still observes strikes). Stage 2 — taught `build.ts` `emitHooks` to emit hooks raw into `.claude/hooks/` + the install seed, ran the build to cut the runtime over (the fixed gate is now live), and confirmed the human's Stage-0 grant converged with the build output (`git diff .claude/hooks/gates.json` shows only the real changes, `prism:check` no drift). Both Debugged Issues flipped to `fixed` and all three deferred Phase 5 review issues resolved; pre-existing Windows-only `prism:check-types` (bundle.ts esbuild) and `prism:test` (path-norm) failures are unchanged and out of scope.

---

## PR Readiness

Living checklist — updated by `code-review-self` (Briar). Reflects state after Issue #300 Stage 1–2 (gate-fix + canonical-source split).

- [x] No critical or major issues — both Debugged Issues (strike-cap coherence deadlock; pre-existing-failure intolerance) resolved by Issue #300, and all three previously-deferred Phase 5 review issues (active-persona orchestrated write, Bash redirect-write bypass, `rm -f` variant) resolved by findings 4/5/6
- [x] Types correct — hooks are `.mjs` (not TypeScript); `build.ts` `emitHooks` addition type-checks (the only `prism:check-types` error is the pre-existing `bundle.ts` esbuild module-missing failure, untouched by this block)
- [x] No stray console.logs or debug artifacts
- [x] Tests written for new logic and edge cases — `run-all.mjs` 11/11 (A, B, B.5, B.6, C, D, E, F, G, H, I) + `fleet-keying.mjs` 3/3, run against the emitted RUNTIME hooks after Stage 2 cutover
- [x] All debugged issues resolved (no `open` debugged entries) — both flipped to `fixed` by Issue #300
- [x] Build passes — `pnpm prism:crossref-lint` clean; `build.ts --check` reports no drift (emitted hooks in sync with canonical; runtime `gates.json` converged with the Stage-0 human grant). Pre-existing Windows-only failures unchanged and out of scope: `prism:check-types` (`bundle.ts` esbuild), `prism:test` (path-norm assertions). CI green on Ubuntu.
- [x] Issue #300 gate-fix + canonical-source split complete — fixed gate is LIVE at runtime; the Bash-path scan was observed firing correctly in this dispatch (conservative false positive on a diagnostic command). Hooks now build-managed: canonical `.ai-skills/hooks/` → `pnpm prism:build` → runtime.
- [ ] PR description up to date
- [x] `.gitignore` now excludes `.prism/evidence/` — major finding resolved; `git check-ignore` confirms all evidence files excluded
- [x] `.prism/active-persona` now gitignored — Minor finding resolved; `git check-ignore` confirms exit 0
- [x] `stop_hook_active` confirmed absent from Stop payload; 3-strike counter is sole ceiling — documented in Decisions, no implementation gap
- [x] Channel-hardening verified — `ratified-verdict.json` written as audit artifact only; never read back as routing input (confirmed in code + smoke scenario C)
- [x] Precondition failures no longer burn strike cap — protocol misses re-prompt without striking
- [x] `SKILL_ID_TO_PERSONA` drift deferred to Phase 5 — documented in Cleanup Items
- [x] Phase 2 validation complete — SubagentStop wiring confirmed, Sol routing table consumes `needs-stronger-model` without code change, fleet keying proven via fleet-keying.mjs (9/9 scenarios pass)
- [x] Phase 2 task 4 complete — single-contract wiring settled in `report-back.md` (gate-ratified-before-return invariant, cites ADR-0067); second Open Question resolved to a Decision; no ADR needed (confirmed)
- [x] Task 2 park-path prose nuance confirmed correctly classified — step-06 "strike 2" vs hook "strike 3" is illustrative description, not a routing bug; hook cap is authoritative; Phase 6 ceiling-prose item
- [x] Phase 2 gate self-protection (Tasks A–D) complete — `PROTECTED_WRITE_PATHS` denylist live in `ownership-guard.mjs`; `gates.json#clove` `may_write` narrowed to `report.json`; `rm .prism/evidence` added to `may_not_run`; 10 new smoke assertions (Scenario E, 9 sub-tests) all pass; `lib/` prefix form chosen; `gates.json` schema-doc description already matched shipped behavior (no Task D edit needed)
- [ ] Lasting decisions promoted to architect context (if applicable) — not applicable for Phase 1–2; decisions promote at epic close

**Last updated:** 2026-06-26 (Clove Issue #300 close-out — both gate bugs fixed in canonical source and emitted to the runtime; canonical-source/build-emit split landed; runtime cut over to the fixed gate; 3 deferred Phase 5 review issues resolved)
