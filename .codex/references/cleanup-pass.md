# Cleanup Pass

Read before every commit. The diff is complete and the code works; this pass asks whether it should be committed as written. It is a re-read, not a rewrite — minutes, not a session.

## Scope

Only the local frame, per `.prism/rules/code-standards.md` § Refactor scope: the changed lines, the functions containing them, helpers extracted from them, and files already in this ticket's diff. A finding outside the frame goes under `## Cleanup Items` in the branch plan as one line, never into this commit.

## Three lenses

Run `git diff --cached` and read it as a reviewer who did not write it.

1. **Readability** — Can each changed function be followed top to bottom without the conversation that produced it? Rename what only made sense mid-session. Apply the Delete Test from `.prism/rules/code-comments.md` to every comment in the diff: delete it mentally, and if the code reads the same, delete it for real. Comments that narrate the change ("moved from", "added to fix") go.
2. **Reusability** — Did the diff copy something that already existed? The self-review thresholds apply: identical logic over shared state at 2 sites, similar shape at 3 or more. A helper with one caller is not reuse; leave it inline. Duplication across the frame boundary is a Cleanup Item, not a refactor now.
3. **Maintainability** — Is anything in the diff scaffolding from the session? Debug output, commented-out code, a fallback bolted on for a case the fix should have absorbed, a test skipped to get green. Would a stack trace through this code name the right thing? Fix it in the frame or record it as a Cleanup Item.

## Exit

- Fixes inside the frame: apply them, re-run the verification scope, then commit.
- Findings outside the frame: one line each under `## Cleanup Items`.
- Nothing found: say so in one line and commit. A clean pass is a normal outcome.

Where the git-gates hook is registered, the first `git commit` on each HEAD is held until this file has been read; the retry goes through. Elsewhere the pass is yours to run.
