# Plan: followup-190-migrate-doc

> Closed: 2026-06-16

## Ticket

GitHub issue #190 — Create `docs/ai-skills/migrate-skill.md` user-facing doc for `pnpm prism:migrate-skill`.

---

## Goal

Write a user-facing doc for the `pnpm prism:migrate-skill` CLI added in #171 / PR #177 so the tool is discoverable and documented at parity with sibling tool docs in `docs/ai-skills/`.

---

## Implementation Tasks

### Eli (documentation)

1. Read `scripts/ai-skills/migrate-skill.ts` to ground flags, behavior, and error cases in source.
2. Write `docs/ai-skills/migrate-skill.md` following the sibling doc template (`ren.md`, `theo.md`). Sections: What it does / When to use / How it works / Flags and arguments / Example usage / Outputs / Error cases / Relationship to prism-skill-forge / See also.
3. Run `pnpm run prism:check` to confirm the tree is clean (doc is not build-scanned but proves no collateral damage).
4. Commit and push.

---

## Decisions

- **Doc is hand-authored, not build-mirrored.** `docs/ai-skills/` is hand-authored; crossref-lint skips `docs/`. No `pnpm prism:build` step needed.
  - → no promotion needed (ticket-tactical authoring constraint; the doc itself is the durable surface)
- **No `_meta.js` update needed.** The sibling docs do not use a `_meta.js` — the directory is flat Markdown with no Nextra-style sidebar config present.
  - → no promotion needed (structural observation about `docs/ai-skills/` as it exists today; doesn't generalize as an architectural pattern)
- **Links verified manually.** GitHub blob URLs to `migrate-skill.ts`, `prism-skill-forge/shared.md`, and `syncing.md` all checked against the live repo.
  - → no promotion needed (one-time link verification step; the CLI-vs-skill-forge relationship is captured in the doc and the `followup-171-skillforge-script.md` plan)

---

## History

- 2026-06-16 [hmcgrew/prism-190-migrate-doc]: Eli wrote `docs/ai-skills/migrate-skill.md`; `pnpm run prism:check` green.
- 2026-06-16 [hmcgrew/prism-190-migrate-doc]: Eli fixed two accuracy gaps flagged by Briar: Codex strip count is "up to three" (utility skills strip two, not three); ID normalization applies to any ID, not just `prism-`-prefixed ones.
- 2026-06-16 [hmcgrew/prism-190-migrate-doc]: Eli added Decision verdict sub-bullets (Eric flagged missing) and closed plan; all three Decisions are ticket-tactical, no promotion needed.
