# Cross-Reference Checks

How canonical content cites other canonical files, and the build checks that catch a citation that will not resolve. Where canonical content and its platform copies live is [`install-layout.md`](./install-layout.md).

---

## Cross-reference convention

When canonical content cites another canonical file, use `.prism/<area>/<file>`. Every platform's copy of the citing file will resolve correctly via its own auto-load — Claude reads the citation from `.claude/rules/<rule>.md` and resolves `.prism/<area>/<file>` against the canonical location. Codex and Cursor do the same.

Citing `.claude/rules/<file>.md` inside content that gets copied to all three platforms is incorrect — Codex and Cursor consumers don't have a `.claude/` dir. The build-time path guard catches this (see below).

The convention does not apply to:

- Skill bodies under `.claude/skills/<id>/SKILL.md` — these are platform-specific outputs and may legitimately reference platform-specific paths.
- Agent-written content (plans, lessons) — these aren't copied, so platform-specific path mentions in tickets about platform layout don't propagate anywhere.

## Build-time path guard

`scripts/ai-skills/path-guard.ts` runs as part of `pnpm prism:build` and `pnpm prism:check`. It scans every `.md` file under the copied areas of `.prism/` and `templates/install/.prism/`, plus the canonical `.prism/SPEC.md`, and fails the build when it finds a reference matching `(\.claude|\.codex|\.cursor)/(rules|architect|spec|templates|references|plans)/`. The seed ships its SPEC as `SPEC.md.tmpl`, and the guard looks only for `SPEC.md`, so the seed copy is not scanned. Both surfaces share the same allowlist — keys are relative to the surface's content root.

Two exclusions:

- Matches inside fenced code blocks pass — code blocks may legitimately quote prior layouts without triggering the guard.
- A filename allowlist for files whose job is to name platform paths: the ADR on the bifurcated layout, `install-layout.md` (its walkthrough of canonical vs. copy), and this doc (its convention examples). New allowlist entries need a comment explaining why.

When the guard fires, it prints `path-guard: <surface-root>/<relative-path>:<line>: <text>` for each violation, then a count line for that surface, and exits non-zero.

## Cross-reference lint

`pnpm prism:check` includes a prose cross-reference check (`scripts/ai-skills/crossref-lint.ts`) that scans carrier files for references that don't exist on disk. The tool is intentionally narrow: it resolves only **repo-root-absolute** references — paths starting with `.prism/`, `scripts/`, `.ai-skills/`, or `templates/`. These are the paths the monorepo materializes and can verify.

Relative links (`../` and `./`) are deliberately skipped. Canonical content carries relative links authored to resolve in the consumer's installed platform tree — where `rules/` and `skills/` are siblings under the platform dir — which is a different directory layout from the partial `.prism/` monorepo tree. Verifying them from the monorepo root would produce false failures by design, so they are excluded.

A green crossref-lint run therefore means the repo-root-absolute class resolves cleanly — not that every prose cross-reference resolves. When a doc carries relative links, verify them against the consumer install surface (`templates/install/.prism/`) rather than the canonical tree.
