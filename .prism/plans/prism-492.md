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
4. `_toolkit/documentation.md:109`: drop the "Phase 3" onboarding claim.
5. Verify: `pnpm prism:check` passes, and `grep -rn "relevant architect" .prism templates` returns nothing.

**PR 3 — writers**

1. Theo: in `.prism/skills/prism-doc-walker/step-05-draft.md`, before drafting, check the manifest and existing docs for one that already owns the candidate's topic, and offer to extend it instead. Have the drafter read the writing guide at that step.
2. `.prism/skills/prism-doc-walker/step-07-commit.md:31`: replace the broad-glob advice with the guide's narrowest-pattern rule.
3. Eli: `.prism/references/documentation/after-writing.md:10,43` and its seed twin: in a consumer repo, these rows go to the team's own flat architect doc, not `_toolkit/documentation.md`. `:15`: if the paired topic doc doesn't exist, create and route it per the guide.
4. Verify: `pnpm prism:check` passes.

**PR 4 — split PRISM's own umbrellas**

1. `_toolkit/install-layout.md`: keep install layout and ownership. Move hook runtime and write gate, the build-time checks (path guard, drift, crossref lint, pack parity, bundle-safe entry), and substitution passes into one-concern docs, each routed by the files that control it. Repoint the manifest, `manifest.base.json`, the consumer stub, `seed-curation.json`, and every reference found by grep.
2. `_toolkit/skills-ecosystem.md`: move npm packaging invariants and Eric session-cost notes out. Narrow the `scripts/ai-skills/**` route.
3. `_toolkit/audit-workflow.md`: move worktree hygiene and the lesson-promotion taxonomy to their own routed docs.
4. Each split doc is decomposed after reading the source doc in full at PR 4 start. The exact cut lines get recorded in `## Decisions` before editing.
5. Verify: `pnpm prism:check` passes. `prism doctor` reports no orphan docs or dead routes.

---

## Decisions

- **The trigger lives in `branch-plan.md` § Before Closing, not in `CLAUDE.md` or `AGENTS.md`.**
  - **Root cause:** the `→ promoted to` verdict is written during a plan edit. `.prism/plans/**` doesn't route the writing guide, so the target is picked before the guide loads.
  - **Alternatives considered:** a pointer in `CLAUDE.md` and `AGENTS.md`, which is what thrive #2673 shipped. Routing the guide on `.prism/plans/**`.
  - **Chosen approach:** `branch-plan.md` is always-on and the build ships it to every host, so the pointer fires at the exact step where the target is chosen. A `CLAUDE.md` pointer only reaches Claude. A plan route would load the full guide on every plan edit, when only the close step needs it.
  - **Implementation guidance:** edit both the source and the curated seed twin by hand. The seed twin has no drift check.
- **Consumer promotions land in flat `.prism/architect/*.md`, never `_toolkit/`.** `prism update` overwrites the files PRISM ships under `_toolkit/**` (`scripts/ai-skills/ownership.ts`), so a team's edit to one survives only as a `.bak` copy, and PRISM may ship a file at any path there later.

- **`prism update` owns `.prism/architect/guides/**`.** `PRISM_OWNED_GLOBS` had no entry for the writing guides, so `classifyPath` returned `unknown` and an existing consumer never received a guide update. Fixed in PR 1 because PR 1's close-step pointer cites a guide section those consumers would otherwise lack. Considered: a separate PR ahead of the stack. Rejected: PR 1 is the change that depends on it. A consumer who edited a guide gets the usual owned-file treatment, a `.bak` copy and then PRISM's version. Guides were never in a consumer's sync manifest, so the first update after this ships writes a `.bak` for every guide that differs from the incoming copy, edited or not.

---

## Sessions

- 2026-10-11 [huntermcgrew/prism-492-architect-doc-placement] open: Intent — port thrive's umbrella-placement fix to PRISM and split PRISM's own umbrellas; Bounds — architect-doc placement guidance, promotion paths, Theo/Eli writers, the three named umbrella docs; Approach — four-PR stack, rule first · close: scope held

---

## History

- 2026-10-11 [huntermcgrew/prism-492-architect-doc-placement]: Plan created from the architect-doc write-path audit; stack approved with all four PRs.

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

---

## PR Readiness

- [x] No critical or major issues
- [x] `pnpm prism:check` passes — last run: 2026-10-11
- [ ] All review issues resolved (2 minor open)

**Last updated:** 2026-10-11

---

## Acceptance Criteria

### Non-behavioral

- [ ] AC-1: `guides/writing-an-architect-doc.md` states the topic → umbrella → new-doc placement order and the consumer `_toolkit/` clause.
  - Evidence (machine): `grep -n "Where new content goes" .prism/architect/guides/writing-an-architect-doc.md templates/install/.prism/architect/guides/writing-an-architect-doc.md` matches in both files.
- [ ] AC-2: No promotion instruction says "the relevant architect" file without citing the placement order.
  - Evidence (machine): `grep -rn "relevant architect" .prism templates` returns no line that lacks a `Where new content goes` citation.
- [ ] AC-3: No consumer-facing writer instruction targets `.prism/architect/_toolkit/`.
  - Evidence (human): read `after-writing.md` and Theo's step files. Every write target is a flat `.prism/architect/*.md` or is scoped to PRISM's own repo.
- [ ] AC-4: `install-layout.md`, `skills-ecosystem.md`, and `audit-workflow.md` each state one concern in their opening sentence, and every split-out doc is routed.
  - Evidence (machine): `pnpm prism:check` and `prism doctor` both report no orphan docs or dead routes.
- [ ] AC-5: `pnpm prism:check` passes on every PR in the stack.
  - Evidence (machine): CI green on each PR.
