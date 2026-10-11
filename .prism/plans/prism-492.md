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
5. Verify: `pnpm prism:check` passes, and `grep -rn "relevant architect" .prism templates` returns nothing.

**PR 3 — writers**

1. Theo: in `.prism/skills/prism-doc-walker/step-05-draft.md`, before drafting, check the manifest and existing docs for one that already owns the candidate's topic, and offer to extend it instead. Have the drafter read the writing guide at that step.
2. `.prism/skills/prism-doc-walker/step-07-commit.md:31`: replace the broad-glob advice with the guide's narrowest-pattern rule.
3. Eli: `_toolkit/documentation.md:109` (the cross-reference map "lives at the bottom of this file", which `prism update` replaces in consumer repos) and `.prism/references/documentation/after-writing.md:10,43` and its seed twin: in a consumer repo, these rows go to the team's own flat architect doc, not `_toolkit/documentation.md`. `:15`: if the paired topic doc doesn't exist, create and route it per the guide.
4. Readers of the map follow the same split: `documentation/startup.md`, `review-docs-impact.md` (plus twins), and `prism-documentation/shared.md` DoD read `.prism/architect/documentation-conventions.md` in consumer repos.
5. `scripts/ai-skills/crossref-lint.ts` `isLazyOrHistoricalTarget`: treat `.prism/architect/documentation-conventions.md` as a lazy consumer artifact, with a test in `crossref-lint.test.ts`.
6. Verify: `pnpm prism:check` passes.

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
- **A consumer team's doc-convention entries live in a flat `.prism/architect/documentation-conventions.md`.** Eli used to append template entries and cross-reference map rows to `_toolkit/documentation.md`, which `prism update` replaces. Considered: the consumer overlay under `custom/`. Rejected: the overlay is emitted into each platform's `custom/` subdir and the manifest never routes it, so manifest-loading agents would never see the rows. PRISM's own repo keeps its rows in `_toolkit/documentation.md`.
- **Consumer promotions land in flat `.prism/architect/*.md`, never `_toolkit/`.** `prism update` replaces `_toolkit/**` (`scripts/ai-skills/ownership.ts`), so a team's content written there is lost on the next update.

---

## Sessions

- 2026-10-11 [huntermcgrew/prism-492-architect-doc-placement] open: Intent — port thrive's umbrella-placement fix to PRISM and split PRISM's own umbrellas; Bounds — architect-doc placement guidance, promotion paths, Theo/Eli writers, the three named umbrella docs; Approach — four-PR stack, rule first

---

## History

- 2026-10-11 [huntermcgrew/prism-492-architect-doc-placement]: Plan created from the architect-doc write-path audit; stack approved with all four PRs.
- 2026-10-11 [huntermcgrew/prism-492-promotion-wording]: PR 2 points every promotion instruction at the placement order and removes stale manifest claims; `documentation.md:109` moved to PR 3 because it is the same `_toolkit/` write-target problem as Eli's appends.
- 2026-10-11 [huntermcgrew/prism-492-doc-writers]: PR 3 gives Theo an owning-doc check before drafting and narrow-route guidance, and moves consumer doc-convention writes out of `_toolkit/`; see Decision: doc-conventions doc.

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
