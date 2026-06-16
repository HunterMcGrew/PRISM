---
Number: 0059
Title: First-Contact Adopts via Seed-and-Sync, Not a Second Merge Engine
Status: accepted
Date: 2026-06-16
---

## Context

`pnpm prism:update` ([ADR-0057](./0057-prism-update-merge-model.md)) keeps an *already-onboarded* repo current. It assumes the consumer already has a `.prism/` content root, a `paths.json`, and a `config.json`. An established team that has never had PRISM — any repo that already has its own setup — has none of these. There was no consumer-side install entry: `templates/install/.prism/` is a seed *surface*, but nothing scripted laying it down.

The original first-contact plan feared a first sync into an established repo with no baseline `.sync-manifest.json` would be catastrophic — every file would look brand-new or hand-edited with nothing to diff against. That fear was scoped to the deleted Epic B three-way merge, which genuinely needed a stored base per file. The shipped `prism:update` model dissolves it: the equality check (`consumerHash === incomingHash` → no-op) runs **before** the divergence `.bak` branch, so a pre-manifest install still no-ops byte-identical files instead of `.bak`-ing every file. ADR-0057 names this "the no-manifest path." After one pass, `rewriteConsumerManifest` writes the baseline manifest as a byproduct.

So "bootstrap the baseline" was never a diff-engine problem. It collapsed into two genuinely-unsolved pieces: (1) seed `.prism/` and run the first sync; (2) discover and adopt the team's pre-existing skills, architect docs, ADRs, rules, and docs, which live outside `classifyPath`'s `.prism/`-relative namespace and which the update flow never touches. This ADR records the design that solves both without forking a second merge engine, and it cites [ADR-0058](./0058-single-audience-retires-paired-dev-docs.md) — the docs sweep records a team's existing doc layout into `config.json` rather than mandating a shape, because PRISM no longer dictates doc form.

## Decision

First-contact is **seed + first sync + discovery-adopt** — not a second diff/merge engine.

**(a) `prism:adopt` is the install entry; `prism:update` is steady-state.** `runAdopt` (`scripts/ai-skills/adopt.ts`) seeds `.prism/` from `templates/install/.prism/` via `seedConsumerContentRoot`, then delegates to `runUpdate` to apply PRISM-owned files and write the baseline manifest. The seed never overwrites an existing consumer file — it mirrors `applyIncomingFile`'s `consumerHash === null → written` posture, writing only absent paths and skipping present ones. `runAdopt` refuses when a `.sync-manifest.json` already exists, throwing `"prism:adopt: this repo already has a PRISM baseline — run pnpm prism:update for steady-state."` This is the install-vs-steady-state guard, mirroring `update.ts`'s source==consumer refusal. The guard lives inside `runAdopt` (via `assertConsumerIsEstablished`), not only in the CLI `main()`, so every caller of `runAdopt` inherits the safety invariant — not just the command-line path. After one `prism:adopt` run, the repo uses `pnpm prism:update` forever.

**(a2) No `--dry-run` preview.** First-contact's safety is recover-after-`.bak`, not see-before-write. The seed never overwrites existing consumer files; the sync pass touches only PRISM-owned paths, no-ops byte-identical files, and `.bak`-snapshots every divergence with a non-clobbering name the run summary prints. The "first run eats my existing setup" catastrophe is structurally foreclosed, so a preview would only duplicate `reportSummary`'s after-the-fact account of a fully-reversible run. Implementing a real preview would also thread net-new conditional behavior through the `update.ts` merge core that ADR-0057 froze — doubling every write site into a would-write/write branch on PRISM's most safety-critical path — which contradicts the no-second-engine principle below. So no flag exists; the verification path is a throwaway-fixture run asserting the `AdoptSummary` and the `.sync-manifest.json` baseline.

**(b) First-contact is permanently, fully repo-agnostic.** It detects and adopts whatever an established repo already has — its skills, architect docs, ADRs, rules, docs, in standard *or* non-standard locations — through one generic path: survey the user about each asset class and its paths → run a discovery sweep over the union of detected and user-supplied locations → construct each asset into canonical PRISM structure (adopt) or record it consumer-owned (leave). The discovery sweep generalizes the existing `prism:migrate-skill` CLI for skills and the rule-placement test for rules/docs/ADRs — it never re-implements decomposition. The entire flow is driven by detection plus `config.json`; there is never a branch that keys on which repo it is. Every established repo is treated identically — no repo is a special case. A team-specific code path is the failure mode this principle permanently forecloses — the survey + discovery + seed-and-sync flow already handles arbitrary established repos, so there is nothing left to special-case.

The two safety pieces above — the no-op-before-`.bak` ordering and the seed's never-overwrite-existing posture — are the same design principle: a first-contact run is fully reversible, so adoption rides the existing merge model rather than building a parallel one.

## Consequences

- **Positive:** No second diff/merge engine. `runAdopt` reuses `runUpdate`; the discovery sweep reuses `prism:migrate-skill`. The seed-and-sync flow degrades gracefully without a baseline manifest by design, so an established repo onboards safely with no hand-authored bootstrap.
- **Positive:** Repo-agnostic by construction. Every established repo rides the same survey → sweep → seed channel. No team-specific code can accumulate.
- **Negative:** A team that diverged from a file PRISM later ships must reconcile their `.bak` by hand — `prism:adopt` preserves the edit but does not merge it, the same tradeoff ADR-0057 carries. The absence of a `--dry-run` preview means the run summary is the team's first full account of what happened, not a preview before it; the recover-after-`.bak` model makes that acceptable, not free.
- **Neutral:** Doc adoption *records* a team's existing layout into the `documentation` config block rather than relocating files, consistent with ADR-0058's single-audience retirement of the paired-dev-doc mandate. A team's flat `.prism/architect/*.md` and `.prism/spec/adrs/*.md` stay consumer-owned by default; migration into the PRISM-owned `_toolkit/` tree is opt-in only.

## References

- [ADR-0057](./0057-prism-update-merge-model.md) — the overwrite/`.bak`/overlay merge model first-contact rides; the no-manifest no-op path.
- [ADR-0058](./0058-single-audience-retires-paired-dev-docs.md) — single-audience docs; why the docs sweep records the existing layout rather than mandating one.
- `scripts/ai-skills/adopt.ts` — `runAdopt`, `seedConsumerContentRoot`, `assertConsumerIsEstablished`, `reportSummary`.
- `scripts/ai-skills/update.ts` — `runUpdate`, `applyIncomingFile`, `rewriteConsumerManifest`, `resolvePrismSource`.
- `.prism/architect/_toolkit/install-layout.md` — § First-contact adoption: `prism:adopt`.
- `.prism/plans/epic-prism-first-contact-reconciliation.md` — the epic plan this ADR closes.
