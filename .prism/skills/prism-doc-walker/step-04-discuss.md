# Step 04 — Discuss / Route

Branch on the user's choice from step-03. Routes each candidate to its next phase or back to step-03 for the next pending candidate.

## Inputs

- The current candidate from step-03
- User's choice — one of `discuss` / `write` / `skip` / `defer`

## Actions

Branch on the choice:

### `discuss`

Provide deeper context for the candidate:

- Cite the files involved with one-line summaries of why each was flagged
- Walk through the load-bearing reason — name the specific complexity that would reappear if the abstraction were deleted
- Surface the Deletion-Test answer that flagged this candidate
- Offer concrete examples from the cited files where the load-bearing pattern shows up

After discussion, loop back to step-03 for the same candidate. The user picks `write` / `skip` / `defer` with more context.

### `write`

Set the candidate's `status: "drafting"`. Append `step-04-discuss` to `stepsCompleted`. Atomic state write. Advance to step-05 (draft).

### `skip`

Set the candidate's `status: "skipped"`. Record `decidedAt: "<ISO timestamp>"`. Append `step-04-discuss` to `stepsCompleted`. Atomic state write. Advance to step-03 for the next pending candidate.

### `defer`

Set the candidate's `status: "deferred"`. Record `decidedAt: "<ISO timestamp>"`. Append `step-04-discuss` to `stepsCompleted`. Atomic state write. Advance to step-03 for the next pending candidate.

Deferred candidates resurface only on explicit `revisit-deferred` prompt in step-08.

## Exit condition

The current candidate's `status` is `drafting`, `skipped`, or `deferred` (or the user re-entered discussion, in which case the loop continues until they choose one of the three other options).
