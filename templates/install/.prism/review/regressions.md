# Regressions

Does the diff break something that worked on the default branch, and would a test catch it if it did? Trigger: always. Its range on a re-review round is `REVIEW.md` § `Rounds and range`.

Its enumeration unit, severity, finding shape, and coverage line are in `REVIEW.md`. A regression finding adds the command that shows it and its output.

## Checklist

- **Read the tests first.** Before the diff's code, read the tests it adds or changes and list the edge cases they don't consider: empty, boundary, failure, and the callers they skip.
- **Regression surface by name.** Check every item in the intent's regression surface, per `.prism/templates/intent.md` § `Regression surface`. Each one gets a verdict and the evidence behind it.
- **Branch against the default branch.** Compare types, lint, and tests on the branch against `origin/<defaultBranch>`, with `defaultBranch` from `.ai-skills/config.json`. The `## Verification` section of `plan.md`, written by the verify stage, serves as the branch half. Which command runs each check is in `.prism/rules/verification-commands.md`.
  - A failure new on the branch blocks.
  - A failure that also happens on the default branch goes under "Out of scope".
- **Every changed behavior has a test that fails on the default branch.** A behavior with no such test is a finding.
- **Test efficacy.** Can each test fail? Delete what it pins and confirm it goes red. A test silenced by something other than the rule it names is a false green on exactly the property it claims to hold. The mutation procedure:
  1. Back the file up before the first mutation, and restore from that copy.
  2. Apply the stated mutation verbatim.
  3. Confirm with `git diff` that the mutation landed and that the revert took, with stderr visible on every git command.

  A mutant that never applied reads exactly like a test that held.

- **Callers of changed exports.** Grep every caller of each changed export, including callers outside the diff, and confirm each still gets what it expects.
- **Shared values.** When the diff starts picking a value automatically, list everything that already uses that value: database columns, routes, redirects, and cache keys. Confirm the diff's choice can't collide with any of them.

Stack checks for this pass, when the repo has them: `.prism/review/stack/regressions.md`.
