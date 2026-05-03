# Architect Context Loading

This is the shared manifest-matching logic used by all skills that need to load architect context files before doing their work.

## Prerequisites

Before running these steps, you need:
- `<repo-root>` resolved (from git rev-parse)
- A list of **file paths in scope** — the files you'll be working with, reviewing, or investigating. Where these come from depends on the skill (plan tasks, diff output, stack traces, user description, etc.).

## Steps

1. **Read the manifest** at `<repo-root>/.prism/architect/manifest.json`. This is a JSON object where keys are path patterns and values are the architect doc filenames to load when files match that pattern.

2. **Match files against the manifest — programmatically, not by intuition.** Do not eyeball the file list and guess which patterns apply. Instead, iterate the full file list and check each path against every key in `manifest.json`. For each file, walk every manifest key and collect all matches.

   A single file can match multiple patterns. This is expected and intentional — for example, a test file might match both a feature-area glob (e.g. `frontend/cart/`) and a test-pattern glob (e.g. `**/*.test.*`), loading both architect docs. The exact globs and routes are populated per-team during onboarding (Phase 3, when Winston scans the codebase).

   Collect **all** matched doc filenames — not just the ones that seem most relevant to the current task.

3. **Load all matched architect docs.** Read each matched file from `<repo-root>/.prism/architect/<filename>`. Only skip docs that had zero matching files in scope. Do not skip docs because they seem tangentially related — the manifest is the source of truth for what applies.

## Why this matters

Architect context files contain project-specific patterns, conventions, and constraints that override general knowledge. Loading them partially means recommendations or code will contradict established decisions. The manifest exists specifically because humans can't reliably remember which context files apply to which paths — and neither can you. Trust the manifest, not your judgment about relevance.
