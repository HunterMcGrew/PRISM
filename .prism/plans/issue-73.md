# Plan: issue-73

## Ticket

GitHub issue #73 — https://github.com/HunterMcGrew/PRISM/issues/73

## Goal

Emit runtime-native artifacts so Codex honors the ADR-0035 tier model: inline always-on (Tier-1) rule bodies into a generated block in `AGENTS.md`, and guard that generated block against drift in `pnpm prism:check`. (Cursor half shipped in a prior PR — this goal is the Codex-only remainder.)

---

## Spike Findings (pre-implementation verification — 2026-06-15)

Spike posted to issue #73 corrected the original premise:

- **Cursor half: confirmed done.** `.cursor/rules/` emits 27 `.mdc` files with translated `globs:`/`alwaysApply:` frontmatter, zero stray `paths:`. Task 1 above shipped this. No additional Cursor work.
- **Codex half: gap confirmed.** `.codex/rules/` emits 27 verbatim `.md` copies — 7 carry a `paths:` key Codex never reads. Codex auto-loads only `AGENTS.md`; it has no rules-directory auto-load mechanism. Root `AGENTS.md` contains a `## Behavioral norms` pointer table (links to `.prism/rules/<file>.md`) but does not inline rule bodies. Net: Tier-1 rule bodies do not reach Codex.
- **#64 unblocked.** Issue #64 (Slim AGENTS.md) merged 2026-06-13 via PR #106. `AGENTS.md` is clean and ready for the generated block.
- **OPEN decision below (Tier-1 source of truth):** the spike confirms ADR-0035 prose identifies the Tier-1 set by example (rules without `paths:` frontmatter = Tier 1). No machine-readable registry exists today. The build can derive the Tier-1 set at build time by inspecting each `.prism/rules/*.md` for absence of `paths:` frontmatter — Winston to confirm this is the right approach before Clove implements.

---

## Implementation Tasks

### Clove (implementation)

1. **Cursor dialect emission (shipped — 2026-06-11).** When `pnpm prism:build` copies rules to `.cursor/rules/`, rewrite the frontmatter to Cursor's dialect and rename `.md` → `.mdc`. Canonical stays Claude-dialect `.md` per ADR-0035.

2. **Codex Tier-1 inlining (not started).** Inline Tier-1 rule bodies into a marker-fenced generated block in `AGENTS.md`; Tier-2 rules are handled per the resolved OPEN decision below. Winston to write the detailed task spec before Clove implements.

3. **Check-mode AGENTS.md drift guard (not started).** Extend `pnpm prism:check` to flag when the `AGENTS.md` generated block is out of sync with the current Tier-1 rule set. Winston to write the detailed task spec.

### Winston (architecture — pre-implementation)

1. Read `scripts/ai-skills/build.ts` (`copyContentToPlatformDir`, `copyContentFileWithSubstitution`, check-mode path) and `scripts/ai-skills/rule-dialect.ts` (existing `RuleDialect` abstraction) to understand the content-copy pipeline before designing the inlining approach.
2. Read `AGENTS.md` current state (post-#64 slim) to identify the exact insertion point for the generated Tier-1 block — specifically the `## Behavioral norms` pointer table.
3. Resolve the three OPEN decisions in `## Decisions`.
4. Write detailed task specs for Clove tasks 2–3 per `.prism/rules/implementation-task-detail.md`: file paths, exact change descriptions, verification commands, sequence.

### Briar (self-review — post-implementation)

1. Confirm the generated block in `AGENTS.md` contains all Tier-1 rule bodies (manifest-listed rules without `paths:` frontmatter).
2. Confirm `pnpm prism:check` exits non-zero when the generated block is manually drifted (spot-test one rule body edit).
3. Confirm Tier-2 rules (with `paths:` frontmatter) are excluded from the generated block.
4. Confirm build passes: `pnpm prism:build && pnpm prism:check`.

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

- **OPEN — TBD, needs Winston input. How to identify the Tier-1 set at build time.** ADR-0035 names Tier-1 rules in prose (rules without `paths:` frontmatter). No machine-readable registry exists. The spike-confirmed approach is: derive the set at build time by inspecting each `.prism/rules/*.md` for absence of `paths:` frontmatter. However, this conflates Tier 1 (universal, belongs in AGENTS.md) with Tier 3 (skill-internal, does not) — both have no `paths:` frontmatter. ADR-0035 explicitly says Tier 3 rules have "no manifest entry" and are "referenced from one skill." The manifest (`manifest.json`) is a reliable discriminator: rules listed in the manifest are Tier 1 or Tier 2; rules absent from the manifest are Tier 3. **Default path (used until resolved):** derive the Tier-1 set by taking all `.prism/rules/*.md` entries that (a) exist in `manifest.json` AND (b) carry no `paths:` frontmatter. Winston to confirm or propose an alternative.

- **OPEN — TBD, needs Winston input. How to handle Tier-2 rules in the Codex generated block.** Codex has no path-tiering primitive. Options: (a) inline only Tier-1 rules, skip Tier-2 entirely from the block (acceptable because Tier-2 rules cover file-type-specific work Codex may not invoke — accessibility, architect-doc-verification, design-governance, skill-authoring, implementation-task-detail, verification-commands, acceptance-criteria); (b) use nested `AGENTS.md` files by cwd for Tier-2 rules. **Default path (used until resolved):** inline Tier-1 only. Winston to assess whether nested `AGENTS.md` is worth the added complexity for the 7 affected Tier-2 rules.

- **OPEN — TBD, needs Winston input. Whether to strip stray `paths:` keys from `.codex/rules/` verbatim copies.** 7 `.codex/rules/*.md` files carry `paths:` YAML frontmatter Codex ignores. Options: (a) strip via a Codex-specific rule dialect in `copyContentToPlatformDir` (analogous to the Cursor `.md`→`.mdc` transform); (b) leave as inert dead keys (no behavioral harm). **Default path (used until resolved):** leave as-is. Winston to confirm or flip.

---

## History

- 2026-06-11 [hmcgrew/issue-73-cross-runtime-tiers]: Shipped task 1 (Cursor dialect emission). Added `scripts/ai-skills/rule-dialect.ts` + tests; threaded `RuleDialect` through the content-copy functions; updated `literal-allowlist.json` cursor entries to `.mdc`; synced `install-layout.md` and `rule-loading-tiers.md` byte-identical claims. Tasks 2–3 (Codex AGENTS.md inlining + its check) deferred — blocked on a Tier 1 source-of-truth; see the OPEN Decision.

- 2026-06-13 [hmcgrew/issue-73-cross-runtime-tiers]: Merged origin/main; resolved AGENTS.md routing-table conflict (took main's version with Sol row) and worktree-isolation rename/delete (honored main's delete, stale .mdc dropped out). Ran prism:build — 14 new Tier 1 .mdc rule copies emitted; prism:check green 158/158.
- 2026-06-15 [hmcgrew/issue-73-codex-tier-inlining]: Nora re-opened implementation lane on new branch. Spike findings recorded: Cursor confirmed done, Codex gap confirmed, #64 unblocked. Three OPEN decisions posted for Winston to resolve before Clove starts tasks 2–3.

---

## Acceptance Criteria

### Behavioral

- [ ] Given a Codex session starts, When `AGENTS.md` is loaded, Then every Tier-1 rule body (manifest-listed rules without `paths:` frontmatter) is present in the generated block — inlined, not just linked. (REQ-1)
- [ ] Given `pnpm prism:build` runs, When a Tier-1 rule body in `.prism/rules/` changes, Then `AGENTS.md`'s generated block reflects the updated body. (REQ-1)
- [ ] Given `pnpm prism:check` runs against a manually drifted `AGENTS.md`, When the generated block does not match the current Tier-1 rule bodies, Then the check exits non-zero with a meaningful error. (REQ-1)
- [ ] Given a Tier-2 rule (with `paths:` frontmatter), When `pnpm prism:build` runs, Then that rule body is NOT inlined into the `AGENTS.md` generated block. (REQ-1)

### Non-behavioral

- [ ] The generated block in `AGENTS.md` is delimited by build-managed begin/end markers so contributors know not to hand-edit it. (REQ-2)
- [ ] `pnpm prism:build` and `pnpm prism:check` remain green for the full suite after changes land. (REQ-3)
- [ ] All three OPEN decisions are resolved with verdicts recorded in `## Decisions` before Winston hands off to Clove. (REQ-4)

### AC Adjustments

### AC Sync Log

| Date | Agent | Action | Plan | Linear |
| ---- | ----- | ------ | ---- | ------ |
| 2026-06-15 | Nora | Initial AC generated from spike findings | created | N/A (GitHub-tracked) |

---

## PR Readiness (Codex inlining — tasks 2–3)

- [ ] No critical or major issues
- [ ] Types correct — no `any`, no unsafe `as`
- [ ] No stray console.logs or debug artifacts
- [ ] Tests written for new logic and edge cases (check-mode guard)
- [ ] All OPEN decisions resolved (Winston gate)
- [ ] Build passes — last run: pending
- [ ] PR description up to date
- [ ] Lasting decisions promoted to architect context (if applicable)

**Last updated:** 2026-06-15

---

### PR Readiness — Task 1 (Cursor dialect — shipped PR #XX)

- [x] No critical or major issues
- [x] Types correct — no `any`, no unsafe `as`
- [x] No stray console.logs or debug artifacts
- [x] Tests written for new logic and edge cases
- [x] Build passes — last run: 2026-06-11
- [x] PR description up to date
- [x] Lasting decisions promoted to architect context (if applicable)

**Last updated:** 2026-06-11
