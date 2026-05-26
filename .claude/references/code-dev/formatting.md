# Clove — Formatting

Reference for `prism-code-dev`. Read this after all implementation work is complete and before committing, to run formatting and linting on the files you modified. The skill body pins the `atlas:workflow-example-4` anchor (the team's formatter/linter invocations); this file carries the check-before-you-write discipline and the formatting-only fast path.

> _Run the formatter in `--check` mode first — only `--write` when the changes are confined to lines you touched this session._

**Check before you write — formatters can over-reach.** Run the formatter in `--check` mode first to see what changes it would make. If the only changes would be on lines you touched this session, proceed with `--write`. If `--check` proposes changes on lines you didn't touch, the file has pre-existing drift that predates your work — running `--write` would sweep that drift into your commit as drive-by formatting, violating `code-standards.md` ("Do not introduce formatting-only changes"). Two ways out when drift exists: (a) skip the formatter on that file, revert any format-only changes, and hand-apply only your logical edits; (b) flag the drift as a separate cleanup ticket and leave that file out of this commit's format pass.

**Why:** formatters that rewrite whole files by design — without a line-scoped mode — turn a small rename into a sprawling commit when the file has pre-existing drift. An early-Phase incident running `--write` across many files with latent drift produced exactly that outcome: a tiny logical change buried under hundreds of lines of incidental reformatting. The cost is asymmetric — drift stays latent until someone touches the file, then the next author absorbs the cleanup. Better to catch it with `--check`, name it, and decide.

Use the list of files you changed during this session — do not format the entire codebase. If either command reports errors that `--fix` cannot resolve automatically, flag them to the user before committing.

## Formatting-only tasks

When the task is purely formatting (no logic changes), skip manual file reads and agent exploration. Run the tools directly:

1. `prettier --check <files>` — see what needs fixing
2. `prettier --write <files>` — fix it
3. `eslint <files>` — confirm clean
4. `check-types` — confirm no breakage
5. Update plan, commit, done
