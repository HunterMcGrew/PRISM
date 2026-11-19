# Performance and cost

Does the diff make something slower or costlier than it needs to be? Trigger: the diff changes a render path, data fetching, a query, a loop over external data, or a shipped bundle.

Its enumeration unit, severity, finding shape, and coverage line are in `REVIEW.md`.

## Checklist

- **Work repeated inside a loop.** A query, a request, a parse, or an allocation that runs once per item when once per batch would do. Name the loop and the cost per pass.
- **An unbounded query or fetch.** A read with no limit, no pagination, or no timeout over data that grows. Say what bounds it today and what happens when that bound is passed.
- **A hot path that gained I/O.** A render path, a request handler, or a per-event callback that now reads a file, calls the network, or hits the database where it didn't before.
- **A cache bypassed or invalidated.** A change that skips an existing cache, builds a key that never repeats, or invalidates more than it needs to.
- **A large asset added to a shipped bundle.** A new dependency, image, font, or data file that grows what the user downloads or what the build ships. Give the size, measured where the repo's build can measure it.

Severity follows impact times likelihood, per `REVIEW.md` § `Severity`. A cost on a path that runs once at startup is lower than the same cost per request. Measure before claiming a regression, and when no measurement is possible, say so on the finding instead of asserting a number.

Stack checks for this pass, when the repo has them: `.prism/review/stack/performance.md`.
