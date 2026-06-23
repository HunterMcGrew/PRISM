# Plan: prism-242

## Ticket

https://github.com/HunterMcGrew/PRISM/issues/242

## Goal

Render the `prism-*` persona roster into an onboarded consumer repo, with the consumer's tokens, automatically on `prism:update` / `prism:adopt`.

---

## User Stories

### Story: Persona roster appears automatically on update

**As a** consumer developer who has onboarded PRISM,
**I want** the full `prism-*` persona roster to appear in my repo when I run `prism:update` (or `prism:adopt`),
**so that** I can invoke Winston, Clove, Eric, and the rest of the persona suite in my own codebase without any manual setup step.

**Acceptance criteria hints:**
- [ ] Given a consumer repo with PRISM installed and no persona skills present, When `prism:update` runs, Then every `prism-*` skill file appears in the consumer's configured skill directory
- [ ] Given a consumer repo, When `prism:update` runs, Then the consumer's project name and ticket prefix tokens (`${PROJECT}`, `${TICKET_PREFIX}`) are substituted in every rendered skill body
- [ ] Given `prism:adopt` is run instead of `prism:update`, Then persona skills are also rendered (adopt path reaches the same skill-generation seam)
- [ ] No unresolved `${}` tokens appear in any rendered output

---

### Story: Roster changes propagate without manual work

**As a** consumer developer on a team that runs `prism:update` periodically,
**I want** the persona roster in my repo to stay current with the upstream PRISM version automatically,
**so that** new personas and updates reach my team without anyone on my team having to find and copy files manually.

**Acceptance criteria hints:**
- [ ] Given a persona is added to the PRISM roster upstream, When the consumer runs `prism:update`, Then the new persona skill appears in the consumer's skill directory
- [ ] Given a persona is dropped from the PRISM roster, When the consumer runs `prism:update`, Then the corresponding skill file is removed from the consumer's skill directory
- [ ] Given `prism:update` has already run with the current upstream version, When it runs again with no upstream change, Then no skill files are written or deleted (idempotent)

---

### Story: Consumer-authored skills are never overwritten

**As a** consumer developer who has written custom skills alongside the PRISM personas,
**I want** my own skills to remain untouched when `prism:update` runs,
**so that** I can extend the persona roster with team-specific skills without worrying that an update will clobber them.

**Acceptance criteria hints:**
- [ ] Given a consumer repo contains a skill file that does not have a `prism-*` prefix, When `prism:update` runs, Then that file is unchanged
- [ ] Given a consumer repo contains a `prism-*` skill that is not in the PRISM roster (a consumer-authored skill with the prefix), When `prism:update` runs, Then that file is left untouched (the managed-marker check governs ownership, not the prefix alone)
- [ ] Only files carrying the managed marker written by a prior `prism:update` run are eligible for update or removal

---

### Story: PRISM's own build output is unchanged by the refactor

**As a** PRISM maintainer shipping the `generatePlatformSkills` extraction,
**I want** PRISM's own build to produce byte-identical output before and after the refactor,
**so that** the extraction is a pure internal refactor with zero risk of changing what PRISM already projects into consumer repos.

**Acceptance criteria hints:**
- [ ] Given a clean PRISM repo, When `prism:build` runs after the refactor, Then `git diff` is empty (no change to any generated output)
- [ ] Given the refactored build, When `prism:check` runs, Then it passes with no errors
- [ ] The shared `generatePlatformSkills` function, when called with PRISM's own roots, produces the same output as the pre-refactor inline build loop

---

## Design

<!-- Not applicable — no UI surface. -->

---

## Implementation Tasks

### Clove (implementation)

1. Make `syncOptionalSkillPayloads` param-pure — `build.ts:340-386` (function body) reads module-global `checkMode`/`changedPaths` (declared `build.ts:132-133`; read at `build.ts:355-356,369-370`); pass them as params; update both call sites (`build.ts:1329`, `build.ts:1348`). Verify: build → empty `git diff`, `prism:check` green.
2. Extract `generatePlatformSkills` into new `scripts/ai-skills/generate-skills.ts`. Body = the per-skill render loop + codexConfig write + orphan cleanup, currently `build.ts:1263-1522` — NOT content copies (`build.ts:1450-1471`), seed mirror (`build.ts:1474-1483`), AGENTS.md block (`build.ts:1486`), path-guard (`build.ts:1417-1448`), sync-manifest. These are already cleanly separate in `main()`, not interleaved in the loop, so the extraction boundary is clean. Signature takes absolute `sourceSkillsRoot`, `targetRoots`, `codexConfigPath`, `roleMap`, `tokenMap`, `optedIn`, `checkMode`, `changedPaths`; returns `{ knownSkillIds }`. Verify: byte-identical PRISM output.
3. Rewire PRISM `build.ts main()` to resolve absolute roots + build roleMap + call the fn, then continue content copies → seed mirror → AGENTS.md block → path-guard → Thrive-literal guard unchanged. Verify: empty `git diff`; existing build/seed-drift/discovery tests green.
4. Split the literal guard — add `runLeftoverTokenGuard(roots)` to `literal-guard.ts`. PRISM runs both guards; consumer runs only leftover-token. Unit tests for both.
5. Wire consumer skill-gen so BOTH `prism:update` and `prism:adopt` reach it. **No shared seam exists today** (confirmed — see Decision "Adopt-path seam"): `refreshPlatformDirs` is defined `update.ts:323-347` and called only from `update.ts main()` at `update.ts:446`; `runAdopt` (`adopt.ts:111-127`) calls `runUpdate` directly at `adopt.ts:124` and never reaches `main()`, so the adopt path does not refresh platform dirs at all. **Wiring point:** move the platform-refresh + skill-gen step out of `update.ts main()` into `runUpdate` (`update.ts:199-260`) so both `prism:update`'s `main()` (`update.ts:445`) and `runAdopt`'s direct call (`adopt.ts:124`) traverse it. Inside that shared step: build consumer roleMap from PRISM-source `roles.json`; reuse consumer `tokenMap` (`update.ts:442` — relocate alongside the call); resolve consumer `targetRoots` via `resolveConsumerPlatformDirs` (`update.ts:297-303`, extend if `paths.json` opt-ins must be honored); call `generatePlatformSkills` with `checkMode:false`; run leftover-token guard on consumer output. Verify: a `prism:adopt` run on a fixture consumer projects the roster (the regression this fixes). Note for Clove: relocating `refreshPlatformDirs` into `runUpdate` is a behavior change on the adopt path (intended fix) but must leave the `prism:update` path's output identical — assert that in a test.
6. Tests (`generate-skills.test.ts`): foreign config renders into a separate output root; PRISM output unchanged; no `${}` survives; update→check idempotent; dropped persona is orphan-cleaned.

### Eli (documentation)

7. Document the consumer skill-gen step in `.prism/architect/_toolkit/install-layout.md` (§ steady-state) and `skills-ecosystem.md` (two-guard model).

---

## Decisions

- **Extraction seam crossed two more files than planned, to break a cycle (Clove).** `generatePlatformSkills` imports the builder functions; `build.ts` imports `generatePlatformSkills` — a cycle if the builders stayed in `build.ts`. Resolved by moving the builders (`buildSkillMarkdown`, `buildCodexAgentToml`, `buildClaudeAgentMarkdown`, `buildRoleMap`, `loadSkillSource`, the optional-payload sync, `removeDeletedManagedAgentFiles`) into `generate-skills.ts`, and the two shared leaf helpers (`listRelativeDirectoryEntries`, `filesAreEqual`) into `utils.ts`. `build.ts` re-exports the builders + `listRelativeDirectoryEntries` so existing `from "./build"` test imports keep resolving.
  - **Root cause:** the render loop and the orphan cleanup depend on the builder functions and `listRelativeDirectoryEntries`/`filesAreEqual`, which `build.ts` also uses elsewhere (`checkSeedDrift`) and `sync-manifest.ts` imports from `build.ts`.
  - **Chosen approach:** shared leaves → `utils.ts` (imported by both, no cycle); render-only helpers → `generate-skills.ts`; re-export from `build.ts` to preserve the test import surface.
  - **Implementation guidance:** `generate-skills.ts` never imports from `build.ts`. Keep it that way — that one-way edge is what keeps the graph acyclic.
  - → no promotion needed (module-internal refactor mechanics, specific to this codebase's build scripts; not a cross-cutting pattern).
- **`runUpdate` engine split into `applyFilePass` + refresh (Clove).** Lifting the platform refresh into `runUpdate` would have forced every per-file unit test to stand up a full consumer config + PRISM skill source. Instead, `applyFilePass` (exported) is the pure per-file engine the unit tests target; `runUpdate` = `applyFilePass` + content-copy refresh + roster render, and is the shared seam both `prism:update` `main()` and `runAdopt` call.
  - **Alternatives considered:** make `runUpdate` itself the unit-test target (rejected — couples engine tests to a full repo fixture); duplicate the refresh into both callers (rejected by Winston's adopt-seam Decision — two call sites drift).
  - → no promotion needed (test-ergonomics seam, ticket-local).
- **Adopt path is blocked end-to-end by a pre-existing seed-content defect, surfaced not caused by this ticket (Clove).** The skill-gen path is proven working on `prism:update` (renders all 31 personas, tokens substituted, idempotent). But `prism:adopt` throws on the content-copy step — which now runs because of the adopt-seam fix — because `templates/install/.prism/spec/adrs/_toolkit/0030-token-substitution-at-build-time.md` carries unfenced `${TOKEN}`/`${KEY}` example literals the substitution layer can't resolve. Canonical `.prism/spec/.../0030` is clean; only the seed copy diverges. Flagged as a follow-up (background task) — it touches seed curation / ADR content, a different lane from skill distribution.
  - → no promotion needed (defect tracked as a separate follow-up task; fix belongs in the seed-content lane).
- **Personas install as `prism-*` IDs (Hunter confirmed).** Bodies render with the consumer `tokenMap` (`${PROJECT}` → consumer name, `${TICKET_PREFIX}` → consumer prefix). No directory ID remapping — that would break the regeneration/orphan-cleanup contract, which keys off `validSkillIds` membership plus the managed marker written into each generated skill dir (see Decision "Managed-marker invariant"). `ownership.ts` is only a glob-based path classifier (`PRISM_OWNED_GLOBS` / `CONSUMER_OWNED_GLOBS`); it holds no marker or delete logic.
- **Two guards, not one.** A new leftover-token guard (`/\$\{[A-Z][A-Z0-9_]*\}/`) runs in both PRISM and consumer mode. The existing Thrive-literal guard (`literal-guard.ts:24`) is a de-thriving canary — PRISM-build-only, never on consumer output (the consumer legitimately contains "Thrive").
- **Extracted fn is root-agnostic.** Each caller resolves absolute source/target paths and passes them in — removes the single-`repoRoot` read/write coupling.
- **Auto on every `prism:update`, no separate command** — parity with content projection.
- **Roster = all `prism-*`.** `seed-curation.json` is not the lever (it curates `.prism/` install-seed content, unrelated to personas).
- **Deliverable: ADR-0062** "Consumer skill distribution via prism:update." Cross-ref ADR-0030, 0032, 0057, 0059. Latest ADR on main is 0061; 0062 is next.
- **Managed-marker invariant — orphan cleanup is marker-keyed, and the consumer is safe.** Story 3 (consumer-authored skills never overwritten) is satisfied by the existing marker contract; verified against source.
  - **Root cause:** the concern was that a consumer's hand-placed `prism-*`-prefixed file could be clobbered on update. Tracing shows cleanup is gated on a marker file, not on the prefix.
  - **Where it actually lives:** `MANAGED_MARKER = ".ai-skill-generated"` (`utils.ts:12`), written into every generated skill dir for all opted-in platforms (`build.ts:1308-1313` Claude, `1323-1328` Codex, `1342-1347` Cursor). Agent files carry a generated header line instead of the marker file (`removeDeletedManagedAgentFiles`, `build.ts:1072-1112`).
  - **Cleanup predicate (the safety guarantee):** `removeDeletedManagedSkills` (`utils.ts:211-244`) deletes a candidate dir only when BOTH `!validSkillIds.has(name)` AND the marker file exists (`utils.ts:233-235` — `if (!(await pathExists(markerPath))) continue`). `removeDeletedManagedAgentFiles` mirrors this with a header-presence check (`build.ts:1101`). A `prism-*`-named file with NO marker is preserved. Cleanup is **marker-keyed (SAFE)**, not prefix-keyed.
  - **Alternatives considered:** key cleanup on the `prism-*` prefix alone (rejected — would clobber consumer-authored prefixed files); add a separate consumer-side allowlist (rejected — redundant; the marker already encodes "PRISM wrote this").
  - **Implementation guidance for Clove:** the extracted `generatePlatformSkills` MUST write `MANAGED_MARKER` into every generated skill dir exactly as the current loop does — the cleanup safety depends on the marker being present on everything PRISM generates. Do not skip the marker write in any platform branch. One narrow non-issue to be aware of, not fix: regeneration (`writeFileIfChanged`, `utils.ts:191-209`) overwrites on content-difference without a marker check, but it only ever writes to roster skill IDs, so a consumer's own-named file is never a write target. Add a test: a consumer fixture with a marker-less `prism-custom/SKILL.md` survives an update→cleanup cycle untouched.
- **Adopt-path seam — no shared seam today; lift platform-refresh into `runUpdate`.** The riskiest wiring question; resolved with a concrete relocation.
  - **Root cause:** `refreshPlatformDirs` (`update.ts:323-347`) is called only from `update.ts main()` (`update.ts:446`). `runAdopt` (`adopt.ts:111-127`) calls `runUpdate` directly (`adopt.ts:124`) and never enters update's `main()`. Result: `prism:adopt` does not refresh platform dirs at all today — a latent gap independent of this ticket, surfaced by it.
  - **Alternatives considered:** (a) duplicate the skill-gen call into both `update.ts main()` and `adopt.ts main()` — rejected, two call sites drift; (b) have `runAdopt` call update's `main()` instead of `runUpdate` — rejected, `main()` does CLI-arg parsing and process-level concerns that don't belong on the adopt path; (c) lift the platform-refresh + skill-gen step down into `runUpdate` so every caller of `runUpdate` gets it.
  - **Chosen approach:** (c). `runUpdate` is the one function both commands already share (`update.ts:445` from update's `main()`, `adopt.ts:124` from `runAdopt`). Putting the shared step there gives a single seam and fixes the latent adopt gap as a bonus.
  - **Implementation guidance for Clove:** this is a behavior change on the adopt path (intended — adopt now refreshes platform dirs and projects the roster) but must be output-identical on the update path. Add a test asserting the `prism:update` flow's output is unchanged, and a test asserting `prism:adopt` now projects the roster. Relocating the `tokenMap` resolution (`update.ts:442`) alongside the moved call may be needed since it currently lives in `main()`.

---

## History

- 2026-06-23 [hmcgrew/prism-242-consumer-skill-distribution]: Plan created. Branch and GitHub issue #242 opened. Architect decisions accepted. Mira (user stories) runs next.
- 2026-06-23 [hmcgrew/prism-242-consumer-skill-distribution]: Winston re-eval after user stories. Verified anchors against `origin/main`: corrected `syncOptionalSkillPayloads` range (340-386, was 340-372), pinned the cleanly-separable extraction boundary in task 2, and rewrote task 5 with the real wiring point. Added two Decisions — managed-marker invariant (cleanup is marker-keyed, consumer-safe) and adopt-path seam (lift platform-refresh into `runUpdate`). Verdict: ready for Clove. See Decisions.
- 2026-06-23 [hmcgrew/prism-242-consumer-skill-distribution]: Clove implemented tasks 1-6. Extracted `generatePlatformSkills` into `generate-skills.ts` (param-pure, root-agnostic); split the output guard (`runLeftoverTokenGuard`); wired the roster into the shared `runUpdate` seam so both `prism:update` and `prism:adopt` render it. PRISM build byte-identical (empty `git diff`); `prism:check` green; 349/349 tests pass. See Decisions for the cycle-break seam, the `applyFilePass` split, and the pre-existing seed-content blocker on the adopt path (flagged as a follow-up).

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

- [x] No critical or major issues
- [x] Types correct — no `any`, no unsafe `as`
- [x] No stray console.logs or debug artifacts
- [x] Tests written for new logic and edge cases
- [ ] All debugged issues resolved (no `open` entries) — none filed
- [x] Build passes — last run: 2026-06-23 (`pnpm prism:build` empty diff, `pnpm prism:check` green, 349/349 tests)
- [ ] PR description up to date — pending (no PR yet)
- [ ] Lasting decisions promoted to architect context (if applicable) — Eli owns task 7 (docs); promotion deferred to close

**Last updated:** 2026-06-23
