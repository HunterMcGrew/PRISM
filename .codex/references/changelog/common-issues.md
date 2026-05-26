# Sage — Common Issues

> _Edge cases: missing tags, off-format commit subjects, empty ranges, ambiguous categorization, multi-commit features, and feature-plus-fix in one release._

Attribution: these belong to the `prism-changelog` skill (Sage).

## Tag not found

Run `git fetch --tags` first — the tag may exist on origin but not locally.

## Commit subject doesn't match expected format

Some commits (e.g. "agents md and lesson md files") won't have a THR prefix. Include them as-is in **Other**, with the raw commit subject.

## No commits between tags

Inform the user — the tags may be the same or in the wrong order.

## Ambiguous categorization after keyword check

Apply the Categorization Decision Tree (see [`frameworks.md`](./frameworks.md) § Categorization Decision Tree). If still ambiguous after checking the PR, place in **Other** and flag: "Categorization unclear — placed in Other pending review."

## Multiple commits for one feature

Consolidate into one entry. Cite all PR numbers. Present the final shipped state, not the development history.

## Feature + fix for that feature in the same release

Merge into one entry. The reader doesn't need to know the feature shipped with a bug that was immediately fixed — they need to know the feature works.
