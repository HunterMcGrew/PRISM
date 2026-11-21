---
title: Release 1.0.0 — version bump, migration note, and docs
ticket: https://github.com/HunterMcGrew/PRISM/issues/550
stage: plan
status: approved
approved_by: Hunter McGrew
approved_at: 2026-11-20
approved_via: chat
---

Child 9 of the Kitchen Line epic (#499), and the last to merge. The design is this folder's `spec.md`. The epic's approved `intent.md` (`.prism/plans/prism-499/intent.md`) covers this child through its Release decision and its Regression surface.

**Goal:** `package.json` reads `1.0.0`, `CHANGELOG.md` carries a migration note for everyone on `0.10.0`, the docs describe the plan-folder workflow and the gates that ship, and the packed tarball passes `prism doctor` on a fresh adopt and on an upgrade from `0.10.0`.

## Tasks

Groups from `node scripts/ai-skills/hooks/plan/bundles.mjs .prism/plans/prism-550/plan.md` on the draft:

- Group 1: T1, T2, T4, T5, T7

These are the first wave. Later waves follow `depends on`: T3 after T2, T6 after T2, T4, and T5, T8 after T5 and T7, T9 after T1 to T8. Rerun the script after any task change and replace the groups with what it prints.

T1 to T8 are Eli's (docs). T9 is Clove's. These conventions hold for every task.

**Precondition.** Start from `origin/main` at `2cb1633a` or later. Every line number below was checked at `2cb1633a` on 2026-11-20. Where a later `main` moved a line, find it by the quoted old text, which is the authority.

**Frontmatter.** Every edited `docs/` page gets `last_updated` set to the edit day, written `YYYY-MM-DD` (`date +%F`), per the Frontmatter schema in `.prism/architect/_toolkit/documentation.md`. `README.md`, `CONTEXT.md`, and `CHANGELOG.md` have no frontmatter.

**Section references in quoted text.** A plan folder holds no section sign, so where new text in this plan points at a section of another file, it is written `[ref: <Heading>]`. The builder writes it in that file's own form: in `docs/` pages a markdown link to the heading's anchor, and elsewhere the section sign, a space, and the heading.

**Content-only.** T1 to T8 change prose only and have no build effect: nothing under `docs/`, `README.md`, `CONTEXT.md`, or `CHANGELOG.md` is generated or mirrored. Each still runs `pnpm run prism:crossref-lint` before committing, because it resolves links in `docs/`.

**Commits.** One bundle is one commit, subject `T<n>: <summary>` or `T<a>,T<b>: <summary>`, made with `node scripts/ai-skills/hooks/plan/commit.mjs "<subject>" <paths>`. Stages commit and never push. Plan edits commit as `plan: <summary>`.

### T1: Name the paths on the publishing guide's commit

- files: docs/publishing-prism.md
- proof: grep -nE '^git commit ' docs/publishing-prism.md | grep -v -- ' -- ' (prints nothing)
- proof fails on main: yes
- depends on: none

Owner: Eli. The commit gate denies a commit that names no paths, so the guide as written fails for the maintainer.

- Line 59: `git commit -m "chore: bump version to 1.1.0"` becomes `git commit -m "chore: bump version to 1.1.0" -- package.json`.
- Add no `git tag` step. That is an open question in the spec's Decisions, and its default is no tag step.
- `last_updated` per the Frontmatter convention.

### T2: List every doctor check in adopt-prism.md, in run order

- files: docs/adopt-prism.md
- proof: grep -c '^- \*\*' on the section's bullets equals 12, and grep -n "plan this out" docs/adopt-prism.md prints nothing
- proof fails on main: yes
- depends on: none

Owner: Eli. The section "Check install health with `prism doctor`" lists five checks while `runDoctor` in `scripts/ai-skills/doctor.ts` (at about line 1618) runs twelve. This section becomes the only full list, and T3 links to it, so keep its heading text unchanged: its anchor is `#check-install-health-with-prism-doctor`.

Replace the bullet list after "`doctor` never writes anything; it's a read-only report. It checks:" with one bullet per check, in the order `runDoctor` calls them. Keep the existing text of the five bullets that already exist (Config validity, Git repo, Sync state, Seed delivery, Version) and add the seven new ones in their places. Each bullet is a bold label and one or two sentences, verified against the named function's JSDoc and findings:

1. **Config validity.** Existing bullet.
2. **Git repo.** Existing bullet.
3. **Sync state.** Existing bullet.
4. **Seed delivery.** Existing bullet. It already says a never-adopted repo is skipped.
5. **Rule load declarations.** From `checkRuleLoadDeclarations`: warns on each rule in `.prism/rules/` or the `.prism/custom/` overlay with no valid `load:` declaration, labeling overlay rules `custom/<name>`.
6. **Architect routes.** From `checkArchitectRoutes`: warns on a manifest route that names a missing doc or matches no file.
7. **Hook registration.** From `checkHookRegistration`: per host, whether the hook runtime is installed and registered, a runtime with no registration or a registration pointing at a missing file, and a dropped host's registration still on disk.
8. **Git hooks.** From `checkGitHooks`: whether PRISM's git hooks are installed in this clone, delivered but not installed, or left alone because another hooks setup is in force (reported as info). Its findings print under the `hook-registration` label.
9. **Codex doc limit.** From `checkCodexDocLimit`, adopted repos only: warns when `AGENTS.md` is larger than the `project_doc_max_bytes` Codex will read.
10. **`REVIEW.md`.** From `checkReviewMd`, adopted repos only: the root rulebook is absent, current, behind PRISM's copy, or unmarked (your own, which `update` leaves alone).
11. **Host output.** From `checkHostOutput`: warns when a host dropped from `hosts` still has PRISM output on disk.
12. **Version.** Existing bullet.

Then:

- Line 37: `"Winston, plan this out." "Clove, implement this." "Briar, review my changes."` becomes `"Mira, write the intent." "Winston, is this the right approach?" "Briar, review my changes."`.
- `last_updated` per the Frontmatter convention.

The proof counts the bullets between the section's heading and the next `###` heading: `awk '/^## Check install health/,/^### /' docs/adopt-prism.md | grep -c '^- \*\*'` prints 12. A human also maps each `check:` ID from `grep -o 'check: "[a-z-]*"' scripts/ai-skills/doctor.ts | sort -u`, plus `checkGitHooks`, to one bullet.

### T3: Replace the doctor list in what-prism-writes.md with a link

- files: docs/what-prism-writes.md
- proof: awk '/^## What `prism doctor` does/,/^## What `prism eject`/' docs/what-prism-writes.md | grep -c 'adopt-prism.md#check-install-health-with-prism-doctor' (prints 1)
- proof fails on main: yes
- depends on: T2

Owner: Eli. Two copies of the list are why each new check drifted, so one copy owns it.

Under "## What `prism doctor` does — nothing gets written", replace the whole paragraph (it starts "`prism doctor` is read-only. It validates") with:

> `prism doctor` is read-only: it checks your config, your sync state, the files and hooks PRISM delivered, and your installed version, then prints every finding in one pass. The full list of checks, in the order they run, is in [Check install health with `prism doctor`](./adopt-prism.md#check-install-health-with-prism-doctor). It never writes a file, so running `prism doctor` as often as you like is always safe.

`last_updated` per the Frontmatter convention.

### T4: Add Atlas's architect-doc offer and an intent-first start to getting-started.md

- files: docs/getting-started.md
- proof: grep -n "plan this out" docs/getting-started.md (prints nothing) and grep -n "architect doc" docs/getting-started.md (matches)
- proof fails on main: yes
- depends on: none

Owner: Eli.

- Step 3's numbered Atlas list: insert a new item 5 after item 4 ("Write your team's `.ai-skills/config.json` and rerun `prism update` ..."), and renumber "Track its progress ..." to 6. Before writing it, read step 6 of `.ai-skills/skills/prism-onboard/shared.md` (the "Architect routes" item, at about line 65) and keep the item to what that step says. New item 5: `Offer to draft architect docs for the main areas of your code and route them in \`.prism/architect/manifest.json\`, so agents read them before editing there. You can decline the offer.`
- Step 4's first bullet, `- **Planning architecture:** "Winston, plan this out." or describe an architecture question`, becomes two bullets:
  - `- **Starting work:** "Mira, write the intent." She asks one question at a time, and once you approve the intent the stages after it run on their own.`
  - `- **Approach questions:** "Winston, is this the right approach?" or describe an architecture question`
- `last_updated` per the Frontmatter convention.

### T5: Rewrite workflow.md around the plan-folder chain

- files: docs/workflow.md
- proof: grep -nE "Review Issues|user stories|plan this out|Winston plans|Implementation Tasks" docs/workflow.md (prints nothing) and grep -n "prism-debug" docs/workflow.md (matches) and grep -n "rules/workflow.md" docs/workflow.md (matches)
- proof fails on main: yes
- depends on: none

Owner: Eli. At `2cb1633a` the page describes the flat-plan, persona-driven flow: no Sasha row, Winston writing tasks, Clove pushing, Briar writing `## Review Issues`, Mira writing user stories. Keep the frontmatter keys, update `description` to `"How work moves from intent to merged PR in PRISM: the plan folder, its stages, and where you step in."`, and set `last_updated`. Replace the body with these sections, in this order. The source of truth for every stage, cap, and stop is `.prism/rules/workflow.md`. Link to it and do not copy its resume table or its build-report shape, because `documentation.md` keeps agent-facing spec out of the doc root.

1. `# The PRISM Workflow`, then one paragraph: a ticket runs through a plan folder at `.prism/plans/<ticket>/`; you approve the intent and read the PR; everything between runs on its own.
2. `## Your two touches`. Approve `intent.md` (say `approve` in chat, or run the approval script in a terminal and press `y`), then read the draft PR, flip it ready, and merge. Name the three things that add a touch: a design the intent marks as needing approval, a plan that fails automatic approval, and a change that would alter the approved intent.
3. `## The stages`. A numbered list: intent (Mira, `prism-intent`), design when needed (Pixel, `prism-design`), spec (`prism-spec`, a subagent), plan (`prism-plan`), two challenge rounds (`prism-challenge`, subagents), implement (Clove, `prism-implement`) and docs (Eli, `prism-docs`), verify (`prism-verify`, a subagent), self-review (Briar, `prism-self-review`), draft PR, PR review (Eric, `prism-pr-review`, a subagent), retro (Iris, `prism-retro`). One line each on what it writes. Say stages commit and the session pushes and opens the PR.
4. `## Sizes`. Standard is the default; an epic folder holds `intent.md` and `spec.md` and its children each run the standard stages.
5. `## Picking up where a session left off`. A fresh session reads the folder and runs the first stage whose output is missing; the table is in `.prism/rules/workflow.md`.
6. `## Asking for help along the way`. A table with columns Persona and Call when: Winston (`prism-architect`) for approach questions at any time, with no plan folder needed; Sasha (`prism-debug`) for a bug whose cause is unknown, whose report becomes the intent's Problem section; Nora (`prism-start-ticket`) to set up a ticket and branch; Parker (`prism-prd`) for an initiative-grain PRD; Reese (`prism-qa-plan`) for a QA checklist; Sage (`prism-changelog`) for a changelog; Lilac (`prism-standup`) for a standup; Zoe (`prism-audit`) for a cadence audit. Link to `personas.md`.
7. `## Flat plans still work`. An existing `.prism/plans/<ticket>.md` keeps resolving and keeps its own shape; nothing is migrated.
8. Keep the existing `## Why rules load when they do` and `## Going deeper` sections verbatim, except `Going deeper` adds a link to `.prism/rules/workflow.md`.

### T6: Remove the stale persona lines from README, overview, parker, and CONTEXT

- files: README.md, docs/overview.md, docs/ai-skills/parker.md, CONTEXT.md
- proof: git grep -nE "review-loop|Winston, plan|Winston plans|plan this out|User story|written by Winston|which Winston runs|at plan _close_ \(Winston\)" -- docs README.md CONTEXT.md (prints nothing)
- proof fails on main: yes
- depends on: T2, T4, T5

Owner: Eli. Exact replacements, each found by its old text:

- `README.md:7`: `When Winston plans architecture, Clove implements it, Briar reviews it, and Eli documents it, each picks up where the last left off. The branch plan carries context across sessions;` becomes `When Mira writes the intent, the spec and plan stages turn it into tasks, Clove builds them, and Briar and Eric review the result, each picks up where the last left off. The plan folder carries context across sessions;`.
- `README.md:11`: `architect (Winston), implementer (Clove), self-reviewer (Briar), PR reviewer (Eric), doc writer (Eli), ticket writer (Nora), QA planner (Reese)` becomes `intent writer (Mira), implementer (Clove), self-reviewer (Briar), PR reviewer (Eric), architect consult (Winston), debugger (Sasha), doc writer (Eli), ticket writer (Nora), QA planner (Reese)`.
- `docs/overview.md:17`: the same replacement as `README.md:7`, with that file's own wording kept around it (`each one picks up`, `the tier system`).
- `docs/overview.md:31`: `The workflow after that is persona-driven: Winston for architecture, Clove for implementation, Briar and Eric for review, Eli for documentation. Each persona reads the branch plan to pick up context, and writes back to it when decisions are made.` becomes `The workflow after that runs through a plan folder: Mira writes the intent you approve, the spec and plan stages run on their own, Clove builds, Briar and Eric review, and Eli documents. Winston answers approach questions at any point. Each stage reads the plan folder to pick up context and writes back to it. See [workflow.md](./workflow.md).`
- `docs/ai-skills/parker.md:21`: `- **Before Winston.** When you're about to ask Winston to plan an initiative but the scope is fuzzy. The PRD pins the scope; Winston plans against it.` becomes `- **Before an approach question.** When you want Winston's read on an initiative but the scope is fuzzy. The PRD pins the scope; Winston judges the approach against it.`
- `docs/ai-skills/parker.md:66`: `| **Mira** | User story | Initiative → tickets | User stories with AC hints |` becomes `| **Mira** | Ticket | Initiative → intents | \`intent.md\` with acceptance criteria |`.
- `docs/ai-skills/parker.md:68`: `| **Winston** | Implementation | Ticket → plan | Branch plan + implementation tasks |` becomes `| **\`prism-plan\`** | Implementation | Intent → plan | \`plan.md\` tasks |`.
- `docs/ai-skills/parker.md:70`: `Parker → Mira → Nora → Winston is the typical` becomes `Parker → Mira → Nora → the spec and plan stages is the typical`.
- `CONTEXT.md:51`: `(\`prism-handoff\`, \`prism-review-loop\`)` becomes `(\`prism-handoff\`, \`prism-plan\`)`.
- `CONTEXT.md:114`: `written by Winston, read by all (ADR-0014)` becomes `written by the plan stage (\`prism-plan\`), read by all (ADR-0014)`.
- `CONTEXT.md:187`: `which Winston runs` becomes `which \`prism-retro\` runs on a folder plan and the plan stage on a flat one`.
- `CONTEXT.md:199`: `runs at plan _close_ (Winston)` becomes `runs at plan _close_ (\`prism-retro\` on a folder plan, the plan stage on a flat one)`.
- `last_updated` on `docs/overview.md` and `docs/ai-skills/parker.md` per the Frontmatter convention.

The proof is the spec's sweep grep widened by the three `CONTEXT.md` phrases. It runs clean only after T2 (`docs/adopt-prism.md:37`), T4 (`docs/getting-started.md:57`), and T5 (`docs/workflow.md`) land, which is why T6 depends on them. Also check `git grep -nE "<each of the 19 retired IDs from T8's table>" -- docs README.md CONTEXT.md` prints nothing.

### T7: Add a troubleshooting section for a denied agent command

- files: docs/troubleshooting.md
- proof: grep -n "^## A PRISM hook denied an agent's command" docs/troubleshooting.md (matches), and a human checks every `###` gate section under `.prism/architect/_toolkit/hook-runtime.md` (Write gate's umbrella speed bump, Git gates, Approve guard, Secrets gate, Commit gate, Brief gate, Reconcile gate, plus the Write gate itself) has a row
- proof fails on main: yes
- depends on: none

Owner: Eli. Insert the new section after "## Windows notes" and before "## Related pages", headed `## A PRISM hook denied an agent's command`. Its anchor is `#a-prism-hook-denied-an-agents-command`, which T8 links to.

Open with two sentences: on Claude Code and Codex, PRISM's hooks stop some agent actions before they run, and the deny message names its gate and the fix; Cursor gets no hooks. Then a table with columns Gate, What it stops, and What clears it. One row per gate, every claim taken from `hook-runtime.md` or `git-hooks.md` under `.prism/architect/_toolkit/`:

- **Write gate.** An edit, delete, or command that touches a path a manifest route covers, before the route's docs are read. Clears: run each `cat` the message names as its own command, or a `Read` with no offset or limit.
- **Umbrella speed bump.** A new heading in a doc on the manifest's `umbrellas` list or in a rule file. Clears: retry the same edit; consider whether the section belongs in its own routed doc.
- **Secrets gate.** Reading a `.env` file (other than `.env.example`), a `.pem` or `.key` file, or anything under a `secrets` folder. Clears: `node .claude/hooks/env-keys.mjs <file>` prints the key names without values, or read `.env.example`.
- **Commit gate.** A commit with `-a`, `--no-verify`, no paths named, or more than one commit per command; a removed test line or a dependency change with no task allowing it; a push with `--no-verify`. Clears: name the paths after `--`, or commit through `node .claude/hooks/plan/commit.mjs "<subject>" <paths>`; a task listing the file with `behavior change:` or `new dependency:`.
- **Approve guard.** An agent running the approval script or editing a chain file's approval lines. Clears: the person says `approve` in chat, then the agent runs exactly `node .claude/hooks/plan/approve.mjs <file>`; or the person runs it in a terminal and presses `y`.
- **Brief gate.** A subagent brief to a workflow stage over 15 non-blank lines or with an override phrase. Clears: a short brief naming what the stage reads, the worktree, and the report shape, with anything longer moved into `plan.md`. On Codex it only logs.
- **Reconcile gate.** A PR-review subagent stopping while reconcile still reports unanswered or unlogged comments. Clears: handle the comments it names and end with a `prism-pr: <n>` line. It lets the stop through after three blocks.
- **Cleanup-pass hold and push gate.** Off until `hooks.commitCleanupPass` or `hooks.pushVerification` is set in `.ai-skills/config.json`. The first commit on each HEAD is held once; a push is denied when lint or format fails. Clears: read `.prism/references/cleanup-pass.md` and retry; fix what lint or format reports.
- **Git hooks skipping.** The pre-commit or pre-push hook prints a skip notice. Not a deny: the hook has no `gitHooks` command and globs in `.ai-skills/config.json`, or the tool isn't installed. Clears: set `command` and `globs` under `gitHooks.preCommit` or `gitHooks.prePush`, or install the tool.
- **Git hooks left alone.** `prism doctor` reports another hooks setup, such as `core.hooksPath` set to `.husky`. PRISM's git hooks are not active, by design. Clears: keep your setup, or remove the other hooks path and run `prism hooks install`.

After the table, one paragraph on the kill switches: `PRISM_HOOK_DENY_DISABLE=1` turns off every deny except the secrets gate's and the approve guard's; `PRISM_HOOK_DISABLE=1` stops every hook except those two. The commit gate denies a command that sets either. The git hooks read neither. Close with one sentence linking to `hook-runtime.md` for detail, as a link to `../.prism/architect/_toolkit/hook-runtime.md`.

`last_updated` per the Frontmatter convention.

### T8: Write the 1.0.0 migration note in CHANGELOG.md

- files: CHANGELOG.md
- proof: head -12 CHANGELOG.md | grep -n '^## \[1.0.0\] — 20[0-9][0-9]-[0-9][0-9]-[0-9][0-9]$' (matches), and grep -oE 'https://github.com/HunterMcGrew/PRISM/blob/main/[^)#]+' CHANGELOG.md | sed 's#.*/blob/main/##' | sort -u | while read p; do [ -e "$p" ] || echo "MISSING $p"; done (prints nothing)
- proof fails on main: yes
- depends on: T5, T7

Owner: Eli. Insert the entry after the intro paragraph's `---` line and before `## [Epic C — First-Contact Reconciliation] — 2026-06-16`, followed by its own `---`. The heading is `## [1.0.0] — <the T8 commit's date, YYYY-MM-DD>`. `CHANGELOG.md` ships in the tarball and `docs/` doesn't, so every link is an absolute `https://github.com/HunterMcGrew/PRISM/blob/main/<path>` URL, never a relative path. Anchors: `docs/troubleshooting.md#a-prism-hook-denied-an-agents-command` and `docs/workflow.md`.

The entry follows the spec's Migration note outline, its nine parts in order, each a `###` heading with short bullets. What the spec leaves open is decided here:

- Part 1 opens with: `PRISM 1.0.0 is a clean break. Run \`npx @huntermcgrew/prism@1.0.0 update\`, then \`npx @huntermcgrew/prism@1.0.0 doctor\`.` and states what is left alone: flat plans, your own skills and plans, and a `core.hooksPath` that isn't PRISM's. Add one line: `Versions 0.7.0 to 0.10.0 are not recorded in this file.`
- Part 2 names, for Claude Code and Codex: the commit, secrets, brief, and approve gates, the reconcile gate on PR review, the two kill switches and that the secrets gate and approve guard ignore them, and `env-keys.mjs` as the secrets gate's remedy. Link to the troubleshooting section.
- Part 4 is a table with columns Old skill, Now, and Persona. Build it from `git ls-tree --name-only 7441c073 .ai-skills/skills/ | sed 's#.*/##' | LC_ALL=C sort` against `ls .ai-skills/skills | LC_ALL=C sort` at the branch head, and stop if the diff differs from the lists below:
  - `devils-advocate` → `prism-challenge`; `prism-code-dev` → `prism-implement` (Clove); `prism-code-review-pr` → `prism-pr-review` (Eric); `prism-code-review-self` → `prism-self-review` (Briar); `prism-data` → `prism-metrics` (Tess); `prism-debugger` → `prism-debug` (Sasha); `prism-documentation` → `prism-docs` (Eli); `prism-founder` → `prism-strategy` (Vera); `prism-onboarding` → `prism-onboard` (Atlas); `prism-qa-test-plan` → `prism-qa-plan` (Reese); `prism-skill-forge` → `prism-forge-skill`; `prism-standup-summary` → `prism-standup` (Lilac); `prism-surface-audit` → `prism-audit` (Zoe); `prism-ticket-start` → `prism-start-ticket` (Nora); `prism-user-stories` → `prism-intent` (Mira).
  - Retired with no replacement: `prism-conductor` (Sol), `prism-refactor-scout` (Ren), `prism-doc-walker` (Theo), `prism-review-loop`.
  - New with no predecessor: `prism-plan`, `prism-spec`, `prism-verify`.
  - One line under the table: `prism update` removes the old skill directories, and the persona names above still route to their new skills. Sol, Ren, and Theo no longer route.
  - One more line: Winston (`prism-architect`) planned work at `0.10.0` and is now a consult that answers approach questions; "plan this out" now routes to `prism-plan`.
- Part 7 lists `stopPaths`, `testGlobs`, `secretPaths`, `importAliases`, `ci.requiredCheck`, `gitHooks`, and `hooks`, each absent from `.ai-skills/config.schema.json` at `7441c073` (checked 2026-11-20), and says an existing config stays valid. It adds two changed keys: `features.conductorMayMerge` is now `features.mainSessionMayMerge` (rename the key to keep the setting; it governs PRISM's own merges and a consumer leaves it unset), and `modelTiers.top` and `modelTiers.worker` are gone and can be deleted, while `modelTiers.overrides` stays and only its `eric` entry is read. T9's release proof checks what `prism doctor` says about a config that still carries the old keys; if it reports more than nothing or an info line, change this bullet to match before the PR opens, committed as `T8 fix: <summary>`.
- Part 8 says the repo-level `project_doc_max_bytes` key is not yet verified in a live Codex run, and `prism doctor` warns when `AGENTS.md` is over the limit.

Every persona name in the routing table of `.prism/rules/skill-routing.md` maps to a directory under `.ai-skills/skills/` (checked at `2cb1633a`: `for s in $(grep -oE '\`prism-[a-z-]+\`' .prism/rules/skill-routing.md | tr -d '\`' | sort -u); do [ -d .ai-skills/skills/$s ] || echo MISSING $s; done` prints nothing). Rerun that check before committing; any output means a renamed skill lost its route, which is a re-plan, not a changelog edit.

### T9: Bump the version to 1.0.0

- files: package.json
- proof: node -p "require('./package.json').version" prints 1.0.0, git diff HEAD~1 -- package.json shows one changed line, pnpm run prism:check passes, and the release proof below passes
- proof fails on main: yes
- depends on: T1, T2, T3, T4, T5, T6, T7, T8

Owner: Clove. Hand-edit line 3, `"version": "0.10.0",` to `"version": "1.0.0",`, and change nothing else. Don't run `npm version`, because it commits and tags outside `commit.mjs`. A version is not one of the four npm dependency fields, so the commit gate's stops check needs no `new dependency:` line. Commit `T9: Bump the version to 1.0.0`.

**The release proof** runs after the T9 commit, against the packed tarball, with `S` set to a fresh directory under the session's scratchpad. Run the spec's Adopt and upgrade proof script with one change. Its `git add -A && git commit -qm "0.10.0 baseline"` line names no paths, and PRISM's commit gate denies it once `$S/up` holds `.prism/architect/manifest.json`, so replace that line, and the script's last `git diff --quiet ...` line, with a checksum snapshot:

```bash
find .claude/skills/acme-notes .prism/plans -type f -exec sha256sum {} + | LC_ALL=C sort > "$S/up-before.txt"
# ... npx -y --package="$TGZ" prism update, then prism doctor, as in the spec ...
find .claude/skills/acme-notes .prism/plans -type f -exec sha256sum {} + | LC_ALL=C sort | diff - "$S/up-before.txt"; echo "untouched=$?"
```

The `git init` and `git commit --allow-empty -m init` lines stay: they run before adopt, when the repo has no manifest, and the gate passes a commit there. Before `update`, check whether `$S/up/.ai-skills/config.json` carries `features.conductorMayMerge` or `modelTiers`; if it carries neither, add `"features": { "conductorMayMerge": false }` to it by hand, so the doctor run below sees the old keys. Then run the `.husky` variant in `$S/husky`: the same steps as `$S/up`, with `git config core.hooksPath .husky` run after the snapshot and before `update`. The writes into the scratch repos may meet the write gate; reading the docs it names clears it. Then read these off the three directories:

- `tar tzf` prints `CLEAN`.
- `prism doctor` exits 0 in `$S/fresh`, `$S/up`, and `$S/husky`, and no line starts `[ERROR]`.
- `node -p "require('./.prism/.sync-manifest.json').version"` in `$S/up` prints `1.0.0`. Read the key name off the file first; if it is not `version`, use the key that holds the PRISM version.
- In `$S/up`, `ls -d .claude/skills/* .cursor/skills/* .agents/skills/* .claude/agents/* .codex/agents/* 2>/dev/null` names none of the 19 retired IDs from T8's table, matching each ID as a whole directory name or as an agent file stem.
- The checksum `diff` in `$S/up` prints nothing and `untouched=0`.
- Doctor's lines in `$S/up` about `conductorMayMerge` or `modelTiers`, or the absence of any, which T8's Part 7 bullet must match.
- For each PRISM hook command, `grep -o '<command path>' .claude/settings.json | wc -l` gives the same count in `$S/fresh` and `$S/up`, and no command appears more often in `$S/up`. Take the command paths from `$S/fresh/.claude/settings.json`.
- `git config core.hooksPath` prints `.githooks` in `$S/fresh` and `$S/up`, and `.husky` in `$S/husky`, where doctor prints an info line saying the hooks were left alone.
- `.claude/hooks/plan/approve.mjs` and `.claude/hooks/commit-gate.mjs` exist in `$S/fresh` and `$S/up`.

After the proof, #544's AC-11 human check (AC-16) is a person's step in `$S/fresh`: leave the scratch repo in place, name its path in the build report, and don't run onboarding yourself.

A retired skill left on disk or a duplicated hook registration is a code defect: report `needs-replan` with the evidence, and don't work around it in docs. Record the results in this plan under a `## Release proof` section placed after `## Verification`: one bullet per check above with what it printed, and every WARN and INFO line doctor printed in each directory with a one-line reason. Commit that as `plan: Record the release proof`.

## Challenge

round 1: blocking 2
  - plan (blocking): no `## Acceptance Criteria` section, which the plan stage owes an epic child
  - T9 (blocking): the release-proof script's `git commit` lines name no paths and the commit gate denies them
  - T8 (non-blocking): the migration note omits the renamed `features.conductorMayMerge` and the dropped `modelTiers.top` and `modelTiers.worker`
  - plan (non-blocking): the published 0.10.0's `gitHead` is `f569c57c`, not `7441c073`
  - T6 (non-blocking): its full sweep proof runs clean only after T2, T4, and T5, with no ordering stated
  - T2 (non-blocking): the text says four existing bullets and lists five
round 2: resolved 2
  - AC-3 and T8 (non-blocking): `comm -3` on the C-sorted rosters needs `LC_ALL=C` too, or it prints 39 lines with a spurious `prism-prd` and the AC-3 loop reports a false `MISSING`
  - AC-4 (non-blocking): the `grep -E 'Sol|Ren|Theo'` evidence also matches words like "Renamed", so it can pass with the retired personas unnamed
  - T8 (non-blocking): Part 7 says `modelTiers.top` and `worker` are gone but not that `overrides` stays and now only `overrides.eric` is read
  - T8 (non-blocking): the note never says `prism-architect` (Winston) existed at 0.10.0 as the planner and is now a consult, so a consumer's "Winston, plan this out" habit is left unexplained
  - AC-2 (non-blocking): the human evidence opens `blob/main` anchors that do not exist until the PR merges
  - T9 (non-blocking): AC-16's person step lives only in Decisions, so a builder reading T9 never sees it
  - T7 (non-blocking): the git-hooks skip row names `gitHooks.preCommit` and `gitHooks.prePush` where the keys are their `command` and `globs` fields

## Decisions

- **Nine tasks, one PR, numbered T1 to T9.** Winston's checked list ran T1 to T8 and T10 with no T9. The IDs here are this plan's own and run without a gap, so T9 is his T10. One PR because nearly all of it is prose with one job; a split, if review asks, cuts after T7.
- **The sweep grep has no `docs/personas.md` exception.** Winston's T6 proof allowed `docs/personas.md:158`. That line reads "Plan this out." with a capital P, which the case-sensitive grep never matches, so the spec's clean-output check stands (re-run 2026-11-20 at `2cb1633a`).
- **`docs/ai-skills/parker.md:21` and `:68` and `:70` are fixed with `:66`.** Line 21 says Winston plans an initiative, and lines 68 and 70 put Winston on the ticket-to-plan rung, which requirement 11 rules out. They are in a file Affected systems already lists.
- **`CONTEXT.md` lines 114, 187, and 199 are fixed with line 51.** They say Winston writes plan Decisions and runs the verdict gate. The plan stage writes Decisions and `prism-retro` writes the verdicts on a folder plan, per `.prism/rules/branch-plan.md`, and requirement 11 rules out a doc saying Winston plans. Same file, same sweep, so this follows from the approved outcome.
- **T7 has a row for the cleanup-pass hold and push gate.** The spec's row list leaves them out, but requirement 13 asks for every gate `hook-runtime.md` documents, and its Git gates section documents both. The requirement wins over the list.
- **Changelog links are absolute GitHub URLs.** `CHANGELOG.md` ships in the tarball and `docs/` doesn't, so a relative `docs/...` link would be dangling for a consumer reading `node_modules`. Relative links lost because they only resolve in a checkout.
- **The changelog entry is dated by the T8 commit.** The publish date isn't known when T8 lands, and the publish follows the merge by hand. Leaving a placeholder lost because a placeholder would ship if the publish ran from the merged tree.
- **The release proof is recorded under `## Release proof`, not `## Verification`.** `## Verification` belongs to `prism-verify`, and `plan.md` is not inside Affected systems, so the record is a `plan:` commit and not a task's file.
- **#544's AC-11 human check (decline Atlas's architect-doc offer) runs in `$S/fresh` after T9 and is a person's step.** Requirement 16 needs a person to run onboarding and decline the offer, which no task can do. If no person has run it when the PR opens, it is listed on the PR body and in the closing summary as an open item, with the scratch repo's path, and its result goes under `## Release proof` when it runs.
- **`7441c073` stays the `0.10.0` baseline.** The published `0.10.0` tarball's `gitHead` is `f569c57c` (#486), a descendant whose only change from `7441c073` is `docs/publishing-prism.md`, which doesn't ship. The roster and schema diffs are the same from either commit, so swapping would change no output.
- **T6 waits for T2, T4, and T5.** Its sweep proof only runs clean once those three have removed their stale lines, and a proof that can't pass when its task lands proves nothing.
- **Acceptance criteria are the spec's Requirements, one for one.** The plan stage writes an epic child's criteria. Numbering them in the spec's order keeps "AC-n" equal to "Requirement n", so the review grades against the spec without a lookup table.
- **Adjacent stale lines left alone.** `docs/overview.md:29` still says PRISM lives as a sibling repo, and `docs/distribution.md:65` and `:66` say Winston generates architect docs in Phase 3. Neither is named by a requirement, and `docs/distribution.md` is outside Affected systems, so both are a follow-up PR after the release.
- **Spurious `.bak` files on upgrade get a CHANGELOG note, and the code fix is a follow-up PR.**
  - **Root cause:** not diagnosed. T9's release proof shows `prism update` from an unedited 0.10.0 install keeps `.prism/architect/guides/writing-a-skill.md` and `writing-an-architect-doc.md` as `.bak` files byte-identical to the 0.10.0 seed, so update treats an untouched seed copy as edited.
  - **Alternatives considered:** fixing update's ownership check in this PR; leaving it unmentioned.
  - **Chosen approach:** one CHANGELOG bullet telling upgraders they can delete the two files if they never edited the guides. The fix lives in update code outside Affected systems, and the files are harmless copies, so it doesn't hold the release.
  - **Implementation guidance:** a follow-up PR diagnoses update's divergence check for these seeds and adds a regression test.

## Acceptance Criteria

The spec's Requirements 1 to 16, in order, with IDs and evidence. Each names the task whose proof covers it.

- [ ] **AC-1** `package.json` `"version"` reads `1.0.0`, hand-edited, with no other change to the file. (T9)
  - Evidence (machine): `node -p "require('./package.json').version"` prints `1.0.0`, and `git diff origin/main -- package.json` shows exactly one removed and one added line, both the `"version"` line · UNMET looks like: any other line in the diff, or a `v1.0.0` tag created by `npm version`.
- [ ] **AC-2** `CHANGELOG.md` opens with a dated `## [1.0.0]` entry above every existing entry, holding the migration note, and every link in it resolves. (T8)
  - Evidence (machine): the first `## [` line of `CHANGELOG.md` matches `^## \[1.0.0\] — [0-9]{4}-[0-9]{2}-[0-9]{2}$`, and T8's link loop prints nothing · UNMET looks like: Epic C above it, or a `MISSING` line.
  - Evidence (human): each anchor in the entry names a heading that exists in the branch's copy of the linked file; on GitHub's `blob/main` the anchors resolve only after merge.
- [ ] **AC-3** The rename table lists every skill ID present at `0.10.0` and absent at `1.0.0`, each with its replacement or marked retired, and every skill ID added since. (T8)
  - Evidence (machine): every ID from `comm -3` of the two `LC_ALL=C sort`ed rosters in T8 appears in the `[1.0.0]` entry: `for id in $(LC_ALL=C comm -3 old new | tr -d '\t'); do grep -q "\`$id\`" CHANGELOG.md || echo "MISSING $id"; done` prints nothing · UNMET looks like: one of the 37 IDs missing.
- [ ] **AC-4** Every persona name that maps to a current skill still routes to it in `.prism/rules/skill-routing.md`, and a name with no current skill is named retired in the migration note. (T8)
  - Evidence (machine): T8's routing loop prints nothing, and `grep -wE 'Sol|Ren|Theo' CHANGELOG.md`, run on the entry alone, finds all three names matches inside the `[1.0.0]` entry · UNMET looks like: a `MISSING prism-*` line, or Sol, Ren, or Theo absent from the note.
- [ ] **AC-5** A fresh repo that runs `prism init` and `prism adopt` from the packed `1.0.0` tarball gets a `prism doctor` exit of 0 with no ERROR line. (T9)
  - Evidence (machine): `## Release proof` records `exit=0` and no `[ERROR]` line for `$S/fresh` · UNMET looks like: a non-zero exit or an `[ERROR]` line.
- [ ] **AC-6** A repo adopted at `0.10.0` and updated from the packed tarball gets a doctor exit of 0 with no ERROR, and meets every upgrade check in spec Requirement 6. (T9)
  - Evidence (machine): `## Release proof` records, for `$S/up`, `exit=0`, the sync manifest at `1.0.0`, no retired ID on disk, `untouched=0`, equal hook command counts with `$S/fresh`, `core.hooksPath` `.githooks`, and both hook files present · UNMET looks like: any of those lines differing, such as a leftover `devils-advocate` directory or a hook command counted twice.
- [ ] **AC-7** The same upgrade with `core.hooksPath` set to `.husky` first leaves it at `.husky`, and doctor reports the hooks as left alone. (T9)
  - Evidence (machine): `## Release proof` records `.husky` for `$S/husky` and doctor's info line for it · UNMET looks like: `.githooks` there, or no left-alone line.
- [ ] **AC-8** The packed tarball holds no file under `.prism/plans`, `audits`, `retros`, `prds`, `changelogs`, or `archived`, and no `.prism/lessons.md`. (T9)
  - Evidence (machine): `## Release proof` records `CLEAN` from the spec's `tar tzf` grep · UNMET looks like: `LEAK`.
- [ ] **AC-9** `docs/publishing-prism.md` shows every `git commit` with the paths it commits after `--`. (T1)
  - Evidence (machine): T1's proof prints nothing, with a positive control: `grep -c '^git commit ' docs/publishing-prism.md` prints at least 1 · UNMET looks like: a `git commit` line without ` -- `.
- [ ] **AC-10** `docs/adopt-prism.md` lists every doctor check in `runDoctor`'s order and is the only doc that lists them; `docs/what-prism-writes.md` summarizes doctor in one line linking to that list. (T2, T3)
  - Evidence (machine): T2's bullet count prints 12 and T3's link count prints 1 · UNMET looks like: 11 or 13 bullets, or the old list still in `what-prism-writes.md`.
  - Evidence (human): the 12 bullets follow the call order in `runDoctor`, and no other `docs/` page lists the checks.
- [ ] **AC-11** `docs/getting-started.md` lists Atlas's architect-doc offer, and no doc in `docs/`, `README.md`, or `CONTEXT.md` tells a reader to start with "Winston, plan this out" or says Winston plans or writes the tasks. (T4, T5, T6)
  - Evidence (machine): T4's two greps and T6's sweep grep · UNMET looks like: any line printed by the sweep, or no `architect doc` line in `getting-started.md`.
- [ ] **AC-12** `docs/workflow.md` describes the plan-folder workflow that ships in `1.0.0`. (T5)
  - Evidence (machine): T5's three greps · UNMET looks like: `Review Issues` or `Implementation Tasks` still on the page, or no link to `.prism/rules/workflow.md`.
  - Evidence (human): every stage in `.prism/rules/workflow.md`'s Standard line appears in the page's stage list, in the same order.
- [ ] **AC-13** `docs/troubleshooting.md` has a section naming which gate denied an agent's command and what clears it, for every gate `hook-runtime.md` documents and the git hooks. (T7)
  - Evidence (machine): T7's heading grep matches · UNMET looks like: no such heading.
  - Evidence (human): every gate section in `hook-runtime.md` and both git-hook cases have a row.
- [ ] **AC-14** `README.md`, `docs/overview.md`, `docs/ai-skills/parker.md`, and `CONTEXT.md` no longer name a retired skill, say Winston plans architecture, or say Mira writes user stories. (T6)
  - Evidence (machine): T6's sweep grep and its retired-ID grep both print nothing · UNMET looks like: `prism-review-loop` or `User story` still present.
- [ ] **AC-15** `pnpm prism:check` passes on the branch head. (T9)
  - Evidence (machine): `pnpm run prism:check` exits 0 at the head, recorded under `## Verification` by `prism-verify` · UNMET looks like: a non-zero exit.
- [ ] **AC-16** #544's AC-11 human check, declining Atlas's architect-doc offer during onboarding, is run in `$S/fresh` and its result is recorded in `plan.md`. (person, after T9)
  - Evidence (human): `## Release proof` holds a line saying the offer was declined and no architect route over the scratch repo's own code was written · UNMET looks like: no such line when the PR opens, which then stands as an open item on the PR.

## History

- 2026-11-20 [huntermcgrew/prism-550-release-1-0-0]: Wrote the plan from the spec and Winston's checked task list, nine tasks.
- 2026-11-20 [huntermcgrew/prism-550-release-1-0-0]: T1 added the paths to the publishing guide's commit, T2 listed all 12 doctor checks in run order in adopt-prism.md, and T4 added Atlas's architect-doc offer and the intent-first start to getting-started.md.
- 2026-11-20 [huntermcgrew/prism-550-release-1-0-0]: T5 rewrote docs/workflow.md around the plan-folder chain, with the two touches, stages, sizes, resuming, a persona table with Sasha and Winston as consult, and flat plans still working.
- 2026-11-20 [huntermcgrew/prism-550-release-1-0-0]: T7 added the "A PRISM hook denied an agent's command" section to docs/troubleshooting.md, one row per gate in hook-runtime.md and git-hooks.md, including the cleanup-pass hold and push gate.
- 2026-11-20 [huntermcgrew/prism-550-release-1-0-0]: T3 replaced the doctor paragraph in what-prism-writes.md with one summary that links to the full list in adopt-prism.md.
- 2026-11-20 [huntermcgrew/prism-550-release-1-0-0]: T6 removed the stale Winston-plans, user-story and prism-review-loop lines from README, overview, parker and CONTEXT, and the sweep and retired-ID greps print nothing.
- 2026-11-20 [huntermcgrew/prism-550-release-1-0-0]: T8 wrote the 1.0.0 migration note into CHANGELOG.md in the spec's nine parts, with absolute links to the troubleshooting and workflow pages.
- 2026-11-20 [huntermcgrew/prism-550-release-1-0-0]: T9 bumped package.json to 1.0.0, and the release proof from the packed tarball passed in the fresh, upgrade and husky repos, with results under the Release proof section.

## Sessions

## Verification

verdict: done
base: 09e24a226bf63841741b9063e9e499b4a2876ed1
head: f46fbfeb423f8864728ffce5e30857aca4eabef7

| check | result | evidence |
| --- | --- | --- |
| typecheck | pass | /tmp/claude-1000/-home-zibbix-Projects-PRISM--claude-worktrees-prism-personas-handoff-9543ef/b5b3cef5-428f-4603-b5db-5f5291220dc9/scratchpad/typecheck.log |
| lint | pass | /tmp/claude-1000/-home-zibbix-Projects-PRISM--claude-worktrees-prism-personas-handoff-9543ef/b5b3cef5-428f-4603-b5db-5f5291220dc9/scratchpad/lint.log |
| test | pass | /tmp/claude-1000/-home-zibbix-Projects-PRISM--claude-worktrees-prism-personas-handoff-9543ef/b5b3cef5-428f-4603-b5db-5f5291220dc9/scratchpad/test.log |
| build | pass | /tmp/claude-1000/-home-zibbix-Projects-PRISM--claude-worktrees-prism-personas-handoff-9543ef/b5b3cef5-428f-4603-b5db-5f5291220dc9/scratchpad/build.log |
| format | n/a: not configured | none |
| spec | pass | /tmp/claude-1000/-home-zibbix-Projects-PRISM--claude-worktrees-prism-personas-handoff-9543ef/b5b3cef5-428f-4603-b5db-5f5291220dc9/scratchpad/spec.log |

### Failures

- none

## Release proof

Run 2026-11-20 against `huntermcgrew-prism-1.0.0.tgz`, packed from the T9 commit `6afcb8d9`, in three scratch repos (`fresh`, `up`, `husky`) under the session scratchpad. `up` and `husky` were adopted at `0.10.0`, given a consumer skill `acme-notes` and a flat plan `acme-1.md`, and given `features.conductorMayMerge: false` by hand, then updated from the tarball.

- `tar tzf` leak grep printed `CLEAN`.
- `prism doctor` exited 0 in `fresh`, `up`, and `husky`, with no `[ERROR]` line in any.
- `.prism/.sync-manifest.json` in `up` records `1.0.0`, under the key `prismVersion`, not `version`.
- No retired ID from T8's table (all 19) remains as a directory or agent file stem under `.claude/skills`, `.cursor/skills`, `.agents/skills`, `.claude/agents`, or `.codex/agents` in `up`.
- The checksum `diff` printed nothing and `untouched=0` in `up`, and the same in `husky`.
- Doctor said nothing about `conductorMayMerge` in `up` and `husky`, and the update left the key in the config, so T8's Part 7 bullet ("an existing config stays valid") matches.
- Hook registrations match: `hook.mjs` 5, `approve-guard.mjs` 2, and `git-gates`, `secrets-gate`, `commit-gate`, `brief-gate`, `reconcile-gate` 1 each, in `fresh`, `up`, and `husky`, and 12 commands in each of `fresh` and `up`.
- `git config core.hooksPath` printed `.githooks` in `fresh` and `up`, and `.husky` in `husky`, where doctor printed the info line saying PRISM's git hooks are not active.
- `.claude/hooks/plan/approve.mjs` and `.claude/hooks/commit-gate.mjs` exist in `fresh` and `up`.
- `prism update` from `0.10.0` preserved two files as `.bak` in both `up` and `husky`: `.prism/architect/guides/writing-a-skill.md` and `writing-an-architect-doc.md`. Each `.bak` is byte-identical to the `0.10.0` tarball's seed copy, and neither repo's consumer edited them. Neither is a doctor finding, and the cause is not diagnosed here.

Doctor lines, identical in `fresh` and `up` except the `core.hooksPath` line, and in `husky`:

- `Version: 1.0.0 installed, 0.10.0 latest on npm.` Reason: npm's `latest` is still `0.10.0` because `1.0.0` is not published.
- `[INFO] hook-registration: The hook runtime is installed and registered for Claude Code.` and the same for Codex. Reason: both hosts are in `hosts` by default.
- `[INFO] hook-registration: Git gates are delivered and off`, naming `commitCleanupPass` and `pushVerification`. Reason: the scratch configs set no `hooks` block, and the gates are opt-in.
- `[INFO] hook-registration: Git hooks are installed (core.hooksPath → .githooks). gitHooks.preCommit.command and gitHooks.prePush.command are unset`, in `fresh` and `up`. Reason: the hooks skip until a command is set.
- `[INFO] hook-registration: PRISM's git hooks are not active: the local core.hooksPath is '.husky'`, in `husky` only. Reason: the variant's `.husky` path is left alone by design.
- `[INFO] review-md: REVIEW.md carries PRISM's marker line and is current.` Reason: `REVIEW.md` was delivered unedited.

No `[WARN]` line appeared in any run. `prism update` in `husky` also printed that the local `core.hooksPath` is `.husky` and nothing was changed.

AC-16 (#544's AC-11, declining Atlas's architect-doc offer) is a person's step in `fresh`: `/tmp/claude-1000/-home-zibbix-Projects-PRISM--claude-worktrees-prism-personas-handoff-9543ef/b5b3cef5-428f-4603-b5db-5f5291220dc9/scratchpad/proof/fresh`. Not run.

## Review

- self-review round 1 at c50196b5: 0 critical, 0 major, 11 minor, 5 nit
  - Coverage: correctness swept (every changed doc claim checked against its source, findings below); regressions swept (version readers in build.ts, update.ts, doctor.ts unchanged; removed workflow.md headings have no citations left); security swept (secrets gate row, approve guard row, kill-switch paragraph: each verified); architecture swept (`documentation.md` frontmatter ok on every edited page, `npm-packaging.md` ok for a version-only edit, `architecture-doc-shape.md` n/a, no new helpers); intent-scope swept (AC grades below; the Decisions "Adjacent stale lines left alone" and "No committed pack test" hold); simpler paths swept (the what-prism-writes link ok, the workflow.md link instead of a copy ok, the troubleshooting table restating is per spec); accessibility n/a: no UI; docs swept (all 12 changed files, findings below); contracts swept (`package.json` version, one home, config stays valid); performance n/a: no render path, query, or bundle change.
  - **Minor, bug — docs/workflow.md:17.** The approval command `node scripts/ai-skills/hooks/plan/approve.mjs` exists only in PRISM's own tree, so it fails in a consumer repo. `.prism/architect/_toolkit/plan-chain-scripts.md`, Invocation: "In a consumer, run `node .claude/hooks/plan/<name>.mjs`." Class: consumer-facing doc citing the own-tree hook path. Sweep: `git grep -n 'scripts/ai-skills/hooks' -- docs README.md CHANGELOG.md` — this line only. Fix: `node .claude/hooks/plan/approve.mjs <path to the file>`. The `[y/N]` keypress wording matches approve.mjs.
  - **Minor, bug — docs/workflow.md:18.** "Merging stays a human step" drops the `features.mainSessionMayMerge` opt-in in `.prism/rules/git-conventions.md`, Who merges. Class: absolute claim that drops a documented exception. Sweep: `git grep -n -i 'human step\|merging stays' -- docs README.md CHANGELOG.md` — this line only. Fix: add "unless your team sets `features.mainSessionMayMerge`".
  - **Minor, standards violation — docs/workflow.md:20.** "Three things add a touch" leaves out a `blocked` report, a second `needs-replan`, and the four review pause triggers that `.prism/rules/workflow.md`, Advancing, names. Sibling: CHANGELOG.md:67, "You touch it twice", with no qualification. Class: a count of person touches stated as closed when the rule owns a longer list. Sweep: `grep -n -i 'twice\|two touches\|add a touch' CHANGELOG.md docs/*.md` — these two. Fix: say "most often" and link the rule's Advancing paragraph; in the changelog, "usually twice", plus what adds a touch.
  - **Minor, bug — docs/troubleshooting.md:70.** The section covers git hooks skipping or left alone but not failing: a formatter difference fails the commit, and a lint failure blocks the push (`.prism/architect/_toolkit/git-hooks.md`, Pre-commit and Pre-push). "Cursor gets no hook registration, so nothing denies there" is false for git hooks, which run for every committer. Sibling: CHANGELOG.md:20. Spec requirement 13 asks for the git hooks. Class: remedy table that lists skip states but not failure states. Sweep: `git grep -n 'nothing denies' -- docs CHANGELOG.md` — these two. Fix: add a "Git hooks failing" row and scope the Cursor sentence to agent gates.
  - **Minor, bug — docs/troubleshooting.md:77.** The commit gate row misses two things. A task allowance needs a task subject (`T<n>:` and the other forms), and a config that doesn't parse, or a rejected `stopPaths` or `testGlobs` value, denies on every branch (`.prism/architect/_toolkit/hook-runtime.md`, Commit gate). Class: deny/remedy row re-enumerated from an architect doc that drops conditions. Sweep: every other row read against its hook-runtime.md section — none found. Fix: add both to the row.
  - **Minor, bug — CHANGELOG.md:29.** "A deny message names its gate" holds only for the commit gate (commit-gate.mjs:262). The write gate (hook.mjs:1405) and the secrets gate (secrets-gate.mjs:267) name none. Sibling: docs/troubleshooting.md:70. Class: a uniform message format claimed that the source emits at one site. Sweep: deny strings in hook.mjs, commit-gate.mjs, secrets-gate.mjs, brief-gate.mjs, approve-guard.mjs, git-gates.mjs. Fix: "names the fix".
  - **Minor, bug — CHANGELOG.md:20.** "Claude Code and Codex get the hooks on `prism update`" omits that Codex runs them only after the user trusts the project's `.codex/` layer (`.prism/architect/_toolkit/hook-runtime.md`, Hook runtime). Sibling: docs/troubleshooting.md:70. Class: host-support claim missing an activation precondition. Sweep: `grep -n 'Codex' CHANGELOG.md docs/troubleshooting.md` — these two. Fix: add the trust step.
  - **Minor, bug — CHANGELOG.md:96.** The upgrade note says to add `umbrellas` to `.prism/architect/manifest.json` by hand, but not that update never rewrites that file. So an upgrader also lacks the 1.0.0 stub's new routes (`REVIEW.md`, `.prism/review/**`, `.githooks/**` and others) and keeps the dead `prism-qa-test-plan` route. Class: a migration note naming one hand-edit to a consumer-owned file and omitting the rest. Sweep: stub keys diffed between 7441c073 and c50196b5 (from the subagent, not re-run). Fix: tell upgraders to copy the new routes and `umbrellas` from the 1.0.0 stub.
  - **Minor, bug — docs/adopt-prism.md:171.** The Architect routes bullet says "matches no file", which `checkArchitectRoutes` never checks. The check actually warns on orphan docs, dead routes, and heading-only docs, and errors (exit 1) on a catch-all route or invalid manifest JSON (doctor.ts). Sibling: adopt-prism.md:174 omits that the Codex check runs only when `hosts` includes `codex`. Both come from T2's item wording. Class: doc bullet written from a plan paraphrase, not the function. Sweep: all 12 bullets read against their functions — these two. Fix: restate both bullets from the functions' findings.
  - **Minor, standards violation — docs/troubleshooting.md:14.** It still lists four doctor checks, as README.md:168 does, so `adopt-prism.md` is not "the only doc that lists them" (requirement 10). Class: a copied doctor-check list outside the owning section. Sweep: `git grep -n -i doctor -- docs README.md | grep -iE 'check|validat'` — these two. Fix: replace both with a one-line summary and a link to the adopt-prism section.
  - **Minor, standards violation — docs/ai-skills/parker.md:70.** "Parker → Mira → Nora" contradicts `.prism/architect/_toolkit/ticket-workflows.md`, Feature (typical), which runs Nora before Mira. The unchanged Nora row at :67 still reads "Story → Linear". T6 prescribed the text, and the task stays as written. Class: persona sequence restated in a doc and drifted from its owner. Sweep: not swept beyond parker.md. Fix: "Parker → Nora → Mira → the spec and plan stages", with the Nora row as "Initiative → tickets".
  - nit — docs/workflow.md:18: "CI is green" overstates it, since the rule gives up after 3 fix attempts and lists the failure on the PR.
  - nit — README.md:130-131: the index lines still describe the old workflow.md flow and a troubleshooting page with no hook section. what-prism-writes.md:126 is the same.
  - nit — docs/troubleshooting.md:75: "or in a rule file" holds only for installs whose manifest lists rule files under `umbrellas`.
  - nit — CHANGELOG.md:27: say `PRISM_HOOK_DISABLE` stops agent hooks, and that the git hooks read neither switch.
  - nit — docs/overview.md:31 and docs/getting-started.md:58: "run on their own" leaves out the plan approval ask. Fine to decline.
  - AC-1 met, executed: version `1.0.0`, one line changed, no tag at HEAD.
  - AC-2 met, executed: first entry `## [1.0.0] — 2026-11-20`, link loop silent. Human anchor check awaits a person.
  - AC-3 met, executed: 37 roster IDs, none missing from CHANGELOG.md.
  - AC-4 met, executed: routing loop silent; Sol, Ren, and Theo all in the entry.
  - AC-5, AC-6, AC-7, AC-8 met, demonstrated: read from `## Release proof`, not re-run.
  - AC-9 met, executed: no unpathed commit; 1 `git commit` line as the positive control.
  - AC-10 met, executed: 12 bullets, 1 link. Human check awaits a person, and the troubleshooting.md:14 finding above bears on it.
  - AC-11 met, executed: T4 greps pass; the sweep grep is silent.
  - AC-12 met, executed: three greps pass. Human stage-order check awaits a person.
  - AC-13 met, executed: heading at troubleshooting.md:68. Human row check awaits a person, and the git-hooks-failing finding above bears on it.
  - AC-14 met, executed: sweep and retired-ID greps silent.
  - AC-15 met, inspected: `## Verification` passes at 03dcb3ba; the only later commit is plan-only.
  - AC-16 pending: a person's step, not run.
- self-review round 2 at a410c318: 0 critical, 0 major, 3 minor, 1 nit
  - Round 1, fixed: workflow.md:17 approve path, :18 merge opt-in, and :20 touch list `fixed c1b59f42`; troubleshooting.md:70 git hooks failing, :77 commit gate row, and :14 doctor list `fixed 9f51e7c5`; CHANGELOG.md:29 deny message, :20 Codex trust, and :96 manifest routes `fixed d484db4e`; README.md:168 doctor list and :130-131 index lines `fixed 4070456f`; adopt-prism.md:171 and :174 `fixed 61db1d7b`; parker.md:70 `fixed b9172cde`; what-prism-writes.md:126 `fixed f46fbfeb`; the CI, umbrella, and kill-switch nits fixed in c1b59f42, 9f51e7c5, d484db4e. CHANGELOG.md:67 got "usually" in d484db4e, but its new count is the first finding below. Declined by the authors: the overview.md:31 and getting-started.md:58 "run on their own" nit.
  - Coverage: correctness swept (each round 1 fix checked against its source: hook-runtime.md Commit gate and Hook runtime, git-hooks.md, the manifest stub, doctor.ts checkArchitectRoutes and checkCodexDocLimit, git-conventions.md Who merges; findings below); regressions swept, full range (package.json one line; no consumer doc cites `scripts/ai-skills/hooks`; retired-ID and sweep greps silent); security n/a: no executable code, intent Security surface unchanged; architecture swept (documentation.md frontmatter unchanged on the fix commits, no new helpers); intent-scope swept (AC grades below; Decisions "Adjacent stale lines left alone" and the `.bak` follow-up hold); simpler paths swept (README and troubleshooting doctor summaries now link instead of copy, ok); accessibility n/a: no UI; docs swept, full range (12 changed files; every fix-commit claim checked, findings below); contracts swept (package.json version only); performance n/a: no render path, query, or bundle.
  - **Minor, bug — CHANGELOG.md:68.** "Four things add a touch" leaves out a change the architect forwards as intent-level, such as a plan-challenge finding, which docs/workflow.md:25 and `.prism/rules/workflow.md` Advancing and Scope changes both list. A reader trusts the count and misses that stop. Class: a count of person touches stated as closed when the rule owns a longer list (the round 1 class, recurring after its fix). Sweep: `grep -n 'add a touch\|Four things\|A few things' CHANGELOG.md docs/*.md` — this line and workflow.md:20, which is fine. Fix: "A few things add a touch" and add the intent-level change.
  - **Minor, bug — docs/troubleshooting.md:70.** "Git hooks are separate and run on every host" is false for a Cursor-only install, which gets no shims, so git runs nothing (`.prism/architect/_toolkit/git-hooks.md`, opening section: shims arrive only when `claude` or `codex` is in `hosts`). It follows the Cursor sentence, so a Cursor-only reader expects git hooks they don't have. Sibling: CHANGELOG.md:20, "run under any tool", which the Git hooks section's hosts bullet two lines later qualifies. Class: host-support claim missing a delivery precondition. Sweep: `git grep -n -i 'run on every host\|under any tool\|nothing denies' -- docs CHANGELOG.md README.md` — these two. Fix: "Git hooks run for anyone who commits, once installed, which needs `claude` or `codex` in `hosts`."
  - **Minor, bug — CHANGELOG.md:87.** "It governs PRISM's own merges, and a consumer leaves it unset" contradicts the shipped `.prism/rules/git-conventions.md`, Who merges ("A team opts in by setting the flag by hand"), the schema description, and docs/workflow.md:18 after its round 1 fix. A consumer reads two opposite instructions for the same key. T8's Part 7 prescribed the wording, so the task text is stale too. Class: a release note that narrows a consumer-facing setting to the maintainer's repo. Sweep: `git grep -n mainSessionMayMerge`, minus plans and retros — only this line says it is PRISM-only. Fix: "Rename the key to keep the setting. It lets the main session merge once the final review is clean, and it stays off unless you set it."
  - nit — CHANGELOG.md:97: "or in a rule file" holds only when the manifest's `umbrellas` list names the rule files, which an upgrader adds by hand (hook-runtime.md, Umbrella-section speed bump, Reach). Same fix as troubleshooting.md got.
  - AC-1 met, executed: version `1.0.0`; `git diff 09e24a22 HEAD -- package.json` shows the one `"version"` line; no tag at HEAD.
  - AC-2 met, executed: first entry `## [1.0.0] — 2026-11-20`, link loop silent, both anchors name headings present on the branch. Human `blob/main` check awaits merge.
  - AC-3 met, executed: 37 IDs from `LC_ALL=C comm -3`, none missing.
  - AC-4 met, executed: routing loop silent; Sol, Ren, and Theo each matched in the entry.
  - AC-5, AC-6, AC-7, AC-8 met, demonstrated: read from `## Release proof`; the fix commits touch no shipped code, so not re-run.
  - AC-9 met, executed: no unpathed commit; 1 `git commit` line as the positive control.
  - AC-10 met, executed: 12 bullets, 1 link; README.md and troubleshooting.md now link instead of listing. Human order check awaits a person.
  - AC-11 met, executed: no "plan this out" in getting-started.md, 1 `architect doc` line, sweep grep silent.
  - AC-12 met, executed: forbidden grep silent, `prism-debug` and `rules/workflow.md` present; the 11 stages follow the rule's Standard line in order.
  - AC-13 met, executed: heading at troubleshooting.md:68, with a Git hook failure row now. Human row check awaits a person.
  - AC-14 met, executed: sweep and retired-ID greps silent.
  - AC-15 met, inspected: `## Verification` passes at f46fbfeb; the only later commit is plan-only.
  - AC-16 pending: a person's step, not run.

## PR Readiness

Retro:
