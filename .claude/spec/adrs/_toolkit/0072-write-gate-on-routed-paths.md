---
Number: 0072
Title: A Write to a Routed Path Is Denied Until the Route's Docs Are Read
Status: accepted
Date: 2026-08-19
---

## Context

[ADR-0071](./0071-architect-context-read-hook.md) shipped a `PostToolUse` hook that names each unread architect doc when a session reads a routed path. It announces; nothing makes reading the named doc a precondition of anything. It chose that shape deliberately, weighing a `PreToolUse` gate on `Edit` as design 2 and rejecting it as friction.

Operator testing measured what the announcement is worth on its own: habituation at roughly six nags, after which the emission reads as boilerplate and stops changing behavior. Forced reading did change behavior. A subagent probe on 2026-08-19 caught the sharpest version of it — the child received the nag verbatim, read no architect doc, and changed nothing. That was the datum nobody was probing for, and it is the clearest evidence that the announcement is a courtesy and the enforcement has to sit somewhere else.

A gate is also the thing this project has already reverted once, so the shape matters more than the intent. [ADR-0067](./0067-runtime-ratifies-verdicts.md)'s floor sat on the `Stop`/`SubagentStop` report-back channel: a blocked persona spent its final turns fighting its own gate, and one dogfooding agent tried to edit the gate's code to force a stop. [ADR-0069](./0069-deterministic-verification-is-a-pipeline-stage.md) rejects hooks on that channel permanently, and scopes the rejection explicitly — "no gate, of any shape, sits on the turn where a persona reports back to Sol." `.prism/plans/epic-floor-revert.md § Decisions` left the adjacent door open in the same breath as "No hooks survive": *"If a lightweight `ownership-guard`-only safety is wanted later (write-lane protection without verdict ratification), that is a separate, smaller opt-in — not this revert."*

This gate sits on a mid-work `Write`/`Edit` call, is cleared by reading a document, and never touches the report-back turn. It supersedes ADR-0071's choice of nag over deny, on the operator's measurement rather than on a fresh argument.

Two things had to exist before a deny was satisfiable at all, and both are why this lands as the last PR in its stack rather than the first. The credit channel had to observe the reads that clear the gate — a `cat` earned no credit before, and this repo's own output style reads files with `cat`. And the documents the remedy names had to be short enough to read, which is why five writing guides were split out of a 404-line roster doc first.

## Decision

A write to a path matching any `.prism/architect/manifest.json` route is denied until every doc that route names has been read. The deny fires only when all of the following hold:

1. Neither `PRISM_HOOK_DISABLE=1` nor `PRISM_HOOK_DENY_DISABLE=1` is set.
2. The payload carries a scope id (`agent_id ?? session_id`). No id never denies.
3. The tool's kind resolves to `write` **from a name the harness's `toolKinds` table explicitly lists**, never from the unlisted-name fallback. The fallback is correct for announce, where an unclassified tool over-nags, and wrong for deny, where the next read-shaped tool a vendor ships would be classified `write` and blocked with the remedy unperformable through the tool doing the blocking.
4. At least one manifest route matches the path.
5. At least one doc that route names is absent from the scope's `read` array and still exists on disk.

**Deny scope is universal — every matching route denies.** There is no flag, no prefix constant, and no code-versus-authoring split. A route existing is the opt-in, and an unrouted path is never denied on any verb. Catch-all patterns are rejected at manifest-validation time by a computed test rather than a blacklist, so no route can match every path.

**The message names the literal remedy command**, one line per unread doc:

> You're editing `<path>`. Read its governing docs in full first, then retry:
> `cat <doc>`

An inferred remedy is what makes a gate unsatisfiable. Credit lands only on a read with no range restriction — a rangeless `Read` or a flagless `cat` — so a message naming a doc without naming how to read it in full describes a condition the model cannot reliably meet.

**A deny writes no state.** It never appends to `read` and never appends to `announced`, because a denied write has to be able to produce the same message again after the model's remedy fails.

**A shell write reroutes rather than gating.** When a `Bash` command writes to a routed path through `>`, `>>`, `tee`, `tee -a`, or `sed -i`, the model is told to redo the edit with its file-edit tool. That remedy judges no prerequisites at all, which is what makes it impossible to render unsatisfiable: deny what you can parse, and where you cannot, reroute to a surface that can check. The write detector cannot reuse the read channel's allow-list — `>` sits outside that class by construction — so it runs on the raw command and admits those five forms as its only metacharacters, sharing the read parser's tokenizing helpers and nothing else.

Registration is `PreToolUse` matched `Write|Edit|Bash`, in `.claude/settings.json` and in the install seed's copy of it.

## Consequences

- **Positive:** the governing doc becomes a precondition of the edit rather than a suggestion attached to it. On instruction-layer files — rules, ADRs, skill bodies — an edit made without the governing doc does not merely produce worse code, it produces wrong spec that later readers execute. That is the failure this closes.

- **The gate reaches Claude Code consumers only.** Cursor and Codex both support `PreToolUse`, so this is not a platform limit — it is a delivery gap. `refreshHookRuntime` writes `<consumer>/.claude/hooks/` and `<consumer>/.claude/settings.json` and nothing else, and no PR in this stack builds the other two seams. Each needs its own registration format, its own idempotent merge semantics, and its own end-to-end run against that host before it can be trusted. Until then, `HARNESSES.cursor.emitDeny` and `HARNESSES.codex.emitDeny` return `null` — the gate's reach is a property of the code, not a caveat in a document.

- **The gate is friction, not a wall.** Deleting the registration from `.claude/settings.json`, deleting `.claude/hooks/hook.mjs`, or setting `PRISM_HOOK_DENY_DISABLE=1` each disables it. All three are trivial, and none is prevented. Routing the hook's own surface was considered and rejected: in a consumer repo `.claude/settings.json` is the consumer's own file, and gating it means blocking a user's first edit to their own editor configuration — a gate that blocks edits to the consumer's settings to protect itself is a wall consumers remove wholesale. The compensating control is visibility rather than prevention: `prism doctor`'s hook-registration check turns a removed or unregistered hook into a reported finding instead of a silent absence.

- **Credit is decided from the shape of the call, never from the delivered bytes.** A flagless `cat` of a document the host truncates, or a rangeless `Read` past the host's default line cap, credits in full — the hook sees the invocation, not the output. The pre-filter narrows this from the other side: credit is refused for any command carrying a character outside a positive class (letters, digits, `_ . / - @ + = , : ~`, quotes, space, tab), so a path holding a space, a `%`, or a non-ASCII character stops crediting by design. Both directions are chosen. Under-crediting costs one re-read; over-crediting silently defeats the gate.

- **Each agent reads for itself.** Hook state keys on `agent_id ?? session_id`, so a subagent doing routed work pays the read cost fresh even when its parent already read the same doc. Inheritance was rejected because a dispatch may be one agent or many in an orchestrated run and the hook cannot tell which shape it is in from inside a single payload. The safe default is that context does not travel, and the cost is a re-read rather than a gate satisfied by reads the agent never performed.

- **A doc read through a channel the hook never observed still reads as unread.** Content pasted into the conversation, delivered by a different tool, or carried over from a prior session credits nothing. The remedy is one re-read through an observed channel, and the deny message names it.

- **Shell writes the parser cannot see are not rerouted.** Word-prefixed redirects (`echo hello>f`), `python -c` and every other interpreter writing through its own runtime, and `cp` / `mv` / `dd` all pass. These are recorded as deliberately open rather than closed by guesswork, because a write detector that guesses reroutes edits that were never writes.

- **Neutral:** whether forced reading changes what the agent produces, rather than only what it has loaded, is measured for the announcement (it did not) and asserted for the deny on operator testing alone. The end-to-end run against a live host is what turns that into an observation.
