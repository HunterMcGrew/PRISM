# Plan: prism-248

## Ticket

https://github.com/HunterMcGrew/PRISM/issues/248

## Goal

Publish PRISM to npm as `@huntermcgrew/prism` so external teams run `npx @huntermcgrew/prism adopt` instead of needing a checkout.

---

## User Stories

Not applicable — this is a packaging and distribution ticket, not a user-facing feature.

---

## Design

Not applicable.

---

## Implementation Tasks

Added by Winston.

Tasks are front-loaded per `.prism/rules/implementation-task-detail.md`. The leak-audit verification (`npm pack` + `tar tzf`) lives in Clove's lane as an explicit gate. Sequence matters: dist build (task 1) → path-math fix (task 2) → `files` allowlist + pack-verify gate (task 5) → publish (task 8, `[HITL]`) → end-to-end smoke (task 9).

### Clove (implementation)

1. **Add esbuild compile step for the runtime → `dist/cli.js`.**
   - **Why esbuild over tsc:** single-file bundle, no runtime relative-import resolution, smallest tarball, tree-shaken. tsc would preserve the `scripts/ai-skills/` depth (making the `../..` path-math "just work") but ships a multi-file tree and no tree-shaking. esbuild wins; the depth-shift it introduces is handled in task 3.
   - Add `esbuild` to `devDependencies` in `package.json` (run `pnpm add -D esbuild`).
   - Create `scripts/ai-skills/bundle.ts` — an esbuild build script that bundles `scripts/ai-skills/cli.ts` to `dist/cli.js` with config: `format: "esm"`, `platform: "node"`, `target: "node20"`, `bundle: true`, `banner: { js: "#!/usr/bin/env node" }`, `outfile: "dist/cli.js"`. Mark Node built-ins external implicitly (platform node handles this); do NOT bundle `.prism/` content (it is read at runtime as files, not imported).
   - After bundling, `chmod +x dist/cli.js` so the bin is executable.
   - **Verification:** `pnpm exec tsx scripts/ai-skills/bundle.ts && node dist/cli.js` prints the CLI usage banner (no `tsx` involved).

2. **Make package-root resolution robust to the compiled location (the load-bearing path-math fix).** [after task 1]
   - **Root cause:** `resolveSelfPrismSource()` in `scripts/ai-skills/update.ts:557-560` resolves the package root as `path.resolve(path.dirname(thisFile), "..", "..")` — correct from `<root>/scripts/ai-skills/update.ts`, but WRONG from a bundled `<root>/dist/cli.js` (where `../..` overshoots to the parent of the package root).
   - **Change:** replace the hardcoded `../..` walk with a package-root finder that walks UP from `import.meta.url` until it finds the directory containing a `package.json` whose `name` is `@huntermcgrew/prism`. Add a helper `findPrismPackageRoot(startFile: string): string` near `resolveSelfPrismSource`. This keeps the dev path (`tsx scripts/ai-skills/update.ts`) and the shipped path (`node dist/cli.js`) BOTH correct — the dev path finds the same root by walking up past `scripts/ai-skills/`, the shipped path finds it by walking up past `dist/`.
   - `resolveSelfPrismSource` then returns `findPrismPackageRoot(fileURLToPath(import.meta.url))`.
   - **Verification:** `pnpm run prism:test` (existing tests exercise `resolveSelfPrismSource`); then the task-5 packed-tarball smoke test confirms it end-to-end from `node_modules`.

3. **Confirm esbuild preserves `import.meta.url` semantics in the bundle.** [after task 1, parallel with task 2]
   - esbuild can rewrite `import.meta.url`; with `format: "esm"` + `platform: "node"` it preserves it as the runtime module URL (correct). Verify, do not assume.
   - **Verification:** add a one-off check — `node -e "import('./dist/cli.js')"` is not enough; instead confirm via the task-5 smoke test that `findPrismPackageRoot` (task 2) resolves the real package root when running `node dist/cli.js` from inside an installed `node_modules/@huntermcgrew/prism/`. If `import.meta.url` is mangled to a bundler-internal value, switch the esbuild config to keep it: set `define` is not needed; if rewrite occurs, fall back to `format: "esm"` with an explicit `--keep-names` is unrelated — the correct lever is leaving `import.meta` untouched (default for esm/node). Document the verified-correct config in `bundle.ts` as a JSDoc note (what + why per code-comments rule).

4. **Repoint `bin` and add publish lifecycle scripts in `package.json`.** [after task 1]
   - Change `bin` from `{ "prism": "scripts/ai-skills/cli.ts" }` to `{ "prism": "dist/cli.js" }`.
   - Add to `scripts`: `"prism:bundle": "tsx scripts/ai-skills/bundle.ts"`.
   - Add `"prepublishOnly": "pnpm run prism:bundle && pnpm run prism:build && pnpm run prism:check"` — bundle first (so `dist/` is fresh in the tarball), then build + check (a stale/broken roster must never publish, per locked Decision).
   - Add a `"prepack"` step that generates `.prism/.sync-manifest.json` so it lands in the tarball: `"prepack": "tsx scripts/ai-skills/bundle.ts"` is insufficient — the sync-manifest is written by `build.ts` in build mode. Confirm `pnpm run prism:build` emits `.prism/.sync-manifest.json`; if it does, `prepublishOnly` already covers manifest generation and no separate `prepack` is needed. If `prism:build` does NOT emit it, add a `prepack` that runs whatever emits the manifest. **Resolve by reading `scripts/ai-skills/build.ts` around the `.sync-manifest.json` write (~lines 888-899) before wiring this.**
   - **Verification:** `pnpm run prism:check` passes; `cat package.json` shows `bin` → `dist/cli.js`.

5. **Add the `files` allowlist + run the leak-audit pack-verify gate.** [after tasks 1-4]
   - Add to `package.json` the `files` array EXACTLY:
     ```json
     "files": [
       "dist/",
       ".prism/rules/",
       ".prism/architect/",
       ".prism/spec/",
       ".prism/references/",
       ".prism/templates/",
       ".prism/SPEC.md",
       ".prism/.sync-manifest.json",
       "templates/install/",
       ".ai-skills/skills/",
       ".ai-skills/definitions/roles.json",
       ".ai-skills/definitions/paths.json",
       ".ai-skills/config.json"
     ]
     ```
   - **Do NOT include `scripts/`** — it is build-time only once `dist/` exists (locked Decision: bundle the code, ship `dist/`). `package.json`, `README.md`, `LICENSE` ship automatically.
   - **The leak-audit gate (non-negotiable, before any publish):**
     ```bash
     npm pack --dry-run
     npm pack                 # produces huntermcgrew-prism-<version>.tgz
     tar tzf huntermcgrew-prism-*.tgz | sort > /tmp/prism-tarball-contents.txt
     # Assert ZERO operational-tree paths leak:
     grep -E 'prism/(plans|audits|retros|prds|changelogs|archived)/|prism/lessons\.md|conductor-state|audit-state\.json' /tmp/prism-tarball-contents.txt && echo "LEAK DETECTED — STOP" || echo "CLEAN — no operational tree in tarball"
     ```
   - The `grep` must print `CLEAN — no operational tree in tarball`. If it prints `LEAK DETECTED`, stop and do not proceed.
   - **Verification:** the grep prints CLEAN; `tar tzf` output reviewed; the contents list is the artifact a human reviews before task 8.

6. **package.json publish-identity prep.** [parallel with task 5]
   - Remove the `"private": true` line entirely.
   - Change `"name": "prism"` to `"name": "@huntermcgrew/prism"`.
   - Add `"author": "Hunter McGrew"` (currently absent).
   - Add `"repository": { "type": "git", "url": "git+https://github.com/HunterMcGrew/PRISM.git" }` (currently absent).
   - Add `"publishConfig": { "access": "public" }` so the scoped package publishes public without relying on the `--access public` flag alone (belt-and-suspenders; the flag still gets passed in task 8).
   - **Verification:** `cat package.json` shows no `private` field, name `@huntermcgrew/prism`, author + repository populated.

7. **Optional defensive short-circuit in `resolveConsumerRoot`** (call out as OPTIONAL — not a blocker). [parallel]
   - In `scripts/ai-skills/lib/consumer-root.ts`, add an explicit "running as an installed dependency → target cwd" short-circuit: when the running module's real path is inside a `node_modules/` segment, resolve the consumer root to `process.cwd()` directly and skip the vendored-PRISM `git rev-parse --show-toplevel` retarget. This is defensive only — from `node_modules`, `cwd !== selfPrismRoot` already means the vendored retarget never fires, so this is hardening, not a fix.
   - **Skip this task if time-constrained** — it changes no observable behavior. If implemented, verify existing `consumer-root` tests still pass: `pnpm run prism:test`.

8. **[HITL] Hunter runs the publish — preceded by two manual verify gates.** [after tasks 1-6; task 7 optional]
   - **Blocking inputs (Hunter only):**
     - **Gate A — scope/username availability:** confirm `@huntermcgrew` npm scope and username are available/owned: `npm view @huntermcgrew/prism` should 404 (not yet published); `npm whoami` confirms auth. If the scope isn't yours, publish will fail.
     - **Gate B — human reviews `/tmp/prism-tarball-contents.txt`** (from task 5) and confirms no operational tree. Versions are immutable; this is the last gate.
   - **Publish:** `npm publish --access public`. Auth-gated (npm 2FA likely) — Hunter executes; agents do not run this command.
   - **Verification:** `npm view @huntermcgrew/prism` returns the published version; a scratch-dir `npm install @huntermcgrew/prism && npx @huntermcgrew/prism adopt` (run from an empty consumer repo) projects the full persona roster.

9. **Post-publish end-to-end smoke (the functional gate that the path-math fix actually worked).** [after task 8]
   - In a fresh scratch directory: `npm install @huntermcgrew/prism`, then `npx @huntermcgrew/prism adopt` from a throwaway consumer repo root. Confirm the persona roster projects into `.ai-skills/skills/` and `.prism/` is seeded — this is the test that `findPrismPackageRoot` (task 2) resolved correctly from real `node_modules`, npm AND pnpm.
   - Repeat with `pnpm add @huntermcgrew/prism` to confirm the pnpm `.pnpm`-store realpath resolves (spike-proven, but verify against the published artifact, not the spike's local tarball).
   - **Verification:** both npm and pnpm installs complete adopt without error; `.ai-skills/skills/` is populated.

### Eli (documentation)

1. **Restructure `docs/adopt-prism.md` to lead npx-first.** [after task 8 — doc the published command]
   - Currently leads with the vendored-checkout model. Restructure so the FIRST and RECOMMENDED method is `npx @huntermcgrew/prism adopt`, front and center, with a one-line "this is the recommended way to adopt PRISM."
   - Demote the three checkout models (vendored #247, global-link #245, `--consumer`/cwd) to a secondary "Alternative install methods (air-gapped, customization, contributors)" section.
   - Add the pin-vs-latest guidance per locked Decision: recommend pinning (`npx @huntermcgrew/prism@<version> adopt`) for reproducibility, note `@latest` is available for those who prefer it; explain versions are immutable.
   - **Verification:** content-only, no build effect. Confirm the npx command string matches the published package name exactly (`@huntermcgrew/prism`).

2. **Create the maintainer-facing publishing doc** at `docs/publishing-prism.md` (new file). [after task 8 — doc the proven ritual]
   - Cover the release ritual in order: (1) version bump in `package.json`; (2) `pnpm run prism:check` green; (3) the leak-audit ritual — `npm pack` + `tar tzf` + the operational-tree grep from Clove task 5, with the exact grep command; (4) human review of the tarball contents; (5) `npm publish --access public`.
   - Emphasize the immutability constraint: npm versions cannot be overwritten, unpublish is restricted to 72h and discouraged — get the allowlist right before the first publish.
   - Document the two pre-publish gates (scope availability, tarball human-review) as a checklist.
   - **Verification:** content-only. Confirm the grep command in the doc matches the one Clove implemented in task 5 (cite, don't drift).

---

## Decisions

These are locked — do not relitigate. Each bullet is a do-not-undo.

- **Registry: public.** External teams are the target audience; private registry adds friction with zero security benefit for a tool distributed to external consumers.
- **Package name: `@huntermcgrew/prism`.** `prism` unscoped is taken at v4.1.2; scope is mandatory. Consumer command: `npx @huntermcgrew/prism adopt`.
- **Version posture: support both pinned and latest; recommend pin.** Versions are immutable on npm; recommending pin protects consumers from unintended updates while still allowing latest for users who prefer it.
- **Coexistence: npm becomes primary for external consumers; the three checkout models (vendored #247, global-link #245, `--consumer`/cwd) demote to documented alternatives.** The existing `resolvePrismSource` priority chain makes this free — no code changes needed for the demotion.
- **Docs framing: `docs/adopt-prism.md` leads with `npx @huntermcgrew/prism adopt` as the recommended method, front and center.** Currently leads with vendored. Checkout/CLI methods become secondary "if you want them" alternatives for air-gapped/customization/contributor cases.
- **Spike proved: content tree resolves from `node_modules` for both npm and pnpm.** `import.meta.url` yields the realpath at the package root; an installed 1.4 MB / 670-file tarball projected the full 31-persona roster end-to-end. pnpm symlink risk did not materialize (realpath lands in `.pnpm` store at the same depth). The build is mechanical from here.
- **Compiled-JS dist step is required.** `bin` currently runs `cli.ts` via `#!/usr/bin/env -S npx tsx`; `tsx` is a devDependency that won't ship in the tarball. Compile `scripts/ai-skills/` to `dist/` (esbuild or tsc); point `bin` at `dist/cli.js` with a `node` shebang. Bundle the code; do NOT inline the content tree — `.prism/` etc. stay as shipped files read at runtime.
- **`files` allowlist must exclude the operational tree.** Public npm is world-readable and effectively permanent. 67 files under `.prism/` reference internal client names and dev history (plans/, lessons.md, audits/, retros/, conductor-state*.json). The allowlist ships only runtime-distributable content (rules, architect, spec, templates, skill defs). First-publish gate: verify via `npm pack` + `tar tzf` before any publish.
- **`prepublishOnly` runs `prism:build` + `prism:check`.** A stale or broken roster must never publish.
- **Hunter runs `npm publish --access public`.** Auth-gated (npm 2FA likely). Agents set up and verify; human executes the publish command. Versions are immutable — get the allowlist right before the first publish.
- **`.sync-manifest.json` interaction.** File is gitignored but `update` reads `prismVersion`/`sourceCommit` from it. `files` operates on the working tree, so it ships if generated first. Non-obvious; worth a test during Winston's plan.
- **`@huntermcgrew` scope/npm-username availability.** Confirm before first publish.

### Winston planning decisions (2026-06-23)

- **Build tool: esbuild single-file bundle, not tsc.**
  - **Root cause / context:** the bin must run on `node`, not `tsx` (devDependency). Need compiled JS in the tarball.
  - **Alternatives considered:** tsc multi-file emit (preserves `scripts/ai-skills/` depth so `../..` path-math "just works", but ships a multi-file tree, resolves relative imports at runtime, no tree-shaking); esbuild single bundle.
  - **Chosen approach:** esbuild single `dist/cli.js`. Smallest tarball, no runtime import resolution. Cost: the bundle changes the running module's location, so the package-root resolution must be made robust (see next decision). One-line testable concern vs. ongoing multi-file surface — esbuild wins.
  - **Implementation guidance:** `format: esm`, `platform: node`, `target: node20`, `banner` injects `#!/usr/bin/env node`. Do NOT bundle `.prism/` content — it is read as files at runtime.
  - → promoted to ADR-pending (see Architect Context Updates) — packaging decision generalizes to any future dist target.

- **Package-root resolution must walk up to the `package.json` named `@huntermcgrew/prism`, not hardcode `../..`.**
  - **Root cause:** `resolveSelfPrismSource` (`update.ts:557`) hardcodes `path.resolve(dirname, "..", "..")`, coupled to the `scripts/ai-skills/` depth. A bundled `dist/cli.js` sits at depth 1, so `../..` overshoots the package root and the runtime resolves `.prism/` to the WRONG directory — and this fails for consumers only, passing every local `tsx`-based test.
  - **Alternatives considered:** keep `../..` and force the dist layout to depth 2 (`dist/ai-skills/cli.js`); patch the literal per-entry; walk up to the named `package.json`.
  - **Chosen approach:** `findPrismPackageRoot(startFile)` walks up to the dir whose `package.json` has `name: @huntermcgrew/prism`. Keeps the dev path (`tsx scripts/...`) and shipped path (`node dist/cli.js`) both correct without depth assumptions.
  - **Implementation guidance:** Clove task 2. Verified end-to-end by the packed-tarball smoke test (Clove task 9), not just unit tests — the failure mode is invisible to local `tsx` runs.
  - → promoted to ADR-pending — this is a load-bearing runtime invariant future packaging work must preserve.

- **`files` is an inclusion allowlist; the operational tree is excluded by construction, not enumeration.**
  - **Root cause:** the leak-audit safety property. npm `files` ships only what's named; anything unnamed never ships. The audit therefore does not depend on hand-finding every one of the ~24 client-name files — it depends on shipping only the directories the runtime provably reads.
  - **Leak-audit finding:** the runtime reads a known-closed set (`.prism/{rules,architect,spec,references,templates}`, `SPEC.md`, `.sync-manifest.json`; `templates/install/`; `.ai-skills/skills/`; `.ai-skills/definitions/{roles,paths}.json`; `.ai-skills/config.json`; `dist/`). The sensitive `TracTru` client name + `THR-NNNN` history lives ONLY in the operational tree (`plans/`, `lessons.md`, `audits/`, `retros/`, `prds/`, `changelogs/`, `archived/`, `conductor-state*.json`, `audit-state.json`) — all confirmed NOT-READ by the runtime trace. None is named in `files`.
  - **Chosen approach:** inclusion allowlist + `npm pack` / `tar tzf` grep gate asserting zero operational-tree paths before the immutable publish.
  - → promoted to ADR-pending — the leak-audit ritual is a durable publish invariant.

- **`Thrive`/`TracTru` strings in shipped `spec`/`architect`/`references`/`rules`/`skills` are provenance, not leak — they ship intentionally.**
  - **Context:** ADR origin-citations ("backports Thrive PR #1970"), the de-thriving guard's self-documentation (must name the literal it scans for), config-default provenance notes. The team's own `.ai-skills/definitions/literal-allowlist.json` already rules these legitimate-to-ship as "frozen incident citations."
  - **Chosen approach:** ship them. They describe PRISM's extraction history honestly; they are not customer data. The pack-verify grep targets the operational-tree PATHS, not the `Thrive` STRING, precisely because the string legitimately appears in shipped provenance.
  - → no promotion needed (documented here + already codified in `literal-allowlist.json`; ticket-local rationale for the audit).

- **Ship `dist/` only; exclude `scripts/`.**
  - **Root cause:** once `dist/cli.js` is the bin, `scripts/` is build-time only. Shipping both re-introduces a second runtime path and bloats the tarball for no benefit.
  - **Alternatives considered:** ship `scripts/` too as a tsx fallback / source-of-truth.
  - **Chosen approach:** `dist/` only. Rejected the fallback — it doubles the runtime surface and the source is on GitHub for anyone who wants it.
  - → no promotion needed (ticket-tactical packaging choice).

- **`.prism/.sync-manifest.json` ships, generated pre-pack; absence degrades gracefully.**
  - **Context:** the file is gitignored. `update` reads `prismVersion`/`sourceCommit` from the package's copy; absent → falls back to `0.0.0`/`unknown` (functionally fine, loses accurate version reporting in consumer manifests). `files` operates on the working tree, so it ships only if generated before pack.
  - **Chosen approach:** `prepublishOnly`'s `prism:build` emits it (verify against `build.ts` ~888-899 before wiring; add a `prepack` only if build doesn't emit it). Named in `files` so it lands in the tarball.
  - → no promotion needed (covered by the publishing doc, Eli task 2).

---

## History

- 2026-06-23 [hmcgrew/prism-248-npm-publish]: Plan created. Issue #248 opened. Branch created from origin/main. Locked decisions recorded from handoff brief; Winston plan and Clove implementation pending.
- 2026-06-23 [hmcgrew/prism-248-npm-publish]: Winston built Implementation Tasks (Clove 9, Eli 2) and ran the leak audit. Audit cleared: inclusion `files` allowlist excludes the operational tree by construction; client name lives only in NOT-READ dirs; Thrive/TracTru in shipped spec/architect is provenance (per literal-allowlist.json), not leak. See Decision: package-root resolution + esbuild bundle.
- 2026-06-23 [hmcgrew/prism-248-npm-publish]: Clove completed tasks 1–7. esbuild bundle produces dist/cli.js (node shebang, no tsx); findPrismPackageRoot walks up to named package.json replacing hardcoded ../.. depth; package.json renamed to @huntermcgrew/prism with files allowlist, publishConfig, prepublishOnly; leak-audit grep confirmed CLEAN (448 files, 0 operational-tree paths); node_modules short-circuit added to resolveConsumerRoot (task 7, implemented). All 365 tests pass; prism:check green. Tarball-contents listing at /tmp/prism-tarball-contents.txt for human review before task 8.
- 2026-06-23 [hmcgrew/prism-248-npm-publish]: Eli completed tasks 1–2. docs/adopt-prism.md restructured to lead npx-first with pin-vs-latest guidance; vendored/global-link/--consumer models demoted to "Alternative install methods." docs/publishing-prism.md created covering the full release ritual: version bump → prism:check → leak audit (exact grep from Clove task 5) → tarball human review → npm publish; immutability constraint, unpublish policy, and pnpm onlyBuiltDependencies noted.

---

## Debugged Issues

None yet.

---

## Review Issues

None yet.

---

## Acceptance Criteria

### Behavioral

- [ ] Given the package is installed via `npm install @huntermcgrew/prism`,
      When `npx @huntermcgrew/prism adopt` is run from a consumer repo,
      Then the full persona roster (31 skills) is projected into the consumer repo's `.ai-skills/skills/` directory.

- [ ] Given the package is installed via `pnpm add @huntermcgrew/prism`,
      When `npx @huntermcgrew/prism adopt` is run from a consumer repo,
      Then the full persona roster is projected correctly (pnpm symlink / realpath resolved).

- [ ] Given the published package tarball (`npm pack` output),
      When `tar tzf <tarball>` lists all included files,
      Then no file from the operational tree is present (`plans/`, `lessons.md`, `audits/`, `retros/`, `conductor-state*.json`).

- [ ] Given `npm pack` runs in the repo root,
      When the tarball is inspected,
      Then only runtime-distributable content is present: rules, architect docs, spec, templates, skill definitions, compiled `dist/cli.js`.

- [ ] Given a consumer runs `npx @huntermcgrew/prism adopt` (no local install),
      When the command executes,
      Then `dist/cli.js` runs via the `node` shebang (not `tsx`) and the adopt flow completes without error.

- [ ] Given the package is installed into `node_modules` (npm or pnpm),
      When `npx @huntermcgrew/prism adopt` runs the compiled `dist/cli.js`,
      Then the runtime resolves its own content tree (`.prism/`, `.ai-skills/skills/`) from the installed package root — not the parent directory — and the persona roster projects correctly (REQ-2: package-root resolution survives the compiled-location depth-shift).

- [ ] Given the published tarball,
      When `tar tzf <tarball>` lists included files,
      Then ADR/architect provenance files referencing PRISM's extraction history are present (these ship intentionally as frozen incident citations) while the operational tree carrying internal client names is absent (REQ-3: provenance ships, client dev-history does not).

### Non-behavioral

- [ ] `bin` field in `package.json` points to `dist/cli.js` (compiled JS with `node` shebang), not `scripts/ai-skills/cli.ts`.
- [ ] `package.json` has no `"private": true` field.
- [ ] `package.json` `name` is `@huntermcgrew/prism`.
- [ ] `package.json` `author` and `repository` fields are filled (currently null).
- [ ] `prepublishOnly` script runs `prism:build` + `prism:check` — a broken roster cannot publish.
- [ ] `npm pack` completes without error on a clean build; `tar tzf` output has been reviewed by a human before first publish.
- [ ] `docs/adopt-prism.md` leads with `npx @huntermcgrew/prism adopt` as the recommended method; checkout/CLI models are documented as secondary alternatives.
- [ ] A maintainer-facing publishing doc exists covering: build → version bump → `npm publish --access public`; the immutability/leak-audit ritual.
- [ ] `package.json` `files` array excludes `scripts/` (build-time only once `dist/` ships) and names only runtime-distributable content (REQ-3).
- [ ] `package.json` has `publishConfig.access: "public"` so the scoped package publishes public.
- [ ] The leak-audit grep over `tar tzf` output prints CLEAN (zero operational-tree paths) and the result is reviewed by a human before the first publish (REQ-3).

### AC Sync Log

| Date | Agent | Action | Plan | Linear |
| ---- | ----- | ------ | ---- | ------ |
| 2026-06-23 | Nora | Seeded AC from locked decisions and handoff brief | created | N/A (GitHub issue) |
| 2026-06-23 | Winston | Refined AC: added package-root depth-shift + provenance-vs-leak behavioral criteria; added publishConfig + files-excludes-scripts non-behavioral; ran leak audit (inclusion-allowlist, operational tree excluded by construction) | updated | N/A (GitHub issue) |

---

## Architect Context Updates

If this approach ships, promote at plan close (per branch-plan § Before Closing):

- **New ADR — "npm publish packaging: dist bundle + inclusion allowlist + leak-audit ritual."** Captures three durable invariants future packaging work must preserve: (1) the runtime resolves its content tree by walking up to the `@huntermcgrew/prism` `package.json`, not by a hardcoded depth — any new dist target must keep this; (2) `files` is an inclusion allowlist and the leak-audit `tar tzf` grep gate runs before every publish (npm versions are immutable); (3) the `dist/cli.js` `node` shebang replaces the `tsx` dev runtime. The esbuild-over-tsc rationale belongs here too.
- **`.prism/architect/_toolkit/skills-ecosystem.md`** — add a short "Distribution: npm" note alongside the existing distribution/build content, pointing at the new ADR and the publishing doc. The de-thriving guard section there already documents why Thrive/TracTru provenance ships legitimately; cross-reference it from the leak-audit ADR rather than restating.

## Cleanup Items

None yet.

---

## PR Readiness

- [x] No critical or major issues
- [x] Types correct — no `any`, no unsafe `as`
- [x] No stray console.logs or debug artifacts
- [x] Tests written for new logic and edge cases (findPrismPackageRoot coverage via 365 passing tests)
- [x] All debugged issues resolved (no `open` entries)
- [x] Build passes — last run: 2026-06-23 (prism:check green, all 365 tests pass)
- [ ] PR description up to date — pending (offer to Hunter)
- [ ] Lasting decisions promoted to architect context — pending plan close (post task 8 publish)

**Last updated:** 2026-06-23
