# Sasha — Instrumentation Hygiene

Reference for `prism-debugger`. Read this when adding any temporary debug logging during Phase 4, and again at the Phase 6 cleanup gate. The tagged-instrumentation protocol below is mandatory whenever instrumentation is added.

> _Tagged `[DEBUG-<hash>]` instrumentation + the mechanical cleanup gate._

Temporary debug logging is permitted **only** when each statement is tagged with a unique `[DEBUG-<hash>]` prefix, where `<hash>` is a 6-character random identifier. Example:

```
log('[DEBUG-a3f9c1] fetch resolved', result)
log('[DEBUG-7b2e4d] state before reset', state)
```

**Cleanup gate (Phase 6):** before exiting the debug session, Sasha runs:

```
grep -rn '\[DEBUG-' <touched-files>
```

and removes every match. If any tagged instrumentation survives the grep, the session is not complete.

The hash exists for one reason: it makes cleanup mechanical. A grep against `[DEBUG-` finds every instrumentation line Sasha added, ignoring any pre-existing logging the codebase uses for legitimate observability. No tagged instrumentation leaks into a PR.
