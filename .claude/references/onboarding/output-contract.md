# Atlas — Output Contract

Every file Atlas touches appears in the closing summary. If a file changed and isn't in the summary, that's a bug.

---

## Files Atlas writes

- **`.ai-skills/config.json`** — structurally validated (required fields present and non-empty) before write. Atomic via tmp+rename. The build's token-substitution layer reads this on every `pnpm prism:build` to derive the token map.
- **`.ai-skills/registry/onboarding-state.json`** — append-only step log. New on first-install; updated in place on resume/reconfigure. Atomic write.
- **Generated rule files under `.prism/rules/`** — one file per detected language (`code-standards-<lang>.md`), one security file (`security.md`), and one file per detected framework (`<framework>-guidelines.md`). Each opens with an applicability declaration per the applicability-declaration convention. Skip-if-exists unless `--force`. These files are generated at runtime and do not exist before the first Atlas run.
- **`.prism/rules/acceptance-criteria.md`** — the TAILOR bucket file. Ships as checklist default; Atlas offers the format choice once (skip-if-exists on re-run; not re-fired on reconfigure) and rewrites to Gherkin when the team opts in.
- **`.prism/rules/accessibility.md`** and **`.prism/rules/design-governance.md`** — shipped verbatim (never regenerated). When the detected stack includes UI file types (`.tsx`, `.jsx`, `.vue`, `.svelte`, or `.html`), Atlas appends a one-line applicability declaration below the frontmatter block. Idempotent — skipped if already present.

## Files Atlas updates (via anchor substitution)

- **`.ai-skills/skills/<persona>/shared.md`** (and platform variants) — wherever a `<!-- atlas:<name> -->` / `<!-- atlas:end -->` pair appears, Atlas replaces the empty stub with team-derived content. Known anchors at v1:
  - `atlas:specializes-in` — populated from the detected stack
  - `atlas:domain-context` — populated from the product-domain answer
  - `atlas:examples`, `atlas:workflow-example`, and `atlas:workflow-example-*` — left empty in v1; future Atlas iterations populate these from team artifacts

  Unknown anchors are ignored (warn but don't throw). Orphan anchors are preserved untouched.

## Files Atlas reads (never writes)

- `.ai-skills/config.schema.json` — validation source-of-truth.
- Package-file fingerprints (`package.json`, `composer.json`, `pyproject.toml`, `requirements.txt`, `go.mod`, `Cargo.toml`, `Gemfile`, `mix.exs`, `pom.xml`, `build.gradle`) — for stack detection.
- Doc-tool config files (`nextra.config.*`, `docusaurus.config.*`, `mkdocs.yml`, `.vitepress/config.*`) and candidate doc directories — for doc-layout detection.
- Any paths the user supplies under "existing engineering standards" — read-only inspection.
- Established-asset probe locations for first-contact detection (Batch-1 probe 6): `AGENTS.md`, `.claude/skills/`, `.cursor/skills/`, `.agents/skills/`, `.prism/architect/*.md`, `.prism/spec/adrs/*.md`, `.prism/rules/*.md`, `.prism/.sync-manifest.json`. Also any asset paths the user confirms or adds during the asset-path survey.

---

## Closing summary shape

- **Mode:** first-install / init-bootstrapped / reconfigure / dogfood-self / first-contact
- **Detected stack:** languages, frameworks, evidence paths (or `["unknown"]` sentinel)
- **Files written:** absolute list with one-line reason each
- **Files skipped:** absolute list with the stable reason string ("exists — preserve team hand-edits; pass --force to regenerate")
- **Anchors populated:** count by name with the file:line of each substitution
- **Discovery decisions** *(first-contact only)* — per-asset-class adopt/leave summary
- **Seed-and-sync summary** *(first-contact only)* — the `AdoptSummary` from `pnpm prism:adopt`: files seeded, files synced, any `.bak`-preserved diverged files, baseline manifest written
- **Next steps:** "PRISM is configured. Try `Winston, evaluate the approach for ...` or open a ticket to see Nora pick it up."
