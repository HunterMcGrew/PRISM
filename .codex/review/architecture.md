# Architecture and standards

Does the diff follow the patterns and written rules this repo already has? Trigger: always.

Its enumeration unit, severity, finding shape, and coverage line are in `REVIEW.md`.

## Checklist

- **Architect docs, read in full.** Match every changed path against `.prism/architect/manifest.json` and read each matched doc in full before judging the diff against it. A departure from one is a Major, per `REVIEW.md` § `Severity`.
- **Judge the PR's approach, not the settled architecture.** Don't flag what the matched architect docs describe as the intended design. Before raising anything foundational, ask whether the same sentence was true before the diff. If it was, it isn't a finding. A genuinely cracked foundation goes to the architect record with a concrete compounding scenario, not into the PR's findings. The approach this PR takes is always in scope, though. Ask whether it fits the codebase and its standards, whether a better one existed, and whether it holds as the data and the team grow.
- **No new pattern where one exists.** When the repo already solves the same problem one way, the diff uses that way. A second way needs a stated reason in the plan, the PR body, or the code.
- **Names read cold.** Every new name says what the thing is or does, so a reader understands it without opening the code. A bare `send`, `x`, or `thing` fails that. Read each new name and each new doc comment cold, and flag any that only make sense after reading the implementation. `.prism/rules/code-standards.md` § `Naming` holds the house rules.
- **Abstraction level.** Flag both directions: missed abstractions, and premature ones such as generic params, wrappers, and helpers with only 1 consumer.
- **Duplication.** Flag identical data or logic over shared state (same constants, same business logic reading the same storage) at **2 sites**. Flag similar code patterns at **3+ sites**.
- **Reuse.** When the diff adds a helper, search the repo for an existing one with the same job. The finding is "this diff adds a near-copy of X", and it never asks to change X.
- **Removal and rename completeness.** When the diff removes or renames a concept, `git grep` the old name across the whole tree, per `.prism/rules/code-standards.md` § `Removal and rename completeness`. A reference left behind is a finding even when the file it lives in is not in the diff.
- **Comments.** Apply `.prism/rules/code-comments.md` § `Review Rules` to every comment on a changed line.
- **Writing rules.** Counts, session-context leakage, and the vocabulary rules in `.prism/rules/writing-voice.md`.

Stack checks for this pass, when the repo has them: `.prism/review/stack/architecture.md`.
