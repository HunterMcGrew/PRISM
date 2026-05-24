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
- `fixup!` or `squash!` prefixes — we squash-merge PRs, so the prefix is purely cosmetic. Branch-level commit structure is still read during review (see `.ai-skills/skills/prism-code-dev/shared.md` § Git for when multiple commits are right)
- Emoji prefixes — the ticket ID and description carry the intent
- Generic messages ("update", "changes", "fix stuff") — every commit should be traceable to a reason

---

## Branch Naming

Format: `<username>/thr-NNNN-<slug>`

- `<username>`: GitHub username or author shortname, lowercased (e.g. `hmcgrew`)
- `thr-NNNN`: ticket ID, lowercase
- `<slug>`: short summary from the ticket title, lowercase, hyphenated

Example: `hmcgrew/thr-1588-mega-menu-info-banner-image-is-squished`

Always branch from `origin/main` — never from the current branch, which may carry unrelated commits.

---

## Merge Strategy

PRs are **squash-merged** on GitHub. This means:
- The PR title becomes the merge commit subject — which is why `pr-description.md` documents the title format (`${TICKET_PREFIX}-NNNN: <description>`)
- Individual commit messages on the branch don't appear in `main` history
- Commit quality still matters for branch-level `git log` and `git blame` during development

---

## Force Push Policy

- **Never** force-push to `main` or `master`
- Feature branches: allowed only when the user explicitly requests it
- Prefer new commits over amending — amending after a failed pre-commit hook targets the wrong commit
- `--no-verify` and `--no-gpg-sign`: never use unless the user explicitly asks
