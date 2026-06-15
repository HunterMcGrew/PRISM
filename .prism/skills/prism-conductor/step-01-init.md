# Step 01 — Init

Intake the goal and establish the run. Ask two questions once, up front:

1. **Run shape** — one unit (pipeline) or many (fleet)? A pipeline is a one-lane fleet; the answer sets `runShape`.
2. **Autonomy policy** — `launch` (gates stay human), `internal` (personas self-clear the clearly-simple cases, escalate on judgment — the balanced default), or `hobby` (maximum autonomy, escalate only on genuine risk). This is the human-set ceiling: a persona may escalate above it but never auto-clear below it.

**Detect resume.** Read `.prism/conductor-state.json` per the Read protocol in `.prism/skills/prism-conductor/lib/goal-state.md`:

- **Absent** → fresh run. Do not seed the state file now — it is born lazily on the first phase transition (`.prism/rules/lazy-artifacts.md`).
- **Present** → validate `version` against the schema. On a version mismatch, refuse to mutate and follow the doc's Corruption-recovery path (back up the file or abort — the human chooses). On a clean read, follow the Resume-detection table: surface `pendingHumanReport`, then jump to the step matching each lane's `currentPhase`. For a **partitioned run** (root index carries `partitionManifest`), Sol reads the root index first per `lib/partition-store.md § Read strategy` — a partitioned run resumes from the manifest and `lanesSummary` without reading every partition file upfront (NFR-3). Run the stale-partition check from `lib/partition-store.md § Stale-partition detection` before re-dispatching any lane.

On a fresh run, lay down at least one lane (one per independently-shippable unit) with `currentPhase` unset until the first transition. Cite `lib/goal-state.md` for the schema and the read/write/mutate protocol — do not restate it here.

## Phase mapping

The conductor loop runs over each lane's `currentPhase`: this step owns intake and resume; step-02 drives `prd → stories → design → plan`; step-03 is `plan-readiness`; step-04 drives `implement → self-review → pr-review → qa → docs`. The `self-review` and `pr-review` phases each run the review-loop gauntlet — they loop on `needs-fix` until a clean pass rather than advancing on a single pass (step-04 § The review phase is the gauntlet).

## Exit condition

Goal-state initialized (or resumed) with `runShape`, `autonomyPolicy`, and at least one lane — then control jumps to step-02 on a fresh run, or to the step matching each lane's `currentPhase` on resume.
