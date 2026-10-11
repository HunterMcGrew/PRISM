# Plan: prism-492

## Ticket

https://github.com/HunterMcGrew/PRISM/issues/492

## Goal

Promoted content lands in the architect doc that owns its subject, and umbrella docs hold only content that applies to every file their routes reach.

---

## Implementation Tasks

Shipped as a four-PR GitHub stack, each PR based on the one before it.

### Clove (implementation)

**PR 1 — placement rule and trigger** (`huntermcgrew/prism-492-architect-doc-placement`)

1. `.prism/architect/guides/writing-an-architect-doc.md`: add `## Where new content goes` between `## Open with a scope statement` and `## Route-add is part of authoring`. It carries the topic → umbrella → new-doc order, the one-concern test (no "and" or "or"), the rules exception, the consumer `_toolkit/` clause, and filename guidance. In `## Route-add`, step 1 asks for the narrowest pattern that holds the governed files.
2. `.prism/rules/branch-plan.md` § Before Closing step 1, and its curated seed twin `templates/install/.prism/rules/branch-plan.md`: replace "Add these to the relevant architect context file in `.prism/architect/`" with a pointer to the guide section, read before the `→ promoted to` verdict is written.
3. Run `pnpm prism:build`. The guide is `mirrored`, so the build copies it to the seed and the platform mirrors.
4. Verify: `pnpm prism:check` passes.

**PR 2 — remaining promotion wording**

1. `.prism/references/architect/plan-mode.md:131-134` and its seed twin: "the relevant `.prism/architect/` file" cites the placement order. A new doc is step 3 of the order, not a fallback offer.
2. `.prism/SPEC.md:77` and `templates/install/.prism/SPEC.md.tmpl:77`: same citation. `SPEC.md:47` and the `.tmpl` copy: drop the catch-all `**` claim and the "Phase 3" manifest-population claim.
3. `.prism/references/session-close.md:17`, `.prism/architect/_toolkit/audit-workflow.md:192`, and `.prism/references/triple-gated-adr-criterion.md:29` (plus seed twins): cite the placement order. Fix the wrong § Immediate Decision Promotion location at `triple-gated-adr-criterion.md:36` (it lives in `plan-mode.md`).
4. `.prism/references/architect-context.md:17` and its seed twin: replace the `**/*.test.*` example (a wildcard-led glob the manifest rejects) and drop the "Phase 3" claim. `.ai-skills/skills/prism-architect/shared.md` § Architect Context Updates: name the target doc per the placement order.
5. Verify: `pnpm prism:check` passes, and `grep -rn "relevant architect" .prism/references .prism/rules .prism/SPEC.md templates/install/.prism/references templates/install/.prism/rules` returns nothing.

**PR 3 — writers**

1. Theo: in `.prism/skills/prism-doc-walker/step-05-draft.md`, before drafting, check the manifest and existing docs for one that already owns the candidate's topic, and offer to extend it instead. Have the drafter read the writing guide at that step.
2. `.prism/skills/prism-doc-walker/step-07-commit.md:31`: replace the broad-glob advice with the guide's narrowest-pattern rule.
3. Eli: `_toolkit/documentation.md:109` (the cross-reference map "lives at the bottom of this file", which `prism update` replaces in consumer repos) and `.prism/references/documentation/after-writing.md:10,43` and its seed twin: in a consumer repo, these rows go to the team's own flat architect doc, not `_toolkit/documentation.md`. `:15`: if the paired topic doc doesn't exist, create and route it per the guide.
4. Readers of the map follow the same split: `documentation/startup.md`, `review-docs-impact.md` (plus twins), and `prism-documentation/shared.md` DoD read `.prism/architect/documentation-conventions.md` in consumer repos.
5. `scripts/ai-skills/crossref-lint.ts` `isLazyOrHistoricalTarget`: treat `.prism/architect/documentation-conventions.md` as a lazy consumer artifact, with a test in `crossref-lint.test.ts`.
6. Verify: `pnpm prism:check` passes.

**PR 4 — split PRISM's own umbrellas**

1. `_toolkit/install-layout.md`: keep install layout and ownership. Move hook runtime and write gate, the build-time checks (path guard, crossref lint, pack parity, bundle-safe entry), and substitution passes into one-concern docs, each routed by the files that control it. Repoint the manifest, `manifest.base.json`, the consumer stub, `seed-curation.json`, and every reference found by grep.
2. `_toolkit/skills-ecosystem.md`: move npm packaging invariants and Eric session-cost notes out. Narrow `output-guards.md` from `scripts/ai-skills/**` to `scripts/ai-skills/literal-guard.ts`. `skills-ecosystem.md` stays on `scripts/ai-skills/**`, because the roster-generating scripts need the roster.
3. `_toolkit/audit-workflow.md`: move worktree hygiene and the lesson-promotion taxonomy to their own routed docs.
4. Cut lines: see Decision "PR 4 cut lines". Moved sections keep their wording except where a claim fails source verification (`.prism/rules/architect-doc-verification.md`).
5. Verify: `pnpm prism:check` passes. `prism doctor` reports no orphan docs or dead routes.

---

## Decisions

- **The trigger lives in `branch-plan.md` § Before Closing, not in `CLAUDE.md` or `AGENTS.md`.**
  - **Root cause:** the `→ promoted to` verdict is written during a plan edit. `.prism/plans/**` doesn't route the writing guide, so the target is picked before the guide loads.
  - **Alternatives considered:** a pointer in `CLAUDE.md` and `AGENTS.md`, which is what thrive #2673 shipped. Routing the guide on `.prism/plans/**`.
  - **Chosen approach:** `branch-plan.md` is always-on and the build ships it to every host, so the pointer fires at the exact step where the target is chosen. A `CLAUDE.md` pointer only reaches Claude. A plan route would load the full guide on every plan edit, when only the close step needs it.
  - **Implementation guidance:** edit both the source and the curated seed twin by hand. The seed twin has no drift check.
- **A consumer team's doc-convention entries live in a flat `.prism/architect/documentation-conventions.md`.** Eli used to append template entries and cross-reference map rows to `_toolkit/documentation.md`, which `prism update` overwrites. Considered: the consumer overlay under `custom/`. Rejected: the overlay is emitted into each platform's `custom/` subdir and the manifest never routes it, so manifest-loading agents would never see the rows. PRISM's own repo keeps its rows in `_toolkit/documentation.md`.
- **Consumer promotions land in flat `.prism/architect/*.md`, never `_toolkit/`.** `prism update` overwrites the files PRISM ships under `_toolkit/**` (`scripts/ai-skills/ownership.ts`), so a team's edit to one survives only as a `.bak` copy, and PRISM may ship a file at any path there later.

- **`prism update` owns `.prism/architect/guides/**`.** `PRISM_OWNED_GLOBS` had no entry for the writing guides, so `classifyPath` returned `unknown` and an existing consumer never received a guide update. Fixed in PR 1 because PR 1's close-step pointer cites a guide section those consumers would otherwise lack. Considered: a separate PR ahead of the stack. Rejected: PR 1 is the change that depends on it. A consumer who edited a guide gets the usual owned-file treatment, a `.bak` copy and then PRISM's version. Guides were never in a consumer's sync manifest, so the first update after this ships writes a `.bak` for every guide that differs from the incoming copy, edited or not.
- **Theo's architect-doc draft follows `writing-an-architect-doc.md`, not the four-beat arc.** The draft opens with a scope statement and carries only what passes the Deletion Test. The four-beat arc in `architecture-doc-shape.md` governs only the paired dev doc in the doc root, because that file's own scope line limits it to architecture docs in `docs/`.

- **PR 4 cut lines.**
  - **Root cause:** `install-layout.md` grew to cover hooks, cross-reference checks, the adopt/update flow, token substitution, and npm packaging, so every hook or build edit loaded all of it. `skills-ecosystem.md` and `audit-workflow.md` each carried sections for a different reader.
  - **Alternatives considered:** one doc per H2 (too fine; several H2s share a reader); leaving the adopt/update flow in `install-layout.md` (it answers "how content gets there", a different trigger from "what lives where").
  - **Chosen approach:** `install-layout.md` keeps the layout, ownership, overlay, seed surface, drift detection, and curated-twin boundary. New `_toolkit/` docs: `hook-runtime.md` (Hook runtime, Write gate, Git gates, hook ownership), `consumer-sync-flow.md` (content-source seam, first-contact adoption, steady-state distribution), `cross-reference-checks.md` (cross-reference convention, path guard, crossref lint), `token-substitution.md` (two substitution passes, optional-token defaults), `npm-packaging.md` (skills-ecosystem's npm distribution, packaging-parity gate, bundle-safe entry detection), `eric-review-modes.md` (skills-ecosystem's session-cost economics), `worktree-hygiene.md` and `lesson-promotion.md` (from `audit-workflow.md`).
  - **Implementation guidance:** a shipped section's new doc gets a curated twin split from the existing twin and a stub route. `token-substitution.md` and `npm-packaging.md` are `excluded`, matching their sections' absence from the current twin. `worktree-hygiene.md` and `lesson-promotion.md` auto-mirror, like `audit-workflow.md`.

- **PR 4 edits two always-on spec files outside the docs it splits.** `.prism/rules/context-reuse.md` (plus its seed twin) linked `install-layout.md` § Write gate and said the hooks reach Claude Code only. `.ai-skills/skills/prism-surface-audit/shared.md` linked `audit-workflow.md` § Worktree hygiene. Both sections moved, so the links had to follow them. The Claude-only claims were corrected against Codex hook delivery (#487) in the same pass, because the moved hook text was under source verification. Both are reference repoints within this ticket's split, not new spec content.

- **PR 4 also corrects two sentences the review loop surfaced.** `.prism/references/skill-core.md` (plus its twin) said the hook runtime reaches Claude Code only, which went stale with Codex delivery (#487). `install-layout.md`'s ownership lead said PRISM-owned content lives only under `_toolkit/`, which went stale when PR 1 made `architect/guides/**` PRISM-owned. Both are same-thread corrections to claims this stack already touches.

---

## Sessions

- 2026-10-11 [huntermcgrew/prism-492-architect-doc-placement] open: Intent — port thrive's umbrella-placement fix to PRISM and split PRISM's own umbrellas; Bounds — architect-doc placement guidance, promotion paths, Theo/Eli writers, the three named umbrella docs; Approach — four-PR stack, rule first · close: scope held

---

## History

- 2026-10-11 [huntermcgrew/prism-492-architect-doc-placement]: Plan created from the architect-doc write-path audit; stack approved with all four PRs.
- 2026-10-11 [huntermcgrew/prism-492-promotion-wording]: PR 2 points every promotion instruction at the placement order and removes stale manifest claims; `documentation.md:109` moved to PR 3 because it is the same `_toolkit/` write-target problem as Eli's appends.
- 2026-10-11 [huntermcgrew/prism-492-doc-writers]: PR 3 gives Theo an owning-doc check before drafting and narrow-route guidance, and moves consumer doc-convention writes out of `_toolkit/`; see Decision: doc-conventions doc.
- 2026-10-11 [huntermcgrew/prism-492-split-umbrellas]: PR 4 splits `install-layout.md`, `skills-ecosystem.md`, and `audit-workflow.md` into one-concern docs with their own routes and twins; see Decision: PR 4 cut lines.

---

## Review Issues

### Existing consumers never receive the guide section that the new close-step pointer cites

- **Severity:** `major`
- **Status:** `fixed`
- **File:** `templates/install/.prism/rules/branch-plan.md:188`
- **Problem:** `scripts/ai-skills/ownership.ts` classifies `architect/guides/**` as `unknown` (checked with `classifyPath`), and `prism update` only writes `prism`-owned paths, while `rules/**` is owned and gets the new pointer, so an existing install is told to read § Where new content goes in a guide copy that lacks it.
- **Suggested fix:** record a `## Decisions` entry and either add `architect/guides/**` to `PRISM_OWNED_GLOBS` (shared utility, so stop and confirm first) or ship the ownership fix as its own PR in this stack before PR 1 merges; `install-layout.md:78` already claims the guides are mirrored so a stale consumer copy can't hand out outdated instructions.

### "In a sister repo" cites an incident no reader can check

- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `.prism/architect/guides/writing-an-architect-doc.md:67`
- **Problem:** the guide ships to consumers, and "a sister repo" names nothing they can open, so the example's claim is unverifiable.
- **Suggested fix:** state the example as a plain scenario ("a rule about event dates once went into an umbrella routed only by backend paths") without the repo reference.

### Close-step sentence runs past two clauses and uses "umbrella" unglossed

- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `.prism/rules/branch-plan.md:204` (seed twin `templates/install/.prism/rules/branch-plan.md:188`)
- **Problem:** the added sentence chains a colon, a "so", and an "and" (writing-voice allows two clauses), and the always-on rule uses "umbrella doc" without defining it.
- **Suggested fix:** split after the guide pointer ("Read ... before writing the `→ promoted to` verdict. The plan edit does not route that guide, so the target is otherwise chosen before the placement order is in context.") and drop the trailing umbrella clause or gloss it. Edit both twins by hand.

### Decision says consumer `_toolkit/` content is "lost" on update

- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `.prism/plans/prism-492.md:58`
- **Problem:** `prism update` overwrites a diverged owned file only after saving it as `<file>.bak` (`scripts/ai-skills/update.ts` header), so the content is displaced, not lost. The guide's own wording ("replaces it") is accurate.
- **Suggested fix:** reword the Decision to "overwritten on the next update (a diverged file is kept as `.bak`)".

### British spelling in the guide

- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `.prism/architect/guides/writing-an-architect-doc.md:63`
- **Problem:** "licence" where the rest of `.prism/rules/` writes "license".
- **Suggested fix:** use "license".

### PRISM-owned path lists in consumer docs omit `architect/guides/**`

- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `docs/adopting-into-existing-repos.md:100`
- **Problem:** the list of PRISM-owned globs (and the "PRISM only manages the `_toolkit/` subdirectory" sentence at `:103`) and the owned-paths table in `docs/what-prism-writes.md:27-35` contradict the Decision "`prism update` owns `.prism/architect/guides/**`", so a consumer reading them is told guide edits are safe. `documentation.md` § Cross-Reference Map already pairs `ownership.ts` with the first of these.
- **Suggested fix:** add `architect/guides/**` to both lists and reword the `:103` sentence to cover the guides. Eli's lane; fold into PR 1 per the Decision's own reasoning.

### Guide says `prism update` "replaces" `_toolkit/`, but only files PRISM ships there are touched

- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `.prism/architect/guides/writing-an-architect-doc.md:84`
- **Problem:** `applyFilePass` in `scripts/ai-skills/update.ts` writes the files in PRISM's source and removes files recorded in the consumer manifest, so a team's new file under `_toolkit/` is left alone, while an edit to a shipped file is overwritten. The directive (don't write there) holds, but the stated consequence is broader than the code.
- **Suggested fix:** reword to "`prism update` overwrites the files PRISM ships there, and PRISM may ship a file at any path under it" in the guide, and match the Decision at `prism-492.md:58`.

No issues found — 2026-10-11 [huntermcgrew/prism-492-architect-doc-placement] (pass 3; `pnpm prism:check` exits 0, all seven earlier findings verified fixed at `8cb2dd56`).

### PR 2 pass 1 (`huntermcgrew/prism-492-promotion-wording`)

#### Manifest rejection described more broadly than the validator enforces

- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `.prism/references/architect-context.md:17` (seed twin `templates/install/.prism/references/architect-context.md:17`)
- **Problem:** "the manifest rejects a pattern that opens with a wildcard" diverges from `checkRouteIsAnchored` (`scripts/ai-skills/lib/manifest-routes.ts`), which rejects only a pattern whose first path segment is made entirely of wildcards, so `*.test.ts` or `*-widget/**` pass. The check runs in `pnpm prism:check` and `prism doctor`, not at manifest load.
- **Suggested fix:** "`prism doctor` rejects a route whose first path segment is only wildcards, such as `**/*.test.*`." Edit both twins.

#### Promotion line sends Tier 2 picks to an architect-doc section

- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `.prism/SPEC.md:77` (seed twin `templates/install/.prism/SPEC.md.tmpl:77`)
- **Problem:** "the Tier 2 or Tier 3 file that owns its subject, picked per `writing-an-architect-doc.md` § Where new content goes" applies that section to Tier 2 rules, but the section covers architect docs and defers rule placement to `writing-a-rule.md`.
- **Suggested fix:** "to the Tier 3 doc that owns its subject, picked per `writing-an-architect-doc.md` § Where new content goes, or to a Tier 2 rule per the placement test in `writing-a-rule.md`." Edit both twins.

#### PR 2 verification grep cannot return nothing

- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `.prism/plans/prism-492.md:32` (also the AC-2 evidence at `:198`)
- **Problem:** `grep -rn "relevant architect" .prism templates` still matches `.prism/architect/_toolkit/skills-ecosystem.md:162` and its seed twin ("loads relevant architect docs", a load instruction, not a promotion one) and `.prism/research/opus5-port-evidence.md:88`, so Task 5 as written fails on a correct tree.
- **Suggested fix:** narrow Task 5 to `grep -rn "relevant architect" .prism/references .prism/rules .prism/SPEC.md templates/install/.prism/references templates/install/.prism/rules` and point the AC-2 evidence at the same paths.

### Angle Coverage (PR 2 pass 1)

Subject surface `git diff huntermcgrew/prism-492-architect-doc-placement 5d25d8df` at full bar; mirrors reviewed through their canonical sources. `pnpm prism:check` exits 0.

- Runtime behavior — swept — 3 items enumerated (stub becomes `manifest.json` on install via `seedConsumerContentRoot`, `findCatchAllKeys` rule, write-gate claim in `install-layout.md`), 3 verdicts: "starts from the shipped stub" and the gate claim hold; the rejection scope is narrower than stated (finding 1).
- Test efficacy — swept — no items (doc-only change; `pnpm prism:check` exits 0).
- Spec and doc consistency — swept — 9 items enumerated (SPEC Tier 3, SPEC promotion, plan-mode, session-close, audit-workflow, triple-gated, architect-context, shared.md § Architect Context Updates, the new-doc proposal vs. guide step 3), 9 verdicts: findings 1 and 2.
- Citation integrity — swept — 4 items enumerated (Winston bullet now cites `plan-mode.md` § Immediate Decision Promotion, the guide anchor in six files, `docs/` to `documentation.md` in the stub, ADR-0058 link), 4 verdicts, all resolve.
- External-system claims — swept — 2 items enumerated (`manifest.stub.json` becomes `architect/manifest.json`, `prism doctor` imports the anchor check), 2 verdicts, both confirmed at source.
- Repo writing rules — swept — verdict-only: no mandate voice or counts; finding 3 on the PR 2 verification command.
- Security — n/a — no trust boundary in the diff.
- Docs impact — swept — 1 item enumerated (remaining promotion wording across `.prism/rules`, `.ai-skills`, `.prism/references`), 1 verdict: only PR 3 writers remain.
- Accessibility — n/a — no UI in the diff.

No issues found — 2026-10-11 [huntermcgrew/prism-492-promotion-wording] (PR 2 pass 2; `pnpm prism:check` exits 0, all three pass-1 findings verified fixed at `b008cdf2`).

### Angle Coverage (PR 2 pass 2)

Subject frozen at `5d25d8df`; repair `5d25d8df..b008cdf2` at regression bar.

- Runtime behavior — swept — 1 item enumerated (new wording against `checkRouteIsAnchored`), 1 verdict: "literal first path segment" and "first segment only wildcards" match the code.
- Test efficacy — swept — no items (doc-only change).
- Spec and doc consistency — swept — 3 items enumerated (`architect-context.md` and twin, `SPEC.md` and `.tmpl`, Task 5 and AC-2 evidence), 3 verdicts, all agree.
- Citation integrity — swept — 2 items enumerated (`writing-a-rule.md` path in both SPEC copies, narrowed grep), 2 verdicts: the guide ships in the seed and the grep exits 1 with no matches.
- External-system claims — swept — 1 item enumerated (`prism doctor` rejects the anchor failure), 1 verdict: confirmed at `manifest-routes.ts`.
- Repo writing rules — swept — verdict-only: no new violations.
- Security — n/a — no trust boundary in the diff.
- Docs impact — swept — verdict-only: no further docs affected.
- Accessibility — n/a — no UI in the diff.

### Angle Coverage (pass 3)

Subject surface frozen at `2d2d81f2`, repair diff `2d2d81f2..8cb2dd56` at regression bar.

- Runtime behavior — swept — 1 item enumerated (guide `_toolkit/` claim against `applyFilePass`), 1 verdict: matches the code.
- Test efficacy — swept — no items (no code changed since pass 2).
- Spec and doc consistency — swept — 5 items enumerated (two consumer docs, guide, two Decisions), 5 verdicts, all agree with `ownership.ts` and `update.ts`.
- Citation integrity — swept — 2 items enumerated (`ownership.ts` glob list in both docs, `update.ts` first-update `.bak` behavior), 2 verdicts, both resolve.
- External-system claims — swept — 1 item enumerated (first update writes `.bak` for unrecorded differing guides), 1 verdict: confirmed in `applyIncomingFile`.
- Repo writing rules — swept — verdict-only.
- Security — n/a — no trust boundary in the diff.
- Docs impact — swept — 2 items enumerated (`docs/adopting-into-existing-repos.md`, `docs/what-prism-writes.md`), 2 verdicts, both now list the guides.
- Accessibility — n/a — no UI in the diff.

### Angle Coverage (pass 2)

Subject surface at full bar, repair diff `2d2d81f2..db108c3c` at regression bar. `pnpm prism:check` exits 0; `ownership.test.ts` 16 of 16 pass. All five pass-1 findings verified closed.

- Runtime behavior — swept — 2 items enumerated (`classifyPath` for `architect/guides/**`, `applyFilePass` on a guide), 2 verdicts, both correct.
- Test efficacy — swept — 1 item enumerated (the `architect writing guides are PRISM-owned` test), 1 verdict: fails if the glob is removed.
- Spec and doc consistency — swept — 6 items enumerated (new Decision, `install-layout.md` glob list, two consumer docs, guide, branch-plan twins), 6 verdicts: finding on the consumer docs.
- Citation integrity — swept — 3 items enumerated (`ownership.ts` glob, `update.ts` branches, `install-layout.md` list), 3 verdicts, all resolve.
- External-system claims — swept — 2 items enumerated (`prism update` file pass, `.bak` on divergence), 2 verdicts: `_toolkit/` reach is narrower than the guide says.
- Repo writing rules — swept — verdict-only: the reworded sentences meet the two-clause bar.
- Security — n/a — no trust boundary in the diff.
- Docs impact — swept — 3 items enumerated (`docs/adopting-into-existing-repos.md`, `docs/what-prism-writes.md`, `install-layout.md`), 3 verdicts: two stale.
- Accessibility — n/a — no UI in the diff.

### Angle Coverage (pass 1)

Pass 1, whole subject surface (guide, branch-plan source and seed twin, plan). Briar sweeps all nine in one pass.

- Runtime behavior — swept — 2 items enumerated (close-step pointer, Route-add narrowest-pattern step), 2 verdicts: pointer fine in-repo, finding 1 for existing consumers.
- Test efficacy — swept — no items (doc-only change; `pnpm prism:check` exits 0).
- Spec and doc consistency — swept — 9 items enumerated (AC-1 holds, AC-2 to AC-5 belong to later PRs or the whole stack, guide, branch-plan source, seed twin, plan Decisions, `install-layout.md:78`, manifest `.prism/plans/**` route), 9 verdicts: findings 1 and 4.
- Citation integrity — swept — 5 items enumerated (`writing-a-rule.md` link, § Route-add anchor, `ownership.ts` claim, manifest plan route, `install-layout.md:78`), 5 verdicts, all resolve.
- External-system claims — swept — 3 items enumerated (`prism update` replaces `_toolkit/`, `prism doctor` exists, manifest rejects catch-all), 3 verdicts, all verified at source.
- Repo writing rules — swept — verdict-only: findings 2, 3, 5.
- Security — n/a — no trust boundary in the diff.
- Docs impact — swept — 2 items enumerated (guide, branch-plan close step; no feature doc is paired), 2 verdicts.
- Accessibility — n/a — no UI in the diff.

### PR 3 pass 1 (`huntermcgrew/prism-492-doc-writers`)

#### Theo's resume at `grilling` skips the owner check that picks the target

- **Severity:** `major`
- **Status:** `fixed`
- **File:** `.prism/skills/prism-doc-walker/step-05-draft.md:19` (also `lib/state.md:72`, `lib/state-test.md:27`, `step-06-review.md:7`)
- **Problem:** step-05 says a resumed session "regenerates the draft" and "repeats" the owner check, but the resume table routes `grilling` straight to step-06, so step-05 never reruns; step-06 then renders a header naming "the target from step-05", which existed only in the lost session's memory, and a session that regenerates the draft without the check can default to a new `<topic>.md` beside the doc that owns the subject.
- **Suggested fix:** no schema change needed. Change the `grilling` row in `lib/state.md` and scenario 4 in `lib/state-test.md` to resume at step-05 actions 1 and 2 (re-pick the target, regenerate the draft), then advance to step-06; reword step-05:19 to match and drop "lands on the same target" (the pick reads scope statements, so it is a judgment, and a target the user redirected during `iterate` is not recoverable).

#### Eli's definition of done and the startup note still send template entries to `_toolkit/documentation.md`

- **Severity:** `major`
- **Status:** `fixed`
- **File:** `.ai-skills/skills/prism-documentation/shared.md:216` (also `.prism/references/documentation/startup.md:22` and its seed twin)
- **Problem:** `after-writing.md` step 2 now sends template entries to the doc-conventions doc, but the new-template DoD item still checks `documentation.md § Doc Templates § Category-specific rules` (a section that does not exist in that file) and `startup.md:22` still calls `documentation.md` the authoritative index, so a consumer following the DoD verbatim writes into a file `prism update` overwrites, which is what AC-3 and the Decision forbid.
- **Suggested fix:** in `shared.md:216` replace the `documentation.md § ...` clause with "the doc-conventions doc (per `after-writing.md`) lists it"; in `startup.md:22` (source and seed twin) say "the category list and cross-reference map in `documentation.md`, plus the team's rows in `documentation-conventions.md` when it exists".

#### Theo's `_toolkit/` exclusion covers only the new-doc branch

- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `.prism/skills/prism-doc-walker/step-05-draft.md:15-17`
- **Problem:** "In a consumer repo the target is never under `_toolkit/`" sits on the "Neither" branch only, so the "existing topic doc owns it" and "umbrella" branches can still pick a PRISM-shipped `_toolkit/` doc that `prism update` overwrites, against the Decision "Consumer promotions land in flat `.prism/architect/*.md`, never `_toolkit/`".
- **Suggested fix:** move the clause above the three branches: in a consumer repo a `_toolkit/` doc is not an owner, so the pick falls to a flat doc or a new one.

#### Owner check only finds docs routed by the candidate's own files

- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `.prism/skills/prism-doc-walker/step-05-draft.md:14`
- **Problem:** the check matches the candidate's `files` against `manifest.json` and reads only those routed docs, so a topic doc routed on other paths (a dialog doc routed on `src/dialog/**` for a candidate in `src/forms/`) is never read and the "second doc on the same subject" the step warns about still gets drafted.
- **Suggested fix:** add a second pass: list the manifest's doc names and read the scope statement of any whose name matches the candidate's `topic`.

#### Eli's after-writing note says `prism update` replaces everything under `_toolkit/`

- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `.prism/references/documentation/after-writing.md:5` (seed twin `templates/install/.prism/references/documentation/after-writing.md:5`)
- **Problem:** `applyFilePass` overwrites only files PRISM ships and leaves a team's own `_toolkit/` file alone, so "replaces everything" is the overstatement PR 1 pass 3 already corrected in the guide and the Decision.
- **Suggested fix:** "`prism update` overwrites the files PRISM ships under `_toolkit/`, and `documentation.md` is one of them". Edit both twins.

#### Cross-reference map location stated as "the bottom of this file"

- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `.prism/architect/_toolkit/documentation.md:109` (seed twin `templates/install/.prism/architect/_toolkit/documentation.md:109`)
- **Problem:** the rewritten sentence keeps "lives at the bottom of this file", but PRISM's rows are the table directly below it and `## File naming` follows, so the location claim diverges from the doc (`architect-doc-verification.md` sets a Major floor for diverged architect-doc claims; applied here as minor because the claim describes the doc's own layout and the table sits in the same section).
- **Suggested fix:** "In PRISM's own repo the rows are the table below." Edit both twins.

#### Theo's shared output and deliverable still name only `.prism/architect/<topic>.md`

- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `.ai-skills/skills/prism-doc-walker/shared.md:95` (also `:147`)
- **Problem:** the persona body that ships to consumers says Theo writes architect docs at `<topic>.md` and that the deliverable is the doc "written to" that path, which contradicts the step files now that a section in an existing doc is a first-class result.
- **Suggested fix:** "an architect doc section or new doc at the path step-05 picks" in both places.

#### Four-beat arc dropped from the architect-doc draft without a Decision

- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `.prism/skills/prism-doc-walker/step-05-draft.md:10`
- **Problem:** step-05 used to compose the architect doc against the four-beat arc and now applies it to the paired dev doc only; that matches the scope line of `architecture-doc-shape.md` (docs in the doc root) but is a behavior change the plan's `## Decisions` never records, so a later reader sees an unexplained removal.
- **Suggested fix:** add a one-bullet Decision: the arc governs doc-root architecture docs per `architecture-doc-shape.md`, and the architect doc follows the guide's scope-statement rule.

### Angle Coverage (PR 3 pass 1)

Subject `git diff huntermcgrew/prism-492-promotion-wording 63d0e0c7` at full bar; mirrors reviewed through their canonical sources. `pnpm prism:check` exits 0; `crossref-lint.test.ts` 89 of 89 pass.

- Runtime behavior — swept — 4 items enumerated (resume routing to step-06, step-06/07 header and write mode for both targets, `isLazyOrHistoricalTarget` exact-match shape, narrowest-route exit condition), 4 verdicts: finding 1; step-06/07 consistent; exemption matches the existing lazy-path entries and is exact-match only.
- Test efficacy — swept — 1 item enumerated (new `isLazyOrHistoricalTarget` test), 1 verdict: asserts the exempt path and a sibling flat doc that stays unexempt.
- Spec and doc consistency — swept — 9 items enumerated (after-writing, startup, review-docs-impact, DoD, `documentation.md`, Theo shared output, seed twins x4), 9 verdicts: findings 2, 5, 6, 7; seed twins carry the same edits.
- Citation integrity — swept — 4 items enumerated (guide anchors in step-05 and after-writing, `documentation.md § Doc Templates`, `lib/state.md` resume table), 4 verdicts: the Doc Templates section does not exist (finding 2).
- External-system claims — swept — 2 items enumerated (`prism update` reach over `_toolkit/`, lazy-path exemption vs. install gates), 2 verdicts: finding 5; install gates pass.
- Repo writing rules — swept — verdict-only: no mandate voice, counts, or session leakage in the added text.
- Security — n/a — no trust boundary in the diff.
- Docs impact — swept — 3 items enumerated (map readers: Briar, Eli startup, Eli after-writing), 3 verdicts, all read the consumer doc; the human docs pages were not scanned this pass.
- Accessibility — n/a — no UI in the diff.

No issues found — 2026-10-11 [huntermcgrew/prism-492-doc-writers] (PR 3 pass 2; `pnpm prism:check` exits 0, all eight pass-1 findings verified fixed at `8e1e8048`).

### Angle Coverage (PR 3 pass 2)

Subject frozen at loopBase `63d0e0c7`; repair `63d0e0c7..8e1e8048` at regression bar.

- Runtime behavior — swept — 2 items enumerated (`grilling` resume across `lib/state.md`, `lib/state-test.md`, step-05, and Claude's `claude.md` override; `codex.md` and `cursor.md` carry no resume routing), 2 verdicts: resume now reruns step-05 actions 1 to 4 before step-06 on every platform.
- Test efficacy — swept — no items (no code changed since pass 1).
- Spec and doc consistency — swept — 8 items enumerated (the eight pass-1 findings), 8 verdicts, all closed, seed twins match their sources.
- Citation integrity — swept — 2 items enumerated (`lib/state.md` § Resume detection from `claude.md`, `after-writing.md` reference from the DoD), 2 verdicts, both resolve.
- External-system claims — swept — 1 item enumerated (`_toolkit/` overwrite wording in `after-writing.md`), 1 verdict: matches `applyFilePass`.
- Repo writing rules — swept — verdict-only.
- Security — n/a — no trust boundary in the diff.
- Docs impact — swept — verdict-only: no further pages affected.
- Accessibility — n/a — no UI in the diff.

### PR 4 pass 1 (`huntermcgrew/prism-492-split-umbrellas`)

Subject `git diff huntermcgrew/prism-492-doc-writers 8a7b84e6`, mirrors reviewed through their canonical sources. `pnpm prism:check` exits 0. A tree-wide sweep for the moved section names found the dangling references below, all outside the diff.

#### `CONTEXT.md` still cites sections that moved out of `audit-workflow.md`

- **Severity:** `major`
- **Status:** `fixed`
- **File:** `CONTEXT.md:67` (also `:96`, `:101`, `:105`)
- **Problem:** four glossary lines point at `audit-workflow.md` § Lesson promotion taxonomy, § Lessons, or "the taxonomy in `audit-workflow.md`", and the taxonomy now lives in `lesson-promotion.md` (`audit-workflow.md` no longer has a `## Lessons` heading), so the pointers land on a doc without the section; Task 1 promised every grep hit repointed.
- **Suggested fix:** repoint all four to `.prism/architect/_toolkit/lesson-promotion.md`. At `:101` keep the `audit-workflow.md` pointer only for archive classification.

#### `anchor-substitution.md` says token substitution is covered in `install-layout.md`

- **Severity:** `major`
- **Status:** `fixed`
- **File:** `.prism/architect/_toolkit/anchor-substitution.md:5`
- **Problem:** "The sibling mechanism for identifier substitution (build-time `${...}` tokens) is covered in `.prism/architect/_toolkit/install-layout.md`" is now false; that section moved to `token-substitution.md`. A diverged claim in an architect doc is Major under `architect-doc-verification.md`.
- **Suggested fix:** point the sentence at `./token-substitution.md`.

#### `output-guards.md` sends update behavior to `install-layout.md`

- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `.prism/architect/_toolkit/output-guards.md:10`
- **Problem:** "Consumer-facing install and update behavior lives in `install-layout.md`" no longer holds for the adopt/update flow, which moved to `consumer-sync-flow.md`.
- **Suggested fix:** name both: layout and ownership in `install-layout.md`, the adopt/update flow in `consumer-sync-flow.md`.

#### ADR-0059 still cites `install-layout.md` § First-contact adoption

- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `.prism/spec/adrs/_toolkit/0059-first-contact-adopts-via-seed-and-sync.md:41`
- **Problem:** the section moved to `consumer-sync-flow.md`; ADR-0062 and ADR-0076 in the same set were repointed, this one was missed.
- **Suggested fix:** repoint to `.prism/architect/_toolkit/consumer-sync-flow.md` § First-contact adoption.

#### Two curated twins are byte-identical to their canonical docs

- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `.ai-skills/definitions/seed-curation.json:85` (and `:87`)
- **Problem:** `cross-reference-checks.md` and `eric-review-modes.md` are listed `curated` but both twins equal canonical byte for byte; `checkSeedDrift` only checks that a curated file exists, so these two lose the drift gate that auto-mirroring gives (the failure `install-layout.md` § Curated seed twins describes).
- **Suggested fix:** drop both from `curated` and run `pnpm prism:build`, so they auto-mirror like `audit-workflow.md`. Re-add one if a real consumer difference appears.

#### The `cross-reference-checks.md` twin ships maintainer-only build internals

- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `templates/install/.prism/architect/_toolkit/cross-reference-checks.md:20` (also `:31`; route at `templates/install/.prism/architect/manifest.stub.json:50`)
- **Problem:** § Build-time path guard and § Cross-reference lint name `scripts/ai-skills/path-guard.ts`, `crossref-lint.ts`, and `pnpm prism:build`/`prism:check`, which fail Test 2 (unshipped path and command) and Test 3 (build internals). The old twin carried the same text (the #444 class), but this PR adds a stub route so a consumer editing `.prism/custom/**` now loads it.
- **Suggested fix:** curate the twin down to § Cross-reference convention, the part a consumer can act on, or keep the doc canonical-only (`excluded`) and drop the stub route. The first keeps the convention reachable.

#### "A `PostToolUse` hook on `Read`" is wrong for Codex

- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `.prism/rules/context-reuse.md:28` (also `AGENTS.md:856`, `templates/install/.prism/rules/context-reuse.md:28`)
- **Problem:** the edit adds Codex to "hosts that expose the event", but Codex has no read tool and its `PostToolUse` matcher is `^(Bash|apply_patch|Edit|Write)$` (`templates/install/.codex/hooks.json`, `harnesses.mjs` codex row), so the announcement fires on shell reads, not on `Read`.
- **Suggested fix:** "A `PostToolUse` hook backs this up on Claude Code (on `Read`) and Codex (on shell reads, since Codex has no read tool)", in all three copies.

#### ADR-0071 repoints a pointer but keeps "neither exists today"

- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `.prism/spec/adrs/_toolkit/0071-architect-context-read-hook.md:37`
- **Problem:** the edited sentence says a Cursor or Codex delivery seam does not exist, then points at `hook-runtime.md` § Hook-runtime ownership and recovery, which documents Codex delivery (#487). The same stale reach claim sits at `0076-commit-and-push-gates-are-harness-hooks.md:87`.
- **Suggested fix:** in 0071 say "Cursor delivery does not exist today; Codex delivery landed in #487". Add the same one-clause correction to 0076:87.
- **Note:** fixed in 0071 only. The 0076:87 correction is deferred to the ADR-0074 supersede follow-up.

#### `install-layout.md` and `audit-workflow.md` give no scope boundary or neighbour links

- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `.prism/architect/_toolkit/install-layout.md:3` (also `audit-workflow.md:3`; `templates/install/.prism/architect/_toolkit/install-layout.md:3`)
- **Problem:** the writing guide asks the opener to say what the doc does not cover and link the neighbour that owns it. The six docs split out of `install-layout.md` and `audit-workflow.md` all do, and skills-ecosystem lists its neighbours, but the two parents do not, so a reader of the parent cannot tell the hook, sync, and worktree content moved.
- **Suggested fix:** add one sentence to each opener linking `hook-runtime.md`, `consumer-sync-flow.md`, `cross-reference-checks.md` (install-layout) and `worktree-hygiene.md`, `lesson-promotion.md` (audit-workflow). Edit the install-layout twin by hand.

#### `hook-runtime.md` states the gitignore line count

- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `.prism/architect/_toolkit/hook-runtime.md:13` (also the twin at `:13`)
- **Problem:** "appends four lines" and "Those four lines" restate `HOOK_STATE_GITIGNORE_LINES` as a count, which drifts when a glob is added (`writing-voice.md` § Count rules, not numbers). The next clause already names what the lines are.
- **Suggested fix:** drop the count: "appends the state-file globs and their `.tmp` siblings", "Those lines are the whole of what PRISM writes there".

#### Plan Task 1 lists drift as moved, but PR 4 keeps it in `install-layout.md`

- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `.prism/plans/prism-492.md:45`
- **Problem:** Task 1 says the build-time checks "(path guard, drift, crossref lint, pack parity, bundle-safe entry)" move out; the diff and Decision "PR 4 cut lines" keep `## Drift detection` in `install-layout.md`.
- **Suggested fix:** drop "drift" from Task 1's list.

#### `.prism/architect/manifest.json` loads all of `hook-runtime.md` on every route-add

- **Severity:** `minor`
- **Status:** `deferred`
- **File:** `.prism/architect/manifest.json:107` (also `templates/install/.prism/architect/manifest.stub.json:27`)
- **Problem:** the writing guide makes a route-add part of authoring every architect doc, so each one now also reads and is gated on `hook-runtime.md` (13 KB canonical; delivery, state files, ownership, recovery), when the editor needs only the gate-semantics paragraph. Confidence: plausible, the route may be intended as the one trigger a consumer has for this doc.
- **Suggested fix:** record the intent in a Decision, or split the gate semantics (what triggers a deny, what clears it, the opt-in) into the doc the manifest route should load.
- **Disposition:** rejected — the write gate keys on manifest routes, so a route change changes what gets gated, and the stub has no other path that reaches this doc in a consumer repo.

#### AC-4 evidence cannot run as written

- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `.prism/plans/prism-492.md` § Acceptance Criteria, AC-4 (Evidence sub-bullet; bookkeeping, recorded not gated)
- **Problem:** `prism doctor` refuses to run inside the PRISM checkout (it needs a consumer repo), and `prism:check` has no orphan-doc or dead-route gate for PRISM's own manifest (`verify-manifest-coverage.ts` checks coverage and catch-alls only). A manual walk of all three manifests found no dead route and no orphan outside the maintainer-only docs.
- **Suggested fix:** state the real evidence: a one-line script walk of route targets against disk, or `prism doctor --consumer <fresh adopt>`.

### Angle Coverage (PR 4 pass 1)

Findings are numbered in the order they appear above (1 `CONTEXT.md` through 13 AC-4 evidence).

- Runtime behavior — swept — 6 items enumerated (canonical, base, and stub manifest routes, `package.json` exact-match route, `path-guard.ts` allowlist entry, seed-curation classifications), 6 verdicts: route targets all exist, patterns anchored, allowlist needed for the doc's examples; findings 5, 12.
- Test efficacy — swept — 2 items enumerated (path-guard allowlist, route coverage), 2 verdicts: `prism:check` exercises both and exits 0, no new tests were added, and no gate catches dangling section references or an identical curated twin (findings 1–5).
- Spec and doc consistency — swept — 12 items enumerated (8 new docs, 3 parent docs, AC-4), 12 verdicts: every old section is present exactly once and the new docs carry no duplicates; findings 1–6, 9, 11, 13.
- Citation integrity — swept — 20 items enumerated (13 section references inside the new docs, 7 repointed references), 20 verdicts: all resolve; the tree-wide sweep for moved names found findings 1–4.
- External-system claims — swept — 17 items enumerated (hook delivery, removal, prune, marker, gitignore, Codex matcher, Cursor `emitDeny`, scope id, `--dry-run`, `--seed-agents-md`, `--linear-team`, content-root seam, agent-definition header gating, payload list, `applyAnchorsThenTokens`, guard locations, `^`-anchored patterns), 17 verdicts: all match source except the Codex `Read` wording (finding 7). The Codex deny envelope is documentation-verified, not live-probed, per `harnesses.mjs`.
- Repo writing rules — swept — verdict-only: finding 10.
- Security — swept — 1 item enumerated (manifest routes feeding the write gate), 1 verdict: no previously gated path lost a gate; `scripts/ai-skills/**` keeps `spec-editing.md` and `skills-ecosystem.md`.
- Docs impact — swept — 1 item enumerated (human docs citing the split docs), 1 verdict: only `CONTEXT.md` is stale (finding 1).
- Accessibility — n/a — no UI in the diff.

Cleaner path (non-blocking): `references/session-close.md` § Lesson promotion taxonomy restates the taxonomy that `lesson-promotion.md` now owns. Cite it from `session-close.md` instead of keeping two enumerations.

Cleaner path — implemented. `references/session-close.md` § Lesson promotion taxonomy and its seed twin now cite `lesson-promotion.md` and keep only who promotes and when.

---

## PR Readiness

- [ ] No critical or major issues — 2 major open (PR 4 pass 1)
- [x] `pnpm prism:check` passes — last run: 2026-10-11
- [ ] All review issues resolved — 13 open (PR 4 pass 1)

**Last updated:** 2026-10-11 (PR 4 pass 1)

---

## Acceptance Criteria

### Non-behavioral

- [ ] AC-1: `guides/writing-an-architect-doc.md` states the topic → umbrella → new-doc placement order and the consumer `_toolkit/` clause.
  - Evidence (machine): `grep -n "Where new content goes" .prism/architect/guides/writing-an-architect-doc.md templates/install/.prism/architect/guides/writing-an-architect-doc.md` matches in both files.
- [ ] AC-2: No promotion instruction says "the relevant architect" file without citing the placement order.
  - Evidence (machine): `grep -rn "relevant architect" .prism/references .prism/rules .prism/SPEC.md templates/install/.prism/references templates/install/.prism/rules` returns nothing.
- [ ] AC-3: No consumer-facing writer instruction targets `.prism/architect/_toolkit/`.
  - Evidence (human): read `after-writing.md` and Theo's step files. Every write target is a flat `.prism/architect/*.md` or is scoped to PRISM's own repo.
- [ ] AC-4: `install-layout.md`, `skills-ecosystem.md`, and `audit-workflow.md` each state one concern in their opening sentence, and every split-out doc is routed.
  - Evidence (human): `pnpm prism:check` passes and a manual walk of all three manifests finds no dead routes or unrouted shipped docs (`prism doctor` refuses to run inside the PRISM checkout).
- [ ] AC-5: `pnpm prism:check` passes on every PR in the stack.
  - Evidence (machine): CI green on each PR.
