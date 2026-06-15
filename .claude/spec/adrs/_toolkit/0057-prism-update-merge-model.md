---
Number: 0057
Title: prism:update Merge Model — Overwrite, .bak, Overlay
Status: accepted
Date: 2026-06-15
---

## Context

`pnpm prism:update` pulls PRISM's latest skills and context into an already-onboarded consumer repo. The danger of a naive copy is concrete: PRISM ships its own ADRs, rules, and architect docs, and consumers hand-edit some of them. A plain overwrite silently loses consumer edits; a refuse-on-conflict stops the update dead on the first diverged file. A real already-onboarded repo was read as a read-only reference and confirmed the failure mode — PRISM-lineage toolkit docs sat flat alongside the consumer's own product docs in one directory, so "what is PRISM allowed to overwrite" was undecidable by path.

Two models were on the table. Epic B proposed a three-way merge (base, consumer, incoming) — accurate but heavy: it needs a stored base for every file, a merge driver, and a conflict-resolution surface the consumer has to drive. BMAD's model was the alternative: overwrite PRISM-owned files freely, preserve any consumer-diverged file as `.bak` (never silent-lose), and route all consumer customization into `.prism/custom/` which the sync never touches. The three-way merge's accuracy did not earn its operational cost for content files that are overwhelmingly either untouched or wholesale-replaced by an upstream rewrite.

This decision was built and shipped across the `prism-update` epic (issue #154, plans/epic-prism-update.md). The three-way model is documented in `epic-prism-sync-steady-state.md` and is superseded by this one for the `prism:update` path.

## Decision

`pnpm prism:update` uses overwrite + `.bak` + overlay. No three-way merge.

The per-file algorithm runs over PRISM-owned files only (classified by `classifyPath` in `ownership.ts`):

- File absent in consumer → write incoming.
- `consumerHash === incomingHash` → no-op. This equality check runs **before** the divergence branch, so an already-current file is never backed up — this is also the no-manifest path: a pre-manifest install with no recorded base hash still no-ops byte-identical files instead of `.bak`-ing every file.
- `recordedHash` exists and `consumerHash === recordedHash` → overwrite freely (clean base, consumer never diverged).
- Otherwise (genuinely diverged) → snapshot the consumer file to `<file>.bak` (non-clobbering: `<file>.bak`, then `<file>.bak.1`, …), then write incoming. Each `.bak` is reported in the run summary.
- Deletions: files in the consumer manifest but absent from PRISM source → remove (`.bak` first if diverged).

The last-known PRISM base is recorded per file in `.prism/.sync-manifest.json` (dot-prefixed so existing walkers skip it; gitignored because `sourceCommit`/`generatedAt` are volatile). Consumer customization lives in `.prism/custom/`, classified `consumer` and never written by the sync — see `install-layout.md` § Consumer overlay.

## Consequences

- **Positive:** No silent loss — every diverged consumer edit is preserved as a `.bak` the run summary names. No merge driver, no conflict UI, no stored full base copy; a content hash per file is enough. The no-op-before-`.bak` ordering means a clean or pre-manifest install does not flood the consumer with spurious `.bak` files.
- **Negative:** A consumer who diverged from a file PRISM later rewrote must manually reconcile their `.bak` against the new version — the tool preserves the edit but does not merge it. Repeated divergence accumulates `<file>.bak.N` snapshots the consumer must prune.
- **Neutral:** This supersedes Epic B's three-way merge for the `prism:update` path. The branch ordering inside `applyIncomingFile` is load-bearing (no-op check first) and is documented in the function's JSDoc.

## References

- `.prism/plans/epic-prism-update.md` — the 7-phase build; `## Decisions` (merge model, no-manifest decision point)
- `.prism/architect/_toolkit/install-layout.md` — `_toolkit/` namespace, consumer overlay, ownership namespaces
- `scripts/ai-skills/update.ts` — `applyIncomingFile`, `backupConsumerFile`, `applyDeletedFile`
- `scripts/ai-skills/ownership.ts` — `classifyPath`, `PRISM_OWNED_GLOBS`, `CONSUMER_OWNED_GLOBS`
- `epic-prism-sync-steady-state.md` — the superseded three-way merge model
