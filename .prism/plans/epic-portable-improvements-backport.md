# Plan: epic-portable-improvements-backport

## Ticket

https://github.com/HunterMcGrew/PRISM/issues/404

## Goal

Back-port the quality improvements proven in the portable skill roster (`~/Downloads/portable-skills/`) into PRISM's canonical skill sources — the improvements only, none of the portability layer.

---

## What's in scope (the improvement package)

1. **Battery persistence** — opening-battery answers compress to one line appended to the plan's `## Sessions` section; the closing battery re-reads that `open:` line, diffs the finished work against it (Q1 becomes "scope vs. opening Bounds"), and appends a `close: scope held` / `close: drifted — <why>` verdict.
2. **Mid-flight re-anchors** — event-triggered one-line re-orientation between the batteries, with per-persona triggers (the trigger table below is the spec).
3. **Lifecycle list** — a short "The run, in order" canonical sequence near the top of each skill; doubles as a long-context anchor.
4. **Source bug fixes** — defects the port agents found while reading PRISM's generated skills (verify-then-fix list below).
5. **Targeted per-skill improvements** — sasha phase-boundary checkpointing; eric worktree-cleanup-in-closing.

## What's explicitly NOT in scope (the portability layer)

Repo map / `.repo-map.md` / first-run interview; `_shared/core.md` pointer blocks; `<plans>`/`~/worklogs` private-state layout; `~/.claude-work` references; bare-name-routing and send-out dispatch rules; host-capability detect-and-degrade rewrites. PRISM keeps its own paths, rules layer, config, and Sol machinery. Any portable text copied in must be stripped of these before landing.

---

## Implementation Tasks

> Persona-grouped. Winston's design pass (tasks 1–3) is **complete** — outcomes are recorded in `## Decisions` and baked into the Clove tasks below. Clove executes tasks 4–8.

### winston (design pass — COMPLETE, human gate cleared)

1. **[DONE] Placement of shared mechanics → `confirmed-new-rule`.** Verified against the build: `.prism/rules/*.md` are copied verbatim to every platform dir (`copyContentToPlatformDir`, `COPIED_CONTENT_AREAS` includes `rules`) and auto-loaded into every session as project instructions; Tier-1 rules (no `paths:`) also inline into AGENTS.md. Per-skill embedding is **not** load-bearing for generation — `build.ts` copies rules and generates skills independently; nothing concatenates the batteries into `shared.md`. A new always-loaded rule is therefore the native `_shared/core.md`, exactly the `context-reuse.md` precedent. See Decision "Shared mechanics land as a Tier-1 rule."
2. **[DONE] `## Sessions` spec** written into Clove task 4 at the detail bar (exact files, insertion point, literal format). Confirmed `rules/branch-plan.md` is **curated** in `seed-curation.json` (canonical and `templates/install/` copies differ) → both copies need manual edits; a new non-curated rule auto-mirrors to the seed via `writeSeedMirror`.
3. **[DONE] Verify-then-fix list confirmed against canonical `.ai-skills/skills/`.** All 8 reproduce; two fixes adjusted and one scope-widened — folded into Clove task 5 and recorded in `## Decisions`.

### clove (implementation — edit CANONICAL sources only; never hand-edit generated `.claude`/`.cursor`/`.codex`/`.agents` outputs)

**Execution shape (read first — see Decision "Execution shape: parallel edits, one serialized build"):** Lanes edit canonical sources only. **No skill lane runs `pnpm prism:build` to commit generated output** — the generated tree and seed mirror are derived state, regenerated once at the end (task 8). Lanes may run `pnpm prism:check-types` / `pnpm prism:test` locally, but must not commit `.claude/`, `.cursor/`, `.codex/`, `.agents/`, `templates/install/` (except the two hand-curated branch-plan edits in task 4), or `AGENTS.md`.

4. **Foundation lane — the shared-mechanics rule + `## Sessions` plan section.** Land/spec this first so every skill lane references the exact rule name, section headings, and pointer wording.

   a. **Create `.prism/rules/session-orientation.md`** (new Tier-1 rule — no `paths:` frontmatter, so it auto-loads every session). Follow the `.prism/rules/` house format (`# Title` → `## Purpose` → rule → `**Why:**` → `**How to apply:**`), matching `context-reuse.md`. Content carries the **generic** mechanics once:
      - **Opening Orientation Battery** — the four questions verbatim from the current skill bodies: Intent / Ambiguity / Bounds / Approach, including the mid-dispatch calibration clause ("there is no user available mid-dispatch — do not stall; for each load-bearing gap pick a defensible default, state the assumption, and proceed. Escalate only by emitting a typed verdict (`needs-replan` / `blocked` / `needs-human`)").
      - **Battery persistence** — opening answers compress to the `## Sessions` `open:` line at session start; the closing battery re-reads it and diffs finished work against the opening `Bounds`.
      - **Closing Re-Orientation Battery** — the four closing questions verbatim (Scope boundary / Unasked assumptions / Edge recall / Verification honesty), plus "append the `close:` verdict to the same `## Sessions` line."
      - **Mid-flight re-anchors** — the generic rule: emit a one-line re-orientation at event boundaries; each persona declares its own trigger events (the persona-specific trigger line stays in the skill body, sourced from the roster table below).
      - **Lifecycle list** — the generic instruction: each skill carries a short "The run, in order" sequence near the top as a long-context anchor.
      - **`## Who runs this rule` / citation list** — name that every persona skill loads it (state the membership rule "every persona skill," not a count, per `writing-voice.md § Count rules`).
      - Verification: content-only, no build effect for the source edit; final propagation verified in task 8. Leave the build's "unclassified file" seed-mirror warning as-is (verbatim mirror is correct) — do **not** add it to `seed-curation.json`.

   b. **Add `## Sessions` to the plan template in `.prism/rules/branch-plan.md`** — insert a new section immediately **before** `## History` (currently line 316) in the "Plan File Template" block, with this literal content:
      ```markdown
      ## Sessions

      Append-only orientation log — one line per skill session. The opening battery compresses to the `open:` clause at session start; the closing battery appends the `close:` verdict to the same line at session end.

      - YYYY-MM-DD [<branch>] open: Intent — <one line>; Bounds — <one line>; Approach — <one line> · close: <scope held | drifted — why>

      ---
      ```
      Also add one line to `## Maintenance Expectations` ("Append to `## Sessions` at session start and close — never delete entries"). Verification: content-only.

   c. **Mirror the same `## Sessions` addition into `templates/install/.prism/rules/branch-plan.md`** (the curated consumer copy — it differs from canonical and is NOT auto-mirrored, so it must be hand-edited). Match the consumer copy's existing section ordering; place `## Sessions` before its `## History`. Verification: content-only; parity is checked by `pnpm prism:check` (`checkSeedDrift`) in task 8 — but note curated files are exempt from drift, so confirm the section landed by reading the file.

5. **Skill lanes — one lane per persona skill in `.ai-skills/skills/`.** Each lane edits ONLY that skill's `shared.md` (canonical-source-disjoint → lanes never collide). For each skill the lane applies the improvement package AND that skill's verify-then-fix item (below) in the same lane, so no skill file is touched by two lanes.

   Per-skill improvement-package edits:
   - **Replace** the skill's full `## Opening Orientation Battery` and `## Closing Re-Orientation Battery` body text with a short **pinned pointer** to `session-orientation.md` (imperative, per `skill-authoring.md § Externalization mechanics`: "Run the Opening/Closing Orientation Battery per [`session-orientation.md`](../../../.prism/rules/session-orientation.md)"), keeping the placement gate in the workflow and the DoD checkboxes ("Opening battery answered before X" / "Closing battery answered before stopping") **intact** — the rule carries the content, the body keeps the *when*.
   - Keep any **persona-specific** battery framing that is NOT in the generic rule (e.g. Winston's "before any evaluation or planning work").
   - Add the persona's **re-anchor trigger line** verbatim from the roster table in `## Per-persona re-anchor trigger spec` below.
   - Add the persona's **lifecycle list** ("The run, in order") near the top if not already present.
   - **Strip every portability artifact** before landing (grep the added text for `repo-map`, `_shared`, `.claude-work`, `worklogs` — must be clean).
   - Utilities `prism-handoff` / `prism-review-loop`: apply only what fits a persona-less utility (lifecycle list + battery pointer if they run batteries; no persona re-anchor line if none applies). `prism-onboarding` (Atlas): lifecycle list + batteries only.
   - Guard the body line cap: the generated Claude `SKILL.md` body must stay ≤500 lines (`MAX_SKILL_BODY_LINES`) — replacing full battery text with a pointer should *reduce* size, but verify with `pnpm prism:test` if a body was already near the cap.

   Suggested batching for Sol dispatch (each entry is one lane): (a) core dev — architect, code-dev, debugger, code-review-self, code-review-pr, documentation; (b) workflow — ticket-start, user-stories, prd, design, qa-test-plan, changelog, standup-summary, retro, doc-walker, refactor-scout, surface-audit, conductor; (c) business — founder, market-research, finance, marketing, sales, data, customer-success, recruiting, legal; (d) utilities — handoff, review-loop, onboarding.

   **Verify-then-fix items** (each folded into the named skill's lane; all 8 confirmed reproducing against canonical sources — fixes adjusted where noted):
   - **`prism-ticket-start`** — `shared.md:243` derives the fallback branch as `<username>/thr-###-<title-slug>` (stale Thrive prefix). Fix: mirror `shared.md:378`, which already uses the correct `${TICKET_PREFIX_LOWERCASE}` token → change line 243 to `<username>/${TICKET_PREFIX_LOWERCASE}-###-<title-slug>`. (Do NOT hardcode `prism` — the token is the portable form.)
   - **`prism-refactor-scout`** — `shared.md:133` DoD checks candidate `status` is `drafting`; the state schema's candidate `status` enum is `{pending, grilling, skipped, deferred, committed}` (confirmed in `.prism/skills/prism-refactor-scout/step-0*.md`) — `drafting` is undefined. Fix: change `drafting` → `grilling` (the in-progress status; a candidate stuck mid-grill at close is the real failure the DoD guards).
   - **`prism-prd`** — two fixes:
     (a) Brownfield never sets `stakes` (init sets `stakes: null` at `step-01-init.md:28`; greenfield advances to `greenfield-step-02-stakes.md`, brownfield advances to `brownfield-step-02-explore.md` with no stakes step), yet `step-06-review.md` branches on `stakes` (`internal`/`launch` → rubric; `hobby` → skip) — with `null` it falls through. Fix: add a one-question stakes confirm at brownfield init (in `step-01-init.md` for the brownfield branch, or a `brownfield-step-01b-stakes` step) that sets `stakes` before `step-06-review`. While there, drop the now-stale `step-01-init.md:38` note claiming brownfield "lands in PR-3.2 / stub returns pending" — brownfield is implemented.
     (b) Greenfield with no live user: the stakes-calibration escape (`shared.md:15`) and opening-battery calibration (`shared.md:121`) already prevent *inventing* interview answers by emitting `needs-human`. Adjusted fix: add an explicit early no-live-user guard at greenfield init that emits a typed verdict up-front rather than discovering it at the stakes interview. Recommend `needs-human` (matches the existing stakes-escape convention — an interview needs human input) over `blocked`; note the label choice in the fix. This is a hardening, not a from-scratch fix.
   - **`prism-debugger`** — `shared.md:194` and `:300` assert "Source files stay untouched," contradicting Phase 4 (Instrument, `:243`) which adds `[DEBUG-<hash>]` logging to source, cleaned at Phase 6 (`:287`). Fix: reword both to the true invariant — "no *persistent* source modification; temporary Phase-4 instrumentation is added and removed at the Phase-6 cleanup gate." Phase-boundary plan checkpointing rides in as part of the re-anchor package (the Sasha re-anchor line already says "at each phase transition (alongside the plan checkpoint)"): add a stub `## Debugged Issues` entry at Phase 2, updated at each transition. Note: `.prism/sasha-state.json` already gives JSON-based resume; the plan checkpoint's marginal value is compaction survival — keep it, it's additive and coherent with the re-anchor line.
   - **`prism-documentation`** — `shared.md:254` DoD says "presenting its path to the user is the final act before stopping," but `shared.md:233` ships the docs afterward (commit → detect PR → push → conditional create → two-path closing, per `shipping-flow.md`). Fix: align the DoD so the shipping flow (through the two-path closing) is the final act, not presenting the path.
   - **`prism-code-review-self`** — hardcoded `main` in 4 branch-diff commands (`shared.md:62, 141, 231, 395`: `git diff main...HEAD`). Adjusted fix: replace `main` with the existing **`${DEFAULT_BRANCH}` build token** (already used in `followup-scope.md:5,16`) — NOT runtime `origin/HEAD` resolution. The token is the established, per-team-static convention and is consistent with the build's substitution system.
   - **`prism-code-review-pr`** — worktree cleanup lives only in `worktree-mode.md` and the procedure section; the DoD (`shared.md`, "posting the summary comment … is the final act") omits it, so a worktree-mode run that follows the DoD literally leaves the worktree un-torn-down. Fix: add a conditional line to the DoD/closing — "in worktree mode, tear down the worktree per `worktree-mode.md` before stopping."
   - **`prism-architect`** — add **quick-consult mode** per the resolved Decision below. Carve out the `shared.md:115` rule "No evaluation or planning begins without a resolved plan": a planless quick architecture question gets an inline evaluation (battery answers stated in chat, no plan ceremony). Add the escalation trigger — the moment scope grows past one question, a recordable decision emerges, or implementation planning starts, shift to full mode, resolve/create the plan, and retroactively record decisions made during the consult. Implementable as a mode gate ahead of the Batch-2 plan-lookup step. Also (scope-widen from Bug 6): `prism-architect/shared.md:104` hardcodes `git diff origin/main...HEAD --stat` in Winston's own startup — apply the same `${DEFAULT_BRANCH}` token fix here. (Tree-wide sweep found the hardcoded-`main` diff pattern in exactly these two skills.)

6. **[folded into task 5]** — verify-then-fix items are executed inside each owning skill's lane, not as a separate lane, to avoid two lanes touching one file.

7. **[folded into task 5]** — targeted per-skill improvements (sasha checkpointing, eric cleanup) are in their skill lanes above.

8. **[DONE] Integration + single serialized build.** After all canonical edits (tasks 4–5) are on one integration branch: run `pnpm prism:build` ONCE to regenerate the entire `.claude`/`.cursor`/`.codex`/`.agents` tree + seed mirror + AGENTS.md Tier-1 block (which now includes `session-orientation.md`), commit the generated tree in one commit, then run `pnpm prism:check` to green (build drift, types, tests, manifest, crossref-lint). Generated diffs are expected and land here, not per-lane. Build committed as `2c68175`; `pnpm prism:check` green on first re-run after one in-scope fix (see Decisions).

### briar → eric (review)

9. Self-review then PR review per the normal loop. Review focus: no portability artifacts leaked into canonical content (grep `repo-map`, `_shared`, `.claude-work`, `worklogs` — clean); re-anchor trigger lines match each persona's actual work shape; `## Sessions` wording identical across the rule, canonical `branch-plan.md`, and the curated `templates/install/` copy; DoD checkboxes for the batteries survived the pointer swap; every touched skill still generates ≤500-line bodies (`pnpm prism:test`).

## Per-persona re-anchor trigger spec

Source: each portable skill's "Persona notes on the shared core" block (`grep "Re-anchor triggers for" ~/Downloads/portable-skills/skills/*/SKILL.md` prints the full table). Mapping: winston=prism-architect, sasha=prism-debugger, clove=prism-code-dev, briar=prism-code-review-self, eric=prism-code-review-pr, eli=prism-documentation, nora=prism-ticket-start, mira=prism-user-stories, parker=prism-prd, pixel=prism-design, reese=prism-qa-test-plan, sage=prism-changelog, lilac=prism-standup-summary, iris=prism-retro, theo=prism-doc-walker, ren=prism-refactor-scout, zoe=prism-surface-audit, sol=prism-conductor, vera=prism-founder, kora=prism-market-research, ellis=prism-finance, charlie=prism-marketing, quinn=prism-sales, tess=prism-data, remy=prism-customer-success, penny=prism-recruiting, lex=prism-legal.

---

## Decisions

- **Improvements yes, portability no.** The scope split above is the contract; the portable roster is a reference implementation, never a copy source. Reason: PRISM's rules layer, build system, and Sol machinery already own what the portability layer re-invented for repo-independence.
  - → no promotion needed (scope contract for this epic; not a general rule).
- **Shared mechanics land as a Tier-1 rule, not ~30 body copies** (`confirmed-new-rule`). Reason: `.prism/rules/*.md` copy verbatim to every platform and auto-load every session (project instructions) — the native `_shared/core.md`. Verified per-skill embedding is not load-bearing for generation; the build copies rules and generates skills independently. A rule (not a reference) is the only externalization that keeps the batteries "present when reasoning begins" — moving a lens to a load-on-demand reference would degrade adherence (`skill-authoring.md`). Each skill keeps the pinned placement gate + DoD checkboxes + persona-specific re-anchor line; the rule carries the generic content.
  - **Tradeoff:** one always-loaded rule adds its length to every session's base context (including non-PRISM chats), vs. de-duplicating ~27 drifting copies. Same tradeoff `context-reuse.md` already accepted; drift-elimination wins.
  - → no promotion needed (recorded here; the rule itself is the durable surface).
- **Execution shape: parallel canonical-source lanes, one serialized build.** `pnpm prism:build` regenerates the ENTIRE generated tree + seed mirror + AGENTS.md from canonical sources and is idempotent (`writeFileIfChanged`). If N parallel worktree lanes each ran the build and committed generated output, they'd N-way-conflict on the shared artifacts (rules copies, AGENTS.md, codex-config, sync-manifest) even though their skill-source edits are disjoint. Chosen approach: lanes edit canonical `shared.md` only (disjoint → trivial merges), no lane commits generated output, and a single serialized `pnpm prism:build` + `pnpm prism:check` at the end (task 8) derives the whole generated tree once. Considered: per-lane build+commit (rejected — pure conflict on derived state); fully sequential single-branch (viable fallback if worktree merge adds friction — same final-build discipline, zero merge step).
  - → no promotion needed (execution tactic for this epic).
- **One lane per skill, verify-then-fix folded in.** Eight skills (ticket-start, refactor-scout, prd, debugger, documentation, code-review-self, code-review-pr, architect) are both improvement-package targets and bug-fix targets. Running the bug fix inside the same lane avoids two lanes touching one `shared.md`. Reason: file-disjoint lanes are the whole basis for safe parallelism.
  - → no promotion needed (decomposition tactic).
- **Every reported source bug verify-then-fix — all 8 reproduce; three adjusted.** Reason: port agents diagnosed against generated copies (`cross-agent-handoff-accountability.md`). Adjustments from canonical verification: (1) ticket-start fix uses the existing `${TICKET_PREFIX_LOWERCASE}` token (line 378's pattern), not a literal; (2) code-review-self fix uses the existing `${DEFAULT_BRANCH}` token (`followup-scope.md` precedent), not runtime `origin/HEAD`, and the hardcoded-`main` pattern also hits `prism-architect:104` (scope widened by one skill); (3) prd greenfield-no-user is a hardening — the `needs-human` escape already prevents invented answers, so the fix adds an explicit early guard and recommends the `needs-human` verdict over `blocked`.
  - → no promotion needed (per-ticket verification record).
- **Quick-consult mode ports, with winston self-judging the grain** (resolved by Hunter 2026-07-09; confirmed implementable). A quick architecture question with no ticket gets an inline evaluation — no plan ceremony, battery answers stated in chat. The escalation trigger keeps the discipline guarantee: the moment the consult deepens (scope grows past one question, a decision worth recording emerges, or implementation planning starts), winston shifts into full mode — resolves or creates the plan then, and retroactively records the decisions already made. Implementable as a mode gate ahead of the Batch-2 plan-lookup requirement (`shared.md:115`). Considered: not porting, to preserve "no evaluation without a resolved plan." Rejected: the strict form makes people route around winston for small questions, costing more discipline than the escape hatch does.
  - → promoted to `.prism/architect/` on plan close (persona-behavior change other personas rely on when handing quick questions to Winston).
- **`prism-ticket-start` body trimmed by one paragraph to clear the 500-line cap.** The generated Claude `SKILL.md` landed at 501 lines (over `MAX_SKILL_BODY_LINES`) after the battery-pointer swap — the redirect guidance was split across two adjacent paragraphs in `.ai-skills/skills/prism-ticket-start/shared.md` ("Ownership & Handoff" and "Nora redirects to the correct next persona"), which said overlapping things. Merged them into one paragraph; no content dropped, generated body now 499 lines.
  - → no promotion needed (line-count fix local to one skill's source).

---

## Review Issues

### Closing-battery persona elaboration dropped in most skill lanes

- **Severity:** `major`
- **Status:** `fixed`
- **File:** `.ai-skills/skills/prism-founder/shared.md:146` (representative; pattern repeated across skill lanes — finance, legal, sales, data, customer-success, recruiting, marketing, conductor, changelog, design, prd, qa-test-plan, standup-summary, surface-audit, ticket-start, user-stories, refactor-scout)
- **Problem:** Plan task 5 said to "keep any persona-specific battery framing that is NOT in the generic rule" when swapping the full Opening/Closing battery text for a pinned pointer. Every skill's original Closing battery had domain-specific parenthetical examples per question (e.g. founder's Edge recall: "empty strategy doc, no mission stated, conflicting decisions, absent stakeholder"; finance's: "zero revenue, no ACV, absent burn rate, negative margin"). In most lanes the pointer swap dropped these entirely, leaving a bare "immediately before emitting any `done`-class verdict." with no domain examples.
- **Round-2 verification:** commits `a8c071a` and `c6f366b` (+ `881988c` follow-up) restore the domain-specific parentheticals as a trailing sentence on each affected pointer line. Spot-checked 7 lanes across both commits (founder, changelog, design, refactor-scout, ticket-start, surface-audit, data) against `origin/main`'s pre-swap text byte-for-byte — every restored clause matches the original wording verbatim, condensed into one sentence per question, no invented content. Confirmed the 5 skills that needed no restoration (architect, code-dev, code-review-self, doc-walker, onboarding) truly had generic pre-swap text with no domain parentheticals to lose — verified against `origin/main`, not just taken on the commit message's word. No re-inlining of the full numbered battery lists occurred anywhere — every fix stayed a single trailing sentence appended to the pointer paragraph.
- **Suggested fix:** N/A — resolved.

### Ren's Sessions-persistence stance is unstated

- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `.ai-skills/skills/prism-refactor-scout/shared.md:101`
- **Problem:** Ren's refactor plan (`.prism/plans/refactor-<slug>.md`) uses the branch-plan template, which now includes `## Sessions` (task 4b). Unlike Sol/Iris/Zoe/Lilac, Ren's shared.md doesn't say whether battery answers persist to that `## Sessions` line or are exempt like the other four non-ticket-plan personas — an ambiguity, not a clear defect, since Ren does own a plan file in the standard template.
- **Round-2 verification:** commit `a8c071a` adds a clause to Ren's Opening battery pointer: battery answers fold into the refactor plan's `## Decisions` (grill-pass rationale) rather than a `## Sessions` entry, exempting Ren with the same reasoning already applied to Sol/Iris/Zoe/Lilac. Confirmed present and correctly worded.
- **Suggested fix:** N/A — resolved.

## History

- 2026-07-09 [claude/prism-skills-portability-f37a25]: Plan created — backport spec drafted from the completed portable-roster build; see the improvement package and verify-then-fix list.
- 2026-07-09 [claude/prism-skills-portability-f37a25]: Briar self-review — confirmed all 8 verify-then-fix items correctly applied, portability artifacts clean, `## Sessions` wording identical across the 3 surfaces, DEFAULT_BRANCH tree-swept clean, `pnpm prism:check` green (485/485); found the closing-battery persona-elaboration drop across ~20 lanes (Major) and Ren's unstated Sessions stance (Minor). See `## Review Issues`.
- 2026-07-09 [claude/prism-skills-portability-f37a25]: Open question closed — quick-consult ports with winston-judged grain and an escalation trigger; see Decision.
- 2026-07-09 [claude/prism-skills-portability-f37a25]: Winston design pass at the Sol gate — placement confirmed as a Tier-1 rule, all 8 bugs verified reproducing (3 fixes adjusted, Bug 6 scope widened to architect), execution shape set to parallel edits + one serialized build; `## Sessions` and rule specs written to Implementation Tasks; `## Ticket` set to issue #404.
- 2026-07-09 [claude/prism-skills-portability-f37a25]: Integration lane (task 8) — regenerated the full generated tree in one commit (`2c68175`) after merging a redundant redirect paragraph in `prism-ticket-start/shared.md` to clear the 500-line body cap; `pnpm prism:check` green (485/485 tests, types, manifest, crossref-lint).
- 2026-07-09 [claude/prism-skills-portability-f37a25]: Round-2 self-review — both round-1 Review Issues confirmed fixed (persona-specific closing framing restored across all affected lanes, verified byte-for-byte against `origin/main`; Ren's Sessions-persistence clause added). No regressions, no over-restoration, portability grep clean, `## Sessions` identical across all 3 surfaces, `pnpm prism:check` green (485/485). Branch ready for PR.

---

## Acceptance Criteria

### Behavioral

- [ ] Given any persona skill session completes its opening battery, When the plan is inspected, Then a `## Sessions` entry with the `open:` line exists (or the skill stated answers inline where no plan applies) (REQ-1)
- [ ] Given a persona finishes its run, When the closing battery executes, Then it references the opening answers and appends a `close:` verdict to the same entry (REQ-1)
- [ ] Given the fixed bugs' trigger conditions (ticket-start branch derivation, refactor-scout DoD status, prd brownfield stakes, prd greenfield-no-user guard, debugger instrumentation invariant, documentation DoD, code-review-self default branch, code-review-pr worktree cleanup, architect quick-consult), When exercised, Then each behaves per its fix description (REQ-2)
- [ ] Given a planless quick architecture question, When Winston is invoked, Then he answers inline without plan ceremony and escalates to full mode (resolving/creating a plan and retroactively recording decisions) the moment scope deepens (REQ-3)

### Non-behavioral

- [ ] `pnpm prism:check` passes (build drift, types, tests, manifest, crossref-lint) (REQ-1)
- [ ] No portability artifacts in canonical content (`repo-map`, `_shared`, `.claude-work`, `worklogs` grep-clean) (REQ-1)
- [ ] Every persona skill carries its lifecycle list and its re-anchor trigger line; the batteries' DoD checkboxes survive the pointer swap (REQ-1)
- [ ] `## Sessions` wording is identical across `session-orientation.md`, canonical `branch-plan.md`, and the curated `templates/install/.prism/rules/branch-plan.md` copy (REQ-1)
- [ ] Branch-diff commands use `${DEFAULT_BRANCH}`, not hardcoded `main`, in code-review-self and architect (REQ-2)

### AC Sync Log

| Date | Agent | Action | Plan | Ticket |
| ---- | ----- | ------ | ---- | ------ |
| 2026-07-09 | Winston | AC refined at design gate (added quick-consult + widened bug list) | epic-portable-improvements-backport | #404 |
