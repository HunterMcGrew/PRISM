---
paths:
  - "**/*.ts"
  - "**/*.tsx"
  - "**/*.js"
  - "**/*.jsx"
  - "**/*.php"
  - "**/*.py"
  - "**/*.go"
---

# Verification Commands

Canonical commands for building, testing, formatting, and linting. All agents that verify code should reference this file — do not embed commands in individual skill files.

---

## TypeScript Type-Check

```bash
# Backend plugin
cd <repo-root>/backend/plugins/gravity-platform-core && pnpm run check-types

# Frontend
cd <repo-root>/frontend && pnpm run check-types

# All packages (from repo root)
cd <repo-root> && pnpm run check-types
```

**Gotcha:** `pnpm run check-types` at the repo root runs `tsc` in all workspace packages. The `--filter` flag is a **pnpm** argument, not a tsc argument — use `pnpm --filter=gravity-platform-core run check-types` from the repo root, or `cd` into the package and run `pnpm run check-types` directly. `--filter` must come before the `run` command — placing it after the script name passes it to `tsc`, not pnpm.

---

## Tests

### Frontend (Jest)

```bash
cd <repo-root>/frontend && npx jest --testPathPatterns="<pattern>" --no-coverage
```

- `--testPathPatterns` (plural) — `--testPathPattern` (singular) is deprecated and will error
- Pattern matches against file paths: `"mega-menu-info-banner"`, `"resolver.test"`, `"MegaMenuInfoBanner"`
- Run all frontend tests: `cd <repo-root>/frontend && pnpm run test`

### PHP (Pest)

```bash
cd <repo-root>/backend/plugins/gravity-platform-core

# Unit tests only (no WordPress)
composer test:unit

# Integration tests (requires WP test DB)
composer test:integration

# All tests
composer test
```

---

## Formatting (Prettier)

```bash
cd <repo-root>/frontend && npx prettier --write <files>
```

**Gotcha:** Prettier plugins (`@ianvs/prettier-plugin-sort-imports`, `prettier-plugin-tailwindcss`) are installed in the `frontend` package, not at the repo root. Running `npx prettier` from the repo root will miss plugin configuration and produce wrong output. Always run from `frontend/`.

- Use `--write` directly — skip `--check` when you know which files you changed
- Use `--check` in review contexts (Briar, Eric) where you're verifying someone else's work

For backend TypeScript files (editor blocks), prettier still runs from `frontend/` using relative paths:

```bash
cd <repo-root>/frontend && npx prettier --write ../backend/plugins/gravity-platform-core/src/blocks/<block-name>/<file>
```

---

## Linting (ESLint)

```bash
cd <repo-root>/frontend && npx eslint --fix <files>
```

Same directory requirement as Prettier — run from `frontend/`.

For backend TypeScript files (editor blocks), ESLint also runs from `frontend/` using relative paths:

```bash
cd <repo-root>/frontend && npx eslint --fix ../backend/plugins/gravity-platform-core/src/blocks/<block-name>/<file>
```

---

## Storybook

```bash
# Build static Storybook — catches broken stories, missing imports, bad props
cd <repo-root>/frontend && pnpm run build-storybook

# Run interaction and a11y tests against the built output (serves, tests, tears down)
cd <repo-root>/frontend && pnpm run test-storybook:ci
```

- `build-storybook` must run before `test-storybook:ci` — the CI script serves from `storybook-static/`
- `test-storybook:ci` handles the dev server lifecycle automatically — no second terminal needed
- Visual review is a human task — agents verify stories compile and pass automated checks, not visual correctness

---

## Full Build

```bash
cd <repo-root> && pnpm run build
```

Runs the build across all workspace packages. Use for final verification before PR.

---

## Verification Order

When verifying a complete change set:

1. **Format** — `prettier --write` (auto-fixes, so run first)
2. **Lint** — `eslint --fix` (may catch issues prettier doesn't)
3. **Type-check** — `tsc` (catches type errors after formatting is stable)
4. **Test** — `jest` / `composer test` (catches behavioral regressions)
5. **Build** — full build (catches anything the above missed)

Steps 1-2 can run in sequence. Steps 3-4 can run in parallel (independent). Step 5 runs last.

Step 5 is owned by Briar (self-review) and runs conditionally based on the diff — see [thrive-code-review-self/SKILL.md § Build step](../skills/thrive-code-review-self/SKILL.md). Clove and other authoring personas do not run the full build during implementation; they stop at step 4. CI runs the build on PR open as the enforcement layer.

---

## See also

- For environment gotchas (ESLint plugin resolution, PHP tests + `composer install`, Prettier from `frontend/`, Turbopack cache, etc.) see `.prism/references/operational-gotchas.md`.
