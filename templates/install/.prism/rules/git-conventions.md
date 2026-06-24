# Git Conventions

## Commit Messages

### Subject line

Format: `${TICKET_PREFIX}-NNNN: <imperative summary>`

- Start with the ticket ID, colon, space
- Use imperative mood ("Fix image distortion", not "Fixed" or "Fixes")
- Keep under 72 characters
- Capitalize the first word after the colon
- No trailing period

Variants:
- Follow-up commits after the main PR has merged: `${TICKET_PREFIX}-NNNN followup: <summary>`
- Chores not tied to a ticket (plan updates, CI config, tooling): `chore: <summary>`

### Body

Optional. When included, separate from the subject with a blank line. Explain **why**, not what — the diff shows what changed. Wrap at 80 characters.

Use the body when:
- The subject alone doesn't explain the motivation
- Multiple files changed for a non-obvious reason
- A decision was made that someone reading `git log` would question

When writing a body, escape bare `#N` references (plan step numbers, list positions) by wrapping them in backticks: write `` `#3` ``, not `#3`. GitHub autolinks `#N` in commit message displays to PR/issue N. Leave unescaped only when it's a genuine PR or issue reference. Same rule for PR bodies — see `.prism/rules/pr-description.md` § Writing mechanics.

### Formatting

Always pass the commit message via HEREDOC to preserve formatting:

```bash
git commit -m "$(cat <<'EOF'
${TICKET_PREFIX}-1588: Fix remaining ILink migration gaps in block registration and view props

The ILink migration missed two files: index.tsx still registered buttonUrl/buttonUrlTarget
as block attributes, and MegaMenuInfoBannerBlock.view.tsx still exported the old prop types.
Updated both to use link: ILink, matching the featured-banner pattern.
EOF
)"
```

### Not allowed

- `WIP` or `wip` commits — commit when the unit of work is complete
- `fixup!` or `squash!` prefixes — we squash-merge PRs, so the prefix is purely cosmetic. Branch-level commit structure is still read during review (see § Commit Granularity for when multiple commits are right)
- Emoji prefixes — the ticket ID and description carry the intent
- Generic messages ("update", "changes", "fix stuff") — every commit should be traceable to a reason

---

## Commit Granularity

Default to one clean commit per unit of work. Three exceptions earn multiple commits on a branch:

- **Multi-task work** — when the plan's `## Implementation Tasks` has multiple distinct tasks, commit per task as each completes. Branch-level `git log` is read by Briar, Eric, and human reviewers during development — readable commit boundaries help review, even though `main` only sees the squash (§ Merge Strategy).
- **Post-review follow-ups** — review fixes and `lessons.md` appends are separate commits, not amends to the prior commit. The reviewer diffs what changed since their last pass; an amend hides it.
- **User-requested mid-implementation commits** — if the user asks for one, honor it without prompting again.

---

## When to Commit

Commit your own work before handing off — to another persona, another session, or another person.

**Why:** uncommitted changes are invisible everywhere except the working tree they sit in. A handoff that leaves work uncommitted hands over a branch that misstates its own state — the next session can't tell finished work from forgotten scraps, and a concurrent session on the same checkout can sweep your changes into its own commits.

---

## Branch Naming

Format: `<username>/${TICKET_PREFIX_LOWERCASE}-NNNN-<slug>`

- `<username>`: GitHub username or author shortname, lowercased (e.g. `${GITHUB_OWNER_LOWERCASE}`)
- `${TICKET_PREFIX_LOWERCASE}-NNNN`: ticket ID, lowercase
- `<slug>`: short summary from the ticket title, lowercase, hyphenated

Example: `${GITHUB_OWNER_LOWERCASE}/${TICKET_PREFIX_LOWERCASE}-1588-mega-menu-info-banner-image-is-squished`

Always branch from `origin/main` — never from the current branch, which may carry unrelated commits.

---

## Merge Strategy

PRs are **squash-merged** on GitHub. This means:
- The PR title becomes the merge commit subject — which is why `pr-description.md` documents the title format (`${TICKET_PREFIX}-NNNN: <description>`)
- Individual commit messages on the branch don't appear in `main` history
- Commit quality still matters for branch-level `git log` and `git blame` during development

---

## Who merges

Merging and approving PRs is a human responsibility — on every tool (GitHub UI, `gh pr merge`, any future automation), for every persona by default. This is the merge-side complement of "Eric never approves PRs": the review-side rule binds the reviewer; this one binds every persona that touches a branch.

Cues like "it's approved", "QA passed", or "let's get it in" mean *finish the handoff* — push the final commits, sync the PR body, report the PR ready to merge. They are never an instruction to run the merge.

**Why:** the human clicking merge is the last gate where a wrong change can still be stopped. Approval excitement reads like authorization but isn't — an agent that merges on an enthusiastic cue removes that gate at exactly the moment scrutiny is lowest.

Sol may merge when `features.conductorMayMerge: true` is set in `.ai-skills/config.json`. The flag is the gate — Sol checks for it before any merge; absent or false means the human merges.

---

## Keeping a Branch Current

Refresh a branch from `main` by merging — `git merge origin/main`. Merge never rewrites commits another checkout may already hold, so it's always safe on a branch you share with reviewers, other sessions, or CI.

One trap earns a rebase instead: **the squash-already-upstream trap**. After a PR from your branch squash-merges, `main` carries a single commit with your changes while your branch still holds the individual commits. Merging `main` back in replays your own changes against their squashed copy — every subsequent edit to the same lines becomes a conflict with yourself. When continuing work on a branch whose PR already squash-merged, rebase the unmerged remainder onto `origin/main` (the already-merged commits drop out as empty) — or start a fresh branch from `origin/main`. This trap is live here because PRs squash-merge (§ Merge Strategy).

Never rebase a shared branch. Rewriting commits that exist in someone else's checkout forks the branch's identity, and reconciling afterward requires the force-push damage § Force Push Policy exists to prevent.

---

## Force Push Policy

- **Never** force-push to `main` or `master`
- Feature branches: allowed only when the user explicitly requests it
- Prefer new commits over amending — amending after a failed pre-commit hook targets the wrong commit
- `--no-verify` and `--no-gpg-sign`: never use unless the user explicitly asks
