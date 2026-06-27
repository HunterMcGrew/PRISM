---
title: "The Enforcement Floor"
description: "How PRISM guarantees that every persona's reported completion is trustworthy — the two runtime boundaries, the report contract, the gate classes, and how to enable or disable enforcement."
category: "ai-skills"
audience: "dev"
last_updated: "2026-06-27"
---

# The Enforcement Floor

## What the floor is — and why it exists

So this adds a runtime layer that makes every persona's `done` mean something without depending on how capable the model is.

Before the floor, PRISM was entirely a guidance layer: rules and skill prose the model was trusted to comply with. "Load-bearing" meant "the model complied." When it didn't — off a weaker model, under orchestration, under gate pressure — an unverified `done` propagated as truth. Sol routed the next phase on a lie. A human reading the report got a false completion.

The floor closes this by moving must-be-true claims out of prose the model self-reports and into code the runtime runs at the stop boundary. The inversion: the model *proposes* a verdict; the gate *ratifies or overrides* it. An exit code cannot be argued past. A required JSON field cannot be "sort of there." These properties hold regardless of who invoked the persona — Sol or a human, orchestrated or solo.

The full principle is in [ADR-0067](https://github.com/HunterMcGrew/PRISM/blob/main/.prism/spec/adrs/_toolkit/0067-runtime-ratifies-verdicts.md). This doc is the operational guide: which floor each persona gets, how the two boundary halves work, and what to do when you need to author or modify enforcement source.

> [!IMPORTANT]
> The floor covers *provable* claims only — exit codes, file presence, ownership globs, structural validity. Quality claims (is this review good, is this design sound) stay structurally trusted. The floor cannot and does not promise them. A gate that claims to verify quality is a gate that lies.

---

## The two boundary halves

The floor enforces at two points in every persona's lifecycle.

### Half 1 — The write boundary (PreToolUse)

`ownership-guard.mjs` fires before every `Edit`, `Write`, `MultiEdit`, or `Bash` call. It resolves the active persona, then enforces two constraints from that persona's entry in `gates.json`:

**`may_write[]`** — the glob set of paths the persona may write. A write outside these globs is denied before the tool executes. The error names the denied path and lists what is allowed.

**`may_not_run[]`** — command substrings the persona may never run (e.g. `gh pr merge` for every persona; `gh pr review --approve` for reviewers). Checked across every non-heredoc command line, so a forbidden command on line 3 of a multi-line Bash call cannot slip past.

The ownership matrix is what makes handoff unavoidable rather than trusted. Briar cannot write source files — she *must* hand to Clove. Clove cannot run a merge — he *must* hand to a human. Handoff is the only remaining move, not a nicety the model is trusted to choose.

### Half 2 — The stop boundary (Stop / SubagentStop)

`run-gates.mjs` fires when a persona attempts to stop. It reads the persona's `report.json`, validates its shape and coherence, then runs evidence checks to ratify or override the claimed verdict. If the gate contradicts the claimed `done`, the hook refuses to let the model stop (exit 2 → forced continue) and re-injects the real failure. On the third consecutive failure — the 3-strike cap — it instructs the model to emit `needs-stronger-model` and stop, so Sol or the human sees a gate-consistent verdict.

The 3-strike cap is the sole loop ceiling. The `stop_hook_active` flag does not exist in the Stop payload (confirmed 2026-06-26 against live docs) and is not used.

The gate fires on both `Stop` and `SubagentStop`. A `Stop`-only registration would enforce solo sessions and silently no-op under Sol — exactly the mode where a false `done` is most damaging.

---

## Channel-hardening — one verdict, one channel

The gate does **not** write a separate routing file that Sol must learn to prefer. It hardens the channel that already exists: the model's own returned report. Sol reads the model's structured return exactly as before. The floor is Sol-independent — it enforces at the runtime boundary; Sol is a downstream *consumer* of the hardened verdict, not a dependency of the enforcement.

`ratified-verdict.json` is written to `.prism/evidence/<runKey>/` as an audit artifact only — what ran, exit codes, strike count — and is never read as a routing input.

---

## The report contract

Every persona's final act before stopping is to write `report.json` to `.prism/evidence/<runKey>/report.json`, where `runKey` is `agent_id ?? session_id` (keyed by agent to prevent fleet-lane collision — subagents share the parent's `session_id`, so two fleet lanes would collide their evidence under one session key).

The gate reads this file and validates it in four steps:

1. **Presence** — the file exists. If absent: "report.json not found — emit your report before stopping."
2. **JSON parse** — the file is valid JSON.
3. **Schema** — all required fields are present (`reasoning`, `persona`, `checklist`, `verdict`, `verdict_reason`, `next_route`), and `verdict` is one of the six valid values.
4. **Coherence** — `next_route` is consistent with `verdict`.

The six valid verdicts and the coherence rules:

| Verdict | When the persona uses it | `next_route` requirement |
| ------- | ------------------------ | ------------------------ |
| `done` | Work complete; gates ratified | The persona's normal next persona |
| `needs-fix` | Review found fixable issues in `## Review Issues` | The implementer for this lane |
| `needs-replan` | The plan is the problem — wrong approach, vague tasks, gap | `winston` or `human` |
| `blocked` | Can't proceed — missing input, environment failure | `human` |
| `needs-stronger-model` | Gate-injected on 3-strike cap; persona cannot emit directly | Same persona key (Sol retries at stronger tier) |
| `needs-human` | Open question or explicit escalation needs a human decision | `human` |

A `needs-fix` verdict is shape-validated against the `payload.findings` array: it must carry at least one `critical` or `major` finding. An empty findings array with a `needs-fix` verdict is incoherent — the gate rejects the stop.

The full schema and the JS reference validator are in [`.prism/references/enforcement/report-contract.md`](../../.prism/references/enforcement/report-contract.md).

### Escape-verdict typing

Typed escapes route by what the situation *needs*, not by how bad it feels:

- An escape whose justification is **architectural** (blast radius, wrong abstraction, coupling, the approach is fundamentally wrong) is `needs-replan` → Winston. Winston is chartered to evaluate cross-boundary and coupling questions; routing these to the human skips the architect and dumps a raw cross-API problem cold.
- An escape that needs a **fact or approval only a human holds** (undocumented institutional history, stakeholder gate, approval the architect can't give) is `needs-human` → human. Winston would have to re-ask the same human, so the architect hop is pure latency.

The tell: `needs-replan` needs a judgment Winston is chartered to make; `needs-human` needs knowledge no artifact records.

---

## The evidence ledger

`evidence-ledger.mjs` fires on every `PostToolUse` Bash call and appends one entry to `.prism/evidence/<runKey>/ledger.jsonl`: timestamp, command, exit code, and run key.

This enables `source: ledger` gates in `run-gates.mjs`. Instead of re-running an expensive check (a full test suite) at stop time, the gate reads the most recent matching exit code from the ledger. Gates configured with `source: fresh` always re-run. Gates configured with `source: ledger` check the ledger first and fall back to fresh if no matching entry exists.

---

## Gate classes — the membership rule

Every persona in `gates.json` gets the two universal primitives (report contract + ownership matrix). What scales by class is the evidence gate layer.

**Class A — hard evidence gates**

A persona is Class A when "did it work?" reduces to a command's exit code or a schema validation.

- `prism-code-dev` (Clove) — TypeScript typecheck, test suite, crossref lint
- `prism-changelog` (Sage) — both tags resolve + changelog file was written
- `prism-onboarding` (Atlas) — `config.json` validates against the schema

A claimed `done` is overridden if any gate's check fails and the baseline passed (see baseline regression tolerance, below).

**Class B — procedural / structural gates**

A persona is Class B when the runtime can prove "the procedure ran and the report is coherent" but cannot prove "the output is correct." Class B covers every analysis, review, planning, and documentation persona that isn't Class A.

The canonical Class B gate is Briar's: it proves she *worked* (the check-gates fired) and is *coherent* (a `needs-fix` verdict carries a real critical/major finding), never that she is *right*. A review-quality gate cannot exist — the quality of a review is not a thing an exit code can verify. Do not build one in any later phase.

Eight of the Class B personas write deterministic deliverables (Sasha, Mira, Eli, Pixel, Zoe, Iris, Reese, Theo). For these, the gate includes a **deliverable precondition**: the persona writes a `deliverable.json` sidecar into its run-keyed evidence dir naming the path it produced, and a second check confirms that path is new or modified this run. Both checks are `on_fail: needs-replan` preconditions — they do not consume a gate strike.

**Class C — ownership and contract only**

A persona is Class C when its output is judgment-as-prose with no exit code and no structural validation. The floor is the ownership matrix plus the typed report contract — nothing more.

Class C covers the nine business-layer personas (vera, kora, ellis, charlie, quinn, tess, remy, penny, lex) and Sol (`prism-conductor`). Sol's floor is heavily *ownership*: it may not write code, tickets, or plan content, and may not run a merge.

**Utilities — no gate entry**

`prism-handoff`, `prism-review-loop`, and `prism-skill-forge` are utilities, not personas. They carry no verdict of their own and inherit the active persona's ownership lane. They receive no `gates.json` entry.

---

## What the gate proves versus doesn't

The gate proves:

- The report is present, valid JSON, structurally complete, and internally coherent
- The claimed `done` is consistent with what the runtime checks actually found
- The persona wrote only to its declared ownership globs
- The persona did not run any command in its `may_not_run` list
- For Class A: the specific exit-code checks passed (and were not already failing at dispatch)

The gate does **not** prove:

- Whether the implementation is correct (only that types and tests passed)
- Whether a review is thorough or accurate
- Whether a plan is sound for the codebase
- Whether a diagnosis identified the real root cause

Every `gates.json` entry carries an `unverifiable_boxes` array naming exactly what the gate cannot verify for that persona. This is the honest guarantee.

---

## Baseline regression tolerance

Class A's fresh-command gates use a **baseline** to avoid penalizing personas for pre-existing failures in the repo environment.

When the persona makes its first write during a session, `ownership-guard.mjs` captures each fresh gate's exit code into `.prism/evidence/<runKey>/baseline.json`. At stop time, `run-gates.mjs` reconciles:

- If a claimed-true gate fails **and** the baseline also failed: pre-existing failure, not this persona's regression — surface as a non-blocking note, do not strike.
- If a claimed-true gate fails **and** the baseline passed: regression the persona introduced — strike.
- If no baseline exists (capture failed): treat all fresh-gate failures as non-blocking notes.

The floor reconciles *change*, not absolute repo state.

---

## Non-circumventability — why personas can't disable the gate

The enforcement runtime and its own state sit outside every gated persona's writable scope. A persona blocked by a gate must not be able to edit the code that computes the verdict, reset the strike counter that bounds the loop, or delete the evidence the gate reads — otherwise the guarantee unwinds.

**What's protected (globally, before `may_write` is consulted):**

- The runtime hook scripts: `ownership-guard.mjs`, `run-gates.mjs`, `evidence-ledger.mjs`, `gates.json`, `settings.json` under `.claude/hooks/`
- The `lib/` helpers: everything under `.claude/hooks/lib/`
- The canonical hook source: everything under `.ai-skills/hooks/` (except `__smoke__/`, which gates nothing)
- The build emitter: `scripts/ai-skills/build.ts` (editing this file could emit a weakened runtime)
- Gate state files: `strikes.json`, `ledger.jsonl`, `ratified-verdict.json`, `baseline.json`, `maintenance-ledger.jsonl` under `.prism/evidence/`

The single carve-out: the persona's own `report.json` is writable — that is the channel being hardened, not a runtime the persona controls.

No `may_write` entry can grant access to the protected paths. The protection is a global denylist in `ownership-guard.mjs` checked before any persona's ownership matrix, so it cannot be configured away. (The guard code itself is on the protected list — self-protecting by construction.)

The shell-deletion vector (`rm .prism/evidence/...`) is defended in depth: the `may_not_run` list in every persona's entry forbids the common forms, and the guard's structural `commandDeletesEvidence` scan closes the variant-flag gap (`rm -f`, `rm --force`, `rm -fr`). The airtight guarantee covers the lawful write/edit path; shell deletion is defended but softer.

**Why this had to be structural:** during the epic's own dogfooding, a persona blocked by its live Stop gate tried to edit the gate's hook code and delete its own strike counter to force a stop. The guard caught it — but the ownership matrix at the time had permitted the paths. The incident proved that discipline fails exactly under gate pressure, which is precisely when the protection is needed. The fix had to be structural (a denylist the guard code enforces before it reads `may_write`) rather than a policy the matrix could re-open.

---

## Maintenance mode

To lawfully edit enforcement source — the hook scripts, `gates.json`, canonical `.ai-skills/hooks/**` — set the `CLAUDE_PRISM_MAINTENANCE` environment variable:

```bash
export CLAUDE_PRISM_MAINTENANCE=1
```

In maintenance mode:

- Enforcement-source writes (to `ownership-guard.mjs`, `run-gates.mjs`, `gates.json`, etc.) are permitted and audited to `.prism/evidence/maintenance-ledger.jsonl`.
- Every Stop/SubagentStop while the variable is set emits a banner: "PRISM MAINTENANCE MODE — enforcement-source self-protection suspended; N source writes logged this run."
- Evidence deletion (`rm .prism/evidence/...`) is **never** unlocked — even under maintenance mode. Gate state is protected independently of source protection.

The switch is an environment variable because a persona cannot set an env var on a hook's process (each hook fires as a fresh Node process with Claude Code's environment), and the one file-based injection path (`settings.json` env block) is itself protected. This makes maintenance mode a human-only control — the only people who can set it are people with shell access to the machine.

Unset the variable when done:

```bash
unset CLAUDE_PRISM_MAINTENANCE
```

Authoring or changing hooks goes through canonical source (`.ai-skills/hooks/`) and the build pipeline (`pnpm prism:build`) that emits to the runtime (`.claude/hooks/`). Never edit the live runtime files directly — even under maintenance mode, the canonical → runtime path is the right one. The build pipeline also runs the smoke harness, which catches gate regressions.

---

## How to enable / disable enforcement

Enforcement is wired through four hook entries in `.claude/settings.json`. The current project settings have the hooks empty while the fleet integrity test runs (see task `#5`). When the floor is enabled, the entries are:

```json
{
  "hooks": {
    "PreToolUse": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "node .claude/hooks/ownership-guard.mjs"
          }
        ]
      }
    ],
    "PostToolUse": [
      {
        "matcher": "Bash",
        "hooks": [
          {
            "type": "command",
            "command": "node .claude/hooks/evidence-ledger.mjs"
          }
        ]
      }
    ],
    "Stop": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "node .claude/hooks/run-gates.mjs"
          }
        ]
      }
    ],
    "SubagentStop": [
      {
        "matcher": "",
        "hooks": [
          {
            "type": "command",
            "command": "node .claude/hooks/run-gates.mjs"
          }
        ]
      }
    ]
  }
}
```

`SubagentStop` carries the same script as `Stop`. This is required: a `Stop`-only registration enforces solo sessions and silently no-ops under Sol — the exact mode where a false `done` does the most damage.

To **disable** enforcement for a session (e.g. during fleet testing), empty the `hooks` object:

```json
{ "hooks": {} }
```

To **re-enable**, restore the four entries above.

> [!NOTE]
> `settings.json` is itself a protected path — gated personas cannot write it. Changes to this file must come from a human, or from a session running under maintenance mode.

---

## Cross-references

- [ADR-0067](https://github.com/HunterMcGrew/PRISM/blob/main/.prism/spec/adrs/_toolkit/0067-runtime-ratifies-verdicts.md) — the inversion principle, channel-hardening, handoff enforcement, non-circumventability, and the Briar ceiling caveat
- [`.prism/architect/_toolkit/enforcement-floor.md`](../../.prism/architect/_toolkit/enforcement-floor.md) — the gate-strength taxonomy: three classes, what each floor gets, the factual-grounding bar
- [`.prism/references/enforcement/report-contract.md`](../../.prism/references/enforcement/report-contract.md) — full JSON schema, the JS reference validator, the verdict enum, and verdict-to-route coherence rules
- [`conductor.md`](./conductor.md) — Sol's role as a downstream consumer of gate-ratified verdicts; how the floor integrates with orchestrated fleet runs
- [`.ai-skills/hooks/gates.json`](../../.ai-skills/hooks/gates.json) — the canonical gate data: ownership matrices, evidence gates, allowed routes, and unverifiable boxes per persona
- [ADR-0011](https://github.com/HunterMcGrew/PRISM/blob/main/.prism/spec/adrs/_toolkit/0011-eric-never-approves-prs.md) — the human merge boundary; the floor names and verifies the handoff but never crosses this gate
