# Reese — Release Mode

> _Full release checklist with scope tables, RTM, broad regression sweep, sign-off._

Attribution: this mode belongs to the `prism-qa-test-plan` skill (Reese).

Triggered by a tag pair, a GitHub compare URL between tags, or release-flavored prompt words. This is the original Reese workflow — full release checklist with scope tables, RTM, broad regression sweep, sign-off.

## 1. Parse the input

- **Two tags** (e.g. `v1.0.812 v1.1.10`, `v1.0.812..v1.1.10`, `v1.0.812 to v1.1.10`, `from v1.0.812 to v1.1.10`): extract `<base>` (old) and `<head>` (new). Normalize tags — if a tag is missing the `v` prefix, prepend it (`1.0.812` → `v1.0.812`). Tags always start with `v`.
- **GitHub compare URL** (e.g. `https://github.com/HunterMcGrew/PRISM/compare/v1.0.812...v1.1.10`): parse `/compare/<base>...<head>` from the URL path (three dots).
- **One tag only**: ask which end it represents and what the other tag is.
- **No tags**: ask for the previous and new release tags.

## 2. Validate both tags exist

```bash
git tag -l <base>
git tag -l <head>
```

If either is missing, `git fetch origin tag <name> 2>/dev/null` and retry. If it's still missing, stop and tell the user.

## 3. Confirm the range

```bash
git log --oneline <base>..<head> | wc -l
```

Tell the user: "Alright, N commits between `<base>` and `<head>` — let me see what we're working with."

## 4. Resolve the commit set

```bash
git log --format='%h|%an|%s' <base>..<head>
```

Collect **hash, author, subject** per commit. Extract **PR numbers** from subjects (`(#1234)`).

## 5. Filter scope

Default audience is manual UI testers — visitors and block editor users, not engineers running unit tests.

**Exclude from dedicated manual scenarios** (list in an **Out of scope** table with reason):

- Agent / dev-only: commits whose subject indicates **AI skills**, **branch plans**, **agents.md**, **lesson md**, **AGENTS**, **.claude** housekeeping — unless the user explicitly says to include them
- **Tests-only / types-only** PRs: no new user-facing UI — optionally one **regression** bullet under a spot-check section and a footnote in the ticket table

**Include:** anything that plausibly touches visitor UI, admin surfaces / block or content editors, 404 / error pages, forms, search, header, or bundles that change when scripts load.

If unsure whether a PR is UI-facing, run `git show <hash> --stat` and decide from file paths (`edit.tsx`, `blocks/`, `components/`, `app/not-found`, etc.).

## 6. Map tickets, identify regression risks, build the document

Follow the shared mechanics in [`shared-mechanics.md`](./shared-mechanics.md) for ticket mapping and regression scanning.

Then build the document using this skeleton:

**Output path:** `.claude/docs/qa/thrive-<base>-<head>-manual-qa-checklist.md`

First, derive the GitHub compare URL from the repo's origin remote:

```bash
REPO_URL=$(git remote get-url origin | sed 's/\.git$//' | sed 's|git@github.com:|https://github.com/|')
```

Then use `$REPO_URL/compare/<base>...<head>` wherever a compare link is needed.

**Header:**

```
# PRISM — Manual QA Checklist

**Release reference:** [<base> → <head>]($REPO_URL/compare/<base>...<head>)
**Scope:** Manual scenarios for **UI-facing work** merged in this tag range from **all authors**. Internal-only PRs are listed under **Out of scope** below.

**Who this is for:** Testers using the site like real visitors, plus structured passes in the **content or block editor** where noted.

**How to use:** Take sections in order or split by person. For each item, record **Pass / Fail**, **browser**, **URL**, short **notes**, and a **screenshot** on failure.

---
```

**Body sections:**

1. **Out of scope** — table: PR | Reason (agentic, automated-only, types-only)
2. **Ticket coverage (PRISM-\*)** — table: Ticket | PR(s) | Plain-language focus | Section(s)
3. **Before you start** — environment, visitor vs editor, cache, product-specific toggles (e.g. Advanced vs simple header search)
4. **Feature sections** (numbered) — each with:
   - **Tickets:** line (list all relevant PRISM-\* IDs)
   - **Goal:** one sentence, tester-facing
   - Small **table**: Steps | What "good" looks like
   - **Checklist** `- [ ] id.x` lines mirroring the table
5. **Regression testing** — a dedicated section after the feature sections:
   - **Goal:** verify that changes in this release haven't broken existing functionality outside the feature areas above
   - Grouped by risk area (e.g. "Shared components", "Sitewide rendering", "Navigation")
   - Each group gets a brief _why_ (e.g. "PR #1451 refactored the block registry — all blocks could be affected")
   - Spot-check scenarios in the same table + checklist format as feature sections
6. **Sign-off** — see [`shared-mechanics.md`](./shared-mechanics.md)
