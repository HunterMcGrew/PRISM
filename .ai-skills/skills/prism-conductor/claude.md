## Claude-platform dispatch surface

On Claude Code, Sol dispatches through the **Workflow tool** — a deterministic orchestration script whose variables hold the run-state, so it never competes for Sol's context window. This is the decisive advantage at lifecycle scale: budgets, routing, and failure containment live as control flow in the script, not as conversation in Sol's session.

**Tool routing.**

- `Read` / `Glob` / `Grep` — inspect plans, goal-state, step files, and the architect manifest.
- `Bash` — `git` context only (`rev-parse`, `branch`, `status`); the atomic state-write rename for `.prism/conductor-state.json`.
- `Write` — **only** `.prism/conductor-state.json` (Sol's run-control state) and `.prism/conductor-state.json.tmp` (the atomic-write staging file). Never `Edit` on source, never a ticket-tracker write, never a merge or ready-flip.
- **Workflow tool** — the dispatch engine (below).

**The autonomous segment.** Sol authors and invokes one Workflow script per autonomous segment:

- `pipeline(lanes, …)` runs each lane's phase chain. Per-lane independence gives failure containment for free — a lane that throws drops to `null` and skips its remaining stages while the others continue. A pipeline run is a one-lane fleet; one engine, not two.
- `agent()` calls carry: `agentType` (the compiled persona agent definition at `.claude/agents/<persona>.md`, emitted by the build — personas load their full persona at spawn, no dynamic skill invocation), `model` (the per-dispatch tier from the model-tiering table), `schema` (the report-back verdict shape), `isolation: 'worktree'` (one checkout per lane), and `budget` (the global dispatch cap).

**Gate-segmented, dynamically.** Sol does not talk to running workers — a worker does its job and returns a structured verdict plus a progress handoff. The script runs each lane forward through its phases autonomously, clearing `auto-cleared` gates in place without returning to Sol. It breaks back to Sol only when a lane returns `needs-human` / `blocked`, completes, or trips a budget. Sol — the conversational main loop — then surfaces those gates to the human, takes the input, and launches the next segment with `resumeFromRunId` to resume the stopped run. The segment boundary is dynamic ("run until a lane needs a human or finishes"), not fixed per phase.

**Dispatches are fresh spawns; there is no subagent continuation.** Each `agent()` call spawns a stateless agent — Sol cannot resume a previously-dispatched subagent with its context intact. No in-process continuation tool (a `SendMessage`-style "continue agent X") is exposed to Sol on Claude Code, and `mcp__ccd_session_mgmt__send_message` is the wrong reach: it delivers cross-session as a user turn and always prompts, so it's not a subagent-continuation path. `resumeFromRunId` resumes the *Workflow run's* control flow, re-spawning fresh agents — not the prior agent's transcript. So when work must carry forward, re-dispatch fresh and let the dispatched persona reconstruct state from the durable bus (the branch plan's `## Decisions` / `## History` and the goal-state pointers). This is the mechanism behind `shared.md` § How Sol thinks #4 — there is no transcript-passing because the platform exposes no path for it, which is exactly what keeps Sol's context tight enough to run the fleet.

**Greenfield decompose chain.** When the operator hands Sol a PRD + architecture path, the decompose step runs a **conducted segment** — a sequential Parker→Winston→Nora chain, one level deep, no nesting (NFR-4). Each step is dispatched as a normal `agent()` call; Sol writes goal-state on return for crash-safe resume (reusing the decision-box pattern in `lib/decision-box.md` § Crash safety), so a partial tree is preserved on resume and no completed chain step re-runs. After the chain, Sol runs the ratification gate (`lib/greenfield-decompose.md` § Ratification gate) before dispatching any leaf lanes. The chain's tree output is folded into the lane set by re-invoking the reconcile primitive (`lib/reconcile.md` § Tree-shaped delta), which preserves `parentId` pointers and assigns `generation: 0` to every planned lane.

**Between segments, Sol runs the reconcile step** (`step-09-reconcile.md`): dedup the registry, run the decision box per distinct target, apply the convergence governor, then either author the next segment's `pipeline()` over the recomputed lane set (via `resumeFromRunId`) or terminate to step-10 report. The `budget` parameter on each `agent()` call is the shared global dispatch budget — every dispatch counts against it, whether origin-lane phase, decision-box dispatch (Nora/Winston), or discovered-lane phase.

The per-dispatch `model` override is how the tiering table is enforced on Claude Code: Sol sets `model: 'opus'` for Winston and Eric dispatches and on a worker's escalation, `model: 'sonnet'` for the default worker dispatch. The config seam for other runtimes is described in `shared.md` § Model tiering.

(The generated `SKILL.md` concatenates `shared.md` + this file — keep this file to Claude-specific tool and dispatch detail, not a restatement of `shared.md`.)
