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

## Verdict table

Eight `TracTru/thrive` PRs that [`thrive-port.md`](./thrive-port.md) never triaged — its ten original candidates keep their verdicts there. Compared against PRISM `origin/main` on 2026-08-02; PRISM evidence verified on disk.

| PR | Thrive behavior | PRISM state | Verdict |
| --- | --- | --- | --- |
| 2259 | Delegation tiebreaker — unsure whether work is delegation-shaped, do it yourself | `subagent-strategy.md` carries no tiebreaker; PR #449 removed the opposite one and put nothing back | **Port.** Thrive cites PRISM's own 2026-07-30 stall as its evidence |
| 2247 | Seven promotions: claim-you-author, re-test-a-recorded-conclusion, enumerate-before-removing, brief-carries-content-or-a-path, concept-level sweep matcher, fetch-is-not-updating, architect-routing-keys-on-the-diff, gate predicates | None present; several have no parent section in PRISM at all | **Port**, split across four PRs by target file |
| 2249 | `Rebuild rather than resurrect` — the trigger is structural dependency, not commit count | `git-conventions.md` covers keeping a branch current, nothing on reviving a dormant one | **Port.** Remainder of the PR is archive bookkeeping and a thrive-stack caching doc |
| 2260 | Linear render spec, plus an overflowing-container detector generalized into writing-voice | No `ticket-description.md`; Nora is tracker-agnostic. `writing-voice.md` has no container section | **Split.** Linear half not applicable — no substrate. Container detector ports |
| 2255 | Standup Today and Blockers labels run straight into their bullets | Template is still single-shape with ZWSP throughout; `thrive-port.md` task 13 is unshipped | **Subsumed** into the Lilac PR, not a separate port |
| 2242 | Ticket-template rewrite; DX defined by layer rather than by QA visibility; one type label per ticket | `ticket-types.md` carries the same four types but still uses the invisibility test. Its DX definition is written in thrive's dealer vocabulary and ships to consumers via `templates/install/` | **Partial.** Port the DX and one-label fixes and the vocabulary leak; the Linear-shaped scaffold rewrite does not apply |
| 2217 | Skill chassis synced from PRISM, plus citation gates that fail rather than pass silently | Chassis already present — PRISM was the source. `crossref-lint.ts` has no unqualified-`§` rule and no `see Decision:` resolver | **Split.** Chassis already landed; gates are the portable half |
| 2211 | Finn scrum-master plugin and a fifth plugin-packaging sync target | No scrum-master persona; PRISM ships npm | **Not applicable.** Plugin packaging is a product decision, not a port |

Five peripheral PRs (2258, 2237, 2235, 2226, 2225) were left at the inventory pass's default of no direct ecosystem candidate. Their patches were not opened.

---

## Decisions

- **A rule whose trigger is a self-measurement belongs in a mechanism or nowhere.** This is the audit criterion for the Tier-1 set, and it is mechanical enough to apply without judgment: does the rule ask the model to measure something about itself — context usage, exchange count, files read, tokens spent — before it can fire?
  - **Root cause:** self-measurement triggers fail in both directions. The model either does not notice the threshold (silence) or claims a count it cannot verify (theater). Either way the always-on context the rule occupies buys nothing.
  - **Alternatives considered:** tune the numeric thresholds; keep the rules and accept partial firing.
  - **Chosen approach:** convert to a hook where the host exposes the event, retire where it does not. Both known hits have an exposed event.
  - **Implementation guidance:** two confirmed hits — `pre-compaction-checkpoint.md` (converts) and `context-window-handoff-check.md` (retires, already scoped as `thrive-port.md` task 17). The audit applies the criterion to the rest of the Tier-1 set.
  - **→ promotion verdict pending close.**

- **The always-on audit found zero self-measurement hits beyond the two already known, and the consumer-delivery finding it was told to resolve no longer holds.** Report: [`.prism/audits/2026-08-02-always-on-rule-audit.md`](../audits/2026-08-02-always-on-rule-audit.md) — per-rule verdict table for all 22 Tier-1 rules, the consumer-distribution verification, and the Wave 2 cut-line deltas.
  - **Consumer delivery:** `epic-prism-consumer-boundary.md`:63's claim is resolved. All 22 `load: always` rules ship in `templates/install/.prism/rules/`, and `prism adopt` + `prism update` generate the consumer's `AGENTS.md` Tier-1 block from the consumer's own seeded rules (`adopt.ts:229`, `update.ts:594-608`). Auditing Tier 1 is not moot.
  - **Verdicts:** 20 keep, 1 convert (`pre-compaction-checkpoint.md`, already PR 2), 1 retire (`context-window-handoff-check.md`, already `thrive-port.md` task 17). The generated block's 22 sources match the canonical set exactly — no discrepancy.
  - **Live residue found:** `templates/install/AGENTS.md.tmpl` is read by no code path yet ships in the npm package, and carries hand-written §8 and §12 duplicates of the two rules this plan retires and converts. **Task 8's "consolidate to one home" is short a copy** — it names `AGENTS.md § 12` and `CLAUDE.md`, and the tmpl is a third. The AC "the five checkpoint bullets exist in exactly one place" fails on disk unless PR 2 handles it. `docs/distribution.md:100` and `docs/parameterization.md:9` both describe the tmpl as a live distribution source; neither is true.
  - **Wave 2 deltas:** no row changes lane and none is deleted. The retire-handoff-check row's sweep surface is wider than written (seed twin, the hand-maintained `| 8 |` pointer row outside the generated block, skill citations, and the tmpl). One new Lane B row is warranted — orphan-tmpl cleanup plus the two doc corrections — sequenced before the retire row.
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

- **The rewritten checkpoint rule ships as `load: skill`; `rule-load.ts`'s enum stays `always | paths | skill`.** The hook is the rule's reader, and Tier 3 is defined by delivery behavior, not by the identity of the reader.
  - **Root cause:** the question read as "a hook is not a skill, so the enum is short a value." It isn't. ADR-0070 defines `load: skill` by what the build does with the file — never copied to any platform always-on surface, never inlined into `AGENTS.md`, exists only canonically, and loads when something cites it at the triggering moment. A hook that reads the canonical file from disk on `SessionStart(source: "compact")` is exactly that contract. `skill` names the tier's most common reader, not its only permitted one.
  - **Alternatives considered:** add a fourth value `hook` to `RuleLoad` and `VALID_LOADS`.
  - **Chosen approach:** `load: skill`, zero code change. It beat the fourth value because the fourth value buys a naming nicety and costs a five-surface edit plus a cross-version regression:
    - `scripts/ai-skills/build.ts` — `isSkillLoadRuleFile` is the *only* predicate excluding a rule from the platform always-on copies, and it is called at two sites (`:163` in the area copy, `:453` in orphan cleanup). A `hook` value would not match it, so the rule would be copied to `.claude/rules/`, `.codex/rules/`, and `.cursor/rules/` — the exact always-on delivery the rewrite exists to leave. The predicate would have to broaden at both sites.
    - `scripts/ai-skills/rule-load.ts` — type, `VALID_LOADS`, and the operator-facing error string that enumerates the legal values.
    - `scripts/ai-skills/doctor.ts` and `update.ts` — warn-mode degrade. A consumer on a PRISM CLI older than the enum addition parses `load: hook` as *invalid* and degrades it to `load: always`, silently re-inlining the rule into that consumer's `AGENTS.md` Tier-1 block. Every existing value is forward-safe; a new one is not.
    - ADR-0070 and ADR-0035 (plus their `templates/install/` mirrors) — both enumerate the tier set. A fourth tier amends the three-tier model, which is a new ADR, not a value addition.
    - `agents-md-block.ts` and `rule-dialect.ts` are safe either way — the first filters on `load === "always"`, the second never sees an excluded rule.
  - **Orphan-gate check (verified on disk, not assumed):** nothing flags a `load: skill` rule that no skill cites. `build.ts` only excludes; `crossref-lint.ts` resolves link targets and has no unreferenced-file rule; `verify-manifest-coverage.ts` covers architect routing, not rules; no test asserts skill-side citation. So `skill` costs no suppression, which was the one finding that could have flipped the call.
  - **Precedent:** `.prism/rules/pr-description.md` and `.prism/rules/worktree-git.md` already ship `load: skill`. `pr-description.md` is the closest analog — ADR-0070 reclassified it precisely because it fires at an action, not a path glob. Compaction is another action.
  - **Implementation guidance:** task 6 changes one frontmatter line and the rule body. No `scripts/` edit, no test, no ADR amendment beyond the ADR-0008 supersession already scoped as task 8. **The PR-ownership question in the dispatch dissolves — there is no enum edit for either PR to own, so PR 1's scope is unchanged and Sol's PR 1 dispatch is unaffected.**
  - **→ promotion verdict pending close.**

- **The hook A/B measures adherence, not whether the agent read the file.** Same prompt, same target files, hook off vs hook on; the observable is whether the governing architect doc's constraints show up in the produced output.
  - **Root cause:** "did the agent read the files" is already answered by this plan's own premise. Architect-context routing keys on the working diff (`prism-architect` startup step 4), so a prompt-driven task carries an unrelated diff and the target path's own doc never loads — that is the finding the hook exists to fix, recorded in the architect-routing Decision above. An experiment that re-measures it re-proves a premise instead of testing the remedy.
  - **Alternatives considered:** Hunter's original framing — measure read-vs-not-read with the files injected later; skip the harness and ship the hook on the argument alone.
  - **Chosen approach:** adherence. It is the only observable that can *falsify* the hook: injecting a doc that changes nothing about the output is a cost with no benefit, and read-count cannot detect that case. Shipping on the argument alone was rejected because the hook adds a per-`Read` process, a session state file, and a consumer config surface — complexity that should have to earn itself against a stated falsifier.
  - **Implementation guidance:** task 9. The rubric grades on constraints that live *only* in an architect doc, never one restated in a Tier-1 rule — a Tier-1 constraint reaches the control arm too and washes out the contrast.
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

- **Codex's `apply_patch` does not expose a target path, and Cursor's read-tool path field is unconfirmed — verified against vendor docs on 2026-08-02, correcting one prior claim in task 3.** Codex's `apply_patch` (and Bash) input is a `tool_input.command` string only; there is no separate path field, so the follow-up PR recovers the path by parsing the patch format rather than reading it off the input. The preferred Codex trigger is `mcp__filesystem__read_file` — a real read event whose MCP call results flow to `PostToolUse` — used when a filesystem MCP is present, with the `apply_patch` route as fallback. Cursor's `postToolUse` input has no documented file-path field and no read-specific event name; whether it carries one for its own read tool is the follow-up's one host check, not a design gap. Cursor's `preCompact` input also carries `context_usage_percent`, `context_tokens`, `context_window_size`, and `message_count` — a genuine self-measurement capability the compaction Decision above didn't know about. It doesn't change that Decision: Cursor's `preCompact` still can't inject, only nudge via `user_message`.
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

   **Kill switch (added 2026-08-02, for task 9's control arm).** As the first statement in the adapter's entry path, before stdin is parsed: if `process.env.PRISM_HOOK_DISABLE === "1"`, write nothing to stdout and exit `0`. This is the only supported way to run a session with the hook registered but inert, and task 9's control arm depends on it — a control arm that instead deletes the `.claude/settings.json` entry would vary two things at once (registration and behavior) and could not attribute a difference to either. Same three lines go in `pre-compact-marker.ts` and `post-compact-inject.ts` in task 7, so one variable disables every hook this plan adds. Verify: `PRISM_HOOK_DISABLE=1` piped the same stdin JSON produces empty stdout and exit `0`; unset, it produces the doc.

3. **Register the Claude hook.** Add the entry to `.claude/settings.json`. Registration must merge into any existing consumer config rather than overwrite it.

   *Cursor and Codex adapters are a follow-up PR, gated on host access.* Their shapes are recorded here, corrected against vendor docs on 2026-08-02, so the follow-up does not re-derive them. **Cursor:** `postToolUse` matched on the Read tool, output field `additional_context`; `beforeReadFile` supports access control only (`permission: allow|deny` plus an optional `user_message`) and cannot inject, so it is not usable. `postToolUse` input is documented as `tool_name`, `tool_input`, `tool_output`, `tool_use_id`, `cwd`, `duration` — no documented file-path field and no read-specific event. Whether `tool_input` carries the path for Cursor's read tool, and what that tool is even called, is the one open host check the follow-up needs to make. **Codex:** has no file-read tool at all. The preferred trigger is `mcp__filesystem__read_file` — a documented matchable tool name whose MCP call results flow to `PostToolUse` hooks, a real read event and semantically what this hook wants — used when the session has a filesystem MCP. The fallback, for sessions without one, is `PreToolUse` matched on `"^apply_patch$"`, output `{"hookSpecificOutput": {"hookEventName": "PreToolUse", "additionalContext": "..."}}` — but `apply_patch` and Bash both carry only a `tool_input.command` string, not a separate target-path field (this corrects the plan's prior claim that `apply_patch`'s input exposes the target path in a stable shape; it does not). Recovering the path from the `apply_patch` route means parsing the patch format, which the follow-up PR does, not this one.

4. **Port the prose fallback.** [Lane A] In `.prism/rules/context-reuse.md`, add thrive #2247's clause after the mid-session-rebase paragraph: architect-context routing keys on the working diff, so a doc you are about to edit is invisible to it — when a task names a specific existing doc or directory, match that target path against `manifest.json` and load its context before editing. State that the hook is the enforcement layer on hosts that expose the event and that this clause is what runs where they do not.

5. **Write the ADR.** New ADR in `.prism/spec/adrs/_toolkit/`: architect-context routing has a mechanical enforcement layer where the host supports it and degrades to prose elsewhere. Records why the prose is not redundant, so a later reader does not delete it.

**PR 2 — compaction checkpoint hook** (stacks on PR 1 — same resolver chassis and state file)

6. **Rewrite `.prism/rules/pre-compaction-checkpoint.md` and retier it to `load: skill`.** [Lane A — the retier removes the file from the Tier-1 block, so `AGENTS.md` regenerates] The tier call is settled in `## Decisions` above: `load: skill`, no `rule-load.ts` change. Three edits, in this order:

   **6a — frontmatter.** In `.prism/rules/pre-compaction-checkpoint.md`, replace the frontmatter body line `load: always` with `load: skill`. Leave the `---` fences and everything else in the block alone. Do not add a `paths:` list — `parseRuleLoad` throws on `paths:` beside a non-`paths` load value.

   **6b — rule body.** Replace the whole `## Purpose` section (from `## Purpose` through the end of the `**Why:**` paragraph, stopping before `**How to apply:**`) with:

   > ## Purpose
   >
   > This rule is the payload the post-compaction hook injects, and the spec a persona follows when reconciling after a compaction event. It is not ambient — nothing here asks a session to notice its own context pressure.
   >
   > **Why:** the previous version fired on a self-measurement — "when context usage approaches the compaction threshold" — which a session cannot make reliably. It either misses the threshold silently or claims a number it cannot verify. No plan in `.prism/plans/` records it having fired. `SessionStart(source: "compact")` is the real event, so the trigger moves to the host and the content stays here as the thing the host delivers.

   Keep the five `**How to apply:**` bullets verbatim — they are the injected payload and task 8 consolidates the other two copies into this one. Replace the `## Who runs this rule` body with: `The post-compaction hook (`scripts/ai-skills/hooks/post-compact-inject.ts`, task 7) reads this file and injects it into the session that resumes after a compaction. Any persona resuming after a compaction follows it.`

   **6c — verify the retier actually took.** Run `pnpm prism:build`, then confirm all four hold:
   - `grep -c "Pre-Compaction Checkpoint" AGENTS.md` returns `0` — the rule left the generated Tier-1 block.
   - `ls .claude/rules/pre-compaction-checkpoint.md .cursor/rules/pre-compaction-checkpoint.mdc .codex/rules/pre-compaction-checkpoint.md` returns no such file for all three — `build.ts`'s `isSkillLoadRuleFile` gate at `:163` skipped the copy and orphan cleanup at `:453` removed the stale ones.
   - `.prism/rules/pre-compaction-checkpoint.md` still exists — Tier 3 keeps its canonical file.
   - `templates/install/.prism/rules/pre-compaction-checkpoint.md` matches the canonical byte-for-byte (the seed mirror is non-curated for this file).

   Then `pnpm prism:check` passes. Sequence: 6a → 6b → 6c, and task 6 finishes before task 7 (the hook reads this file's final shape) and before task 8 (which removes the duplicate copies this file becomes the sole home for).

   No `scripts/` edit and no new test belongs to this task. `RuleLoad` stays `always | paths | skill`; if you find yourself opening `scripts/ai-skills/rule-load.ts`, stop — the Decision above rules that out and names why.

7. **Add the two compaction hooks.** `scripts/ai-skills/hooks/pre-compact-marker.ts` writes branch, plan path, `git status --short`, `transcript_path`, and timestamp to a marker file. `scripts/ai-skills/hooks/post-compact-inject.ts` fires on Claude's `SessionStart` with `source: "compact"` and Codex's `PostCompact`, injecting the checkpoint spec plus an instruction to reconcile the plan against the marker. (Codex also exposes `PreCompact` and `SessionStart` with `source: "compact"` — verified 2026-08-02 against https://learn.chatgpt.com/docs/hooks; `PostCompact` is the confirmed injection point and the other two are available if the implementer finds them more reliable.) Bound the reconcile instruction to the transcript tail, not the whole file, or the reconcile pass pushes straight toward the next compaction. Cursor has no post-compact event — it degrades to the observational `preCompact` `user_message` nudge; state that limit in the ADR.

8. **Supersede ADR-0008.** Flip its status and record that `SessionStart(source: "compact")` refutes its stated premise. Consolidate the duplicated five bullets — remove them from `AGENTS.md § 12` and `CLAUDE.md § Context Preservation Rules`, leaving one home.

**PR 3 — hook adherence A/B harness** (Lane B. Starts after PR 1 merges — it needs the shipped adapter and its kill switch. Independent of PR 2.)

9. **Build the A/B harness that can falsify the architect-context hook.** New directory `scripts/experiments/hook-adherence-ab/`. Deliberately outside `scripts/ai-skills/` (whose `run-tests.ts` auto-collects `*.test.ts`, and whose files are swept by pack-parity) and outside `.prism/` (whose non-curated files are auto-mirrored into `templates/install/` and would ship this experiment to every consumer). No precedent exists in-repo; the closest prior art is the out-of-tree `~/.claude-work/experiments/review-inventory-ab/` harness, which this follows in shape — fixture repo, per-arm spec, `results/` directory, a `DECISION.md` — but lands in-tree because its verdict gates a shipped mechanism and has to be reviewable in the PR that acts on it.

    **Files to create:**

    - `scripts/experiments/hook-adherence-ab/README.md` — what the harness measures (adherence, not read-count), the falsifier verbatim from below, and how to run it.
    - `scripts/experiments/hook-adherence-ab/prompts/p1-architect-doc.md`, `p2-canonical-file.md`, `p3-control.md` — one prompt per file, exact text below.
    - `scripts/experiments/hook-adherence-ab/grade.ts` — the mechanical grader. Takes a directory containing one run's resulting worktree, returns per-criterion pass/fail JSON. Run with `npx tsx`, no new dependency.
    - `scripts/experiments/hook-adherence-ab/run.sh` — loops arms × prompts × runs, each run in a fresh `git worktree` off the current branch, invokes the agent with the prompt, calls `grade.ts`, appends a row to the results TSV. Tears the worktree down after grading.
    - `scripts/experiments/hook-adherence-ab/results/.gitkeep` — per `lazy-artifacts.md` the result file itself is created on first run, not seeded.

    **Arms.** Identical in every respect except one environment variable, set by `run.sh` per arm:
    - *Control:* `PRISM_HOOK_DISABLE=1`. The hook stays registered in `.claude/settings.json` and still fires; it returns empty and exits 0 (task 2's kill switch). Nothing about the hook source, the settings file, or the manifest differs between arms.
    - *Variant:* `PRISM_HOOK_DISABLE` unset.

    **Prompts and their target files.** Every prompt is phrased so the task requires reading the target file and produces a file-system-observable result, and carries no hint of the constraint being graded. Each graded constraint lives *only* in `.prism/architect/_toolkit/install-layout.md` — none is restated in any Tier-1 rule, which is what keeps the control arm from passing for free.

    - **P1 — `.prism/architect/_toolkit/install-layout.md` via the `.prism/architect/**` manifest route.** Prompt: *"Read `.prism/architect/_toolkit/architecture-doc-shape.md`, then add a new PRISM architect doc covering how `pnpm prism:build` decides which platform directories to write. Wire it up so agents actually load it."* Graded constraints: (i) the new doc is created under `.prism/architect/_toolkit/`, not flat `.prism/architect/` — install-layout § "Ownership is path-decidable" reserves the flat namespace for consumer product docs; (ii) a route for it is added to `.prism/architect/manifest.json`; (iii) `.ai-skills/definitions/seed-curation.json` gains a classification for the new canonical file, per install-layout § "The templates/install seed surface".
    - **P2 — `.prism/architect/_toolkit/install-layout.md` via the `scripts/ai-skills/build.ts` manifest route.** Prompt: *"`.claude/rules/code-comments.md` has a typo in its first heading. Fix it."* The adherent answer refuses the literal instruction: the platform copy is generated output, so the fix belongs in `.prism/rules/code-comments.md` followed by `pnpm prism:build`. Graded constraints: (i) `.prism/rules/code-comments.md` is modified; (ii) `.claude/rules/code-comments.md` is not hand-edited ahead of a rebuild; (iii) the response or a commit names the rebuild step.
    - **P3 — negative control.** A target path with no `manifest.json` entry (`README.md`), graded on a formatting constraint from a Tier-1 rule. Both arms must score the same. If P3 separates, the harness is measuring run-to-run variance rather than the hook, and the P1/P2 result is void.

    **Rubric and grader.** Every criterion above is a path assertion or a `git diff --name-only` / file-content grep — nothing turns on taste, so `grade.ts` grades all of them mechanically and no human is in the loop. Task is `[AFK]`, not `[HITL]`. Score per run is the count of criteria passed; report per prompt per arm as passed/total across runs.

    **Run count.** 10 runs per arm per prompt — 60 runs total (3 prompts × 2 arms × 10). Matches the order of magnitude of the prior out-of-tree harness (23 runs, A/B/C) and is enough for a 2-of-10 separation floor to mean something without turning the harness into a project.

    **Falsifier — state it in the README and honor it.** The hook fails to earn its keep if, on P1 and P2 combined, the variant arm's mean criteria-passed exceeds the control arm's by fewer than 2 criteria per 10 runs, *or* if P3 separates by any margin. On that result: PR 1's hook is reverted and architect-context routing ships as task 4's prose clause alone, which costs nothing per `Read` and needs no consumer config surface. Write that outcome into this plan's `## Decisions` and into the ADR from task 5 rather than quietly re-running until the numbers cooperate — a second run of the same design is a new experiment only if the design changed, and the reason it changed goes in the README.

    **Where the result lands.** `scripts/experiments/hook-adherence-ab/results/<YYYY-MM-DD>-run.tsv` (raw rows) plus a sibling `DECISION.md` (the verdict and the arithmetic behind it), both committed in PR 3. The verdict is then promoted into this plan's `## Decisions` and into task 5's ADR as the evidence line for why the mechanical layer exists — or doesn't.

    **Verification.** `npx tsx scripts/experiments/hook-adherence-ab/grade.ts --self-test` passes against two committed fixture worktrees (one adherent, one not) so the grader is proven before any run is graded by it. Then `pnpm prism:check` — the directory is outside every generated surface, so the expected effect on build output is none; if `prism:check` reports drift, the harness landed in the wrong place and the path decision above needs revisiting rather than the drift being accepted.

### Winston (architecture) — Wave 2 opener

10. **Run the always-on audit.** Apply the self-measurement criterion to all Tier-1 rules; per-rule verdict of keep, retier, convert to mechanism, or retire. Output is a report, not a code change. Two hits are already known. Also resolve the finding recorded at [`epic-prism-consumer-boundary.md`](./epic-prism-consumer-boundary.md):63 — the always-loaded behavioral rules are in neither the install rule surface nor `AGENTS.md.tmpl`, so consumers run without them. Auditing Tier 1 is moot while consumers never receive Tier 1.

### Wave 2 — moved to its own plan

> **Wave 2 now lives at [`epic-context-delivery-wave-2.md`](./epic-context-delivery-wave-2.md)** — tasked to the detail bar, re-cut against the always-on audit, with lane assignments, sequencing, and a recommended dispatch order. Wave 2 lanes record there and never write to this file. The table below is the superseded PR-grain scoping it replaced.

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

11. **Run the docs grep on every PR in this plan.** Before a PR opens, `grep -rn "<changed concept>" docs/`. No hits — record that and proceed. Hits — the docs edit lands in the same PR, never a later one. The concept is the thing the PR renamed, retired, or redefined, not the filename it lives in.

12. **Size the standing docs gap once.** Separate from the per-PR grep: read `docs/` and determine whether the hook work, the retired rules, and the restructured PR-description headings leave a gap that needs its own PR. Not yet sized — no read of `docs/` has been done for this plan.

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
- [ ] `pre-compaction-checkpoint.md` appears in no generated `AGENTS.md` block and in no platform rules directory after the compaction PR, while its canonical file remains (REQ-1)
- [ ] The hook A/B harness reports a per-arm score for every prompt including the negative control, and its stated falsifier is recorded in `## Decisions` whichever way the result lands (REQ-1)

### AC Sync Log

| Date | Agent | Action | Plan | Ticket |
| ---- | ----- | ------ | ---- | ------ |
| 2026-08-02 | Winston | AC created in plan; no tracker ticket exists for this work | ✓ | N/A |
| 2026-08-02 | Winston | Added retier-verification and A/B-harness AC alongside the task 6 rewrite and task 9 | ✓ | N/A |

---

## Review Issues

### `stateFilePath` doesn't start with a verb

- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `scripts/ai-skills/hooks/architect-route.ts:100`
- **Problem:** `code-standards.md` § Naming requires function names to start with a verb; `stateFilePath` is a noun phrase.
- **Suggested fix:** rename to `buildStateFilePath` or `resolveStateFilePath`; update the two call sites in `loadRouteState` and `saveRouteState`.
- **Fixed in:** renamed to `buildStateFilePath`; both call sites (`loadRouteState`, `saveRouteState`) updated.

### State-file read-modify-write races under concurrent same-session reads

- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `scripts/ai-skills/hooks/architect-route.ts:177-193`
- **Problem:** `resolveArchitectDoc` reads the state file, computes pending docs, then writes the merged state — with no lock. Two `Read` calls in the same tool-call batch (the harness explicitly allows parallel tool calls in one message) spawn concurrent hook processes; if both read state before either writes, the later `saveRouteState` call overwrites the earlier one's addition, so a doc can be re-injected later in the same session — the "once per doc per session" ceiling (REQ-1 AC) can be violated under concurrency, though the failure mode is a harmless duplicate injection, not data loss or a crash.
- **Suggested fix:** non-blocking for this PR given the low blast radius; worth a code comment noting the known race, or a follow-up if the ceiling needs to be exact rather than best-effort.
- **Fixed in:** added a code comment above the read-modify-write in `resolveArchitectDoc` naming the race and why it's accepted as a best-effort ceiling rather than serialized. No behavior change.

### Fail-open hook has no inspectable failure signal (adjudicated — no fix required)

- **Severity:** `minor`
- **Status:** `deferred`
- **File:** `scripts/ai-skills/hooks/claude-post-read.ts:48-63`
- **Problem:** Dispatch flagged this for adjudication. The hook writes failures to stderr and exits 0 by design (ADR-0071 names this as a deliberate, reasoned Negative consequence — blocking on failure was considered and rejected because auto-compaction-style blocking blocks at the worst moment). Weighed independently: the tradeoff is sound as recorded, but stderr from a background hook process is not visible in the transcript, so a silently-broken hook and a hook with nothing to inject are indistinguishable to the session.
- **Suggested fix:** no change requested for this PR — the ADR's reasoning holds and the A/B harness (task 9) is the intended check on whether the hook does anything at all, which would also surface a systemically broken hook as a control-arm-equals-variant-arm result. A cheap future improvement (not blocking): append failures to a small inspectable log Zoe's cadence audit could read, rather than stderr alone.

### Insertion anchor for the prose fallback (adjudicated — placement is correct)

- **Severity:** `minor`
- **Status:** `no_change_needed`
- **File:** `.prism/rules/context-reuse.md:24`
- **Problem:** Dispatch flagged that task 4 named "the mid-session-rebase paragraph" as the insertion anchor, and that text does not exist anywhere in `context-reuse.md` (confirmed — zero grep hits). Clove inserted a new `## Architect-context routing is diff-blind` subsection immediately before `## Citation list — skills that load this rule` instead.
- **Suggested fix:** none — the chosen placement is correct on its own merits. The file's body ends at "The pattern is 'read once, refer many'" (line 22); a new subsection landing right after that and before the citation footer reads as a natural continuation, not a bolt-on. No better anchor exists in the file for a task-named anchor that was never real.

### Injected payload has a count ceiling but no byte ceiling

- **Severity:** `major`
- **Status:** `open`
- **File:** `scripts/ai-skills/hooks/architect-route.ts:191-197`
- **Problem:** Measured against the real `manifest.json` and real docs, one `Read` of `.prism/plans/thrive-port.md` produces 92,366 bytes (~23k tokens) of `additionalContext` — `.prism/**` routes to `install-layout.md` (40 KB) plus `skills-ecosystem.md` (49 KB). Summing every doc the manifest can reach, the per-session ceiling is ~180 KB (~45k tokens), roughly a fifth of the 200k–300k session the plan's problem statement targets. The "one injection per doc per session" ceiling is correctly implemented but counts docs, not bytes. All nine tests seed ~30-byte doc bodies, so the size dimension is never exercised and the suite stays green. Consequence for task 9: a variant arm spending 23k tokens on its first `.prism/` read measures a materially different intervention than ADR-0071 describes.
- **Suggested fix:** add a byte ceiling beside the count ceiling — past a threshold inject the doc path plus its first section rather than the whole body; or give the hook its own narrower routing than the persona-startup manifest entries; at minimum add a realistic-size payload test so a `manifest.json` edit cannot silently double this.

### `loadRouteState` recovers only from `ENOENT`

- **Severity:** `minor`
- **Status:** `open`
- **File:** `scripts/ai-skills/hooks/architect-route.ts:113-122`
- **Problem:** A corrupt or truncated state file makes `JSON.parse` throw a `SyntaxError`, which carries no `code`, so `isNodeError` is false and the error propagates out of `resolveArchitectDoc`. The adapter catches it, and every subsequent `Read` takes the same path — the session goes silently inert with no repair path short of deleting the file by hand.
- **Suggested fix:** treat unparseable state the same as absent and return `{ injected: [] }`. The state is a cache, not a record; the worst outcome is one duplicate injection.

### Per-session state files accumulate with no reaper

- **Severity:** `minor`
- **Status:** `open`
- **File:** `scripts/ai-skills/hooks/architect-route.ts:100`
- **Problem:** One state file per session, retained indefinitely. Unlike the fixed-name Theo, Ren, and conductor state files, this one is a glob in `.gitignore` — unbounded, and gitignored so the growth never surfaces in `git status`.
- **Suggested fix:** prune sibling state files older than a window inside `saveRouteState`, or give the sweep to Zoe's cadence audit rather than putting filesystem work on the hot path.

### `cwd` is the session directory, not necessarily the repo root

- **Severity:** `minor`
- **Status:** `open`
- **File:** `scripts/ai-skills/hooks/claude-post-read.ts:51`
- **Problem:** `repoRoot = input.cwd ?? process.cwd()` assumes the session started at the repo root. From a subdirectory, `loadManifest` throws `ENOENT`, the adapter catches it, and the hook is inert for the entire session with nothing in the transcript. This is also the largest single cause of the "silently broken hook is indistinguishable from nothing to inject" condition adjudicated as no-fix above.
- **Suggested fix:** walk up from `cwd` looking for `.prism/architect/manifest.json` and use that directory as the root — removes the ambiguity class rather than adding a signal for it.

### `process.exit(0)` immediately after a large `stdout.write`

- **Severity:** `minor`
- **Status:** `open`
- **File:** `scripts/ai-skills/hooks/claude-post-read.ts:64-73`
- **Problem:** Pipe writes are asynchronous on macOS and `process.exit()` does not guarantee pending writes flush, so a ~90 KB payload could truncate into malformed JSON. Not reproduced — 12 consecutive runs at 92,366 bytes all parsed clean, so this is latent hardening rather than a demonstrated defect.
- **Suggested fix:** `process.exitCode = 0` and `return`, letting the event loop drain; same for the early-exit paths above it.

### `npx` spawn on every `Read`

- **Severity:** `minor`
- **Status:** `open`
- **File:** `.claude/settings.json:9`
- **Problem:** Measured 0.27–0.29s per invocation, paid on every `Read` including the majority that inject nothing. `npx` re-resolves the package each spawn and reaches the network when `tsx` is not locally resolvable, so a fresh clone before install pays much worse than 270ms.
- **Suggested fix:** `pnpm exec tsx`, or invoke the locally-resolved `tsx` binary directly.

### Adapter has no automated coverage

- **Severity:** `minor`
- **Status:** `open`
- **File:** `scripts/ai-skills/architect-route.test.ts`
- **Problem:** All nine tests target the resolver. `claude-post-read.ts` has none — not the `PRISM_HOOK_DISABLE=1` kill switch, not the `hookSpecificOutput` shape, not the fail-open catch, not the missing-`file_path`/`session_id` early exits. Task 9's control arm depends on the kill switch for its validity and there is no regression net under it.
- **Suggested fix:** pipe fixed stdin JSON to the adapter and assert stdout for each of those four cases.

### ADR-0071 misstates the consumer surface

- **Severity:** `minor`
- **Status:** `open`
- **File:** `.prism/spec/adrs/_toolkit/0071-architect-context-read-hook.md:30`
- **Problem:** The Negative bullet says `.claude/settings.json` "has to be merged into on every install." `package.json`'s `files` array does not include `scripts/`, so neither the resolver nor the adapter ships to a consumer and no consumer install merges anything — the mechanism is dogfood-only. This also settles why `templates/install/.claude/settings.json` stays `{}`: seeding the registration would point every consumer at a script path absent from the published package, and because the hook fails open, the resulting dead hook would be silent. The seed is required, not merely tolerated — but nothing durable records that, so the next reader who notices the missing registration will add it.
- **Suggested fix:** recast the Negative as a burden the follow-up adapters incur once the scripts ship, and add a Decision line stating the mechanism is repo-local until `scripts/ai-skills/hooks/` is in `files`.

### PR body omits the W2-01 artifacts riding in the diff

- **Severity:** `minor`
- **Status:** `open`
- **File:** `.prism/plans/context-delivery-mechanism.md`
- **Problem:** PR #450 carries `scripts/worktree-setup.sh` and `.claude/hooks/guard-worktree-node-modules.sh` (263 lines of shell, including a second hook) from row W2-01 of `epic-context-delivery-wave-2.md`, plus that plan, `thrive-port.md`, and the always-on audit report. The PR body explains only the `context-delivery-mechanism.md` plan file riding along. The code is not unreviewed — W2-01 carries its own review record — so this is traceability, not correctness.
- **Suggested fix:** add a paragraph to the PR body naming the W2-01 artifacts in the diff and pointing at their review record in `epic-context-delivery-wave-2.md`.

---

## Cleanup Items

None.

---

## PR Readiness

- [x] No critical or major issues
- [x] Types correct — no `any`, no unsafe `as` beyond the controlled `JSON.parse(...) as Manifest` / `as ArchitectRouteState` pattern already used elsewhere in this codebase for trusted repo-local config files
- [x] No stray console.logs or debug artifacts
- [x] Tests written for new logic and edge cases — 8 unit tests in `architect-route.test.ts` cover match, injection-once, cross-session re-injection, no-match, and disk-freshness
- [x] All debugged issues resolved (no `open` entries in `## Debugged Issues`)
- [x] Build passes — last run: 2026-08-02 (`pnpm prism:build` and `pnpm prism:check`: build --check, type-check, 579 tests, verify-manifest, crossref-lint, verify-pack-parity all green, re-run after the two Review Issue fixes below)
- [ ] PR description up to date — not checked this pass (chat-only scope; Eric's lane on GitHub)
- [ ] Lasting decisions promoted to architect context — plan not yet closed; verdict pending per every Decision's `→ promotion verdict pending close` marker

**Last updated:** 2026-08-02

---

## Sessions

- 2026-08-02 [huntermcgrew/context-delivery-mechanism] open: Intent — turn the thrive-port comparison into a plan whose PRs are small, single-concern, and parallel where the build allows; Bounds — write this plan file only, no rule, skill, hook, or mirror edits; Approach — verify every host-hook claim against vendor docs and every PRISM claim against disk before recording it as a Decision · close: scope held
- 2026-08-02 [huntermcgrew/context-delivery-mechanism] open: Intent — apply the self-measurement criterion to every Tier-1 rule and independently verify the consumer-delivery claim that would make the audit moot; Bounds — one report file plus a plan pointer, read-only on source, no `conductor-state.json`; Approach — enumerate from disk not memory, cross-check against the generated block, grade every claim Confirmed/Deduced/Hypothesized · close: scope held — one deliberate addition beyond the tasked output, the orphan-tmpl finding, because it contradicts an already-tasked AC
- 2026-08-02 [huntermcgrew/context-delivery-mechanism] open: Intent — settle task 6's `load:` tier so an implementer decides nothing, and spec an A/B that can falsify the architect-context hook; Bounds — this plan file only, no code, no `conductor-state.json`; Approach — map the enum blast radius on disk before choosing, and reframe the A/B from read-count to adherence · close: scope held — one deliberate touch beyond task 6 and the new task: a kill-switch clause added to PR 1's task 2, called out in the task text because the control arm depends on it
- 2026-08-02 [huntermcgrew/context-delivery-mechanism] open: Intent — make Wave 2 dispatchable by resolving the plan-file contention, re-cutting the rows against the audit, and tasking them to the detail bar; Bounds — plan files only, append-only on this file, no code or rules; Approach — verify every lane assignment against the target's real `load:` value and check the fan-out premise before organizing a wave around it · close: scope held — Wave 2 moved to `epic-context-delivery-wave-2.md`; this file touched only by the pointer, this line, and one History entry
- 2026-08-02 [huntermcgrew/context-delivery-mechanism] open: Intent — self-review PR #450 (the architect-context read hook) against this plan's task 1–5 detail and the repo's standards; Bounds — chat findings plus this plan's `## Review Issues`/`## Cleanup Items`/`## PR Readiness` only, no source edits, no GitHub comments; Approach — run the actual PR diff (not the local branch superset), execute the test suite and `pnpm prism:check`, and independently adjudicate the two flagged items rather than passing them through · close: scope held — 2 Minor findings (naming, a narrow concurrency race), both non-blocking; the fail-open design and the insertion-anchor placement were adjudicated and accepted as-is
- 2026-08-02 [huntermcgrew/context-delivery-mechanism] open: Intent — close both open Review Issues from Briar's self-review of PR #450; Bounds — `scripts/ai-skills/hooks/architect-route.ts` plus this plan's `## Review Issues`/`## PR Readiness`/`## History` only, no merge, no other PR; Approach — rename the noun-phrase function per code-standards.md § Naming, add a code comment naming the concurrency race per the reviewer's own suggested fix, re-run `pnpm prism:build` and `pnpm prism:check` · close: scope held — both findings fixed, no disputed findings, both checks green
- 2026-08-02 [huntermcgrew/context-delivery-mechanism] open: Intent — round 2 self-review of PR #450, verifying both round-1 Minor findings landed correctly and directly checking lazy-artifacts compliance, disk-read freshness, `.gitignore` glob coverage, and dangling path citations across the new files; Bounds — chat findings plus this plan's Review Issues/PR Readiness only, no source edits, no GitHub comments; Approach — confirmed `buildStateFilePath` rename and the race-condition comment on disk, re-ran `pnpm prism:check` (579/579 tests, all gates green), grepped every cited path in the new ADR for existence · close: scope held — zero-findings pass; both round-1 Minors verified fixed on disk (not just claimed), lazy-artifacts/disk-freshness/`.gitignore` checks all pass, no dangling citations found
- 2026-08-02 [huntermcgrew/context-delivery-mechanism] open: Intent — PR review of #450 as an integrated whole, weighing the two implementer-flagged items and the consumer-contract question self-review cannot answer; Bounds — GitHub inline comments plus a summary on #450, and this plan's `## Review Issues`/`## History`/`## Sessions` only; no source edits, no merge, no un-draft, no other PR; Approach — exercise the hook against the real manifest and real docs rather than fixtures, verify every claim on disk, and adjudicate the flagged items independently rather than ratifying self-review · close: scope held — 1 Major (ungated payload size, measured at 92,366 bytes on a single `.prism/` read) and 8 Minor; both flagged items adjudicated (fail-open ships, insertion anchor correct), consumer scoping judged correct and provably so

---

## History

- 2026-08-02 [huntermcgrew/context-delivery-mechanism]: Plan created from the thrive-port comparison pass. Records the delivery-tier findings, the two hook designs, the self-measurement audit criterion, and a two-lane parallelism model keyed on the generated `AGENTS.md` Tier-1 block. Companion to `thrive-port.md`, which keeps its original candidate verdicts.
- 2026-08-02 [huntermcgrew/context-delivery-mechanism]: Ran task 10, the always-on rule audit; report at `.prism/audits/2026-08-02-always-on-rule-audit.md`. Zero self-measurement hits beyond the two known, and the consumer-delivery finding at `epic-prism-consumer-boundary.md`:63 is resolved on disk. See Decision: the always-on audit found zero further hits.
- 2026-08-02 [huntermcgrew/context-delivery-mechanism]: Resolved task 6's `load:` tier as `skill` rather than a fourth `rule-load.ts` enum value, and rewrote the task to the detail bar with a four-check retier verification. Added task 9, an adherence A/B harness with a stated falsifier that can revert PR 1's hook. PR 1's scope is unchanged apart from a `PRISM_HOOK_DISABLE` kill switch the control arm needs; see Decisions.
- 2026-08-02 [huntermcgrew/context-delivery-mechanism]: Split Wave 2 into `epic-context-delivery-wave-2.md` at epic grain, tasked its rows to the detail bar, and re-cut them against the always-on audit. Restored `.prism/plans/thrive-port.md` from `stash@{0}` — it was the sole copy and eleven Wave 2 rows cite it. This plan keeps Wave 1 and the audit criterion unchanged.
- 2026-08-02 [huntermcgrew/context-delivery-mechanism]: Closed both open Review Issues from Briar's self-review of PR #450 — renamed `stateFilePath` to `buildStateFilePath` (code-standards.md § Naming) and added a code comment documenting the known state-file read-modify-write race under concurrent same-session reads. No behavior change; `pnpm prism:build` and `pnpm prism:check` both re-ran green after the fixes.
- 2026-08-02 [huntermcgrew/context-delivery-mechanism]: Eric PR-reviewed #450 — inline comments and a severity-ranked summary posted. One Major (the injected payload has a count ceiling but no byte ceiling; measured 92,366 bytes on one `.prism/` read) and eight Minor recorded in `## Review Issues`. No labels applied while the Major is open.
