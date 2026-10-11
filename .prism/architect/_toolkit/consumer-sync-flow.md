# Consumer Sync Flow

How `prism init`, `prism adopt`, and `prism update` put PRISM's content into a consumer repo and keep it current. What lands where, and who owns it once it is there, is [`install-layout.md`](./install-layout.md). The hook runtime that rides the same update is [`hook-runtime.md`](./hook-runtime.md).

---

## Consumer content comes from one function

Both `prism:adopt`'s canonical pass and every `prism:update` pull PRISM-owned content from the genericized install seed at `templates/install/.prism`, never PRISM's own raw `.prism/` dogfooding tree. The single source is `resolvePrismContentRoot(prismSourceRoot)` in `scripts/ai-skills/update.ts`. `runAdopt` calls `resolvePrismContentRoot` before delegating to `runUpdate`, and `runUpdateCli` calls it directly. Adopt's phase-A seed builds the same path inline. Two call sites that must resolve identically is why this is a shared function rather than an inlined constant — centralizing it prevents the two entry points from drifting apart.

The invariant exists because the raw `.prism/` tree carries PRISM-internal literals — de-thriving references, `THR-`/`PRISM-NNN` ticket citations, dogfooding plans — that must never reach a consumer. Token substitution can't strip them (it rewrites only configured template tokens like `${PROJECT}`, not prose ticket refs), so the seed — already curated and build-verified — is the only correct source. The class of bug this closes: a prior split where `update.ts` sourced from raw `.prism/` while adopt seeded from the install seed let adopt phase B overwrite the correct seed content with dogfooding literals on every consumer adopt (plan `bug-adopt-missing-schema`, bug #2).

Because the install seed intentionally ships no `.sync-manifest.json`, version metadata for the consumer manifest resolves from `package.json` (`resolvePrismVersion`) plus a git-or-`"unknown"` commit — not from any shipped manifest — threaded as an optional `VersionMetadata` so unit-test callers keep a manifest-reading fallback.

**Seed dogfooding-literal canary.** `runConsumerSeedLiteralGuard` (`scripts/ai-skills/literal-guard.ts`) scans the install seed at build time and fails `pnpm prism:build`/`prism:check` on any non-allowlisted dogfooding literal. The authoritative pattern is `SEED_DOGFOODING_PATTERN` in that file — origin-project references, PRISM's own `PRISM-NNN` ticket citations, the de-thriving migration marker, and hardcoded tracker names (`Linear`), which the seed must stay neutral of because it ships to consumers on any tracker (ADR-0032). The tracker match is word-bounded and case-sensitive, so lowercase uses (CSS `linear` easing, "linear time") pass. `Sol`, `Iris`, and `ADR-NNNN` are deliberately **not** matched: they are legitimate framework content that ships to consumers. Asserting on the seed is deterministic precisely because the seed is what a consumer receives verbatim. Legitimate provenance lines are exempted per-file in `.ai-skills/definitions/literal-allowlist.json` — the source of truth for current exemptions, which are mostly files that legitimately name Linear as a supported tracker, plus a handful of platform mirrors carrying a citation their canonical source carries too.


## First-contact adoption: `prism init` then `prism adopt`

A cold consumer — a repo that has never had PRISM — needs to run two commands before the agent-driven onboarding begins:

1. **`npx @huntermcgrew/prism init`** — writes `.ai-skills/config.json` so the consumer repo is identifiable. This is deterministic and requires no AI agent: it detects the tech stack, collects a handful of required values (project name, ticket prefix, ticket system, GitHub owner, and repo), and writes the config. When stdin is a TTY, it prompts interactively. In CI or scripted contexts, pass the same values as flags: `--project`, `--ticket-prefix`, `--ticket-system` (`linear` or `github-issues`), `--github-owner`, `--github-repo`. `--linear-team` is required with `--ticket-system linear`. The other optional flags are `--org`, `--linear-workspace`, `--default-branch`, `--slack-channel`. `init` refuses and exits if a config already exists — edit the file directly or remove it to re-init. `init` writes only `config.json` and nothing else; adopt, update, and Atlas are responsible for everything after it.

2. **`npx @huntermcgrew/prism adopt`** — seeds `.prism/` and projects the full persona roster. This is the first-contact install step described in the section below. If adopt detects that `config.json` is missing, it stops and tells the consumer to run `init` first. Adopt also self-heals the consumer's `.ai-skills/definitions/paths.json` — provisioning it from the PRISM package copy when it is absent or structurally incomplete (an older schema missing `generated.platformContentCopies`) — so the cold `init`→`adopt` path is robust against a `paths.json` that `init` never writes; a complete consumer file (even a customized one) is left untouched.

3. **(Later, in-agent) Atlas** — handles the richer, conversational onboarding: generating per-team rules, writing stack-appropriate security guidance, and populating stub anchors with team context. Atlas owns this layer because it requires judgment that a deterministic CLI step can't provide; adopt is seed-and-sync rather than a merge engine — `scripts/ai-skills/adopt.ts` implements this.

The split is intentional: `init` is the repeatable, CI-safe bootstrap; Atlas is the AI-assisted configuration pass that runs once per team.

**The config write path honors both ticket systems.** `writeOnboardingConfig`/`toOnDiskConfig` in `scripts/ai-skills/lib/onboarding-config.ts` set `ticketSystem.kind` to `"github-issues"` or `"linear"` depending on the input: a non-empty `linearTeam` emits `{ kind: "linear", teamKey }`, an empty one emits `{ kind: "github-issues" }` with no team key. `validateOnDiskConfig` accepts both. This is a capability of the config layer, not an `init` detail — any caller of `writeOnboardingConfig`, including Atlas, can produce a truthful github-issues config. Atlas's existing Linear output stays byte-identical because it always supplies `linearTeam`. The build reader (`tokens.ts` `loadConfig`/`deriveTicketTracker`) and `config.schema.json` already accepted both kinds; this closed the write-side gap.

---

The install seed ([`install-layout.md`](./install-layout.md) § The templates/install seed surface) is what a consumer repo _receives_; `pnpm prism:adopt` is what _lays it down_ the first time. It is the install entry for a repo that has never had PRISM — an established team adopting PRISM into a codebase that already has its own setup. `scripts/ai-skills/adopt.ts` implements it.

`runAdopt` runs two steps in sequence:

1. **Seed `.prism/` from `templates/install/.prism/`.** `seedConsumerContentRoot` recursively copies the install seed into the consumer's `.prism/`, writing only paths the consumer does **not** already have and skipping any that exist. It never overwrites an existing consumer file — it mirrors the `consumerHash === null → written` posture from `applyIncomingFile`.
2. **Run the first sync.** `runAdopt` then delegates to `runUpdate` (ADR-0057), which applies PRISM-owned files and writes the steady-state baseline manifest via `rewriteConsumerManifest`. The no-op-before-`.bak` ordering means byte-identical consumer files are left untouched and only genuinely diverged files are preserved as `.bak` — so the first sync into an established repo with no baseline manifest is safe (ADR-0057's no-manifest path).

Around those two steps it provisions `paths.json` first and, with `--seed-agents-md`, writes an absent `AGENTS.md` last.

After this one run, `.prism/.sync-manifest.json` exists and the repo is in steady-state: `pnpm prism:update` handles all future syncs.

**The manifest-exists refusal is the install-vs-steady-state guard.** `runAdopt` calls `assertConsumerIsEstablished` before seeding; if a `.sync-manifest.json` is already present, it throws `"prism:adopt: this repo already has a PRISM baseline — run pnpm prism:update for steady-state."` The guard lives inside `runAdopt`, not only in the CLI `main()`, so every caller of `runAdopt` inherits the invariant. This mirrors `update.ts`'s source==consumer refusal: each entry point refuses the other's job so the two flows' preconditions stay clean. `--dry-run` previews the whole sequence with nothing written. First-contact's real safety is still recover-after-`.bak`: the seed never overwrites, and the sync no-ops byte-identical files and `.bak`-snapshots divergence.

## Steady-state persona-skill distribution

After the first `prism:adopt` run, every subsequent `pnpm prism:update` (and every future `prism:adopt` on a fresh repo) automatically renders the full `prism-*` persona roster into the consumer's configured skill directories. The mechanism lives in `runUpdate` (`scripts/ai-skills/update.ts`) — the shared function both `prism:update`'s `main()` and `prism:adopt`'s `runAdopt` call — so both entry points reach the same render step without duplication (see plan prism-242 Decision "Adopt-path seam").

**What the consumer receives.** For each `prism-*` skill in the PRISM source roster, `generatePlatformSkills` (`scripts/ai-skills/generate-skills.ts`) renders the skill body with the consumer's own token map — `${PROJECT}` becomes the consumer's project name, `${TICKET_PREFIX}` becomes their ticket prefix, and so on — and writes the rendered output to the platform directory for each host the consumer's `hosts` config key declares, all three when the key is absent (`deriveOptedIn` in `scripts/ai-skills/lib/hosts.ts` derives the per-output flags from `hosts`):

- `.claude/skills/<id>/SKILL.md` (Claude Code)
- `.agents/skills/<id>/SKILL.md` (Codex)
- `.cursor/skills/<id>/SKILL.md` (Cursor)

Codex agent adapters (`.toml`) and Claude agent definitions (`.md`) render into their respective output roots using the same token map. Every written skill directory carries the managed marker (`.ai-skill-generated`) so orphan cleanup knows what to remove — see [`install-layout.md`](./install-layout.md) § Skill namespace ownership.

**The host filter lives at the consumer call site.** `buildPlatformDirs` returns all three platform dirs unconditionally, and `runUpdate` filters that list against the consumer's `hosts` before handing it to the content copy. The filter stays there rather than inside the helper because `pnpm prism:build` calls the same helper and has to keep all three — PRISM's own platform output is committed and other people read it, so a helper that honored a consumer-facing config key would decide what PRISM itself builds.

**The consumer's tokens, not PRISM's.** The render uses `deriveTokenMap(loadConfig(consumerRepoRoot))` from the consumer's own `.ai-skills/config.json`, not any PRISM-side values. A skill body that says "Create an issue in ${PROJECT}" lands as "Create an issue in Acme" in an Acme consumer. No unresolved token literals survive in any rendered output — the leftover-token guard (`runLeftoverTokenGuard` in `literal-guard.ts`) runs over the consumer's skill output roots immediately after the render and fails the update if any are found (see the guard details in [`output-guards.md`](./output-guards.md)).

**Orphan cleanup.** When a persona is removed from the PRISM roster, the next `prism:update` removes its skill directories from the consumer's platform dirs. Cleanup is gated on the managed marker, not on the `prism-*` prefix: a consumer-authored `prism-*`-named skill directory without the marker is never a delete target. The same cleanup fires a second way: when a host leaves the consumer's `hosts` list, `refreshPlatformSkills` sweeps that host's entire skill root, agent-definition root, and Codex config (the skill root gated on the managed marker, the agent-definition root gated on the generated header line each file carries, `codex-config.toml` on the generated header line it carries — it is per-user and gitignored, so it has no marker of its own and its content is the only honest test of whether PRISM wrote it), and `refreshPlatformDirs` sweeps that host's platform content dir (`removeManagedContentAreas` in `scripts/ai-skills/build.ts`, gated on each area's own marker) — a persona leaving the roster and a host leaving `hosts` are the same cleanup at different granularity.

**Consumer-authored skills are untouched.** The render writes only to roster-member IDs, and cleanup deletes only marker-bearing directories that are no longer in the roster. A consumer's own skills — whether they use a non-`prism-*` prefix or a custom-prefixed name — are never written or deleted by `prism:update`.

**The hook runtime rides the same update.** See [`hook-runtime.md`](./hook-runtime.md) for what it delivers, to which hosts, and how a consumer turns it off.

**Idempotency.** `generatePlatformSkills` uses `writeFileIfChanged` for every output: if the rendered content matches the file already on disk, no write occurs. A `prism:update` run on a repo already at the current PRISM version is a no-op across the roster.

The decision record for this feature is ADR-0062 ("Consumer skill distribution via prism:update").
