# Plan: followup-192-check-nondeterminism

> Closed: 2026-06-16

## Ticket

GitHub issue #192

## Goal

Fix `pnpm prism:check` intermittently reporting `.agents/skills/<X>/SKILL.md` out-of-sync right after a branch checkout when no real drift exists.

---

## Implementation Tasks

### Clove (implementation)

1. Change `build.ts:1141-1142` — replace `!checkMode || (await skillsRootHasManagedContent(targetRoots.codex))` with `!checkMode` and add a load-bearing comment citing the gitignore reason. File: `scripts/ai-skills/build.ts`.

---

## Decisions

- **Skip `skillsRootHasManagedContent` for the codex target in check mode.**
  - **Root cause:** `.agents/` is gitignored (`.gitignore:7` `/.agents/`). A branch checkout leaves the prior branch's `.agents/` content on disk because git never touches gitignored dirs. In check mode, `skillsRootHasManagedContent(targetRoots.codex)` reads the stale `.agents/skills/` directory, finds a `.ai-skill-generated` marker from the prior branch, and returns `true`. This causes check mode to regenerate the current branch's content and compare it against the stale on-disk content via `writeFileIfChanged` (content comparison, not stat) — producing phantom drift. The other four mirrors (`.claude/`, `.cursor/`, `.codex/agents`, `.claude/agents`) are git-tracked, so checkout updates them, eliminating phantom drift for those targets.
  - **Alternatives considered:** (a) Add `.agents/` to a "skip in check mode" list by path pattern. (b) Clear `.agents/` before running check mode. (c) Use `!checkMode` unconditionally — chosen.
  - **Chosen approach:** `codex: !checkMode`. Mirrors the existing sync-manifest guard at `build.ts:~1366`, which already skips a gitignored generated artifact in check mode for exactly this reason. Path-pattern skip list adds indirection for no benefit; clearing `.agents/` before check mode mutates disk state during a read-only operation.
  - **Implementation guidance:** one-line change at `build.ts:1142` with a comment explaining the gitignore constraint. Build mode still evaluates to `true` and writes `.agents/` normally.
  - **`codexConfig` guard:** `.codex/codex-config.toml` has the same gitignore exposure (`.gitignore:9`). Folded in on Eric's review; `codexConfig` is now also `!checkMode` for consistency. Build mode still evaluates `pathExists` and writes the file normally.
  - → no promotion needed (ticket-tactical fix; the gitignore-means-skip-check pattern is already established by the sync-manifest guard)

---

## History

- 2026-06-16 [hmcgrew/prism-192-check-nondeterminism]: Fixed phantom drift in `pnpm prism:check` for `.agents/` by skipping `skillsRootHasManagedContent` in check mode; `.agents/` is gitignored so stale branch content triggered false positives.
- 2026-06-16 [hmcgrew/prism-192-check-nondeterminism]: Folded in Eric's minor — guarded `codexConfig` with `!checkMode` for the same gitignore reason; closed plan.
