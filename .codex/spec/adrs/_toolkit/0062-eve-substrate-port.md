---
Number: 0062
Title: Port the Autonomous PRISM Persona Slice onto Vercel eve as a Compile Target
Status: accepted
Date: 2026-06-19
---

## Context

PRISM's personas run as interactive skills inside a developer's IDE chat. Every persona starts when a human types a trigger; nothing runs without a person in the loop. That model fits the build-loop personas — Winston plans, Clove implements, Briar and Eric review, all with a human at the keyboard — but it strands the personas whose value is *being always on*. Lilac's standup wants to fire on a schedule and post to Slack with no one asking. Sage's changelog wants to run on a tag push. Zoe's audit wants a weekly cadence. None of that is reachable while the only entry point is a human typing into a chat box.

Vercel eve is a filesystem-first agent runtime: one agent is a directory of markdown instructions, on-demand skills, channels (HTTP/messaging entrypoints), and schedules (cron). Its skill shape — a `SKILL.md` with YAML frontmatter routed to the model by a `description` field — is the shape PRISM already authors in `.ai-skills/skills/<id>/`. A discovery spike (`/tmp/eve-discovery-digest.md`, source-cited against eve 0.11.6) was verified claim-by-claim against the actual eve docs during this architecture evaluation; all 14 load-bearing runtime facts hold as written (see § References for the doc paths). The match is close enough that porting a persona is mostly an emit-and-wire problem, not a rewrite.

This ADR records the locked decisions that frame the port. The first slice proves the path end-to-end with Lilac on eve's local on-disk world; the emitter and the orchestration model are the durable surfaces the slice establishes. The PRD at `.prism/prds/eve-substrate.md` (#235) is the requirements record this decision answers; the implementation plan lives at `.prism/plans/epic-eve-substrate.md`.

## Decision

Seven decisions are locked. Each states why.

### 1. eve is a compile/deploy target, not a new home

`.prism/` markdown stays the single source of truth. Porting to eve means adding an **eve emitter** to `pnpm prism:build` — a sibling to the existing `.claude` / `.codex` / `.cursor` / `.agents` emitters — that reads canonical persona source and writes an eve agent directory per in-scope persona. eve output is generated, drift-checked by `pnpm prism:check`, and never hand-edited, exactly like every other platform output.

**Why:** PRISM's core promise is one source compiling to N targets (ADR-0031, the bifurcated install layout). Relocating any persona's behavior into eve-native files would fork the source of truth and break that promise — a persona would then live in two places that drift. Treating eve as the Nth target keeps the system honest: the markdown is authored once, and `prism:check` proves the eve copy matches it the same way it proves the Claude copy matches it.

### 2. Option B — one eve agent per persona, Sol orchestrates them as remote agents

Each in-scope autonomous persona is a **separately deployed eve agent** with its own `instructions.md`, skills, tools, sandbox, schedule, and auth. Sol dispatches to them via eve's `defineRemoteAgent({ url, description, auth })`, packing all needed context into the `message` field since a remote child never sees the parent's history.

**Why:** Channels and schedules are **root-only** in eve — a persona running as a *declared* subagent cannot receive channel events or fire schedules, and declared subagents inherit nothing from a root (both verified against `docs/subagents.mdx` and `docs/reference/project-layout.md`). An always-on persona must therefore be its own root agent. That structural fact forces Option B: one root agent per persona, composed by Sol over the remote-agent boundary. This is design-level for this epic — the wiring is built when a persona is actually deployed, not now. It also maps cleanly onto how Sol already works (ADR-0001: the plan is the content bus; Sol packs context and routes, never interprets) — the remote-agent `message` is the cross-process analogue of the plan hand-off Sol already does in-session.

### 3. Scope is the autonomous slice only — not the interactive build loop

Winston, Clove, Briar, and any persona whose value is a human-in-the-IDE editing session are **not** ported. The autonomous slice is defined by always-on / scheduled / channel fit: Lilac (slice 1), then Sage and Zoe.

**Why:** The build-loop personas have no scheduled or channel entry point — their value is the live editing session with a human steering. Porting them to eve would buy nothing and would force the no-Vercel-lock-in goal to bend (the GitHub channel's pre-call sandbox checkout requires the Vercel backend; the local on-disk world skips it — verified against `docs/channels/github.mdx`). Eric-via-GitHub-webhook is the one build-adjacent candidate with autonomous fit, but his full feature set conflicts head-on with the local-world goal, so he is a documented wave-2 candidate, not slice 1.

### 4. Integrations stay behind an MCP-shaped port, built only when deploying

A persona's external surfaces (Slack post, Linear write, GitHub comment) are reached through eve tools/connections shaped like the MCP surfaces the persona already uses. These are built **only when a persona is actually being deployed against that surface** — never pre-built for a persona that isn't shipping.

**Why:** Speculative integration wiring is dead weight that rots against a beta runtime. eve skills add *instructions*, not execution surface — a skill that references a Slack tool still needs that tool declared in the agent (verified against `docs/skills.mdx`). Building the tool only at deploy time keeps the emitter's output minimal and means the integration code is written against a concrete, testable deployment rather than a hypothetical one.

### 5. Local-first durability — on-disk Workflow world now, Postgres/Redis noted as roadmap

The first slice runs on eve's local on-disk Workflow world (`.workflow-data`), direct-to-Anthropic via `@ai-sdk/anthropic` + `ANTHROPIC_API_KEY`. No Vercel service is a requirement. Pluggable Postgres/Redis Workflow worlds are recorded as roadmap, not adopted.

**Why:** The no-Vercel-lock-in goal (PRD NFR-2) requires the slice run entirely off-Vercel. The local world is fully supported off-Vercel and carries no coupling to Vercel services (verified against `docs/concepts/execution-model-and-durability.md`). Postgres/Redis worlds are explicitly described in the eve docs as a future capability, not a current application API — adopting them now would be building against vapor. One operational note: in any non-Vercel deploy, `.workflow-data` must sit on persistent storage, not an ephemeral container filesystem. A correction the spike surfaced: `@ai-sdk/anthropic` is **not** in the spike's dependencies (the spike uses the gateway-routed model string, which needs `AI_GATEWAY_API_KEY` off-Vercel) — so adding `@ai-sdk/anthropic` for direct routing is a real, named task, not an assumption.

### 6. Step-idempotency is deferred — gated behind eve's HITL primitive in the meantime

eve re-runs a step **interrupted mid-execution**, so a non-idempotent side effect (Slack post, git push, Linear write, GitHub comment) can fire twice if the process crashes partway through the step's `execute()` body. A general idempotency layer (dedup keys, check-before-act) is **deferred**. In the meantime, each side effect is gated behind eve's HITL approval (`needsApproval: always()`), which cannot fire from a re-run step without a fresh human decision.

**Why:** Completed steps never re-run — eve replays the recorded result — so the risk is narrow: only a side effect caught mid-step by a crash (verified against `docs/concepts/execution-model-and-durability.md` and `docs/tools/human-in-the-loop.md`). For slice 1, Lilac's single side effect is the Slack post, and her existing behavior already requires explicit preview-and-confirm before posting — so the HITL gate is not new friction, it is the persona's existing contract expressed in eve's primitive. A general idempotency layer earns its place only when a persona has a side effect that *shouldn't* require human approval on every run; until then, HITL is the correct, cheaper mitigation.

### 7. Node-floor split is a real constraint — the emitter runs on host Node; running eve needs Node 24

eve requires Node 24.x. The PRISM build host runs Node 22. The **eve emitter** is TypeScript inside `build.ts` and runs on the host Node — it is testable on-host. **Running** a generated agent (`eve build && eve start`) needs Node 24, which runs in a Docker `node:24` container (the spike already does this).

**Why:** This split decides what lands as CI-green automated work versus what is a manual Docker validation milestone. The emitter's correctness is provable on host Node by asserting the generated directory shape and diffing a regenerated agent against a hand-authored reference — no Node 24 needed. Actually exercising the agent on eve is gated behind Docker and is a manual milestone for slice 1, not a CI gate. Writing a CI acceptance criterion that requires Node 24 would fail on the host runner; the plan keeps the CI-runnable criteria host-Node-compatible and marks the Docker validation explicitly.

## Consequences

- **Positive:** The autonomous-slice personas become deployable always-on agents without leaving the single-source-of-truth markdown workflow. The emitter is a sibling to proven code, drift-guarded by the existing `prism:check`, so the integration risk is contained to one new module.
- **Positive:** The Lilac-by-hand-first sequencing (see the plan's `## Decisions`) produces a runtime-validated reference artifact, turning the emitter's correctness from a Docker-gated integration question into an on-host byte-diff. The build stays green on host Node throughout.
- **Positive:** Option B contains failure per-lane — one persona's deployment, auth, and sandbox are independent. A crash or auth failure in one persona's agent doesn't cascade.
- **Negative:** eve 0.11.6 is public beta and its `ai` SDK dependency (`7.0.0-beta.178`) is beta. APIs may change before GA. The mitigation is version pinning and isolating the eve emitter so a breaking upstream change is contained to that module, not the whole build (PRD NFR-4).
- **Negative:** The Node-floor split means the full end-to-end proof (agent running on eve) cannot run in the host CI — it is a manual Docker milestone. This is an honest gap: CI proves the emitter is correct, a human proves the agent runs. Open question 4 (an automated emitter smoke test in CI) is Hunter's to resolve; the default is hand-verification for slice 1.
- **Negative:** Two deferred surfaces (FR-4 repo-state checkout, general step-idempotency) are specified but unexercised until a wave-2 persona needs them. The risk is that the deferred design proves wrong when first exercised; the mitigation is that the default paths are documented in the plan's `## Decisions` as open-question variants so the gap is visible, not silent.
- **Neutral:** eve output is a new generated tree under the platform-output convention (`.eve/agents/<persona>/`), gitignored or committed per the same per-tool ownership rules as `.codex`/`.cursor` (ADR-0044). The seed-curation and literal-guard machinery extends to cover it.

## References

- `.prism/prds/eve-substrate.md` — Parker's PRD (#235), the requirements this decision answers.
- `.prism/plans/epic-eve-substrate.md` — the implementation plan; carries the sequencing, routing, idempotency, state-location, and verification-split decisions with their default paths.
- `/tmp/eve-discovery-digest.md` — the source-cited eve runtime digest, verified claim-by-claim during this evaluation.
- eve docs (verified during this evaluation): `docs/skills.mdx` (skill shape, model-driven routing), `docs/reference/project-layout.md` (agent anatomy, channels/schedules root-only), `docs/subagents.mdx` + `docs/guides/remote-agents.md` (Option B mechanism, no-inheritance), `docs/schedules.mdx` (cron format), `docs/tools/human-in-the-loop.md` (HITL gating), `docs/concepts/execution-model-and-durability.md` (step re-run, local world), `docs/guides/deployment.md` (direct-to-Anthropic, `eve build`/`eve start`), `docs/channels/github.mdx` (Vercel-backend checkout), `docs/guides/auth-and-route-protection.md` (auth fails closed).
- [ADR-0031](./0031-bifurcated-install-layout.md) — the bifurcated install layout; eve becomes the Nth platform target under it.
- [ADR-0044](./0044-direct-write-tool-outputs.md) — direct-write tool outputs; the per-tool ownership rule the eve output follows.
- [ADR-0001](./0001-plan-is-source-of-truth.md) — the plan as content bus; the in-session analogue of Sol's remote-agent `message`.
- `scripts/ai-skills/build.ts` — the emitter host; the new eve emitter is a sibling to `buildClaudeAgentMarkdown` / `buildCodexAgentToml`.
</content>
</invoke>
