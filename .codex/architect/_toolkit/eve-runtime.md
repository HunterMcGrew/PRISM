# Eve Runtime

## What this doc covers

This is the reference for two things: the operational shape of PRISM's eve emitter (what `pnpm prism:build` generates and why), and the manual Docker milestone that proves Lilac runs on eve end-to-end. The Docker validation is a one-time milestone, not a CI gate — see § Node-floor split below. [ADR-0062](../spec/adrs/_toolkit/0062-eve-substrate-port.md) records all locked decisions; this doc is the everyday operational lookup.

## Node-floor split

The eve emitter runs on the host Node (22.x) — it is TypeScript inside `scripts/ai-skills/build.ts`, and its correctness is proved by `pnpm prism:test` and `pnpm prism:check` on the host. Running a generated eve agent requires **Node 24.x**, as declared in `.eve/package.json`. That split is why the Docker validation is manual:

- **Host CI (Node 22):** `pnpm prism:build`, `pnpm prism:check`, `pnpm prism:test` — all green, no Docker.
- **Manual Docker milestone (Node 24):** `eve build`, `eve start`, trigger the schedule, confirm Lilac runs.

Do not add a CI acceptance criterion that requires Node 24. The host runner cannot satisfy it. If you need to automate this in the future, run a separate CI job in a `node:24` container image.

## Docker validation runbook (manual milestone)

This runbook proves that the generated Lilac agent builds and runs on eve. Run it once after Units A–E land to close the `[Docker / manual]` acceptance criteria in the epic plan.

### Prerequisites

- Docker installed and running.
- `ANTHROPIC_API_KEY` with access to `claude-sonnet-4.6`.
- The generated `.eve/agents/prism-standup-summary/` directory committed to the branch (verify with `git status`).

### Step 1 — Start a Node 24 container

```bash
docker run -it --rm \
  -v "$(pwd):/workspace" \
  -w /workspace \
  -p 3000:3000 \
  -e ANTHROPIC_API_KEY="$ANTHROPIC_API_KEY" \
  node:24 bash
```

This mounts the repo root into `/workspace` and forwards port 3000 so the local eve server is reachable from your host.

### Step 2 — Install eve dependencies

```bash
cd .eve && npm install
```

`.eve/package.json` declares the standalone dependency set: `eve@^0.11.6`, `@ai-sdk/anthropic`, `ai@7.0.0-beta.178` (pinned — see ADR-0062 § Decision 5 for the version-pinning rationale), and `zod`. The `engines.node` field is `24.x`, which is satisfied by the container.

### Step 3 — Build the agent

```bash
npx eve build
```

`eve build` compiles the agent and writes eve's framework artifacts under `.eve/` (discovery manifest, compiled manifest, module map). It does **not** write `.vercel/output` because the `VERCEL` environment variable is not set in this container — that is correct for off-Vercel validation. Source: `docs/guides/deployment.md`.

If `eve build` fails, open `.eve/.eve/` (the framework artifact output) to read the diagnostics and module map.

### Step 4 — Start the eve server

```bash
npx eve start
```

`eve start` serves Nitro's compiled Node output and starts the schedule runner. The standup schedule (cron `0 13 * * 1-5`, weekdays at 13:00 UTC) will fire automatically at its cadence while `eve start` is running, but you do not need to wait for that cadence to validate. Workflow state persists to disk under `.workflow-data` in the working directory. Source: `docs/guides/deployment.md`, `docs/concepts/execution-model-and-durability.md`.

The server is ready when you see Nitro's startup output. Leave it running.

### Step 5 — Trigger the standup schedule

From your host machine (a separate terminal), trigger the standup by name using the dev dispatch route:

```bash
curl -X POST http://localhost:3000/eve/v1/dev/schedules/standup
```

The route returns `{ "scheduleId": "standup", "sessionIds": ["..."] }`. The `:scheduleId` segment is the path-derived schedule name — `agent/schedules/standup.md` maps to `standup`. This route is **dev-server-only** (i.e., `eve start` with no `VERCEL` env set); production builds do not mount it. Source: `docs/schedules.mdx`.

If the route returns 404, confirm the schedule file is at `.eve/agents/prism-standup-summary/schedules/standup.md` and that `eve build` succeeded.

### Step 6 — Confirm Lilac's standup composes

Watch the `eve start` terminal output. Lilac should:

1. Pull recent PR activity (GitHub API calls, visible in the tool-call trace).
2. Compose the 4-section standup (Project / Yesterday / Today / Blockers).
3. Surface a **preview-and-confirm approval** before posting to Slack — this is the HITL gate from `channels/slack.ts`. The Slack channel wraps the post action behind `needsApproval: always()` in slice 1 (Lilac's existing preview-and-confirm contract expressed as an eve HITL primitive). Source: `docs/tools/human-in-the-loop.md`, ADR-0062 § Decision 6.

If the approval gate fires, the milestone is successful — you can cancel the approval (confirm nothing posts) to avoid sending a test standup to the real Slack channel.

### What the Slack channel needs

The `channels/slack.ts` file uses `connectSlackCredentials("slack/prism-standup")`. In a real Vercel Connect deployment this resolves automatically; in the local Docker run it requires a valid Slack token in the environment. If you need a non-Vercel Slack integration for local testing, set `SLACK_BOT_TOKEN` and consult the eve Slack channel docs. For slice 1 milestone validation, the HITL gate firing (step 6) is sufficient proof — the approval surface and the post are the contract; a real Slack post is not required.

### Auth note for non-local deploys

`channels/eve.ts` uses `localDev()` + `placeholderAuth()`. This configuration is correct for local-world validation — `localDev()` passes on loopback, and `placeholderAuth()` fails closed on any non-local request (returns 401). Before deploying outside loopback, swap `placeholderAuth()` for a real auth helper (`httpBasic()`, `jwtHmac()`, `jwtEcdsa()`, or `oidc()`). Source: `docs/guides/deployment.md` § Auth, `docs/guides/auth-and-route-protection.md`.

`vercelOidc()` is intentionally omitted — it depends on Vercel OIDC and conflicts with the no-Vercel-lock-in goal (ADR-0062 § Decision 5).

## Open follow-up: hard HITL gate not in slice 1

The plan's `## Decisions` § Idempotency notes that a fully general idempotency layer (dedup keys, check-before-act per tool) is deferred. Slice 1 relies on Lilac's behavioral preview-and-confirm via `needsApproval: always()`. A hard runtime HITL gate at the `defineTool` level is not part of slice 1 — it is a wave-2 task, landing when the first persona needs a side effect that *should not* require human approval on every run. Until then, `always()` is both sufficient and correct for Lilac.

## Emitter source

The eve emitter lives in `scripts/ai-skills/build.ts`:

- `buildEveAgentFiles` — derives the six output files from canonical source and `eve.yml` config.
- `EVE_AUTONOMOUS_PERSONAS` — the set of persona IDs in scope for eve emission (Lilac for slice 1).
- `eveAgentsRootHasManagedContent` — checks the per-persona `.ai-skill-generated` marker that gates drift detection.

The emitter's correctness is proved on the host by `pnpm prism:test` (the `eve-emitter.test.ts` suite, which includes a byte-diff against the hand-authored Lilac reference) and by `pnpm prism:check` (drift detection). Adding a persona to the autonomous slice: enter its ID in `EVE_AUTONOMOUS_PERSONAS` and add an `eve.yml` sibling to its skill dir. The build fails at runtime if a set member is missing its `eve.yml` or a required key.

## Where to look

- [ADR-0062](../spec/adrs/_toolkit/0062-eve-substrate-port.md) — all locked decisions (agent topology, model routing, scope, idempotency, Node-floor split)
- `.prism/architect/_toolkit/install-layout.md` § Eve agent output — the committed-vs-ignored split and the per-file derivation table
- `.eve/package.json` — pinned dependency versions (`eve@^0.11.6`, `ai@7.0.0-beta.178`)
- `.eve/agents/prism-standup-summary/` — the generated Lilac agent directory
- `.ai-skills/skills/prism-standup-summary/eve.yml` — the canonical eve config sibling
- `scripts/ai-skills/build.ts` — the emitter implementation
- `scripts/ai-skills/eve-emitter.test.ts` — the on-host correctness tests
