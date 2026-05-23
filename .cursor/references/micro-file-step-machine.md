# Micro-File Step Machine

A pattern for structuring long-running, resumable workflows as a sequence of small per-step markdown files. Each phase of work lives in its own `step-NN-name.md` file; resumability is tracked via a `stepsCompleted` array in the workflow's frontmatter.

**Source:** BMAD's `bmad-create-architecture` workflow established this shape. PRISM adopts it as a named pattern so future skills with multi-phase workflows don't reinvent the structure.

## When to use it

The pattern is appropriate when **all three** apply:

- The workflow has discrete, ordered phases (4+) where each phase produces an output the next phase reads.
- A single run plausibly outlasts a context window — either because the work itself is large, or because the user pauses and resumes across sessions.
- The phases are auditable in isolation — a reviewer can look at step 3's output without re-running steps 1 and 2.

Skip the pattern when the workflow is short (≤3 phases), single-session, or when the phases are tightly entangled and don't produce intermediate artifacts.

## File naming convention

- One file per step: `step-NN-<slug>.md` where `NN` is zero-padded (`step-01-scan.md`, `step-02-classify.md`, `step-10-finalize.md`).
- Files live in the skill's working directory or a workflow-scoped subdirectory (e.g. `.prism/workflows/<workflow-id>/step-NN-*.md`).
- The slug names the phase's intent, not its mechanics — `step-03-grill-candidates.md`, not `step-03-loop.md`.

## Frontmatter shape

Each workflow has a top-level state file (e.g. `.prism/workflows/<workflow-id>/state.json` or YAML frontmatter on the workflow's entry doc) tracking completion:

```yaml
workflowId: ren-walk-2026-05-22
stepsCompleted: [1, 2, 3]
currentStep: 4
status: in-progress
```

- `stepsCompleted` is an integer array — the step numbers that finished. Append on completion; never edit retroactively.
- `currentStep` is the next step to execute. On resume, the skill reads this and jumps to the corresponding file.
- `status` enumerates `not-started | in-progress | paused | complete | aborted`.

## Resume detection

When the skill starts, it checks for an existing state file before creating a new one:

1. Look for a state file matching the workflow ID (or the current ticket / branch / user context).
2. If found and `status` is `in-progress` or `paused`: load `currentStep`, read the corresponding `step-NN-*.md`, and offer the user resumption: "Found prior run at step N — continue from step N, restart from step 1, or abort?"
3. If not found: create a fresh state file with `stepsCompleted: []`, `currentStep: 1`, `status: in-progress`.

The skill never silently overwrites a prior state file. Resumption is always offered, even if the user clearly wants a fresh run — explicit confirmation is cheaper than discovering the override after the fact.

## Who cites this pattern

- **Theo** (Phase 2.5, architect-doc walker) — uses the pattern for the multi-phase scan → identify candidates → present → write loop. State at `.prism/architect-walker-state.json`.
- **Ren** (Phase 2.6, refactor scout) — uses the pattern for the explore → categorize → present → grill loop. State at `.prism/ren-state.json`.
- **Parker** (Phase 3, PRD persona) — uses the pattern for greenfield mode's brain-dump → stakes calibration → draft → rubric → finalize sequence. State at `.prism/prds/<slug>/state.yaml`.
- **Winston** (existing) — does not currently use the pattern, but if plan mode grows beyond its current shape, this is the pattern it should grow into.

## Why a reference doc rather than inlining

Three downstream consumers (Theo, Ren, Parker) need the same pattern shape with workflow-specific instantiations. Inlining the pattern into each skill triples the maintenance surface and guarantees drift. The reference doc owns the pattern; each skill cites it and documents only what's specific to its workflow.

The pattern is also relevant outside PRISM's current persona set — any future skill that grows multi-thousand-line SKILL.md should compare against this pattern before bloating further.
