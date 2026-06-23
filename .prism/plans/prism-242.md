# Plan: prism-242

## Ticket

https://github.com/HunterMcGrew/PRISM/issues/242

## Goal

Render the `prism-*` persona roster into an onboarded consumer repo, with the consumer's tokens, automatically on `prism:update` / `prism:adopt`.

---

## User Stories

<!-- Mira fills this section. -->

---

## Design

<!-- Not applicable — no UI surface. -->

---

## Implementation Tasks

### Clove (implementation)

1. Make `syncOptionalSkillPayloads` param-pure — `build.ts:340-372` reads module-global `checkMode`/`changedPaths`; pass them as params; update both call sites. Verify: build → empty `git diff`, `prism:check` green.
2. Extract `generatePlatformSkills` into new `scripts/ai-skills/generate-skills.ts`. Body = `build.ts:1258-1522` (render loop + codexConfig write + orphan cleanup) only — NOT content copies, seed mirror, AGENTS.md block, path-guard, sync-manifest. Signature takes absolute `sourceSkillsRoot`, `targetRoots`, `codexConfigPath`, `roleMap`, `tokenMap`, `optedIn`, `checkMode`, `changedPaths`; returns `{ knownSkillIds }`. Verify: byte-identical PRISM output.
3. Rewire PRISM `build.ts main()` to resolve absolute roots + build roleMap + call the fn, then continue content copies → seed mirror → AGENTS.md block → path-guard → Thrive-literal guard unchanged. Verify: empty `git diff`; existing build/seed-drift/discovery tests green.
4. Split the literal guard — add `runLeftoverTokenGuard(roots)` to `literal-guard.ts`. PRISM runs both guards; consumer runs only leftover-token. Unit tests for both.
5. Wire into `update.ts` (after the platform-refresh seam, `update.ts:446`) and `adopt.ts`. Build consumer roleMap from PRISM-source `roles.json`; reuse consumer `tokenMap` (`update.ts:442`); resolve consumer `targetRoots` from consumer `paths.json` (extend `resolveConsumerPlatformDirs`); call with `checkMode:false`; run leftover-token guard on consumer output. Verify the adopt path reaches the platform-refresh seam — `refreshPlatformDirs` lives in `update.ts main()`, not in `runUpdate`, so `runAdopt`→`runUpdate` may not refresh platform dirs at all today; confirm and wire skill-gen at whichever seam both commands share.
6. Tests (`generate-skills.test.ts`): foreign config renders into a separate output root; PRISM output unchanged; no `${}` survives; update→check idempotent; dropped persona is orphan-cleaned.

### Eli (documentation)

7. Document the consumer skill-gen step in `.prism/architect/_toolkit/install-layout.md` (§ steady-state) and `skills-ecosystem.md` (two-guard model).

---

## Decisions

- **Personas install as `prism-*` IDs (Hunter confirmed).** Bodies render with the consumer `tokenMap` (`${PROJECT}` → consumer name, `${TICKET_PREFIX}` → consumer prefix). No directory ID remapping — that would break the `ownership.ts` regeneration/orphan-cleanup contract (keys off the `prism-*` prefix + managed marker).
- **Two guards, not one.** A new leftover-token guard (`/\$\{[A-Z][A-Z0-9_]*\}/`) runs in both PRISM and consumer mode. The existing Thrive-literal guard (`literal-guard.ts:24`) is a de-thriving canary — PRISM-build-only, never on consumer output (the consumer legitimately contains "Thrive").
- **Extracted fn is root-agnostic.** Each caller resolves absolute source/target paths and passes them in — removes the single-`repoRoot` read/write coupling.
- **Auto on every `prism:update`, no separate command** — parity with content projection.
- **Roster = all `prism-*`.** `seed-curation.json` is not the lever (it curates `.prism/` install-seed content, unrelated to personas).
- **Deliverable: ADR-0062** "Consumer skill distribution via prism:update." Cross-ref ADR-0030, 0032, 0057, 0059. Latest ADR on main is 0061; 0062 is next.

---

## History

- 2026-06-23 [hmcgrew/prism-242-consumer-skill-distribution]: Plan created. Branch and GitHub issue #242 opened. Architect decisions accepted. Mira (user stories) runs next.

---

## Debugged Issues

<!-- Sasha fills this section as needed. -->

---

## Review Issues

<!-- Briar / Eric fill this section during review. -->

---

## Acceptance Criteria

### Behavioral

- [ ] Given an onboarded consumer repo, When `prism:update` runs, Then the `prism-*` roster appears in the consumer's skill dirs with the consumer's name/prefix rendered in bodies.
- [ ] Given a persona is dropped from the roster, When the consumer runs `prism:update`, Then the orphaned persona is removed from the consumer's skill dirs.
- [ ] Given a consumer-authored (non-`prism-*`) skill, When `prism:update` runs, Then it is left untouched.
- [ ] Given `prism:update` has already run, When it runs again with no upstream change, Then it is a no-op (idempotent).

### Non-behavioral

- [ ] PRISM's own build output is byte-identical after the refactor (no `git diff`).
- [ ] No unresolved `${}` tokens survive in any rendered output.
- [ ] `prism:check` passes.

### AC Sync Log

| Date | Agent | Action | Plan | Linear |
| ---- | ----- | ------ | ---- | ------ |
| 2026-06-23 | Nora | Initial AC from architect-accepted criteria | created | N/A (GitHub issue) |

---

## Cleanup Items

<!-- Populated during review. -->

---

## PR Readiness

- [ ] No critical or major issues
- [ ] Types correct — no `any`, no unsafe `as`
- [ ] No stray console.logs or debug artifacts
- [ ] Tests written for new logic and edge cases
- [ ] All debugged issues resolved (no `open` entries)
- [ ] Build passes — last run: pending
- [ ] PR description up to date
- [ ] Lasting decisions promoted to architect context (if applicable)

**Last updated:** 2026-06-23
