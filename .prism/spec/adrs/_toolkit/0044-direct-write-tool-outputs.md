# ADR-0044: Direct-write tool outputs; commit `.cursor/skills/`

**Status:** Accepted
**Superseded-in-part-by:** ADR-0058
**Date:** 2026-05-23

> **Superseded in part by [ADR-0058](./0058-single-audience-retires-paired-dev-docs.md).** Only this ADR's paired-doc obligation is retired — the mandated companion at `docs/content/dev/ai-skills/compatibility.md`. The direct-write spine — tool-namespaced build outputs, the `.generated/` staging collapse, and the committed-`.cursor/skills/`-vs-ignored-Codex-config split — stands and is live.

## Context

`pnpm prism:build` historically wrote Cursor skills to `.generated/cursor-skills/` and Codex native configuration to `.generated/codex-config.toml`, with the `.gitignore` blanket-ignoring `/.generated/`, `/.cursor/`, and `/.codex/`. PRISM never shipped an install script for Cursor — the build wrote to staging and the directory was gitignored, leaving Cursor consumers without a clean install path. (The upstream Thrive dogfood had `scripts/ai-skills/install-cursor.ts` for this; PRISM was extracted before that script was added.) Direct-writing to `.cursor/skills/` and committing the directory makes Cursor a first-class consumer for the first time.

The `.generated/` namespace was a pass-through. Run the deletion test on it: imagine deleting `.generated/`. What complexity disappears? Just the extra namespace. What complexity moves? The build outputs go directly to `.cursor/skills/` and `.codex/codex-config.toml` — places they were always conceptually destined for. No complexity reappears scattered across callers. The staging surface wasn't carrying weight.

Worse, the staging-plus-install model has a known failure mode: drift between what the build writes to staging and what install copies to the destination. As the build evolves, the install script falls behind, and consumers run a stale install against fresh build output.

The Thrive dogfood collapsed `.generated/` in PR #2025 and added a compatibility doc codifying per-tool ownership in PR #2026. PRISM backports both as Phase 1.5f.

## Decision

Direct-write build outputs to their tool-namespaced destinations — no `.generated/` staging:

- Cursor skills land at `.cursor/skills/<id>/SKILL.md`.
- Codex native configuration lands at `.codex/codex-config.toml`.

Commit `.cursor/skills/` to the repo via surgical gitignore (replacing the blanket `/.cursor/`). Cursor consumers get every persona via `git pull` — no install step.

Keep `.codex/codex-config.toml` gitignored because it's a per-user file containing personality, projects, and marketplaces; committing it would clobber consumer customization. Keep `.agents/` fully gitignored because the destination is outside the repo (`~/.agents/skills/`) on consumer machines. PRISM does not yet ship an install script for Codex's per-user destinations — that script is planned for Phase 2 (Atlas's onboarding flow). Pre-Phase-2, Codex consumers either dogfood PRISM directly (PRISM's own install is local-only) or wire `~/.agents/skills/` themselves.

Delete `.generated/` and the staging-aware install scripts targeting it.

## Consequences

- Cursor users get skills on `git pull` — no install step needed for the most common use case.
- Codex users will eventually run a per-user install script (planned for Phase 2; not yet shipped in PRISM) because the per-user destination (`~/.agents/skills/`, `~/.codex/agents/`) lives outside the repo. This is the canonical example of the per-tool rule codified in [`.ai-skills/docs/compatibility.md § Install-Script Scope`](../../../.ai-skills/docs/compatibility.md).
- The committed-vs-ignored split inside each tool namespace becomes a rule that consumers internalize. Recorded in [`.ai-skills/docs/compatibility.md § Per-Tool Directory Ownership`](../../../.ai-skills/docs/compatibility.md).
- Drift risk: someone hand-edits `.cursor/skills/<id>/SKILL.md` directly instead of `.ai-skills/skills/<id>/`. Mitigated by the existing `.ai-skill-generated` marker file convention and `pnpm prism:check` drift detection, both of which already shipped before this ADR.
- Consumer migration cost: PRISM teams with stale clones containing `.generated/` need a one-time `rm -rf .generated/` after pulling. Noted in PR release notes.
- A separate paired dev doc lands at [`docs/content/dev/ai-skills/compatibility.md`](../../../docs/content/dev/ai-skills/compatibility.md) per [ADR-0038](./0038-paired-dev-doc-gates.md). The architect file is the agent-facing spec; the dev doc is the teammate-facing narrative.

## Alternatives considered

**Relocate-only.** Move `.generated/cursor-skills/` → `.cursor/skills/` and `.generated/codex-config.toml` → `.codex/codex-config.toml`, but keep both gitignored. Removes the `.generated/` namespace cleanly with zero consumer contract change.

Rejected: it doesn't solve the actual problem Thrive PR #2025 was solving. Cursor users still run an install step they shouldn't have to. The relocation is half the work and gets none of the consumer-side benefit.

**Match Thrive verbatim.** Commit `.cursor/skills/`, also commit `.codex/codex-config.toml`.

Rejected: committing the Codex config would clobber per-user customization — consumers who tailor their `~/.codex/codex-config.toml` would see their personality, project list, and marketplaces overwritten on every PRISM pull. The asymmetry between `.cursor/skills/` (committed) and `.codex/codex-config.toml` (ignored) is intentional and reflects the per-file user-vs-team ownership.

## References

- Thrive PR #2025 (`.generated/` collapse; commit `.cursor/skills/`)
- Thrive PR #2026 (compatibility doc with Per-Tool Directory Ownership + Install-Script Scope)
- PRISM [ADR-0031](./0031-bifurcated-install-layout.md) — bifurcated install layout (`.prism/` canonical, `.claude/`/`.codex/`/`.cursor/` platform outputs)
- PRISM [ADR-0038](./0038-paired-dev-doc-gates.md) — paired dev doc gates (every new architect doc gets a `docs/` companion)
- PRISM [ADR-0039](./0039-ai-prefix-namespace.md) — `.ai-*` prefix namespace
