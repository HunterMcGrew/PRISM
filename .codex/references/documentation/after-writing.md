# Eli — After Writing

Read this after the doc content is written, before the closing. `prism-documentation` pins the trigger; this file carries the post-write procedure — the conditional sub-flows (new-template breadcrumbs, doc-collection handoffs) and the always-run steps (sidebar nav, landing index, cross-reference map, plan update, review prompt).

## Conditional sub-flows (fire only when their trigger fires)

**When creating a new template at `.prism/references/*-template.md`:**

1. Add a **Category-specific rules** bullet to the parent base template (`user-doc-template.md` or `dev-doc-template.md`) pointing down to the new specialization — this is the breadcrumb that routes future Eli sessions to the right template.
2. Add an entry to `.prism/architect/_toolkit/documentation.md § Doc Templates § Category-specific rules` describing when the new template applies.
3. Mention the new template in `SKILL.md § Doc templates § Category-specific templates` so the skill itself knows it exists.

**When creating a doc collection (N ≥ 3 docs sharing a topic, not a single standalone page):**

1. Add a `## Per-Block Documentation` section to the paired `.prism/architect/<topic>.md` file listing the collection — this is the handoff signal so agents loading the architect file via manifest know the collection exists and should be updated when source changes.
2. Add a Cross-Reference Map row in `documentation.md` per audience — if both user and dev per-block docs exist, add both rows.
3. Add audience-parallel intros to the team's doc landing page (at `${documentation.location}` root — e.g. `docs/index.md` or `docs/index.mdx`) — if both user and dev sides have a section for the category, both need a drill-down intro sentence, not just one.

## 1. Update sidebar navigation

**When `documentation.format` uses a sidebar config file (e.g. Nextra's `_meta.js`):** add the new page's slug and display name to the sidebar config in the target directory. Pages not in the config appear alphabetically at the bottom with their raw filename as the label.

Example for teams with a Nextra-style `_meta.js`:

```js
// <documentation.location>/<category>/_meta.js
export default {
	colophon: "Colophon",
	"mega-menu": "Mega Menu", // ← new entry
};
```

**When `documentation.format` is `flat-markdown-guides` (PRISM's own format):** no sidebar config applies — skip this step. Pages are discovered from the filesystem directly.

Place any sidebar entries in logical order (alphabetical within a section, or grouped by category if the section has established groupings).

## 2. Update the landing page index

If the doc is new and the landing page at `${documentation.location}` doesn't have a link for it, add one. Keep the index concise — only add links for docs that a new reader would want to find from the home page.

## 3. Update the cross-reference map

If the new doc covers the same topic as an existing `.claude/` file, add a row to the cross-reference map in `.prism/architect/_toolkit/documentation.md`.

## 4. Update the branch plan

If a plan exists for this branch (found during Step 2), append a History entry describing what was written or updated. This is required for any meaningful doc change — new pages, restructured pages, fixed links, updated content. The plan is the shared memory across skills; if Eli doesn't log what he did, the next skill has a blind spot.

## 5. Prompt for review

After saving, present the file path(s) and prompt:

> "Docs written to `{path}`. Give them a look and let me know if anything needs adjusting — happy to revise."

If both audiences were selected, list both paths.
