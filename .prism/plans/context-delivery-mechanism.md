# Plan: context-delivery-mechanism

## Ticket

No tracker ticket — scoped directly with Hunter on 2026-08-02, out of the thrive-port comparison pass. Companion plan to [`thrive-port.md`](./thrive-port.md), which keeps its original ten-candidate verdicts; this plan owns the five newer thrive PRs, three newly-classified ones, the hook work they surfaced, and the always-on rule audit.

## Goal

Move PRISM's rule and architect-context delivery from prose the model must remember to mechanisms that fire on the actual event, and land the portable thrive rule content around it — as small single-concern PRs that run in parallel wherever the generated `AGENTS.md` block allows.

---

## The problem this plan exists to fix

Sessions here run 200k–300k tokens. Three delivery paths carry PRISM's instructions, and only one of them survives that depth:

- **Tier-1 rules** are injected at session start. At 300k they are present but far behind the work, competing with everything since.
- **Pointers between files** — "see also `X.md`" — are evaluated by the model at read time and skipped when context is thick.
- **Content re-stated at the point of use** — a skill body, a mid-flight re-anchor, an injected hook payload — arrives beside the work and holds.

Two Tier-1 rules make this concrete. `pre-compaction-checkpoint.md` asks the model to notice it is near the compaction threshold, and `context-window-handoff-check.md` asks it to count exchanges, files read, and skill invocations. Both triggers are self-measurements the model cannot make reliably, and both fire at the moment their own rule text is most faded. No plan in `.prism/plans/` records either one having fired.

---

## Decisions

- **A rule whose trigger is a self-measurement belongs in a mechanism or nowhere.** This is the audit criterion for the Tier-1 set, and it is mechanical enough to apply without judgment: does the rule ask the model to measure something about itself — context usage, exchange count, files read, tokens spent — before it can fire?
  - **Root cause:** self-measurement triggers fail in both directions. The model either does not notice the threshold (silence) or claims a count it cannot verify (theater). Either way the always-on context the rule occupies buys nothing.
  - **Alternatives considered:** tune the numeric thresholds; keep the rules and accept partial firing.
  - **Chosen approach:** convert to a hook where the host exposes the event, retire where it does not. Both known hits have an exposed event.
  - **Implementation guidance:** two confirmed hits — `pre-compaction-checkpoint.md` (converts) and `context-window-handoff-check.md` (retires, already scoped as `thrive-port.md` task 17). The audit applies the criterion to the rest of the Tier-1 set.
  - **→ promotion verdict pending close.**

- **Hooks earn their place only where no file-based mechanism exists.** Always-on rule delivery stays as it is — CLAUDE.md imports, the generated `AGENTS.md` Tier-1 block, and Cursor's native `alwaysApply: true`.
  - **Root cause:** a SessionStart hook would inject the same content at the same position, so it does not touch the attention problem. What it would change is the failure mode: generation is gated by `prism:check` and fails loudly, where a hook that errors or times out silently delivers nothing. Install cost also triples — three consumer config surfaces to merge into rather than a file copy — and hook-injected content is invisible to a consumer reading their own repo.
  - **Alternatives considered:** move Tier-1 delivery to SessionStart injection on all three hosts.
  - **Chosen approach:** files for always-on delivery; hooks only for read-triggered routing and compaction, where no rules file can express the trigger.
  - **→ promotion verdict pending close.**

- **Architect-context routing gets a read-triggered hook, because `Read` is a strict precondition for `Edit`.** The harness requires a prior read before an edit, so a hook firing after `Read` lands the governing doc before any edit is possible.
  - **Root cause:** routing keys on the working diff (`prism-architect` startup step 4 matches the diff against `manifest.json`). A prompt-driven task carries an unrelated diff, so the target path's own architect doc never loads.
  - **Alternatives considered:** the prose clause alone (thrive #2247's fix — kept, as the fallback for hosts without hooks); a `PreToolUse` gate on edits; personas writing what they loaded into shared state for the hook to read.
  - **Chosen approach:** hook on `Read`, track only the hook's own injections, once per doc per session. It never needs to know what startup already loaded — a duplicate copy lands nearer the work than the startup copy, which is the position that survives depth, and the read-from-disk makes it current rather than a replay. Dropping the persona-writes-state design removes a coordination seam with every persona.
  - **Implementation guidance:** ceiling is one injection per architect doc per session, so a wide read sweep cannot re-inject.
  - **→ promotion verdict pending close.**

- **Compaction is handled after the event, not before.** `PreCompact` writes a marker; the post-compact session does the reconciliation.
  - **Root cause:** `PreCompact` cannot inject context on Claude Code — it supports only `decision: block` and `reason`. Blocking would work mechanically, but auto-compaction fires *because* the window is exhausted, so blocking it schedules the most context-hungry task of the session at the moment of least context. Nothing is lost by waiting: `transcript_path` is a file on disk that survives compaction intact.
  - **Alternatives considered:** block on `PreCompact` and have the model write the checkpoint before compaction; an `agent`-type hook doing the write inline (capped at 60s, fires at the worst moment).
  - **Chosen approach:** `PreCompact` command hook writes a marker (branch, plan path, `git status`, `transcript_path`, timestamp) — no reasoning, nothing that can fail on judgment. `SessionStart` with `source: "compact"` injects the checkpoint spec plus an instruction to reconcile the plan against the marker.
  - **→ promotion verdict pending close.**

- **ADR-0008 is superseded, not amended.** Its stated premise — "because compaction is silent, the agent cannot react to it after the fact" — is false now that `SessionStart` exposes `source: "compact"`. Its own Neutral consequence names the defect the hook removes: "the agent needs to sense compaction pressure."
  - **Implementation guidance:** the rewritten `pre-compaction-checkpoint.md` keeps the five-bullet content spec as the hook's injected payload and drops the self-observation trigger. The same five bullets are currently duplicated in `AGENTS.md § 12` and `CLAUDE.md § Context Preservation Rules` — the rewrite consolidates to one home.
  - **→ promotion verdict pending close.**

- **`rule-load.ts` needs a fourth tier value, or the rewritten checkpoint rule needs a different home.** The enum is `always | paths | skill`, and a hook is not a skill. Deciding between a `hook` value and declaring the rule `skill` with the hook as its reader is part of task 6.
  - **→ promotion verdict pending close.**

- **Sol keeps his autonomy and his merge capability; only the `launch | internal | hobby` intake goes.** Removing `autonomyPolicy` makes Sol more autonomous by default, not less — today it is a ceiling a persona may never auto-clear below, so identical work gates differently depending on an answer given at intake.
  - **Root cause:** the dial adds an intake question whose answer changes gate behavior without changing the work being gated.
  - **Chosen approach:** gates are judged by their owning persona on the merits — the owner self-clears the simple cases and escalates on judgment. `features.conductorMayMerge` in `.ai-skills/config.json` is a separate flag and is untouched; PRISM sets it `true` today and consumers set it themselves.
  - **→ promotion verdict pending close.**

- **Thrive's conductor draft hold is not ported.** It solves a thrive-specific review flow. The four-part dispatch shape from the same PR is ported.
  - **→ promotion verdict pending close.**

- **The claim-verification family lands in skill bodies, not a new Tier-1 rule.** Its three sections fire at specific moments — authoring a doc, fixing a review finding, composing a dispatch brief — which are Briar's, Eric's, and Winston's checkpoints. A 35-line always-on rule nobody attends to at 300k is weaker than four sentences in the three skills that need them.
  - **→ promotion verdict pending close.**

- **Writing-voice stays Tier 1.** Its scope covers skills, rules, architect context, ADRs, templates, durable plan sections, PR descriptions, commit messages, and tracker tickets — nearly every persona's output, because PRISM's product is durable prose. A `load: skill` retier would need a thirteen-persona list, which is `always` with extra bookkeeping and a drift surface. The mechanically-detectable half moves to a build gate instead.
  - **→ promotion verdict pending close.**

- **A host adapter ships only after it has been exercised on that host.** Claude Code is testable now; Cursor and Codex are not available to test as of 2026-08-02.
  - **Root cause:** both non-Claude adapters rest on an inferred fact — that Cursor's `postToolUse` input carries the file path for a Read, and that Codex's `apply_patch` input exposes the target path in a stable shape. Both come from vendor docs, not from a run. Shipping them alongside a verified adapter would present three working integrations where only one is known to work.
  - **Alternatives considered:** ship all three with the two marked unverified in the ADR.
  - **Chosen approach:** PR 1 ships the Claude adapter only. The Cursor and Codex adapters become a follow-up PR gated on host access. The resolver is shared and host-agnostic, so the follow-up is adapters and registration alone.
  - **→ promotion verdict pending close.**

- **Eli rides each PR rather than batching a documentation pass at the end.** A batched pass leaves every intermediate merge shipping docs that contradict their source.
  - **Chosen approach:** each PR runs `grep -rn "<changed concept>" docs/` before it opens. No hits means no docs work and the PR proceeds; hits mean the docs edit lands in the same PR. Cheap when there is nothing to do, and it catches drift at the only moment it is cheap to fix.
  - **→ promotion verdict pending close.**

- **The generated `AGENTS.md` Tier-1 block is the parallelism constraint.** It inlines every Tier-1 rule body, so any PR editing a Tier-1 rule also rewrites `AGENTS.md`. Tier-2 and Tier-3 rules are not in the block and do not collide.
  - **Chosen approach:** two lanes. Lane A (Tier-1 rule edits) merges one at a time; a conflict there is in generated output and resolves by taking either side and re-running `pnpm prism:build`. Lane B (everything else) runs with no serialization at all.
  - **→ promotion verdict pending close.**

---

## Lane model

Every PR below is single-concern. The lane decides what can run at once.

**Lane A — touches the generated `AGENTS.md` block. Merge one at a time.**
Any PR whose diff includes a `.prism/rules/*.md` file with `load: always`.

**Lane B — no `AGENTS.md` collision. Fully parallel.**
Skill bodies, templates, `scripts/`, Tier-2 and Tier-3 rules, ADRs, docs, reports.

A conflict inside Lane A is mechanical, not semantic: the source rule files differ, only the regenerated block collides. Resolve by rebuilding, never by hand-editing `AGENTS.md`.

---

## Implementation Tasks

Wave 1 tasks carry full detail. Later waves are scoped at PR grain and get task-level detail when their wave opens — writing twenty PRs' worth of exact edits now would produce a plan stale before it is read, and wave 2's cut lines depend on wave 1's audit output.

Verification for every rule or skill task: `pnpm prism:build` regenerates mirrors cleanly, then `pnpm prism:check` passes. Content-only tasks say so.

### Clove (implementation) — Wave 1

**PR 1 — architect-context read hook** (Lane B for the code, Lane A for the prose clause)

1. **Add the routing resolver.** New file `scripts/ai-skills/hooks/architect-route.ts`. One exported function taking a file path and a session id, returning the architect doc body to inject or `null`. Behavior: match the path against `.prism/architect/manifest.json`; if a doc matches, check the session state file for a prior injection of that doc; if absent, read the doc from disk, mark it injected, and return its body. Reads from disk at call time so an edited doc injects current content. State file per `lazy-artifacts.md` — created on first injection, never seeded; atomic write via `.tmp` + rename. Ceiling is one injection per architect doc per session.

2. **Add the Claude adapter.** New file `scripts/ai-skills/hooks/claude-post-read.ts`. Parses stdin JSON, extracts the path, calls the resolver, wraps the result in Claude's output shape. Verified against the Claude Code hooks reference: event `PostToolUse`, matcher `"Read"`, path at `tool_input.file_path`, session key `session_id`, output `{"hookSpecificOutput": {"hookEventName": "PostToolUse", "additionalContext": "..."}}`. Exercise it end-to-end before the PR opens — read a file with a matching manifest entry and confirm the doc arrives, then read it again and confirm nothing does.

3. **Register the Claude hook.** Add the entry to `.claude/settings.json`. Registration must merge into any existing consumer config rather than overwrite it.

   *Cursor and Codex adapters are a follow-up PR, gated on host access.* Their shapes are recorded here so the follow-up does not re-derive them: Cursor uses `postToolUse` matched on the Read tool with output field `additional_context` — its `beforeReadFile` supports access control only and cannot inject, so it is not usable. Codex has no file-read tool at all and reads through Bash or a filesystem MCP, so it triggers on `PreToolUse` with matcher `"^apply_patch$"`, output `{"hookSpecificOutput": {"hookEventName": "PreToolUse", "additionalContext": "..."}}`. Both rest on an inferred fact the follow-up must confirm on the host — that Cursor's `postToolUse` input carries the file path for a Read, and that Codex's `apply_patch` input exposes the target path in a stable shape.

4. **Port the prose fallback.** [Lane A] In `.prism/rules/context-reuse.md`, add thrive #2247's clause after the mid-session-rebase paragraph: architect-context routing keys on the working diff, so a doc you are about to edit is invisible to it — when a task names a specific existing doc or directory, match that target path against `manifest.json` and load its context before editing. State that the hook is the enforcement layer on hosts that expose the event and that this clause is what runs where they do not.

5. **Write the ADR.** New ADR in `.prism/spec/adrs/_toolkit/`: architect-context routing has a mechanical enforcement layer where the host supports it and degrades to prose elsewhere. Records why the prose is not redundant, so a later reader does not delete it.

**PR 2 — compaction checkpoint hook** (stacks on PR 1 — same resolver chassis and state file)

6. **Rewrite `.prism/rules/pre-compaction-checkpoint.md`.** [Lane A] Drop the self-observation trigger; keep the five-bullet content spec as the hook's payload. Resolve the `load:` tier question — either add a fourth value to `rule-load.ts`'s enum (`always | paths | skill | hook`) with validator and test coverage, or declare the rule `skill` and have the hook read the file directly. Record the call in the ADR from task 5's sibling.

7. **Add the two compaction hooks.** `scripts/ai-skills/hooks/pre-compact-marker.ts` writes branch, plan path, `git status --short`, `transcript_path`, and timestamp to a marker file. `scripts/ai-skills/hooks/post-compact-inject.ts` fires on Claude's `SessionStart` with `source: "compact"` and Codex's `PostCompact`, injecting the checkpoint spec plus an instruction to reconcile the plan against the marker. Bound the reconcile instruction to the transcript tail, not the whole file, or the reconcile pass pushes straight toward the next compaction. Cursor has no post-compact event — it degrades to the observational `preCompact` `user_message` nudge; state that limit in the ADR.

8. **Supersede ADR-0008.** Flip its status and record that `SessionStart(source: "compact")` refutes its stated premise. Consolidate the duplicated five bullets — remove them from `AGENTS.md § 12` and `CLAUDE.md § Context Preservation Rules`, leaving one home.

### Winston (architecture) — Wave 2 opener

9. **Run the always-on audit.** Apply the self-measurement criterion to all Tier-1 rules; per-rule verdict of keep, retier, convert to mechanism, or retire. Output is a report, not a code change. Two hits are already known. Also resolve the finding recorded at [`epic-prism-consumer-boundary.md`](./epic-prism-consumer-boundary.md):63 — the always-loaded behavioral rules are in neither the install rule surface nor `AGENTS.md.tmpl`, so consumers run without them. Auditing Tier 1 is moot while consumers never receive Tier 1.

### Wave 2 — scoped, tasked when the wave opens

| PR | Lane | Content |
| --- | --- | --- |
| Voice gate | B + A | `scripts/ai-skills/voice-guard.ts` — mandate-voice tokens, a rule file missing its `**Why:**`, a count beside a glob, session-leakage phrases. Wired into `prism:check`. Same PR shrinks `writing-voice.md` and adds thrive #2260's overflowing-container detector, since all three touch that file |
| Retire handoff check | A | `thrive-port.md` task 17 — delete the rule, sweep citations, flip its ADR to deprecated |
| Git remote discipline | A | `git-conventions.md` — fetch-is-not-updating, the checked-out branch is user-mutable between turns, rebuild-rather-than-resurrect |
| Sweep depth | A | `code-standards.md` — build the matcher from the concept plus a context filter; a rename sweep covers three reference shapes |
| Dev servers rule | A | `thrive-port.md` task 11 — new Tier-1 rule, declared and reaped |
| Claim verification | B | Briar, Eric, and Winston skill bodies — claim-you-author, re-test-a-recorded-conclusion, enumerate-before-removing |
| Gate predicates | B | `verification-commands.md` — state what each command actually proves |
| Ticket types | B | `ticket-types.md` — DX is a layer not an invisibility test, one type label per ticket, and the dealer-vocabulary leak that ships to consumers |
| Citation gates | B | `crossref-lint.ts` — unqualified-`§` rule, `see Decision:` resolver |
| Skills sweep | B | `thrive-port.md` tasks 4–6 — one-pointer batteries, anti-meta-loop, Sol operator contract. Sequence before Claim verification; both edit skill bodies |
| Sol intake | B | `thrive-port.md` tasks 7–8 — remove `autonomyPolicy`, add Iris to the tiering table. `conductorMayMerge` untouched |
| Dispatch shape | B | `thrive-port.md` task 9 only. Stacks on Sol intake — both edit `lib/report-back.md`. Draft hold dropped |
| PR descriptions | B | `thrive-port.md` task 12 — problem-first headings, Register section |
| Lilac standup | B | `thrive-port.md` task 13 plus thrive #2255 — two-shape render, labels run into their bullets |
| Repo orientation | B | `thrive-port.md` tasks 14–15. Sequence after PR 2, which also edits `CLAUDE.md` |
| Worktree setup | B | `thrive-port.md` task 16 — the pnpm link scripts and the mode-755 guard hook |

### Eli (documentation)

10. **Run the docs grep on every PR in this plan.** Before a PR opens, `grep -rn "<changed concept>" docs/`. No hits — record that and proceed. Hits — the docs edit lands in the same PR, never a later one. The concept is the thing the PR renamed, retired, or redefined, not the filename it lives in.

11. **Size the standing docs gap once.** Separate from the per-PR grep: read `docs/` and determine whether the hook work, the retired rules, and the restructured PR-description headings leave a gap that needs its own PR. Not yet sized — no read of `docs/` has been done for this plan.

---

## Acceptance Criteria

### Behavioral

- [ ] Given a session reads a file that has a matching architect doc, When that doc has not been injected this session, Then its current on-disk content is added to the conversation (REQ-1)
- [ ] Given the same file is read again in the same session, When the hook fires, Then nothing is injected a second time (REQ-1)
- [ ] Given a session compacts, When the next request begins, Then the conversation carries an instruction to reconcile the plan against the pre-compaction marker (REQ-1)
- [ ] Given a run starts on any host, When the operator is asked to configure it, Then no question about launch, internal, or hobby stakes is asked (REQ-1)
- [ ] Given `features.conductorMayMerge` is true, When the review loop finishes clean, Then Sol may still merge (REQ-1)

### Non-behavioral

- [ ] `pnpm prism:build` regenerates all mirrors with no drift after every PR; no mirror and no generated `AGENTS.md` region is hand-edited (REQ-1)
- [ ] Every Tier-1 rule carries an audit verdict after the audit runs (REQ-1)
- [ ] Repo-wide grep for `autonomyPolicy` returns hits only in plans and ADR history after the Sol intake PR (REQ-1)
- [ ] The five checkpoint bullets exist in exactly one place after the compaction PR (REQ-1)

### AC Sync Log

| Date | Agent | Action | Plan | Ticket |
| ---- | ----- | ------ | ---- | ------ |
| 2026-08-02 | Winston | AC created in plan; no tracker ticket exists for this work | ✓ | N/A |

---

## Sessions

- 2026-08-02 [huntermcgrew/context-delivery-mechanism] open: Intent — turn the thrive-port comparison into a plan whose PRs are small, single-concern, and parallel where the build allows; Bounds — write this plan file only, no rule, skill, hook, or mirror edits; Approach — verify every host-hook claim against vendor docs and every PRISM claim against disk before recording it as a Decision

---

## History

- 2026-08-02 [huntermcgrew/context-delivery-mechanism]: Plan created from the thrive-port comparison pass. Records the delivery-tier findings, the two hook designs, the self-measurement audit criterion, and a two-lane parallelism model keyed on the generated `AGENTS.md` Tier-1 block. Companion to `thrive-port.md`, which keeps its original candidate verdicts.
