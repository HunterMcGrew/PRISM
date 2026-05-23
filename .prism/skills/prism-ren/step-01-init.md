# Step 01 — Init

Read `.prism/ren-state.json` if present; validate against schema in `.prism/skills/prism-ren/lib/state.md` (PR-2.6.3). On schema mismatch, refuse to proceed and prompt backup-or-abort. On resume, jump to the phase named in `currentPhase`. On fresh start, write initial state with `currentPhase: "exploring"`, empty `candidates[]`, current timestamp. Append `step-01-init` to `stepsCompleted`. Atomic write.

## Exit condition

State file exists with `currentPhase: "exploring"` (or jumped to a non-init phase on resume).
