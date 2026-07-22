# Install Layout

PRISM ships into a consumer repo as a multi-platform toolkit. This file is the agent-loaded reference for the bifurcated install layout — the everyday lookup for what lives where and why.

## The bifurcation

Two kinds of content sit in a PRISM install:

- **Platform-agnostic canonical content** — rules, ADRs, architect docs, templates, references, plans, lessons. One copy lives at `.prism/<area>/`. This is the source.
- **Platform-specific outputs** — Claude skills, Codex agents/skills, Cursor skills, native config files. These live under `.claude/`, `.codex/`, `.cursor/`, and `.agents/` per platform.

`pnpm prism:build` copies the read-only canonical areas into each platform dir so that each platform's auto-load mechanism surfaces the rules and architect docs without the agent having to Read them at session start. Every copied area carries a managed marker (`.ai-skill-generated`) at its root.

Concrete example: `.prism/rules/code-comments.md` is the canonical comment-style rule. `pnpm prism:build` writes byte-identical copies to `.claude/rules/code-comments.md` and `.codex/rules/code-comments.md` — both runtimes read the canonical Claude dialect (`paths:` frontmatter for Tier 2, no frontmatter for Tier 1) directly. Cursor is the exception: its rules loader keys on `.mdc` files whose frontmatter uses `globs:` (path-scoped) or `alwaysApply: true` (always-on), so `pnpm prism:build` translates the dialect when copying to `.cursor/rules/` — `code-comments.md` lands as `.cursor/rules/code-comments.mdc`. Editing the canonical and rebuilding refreshes all three. Editing a platform copy directly is drift — `pnpm prism:check` flags it.

The Cursor translation is mechanical and lossless: `paths:` becomes `globs:` with the same glob list, a frontmatter-less Tier 1 rule gains `alwaysApply: true`, and the `.md` extension becomes `.mdc`. Canonical rules stay in the Claude dialect per [ADR-0035](../spec/adrs/_toolkit/0035-rule-loading-tiers.md); a verbatim `.md` copy carrying `paths:` was untiered in Cursor at best and inert at worst (the gap routed to issue `#73`).

## Ownership is path-decidable: the `_toolkit/` namespace

`pnpm prism:update` (ADR-0057) pulls PRISM's latest content into an already-onboarded consumer repo. For that to be safe, "what is PRISM allowed to overwrite" has to be answerable from the path alone — a sync that has to guess ownership per file will eventually guess wrong and clobber a consumer's product doc.

PRISM-owned content lives under `_toolkit/` subdirs so ownership is a glob, not a guess:

- `.prism/architect/_toolkit/**` — PRISM's architect docs. Flat `.prism/architect/*.md` is reserved for consumer product docs.
- `.prism/spec/adrs/_toolkit/**` — PRISM's ADRs. Flat `.prism/spec/adrs/*.md` is reserved for consumer product ADRs, which sidesteps numbering collisions between PRISM and consumer ADRs.

The leading underscore keeps the recursive walker working unchanged and sorts the reserved flat dir first. `scripts/ai-skills/ownership.ts` is the single source of truth for the classification: `PRISM_OWNED_GLOBS` lists `architect/_toolkit/**`, `spec/adrs/_toolkit/**`, `rules/**`, `templates/**`, `references/**`, `spec/**`, and `SPEC.md`; `CONSUMER_OWNED_GLOBS` lists flat `architect/*.md`, flat `spec/adrs/*.md`, the live `architect/manifest.json`, `custom/**`, `plans/**`, and `lessons.md`. `classifyPath(relativePath)` returns `prism` | `consumer` | `unknown`, and the sync writes only `prism`-classified files.

`manifest.json` is split-ownership: `.prism/architect/_toolkit/manifest.base.json` holds the toolkit routes (PRISM-owned), while the live `.prism/architect/manifest.json` is consumer-owned. The merge-at-onboard logic that would compose the live manifest from base plus per-team routes is not yet built — until it is, the live manifest is hand-maintained and `verify-manifest-coverage.ts` guards its coverage.

## Consumer overlay: `.prism/custom/`

Consumers extend PRISM without editing PRISM-owned files by dropping content under `.prism/custom/`, which mirrors the canonical area names: `.prism/custom/{rules,architect,references,templates}/<file>`. The overlay is consumer-owned (`custom/**` is in `CONSUMER_OWNED_GLOBS`), so `classifyPath` returns `consumer` and `pnpm prism:update` never writes into it — both the canonical file pass and the manifest skip it entirely.

The update flow reads the overlay only during the platform-copy step, emitting each area into a `custom/` subdir per platform: `.claude/rules/custom/<file>.md`, `.cursor/rules/custom/<file>.mdc` (dialect-translated), `.codex/rules/custom/<file>.md`. The `custom/` subdir makes base-vs-overlay collision structurally impossible — there is no last-write-wins ambiguity. Token substitution applies, so overlay rules can use team tokens. The overlay output carries its own `.ai-skill-generated` marker at the `custom/` subdir root, and orphan cleanup is scoped so base and overlay cleanup never cross.

## Skill namespace ownership

PRISM owns `prism-*` skill IDs and regenerates only those on update. Consumer-authored skills use a non-`prism-*` prefix — the org token from `config.json` (e.g. `acme-<role>`) or `custom-<role>` — and are consumer-owned, so an update never touches them. `prism-skill-forge` enforces this default in both its create and migrate modes; `prism-skill-forge` itself ships `prism-*` because it is a toolkit-owned skill, the documented carve-out.

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

The committed-vs-ignored split inside each tool namespace is the consumer install contract — codified in [`.ai-skills/docs/compatibility.md`](../../.ai-skills/docs/compatibility.md) § Per-Tool Directory Ownership and recorded as [ADR-0044](../spec/adrs/_toolkit/0044-direct-write-tool-outputs.md). The short version:

- `.cursor/skills/` is **committed** — Cursor consumers get skills via `git pull`, no install step.
- `.codex/codex-config.toml` is **ignored** — per-user file (personality, projects, marketplaces) that would clobber consumer customization if committed.
- `.agents/` is **ignored** — per-user Codex skills root; consumers will populate it via a per-user install script planned for Phase 2 (not yet shipped in PRISM).
- Per-tool `worktrees/` directories are **ignored** — operational state, not generated output.

The rule for future tool integrations: in-repo destinations get sync; outside-repo destinations get install scripts. See [`.ai-skills/docs/compatibility.md § Install-Script Scope`](../../.ai-skills/docs/compatibility.md) for the full reasoning.

## The templates/install seed surface

`templates/install/.prism/` is the consumer install seed — what a consumer repo receives at install time. `pnpm prism:build` keeps it in parity automatically: after the platform-content sync, `writeSeedMirror()` in `scripts/ai-skills/build.ts` writes every **non-curated** canonical file (anything not classified `excluded`, `curated`, or `renamed` in `seed-curation.json`) to the seed as raw bytes (tokens stay literal per ADR-0030; no substitution). The author is still responsible for the **curated** seed copies — files that intentionally ship a simplified consumer-facing version (like this doc) — and for classifying any new file in `seed-curation.json` before it ships. New files that aren't classified are auto-mirrored verbatim as non-curated, and `prism:build` prints a warning listing them so a forgotten curation decision surfaces at build time.

**Enforcement:** Seed drift is enforced by `checkSeedDrift()` in `scripts/ai-skills/build.ts`; `pnpm prism:check` remains the CI backstop — it fails if a non-curated canonical file diverges from the seed, catching any case the build-time mirror missed (e.g. a hand-edited seed file). The classification of every canonical file — which are excluded (not shipped), curated (intentionally different), or renamed in the seed — is declared in `.ai-skills/definitions/seed-curation.json`. That manifest is the source of truth: any new canonical file must be classified and the manifest updated, or `prism:check` will fail. CI runs `pnpm prism:check` on every PR and main push, so forgotten seed writes are caught on a fresh checkout before merge.

## Consumer content sources through one seam

Both `prism:adopt`'s canonical pass and every `prism:update` pull PRISM-owned content from the genericized install seed at `templates/install/.prism`, never PRISM's own raw `.prism/` dogfooding tree. The single seam is `resolvePrismContentRoot(prismSourceRoot)` in `scripts/ai-skills/update.ts`, called at both `adopt.ts` (phase B, via `runUpdate`) and `update.ts`'s `runUpdateCli`. Two call sites that must resolve identically is what makes this a real seam rather than an inlined constant — centralizing it prevents the two entry points from drifting apart.

The invariant exists because the raw `.prism/` tree carries PRISM-internal literals — de-thriving references, `THR-`/`PRISM-NNN` ticket citations, dogfooding plans — that must never reach a consumer. Token substitution can't strip them (it rewrites only configured template tokens like `PRISM`, not prose ticket refs), so the seed — already curated and build-verified — is the only correct source. The class of bug this closes: a prior split where `update.ts` sourced from raw `.prism/` while adopt seeded from the install seed let adopt phase B overwrite the correct seed content with dogfooding literals on every consumer adopt (plan `bug-adopt-missing-schema`, bug #2).

Because the install seed intentionally ships no `.sync-manifest.json`, version metadata for the consumer manifest resolves from `package.json` (`resolvePrismVersion`) plus a git-or-`"unknown"` commit — not from any shipped manifest — threaded as an optional `VersionMetadata` so unit-test callers keep a manifest-reading fallback.

**Seed dogfooding-literal canary.** `runConsumerSeedLiteralGuard` (`scripts/ai-skills/literal-guard.ts`) scans the install seed at build time and fails `pnpm prism:build`/`prism:check` on any non-allowlisted dogfooding literal. The authoritative pattern is `SEED_DOGFOODING_PATTERN` in that file — origin-project references, PRISM's own `PRISM-NNN` ticket citations, the de-thriving migration marker, and hardcoded tracker names (`Linear`), which the seed must stay neutral of because it ships to consumers on any tracker (ADR-0032). The tracker match is word-bounded and case-sensitive, so lowercase uses (CSS `linear` easing, "linear time") pass. `Sol`, `Iris`, and `ADR-NNNN` are deliberately **not** matched: they are legitimate framework content that ships to consumers. Asserting on the seed is deterministic precisely because the seed is what a consumer receives verbatim. Legitimate provenance lines are exempted per-file in `.ai-skills/definitions/literal-allowlist.json` — the source of truth for current exemptions, which include `templates/install/.prism/architect/onboarding.md` (PRISM-256/PRISM-250 citation, tracked for genericization) and the files that legitimately name Linear as a supported tracker.

## First-contact adoption: `prism init` then `prism adopt`

A cold consumer — a repo that has never had PRISM — needs to run two commands before the agent-driven onboarding begins:

1. **`npx @huntermcgrew/prism init`** — writes `.ai-skills/config.json` so the consumer repo is identifiable. This is deterministic and requires no AI agent: it detects the tech stack, collects a handful of required values (project name, ticket prefix, ticket system, GitHub owner, and repo), and writes the config. When stdin is a TTY, it prompts interactively. In CI or scripted contexts, pass the same values as flags: `--project`, `--ticket-prefix`, `--ticket-system` (`linear` or `github-issues`), `--github-owner`, `--github-repo`. Optional flags: `--org`, `--linear-team`, `--linear-workspace`, `--default-branch`. `init` refuses and exits if a config already exists — edit the file directly or remove it to re-init. `init` writes only `config.json` and nothing else; adopt, update, and Atlas are responsible for everything after it.

2. **`npx @huntermcgrew/prism adopt`** — seeds `.prism/` and projects the full persona roster. This is the first-contact install step described in the section below. If adopt detects that `config.json` is missing, it stops and tells the consumer to run `init` first. Adopt also self-heals the consumer's `.ai-skills/definitions/paths.json` — provisioning it from the PRISM package copy when it is absent or structurally incomplete (an older schema missing `generated.platformContentCopies`) — so the cold `init`→`adopt` path is robust against a `paths.json` that `init` never writes; a complete consumer file (even a customized one) is left untouched.

3. **(Later, in-agent) Atlas** — handles the richer, conversational onboarding: generating per-team rules, writing stack-appropriate security guidance, and populating stub anchors with team context. Atlas owns this layer because it requires judgment that a deterministic CLI step can't provide; adopt is seed-and-sync rather than a merge engine — `scripts/ai-skills/adopt.ts` implements this.

The split is intentional: `init` is the repeatable, CI-safe bootstrap; Atlas is the AI-assisted configuration pass that runs once per team.

**The config write path honors both ticket systems.** `writeOnboardingConfig`/`toOnDiskConfig` in `scripts/ai-skills/lib/onboarding-config.ts` set `ticketSystem.kind` to `"github-issues"` or `"linear"` depending on the input: a non-empty `linearTeam` emits `{ kind: "linear", teamKey }`, an empty one emits `{ kind: "github-issues" }` with no team key. `validateOnDiskConfig` accepts both. This is a capability of the config layer, not an `init` detail — any caller of `writeOnboardingConfig`, including Atlas, can produce a truthful github-issues config. Atlas's existing Linear output stays byte-identical because it always supplies `linearTeam`. The build reader (`tokens.ts` `loadConfig`/`deriveTicketTracker`) and `config.schema.json` already accepted both kinds; this closed the write-side gap.

---

The seed surface above is what a consumer repo _receives_; `pnpm prism:adopt` is what _lays it down_ the first time. It is the install entry for a repo that has never had PRISM — an established team adopting PRISM into a codebase that already has its own setup. `scripts/ai-skills/adopt.ts` implements it.

`runAdopt` runs two steps in sequence:

1. **Seed `.prism/` from `templates/install/.prism/`.** `seedConsumerContentRoot` recursively copies the install seed into the consumer's `.prism/`, writing only paths the consumer does **not** already have and skipping any that exist. It never overwrites an existing consumer file — it mirrors the `consumerHash === null → written` posture from `applyIncomingFile`.
2. **Run the first sync.** `runAdopt` then delegates to `runUpdate` (ADR-0057), which applies PRISM-owned files and writes the steady-state baseline manifest via `rewriteConsumerManifest`. The no-op-before-`.bak` ordering means byte-identical consumer files are left untouched and only genuinely diverged files are preserved as `.bak` — so the first sync into an established repo with no baseline manifest is safe (ADR-0057's no-manifest path).

After this one run, `.prism/.sync-manifest.json` exists and the repo is in steady-state: `pnpm prism:update` handles all future syncs.

**The manifest-exists refusal is the install-vs-steady-state guard.** `runAdopt` calls `assertConsumerIsEstablished` before seeding; if a `.sync-manifest.json` is already present, it throws `"prism:adopt: this repo already has a PRISM baseline — run pnpm prism:update for steady-state."` The guard lives inside `runAdopt`, not only in the CLI `main()`, so every caller of `runAdopt` inherits the invariant. This mirrors `update.ts`'s source==consumer refusal: each entry point refuses the other's job so the two flows' preconditions stay clean. There is no `--dry-run` preview — first-contact's safety is recover-after-`.bak` (the seed never overwrites; the sync no-ops byte-identical files and `.bak`-snapshots divergence), not see-before-write.

## Steady-state persona-skill distribution

After the first `prism:adopt` run, every subsequent `pnpm prism:update` (and every future `prism:adopt` on a fresh repo) automatically renders the full `prism-*` persona roster into the consumer's configured skill directories. The mechanism lives in `runUpdate` (`scripts/ai-skills/update.ts`) — the shared seam both `prism:update`'s `main()` and `prism:adopt`'s `runAdopt` call — so both entry points reach the same render step without duplication (see plan prism-242 Decision "Adopt-path seam").

**What the consumer receives.** For each `prism-*` skill in the PRISM source roster, `generatePlatformSkills` (`scripts/ai-skills/generate-skills.ts`) renders the skill body with the consumer's own token map — `PRISM` becomes the consumer's project name, `PRISM` becomes their ticket prefix, and so on — and writes the rendered output to each opted-in platform directory:

- `.claude/skills/<id>/SKILL.md` (Claude Code)
- `.agents/skills/<id>/SKILL.md` (Codex)
- `.cursor/skills/<id>/SKILL.md` (Cursor)

Codex agent adapters (`.toml`) and Claude agent definitions (`.md`) render into their respective output roots using the same token map. Every written skill directory carries the managed marker (`.ai-skill-generated`) so orphan cleanup knows what to remove — see the § Skill namespace ownership section above.

**The consumer's tokens, not PRISM's.** The render uses `deriveTokenMap(loadConfig(consumerRepoRoot))` from the consumer's own `.ai-skills/config.json`, not any PRISM-side values. A skill body that says "Create an issue in PRISM" lands as "Create an issue in Acme" in an Acme consumer. No unresolved token literals survive in any rendered output — the leftover-token guard (`runLeftoverTokenGuard` in `literal-guard.ts`) runs over the consumer's skill output roots immediately after the render and fails the update if any are found (see the guard details in `skills-ecosystem.md § Output guards`).

**Orphan cleanup.** When a persona is removed from the PRISM roster, the next `prism:update` removes its skill directories from the consumer's platform dirs. Cleanup is gated on the managed marker, not on the `prism-*` prefix: a consumer-authored `prism-*`-named skill directory without the marker is never a delete target.

**Consumer-authored skills are untouched.** The render writes only to roster-member IDs, and cleanup deletes only marker-bearing directories that are no longer in the roster. A consumer's own skills — whether they use a non-`prism-*` prefix or a custom-prefixed name — are never written or deleted by `prism:update`.

**Idempotency.** `generatePlatformSkills` uses `writeFileIfChanged` for every output: if the rendered content matches the file already on disk, no write occurs. A `prism:update` run on a repo already at the current PRISM version is a no-op across the roster.

The decision record for this feature is ADR-0062 ("Consumer skill distribution via prism:update").

## Two substitution passes, two surfaces

Content reaches a consumer through two distinct passes, and only one of them substitutes tokens. Confusing the two is how a token reference that is safe in one surface crashes in the other — so the distinction is load-bearing.

- **Build-time platform-copy pass** — `copyContentFileWithSubstitution` in `scripts/ai-skills/build.ts` reads each canonical `.prism/<area>/` file, runs `substituteTokens` over it (`build.ts:207`), and writes the result into the platform dirs (`.claude/`, `.codex/`, `.cursor/`). `references` is one of `COPIED_CONTENT_AREAS` (`build.ts:111`), so `.prism/references/**` **is** token-substituted on this pass — against the PRISM maintainer's own dogfood config. A token literal in a reference file resolves here.
- **Adopt-time skill-payload pass** — `syncOptionalSkillPayloads` in `scripts/ai-skills/generate-skills.ts` copies each skill's optional payloads (a skill's own `references/` directory) into the consumer's platform skill dirs via `fs.copyFile` / `fs.cp` (`generate-skills.ts:348-353`) with **no** `substituteTokens` call. A token literal in a skill-payload reference is copied verbatim and resolved at the persona's runtime (e.g. Lilac reading the `SLACK_CHANNEL` token out of `phases.md`), never by the build.

The skill body itself is the other adopt-time surface that **does** substitute: `buildSkillMarkdown` assembles frontmatter + `shared.md` + the platform body and calls `substituteTokens` on the result (`generate-skills.ts:130`). So at adopt-time, skill bodies are substituted and skill payloads are not.

The practical consequence: any class-level guard that checks "does every token literal in shipped content have a default" must scan exactly the substitution surface — skill bodies (`shared.md` + platform `claude.md`/`codex.md`/`cursor.md`), not skill `references/` payloads. Scanning payloads would false-positive on runtime shell variables that are never build tokens.

## Optional tokens must default in `deriveTokenMap`

A token that any shipped skill body references must be present in the map `deriveTokenMap` (`scripts/ai-skills/lib/tokens.ts`) produces — even when the underlying config field is optional and absent. `substituteTokens` throws on the first unmapped reference, so an optional token left unmapped crashes the adopt-time skill-body pass for any consumer whose config omits that field.

The pattern is to default the optional token to an empty string rather than gate its `set` on field presence:

```ts
tokenMap.set("SLACK_CHANNEL", config.slackChannel ?? "");
```

The empty string is a first-class "not configured" state, not an error — downstream skill logic routes on it (Lilac treats an empty `#prism-dev` as "no channel configured" and falls through to a pasteable block instead of auto-posting). A conditional `if (typeof config.slackChannel === "string")` set is the bug shape: it leaves the token unmapped when the field is absent, and a cold `init`→`adopt` (which never writes optional fields) crashes.

The class-level backstop is `scripts/ai-skills/optional-token-coverage.test.ts`: it builds the token map from a minimal cold-`init` config (every optional field skipped), runs `substituteTokens` over every shipped skill body, and asserts no throw. A new optional token added to skill content without a default in `deriveTokenMap` fails this test deterministically. This is the gate that the three consecutive cold-start token bugs lacked.

## Cross-reference convention

When canonical content cites another canonical file, use `.prism/<area>/<file>`. Every platform's copy of the citing file will resolve correctly via its own auto-load — Claude reads the citation from `.claude/rules/<rule>.md` and resolves `.prism/<area>/<file>` against the canonical location. Codex and Cursor do the same.

Citing `.claude/rules/<file>.md` inside content that gets copied to all three platforms is incorrect — Codex and Cursor consumers don't have a `.claude/` dir. The build-time path guard catches this (see below).

The convention does not apply to:

- Skill bodies under `.claude/skills/<id>/SKILL.md` — these are platform-specific outputs and may legitimately reference platform-specific paths.
- Agent-written content (plans, lessons) — these aren't copied, so platform-specific path mentions in tickets about platform layout don't propagate anywhere.

## Build-time path guard

`scripts/ai-skills/path-guard.ts` runs as part of `pnpm prism:build` and `pnpm prism:check`. It scans every `.md` file under the copied areas of `.prism/` and `templates/install/.prism/`, plus the loose `SPEC.md` on each surface, and fails the build when it finds a reference matching `(\.claude|\.codex|\.cursor)/(rules|architect|spec|templates|references|plans)/`. Both surfaces share the same allowlist — keys are relative to the surface's content root.

Two exclusions:

- Matches inside fenced code blocks pass — code blocks may legitimately quote prior layouts without triggering the guard.
- Filename allowlist (two entries today: `spec/adrs/_toolkit/0031-bifurcated-install-layout.md` and `architect/_toolkit/install-layout.md` — the latter so this doc's own example block can name `.claude/rules/<file>.md` etc. without the guard tripping). New allowlist entries need a comment explaining why.

When the guard fires, it prints `path-guard: <relative-path>:<line>: <text>` for each violation and exits non-zero.

## Drift detection

`pnpm prism:check` runs the same logic as `pnpm prism:build` but in dry-run mode — if any platform-copy file would change, it reports drift and fails. This catches:

- Out-of-band edits to a platform copy (the file no longer matches its canonical source)
- Forgotten rebuilds (canonical was edited but `prism:build` wasn't run)
- Renames in canonical (old platform copies remain when canonical files move)

The cleanup function under `removeDeletedManagedContent` handles the last case — it detects build copies whose canonical source no longer exists (recognized via the area-level `.ai-skill-generated` marker) and removes them.

Platforms without managed content are treated as opt-out, not drift. The signal is the area-level `.ai-skill-generated` marker — if no copied area carries it inside `<platformDir>/`, `prism:build` has never run for that platform and `prism:check` skips it. This keeps fresh clones passing on platforms the contributor hasn't built locally yet (e.g. `.agents/` is gitignored in this repo's dogfood install — `.codex/` and `.cursor/` are committed, so only per-user files like `.codex/codex-config.toml` and each tool's `worktrees/` are ignored). Once any area is built and the marker is written, drift detection picks the platform up on subsequent checks. Build mode always copies and writes the marker.

## Cross-reference lint

`pnpm prism:check` includes a prose cross-reference check (`scripts/ai-skills/crossref-lint.ts`) that scans carrier files for references that don't exist on disk. The tool is intentionally narrow: it resolves only **repo-root-absolute** references — paths starting with `.prism/`, `scripts/`, `.ai-skills/`, or `templates/`. These are the paths the monorepo materializes and can verify.

Relative links (`../` and `./`) are deliberately skipped. Canonical content carries relative links authored to resolve in the consumer's installed platform tree — where `rules/` and `skills/` are siblings under the platform dir — which is a different directory layout from the partial `.prism/` monorepo tree. Verifying them from the monorepo root would produce false failures by design, so they are excluded.

A green crossref-lint run therefore means the repo-root-absolute class resolves cleanly — not that every prose cross-reference resolves. When a doc carries relative links, verify them against the consumer install surface (`templates/install/.prism/`) rather than the canonical tree.

## Packaging-parity gate

Every file the CLI reads from `prismSourceRoot` at runtime must be present in the published tarball. `scripts/ai-skills/verify-pack-parity.ts` — wired into `pnpm prism:check` as `prism:verify-pack`, which `prepublishOnly` runs transitively — asserts that each entry in its hand-maintained `RUNTIME_READ_PATHS` list appears in `npm pack --dry-run --json` output, failing with a named-file message otherwise. Unit tests structurally cannot catch this class: they read the source tree, never the tarball. That gap is how `.ai-skills/config.schema.json` shipped git-tracked but omitted from `package.json` `files` in 0.7.1, breaking `adopt`/`doctor`/`update` in the published package while `init` (which never reads the schema) survived (plan `bug-adopt-missing-schema`, bug #1). When a new runtime read of a packaged file is added, add its path to `RUNTIME_READ_PATHS` — the tradeoff for a list that a static scanner can't yet derive.

## Bundle-safe entry detection

Every subcommand and build script that can also run standalone ends with an "am I the entry script?" guard so its `main()` fires only when invoked directly. The obvious form — `fileURLToPath(import.meta.url) === path.resolve(process.argv[1])` — is correct for a file run on its own but wrong inside the `dist/cli.js` esbuild bundle: `format: "esm"` bundling collapses every folded-in module's `import.meta.url` to the single output file's URL, so that equality holds for every bundled guard at once. The shipped 0.7.3 CLI ran every subcommand's `main()` on any `prism` invocation for exactly this reason.

The pattern for any CLI entry point is `isDirectCliEntry(entryName)` in `scripts/ai-skills/lib/cli-entry.ts`: it compares the entry script's basename (`path.basename(process.argv[1])`, extension stripped) against `entryName`. The bundle's entry basename is always `cli` (or the global-link symlink name), never a subcommand, so no folded-in module treats itself as the entry and `cli.ts`'s `process.argv[2]` switch stays the sole dispatcher. Basename comparison survives bundling; `import.meta.url` comparison does not.

Do not reach for the other fix — reconfiguring esbuild to preserve per-module URLs. `resolveSelfPrismSource` in `scripts/ai-skills/update.ts` relies on the collapse: it reads `fileURLToPath(import.meta.url)` to locate the package root from `dist/cli.js` inside `node_modules`. Preserving per-module URLs would fix the guards but break self-location. `import.meta.url` is the wrong tool for the guard and the right tool for self-location — so the fix stays at the guard level.

**Membership is the transitive import graph, not direct imports.** Any file that carries the entry guard and is reachable from `cli.ts`'s import graph — at any depth — is folded into the bundle and needs the bundle-safe check. Classifying by direct imports alone undercounts: `build.ts` (via `update.ts`) and `verify-manifest-coverage.ts` (via `ownership.ts`'s `compileMatcher`, reached through `classifyPath`) sit two hops from `cli.ts` and carried the same collapsed-guard bug. When adding or auditing an entry guard, walk the transitive graph. A literal `grep "resolve(process.argv[1])"` sweep undercounts twice: a transitively-reached file looks standalone but isn't, and `migrate-skill.ts` spreads its guard across a dynamic `import("node:url")` a single-line search never matches. A clean conversion leaves zero occurrences of the old guard pattern in a rebuilt `dist/cli.js`.

The compiled bundle is the only surface that reproduces this class: unit tests import source modules where each `import.meta.url` is its own file, so they structurally cannot collapse. `scripts/ai-skills/cli-bundle.test.ts` builds a throwaway bundle via `buildBundle` and spawns it — the same "exercise the compiled artifact, not the source tree" shape as § Packaging-parity gate.

## Where to look

- `scripts/ai-skills/build.ts` — the copy and cleanup orchestration in `main()`
- `scripts/ai-skills/path-guard.ts` — the standalone guard module
- `scripts/ai-skills/lib/cli-entry.ts` — `isDirectCliEntry`, the bundle-safe entry guard used by every CLI subcommand and bundled build script
- `.ai-skills/definitions/paths.json` — `canonical.contentRoot` and `generated.platformContentCopies` declare the source/target dirs
