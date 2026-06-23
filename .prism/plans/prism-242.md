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
7. ✅ **Done (Clove).** Re-phrase the seed copy of ADR-0030 to match canonical's pattern-dodging prose so content-copy stops throwing on `${TOKEN}`. **Also fixed seed ADR-0032's `${TECH_STACK}` example literal** (same defect class, surfaced by the commissioned regression — see Decision "Seed ADR-0032"). **Target file:** `templates/install/.prism/spec/adrs/_toolkit/0030-token-substitution-at-build-time.md`. **The three lines that diverge from canonical (`.prism/spec/adrs/_toolkit/0030-token-substitution-at-build-time.md`) — make the seed identical to canonical at each:**
   - **Line 10** — replace ``PRISM ships per-team customization via tokens — `${TICKET_PREFIX}`, `${ORG}`, `${PROJECT}`, `${GITHUB_OWNER}`, etc. —`` with ``PRISM ships per-team customization via tokens — ticket-prefix, org, project, GitHub-owner, and friends, all written in the `${...}` form —`` (rest of the line is already identical).
   - **Line 12** — replace ``only `templates/install/AGENTS.md.tmpl` line 33 and `templates/install/.prism/SPEC.md.tmpl` carry actual `${TOKEN}` literals.`` with ``only `templates/install/AGENTS.md.tmpl` line 33 and `templates/install/.prism/SPEC.md.tmpl` carry actual `${...}` token literals.``
   - **Line 22** — replace ``substitutes `${TOKEN}` literals in assembled markdown`` with ``substitutes `${...}` token literals in assembled markdown``.
   - Two further canonical-vs-seed deltas exist (lines 28 and 43, the epic-plan cross-references). Leave those alone — they are intentional seed/canonical divergence (canonical references repo-internal plan paths consumers don't get) and they carry no token literal, so they don't throw. The fix is exactly the three token-literal lines above; do not re-sync the whole file.
   - **Why prose-rephrase, not the literal-guard or substituteTokens:** the throw is correct behavior. `${TOKEN}`/`${KEY}` are this ADR's illustrative examples, not real tokens — they're absent from every tokenMap by design. `substituteTokens` is deliberately fail-fast (ADR-0030, JSDoc at `scripts/ai-skills/lib/tokens.ts:178-186`); loosening it to tolerate unknown tokens would re-open the silent-passthrough hole the whole layer exists to close. The `${...}` form sidesteps the `[A-Z][A-Z0-9_]*` token pattern, exactly as canonical already does. **Do not** touch `tokens.ts`, the leftover-token guard, or `seed-curation.json`.
   - **Verify:** `pnpm prism:build` produces an empty `git diff` (the seed-curation skip means `writeSeedMirror` won't fight this hand-edit); `pnpm prism:check` green; then run a `prism:adopt` against a fixture consumer and confirm the content-copy step no longer throws and the roster projects end-to-end. Add/extend a test asserting `prism:adopt`'s content-copy completes over the seed `spec/` tree without an `Unknown token` throw.

### Eli (documentation)

8. Document the consumer skill-gen step in `.prism/architect/_toolkit/install-layout.md` (§ steady-state) and `skills-ecosystem.md` (two-guard model).

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
- **Adopt-path content-copy throw is a stale curated-seed defect — fold into #242, fix by prose-rephrasing the seed ADR (Winston ruling).** Clove surfaced this; Winston ruled root cause + scope + fix.
  - **Root cause (confirmed):** `prism:adopt` now reaches the content-copy step (the adopt-seam fix), which runs `substituteTokens` over every seeded `spec/` file. The seed copy of `0030-token-substitution-at-build-time.md` carries the ADR's own *example* token literals — `${TOKEN}` on lines 12 and 22 — in prose. `TOKEN` is not a real token (absent from every tokenMap by design), so `substituteTokens` correctly throws `Unknown token ${TOKEN}` (`scripts/ai-skills/lib/tokens.ts:192-197`). Canonical `0030` was rephrased to the pattern-dodging `${...}` form (which `/\$\{[A-Z][A-Z0-9_]*\}/` does not match); the seed copy never got that rephrase. Both files last changed in #155 and were already divergent then.
  - **Why the #234 auto-mirror didn't heal it (NOT a mirror bug):** ADR-0030 is in the `curated` list of `.ai-skills/definitions/seed-curation.json` (line 46). `writeSeedMirror` explicitly skips curated files (`build.ts:680` — `if (curatedSet.has(relPath)) continue`). Curated seed files are hand-maintained on purpose, so the mirror never regenerates this one. The mirror is working as designed; the defect is in the hand-curated seed content. `pnpm prism:build` will not fight the hand-edit (same skip).
  - **Blast radius (mirror implication):** none beyond this one file. Swept all of `templates/install/.prism/` for throwing literals — ~30 seed files carry `${TICKET_PREFIX}`/`${PROJECT}`/`${GITHUB_OWNER}`/etc., but those are *real* tokens that resolve at consumer-install time (correct, by ADR-0030's seed-ships-literals contract). `0030` is the only file carrying a non-resolvable *example* literal (`${TOKEN}`). `${TICKET_PREFIX}`/`${ORG}`/`${PROJECT}`/`${GITHUB_OWNER}` on seed line 10 are real tokens and wouldn't throw — but they'd wrongly substitute the consumer's values into an ADR *documenting* the token system, so the line-10 rephrase fixes a latent content-correctness bug too.
  - **Scope ruling — fold into #242, not a separate follow-up.** Two `followup-scope.md` signals point to same-scope: (1) #242 is what *activates* the throw — turning a latent silent gap into a loud break on the exact command (`prism:adopt`) this ticket wires up; shipping a feature that breaks the command it enables is not done. (2) Without the fix, #242's AC "`prism:adopt` projects the roster" cannot be demonstrated end-to-end — the fix is load-bearing for this ticket's own acceptance, not adjacent cleanup. Hunter's carve-out of "install-surface drift" as a separate lane was about cosmetic `.bak`/byte drift, not a hard throw that blocks an AC; this isn't that lane. The fix is one file, three prose lines — small, traceable to one decision, same persona (Clove). Filed as task 7.
  - **Alternatives considered:** (a) loosen `substituteTokens` to tolerate unknown tokens — rejected, re-opens the silent-passthrough hole the fail-fast layer exists to close (ADR-0030). (b) Fence the example literals — rejected, `substituteTokens` has no fence-awareness (it's a flat regex over the whole string; the JSDoc's "fenced code block" guidance assumes a consuming layer that treats fences as opaque, which this layer does not), so fencing wouldn't stop the throw; the `${...}` rephrase is what canonical actually uses. (c) Add the file to `excluded`/re-curate so content-copy skips it — rejected, the seed ADR should still ship to consumers; the defect is its content, not its presence. (d) Separate follow-up ticket — rejected per the scope ruling above.
  - **Chosen approach:** prose-rephrase the three diverging token-literal lines in the seed copy to match canonical's `${...}` form. Fixes the root cause (the throwing literal) at the source, matches the established canonical pattern, touches nothing in the substitution engine.
  - **Implementation guidance for Clove:** see task 7 — exact three line replacements, the two intentional-divergence lines (28, 43) to leave alone, and the verify path (empty `git diff` on build, `prism:check` green, `prism:adopt` content-copy completes without throw + roster projects). Do not touch `tokens.ts`, the leftover-token guard, or `seed-curation.json`.
  - → no promotion needed (ticket-tactical seed-content fix; the durable rule it relies on — seed ADRs must dodge the token pattern with `${...}` rather than carry bare `${UPPER_SNAKE}` example literals — already lives in ADR-0030's JSDoc and the curated-seed contract).
- **Seed ADR-0032 carries the same throwing-literal defect as 0030 — folded into task 7 (Clove).** The regression test task 7 commissioned (content-copy over the real seed `spec/` tree) surfaced a second throwing file Winston's `${TOKEN}`-only sweep missed.
  - **Root cause:** seed `templates/install/.prism/spec/adrs/_toolkit/0032-canonical-skill-content-is-generic.md` line 18 carries the example literal `${TECH_STACK}` in prose. `TECH_STACK` is not a real token (absent from `tokens.ts`, the schema, and `parameterization.md`), so `substituteTokens` correctly throws on the adopt content-copy path — identical defect class to 0030. Canonical `0032` line 18 was already rephrased away from the bare literal; the seed copy never got the rephrase (same divergence shape as 0030).
  - **Blast radius (now exhaustive):** a full sweep of the seed `spec/` tree for bare `${UPPER_SNAKE}` literals returns only `${GITHUB_OWNER}`, `${PROJECT_LOWERCASE}`, `${PROJECT}` (all real tokens, resolve fine) and `${TECH_STACK}` (the one example literal). With 0030 and 0032 fixed, zero throwing literals remain in the seed `spec/` tree — verified by the new regression passing over the real tree.
  - **Why folded, not routed back:** same load-bearing argument Winston used for 0030 — the adopt AC ("content-copy completes without throwing") cannot pass while 0032 throws, and the fix is the same one-line prose rephrase to match canonical. The find came from the test Winston explicitly commissioned; his "0030 only" was a sweep finding the commissioned test empirically falsified. Documented here rather than absorbed silently, per `branch-plan.md` (silent scope edits are the failure mode).
  - **Chosen approach:** rephrase seed `0032` line 18 to match canonical verbatim (`Substituting a tech-stack identifier into prose is meaningless when the surrounding paragraph assumes the reader is on that stack.`). Touches nothing in the substitution engine.
  - → no promotion needed (same ticket-tactical seed-content class as the 0030 fix; relies on the same durable rule already in ADR-0030's JSDoc).
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
- 2026-06-23 [hmcgrew/prism-242-consumer-skill-distribution]: Clove implemented tasks 1-6. Extracted `generatePlatformSkills` into `generate-skills.ts` (param-pure, root-agnostic); split the output guard (`runLeftoverTokenGuard`); wired the roster into the shared `runUpdate` seam so both `prism:update` and `prism:adopt` render it. PRISM build byte-identical (empty `git diff`); `prism:check` green; 349/349 tests pass. See Decisions for the cycle-break seam, the `applyFilePass` split, and the adopt-path content-copy throw (ruled below).
- 2026-06-23 [hmcgrew/prism-242-consumer-skill-distribution]: Winston ruled the adopt-path throw. Confirmed root cause — stale curated seed copy of ADR-0030 carries the `${TOKEN}` example literal that `substituteTokens` correctly rejects; #234 mirror skips it because it's curated (not a mirror bug; blast radius one file). Ruled fold-in (the throw blocks #242's own adopt AC) and prescribed a three-line prose rephrase to match canonical's `${...}` form (task 7). See Decision: Adopt-path content-copy throw.
- 2026-06-23 [hmcgrew/prism-242-consumer-skill-distribution]: Clove completed task 7 — rephrased the three diverging token-literal lines in seed ADR-0030 to canonical's `${...}` form. The commissioned regression (content-copy over the real seed `spec/` tree) then surfaced seed ADR-0032's `${TECH_STACK}` example literal throwing the same way; folded that one-line rephrase in too (see Decision: Seed ADR-0032). Adopt AC now demonstrable end-to-end — `prism:adopt` on a consumer fixture completed with no throw and projected 31 `prism-*` skills with the consumer's tokens substituted; build empty diff, `prism:check` green, 350/350 tests.
- 2026-06-23 [hmcgrew/prism-242-consumer-skill-distribution]: Eli completed task 8 — documented the consumer skill-gen step in `install-layout.md` (§ Steady-state persona-skill distribution: what renders, with whose tokens, orphan cleanup, and idempotency) and the two-guard model in `skills-ecosystem.md` (§ Output guards: leftover-token guard runs everywhere; Thrive-literal guard is PRISM-build-only). Added three allowlist entries for the platform copies of `skills-ecosystem.md` (the "Output guards" section must name "Thrive" to explain what the guard checks for). `prism:check` green after build; 350/350 tests.

---

## Debugged Issues

<!-- Sasha fills this section as needed. -->

---

## Review Issues

<!-- Briar / Eric fill this section during review. -->

---

## Acceptance Criteria

### Behavioral

- [x] Given an onboarded consumer repo, When `prism:update`/`prism:adopt` runs, Then the `prism-*` roster appears in the consumer's skill dirs with the consumer's name/prefix rendered in bodies. Demonstrated end-to-end 2026-06-23: `prism:adopt` on a fixture consumer (org AcmeCorp / prefix ACME) projected 31 `prism-*` skills with `ACME-NNNN` rendered, no throw, no unresolved `${}` leak.
- [ ] Given a persona is dropped from the roster, When the consumer runs `prism:update`, Then the orphaned persona is removed from the consumer's skill dirs.
- [ ] Given a consumer-authored (non-`prism-*`) skill, When `prism:update` runs, Then it is left untouched.
- [ ] Given `prism:update` has already run, When it runs again with no upstream change, Then it is a no-op (idempotent).

### Non-behavioral

- [x] PRISM's own build output is byte-identical after the refactor (no `git diff`). Re-confirmed after task 7 — `pnpm prism:build` left generated output unchanged; only the three source edits appear in the diff.
- [x] No unresolved `${}` tokens survive in any rendered output. Verified in the adopt demo — the roster output carried zero bare `${UPPER_SNAKE}` literals.
- [x] `prism:check` passes — last run 2026-06-23 (build --check, type-check, 350/350 tests, manifest verify, crossref-lint all green).

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
- [x] Build passes — last run: 2026-06-23 (`pnpm prism:build` empty diff, `pnpm prism:check` green, 350/350 tests — +1 adopt-seed regression)
- [ ] PR description up to date — pending (no PR yet)
- [ ] Lasting decisions promoted to architect context (if applicable) — Eli owns task 7 (docs); promotion deferred to close

**Last updated:** 2026-06-23
