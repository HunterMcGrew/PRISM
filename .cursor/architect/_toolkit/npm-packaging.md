# npm Packaging

How PRISM's published npm package is shaped, and the checks that keep the tarball and the bundled CLI correct. This is build-internal, maintainer-facing content, excluded from the install seed. The maintainer release ritual is `docs/publishing-prism.md`.

---

## Distribution: npm

PRISM publishes to public npm as `@huntermcgrew/prism`. External teams adopt with `npx @huntermcgrew/prism adopt` — the primary distribution path; the checkout models (vendored sibling repo, global link, `--consumer`/cwd) demote to documented alternatives for air-gapped, customization, and contributor cases.

Three packaging invariants govern the published artifact, all in [ADR-0063](../../spec/adrs/_toolkit/0063-npm-publish-packaging-invariants.md): the runtime resolves its content tree by walking up to the `@huntermcgrew/prism` `package.json` (not a hardcoded depth, so any future dist target stays correct); `files` is an inclusion allowlist and the leak-audit `tar tzf` grep gate runs before every publish (versions are immutable); and `dist/cli.js` ships a `node` shebang in place of the `tsx` dev runtime. The ADR/architect provenance strings that ship in the tarball are frozen incident citations, not a leak — see [`output-guards.md`](./output-guards.md) for why "Thrive"-flavored literals in shipped spec/architect content are legitimate, and `docs/publishing-prism.md` for the maintainer release ritual.

## Packaging-parity gate

Every file the CLI reads from `prismSourceRoot` at runtime must be present in the published tarball. `scripts/ai-skills/verify-pack-parity.ts` — wired into `pnpm prism:check` as `prism:verify-pack`, which `prepublishOnly` runs transitively — asserts that each entry in its hand-maintained `RUNTIME_READ_PATHS` list appears in `npm pack --dry-run --json` output, failing with a named-file message otherwise. Unit tests structurally cannot catch this class: they read the source tree, never the tarball. That gap is how `.ai-skills/config.schema.json` shipped git-tracked but omitted from `package.json` `files` in 0.7.1, breaking `adopt`/`doctor`/`update` in the published package while `init` (which never reads the schema) survived (plan `bug-adopt-missing-schema`, bug #1). When a new runtime read of a packaged file is added, add its path to `RUNTIME_READ_PATHS` — the tradeoff for a list that a static scanner can't yet derive.

## Bundle-safe entry detection

Every subcommand and build script that can also run standalone ends with an "am I the entry script?" guard so its `main()` fires only when invoked directly. The obvious form — `fileURLToPath(import.meta.url) === path.resolve(process.argv[1])` — is correct for a file run on its own but wrong inside the `dist/cli.js` esbuild bundle: `format: "esm"` bundling collapses every folded-in module's `import.meta.url` to the single output file's URL, so that equality holds for every bundled guard at once. The shipped 0.7.3 CLI ran every subcommand's `main()` on any `prism` invocation for exactly this reason.

The pattern for any CLI entry point is `isDirectCliEntry(entryName)` in `scripts/ai-skills/lib/cli-entry.ts`: it compares the entry script's basename (`path.basename(process.argv[1])`, extension stripped) against `entryName`. The bundle's entry basename is always `cli` (or the global-link symlink name), never a subcommand, so no folded-in module treats itself as the entry and `cli.ts`'s `process.argv[2]` switch stays the sole dispatcher. Basename comparison survives bundling; `import.meta.url` comparison does not.

Do not reach for the other fix — reconfiguring esbuild to preserve per-module URLs. `resolveSelfPrismSource` in `scripts/ai-skills/update.ts` relies on the collapse: it reads `fileURLToPath(import.meta.url)` to locate the package root from `dist/cli.js` inside `node_modules`. Preserving per-module URLs would fix the guards but break self-location. `import.meta.url` is the wrong tool for the guard and the right tool for self-location — so the fix stays at the guard level.

**Membership is the transitive import graph, not direct imports.** Any file that carries the entry guard and is reachable from `cli.ts`'s import graph — at any depth — is folded into the bundle and needs the bundle-safe check. Classifying by direct imports alone undercounts: `build.ts` (via `update.ts`) and `verify-manifest-coverage.ts` (via `ownership.ts`'s `compileMatcher`, reached through `classifyPath`) sit two hops from `cli.ts` and carried the same collapsed-guard bug. When adding or auditing an entry guard, walk the transitive graph. A literal `grep "resolve(process.argv[1])"` sweep undercounts twice: a transitively-reached file looks standalone but isn't, and `migrate-skill.ts` spreads its guard across a dynamic `import("node:url")` a single-line search never matches. A clean conversion leaves zero occurrences of the old guard pattern in a rebuilt `dist/cli.js`.

The compiled bundle is the only surface that reproduces this class: unit tests import source modules where each `import.meta.url` is its own file, so they structurally cannot collapse. `scripts/ai-skills/cli-bundle.test.ts` builds a throwaway bundle via `buildBundle` and spawns it — the same "exercise the compiled artifact, not the source tree" shape as § Packaging-parity gate.
