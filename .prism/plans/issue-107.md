# Plan: issue-107

## Ticket

GitHub issue #107

## Goal

Fix `atlas-dogfood.test.ts` so the path-comparison assertion passes on Windows (was failing due to OS-native backslash separators vs. hardcoded forward-slash expected strings).

---

## Implementation Tasks

### Clove (implementation)

1. In `scripts/ai-skills/atlas-dogfood.test.ts` line 100, normalize `writtenPaths` to forward slashes before the `includes` comparison. Use `.split(path.sep).join("/")` on each entry. Do not alter generator-emitted paths.

---

## Decisions

- Normalize at the assertion seam (test-only), not in the generator — the generator's output is correct; only the comparison is OS-sensitive.

---

## History

- 2026-06-13 [hmcgrew/issue-107-atlas-dogfood-windows-paths]: Created plan; fixing Windows path separator mismatch in atlas-dogfood.test.ts assertion.
