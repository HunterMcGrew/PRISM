Audits the `.prism/` surface for what has gone stale and writes a report to `.prism/audits/<YYYY-MM-DD>-audit.md`. It runs only when invoked, and the weekly cadence is advisory. It edits no code. Mode: $ARGUMENTS

## Startup

- **Read `.prism/audit-state.json`** for what earlier runs classified, deferred, and archived. An absent file is a first run. Its schema and the report shape live in the audit-workflow architect doc, which loads when you write that file. If `schemaVersion` is newer than that doc describes, stop and tell the user the skill needs updating, because classifying on an unknown schema corrupts the file.
- **Pick the mode** from `$ARGUMENTS`: full (the default: plans, lessons, ADRs, architect docs), plans only, lessons only, ADR review, architect drift, or worktrees. Worktrees runs only when named directly, never on a bare invocation or "all", because it is the one lane that removes something outside `.prism/`.

## Verdicts on plan Decisions

Give every `## Decisions` entry in every plan exactly one verdict, as a sub-bullet on the entry so every skill that reads the plan sees it:

```markdown
  - **Zoe verdict (YYYY-MM-DD):** `live` | `archive-candidate` | `overdue-archive` | `open-stale` — one-line evidence.
```

- **`live`:** the constraint behind the decision still holds and code still depends on it.
- **`archive-candidate`:** the work shipped, the constraint lifted, or a tactic was replaced. Promote it to an architect doc, ADR, or rule if it carries lasting value, and otherwise let it go with the plan.
- **`overdue-archive`:** the work shipped over 90 days ago and the plan is still open.
- **`open-stale`:** an `OPEN — TBD` Decision unresolved for over 30 days. This does not mean the default path is wrong. It asks the user to resolve it or accept the default.

When several fit, the more severe wins: `open-stale` < `archive-candidate` < `overdue-archive`. The marker keeps the name `Zoe verdict` so verdicts written earlier still match.

**Evidence first.** Open the entry, follow every path, PR, or rule it cites, and state what you found in the reason (for example "referenced by `skills-ecosystem.md` § Skill Roster"). A reference that no longer resolves makes the entry an `archive-candidate`. An entry that cites nothing and cannot be judged from its text goes to the user, who holds the context.

**Open-since date.** Use an explicit `**Open since:** YYYY-MM-DD` line, else `git log --follow --diff-filter=A -S "OPEN — TBD" --format=%ai -- <plan> | tail -1`. With no verifiable date, ask the user and never default to `open-stale`.

## Other surfaces

- **Lessons** (`.prism/lessons.md`): `live` when a plan, rule, ADR, or architect doc referenced the lesson in the last 30 days, else `archive-candidate`. A lesson under 30 days old is never a candidate, since it needs time to be referenced.
- **Closed plans:** a plan is archive-ready when it has a `> Closed:` marker, every Decision has a close-gate verdict (`→ promoted to ...` or `→ no promotion needed (...)`) or a verdict from this audit, and it closed at least 90 days ago. Flag any `.prism/qa/ac-verification-<ticket-id>.md` for the same ticket in the same recommendation.
- **ADRs** (not `TEMPLATE.md` or `README.md`): flag assumptions in `## Context` and `## Consequences` that may no longer hold, such as a PR closed unmerged or a superseded sibling. Never edit an ADR.
- **Architect docs:** flag re-enumeration drift (a doc lists the states of X and a sibling doc owns a different list) and cited source paths that no longer exist.

## Gates

- **Archives need explicit consent, item by item.** State "I'll move `<item>` to `<destination>` on your go-ahead" and wait for a yes, not silence. Lessons go to `.prism/archived/lessons-archive.md` with their date kept and an archive timestamp added. Plans go to `.prism/archived/plans/<name>`. Create either on the first move, with a `# Lessons Archive` header for the lessons file, and never seed them empty. The lessons archive is append-only.
- **Verdict sub-bullets are the one write that needs no confirmation,** because they annotate and delete nothing. Everything else waits for the user.
- **Record each confirmed move** in `archived`, and each user deferral with its reason and time in `deferred`, and set `lastRun`. Never delete state entries: the file is its own audit trail.

## Worktrees lane

1. List with `git worktree list --porcelain` from the repo root, skipping the first block (the main working tree) and the worktree this session runs in.
2. Classify each with `pnpm prism:worktree-classify <path>`. A non-zero exit means the directory is gone while git still lists it. Report it as `unreadable` and offer `git worktree prune`, which only removes bookkeeping.
3. Show the dry-run grouped GREEN, RED, and YELLOW, each entry with its reason. Nothing is removed before step 4.
4. Ask for one batch confirmation naming every GREEN path, never per item. Re-classify each GREEN entry right before removing it, since work may have started in it, and skip any that changed. Remove with `git -C <main-repo-root> worktree remove --force <path>`, which is safe because GREEN means no tracked changes and no untracked files.
5. List RED, YELLOW, and unreadable entries with reasons and stop. They get no confirmation gate because they are never removal candidates. Removing a worktree leaves its branch, and branch cleanup is out of scope.

Where `scripts/ai-skills/worktree-classify.ts` is absent (a consumer install), report the lane unavailable and classify nothing. A weaker predicate is the failure this lane exists to prevent.

## Report

Write `.prism/audits/<YYYY-MM-DD>-audit.md`, creating the directory on first use, and keep it out of chat unless the user asks. Sections: Summary with counts per surface and verdict, Plans (per plan, each Decision's verdict and reason), Lessons, ADRs flagged, Architect docs flagged, Worktrees (only when that lane ran), and Deferred. Put `open-stale` Decisions first, since they most need the user.

Close with the report path. The verdicts are the handoff: a skill that reads a plan's `## Decisions` respects a verdict sub-bullet, so this skill recommends no next step.

Before closing the session, append to `.prism/lessons.md` when a classification heuristic here proved wrong or a verdict reason confused the user.
