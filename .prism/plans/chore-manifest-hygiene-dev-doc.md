# Plan: chore-manifest-hygiene-dev-doc

## Ticket

Internal infrastructure — no Linear ticket. Closes the manifest-cleanup + paired-dev-doc surface from the abandoned PR #4 (`hmcgrew/context-optimization-thrive-learnings`). Companion to a follow-up "lazy-load heavy personas" ticket that opens after this one merges.

## Goal

Replace the `**` catch-all in `.prism/architect/manifest.json` with explicit globs that preserve `skills-ecosystem.md` coverage for all current consumers, prove the preservation with a re-runnable verification script, and ship the long-overdue paired dev doc for ADR-0035.

---

## Implementation Tasks

Branch: `hmcgrew/chore-manifest-hygiene-dev-doc` (branch from `origin/main`).

### Clove (implementation)

1. **Verify the manifest multi-route assumption holds in the consumer.**
   - File: `.prism/references/architect-context.md` (already read during planning — confirms multi-route at the file level via distinct globs)
   - Cross-check: read the actual manifest-consumer code in any tooling that loads it (start with `scripts/ai-skills/build.ts` and `scripts/ai-skills/path-guard.ts`; grep for `manifest.json` in `scripts/`)
   - Verification: confirm the consumer iterates ALL keys per file and collects ALL matches (not first-match / last-match)
   - **Why:** the swap is only safe if the consumer behaves per the reference doc's contract. The reference doc says it does; verify the code agrees. (~10 minutes)

2. **Derive the explicit-glob replacement set from current `skills-ecosystem.md` dependencies.**
   - Source: run `grep -rn "skills-ecosystem" .ai-skills/ .claude/ .prism/ AGENTS.md` to enumerate every surface that references the doc
   - Map each reference to the glob(s) needed to ensure the doc loads when that surface is in scope
   - Starting set (verify and extend during derivation):
     - `.claude/skills/**/SKILL.md` (every Claude skill startup)
     - `.codex/agents/**` (Codex equivalent)
     - `.cursor/skills/**/SKILL.md` (Cursor equivalent)
     - `.ai-skills/skills/**/shared.md` (canonical sources)
     - `AGENTS.md` (cross-references throughout)
     - `.prism/SPEC.md`, `.claude/SPEC.md` (routing lookups)
   - Write the proposed manifest diff as a comment in the plan's `## Decisions` before applying, so Briar can review it without diffing the file
   - **Do not copy PR 4's replacement set verbatim.** Re-derive against current usage — the dependency surface has shifted in 19 days.

3. **Write the verification script at `scripts/ai-skills/verify-manifest-coverage.ts`.**
   - Purpose: for each persona in a test set, compute the set of architect docs that would load on startup against `.prism/architect/manifest.json`, given a representative file-scope (the files the persona typically reads during its first turn)
   - Test set:
     - `nora` — startup reads `.claude/skills/prism-ticket-start/SKILL.md` and any plan file in `.prism/plans/` → must load `skills-ecosystem.md` (expected-positive)
     - `zoe` — audit reads `.claude/skills/prism-zoe/SKILL.md`, `.prism/lessons.md`, ADR files → must load `skills-ecosystem.md` (expected-positive)
     - `winston` — startup reads `.claude/skills/prism-architect/SKILL.md` → must load `skills-ecosystem.md` (expected-positive)
     - `eric` — startup reads `.claude/skills/prism-code-review-pr/SKILL.md` → must load `skills-ecosystem.md` (expected-positive)
     - `sage` — startup reads `.claude/skills/prism-changelog/SKILL.md` → **may lose** `skills-ecosystem.md` (control — proves the swap is doing real work)
     - **Fallthrough case** — a representative file that matches no explicit glob (pick one, e.g. a random doc in `.prism/audits/` if any exist, otherwise a fixture path) → expected to load zero or only generic architect docs
   - Output: JSON map of `{persona: [architect-docs-loaded]}` printed to stdout for diffing
   - Header comment: documents purpose, when to run (any manifest edit), and how it composes with `pnpm prism:check`
   - Pattern to follow: read `scripts/ai-skills/build.ts` and `scripts/ai-skills/path-guard.ts` for the existing CLI shape, error handling, and tsx invocation conventions

4. **Wire the script to `package.json` as `pnpm prism:verify-manifest`.**
   - File: `package.json` (top-level scripts block)
   - Add: `"prism:verify-manifest": "tsx scripts/ai-skills/verify-manifest-coverage.ts"`
   - Also wire into the existing `pnpm prism:check` umbrella — locate the script that `prism:check` invokes and append the new verification to its sequence (after `prism:build`, before whatever else runs)
   - Verification: `pnpm prism:verify-manifest` runs without error; `pnpm prism:check` runs the new step as part of its sequence

5. **Capture the baseline.**
   - Sequence: from a clean `main` checkout, run `pnpm prism:verify-manifest > /tmp/manifest-baseline.json`
   - Verify: `cat /tmp/manifest-baseline.json` shows the expected `{persona: [docs]}` map with all expected-positive personas including `skills-ecosystem.md`
   - **Why baseline before swap:** Briar's verification requires before/after diff. Without the baseline, post-swap output is uncheckable.

6. **Swap `.prism/architect/manifest.json`.**
   - File: `.prism/architect/manifest.json`
   - Change: remove the line `"**": "skills-ecosystem.md"`; add the explicit-glob entries from task 2's derived set
   - Sequence: must run after task 5 (baseline captured)
   - Verification: `pnpm prism:verify-manifest > /tmp/manifest-postswap.json && diff /tmp/manifest-baseline.json /tmp/manifest-postswap.json`
   - Expected diff: zero, **except** for the control case (`sage`) which may show `skills-ecosystem.md` removed from its loaded set. Any other persona losing `skills-ecosystem.md` is a regression — investigate and add a glob to cover it.

7. **Update `.prism/architect/documentation.md` Cross-Reference Map.**
   - File: `.prism/architect/documentation.md`
   - Change: add a row to the Cross-Reference Map table linking ADR-0035 ↔ the new paired dev doc
   - Pattern to follow: read the existing rows in the map for the format (the table is the source of truth for ADR ↔ dev-doc pairings)
   - Sequence: can run in parallel with Eli's task 8, but the row should reference the path Eli is writing to (`docs/content/dev/architecture/rule-loading-tiers.md`)

8. **Run `pnpm prism:check` end-to-end.**
   - Verification: full check passes, including the new `verify-manifest` step
   - **Why:** catches drift between canonical `.ai-skills/` and platform copies (`.claude/`, `.codex/`, `.cursor/`) — if `manifest.json` was modified canonical-side and the build hasn't run, platform copies are stale
   - If drift: run `pnpm prism:build` then re-run `pnpm prism:check`

### Eli (documentation)

9. **Write `docs/content/dev/architecture/rule-loading-tiers.md`.**
   - File: `docs/content/dev/architecture/rule-loading-tiers.md` (new)
   - Source: `.prism/spec/adrs/0035-rule-loading-tiers.md` (the ADR is the agent-facing short form; this dev doc is the teammate-facing narrative)
   - Structure: four-beat arc per `.prism/architect/architecture-doc-shape.md`:
     - **Need** — why three tiers; the problem of indiscriminate rule loading
     - **Technical flows** — how loading actually works at startup (manifest matching, `paths:` frontmatter on Tier 2, skill-local Tier 3)
     - **Natural fit** — why this matches existing patterns (path-routed architect docs predate this; rules now follow the same model)
     - **Platform limits** — what's still rough (Tier 2 re-evaluation across skill handoffs, Tier 3 isolation boundaries)
   - Cross-links: open with "Spec source: [ADR-0035](../../spec/adrs/0035-rule-loading-tiers.md)"; ensure ADR-0035 gains a back-link in its "Notes / Related" section (small edit to the ADR)
   - **Do not reference `.claude/` directly in prose** — PR 4 hit a path-guard error here. Use "via the per-platform copies that `pnpm prism:build` writes alongside each platform dir" or similar.
   - Cross-reference precedent: read `.prism/architect/plugin-management.md` and `docs/content/dev/architecture/plugin-management.md` for the architect ↔ dev-doc pairing pattern
   - Sequence: can run in parallel with Clove's tasks 1–8

### Briar (self-review before PR open)

10. **Run the standard self-review pass plus manifest-specific checks.**
    - Standard: `pnpm tsc --noEmit` (type-check), `pnpm prism:check` (drift), `pnpm prettier --check` on touched files
    - Manifest-specific:
      - Confirm `/tmp/manifest-baseline.json` vs `/tmp/manifest-postswap.json` diff is empty (modulo `sage` control)
      - Manually verify one persona end-to-end: in a fresh chat, invoke Nora's startup, confirm she still references `Project Context` correctly (i.e. `skills-ecosystem.md` actually loaded)
      - Verify the Cross-Reference Map row added in task 7 points at the file Eli wrote in task 9
    - Lessons.md append: if any surprise surfaced during implementation (e.g. a persona dependency we missed, a manifest-format quirk), append the lesson per the format in `.prism/lessons.md` — class-sweep applies (could another persona's manifest dependency be hiding?)

---

## Decisions

- **Replace `**` catch-all with explicit globs derived from current usage, not PR 4's set.**
  - **Root cause of the original ambiguity:** PR 4 was 19 days ago; the `skills-ecosystem.md` dependency surface has shifted since then. Copying PR 4's set risks propagating stale assumptions.
  - **Alternatives considered:** (a) Keep the catch-all; (b) Copy PR 4's replacement set verbatim; (c) Re-derive from current `grep -rn skills-ecosystem`.
  - **Chosen approach:** (c) re-derive. (a) defeats the purpose of the cleanup (architectural clarity). (b) inherits 19 days of drift.
  - **Implementation guidance:** task 2 above runs the derivation; result goes into a comment in this plan before applying.

- **Verification is a re-runnable script wired into `pnpm prism:check`, not a manual eyeball check.**
  - **Root cause:** catch-all removal is invisible-failure territory — a missing glob doesn't surface until a persona invocation later. Eyeball checks are not auditable or replayable.
  - **Alternatives considered:** (a) Manual one-time check; (b) Re-runnable script in `scripts/ai-skills/`; (c) Audit report under `.prism/audits/`.
  - **Chosen approach:** (b). Lives next to `build.ts` and `path-guard.ts` per the existing tooling pattern. Wires into `pnpm prism:check` so future manifest edits get verified by the same umbrella command. (c) was rejected because `.prism/audits/` is for Zoe's markdown audit reports, not executable scripts.
  - **Implementation guidance:** tasks 3–4. Script at `scripts/ai-skills/verify-manifest-coverage.ts`; package.json script `pnpm prism:verify-manifest`; appended to `pnpm prism:check` sequence.

- **Paired dev doc bundles with this PR, not with the persona-splits ticket.**
  - **Root cause:** ADR-0035 has been on `main` since May 22 without its paired narrative doc — overdue by Eli's pairing convention. Bundling it with the larger persona-splits ticket delays it further and bloats that ticket's review surface.
  - **Alternatives considered:** (a) Bundle into persona-splits ticket; (b) Bundle into this manifest-cleanup ticket; (c) Standalone third ticket.
  - **Chosen approach:** (b). Small enough to ride along; the dev doc shares conceptual subject matter with the manifest cleanup (both implement the three-tier loading model from ADR-0035).
  - **Implementation guidance:** task 9 (Eli). Independent of Clove's tasks; can run in parallel.

- **Persona-splits follow-up ticket opens only after this PR merges and verifies clean downstream.**
  - **Root cause:** two open PRs touching manifest routing simultaneously creates a conflict surface neither PR should own. Plus the persona splits' lazy-load behavior depends on the routing model this PR establishes.
  - **Alternatives considered:** (a) Open both PRs in parallel; (b) Sequence them with explicit dependency.
  - **Chosen approach:** (b). Cross-link the persona-splits ticket back to this one when it opens.
  - **Implementation guidance:** N/A for this plan — applies to the next ticket.

- **PR #4 closes explicitly with cross-links to this ticket (and the upcoming persona-splits ticket) when this PR opens.**
  - **Root cause:** PR #4 is `overdue-archive` by Zoe's cadence rules — work shipped via other paths, original carrier no longer load-bearing, but sitting open. The close is itself a hygiene signal.
  - **Implementation guidance:** when this ticket's PR opens, post a comment on PR #4 linking the two new tickets and explaining the close, then close it. Do not let it linger.

### Open-question Decision variant

- **OPEN — TBD, needs implementation discovery.** Whether the manifest consumer (build script and/or runtime architect-context loader) actually iterates all keys per file and collects all matches, OR picks first-match/last-match. **Default path (used until resolved):** trust the reference doc at `.prism/references/architect-context.md:17` which explicitly says multi-route works. Task 1 above resolves the question definitively during implementation; if the consumer doesn't match the contract, escalate to a manifest schema change before swapping (do not proceed with task 6).

---

## Acceptance Criteria

### Behavioral

- [ ] Given the manifest changes are merged, When Nora is invoked for ticket triage, Then her startup architect-context load still includes the content from `skills-ecosystem.md`
- [ ] Given the manifest changes are merged, When Zoe runs a cadence audit, Then her verdict evidence still cites `skills-ecosystem.md § Skill Roster`
- [ ] Given the paired dev doc is published, When a reader follows the link from ADR-0035, Then they reach a teammate-facing narrative covering the three-tier loading model
- [ ] Given the verification script is run on `main` versus the branch, When the diffs are compared, Then no persona on the expected-positive list has lost `skills-ecosystem.md` from its loaded set

### Non-behavioral

- [ ] The `**` catch-all is removed from `.prism/architect/manifest.json`
- [ ] Every surface that depends on `skills-ecosystem.md` (enumerated during task 2) has an explicit glob route in the manifest
- [ ] The verification script `scripts/ai-skills/verify-manifest-coverage.ts` is checked in and re-runnable
- [ ] `pnpm prism:verify-manifest` is wired in `package.json` and included in the `pnpm prism:check` sequence
- [ ] The paired dev doc at `docs/content/dev/architecture/rule-loading-tiers.md` follows the four-beat arc from `.prism/architect/architecture-doc-shape.md`
- [ ] `.prism/architect/documentation.md` Cross-Reference Map includes the ADR-0035 ↔ dev doc row
- [ ] ADR-0035 includes a back-link to the new dev doc in its Notes / Related section
- [ ] `pnpm prism:check` passes end-to-end including the new `verify-manifest` step

### AC Adjustments

### AC Sync Log

| Date | Agent | Action | Plan | Linear |
| ---- | ----- | ------ | ---- | ------ |
| 2026-05-24 | Winston | Generated AC | created | N/A (no Linear ticket) |

---

## History

- 2026-05-24 [hmcgrew/chore-manifest-hygiene-dev-doc]: Plan created — manifest catch-all replaced with explicit globs preserving `skills-ecosystem.md` coverage, verification script wired into `pnpm prism:check`, paired dev doc for ADR-0035 written. Carries forward the salvageable portion of abandoned PR #4 (`hmcgrew/context-optimization-thrive-learnings`); persona-splits work deferred to a follow-up ticket that opens after this merges.

---

## Debugged Issues

_None yet._

---

## Review Issues

_None yet._

---

## Cleanup Items

_None yet._

---

## PR Readiness

- [ ] No critical or major issues
- [ ] Types correct — no `any`, no unsafe `as`
- [ ] No stray console.logs or debug artifacts
- [ ] Tests written for new logic and edge cases (verification script is the test)
- [ ] All debugged issues resolved (no `open` entries)
- [ ] Build passes — `pnpm prism:check` end-to-end with new `verify-manifest` step
- [ ] PR description up to date
- [ ] Lasting decisions promoted to architect context (if applicable — likely the manifest-routing semantics warrant a small `.prism/architect/manifest-routing.md` follow-up, flagged in evaluate mode)

**Last updated:** 2026-05-24
