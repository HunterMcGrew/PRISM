# Step 02 — Scan

Walk the target directory and surface candidate decisions worth documenting. Cartographic mode — name shape, don't grade quality.

## Inputs

- `state.targetDir` (from step-01)

## Actions

1. **Walk the directory.** Use `Bash` to enumerate code files, skipping standard noise paths:

   ```bash
   find <state.targetDir> -type f \( -name '*.ts' -o -name '*.tsx' -o -name '*.js' -o -name '*.jsx' -o -name '*.php' -o -name '*.py' -o -name '*.go' -o -name '*.rs' -o -name '*.rb' -o -name '*.ex' -o -name '*.java' -o -name '*.kt' \) -not -path '*/node_modules/*' -not -path '*/vendor/*' -not -path '*/.git/*' -not -path '*/dist/*' -not -path '*/build/*'
   ```

2. **Apply the Deletion Test in cartographic mode.** For each cluster of related files, ask: "if I deleted this module/pattern/abstraction, where does the complexity reappear?" Name the shape, not the quality verdict. Ren grades; Theo names.

3. **Four candidate signals.** Each signal is a separate scanning pass:

   - **Multi-file coupling** — the same concept is touched across 3+ files with no doc explaining the shape.
   - **Load-bearing single files** — one file's structure dictates how callers shape their input.
   - **Surprising patterns** — the implementation contradicts what a reader would assume from the names.
   - **Constraints** — a comment or test enforces a non-obvious rule.

4. **Stage candidates.** For each candidate surfaced, allocate a UUID (`crypto.randomUUID()` or `Bash uuidgen`) and add to `state.candidates[]`:

   ```json
   {
     "id": "<uuid>",
     "status": "pending",
     "topic": "<short noun phrase>",
     "files": ["<rel path>", "..."],
     "loadBearingReason": "<one paragraph — why this is worth documenting>",
     "suggestedShape": "architect-doc" | "architect-doc-plus-paired" | "adr-candidate",
     "pairedDevDoc": false,
     "createdAt": "<ISO timestamp>"
   }
   ```

   Check `documentation.keepsDevDocs` in `.ai-skills/config.json` when deciding `pairedDevDoc` — when `false` (or absent), set `pairedDevDoc: false`; when `true`, consider a paired dev doc. Flag `adr-candidate` when the triple-gate from Phase 1.5e fires (hard-to-reverse + surprising + genuine trade-off).

5. **Update state.** Set `currentPhase: "presenting"`, push the directory onto `visitedPaths`, append `step-02-scan` to `stepsCompleted`. Atomic write.

## Exit condition

`state.candidates[]` has at least one entry with `status: "pending"`, OR Theo reports "no load-bearing decisions surfaced in this directory" and advances to step-08 (continue/finish).
