# Install Layout

PRISM ships into a consumer repo as a multi-platform toolkit. This file is the agent-loaded reference for the bifurcated install layout — the everyday lookup for what lives where and why. It does not cover the hook runtime ([`hook-runtime.md`](./hook-runtime.md)), the adopt and update flow ([`consumer-sync-flow.md`](./consumer-sync-flow.md)), cross-reference checks ([`cross-reference-checks.md`](./cross-reference-checks.md)), token substitution ([`token-substitution.md`](./token-substitution.md)), or npm packaging ([`npm-packaging.md`](./npm-packaging.md)).

## The bifurcation

Two kinds of content sit in a PRISM install:

- **Platform-agnostic canonical content** — rules, ADRs, architect docs, templates, references, plans, lessons. One copy lives at `.prism/<area>/`. This is the source.
- **Platform-specific outputs** — Claude skills, Codex agents/skills, Cursor skills, native config files. These live under `.claude/`, `.codex/`, `.cursor/`, and `.agents/` per platform.

`pnpm prism:build` copies the read-only canonical areas into each platform dir so that each platform's auto-load mechanism surfaces the rules and architect docs without the agent having to Read them at session start. Every copied area carries a managed marker (`.ai-skill-generated`) at its root. On the consumer side, `prism:update` copies the same areas into the platform dirs for the hosts the consumer's `hosts` config key declares — all three when the key is absent, and a dropped host's copies taken back out on the next update ([`consumer-sync-flow.md`](./consumer-sync-flow.md) § Steady-state persona-skill distribution).

Concrete example: `.prism/rules/code-comments.md` is the canonical comment-style rule. `pnpm prism:build` writes byte-identical copies to `.claude/rules/code-comments.md` and `.codex/rules/code-comments.md` — both runtimes read the canonical Claude dialect (`paths:` frontmatter for Tier 2, no frontmatter for Tier 1) directly. Cursor is the exception: its rules loader keys on `.mdc` files whose frontmatter uses `globs:` (path-scoped) or `alwaysApply: true` (always-on), so `pnpm prism:build` translates the dialect when copying to `.cursor/rules/` — `code-comments.md` lands as `.cursor/rules/code-comments.mdc`. Editing the canonical and rebuilding refreshes all three. Editing a platform copy directly is drift — `pnpm prism:check` flags it.

The Cursor translation is mechanical and lossless: `paths:` becomes `globs:` with the same glob list, a frontmatter-less Tier 1 rule gains `alwaysApply: true`, and the `.md` extension becomes `.mdc`. Canonical rules stay in the Claude dialect per [ADR-0035](../../spec/adrs/_toolkit/0035-rule-loading-tiers.md); a verbatim `.md` copy carrying `paths:` was untiered in Cursor at best and inert at worst (the gap routed to issue `#73`).

## Ownership is path-decidable: the `_toolkit/` namespace

`pnpm prism:update` (ADR-0057) pulls PRISM's latest content into an already-onboarded consumer repo. For that to be safe, "what is PRISM allowed to overwrite" has to be answerable from the path alone — a sync that has to guess ownership per file will eventually guess wrong and clobber a consumer's product doc.

PRISM-owned content lives under `_toolkit/` subdirs, plus the writing guides under `.prism/architect/guides/`, so ownership is a glob, not a guess:

- `.prism/architect/_toolkit/**` — PRISM's architect docs. Flat `.prism/architect/*.md` is reserved for consumer product docs.
- `.prism/architect/guides/**` — the writing guides for plans, rules, skills, ADRs, and architect docs.
- `.prism/spec/adrs/_toolkit/**` — PRISM's ADRs. Flat `.prism/spec/adrs/*.md` is reserved for consumer product ADRs, which sidesteps numbering collisions between PRISM and consumer ADRs.

The leading underscore keeps the recursive walker working unchanged and sorts the reserved flat dir first. `scripts/ai-skills/ownership.ts` is the single source of truth for the classification: `PRISM_OWNED_GLOBS` lists `architect/_toolkit/**`, `architect/guides/**`, `spec/adrs/_toolkit/**`, `rules/**`, `templates/**`, `references/**`, `spec/**`, and `SPEC.md`; `CONSUMER_OWNED_GLOBS` lists flat `architect/*.md`, flat `spec/adrs/*.md`, the live `architect/manifest.json`, `custom/**`, `plans/**`, and `lessons.md`. `classifyPath(relativePath)` returns `prism` | `consumer` | `unknown`, and the sync writes only `prism`-classified files.

`manifest.json` is split-ownership: `.prism/architect/_toolkit/manifest.base.json` holds the toolkit routes (PRISM-owned), while the live `.prism/architect/manifest.json` is consumer-owned. The merge-at-onboard logic that would compose the live manifest from base plus per-team routes is not yet built — until it is, the live manifest is hand-maintained and `verify-manifest-coverage.ts` guards its coverage.

## Consumer overlay: `.prism/custom/`

Consumers extend PRISM without editing PRISM-owned files by dropping content under `.prism/custom/`, which mirrors the canonical area names: `.prism/custom/{rules,architect,references,templates}/<file>`. The overlay is consumer-owned (`custom/**` is in `CONSUMER_OWNED_GLOBS`), so `classifyPath` returns `consumer` and `pnpm prism:update` never writes into it — both the canonical file pass and the manifest skip it entirely.

The update flow reads the overlay only during the platform-copy step, emitting each area into a `custom/` subdir per platform: `.claude/rules/custom/<file>.md`, `.cursor/rules/custom/<file>.mdc` (dialect-translated), `.codex/rules/custom/<file>.md`. The `custom/` subdir makes base-vs-overlay collision structurally impossible — there is no last-write-wins ambiguity. Token substitution applies, so overlay rules can use team tokens. The overlay output carries its own `.ai-skill-generated` marker at the `custom/` subdir root, and orphan cleanup is scoped so base and overlay cleanup never cross.

## Skill namespace ownership

PRISM owns `prism-*` skill IDs, plus the bare ID `tdd`, and regenerates only those on update. Consumer-authored skills use a non-`prism-*` prefix — the org token from `config.json` (e.g. `acme-<role>`) or `custom-<role>` — and are consumer-owned, so an update never touches them. `prism-forge-skill` enforces this default in both its create and migrate modes; `prism-forge-skill` itself ships `prism-*` because it is a toolkit-owned skill, the documented carve-out.

## What gets copied; what stays canonical-only

Copied areas (mirrored to every platform dir):

- `.prism/rules/` (whole tree)
- `.prism/architect/` (whole tree, including `manifest.json`)
- `.prism/spec/` (whole tree, including `adrs/`)
- `.prism/templates/` (whole tree)
- `.prism/references/` (whole tree)
- `.prism/SPEC.md` (loose file)

Canonical-only (lives at `.prism/` and is not mirrored):

- `.prism/plans/` — agent-written; mirroring would create write conflicts when an agent edits a plan and the next build overwrites the platform copy
- `.prism/lessons.md` — same reason

Skills are never under canonical at all — they're generated platform outputs from `.ai-skills/skills/<id>/` into `.claude/skills/<id>/`, `.agents/skills/<id>/`, and `.cursor/skills/<id>/`. The skill build mechanism is older than the bifurcation and continues to work the same way.

## Direct-write tool outputs

`pnpm prism:build` writes platform outputs directly to their tool-namespaced destinations — no staging directory. Cursor skills land at `.cursor/skills/<id>/SKILL.md`; Codex config lands at `.codex/codex-config.toml`. There is no `.generated/` staging surface.

The committed-vs-ignored split inside each tool namespace is the consumer install contract — codified in [`.ai-skills/docs/compatibility.md`](../../../.ai-skills/docs/compatibility.md) § Per-Tool Directory Ownership and recorded as [ADR-0044](../../spec/adrs/_toolkit/0044-direct-write-tool-outputs.md). The short version:

- `.cursor/skills/` is **committed** — Cursor consumers get skills via `git pull`, no install step.
- `.codex/codex-config.toml` is **ignored** — per-user file (personality, projects, marketplaces) that would clobber consumer customization if committed.
- `.agents/skills/` is **ignored but populated** — every `prism adopt`/`prism update` renders the persona roster there directly ([`consumer-sync-flow.md`](./consumer-sync-flow.md) § Steady-state persona-skill distribution, ADR-0062), the same render pass that writes `.claude/skills/` and `.cursor/skills/`. It stays gitignored as machine-local output, not because population is unshipped.
- Per-tool `worktrees/` directories are **ignored** — operational state, not generated output.

The rule for future tool integrations: in-repo destinations get sync; outside-repo destinations get install scripts. See [`.ai-skills/docs/compatibility.md § Install-Script Scope`](../../../.ai-skills/docs/compatibility.md) for the full reasoning.

## The templates/install seed surface

`templates/install/.prism/` is the consumer install seed — what a consumer repo receives at install time. `pnpm prism:build` keeps it in parity automatically: after the platform-content sync, `writeSeedMirror()` in `scripts/ai-skills/build.ts` writes every **non-curated** canonical file (anything not classified `excluded`, `curated`, or `renamed` in `seed-curation.json`) plus every **`mirrored`** file to the seed as raw bytes (tokens stay literal per ADR-0030; no substitution). The author is still responsible for the **curated** seed copies — files that intentionally ship a simplified consumer-facing version (like this doc) — and for classifying any new file in `seed-curation.json` before it ships. New files that aren't classified are auto-mirrored verbatim as non-curated, and `prism:build` prints a warning listing them so a forgotten curation decision surfaces at build time.

**Enforcement:** Seed drift is enforced by `checkSeedDrift()` in `scripts/ai-skills/build.ts`; `pnpm prism:check` remains the CI backstop — it fails if a non-curated canonical file diverges from the seed, catching any case the build-time mirror missed (e.g. a hand-edited seed file). The classification of every canonical file — which are excluded (not shipped), curated (intentionally different), mirrored (kept byte-identical), or renamed in the seed — is declared in `.ai-skills/definitions/seed-curation.json`.

**`curated` ships a file; it does not keep it current.** The build skips a `curated` file on both the write path and the content compare, so editing the canonical leaves the consumer copy frozen at whatever it last was — right for a file whose seed version is a deliberately simplified stub, wrong for one the consumer is supposed to read the same words from. `mirrored` is the bucket for the second case: the build rewrites the twin on every run and `prism:check` fails on divergence. The five writing guides under `.prism/architect/guides/` are `mirrored` because the write-deny gate makes an agent read them before editing a plan, rule, architect doc, ADR, or skill — a stale consumer copy would hand people outdated instructions with nothing in CI noticing. Listing a `renames` entry in `mirrored` as well turns the same content gate on for a renamed pair; `architect/manifest.json` → `architect/manifest.stub.json` deliberately stays out of it, since the stub is meant to differ. A path belongs to exactly one bucket, and the build throws on an overlap rather than resolving it by branch order. That manifest is the source of truth: any new canonical file must be classified and the manifest updated, or `prism:check` will fail. CI runs `pnpm prism:check` on every PR and main push, so forgotten seed writes are caught on a fresh checkout before merge.

**The same `renames` table also drives delivery, in the opposite direction.** `seed-curation.json`'s `renames` map (`architect/manifest.json` → `architect/manifest.stub.json`, `SPEC.md` → `SPEC.md.tmpl`) is canonical→seed on the build side above, but `scripts/ai-skills/lib/seed-curation.ts`'s `loadSeedCurationRenames`/`invertRenames` reads that same table and inverts it for `prism adopt`/`prism update`, so a consumer's seed file lands under its canonical name (`manifest.json`, `SPEC.md`) instead of the seed's own filename. `architect/manifest.json` is consumer-owned (`CONSUMER_OWNED_GLOBS` above), so the inversion only needs to reach `adopt`'s one-time seed write; `SPEC.md` is PRISM-owned, so `update.ts`'s file-classification, apply, and manifest-rewrite steps carry the rename too, or a later `update` would see the consumer's `SPEC.md` as unrecognized and stop refreshing it. `prism doctor` degrades a missing/malformed `seed-curation.json` to a warning rather than throwing, since it only reports; `adopt`/`update` throw loudly instead, because a silent empty-map fallback there would reproduce the exact delivery bug this table exists to fix.

**A `prism doctor` check that presumes an adopted consumer is gated at the `runDoctor` call site, not inside the check.** A repo that has never run `prism adopt` is a healthy *target* for adopt, not a broken install — so a check that reads installed state (`checkSeedDelivery` is the first of the shape) has to distinguish "adopted before this fix" from "never adopted," or it reports a fresh repo as unhealthy and prescribes `update` where the answer is `adopt`. The presence of the sync manifest is that signal, and `runDoctor` already holds it from `checkSyncManifest`, so the gate lives at the call site and the check itself stays a pure function of the state it is handed. Two things make this easy to get wrong: the check reads correct in isolation, and a test fixture with an empty `renames` table exercises zero iterations of the loop that would expose it.

## Drift detection

`pnpm prism:check` runs the same logic as `pnpm prism:build` but in dry-run mode — if any platform-copy file would change, it reports drift and fails. This catches:

- Out-of-band edits to a platform copy (the file no longer matches its canonical source)
- Forgotten rebuilds (canonical was edited but `prism:build` wasn't run)
- Renames in canonical (old platform copies remain when canonical files move)

The cleanup function under `removeDeletedManagedContent` handles the last case — it detects build copies whose canonical source no longer exists (recognized via the area-level `.ai-skill-generated` marker) and removes them.

Platforms without managed content are treated as opt-out, not drift. The signal is the area-level `.ai-skill-generated` marker — if no copied area carries it inside `<platformDir>/`, `prism:build` has never run for that platform and `prism:check` skips it. This keeps fresh clones passing on platforms the contributor hasn't built locally yet (e.g. `.agents/` is gitignored in this repo's dogfood install — `.codex/` and `.cursor/` are committed, so only per-user files like `.codex/codex-config.toml` and each tool's `worktrees/` are ignored). Once any area is built and the marker is written, drift detection picks the platform up on subsequent checks. Build mode always copies and writes the marker.

## Where to look

- `scripts/ai-skills/build.ts` — the copy and cleanup orchestration in `main()`
- `.ai-skills/definitions/paths.json` — `canonical.contentRoot` and `generated.platformContentCopies` declare the source/target dirs

## Curated seed twins: the curation boundary

A **curated** entry in `.ai-skills/definitions/seed-curation.json` is a hand-maintained consumer twin of a canonical file — one intentionally simplified for the audience that receives it. `checkSeedDrift` in `scripts/ai-skills/build.ts` only checks that a curated seed file **exists**; it never compares content, and the seed-write pass skips curated files entirely. So a curated twin carries no mechanical staleness signal — canonical can move arbitrarily far ahead of it and every build gate stays green. That gap is exactly how `templates/install/.prism/architect/_toolkit/skills-ecosystem.md` drifted 65 lines behind its canonical partner before anyone noticed.

A curated twin is **canonical minus what a consumer cannot reach, with consumer-specific identifiers tokenized**. Three ordered tests decide every line:

**Test 1 — Identifier tokenization.** Values specific to one install (repo, org, tracker, default branch) ship as token literals — the `GITHUB_OWNER` and `DEFAULT_BRANCH` tokens, and the rest of `deriveTokenMap`'s set (`scripts/ai-skills/lib/tokens.ts`); canonical carries PRISM's own rendered values instead. Substitution happens at install time, never at seed-write time, so the seed keeps the raw token.

**Test 2 — Reference reachability.** A cross-reference ships only if its target ships to consumers. Numbered ADRs never ship — every `spec/adrs/_toolkit/NNNN-*.md` is `excluded`, so every `See ADR-NNNN` citation is dropped, and where the ADR's content is load-bearing the sentence paraphrases the invariant in place of the link. `.prism/skills/**` never ships either — consumer skills render into the host's own skill directory, so any clause pointing at `.prism/skills/…` is dropped, including mid-sentence. `.prism/references/**`, `.prism/rules/**`, `.prism/architect/**`, and `.prism/templates/**` do ship (subject to their own `excluded` entries), so references into them stay verbatim. Runtime-created paths — `.prism/plans/`, `.prism/lessons.md`, and similar — are exempt from this test: they don't exist in the seed because personas create them on first write (per [`.prism/rules/lazy-artifacts.md`](../../rules/lazy-artifacts.md)), so referencing them is correct, not dangling.

The target set is wider than `seed-curation.json` and the seed tree, though: the published npm tarball (`package.json#files`) is a third authority, and it governs unshipped directories neither of the first two ever mention — `scripts/ai-skills/**` and `docs/**` appear in neither the seed tree nor the seed-curation manifest, yet are unshipped in the tarball too — with one carve-out, `scripts/ai-skills/hooks/`, which ships so the consumer's install can copy the hook runtime, so a reference into them is exactly as dangling as an unreachable ADR citation. The check also covers commands, not only paths: the consumer CLI's own `USAGE` in `scripts/ai-skills/cli.ts` is the authority for what a consumer can run — `init`, `adopt`, `detect`, `update`, `doctor`, `eject` — and a maintainer-only command like `pnpm prism:build` or `pnpm prism:check` fails reachability the same way a dangling path does.

A known-outstanding class of Test 2 command-reachability failures across the curated twins is tracked in [GitHub issue #444](https://github.com/HunterMcGrew/PRISM/issues/444) — the twins are not yet clean against this test.

**Verification caveat.** `crossref-lint` ([`cross-reference-checks.md`](./cross-reference-checks.md) § Cross-reference lint) is not the gate for the unshipped-path class of Test 2 failure. It resolves seed references against the monorepo root, where `scripts/ai-skills/**` exists on disk, so it passes cleanly on precisely the references this test condemns. That class is caught only by grepping seed content against `package.json#files` by hand — no gate covers it today.

**Test 3 — Subject-matter.** Content about building, publishing, or maintaining PRISM itself is maintainer-only and never ships: npm packaging invariants, `scripts/ai-skills/**` internals, `dist/cli.js`, the release ritual, the literal guards' implementation. The discriminator is the audience — a consumer runs `prism adopt` and `prism update`; they never publish the package or run its build guards. Content about what a consumer's own install does ships even when the mechanism lives in PRISM's scripts.

**What the boundary does not license.** Everything that passes all three tests ships verbatim. Curation is subtraction, tokenization, and — per [ADR-0064](../../spec/adrs/_toolkit/0064-consumer-internal-boundary.md) § "ADR references split into two lanes" — genericization of an illustrative example: when an ADR number is cited only as a sample of the citation form rather than a link to follow, the PRISM-specific number and topic swap for a generic placeholder while the instruction ships unchanged. What curation never licenses is paraphrase-for-its-own-sake — a shorter version of a shipping concept restated in different words. A twin sentence that carries canonical's meaning in different words is drift waiting to happen: it reads as intentional, so the next editor leaves it, and the two versions diverge further on the next canonical edit. When a paraphrase is genuinely required — a load-bearing ADR's reasoning must survive without the link — keep it to the minimum edit that removes the unreachable reference.

The curated twins already practice a named instance of that minimum edit: when a shipping sentence would otherwise name an unreachable command, path, or internal document, attribute the mechanism to PRISM ("the PRISM build") rather than naming the thing the reader cannot reach, and mark internal documents as such ("PRISM's internal `<path>` (monorepo-only, not shipped to consumers)"). § Direct-write tool outputs and § The templates/install seed surface in `templates/install/.prism/architect/_toolkit/install-layout.md` are the worked examples.

**Direction of flow is always canonical → twin.** The twin is never the place a new idea lands first.

**Why hand-curation stays.** The recurring drift argues for a staleness *detector*, not for replacing editorial judgment with a generator. A mechanical content filter can't separate a curated twin's surgical clause-level drops (a sub-clause dropped mid-sentence, with the surrounding prose shipping unchanged) from wholesale omission — no regex distinguishes those without per-file markers, which is its own large blast-radius change to `seed-curation.json` semantics and all curated files. A staleness detector for curated twins is a real improvement and remains a separate follow-up, but recency (comparing canonical's and the twin's last-commit timestamp) is a disqualified mechanism: it misses the twin being wrong from the start (no canonical-moved event exists to detect), a partial sweep that touches the twin without closing the underlying drift (recency resets while the drift survives), and canonical and twin sharing a commit date outright. The required mechanism is a date-independent structural diff — comparing heading sets and reference classes between canonical and twin, with timestamps not an input at all. Full scoping lives in [GitHub issue #441](https://github.com/HunterMcGrew/PRISM/issues/441).
