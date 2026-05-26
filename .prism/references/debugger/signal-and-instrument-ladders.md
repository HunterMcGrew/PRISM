# Sasha — Signal & Instrumentation Ladders

Reference for `prism-debugger`. Read this when building the Phase 1 feedback-loop signal or climbing the Phase 4 diagnostic-technique ladder — you need the rung enumerations. The skill body pins the lens (climb cheapest-and-most-precise first; stop at the first rung that produces a deterministic pass/fail). This file carries only the rung lists.

> _The two ladders' rungs — Phase 1 signal construction, Phase 4 instrumentation._

## Phase 1 — Signal-construction ladder

Climb cheapest-and-most-precise first. Stop at the first rung that produces a deterministic pass/fail.

1. **Failing test** — assert the expected behavior; let it fail. The test is the signal.
2. **`curl` or HTTP script** — for API or service bugs; replays the failing request deterministically.
3. **CLI invocation with fixture diff** — for CLI tools; capture expected-vs-actual output.
4. **Headless browser script** — for frontend bugs that need a rendered page (Playwright, Puppeteer).
5. **Replay trace from production** — replay captured request logs or recorded sessions.
6. **Throwaway harness** — wrap the suspect function with hardcoded inputs to bypass the larger system.
7. **Fuzz loop** — when the failing input is unknown but the failure mode is, generate inputs until one triggers it.
8. **`git bisect` harness** — for "it used to work" bugs; the harness is the script bisect runs at each step.
9. **Differential loop** — compare output between two versions, two environments, or two inputs that should agree.
10. **HITL bash** — when no automated signal exists, a one-line shell command the human runs that returns 0 or 1 deterministically. Cheapest fallback.

## Phase 4 — Diagnostic-technique (instrumentation) ladder

Climb cheapest-and-most-precise first. Most bugs are caught on rungs 1–3; reaching rung 10 is rare but legitimate when the bug resists everything below.

1. **Stack trace inspection** — pinpoint the literal line where the error surfaces. The cheapest signal, often the most precise.
2. **Binary search by git bisect** — find the commit that introduced the bug. Best when the bug has a clear good/bad transition in history.
3. **Print-statement bisection** — add `[DEBUG-<hash>]` instrumentation at suspected boundaries (see the instrumentation-hygiene reference for the tagged-instrumentation gate).
4. **State snapshot diffing** — capture state before and after the failure point; diff the two to surface what changed.
5. **Dependency isolation** — disable suspected components one at a time and observe whether the bug persists. Confirms which component owns the failure.
6. **Reproduction minimization** — strip the failure context to the smallest input that still fails. The act of minimizing often reveals the cause.
7. **Behavior comparison against a known-good environment** — same code, different machine. Isolates environment-class causes (config, dependencies, data).
8. **Time-travel debugging** — replay the failure with state inspection at each step. Useful when the failure depends on accumulated state.
9. **Adversarial input generation** — fuzz the suspect surface. Useful when the input space is large and the failure is input-dependent.
10. **Pair the bug** — explain it to another agent or human; the act of explaining often surfaces the cause. Rubber-duck debugging, formalized.

The ladder is stack-agnostic. Per-stack tooling (specific bisect commands, profilers, time-travel debuggers) belongs in Atlas-generated per-stack rules — not here.
