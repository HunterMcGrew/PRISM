# Plan: followup-port-2196-worktree-lifecycle

## Ticket

Upstream source: https://github.com/TracTru/thrive/pull/2196 (THR-2051, OPEN at time of planning). No PRISM ticket — this is a port tracked by this plan.

## Goal

Give PRISM a documented worktree entry/removal convention and a deterministic GREEN/RED/YELLOW removal predicate, wired into Zoe as an explicit-only worktree-hygiene lane, so the 35 remaining accumulated worktrees can be swept without trusting branch names over commit identity.

---

## Why this port

PRISM's last worktree cleanup (87 worktrees) hit the exact failure thrive#2196 names:

- `git merge-base --is-ancestor` classified **0 of 87** as safe. PRISM squash-merges, so a squash-merged branch's commits are never ancestors of `main` — the ancestry check false-negatives on precisely the case it needs to get right.
- The fallback actually used — "is the branch still on `origin`" — worked, but it trusts the *branch name* rather than *commit identity*. A commit added **after** a PR merged still classifies as safe under that fallback and gets swept.
- thrive's fix is the containment check: a merged PR's `headRefOid` must contain the current HEAD (`git rev-list --count <headRefOid>..HEAD == 0`) before the merged-PR GREEN path is trusted.

PRISM's cleanup did not have that protection. 35 worktrees remain unswept pending this port.

---

## Design

Not applicable — no UI surface.

---

## Decisions

- **Gate disposition: auto-cleared.** Stakes reasoning: the delegated design call (rule placement) was explicitly assigned to this lane, and the two follow-on calls (classifier language, Zoe lane shape) are internal to PRISM's own dev tooling and skill source — no public API, no shared type, no consumer-facing contract changes in v1, and nothing is removed from disk by this plan. The one genuinely operator-owned question (consumer distribution of the classifier) is recorded below as an `OPEN` Decision with a documented default path, so the work proceeds without it. The removal-capable behavior this plan introduces is gated twice before it can delete anything: task 11's read-only dry-run, and Zoe's Procedure E batch confirmation.

- **The worktree conventions land in a new `.prism/rules/worktree-git.md` declaring `load: skill` (Tier 3), not as a section inside the always-on `git-conventions.md`.**
  - **Root cause of the question:** thrive keeps these in `.ai-spec/rules/worktree-git.md`; PRISM has no worktree rule, and `git-conventions.md` is already substantial and `load: always`. The framing offered two options — a new always-on file, or a section in the existing always-on file — and both spend always-on context budget on roughly 35 lines of prose that most sessions never need.
  - **Alternatives considered:** (1) a section inside `git-conventions.md`; (2) a new `load: always` `worktree-git.md`; (3) a new `load: paths` rule scoped by glob.
  - **Chosen approach:** a new file at Tier 3. PRISM's rule-loading tiers (ADR-0035) make this strictly better than both offered options: a `load: skill` rule is skipped entirely by `copyContentToPlatformDir` in `scripts/ai-skills/build.ts`, so it never reaches any platform's always-on rules surface and costs **zero** always-on budget. `.prism/rules/pr-description.md` is the working precedent. Option (3) fails because the trigger is an *action* (entering or removing a worktree), not a file path — there is no glob that fires on it. Cohesion argues the same way: worktree lifecycle is a distinct concern from commit messages, branch naming, and merge strategy, and folding it into `git-conventions.md` would make that file the place where unrelated git topics accumulate.
  - **How the rule still gets found:** `git-conventions.md` gains a one-line cross-reference under a new `## Worktrees` heading pointing at `worktree-git.md`. That spends one line of always-on budget instead of thirty-five, and it is the established PRISM pattern — rules cross-reference rules. Zoe's worktree lane cites the rule directly, which is what pulls it into context for the session that actually needs it.
  - **Implementation guidance:** Tier-3 rules still need a `.prism/architect/manifest.json` route and a `manifest.base.json` route (`pnpm prism:verify-manifest` fails otherwise), and they still auto-mirror into `templates/install/.prism/rules/` via `writeSeedMirror()` unless classified in `seed-curation.json`. Follow `pr-description.md` exactly: routed in both manifests, absent from `seed-curation.json`.
  - → promoted to `.prism/architect/_toolkit/audit-workflow.md` (the worktree-hygiene section records the predicate's home) — the tier rationale itself is ticket-tactical and stays here.

- **Port the predicate, not the language: the classifier is TypeScript at `scripts/ai-skills/worktree-classify.ts`, not bash at `scripts/worktree-classify.sh`.**
  - **Root cause:** PRISM contains **zero** `.sh` files. `scripts/` holds only `scripts/ai-skills/*.ts`, run through `tsx`. Upstream's placement matches thrive's conventions, not PRISM's.
  - **Alternatives considered:** port the bash verbatim (maximum fidelity to upstream, minimum translation risk); port to TypeScript.
  - **Chosen approach:** TypeScript. The decisive fact is CI: `scripts/ai-skills/run-tests.ts` exists specifically because `pnpm` invokes scripts through `cmd.exe` on the `windows-latest` runner, which does not expand globs. A bash fixture suite on that runner either never executes or breaks the job. A `*.test.ts` file is auto-discovered by `run-tests.ts`, which `pnpm prism:build` and `pnpm prism:check` already run — the suite gets CI coverage with **no new wiring at all**, where the bash suite would need a bespoke CI step and a Windows exclusion. Secondary: PRISM publishes to npm with a `dist/` bundle and a `bin`, so a TS classifier has a path to consumer distribution that a loose `.sh` does not.
  - **Fidelity constraint:** the color/reason output strings (`GREEN pushed`, `GREEN pr-merged`, `RED tracked-changes`, `RED unpushed-commits`, `YELLOW untracked-only`, `YELLOW no-upstream`, `YELLOW detached-referenced`, `YELLOW detached-dangling`) and the branch order of the predicate port **verbatim**. The safety-critical containment check ports verbatim. Only the host language changes.
  - → no promotion needed (implementation-tactical; the durable statement is the predicate itself, which lives in `worktree-git.md`).

- **The `gh` merged-PR lookup is injected as a dependency, not stubbed via `PATH`.**
  - **Root cause:** upstream's test harness prepends a temp dir containing a fake `gh` executable to `PATH`. That is shell-shaped, needs `chmod +x`, and does not work on the Windows CI runner.
  - **Chosen approach:** export `classifyWorktree(worktreePath, deps)` where `deps.fetchMergedHeadOid(branch, cwd)` returns `string | null`. The CLI entry point wraps it with the real `gh pr list --head <branch> --state merged --json headRefOid` call; tests inject a fake. This deletes the entire stub-shell harness — roughly 30 lines of upstream fixture code — and makes the merged-PR paths deterministic and cross-platform.
  - → no promotion needed (implementation-tactical).

- **Zoe gets a `## Worktree hygiene lane`, not a numbered "Mode 4".**
  - **Root cause:** thrive's Zoe is structured as numbered `## Mode 1/2/3` headings; PRISM's Zoe is structured as `## Audit surfaces` (four surfaces) plus named lanes — `## Plan-archive lane` is the existing example. Her run-order list already names a "Mode detection" step, but as *surface selection*, not numbered modes.
  - **Alternatives considered:** establish thrive's numbered-mode structure in PRISM's Zoe so the two stay structurally aligned; extend PRISM's own lane idiom.
  - **Chosen approach:** extend the lane idiom. Establishing numbered modes would mean renaming PRISM's existing sections (`Per-Decision verdict procedure`, `Archive classification`, `Plan-archive lane`) into Modes 1–3 to make the numbering coherent — a large gratuitous diff across a skill body and its architect doc, in service of matching a sibling repo PRISM does not share a build with. The lane idiom already carries exactly the same meaning.
  - → promoted to `.prism/architect/_toolkit/audit-workflow.md`.

- **The batch-confirmation exception is codified as a new lettered Procedure E, alongside Zoe's existing Procedures A–D.**
  - **Root cause:** PRISM's Zoe expresses gates as lettered procedures with explicit trigger/escape clauses, and Procedure D (archive confirmation) carries a dispatched-run escape that emits `needs-human` when no user is available to confirm. A worktree sweep needs the same escape, and an inline prose exception would sit outside the structure every other gate in the skill uses.
  - **Chosen approach:** Procedure E — one batch confirm for the GREEN set, with the same `needs-human` escape as Procedure D. The justification for batching (a GREEN worktree has, by definition of GREEN, no unique content — everything in it exists durably on `origin` or in a merged PR, so ten removals are ten directories going away, not ten pieces of information) lives in the architect doc, not the skill body.
  - → promoted to `.prism/architect/_toolkit/audit-workflow.md`.

- **The `worktrees` lane is explicit-only and never runs under a default or `all` invocation.**
  - It is the only Zoe lane that removes something outside `.prism/`. Folding a removal-capable lane into a routine content-audit pass would silently widen the blast radius of every default invocation. Ports directly from upstream.
  - → promoted to `.prism/architect/_toolkit/audit-workflow.md`.

- **OPEN — TBD, needs Hunter's input.** Whether the classifier ships to consumer repos. `scripts/` is not in `package.json`'s `files` array and is not part of the `templates/install/` seed surface, so a consumer's rendered Zoe would cite a script their repo does not contain. Shipping it means new machinery: a home under a distributed area, a `seed-curation.json` classification, an `ownership.ts` glob, a `files` entry, and `verify-pack-parity` coverage. **Default path (used until resolved):** v1 is PRISM-repo-local. Zoe's worktree lane checks for the classifier and, when absent, reports that the lane is unavailable in this repo and does nothing — no partial classification, no guessing. The lane is honest about being repo-local rather than silently broken.

- **A session-end auto-removal hook is deliberately deferred, not v1.** Ports upstream's own deferral. Mechanical enforcement of self-cleanup is a separate concern from having a correct predicate, and it should not gate the predicate landing.
  - → no promotion needed (scope boundary for this port; recorded so a later reader does not read the gap as an oversight).

---

## Implementation Tasks

Sequence matters: tasks 1–3 establish the rule and its registration, 4–6 the classifier, 7–9 the consumers, 10 the mirror rebuild, 11 the live verification. Do not reorder — task 10's `pnpm prism:check` only passes once the manifest routes from task 3 exist.

**Mirror discipline, applies to every task below:** `AGENTS.md`, `.claude/**`, `.codex/**`, `.cursor/**`, and `templates/install/.prism/**` are generated. Never hand-edit them. They are regenerated by `pnpm prism:build`, which is task 10.

### Clove (implementation)

1. **Create `.prism/rules/worktree-git.md`.**
   - Frontmatter, exactly:
     ```
     ---
     load: skill
     ---
     ```
   - Body sections in this order: `# Worktree Conventions`, `## Purpose`, `## Entering a worktree`, `## Removing a worktree`, `## Who runs this rule`.
   - `## Purpose` follows the house rule shape: the rule, then a `**Why:**` line, then a `**How to apply:**` line. The `**Why:**` cites the concrete incident — PRISM's 87-worktree cleanup where `git merge-base --is-ancestor` classified 0 of 87 as safe because squash-merged branch commits are never ancestors of `main`.
   - `## Entering a worktree` — three bullets, ported from upstream:
     - Existing worktree for the branch (appears in `git worktree list`) → `EnterWorktree path:<path>` (1 call).
     - New branch → `EnterWorktree name:<slug>` — cuts the branch off `origin/main`, creates the worktree, enters, in one call.
     - Existing branch, no worktree yet (resume) → `git worktree add <path> <branch>` then `EnterWorktree path:<path>` (2 calls).
     - Followed by: after entering an existing branch, sync with `git fetch` then `git merge --ff-only origin/<branch>` if behind. Note that `merge`, not `rebase`, is deliberate per `git-conventions.md` § Keeping a Branch Current.
     - Followed by the why-two-calls note: `EnterWorktree name:` always cuts a *new* branch and has no resume mode; if a future tool version adds one, this note is the signal to collapse the case.
   - `## Removing a worktree` — the three-way predicate, worded so the prose and the classifier cannot drift:
     - **GREEN — remove.** `git status --porcelain` is empty AND either `git rev-list --count @{u}..HEAD` is 0, or a merged PR's shipped commit contains HEAD (`gh pr list --head <branch> --state merged --json headRefOid` returns an oid where `git rev-list --count <headRefOid>..HEAD` is 0).
     - **RED — preserve, never auto-remove.** Tracked uncommitted changes, or commits ahead of upstream not contained in a merged PR's shipped commit.
     - **YELLOW — ask, naming exactly what is at risk.** Clean tree but untracked-only; no upstream configured and not merged; detached HEAD (referenced or dangling).
     - A `**Why a merged PR overrides ahead-count**` paragraph carrying the squash-merge reasoning and the containment requirement — verbatim in substance from upstream, since this is the safety-critical part.
     - A `**Worktree vs. branch**` note: `git worktree remove` deletes only the directory; the branch survives. `ExitWorktree action:remove` deletes both.
     - A `**How to apply — end-of-task self-cleanup**` note pointing at `pnpm prism:worktree-classify <path>` (the command added in task 6).
   - `## Who runs this rule` — Zoe's worktree hygiene lane, and any persona that created a worktree during its session.
   - Voice: onboarding voice per `.prism/rules/writing-voice.md`. No `MUST`, no all-caps mandates, every rule cites its reason.
   - Verify: `head -3 .prism/rules/worktree-git.md` shows the `load: skill` frontmatter.

2. **Add the cross-reference to `.prism/rules/git-conventions.md`.**
   - Insert a new section immediately after `## Keeping a Branch Current` and before `## Force Push Policy`:
     ```markdown
     ---

     ## Worktrees

     Entering and removing worktrees has its own conventions — an entry decision tree and a three-way removal-safety predicate that a plain ancestry check gets wrong under squash-merge. See [`.prism/rules/worktree-git.md`](./worktree-git.md).
     ```
   - This is the only edit to `git-conventions.md`. Do not move the worktree prose into this file.
   - Verify: `grep -n "worktree-git" .prism/rules/git-conventions.md` returns one line.

3. **Register the new rule in both manifests.**
   - Add to `.prism/architect/manifest.json`, in the existing alphabetical block of `.prism/rules/*` routes (between `verification-commands.md` and `writing-voice.md`):
     `".prism/rules/worktree-git.md": "_toolkit/spec-editing.md",`
   - Add the identical line to `.prism/architect/_toolkit/manifest.base.json`, same position.
   - Do **not** add the file to `.ai-skills/definitions/seed-curation.json` — it is a non-curated file and `writeSeedMirror()` mirrors it verbatim, matching how `pr-description.md` is handled.
   - Verify: `pnpm prism:verify-manifest` exits 0.

4. **Create `scripts/ai-skills/worktree-classify.ts`.**
   - Module-level JSDoc: what it is (the deterministic implementation of the predicate in `.prism/rules/worktree-git.md § Removing a worktree`), who calls it (end-of-task self-cleanup and Zoe's worktree hygiene lane), and why it is shared (a re-typed copy of a safety-critical RED guard drifts).
   - Exports:
     - `export type WorktreeColor = "GREEN" | "RED" | "YELLOW";`
     - `export interface ClassifyDeps { fetchMergedHeadOid(branch: string, cwd: string): Promise<string | null>; }`
     - `export async function classifyWorktree(worktreePath: string, deps: ClassifyDeps): Promise<{ color: WorktreeColor; reason: string }>`
   - Predicate order inside `classifyWorktree`, ported branch-for-branch from upstream. Do not reorder — each branch's placement is what makes the one below it correct:
     1. Resolve `worktreePath`; if it is not a readable git working tree (`git rev-parse --is-inside-work-tree` fails), throw. Callers treat a throw as `unreadable`, not as a color.
     2. `git status --porcelain`. If non-empty **and** any line does not start with `??` → `RED tracked-changes`. The non-empty guard matters: an empty string does not match `^??` and would otherwise misclassify a clean tree.
     3. Compute `hasUntracked` — porcelain non-empty and at least one line starts with `??`.
     4. `git symbolic-ref -q --short HEAD`. If empty (detached HEAD): if `git for-each-ref --format='%(refname)' --contains <HEAD>` yields any line → `YELLOW detached-referenced`, else `YELLOW detached-dangling`. Detached HEAD never returns GREEN or RED — there is no branch to measure ahead-count or merge state against.
     5. `git rev-parse -q --verify '@{u}'` to establish `hasUpstream`; when present, `ahead = git rev-list --count '@{u}..HEAD'`.
     6. Fast path: `hasUpstream && ahead === 0` → `YELLOW untracked-only` if `hasUntracked`, else `GREEN pushed`. This path avoids the `gh` call entirely once already pushed.
     7. Merged-PR override: `oid = await deps.fetchMergedHeadOid(branch, worktreePath)`. If `oid` is non-null, compute `extra = git rev-list --count <oid>..HEAD`. **Only** when `extra === 0` → `YELLOW untracked-only` if `hasUntracked`, else `GREEN pr-merged`. A non-zero `extra` falls through — it means a commit landed after the PR merged, and that commit was never shipped by that PR. This containment check is the whole point of the port; do not simplify it to "a merged PR exists."
     8. `hasUpstream === false` → `YELLOW no-upstream`.
     9. Otherwise → `RED unpushed-commits`.
   - Comments follow `.prism/rules/code-comments.md` — a plain sentence stating the invariant, no `NOTE:`/`TODO:` prefixes, only where the code is correct but surprising (the non-empty porcelain guard, the detached-HEAD exclusion, the containment requirement, why the fast path skips `gh`).
   - CLI entry: when run directly, read `process.argv[2]` as the worktree path, construct the real `fetchMergedHeadOid` (spawning `gh pr list --head <branch> --state merged --json headRefOid -q '.[0].headRefOid'` with `cwd` set to the worktree; return `null` on any failure, on empty output, or on the literal `null` — `gh` being absent is not an error, it just means no merged-PR evidence), print `<COLOR> <reason>` to stdout, exit 0. On an unreadable path, print the reason to stderr and exit 1.
   - Use `node:child_process`'s promisified `execFile` — no shell — matching the argv-array style `run-tests.ts` documents as the cross-platform requirement.
   - Verify: `pnpm prism:check-types` exits 0.

5. **Create `scripts/ai-skills/worktree-classify.test.ts`.**
   - Use `node:test` + `node:assert/strict`, matching the sibling `*.test.ts` files. The file is auto-discovered by `run-tests.ts` — no registration needed anywhere.
   - Fixture helper: in a `mkdtemp` dir, `git init --bare -b main` a remote, clone it to a `main` checkout, set `user.email`/`user.name`, commit one file, push. Then `git -C <main> worktree add -b <branch> <path> main` per case. Tear the temp dir down in `after`.
   - Each case injects `fetchMergedHeadOid` directly — no `gh` on `PATH`, no stub executables, no `chmod`.
   - Cases, all ported from upstream's suite:
     - `GREEN pushed` — clean, fully pushed.
     - `GREEN pr-merged` — pushed, second commit, then `git update-ref refs/remotes/origin/<branch> HEAD~1` so the worktree reads as ahead of a stale tracking ref; inject the real HEAD oid as the merged oid.
     - `RED tracked-changes` — a tracked file modified.
     - Positive control: revert that same worktree's change, re-classify, assert it is no longer RED (`GREEN pushed`). This case is what proves the RED verdict is responsive to state rather than sticky.
     - `RED unpushed-commits` — upstream configured, one commit ahead, inject `null`.
     - **Regression guard — `RED unpushed-commits`** for the false-GREEN gap: push, capture that oid as the merged oid, then commit again without pushing. Inject the captured (pre-merge) oid. Assert RED. This is the single most important case in the suite — it is the exact bug PRISM's last cleanup was exposed to.
     - `YELLOW untracked-only` — clean and pushed, one untracked file present.
     - `YELLOW no-upstream` — commits exist, no upstream, inject `null`.
     - `YELLOW detached-dangling` — detach, commit, tip contained by no ref.
     - `YELLOW detached-referenced` — detach at a tip that is still on a branch.
   - Guard the suite so it skips cleanly (`t.skip`) when `git` is not on `PATH`, rather than failing.
   - Verify: `pnpm prism:test` runs the new file and all cases pass.

6. **Add the npm script.**
   - In `package.json` `scripts`, alphabetically between `prism:verify-pack` and `prepublishOnly`:
     `"prism:worktree-classify": "tsx scripts/ai-skills/worktree-classify.ts",`
   - Verify: `pnpm prism:worktree-classify "$(git rev-parse --show-toplevel)"` prints a color and reason and exits 0.

7. **Add the behavior-drift paragraph to `.prism/rules/code-standards.md`.**
   - Insert into `### Removal and rename completeness`, as a new paragraph after the existing "Compiler errors and the diff are not the sweep" paragraph and before `## Whitespace`.
   - Content: a changed *behavior* has the same reach as a rename but no token to grep. When a fix changes a documented predicate — a safety condition, a validation rule, a state-transition guard — the prose describing it elsewhere shares no symbol with the code, so no search surfaces it, and the drift stays invisible until a reader acts on the stale description. Reconcile every prose home of the predicate in the same review pass as the code change, especially always-on docs whose readers can reintroduce by hand the exact bug the code just closed. Note that this is distinct from the mirror sync: `pnpm prism:build` keeps a rule's mirrors byte-identical to their source but cannot detect that the source's *meaning* drifted from the code it specifies.
   - Cite the upstream incident concretely (thrive#2196: a classifier's GREEN predicate was hardened to a commit-containment check while the rule's prose still described the looser pre-fix rule, live for a full review pass until PR review caught it). Do not use a thrive-internal ticket ID as the sole citation — PRISM readers cannot resolve it.
   - Verify: `pnpm prism:crossref-lint` exits 0 (the paragraph introduces no repo-root-absolute path refs that do not resolve).

8. **Add the worktree hygiene lane to Zoe's canonical source.**
   - Canonical source is `.ai-skills/skills/prism-surface-audit/shared.md`. Do not edit `.claude/skills/prism-surface-audit/SKILL.md`, `.agents/`, or `.cursor/` copies — task 10 regenerates them.
   - Edits, in file order:
     - **Specializes-in list** (top of file): add a bullet — worktree hygiene: classifying every `git worktree list` entry GREEN/RED/YELLOW against the removal-safety predicate and clearing the GREEN set on one batch confirmation.
     - **`## The run, in order`, step 2** ("Mode detection"): add `worktrees` to the list of selectable modes, with the explicit-only note — `worktrees` never runs under a bare invocation or `all`.
     - **`## When Things Need a Procedure`**: add **Procedure E — Worktree batch confirmation gate**, after Procedure D, in the same shape as D: numbered steps (surface the full dry-run listing grouped by color with reasons inline; state the proposed removals explicitly; wait for one explicit batch confirmation covering the GREEN set only). Carry the same **Trigger** / **Escape** clauses — escape emits `needs-human` when dispatched with no user available, naming the GREEN paths that are removal-ready.
     - **`## Audit surfaces`**: add a fifth surface entry for worktrees, noting it is not a file read — it is `git worktree list --porcelain` plus one classifier call per entry — and that it is walked only on explicit request.
     - **`## Worktree hygiene lane`** — new section, placed immediately after `## Plan-archive lane`. Six numbered steps:
       1. List every worktree via `git worktree list --porcelain` from the repo root. Exclude the first block (always the main working tree) and exclude the worktree this session is running from.
       2. Classify each remaining entry with `pnpm prism:worktree-classify <path>`. A non-zero exit means the directory is gone while git still lists it — bucket it as `unreadable`, offer `git worktree prune` as a one-line cleanup (pure git bookkeeping, zero data-loss risk since the directory is already gone).
       3. Surface the dry-run listing grouped by color, each with its reason inline. This is the default output; nothing is removed before step 4.
       4. Run Procedure E. On confirmation, **re-classify each GREEN entry immediately before removing it** — a worktree can flip away from GREEN between the listing and the confirm if someone starts work in it mid-session. Skip and report any that flipped. Remove the rest with `git -C <main-repo-root> worktree remove --force <path>`. `--force` is safe here because the classifier already proved the tree carries no tracked changes and no untracked files (untracked-only routes to YELLOW, never GREEN); `--force` bypasses only git's own redundant dirty-check, not the classifier's.
       5. Never touch RED, YELLOW, or the worktree half of `unreadable`. List them with reasons and stop — no confirm gate of any kind for those buckets.
       6. Branch cleanup is out of scope. `git worktree remove` deletes only the directory; leftover local branches are a separate, lower-stakes concern.
       - Close the section with the availability guard from the OPEN decision: when `scripts/ai-skills/worktree-classify.ts` is not present in the repo (a consumer install), report that the lane is unavailable here and classify nothing. Do not fall back to a weaker predicate — a weaker predicate is exactly what this port exists to eliminate.
     - **`## Output format`**: add a `## Worktrees — N green, N red, N yellow` section shape to the report template, and an empty-result line ("no green worktrees this pass — everything still on disk is red or yellow for a reason").
     - **`## State file`**: add `worktrees_green`, `worktrees_removed`, `worktrees_red`, `worktrees_yellow`, `worktrees_unreadable` to the stats block, and `worktrees` as a valid `modes` value.
     - **`## Definition of Done`**: add two checklist items — the worktree lane (if it ran) never removed a RED or YELLOW worktree and re-classified each GREEN entry immediately before removing it; and every confirm gate was per-item except the worktree lane's single batch gate, the one documented exception.
   - Update `.ai-skills/skills/prism-surface-audit/frontmatter.yml`: extend `description` to name worktree hygiene and note it is explicit-only; extend `argument-hint` to include `worktrees`.
   - Verify: `grep -n "Worktree hygiene lane" .ai-skills/skills/prism-surface-audit/shared.md` returns one line.

9. **Update `.prism/architect/_toolkit/audit-workflow.md`.**
   - Add a `## Worktree hygiene` section after the design-principles section. It carries the contract and the reasoning, not the procedure (the procedure lives in the skill body — that split is the file's existing convention):
     - What the lane does, and that it is explicit-only with the blast-radius reason.
     - **Why one batch confirmation, not per-item.** The surface-first invariant exists because a wrong archive or promotion is destructive against irreplaceable working memory. A GREEN worktree fails that comparison on both axes: the classification is a deterministic predicate rather than a judgment call, and by definition of GREEN the artifact has no unique content — everything in it already exists durably on `origin` or in a merged PR. Removing ten GREEN worktrees is ten directories going away, not ten pieces of information. Per-item gates would be ten confirmations reducing to the same answer.
     - **What stays a hard no.** RED and YELLOW never get a confirm gate at all — listed with reasons, left alone.
     - **Scope boundary.** Directory only; the branch survives; local branch cleanup is not this lane's concern.
     - **Repo-local for now.** Cite the OPEN decision in this plan and the availability guard.
   - Update the state-file schema block in the same file with the five new stats keys and the `worktrees` mode value, matching task 8.
   - Add two entries to the file's cross-reference list: `.prism/rules/worktree-git.md § Removing a worktree` (the predicate the lane implements) and `scripts/ai-skills/worktree-classify.ts` (the shared classifier).
   - Verify: `pnpm prism:crossref-lint` exits 0 — both new refs are repo-root-absolute under `.prism/` and `scripts/`, so the lint resolves them and will fail if either path is wrong.

10. **Regenerate mirrors and run the full check.**
    - Run `pnpm prism:build`. This regenerates `AGENTS.md`, `.claude/**`, `.codex/**`, `.cursor/**`, and the `templates/install/.prism/**` seed mirror, and runs `pnpm prism:test`.
    - Confirm the new rule did **not** land in any platform rules dir — a `load: skill` rule is skipped by `copyContentToPlatformDir`. Check: `ls .claude/rules/worktree-git.md .cursor/rules/worktree-git.mdc 2>&1` should report both as missing. If either exists, the frontmatter is wrong.
    - Confirm the seed mirror **did** receive it: `test -f templates/install/.prism/rules/worktree-git.md`.
    - Run `pnpm prism:check`. All six steps (build `--check`, type-check, test, verify-manifest, crossref-lint, verify-pack) must exit 0.
    - Never hand-edit any generated file to make a check pass. A generated-file diff that `prism:build` does not produce means a canonical source is wrong — fix the source.

11. **Live dry-run against PRISM's real remaining worktrees — before any first real sweep.**
    - This task is the answer to upstream's own carry-over caveat: AC-5 (the sweep never lists RED or YELLOW as removable) is verified upstream by *procedure inspection*, because Zoe is an LLM-driven skill rather than deterministic code. Procedure inspection is not evidence. A live dry-run is.
    - Run the classifier over every entry in `git worktree list --porcelain` (35 at time of planning, excluding the main tree). A one-liner is sufficient:
      `git worktree list --porcelain | awk '/^worktree /{print $2}' | tail -n +2 | while read -r p; do printf '%s\t' "$p"; pnpm -s prism:worktree-classify "$p" || echo "UNREADABLE"; done | tee /tmp/prism-worktree-dryrun.txt`
    - Record the resulting color distribution in this plan's `## History`.
    - **Remove nothing in this task.** Removal is a separate, user-confirmed Zoe invocation. This task ends when the listing exists and has been read.
    - Spot-check by hand: pick one GREEN and one RED result and confirm the verdict against `git -C <path> status --porcelain`, `git -C <path> log --oneline -3`, and the branch's PR state. A predicate that agrees with itself is not evidence; a predicate that agrees with the repo is.
    - Escalate rather than sweep if the distribution looks wrong — for example if 0 of 35 classify GREEN, that is the same shape as the original `merge-base` failure and means something in the port is off.

### Eli (documentation)

12. **Update Zoe's entry in `docs/personas.md`.**
    - The **What she does** line at `docs/personas.md:206` currently reads "Audits plans, lessons, and open decisions." Extend it to name worktree hygiene and mark it explicit-only, so a reader of the persona catalog learns the lane exists without opening the skill.
    - Add one line under **When to call** for the explicit invocation: "Zoe, clean up worktrees."
    - Keep it to two sentences. `docs/` is the human-facing catalog, not a second copy of the skill body.
    - `keepsDevDocs` is `false` in `.ai-skills/config.json`, so there is no paired dev doc to write. `docs/personas.md` is the only documentation surface this port touches.
    - Verify: `grep -n -i "worktree" docs/personas.md` returns the updated lines.

---

## Acceptance Criteria

### Behavioral

- [ ] **AC-1 — Squash-merged branch classifies GREEN.** Given a worktree whose branch was squash-merged and whose remote-tracking ref reads as behind, When the classifier runs against it with the merged PR's `headRefOid` available, Then it reports `GREEN pr-merged`.
  - Evidence (`machine`): the `GREEN pr-merged` case in `scripts/ai-skills/worktree-classify.test.ts` passes under `pnpm prism:test`.

- [ ] **AC-2 — A commit added after the PR merged classifies RED.** Given a worktree whose PR merged at commit X and which has since received commit Y that was never pushed, When the classifier runs with X as the merged `headRefOid`, Then it reports `RED unpushed-commits` and never GREEN.
  - Evidence (`machine`): the regression-guard case in `scripts/ai-skills/worktree-classify.test.ts` passes under `pnpm prism:test`. This is the specific gap PRISM's last cleanup was exposed to.

- [ ] **AC-3 — RED is responsive, not sticky.** Given a worktree that classified `RED tracked-changes`, When the tracked change is reverted and the classifier re-runs, Then it reports `GREEN pushed`.
  - Evidence (`machine`): the positive-control case in `scripts/ai-skills/worktree-classify.test.ts` passes under `pnpm prism:test`.

- [ ] **AC-4 — An untracked file blocks GREEN.** Given a clean, fully-pushed worktree containing one untracked file, When the classifier runs, Then it reports `YELLOW untracked-only` rather than any GREEN verdict.
  - Evidence (`machine`): the `YELLOW untracked-only` case passes under `pnpm prism:test`.

- [ ] **AC-5 — Detached HEAD is never GREEN and never RED.** Given a worktree at a detached HEAD, When the classifier runs, Then it reports `YELLOW detached-referenced` or `YELLOW detached-dangling`.
  - Evidence (`machine`): both detached-HEAD cases pass under `pnpm prism:test`.

- [ ] **AC-6 — The sweep never lists a RED or YELLOW worktree as removable.** Given PRISM's real remaining worktrees, When the worktree hygiene lane produces its dry-run listing, Then every path in the removable set classifies GREEN, and no RED, YELLOW, or unreadable entry appears in it.
  - Evidence (`human`): task 11's dry-run output at `/tmp/prism-worktree-dryrun.txt`, read against the lane's proposed removable set, plus the hand spot-check of one GREEN and one RED verdict against the worktree's actual git state. Upstream verified the equivalent criterion by procedure inspection only; this port verifies it against real data before any removal happens.

- [ ] **AC-7 — The worktree lane does not run under a default invocation.** Given Zoe invoked with no arguments or with `all`, When the run completes, Then no worktree was listed, classified, or removed.
  - Evidence (`human`): read `.ai-skills/skills/prism-surface-audit/shared.md` § The run, in order step 2 and § Worktree hygiene lane — the explicit-only condition is stated in both, and the lane's entry condition names it.

### Non-behavioral

- [ ] **AC-8 — The predicate has exactly one implementation.** `scripts/ai-skills/worktree-classify.ts` is the only place the GREEN/RED/YELLOW logic is coded; the rule and the skill describe it in prose and delegate to the script.
  - Evidence (`machine`): `grep -rn "rev-list" .prism/ .ai-skills/ scripts/ --include='*.md' --include='*.ts'` shows executable occurrences only in `worktree-classify.ts` and its test; every other hit is prose. (Corrected by Briar's pass-2 self-review: the original pattern `"rev-list --count"` never matches the `.ts` source, because `execFile` passes `"rev-list"` and `"--count"` as separate array elements rather than one joined string — the literal substring with a space between them doesn't occur in code, only in prose. The narrower `"rev-list"` pattern matches both, with no additional noise confirmed by hand.)

- [x] **AC-9 — The new rule's body costs zero always-on context budget.** `.prism/rules/worktree-git.md` declares `load: skill` and its body is absent from every platform rules mirror; the only always-on trace is the one-line cross-reference task 2 deliberately added to `git-conventions.md` § Worktrees.
  - Evidence (`machine`): after `pnpm prism:build`, `ls .claude/rules/worktree-git.md .cursor/rules/worktree-git.mdc .codex/rules/worktree-git.md` reports all three missing (confirmed), and `grep -c "worktree-git" AGENTS.md` returns `1` — the intentional cross-reference line, not the rule body. Corrected by Briar's self-review from an original evidence clause that asserted `0`, which the plan's own task 2 (the cross-reference) makes impossible to satisfy — see `## Review Issues`.

- [ ] **AC-10 — The rule is registered and the seed is in parity.** `pnpm prism:check` exits 0 with all six steps green, and `templates/install/.prism/rules/worktree-git.md` exists.
  - Evidence (`machine`): `pnpm prism:check` exit code 0; `test -f templates/install/.prism/rules/worktree-git.md`.

- [ ] **AC-11 — No generated file was hand-edited.** Every change under `AGENTS.md`, `.claude/**`, `.codex/**`, `.cursor/**`, and `templates/install/**` is reproducible by `pnpm prism:build`.
  - Evidence (`machine`): a clean `pnpm prism:build` followed by `git status -s` shows no further modifications to any generated path.

- [ ] **AC-12 — The test suite runs in CI with no new wiring.** The classifier's tests execute under `pnpm prism:test` on both the ubuntu and windows-latest runners.
  - Evidence (`machine`): `pnpm prism:test` output includes the new file's cases locally; CI job green on both runners for the PR.

### AC Adjustments

### AC Sync Log

| Date | Agent | Action | Plan | Ticket |
| ---- | ----- | ------ | ---- | ------ |
| 2026-07-21 | Winston | AC-1..AC-12 authored | this plan | N/A — no tracker ticket for this port |

---

## Sessions

- 2026-07-21 [main] open: Intent — produce a Clove-ready port plan for thrive#2196 with the rule-placement design call made and reasoned; Bounds — write only `.prism/plans/followup-port-2196-worktree-lifecycle.md`, no code, no branch, no git mutation, no tracker; Approach — read the upstream diff in full, then ground every mapping against PRISM's actual build/tier/test machinery rather than assuming shape parity with thrive · close: scope held
- 2026-07-22 [huntermcgrew/prism-port-2196-worktree-lifecycle] open: Intent — implement all 12 tasks of the port exactly as sequenced; Bounds — only the files the plan names, no hand-edited mirrors, `pnpm prism:check` exit 0 before push; Approach — execute tasks 1–11 in order (task 10's check depends on task 3's manifest routes), then task 12, verifying each task's stated command before moving on · close: scope held — one deviation from the plan's literal task 8 wording (no "Specializes-in list" bullet structure exists in Zoe's shared.md; extended the opening paragraph instead, same intent) and one fix beyond the plan (a markdown link to the repo-local classifier script broke the install-relative-link-gate on the seed-mirrored copy; changed to a plain code-span reference, consistent with every other architect-doc reference to `scripts/ai-skills/`).
- 2026-07-22 [huntermcgrew/prism-port-2196-worktree-lifecycle] open: Intent — first-pass self-review of the port against this plan, covering types, logic, tests, and the build; Bounds — read-only against source, plan-file edits only, no code changes; Approach — verify every AC and Decision against the actual diff and a live run of all six `pnpm prism:check` gates rather than trusting the plan's own claims · close: scope held — one finding (AC-9's evidence clause asserted an impossible zero-count against the plan's own task 2 design), fixed in-place in `## Acceptance Criteria` and recorded in `## Review Issues`; no code changes needed.
- 2026-07-22 [huntermcgrew/prism-port-2196-worktree-lifecycle] open: Intent — pass-2 self-review of the port, verifying pass-1's AC-9 fix landed and re-running the full gauntlet against the classifier's logic and every mirror; Bounds — read-only against source and a live checkout of the branch tip, plan-file edits only, no code changes; Approach — read the full diff against `main`, checked out the branch tip (detached HEAD, since the branch ref itself was held by a sibling worktree) to run all six `pnpm prism:check` gates live rather than trust the prior pass's claims, then adversarially traced the classifier's predicate branch-by-branch against the rule prose and the plan's task 4 spec · close: scope held — one finding (AC-8's own evidence grep can never match the `.ts` source because `execFile` splits `"rev-list"` and `"--count"` into separate array elements), fixed in-place in `## Acceptance Criteria` and recorded in `## Review Issues`; all 570 tests pass (1 pre-existing, unrelated skip), all six `prism:check` gates green, zero mirror drift confirmed live. One pre-existing, out-of-scope observation noted separately (not this PR's diff): `.prism/architect/manifest.json`/`manifest.base.json` route `.prism/rules/worktree-isolation.md`, a file that does not exist anywhere in the tree.
- 2026-07-22 [huntermcgrew/prism-port-2196-worktree-lifecycle] open: Intent — fix Eric's four PR-review minors (comment-invariant overstate, stale count in durable prose, non-verb test-helper name, missing consumer-availability guard); Bounds — the four cited lines only, no design calls, no scope beyond what Eric flagged; Approach — apply each suggested rewording verbatim where Eric proposed one, then `pnpm prism:build` to resync the seed mirror and `pnpm prism:check` to confirm all six gates stay green · close: scope held — exactly four files touched (three source + the auto-mirrored `templates/install/.prism/rules/worktree-git.md`), `pnpm prism:check` exits 0, no reply-only findings (all four were code/prose changes, not decisions).

---

## History

- 2026-07-21 [main]: Planned the port of thrive#2196 (worktree lifecycle) into PRISM. Made the delegated rule-placement call — a new Tier-3 `worktree-git.md` rather than either offered option, since `load: skill` removes the always-on budget objection entirely; see Decision. Two further calls followed from grounding in PRISM's machinery rather than thrive's: the classifier ports to TypeScript (windows-latest CI cannot run a bash suite through the existing test runner) and Zoe gains a named lane rather than a numbered Mode 4.
- 2026-07-22 [huntermcgrew/prism-port-2196-worktree-lifecycle]: Implemented all 12 tasks — `worktree-git.md` rule, `worktree-classify.ts` + 10-case test suite, Zoe's worktree hygiene lane + Procedure E, `audit-workflow.md` § Worktree hygiene, manifests, `docs/personas.md`. `pnpm prism:check` exits 0 with all six steps green.
- 2026-07-22 [huntermcgrew/prism-port-2196-worktree-lifecycle]: Ran the task-11 live dry-run against all 80 non-main worktrees — 11 GREEN, 35 RED, 34 YELLOW, 0 unreadable. Hand spot-checked one GREEN (`PRISM-skill-improvements`: clean tree, upstream in sync) and one RED (an `agent-*` worktree: three tracked modifications) against the classifier's verdicts — both agreed. No 0-of-N GREEN pathology; no escalation warranted.
- 2026-07-22 [huntermcgrew/prism-port-2196-worktree-lifecycle]: Fixed Eric's four PR #439 review minors — reworded the detached-HEAD invariant comment and added a precedence clause to `worktree-git.md`, dropped the stale "35 worktrees" count, renamed `currentHeadOid` to `readHeadOid`, and added the consumer-availability guard to the self-cleanup line. `pnpm prism:check` exits 0.

---

## Debugged Issues

---

## Review Issues

### AC-9 evidence clause asserted an impossible zero-count

- **Severity:** `major`
- **Status:** `fixed`
- **File:** `.prism/plans/followup-port-2196-worktree-lifecycle.md:270` (AC section)
- **Problem:** AC-9's evidence clause asserted `grep -c "worktree-git" AGENTS.md` returns `0`, but the plan's own task 2 deliberately adds a one-line cross-reference to `git-conventions.md` § Worktrees (an always-on rule that mirrors into `AGENTS.md`) — so the literal grep always returns `1`, never `0`, regardless of implementation correctness. As written, AC-9 fails verification for a design the plan itself calls for.
- **Suggested fix:** narrow the evidence to the rule's own body (already applied) — grep count of `1` attributed to the intentional cross-reference line, confirmed by manual inspection that `AGENTS.md` contains no other `worktree-git` occurrence.

### AC-8 evidence grep can never match the TypeScript source it's meant to verify

- **Severity:** `major`
- **Status:** `fixed`
- **File:** `.prism/plans/followup-port-2196-worktree-lifecycle.md` (AC-8 evidence clause)
- **Problem:** AC-8's evidence command was `grep -rn "rev-list --count" .prism/ .ai-skills/ scripts/ --include='*.md' --include='*.ts'`, expected to show hits in `worktree-classify.ts`/`.test.ts` plus prose elsewhere. Run live, it returns zero hits in either `.ts` file — only the `.md` prose. The `.ts` source calls `execFile` with `"rev-list"` and `"--count"` as separate array elements (`["rev-list", "--count", "@{u}..HEAD"]`), so the literal joined substring `"rev-list --count"` never appears in the code, only in prose that writes the git command as a sentence. As specified, the AC's own verification method cannot detect the implementation it claims to confirm exists.
- **Suggested fix:** narrow the pattern to `"rev-list"` alone (already applied) — confirmed live that this matches exactly the two `.ts` occurrences plus the pre-existing prose hits, with no added noise.

### Detached-HEAD invariant comment overstates the code's actual invariant

- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `scripts/ai-skills/worktree-classify.ts:107`; `.prism/rules/worktree-git.md` § Removing a worktree
- **Problem:** the comment "Detached HEAD never returns GREEN or RED" isn't the code's invariant — a detached worktree with tracked changes returns `RED tracked-changes` via the earlier porcelain check. The rule prose had the same unstated precedence overlap between its RED and YELLOW bullets.
- **Suggested fix:** reworded the comment to state the invariant that actually holds from that point in the branch order, and added a one-line precedence clause to the rule prose noting conditions are checked in order — tracked changes win.

### Drifting worktree count in durable rule prose

- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `.prism/rules/worktree-git.md:11`
- **Problem:** "35 worktrees remain unswept pending this convention landing" was already stale — the PR's own task-11 dry-run found 80 non-main worktrees, not 35 — and "pending this convention landing" would go false the moment the PR merged.
- **Suggested fix:** dropped the live count in favor of an order-of-magnitude statement ("dozens more accumulated while the repo lacked this predicate") that doesn't drift.

### `currentHeadOid` test helper doesn't lead with a verb

- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `scripts/ai-skills/worktree-classify.test.ts:98`
- **Problem:** `code-standards.md` § Naming asks functions to start with a verb; `currentHeadOid` reads as a noun phrase.
- **Suggested fix:** renamed to `readHeadOid` at the definition and both call sites.

### Consumer-facing rule cites the classifier without an availability guard

- **Severity:** `minor`
- **Status:** `fixed`
- **File:** `.prism/rules/worktree-git.md:37`
- **Problem:** the plan's OPEN Decision on consumer distribution sets a documented default path (classifier is repo-local; Zoe's lane reports itself unavailable when it's missing), but the rule's End-of-task self-cleanup line told any persona to run `pnpm prism:worktree-classify <path>` unconditionally — a consumer install has no such script.
- **Suggested fix:** added a clause mirroring Zoe's lane guard — run it when the classifier is present; consumer installs apply the predicate by hand instead.

---

## Cleanup Items

---

## PR Readiness

- [x] No critical or major issues
- [x] Types correct — no `any`, no unsafe `as`
- [x] No stray console.logs or debug artifacts
- [x] Tests written for new logic and edge cases — 10 cases in `worktree-classify.test.ts`, all passing
- [x] All debugged issues resolved (no `open` entries) — none recorded
- [x] Build passes — last run: 2026-07-22 (post-review fix pass, Eric's four PR #439 minors), `pnpm prism:check` exit 0 (all six steps); 570 tests pass, 1 pre-existing unrelated skip
- [ ] PR description up to date — pending PR open
- [ ] Lasting decisions promoted to architect context (if applicable) — deferred to plan close per `branch-plan.md` § Before Closing; this is a self-contained port, not yet closed

**Last updated:** 2026-07-22
