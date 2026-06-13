# Plan: epic-prism-conductor

## Ticket

PRISM Phase 4 — Sol (the Conductor: goal-driven orchestration persona). No parent Linear ticket yet; internal PRISM phase. Prefer creating a parent ticket in Linear before implementation (Nora).

## Goal

Introduce **Sol**, a goal-driven orchestration persona whose single job is to dispatch the existing PRISM personas across the whole lifecycle toward a stated goal — decomposing the goal into phases, threading the existing human gates (never bypassing them), routing each persona's report-back verdict to the right next persona, and containing failures per-lane in fleet runs — while never doing or interpreting any persona's work itself. PRISM keeps working exactly as today when Sol is not invoked; Sol is an additive conductor, not a replacement for hand invocation.

---

## User Stories

- As a PRISM consumer, I want to hand a well-specified goal (e.g. "build this CMS from our SPECs") to one orchestrator persona, so that I don't have to manually invoke Parker → Mira → Pixel → Winston → Nora → Clove → Briar → Eric by hand for every unit of work.
- As a PRISM consumer, I want the orchestrator to pause at every existing human gate (Winston's A/P/C, Nora's Definition of Ready, Eric's review, the human merge), so that automation never removes the scrutiny those gates exist to provide.
- As a PRISM consumer, I want the orchestrator to refuse to dispatch implementation against a vague plan, so that a fuzzy plan is caught and re-planned instead of producing divergent code.
- As a PRISM consumer, I want a single failure in one unit of a fleet run to park that one unit and keep the others moving, so that one stuck ticket doesn't halt eight.
- As a PRISM consumer, I want the orchestrator to escalate a stalled worker from the cheap model to the stronger one (and to re-plan when the plan is the problem), so that the run adapts instead of looping on the same failure.
- As a PRISM consumer, I want each dispatched persona to keep its own rules, voice, and autonomy, so that the orchestrator stays a thin conductor and never becomes a god-skill that re-implements everyone.

---

## Design

Sol is a **persona on a third axis** — *orchestration* — orthogonal to the existing ticket-flow personas (Winston, Clove, …) and the cadence-driven personas (Zoe). It generalizes the proven `prism-review-loop` pattern (loop-to-done-condition, route-by-certainty, pass budget, three-strike survival, phase-boundary handoff gates) from the review segment to the whole lifecycle, and gives it a voice.

### Core invariant — autonomy between gates, never through them

Sol drives autonomously *between* gates and stops *at* them — but a gate is not unconditionally human. Each gate is owned by a persona (Winston for plan approval / A/P/C, Nora for Definition of Ready), and that persona judges its own gate against a human-set **autonomy policy** (see below), returning one of three dispositions: `auto-cleared` (low-stakes, within policy — proceed), `needs-human` (the persona escalates regardless), or `blocked` (policy forces a human). Sol never judges a gate — it dispatches the owning persona and routes the disposition. The invariant holds in its strict form: *Sol* never clears a gate; the gate's *owner* clears or escalates it. The one unconditional gate is **merge**, enforced by branch protection at the infrastructure level (ADR-0011) — not even a maximally-autonomous Sol can merge a protected branch, so merge is never a disposition any persona returns; every lane parks there for the human. This conditional-gate model, plus the strict no-Sol-clearing rule, is the ADR (ADR-0048) this epic ships.

### Sol dispatches; it never does or interprets the work

Sol has **no authoritative write path**. It writes only its own goal-state file (pointers + run-control). It never writes code (Clove's lane), never writes Linear (Nora's lane), never merges (the human's). Its dispatch verbs are thin and map onto each persona's existing trigger surface: *"your turn,"* *"here's the plan, implement,"* *"here's a bug, investigate,"* *"here are issues that might be ticket-worthy."* Each persona then runs its full, unmodified startup and rules.

### Two-channel communication — plan-as-bus + run-control

Personas "talk to each other" through the **branch plan**, exactly as they already do (Briar writes `## Review Issues`, Clove reads and fixes; Sasha writes `## Debugged Issues`, Winston reads them into tasks). Sol adds a thin second channel:

- **The branch plan = the durable content bus.** Decisions, tasks, findings, history — the real conversation. On-disk, compact, survives compaction. Plans stay the source of truth (ADR-0001).
- **The goal-state file = the ephemeral run-control channel.** Phase pointer, per-lane status, strike tables, failure counts, escalation flags, per-dispatch model tier. Holds pointers into plans, never work content.

Sol's dispatch message stays minimal ("Clove — your turn, plan at `<path>`, tasks 3–5, report back"); the work content rides the plan; the run-state rides goal-state. No transcript-passing between personas — that is what keeps context tight enough for Sol-on-Opus to run a Sonnet fleet.

### Dispatch engine — the Workflow tool, gate-segmented

Sol dispatches through a deterministic orchestration script (Claude Code's Workflow tool; the `@openai/codex-sdk` / `@cursor/sdk` equivalents on other runtimes). The script's variables hold the run-state, so it never competes for Sol's context window — the decisive advantage at lifecycle scale. Each dispatched persona is materialized as a compiled per-runtime **agent definition** (the build emits `.claude/agents/`, `.codex/agents/`, `.cursor/agents/` from the same canonical persona source it already compiles skills from), so a worker loads its full persona at spawn — no dynamic skill invocation needed. Per-agent `model` override sets the tier; `schema` returns the report-back verdict; `isolation: 'worktree'` gives each lane its own checkout; `budget` bounds the run; `resumeFromRunId` resumes a stopped run.

**Gate-segmented, dynamically.** Sol does not talk to running workers — a worker does its job and returns a structured verdict plus a summary/handoff of its progress. The script runs each lane forward through its phases autonomously, clearing `auto-cleared` gates in place without returning to Sol. It breaks out to Sol only when a lane returns `needs-human` / `blocked`, completes, or trips a budget. Sol — the conversational main loop — then surfaces those gates to the human, takes the input, and launches the next workflow segment. The workflow is the autonomous parallel engine *between* human touchpoints; Sol is the conversational gatekeeper *at* them. The segment boundary is dynamic ("run until a lane needs a human or finishes"), not fixed per phase — auto-cleared gates extend the autonomous run.

**One engine, not two.** Pipeline and fleet are the same mechanism over a different lane count — a pipeline run is a one-lane fleet. `pipeline(lanes, …)` per-lane independence gives failure containment for free: a lane that throws drops to `null` and skips its remaining stages while the others continue.

### Conditional gates and the autonomy policy

The human sets an **autonomy policy** at run start (Sol asks it at intake alongside the pipeline/fleet question), reusing Parker's stakes-calibration vocabulary:

- **launch** — gates stay human; Winston and Nora always return `needs-human`. Max scrutiny.
- **internal** — personas self-clear the clearly-simple cases and escalate on judgment. The balanced default.
- **hobby/spike** — maximum autonomy; personas escalate only on genuine risk.

The rule is one-directional: a persona can always escalate *up* (`needs-human` even under a permissive policy) but never *down* (no `auto-cleared` when the policy locked the gate). The human holds the ceiling; the owning persona exercises judgment beneath it.

**Auto-cleared is never invisible.** Every `auto-cleared` gate is recorded in the plan with the persona's stakes reasoning, and surfaced in Sol's end-of-run report. Autonomy moves the human from *in-the-loop* (approve before) to *on-the-loop* (review after) — it never goes dark, and merge remains the hard human backstop on every lane.

**Gate resolutions carry full provenance — and the gate owner writes them, not Sol.** When a `needs-human` gate resolves, the record lands as a single `## Decisions` entry authored by the gate's owning persona, capturing escalation reason, the human's answer, and the rationale — the existing `OPEN —` decision lifecycle, triggered at runtime instead of at planning time. Sol logs the gate *event* in goal-state (who escalated, why, resolved-at) for routing and the end-of-run report, and carries the human's answer back to the owner on re-dispatch ("Winston — Hunter answered: [Y]. Record it and re-judge."). Sol never writes the plan; the two channels split the labor — the ephemeral event in goal-state, the durable decision in the plan. The owning persona writes a better record than Sol could, because it has the architectural context Sol lacks.

### Plan Readiness Gate — the firewall

Before Sol dispatches an implementing persona for a phase, the phase's plan must pass the detail bar (`implementation-task-detail.md`, ADR-0033): any LLM at any effort executes it without judgment calls. Failure is a hard pause that routes back to Winston to re-plan in more detail — not "proceed carefully." This is the single highest-leverage gate, because a Sonnet worker dispatched against a fuzzy plan is exactly where two runs diverge.

### Model tiering (Claude Code: Sonnet + Opus)

| Role | Default model | Escalation |
| --- | --- | --- |
| **Sol (Conductor)** | **Opus** (default, not hardcoded) | n/a — already top tier |
| **Winston (architect/plan)** | **Always Opus, never weaker** | n/a — the firewall never runs cheap |
| Worker personas (Clove, Sasha, Briar, Eric, …) | **Sonnet** | → Opus on signal (Sonnet stalled the unit twice / strike 2) |

A Plan Readiness Gate failure means *re-plan harder* (Winston is already Opus), not *escalate the model*. The tier per dispatch is read off the goal-state lane and set via the runtime's per-dispatch model override; a config seam lets other runtimes map their own tiers.

### The four reliability mechanics

1. **Failure modes — three nested budgets.** Per-unit strike budget (the three-strike rule, generalized: same defect survives 3 fix attempts → pause the unit, surface survival history); per-phase failure budget (N consecutive hard failures of the same persona on the same unit → stop that phase, report); global run budget (total dispatch cap so a runaway can't burn unbounded). A "failure" is narrow — a persona can't complete its job, a verification command hard-fails repeatedly, or a defect survives the strike budget. A persona's "no" is **not** a failure.
2. **Escalation modes — three axes, each trigger → target.** *Needs a better plan* → Winston (re-plan mode), triggered by a Plan Readiness Gate failure or a worker reporting guesswork. *Needs a stronger model* → bump the tier on the next dispatch of that persona, triggered by Sonnet stalling twice. *Needs a human* → hard pause and surface, triggered by an `OPEN —` decision, the disagreement fast-path (a fixer who believes the finding is wrong escalates immediately, not via strikes), or an inherently human gate.
3. **Report-back protocol — a primary verdict plus optional secondary signals.** Every dispatched persona writes content to the plan **and** returns to Sol a *primary verdict* — `done · blocked · needs-replan · needs-stronger-model · needs-human` — plus an optional list of *secondary signals* it noticed in passing (`found-bug`, `found-followup-work`, observation), each with a note and a routing target. A dispatch is often `done` *and* surfaced a follow-up; one enum value can't carry both, so the primary verdict routes the lane while each signal routes independently. Sol's routing is deterministic: primary `done`→advance · `needs-replan`/`blocked`→Winston · `needs-human`→pause and report; secondary `found-bug`→Sasha · `found-followup-work`→Nora (through her scope-fit + DoR gate). Sol routes verdicts and signals; it never interprets them.
4. **Fleet mode — failure containment + conflict gate.** Fleet is the dispatch engine run over multiple lanes — one engine; a pipeline is a one-lane fleet. `pipeline(lanes, …)` per-lane independence contains failures natively: a lane that throws drops to `null` and skips its remaining stages while the others continue. Per-lane isolation via worktree (`worktree-isolation.md`, extended past Eric). **Conflict gate (chosen default): refuse to parallelize lanes with overlapping blast radius** — shared types, the same architect doc, the same plan file — and serialize those instead; fail safe, not fast. `needs-human` pauses across lanes are **batched** into one end-of-segment report ("4 lanes parked at merge, 2 need you, 2 running"), never one ping per lane.

### Persona name

Skill ID `prism-conductor`; persona **Sol** (they/them). Both locked.

---

## Implementation Tasks

Grouped into six sub-PRs (PR-C.1 … PR-C.6). Every task hits the detail bar per `.prism/rules/implementation-task-detail.md` — front-loaded file paths, content outlines tight enough that structure isn't invented, verification commands, and sequence dependencies. New-file content is given as an outline (per the bar's new-file allowance), matching the fidelity of `epic-prism-ren.md`.

### Group 1 (Foundation) = PR-C.1 + PR-C.2, shipped as one PR

**Branch:** `hmcgrew/prism-conductor-foundation`
**Depends on:** nothing — foundation lands first.
**Blocks:** PR-C.3 … PR-C.6.
**Verification (run from repo root, in order, after every task that touches build inputs):** `pnpm prism:build && pnpm prism:check && pnpm prism:check-types && pnpm prism:test`. Note `pnpm prism:build` runs `prism:test` as its tail, and `pnpm prism:check` runs both `prism:test` and `prism:verify-manifest` — so `prism:build` then `prism:check` is the full gate. `prism:check-types` type-checks `scripts/ai-skills/` only (matters for the build-extension task).

> **Reconciliation note (Winston, 2026-06-13).** The pre-execution tasks below were rewritten against the actual repo on branch `hmcgrew/prism-conductor-foundation`. Five plan-vs-reality gaps were corrected — see the `## Decisions` entry "Group 1 reconciliation (Winston, 2026-06-13)". The big one: the build emits **only** `.codex/agents/<id>.toml` today; there is no `.claude/agents/` or `.cursor/agents/` emitter, so "the build already compiles agent definitions for all three runtimes" was false. The agent-definition build is scoped down to **Claude-only** for Group 1 (Claude is the reference dispatch adapter) and the codex `.toml` adapter already covers Codex; Cursor is deferred.

#### Clove (implementation)

**Task numbering is continuous 1–11 across the combined PR.** Tasks 1–8 are the scaffold + agent-definition build (was PR-C.1); tasks 9–11 are the goal-state primitive (was PR-C.2). Run them in order — later tasks depend on earlier ones as noted.

1. **Register the role** in `.ai-skills/definitions/roles.json`. Add this object to the `skills` array (append after the existing `prism-surface-audit` entry on line 74, before the `prism-handoff` utility entry — persona entries are grouped before utility entries):
   ```json
   {
     "id": "prism-conductor",
     "persona": "Sol"
   },
   ```
   Use the `{ "id", "persona" }` shape — **not** `type: "persona"`. The actual schema (confirmed in `scripts/ai-skills/build.ts` `buildRoleMap`, lines 646–677) is: persona skills carry `{ id, persona }` and omit `type`; only utility skills carry `type: "utility"`. A `type: "persona"` value would validate (the discriminator accepts `"persona"`) but it is non-idiomatic — every existing persona omits `type`. Pronouns and the orchestration-axis note do **not** live in roles.json (it has no field for them) — they live in `frontmatter.yml` and `shared.md` (tasks 3–4). Verification: `pnpm prism:check` (runs the role validator inside `build.ts` + `prism:verify-manifest`).
2. **Create canonical skill directory** at `.ai-skills/skills/prism-conductor/`. No content yet — tasks 3–6 populate it. (The build auto-discovers any directory under `.ai-skills/skills/` and will fail in task 7 if `frontmatter.yml` + `shared.md` are absent, so do not run the build until task 6 is done.)
3. **Write `frontmatter.yml`** at `.ai-skills/skills/prism-conductor/frontmatter.yml`. Match the real field set used by existing skills (confirmed against `prism-refactor-scout/frontmatter.yml`): `name`, `description`, `argument-hint`, `category`. There is **no** `displayName` or `pronouns` field in frontmatter — the persona name and pronouns live in the `description` and `shared.md` body. Content:
   - `name: prism-conductor`
   - `description:` folded (`>`) scalar, ≤1000 chars (enforced by `MAX_FRONTMATTER_DESCRIPTION_LENGTH`; `discovery-metadata.test.ts` asserts it), target 250–400, shaped per `skill-authoring.md` § Description field shape: sentence 1 = "Sol — the Conductor: goal-driven orchestration persona."; sentence 2 = WHAT (decomposes a goal into lifecycle phases, dispatches the existing PRISM personas, pauses at every human gate, routes report-back verdicts, contains failures per-lane in fleet runs); sentence 3 = load-bearing exclusion ("Never writes code, tickets, or merges — only dispatches and tracks run-state."); `Triggers:` line = `"Sol", orchestrate, run the fleet, drive this from the SPEC, build this end to end, goal-driven run, conductor`.
   - `argument-hint: "[goal statement | resume | pipeline | fleet]"`
   - `category: orchestration`
4. **Write `shared.md`** at `.ai-skills/skills/prism-conductor/shared.md`. Open with the persona blurb as the first line (no heading — match `prism-refactor-scout/shared.md` line 1, which opens `You are **Ren** (he/him), …`). Sections in order:
   - Persona blurb (first line, no heading) — `You are **Sol** (they/them), the Conductor` — calm air-traffic-controller posture; dispatches and tracks, never does the work. State explicitly: "Sol never takes on another persona's role — it tells them it's their turn and hands them the pointer."
   - `## Intro` — greeting examples ("Sol here. What's the goal, and is this one unit or a fleet?", "Sol reporting in. Point me at the SPEC and I'll line up the phases.").
   - `## How Sol thinks` (the cognitive lens — PIN, never externalize): the autonomy-between-gates-never-through-them invariant; dispatch-don't-do; route-a-verdict-never-interpret-one; the plan is the bus, goal-state is run-control.
   - `## When this skill is invoked` — startup batch: read git context, read `.prism/skills/prism-conductor/lib/goal-state.md` for the schema (lands in task 9), read an existing goal-state file (`.prism/conductor-state.json`) if present for resume, read `.prism/architect/manifest.json`, run plan lookup per `.prism/rules/branch-plan.md`. (Mirror the startup-batch shape in `prism-refactor-scout/shared.md` lines 17–22.)
   - `## Workflow overview` — state that the step files land in Group 2 (`.prism/skills/prism-conductor/step-01-*.md …`) and cite them; do not restate step bodies (per `implementation-task-detail.md` § Cite, don't restate). Until Group 2 lands, this section names the planned step sequence as a forward reference.
   - `## Model tiering` — the table from `## Design` (Sol=Opus default; Winston=always Opus; workers=Sonnet→Opus on signal). Cite `claude.md` for the runtime override mechanism.
   - `## Per-team orchestration notes` — a one-line stub ending with the `<!-- atlas:specializes-in -->` anchor so Atlas can inject team-specific phase ordering. (Anchor must be in a skill-source file, never a reference — per `skill-authoring.md` § Externalization mechanics. `shared.md` is a valid anchor home.)
   - `## Definition of Done` — Sol has either driven the run to `done`, paused at a gate with state saved, or stopped on a budget with a report.
   - `## Lessons Check` + the standard reflex bullets (context-reuse per `.prism/rules/context-reuse.md`, History 3-sentence cap, plan lookup). Match the reflex-bullet shape used in other skills' `shared.md`.
5. **Write `claude.md`** at `.ai-skills/skills/prism-conductor/claude.md`. Names the Claude Code dispatch surface: Sol authors and invokes a **Workflow** script per autonomous segment — `pipeline(lanes, …)` for per-lane phase chains, `agent()` calls with `agentType` (the compiled agent definition from task 8 — `.claude/agents/<persona>.md`), `model` (the tiering), `schema` (the report-back verdict), `isolation: 'worktree'` (per lane), and `budget` (the global cap). The script clears `auto-cleared` gates in place and returns to Sol on `needs-human` / `blocked` / completion / budget; Sol surfaces gates conversationally, then launches the next segment (`resumeFromRunId` to resume). Personas are dispatched via compiled per-runtime agent definitions (task 8), not dynamic skill invocation. Sol uses Read/Glob/Grep and writes only `.prism/conductor-state.json` (its own run-control state) plus chat; never Edit on source. (The generated `SKILL.md` concatenates `shared.md` + `claude.md` per `build.ts` `buildSkillMarkdown` — keep `claude.md` to Claude-specific tool/dispatch detail, not a restatement of `shared.md`.)
6. **Write `codex.md` and `cursor.md`** at the same dir. Both are required by the build's `loadSkillSource` only as optional (`readFileIfExists`) — but write both for parity with every existing skill. Parallel structure to `claude.md`, describing the sequential-dispatch-with-`prism-handoff`-compaction fallback for runtimes without subagent fan-out / per-skill model pinning (note the known Cursor/Codex model-pin limitation already documented in `prism-review-loop`). Codex dispatches via the existing `.codex/agents/<id>.toml` adapters (task 8 does not change those).
7. **Run `pnpm prism:build`** from repo root. Verification: the build discovers `prism-conductor` and emits the skill mirrors at `.claude/skills/prism-conductor/SKILL.md`, `.agents/skills/prism-conductor/SKILL.md` (Codex skill mirror — note `.agents/`, gitignored), `.cursor/skills/prism-conductor/SKILL.md`, and the codex agent adapter `.codex/agents/prism-conductor.toml` (emitted automatically because the role is a persona, not a utility — see `build.ts` line 824). Then run `pnpm prism:check` to confirm no drift.
8. **Extend the build to emit Claude agent definitions** at `scripts/ai-skills/build.ts`. Scope: **Claude only** (`.claude/agents/<persona>.md`) for Group 1 — the codex `.toml` adapter already exists (lines 824–841) and Cursor is deferred (see the reconciliation Decision). Concretely:
   - Add a path to `paths.json` `generated`: `"claudeAgentsRoot": ".claude/agents"`. Mirror the `codexAgentsRoot` pattern (`paths.json` line 10).
   - In `main()`, inside the per-skill loop (after the codexAgents block, ~line 841), add a Claude agent-definition emitter guarded by `roleDefinition.type !== "utility"` (utilities get no agent definition — match the codex guard). Write `<claudeAgentsRoot>/<skillId>.md`. The file is a Markdown agent definition: YAML frontmatter carrying `name: <skillId>`, `description: <frontmatter description>`, and `model:` (default tier — `opus` for `prism-architect` and `prism-conductor`, `sonnet` for all other personas; encode this as a small map in the build, keyed by skillId, defaulting to `sonnet`), followed by the generated Claude `SKILL.md` body (reuse `claudeMarkdown` already built at line 742). Prepend the `GENERATED_HEADER_LINE` comment block (match the codex adapter header shape, lines 126–131, in Markdown-comment form).
   - Add an `optedIn.claudeAgents` gate mirroring `optedIn.codexAgents` (lines 716–718) using a new `claudeAgentsRootHasManagedContent` helper, OR reuse the directory-marker approach — simplest: gate on `!checkMode || (await pathExists(targetRoots.claudeAgents))`. State which you chose in the PR body.
   - Add cleanup: call a `removeDeletedManagedAgentFiles`-equivalent for `.claude/agents/` (the existing function at line 602 keys off `.toml`; either generalize it to take an extension or add a `.md` sibling). Use `agentSkillIds` (line 940) so a skill flipping to utility gets its stale `.md` cleaned up.
   - Add the new roots to `targetRoots` (line 698) and `literalGuardRoots` (line 945) so emitted agent defs are scanned for Thrive-flavored literals.
   - **Tests:** add a unit test in a new or existing `scripts/ai-skills/*.test.ts` asserting the Claude agent-def emitter produces frontmatter with the right `model` per skillId and that utilities are skipped. The build's own `prism:test` (run by `prism:build`) must stay green.
   - Verification: `pnpm prism:build` emits `.claude/agents/<persona>.md` for every persona (not utilities); `pnpm prism:check` reports no drift; `pnpm prism:check-types` passes for `scripts/ai-skills/`. **If this task's diff grows past ~150 lines or the model-map design needs discussion, stop and flag it — it is a candidate to split into its own PR within Group 1** (the agent-def build is the one genuinely novel piece of code in the foundation; everything else is content).

9. **Write the state schema doc** at `.prism/skills/prism-conductor/lib/goal-state.md` (following Ren's `lib/state.md` precedent — `.prism/skills/prism-refactor-scout/lib/state.md` — schema lives in the skill's lib, not architect). Note the file/doc split confirmed against Ren: the **schema doc** is tracked and lives here; the **runtime state file** is `.prism/conductor-state.json` at `.prism/` root, gitignored (task 11 adds the gitignore lines), matching `.prism/ren-state.json`. Cover: the need (run-control across per-phase fresh contexts; survival state must travel); read at every dispatch boundary, write at every phase transition; atomic write (`.tmp` + rename) per `.prism/rules/lazy-artifacts.md`; returns `null` on absent (lazy — never seeded at session start); plans stay source of truth, goal-state holds pointers only. Mirror Ren's `lib/state.md` section shape: Schema (v1) / Read protocol / Write protocol / Mutate protocol / Resume detection / Corruption recovery. Include the full schema as a fenced JSON block:
   ```json
   {
     "version": "1",
     "lastUpdated": "ISO-8601",
     "goal": "one-line goal statement",
     "runShape": "pipeline | fleet",
     "autonomyPolicy": "launch | internal | hobby",
     "runId": "workflow run id or null",
     "conductorModel": "opus",
     "status": "running | paused | blocked | done | stopped",
     "globalBudget": { "maxDispatches": 100, "spent": 0 },
     "lanes": [
       {
         "laneId": "slug",
         "unit": "ticket id or feature slug",
         "planPath": ".prism/plans/<id>.md",
         "worktree": "path or null",
         "currentPhase": "prd | stories | design | plan | plan-readiness | implement | self-review | pr-review | qa | docs | done",
         "phaseStatus": "running | awaiting-gate | parked | done",
         "status": "active | parked | blocked | done",
         "models": { "winston": "opus", "clove": "sonnet" },
         "strikes": [ { "issueKey": "string", "count": 2, "history": ["ISO-8601"] } ],
         "failureCount": 0,
         "escalation": { "axis": "replan | model | human", "reason": "string", "raisedAt": "ISO-8601" },
         "lastVerdict": "done | blocked | needs-replan | needs-stronger-model | needs-human",
         "signals": [ { "kind": "found-bug | found-followup-work | observation", "note": "string", "routedTo": "persona or null" } ],
         "gate": { "type": "plan-readiness | a-p-c | review | dor", "disposition": "auto-cleared | needs-human | blocked", "clearedBy": "persona name or null", "reasoning": "stakes reasoning when auto-cleared", "since": "ISO-8601" }
       }
     ],
     "pendingHumanReport": ["string"]
   }
   ```
   Document that `runId`, `escalation`, `gate`, and per-strike entries are nullable/absent when inactive; that `autonomyPolicy` is set at intake (launch/internal/hobby); and that `runId` points at the active Workflow run while the plan stays the source of truth.
10. **Add manifest routing** in `.prism/architect/manifest.json`. Add the key `".prism/skills/prism-conductor/**": "spec-editing.md"` (alphabetical/grouped near the other `.prism/...` routes, e.g. after line 30 `".prism/**": ["install-layout.md", "skills-ecosystem.md"]`). **Correction to the original plan premise:** there is **no** `theo-state`/`ren-state` route pattern in the manifest — those state files are not individually routed (the only individually-routed state file is `.prism/audit-state.json` → `audit-workflow.md`, and the `.prism/**` catch-all already covers everything under `.prism/`). So a dedicated route for the conductor skill dir is **optional**, not required for correctness — the `.prism/**` catch-all already routes it to `install-layout.md` + `skills-ecosystem.md`. Add the explicit `spec-editing.md` route anyway so edits to the conductor skill source load the spec-editing rules (matching how `.ai-skills/skills/**` routes). Do **not** attempt a byte-identical mirror to `templates/install/.prism/architect/manifest.json` — that file does not exist; the install surface ships `templates/install/.prism/architect/manifest.stub.json` (a structural stub per `lazy-artifacts.md`), which is **not** a mirror of the runtime manifest and must not be touched here. **Guard:** after editing, run `pnpm prism:verify-manifest` — `verify-manifest-coverage.ts` asserts five personas (nora, zoe, winston, eric, sage) still load `skills-ecosystem.md`; a new additive key cannot break that, but the check confirms it.
11. **Do not mirror the schema doc to the install surface, and add the gitignore entry.** Two confirmed conventions: (a) `templates/install/.prism/skills/` **does not exist** — skill `lib/` docs are **not** mirrored to the install template surface (verified: the install `.prism/` has `architect/`, `references/`, `rules/`, `spec/`, `templates/` but no `skills/`). So `lib/goal-state.md` ships only at canonical `.prism/` — skip the mirror. (b) Append the runtime state-file gitignore lines to `.gitignore`, matching the Ren/Theo precedent (`.gitignore` lines 18–24):
    ```
    # Sol/Conductor state files — operational; gitignored per the conductor goal-state schema
    .prism/conductor-state.json
    .prism/conductor-state.json.tmp
    ```
12. **Final verification** — from repo root: `pnpm prism:build && pnpm prism:check && pnpm prism:check-types && pnpm prism:test`. All four pass. Confirm the emitted artifacts exist: `.claude/skills/prism-conductor/SKILL.md`, `.codex/agents/prism-conductor.toml`, `.claude/agents/prism-conductor.md` (and `.claude/agents/<persona>.md` for every other persona from task 8), and the schema doc `.prism/skills/prism-conductor/lib/goal-state.md`. The runtime state file `.prism/conductor-state.json` is **not** created by any task — it is born lazily on first run (per `lazy-artifacts.md`).

### PR-C.3 — Step files: the orchestration loop

**Branch:** `hmcgrew/prism-conductor-step-files`
**Depends on:** PR-C.2 (steps read/write the goal-state schema).
**Blocks:** PR-C.4 (dispatch protocol references steps).
**Verification:** `pnpm prism:build && pnpm prism:check`.

#### Clove (implementation)

12. **Create step dir** `.prism/skills/prism-conductor/` (`mkdir -p`). Micro-file step machine, `stepsCompleted` frontmatter, each file ≤100 lines, per `.prism/references/micro-file-step-machine.md`.
13. **`step-01-init.md`** — `stepsCompleted: []`. Intake the goal; ask the run-shape question (pipeline vs fleet) **and the autonomy policy (launch / internal / hobby)** once; detect resume (read goal-state + `runId`, validate against the schema in `lib/goal-state.md`, on mismatch refuse + backup-or-abort); decide jump-to phase from `currentPhase`/lane state.
14. **`step-02-decompose.md`** — dispatch the upstream spec personas in dependency order to populate the plan(s): Parker (PRD) → Mira (stories) → Pixel (design, if UI) → Winston (architecture + plan). Sol only sequences and records phase status; each persona does its own work and writes the plan. Lay down one lane per independently-shippable unit.
15. **`step-03-plan-readiness.md`** — the firewall. A *quality* gate, never auto-cleared by autonomy policy. For each lane's plan, check the detail bar (`implementation-task-detail.md`). Pass → advance to implement. Fail → set `escalation.axis = replan`, route back to Winston, do not dispatch implementation. Record the gate in goal-state.
16. **`step-04-dispatch.md`** — author and invoke the Workflow segment: `pipeline(lanes, …)` with `agent()` calls (`agentType` = compiled persona definition, `model` per the tiering table, `schema` = report-back verdict, `isolation: 'worktree'` per lane, `budget` = global cap). The segment clears `auto-cleared` gates in place and returns on `needs-human` / `blocked` / completion / budget. Sol reads the returned verdicts; it never talks to running workers.
17. **`step-05-route.md`** — apply the verdict + gate-disposition routing table. Deterministic; Sol routes, never interprets. The primary verdict routes the lane (`done`→advance, `needs-replan`/`blocked`→Winston, `needs-human`→pause + add to human report); each secondary signal routes independently (`found-bug`→Sasha, `found-followup-work`→Nora). Gate dispositions: `auto-cleared` → advance (the owning persona has already recorded the resolution in the plan), `needs-human` → pause the lane. On a human response to a paused gate, **re-dispatch the gate's owning persona carrying the human's answer** so the owner writes the resolved `## Decisions` entry (escalation reason / answer / rationale) and re-judges. Writes `lastVerdict`, `signals`, and the next `currentPhase`.
18. **`step-06-escalate.md`** — the three escalation axes (replan / model / human) and the disagreement fast-path. Sets `escalation`, bumps `models.<persona>` on the model axis, hard-pauses + appends to `pendingHumanReport` on the human axis. Enforces the one-directional autonomy rule: a persona may escalate up regardless of policy, but may never auto-clear below the policy ceiling.
19. **`step-07-budgets.md`** — enforce the three nested budgets (strike, per-phase, global). On a tripped budget: stop the lane (not the run), record survival history, surface the report. Define "failure" narrowly per `## Design` (a persona's "no" is not a failure).
20. **`step-08-fleet.md`** — the fleet scheduler: per-lane isolation (worktree), per-lane containment (park a failed lane, keep others active), the conflict gate (refuse to parallelize overlapping-blast-radius units; serialize them), batched human-gate pause reporting.
21. **`step-09-report.md`** — the closing report: per-lane status, verdict/strike/escalation summary, what's parked and why, what's awaiting the human. Save goal-state with `status` set; never flip a PR ready or merge (human's call, ADR-0011 + git-conventions § Who merges).
22. **Update `shared.md` `## Workflow overview`** to list the nine step files in order with one-line summaries, each citing its path.
23. **Run `pnpm prism:build`** — steps accessible from generated mirrors.

### PR-C.4 — Dispatch + report-back protocol + model tiering + gates

**Branch:** `hmcgrew/prism-conductor-protocol`
**Depends on:** PR-C.3.
**Blocks:** none within the epic.
**Parallel-safe with:** PR-C.5.
**Verification:** `pnpm prism:build && pnpm prism:check`.

#### Clove (implementation)

24. **Write the report-back contract** at `.prism/skills/prism-conductor/lib/report-back.md`: the *primary verdict* enum (`done` / `blocked` / `needs-replan` / `needs-stronger-model` / `needs-human`), the optional *secondary signals* list (`found-bug` / `found-followup-work` / observation, each with a note + routing target), and the three gate dispositions (`auto-cleared` / `needs-human` / `blocked`). Document the deterministic routing table — the primary verdict routes the lane; each signal routes independently (`found-bug`→Sasha, `found-followup-work`→Nora through her scope-fit + DoR gate). Cite the existing persona skills as the sources (Briar's non-clean → `needs-human`/`done`; Sasha's diagnosis → `found-bug` signal; Nora's scope-fit → `found-followup-work` signal). Gate dispositions are returned by the gate's owning persona (Winston for plan / A-P-C, Nora for DoR) per the autonomy policy; on a `needs-human` resolution the owner writes the provenance Decision (escalation reason / human answer / rationale) to the plan via the OPEN-decision lifecycle — Sol logs the event in goal-state and never writes the plan.
25. **Add a "report-back to Sol" note** to each dispatched persona's `shared.md` (`prism-architect`, `prism-code-dev`, `prism-code-review-self`, `prism-code-review-pr`, `prism-debugger`, `prism-ticket-start`, and the upstream Parker/Mira/Pixel): a short `## When dispatched by Sol` section stating that, when invoked by the Conductor, the persona finishes by returning one verdict from the enum in `report-back.md` in addition to its normal plan writes. Keep it to a cite + one sentence (cite-don't-restate). Verification: `pnpm prism:build` regenerates all touched mirrors.
26. **Encode the model-tiering rule** in `shared.md` `## Model tiering` and `claude.md`: Sol=Opus default (config seam, not hardcoded), Winston=always Opus (hard rule), workers=Sonnet→Opus on the model-escalation signal. Reference the runtime model-override mechanism in `claude.md`.
27. **Encode the gate registry** in `lib/report-back.md` or a sibling `lib/gates.md`: the hard-pause gates (plan-readiness, Winston A/P/C, Nora DoR, Eric review, human merge) and the rule that Sol cannot autonomously clear any of them. Cross-link ADR-0011 and `git-conventions.md` § Who merges.

### PR-C.5 — Fleet mode: parallel lanes + conflict gate

**Branch:** `hmcgrew/prism-conductor-fleet`
**Depends on:** PR-C.3.
**Parallel-safe with:** PR-C.4 (different files).
**Verification:** `pnpm prism:build && pnpm prism:check`.

#### Clove (implementation)

28. **Extend `worktree-isolation.md`** (`.prism/rules/worktree-isolation.md`) § When to apply and § Who runs this rule to add Sol as a persona that creates isolated checkouts — one worktree per fleet lane — and bind it to the same cleanup contract (remove on success, error, or interruption). Mirror to `templates/install/.prism/rules/worktree-isolation.md` byte-identical (`diff` exits 0).
29. **Write `lib/fleet.md`** at `.prism/skills/prism-conductor/lib/fleet.md`: fleet is the dispatch engine run over multiple lanes — one engine; a pipeline is a one-lane fleet. Cover lane lifecycle (`active → parked | done`), native per-lane containment via `pipeline(lanes, …)` (a lane that throws drops to `null` and skips its remaining stages while others continue), the conflict gate (overlapping-blast-radius detection → serialize instead of parallelize; default refuse-to-parallelize, with the rejected fan-out-then-serialize alternative and its one-line reason), and batched `needs-human` report aggregation.
30. **Wire `step-08-fleet.md`** to cite `lib/fleet.md` (cite-don't-restate). Verification: `pnpm prism:build`.

### PR-C.6 — ADR-0048 + ecosystem registration + paired dev doc

**Branch:** `hmcgrew/prism-conductor-adr-docs`
**Depends on:** PR-C.1 (ADR documents the persona shape).
**Parallel-safe with:** PR-C.5.
**Verification:** `pnpm prism:check` (ADR linter validates byte-parity dual-write) + `pnpm prism:build` (docs build).

#### Clove (implementation)

31. **Write ADR-0048** at `.prism/spec/adrs/0048-conductor-autonomy-between-gates.md`. Status: Accepted. Context: the choice to add a goal-driven orchestrator without eroding PRISM's human-gated correctness model; alternatives considered — (a) bake orchestration into an existing persona (rejected: hat-stacking, violates one-lean-persona-one-job), (b) ship it as a voiceless utility skill like `prism-review-loop` (rejected: the user wants a persona whose *job* is orchestration; the role has a distinct posture and voice), (c) a new persona on a new orchestration axis (chosen). Decision + reasoning: the core invariant — *autonomy between gates, never through them*; Sol dispatches and routes, never does or interprets. Consequences: a third persona axis; a new run-control state primitive alongside the plans; fleet runs introduce worktree-per-lane. Mirror byte-identical to `templates/install/.prism/spec/adrs/0048-...md` (`diff` exits 0).
32. **Update `skills-ecosystem.md`** (`.prism/architect/skills-ecosystem.md`): add Sol to the roster and introduce the *orchestration* axis as a third axis orthogonal to ticket-flow and cadence-driven (extend the existing two-axis paragraph). Mirror to `templates/install/.prism/architect/skills-ecosystem.md` if that surface mirrors (verify convention first).
33. **Add the routing entry** in `AGENTS.md` § 0 (auto-routing table or the utility/persona notes block): goal-driven orchestration → Sol (`prism-conductor`), with signal phrases (orchestrate, run the fleet, drive this from the SPEC, build end-to-end, goal-driven run). Add Sol to the § 9 Ownership & Handoff table (Owns: goal decomposition + dispatch order + run-control; Routes to: every other persona by phase). Note the no-write-path boundary.
34. **Update ADR index** (`.prism/spec/adrs/README.md` and any index row table) to add the 0048 row.

#### Eli (documentation)

35. **Write the paired dev doc** at `docs/content/dev/ai-skills/conductor.md`: Overview (Sol the Conductor, orchestration axis, additive not a replacement); When to invoke (goal-driven fleet work, the CMS-from-SPEC example) vs when to keep invoking by hand; the two-channel model (plan-as-bus + goal-state); the four reliability mechanics in prose; model tiering; the autonomy-between-gates invariant (link ADR-0048); composition with Winston (firewall), Nora (no-write-path boundary), Briar/Eric (verdict sources). Link the step files and `lib/` docs.
36. **Update the docs sidebar index** (`docs/content/dev/ai-skills/_meta.json` or repo equivalent) to add Sol/Conductor in the personas list.
37. **Add cross-references** in Winston's, Nora's, and the `prism-review-loop` dev docs pointing to Sol as the lifecycle-scale generalization of the review loop. 3–5 sentences each.

---

## Decisions

- **Sol is a persona on a new orchestration axis, not a mode of an existing persona and not a voiceless utility skill.**
  - **Root cause:** the user wants one lean persona whose single job is orchestration; orchestration has a distinct posture (dispatch + route + track) and its own voice, unlike `prism-review-loop` which runs in the invoking persona's voice.
  - **Alternatives considered:** (a) bake orchestration into Winston/Nora as a mode; (b) ship as a utility skill like `prism-review-loop`.
  - **Chosen approach:** new persona on a third axis (orchestration), orthogonal to ticket-flow and cadence-driven. (a) hat-stacks and violates one-lean-persona-one-job; (b) loses the persona/voice the user explicitly wants.
  - **Implementation guidance:** register Sol in roles.json with the `{ id, persona }` persona shape (no `type` field — only utilities carry `type: "utility"`; see the Group 1 reconciliation Decision); full voice + How-Sol-thinks lens; never re-implements a dispatched persona.
  - → promoted to ADR-0048 (authored in PR-C.6).
- **Autonomy between gates, never through them — Sol has no authoritative write path.**
  - **Root cause:** an always-moving orchestrator that can clear a human gate erodes the single property that makes PRISM output trustworthy (Eric never approves, humans merge, Nora's DoR, Winston's A/P/C). Briar, Clove, and Nora independently converged on this in design review.
  - **Alternatives considered:** let Sol batch-create tickets / interpret a clean review / narrow a reviewer's scope to keep momentum.
  - **Chosen approach:** Sol writes only goal-state (pointers + run-control); dispatches and routes; never clears a gate itself — the gate's owning persona clears or escalates it under the human's autonomy policy (see the conditional-gate decision below). Sol routes the disposition, never judges it.
  - **Implementation guidance:** no Edit on source, no Linear write, no merge/ready-flip; verdict routing is deterministic, never interpretive.
  - → promoted to ADR-0048.
- **Plan-as-bus, plus a thin run-control channel — not transcript-passing between personas.**
  - **Root cause:** personas already communicate through the plan (Review Issues, Debugged Issues, Decisions); passing transcripts would bloat context and fight the per-phase-fresh-context goal.
  - **Alternatives considered:** Sol relays each persona's output to the next as conversation.
  - **Chosen approach:** durable content on the branch plan (source of truth, ADR-0001); ephemeral run-state in goal-state; thin dispatch messages only.
  - → no promotion needed (instance of ADR-0001 + the goal-state primitive defined in this epic).
- **Plan Readiness Gate is a hard pause; a vague plan is a failed plan.**
  - **Root cause:** a Sonnet worker dispatched against a fuzzy plan is where two runs diverge into two codebases; the detail bar (ADR-0033) already defines "no judgment calls."
  - **Chosen approach:** the phase plan must pass the detail bar before implementation dispatch; failure routes back to Winston to re-plan in more detail (Winston is already Opus, so the fix is re-plan-harder, not escalate-model).
  - → no promotion needed (codified in step-03-plan-readiness + instance of ADR-0033).
- **Model tiering: Sol=Opus default (not hardcoded); Winston=always Opus; workers=Sonnet→Opus on signal.**
  - **Root cause:** the dispatcher and the planning firewall need the strong model; workers run cheap and escalate only when demonstrably stalled. Built around Claude Code's Sonnet/Opus; a config seam lets other runtimes map tiers.
  - **Alternatives considered:** uniform model for all; hardcode Sol to Opus.
  - **Chosen approach:** per-dispatch tier read off goal-state; Winston pinned to Opus as a hard rule; escalation on strike-2 / second stall.
  - → no promotion needed (recorded here + in shared.md § Model tiering; revisit if a runtime can't honor per-dispatch model selection).
- **Fleet conflict gate defaults to refuse-to-parallelize on overlapping blast radius.**
  - **Root cause:** parallel lanes touching shared types / the same architect doc / the same plan manufacture merge conflicts and races.
  - **Alternatives considered:** fan out optimistically and serialize on conflict after the fact.
  - **Chosen approach:** refuse to parallelize overlapping-blast-radius units; serialize them. Fail safe, not fast. (Hunter confirmed the fleet shape; this default is recorded so it can be flipped in PR review.)
  - → no promotion needed (codified in lib/fleet.md; user may flip the default).
- **Dispatch is the Workflow tool, gate-segmented (resolved 2026-06-12).**
  - **Root cause:** at lifecycle scale, keeping run-state out of Sol's context is the dominant concern; the Workflow tool holds state in script variables and expresses Sol's budgets / routing / containment as deterministic control flow.
  - **Alternatives considered:** (a) conversational subagent dispatch in Sol's own session; (b) Agent-view background full sessions.
  - **Chosen approach:** Workflow tool. Beats (a) — subagent results return into Sol's context, re-importing the cost we chose this path to escape. Beats (b) — Agent-view gives parallelism but no control-flow layer, so coordination lands back in Sol's context, and its "unlimited" concurrency only piles lanes up at the human merge gate, which is serialized anyway. The one disqualifier for a workflow — no mid-run user input — is dissolved by gate-segmentation: workers report `needs-human` and end; Sol handles the gate conversationally between segments.
  - **Implementation guidance:** Claude Code is the reference adapter (Workflow tool); `codex.md`/`cursor.md` use their SDK equivalents (`@openai/codex-sdk`, `@cursor/sdk`) or a sequential `prism-handoff` fallback where a parallel layer isn't enabled. Personas are dispatched via compiled per-runtime agent definitions so a worker loads its persona at spawn. Agent-view is reserved as a future option for a genuinely long-running single lane — not built in v1.
  - → promoted to ADR-0048.
- **Gates are conditional and persona-judged under a human-set autonomy policy (resolved 2026-06-12).**
  - **Root cause:** a hard "always pause for a human" gate forces a human into simple, low-stakes work the owning persona could safely clear; the human wants the *choice* without losing the escalation path.
  - **Alternatives considered:** keep gates unconditionally human; let Sol decide when to skip a gate.
  - **Chosen approach:** the gate's owning persona (Winston for plan / A/P/C, Nora for DoR) judges its own gate against a human-set autonomy policy (launch / internal / hobby, reusing Parker's stakes calibration) and returns `auto-cleared` / `needs-human` / `blocked`. Sol never judges — it routes the disposition. Rejected unconditional-human (forces busywork); rejected Sol-decides (violates the no-interpret invariant and Nora's design-review guardrail — *Nora* clears her gate, not Sol).
  - **Implementation guidance:** one-directional rule — escalate up always, never auto-clear below the policy ceiling. Every `auto-cleared` gate records the persona's stakes reasoning in the plan and is surfaced in Sol's end-of-run report. Merge is the one unconditional gate, enforced by branch protection (ADR-0011), never a returned disposition. The Plan Readiness Gate is a *quality* gate, not a stakes gate — it is never auto-cleared; a vague plan always re-plans.
  - → promoted to ADR-0048.
- **Persona name is Sol (they/them); skill ID `prism-conductor` (resolved 2026-06-12).**
  - → no promotion needed (naming choice; recorded across the skill source, ADR, and dev doc).
- **Group 1 reconciliation against repo reality (Winston, 2026-06-13).** Five plan-vs-reality gaps in the pre-execution Group 1 tasks were corrected before handing off to Clove.
  - **roles.json schema:** the real schema is `{ id, persona }` for personas (no `type` field) and `{ id, type: "utility" }` for utilities — confirmed in `build.ts` `buildRoleMap` (lines 646–677). Sol's entry is `{ "id": "prism-conductor", "persona": "Sol" }`, not `type: "persona"`. Pronouns live in `shared.md`, not roles.json (no field exists).
  - **Agent-definition build (the big one):** the build emits **only** `.codex/agents/<id>.toml` today — there is no `.claude/agents/` or `.cursor/agents/` emitter. The plan's "build already compiles agent definitions for all three runtimes" was false. **Scoped down:** Group 1 adds a **Claude-only** `.claude/agents/<persona>.md` emitter (Claude is the reference dispatch adapter); the existing codex `.toml` adapter covers Codex; Cursor agent defs are deferred to when fleet dispatch targets Cursor. Flagged to split into its own PR if the diff exceeds ~150 lines — it is the only genuinely novel code in the foundation.
  - **manifest routing:** there is **no** `theo-state`/`ren-state` route pattern — state files aren't individually routed (only `.prism/audit-state.json` is, and the `.prism/**` catch-all covers the rest). The conductor route is additive/optional; do **not** mirror to `templates/install/.prism/architect/manifest.json` (that file doesn't exist — the install surface ships `manifest.stub.json`, a structural stub, not a mirror).
  - **Install-template mirroring:** `templates/install/.prism/skills/` does not exist — skill `lib/` docs are not mirrored to the install surface. `lib/goal-state.md` ships only at canonical `.prism/`.
  - **State-file location:** schema doc at `.prism/skills/prism-conductor/lib/goal-state.md` (tracked); runtime file at `.prism/conductor-state.json` (root, gitignored), matching Ren/Theo. Gitignore lines added in task 11.
  - **Verification commands confirmed:** `pnpm prism:build` (= `build.ts` + `prism:test`), `pnpm prism:check` (= `build.ts --check` + `prism:test` + `prism:verify-manifest`), `pnpm prism:check-types` (`scripts/ai-skills/` only), `pnpm prism:test`. Build runs tests; check runs tests + manifest coverage.
  - → no promotion needed (ticket-tactical reconciliation; the durable persona-shape decisions are already promoted to ADR-0048).
- **Report-back is a primary verdict plus optional secondary signals, not a single enum (resolved 2026-06-12).**
  - **Root cause:** a dispatch is often `done` *and* surfaces incidental work (a follow-up, a bug); a single verdict value forces the persona to drop the signal or mislabel the whole dispatch.
  - **Alternatives considered:** keep one enum value and require a separate dispatch to report incidental findings.
  - **Chosen approach:** one primary verdict (routes the lane) plus a list of secondary signals (each routes independently — `found-bug`→Sasha, `found-followup-work`→Nora). Rejected the single-enum form — it loses signals or corrupts routing.
  - **Implementation guidance:** goal-state carries `lastVerdict` (primary) + `signals[]`; `lib/report-back.md` documents both.
  - Surfaced by the tabletop dry run (CMS Pages goal): Clove returned `done` while flagging a hierarchy-depth follow-up a single enum couldn't carry.
  - → promoted to ADR-0048.
- **Gate resolutions are written to `## Decisions` by the gate's owning persona, not by Sol (resolved 2026-06-12).**
  - **Root cause:** the human's answer to a `needs-human` gate is durable product content; Sol writing it would breach the no-authoritative-write-path invariant, and Sol lacks the context to write as good a record as the owning persona.
  - **Alternatives considered:** Sol writes the resolution to the plan directly.
  - **Chosen approach:** the gate owner (Winston for plan/A-P-C, Nora for DoR) writes one Decision with full provenance — escalation reason, human answer, rationale — via the existing `OPEN —` decision lifecycle; Sol logs the event in goal-state and carries the human's answer back on re-dispatch. Rejected Sol-writes — breaks the invariant and degrades the record.
  - **Implementation guidance:** Sol's re-dispatch message carries the human's answer; the owner resolves the OPEN, writes the Decision, and re-judges the gate. Goal-state holds the ephemeral event; the plan holds the durable provenance.
  - → promoted to ADR-0048.

---

## Acceptance Criteria

### Behavioral

- [ ] Given a stated goal and a single unit of work, When the user invokes Sol, Then Sol greets in character, asks whether the run is one unit or a fleet, and lays out the lifecycle phases it will drive. (US-1)
- [ ] Given Sol is driving a unit, When a phase reaches a gate, Then Sol dispatches the gate's owning persona to judge it and routes the returned disposition — Sol never clears a gate itself. (US-2)
- [ ] Given an `internal` or `hobby` autonomy policy, When Winston or Nora judges a plan/ticket low-stakes, Then they auto-clear their gate and the run proceeds without a human, and the auto-clear is recorded with stakes reasoning and shown in the end-of-run report. (US-2)
- [ ] Given any autonomy policy, When the owning persona judges a gate needs sign-off, Then it returns needs-human and Sol surfaces it regardless of how permissive the policy is. (US-2)
- [ ] Given a `launch` autonomy policy, When any planning or readiness gate is reached, Then it is held for a human regardless of the persona's judgment. (US-2)
- [ ] Given any run, When a lane reaches merge, Then it parks for a human and is never auto-cleared. (REQ-1)
- [ ] Given a phase plan that leaves implementation judgment calls open, When Sol reaches the implementation phase, Then Sol refuses to dispatch implementation, reports the plan as not-ready, and routes it back for re-planning. (US-3)
- [ ] Given a fleet run of independent units, When one unit fails past its budget, Then that unit is parked with a reported reason and the other units continue. (US-4)
- [ ] Given a worker persona stalls on the same problem twice, When Sol next dispatches it, Then Sol escalates that dispatch to the stronger model; and given the plan is the problem, Then Sol routes back to re-plan instead. (US-5)
- [ ] Given any dispatched persona, When it finishes, Then it returns one primary verdict plus any secondary signals, and Sol routes by them without re-deciding the work. (US-6)
- [ ] Given a dispatched persona completes its work and also notices out-of-scope work, When it reports back, Then it returns a primary verdict (e.g. done) plus a secondary signal, and Sol routes the signal independently without changing the lane's primary routing. (US-6)
- [ ] Given a needs-human gate resolved by a human answer, When the gate's owning persona is re-dispatched with that answer, Then the persona writes a Decisions entry capturing the escalation reason, the human's answer, and the rationale — and Sol does not write the plan itself. (US-2)
- [ ] Given a fleet run where two pending units share a blast radius (same shared type / architect doc / plan file), When Sol schedules them, Then it serializes them rather than running them in parallel. (REQ-1)
- [ ] Given multiple fleet lanes pause at the human merge gate, When Sol reports, Then the pauses are batched into one report rather than one notification per lane. (REQ-1)

### Non-behavioral

- [ ] Canonical skill source exists at `.ai-skills/skills/prism-conductor/` with `frontmatter.yml`, `shared.md`, `claude.md`, `codex.md`, `cursor.md`; registered in `.ai-skills/definitions/roles.json` with the `{ id, persona }` persona shape (no `type` field — see the Group 1 reconciliation Decision).
- [ ] Generated mirrors land at `.claude/skills/prism-conductor/`, `.codex/skills/prism-conductor/`, `.cursor/skills/prism-conductor/` after `pnpm prism:build`.
- [ ] The build emits per-runtime agent definitions (`.claude/agents/`, `.codex/agents/`, `.cursor/agents/`) for each dispatched persona from canonical source, each carrying a `model` default.
- [ ] The goal-state schema lives at `.prism/skills/prism-conductor/lib/goal-state.md`; the report-back contract at `lib/report-back.md`; the fleet contract at `lib/fleet.md`.
- [ ] Step files exist at `.prism/skills/prism-conductor/step-01-init.md` … `step-09-report.md`, each ≤100 lines with `stepsCompleted` frontmatter.
- [ ] ADR-0048 documents the orchestration axis + the autonomy-between-gates invariant and is mirrored byte-identical to the templates surface.
- [ ] `worktree-isolation.md` lists Sol as a worktree-creating persona bound to the cleanup contract; mirrored byte-identical.
- [ ] `skills-ecosystem.md` and `AGENTS.md` register Sol and the orchestration axis; paired dev doc lives at `docs/content/dev/ai-skills/conductor.md` and is linked from the sidebar.
- [ ] Sol has no authoritative write path — it writes only `.prism/skills/prism-conductor/`-owned state and chat output; it never writes source, Linear, or merges.
- [ ] `pnpm prism:check`, `pnpm prism:check-types`, `pnpm prism:build`, `pnpm prism:test` pass after each sub-PR.

### AC Adjustments

_(none yet)_

### AC Sync Log

| Date | Agent | Action | Plan | Linear |
| ---- | ----- | ------ | ---- | ------ |

---

## History

- 2026-06-12 [claude/confident-cerf-65a9f6]: Plan created. Phase 4 — Sol, the goal-driven orchestration persona (`prism-conductor`), generalizing `prism-review-loop` from the review segment to the whole lifecycle. Six sub-PRs (scaffold, goal-state primitive, step files, dispatch/report-back protocol, fleet mode, ADR/ecosystem/dev-doc). Design synthesized from a Winston evaluation plus in-character design review by Briar, Clove, and Nora — all three converged on "autonomy between gates, never through them." Two OPEN decisions deferred to Hunter (Claude Code dispatch mechanism; persona name).
- 2026-06-12 [claude/confident-cerf-65a9f6]: Plan revised — resolved both OPEN decisions (name = Sol; dispatch = Workflow tool, gate-segmented) and collapsed pipeline/fleet into one engine. Added the conditional-gate model — gates judged by their owning persona under a human-set autonomy policy (launch/internal/hobby), returning auto-cleared/needs-human/blocked, with Sol only routing, merge infra-enforced, and auto-clears always audited; see Decisions. Added the agent-definition build task to PR-C.1; PR #103 body re-synced.
- 2026-06-12 [claude/confident-cerf-65a9f6]: Plan refined after a tabletop dry run (goal: CMS Pages content type) — split report-back into a primary verdict plus optional secondary signals (the dry run showed a `done` dispatch can't carry an incidental follow-up under a single enum). Defined gate-resolution provenance: the gate's owning persona writes the escalation-reason/answer/rationale Decision via the OPEN-decision lifecycle, while Sol logs the event and carries the answer back, never writing the plan. Both promoted to ADR-0048; PR #103 body re-synced.
- 2026-06-13 [hmcgrew/prism-conductor-foundation]: Reconciled Group 1 (PR-C.1 + PR-C.2, combined into one PR) against repo reality — rewrote tasks 1–12 to AFK-executable detail. Corrected five gaps (roles.json `{id,persona}` shape; agent-def build scoped to Claude-only since only `.codex/agents/*.toml` exists today; no theo/ren manifest route to mirror; no install `skills/` surface; state file at `.prism/conductor-state.json`); see the "Group 1 reconciliation" Decision.
- 2026-06-13 [hmcgrew/prism-conductor-foundation]: Eric PR review (#104) — Standards axis clean; one Spec-axis Minor fixed: swept two stale `type: "persona"` plan references (Decision guidance + non-behavioral AC) to the `{ id, persona }` shape, matching the reconciliation Decision and shipped roles.json. Noted the pre-existing atlas-dogfood Windows flake and stale literal-allowlist as out-of-scope follow-up candidates. PR left draft; labels effort:quick + review:has-minors.
- 2026-06-13 [hmcgrew/prism-conductor-foundation]: Briar self-review pass 1 — build.ts agent-def emitter, literal-allowlist set, and `startsWith`→`includes` cleanup change all verified sound; concern set (1 allowlist completeness, 2 header-match safety, 3 test coverage) cleared except two Minors filed: agent-def test omits the utility-skip coverage task 8 asked for, and timestamped conductor-state archives aren't gitignored (mirrors a pre-existing Ren gap). Also noted a pre-existing stale literal-allowlist condition (architect/qa-test-plan entries cite incidents no longer in their bodies) — out of scope, follow-up candidate.
- 2026-06-13 [hmcgrew/prism-conductor-foundation]: Implemented Group 1 (Clove) — Sol skill scaffold (`frontmatter.yml`, `shared.md`, `claude.md`, `codex.md`, `cursor.md`), goal-state schema doc at `.prism/skills/prism-conductor/lib/goal-state.md`, roles.json + manifest route + gitignore. Extended `scripts/ai-skills/build.ts` to emit `.claude/agents/<persona>.md` for every persona (opus for conductor+architect, sonnet otherwise; utilities excluded) with a unit test; ~132-line build diff stayed in-scope. Full gate green except a pre-existing Windows-only `atlas-dogfood` path-separator test flake (fails identically on clean HEAD).

---

## Debugged Issues

_(none yet)_

---

## Review Issues

### Stale `type: "persona"` references in the plan contradict the reconciliation Decision and shipped code

- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `.prism/plans/epic-prism-conductor.md` (first `## Decisions` entry implementation-guidance sub-bullet; non-behavioral AC item)
- **Problem:** Two spots still prescribed `type: "persona"` in roles.json, contradicting the Group 1 reconciliation Decision (real schema is `{ id, persona }`, no `type`) and the shipped `roles.json`. Eric (PR review) flagged it; they predate this PR's plan edits so weren't in the diff.
- **Suggested fix:** Update both to the `{ id, persona }` persona shape, citing the reconciliation Decision. Done — the corrective task-1 and reconciliation mentions (which explicitly say *not* to use `type: "persona"`) stay as-is.

### Agent-def test omits the utility-skip and cleanup coverage task 8 asked for

- **Severity:** `minor`
- **Status:** `open`
- **File:** `scripts/ai-skills/claude-agent-def.test.ts`
- **Problem:** The suite covers `buildClaudeAgentMarkdown` (frontmatter, model defaults, body, description collapse) but not the emitter loop's `roleDefinition.type !== "utility"` guard or `removeDeletedManagedAgentFiles` with the new `extension`/`headerLine` params — task 8 explicitly called for "utilities are skipped" coverage. Behavior is verified-correct by build output (19 personas → 19 defs, both utilities excluded), so this is a coverage gap, not a defect.
- **Suggested fix:** add an assertion that the model-defaults map / emitter excludes the two utility skill IDs (`prism-handoff`, `prism-review-loop`), or a small integration assertion that no `.claude/agents/<utility>.md` is emitted.

### Timestamped conductor-state archives are not gitignored

- **Severity:** `minor`
- **Status:** `open`
- **File:** `.gitignore` (vs `.prism/skills/prism-conductor/lib/goal-state.md` lines 57, 79, 87)
- **Problem:** goal-state.md's corruption-recovery and resume protocols archive to `.prism/conductor-state.<timestamp>.json` and `.prism/conductor-state.<timestamp>.broken.json`, but `.gitignore` only covers `.prism/conductor-state.json` and `.prism/conductor-state.json.tmp`. `git check-ignore` confirms the timestamped variants are not ignored — a recovery archive could be accidentally committed. Faithfully mirrors a pre-existing identical gap in Ren (`.prism/ren-state.<timestamp>.*`).
- **Suggested fix:** broaden to a glob — e.g. `.prism/conductor-state.json`, `.prism/conductor-state.json.tmp`, `.prism/conductor-state.*.json`. Closing Ren's identical gap is out of scope here (follow-up candidate).

---

## Cleanup Items

- Working tree (not in PR) — stray 0-byte file `:Tconductor-pr-body.md` at repo root (botched shell redirect from a prior session). Untracked, so it won't ship; remove to clear branch-checkout noise.

---

## PR Readiness

Living checklist — updated every time `code-review-self` runs. Reflects current state.

- [x] No critical or major issues
- [x] Types correct — no `any`, no unsafe `as`
- [x] No stray console.logs or debug artifacts
- [x] Tests written for new logic and edge cases (`scripts/ai-skills/claude-agent-def.test.ts`)
- [x] All debugged issues resolved (no `open` entries)
- [x] Build passes — last run: 2026-06-13 (`pnpm prism:build` + `prism:check` green; only the pre-existing Windows `atlas-dogfood` path flake fails, identical on clean HEAD)
- [ ] PR description up to date — set at draft-PR open
- [ ] Lasting decisions promoted to architect context — deferred to epic close (PR-C.6 ships ADR-0048; Group 1 is foundation)
- [ ] Two open Minor review issues (agent-def utility-skip test coverage; conductor-state archive gitignore glob) — Briar self-review pass 1

**Last updated:** 2026-06-13 (Briar self-review pass 1 — 2 open Minors)
