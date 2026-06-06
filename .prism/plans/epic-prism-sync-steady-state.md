# Plan: epic-prism-sync-steady-state

> **DEFERRED — captured for future planning.** This plan is written to survive context loss: the full design is embedded inline so a cold session can plan and build without re-deriving it. Epic B of three (A: docs overhaul — active; B: this; C: first-contact reconciliation — deferred).

## Ticket

No Linear ticket. Implements the `prism:sync` distribution-pull flow that `README.md` flags as "planned follow-up" and that `docs/content/dev/operations/distribution.md` (will move to flat `docs/` in Epic A) already fully specs on paper.

## Goal

Build `pnpm prism:sync` so the PRISM maintainer can push toolkit updates ("strictly PRISM" content) into a repo PRISM has **already onboarded** — non-destructively, with a dry-run preview, never clobbering team-authored content.

## Dependencies

- **Depends on Epic A** for the `documentation` config block — sync must read `documentation.location` to know which path is team-owned docs and leave it alone (Eli's hands-off contract). Do not build B's merge layer until A's config block exists, or docs protection has nothing to key off.
- **Blocks Epic C** — C's first-contact reconciliation reuses B's content-hash diff engine and `--dry-run` preview. Build B first.

---

## Embedded design (source of truth — from `distribution.md`, do not re-derive)

### Distribution model
PRISM lives as a **sibling repo** next to the consumer's codebase (not a submodule, not an npm package, not a fork-template — all rejected; see distribution.md for why). Sync runs from the PRISM clone and writes into the consumer repo:
```
cd prism
git pull origin main
pnpm install                 # if package.json changed
pnpm prism:sync --target ../consumer-repo
```
After sync lands canonical content, the consumer runs `pnpm prism:build` locally to regenerate platform copies; consumer CI runs `pnpm prism:check`.

### The "strictly PRISM" boundary (= what sync owns)
**Sync writes (canonical, tokens substituted from consumer's `config.json` at sync time):**
| Source (in PRISM) | Destination (in consumer) |
| --- | --- |
| `templates/install/.prism/SPEC.md.tmpl` | `consumer/.prism/SPEC.md` |
| `templates/install/.prism/rules/` | `consumer/.prism/rules/` (universal always; opt-in if in `config.rules.optIn`) |
| `templates/install/.prism/spec/adrs/` | `consumer/.prism/spec/adrs/` |
| `templates/install/.prism/architect/` | `consumer/.prism/architect/` |
| `templates/install/.prism/architect/manifest.stub.json` | `consumer/.prism/architect/manifest.json` (renamed) |
| `templates/install/.prism/templates/` | `consumer/.prism/templates/` |
| `templates/install/.prism/references/` | `consumer/.prism/references/` |
| `templates/install/AGENTS.md.tmpl` | `consumer/AGENTS.md` |
| `templates/install/.claude/CLAUDE.md.tmpl` | `consumer/CLAUDE.md` |

Skills are generated (not copied) from `.ai-skills/skills/<id>/` → `.claude/skills/`, `.agents/skills/`, `.codex/agents/<id>.toml`, `.cursor/skills/` via the build step.

**Sync NEVER touches (team-owned):** consumer's `.ai-skills/config.json`; hand-authored skills (no matching `.ai-skills/skills/<id>/` in PRISM); `.prism/plans/`; `.prism/lessons.md`; the team's docs path (`documentation.location` — Epic A); anything outside `.prism/`, `.claude/`, `.agents/`, `.codex/`, `.cursor/`, `AGENTS.md`, `CLAUDE.md`.

### State file — enables three-way merge
After first sync, consumer repo has `.ai-skills/.prism-state.json`:
```json
{
  "prismCommit": "abc1234",
  "syncedAt": "<ISO timestamp>",
  "config": "<hash of config.json at sync time>",
  "files": { ".prism/rules/writing-voice.md": "<content hash>", "AGENTS.md": "<content hash>", "...": "..." }
}
```
State tracks canonical files only. Build copies under platform dirs aren't tracked individually — regenerated from canonical, `prism:check` catches hand-edits. Hand-authored files never appear in state, so the sync layer never sees them.

### The four merge outcomes (per file, comparing consumer-current-hash vs state-hash vs PRISM-incoming)
1. **unchanged in consumer + changed in PRISM** → update silently.
2. **changed in consumer (hash ≠ synced) + changed in PRISM** → **conflict**: surface in preview, never auto-resolve.
3. **changed in consumer + unchanged in PRISM** → leave alone; team's version wins.
4. **unchanged in consumer + unchanged in PRISM** → no-op.

---

## Implementation Tasks

### Clove (implementation)

1. **Content-hash diff engine.** Read `.ai-skills/.prism-state.json`, hash consumer-current + PRISM-incoming for every tracked canonical file, classify each into the four merge outcomes above. Reuse hashing/utils from `scripts/ai-skills/utils.ts`; extend the existing `content-copy.test.ts` / `tokens.test.ts` patterns.
2. **`pnpm prism:sync --target <path>`** — `scripts/ai-skills/sync.ts`, wired in `package.json`. Applies outcomes 1 & 4 (silent update / no-op), preserves 3, collects 2 (conflicts) for the preview. Substitutes tokens from the consumer's `config.json` at sync time. Writes/updates the state file on apply. Reads `documentation.location` (Epic A) and excludes it from the managed set.
3. **`--dry-run` preview (Mira's three-bucket output, Atlas + user both insisted).** Print, without writing: **will update** (outcome 1), **preserved as yours** (outcomes 3 + hand-authored), **conflicts needing resolution** (outcome 2, with diffs). This makes the ownership boundary *legible to the team*, not just a hash in a file. Dry-run is load-bearing for trust, not optional.
4. **Post-sync summary + guidance** — files updated / preserved / conflicts; remind to run `pnpm prism:build` then `pnpm prism:check`.

### Eli (documentation)

1. Write the operator guide for sync (in the flat `docs/` from Epic A): how updates flow, what sync will/won't touch (the ownership boundary), the `--dry-run`, and conflict resolution. This is a flagship operator doc.

### Winston (architecture)

1. Resolve the OPEN conflict-resolution interaction model (below) with the user before Clove builds task 2's conflict handling.

---

## Decisions

- **Non-destructive, dry-run-first is the decided frame.** Sync previews before it writes; conflicts are surfaced, never auto-resolved. **Why:** an established team won't adopt a tool that might silently overwrite their work; the user explicitly endorsed the non-destructive dry-run preview.
  - → promote to ADR at build time (cross-epic trust contract; also governs C).
  - **Zoe verdict (2026-06-05):** `live` — Epic B deferred by design; the embedded design is the source of truth for the future build.
- **OPEN — TBD, needs Hunter input.** *How* a previewed conflict (outcome 2) actually gets resolved once the dry-run has surfaced it. Options Clove named: (a) interactive per-file prompt in the Node script; (b) write git-style conflict markers into the file and let the user resolve in their editor; (c) dry-run-then-apply with the user hand-editing flagged files before re-running. **Default path (used until resolved):** (c) — dry-run surfaces conflicts, sync skips them and leaves the consumer's version intact, user resolves manually and re-syncs. Aligns with the non-destructive frame and avoids fiddly cross-platform interactive prompting (Clove's flag). Revisit if manual resolution proves too tedious at scale.
  - **Zoe verdict (2026-06-05):** `live` (open-question, not yet stale) — OPEN since 2026-05-29 (7 days); default path (c) documented and carrying.

## History

- 2026-05-29 [claude/stupefied-ardinghelli-189bdd]: Plan created (deferred) from the Winston design session. Design embedded inline from distribution.md so the epic survives context loss. Conflict-resolution interaction model left OPEN with default path (c).

## Acceptance Criteria

### Behavioral

- [ ] Given a repo PRISM already onboarded, When the maintainer runs `prism:sync --dry-run`, Then it prints three buckets (will update / preserved as yours / conflicts) and writes nothing.
- [ ] Given a file the team hand-edited since last sync, When sync runs, Then that file is preserved and reported as "yours" — never overwritten.
- [ ] Given a file unchanged by the team but updated in PRISM, When sync runs, Then it updates silently.
- [ ] Given the team's docs path (`documentation.location`), When sync runs, Then nothing under it is touched.

### Non-behavioral

- [ ] `--dry-run` is the default-safe entry point; applying changes requires an explicit (non-dry-run) invocation.
- [ ] State file written/updated only on apply, never on dry-run.
