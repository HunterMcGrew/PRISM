# Eve Runtime

## What this doc covers

This is the reference for the operational shape of PRISM's eve emitter (what `pnpm prism:build` generates and why) and the manual Docker milestones that prove each persona class runs on eve end-to-end. Docker validation is a manual milestone, not a CI gate — see § Node-floor split below. [ADR-0062](../spec/adrs/_toolkit/0062-eve-substrate-port.md) records the slice 1 decisions; [ADR-0063](../spec/adrs/_toolkit/0063-eve-repo-state-personas.md) records the FR-4 (repo-state) decisions; this doc is the everyday operational lookup for both.

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

`.eve/package.json` declares the standalone dependency set: `eve@^0.11.6`, `@ai-sdk/anthropic`, `ai@7.0.0-beta.178` (pinned — see ADR-0062 § Decision 5 for the version-pinning rationale), `zod`, and `@vercel/connect@0.2.2`. The `@vercel/connect` package provides the `connectSlackCredentials` helper imported by `channels/slack.ts` — it is a build-time connection dependency (the Vercel Connect credential bridge), not a Vercel runtime-service dependency, so it is consistent with the no-Vercel-lock-in goal (ADR-0062 § Decision 5). The `engines.node` field is `24.x`, which is satisfied by the container.

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

## Repo-state personas (FR-4) — Sage and Zoe

Wave 2 ports two personas that operate on repo state: Sage (changelog) reads git history and writes a changelog document; Zoe (surface audit) reads the `.prism/` tree and writes back audit reports, plan verdict annotations, and a state file. Both need a live checkout of the repo inside their sandbox and a write-back path to commit the artifact. ADR-0063 records all FR-4 decisions; this section is the operational runbook.

### How the sandbox checkout works

A repo-state persona's `eve.yml` declares `sandbox: true`, `sandboxBackend: docker` (or `microsandbox`), and `repoCheckout: true`. The emitter generates a `sandbox/sandbox.ts` file calling `defineSandbox` with two lifecycle hooks:

- **`bootstrap`** — runs once when the template image is built. Clones the repo into `/workspace`. The clone is the baseline every later session inherits. Source: `sandbox.mdx` — "Put reusable setup here that every later session inherits, such as cloning a baseline repo."
- **`onSession`** — runs once per session. Executes `git fetch origin && git reset --hard origin/main` so each session reads current state, not the frozen bootstrap snapshot. Source: `sandbox.mdx` — "put per-session setup here" for "one-time markers."

The clone and the subsequent reads (`bash`, `read_file`, `glob`, `grep`) use the default harness tools — no new tools are needed. Source: `docs/concepts/default-harness.md`.

The network-policy pattern the docs recommend matches the bootstrap/onSession split: leave the factory open so `bootstrap` can `git clone`, then lock down in `onSession`. Source: `sandbox.mdx` § Network policy — "The common pattern combines both."

### Backend constraint

Repo-state personas require `docker()` or `microsandbox()` — never `justbash()`. The `just-bash` backend "has no real binaries" (`sandbox.mdx` § Backends) and cannot run `git`, so the bootstrap clone fails at runtime. The emitter enforces this: `loadEveAgentConfig` in `build.ts` throws at build time when `sandbox: true` and `sandboxBackend` is absent or `justbash`. This is ADR-0063 Decision 3.

A consumer who selects `justbash` for a repo-state persona gets a build error, not a Docker-only runtime failure — the constraint is caught on host CI.

### How the write-back works

After the persona writes its artifact into `/workspace`, it stages and commits the output, then pushes. The push is gated behind the `needsApproval: always()` HITL primitive — the agent surfaces the staged diff for review, and the push does not fire without an explicit human approval.

The emitter synthesizes the write-back instruction as a `## Write-back` section appended to `SKILL.md`. The synthesized text:

1. Describes the sandbox checkout context.
2. States the push command with the paths declared in `writeBackPaths` from `eve.yml`.
3. Explains the `always()` gate and its step-replay safeguard rationale.

This section is token-substituted and byte-diffed like every other generated file. The `buildWriteBackSection` function in `build.ts` is the source.

**Why `always()` rather than a general idempotency layer:** eve re-runs a step interrupted mid-execution, so a `git push` caught mid-step by a crash can fire twice. A push behind `always()` cannot fire from a re-run step without a fresh human decision. This is the same mitigation ADR-0062 Decision 6 applied to Lilac's Slack post. The full rationale is ADR-0063 Decision 4.

The HITL gate is each persona's existing contract expressed as an eve primitive: Sage's existing workflow ships through a human-owned release PR; Zoe's existing contract forbids silent edits. The gate is not new friction.

### Runtime-only unknowns — what the Docker milestone must verify

The emitter's correctness is proved on host CI (Node 22) by the byte-diff and the `eve-emitter.test.ts` suite. The full clone → fetch → read → write → commit → push flow is only exercised in the Docker milestone (Node 24). Four things host CI cannot prove:

1. **Git auth in the sandbox.** The bootstrap clone needs network access and valid credentials for the repo. The sandbox docs show credential brokering via `networkPolicy` transforms (`sandbox.mdx` § Credential brokering), but the emitter does not yet wire credentials — the milestone is the discovery point.
2. **Network policy.** The Docker backend honors only `"allow-all"` and `"deny-all"` (`sandbox.mdx` § Network policy) — domain-level allow-lists work on Vercel and microsandbox, not Docker. The bootstrap clone needs outbound access; a tightened policy for `onSession` may be worth adding after the milestone.
3. **Git availability in the container.** The default eve runtime image (`ghcr.io/vercel/eve:latest`) should have `git`, but this is unverified — confirm at `eve build` time.
4. **Concurrent-push races.** If a human commits to `.prism/` between `onSession`'s reset and the agent's `git push`, the push may fail. A `git pull --rebase` before push is the mitigation; if the Docker milestone surfaces this, that is the trigger to add it to the write-back instruction and revisit Open Q2 (the general idempotency layer).

These are listed in ADR-0063 § Consequences as the runtime-only unknowns the milestone resolves.

### Docker validation runbook — Sage (prism-changelog)

Run after Units G and H land to close the `[Docker / manual]` AC for Sage.

**Prerequisites:** Docker installed and running; `ANTHROPIC_API_KEY` with access to `claude-sonnet-4.6`; the generated `.eve/agents/prism-changelog/` directory committed to the branch.

**Step 1 — Start a Node 24 container**

```bash
docker run -it --rm \
  -v "$(pwd):/workspace" \
  -w /workspace \
  -p 3000:3000 \
  -e ANTHROPIC_API_KEY="$ANTHROPIC_API_KEY" \
  node:24 bash
```

**Step 2 — Install eve dependencies**

```bash
cd .eve && npm install
```

**Step 3 — Build the agent**

```bash
npx eve build
```

**Step 4 — Start the eve server**

```bash
npx eve start
```

**Step 5 — Trigger Sage via the dev route**

The Sage schedule name is `changelog` (from `eve.yml`'s `scheduleName` key). Trigger it:

```bash
curl -X POST http://localhost:3000/eve/v1/dev/schedules/changelog
```

**Step 6 — Confirm the write-back gate fires**

Watch the `eve start` terminal. Sage should:

1. Run `git fetch && git reset --hard` in the sandbox (onSession).
2. Read git log for the configured tag range.
3. Compose the changelog and write it into `/workspace`.
4. Surface a `needsApproval: always()` HITL gate before pushing.

If the gate fires and the diff is visible, the milestone is successful. Cancel the approval to avoid pushing to the repo during validation.

### Docker validation runbook — Zoe (prism-surface-audit)

Run after Unit I lands to close the `[Docker / manual]` AC for Zoe.

**Prerequisites and Steps 1–4:** identical to the Sage runbook above.

**Step 5 — Trigger Zoe via the dev route**

The Zoe schedule name is `audit`.

```bash
curl -X POST http://localhost:3000/eve/v1/dev/schedules/audit
```

**Step 6 — Confirm the write-back gate fires**

Watch the `eve start` terminal. Zoe should:

1. Run `git fetch && git reset --hard` in the sandbox (onSession).
2. Walk `.prism/plans/`, `.prism/spec/adrs/`, and `.prism/architect/` in the checkout.
3. Issue per-Decision verdicts and write the audit report and state file into `/workspace`.
4. Surface a `needsApproval: always()` gate before `git push`.

Zoe's write-back paths: `.prism/audits`, `.prism/plans`, and `.prism/audit-state.json`. Confirm the staged diff covers all three.

## Open follow-up: hard HITL gate not in slice 1

The plan's `## Decisions` § Idempotency notes that a fully general idempotency layer (dedup keys, check-before-act per tool) is deferred. Slice 1 relies on Lilac's behavioral preview-and-confirm via `needsApproval: always()`. A hard runtime HITL gate at the `defineTool` level is not part of slice 1 — it is a wave-2 task, landing when the first persona needs a side effect that *should not* require human approval on every run. Until then, `always()` is both sufficient and correct for Lilac.

## Emitter source

The eve emitter lives in `scripts/ai-skills/build.ts`:

- `buildEveAgentFiles` — derives the core output files from canonical source and `eve.yml` config (identity/workflow split + schedule/channel templates).
- `buildEveSandboxFile` — generates `sandbox/sandbox.ts` when `eve.yml` declares `sandbox: true`; returns `null` for non-sandbox personas (the regression guard that keeps Lilac's output unchanged).
- `buildWriteBackSection` — synthesizes the `## Write-back` SKILL.md section when `eve.yml` declares `writeBackGate: always`; returns empty string otherwise.
- `loadEveAgentConfig` — parses `eve.yml` and throws on invalid combinations: `sandbox: true` with no real backend, and `writeBackGate` set to anything other than `always`.
- `EVE_AUTONOMOUS_PERSONAS` — the set of persona IDs in scope for eve emission (Lilac, Sage, and Zoe as of wave 2).
- `eveAgentsRootHasManagedContent` — checks the per-persona `.ai-skill-generated` marker that gates drift detection.

The emitter's correctness is proved on the host by `pnpm prism:test` (the `eve-emitter.test.ts` suite, which includes byte-diffs against the hand-authored Lilac, Sage, and Zoe reference fixtures) and by `pnpm prism:check` (drift detection). Adding a persona to the autonomous slice: enter its ID in `EVE_AUTONOMOUS_PERSONAS` and add an `eve.yml` sibling to its skill dir. The build fails at build time if a set member is missing its `eve.yml` or a required key.

## Where to look

- [ADR-0062](../spec/adrs/_toolkit/0062-eve-substrate-port.md) — slice 1 decisions (agent topology, model routing, scope, idempotency, Node-floor split)
- [ADR-0063](../spec/adrs/_toolkit/0063-eve-repo-state-personas.md) — FR-4 decisions (sandbox checkout, write-back HITL gate, backend constraint, Open Q2)
- `.prism/architect/_toolkit/install-layout.md` § Eve agent output — the committed-vs-ignored split and the per-file derivation table (including `sandbox/sandbox.ts`)
- `.eve/package.json` — pinned dependency versions (`eve@^0.11.6`, `@ai-sdk/anthropic`, `@vercel/connect@0.2.2`, `ai@7.0.0-beta.178`, `zod@4.4.3`)
- `.eve/agents/prism-standup-summary/` — the generated Lilac agent directory (no sandbox)
- `.eve/agents/prism-changelog/` — the generated Sage agent directory (with `sandbox/sandbox.ts`)
- `.eve/agents/prism-surface-audit/` — the generated Zoe agent directory (with `sandbox/sandbox.ts`)
- `.ai-skills/skills/prism-standup-summary/eve.yml` — Lilac's canonical eve config (no sandbox keys)
- `.ai-skills/skills/prism-changelog/eve.yml` — Sage's canonical eve config (`sandbox: true`, `repoCheckout: true`, `writeBackGate: always`)
- `.ai-skills/skills/prism-surface-audit/eve.yml` — Zoe's canonical eve config (`sandbox: true`, `repoCheckout: true`, `writeBackGate: always`)
- `scripts/ai-skills/__fixtures__/eve-sage-reference/` — hand-authored Sage reference (byte-diff target)
- `scripts/ai-skills/__fixtures__/eve-zoe-reference/` — hand-authored Zoe reference (byte-diff target)
- `scripts/ai-skills/build.ts` — the emitter implementation (`buildEveSandboxFile`, `buildWriteBackSection`, `loadEveAgentConfig`)
- `scripts/ai-skills/eve-emitter.test.ts` — the on-host correctness tests (byte-diffs for all three personas)
