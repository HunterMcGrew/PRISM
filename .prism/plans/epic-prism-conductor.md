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

Sol drives autonomously *between* gates and hard-pauses *at* them. A persona's "no" (Briar non-clean, Nora not-ready, Winston's A/P/C selection, Eric's findings, the human merge) is the system working, never a failure to route around. This invariant is the ADR (ADR-0048) this epic ships.

### Sol dispatches; it never does or interprets the work

Sol has **no authoritative write path**. It writes only its own goal-state file (pointers + run-control). It never writes code (Clove's lane), never writes Linear (Nora's lane), never merges (the human's). Its dispatch verbs are thin and map onto each persona's existing trigger surface: *"your turn,"* *"here's the plan, implement,"* *"here's a bug, investigate,"* *"here are issues that might be ticket-worthy."* Each persona then runs its full, unmodified startup and rules.

### Two-channel communication — plan-as-bus + run-control

Personas "talk to each other" through the **branch plan**, exactly as they already do (Briar writes `## Review Issues`, Clove reads and fixes; Sasha writes `## Debugged Issues`, Winston reads them into tasks). Sol adds a thin second channel:

- **The branch plan = the durable content bus.** Decisions, tasks, findings, history — the real conversation. On-disk, compact, survives compaction. Plans stay the source of truth (ADR-0001).
- **The goal-state file = the ephemeral run-control channel.** Phase pointer, per-lane status, strike tables, failure counts, escalation flags, per-dispatch model tier. Holds pointers into plans, never work content.

Sol's dispatch message stays minimal ("Clove — your turn, plan at `<path>`, tasks 3–5, report back"); the work content rides the plan; the run-state rides goal-state. No transcript-passing between personas — that is what keeps context tight enough for Sol-on-Opus to run a Sonnet fleet.

### Per-phase fresh context

One context cannot hold the whole lifecycle (`prism-handoff` exists precisely because long runs compact and drop constraints). Sol spawns a **fresh context per dispatch**, with the goal-state/handoff doc carrying the survival state (strike table, DoR result, plan pointer) across the boundary — the `prism-review-loop` "Gauntlet state travels" rule, generalized. In Claude Code this is subagent fan-out / handoff compaction; on runtimes without that, sequential invocation with `prism-handoff` between phases.

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
3. **Report-back protocol — a finite verdict enum.** Every dispatched persona writes content to the plan **and** returns one verdict to Sol: `done · blocked · needs-replan · needs-stronger-model · needs-human · found-bug · found-followup-work`. Sol's routing table is deterministic: `done`→advance · `needs-replan`/`blocked`→Winston · `found-bug`→Sasha · `found-followup-work`→Nora (through her scope-fit + DoR gate) · `needs-human`→pause and report. Sol routes a verdict; it never interprets one.
4. **Fleet mode — failure containment + conflict gate.** Two run-shapes. *Pipeline* (one unit through phases, sequential; a failure pauses that one pipeline). *Fleet* (N independent units in parallel; a failure parks **that lane** — report and keep the others moving). Per-lane isolation via worktree (`worktree-isolation.md`, extended past Eric), per-lane goal-state lane. **Conflict gate (chosen default): refuse to parallelize units with overlapping blast radius** — shared types, the same architect doc, the same plan file — and serialize those instead; fail safe, not fast. Human-gate pauses across lanes are **batched** into one report ("4 lanes parked at merge, 2 blocked on you, 2 running"), never one ping per lane.

### Persona name

Skill ID `prism-conductor` is locked. Persona human name defaults to **Sol** (they/them) — short, central, no roster collision — but is the user's call (see `## Decisions` → OPEN entry).

---

## Implementation Tasks

Grouped into six sub-PRs (PR-C.1 … PR-C.6). Every task hits the detail bar per `.prism/rules/implementation-task-detail.md` — front-loaded file paths, content outlines tight enough that structure isn't invented, verification commands, and sequence dependencies. New-file content is given as an outline (per the bar's new-file allowance), matching the fidelity of `epic-prism-ren.md`.

### PR-C.1 — Conductor scaffold + persona skill source

**Branch:** `hmcgrew/prism-conductor-scaffold`
**Depends on:** nothing — scaffold lands first.
**Blocks:** PR-C.2 … PR-C.6.
**Verification:** `pnpm prism:build && pnpm prism:check && pnpm prism:check-types && pnpm prism:test`.

#### Clove (implementation)

1. **Register the role** in `.ai-skills/definitions/roles.json`. Add a `prism-conductor` entry with `type: "persona"`, persona name `Sol`, pronouns `they/them`. Note in the entry comment (or adjacent doc) that Sol is the first persona on the *orchestration* axis — orthogonal to ticket-flow and cadence-driven (mirror the two-axis language in `skills-ecosystem.md`). Verification: `pnpm prism:check` validates roles.json.
2. **Create canonical skill directory** at `.ai-skills/skills/prism-conductor/` (`mkdir -p`). No content yet — tasks 3–7 populate.
3. **Write `frontmatter.yml`** at `.ai-skills/skills/prism-conductor/frontmatter.yml`. `name: prism-conductor`, `displayName: Sol`, `pronouns: they/them`. `description` (folded `>` scalar, ≤1000 chars, target 250–400) shaped per `skill-authoring.md` § Description field shape: sentence 1 = "Sol — the Conductor: goal-driven orchestration persona."; sentence 2 = WHAT (decomposes a goal into lifecycle phases, dispatches the existing PRISM personas, pauses at every human gate, routes report-back verdicts, contains failures per-lane in fleet runs); sentence 3 = load-bearing exclusion ("Never writes code, tickets, or merges — only dispatches and tracks run-state."); `Triggers:` line = `"Sol"`, orchestrate, run the fleet, drive this from the SPEC, build this end to end, goal-driven run, conductor.
4. **Write `shared.md`** at `.ai-skills/skills/prism-conductor/shared.md`. Sections in order:
   - Persona blurb — Sol, the Conductor; calm air-traffic-controller posture; dispatches and tracks, never does the work; they/them. State explicitly: "Sol never takes on another persona's role — it tells them it's their turn and hands them the pointer."
   - `## Intro` — greeting examples ("Sol here. What's the goal, and is this one unit or a fleet?", "Sol reporting in. Point me at the SPEC and I'll line up the phases.").
   - `## How Sol thinks` (the cognitive lens — PIN, never externalize): the autonomy-between-gates-never-through-them invariant; dispatch-don't-do; route-a-verdict-never-interpret-one; the plan is the bus, goal-state is run-control.
   - `## When this skill is invoked` — startup batch: read git context, read `.prism/skills/prism-conductor/lib/goal-state.md` for the schema, read an existing goal-state file if present (resume), read architect manifest, run plan lookup per `branch-plan.md`.
   - `## Workflow overview` — cite the step files at `.prism/skills/prism-conductor/step-01-*.md …` (PR-C.3). Do not restate step bodies — cite per `implementation-task-detail.md` § Cite, don't restate.
   - `## Model tiering` — the table from `## Design` (Sol=Opus default; Winston=always Opus; workers=Sonnet→Opus on signal). Cite `claude.md` for the runtime override mechanism.
   - `## Definition of Done` — Sol has either driven the run to `done`, paused at a gate with state saved, or stopped on a budget with a report. Include the `<!-- atlas:specializes-in -->` anchor at the end of a `## Per-team orchestration notes` stub so Atlas can inject team-specific phase ordering.
   - `## Lessons Check` + the standard reflex bullets (context-reuse, History 3-sentence cap, plan lookup).
5. **Write `claude.md`** at `.ai-skills/skills/prism-conductor/claude.md`. Names the Claude Code dispatch surface: Sol dispatches a persona by spawning a fresh per-phase context (Agent/subagent) running the target skill, with the goal-state/handoff doc as carried context, and sets the model per dispatch via the runtime's model override. Fleet mode uses parallel subagent lanes with worktree isolation. State the OPEN dispatch-mechanism decision inline (subagent fan-out vs Workflow primitive vs sequential+handoff) and its default path (see `## Decisions`). Sol uses Read/Glob/Grep and writes only `.prism/skills/prism-conductor/`-owned state plus chat; never Edit on source.
6. **Write `codex.md` and `cursor.md`** at the same dir. Parallel structure to `claude.md`, describing the sequential-dispatch-with-`prism-handoff`-compaction fallback for runtimes without subagent fan-out / per-skill model pinning (note the known Cursor/Codex model-pin limitation already documented in `prism-review-loop`).
7. **Run `pnpm prism:build`** from repo root. Verification: generated mirrors land at `.claude/skills/prism-conductor/`, `.codex/…`, `.cursor/…`.

### PR-C.2 — Goal-state primitive (the run-control channel)

**Branch:** `hmcgrew/prism-conductor-goal-state`
**Depends on:** PR-C.1.
**Blocks:** PR-C.3, PR-C.4, PR-C.5.
**Verification:** `pnpm prism:build && pnpm prism:check`.

#### Clove (implementation)

8. **Write the state schema doc** at `.prism/skills/prism-conductor/lib/goal-state.md` (following Ren's `lib/state.md` precedent — schema lives in the skill's lib, not architect). Cover: the need (run-control across per-phase fresh contexts; survival state must travel); read at every dispatch boundary, write at every phase transition; atomic write (`.tmp` + rename) per `lazy-artifacts.md`; plans stay source of truth, goal-state holds pointers only. Include the full schema as a fenced JSON block:
   ```json
   {
     "version": "1",
     "lastUpdated": "ISO-8601",
     "goal": "one-line goal statement",
     "runShape": "pipeline | fleet",
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
         "lastVerdict": "done | blocked | needs-replan | needs-stronger-model | needs-human | found-bug | found-followup-work",
         "gate": { "type": "plan-readiness | a-p-c | review | merge | dor", "awaiting": "human | persona", "since": "ISO-8601" }
       }
     ],
     "pendingHumanReport": ["string"]
   }
   ```
   Document that `escalation`, `gate`, and per-strike entries are nullable/absent when inactive.
9. **Add manifest routing** in `.prism/architect/manifest.json` so edits touching `.prism/skills/prism-conductor/**` route the goal-state doc (follow the `theo-state`/`ren-state` route pattern). Mirror the manifest change to `templates/install/.prism/architect/manifest.json` byte-identical (`diff` exits 0).
10. **Mirror the install template** if the schema doc ships in the install surface (match how Ren's state doc is/ isn't mirrored — verify the convention in `templates/install/.prism/skills/` before mirroring; if skill `lib/` docs are not mirrored, skip and note it in `## History`).
11. **Run `pnpm prism:check`** — manifest validator + template-mirror diff pass.

### PR-C.3 — Step files: the orchestration loop

**Branch:** `hmcgrew/prism-conductor-step-files`
**Depends on:** PR-C.2 (steps read/write the goal-state schema).
**Blocks:** PR-C.4 (dispatch protocol references steps).
**Verification:** `pnpm prism:build && pnpm prism:check`.

#### Clove (implementation)

12. **Create step dir** `.prism/skills/prism-conductor/` (`mkdir -p`). Micro-file step machine, `stepsCompleted` frontmatter, each file ≤100 lines, per `.prism/references/micro-file-step-machine.md`.
13. **`step-01-init.md`** — `stepsCompleted: []`. Intake the goal; ask the run-shape question (pipeline vs fleet) once; detect resume (read goal-state, validate against the schema in `lib/goal-state.md`, on mismatch refuse + backup-or-abort); decide jump-to phase from `currentPhase`/lane state.
14. **`step-02-decompose.md`** — dispatch the upstream spec personas in dependency order to populate the plan(s): Parker (PRD) → Mira (stories) → Pixel (design, if UI) → Winston (architecture + plan). Sol only sequences and records phase status; each persona does its own work and writes the plan. Lay down one lane per independently-shippable unit.
15. **`step-03-plan-readiness.md`** — the firewall. For each lane's plan, check the detail bar (`implementation-task-detail.md`). Pass → advance to implement. Fail → set `escalation.axis = replan`, route back to Winston, do not dispatch implementation. Record the gate in goal-state.
16. **`step-04-dispatch.md`** — the per-phase dispatch loop: thin imperative to the phase's owning persona, fresh context, model per the tiering table, goal-state/handoff carried. Awaits the persona's report-back verdict.
17. **`step-05-route.md`** — apply the verdict routing table (from `## Design` mechanic 3). Deterministic; Sol routes, never interprets. Writes `lastVerdict` and the next `currentPhase`.
18. **`step-06-escalate.md`** — the three escalation axes (replan / model / human) and the disagreement fast-path. Sets `escalation`, bumps `models.<persona>` on the model axis, hard-pauses + appends to `pendingHumanReport` on the human axis.
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

24. **Write the report-back contract** at `.prism/skills/prism-conductor/lib/report-back.md`: the seven-value verdict enum, what each means, what each persona returns it for, and the deterministic routing table. Cite the existing persona skills as the verdict sources (e.g. Briar's non-clean → `needs-human`/`done`, Sasha's diagnosis → `found-bug`, Nora's scope-fit → `found-followup-work`).
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
29. **Write `lib/fleet.md`** at `.prism/skills/prism-conductor/lib/fleet.md`: the fleet scheduler contract — lane lifecycle (`active → parked | done`), per-lane containment, the conflict gate (overlapping-blast-radius detection → serialize instead of parallelize; default refuse-to-parallelize), batched human-report aggregation. Document the chosen default and the rejected looser alternative (fan-out-then-serialize-on-conflict) with the one-line reason.
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
  - **Implementation guidance:** `type: "persona"` in roles.json; full voice + How-Sol-thinks lens; never re-implements a dispatched persona.
  - → promoted to ADR-0048 (authored in PR-C.6).
- **Autonomy between gates, never through them — Sol has no authoritative write path.**
  - **Root cause:** an always-moving orchestrator that can clear a human gate erodes the single property that makes PRISM output trustworthy (Eric never approves, humans merge, Nora's DoR, Winston's A/P/C). Briar, Clove, and Nora independently converged on this in design review.
  - **Alternatives considered:** let Sol batch-create tickets / interpret a clean review / narrow a reviewer's scope to keep momentum.
  - **Chosen approach:** Sol writes only goal-state (pointers + run-control); dispatches and routes; pauses hard at every gate and cannot clear one autonomously.
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
- **OPEN — TBD, needs Hunter input.** The Claude Code dispatch mechanism — subagent fan-out (Agent tool with per-agent model override + worktree isolation) vs a Workflow-style primitive vs sequential invocation with `prism-handoff` compaction between phases. **Default path (used until resolved):** spec the orchestration runtime-agnostically; the `claude.md` adapter uses subagent fan-out for fleet lanes and sequential dispatch with handoff for pipeline runs, while `codex.md`/`cursor.md` use sequential dispatch with handoff throughout (acknowledging the documented Cursor/Codex per-skill model-pin limitation). Resolve before PR-C.3/PR-C.5 lock the dispatch shape.
- **OPEN — TBD, needs Hunter input.** Persona human name — default **Sol** (they/them). **Default path (used until resolved):** all artifacts use "Sol"; a rename is a mechanical find-replace across the skill source + ADR + dev doc before PR-C.6 lands. Alternatives floated: Max (maestro), Leo, Felix.

---

## Acceptance Criteria

### Behavioral

- [ ] Given a stated goal and a single unit of work, When the user invokes Sol, Then Sol greets in character, asks whether the run is one unit or a fleet, and lays out the lifecycle phases it will drive. (US-1)
- [ ] Given Sol is driving a unit, When a phase reaches an existing human gate (architecture approve/adjust, ticket readiness, PR review, merge), Then Sol pauses and surfaces the gate to the user instead of clearing it itself. (US-2)
- [ ] Given a phase plan that leaves implementation judgment calls open, When Sol reaches the implementation phase, Then Sol refuses to dispatch implementation, reports the plan as not-ready, and routes it back for re-planning. (US-3)
- [ ] Given a fleet run of independent units, When one unit fails past its budget, Then that unit is parked with a reported reason and the other units continue. (US-4)
- [ ] Given a worker persona stalls on the same problem twice, When Sol next dispatches it, Then Sol escalates that dispatch to the stronger model; and given the plan is the problem, Then Sol routes back to re-plan instead. (US-5)
- [ ] Given any dispatched persona, When it finishes, Then it returns exactly one verdict from the report-back enum and Sol routes by that verdict without re-deciding the work. (US-6)
- [ ] Given a fleet run where two pending units share a blast radius (same shared type / architect doc / plan file), When Sol schedules them, Then it serializes them rather than running them in parallel. (REQ-1)
- [ ] Given multiple fleet lanes pause at the human merge gate, When Sol reports, Then the pauses are batched into one report rather than one notification per lane. (REQ-1)

### Non-behavioral

- [ ] Canonical skill source exists at `.ai-skills/skills/prism-conductor/` with `frontmatter.yml`, `shared.md`, `claude.md`, `codex.md`, `cursor.md`; `type: "persona"` registered in `.ai-skills/definitions/roles.json`.
- [ ] Generated mirrors land at `.claude/skills/prism-conductor/`, `.codex/skills/prism-conductor/`, `.cursor/skills/prism-conductor/` after `pnpm prism:build`.
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

---

## Debugged Issues

_(none yet)_

---

## Review Issues

_(none yet)_

---

## Cleanup Items

_(none yet — populated during self-review on each sub-PR)_

---

## PR Readiness

Living checklist — updated every time `code-review-self` runs. Reflects current state.

- [ ] No critical or major issues
- [ ] Types correct — no `any`, no unsafe `as`
- [ ] No stray console.logs or debug artifacts
- [ ] Tests written for new logic and edge cases
- [ ] All debugged issues resolved (no `open` entries)
- [ ] Build passes — last run: _(pending — plan only)_
- [ ] PR description up to date
- [ ] Lasting decisions promoted to architect context (if applicable)

**Last updated:** 2026-06-12
