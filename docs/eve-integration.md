---
title: "Using PRISM with Vercel eve"
description: "How to generate, configure, and run PRISM's autonomous personas on Vercel eve."
category: "eve-integration"
audience: "developer-user"
last_updated: "2026-06-19"
---

# Using PRISM with Vercel eve

Vercel eve is an agent runtime that lets a persona fire on a schedule, respond to a Slack message, or run on a webhook — without anyone typing a trigger. PRISM uses eve as a **compile/deploy target**: you author everything in `.prism/` and `.ai-skills/` as usual, run `pnpm prism:build`, and the build emits a ready-to-run eve agent directory for each autonomous persona alongside the Claude, Codex, and Cursor outputs.

## What this is and isn't

Eve covers the **autonomous slice** — personas whose value is being always-on. That means:

- **Lilac** — composes the team standup from recent PR activity and posts to Slack on a weekday schedule, after a preview-and-confirm step.
- **Sage** — generates the release changelog when a new tag exists, writes it into the repo, and surfaces a write-back approval gate before pushing.
- **Zoe** — audits the `.prism/` surface weekly (plans, lessons, ADRs, architect docs), issues per-Decision verdicts, and writes the audit report back behind an approval gate.

The interactive build-loop personas — Winston, Clove, Briar, Eric, and anyone whose value is a human in the IDE steering in real time — are **not** ported to eve. That channel-driven model doesn't fit a live editing session. Eric via GitHub webhook is a documented future candidate; the Vercel backend he needs isn't in the current scope.

## How the build generates eve output

`pnpm prism:build` emits a `.eve/agents/<persona>/` directory for every persona in the autonomous set. These directories are **committed** to the repo — consumers receive them via `git pull` with no extra install step, the same as `.cursor/skills/`.

The canonical source for each persona is its skill dir (`.ai-skills/skills/<id>/`) plus an `eve.yml` sibling that carries the eve-specific config. The emitter reads both and writes the agent directory. You never edit the generated files directly; edit the canonical source and rebuild. `pnpm prism:check` detects drift and fails if the generated files no longer match their source.

### What's in each generated agent directory

Every autonomous persona gets:

| File | What it is |
|------|------------|
| `instructions.md` | The always-on identity frame: the persona's personality and voice, sourced from the sections listed in `eve.yml`'s `instructionsSections` key. No procedural workflow lives here. |
| `skills/<id>/SKILL.md` | The on-demand workflow skill, sourced from the sections in `eve.yml`'s `skillSections` key. The `description` frontmatter field is eve's routing key — it maps from the persona's existing trigger description. |
| `agent.ts` | Direct-to-Anthropic model config (`anthropic("...")`), sourced from `eve.yml`'s `model` key. Reads `ANTHROPIC_API_KEY` with no Vercel AI Gateway required. |
| `schedules/<name>.md` | The cron schedule: frontmatter `cron` plus the body prompt, sourced from `eve.yml`'s `scheduleCron`, `scheduleName`, and `scheduleBody` keys. |
| `channels/slack.ts` | Slack channel config using `connectSlackCredentials`, sourced from `eve.yml`'s `slackConnectUid`. Omitted for repo-state personas, which have no Slack surface. |
| `channels/eve.ts` | HTTP channel with `localDev()` + `placeholderAuth()`. Correct for local validation; swap the auth helper before any non-local deploy. |

Repo-state personas (Sage and Zoe) also emit:

| File | What it is |
|------|------------|
| `sandbox/sandbox.ts` | Generated `defineSandbox` config that clones the PRISM repo into `/workspace` during `bootstrap` and runs `git fetch && git reset --hard origin/main` each session via `onSession`, so each run reads current state. |

### The local-first runtime story

PRISM's eve integration is designed to run **entirely off Vercel**. The runtime stack for local validation:

- On-disk Workflow world (state persists to `.workflow-data` in the working directory)
- Direct-to-Anthropic via `@ai-sdk/anthropic` + `ANTHROPIC_API_KEY`
- `eve build && eve start` inside a Docker `node:24` container (eve requires Node 24; the PRISM build host runs Node 22 — see the Node-floor split below)

No Vercel account or Vercel service is required to run the autonomous personas locally. The `channels/eve.ts` file uses `localDev()` so the HTTP channel passes on loopback and fails closed on any non-local request.

## Running the personas on eve

> [!IMPORTANT]
> Eve requires Node 24. The PRISM build (`pnpm prism:build`, `pnpm prism:check`, `pnpm prism:test`) runs on Node 22 and stays green there. Running a generated agent requires a Docker container.

The full Docker validation runbook — start the container, install eve dependencies, run `eve build`, run `eve start`, trigger the schedule via `curl`, and confirm the approval gate fires — lives in `.prism/architect/_toolkit/eve-runtime.md`. That doc is the authoritative operational reference; what follows here is a summary of the shape.

**Quick start (Lilac):**

```bash
# Mount the repo into a Node 24 container
docker run -it --rm \
  -v "$(pwd):/workspace" \
  -w /workspace \
  -p 3000:3000 \
  -e ANTHROPIC_API_KEY="$ANTHROPIC_API_KEY" \
  node:24 bash

# Inside the container:
cd .eve && npm install
npx eve build
npx eve start

# From your host machine (separate terminal), trigger the standup:
curl -X POST http://localhost:3000/eve/v1/dev/schedules/standup
```

The trigger route (`/eve/v1/dev/schedules/<name>`) is dev-server-only — available when running `eve start` locally, not in production. The schedule name is the `scheduleName` key from the persona's `eve.yml` (e.g. `standup`, `changelog`, `audit`).

For Sage and Zoe, the runbook also covers the sandbox checkout flow (the `bootstrap` clone and `onSession` refresh that land a live repo copy in `/workspace`) and how to confirm the write-back approval gate fires before any `git push` executes.

## The HITL write-back gate

Sage and Zoe write back to the repo — Sage pushes a changelog document; Zoe pushes audit reports, plan verdict annotations, and a state file. Both write-backs are gated behind eve's `needsApproval: always()` primitive: the agent surfaces the staged diff and the push does not fire without explicit human approval.

This gate is each persona's existing contract expressed in eve's primitive. Sage already ships through a human-owned release PR; Zoe already forbids silent edits. The gate is not new friction — it is the same preview-and-confirm step each persona already requires, now enforced at the eve step level so a mid-step process crash cannot fire the push twice without a fresh human decision.

## What's proven and what isn't

The emitter (`build.ts`) is CI-green on host Node 22. `pnpm prism:test` runs byte-diff tests against hand-authored reference fixtures for all three personas, and `pnpm prism:check` guards against drift. This is the emitter correctness proof.

**Actually running a persona on eve is a manual Docker milestone**, not a CI gate. The Node-floor split (build host is Node 22, eve runtime needs Node 24) is why. The full end-to-end flow — sandbox clone, git fetch, read, write, commit, push, approval gate — is exercised only inside the Docker container. Four things the emitter tests cannot prove, and the Docker milestone must verify:

1. Git auth in the sandbox (the bootstrap clone needs credentials)
2. Network policy (the Docker backend supports `allow-all` and `deny-all`; domain-level allow-lists need a different backend)
3. Git availability in the eve container image
4. Concurrent-push races (a human commit to `.prism/` between `onSession` and `git push` may require a `git pull --rebase`)

These are documented open items, not silent gaps. See [ADR-0063](../.prism/spec/adrs/_toolkit/0063-eve-repo-state-personas.md) § Consequences for the full list.

## Current limitations and deferred work

| Surface | Status |
|---------|--------|
| Eric via GitHub webhook | Deferred — requires the Vercel backend for the GitHub channel checkout. Documented candidate for a future wave. |
| Inline `.prism/references/` links in generated skills | Known follow-up — relative links in skill bodies that resolve in the consumer's installed tree are not fully resolved in the generated eve output. |
| Sage's changelog trigger | Sage's current schedule is a weekly cron (`0 10 * * 1`). A release-tag webhook trigger is the natural fit but is deferred as a future improvement. |
| Production auth | `channels/eve.ts` ships `localDev()` + `placeholderAuth()`, which is correct for local validation. Production deploys need a real auth helper (`httpBasic()`, `jwtHmac()`, `jwtEcdsa()`, or `oidc()`). |
| Unattended write-back | Wave 2 write-backs require human approval on every run. Fully unattended execution (without `needsApproval: always()`) requires a general idempotency layer that is deferred until a persona needs it. |

## Adding a persona to the autonomous slice

Any persona can join the eve autonomous slice by adding two things:

**1. An `eve.yml` file** — author it as a sibling to the persona's `SKILL.md` (e.g. `.ai-skills/skills/prism-<id>/eve.yml`). The keys:

```yaml
# Required for all personas
model: claude-sonnet-4.6         # Model ID for agent.ts
scheduleName: <name>             # Schedule file name and dev-trigger slug
scheduleCron: "0 13 * * 1-5"    # Cron expression (UTC)
scheduleBody: >                  # Prompt sent when the schedule fires
  <what the persona should do>
instructionsSections: [...]      # Section names from skill dir files (conventionally shared.md) → instructions.md
skillSections: [...]             # Section names from skill dir files (conventionally shared.md) → the skill

# Optional — omit for non-Slack personas
slackConnectUid: slack/<name>    # Vercel Connect credential UID for Slack

# Required for repo-state personas (Sage, Zoe pattern)
sandbox: true
sandboxBackend: docker           # "docker" or "microsandbox" — never "justbash"
repoCheckout: true
writeBackGate: always
writeBackPaths: [<paths to push>]
```

The emitter throws at build time if `sandbox: true` is declared with no real backend, or if required keys are missing — so the constraint surfaces on host CI, not in the Docker milestone.

**2. An entry in `EVE_AUTONOMOUS_PERSONAS`** — add the persona's ID (e.g. `prism-<id>`) to the `EVE_AUTONOMOUS_PERSONAS` constant in `scripts/ai-skills/build.ts`.

Then run `pnpm prism:build`. The emitter generates the agent directory; `pnpm prism:check` confirms it's in sync. Verify the output with `pnpm prism:test` (byte-diff tests run against the reference fixtures in `scripts/ai-skills/__fixtures__/`).

## Going deeper

- **Full Docker runbooks** (prerequisites, step-by-step commands, what to confirm for each persona) — `.prism/architect/_toolkit/eve-runtime.md`
- **Slice 1 architecture decisions** (agent topology, model routing, scope, idempotency, Node-floor split) — [ADR-0062](../.prism/spec/adrs/_toolkit/0062-eve-substrate-port.md)
- **Repo-state decisions** (sandbox checkout, write-back gate, backend constraint) — [ADR-0063](../.prism/spec/adrs/_toolkit/0063-eve-repo-state-personas.md)
- **Install layout and committed-vs-ignored split** — `.prism/architect/_toolkit/install-layout.md` § Eve agent output
- **Generated agent directories** — `.eve/agents/prism-standup-summary/`, `.eve/agents/prism-changelog/`, `.eve/agents/prism-surface-audit/`
- **Canonical eve config** — `.ai-skills/skills/prism-standup-summary/eve.yml`, `.ai-skills/skills/prism-changelog/eve.yml`, `.ai-skills/skills/prism-surface-audit/eve.yml`
