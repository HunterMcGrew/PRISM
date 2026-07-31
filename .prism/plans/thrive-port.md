# Plan: thrive-port

## Ticket

No tracker ticket — port triage requested directly by Hunter ("what fits into PRISM?"), dispatched via Sol 2026-07-30. Source candidates: TracTru/thrive PRs 2192, 2196, 2206, 2221, 2222, 2230, 2231, 2232, 2238, 2239, plus two external inputs (Opus 5 prompting guide, ASD-STE100 writing skill) and the agent-registry concern added mid-dispatch.

## Goal

Port the generalizable subset of thrive's recent skill-surface improvements into PRISM's canonical surface, amend the two always-on rules that collide with Opus-5-class model behavior, and route the consumer-shaped candidates to Atlas onboarding — as independent PRs with two short stacks where files collide.

---

## Verdict table

| Candidate | Verdict | Reason (one line) |
| --- | --- | --- |
| 2196 worktree lifecycle | **Already landed** | `b441d6ef` on main; `worktree-git.md`, `worktree-mode.md`, `scripts/ai-skills/worktree-classify.ts` + test, and Zoe's explicit-only worktree lane all verified present. No action. |
| 2239 Opus-5 skills alignment | **Accept, split** | Battery calibration, one-pointer shape, DoD dedup, anti-meta-loop, and Sol's operator contract are generalizable; model-pin end-state already matches PRISM; `pre-review.sh` is TS-specific → Atlas idea, deferred. |
| 2238(a) dev-servers rule | **Accept (generic core)** | "Declared and reaped" + the probe pair (`lsof`/`curl`) are stack-agnostic; "verification green against nothing" is a real failure PRISM's verification rules don't cover; thrive's Storybook incident and `concurrently -k` advice stay behind. |
| 2238(b) conductor draft hold + dispatch shape | **Accept** | Verified live gap: canonical Eric flips draft→ready in state #3 unconditionally (`prism-code-review-pr/shared.md:350`) — under a Sol run that removes the human merge gate at exactly the wrong moment. |
| 2238(c) problem-first PR descriptions | **Accept** | Structural ordering (problem before mechanics) beats exhortation; PRISM's template is still What/Why/How; the Register section (no unglossed coinage in Summary/Problem/Goal) fixes a real reviewer cost. |
| 2232 retire handoff check | **Retire — on PRISM's own reasoning** | See Decisions. Thrive's "never reached the reader" rationale doesn't transfer; PRISM's does-it-earn-its-context reasoning does. |
| 2231 CLAUDE.md orientation | **Accept — two deliverables (Hunter's call)** | PRISM's own CLAUDE.md gets the four-section orientation; Atlas gains an onboarding step that generates one per consumer repo. |
| 2230 autonomy dial + Iris tier | **Accept** | Verified live: canonical Sol still carries the dial (`prism-conductor/shared.md:29,31,73,116,133`, step-01) and the tiering table (lines 88–98) has no Iris row — she routes to worker by catch-all while step-10 auto-dispatches her at plan close. |
| 2222 output style | **Reject — neither surface** | See Decisions. The in-flight response-shape contract is the single authority over reply shape and reaches subagents; a style can't, and two authorities is the exact defect 2230 removes. |
| 2221 Lilac ZWSP scoping | **Accept, narrow** | Verified: PRISM's template mandates ZWSP spacers on both delivery paths; thrive live-verified direct MCP posts render blank lines. Scope ZWSP to the manual-paste fallback. PRISM's template is already tokenized — no thrive-specific literals to strip. |
| 2192/2206 worktree node_modules | **Route to Atlas + one repo-local instance** | No stack-agnostic version meaningfully exists — the link set, tool allowlist, and lockfile check *are* the substance and they're all pnpm. Atlas generates per-team when the stack matches; PRISM itself is pnpm, so the canonical repo adopts the scripts as the first instance. |
| Agent registry (11th) | **Already landed — one residual flag** | Verified: `adopt` delegates to `runUpdate` which emits `.claude/agents/` unconditionally (`update.ts:842`) — consumers get the registry by generation, not template copy, so the missing `templates/install/.claude/agents/` is correct lazy-artifact behavior. Parity holds by rule: one agent per persona, none per utility (28 = 31 − 3). Drift is prevented by the build. Residual: the model-defaults mismatch, recorded as an OPEN Decision. |
| ASD-STE100 writing skill | **Drop** | `writing-voice.md` already carries plain-language, brevity, and answer-first; STE's remaining distinctives (numeric sentence caps, controlled vocabulary) are mechanical dials the Opus-5 guide warns get followed literally. One salvageable idea recorded in Decisions with a default of not shipping it. |

---

## Decisions

- **2232 — retire `context-window-handoff-check.md`, on PRISM's own reasoning, keeping the remedy.**
  - **Root cause of the rule's weakness:** the rule asks the model to count proxies it cannot reliably measure mid-session (100+ exchanges, 30+ files, 5+ skill invocations) and spends always-on Tier-1 context on a check that fires at one narrow moment (persona-handoff close). Opus-5-class models self-observe context pressure; the harness compacts and the pre-compaction-checkpoint rule already protects the load-bearing state.
  - **Alternatives considered:** keep as-is (thrive's non-transfer rationale means PRISM's copy is "fine"); amend to drop the numeric signals but keep the check.
  - **Chosen approach:** retire. A rule whose signals the model can't measure produces either theater (claimed counts) or silence; either way the always-on context cost buys nothing the model class doesn't do natively. The remedy survives: `/prism-handoff` gains a one-line self-observed trigger (hand off on session length or self-observed drift — thrive 2232's reworded invocation), and routing was never the gap since every persona names its next persona.
  - **Implementation guidance:** this is a removal — run the tree-wide reference sweep per `code-standards.md § Removal and rename completeness`. Known reference sites include persona skill bodies citing "Context Window Handoff Check" (e.g. `prism-architect` "assess context load per AGENTS.md § Context Window Handoff Check") and `context-reuse`-style citation lists. If PRISM has an ADR for the check, flip it to `deprecated` with the signals preserved in the body, mirroring thrive's ADR-0006 treatment.
  - **→ promotion verdict pending close.**

- **2222 — no output style, on either surface. The response-shape contract is the single authority over reply shape.**
  - **Root cause:** two live facts decide it. (1) A style shapes the main conversation only — subagents are out of reach (thrive 2222's own stated limit), and PRISM's heaviest sessions are Sol-dispatched personas the style never touches. (2) PRISM already has a chat-output contract in flight (`.prism/plans/response-shape-contract.md`, Phase 2 lands a Tier-1 PRISM rule) that *does* reach dispatched personas because rules load everywhere.
  - **Alternatives considered:** repo-local dev default (reaches Hunter's direct sessions — but those are also where the response-shape rule already applies); installable consumer content (worst case: consumers get two authorities over reply shape); both.
  - **Chosen approach:** neither. Thrive needed a 19-row precedence table to reconcile the style against its writing-voice rules — that table is the measure of the dual-authority cost, and "two authorities to reconcile" is the exact defect thrive's own 2230 removes elsewhere. Revisit only if the response-shape rule proves insufficient in main-conversation sessions after it lands.
  - **→ promotion verdict pending close.**

- **Dispatch-prompt response shape — paste the report-back schema verbatim into every prompt-mode dispatch; the registry carries identity, not the schema.**
  - **Root cause:** the one measured failure (thrive 2238) was a dispatch that cited the schema by path and got an off-schema return. PRISM's fleet mode is already safe — `lib/report-back.md § Canonical dispatch schema` mandates verbatim copy into the `agent()` `schema` field, where the shape is structural, not prose. The unguarded surface is prompt-mode dispatches (like this one).
  - **Alternatives considered:** state once in `_shared/core.md` — rejected: that file is the *portable roster's* surface (`~/Documents/portable-skills`), not PRISM canonical; PRISM has no `_shared/` under `.ai-skills/skills/`. Rely on the registered agent type — rejected as sole carrier: the agent def carries the persona's skill body, which points at the schema *by path*, which is the measured failure mode.
  - **Chosen approach:** adopt thrive 2238's four-part dispatch-prompt shape (declaration line, task pointer, schema pasted in full copied from `report-back.md § Canonical dispatch schema`, handoff-context path) for prompt-mode dispatches, alongside "a dispatch may add facts and scope; it may never countermand or suspend a step of the dispatched persona's skill." The registry reduces what the prompt must carry (identity, startup) — it does not carry the run-specific schema.
  - **→ promotion verdict pending close.**

- **OPEN — TBD, needs Hunter input.** Sol's tiering table pins Eric, Sasha, and Pixel at top tier (`prism-conductor/shared.md:88–98`) while `CLAUDE_AGENT_MODEL_DEFAULTS` (`scripts/ai-skills/generate-skills.ts:91–94`) gives only conductor and architect `opus` — direct (non-Sol) dispatches of Eric/Sasha/Pixel/Iris run `sonnet` by frontmatter default. This is a cost call: aligning the defaults to the table raises spend on every direct dispatch. **Default path (used until resolved):** task 8 adds Iris to Sol's *tiering table* only (matching thrive 2230); the code-side defaults map is left untouched.
  - **→ promotion verdict pending close.**

- **STE — drop; one idea recorded, default not shipped.** The single portable idea `writing-voice.md` doesn't carry: procedural text (numbered steps, task lists) gets one instruction per sentence. If Hunter wants it, it's a one-bullet addition to `writing-voice.md § Keep it short enough to be read`; the default is to ship nothing, because the section's existing guidance covers the spirit and a redundant clause in an always-on rule costs context on every load.
  - **→ promotion verdict pending close.**

- **`verification-before-done.md` — amend (Hunter's call; exact text is task 1).** Evidence standard and staff-engineer bar stay; the procedural imperative ("run the tests, check the logs, demonstrate the behavior") goes — it is the Opus-5 guide's named over-verification trigger.
  - **→ promotion verdict pending close.**

- **`subagent-strategy.md` — amend (Hunter's call; exact text is task 2).** Read-heavy/answer-small criterion and one-task-per-subagent stay; the "when unsure, spend it" tiebreaker goes — the prior attempt at this very dispatch followed it and produced two malformed report-backs and no plan. The guide's "don't use subagents to verify your own work" line is added; same evidence base.
  - **→ promotion verdict pending close.**

- **2192 ships as Atlas-generated per-team content plus a PRISM repo-local instance, in one PR.** The mechanism is inherently stack-specific (pnpm link set, Node tool allowlist); Atlas generates it only when onboarding detects a pnpm workspace. PRISM is itself pnpm and runs fleet worktrees, so the canonical repo adopts the scripts as instance zero — which also keeps the Atlas template honest against a working copy. 2206's lesson rides along: the generated hook ships `755`, and the Atlas step verifies the mode.
  - **→ promotion verdict pending close.**

- **Canonical-surface discipline:** every rule edit lands in `.prism/rules/` (source); `.claude/rules/` and `templates/install/.prism/rules/` are build-managed mirrors regenerated via `pnpm prism:build`. Skill edits land in `.ai-skills/skills/*/shared.md` (or the platform-specific files) and regenerate projections. Editing a mirror is the failure mode; every task below names the source path only.
  - **→ promotion verdict pending close.**

- **OPEN — TBD, needs Hunter input.** Whether the closing battery in `.prism/rules/session-orientation.md` should scale with task size the same way the opening battery now does (line 19's single-edit-no-ambiguity collapse to the `open:` clause). Eric's PR #449 pass-2 review found the pass-1 fix decided this silently by extending the collapse to `close:` (line 32) on a citation that didn't hold — `close:` carries one verdict token where `open:` has three answer slots, so a collapsed closing shape needs its own definition, not an implied mirror of the opening one. **Default path (used until resolved):** the closing battery keeps its current unconditional four-question form (line 32 reverted to pre-`fb2a05be` wording).

---

## Implementation Tasks

Tasks are grouped by persona per ADR-0018. Verification for every rule/skill task: `pnpm prism:build` regenerates mirrors cleanly, then `pnpm prism:check` (or the repo's check mode) passes. Content-only tasks state so.

### Clove (implementation)

**PR A — Opus-5 rule amendments** (`.prism/rules/`, three files, one theme)

1. **Amend `.prism/rules/verification-before-done.md`.** Replace the full file body with:

   ```markdown
   # Verification Before Done

   ## Purpose

   A completion claim names its evidence. "Done" backed by a passing test, a clean log, or a behavior diff is knowledge; "done" without evidence is a belief the next reader inherits and pays for when it turns out false. The bar is: "Would a staff engineer approve this?" If you're not sure, you're not done.

   **Why:** demonstrated correctness is the difference between believing the work is right and knowing it. The staff-engineer bar names the standard concretely so "done" means the same thing across sessions and models.

   **How to apply:**

   - When claiming a task is complete, name the evidence the claim rests on — a test result, a log, a behavior diff. A claim with no evidence to name isn't ready to be made.
   - When the change is behavioral, the behavior diff between `main` and the change is the proof worth citing.
   - Hold the work to the staff-engineer bar. If you're not sure it would pass review, it isn't done yet.
   ```

   What changed and why: the procedural imperatives ("Run the tests, check the logs, and demonstrate the behavior") are gone — the Opus-5 guide names them as over-verification triggers for a model class that verifies unprompted. What stays is the evidence *standard*: claims name their evidence. Run `pnpm prism:build`; confirm both mirrors regenerate.

2. **Amend `.prism/rules/subagent-strategy.md`.** Replace the full file body with:

   ```markdown
   # Subagent Strategy

   ## Purpose

   Keep the main context window clean by offloading work that reads a lot to produce a small answer. One task per subagent keeps execution focused.

   **Why:** the main window holds the load-bearing context — the plan, the architect docs, the user's framing. Every file a subagent reads on the main window's behalf crowds that context closer to compaction. The criterion is shape, not size: a subagent earns its dispatch when the work is read-heavy and the answer is small.

   **How to apply:**

   - Offload research, exploration, and parallel analysis that reads a lot to produce a small answer.
   - Scope one task per subagent. A subagent with a single clear task returns a clean result; a subagent juggling three returns a muddled one.
   - Don't spawn subagents to verify or double-check your own work — verification belongs in the lane that did the work.
   - One agent where one suffices. A dispatch that could have been an inline read costs a round trip and a report-back that may not come back.
   ```

   What changed and why: the "when unsure, spend it" tiebreaker is gone (live evidence: the prior attempt at this dispatch followed it and stalled the run twice); the no-verify-subagents and one-where-one-suffices lines are the guide's stated caps. Run `pnpm prism:build`.

3. **Amend `.prism/rules/session-orientation.md` — battery scales with the task.** In `## Purpose`, replace `on a five-minute fix as much as a multi-hour epic` with a calibration matching thrive 2239: add after the opening battery description — "**The battery scales with the task.** On a single-edit task with no ambiguity, the four opening answers collapse straight into the one-line `open:` clause — no separate deliberation. **Why:** the model already tracks scope and evidence as it works; a full battery on a five-minute fix re-verifies what was never in doubt." Content edit + `pnpm prism:build`.

**PR B — 2239 skills sweep** (stacks on PR A — it applies the calibration A establishes)

4. **One-pointer normative shape for the batteries.** Across `.ai-skills/skills/*/shared.md`: each skill references `session-orientation.md` once at open and once at close; delete battery restatements elsewhere in each body, and delete Definition-of-Done items that restate the batteries ("Opening battery answered", "Closing battery answered") or default model behavior ("Type checks pass", "No stray console.logs", "Full diff read"). Keep DoD items that carry skill-specific policy (e.g. "No implementation code written", "AC synced to tracker"). This is a judgment-bounded sweep: the deletion test per item is "does this item tell the model something its defaults or an already-cited rule doesn't?" Run `pnpm prism:build` after; expect a wide but mechanical diff.

5. **Anti-meta-loop + `Meta` severity in `prism-review-loop`.** In `.ai-skills/skills/prism-review-loop/shared.md` (or its canonical source file), add: a meta finding — a PR body describing the change wrong, a readiness line reporting a closed finding as open, plan hygiene — is real and gets fixed, but never drives another review pass; only subject-surface findings count toward the zero-findings exit. Cite thrive's measured incident (five of nine passes spent on meta churn) in the Why. Content edit + build.

6. **Sol operator-communication contract.** In `.ai-skills/skills/prism-conductor/shared.md`, add a `## Talking to the operator` section: interim updates are one line; plain words, no coined run-vocabulary; every handle redeemed at first mention; evidence cells one clause. Note adjacency: the response-shape contract covers persona chat shape generally — this section covers only Sol's run-report register and cites the contract rather than restating it once the contract's PRISM rule lands. Content edit + build.

**PR C — 2230 port** (independent)

7. **Remove the autonomy dial from canonical Sol.** Surfaces: `.ai-skills/skills/prism-conductor/shared.md` (lines 29, 31, 73, 116, 133 reference the policy), `.prism/skills/prism-conductor/step-01-init.md` (the run-shape *and autonomy-policy* intake question — keep run-shape, drop the policy half), `lib/goal-state.md` and `lib/decision-box.md` (any `autonomyPolicy` field or "autonomy gate clears" phrasing → "the commit is trivial" per thrive's rewording), `lib/report-back.md` if gate-disposition rows reference policy. Replacement semantics: gates are judged by their owning persona unconditionally, phrased positively ("the owner self-clears the simple cases and escalates on judgment"). Sweep tree-wide for `autonomyPolicy` and `autonomy policy` per removal-completeness; goal-state schema drops the field. Verify: repo-wide grep returns zero hits outside plans/ADRs recording history; `pnpm prism:build`.

8. **Add Iris to Sol's tiering table.** `.ai-skills/skills/prism-conductor/shared.md`, table at lines 88–98: add row `| **Iris (retro)** | **top, default** | n/a — reading plan intent against the execution record is the same judgment class as review |` above the worker catch-all. Do not touch `CLAUDE_AGENT_MODEL_DEFAULTS` (OPEN Decision above owns that). Content edit + build.

**PR D2 — conductor draft hold + dispatch shape** (stacks on PR C — both edit Sol's files)

9. **Declaration line + four-part dispatch shape.** In Sol's dispatch-authoring docs (`.prism/skills/prism-conductor/step-04-dispatch.md` and `lib/report-back.md`): every dispatch prompt opens with the literal line `Conductor run: dispatched by Sol.` — copied verbatim, never paraphrased (a paraphrase reads as its absence). Prompt-mode dispatches follow the four-part shape: declaration line, task pointer, report-back schema pasted in full (copied from `lib/report-back.md § Canonical dispatch schema`), handoff-context path — plus the invariant "a dispatch may add facts and scope; it may never countermand or suspend a step of the dispatched persona's skill," with context-file facts labeled **copied** vs **composed**. Content edit + build.

10. **Eric's draft hold keyed on the declaration line.** In `.ai-skills/skills/prism-code-review-pr/shared.md` (~line 350, the state-#3 flip) and `.prism/references/code-review-pr/github-writes.md` § Applying labels in batch D: when the dispatch prompt carries `Conductor run: dispatched by Sol.`, suppress the state-#3 draft→ready flip — apply labels, report the verdict, let the human flip at Sol's merge gate. The carve-out lives in Eric's own skill keyed on the line's presence, preserving each-persona-runs-its-full-unmodified-startup. Content edit + build. Sequence: after task 9 (the line must exist before Eric branches on it).

**PR D1 — dev-servers rule** (independent)

11. **New rule `.prism/rules/dev-servers.md`.** Generic core only (~20 lines, Why/How shape per `writing-voice.md`): anything outliving a tool call — a dev server, a tunnel, a watcher — is declared and reaped. Check the port before binding (`lsof -i tcp:<port> -sTCP:LISTEN`; `curl -s -o /dev/null --max-time 2 http://localhost:<port>`, exit 7 = free). Reuse when observing *through* the server; kill when it *blocks* a verification (announce first — it may be the user's process); report when neither. Why: "a leaked server doesn't just waste memory — it turns verification green against nothing." No thrive incidents, no `concurrently` advice. Register in whatever tier index rules use (match a sibling always-on rule's registration). New file + `pnpm prism:build`; confirm both mirrors appear.

**PR D3 — problem-first PR descriptions** (independent)

12. **Restructure `.prism/rules/pr-description.md` + `.prism/templates/pr-description.md`.** Headings `## What did you do? / ## Why did you do it? / ## How did you achieve it?` → `## The goal` / `## The problem` / `## The change` / `## How`, with the structural rationale: a reader cannot hit mechanics before knowing what was wrong, because the mechanics section doesn't arrive until the problem has. Add `## Register`: written for a team lead, not the session; no unglossed internal coinage (persona names, run-vocabulary) in Summary/Problem/Goal — `## How` and `## Notes` may use them freely; Goal items are hopes, not results. Keep Summary-BLUF, Screenshots, Notes, Ticket, Type-of-Change sections. Sweep for other files citing the old heading names (removal-completeness — `skill-routing.md`, reviewer skills, `git-conventions.md` cross-refs). Content edits + build.

**PR E — Lilac ZWSP scoping** (independent, small)

13. **Two-shape `.prism/templates/standup-summary.md`.** Split the render into `### Direct-post shape (default)` — no ZWSP spacers; the MCP renders blank lines, verified live by thrive — and `### Manual paste fallback` — ZWSP retained, scoped to sessions with no Slack MCP. Keep the `invalid_blocks`/`###`-rejection constraint and bold-on-its-own-line headers (already present). Add the confirm-before-post flow if `prism-standup-summary` doesn't already carry it: DM the rendered standup to the user for confirmation → post → close with the message link. Content edit + build.

**PR F — 2231 orientation** (independent)

14. **PRISM's own CLAUDE.md repo orientation.** Prepend to `/CLAUDE.md` (above the existing behavioral sections) the four-part structure: (1) untitled product framing — what PRISM is, the canonical-source/mirror model, the persona roster in one breath; (2) `## Where things are` — `.prism/rules/` source, `.claude/`+`templates/install/` mirrors, `.ai-skills/skills/` skill sources, `scripts/ai-skills/` build, one bullet each with entry points; (3) one named easy-thing-to-get-wrong: editing a mirror instead of its source, with the decision rule ("if the file's header says AUTO-GENERATED, find its source"); (4) `## How rules reach each tool` — `pnpm prism:build` and which regions are generated. Anti-duplication: link the deep docs, don't copy them. Content edit; verify the build's crossref lint passes.

15. **Atlas onboarding step: generate a consumer repo orientation.** In `prism-onboarding`'s canonical skill source (`.ai-skills/skills/prism-onboarding/shared.md`), add a step that writes the same four-part structure into the consumer's CLAUDE.md (or CLAUDE.md.tmpl flow via `templates/install/.claude/CLAUDE.md.tmpl`), populated from stack detection: product framing from the repo's own README/package metadata, `## Where things are` from detected workspace layout, one easy-thing-to-get-wrong Atlas asks the team for, and the rules-projection section from PRISM's install layout. Sequence: after task 14 (PRISM's own file is the worked example the step cites). Content edit + build.

**PR G — 2192/2206 route** (independent, lowest priority)

16. **Atlas step + PRISM repo-local worktree setup.** Two halves, one PR. (a) Port `worktree-setup.sh` (125 lines) and `guard-worktree-node-modules.sh` (172 lines) from thrive (`gh pr diff 2192 --repo TracTru/thrive` for the exact contents) into PRISM's own `scripts/` + `.claude/hooks/`, adjusted for PRISM's workspace layout; `chmod 755` both (2206's lesson); `.gitignore` `node_modules/` → `node_modules` so the symlink is ignored. (b) Add an Atlas onboarding branch: when stack detection finds a pnpm workspace, generate the pair for the consumer, deriving the link set from their `pnpm-workspace.yaml`, and verify file mode `755` post-write. Verification: run the guard's case suite if ported; create a scratch worktree and confirm pass-1 remedy text fires before any link is created.

**PR H — 2232 retirement** (independent)

17. **Retire `.prism/rules/context-window-handoff-check.md`.** Delete the source file; `pnpm prism:build` removes the mirrors. Tree-wide sweep for every citation per removal-completeness — known sites: persona skill bodies referencing "Context Window Handoff Check" / "context load" handoff paragraphs (architect, and the 9-persona citation pattern thrive found — grep, don't trust this list), AGENTS.md if it carries the section, any rule-tier registry. If an ADR encodes the check, flip its status to `deprecated`, preserving the three signals in the body. Add to `prism-handoff`'s invocation guidance: the active persona may suggest handoff on session length or self-observed drift — never auto-routed off a phrase. Verify: repo-wide grep for `context-window-handoff-check` and `Context Window Handoff Check` returns hits only in plans/ADR-history; build passes.

### Eli (documentation)

18. **Docs touch-ups riding each PR.** Where `docs/` references retired or restructured content (the handoff check, the PR-description headings), update in the same PR that changes the source — not a separate docs pass. Grep per PR: `grep -rn "<old name>" docs/`.

---

## PR cut lines

Independent PRs, two short stacks where files genuinely collide — per Hunter's stacked-PR preference (stacks for dependent concerns only):

- **Stack 1:** PR A (rule amendments) ← PR B (2239 skills sweep). B applies the calibration A establishes; reviewing B before A lands would re-litigate A's language.
- **Stack 2:** PR C (2230 Sol dial + Iris) ← PR D2 (draft hold + dispatch shape). Both rewrite the same Sol files; stacking avoids a conflict-resolution round.
- **Independent:** D1 (dev-servers), D3 (PR descriptions), E (Lilac), F (orientation), H (2232 retirement) — each single-concern, no shared files.
- **Deferred tail:** G (2192) — largest and lowest-urgency; land after the stacks clear.

Suggested order: A→B and H first (always-on rule surface, smallest review cost), C→D2 second (Sol correctness under fleet runs), then D1/D3/E/F in any order, G last.

---

## Acceptance Criteria

### Behavioral

- [ ] Given a Sol-dispatched Eric review reaching state #3 (clean pass), When the dispatch prompt carries the conductor declaration line, Then the PR remains in draft and the verdict is reported without a ready flip (REQ-1)
- [ ] Given a persona session on a single-edit task with no ambiguity, When the opening battery runs, Then it collapses to the one-line `open:` clause without separate deliberation (REQ-1)
- [ ] Given a review-loop run that surfaces a meta finding, When the finding is fixed, Then no additional review pass is spent on it and only subject-surface findings count toward exit (REQ-1)
- [ ] Given Sol dispatches Iris at plan close, When the per-dispatch model is set, Then Iris runs at top tier per the tiering table (REQ-1)
- [ ] Given a session with a connected Slack MCP, When Lilac posts a standup directly, Then the rendered message contains no zero-width-space characters (REQ-1)

### Non-behavioral

- [ ] `pnpm prism:build` regenerates all mirrors with no drift after every PR; no mirror is hand-edited (REQ-1)
- [ ] Repo-wide grep for `autonomyPolicy` and `Context Window Handoff Check` returns hits only in plans and ADR history after PRs C and H (REQ-1)
- [ ] `verification-before-done.md` and `subagent-strategy.md` contain no procedural verification imperatives and no spend-the-compute tiebreaker (REQ-1)

### AC Adjustments

### AC Sync Log

| Date | Agent | Action | Plan | Ticket |
| ---- | ----- | ------ | ---- | ------ |
| 2026-07-30 | Winston | AC created in plan; no tracker ticket exists for this port | ✓ | N/A |

---

## Review Issues

- No issues found — 2026-07-30 [huntermcgrew/thrive-port-opus5-rule-amendments] (PR A: `verification-before-done.md`, `subagent-strategy.md`, `session-orientation.md` — tasks 1-3). Mirror integrity confirmed byte-identical across `.claude/`, `.codex/` (frontmatter-stripped, body identical), `.cursor/`, and `templates/install/`; `pnpm prism:build` and `pnpm prism:check` clean. Removal-completeness swept for the deleted procedural-verification imperative, the spend-the-compute tiebreaker, and the "five-minute fix as much as a multi-hour epic" phrase — zero hits outside this plan's own task-history prose. The known `.prism/lessons.md` passenger entry is accepted per dispatch instructions, not a finding.

### Eric review fixes — PR #449

- **Severity:** major
- **Status:** fixed
- **File:** `.prism/rules/session-orientation.md:19,32`
- **Problem:** the "battery scales with the task" collapse clause in `## Purpose` was contradicted by the mechanics sections, which still mandated "answer all four questions in sequence" unconditionally — the amendment was inert as shipped and PR A's own AC ("battery collapses to the `open:` clause") wasn't met.
- **Suggested fix:** cross-referenced both mechanics sections to the scaling clause so the collapse path is reachable, not just declared.

- **Severity:** major
- **Status:** fixed
- **File:** `.prism/rules/subagent-strategy.md:16-18`
- **Problem:** the "don't spawn subagents to verify your own work" cap was wider than the behavior it meant to stop — it also read as forbidding Parker's `step-06-review.md` parallel rubric subagents (product-fit/technical-feasibility/clarity) over a finished draft, which is read-heavy multi-axis analysis, not a same-pass self-check.
- **Suggested fix:** narrowed the cap to same-pass self-verification and named the rubric-review shape as the excluded case, per Hunter's approved Decision — did not rewrite the rule beyond that scope, and did not touch Parker.

- **Severity:** minor
- **Status:** fixed
- **File:** `.prism/rules/subagent-strategy.md:18`
- **Problem:** "One agent where one suffices" argued the one-vs-many axis while its supporting sentence argued the none-vs-one (inline-read-vs-dispatch) axis.
- **Suggested fix:** reworded the bullet to argue none-vs-one throughout.

- **Severity:** minor
- **Status:** fixed
- **File:** `.prism/rules/verification-before-done.md:11`
- **Problem:** the `**Why:**` line restated its own Purpose paragraph instead of carrying an independent reason.
- **Suggested fix:** replaced with the inherited-debt argument — the next reader pays for a false "done" claim, discovered later and more expensively than at the source.

### Eric review fixes — PR #449 (pass 2)

- **Severity:** major
- **Status:** fixed
- **File:** `.prism/rules/session-orientation.md:32`
- **Problem:** the pass-1 fix extended the battery-collapse clause to the closing battery, citing "the scaling clause above" — but that clause (`## Purpose`) is opening-only, so the citation didn't hold. The extension exceeded plan task 3's approved text and PR A's acceptance criterion, and left the collapsed `close:` shape undefined (`close:` carries one verdict token, not the three answer slots `open:` has).
- **Suggested fix:** reverted line 32 to its pre-`fb2a05be` wording — the closing battery ships opening-only (unconditional four-question run). The line-19 opening-battery reach (Major 1 from pass 1) is unaffected. Deferred whether the closing battery should scale to an `OPEN — TBD` Decision below, per Hunter's decision.

- **Severity:** minor
- **Status:** fixed
- **File:** `.prism/rules/subagent-strategy.md:17`
- **Problem:** the M2 carve-out cited `step-06-review.md`, a bare filename shared by two skills, inside a rule that `templates/install/` ships to consumers with no Parker.
- **Suggested fix:** rewrote the carve-out to describe the permitted shape directly — a structured rubric review over a finished draft, run by a different agent than the author — dropping the file citation so the rule reads standalone for any consumer.

## PR Readiness

- [x] No critical or major issues
- [x] Types correct — n/a (rules content, no code)
- [x] No stray console.logs or debug artifacts
- [x] Tests written for new logic and edge cases — n/a (rule-content-only change, no runtime logic)
- [x] All debugged issues resolved (no `open` entries)
- [x] Build passes — last run: 2026-07-30 (`pnpm prism:build`, zero drift)
- [ ] PR description up to date — not verified this session (chat-only scope; Eric verifies on GitHub)
- [ ] Lasting decisions promoted to architect context — plan close not yet run

**Last updated:** 2026-07-30

## Sessions

- 2026-07-30 [main] open: Intent — per-candidate port verdicts + the two open calls + plan with PR cut lines; Bounds — write only this plan file, no rules/skills/mirrors; Approach — verify every claim on disk before verdicting, inline reads only per retry constraint · close: scope held — one file written; Sol's agent-registry gap claim corrected from evidence (consumers get the registry via generation) rather than accepted.
- 2026-07-30 [huntermcgrew/thrive-port-opus5-rule-amendments] open: Intent — self-review PR A (tasks 1-3, the three amended rules) against mirror integrity, removal-completeness, and whether the trimmed rules still say what they need to; Bounds — chat + plan `## Review Issues` only, no fixes, no GitHub writes; Approach — diff-only reading of the three source files, tree-wide grep for the deleted phrasings, mirror byte-diff, `pnpm prism:build` for drift · close: scope held — zero findings; a false-positive scope-creep alarm (stale local `main` made `main...HEAD` look 30+ files wider than the actual PR) was resolved against `origin/main`/`gh pr diff` before it became a finding.
- 2026-07-30 [huntermcgrew/thrive-port-opus5-rule-amendments] open: Intent — fix Eric's PR #449 findings (2 major, 2 minor) on the three amended rules; Bounds — `.prism/rules/session-orientation.md`, `subagent-strategy.md`, `verification-before-done.md` only, no touching PR B's reach sites (Clove/Sasha/handoff), no `.claude`/`.codex`/`.cursor`/`templates/install` hand-edits; Approach — single-clause edits per finding, narrow M2's cap rather than touch Parker per Eric's recommendation, rebuild mirrors · close: scope held — four findings fixed, mirrors regenerated via `pnpm prism:build`, both build and check pass clean.

---

## History

- 2026-07-30 [huntermcgrew/thrive-port-opus5-rule-amendments]: Amended `verification-before-done.md`, `subagent-strategy.md`, and `session-orientation.md` per PR A tasks 1-3 — evidence-naming replaces procedural verification imperatives, subagent dispatch drops the spend-the-compute tiebreaker in favor of read-heavy/small-answer shape, and the opening battery gets a task-scaled collapse clause. `pnpm prism:build` and `pnpm prism:check` both pass; removal-completeness sweep found no dangling references to the deleted language.
- 2026-07-30 [huntermcgrew/thrive-port-opus5-rule-amendments]: Fixed Eric's PR #449 findings — `session-orientation.md`'s mechanics sections now cross-reference the collapse clause instead of contradicting it; `subagent-strategy.md`'s verification cap is narrowed to same-pass self-checks (excludes Parker's finished-draft rubric review) and its "one agent" bullet argues one axis throughout; `verification-before-done.md`'s `**Why:**` now carries an independent reason. See Review Issues.
- 2026-07-30 [huntermcgrew/thrive-port-opus5-rule-amendments]: Fixed Eric's PR #449 pass-2 findings — reverted `session-orientation.md:32`'s closing-battery collapse extension (Hunter's decision; closing battery ships opening-only, question deferred as an OPEN Decision) and rewrote `subagent-strategy.md:17`'s M2 carve-out to describe the permitted review shape instead of citing a PRISM-internal filename. See Review Issues.

- 2026-07-30 [main]: Plan created by Winston (Sol dispatch, retry after subagent stall). Verdicts on 10 thrive PRs + agent registry + 2 external inputs; 8 PRs proposed as two stacks + independents; see Decisions for the 2222/2232/STE calls.
