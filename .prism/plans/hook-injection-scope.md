# Plan: hook-injection-scope

## Ticket

No tracker ticket — scoped directly out of the `lane-injection-scope` dispatch on 2026-08-04. Companion to [`context-delivery-mechanism.md`](./context-delivery-mechanism.md), which owns the hook work this plan evaluates and amends. This plan does not restate that plan's tasks 6–8; it amends them in place and adds what they were missing.

## Goal

Settle whether rules and ADRs get the architect-context hook treatment (they don't), and settle how the compaction checkpoint ships (build the existing tasks, with three corrections the vendor docs force).

---

## The constraint both parts inherit

A Claude Code hook's `additionalContext` is capped at **10,000 characters**, documented and verified on 2026-08-04:

> "Hook output strings, including `additionalContext`, `systemMessage`, and plain stdout, are capped at 10,000 characters. Output that exceeds this limit is saved to a file and replaced with a preview and file path, the same way large tool results are handled."
> — https://code.claude.com/docs/en/hooks.md

Overflow is not truncation. Past the cap the model receives a **~2 KB preview plus a file path** — a file it has no reason to open. So the cap behaves as a cliff: a payload that fits arrives whole, and a payload one byte over arrives as roughly a fifth of itself with the rest addressed rather than delivered.

This reframes the working assumption. The budget is not ~2 KB — it is 10,000 characters, and ~2 KB is what you get *for having exceeded it*. The design question is therefore binary per payload: does it fit under 10,000, or does it not.

**Measured against PRISM's own surface:**

| Payload | Bytes | Fits under 10,000 |
| --- | --- | --- |
| `pre-compaction-checkpoint.md` (whole rule) | 1,244 | Yes, with room to spare |
| Smallest architect doc (`_toolkit/spec-editing.md`) | 2,524 | Yes alone; never routes alone (see below) |
| Smallest `load: paths` rule (`design-governance.md`) | 2,128 | Yes |
| Largest `load: paths` rule (`skill-authoring.md`) | 14,434 | No |
| One `Read` under `.prism/**` today | ~10,600 | **No** |

---

## Part 1 — rules and ADR injection: don't build

**Recommendation: do not build.** Rules already have a path-triggered tier, and the hook cannot improve on it — on two of three hosts it would duplicate content already delivered, and on the third the host does the gating natively. ADRs fail an earlier test: they have no path-detectable moment of relevance.

### Why the tier system already covers rules

`load: paths` is Tier 2, and seven rules declare it. The routing table Part 1 asks for **already exists** — it is the `paths:` list in each rule's own frontmatter, maintained by the rule's author in the same diff that changes the rule. A second table in a manifest would be a competing source of truth for the same question, and the two would drift the first time someone edited one and not the other.

Delivery per host, verified on disk:

- **Cursor** — `rule-dialect.ts:73` rewrites `paths:` to `globs:` in the generated `.mdc`. Cursor path-gates natively. There is nothing for a hook to add.
- **Claude Code and Codex** — `build.ts:163` excludes only `load: skill` rules from the platform copies. All 29 non-Tier-3 rules land in `.claude/rules/` and `.codex/rules/` identically, `paths` and `always` alike. Those rules are already delivered.

A hook injecting a rule that is already in `.claude/rules/` is a duplicate. It spends a per-`Read` process and up to 10,000 characters of budget to deliver content the session already has.

### The one version that would buy something, and why it's dead

Retier the seven `load: paths` rules to `load: skill` so they leave the always-on surface, then re-inject them on path match via hook. That trades constant always-on cost for occasional targeted delivery — a real trade, and the only shape of Part 1 that isn't self-evidently redundant.

It fails on delivery. Two of the seven exceed 10,000 characters outright (`skill-authoring.md` at 14,434; `implementation-task-detail.md` at 12,858), so those two would arrive as previews — strictly worse than the whole rule they arrive in place of today. The other five would fit only if nothing else matched the same path, which is not how the manifest behaves (see Part 1's evidence in `## Debugged Issues` below: overlapping globs already stack three docs onto one read). A mechanism that degrades the two largest rules to a file path, in exchange for removing five smaller ones from always-on, is a net loss.

### Why ADRs are a clearer no

Rules describe what to do; ADRs record why a past decision went the way it did. A path match cannot detect the moment an ADR is relevant, because the same file is touched by work that implicates the decision and by work that doesn't — editing `build.ts` to fix a typo and editing it to change the tier discriminator hit the identical glob. Injecting ADR-0070 on every `build.ts` read would be noise on nearly every read and signal on almost none.

ADRs also fail the size test as a class: the toolkit ADRs run past 10,000 characters routinely, so relevance aside, the delivery would be a preview.

The existing seam is correct and already works — a rule or skill cites the ADR by number at the moment the reasoning matters (`skill-routing.md` cites the authors-ship decision; `branch-plan.md` cites ADR-0047). Citation puts the ADR one deliberate read away from the persona that needs it, without spending budget on the sessions that don't.

### The real gap this scoping surfaced

Tier 2 is not path-scoped on Claude Code or Codex. It is always-on there, identical to Tier 1, and only Cursor honors the gate. ADR-0070 concedes as much in its own Neutral consequence — the Claude Code loader behavior is "inferred from observed behavior, not a documented Claude Code contract."

That is a live discrepancy between what the three-tier model claims and what two of three hosts do, and it is worth fixing. The remedy is not a hook: it is either to stop describing Tier 2 as path-scoped on hosts that don't gate it, or to shrink the seven rules so their always-on cost is one PRISM is willing to pay everywhere. Both are outside this lane — recorded as follow-up, not tasked here.

---

## Part 2 — compaction: build, and port separately

**Recommendation: build `context-delivery-mechanism.md` tasks 6–8. Also port thrive's hook — but as a different thing, because it is a different thing.**

### Port and build were never alternatives

Thrive's `.claude/hooks/compact-checkpoint.mjs` does not write a checkpoint. Read in full on 2026-08-04, its own header states the job:

> "PreCompact hook that clears the per-session architect-context dedup state, so a doc a compacted-away Read had credited nags again instead of staying silently marked read."

It deletes `<tmpdir>/claude-architect-context/<session_id>.json` and exits. No marker, no plan state, no injection, no reconciliation — it is cache invalidation for thrive's architect-context hook, which happens to hang off the `PreCompact` event. The name is the only thing it shares with tasks 6–8.

So the dispatch's port-vs-build framing is a false binary: porting it would leave tasks 6–8's behavior unbuilt, and building tasks 6–8 would leave thrive's fix unported. Both are worth having, for unrelated reasons.

### Port it anyway — PRISM has the identical bug

`architect-route.ts` tracks injected docs per session so a doc injects once. Compaction can drop the injected copy from the conversation while the state file still records it as injected, so the doc is silently marked delivered and never returns. That is precisely the failure thrive's hook exists to fix, and PRISM has no equivalent.

Thrive also declined to build a post-compact injection, reasoning that "every skill's own startup already re-reads the plan file on session start." That reasoning does not transfer — and thrive's own comment concedes why: its reset "fires reactively, the next time the model touches a manifest-matched file, not proactively on the compacted session itself." Compaction does not restart a skill, so no startup re-read happens on the compacted session. The proactive gap tasks 6–8 target is real in both repos; thrive chose not to close it.

Sequence the port **after** the payload bug in `## Debugged Issues` is fixed. While every `.prism/**` injection arrives as a preview, re-enabling injection buys a second preview.

### Build tasks 6–8 — the payload fits

`pre-compaction-checkpoint.md` is 1,244 bytes whole. Even injected verbatim with a marker path and a plan path appended, the payload lands well under 10,000 characters and arrives intact. This is the surviving shape the constraint permits, and Part 2 is the case that clears it — the same constraint that kills Part 1 spares Part 2, because the difference is 1,244 bytes against 10,600.

Three corrections the vendor docs force, none of which the existing tasks carry:

1. **Claude's `PostCompact` cannot inject.** It exists, and its decision control is documented as "None — No decision control. Used for side effects like logging or cleanup." Task 7 names Codex's `PostCompact` correctly but the Claude path must be `SessionStart` with matcher `compact` — verified to support `hookSpecificOutput.additionalContext`. Anyone reaching for Claude's `PostCompact` by symmetry with Codex gets a hook that runs and delivers nothing.

2. **Imperative framing is counterproductive on this host.** The docs warn: "Text framed as out-of-band system commands can trigger Claude's prompt-injection defenses, which causes Claude to surface the text to you instead of treating it as context." The payload should therefore read as state, not as a command — lead with the fact and the paths, let the reconciliation follow as context. An injected payload that opens with a directive risks being shown to the operator instead of absorbed, which is the one failure mode indistinguishable from the hook not firing.

3. **Cursor gets the measurement and cannot use it.** See the ADR-0008 Decision below.

### What happens to the parked lane and to tasks 6–8

Tasks 6–8 stay in `context-delivery-mechanism.md`, unmoved and unduplicated. They are already written to the detail bar; copying them here would create two sources of truth for one PR and break one-plan-per-ticket. `lane-pr2-compaction` unparks against those tasks, carrying the three corrections above as amendments recorded in this plan's `## Implementation Tasks`.

---

## Decisions

- **ADR-0008's premise is false at the host layer and true at the model layer, and the distinction is the whole finding.** Cursor's `preCompact` input carries `context_usage_percent`, `context_tokens`, `context_window_size`, and `message_count` — verified verbatim against https://cursor.com/docs/agent/hooks on 2026-08-04, from raw page source.
  - **Root cause:** ADR-0008 rests on "the agent cannot react to it after the fact," and the rule built on it triggers on "when context usage approaches the compaction threshold" — a self-measurement. The Cursor finding shows a host *can* hold that measurement. It does not show a model can receive it.
  - **The split, verified on both hosts:** Cursor's `preCompact` is documented as "an observational hook that cannot block or modify the compaction behavior," and its sole output is `user_message` — text shown to the *human*, with no channel into the model's context. Claude Code's `PreCompact` is the mirror image: it can block (`decision: "block"`), and its input carries no token count, no usage percentage, no window size, no message count. One host measures and cannot tell the model; the other can interrupt and cannot measure. No host available today holds both halves.
  - **Consequence for the audit criterion:** `context-delivery-mechanism.md`'s rule — "a rule whose trigger is a self-measurement belongs in a mechanism or nowhere" — survives intact and is sharpened, not weakened. Cursor proves the measurement belongs in a mechanism; it also proves the mechanism cannot hand it back. Both verdicts that criterion produced (convert `pre-compaction-checkpoint.md`, retire `context-window-handoff-check.md`) stand unchanged.
  - **Consequence for ADR-0008:** its supersession (task 8) should record both refutations and their different characters — the stated premise is refuted outright by `SessionStart(source: "compact")`, while the implicit self-measurement premise is refuted only at the host layer and still holds where it matters. Recording only the first would leave a future reader to rediscover the second and reasonably conclude the criterion was wrong.
  - **Watch for:** the calculus flips if Cursor adds an injecting post-compact event, or if Claude Code adds measurement fields to `PreCompact`. Either would put both halves on one host for the first time.
  - **→ promotion verdict pending close.** Candidate surface: the ADR-0008 supersession itself plus `.prism/architect/_toolkit/` if a hook-capability doc lands.

- **Rules do not get an injection hook — the tier system already solves it, and the one non-redundant variant fails on delivery.**
  - **Root cause:** `load: paths` already carries per-rule path routing in the rule's own frontmatter. Cursor gates natively via `globs:`; Claude Code and Codex receive all `paths` rules on the always-on surface (`build.ts:163` excludes only `load: skill`). A hook would duplicate delivered content on two hosts and add nothing on the third.
  - **Alternatives considered:** a rules manifest mirroring `.prism/architect/manifest.json`; a diff-triggered rather than read-triggered injection; retiering the seven `paths` rules to `load: skill` and re-injecting on match.
  - **Chosen approach:** don't build. The retier variant was the only one worth weighing and it loses on arithmetic — `skill-authoring.md` (14,434 B) and `implementation-task-detail.md` (12,858 B) both exceed the 10,000-character cap, so the two largest rules would degrade from whole delivery to a file path in exchange for removing five smaller ones from always-on.
  - **Implementation guidance:** none — nothing is built. The `paths:` frontmatter stays the routing table.
  - **→ promotion verdict pending close.**

- **ADRs do not get an injection hook, on relevance before size.** A path glob cannot distinguish work that implicates a decision from work that merely touches the same file, so injection would be noise on nearly every match. Considered and rejected: routing ADRs by path the way architect docs are routed — architect docs describe how an area works and are relevant whenever you touch it; ADRs record why one choice beat another and are relevant only when you are about to revisit that choice, which no glob detects. Citation-by-number at the moment of relevance is the existing seam and it is the right one.
  - **→ promotion verdict pending close.**

- **Thrive's `compact-checkpoint.mjs` is a dedup-state reset, not a checkpoint writer — port it as its own concern, and build tasks 6–8 regardless.** The two mechanisms share a name and nothing else.
  - **Root cause:** the dispatch framed port-and-build as alternatives. Reading the file settles it: it deletes the architect-context dedup state on `PreCompact` and exits. Tasks 6–8 write a marker and inject a reconcile payload post-compaction. Neither substitutes for the other.
  - **Chosen approach:** build tasks 6–8 (the payload fits — 1,244 B against a 10,000-character cap); port the dedup reset separately, sequenced after the payload bug below is fixed, since re-enabling injection while every injection arrives as a preview buys a second preview.
  - **Implementation guidance:** PRISM's equivalent state lives at `.prism/architect-route-state.<session>.json`, not thrive's tmpdir path, and `pruneStaleRouteState` already walks that directory — the reset is a sibling of existing code, not a new subsystem.
  - **→ promotion verdict pending close.**

- **The delivery budget is 10,000 characters with a cliff, not a ~2 KB ceiling.** Payloads under the cap arrive whole; payloads over it collapse to a preview plus a file path the model does not open. Designs are therefore judged pass/fail against 10,000, not shrunk toward 2 KB.
  - **Root cause:** the observed ~2 KB arrival is the documented overflow *preview*, not the cap itself. Treating 2 KB as the budget would have ruled out the compaction payload, which fits comfortably.
  - **Implementation guidance:** any future hook payload states its worst-case byte count against 10,000 before it ships, and accounts for every doc a path can match — not just the nearest one.
  - **→ promotion verdict pending close.**

---

## Implementation Tasks

Wave-scoped. Part 1 produces no build tasks by design. Part 2's tasks amend `context-delivery-mechanism.md`'s existing tasks 6–8 rather than restating them.

Verification for every task below is content-only unless stated: `pnpm prism:build` regenerates mirrors cleanly, then `pnpm prism:check` passes.

### Winston (architecture)

1. **Amend `context-delivery-mechanism.md` task 7 with the two host corrections.** In `.prism/plans/context-delivery-mechanism.md`, in the task 7 paragraph beginning `**Add the two compaction hooks.**`, make two edits:

   **1a.** Replace the parenthetical `(Codex also exposes `PreCompact` and `SessionStart` with `source: "compact"` — verified 2026-08-02 against https://learn.chatgpt.com/docs/hooks; `PostCompact` is the confirmed injection point and the other two are available if the implementer finds them more reliable.)` with a sentence recording that Claude Code's own `PostCompact` exists but carries no decision control and cannot inject, so the Claude path is `SessionStart` matched on `compact` and only Codex uses `PostCompact`. Cite https://code.claude.com/docs/en/hooks.md, verified 2026-08-04.

   **1b.** Append to the same task a sentence stating that the injected payload is phrased as state rather than as a directive — the docs warn that out-of-band-command framing trips prompt-injection defenses and causes the text to be surfaced to the operator instead of used as context. Name the consequence: that failure is indistinguishable from the hook not firing.

   Content-only, no build effect. Sequence: before `lane-pr2-compaction` resumes.

2. **Add the byte-budget line to `context-delivery-mechanism.md` task 7.** In the same task, state the payload's worst-case size against the 10,000-character cap: `pre-compaction-checkpoint.md` is 1,244 bytes, and the marker and plan paths add under 300, so the payload arrives whole with margin. This is the check task 6–8's PR is expected to restate at ship time. Content-only. Sequence: after task 1.

3. **Record the ADR-0008 dual-refutation in `context-delivery-mechanism.md` task 8.** In the task beginning `**Supersede ADR-0008.**`, add that the supersession records two refutations of different character — the stated premise refuted outright by `SessionStart(source: "compact")`, and the implicit self-measurement premise refuted only at the host layer (Cursor measures) while holding at the model layer on every host (no host both measures and injects). Point at this plan's `## Decisions` for the verified field lists. Content-only. Sequence: after task 2.

### Clove (implementation)

4. **Port thrive's compaction dedup reset.** New file `scripts/ai-skills/hooks/pre-compact-reset.ts`. On Claude Code's `PreCompact`, delete the current session's architect-route state file so docs credited as injected before the compaction can inject again. Behavior:
   - Parse stdin JSON; read `session_id` and `cwd`.
   - Resolve the repo root with the existing exported `findRepoRoot` from `scripts/ai-skills/hooks/architect-route.ts` — do not reimplement the walk-up.
   - Delete `.prism/architect-route-state.<safeSessionId>.json`, reusing `buildStateFilePath` from the same module rather than rebuilding the path.
   - Absent `session_id`: fall back to deleting sibling `architect-route-state.*.json` files older than 12 hours, matching `pruneStaleRouteState`'s existing sweep shape.
   - Fail open — swallow every error, exit 0. A failed reset costs one stale entry; a thrown hook costs the compaction path.
   - First statement in the entry path: `if (process.env.PRISM_HOOK_DISABLE === "1") { return; }`, matching `claude-post-read.ts` so one variable still disables every hook.
   - Entry-point guard: `fileURLToPath(import.meta.url) === path.resolve(process.argv[1])` before invoking `main()`, per the pattern in `crossref-lint.ts` — importing this module in a test must not run the hook.
   - Split `runReset` (pure, returns which sessions it cleared) from `main()` (the only function touching `process.stdout` / `process.exitCode`), per the split `claude-post-read.ts` already uses — the test suite's stdout protocol breaks otherwise.

   **Sequence: after the payload defect in `## Debugged Issues` is fixed.** Resetting dedup while every injection arrives as a preview re-delivers a preview.

   Registration in `.claude/settings.json` is operator-only and out of scope for the implementing session — record the exact JSON entry in this plan's `## Review Issues` for hand-application, matching how the `npx` → `pnpm exec tsx` change was handled on PR #450.

   **Verification:** new `scripts/ai-skills/pre-compact-reset.test.ts` covering the kill switch, the session-targeted delete, the absent-`session_id` age fallback, and a malformed-JSON stdin. Then `pnpm prism:test`, `pnpm prism:check-types`, `pnpm prism:check`.

### Not tasked, deliberately

Part 1 produces no tasks. The Tier-2-is-not-gated-on-Claude finding and the payload defect below are recorded, not tasked here — the first is a tier-model question that outgrows this lane, the second belongs to the plan that shipped the code.

---

## Debugged Issues

### Architect-context injection still overflows the host cap — the byte ceiling from PR #450 does not deliver

- **Status:** `open`
- **Severity:** High
- **Confidence:** `High` — confirmed root cause plus a firsthand reproduction
- **Environment:** PRISM `main` at `20b928da`, Claude Code, 2026-08-04
- **File:** `scripts/ai-skills/hooks/architect-route.ts:43` (`MAX_DOC_INJECTION_BYTES`), `:325-334` (`resolveArchitectDoc`'s join)
- **Root cause:** `[Confirmed]` — `MAX_DOC_INJECTION_BYTES = 4000` caps each doc individually inside `formatInjectionSection`, then `bodies.join("\n\n---\n\n")` concatenates every matched doc with no ceiling on the total, so the per-emission size scales with how many manifest globs a path matches.
- **Steps to Reproduce:**
  1. Read any file under `.prism/plans/` in a Claude Code session with the hook registered.
  2. Observe the emitted `additionalContext` size.
- **Expected behavior:** the injected architect context arrives in the conversation.
- **Actual behavior:** the emission is ~10,600 bytes, exceeds the documented 10,000-character cap, and is replaced with a ~2 KB preview plus a path to a tool-results file. Reproduced in this session: `Output too large (10.6KB). Full output saved to: .../tool-results/hook-...-additionalContext.txt / Preview (first 2KB)`.
- **Arithmetic:** `.prism/plans/**` routes to `_toolkit/spec-editing.md` (2,524 B, under the per-doc cap so injected whole), and the `.prism/**` catch-all additionally routes to `_toolkit/install-layout.md` (39,969 B → capped to 4,000) and `_toolkit/skills-ecosystem.md` (48,807 B → capped to 4,000). Total with separators and headers ≈ 10,600 — over the cap by roughly 600 bytes.
- **Why the prior fix missed it:** Eric's PR #450 Major measured 92,366 bytes and the remedy reasoned in tokens (~1k per doc), not against a host cap nobody had looked up. 4,000 per doc is a sound per-doc number and three docs still overflow. The fix reduced the overflow without eliminating it, so arrival changed from one preview to a different preview.
- **Refuted hypotheses:**
  - The count ceiling is being violated and docs re-inject — refuted; a single first read of one file already overflows, no repeat needed.
  - The manifest's array-valued routes are the sole cause — refuted; `.prism/plans/**` is a single-valued route. The overlapping `.prism/**` catch-all is what stacks the third doc on.
- **Recommended fix:** add a per-emission ceiling below 10,000 characters — cap the *joined* payload, not each section — and when the budget is exhausted, emit the remaining docs as paths rather than bodies. Naming a path costs ~60 bytes and is honest about what was not delivered; a preview is not.
- **Suggested tests:** a test that asserts the joined payload of a path matching three docs stays under the cap. The existing suite seeds small bodies and asserts per-doc truncation, so it cannot see this.
- **Ticket:** `N/A` — belongs to `context-delivery-mechanism.md`, which owns the shipped code.

---

## Acceptance Criteria

### Behavioral

- [ ] Given a session compacts on Claude Code, When the next request begins, Then the conversation carries the checkpoint spec and the marker path as context (REQ-1)
  - Evidence: `human` — an operator compacts a session and confirms the checkpoint text appears in the conversation rather than as a file path or as surfaced-to-user output.
- [ ] Given a session compacts, When the reset hook runs, Then docs the session had already been credited with can inject again (REQ-1)
  - Evidence: `machine` — `pre-compact-reset.test.ts` asserts the session's state file is absent after `runReset`.
- [ ] Given `PRISM_HOOK_DISABLE=1`, When either compaction hook fires, Then it writes nothing and exits 0 (REQ-1)
  - Evidence: `machine` — a test pipes fixed stdin with the variable set and asserts empty stdout and exit 0.
- [ ] Given the reset hook receives a payload with no session identifier, When it runs, Then it clears only state files older than 12 hours and leaves newer ones intact (REQ-1)
  - Evidence: `machine` — a test seeds one stale and one fresh state file and asserts only the stale one is gone.

### Non-behavioral

- [ ] No new injection mechanism is added for rules or ADRs (REQ-1)
  - Evidence: `machine` — `ls scripts/ai-skills/hooks/` contains no rules- or ADR-routing adapter; no rules manifest exists under `.prism/`.
- [ ] The compaction payload's worst-case byte count is stated in the shipping PR and is under 10,000 (REQ-1)
  - Evidence: `human` — a reviewer reads the PR body and confirms the number is present and the arithmetic holds.
- [ ] The ADR-0008 supersession records both refutations and distinguishes the host layer from the model layer (REQ-1)
  - Evidence: `human` — a reviewer reads the superseded ADR and confirms both claims appear with their different scopes.
- [ ] `pnpm prism:build` regenerates all mirrors with no drift, and `pnpm prism:check` passes, after every task (REQ-1)
  - Evidence: `machine` — both commands exit 0.

### AC Sync Log

| Date | Agent | Action | Plan | Ticket |
| ---- | ----- | ------ | ---- | ------ |
| 2026-08-04 | Winston | AC created in plan; no tracker ticket exists for this work | ✓ | N/A |

---

## Review Issues

None yet.

---

## Cleanup Items

None.

---

## Sessions

- 2026-08-04 [huntermcgrew/hook-injection-scope] open: Intent — decide build/defer/don't for rules-and-ADR injection and settle how the compaction checkpoint ships; Bounds — this plan file only, no hook source, no rule edits, no `.claude/settings.json`, no PR; Approach — verify every host-capability claim against vendor docs before recording it, and test each proposed mechanism against the measured delivery budget before designing it · close: scope held — one addition beyond the tasked output, the injection-overflow defect, recorded because it was reproduced firsthand and it changes Part 1's arithmetic

---

## History

- 2026-08-04 [huntermcgrew/hook-injection-scope]: Plan created from the `lane-injection-scope` dispatch. Part 1 lands as don't-build — the `load: paths` tier already carries per-rule routing and the only non-redundant variant fails the delivery cap. Part 2 lands as build-tasks-6–8 plus a separate port; see Decisions.
