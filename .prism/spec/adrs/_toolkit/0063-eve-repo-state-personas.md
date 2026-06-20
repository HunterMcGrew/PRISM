---
Number: 0063
Title: Repo-State eve Personas — Sandbox-Bootstrap Checkout and HITL-Gated Write-Back
Status: accepted
Date: 2026-06-19
---

## Context

[ADR-0062](./0062-eve-substrate-port.md) ported the first autonomous PRISM persona — Lilac — onto Vercel eve and deferred two surfaces it did not need: FR-4 (how a persona operating on repo state gets a checkout inside its sandbox and writes back) and a general step-idempotency layer (Open Q2). Lilac never touched repo state — her inputs come from the GitHub API and her output is a Slack post — so both deferrals were correct. Wave 2 ports the first two personas that *do* touch repo state, which is where FR-4 and the idempotency question come due together.

The two wave-2 personas are not symmetric, and the asymmetry shapes the decision:

- **Zoe** (surface audit) reads the `.prism/` tree — plans, lessons, ADRs, architect docs — and writes back into it: an audit report under `.prism/audits/`, verdict annotations on plan files, and an operational state file at `.prism/audit-state.json`. She is a true read-and-write-back repo-state persona.
- **Sage** (changelog) reads git history (`git log <old-tag>..<new-tag>`) and writes a changelog *document*, which her existing contract ships through the normal commit/push/PR flow. Her read path is the same checkout Zoe needs; her write-back is a `git push` of one artifact.

Both need the same thing on the read side — a working checkout of the PRISM repo on a filesystem the agent can read. Resolving FR-4 turned on one source-verification question the ADR-0062 discovery spike left thin: **how does a repo get into an eve sandbox without the Vercel backend?** The spike noted that the GitHub *channel's* pre-call checkout requires the Vercel backend (`docs/channels/github.mdx`), and ADR-0062 Decision 3 cited that as a reason to defer code-review personas. That framing is correct for the *channel* but does not generalize: repo-state personas are schedule- and HTTP-driven, not GitHub-channel-driven, and eve's **sandbox** provides its own checkout path that the channel framing obscured.

The eve sandbox docs (`docs/sandbox.mdx`, verified claim-by-claim against eve 0.11.6 during this evaluation) resolve it cleanly:

- The sandbox is "the agent's isolated bash environment: a filesystem rooted at `/workspace` where it can run shell commands, execute scripts, and read or write files" (`sandbox.mdx`).
- It is configured by a generated file — `agent/sandbox/sandbox.ts` calling `defineSandbox({ backend, bootstrap, onSession })` (folder layout, required when seeding or hooking).
- The `bootstrap({ use })` hook "runs once when the template is built… Put reusable setup here that every later session inherits, **such as cloning a baseline repo**, installing dependencies, or seeding files" (`sandbox.mdx`), and the network policy guidance is "leave the factory open so `bootstrap` can `git clone`, then lock down in `onSession`" (`sandbox.mdx`).
- Local backends `docker()` and `microsandbox()` run off-Vercel with real binaries; `justbash()` runs locally but has "no real binaries" — so it cannot run `git` (`sandbox.mdx`).
- `/workspace` "survives between turns for the same session," and the Docker backend "persists `/workspace` across turns" (`sandbox.mdx`). The Sandbox filesystem and the Workflow `.workflow-data` world are distinct adapters (`docs/concepts/execution-model-and-durability.md`).

The default harness gives the agent a `bash` tool (runs in Sandbox) plus `read_file`/`write_file`/`glob`/`grep` (Sandbox FS) — so reading the cloned tree and running git needs no new tools (`docs/concepts/default-harness.md`).

This ADR records how a repo-state persona checks out, reads, writes, and commits inside its sandbox, and resolves Open Q2 (general idempotency) for the write-back case.

## Decision

Four decisions, each stating why.

### 1. Read path — clone in the sandbox, not via the GitHub channel

A repo-state persona gets its checkout from a generated `agent/sandbox/sandbox.ts` that clones the PRISM repo into `/workspace`. The clone is the agent's own `git` over the default `bash` tool inside the sandbox — **not** the GitHub channel's pre-call checkout.

**Why:** the channel checkout requires the Vercel backend (ADR-0062 Decision 3), which conflicts head-on with the no-Vercel-lock-in goal (PRD NFR-2). The sandbox bootstrap clone is the eve-designed seam for exactly this — the docs name "cloning a baseline repo" as the canonical bootstrap use — and it runs on the local `docker()`/`microsandbox()` backends with no Vercel dependency. This also corrects a latent misread of ADR-0062 Decision 3: *channel* checkout needs Vercel; *sandbox* checkout does not. A future eve architect reaching for a code-review persona should not conclude that repo access requires Vercel — it requires a sandbox with a real backend.

### 2. Freshness — baseline clone in `bootstrap`, refresh in `onSession`

The `bootstrap` hook clones the repo once at template build (the baseline that "every later session inherits"). The `onSession` hook runs `git fetch && git reset --hard origin/<default-branch>` so each session reads current state.

**Why:** `bootstrap` runs once and only template filesystem state carries forward (`sandbox.mdx`) — a clone baked solely into `bootstrap` would freeze the checkout at build time, so Sage would read stale tags and Zoe would audit a stale `.prism/` tree. Splitting baseline-in-bootstrap from refresh-in-onSession keeps the per-session checkout fresh while reusing the bootstrap baseline so the refresh is a fast `fetch`, not a cold full clone. The network-policy pattern the docs recommend — open factory for the bootstrap clone, locked down afterward — maps directly onto this split.

### 3. Backend — real binaries required; `justbash()` is invalid for repo-state personas

Repo-state personas must run on `docker()` or `microsandbox()`. `justbash()` is rejected for them and the emitter never defaults a repo-state persona to it.

**Why:** `justbash()` has "no real binaries" (`sandbox.mdx`) — it cannot run `git`, so the bootstrap clone fails at runtime, inside Docker, on the slow validation loop ADR-0062's sequencing decision exists to avoid. The constraint is encoded in the emitter (an `eve.yml` backend key restricted to the real backends for any persona declaring a checkout) and stated in the runbook so a consumer does not select `justbash` and discover the failure only at `eve start`.

### 4. Write-back — one HITL-gated push, resolving Open Q2 for the repo-state case

Both wave-2 personas write back to the repo through a single side-effect class: a `git commit && git push` of their artifact, gated behind eve's HITL approval (`needsApproval: always()`). Sage pushes her changelog document; Zoe pushes her audit report, plan verdict annotations, and state file. **The general idempotency layer (Open Q2) stays deferred** — the HITL gate is the mitigation, exactly as ADR-0062 Decision 6 set for Lilac's Slack post.

**Why:** eve re-runs a step interrupted mid-execution, so a `git push` caught mid-step by a crash can fire twice (`docs/concepts/execution-model-and-durability.md`). A push behind `always()` cannot fire from a re-run step without a fresh human decision (`docs/tools/human-in-the-loop.md`), which is the same narrow-risk mitigation ADR-0062 Decision 6 chose. The gate is not new friction: Sage's contract already ships through a human-owned PR (the team lead owns the release PR — Sage's PR is the artifact, not the release), and Zoe's contract already forbids silent edits ("No silent edits… everything else waits for go-ahead"). So the HITL gate expresses each persona's *existing* contract in eve's primitive. A general idempotency layer (dedup keys, check-before-act) earns its place only when a repo-state persona has a write-back that *shouldn't* require approval on every run — none in wave 2 does — so building it now would be speculative infrastructure against a beta runtime. The concrete trigger to revisit Q2: the first repo-state persona whose push should be unattended. One operational risk the Docker milestone must check (it is runtime-only, not CI-provable): a write-back that races a concurrent human commit to `.prism/` may need a `git pull --rebase` before push — if the milestone surfaces that, it is the Q2 trigger arriving early.

## Consequences

- **Positive:** FR-4 resolves with zero new abstractions. The read path is eve-native sandbox machinery (clone in a generated `sandbox.ts`); the write path reuses the ADR-0062 HITL gate. The emitter extension is additive `eve.yml` keys plus one generated file, isolated in `build.ts` like every other emitter concern.
- **Positive:** The read path runs entirely off-Vercel on local backends, holding the no-Vercel-lock-in goal (NFR-2) for repo-state personas — the surface ADR-0062 most worried it would have to bend.
- **Positive:** Sage and Zoe's write-backs collapse to one gated side-effect class, so the idempotency story is one rule, not two, and Q2 stays deferred with a named trigger rather than an open hand-wave.
- **Negative:** The full FR-4 flow (clone → fetch → read → write → commit → push) is exercised only in the Docker milestone — host CI proves the emitter *generates* a correct `sandbox.ts`, not that the clone, git auth, and network policy work at runtime. This widens the ADR-0062 Node-floor gap: the runtime-only unknowns are clone auth, network policy, git availability, and concurrent-push races. The mitigation is the explicit `[Docker / manual]` AC and the runbook callout.
- **Negative:** Zoe's weekly audit cannot run fully unattended in wave 2 — the HITL push gate requires a human approval each run. This is accepted because her contract already requires confirmation before archive actions; it becomes a real limitation only if an unattended-audit use case emerges, which is the Q2 trigger.
- **Neutral:** The generated `sandbox/sandbox.ts` is a new file kind in the eve output tree, drift-guarded by the same per-persona `.ai-skill-generated` marker and the byte-diff that covers the other generated files. Lilac, declaring no sandbox in her `eve.yml`, emits no sandbox directory — her byte-diff is unaffected, which is the regression guard for the emitter extension.

## References

- [ADR-0062](./0062-eve-substrate-port.md) — the eve substrate port; this ADR resolves its two deferred surfaces (FR-4, Open Q2) for the repo-state case.
- `.prism/plans/epic-eve-substrate.md` — the implementation plan; the wave-2 increment carries the units, decisions, and AC for the Sage/Zoe port.
- eve docs (verified during this evaluation): `docs/sandbox.mdx` (sandbox slot, `defineSandbox`, `bootstrap`/`onSession` hooks, `git clone` bootstrap, backend table, `/workspace` persistence), `docs/concepts/default-harness.md` (the `bash`/`read_file`/`write_file`/`glob`/`grep` tools and where they run), `docs/concepts/execution-model-and-durability.md` (step re-run, Sandbox vs Workflow-world separation), `docs/tools/human-in-the-loop.md` (the `always()` gate as the step-replay safeguard), `docs/channels/github.mdx` (the channel checkout that requires the Vercel backend — the surface this ADR routes around).
- [ADR-0044](./0044-direct-write-tool-outputs.md) — per-tool output ownership; the generated `sandbox/` file follows the same committed-output convention as the rest of the eve tree.
