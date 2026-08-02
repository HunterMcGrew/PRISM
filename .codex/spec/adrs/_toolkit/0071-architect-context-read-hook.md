---
Number: 0071
Title: Architect-Context Routing Gains a Read-Triggered Mechanical Enforcement Layer
Status: accepted
Date: 2026-08-02
---

## Context

Architect-context routing keys on the working diff: `prism-architect`'s startup step 4 matches the current diff against `.prism/architect/manifest.json` and loads whatever docs the matched paths route to. That works when the session's diff already touches the file whose context is needed. It fails on a prompt-driven task — "add a rule about X to `code-comments.md`" carries no diff yet, or an unrelated one, so the target path's own architect doc never loads through that route. `.prism/plans/context-delivery-mechanism.md` records this as the diff-blind gap thrive PR #2247 also found and ported a prose fix for.

`Read` is a strict precondition for `Edit` on every host this project targets — the harness will not let a session edit a file it has not read. That makes a hook firing after `Read` a reliable place to land the governing doc before any edit becomes possible, landing it nearer the work than a session-start copy (the position that survives a 200k–300k-token session, per the plan's problem statement) and current because it re-reads the doc from disk on every call rather than replaying a cached one.

Three designs were on the table: (1) the prose clause alone — reliable on no host, cheap on every host; (2) a `PreToolUse` gate on `Edit` that blocks until the doc is loaded — adds friction and false positives when the doc was already read via a different route; (3) a `PostToolUse` hook on `Read` that injects the doc as additional context, with a per-session ceiling of one injection per doc so a wide read sweep can't re-inject the same content into every subsequent turn. Design 3 was chosen; design 1 is kept as the fallback for hosts that expose no read event.

Only the Claude Code host is exercised as of 2026-08-02 — Cursor and Codex adapters rest on facts that could not be run against a live host and are deferred to a follow-up PR (see the plan's host-adapter Decision).

## Decision

A `PostToolUse` hook, matched on `Read`, calls a host-agnostic resolver (`scripts/ai-skills/hooks/architect-route.ts`) that matches the read path against `.prism/architect/manifest.json`, checks a per-session state file for a prior injection of each matched doc, and — for every not-yet-injected doc — reads it from disk, marks it injected, and returns its body for the adapter to inject as additional context. The Claude Code adapter (`scripts/ai-skills/hooks/claude-post-read.ts`) is registered in `.claude/settings.json` and is the only adapter this decision ships; Cursor and Codex adapters are a follow-up PR gated on host access, sharing the same resolver.

The prose fallback in `.prism/rules/context-reuse.md` is not made redundant by the hook and is kept deliberately: it is what runs on every host, including ones with no read-hook adapter yet, and it degrades gracefully to a no-op cost (a few sentences of always-on rule text) rather than to silence.

The mechanism is repo-local as of this decision. `package.json`'s `files` array ships `dist/`, `.prism/{rules,architect,spec,references,templates}`, `templates/install/`, and `.ai-skills/skills/` — not `scripts/` — so neither `architect-route.ts` nor `claude-post-read.ts` reaches a consumer install today, and no consumer's `.claude/settings.json` is touched. `templates/install/.claude/settings.json` stays `{}` on purpose: seeding a registration there would point every consumer at a script path absent from the published package, and because the hook fails open, a consumer would never discover the resulting dead hook. The registration becomes live only once `scripts/ai-skills/hooks/` ships in `files` and that seed is updated to match — tracked as follow-up work alongside the Cursor and Codex adapters.

The hook carries a `PRISM_HOOK_DISABLE=1` kill switch, checked before stdin is even parsed, so an experiment or a debugging session can register the hook and still run with it inert — varying exactly one thing (behavior) without touching registration (`.claude/settings.json`) or the manifest.

## Consequences

- **Positive:** A task that names an existing file or directory gets that file's governing architect context loaded before any edit is possible on Claude Code, closing the diff-blind gap without asking every persona to remember a prose clause.
- **Positive:** The ceiling — one injection per doc per session — means a wide read sweep (e.g. `prism-architect`'s own startup reads) cannot re-inject the same content on every subsequent `Read`, bounding injection *count* per session. Injection *size* is a separate bound: `MAX_DOC_INJECTION_BYTES = 4000` in `architect-route.ts` caps each doc at roughly 1k tokens, truncating at a UTF-8-safe boundary and naming the on-disk path for the remainder. Without this cap a single injection is unbounded — one measured `Read` of a `.prism/plans/` doc produced 92,366 bytes (~23k tokens) before the cap existed. Count and size are both load-bearing; the count ceiling alone does not bound per-session cost.
- **Negative (deferred, not current):** today the mechanism is repo-local — see the Decision section above — so no consumer install merges into anything yet. Once `scripts/ai-skills/hooks/` ships in `files` and the registration is seeded, a third consumer config surface (`.claude/settings.json`, alongside `.cursor/` and `.codex/` equivalents once those adapters ship) will have to be merged into on every install, not overwritten — a hazard the registration step (task 3) is written to avoid but that every future editor of that file will have to keep respecting.
- **Negative:** A hook that errors or times out fails silently — no doc is injected and no error surfaces in the transcript — which is a worse failure mode than the file-based always-on delivery this decision deliberately keeps separate (see the plan's "Hooks earn their place only where no file-based mechanism exists" Decision). The adapter is written to fail open (catch, log to stderr, exit 0) specifically so a hook fault degrades to "no injection," not to a blocked or broken read.
- **Neutral:** Whether the hook's presence measurably changes agent behavior — as opposed to merely firing — is not established by this ADR. `scripts/experiments/hook-adherence-ab/` (the plan's task 9) is the falsifier: if the variant arm does not out-score the control arm by the stated margin, this decision's mechanism is reverted and architect-context routing ships as the prose clause alone.

## References

- `.prism/plans/context-delivery-mechanism.md` — the plan this ADR ships with; see the "Architect-context routing gets a read-triggered hook" and "A host adapter ships only after it has been exercised on that host" Decisions.
- `.prism/rules/context-reuse.md` — carries the prose fallback this ADR names as deliberately non-redundant.
- `.prism/rules/lazy-artifacts.md` — governs the per-session state file's create-on-first-write, never-seeded lifecycle.
- `scripts/ai-skills/hooks/architect-route.ts` — the host-agnostic resolver; `MAX_DOC_INJECTION_BYTES` is the injection-size cap named above.
- `scripts/ai-skills/hooks/claude-post-read.ts` — the Claude Code adapter.
