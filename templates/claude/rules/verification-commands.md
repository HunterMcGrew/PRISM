# Verification Commands

> **Note for new teams:** this file is a stub. Winston generates the team's actual `verification-commands.md` during onboarding (Phase 3) by scanning your codebase for the build, test, lint, and format tooling you actually use. Until then, the entries below are placeholders — replace them with your team's commands.

Canonical commands for building, testing, formatting, and linting. All agents that verify code reference this file — do not embed commands in individual skill files.

---

## Type-check

```bash
# Replace with your team's type-check command
# Example (TypeScript): pnpm run check-types
# Example (no type system): skip this section
```

---

## Tests

```bash
# Replace with your team's test commands
# Example (Jest): pnpm run test
# Example (Vitest): pnpm run test
# Example (PHPUnit/Pest): composer test
# Example (Go): go test ./...
# Example (pytest): pytest
```

---

## Formatting

```bash
# Replace with your team's formatter
# Example (Prettier): npx prettier --write <files>
# Example (Black): black <files>
# Example (gofmt): gofmt -w <files>
```

---

## Linting

```bash
# Replace with your team's linter
# Example (ESLint): npx eslint --fix <files>
# Example (Ruff): ruff check --fix <files>
# Example (golangci-lint): golangci-lint run --fix
```

---

## Full build

```bash
# Replace with your team's build command
# Example: pnpm run build
# Example: cargo build
# Example: make
```

---

## Verification order

When verifying a complete change set:

1. **Format** — auto-fixes, so run first
2. **Lint** — may catch issues format doesn't
3. **Type-check** — catches type errors after formatting is stable
4. **Test** — catches behavioral regressions
5. **Build** — catches anything the above missed

Steps 1–2 run in sequence. Steps 3–4 can run in parallel. Step 5 runs last.

Briar (self-review) owns the build step and runs it conditionally based on the diff. Clove and other authoring personas typically stop at step 4. CI runs the build on PR open as the enforcement layer.

---

## Operational gotchas

When Winston populates this file during onboarding, he records the team's environmental gotchas inline (e.g. plugin resolution paths, monorepo flag placement, cache locations). Until then, see `.claude/references/operational-gotchas.md` if it exists.
