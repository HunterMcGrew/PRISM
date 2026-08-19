# Plan: opus5-port

## Ticket

Unfiled — no tracker ticket, port authored by Winston under a Sol fleet dispatch, 2026-08-13. Source material: `.prism/research/opus5-port-evidence.md` (thrive PRs #2240–2326, the `~/Documents/portable-skills` slimming doctrine, thrive's live hook system) — dispatch-session research, deliberately kept untracked and out of every commit on this stack per the run's own instructions, so this citation names the file for the working tree that produced this plan rather than pointing a fresh clone anywhere. Supersedes [`.prism/plans/thrive-port.md`](./thrive-port.md), whose PR A is open as [#449](https://github.com/HunterMcGrew/PRISM/pull/449) and whose PRs B–H were never started.

## Goal

Retune PRISM for Opus-5-class instruction-following in three stacked PRs: condition-gate the always-on rule layer, convert the hook runtime to zero-dependency `.mjs` so hooks reach consumers at all and add the authoring-route deny, and slim the 31-skill roster onto a shared core.

---

## PR map

| PR | Branch | Theme | Tasks | Stacks on |
| --- | --- | --- | ---: | --- |
| **PR 1** | `huntermcgrew/thrive-port-opus5-rule-amendments` (existing, #449) | Rules retune | 9 (tasks 1–9) | `origin/main` |
| **PR 2** | `huntermcgrew/opus5-port-hooks-mjs` | Hook runtime → `.mjs` + authoring deny | 10 (tasks 10–19) | PR 1 (and reconciles #457) |
| **PR 3** | `huntermcgrew/opus5-port-roster-slim` | Shared core + roster slimming | 10 (tasks 20–29) | PR 2 |

Sequencing is forced, not stylistic — see § Cross-PR collisions.

---

## Decisions

- **PR 1 lands on #449's existing branch; it is not superseded by a fresh PR.**
  - **Root cause of the question:** #449 is `CONFLICTING` against `main` and has been open since 2026-07-30, which reads like a stalled branch worth abandoning.
  - **Evidence:** `git merge-tree --write-tree origin/main origin/huntermcgrew/thrive-port-opus5-rule-amendments` reports exactly two conflicts — `.prism/lessons.md` (append-order) and `.prism/plans/thrive-port.md` (add/add, because main acquired its own copy via `huntermcgrew/context-delivery-mechanism`). **None of the three rule bodies conflict.** The branch is 4 ahead / 8 behind.
  - **Alternatives considered:** close #449 and re-author the three amendments in a new PR; cherry-pick the three rule commits onto a fresh branch.
  - **Chosen approach:** rebase-or-merge #449 onto `origin/main`, resolve the two mechanical conflicts, and add PR 1's remaining work as further commits on the same branch. Re-authoring throws away two rounds of Eric review fixes (four findings pass 1, two pass 2, all recorded in `thrive-port.md § Review Issues`) and would re-litigate language a human already ruled on.
  - **Implementation guidance:** `.prism/lessons.md` is append-only — take both sides. `.prism/plans/thrive-port.md` — take `origin/main`'s copy wholesale; see the stash Decision below for why the branch copy carries nothing unique.
  - **→ promotion verdict pending close.**

- **`stash@{0}` is stale and carries nothing that is not already on `main` — drop it, do not apply it.**
  - **Evidence:** `git stash show -p stash@{0}` is a single-line `## History` append to `.prism/plans/thrive-port.md` (the 2026-08-01 thrive-PR-inventory entry). `git show origin/main:.prism/plans/thrive-port.md | grep -c "2026-08-01 .*Inventoried"` returns `1` — the line is already on `main`.
  - **Chosen approach:** `git stash drop stash@{0}` as part of task 1, after the grep above is re-run and returns `1`. The prior session's note that "whatever else `stash@{0}` carries may still belong on the branch" (`thrive-port.md § Decisions`, provenance entry) is now answered: it carries nothing else.
  - **→ promotion verdict pending close.**

- **The `git stash drop stash@{0}` this plan calls for was deliberately not executed — reversed by Sol's explicit instruction during PR 1 implementation, not by the implementer's judgment.** The redundancy precondition above still holds — `git show origin/main:.prism/plans/thrive-port.md | grep -c "2026-08-01 .*Inventoried"` returned `1` when Clove ran it (task 1) and again when Briar re-verified it in self-review — so nothing about the "safe to drop" analysis changed. What changed is who owns the drop: the stash is operator data, dropping a stash is irreversible, and no operator was available mid-dispatch to confirm the drop in the moment. Sol's dispatch instructions for this session named the drop as the one step to skip and report on instead.
  - **Current state:** `stash@{0}` is still present on `huntermcgrew/thrive-port-opus5-rule-amendments` as of this Decision. The operator (Hunter) can drop it at will — the precondition that makes it safe to drop has been verified twice and holds.
  - **→ no promotion needed (session-scoped operational note; the underlying redundancy Decision above is what would promote, not this reversal).**

- **The authoring-route deny is scoped to authoring paths only; `code` routes stay nag-only on every verb.** This reverses the recommendation in [ADR-0071](../spec/adrs/_toolkit/0071-architect-context-read-hook.md) (design 2, "a `PreToolUse` gate on `Edit` … adds friction and false positives") and contradicts the live line in `.ai-skills/skills/prism-conductor/shared.md:106`. Both are corrected in PR 2, by ADR and by edit respectively — a carve-out that leaves the tree contradicting itself is worse than no carve-out.
  - **Root cause the carve-out addresses:** architect-context routing is diff-blind (ADR-0071 § Context). The nag names the doc; nothing makes reading it a precondition of the edit. On instruction-layer files — rules, ADRs, skill bodies — an edit made without the governing doc does not merely produce worse code, it produces *wrong spec that later readers execute*.
  - **Why this is not the reverted floor:** ADR-0067's gate sat on the `Stop`/`SubagentStop` report-back channel, so a blocked persona spent its final turns fighting its own gate and one dogfooding agent tried to edit the gate's code. This gate sits on a mid-work `Write`/`Edit` call, is cleared by reading a document, and never touches the report-back turn. [ADR-0069](../spec/adrs/_toolkit/0069-deterministic-verification-is-a-pipeline-stage.md)'s permanent rejection is explicitly scoped — "no gate, of any shape, sits on the turn where a persona reports back to Sol" — and this gate does not. `epic-floor-revert.md § Decisions` ("No hooks survive") left the door open in the same breath: *"If a lightweight `ownership-guard`-only safety is wanted later (write-lane protection without verdict ratification), that is a separate, smaller opt-in — not this revert."*
  - **Alternatives considered:** deny on all routes including code (rejected — a code deny is the friction ADR-0071 named, on a surface where a missed doc costs a review comment, not a wrong rule); keep nag-only everywhere (rejected — the status quo, and the operator has approved the scoped deny); a prose rule instead of a hook (rejected — `context-reuse.md § Architect-context routing is diff-blind` already *is* that prose rule and the gap persisted).
  - **Implementation guidance:** the deny is task 12; the ADR is task 17; the conductor-line edit is task 17. All three ship in PR 2 or PR 2 is incoherent.
  - **→ promotion verdict pending close (promotes to the new ADR).**

- **The shared core lives at `.prism/references/skill-core.md`, not at `.ai-skills/skills/_shared/core.md`.**
  - **Root cause:** portable-skills' `_shared/core.md` sits beside the skills because that roster's skills *are* the install surface. PRISM's are not — `generatePlatformSkills` (`scripts/ai-skills/generate-skills.ts:542-600`) iterates the roster from `.ai-skills/definitions/roles.json` and writes `<targetRoot>/<skillId>/SKILL.md`. A `_shared/` sibling would need a roster exclusion, a copy pass, a `seed-curation.json` classification, an eject-cleanup exemption (eject removes `prism-*` prefixed dirs; `_shared` is not one), and a `package.json#files` entry.
  - **Evidence for the alternative:** `.prism/references/**` already ships (`package.json#files`), already gets a platform copy on every build, and is already the citation shape 31 skill bodies use — 25 cite `context-reuse.md`, 18 cite `references/session-close.md`, 31 cite `session-orientation.md`. `session-close.md` is a partial shared core today; this names the seam and finishes it.
  - **Alternatives considered:** `_shared/` under `.ai-skills/skills/` (rejected above); a build-time partial inline (rejected — `build.ts` has no include mechanism, and inlining reintroduces per-persona copies that fork, which is the exact failure portable-skills' single-shape-owner rule exists to stop).
  - **Chosen approach:** one file, `.prism/references/skill-core.md`, read at Step 0 by every persona before greeting. Quote a fragment, never restate it. A persona that overrides a core section writes a one-line stub under the core's heading name.
  - **→ promotion verdict pending close.**

- **PR 1 removes `session-orientation.md § Lifecycle List` and retargets `response-shape.md`'s state-line trigger, because PR 3 deletes the marker both rules key on.** `response-shape.md:65` reads: *"it fires only when the current run has ordered phases, the same marker `session-orientation.md` § Lifecycle List uses: a skill carries a `## The run, in order` list."* PR 3 deletes all 22 of those headings. Shipping PR 3 first leaves two always-on rules pointing at a marker that exists nowhere — the removal-completeness failure `code-standards.md` names, in its behavior-changed-without-a-token variant. PR 1 owns both rule edits; PR 3 owns the skill-body deletions.
  - **→ promotion verdict pending close.**

- **DoD blocks lose the checklist, keep real criteria — this is Rule 2 applied, not a reversal of the floor-revert.** `epic-floor-revert.md § Decisions` (Shape 2 and its Class A variant) deliberately preserved each skill's `## Definition of Done` because the gate-enforced `types`/`lint`/`tests` criteria were Clove's genuine DoD, merely enforced by the gate. Evidence Rule 2 `[Anthropic]` says explicit verification instructions cause over-verification on Opus 5. These reconcile on one deletion test, already approved as `thrive-port.md` task 4: **does this item tell the model something its defaults or an already-cited always-on rule do not?** Items restating a battery, "types pass", "no stray console.logs", or "full diff read" go. Items carrying skill-specific policy — "No implementation code written", "AC synced to tracker", Clove's build gate — stay. The heading survives wherever real criteria remain, so no acceptance criterion asserts a heading count of zero.
  - **→ promotion verdict pending close.**

- **The `.mjs` runtime owns `compileMatcher`; `scripts/ai-skills/tsconfig.json` gains `"moduleResolution": "bundler"` so the TS side imports it rather than copying it.** `architect-route.ts` imports `compileMatcher` from `../verify-manifest-coverage` today. A zero-dependency `.mjs` cannot import a `.ts` module, and duplicating the matcher is the dual-source-of-truth `.prism/lessons.md` records as a repeat defect ("When building an anti-drift guard, sweep the guard's own constants for the same dual-source-of-truth it forbids"). Root `tsconfig.json` sets `moduleResolution: "node"`, which cannot resolve a `.mjs` specifier or a `.d.mts` sidecar; the scripts-scoped tsconfig already overrides `noEmit`, so a second scoped override is contained and does not touch the root.
  - **Alternatives considered:** duplicate the matcher plus a parity test (rejected — two implementations is the defect; the parity test only detects the drift it permits); change the root tsconfig (rejected — wider blast radius than the change earns).
  - **Default path if `pnpm prism:check-types` fails under `bundler`:** duplicate `compileMatcher` into the `.mjs`, add `scripts/ai-skills/manifest-matcher-parity.test.ts` asserting both implementations agree on one shared case table **and** on every live `manifest.json` key crossed with a fixture path set, and record the fallback in `## History`. Recorded here so the implementer does not have to make the call cold.
  - **→ promotion verdict pending close.**

- **Consumers receive the hook as a copied file in their own repo, not as a `node_modules` path.** ADR-0071 named the unblock condition as *"once `scripts/ai-skills/hooks/` ships in `files` and that seed is updated to match"* — but a registration pointing into `node_modules/@huntermcgrew/prism/...` reintroduces the dependency the `.mjs` conversion exists to remove (an `npx`-installed consumer may have no such tree). Instead `prism:adopt`/`prism:update` copy the runtime into the consumer's `.claude/hooks/`, and the seeded `settings.json` invokes `node "$CLAUDE_PROJECT_DIR/.claude/hooks/hook.mjs" --tool=claude`. `files` still gains `scripts/ai-skills/hooks/` because the copy source must be in the tarball, and `RUNTIME_READ_PATHS` gains it because `verify-pack-parity.ts` is the gate that catches an omitted `files` entry (the 0.7.1 `config.schema.json` failure).
  - **→ promotion verdict pending close.**

- **PR 2 stacks on PR 1 rather than reconciling #457 by merge.** #457 is an open draft that refactors the same three files into a `--tool=` dispatcher with a `HARNESSES` table, adds `.cursor/hooks.json`, and hardens `verify-manifest-coverage.ts` against brace globs. Its harness-table *shape* is what evidence § 8 prescribes and PR 2 needs; its *substrate* is TypeScript-via-`tsx`, which is the delivery blocker. Rebuilding the table from scratch in `.mjs` discards a reviewed design; merging #457 first and then rewriting every file it added produces two review passes over the same lines.
  - **Chosen approach:** PR 2 branches from PR 1 and ports #457's `HarnessSpec`/`HARNESSES`/`resolveToolKind`/`extractPatchFilePaths`/foreign-payload-guard design into `.mjs`, citing #457 as the design source in the PR body. #457 is then closed as superseded, not merged — its ADR-0071 link sweep and its `verify-manifest-coverage.ts` brace-glob rejection are carried forward as task 9's explicit sub-items so nothing in it is lost.
  - **Alternatives considered:** merge #457, then convert (rejected — double review of the same lines, and `main` briefly carries a TS runtime the next PR deletes); ship PR 2 without the harness table (rejected — evidence invariant 6 makes the table the only place harness-specific field names may live).
  - **→ promotion verdict pending close.**

- **`thrive-port.md` is superseded by this plan, and its unbuilt tasks that do not fit these three PRs are re-homed here as a named deferred set** (§ Deferred — not in this stack). Leaving a second plan open with five unstarted PRs is the stalled-plan shape this dispatch exists to clear.
  - **→ promotion verdict pending close.**

- **OPEN — TBD, needs Hunter input.** Whether the closing battery in `.prism/rules/session-orientation.md` should scale with task size the way the opening battery now does. Carried forward unresolved from `thrive-port.md § Decisions` (Eric PR #449 pass-2: `close:` carries one verdict token where `open:` has three answer slots, so a collapsed closing shape needs its own definition, not an implied mirror). **Default path (used until resolved):** the closing battery keeps its unconditional four-question form; PR 3 collapses only the per-skill *restatement*, never the rule.

- **OPEN — TBD, needs Hunter input.** Whether prompt-time persona routing (thrive #2275) is worth porting. Evidence § 1 measures it as the difference between an 8–9-file relevant run and a 3-file run that shipped an invisible fix, and PRISM's `skill-routing.md` is the same buried-table shape the hook was written to replace. **Default path (used until resolved):** not in this stack. It is a fourth PR on the same hook runtime PR 2 builds, and stacking it here would make PR 2 unreviewable.

- **Canonical-surface discipline (inherited from `thrive-port.md`, unchanged):** every rule edit lands in `.prism/rules/`; `.claude/rules/`, `.codex/rules/`, `.cursor/rules/`, and `templates/install/.prism/rules/` are build-managed mirrors regenerated by `pnpm prism:build`. Every skill edit lands in `.ai-skills/skills/<id>/shared.md`. Editing a mirror is the failure mode. Every task below names source paths only. **Two named exceptions**, both hand-maintained: `AGENTS.md`'s `## Behavioral norms` pointer table (the generated rule-body block below it *is* regenerated by `agents-md-block.ts`), and the two `curated` seed twins this stack touches — `templates/install/.prism/architect/_toolkit/skills-ecosystem.md` and `templates/install/.prism/references/architect/plan-mode.md`, which `checkSeedDrift` only checks for *existence*, never content.
  - **→ promotion verdict pending close.**

- **Task 5's `AGENTS.md § Behavioral norms` instruction says "delete row 8 and renumber the rows below it" — implemented as delete-and-leave-the-gap instead, across both places the number appears.** The table's own header sentence states the numbers are "kept so existing `AGENTS.md §N` cross-references still resolve," and the table already carries a live precedent for this: §7 and §9 are both missing from the compact table (a prior removal left the gap rather than renumbering), and `core-principles` sits at an unnumbered `—` row rather than claiming either slot. The removal-completeness sweep (`code-standards.md § Removal and rename completeness`) surfaced a second, un-named-by-the-task structure sharing the same number space: `AGENTS.md` also carries a full `## N. Title` heading list (lines ~1760–1814, after the generated Tier-1 block) that the compact table indexes — §7 (Project Engineering Standards) and §9 (Ownership & Handoff) exist there with real content, which is *why* the compact table skips them (their target isn't a single `.prism/rules/*.md` file, so the table's `Rule` column has nothing to point at). This confirms the numbers are a single shared space across both structures, not two independent ones.
  - **Chosen approach:** deleted §8's content in both places and left the numbering gap (`6 → — → 10 → 11 → 12` in the table; `7 → 9` in the heading list), matching the §7/§9 precedent. `AGENTS.md § 8` was the one live citation of the retired section (in ADR-0006, which this same task flips to deprecated with a superseding note). Two ADRs *do* cite §11 and §12 by number as "live specification" — `0007-cross-agent-handoff-accountability.md:33` and `0008-pre-compaction-checkpoint.md:35` — and renumbering either would have broken both; their existence is the strongest argument for leaving the gap rather than the absence this Decision originally claimed (Eric, PR #449 pass 3).
  - **Alternatives considered:** renumbering literally as instructed (rejected — contradicts the shared invariant stated one line above the table, on no evidence the invariant no longer holds).
  - **→ no promotion needed (implementation-tactical; the §7/§9 gap precedent already governs future removals from this number space).**

- **OPEN — TBD, needs Winston/Hunter input. The five-way PR 2A–2E split this Clove session was dispatched to implement is not present in this file as committed on `origin/main`.** This branch's own `.prism/plans/opus5-port.md` (checked out from `origin/main` at `536a01d3`) still carries the single unsplit `### PR 2` (tasks 10–19, `.claude/settings.json` deny bundled in) — there is no `### PR 2A`, no `AUTHORING_PREFIXES`-free universal deny, no `A1`–`A8` task IDs, and none of the twelve operator decisions the dispatch prompt cited (announce-once, credit-channel widening, the measured-false tsconfig correction, the `os.tmpdir()` reversal, etc.).
  - **How this was discovered:** the dispatch prompt and `.prism/plans/conductor/architect-gate-port.md` (an **untracked** file present in this worktree, `git ls-files` confirms it) both describe the split stack in detail and instruct implementing tasks A1–A8 against it. A Read call early in this session used an absolute path that (by mistake) resolved against the shared main checkout outside this isolated worktree rather than this worktree's own copy, and returned the full A1–A8 content — genuine Winston output, matching #457, real file:line citations, internally consistent with the conductor log. The sandbox's worktree-isolation guard now correctly refuses re-verifying that path. Re-reading this worktree's own tracked `.prism/plans/opus5-port.md` shows the split was never committed to `origin/main` or pushed to any branch (`git ls-remote --heads origin` has no branch carrying it).
  - **What shipped anyway:** this session implemented the full A1–A8 scope as described in that unverified read — `scripts/ai-skills/hooks/{harnesses,architect-route,hook}.mjs` + `.d.mts` sidecars, `lib/match.mjs` (matcher's one owner), the announce-once contract (`announced` array alongside `read`), computable catch-all + brace-glob rejection in `verify-manifest-coverage.ts`, the consumer-delivery seam in `update.ts` (`refreshHookRuntime`), `package.json`/`verify-pack-parity.ts` entries, and `hook-gate.test.ts` including a cold-start `npm pack` integration leg. `pnpm prism:check` is green (696 tests). None of this touches the deny gate — the old committed task 12 bundles a `PreToolUse` deny into this same PR; this session deliberately did not build one, per the dispatch prompt's explicit "2A ships no deny."
  - **Default path (used until resolved):** the work ships as a draft PR so nothing already tested is lost, but the plan authority question is unresolved — this Decision itself is the flag. Winston needs to either land the real replanned `opus5-port.md` on `origin/main` (or this branch) so the task IDs this PR's commits reference actually resolve for a future reader, or confirm out-of-band that the committed single-PR-2 shape (with its bundled deny) is what should have shipped instead, in which case this PR under-delivers against it (no deny arm) and over-delivers against nothing else material.

---

## Cross-PR collisions

This is the reason all three PRs are planned together rather than by three parallel planners. Each row names the file, the colliding tasks, and the owner.

| File | PR 1 touches | PR 2 touches | PR 3 touches | Owner / resolution |
| --- | --- | --- | --- | --- |
| `.prism/rules/session-orientation.md` | task 6 — delete § Lifecycle List | — | — | **PR 1 owns.** PR 3 deletes the markers this section mandates; the rule must stop requiring them first. |
| `.prism/rules/response-shape.md` | task 6 — retarget the state-line trigger off the `## The run, in order` marker | — | — | **PR 1 owns.** Same forced order. |
| `.prism/rules/subagent-strategy.md` | tasks 1, 2 — #449 removed the tiebreaker; task 2 adds the inverse | — | — | **PR 1 owns.** Task 2 sequences after task 1. |
| `.prism/rules/context-reuse.md` | task 5 — citation-list entry for the retired rule | task 13 — the diff-blind clause now has a mechanical enforcer | — | **Split, sequenced.** PR 1's edit is a list line; PR 2's is a new sentence in a different section. PR 2 rebases after PR 1. |
| 11 × `.ai-skills/skills/*/shared.md` | task 5 — remove the handoff-check paragraph | — | tasks 19–23 — slim the same bodies | **PR 1 first, PR 3 rebases.** PR 1's edit is a one-paragraph delete per file; PR 3 restructures around it. Reversing the order makes PR 1 a 31-file conflict. |
| `.ai-skills/skills/prism-conductor/shared.md` | — | task 17 — § Enforcement is guidance + pipeline stages | task 24 — new § Talking to the operator | **PR 2 owns § Enforcement; PR 3 owns § Talking to the operator.** PR 3 must not touch line 106's section. |
| `.ai-skills/skills/prism-architect/shared.md` | task 5 — handoff-check paragraph | — | tasks 19–23, and task 22's exit-condition rewrite of the Batch 1 / Batch 2 startup reads | **PR 1 then PR 3.** The startup-batch rewrite is the largest single edit in PR 3; landing PR 1's one-line delete first keeps it out of that diff. |
| `scripts/ai-skills/verify-manifest-coverage.ts` | — | tasks 9, 10 — `compileMatcher` moves to `.mjs`; brace-glob rejection carried from #457 | — | **PR 2 owns.** No other PR touches `scripts/`. |
| `.prism/architect/manifest.json` + `_toolkit/manifest.base.json` | task 5 — drop the retired rule's route key | task 12 — the authoring surface is a hook constant, **not** a manifest section | — | **PR 1 owns the key removal.** PR 2 deliberately adds no manifest key: `architect-route.ts` and `verify-manifest-coverage.ts` both `Object.entries()` the manifest, so an `"authoring"` section would be read as a route pattern by both. |
| `AGENTS.md` § Behavioral norms table | task 5 — delete row 8 (hand-authored) | — | — | **PR 1 owns.** The generated block below the table regenerates; the table does not. |
| `.prism/plans/thrive-port.md` | tasks 1, 8 — conflict resolution, then the `> Superseded:` marker | — | — | **PR 1 owns.** |

**Order is forced by rows 1, 2, 5, and 7.** PR 1 → PR 2 → PR 3, as a GitHub stack: PR 2 bases on PR 1's branch, PR 3 bases on PR 2's. Each merges in order after the one below it.

---

## Implementation Tasks

Tasks are grouped by PR, then by persona heading per ADR-0018. Tasks are numbered continuously across PRs so cross-references are unambiguous. Unless a task states otherwise, verification is `pnpm prism:build` (regenerates mirrors, runs `prism:test`) followed by `pnpm prism:check` (adds type-check, manifest verify, crossref lint, spec-scope lint, pack parity), both from the repo root, both expected green.

### PR 1 — Rules retune

#### Clove (implementation)

**1. Bring `#449` current and clear the stale stash.**
   - `git fetch origin && git checkout huntermcgrew/thrive-port-opus5-rule-amendments && git merge origin/main`. Merge, not rebase — the branch is pushed and reviewed (`git-conventions.md § Keeping a Branch Current`); the squash-already-upstream trap does not apply because #449 has not merged.
   - Resolve `.prism/lessons.md` by taking **both sides** — it is append-only and the two additions are independent.
   - Resolve `.prism/plans/thrive-port.md` by taking `origin/main`'s copy wholesale (`git checkout --theirs` during the merge, then verify).
   - Before dropping the stash, confirm it is redundant: `git show origin/main:.prism/plans/thrive-port.md | grep -c "2026-08-01 .*Inventoried"` must print `1`. Then `git stash drop stash@{0}`. If it prints `0`, stop and report — the stash is not redundant and this Decision is wrong.
   - Retitle the PR to `chore: Retune the always-on rule layer for Opus-5`.
   - **Verify:** `git status -s` clean; `pnpm prism:build && pnpm prism:check` green.

**2. Add the delegation tiebreaker to `.prism/rules/subagent-strategy.md`.** #449 already removed *"when you're unsure whether to spend the compute, spend it."* This adds thrive #2259's inverse, which is missing. Append to `**How to apply:**`, after the existing "Don't spawn subagents to verify" bullet:

   > - When unsure whether work is delegation-shaped, do it yourself. An inline read that turns out to have been delegable costs one extra read; a dispatch that turns out not to have been costs a round trip and a report-back that may never arrive.

   **Why this text:** the motivating incident happened in this repo — an architect dispatch on this exact material fanned out to two research subagents, stalled twice, and returned malformed twice with no plan file written. Sequence: after task 1. **Verify:** build + check; `grep -c "do it yourself" .prism/rules/subagent-strategy.md` returns `1`.

**3. Condition-gate `.prism/rules/demand-elegance.md`.** Evidence § 1 names this rule by example as license phrasing — its `## Purpose` opens *"For non-trivial changes, pause and ask 'is there a more elegant way?'"*, which reads as a standing licence to reshape. Replace the `## Purpose` paragraph and the first two `**How to apply:**` bullets so the **firing condition leads**:

   > ## Purpose
   >
   > When a change has a design with tradeoffs — more than one shape would work, and the shapes differ in what they cost later — stop before presenting it and ask whether a cleaner solution exists. A mechanical edit does not get this pause.
   >
   > **Why:** the first working version of a change with real design choices is rarely the clean one, and once it is in the tree the hacky shape becomes the pattern the next change copies. Stating the firing condition first is what keeps the rule from reading as a standing licence to reshape unrelated code — thrive PR #2273 measured that framing costing 2 out-of-scope files per run on this model class, against 0 with no project config loaded.
   >
   > **How to apply:**
   >
   > - The test for whether this rule fires: does the change have a design with tradeoffs, or is it a mechanical edit? Designs get the pause; mechanical edits do not.
   > - When the rule fires and the fix feels hacky, step back and ask what the clean solution is knowing everything you now know. When it does not fire, ship the obvious version.

   Keep the third bullet unchanged. **Do not** widen the rule's reach while rewriting it — the reframe is the whole change. **Verify:** build + check; the rendered `.claude/rules/demand-elegance.md` mirror matches byte-for-byte.

**4. Audit all 22 `load: always` rules for license phrasing.** The set is every `.prism/rules/*.md` whose frontmatter declares `load: always` — enumerate it, do not work from this plan's list: `for f in .prism/rules/*.md; do sed -n '1,6p' "$f" | grep -q '^load: always' && echo "$f"; done`. Baseline measured 2026-08-13: **22 files, 1,639 lines**. For each, apply one test:

   - **License phrasing** — the rule states an action the model may take, with the condition implied or trailing ("Refactor code you're already modifying…", "For any non-trivial task, enter plan mode first"). Rewrite so the **firing condition is the first clause**.
   - **Condition phrasing** — the rule already leads with when it fires. Leave it alone and record it as swept.

   Report per file as `swept` / `n/a — <reason>`, in the PR body, with a named unit (the rule file). Do not report a summary count without the per-file list — a bounded sweep that reports only a total hides which files were never reached. **Known candidates from a first read** (not the full audit — confirm each against the file): `code-standards.md § Refactor scope`, `plan-before-building.md`, `autonomous-bug-fixing.md`, `core-principles.md`, `self-improvement-loop.md`. **Explicitly out of scope:** `writing-voice.md`, `response-shape.md`, and `branch-plan.md` § Before Closing — all three were rewritten within the last three weeks (#455, #446) and re-touching them here mixes two review conversations. Sequence: after task 3, so `demand-elegance.md` is the worked example the sweep follows. **Verify:** build + check; the PR body carries the per-file table.

**5. Retire `.prism/rules/context-window-handoff-check.md`.** The Decision is already ratified in `thrive-port.md § Decisions` (2232) — a rule whose signals the model cannot measure mid-session produces either theater or silence, and the always-on context cost buys nothing this model class does not do natively. This is the removal; the sweep is the task. Exact sites, verified 2026-08-13 by `grep -rln "context-window-handoff-check\|Context Window Handoff Check" --include="*.md" --include="*.json" --include="*.ts" .`:

   - **Delete:** `.prism/rules/context-window-handoff-check.md`.
   - **Flip to deprecated:** `.prism/spec/adrs/_toolkit/0006-context-window-handoff-check.md` — set `Status: deprecated`, add a one-line superseding note pointing at this plan, and **preserve the three signals in the body** (thrive's ADR-0006 treatment). Do not delete the file.
   - **Manifest route keys:** remove the `".prism/rules/context-window-handoff-check.md"` key from both `.prism/architect/manifest.json` and `.prism/architect/_toolkit/manifest.base.json`.
   - **Hand-authored, not generated:** `AGENTS.md` § Behavioral norms — delete table row 8 and renumber the rows below it. The generated rule-body block further down the file regenerates via `agents-md-block.ts`; do not hand-edit it.
   - **Canonical prose:** `.prism/architect/_toolkit/skills-ecosystem.md`, `.prism/references/architect/plan-mode.md`.
   - **Curated seed twins — hand-edit, they do not regenerate:** `templates/install/.prism/architect/_toolkit/skills-ecosystem.md` and `templates/install/.prism/references/architect/plan-mode.md`. Both are in `seed-curation.json`'s `curated` list, and `checkSeedDrift` only asserts they *exist*.
   - **Seed curation:** `.ai-skills/definitions/seed-curation.json` — the ADR is already in `excluded`; leave that entry (the ADR survives as deprecated). Add `rules/context-window-handoff-check.md` to `excluded` **only if** the seed-write pass would otherwise fail on a missing canonical source; run the build and let it tell you.
   - **11 skill bodies** (`.ai-skills/skills/<id>/shared.md`): `prism-architect`, `prism-changelog`, `prism-code-dev`, `prism-code-review-pr`, `prism-code-review-self`, `prism-debugger`, `prism-design`, `prism-documentation`, `prism-qa-test-plan`, `prism-ticket-start`, `prism-user-stories`. Each carries one sentence of the shape *"Before recommending the next persona, assess context load per AGENTS.md § Context Window Handoff Check."* — delete the sentence, keep the surrounding next-persona guidance.
   - **The remedy survives:** add to `.ai-skills/skills/prism-handoff/shared.md` — the active persona may suggest `/prism-handoff` on session length or self-observed drift, never on a counted proxy, and never auto-invoked.
   - **Everything under `.claude/`, `.codex/`, `.cursor/`, and non-curated `templates/install/`** regenerates. Do not hand-edit any of it.
   - **Verify:** `grep -rn "context-window-handoff-check\|Context Window Handoff Check" --include="*.md" --include="*.json" --include="*.ts" . | grep -v node_modules | grep -vE "^(\./)?\.prism/(plans|audits)/" | grep -vE "^(\./)?(\.claude|\.codex|\.cursor|\.prism)/spec/adrs/_toolkit/0006-" | grep -v "seed-curation.json"` returns nothing (widened from the task-5-era pattern per Eric PR #449 pass 3: the original only excluded the canonical ADR path, so its three generated platform mirrors and the `seed-curation.json` `excluded`-list entry always matched; re-verified against the live tree with the leading-`./` question settled by testing rather than assuming — this repo's `grep -r . ` does not prefix paths with `./`, so both anchored forms are covered). Plans and audits are historical record and are correctly excluded; the deprecated ADR is expected to name itself. Then build + check.

**6. Amend `session-orientation.md` and `response-shape.md` so PR 3 can delete the lifecycle markers.**
   - `.prism/rules/session-orientation.md` — delete the `## Lifecycle List` section entirely (currently at line 45). Its content — "every skill carries a short 'The run, in order' list near the top of its body" — is the mandate PR 3's task 19 removes 22 instances of.
   - `.prism/rules/response-shape.md:65` — the sentence *"it fires only when the current run has ordered phases, the same marker `session-orientation.md` § Lifecycle List uses: a skill carries a `## The run, in order` list"* now cites two things that will not exist. Replace with: *"it fires only when the current run has ordered phases the reader is tracking across replies — a multi-step implementation, a phased review. On a one-shot answer it is noise."* Also update the same file's `## Who runs this rule` paragraph, which repeats the marker citation.
   - **Why this is PR 1's and not PR 3's:** a rule pointing at a marker no skill carries is the changed-behavior variant of a dangling reference — no shared token makes it greppable, so nothing catches it later. Landing the rule change first means PR 3's deletion is a cleanup, not a breakage.
   - **Verify:** `grep -rn "The run, in order" .prism/rules/` returns nothing; `grep -rn "Lifecycle List" .prism/rules/ .prism/references/ .ai-skills/skills/` returns nothing; build + check.

**7. Fold `thrive-port.md` task 3's calibration forward unchanged.** #449 already shipped the opening-battery scaling clause and its two mechanics cross-references, and Eric's pass-2 finding reverted the closing-battery half. No new edit — this task exists so the implementer does not re-apply it. Confirm `.prism/rules/session-orientation.md` still carries the `## Purpose` scaling clause and that line 32's closing battery is unconditional, then move on. **Verify:** read-only.

**8. Mark `thrive-port.md` superseded.** Add under the title: `> Superseded: 2026-08-13 — folded into `.prism/plans/opus5-port.md`; PRs B–H re-homed there or deferred with dispositions.` Append a matching one-line `## History` entry. Do not delete the file (ADR-0047). **Verify:** content-only, no build impact; `pnpm prism:check` for crossref lint.

#### Eli (documentation)

**9. Sweep `docs/` for the retired rule in the same PR.** `grep -rn "context-window-handoff-check\|Context Window Handoff Check" docs/` — update each hit in PR 1, not as a follow-up. **Verify:** the grep returns nothing; `pnpm prism:check` green.

---

### PR 2 — Hook runtime → zero-dependency `.mjs`, plus the authoring-route deny

Branch from PR 1's head. Reconciles and supersedes open draft [#457](https://github.com/HunterMcGrew/PRISM/pull/457).

#### Clove (implementation)

**10. Port #457's harness table into a zero-dependency `.mjs` runtime.** Create `scripts/ai-skills/hooks/harnesses.mjs`. Port from #457's `harnesses.ts` — read it with `gh pr diff 457 -- scripts/ai-skills/hooks/harnesses.ts`, do not re-derive it:
   - `HarnessSpec` with exactly five members: `toolKinds`, `sessionId`, `filePaths`, `emitNag`, `emitNone`. It carries **no name field** — the tool identity threads explicitly alongside it, matching thrive's own `hook.mjs`.
   - A `HARNESSES` table with `claude`, `cursor`, and `codex` rows. Per evidence invariant 6, harness-specific field names live **only inside this table** — `session_id` vs `conversation_id`, `hookSpecificOutput.additionalContext` vs `additional_context`, `permissionDecision` vs `permission`/`user_message`/`agent_message`.
   - `resolveToolKind`, with the four-value vocabulary: `read` (the only kind that credits), `write` (the only kind the gate can deny), `shell` (token extraction, never credits), `search` (code routes only). **An unlisted tool name resolves to `write` deliberately** — an allowlist runs one short of the next tool a vendor ships.
   - `extractPatchFilePaths` for Codex's `apply_patch` path recovery.
   - **Verify:** `node -e "import('./scripts/ai-skills/hooks/harnesses.mjs').then(m=>console.log(Object.keys(m.HARNESSES)))"` prints the three rows.

**11. Convert the resolver and adapter to `.mjs` and give the matcher one owner.**
   - Rename `scripts/ai-skills/hooks/architect-route.ts` → `architect-route.mjs`, stripping types. Preserve every behavior verbatim: `MAX_EMISSION_BYTES = 8000`, `formatNag`'s `(+N more matched)` truncation and its never-emit-zero-docs exception, `toRepoRelativePath`, `findRepoRoot`'s upward walk, `filterDocsOnDisk`, `loadRouteState`'s treat-unrecognized-as-absent, `saveRouteState`'s tmp+rename atomic write, `pruneStaleRouteState`'s 24h sweep of both `.json` and orphaned `.json.tmp`, and the `PRISM_HOOK_DISABLE=1` kill switch.
   - **Preserve credit-on-read from #456 exactly** — `resolveArchitectNag` step 1 credits a doc only when `filePath` is itself a doc under `.prism/architect/`, never on emission, and `extractArchitectDocPath` returns `null` for `manifest.json`. A partial read (offset/limit) credits nothing. Regressing this is the single most likely defect in this task.
   - Move `compileMatcher` into `scripts/ai-skills/hooks/lib/match.mjs` as its only implementation. Add `"moduleResolution": "bundler"` to `scripts/ai-skills/tsconfig.json`'s `compilerOptions`, add `scripts/ai-skills/hooks/lib/match.d.mts` declaring the export, and change `scripts/ai-skills/verify-manifest-coverage.ts` to `import { compileMatcher } from "./hooks/lib/match.mjs"`, deleting its own copy. **If `pnpm prism:check-types` fails,** take the fallback recorded in `## Decisions` (duplicate + parity test) rather than improvising.
   - Delete `claude-post-read.ts`; its `runAdapter` becomes `hook.mjs`'s dispatch path.
   - **Verify:** `pnpm prism:check-types` green; `grep -hoE 'from "[^"]+"' scripts/ai-skills/hooks/*.mjs scripts/ai-skills/hooks/lib/*.mjs | grep -v 'node:' | grep -v '"\./'` returns nothing (every import is either a `node:` builtin or relative to the hook tree).

**12. Write `scripts/ai-skills/hooks/hook.mjs` — the single entry point, dispatching on `--tool=`.** Three event arms behind one file, per evidence invariant 4 (every safety check lives in the script, never in a registration matcher — a matcher-less harness silently inherits nothing).
   - **`PostToolUse` arm — the nag.** Unchanged behavior from today's `claude-post-read.ts`: resolve the nag, emit the harness's nag envelope, write nothing when the resolver returns `null`.
   - **`PreToolUse` arm — the authoring deny.** Fires only when `resolveToolKind` returns `write` **and** the target path matches an authoring prefix. Deny message, verbatim:

     > You're editing `<path>`, an instruction-layer file — read these in full first, then retry: `<docs>`.

     Constraints, each of which is load-bearing: **only `write` may be denied** (denying reads or searches makes the remedy unperformable); **no session id means never deny**; **a deny never writes dedup state**; **`code` routes are nag-only on every verb** and reach this arm only to be allowed.
   - **The authoring surface is a module constant, not a manifest section.** `AUTHORING_PREFIXES` in `hook.mjs`: `.prism/plans/`, `.prism/architect/`, `.prism/rules/`, `.prism/spec/adrs/`, `.prism/references/`, `.prism/skills/`, `.ai-skills/skills/`, `.claude/output-styles/`, `.claude/hooks/`. **Why a constant:** both `architect-route.mjs` and `verify-manifest-coverage.ts` call `Object.entries()` over `manifest.json`, so an `"authoring"` key would be read as a route pattern by both — thrive's manifest has no such consumer. The prerequisite doc set still comes from the existing manifest routing; only the is-this-authoring judgment is structural.
   - **Escape hatch:** `PRISM_HOOK_DENY_DISABLE=1` disables the deny arm while leaving the nag arm live, so the deny can be switched off without unregistering the hook.
   - **Fail open everywhere. No `process.exit()`** — it truncates pending stdout writes; set `process.exitCode` and return, as `claude-post-read.ts` already does and documents.
   - **Foreign-payload guard:** drop a Cursor event name arriving on the `claude` row (Cursor executes `.claude/settings.json` hooks alongside its own when third-party configs are enabled). Port from #457.
   - **Verify:** task 16's three-leg suite.

**13. Add the shell-write reroute.** In `hook.mjs`'s `PreToolUse` arm, when `resolveToolKind` returns `shell`, parse the command for `>`, `>>`, `tee`, `tee -a`, and `sed -i` targeting an authoring path. Emit, verbatim:

   > You're writing to `<path>`, an instruction-layer file, via a shell write — redo this edit with your file-edit tool so the authoring gate can check its prerequisites.

   **The remedy judges no prerequisites at all**, which is what makes it impossible to render unsatisfiable — evidence invariant 7 (deny only what you can parse; where you can't, reroute to a surface that can). Record the deliberately-open parsing gaps in a comment on the parser: word-prefixed redirects (`echo hello>f`), `python -c`, `cp`/`mv`/`dd`. Also add one sentence to `.prism/rules/context-reuse.md § Architect-context routing is diff-blind` noting that the prose fallback now has a mechanical enforcer on authoring paths and remains the only thing that runs on hosts with no hook. **Verify:** task 16's suite covers each of the five shell forms.

**14. Add the `PreCompact` dedup reset.** New `scripts/ai-skills/hooks/compact-checkpoint.mjs`. It **deletes the architect-context dedup state file** so docs re-nag after compaction — compaction can drop the conversation history that made a doc "read", and leaving the state intact silences that doc permanently. It writes no summary; the write-a-summary behavior stays a rule (`.prism/rules/pre-compaction-checkpoint.md`), unchanged. With no `session_id` in the payload, fall back to an age sweep of `architect-route-state.*.json` files older than 12h. **Verify:** a `.test.ts` case seeds a state file, invokes the hook with and without a session id, and asserts the correct file is gone in each case.

**15. Register the hooks and make them reach consumers.** This task is the delivery blocker; the four sub-items are not independent.
   - `.claude/settings.json` — replace the `tsx`/`node_modules` invocation with three registrations, all invoking `node`: `PostToolUse` matched `Read|Write|Edit|Bash`, `PreToolUse` matched `Write|Edit|Bash`, and `PreCompact`. Command form: `node "$CLAUDE_PROJECT_DIR/scripts/ai-skills/hooks/hook.mjs" --tool=claude` for this repo.
   - `templates/install/.claude/settings.json` — currently `{}`. Ship the same three registrations pointed at the consumer's own copy: `node "$CLAUDE_PROJECT_DIR/.claude/hooks/hook.mjs" --tool=claude`. This is the file whose emptiness is why consumers receive zero hooks today.
   - `scripts/ai-skills/update.ts` — in `runUpdate`, copy `scripts/ai-skills/hooks/**` from the package root into the consumer's `.claude/hooks/`, `chmod 755` the entry points. Both `prism:adopt` (via `runUpdate`) and `prism:update` inherit it from the one seam. **Merge into the consumer's `settings.json`, never overwrite it** — ADR-0071's Negative bullet names this hazard explicitly.
   - `package.json#files` — add `scripts/ai-skills/hooks/`. `scripts/ai-skills/verify-pack-parity.ts` — add `{ path: "scripts/ai-skills/hooks", reader: "update.ts runUpdate — hook runtime copied into the consumer's .claude/hooks/", kind: "prefix" }` to `RUNTIME_READ_PATHS`. Omitting this second half is exactly how `.ai-skills/config.schema.json` shipped git-tracked but unpacked in 0.7.1.
   - **Verify:** `grep -c tsx .claude/settings.json templates/install/.claude/settings.json` returns `0` for both; `pnpm prism:verify-pack` green; `npm pack --dry-run --json | grep -c "scripts/ai-skills/hooks/hook.mjs"` returns `1`.

**16. Write the three-leg gate suite and wire it into CI.** `scripts/ai-skills/hook-gate.test.ts` — a `.test.ts` so `run-tests.ts` (which discovers `*.test.ts` under `scripts/ai-skills/`, recursively) picks it up. Thrive's 1,286-line bash suite is **not** wired into CI; PRISM's must be, and that is a real improvement to state in the PR body.

   Per evidence invariant 5, a gate's tests need three legs, and all three are required — thrive shipped an unsatisfiable gate that passed 70/70 tests because it had only the first two:
   1. **The deny fires.** A `Write` to an authoring path with unread prerequisite docs returns the harness's deny envelope with the prerequisite doc paths named.
   2. **Seeded state clears it.** With the matched docs pre-written into `architect-route-state.<session>.json`'s `read` array, the same call is allowed.
   3. **A live remedy performed through the gate clears it.** Starting from leg 1's denied state, invoke the **real `PostToolUse` arm** with a `Read` of each named doc's own path — the remedy the deny message instructs — then re-invoke the `PreToolUse` arm on the original path and assert it is allowed. This leg must exercise the shipped code path end to end, not seed state directly; seeding is leg 2's job, and a suite that only seeds cannot detect a remedy that does not work.

   Also cover: a `read`-kind tool is never denied; no session id never denies; a deny writes no dedup state; each of task 13's five shell forms reroutes; `code`-route paths are never denied on any verb; `PRISM_HOOK_DISABLE=1` and `PRISM_HOOK_DENY_DISABLE=1` each produce their intended inertness. Add at least two cases running against the repo's **live** `.prism/architect/manifest.json`, so a manifest edit that breaks routing fails here. Carry forward #457's `verify-manifest-coverage.ts` brace-glob rejection (`{ts,tsx}` keys are rejected at validation time because `compileMatcher` escapes braces as literals and such a route would silently match nothing) and its `verify-manifest-coverage.test.ts` case. **Verify:** `pnpm prism:test` green with the new cases counted; deliberately break the deny and confirm leg 3 fails (a positive control — a check that cannot fail is not a check).

**17. Write the ADR and correct the conductor's contradicting line. Neither is optional; PR 2 is incoherent without both.**
   - **New `.prism/spec/adrs/_toolkit/0072-authoring-route-write-gate.md`** (0071 is the current maximum; confirm with `ls .prism/spec/adrs/_toolkit/ | grep -oE '^[0-9]{4}' | sort -n | tail -1` before writing). `Status: accepted`, `Date: 2026-08-13`. Its `## Context` must do the work the Decision above sketches, in full: ADR-0067's floor was reverted because its gate sat on the report-back channel and a blocked persona fought its own gate; ADR-0069 permanently rejects hooks **on that channel specifically**; `epic-floor-revert.md § Decisions` left "a lightweight `ownership-guard`-only safety … a separate, smaller opt-in" open in the same breath as "No hooks survive"; ADR-0071 chose nag over deny for *code* routes and that choice stands. The `## Decision` states the scope in one sentence: only `authoring` routes may deny, only the `write` kind, only when a session id is present, and the remedy is reading a document. `## Consequences` must carry the honest negative — this gate can be wrong (a doc read through a route the hook never observed still reads as unread), and its compensating control is that the remedy is cheap and `PRISM_HOOK_DENY_DISABLE=1` exists. Reference ADR-0067, ADR-0069, ADR-0071, and `epic-floor-revert.md`.
   - **Edit `.ai-skills/skills/prism-conductor/shared.md:106`** — `### Enforcement is guidance + pipeline stages, never runtime hooks`. The line currently reads *"No `Stop`/`SubagentStop` gates on report-backs, no `PreToolUse` ownership guards on writes."* Replace the second clause with the carve-out: *"No `Stop`/`SubagentStop` gates on report-backs. `PreToolUse` guards are confined to the authoring surface — instruction-layer writes, cleared by reading the governing doc (ADR-0072); ownership guards on code writes stay out."* Adjust the section heading if "never runtime hooks" no longer reads true. **This is the file PR 3's task 24 also edits** — PR 2 owns this section, PR 3 owns § Talking to the operator, and neither crosses.
   - **Verify:** `pnpm prism:check` (crossref lint resolves the new ADR's references); `grep -n "no \`PreToolUse\` ownership guards on writes" -r .ai-skills/ .prism/` returns nothing.

**18. Close #457 as superseded, not merged.** Comment on the PR naming this plan and PR 2's branch, and confirming what was carried forward: the `HarnessSpec`/`HARNESSES`/`resolveToolKind`/`extractPatchFilePaths` design (task 10), the foreign-payload guard (task 12), the ADR-0071 link sweep, and the brace-glob rejection with its test (task 16). Delete `.cursor/hooks.json` from PR 2's tree if PR 2 does not register Cursor — an unregistered config file is worse than none. **Verify:** `gh pr view 457 --json state` reports `CLOSED`.

#### Eli (documentation)

**19. Document the hook surface in the same PR.** Update `.prism/architect/_toolkit/install-layout.md` — the hook runtime is a new consumer-delivered surface and the doc's install narrative does not mention hooks at all today. Sweep `docs/` for the old `tsx`-invoked registration. **Verify:** `grep -rn "claude-post-read" docs/ .prism/architect/` returns nothing; `pnpm prism:check` green.

---

### PR 3 — Shared core and roster slimming

Branch from PR 2's head. **Freeze the output style before measuring anything** — evidence Rule 4 measured an output-style change moving chat output +113%, more than twice what the entire slim-vs-fat redesign moved. Any before/after word count taken across a style change is meaningless.

**The word-count target is an expectation, never a gate.** If the keep-list and the number conflict, the keep-list wins and the conflict gets reported. Never cut protected content to hit a number.

**Do not re-port these deletions** (evidence § 7 — tried and refused, or deleted and restored, and all four of the restored set were caught by a *reviewer*, not by the slimming pass): the Opening Orientation Battery; Briar's diff-only reading; a persona's closing ceremony; a persona's dispatched-runs section; the evidence-format gradeability bar; any typed contract something downstream parses; run-control state files; pinned review ranges; escape conditions (*"these aren't verification; they're routing"*); and the `description` frontmatter, which is never slimmed — *"slimming a body is fine; slimming a description costs invocations."*

Three questions before any deletion: **Does anything else *say* this, written, where the reader arrives** — not "could the model infer it"? **Does the evidence measure the right surface?** **Is the proposed repair "repoint the citers"** — because that means N copies of a single-owner procedure, and you should restore instead.

#### Clove (implementation)

**20. Create `.prism/references/skill-core.md` — the shared core.** One file, not two (evidence § 5: splitting a ~1,500-word core to save ~116 words per invocation costs a maintenance surface the source repo had already been burned by). Sections, each a **pointer plus the fact it establishes**, never a restatement:
   - `## Orientation` — the opening battery, citing `session-orientation.md`, with the no-user-available calibration stated once.
   - `## The plan is the working memory` — plan lookup, citing `.prism/references/plan-lookup.md` and `branch-plan.md`.
   - `## Reading before writing` — architect-context routing and the diff-blind clause, citing `context-reuse.md`; note that authoring paths are now gated (ADR-0072, PR 2).
   - `## Reporting back` — the report-back schema when dispatched by Sol, quoting `lib/report-back.md § Canonical dispatch schema` as a fragment, never restating it. **Typed contracts are quoted, never paraphrased** — something downstream parses this.
   - `## Closing` — the closing battery and session close, citing `session-orientation.md` and `.prism/references/session-close.md`.
   - `## Context budget` — kept deliberately; it is on the reversal list.

   **Single-owner content stays with its owner** — retro procedure to Iris, audit procedure to Zoe, design procedure to Pixel, conductor paths to Sol. Nothing that belongs to one persona goes in the core.

   Add `.prism/references/skill-core.md` to `.ai-skills/definitions/seed-curation.json` as **non-curated** (it should mirror verbatim). **Verify:** build + check; the file appears at `templates/install/.prism/references/skill-core.md` and in all three platform mirrors.

**21. Add the Step-0 core pointer to all 31 skill bodies.** In each `.ai-skills/skills/<id>/shared.md`, immediately before the greeting/intro section, one line: *"Step 0, before greeting: read `.prism/references/skill-core.md`."* Use the same relative-link form the file already uses for `.prism/` citations (`[…](../../../.prism/references/skill-core.md)`), so the link resolves in the consumer's platform tree. **Never a literal profile path.** A persona overriding a core section writes a one-line stub under that section's heading name — the sanctioned place to *modify* a core section is a `Persona notes on the shared core:` sub-list, not a restatement. **Verify:** `grep -l "skill-core.md" .ai-skills/skills/*/shared.md | wc -l` returns `31`; `pnpm prism:check` (crossref lint) green.

**22. Delete the 22 `## The run, in order` headings.** All 22 live in `.ai-skills/skills/*/shared.md` (four further files mention the phrase in prose — those go too). PR 1 task 6 removed the two always-on rules that mandated them, so this is a clean deletion with no dangling mandate. **Sequence: strictly after PR 1 merges.** **Verify:** `grep -rn "The run, in order" .ai-skills/skills/` returns nothing; `grep -rn "The run, in order" .prism/rules/ .prism/references/` returns nothing (PR 1 already cleared these — if either returns a hit, PR 1 regressed and this task stops).

**23. Collapse the 30 `## Closing Re-Orientation Battery` sections to a single line each.** Measured baseline: 30 files carry the `##` heading; 31 mention the phrase. **The mechanism is not deleted — the restatement is.** `session-orientation.md` remains the single owner of both batteries and its `## Sessions` `open:`/`close:` persistence contract is untouched. Per `thrive-port.md` task 4's already-approved one-pointer shape: each body keeps **one** pointer at open (task 21's Step 0 covers it via the core) and **one** line at close, folded into the deliverable sentence task 24 writes. Delete the `##` heading and its prose. **Verify:** `grep -c "^## Closing Re-Orientation Battery" .ai-skills/skills/*/shared.md | grep -v ":0"` returns nothing, **and** `grep -l "session-orientation.md" .ai-skills/skills/*/shared.md | wc -l` still returns `31` — the pointer survives, only the section goes. Both halves are required; the first alone would pass if the mechanism were deleted outright.

**24. Dedup the 28 Definition-of-Done blocks.** Apply the deletion test from `## Decisions`: does this item tell the model something its defaults or an already-cited always-on rule do not?
   - **Delete:** items restating a battery (measured: 10 occurrences of "Battery answered" across 4 files), "types pass"/"lint passes"/"no stray console.logs"/"full diff read", and anything restating a `load: always` rule.
   - **Keep:** skill-specific policy — "No implementation code written" (Winston), "AC synced to the ticket tracker", Clove's real build/test criteria (`epic-floor-revert.md`'s Class A variant preserved these deliberately and they are still genuine DoD, not gate residue).
   - **Keep the one line naming the deliverable** under each surviving heading. Where every item fails the test, the heading goes with them and one deliverable sentence replaces the section.
   - This is judgment-bounded — **read** each Class A body (Clove, Sage, Atlas), do not sweep them. **Verify:** `grep -o "Battery answered" .ai-skills/skills/*/shared.md | wc -l` returns `0`; the PR body carries a per-skill `swept` / `n/a — <reason>` table with the skill as the named unit; build + check.

**25. Replace prescribed read sequences with exit-condition questions.** Evidence Rule 1 `[measured]` — the highest-leverage change: external research calls 0 → 17, chat words 1,856 → 917, dependency coverage 8-prose-mentions/18-tasks → 14/14 explicit. The mechanism, verbatim: *"A prescribed read batch doesn't suppress the rule — it suppresses the rule's trigger condition. The model never forms an external-system claim, because the reads never surface a question the repo can't answer."*

   **The trap, stated so it cannot be missed: "four questions" is not the mechanism.** The Opening Orientation Battery is already four questions and produces zero research, because its questions are about the *request*. The rewrite works only if **at least one question is about constraints originating outside the repo**. A rewrite without one has changed the shape and kept the problem.

   Scope: the skills carrying a fixed startup read batch — `prism-architect` (the Batch 1 / Batch 2 block), `prism-code-dev`, `prism-code-review-self`, `prism-code-review-pr`, `prism-debugger`. For each, replace the enumerated read list with exit conditions naming **the fact each read must establish**, plus one outside-facing question of this shape:

   > What does this change depend on that this repo does not define — a vendor API, a host runtime, a platform behavior, an upstream contract — and what is the current fact about it?

   Closing move, kept verbatim as the calibration: *"An unanswerable question is a task, not an assumption."* **Keep** calibration reads that already say what they are for — *"a read instruction paired with the fact it establishes is rule 1 done right."* **Verify:** each rewritten skill's exit-condition block contains an outside-facing question — human evidence, named per skill in the PR body; build + check.

**26. Add `.ai-skills/skills/tdd/`.** Persona-less reference, ~67 lines. Three anti-patterns, each **with its tell** — the tell is what makes it usable: *implementation-coupled* (a refactor breaks the test though behavior did not change), *tautological* (the assertion recomputes the expected value the same way the code does), *horizontal slicing* (all tests written, then all implementation). State explicitly that refactoring is not part of the red-green loop. Register in `.ai-skills/definitions/roles.json` with `"type": "utility"` and **no** `persona` field — `generate-skills.ts:435` throws if a utility carries a persona, and `:603`/`:622` skip agent emission for utilities, which is correct here. Add its row to `.prism/rules/skill-routing.md § Utility skills`, not to the persona routing table.

   **This skill is a persona-less reference: no greeting, no Step-0 core pointer, no orientation batteries, no Definition of Done.** It is read for its content, not invoked as a session. Task 21's core pointer and task 23's battery line do not apply to it — that scoping is what keeps AC-8 and AC-17 at `31` rather than `33`. **Verify:** `pnpm prism:build` emits `.claude/skills/tdd/SKILL.md` and **no** `.claude/agents/tdd.md`; `grep -c "skill-core.md" .ai-skills/skills/tdd/shared.md` returns `0`; `pnpm prism:check` green.

**27. Add `.ai-skills/skills/devils-advocate/`.** Extracted from Winston's inline `### Devil's Advocate` section; the standalone is better than the inline one. Four passes, a typed verdict, and an applicability test: *"does this artifact commit to a decision before the evidence exists?"* **Deliberately no name and no personality** — *"a named character with quirks is an invitation to perform skepticism."* Registration and scoping identical to task 26 — `type: "utility"`, no persona, a § Utility skills row, and no core pointer, batteries, or DoD. **Leave Winston's inline section in place** and add a one-line pointer to the skill — deleting it is a separate call, and evidence § 7's reversal list is full of sections deleted by a slimming pass and restored by a reviewer. **Verify:** same as task 26; `grep -c "Devil's Advocate" .ai-skills/skills/prism-architect/shared.md` still returns a non-zero count.

**28. Fold the two remaining `thrive-port.md` skill-body tasks in.**
   - **Anti-meta-loop + `Meta` severity** (`thrive-port.md` task 5) — `.ai-skills/skills/prism-review-loop/shared.md`: a meta finding (a PR body describing the change wrong, a readiness line reporting a closed finding as open, plan hygiene) is real and gets fixed, but never drives another review pass; only subject-surface findings count toward the zero-findings exit. Cite thrive's measured incident — five of nine passes spent on meta churn — in the `**Why:**`.
   - **Sol's operator-communication contract** (`thrive-port.md` task 6) — `.ai-skills/skills/prism-conductor/shared.md`, new `## Talking to the operator`: interim updates are one line; plain words, no coined run-vocabulary; every handle redeemed at first mention; evidence cells one clause. Cite `response-shape.md` rather than restating it. **Do not touch § Enforcement is guidance + pipeline stages** — PR 2 task 17 owns that section.
   - **Verify:** build + check.

#### Eli (documentation)

**29. Document the shared core and the two new skills.** Update `.prism/architect/_toolkit/skills-ecosystem.md` — the roster gains two utility skills and every persona gains a Step-0 core read. **This file has a `curated` seed twin** (`templates/install/.prism/architect/_toolkit/skills-ecosystem.md`) that does not regenerate and has drifted 65 lines behind canonical before; hand-edit both. **Verify:** `pnpm prism:check` green; diff the two files and confirm the delta is only the intentional consumer simplification.

---

## Deferred — not in this stack

Re-homed from `thrive-port.md` so it can close. Each carries its disposition; none is lost.

| thrive-port task | Disposition |
| --- | --- |
| 7 — remove Sol's autonomy dial | **Deferred.** The dial is live and this very run is dispatched under `hobby`. Removing it is a conductor-semantics change with no relationship to the Opus-5 retune; stacking it here makes PR 3 unreviewable. Its own PR. |
| 8 — add Iris to Sol's tiering table | **Deferred**, rides task 7's PR (same table, same file). |
| 9, 10 — declaration line, dispatch shape, Eric's draft hold | **Deferred**, one PR with tasks 7–8. All four edit Sol's dispatch surface. |
| 11 — new `dev-servers.md` rule | **Deferred.** Adding a 23rd `load: always` rule in the same stack that audits the other 22 for context cost is self-defeating. Revisit after PR 1's audit reports actual line counts. |
| 12 — problem-first PR descriptions | **Deferred**, independent and small. |
| 13 — Lilac ZWSP scoping | **Deferred**, independent and small. |
| 14, 15 — CLAUDE.md orientation + Atlas step | **Deferred**, independent. |
| 16 — worktree `node_modules` | **Already landed** — `3d50e8a9` on main (#451). No action. |
| 17 — retire the handoff check | **Folded in** as PR 1 task 5. |
| 1, 2, 3 — the three rule amendments (`verification-before-done.md`, `subagent-strategy.md`, `session-orientation.md`) | **Folded in** as PR 1 tasks 1–2 and 7 (already shipped on #449). |
| 4 — one-pointer battery shape + DoD dedup | **Folded in** as PR 3 tasks 21, 23, 24. |
| 5, 6 — anti-meta-loop, Sol operator contract | **Folded in** as PR 3 task 28. |

Also deferred from the evidence sweep, with reasons: prompt-time persona routing (#2275) — see the OPEN Decision; the three-question evidence gate (#2268); the nine-angle review battery and Briar's file-slice fan-out (`_shared/review-angles.md`); `_shared/verification.md`'s "checks that cannot fail" (its single most transferable rule — *"a control is written against the failure, not against the fix"* — is applied in PR 2 task 16's positive control, but the rule set itself is not ported); build-time partials (#2277); the plugin-marketplace distribution (#2321/#2322).

---

## Acceptance Criteria

Every evidence command below was reasoned against this plan's own task list before being written, per `.prism/lessons.md § AC evidence commands are code — dry-run them at authoring time`. Baselines were measured on `main` at 2026-08-13 and are stated where a criterion asserts a change from one.

### Behavioral

- [ ] **AC-1.** Given a session edits a file under an authoring prefix whose governing architect doc is unread, When the `PreToolUse` hook fires on `Write` or `Edit`, Then the write is denied with a message naming the prerequisite doc paths.
  - *Evidence (machine):* `scripts/ai-skills/hook-gate.test.ts` leg 1 passes; `pnpm prism:test` green.
- [ ] **AC-2.** Given AC-1's denied state, When the session performs the remedy the deny message names — reading each prerequisite doc through the live `PostToolUse` arm — and retries the same write, Then the write is allowed.
  - *Evidence (machine):* `hook-gate.test.ts` leg 3 passes **and** fails when the deny logic is deliberately broken (the positive control). Leg 3 must not seed state directly; seeding is leg 2.
- [ ] **AC-3.** Given a session edits a **code** path (any path outside `AUTHORING_PREFIXES`), When the `PreToolUse` hook fires on any verb, Then the write is allowed and at most a nag is emitted.
  - *Evidence (machine):* `hook-gate.test.ts` code-route cases pass for `Write`, `Edit`, and `Bash`.
- [ ] **AC-4.** Given a hook payload with no session id, When the `PreToolUse` arm evaluates an authoring-path write, Then it never denies.
  - *Evidence (machine):* `hook-gate.test.ts` no-session case passes.
- [ ] **AC-5.** Given a doc is named in a nag but never read, When the session reads another path matching the same route, Then the doc is named again — credit lands on an observed read of the doc's own path, never on emission.
  - *Evidence (machine):* the existing `architect-route.test.ts` credit-on-read cases (from #456) pass unchanged against the `.mjs` runtime. Regression here is the highest-likelihood defect in task 11.
- [ ] **AC-6.** Given a consumer repo that has run `prism adopt` or `prism update`, When a Claude Code session reads a routed path, Then the hook fires without any `node_modules` or `tsx` present.
  - *Evidence (human):* a scratch consumer repo with `node_modules` removed after adopt; confirm `.claude/hooks/hook.mjs` exists mode `755` and a `Read` produces a nag. **This criterion is unverifiable from this repo alone** and stays unchecked until someone runs it — say so rather than ticking it.
- [ ] **AC-7.** Given a compaction event, When `PreCompact` fires, Then the architect-context dedup state for that session is deleted so docs re-nag, and no summary file is written.
  - *Evidence (machine):* `hook-gate.test.ts` PreCompact cases (with and without a session id) pass.
- [ ] **AC-8.** Given a persona session starts, When it reaches Step 0, Then it reads `.prism/references/skill-core.md` before greeting.
  - *Evidence (machine):* `grep -l "skill-core.md" .ai-skills/skills/*/shared.md | wc -l` returns `31`. **Note the arithmetic:** tasks 26–27 add two more skill directories, but `tdd` and `devils-advocate` are persona-less references that never greet and never run a battery — they get no Step-0 core pointer, so the count stays at the 31 that exist today rather than rising to 33. A criterion asserting `33` would be falsified by this plan's own task 26/27 scoping.
- [ ] **AC-9.** Given a skill session with no ordered phases, When it replies, Then no state line is emitted and no rule requires a lifecycle list.
  - *Evidence (machine):* `grep -rn "The run, in order" .ai-skills/skills/ .prism/rules/ .prism/references/` returns nothing after PR 3; `grep -rn "Lifecycle List" .prism/rules/` returns nothing after PR 1.

### Non-behavioral

- [ ] **AC-10.** The hook runtime is zero-dependency.
  - *Evidence (machine):* `grep -hoE 'from "[^"]+"' scripts/ai-skills/hooks/*.mjs scripts/ai-skills/hooks/lib/*.mjs | grep -v 'node:' | grep -v '"\./' | wc -l` returns `0`; `grep -c tsx .claude/settings.json templates/install/.claude/settings.json` returns `0` for both files.
- [ ] **AC-11.** `templates/install/.claude/settings.json` is no longer `{}` and registers the three events.
  - *Evidence (machine):* `python3 -c "import json;d=json.load(open('templates/install/.claude/settings.json'));print(sorted(d['hooks']))"` prints exactly `['PostToolUse', 'PreCompact', 'PreToolUse']`.
- [ ] **AC-12.** The hook runtime ships in the published tarball and the pack-parity gate knows about it.
  - *Evidence (machine):* `pnpm prism:verify-pack` green; `npm pack --dry-run --json | grep -c "scripts/ai-skills/hooks/hook.mjs"` returns `1`.
- [ ] **AC-13.** `compileMatcher` has exactly one implementation.
  - *Evidence (machine):* `grep -rn "function compileMatcher" scripts/ | wc -l` returns `1`. **If the tsconfig fallback in `## Decisions` was taken,** this returns `2` and the criterion is instead satisfied by `manifest-matcher-parity.test.ts` passing — record which path was taken in `## History` rather than leaving the criterion ambiguous.
- [ ] **AC-14.** The retired handoff-check rule leaves no live references.
  - *Evidence (machine):* `grep -rn "context-window-handoff-check\|Context Window Handoff Check" --include="*.md" --include="*.json" --include="*.ts" . | grep -v node_modules | grep -vE "^(\./)?\.prism/(plans|audits)/" | grep -vE "^(\./)?(\.claude|\.codex|\.cursor|\.prism)/spec/adrs/_toolkit/0006-" | grep -v "seed-curation.json"` returns nothing (widened from the task-5-era pattern per Eric PR #449 pass 3: the original only excluded the canonical ADR path, so its three generated platform mirrors and the `seed-curation.json` `excluded`-list entry always matched; re-verified against the live tree with the leading-`./` question settled by testing rather than assuming — this repo's `grep -r . ` does not prefix paths with `./`, so both anchored forms are covered). Plans, audits, and the deprecated ADR are excluded deliberately — they are historical record, and ADR-0006 is expected to name itself.
- [ ] **AC-15.** The always-on rule layer shrinks by exactly one rule and reports its new size.
  - *Evidence (machine):* `n=0; t=0; for f in .prism/rules/*.md; do sed -n '1,6p' "$f" | grep -q '^load: always' && { n=$((n+1)); t=$((t+$(wc -l < "$f"))); }; done; echo "$n $t"` prints `21` and a line total below `1639`. Baseline: `22 1639`.
- [ ] **AC-16.** No Definition-of-Done item restates an orientation battery.
  - *Evidence (machine):* `grep -o "Battery answered" .ai-skills/skills/*/shared.md | wc -l` returns `0`. Baseline: `10`. Uses `grep -o | wc -l`, not `grep -c` — `grep -c` counts matching *lines* and four files carry more than one occurrence (`.prism/lessons.md § grep -c counts matching lines`).
- [ ] **AC-17.** The closing battery's mechanism survives its restatement's deletion.
  - *Evidence (machine):* `grep -c "^## Closing Re-Orientation Battery" .ai-skills/skills/*/shared.md | grep -v ":0" | wc -l` returns `0` (baseline `30`), **and** `grep -l "session-orientation.md" .ai-skills/skills/*/shared.md | wc -l` returns `31` (baseline `31` — unchanged, because only the restatement is deleted and the two new reference skills carry no battery). Both halves required — the first alone passes if the mechanism were deleted outright, which is not what this plan does.
- [ ] **AC-18.** The two new skills register as utilities and emit no agent definitions.
  - *Evidence (machine):* `ls .claude/skills/tdd/SKILL.md .claude/skills/devils-advocate/SKILL.md` succeeds; `ls .claude/agents/tdd.md .claude/agents/devils-advocate.md` fails for both; `ls .claude/agents/*.md | wc -l` returns `28` — the pre-PR-3 baseline, unchanged, because a `type: "utility"` role emits no agent definition (`generate-skills.ts:603,622`).
- [ ] **AC-19.** The tree does not contradict itself about `PreToolUse` guards.
  - *Evidence (machine):* `grep -rn "no \`PreToolUse\` ownership guards on writes" .ai-skills/ .prism/ | grep -v "^\./\.prism/plans/"` returns nothing; `ls .prism/spec/adrs/_toolkit/0072-*.md` succeeds; `pnpm prism:crossref-lint` green.
- [ ] **AC-20.** Every PR in the stack builds and checks clean.
  - *Evidence (machine):* `pnpm prism:build && pnpm prism:check` green on each of the three branches. Pre-existing Windows path failures, if the run is on Windows, are the known 4 and only the known 4.
- [ ] **AC-21.** No mirror is hand-edited.
  - *Evidence (machine):* `pnpm prism:check` reports zero drift. The two `curated` seed twins (`skills-ecosystem.md`, `references/architect/plan-mode.md`) are hand-edited by design and are exempt — `checkSeedDrift` never compares their content, so their correctness is human evidence, verified by diffing each against its canonical partner.

### AC Adjustments

### AC Sync Log

| Date | Agent | Action | Plan | Ticket |
| ---- | ----- | ------ | ---- | ------ |
| 2026-08-13 | Winston | AC created in plan; no tracker ticket exists for this port | ✓ | N/A |

---

## Sessions

- 2026-08-13 [main] open: Intent — one plan covering three stacked PRs (rules retune, zero-dep hook runtime + authoring deny, roster slimming onto a shared core), with cross-PR file collisions named and owned; Bounds — write only `.prism/plans/opus5-port.md`, no rules/skills/hooks/mirrors, no subagents; Approach — verify every claim against the live tree before writing it, fold `thrive-port.md`'s unbuilt tasks in or defer them with a stated disposition · close: scope held — one file written; five plan-affecting facts corrected against the tree rather than taken from the evidence doc (see `## History`).
- 2026-08-13 [huntermcgrew/thrive-port-opus5-rule-amendments] open: Intent — implement PR 1 (tasks 1-9) exactly as the plan specifies, landing on #449's existing branch; Bounds — PR-1-owned files only per the collision table, stage explicitly (never `-A`/`.`), leave `.prism/plans/conductor/` and `.prism/research/` untracked, leave the stash in place; Approach — work tasks sequentially, `pnpm prism:build && pnpm prism:check` after each, commit per task · close: scope held — the removal-completeness sweep (task 5) surfaced two sites the plan's own grep missed (a second `AGENTS.md` §-numbered heading list at line ~1786, and `templates/install/AGENTS.md.tmpl`, whose extension isn't in the plan's grep's `--include` list) plus one build-tooling gap (orphaned `templates/install` seed mirrors aren't cleaned up on canonical deletion, flagged as follow-up — see Signals in the report-back); one literal-instruction deviation recorded as a Decision (AGENTS.md § Behavioral norms: left the numbering gap instead of renumbering, since the table's own header sentence and an existing §7/§9 gap both establish number-stability as the actual invariant).
- 2026-08-13 [huntermcgrew/thrive-port-opus5-rule-amendments] open: Intent — self-review PR #449 (PR 1 of the opus5-port stack) for correctness before merge, including three items Sol flagged during ratification (spec-scope-lint's silent skip, retirement-sweep completeness, stale lifecycle-marker prose); Bounds — chat-only findings, plan-only commit permitted for `## Review Issues`/`## PR Readiness`, no GitHub posts, no draft-flip, no merge; Approach — read the full 1,282-line canonical diff, run build/type-check/test/crossref-lint gates, dispatch three background sweeps for Sol's three items, independently verify the plan's Decisions against the live tree · close: scope held — 2 minor findings in PR 1's own content (`demand-elegance.md`'s condition-gate rewrite leaves two near-duplicate bullets; task 1's confirmed-redundant stash was never dropped, contradicting the plan's own Decision with no recorded reason), plus 1 confirmed tooling gap outside PR 1's diff (`spec-scope-lint` silently skips this entire 3-PR stack — two independent causes identified in `resolve-live-plan.ts`, reported as a found-bug signal rather than a PR 1 blocker since PR 1's own content was independently verified clean); retirement-completeness and lifecycle-marker-prose sweeps both came back fully clean.
- 2026-08-13 [huntermcgrew/thrive-port-opus5-rule-amendments] open: Intent — fix Briar's three self-review findings (demand-elegance.md near-duplicate bullet, the undropped stash deviation, the plan Ticket field blocking spec-scope-lint) in one focused pass; Bounds — the three named findings only, no draft-flip, no merge, no touching resolve-live-plan.ts; Approach — verify the stash-drop precondition before recording the reversal, verify the Ticket reword against the live resolver rather than assuming the regex match · close: scope held — all three findings fixed; the Ticket-field fix independently verified two ways (direct spec-scope-lint run, and a synthetic-branch-name call into findUnfiledPlanCandidatesBySlug). *Retroactively added — this session's own Sessions line was missed at the time; see the lessons.md entry on unverified review remedies for the pattern this gap is adjacent to.*
- 2026-08-13 [huntermcgrew/thrive-port-opus5-rule-amendments] open: Intent — fix Eric's PR #449 pass-3 review (4 Major, 11 Minor) in one focused pass, the headline being AGENTS.md stating two predicates for the retired demand-elegance rule; Bounds — the named findings only, resolve-live-plan.ts and spec-scope-lint.ts off-limits, Spec Minor 5 explicitly out of scope (same underlying lint bug); Approach — sweep for the retired predicate itself rather than trusting the filename-scoped grep, verify every suggested fix against the live tree before writing it in rather than adopting text wholesale · close: scope held — swept beyond the named site and found the same stale predicate in templates/install/AGENTS.md.tmpl (a site outside the plan's own --include list); caught that Eric's suggested ^\./ grep anchor does not match in this repo's grep (tested, not assumed) and used a verified-working pattern instead. *Retroactively added along with the History entry below — 9c6d6d0e recorded the prior session's History entry but not its own or either session's Sessions line; see this session's lessons.md entry.*
- 2026-08-13 [huntermcgrew/thrive-port-opus5-rule-amendments] open: Intent — final fix pass before Sol merges: restore a live carve-out Eric's own pass-2 comment prescribed deleting (a Major regression reintroducing a `load: always` rule / live-persona-workflow conflict), fix four named Minors, close the plan's own Sessions/History bookkeeping gaps, and land a lessons.md entry on unverified review remedies; Bounds — the named findings only, `resolve-live-plan.ts` and `spec-scope-lint.ts` off-limits, no draft-flip, Sol holds the merge gate; Approach — verify Eric's three factual claims (bare bullet, Parker's live Trigger dispatch, empty discriminator grep) independently before applying his suggested text, per the very lesson this session records · close: scope held — carve-out restored on the correct bullet (verified via the same grep Eric used, now non-empty); session-orientation's lost inline Why restored; demand-elegance's Purpose-restating bullet dropped; opus5-port's PR Readiness rewritten against a freshly re-run AC-15 verification (21 rules, 1,601 lines) rather than the stale recorded figure; two retroactive Sessions lines and one retroactive History entry backfilled for the prior two sessions; PR body synced; lessons.md entry appended verbatim as given.
- 2026-08-18 [huntermcgrew/opus5-port-hook-runtime] open: Intent — implement PR 2A (hook runtime → zero-dependency `.mjs`, registered and delivered, announce-once, no deny), tasks A1–A8 as described in the dispatch prompt; Bounds — A1–A8 files only, no deny gate, no credit-channel widening, no writing guides; Approach — port #457's harness table, convert the resolver, wire consumer delivery, verify with `pnpm prism:check` · close: **drifted — the A1–A8 task list this session was dispatched against is not present in this worktree's own committed `.prism/plans/opus5-port.md`** (see the new `## Decisions` OPEN entry above for the full discovery trail). The dispatch prompt's task content came from a Read that, by mistake, resolved outside this isolated worktree; the sandbox now refuses re-verifying it. All A1–A8 scope was nonetheless implemented and independently verified against this worktree (`pnpm prism:check` green, 696 tests) because the design is coherent and plausible Winston output, not because it was confirmed against a committed plan. Reported `needs-replan` rather than claiming `done` against task IDs that don't resolve in the branch's own plan file.

---

## History

- 2026-08-13 [main]: Plan created by Winston under a Sol fleet dispatch, after a first attempt was interrupted by a process exit with nothing on disk. Three PRs, 29 tasks, superseding `thrive-port.md`; cross-PR collisions tabled with a per-file owner, and the PR 1 → 2 → 3 order shown to be forced rather than stylistic. Five facts were corrected against the live tree during authoring — see the next entry.
- 2026-08-13 [main]: Corrections made against the tree rather than inherited from the evidence doc. (1) `#449` conflicts only in `.prism/lessons.md` and `.prism/plans/thrive-port.md`, not in any rule body, so it is landed rather than superseded. (2) `stash@{0}`'s single line is already on `main`, closing the prior session's open question about what else it carried. (3) The always-on layer is 22 rules, not 20 — same 1,639 lines. (4) `## The run, in order` is 22 headings across 26 mentioning files, and `## Closing Re-Orientation Battery` is 30 headings across 31 mentioning files; the AC evidence commands are written against those measured numbers. (5) `thrive-port.md` task 16 (worktree `node_modules`) already landed as `3d50e8a9` (#451) and is dropped from the deferred set.
- 2026-08-13 [huntermcgrew/thrive-port-opus5-rule-amendments]: Implemented PR 1 tasks 1-9 across nine commits. Merged `origin/main` and retitled PR #449; added the subagent delegation tiebreaker; condition-gated `demand-elegance.md` and `code-standards.md § Refactor scope`; audited all 22 `load: always` rules for license phrasing (per-file table in the PR body); retired `context-window-handoff-check.md` end to end (rule, ADR, manifest keys, `AGENTS.md` table row and a second hand-authored heading list the plan's own grep missed, 11 skill bodies, two curated seed twins, and `templates/install/AGENTS.md.tmpl`); cleared the lifecycle-list markers from `session-orientation.md` and `response-shape.md` (plus a lowercase mention task 6's grep missed); marked `thrive-port.md` superseded. `pnpm prism:build && pnpm prism:check` green after every task. See `## Decisions` for the two deviations recorded during the sweep and a flagged build-tooling gap in the report-back signals.
- 2026-08-13 [huntermcgrew/thrive-port-opus5-rule-amendments]: Briar self-reviewed PR #449. Build, type-check, tests (662/662), and crossref-lint all green; two background sweeps independently confirmed the handoff-check retirement complete and the lifecycle-marker prose clean. Found: `demand-elegance.md`'s new first bullet duplicates its unchanged third bullet; task 1's confirmed-redundant `stash@{0}` was never dropped; `spec-scope-lint` silently skips this whole 3-PR stack (two root causes in `resolve-live-plan.ts`, unrelated to this PR's diff). See `## Review Issues` and `## PR Readiness`.
- 2026-08-13 [huntermcgrew/thrive-port-opus5-rule-amendments]: Fixed Briar's three findings in `4bf12dc8` — deduped the `demand-elegance.md` bullet, recorded the stash reversal as a `## Decisions` entry, reworded `## Ticket` to lead with "Unfiled" (fixes `spec-scope-lint` cause (2), verified against the live resolver; cause (1), `containsTokenRun`, stays open and out of scope per the operator). `## Review Issues` entries 1 and 2 flipped to `fixed`; entry 3 narrowed to the one remaining cause.
- 2026-08-13 [huntermcgrew/thrive-port-opus5-rule-amendments]: Fixed Eric's PR #449 pass-3 review in `9c6d6d0e` — 4 Major, 10 of 11 Minor (Spec Minor 5 out of scope, same lint bug as `## Review Issues` entry 3). Headline: `AGENTS.md`'s Behavioral norms table and `templates/install/AGENTS.md.tmpl` both still stated demand-elegance's retired "non-trivial changes" predicate; found via a predicate sweep, not a filename grep. Also merged `subagent-strategy.md`'s duplicate bullets, resolved `session-orientation.md`'s scaling-clause ambiguity, and fixed ten prose/bookkeeping minors across `demand-elegance.md`, `verification-before-done.md`, `response-shape.md`, `0006-context-window-handoff-check.md`, `skills-ecosystem.md`, `prism-handoff/shared.md`, and this plan. This commit's own `## Sessions` line and this History entry were both missing until the next session added them retroactively — see `.prism/lessons.md`.
- 2026-08-13 [huntermcgrew/thrive-port-opus5-rule-amendments]: Final fix pass before merge. Restored `subagent-strategy.md`'s self-verification carve-out that a prior pass-2 review comment had wrongly prescribed deleting — the deletion left the rule contradicting Parker's own live rubric-dispatch workflow (`prism-prd/step-06-review.md`), a Major confirmed independently (bare bullet, Parker's Trigger-level dispatch, empty discriminator grep) before fixing. Fixed four Minors: `session-orientation.md`'s scaling clause regained its own inline `**Why:**`; `demand-elegance.md`'s Purpose-restating bullet dropped; `## PR Readiness` rewritten against a freshly re-verified AC-15 (21 rules, 1,601 lines); two retroactive `## Sessions` lines and one retroactive `## History` entry backfilled for the two prior review-fix sessions. PR body synced to reflect all three review-fix rounds. Appended a `.prism/lessons.md` entry on treating a reviewer's prescribed remedy as an unverified hypothesis.
- 2026-08-18 [huntermcgrew/opus5-port-hook-runtime]: Built the full PR 2A hook-runtime scope (harnesses table, `.mjs` resolver conversion, matcher's single owner, announce-once dedup, consumer-delivery seam in `update.ts`, computable catch-all/brace-glob rejection, `hook-gate.test.ts` with a cold-start `npm pack` leg) against a task list (A1–A8) that turned out not to be committed to this branch's own `opus5-port.md`. See the new `## Decisions` OPEN entry for the discovery trail. `pnpm prism:check` green (696 tests, 0 fail).

---

## Review Issues

### `demand-elegance.md`'s condition-gate rewrite leaves two near-duplicate bullets

- **Severity:** minor
- **Status:** fixed
- **Fixed in:** `4bf12dc8` — deleted the redundant third bullet; `.prism/rules/demand-elegance.md` now carries the firing-condition test once.
- **File:** `.prism/rules/demand-elegance.md:15,17` (byte-identical in `.claude/`, `.codex/`, `.cursor/`, and `templates/install/` mirrors)
- **Problem:** Task 3's new first bullet — "The test for whether this rule fires: does the change have a design with tradeoffs, or is it a mechanical edit? Designs get the pause; mechanical edits do not." — and the third bullet, kept unchanged per the task's own instruction — "The test for which side you're on: does the change have a design with tradeoffs, or is it a mechanical edit? Designs get the pause; mechanical edits don't." — now ask the identical question in near-identical wording. This is exactly the always-on-layer bloat AC-15 measures this PR as trimming.
- **Suggested fix:** delete the third bullet (the new first bullet already states the test) or merge the two.

### Task 1's stash drop was never executed, and the deviation isn't recorded

- **Severity:** minor
- **Status:** fixed
- **Fixed in:** `4bf12dc8` — added a `## Decisions` entry ("The `git stash drop stash@{0}` this plan calls for was deliberately not executed…") recording the reversal as Sol's explicit dispatch instruction, not the implementer's judgment, with the redundancy precondition's two independent verifications (Clove's task-1 run, Briar's self-review re-run) both cited. `→ no promotion needed` verdict recorded.
- **File:** N/A — local git state (`stash@{0}` on this checkout), not part of the pushed branch or diff
- **Problem:** the plan's Decision and task 1 both say to run `git stash drop stash@{0}` once `git show origin/main:.prism/plans/thrive-port.md | grep -c "2026-08-01 .*Inventoried"` returns `1`. Re-run during this review, it returns `1` — the documented precondition for dropping holds. The stash is still present (`git stash list` shows `stash@{0}` with the exact description the plan names). The implementation session's own `## Sessions` opening-battery line states a Bound of "leave the stash in place," contradicting the Decision, with no `## Decisions` entry explaining the reversal — unlike the properly-documented AGENTS.md renumbering deviation from the same session.
- **Suggested fix:** run `git stash drop stash@{0}` now, or add a `## Decisions` entry recording why it was deliberately kept.

### `pnpm prism:spec-scope-lint` silently skips this entire PR stack

- **Severity:** major (tooling gap outside PR 1's diff — does not block PR 1; its own content was independently verified clean via `crossref-lint`, build, tests, and two full-tree sweeps)
- **Status:** open — cause (2) fixed, cause (1) remains and is out of scope for PR 1
- **File:** `scripts/ai-skills/lib/resolve-live-plan.ts` (not touched by this PR — the operator has ruled that build tooling does not ride this rules PR; a second, independent bug in `discriminatorFor` (builds `prism-changelog/` with a trailing slash against the plan's slash-free `prism-changelog`, ~10-25 false positives once cause (1) is relaxed) makes the eventual fix two-part, not one)
- **Problem:** `resolveLivePlan` never resolves `.prism/plans/opus5-port.md` as the live plan for branch `huntermcgrew/thrive-port-opus5-rule-amendments`, so `spec-scope-lint` — the mechanical gate `.claude/rules/followup-scope.md § Spec content never rides an unrelated ticket` names — silently no-ops (`pnpm prism:check` prints "no live plan resolved for this branch — skipping" and continues green) instead of running on a PR that edits 8 always-on rule files. Two independent causes were confirmed by executing the resolver's own logic against this branch and plan. **Cause (2) is now fixed:** the plan's `## Ticket` field was reworded in `4bf12dc8` to open with "Unfiled — no tracker ticket…", which matches `UNFILED_TICKET_RE`; independently verified by calling `findUnfiledPlanCandidatesBySlug` with a synthetic branch name containing `opus5-port` in matching order, which correctly resolved this plan. **Cause (1) remains open and is this PR's local frame's edge:** `containsTokenRun` requires the branch's tokens to contain the plan-filename's tokens as a contiguous, in-order run; branch `thrive-port-opus5-rule-amendments` tokenizes to `[thrive,port,opus5,rule,amendments]`, which does not contain `[opus5,port]` in that order (the branch predates the plan's rename from `thrive-port.md`) — so `pnpm prism:spec-scope-lint` still prints "no live plan resolved for this branch — skipping" on this exact branch. PR 2 and PR 3's branch names (`opus5-port-hooks-mjs`, `opus5-port-roster-slim`) satisfy cause (1) as written, so they get real coverage once this fix lands.
- **Suggested fix:** relax `containsTokenRun` in `resolve-live-plan.ts` to unordered set-containment (needed specifically for PR 1's pre-rename branch name), and fix `discriminatorFor`'s trailing-slash mismatch in the same change — landing either alone regresses the other. Neither fix sits in PR 1's local frame (`.claude/rules/code-standards.md § Refactor scope`) — route as its own follow-up, ideally landed before PR 2 branches so the stack gets real spec-scope coverage.

---

## PR Readiness (PR 1 — Rules retune, #449)

- [x] No critical or major issues in PR 1's own diff — all 4 Majors from Eric's pass-3 review fixed (`9c6d6d0e`), including the one pass-2 regression Eric's own earlier comment introduced (the deleted Parker step-06 carve-out, restored this session). The one remaining open Review Issue (`spec-scope-lint`'s `containsTokenRun` cause) is a pre-existing tooling gap outside this PR's files, owned by a separate prerequisite PR
- [x] No stray console.logs or debug artifacts — N/A, no code in this PR
- [x] All debugged issues resolved — none recorded
- [x] Build passes — last run: 2026-08-13. `pnpm prism:build`, `pnpm prism:check-types`, `pnpm prism:test` (662/662), and `pnpm prism:crossref-lint` all green. `pnpm prism:spec-scope-lint` skipped (see Review Issues) — not a PR 1 regression, a pre-existing plan/branch-name resolution gap
- [x] Task 4's required per-file audit table is present in the PR body and independently spot-checked accurate (4 unaudited "known candidate" files confirmed correctly `n/a` — each already leads with its firing condition)
- [x] AC-15 re-verified directly after this session's edits: 21 `load: always` rules, 1,601 total lines (< the 1,639-line baseline; down from 1,604 at the prior checklist update)
- [x] PR description up to date — synced to reflect the two review-fix rounds and this session's findings
- [ ] Lasting decisions promoted to architect context — all `## Decisions` entries above carry "→ promotion verdict pending close," correctly deferred to plan close rather than PR 1

**Last updated:** 2026-08-13
