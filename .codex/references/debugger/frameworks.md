# Sasha — Framework Knowledge & Bug-Type Checklists

Reference for `prism-debugger`. Read this when categorizing a bug, narrowing the search space before opening files, or scanning for a known class of failure. The skill body pins the cognitive lens (How Sasha Thinks); this file carries the model-resident catalog: the bug-category mental models, isolation techniques, root-cause-analysis frameworks, and the stack-area bug checklists.

> _Framework catalog + bug-type checklists — categorize first, investigate second._

## Framework Knowledge

This is the debugging knowledge that informs Sasha's methodology. Not steps to follow mechanically — reasoning frameworks that make the systematic process work.

### Bug Category Mental Models

Experts maintain a taxonomy that immediately narrows the search space:

| Category | Symptoms | Check first |
|----------|----------|-------------|
| **Data bugs** | Wrong value displayed, unexpected content | Inspect inputs at the boundary where behavior goes wrong. Wrong value, wrong type, missing key, extra item. |
| **Control flow bugs** | Wrong behavior, skipped logic | Trace execution path. Wrong branch taken, early return, loop count, swallowed exception. |
| **Timing bugs** | Intermittent, works with breakpoint, "sometimes" | Add timestamps to logs, check async ordering. Race conditions, stale closures, effects running before DOM ready. |
| **Integration bugs** | Works in isolation, fails composed | Inspect data at the boundary between systems. API contract mismatch, serialization asymmetry, shared state assumptions. |
| **Environmental bugs** | Works in dev, fails in prod | Compare environments. Missing env var, browser difference, CDN cache, different package version. |

### Isolation Techniques

**Wolf fence (binary search)**: Checkpoint at the midpoint. Correct there? Bug is downstream. Wrong there? Bug is upstream. Repeat. Log n steps instead of n.

**Delta debugging** (Andreas Zeller): Systematically minimize the input or changeset that triggers the bug. Remove half the input; if the bug persists, remove half again. Produces a minimal reproduction in minutes instead of hours.

**Git bisect**: Binary search across commit history. `git bisect start HEAD <known-good>`, mark good/bad at each step. Searches 1,024 commits in 10 steps. The guilty commit's diff is usually small enough to see the bug immediately.

### Root Cause Analysis

**5 Whys**: "The modal shows stale data." Why? "State wasn't reset on close." Why? "No cleanup function." Why? "Effect treated mount as the only lifecycle event." Why? "Author didn't know the effect needed cleanup." Root cause: missing cleanup, not stale data. Each "why" moves from symptom toward systemic fix.

**Symptom → Proximate → Root**: Always distinguish the three layers. The fix targets the root cause. Defense-in-depth may address the proximate cause. The symptom is never the fix target.

**Ishikawa (fishbone) categorization**: When the cause isn't obvious, enumerate possibilities by category: code logic, data, environment, configuration, timing, dependencies. This prevents tunnel vision on code when the cause might be infrastructure or data.

## What to watch for

### Frontend runtime
- State updates causing unexpected re-renders or stale closures
- Server/client boundary violations (DOM access in server-only code, serialization errors)
- Type mismatches between API returns and component expectations
- Lifecycle / hook misuse (conditional calls, missing cleanup, dependency-array mistakes)

### Accessibility
Common accessibility bugs to check for:
- Focus not moving to expected element after interaction
- Missing or incorrect ARIA attributes
- Keyboard traps (focus enters but cannot leave)
- `aria-live` regions not announcing dynamic content
- Interactive elements not reachable via Tab
- Focus indicators missing or invisible

### Backend runtime
- Missing or incorrect type validation causing silent failures
- Unvalidated input reaching business logic
- Concurrency or hook-priority conflicts
- API response shape mismatches against the frontend contract
