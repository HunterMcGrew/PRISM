---
paths:
  - "**/*.ts"
  - "**/*.tsx"
  - "**/*.js"
  - "**/*.mjs"
---

# Verification Commands

Canonical commands for building, testing, formatting, and linting. Commands live in `.ai-skills/config.json#commands` and are referenced as `{{commands.*}}` tokens — this file is the human-readable rendering of that data. Do not embed command strings in individual skill files; update config.json instead.

---

## Command map (`.ai-skills/config.json#commands`)

| Slot | Token | Command |
| --- | --- | --- |
| typecheck | `{{commands.typecheck}}` | `pnpm run prism:check-types` |
| test | `{{commands.test}}` | `pnpm run prism:test` |
| lint | `{{commands.lint}}` | `pnpm run prism:crossref-lint` |
| format | `{{commands.format}}` | _(none — PRISM has no standalone formatter step)_ |
| build | `{{commands.build}}` | `pnpm run prism:build` |

**When Atlas onboards a new team**, it populates these slots from the detected tech stack and regenerates this file. The token column is the stable reference skill prose uses; the command column is what executes at runtime.

---

## Type-Check

```bash
pnpm run prism:check-types
```

Runs `tsc --noEmit` against `scripts/ai-skills/tsconfig.json`. Covers the build scripts only — the `.prism/` markdown surface has no TypeScript.

---

## Tests

```bash
pnpm run prism:test
```

Runs `tsx --test scripts/ai-skills/*.test.ts`. Covers build-pipeline unit tests (token substitution, seed-mirror, drift detection, manifest coverage).

Run a single test file directly when iterating:

```bash
node --test scripts/ai-skills/build.test.ts
```

---

## Lint

```bash
pnpm run prism:crossref-lint
```

Prose cross-reference linter — checks ADR refs, install surface links, and skill cross-references. Exit 0 means all references resolve.

---

## Format

No standalone formatter step for PRISM. The TypeScript build scripts follow the repo's editor config; Prettier is not installed as a project dependency. If a team adds a formatter, Atlas will populate `commands.format` during onboarding and this section updates.

---

## Build

```bash
pnpm run prism:build
```

Runs `build.ts` (syncs seed mirror, validates manifest) then the test suite. Use for final verification before PR. Equivalent to `pnpm run prism:check` minus the explicit type-check and crossref-lint (those run as part of `prism:check`).

For full validation (all gates in sequence):

```bash
pnpm run prism:check
```

---

## Verification Order

When verifying a complete change set:

1. **Type-check** — `{{commands.typecheck}}` (catches type errors first)
2. **Lint** — `{{commands.lint}}` (catches prose reference errors)
3. **Test** — `{{commands.test}}` (catches behavioral regressions)
4. **Build** — `{{commands.build}}` (catches anything the above missed)

Steps 1–3 can run in parallel (independent). Step 4 runs last.

Step 4 is owned by Briar (self-review) and runs conditionally based on the diff. Clove and other authoring personas stop at step 3 during implementation; CI runs the build on PR open.
