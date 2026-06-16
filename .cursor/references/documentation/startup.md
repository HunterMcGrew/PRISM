# Eli — Startup Procedure

Read this at the start of every documentation run, after the inline Step 2c codebase-verification lens. `prism-documentation` pins Step 2c (the run-wide verification lens); this file carries the rest of the numbered startup sequence — read conventions, determine context, check branch activity, determine audience, check for existing docs and sibling overlap, nudge for missing docs, interview mode. Run these steps in order. **Confirm context and audience before writing** — docs written for the wrong audience waste everyone's time.

## Step 1 — Read documentation conventions and config

Read `<repo-root>/.prism/architect/_toolkit/documentation.md`. This is the source of truth for:

- Naming conventions (topic-based, kebab-case)
- Frontmatter schema (title, description, category, audience, last_updated)
- Category list and the cross-reference map
- Writing guidelines
- Docs-to-code mapping convention

Also read the `documentation` block in `<repo-root>/.ai-skills/config.json`. The four fields that shape every doc run:

- **`documentation.location`** — the root path where this team's docs live (e.g. `docs/`, `documentation/`, `site/`)
- **`documentation.audience`** — the primary audience (`developer-user`, `end-user`, `mixed`, or a team-defined value)
- **`documentation.keepsDevDocs`** — whether the team maintains a separate dev doc tree alongside user-facing docs
- **`documentation.format`** — the doc format (`flat-markdown-guides`, `nextra-blocks`, or a team-defined value)

These values answer "where do docs go?" and "who reads them?" before you write a single word. The category and cross-reference map in `documentation.md` are the authoritative index of what already exists.

## Step 2 — Determine what to document

Check for context in this order:

**A. `$ARGUMENTS` provided** — if a branch name, PR number, tag range, doc path, or feature description was passed, use that as the source.

**B. Active feature branch** — run:

```bash
git branch --show-current
git rev-parse --show-toplevel
```

If the current branch is not `main`/`master`/`develop` and has a diff against main, use it. Store as `<branch>` and `<repo-root>`.

**C. No clear context** — ask:

> "What should I document? You can give me:
>
> - A branch name (e.g. `feature/PRISM-1234-my-feature`)
> - A PR number (e.g. `#456`)
> - A tag range (e.g. `v1.1.0..v1.2.0`)
> - An existing doc to update (e.g. `docs/getting-started/setup.md`)
> - Or just describe the topic and I'll interview you"

Wait for the answer before continuing.

**Resolving context by source:**

- _Branch name_ → `git diff main...<branch>` + check for `.prism/plans/` file
- _PR number_ → `gh pr diff <number>` + `gh pr view <number>` for description
- _Tag range_ → `git diff <old>..<new>`
- _Existing doc path_ → read the file, understand current content, prepare to update
- _Interview mode_ → skip the diff; use answers to interview questions below as the source of truth

**Plan lookup** (branch context only) — read `<repo-root>/.prism/references/plan-lookup.md` and execute to find the plan. If a plan exists, **read it fully** — not just `## Goal` and `## Implementation Tasks`, but also `## Decisions` and `## History`. The plan is the source of truth for intent and constraints:

- `## Decisions` tells you what choices were made and why — these are implicit do-not-undo rules that apply to your writing (e.g. tone decisions, structural choices, language constraints).
- `## History` tells you what already happened on this branch — what was written, what was restructured, what was consolidated. This prevents you from contradicting or undoing earlier work.

## Step 2b — Check recent branch activity

Run `git log --oneline -10` to see what's already happened on this branch. This catches:

- Tone or language decisions already made (e.g. "remove jargon" commits mean your output must follow suit)
- Structural changes (e.g. pages consolidated or renamed — so you don't reference stale filenames)
- What was already shipped vs. what's still in progress

This takes 5 seconds and prevents writing something that contradicts work already done on the branch.

## Step 2c — Codebase verification

Step 2c is pinned in the skill body — it is a run-wide verification lens, not a startup step you read once. Apply it before writing any documentation that references specific code.

---

## Step 3 — Determine audience

Once context is resolved, determine the audience from `documentation.audience` in `.ai-skills/config.json` (read in Step 1). Use that as the default — then confirm:

> "I'll write for **[audience from config]**. Does that match what you need, or should I adjust for this doc?"

For teams with `keepsDevDocs: true`, also ask whether this doc is developer-facing or user-facing — the answer determines which template to use and where to place the file.

For single-audience teams (`keepsDevDocs: false`), there is one doc tree. Use the user-doc template as the base and adjust depth for the configured audience.

---

## Step 4 — Check for existing docs and sibling overlap

Before writing anything new:

**Existing doc check:**

1. Check the relevant directory under `documentation.location` for an existing doc on this topic
2. If a cross-reference map entry exists in `.prism/architect/_toolkit/documentation.md`, check the counterpart file
3. If an existing doc is found: **update it** rather than creating a new file. Note what sections need updating vs. what's still current.
4. If no existing doc: determine the output path using the naming convention from `documentation.md`

**Sibling overlap check (required for new pages):** 5. Read the directory listing or sidebar config in the target location to see what pages already exist 6. Scan the headings of each sibling page for sections that overlap with what you're about to write. 7. If a sibling already covers a topic you plan to write about: **don't duplicate it.** Write a brief summary (2-3 sentences) and link to the sibling page. 8. Check the Doc-to-Doc Overlap table in `documentation.md` — if you're creating overlap, add an entry so Briar can track staleness.

---

## Step 4b — Nudge for missing docs

When context involves a feature area (branch diff touches a significant feature path), check whether docs exist:

- **User doc:** check `${documentation.location}` for an existing doc on the touched feature
- **Dev doc (when `keepsDevDocs: true`):** check whether a developer-facing doc exists alongside the user doc

If a doc is missing, nudge the user — don't auto-create:

> "I notice there's no doc for **{feature/area}** yet. Want me to create one while I'm here?"

or for dev docs:

> "There's no developer doc for **{feature/area}** yet. Want me to write one alongside the user doc?"

If the user declines, proceed with whatever they originally asked for. The nudge is informational, not blocking.

---

## Step 5 — Interview mode (if no diff context)

If the user chose interview mode or there's no diff to read, ask these one at a time:

1. "What does this feature do? Give me a one-sentence summary."
2. "Who uses it — an end user, an admin, a developer integrating it, or some combination?"
3. "What's the main thing someone needs to do to use it?"
4. "Any edge cases, limitations, or gotchas worth calling out?"
5. "Are there any existing components, modules, or classes involved?"

Use the answers as the basis for documentation — same format, same standards.
