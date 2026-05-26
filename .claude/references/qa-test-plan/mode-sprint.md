# Reese — Sprint / Group Mode

> _Lighter living checklist covering several PRs with per-PR ticket callouts and a shared regression section._

Attribution: this mode belongs to the `prism-qa-test-plan` skill (Reese).

Triggered by multiple PRs, a commit range, or sprint-flavored prompt words. Produces a lighter living checklist covering several PRs with per-PR ticket callouts and a shared regression section across the group.

## 1. Parse the input

- **Multiple PRs** (e.g. `#1234 #1235 #1236` or full URLs): collect the PR numbers.
- **Commit range** (e.g. `origin/main..HEAD`, `<sha>..<sha>`): use `git log --format='%h|%an|%s' <range>` to resolve commits, then extract PR numbers from subjects.
- **Named branch or cycle reference** without explicit PRs: ask which PRs or commit range to cover.

## 2. Resolve the commit set

For explicit PR inputs:

```bash
gh pr view <num> --json commits,title,headRefName,baseRefName,number
```

Per PR, collect the commits and PR metadata. For commit ranges, use `git log` as above.

## 3. Filter scope

Same heuristic as Release mode — exclude agentic / tests-only / types-only PRs, but note that at sprint scale there's usually less to exclude than in a full release.

## 4. Map tickets, identify regression risks, build the document

Follow [`shared-mechanics.md`](./shared-mechanics.md) for ticket mapping and regression scanning. Regression here focuses on shared surfaces touched across the group — if two PRs in the set both touch `components/ui/`, that's a stronger signal than either one alone.

Build the document using this skeleton:

**Output path:**

- If explicit PR list: `.claude/docs/qa/thrive-prs-<first>-through-<last>-qa-checklist.md`
- If commit range: `.claude/docs/qa/thrive-<range-slug>-qa-checklist.md` (e.g. `origin-main-to-head`)

**Header:**

```
# PRISM — Sprint QA Checklist

**Change set:** <list PRs with links, or the commit range>
**Scope:** Manual scenarios for UI-facing work across this sprint / PR group. Non-UI PRs are listed under **Out of scope** below.

**Who this is for:** Testers using the site like real visitors, plus structured passes in the **WordPress block editor** where noted.

**How to use:** Take sections in order or split by person. For each item, record **Pass / Fail**, **browser**, **URL**, short **notes**, and a **screenshot** on failure.

---
```

**Body sections:**

1. **Out of scope** — same table format as Release
2. **PR coverage** — table: PR | Ticket(s) | Plain-language focus | Section(s) — no release-wide RTM, but each PR gets a row
3. **Before you start** — environment, toggles, preconditions
4. **Per-PR feature sections** — same format as Release feature sections, one per in-scope PR
5. **Regression testing — shared surfaces across the group** — grouped by risk area, explicitly noting which PRs contributed to each risk
6. **Sign-off** — see [`shared-mechanics.md`](./shared-mechanics.md)
