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

- **A null A/B result falsifies the hook only when a positive control proves the hook fired.** Task 9's variant arm now asserts, per run, that the hook's own session state file exists in the run's worktree and names the doc under test; the control arm asserts it does not. Both are recorded as TSV columns, not just checked.
  - **Root cause:** the hook is deliberately fail-open, so "injected nothing" and "silently broken" are indistinguishable from the transcript. Three separate defects produce an identical all-arms-null reading — an unprepared worktree where `pnpm exec tsx` cannot resolve, `--bare`/`--safe-mode` on the invocation, or a prompt whose path matches no manifest route. Each would revert a working mechanism on evidence that never exercised it.
  - **Alternatives considered:** parse the agent transcript for injected text (fragile, and `-p` output does not carry hook payloads); trust the smoke run alone and skip the per-run assertion (a mid-matrix breakage would go unrecorded).
  - **Chosen approach:** assert the state file per run. It is the hook's own write, it is per-session by construction, and the kill switch returns before it happens — so it separates the arms exactly and costs one `stat` per run.
  - **Implementation guidance:** a cell with more than 2 positive-control voids is a harness defect to fix and re-run, never a falsification. This is a change to the falsifier's preconditions, not to its threshold or the 60-run matrix, both of which stand.
  - **→ promotion verdict pending close.**

- **Task 9's P2 prompt targeted a path with no manifest route, and one P1 criterion sat past the payload byte cap — both re-picked against verified routing and the shipped 4000-byte ceiling.** Found while specifying the positive control above, which is what the positive control is for.
  - **Root cause:** two unverified premises. (1) P2 named `.claude/rules/code-comments.md`; that path resolves to zero manifest patterns, so P2 injected nothing in either arm and was a second negative control wearing a variant arm's label. Its stated route — `scripts/ai-skills/build.ts` — only fires if the agent reads that file, which the prompt gave it no reason to do. (2) `MAX_DOC_INJECTION_BYTES = 4000` (added on `main` closing Eric's Major) means only the first 4000 bytes of a doc reach the variant arm; `install-layout.md` is 39,969 bytes and its § "The templates/install seed surface" starts at byte 7,930, so P1's seed-curation criterion was ungradeable by construction.
  - **Alternatives considered:** raise or remove the byte cap for the harness (measures a mechanism PRISM does not ship — the whole point is to test the shipped thing); add a `.claude/rules/**` manifest route (edits production config to make an experiment pass); drop P2 entirely and run P1 alone (halves the signal and changes the falsifier arithmetic).
  - **Chosen approach:** re-pick both against verified facts. P2 now instructs a read of `.prism/rules/code-comments.md` (verified to route to `install-layout.md` via `.prism/**`) and grades the Cursor mirror instead of the Claude one — same "generated output, rebuild rather than hand-edit" constraint, governed by install-layout § "The bifurcation" at byte 209, deep inside the cap. P1's third criterion becomes the live-manifest-vs-`manifest.base.json` distinction from § "Ownership is path-decidable" (byte 2,123), also inside the cap. Both prompts keep three criteria, so the falsifier's 2-per-10 threshold and the 60-run matrix are unchanged.
  - **Implementation guidance:** the general rule this yields, now written into task 9: a constraint is gradeable only if it lives within the first 4000 bytes of its doc (`grep -bn "^## " <doc>` to check), and the prompt's instructed read must precede the graded decision — the hook fires *after* a `Read`, so a decision made at the agent's own first read gets its injection too late to matter. P2's original design failed the second rule as well as the first.
  - **→ promotion verdict pending close.**

- **Sol keeps his autonomy and his merge capability; only the `launch | internal | hobby` intake goes.** Removing `autonomyPolicy` makes Sol more autonomous by default, not less — today it is a ceiling a persona may never auto-clear below, so identical work gates differently depending on an answer given at intake.
  - **Root cause:** the dial adds an intake question whose answer changes gate behavior without changing the work being gated.
  - **Chosen approach:** gates are judged by their owning persona on the merits — the owner self-clears the simple cases and escalates on judgment. `features.conductorMayMerge` in `.ai-skills/config.json` is a separate flag and is untouched; PRISM sets it `true` today and consumers set it themselves.
  - **→ promotion verdict pending close.**

- **Thrive's conductor draft hold is not ported.** It solves a thrive-specific review flow. The four-part dispatch shape from the same PR is ported.
  - **→ promotion verdict pending close.**

- **The harness grades a directory, not a live git worktree, and `run.sh` does the git diffing rather than `grade.ts`.** Built while executing task 9's PR 3.
  - **Root cause:** task 9 specifies criteria as "a path assertion or a `git diff --name-only` / file-content grep" but leaves the exact directory contract to the implementer — a keystroke-level decision under `implementation-task-detail.md`'s bar, not a front-loaded one.
  - **Chosen approach:** `run.sh` computes the union of `git diff --name-only <base-sha>` and `git ls-files --others --exclude-standard` inside the worktree once, after the agent runs, and writes it to `<worktree>/changed-files.txt`. `grade.ts` only ever reads that file — no git dependency inside the grader itself. This keeps `grade.ts` gradeable against plain fixture directories (no nested `.git`, which would otherwise show up as a gitlink inside this repo) and makes the self-test exercise the exact same code path a real run does.
  - **Implementation guidance:** a graded directory is the worktree path itself — `response.json`, `stderr.log`, and `changed-files.txt` all land at its root alongside the repo files the agent touched. The three fixtures under `fixtures/` (`p2-adherent`, `p2-non-adherent`, `p2-control`) are the same shape by hand. Full contract documented in `grade.ts`'s file-level JSDoc and `README.md` § Files.
  - **→ no promotion needed (harness-internal implementation detail; the falsifier and the arm/prompt/positive-control design are the parts that matter beyond this PR, and those are already in `README.md`).**

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
    - `scripts/experiments/hook-adherence-ab/run.sh` — loops arms × prompts × runs, prepares a fresh worktree per run, invokes the agent, calls `grade.ts`, appends a row to the results TSV. Tears the worktree down after grading. Exact invocation and worktree preparation below.
    - `scripts/experiments/hook-adherence-ab/results/.gitkeep` — per `lazy-artifacts.md` the result file itself is created on first run, not seeded.

    **Arms.** Identical in every respect except one environment variable, exported by `run.sh` per arm before it invokes the agent:
    - *Control:* `PRISM_HOOK_DISABLE=1`. The hook stays registered in `.claude/settings.json` and still fires; it returns empty and exits 0 (task 2's kill switch). Nothing about the hook source, the settings file, or the manifest differs between arms.
    - *Variant:* `PRISM_HOOK_DISABLE` unset.

    **Worktree preparation — the run is invalid without it.** Each run gets a fresh worktree created at `<main>/.claude/worktrees/hook-ab-<arm>-<prompt>-<run_index>` off the current branch, and `run.sh` runs `scripts/worktree-setup.sh "<worktree path>"` immediately after creating it and before invoking the agent. The path must be under `.claude/worktrees/` — `worktree-setup.sh` refuses any other location by design.

    This is load-bearing, not hygiene. `.claude/settings.json` (tracked, so every worktree checks it out) registers the hook as `pnpm exec tsx "$CLAUDE_PROJECT_DIR/scripts/ai-skills/hooks/claude-post-read.ts"`. A fresh worktree has no `node_modules` of its own, so `pnpm exec` cannot resolve `tsx`; the adapter is deliberately fail-open, so it would exit quietly and inject nothing. The variant arm would silently become a second control arm, both arms would score identically, the falsifier below would fire, and a working hook would be reverted over an environment defect. `scripts/worktree-setup.sh` (shipped by row W2-01 of `epic-context-delivery-wave-2.md`, on `main`) links the main checkout's `node_modules` into the worktree and exists for exactly this failure. If it exits non-zero, `run.sh` aborts the run rather than proceeding — a run that cannot resolve `tsx` produces a number worse than no number.

    **Positive control — assert per run, record per row.** Worktree preparation makes the hook *able* to fire; the positive control proves it *did*. Without it a null result is uninterpretable and the falsifier cannot be honored honestly.

    The observable is the hook's own session state file. `resolveArchitectDoc` writes `<repo root>/.prism/architect-route-state.<session_id>.json` (`buildStateFilePath`, `saveRouteState`) on every injection, and writes it nowhere else; the control arm's kill switch returns before any of that runs. `run.sh` generates a UUID per run (`uuidgen`) and passes it as `--session-id`, so the exact path is known ahead of the run rather than glob-matched afterward. `grade.ts` then asserts, against the run's own worktree:

    - *Variant arm, P1 and P2:* the state file exists **in the worktree** (not in the main checkout — a state file in `<main>/.prism/` means `findRepoRoot` walked past the worktree and the run is void), and its `injected` array contains `_toolkit/install-layout.md`. Record `hook_fired=yes` plus the full `injected` list.
    - *Control arm, all three prompts:* the state file does not exist. Record `hook_fired=no`.
    - *Variant arm, P3:* no expectation — the prompt's own target has no route, but the agent may read other files that do. Record whatever is observed.

    A run whose arm expectation fails is marked `void_reason=positive_control` and excluded from that cell's mean. If more than 2 of a cell's 10 runs void this way, the cell is void and the harness is broken — that is a harness defect to fix and re-run, never a falsification of the hook.

    **Agent invocation.** One exact command, so two implementers build the same harness. `run.sh` invokes, with the worktree as cwd:

    ```sh
    "$CLAUDE_BIN" -p "$(cat "$PROMPT_FILE")" \
      --model "$MODEL" \
      --session-id "$RUN_UUID" \
      --permission-mode bypassPermissions \
      --setting-sources project \
      --output-format json \
      --max-budget-usd "$BUDGET" \
      > "$RUN_DIR/response.json" 2> "$RUN_DIR/stderr.log"
    ```

    - `CLAUDE_BIN` defaults to `/Users/hunter/.local/bin/claude` (the binary on PATH as of 2026-08-02), overridable by env so the harness is not machine-pinned.
    - `--permission-mode bypassPermissions` is required, not a convenience. Every graded criterion is file-system-observable, so a run that cannot write files scores 0 in **both** arms and returns a null result for a reason that has nothing to do with the hook.
    - `--model "$MODEL"` pins one model for the whole matrix so arm-to-arm variance is not model variance. Set `MODEL` to a full model id, never an alias — aliases move, and a matrix that straddles an alias rotation is two experiments. Default `claude-opus-5` (verified available on this machine 2026-08-02); the operator may substitute a cheaper model, and the only constraint is that both arms use the identical value. `run.sh` writes `$MODEL` into every TSV row so the pin is auditable after the fact.
    - The prompt reaches the invocation as an argument (`-p "$(cat …)"`), read from the prompt file. Not piped on stdin — stdin is how the hook subprocess receives its own payload, and keeping the two channels separate removes a class of confusion from the harness.
    - **Never pass `--bare` or `--safe-mode`.** Both disable hooks, which silently converts the variant arm into a control arm — the same failure the worktree preparation above exists to prevent, reached by a different route.
    - **Timeout: 600s per run.** Neither `timeout` nor `gtimeout` exists on this machine (verified 2026-08-02), so wrap with the portable form `perl -e 'alarm shift; exec @ARGV' 600 …` rather than assuming coreutils. A timed-out run is killed, recorded with `exit_status=timeout` and `criteria_passed=0`, marked `void_reason=timeout`, and excluded from its cell's mean — a truncated run is missing data, not evidence of non-adherence. If either arm exceeds 2 timeouts in a 10-run cell, that cell is void; if the arms' timeout counts differ materially, record it in `DECISION.md` — an intervention that changes run duration is itself a finding.

    **Payload size is a bound, not the intervention.** `## Review Issues` records Eric's Major: one measured `Read` of a `.prism/**` path produced 92,366 bytes (~23k tokens) of `additionalContext`. That is fixed on `main` — `MAX_DOC_INJECTION_BYTES = 4000` in `architect-route.ts` caps each doc at ~1k tokens and appends a truncation note naming the on-disk path. So the confound is bounded and the harness measures the shipped mechanism, which is what it must do.

    The cap has a consequence the rubric has to respect: **a constraint is gradeable only if it lives within the first 4000 bytes of its architect doc**, because that is all the variant arm receives. `install-layout.md` is 39,969 bytes; inside the cap are only § "The bifurcation" (byte 209) and § "Ownership is path-decidable" (byte 2,123). § "The templates/install seed surface" begins at byte 7,930 and never reaches the variant arm. Every graded constraint below was re-picked against that boundary. Before adding or changing a criterion, check its byte offset (`grep -bn "^## " <doc>`) — a constraint past the cap grades both arms as non-adherent and dilutes the contrast toward zero.

    **Prompts and their target files.** Every prompt is phrased so the task requires reading the target file and produces a file-system-observable result, and carries no hint of the constraint being graded. Each graded constraint lives *only* in `.prism/architect/_toolkit/install-layout.md` — none is restated in any Tier-1 rule, which is what keeps the control arm from passing for free.

    One design rule the prompts now share, and P2 previously violated: **the instructed read must precede the graded decision.** The hook fires *after* a `Read`, so a prompt whose graded decision happens at the agent's own first read gets its injection too late to affect anything.

    - **P1 — reads `.prism/architect/_toolkit/architecture-doc-shape.md`, which routes to `install-layout.md` via the `.prism/**` entry** (verified: that path resolves to `_toolkit/spec-editing.md`, `_toolkit/install-layout.md`, `_toolkit/skills-ecosystem.md`). Prompt: *"Read `.prism/architect/_toolkit/architecture-doc-shape.md`, then add a new PRISM architect doc covering how `pnpm prism:build` decides which platform directories to write. Wire it up so agents actually load it."* Graded constraints: (i) the new doc is created under `.prism/architect/_toolkit/`, not flat `.prism/architect/` — install-layout § "Ownership is path-decidable" reserves the flat namespace for consumer product docs; (ii) a route for it is added to `.prism/architect/manifest.json`; (iii) that route lands in the live `.prism/architect/manifest.json` rather than only in `_toolkit/manifest.base.json` — same section states the live manifest is consumer-owned and hand-maintained because the merge-at-onboard logic is not built, so a base-only edit never takes effect.
    - **P2 — reads `.prism/rules/code-comments.md`, which routes to `install-layout.md` via the same `.prism/**` entry.** Prompt: *"Read `.prism/rules/code-comments.md`. The Cursor copy of this rule is out of date — bring it current."* The adherent answer refuses the literal instruction: `.cursor/rules/code-comments.mdc` is generated output, so bringing it current means running `pnpm prism:build`, not editing the mirror. Graded constraints: (i) `.cursor/rules/code-comments.mdc` is not hand-edited; (ii) the response or a commit names `pnpm prism:build` as the mechanism; (iii) `.prism/rules/code-comments.md` is left unmodified — nothing was actually wrong with the canonical, and editing it to force a rebuild is a different error. All three are governed by install-layout § "The bifurcation" (byte 209–2,123, comfortably inside the cap), which states that editing a platform copy directly is drift and that `pnpm prism:check` flags it.
    - **P3 — negative control.** A target path with no `manifest.json` entry (`README.md` — verified to match zero manifest patterns), graded on a formatting constraint from a Tier-1 rule. Both arms must score the same. If P3 separates, the harness is measuring run-to-run variance rather than the hook, and the P1/P2 result is void.

    **Rubric and grader.** Every criterion above is a path assertion or a `git diff --name-only` / file-content grep, and the positive control is a state-file existence-and-contents check — nothing turns on taste, so `grade.ts` grades all of them mechanically and no human is in the loop. Task is `[AFK]`, not `[HITL]`. Score per run is the count of criteria passed; report per prompt per arm as passed/total across the non-void runs.

    **Results TSV columns**, in order, one row per run: `date`, `prompt` (`p1|p2|p3`), `arm` (`control|variant`), `run_index`, `model`, `session_id`, `exit_status` (`ok|timeout|error`), `hook_fired` (`yes|no`), `injected_docs` (semicolon-joined, or `-`), `criteria_passed`, `criteria_total`, `void_reason` (`-|timeout|positive_control`). `hook_fired` and `injected_docs` are the positive control's record — a results file without them cannot support a verdict either way.

    **Run count.** 10 runs per arm per prompt — 60 runs total (3 prompts × 2 arms × 10). Matches the order of magnitude of the prior out-of-tree harness (23 runs, A/B/C) and is enough for a 2-of-10 separation floor to mean something without turning the harness into a project. Unchanged by this rewrite: P1 and P2 still carry three criteria each, so the falsifier's arithmetic is untouched.

    **Falsifier — state it in the README and honor it.** The hook fails to earn its keep if, on P1 and P2 combined, the variant arm's mean criteria-passed exceeds the control arm's by fewer than 2 criteria per 10 runs, *or* if P3 separates by any margin. On that result: PR 1's hook is reverted and architect-context routing ships as task 4's prose clause alone, which costs nothing per `Read` and needs no consumer config surface.

    One precondition gates the falsifier, added by this rewrite: **a null result only falsifies the hook when the positive control passed.** If the variant arm's runs do not show `_toolkit/install-layout.md` in `injected_docs`, the hook never fired and the run measured nothing — fix the harness and re-run. Reverting a mechanism on a result that never exercised it is the specific mistake the positive control exists to prevent. Write the outcome into this plan's `## Decisions` and into the ADR from task 5 rather than quietly re-running until the numbers cooperate — a second run of the same design is a new experiment only if the design changed, and the reason it changed goes in the README.

    **Where the result lands.** `scripts/experiments/hook-adherence-ab/results/<YYYY-MM-DD>-run.tsv` (raw rows) plus a sibling `DECISION.md` (the verdict and the arithmetic behind it), both committed in PR 3. The verdict is then promoted into this plan's `## Decisions` and into task 5's ADR as the evidence line for why the mechanical layer exists — or doesn't.

    **Verification.** In order:
    - `npx tsx scripts/experiments/hook-adherence-ab/grade.ts --self-test` passes against two committed fixture worktrees (one adherent, one not) so the grader is proven before any run is graded by it. The fixtures include a state file so the positive-control assertion is itself covered.
    - One smoke run per arm on P2 before the full matrix — confirm the variant row records `hook_fired=yes` with `_toolkit/install-layout.md` in `injected_docs`, and the control row records `hook_fired=no`. If the variant smoke run says `no`, stop: the worktree preparation or the hook registration is broken, and the remaining 58 runs would produce a confidently wrong null.
    - `pnpm prism:check` — the directory is outside every generated surface, so the expected effect on build output is none; if `prism:check` reports drift, the harness landed in the wrong place and the path decision above needs revisiting rather than the drift being accepted.

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

## Debugged Issues

### Nested `claude` CLI invocations fail OAuth authentication on this machine

- **Status:** `open`
- **Severity:** Critical
- **Confidence:** `High` (Confirmed root cause + deterministic repro)
- **Environment:** this machine (`/Users/hunter/.local/bin/claude` → `2.1.220`), 2026-08-02
- **File:** `scripts/experiments/hook-adherence-ab/run.sh` (the agent-invocation step) — not a bug in this file, a precondition it depends on
- **Root cause:** `[Confirmed]` — the local `claude` CLI's OAuth session cannot refresh headlessly. A bare, non-nested, non-worktree control invocation (`claude -p "say hi" --model claude-opus-5 --output-format json --permission-mode bypassPermissions --setting-sources project`) fails in ~95ms with `"result":"Failed to authenticate: OAuth session expired and could not be refreshed"`. This is unrelated to the harness, the worktree, or the hook under test.
- **Steps to Reproduce:**
  1. Run `/Users/hunter/.local/bin/claude -p "say hi" --model claude-opus-5 --output-format json --permission-mode bypassPermissions --setting-sources project` directly, outside any worktree.
  2. Observe `is_error: true`, `duration_ms` under 100, `result: "Failed to authenticate: OAuth session expired and could not be refreshed"`.
- **Expected behavior:** the invocation authenticates and runs the prompt.
- **Actual behavior:** every invocation fails auth in under 100ms, before any prompt work happens.
- **Recommended fix:** re-authenticate the local CLI (interactive `claude` login to refresh the OAuth session) or switch the harness's invocation to a non-interactive credential (e.g. `ANTHROPIC_API_KEY`) that doesn't depend on OAuth refresh. Neither is something an agent session can do to itself — this needs the operator.
- **Suggested tests:** re-run task 9's stage 1 smoke matrix (`RUNS_PER_CELL=1`) once authentication is confirmed working via the same bare `claude -p "say hi"` check above.
- **Secondary finding (not blocking, found while diagnosing):** `run.sh`'s `run_one()` labels every non-zero exit from the `perl -e 'alarm shift; exec @ARGV' 600 ...` wrapper as `exit_status=timeout`, whether the process was actually killed by the alarm or exited quickly with a real error (as happened here — 6/6 runs exited in <100ms but were recorded as `timeout`). Worth a follow-up to distinguish alarm-kill (exit 142/SIGALRM) from a fast non-zero exit so future failure rows aren't mislabeled.
- **Ticket:** `N/A`

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
- **Suggested fix:** none — the chosen placement is correct on its own merits. The file's body ends at "The pattern is 'read once, refer many'" (line 22); a new subsection landing right after that and before the citation footer reads as a natural continuation, not a bolt-on. No better anchor exists in the file for a task-named anchor that was never real. Eric's PR review independently confirmed the same call and offered one non-blocking suggestion (heading states a problem, not a rule) — left as-is per the same review, since the body text is unaffected either way.

### Eric's PR #450 review — Major: injected payload has no byte ceiling

- **Severity:** `major`
- **Status:** `fixed`
- **File:** `scripts/ai-skills/hooks/architect-route.ts:191-197`
- **Problem:** Eric measured one real `Read` of `.prism/plans/thrive-port.md` producing 92,366 bytes (~23k tokens) of `additionalContext` — the count ceiling ("one injection per doc per session") was correctly implemented but had no byte ceiling beside it, and the per-session total across every manifest-reachable doc runs to ~180 KB (~45k tokens). All nine existing tests seeded ~30-byte doc bodies, so the size dimension was never exercised. Consequence for task 9: a variant arm spending ~23k tokens on its first `.prism/` read measures a materially different intervention than ADR-0071 describes.
- **Suggested fix:** cap the payload, narrow the hook's routing, or at minimum add a realistic-size test.
- **Fixed in:** added `MAX_DOC_INJECTION_BYTES` (4000 bytes, ~1k tokens per doc) in `architect-route.ts`. A doc over the cap is truncated at a UTF-8-safe byte boundary and the section header names the total size and the on-disk path for the rest (`formatInjectionSection`). Two new tests assert the cap on an oversized doc and verbatim injection under it.

### Eric's PR #450 review — Minor: `loadRouteState` only recovers from `ENOENT`

- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `scripts/ai-skills/hooks/architect-route.ts:113-122`
- **Problem:** A corrupt or truncated state file threw a `SyntaxError` (no `code`), propagated out, and left the hook inert for the rest of the session with no repair path.
- **Suggested fix:** treat unparseable state the same as absent — costs nothing, worst case is one duplicate injection.
- **Fixed in:** `loadRouteState` now returns `{ injected: [] }` on any read/parse failure, not just `ENOENT`. `isNodeError`/`NodeError` removed as dead code. New test covers a hand-corrupted state file.

### Eric's PR #450 review — Minor: per-session state files accumulate with no reaper

- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `scripts/ai-skills/hooks/architect-route.ts:100`
- **Problem:** One state file per session, forever, gitignored so it never surfaces in `git status` — unbounded growth unlike Theo's, Ren's, and Sol's fixed-name state files.
- **Suggested fix:** prune inside `saveRouteState`, or hand off to Zoe's cadence audit.
- **Fixed in:** `pruneStaleRouteState` runs at the end of every `saveRouteState`, removing sibling `architect-route-state.*.json` files last modified more than 24 hours ago. Best-effort — failures are swallowed, never block the save. New test seeds a stale file and confirms it's gone after a save while the current session's file survives.

### Eric's PR #450 review — Minor: `cwd` is the session directory, not necessarily the repo root

- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `scripts/ai-skills/hooks/claude-post-read.ts:51`
- **Problem:** A session started in a subdirectory made `loadManifest` throw `ENOENT` and the hook went silently inert for the whole session, indistinguishable from a genuine no-match — the same ambiguity the fail-open adjudication (round 1) accepted, but concretely avoidable here rather than merely accepted.
- **Suggested fix:** walk up from `cwd` looking for `.prism/architect/manifest.json` and use that directory as the root.
- **Fixed in:** added `findRepoRoot` (exported from `architect-route.ts`) which walks upward from `cwd` to the first ancestor holding the manifest, or `null` at the filesystem root. `claude-post-read.ts` now resolves `repoRoot` through it before calling the resolver. Two new tests cover the subdirectory walk-up and the no-manifest-anywhere case.

### Eric's PR #450 review — Minor (latent, not reproduced): `process.exit(0)` after a large `stdout.write`

- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `scripts/ai-skills/hooks/claude-post-read.ts:64-73` (pre-fix line numbers)
- **Problem:** `process.exit(0)` fired immediately after a `stdout.write` that can carry tens of KB; Node doesn't guarantee pending async writes flush before `process.exit()` tears down the process. Eric tried to reproduce it (12 consecutive runs at 92,366 bytes, all parsed clean) and couldn't — flagged as hardening, not a demonstrated bug.
- **Suggested fix:** `process.exitCode = 0` plus `return`, letting the event loop drain.
- **Fixed in:** every exit path in `main()` now sets `process.exitCode = 0` and returns rather than calling `process.exit()`. This also required separating `runAdapter` (pure computation, returns the payload or `null`) from `main()` (the only place touching `process.stdout`/`process.exitCode`) — see the test-suite entry below for why that split was necessary, not just tidy.

### Eric's PR #450 review — Minor: `npx` on the hot path

- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `.claude/settings.json:9`
- **Problem:** Measured 0.27–0.29s per `Read` invocation, including the overwhelming majority that inject nothing. `npx` re-resolves the package on every spawn, and reaches the network when `tsx` is not locally resolvable, so a fresh clone before install pays much worse than 270ms.
- **Suggested fix:** `pnpm exec tsx` (or the locally-resolved `tsx` binary) instead of `npx tsx`.
- **Fixed in:** the swap was deferred at the time of the fix pass (settings files are operator-only) and the operator applied it by hand before merge. Verified on disk 2026-08-02: `.claude/settings.json:9` reads `"command": "pnpm exec tsx \"$CLAUDE_PROJECT_DIR/scripts/ai-skills/hooks/claude-post-read.ts\""`, landed in `77029d1c` (the PR #450 merge) — which also made the path `$CLAUDE_PROJECT_DIR`-absolute, closing the same subdirectory-`cwd` class as the `findRepoRoot` fix.

### Eric's PR #450 review — Minor: `claude-post-read.ts` has zero automated coverage

- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `scripts/ai-skills/hooks/claude-post-read.ts`
- **Problem:** All nine pre-existing tests targeted `architect-route.ts`; the adapter itself — the `PRISM_HOOK_DISABLE` kill switch task 9's control arm depends on, the `hookSpecificOutput` shape, the fail-open catch, and the missing-`file_path`/`session_id` early exits — had no regression net.
- **Suggested fix:** pipe fixed stdin JSON to the adapter and assert stdout.
- **Fixed in:** new `scripts/ai-skills/claude-post-read.test.ts`, 6 tests. First attempt monkey-patched `process.stdout.write` around `runAdapter` and corrupted node:test's own IPC-over-stdout protocol mid-suite (a real, reproduced failure, not theoretical) — also would have let a test's `process.exitCode = 0` silently overwrite a genuine failure elsewhere in the same worker process. Root-caused instead of worked around: `runAdapter` was refactored to return the payload/`null` rather than write to `process.stdout` or touch `process.exitCode` at all; only `main()` (never invoked in-process during tests, guarded by the entry-point check below) does either. Separately: importing this module for the test ran its top-level `main()` immediately, which blocked forever on `process.stdin` in the test process — fixed with the same `fileURLToPath(import.meta.url) === path.resolve(process.argv[1])` entry-point guard already used by `crossref-lint.ts`, `worktree-classify.ts`, and others.

### Eric's PR #450 review — Minor: ADR-0071 states a consumer burden that doesn't exist

- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `.prism/spec/adrs/_toolkit/0071-architect-context-read-hook.md:30` (pre-fix line number)
- **Problem:** The ADR's Negative consequence described the third-consumer-config-surface merge burden as current, but `package.json`'s `files` array doesn't ship `scripts/`, so no consumer install touches `.claude/settings.json` today — a future reader would see `templates/install/.claude/settings.json` still `{}` and conclude the registration was forgotten.
- **Suggested fix:** recast the Negative as a burden the follow-up adapters incur once the scripts ship, and add a line to the Decision stating the mechanism is repo-local until `scripts/ai-skills/hooks/` is in `files`.
- **Fixed in:** both edits applied to the ADR's Decision and Consequences sections, exactly as suggested. Eric also affirmed independently (not just accepted Clove's framing) that the consumer seed staying `{}` is correct scoping, not an oversight — seeding it now would point every consumer at a script path absent from the package, and the fail-open design means the resulting dead hook would never surface.

### Eric's PR #450 review — Minor: PR carries a second plan's deliverable, unmentioned

- **Severity:** `minor`
- **Status:** `fixed`
- **File:** PR #450 description
- **Problem:** `scripts/worktree-setup.sh` and `.claude/hooks/guard-worktree-node-modules.sh` (263 lines of shell, row W2-01 of `epic-context-delivery-wave-2.md`) rode along in the diff with no mention in the PR body — a traceability gap, not a correctness one (W2-01 has its own review record on its own branch, PR #451).
- **Suggested fix:** a paragraph in the PR body naming the artifacts and pointing at their review record.
- **Fixed in:** added a Notes-section paragraph naming all three riding plan files plus the two W2-01 shell artifacts, and pointing at PR #451 for their review record. Also added a short "Consumer distribution (as of this PR)" section restating the repo-local fact now that ADR-0071 states it correctly.

---

## Cleanup Items

None.

---

## PR Readiness

- [x] No critical or major issues — the one Major from Eric's PR review (byte ceiling) is fixed
- [x] Types correct — no `any`, no unsafe `as` beyond the controlled `JSON.parse(...) as Manifest` / `as ArchitectRouteState` / `as ClaudePostToolUseInput` pattern already used elsewhere in this codebase for trusted repo-local config files
- [x] No stray console.logs or debug artifacts
- [x] Tests written for new logic and edge cases — 15 tests in `architect-route.test.ts` (match, injection-once, cross-session re-injection, no-match, disk-freshness, byte-cap truncation, verbatim-under-cap, corrupt-state recovery, stale-state pruning, repo-root walk-up) plus 6 in the new `claude-post-read.test.ts` (kill switch, output shape, no-match, missing `file_path`, missing `session_id`, malformed JSON)
- [x] All debugged issues resolved (no `open` entries in `## Debugged Issues`)
- [x] Build passes — last run: 2026-08-02, after closing Eric's PR #450 review findings (`pnpm prism:check-types`, `pnpm prism:test`: 591/591, `pnpm prism:build`, `pnpm prism:check`: all green)
- [x] PR description up to date — added the W2-01 traceability paragraph and the consumer-distribution section Eric's review requested
- [ ] Lasting decisions promoted to architect context — plan not yet closed; verdict pending per every Decision's `→ promotion verdict pending close` marker

Every Review Issue from Eric's PR #450 review is now closed. The last outstanding one — the `npx` → `pnpm exec tsx` change in `.claude/settings.json`, deferred at fix time because settings files are operator-only — was applied by the operator before merge and verified on disk 2026-08-02.

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
- 2026-08-02 [huntermcgrew/context-delivery-mechanism] open: Intent — close every open finding from Eric's PR #450 review (1 Major, 7 Minor) without silently overruling any, and re-verify all gates; Bounds — the two hook files, their test files, ADR-0071, and PR #450's own body/plan sections only, no merge, no other PR, no `.claude/settings.json` edit (hard dispatch boundary); Approach — fix in reviewer-recommended order, verify each fix's premise before applying it (per cross-agent-handoff-accountability), rerun `pnpm prism:check-types`/`prism:test`/`prism:build`/`prism:check` after every batch · close: scope held apart from the settings.json deferral (reported to the operator, not silently dropped) — 7 of 8 findings fixed, 1 deferred with the exact JSON recorded for hand-application; the test suite's own monkey-patch bug (found while writing the coverage fix) was root-caused via an API split (`runAdapter` returns, `main()` writes) rather than papered over; 591/591 tests, all gates green
- 2026-08-02 [main] open: Intent — close the three plan-readiness gaps Sol failed task 9 on (unspecified agent invocation, worktree that cannot run the hook plus no positive control, unbounded payload confound) so the A/B harness is dispatchable as its own PR; Bounds — this plan file only, task 9 in place plus `## Decisions`/`## Sessions`/`## History`, no code, no branch, no commit, leave the modified `lessons.md` and untracked `plans/conductor/` alone; Approach — verify every premise on disk before prescribing (CLI flags from `claude --help`, manifest routes resolved through the real `compileMatcher`, byte offsets from the real docs) rather than reasoning from the task's own claims · close: scope held — all three gaps closed, and specifying the positive control surfaced two false premises in the parts I was told to keep: P2's target path matches zero manifest patterns (so it injected nothing in either arm) and one P1 criterion sits past the shipped 4000-byte cap; both re-picked against verified routing, each recorded as a Decision, falsifier threshold and 60-run matrix unchanged
- 2026-08-02 [huntermcgrew/hook-adherence-ab-harness] open: Intent — build task 9's A/B harness (prompts, grader, `run.sh`) and prove the grader with `--self-test`, without running any arm; Bounds — new files under `scripts/experiments/hook-adherence-ab/` plus this plan file only, no `.claude/settings.json`, no worktree under `.claude/worktrees/`, no `claude -p` invocation, leave `lessons.md` and `plans/conductor/` untouched; Approach — read the shipped resolver/adapter/manifest on disk before designing the grader's directory contract, then prove it against committed fixtures before writing `run.sh` around it · close: scope held — no arm run, `grade.ts --self-test` passes (10/10 checks across three fixtures), `pnpm prism:check` exits 0 with no drift
- 2026-08-02 [huntermcgrew/hook-adherence-ab-harness] open: Intent — collapse the nine duplicated Eric-review findings in `## Review Issues` to one entry each, statuses settled against code on disk; Bounds — this plan file only, no code, no `.claude/settings.json`, no `conductor-state.json`, leave `lessons.md` and the untracked `plans/conductor/` alone; Approach — verify all nine against disk before editing rather than trusting either copy, keep the copy carrying the `Fixed in:` note, fold in substance only the stub held · close: scope held — 9 collapsed, 0 unresolved; one status disagreement settled against disk (the `npx` swap is applied in `.claude/settings.json:9`, not deferred as one copy claimed), and its stale echo in `## PR Readiness` corrected in the same pass to avoid leaving the file self-contradictory
- 2026-08-02 [huntermcgrew/hook-adherence-ab-harness] open: Intent — run task 9's stage 1 positive-control smoke matrix (6 runs) and, if it separates cleanly, the full 60-run matrix; Bounds — no edits to `.claude/settings.json` or hook source, no shortening the matrix or lowering the timeout, stage 2 conditional on stage 1 separating cleanly; Approach — smoke first at `RUNS_PER_CELL=1`, assert `hook_fired` separation per cell before spending the full 60 runs, diagnose any non-separation before reporting rather than reporting a raw number · close: blocked before stage 2 — all 6 smoke cells failed OAuth authentication in under 100ms (confirmed via a bare non-nested control invocation of the same binary), so no separation was observed and the full matrix never ran; worktrees torn down (0 leftover), the invalid results row discarded, blocker recorded in `## Debugged Issues`

---

## History

- 2026-08-02 [huntermcgrew/context-delivery-mechanism]: Plan created from the thrive-port comparison pass. Records the delivery-tier findings, the two hook designs, the self-measurement audit criterion, and a two-lane parallelism model keyed on the generated `AGENTS.md` Tier-1 block. Companion to `thrive-port.md`, which keeps its original candidate verdicts.
- 2026-08-02 [huntermcgrew/context-delivery-mechanism]: Ran task 10, the always-on rule audit; report at `.prism/audits/2026-08-02-always-on-rule-audit.md`. Zero self-measurement hits beyond the two known, and the consumer-delivery finding at `epic-prism-consumer-boundary.md`:63 is resolved on disk. See Decision: the always-on audit found zero further hits.
- 2026-08-02 [huntermcgrew/context-delivery-mechanism]: Resolved task 6's `load:` tier as `skill` rather than a fourth `rule-load.ts` enum value, and rewrote the task to the detail bar with a four-check retier verification. Added task 9, an adherence A/B harness with a stated falsifier that can revert PR 1's hook. PR 1's scope is unchanged apart from a `PRISM_HOOK_DISABLE` kill switch the control arm needs; see Decisions.
- 2026-08-02 [huntermcgrew/context-delivery-mechanism]: Split Wave 2 into `epic-context-delivery-wave-2.md` at epic grain, tasked its rows to the detail bar, and re-cut them against the always-on audit. Restored `.prism/plans/thrive-port.md` from `stash@{0}` — it was the sole copy and eleven Wave 2 rows cite it. This plan keeps Wave 1 and the audit criterion unchanged.
- 2026-08-02 [huntermcgrew/context-delivery-mechanism]: Closed both open Review Issues from Briar's self-review of PR #450 — renamed `stateFilePath` to `buildStateFilePath` (code-standards.md § Naming) and added a code comment documenting the known state-file read-modify-write race under concurrent same-session reads. No behavior change; `pnpm prism:build` and `pnpm prism:check` both re-ran green after the fixes.
- 2026-08-02 [huntermcgrew/context-delivery-mechanism]: Eric PR-reviewed #450 — inline comments and a severity-ranked summary posted. One Major (the injected payload has a count ceiling but no byte ceiling; measured 92,366 bytes on one `.prism/` read) and eight Minor recorded in `## Review Issues`. No labels applied while the Major is open.
- 2026-08-02 [huntermcgrew/context-delivery-mechanism]: Closed 7 of 8 findings from Eric's PR #450 review — added a byte ceiling on injected doc payloads (Major), widened `loadRouteState`'s corrupt-file recovery, added a stale-state-file reaper, walked `cwd` up to the repo root in the Claude adapter, replaced `process.exit()` with `process.exitCode` throughout, corrected ADR-0071's consumer-burden claim, and added `claude-post-read.test.ts` (6 tests) plus 6 new `architect-route.test.ts` tests. The `npx` → `pnpm exec tsx` fix in `.claude/settings.json` is deferred — outside this dispatch's edit scope — with the exact change recorded in the plan's Review Issues for the operator. Updated PR #450's body with the W2-01 traceability paragraph and a consumer-distribution section. 591/591 tests, `pnpm prism:check-types`/`prism:build`/`prism:check` all green.
- 2026-08-02 [main]: Rewrote task 9 to the detail bar — pinned the exact `claude` invocation (model, permission mode, session id, portable timeout), made `scripts/worktree-setup.sh` a required per-run step, and added a per-run positive control asserting the hook's session state file. Specifying that control surfaced two false premises in the prompts: P2's target path matches zero manifest patterns and one P1 criterion sits past the shipped 4000-byte injection cap; both re-picked against verified routing. See Decisions: null result falsifies only with a passing positive control, and P2/P1 re-picked against verified routing.
- 2026-08-02 [huntermcgrew/hook-adherence-ab-harness]: Built task 9's harness at `scripts/experiments/hook-adherence-ab/` — three prompts, `grade.ts`, `run.sh`, and three committed fixtures (`p2-adherent`, `p2-non-adherent`, `p2-control`). No arm was run — build-only per dispatch. `grade.ts --self-test` passes and `pnpm prism:check` exits 0 with no drift, confirming the harness lands outside every generated surface. See Decision: the harness grades a directory, not a live git worktree.
- 2026-08-02 [huntermcgrew/hook-adherence-ab-harness]: Collapsed the nine duplicated Eric-review findings in `## Review Issues` — a merge-conflict resolution had kept both sides of an append-order conflict, so each finding appeared once resolved and once as an `open` stub. Each status was re-verified against code on disk rather than either copy, which corrected the `npx` finding from `deferred` to `fixed` (`.claude/settings.json:9` reads `pnpm exec tsx`, landed in `77029d1c`) and its stale echo in `## PR Readiness`. No code touched.
- 2026-08-02 [huntermcgrew/hook-adherence-ab-harness]: Ran task 9's stage 1 smoke matrix (6 runs, `RUNS_PER_CELL=1`) per Sol's dispatch. All 6 failed OAuth authentication in under 100ms — confirmed via a bare non-nested `claude -p` control call — so the positive control never separated (`hook_fired=no` in all 6 cells) and stage 2 did not run. See Debugged Issues: nested `claude` CLI invocations fail OAuth authentication on this machine.
