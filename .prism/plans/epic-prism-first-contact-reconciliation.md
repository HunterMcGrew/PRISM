# Plan: epic-prism-first-contact-reconciliation

> **DEFERRED — captured for future planning, lowest priority of the three (user: fresh/established-merge onboarding is least urgent right now).** Written to survive context loss: design embedded inline. Epic C of three (A: docs — active; B: prism:sync steady-state — deferred; C: this).

## Ticket

No Linear ticket. Solves the hardest distribution case: adopting PRISM into a repo that **already has its own setup** (Thrive today; SPC in the future).

## Goal

Let an established team (Thrive, SPC) adopt PRISM **without losing the work they already have** — by giving Atlas a first-contact reconciliation mode that establishes the baseline state file the steady-state sync (Epic B) needs.

## Dependencies

- **Depends on Epic B.** C reuses B's content-hash diff engine and `--dry-run` three-bucket preview. The reconciliation *is* "run the diff when no state file exists yet, then walk the user through establishing one." Do not start C until B's diff engine exists.
- **Depends on Epic A** for the `documentation` config block (Atlas detects + proposes the established team's existing docs layout as the default answer).

---

## The core problem (why this is its own epic, not part of B)

Epic B's three-way merge assumes a **baseline `.prism-state.json` already exists** — it diffs consumer-current against the last synced hash. But the **first** sync into Thrive/SPC has **no state file**: those repos already have their own `.claude/`, their own `AGENTS.md`, possibly thrive-prefixed skills, their own `docs/`. With no baseline, *every* file looks either brand-new or hand-edited, and the merge logic has nothing to diff against. There's no way to distinguish "Thrive's existing `AGENTS.md` that should merge with PRISM's" from "a file PRISM owns and should write."

So first-contact must **bootstrap the baseline**: diff the established repo against PRISM's `templates/install/` snapshot **at the commit being synced**, classify every file, walk the user through adopt / merge / keep, then write the initial state file. After that one reconciliation, Epic B's steady-state merge takes over forever.

This belongs in **onboarding** (Atlas), not plain sync — it's a walked, resumable conversation, not a mechanical pass.

---

## Implementation Tasks

### Atlas (onboarding)

1. **Detect established setup.** On onboarding, check for pre-existing `.claude/`, `.prism/`, `AGENTS.md`, `CLAUDE.md`, platform dirs, and a `docs/` layout. If found → enter reconciliation mode instead of clean onboarding.
2. **Bootstrap-diff against PRISM's snapshot.** Diff the established repo's relevant files against `templates/install/` (canonical) + generated-skill outputs at the synced commit. Classify each file: **PRISM owns this** (adopt PRISM's version) / **you authored this** (keep, never manage — won't enter state file) / **both diverged** (walk a merge). Reuse Epic B's content-hash diff engine.
3. **Walk reconciliation with a dry-run preview first** (same non-destructive frame as Epic B — the user explicitly endorsed this). Show the three buckets before writing anything. Resumable via the existing `.ai-skills/registry/onboarding-state.json` mechanism — an established-repo reconciliation is long and must survive interruption.
4. **Establish the baseline state file.** After the user resolves, write the initial `.ai-skills/.prism-state.json` (Epic B's shape) so subsequent `prism:sync` runs work as steady-state.
5. **Propose existing docs layout as the `documentation` config default** (Epic A seam) rather than asking the established team cold — they already have a docs system; detect and confirm it.

### Winston (architecture)

1. Confirm the conflict-resolution interaction model resolved in Epic B applies to first-contact too (it should — same diff engine, same non-destructive frame). Flag if established-repo merges need a different interaction than steady-state.

---

## Decisions

- **First-contact is an onboarding mode, not a sync mode.** It bootstraps the baseline state file that steady-state sync (B) depends on. **Why:** B's merge has nothing to diff against on first contact; establishing the baseline is a walked, resumable conversation that's Atlas's domain.
  - → promote to ADR at build time.
- **Non-destructive, dry-run-first (inherited from Epic B).** Established teams won't adopt a tool that might clobber their `AGENTS.md` / `docs/` / existing skills on first run. Reconciliation previews the three buckets before any write.
  - → covered by Epic B's ADR.
- **OPEN — TBD, needs Hunter + SPC input (resolves at SPC's onboarding/sync time, not now).** SPC's specific existing-setup shape and doc format. The user will NOT have SPC's input ahead of time — SPC specifies when they pull/sync PRISM in. **Default path (used until resolved):** build the reconciliation mode generically (detect → diff → classify → walk → bootstrap state) so it handles any established repo; SPC's specifics ride the same `config.json` + onboarding-detection channel as Thrive's, no SPC-specific code.

## History

- 2026-05-29 [claude/stupefied-ardinghelli-189bdd]: Plan created (deferred, lowest priority) from the Winston design session. Core first-contact-with-no-baseline-state problem and the bootstrap-the-baseline solution embedded inline. SPC specifics left OPEN, resolving at SPC's own onboarding time.

## Acceptance Criteria

### Behavioral

- [ ] Given an established repo with its own `.claude/`, `AGENTS.md`, and `docs/`, When Atlas onboards it, Then it enters reconciliation mode and shows a dry-run three-bucket preview before writing anything.
- [ ] Given a file the established team authored (e.g. a custom skill, their own `docs/`), When reconciliation runs, Then that file is classified "yours," left untouched, and excluded from the baseline state file.
- [ ] Given reconciliation completes, When the maintainer later runs `prism:sync`, Then it behaves as steady-state (Epic B) against the baseline state file just written.
- [ ] Given a long reconciliation interrupted midway, When the user resumes, Then onboarding picks up from the saved `onboarding-state.json` without redoing resolved files.

### Non-behavioral

- [ ] No SPC-specific code paths — established-repo handling is generic; team specifics come from `config.json` + detection.
- [ ] Reconciliation reuses Epic B's diff engine (no second diff implementation).
