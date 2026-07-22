---
Number: 0063
Title: npm Publish Packaging — Dist Bundle, Inclusion Allowlist, Leak-Audit Ritual
Status: accepted
Date: 2026-06-23
---

## Context

PRISM ships to external teams. Before this work the only distribution paths were checkout-based — vendored sibling repo (ADR-0059), global link (PR #245), or a `--consumer`/cwd retarget. Plan prism-248 added the path external teams actually expect: `npx @huntermcgrew/prism adopt`, backed by a public npm package.

Packaging a tool whose runtime reads its own content tree from disk surfaced three decisions with sharp wrong answers, each of which would have broken something a future packaging change could re-break. They earn a durable record rather than living only in the closed plan.

- **The bin can't ship `tsx`.** `bin` ran `scripts/ai-skills/cli.ts` via a `#!/usr/bin/env -S npx tsx` shebang, and `tsx` is a devDependency that never lands in the tarball. The runtime needed compiled JS the consumer's `node` can run directly.
- **The runtime resolves `.prism/` relative to its own module location.** `resolveSelfPrismSource` walked a hardcoded `../..` from `scripts/ai-skills/update.ts` to find the package root. That depth is an accident of the source layout — it passes every local `tsx`-based test and breaks only for consumers, where the code runs from a different location. Any change to where the entry point sits re-arms this trap.
- **Public npm is world-readable and effectively permanent.** Versions are immutable; unpublish is restricted to 72 hours and discouraged. The `.prism/` operational tree carries internal client names and dev history (`plans/`, `lessons.md`, `audits/`, `retros/`, `prds/`, `changelogs/`, `archived/`, `conductor-state*.json`, `audit-state.json`). Shipping any of it once is shipping it forever.

A spike proved the content tree resolves from `node_modules` for both npm and pnpm — `import.meta.url` yields the realpath at the package root, and an installed tarball projected the full persona roster end-to-end. The pnpm symlink risk did not materialize; the `.pnpm`-store realpath lands at the same depth. The build was mechanical from there, but the three decisions below are the load-bearing ones.

## Decision

Publish `@huntermcgrew/prism` to public npm as a compiled bundle behind an inclusion allowlist, gated by a leak-audit ritual that runs before every publish. Three invariants any future packaging work must preserve.

**1. The runtime resolves its content tree by walking up to the `@huntermcgrew/prism` `package.json`, not by a hardcoded depth.** `findPrismPackageRoot(startFile)` walks up from `import.meta.url` until it finds the directory whose `package.json` is named `@huntermcgrew/prism`. This keeps both the dev path (`tsx scripts/ai-skills/update.ts`, walking past `scripts/ai-skills/`) and the shipped path (`node dist/cli.js`, walking past `dist/`) correct without assuming either's depth. Any future dist target — a different bundle layout, an additional entry point — inherits correctness for free as long as it sits inside the package. The failure mode this replaces is invisible to local testing: the hardcoded walk passed every `tsx` run and would have resolved `.prism/` to the wrong directory only once installed in a consumer's `node_modules`.

**2. `files` is an inclusion allowlist, and the leak-audit `tar tzf` grep gate runs before every publish.** npm `files` ships only what it names; anything unnamed never ships, so the operational tree is excluded by construction, not by hand-finding every sensitive file. The allowlist names only the directories the runtime provably reads (`.prism/{rules,architect,spec,references,templates}`, `SPEC.md`, `.sync-manifest.json`; `templates/install/`; `.ai-skills/skills/`; `.ai-skills/definitions/{roles,paths}.json`; `.ai-skills/config.json`; `dist/`) and excludes `scripts/` once `dist/` is the bin. Because the publish is immutable, the safety property is verified, not assumed: `npm pack` + `tar tzf` + a grep asserting zero operational-tree paths runs before any publish, and a human reviews the tarball contents as the last gate. The ADR/architect provenance strings that reference PRISM's extraction history ship intentionally — they are frozen incident citations, codified in `.ai-skills/definitions/literal-allowlist.json`, and the grep targets operational-tree *paths*, not the provenance *strings*.

**3. The `dist/cli.js` `node` shebang replaces the `tsx` dev runtime.** `bin` points at `dist/cli.js`, whose `#!/usr/bin/env node` banner is injected by the build. The code is bundled, but the content tree is not — `.prism/` and the skill definitions stay as shipped files read at runtime, never inlined. `prepublishOnly` runs `prism:build` + `prism:check` so a stale or broken roster can never publish, and the repo owner executes the auth-gated `npm publish --access public` — agents set up and verify, the human publishes.

**Build tool: esbuild single-file bundle, not tsc.** The alternative was a tsc multi-file emit, which preserves the `scripts/ai-skills/` depth so the old `../..` path-math "just works" — but it ships a multi-file tree, resolves relative imports at runtime, and gives no tree-shaking. esbuild produces a single `dist/cli.js` with the smallest tarball and no runtime import resolution. Its one cost — the bundle changes the running module's location — is exactly what invariant 1 makes robust, converting an ongoing multi-file surface into a one-line, test-covered concern. Config: `format: "esm"`, `platform: "node"`, `target: "node20"`, banner injects the shebang; `.prism/` content is never bundled.

## Consequences

- **Positive:** external teams adopt PRISM with `npx @huntermcgrew/prism adopt` and no checkout. The npm path becomes primary; the three checkout models demote to documented alternatives for air-gapped, customization, and contributor cases — free, because the existing `resolvePrismSource` priority chain already handles the fallthrough.
- **Positive:** invariant 1 makes the runtime's self-resolution survive any future change to the entry point's location. A new bundle layout doesn't re-arm the consumer-only path-math trap.
- **Positive:** the inclusion allowlist makes the leak-audit a closed-set check rather than an open-ended hunt for sensitive files. Adding a runtime-read directory means naming it in `files`; everything else is excluded by default.
- **Negative:** the leak-audit grep gate is a manual ritual a maintainer has to run before every publish, documented in `docs/publishing-prism.md`. Immutability is the reason it can't be skipped — a missed operational-tree path ships permanently.
- **Negative:** `prepublishOnly` runs `prism:test` twice (once inside `prism:build`, once inside `prism:check`). The double-run is deliberate: `prism:check` is verify-only and would not regenerate the roster, so dropping `prism:build` would violate the "broken roster never publishes" guarantee. The cost lands on a rare manual operation.
- **Neutral:** `.prism/.sync-manifest.json` is gitignored but ships because `files` operates on the working tree and `prepublishOnly`'s `prism:build` emits it before pack. Its absence degrades gracefully (version reporting falls back to `0.0.0`/`unknown`), so the dependency is soft.
- **Neutral (amended 2026-07-21, issue #425):** `dist/cli.js` is no longer git-tracked. The bundle is materialized by the build lifecycle — `prepare` on install, `prepack` before any tarball, `prepublishOnly` before publish — and ships because `files` names `dist/` and operates on the working tree, generalizing the `.sync-manifest.json` mechanism above from a JSON manifest to the compiled bin. All three invariants are unchanged: the runtime still walks to `package.json` (1), `files` is still the inclusion allowlist (2), and `bin` still points at the `node`-shebanged `dist/cli.js` (3) — none of them ever required the artifact to be in git. The tracked bundle had drifted from source on `main` with nothing catching it; removing it from git deletes that drift class rather than gating it, and `verify-pack-parity`'s `dist/cli.js` entry is the enforcement that the bundle ships.

## References

- `.prism/plans/prism-248.md` — the plan that built this, including the leak audit, the path-math fix, and the esbuild-over-tsc decision in full.
- [ADR-0059](./0059-first-contact-adopts-via-seed-and-sync.md) — first-contact `prism:adopt`; the npm path is the new primary front door to the same adopt flow.
- [ADR-0062](./0062-consumer-skill-distribution-via-prism-update.md) — consumer skill distribution; the persona roster the npm package projects on adopt.
- `.prism/architect/_toolkit/skills-ecosystem.md` § Output guards — why Thrive/TracTru provenance ships legitimately while operational dev-history does not.
- `docs/publishing-prism.md` — the maintainer-facing release ritual: version bump → `prism:check` → leak audit → tarball human-review → `npm publish --access public`.
