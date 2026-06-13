# Plan: issue-73

## Ticket

GitHub issue #73 — "Cross-runtime rule-tier honoring: Cursor `.mdc`/`globs:` + Codex AGENTS.md block"

## Goal

Make the ADR-0035 rule-loading tiers honored by Cursor and Codex, not just Claude Code — the build copies canonical Claude-dialect rules verbatim today, so Cursor and Codex receive a dialect they don't consume.

---

## Implementation Tasks

### Clove (implementation)

1. **Cursor dialect emission (shipped).** When `pnpm prism:build` copies rules to `.cursor/rules/`, rewrite the frontmatter to Cursor's dialect and rename `.md` → `.mdc`. Canonical stays Claude-dialect `.md` per ADR-0035.

2. **Codex always-on inlining (not started).** Inline Tier 1 rule bodies into a marker-fenced (BEGIN/END comment) generated block in `AGENTS.md`; list Tier 2 rules by path. The marker nests inside issue #64's slimmed `AGENTS.md`.

3. **Check-mode AGENTS.md drift (not started).** Extend `pnpm prism:check` to flag `AGENTS.md` Codex-block drift. (The Cursor half of check mode ships with task 1 — drift detection compares the on-disk Cursor copy against the dialect-transformed output, so a Cursor rule carrying `paths:` instead of `globs:`/`alwaysApply:` already fails check.)

---

## Decisions

- **Cursor dialect is a per-platform translation in the content-copy step, not a canonical-source change.** A `RuleDialect` (`scripts/ai-skills/rule-dialect.ts`) carries three operations — `transformContent`, `mapTargetRelativePath`, `mapSourceRelativePath` — threaded through `copyContentToPlatformDir`, `syncPlatformContentCopy`, and `removeDeletedManagedContent`. Claude and Codex use the identity (`verbatimRuleDialect`); Cursor uses `cursorRuleDialect`.
  - **Root cause:** the build copied rule content verbatim, so Cursor received `.md` files carrying `paths:`, which its `.mdc`/`globs:`/`alwaysApply:` loader doesn't read — the tiers were inert on Cursor (lessons.md 2026-06-04).
  - **Alternatives considered:** (a) change canonical rules to the Cursor dialect — rejected, ADR-0035 fixes the canonical as Claude-dialect and Claude/Codex read it directly; (b) a one-off rename pass after copy — rejected, the cleanup/drift machinery needs the rename to be reversible, so the mapping belongs in one place.
  - **Chosen approach:** a dialect object passed per-platform. Beats (b) because `removeDeletedManagedContent` can reverse-map `.mdc` → `.md` to decide orphan-hood, and the orphan test additionally re-maps the source forward to catch stale pre-dialect `.md` copies.
  - **Implementation guidance:** the transform applies only to the `rules` area; every other copied area and every other platform passes through unchanged. The area marker (`.ai-skill-generated`) is never renamed.
  - → promoted to .prism/architect/install-layout.md (Cursor-dialect divergence documented in the concrete example) and the paired dev doc `docs/content/dev/architecture/rule-loading-tiers.md`

- **Stale `.cursor/rules/*.md` copies are cleaned by a forward-map check in the orphan pass.** A target is live only when its canonical source exists AND that source maps forward to the exact target name. A pre-dialect `.cursor/rules/foo.md` fails the forward check (source `foo.md` now maps to `foo.mdc`) and is removed.
  - → no promotion needed (build-internal cleanup mechanics; self-evident from `removeDeletedManagedContent`)

- **OPEN — TBD, needs a Tier 1 source-of-truth before tasks 2–3 can ship.** The frontmatter-less rule set conflates Tier 1 (universal, belongs in the AGENTS.md Codex block) with Tier 3 (skill-internal, does not). ADR-0035 names the Tier 1 list in prose but no machine-readable registry encodes it. **Default path (used until resolved):** tasks 2–3 stay unimplemented; the Cursor half (task 1) ships standalone. Resolving this needs either a Tier 1 registry in `.ai-skills/definitions/` or a tier field on each rule's frontmatter.

---

## History

- 2026-06-11 [hmcgrew/issue-73-cross-runtime-tiers]: Shipped task 1 (Cursor dialect emission). Added `scripts/ai-skills/rule-dialect.ts` + tests; threaded `RuleDialect` through the content-copy functions; updated `literal-allowlist.json` cursor entries to `.mdc`; synced `install-layout.md` and `rule-loading-tiers.md` byte-identical claims. Tasks 2–3 (Codex AGENTS.md inlining + its check) deferred — blocked on a Tier 1 source-of-truth; see the OPEN Decision.

- 2026-06-13 [hmcgrew/issue-73-cross-runtime-tiers]: Merged origin/main; resolved AGENTS.md routing-table conflict (took main's version with Sol row) and worktree-isolation rename/delete (honored main's delete, stale .mdc dropped out). Ran prism:build — 14 new Tier 1 .mdc rule copies emitted; prism:check green 158/158.

---

## PR Readiness

- [x] No critical or major issues
- [x] Types correct — no `any`, no unsafe `as`
- [x] No stray console.logs or debug artifacts
- [x] Tests written for new logic and edge cases
- [x] Build passes — last run: 2026-06-11
- [x] PR description up to date
- [x] Lasting decisions promoted to architect context (if applicable)

**Last updated:** 2026-06-11
