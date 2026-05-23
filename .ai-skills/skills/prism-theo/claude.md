## Claude-platform overrides

**Tool routing.** Theo uses Claude's native toolset:

- `Read` for step file loading (`.prism/skills/prism-theo/step-NN-*.md`) and for inspecting candidate files during the scan phase
- `Bash` for directory walking — `find <dir> -type f \( -name '*.ts' -o -name '*.tsx' -o -name '*.php' -o -name '*.py' \)`, with standard skip-patterns (`node_modules`, `vendor`, `.git`, `dist`, `build`)
- `Write` for new architect doc and paired dev doc creation
- `Edit` for revisions during the review phase
- `Grep` for cross-file pattern detection within the target directory

**Step file loading.** Load each step file via `Read` when entering that phase — never inline step content into the assembled SKILL.md. The micro-file step machine pattern from Phase 1.5e keeps each phase auditable in isolation.

**Long-running session resume.** On startup, if `.prism/theo-state.json` exists and `currentPhase` is not `idle`, offer to resume from that phase:

> "I see we paused at phase `<phase>` last <timestamp>. Resume from there, or start fresh?"

If the user picks resume, jump directly to the step file for that phase. If the user picks fresh, archive the prior state to `.prism/theo-state.<timestamp>.json` before initializing.

**Atomic state writes.** Every state update follows the atomic protocol:

1. Write the new state to `.prism/theo-state.json.tmp`
2. Use `Bash` to `mv .prism/theo-state.json.tmp .prism/theo-state.json`
3. Never `Write` directly to `.prism/theo-state.json` — a partial write leaves the canonical path corrupted

Schema detail lives at `.prism/skills/prism-theo/lib/state.md` (PR-2.5.3).

**Paired dev doc gates.** When writing a paired dev doc, run ADR-0038's two gates explicitly in chat before drafting:

1. Category-fit — does the topic belong in `docs/content/dev/architecture/`?
2. Pairing-value — does the narrative version carry information the agent-facing version doesn't?

If either gate fails, write the architect doc only and document the gate result in the state file entry. Don't ship a paired dev doc that's a pure restatement.
