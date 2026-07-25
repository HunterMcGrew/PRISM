# Plan: response-shape-contract

## Goal

Give every persona a shared chat-output contract — verdict first, chunked body, a state line on phased runs, one bounded next action — landed once in the portable roster's shared core and once as a new PRISM rule, with the three verdict-burying personas reordered to match.

---

## Decisions

- **The contract is a new sibling rule, never an edit to `writing-voice.md`.**
  - **Root cause:** `writing-voice.md` scopes itself to durable artifacts and explicitly excludes ad-hoc conversation (`.prism/rules/writing-voice.md:5`). It is also Tier 1 / always-loaded (`.prism/spec/adrs/_toolkit/0035-rule-loading-tiers.md:26`), so a chat-shaped directive inside it reaches every doc, ADR, and commit-message surface.
  - **Alternatives considered:** extend `writing-voice.md` § "Answer first, one offer at a time"; add a persona-level section to each SKILL.md; ship as a standalone skill.
  - **Chosen approach:** a new rule at the same tier, sibling to `writing-voice.md`. Beats extending it (would put a progress marker like `Step 3 of 6` in scope for ADRs — the exact session-context leakage that file's own anti-pattern section bans). Beats per-persona sections (29 copies of a format rule fork; the roster's own history shows quoted contracts drift).
  - **Implementation guidance:** `writing-voice.md` governs durable artifacts, `response-shape.md` governs chat. Cross-reference each from the other in one line so the boundary is readable from either side.
  - **→ promotion verdict pending close.**

- **One home per surface: `_shared/core.md` for portable, `.prism/rules/` for PRISM. Not 29 SKILL.md edits.**
  - **Root cause:** every portable skill reads `_shared/core.md` at Step 0; every PRISM session loads Tier 1 rules. Both already have a single load path that reaches all consumers.
  - **Alternatives considered:** per-persona output-shape sections.
  - **Chosen approach:** single shared home, matching how the orientation batteries are carried. Persona bodies change only where their *existing* prescribed order contradicts the contract.
  - **Implementation guidance:** the only persona-body edits in this plan are the three ordering fixes in Tasks 2–4 / 8, plus the two follow-on fixes in Tasks 2b and 4b that the 2026-07-25 cold read forced. All five are the same species — a persona's *existing* prescribed output order or closing shape contradicting the contract. Everything else inherits.
  - **→ promotion verdict pending close.**

- **The contract governs cross-references and open items, not just section order.**
  - **Root cause:** an early draft of this plan's own closing message carried `Task 10 is the only real proof and it's unrun` — a task never described in the conversation, whose number had silently shifted to 12 in a renumbering. The same message listed `plan is on main, needs a branch` with no recommendation attached. Both are BLUF-compliant on order and still cost the reader work: one requires a scroll to redeem a handle, the other hands over analysis while withholding the conclusion.
  - **Alternatives considered:** treat these as author judgment rather than contract clauses; add them only to the reviewer personas.
  - **Chosen approach:** three explicit clauses in the contract — references carry their content, open items carry a recommendation, blocking items graduate from bullet to structured ask. Judgment was already available and the defect still shipped twice in one message, which is the argument for making it a clause.
  - **Implementation guidance:** these are part of Task 1's core.md section and Task 6's PRISM rule, in the same list as the ordering rules. The blocking-ask clause explicitly extends `_shared/core.md` § House rules line 122 rather than duplicating it — the existing bullet owns the mechanism, the new clause owns the trigger.
  - **→ promotion verdict pending close.**

- **State line is conditional on phased runs, not universal.**
  - **Root cause:** a state line on a one-shot answer is noise; on a 5-phase review it is the whole point.
  - **Chosen approach:** the contract names the trigger (the run has phases) rather than mandating the line. Phased personas: winston, sasha, briar, eric, sol, zoe, iris, reese, theo, review-loop, handoff.
  - **→ promotion verdict pending close.**

- **Four `i-have-adhd` rules deliberately rejected.** Lead-with-action (loses to verdict-first — an action with no verdict means acting before agreeing), cap-lists-at-5 (truncation hides work; chunk into named phases instead), specific-time-estimates (an agent guessing "15 minutes" is fabricating), blanket-no-closing (kills the "Still open:" list, which is confirmed useful).
  - **→ promotion verdict pending close.**

- **The rule ships to consumers as a curated seed twin, with provenance de-identified.** (Resolved 2026-07-25 — was an open question.)
  - **Root cause of the question:** the rule's canonical rationale is personal (one reader's ADHD, dated feedback sessions), which reads as inapplicable to a consumer team and cannot survive the seed's literal guards.
  - **Alternatives considered:** (a) don't ship — keep it canonical-only; (b) ship verbatim; (c) ship as a curated twin with provenance neutralized.
  - **Chosen approach:** (c). Ship is settled by precedent, not preference — `templates/install/.prism/rules/writing-voice.md` already ships, so a chat-output sibling that stays behind would give consumers "answer first" for durable artifacts and nothing for chat. The discriminator holds on the other side too: `.prism/rules/skill-authoring.md` is canonical-only because it is maintainer content (Test 3). A rule governing how a consumer's own personas reply is consumer content.
  - **Why not verbatim:** `SEED_DOGFOODING_PATTERN` (`scripts/ai-skills/literal-guard.ts:48-49`) fails the build on `THR-*`, `PRISM-NNN`, and `\bLinear\b`; `runInstallAdrGate` (`crossref-lint.ts:871`) forbids any `ADR-NNNN` under `templates/install/`. A verbatim copy carrying dated references and the tier ADR citation gets a red build.
  - **Implementation guidance:** apply the curation boundary's Amendment C.3 treatment (`.prism/plans/followup-seed-twin-boundary-rule-pressure-test.md:81`) — drop or de-identify PRISM's own provenance, the same way `THR-1775 audit` ships as `an early-Phase audit`. Canonical keeps the real why (ADHD, the 2026-07-24/25 sessions, the four rejected `i-have-adhd` rules). The twin states the rule on general grounds: scannability, and the cost to a reader of re-deriving their position in a thread. No person named, no dates, no PR numbers, no ADR citation. The rule itself — verdict-first, chunking, state line, one next action — is identical on both surfaces; only the rationale is neutralized.
  - **Reversed during implementation.** Task 6's canonical restatement was authored on general grounds from the start — no ADHD framing, no dates, no PR/issue numbers — so the premise motivating a curated rewrite (canonical carries provenance the twin must strip) never held. The twin is a plain build-output mirror, byte-identical to canonical; `rules/response-shape.md` is not in `seed-curation.json`'s `curated` list. See `## Seed twin classification` and `## Review Issues` (PR review pass 2) for the verified state.
  - **→ promotion verdict pending close.**

- **Every contract clause names the reader's cost, not just the writer's obligation.**
  - **Root cause:** the first seven clauses were drafted as prescriptions ("verdict first", "chunk past ~5"); the two added later after the defect shipped ("references carry their content", "open items carry a recommendation") also state what the omission costs the reader. Re-reading the set side by side, only the latter two read as rules — a directive with no stated cost reads as taste, and the next author who disagrees simply disagrees.
  - **Alternatives considered:** keep the clauses terse and let the section preamble carry the single shared why; add the why only to the clauses most often violated.
  - **Chosen approach:** every clause carries its own one-clause why. A shared preamble why does not survive quotation — clauses get lifted individually into persona files and reviews, and the why is what travels with them.
  - **Implementation guidance:** the resolved text is inline in Task 1, to be inserted verbatim. Do not trim the why-clauses for brevity.
  - **→ promotion verdict pending close.**

- **Cross-references inside the contract use section names, never line numbers.**
  - **Root cause:** Task 1's blocking-ask clause instructed the implementer to write `## House rules` (line 122) into `core.md`. The new section inserts *above* House rules, which moves that bullet to roughly line 150 — the file would have shipped a wrong line number the moment it landed, inside the clause set that forbids naked handles.
  - **Alternatives considered:** keep the line number and update it post-insertion.
  - **Chosen approach:** section name only. A line number in a file that is still being edited is a handle that costs a scroll and then fails to redeem — the same defect the "every reference carries its own content" clause exists to prevent. Post-insertion correction just moves the staleness to the next edit.
  - **Implementation guidance:** applies to Task 1 and to Task 6's PRISM restatement. Plan-side task descriptions may cite line numbers (they are read once, at implementation time); the shipped rule text may not.
  - **→ promotion verdict pending close.**

- **Winston's verdict line goes above the mode blockquote, not below it.**
  - **Root cause:** Task 3 said "above `### Understanding`", which leaves two valid insertion points — above or below the `> _Running evaluate mode…_` blockquote at line 222. Two implementers would produce different files.
  - **Chosen approach:** above the blockquote, immediately under `## Output format`. The blockquote is a state line; the contract puts the verdict first, so a state line above the verdict would put the roster's own architect out of compliance with the rule he ships.
  - **→ promotion verdict pending close.**

- **Task 1's example tokens are shapes, not instances.** (Resolved 2026-07-25 — unblocks Task 1.)
  - **Root cause:** the contract's own clause set is a list of *kinds* of reference, illustrated by example. Three of those examples were lifted from the live context they were written in, so they point at real objects. `#442` is the PRISM issue this plan's own Task 9 cites — it fails Task 1's own de-identification constraint and its own verification grep (`#[0-9]{2,}`), which is why clove reverted rather than improvise. Two more of the same species survived that catch: `Task 10` / `Task 12 (read the output cold)` are *this plan's* task numbers, and `**Reorder briar's output** — the verdict is last today` asserts a fact about briar's file that Task 2 makes false the moment it lands.
  - **Alternatives considered:** (a) swap `#442` for a low digit like `#7` — passes the grep on digit-count and nothing else, and a single-digit issue number is a real object in a young repo; (b) drop the issue-number example entirely — loses the species readers are most likely to write; (c) fix only `#442`, since that is the one that fails the grep.
  - **Chosen approach:** replace all three with tokens that cannot resolve to anything. `#442` → `issue #<n>`; `Task 10` and `Task 12 (read the output cold)` → `Task 3` and `Task 3 (regenerate the fixtures)`; the bolded-lead example → `**Swap the retry backoff** — the current one hammers the API on a cold start`. Rejected (c) because the grep is a *proxy* for "carries no live provenance" — passing the proxy while leaving two live references in the same eight lines is exactly the kind of green-check-on-a-broken-thing this contract exists to stop.
  - **Implementation guidance:** `issue #<n>` uses an angle-bracket placeholder deliberately — any digit reads as resolvable and invites the lookup. `Task 3` is used identically in both halves of the reference clause on purpose: the contrast the clause teaches is *the same handle* with and without its content, which reads sharper than comparing two unrelated task numbers. The bolded-lead example was swapped for a reason distinct from de-identification — it made a temporal claim ("is last today") about a file this same commit series changes, so it would have shipped false on day one. Same species as the line-number defect in the House-rules cross-reference: a shipped assertion the shipping commit invalidates.
  - **→ promotion verdict pending close.**

- **The cold read measures the emitted template, not the skill file's physical lines.** (Resolved 2026-07-25 after Task 5b failed briar and sasha.)
  - **Root cause:** Task 5b scored the first three and last three *physical lines of the SKILL.md section*. That is not the artifact AC-1 is about. AC-1's own evidence line says "run briar on a branch with at least one Minor finding → read the chat output" — the measured surface is the emitted message. Briar and sasha "failed" because each carries a sentence above its template that explains the section to the agent loading the file (briar's "Chat output is a quick-scan checklist only…", sasha's "The diagnosis deliverable… has five sections"). Neither sentence is ever emitted. Winston passed the same check only because he happens to have no such preamble — luck, not compliance.
  - **Alternatives considered:** (a) move each preamble below the template so the file's first lines are the template's first lines; (b) shorten the preambles to fit inside the three-line window; (c) hoist each verdict line above its preamble; (d) drop the cheap check and wait for Phase 3's behavioral task 12.
  - **Chosen approach:** redefine what the check reads — bound the *emitted block* first, then apply the first-three / last-one test to that block (Task 5c). Rejected (a) and (b): both optimize the file for a reader who does not exist, and (a) puts the template above the constraint that governs it, which is a real regression in how the agent reads the file. Rejected (c): it recreates the same ambiguity one line higher — an agent-facing sentence and an emitted line still sit adjacent with nothing marking the boundary. Rejected (d): the cheap check is worth keeping precisely because it caught two genuine defects underneath the measurement error, and both are fixed in this re-plan (Tasks 2b, 4b).
  - **Implementation guidance:** the preambles stay exactly where they are. The measurement error is the *only* thing wrong with them, and once the check reads the template the question dissolves — which is the strongest available evidence that the check, not the files, was the defect. Task 5c states the block boundary explicitly for each of the three personas so two readers score them identically, and pre-clears winston's `### A/P/C menu` as a non-finding (a mid-run decision gate is not the close).
  - **→ promotion verdict pending close.**

- **Briar's closing handoff has one target, not three — the routing rule already resolves it.**
  - **Root cause:** `## Review format` ends with "Then the handoff recommendation (clove, eric, or eli)," which instructs briar to emit a menu and directly violates the contract's "exactly one closing next action, bounded." This is a real defect in the *emitted* message, not an artifact of the 5b measurement error, so it survives the re-framing above and had to be fixed on its own merits.
  - **Alternatives considered:** (a) accept that briar's handoff is genuinely three-way and carve an exception into the contract for reviewer personas; (b) restate the routing table inside `## Review format` so the emitted line is one name and the branches are visible in place.
  - **Chosen approach:** emit the single resolved name and cross-reference `## Clean-Review Closing` by section name. Rejected (a) on the facts: the handoff is not three-way at emit time. `## Clean-Review Closing` is already a total decision procedure (PR exists → eric; no PR and all-docs diff → eli; no PR otherwise → clove; issues found → clove, or eli when the diff is docs-only), and briar already holds both inputs — she ran `gh pr list --head` in Phase 1 and captured the changed-file list there. The three names in `## Review format` are an *authoring-time* enumeration that leaked into a *runtime* instruction. Rejected (b) because a second copy of a routing table in the same file forks the moment either copy is edited — the same failure the shared core's `acVerdicts` note names when it says the roster's history shows quoted contracts drift.
  - **Implementation guidance:** Task 2b. Cross-reference by section name only, per the *Cross-references use section names, never line numbers* decision above.
  - **→ promotion verdict pending close.**

- **Sasha gets a verdict line above her sections, duplicating `### Root Cause` on purpose.**
  - **Root cause:** Task 4 moved `### Root Cause` to second position, which fixed the *ordering* but not the contract. Sasha's emitted message still opens with `### Bug Summary` — a restatement of what is broken, which is the question, not the answer. And the section ends on Follow-up bullets with no next action stated anywhere in it; the actual closing offer lives twenty lines away in `## Next persona`, so two sections own the end of the message and neither points at the other.
  - **Alternatives considered:** promote `### Root Cause` above `### Bug Summary` outright — an unlabelled root cause with no statement of what was being diagnosed is disorienting, and the contract's own answer to that tension is the bolded-lead clause (a lead carries a what *and* a why), not a section swap.
  - **Chosen approach:** a one-line `**Root cause:**` verdict at the top of the emitted block, the five sections unchanged beneath it, and one closing line pointing at `## Next persona` as the owner of the single next action. The duplication with `### Root Cause` is intentional and matches winston exactly: Task 3 gives him a `**Verdict:**` line while `### Recommendation` keeps its full reasoning, and this plan already ruled that explicitly. Top line is the scan surface, section is the detail — same call, same reason, now consistent across both diagnostic personas.
  - **Implementation guidance:** Task 4b, two edits. The preamble's literal word `five` must change with edit 1 — it counts the sections and the verdict line is a sixth thing, so leaving it makes the file state a number that is wrong on landing. Task 4b's verification greps for the stale count for exactly that reason.
  - **→ promotion verdict pending close.**

- **The twin ships with a per-file classification table, not just the file.**
  - **Root cause:** the seed has no working drift detector. `.prism/plans/followup-seed-twin-boundary-rule-pressure-test.md` documents three independent misses, including `rules/implementation-task-detail.md` — materially stale with identical commit dates on both sides, caught only as a control sample.
  - **Chosen approach:** produce the classification table at curation time, per that analysis's own conclusion (`:132`): every canonical section absent from the twin, classified correct-omission or missing-in-error, with the deciding test named. Adding a twin to an undetected-drift set without the table would knowingly create the next silent-drift case.
  - **→ promotion verdict pending close.**

---

## Sessions

- 2026-07-25 [main] open: Intent — give personas a shared chat-output contract (verdict-first, chunked, state line, one next action) without polluting durable-doc voice rules; Bounds — plan + memory files + co-worker handoff only, no skill or rule edits this session, nothing committed on `main`; Approach — verify the writing-voice blast radius first, then a new sibling rule in the two existing single-load homes rather than 29 persona edits · close: drifted — bounds widened twice on explicit user instruction, both outward-facing: filed HunterMcGrew/PRISM#445, and the contract itself gained three clauses (references carry their content, open items carry a recommendation, blocking items graduate to a structured ask) after the session's own output shipped the defect twice. No skill, rule, or source file was edited, and nothing was committed.
- 2026-07-25 [feat/response-shape-contract] open: Intent — confirm Task 1's contract wording lands as an enforceable rule rather than a style note, correct anything in Phase 1 that would ship wrong, then hand to clove; Bounds — this plan file plus a work branch in `portable-skills`; no source edits, no commits, no PRISM-side files; Approach — resolve Task 1's text verbatim into the plan so the implementer copies rather than re-derives · close: scope held — plan-only writes plus branch creation; no source file touched, nothing committed.
- 2026-07-25 [feat/response-shape-contract] open: Intent — unblock Task 1 and make briar and sasha pass the cold read, as a re-plan rather than an implementation; Bounds — this plan file only; no file under `portable-skills/` touched, nothing committed anywhere, Phase 2/3 (PRISM#445) untouched except one clarifying clause on task 12; Approach — fix Task 1's example tokens as a class rather than only the one that fails the grep, and diagnose the 5b failures before prescribing, since both failing personas share a structural feature winston lacks · close: scope held — plan-only writes; `git status` in `portable-skills` clean, nothing committed. One adjacency taken deliberately: a clarifying clause added to Phase 3's task 12 to stop the same measurement confusion recurring in PRISM#445.
- 2026-07-25 [huntermcgrew/prism-445-response-shape-contract] open: Intent — run Task 11 (build and check) on the merged branch and ship a draft PR; Bounds — regenerate `.claude/`/`.codex/`/`.cursor/` mirrors via `pnpm prism:build`, fix `prism:check` only if one of the two anticipated failure modes occurred, no other source edits; Approach — build, check, commit mirrors, push, open draft PR · close: scope held — `pnpm prism:check` passed clean on the first run (neither anticipated failure mode occurred: the seed twin already carried de-identified provenance and the plan's references to the untracked boundary-analysis file are backtick-quoted paths, not markdown links, so crossref-lint didn't flag them); committed the regenerated mirrors (8c6a143), pushed, opened draft PR #446.
- 2026-07-25 [huntermcgrew/prism-445-response-shape-contract] open: Intent — Task 10: record a per-file classification for the `response-shape.md` seed twin so shipping it does not add a fourth undetected-drift case; Bounds — the plan file only, one new `## Seed twin classification` section; read-only on both rule files, no twin edits, no source; Approach — extract both heading sets mechanically, then classify at whatever unit the pair's divergence actually lives at rather than declaring clean on a vacuous heading comparison · close: scope held — plan file only; both rule files read-only; the one `missing-in-error` finding routed to the implementer rather than fixed in-lane.
- 2026-07-25 [huntermcgrew/prism-445-response-shape-contract] open: Intent — grade AC-4, AC-5, AC-7, and AC-8 against the branch diff with executed evidence, and report rather than repair; Bounds — this plan file only; read-only on every rule, twin, mirror, and config file; no fixes regardless of what the grading turns up; Approach — run each criterion's named command together with its named positive control, so a pass on an empty or missing file is distinguishable from a real pass · close: scope held — plan file only; all four criteria MET; the twin's `**Why:**` divergence was recorded under `## Review Issues` and left unfixed for the implementer.
- 2026-07-25 [huntermcgrew/prism-445-response-shape-contract] open: Intent — self-review pass 1 of 3, weighted toward the writing-voice.md diff, the seed twin's de-identification, the three ordering fixes, hand-edited build output, and AC-8 classification completeness; Bounds — read-only on source, plan file only for findings, no fixes, no PR edits, no merge; Approach — diff every named risk area against the plan's own resolved text rather than trusting the already-recorded AC grades, since those graded machine checks and not content correctness · close: scope held — plan file only; found 2 open Major issues neither Reese's AC grading nor Winston's classification table surfaced (both graded/classified content that was already wrong, not whether it was the *right* wrong content): (1) `response-shape.md` canonical and twin ship pre-fix example tokens (a live PR number, this plan's own stale task handles, a self-falsifying claim) that the plan's own re-plan already replaced; (2) PRISM's canonical briar and sasha bodies still violate the contract this PR ships — briar's closing line is still a four-way menu, sasha's deliverable still opens on `### Bug Summary` with no verdict line — because Task 8 ported only Tasks 2–4's bare reordering and never picked up 2b/4b. writing-voice.md, the three reorderings' section order, and build-mirror parity all checked clean.
- 2026-07-25 [huntermcgrew/prism-445-response-shape-contract] open: Intent — fix both open Major findings from Briar's self-review pass 1, no drive-by scope; Bounds — only the two named findings' files (`response-shape.md` canonical + twin, `prism-code-review-self/shared.md`, `debugger/output-format.md` + twin), mirrors regenerated via `pnpm prism:build`, plan updated, no other source edits; Approach — Tasks 2b/4b (cited as the source of the correct fix) are not actually present in this plan's current text, so authored the briar/sasha fixes directly against response-shape.md's own clauses rather than porting absent task text, and used the finding's own quoted corrected tokens verbatim for the example-token fix · close: scope held — only the four named files plus their mirrors touched; `pnpm prism:build` (571/571 tests) and `pnpm prism:check` both clean; both findings marked `fixed` in `## Review Issues`.
- 2026-07-25 [huntermcgrew/prism-445-response-shape-contract] open: Intent — self-review pass 2 of 3, re-verifying the risk areas from pass 1 (writing-voice one-line constraint, twin de-identification, the three ordering fixes, hand-edited build output, AC-8 classification completeness) rather than trusting pass 1's "fixed" markers at face value; Bounds — read-only on source, plan file only for findings, no fixes, no PR edits, no merge; Approach — re-derive each risk area from the current diff independently, and treat the prior pass's fix commit as a claim to verify rather than a settled fact, per cross-agent-handoff-accountability · close: scope held — plan file only; writing-voice.md (exactly one line, no chat-shaped directive), twin de-identification (rule text byte-identical, only Why differs, AC-7 grep and control both pass), seed-curation.json registration, ADR-0035 update, and hand-edited build output (`pnpm prism:build` produced zero diff, `pnpm prism:check` exit 0, 571/571 tests) all confirmed clean; found 1 open Major that pass 1's "fixed" marker did not fully cover: sasha's Pass-1 fix added the verdict line but not the closing next-action line the same finding also required, and left a now-stale blockquote in `prism-debugger/shared.md:339` uncorrected.
- 2026-07-25 [huntermcgrew/prism-445-response-shape-contract] open: Intent — self-review pass 3 of 3 (final, per dispatch budget), re-verifying the same five risk areas independently rather than trusting pass 2's clean read; Bounds — read-only on source, plan file only for findings, no fixes, no PR edits, no merge; Approach — re-run every named check myself (grep, diff, `pnpm prism:build` for zero-diff proof, `pnpm prism:check`) instead of re-reading pass 2's prose · close: scope held — plan file only; all five risk areas independently reconfirmed clean, no new Critical/Major found; the one pre-existing open Minor (twin `**Why:**` paraphrase) left as-is, unfixed per instruction not to fix.
- 2026-07-25 [huntermcgrew/prism-445-response-shape-contract] open: Intent — fix Eric's 2 open Majors and 1 Minor from PR review pass 2, no drive-by scope; Bounds — only the named files (`seed-curation.json`, plan, `response-shape.md` canonical + twin), mirrors regenerated via `pnpm prism:build`, plan updated, no other source edits, PR stays draft, never merge; Approach — apply each finding's stated fix, then update the one plan sentence (the "registered `curated`" line at the top of `## Seed twin classification`) that the `curated`-removal fix made stale as a direct downstream consequence · close: scope held — four named files (plus regenerated mirrors) touched; `pnpm prism:build` (571/571 tests) and `pnpm prism:check` both exit 0; canonical and twin `response-shape.md` remain byte-identical after the persona-enumeration edit.
- 2026-07-25 [huntermcgrew/prism-445-response-shape-contract] open: Intent — collapse this ticket's two diverged plan copies into one union on the branch and give the dangling boundary-analysis citation a real target in git; Bounds — two plan files on this branch, `pnpm prism:check` exit 0, the untracked copies in the main checkout left byte-for-byte alone, no source/rules/skills, no PR action; Approach — graft Phase 1 content from the untracked copy onto the tracked copy rather than retyping either side, resolving same-fact conflicts by which phase owns the fact · close: scope held — two plan files touched, both under `.prism/plans/`; the main checkout's untracked copies verified unmodified by checksum after the merge; no Decision needed the `OPEN —` variant because phase ownership resolved every conflict.

---

## Implementation Tasks

Task detail bar note: Phase 1 tasks 1–5c are agent-runnable and unmarked. Task 5c's pass/fail is a human read.

Phase 1 execution order (2026-07-25 re-plan): 1 → 2 → 2b → 3 → 4 → 4b → 5 → 5c. Tasks 2, 3, 4 and 5 already landed; 1 was blocked and is now unblocked; 2b, 4b and 5c are new. Task 5b is superseded by 5c — read its entry, don't run it.

Phase order matters: Phase 1 proves the contract's wording on the roster Hunter uses daily; Phase 2 ports the proven wording into PRISM. Do not run them in parallel — Phase 2 copies Phase 1's final text.

### Phase 1 — Portable roster (canonical: `~/Documents/portable-skills/`)

1. **Add the contract to `skills/_shared/core.md`.** Insert a new `## Response shape` section immediately before `## House rules` (currently line 115, file is 122 lines). Insert verbatim — the text below is the resolved wording, not a spec to compose from:

   ```markdown
   ## Response shape

   Every message a persona sends to chat runs on this contract. It governs the *shape* of a reply — the persona's own output format still owns what goes in it. The reason is mechanical: a reader scanning a reply should get the verdict and the next action without reconstructing where they are in the thread. That reconstruction is work the writer can do once and the reader would otherwise redo on every message.

   - **Verdict on the first line — the reader may not reach the second.** State the answer, and the ask if there is one. Supporting detail comes after it, never before.
   - **A bolded lead carries a what *and* a why.** `**Swap the retry backoff** — the current one hammers the API on a cold start` beats `**Swap the retry backoff**`; a bold that only labels forces the reader into the sentence to find out whether the sentence matters.
   - **Every reference carries its own content.** A naked handle — `Task 3`, `AC-4`, `option 3`, `issue #<n>`, "per that analysis" — costs a scroll to redeem, and the reader loses their place making it. Name the thing inline: `Task 3 (regenerate the fixtures)`. If a number moved, say it moved rather than silently using the new one.
   - **A phased run states its position: `Step N of M · <done> · <pending>`.** Fires when the run has ordered phases. On a one-shot answer it is noise.
   - **Past ~5 items, chunk into named phases — never truncate.** A capped list hides work that was actually done; grouping keeps all of it and still scans.
   - **A "Still open:" item carries a recommendation.** Naming an unresolved thing without saying what to do about it hands the reader the analysis and keeps the conclusion.
   - **A blocking item is not a bullet — it graduates to a structured ask.** "Still open" is for what the reader should *know*; the ask-back mechanism in `## House rules` is for what they must *decide*. That bullet owns the mechanism; this clause owns the trigger — if progress stops until the item is answered, it is an ask, not a bullet.
   - **Exactly one closing next action, bounded.** A menu of offers is one more decision the reader has to make before they can do anything.

   Short answers stay short — this is a shape, not a minimum length. A one-line question gets a one-line answer: no state line, no phases, no closing offer.
   ```

   Four constraints on this text, each resolving a defect in an earlier draft of this task:
   - **No line number in the House-rules cross-reference.** The earlier draft wrote `## House rules` (line 122) into the file. This section inserts *above* House rules, so that bullet moves to ~line 150 on landing and the file would ship a wrong number on day one — the exact naked-handle failure the clause above it forbids. Reference by section name only.
   - **Every clause names the reader's cost, not just the writer's obligation.** That is what makes it read as a rule rather than taste. Do not trim the why-clauses for brevity.
   - **De-identified, per this repo's `b94f665` "Genericize personal and workplace references."** The rationale stands on scannability and re-derivation cost alone: no person named, no ADHD framing, no dates, no PR or issue numbers. Canonical provenance lives in the PRISM-side memory files, not here.
   - **Every example inside the clause set is a shape, never a live instance.** Three tokens in the prior draft pointed at real objects and have been replaced — see Decision: *Task 1's example tokens are shapes, not instances*. `issue #<n>` is deliberately written with an angle-bracket placeholder rather than a digit: a digit would pass the verification grep only on digit-count luck, and a reader would try to resolve it. `Task 3` appears identically in the bad and the good half of the reference clause on purpose — the contrast is the same handle with and without its content, which is the point the clause is making. Do not "improve" either half by varying the number.

   No `writing-voice` sibling exists in this repo — the boundary cross-reference is Phase 2 / PRISM-only. Nothing to add here.

   Verification: content-only, no build step. `grep -nE '\(line [0-9]+\)|ADHD|2026-|#[0-9]{2,}|[Hh]unter' skills/_shared/core.md` returns no match inside the new section.

2. **Reorder briar's chat output.** `skills/briar/SKILL.md:376-396`. Today `## Review format` ends with "Then the verdict + handoff recommendation" — verdict last. Move the verdict to the first line of the chat block, above `**Issues:**`, and change the trailing sentence to carry only the handoff recommendation. Keep every existing field and the "no summary paragraph, plan holds the detail" constraint unchanged. Verification: content-only.

2b. **Resolve briar's closing handoff to one named persona.** `skills/briar/SKILL.md`, the last line of `## Review format` (currently line 398, immediately below the `**Cleaner paths:**` bullet). Task 2 landed the verdict promotion; this fixes the *other* half of the contract — "exactly one closing next action, bounded." Today the line instructs briar to emit a three-way menu.

   Exact text-to-text replacement. Old (one line, verbatim):

   ```
   Then the handoff recommendation (clove, eric, or eli). No summary paragraph, no PR Readiness checklist — all of that lives in the plan only.
   ```

   New (one line, verbatim):

   ```
   Then one handoff line naming a single resolved next persona — never a menu. `## Clean-Review Closing` owns the routing rule and resolves it to exactly one name; Briar already holds the PR state and the changed-file list from Phase 1, so the route is decided by the time she emits. State that one name, not the list of candidates. No summary paragraph, no PR Readiness checklist — all of that lives in the plan only.
   ```

   **Do not restate the routing table here.** `## Clean-Review Closing` already carries every branch (PR exists → eric; no PR and every changed path is docs → eli; no PR otherwise → clove; issues found → clove, or eli when the diff is docs-only). Cross-reference it by section name and stop — a second copy of a routing table in the same file is the quoted-contract fork the shared core's `acVerdicts` note warns about, and this file would then own two copies that drift independently.

   Sequence: after task 2. Verification: content-only, no build step. `grep -n 'clove, eric, or eli' skills/briar/SKILL.md` returns no match; `grep -c 'Clean-Review Closing' skills/briar/SKILL.md` returns 3 — the `## The run, in order` pointer at line 55, the `## Clean-Review Closing` heading at line 416, and the new cross-reference. The baseline is 2 (verified this session), so the count moving 2 → 3 is the positive control proving the first grep isn't passing on a mangled or truncated file.

3. **Reorder winston's evaluate output.** `skills/winston/SKILL.md:220-240`. Today `## Output format` (line 220) is followed by the mode blockquote `> _Running evaluate mode — …_` (222), then `### Understanding` (224), `### Premise gate` (227), `### Recommendation` (237). Add a one-line verdict instruction that states Proceed / Proceed with changes / Do not proceed with a single-clause reason.

   **Insertion point, pinned:** the verdict line goes **above** the mode blockquote, immediately under the `## Output format` heading — not between the blockquote and `### Understanding`. Two implementers would diverge here, so it is a decision, not a keystroke: the contract says the verdict is the first line, and the mode blockquote is a state line. A state line above the verdict would put the roster's own architect visibly out of compliance with the rule he is shipping.

   `### Recommendation` keeps its full reasoning in place. Do not delete or reorder the Premise gate — it is load-bearing for the evaluation; this task moves the *verdict's* position only. Verification: content-only.

4. **Reorder sasha's diagnostic output.** `skills/sasha/SKILL.md:410-422`. Today `### Bug Summary` → `### Investigation Trail` → `### Root Cause`. Move `### Root Cause` to second position, directly after `### Bug Summary`, leaving `### Investigation Trail` third. The evidence trail is support, not the answer. Verification: content-only.

4b. **Give sasha's output a verdict line and a closing next action.** `skills/sasha/SKILL.md`, `## Output format` (currently lines 406–426). Task 4 reordered the *sections* correctly; two contract clauses are still unmet in the emitted message — there is no verdict ahead of the supporting detail, and the section ends on Follow-up bullets with no stated next action. Two edits, both inside this section.

   **Edit 1 — verdict line above the sections.** Replace the section's preamble line (currently line 408, the single line reading `The diagnosis deliverable handed to the user (and to clove for the fix) has five sections:`) with the following two paragraphs, keeping the blank line that already separates the preamble from `### Bug Summary`:

   ```markdown
   The diagnosis deliverable handed to the user (and to clove for the fix) opens with a one-line root-cause verdict, then five sections. The verdict line is the first thing emitted to chat; everything below it is supporting detail.

   **Root cause:** `<file>:<line>` — one clause naming what is actually broken. Unconfirmed? Say so and name the leading hypothesis in the same line.
   ```

   The preamble's word `five` is load-bearing and must change to match — it counted the sections and the verdict line is a sixth thing. The wording above keeps the count honest by naming the verdict line separately rather than folding it into the total.

   **Edit 2 — closing next action.** Insert a blank line and then the following single line immediately after the last `### Follow-up` bullet (currently line 426, `- Whether the root cause suggests a systemic gap (architecture, process, or rule update needed)`) and before the `---` that closes the section:

   ```markdown
   Close with the single next action from `## Next persona` — one named handoff, not a menu. The Follow-up bullets are things the reader should *know*; the closing line is the one thing to *do*.
   ```

   **This deliberately duplicates `### Root Cause`, and that is the settled shape — do not collapse it.** Winston carries the identical redundancy after task 3 (a `**Verdict:**` line at the top plus a full `### Recommendation` section below), and this plan already ruled that `### Recommendation` keeps its full reasoning in place. The top line is the scan surface; the section is the detail. Same call, same reason, applied to sasha for consistency across the roster.

   **Do not touch `### Bug Summary`, `### Root Cause`, `### Investigation Trail`, `### Recommended Fix`, or `### Follow-up` themselves** — task 4's ordering is correct and stays. This task adds a line above them and a line below them; it moves nothing.

   Sequence: after task 4. Verification: content-only, no build step. In `skills/sasha/SKILL.md`, the line `**Root cause:**` appears above `### Bug Summary`, and `grep -c 'has five sections' skills/sasha/SKILL.md` returns 0 — the stale count is the failure signature if edit 1 was applied by insertion rather than replacement.

5. **Sync and confirm no profile drift.** Per the roster's own convention, check both installed profiles for un-ported live-session edits *before* syncing, then run `sync.sh` from the repo root.

   **Pre-check already run this session — both profiles were clean.** `diff -rq skills/ ~/.claude/skills/` and `diff -rq skills/ ~/.claude-work/skills/` reported no content differences. The only entries listed are directories that exist in a profile but not in the canonical roster (`graphify`, `humanizer`, `prism-handoff`, `prism-review-loop`, `.DS_Store`) — unrelated skills, not roster drift, and nothing to port back. Re-run the same two commands before syncing to confirm nothing landed in between; treat any *content* difference in a roster file as an un-ported live edit that must be brought back to canonical first.

   Verification: after `sync.sh`, `diff -rq skills/ ~/.claude/skills/` and `diff -rq skills/ ~/.claude-work/skills/` report no differences for the four touched files (`_shared/core.md`, `briar/SKILL.md`, `winston/SKILL.md`, `sasha/SKILL.md`); the same unrelated-directory lines above are expected to remain.

5b. ~~**Read the output cold (informal Phase 3 dry run).**~~ **Superseded by task 5c — do not re-run as written.** Original text kept because `## History` references its result: *"After the sync, re-read the four edited files as a reader would meet them — the first three and last three lines of briar's `## Review format`, winston's `## Output format`, and sasha's `## Output format`. Pass condition: 'what's the verdict' and 'what do I do next' are answerable from those lines alone."* Its run on 2026-07-25 failed briar and sasha. The failure was in the check, not only in the files: counting *physical lines of the skill file* measures a document nobody reads that way, and it scores a section down for carrying instructions to the agent above the template. See Decision: *The cold read measures the emitted template, not the skill file's physical lines*.

5c. **Read the output cold — against the emitted template (supersedes 5b's method).** After the sync, for each of briar's `## Review format`, winston's `## Output format`, and sasha's `## Output format`, do this in order:

   1. **Bound the emitted block.** It is the contiguous run of the section that the persona reproduces into chat. It *starts* at the first line the persona would actually type — briar: `**Verdict:**`; winston: `**Verdict:**`; sasha: `**Root cause:**` (added by task 4b). It *ends* at the section's last instruction about what to emit. Lines addressed to the agent *about* the section are outside the block and are not scored: briar's "Chat output is a quick-scan checklist only…" disclaimer and sasha's "The diagnosis deliverable…" preamble both stay where they are and both sit above the block.
   2. **Verdict test.** Read only the first three elements of the emitted block. "What's the verdict?" must be answerable from them alone. An element is a bolded line, a `###` heading plus its first sentence, or a blockquote — not a physical line.
   3. **Next-action test.** Read only the last element of the emitted block. It must name exactly one next action with one target. A conditional that resolves to one name at emit time passes; an enumeration of candidates does not.

   **Known non-finding, do not raise it:** winston's `### A/P/C menu` presents three options mid-message. The contract clause is *"exactly one **closing** next action"* — a mid-run decision gate is not the close, and winston's close is the single "want me to build out the implementation plan?" offer. Checked and cleared here so the check stays deterministic.

   This is the only check in Phase 1 that tests the shape of an emitted message rather than raw file state; Phase 3 task 12 is the real behavioral version — it runs the personas and reads actual chat output — and lands in PRISM#445. Not a blocker: if it fails, record what failed in `## History` and route back to winston rather than holding the branch.

   Sequence: after tasks 2b, 4b, and 5 have all landed and synced. Verification: human read, result recorded in `## History`.

### Phase 2 — PRISM (canonical: `.prism/` for rules, `.ai-skills/skills/` for skills)

6. **Create `.prism/rules/response-shape.md`.** Same content as Task 1's core.md section — including the three clauses on references, open-item recommendations, and blocking-item asks — restated in PRISM rule format: rule statement, then `**Why:**`, then `**How to apply:**`, then a `## Who runs this rule` section naming every persona (all of them) and noting that the state line is conditional on phased runs. Add one cross-reference line to `.prism/rules/writing-voice.md` stating the boundary: that rule governs durable artifacts, this one governs chat. Add the reciprocal line to `writing-voice.md` — **this is the only edit to that file in this plan.**

7. **Register the rule as Tier 1.** Add an entry for `.prism/rules/response-shape.md` to `.prism/architect/manifest.json` with no path filter, alongside the existing Tier 1 rules. Cross-check the tier list in `.prism/spec/adrs/_toolkit/0035-rule-loading-tiers.md:26` and append the new rule to its Tier 1 examples so the ADR does not go stale. Verification: `pnpm prism:verify-manifest` exits 0.

8. **Apply the three ordering fixes to PRISM's canonical skill bodies.** Same edits as Tasks 2–4, in `.ai-skills/skills/prism-code-review-self/shared.md`, `.ai-skills/skills/prism-architect/shared.md`, and `.ai-skills/skills/prism-debugger/shared.md`. `.ai-skills/skills/<name>/shared.md` is canonical; `.claude/`, `.codex/`, `.cursor/` copies are build output — do not hand-edit them. Verification: `git diff --name-only` shows no `.claude/`/`.codex/`/`.cursor/` paths before the build runs.

9. **Ship the consumer seed twin.** `templates/install/.prism/rules/response-shape.md` carries canonical's text verbatim — canonical was authored on general grounds, so nothing needed de-identifying, and `prism:build` mirrors the pair like any other synced rule. Had canonical carried a person's name, a date, a PR/issue number, or the ADR-0035 citation, those would have needed stripping before the twin could ship: `runInstallAdrGate` (`crossref-lint.ts:871`) fails the build on any `ADR-NNNN` under `templates/install/`, and `SEED_DOGFOODING_PATTERN` (`scripts/ai-skills/literal-guard.ts:48-49`) fails on `THR-*`, `PRISM-NNN`, and `\bLinear\b`. No `seed-curation.json` registration is needed — the twin is a plain synced pair (see `## Decisions`: *The rule ships to consumers as a curated seed twin* → reversed). Verification: `pnpm prism:check` exits 0.

10. **Write the twin's classification table.** In the plan under a new `## Seed twin classification` section, list every canonical section absent from the twin with a verdict (correct-omission | missing-in-error) and the deciding test named, per `.prism/plans/followup-seed-twin-boundary-rule-pressure-test.md:132`. Verification: the heading set of the twin is a subset of canonical's, and every canonical heading not in the twin has a row in the table. Sequence: after task 9, before the branch is pushed.

11. **Build and check.** Run `pnpm prism:build` then `pnpm prism:check`. Verification: `pnpm prism:check` exits 0 — covers build parity, types, tests, manifest coverage, crossref lint, and pack parity in one command.

### Phase 3 — Verify the contract actually lands

12. **Read the output cold.** On a throwaway branch with a small deliberate diff, run briar and winston and read only the first three lines and last three lines of each. The pass condition is answering "what's the verdict" and "what do I do next" from those six lines alone. Record the result in `## History`.

    **Physical lines are the right unit *here*, unlike in task 5c** — this task reads a real emitted chat message, where the skill file's agent-facing preambles never appear, so the message's first three lines already are the template's first three. Do not import task 5c's emitted-block bounding procedure into this task; 5c needed it only because it reads the SKILL.md file as a stand-in for a message. See Decision: *The cold read measures the emitted template, not the skill file's physical lines*.

---

## Review Issues

### Review ledger

Two review surfaces ran on this branch: Briar's self-review (3 passes) and Eric's PR review on #446 (5 passes). Entries below are grouped by the pass that raised them; every entry is `fixed`, and no finding is open.

| Pass | Raised | What closed it |
| --- | --- | --- |
| Briar self-review 1 | 2 Major | Pre-fix example tokens replaced on both rule surfaces; briar's four-way close collapsed; sasha's `**Verdict:**` line added |
| Briar self-review 2 | 1 Major | sasha's closing next-action line added — the other half of AC-1 |
| Briar self-review 3 | 0 new | Re-verified five weighted risk areas; `prism:build` zero-diff, `prism:check` exit 0 |
| Eric PR pass 1 | 2 Major, 3 Minor (+1 pre-existing Minor confirmed) | Stale classification row deleted; briar re-pointed at `## Clean-Review Closing`; roster enumeration trimmed; sasha's cross-file handle inlined; briar's verdict labeled; twin `**Why:**` reverted to canonical |
| Eric PR pass 2 | 2 Major, 1 Minor | `curated` registration dropped; classification row's dead token removed; phased-persona enumeration replaced with a checkable marker |
| Eric PR pass 3 | 2 Major, 1 Minor | Decision-gate exemption added; refuted `curated` Decision swept in `## Decisions` and Task 9; stale pass-3 sentence dated |
| Eric PR pass 4 | 0 Critical, 0 Major, 2 Minor | Ratification — all three pass-3 fixes verified from the tree, not from `fixed` markers; 12 threads resolved |
| Eric PR pass 5 | 0 new | Both pass-4 Minors verified resolved; `pnpm prism:check` exit 0; 14/14 threads resolved |

**The pattern a future reader would otherwise miss: the same defect species landed on passes 1, 2, and 3 — a claim the shipping commit had already invalidated, left standing in the plan.** Pass 1's stale `#442`→`#3` classification row, pass 2's row blessing a token pass 1 had deleted, and pass 3's refuted `curated` Decision are one failure repeated three times: the fix landed in the code and the plan's own description of it did not get swept. Three review passes were spent on bookkeeping, not on the rule. Captured as a lesson at `.prism/lessons.md` § *When a plan (or any doc) corrects an earlier claim, sweep that claim's other occurrences in the same file at correction time* — that entry cites this branch, and this ledger is the case it was drawn from.

**AC verification (Reese, 2026-07-25) — AC-4, AC-5, AC-7, AC-8 all MET.** Each criterion's named command was run together with its named positive control; no criterion is UNMET, so no verification issue is filed against this branch. AC-1/AC-2/AC-3 are human-evidence criteria paired with Task 12 and were not graded; AC-6 covers memory files outside this repo and was out of scope.

One finding carries forward from Winston's `## Seed twin classification` — it does not affect any graded criterion, and it is recorded here so it is visible to a reader who checks open issues rather than the classification table.

### Seed twin `**Why:**` block diverges from canonical with no test forcing it

- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `templates/install/.prism/rules/response-shape.md:9`
- **Problem:** the twin's `**Why:**` block is a same-meaning rewrite of canonical's, and Amendment D does not sanction paraphrase — canonical's wording carries no name, date, PR number, or ADR citation, so it would have shipped verbatim and still passed AC-7's provenance grep.
- **Suggested fix:** replace the twin's `**Why:**` block with canonical's wording verbatim.
- **Fixed in:** replaced the twin's `**Why:**` block with canonical's wording verbatim; `diff .prism/rules/response-shape.md templates/install/.prism/rules/response-shape.md` now returns no differences. AC-7's provenance grep still returns 0.

### `response-shape.md` canonical and twin ship the pre-fix example tokens the plan already rejected

- **Severity:** `major`
- **Status:** `fixed`
- **File:** `.prism/rules/response-shape.md:14-15`, `templates/install/.prism/rules/response-shape.md:14-15` (identical on both surfaces except the already-noted `#442`→`#3` swap)
- **Problem:** Both files carry the draft examples the plan's own Decision *"Task 1's example tokens are shapes, not instances"* (resolved 2026-07-25) replaced before Task 1 could land: the bolded-lead example `**Reorder briar's output** — the verdict is last today` is false as of this same branch (Task 2 already reordered briar's output, so the claim is self-falsifying on arrival), and the reference-clause example uses `Task 10` and `Task 12 (read the output cold)` — this plan's own pre-renumbering task handles — plus `#442` in canonical, a real merged PR in this repo (see commit `49a489d`). A rule that teaches "a naked handle costs a scroll to redeem" shipping one that actually resolves is the exact failure the clause warns against. Root cause: Task 6 (canonical restatement) and Task 9 (twin curation) were executed against a plan snapshot that predates the 2026-07-25 re-plan; the corrected wording (`issue #<n>`, `Task 3`, `Task 3 (regenerate the fixtures)`, `**Swap the retry backoff** — the current one hammers the API on a cold start`) lives in the plan's current Task 1 block but was never carried into Phase 2.
- **Suggested fix:** Replace lines 14-15 on both surfaces with the corrected wording from the plan's Task 1 text, then rebuild mirrors (`pnpm prism:build`).
- **Fixed in:** replaced lines 14-15 on both `.prism/rules/response-shape.md` and `templates/install/.prism/rules/response-shape.md` with the four corrected tokens quoted in this finding (`Task 3`, `AC-4`, `option 3`, `issue #<n>` as the naked handles; `Task 3 (regenerate the fixtures)` as the named inline example; `**Swap the retry backoff** — the current one hammers the API on a cold start` as the bolded-lead example) — verbatim identical on both surfaces since `issue #<n>` is already generic and needs no further de-identification, which supersedes the now-moot `#442`→`#3` transformation. `pnpm prism:build` regenerated all mirrors and AGENTS.md; AC-7's provenance grep still returns 0 and its "Still open" positive control still returns 2.

### PRISM's canonical briar and sasha bodies still violate the rule this PR ships

- **Severity:** `major`
- **Status:** `fixed`
- **File:** `.ai-skills/skills/prism-code-review-self/shared.md:334`, `.prism/references/debugger/output-format.md:5-7` (and its twin `templates/install/.prism/references/debugger/output-format.md:5-7`)
- **Problem:** Task 8 ported only "the same edits as Tasks 2–4" (bare section reordering). It never picked up Tasks 2b and 4b, which the re-plan added specifically because the *emitted* briar and sasha messages still failed the contract after the ordering fix alone. As shipped: briar's `## Review format` still closes with `Then the handoff recommendation (Clove, Eric, Pixel, or Eli)` — a four-way menu, directly contradicting response-shape.md's own "Exactly one closing next action, bounded" clause; run per AC-1's own evidence procedure, this would fail AC-1's stated UNMET condition verbatim ("the close offers two or more options"). sasha's deliverable (canonical and its consumer twin) still opens with `### Bug Summary`, not a verdict line, contradicting "Verdict on the first line — the reader may not reach the second."
- **Suggested fix:** Port Tasks 2b and 4b (already fully specified in the plan's Phase 1 task text) into `.ai-skills/skills/prism-code-review-self/shared.md` and `.prism/references/debugger/output-format.md`, regenerate the debugger twin, then rebuild mirrors.
- **Fixed in:** Tasks 2b/4b were not present in this plan's current text (Task 1's block still carries the pre-fix examples per the finding above, not corrected wording), so the fix was authored directly against the response-shape.md clauses rather than ported from an absent task. `.ai-skills/skills/prism-code-review-self/shared.md:334` — replaced the four-way `Then the handoff recommendation (Clove, Eric, Pixel, or Eli)` with `Then exactly one closing next action — the handoff recommendation from ## Next persona below (Clove if issues, "ready to ship" if clean)`, deferring to the already-correct single-route logic in the file's own `## Next persona` section instead of inventing new routing. `.prism/references/debugger/output-format.md:5` — added a `**Verdict:**` line before `### Bug Summary` stating the root cause with its evidence grade (`[Confirmed]` \| `[Deduced]` \| `[Hypothesized]`), reusing the tag vocabulary already established in `branch-plan.md`'s Debugged Issues template. `pnpm prism:build` regenerated the debugger twin (`templates/install/.prism/references/debugger/output-format.md`, confirmed build output not curated) and all `.claude`/`.codex`/`.cursor` mirrors; `pnpm prism:check` exits 0.

### Sasha's fix landed only the verdict half of the contract — the closing next-action half is still unmet

- **Severity:** `major`
- **Status:** `fixed`
- **File:** `.prism/references/debugger/output-format.md:20-25` (and its build-generated twin `templates/install/.prism/references/debugger/output-format.md:20-25`); stale cross-reference at `.ai-skills/skills/prism-debugger/shared.md:339`
- **Problem:** The previous finding's fix (above) added sasha's `**Verdict:**` line but did not add a closing next-action line — the deliverable still ends on the `### Follow-up` bullet list with nothing pointing the reader at `## Next persona` (shared.md:354) as the single close. This is the same defect class briar had (contradicts response-shape.md's "Exactly one closing next action, bounded") and is one of AC-1's own two conjuncts ("the verdict appears before any supporting detail **and** exactly one next action appears at the end") — briar's half of that fix is verified; sasha's is not. Compounding it, `prism-debugger/shared.md:339`'s blockquote (`> _The five-section diagnosis deliverable — Bug Summary through Follow-up._`) was never updated to acknowledge the verdict line the referenced file now opens with, while `output-format.md`'s own blockquote was correctly updated to `"...opens with a one-line verdict."` — two descriptions of the same deliverable, now out of sync inside the same PR.
- **Suggested fix:** Insert a closing line after the last `### Follow-up` bullet in both `output-format.md` and its twin, on the model of briar's fix: "Close with the single next action from `## Next persona` — one named handoff, not a menu." Then update `prism-debugger/shared.md:339`'s blockquote to match `output-format.md`'s corrected wording (or cut the restated summary and point at the file by name only, per `implementation-task-detail.md` § Cite, don't restate). Rebuild mirrors afterward.
- **Fixed in:** appended `Close with the single next action from `## Next persona` — one named handoff, not a menu. The Follow-up bullets are things the reader should *know*; the closing line is the one thing to *do*.` after the last `### Follow-up` bullet in `.prism/references/debugger/output-format.md`; `prism-debugger/shared.md:339`'s blockquote now reads `> _The five-section diagnosis deliverable — Bug Summary through Follow-up — opens with a one-line verdict._`, matching `output-format.md`'s own wording. `pnpm prism:build` regenerated all mirrors (including the `templates/install/` twin) and `pnpm prism:check` exits 0 (571/571 tests).

### Self-review pass 3 — no new findings

- **Severity:** `minor`
- **Status:** `no_change_needed`
- **File:** N/A (verification pass)
- **Problem:** Re-verified pass 1's and pass 2's fixes independently rather than trusting the `fixed` markers, weighted toward the five named risk areas: the `writing-voice.md` one-line constraint, the seed twin's de-identification, the three ordering fixes, hand-edited build output, and AC-8 classification completeness. All five confirmed clean: `git diff` on `writing-voice.md` shows exactly one added line with no chat-shaped directive; `diff` between canonical and twin `response-shape.md` shows only the `**Why:**` line differing (line 9 of 32), rule text byte-identical, `AC-7`'s provenance grep returns 0 and its positive control returns 2; the three reordered files (`prism-code-review-self`, `prism-architect`, `prism-debugger` shared.md) each still carry every pre-existing field, the Premise gate, and the "no summary paragraph" constraint; `pnpm prism:build` produced zero diff against the committed mirrors (confirms no hand-editing) and `pnpm prism:check` exits 0 (571/571 tests, crossref-lint, install-adr-gate, and pack-parity all clean); the classification table's heading-set claim (`## Who runs this rule` only, on both files) was independently re-extracted and matches.
- **Suggested fix:** none — no new defect found.

The one pre-existing open Minor (seed twin `**Why:**` block is a same-meaning paraphrase rather than a verbatim carry — see above) remained open at pass-3 time and did not block a clean self-review verdict per severity calibration (Minor, not Critical/Major). It was fixed in Eric's PR review pass 1 — see "Seed twin `**Why:**` block diverges from canonical with no test forcing it" above — and the twin is byte-identical to canonical as of `a7879d70`.

### PR review pass 1 — stale classification row, routing target, and three drift-prone enumerations

Six findings. The pre-existing twin `**Why:**` Minor is the sixth — Eric confirmed rather than re-raised it; see "Seed twin `**Why:**` block diverges from canonical with no test forcing it" above for its record and fix.

- **Severity:** `major`
- **Status:** `fixed`
- **File:** `.prism/plans/response-shape-contract.md:280` (`## Seed twin classification`)
- **Problem:** the row recorded `#442` shipping as `#3` with verdict `correct-transformation`, but neither file contained either token — both carried `issue #<n>`. The row was superseded by a fix recorded in this same section, which said so in as many words.
- **Suggested fix:** delete the row and correct the surrounding "differ on exactly two/one" claims.
- **Fixed in:** row deleted; the remaining `#442` hits in the file are a genuine PR citation in Task 9 and this section's quoted finding.

- **Severity:** `major`
- **Status:** `fixed`
- **File:** `.ai-skills/skills/prism-code-review-self/shared.md:334`
- **Problem:** the previous fix pointed briar's close at `## Next persona`, the coarser of the file's two routing sections, and inlined a second copy of it. `## Clean-Review Closing` (same file, line 394) is the emit-time procedure and prescribes something different for the clean case — two routing descriptions, one emitted message.
- **Suggested fix:** defer to `## Clean-Review Closing` by section name instead of restating routing.
- **Fixed in:** `:334` now defers to `## Clean-Review Closing` by name and states "never a menu" rather than carrying a second copy.

- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `.prism/rules/response-shape.md:30` (and twin)
- **Problem:** `## Who runs this rule` itemized the roster behind "Every persona in the PRISM roster" and the list was already wrong — Atlas (`prism-onboarding`) was missing. `writing-voice.md` § Count rules, not numbers names the persona roster as its canonical case for stating the membership rule instead of listing names, and the sentence already stated the rule.
- **Suggested fix:** end at the rule; drop the names.
- **Fixed in:** enumeration removed on both surfaces; nothing left to drift.

- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `.prism/references/debugger/output-format.md:27`
- **Problem:** the opener's `## Next persona` handle pointed at a section of `prism-debugger/shared.md`, not of this file. `output-format.md` is loaded standalone, so the handle could not be redeemed from where it is read — the exact cost the rule this PR ships describes.
- **Suggested fix:** name the content inline, as briar's parallel edit does.
- **Fixed in:** the file now opens with its own `**Verdict:**` line carrying the evidence-grade vocabulary inline; no cross-file handle in the opener.

- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `.ai-skills/skills/prism-code-review-self/shared.md:316`
- **Problem:** the template named the verdict's position but not its shape, while both sibling edits in the same series enumerated their values (Winston `Proceed / Proceed with changes / Do not proceed`, sasha `[Confirmed] | [Deduced] | [Hypothesized]`). Two runs would diverge on whether the first line is a labeled field or prose.
- **Suggested fix:** make it a labeled field above `**Issues:**`, matching the siblings.
- **Fixed in:** `:316` is now `**Verdict:** Ready for PR (or: N Major, M Minor to fix)`.

### PR review pass 2 — `curated` registration and two stale-content rows

- **Severity:** `major`
- **Status:** `fixed`
- **File:** `.ai-skills/definitions/seed-curation.json:75`
- **Problem:** `response-shape.md` was registered `curated`, which was correct when the plan expected canonical to carry ADHD/dated provenance and the twin to carry a neutralized `**Why:**`. Canonical was authored on general grounds instead, and pass 1's fix reverted the twin's paraphrase — leaving the two files byte-identical and the registration stranded. `curated` switches off both the drift-detector's content compare (`checkSeedDrift`, `build.ts:583-588`) and the canonical→seed mirror write (`writeSeedMirror`, `build.ts:708-710`), so the next edit to this Tier 1 rule would silently stop reaching consumers with nothing in `pnpm prism:check` failing.
- **Suggested fix:** drop `"rules/response-shape.md"` from `curated` and rebuild so `prism:build` mirrors it like any other synced pair.
- **Fixed in:** removed the entry from `curated`; `pnpm prism:build` mirrored the file normally (no diff — it was already byte-identical) and `pnpm prism:check` exits 0.

- **Severity:** `major`
- **Status:** `fixed`
- **File:** `.prism/plans/response-shape-contract.md:291` (`## Seed twin classification` § Carried verbatim, deliberately)
- **Problem:** The row blessed `**Reorder briar's output**` as content that correctly ships verbatim, but that token was removed from both rule files as a Major defect earlier in this same PR (`## Review Issues` above). A table whose stated job is preventing a future editor from reverting correct content into a defect was instead pointing at the defect as the safe state.
- **Suggested fix:** narrow the row to the content actually carried — the persona roster in `## Who runs this rule` — and drop the `**Reorder briar's output**` clause.
- **Fixed in:** removed the `**Reorder briar's output**` clause from the row; the justification column (literal-guard doc comment, Test 3) stands on its own for the surviving persona-roster content. Scanned the rest of `## Seed twin classification` for other rows still describing pre-fix state — none found.

- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `.prism/rules/response-shape.md:32` (and its byte-identical twin, plus build-generated mirrors)
- **Problem:** The phased-persona sentence named 9 personas + 2 utility skills as "commonly phased," but scored against `session-orientation.md` § Lifecycle List's actual marker (a skill carries a `## The run, in order` list), the itemized list was wrong in both directions — 18 phased personas omitted, 3 named personas (Sol, Iris, Theo) carry no such list. The sentence already stated the governing criterion first, making the list redundant as well as stale.
- **Suggested fix:** end the sentence at the criterion and point at the checkable marker instead of enumerating names.
- **Fixed in:** replaced the itemized list with a reference to `session-orientation.md` § Lifecycle List's `## The run, in order` marker, applied identically to canonical and twin (still byte-identical, confirmed by `diff`); `pnpm prism:build` regenerated all mirrors and `pnpm prism:check` exits 0 (571/571 tests).

### PR review pass 3 — decision-gate exemption, reversed-Decision gap, and a stale self-review sentence

- **Severity:** `major`
- **Status:** `fixed`
- **File:** `.prism/rules/response-shape.md:20`, `templates/install/.prism/rules/response-shape.md:20`
- **Problem:** the "Exactly one closing next action, bounded" clause stranded the designed-decision-gate carve-out in `writing-voice.md` § Answer first, one offer at a time — both rules are `load: always`, and the new cross-reference from `writing-voice.md` hands chat replies to `response-shape.md`, which carried no exemption for a menu that is itself the designed close of a decision gate (e.g. a write/skip/defer prompt documented as the closing action of a run).
- **Suggested fix:** add one clause to the "Exactly one closing next action" bullet on both canonical and twin, citing `writing-voice.md`'s carve-out by section name, then rebuild.
- **Fixed in:** appended a sentence to the clause on both files: "Deliberate decision gates are exempt, per the same carve-out in `writing-voice.md` § Answer first, one offer at a time: a menu that *is* the product at a designed decision point — an approve/adjust/cancel gate, a write/skip/defer prompt — stays a menu. The anti-pattern is a menu standing in for a close, not a menu placed as a gate." `pnpm prism:build` regenerated all mirrors; `pnpm prism:check` exits 0 (571/571 tests).

- **Severity:** `major`
- **Status:** `fixed`
- **File:** `.prism/plans/response-shape-contract.md:40` (`## Decisions`), `.prism/plans/response-shape-contract.md:151` (Task 9)
- **Problem:** pass 2's fix reverted the twin's `**Why:**` paraphrase and dropped the `curated` registration (see `## Review Issues` above, `## History`, and `## Seed twin classification`), but the `## Decisions` entry *"The rule ships to consumers as a curated seed twin, with provenance de-identified"* still prescribed the reversed approach unchanged, and it still carried `→ promotion verdict pending close` — `branch-plan.md` § Before Closing forbids promoting a refuted Decision unchanged. Task 9's last sentence also still instructed registering the twin `curated`.
- **Suggested fix:** add a reversal sub-bullet to the Decision recording what actually shipped and why the premise didn't hold; align Task 9's closing sentence to the same fact.
- **Fixed in:** added a `**Reversed during implementation**` sub-bullet to the Decision, cross-referencing `## Seed twin classification` and this section; replaced Task 9's `Register the twin in seed-curation.json as a curated pair` sentence with the actual no-registration-needed outcome, cross-referencing the reversed Decision by name.

- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `.prism/plans/response-shape-contract.md:213` (`### Self-review pass 3 — no new findings`)
- **Problem:** the closing sentence of the pass-3 self-review record said the seed-twin `**Why:**` Minor "remains open" and that the twin's Why line "differs" — both true at pass-3 time but stale as of `a7879d70`, where the same Minor is recorded `fixed` two sections earlier and the classification table confirms the two files are byte-identical.
- **Suggested fix:** reword the sentence to mark it as a pass-3-time snapshot and note the later fix.
- **Fixed in:** reworded to "remained open at pass-3 time," and appended a sentence naming the fixing entry and confirming byte-identity as of `a7879d70`.

### PR review pass 4 — ratification, plus two Minors

0 Critical, 0 Major. All three pass-3 findings were re-verified from the tree rather than from their `fixed` markers: the decision-gate exemption is present and byte-identical across all six homes, and canonical and twin are the **same git blob** (`fe515b6c`) — stronger evidence than a content diff. The reversal sub-bullet sits above `→ promotion verdict pending close`, so the close ceremony cannot reach the verdict without passing the refutation. 12 threads resolved.

- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `.prism/plans/response-shape-contract.md:152` (Task 9)
- **Problem:** pass 3's fix corrected Task 9's closing sentence, but the task's opening sentences still read "the seed is a curated twin, not build output" and "Rewrite only the `**Why:**` block" — the approach the final sentence reverses. One task, two incompatible instructions; a reader following it top-down lands on the reversed approach.
- **Suggested fix:** open the task with what shipped, and keep the build-gate reasoning as the counterfactual it always was.
- **Fixed in:** Task 9 now opens with `carries canonical's text verbatim`; both citations survive intact (`runInstallAdrGate` at `crossref-lint.ts:871`, `SEED_DOGFOODING_PATTERN` at `literal-guard.ts:48-49`).

- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `.prism/lessons.md:373`
- **Problem:** the new lesson was correctly shaped and not a duplicate heading, but it split coverage — a `2026-07-07` bullet under `## Docs drift after a large epic` addressed the same pattern, leaving the general lesson with two addresses.
- **Suggested fix:** fold the older specific bullet into the general entry rather than keeping both.
- **Fixed in:** the `2026-07-07` bullet was folded into the entry now headed *When a plan (or any doc) corrects an earlier claim, sweep that claim's other occurrences in the same file at correction time* — the general lesson now has one address, with the specific case inside it.

### PR review pass 5 — scoped verification, clean

0 new findings. Both pass-4 Minors verified resolved from the tree at `0b1fc29b`, with no scope creep in the fixing commit. `pnpm prism:check` was executed for real in a worktree — exit 0. 14/14 threads resolved. No open findings remain on this branch.

### Phase 1 self-review — `portable-skills`, branch `feat/response-shape-contract`

The ledger above covers the PRISM branch. Phase 1 ran its own review surfaces in the other repo; those records follow, unchanged. Read their statuses against `HunterMcGrew/portable-skills#1`, not against this branch — the `open` Majors and Minors in the Eric record below are open on that PR, and the PRISM branch's own "no open findings" claim above is unaffected by them.

Briar self-review of Phase 1 (`git diff origin/main...HEAD`, 6 commits, 4 files, +28/−5 in `portable-skills`). Scope: the four touched files only — `skills/_shared/core.md`, `skills/briar/SKILL.md`, `skills/winston/SKILL.md`, `skills/sasha/SKILL.md`. Checked: contract self-consistency against `## House rules` and the Closing Re-Orientation Battery, de-identification, naked-reference and line-number-in-cross-reference rules (against the contract's own text and the three persona files' new lines), markdown/fence correctness of the nested-fence insertion, heading placement, and an independent re-run of Task 5c's emitted-block cold read for all three personas.

Verification performed, not just re-read:
- Byte-for-byte diff (plan's Task 1 fenced block, indent-stripped, vs. the actual inserted `## Response shape` section in `core.md`) — exact match; only difference is the routine blank line before the next heading.
- `grep -nE '\(line [0-9]+\)|ADHD|2026-|#[0-9]{2,}|[Hh]unter' skills/_shared/core.md` and the same pattern (plus `PRISM|Linear`) over the three persona files' full text — no matches.
- `grep -c 'Clean-Review Closing' skills/briar/SKILL.md` → 3 (matches the plan's stated baseline-2-to-3 positive control); `grep -n 'clove, eric, or eli'` → no match; `grep -c 'has five sections' skills/sasha/SKILL.md` → 0.
- Re-ran Task 5c's emitted-block bound/verdict-test/next-action-test procedure independently (not trusting `## History`'s self-report) on briar's `## Review format`, winston's `## Output format`, and sasha's `## Output format` — all three pass both tests.
- Diffed the synced profile copies (`~/.claude/skills/`, `~/.claude-work/skills/`) against canonical for all four files — no drift.

No issues found — 2026-07-25 [feat/response-shape-contract].

Non-blocking observation (not a rule violation, informational only): sasha's new closing cross-reference — "the single next action from `` `## Next persona` ``" — carries noticeably less inline content than briar's parallel cross-reference to `` `## Clean-Review Closing` `` (which spells out the routing rule and why Sasha... Briar already holds the resolving inputs). Both satisfy the contract's "every reference carries its own content" bar on a plain reading — `## Next persona` is a same-document structural pointer in the same vein as the contract's own `` `## House rules` `` reference, and it does name what's there ("the single next action") — so this is not raised as a finding. Flagging only because the two edits landed in the same commit series and a future reader diffing them side by side may wonder why one is thin and one is rich.

#### Focused re-review — `ac90821` (sync.sh) and `ae00754` (README.md)

- **Severity:** `major`
- **Status:** `fixed`
- **File:** `README.md:66-67`
- **Problem:** The "owner's sync script" paragraph still reads "it references a plan file at a hardcoded `~/worklogs/...` path that won't exist on your machine — so run as-is it will fail partway." That claim was true before `ac90821` and is now false: `ac90821` wrapped the plan-file `cp` in an `[ -f ]` guard specifically so a missing file is skipped (stderr note) rather than aborting the script. `ae00754` touched this same README section (the `_shared/core.md` gloss two bullets above) but didn't update this adjacent, now-stale sentence describing the exact behavior `ac90821` changed. A reader following this paragraph today will expect `sync.sh` to fail partway on a fresh clone; it no longer does — it completes with the two profile syncs, the Downloads rsync, and a skip note on the one owner-private file.
- **Suggested fix:** Reword to describe current behavior, e.g. "...and it references a plan file at a hardcoded `~/worklogs/...` path that won't exist on your machine — it skips that one file with a note and still completes." Keep the surrounding "treat it as a reference, not a turnkey installer" framing; that recommendation still holds independent of the failure claim.
- **Resolution (verified 2026-07-25, commit `37de41b`):** Reworded to "hardcoded `~/worklogs/...` path specific to the owner's machine — guarded, so a missing file is skipped with a stderr note rather than aborting the sync." Confirmed against the current `sync.sh`: the plan-file copy is a bare `if [ -f ... ]; then cp ...; else echo ... >&2; fi` under `set -euo pipefail` — a test used as an `if` condition doesn't trip `-e` regardless of its result, so a miss takes the `else` branch, prints the stderr note verbatim, and falls through to the script's final unconditional `echo "synced: ..."`. "Skipped with a stderr note rather than aborting" is precisely true. The re-grounded justification sentence — "it's wired to the owner's own two profile dirs (`~/.claude/skills`, `~/.claude-work/skills`) and personal backup location (`~/Downloads/portable-skills-backup`), not yours" — holds up independently of the now-removed failure claim and matches the script's actual hardcoded destinations. `grep -c 'fail partway' README.md` → 0. No new issues in `37de41b`: the diff is scoped to this one paragraph, reads consistently with the surrounding bullets, and introduces no other stale or unverifiable claim.

Verification performed for this focused pass (not just re-read):
- Read the full `sync.sh` (27 lines) — confirmed the diff between `61e9bef` and `HEAD` touches only the final block (lines 17–25); the per-skill copy loop, `rm -rf "${dst:?}/$name"`, and `rsync -a --delete` are byte-identical to before.
- `bash -n sync.sh` → `SYNTAX_OK`.
- Built a scratch replica of the guard (`if [ -f ~/worklogs/... ]; then cp ...; else echo ... >&2; fi` under `set -euo pipefail`, with `HOME` pointed at a scratch dir) and ran it against both a missing-file case and a present-file case: both exit `0`, both reach the final unconditional `echo "synced: ..."`, the missing case prints the stderr note and takes the else branch, the present case copies the file and takes the then branch. Confirms the `[ -f ]` test's unquoted tilde expands correctly (it's a shell-level expansion, not a `test`-level one) and that `set -e` does not fire on a test used as an `if` condition regardless of its result.
- Confirmed the miss-path stderr message ("skipped (backup otherwise complete)") is accurate — the Downloads rsync and both profile syncs already ran by that point in the script, unconditionally, before this guarded block.
- Confirmed `ae00754`'s reworded `_shared/core.md` gloss ("everything a persona relies on that isn't specific to it") accurately describes `core.md`'s actual contents (repo map, plan files, private state, orientation batteries, re-anchors, context budget, closing battery, dispatch contract, session close, response shape, house rules) and reads cleanly in context — no issue with that bullet itself.

No other findings in either commit.

#### Eric PR review — `HunterMcGrew/portable-skills#1` @ `37de41b` (2026-07-25)

Posted to the PR: 6 inline comments + 1 summary comment (`#issuecomment-5080522616`). No labels applied (Majors open). Not approved — `reviewDecision` empty, all six review records `COMMENTED`.

**Major 1 — `codex-agents/*.toml` (27 files) — the rollout landed on one of two surfaces.**
- **Status:** `open`
- **Problem:** `codex-agents/` is a second, hand-maintained copy of the roster; all 27 `.toml` files inline the full shared core (verified: 27/27 contain the `## House rules` text), and 0/27 contain `## Response shape`. `codex-agents/briar.toml:390` still carries `Then the verdict + handoff recommendation (clove, eric, or eli).` — the exact string Task 2b's grep declared gone. `codex-agents/sasha.toml:402-408` still has the pre-Task-4 `Bug Summary → Investigation Trail → Root Cause` order and no `**Root cause:**` line. `codex-agents/winston.toml` has no `**Verdict:**` line. Task 2b's and Task 4b's verification greps were path-scoped to `skills/`, so both returned green on a half-landed rollout. Repo precedent `3eb2992` ("Roll out dispatched-run report-back contract, rescue codex-agents tomls") updated `codex-agents/` in the same commit as a shared-core change; no generator exists (grep for `codex-agents` across scripts/configs returns nothing outside the directory).
- **Suggested fix:** port the four changes into the 27 tomls in this PR, or state in the PR body that `codex-agents/` is a deliberately-lagging surface and open a follow-up. Standing fix: unscoped `grep -rn` on any task whose verification asserts removed text is gone.

**Major 2 — `sync.sh:16-25` — the guard makes a data loss quiet rather than preventing it.**
- **Status:** `open`
- **Problem:** `rsync -a --delete "$SRC/" ~/Downloads/portable-skills-backup/` (line 16) targets the same directory the guarded `cp` writes into, and `sol-internal-autonomy.md` is not under `$SRC` — so `--delete` removes the previously-backed-up copy on every run *before* line 21 is reached. Verified in a scratch harness: after a run where the source file is absent, the destination copy is gone. Pre-`ac90821`, `cp` then aborted the script loudly at that moment; now it is one stderr line reading `backup otherwise complete`, which is accurate about the roster and inaccurate about the file it names. The traded-into failure mode is lossy, not merely incomplete.
- **Suggested fix:** `rsync -a --delete --exclude='sol-internal-autonomy.md' …` — `--delete` skips excluded files on the receiving side absent `--delete-excluded`, verified in the same harness. Or copy the plan file outside the rsync destination.

**Major 3 — `skills/sol/SKILL.md:311-320` — an unedited persona is out of compliance by construction.**
- **Status:** `open`
- **Problem:** the roster audit ("briar, winston, and sasha are the only three personas whose prescribed output order contradicts verdict-first") tested clause 1 of eight. Clauses 6/7/8 were never swept. sol's `## Run report` prescribes `**Awaiting the human** — every parked item: merges to click, gates to decide` (blocking items as bullets — clause 7) and `**Handoff offers** — the next persona for anything unfinished` (plural offers — clause 8); `## Human gates` reinforces it with the batched gate board. sol's shape is *correct design* for an orchestrator, so this reads as a missing carve-out in the contract, not a defect in sol. Also `skills/nora/SKILL.md` § Startup step 15 ends on `**Readiness gaps** still open` with no recommendation requirement (clause 6). `reese` passes — his deliverables are saved documents, correctly excluded by the "governs chat" scoping. Within the edited set, winston's `## Plan Mode` / `## Re-plan Mode` / `## Closing Ceremony Mode` each prescribe their own close and none got a verdict lead; `## Re-plan Mode` closes on a two-part propagation report.
- **Suggested fix:** qualify clause 8 — "one closing next action per lane or thread; an orchestrator's batched gate board is one action per lane, not a menu" — which also legalizes sol's `Awaiting the human` list as a batched structured ask. One-line addition to nora step 15.

**Minors (5), all `open`:**
- `skills/_shared/core.md:119` — the verdict clause puts the ask on the first line; the `## House rules` ask-back bullet puts it in a block "as the last thing", and the blocking-item clause hands that bullet the mechanism (position is part of a mechanism). Composable but unstated.
- `skills/_shared/core.md:117` — "every message a persona sends to chat" sweeps in the structured report-back (briar's file: "the report-back **is the 'chat'**"). Chunking past ~5 would reshape `acVerdicts`, which sol routes on with deterministic predicates; there is no closing action in a report-back; `filesChanged: [paths]` is a bare handle list. Add one sentence scoping report-backs to `## Dispatching a sibling persona`.
- `skills/_shared/core.md:3` — the file's own inventory names 7 of 12 sections and omits `Response shape`. Same defect class `ae00754` fixed in `README.md` this same PR; the derivative copy got fixed, the canonical one didn't.
- `skills/winston/SKILL.md:222` vs `:297` — the unconditional "Architecture looks solid. Want me to go ahead and build out the implementation plan?" now sits in the same message as a possible `Do not proceed` verdict. Branch the offer on the verdict.
- `skills/sasha/SKILL.md:430` — the new cross-reference makes `## Next persona` the authority, but that section's fixed closing quote hardcodes clove even on its winston branch. Use briar's `<clove|eli>` placeholder pattern.
- `skills/briar/SKILL.md:398` — "resolves it to exactly one name" overstates `## Clean-Review Closing`: its issues-found design-problem branch routes to the user with a design-pass suggestion, not a named persona. Task 2b's rationale enumerated four of its five outcomes.

**Cross-cutting (not findings):** the three edited personas do achieve verdict-first in the *emitted* block, independently re-bounded (briar's disclaimer and sasha's preamble are agent-facing and correctly excluded; sasha's "five sections" count was correctly updated). The `Step N of M · <done> · <pending>` template under-specifies `<done>`/`<pending>` — AC-2 is gradeable on presence, not shape. The `## Review Issues` record above quotes README text with parenthetical paths that `README.md:68-69` does not carry at HEAD (the shipped version is better; record-accuracy note only). `sync.sh` otherwise verified clean: `bash -n`, tilde expansion in `[ -f ]`, `set -e` not firing on an `if` condition, else-branch reaching the final `echo` and exit 0.

---

## Acceptance Criteria

### Behavioral

- [ ] **AC-1** — Given a persona reports on a multi-phase run, When it emits its closing message, Then the verdict appears before any supporting detail and exactly one next action appears at the end.
  - Evidence (human): run briar on a branch with at least one Minor finding → read the chat output; the first non-heading line states the verdict, and the message ends with a single action, not a menu. · UNMET looks like: the verdict appears after the Issues list, or the close offers two or more options.

- [ ] **AC-2** — Given a persona's run has ordered phases, When it reports mid-run, Then a state line names the current position and what is pending.
  - Evidence (human): run winston in evaluate-then-plan mode → a line of the form `Step N of M · <done> · <pending>` appears in the output. · UNMET looks like: no positional line anywhere in the response.

- [ ] **AC-3** — Given a list of more than five items, When a persona presents it, Then the items are grouped into named phases and no item is dropped.
  - Evidence (machine): count task bullets in a generated plan's `## Implementation Tasks` and compare against the phase groupings in the same section → every bullet sits under a named phase heading, and the total is unchanged from the pre-grouping draft. · UNMET looks like: a total lower than the draft, or a flat ungrouped list past six items.

### Non-behavioral

- [ ] **AC-4** — `writing-voice.md` gains exactly one line (the reciprocal cross-reference) and no chat-shaped directive.
  - Evidence (machine): `git diff .prism/rules/writing-voice.md` shows a single added line containing `response-shape`. Positive control: the same diff command on `.prism/rules/response-shape.md` shows the full new file, proving the diff probe works. · UNMET looks like: more than one added line, or any occurrence of `Step N of M` / state-line wording in `writing-voice.md`.

- [ ] **AC-5** — Build mirrors are regenerated, not hand-edited, and the full check suite passes.
  - Evidence (machine): `pnpm prism:check` → exit 0. · UNMET looks like: any non-zero exit, or a `.claude/`/`.codex/`/`.cursor/` path in the diff that has no `.prism/` or `.ai-skills/` counterpart.

- [ ] **AC-7** — The consumer seed twin carries the rule but no provenance, and clears both seed gates.
  - Evidence (machine): `grep -cE '[Hh]unter|ADHD|ADR-[0-9]|2026-|#[0-9]{2,}|THR-|PRISM-[0-9]' templates/install/.prism/rules/response-shape.md` returns 0, AND `grep -c 'Still open' templates/install/.prism/rules/response-shape.md` returns at least 1 — the second is the positive control proving the file has real content and the first grep isn't passing on an empty file. · UNMET looks like: any provenance match, or a zero on the control.

- [ ] **AC-8** — Every canonical heading absent from the twin has a classification row.
  - Evidence (machine): extract `^#{2,3} ` heading sets from both files; every canonical heading not present in the twin appears in the plan's `## Seed twin classification` table with a verdict and a named test. Positive control: the twin's heading set is non-empty. · UNMET looks like: a canonical heading missing from both the twin and the table.

- [ ] **AC-6** — The three memory files exist with hyphenated names matching their `name:` frontmatter slugs, and each has an index line in `MEMORY.md`.
  - Evidence (machine): for each of the three files under the project memory directory, the filename stem equals its frontmatter `name:` value, and `grep -c` for that stem in `MEMORY.md` returns 1. Positive control: grep for a nonexistent stem returns 0. · UNMET looks like: an underscore filename, a stem/`name:` mismatch, or a missing index line.

---

## Seed twin classification

Pair: `.prism/rules/response-shape.md` (canonical) ↔ `templates/install/.prism/rules/response-shape.md` (twin). No longer registered `curated` in `.ai-skills/definitions/seed-curation.json` — the two files are byte-identical, so curation bought nothing and only switched off the drift detector; `prism:build` now mirrors this pair like any other synced rule (see `## Review Issues`).

**Verdict: one row was `missing-in-error`, now fixed.** The twin's `**Why:**` block was a same-meaning rewrite of canonical's, and nothing forced it — canonical's Why passes every seed gate verbatim. It has been reverted to canonical's wording verbatim; the two files are now byte-identical.

Why this table exists: the seed has no working drift detector. `.prism/plans/followup-seed-twin-boundary-rule-pressure-test.md` records three independent misses, including `rules/implementation-task-detail.md` — materially stale with identical commit dates on both sides, caught only because it was pulled as a control. Adding a fourth twin to that undetected-drift set without a recorded classification would knowingly create the next silent-drift case. The table turns "already-shipping content nobody re-reads" from an invisible default into a reviewable claim, per that analysis's own conclusion (§ The structural question, item 2: *a recorded per-file classification, written once per twin*).

**Test vocabulary** (from that analysis, § Per-file verdicts and Amendments C/D):

- **Test 1** — install-specific values. Widened by Amendment C from identifier tokenization to *identifier and provenance neutralization*, with three treatments: tokenize when a `${TOKEN}` exists, **de-identify** when a gate forbids the literal, generalize when the value is PRISM's own rendered instance of a per-team config key.
- **Test 2** — reference resolvability: does the referenced target actually ship? Authorities: `seed-curation.json`, the seed tree, `package.json#files`.
- **Test 3** — audience discriminator: maintainer content vs consumer content. The load-bearing test; survived the pressure test unamended.
- Sanctioned transformations (Amendment D): subtraction, tokenization, attribution-to-PRISM, genericization. Same-meaning paraphrase is **not** among them — the boundary rule's own second Decision condemns it.

### Heading-level result — the absent set is empty

```
$ grep -nE '^#{2,3} ' .prism/rules/response-shape.md
28:## Who runs this rule
$ grep -nE '^#{2,3} ' templates/install/.prism/rules/response-shape.md
28:## Who runs this rule
```

Canonical headings absent from the twin: **none**. AC-8's positive control passes — the twin's heading set is non-empty (one heading).

That result is honest but weak *for this file*, and saying so is the point: the file carries a single `##` heading, so a heading-set comparison has almost nothing to compare and would certify this pair as clean no matter how far the prose drifted. The unit of curation here is the block, not the section. The table below therefore classifies at block level, which is where this pair's divergence actually lives. (The heading axis is not useless in general — it catches `implementation-task-detail.md`, whose twin is missing an entire `### When to apply [HITL]` section. It is vacuous on a file this flat.)

### Block-level classification — canonical content absent from or altered in the twin

| Canonical block | Verdict | Deciding test |
| --- | --- | --- |
| `**Why:**` block (canonical:9) — *"A reader scanning a reply should get the verdict and the next action without reconstructing where they are in the thread. That reconstruction is work the writer can do once and the reader would otherwise redo on every message."* | **missing-in-error — fixed** | **No test decides for the twin's version.** Test 1 does not fire — the line carries no name, date, PR number, ADR citation, or install-specific value, and `grep -cE '[Hh]unter\|ADHD\|ADR-[0-9]\|2026-\|#[0-9]{2,}\|THR-\|PRISM-[0-9]'` against it returns `0`, so it would have shipped verbatim and passed AC-7. Test 3 does not distinguish the two texts — both are consumer-appropriate on general grounds. With no test forcing a transformation, the direction of flow is canonical → twin verbatim; the twin diverged anyway on an unsanctioned same-meaning paraphrase, which Amendment D declines to sanction — reverted to canonical's wording in this PR (see `## Review Issues`). |

No canonical block is *omitted* from the twin — the `correct-omission` verdict has no instances on this pair. Both files are 32 lines and are now byte-identical.

### Carried verbatim, deliberately

Recorded so a future editor does not "fix" correct content back into a defect — the failure the classification table exists to prevent:

| Content carried unchanged | Why it correctly ships verbatim |
| --- | --- |
| Persona names throughout — the roster in `## Who runs this rule` | The literal guard's own doc comment (`scripts/ai-skills/literal-guard.ts`) states that persona names are deliberately absent from `SEED_DOGFOODING_PATTERN` as *legitimate framework content that ships to consumers*. Test 3 agrees: a rule governing how a consumer's own personas reply is consumer content. `branch-plan.md`'s twin practices the opposite convention (de-naming personas) and is wrong to — do not copy it here. |
| `.prism/rules/writing-voice.md` boundary paragraph and the `[writing-voice.md § Answer first, one offer at a time](./writing-voice.md)` link | **Test 2 resolves.** `templates/install/.prism/rules/writing-voice.md` exists in the seed tree, and the relative link resolves within the installed `.prism/rules/` directory. The reference is live for a consumer, not dangling. |
| "the PRISM roster" | Attribution-to-PRISM (Amendment B) — the framework names itself to the consumer who installed it. |
| `AskUserQuestion` named as an example (canonical:19) | Already hedged as *"the host's structured-question mechanism (e.g. `AskUserQuestion`)"* — host-neutral phrasing with a concrete instance behind it. Test 3: consumer-facing, no maintainer coupling. |
| Absence of any `ADR-NNNN` citation | Nothing to strip. Task 9 instructed removing "the ADR-0035 citation," but canonical never carried one — `runInstallAdrGate` has no target here. Recorded because the task text implies a removal that did not happen, which a later reader could mistake for a missed edit. |

### Recommended fix — applied

Reverted the twin's `**Why:**` block to canonical's text verbatim. Direction of flow was canonical → twin, and canonical's version clears both seed gates unmodified. Owned by the implementer (this file is not Winston's to edit); same file, same thread, so it folded into this PR rather than earning a follow-up ticket, per `.prism/rules/followup-scope.md`.

Root cause is plan-level, not implementer error: Task 9 mandated "rewrite only the `**Why:**` block on general grounds," on the premise recorded in `## Decisions` that canonical would keep personal provenance (ADHD framing, dated sessions). Task 6's canonical output already stated the why on general grounds, which invalidated that premise — so the mandated rewrite became a transformation with nothing left to transform, and shipped as pure divergence. The cost is not the wording: it is that the next canonical edit to that paragraph has no mechanical signal to land in the twin, because a heading-set comparison sees two identical heading sets and reports clean.

---

## History

- 2026-07-25 [huntermcgrew/prism-445-response-shape-contract]: Clove fixed Briar's self-review pass 2 Major — sasha's diagnosis deliverable ended on `### Follow-up` bullets with no stated next action, the other half of AC-1's two-part test. Added the closing next-action line to `output-format.md` and fixed the coupled stale blockquote in `prism-debugger/shared.md:339` to match. `pnpm prism:build` regenerated mirrors; `pnpm prism:check` exits 0 (571/571 tests).
- 2026-07-25 [huntermcgrew/prism-445-response-shape-contract]: Reese graded the four machine-checkable AC — AC-4 (writing-voice gains one line), AC-5 (`pnpm prism:check`), AC-7 (twin provenance), AC-8 (twin classification rows) — all MET, each verified alongside its named positive control so an empty-file pass is ruled out. AC-1/AC-2/AC-3 were left ungraded as human evidence paired with Task 12, and AC-6 is out of this repo's scope. Recorded the result and the one carried-forward twin `**Why:**` divergence under `## Review Issues`; nothing fixed in-lane.
- 2026-07-25 [huntermcgrew/prism-445-response-shape-contract]: Winston wrote `## Seed twin classification` for the `response-shape.md` pair. Heading-level absent set is empty (one `##` heading per side), so the table classifies at block level, where the pair's two divergences live. One is `missing-in-error` — the twin's `**Why:**` block is unsanctioned same-meaning paraphrase; canonical's clears every seed gate verbatim.
- 2026-07-25 [feat/response-shape-contract]: Task 1, 2b, 4b landed as three separate commits (e1cc8b7 core.md, da8f4e3 briar, 61e9bef sasha); Task 1's grep and both 2b greps passed on first try. `sync.sh` re-ran clean (Task 5): only the pre-existing unrelated profile-only directories remain as diffs. Task 5c (emitted-block method, not 5b's physical-line method) run cold on all three files — briar, winston, sasha all PASS both the three-element verdict test and the last-element next-action test; winston's `### A/P/C menu` was not re-raised per the plan's pre-clearance. Phase 1 is now fully landed; nothing pushed, no PR opened per this dispatch's bounds.
- 2026-07-25 [feat/response-shape-contract]: Re-plan — Task 1 unblocked and the two cold-read failures resolved. Task 1's verbatim text had three example tokens pointing at live objects (`#442`, this plan's own `Task 10`/`Task 12`, and a bolded-lead example asserting a fact Task 2 falsifies); all three are now shapes that cannot resolve, and the text passes its own grep. The 5b failures were diagnosed as a measurement defect plus two genuine contract violations: Task 5c re-reads the *emitted template* instead of the file's physical lines (preambles stay put), while new Tasks 2b and 4b fix briar's three-way handoff menu and give sasha a verdict line and a closing next action.
- 2026-07-25 [feat/response-shape-contract]: Task 5b cold read (informal) — winston passes: the verdict line and the closing single offer both land inside the first/last three physical lines of `## Output format`. Briar and sasha fail: briar's new `**Verdict:**` line sits one line past the three-line window, hidden behind the format-disclaimer sentence, and sasha's promoted `### Root Cause` sits five lines in behind a five-section preamble; neither file's last three lines state one bounded next action (briar's is a three-way handoff menu, sasha's is a Follow-up checklist). Routing back to winston per this task's built-in escape rather than holding the branch.
- 2026-07-25 [feat/response-shape-contract]: Tasks 2-4 landed as three separate commits (4412cdc briar, b31a3a9 winston, b2872b9 sasha) reordering verdict-first output exactly per the plan's instructions. Profile drift pre-check showed no un-ported edits beyond the three files just changed; `sync.sh` ran clean and the specified verification diff command exited 0 (`SYNC_OK`).
- 2026-07-25 [feat/response-shape-contract]: Task 1 blocked — the plan's verbatim contract text uses `#442` as its "naked handle" example, but `#442` is the real PRISM issue this same plan cites in Task 9, so the text both violates the stated de-identification constraint and fails the task's own specified verification grep (`#[0-9]{2,}`). Reverted the uncommitted `core.md` insertion rather than reword the verbatim text or ship a known-failing check — needs a corrected example number (a non-live number, e.g. a placeholder) before Task 1 can land.
- 2026-07-25 [feat/response-shape-contract]: Task 1's contract text resolved verbatim into the plan and three defects corrected before implementation — the House-rules cross-reference shipped a line number that the insertion itself would invalidate, six of nine clauses carried no reader-cost clause, and Task 3's insertion point admitted two valid readings. Added Task 5b (informal cold read) and recorded the profile-drift pre-check as clean. Branch `feat/response-shape-contract` created off `origin/main` in `portable-skills`; no source file edited.
- 2026-07-25 [main]: Filed [HunterMcGrew/PRISM#445](https://github.com/HunterMcGrew/PRISM/issues/445) covering Phase 2 and Phase 3. Phase 1 is tracked in `HunterMcGrew/portable-skills`, which turned out to be a real repo — so the contract's own framing there must be de-identified too, per that repo's `b94f665` "Genericize personal and workplace references."
- 2026-07-25 [main]: Contract widened past section order — references must carry their own content, open items must carry a recommendation, and blocking items graduate from a prose bullet to a structured ask. Added after this plan's own closing message shipped two instances of the defect (an undescribed `Task 10` whose number had silently moved, and a recommendation-free open item); see Decision: *The contract governs cross-references and open items*.
- 2026-07-25 [main]: Consumer-distribution question resolved — ships as a curated seed twin with provenance de-identified per the curation boundary's Amendment C.3. Settled by precedent (`writing-voice.md` already ships; `skill-authoring.md` doesn't, and the maintainer-vs-consumer discriminator explains both), not by preference. Tasks renumbered to 12; added the classification-table task and AC-7/AC-8.
- 2026-07-25 [main]: Plan created — chat-output contract for the portable roster and PRISM. Verified `writing-voice.md` is the wrong home (self-excludes ad-hoc conversation; Tier 1 always-loaded) and that briar, winston, and sasha are the only three personas whose prescribed output order contradicts verdict-first.
- 2026-07-25 [huntermcgrew/prism-445-response-shape-contract]: Task 11 (build and check) — `pnpm prism:build` regenerated `.claude/`, `.codex/`, `.cursor/` mirrors (571/571 tests passing); `pnpm prism:check` exited 0 on the first run, covering build parity, types, tests, manifest coverage, crossref lint, and pack parity. Committed the regenerated mirrors as 8c6a143, pushed, opened draft PR HunterMcGrew/PRISM#446 against `main`.
- 2026-07-25 [huntermcgrew/prism-445-response-shape-contract]: Clove fixed both open Major findings from Briar's self-review pass 1. Replaced the pre-fix example tokens on `response-shape.md` canonical and twin (lines 14-15) with the corrected wording quoted in the finding; collapsed briar's four-way closing menu in `prism-code-review-self/shared.md:334` to one action deferring to the file's own `## Next persona` routing; added a `**Verdict:**` line before sasha's `### Bug Summary` in `debugger/output-format.md`. `pnpm prism:build` regenerated all mirrors and AGENTS.md; `pnpm prism:check` exits 0.
- 2026-07-25 [huntermcgrew/prism-445-response-shape-contract]: Briar ran self-review pass 3 of 3 (final). Independently re-verified all five weighted risk areas — no new Critical/Major found. `pnpm prism:build` produced zero diff (mirrors not hand-edited) and `pnpm prism:check` exits 0. The pre-existing open Minor (twin `**Why:**` paraphrase) is unchanged, per instruction not to fix.
- 2026-07-25 [huntermcgrew/prism-445-response-shape-contract]: Clove fixed all 6 findings from Eric's PR review pass 1 (2 Major, 3 Minor + 1 confirmed pre-existing Minor). Deleted the stale `#442`→`#3` classification row and corrected the "differ on exactly two/one" claims; re-pointed briar's closing to `## Clean-Review Closing` by section name; trimmed the persona enumeration in `response-shape.md` (both surfaces); inlined sasha's cross-file `## Next persona` handle; labeled briar's verdict line; reverted the twin's `**Why:**` block to canonical, which now makes the two files byte-identical.
- 2026-07-25 [huntermcgrew/prism-445-response-shape-contract]: Clove fixed both open Majors and the one open Minor from Eric's PR review pass 2 — all three were downstream consequences of pass 1's fixes that were never swept. Dropped `response-shape.md` from `seed-curation.json`'s `curated` list (the fixed twin made it byte-identical to canonical, so curation only switched off the drift detector) and let `prism:build` mirror it normally; removed the classification table's `**Reorder briar's output**` clause, which blessed a token pass 1 had already deleted as a defect; replaced the phased-persona enumeration with a pointer to `session-orientation.md`'s `## The run, in order` marker, applied identically to canonical and twin. `pnpm prism:build` regenerated mirrors; `pnpm prism:check` exits 0 (571/571 tests).
- 2026-07-25 [huntermcgrew/prism-445-response-shape-contract]: Clove fixed both open Majors and the one open Minor from Eric's PR review pass 3. Added a decision-gate exemption to the "Exactly one closing next action" clause on canonical and twin, citing `writing-voice.md`'s carve-out by section name; added a reversal sub-bullet to the `## Decisions` entry the seed-twin curation reversal had left stale and aligned Task 9's closing sentence to match; reworded the pass-3 self-review's stale "remains open" sentence to note the later fix. `pnpm prism:build` regenerated mirrors; `pnpm prism:check` exits 0 (571/571 tests).
- 2026-07-25 [huntermcgrew/prism-445-response-shape-contract]: Winston merged this ticket's two diverged plan copies into one union, restoring the Phase 1 record the branch never carried — four Decisions, Tasks 2b/4b/5c, the corrected Task 1 example tokens, five `## History` entries, one `## Sessions` entry, and the `portable-skills` self-review. Same-fact conflicts resolved by phase ownership: Phase 2's Task 9 and reversed seed-twin Decision stand, Phase 1's Task 1 and 5b/5c supersession stand. Also committed `followup-seed-twin-boundary-rule-pressure-test.md`, which existed nowhere in git despite this plan citing its Amendment C.3.

---

## Cleanup Items

- `~/.claude/projects/-Users-hunter-Documents-PRISM-PRISM/memory/prism-sol-merge-authority.md` — file exists with no `MEMORY.md` index line, so it is unlikely to be recalled. Pre-existing, unrelated to this plan; left alone.

---

## PR Readiness

- [x] No critical or major issues — self-review's Majors and every Major and Minor from Eric's PR review passes 1–5 confirmed landed and fixed; passes 4 and 5 raised no Critical or Major at all — see `## Review Issues` § Review ledger
- [x] `pnpm prism:check` passes — exit 0, re-confirmed after pass 3's fixes (571/571 tests, build/crossref/pack-parity/manifest-coverage all clean)
- [x] Consumer-distribution open question resolved — ships as a plain build-mirrored twin (no longer `curated`; the two files are byte-identical, so the drift detector now runs on this pair like any other synced rule); the `## Decisions` entry now carries a reversal sub-bullet matching what shipped
- [ ] Lasting decisions promoted to architect context — pending plan close (all Decisions still carry `→ promotion verdict pending close`)
- [ ] Phase 3 (Task 12, cold-read AC verification) still open — draft PR #446 does not close the ticket until AC-1 through AC-8 are checked
- [x] Build passes — last run: 2026-07-25 (pass 3 fixes: `pnpm prism:build` regenerated mirrors, `pnpm prism:check` exits 0)

**Last updated:** 2026-07-25
