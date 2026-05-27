# Step 02 — Explore

Walk the directory tree from the user-provided root (or repo root default). Use Glob and Grep to locate friction signals:

- **Shallow modules** — wrappers that fail the deletion test
- **Pass-through abstractions** — interfaces with one caller (cite `code-standards.md § General` "two adapters = real seam")
- **Premature abstractions** — generic shapes built for hypothetical variation
- **Leaky seams** — abstractions whose internals callers must know about
- **Untested interfaces** — public APIs without tests
- **Dead code** — modules with no live callers (verify with grep before flagging)

For each candidate, allocate a UUID and stage in `state.candidates[]` with `status: "pending"`, populate `topic`, `files`, `problemStatement`, `suggestedApproach` (`collapse | extract | inline | move`), `strength` (placeholder, set in step-03), `createdAt`. Set `currentPhase: "categorizing"`. Append `step-02-explore` to `stepsCompleted`.

## Exit condition

`candidates[]` populated. Advance to step-03.
