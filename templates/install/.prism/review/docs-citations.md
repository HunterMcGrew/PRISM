# Docs and citations

Do the docs, citations, and code names the diff touches still say something true? Trigger: the diff touches the spec surface (paths under `.prism/` other than `.prism/plans/`, `.ai-skills/`, `REVIEW.md`, `AGENTS.md`, `CLAUDE.md`, or `docs/`), or behavior a `docs/` file describes. Its range on a re-review round is `REVIEW.md` § `Rounds and range`.

Its enumeration unit, severity, finding shape, and coverage line are in `REVIEW.md`.

## Checklist

- **Start from deleted names.** List every name the diff removes or renames: functions, methods, exports, config keys, headings, and file names. Run `git grep` for each across the whole tree, hidden directories included. Judge each hit as history or a stale claim. A dated record such as a changelog or a plan's `## History` is history. Then grep the other code names the changed prose uses, because a name the prose still describes as present may be gone.
- **Citation integrity.** Every section citation still resolves, and the text under that heading still says what the citing prose claims. A code name is a citation too: changed prose in a doc or comment doesn't describe a function, method, or export as present when the pinned head no longer has it.
- **Spec and doc consistency.** The diff doesn't contradict a doc that's also in the diff.
- **Prose against what actually decides.** When changed prose describes behavior a glob, script, setting, or config file controls, open that file and check the prose against it. A doc that names which paths a route covers is checked against the manifest glob, and a doc that says what a hook blocks is checked against the hook. Two docs can agree with each other and both be wrong about the file that decides.
- **Stale claims.** Changed prose carries nothing that goes false on its own schedule:
  - a count or date with no end date, outside a dated record such as a changelog or `## History`
  - a "today" list of files or folders that another open ticket will change
  - an example or citation naming a file that exists only in an open PR, not on the base branch
  - a "because" stated as fact with nothing in the repo or the cited source behind it
  - a "do this later" that names no ticket
- **Docs impact.** Map each changed feature to the page under `docs/` that describes it. A substantive change with a matching page that the diff leaves stale is a finding naming the page.
- **Architect-class docs.** When the diff touches `.prism/architect/**`, `.prism/spec/adrs/**`, or an architecture page under `docs/`, classify every claim against its cited source as verified, diverged, or missing, per `.prism/rules/architect-doc-verification.md`. Diverged and missing claims are at least Major. A new or renamed architect doc also needs its route in `.prism/architect/manifest.json` in the same diff, per `.prism/architect/guides/writing-an-architect-doc.md` § `Route-add is part of authoring`, because an unrouted doc reaches nobody. Whether the author read the authoring guides before editing is the write gate's job at edit time, because a review can't see a read.
- **Removal and rename completeness.** Treat any "reconciled all X" or "no refs remain" claim as a trigger to re-run the sweep yourself. A diff-only review can't catch a missed reconciliation, because the file that should have changed never appears in the diff. What to grep and what the mechanical checks miss are in `.prism/rules/code-standards.md` § `Removal and rename completeness`.
- **Moved headings.** For each heading the diff renames or moves, grep the repo for citations of the old heading text, hidden directories included. Each surviving hit is a finding.

Stack checks for this pass, when the repo has them: `.prism/review/stack/docs-citations.md`.
