---
slug: eve-substrate
title: "Port the autonomous PRISM persona slice onto Vercel eve"
mode: greenfield
stakes: internal
status: finalized
created: 2026-06-19T00:00:00Z
lastEdited: 2026-06-19T00:00:00Z
stepsCompleted: [init, stakes, mode, draft, review, finalize]
linearInitiativeId: null
---

# PRD: Port the autonomous PRISM persona slice onto Vercel eve

## Problem statement

PRISM's personas run today as interactive skills inside a developer's IDE chat. Every persona starts when a human types a trigger; nothing runs without a person in the loop. That model is correct for the build-loop personas (Winston/Clove/Briar plan, implement, and review with a human at the keyboard) but it leaves an entire class of work stranded: the personas whose value is *being always on*. Lilac's standup wants to fire on a schedule and post to Slack without anyone asking. Sage's changelog wants to run on a tag push. Zoe's audit wants a weekly cadence. Eric's PR review wants to wake on a GitHub webhook. None of that is possible while the only entry point is a human typing into a chat box.

Vercel eve is a runtime that closes this gap: a filesystem-first agent framework where each agent is a directory of markdown instructions, skills, channels (HTTP/messaging entrypoints), and schedules (cron jobs). eve's skill shape — a `SKILL.md` with YAML frontmatter and a markdown body, routed to the model by a `description` field — is the same shape PRISM already authors. The match is close enough that porting a persona is mostly an emit-and-wire problem, not a rewrite.

**Why now.** The discovery spike (`/tmp/eve-discovery-digest.md`, source-cited against eve 0.11.6) confirmed the three facts the port hinges on: (1) eve skills are markdown playbooks PRISM content ports near-verbatim into; (2) eve runs fully off-Vercel on a local on-disk Workflow world with direct-to-Anthropic model routing, so adopting it carries no Vercel lock-in; and (3) the one-agent-per-persona deployment model maps cleanly onto Sol orchestrating remote agents. The window is open because the runtime exists, the shape matches, and the build pipeline (`pnpm prism:build`) already emits per-platform agent directories — adding eve is a new emitter alongside the existing `.claude`/`.codex`/`.cursor`/`.agents` targets, not new infrastructure.

## Target users

- **PRISM maintainers (primary)** — the team that authors persona markdown in `.prism/` and runs `pnpm prism:build`. They get a new compile target that turns the autonomous-slice personas into deployable always-on agents without leaving the single-source-of-truth markdown workflow they already use.
- **Sol, as the orchestration layer** — the conductor persona that today dispatches in-session subagents. The port gives Sol a second dispatch surface: remote eve agents, one per persona, callable as `defineRemoteAgent` subagents.
- **Downstream PRISM consumers (secondary, future)** — teams that install PRISM and want scheduled/channel-driven personas. Not in scope for this initiative, but the emitter is the mechanism that would eventually serve them.

## Success metrics

The initiative succeeds when the autonomous slice can run on eve and the existing build stays green. Concretely:

1. **Lilac runs end-to-end on eve's local world.** A scheduled (or dev-triggered) run of the generated Lilac eve agent composes a standup and posts it to Slack via the channel — proven against eve's local on-disk Workflow world (`eve start`, `.workflow-data`), direct-to-Anthropic, no Vercel services.
2. **The emitter generates a valid eve agent directory per in-scope persona.** Running `pnpm prism:build` produces, for each in-scope persona, an `agent/` directory that `eve build` accepts without error (valid `instructions.md`, `skills/<id>/SKILL.md` with a `description`, and — where applicable — `schedules/` and `channels/`).
3. **`pnpm prism:build` and `pnpm prism:check` stay green.** The new emitter integrates without breaking drift detection, the literal guard, the path guard, or the existing platform emitters. `prism:check` passes on a clean tree.

A genuine measurement gap: there is no automated assertion today that a generated eve agent *behaves* correctly beyond "Lilac posts a standup." We measure the first slice by hand. [ASSUMPTION: hand-verification of Lilac is sufficient acceptance for slice 1; a generated-agent smoke test is a follow-up, not a slice-1 gate. See Open question 4.]

## Scope

### In scope

- A new **eve emitter** in `pnpm prism:build`, siblings to the existing platform emitters, that reads canonical persona source (`.ai-skills/skills/<persona>/{frontmatter.yml, shared.md}`) and writes an eve agent directory per in-scope persona.
- The **Sol-orchestrator-over-remote-agents** model (Option B): one eve agent per persona, each its own deployment with its own instructions/skills/tools/sandbox/schedule, dispatched by Sol via `defineRemoteAgent`.
- **Lilac proven end-to-end** on eve's local on-disk world as the first slice — the reference implementation that de-risks the emitter and the wiring before the slice widens.
- The **new engineering surfaces** the port forces into existence (detailed under Requirements): entry-point inversion / routing, persona state-location on a repo checkout inside the sandbox, per-gate HITL wiring, and auth policy.

### Out of scope (`won't this time`)

- Porting the **interactive build loop** — Winston/Clove/Briar and any persona whose value is a human-in-the-IDE editing session. These stay as IDE skills; they have no scheduled/channel/always-on fit and the port would buy nothing. (Restated as a hard non-goal below.)
- Building the **integration port speculatively**. Connections to Slack/Linear/GitHub MCP surfaces are built only when a persona is actually being deployed against that surface — not pre-built for personas that aren't shipping yet. (Restated as a non-goal.)
- Depending on **any Vercel-only service**. The first slice must run on the local world. Vercel Cron, Vercel Sandbox prewarm, the Agent Runs dashboard, and Vercel-OIDC-only auth are additive conveniences, never requirements. (Restated as a non-goal.)
- **Postgres/Redis Workflow worlds.** Confirmed roadmap in eve, not a current application API. The local on-disk world (`.workflow-data`) is the only durability backend available.
- **Step-level idempotency for side-effecting actions** (git push, Slack post, Linear write). Deferred — see Open question 2. The first slice gates Lilac's single side effect (the Slack post) behind HITL rather than building a general idempotency layer.

### Goals

- Add an eve compile target to `pnpm prism:build` that emits a valid eve agent directory per in-scope autonomous persona.
- Prove the full path — emit → `eve build` → `eve start` → scheduled run → channel post — end-to-end with Lilac on the local world.
- Establish the Option B orchestration model (Sol dispatching remote agents) as the autonomous-slice execution shape.
- Keep `.prism/` markdown the single source of truth. The port adds an emitter; it never relocates the system.
- Keep the existing build green throughout.

### Non-goals (explicit)

1. **Porting the interactive build loop.** Winston, Clove, Briar, and the human-in-IDE editing workflow are not ported. The autonomous slice is defined by always-on/scheduled/channel fit; the build loop has none.
2. **Building the integration port speculatively.** The MCP-shaped integration port is built only when actually deploying a persona that needs it — never ahead of a concrete deployment.
3. **Depending on any Vercel-only service.** The first slice runs on eve's local on-disk world with direct-to-Anthropic routing. No Vercel Cron, Sandbox, dashboard, or Vercel-OIDC-only auth as a requirement.

## User journeys

### Journey A — Maintainer adds eve as a compile target

A PRISM maintainer edits `.ai-skills/skills/prism-standup-summary/shared.md` to refine Lilac's standup behavior. They run `pnpm prism:build`. Alongside the existing `.claude/`/`.codex/`/`.cursor/` outputs, the eve emitter now writes a Lilac eve agent directory: `instructions.md` carrying Lilac's identity, `skills/prism-standup-summary/SKILL.md` carrying the workflow body with a `description` routing hint, a `schedules/` entry for the standup cadence, and a Slack `channels/` entry. They run `pnpm prism:check` — it passes; no drift. The persona's behavior lives in one place (the markdown) and compiles to N targets, eve now among them.

### Journey B — Lilac fires on a schedule and posts a standup

The generated Lilac agent is built (`eve build`) and served (`eve start`) against the local on-disk world. A cron schedule fires (or a developer hits the dev-trigger route). Lilac's turn runs: `instructions.md` loads the identity, the standup skill's `description` matches, the model loads the skill, composes the 4-section standup from PR activity, and reaches the Slack post. The post is the one non-idempotent side effect, so it surfaces as a HITL approval (rendered as Slack buttons). On approval, the standup posts in-thread. No human typed a trigger; the schedule was the entry point.

### Journey C — Sol orchestrates a persona as a remote agent

Sol, running a goal-driven sequence, needs the autonomous slice to act. Instead of dispatching an in-session subagent, Sol calls the persona's deployed eve agent via `defineRemoteAgent({ url, description, auth })`. Because a remote agent never sees the parent's history, Sol packs everything the persona needs into the `message` field. The persona agent runs independently — its own skills, its own sandbox, its own auth — and posts a terminal callback. Sol's parked turn resumes with the result. Failure in one persona's lane is contained to that lane.

## Requirements

### Functional

The new engineering surfaces are the hard part of this initiative. They are first-class requirements, not implementation details — each one is a problem the current IDE-skill model never had to solve.

- **FR-1 — eve emitter in `pnpm prism:build`.** A new emitter, structured as a sibling to the existing platform emitters in `scripts/ai-skills/build.ts`, reads canonical persona source and writes an eve agent directory per in-scope persona. It honors the same drift-detection contract (`writeFileIfChanged`, `--check` mode, managed-marker cleanup) the other emitters follow, so `prism:check` covers eve output the same way it covers `.claude`/`.codex`/`.cursor`.

- **FR-2 — Persona-to-eve-agent mapping.** The emitter maps PRISM's persona source onto eve's agent slots: persona identity (the "You are X" frame + always-on rules) → `instructions.md`; the workflow body (`shared.md`) → `skills/<id>/SKILL.md` with a `description` frontmatter routing hint; sibling files (references/, templates/) → packaged-skill siblings; scheduled cadence → `schedules/`; inbound surface → `channels/`; model selection → `agent.ts`. The `description` field is load-bearing — it is eve's *only* skill-routing mechanism (no static event→skill dispatch table exists) — so the emitter must guarantee every emitted `SKILL.md` carries a usable routing hint. PRISM frontmatter already carries a `description` per persona; the emitter treats verifying it as a routing hint (not just a label) as a pre-emit check. [ASSUMPTION: every in-scope persona's existing `description` reads as a usable routing hint as-is; Lilac's reads cleanly. The pre-emit check, not a hope, is what catches any that don't.]

- **FR-3 — Entry-point inversion / routing layer.** The IDE model is "human types a trigger → skill runs." The eve model inverts it: an inbound event (schedule fire, channel webhook) starts a session, and skill routing is *model-driven* — the model loads a skill when the turn content matches a `description`. There is no static event→skill dispatch table. The port must establish how each persona's entry point (its schedule body or channel message) carries enough context to trigger the right skill inside the agent. For Sol-as-orchestrator, this means Sol packs the routing-triggering context into each remote-agent `message`.

- **FR-4 — Persona state-location on a repo checkout.** PRISM personas read and write `.prism/` state — branch plans, lessons, audit reports. An eve agent runs inside a sandbox, not the maintainer's working tree. The port must define how a persona that needs repo state operates on a checkout: clone the repo into the sandbox → read/write the plan or report → commit. This is the surface that makes a persona like Sage (changelog) or Zoe (audit) able to touch `.prism/` at all, and it is the surface where the deferred idempotency problem bites hardest (a `git push` from a re-run step). For slice 1, Lilac reads PR activity from the GitHub API and posts to Slack — neither touches `.prism/` repo state — so this surface is *specified now but exercised in a later slice*. [ASSUMPTION: Lilac's slice does not require the checkout surface because her inputs come from an API, not a repo read; the first persona that does need it is Sage (changelog, reads tags/commits) or Zoe (audit, reads `.prism/` plans). Winston confirms the exact design in the architecture eval.]

- **FR-5 — Per-gate HITL wiring.** Each persona's side-effecting action (Slack post, git push, Linear write, GitHub comment) is gated through eve's HITL approval (`needsApproval: always()` / `once()`), which renders per channel (Slack buttons, Linear elicitations, GitHub comment prompts). HITL is also the slice-1 mitigation for the deferred step-idempotency problem. The enabling fact: eve re-runs a *step interrupted mid-execution* from the start, so a side effect that fired partway through a crashed step's `execute()` body fires again on the re-run (a completed step never re-runs — eve replays its recorded result). A side effect behind `always()` cannot fire from a re-run step without a fresh human decision, which is what makes it safe across replays. The port wires the gate for each in-scope persona's specific side effects.

- **FR-6 — Auth policy.** eve's `placeholderAuth()` fails closed — a half-configured agent returns 401, it does not serve. Real deployment requires a real auth: `httpBasic`, `jwtHmac`, `jwtEcdsa`, `oidc`, or a custom auth function (off-Vercel must not rely on `vercelOidc()` alone). The port defines the auth policy for the agent's protected session routes and, under Option B, the outbound auth Sol presents when calling a persona's remote agent (the receiving agent's auth walk must accept it). For slice 1 on the local world, `localDev()` covers loopback; a real auth policy is required before any non-local deploy. [ASSUMPTION: slice 1 runs entirely on loopback under `localDev()`; the first non-local deploy is the trigger for choosing the production auth helper. See Open question 3.]

- **FR-7 — Option B remote-agent orchestration.** Each in-scope persona is a separately deployed eve agent (its own URL/auth/skills/sandbox/schedule). Sol dispatches via `defineRemoteAgent`, packing context into `message` since the child inherits no history. Channels and schedules are root-only — which is why each persona is its own *root* agent rather than a declared subagent (declared subagents cannot have channels or schedules and inherit nothing).

### Non-functional

- **NFR-1 — Single source of truth preserved.** `.prism/` markdown stays canonical. eve output is generated, drift-checked, and never hand-edited — the same discipline as every other platform emitter.
- **NFR-2 — No Vercel lock-in in the first slice.** The slice runs on the local on-disk world, direct-to-Anthropic. Vercel features are additive only.
- **NFR-3 — Existing build integrity.** The eve emitter does not regress `prism:build`, `prism:check`, the literal guard, or the path guard.
- **NFR-4 — Beta-version containment.** eve 0.11.6 is public beta and its `ai` SDK dependency is beta; pin versions and isolate the eve emitter so a breaking upstream change is contained to the emitter, not the whole build.

## Constraints

- **Node ≥ 24.** eve requires Node 24.x. The host runs Node v22, so the eve toolchain runs in a Docker `node:24` container (or equivalent) — the build host and the eve runtime have different Node floors.
- **eve 0.11.6 beta.** APIs, behavior, and docs may change before GA. The `ai` SDK dependency (`7.0.0-beta.178`) and the TypeScript native-preview toolchain are also pre-release. Treat upstream stability as a live risk.
- **Disk-only durability.** The local Workflow world persists runs to `.workflow-data` on disk. In any non-Vercel deploy this directory must sit on persistent storage, not ephemeral container filesystem.
- **Direct-to-Anthropic routing requires `@ai-sdk/anthropic`.** The spike scaffold ships only the `ai` core and uses the gateway-routed model string. Direct routing (`ANTHROPIC_API_KEY` + the `anthropic()` provider object) needs `@ai-sdk/anthropic` added.
- **Channels and schedules are root-only.** A persona cannot receive channel events or fire schedules as a declared subagent — this is the structural reason Option B deploys each persona as its own root agent.
- **GitHub sandbox checkout requires the Vercel backend.** The local backend skips the repo checkout the GitHub channel performs before the first model call. This directly constrains the Eric-via-webhook option (see Open question 1).

## Open questions

1. **Eric-via-GitHub-webhook membership.** Should Eric (PR review on a GitHub webhook) join the autonomous slice, and in which wave? **Default path (used until resolved):** second wave, not the first slice. Two reasons push it out of slice 1: (a) the GitHub channel's pre-call sandbox checkout requires the Vercel backend — meaning Eric, on the GitHub channel, *cannot run on the local on-disk world the way Lilac can*; he is the one candidate whose full feature set conflicts head-on with the no-Vercel-lock-in goal, so admitting him to slice 1 would force that goal to bend; and (b) Eric's value depends on the FR-4 repo-state checkout surface, which is specified now but not exercised until a later slice. The recommended in-scope membership for the *autonomous slice* is Lilac, Sage, and Zoe; Eric is a documented candidate for wave 2 once the checkout surface and a non-Vercel GitHub path are settled. Resolver: Hunter / Winston during architecture eval.

2. **Step-idempotency for side-effecting actions.** eve re-runs a step interrupted mid-execution, so non-idempotent side effects (git push, Slack post, Linear write, GitHub comment) can fire twice. How does the port make these safe generally? **Default path (used until resolved):** gate each side effect behind HITL (`needsApproval: always()`) — a gated action cannot fire from a re-run step without a fresh human decision. This covers slice 1 (Lilac's single Slack post). A general idempotency layer (dedup keys, check-before-act) is deferred to whenever a persona has a side effect that *shouldn't* require human approval on every run. Resolver: Winston, when the first such persona ships.

3. **Exact state-location design (FR-4).** What is the concrete clone → read → commit → (push?) flow for a persona operating on `.prism/` state inside the sandbox, and where does idempotency gate the push? **Default path (used until resolved):** unspecified beyond the surface description above; slice 1 (Lilac) does not exercise it. The design lands when the first repo-state persona (Sage or Zoe) is built. Resolver: Winston during architecture eval / the wave-2 plan.

4. **Generated-agent acceptance beyond hand-verification.** Is hand-verifying Lilac sufficient acceptance for slice 1, or does the emitter need an automated smoke test that asserts a generated eve agent directory is valid (`eve build` accepts it) in CI? **Default path (used until resolved):** hand-verification for slice 1; an automated emitter smoke test is a follow-up, not a slice-1 gate. Resolver: Hunter.

## Stakeholders

- **Hunter (owner / decision-maker)** — resolves Open questions 1 and 4; owns the merge gate.
- **Winston (architecture)** — next persona. Evaluates the approach, resolves Open questions 2 and 3, and produces the implementation plan + ADR-0062.
- **Sol (orchestration)** — consumes the Option B model; the remote-agent dispatch surface is Sol's.
- **Lilac (first-slice persona)** — the reference implementation; her source is the emitter's first input.

## Decision log link

`.prism/prds/eve-substrate.decision-log.md` — to be created by Winston/Hunter if the locked decisions need an auditable per-decision trail beyond ADR-0062. (Internal stakes: decision log optional. The locked decisions are already captured in the dispatch brief and will be promoted to ADR-0062 by Winston, which is the durable record.)

## Handoff

**Next: Winston (architecture).** Winston evaluates the technical approach against the codebase, produces ADR-0062 promoting the locked decisions (eve as compile target, Option B one-agent-per-persona, autonomous-slice scope, MCP-shaped integration port built on demand, local-first durability, deferred step-idempotency, the Node/eve/auth prereqs), resolves Open questions 2 and 3, and builds the implementation plan as ordered tasks on `.prism/plans/epic-eve-substrate.md`. The emitter (FR-1) and Lilac-on-the-local-world (success metric 1) are the first plan tasks.
