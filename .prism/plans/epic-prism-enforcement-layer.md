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

### Phase 6 — Ceiling-prose pass: procedural & accurate, persona by persona

**Clove + owning-persona review** (parallelizable; one sub-issue per persona)
1. Rewrite each skill body so vague judgment lines become **named procedures with typed escapes** (the `prism-code-dev-senior.md` pattern): precise trigger + sanctioned exit verdict per procedure. Hold every line to the **factual-grounding bar** (see Decisions) — each procedure maps to a real action; the trigger calibrates reasoning depth; the escape prevents loops. Goal (Hunter's words): every persona is "procedural and accurate to its job."
2. Apply `skill-authoring.md` disclosure gate during each rewrite — PIN lenses, externalize modes/conditional procedures, do not bloat the body. The ceiling pass sharpens; it must not flatten the importance hierarchy.
3. Include the 3 utilities in this pass (prose only — no gates entry).

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

## Open Questions

- **OPEN — TBD, needs Hunter input.** Whether Phase 4 emits hooks into `.codex/` now or defers until Codex hook parity is confirmed. **Default path (used until resolved):** emit to `.claude/` + `templates/install/` only; gate `.codex/` emission behind a confirmed-parity check, since leg 1 portability is explicitly not a near-term driver.
- **OPEN — TBD, needs Hunter input.** Whether `report.json` *is* the structured return Sol reads, or Sol reads its own schema return and the hook only guarantees they agree. **Default path:** make them one contract (Phase 2 task) and have Sol read the return; revisit only if a divergence surfaces in Phase 2 validation.

---

## History

- 2026-06-25 [main]: Plan created — PRISM enforcement layer epic. Evaluate pass recommended Proceed-with-changes; redesigned the prototype's three weakest mechanisms (active-persona file → payload-first resolve; session_id → agent_id keying; ratified-file routing → channel-hardening). Scoped 7 phases; gate-strength taxonomy classifies all 28 personas A/B/C. See Decisions for the inversion principle (ADR-0067) and the Sol-independence reframe.
- 2026-06-25 [main]: Elevated the ceiling to co-equal with the floor per Hunter — the instructions themselves must make the model stronger (anti-loop, calibrated reasoning), grounded in real factual actions. Added the factual-grounding bar to Decisions and the Goal/Context framing.
- 2026-06-25 [main]: Added handoff enforcement per Hunter — required `next_route` field + verdict↔route coherence check, enforced identically with/without Sol; ownership already forces handoff negatively. Never auto-invokes the next persona (human gate preserved). Updated contract (Phase 0), gate (Phase 1), and AC.
- 2026-06-25 [hmcgrew/issue-290-contract-schema-foundations]: Phase 0 tasks 1–2 — Winston authored the inversion-principle ADR (inversion, channel-hardening, handoff enforcement, factual-grounding bar, Briar caveat) and the gate-strength taxonomy doc `.prism/architect/_toolkit/enforcement-floor.md`; routed it into the skill-body manifest globs. The plan reserved ADR-0062, but 0062–0066 already landed on main (consumer-boundary epic), so the ADR is **0067** (next free); all plan/doc references updated. Both new files excluded from the consumer seed (PRISM ships zero ADRs per ADR-0064; the taxonomy doc is internal enforcement-architecture guidance). Clove continues Phase 0 (tasks 3–4: report-contract + gates.json schemas) on this branch.
- 2026-06-25 [hmcgrew/issue-290-contract-schema-foundations]: Phase 0 tasks 3–4 — Clove authored the report contract schema (`.prism/references/enforcement/report-contract.md`) and the gates.json structural schema (`.prism/references/enforcement/gates.json`). Report contract defines all seven fields, the verdict enum (citing `report-back.md` as authoritative), `next_route` derivation/validation rule with Clove as the worked example, and a JS reference validator including the verdict↔route coherence check. Gates.json schema defines the per-persona entry shape (`writes_report_to`, `preconditions[]`, `gates[]`, `unverifiable_boxes[]`, `ownership`, `allowed_routes[]`) with `CheckSpec` and `OwnershipMatrix` as nested definitions; documents the `{{commands.*}}` token convention. Phase 0 now fully built; handoff to Briar for self-review.
- 2026-06-25 [hmcgrew/issue-290-contract-schema-foundations]: Briar self-review — 1 Major (install-seed crossref-lint failure: report-contract.md carries forbidden ADR-0067 refs + 6 dangling links in templates/install/), 2 Minor (needs-stronger-model injection next_route undocumented; enforcement-floor.md count claim). Verdict: needs-fix → Clove.
- 2026-06-25 [hmcgrew/issue-290-contract-schema-foundations]: Clove fixed Briar's 3 review findings — excluded enforcement reference files from consumer seed (seed-curation.json + git rm); documented gate-injected next_route for needs-stronger-model in report-contract.md coherence table; replaced count claim in enforcement-floor.md with role-based description. All mirrors rebuilt; pnpm prism:crossref-lint passes clean.

---

## PR Readiness

Living checklist — updated by `code-review-self` (Briar). Reflects state after Phase 0 self-review.

- [ ] No critical or major issues — **BLOCKED: 1 Major open (install-seed crossref-lint failure)**
- [x] Types correct — no `any`, no unsafe `as` (schema files; no TypeScript source in Phase 0)
- [x] No stray console.logs or debug artifacts
- [x] Tests written for new logic and edge cases (Phase 0 is schema/docs only; no runtime logic to test)
- [x] All debugged issues resolved (no `open` debugged entries)
- [ ] Build passes — `pnpm prism:crossref-lint` fails: 3 forbidden ADR refs + 6 dangling links in `templates/install/`. `pnpm prism:check` (build sync) passes. `pnpm prism:check-types` fails on pre-existing `bundle.ts` esbuild error (Windows, pre-dates this branch).
- [ ] PR description up to date
- [ ] Lasting decisions promoted to architect context (if applicable) — not applicable for Phase 0; decisions promote at epic close

**Last updated:** 2026-06-25
